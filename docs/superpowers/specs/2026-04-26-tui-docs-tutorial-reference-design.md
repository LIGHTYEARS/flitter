# @flitter/tui 教程与 API 参考文档设计

> **日期:** 2026-04-26
> **状态:** 待审核
> **目标:** 完善 @flitter/tui 作为 TUI 渲染框架和组件库的教程及 API 文档，集成到现有 Rspress doc site

---

## 1. 背景

### 现有文档状态

Rspress doc site (`website/docs/`) 已有 28 页，全部为中文：

| 分区 | 页数 | 质量 | 覆盖度 |
|---|---|---|---|
| 指南 (guide/) | 4 | 完整 | 入门安装、项目结构 |
| TUI 框架 (tui/) | 11 | 完整 | 概述、三棵树、Widget、核心类型、颜色、布局、渲染、输入、焦点、Actions、自定义 Widget |
| 架构 (architecture/) | 4 | 完整 | Monorepo、agent-core、LLM、数据层 |
| API (api/) | 2 | 完整 | Widget API 概览、Agent 工具 |

### 缺失内容

1. **子系统教程**：滚动、浮层/弹窗、文本选择、手势、Markdown、性能 — 无教程
2. **Widget 深度参考**：~30 个 Widget 无 API 文档（Table、SplitPane、DialogBox、Toggle、Badge、ImageWidget 等）
3. **实战教程**：无端到端的构建指南
4. **可运行示例**：23 个 example 文件未关联到文档
5. **子系统 API 参考**：Screen、TuiController、VtParser、Binding、Tree 内部无文档

### 已有资产

- `packages/tui/docs/{layout,style,text}.md` — 3 份深度 API 参考（~6700 字），可集成
- `examples/*.ts` — 23 个可运行 demo（6 静态 + 17 交互式）
- 完整的 Rspress 基础设施（构建、搜索、主题）

---

## 2. 设计方案：Split-Nav 单站点

### 导航重构

**旧导航：** `指南 | TUI 框架 | 架构 | API`

**新导航：** `快速上手 | 教程 | 参考 | 架构`

- **快速上手**：原 `guide/` 内容，面向新用户
- **教程**：概念讲解 + 子系统指南 + 实战构建
- **参考**：Widget API + 子系统 API，面向查阅
- **架构**：不变

### 目录结构

```
website/docs/
├── index.md                              # 首页（不变）
├── _nav.json                             # 更新为 4 个新 tab
│
├── quickstart/                           # ← 原 guide/ 重命名
│   ├── _meta.json
│   ├── introduction.md                   # 移动自 guide/
│   ├── getting-started.md                # 移动自 guide/
│   ├── project-structure.md              # 移动自 guide/
│   └── examples.md                       # 移动自 guide/
│
├── tutorial/                             # ← 新分区
│   ├── _meta.json
│   ├── core-concepts/
│   │   ├── _meta.json
│   │   ├── three-tree.md                 # 移动自 tui/
│   │   ├── rendering.md                  # 移动自 tui/
│   │   └── custom-widgets.md             # 移动自 tui/
│   ├── subsystems/
│   │   ├── _meta.json
│   │   ├── layout.md                     # 重写自 tui/layout.md（教程化）
│   │   ├── input-handling.md             # 移动自 tui/
│   │   ├── focus-system.md               # 移动自 tui/
│   │   ├── actions-shortcuts.md          # 移动自 tui/
│   │   ├── scroll.md                     # ★ 新建
│   │   ├── overlay.md                    # ★ 新建
│   │   ├── selection.md                  # ★ 新建
│   │   ├── gestures.md                   # ★ 新建
│   │   ├── markdown.md                   # ★ 新建
│   │   └── performance.md                # ★ 新建
│   └── walkthroughs/
│       ├── _meta.json
│       ├── build-a-dashboard.md          # ★ 新建
│       ├── build-a-file-browser.md       # ★ 新建
│       └── build-a-chat-tui.md           # ★ 新建
│
├── reference/                            # ← 新分区（替代 api/）
│   ├── _meta.json
│   ├── overview.md                       # 移动自 tui/overview.md
│   ├── core-types.md                     # 移动自 tui/core-types.md
│   ├── color-and-styling.md              # 移动自 tui/color-and-styling.md
│   ├── widgets/
│   │   ├── _meta.json
│   │   ├── layout.md                     # 集成 packages/tui/docs/layout.md + 扩展
│   │   ├── text.md                       # 集成 packages/tui/docs/text.md + 扩展
│   │   ├── style.md                      # 集成 packages/tui/docs/style.md + 扩展
│   │   ├── display.md                    # ★ 新建
│   │   ├── interaction.md                # ★ 新建
│   │   ├── scroll.md                     # ★ 新建
│   │   ├── overlay.md                    # ★ 新建
│   │   ├── table.md                      # ★ 新建
│   │   └── media.md                      # ★ 新建
│   ├── subsystems/
│   │   ├── _meta.json
│   │   ├── screen.md                     # ★ 新建
│   │   ├── tui-controller.md             # ★ 新建
│   │   ├── vt-parser.md                  # ★ 新建
│   │   ├── binding.md                    # ★ 新建
│   │   ├── tree.md                       # ★ 新建
│   │   └── debug.md                      # ★ 新建
│   └── tools.md                          # 移动自 api/agent-tools.md
│
└── architecture/                         # 不变
    ├── _meta.json
    ├── monorepo.md
    ├── agent-core.md
    ├── llm-integration.md
    └── data-layer.md
```

