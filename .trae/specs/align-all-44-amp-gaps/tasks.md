# Tasks — flitter-cli vs AMP 全量对齐（44 项）

> 按 Sprint 分层，同 Sprint 内可并行。每个 Task 由独立 flitter-dev subagent 执行。
> 构建验证: `cd packages/flitter-cli && npm run build`
> 测试验证: `cd packages/flitter-cli && npx bun test`

---

## Sprint 1: P0 Core Blockers（6 tasks）

### Sprint 1A: 交互修复（可并行）

- [x] Task S1-1: `?` 和 `/` textChangeListener 拦截（GAP-C4 + GAP-C5）
  - 修改: `packages/flitter-cli/src/widgets/input-area.ts`
  - 在 `_onTextChanged` 回调中添加 `text === "?"` 和 `text === "/"` 检测
  - `?`: 清除输入 → toggle shortcuts help overlay（通过 `onQuestionMarkTrigger` 回调）
  - `/`: 清除输入 → 打开 command palette + toast "Use Ctrl-O to open the command palette"
  - AMP ref: `30_main_tui_state.js` L278, textChangeListener

- [x] Task S1-2: Command Palette overlay 布局修复（GAP-C6）
  - 修改: `packages/flitter-cli/src/widgets/command-palette.ts`
  - 修改: `packages/flitter-cli/src/state/overlay-manager.ts`（如需要）
  - 诊断: `Ctrl+O` 触发后 RenderFlex overflow Infinity on bottom
  - 修复: 为 Command Palette 添加 `ConstrainedBox` 或 `SizedBox` 最大高度约束
  - 验证: `Ctrl+O` 后 overlay 正确渲染，无崩溃

### Sprint 1B: 核心状态机（顺序依赖）

- [x] Task S1-3: ThreadWorker 事件驱动状态机
  - 新建: `packages/flitter-cli/src/state/thread-worker.ts`
  - 修改: `packages/flitter-cli/src/state/types.ts`（ThreadWorkerEntry → ThreadWorker class）
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts`（使用新 ThreadWorker）
  - 实现:
    - `ThreadWorker` 类，包含 `state` BehaviorSubject-like 属性
    - `ops` 结构: `{ tools: Map, inference: AbortController|null, titleGeneration: AbortController|null }`
    - `handle(delta)` 方法处理 ~20 种 delta 事件
    - `ephemeralError` + `retryCountdownSeconds` 瞬态错误
    - `fileChanges`、`toolCallUpdates` 跟踪
  - AMP ref: `29_thread_worker_statemachine.js`

- [x] Task S1-4: Queue auto-dequeue 机制（依赖 S1-3）
  - 修改: `packages/flitter-cli/src/state/thread-worker.ts`
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts`
  - 修改: `packages/flitter-cli/src/state/prompt-controller.ts`
  - 实现:
    - ThreadWorker 在 turn 完成时检查 `queuedMessages` 数组
    - 若有 pending 消息，自动 dequeue 并调用 `_startInference()`
    - `user:message-queue:enqueue` 时若 idle 立即执行
    - `user:message-queue:dequeue` 事件分发
  - AMP ref: `29_thread_worker_statemachine.js` dequeue 逻辑

- [x] Task S1-5: Compaction system 实际裁剪（依赖 S1-3）
  - 修改: `packages/flitter-cli/src/state/prompt-controller.ts`（`_checkCompaction`）
  - 修改: `packages/flitter-cli/src/state/app-state.ts`（`isAutoCompacting` 接线）
  - 修改: `packages/flitter-cli/src/state/session.ts`（conversation truncation）
  - 实现:
    - `_checkCompaction()` 计算 cut point 后实际调用 `conversation.truncateBefore(cutMessageId)`
    - 更新 `compactionState` 为 `'compacting'` → `'idle'`
    - `isAutoCompacting` getter 返回 `compactionState === 'compacting'`
    - 阈值配置: `compactionThresholdPercent`（默认 80%）

### Sprint 1C: Round-0 视觉遗留（可并行）

- [x] Task S1-6: Round-0 视觉差距关闭（7 项批量修复）
  - GAP-m1: `packages/flitter-cli/src/widgets/welcome-screen.ts` — "Welcome to Amp" 14 字符逐字符 RGB 渐变 `(0,174,89)` → `(0,92,41)`
  - GAP-m5: `packages/flitter-cli/src/commands/command-registry.ts` — 移除多余的 `context detail` 和 `context file changes` 命令
  - GAP-m6: `packages/flitter-cli/src/widgets/command-palette.ts` — 不需要滚动时隐藏 scrollbar
  - GAP-m7: `packages/flitter-cli/src/widgets/app-shell.ts` — StatusBar `isExecutingCommand`/`isRunningShell`/`isAutoCompacting`/`isHandingOff` 从 AppState 获取
  - GAP-m8: `packages/flitter-cli/src/utils/density-orb.ts` — 添加 `#` 到 `WELCOME_DENSITY_CHARS`；增大 contrast
  - GAP-m9: `packages/flitter-cli/src/widgets/status-bar.ts` — idle+空输入时渲染 `? for shortcuts` hint
  - GAP-c1: `packages/flitter-cli/src/widgets/streaming-cursor.ts` — reverse video `[7m ` 替代 `█`

