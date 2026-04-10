# Tasks — flitter-cli vs AMP 44 项功能对齐

> 按 P0→P1→P2→P3 分层，Wave 内可并行。每个 Task 验收标准：对应测试 PASS + `bun test` 无回归。
> 测试命令: `cd packages/flitter-cli && bun test`
> 类型检查: `cd packages/flitter-cli && bun run typecheck`

---

## Wave 1: P0-CRITICAL — 核心功能缺口（6 tasks）

> F4/F5/F6 可能在 `close-round0-open-gaps` 中已修复，需先验证。

- [ ] Task W1-1: 验证 `?` / `/` / Command Palette 当前状态（F4/F5/F6）
  - [ ] W1-1.1: 启动 flitter-cli，空输入框键入 `?`，确认 shortcuts help toggle
  - [ ] W1-1.2: 空输入框键入 `/`，确认 command palette 打开 + toast
  - [ ] W1-1.3: Ctrl+O 打开 command palette，确认无 RenderFlex overflow
  - [ ] W1-1.4: 若已修复，标记 F4/F5/F6 为 DONE；若未修复，转入 W1-2/W1-3

- [ ] Task W1-2: ThreadWorker 事件驱动状态机（F1）
  - [ ] W1-2.1: 新建 `state/thread-worker.ts`，实现 `ThreadWorker` 类
    - 状态枚举: `idle | running | tool_running | cancelled | error`
    - 推理状态枚举: `none | streaming | thinking | tool_call`
    - `ops` 字段: `{ inference: AbortController | null, tools: Record<string, AbortController>, titleGeneration: AbortController | null }`
    - `ephemeralError: string | null`
    - `retryCountdownSeconds: number`
    - `fileChanges: string[]`
    - `toolCallUpdates: ToolCallUpdate[]`
    - `trackedFiles: string[]`
  - [ ] W1-2.2: 实现 `handle(delta)` 方法，处理至少 6 种核心 delta 事件:
    - `user:message-queue:enqueue` — 入队检查
    - `user:message-queue:dequeue` — 自动 dequeue
    - `assistant:message` — 更新推理状态
    - `tool:data` — 更新工具调用
    - `error` — 设置 ephemeralError + retry
    - `title:generation` — 标题生成状态
  - [ ] W1-2.3: 重构 `thread-pool.ts` 中 `ThreadWorkerEntry` → `ThreadWorker`
    - `getOrCreateWorker` 返回 `ThreadWorker` 实例
    - `activeWorkerCount` 基于 worker 状态过滤
  - [ ] W1-2.4: 编写测试 `tests/state/thread-worker.test.ts`
    - 状态转换正确性
    - delta 事件处理
    - AbortController 取消
    - ephemeralError + retry countdown

- [ ] Task W1-3: Queue auto-dequeue（F2）— 依赖 W1-2
  - [ ] W1-3.1: 在 `ThreadWorker.handle()` 中实现 `user:message-queue:dequeue` 事件处理
    - turn 完成时检查 `queuedMessages.length > 0`
    - 若有排队消息，dequeue 第一条并触发 `sendUserMessage`
  - [ ] W1-3.2: 在 `ThreadWorker.handle()` 中实现 `user:message-queue:enqueue` 智能入队
    - 若当前 idle/cancelled，直接 dequeue 执行
    - 若正在推理，入队等待
  - [ ] W1-3.3: 编写测试 `tests/state/queue-auto-dequeue.test.ts`
    - 推理完成后自动 dequeue
    - idle 时入队直接执行
    - 空队列不触发 dequeue

- [ ] Task W1-4: Compaction 实际裁剪（F3）
  - [ ] W1-4.1: 在 `prompt-controller.ts` 的 `_checkCompaction()` 中实现实际裁剪逻辑
    - 计算 cut point（保留系统提示 + 最近 N 条消息）
    - 调用 `conversation.truncateBefore(cutMessageId)` 执行裁剪
    - 设置 `isAutoCompacting = true` → 裁剪完成 → `false`
  - [ ] W1-4.2: 在 `app-state.ts` 中将 `isAutoCompacting` 从硬编码 `false` 改为动态 getter
  - [ ] W1-4.3: 在 `session.ts` 中实现 `truncateBefore(messageId: string)` 方法
  - [ ] W1-4.4: 编写测试 `tests/state/compaction-execution.test.ts`
    - 超阈值触发裁剪
    - 裁剪保留系统提示
    - isAutoCompacting 状态转换
    - 裁剪后上下文使用率下降

