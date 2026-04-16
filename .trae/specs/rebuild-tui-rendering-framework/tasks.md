# Tasks

> **CRITICAL**: 每个任务实现前，必须先阅读对应的 `amp-cli-reversed/modules/` 逆向源码。
> 禁止自行设计代码结构，必须直译 amp 的原始架构。
> 所有类和关键方法必须添加 `逆向: 混淆名 (文件:行号)` 格式注释。

---

- [ ] Task 1: 实现基础布局组件 (Align, Center, Spacer)
  - **逆向源码**: `CY` (RenderPositionedBox) in `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js:L760-802`
  - [ ] SubTask 1.1: 创建 `packages/tui/src/widgets/align.ts`
    - 实现 `Align` Widget（SingleChildRenderObjectWidget），属性: `alignment`, `widthFactor`, `heightFactor`
    - 实现 `RenderPositionedBox` RenderObject
    - **逆向: CY** — `performLayout` 逻辑: loosen 约束 → layout child → 计算 factor 尺寸 → 居中偏移
    - 无子节点时: widthFactor 未定义且 maxWidth 有限取 maxWidth，否则取 0
    - 添加 `逆向: CY (layout_widgets.js:760-802)` 注释
  - [ ] SubTask 1.2: 创建 `packages/tui/src/widgets/center.ts`
    - `Center` 继承 `Align`，默认 `alignment: Alignment.center`
    - **逆向: amp 中 Center 是 Align 的语法糖**，无独立 RenderObject
  - [ ] SubTask 1.3: 创建 `packages/tui/src/widgets/spacer.ts`
    - `Spacer` 通过 `Flexible` + `SizedBox.expand()` 组合实现
    - **逆向: amp 中 Spacer 无独立类**，是 Flexible(flex) 的便捷封装
    - 属性: `flex` (默认 1)
  - [ ] SubTask 1.4: 更新 `packages/tui/src/widgets/index.ts` 导出

- [ ] Task 2: 实现装饰系统 (BorderSide, Border, BoxDecoration)
  - **逆向源码**:
    - `e9` (BorderSide) in `amp-cli-reversed/modules/2125_unknown_e9.js:L1-8`
    - `h9` (Border) in `amp-cli-reversed/modules/2124_unknown_h9.js:L1-15`
    - `_paintBorder` in `qw` (ContainerRenderObject) `layout_widgets.js:L212-318`
  - [ ] SubTask 2.1: 创建 `packages/tui/src/widgets/border-side.ts`
    - 实现 `BorderSide` 类，属性: `color`, `width` (默认 1), `style` ("rounded" | "solid" | 默认 "rounded")
    - **逆向: e9** — 构造函数签名 `(color = Color.black, width = 1, style = "rounded")`
    - 添加 `逆向: e9 (2125_unknown_e9.js:1-8)` 注释
  - [ ] SubTask 2.2: 创建 `packages/tui/src/widgets/border.ts`
    - 实现 `Border` 类，属性: `top`, `right`, `bottom`, `left` (均为 BorderSide | undefined)
    - 静态工厂: `Border.all(side)` 和 `Border.symmetric({ vertical, horizontal })`
    - **逆向: h9** — `all(T)` 返回 `new h9(T, T, T, T)`，`symmetric(T, R)` 返回 `new h9(R, T, R, T)`
    - 添加 `逆向: h9 (2124_unknown_h9.js:1-15)` 注释
  - [ ] SubTask 2.3: 创建 `packages/tui/src/widgets/box-decoration.ts`
    - 实现 `BoxDecoration` 类，属性: `color?`, `border?`
    - **逆向: amp 中 decoration 是内联对象 `{ color, border }`**，无独立类
    - Flitter 封装为类型安全的类，但结构必须与 amp 的内联对象兼容
  - [ ] SubTask 2.4: 提取终端边框 Unicode 字符渲染逻辑
    - 水平线: `\u2500`(width=1) / `\u2501`(width≥2)
    - 垂直线: `\u2502`(width=1) / `\u2503`(width≥2)
    - 圆角 (style="rounded"): `\u256D\u256E\u2570\u256F`
    - 直角 (style="solid"): `\u250C\u2510\u2514\u2518` (width=1) / `\u250F\u2513\u2517\u251B` (width≥2)
    - **逆向: qw._paintBorder 中的 `i()`, `c()`, `s()` 函数** (layout_widgets.js:L216-270)
    - 使用 `screen.mergeBorderChar()` 绘制，支持 dim 属性
  - [ ] SubTask 2.5: 更新 `packages/tui/src/widgets/index.ts` 导出

