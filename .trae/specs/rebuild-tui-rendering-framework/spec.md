# Rebuild TUI Rendering Framework Spec

## Why

当前 `@flitter/tui` 渲染框架在核心 Widget/Element/RenderObject 三棵树完成之后，在基础布局组件、装饰系统、交互系统以及滚动处理上存在严重缺失。这些组件的当前实现要么不存在（Align、Center、Spacer、MouseRegion、GestureDetector、Viewport），要么是简化版组合 Widget（Container 仅组合 Padding+SizedBox，缺少 decoration/margin/alignment/constraints 支持），与 amp 原版架构严重偏离。

**核心问题：现有代码是自作主张的简化设计，而非 amp 原始架构的忠实还原。** 例如 Container 在 amp 中是拥有专属 RenderObject (`qw`) 的 `SingleChildRenderObjectWidget`，而当前 Flitter 的 Container 只是一个组合 Padding+SizedBox 的 StatelessWidget。

本 spec 要求**严格基于 `amp-cli-reversed/modules/` 逆向源码进行重建**，还原 amp 的原始类结构和行为逻辑，禁止自行设计新的代码结构。

## Mandatory Reverse-Engineering Source Code References

以下为每个组件必须参考的逆向源码文件和混淆类名映射。**实现时必须先阅读对应逆向源码，理解 amp 的原始实现，再进行 TypeScript 直译。**

### 逆向源码文件索引

| 文件 | 路径 | 内容 |
|------|------|------|
| layout_widgets.js | `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js` | 布局组件、Container、Flex、Padding、装饰、边框绘制 |
| interactive_widgets.js | `amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js` | Scrollable、Viewport、Scrollbar、交互组件 |
| actions_intents.js | `amp-cli-reversed/modules/1472_tui_components/actions_intents.js` | Focus (C8)、边框绘制辅助、Actions/Intents |
| 2026_tail_anonymous.js | `amp-cli-reversed/modules/2026_tail_anonymous.js` | MouseRegion (G0/si)、其他未拆分组件 |
| 0534_unknown_o0.js | `amp-cli-reversed/modules/0534_unknown_o0.js` | BoxConstraints (o0) |
| 2124_unknown_h9.js | `amp-cli-reversed/modules/2124_unknown_h9.js` | Border (h9) |
| 2125_unknown_e9.js | `amp-cli-reversed/modules/2125_unknown_e9.js` | BorderSide (e9) |

### 混淆类名 → Flitter 类名映射

