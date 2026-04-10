# flitter-cli vs AMP 44 项功能对齐 Spec

## Why

4 个并行 flitter-dev subagent 审计发现 flitter-cli 与 AMP 源码在 ~100 个功能检查点中仅 45% 对齐，存在 44 个未对齐项。核心瓶颈：ThreadWorker 状态机缺失导致并发线程操作不可靠、Compaction 未实际裁剪导致长会话崩溃、关键 UI 触发路径（`?`/`/`）不通。本次变更按 P0→P1→P2→P3 分层逐一关闭所有差距。

## What Changes

### P0-CRITICAL（6 项）
- **F1**: ThreadWorker 从薄数据记录升级为事件驱动状态机（~20 种 delta 事件处理、ops/AbortController/ephemeralError/retry）
- **F2**: Queue auto-dequeue — turn 完成后自动 dequeue 下一条 queued message 并触发推理
- **F3**: Compaction 实际裁剪 — `_checkCompaction()` 计算 cut point 后执行消息裁剪，`isAutoCompacting` 从硬编码 false 改为动态
- **F4**: `?` 通过 textChangeListener 触发 shortcuts help toggle
- **F5**: `/` 通过 textChangeListener 触发 command palette + toast hint
- **F6**: Command Palette overlay 渲染崩溃修复（RenderFlex overflow Infinity）

> **注意**: F4/F5/F6 在 `close-round0-open-gaps` spec 中已标记完成，需验证当前代码状态。若已修复则跳过。

### P1-HIGH（11 项）
- **F7**: Thread relationships — `fork`/`handoff`/`mention` 关系类型 + `merging`/`merged` 状态
- **F8**: Thread preview split-view — thread list hover 时展示内容预览
- **F9**: createThread 异步化 — seeded messages、parent relationship、draft/queue 转移
- **F10**: Queue UI 组件 — input area 旁的 queued messages 列表
- **F11**: Confirmation overlay 多选项 — AMP 的工具权限审批多选 dialog
- **F12**: Toast notifications — ToastController + ephemeral 消息显示
- **F13**: Edit previous message — Up 箭头编辑上一条用户消息并重新生成
- **F14**: Pending skills injection — ThreadWorker pipeline 中将 pending skills 注入为 info message
- **F15**: Agent mode per-thread 持久化 — per-thread mode 切换和持久化
- **F16**: Thread title generation 增强 — AbortController 取消、skip 规则配置、子线程检查
- **F17**: handoffService 独立抽取 — 从 AppState 抽取为独立 service

### P2-MED（15 项）
- **F18**: Provider-specific speed settings（standard/fast）
- **F19**: Interleaved thinking config（Anthropic-specific）
- **F20**: Shimmer/falling overlay animation（deep reasoning 激活时）
- **F21**: Deep mode effort hint controller
- **F22**: Image click → external viewer
- **F23**: Context analyze modal 精确 token 计数
- **F24**: Thread mentions `@@`
- **F25**: Model catalog（40+ models, pricing info）
- **F26**: Provider config service 增强
- **F27**: Bash invocation spinner 动画 + 移除定时器
- **F28**: MCP status modal
- **F29**: File changes overlay（session-modified files list）
- **F30**: Resizable bottom grid（drag resize）
- **F31**: interruptQueuedMessage（单条中断）
- **F32**: pendingHandoffThreads（乐观句柄）

### P3-LOW（12 项）
- **F33**: Thread visibility UI command 触发
- **F34**: Thread merging/merged 状态
- **F35**: Worker ephemeralError + retry
- **F36**: Console overlay（debug log viewer）
- **F37**: News feed reader（RSS）
- **F38**: JetBrains installer
- **F39**: IDE picker（`/ide` command）
- **F40**: IDE client（background connection）
- **F41**: Auto-copy on selection
- **F42**: Skill preview
- **F43**: Code mode
- **F44**: DTW mode / transport

## Impact

- 受影响代码: `packages/flitter-cli/src/**`
  - `state/`: thread-pool.ts, app-state.ts, prompt-controller.ts, types.ts, skill-service.ts, config-service.ts
  - `widgets/`: 新增 queued-messages-list.ts, thread-preview.ts, handoff-service.ts, mcp-status-modal.ts, console-overlay.ts, news-feed-reader.ts
  - `provider/`: factory.ts, pi-ai-provider.ts
  - `commands/`: command-registry.ts
  - `shortcuts/`: defaults.ts
- 受影响测试: `packages/flitter-cli/tests/**` — 新增 ~50+ 测试用例
- AMP 源码参考: `tmux-capture/amp-source/` 下 20+ 文件

## ADDED Requirements

### Requirement: ThreadWorker 事件驱动状态机

系统 SHALL 将 `ThreadWorkerEntry`（4 字段薄记录）升级为完整的事件驱动状态机类 `ThreadWorker`，支持至少以下 delta 事件处理：
- `user:message-queue:enqueue` — 入队时检查推理状态，idle 则直接 dequeue
- `user:message-queue:dequeue` — turn 完成后自动 dequeue 下一条
- `assistant:message` — 更新推理状态
- `tool:data` — 更新工具调用状态
- `error` — 设置 ephemeralError + 启动 retry countdown

每个操作（inference/tools/titleGeneration）SHALL 维护独立的 AbortController，支持取消。

#### Scenario: Queue auto-dequeue
- **WHEN** 一条 queued message 的推理 turn 完成
- **THEN** 系统自动 dequeue 下一条 queued message 并触发推理

