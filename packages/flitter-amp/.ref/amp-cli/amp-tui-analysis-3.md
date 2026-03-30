# Amp TUI 深度分析 #3: PaintContext 裁剪栈 + 层合成 + Z-order

> 基于 Amp CLI 混淆源码逆向分析 + flitter-core 完整源码阅读
> 分析范围: 绘制管线第 3 阶段 (PAINT) 的全部细节

---

## 1. Amp 实现细节

### 1.1 绘制管线入口

Amp 的绘制管线由 `c9`（FrameScheduler）驱动，在 `J3`（WidgetsBinding）中的 `paint()` 方法触发：

```
J3.paint():
  1. UB0.flushPaint()           // 清除 _nodesNeedingPaint 集合中每个节点的 _needsPaint 标志
  2. screen.clear()             // 清空 ScreenBuffer 后缓冲（全部填充 EMPTY_CELL）
  3. root.paint(screen, 0, 0)   // 从根 RenderObject 开始 DFS 绘制
```

关键设计决策：**每帧全量重绘**。不存在增量绘制 —— `screen.clear()` 后整棵 render tree 重新绘制到后缓冲。差量计算推迟到 RENDER 阶段（前后缓冲 diff）。

### 1.2 PaintContext 架构

Amp 的 PaintContext 不是一个显式的类名，而是直接使用 ScreenBuffer（`ij` 类）作为 canvas。在 Amp 中：

```
// Amp 的 paint 签名
n_.paint(screen, offsetX, offsetY)
// 其中 screen 是 ij (ScreenBuffer) 实例
// offsetX, offsetY 是从根累加的绝对偏移
```

**核心绘制原语**直接在 ScreenBuffer 上操作：

| Amp 方法 | 功能 | 指令级行为 |
|---------|------|-----------|
| `ij.setChar(x, y, char, style, width)` | 写入单个字符 | `backBuffer.cells[y * width + x] = createCell(char, style, width)` |
| `ij.fill(x, y, w, h, char, style)` | 矩形填充 | 双重 for 循环 setCell, 带边界裁剪 |
| `ij.clear()` | 清空后缓冲 | 全部 cells 设为 EMPTY_CELL |

在 Amp 中，没有独立的 `PaintContext` 包装类 —— RenderObject.paint() 直接接收 ScreenBuffer 或 `E$`（ClippedScreenBuffer）。

### 1.3 裁剪机制: E$ (ClippedScreenBuffer)

Amp 的裁剪通过 `E$` 类实现。`E$` 包装一个 ScreenBuffer 并限制所有绘制操作到指定的矩形区域内。

```
// Amp E$ 类伪代码（从混淆源码还原）
class E$ {
  constructor(screen, clipRect) {
    this._screen = screen;
    this._clip = clipRect;  // { left, top, width, height }
  }
  
  setChar(x, y, char, style, width) {
    if (y < this._clip.top || y >= this._clip.top + this._clip.height) return;
    if (x < this._clip.left || x + width > this._clip.left + this._clip.width) return;
    this._screen.setChar(x, y, char, style, width);
  }
  
  fill(x, y, w, h, char, style) {
    // 将 fill 区域与 clip 做交集
    const intersected = intersectRect(x, y, w, h, this._clip);
    if (intersected.w <= 0 || intersected.h <= 0) return;
    this._screen.fill(intersected.x, intersected.y, intersected.w, intersected.h, char, style);
  }
}
```

**关键设计点**：

1. **E$ 与 ScreenBuffer 接口兼容**：E$ 实现了与 ScreenBuffer 相同的绘制 API（setChar, fill），因此可以作为 transparent drop-in replacement 传给 paint()。
2. **裁剪是值语义，非栈语义**：Amp 没有 pushClip/popClip 栈操作。每次创建裁剪上下文时，生成一个新的 E$ 对象，裁剪矩形是与父裁剪的交集。
3. **嵌套裁剪**：通过 E$ 包装 E$ 实现。新 E$ 的裁剪区域 = `intersect(新请求区域, 父 E$ 的裁剪区域)`。

### 1.4 裁剪的使用场景

Amp 中只有两处显式创建裁剪上下文：

| 场景 | RenderObject | 裁剪区域 |
|------|-------------|---------|
| ScrollViewport | `oH0` (RenderScrollViewport) | `Rect(offset.x, offset.y, self.size.width, self.size.height)` |
| ClipRect | `nv` (RenderClipRect) | `Rect(offset.x, offset.y, self.size.width, self.size.height)` |

