# @flitter/tui Documentation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Rspress doc site from 4-tab (指南|TUI框架|架构|API) to a split-nav structure (快速上手|教程|参考|架构), adding 21 new documentation pages, 3 example files, and integrating existing packages/tui/docs content.

**Architecture:** Single Rspress site with split navigation. Existing pages are moved (not copied) to new directories. Two large pages (widgets.md, tui-widgets.md) are split by category into 9 reference pages. New content is hand-written Chinese documentation following the existing terse technical style.

**Tech Stack:** Rspress (2.0.0-beta.12), Markdown, TypeScript (examples), Bun

---

## File Structure

### Configuration files (create/modify)

- Modify: `website/docs/_nav.json` — update 4 nav entries
- Create: `website/docs/quickstart/_meta.json`
- Create: `website/docs/tutorial/_meta.json`
- Create: `website/docs/tutorial/core-concepts/_meta.json`
- Create: `website/docs/tutorial/subsystems/_meta.json`
- Create: `website/docs/tutorial/walkthroughs/_meta.json`
- Create: `website/docs/reference/_meta.json`
- Create: `website/docs/reference/widgets/_meta.json`
- Create: `website/docs/reference/subsystems/_meta.json`

### Moved pages (17 files)

- `guide/*.md` → `quickstart/*.md` (4 files)
- `tui/overview.md` → `reference/overview.md`
- `tui/three-tree.md` → `tutorial/core-concepts/three-tree.md`
- `tui/rendering.md` → `tutorial/core-concepts/rendering.md`
- `tui/custom-widgets.md` → `tutorial/core-concepts/custom-widgets.md`
- `tui/layout.md` → `tutorial/subsystems/layout.md`
- `tui/input-handling.md` → `tutorial/subsystems/input-handling.md`
- `tui/focus-system.md` → `tutorial/subsystems/focus-system.md`
- `tui/actions-shortcuts.md` → `tutorial/subsystems/actions-shortcuts.md`
- `tui/core-types.md` → `reference/core-types.md`
- `tui/color-and-styling.md` → `reference/color-and-styling.md`
- `api/agent-tools.md` → `reference/tools.md`

### Split pages (2 source → 9 target)

- `tui/widgets.md` + `api/tui-widgets.md` → `reference/widgets/{layout,text,style,display,interaction,scroll,overlay,table,media}.md`

### New tutorial pages (9 files)

- `tutorial/subsystems/{scroll,overlay,selection,gestures,markdown,performance}.md`
- `tutorial/walkthroughs/{build-a-dashboard,build-a-file-browser,build-a-chat-tui}.md`

### New reference pages (6 files)

- `reference/subsystems/{screen,tui-controller,vt-parser,binding,tree,debug}.md`

### New example files (3 files)

- `examples/tui-dashboard-demo.ts`
- `examples/tui-file-browser-demo.ts`
- `examples/tui-chat-demo.ts`

### Deleted (after content is migrated)

- `website/docs/guide/` (entire directory — replaced by `quickstart/`)
- `website/docs/tui/` (entire directory — split across `tutorial/` and `reference/`)
- `website/docs/api/` (entire directory — replaced by `reference/`)

---

## Task 1: Create directory structure and config files

**Files:**
- Create: `website/docs/quickstart/_meta.json`
- Create: `website/docs/tutorial/_meta.json`
- Create: `website/docs/tutorial/core-concepts/_meta.json`
- Create: `website/docs/tutorial/subsystems/_meta.json`
- Create: `website/docs/tutorial/walkthroughs/_meta.json`
- Create: `website/docs/reference/_meta.json`
- Create: `website/docs/reference/widgets/_meta.json`
- Create: `website/docs/reference/subsystems/_meta.json`
- Modify: `website/docs/_nav.json`

- [ ] **Step 1: Create all target directories**

```bash
cd /Users/bytedance/workspace/flitter/website/docs
mkdir -p quickstart tutorial/core-concepts tutorial/subsystems tutorial/walkthroughs reference/widgets reference/subsystems
```

- [ ] **Step 2: Write `_nav.json`**

Overwrite `website/docs/_nav.json` with:

```json
[
  {
    "text": "快速上手",
    "link": "/quickstart/introduction",
    "activeMatch": "/quickstart/"
  },
  {
    "text": "教程",
    "link": "/tutorial/core-concepts/three-tree",
    "activeMatch": "/tutorial/"
  },
  {
    "text": "参考",
    "link": "/reference/overview",
    "activeMatch": "/reference/"
  },
  {
    "text": "架构",
    "link": "/architecture/monorepo",
    "activeMatch": "/architecture/"
  }
]
```

- [ ] **Step 3: Write all `_meta.json` files**

`website/docs/quickstart/_meta.json`:
```json
["introduction", "getting-started", "project-structure", "examples"]
```

`website/docs/tutorial/_meta.json`:
```json
[
  { "type": "dir", "name": "core-concepts", "label": "核心概念" },
  { "type": "dir", "name": "subsystems", "label": "子系统指南" },
  { "type": "dir", "name": "walkthroughs", "label": "实战构建" }
]
```

`website/docs/tutorial/core-concepts/_meta.json`:
```json
["three-tree", "rendering", "custom-widgets"]
```

`website/docs/tutorial/subsystems/_meta.json`:
```json
["layout", "input-handling", "focus-system", "actions-shortcuts", "scroll", "overlay", "selection", "gestures", "markdown", "performance"]
```

`website/docs/tutorial/walkthroughs/_meta.json`:
```json
["build-a-dashboard", "build-a-file-browser", "build-a-chat-tui"]
```

`website/docs/reference/_meta.json`:
```json
[
  "overview",
  "core-types",
  "color-and-styling",
  { "type": "dir", "name": "widgets", "label": "Widget 参考" },
  { "type": "dir", "name": "subsystems", "label": "子系统 API" },
  "tools"
]
```

`website/docs/reference/widgets/_meta.json`:
```json
["layout", "text", "style", "display", "interaction", "scroll", "overlay", "table", "media"]
```