### 页面统计

| 类别 | 移动/复用 | 新建 | 合计 |
|---|---|---|---|
| 快速上手 | 4 | 0 | 4 |
| 教程 > 核心概念 | 3 | 0 | 3 |
| 教程 > 子系统 | 4 | 6 | 10 |
| 教程 > 实战 | 0 | 3 | 3 |
| 参考 > 顶层 | 3 | 0 | 3 |
| 参考 > Widget | 3(扩展) | 6 | 9 |
| 参考 > 子系统 | 0 | 6 | 6 |
| 参考 > 工具 | 1 | 0 | 1 |
| 架构 | 4 | 0 | 4 |
| **合计** | **22** | **21** | **43** |

---

## 3. 新建页面详细规格

### 3.1 教程 > 子系统指南（6 页）

每页遵循统一模板：

```
# {子系统名称}

## 概述
一段话说明本子系统解决什么问题

## 核心概念
关键类和它们的关系图

## 基本用法
最小可运行示例 + 逐行解释

## 进阶用法
2-3 个进阶场景

## 与其他子系统的配合
说明如何与 Widget 树/焦点/主题等配合

## 完整示例
一个综合示例 + 对应 examples/ 文件的运行命令

## 下一步
链接到对应的参考页面
```

#### `tutorial/subsystems/scroll.md` (~800 字)
- **核心概念**: ScrollController (jumpTo, followMode, atBottom), ScrollPhysics (Clamping vs Fling), Scrollable
- **基本用法**: ListView with builder pattern 实现虚拟化渲染
- **进阶**: ScrollBehavior vim 键绑定 (j/k), Scrollbar 集成, FlingScrollPhysics 惯性滚动
- **完整示例**: 自动跟随的日志查看器
- **关联 example**: `examples/tui-scrollable-demo.ts`, `examples/tui-scroll-demo.ts`

#### `tutorial/subsystems/overlay.md` (~800 字)
- **核心概念**: Overlay/OverlayEntry 生命周期, OverlayContainer, ModalStack (push/pop)
- **基本用法**: 创建浮动提示层
- **进阶**: CompositedTransformTarget/Follower 锚定弹窗, FuzzyPicker 搜索选择, CommandPalette 集成
- **完整示例**: 多层 Modal 嵌套 + 搜索
- **关联 example**: `examples/tui-overlay-demo.ts`, `examples/tui-command-palette-demo.ts`

