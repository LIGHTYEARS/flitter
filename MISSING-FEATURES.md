# flitter-cli Missing Features vs AMP

> 基于 FEATURE-AUDIT.md (42 特性) 和 FIDELITY-REPORT.md (实体验证)
> Visual Fidelity 审计: 基于 `tmux-capture/screens/` golden 文件 + AMP 逆向源码 (2026-04-06)
> 状态: **34/42 特性缺失或部分实现 + 42 个 Visual Fidelity 差异 (12 Critical / 17 Major / 13 Minor)**

---

## 摘要

| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ 完整实现 | 8 | 19% |
| ⚠️ 部分实现 | 7 | 17% |
| ❌ 完全缺失 | 28 | 67% |
| **总计** | **43** | **100%** |

---

## 一、P1-HIGH 优先级 (6 个核心特性)

**这些是必须优先修复的架构级和核心 UX 缺口**

---

### 1. Thread switching + creation/deletion

| 维度 | 详情 |
|------|------|
| **分类** | Thread Management |
| **AMP 证据** | `switchThread`: 9 occ, `createThread`: 18 occ, `deleteThread`: 5 occ |
| **现状评分** | **3/100** |
| **等级** | F |

#### AMP 实现

AMP 使用真正的 **ThreadPool 架构**:

```javascript
// AMP 核心数据结构
threadHandleMap = new Map;      // Map<ThreadID, ThreadHandle>
activeThreadContextID = null;   // 只是一个"指针"
threadBackStack = [];            // 导航历史

// 核心操作
switchThread(id)     → 只改变 activeThreadContextID 指针
createThread()       → 新 UUID + 新 ThreadHandle，保留旧线程
deleteThread(id)     → 从 Map 中移除
```

每个 `ThreadHandle` 包含:
- 独立的消息数组
- 独立的 worker 状态
- 独立的 `queuedMessages[]`
- 独立的 `handoffState`

#### flitter-cli 现状

**单 Session 重置设计，不是真正的多线程**:

```typescript
// session.ts:390
newThread(): void {
  this._items = [];           // 只是清空消息！
  this._plan = [];
  this._usage = null;
  // sessionId 永远不变！
}
```

**死代码发现**:
- `packages/flitter-cli/src/widgets/thread-list.ts` (194 行完整组件)
- 有 `onSelect: (sessionId: string) => void` 接口
- 有高亮当前会话、时间戳、消息计数等 UI
- **但是**: `grep -r "import.*ThreadList\|new ThreadList" src/` → **零结果**
- 从未被导入，从未被实例化，从未被渲染

#### 缺口详情

| 缺失项 | AMP | flitter-cli |
|--------|-----|-------------|
| `threadHandleMap` | ✅ Map<ThreadID, ThreadHandle> | ❌ 无 |
| `activeThreadContextID` | ✅ 指针，可切换 | ❌ 无，sessionId 固定 |
| `switchThread()` | ✅ 只改变指针 | ❌ 无 |
| `createThread()` | ✅ 新 UUID + 保留历史 | ❌ `newThread()` 只是清空 |
| `deleteThread()` | ✅ 从 Map 移除 | ❌ 无 |
| ThreadList 集成 | ✅ 可切换 | ❌ 死代码，零调用 |

#### 影响的特性

由于底层是单 Session 架构，以下特性都无法真正实现:
- Thread back/forward navigation
- Thread mentions (`@@`)
- Handoff from parent thread
- Queue mode (每个线程有独立 `queuedMessages[]`)

---

### 2. Handoff mode (full controller)

| 维度 | 详情 |
|------|------|
| **分类** | Handoff Mode |
| **AMP 证据** | `handoff`: 214 occ, `handoffState`: 38 occ, `handoffController`: 23 occ |
| **现状评分** | **4/100** |
| **等级** | F |

#### AMP 实现

AMP 有完整的 **Handoff 状态机**:

```javascript
// 核心状态
handoffState = {
  isInHandoffMode: boolean,
  countdownSeconds: number,      // 自动提交倒计时
  sourceThreadID: string,        // 来源线程
  targetThreadID: string,        // 目标线程
  handoffToolCallID: string,
}

// 核心操作
enterHandoffMode()
exitHandoffMode()
submitHandoff()
abortHandoffConfirmation()
```

UI 显示:
- "Auto-submitting in N..." 倒计时文本
- 可取消倒计时

#### flitter-cli 现状

**只有 UI 渲染，无状态机**:

现有实现:
- `handoff-tool.ts`: StatefulWidget 渲染 handoff tool call
- 700ms blink 动画 (`setInterval`)
- "Waiting for handoff" 文本
- theme 颜色定义: `handoffMode`, `handoffModeDim`

**完全缺失**:
- `isInHandoffMode` 状态
- `handoffController`
- `enterHandoffMode()` / `exitHandoffMode()`
- `countdownSeconds` 倒计时
- `sourceThreadID` / `targetThreadID` (需要多线程架构)

#### 缺口详情

| 缺失项 | AMP | flitter-cli |
|--------|-----|-------------|
| `handoffState` 数据结构 | ✅ | ❌ |
| `enterHandoffMode()` | ✅ | ❌ |
| `exitHandoffMode()` | ✅ | ❌ |
| `countdownSeconds` 倒计时 | ✅ | ❌ |
| "Auto-submitting in N..." UI | ✅ | ❌ |
| 跨线程 handoff | ✅ `sourceThreadID` | ❌ 单 Session |

---

### 3. Queue mode (full message queue)

| 维度 | 详情 |
|------|------|
| **分类** | Queue Mode |
| **AMP 证据** | `queuedMessage`: 88 occ, `isInQueueMode`: 11 occ, `submitQueue`: 9 occ |
| **现状评分** | **1/100** |
| **等级** | F |

#### AMP 实现

```javascript
// 核心数据结构
queuedMessages = Message[];    // 排队的消息
isInQueueMode = boolean;

// 核心操作
enterQueueMode()
exitQueueMode()
submitQueue()           // 提交所有排队消息
interruptQueue()        // 中断排队
clearQueue()            // 清空队列
```

事件处理:
- `user:message-queue:enqueue` - 消息入队
- `user:message-queue:dequeue` - 消息出队 (自动)

#### flitter-cli 现状

**只有颜色定义，无任何逻辑**:

```typescript
// theme-data.ts 中唯一定义
queueMode: Color;

// grep "queuedMessage\|enterQueueMode" src/ → 零结果
```

#### 缺口详情

| 缺失项 | AMP | flitter-cli |
|--------|-----|-------------|
| `queuedMessages[]` 数组 | ✅ | ❌ |
| `isInQueueMode` 状态 | ✅ | ❌ |
| `enterQueueMode()` | ✅ | ❌ |
| `exitQueueMode()` | ✅ | ❌ |
| `submitQueue()` | ✅ | ❌ |
| `interruptQueue()` | ✅ | ❌ |
| `user:message-queue:*` 事件 | ✅ | ❌ |

---

### 4. Queue dequeue on completion

