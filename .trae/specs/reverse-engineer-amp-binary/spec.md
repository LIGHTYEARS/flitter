# Amp CLI Binary 逆向分析 Spec

## Why

需要对 `/tmux-capture/amp-bin-to-reverse-engineered`（Bun 编译的 ~67MB Mach-O arm64 二进制）进行系统性逆向分析，提取其内嵌 JS 源码中的完整架构知识。焦点涵盖 7 个维度：TUI 渲染核心抽象/原语、数据流、状态管理、整体架构、模式系统、Chat View Widget 树、Subagent 调用链。

## What Changes

- 产出 **1 份综合逆向分析文档** `AMP-BINARY-REVERSE-ANALYSIS.md`，保存于 `packages/flitter-amp/.ref/amp-cli/`
- 文档按 7 个维度组织，每个维度包含：逆向发现、混淆名↔真实名映射、数据流图（文字）、关键代码片段引用
- 不涉及代码修改

## Impact

- Affected code: 无（纯分析产出）
- 产出物为 flitter-amp 后续开发的参考架构文档

## 分析维度

### 1. TUI Rendering Core Abstraction & Primitives

从二进制提取的证据：
- **Flutter-like 三树架构**: Widget（`NR`=StatefulWidget, `B0`=StatelessWidget）→ Element → RenderObject（`O9`=RenderBox）
- **State 类**: `wR` = State<T>，`setState(() => {...})` 触发重建
- **核心渲染原语**:
  - `xT` = RichText（接受 `G` = TextSpan + `cT` = TextStyle）
  - `T0` = Row（`mainAxisSize`, `crossAxisAlignment`）
  - `xR` = Column
  - `Ta` = Stack（`children: QT`）
  - `ca` = Positioned（`top/left/right/bottom/height`）
  - `SR` = Container（`constraints`, `decoration`, `padding`）
  - `uR` = Padding
  - `j0` = Expanded / Flexible
  - `XT` = SizedBox（`width/height`）
  - `N0` = Center / Overlay wrapper
  - `I3` = SingleChildScrollView（`controller`）
  - `Q3` = ScrollController（`followMode`, `maxScrollExtent`, `offset`）
  - `o0` = BoxConstraints
- **PaintContext**: `T.setCell(x, y, {char, width, style})` — 直接操作 ScreenBuffer cell
- **LeafRenderObject**: `to` = LeafRenderObjectWidget, `bp` = LeafElement

### 2. Data Flow

从二进制提取的数据流管线：

```
User Input → TextField (textController) → onTextSubmitted
    → submitPrompt → activeThreadHandle → threadService.exclusiveSyncReadWriter
    → LLM Inference (anthropic API) → SSE streaming
    → Thread.messages mutation → setState → Widget rebuild → ScreenBuffer → Terminal
```

关键数据容器：
- **`f0` = BehaviorSubject<T>**（RxJS-like reactive state）
- **`AR` = Observable**（工具调用返回 Observable stream）
- **Thread**: `{id, v, messages[], agentMode, created, title, ...}`
- **Message**: `{role: "user"|"assistant", content: Block[], meta?}`
- **Block**: `{type: "text"|"tool_use"|"tool_result"|"thinking", ...}`
- **`ThreadService`**（`azT` 类）: 管理 thread 的 CRUD + 缓存 + 上传 + 脏追踪

### 3. State Management

二进制中识别到的状态管理模式：

1. **Widget 级 setState**: `this.setState(() => { this.xxx = yyy })` — 同 Flutter，触发单组件重建
2. **InheritedWidget 传播**: 
   - `Z0.of(T)` = Theme.of(context)（返回 colorScheme）
   - `$R.of(T)` = AppTheme.of(context)（返回 app-level theme）
   - `I9.of(T)` = MediaQuery.of(context)（返回 size/capabilities）
3. **BehaviorSubject/Observable 流**: ThreadService 内部用 `f0` (BehaviorSubject) 管理每个 thread 的状态
4. **依赖注入**: `this.widget.dependencies` 是 props 注入的 service 集合：
   - `activeThreadHandle`: 当前 thread 的读写句柄
   - `threadService`: Thread CRUD
   - `threadPool`: 线程池管理（DTW/Actors 模式）
   - `configService`: 配置服务
   - `skillService`: Skill 管理
   - `mcpService`: MCP server 管理
   - `toolService`: 工具注册表
   - `history`: prompt 历史
   - `mcpTrustHandler`: MCP 信任策略