- [ ] Task W1-5: `?` textChangeListener 触发修复（F4）— 仅在 W1-1 验证未通过时执行
  - [ ] W1-5.1: 在 `input-area.ts` 的 `_onTextChanged()` 中添加 `text === '?' && oldText === ''` 检测
  - [ ] W1-5.2: InputArea props 新增 `onQuestionMarkTrigger`
  - [ ] W1-5.3: AppShell 传递 `onQuestionMarkTrigger: () => this._toggleShortcutHelp()`

- [ ] Task W1-6: `/` textChangeListener 触发修复（F5）— 依赖 W1-7（或 W1-1 验证）
  - [ ] W1-6.1: 在 `input-area.ts` 的 `_onTextChanged()` 中添加 `text === '/' && oldText === ''` 检测
  - [ ] W1-6.2: InputArea props 新增 `onSlashTrigger`
  - [ ] W1-6.3: AppShell 传递 `onSlashTrigger: () => { showCommandPalette(); toastController.show(...) }`

- [ ] Task W1-7: Command Palette overlay 渲染修复（F6）— 仅在 W1-1 验证未通过时执行
  - [ ] W1-7.1: 在 `command-palette.ts` 的 build() 中添加 `ConstrainedBox` 或固定 `maxHeight` 约束
  - [ ] W1-7.2: 验证 Ctrl+O 打开无 overflow 错误

---

## Wave 2: P1-HIGH — 重要功能缺口（11 tasks，部分可并行）

- [ ] Task W2-1: Thread Relationships（F7）— 依赖 W1-2
  - [ ] W2-1.1: 在 `types.ts` 中定义 `ThreadRelationship` 类型: `{ type: 'fork' | 'handoff' | 'mention', sourceThreadID: string, targetThreadID: string }`
  - [ ] W2-1.2: 在 `thread-pool.ts` 中添加 `_relationships: ThreadRelationship[]` 和管理方法
  - [ ] W2-1.3: 在 `types.ts` 中添加 `ThreadStatus: 'merging' | 'merged' | null`
  - [ ] W2-1.4: `createThread` 中注册 parent-child relationship + 可见性继承
  - [ ] W2-1.5: 编写测试 `tests/state/thread-relationships.test.ts`

- [ ] Task W2-2: Thread Preview Split-View（F8）
  - [ ] W2-2.1: 新建 `widgets/thread-preview.ts`，实现 `ThreadPreview` widget
    - 接收 `threadID`，显示该线程最近 N 条消息摘要
    - 支持滚动
  - [ ] W2-2.2: 修改 `widgets/thread-list.ts`，hover 时触发预览
  - [ ] W2-2.3: 修改 `widgets/app-shell.ts`，在 overlay 层渲染预览

- [ ] Task W2-3: createThread 异步化（F9）— 依赖 W2-1
  - [ ] W2-3.1: 将 `createThread` 改为 async，新增参数: `seededMessages?`, `parent?`, `draftContent?`, `queuedMessages?`
  - [ ] W2-3.2: 实现 seeded messages 注入
  - [ ] W2-3.3: 实现 parent relationship 注册
  - [ ] W2-3.4: 实现 draft/queue 转移
  - [ ] W2-3.5: 编写测试

- [ ] Task W2-4: Queue UI 组件（F10）— 依赖 W1-3
  - [ ] W2-4.1: 新建 `widgets/queued-messages-list.ts`
    - 显示排队消息摘要列表
    - 每条消息可点击中断
  - [ ] W2-4.2: 修改 `widgets/app-shell.ts` 或 `widgets/input-area.ts`，在 input area 旁渲染

- [ ] Task W2-5: Confirmation Overlay 多选项（F11）
  - [ ] W2-5.1: 扩展 `confirmation-overlay.ts`，支持 `options: string[]` 参数（不仅 yes/no）
  - [ ] W2-5.2: 渲染多选项按钮列表
  - [ ] W2-5.3: 修改 `app-state.ts` 中调用点，传入多选项