---

## Sprint 2: P1 Feature Gaps（11 tasks，大部分可并行）

- [x] Task S2-1: Thread relationships 跟踪
  - 修改: `packages/flitter-cli/src/state/types.ts` — 添加 `ThreadRelationship` type: `{ type: 'fork'|'handoff'|'mention', sourceID: string, targetID: string }`
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts` — 添加 `threadRelationships: ThreadRelationship[]` 和 `applyParentRelationship()`
  - AMP ref: `32_protocol_schemas.js` Jo0, `20_thread_management.js` L349

- [ ] Task S2-2: Thread preview split-view
  - 新建: `packages/flitter-cli/src/widgets/thread-preview.ts`
  - 修改: `packages/flitter-cli/src/widgets/thread-list.ts` — hover 时在侧面板显示 thread 内容预览
  - 实现: 包含 ScrollController、消息列表渲染、从 ThreadHandle.conversation 读取

- [ ] Task S2-3: createThread 异步化增强
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts` — `createThread` 支持 options: `{ seededMessages?, parentThreadID?, draftContent?, queuedMessages? }`
  - 注册 parent relationship
  - 转移 draft/queued messages
  - AMP ref: `20_thread_queue_handoff.js` createThread

- [x] Task S2-4: Queue UI 组件
  - 新建: `packages/flitter-cli/src/widgets/queued-messages-list.ts`
  - 修改: `packages/flitter-cli/src/widgets/input-area.ts` — input area 旁渲染 queued messages
  - 支持: 显示消息列表 + 单条中断按钮
  - AMP ref: `s9T` widget

- [ ] Task S2-5: Confirmation overlay 多选项
  - 修改: `packages/flitter-cli/src/widgets/confirmation-overlay.ts`
  - 从 yes/no 二元扩展为 N 个选项的 SelectionList
  - 支持 permission dialog 多选型审批
  - AMP ref: `10_confirmation_dialog_eTT.js`

- [x] Task S2-6: Toast notifications 完整实现
  - 修改: `packages/flitter-cli/src/widgets/toast-overlay.ts`
  - 实现 `ToastController.show(message, type, duration)` 完整 lifecycle
  - Toast 渲染: 定时自动消失（默认 3s）、type-based 着色
  - 接入 OverlayManager
  - AMP ref: `26_toast_skills.js`

- [ ] Task S2-7: Edit previous message（Up arrow）
  - 修改: `packages/flitter-cli/src/widgets/app-shell.ts` — Up arrow 键处理
  - 修改: `packages/flitter-cli/src/state/app-state.ts` — `editPreviousMessage()` 方法
  - 修改: `packages/flitter-cli/src/state/conversation.ts` — `getLastUserMessage()`, `truncateAfter(index)`
  - 实现: 空输入框按 Up → 找到最后一条用户消息 → 填入输入框 → 截断后续对话
  - AMP ref: `editingMessageOrdinal`, `isEditingPreviousMessage`

- [x] Task S2-8: Pending skills injection 管道
  - 修改: `packages/flitter-cli/src/state/skill-service.ts` — `addPendingSkill()`, `removePendingSkill()`, `getPendingSkills()`
  - 修改: `packages/flitter-cli/src/state/prompt-controller.ts` — turn 开始前将 pending skills 作为 info messages 注入
  - AMP ref: `pendingSkill`: 108 refs

- [x] Task S2-9: Agent mode per-thread 持久化
  - 修改: `packages/flitter-cli/src/state/thread-handle.ts` — 添加 `agentMode` 字段
  - 修改: `packages/flitter-cli/src/state/app-state.ts` — `setAgentMode()` 写入 current thread handle
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts` — thread switch 时恢复 mode
  - AMP ref: `agentMode`: 214 refs

- [x] Task S2-10: Thread title generation 增强
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts` — `generateTitle()` 改为异步
  - 添加: AbortController 支持（`ops.titleGeneration`）
  - 添加: `skipTitleGenerationIfMessageContains` 配置
  - 添加: 子线程（非 main thread）不生成标题检查
  - AMP ref: `20_thread_management.js` triggerTitleGeneration