```
// oH0.paint 伪代码
oH0.paint(canvas, offsetX, offsetY) {
  let clipped = new E$(canvas, {
    left: offsetX,
    top: offsetY,
    width: this.size.width,
    height: this.size.height
  });
  
  let childY = offsetY + child.offset.y - this.scrollOffset;
  child.paint(clipped, offsetX + child.offset.x, childY);
}
```

### 1.5 Z-order 绘制顺序

Amp 的 Z-order 完全由 **DFS 遍历顺序** + **paint 方法内部的调用顺序** 决定。没有显式的 Z-index 属性。

**核心原则**：**后绘制的覆盖先绘制的**（painter's algorithm）。

#### 1.5.1 ContainerRenderBox 默认绘制顺序

```
// Amp: n_ 的 paint（通用容器）
paint(canvas, ox, oy) {
  for (let child of this._children) {
    child.paint(canvas, ox + child.offset.x, oy + child.offset.y);
  }
}
```

children 数组的顺序 = 绘制顺序。数组前面的先绘制（在底层），后面的后绘制（在顶层）。

#### 1.5.2 Stack (hF) 的 Z-order

```
// hF.paint (RenderStack)
paint(canvas, ox, oy) {
  for (let child of this.children) {
    child.paint(canvas, ox + child.offset.x, oy + child.offset.y);
  }
}
```

Stack 的 children 按 Widget 声明顺序排列：
- `children[0]`（第一个 child）→ 最底层（最先绘制）
- `children[N-1]`（最后一个 child）→ 最顶层（最后绘制）

对于 Positioned 子节点，它们在 children 数组中的位置决定了 Z-order，而非 `left/top/right/bottom` 的值。

#### 1.5.3 RenderDecoratedBox (fE) 的绘制顺序

```
// fE.paint (RenderDecoratedBox)
paint(canvas, ox, oy) {
  // Step 1: 背景色填充 → 最底层
  if (this.decoration.color) {
    canvas.fill(ox, oy, w, h, ' ', { bg: this.decoration.color });
  }
  // Step 2: 边框绘制 → 覆盖背景
  if (this.decoration.border) {
    drawBorder(canvas, ox, oy, w, h, style, color);
  }
  // Step 3: 子节点绘制 → 最顶层
  if (this._child) {
    this._child.paint(canvas, ox + child.offset.x, oy + child.offset.y);
  }
}
```

绘制层次：**背景 → 边框 → 子节点内容**。

#### 1.5.4 StickyHeader 的特殊绘制顺序

```
// StickyHeader RenderObject.paint
paint(canvas, ox, oy) {
  // Step 1: 先画 body（在下层）
  body.paint(canvas, ox + body.offset.x, oy + body.offset.y);
  
  // Step 2: 后画 header（在上层，覆盖 body）
  // 如果 header 被钉住，先用 fillRect 清除 header 行的残留内容
  if (isPinned) {
    canvas.fill(clipLeft, pinnedY, clipWidth, headerH, ' ');
  }
  header.paint(canvas, ox + header.offset.x, pinnedY);
}
```

**关键**：StickyHeader 故意打破了 children 数组的顺序 —— children 是 `[header, body]`，但绘制顺序是 **body → header**。这确保 header 始终在 body 之上，尤其是当 header 被钉住时，它可以覆盖 body 的内容。

### 1.6 层合成

**Amp 没有层合成（Layer Compositing）机制。**

- 没有 RepaintBoundary
- 没有 Layer / OffscreenCanvas / CompositeLayer 概念
- 所有 RenderObject 直接绘制到同一个 ScreenBuffer 后缓冲
- 绝对没有 alpha 混合 —— 后绘制的完全覆盖先绘制的（像素级替换）
- 唯一的"层"概念是 Z-order（绘制顺序决定可见性）

### 1.7 Offset 传播机制

Amp 使用**绝对偏移累加**模式。offset 不存储在 PaintContext 中，而是通过参数在 paint() 调用链中累加传递：

