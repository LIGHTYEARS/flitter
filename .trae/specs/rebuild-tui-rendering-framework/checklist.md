# Verification Checklist

> 每项验证必须对照 `amp-cli-reversed/modules/` 逆向源码进行交叉检查。
> 验证标准不仅是"功能正确"，更是"与 amp 原始实现一致"。

---

## Task 1: 基础布局组件 (Align, Center, Spacer)

- [ ] `Align` Widget 是 `SingleChildRenderObjectWidget`，非组合式 Widget
  - 验证: 对照 `CY` (layout_widgets.js:L760-802)，确认类继承关系一致
- [ ] `RenderPositionedBox.performLayout` 逻辑与 amp 的 `CY.performLayout` 一致
  - 验证: loosen 约束 → layout child → factor 尺寸计算 → 偏移定位
  - 验证: 无子节点时的 fallback 逻辑 (widthFactor 未定义且 maxWidth 有限取 maxWidth)
- [ ] `Center` 继承 `Align`，默认 `alignment: Alignment.center`
  - 验证: amp 中 Center 是 Align 的语法糖
- [ ] `Spacer` 通过 `Flexible` + `SizedBox.expand()` 组合实现
  - 验证: amp 中 Spacer 无独立类
- [ ] 所有类和关键方法有 `逆向: 混淆名 (文件:行号)` 注释
- [ ] `bun test packages/tui/src/widgets/align.test.ts` 通过
- [ ] `bun test packages/tui/src/widgets/center.test.ts` 通过
- [ ] `bun test packages/tui/src/widgets/spacer.test.ts` 通过

## Task 2: 装饰系统 (BorderSide, Border, BoxDecoration)

- [ ] `BorderSide` 类属性与 amp 的 `e9` 一致: `color`, `width` (默认 1), `style` (默认 "rounded")
  - 验证: 对照 `e9` (2125_unknown_e9.js:L1-8)
- [ ] `Border` 类属性与 amp 的 `h9` 一致: `top`, `right`, `bottom`, `left`
  - 验证: 对照 `h9` (2124_unknown_h9.js:L1-15)
  - 验证: `Border.all(side)` 返回四边相同的 Border
  - 验证: `Border.symmetric({ vertical, horizontal })` 参数顺序与 amp 一致 (top/bottom=vertical, left/right=horizontal)
- [ ] `BoxDecoration` 属性: `color?`, `border?`
  - 验证: 与 amp 的内联对象 `{ color, border }` 结构兼容
- [ ] 边框 Unicode 字符选择逻辑与 amp 的 `_paintBorder` 完全一致
  - 验证: 对照 `qw._paintBorder` (layout_widgets.js:L212-318)
  - 验证: 水平线 `\u2500`(width=1) / `\u2501`(width≥2)
  - 验证: 垂直线 `\u2502`(width=1) / `\u2503`(width≥2)
  - 验证: 圆角 `\u256D\u256E\u2570\u256F` (style="rounded")
  - 验证: 直角 `\u250C\u2510\u2514\u2518` (width=1, style="solid") / `\u250F\u2513\u2517\u251B` (width≥2)
  - 验证: 角落字符选择逻辑 `s(width, isRounded)` 与 amp 一致
- [ ] 所有类和关键方法有 `逆向: 混淆名 (文件:行号)` 注释
- [ ] `bun test packages/tui/src/widgets/border-side.test.ts` 通过
- [ ] `bun test packages/tui/src/widgets/border.test.ts` 通过
- [ ] `bun test packages/tui/src/widgets/box-decoration.test.ts` 通过

## Task 3: Container 重写

- [ ] `Container` 是 `SingleChildRenderObjectWidget`，非 `StatelessWidget`
  - 验证: 对照 `SR` (layout_widgets.js:L33-70)
  - 验证: `createRenderObject()` 返回 `ContainerRenderObject`
  - 验证: `updateRenderObject()` 调用 `renderObject.updateProperties(...)`