| amp 混淆名 | Flitter 目标类名 | 逆向源文件 | 行号范围 | 说明 |
|------------|-----------------|-----------|---------|------|
| `CY` | `RenderPositionedBox` | layout_widgets.js | L760-802 | Align/Center 的 RenderObject，widthFactor/heightFactor 模式 |
| `o1T` | `RenderConstrainedBox` | layout_widgets.js | L703-758 | SizedBox 的 RenderObject |
| `r1T` | `RenderClipRect` | layout_widgets.js | L1-32 | ClipRect 渲染对象，_clipBehavior |
| `SR` | `Container` (Widget) | layout_widgets.js | L33-70 | SingleChildRenderObjectWidget，含 width/height/padding/margin/decoration/constraints |
| `qw` | `ContainerRenderObject` | layout_widgets.js | L71-325 | Container 专属 RenderObject，含 _paintBorder、intrinsic 尺寸计算 |
| `s1T` | `RenderFlex` | layout_widgets.js | L326-603 | Flex 布局引擎，mainAxisAlignment/crossAxisAlignment/mainAxisSize |
| `zw` | `StackParentData` | layout_widgets.js | L605-627 | Stack 子节点定位数据 |
| `EY` | `RenderStack` | layout_widgets.js | L628-701 | Stack 渲染对象，fit/allowHitTestOutsideBounds |
| `LY` | `RenderOverlapColumn` | layout_widgets.js | L840-925 | 重叠列布局，overlap/crossAxisAlignment |
| `uR` | `Padding` (Widget) | layout_widgets.js | L927-942 | Padding Widget |
| `A1T` | `PaddingElement` | layout_widgets.js | L944-981 | Padding 的 Element，手动管理 RenderObject 生命周期 |
| `p1T` | `RenderPadding` | layout_widgets.js | L983-1078 | Padding 渲染对象，含 hitTest |
| `JY` | `Table` (Widget) | layout_widgets.js | L1080-1126 | 表格组件 |
| `EQT` | `RenderTable` | layout_widgets.js | L1127-1437 | 表格渲染对象，含 _paintBorder |
| `o0` | `BoxConstraints` | 0534_unknown_o0.js | L4-70 | 约束模型，tight/loose/constrain/enforce/tighten/tightFor |
| `h9` | `Border` | 2124_unknown_h9.js | L1-15 | 四边边框，all()/symmetric() 工厂 |
| `e9` | `BorderSide` | 2125_unknown_e9.js | L1-8 | 单边样式，color/width/style |
| `G0` | `MouseRegion` (Widget) | 2026_tail_anonymous.js | L158519-158567 | 鼠标区域 Widget，onClick/onEnter/onExit/onHover/onScroll/onRelease/onDrag/cursor/opaque |
| `lXT` | `MouseRegionElement` | 2026_tail_anonymous.js | L158568-158575 | MouseRegion 的 Element |
| `si` | `RenderMouseRegion` | 2026_tail_anonymous.js | L158576-158675 | 鼠标区域渲染对象，handleMouseEvent/hitTest/addMouseTarget |
| `C8` | `Focus` (Widget) | actions_intents.js | L67+ | Focus 组件，onKey/autofocus/debugLabel |
| `I1T` | `Scrollable` (State) | interactive_widgets.js | L1-82 | Scrollable StatefulWidget 的 State |
| `MY` | `Viewport` (Widget) | interactive_widgets.js | L83-106 | Viewport Widget，axisDirection/offset/scrollController |
| `g1T` | `RenderViewport` | interactive_widgets.js | L108-170 | Viewport 渲染对象，_scrollOffset/_scrollController/clip |
| `v1T` | `RenderViewportWithPosition` | interactive_widgets.js | L203-305 | 带 position 的 Viewport 渲染对象 |

## What Changes

### 1. Align / Center / RenderPositionedBox

**逆向源码**: `CY` in `layout_widgets.js:L760-802`

amp 的 `CY` (RenderPositionedBox) 实现：
- `widthFactor` / `heightFactor` 属性控制 shrink-wrap 行为
- `performLayout`: 子节点用 `constraints.loosen()` 布局，自身尺寸 = 子尺寸 × factor
- 子节点居中偏移: `(size.width - child.size.width) / 2`, `(size.height - child.size.height) / 2`
- 无子节点时: 如果 widthFactor 未定义且 maxWidth 有限，取 maxWidth；否则取 0

当前状态: **不存在**。需新建 `packages/tui/src/widgets/align.ts` 和 `packages/tui/src/widgets/center.ts`。

### 2. Spacer

**逆向源码**: amp 中 Spacer 通过 `Flexible` + `SizedBox.expand()` 组合实现，无独立类。

当前状态: **不存在**。需新建 `packages/tui/src/widgets/spacer.ts`。

### 3. Decoration System (BoxDecoration / Border / BorderSide)

**逆向源码**:
- `e9` (BorderSide) in `2125_unknown_e9.js:L1-8` — color/width/style
- `h9` (Border) in `2124_unknown_h9.js:L1-15` — top/right/bottom/left, all()/symmetric()
- Decoration 在 amp 中是内联对象 `{ color, border }`，无独立 BoxDecoration 类
- `_paintBorder` 方法在 `qw` (ContainerRenderObject) `layout_widgets.js:L212-318`

amp 的边框绘制逻辑 (`_paintBorder`):
- 水平线字符: `\u2500`(细) / `\u2501`(粗)
- 垂直线字符: `\u2502`(细) / `\u2503`(粗)
- 圆角: `\u256D\u256E\u2570\u256F` (rounded) vs `\u250C\u2510\u2514\u2518` (sharp)
- 粗圆角: `\u256D\u256E\u2570\u256F` vs `\u250F\u2513\u2517\u251B`
- 使用 `screen.mergeBorderChar()` 绘制，支持 dim 属性
- 边框宽度占 1 个 cell（每条边）

当前状态: **不存在**。需新建 `border-side.ts`、`border.ts`、`box-decoration.ts`。

### 4. Container Enhancement

**逆向源码**: `SR` (Widget) + `qw` (RenderObject) in `layout_widgets.js:L33-325`

