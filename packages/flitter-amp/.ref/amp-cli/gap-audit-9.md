# Gap 审计报告 #9: ACP 协议与状态管理

## 审计范围

本报告审计 **ACP 协议与状态管理** 领域的所有组件，包括连接/重连/心跳/类型安全/会话/历史。

### ACP 文件（11 个）

| 模块 | 源码位置 | 用途 |
|------|---------|------|
| FlitterClient | `src/acp/client.ts` | 实现 `acp.Client` 接口，处理 Agent 的 RPC 请求 |
| connection | `src/acp/connection.ts` | 连接建立、sendPrompt、cancelPrompt、closeSession、connectToAgentWithResume |
| types | `src/acp/types.ts` | ACP 类型重导出 + 自定义会话类型 |
| HeartbeatMonitor | `src/acp/heartbeat-monitor.ts` | 周期性 ping 探活、健康状态转换 |
| ReconnectionManager | `src/acp/reconnection-manager.ts` | 指数退避重连 |
| gracefulShutdown | `src/acp/graceful-shutdown.ts` | 有序关闭编排器 |
| pingAgent | `src/acp/ping.ts` | `$/ping` 轻量探活 |
| withTimeout | `src/acp/timeout.ts` | 请求级超时包装 |
| capabilities | `src/acp/capabilities.ts` | Agent 能力检测 |
| shouldAutoReconnect | `src/acp/exit-classifier.ts` | 退出码分类 |
| ActivityTracker | `src/acp/activity-tracker.ts` | 协议活动跟踪、自适应心跳间隔 |

### State 文件（8 个）

| 模块 | 源码位置 | 用途 |
|------|---------|------|
| AppState | `src/state/app-state.ts` | 全局状态 + ClientCallbacks 实现 |
| ConversationState | `src/state/conversation.ts` | 不可变对话快照 + 流式缓冲 |
| SessionStore | `src/state/session-store.ts` | 会话持久化 |
| config | `src/state/config.ts` | CLI 参数解析 |
| PromptHistory | `src/state/history.ts` | 提示历史持久化 |
| OverlayManager | `src/state/overlay-manager.ts` | 模态覆盖层管理 |
| immutable-types | `src/state/immutable-types.ts` | 深度只读类型 |
| connection-state | `src/state/connection-state.ts` | 连接状态机类型 |

### 审计数据源

- Amp 二进制逆向分析: `BINARY-RE-SPEC.md`、`amp-tui-analysis-1.md`、`amp-tui-analysis-13.md`
- 项目级分析文档: `amp-src-analysis-42.md`、`amp-src-analysis-46.md`、`amp-src-analysis-48.md`、`amp-src-analysis-50.md`
- `.gap/` 提案: #49、#50、#51、#52、#53、#54、#57、#58、#59、#60、#61

---

## 审计结论摘要

**ACP 协议与状态管理子系统存在一个 P0 级系统性缺陷和多个 P1/P2 级 Gap。**

核心问题是：`.gap/57`（重连）和 `.gap/58`（心跳）的模块已实现且通过了单元测试，但 **完全未集成到应用主流程**（`index.ts` / `app.ts`）。`ReconnectionManager`、`HeartbeatMonitor`、`ActivityTracker`、`shouldAutoReconnect`、`pingAgent` 均为 **死代码**——从未被 `import` 到运行时执行路径中。Agent 崩溃时，TUI 仅显示错误信息后进入不可交互状态，无自动重连、无健康探测、无连接状态指示。

已正确实现的部分包括：不可变状态模型（Gap #50）、O(1) 工具调用索引（Gap #49）、会话持久化全链路（Gap #54）、提示历史持久化（Gap #53）、`historySize` 配置联通（Gap #52）、`connectToAgentWithResume` 恢复会话（Gap #61）、`gracefulShutdown` 有序关闭（Gap #60）。

---

## Gap 清单

