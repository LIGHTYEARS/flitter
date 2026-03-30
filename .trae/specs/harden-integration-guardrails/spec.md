# 加固集成测试护栏 — 补齐三个能力缺口

## Why

flitter 项目处于逆向重建阶段，3576 个 per-gap unit test 只验证了局部行为，但三个系统级能力完全空白：
1. **可观测性缺失** — 渲染管线（build→layout→paint→render）没有可通过环境变量开启的调试日志，排查问题只能手动插 `console.error`
2. **跨层集成测试缺失** — `ParentDataElement._replaceRenderObjectInAncestor` 是空方法却没被发现，说明"element tree 正确"从未被关联到"render tree 正确"再到"画面正确"
3. **session update 端到端链路无测试** — `FlitterClient.sessionUpdate()` → `AppState.onSessionUpdate()` → `notifyListeners()` → `setState` → `build` → layout → paint → render 这条十几环的链路从未被作为整体验证

## What Changes

- 为 flitter-core 已有的 `diagnostics/debug-flags.ts` 添加 `FLITTER_DEBUG` 环境变量前端，一次性开启相关 debug flag 组合
- 在渲染管线各阶段（FrameScheduler、BuildOwner、PipelineOwner、WidgetsBinding）插入受 debugFlags 守护的条件日志
- 新增 **render tree 正确性集成测试**：验证 widget tree 变化后 render object tree 和 screen buffer 同步更新
- 新增 **session update → 画面更新端到端测试**：在 flitter-amp 层验证 streaming 事件到达后 screen buffer 内容正确

## Impact

- 受影响的包：`flitter-core`（日志 + 集成测试）、`flitter-amp`（端到端测试）
- 受影响的文件：
  - `packages/flitter-core/src/diagnostics/debug-flags.ts` — 添加 `FLITTER_DEBUG` 环境变量解析
  - `packages/flitter-core/src/diagnostics/pipeline-debug.ts` — 新增管线日志输出函数
  - `packages/flitter-core/src/framework/binding.ts` — 在 paint/render 中插入条件日志
  - `packages/flitter-core/src/scheduler/frame-scheduler.ts` — 在 executeFrame 中插入条件日志
  - `packages/flitter-core/src/framework/build-owner.ts` — 在 buildScope 中插入条件日志
  - `packages/flitter-core/src/framework/pipeline-owner.ts` — 在 flushLayout 中插入条件日志
  - 新增测试文件若干

## Design Decisions

### ADR-1: FLITTER_DEBUG 与 debug-flags.ts 的关系

项目已有 `diagnostics/debug-flags.ts` 提供运行时 toggle（`debugPrintBuilds`、`debugPrintLayouts` 等），但这些 flag 目前仅定义、未在管线中使用。

**决定**：`FLITTER_DEBUG` 环境变量作为 `debug-flags.ts` 的**环境变量前端**，而非独立的第二套系统。具体映射：

- `FLITTER_DEBUG=pipeline` → 开启 `debugShowFrameStats`
- `FLITTER_DEBUG=verbose` → 开启 `debugShowFrameStats + debugPrintBuilds + debugPrintLayouts + debugPrintPaints`

管线各阶段的日志输出由 `debugFlags.*` 守护，`pipeline-debug.ts` 只提供 stderr 输出的工具函数。

### ADR-2: process.env 读取时机

`FLITTER_DEBUG` 在模块加载时读取一次（top-level side effect），结果缓存到 `debugFlags` 中。测试中通过 `resetDebugFlags()` 恢复。

### ADR-3: flitter-core vs flitter-amp 测试辅助的分工

- `flitter-core/src/test-utils/` — 提供 **多帧 binding harness**（持有 binding 引用，支持多次 setState + drawFrameSync）和 render tree 遍历工具
- `flitter-amp/src/test-utils/capture.ts` — 保持现有 **单帧快照** 语义（captureToGrid 在 finally 中 reset）
- `flitter-amp/src/test-utils/` — 新增 **amp 多帧 harness**（持有 binding + AppState，支持模拟 session update → drawFrame → 验证 screen buffer）