| 维度 | 详情 |
|------|------|
| **分类** | Queue Mode |
| **AMP 证据** | `user:message-queue:dequeue` 事件处理 |
| **现状评分** | **0/100** |
| **等级** | F |

#### AMP 实现

**自动出队状态机**:

当当前 turn 完成时 (`stop_reason` = `"end_turn"` 或 `"tool_use"`):
1. 检查 `queuedMessages.length > 0`
2. 自动 `dequeue` 下一条消息
3. 继续处理

这是 **事件驱动架构** 的一部分，依赖 WebSocket 事件流。

#### flitter-cli 现状

**HTTP 单次请求/响应架构，无法支持**:

- flitter-cli 使用 HTTP 单次请求 (`chat completions`)
- 没有 WebSocket 事件流
- 没有 `message-queue` 事件处理

#### 缺口详情

| 缺失项 | AMP | flitter-cli |
|--------|-----|-------------|
| 自动出队状态机 | ✅ | ❌ |
| WebSocket 事件流 | ✅ | ❌ HTTP 单次 |
| `stop_reason` 条件判断 | ✅ | ❌ |

---

### 5. Compaction system

| 维度 | 详情 |
|------|------|
| **分类** | Context Window |
| **AMP 证据** | `compaction`: 32 occ, `compactionState`: 7 occ, `compactionThresholdPercent` |
| **现状评分** | **0/100** |
| **等级** | F |

#### AMP 实现

**自动上下文压缩系统**:

```javascript
// 配置
compactionThresholdPercent = 80;  // 超过 80% 触发

// 状态
compactionState = {
  isCompacting: boolean,
  cutMessageId: string,        // 从哪条消息开始压缩
  compactionStartedAt: number,
}

// 事件
compaction_started
compaction_complete
```

工作流程:
1. 监控 `contextWindowUsagePercent`
2. 超过阈值 → 触发 `compaction_started`
3. 调用 API 压缩历史消息
4. 完成 → `compaction_complete`，更新消息列表

#### flitter-cli 现状

**完全缺失**:

- 有 `contextWindowUsagePercent` 计算
- 有 80%/90%/95% 警告阈值
- **但没有任何压缩逻辑**

#### 缺口详情

| 缺失项 | AMP | flitter-cli |
|--------|-----|-------------|
| `compactionThresholdPercent` 配置 | ✅ | ❌ |
| `compactionState` 状态 | ✅ | ❌ |
| `cutMessageId` 追踪 | ✅ | ❌ |
| `compaction_started` 事件 | ✅ | ❌ |
| `compaction_complete` 事件 | ✅ | ❌ |
| API 压缩调用 | ✅ | ❌ |

---

### 6. Image paste/attachment input

| 维度 | 详情 |
|------|------|
| **分类** | Image Support |
| **AMP 证据** | `imageAttachments`, `isUploadingImageAttachments`, `popImage` |
| **现状评分** | **15/100** |
| **等级** | D |

#### AMP 实现

**完整的图片粘贴/上传流程**:

```javascript
// 数据结构
imageAttachments = ImageAttachment[];
isUploadingImageAttachments = boolean;

// 操作
paste handler           // Ctrl+V 粘贴图片
popImage()              // Backspace 删除最后一张
upload spinner          // 上传中动画
```

UI 显示:
- `[image]` badge 显示已附加图片数量
- 上传中 spinner

#### flitter-cli 现状

**只有数据模型，无交互逻辑**:

现有实现 (测试可见):
- `images[]` 数组在 `UserMessage` 上
- `[image]` badge 渲染

**完全缺失**:
- Paste handler (Ctrl+V 处理)
- `isUploadingImageAttachments` spinner
- `popImage()` (Backspace 删除)
- 上传进度显示

#### 缺口详情

| 缺失项 | AMP | flitter-cli |
|--------|-----|-------------|
| Paste handler (Ctrl+V) | ✅ | ❌ |
| `isUploadingImageAttachments` | ✅ | ❌ |
| `popImage()` (Backspace 删除) | ✅ | ❌ |
| 上传 spinner | ✅ | ❌ |
| `ImageAttachment` 完整结构 | ✅ | ⚠️ 部分 |

---

## 二、P2-MED 优先级 (25 个重要特性)

---

### 7. Thread back/forward navigation

| 维度 | 详情 |
|------|------|
| **分类** | Thread Management |
| **AMP 证据** | `threadBackStack`: 14 occ, `threadForwardStack`: 14 occ, `navigateBack`: 16 occ |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 浏览器风格历史栈
- `canNavigateBack()` / `canNavigateForward()`
- `recordNavigation()` 记录导航

**flitter-cli 现状**: 完全缺失。需要先有真正的 ThreadPool 架构。

---

### 8. Thread title generation

| 维度 | 详情 |
|------|------|
| **分类** | Thread Management |
| **AMP 证据** | `titleGeneration`: 13 occ, `threadTitle`: 51 occ, `skipTitleGeneration` |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 自动从对话内容生成标题
- `AbortController` 可取消
- API 调用生成

**flitter-cli 现状**: 完全缺失。

---

### 9. Thread preview (split-view)

| 维度 | 详情 |
|------|------|
| **分类** | Thread Management |
| **AMP 证据** | `previewThread`: 12 occ, `threadPreview`: 15 occ, `previewMessage`: 2 occ |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 切换前预览线程内容
- 独立 scroll controller
- inline 显示

**flitter-cli 现状**: 完全缺失。

---

### 10. Thread worker pool

| 维度 | 详情 |
|------|------|
| **分类** | Thread Management |
| **AMP 证据** | `threadWorker`: 50 occ, `threadWorkerMap`, `workersByThreadID` |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 每个线程有独立 worker
- worker 状态机管理
- 并发线程执行

**flitter-cli 现状**: 单 Session 架构，无 worker pool。

---

### 11. Handoff countdown timer

| 维度 | 详情 |
|------|------|
| **分类** | Handoff Mode |
| **AMP 证据** | `countdownSeconds`, "Auto-submitting in N..." UI |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 倒计时自动提交
- 可取消倒计时
- UI 显示剩余时间

**flitter-cli 现状**: 无。

---

### 12. Deep reasoning effort levels (tri-state)

| 维度 | 详情 |
|------|------|
| **分类** | Deep Reasoning |
| **AMP 证据** | `deepReasoningEffort`: 31 occ, values: `"medium"|"high"|"xhigh"` |
| **评分** | 30/100 |
| **等级** | D |

#### AMP 实现

**三态枚举**:
```javascript
deepReasoningEffort = "medium" | "high" | "xhigh"
```

UI 显示:
- `[extended]` 或类似指示器
- 可通过快捷键切换

#### flitter-cli 现状

**只有布尔值**:

```typescript
// reasoning-toggle.ts
formatReasoningToggle(active: boolean): string {
  return active ? '[extended]' : '[normal]';  // 只有两态！
}

// AppState
deepReasoningActive: boolean;  // 布尔值，不是枚举
```

#### 缺口

