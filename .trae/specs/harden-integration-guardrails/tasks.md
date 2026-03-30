# Tasks

## 能力缺口 1: 渲染管线条件调试日志

- [x] Task 1: 实现 `FLITTER_DEBUG` 环境变量前端 + 管线日志插桩
  - [x] 1.1: 修改 `packages/flitter-core/src/diagnostics/debug-flags.ts`，新增 `applyEnvDebugFlags()` 函数
    - 读取 `process.env.FLITTER_DEBUG`（模块加载时调用一次）
    - `pipeline` → 开启 `debugShowFrameStats`
    - `verbose` → 开启 `debugShowFrameStats + debugPrintBuilds + debugPrintLayouts + debugPrintPaints`
    - 无值或未设置 → 不改变任何 flag（保持全 false）
  - [x] 1.2: 新建 `packages/flitter-core/src/diagnostics/pipeline-debug.ts`，提供 stderr 日志输出工具
    - 导出 `pipelineLog(tag: string, msg: string)` — 输出 `[tag] msg` 到 `process.stderr`
    - 此模块不持有任何开关状态，开关完全由 `debugFlags` 控制
  - [x] 1.3: 在管线 4 个关键位置插入受 `debugFlags.*` 守护的条件日志
    - `FrameScheduler.executeFrame()` — 帧级摘要（build/layout/paint/render 各阶段耗时、dirty 数量、patches 数量），守护 flag: `debugShowFrameStats`
    - `BuildOwner.buildScope()` — dirty element 数量、rebuild 总数、verbose 时输出每个 element 的 widget 类名和深度，守护 flag: `debugPrintBuilds`
    - `PipelineOwner.flushLayout()` — 需要 layout 的节点数量、verbose 时输出每个节点类名和约束，守护 flag: `debugPrintLayouts`
    - `WidgetsBinding.paint()/render()` — `_shouldPaintCurrentFrame`、patches 数量、output 长度，守护 flag: `debugPrintPaints`
  - [x] 1.4: 编写测试 `packages/flitter-core/src/diagnostics/__tests__/pipeline-debug.test.ts`
    - 验证 `applyEnvDebugFlags()` 在 `FLITTER_DEBUG=pipeline` 时仅开启 `debugShowFrameStats`
    - 验证 `applyEnvDebugFlags()` 在 `FLITTER_DEBUG=verbose` 时开启全部 4 个 flag
    - 验证 `resetDebugFlags()` 后所有 flag 回到 false
    - 验证 `pipelineLog` 实际写入 stderr

## 能力缺口 2: Render tree 同步正确性集成测试

- [x] Task 2: 创建 flitter-core 共享测试辅助模块
  - [x] 2.1: 新建 `packages/flitter-core/src/test-utils/pipeline-helpers.ts`
    - 从 `pipeline-integration.test.ts` 提取 `readScreenRow(binding, row, maxCols)`、`readFrontCell(binding, x, y)` 为公共导出
    - 新增 `collectRenderTree(rootRO)` — 递归遍历 render object tree 返回 `{ className, width, height, childCount }[]` 扁平列表
    - 新增 `findRenderObject(rootRO, className)` — 按类名查找第一个匹配的 RenderObject
    - 新增 `createTestBinding(cols, rows)` — 封装 `reset → instance → handleResize → requestForcedPaintFrame` 流程，返回 `{ binding, drawFrame(), readRow(y), cleanup() }`
    - **关键设计**：`createTestBinding` 不在 finally 中 reset（区别于 `captureToGrid`），允许多帧操作
  - [x] 2.2: 更新 `pipeline-integration.test.ts`，改为 import 提取的辅助函数，确保全部现有测试通过

- [x] Task 3: 编写 render tree 同步集成测试（单个测试文件覆盖全部场景）
  - [x] 3.1: 新建 `packages/flitter-core/src/framework/__tests__/render-tree-sync.test.ts`，包含以下 4 组测试：
    - **ParentData child 类型切换**: Expanded child 从 `Center(child: Text("A"))` → `Row(children: [Text("B")])` 后，验证 render tree 中 children[0] 类型变化 + screen buffer 中 "A" 消失 "B" 出现
    - **多 Expanded 局部替换保持顺序**: 3 个 Expanded，只替换 idx=0 的 child，验证 render tree children 顺序 `[新RO, 原RO1, 原RO2]` 而非 `[原RO1, 原RO2, 新RO]`
    - **条件渲染切换**: StatefulWidget 初始返回 `Center(Text("Welcome"))`，setState 后返回 `Column([Text("User: hi")])`，验证 screen buffer 文本变化
    - **多级 ProxyElement 嵌套**: `InheritedWidget > Expanded > Center` 切换 Center → Row，验证 render object 在正确的祖先中被替换

## 能力缺口 3: Session update → 画面更新端到端测试

- [x] Task 4: 创建 flitter-amp 多帧测试 harness
  - [x] 4.1: 新建 `packages/flitter-amp/src/test-utils/app-test-harness.ts`
    - 导出 `createAppTestHarness(cols?, rows?)`，返回 `{ binding, appState, drawFrame(), readRow(y), readGrid(), findText(text), cleanup() }`
    - 内部构造最小化的 `App` widget + `AppState`，使用同步帧执行
    - 提供 `simulateSessionUpdate(update: SessionUpdate)` — 直接调用 `appState.onSessionUpdate` + `drawFrame`
    - 提供 `simulateFullPrompt(userText, agentReply)` — 模拟完整 `startProcessing → onSessionUpdate(chunk) → onPromptComplete` 链路

- [x] Task 5: 编写 session update → screen buffer 端到端测试
  - [x] 5.1: 新建 `packages/flitter-amp/src/__tests__/session-to-screen.test.ts`
    - **测试 A**: `startProcessing("hi")` → drawFrame → screen buffer 包含 "hi"
    - **测试 B**: `onSessionUpdate(agent_message_chunk: "hello")` → drawFrame → screen buffer 包含 "hello"
    - **测试 C**: 完整链路 `startProcessing → agent_thought_chunk → agent_message_chunk → onPromptComplete`，每步 drawFrame 后验证 screen buffer
    - **测试 D**: `startProcessing("hello")` 后 items 从 0→1，验证 Welcome 屏幕消失

# Task Dependencies

```
Task 1 (调试日志) ────────────────────────────→ (独立，无依赖)
Task 2 (core 测试辅助) ──→ Task 3 (render tree 集成测试)
Task 4 (amp 测试 harness) ──→ Task 5 (session→screen 端到端测试)
```

- **Wave 1（可并行）**: Task 1 + Task 2 + Task 4
- **Wave 2（依赖 Wave 1 对应项）**: Task 3（依赖 Task 2）+ Task 5（依赖 Task 4）