#### `tutorial/subsystems/selection.md` (~600 字)
- **核心概念**: SelectionArea, SelectionKeepAliveBoundary, Clipboard
- **基本用法**: 包裹内容区域启用文本选择
- **进阶**: Ctrl+A 全选, 双击/三击选词/选行, 跨视口保持选区
- **完整示例**: 可选择的文本查看器
- **关联 example**: `examples/tui-editing-demo.ts`

#### `tutorial/subsystems/gestures.md` (~600 字)
- **核心概念**: HitTestResult, MouseManager 路由管线, MouseRegion vs GestureDetector
- **基本用法**: 点击事件处理
- **进阶**: 双击检测, 拖拽, 悬停光标变化
- **完整示例**: 可拖拽的分割面板
- **关联 example**: `examples/tui-interactive-demo.ts`

#### `tutorial/subsystems/markdown.md` (~500 字)
- **核心概念**: MarkdownParser (micromark + GFM), MarkdownRenderer → TextSpan
- **基本用法**: 渲染 Markdown 字符串
- **进阶**: 代码块语法高亮, 主题化输出, GFM 表格/任务列表
- **完整示例**: Markdown 预览 Widget
- **关联 example**: `examples/tui-markdown-demo.ts`

#### `tutorial/subsystems/performance.md` (~500 字)
- **核心概念**: PerformanceTracker, FrameStatsOverlay, Screen 脏区优化
- **基本用法**: 启用性能追踪
- **进阶**: 常见性能陷阱 (setState 在 build 中调用, 不必要的重建), 调试日志, FLITTER_LOG_LEVEL
- **完整示例**: 带 FPS 覆盖层的应用
- **关联 example**: `examples/debug-paint-pipeline.ts`

### 3.2 教程 > 实战构建（3 页）

每页 ~1000-1500 字，分步骤构建可运行应用。

#### `tutorial/walkthroughs/build-a-dashboard.md`
**最终效果**: 多面板数据仪表盘（状态栏 + 指标面板 + 数据表格）

步骤:
1. 创建应用骨架 (`runApp` + `StatefulWidget`)
2. 布局结构 (`Column` > `Row` > 面板)
3. 状态栏 (`Container` + `Text` + 主题颜色)
4. 指标面板 (`ProgressBar` + `Badge`)
5. 数据表格 (`Table` + `StickyHeader`)
6. 定时刷新 (`Timer` + `setState`)
7. 主题集成 (`ThemeData` + `ColorScheme`)

**使用的 Widget**: Column, Row, Container, SizedBox, ProgressBar, Badge, Table, StickyHeader, Theme

#### `tutorial/walkthroughs/build-a-file-browser.md`
**最终效果**: 双面板文件浏览器（文件列表 + 预览）

步骤:
1. 创建应用骨架
2. 文件列表 (`ListView` + `ScrollController`)
3. 键盘导航 (`Actions/Shortcuts` + j/k/Enter/Backspace)
4. 焦点切换 (`Focus` + Tab 遍历)
5. 分割面板 (`SplitPane`)
6. 文件预览（文本: `RichText`, Markdown: `MarkdownRenderer`）
7. 状态栏（当前路径 + 文件数）

**使用的 Widget**: ListView, Focus, Actions, Shortcuts, SplitPane, RichText, TextField, Container

#### `tutorial/walkthroughs/build-a-chat-tui.md`
**最终效果**: 聊天界面（消息列表 + 输入框 + 命令面板）

步骤:
1. 创建应用骨架
2. 消息列表 (`ListView` + `ScrollController.followMode`)
3. 输入框 (`TextField` + `TextEditingController`)
4. Markdown 消息渲染 (`MarkdownRenderer`)
5. 命令面板 (`CommandPalette` + `/` 触发)
6. 浮层通知 (`NotificationBanner`)
7. 主题和样式

**使用的 Widget**: TextField, ListView, ScrollController, MarkdownRenderer, CommandPalette, Overlay, NotificationBanner