### GAP-9-001: ReconnectionManager / HeartbeatMonitor / ActivityTracker 未集成到运行时
- **优先级**: P0
- **影响范围**: `src/index.ts`, `src/app.ts`, `src/acp/reconnection-manager.ts`, `src/acp/heartbeat-monitor.ts`, `src/acp/activity-tracker.ts`, `src/acp/exit-classifier.ts`, `src/acp/ping.ts`
- **Amp 行为**: Amp 的 Thread Sync Service 使用指数退避重试（`BINARY-RE-SPEC.md` §5.5 "Exponential backoff on failures, Periodic retry"）。Amp 是 self-hosted agent（直接调用 Anthropic API），连接生命周期与 flitter-amp 的子进程模型不同，但 Amp 对 API 请求超时和网络中断有完备的恢复机制。
- **Flitter 现状**: 
  - `ReconnectionManager`（116 行）实现了完整的指数退避重连循环（`baseDelayMs=1000`, `maxDelayMs=30000`, `jitterFactor=0.3`, `maxAttempts=5`），但 **从未被 import 到 `index.ts` 或任何运行时代码**。
  - `HeartbeatMonitor`（234 行）实现了三级健康状态（healthy → degraded → unhealthy）和滑动窗口 RTT 统计，但 **从未被 import 到运行时代码**。
  - `ActivityTracker`（40 行）实现了自适应心跳间隔（活跃期间 3x 基础间隔），但 **从未被使用**。
  - `shouldAutoReconnect` 实现了基于退出码/信号的重连决策逻辑，但 **从未被调用**。
  - `pingAgent` 实现了 `$/ping` JSON-RPC 扩展方法探活，但 **从未被调用**。
  - 当 Agent 子进程崩溃时，`index.ts:168` 的 `handle.agent.onExit` 仅调用 `appState.onConnectionClosed(reason)`，不触发任何重连。
  - `AppState` 拥有完整的连接状态机字段（`ConnectionStatus`、`healthStatus`、`healthMissedBeats`、`healthAvgLatencyMs`），这些字段永远停留在初始值。
- **已有 .gap 引用**: `.gap/57-reconnection-logic.md`（标记 IMPLEMENTED 但实际未集成）, `.gap/58-heartbeat-monitoring.md`（标记 IMPLEMENTED 但实际未集成）
- **运行时证据**: `grep -rn 'HeartbeatMonitor\|ReconnectionManager\|ActivityTracker\|shouldAutoReconnect' src/index.ts src/app.ts` 返回零结果。
- **建议修复方向**:
  1. 在 `index.ts` 的 `handle.agent.onExit` 回调中，调用 `shouldAutoReconnect(code, signal)` 决定是否触发重连
  2. 若决定重连，实例化 `ReconnectionManager` 并调用 `reconnect()`，成功后通过 `LiveHandle` 模式热替换 `handle` 引用
  3. 在 `connectToAgent` 成功后，实例化 `HeartbeatMonitor`，将 `pingAgent(handle.connection)` 作为 `pingFn` 传入
  4. 在 `onSessionUpdate` 回调中调用 `activityTracker.recordActivity()` 抑制活跃期间的无效心跳
  5. 重连成功后插入 `conversation.addSystemMessage('Connection restored')` 分隔符

### GAP-9-002: `ConnectionHandle` 无法热替换（缺少 LiveHandle / 引用间接层）
- **优先级**: P0
- **影响范围**: `src/index.ts`, `src/acp/connection.ts`
- **Amp 行为**: Amp 不使用 ACP 子进程模型（它是 self-contained agent），不存在连接热替换需求。但 `.gap/57` 明确提出 LiveHandle 模式。
- **Flitter 现状**: `index.ts` 中 `handle` 是 `let` 变量（L128 `let handle: ConnectionHandle`），`sendPrompt`、`cancelPrompt` 等函数通过闭包捕获 `handle`。但 `handleSubmit`（L204）、`handleCancel`（L221）闭包在创建时捕获的是 `handle` 的初始值。如果重连后产生新 `ConnectionHandle`，这些闭包仍然持有旧的（已死亡的）连接引用。`.gap/57` 设计的 `LiveHandle` 包装器 — 所有消费者通过 `liveHandle.current` 间接访问 — 完全未实现。
- **已有 .gap 引用**: `.gap/57-reconnection-logic.md`（设计了 LiveHandle 但未实现）
- **建议修复方向**:
  1. 创建 `LiveHandle` 类，内部持有 `current: ConnectionHandle`，提供 `swap(newHandle)` 方法
  2. `handleSubmit`/`handleCancel` 闭包改为通过 `liveHandle.current.connection` 访问
  3. 重连成功后调用 `liveHandle.swap(newHandle)` 使所有消费者透明切换

