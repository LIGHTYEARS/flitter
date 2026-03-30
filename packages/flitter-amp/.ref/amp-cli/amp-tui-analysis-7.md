# Amp TUI 深度分析 #7: ScrollView/Viewport + followMode + 虚拟化

> 基于 Amp CLI 混淆二进制逆向 + flitter-core/flitter-amp 源码的全面深度分析。
> 覆盖 RenderScrollViewport 布局/绘制、ScrollController 状态管理、followMode 自动跟随、滚动动画、键盘/鼠标滚动、Scrollbar 组件、虚拟化、嵌套滚动。

---

## 1. Amp 实现细节

### 1.1 混淆名映射

| Amp 混淆名 | 概念 | flitter 对应类 | 文件 |
|-----------|------|---------------|------|
| `R4` | SingleChildScrollView | `SingleChildScrollView` | `scroll-view.ts` |
| `dH0` | Scrollable (StatefulWidget) | `Scrollable` | `scroll-view.ts` |
| `yH0` | ScrollViewport (SCROW) | `ScrollViewport` | `scroll-view.ts` |
| `oH0` | RenderScrollViewport | `RenderScrollViewport` | `scroll-view.ts` |
| `Lg` | ScrollController | `ScrollController` | `scroll-controller.ts` |
| `ia` | Scrollbar (RenderObject) | `RenderScrollbar` | `scrollbar.ts` |
| `Uu` | Scrollbar (Widget) | `Scrollbar` | `scrollbar.ts` |
| `E$` | ClipCanvas (裁剪画布) | `ClipCanvas` | `clip-canvas.ts` |
| `GI` | SingleChildScrollView (别名) | 同 `R4` | — |

### 1.2 Amp ScrollView 组件层次

```
R4 (SingleChildScrollView) — StatelessWidget
  └─ dH0 (Scrollable) — StatefulWidget
       ├─ 管理 Lg (ScrollController) 生命周期
       ├─ 处理键盘滚动 (j/k/g/G/PageUp/PageDown/Ctrl+U/Ctrl+D)
       ├─ 处理鼠标滚轮 (MouseRegion onScroll)
       └─ yH0 (ScrollViewport) — SingleChildRenderObjectWidget
            └─ oH0 (RenderScrollViewport) — RenderBox
                 ├─ performLayout(): 无界约束布局子节点
                 ├─ paint(): E$(ClipCanvas) 裁剪 + scrollOffset 偏移
                 └─ 监听 ScrollController 变化 → markNeedsPaint()
```

### 1.3 Amp RenderScrollViewport.performLayout() 算法

逆向分析 `oH0` 的 `performLayout()` 逻辑：

```
performLayout():
  constraints = this.constraints  // 来自父节点的 BoxConstraints

  // Step 1: 创建无界约束
  if (vertical):
    childConstraints = BoxConstraints(
      minW: constraints.minWidth,
      maxW: constraints.maxWidth,
      minH: 0,
      maxH: Infinity          // ← 主轴无界
    )

  // Step 2: 布局子节点（允许超出视口）
  child.layout(childConstraints)

  // Step 3: 自身尺寸 = 父约束限定
  this.size = constraints.constrain(Size(child.width, constraints.maxHeight))

  // Step 4: 计算滚动范围
  childMainSize = child.size.height
  viewportMainSize = this.size.height
  maxExtent = max(0, childMainSize - viewportMainSize)

  // Step 5: 更新 ScrollController
  scrollController.updateViewportSize(viewportMainSize)
  scrollController.updateMaxScrollExtent(maxExtent)

  // Step 6: 底部锚定
  if (position === 'bottom' && childMainSize < viewportMainSize):
    child.offset = Offset(0, viewportMainSize - childMainSize)  // 内容推到底部
  else:
    child.offset = Offset.zero
```

**关键设计决策**：
- 主轴无界（`maxHeight: Infinity`）让子节点可以自由扩展，这是实现滚动的核心
- `maxExtent = childSize - viewportSize` 确保不能滚过内容末尾
- `position='bottom'` 在内容不足一屏时将内容锚定到视口底部（聊天场景必需）

### 1.4 Amp RenderScrollViewport.paint() 算法

```
paint(canvas, offsetX, offsetY):
  if (!child) return

  scrollOffset = scrollController.offset

  // Step 1: 创建裁剪画布
  clipCanvas = new E$(canvas, Rect(offsetX, offsetY, self.width, self.height))

  // Step 2: 计算滚动偏移后的子节点绘制位置
  childPaintY = offsetY + child.offset.y - scrollOffset
  //                                        ^^^^^^^^^^^^^^^^
  //                        减去 scrollOffset = 内容向上移动

  // Step 3: 在裁剪画布上绘制子节点
  child.paint(clipCanvas, offsetX + child.offset.x, childPaintY)
```

**裁剪机制**：`E$`（ClipCanvas）会丢弃所有超出裁剪矩形的绘制调用。子节点在 `childPaintY < 0` 时其上部被裁剪，在 `childPaintY + childHeight > viewportHeight` 时其下部被裁剪。