- [ ] Task 3: 重写 Container 组件
  - **逆向源码**: `SR` (Widget) + `qw` (RenderObject) in `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js:L33-325`
  - [ ] SubTask 3.1: 重写 `packages/tui/src/widgets/container.ts`
    - 将 Container 从 `StatelessWidget` 重写为 `SingleChildRenderObjectWidget`
    - Widget 属性: `width?`, `height?`, `padding?`, `margin?`, `decoration?`, `constraints?`, `child?`
    - **逆向: SR** — `createElement()` 返回 `RenderObjectElement`，`createRenderObject()` 返回 `ContainerRenderObject`
    - `updateRenderObject()`: 调用 `renderObject.updateProperties(width, height, padding, margin, decoration, constraints)`
    - 添加 `逆向: SR (layout_widgets.js:33-70)` 注释
  - [ ] SubTask 3.2: 实现 `ContainerRenderObject` (RenderObject 子类)
    - **逆向: qw** — 核心方法:
    - `performLayout()`: 计算边框宽度 → 扣除 margin+padding+border → 子约束 → 子布局 → 自身尺寸
      - 边框占位: `(border.left ? 1 : 0) + (border.right ? 1 : 0)` (水平), 同理垂直
      - 子偏移: `margin.left + borderLeft + padding.left`, `margin.top + borderTop + padding.top`
      - 自身尺寸: 紧约束时取约束值，否则取内容+边距+边框
    - `paint()`: 先填充背景色 (`decoration.color`) → 绘制边框 (`_paintBorder`) → 绘制子节点
    - `_paintBorder()`: **必须严格对齐 amp 的 Unicode box-drawing 字符逻辑** (layout_widgets.js:L212-318)
    - `getMinIntrinsicWidth/Height()`, `getMaxIntrinsicWidth/Height()`: 完整固有尺寸计算
    - `setForceDim(dim)`: dim 模式支持
    - `hitTest()`: 委托给 super
    - `dispose()`: 清理 _decoration/_constraints/_padding/_margin
    - 添加 `逆向: qw (layout_widgets.js:71-325)` 注释
  - [ ] SubTask 3.3: 修复所有使用 Container 的现有代码
    - Container 接口变更: 从 `Container({ padding, width, height, child })` 到 `Container({ width, height, padding, margin, decoration, constraints, child })`
    - 搜索所有 `new Container(` 调用并适配新接口
  - [ ] SubTask 3.4: 更新 Container 测试