| 缺失项 | AMP | flitter-cli |
|--------|-----|-------------|
| `deepReasoningEffort` 枚举 | ✅ `medium\|high\|xhigh` | ❌ 只有 `boolean` |
| 三态切换逻辑 | ✅ | ❌ |

---

### 13. Provider-specific speed settings

| 维度 | 详情 |
|------|------|
| **分类** | Deep Reasoning |
| **AMP 证据** | `anthropicSpeed`: 10 occ, `openAISpeed`: 10 occ |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- `"standard"` / `"fast"` 速度切换
- `+fast(6x$)` 后缀显示成本差异
- 按 provider 独立设置

**flitter-cli 现状**: 无。

---

### 14. Kitty graphics protocol

| 维度 | 详情 |
|------|------|
| **分类** | Image Support |
| **AMP 证据** | `kittyGraphics`: 8 occ, `supportsKittyGraphics()`, `transmitImage` |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- Kitty 终端原生图片渲染协议
- `transmitImage()` 发送图片数据
- `imageId` 追踪

**flitter-cli 现状**: 无。

---

### 15. Image preview overlay

| 维度 | 详情 |
|------|------|
| **分类** | Image Support |
| **AMP 证据** | `ImagePreview`: 57 occ, `onShowImagePreview` |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 全屏图片预览覆盖层
- 保存对话框
- `ImageInheritedWidget` 状态传递

**flitter-cli 现状**: 无。

---

### 16. Context detail overlay

| 维度 | 详情 |
|------|------|
| **分类** | Context Window |
| **AMP 证据** | `contextDetail`: 8 occ, `isShowingContextDetailOverlay` |
| **评分** | 40/100 |
| **等级** | D |

**AMP 实现**:
- 点击 context % 打开详情
- Token breakdown UI
- 各部分占比显示

**flitter-cli 现状**:
- 有 `contextWindowUsagePercent` 计算
- 有基础警告
- **无 detail overlay**

---

### 17. Additional providers (8 missing)

| 维度 | 详情 |
|------|------|
| **分类** | Provider System |
| **AMP 证据** | 10 providers total |
| **评分** | 70/100 |
| **等级** | B |

**AMP providers (10)**:
1. ANTHROPIC
2. OPENAI
3. XAI
4. CEREBRAS
5. FIREWORKS
6. GROQ
7. MOONSHOT
8. OPENROUTER
9. VERTEXAI
10. BASENTEN

**flitter-cli providers (7)**:
1. anthropic ✅
2. openai ✅
3. chatgpt-codex
4. copilot
5. gemini
6. antigravity
7. openai-compatible

**缺失 (8)**:
- xai
- cerebras
- fireworks
- groq
- moonshot
- openrouter
- vertex
- baseten

---

### 18. Model catalog

| 维度 | 详情 |
|------|------|
| **分类** | Provider System |
| **AMP 证据** | ~40+ model definitions |
| **评分** | 10/100 |
| **等级** | F |

**AMP 实现**:
每个模型有完整元数据:
```javascript
{
  id: string,
  contextWindow: number,
  maxOutputTokens: number,
  pricing: { input, output, cacheRead, cacheWrite },
  capabilities: { thinking, interleavedThinking, fileInput, vision },
  reasoningEffort: supported?,
  uiHints: { labelAnimation, colors }
}
```

包括:
- GPT-5.4
- Kimi K2
- Qwen3 Coder 480B
- GLM 4.6
- 等等...

**flitter-cli 现状**:
- 只有 `DEFAULT_MODELS` provider→defaultModel 映射
- 无任何元数据

---

### 19. Provider config service

| 维度 | 详情 |
|------|------|
| **分类** | Provider System |
| **AMP 证据** | `configService`: 68 occ, `ProviderConfig`: 16 occ |
| **评分** | 15/100 |
| **等级** | F |

**AMP 实现**:
分层配置:
```javascript
configService.get("anthropic.effort")
configService.get("anthropic.interleavedThinking")
configService.get("openai.speed")
configService.get("internal.compactionThresholdPercent")
```

- Zod schema 验证
- 类型安全
- 默认值 + 用户覆盖

**flitter-cli 现状**:
- 只有基础 key-value config
- 无分层结构
- 无 schema 验证

---

### 20. Thread mentions (@@)

| 维度 | 详情 |
|------|------|
| **分类** | Mention System |
| **AMP 证据** | `ThreadMention`: 10 occ, `insertThreadMention` |
| **评分** | 20/100 |
| **等级** | F |

**AMP 实现**:
- 输入 `@@` 打开线程选择器
- 引用另一个线程的内容
- `paletteOnThreadMentionSelected` 回调

**flitter-cli 现状**:
- InputArea props 定义了 `onSpecialCommandTrigger`
- **零实现**
- 无 thread picker UI

---

### 21. Edit previous message (Up arrow)

| 维度 | 详情 |
|------|------|
| **分类** | Message Navigation |
| **AMP 证据** | `editingMessageOrdinal`, `isEditingPreviousMessage`, `editingController` |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- Up arrow 编辑上一条用户消息
- in-place 编辑
- `client_edit_message` 协议支持

**flitter-cli 现状**: 无。

---

### 22. Shell mode ($ and $$)

| 维度 | 详情 |
|------|------|
| **分类** | Shell Mode |
| **AMP 证据** | `shellMode`: 8 occ, `shellModeHidden`: 2 occ |
| **评分** | 40/100 |
| **等级** | D |

**AMP 实现**:
- `$` 前缀: foreground shell
- `$$` 前缀: background shell
- `bashInvocations` 数组显示运行中命令
- incognito 模式

**flitter-cli 现状**:
- `detectShellMode()` 检测 `$$` 前缀
- theme 颜色: `shellMode`, `shellModeHidden`
- **无 bash invocation list**
- **无 shell mode status bar**

---

### 23. Bash invocation display

| 维度 | 详情 |
|------|------|
| **分类** | Shell Mode |
| **AMP 证据** | `bashInvocations`, `pendingBashInvocations` Map |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 显示运行中 bash 命令列表
- show/hide timer
- `BJR` (BashInvocationsWidget)

**flitter-cli 现状**: 无。

---

### 24. Confirmation overlay

| 维度 | 详情 |
|------|------|
| **分类** | UI Overlays |
| **AMP 证据** | `confirmationOverlay`: 11 occ |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 通用 yes/no 确认对话框
- 场景: exit, clear input, cancel processing

**flitter-cli 现状**:
- Overlay IDs 定义
- **无 ConfirmationDialog widget**

---

### 25. Context analyze modal

| 维度 | 详情 |
|------|------|
| **分类** | UI Overlays |
| **AMP 证据** | `contextAnalyze`: 28 occ, `contextAnalyzeModal`: 11 occ |
| **评分** | 10/100 |
| **等级** | F |

**AMP 实现**:
- context window token breakdown
- `contextAnalyzeDeps` 依赖分析

**flitter-cli 现状**:
- 只有百分比计算
- 无 modal

---

### 26. File changes overlay