### 1.5 Amp ScrollController（Lg 类）

```
class Lg {
  _offset: number = 0           // 当前滚动偏移
  _maxScrollExtent: number = 0  // 最大滚动范围
  _listeners: Set<() => void>   // 观察者集合
  _followMode: boolean = true   // 自动跟随模式
  _viewportSize: number = 0     // 视口尺寸

  // 跳转到指定偏移（clamp 到有效范围）
  jumpTo(offset):
    clamped = clamp(offset, 0, maxScrollExtent)
    if (clamped !== _offset):
      _offset = clamped
      if (!_followMode && atBottom): _followMode = true  // 自动重新启用
      notifyListeners()

  // 相对滚动
  scrollBy(delta): jumpTo(_offset + delta)

  // 更新最大滚动范围（由 RenderScrollViewport 调用）
  updateMaxScrollExtent(extent):
    wasAtBottom = atBottom
    _maxScrollExtent = max(0, extent)
    if (_offset > _maxScrollExtent): _offset = _maxScrollExtent
    if (_followMode && wasAtBottom): _offset = _maxScrollExtent  // 自动跟随
    notifyListeners()

  // 底部判定（1px 容差）
  get atBottom(): _offset >= _maxScrollExtent - 1
}
```

### 1.6 Amp followMode 自动跟随逻辑

followMode 是 Amp CLI 聊天体验的核心 —— 当 AI 在持续输出文本时，视口自动跟随到最新内容。

**启用条件**：
1. 初始状态默认 `followMode = true`
2. 用户滚动到底部时自动重新启用（`jumpTo()` 中检查 `atBottom`）
3. 开始处理新消息时，如果用户已在底部则显式调用 `enableFollowMode()`

**禁用条件**：
- 用户按 `k`/`ArrowUp`/`PageUp`/`Ctrl+U`/`g` 向上滚动时调用 `disableFollowMode()`
- 鼠标滚轮向上（button=64）时调用 `disableFollowMode()`

**自动跟随触发点**：
```
updateMaxScrollExtent(newExtent):
  如果 followMode=true 且之前 atBottom:
    自动将 offset 设为 newExtent（跳到最新位置）
```

这意味着：当内容增长（AI 输出新文本 → 布局 → maxScrollExtent 增加）时，`updateMaxScrollExtent` 被 `RenderScrollViewport.performLayout()` 调用，自动将滚动位置推到底部。

### 1.7 Amp 键盘滚动

Amp 的 `dH0`（Scrollable）State 的 `_handleKey` 处理以下按键：

| 按键 | 行为 | 滚动量 | 是否禁用 followMode |
|------|------|--------|-------------------|
| `j` / `ArrowDown` | 向下滚动 | 1 行 | ❌（向下不禁用） |
| `k` / `ArrowUp` | 向上滚动 | 1 行 | ✅ |
| `g` (无修饰键) | 跳到顶部 | → `jumpTo(0)` | ✅ |
| `G` (Shift+g) | 跳到底部 | → `jumpTo(maxScrollExtent)` | ❌（到底部会自动重新启用） |
| `PageDown` | 向下翻页 | `viewportSize` 行 | ❌ |
| `PageUp` | 向上翻页 | `viewportSize` 行 | ✅ |
| `Ctrl+D` | 向下半页 | `floor(viewportSize / 2)` 行 | ❌ |
| `Ctrl+U` | 向上半页 | `floor(viewportSize / 2)` 行 | ✅ |

**设计原则**：只有向上滚动（远离底部）才会禁用 followMode。向下滚动不禁用，因为如果用户一直向下滚到底部，`atBottom` 检查会自动重新启用 followMode。

### 1.8 Amp 鼠标滚轮

```
_handleScroll(event):
  if (event.button === 64):  // ScrollUp
    controller.disableFollowMode()
    controller.scrollBy(-3)    // 向上 3 行
  else if (event.button === 65):  // ScrollDown
    controller.scrollBy(3)     // 向下 3 行
```

鼠标滚轮滚动量硬编码为 **3 行**。`TerminalManager.scrollStep` 属性（默认 3，范围 1-20）是一个可配置选项，但 Amp 的 Scrollable 直接使用了固定值 3，而非从 TerminalManager 读取。

### 1.9 Amp 滚动动画（animateTo）

Amp 的 ScrollController 支持平滑滚动动画，但在实际使用中，**ChatView 的滚动操作几乎全部使用 `jumpTo`/`scrollBy` 立即跳转**，不使用动画。动画主要预留给未来的 programmatic scroll-to-item 场景。

Amp 的 animateTo 实现特征：
- **线性插值**（非缓动曲线）
- `setInterval(16ms)` 模拟 ~60fps
- 默认时长 200ms
- 可取消（新 animateTo 或 dispose 会取消当前动画）
- 动画过程中绕过 followMode 重新启用逻辑

### 1.10 Amp Scrollbar（Uu / ia 类）

Amp 的滚动条实现位于 `ia` 类：