- [ ] Task 4: 实现 MouseRegion 和 GestureDetector
  - **逆向源码**: `G0` (Widget) + `si` (RenderObject) in `amp-cli-reversed/modules/2026_tail_anonymous.js:L158519-158675`
  - [ ] SubTask 4.1: 创建 `packages/tui/src/widgets/mouse-region.ts`
    - 实现 `MouseRegion` Widget (SingleChildRenderObjectWidget)
    - 属性: `onClick?`, `onEnter?`, `onExit?`, `onHover?`, `onScroll?`, `onRelease?`, `onDrag?`, `cursor?`, `opaque` (默认 true)
    - **逆向: G0** — `createRenderObject()` 返回 `RenderMouseRegion`
    - `updateRenderObject()`: 直接赋值所有回调属性
    - 添加 `逆向: G0 (2026_tail_anonymous.js:158519-158567)` 注释
  - [ ] SubTask 4.2: 实现 `RenderMouseRegion` (RenderObject 子类)
    - **逆向: si** — 核心方法:
    - `handleMouseEvent(event)`: 按 event.type 分发到 onClick/onEnter/onExit/onHover/onScroll/onDrag/onRelease
    - `_isHovered` 状态追踪 (enter→true, exit→false)
    - `hasMouseListeners` 计算属性: `!!(onClick || onEnter || onExit || onHover || onScroll || onRelease || onDrag)`
    - `performLayout()`: 单子布局，自身尺寸 = 子尺寸
    - `hitTest()`: 命中时调用 `result.addMouseTarget(this, position)` 注册鼠标目标
    - `paint()`: 直接绘制子节点
    - `dispose()`: 从 WidgetsBinding.instance 移除 region，清空所有回调
    - 添加 `逆向: si (2026_tail_anonymous.js:158576-158675)` 注释
  - [ ] SubTask 4.3: 增强 `HitTestResult` 添加 `addMouseTarget` 方法
    - **逆向: amp 的 hitTest 中 `T.addMouseTarget(this, R)` 调用**
    - 在 `packages/tui/src/gestures/hit-test.ts` 中添加 `_mouseTargets` 列表和 `addMouseTarget()` 方法
  - [ ] SubTask 4.4: 创建 `packages/tui/src/widgets/gesture-detector.ts`
    - `GestureDetector` 作为 `MouseRegion` 的便捷封装
    - 属性: `onTap?`, `onDoubleTap?`, `onLongPress?`
    - **逆向: amp 中无独立 GestureDetector**，高级手势在应用层通过 MouseRegion + 状态追踪实现
    - Flitter 封装为便捷 Widget，内部使用 MouseRegion
  - [ ] SubTask 4.5: 更新 `packages/tui/src/widgets/index.ts` 导出

- [ ] Task 5: 实现 Viewport 组件
  - **逆向源码**: `MY` (Widget) + `g1T`/`v1T` (RenderObject) in `amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js:L83-305`
  - [ ] SubTask 5.1: 创建 `packages/tui/src/widgets/viewport.ts`
    - 实现 `Viewport` Widget (SingleChildRenderObjectWidget)
    - 属性: `axisDirection` (默认 "vertical"), `offset` (默认 0), `scrollController?`
    - **逆向: MY** — `createRenderObject()` 返回 `RenderViewport`
    - `updateRenderObject()`: 调用 `renderObject.updateProperties(axisDirection, offset, scrollController)`
    - 添加 `逆向: MY (interactive_widgets.js:83-106)` 注释
  - [ ] SubTask 5.2: 实现 `RenderViewport` (RenderObject 子类)
    - **逆向: g1T** — 核心方法:
    - `_axisDirection`, `_scrollOffset`, `_scrollController` 属性
    - `updateProperties()`: 属性变化时 markNeedsLayout
    - `performLayout()`: 子节点布局 → 更新 scrollController.maxScrollExtent → 更新 _scrollOffset
    - `paint()`: 使用 ClipRect 裁剪子节点到视口范围
    - `updateChildOffset()`: 更新子节点偏移
    - followMode 支持: 自动跟随到底部
    - 添加 `逆向: g1T (interactive_widgets.js:108-170)` 注释
  - [ ] SubTask 5.3: 实现 `RenderViewportWithPosition` (可选，按需)
    - **逆向: v1T** — 额外支持 `position` 属性
    - 添加 `逆向: v1T (interactive_widgets.js:203-305)` 注释
  - [ ] SubTask 5.4: 更新 `packages/tui/src/widgets/index.ts` 导出

- [ ] Task 6: 增强 BoxConstraints
  - **逆向源码**: `o0` in `amp-cli-reversed/modules/0534_unknown_o0.js:L4-70`
  - [ ] SubTask 6.1: 在 `constrain()` 方法中添加 isFinite 断言
    - **逆向: o0.constrain** — amp 包含 `e8(isFinite(T), ...)` 断言
    - 当前 Flitter 的 constrain 不做此检查，需对齐
  - [ ] SubTask 6.2: 确认所有静态方法与 amp 对齐
    - `tight()`, `loose()`, `tightFor()`, `enforce()`, `loosen()`, `tighten()` 已实现
    - 检查 `tightFor` 的默认值是否与 amp 一致 (width→0..Infinity, height→0..Infinity)