### GAP-9-003: `session_info_update` 使用 `as unknown as SessionInfoPayload` 类型强转
- **优先级**: P1
- **影响范围**: `src/state/app-state.ts:216`
- **Amp 行为**: Amp 使用自定义扩展字段，但在其自有代码中类型完全对齐（Amp 不使用 ACP SDK，直接控制消息格式）。
- **Flitter 现状**: `app-state.ts` L216 使用 `const info = update as unknown as SessionInfoPayload` 对 SDK 的 `SessionInfoUpdate` 进行双重强转。这绕过了 TypeScript 类型系统的保护，如果 SDK 修改了 `session_info_update` 的结构或字段名，编译期无法检测到不兼容。`.gap/59` 明确将此列为需修复的类型安全问题。
- **已有 .gap 引用**: `.gap/59-acp-type-safety.md`（列出了 `session_info_update` 强转为待修复项）
- **建议修复方向**:
  1. 使用 SDK 的 `SessionInfoUpdate` 类型的 `title` 和 `updatedAt` 字段
  2. 对扩展字段使用运行时类型守卫（`if ('agentName' in update && typeof update.agentName === 'string')`）而非强转
  3. 或提交 PR 到 `@agentclientprotocol/sdk` 扩展 `SessionInfoUpdate` 类型定义

### GAP-9-004: 工具结果解析存在多处 `as unknown as string` 强转
- **优先级**: P1
- **影响范围**: `src/widgets/tool-call/tool-output-utils.ts:83,124,171`
- **Amp 行为**: Amp 对工具结果有严格的类型处理，因其控制完整的工具调用和结果管线。
- **Flitter 现状**: `tool-output-utils.ts` 中有三处 `raw as unknown as string` 强转（L83、L124、L171），用于处理 ACP 协议中可能以 `string` 而非 `object` 形式返回的 `rawOutput`/`rawInput` 字段。这些强转假设运行时类型与预期一致，若 Agent 返回非字符串的 `rawOutput`，会导致 UI 渲染错误但无编译期警告。
- **已有 .gap 引用**: `.gap/59-acp-type-safety.md`（系统性类型安全问题）
- **建议修复方向**:
  1. 在访问 `raw` 前用 `typeof raw === 'string'` 运行时守卫
  2. 对非 `string` 类型调用 `JSON.stringify(raw, null, 2)` 兜底
  3. 统一封装为 `safeRawToString(raw: unknown): string` 工具函数

### GAP-9-005: `onSessionUpdate` 中 `tool_call`/`tool_call_update` 的字段访问使用 `as` 强转
- **优先级**: P1
- **影响范围**: `src/state/app-state.ts:171-189`
- **Amp 行为**: Amp 直接控制协议，类型天然对齐。
- **Flitter 现状**: 
  - L175: `update.kind ?? 'other'` — `kind` 可能不在 SDK `ToolCall` 类型上
  - L176: `update.status ?? 'pending'` — 使用 `??` 默认值，但 `status` 的类型范围可能与 `ToolCallItem['status']` 不匹配
  - L177: `update.locations as Array<{ path: string }> | undefined` — 强转 locations 类型
  - L178: `update.rawInput as Record<string, unknown> | undefined` — 强转 rawInput
  - L186: `(update.status ?? 'completed') as 'completed' | 'failed'` — 窄化强转
  - L187: `update.content as Array<...>` — 强转 content 结构
  - L188: `update.rawOutput as Record<string, unknown> | undefined` — 强转 rawOutput
  - L201: `update.cost as UsageInfo['cost']` — 强转 cost 类型
  这些强转在 SDK 类型与 Agent 实际返回值之间形成了隐式假设，违反了 `.gap/59` 的目标。
- **已有 .gap 引用**: `.gap/59-acp-type-safety.md`
- **建议修复方向**:
  1. 为 SDK 不直接暴露的字段定义 `ExtendedToolCall` 接口，使用交叉类型 `acp.ToolCall & ExtendedToolCall`
  2. 对 `locations`、`rawInput`、`rawOutput`、`content` 使用运行时校验
  3. 对 `status` 字段使用映射函数而非强转

