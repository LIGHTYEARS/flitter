# Tasks
- [ ] Task 1: 实现基础布局组件 (Align, Center, Spacer)
  - [ ] SubTask 1.1: 在 `packages/tui/src/widgets/` 下创建 `align.ts`，实现 `Align` 和 `RenderPositionedBox`。
  - [ ] SubTask 1.2: 在 `packages/tui/src/widgets/` 下创建 `center.ts`，实现 `Center` 组件。
  - [ ] SubTask 1.3: 在 `packages/tui/src/widgets/` 下创建 `spacer.ts`，利用 `Expanded` 和 `SizedBox` 实现 `Spacer`。

- [ ] Task 2: 实现装饰系统 (Decoration & Border)
  - [ ] SubTask 2.1: 在 `packages/tui/src/widgets/` 下创建 `decoration.ts`，实现 `BoxDecoration`。
  - [ ] SubTask 2.2: 在 `packages/tui/src/widgets/` 下创建 `border.ts`，实现 `Border` 和 `BorderSide`，并抽象 `BorderStyle`（`rounded`, `sharp`, `double` 等）。
  - [ ] SubTask 2.3: 提取或编写终端边框的 Unicode 字符渲染逻辑（类似于原版 `_paintBorder`）。

- [ ] Task 3: 升级 Container 组件
  - [ ] SubTask 3.1: 在 `packages/tui/src/widgets/container.ts` 中新增 `margin`, `decoration`, `alignment`, `constraints` 属性。
  - [ ] SubTask 3.2: 将 `Container` 的实现改为完整的 `RenderObjectWidget`（或使用嵌套逻辑），实现基于终端单元格的背景填充与边框绘制。

- [ ] Task 4: 实现基础交互与手势系统 (GestureDetector & MouseRegion)
  - [ ] SubTask 4.1: 在 `packages/tui/src/tree/render-box.ts` 中增强 `hitTest` 方法，支持 `HitTestResult`。
  - [ ] SubTask 4.2: 创建 `packages/tui/src/widgets/mouse-region.ts`，实现 `MouseRegion`，支持悬停、点击状态反馈。
  - [ ] SubTask 4.3: 创建 `packages/tui/src/widgets/gesture-detector.ts`，封装 `MouseRegion` 以支持 `onTap`, `onDoubleTap` 等事件回调。

- [ ] Task 5: 完善高级布局系统 (Viewport)
  - [ ] SubTask 5.1: 在 `packages/tui/src/scroll/` 中创建 `viewport.ts`，实现 `Viewport` Widget 和 `RenderViewport`。
  - [ ] SubTask 5.2: 支持基于 `offset` (ScrollOffset) 的裁剪渲染逻辑，为后续的长列表滚动打下基础。

# Task Dependencies
- [Task 3] depends on [Task 1] (对于 Alignment 的依赖)
- [Task 3] depends on [Task 2] (对于 Decoration 的依赖)
- [Task 5] depends on [Task 4] (滚动事件依赖基础的手势和命中测试支持)