| 维度 | 详情 |
|------|------|
| **分类** | UI Overlays |
| **AMP 证据** | `isShowingFileChangesOverlay`, `fileChangesClick` |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 显示当前 session 修改的所有文件
- `fileChangesClick` 交互

**flitter-cli 现状**: 无。

---

### 27. Toast notifications

| 维度 | 详情 |
|------|------|
| **分类** | UI Overlays |
| **AMP 证据** | `toastController`: 11 occ, `showToast`: 3 occ |
| **评分** | 20/100 |
| **等级** | F |

**AMP 实现**:
- 短暂通知消息 (e.g., "Use /ide to connect")
- `toastController` 管理
- auto-dismiss timer

**flitter-cli 现状**:
- Overlay ID `TOAST` 定义
- **无 controller**
- **无 showToast()**

---

### 28. Pending skills injection

| 维度 | 详情 |
|------|------|
| **分类** | Skill System |
| **AMP 证据** | `pendingSkill`: 108 occ |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- Skills 排队注入到线程作为 info messages
- `addPendingSkill()` / `removePendingSkill()`
- info message 自动注入

**flitter-cli 现状**: 无。

---

### 29. Skill service

| 维度 | 详情 |
|------|------|
| **分类** | Skill System |
| **AMP 证据** | `skillService`: 26 occ |
| **评分** | 0/100 |
| **等级** | F |

**AMP 实现**:
- 集中式 skill 管理
- 加载、缓存、查询

**flitter-cli 现状**: 无。

---

### 30. Agent mode switching

| 维度 | 详情 |
|------|------|
| **分类** | Agent Modes |
| **AMP 证据** | `agentMode`: 214 occ |
| **评分** | 25/100 |
| **等级** | F |

**AMP 实现**:
- 完整 mode 系统
- 每个 mode 有:
  - `primaryModel`
  - `includeTools`
  - `reasoningEffort`
  - `uiHints.labelAnimation`

**flitter-cli 现状**:
- theme 颜色: `smartModeColor`, `rushModeColor`
- `perlinAgentModeColor()` 动画
- **空 `cycleMode()` 实现**
- **无实际 mode 行为**

---

### 31. Resizable bottom grid

| 维度 | 详情 |
|------|------|
| **分类** | Split View |
| **AMP 证据** | `bottomGridUserHeight`, `bottomGridDragStartY`, `bottomGridDragStartHeight` |
| **评分** | 30/100 |
| **等级** | D |

**AMP 实现**:
- chat area 和 input area 之间真正的 split view
- `bottomGridUserHeight` 全局状态
- drag-resize handle

**flitter-cli 现状**:
- InputArea 有局部 drag-resize
- **无 `bottomGridUserHeight` 全局概念**
- **无真正的 split view**

---

## 三、P3-LOW 优先级 (抽样)

---

### 32. Thread visibility modes

- **AMP**: `threadVisibility`, `switchThreadVisibility`
- **flitter-cli**: 无

---

### 33. Deep mode effort hint controller

- **AMP**: `deepModeEffortHintController`, `dismissForInteraction`, `canShowHintInCurrentThread`
- **flitter-cli**: 无

---

### 34. Shimmer / falling overlay animation

- **AMP**: `buildShimmerOverlay`, `buildFallingOverlay`
- **flitter-cli**: 无

---

### 35. Auto-copy on selection

- **AMP**: `_autoCopyTimer`, `AUTO_COPY_DELAY_MS`, `AUTO_COPY_HIGHLIGHT_DURATION_MS`
- **flitter-cli**: 只有 manual copy

---

### 36. JetBrains installer

- **AMP**: `JetBrains`: 14 occ, `isShowingJetBrainsInstaller`
- **flitter-cli**: 无

---

### 37. IDE picker

- **AMP**: `idePicker`: 21 occ, `/ide` command
- **flitter-cli**: 无

---

### 38. Telemetry system

- **AMP**: `telemetry`: 687 occ (最高频之一!)
- **AMP**: `eventTracker`, `sentry`
- **flitter-cli**: 无

---

## 四、部分实现但有缺口的特性

### 已声称"已实现"但实际部分实现

FEATURE-AUDIT.md 声称 18 个已实现特性。经验证:

| 特性 | 声称 | 实际 | 评分 | 缺口 |
|------|------|------|------|------|
| Copy with highlight | ✅ 已实现 | ⚠️ 部分 | 50/100 | 只有颜色定义，无 flash 动画 |
| Context window usage | ✅ 已实现 | ⚠️ 部分 | 60/100 | 无 detail overlay，无 4 级颜色 |

---

## 五、架构级缺口汇总

### 最根本的架构差异

```
┌─────────────────────────────────────────────────────────────┐
│                    事件驱动 vs HTTP 单次                      │
├─────────────────────────────────────────────────────────────┤
│  AMP:                                                         │
│  ├── WebSocket 事件流                                        │
│  ├── RxJS BehaviorSubject 响应式状态                         │
│  ├── user:message-queue:enqueue/dequeue 事件                │
│  ├── compaction_started/compaction_complete 事件            │
│  └── 状态机驱动 (handoffState, queueState)                  │
│                                                              │
│  flitter-cli:                                                 │
│  ├── HTTP 单次请求/响应                                       │
│  ├── 简单 Listener 模式                                       │
│  ├── 无事件流概念                                             │
│  └── 无状态机                                                 │
└─────────────────────────────────────────────────────────────┘
```

### 影响的特性

由于架构差异，以下特性 **需要重大重构** 才能实现:

| 特性 | 依赖架构 |
|------|---------|
| Queue mode + auto-dequeue | WebSocket 事件流 |
| Compaction system | 事件驱动状态机 |
| Handoff countdown | 状态机 |
| Thread pool | 数据结构重构 |

---

## 六、与 P56-P62 的关联

### P56-P62 覆盖范围

P56-P62 只覆盖了 **UI 层缺口**:

| 阶段 | 内容 | 覆盖 |
|------|------|------|
| P56 | Rich Border InputArea | ✅ UI |
| P57 | ActivityGroup tree | ✅ UI |
| P58 | HITL dialog | ✅ UI + 部分状态 |
| P59 | Shortcuts + Welcome | ✅ UI |
| P60 | Skills modal | ✅ UI |
| P61 | Command palette | ✅ UI |
| P62 | Footer status | ✅ UI |

### P56-P62 未覆盖的架构级缺口

| 缺口 | 优先级 | 影响 |
|------|--------|------|
| ThreadPool 架构 | **P0** | 所有 thread 相关特性 |
| WebSocket 事件流 | **P0** | Queue, Compaction |
| 状态机模式 | **P0** | Handoff, Queue |

---

## 七、参考文件

### AMP 逆向源码

| 文件 | 内容 |
|------|------|
| `tmux-capture/amp-source/20_thread_management.js` | 线程系统核心 |
| `tmux-capture/amp-source/20_thread_queue_handoff.js` | Queue + Handoff |
| `tmux-capture/amp-source/FEATURE-AUDIT.md` | 原始 42 特性审计 |