#### Scenario: 操作取消
- **WHEN** 用户取消正在进行的推理
- **THEN** 通过 `ops.inference.abort()` 终止，worker 状态转为 idle

### Requirement: Compaction 实际裁剪

`_checkCompaction()` SHALL 在计算 cut point 后实际执行消息裁剪：移除 cut point 之前的消息，保留系统提示和最近 N 条消息。`isAutoCompacting` SHALL 从硬编码 `false` 改为基于 compaction 状态的动态值。

#### Scenario: 长会话自动裁剪
- **WHEN** 上下文使用率超过 compaction 阈值
- **THEN** 系统自动裁剪早期消息，`isAutoCompacting` 为 true，裁剪完成后恢复 false

### Requirement: `?` / `/` textChangeListener 触发

InputArea 的 textChangeListener SHALL 检测 `?` 和 `/` 单字符输入（空输入框时），触发对应 overlay 而非插入字符。

#### Scenario: `?` 触发 shortcuts help
- **WHEN** 用户在空输入框键入 `?`
- **THEN** shortcuts help 面板 toggle，输入框保持空

#### Scenario: `/` 触发 command palette
- **WHEN** 用户在空输入框键入 `/`
- **THEN** command palette 打开，输入框保持空，toast 显示 "Use Ctrl-O to open the command palette"

### Requirement: Thread Relationships

系统 SHALL 支持 `fork`/`handoff`/`mention` 三种线程关系类型，通过 `thread_relationships` 协议事件注册。创建子线程时 SHALL 注册 parent-child relationship 并继承可见性。

#### Scenario: Handoff 创建关系
- **WHEN** handoff 创建新线程
- **THEN** 系统注册 `handoff` 类型关系，子线程继承父线程可见性

### Requirement: Edit Previous Message

系统 SHALL 支持 Up 箭头编辑上一条用户消息。选中消息后，消息内容回填到 InputArea，该消息之后的所有对话项被截断，用户可修改后重新提交。

#### Scenario: Up 箭头编辑
- **WHEN** 用户在空输入框按 Up 箭头
- **THEN** 上一条用户消息内容回填到 InputArea，该消息之后的所有项被标记为待截断

### Requirement: Queue UI 组件

系统 SHALL 在 input area 旁显示 queued messages 列表，支持显示消息摘要和单条中断操作。

#### Scenario: 显示排队消息
- **WHEN** 用户在 queue mode 中提交多条消息
- **THEN** input area 旁显示排队消息列表，每条可点击中断

### Requirement: Toast Notifications

ToastController SHALL 提供简单的 show/dismiss API，支持 auto-dismiss 定时器和类型化样式（success/error/info/warning）。

#### Scenario: Toast 自动消失
- **WHEN** 系统显示 toast 消息
- **THEN** 消息在 3 秒后自动消失

### Requirement: Confirmation Overlay 多选项

ConfirmationOverlay SHALL 支持多选项 permission dialog（不仅限于 yes/no），匹配 AMP 的工具权限审批交互。

#### Scenario: 工具权限审批
- **WHEN** LLM 请求执行需要权限的工具
- **THEN** 显示多选项确认对话框（Allow / Deny / Always allow）

### Requirement: Agent Mode Per-Thread

系统 SHALL 支持 per-thread agent mode 持久化。切换线程时恢复该线程的 mode，新线程继承全局默认 mode。

#### Scenario: 线程切换恢复 mode
- **WHEN** 用户从 thread A（code mode）切换到 thread B（smart mode）
- **THEN** thread B 的 agent mode 为 smart mode

### Requirement: Thread Title Generation 增强

generateTitle SHALL 支持 AbortController 取消、`skipTitleGenerationIfMessageContains` 配置规则、子线程不生成标题检查。

#### Scenario: 取消标题生成
- **WHEN** 用户在标题生成完成前切换线程
- **THEN** 之前的标题生成被取消

### Requirement: HandoffService 独立抽取

Handoff 逻辑 SHALL 从 AppState 抽取为独立 `HandoffService` 类，支持系统提示构建和生命周期管理。

#### Scenario: Handoff 系统提示
- **WHEN** 创建 handoff
- **THEN** HandoffService 构建包含源线程上下文的系统提示

### Requirement: Thread Preview Split-View

ThreadList hover 时 SHALL 在 split-view 中展示线程内容预览，包含消息摘要和滚动控制。

#### Scenario: Hover 预览
- **WHEN** 用户在 thread list 中 hover 某线程
- **THEN** 右侧显示该线程的消息预览

### Requirement: Pending Skills Injection

ThreadWorker pipeline SHALL 将 pending skills 注入为 info message，匹配 AMP 的深度集成行为。

#### Scenario: Skill 自动注入
- **WHEN** 线程有 pending skills
- **THEN** 在推理开始前将 skill 信息注入为 info message

## MODIFIED Requirements

### Requirement: createThread 异步化

`createThread` SHALL 从同步本地操作改为 async，支持 `seededMessages`、`parent` relationship 注册、`draftContent` 转移、`queuedMessages` 转移参数。

### Requirement: ThreadPool Worker 管理

`getOrCreateWorker` SHALL 返回完整 `ThreadWorker` 实例（非薄记录），支持状态查询和操作取消。

## REMOVED Requirements

### Requirement: ThreadWorkerEntry 薄记录

**Reason**: 被 ThreadWorker 完整状态机替代
**Migration**: 所有 `ThreadWorkerEntry` 引用迁移到 `ThreadWorker`
