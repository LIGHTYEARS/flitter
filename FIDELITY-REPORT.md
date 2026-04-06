# AMP vs flitter-cli Fidelity 验证报告

> 生成日期: 2026-04-06
> 验证源: AMP 逆向源码 + 9 个 Golden 屏幕 + flitter-cli 实现
> 验证范围: 7 组件 + 42 特性
> 总体评分: **15/100** (等级: **F**)

---

## 执行摘要

### 总体评分

| 指标 | 数值 | 解释 |
|-----|------|------|
| **总体 Fidelity 分数** | **15/100** | 42 特性加权平均分 |
| **组件平均分** | **29/100** | 7 个组件 (P56-P62) |
| **特性平均分** | **15/100** | 42 特性 (FEATURE-AUDIT) |

### 评分等级映射

| 分数 | 等级 | 描述 |
|-----|------|------|
| 95-100 | S | 像素级完美复刻 |
| 85-94 | A | 视觉无差异，代码高度一致 |
| 70-84 | B | 主要功能匹配，小差异 |
| 50-69 | C | 部分功能匹配，显著差异 |
| 10-49 | D | 存在重大差距 |
| 0-9 | F | 完全缺失或架构级不兼容 |

---

## 一、42 特性级 Fidelity 验证结果

### 1.1 P1-HIGH 优先级 (6 个核心特性)

**这些是必须优先修复的核心 UX 差距**

| # | 特性 | 分类 | 代码分 | 等级 | 关键发现 |
|---|------|------|--------|------|----------|
| 1 | **Thread switching + creation/deletion** | Thread Management | **3/100** | F | `ThreadList` 组件存在 (194行) 但**代码库零调用**；`newThread()` 是**假冒实现** — 只清空 `_items = []`，不创建新 sessionId |
| 2 | **Handoff mode (full controller)** | Handoff Mode | **4/100** | F | 只有 `handoff-tool.ts` UI 渲染 + 700ms blink 动画；**无状态机**、**无 enterHandoffMode/exitHandoffMode**、**无 countdownSeconds 倒计时** |
| 3 | **Queue mode (full message queue)** | Queue Mode | **1/100** | F | 只有 `queueMode` 颜色定义；**无 queuedMessages[] 数据结构**、**无 enterQueueMode/exitQueueMode**、**无 submit/interrupt/clear** 操作 |
| 4 | **Queue dequeue on completion** | Queue Mode | **0/100** | F | 完全缺失 `user:message-queue:enqueue/dequeue` 事件处理；无自动出队状态机条件判断 |
| 5 | **Compaction system** | Context Window | **0/100** | F | 完全缺失；AMP 有 `compaction: 32 occ`、`compactionState`、`compactionThresholdPercent`、`cutMessageId` |
| 6 | **Image paste/attachment input** | Image Support | **15/100** | D | 只有 `images[]` badge 渲染逻辑 (测试可见)；**无 paste handler**、**无 isUploadingImageAttachments spinner**、**无 popImage() (Backspace 删除)** |

#### P1-HIGH 深度发现

**Thread Management 最惊讶发现**:
> `packages/flitter-cli/src/widgets/thread-list.ts` 是一个 **194 行完整组件**，有 `onSelect: (sessionId: string) => void` 接口，有高亮当前会话、显示时间戳、消息计数等完整 UI。
>
> 但是：**代码库 grep 零调用** — 从未被渲染，从未被使用。这是死代码。

**`newThread()` 假冒实现**:
```typescript
// flitter-cli/src/state/session.ts
newThread(): void {
  this._items = [];  // 只是清空！sessionId 不变！
  this._needsSave = true;
}
```

AMP 的真正多线程:
```javascript
// AMP 20_thread_management.js
threadHandleMap = new Map;      // Map<ThreadID, ThreadHandle>
activeThreadContextID = null;   // 当前只是"指针"
threadBackStack = [];            // 可切换回去
// createThread() → 新 UUID + 保留旧线程
// switchThread() → 只改变指针
```

---

### 1.2 P2-MED 优先级 (25 个特性)

