# 完善本地日志监控系统 Spec

## Why

flitter 项目当前存在 **两套互不连通的日志系统**：
- `flitter-core` 的 `diagnostics/pipeline-debug.ts` 硬编码写 `process.stderr`，在 TUI 运行时会污染终端画面。
- `flitter-amp` 的 `utils/logger.ts` 写入文件日志（`~/.flitter/logs/`），但格式为纯文本行，无法被工具解析。

两套系统各自为政，导致以下实际问题：
1. **错误堆栈丢失** — flitter-amp 的所有 catch 块只记录 `err.message`，完整 stack trace 被丢弃，线上排查困难。
2. **日志文件无限积累** — 无轮转、无清理、无大小限制，`~/.flitter/logs/` 目录会持续膨胀。
3. **管线日志无法落盘** — flitter-core 的管线调试输出写 stderr，TUI 模式下无法收集；非 TUI 模式下信息也不持久化。
4. **缺乏结构化格式** — 纯文本日志无法被 `jq`、`grep -P` 等工具高效过滤和聚合。
5. **缺乏上下文关联** — 日志中没有 sessionId、frameId 等上下文信息，多次会话交织时难以区分。

## What Changes

- **统一日志接口** — 在 `flitter-amp/src/utils/logger.ts` 中引入结构化 JSON 日志格式、分级策略、上下文注入，使其成为整个 flitter-amp 进程的唯一日志出口。
- **桥接 core → amp 日志** — 通过 `WidgetsBinding` 已有的 `setErrorLogger()` 机制，将 flitter-core 的 `FrameScheduler._errorLogger` 重定向到 amp 的 logger；新增 `setPipelineLogger()` 让 `pipelineLog` 可被外部重定向。
- **错误日志补全堆栈** — 在 logger 中新增 `logError()` 辅助函数，自动提取 Error 的 message + stack；更新 flitter-amp 中所有 catch 块使用该辅助。
- **日志文件轮转与清理** — 为文件日志增加按天轮转（已有）+ 保留天数限制（新增 `logRetentionDays` 配置项，默认 7 天），在 `initLogFile()` 时自动清理过期日志。
- **上下文日志** — 为 logger 增加全局上下文 bag（`setLogContext` / `getLogContext`），在日志行中自动注入 `sessionId`、`phase` 等字段。
- **flitter-core `pipelineLog` 可重定向** — 将 `pipelineLog` 改为可通过 `setPipelineLogSink()` 替换输出目标，默认仍写 stderr。amp 层在初始化时将其重定向到文件 logger。

## Impact

- 受影响的包：`flitter-core`（`pipelineLog` 可重定向）、`flitter-amp`（logger 重构 + 所有 catch 块修复）
- 受影响的文件：
  - `packages/flitter-core/src/diagnostics/pipeline-debug.ts` — `pipelineLog` 增加 sink 重定向
  - `packages/flitter-core/src/index.ts` — 导出 `setPipelineLogSink`
  - `packages/flitter-amp/src/utils/logger.ts` — 结构化重构
  - `packages/flitter-amp/src/index.ts` — 初始化桥接
  - `packages/flitter-amp/src/state/config.ts` — 新增 `logRetentionDays` 配置项
  - `packages/flitter-amp/src/acp/*.ts`、`src/state/*.ts`、`src/index.ts` — 修复 catch 块

## Design Decisions

### ADR-1: 不引入第三方日志库

flitter-core 零外部依赖是核心设计原则。flitter-amp 只依赖 `@agentclientprotocol/sdk`。引入 pino/winston 会增加依赖树且与 Bun 运行时的兼容性需额外验证。当前需求（文件日志 + JSON 格式 + 轮转）可通过扩展现有 `logger.ts` 实现，保持零额外依赖。

### ADR-2: JSON 格式仅在文件日志启用

当 `logStream` 存在时（TUI 模式），日志以 JSON 格式逐行写入文件（NDJSON）。当回退到 stderr 时（测试/CLI 模式），保持人类可读的文本格式。这样在开发/调试时日志仍然友好，在生产/排查时日志可被工具解析。

### ADR-3: pipelineLog 重定向而非替换

`pipeline-debug.ts` 是 `diagnostics/` 下的永久设施，其函数签名和语义不应改变。只在内部增加一个可替换的 sink 函数，默认行为不变（写 stderr）。这确保 flitter-core 的独立可测试性不受影响。

### ADR-4: 日志清理时机

日志文件清理在 `initLogFile()` 中同步执行（启动时一次性扫描并删除过期文件），而非运行时周期性清理。理由：flitter-amp 是单次运行的 TUI 进程，不需要长期驻留的定时任务。

## ADDED Requirements

