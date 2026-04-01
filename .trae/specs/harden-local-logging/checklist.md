# Checklist

## flitter-core 变更

- [x] `pipeline-debug.ts` 新增 `setPipelineLogSink()` 和 `resetPipelineLogSink()` 导出
- [x] `pipelineLog()` 内部调用可替换 sink 而非硬编码 `process.stderr.write`
- [x] 默认行为不变：未调用 `setPipelineLogSink` 时 `pipelineLog` 仍写 stderr
- [x] `index.ts` 导出 `setPipelineLogSink` 和 `resetPipelineLogSink`
- [x] `pipeline-log-sink.test.ts` 测试通过

## flitter-amp logger 重构

- [x] `logger.ts` 支持 5 个日志级别：`debug` / `info` / `warn` / `error` / `fatal`
- [x] 文件模式下日志输出为 NDJSON 格式（每行一个有效 JSON）
- [x] NDJSON 记录包含 `ts`、`level`、`msg` 必填字段
- [x] stderr 模式下日志保持 `[HH:mm:ss.SSS] [LEVEL] message` 文本格式
- [x] `log.error(msg, err)` 中 Error 实例的 `name`/`message`/`stack` 被完整记录
- [x] `setLogContext()` / `clearLogContext()` 正确注入/清除上下文字段
- [x] `logger.test.ts` 测试通过

## 日志文件清理

- [x] `config.ts` 新增 `logRetentionDays` 配置项，默认值 7
- [x] `initLogFile()` 启动时清理超过保留天数的日志文件
- [x] 清理逻辑仅匹配 `amp-YYYY-MM-DD.log` 格式，不影响其他文件
- [x] 日志清理测试通过

## catch 块修复

- [x] `src/index.ts` 中所有 catch 块使用 `log.error(msg, err)` 记录完整堆栈
- [x] `src/acp/reconnection-manager.ts` catch 块使用 `log.error(msg, err)`
- [x] `src/acp/graceful-shutdown.ts` 所有 catch 块使用结构化日志（`log.warn` + data object）
- [x] `src/state/session-store.ts` 所有 catch 块使用 `log.error(msg, err)`
- [x] 顶层 `main().catch()` 使用 `log.fatal()`

## 桥接 core → amp 日志

- [x] flitter-amp 初始化时调用 `setPipelineLogSink()` 重定向管线日志到文件
- [x] shutdown 流程中调用 `resetPipelineLogSink()` 恢复

## 整体验证

- [x] `bun test` in flitter-core 全部通过（3589 pass，1 fail 为预存在的 HotReloadWatcher flaky test）
- [x] `bun test` in flitter-amp 全部通过（800 pass，1 fail 为预存在的 session 排序时间戳竞态）
- [x] `pnpm -r run typecheck` 无新增类型错误（所有错误为预存在的 widgets/*.ts 未使用导入等）