### 3.3 参考 > Widget 参考（6 新建 + 3 扩展）

每个 Widget 条目遵循统一格式：

```
### WidgetName

> 一句话描述

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|

**属性/方法:**

| 名称 | 类型 | 说明 |
|---|---|---|

**示例:**
\```typescript
// 最小用法
\```

**相关:** [OtherWidget](link)
```

#### `reference/widgets/display.md` (~800 字)
覆盖: Container, Badge, Toggle, ProgressBar, AnimatedProgressBar, BrailleSpinner, NotificationBanner, Disclosure, DialogBox, Offstage, ForceDimWidget, SizeChangedNotifier

#### `reference/widgets/interaction.md` (~600 字)
覆盖: GestureDetector (onTap/onDoubleTap/onLongPress/onPan/onScale 全部回调), MouseRegion (onEnter/onExit/onHover 全部回调), Focus widget, FocusNode API

#### `reference/widgets/scroll.md` (~600 字)
覆盖: ListView, Scrollable, Viewport, ViewportWithPosition, Scrollbar, ScrollController (全部属性和方法), ScrollPhysics, ClampingScrollPhysics, FlingScrollPhysics, ScrollBehavior, VelocityTracker

#### `reference/widgets/overlay.md` (~700 字)
覆盖: Overlay, OverlayEntry, OverlayContainer, ModalStack/ModalStackController, FuzzyPicker (全部 props 和回调), CommandPalette, AutocompleteController, PopupOverlay, ConfirmDialog, PromptDialog, SpinnerOverlay, LayerLink, CompositedTransformTarget, CompositedTransformFollower

#### `reference/widgets/table.md` (~400 字)
覆盖: Table (columns/rows/alignment), HelpTable (2 列响应式), StickyHeader

#### `reference/widgets/media.md` (~400 字)
覆盖: ImageWidget (Kitty graphics protocol), RenderImage, RenderChart, ChartData, ChartSeries

#### 扩展页面

- `reference/widgets/layout.md` — 在 `packages/tui/docs/layout.md` 基础上增加: IntrinsicHeight, OverlapColumn, SplitPane, Spacer, ClipBox, Center, Align, MediaQuery
- `reference/widgets/text.md` — 在 `packages/tui/docs/text.md` 基础上增加: char-width 全部工具函数 API, emoji 检测 API
- `reference/widgets/style.md` — 在 `packages/tui/docs/style.md` 基础上增加: AppColorScheme 完整参考, ThemeRegistry API, TOML 主题加载器 API

### 3.4 参考 > 子系统 API（6 页）

面向框架高级用户和贡献者，每页 ~400-600 字。

#### `reference/subsystems/screen.md`
- Screen 双缓冲 (front/back) + 脏区追踪
- ScreenBuffer 行/列操作
- Cell 结构 (char + TextStyle + url)
- ColorDepth 枚举 (truecolor/256/16/none)
- AnsiRenderer diff 算法 + 转义序列表

#### `reference/subsystems/tui-controller.md`
- TuiController 生命周期 (init → raw mode → alt screen → mouse → cleanup)
- TerminalCapabilities 检测
- TerminalSize + SIGWINCH 处理
- Kitty keyboard protocol (CSI u 解析 + flags=7)
- modifyOtherKeys
- 同步输出 (SYNC_START/SYNC_END)

#### `reference/subsystems/vt-parser.md`
- VtParser 状态机（字节流 → VT 序列）
- InputParser 事件输出 (KeyEvent, MouseEvent, PasteEvent, ResizeEvent, FocusEvent)
- KeyEvent 修饰符 (MODIFIERS_NONE, Shift, Ctrl, Alt, Meta 组合)
- SGR 鼠标协议解码

#### `reference/subsystems/binding.md`
- WidgetsBinding 单例 + 初始化
- runApp(widget, options?) 完整 API
- 帧管线: Build → Layout → Paint → Present
- BuildOwner + PipelineOwner 协作
- onRootElementMounted / onCapabilitiesReady 钩子