### GAP-9-006: 重连后对话状态无分隔标识
- **优先级**: P1
- **影响范围**: `src/state/conversation.ts`, `src/index.ts`
- **Amp 行为**: Amp 使用 Thread 模型，每次连接创建新 Thread，通过 Thread 列表区分不同会话段。
- **Flitter 现状**: `ConversationState` 已有 `addSystemMessage()` 方法，设计用于插入重连分隔符。但由于 GAP-9-001 导致重连从未实际发生，该方法仅在测试中使用。当 Agent 崩溃后用户手动重启应用时，无法区分哪些消息属于旧会话、哪些属于新会话。
- **已有 .gap 引用**: `.gap/57-reconnection-logic.md`（设计了 SystemMessage 分隔符，代码已实现但未集成）
- **建议修复方向**: 在 GAP-9-001 修复后，重连成功时调用 `conversation.addSystemMessage('--- Connection restored ---')`

### GAP-9-007: 健康状态 UI 指示不存在
- **优先级**: P1
- **影响范围**: `src/widgets/status-bar.ts`, `src/widgets/header-bar.ts`
- **Amp 行为**: Amp 在状态栏显示模型名称、使用量等信息，对网络状态无显式指示（因 Amp 是 API 调用模型，每次请求独立）。
- **Flitter 现状**: `AppState` 已声明 `healthStatus: HealthStatus`、`healthMissedBeats: number`、`healthAvgLatencyMs: number | null` 字段，以及 `setHealthDegraded()` 和 `clearHealthWarning()` 方法。但由于 `HeartbeatMonitor` 从未启动，这些字段永远停留在初始值（`'unknown'`, `0`, `null`）。TUI 的 `HeaderBar` 和 `StatusBar` 均未读取或渲染这些健康状态字段。即使 `HeartbeatMonitor` 被集成，状态栏也缺少对应的渲染逻辑。
- **已有 .gap 引用**: `.gap/58-heartbeat-monitoring.md`（设计了 TUI 健康指示器，但 Widget 侧未实现）
- **建议修复方向**:
  1. 在 `StatusBar` 或 `HeaderBar` 中读取 `appState.healthStatus`
  2. 在 `degraded` 时显示 ⚠️ 或黄色指示器
  3. 在 `unhealthy` 时显示 ❌ 或红色指示器 + 重连倒计时

### GAP-9-008: `capabilities.ts` 使用 `as Record<string, unknown>` 访问 Agent 能力对象
- **优先级**: P2
- **影响范围**: `src/acp/capabilities.ts:17-19`
- **Amp 行为**: Amp 不使用 ACP SDK，直接在自有代码中定义 capability 结构。
- **Flitter 现状**: `hasSessionCapability()` 函数将 `acp.AgentCapabilities` 强转为 `Record<string, unknown>` 以访问 `session` 子对象，再进一步强转以读取具体能力标志。这是因为 SDK 的 `AgentCapabilities` 类型定义可能不包含 `session.close` 等扩展字段。
- **已有 .gap 引用**: `.gap/59-acp-type-safety.md`
- **建议修复方向**:
  1. 定义 `ExtendedAgentCapabilities` 接口，显式声明 `session?: { close?: boolean; load?: boolean }`
  2. 在 `connectToAgent` 返回时用运行时守卫验证能力结构
  3. 用具体类型替代 `Record<string, unknown>` 中间转换

### GAP-9-009: `shortcut-help-overlay.ts` / `command-palette.ts` 使用 `'rounded' as any` 边框样式
- **优先级**: P2
- **影响范围**: `src/widgets/shortcut-help-overlay.ts:161`, `src/widgets/command-palette.ts:121`
- **Amp 行为**: Amp 的 Dialog 使用 `jJH` 自定义 RenderObject 实现圆角边框。
- **Flitter 现状**: 两处使用 `style: 'rounded' as any` 传递边框样式。这意味着 flitter-core 的 `Container`/`BoxDecoration` 的 `style` 类型定义不包含 `'rounded'` 字面量。要么 `'rounded'` 是运行时支持但类型未声明的值，要么是无效值被 `as any` 掩盖了类型错误。
- **已有 .gap 引用**: `.gap/59-acp-type-safety.md`（系统性 `any` 消除）
- **建议修复方向**: 检查 flitter-core 是否实际支持 `'rounded'` 边框样式，若支持则更新类型定义；若不支持则移除无效的 `style` 属性