`website/docs/reference/subsystems/_meta.json`:
```json
["screen", "tui-controller", "vt-parser", "binding", "tree", "debug"]
```

- [ ] **Step 4: Commit**

```bash
git add website/docs/_nav.json website/docs/quickstart/_meta.json website/docs/tutorial/ website/docs/reference/
git commit -m "docs: create new directory structure and nav config for doc site reorganization"
```

---

## Task 2: Move existing pages to new locations

**Files:**
- Move: 17 files from `guide/`, `tui/`, `api/` to `quickstart/`, `tutorial/`, `reference/`
- Delete: old `guide/`, `tui/`, `api/` directories (after move)

- [ ] **Step 1: Move guide → quickstart**

```bash
cd /Users/bytedance/workspace/flitter/website/docs
mv guide/introduction.md quickstart/introduction.md
mv guide/getting-started.md quickstart/getting-started.md
mv guide/project-structure.md quickstart/project-structure.md
mv guide/examples.md quickstart/examples.md
```

- [ ] **Step 2: Move tui → tutorial/core-concepts**

```bash
mv tui/three-tree.md tutorial/core-concepts/three-tree.md
mv tui/rendering.md tutorial/core-concepts/rendering.md
mv tui/custom-widgets.md tutorial/core-concepts/custom-widgets.md
```

- [ ] **Step 3: Move tui → tutorial/subsystems**

```bash
mv tui/layout.md tutorial/subsystems/layout.md
mv tui/input-handling.md tutorial/subsystems/input-handling.md
mv tui/focus-system.md tutorial/subsystems/focus-system.md
mv tui/actions-shortcuts.md tutorial/subsystems/actions-shortcuts.md
```

- [ ] **Step 4: Move tui → reference**

```bash
mv tui/overview.md reference/overview.md
mv tui/core-types.md reference/core-types.md
mv tui/color-and-styling.md reference/color-and-styling.md
```

- [ ] **Step 5: Move api → reference**

```bash
mv api/agent-tools.md reference/tools.md
```

- [ ] **Step 6: Keep widgets.md and tui-widgets.md temporarily for content extraction in Task 3**

Do NOT delete `tui/widgets.md` or `api/tui-widgets.md` yet — they are needed as source material for the split in Task 3.

- [ ] **Step 7: Remove old _meta.json files and empty directories**

```bash
rm guide/_meta.json
rmdir guide
rm api/_meta.json
# api/ directory still has tui-widgets.md — will be cleaned after Task 3
```

- [ ] **Step 8: Commit**

```bash
git add -A website/docs/
git commit -m "docs: move 15 existing pages to new quickstart/tutorial/reference structure"
```

---

## Task 3: Create reference/widgets pages (split + extend)

This is the largest task. The 9 widget reference pages are built from three sources:
1. Content from `tui/widgets.md` (narrative + examples)
2. Content from `api/tui-widgets.md` (API signatures + param tables)
3. Content from `packages/tui/docs/{layout,style,text}.md` (deep reference)
4. New content for undocumented widgets

Each page follows the per-widget format from the spec: heading > one-line description > constructor params table > properties/methods table > example > related widgets.

**Files:**
- Create: `website/docs/reference/widgets/layout.md`
- Create: `website/docs/reference/widgets/text.md`
- Create: `website/docs/reference/widgets/style.md`
- Create: `website/docs/reference/widgets/display.md`
- Create: `website/docs/reference/widgets/interaction.md`
- Create: `website/docs/reference/widgets/scroll.md`
- Create: `website/docs/reference/widgets/overlay.md`
- Create: `website/docs/reference/widgets/table.md`
- Create: `website/docs/reference/widgets/media.md`
- Delete: `website/docs/tui/widgets.md` (source consumed)
- Delete: `website/docs/api/tui-widgets.md` (source consumed)

- [ ] **Step 1: Create `reference/widgets/layout.md`**

Source: `packages/tui/docs/layout.md` (full content) + layout sections from `tui/widgets.md` + layout API from `api/tui-widgets.md`.

Write `website/docs/reference/widgets/layout.md`. Start with the full content of `packages/tui/docs/layout.md` (Row/Column, Flexible/Expanded, Stack/Positioned, Padding, SizedBox, Container, BoxConstraints). Then append new sections for the 8 widgets not yet covered:

- **IntrinsicHeight**: `constructor({ key?, child? })`. Forces child to lay out at its intrinsic height. Source: `packages/tui/src/widgets/intrinsic-height.ts`.
- **OverlapColumn**: `constructor({ key?, children })`. Like Column but children overlap vertically. Source: `packages/tui/src/widgets/overlap-column.ts`.
- **SplitPane**: `constructor({ key?, children, direction, ratio, minRatio?, maxRatio?, dividerColor?, onResize? })`. Two-pane layout with draggable divider. `direction`: `"horizontal" | "vertical"`. `ratio`: `[0,1]` split position. Source: `packages/tui/src/widgets/split-pane.ts`.
- **Spacer**: `constructor({ key?, flex? })`. Expands to fill available space. `flex` default `1`. Source: `packages/tui/src/widgets/spacer.ts`.
- **ClipBox**: `constructor({ key?, child })`. Clips child to its layout bounds. Source: `packages/tui/src/widgets/clip-box.ts`.
- **Center**: `constructor({ key?, child })`. Centers child within parent constraints. Source: `packages/tui/src/widgets/center.ts`.
- **Align**: `constructor({ key?, alignment, child })`. Positions child using alignment. Source: `packages/tui/src/widgets/align.ts`.
- **MediaQuery**: `constructor({ key?, data, child })`. Provides terminal dimensions via `MediaQuery.of(context)`. Source: `packages/tui/src/widgets/media-query.ts`.

Add a footer link: `> 📖 教程: [布局系统](/tutorial/subsystems/layout)`

- [ ] **Step 2: Create `reference/widgets/text.md`**

Source: `packages/tui/docs/text.md` (full content) + text sections from `tui/widgets.md` + Text/RichText/TextStyle/TextSpan API from `api/tui-widgets.md`.