| # | 特性 | 分类 | 代码分 | 等级 | 关键发现 |
|---|------|------|--------|------|----------|
| 7 | Thread back/forward navigation | Thread Mgmt | 0/100 | F | 无 `threadBackStack`/`threadForwardStack`，无任何导航方法 |
| 8 | Thread title generation | Thread Mgmt | 0/100 | F | 无 `triggerTitleGeneration()`、无 AbortController、无 API 调用 |
| 9 | Thread preview (split-view) | Thread Mgmt | 0/100 | F | 无 `previewThread`、无独立 scroll controller |
| 10 | Thread worker pool | Thread Mgmt | 0/100 | F | 单 session 架构，无 `threadHandleMap` / `ThreadWorker` 状态机 |
| 11 | Handoff countdown timer | Handoff | 0/100 | F | 无 `countdownSeconds`、无 "Auto-submitting in N..." UI |
| 12 | Handoff from parent thread | Handoff | 0/100 | F | 无 `sourceThreadID`/`targetThreadID`，单线程不支持 |
| 13 | Deep reasoning effort levels (tri-state) | Deep Reasoning | **30/100** | D | 只有 `deepReasoningActive: boolean`；AMP 是 `deepReasoningEffort: "medium"|"high"|"xhigh"` 三态枚举 |
| 14 | Provider-specific speed settings | Deep Reasoning | 0/100 | F | 无 `anthropicSpeed`/`openAISpeed`，无 `+fast(6x$)` 后缀显示 |
| 15 | Kitty graphics protocol | Image Support | 0/100 | F | 无 `supportsKittyGraphics()`、无 `transmitImage` |
| 16 | Image preview overlay | Image Support | 0/100 | F | 无 `ImagePreview` 全屏覆盖层、无保存对话框 |
| 17 | Context detail overlay | Context Window | **40/100** | D | 只有 `contextWindowUsagePercent` 百分比计算 + 基础警告；无点击打开详情、无 token breakdown UI |
| 18 | Additional providers (8 missing) | Provider System | **70/100** | B | 7/10 providers；缺少 xai, cerebras, fireworks, groq, moonshot, openrouter, vertex, baseten |
| 19 | Model catalog | Provider System | **10/100** | F | 只有 `DEFAULT_MODELS` provider→defaultModel 映射；无 `contextWindow`/`maxOutputTokens`/`pricing`/`capabilities`/`uiHints` 元数据 (40+ models) |
| 20 | Provider config service | Provider System | **15/100** | F | 只有基础 key-value config；无分层 `anthropic.effort`/`interleavedThinking`/`internal.compactionThresholdPercent` 细粒度设置、无 Zod schema 验证 |
| 21 | Thread mentions (@@) | Mention System | **20/100** | F | 只有 `onSpecialCommandTrigger` 接口定义；**零实现**、无 thread picker、无 `insertThreadMention` |
| 22 | Edit previous message (Up arrow) | Message Nav | 0/100 | F | 无 `editingMessageOrdinal`、无 `editingController`、无 `client_edit_message` 协议支持 |
| 23 | Shell mode ($ and $$) | Shell Mode | **40/100** | D | 只有 `detectShellMode()` 检测 `$$` 前缀 + 主题颜色；无 `bashInvocations` 数组、无运行中命令列表显示 |
| 24 | Bash invocation display | Shell Mode | 0/100 | F | 无 `pendingBashInvocations` Map、无 show/hide timer 逻辑 |
| 25 | Confirmation overlay | UI Overlays | 0/100 | F | 无 `isShowingConfirmationOverlay`、无 exit/clearInput/cancelProcessing 确认对话框 |
| 26 | Context analyze modal | UI Overlays | **10/100** | F | 只有百分比计算；无 token breakdown 模态框 |
| 27 | File changes overlay | UI Overlays | 0/100 | F | 完全缺失 |
| 28 | Toast notifications | UI Overlays | **20/100** | F | 只有 `TOAST` overlay ID 定义；无 `toastController`、无 `showToast()`、无 auto-dismiss timer |
| 29 | Pending skills injection | Skill System | 0/100 | F | 无 `pendingSkill: 108 occ`、无 `addPendingSkill`/`removePendingSkill`、无 info message 注入 |
| 30 | Skill service | Skill System | 0/100 | F | 无 `skillService` 集中管理 |
| 31 | Agent mode switching | Agent Modes | **25/100** | F | 只有 `smartModeColor`/`rushModeColor` 颜色 + 空 `cycleMode()`；无 per-mode `primaryModel`/`includeTools`/`reasoningEffort`/`uiHints.labelAnimation` |
| 32 | Resizable bottom grid | Split View | **30/100** | D | 只有 InputArea 局部 drag-resize；无 `bottomGridUserHeight` 全局概念、无与 chat area 的真正 split view |

---

### 1.3 P3-LOW 优先级 (16 个特性 - 抽样验证)