两层 harness 的关键区别：core harness 不知道 AppState；amp harness 组合了 core harness + AppState + App widget。

## ADDED Requirements

### Requirement: 渲染管线条件调试日志

系统 SHALL 通过 `FLITTER_DEBUG` 环境变量控制渲染管线的调试日志输出。`FLITTER_DEBUG` 作为已有 `debug-flags.ts` 的环境变量前端，开启对应的 flag 组合。

- `FLITTER_DEBUG=pipeline` — 开启 `debugShowFrameStats`，输出帧级别摘要：每帧的 build/layout/paint/render 耗时、dirty element 数量、patches 数量
- `FLITTER_DEBUG=verbose` — 额外开启 `debugPrintBuilds + debugPrintLayouts + debugPrintPaints`，输出每个 dirty element 的 rebuild 详情、layout 节点列表
- 不设置 `FLITTER_DEBUG` 时所有 flag 保持 false，零开销（日志调用点用 `if (debugFlags.X)` 守护）

#### Scenario: 启用管线日志
- **WHEN** 设置 `FLITTER_DEBUG=pipeline` 并运行 flitter-amp
- **THEN** 每帧在 stderr 输出一行摘要（含时间戳、阶段耗时、变更计数）

#### Scenario: 默认无日志
- **WHEN** 不设置 `FLITTER_DEBUG`
- **THEN** 渲染管线不输出任何调试日志，无运行时开销

### Requirement: Render tree 同步正确性集成测试

系统 SHALL 包含集成测试验证：当 StatefulWidget 通过 setState 改变 widget tree 结构时，render object tree 和 screen buffer 同步更新。

#### Scenario: ParentDataWidget child 类型切换后画面更新
- **WHEN** Expanded 的 child 从 Center 切换到 Row（通过 setState）
- **THEN** render object tree 中对应的 child 类型正确替换
- **AND** screen buffer 中旧内容被清除，新内容正确绘制

#### Scenario: 条件渲染 widget 切换（items 空 → 非空）
- **WHEN** StatefulWidget 根据 items.length 在 Welcome 和 ChatList 之间切换
- **THEN** screen buffer 行的文本内容从 Welcome 变为 ChatList

#### Scenario: 多 Expanded 局部替换保持顺序
- **WHEN** Column 中有多个 Expanded，只替换其中一个的 child 类型
- **THEN** children 在 render object tree 中的顺序保持不变

#### Scenario: 多级 ProxyElement 嵌套下的 render object 替换
- **WHEN** 多层 ProxyElement（InheritedWidget > Expanded）包裹的 child 类型发生变化
- **THEN** render object 在正确的祖先 RenderObject 中被替换

### Requirement: Session update → 画面更新端到端测试

系统 SHALL 包含端到端测试验证：session update 事件到达后，conversation items 通过渲染管线正确显示到 screen buffer。

#### Scenario: startProcessing 后画面显示用户消息
- **WHEN** 调用 startProcessing(text) 添加用户消息
- **AND** 同步执行一帧
- **THEN** screen buffer 中出现用户消息文本

#### Scenario: agent_message_chunk 后画面显示回复
- **WHEN** AppState.onSessionUpdate 收到 agent_message_chunk 事件
- **AND** 同步执行一帧
- **THEN** screen buffer 中出现 assistant 的消息文本

#### Scenario: 完整链路验证
- **WHEN** 调用 startProcessing(text) 添加用户消息
- **AND** 随后调用 onSessionUpdate(agent_message_chunk)
- **AND** 最后调用 onPromptComplete
- **THEN** 每个步骤后的 screen buffer 依次正确反映对应阶段的内容

#### Scenario: items 0→1 切换时 Welcome 消失
- **WHEN** startProcessing("hello") 使 items 从 0 变为 1
- **AND** 同步执行一帧
- **THEN** screen buffer 不再包含 Welcome 屏幕内容

## MODIFIED Requirements

无

## REMOVED Requirements

无
