# Gap 审计报告 #4: 滚动与视口

## 审计范围

本报告审计 **滚动与视口** 领域的所有组件，包括：

| 组件 | 源码位置 | Amp 对应 |
|------|---------|---------|
| SingleChildScrollView | `flitter-core/src/widgets/scroll-view.ts` | R4 |
| Scrollable | `flitter-core/src/widgets/scroll-view.ts` | dH0 |
| ScrollViewport / RenderScrollViewport | `flitter-core/src/widgets/scroll-view.ts` | yH0 / oH0 |
| ScrollController | `flitter-core/src/widgets/scroll-controller.ts` | Lg |
| Scrollbar / RenderScrollbar | `flitter-core/src/widgets/scrollbar.ts` | Uu / ia |
| StickyHeader / RenderStickyHeader | `flitter-core/src/widgets/sticky-header.ts` + `layout/render-sticky-header.ts` | — |
| SelectionList | `flitter-core/src/widgets/selection-list.ts` | ap |
| ClipCanvas | `flitter-core/src/scheduler/clip-canvas.ts` | E$ |

审计数据源：
- Amp 分析报告: `amp-tui-analysis-7.md`（ScrollView / Viewport / followMode / 虚拟化 / Scrollbar 深度分析）
- `.gap/17-scrollbar-enhancements.md`（Scrollbar 增强：水平支持 / 鼠标交互 / 类型安全）
- `.gap/19-responsive-breakpoints.md`（响应式断点工具）
- flitter-core 源码及对应测试文件

---

## 审计结论摘要

**滚动与视口子系统是 flitter-core 中与 Amp 对齐度最高的子系统之一。** 核心滚动管线（ScrollView → Scrollable → ScrollViewport → RenderScrollViewport → ScrollController → followMode → ClipCanvas）实现了与 Amp 逆向结果 100% 的算法一致性。Scrollbar 在 `.gap/17` 指导下已完成三阶段增强（类型安全、水平支持、鼠标交互），超越了 Amp 的只读滚动条。

主要 Gap 集中在**非核心增强领域**：SelectionList 缺少长列表滚动集成、StickyHeader 的 `as any` 类型安全问题、可配置滚轮步长、以及未来可能需要的虚拟化基础设施。

---

## Gap 清单

### GAP-4-001: SelectionList 长列表无自动滚动
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/selection-list.ts`
- **Amp 行为**: Amp 的 `ap`（SelectionList）在选项超出视口高度时，内嵌于 ScrollView 中或使用 viewport-aware 逻辑确保当前选中项始终可见（ensureVisible / scrollToIndex 语义）。Amp 的 Autocomplete 弹窗也有最大高度限制并支持滚动。
- **Flitter 现状**: `SelectionListState.build()` 将所有项直接放入 `Column({ mainAxisSize: 'min' })`，不包裹任何 `SingleChildScrollView`。当 items 数量超过视口高度时，底部项目被裁剪且不可达。键盘导航（j/k/ArrowUp/ArrowDown）在 `_selectedIndex` 超出可见区域后，用户无法看到当前选中项。没有 `ensureVisible`、`scrollToIndex` 或 `scrollIntoView` 类似的 API。
- **已有 .gap 引用**: 无直接引用
- **建议修复方向**:
  1. 在 `SelectionListState.build()` 中，当 items 数量可能超出视口时，用 `SingleChildScrollView` 包裹 `Column`
  2. 在 `ScrollController` 上添加 `ensureVisible(offset, extent)` 方法，或在 SelectionList 中计算选中项 offset 并调用 `jumpTo()` 确保其可见
  3. 可选：添加 `maxVisibleItems` 属性以限制可见区域高度

### GAP-4-002: ScrollController 缺少 ensureVisible / scrollToItem API
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/scroll-controller.ts`
- **Amp 行为**: Amp 的 ScrollController (Lg) 提供 `jumpTo` 和 `scrollBy`，但在实际应用中通过 followMode 自动跟随解决了"确保内容可见"的需求。Amp 的 animateTo 也是为 programmatic scroll-to-item 场景预留的。
- **Flitter 现状**: ScrollController 只有 `jumpTo(offset)` 和 `scrollBy(delta)` 两个定位 API，缺少更高层的 `ensureVisible(offset, size)` 方法。该方法应实现：如果目标区域已在视口内则不操作，如果在视口上方则滚动使其出现在顶部，如果在视口下方则滚动使其出现在底部。这是 Flutter 的 `Scrollable.ensureVisible()` 模式。
- **已有 .gap 引用**: 无
- **建议修复方向**:
  ```
  ensureVisible(itemOffset: number, itemSize: number = 1): void {
    if (itemOffset < this._offset) {
      this.jumpTo(itemOffset);
    } else if (itemOffset + itemSize > this._offset + this._viewportSize) {
      this.jumpTo(itemOffset + itemSize - this._viewportSize);
    }
  }
  ```