| # | 特性 | 分类 | 代码分 | 等级 | 关键发现 |
|---|------|------|--------|------|----------|
| 33 | Thread visibility modes | Thread Mgmt | 0/100 | F | 完全缺失 |
| 34 | Thread relationships | Thread Mgmt | 0/100 | F | 完全缺失 |
| 35 | Deep mode effort hint controller | Deep Reasoning | 0/100 | F | 完全缺失；AMP 有 `dismissForInteraction`/`canShowHintInCurrentThread` |
| 36 | Shimmer/falling overlay animation | Deep Reasoning | 0/100 | F | 完全缺失；AMP 有 `buildShimmerOverlay`/`buildFallingOverlay` |
| 37 | Interleaved thinking config | Deep Reasoning | 0/100 | F | 只有 thinking block 渲染；无 `interleavedThinking.enabled` 配置 |
| 38 | Image click handler | Image Support | 0/100 | F | 完全缺失 |
| 39 | Auto-copy on selection | Clipboard | 0/100 | F | 完全缺失；AMP 有 `_autoCopyTimer` + `AUTO_COPY_DELAY_MS` |
| 40 | JetBrains installer | Editor | 0/100 | F | 完全缺失；只有 `$EDITOR` 外部编辑器支持 |
| 41 | IDE picker / IDE client | Editor | 0/100 | F | 完全缺失；无 `/ide` 命令 |
| 42 | MCP status modal | UI Overlays | 0/100 | F | 完全缺失 |
| 43 | Console overlay | UI Overlays | 0/100 | F | 完全缺失 |
| 44 | News feed reader | UI Overlays | 0/100 | F | 完全缺失；无 `/news.rss` |
| 45 | Thread cost fetch from API | Cost Tracking | 0/100 | F | 只有本地 `usage.cost` 跟踪；无 API 获取 `threadCostInfo` |
| 46 | Skill preview | Skill System | 0/100 | F | 完全缺失 |
| 47 | Code mode | Agent Modes | 0/100 | F | 完全缺失 |
| 48 | Telemetry system | Telemetry | 0/100 | F | 完全缺失；AMP 有 `telemetry: 687 occ` (最高频之一！) + `eventTracker` + `sentry` |

---

### 1.4 已实现特性 (FEATURE-AUDIT.md "Already in flitter-cli")

FEATURE-AUDIT.md 声称 18 个已实现特性。**经验证，部分只是"部分实现"或"架构概念不同"**:

| 特性 | 声称状态 | 实际状态 | 评分 | 注释 |
|------|---------|---------|------|------|
| Dense view toggle | ✅ 已实现 | ✅ 完整实现 | 100/100 | `denseView` boolean + `toggleDenseView()` |
| OAuth flows | ✅ 已实现 | ✅ 完整实现 | 90/100 | 完整 OAuth: PKCE、callback server、token store with refresh |
| File mentions (@) | ✅ 已实现 | ✅ 完整实现 | 85/100 | `@` autocomplete + `file-picker.ts` |
| Autocomplete framework | ✅ 已实现 | ✅ 完整实现 | 80/100 | `Autocomplete` from flitter-core + `autocompleteTriggers` |
| Selection mode (Tab nav) | ✅ 已实现 | ✅ 完整实现 | 90/100 | `selectPreviousMessage()`/`selectNextMessage()` in app-shell.ts |
| External editor ($EDITOR) | ✅ 已实现 | ✅ 完整实现 | 90/100 | `editor-launcher.ts` + Ctrl+G shortcut + suspend/resume cycle |
| Copy with highlight | ✅ 已实现 | ⚠️ 部分实现 | 50/100 | 只有 `copyHighlight` 主题颜色定义；**无 flash 动画逻辑** |
| Scrollbar widget | ✅ 已实现 | ✅ 完整实现 | 100/100 | `Scrollbar` widget + `thumbColor`/`trackColor` |
| Context window usage display | ✅ 已实现 | ⚠️ 部分实现 | 60/100 | 只有百分比计算 + 基础警告；**无 detail overlay**、**无 4 级颜色** |
| Oracle sub-agent | ✅ 已实现 | ✅ 完整实现 | 80/100 | Tool-call-widget routes `oracle`/`code_review`/`librarian` to TaskTool |

---

## 二、7 组件级 Fidelity 验证结果 (P56-P62)

### 2.1 组件评分详情