- [x] Task S2-11: handoffService 独立抽取
  - 新建: `packages/flitter-cli/src/state/handoff-service.ts`
  - 从 `app-state.ts` 抽取 handoff 相关逻辑: `enterHandoffMode`, `exitHandoffMode`, `submitHandoff`, `startCountdown`, `cancelCountdown`
  - 添加: handoff 系统提示构建
  - 添加: `followHandoffIfSourceActive` 回调
  - AMP ref: `pVR()` handoff service

---

## Sprint 3: P2 Feature Gaps（15 tasks，全部可并行）

- [ ] Task S3-1: Provider-specific speed settings
  - 修改: `packages/flitter-cli/src/state/config.ts` — 添加 `anthropicSpeed`, `openAISpeed` 配置
  - 修改: `packages/flitter-cli/src/provider/pi-ai-provider.ts` — 根据 speed 调整 model 参数

- [ ] Task S3-2: Interleaved thinking config
  - 修改: `packages/flitter-cli/src/state/config.ts` — `anthropic.interleavedThinking` boolean
  - 修改: `packages/flitter-cli/src/provider/pi-ai-provider.ts` — 透传到 stream options

- [ ] Task S3-3: Shimmer/falling overlay animation
  - 新建: `packages/flitter-cli/src/widgets/border-shimmer.ts`（如不存在则增强）
  - 深度推理激活时在边框区域渲染 shimmer 动画效果

- [ ] Task S3-4: Deep mode effort hint controller
  - 新建: `packages/flitter-cli/src/utils/effort-hint-controller.ts`
  - 实现 `canShowHintInCurrentThread()`, `dismissForInteraction()` 逻辑
  - 连接到 StatusBar 显示当前 reasoning effort level hint

- [x] Task S3-5: Image click → external viewer
  - 修改: `packages/flitter-cli/src/widgets/image-preview-overlay.ts`
  - 添加 `onImageClick` 回调，支持调用系统 `open` 命令在外部查看图片

- [x] Task S3-6: Context analyze modal 精确 token 计数
  - 修改: `packages/flitter-cli/src/widgets/context-analyze-overlay.ts`
  - 实现精确的 per-message token 计数（而非估算）
  - 显示分项 breakdown: system prompt, user messages, assistant messages, tool calls

- [ ] Task S3-7: Thread mentions `@@`
  - 修改: `packages/flitter-cli/src/widgets/input-area.ts` — `@@` 触发 thread picker
  - 新建: `packages/flitter-cli/src/widgets/thread-mention-picker.ts`
  - 选中后插入 thread mention reference

- [x] Task S3-8: Model catalog（40+ models）
  - 新建: `packages/flitter-cli/src/provider/model-catalog.ts`
  - 定义 ~40 个 model 条目: `{ id, provider, contextWindow, maxOutputTokens, capabilities, reasoningEffort, pricing }`
  - 接入 `factory.ts` 作为 fallback lookup

- [ ] Task S3-9: Provider config service 增强
  - 修改: `packages/flitter-cli/src/state/config-service.ts`
  - 添加 per-provider settings: `anthropic.effort`, `anthropic.interleavedThinking`, `openai.speed`
  - 添加 `internal.compactionThresholdPercent` 配置

- [x] Task S3-10: Bash invocation spinner 动画
  - 修改: `packages/flitter-cli/src/widgets/bash-invocations.ts`
  - running 状态增加 braille spinner 动画
  - 添加 show/hide 延迟定时器（AMP: 显示延迟 + 最小持续时间）

- [x] Task S3-11: MCP status modal
  - 新建: `packages/flitter-cli/src/widgets/mcp-status-modal.ts`
  - 显示 MCP server 连接状态列表
  - 接入 OverlayManager + 命令面板触发

- [ ] Task S3-12: File changes overlay 实质化
  - 修改: `packages/flitter-cli/src/widgets/file-changes-overlay.ts`
  - 从占位改为显示 session 中所有被修改文件的列表
  - 读取 `AppState.fileChanges` 或 ThreadWorker.fileChanges

- [x] Task S3-13: Resizable bottom grid（drag resize）
  - 修改: `packages/flitter-cli/src/widgets/app-shell.ts`
  - 添加 InputArea 区域上边界的鼠标拖拽调整高度
  - 实现 `bottomGridUserHeight`, 限制 min/max