### GAP-4-003: RenderStickyHeader.paint() 中 `as any` 类型安全问题
- **优先级**: P2
- **影响范围**: `flitter-core/src/layout/render-sticky-header.ts` (第 104-107 行)
- **Amp 行为**: Amp 的 StickyHeader 在 paint 时直接使用 canvas 的 fillRect 方法清除 header 行。
- **Flitter 现状**: `RenderStickyHeader.paint()` 在访问 `fillRect` 时使用了 `const paintCtx = context as any; if (typeof paintCtx.fillRect === 'function')` 的 duck-typing 模式。这是 `.gap/09-type-safety-any-removal` 追踪的系统性问题的一部分，但具体到 StickyHeader 组件上尚未被修复。此外，`_getCurrentClip(context)` 方法也使用了 `as any` 来访问 `clipX/clipY/clipW/clipH` 或 `.clip` 属性。
- **已有 .gap 引用**: `.gap/09-type-safety-any-removal.md` (系统性问题), `.gap/17-scrollbar-enhancements.md` Phase 1（已在 Scrollbar 上修复了同类问题）
- **建议修复方向**:
  1. 确保 `PaintContext` 接口已包含 `fillRect()` 和 `withClip()` 方法签名（`.gap/17` Phase 1 已提出此方向）
  2. 将 `RenderStickyHeader.paint()` 和 `_getCurrentClip()` 中的 `as any` 替换为直接类型安全调用
  3. 为 `_getCurrentClip` 使用 PaintContext 的 `clipX/clipY/clipW/clipH` protected 字段或公开 getter

### GAP-4-004: 鼠标滚轮步长硬编码
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/scroll-view.ts` (第 162-167 行)
- **Amp 行为**: Amp 的鼠标滚轮步长硬编码为 3 行。`TerminalManager.scrollStep` 属性（默认 3，范围 1-20）是一个可配置选项，但 Amp 的 Scrollable 直接使用了固定值 3，未从 TerminalManager 读取。
- **Flitter 现状**: 同样硬编码为 3 行 (`scrollBy(-3)` / `scrollBy(3)`)。当前与 Amp 完全一致，但缺乏可配置性。如果未来需要支持可配置的滚轮步长（例如通过 TerminalManager 或 SingleChildScrollView 的属性），需要增加 `scrollStep` 参数。
- **已有 .gap 引用**: `amp-tui-analysis-7.md` 第 189 行提到此设计限制
- **建议修复方向**:
  1. 在 `SingleChildScrollView` 和 `Scrollable` 上添加 `scrollStep?: number` 可选属性（默认 3）
  2. `ScrollableState._handleScroll` 使用该属性值替代硬编码 3
  3. 保持向后兼容：不提供时默认为 3

### GAP-4-005: animateTo 缺少缓动曲线支持
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/scroll-controller.ts` (第 65-109 行)
- **Amp 行为**: Amp 的 animateTo 使用线性插值，无缓动曲线。
- **Flitter 现状**: 同样是线性插值。当前与 Amp 一致。但 Flutter 的 `ScrollController.animateTo` 支持 `Curve` 参数（如 `Curves.easeOut`），可提供更自然的滚动动画体验。对于终端 TUI 来说，行级精度下缓动效果有限，但在较大滚动距离时仍有感知差异。
- **已有 .gap 引用**: `.gap/65-animation-framework.md` 可能涉及通用动画框架
- **建议修复方向**:
  1. 添加可选的 `curve?: (t: number) => number` 参数到 `animateTo()`
  2. 预置几个常用缓动函数：`linear`（当前默认）、`easeOut = (t) => 1 - (1 - t) ** 2`、`easeInOut = (t) => t < 0.5 ? 2t² : 1 - (-2t+2)²/2`
  3. 保持向后兼容：不传 curve 时默认线性