- [ ] Task W2-6: Toast Notifications 完善（F12）
  - [ ] W2-6.1: 验证 `toast-overlay.ts` 中 `ToastController` 的 show/dismiss API 完整性
  - [ ] W2-6.2: 确认 auto-dismiss 定时器（3s）工作
  - [ ] W2-6.3: 确认类型化样式（success/error/info/warning）
  - [ ] W2-6.4: 在关键操作点接入 toast（如 `/` 触发、skill 加载、model 切换）

- [ ] Task W2-7: Edit Previous Message（F13）
  - [ ] W2-7.1: 在 `app-state.ts` 中添加 `editingMessageOrdinal: number | null` 和 `isEditingPreviousMessage: boolean`
  - [ ] W2-7.2: 在 `shortcuts/defaults.ts` 中注册 Up 箭头 → `editPreviousMessage` 命令
  - [ ] W2-7.3: 实现 `editPreviousMessage()`: 获取上一条用户消息 → 回填 InputArea → 截断后续项
  - [ ] W2-7.4: 在 `session.ts` 中实现 `truncateAfter(ordinal: number)` 方法
  - [ ] W2-7.5: 编写测试

- [ ] Task W2-8: Pending Skills Injection（F14）— 依赖 W1-2
  - [ ] W2-8.1: 在 `ThreadWorker.handle()` 的推理开始前，检查 `pendingSkills`
  - [ ] W2-8.2: 将 pending skills 注入为 info message（匹配 AMP 的 `addPendingSkill` → info message 流程）
  - [ ] W2-8.3: 注入后调用 `removePendingSkill`

- [ ] Task W2-9: Agent Mode Per-Thread 持久化（F15）
  - [ ] W2-9.1: 在 `ThreadHandle` 中添加 `agentMode: AgentMode` 字段
  - [ ] W2-9.2: 切换线程时恢复该线程的 mode
  - [ ] W2-9.3: 新线程继承全局默认 mode
  - [ ] W2-9.4: 编写测试

- [ ] Task W2-10: Thread Title Generation 增强（F16）
  - [ ] W2-10.1: 将 `generateTitle` 改为 async，支持 AbortController
  - [ ] W2-10.2: 添加 `skipTitleGenerationIfMessageContains` 配置规则
  - [ ] W2-10.3: 子线程不生成标题检查
  - [ ] W2-10.4: 编写测试

- [ ] Task W2-11: HandoffService 独立抽取（F17）— 依赖 W2-1
  - [ ] W2-11.1: 新建 `state/handoff-service.ts`，从 AppState 抽取 handoff 逻辑
  - [ ] W2-11.2: 实现 handoff 系统提示构建（包含源线程上下文）
  - [ ] W2-11.3: 实现 `followHandoffIfSourceActive` 回调
  - [ ] W2-11.4: 重构 AppState 中的 handoff 调用点
  - [ ] W2-11.5: 编写测试

---

## Wave 3: P2-MED — 功能增强（15 tasks，高度并行）

- [ ] Task W3-1: Provider-specific speed settings（F18）
  - [ ] W3-1.1: 在 `config-service.ts` 中添加 `anthropicSpeed` / `openAISpeed` 设置（standard/fast）
  - [ ] W3-1.2: 在 `pi-ai-provider.ts` 中根据 speed 设置调整请求参数

- [ ] Task W3-2: Interleaved thinking config（F19）
  - [ ] W3-2.1: 在 `pi-ai-provider.ts` 中为 Anthropic 请求添加 `interleaved_thinking` 参数
  - [ ] W3-2.2: 在 `config-service.ts` 中添加 `interleavedThinking` 开关

- [ ] Task W3-3: Shimmer/falling overlay animation（F20）
  - [ ] W3-3.1: 验证 `border-shimmer.ts` 当前实现
  - [ ] W3-3.2: 在 deep reasoning 激活时触发 shimmer 动画
  - [ ] W3-3.3: 实现 falling overlay 效果（AMP 的 "thinking" 视觉提示）

- [ ] Task W3-4: Deep mode effort hint controller（F21）
  - [ ] W3-4.1: 新建 `utils/effort-hint-controller.ts`
  - [ ] W3-4.2: 实现 `canShowHintInCurrentThread()` 和 `dismissForInteraction()` 逻辑
  - [ ] W3-4.3: 在 deep reasoning 激活时显示 effort level hint

