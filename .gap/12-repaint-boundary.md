# Gap R02: Implement RepaintBoundary / Compositing Layers for TUI Rendering

## Status: Proposal
## Affected packages: `flitter-core`
## Companion gap: R01 (RelayoutBoundary -- `.gap/11-relayout-boundary.md`)

---

## 1. Current Paint Pipeline Analysis

### 1.1 The Four-Phase Frame Pipeline

The frame pipeline is orchestrated by `WidgetsBinding` (`/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`) which registers six named callbacks with the `FrameScheduler`. The paint-relevant phases are:

```
BUILD  ->  LAYOUT  ->  PAINT  ->  RENDER
```

The `beginFrame()` method (binding.ts lines 527-536) computes a boolean gate for the paint phase:

```typescript
beginFrame(): void {
  this._didPaintCurrentFrame = false;
  this._shouldPaintCurrentFrame =
    this._forcePaintOnNextFrame ||
    this.buildOwner.hasDirtyElements ||
    this.pipelineOwner.hasNodesNeedingLayout ||
    this.pipelineOwner.hasNodesNeedingPaint ||
    (this._tui.screenBuffer?.requiresFullRefresh ?? false);
  this._forcePaintOnNextFrame = false;
}
```

This is an all-or-nothing decision: if **any** node is dirty for paint, the **entire** render tree is repainted from scratch.

### 1.2 How `markNeedsPaint()` Works Today

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts` (lines 166-180), `markNeedsPaint()` propagates unconditionally upward to the root:

```typescript
markNeedsPaint(): void {
  if (this._needsPaint) return;
  if (!this._attached) {
    this._needsPaint = true;
    return;
  }
  this._needsPaint = true;
  // Amp ref: always tells PipelineOwner directly (no RepaintBoundary)
  if (this.parent) {
    this.parent.markNeedsPaint();
  } else {
    this._owner?.requestPaint();
  }
}
```

The render-object.ts header (line 73-74) explicitly states: `"NO RepaintBoundary: no compositing layers"`. Every `markNeedsPaint()` call walks the entire ancestor chain from the dirty node up to the root, setting `_needsPaint = true` on every node along the way.

### 1.3 How `PipelineOwner.flushPaint()` Works Today

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts` (lines 146-157), `flushPaint()` is trivial -- it merely clears dirty flags without performing any actual painting:

```typescript
flushPaint(): void {
  if (this._nodesNeedingPaint.size === 0) return;
  try {
    for (const node of this._nodesNeedingPaint) {
      if (node.needsPaint) {
        (node as any)._needsPaint = false;
      }
    }
  } finally {
    this._nodesNeedingPaint.clear();
  }
}
```

The `_nodesNeedingPaint` set is purely bookkeeping. The actual painting is driven by a separate full DFS traversal.

### 1.4 How `WidgetsBinding.paint()` Orchestrates Painting

In binding.ts (lines 562-584):

```typescript
paint(): void {
  if (!this._shouldPaintCurrentFrame) return;

  this.pipelineOwner.flushPaint();       // Step 1: clear dirty flags

  const rootRO = this.pipelineOwner.rootNode;
  if (!rootRO) return;

  const screen = this._tui.screenBuffer;
  screen.clear();                         // Step 2: WIPE entire back buffer

  paintRenderTree(rootRO, screen);        // Step 3: DFS paint from root

  this._didPaintCurrentFrame = true;
}
```

Three critical observations:
1. `screen.clear()` writes `EMPTY_CELL` to every cell in the back buffer -- O(W * H).
2. `paintRenderTree()` performs a DFS traversal visiting every render object in the tree -- O(N).
3. There is no mechanism to skip painting unchanged subtrees.

### 1.5 The `paintRenderTree()` DFS Traversal

In `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/paint.ts` (lines 38-44):

```typescript
export function paintRenderTree(root: RenderObject, screen: ScreenBuffer): void {
  const context = new PaintContext(screen);
  paintRenderObject(root, context, 0, 0);
}
```

A single `PaintContext` wrapping the `ScreenBuffer` is created, and the root's `paint()` is called at offset (0, 0). Each render object's `paint()` implementation recurses into children. For example:

```typescript
// RenderFlex.paint() -- render-flex.ts:549
paint(context: PaintContext, offset: Offset): void {
  for (const child of this.children) {
    child.paint(context, offset.add(child.offset));
  }
}

// RenderConstrainedBox.paint() -- render-constrained.ts:75
paint(context: PaintContext, offset: Offset): void {
  if (this._child) {
    this._child.paint(context, offset.add(this._child.offset));
  }
}
```

Every render object in the tree is visited during painting, regardless of whether it has actually changed.

### 1.6 The `PaintContext` Direct-to-Buffer Architecture

In `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/paint-context.ts`, `PaintContext` writes directly to the `ScreenBuffer`'s back buffer. There is no intermediate compositing layer. Every `drawChar()`, `drawText()`, `fillRect()`, and `drawBorder()` call immediately mutates the screen buffer cells. Clipping via `withClip()` creates a restricted `PaintContext` that bounds-checks before writing, but still targets the same shared `ScreenBuffer`.

### 1.7 The Double-Buffer Diff System

The `ScreenBuffer` (`/home/gem/workspace/flitter/packages/flitter-core/src/terminal/screen-buffer.ts`) maintains two `Buffer` instances: a front buffer (last committed frame) and a back buffer (being painted to). After painting, `getDiff()` (lines 337-425) compares every cell between front and back buffers using `cellsEqual()`, producing `RowPatch[]` of contiguous changed cell runs per row. This diff minimizes terminal I/O but does nothing to reduce the CPU cost of the paint traversal or the full-buffer clear.