Write `website/docs/reference/widgets/text.md`. Start with `packages/tui/docs/text.md` content (Text, RichText, TextSpan, char-width, emoji). Merge in the API signature tables from `api/tui-widgets.md` for Text, RichText, TextStyle, TextSpan.

The char-width and emoji sections from `packages/tui/docs/text.md` already cover the full utility API. No additional content needed.

- [ ] **Step 3: Create `reference/widgets/style.md`**

Source: `packages/tui/docs/style.md` (full content) + theme sections from `tui/widgets.md`.

Write `website/docs/reference/widgets/style.md`. Start with `packages/tui/docs/style.md` (Color, TextStyle, AppColorScheme, Theme/ThemeData). Append new sections:

- **ThemeRegistry**: `class ThemeRegistry`. Methods: `register(name, theme)`, `get(name)`, `list()`, `has(name)`. 8 built-in themes: `dark`, `light`, `terminal`, `nord`, `catppuccin-mocha`, `gruvbox-dark-hard`, `solarized-dark`, `solarized-light`. Source: `packages/tui/src/theme/theme-registry.ts`.
- **TOML Theme Loader**: `scanThemeDirectory(dir)`, `parsedThemeToThemeSpec(parsed)`, `hexToRgb(hex)`. Source: `packages/tui/src/theme/toml-theme-loader.ts`.

- [ ] **Step 4: Create `reference/widgets/display.md`**

New file. Cover 12 display widgets with the per-widget format (heading > description > params table > example).

Write `website/docs/reference/widgets/display.md`:

```markdown
# 展示 Widget

> 📖 相关教程: [自定义 Widget](/tutorial/core-concepts/custom-widgets)

## Container

> 带装饰的矩形容器，支持边框、背景色、内外边距。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `child` | `Widget` | — | 子 Widget |
| `width` | `number` | — | 固定宽度 |
| `height` | `number` | — | 固定高度 |
| `padding` | `EdgeInsets` | — | 内边距 |
| `margin` | `EdgeInsets` | — | 外边距 |
| `decoration` | `BoxDecoration` | — | 装饰（边框、背景色） |

**示例:**

```typescript
new Container({
  padding: EdgeInsets.all(1),
  decoration: new BoxDecoration({
    border: Border.all({ color: Color.cyan() }),
    backgroundColor: Color.rgb(30, 30, 46),
  }),
  child: new Text("Hello"),
})
```

## Badge

> 带标签或计数的小标记，常用于状态指示。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `count` | `number` | — | 数字计数（优先于 label） |
| `label` | `string` | — | 文本标签 |
| `color` | `Color` | `Color.yellow()` | 前景色 |
| `backgroundColor` | `Color` | — | 背景色 |
| `bold` | `boolean` | `true` | 是否加粗 |

渲染为 `[content]` 格式。优先级: `count` > `label` > `"●"`。

**示例:**

```typescript
new Badge({ count: 5, color: Color.red() })
new Badge({ label: "NEW", color: Color.green() })
```

## Toggle

> 可切换的开关组件，支持键盘和鼠标操作。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `value` | `boolean` | 必填 | 当前状态 |
| `onChanged` | `(v: boolean) => void` | 必填 | 状态改变回调 |
| `label` | `string` | — | 标签文本 |
| `style` | `"circle" \| "checkbox"` | `"circle"` | 显示风格 |
| `autofocus` | `boolean` | `false` | 自动聚焦 |
| `checkedColor` | `Color` | `Color.green()` | 选中颜色 |

circle 风格: `●`/`○`。checkbox 风格: `[x]`/`[ ]`。键盘: Space/Enter 切换。

## ProgressBar

> 水平进度条，使用 Unicode 子字符块实现 1/8 精度。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `value` | `number` | 必填 | 进度值 `[0, 1]` |
| `color` | `Color` | — | 填充颜色 |
| `backgroundColor` | `Color` | — | 背景颜色 |
| `label` | `string` | — | 标签文本 |

使用 Unicode 块: `▏▎▍▌▋▊▉█` 实现平滑渲染。

## AnimatedProgressBar

> 带动画效果的进度条（彗星尾迹效果）。

构造参数与 `ProgressBar` 相同，增加动画渐变效果。

## BrailleSpinner

> 盲文字符旋转动画指示器。

无构造参数。调用 `step()` 推进动画帧。内部使用盲文字符序列: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`。

## NotificationBanner

> 内联通知条，带类型颜色和可选操作按钮。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `type` | `"info" \| "warning" \| "error" \| "success"` | 必填 | 通知类型 |
| `message` | `string` | 必填 | 消息文本 |
| `onDismiss` | `() => void` | — | 关闭回调（显示 [x] 按钮） |
| `action` | `{ label: string; onPressed: () => void }` | — | 操作按钮 |

类型颜色: info=蓝, warning=黄, error=红, success=绿。左侧彩色边条。

## Disclosure

> 可折叠/展开的内容区域。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `title` | `Widget` | 必填 | 始终可见的标题 |
| `child` | `Widget` | 必填 | 展开时显示的内容 |
| `expanded` | `boolean` | 必填 | 是否展开 |
| `onChanged` | `(expanded: boolean) => void` | — | 状态改变回调 |

受控组件。折叠 `▶`、展开 `▼`。

## DialogBox

> 带边框的对话框容器，支持多面板布局。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `children` | `Widget[]` | 必填 | 最多 3 个子 Widget |
| `maxHeight` | `number` | — | 最大高度 |
| `borderColor` | `Color` | 必填 | 边框颜色 |
| `backgroundColor` | `Color` | 必填 | 背景颜色 |
| `borderStyle` | `"rounded" \| "square"` | `"rounded"` | 边框风格 |
| `hasBanner` | `boolean` | `false` | 顶部横幅模式 |

子布局: `children[0]`=左列, `children[1]`=右上, `children[2]`=右下。

## Offstage

> 控制子 Widget 是否参与布局和绘制。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `offstage` | `boolean` | `true` | 是否隐藏 |
| `child` | `Widget` | — | 子 Widget |