### GAP-9-010: `connectToAgentWithResume` 缺少对 Agent 端 Session 不存在的降级 UI 通知
- **优先级**: P2
- **影响范围**: `src/acp/connection.ts:205-282`, `src/index.ts:130-151`
- **Amp 行为**: Amp 的 `--resume` / `--continue` 在线程不存在时会打印明确的错误信息或静默创建新线程。
- **Flitter 现状**: `connectToAgentWithResume` 在 `loadSession` 失败时会 fallback 到 `newSession`，并通过 `log.warn` 记录日志。但 TUI 端 (`index.ts` L130-151) 在 fallback 发生后：
  - 仍然调用 `sessionStore.load(resumeSessionId)` 恢复本地会话状态（L139-143），但此时 Agent 端是全新 session，本地恢复的对话记录与 Agent 的上下文不同步
  - 用户无任何可见提示表明 resume 失败、当前实际为新会话
  - 用户可能继续发消息，误以为 Agent 仍保有之前的对话上下文
- **已有 .gap 引用**: `.gap/61-load-session.md`（提到了 fallback 语义但未讨论 UI 通知）
- **建议修复方向**:
  1. 在 `connectToAgentWithResume` 返回值中添加 `resumed: boolean` 标志
  2. 若 `resumed === false`，在 TUI 中显示 `SystemMessage('Session resume failed — starting new session')`
  3. 若 `resumed === false`，不调用 `appState.restoreFromSession(savedSession)` 以避免本地/远端状态不同步

### GAP-9-011: Agent 退出监控无法触发优雅降级（仅设置错误状态）
- **优先级**: P2
- **影响范围**: `src/index.ts:168-174`
- **Amp 行为**: Amp 不使用 ACP 子进程，不存在此问题。
- **Flitter 现状**: `handle.agent.onExit` 回调（L168-174）仅调用 `appState.onConnectionClosed(reason)`，后者设置 `error` 字段并通知 UI。此后：
  - `handleSubmit` 仍会尝试调用 `sendPrompt(handle.connection, ...)`，必然失败
  - `handleCancel` 在非 `isProcessing` 时会触发 `shutdown()` → `gracefulShutdown`，但此时 `handle.agent` 已退出，`gracefulShutdown` 的 Phase 4 (kill agent) 会尝试 kill 已死进程
  - 用户在错误状态下输入文字并提交会产生新的错误弹出，UX 混乱
- **已有 .gap 引用**: `.gap/57-reconnection-logic.md`（设计了完整的退出→分类→重连链路，但未集成）
- **建议修复方向**:
  1. 在 `onExit` 回调中调用 `shouldAutoReconnect(code, signal)` 判断
  2. 若可重连：设置 `connectionPhase = 'reconnecting'`，启动 `ReconnectionManager`
  3. 若不可重连：设置 `connectionPhase = 'disconnected'`，禁用输入提交
  4. 在 `handleSubmit` 开头检查 `connectionPhase !== 'connected'` 并 early return

### GAP-9-012: `SessionStore` 缺少并发写入保护
- **优先级**: P2
- **影响范围**: `src/state/session-store.ts`
- **Amp 行为**: Amp 的配置持久化使用原子写入（temp + rename）模式（`BINARY-RE-SPEC.md` §5.9 "JSON files with atomic write (temp + rename)"）。
- **Flitter 现状**: `SessionStore.save()` 使用 `Bun.write()` 或 `fs.writeFileSync()` 直接写入目标文件。在以下场景可能产生竞态：
  - `handleSubmit` 完成后触发 `saveSession()`（L212）
  - 同时 SIGINT handler 触发 `gracefulShutdown` → `saveSession()`（L180-185）
  - 两次写入同一文件可能产生损坏的 JSON
  此外，`SessionStore.prune()` 删除过期文件时不做锁保护。
- **已有 .gap 引用**: 无
- **建议修复方向**:
  1. 使用原子写入模式：先写临时文件，再 `rename` 到目标路径
  2. 在 `SessionStore` 内部添加 `_writing: boolean` 防重入标志
  3. 或使用 `Bun.write` 的同步变体确保写入顺序