- [ ] Task 7: 创建 TUI Widget Showcase Examples
  - **目的**: 提供独立可运行的示例脚本，覆盖 **所有** @flitter/tui Widget（包括已有和新增），通过 `bun run examples/tui-xxx.ts` 在真实终端中看到渲染效果。不依赖 flitter-cli。
  - [ ] SubTask 7.1: 创建 `examples/tui-layout-demo.ts`
    - 展示: Row, Column, Flex (mainAxisAlignment 效果对比), Padding, EdgeInsets, SizedBox, Stack, Positioned, Expanded, Flexible
    - 展示: Align (widthFactor/heightFactor), Center, Spacer
    - 使用 `runApp()` 启动，渲染后延迟 2 秒退出
  - [ ] SubTask 7.2: 创建 `examples/tui-container-demo.ts`
    - 展示: Container 带背景色+圆角边框 (`BorderSide(style="rounded")`)
    - 展示: Container 带直角边框 (`BorderSide(style="solid")`)
    - 展示: Container 带粗边框 (`BorderSide(width=2)`)
    - 展示: Container 带 margin + padding + decoration 组合
    - 展示: Container dim 模式 (`setForceDim(true)`)
    - 展示: BoxDecoration, Border.all(), Border.symmetric()
  - [ ] SubTask 7.3: 创建 `examples/tui-text-demo.ts`
    - 展示: Text (纯文本), Text with TextStyle (bold/italic/underline/color)
    - 展示: RichText + TextSpan (嵌套样式)
    - 展示: 多行文本
  - [ ] SubTask 7.4: 创建 `examples/tui-interactive-demo.ts`
    - 展示: MouseRegion (onEnter/onExit/onHover 改变背景色, onClick 打印日志)
    - 展示: GestureDetector (onTap/onDoubleTap)
    - 交互式: 按 `q` 退出
  - [ ] SubTask 7.5: 创建 `examples/tui-scroll-demo.ts`
    - 展示: Viewport + ScrollController (滚动裁剪效果)
    - 展示: Scrollable + ListView (虚拟化列表)
    - 展示: 键盘滚动 (上/下箭头)
  - [ ] SubTask 7.6: 创建 `examples/tui-editing-demo.ts`
    - 展示: TextField + TextEditingController (文本输入)
    - 展示: placeholder, 光标移动
  - [ ] SubTask 7.7: 创建 `examples/tui-overlay-demo.ts`
    - 展示: Overlay + OverlayEntry (弹出层)
    - 展示: CommandPalette (命令面板)
  - [ ] SubTask 7.8: 创建 `examples/tui-markdown-demo.ts`
    - 展示: MarkdownParser + MarkdownRenderer (Markdown 渲染)
    - 展示: 标题/粗体/斜体/代码块/列表/表格
  - [ ] SubTask 7.9: 创建 `examples/tui-kitchen-sink.ts`
    - 全量组合展示: 在一个页面中展示所有 Widget 类别
    - 左右分栏: 左侧布局组件，右侧交互/滚动组件
    - 使用 Container 带边框分隔各区域

# Task Dependencies
- [Task 3] depends on [Task 1] (Container 需要 alignment 支持)
- [Task 3] depends on [Task 2] (Container 需要 decoration/border 支持)
- [Task 5] depends on [Task 4] (Viewport 的滚动事件依赖 MouseRegion 的 hitTest/addMouseTarget)
- [Task 4] depends on [Task 3] (MouseRegion 的 hitTest 需要 Container 的 hitTest 基础设施)
- [Task 7] depends on [Task 1-6] (所有 Widget 实现完成后才能编写完整示例)

# Execution Order (Waves)

**Wave A** (无依赖): Task 1 (Align/Center/Spacer), Task 2 (Border/BorderSide/BoxDecoration), Task 6 (BoxConstraints)
**Wave B** (依赖 Wave A): Task 3 (Container 重写)
**Wave C** (依赖 Wave B): Task 4 (MouseRegion/GestureDetector)
**Wave D** (依赖 Wave C): Task 5 (Viewport)
**Wave E** (依赖 Wave A-D): Task 7 (Examples — 覆盖所有 TUI Widget)