5. **Controller 模式**: 
   - `textController` (TextEditingController)
   - `toastController`
   - `agentModeController`（管理 smart/code/deep/ask 模式切换）
   - `todoScrollController` (ScrollController)
   - `deepModeEffortHintController`（deep mode shimmer 动画）

### 4. Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Bun Runtime (Mach-O arm64)                │
├─────────────────────────────────────────────────────────────┤
│  CLI Entry (amp threads / amp run / amp ...)                │
│  ├── Auth (SSO, OAuth, API key)                             │
│  ├── ConfigService (settings, preferences)                  │
│  └── TUI Instance (tuiInstance / d9.instance)               │
├─────────────────────────────────────────────────────────────┤
│  Services Layer (Dependency Injection)                      │
│  ├── ThreadService (azT) — CRUD + cache + upload            │
│  ├── ThreadPool — DTW/Actors mode orchestration             │
│  ├── SkillService — skill discovery, install, invoke        │
│  ├── MCPService — MCP server lifecycle                      │
│  ├── ToolService — tool registration + execution            │
│  ├── ConfigService — user/workspace settings                │
│  └── History — prompt history                               │
├─────────────────────────────────────────────────────────────┤
│  Widget Layer (Flutter-like)                                │
│  ├── AppState (主 StatefulWidget)                            │
│  │   ├── build() → IW → vb → VH → bW → cb → xS → ...      │
│  │   ├── buildBottomWidget() → YrT (BottomGrid)            │
│  │   └── Modals/Overlays (Stack + Positioned)               │
│  ├── ThreadView / MessageList (ScrollView + StickyHeader)   │
│  ├── ToolCallWidget (35+ tool type dispatch)                │
│  ├── PromptBar (Td = TextField + Autocomplete)              │
│  └── BottomGrid (YrT) — overlay texts + resize             │
├─────────────────────────────────────────────────────────────┤
│  TUI Framework (Flutter-like rendering core)                │
│  ├── Widget → Element → RenderObject 三树                   │
│  ├── BuildOwner → PipelineOwner → SchedulerBinding          │
│  ├── ScreenBuffer (双缓冲 + diff + SGR 优化)                │
│  ├── InputParser (CSI/SS3/Kitty keyboard)                   │
│  └── FocusManager + HitTest + Mouse                         │
└─────────────────────────────────────────────────────────────┘
```

### 5. Different Modes

从二进制中提取到的模式系统：

**Agent Modes** (`agentModeController`):
| Mode | 混淆色函数 `f$()` | 描述 |
|------|-------------------|------|
| `smart` | 默认主色 | 通用 agent 模式，支持 +fast(6x$) |
| `code` | 独立色 | 编码专注模式 |
| `deep` | 独立色 + shimmer 动画 | 深度推理模式，显示 elapsed timer |
| `ask` | 独立色 | 问答模式 |

**UI Modes**（互斥状态）:
- **Shell Mode**: `$` 或 `$$` 前缀触发，状态栏显示 "shell mode" 或 "shell mode (incognito)"
- **Handoff Mode**: `handoffState.isInHandoffMode`，显示 "handoff" + spinner/countdown
- **Queue Mode**: `isInQueueMode`，显示 "queue"
- **Selection Mode**: `isMessageViewInSelectionMode`
- **DTW Mode**: `threadPool.isDTWMode()`（Durable Thread Workers）
- **Actors Mode**: `threadPool.isThreadActorsMode()`

**Modal Modes**（叠加层，不互斥）:
- Command Palette: `isShowingPalette`
- Skill List: `isShowingSkillListModal`
- MCP Status: `isShowingMCPStatusModal`
- Prompt History: `isShowingPromptHistoryPicker`
- Context Analyze: `isShowingContextAnalyzeModal`
- File Changes: `isShowingFileChangesOverlay`
- Context Detail: `isShowingContextDetailOverlay`
- Confirmation: `isShowingConfirmationOverlay`
- OAuth: `pendingOAuthRequestQueue`
- Image Preview: `imagePreview / fileImagePreviewPath / painterImagePreview`
- Skill Preview: `skillPreview`
- IDE Picker: `isShowingIdePicker`
- JetBrains Installer: `isShowingJetBrainsInstaller`
- Shortcuts Help: `isShowingShortcutsHelp`

### 6. Chat View Widgets

AppState.build() 的 Widget 树结构（逆向提取）：

```
AppState.build(T)
├── [JetBrains mode] xS → Nt → kc → K0R
└── [Normal mode]
    IW (switchToThread provider)
    └── vb (threadViewStates provider)
        └── VH (file image preview provider)
            └── bW (painter image preview provider)
                └── cb (toast controller)
                    └── xS (scaffold)
                        └── QP (enabled: !palette && !idePicker)
                            └── NQT (toast overlay)
                                └── Nt (actions)
                                    └── kc (shortcuts)
                                        └── Ta (Stack)
                                            ├── [Modal overlays...]
                                            │   ├── H8R (SkillListModal)
                                            │   ├── J0R (MCPStatusModal)
                                            │   ├── L8R (PromptHistoryPicker)
                                            │   ├── I8R (MysteriousMessage)
                                            │   ├── a9R (MCPTrustModal)
                                            │   ├── lRR (AuthLoginModal)
                                            │   ├── $8R (OAuthModal)
                                            │   ├── N0R (InputDialog)
                                            │   ├── o0R (ConfirmDialog)
                                            │   ├── RRR (FileChangesOverlay)
                                            │   ├── f0R (ContextDetailOverlay)
                                            │   ├── l0R (ConfirmationOverlay)
                                            │   ├── w0R (ImagePreview)
                                            │   ├── qM (FileImagePreview)
                                            │   ├── q8R (SkillPreview)
                                            │   ├── c0R (CommandPalette)
                                            │   └── M0R (IDEPicker)
                                            └── [Main content layer]