```
布局: Row
  ├── Expanded → SingleChildScrollView (position: 'bottom')
  │       └── Padding(left:2, right:2-3, bottom:1)
  │           └── ChatView (Column)
  └── Scrollbar (thickness: 1, 1 列宽)
        thumbColor: app.scrollbarThumb   // = foreground (默认前景色)
        trackColor: app.scrollbarTrack   // = index(8) (亮黑/深灰)
```

Scrollbar 特性：
- **只读展示**：纯展示组件，不支持拖拽滚动（Amp 中未实现 thumb drag）
- **亚字符精度**：使用 Unicode 下半块元素（`\u2581`-`\u2588`）实现 1/8 字符精度
- **Thumb 尺寸计算**：`thumbHeight = max(1, floor(vpHeight / totalContent * displayHeight))`
- **Thumb 位置计算**：`thumbTop = floor(scrollFraction * maxThumbTop)`，其中 `scrollFraction = offset / (totalContent - vpHeight)`
- **无 track 时隐藏**：当内容完全适合视口（`totalContent <= vpHeight`）时不绘制 thumb

### 1.11 Amp 虚拟化（Lazy Rendering）

**结论：Amp 不支持列表虚拟化。**

Amp 使用 `SingleChildScrollView`（即 `R4`），而非 Flutter 的 `ListView.builder`。这意味着：
1. **所有会话项都在每帧完整构建** —— Widget 树、Element 树、RenderObject 树全部创建
2. **所有内容都完整布局** —— 子节点接收 `maxHeight: Infinity` 约束，完整计算每个 item 的高度
3. **所有内容都完整绘制** —— `paint()` 遍历整个子树，但 `ClipCanvas` 会丢弃视口外的绘制调用

性能影响：对于极长的对话（数百条消息），Widget/Element 创建和布局是 O(n)，但由于终端 UI 的渲染量远小于 GUI，且 `ClipCanvas` 在绘制阶段提供了高效裁剪，实际体验中不会出现卡顿。

### 1.12 Amp 嵌套滚动

Amp 在实际应用中**不使用嵌套 ScrollView**。整个 UI 只有一个顶级 `SingleChildScrollView`：

```
App Root
└── Column
    ├── Expanded
    │   └── Row
    │       ├── Expanded
    │       │   └── SingleChildScrollView ← 唯一的滚动视图
    │       │       └── Padding → ChatView → Column
    │       └── Scrollbar
    └── BottomGrid (InputArea + Status)
```

工具调用内容（如 bash 输出、diff 预览）使用 `CollapsibleDrawer` 折叠/展开，而非嵌套滚动。这避免了嵌套滚动的复杂性（手势冲突、滚动方向判断等）。

### 1.13 Amp 滚动事件通知

Amp 使用简单的 `Set<() => void>` 监听器模式：

```
ScrollController:
  addListener(fn)     // 注册回调
  removeListener(fn)  // 移除回调
  _notifyListeners()  // 遍历 Set 调用所有回调

触发时机:
  - jumpTo() 且 offset 实际变化
  - scrollBy() → 委托到 jumpTo()
  - updateMaxScrollExtent() → 每次都通知（无论 offset 是否变化）
  - animateTo() 的每个帧

监听者:
  1. RenderScrollViewport → markNeedsPaint()（偏移变化时重绘）
  2. ScrollbarState → setState()（thumb 位置更新）
  3. App → 用户自定义逻辑
```

没有 `onScroll` 事件对象 —— 监听器只知道"有变化"，需要自己读取 `controller.offset` 获取当前值。

---

## 2. Flitter 实现细节

### 2.1 组件层次

flitter-core 的实现与 Amp 逆向结果 **1:1 映射**：

```
SingleChildScrollView (StatelessWidget)        ← Amp R4
  └─ Scrollable (StatefulWidget)               ← Amp dH0
       ├─ ScrollController 生命周期管理
       ├─ FocusScope (enableKeyboardScroll)
       ├─ MouseRegion (enableMouseScroll)
       └─ ScrollViewport (SCROW)               ← Amp yH0
            └─ RenderScrollViewport (RenderBox) ← Amp oH0
```

源码位置：[scroll-view.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-view.ts)

### 2.2 RenderScrollViewport.performLayout() — 指令级分析