- [ ] Task W3-5: Image click → external viewer（F22）
  - [ ] W3-5.1: 在 `image-preview-overlay.ts` 中添加 click handler
  - [ ] W3-5.2: 实现 `forceExternal` 打开系统图片查看器

- [ ] Task W3-6: Context analyze modal 精确 token 计数（F23）
  - [ ] W3-6.1: 在 `context-analyze-overlay.ts` 中使用实际 token 计数替代估算
  - [ ] W3-6.2: 从 provider 的 usage 数据中获取精确 token 数

- [ ] Task W3-7: Thread mentions `@@`（F24）
  - [ ] W3-7.1: 在 `input-area.ts` 的 `_onTextChanged()` 中添加 `@@` 检测
  - [ ] W3-7.2: 触发 thread picker overlay
  - [ ] W3-7.3: 选中后插入 thread mention 引用

- [ ] Task W3-8: Model catalog 扩展（F25）
  - [ ] W3-8.1: 在 `provider/factory.ts` 中扩展 model 列表至 40+ models
  - [ ] W3-8.2: 每个模型包含 contextWindow, maxOutputTokens, capabilities, pricing info
  - [ ] W3-8.3: 在 command palette 中添加 model 选择子菜单

- [ ] Task W3-9: Provider config service 增强（F26）
  - [ ] W3-9.1: 在 `config-service.ts` 中添加 per-provider settings schema
  - [ ] W3-9.2: 支持 baseUrl/id overrides 持久化

- [ ] Task W3-10: Bash invocation spinner 动画（F27）
  - [ ] W3-10.1: 在 `bash-invocations.ts` 中为 running 状态添加 BrailleSpinner
  - [ ] W3-10.2: 实现 75ms pending→shown 延时 + 500ms 最小显示时间（若 `close-shell-mode-gaps` 未完成）

- [ ] Task W3-11: MCP status modal（F28）
  - [ ] W3-11.1: 新建 `widgets/mcp-status-modal.ts`
  - [ ] W3-11.2: 显示 MCP server 连接状态和工具列表
  - [ ] W3-11.3: 在 command palette 中注册 `/mcp` 命令

- [ ] Task W3-12: File changes overlay（F29）
  - [ ] W3-12.1: 验证 `context-detail-overlay.ts` 中 file changes 部分
  - [ ] W3-12.2: 实现完整的 session-modified files 列表显示
  - [ ] W3-12.3: 点击文件名跳转到 diff 视图

- [ ] Task W3-13: Resizable bottom grid（F30）
  - [ ] W3-13.1: 在 `app-shell.ts` 中添加 bottom grid drag resize handler
  - [ ] W3-13.2: 实现 `bottomGridUserHeight` 和 `bottomGridDragStartY` 状态
  - [ ] W3-13.3: clamp between min/max 高度

- [ ] Task W3-14: interruptQueuedMessage 单条中断（F31）— 依赖 W1-3
  - [ ] W3-14.1: 在 `thread-pool.ts` 中添加 `interruptQueuedMessage(threadID, messageIndex)` 方法
  - [ ] W3-14.2: 在 Queue UI 组件中接入单条中断按钮

- [ ] Task W3-15: pendingHandoffThreads 乐观句柄（F32）— 依赖 W2-11
  - [ ] W3-15.1: 在 `thread-pool.ts` 中添加 `pendingHandoffThreads: Map<string, ThreadHandle>`
  - [ ] W3-15.2: handoff 创建时生成乐观句柄，provider 就绪后替换
  - [ ] W3-15.3: 编写测试

---

## Wave 4: P3-LOW — 后续迭代（12 tasks，高度并行）

- [ ] Task W4-1: Thread visibility UI command 触发（F33）
  - [ ] 在 command palette 中注册 visibility 切换命令
  - [ ] 在 shortcuts 中绑定快捷键

- [ ] Task W4-2: Thread merging/merged 状态（F34）— 依赖 W2-1
  - [ ] 实现 `mergeThread(sourceID, targetID)` 方法
  - [ ] 设置 `threadStatus: 'merging' | 'merged'`
  - [ ] 编写测试

- [ ] Task W4-3: Worker ephemeralError + retry（F35）— 依赖 W1-2
  - [ ] 在 ThreadWorker 中实现 `retryCountdownSeconds` + `retryTimer`
  - [ ] 瞬态错误显示 + 自动重试逻辑
  - [ ] 编写测试