`offstage=true` 时子 Widget 不占空间、不绘制。

## ForceDimWidget

> 强制子 Widget 以暗淡样式渲染。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `child` | `Widget` | 必填 | 子 Widget |
| `dim` | `boolean` | `true` | 是否暗淡 |

## SizeChangedNotifier

> 子 Widget 尺寸变化时触发回调。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `child` | `Widget` | 必填 | 子 Widget |
| `onSizeChanged` | `(size: Size) => void` | 必填 | 尺寸变化回调 |
```

- [ ] **Step 5: Create `reference/widgets/interaction.md`**

New file covering GestureDetector, MouseRegion, Focus, FocusNode, TextField, TextEditingController, Shortcuts, Actions, Intent, Action, KeyActivator, ShortcutManager.

Write `website/docs/reference/widgets/interaction.md`. Content sources:
- MouseRegion/GestureDetector sections from `tui/widgets.md` (narrative)
- MouseRegion/GestureDetector/Focus/Intent/Action/Actions/Shortcuts/KeyActivator/ShortcutManager/TextField/TextEditingController/FocusNode API from `api/tui-widgets.md` (signatures + tables)

Structure: merge narrative intro from widgets.md with API tables from tui-widgets.md for each widget. Add a header link to gesture and focus tutorials.

```markdown
# 交互 Widget

> 📖 相关教程: [手势系统](/tutorial/subsystems/gestures) · [焦点系统](/tutorial/subsystems/focus-system) · [Actions 与 Shortcuts](/tutorial/subsystems/actions-shortcuts)
```

- [ ] **Step 6: Create `reference/widgets/scroll.md`**

New file covering ListView, Scrollable, Viewport, ViewportWithPosition, Scrollbar, ScrollController, ScrollPhysics, ClampingScrollPhysics, FlingScrollPhysics, ScrollBehavior, VelocityTracker.

Write `website/docs/reference/widgets/scroll.md`. Content sources:
- Scroll sections from `tui/widgets.md` (narrative + ScrollBehavior keybindings table)
- ScrollController/Scrollbar/FlingScrollPhysics/VelocityTracker API from `api/tui-widgets.md` (signatures + tables)
- API details from research: ScrollController methods (jumpTo, scrollUp, scrollDown, scrollToTop, scrollToBottom, scrollPageUp, scrollPageDown, animateTo, enableFollowMode, disableFollowMode, toggleFollowMode), properties (offset, maxScrollExtent, followMode, atTop, atBottom, atEdge, disposed), listener management (addListener, removeListener, dispose).

```markdown
# 滚动 Widget

> 📖 相关教程: [滚动系统](/tutorial/subsystems/scroll)
```

- [ ] **Step 7: Create `reference/widgets/overlay.md`**

New file. Content sources: overlay sections from `tui/widgets.md` + FuzzyPicker/PopupOverlay/ConfirmDialog/PromptDialog API from `api/tui-widgets.md` + SpinnerOverlay/ModalStack from research.

Write `website/docs/reference/widgets/overlay.md`:

```markdown
# 浮层与弹窗 Widget

> 📖 相关教程: [浮层系统](/tutorial/subsystems/overlay)
```

Cover: Overlay, OverlayEntry, OverlayContainer, ModalStack/ModalStackController, FuzzyPicker, CommandPalette, AutocompleteController, PopupOverlay, ConfirmDialog, PromptDialog, SpinnerOverlay, LayerLink, CompositedTransformTarget, CompositedTransformFollower.

Key APIs:
- **ModalStackController**: `push(widget)`, `pop()`, `canPop`, `length`, `entries`, `addListener/removeListener`
- **CommandPalette**: `constructor({ commands, onDismiss })`. `CommandPaletteCommand`: `{ id, label, category?, description?, shortcut?, action, enabled?, priority? }`
- **ConfirmDialog**: `constructor({ title, message?, confirmButtonText?, onConfirm, onCancel, terminalWidth?, terminalHeight?, colors? })`. Keys: y/Y confirm, n/N/Escape cancel.
- **PromptDialog**: `constructor({ message, title?, placeholder?, initialValue?, confirmLabel?, cancelLabel?, onSubmit, onCancel, width? })`. Keys: Enter submit, Escape cancel.
- **SpinnerOverlay**: `constructor({ message?, onCancel?, colors? })`. 100ms animation interval. Escape to cancel (if onCancel provided).

- [ ] **Step 8: Create `reference/widgets/table.md`**

New file covering Table, HelpTable, StickyHeader.

Write `website/docs/reference/widgets/table.md`:

```markdown
# 表格 Widget

## Table

> 多列表格，支持固定、自适应、弹性、比例列宽。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `rows` | `TableRow[]` | 必填 | 行数据 |
| `columnConfigs` | `TableColumnConfig[]` | 必填 | 列配置 |
| `borderColor` | `Color` | — | 边框颜色 |
| `showBorders` | `boolean` | `true` | 显示边框 |
| `cellPadding` | `EdgeInsets` | `EdgeInsets.symmetric({ horizontal: 1 })` | 单元格内边距 |

**TableColumnConfig:**

| 字段 | 类型 | 说明 |
|---|---|---|
| `widthType` | `"fixed" \| "intrinsic" \| "flex" \| "proportional"` | 列宽类型 |
| `fixedWidth` | `number` | `widthType === "fixed"` 时必填 |

**TableRow:** `{ cells: TableCell[] }`
**TableCell:** `{ child: Widget }`

## HelpTable

> 两列响应式帮助表格（键 + 说明）。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `rows` | `HelpTableRow[]` | 必填 | 行数据 |
| `leftColumnWidth` | `number` | `24` | 左列固定宽度 |

**HelpTableRow:** `{ left: string | TextSpan; right: string | TextSpan }`

## StickyHeader

> 吸顶头部，滚动时固定在视口顶部。

**构造参数:**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `header` | `Widget` | 必填 | 头部 Widget |
| `body` | `Widget` | 必填 | 主体内容 |