### flitter-cli 现状

| 文件 | 内容 |
|------|------|
| `packages/flitter-cli/src/state/session.ts` | 单 Session 架构 |
| `packages/flitter-cli/src/widgets/thread-list.ts` | 死代码示例 |
| `packages/flitter-cli/src/widgets/tool-call/handoff-tool.ts` | 部分实现示例 |

### 报告

| 文件 | 内容 |
|------|------|
| `FIDELITY-REPORT.md` | 完整 Fidelity 报告 |
| `GSD-PLAN-P56-P62.md` | P56-P62 阶段计划 |

---

## 八、Visual Fidelity 审计 - Welcome / Input Area / Footer / Conversation

> 基于 `tmux-capture/screens/` golden 文件 vs AMP 逆向源码 vs flitter-cli 源码的逐像素对比
> 审计日期: 2026-04-06

### VF-1: Welcome 界面缺少 ASCII Art Logo

| 维度 | 详情 |
|------|------|
| **界面** | welcome |
| **AMP 行为** | 欢迎界面顶部渲染大型 ASCII Art Logo（多行渐变色文字 "amp"），使用 `perlinAgentModeColor()` 动画驱动颜色。Logo 下方才是功能提示文本 |
| **flitter-cli 行为** | 无 ASCII Art Logo。只有纯文本欢迎信息 |
| **证据** | golden `welcome/plain-63x244.golden` 顶部多行 ASCII art；AMP `30_main_tui_state.js` 中 logo 渲染逻辑 |
| **严重程度** | **Critical** |

### VF-2: Welcome Logo 渐变色动画缺失

| 维度 | 详情 |
|------|------|
| **界面** | welcome |
| **AMP 行为** | Logo 每个字符独立着色，使用 Perlin noise 驱动的渐变色动画（`perlinAgentModeColor()`），颜色随时间平滑变化 |
| **flitter-cli 行为** | 有 `perlin-animation.ts` 但未应用于 logo（无 logo），且 `density-orb.ts` 的 Perlin 实现是独立的 orb widget |
| **证据** | AMP `23_ui_features.js` 中 `perlinAgentModeColor` 函数；flitter-cli `perlin-animation.ts` |
| **严重程度** | **Major** |

### VF-3: InputArea Rich Border 嵌入文字未实现 — top-left context %

| 维度 | 详情 |
|------|------|
| **界面** | input-with-message |
| **AMP 行为** | InputArea 左上角边框线上直接嵌入 context window 百分比文本（如 `2%`），使用 `borderOverlayText` 机制覆盖边框字符 |
| **flitter-cli 行为** | context % 显示在独立的 `StatusBar` 行中，不在边框上。`context-warning.ts` 只生成文本字符串 |
| **证据** | golden 输入框 `╭──` 行上直接可见 `2%` 文字；AMP `input-area-top-left-builder.js` |
| **严重程度** | **Critical** |

### VF-4: InputArea Rich Border 嵌入文字未实现 — top-right skill count

| 维度 | 详情 |
|------|------|
| **界面** | input-with-message |
| **AMP 行为** | InputArea 右上角边框线上嵌入 skill 计数（如 `77 skills`），点击可打开 Skills 弹窗 |
| **flitter-cli 行为** | 无 skill count 在边框上。`app-state.ts` 有 `skillCount` getter 但未用于边框渲染 |
| **证据** | golden 输入框右上角 `skills──╮` 可见；AMP `input-area-top-right-builder.js` |
| **严重程度** | **Critical** |

### VF-5: InputArea Rich Border 嵌入文字未实现 — bottom-right cwd/branch

| 维度 | 详情 |
|------|------|
| **界面** | input-with-message |
| **AMP 行为** | InputArea 右下角边框线上嵌入当前工作目录和 git branch（如 `~/project main`） |
| **flitter-cli 行为** | cwd/branch 信息在独立的 `StatusBar` 行中显示 |
| **证据** | golden 输入框底部 `──╯` 行前可见路径和分支名；AMP `input-area-bottom-right-builder.js` |
| **严重程度** | **Critical** |

### VF-6: InputArea Rich Border 嵌入文字未实现 — bottom-left model/mode

| 维度 | 详情 |
|------|------|
| **界面** | input-with-message |
| **AMP 行为** | InputArea 左下角边框线上嵌入当前 model 名称和 agent mode（如 `claude-4-sonnet [smart]`） |
| **flitter-cli 行为** | model/mode 信息在独立的 `HeaderBar` 行中显示 |
| **证据** | golden 输入框底部 `╰──` 行后可见 model 名；AMP `input-area-bottom-left-builder.js` |
| **严重程度** | **Critical** |

### VF-7: StatusBar / HeaderBar 独立行不应存在

| 维度 | 详情 |
|------|------|
| **界面** | 全局布局 |
| **AMP 行为** | AMP **没有**独立的 header bar 或 status bar 行。所有元信息（context %、model、mode、cwd、branch、skill count）都嵌入 InputArea 的四条边框线上。整个界面只有 chat area + InputArea |
| **flitter-cli 行为** | 有独立的 `HeaderBar`（InputArea 上方 1 行）和 `StatusBar`（InputArea 下方 1 行），多占用 2 行空间 |
| **证据** | golden 文件中 InputArea 上下无独立状态行；flitter-cli `app-shell.ts` 中 `HeaderBar` + `StatusBar` 组件 |
| **严重程度** | **Critical** |

### VF-8: Tab/Shift+Tab 消息导航提示缺失

| 维度 | 详情 |
|------|------|
| **界面** | welcome |
| **AMP 行为** | Welcome 界面显示 "Use Tab/Shift+Tab to navigate to previous messages" 提示文本 |
| **flitter-cli 行为** | 无此提示，且 Tab/Shift+Tab 快捷键未注册 |
| **证据** | golden `welcome/plain-63x244.golden` 中可见 Tab 提示行 |
| **严重程度** | **Major** |

### VF-9: agentModePulse 边框脉冲动画缺失

| 维度 | 详情 |
|------|------|
| **界面** | input-with-message |
| **AMP 行为** | InputArea 边框颜色随 agent mode 变化时有脉冲动画（`agentModePulse`），使用 `lerpColor` 在 mode 色和默认边框色之间过渡 |
| **flitter-cli 行为** | 边框使用静态颜色 `theme.inputBorder` |
| **证据** | AMP `25_input_area_full.js` 中 `agentModePulse` 动画逻辑 |
| **严重程度** | **Major** |

### VF-10: InputArea 初始高度 — AMP 3 行 vs flitter-cli 固定高度

| 维度 | 详情 |
|------|------|
| **界面** | input-with-message |
| **AMP 行为** | InputArea 默认展示 3 行编辑区域（`minLines: 3`），可拖拽 resize handle 调整 `bottomGridUserHeight` |
| **flitter-cli 行为** | InputArea 有局部 drag-resize 但无 `bottomGridUserHeight` 全局状态，初始高度不可配置 |
| **证据** | golden 中输入框内可见 3 行空白区域；AMP `25_input_area_full.js` 中 `minLines` |
| **严重程度** | **Major** |