### GAP-4-006: 嵌套滚动无事件溢出传播
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/scroll-view.ts`（Scrollable 的事件处理）
- **Amp 行为**: Amp 不使用嵌套 ScrollView，整个 UI 只有一个顶级 SingleChildScrollView。无嵌套滚动需求。
- **Flitter 现状**: 技术上可以嵌套 SingleChildScrollView，但内层 ScrollView 会"吞掉"所有滚轮事件和键盘滚动事件，不传播溢出 delta 到外层。具体表现：(1) 鼠标滚轮：MouseRegion.onScroll 事件从最深节点向上冒泡，第一个有 handler 的区域就停止；(2) 键盘：FocusScope 冒泡机制，最深的返回 'handled' 后外层不收到事件；(3) 当内层 ScrollView 滚到边界时，多余的 delta 不传递给外层。虽然当前 flitter-amp 不使用嵌套滚动，但作为通用框架的 flitter-core 可能在未来遇到此需求。
- **已有 .gap 引用**: 无
- **建议修复方向**:
  1. 在 `ScrollableState._handleScroll` 和 `_handleKey` 中检测"滚动到边界但仍有剩余 delta"的情况
  2. 当 `scrollBy()` 被 clamp 后，将剩余 delta 通过事件冒泡传递给父级
  3. 此为低优先级增强，仅在有实际嵌套滚动需求时实现

### GAP-4-007: 虚拟化（ListView.builder）基础设施缺失
- **优先级**: P2
- **影响范围**: `flitter-core`（新功能）
- **Amp 行为**: Amp 不支持列表虚拟化。使用 SingleChildScrollView 将整个子树作为一个整体处理——所有内容在每帧中完整构建、布局、绘制（ClipCanvas 裁剪阶段丢弃视口外内容）。
- **Flitter 现状**: 同样无虚拟化支持。对于终端 TUI 场景（典型 24-60 行视口），SingleChildScrollView + ClipCanvas 裁剪方案性能足够。但对于极长对话（1000+ 条消息）或大型数据列表，Widget/Element 创建和布局是 O(n)，可能成为性能瓶颈。
- **已有 .gap 引用**: 无
- **建议修复方向**:
  1. 暂不实现，当前架构满足需求
  2. 未来如需虚拟化，需实现类似 Flutter 的 Sliver 架构：`ListView.builder` + `SliverList` + `RenderSliverList`，包含 item builder、item extent 估算、可见范围计算等基础设施
  3. 中间方案：实现简单的"懒构建"模式——只构建视口内 ± 缓冲区范围的 Widget，无需完整 Sliver 架构

### GAP-4-008: RenderScrollViewport.paint() 中 `as any` 类型问题
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/scroll-view.ts` (第 408-409 行)
- **Amp 行为**: Amp 的 oH0.paint() 直接调用 `new E$(canvas, rect)` 创建裁剪画布。
- **Flitter 现状**: `RenderScrollViewport.paint()` 使用 `(context as any).withClip` 的 duck-typing 模式检查并调用 `withClip()`。这是因为从 `render-object.ts` 导入的 `PaintContext` 是空接口，不包含 `withClip` 方法签名。`.gap/17` Phase 1 已提出在 PaintContext 接口上添加 `withClip?()` 可选方法签名来解决。
- **已有 .gap 引用**: `.gap/17-scrollbar-enhancements.md` Phase 1, `.gap/09-type-safety-any-removal.md`
- **建议修复方向**: 与 GAP-4-003 同属 PaintContext 类型安全问题，应统一在 PaintContext 接口增强中解决