### 1.8 Cost Breakdown Per Frame

For any dirty node, the current frame performs:

| Step | Operation | Cost |
|------|-----------|------|
| 1 | `screen.clear()` | O(W * H) cell writes |
| 2 | `paintRenderTree()` DFS | O(N) render object visits, each writing cells |
| 3 | `getDiff()` | O(W * H) cell comparisons |
| 4 | `renderer.render(patches)` | O(changedCells) ANSI output |
| 5 | `screen.present()` | O(1) pointer swap + O(W * H) clear of recycled buffer |

For a 120x40 terminal with 100 render objects and a single blinking cursor change:
- Steps 1, 3, 5: 14,400 total cell operations
- Step 2: 100 paint() calls writing approximately 5,000 cells
- Step 4: approximately 2 bytes of ANSI output

The actual terminal I/O (step 4) is efficient. Everything else is full-cost regardless of change scope.

---

## 2. The Problem

### 2.1 Full Repaint on Every Dirty Frame

When any render object calls `markNeedsPaint()`, the paint phase performs a complete DFS traversal of the entire render tree. Every `RenderText`, `RenderFlex`, `RenderPadding`, `RenderConstrainedBox`, and `RenderDecoratedBox` executes its `paint()` method and writes cells to the screen buffer -- even if only a single character changed color in a deeply nested text widget.

### 2.2 No Caching of Painted Output

Flutter uses a layer tree where each `RepaintBoundary` owns an `OffsetLayer` containing cached paint output. When only a child's layer changes, the compositor re-composites by combining cached layers without re-executing paint on unchanged subtrees. Flitter has no equivalent: no layer tree, no cached paint output, and no compositor.

### 2.3 `screen.clear()` Destroys Previous Paint Work

The back buffer is completely zeroed before each paint. Even if we could theoretically skip unchanged subtrees, their previously painted cells would be gone. Any surviving optimization must either re-fill from cache or keep painting.

### 2.4 Quantified Impact

For a typical TUI with 80x24 terminal (1,920 cells) and 50 render objects:

- **Current cost (1 dirty node)**: 50 paint() calls + 1,920 clears + 1,920 diffs = approximately 3,890 operations minimum
- **With RepaintBoundary**: approximately 5 paint() calls (dirty subtree) + 200 cell writes (dirty region) + 45 blit operations (clean boundary cells) + 1,920 diffs

For larger UIs (200+ render objects, 120x40 terminal), the savings are proportionally larger.

---

## 3. Proposed Solution: RepaintBoundary with CellLayer Caching

### 3.1 Design Philosophy

Unlike Flutter's GPU-backed compositing layers, flitter operates on a cell grid. The proposed solution introduces **CellLayer caching**: each `RepaintBoundary` node caches the rectangular region of cells its subtree painted in the previous frame. When the subtree is clean, the cached cells are blit directly to the back buffer without re-executing any `paint()` methods within that subtree.

This is simpler than Flutter's full layer tree because:
- TUI cells are cheap to copy (char + style struct = approximately 50-100 bytes each)
- No GPU texture management or compositing pipeline
- Cell grids are naturally rectangular and axis-aligned
- No rotation, scaling, or arbitrary transforms exist in TUI rendering

### 3.2 `CellLayer` -- Cached Rectangular Cell Grid

```typescript
// New file: /packages/flitter-core/src/rendering/cell-layer.ts

import { type Cell, EMPTY_CELL, cloneCell, cellsEqual } from '../terminal/cell.js';
import type { Buffer } from '../terminal/screen-buffer.js';

/**
 * Rectangular cell grid caching the painted output of a RepaintBoundary subtree.
 * Stores cells in local coordinates (0,0 is top-left of the boundary's region).
 */
export class CellLayer {
  private _cells: Cell[];
  private _width: number;
  private _height: number;
  private _dirty: boolean = true;

  /** Screen-space offset where this layer was last painted. */
  private _lastOffsetX: number = 0;
  private _lastOffsetY: number = 0;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._cells = CellLayer._createCells(width, height);
  }

  private static _createCells(w: number, h: number): Cell[] {
    const arr = new Array<Cell>(w * h);
    for (let i = 0; i < arr.length; i++) arr[i] = EMPTY_CELL;
    return arr;
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get isDirty(): boolean { return this._dirty; }
  get lastOffsetX(): number { return this._lastOffsetX; }
  get lastOffsetY(): number { return this._lastOffsetY; }

  markDirty(): void { this._dirty = true; }
  markClean(): void { this._dirty = false; }

  /** Store a cell at local (x, y) within the layer. */
  setCell(localX: number, localY: number, cell: Cell): void {
    if (localX < 0 || localX >= this._width || localY < 0 || localY >= this._height) return;
    this._cells[localY * this._width + localX] = cell;
  }

  /** Get a cell at local (x, y). Returns EMPTY_CELL for out-of-bounds. */
  getCell(localX: number, localY: number): Cell {
    if (localX < 0 || localX >= this._width || localY < 0 || localY >= this._height) {
      return EMPTY_CELL;
    }
    return this._cells[localY * this._width + localX]!;
  }

  /** Resize the layer, discarding cached content and marking dirty. */
  resize(newWidth: number, newHeight: number): void {
    if (newWidth === this._width && newHeight === this._height) return;
    this._width = newWidth;
    this._height = newHeight;
    this._cells = CellLayer._createCells(newWidth, newHeight);
    this._dirty = true;
  }

  /** Clear all cells to EMPTY_CELL. */
  clear(): void {
    for (let i = 0; i < this._cells.length; i++) {
      this._cells[i] = EMPTY_CELL;
    }
  }

  /**
   * Capture cells from the screen buffer's back buffer at the given
   * absolute screen offset. Called after painting a dirty boundary subtree.
   */
  captureFrom(backBuffer: Buffer, screenX: number, screenY: number): void {
    this._lastOffsetX = screenX;
    this._lastOffsetY = screenY;
    for (let ly = 0; ly < this._height; ly++) {
      for (let lx = 0; lx < this._width; lx++) {
        const cell = backBuffer.getCell(screenX + lx, screenY + ly);
        this._cells[ly * this._width + lx] = cell === EMPTY_CELL ? EMPTY_CELL : cloneCell(cell);
      }
    }
    this._dirty = false;
  }

  /**
   * Blit cached cells to the screen buffer's back buffer at the given
   * absolute screen offset. Used for clean boundaries.
   */
  blitTo(backBuffer: Buffer, screenX: number, screenY: number): void {
    for (let ly = 0; ly < this._height; ly++) {
      for (let lx = 0; lx < this._width; ) {
        const cell = this._cells[ly * this._width + lx];
        if (cell !== EMPTY_CELL) {
          backBuffer.setCell(screenX + lx, screenY + ly, cloneCell(cell));
        }
        lx += Math.max(1, cell.width);
      }
    }
  }

  /** Dispose all cached cells. */
  dispose(): void {
    this._cells = [];
    this._width = 0;
    this._height = 0;
    this._dirty = true;
  }
}
```