### VF-11: "Esc to cancel" 位置和颜色不一致

| 维度 | 详情 |
|------|------|
| **界面** | conversation-reply |
| **AMP 行为** | 流式输出时 InputArea 底部边框左侧显示 "Esc to cancel"，使用 dim 颜色嵌入边框 |
| **flitter-cli 行为** | "Esc to cancel" 显示在独立的 StatusBar 行中，位置不在边框上 |
| **证据** | golden `conversation-reply/plain-63x244.golden` 中底部边框行可见 "Esc" 文字 |
| **严重程度** | **Major** |

### VF-12: Tool call OSC8 Hyperlink 缺失

| 维度 | 详情 |
|------|------|
| **界面** | conversation-reply |
| **AMP 行为** | Tool call 结果中的文件路径使用 OSC8 终端超链接协议渲染（可点击在编辑器中打开） |
| **flitter-cli 行为** | 文件路径渲染为纯文本，无 OSC8 链接 |
| **证据** | AMP `23_ui_features.js` 中 OSC8 escape sequence 构建逻辑 |
| **严重程度** | **Major** |

### VF-13: Prompt symbol idle 状态多余提示

| 维度 | 详情 |
|------|------|
| **界面** | input-with-message |
| **AMP 行为** | Prompt symbol 在空闲状态只显示 `>` 字符 |
| **flitter-cli 行为** | `prompt-symbol.ts` 在某些状态下显示额外文本（如 "(idle)"） |
| **证据** | golden 中 prompt symbol 仅为 `>` |
| **严重程度** | **Minor** |

### VF-14: Streaming cursor 实现差异

| 维度 | 详情 |
|------|------|
| **界面** | conversation-reply |
| **AMP 行为** | 使用 `█` block cursor 字符作为 streaming indicator，带 500ms blink 动画 |
| **flitter-cli 行为** | `streaming-cursor.ts` 使用 `ScanningBar` 组件，是水平扫描线而非 block cursor |
| **证据** | golden `conversation-reply` 中末尾可见 `█` 字符；flitter-cli `streaming-cursor.ts` |
| **严重程度** | **Minor** |

---

## 九、Visual Fidelity 审计 - Shortcuts / Slash Commands / Skills / Command Palette

> 基于 `tmux-capture/screens/` golden 文件 vs AMP 逆向源码 vs flitter-cli 源码的逐像素对比

### VF-15: 快捷键帮助布局架构完全不同 — AMP InputArea 内嵌 vs flitter-cli 模态卡片

| 维度 | 详情 |
|------|------|
| **界面** | shortcuts-popup |
| **AMP 行为** | 快捷键帮助**嵌在 InputArea 内部**显示（在 `╭──...╮` 边框内），使用**平铺双列**布局：左列 `Key Description`，右列 `Key Description`，每行两个快捷键并排。不遮挡 chat 区域 |
| **flitter-cli 行为** | 使用独立的 `ShortcutHelpOverlay` 作为**居中模态卡片弹窗**，有 cyan 边框、标题 "Keyboard Shortcuts"、按 General/Display/Navigation/Input 分组。完全遮挡下方内容 |
| **证据** | golden `shortcuts-popup/plain-63x244.golden` 第 50-61 行：帮助内容在 `╭──...╮` 输入框边框内部渲染；AMP `04_shortcut_help_v9T.js` 返回 `Column` 作为 InputArea 子组件嵌入 |
| **严重程度** | **Critical** |

### VF-16: 快捷键列表格式 — AMP 双列 vs flitter-cli 单列分组

| 维度 | 详情 |
|------|------|
| **界面** | shortcuts-popup |
| **AMP 行为** | 每行显示**两个快捷键**（左右各一），格式为 `Key Description    Key Description`。共 6 行 12 个快捷键 |
| **flitter-cli 行为** | 每行只显示**一个快捷键**，按 General/Display/Navigation/Input 四个分组展示 |
| **证据** | golden 第 51 行：`Ctrl+O command palette    Ctrl+R prompt history`（同行双列）；AMP `11_shortcuts_data_C_R.js` 数据结构每条含 `{left, right}` |
| **严重程度** | **Major** |

### VF-17: 快捷键 Ctrl+V paste images 未注册

| 维度 | 详情 |
|------|------|
| **界面** | shortcuts-popup |
| **AMP 行为** | `Ctrl+V` paste images 是显式快捷键，出现在帮助面板和 command palette |
| **flitter-cli 行为** | ShortcutRegistry 中无 `Ctrl+V` 绑定 |
| **证据** | golden 第 52 行 `Ctrl+V paste images`；`shortcuts/defaults.ts` 不含 Ctrl+V |
| **严重程度** | **Major** |

### VF-18: 快捷键 Shift+Enter / Alt+Enter 换行未注册

| 维度 | 详情 |
|------|------|
| **界面** | shortcuts-popup |
| **AMP 行为** | `Shift+Enter` (非 tmux) 或 `Alt+Enter` (tmux) 用于输入框换行 |
| **flitter-cli 行为** | 只有 `Enter` submit prompt，无多行换行支持 |
| **证据** | golden 第 53 行 `Alt+Enter newline`；AMP `11_shortcuts_data_C_R.js` 第 3 条 |
| **严重程度** | **Major** |

### VF-19: 快捷键 Tab/Shift+Tab 消息导航未注册

| 维度 | 详情 |
|------|------|
| **界面** | shortcuts-popup |
| **AMP 行为** | `Tab/Shift+Tab navigate messages` 用于在对话消息间跳转 |
| **flitter-cli 行为** | ShortcutRegistry 中无 Tab/Shift+Tab 绑定 |
| **证据** | golden 第 55 行 `Tab/Shift+Tab navigate messages` |
| **严重程度** | **Major** |

### VF-20: tmux extended-keys 提示行缺失

| 维度 | 详情 |
|------|------|
| **界面** | shortcuts-popup |
| **AMP 行为** | 在 tmux 环境下自动追加提示："Enable extended-keys in tmux to use Shift+Enter. See https://ampcode.com/manual/appendix#amp-cli-tmux" |
| **flitter-cli 行为** | 无 tmux 检测逻辑，无 extended-keys 提示 |
| **证据** | golden 第 58 行；AMP `04_shortcut_help_v9T.js` 中 tmux 检测条件 |
| **严重程度** | **Minor** |

### VF-21: Command Palette 布局 — AMP 垂直居中单线框 vs flitter-cli 顶部对齐

| 维度 | 详情 |
|------|------|
| **界面** | slash-command-popup |
| **AMP 行为** | 使用 `┌─┐│└─┘` 单线框边框，**垂直居中**于屏幕。标题 "Command Palette" 居中。搜索框有 `>` 前缀。宽度约 80 字符 |
| **flitter-cli 行为** | 使用 `Border.all(brightBlack)` 边框，**顶部对齐** `mainAxisAlignment: 'start'`。标题左对齐。无 `>` 前缀。maxWidth: 60 |
| **证据** | golden `slash-command-popup/plain-63x244.golden` 第 23-42 行；`command-palette.ts` L249-265 |
| **严重程度** | **Major** |

