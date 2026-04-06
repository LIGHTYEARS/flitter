# flitter-cli Missing Features vs AMP

> 基于 FEATURE-AUDIT.md (42 特性) 和 FIDELITY-REPORT.md (实体验证)
> 生成日期: 2026-04-06
> 状态: **34/42 特性缺失或部分实现**

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