amp 的 Container 是 `SingleChildRenderObjectWidget`（非组合式 StatelessWidget），拥有专属 RenderObject:
- Widget 属性: `width`, `height`, `padding`, `margin`, `decoration`, `constraints`
- RenderObject (`qw`) 核心逻辑:
  - `performLayout`: 计算边框宽度 (border 占 1 cell/边)，扣除 margin+padding+border 后得到子约束
  - `_paintBorder`: Unicode box-drawing 字符绘制
  - `paint`: 先填充背景色 (`decoration.color`)，再绘制边框，最后绘制子节点
  - `getMinIntrinsicWidth/Height`, `getMaxIntrinsicWidth/Height`: 完整的固有尺寸计算
  - `setForceDim`: 支持 dim 模式（用于非激活状态 UI）
  - `hitTest`: 委托给 super

当前状态: Container 是简化的 `StatelessWidget`，仅组合 Padding+SizedBox，缺少 decoration/margin/alignment/constraints。需**完全重写**为 `SingleChildRenderObjectWidget` + 专属 RenderObject。

### 5. MouseRegion / RenderMouseRegion

**逆向源码**: `G0` (Widget) + `si` (RenderObject) in `2026_tail_anonymous.js:L158519-158675`

amp 的 MouseRegion:
- Widget (`G0`): onClick/onEnter/onExit/onHover/onScroll/onRelease/onDrag/cursor/opaque
- RenderObject (`si`): 
  - `handleMouseEvent`: 按 type 分发 (click/enter/exit/hover/scroll/drag/release)
  - `_isHovered` 状态追踪
  - `hitTest`: 命中时调用 `result.addMouseTarget(this, position)` 注册鼠标目标
  - `hasMouseListeners` 计算属性
  - `dispose`: 从 `WidgetsBinding.instance` 移除 region

当前状态: **不存在**。需新建 `packages/tui/src/widgets/mouse-region.ts`。

### 6. GestureDetector

**逆向源码**: amp 中无独立 GestureDetector 类。手势识别通过 MouseRegion 的 onClick/onEnter/onExit 回调实现。高级手势（如 doubleTap）在应用层通过状态追踪实现。

当前状态: **不存在**。需新建 `packages/tui/src/widgets/gesture-detector.ts`，作为 MouseRegion 的便捷封装。

### 7. Viewport / RenderViewport

**逆向源码**: `MY` (Widget) + `g1T`/`v1T` (RenderObject) in `interactive_widgets.js:L83-305`

amp 的 Viewport:
- Widget (`MY`): axisDirection/offset/scrollController
- RenderObject (`g1T`): 
  - `_scrollOffset` / `_scrollController` 管理
  - `performLayout`: 子节点布局后更新 scrollController 的 maxScrollExtent
  - `paint`: 使用 `zm` (ClipRect) 裁剪子节点到视口范围
  - `updateChildOffset`: 更新子节点偏移
  - 支持 followMode (自动跟随到底部)
- `v1T` (RenderViewportWithPosition): 额外支持 position 属性

当前状态: 仅有 `RenderScrollable`（简化版），缺少 Viewport Widget 和裁剪逻辑。需新建 `packages/tui/src/widgets/viewport.ts`。

### 8. BoxConstraints Enhancement

**逆向源码**: `o0` in `0534_unknown_o0.js:L4-70`

amp 的 BoxConstraints 已有 `tightFor` 静态方法，当前 Flitter 已实现。但 amp 的 `constrain` 方法包含断言检查（isFinite），当前 Flitter 的 constrain 不做此检查。需对齐。

## Impact

- Affected specs: `analyze-amp-chatview-tui` (将为聊天视图提供底层依赖支撑)
- Affected code: `packages/tui/src/widgets/` 和 `packages/tui/src/tree/` 目录
- **破坏性变更**: Container 从 `StatelessWidget` 重写为 `SingleChildRenderObjectWidget`，所有使用 Container 的代码需适配新接口

## CRITICAL RULES FOR SUBAGENTS

