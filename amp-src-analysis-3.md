# Analysis 3: RenderObject Tree and Layout System

## Overview

The Flitter TUI framework implements a rendering layer that closely mirrors Flutter's RenderObject architecture but with significant simplifications tailored to terminal-based UI. The rendering subsystem lives across two primary directories: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/` (base classes and pipeline orchestration) and `/home/gem/workspace/flitter/packages/flitter-core/src/layout/` (concrete layout implementations). This analysis covers the RenderObject base class hierarchy, the PipelineOwner, the constraint-based layout protocol, the paint protocol, BoxConstraints, EdgeInsets, hit testing (or lack thereof), and comparisons to Flutter's rendering layer.

---

## 1. RenderObject Base Class (`render-object.ts`)

The file `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts` defines the entire render object class hierarchy in a single module: `RenderObject`, `RenderBox`, `ContainerRenderBox`, and the widget bridge classes (`RenderObjectWidget`, `SingleChildRenderObjectWidget`, `MultiChildRenderObjectWidget`, `LeafRenderObjectWidget`).

### RenderObject (Amp: `n_`)

The abstract `RenderObject` is the root of the render tree node hierarchy. It carries:

- **`parent`**: Reference to the parent RenderObject (or null for root).
- **`parentData`**: Slot for parent-assigned data (e.g., `FlexParentData`). Set via `setupParentData()`.
- **`_needsLayout` / `_needsPaint`**: Dirty flags, both initialized to `true` (ensuring first layout/paint always runs).
- **`_owner`**: Reference to the `PipelineOwner` (set on `attach()`).
- **`_attached`**: Boolean tracking whether this node is mounted in a live tree.

### Tree Management: `adoptChild` / `dropChild`

`adoptChild(child)` performs four operations in sequence:
1. Sets `child.parent = this`.
2. Calls `setupParentData(child)` to ensure appropriate ParentData is installed.
3. If the parent is attached, recursively attaches the child to the same `PipelineOwner`.
4. Calls `markNeedsLayout()` on the parent (this node) to trigger re-layout.

`dropChild(child)` performs the inverse: detaches the child if it was attached, clears `child.parent`, and marks this node as needing layout.

### `attach` / `detach`

`attach(owner)` sets `_owner` and `_attached = true`. `detach()` clears both. These are simple and non-recursive at the base level; child propagation is handled by the `ContainerRenderBox` and single-child render objects that override `visitChildren`. This is a notable simplification from Flutter, where `attach`/`detach` recursively walk the child list.

### `markNeedsLayout()`

This is one of the most architecturally significant methods. The implementation reveals a critical difference from Flutter:

```typescript
markNeedsLayout(): void {
  if (this._needsLayout) return;
  if (!this._attached) {
    this._needsLayout = true;
    return;
  }
  this._needsLayout = true;
  if (this.parent) {
    this.parent.markNeedsLayout();
  } else {
    this._owner?.requestLayout();
  }
}
```

**There is NO RelayoutBoundary.** In Flutter, `markNeedsLayout()` walks up the tree only until it hits a relayout boundary, adding that boundary to `PipelineOwner._nodesNeedingLayout`. In Flitter/Amp, dirty propagation always reaches the root. This means every layout invalidation triggers a full top-down re-layout from the root. This is acceptable for a TUI where the widget tree is typically shallow (tens of nodes, not thousands), but would be prohibitively expensive in a GUI framework.

### `markNeedsPaint()`

Similarly simplified: no RepaintBoundary, no compositing layers. `markNeedsPaint()` propagates upward to the parent, and when it reaches the root, calls `_owner?.requestPaint()`. The comment notes "always tells PipelineOwner directly (no RepaintBoundary)" which mirrors the Amp source behavior. This means the entire screen is always repainted when any node is dirty -- again, acceptable for a terminal where the paint operation writes to a double-buffered screen buffer and diffs against the previous frame.

### Abstract Methods

Two abstract methods define the core protocol:
- `performLayout(): void` -- Subclasses compute their own size and lay out children.
- `paint(context: PaintContext, offset: Offset): void` -- Subclasses write characters to the paint context at the given accumulated offset.

### `visitChildren` and `setupParentData`

`visitChildren` is a no-op on the base class (leaf nodes have no children). `setupParentData` installs a default `ParentData` instance. Both are overridden by subclasses.

---

## 2. RenderBox (Amp: `j9`)

`RenderBox extends RenderObject` adds the box-model layout protocol:

