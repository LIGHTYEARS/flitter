# flitter-cli vs AMP 全量对齐 Spec

## Why

flitter-cli 与 AMP 的 4 轮并行审计显示，~100 个功能检查点中仅 ~45% 已对齐。44 个未对齐项分布在 Thread Management、Handoff、Queue Mode、UI Overlays、Deep Reasoning、Image、Context Window、Provider/Skill/Agent Mode 等 15 个功能域。本 spec 的目标是将这 44 项差距全部关闭，使 flitter-cli 在功能层面与 AMP 完全对齐。

## What Changes

### P0-CRITICAL（6 项）
1. **ThreadWorker 状态机** — 将 `ThreadWorkerEntry` 薄数据记录升级为事件驱动状态机
2. **Queue auto-dequeue** — 实现 turn 完成后自动 dequeue 下一条消息的机制
3. **Compaction system** — 让 `_checkCompaction()` 实际执行消息裁剪
4. **`?` 触发 shortcuts help** — 通过 textChangeListener 拦截 `?` 输入
5. **`/` 触发 command palette** — 通过 textChangeListener 拦截 `/` 输入
6. **Command Palette overlay 渲染修复** — 修复 RenderFlex overflow Infinity 布局崩溃

### P1-HIGH（11 项）
7. Thread relationships（fork/handoff/mention 三种关系跟踪）
8. Thread preview split-view
9. createThread 异步化（seeded messages、parent relationship、draft/queue 转移）
10. Queue UI 组件（queued messages 列表）
11. Confirmation overlay 多选项
12. Toast notifications controller
13. Edit previous message（Up arrow 编辑上一条消息）
14. Pending skills injection 管道
15. Agent mode per-thread 持久化
16. Thread title generation 增强（AbortController/skip 规则）
17. handoffService 独立抽取

### P2-MED（15 项）
18. Provider-specific speed settings（standard/fast）
19. Interleaved thinking config
20. Shimmer/falling overlay animation
21. Deep mode effort hint controller
22. Image click → external viewer
23. Context analyze modal 精确 token 计数
24. Thread mentions `@@`
25. Model catalog（40+ models、pricing）
26. Provider config service 增强
27. Bash invocation spinner 动画
28. MCP status modal
29. File changes overlay
30. Resizable bottom grid（drag resize）
31. interruptQueuedMessage（单条 queue 消息中断）
32. pendingHandoffThreads（乐观句柄）

### P3-LOW（12 项）
33. Thread visibility UI command 触发
34. Thread merging/merged 状态
35. Worker ephemeralError + retry
36. Console overlay（debug log viewer）
37. News feed reader（RSS）
38. JetBrains installer
39. IDE picker（`/ide` command）
40. IDE client（background IDE connection）
41. Auto-copy on selection
42. Skill preview
43. Code mode
44. DTW mode / transport

### Round-0 遗留视觉项（10 项，部分与上述功能重叠）
- GAP-C4/C5/C6（与 #4/#5/#6 重叠）
- GAP-m1 Welcome 渐变、GAP-m5 多余命令、GAP-m6 scrollbar、GAP-m7 StatusBar 接线、GAP-m8 DensityOrb `#`、GAP-m9 footer hint、GAP-c1 光标 reverse video

## Impact
- 受影响代码：`packages/flitter-cli/src/` 下的 state/、widgets/、provider/、tools/、utils/、shortcuts/ 全部子目录
- 受影响能力：多线程管理、Handoff 工作流、Queue Mode、所有 UI overlay、深度推理、图片支持、上下文管理、Provider 系统、Skill 系统、Agent Mode 系统
- **BREAKING**: ThreadWorker 类型从纯记录变为状态机类，需更新所有消费者

## ADDED Requirements

### Requirement: ThreadWorker 事件驱动状态机
系统 SHALL 提供完整的 ThreadWorker 类，管理 per-thread 的推理/工具/标题生成操作，支持 AbortController 取消。

#### Scenario: Delta 事件处理
- **WHEN** 收到 `user:message-queue:enqueue` 事件
- **THEN** 检查当前推理状态，若 idle 则自动 dequeue 执行

### Requirement: Compaction 消息裁剪
系统 SHALL 在上下文窗口使用率超过阈值时自动裁剪历史消息。

#### Scenario: 自动 compaction
- **WHEN** context usage > compactionThresholdPercent
- **THEN** 计算 cut point，裁剪早期消息，更新 `isAutoCompacting` 状态

### Requirement: textChangeListener 特殊字符拦截
系统 SHALL 通过 InputArea 的 textChanged 回调拦截 `?` 和 `/` 单字符输入。

#### Scenario: `?` toggle shortcuts
- **WHEN** 用户在空输入框中键入 `?`
- **THEN** 清除输入，toggle shortcuts help overlay

#### Scenario: `/` trigger command palette
- **WHEN** 用户在空输入框中键入 `/`
- **THEN** 清除输入，打开 command palette，显示 toast hint

### Requirement: Command Palette 布局修复
系统 SHALL 正确约束 Command Palette overlay 的高度。

#### Scenario: Ctrl+O 打开 command palette
- **WHEN** 用户按 Ctrl+O
- **THEN** Command Palette overlay 正确渲染，无 RenderFlex overflow

### Requirement: Queue Auto-Dequeue
系统 SHALL 在当前 turn 完成后自动从队列中取出下一条消息并触发推理。

### Requirement: Edit Previous Message
系统 SHALL 支持 Up 箭头编辑上一条用户消息。

#### Scenario: Up arrow 编辑
- **WHEN** 用户在空输入框中按 Up 箭头
- **THEN** 将上一条用户消息内容填入输入框，截断后续对话

### Requirement: Toast Notifications
系统 SHALL 提供 ToastController 显示临时通知消息。

### Requirement: Thread Relationships
系统 SHALL 跟踪 fork/handoff/mention 三种线程间关系。

### Requirement: Agent Mode Per-Thread 持久化
系统 SHALL 支持每个线程独立设置和持久化 agent mode。

## MODIFIED Requirements

### Requirement: ThreadPool.createThread
现有 createThread 为同步纯本地操作。修改为支持 seeded messages、parent relationship 注册、draft/queued messages 转移。

### Requirement: ThreadPool.generateTitle
现有 generateTitle 同步截取首条消息。修改为支持 AbortController 取消、skipTitleGenerationIfMessageContains 配置、子线程检查。

### Requirement: StatusBar TODO 字段
现有 `isExecutingCommand`/`isRunningShell`/`isAutoCompacting`/`isHandingOff` 硬编码 false。修改为从 AppState 动态获取。

### Requirement: DensityOrb 密度字符集
现有 7 级 ` .:-=+*`。修改为 8 级 ` .:-=+*#` 并调整 noise 参数。