### 3.3 `isRepaintBoundary` Property on `RenderObject`

Add the boundary marker to the base class:

```typescript
// In render-object.ts -- RenderObject class

export abstract class RenderObject {
  // ...existing fields...

  /**
   * Whether this render object acts as a repaint boundary.
   * Subclasses override to return true.
   * When true, markNeedsPaint() propagation stops at this node,
   * and the paint traversal can use a cached CellLayer.
   *
   * Default is false. RenderRepaintBoundary overrides to true.
   */
  get isRepaintBoundary(): boolean {
    return false;
  }

  /**
   * Reference to the nearest repaint boundary ancestor (or self).
   * Computed during attach(). Used by markNeedsPaint() to find
   * the boundary to invalidate.
   */
  protected _repaintBoundary: RenderObject | null = null;

  get repaintBoundary(): RenderObject | null {
    return this._repaintBoundary;
  }

  // ...
}
```

### 3.4 Modified `markNeedsPaint()` -- Boundary-Aware Propagation

```typescript
markNeedsPaint(): void {
  if (this._needsPaint) return;           // already dirty, stop
  if (!this._attached) {
    this._needsPaint = true;
    return;
  }
  this._needsPaint = true;

  if (this.isRepaintBoundary) {
    // This node IS a repaint boundary -- stop propagation.
    // Register with PipelineOwner for paint scheduling.
    this._owner?.requestPaint(this);
  } else if (this.parent) {
    // Propagate upward to find a boundary.
    this.parent.markNeedsPaint();
  } else {
    // Root node (always acts as implicit boundary).
    this._owner?.requestPaint(this);
  }
}
```

**Key change**: Propagation stops when `isRepaintBoundary` is `true` instead of always walking to root. Without any `RepaintBoundary` widgets in the tree, all render objects have `isRepaintBoundary === false`, and the propagation is identical to the current behavior (walks to root).

### 3.5 Computing `_repaintBoundary` During Tree Attachment

```typescript
// In RenderObject.attach()
attach(owner: PipelineOwner): void {
  if (this._attached) return;
  this._owner = owner;
  this._attached = true;

  // Compute repaint boundary reference
  if (this.isRepaintBoundary) {
    this._repaintBoundary = this;
  } else if (this.parent) {
    this._repaintBoundary = this.parent._repaintBoundary;
  } else {
    this._repaintBoundary = this; // root is an implicit boundary
  }
}

// In RenderObject.detach()
detach(): void {
  if (!this._attached) return;
  this._owner = null;
  this._attached = false;
  this._repaintBoundary = null;
}
```

Children naturally get their `_repaintBoundary` reference during `attach()`, which is called by `adoptChild()` when the parent is already attached.

### 3.6 `RenderRepaintBoundary` Render Object