```

AppState.buildBottomWidget() → `YrT` (BottomGrid):
```
YrT (BottomGrid)
├── leftChild: j0 → Td (TextField/Autocomplete)
│   ├── controller: textController
│   ├── triggers: [ef] (AutocompleteTrigger)
│   ├── submitKey: Enter / Cmd+Enter
│   ├── shellPromptRules: $ / $$ detection
│   ├── pendingSkills: skill attachments
│   ├── imageAttachments: image uploads
│   └── topWidget: U8R (ShortcutsHelp)
├── rightChild1: D8R (QueuedMessages)
├── rightChild2: J8R (TodoList with ScrollController)
├── overlayTexts: [position-based text overlays]
│   ├── top-left: mode indicator (shell/handoff/queue/dtw/actors)
│   ├── top-right: agent mode label (smart/code/deep/ask +fast)
│   ├── bottom-left: contextual hints (Esc to abort, etc.)
│   └── bottom-right: cwd + git branch + token usage + cost
└── overlayLayer: animations (mode pulse, shimmer, falling)
```

### 7. Subagent Invocation

从二进制中提取的 Subagent 系统：

**核心类 `wi` (SubagentRunner)**:
- `run(T, {systemPrompt, model, spec}, {conversation, toolService, env})` → Observable
- 内部循环：inference → tool calls → execute tools → update conversation → repeat
- 支持 `followUps`（多轮后续）

**Handoff 机制**:
- `ct.handoff(deps, {threadID, goal, mode, agentMode, ...})` → 创建子线程
- DTW Handoff: `dtwHandoffService.createHandoffThread(...)` → Durable Thread Worker
- Legacy Handoff: `ct.handoff(...)` → 本地线程分裂
- Countdown: `handoffState.countdownSeconds`（自动提交倒计时）

**Tool-based Subagent**（Task Tool）:
- `TaskTool` = subagent 工具调用入口
- `I5R(T, R)` → 创建 Observable 包装
- `g5R(prompt, config, toolDefs, env)` → `new wi().run(...)` 
- 模型选择: `R.model || "inherit"`（继承父 agent 模式对应模型）
- 工具过滤: `R.toolPatterns || ["*"]`
- Skill 注入: `R.skills` → 加载 skill systemPrompt 片段

**Oracle Tool**（深度分析子 agent）:
- `MVR` = Oracle tool handler
- 收集 fileMentions → 构建 systemPrompt → `new wi().run($VR, ...)`
- 独立 reasoningEffort 配置

**Painter Tool**（图像生成子 agent）:
- 调用 `fER(...)` 生成图像
- 带重试逻辑（指数退避）

**Web Tools**:
- `wVR` = MCP Resource Reader
- `vXR` = Web Search（`N3.webSearch2`）
- `XVR` = Web Fetch（`N3.extractWebPageContent`）

## ADDED Requirements

### Requirement: 综合逆向分析文档
系统 SHALL 产出一份综合文档，覆盖上述 7 个维度的逆向发现，供 flitter-amp 开发参考。

#### Scenario: 文档产出
- **WHEN** 分析完成
- **THEN** 文档包含所有 7 个维度的详细分析，含混淆名映射表、数据流图、Widget 树结构