### GAP-4-009: Scrollbar hover 视觉反馈缺失
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/scrollbar.ts`
- **Amp 行为**: Amp 的 Scrollbar (ia) 不支持 hover 反馈（纯展示组件）。
- **Flitter 现状**: `.gap/17` Phase 3 已实现鼠标交互（click-to-jump + thumb dragging），但 Phase 4（hover 视觉反馈：`hoverThumbColor`、`hoverTrackColor`）尚未实现。当鼠标悬停在 Scrollbar 上时没有视觉变化。虽然 Amp 也没有此功能，但 flitter 已超越 Amp 添加了交互支持，hover 反馈是交互体验的自然延伸。
- **已有 .gap 引用**: `.gap/17-scrollbar-enhancements.md` Phase 4（标记为 Future Enhancement）
- **建议修复方向**:
  1. 添加 `hoverThumbColor?: Color` 和 `hoverTrackColor?: Color` 可选属性
  2. 在 `ScrollbarState` 中通过 `MouseRegion.onEnter/onExit` 追踪 hover 状态
  3. hover 时使用 hover 颜色重绘

### GAP-4-010: SelectionList 缺少滚动条视觉指示
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/selection-list.ts`
- **Amp 行为**: Amp 的 SelectionList (ap) 在聊天视图中出现时通常项数较少，但 Autocomplete 弹窗可能有较多候选项。
- **Flitter 现状**: SelectionList 不提供任何滚动指示。即使修复了 GAP-4-001（添加 ScrollView 包裹），用户仍不知道列表是否还有更多内容。缺少 "X of Y" 计数显示或集成的滚动条。
- **已有 .gap 引用**: 无
- **建议修复方向**:
  1. 在 GAP-4-001 修复后，可选地在 SelectionList 右侧添加 Scrollbar
  2. 或在底部添加 "N more items below" / "N more items above" 的提示文本
  3. 添加 `showScrollIndicator?: boolean` 属性

### GAP-4-011: 响应式视口断点与滚动行为联动缺失
- **优先级**: P2
- **影响范围**: `flitter-core`（滚动 + 响应式系统交叉）
- **Amp 行为**: Amp 不支持响应式断点，使用固定布局。
- **Flitter 现状**: `.gap/19-responsive-breakpoints.md` 提出了完整的响应式断点系统（`Breakpoints`、`ResponsiveBuilder`、`ResponsiveSwitch` 等），但该系统与滚动行为之间没有集成点。例如：(1) 滚轮步长不会根据视口大小自适应；(2) 页面滚动量（PageUp/Down）虽然使用 `viewportSize`，但没有考虑断点变化时的行为调整；(3) 没有 `ContainerResponsiveBuilder` 与 `SingleChildScrollView` 的组合模式。这不是 bug，而是两个独立功能系统之间自然的集成点。
- **已有 .gap 引用**: `.gap/19-responsive-breakpoints.md`（独立提案，不涉及滚动集成）
- **建议修复方向**: 暂不需要。两个系统独立运作时各自完备。如果未来出现具体需求（如"窄终端下滚轮步长改为 1"），可在应用层通过 `ResponsiveBuilder` 自定义 `scrollStep` 解决。

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 |
|-----------|------|------|-------------|
| `.gap/17-scrollbar-enhancements.md` | Scrollbar 增强：水平支持 / 鼠标交互 / 类型安全 | Phase 1-3 已完成, Phase 4 未实现 | ✅ Phase 4 (hover 视觉反馈) 仍然有效，对应 GAP-4-009 |
| `.gap/19-responsive-breakpoints.md` | 响应式断点工具 | Proposal | ✅ 仍然有效，与滚动领域弱相关（GAP-4-011 记录了潜在集成点） |
| `.gap/09-type-safety-any-removal.md` | 系统性 `any` 移除 | Proposal | ✅ 仍然有效，GAP-4-003 和 GAP-4-008 是其在滚动/视口领域的具体表现 |
| `.gap/13-render-object-hit-test.md` | RenderObject 统一 Hit Testing | Proposal | ✅ 仍然有效，与 Scrollbar 鼠标交互的坐标映射精度有关（`.gap/17` Phase 3 使用了简化的坐标方案） |
| `.gap/65-animation-framework.md` | 通用动画框架 | — | ✅ 可能与 GAP-4-005 (缓动曲线) 有关联 |