- **`_size: Size`**: The computed size after layout, stored as an integer-valued `Size(width, height)`.
- **`_offset: Offset`**: Position relative to the parent, stored directly on the RenderBox. This is a deviation from Flutter, where offset lives in `BoxParentData`. The code comments confirm: "Offset is stored directly on RenderBox (not in BoxParentData)."
- **`_lastConstraints: BoxConstraints | null`**: Cached constraints from the most recent `layout()` call, used for the skip optimization.

### `layout(constraints: BoxConstraints)`

The `layout()` method is the entry point for constraint-based layout:

```typescript
layout(constraints: BoxConstraints): void {
  const constraintsChanged =
    !this._lastConstraints ||
    !constraints.equals(this._lastConstraints);
  if (!this._needsLayout && !constraintsChanged) return;
  this._lastConstraints = constraints;
  this._needsLayout = false;
  this.performLayout();
}
```

Key observations:
1. **Single-argument** -- no `parentUsesSize` parameter (Flutter has `layout(constraints, {parentUsesSize})`).
2. **Skip optimization** -- if not dirty AND constraints are unchanged, the method returns immediately. This avoids redundant layout passes.
3. **Dirty flag cleared BEFORE `performLayout()`** -- matching Amp's behavior exactly. This means if `performLayout()` itself calls `markNeedsLayout()` on this node (which would be a bug), the flag gets re-set.
4. **No `sizedByParent` / `performResize()` split** -- all sizing happens in a single `performLayout()` call. Flutter separates "intrinsic size that depends only on constraints" (`performResize`) from "size that depends on children" (`performLayout`). Amp/Flitter collapses both into one method.

### Intrinsic Size Protocol

`RenderBox` provides four intrinsic measurement methods, all returning `0` by default:
- `getMinIntrinsicWidth(height)`
- `getMaxIntrinsicWidth(height)`
- `getMinIntrinsicHeight(width)`
- `getMaxIntrinsicHeight(width)`

These are overridden by `RenderFlex` to support the flex layout algorithm's need to measure inflexible children.

---

## 3. ContainerRenderBox

`ContainerRenderBox extends RenderBox` manages an ordered list of child `RenderBox` nodes via an internal `_children: RenderBox[]` array. This is a simplification from Flutter's linked-list child model (`ContainerRenderObjectMixin` uses `firstChild`/`nextSibling` pointers). The array approach matches Amp's `n_._children = []`.

Methods:
- `insert(child, after?)` -- Adds a child, calling `adoptChild` and splicing into the array.
- `remove(child)` -- Removes by index, calls `dropChild`.
- `removeAll()` -- Drops all children, resets array.
- `move(child, after?)` -- Reorders a child within the array.
- `visitChildren(visitor)` -- Iterates the array, calling the visitor for each child.

Accessors: `children` (readonly array), `childCount`, `firstChild`, `lastChild`.

---

## 4. PipelineOwner (`pipeline-owner.ts`, Amp: `UB0`)

The `PipelineOwner` class at `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts` manages the rendering pipeline. It owns:

- **`_rootRenderObject: RenderBox | null`** -- the root of the render tree.
- **`_rootConstraints: BoxConstraints | null`** -- derived from terminal size.
- **`_nodesNeedingPaint: Set<RenderObject>`** -- nodes marked for repaint.
- **`_needsLayout: boolean`** -- flag set by `requestLayout()`.

### Critical Design: No `_nodesNeedingLayout` List

This is one of the most important architectural decisions. In Flutter, `PipelineOwner` maintains a `_nodesNeedingLayout` list and `flushLayout()` iterates this list, laying out each dirty node from its own relayout boundary. In Flitter/Amp:

```typescript
flushLayout(): boolean {
  if (this._rootRenderObject && this._rootConstraints &&
      this._rootRenderObject.needsLayout) {
    this._rootRenderObject.layout(this._rootConstraints);
    return true;
  }
  this._needsLayout = false;
  return false;
}
```

Layout ALWAYS starts from root. There is no incremental re-layout of subtrees. This is consistent with the absence of `RelayoutBoundary` in `markNeedsLayout()`. The root gets the terminal-sized constraints (e.g., `BoxConstraints(0..120, 0..40)` for a 120x40 terminal) and the entire tree re-lays out top-down.

### `flushPaint()`

Similarly simplified: iterates `_nodesNeedingPaint`, clears each node's `_needsPaint` flag, and clears the set. The actual painting is done elsewhere (by `WidgetsBinding.paint()` in the PAINT phase of the frame scheduler). This is a bookkeeping-only method.

### `updateRootConstraints(size: Size)`