1. **必须先阅读逆向源码再写代码**。每个组件实现前，必须先阅读对应的 `amp-cli-reversed/modules/` 文件，理解 amp 的原始类结构、方法签名、边界处理和防御逻辑。
2. **直译 amp 架构，禁止自行设计**。类继承关系、方法签名、属性命名必须与 amp 对齐。例如 Container 必须是 `SingleChildRenderObjectWidget` + 专属 RenderObject，不能是组合式 StatelessWidget。
3. **保留 amp 的防御逻辑**。amp 代码中的断言检查 (`e8`)、边界条件处理、fallback 策略必须忠实还原，不能因为"看起来不必要"而省略。
4. **保留 amp 的边框绘制细节**。Unicode box-drawing 字符的选择逻辑（细/粗/圆角/直角）必须与 amp 完全一致。
5. **添加 `逆向:` 注释**。每个类和关键方法必须添加 `逆向: 混淆名 (文件:行号)` 格式的注释。

## ADDED Requirements

### Requirement: Basic Layout Widgets (Align, Center, Spacer)

系统 SHALL 提供 `Align`、`Center` 和 `Spacer`，以支持更细粒度的定位和空间填充。

**逆向参考**: `CY` (RenderPositionedBox) in `layout_widgets.js:L760-802`

#### Scenario: Center a text
- **WHEN** user wraps a Text widget with Center
- **THEN** the text is positioned exactly in the middle of its parent's available space
- **AND** the layout logic matches amp's `CY.performLayout` (loosen constraints → layout child → center offset)

#### Scenario: Align with widthFactor/heightFactor
- **WHEN** user creates Align with widthFactor=2 and heightFactor=1
- **THEN** the Align sizes itself to child.width * 2 × child.height * 1
- **AND** the child is positioned at the alignment point within the oversized parent

### Requirement: Decoration and Borders

系统 SHALL 提供 `BoxDecoration` 和 `Border` 系统，允许通过 `Container` 绘制终端框线。

**逆向参考**:
- `e9` (BorderSide) in `2125_unknown_e9.js:L1-8`
- `h9` (Border) in `2124_unknown_h9.js:L1-15`
- `_paintBorder` in `qw` (ContainerRenderObject) `layout_widgets.js:L212-318`

#### Scenario: Draw rounded border
- **WHEN** Container has decoration with `border: Border.all(new BorderSide(color, 1, "rounded"))`
- **THEN** the border is drawn using Unicode rounded corner characters (`╭╮╰╯`)
- **AND** the border character selection matches amp's `s()` function logic

#### Scenario: Draw thick border
- **WHEN** BorderSide width is 2 or 3
- **THEN** horizontal lines use `━` and vertical lines use `┃`
- **AND** corner characters match amp's thick border style

### Requirement: Interactive Elements (MouseRegion)

系统 SHALL 提供 `MouseRegion`，以便捕捉鼠标事件（点击、悬停、滚轮等）并分发给对应的回调函数。

**逆向参考**: `G0` (Widget) + `si` (RenderObject) in `2026_tail_anonymous.js:L158519-158675`

#### Scenario: Mouse hover detection
- **WHEN** mouse enters a MouseRegion's bounds
- **THEN** `onEnter` callback is called with the mouse event
- **AND** `_isHovered` state is set to true
- **AND** `onExit` is called when mouse leaves the bounds

#### Scenario: Mouse click handling
- **WHEN** mouse clicks within a MouseRegion
- **THEN** `onClick` callback is called with the click event
- **AND** the MouseRegion registers itself as a mouse target via `result.addMouseTarget()`

## MODIFIED Requirements

### Requirement: Container Enhancement

`Container` 从简单的组合式 `StatelessWidget` 升级为拥有专属 RenderObject 的 `SingleChildRenderObjectWidget`，完全对齐 amp 的 `SR`/`qw` 架构。

**逆向参考**: `SR` (Widget) + `qw` (RenderObject) in `layout_widgets.js:L33-325`

#### Scenario: Container with decoration
- **WHEN** Container has decoration with color and border
- **THEN** background is filled with `decoration.color` using `screen.fill()`
- **AND** border is drawn using `_paintBorder()` with Unicode box-drawing characters
- **AND** child is rendered on top of background and border

#### Scenario: Container with margin
- **WHEN** Container has margin specified
- **THEN** the margin space is excluded from the child's layout constraints
- **AND** the child offset includes margin + border + padding offsets

#### Scenario: Container intrinsic sizing
- **WHEN** Container is in a shrink-wrap context
- **THEN** `getMinIntrinsicWidth/Height` and `getMaxIntrinsicWidth/Height` correctly account for margin + padding + border + child intrinsic size
- **AND** the calculation matches amp's `qw.getMinIntrinsicWidth` logic