- [ ] Task W4-4: Console overlay（F36）
  - [ ] 新建 `widgets/console-overlay.ts`
  - [ ] 显示 debug log viewer
  - [ ] 在 command palette 中注册 `/console` 命令

- [ ] Task W4-5: News feed reader（F37）
  - [ ] 新建 `widgets/news-feed-reader.ts`
  - [ ] RSS feed 获取和渲染
  - [ ] 在 command palette 中注册 `/news` 命令

- [ ] Task W4-6: JetBrains installer（F38）
  - [ ] 新建 `widgets/jetbrains-installer.ts`
  - [ ] 实现 IDE 插件安装引导
  - [ ] 在 command palette 中注册 `/jetbrains` 命令

- [ ] Task W4-7: IDE picker（F39）
  - [ ] 新建 `utils/ide-picker.ts`
  - [ ] 实现 `/ide` 命令选择 IDE
  - [ ] 在 command palette 中注册

- [ ] Task W4-8: IDE client（F40）
  - [ ] 新建 `utils/ide-client.ts`
  - [ ] 实现 background IDE 连接管理

- [ ] Task W4-9: Auto-copy on selection（F41）
  - [ ] 在 `utils/clipboard.ts` 中添加 auto-copy timer
  - [ ] 选中文字后 300ms 自动复制

- [ ] Task W4-10: Skill preview（F42）
  - [ ] 在 `skill-service.ts` 中添加 `skillPreview` 和 `cachedSkillForPreview`
  - [ ] 在 SkillsModal 中渲染预览

- [ ] Task W4-11: Code mode（F43）
  - [ ] 在 agent modes 中添加 `code` mode 定义
  - [ ] 实现 code mode 特定行为（限制工具集）

- [ ] Task W4-12: DTW mode / transport（F44）
  - [ ] 实现 DTW (Dedicated Thread Worker) transport 层
  - [ ] 支持 `createThreadWorker` 和 worker 生命周期管理

---

## Wave 5: 全量回归 + 测试补全

- [ ] Task W5-1: 补全测试覆盖
  - [ ] `tests/state/thread-pool.test.ts` — Thread management 完整测试
  - [ ] `tests/state/handoff.test.ts` — Handoff mode 完整测试
  - [ ] `tests/state/queue-mode.test.ts` — Queue mode 完整测试
  - [ ] `tests/state/skill-service.test.ts` — SkillService 测试
  - [ ] `tests/state/config-service.test.ts` — ConfigService 测试
  - [ ] `tests/widgets/toast-overlay.test.ts` — Toast 测试

- [ ] Task W5-2: 全量回归
  - [ ] `cd packages/flitter-cli && bun test` — 全部通过
  - [ ] `cd packages/flitter-cli && bun run typecheck` — 无类型错误
  - [ ] `cd packages/flitter-core && bun test` — 无回归
  - [ ] `cd packages/flitter-amp && bun test` — 无回归

---

# Task Dependencies

```
W1-1 (验证) → W1-5/W1-6/W1-7 (条件执行)
W1-2 (ThreadWorker) → W1-3 (Queue dequeue), W2-1 (Relationships), W2-8 (Skills injection)
W1-3 (Queue dequeue) → W2-4 (Queue UI), W3-14 (interruptQueuedMessage)
W1-4 (Compaction) — 独立
W2-1 (Relationships) → W2-3 (createThread async), W2-11 (HandoffService), W4-2 (merging)
W2-11 (HandoffService) → W3-15 (pendingHandoffThreads)
Wave 3 全部 — 依赖 Wave 1-2 完成
Wave 4 全部 — 依赖 Wave 1-3 完成
Wave 5 — 依赖所有 Wave 完成
```

# 执行策略

1. **Wave 1 FIRST** — W1-1 验证先行，W1-2 ThreadWorker 是关键路径
2. **Wave 2** 在 W1-2 完成后启动，W2-1/W2-7/W2-9 可并行
3. **Wave 3** 在 Wave 2 核心项完成后启动，高度并行
4. **Wave 4** 可与 Wave 3 尾部重叠
5. **Wave 5** 最后执行，确保全量通过
6. 每个 Wave 完成后运行 `bun test` + `bun run typecheck` 捕获回归