#### `reference/subsystems/tree.md`
- Widget / Key / GlobalKey
- Element 生命周期 (mount → update → unmount)
- ComponentElement vs RenderObjectElement vs InheritedElement
- RenderObject / RenderBox
- BoxConstraints 协议 (tight/loose/unbounded)
- BuildContext 查询 API

#### `reference/subsystems/debug.md`
- Logger API (debug/info/warn/error)
- LogLevel 配置 (FLITTER_LOG_LEVEL)
- LogBackend 自定义
- WidgetTreeDebugger (snapshot API)
- WidgetREPLServer (Unix socket 连接)
- WidgetDebugAPI ($ 变量)

---

## 4. 可运行示例策略

### 原则

1. 每个教程/参考页面中的代码示例必须可运行
2. 优先复用 `examples/` 中已有的 23 个 demo
3. 无法复用时，为教程创建新的 example 文件

### 示例关联表

| 文档页面 | 关联 example | 状态 |
|---|---|---|
| scroll 教程 | `tui-scrollable-demo.ts`, `tui-scroll-demo.ts` | 已有 |
| overlay 教程 | `tui-overlay-demo.ts`, `tui-command-palette-demo.ts` | 已有 |
| selection 教程 | `tui-editing-demo.ts` | 已有 |
| gestures 教程 | `tui-interactive-demo.ts` | 已有 |
| markdown 教程 | `tui-markdown-demo.ts` | 已有 |
| performance 教程 | `debug-paint-pipeline.ts` | 已有 |
| dashboard 实战 | — | ★ 新建 `examples/tui-dashboard-demo.ts` |
| file-browser 实战 | — | ★ 新建 `examples/tui-file-browser-demo.ts` |
| chat 实战 | `tui-conversation-demo.ts` (部分) | ★ 新建 `examples/tui-chat-demo.ts` |

### 文档中的示例呈现

使用 Rspress 的 callout 语法：

```markdown
:::tip 运行示例
\```bash
bun run examples/tui-scrollable-demo.ts
\```
:::
```

---

## 5. 现有页面迁移计划

### 文件移动映射

| 原路径 | 新路径 | 操作 |
|---|---|---|
| `guide/introduction.md` | `quickstart/introduction.md` | 移动 |
| `guide/getting-started.md` | `quickstart/getting-started.md` | 移动 |
| `guide/project-structure.md` | `quickstart/project-structure.md` | 移动 |
| `guide/examples.md` | `quickstart/examples.md` | 移动 |
| `tui/overview.md` | `reference/overview.md` | 移动 |
| `tui/three-tree.md` | `tutorial/core-concepts/three-tree.md` | 移动 |
| `tui/widgets.md` | `reference/widgets/` 各页 | 拆分集成 |
| `tui/core-types.md` | `reference/core-types.md` | 移动 |
| `tui/color-and-styling.md` | `reference/color-and-styling.md` | 移动 |
| `tui/layout.md` | `tutorial/subsystems/layout.md` | 重写为教程 |
| `tui/rendering.md` | `tutorial/core-concepts/rendering.md` | 移动 |
| `tui/input-handling.md` | `tutorial/subsystems/input-handling.md` | 移动 |
| `tui/focus-system.md` | `tutorial/subsystems/focus-system.md` | 移动 |
| `tui/actions-shortcuts.md` | `tutorial/subsystems/actions-shortcuts.md` | 移动 |
| `tui/custom-widgets.md` | `tutorial/core-concepts/custom-widgets.md` | 移动 |
| `api/tui-widgets.md` | `reference/widgets/` 各页 | 拆分集成 |
| `api/agent-tools.md` | `reference/tools.md` | 移动 |

### 需要拆分集成的页面