### GAP-9-013: `PromptHistory` 的 `encode`/`decode` 状态机缺少对极端输入的边界处理
- **优先级**: P2
- **影响范围**: `src/state/history.ts`
- **Amp 行为**: Amp 使用 Thread Sync Service 进行服务端持久化，不在本地做自定义序列化。
- **Flitter 现状**: `history.ts` 的 `encode()`/`decode()` 使用自定义状态机处理多行历史条目（`\n` → `\\n`，`\\` → `\\\\`）。手动实现的编解码器存在以下风险：
  - 空字符串条目编码后为空行，`decode` 时会被丢弃（`if (entry) result.push(entry)` 过滤了空串）
  - 文件末尾缺少换行符时，`decode` 的状态机可能丢失最后一条记录
  - 未测试包含 `\r\n`（Windows 换行）的输入
  这些不影响正常使用，但在 edge case 下可能丢失历史条目。
- **已有 .gap 引用**: `.gap/53-history-persistence.md`（设计了 encode/decode 但未讨论边界情况）
- **建议修复方向**:
  1. 添加对空字符串条目的保留逻辑
  2. 确保 `decode` 状态机在文件末尾无换行时正确 flush 最后条目
  3. 添加 `\r` 字符的转义处理

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 |
|-----------|------|------|-------------|
| `.gap/49-tool-call-index.md` | O(1) 工具调用索引 | ✅ 已实现 | ❌ 可关闭 — `_toolCallIndex` Map 已正确集成到 ConversationState 的所有工具调用操作中 |
| `.gap/50-state-immutability.md` | 不可变状态模型 | ✅ 已实现 | ❌ 可关闭 — ConversationSnapshot + Object.freeze + 版本计数器 + 结构共享全部到位 |
| `.gap/51-prompt-history-fix.md` | TextEditingController 提升 | ✅ 已实现 | ❌ 可关闭 — `app.ts` 中 `inputController` 已提升到 `AppStateWidget` 层并传递给 `BottomGrid`/`InputArea` |
| `.gap/52-history-size-wiring.md` | historySize 配置联通 | ✅ 已实现 | ❌ 可关闭 — `config.ts` 解析 `historySize`，`index.ts` 传递给 `startTUI`，`app.ts` 传递给 `PromptHistory` |
| `.gap/53-history-persistence.md` | 历史持久化 | ✅ 已实现 | ⚠️ 大部分可关闭，GAP-9-013 记录了 encode/decode 边界问题 |
| `.gap/54-session-persistence.md` | 会话持久化 | ✅ 已实现 | ⚠️ 大部分可关闭，GAP-9-012 记录了并发写入风险 |
| `.gap/57-reconnection-logic.md` | 重连逻辑 | ⚠️ 模块已实现，**未集成** | ✅ 仍然有效 — GAP-9-001 和 GAP-9-002 记录了核心集成缺失 |
| `.gap/58-heartbeat-monitoring.md` | 心跳监控 | ⚠️ 模块已实现，**未集成** | ✅ 仍然有效 — GAP-9-001 和 GAP-9-007 记录了集成缺失和 UI 缺失 |
| `.gap/59-acp-type-safety.md` | ACP 类型安全 | ⚠️ 部分解决 | ✅ 仍然有效 — GAP-9-003/004/005/008/009 记录了剩余的类型强转问题 |
| `.gap/60-graceful-session-close.md` | 优雅关闭 | ✅ 已实现已集成 | ❌ 可关闭 — `gracefulShutdown` 在 `index.ts` 的 SIGINT/SIGTERM handler 中正确调用 |
| `.gap/61-load-session.md` | 加载会话 | ✅ 已实现已集成 | ⚠️ 大部分可关闭，GAP-9-010 记录了 fallback 时 UI 通知和状态同步问题 |

---

## 完整性对照表