## ADDED Requirement: TUI Widget Showcase Examples

系统 SHALL 提供一组独立的可运行示例脚本（`examples/tui-*.ts`），覆盖 **所有** `@flitter/tui` Widget，通过 `bun run examples/tui-xxx.ts` 即可在真实终端中看到渲染效果，无需启动 flitter-cli。

**目的**：这些 example 既是 API 用法文档，也是端到端集成验证——证明三棵树（Widget → Element → RenderObject）+ 渲染管线 + 终端输出在真实环境下工作正常。单元测试验证代码结构，example 验证真实行为。

### 覆盖范围

示例必须覆盖以下 **全部** TUI Widget（包括已有和本次新增的）：

| 分类 | Widget | 示例展示内容 |
|------|--------|-------------|
| **基础布局** | `Row`, `Column`, `Flex` | 水平/垂直排列，mainAxisAlignment 效果对比 |
| **基础布局** | `Padding`, `EdgeInsets` | 四方向内边距 |
| **基础布局** | `SizedBox` | 固定宽高、expand() |
| **基础布局** | `Stack`, `Positioned` | 层叠定位 |
| **基础布局** | `Expanded`, `Flexible` | 弹性分配空间 |
| **新增布局** | `Align`, `Center` | 居中/偏移定位，widthFactor/heightFactor |
| **新增布局** | `Spacer` | Row/Column 中弹性空白 |
| **文本** | `Text`, `RichText`, `TextSpan` | 纯文本、样式文本、富文本嵌套 |
| **装饰** | `Container` (重写) | 带背景色+圆角边框+margin+padding 的完整容器 |
| **新增装饰** | `BoxDecoration`, `Border`, `BorderSide` | 圆角/直角/粗边框对比 |
| **交互** | `MouseRegion` | 鼠标悬停高亮、点击响应 |
| **交互** | `GestureDetector` | 点击/双击手势 |
| **滚动** | `Viewport` (新增) | 视口裁剪+滚动偏移 |
| **滚动** | `Scrollable`, `ScrollController`, `ListView` | 虚拟化列表滚动 |
| **编辑** | `TextField`, `TextEditingController` | 文本输入 |
| **覆盖层** | `Overlay`, `OverlayEntry` | 弹出层 |
| **焦点** | `Focus`, `FocusManager`, `FocusNode` | 焦点链 |
| **主题** | `ThemeData`, `AppColorScheme` | 主题配色 |
| **媒体** | `MediaQuery` | 终端尺寸查询 |
| **Markdown** | `MarkdownParser`, `MarkdownRenderer` | Markdown 渲染 |

### 示例脚本结构

```
examples/
├── tui-layout-demo.ts          # Row/Column/Flex/Padding/SizedBox/Stack/Align/Center/Spacer
├── tui-container-demo.ts       # Container (decoration/border/margin/padding/dim)
├── tui-text-demo.ts            # Text/RichText/TextSpan 样式
├── tui-interactive-demo.ts     # MouseRegion/GestureDetector
├── tui-scroll-demo.ts          # Viewport/Scrollable/ListView
├── tui-editing-demo.ts         # TextField/TextEditingController
├── tui-overlay-demo.ts         # Overlay/OverlayEntry
├── tui-markdown-demo.ts        # Markdown 渲染
└── tui-kitchen-sink.ts         # 全量组合展示
```

### 运行方式

每个示例脚本：
1. 使用 `runApp()` 启动 TUI 渲染管线
2. 构建包含对应 Widget 的 Widget 树
3. 在真实终端中渲染输出
4. 交互式示例（如 TextField、MouseRegion）在用户按 `q` 或 `Ctrl+C` 后退出
5. 静态展示示例在渲染一帧后延迟 2 秒退出（或按任意键退出）

### 验收标准

- 每个示例可通过 `bun run examples/tui-xxx.ts` 在真实终端中运行
- 渲染结果肉眼可辨、布局正确
- 无 `Infinity` 尺寸、无渲染崩溃、无终端状态残留（退出后终端恢复正常）
- `tui-kitchen-sink.ts` 在一个页面中展示所有 Widget 类别

## REMOVED Requirements

无。