**`tui/widgets.md`** (1400 字) — 当前是所有 Widget 的概览。内容按类别拆分：
- Text/RichText/TextSpan → `reference/widgets/text.md`
- Column/Row/Flex/Expanded/Flexible/Spacer → `reference/widgets/layout.md`
- Container/Padding/SizedBox/Center/Align/ClipBox/BoxDecoration → `reference/widgets/layout.md`
- Stack/Positioned → `reference/widgets/layout.md`
- MouseRegion/GestureDetector → `reference/widgets/interaction.md`
- ListView/ScrollController/Scrollbar/ScrollBehavior → `reference/widgets/scroll.md`
- TextField/TextEditingController → `reference/widgets/interaction.md`
- Overlay/OverlayEntry/CommandPalette/FuzzyPicker → `reference/widgets/overlay.md`
- MediaQuery/AppColorScheme/ThemeData → `reference/widgets/style.md`
- Focus/FocusNode → `reference/widgets/interaction.md`
- Shortcuts/Actions/KeyActivator → `reference/widgets/interaction.md`

**`api/tui-widgets.md`** (1200 字) — 当前是 Widget API 签名合集。按同样的类别映射拆分到 `reference/widgets/` 各页，作为各 Widget 的 API 签名部分。

---

## 6. 配置变更

### `_nav.json`

```json
[
  { "text": "快速上手", "link": "/quickstart/introduction", "activeMatch": "/quickstart/" },
  { "text": "教程",     "link": "/tutorial/core-concepts/three-tree", "activeMatch": "/tutorial/" },
  { "text": "参考",     "link": "/reference/overview", "activeMatch": "/reference/" },
  { "text": "架构",     "link": "/architecture/monorepo", "activeMatch": "/architecture/" }
]
```

### `_meta.json` 文件

每个新目录需要一个 `_meta.json` 定义侧边栏顺序。关键的 `tutorial/_meta.json`:

```json
[
  { "type": "dir", "name": "core-concepts", "label": "核心概念" },
  { "type": "dir", "name": "subsystems",    "label": "子系统指南" },
  { "type": "dir", "name": "walkthroughs",  "label": "实战构建" }
]
```

`reference/_meta.json`:

```json
[
  "overview",
  "core-types",
  "color-and-styling",
  { "type": "dir", "name": "widgets",    "label": "Widget 参考" },
  { "type": "dir", "name": "subsystems", "label": "子系统 API" },
  "tools"
]
```

---

## 7. 质量标准

### 内容要求

1. **语言**: 中文，与现有文档一致
2. **风格**: 简洁技术型 — 要点列表、表格、代码块为主，叙述性文字最小化
3. **代码示例**: 使用 `new Widget({})` 构造器风格（与现有文档一致）
4. **每页必须有**: 至少一个可运行的代码示例 + 对应的 `bun run` 命令
5. **交叉引用**: 教程页面末尾链接到对应的参考页面；参考页面顶部链接到对应的教程

### 验证标准

1. `pnpm docs:build` 成功，无死链
2. 所有 `bun run examples/*.ts` 可正常运行
3. 新建的 example 文件有 JSDoc 模块注释 + `Run:` 行
4. 侧边栏导航逻辑正确（_meta.json 排序符合学习路径）

---

## 8. 工作量估算

| 工作项 | 页数 | 预计字数 |
|---|---|---|
| 配置变更 (_nav.json, _meta.json × 8) | — | — |
| 文件移动 + 路径更新 | 17 页 | 0（纯移动） |
| 拆分集成 (widgets.md + tui-widgets.md) | 2 → 9 | ~3,000（重组） |
| 扩展 (layout/text/style 参考) | 3 页 | ~3,000（新增部分） |
| 新建教程 > 子系统 | 6 页 | ~3,800 |
| 新建教程 > 实战 | 3 页 | ~3,500 |
| 新建参考 > Widget | 6 页 | ~3,500 |
| 新建参考 > 子系统 | 6 页 | ~2,900 |
| 新建 example 文件 | 3 文件 | ~600 行代码 |
| **合计** | **43 页 + 3 example** | **~19,700 字 + ~600 行** |