头部在自然位置滚出视口后固定在顶部。需配合 `Scrollable` 使用。
```

- [ ] **Step 9: Create `reference/widgets/media.md`**

New file covering ImageWidget, RenderImage, RenderChart, ChartData, ChartSeries.

Write `website/docs/reference/widgets/media.md`:

```markdown
# 媒体 Widget

## ImageWidget

> 基于 Kitty Graphics Protocol 的终端图片显示。

通过 APC 传输 PNG base64 数据，使用占位符字符网格渲染。需要终端支持 Kitty Graphics Protocol（如 kitty、WezTerm）。

架构: `ImageWidget (StatefulWidget)` → `ImageState` → `ImageRenderWidget` → `RenderImage (RenderBox)`

## RenderChart

> 基于 ASCII 的图表渲染。

**ChartData:**

| 字段 | 类型 | 说明 |
|---|---|---|
| `series` | `ChartSeries[]` | 数据系列 |

**ChartSeries:**

| 字段 | 类型 | 说明 |
|---|---|---|
| `data` | `number[]` | 数据点 |
| `color` | `Color` | 线条颜色 |
| `label` | `string` | 图例标签 |
```

- [ ] **Step 10: Delete source files and clean up**

```bash
cd /Users/bytedance/workspace/flitter/website/docs
rm tui/widgets.md
rm -rf tui/  # all .md files already moved; only _meta.json remains
rm api/tui-widgets.md
rm api/_meta.json
rmdir api
```

- [ ] **Step 11: Commit**

```bash
git add -A website/docs/
git commit -m "docs: create 9 widget reference pages by splitting and extending existing content"
```

---

## Task 4: Create 6 subsystem tutorial pages

**Files:**
- Create: `website/docs/tutorial/subsystems/scroll.md`
- Create: `website/docs/tutorial/subsystems/overlay.md`
- Create: `website/docs/tutorial/subsystems/selection.md`
- Create: `website/docs/tutorial/subsystems/gestures.md`
- Create: `website/docs/tutorial/subsystems/markdown.md`
- Create: `website/docs/tutorial/subsystems/performance.md`

Each page follows the template: `# 标题 → ## 概述 → ## 核心概念 → ## 基本用法 → ## 进阶用法 → ## 与其他子系统的配合 → ## 完整示例 → ## 下一步`

- [ ] **Step 1: Create `tutorial/subsystems/scroll.md`**

Write `website/docs/tutorial/subsystems/scroll.md` (~800 words, Chinese):

Key content:
- **概述**: @flitter/tui 的滚动系统实现了类 Flutter 的滚动架构。核心类: ScrollController, ListView, Scrollable, ScrollPhysics。
- **核心概念**: ScrollController 管理滚动偏移和监听。ListView 使用 builder pattern 实现虚拟化渲染。ScrollPhysics 控制滚动行为（Clamping 边界锁定 vs Fling 惯性滚动）。
- **基本用法**: ListView with builder, 示例:
  ```typescript
  const controller = new ScrollController();
  new ListView({
    controller,
    itemCount: 1000,
    itemBuilder: (index) => new Text(`Item ${index}`),
  })
  ```
- **进阶**: Scrollbar 集成, ScrollBehavior vim 键绑定 (j/k/g/G/Ctrl+D/Ctrl+U), followMode 自动跟随新内容, FlingScrollPhysics 惯性效果。
- **完整示例**: 自动跟随日志查看器 — `controller.enableFollowMode()` + items 追加后自动滚动。
  ```
  :::tip 运行示例
  ```bash
  bun run examples/tui-scrollable-demo.ts
  ```
  :::
  ```
- **下一步**: `> 📖 详细 API: [滚动 Widget 参考](/reference/widgets/scroll)`

- [ ] **Step 2: Create `tutorial/subsystems/overlay.md`**

Write `website/docs/tutorial/subsystems/overlay.md` (~800 words, Chinese):

Key content:
- **概述**: 浮层系统用于在 Widget 树上方渲染弹窗、菜单、命令面板等 UI。
- **核心概念**: Overlay/OverlayEntry (Flutter-style 浮层栈), OverlayContainer (边缘定位浮层), ModalStack (push/pop 模态层), CompositedTransformTarget/Follower + LayerLink (锚定弹窗定位)。
- **基本用法**: OverlayEntry 的 insert/remove:
  ```typescript
  const entry = new OverlayEntry({ builder: (_) => new Text("Tooltip") });
  overlayState.insert(entry);
  // 稍后移除
  overlayState.remove(entry);
  ```
- **进阶**: ModalStack push/pop 模式, FuzzyPicker 实现搜索选择, CommandPalette 集成（commands 数组 + onDismiss）。
- **完整示例**: 多层 Modal + 命令面板。
  ```
  :::tip 运行示例
  ```bash
  bun run examples/tui-overlay-demo.ts
  bun run examples/tui-command-palette-demo.ts
  ```
  :::
  ```
- **下一步**: `> 📖 详细 API: [浮层 Widget 参考](/reference/widgets/overlay)`

- [ ] **Step 3: Create `tutorial/subsystems/selection.md`**

Write `website/docs/tutorial/subsystems/selection.md` (~600 words, Chinese):

Key content:
- **概述**: 文本选择系统支持鼠标拖选、双击选词、三击选行、Ctrl+A 全选、跨视口选区保持。
- **核心概念**: SelectionArea (跨 Widget 鼠标选择控制器), SelectionKeepAliveBoundary (视口滚动时保持选区), Clipboard (跨平台剪贴板: OSC 52 → pbcopy → wl-copy → xclip fallback)。
- **基本用法**: 包裹内容区域:
  ```typescript
  new SelectionArea({
    child: new Column({ children: [...textWidgets] }),
  })
  ```
- **进阶**: 双击选词 (`selectWordAt`), 三击选行 (`selectLineAt`), Ctrl+A 全选 (`selectAll`), 选区高亮颜色自定义。
- **完整示例**: 可选择的文本查看器。
  ```
  :::tip 运行示例
  ```bash
  bun run examples/tui-editing-demo.ts
  ```
  :::
  ```