Creates a `BoxConstraints(0..width, 0..height)` from the terminal size and marks the root for re-layout if constraints changed. This is the bridge between terminal resize events and the layout system.

---

## 5. BoxConstraints (`core/box-constraints.ts`, Amp: `l3`)

`BoxConstraints` is an immutable value type with four fields: `minWidth`, `minHeight`, `maxWidth`, `maxHeight`. All values are integers (via `roundOrInf()` which rounds finite values but preserves `Infinity`).

### Factory Constructors

- `tight(size)` -- min=max on both axes (only one size is allowed).
- `tightFor({width?, height?})` -- tight on specified axes, loose on others.
- `loose(size)` -- min=0, max=size on both axes.

### Key Operations

- **`constrain(size)`** -- Clamps a `Size` to fit within constraints. This is the workhorse used by every `performLayout()`.
- **`enforce(constraints)`** -- Intersects two constraint sets, producing tighter constraints. Used by `RenderConstrainedBox` (SizedBox). The implementation clamps `this` constraint's min/max values to lie within the `other` constraint's range.
- **`deflate(edges)`** -- Subtracts edge widths from all four constraint bounds. Used by padding and border layout.
- **`loosen()`** -- Returns a copy with min values set to 0. Used to give children maximum flexibility.

### Query Properties

- `isTight` -- true if min equals max on both axes.
- `hasBoundedWidth` / `hasBoundedHeight` -- true if the max value is finite.
- `biggest` / `smallest` -- the extreme allowed sizes.

---

## 6. Layout Protocol in Practice

### Constraint Propagation Model

The layout protocol follows Flutter's "constraints go down, sizes go up" model:

1. Parent calls `child.layout(constraints)`.
2. Child computes its size within those constraints via `performLayout()`, setting `this.size`.
3. Parent reads `child.size` after layout and uses it to position the child (setting `child.offset`).
4. Parent computes its own size based on children's sizes.

### RenderPadding (Amp: `RU0`)

Located at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-padded.ts`. Single-child layout:
1. Deflate parent constraints by padding amounts.
2. Layout child with deflated constraints.
3. Set `child.offset = Offset(padding.left, padding.top)`.
4. `this.size = constraints.constrain(childSize + padding)`.

This is a textbook Flutter pattern, faithfully reproduced.

### RenderConstrainedBox (Amp: `xU0`)

Located at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-constrained.ts`. Used by SizedBox:
1. `enforce()` the additional constraints within parent constraints.
2. Layout child with enforced constraints.
3. `this.size = enforced.constrain(child.size)`.

### RenderFlex (Amp: `oU0`)

Located at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-flex.ts`. This is the most complex layout algorithm, implementing the classic 6-step flex layout:

**Step 1: Separate flex and non-flex children.** Children with `FlexParentData.flex > 0` are flexible; others are inflexible.

**Step 2: Layout non-flex children with unbounded main axis.** Horizontal flex (Row): width is unbounded, height constrained. Vertical flex (Column): height unbounded, width constrained. If `crossAxisAlignment === 'stretch'`, the cross axis is tight (forced to max).

**Step 3: Distribute remaining space to flex children.** `freeSpace = maxMain - allocatedSize`. `spacePerFlex = freeSpace / totalFlex`. Each flex child gets `floor(spacePerFlex * flex)` main axis space. `FlexFit` determines tight vs loose constraints: `tight` forces exact size, `loose` allows 0..allocated.

**Step 4: Compute self size.** `mainAxisSize === 'max'` takes the constraint maximum; `'min'` takes the sum of children.

**Step 5: Position children using mainAxisAlignment.** Computes `leadingSpace` and `betweenSpace` based on the alignment mode (start, end, center, spaceBetween, spaceAround, spaceEvenly).

**Step 6: Apply crossAxisAlignment offsets.** Each child gets a cross-axis offset based on alignment (start=0, center=floor((available-child)/2), end=available-child, stretch=0, baseline=0).

The intrinsic size methods on RenderFlex are also fully implemented, with the correct flex-proportional scaling for `getMaxIntrinsicWidth`/`getMaxIntrinsicHeight` along the main axis.

### RenderDecoratedBox (Amp: `fE`)

Located at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-decorated.ts`. Handles Container-style decoration (background color + border). Layout deflates constraints by border widths, positions child inside the border, then paints decoration using `PaintContext.fillRect()` and `PaintContext.drawBorder()`.

### RenderTable (Amp: `XYH`)