---

## 完整性对照表

| 特性 | Amp | Flitter | 差异 | 对应 GAP |
|------|-----|---------|------|---------|
| SingleChildScrollView 组件层次 | R4→dH0→yH0→oH0 | 完全一致 | 🟢 等价 | — |
| performLayout 无界约束 | maxH: Infinity | 完全一致 | 🟢 等价 | — |
| maxScrollExtent 计算 | max(0, childSize - vpSize) | 完全一致 | 🟢 等价 | — |
| position='bottom' 锚定 | vpSize - childSize | 完全一致 | 🟢 等价 | — |
| paint 裁剪 | E$(canvas, rect) | withClip() + ClipCanvas | 🟢 等价 | GAP-4-008 (类型) |
| ScrollController 状态模型 | offset, maxExtent, followMode, listeners | + viewportSize, isAnimating, disposed | 🟡 flitter 超集 | — |
| followMode 全生命周期 | 启用/禁用/自动重新启用 | 完全一致 | 🟢 等价 | — |
| atBottom 1px 容差 | offset >= max - 1 | 完全一致 | 🟢 等价 | — |
| 键盘滚动 (j/k/g/G/PgUp/PgDn/Ctrl+U/D) | 完整 | 完全一致 | 🟢 等价 | — |
| 鼠标滚轮 3 行 | 硬编码 3 | 硬编码 3 | 🟢 等价 | GAP-4-004 (可配置) |
| animateTo 线性插值 | setInterval(16ms), 200ms | 完全一致 | 🟢 等价 | GAP-4-005 (缓动) |
| Scrollbar 亚字符精度 | 1/8 Unicode 块元素 | 完全一致 + 可配 | 🟡 flitter 超集 | — |
| Scrollbar 拖拽 | ❌ | ✅ click + drag | 🟡 flitter 超集 | — |
| Scrollbar 水平 | ❌ | ✅ axis 属性 | 🟡 flitter 超集 | — |
| Scrollbar hover | ❌ | ❌ | 🟢 等价 | GAP-4-009 |
| StickyHeader 粘性固定 | ✅ | ✅ | 🟢 等价 | GAP-4-003 (类型) |
| SelectionList 基础 | 键盘导航 + 鼠标 | 完全一致 | 🟢 等价 | — |
| SelectionList 长列表滚动 | 有 | ❌ | 🔴 缺失 | GAP-4-001 |
| ensureVisible API | — | ❌ | 🟡 缺失 | GAP-4-002 |
| 虚拟化 | ❌ | ❌ | 🟢 等价 | GAP-4-007 |
| 嵌套滚动传播 | ❌ | ❌ | 🟢 等价 | GAP-4-006 |
| ClipCanvas 嵌套裁剪 | Rect.intersect() | 完全一致 | 🟢 等价 | — |
| CJK 宽字符裁剪 | 完整宽度检查 | isInClip(x, y, width) | 🟢 等价 | — |
| 水平滚动 | ✅ | ✅ | 🟢 等价 | — |

---

## 优先级总结

| 优先级 | GAP 数量 | GAP 编号 |
|--------|---------|---------|
| P0 | 0 | — |
| P1 | 2 | GAP-4-001, GAP-4-002 |
| P2 | 9 | GAP-4-003 ~ GAP-4-011 |

**核心滚动管线零 P0 差异**。P1 项集中在 SelectionList 的长列表可用性（GAP-4-001）和缺少 ensureVisible API（GAP-4-002），这两个问题相互关联，修复 GAP-4-002 后可更容易地修复 GAP-4-001。P2 项主要为类型安全清理、可选增强和未来架构预留。