- **下一步**: 链接到 `reference/widgets/interaction.md` (SelectionArea 在 interaction 参考中)

- [ ] **Step 4: Create `tutorial/subsystems/gestures.md`**

Write `website/docs/tutorial/subsystems/gestures.md` (~600 words, Chinese):

Key content:
- **概述**: 手势系统处理鼠标点击、拖拽、悬停等交互事件。
- **核心概念**: HitTestResult/HitTestEntry (命中测试), MouseManager (全局鼠标事件路由), MouseRegion (悬停/进出检测) vs GestureDetector (点击/拖拽检测)。
- **何时用 MouseRegion vs GestureDetector**: MouseRegion 用于悬停效果和光标变化，GestureDetector 用于点击和拖拽。
- **基本用法**: 点击事件:
  ```typescript
  new GestureDetector({
    onTap: () => console.log("clicked"),
    child: new Text("Click me"),
  })
  ```
- **进阶**: 双击检测 (`onDoubleTap`), 悬停光标 (`cursor`), 拖拽 (`onPanStart/onPanUpdate/onPanEnd`)。
- **完整示例**: 可点击的交互组件。
  ```
  :::tip 运行示例
  ```bash
  bun run examples/tui-interactive-demo.ts
  ```
  :::
  ```
- **下一步**: `> 📖 详细 API: [交互 Widget 参考](/reference/widgets/interaction)`

- [ ] **Step 5: Create `tutorial/subsystems/markdown.md`**

Write `website/docs/tutorial/subsystems/markdown.md` (~500 words, Chinese):

Key content:
- **概述**: @flitter/tui 内置 Markdown 渲染引擎，使用 micromark + GFM 扩展。
- **核心概念**: MarkdownParser (Markdown → AST), MarkdownRenderer (AST → TextSpan 树), 语法高亮 (代码块)。支持 GFM: 表格、删除线、任务列表、自动链接。
- **基本用法**: 渲染 Markdown 字符串:
  ```typescript
  const parser = new MarkdownParser();
  const ast = parser.parse("# Hello\n\n**bold** and *italic*");
  const renderer = new MarkdownRenderer();
  const spans = renderer.render(ast);
  new RichText({ text: spans })
  ```
- **进阶**: 代码块语法高亮, 主题化 (通过 AppTheme.syntaxHighlight), GFM 表格渲染。
- **完整示例**: Markdown 预览 Widget。
  ```
  :::tip 运行示例
  ```bash
  bun run examples/tui-markdown-demo.ts
  ```
  :::
  ```
- **下一步**: `> 📖 详细 API: [文本 Widget 参考](/reference/widgets/text)`

- [ ] **Step 6: Create `tutorial/subsystems/performance.md`**

Write `website/docs/tutorial/subsystems/performance.md` (~500 words, Chinese):

Key content:
- **概述**: @flitter/tui 提供性能追踪和诊断工具。
- **核心概念**: PerformanceTracker (帧时间记录 + 百分位统计), FrameStatsOverlay (FPS 覆盖层), Screen 脏区优化 (只重绘变化的 Cell), 调试日志 (`FLITTER_LOG_LEVEL=debug`)。
- **基本用法**: 启用性能追踪:
  ```typescript
  const tracker = new PerformanceTracker();
  tracker.recordFrame(16.7);
  console.log(`P95: ${tracker.getFrameP95()}ms`);
  ```
- **进阶 — 常见性能陷阱**:
  1. 在 `build()` 中调用 `setState()` — 触发无限重建循环
  2. 不必要的整树重建 — 使用 `const` Widget 或 `InheritedWidget` 精确通知
  3. 未使用 ListView 虚拟化 — 大列表全量渲染
- **调试日志**: `FLITTER_LOG_LEVEL=debug bun run app.ts` 查看 `[frame]`, `[build]`, `[paint]` 日志。
- **完整示例**: 带调试覆盖层的应用。
  ```
  :::tip 运行示例
  ```bash
  bun run examples/debug-paint-pipeline.ts
  ```
  :::
  ```
- **下一步**: `> 📖 详细 API: [调试工具参考](/reference/subsystems/debug)`

- [ ] **Step 7: Commit**

```bash
git add website/docs/tutorial/subsystems/
git commit -m "docs: add 6 subsystem tutorial pages (scroll, overlay, selection, gestures, markdown, performance)"
```

---

## Task 5: Create 6 subsystem reference pages

**Files:**
- Create: `website/docs/reference/subsystems/screen.md`
- Create: `website/docs/reference/subsystems/tui-controller.md`
- Create: `website/docs/reference/subsystems/vt-parser.md`
- Create: `website/docs/reference/subsystems/binding.md`
- Create: `website/docs/reference/subsystems/tree.md`
- Create: `website/docs/reference/subsystems/debug.md`

Each page is API-level documentation (~400-600 words) for framework internals. Format: class/interface name > one-line description > constructor/factory > properties table > methods table > example.

- [ ] **Step 1: Create `reference/subsystems/screen.md`**

Write `website/docs/reference/subsystems/screen.md`:

Cover: Screen (双缓冲 front/back + DirtyRegion), ScreenBuffer, Cell (char + TextStyle + width + url), ColorDepth (`"16" | "256" | "truecolor"`), AnsiRenderer (diff 算法), escape 序列常量表 (ESC, CSI, CUP, SGR, ALT_SCREEN_ON/OFF, MOUSE_ON/OFF, PASTE_ON/OFF, HIDE/SHOW_CURSOR, SET_CURSOR_SHAPE).

Include the AnsiRenderer API: `render(screen): string`.

- [ ] **Step 2: Create `reference/subsystems/tui-controller.md`**

Write `website/docs/reference/subsystems/tui-controller.md`:

Cover: TuiController 生命周期 (constructor → init → render loop → deinit), TerminalCapabilities (emojiWidth, syncOutput, kittyKeyboard, kittyGraphics, colorPaletteNotifications, xtversion), TerminalSize + SIGWINCH, Kitty keyboard protocol (CSI u + flags=7), modifyOtherKeys, 同步输出 (SYNC_START/SYNC_END), isTtyStream() helper.