```
root.paint(canvas, 0, 0)
  └─ column.paint(canvas, 0, 0)
       ├─ child1.paint(canvas, 0 + child1.offset.x, 0 + child1.offset.y)
       │    └─ padding.paint(canvas, ox, oy)
       │         └─ paddedChild.paint(canvas, ox + left, oy + top)
       └─ child2.paint(canvas, 0 + child2.offset.x, 0 + child2.offset.y)
```

偏移累加链：`rootOffset + parentData.offset + parentData.offset + ...`

每个 RenderBox 的 `offset` 属性存储的是**相对于父节点**的偏移（在 layout 阶段由父节点设置）。在 paint 时，父节点负责将自己的绝对偏移 + 子节点的相对偏移合成为子节点的绝对偏移。

### 1.8 App 级别的 Overlay Z-order

Amp 的 App 根节点使用 Stack 来管理模态叠层：

```
App.build():
  Stack [
    FocusScope → Column → [...mainContent],       // Z=0: 主内容层
    Positioned → PermissionDialog,                 // Z=1: 权限对话框（最高）
    // 或
    Positioned → CommandPalette,                   // Z=1: 命令面板
    // 或
    Positioned → FilePicker,                       // Z=1: 文件选择器
  ]
```

Overlay 互斥（同时只显示一个），通过条件渲染控制。优先级：PermissionDialog > CommandPalette > FilePicker。

---

## 2. Flitter 实现细节

### 2.1 绘制管线入口

