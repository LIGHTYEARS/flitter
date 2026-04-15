# Rebuild TUI Rendering Framework Spec

## Why
当前的 `@flitter/tui` 渲染框架在完成了核心的 Widget/Element/RenderObject 三棵树之后，在基础布局组件、装饰系统、交互系统以及滚动处理上存在较多缺失（如 `Align`, `Center`, `Container` 的完整功能, `BoxDecoration`, `Border`, `Spacer`, `Viewport`, `GestureDetector` 等）。这些基础组件的缺失阻碍了上层应用（如 Amp CLI 的复杂 TUI）的像素级复刻。用户要求重新基于最新逆向代码（`amp-cli-reversed/modules`）进行补全重建，且“不需要考虑崩溃的问题”，专注于核心特性的复刻。

## What Changes
- 实现 `Align` 和 `Center` 组件及其 RenderObject (`RenderAlign` / `RenderCenter`)。
- 实现 `Spacer` 组件。
- 实现装饰系统：`BorderSide`, `Border`, `BoxDecoration`，以及在终端中基于 Unicode 的边框渲染逻辑。
- 增强 `Container`：支持 `alignment`, `padding`, `margin`, `decoration`, `constraints`。
- 实现 `BoxConstraints` 的完整能力。
- 增强交互系统：实现 `MouseRegion` 和 `GestureDetector`，以及完善 `RenderBox` 和 `HitTestResult` 的命中测试逻辑。
- 实现进阶滚动：`Viewport` 及其对应的 RenderObject，支持偏移裁剪。

## Impact
- Affected specs: `analyze-amp-chatview-tui` (将为聊天视图提供底层依赖支撑)。
- Affected code: `packages/tui/src/widgets/` 和 `packages/tui/src/tree/` 目录。

## ADDED Requirements
### Requirement: Basic Layout Widgets
系统 SHALL 提供 `Align`、`Center` 和 `Spacer`，以支持更细粒度的定位和空间填充。

#### Scenario: Center a text
- **WHEN** user wraps a Text widget with Center
- **THEN** the text is positioned exactly in the middle of its parent's available space.

### Requirement: Decoration and Borders
系统 SHALL 提供 `BoxDecoration` 和 `Border` 系统，允许通过 `Container` 绘制终端框线（如单线、双线、圆角等）。

### Requirement: Interactive Elements
系统 SHALL 提供 `GestureDetector` 和 `MouseRegion`，以便捕捉鼠标事件（点击、悬停等）并分发给对应的回调函数。

## MODIFIED Requirements
### Requirement: Container Enhancement
`Container` 从简单的组合式 `StatelessWidget` 升级为具备专属 `RenderObject`（或复杂组合）的全功能容器，支持边距、对齐和背景装饰。

## REMOVED Requirements
无。