- [x] Task S3-14: interruptQueuedMessage（单条中断）
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts`
  - 添加 `interruptQueuedMessage(messageID)` 方法：移除指定 queued message
  - 接入 Queue UI 组件的中断按钮

- [x] Task S3-15: pendingHandoffThreads（乐观句柄）
  - 修改: `packages/flitter-cli/src/state/thread-pool.ts`
  - 添加 `pendingHandoffThreads: Map<string, ThreadHandle>` 乐观创建
  - handoff 创建完成前允许切换到目标线程

---

## Sprint 4: P3 Feature Gaps（12 tasks，全部可并行）

- [ ] Task S4-1: Thread visibility UI command 触发
  - 修改: `packages/flitter-cli/src/commands/command-registry.ts` — 添加 "Toggle thread visibility" 命令
  - 连接到 `ThreadPool.setThreadVisibility()`

- [ ] Task S4-2: Thread merging/merged 状态
  - 修改: `packages/flitter-cli/src/state/types.ts` — 添加 `threadStatus: 'merging' | 'merged' | null`
  - 修改: `packages/flitter-cli/src/state/thread-handle.ts` — 添加 `status` 字段

- [ ] Task S4-3: Worker ephemeralError + retry
  - 修改: `packages/flitter-cli/src/state/thread-worker.ts`
  - 添加 `ephemeralError` 属性 + `retryCountdownSeconds` + auto-retry timer

- [ ] Task S4-4: Console overlay（debug log viewer）
  - 新建: `packages/flitter-cli/src/widgets/console-overlay.ts`
  - 显示运行时日志（读取 logger output）
  - 接入 OverlayManager

- [x] Task S4-5: News feed reader
  - 新建: `packages/flitter-cli/src/widgets/news-feed-overlay.ts`
  - RSS/JSON feed 解析 + 渲染列表
  - 接入 OverlayManager + 命令面板

- [x] Task S4-6: JetBrains installer
  - 新建: `packages/flitter-cli/src/widgets/jetbrains-installer.ts`
  - 首次运行检测 + JetBrains IDE 集成安装引导

- [ ] Task S4-7: IDE picker（`/ide` command）
  - 新建: `packages/flitter-cli/src/widgets/ide-picker.ts`
  - 修改: `packages/flitter-cli/src/commands/command-registry.ts` — 添加 `/ide` 命令
  - 列出可用 IDE，选中后设置连接

- [ ] Task S4-8: IDE client（background connection）
  - 新建: `packages/flitter-cli/src/utils/ide-client.ts`
  - 后台与 IDE 保持连接，支持文件导航指令

- [ ] Task S4-9: Auto-copy on selection
  - 修改: `packages/flitter-cli/src/utils/clipboard.ts`
  - 添加 `_autoCopyTimer`: 鼠标选区后延迟 auto copy（300ms）
  - 添加 `AUTO_COPY_HIGHLIGHT_DURATION_MS` 高亮反馈

- [x] Task S4-10: Skill preview
  - 新建: `packages/flitter-cli/src/widgets/skill-preview.ts`
  - 修改: `packages/flitter-cli/src/widgets/skills-modal.ts` — hover/选中时显示 skill 详情预览

- [ ] Task S4-11: Code mode
  - 修改: `packages/flitter-cli/src/state/types.ts` — 确认 `AGENT_MODES` 包含 `'code'`
  - 修改: `packages/flitter-cli/src/state/app-state.ts` — `code` mode 特殊行为（若有）

- [x] Task S4-12: DTW mode / transport
  - 新建: `packages/flitter-cli/src/utils/transport-connection.ts`
  - WebSocket 连接管理 + reconnect 逻辑
  - DTW mode 检测和 UI 适配

---

# Task Dependencies

```
S1-4 (Queue auto-dequeue) 依赖 S1-3 (ThreadWorker 状态机)
S1-5 (Compaction) 依赖 S1-3 (ThreadWorker 状态机)
Sprint 2 全部可在 Sprint 1 完成后并行
Sprint 3 全部可在 Sprint 2 完成后并行（或与 Sprint 2 并行）
Sprint 4 全部可在 Sprint 3 完成后并行（或与 Sprint 3 并行）
S2-4 (Queue UI) 可与 S1-4 并行但需 S1-3 的 ThreadWorker 类型
S2-11 (handoffService) 无前置依赖
S3-14 (interruptQueuedMessage) 依赖 S2-4 (Queue UI)
```

# 推荐执行顺序

1. **Sprint 1A + 1C 并行** — 交互修复 + 视觉遗留（无相互依赖）
2. **Sprint 1B 顺序** — S1-3 → S1-4 → S1-5（核心状态机链）
3. **Sprint 2 并行** — 所有 11 个 P1 task 可并行（除显式依赖外）
4. **Sprint 3 并行** — 所有 15 个 P2 task 可并行
5. **Sprint 4 并行** — 所有 12 个 P3 task 可并行