| 阶段 | 组件 | AMP混淆类 | 代码分 | 等级 | 核心差距 |
|------|------|----------|--------|------|----------|
| **P56** | Rich Border InputArea | `IhR` | **38/100** | D | `IhR` widget 缺失，4-corner overlay 分散在 3 组件，overlay layer 特效，bottom grid 拖拽，skill/badge 系统 |
| **P57** | ActivityGroup Tree | `G1R`/`z1R` | **55/100** | C | `G1R` group 容器，`actionExpanded: Map`，90ms staggered reveal，`hasInProgress` 级联 |
| **P58** | HITL Confirmation | `aTT`/`eTT` | **25/100** | D | 无状态(不支持 feedback 输入模式)、工具特定 header 分派、radio 符号 `▸●`/` ○`、Alt+N 标签 |
| **P59** | ShortcutHelp | `v9T` | **30/100** | D | 架构不同(overlay vs InputArea.topWidget)、两列并行布局、Welcome Orb、tmux 警告、HorizontalLine |
| **P60** | Skills Modal | `m9T`/`f9T` | **0/100** | **F** | **完全缺失** (StatefulWidget + 双 ScrollController + 分组 + split-view detail 面板) |
| **P61** | Command Palette | - | **35/100** | D | 三列布局 vs 两列、category 字段、`x/y commands` count 多余显示 |
| **P62** | Footer Status | `yB`/`zB0` | **55/100** | C | 前缀符号(hamburger `≡`/braille spinner `⠋`)、消息文本不完全匹配、cost 条件格式化(2dp/4dp) |

---

## 三、最严重的架构级发现

### 3.1 线程模型: 单 Session vs 真正 ThreadPool