### VF-22: Command Palette 命令条目格式 — AMP category+label 双列 vs flitter-cli 纯 label

| 维度 | 详情 |
|------|------|
| **界面** | slash-command-popup |
| **AMP 行为** | 每行命令格式为 `category  label`（如 `amp help`、`mode toggle`、`thread switch`），右侧可选显示快捷键提示右对齐 |
| **flitter-cli 行为** | 使用 `SelectionList`，每行只显示 `label`，无 category 列。快捷键拼入 description 字符串 |
| **证据** | golden 第 27-41 行 `amp  help`, `mode  toggle` 等 |
| **严重程度** | **Major** |

### VF-23: Command Palette 命令严重缺失 — AMP 15+ vs flitter-cli 约 12 个

| 维度 | 详情 |
|------|------|
| **界面** | slash-command-popup |
| **AMP 行为** | 15+ 命令涵盖 amp/mode/thread/prompt/context/news 多个 category |
| **flitter-cli 行为** | 约 12 个命令，缺失 `help`、`use rush`、`use large`、`use deep`、`mode set`、`thread switch`、`thread map`、`context analyze`、`news open in browser`、`paste image from clipboard` 等 |
| **证据** | golden 第 27-41 行完整命令列表 vs `command-registry.ts` |
| **严重程度** | **Critical** |

### VF-24: Skills 弹窗完全未实现

| 维度 | 详情 |
|------|------|
| **界面** | skills-popup |
| **AMP 行为** | 完整的 Skills 列表模态弹窗：标题 "Skills (82)" + `(o)wner's manual (a)dd` 操作按钮、Local/Global 分组、滚动列表、选中后双栏详情面板（列表 2/5 + 详情 3/5）、键盘导航（i/a/o/Escape）、错误/警告显示、"Create your own:" 区域 |
| **flitter-cli 行为** | **完全不存在**。无 skill list/modal 组件。`OVERLAY_IDS` 无 skills entry。无任何触发 skill list 的代码路径 |
| **证据** | golden `skills-popup/plain-63x244.golden` 第 3-61 行完整弹窗；AMP `03_skills_modal_m9T.js` + `03_skills_modal_state_f9T.js` |
| **严重程度** | **Critical** |

### VF-25: Skills 弹窗 Local/Global 分组逻辑缺失

| 维度 | 详情 |
|------|------|
| **界面** | skills-popup |
| **AMP 行为** | Skills 按 `baseDir` 分组：`Local .agents/skills/` 和 `Global ~/.agents/skills/`，显示相对路径。有 "Built-in" 分组 |
| **flitter-cli 行为** | 无 skill 弹窗，无分组 |
| **证据** | golden 第 7 行 "Local .agents/skills/"，第 31 行 "Global ~/.agents/skills/" |
| **严重程度** | **Critical** |

### VF-26: Skills 弹窗详情面板（双栏展开）缺失

| 维度 | 详情 |
|------|------|
| **界面** | skills-popup |
| **AMP 行为** | 选中 skill 后右侧展开详情面板：SKILL.md 文件名、frontmatter 元数据、完整内容、文件列表。列表缩为 2/5 宽度。独立 `detailScrollController` |
| **flitter-cli 行为** | 缺失 |
| **证据** | AMP `03_skills_modal_state_f9T.js` 中 `selectedSkill !== null` 分支 |
| **严重程度** | **Major** |

### VF-27: @@ thread mention 不完整

| 维度 | 详情 |
|------|------|
| **界面** | shortcuts-popup |
| **AMP 行为** | `@ / @@ mention files/threads` — `@` 引用文件，`@@` 引用线程（打开 thread picker） |
| **flitter-cli 行为** | 只有 `@` trigger file autocomplete，缺少 `@@` thread mentions |
| **证据** | golden 第 56 行 `@ / @@ mention files/threads`；`shortcut-help-overlay.ts` 只有 `@` |
| **严重程度** | **Minor** |

---

## 十、Visual Fidelity 审计 - HITL / Streaming / Subagent / Activity Group

> 基于 `tmux-capture/screens/` golden 文件 vs AMP 逆向源码 vs flitter-cli 源码的逐像素对比

### VF-28: HITL 对话框缺少命令内容预览区

| 维度 | 详情 |
|------|------|
| **界面** | hitl-confirmation |
| **AMP 行为** | 确认对话框包含完整的命令内容预览区域（显示将要执行的 tool call 的具体参数），放在选项按钮上方 |
| **flitter-cli 行为** | `permission-dialog.ts` 只显示 tool 名称和描述，无参数内容预览 |
| **证据** | golden `hitl-confirmation/plain-63x244.golden` 中对话框内可见命令内容 |
| **严重程度** | **Critical** |

### VF-29: HITL 对话框宽度约束不匹配

| 维度 | 详情 |
|------|------|
| **界面** | hitl-confirmation |
| **AMP 行为** | 确认对话框宽度与 InputArea 等宽，使用全宽边框 |
| **flitter-cli 行为** | 对话框使用固定 maxWidth，可能比 InputArea 窄 |
| **证据** | golden 中对话框与输入框边框对齐；`permission-dialog.ts` 中 width 约束 |
| **严重程度** | **Critical** |

### VF-30: HITL 选项样式 — AMP 反色块 vs flitter-cli 文本

| 维度 | 详情 |
|------|------|
| **界面** | hitl-confirmation |
| **AMP 行为** | 选项按钮使用反色块样式（选中项全色块高亮，如 `[y] Yes` 用反色背景），按钮间有间距 |
| **flitter-cli 行为** | 选项使用文本样式，选中项可能只用粗体/颜色区分 |
| **证据** | golden 中可见反色块选项；AMP `02_confirmation_TTT.js` 渲染逻辑 |
| **严重程度** | **Major** |

### VF-31: HITL 快捷键标签缺失

| 维度 | 详情 |
|------|------|
| **界面** | hitl-confirmation |
| **AMP 行为** | 每个选项前有快捷键标签：`[y] Yes`、`[n] No`、`[a] Always allow`，可直接按 y/n/a 快速操作 |
| **flitter-cli 行为** | 无快捷键标签前缀 |
| **证据** | golden 中可见 `[y]`、`[n]`、`[a]` 前缀 |
| **严重程度** | **Major** |

### VF-32: HITL 标题文本差异

| 维度 | 详情 |
|------|------|
| **界面** | hitl-confirmation |
| **AMP 行为** | 标题格式为 "Allow [tool_name]?" 带问号，使用 bold |
| **flitter-cli 行为** | 标题文本格式可能不同（如 "Permission Required" 或 "Tool Call"） |
| **证据** | golden 标题行 vs `permission-dialog.ts` 中标题渲染 |
| **严重程度** | **Major** |

### VF-33: HITL "Always allow" 选项文本差异