Located at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-table.ts`. Implements a full N-column table with three column width modes (`fixed`, `flex`, `intrinsic`), optional borders with box-drawing characters, cell padding, and proportional width distribution. Layout proceeds in four steps: resolve column widths, layout children and compute row heights, position children on a grid, and compute total size.

### RenderStickyHeader

Located at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-sticky-header.ts`. A two-child container (header + body) that implements sticky header behavior during scrolling. The header pins to the viewport top when it scrolls above the visible area, with push-away behavior when the total content exits the viewport. It accesses the clip rect from the PaintContext to determine viewport bounds.

### RenderGridBorder (Amp: `GJH`)

Located at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-grid-border.ts`. A multi-pane bordered container used for the PromptBar's split layout. It divides the available space into a left pane (remaining width) and a right pane (fixed width), with right pane sub-children stacked vertically and separated by horizontal dividers.

---

## 7. ParentData System

`ParentData` is the base class (Amp: `PJ`), with only a no-op `detach()`. `BoxParentData extends ParentData` is intentionally empty -- in Amp, offset lives on `RenderBox` itself, not in parent data.

`FlexParentData extends BoxParentData` (Amp: `S_`) adds:
- `flex: number` (default 0) -- the flex factor.
- `fit: FlexFit` (default 'tight') -- either `'tight'` or `'loose'`.

`TableCellParentData extends ParentData` adds `row` and `col` indices for grid positioning.

`PositionedParentData extends BoxParentData` adds positional properties (`left`, `top`, `right`, `bottom`, `width`, `height`) for future Stack layout support.

The `setupParentData(child)` override pattern ensures each child gets the correct ParentData type. For example, `RenderFlex.setupParentData()` creates `FlexParentData` if the child doesn't already have one.

---

## 8. Paint Protocol

Painting follows the "offset accumulation" pattern. Each `paint(context, offset)` call receives the accumulated offset from the root. The parent computes each child's absolute position as `offset.add(child.offset)` and passes it down.

The `PaintContext` interface in `render-object.ts` is a placeholder with no methods defined -- a forward declaration. The actual implementation (defined in the scheduler/paint module) provides methods like `fillRect()`, `drawBorder()`, and `drawChar()` that write characters with styling into a terminal screen buffer.

Painting is always a full traversal from root -- there are no compositing layers, no repaint boundaries, and no layer tree. When any node is dirty, the entire tree is repainted into the screen buffer, and the double-buffering system diffs the old and new buffers to produce minimal ANSI escape sequences for the terminal.

---

## 9. EdgeInsets (`layout/edge-insets.ts`, Amp: `g8`)

`EdgeInsets` is an immutable value type with integer-rounded `left`, `top`, `right`, `bottom` fields. Factory constructors mirror Flutter's API:

- `EdgeInsets.all(value)` -- same value on all sides.
- `EdgeInsets.symmetric({horizontal?, vertical?})` -- symmetric pairs.
- `EdgeInsets.horizontal(value)` / `EdgeInsets.vertical(value)` -- single-axis.
- `EdgeInsets.only({left?, top?, right?, bottom?})` -- individual sides.

Computed properties `totalHorizontal`/`horizontal` and `totalVertical`/`vertical` return the sum of opposite sides. These are used extensively by `RenderPadding` and `RenderDecoratedBox` for constraint deflation.

---

## 10. Layout Helpers (`layout/layout-helpers.ts`)

The `estimateIntrinsicWidth()` function is a standalone widget-tree walker (Amp: `fS`) that estimates the minimum intrinsic width of a widget subtree without building or laying it out. It inspects widget types (`Text`, `SizedBox`, `Container`, `Padding`, `Row`, `Column`) and uses heuristics: Text returns `TextSpan.computeWidth()`, Row sums children, Column takes the max, Padding adds horizontal padding, etc. This is used for pre-layout width estimation in scenarios like table column sizing.

---

## 11. Hit Testing

There is **no hit testing** in the current codebase. Flutter's `RenderObject` includes `hitTest()`, `hitTestChildren()`, and `hitTestSelf()` methods that walk the render tree in reverse paint order to find which node a pointer event targets. Flitter/Amp omits this entirely. Input handling in the TUI is focus-based rather than positional: keyboard events are routed through the focus tree (FocusManager / FocusScopeNode), not through render-tree hit testing. Mouse events, if supported at all, would need a separate mechanism, but the current architecture does not include one.

---

## 12. Comparison to Flutter's Rendering Layer

| Aspect | Flutter | Flitter/Amp |
|--------|---------|-------------|
| **RelayoutBoundary** | Incremental re-layout from boundary nodes | None -- always re-layout from root |
| **RepaintBoundary** | Compositing layers for incremental repaint | None -- full repaint every frame |
| **Offset storage** | In `BoxParentData` | Directly on `RenderBox._offset` |
| **`layout()` signature** | `layout(constraints, {parentUsesSize})` | `layout(constraints)` (single arg) |
| **`sizedByParent`** | Separate `performResize()` path | Not present; all sizing in `performLayout()` |
| **`_nodesNeedingLayout`** | Sorted list in PipelineOwner | Not present; root-only layout |
| **Layer tree** | Full compositing layer tree | None -- direct paint to screen buffer |
| **Hit testing** | `hitTest()` / `hitTestChildren()` | Not implemented; focus-based input |
| **Child model** | Linked list (nextSibling/previousSibling) | Array (`_children: RenderBox[]`) |
| **Coordinate system** | Floating-point logical pixels | Integer terminal cell coordinates |
| **Intrinsic sizes** | Full protocol on RenderBox | Present but simplified (base returns 0) |
| **ParentData** | `BoxParentData` carries offset | `BoxParentData` is empty; offset on RenderBox |

### Why These Simplifications Work

The TUI context justifies every simplification:

1. **No RelayoutBoundary**: Terminal UIs have shallow widget trees (typically 20-50 render objects). A full root-down layout pass is negligible in cost compared to the terminal I/O itself.

2. **No RepaintBoundary / compositing layers**: The double-buffered screen buffer with cell-level diffing already minimizes actual terminal writes. Layer compositing would add complexity with zero benefit.

3. **No hit testing**: Terminal UIs are keyboard-driven. Focus management replaces spatial hit testing.

4. **Integer coordinates**: Terminal cells are discrete -- sub-cell positioning is meaningless. This eliminates an entire class of floating-point layout edge cases.

5. **Array child model**: With small child counts, array iteration is cache-friendly and simpler than linked-list traversal. The O(n) splice for insert/remove is irrelevant at terminal-UI scale.

---

## 13. Widget-to-RenderObject Bridge

The file also defines the widget bridge classes that connect the widget tree to the render tree:

- **`RenderObjectWidget`** -- abstract base with `createRenderObject()` and `updateRenderObject()`.
- **`SingleChildRenderObjectWidget`** -- has an optional `child` widget; creates `SingleChildRenderObjectElement`.
- **`MultiChildRenderObjectWidget`** -- has a `children` array; creates `MultiChildRenderObjectElement`.
- **`LeafRenderObjectWidget`** -- no children; creates `LeafRenderObjectElement`.

Each widget's `createElement()` method lazily requires the corresponding Element class to avoid circular imports -- a practical pattern given the tight coupling between widget, element, and render object layers.

---

## 14. Summary of Key Files

| File | Purpose | Amp Ref |
|------|---------|---------|
| `framework/render-object.ts` | RenderObject, RenderBox, ContainerRenderBox, widget bridges | `n_`, `j9`, `PJ`, `yj`, `Qb`, `An` |
| `framework/pipeline-owner.ts` | PipelineOwner -- layout/paint scheduling | `UB0` |
| `core/box-constraints.ts` | BoxConstraints -- immutable constraint type | `l3` |
| `core/types.ts` | Offset, Size, Rect -- integer coordinate types | N/A |
| `layout/edge-insets.ts` | EdgeInsets -- immutable edge inset type | `g8` |
| `layout/parent-data.ts` | FlexParentData, PositionedParentData | `S_` |
| `layout/render-flex.ts` | RenderFlex -- 6-step flex layout | `oU0` |
| `layout/render-padded.ts` | RenderPadding -- constraint deflation by padding | `RU0` |
| `layout/render-constrained.ts` | RenderConstrainedBox -- additional constraints (SizedBox) | `xU0` |
| `layout/render-decorated.ts` | RenderDecoratedBox -- background + border painting | `fE` |
| `layout/render-table.ts` | RenderTable -- N-column grid layout | `XYH` |
| `layout/render-grid-border.ts` | RenderGridBorder -- multi-pane bordered container | `GJH` |
| `layout/render-sticky-header.ts` | RenderStickyHeader -- scroll-aware sticky header | N/A |
| `layout/layout-helpers.ts` | `estimateIntrinsicWidth()` -- widget tree width estimation | `fS` |

The rendering layer is a faithful, simplified reproduction of Flutter's RenderObject architecture, adapted to terminal constraints. It maintains the essential "constraints down, sizes up, parent positions children" protocol while stripping away the optimization infrastructure (relayout boundaries, repaint boundaries, compositing layers, hit testing) that a GUI framework needs but a TUI does not.