- [ ] `ContainerRenderObject` 的 `performLayout` 逻辑与 amp 的 `qw.performLayout` 一致
  - 验证: 对照 `qw` (layout_widgets.js:L71-325)
  - 验证: 边框占位计算 `(border.left ? 1 : 0) + (border.right ? 1 : 0)`
  - 验证: 子约束 = 父约束 - margin - padding - border
  - 验证: 子偏移 = margin + border + padding
  - 验证: 自身尺寸 = 紧约束取约束值，否则取内容+边距+边框
- [ ] `ContainerRenderObject.paint` 绘制顺序与 amp 一致
  - 验证: 先填充背景色 → 再绘制边框 → 最后绘制子节点
  - 验证: 背景填充使用 `screen.fill()`
  - 验证: 边框绘制使用 `_paintBorder()`
- [ ] `ContainerRenderObject._paintBorder` 与 amp 完全一致
  - 验证: 逐行对照 layout_widgets.js:L212-318
  - 验证: 支持 `setForceDim` (dim 属性)
- [ ] `ContainerRenderObject` 的固有尺寸计算与 amp 一致
  - 验证: `getMinIntrinsicWidth/Height` 和 `getMaxIntrinsicWidth/Height`
  - 验证: 对照 `qw.getMinIntrinsicWidth` (layout_widgets.js:L136-198)
- [ ] 所有使用 Container 的现有代码已适配新接口
  - 验证: `rg "new Container\(" packages/` 搜索所有调用点
- [ ] 所有类和关键方法有 `逆向: 混淆名 (文件:行号)` 注释
- [ ] `bun test packages/tui/src/widgets/container.test.ts` 通过

## Task 4: MouseRegion 和 GestureDetector

- [ ] `MouseRegion` Widget 属性与 amp 的 `G0` 一致
  - 验证: 对照 `G0` (2026_tail_anonymous.js:L158519-158567)
  - 验证: onClick/onEnter/onExit/onHover/onScroll/onRelease/onDrag/cursor/opaque
- [ ] `RenderMouseRegion.handleMouseEvent` 分发逻辑与 amp 的 `si.handleMouseEvent` 一致
  - 验证: 对照 `si` (2026_tail_anonymous.js:L158576-158675)
  - 验证: event.type → click/enter/exit/hover/scroll/drag/release 分发
  - 验证: enter 时 `_isHovered = true`，exit 时 `_isHovered = false`
- [ ] `RenderMouseRegion.hitTest` 注册鼠标目标
  - 验证: 命中时调用 `result.addMouseTarget(this, position)`
  - 验证: `hasMouseListeners` 计算属性
- [ ] `RenderMouseRegion.dispose` 从 WidgetsBinding 移除 region
  - 验证: 对照 `si.dispose` (2026_tail_anonymous.js:L158674-158675)
- [ ] `HitTestResult.addMouseTarget` 方法已添加
  - 验证: 对照 amp 的 `T.addMouseTarget(this, R)` 调用
- [ ] `GestureDetector` 作为 MouseRegion 的便捷封装
  - 验证: amp 中无独立 GestureDetector，Flitter 封装为便捷 Widget
- [ ] 所有类和关键方法有 `逆向: 混淆名 (文件:行号)` 注释
- [ ] `bun test packages/tui/src/widgets/mouse-region.test.ts` 通过
- [ ] `bun test packages/tui/src/widgets/gesture-detector.test.ts` 通过

## Task 5: Viewport

- [ ] `Viewport` Widget 属性与 amp 的 `MY` 一致
  - 验证: 对照 `MY` (interactive_widgets.js:L83-106)
  - 验证: axisDirection/offset/scrollController
- [ ] `RenderViewport.performLayout` 逻辑与 amp 的 `g1T.performLayout` 一致
  - 验证: 对照 `g1T` (interactive_widgets.js:L108-170)
  - 验证: 子节点布局 → 更新 scrollController.maxScrollExtent → 更新 _scrollOffset
  - 验证: followMode 支持 (自动跟随到底部)