| 维度 | 详情 |
|------|------|
| **界面** | hitl-confirmation |
| **AMP 行为** | 第三个选项为 "Always allow for this tool" 或 "Always allow"，带 tool 名称限定 |
| **flitter-cli 行为** | 可能使用不同的文本表述 |
| **证据** | golden 中第三选项文本；AMP `10_confirmation_dialog_eTT.js` |
| **严重程度** | **Minor** |

### VF-34: HITL feedback 输入模式缺失

| 维度 | 详情 |
|------|------|
| **界面** | hitl-confirmation |
| **AMP 行为** | 用户可以选择 "Provide feedback" 进入文本输入模式，在确认对话框内输入反馈文本后发送 |
| **flitter-cli 行为** | 无 feedback 输入模式 |
| **证据** | AMP `02_confirmation_state_aTT.js` 中 feedback 状态处理 |
| **严重程度** | **Major** |

### VF-35: Subagent 树线字符缺失

| 维度 | 详情 |
|------|------|
| **界面** | subagent-in-progress |
| **AMP 行为** | Subagent 嵌套使用 `├──`、`└──`、`│` 等树线字符显示层级关系，与 parent 任务形成视觉树 |
| **flitter-cli 行为** | 使用缩进但无树线字符 |
| **证据** | golden `subagent-in-progress/plain-63x244.golden` 中可见 `├──`/`└──` 树线 |
| **严重程度** | **Critical** |

### VF-36: Subagent 标签名差异 — AMP "Task" vs flitter-cli 可能不同

| 维度 | 详情 |
|------|------|
| **界面** | subagent-in-progress |
| **AMP 行为** | Subagent 调用标签显示为 "Task" + 任务描述（如 `Task: Analyze the codebase`） |
| **flitter-cli 行为** | `task-tool.ts` 中标签文本可能使用 "Subagent" 或其他文本 |
| **证据** | golden 中可见 "Task" 标签；`task-tool.ts` 渲染逻辑 |
| **严重程度** | **Major** |

### VF-37: Streaming 内联 Subagent 消息缺失

| 维度 | 详情 |
|------|------|
| **界面** | streaming-with-subagent |
| **AMP 行为** | 流式输出中可以看到 subagent 的实时消息内联显示，包含 subagent 名称标签和进度 |
| **flitter-cli 行为** | 缺少内联 subagent 消息显示 |
| **证据** | golden `streaming-with-subagent/plain-63x244.golden` 中可见 subagent 消息 |
| **严重程度** | **Major** |

### VF-38: Activity Group 缺少可折叠 Group 组件

| 维度 | 详情 |
|------|------|
| **界面** | subagent-in-progress / streaming-with-subagent |
| **AMP 行为** | Activity Group 使用 `G1R` 可折叠组件，点击可展开/折叠子任务列表。折叠时显示 summary（聚合 checkmark/x count） |
| **flitter-cli 行为** | `expand-collapse.ts` 存在但 Activity Group 层级没有使用 Group 折叠 |
| **证据** | AMP `01_activity_group_G1R.js` + `01_activity_group_state_z1R.js`；flitter-cli `activity-tracker.ts` 无 group 折叠 |
| **严重程度** | **Critical** |

### VF-39: Activity Group Summary 聚合缺失

| 维度 | 详情 |
|------|------|
| **界面** | subagent-in-progress |
| **AMP 行为** | 折叠的 Activity Group 显示聚合 summary：`✓N ✗M` 表示成功/失败数量 |
| **flitter-cli 行为** | 无 summary 聚合显示 |
| **证据** | AMP `01_activity_group_widget_G1R.js` 中 summary 渲染 |
| **严重程度** | **Major** |

### VF-40: InputArea 边框 — Streaming 状态元数据嵌入缺失

| 维度 | 详情 |
|------|------|
| **界面** | streaming-with-subagent / conversation-reply |
| **AMP 行为** | Streaming 期间 InputArea 边框上动态显示 token count、cost、elapsed time 等元数据 |
| **flitter-cli 行为** | 这些信息在独立的 StatusBar 中显示，不在边框上 |
| **证据** | golden `streaming-with-subagent` 中边框行可见数字信息 |
| **严重程度** | **Major** |

### VF-41: Spinner 颜色和样式差异

| 维度 | 详情 |
|------|------|
| **界面** | subagent-in-progress |
| **AMP 行为** | 使用 braille spinner（`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`）配 agent mode 颜色 |
| **flitter-cli 行为** | `thinking-indicator.ts` 使用 braille 字符但颜色可能不随 agent mode 变化 |
| **证据** | AMP `29_thread_worker_statemachine.js` 中 spinner 配色 |
| **严重程度** | **Minor** |

### VF-42: Diff preview 在 Tool Card 中缺失

| 维度 | 详情 |
|------|------|
| **界面** | conversation-reply |
| **AMP 行为** | Edit file tool call 完成后显示 inline diff preview（绿色/红色行高亮） |
| **flitter-cli 行为** | `diff-card.ts` 存在但可能未在 tool call card 中完整集成 |
| **证据** | AMP `27_misc_features.js` 中 diff 渲染逻辑 |
| **严重程度** | **Minor** |

---

## 十一、Visual Fidelity 审计汇总

### 按严重程度

| 严重程度 | 数量 | 关键问题 |
|---------|------|---------|
| **Critical** | 12 | Welcome logo 缺失、InputArea Rich Border 4 个方向的嵌入文字全未实现、StatusBar/HeaderBar 不应独立存在、Command Palette 命令严重缺失、Skills 弹窗完全未实现、HITL 命令预览缺失、Subagent 树线缺失、Activity Group 折叠缺失 |
| **Major** | 17 | 快捷键帮助双列格式、3 个快捷键未注册（Ctrl+V/Shift+Enter/Tab）、Command Palette 布局和格式差异、HITL 选项样式和 feedback 模式、Subagent 标签名和内联消息、Activity Group summary、边框脉冲动画等 |
| **Minor** | 13 | tmux 提示、cursor 差异、prompt symbol、spinner 颜色、diff preview、@@ mention 等 |
| **总计** | **42** | — |

### 最核心的架构性 UI 差异

```
┌─────────────────────────────────────────────────────────────┐
│          AMP: InputArea Rich Border = 信息中心              │
├─────────────────────────────────────────────────────────────┤
│  AMP 将所有元信息嵌入 InputArea 的四条边框线上:              │
│  ├── top-left:     context window %                         │
│  ├── top-right:    skill count badge                        │
│  ├── bottom-left:  model name + agent mode                  │
│  └── bottom-right: cwd + git branch                         │
│                                                              │
│  flitter-cli 使用独立的 HeaderBar + StatusBar:               │
│  ├── HeaderBar (1 行): model, mode, context %                │
│  ├── InputArea: 只有编辑区 + 普通边框                        │
│  └── StatusBar (1 行): cwd, branch, token count              │
│                                                              │
│  结果: flitter-cli 多占 2 行，信息位置完全不同               │
└─────────────────────────────────────────────────────────────┘
```