Flitter 的绘制管线在 [WidgetsBinding.paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/framework/binding.ts#L562-L584) 中执行：

```typescript
paint(): void {
  if (!this._shouldPaintCurrentFrame) return;
  this.pipelineOwner.flushPaint();     // 清除脏标志
  const rootRO = this.pipelineOwner.rootNode;
  if (!rootRO) return;
  const screen = this._tui.screenBuffer;
  screen.clear();                       // 清空后缓冲
  paintRenderTree(rootRO, screen);      // DFS 绘制
  this._didPaintCurrentFrame = true;
}
```

与 Amp 完全一致：**每帧全量重绘**，clear + DFS paint。

### 2.2 PaintContext 类

Flitter 引入了一个显式的 [PaintContext](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/paint-context.ts#L53-L294) 类作为 canvas API 包装层。这是与 Amp 最大的架构差异之一。

```typescript
export class PaintContext {
  protected readonly screen: ScreenBuffer;
  protected readonly clipX: number;  // 裁剪区域左边界
  protected readonly clipY: number;  // 裁剪区域上边界
  protected readonly clipW: number;  // 裁剪区域宽度
  protected readonly clipH: number;  // 裁剪区域高度

  constructor(screen: ScreenBuffer) {
    this.screen = screen;
    this.clipX = 0;
    this.clipY = 0;
    this.clipW = screen.width;
    this.clipH = screen.height;
  }
}
```

**关键设计决策**：
1. PaintContext 包含内嵌的裁剪状态（clipX/Y/W/H）
2. 每个绘制方法内部都检查裁剪边界
3. `withClip()` 方法创建新的 PaintContext 实例（裁剪矩形交集）

### 2.3 裁剪机制: 双路径设计

Flitter 实现了两种裁剪路径：

#### 路径 A: PaintContext.withClip()

[withClip()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/paint-context.ts#L276-L293) 在 PaintContext 基类上创建裁剪子上下文：

```typescript
withClip(x: number, y: number, w: number, h: number): PaintContext {
  const newLeft = Math.max(x, this.clipX);
  const newTop = Math.max(y, this.clipY);
  const newRight = Math.min(x + w, this.clipX + this.clipW);
  const newBottom = Math.min(y + h, this.clipY + this.clipH);
  const clippedW = Math.max(0, newRight - newLeft);
  const clippedH = Math.max(0, newBottom - newTop);
  return PaintContext.createClipped(this.screen, newLeft, newTop, clippedW, clippedH);
}
```

内部使用 `Object.create(PaintContext.prototype)` 创建轻量级实例，避免完整构造函数调用。

#### 路径 B: ClipCanvas

[ClipCanvas](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/clip-canvas.ts#L29-L195) 继承 PaintContext 并重写所有绘制方法：

```typescript
export class ClipCanvas extends PaintContext {
  private readonly _innerContext: PaintContext;
  private readonly _clip: Rect;

  constructor(context: PaintContext, clip: Rect) {
    super(PaintContext.getScreen(context));
    this._innerContext = context;
    this._clip = clip;
    PaintContext.setClipBounds(this, clip.left, clip.top, clip.width, clip.height);
  }
}
```

ClipCanvas 重写了 drawChar、drawText、drawTextSpan、fillRect、drawBorder 等所有方法，在裁剪后委托给 `_innerContext`。

**两种路径的使用场景**：

| 路径 | 使用者 | 特点 |
|------|-------|------|
| `withClip()` | RenderScrollViewport.paint() | 轻量级，返回 PaintContext 实例 |
| `ClipCanvas` | （可选的替代方案） | 保留 `clip` Rect 引用，支持 StickyHeader 查询 |

### 2.4 裁剪的检查逻辑

PaintContext 的每个绘制方法都包含裁剪检查：

```typescript
// drawChar: 完整宽度检查
protected isInClip(x: number, y: number, width: number = 1): boolean {
  return (
    x >= this.clipX &&
    x + width <= this.clipX + this.clipW &&  // 宽字符不能溢出
    y >= this.clipY &&
    y < this.clipY + this.clipH
  );
}

// drawText: 逐字符检查
drawText(x, y, text, style) {
  let curX = x;
  for (const char of text) {
    const w = wcwidth(cp);
    if (this.isInClip(curX, y, w)) {
      this.screen.setChar(curX, y, char, merged, w);
    }
    curX += w;  // 即使裁剪外也要推进光标
  }
}
```

**CJK 宽字符处理**：如果一个宽度为 2 的 CJK 字符的右半部分超出裁剪边界，整个字符被丢弃（不绘制半个字符）。

### 2.5 背景色合并

PaintContext 实现了 [_mergeWithExistingBg()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/paint-context.ts#L204-L209)：

```typescript
private _mergeWithExistingBg(x, y, style?) {
  if (style?.bg) return style;                    // 新样式有显式 bg → 使用
  const existing = this.screen.getCell(x, y);
  if (!existing.style?.bg) return style;          // 无现有 bg → 保持原样
  return { ...style, bg: existing.style.bg };     // 继承现有 bg
}
```

这确保在透明背景的文本绘制时，保留底层已有的背景色（例如 Container 的背景色不会被 Text 绘制时清除）。

### 2.6 Z-order 绘制顺序

#### 2.6.1 RenderFlex (Column/Row) 的绘制

[RenderFlex.paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/layout/render-flex.ts#L548-L553)：

```typescript
paint(context: PaintContext, offset: Offset): void {
  for (const child of this.children) {
    child.paint(context, offset.add(child.offset));
  }
}
```

按 children 数组顺序绘制。对于 Column/Row，children 按 Widget 声明顺序排列。

#### 2.6.2 RenderStack 的绘制

[RenderStack.paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/stack.ts#L307-L311)：

```typescript
paint(context: PaintContext, offset: Offset): void {
  for (const child of this.children) {
    child.paint(context, offset.add(child.offset));
  }
}
```

与 Amp 完全一致 —— children 数组顺序 = Z-order。children[0] 最先绘制（最底层），children[N-1] 最后绘制（最顶层）。

#### 2.6.3 RenderDecoratedBox 的绘制

[RenderDecoratedBox.paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/layout/render-decorated.ts#L219-L226)：

```typescript
paint(context: PaintContext, offset: Offset): void {
  this._paintDecoration(context, offset);  // 背景 + 边框
  if (this._child) {
    this._child.paint(context, offset.add(this._child.offset));  // 子节点
  }
}
```

绘制层次：**fillRect(背景) → drawBorder(边框) → child.paint(子节点)**。与 Amp 完全一致。

#### 2.6.4 RenderTable 的绘制

[RenderTable.paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/layout/render-table.ts#L326-L342)：

```typescript
paint(context: PaintContext, offset: Offset): void {
  // 先画子节点内容
  for (const child of this.children) {
    child.paint(context, offset.add(child.offset));
  }
  // 后画边框（覆盖在内容之上）
  if (this._showBorder) {
    this._paintBorders(context, offset);
  }
}
```

注意：Table 的绘制顺序是 **内容 → 边框**，与 RenderDecoratedBox 相反。这是因为 Table 的边框需要覆盖单元格内容的溢出部分。

#### 2.6.5 StickyHeader 的特殊绘制

[RenderStickyHeader.paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/layout/render-sticky-header.ts#L73-L111)：

```typescript
paint(context: PaintContext, offset: Offset): void {
  // Step 1: 先画 body（底层）
  if (body) body.paint(context, offset.add(body.offset));

  // Step 2: 获取裁剪区域信息
  const clip = this._getCurrentClip(context);
  
  // Step 3: 计算 header 位置
  if (isContentInViewport && isHeaderAboveViewport) {
    // 钉住模式：先清除 header 行，再画 header
    let pinnedY = viewTop;
    if ((offset.row + totalH) - viewTop < headerH) {
      pinnedY = (offset.row + totalH) - headerH;  // push-away 效果
    }
    paintCtx.fillRect(clip.left, pinnedY, clip.width, headerH, ' ');
    header.paint(context, new Offset(offset.col + header.offset.col, pinnedY));
  } else {
    // 正常位置
    header.paint(context, new Offset(offset.col + header.offset.col, headerY));
  }
}
```

**与 Amp 完全一致**：body → fillRect 清除 → header。children 是 `[header, body]`，但绘制顺序故意倒转为 body → header。

### 2.7 裁剪区域获取（StickyHeader 专用）

[_getCurrentClip()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/layout/render-sticky-header.ts#L118-L132)：

```typescript
private _getCurrentClip(context: PaintContext): Rect | null {
  const ctx = context as any;
  // 路径 A: ClipCanvas 的 .clip getter
  if (ctx.clip instanceof Rect) return ctx.clip;
  // 路径 B: PaintContext 的 protected 字段
  if (typeof ctx.clipX === 'number' && ...) {
    return new Rect(ctx.clipX, ctx.clipY, ctx.clipW, ctx.clipH);
  }
  return null;
}
```

这个方法通过 `as any` 访问 PaintContext 的 protected 字段。设计上是 hack，但功能正确。

### 2.8 ContainerWithOverlays 的 Z-order

[ContainerWithOverlays.build()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/container-with-overlays.ts#L89-L130) 构建的 Widget 树：

```typescript
build(): Widget {
  const container = new Container({ child, padding, decoration, ... });
  if (this.overlays.length === 0) return container;
  
  const positionedChildren = groups.map(group => 
    this._buildPositionedGroup(key, specs)  // 返回 Positioned widget
  );
  
  return new Stack({
    children: [container, ...positionedChildren],  // Container 在最底层
    fit: 'passthrough',
  });
}
```

Z-order：`Container`（底层）→ `Positioned overlay1` → `Positioned overlay2` → ...（顶层）。

overlay 按 `this.overlays` 数组顺序排列。每个 overlay 组被分组后放入 Positioned 中，位置由 `position`（top/bottom）和 `alignment`（left/center/right）决定。

### 2.9 Offset 传播机制

Flitter 使用 `Offset` 值对象（不可变）进行偏移累加：

```typescript
// Offset.add() 返回新对象
add(other: Offset): Offset {
  return new Offset(this.col + other.col, this.row + other.row);
}
```

传播链：
```
paintRenderTree(root, screen):
  context = new PaintContext(screen)
  root.paint(context, Offset(0, 0))
    └─ child.paint(context, Offset(0, 0).add(child.offset))
         └─ grandchild.paint(context, parentOffset.add(grandchild.offset))
```

与 Amp 完全一致 —— paint(context, offset) 签名，offset 在调用链中累加。

### 2.10 层合成

**Flitter 同样没有层合成（Layer Compositing）。**

源码明确注释：
```typescript
// Key Amp fidelity notes:
// - NO RepaintBoundary: no compositing layers
```

所有 RenderObject 直接绘制到同一个 ScreenBuffer 的后缓冲。没有 OffscreenCanvas、Layer tree、合成器等概念。

### 2.11 ScrollViewport 的裁剪 + 偏移

[RenderScrollViewport.paint()](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/scroll-view.ts#L398-L428)：

```typescript
paint(context: PaintContext, offset: Offset): void {
  if (!this._child) return;
  this._scrollOffset = this.scrollController.offset;

  // 创建裁剪上下文
  const clipContext = (context as any).withClip
    ? (context as any).withClip(offset.col, offset.row, this.size.width, this.size.height)
    : context;

  // 计算滚动偏移后的子节点位置
  let childOffset: Offset;
  if (this.axisDirection === 'vertical') {
    childOffset = new Offset(
      offset.col + this._child.offset.col,
      offset.row + this._child.offset.row - this._scrollOffset,
    );
  }
  
  this._child.paint(clipContext, childOffset);
}
```

**关键**：滚动偏移通过减去 `_scrollOffset` 实现 —— 子节点的 Y 坐标向上移动（负值意味着内容上移）。裁剪确保只有视口内的内容可见。

### 2.12 低级绘制操作

| 方法 | 裁剪行为 | CJK 处理 | 背景合并 |
|------|---------|---------|---------|
| `drawChar(x, y, char, style?, width?)` | `isInClip(x, y, effectiveWidth)` | 完整宽度检查，不绘制半字符 | `_mergeWithExistingBg` |
| `drawText(x, y, text, style?)` | 逐字符 `isInClip` | 逐字符 wcwidth | 每字符 `_mergeWithExistingBg` |
| `drawTextSpan(x, y, span, maxWidth?)` | 逐字符 `isInClip` | 逐字符 wcwidth | 每字符 `_mergeWithExistingBg` |
| `fillRect(x, y, w, h, char, style?)` | 逐单元格 `isPositionInClip` | 不适用（填充单宽字符） | **不合并**，直接 setChar |
| `drawBorder(x, y, w, h, borderStyle, color?)` | 通过 drawChar 逐字符检查 | 不适用（边框字符都是宽度 1） | 通过 drawChar 合并 |

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **绘制管线入口** | `J3.paint()`: flushPaint → clear → root.paint(screen, 0, 0) | `WidgetsBinding.paint()`: flushPaint → clear → paintRenderTree(root, screen) | 🟢 等价 | 行为完全一致，仅命名和包装不同 |
| **Canvas API 抽象** | 直接使用 ScreenBuffer (ij) 或 E$ 作为 canvas 参数 | 引入 PaintContext 类包装 ScreenBuffer，提供高级绘制 API | 🟡 低差异 | Flitter 多了一层抽象，但最终写入同一个 ScreenBuffer，功能等价 |
| **paint() 签名** | `paint(canvas, offsetX, offsetY)` — 两个 number 参数 | `paint(context: PaintContext, offset: Offset)` — Offset 值对象 | 🟡 低差异 | Amp 用两个 number，Flitter 用 Offset 对象。语义等价，Flitter 更类型安全 |
| **裁剪实现** | E$ 类包装 ScreenBuffer，override setChar/fill | PaintContext.withClip() 创建新 PaintContext + ClipCanvas 类 | 🟡 低差异 | 两种实现效果等价：裁剪矩形交集，超出区域静默丢弃 |
| **裁剪模型** | 值语义 — 新建 E$ 对象，无 push/pop 栈 | 值语义 — 新建 PaintContext/ClipCanvas，无 push/pop 栈 | 🟢 等价 | 两者都不使用裁剪栈，而是通过创建新对象实现嵌套裁剪 |
| **嵌套裁剪交集** | `E$(parentE$, newRect)` → 内部做矩形交集 | `withClip()` 内部 `Math.max/Math.min` 做矩形交集 | 🟢 等价 | 算法完全一致 |
| **CJK 宽字符裁剪** | 宽字符右半超出 clip → 整个字符丢弃 | `isInClip(x, y, width)` 检查完整宽度 → 超出则丢弃 | 🟢 等价 | 行为一致：不绘制半个 CJK 字符 |
| **背景色合并** | 无（Amp 的 setChar 不检查已有 bg） | `_mergeWithExistingBg()` — 无显式 bg 时继承已有 bg | 🟡 低差异 | Flitter 多了背景继承逻辑，这是 Amp 中可能由其他机制处理的增强 |
| **层合成** | 无 — 直接绘制到单一 ScreenBuffer | 无 — 直接绘制到单一 ScreenBuffer | 🟢 等价 | 两者都不支持层合成/RepaintBoundary |
| **Z-order (通用容器)** | children 数组顺序 = 绘制顺序 (前→后 = 底→顶) | children 数组顺序 = 绘制顺序 (前→后 = 底→顶) | 🟢 等价 | painter's algorithm 完全一致 |
| **Z-order (Stack)** | children[0] 最底层，children[N-1] 最顶层 | children[0] 最底层，children[N-1] 最顶层 | 🟢 等价 | 行为完全一致 |
| **Z-order (DecoratedBox)** | 背景 → 边框 → 子节点 | 背景 → 边框 → 子节点 | 🟢 等价 | 绘制层次完全一致 |
| **Z-order (StickyHeader)** | body → fillRect → header (故意倒转) | body → fillRect → header (故意倒转) | 🟢 等价 | 特殊的 body-first 绘制策略完全一致 |
| **Z-order (Table)** | (未验证 Amp 具体实现) | 内容 → 边框 (边框覆盖溢出) | 🟡 低差异 | Table 是 flitter-core 增强，无直接 Amp 对应 |
| **Offset 传播** | `paint(canvas, parentOX + child.offset.x, parentOY + child.offset.y)` | `paint(context, parentOffset.add(child.offset))` | 🟢 等价 | 累加语义完全一致 |
| **Offset 存储位置** | `j9._offset`（存储在 RenderBox 自身） | `RenderBox._offset`（存储在 RenderBox 自身） | 🟢 等价 | 设计决策一致：offset 在 RenderBox 上，非 ParentData 上 |
| **visitChildren 遍历** | `for (let child of this._children) visitor(child)` — 数组顺序 | `for (const child of this._children) visitor(child)` — 数组顺序 | 🟢 等价 | 遍历顺序 = 数组插入顺序 |
| **Overlay Z-order (App)** | Stack: [main, Positioned(modal)] — modal 互斥 | Stack: [main, Positioned(modal)] — modal 互斥 | 🟢 等价 | 通过条件渲染控制 overlay 可见性 |
| **ContainerWithOverlays** | `bt`: Container 扩展，内建 overlay 支持 | StatelessWidget，build() 返回 Stack([Container, ...Positioned]) | 🟡 低差异 | Amp 的 bt 是 Container 子类，Flitter 使用组合模式，功能等价 |
| **ScrollViewport 裁剪** | `new E$(canvas, viewportRect)` + scrollOffset 偏移 | `context.withClip(...)` + scrollOffset 偏移 | 🟢 等价 | 裁剪 + 滚动偏移机制完全一致 |
| **StickyHeader 裁剪读取** | 读取 E$ 的 clip 属性 | `_getCurrentClip()` — 双路径: ClipCanvas.clip 或 PaintContext.clipX/Y/W/H | 🟡 低差异 | Flitter 需要同时支持两种裁剪路径，略微复杂 |
| **fillRect 裁剪方式** | 在 E$.fill() 中做矩形交集 | PaintContext.fillRect() 逐单元格 isPositionInClip; ClipCanvas.fillRect() 用 Rect.intersect() | 🟡 低差异 | Flitter 的 PaintContext 版本逐格检查效率略低，但 ClipCanvas 版本做了交集优化 |
| **drawBorder 裁剪** | 通过 E$ 包装，逐字符 setChar 时裁剪 | 通过内部调用 drawChar 逐字符裁剪 | 🟢 等价 | 两者都是逐字符绘制，自动被裁剪检查覆盖 |
| **全量重绘 vs 增量** | 每帧 clear + 全量 DFS paint | 每帧 clear + 全量 DFS paint | 🟢 等价 | 无增量绘制 |
| **ScreenBuffer 底层** | `ij`: flat array `cells[y * width + x]`, 双缓冲 | `Buffer`: flat array `cells[y * width + x]`, 双缓冲 | 🟢 等价 | 数据结构和内存布局完全一致 |
| **性能优化帧跳过** | `_shouldPaintCurrentFrame` 条件判断是否需要 paint | `_shouldPaintCurrentFrame` 条件判断是否需要 paint | 🟢 等价 | 相同的帧跳过优化 |

---

## 4. 差异修复建议（按优先级排序）

### P0 (无) — 无阻塞性差异

分析结论：**绘制管线的核心行为 100% 与 Amp 一致**。包括：
- 全量重绘策略
- 裁剪矩形交集算法
- Z-order 绘制顺序（包括 StickyHeader 的 body-first 策略）
- Offset 累加传播
- CJK 宽字符裁剪行为
- 无层合成
- painter's algorithm

### P1 — 低优先级优化

#### 4.1 fillRect 性能优化

**当前状态**：PaintContext.fillRect() 逐单元格调用 `isPositionInClip()`，ClipCanvas.fillRect() 使用 `Rect.intersect()` 做一次性区域计算。

**问题**：PaintContext 基类的 fillRect 在有裁剪时效率低于 Amp 的 `ij.fill()`（Amp 的 fill 直接用 Math.min/Math.max 裁剪区域边界）。

**建议**：在 PaintContext.fillRect() 中也使用矩形交集而非逐格检查：

```typescript
fillRect(x, y, w, h, char, style) {
  // 先计算 clip 交集
  const startX = Math.max(x, this.clipX);
  const startY = Math.max(y, this.clipY);
  const endX = Math.min(x + w, this.clipX + this.clipW);
  const endY = Math.min(y + h, this.clipY + this.clipH);
  if (startX >= endX || startY >= endY) return;
  
  for (let row = startY; row < endY; row++) {
    for (let col = startX; col < endX; col++) {
      this.screen.setChar(col, row, char, style, 1);
    }
  }
}
```

**影响**：减少大量不必要的 isPositionInClip 调用。对于 80×24 终端的全屏 fillRect，从 1920 次条件检查减少到 0 次。

**优先级**：P1 — 性能优化，功能不受影响。

#### 4.2 _mergeWithExistingBg 是否需要

**当前状态**：Flitter 的 drawChar/drawText/drawTextSpan 都调用 `_mergeWithExistingBg()`，在新样式无 bg 时继承已有单元格的 bg。

**Amp 行为**：Amp 的 setChar 不做背景合并 —— 新写入的 Cell 完全替换旧 Cell。

**分析**：这个差异实际上是**有益的**。在 Amp 中，背景色的保留是由 DecoratedBox 的 fillRect 在绘制背景后、子节点绘制前完成的。而 flitter 的 `_mergeWithExistingBg` 确保了即使在不经过 DecoratedBox 的场景下，背景色也能正确保留。

**建议**：保留当前行为。这是一个对 Amp 行为的等价增强，不会导致视觉差异。

**优先级**：P1 — 无需修改，当前行为更健壮。

#### 4.3 PaintContext 双路径统一

**当前状态**：存在 PaintContext.withClip() 和 ClipCanvas 两种裁剪路径。StickyHeader 的 `_getCurrentClip()` 需要同时处理两种情况。

**建议**：考虑统一为 ClipCanvas 路径，或在 PaintContext 基类上暴露 `clip` getter：

```typescript
// PaintContext 基类添加
get clip(): Rect {
  return new Rect(this.clipX, this.clipY, this.clipW, this.clipH);
}
```

这样 `_getCurrentClip()` 可以简化为 `return (context as any).clip`。

**优先级**：P1 — 代码简化，无功能影响。

#### 4.4 ClipCanvas 的 drawTextSpan 委托路径

**当前状态**：ClipCanvas.drawTextSpan() 将裁剪后的 maxWidth 传给 `_innerContext.drawTextSpan()`，而 `_innerContext` 是未裁剪的 PaintContext，其 drawTextSpan 内部会再次做裁剪检查。

**问题**：双重裁剪检查 — 一次在 ClipCanvas（通过 maxWidth 限制），一次在 PaintContext 内部（通过 isInClip）。

**建议**：无需修改，因为 maxWidth 截断已经确保不会超出裁剪区域，内部的 isInClip 几乎不会触发额外的丢弃。冗余检查的开销可忽略。

**优先级**：P2 — 极低优先级。

### P2 — 架构改进建议

#### 4.5 考虑支持 RepaintBoundary（长期）

**当前状态**：Amp 和 Flitter 都不支持 RepaintBoundary / 层合成。每帧全量重绘。

**长期建议**：对于大型会话（数百条消息），全量 DFS 遍历的开销可能变得显著。可以考虑：

1. **脏区域跟踪**：只重绘脏矩形区域内的 RenderObject
2. **RepaintBoundary**：将不变的子树绘制到离屏缓冲，帧间复用

**优先级**：P2 — 当前终端渲染性能足够（60fps 目标下每帧 < 16.67ms），仅在极端场景才需要。

### 总结

Flitter 的 PaintContext 裁剪栈 + Z-order 绘制系统与 Amp CLI 的实现**高度一致**。核心算法（裁剪矩形交集、painter's algorithm、offset 累加、StickyHeader body-first）完全等价。主要差异集中在**抽象层级**（Flitter 多了 PaintContext 包装层）和**背景色合并**（Flitter 的增强行为）。这些差异不影响视觉输出的正确性。