- [ ] `RenderViewport.paint` 使用 ClipRect 裁剪
  - 验证: 对照 `g1T.paint` (interactive_widgets.js:L140-170)
  - 验证: 使用 `zm` (ClipRect) 裁剪子节点到视口范围
- [ ] 所有类和关键方法有 `逆向: 混淆名 (文件:行号)` 注释
- [ ] `bun test packages/tui/src/widgets/viewport.test.ts` 通过

## Task 6: BoxConstraints 增强

- [ ] `constrain()` 方法包含 isFinite 断言
  - 验证: 对照 `o0.constrain` (0534_unknown_o0.js:L31-34)
  - 验证: `assert(isFinite(width))` 和 `assert(isFinite(height))`
- [ ] `tightFor` 默认值与 amp 一致
  - 验证: width→0..Infinity, height→0..Infinity
- [ ] `bun test packages/tui/src/tree/constraints.test.ts` 通过

## Task 7: TUI Widget Showcase Examples

- [ ] `examples/tui-layout-demo.ts` 可通过 `bun run` 执行，在真实终端中渲染
  - 验证: 展示 Row/Column/Flex/Padding/SizedBox/Stack/Expanded/Flexible/Align/Center/Spacer
  - 验证: 布局效果肉眼可辨，无 Infinity 尺寸或渲染崩溃
  - 验证: 退出后终端状态恢复正常（无残留 raw mode / alternate screen）
- [ ] `examples/tui-container-demo.ts` 可通过 `bun run` 执行
  - 验证: 圆角边框 (`╭╮╰╯`) 正确渲染
  - 验证: 直角边框 (`┌┐└┘`) 正确渲染
  - 验证: 粗边框 (`━┃`) 正确渲染
  - 验证: 背景色填充可见
  - 验证: margin + padding + decoration 组合布局正确
  - 验证: dim 模式视觉效果
- [ ] `examples/tui-text-demo.ts` 可通过 `bun run` 执行
  - 验证: 纯文本、样式文本（bold/italic/underline/color）、富文本嵌套正确渲染
- [ ] `examples/tui-interactive-demo.ts` 可通过 `bun run` 执行
  - 验证: 鼠标悬停时背景色变化
  - 验证: 点击时回调触发
  - 验证: 按 `q` 可正常退出
- [ ] `examples/tui-scroll-demo.ts` 可通过 `bun run` 执行
  - 验证: Viewport 裁剪效果（内容超出视口时被裁剪）
  - 验证: 键盘上下箭头可滚动
- [ ] `examples/tui-editing-demo.ts` 可通过 `bun run` 执行
  - 验证: TextField 可输入文本
  - 验证: 光标位置正确
- [ ] `examples/tui-overlay-demo.ts` 可通过 `bun run` 执行
  - 验证: Overlay 弹出层正确渲染在主内容之上
- [ ] `examples/tui-markdown-demo.ts` 可通过 `bun run` 执行
  - 验证: Markdown 标题/粗体/代码块/列表正确渲染
- [ ] `examples/tui-kitchen-sink.ts` 可通过 `bun run` 执行
  - 验证: 在一个页面中展示所有 Widget 类别
  - 验证: 布局不崩溃，各区域可辨识
- [ ] 所有示例脚本无 `Infinity` 尺寸、无渲染崩溃、无终端状态残留
- [ ] 所有示例脚本使用 `runApp()` 启动 TUI 渲染管线（非 flitter-cli）

## Cross-Cutting Verification

- [ ] `tsc --noEmit` 全量通过，零 `any` 类型
- [ ] 所有新增文件在 `packages/tui/src/widgets/index.ts` 中正确导出
- [ ] 所有新增类有 `逆向:` 注释，格式为 `逆向: 混淆名 (文件:行号)`
- [ ] 无自行设计的代码结构，所有架构决策可追溯至 amp 逆向源码
- [ ] **端到端集成验证**: 至少一个 example 在 `tmux` 或 `script` 环境下成功运行并产生正确输出