```typescript
// New file: /packages/flitter-core/src/rendering/render-repaint-boundary.ts

import { RenderBox } from '../framework/render-object';
import { CellLayer } from './cell-layer';
import type { PaintContext } from '../scheduler/paint-context';
import type { Offset } from '../core/types';

/**
 * A render object that caches its subtree's painted output in a CellLayer.
 *
 * When the subtree is clean (no node within has called markNeedsPaint()),
 * paint() blits the cached CellLayer to the back buffer instead of
 * recursively executing paint() on all descendants.
 *
 * When the subtree is dirty, paint() executes normally, then captures
 * the painted cells into the CellLayer for future reuse.
 */
export class RenderRepaintBoundary extends RenderBox {
  private _child: RenderBox | null = null;
  private _layer: CellLayer | null = null;

  override get isRepaintBoundary(): boolean {
    return true;
  }

  get layer(): CellLayer | null {
    return this._layer;
  }

  set child(value: RenderBox | null) {
    if (this._child) this.dropChild(this._child);
    this._child = value;
    if (this._child) this.adoptChild(this._child);
  }

  get child(): RenderBox | null {
    return this._child;
  }

  performLayout(): void {
    if (this._child) {
      this._child.layout(this.constraints!);
      this.size = this._child.size;
    } else {
      this.size = this.constraints!.smallest;
    }

    // If size changed, layer cache must be invalidated/resized
    if (this._layer) {
      const w = Math.round(this.size.width);
      const h = Math.round(this.size.height);
      if (this._layer.width !== w || this._layer.height !== h) {
        this._layer.resize(w, h);
      }
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    if (!this._child) return;

    const w = Math.round(this.size.width);
    const h = Math.round(this.size.height);
    const ox = Math.round(offset.col);
    const oy = Math.round(offset.row);

    // FAST PATH: layer is clean and position unchanged -- blit from cache
    if (this._layer && !this._layer.isDirty &&
        this._layer.lastOffsetX === ox && this._layer.lastOffsetY === oy &&
        this._layer.width === w && this._layer.height === h) {
      this._layer.blitTo(PaintContext.getScreen(context).getBackBuffer(), ox, oy);
      return; // SKIP entire subtree
    }

    // SLOW PATH: layer is dirty or missing -- paint subtree and capture
    this._ensureLayer(w, h);

    // Paint child normally (writes directly to screen buffer back buffer)
    this._child.paint(context, offset.add(this._child.offset));

    // Capture the painted region into the CellLayer for future reuse
    this._layer!.captureFrom(
      PaintContext.getScreen(context).getBackBuffer(),
      ox, oy,
    );
  }

  private _ensureLayer(w: number, h: number): void {
    if (!this._layer) {
      this._layer = new CellLayer(w, h);
    } else if (this._layer.width !== w || this._layer.height !== h) {
      this._layer.resize(w, h);
    }
  }

  override visitChildren(visitor: (child: RenderBox) => void): void {
    if (this._child) visitor(this._child);
  }

  override detach(): void {
    super.detach();
    // Layer cache persists across detach/reattach for potential reuse.
    // It will be invalidated if size changes when re-laid-out.
  }
}
```

### 3.7 The `RepaintBoundary` Widget

```typescript
// New file: /packages/flitter-core/src/widgets/repaint-boundary.ts

import { SingleChildRenderObjectWidget, type RenderObject } from '../framework/render-object';
import { RenderRepaintBoundary } from '../rendering/render-repaint-boundary';
import type { Widget } from '../framework/widget';
import type { Key } from '../core/key';

/**
 * A widget that inserts a RepaintBoundary into the render tree.
 *
 * Wrap a subtree in RepaintBoundary when it repaints independently of siblings.
 * Good candidates:
 * - Blinking cursors
 * - Animated spinners or progress bars
 * - Scroll view content vs. static headers/footers
 * - Independently updating panels in a multi-pane layout
 * - Status bars that update on a different cadence than main content
 *
 * The RepaintBoundary caches the subtree's painted cells in a CellLayer.
 * On frames where the subtree has not changed, the cached cells are blit
 * directly to the screen buffer, skipping the entire paint() DFS traversal
 * for that subtree.
 */
export class RepaintBoundary extends SingleChildRenderObjectWidget {
  constructor(opts?: { key?: Key; child?: Widget }) {
    super(opts);
  }

  createRenderObject(): RenderObject {
    return new RenderRepaintBoundary();
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // No mutable properties -- the boundary is structural only.
  }
}
```

### 3.8 Accessing `ScreenBuffer` from `PaintContext`

The `RenderRepaintBoundary.paint()` method needs access to the back buffer for `captureFrom()` and `blitTo()`. The `PaintContext` already exposes a static `getScreen()` helper (paint-context.ts line 89):

```typescript
static getScreen(ctx: PaintContext): ScreenBuffer {
  return ctx.screen;
}
```

And `ScreenBuffer` already exposes `getBackBuffer()` (screen-buffer.ts line 188):

```typescript
getBackBuffer(): Buffer {
  return this.backBuffer;
}
```

No modifications to `PaintContext` are needed for the core mechanism.

---

## 4. `markNeedsPaint` Propagation Chain: Before vs After

### 4.1 Before (Current Implementation)

Consider this render tree:

```
RootRenderBox
  RenderFlex (Column)
    RenderPadding (header)
      RenderText ("Title")
    RenderFlex (body)
      RenderPadding
        RenderText ("content A")    <-- THIS changes color
      RenderText ("content B")
    RenderPadding (footer)
      RenderText ("v1.0")
```

When `RenderText("content A")` changes color:

```
RenderText("content A").markNeedsPaint()
  -> _needsPaint = true
  -> parent (RenderPadding).markNeedsPaint()
    -> _needsPaint = true
    -> parent (RenderFlex body).markNeedsPaint()
      -> _needsPaint = true
      -> parent (RenderFlex column).markNeedsPaint()
        -> _needsPaint = true
        -> parent (RootRenderBox).markNeedsPaint()
          -> _needsPaint = true
          -> PipelineOwner.requestPaint()
```