### Requirement: 结构化 JSON 日志格式

系统 SHALL 在文件日志模式下以 NDJSON（每行一个 JSON 对象）格式输出日志。每条日志记录包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `ts` | string | ISO 8601 时间戳 |
| `level` | string | `DEBUG` / `INFO` / `WARN` / `ERROR` / `FATAL` |
| `msg` | string | 日志消息 |
| `ctx` | object? | 上下文字段（sessionId、phase 等） |
| `err` | object? | 仅 ERROR/FATAL 级别：`{ message, stack, name }` |
| `data` | object? | 附加结构化数据 |

#### Scenario: 文件日志输出 JSON
- **WHEN** TUI 模式下调用 `log.info("User connected", { userId: "abc" })`
- **THEN** 日志文件中写入一行 JSON：`{"ts":"...","level":"INFO","msg":"User connected","data":{"userId":"abc"}}`

#### Scenario: stderr 回退保持文本格式
- **WHEN** 无 logStream 时调用 `log.info("Test message")`
- **THEN** stderr 输出 `[HH:mm:ss.SSS] [INFO] Test message`

### Requirement: 错误日志完整堆栈

系统 SHALL 提供 `log.error(message, error?, context?)` 签名，当 `error` 参数为 Error 实例时，自动提取 `name`、`message`、`stack` 并写入日志的 `err` 字段。

#### Scenario: 带 Error 对象的错误日志
- **WHEN** 调用 `log.error("Connection failed", err, { attempt: 3 })`
- **THEN** 日志包含 `"err":{"name":"TypeError","message":"...","stack":"..."}`

#### Scenario: flitter-amp catch 块堆栈不丢失
- **WHEN** flitter-amp 任意 catch 块捕获到异常
- **THEN** 日志记录中包含完整 `err.stack`

### Requirement: 日志文件轮转与清理

系统 SHALL 在 `initLogFile()` 启动时自动清理超过保留天数的日志文件。

- 保留天数通过 `logRetentionDays` 配置项控制，默认 7 天。
- 清理逻辑：扫描 `~/.flitter/logs/` 目录，匹配 `amp-YYYY-MM-DD.log` 格式的文件，删除日期早于 `today - logRetentionDays` 的文件。

#### Scenario: 启动时清理旧日志
- **WHEN** `initLogFile()` 被调用，且 `logRetentionDays = 7`
- **THEN** 7 天前的日志文件被删除，最近 7 天的日志文件保留

### Requirement: 上下文日志注入

系统 SHALL 提供 `setLogContext(ctx)` 和 `clearLogContext()` 函数，设置的上下文字段自动附加到每条日志记录。

#### Scenario: 设置会话上下文
- **WHEN** 调用 `setLogContext({ sessionId: "abc-123" })` 后写日志
- **THEN** 后续所有日志记录的 `ctx` 字段包含 `{"sessionId":"abc-123"}`

### Requirement: flitter-core 管线日志可重定向

系统 SHALL 在 `pipeline-debug.ts` 中新增 `setPipelineLogSink(sink)` 函数，允许外部替换 `pipelineLog` 的输出目标。

- 默认 sink：`(tag, msg) => process.stderr.write(\`[\${tag}] \${msg}\n\`)`（当前行为不变）
- flitter-amp 在初始化时调用 `setPipelineLogSink()` 将管线日志重定向到文件 logger

#### Scenario: amp 层桥接管线日志
- **WHEN** flitter-amp 调用 `setPipelineLogSink((tag, msg) => log.debug(\`[\${tag}] \${msg}\`))`
- **THEN** flitter-core 的管线日志写入 amp 的日志文件而非 stderr

### Requirement: FATAL 日志级别

系统 SHALL 新增 `FATAL` 日志级别（优先级高于 ERROR），用于不可恢复的致命错误。`log.fatal()` 在写入日志后不自动终止进程（进程退出由调用方决定）。

#### Scenario: 致命错误日志
- **WHEN** 调用 `log.fatal("Unrecoverable state", err)`
- **THEN** 日志记录 level 为 `FATAL`，包含完整错误信息

## MODIFIED Requirements

### Requirement: 已有 `log.error()` 签名变更

**现有**: `log.error(message: string, ...args: unknown[])`
**修改后**: `log.error(message: string, error?: Error | unknown, context?: Record<string, unknown>)`

当第二参数为 Error 实例时，自动提取堆栈；非 Error 时作为 context 处理。**BREAKING**：现有 `log.error("msg", someObj)` 的行为会变化——如果 `someObj` 是 Error 则走堆栈提取路径。

**迁移**：所有现有 `log.error` 调用点需检查并适配新签名。

## REMOVED Requirements

无
