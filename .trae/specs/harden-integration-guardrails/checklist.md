# Checklist

## 能力缺口 1: 渲染管线条件调试日志

- [x] `debug-flags.ts` 新增 `applyEnvDebugFlags()` 函数，读取 `FLITTER_DEBUG` 环境变量
- [x] `FLITTER_DEBUG` 未设置时，所有 debugFlags 保持 false
- [x] `FLITTER_DEBUG=pipeline` 时，仅 `debugShowFrameStats === true`
- [x] `FLITTER_DEBUG=verbose` 时，`debugShowFrameStats + debugPrintBuilds + debugPrintLayouts + debugPrintPaints` 全部为 true
- [x] `diagnostics/pipeline-debug.ts` 存在，导出 `pipelineLog` 工具函数
- [x] `FrameScheduler.executeFrame()` 在 `debugShowFrameStats` 为 true 时输出帧级摘要到 stderr
- [x] `BuildOwner.buildScope()` 在 `debugPrintBuilds` 为 true 时输出 dirty/rebuild 计数
- [x] `PipelineOwner.flushLayout()` 在 `debugPrintLayouts` 为 true 时输出 layout 节点计数
- [x] `WidgetsBinding.paint()/render()` 在 `debugPrintPaints` 为 true 时输出 paint/render 状态
- [x] `diagnostics/__tests__/pipeline-debug.test.ts` 存在且全部通过

## 能力缺口 2: Render tree 同步正确性集成测试

- [x] `packages/flitter-core/src/test-utils/pipeline-helpers.ts` 存在，导出 `readScreenRow`、`readFrontCell`、`collectRenderTree`、`findRenderObject`、`createTestBinding`
- [x] `pipeline-integration.test.ts` 改为 import 提取的辅助函数，全部现有测试通过
- [x] `render-tree-sync.test.ts` 存在且包含：
  - Expanded child 类型切换后 render tree + screen buffer 同步验证
  - 多 Expanded 局部替换时 children 顺序正确
  - 条件渲染 Welcome → ChatList 的 screen buffer 文本变化
  - 多级 ProxyElement 嵌套下 render object 替换正确
- [x] 所有新增 flitter-core 测试通过 (`bun test packages/flitter-core/`)

## 能力缺口 3: Session update → 画面更新端到端测试

- [x] `packages/flitter-amp/src/test-utils/app-test-harness.ts` 存在，导出 `createAppTestHarness`
- [x] harness 提供 `simulateSessionUpdate` 和 `simulateFullPrompt` 便捷方法
- [x] `session-to-screen.test.ts` 存在且包含：
  - `startProcessing` 后 screen buffer 包含用户消息
  - `onSessionUpdate(agent_message_chunk)` 后 screen buffer 包含 agent 回复
  - 完整链路 startProcessing → streaming → onPromptComplete 的每阶段 screen buffer 验证
  - items 0→1 切换时 Welcome 屏幕消失
- [x] 所有新增 flitter-amp 测试通过 (`bun test packages/flitter-amp/`)

## 回归守护

- [x] flitter-core 全部现有测试不 break (`bun test packages/flitter-core/`)
- [x] flitter-amp 全部现有测试不 break (`bun test packages/flitter-amp/`)
