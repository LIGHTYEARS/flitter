# Tasks

## Task 1: flitter-core — pipelineLog 可重定向

- [x] Task 1: 为 `pipeline-debug.ts` 增加 sink 重定向机制
  - [x] 1.1: 在 `pipeline-debug.ts` 中新增模块级 `_sink` 变量，默认值为 `(tag, msg) => process.stderr.write(\`[\${tag}] \${msg}\n\`)`
  - [x] 1.2: 导出 `setPipelineLogSink(sink: (tag: string, msg: string) => void): void`，替换 `_sink`
  - [x] 1.3: 导出 `resetPipelineLogSink(): void`，恢复为默认 stderr sink（供测试使用）
  - [x] 1.4: 修改 `pipelineLog()` 内部调用 `_sink(tag, msg)` 而非直接 `process.stderr.write`
  - [x] 1.5: 在 `packages/flitter-core/src/index.ts` 中导出 `setPipelineLogSink` 和 `resetPipelineLogSink`
  - [x] 1.6: 编写测试 `packages/flitter-core/src/diagnostics/__tests__/pipeline-log-sink.test.ts`
    - 验证默认 sink 写入 stderr
    - 验证 `setPipelineLogSink` 替换后 `pipelineLog` 调用新 sink
    - 验证 `resetPipelineLogSink` 恢复默认行为

## Task 2: flitter-amp — logger.ts 结构化重构

- [x] Task 2: 重构 `utils/logger.ts`，实现结构化日志 + 错误堆栈 + 上下文 + FATAL 级别
  - [x] 2.1: 新增 `FATAL` 级别（`{ debug: 0, info: 1, warn: 2, error: 3, fatal: 4 }`）
  - [x] 2.2: 新增模块级 `_logContext: Record<string, unknown> = {}`，导出 `setLogContext(ctx)` 和 `clearLogContext()`
  - [x] 2.3: 重构 `formatMessage` → 双模式输出：
    - 文件模式（`logStream` 存在）：输出 NDJSON 格式 `{"ts","level","msg","ctx?","err?","data?"}`
    - stderr 模式：保持现有 `[HH:mm:ss.SSS] [LEVEL] message` 文本格式
  - [x] 2.4: 重构 `log.error()` 和新增 `log.fatal()` 签名为 `(message: string, error?: Error | unknown, context?: Record<string, unknown>)`
    - Error 实例自动提取 `{ name, message, stack }` 到 `err` 字段
    - 非 Error 的第二参数作为 `data` 处理
  - [x] 2.5: 调整 `log.debug()` / `log.info()` / `log.warn()` 签名为 `(message: string, data?: Record<string, unknown>)`，保持简洁
  - [x] 2.6: 编写测试 `packages/flitter-amp/src/utils/__tests__/logger.test.ts`
    - 验证 JSON 模式输出格式
    - 验证 stderr 模式输出格式
    - 验证 Error 堆栈提取
    - 验证 `setLogContext` / `clearLogContext`
    - 验证 FATAL 级别

## Task 3: flitter-amp — 日志文件轮转与清理

- [x] Task 3: 在 `initLogFile()` 中增加日志清理逻辑
  - [x] 3.1: 在 `config.ts` 中新增 `logRetentionDays` 配置项（默认 7）
  - [x] 3.2: 在 `initLogFile()` 接受 `retentionDays` 参数，启动时扫描 `~/.flitter/logs/`，匹配 `amp-YYYY-MM-DD.log`，删除早于 `today - retentionDays` 的文件
  - [x] 3.3: 编写测试：用临时目录模拟旧日志文件，验证清理逻辑正确

## Task 4: flitter-amp — 修复所有 catch 块的错误日志

- [x] Task 4: 更新所有 catch 块使用新的 `log.error(msg, err)` 签名
  - [x] 4.1: `src/index.ts` — 3 处 catch 块（连接失败、prompt 失败、cancel 失败）
  - [x] 4.2: `src/acp/reconnection-manager.ts` — 1 处 catch 块（重连失败）
  - [x] 4.3: `src/acp/graceful-shutdown.ts` — 3 处 catch 块
  - [x] 4.4: `src/state/session-store.ts` — 3 处 catch 块
  - [x] 4.5: 顶层 `main().catch()` 改用 `log.fatal()`
  - [x] 4.6: 确认所有现有测试通过（`bun test` in flitter-amp）

## Task 5: flitter-amp — 桥接 core 管线日志到文件 logger

- [x] Task 5: 在 flitter-amp 初始化时桥接 core 日志
  - [x] 5.1: 在 `src/index.ts` 的初始化流程中，调用 `setPipelineLogSink((tag, msg) => log.debug(\`[\${tag}] \${msg}\`))` 将管线日志重定向到文件
  - [x] 5.2: 在 shutdown 流程中调用 `resetPipelineLogSink()` 恢复默认
  - [x] 5.3: 手动验证 `FLITTER_DEBUG=verbose` 模式下管线日志出现在日志文件中

# Task Dependencies

```
Task 1 (core pipelineLog 重定向) ──→ Task 5 (amp 桥接 core 日志)
Task 2 (logger 结构化重构)       ──→ Task 4 (修复 catch 块)
Task 2 (logger 结构化重构)       ──→ Task 5 (amp 桥接 core 日志)
Task 3 (日志清理) ─── 依赖 Task 2 的 initLogFile 签名变更
```

- **Wave 1（可并行）**: Task 1 + Task 2
- **Wave 2（依赖 Wave 1）**: Task 3 + Task 4
- **Wave 3（依赖 Wave 1 + Wave 2）**: Task 5