Key methods: `init()`, `render()`, `deinit()`, `onKey(cb)`, `onResize(cb)`.

- [ ] **Step 3: Create `reference/subsystems/vt-parser.md`**

Write `website/docs/reference/subsystems/vt-parser.md`:

Cover: VtParser 状态机 (字节流 → VtEvent: VtCsiEvent, VtEscapeEvent, VtPrintEvent), InputParser (VtEvent → InputEvent: KeyEvent, MouseEvent, PasteEvent, FocusEvent, InbandResizeEvent, CursorPositionEvent), Modifiers (MODIFIERS_NONE + Shift/Ctrl/Alt/Meta 位掩码), SGR 鼠标协议解码 (`\x1b[<button;col;row{M|m}`).

Key API: `InputParser.onInput(cb)`, `InputParser.feed(data)`.

- [ ] **Step 4: Create `reference/subsystems/binding.md`**

Write `website/docs/reference/subsystems/binding.md`:

Cover: WidgetsBinding 单例 (`WidgetsBinding.instance`), 内部子系统 (frameScheduler, buildOwner, pipelineOwner, focusManager, mouseManager, tui), `runApp(widget, options?)` 完整 API (options: `{ onRootElementMounted?, onCapabilitiesReady?, keyInterceptor? }`), 帧管线 4 阶段 (Build → Layout → Paint → Present).

Include the `runApp` import path: `import { runApp } from "@flitter/tui"`.

- [ ] **Step 5: Create `reference/subsystems/tree.md`**

Write `website/docs/reference/subsystems/tree.md`:

Cover: Widget (immutable config, `createElement()`), Key / GlobalKey, Element 生命周期 (mount → update → unmount → deactivate), 3 种 Element (ComponentElement, RenderObjectElement, InheritedElement), RenderObject / RenderBox (`performLayout`, `paint`, `performHitTest`), BoxConstraints (`tight()`, `loose()`, unbounded, `hasBoundedWidth/Height`, `constrain(size)`), BuildContext (`dependOnInheritedWidgetOfExactType`, `findAncestorWidgetOfExactType`).

- [ ] **Step 6: Create `reference/subsystems/debug.md`**

Write `website/docs/reference/subsystems/debug.md`:

Cover: Logger singleton (`import { logger } from "@flitter/tui"`), LogLevel (`"debug" | "info" | "warn" | "error"`), LogBackend interface, `FLITTER_LOG_LEVEL` 环境变量, Logger channels (`[input]`, `[mouse]`, `[build]`, `[frame]`, `[paint]`, `[tui]`), WidgetTreeDebugger (WidgetTreeSnapshot, WidgetDebugInfo, RenderObjectDebugInfo), WidgetREPLServer (Unix socket, $ debugger API), WidgetDebugAPI.

- [ ] **Step 7: Commit**

```bash
git add website/docs/reference/subsystems/
git commit -m "docs: add 6 subsystem API reference pages (screen, tui-controller, vt-parser, binding, tree, debug)"
```

---

## Task 6: Create 3 walkthrough tutorial pages + 3 example files

**Files:**
- Create: `examples/tui-dashboard-demo.ts`
- Create: `examples/tui-file-browser-demo.ts`
- Create: `examples/tui-chat-demo.ts`
- Create: `website/docs/tutorial/walkthroughs/build-a-dashboard.md`
- Create: `website/docs/tutorial/walkthroughs/build-a-file-browser.md`
- Create: `website/docs/tutorial/walkthroughs/build-a-chat-tui.md`

### Sub-task 6a: Dashboard example + tutorial

- [ ] **Step 1: Create `examples/tui-dashboard-demo.ts`**

A runnable dashboard demo using: Column, Row, Container, SizedBox, ProgressBar, Badge, Table, StickyHeader, Text, Theme, Timer.

Follow the existing example pattern:
- JSDoc header with `@module` tag and `Run: bun run examples/tui-dashboard-demo.ts`
- Imports from `../packages/tui/src/...` with `.js` extensions
- `StatefulWidget` + `State` with timer-based `setState`
- `runApp(new DashboardApp())`

The demo should show: a top status bar row, a middle row with 3-4 progress bars showing metrics, and a bottom table with mock data rows. Timer refreshes values every 2 seconds.

- [ ] **Step 2: Create `tutorial/walkthroughs/build-a-dashboard.md`**

Write `website/docs/tutorial/walkthroughs/build-a-dashboard.md` (~1000-1500 words, Chinese).

Structure (7 步骤):
1. 创建应用骨架 — `runApp` + `StatefulWidget` + `State`
2. 布局结构 — `Column` > `Row` > 面板
3. 状态栏 — `Container` + `Text` + 主题颜色
4. 指标面板 — `ProgressBar` + `Badge`
5. 数据表格 — `Table` + `StickyHeader`
6. 定时刷新 — `setInterval` + `setState`
7. 主题集成 — `ThemeData` + `ColorScheme`

Each step shows the code snippet, explains what it does, and builds on the previous step. Final section links to the runnable example:

```
:::tip 运行完整示例
```bash
bun run examples/tui-dashboard-demo.ts
```
:::
```

### Sub-task 6b: File browser example + tutorial

- [ ] **Step 3: Create `examples/tui-file-browser-demo.ts`**

A runnable file browser demo using: ListView, Focus, Actions, Shortcuts, SplitPane, RichText, Text, Container.

Shows: left pane with file listing (reads current directory via `Bun.file` / `readdir`), right pane with file preview, j/k/Enter keyboard navigation, Tab to switch panes.

- [ ] **Step 4: Create `tutorial/walkthroughs/build-a-file-browser.md`**

Write `website/docs/tutorial/walkthroughs/build-a-file-browser.md` (~1000-1500 words, Chinese).

Structure (7 步骤):
1. 创建应用骨架
2. 文件列表 — `ListView` + `ScrollController`
3. 键盘导航 — `Actions`/`Shortcuts` + j/k/Enter/Backspace
4. 焦点切换 — `Focus` + Tab 遍历
5. 分割面板 — `SplitPane`
6. 文件预览 — `RichText` for text files
7. 状态栏 — 当前路径 + 文件数