During paint phase:
```
screen.clear()                                    -- 4800 cell writes (120x40)
Root.paint(ctx, (0,0))
  Column.paint(ctx, offset)
    Header.paint(ctx, headerOffset)               -- WASTED
      Text("Title").paint(ctx, titleOffset)       -- WASTED
    Body.paint(ctx, bodyOffset)
      Padding.paint(ctx, padOffset)
        Text("content A").paint(ctx, textOffset)  -- ACTUAL WORK
      Text("content B").paint(ctx, bOffset)       -- WASTED
    Footer.paint(ctx, footerOffset)               -- WASTED
      Text("v1.0").paint(ctx, verOffset)          -- WASTED
getDiff()                                         -- 4800 cell comparisons
```

**Result**: 9 render objects visit their `paint()` method. Full buffer clear and full diff scan. Only 1 cell actually changed.

### 4.2 After (With RepaintBoundary Around Header and Footer)

```
RootRenderBox
  RenderFlex (Column)
    RenderRepaintBoundary (header boundary)
      RenderPadding (header)
        RenderText ("Title")
    RenderRepaintBoundary (body boundary)       <-- cache invalidated
      RenderFlex (body)
        RenderPadding
          RenderText ("content A")              <-- THIS changes color
        RenderText ("content B")
    RenderRepaintBoundary (footer boundary)
      RenderPadding (footer)
        RenderText ("v1.0")
```

Propagation:
```
RenderText("content A").markNeedsPaint()
  -> _needsPaint = true
  -> parent (RenderPadding).markNeedsPaint()
    -> _needsPaint = true
    -> parent (RenderFlex body).markNeedsPaint()
      -> _needsPaint = true
      -> parent (RenderRepaintBoundary body).markNeedsPaint()
        -> _needsPaint = true
        -> isRepaintBoundary === true  --> STOP
        -> PipelineOwner.requestPaint(bodyBoundary)
```

During paint phase:
```
screen.clear()                                       -- Still O(W*H) in Phase 1
Root.paint(ctx, (0,0))
  Column.paint(ctx, offset)
    HeaderBoundary.paint(ctx, hdrOffset)
      -> layer clean, position unchanged -> blitTo(backBuffer)  -- FAST
    BodyBoundary.paint(ctx, bodyOffset)
      -> layer DIRTY -> paint subtree:
        Body.paint(ctx, bodyOffset)
          Padding.paint(ctx, padOffset)
            Text("content A").paint(ctx, textOffset)  -- ACTUAL WORK
          Text("content B").paint(ctx, bOffset)       -- Still visited within boundary
      -> captureFrom(backBuffer) to update cache
    FooterBoundary.paint(ctx, ftrOffset)
      -> layer clean, position unchanged -> blitTo(backBuffer)  -- FAST
getDiff()                                            -- O(W*H) full scan
```

**Result**: 5 render objects execute `paint()` (body subtree only). Header and footer subtrees are skipped entirely -- their cached cells are blitted. That is 4 fewer paint() calls (44% reduction for this small example). For larger trees, the reduction is proportionally greater.

---

## 5. Interaction with the `ScreenBuffer` and Diff Pipeline

### 5.1 Caching with `screen.clear()`

The current approach calls `screen.clear()` before painting. With boundaries:
- The back buffer is cleared to all EMPTY_CELL.
- Clean boundaries blit their cached cells over the empty cells.
- Dirty boundaries paint their subtrees, which write cells.
- The final back buffer content is identical to what a full repaint would produce.

This is correct but suboptimal: we write EMPTY_CELL and then immediately overwrite with cached cells. This is addressed in Phase 2.

### 5.2 Caching with `getDiff()`