**这是最根本的架构差异**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AMP (真正多线程池)                                │
├─────────────────────────────────────────────────────────────────────┤
│  threadHandleMap = Map<ThreadID, ThreadHandle>                      │
│  ├── thread-001: { messages, worker, queuedMessages, ... }         │
│  ├── thread-002: { messages, worker, queuedMessages, ... }         │
│  └── thread-003: { messages, worker, queuedMessages, ... }         │
│                                                                      │
│  activeThreadContextID = "thread-002"  ← 只是一个"指针"           │
│  threadBackStack = ["thread-001"]        ← 可切换回去             │
│                                                                      │
│  switchThread(id)     → 只改变指针，保留所有线程数据               │
│  createThread()       → 新 UUID + 新 ThreadHandle                  │
│  deleteThread(id)     → 从 Map 移除                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    flitter-cli (单 Session 重置)                     │
├─────────────────────────────────────────────────────────────────────┤
│  SessionState {                                                     │
│    sessionId = "test-session-id"  ← 固定！永远不变                 │
│    _items = Message[]              ← 唯一的消息数组                │
│  }                                                                  │
│                                                                      │
│  newThread(): {                                                     │
│    this._items = [];  ← 只是清空！不是创建新线程                   │
│    // sessionId 不变                                                │
│  }                                                                  │
│                                                                      │
│  结果: 切换线程 = 丢失历史                                          │
└─────────────────────────────────────────────────────────────────────┘
```

**影响的特性**:
- ❌ Thread switching + creation/deletion (P1-HIGH)
- ❌ Thread back/forward navigation (P2-MED)
- ❌ Thread worker pool (P2-MED)
- ❌ Thread mentions (@@) (P2-MED) - 无法引用不存在的线程
- ❌ Handoff from parent thread (P2-MED) - 无父子线程关系
- ❌ Queue mode (P1-HIGH) - 每个线程有自己的 `queuedMessages[]`

---

### 3.2 死代码: ThreadList 组件存在但零调用

**发现**:
- `packages/flitter-cli/src/widgets/thread-list.ts`: 194 行完整组件
- 定义了 `onSelect: (sessionId: string) => void` 接口
- 有高亮当前会话、显示时间戳、消息计数等完整 UI
- **但是**: `grep -r "ThreadList" packages/flitter-cli/src/` → **零结果**

**这意味着**:
1. 有人实现了线程列表 UI
2. 但从未将其集成到应用中
3. 可能是因为底层 `SessionState` 不支持真正的多线程

---

### 3.3 Queue + Handoff: 只有颜色定义，无任何逻辑

| 特性 | AMP 证据 | flitter-cli 状态 |
|------|---------|-----------------|
| `queuedMessage` | 88 次引用 | 0 次引用 |
| `isInQueueMode` | 11 次引用 | 0 次引用 |
| `enterQueueMode` | 方法 | 无 |
| `handoffState` | 38 次引用 | 0 次引用 |
| `handoffController` | 23 次引用 | 0 次引用 |
| `countdownSeconds` | 倒计时状态 | 无 |

**flitter-cli 唯一有的**:
```typescript
// theme-data.ts
handoffMode: Color;
handoffModeDim: Color;
queueMode: Color;
```

---

### 3.4 高频关键词完全缺失

| AMP 关键词 | 引用次数 | flitter-cli 状态 | 含义 |
|-----------|---------|-----------------|------|
| `telemetry` | **687** | 0 | 事件追踪 + 错误报告 |
| `pendingSkill` | **108** | 0 | Skill 排队注入 |
| `handoff` | **214** | 只有 handoff-tool.ts | Handoff 模式 |
| `thread` | **1749** | 只有 ThreadList 死代码 | 线程系统 |
| `agentMode` | **214** | 只有颜色定义 | Agent 模式系统 |
| `configService` | **68** | 0 | 配置服务 |
| `compaction` | **32** | 0 | 上下文压缩 |

---

## 四、与 P56-P62 阶段计划的关联

### 4.1 Fidelity 缺口 → 修复映射

| Fidelity 缺口 | 对应 P 阶段 | 优先级 |
|---------------|------------|--------|
| Skills Modal 完全缺失 (0/100) | **P60** | P0 |
| `IhR` 容器 + 4-corner overlay | **P56** | P0 |
| **线程模型架构重构** (ThreadPool vs 单 Session) | 未在 P56-P62 中 | **P0 架构级** |
| Queue Mode 完整系统 | 未在 P56-P62 中 | **P0 架构级** |
| Handoff Mode 完整系统 | 未在 P56-P62 中 | **P0 架构级** |
| Compaction 系统 | 未在 P56-P62 中 | **P0 架构级** |
| HITL Dialog 状态 + 格式 | **P58** | P1 |
| ShortcutHelp 内联架构 + Welcome Orb | **P59** | P1 |
| ActivityGroup 嵌套模型 + staggered reveal | **P57** | P1 |
| Image paste/attachment 完整流程 | 未在 P56-P62 中 | **P1 核心** |
| Command Palette 三列布局 | **P61** | P2 |
| Footer 前缀符号 + cost 条件格式 | **P62** | P2 |

### 4.2 P56-P62 覆盖范围评估

**P56-P62 只覆盖了** FEATURE-AUDIT.md 中 **已规划的 UI 缺口**：
- ✅ P56: Rich border InputArea (UI 层)
- ✅ P57: ActivityGroup tree (UI 层)
- ✅ P58: HITL dialog (UI 层 + 部分状态)
- ✅ P59: Shortcuts + Welcome (UI 层)
- ✅ P60: Skills modal (UI 层)
- ✅ P61: Command palette (UI 层)
- ✅ P62: Footer status (UI 层)

**P56-P62 未覆盖的架构级缺口**：
- ❌ 线程模型 (ThreadPool vs 单 Session)
- ❌ Queue Mode 完整系统
- ❌ Handoff Mode 完整系统
- ❌ Compaction 自动压缩
- ❌ Image paste/attachment 完整流程
- ❌ Model catalog (40+ models 元数据)
- ❌ Provider config service (细粒度设置)
- ❌ Skill System (pendingSkill 注入)
- ❌ Agent Mode System (per-mode 配置)

---

## 五、修复路线图建议

### 阶段 0: 架构决策 (必须先做)

**在开始任何 P56-P62 之前，必须回答这些问题**：

1. **线程模型**：
   - flitter-cli 是否需要真正的多线程池？
   - 还是保持单 Session 设计（像现在这样）？
   - 如果是后者，ThreadList 组件应该被删除或重新设计

2. **事件驱动架构**：
   - AMP 使用 RxJS BehaviorSubject 响应式状态管理
   - flitter-cli 使用简单的 Listener 模式
   - 是否需要引入响应式状态管理？

3. **协议层**：
   - AMP 是完整 WebSocket event-driven 协议
   - flitter-cli 是 HTTP 单次请求/响应
   - Queue/Handoff 等特性依赖 WebSocket 事件流

### 短期: 执行 P56-P62 (UI 层)

**Batch 1 (无依赖)**:
1. **P57** - ActivityGroupWidget + G1R 嵌套模型 + 90ms staggered reveal
2. **P58** - PermissionDialog 状态化 + formatToolConfirmation 分派
3. **P61** - CommandPalette 三列布局 + category 字段

**Batch 2 (依赖 P56)**:
1. **P56** - Rich Border InputArea `IhR` 容器
2. **P59** - ShortcutHelp 内联化 + Welcome Orb
3. **P60** - Skills Modal (从零创建)
4. **P62** - Footer 前缀符号 + cost 条件格式化

### 中期: 评估架构缺口

在 P56-P62 完成后，需要重新评估：

1. **Thread Management** - 是否需要真正的 ThreadPool？
2. **Queue + Handoff** - 这些特性在当前单 Session 架构下是否有意义？
3. **Compaction** - 上下文压缩在多轮对话中是否必要？
4. **Model Catalog** - 40+ models 元数据是否需要？

### 长期: Fidelity 持续监控

1. 创建 `FidelityTestHarness` + 自动化视觉回归测试
2. 维护 `behavior-contracts.md` 作为回归测试源
3. 每次重大改动后运行特性级 fidelity 审计

---

## 六、验证方法说明

### 6.1 验证范围

本次验证基于：

1. **AMP 逆向源码**: `tmux-capture/amp-source/*.js` (35 个 JS 文件)
   - 从 AMP macOS 二进制 (`amp-darwin-arm64`, 67MB Mach-O) 逆向提取
   - 使用 minified identifier 映射分析

2. **Golden 屏幕输出**: `tmux-capture/screens/*/` (9 个场景)
   - `ansi-63x244.golden` - ANSI 真彩色终端输出
   - `plain-63x244.golden` - 纯文本版本

3. **flitter-cli 实现**: `packages/flitter-cli/src/` (159+ TypeScript 文件)
   - 现有测试: 983 pass, 0 fail

### 6.2 验证维度

| 维度 | 方法 |
|------|------|
| **存在性检查** | `grep -r "keyword" src/` 零结果 = 完全缺失 |
| **代码对比** | AMP 混淆 JS 类结构 vs flitter TypeScript 类结构 |
| **行为契约** | 从 AMP 源码提取"在 X 条件下应该做 Y" |
| **架构对比** | ThreadPool vs 单 Session、事件驱动 vs HTTP 单次 |

### 6.3 评分标准

```
100-85: 完整实现，代码结构高度一致
84-70: 主要功能匹配，小差异
69-50: 部分实现，结构不同
49-10: 只有框架或颜色定义，无实质逻辑
9-0: 完全缺失或架构级不兼容
```

---

## 附录

### A. FEATURE-AUDIT.md 42 特性分类统计

| 优先级 | 数量 | 平均分 | 主要问题 |
|--------|------|--------|---------|
| P1-HIGH | 6 | **~6/100** | 架构级缺口: 线程模型、Queue、Handoff、Compaction |
| P2-MED | 25 | **~20/100** | 大量特性只有颜色/接口定义，无逻辑 |
| P3-LOW | 16 | **~5/100** | 几乎完全缺失 |

### B. AMP 高频关键词 (grep 计数)

```
thread: 1749          handoff: 214         agentMode: 214
threadId: 355         queuedMessage: 88    telemetry: 687
threadTitle: 51       pendingSkill: 108    configService: 68
ThreadView: 52        pendingApproval: 48  scrollOffset: 59
createThread: 18      compaction: 32       accessToken: 56
switchThread: 9       deepReasoning: 31    connect: 805
deleteThread: 5       reasoningEffort: 37  clipboard: 17
threadWorker: 50      ImagePreview: 57     shellMode: 8
toolUse: 146          kittyGraphics: 8      openInEditor: 9
abortController: 69   autocomplete: 32      JetBrains: 14
interrupt: 86         contextAnalyze: 28    idePicker: 21
```

### C. 关键文件索引

| 文件 | 用途 |
|------|------|
| `tmux-capture/amp-source/FEATURE-AUDIT.md` | 42 特性原始审计 |
| `GSD-PLAN-P56-P62.md` | P56-P62 阶段计划 |
| `tmux-capture/amp-source/20_thread_management.js` | 线程系统核心 |
| `tmux-capture/amp-source/20_thread_queue_handoff.js` | Queue + Handoff |
| `packages/flitter-cli/src/state/session.ts` | flitter 单 Session 架构 |
| `packages/flitter-cli/src/widgets/thread-list.ts` | 死代码示例 |

---

> 验证完成: 2026-04-06
> 执行 Agent: 4 个并行 subagents + 1 个协调器
> 总验证源: 35 AMP JS 文件 + 18 golden 文件 + 159 flitter TS 文件