### Sub-task 6c: Chat example + tutorial

- [ ] **Step 5: Create `examples/tui-chat-demo.ts`**

A runnable chat demo using: TextField, TextEditingController, ListView, ScrollController (followMode), MarkdownRenderer, CommandPalette, NotificationBanner.

Shows: message list with auto-scroll, input field at bottom, /help command via CommandPalette, notification banners for system messages. Uses mock data (no real LLM).

- [ ] **Step 6: Create `tutorial/walkthroughs/build-a-chat-tui.md`**

Write `website/docs/tutorial/walkthroughs/build-a-chat-tui.md` (~1000-1500 words, Chinese).

Structure (7 步骤):
1. 创建应用骨架
2. 消息列表 — `ListView` + `ScrollController.followMode`
3. 输入框 — `TextField` + `TextEditingController`
4. Markdown 消息渲染 — `MarkdownRenderer`
5. 命令面板 — `CommandPalette` + `/` 触发
6. 浮层通知 — `NotificationBanner`
7. 主题和样式

- [ ] **Step 7: Commit**

```bash
git add examples/tui-dashboard-demo.ts examples/tui-file-browser-demo.ts examples/tui-chat-demo.ts website/docs/tutorial/walkthroughs/
git commit -m "docs: add 3 walkthrough tutorials with runnable example demos"
```

---

## Task 7: Build verification and final cleanup

**Files:**
- Verify: all moved/created files
- Run: `pnpm docs:build`

- [ ] **Step 1: Verify directory structure matches spec**

```bash
cd /Users/bytedance/workspace/flitter/website/docs
find . -name "*.md" | sort
```

Expected: 43 `.md` files across `quickstart/`, `tutorial/`, `reference/`, `architecture/`, plus `index.md`.

Verify old directories are deleted:
```bash
ls guide/ 2>/dev/null && echo "ERROR: guide/ still exists" || echo "OK: guide/ deleted"
ls tui/ 2>/dev/null && echo "ERROR: tui/ still exists" || echo "OK: tui/ deleted"
ls api/ 2>/dev/null && echo "ERROR: api/ still exists" || echo "OK: api/ deleted"
```

- [ ] **Step 2: Verify all _meta.json files exist**

```bash
find . -name "_meta.json" | sort
```

Expected: 9 `_meta.json` files:
- `quickstart/_meta.json`
- `tutorial/_meta.json`
- `tutorial/core-concepts/_meta.json`
- `tutorial/subsystems/_meta.json`
- `tutorial/walkthroughs/_meta.json`
- `reference/_meta.json`
- `reference/widgets/_meta.json`
- `reference/subsystems/_meta.json`
- `architecture/_meta.json`

- [ ] **Step 3: Run docs build**

```bash
cd /Users/bytedance/workspace/flitter
pnpm docs:build
```

Expected: Build succeeds. Check for warnings about dead links or missing pages.

- [ ] **Step 4: Fix any build errors**

If the build reports dead links or missing pages, fix them. Common issues:
- Cross-references in moved pages that point to old paths (e.g., `/tui/focus-system` → `/tutorial/subsystems/focus-system`)
- Rspress _meta.json format issues (dir entries need `type: "dir"`)

- [ ] **Step 5: Verify example files run**

```bash
bun run examples/tui-dashboard-demo.ts &
sleep 3
kill %1

bun run examples/tui-file-browser-demo.ts &
sleep 3
kill %1

bun run examples/tui-chat-demo.ts &
sleep 3
kill %1
```

All three should start without import errors. Kill after 3s since they're interactive.

- [ ] **Step 6: Update internal cross-references in moved pages**

Check all moved pages for links that reference old paths. Search and replace:
- `/guide/` → `/quickstart/`
- `/tui/overview` → `/reference/overview`
- `/tui/three-tree` → `/tutorial/core-concepts/three-tree`
- `/tui/widgets` → distributed (link to most relevant reference/widgets/* page)
- `/tui/core-types` → `/reference/core-types`
- `/tui/color-and-styling` → `/reference/color-and-styling`
- `/tui/layout` → `/tutorial/subsystems/layout`
- `/tui/rendering` → `/tutorial/core-concepts/rendering`
- `/tui/input-handling` → `/tutorial/subsystems/input-handling`
- `/tui/focus-system` → `/tutorial/subsystems/focus-system`
- `/tui/actions-shortcuts` → `/tutorial/subsystems/actions-shortcuts`
- `/tui/custom-widgets` → `/tutorial/core-concepts/custom-widgets`
- `/api/tui-widgets` → `/reference/widgets/layout` (or appropriate sub-page)
- `/api/agent-tools` → `/reference/tools`

```bash
cd /Users/bytedance/workspace/flitter/website/docs
grep -rn '/tui/' --include="*.md" .
grep -rn '/guide/' --include="*.md" .
grep -rn '/api/' --include="*.md" .
```

Fix all occurrences.

- [ ] **Step 7: Rebuild and verify clean**

```bash
pnpm docs:build
```

Expected: Clean build, no warnings.

- [ ] **Step 8: Final commit**

```bash
git add -A website/docs/
git commit -m "docs: fix cross-references and verify clean build"
```

---

## Task Summary

| Task | Description | Files | Commits |
|---|---|---|---|
| 1 | Directory structure + config | 9 config files | 1 |
| 2 | Move 15 existing pages | 17 files moved | 1 |
| 3 | Create 9 widget reference pages | 9 new + 2 deleted | 1 |
| 4 | Create 6 subsystem tutorials | 6 new pages | 1 |
| 5 | Create 6 subsystem references | 6 new pages | 1 |
| 6 | Create 3 walkthroughs + 3 examples | 6 new pages + 3 .ts files | 1 |
| 7 | Build verification + cleanup | cross-ref fixes | 1 |
| **Total** | | **43 pages + 3 examples + 9 configs** | **7 commits** |