| 特性 | Amp | Flitter | 差异 | 对应 GAP |
|------|-----|---------|------|---------|
| ACP ndJsonStream 传输 | ✅ stdio 管道 | ✅ 完全一致 | 🟢 等价 | — |
| `ClientSideConnection` 初始化 | ✅ | ✅ 含 30s 超时 | 🟡 flitter 超集（Amp 无超时） | — |
| `FlitterClient implements acp.Client` | — | ✅ 直接实现 | 🟢 类型安全 | — |
| `sendPrompt` 超时 | 无 | ✅ 5 分钟 | 🟡 flitter 超集 | — |
| `cancelPrompt` 超时 | 无 | ✅ 10 秒 | 🟡 flitter 超集 | — |
| Agent 崩溃后自动重连 | N/A | ❌ 模块存在但未集成 | 🔴 死代码 | GAP-9-001 |
| 连接健康探测 | N/A | ❌ 模块存在但未集成 | 🔴 死代码 | GAP-9-001 |
| 连接状态机（UI 展示） | N/A | ❌ 字段存在但未渲染 | 🔴 缺失 | GAP-9-007 |
| LiveHandle 热替换 | N/A | ❌ 未实现 | 🔴 缺失 | GAP-9-002 |
| 退出码分类决策 | N/A | ❌ 函数存在但未调用 | 🔴 死代码 | GAP-9-001 |
| 活动跟踪自适应心跳 | N/A | ❌ 类存在但未实例化 | 🔴 死代码 | GAP-9-001 |
| `closeSession` RPC | ✅ capability detection | ✅ 完全一致 | 🟢 等价 | — |
| 优雅关闭编排器 | — | ✅ 8s deadline + 5 phase | 🟡 flitter 超集 | — |
| `session_info_update` 处理 | 自有类型 | ⚠️ `as unknown as` 强转 | 🟡 功能正确但类型不安全 | GAP-9-003 |
| `tool_call` 字段访问 | 自有类型 | ⚠️ 多处 `as` 强转 | 🟡 功能正确但类型不安全 | GAP-9-005 |
| 不可变对话快照 | 非不可变 | ✅ Object.freeze + 版本计数 | 🟡 flitter 超集 | — |
| O(1) 工具调用索引 | 非 O(1) | ✅ Map<string, index> | 🟡 flitter 超集 | — |
| 结构共享 | 无 | ✅ replaceAt/append helpers | 🟡 flitter 超集 | — |
| 流式缓冲合并 | 无 | ✅ streaming buffer + flush | 🟡 flitter 超集 | — |
| 会话持久化 | 服务端 Thread Sync | ✅ 本地 JSON 文件 | 🟡 不同方案，均可用 | GAP-9-012 (原子写入) |
| 会话恢复 (`--resume`) | `--resume <id>` | ✅ `--resume` + `connectToAgentWithResume` | 🟢 等价 | GAP-9-010 (fallback UI) |
| 会话列表 (`--list-sessions`) | `threads list` | ✅ `--list-sessions` | 🟢 等价 | — |
| 会话导出 (`--export`) | `threads markdown` | ✅ `--export md\|txt\|json` | 🟡 flitter 超集（多格式） | — |
| 提示历史持久化 | 服务端同步 | ✅ 本地文件 + append-on-push | 🟡 不同方案 | GAP-9-013 (边界) |
| `historySize` 配置 | 固定 | ✅ CLI `--history-size` | 🟡 flitter 超集 | — |
| 增量历史搜索 (Ctrl+R) | ✅ | ✅ searchBackward/searchForward | 🟢 等价 | — |
| 工具结果类型安全 | 自有类型 | ⚠️ `as unknown as string` 强转 | 🟡 功能正确但类型不安全 | GAP-9-004 |
| 权限请求流程 | Promise-based | ✅ Promise-based 完全一致 | 🟢 等价 | — |
| 终端管理 (create/output/kill/release) | ✅ | ✅ 完全一致 | 🟢 等价 | — |
| 终端输出字节限制 | ✅ | ✅ UTF-8 安全截断 (safeUtf8Slice) | 🟡 flitter 超集（Amp 用字符截断） | — |

---

## 优先级总结

| 优先级 | GAP 数量 | GAP 编号 |
|--------|---------|---------|
| P0 | 2 | GAP-9-001, GAP-9-002 |
| P1 | 5 | GAP-9-003, GAP-9-004, GAP-9-005, GAP-9-006, GAP-9-007 |
| P2 | 6 | GAP-9-008, GAP-9-009, GAP-9-010, GAP-9-011, GAP-9-012, GAP-9-013 |

**核心风险**：两个 P0 项（GAP-9-001 + GAP-9-002）表明 `.gap/57` 和 `.gap/58` 虽然在模块级别已完成实现并通过了单元测试（`gap-57-58.test.ts`），但从未被集成到应用运行时。这意味着 flitter-amp 在 Agent 子进程崩溃时会进入不可恢复的错误状态，用户必须手动重启应用。修复 P0 后，P1 项集中在类型安全消毒（GAP-9-003/004/005），是 `.gap/59` 的具体落地工作。P2 项为增强型改进和 edge case 防御。