[performLayout()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-view.ts#L332-L396)：

```typescript
performLayout(): void {
  const constraints = this.constraints!;

  if (!this._child) {
    this.size = constraints.constrain(Size.zero);
    return;
  }

  // Step 1: 创建主轴无界约束
  let childConstraints: BoxConstraints;
  if (this.axisDirection === 'vertical') {
    childConstraints = new BoxConstraints({
      minWidth: constraints.minWidth,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: Infinity,           // ← 主轴无界
    });
  } else {
    childConstraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: Infinity,
      minHeight: constraints.minHeight,
      maxHeight: constraints.maxHeight,
    });
  }

  // Step 2: 无界布局子节点
  this._child.layout(childConstraints);

  // Step 3: 自身受限于父约束
  this.size = constraints.constrain(new Size(
    this.axisDirection === 'vertical' ? this._child.size.width : constraints.maxWidth,
    this.axisDirection === 'vertical' ? constraints.maxHeight : this._child.size.height,
  ));

  // Step 4: 计算 maxScrollExtent
  const childMainSize = this.axisDirection === 'vertical'
    ? this._child.size.height : this._child.size.width;
  const viewportMainSize = this.axisDirection === 'vertical'
    ? this.size.height : this.size.width;
  const maxExtent = Math.max(0, childMainSize - viewportMainSize);

  // Step 5: 更新 controller
  this.scrollController.updateViewportSize(viewportMainSize);
  this.scrollController.updateMaxScrollExtent(maxExtent);

  // Step 6: 存储当前滚动偏移
  this._scrollOffset = this.scrollController.offset;

  // Step 7: position='bottom' 锚定
  if (this.position === 'bottom' && childMainSize < viewportMainSize) {
    if (this.axisDirection === 'vertical') {
      this._child.offset = new Offset(0, viewportMainSize - childMainSize);
    } else {
      this._child.offset = new Offset(viewportMainSize - childMainSize, 0);
    }
  } else {
    this._child.offset = Offset.zero;
  }
}
```

与 Amp 完全一致。

### 2.3 RenderScrollViewport.paint() — 指令级分析

[paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-view.ts#L398-L428)：

```typescript
paint(context: PaintContext, offset: Offset): void {
  if (!this._child) return;

  this._scrollOffset = this.scrollController.offset;

  // 创建裁剪上下文
  const clipContext = (context as any).withClip
    ? (context as any).withClip(offset.col, offset.row, this.size.width, this.size.height)
    : context;

  // 计算滚动偏移后的子节点绘制位置
  let childOffset: Offset;
  if (this.axisDirection === 'vertical') {
    childOffset = new Offset(
      offset.col + this._child.offset.col,
      offset.row + this._child.offset.row - this._scrollOffset,
      //                                    ^^^^^^^^^^^^^^^^^^
      //                     减去 scrollOffset = 内容向上移动
    );
  } else {
    childOffset = new Offset(
      offset.col + this._child.offset.col - this._scrollOffset,
      offset.row + this._child.offset.row,
    );
  }

  this._child.paint(clipContext, childOffset);
}
```

**裁剪实现**：使用 `PaintContext.withClip()` 创建 [ClipCanvas](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/clip-canvas.ts) 实例。ClipCanvas 继承 PaintContext，override 所有绘制方法，超出裁剪矩形的调用被静默丢弃。

### 2.4 ScrollController — 完整实现

[ScrollController](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-controller.ts)：

| 属性/方法 | 类型 | 说明 |
|----------|------|------|
| `offset` | `number` (getter) | 当前滚动偏移，只读 |
| `maxScrollExtent` | `number` (getter) | 最大滚动范围 = childSize - viewportSize |
| `viewportSize` | `number` (getter) | 视口尺寸（由 RenderScrollViewport 设置） |
| `atBottom` | `boolean` (getter) | `offset >= maxScrollExtent - 1`（1px 容差） |
| `followMode` | `boolean` (getter) | 自动跟随模式状态 |
| `isAnimating` | `boolean` (getter) | 是否有动画在运行 |
| `jumpTo(offset)` | `void` | 立即跳转，clamp 到 [0, max]，到底部时重新启用 followMode |
| `scrollBy(delta)` | `void` | 相对滚动，委托到 jumpTo |
| `animateTo(target, duration?)` | `void` | 线性插值动画，默认 200ms，16ms 帧间隔 |
| `updateMaxScrollExtent(extent)` | `void` | 更新滚动范围，followMode 时自动跟随 |
| `updateViewportSize(size)` | `void` | 更新视口尺寸 |
| `enableFollowMode()` | `void` | 启用自动跟随 |
| `disableFollowMode()` | `void` | 禁用自动跟随 |
| `addListener(fn)` / `removeListener(fn)` | `void` | 观察者模式 |
| `dispose()` | `void` | 清理监听器 + 取消动画 |

### 2.5 followMode 实现

flitter-core 的 followMode 实现与 Amp 逆向结果完全一致：

**自动跟随触发链**：
```
AI 输出新文本
  → AppState 通知变化
    → setState() 触发 rebuild
      → ChatView 增加新 widget
        → RenderScrollViewport.performLayout()
          → child.layout(unbounded) → childHeight 增加
          → maxExtent = childHeight - viewportHeight 增加
          → controller.updateMaxScrollExtent(newMax)
            → if (followMode && wasAtBottom):
                offset = newMax  // 自动跳到底部
              → notifyListeners()
                → RenderScrollViewport.markNeedsPaint()
                  → 下一帧重绘，显示最新内容
```

**App 层的额外 followMode 管理**：

[app.ts#L81-L93](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-amp/src/app.ts#L81-L93)：

```typescript
this.stateListener = () => {
  const wasAtBottom = this.scrollController.atBottom;
  this.setState(() => {});
  // 只在处理中且用户已在底部时重新启用 followMode
  if (this.widget.appState.isProcessing && wasAtBottom) {
    this.scrollController.enableFollowMode();
  }
};
```

这提供了额外的安全网：即使 followMode 被用户禁用，当 AI 开始处理且用户恰好在底部时，也会重新启用。

### 2.6 键盘滚动实现

[ScrollableState._handleKey](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-view.ts#L126-L159)：

```typescript
private _handleKey = (event: KeyEvent): KeyEventResult => {
  const ctrl = this.effectiveController;
  const pageSize = ctrl.viewportSize || 20;  // fallback 20 行

  if (event.key === 'j' || event.key === 'ArrowDown') {
    ctrl.scrollBy(1); return 'handled';
  }
  if (event.key === 'k' || event.key === 'ArrowUp') {
    ctrl.disableFollowMode();
    ctrl.scrollBy(-1); return 'handled';
  }
  if (event.key === 'g' && !event.ctrlKey && !event.shiftKey) {
    ctrl.disableFollowMode();
    ctrl.jumpTo(0); return 'handled';
  }
  if (event.key === 'G') {
    ctrl.jumpTo(ctrl.maxScrollExtent); return 'handled';
  }
  if (event.key === 'PageDown') {
    ctrl.scrollBy(pageSize); return 'handled';
  }
  if (event.key === 'PageUp') {
    ctrl.disableFollowMode();
    ctrl.scrollBy(-pageSize); return 'handled';
  }
  if (event.key === 'd' && event.ctrlKey) {
    ctrl.scrollBy(Math.floor(pageSize / 2)); return 'handled';
  }
  if (event.key === 'u' && event.ctrlKey) {
    ctrl.disableFollowMode();
    ctrl.scrollBy(-Math.floor(pageSize / 2)); return 'handled';
  }
  return 'ignored';
};
```

注意：`enableKeyboardScroll` 默认为 `false`，需显式开启。flitter-amp 的 App 在创建 SingleChildScrollView 时设置 `enableKeyboardScroll: true`。

### 2.7 鼠标滚轮实现

[ScrollableState._handleScroll](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-view.ts#L161-L168)：

```typescript
private _handleScroll = (event: { button?: number }): void => {
  if (event.button === 64) {         // ScrollUp
    this.effectiveController.disableFollowMode();
    this.effectiveController.scrollBy(-3);
  } else if (event.button === 65) {  // ScrollDown
    this.effectiveController.scrollBy(3);
  }
};
```

硬编码每次滚轮事件滚动 3 行，与 Amp 一致。

### 2.8 animateTo 实现

[ScrollController.animateTo()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-controller.ts#L65-L109)：

```typescript
animateTo(targetOffset: number, duration: number = 200): void {
  if (this._disposed) return;
  this._cancelAnimation();

  const clampedTarget = Math.max(0, Math.min(targetOffset, this._maxScrollExtent));
  if (clampedTarget === this._offset) return;
  if (duration <= 0) { this.jumpTo(clampedTarget); return; }

  const startOffset = this._offset;
  const delta = clampedTarget - startOffset;
  const frameInterval = 16;  // ~60fps
  const startTime = Date.now();

  this._animationTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 线性插值（无缓动曲线）
    const newOffset = startOffset + delta * progress;

    const clamped = Math.max(0, Math.min(newOffset, this._maxScrollExtent));
    if (clamped !== this._offset) {
      this._offset = clamped;
      this._notifyListeners();
    }

    if (progress >= 1) this._cancelAnimation();
  }, frameInterval);
}
```

关键特性：
- **线性插值**（非 ease-in-out 等缓动曲线）
- 使用 `setInterval(16ms)` 而非 `requestAnimationFrame`（终端环境无 rAF）
- 动画期间绕过 `jumpTo()` 以避免 followMode 副作用
- 可取消：新的 `animateTo()` 自动取消前一个

### 2.9 Scrollbar 组件实现

[Scrollbar](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scrollbar.ts)：

**亚字符精度算法**（1/8 字符精度）：

```
totalEighths = viewportHeight * 8        // 以 1/8 字符为单位的总高度
thumbEighths = max(8, floor(scrollRatio * totalEighths))  // thumb 高度（至少 1 字符）
maxThumbTopEighths = totalEighths - thumbEighths
thumbTopEighths = floor(scrollPositionRatio * maxThumbTopEighths)
thumbBottomEighths = thumbTopEighths + thumbEighths

对每行(row):
  计算该行与 thumb 的重叠区域（以 1/8 为单位）
  if 完全覆盖 → █ (全块，thumb 色)
  if 顶部边缘（thumb 从行中间开始） → ▃-▇ 下半块（thumb fg, track bg）
  if 底部边缘（thumb 在行中间结束） → ▃-▇ 下半块反转（track fg, thumb bg）
  if 无重叠 → track 字符
```

Unicode 下半块元素：`\u2581`(▁) 到 `\u2588`(█)，从底部向上填充。对于底部边缘需要"反转"：用 track 色绘制下方未覆盖部分，thumb 色作为背景色。

**thumb 渲染边缘案例**：

| 场景 | 渲染方式 |
|------|---------|
| 完全覆盖行 | `drawChar(col, row, '█', {fg: thumbColor, bg: thumbColor})` |
| thumb 顶部边缘 | `drawChar(col, row, BLOCK[coveredEighths], {fg: thumbColor, bg: trackColor})` |
| thumb 底部边缘 | `drawChar(col, row, BLOCK[gapEighths], {fg: trackColor, bg: thumbColor})` |
| 无 thumb 覆盖 | track 字符 + trackColor |
| 内容 ≤ 视口 | 不绘制 thumb（只有 track 或空白） |

### 2.10 嵌套滚动

flitter-core **不支持嵌套滚动手势分发**。虽然技术上可以将 `SingleChildScrollView` 嵌套在另一个 `SingleChildScrollView` 中，但：

1. **鼠标滚轮**：`MouseRegion` 的 `onScroll` 事件从最深节点向上冒泡，找到第一个有 `onScroll` handler 的区域就停止。这意味着内层 ScrollView 会"吞掉"所有滚轮事件。
2. **键盘滚动**：FocusScope 冒泡机制 —— 最深的有 `onKey` handler 的 FocusScope 先处理。如果返回 `'handled'`，外层不会收到事件。
3. **无滚动溢出传播**：当内层 ScrollView 滚动到边界时，不会将多余的 delta 传递给外层。

**实际影响**：flitter-amp 与 Amp 一样只使用单层 ScrollView，不存在嵌套滚动场景。

### 2.11 虚拟化

**flitter-core 不支持列表虚拟化。**

`SingleChildScrollView` 将整个子树作为一个整体处理 —— 没有 item builder、item extent 估算、可见范围计算等虚拟化基础设施。所有内容在每帧中完整构建、布局、绘制（裁剪阶段丢弃视口外内容）。

如果未来需要虚拟化，需要实现类似 Flutter `ListView.builder` + `SliverList` + `RenderSliverList` 的 sliver 架构，这是一个显著的架构扩展。

### 2.12 测试覆盖

flitter-core 对滚动系统有完善的测试覆盖：

| 测试文件 | 覆盖内容 |
|---------|---------|
| [scroll-stack-builder.test.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/__tests__/scroll-stack-builder.test.ts) | ScrollController 基础、RenderScrollViewport 布局/裁剪/偏移、SingleChildScrollView 默认值 |
| [scroll-controller-enhancements.test.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/__tests__/scroll-controller-enhancements.test.ts) | animateTo（即时/异步/取消/反向）、followMode 重新启用、atBottom 容差、viewportSize |
| [scrollbar.test.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/__tests__/scrollbar.test.ts) | Scrollbar 布局/绘制、thumb 位置计算、亚字符精度、颜色应用、track 显示/隐藏 |

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **组件层次** | R4→dH0→yH0→oH0 (4层) | SingleChildScrollView→Scrollable→ScrollViewport→RenderScrollViewport | 🟢 等价 | 1:1 对应，命名和结构完全匹配 |
| **performLayout 无界约束** | `maxH: Infinity` 主轴无界 | `maxHeight: Infinity` 主轴无界 | 🟢 等价 | 算法完全一致 |
| **performLayout 自身尺寸** | `constraints.constrain(childW, constrainedH)` | `constraints.constrain(new Size(childW, constrainedH))` | 🟢 等价 | 仅包装方式不同（Offset 对象 vs 两个 number） |
| **maxScrollExtent 计算** | `max(0, childSize - viewportSize)` | `Math.max(0, childMainSize - viewportMainSize)` | 🟢 等价 | 算法完全一致 |
| **position='bottom' 锚定** | child.offset = (0, vpSize - childSize) 当 child < viewport | 完全相同 | 🟢 等价 | 逻辑完全一致 |
| **paint 裁剪** | `new E$(canvas, rect)` 创建裁剪画布 | `context.withClip(x, y, w, h)` 创建 ClipCanvas | 🟢 等价 | 功能等价，仅 API 形式不同 |
| **paint 滚动偏移** | `childPaintY - scrollOffset` | `offset.row + child.offset.row - _scrollOffset` | 🟢 等价 | 完全相同的减法偏移 |
| **ScrollController 状态** | offset, maxExtent, followMode, listeners | offset, maxExtent, followMode, viewportSize, listeners, isAnimating | 🟡 flitter 更多 | flitter 额外暴露 viewportSize 和 isAnimating |
| **followMode 初始值** | `true` | `true` | 🟢 等价 | |
| **followMode 禁用** | 向上滚动时调用 `disableFollowMode()` | 完全相同 | 🟢 等价 | |
| **followMode 重新启用（底部检测）** | jumpTo 到 atBottom 时自动重新启用 | 完全相同 | 🟢 等价 | |
| **followMode 重新启用（App 层）** | isProcessing + wasAtBottom → enableFollowMode() | 完全相同的逻辑在 app.ts | 🟢 等价 | |
| **atBottom 容差** | 1px | 1px (`offset >= max - 1`) | 🟢 等价 | |
| **updateMaxScrollExtent 自动跟随** | followMode + wasAtBottom → offset = max | 完全相同 | 🟢 等价 | |
| **键盘 j/k** | 1 行 | 1 行 | 🟢 等价 | |
| **键盘 g/G** | jumpTo(0) / jumpTo(max) | jumpTo(0) / jumpTo(maxScrollExtent) | 🟢 等价 | |
| **键盘 PageUp/Down** | viewportSize 行 | `ctrl.viewportSize \|\| 20` 行 | 🟡 低差异 | flitter 有 fallback 20 行的安全网 |
| **键盘 Ctrl+U/D** | floor(viewportSize / 2) 行 | `Math.floor(pageSize / 2)` 行 | 🟢 等价 | |
| **键盘 enableKeyboardScroll 默认值** | 需显式启用 | `false`（需显式启用） | 🟢 等价 | |
| **鼠标滚轮量** | 3 行 (硬编码) | 3 行 (硬编码) | 🟢 等价 | 均未使用 TerminalManager.scrollStep |
| **鼠标 enableMouseScroll 默认值** | `true` | `true` | 🟢 等价 | |
| **animateTo 插值** | 线性 | 线性 | 🟢 等价 | |
| **animateTo 帧率** | setInterval(16ms) | setInterval(16ms) | 🟢 等价 | |
| **animateTo 默认时长** | 200ms | 200ms | 🟢 等价 | |
| **animateTo 取消** | 新动画/dispose 自动取消 | 完全相同 | 🟢 等价 | |
| **Scrollbar 精度** | 亚字符(1/8) Unicode 块元素 | 亚字符(1/8) Unicode 块元素，可配置 `subCharacterPrecision` | 🟡 flitter 更多 | flitter 支持关闭亚字符精度回退到整字符模式 |
| **Scrollbar thumb 计算** | thumbH = max(1, floor(ratio * displayH)) | `Math.max(8, Math.floor(scrollRatio * totalEighths))` → 至少 1 字符 | 🟢 等价 | 最终效果相同（最小 1 字符） |
| **Scrollbar 拖拽** | ❌ 不支持 | ❌ 不支持 | 🟢 等价 | 两者都是只读展示 |
| **Scrollbar getScrollInfo** | 从 controller 派生 | 支持 controller 或 `getScrollInfo` 回调 | 🟡 flitter 更多 | flitter 多了回调方式，更灵活 |
| **Scrollbar thumbColor** | `app.scrollbarThumb`(foreground) | 通过 props 传入 | 🟢 等价 | 颜色由使用方决定 |
| **Scrollbar trackColor** | `app.scrollbarTrack`(index(8)) | 通过 props 传入 | 🟢 等价 | 颜色由使用方决定 |
| **虚拟化** | ❌ 不支持（SingleChildScrollView） | ❌ 不支持（SingleChildScrollView） | 🟢 等价 | 两者都不支持 |
| **嵌套滚动** | ❌ 不使用 | ❌ 无专门支持 | 🟢 等价 | 两者都只用单层 ScrollView |
| **滚动事件通知** | Set<() => void> 观察者模式 | Set<() => void> 观察者模式 | 🟢 等价 | |
| **listener attach/detach** | RenderScrollViewport attach/detach 管理 | 完全相同的 attach/detach 生命周期 | 🟢 等价 | |
| **ClipCanvas 嵌套裁剪** | E$(parentE$, newRect) → 矩形交集 | withClip() → Rect.intersect() | 🟢 等价 | 算法完全一致 |
| **CJK 裁剪** | 宽字符完整宽度检查 | `isInClip(x, y, width)` 宽度检查 | 🟢 等价 | 不绘制半个 CJK 字符 |
| **水平滚动** | 支持（axisDirection） | 支持（axisDirection） | 🟢 等价 | 两者都支持，但 Amp ChatView 只用垂直 |
| **ScrollController dispose** | 清理 listeners + 取消动画 | 清理 listeners + 取消动画 + disposed 标志 | 🟡 flitter 更多 | flitter 额外有 disposed 防护（jumpTo/animateTo 检查 disposed） |

---

## 4. 差异修复建议（按优先级排序）

### P0 (无) — 无阻塞性差异

**结论：ScrollView/ScrollController/Viewport/followMode 实现 100% 与 Amp 一致。** 这是 flitter-core 中与 Amp 对齐度最高的子系统之一，所有核心算法、数据流、边界条件处理都完全匹配。

### P3 (可选增强，低优先级)

#### 4.1 可配置滚轮步长

**现状**：鼠标滚轮步长硬编码为 3 行（`scrollBy(-3)` / `scrollBy(3)`）。
**Amp 现状**：也是硬编码 3 行，但 `TerminalManager.scrollStep` 已有可配置基础设施。
**建议**：保持现状。终端滚轮事件本身就是整数步，3 行是标准默认值。如果未来需要可配置，从 `TerminalManager.scrollStep` 读取即可。

#### 4.2 缓动曲线

**现状**：`animateTo` 使用线性插值。
**Amp 现状**：同样是线性插值。
**建议**：保持现状。线性插值在终端环境中效果足够好（每帧只有行级精度的位置变化）。如果未来需要缓动效果（如 ease-out），可以将 `progress` 替换为缓动函数 `easeOut(progress) = 1 - (1 - progress)^2`。

#### 4.3 虚拟化预留

**现状**：无列表虚拟化支持。
**Amp 现状**：同样无虚拟化。
**建议**：暂不实现。当前的 SingleChildScrollView + ClipCanvas 裁剪方案在终端场景（典型 24-60 行视口）下性能足够。如果未来支持超长对话（1000+ 条消息），可以考虑实现 Sliver 架构。

#### 4.4 嵌套滚动传播

**现状**：内层 ScrollView 会"吞掉"所有滚轮事件，不传播溢出 delta。
**Amp 现状**：同样不支持嵌套滚动。
**建议**：保持现状。嵌套滚动在终端 UI 中极少出现，实现成本高且容易引入 UX 问题。

#### 4.5 Scrollbar 拖拽

**现状**：Scrollbar 纯展示，不支持鼠标拖拽 thumb。
**Amp 现状**：同样不支持拖拽。
**建议**：可作为未来增强。实现需要：
1. 在 Scrollbar 上添加 `MouseRegion`（onClick 检测 thumb 区域 + onDrag 跟踪移动）
2. 将 drag delta 映射到 scroll delta：`scrollDelta = (dragRows / viewportHeight) * totalContent`
3. drag 开始时禁用 followMode

---

## 附录 A: 完整约束链追踪

```
Terminal (120×40)
  └── Column(mainAxisSize:max, cross:stretch)
      ├── Expanded(flex:1) → tight(120×37)
      │   └── Row(cross:stretch) → tight(120×37)
      │       ├── Expanded(flex:1) → tight(119×37)
      │       │   └── SingleChildScrollView(position:bottom, enableKeyboard:true)
      │       │       └── Scrollable → MouseRegion → FocusScope
      │       │           └── ScrollViewport → RenderScrollViewport
      │       │               constraints: tight(119×37)
      │       │               └── child.layout(minW:0, maxW:119, minH:0, maxH:∞)
      │       │                   └── Padding(left:2, right:2, bottom:1)
      │       │                       └── ChatView → Column(min, stretch)
      │       │                           constraints: minW:115, maxW:115, minH:0, maxH:∞
      │       │                           └── [messages...] height = Σ(item heights)
      │       │
      │       │   viewport.size = (119, 37)
      │       │   maxScrollExtent = max(0, childHeight - 37)
      │       │   scrollOffset 范围: [0, maxScrollExtent]
      │       │
      │       └── Scrollbar(thickness:1) → tight(1×37)
      │           └── RenderScrollbar
      │               size: (1, 37)
      │               thumbMetrics 从共享的 ScrollController 获取
      │
      └── BottomGrid(InputArea + Status) → height=3
```

## 附录 B: followMode 状态机

```
                    ┌─────────┐
              ┌────→│ ENABLED │←────┐
              │     └────┬────┘     │
              │          │          │
         atBottom        │     enableFollowMode()
         (jumpTo)        │     (app.ts: isProcessing
              │          │      && wasAtBottom)
              │          │          │
              │    向上滚动:         │
              │    k / ArrowUp      │
              │    g               │
              │    PageUp          │
              │    Ctrl+U          │
              │    wheel up        │
              │          │          │
              │          ▼          │
              │    ┌──────────┐    │
              └────│ DISABLED │────┘
                   └──────────┘

ENABLED 状态下:
  updateMaxScrollExtent() 且 wasAtBottom
    → 自动 offset = maxScrollExtent (跟随最新内容)

DISABLED 状态下:
  updateMaxScrollExtent() → 不自动跟随
  用户需手动滚到底部才能重新启用
```

## 附录 C: 混淆名索引

| 混淆名 | 类型 | 对应概念 |
|--------|------|---------|
| `R4` | Widget | SingleChildScrollView |
| `GI` | Widget | SingleChildScrollView (别名) |
| `dH0` | StatefulWidget | Scrollable |
| `yH0` | SingleChildRenderObjectWidget | ScrollViewport |
| `oH0` | RenderBox | RenderScrollViewport |
| `Lg` | 普通类 | ScrollController |
| `Uu` | StatefulWidget | Scrollbar |
| `ia` | RenderBox | RenderScrollbar |
| `E$` | PaintContext 子类 | ClipCanvas |
| `H8` | StatefulWidget 基类 | StatefulWidget |
| `H3` | StatelessWidget 基类 | StatelessWidget |
| `Qb` | SingleChildRenderObjectWidget 基类 | SingleChildRenderObjectWidget |
| `j9` | RenderBox 基类 | RenderBox |
| `ij` | ScreenBuffer | ScreenBuffer |
| `wB0` | TerminalManager | TerminalManager (scrollStep 配置) |