After painting (with blits for clean boundaries + real paint for dirty ones):
- The back buffer has complete, correct content.
- `getDiff()` compares front (previous frame) and back (current frame) buffers.
- For clean boundaries whose position did not change: blit cells are identical to front buffer cells (the content hasn't changed), so `getDiff()` finds no differences. This is the desired fast path.
- For dirty boundaries: `getDiff()` detects the actual cell changes.

The diff algorithm is unmodified and continues to work correctly.

### 5.3 Memory Cost

Each `CellLayer` stores W * H `Cell` objects. A `Cell` is approximately 50-100 bytes (char string + CellStyle object with fg/bg Color instances, booleans, optional hyperlink):

| Boundary size | Cells | Approximate memory |
|--------------|-------|--------------------|
| 120 x 1 (status bar) | 120 | ~6 KB |
| 120 x 10 (panel) | 1,200 | ~60 KB |
| 120 x 40 (full screen) | 4,800 | ~240 KB |
| 10 boundaries total | ~12,000 | ~600 KB |

This is negligible for a terminal application.

### 5.4 Cache Invalidation Triggers

A boundary's `CellLayer` is invalidated (marked dirty) when:

1. **`markNeedsPaint()` reaches it**: A descendant's visual property changed.
2. **Size changes during layout**: `performLayout()` detects size mismatch and calls `_layer.resize()` which marks dirty.
3. **Position changes**: `paint()` detects `lastOffsetX/Y` mismatch and falls through to the slow path.
4. **Terminal resize**: `ScreenBuffer.markForRefresh()` is set, `beginFrame()` sets `_shouldPaintCurrentFrame = true`, and `screen.clear()` wipes the back buffer. All boundaries must repaint from scratch (their cached cells are overwritten by `screen.clear()` and thus stale if blit is attempted after clear -- but since the clear happens first and then DFS traversal runs, the boundaries detect that they must repaint because their `_needsPaint` was set via the resize -> `markNeedsLayout()` -> `markNeedsPaint()` chain).

---

## 6. Dirty Region Tracking (Phase 2/3 Enhancement)

### 6.1 Current State

`getDiff()` (screen-buffer.ts line 334 comment) scans all cells: `"Amp ref: getDiff() scans ALL cells (no dirty region tracking)"`. With RepaintBoundary, we know which regions are dirty and can optimize the diff.

### 6.2 Proposed Enhancement

Add lightweight dirty rectangle tracking to `ScreenBuffer`:

```typescript
// Additions to ScreenBuffer class
private _dirtyRects: Array<{ x: number; y: number; w: number; h: number }> = [];

markRegionDirty(x: number, y: number, w: number, h: number): void {
  this._dirtyRects.push({ x, y, w, h });
}

getDiffOptimized(): RowPatch[] {
  if (this._dirtyRects.length === 0 && !this.needsFullRefresh) {
    return []; // Nothing changed
  }
  if (this.needsFullRefresh || this._dirtyRects.length === 0) {
    this._dirtyRects = [];
    return this.getDiff(); // Fall back to full scan
  }
  // Only scan rows covered by dirty rects
  const dirtyRows = new Set<number>();
  for (const rect of this._dirtyRects) {
    for (let y = rect.y; y < rect.y + rect.h && y < this.height; y++) {
      dirtyRows.add(y);
    }
  }
  this._dirtyRects = [];
  // Diff only dirty rows (similar to getDiff but skipping clean rows)
  // ... implementation details ...
}
```

This is Phase 2/3 and not required for the core RepaintBoundary MVP.

---

## 7. Implementation Plan

### Phase 1: Core RepaintBoundary (MVP)

**New files:**
1. `/packages/flitter-core/src/rendering/cell-layer.ts` -- `CellLayer` class
2. `/packages/flitter-core/src/rendering/render-repaint-boundary.ts` -- `RenderRepaintBoundary` class
3. `/packages/flitter-core/src/widgets/repaint-boundary.ts` -- `RepaintBoundary` widget

**Modified files:**
1. `src/framework/render-object.ts`:
   - Add `get isRepaintBoundary(): boolean` (default `false`)
   - Add `_repaintBoundary: RenderObject | null` field
   - Modify `markNeedsPaint()` to stop at boundaries
   - Modify `attach()` to compute `_repaintBoundary`
   - Modify `detach()` to clear `_repaintBoundary`
2. `src/framework/pipeline-owner.ts`: No changes needed (existing `requestPaint(node)` and `_nodesNeedingPaint` set are sufficient)
3. `src/scheduler/paint-context.ts`: No changes needed (`getScreen()` and `getBackBuffer()` already exposed)

**Behavior:**
- `screen.clear()` remains
- `paintRenderTree()` starts from root as before
- `RenderRepaintBoundary.paint()` short-circuits by blitting cached `CellLayer`
- `getDiff()` full scan remains
- Default behavior (no RepaintBoundary widgets) is identical to current

### Phase 2: Eliminate Full Buffer Clear

**Modified files:**
1. `src/framework/binding.ts` -- Replace unconditional `screen.clear()` with selective clearing
2. `src/terminal/screen-buffer.ts` -- Add `clearRegion(x, y, w, h)` method
3. `src/rendering/render-repaint-boundary.ts` -- Clear only boundary region before repaint

### Phase 3: Region-Optimized Diff

**Modified files:**
1. `src/terminal/screen-buffer.ts` -- Add `_dirtyRects` tracking and row-level optimized diff
2. `src/framework/binding.ts` -- Switch to optimized diff path

### Phase 4: Widget-Level Integration

1. Auto-insert `RepaintBoundary` in scroll view viewport
2. Consider auto-boundary for `RenderClipRect` when clipping is active
3. Add `RepaintBoundary` wrapping in `TextField` for cursor blink optimization
4. Document best practices for manual boundary placement

---

## 8. Testing Strategy

### 8.1 Unit Tests: CellLayer

**File**: `src/rendering/__tests__/cell-layer.test.ts`

```
Test 1: CellLayer stores and retrieves cells correctly
  - Create 10x5 CellLayer
  - setCell(3, 2, { char: 'A', style: { bold: true }, width: 1 })
  - Assert: getCell(3, 2).char === 'A' && getCell(3, 2).style.bold === true
  - Assert: getCell(0, 0) === EMPTY_CELL

Test 2: CellLayer.clear() resets all cells to EMPTY_CELL
  - Set several cells, call clear()
  - Assert: all positions return EMPTY_CELL

Test 3: CellLayer.resize() marks dirty and resizes
  - Create 10x5, set cells, mark clean
  - resize(20, 10)
  - Assert: isDirty === true
  - Assert: width === 20, height === 10

Test 4: CellLayer.captureFrom() deep-clones cells from back buffer
  - Set known cells in a Buffer at offset (5, 3)
  - captureFrom(buffer, 5, 3)
  - Modify the original buffer cells
  - Assert: layer still has the original cell values (deep clone)

Test 5: CellLayer.blitTo() writes cached cells to target buffer
  - Capture cells, clear target buffer
  - blitTo(buffer, 5, 3)
  - Assert: buffer cells at offset match captured cells

Test 6: CellLayer handles CJK wide characters
  - Capture a region containing a width-2 character
  - blitTo a new buffer
  - Assert: both primary cell and continuation marker are correct

Test 7: CellLayer out-of-bounds access is safe
  - setCell(-1, 0, cell) does not crash
  - getCell(999, 999) returns EMPTY_CELL
```

### 8.2 Unit Tests: RenderRepaintBoundary

**File**: `src/rendering/__tests__/render-repaint-boundary.test.ts`

```
Test 8: isRepaintBoundary returns true
  - Assert: new RenderRepaintBoundary().isRepaintBoundary === true

Test 9: Default RenderBox.isRepaintBoundary returns false
  - Assert: new ConcreteRenderBox().isRepaintBoundary === false

Test 10: First paint() executes child paint and captures layer
  - Set up boundary with mock child tracking paint calls
  - Call boundary.paint(ctx, offset)
  - Assert: child.paint was called once
  - Assert: boundary._layer is not null
  - Assert: boundary._layer.isDirty === false (captured)

Test 11: Second paint() with clean subtree blits from cache
  - Paint once (populates cache)
  - Clear _needsPaint flags
  - Paint again at same offset
  - Assert: child.paint was NOT called on second paint
  - Assert: screen buffer cells are correct (from blit)

Test 12: paint() with dirty subtree re-executes child paint
  - Paint once, then mark child dirty, paint again
  - Assert: child.paint called on second paint
  - Assert: layer recaptured with new content

Test 13: paint() with changed offset invalidates cache
  - Paint at offset (5, 3), then paint at offset (10, 6)
  - Assert: child.paint called on second paint (offset mismatch)

Test 14: performLayout() resizes layer when size changes
  - Layout at size 10x5
  - Change child to produce size 20x10
  - Layout again
  - Assert: layer.width === 20, layer.height === 10
  - Assert: layer.isDirty === true
```

### 8.3 Unit Tests: markNeedsPaint() Propagation

**File**: `src/framework/__tests__/repaint-boundary-propagation.test.ts`

```
Test 15: markNeedsPaint stops at RepaintBoundary
  - Tree: root -> boundary (isRepaintBoundary=true) -> child -> leaf
  - Clear all _needsPaint flags
  - leaf.markNeedsPaint()
  - Assert: leaf._needsPaint === true
  - Assert: child._needsPaint === true
  - Assert: boundary._needsPaint === true
  - Assert: root._needsPaint === false  <-- KEY

Test 16: markNeedsPaint propagates to root without boundary
  - Tree: root -> parent -> child (no boundaries except root)
  - child.markNeedsPaint()
  - Assert: root._needsPaint === true (backward compatible)

Test 17: root is always an implicit boundary
  - root.markNeedsPaint() calls requestPaint on owner
  - Assert: PipelineOwner.requestPaint was called

Test 18: _repaintBoundary computed correctly during attach
  - Tree: root -> A -> B(boundary) -> C -> D
  - Assert: A._repaintBoundary === root
  - Assert: B._repaintBoundary === B
  - Assert: C._repaintBoundary === B
  - Assert: D._repaintBoundary === B

Test 19: Nested boundaries -- inner change does not dirty outer
  - Tree: root -> outerBoundary -> innerBoundary -> leaf
  - Clear flags, leaf.markNeedsPaint()
  - Assert: innerBoundary._needsPaint === true
  - Assert: outerBoundary._needsPaint === false
  - Assert: root._needsPaint === false

Test 20: markNeedsPaint deduplication
  - Call markNeedsPaint() twice on the same node
  - Assert: parent's markNeedsPaint called only once (early return guard)

Test 21: Sibling boundaries are independent
  - Tree: root -> [boundaryA -> childA, boundaryB -> childB]
  - childA.markNeedsPaint()
  - Assert: boundaryA._needsPaint === true
  - Assert: boundaryB._needsPaint === false
```

### 8.4 Integration Tests: Full Paint Pipeline

**File**: `src/framework/__tests__/repaint-boundary-integration.test.ts`

```
Test 22: RepaintBoundary widget creates RenderRepaintBoundary in render tree
  - Build: RepaintBoundary(child: Text("hello"))
  - Pump frame
  - Walk render tree, find RenderRepaintBoundary
  - Assert: isRepaintBoundary === true

Test 23: Screen output correct with RepaintBoundary
  - Build: Column -> RepaintBoundary(Text("header")) -> Text("body")
  - Pump frame
  - Assert: screen shows "header" and "body" in correct positions

Test 24: Screen output identical with and without boundaries
  - Build same tree with and without RepaintBoundary wrappers
  - Pump frame for each
  - Assert: cell-by-cell comparison of back buffers is identical
  - THIS IS THE CRITICAL CORRECTNESS TEST

Test 25: Clean boundary skips subtree paint on subsequent frames
  - Build tree, pump first frame
  - Track paint() call count on boundary's child
  - Pump second frame with no changes
  - Assert: child paint count did not increase (blit used)

Test 26: Dirty boundary re-paints subtree
  - Build: Column -> RepaintBoundary(child: StatefulText)
  - Pump frame, update StatefulText content, pump again
  - Assert: child was re-painted
  - Assert: screen shows updated content

Test 27: Terminal resize causes full repaint of all boundaries
  - Build tree with boundaries, pump frame
  - Resize terminal, pump frame
  - Assert: all boundary layers are dirty after resize
  - Assert: all children were re-painted

Test 28: getDiff produces correct patches with boundaries
  - Build tree with boundaries
  - Pump frame 1 (full paint, getDiff produces full patch set)
  - Pump frame 2 with 1 dirty boundary
  - Assert: getDiff returns patches only for the changed region
  - Assert: ANSI output length is small (only changed cells)
```

### 8.5 Performance Benchmarks

```
Benchmark 1: Paint call count reduction
  - Tree: 10 top-level RepaintBoundary regions, each with 10 children (100 total)
  - Dirty: 1 region
  - Without boundaries: 100 paint() calls
  - With boundaries: ~10 paint() calls + 9 blits
  - Measure: paint() call count

Benchmark 2: Wall-clock paint phase time
  - Setup: 120x40 terminal, 200 render objects
  - Measure: time for WidgetsBinding.paint() with 1 dirty node
  - Compare: with vs without RepaintBoundary
  - Expected: >40% reduction in paint phase time

Benchmark 3: Blinking cursor scenario
  - Setup: Text editor layout, cursor toggles every frame
  - Cursor region in RepaintBoundary, all other content in separate boundaries
  - Measure: total cells written per frame
  - Without boundaries: ~4800 cells (full screen)
  - With boundaries: ~120 cells (cursor line only) + blit overhead
```

### 8.6 Regression Tests

```
Test 29: All existing render-object.test.ts tests pass
  - markNeedsPaint() with isRepaintBoundary default false is unchanged

Test 30: All existing paint-context.test.ts tests pass
  - PaintContext API unchanged, drawChar/drawText/fillRect work identically

Test 31: All existing integration.test.ts tests pass
  - Full pipeline (build+layout+paint+render) produces same output

Test 32: All existing screen-buffer.test.ts tests pass
  - getDiff, present, resize all work identically
```

---

## 9. Backward Compatibility

This proposal is designed for full backward compatibility:

1. **`isRepaintBoundary` defaults to `false`**: Without explicit `RepaintBoundary` widgets in the tree, all render objects propagate `markNeedsPaint()` to the root. Behavior is identical to current implementation.

2. **`screen.clear()` remains in Phase 1**: The back buffer is fully cleared before painting, so even if cached layers had stale data, the screen output is correct (dirty boundaries repaint, clean boundaries blit).

3. **No changes to `PaintContext` API**: All existing `drawChar()`, `drawText()`, `fillRect()`, `drawBorder()`, `withClip()` calls work identically.

4. **No changes to `PipelineOwner`**: The existing `requestPaint(node)` and `_nodesNeedingPaint` set handle boundary node registration without modification.

5. **Existing tests pass unchanged**: Since RepaintBoundary is opt-in and default behavior is unchanged, all existing tests continue to pass.

6. **No Amp reference violation**: The Amp reference explicitly states `"No RepaintBoundary -- full repaint each frame"`. This proposal adds RepaintBoundary as an opt-in enhancement. Without boundaries in the tree, behavior is 100% identical to Amp.

---

## 10. Relationship to Gap R01 (RelayoutBoundary)

| Aspect | RelayoutBoundary (R01) | RepaintBoundary (R02) |
|--------|----------------------|---------------------|
| Pipeline phase | LAYOUT | PAINT |
| Dirty propagation | `markNeedsLayout()` stops at boundary | `markNeedsPaint()` stops at boundary |
| Work skipped | `performLayout()` on clean ancestors | `paint()` on clean subtrees |
| Caching mechanism | None (just prevents propagation) | `CellLayer` caches painted cell output |
| Trigger | Constraint/size changes | Any visual property change (color, text, decoration) |
| Independence | Can implement standalone | Can implement standalone |

The two optimizations are complementary and independent. RepaintBoundary is arguably more impactful for TUI rendering because:
1. Paint is typically more expensive than layout (string processing, style merging, cell writes).
2. Many visual changes (cursor blink, highlight toggle, selection) affect paint only, not layout.
3. The `screen.clear()` + full DFS + `getDiff()` chain is O(W*H) regardless of layout optimizations.

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stale cache shows old content | High | Phase 1 keeps `screen.clear()`. Cache invalidated on any `markNeedsPaint()`. Size/offset changes detected. Comprehensive visual regression tests. |
| CellLayer memory consumption | Low | ~60 KB per 120x10 boundary. 10 boundaries = ~600 KB. Negligible. |
| Cell cloning overhead in capture/blit | Medium | Profile: clone cost is small vs paint() cost. For 1,200-cell boundary, ~0.1ms clone vs ~1ms paint. |
| Incorrect boundary placement (always dirty) | Medium | Provide docs on where to place boundaries. Consider boundary hit rate diagnostic in perf overlay. |
| Overlapping boundaries (z-order) | Low | TUI is largely non-overlapping. Stack widget overlaps are handled by paint order (last painted wins). Same applies to cached blits. |
| Clip interaction with cache | Medium | Clipping is handled by `PaintContext.withClip()` before cell writes. Captured cells already reflect clipping. |
| Amp fidelity divergence | Medium | Justified deviation, well-documented. Default behavior (no boundaries) matches Amp exactly. |

---

## 12. Amp Reference Acknowledgment

The Amp binary has no RepaintBoundary or compositing infrastructure. From `.reference/render-tree.md` (lines 183-184):

> **No RepaintBoundary**: `markNeedsPaint()` immediately tells PipelineOwner. There is no `isRepaintBoundary` or `_needsCompositing` -- the TUI does not need compositing layers.

And the comparison table (line 942):

| Feature | Flutter | Amp TUI |
|---------|---------|---------|
| RepaintBoundary | Yes, compositing layers | **No** -- full repaint each frame |

This proposal is an intentional, justified enhancement beyond Amp. The key design principle: **without any `RepaintBoundary` widgets in the tree, behavior is 100% identical to Amp**.
