# Gap R01: Implement `RelayoutBoundary` to Avoid Full-Tree Layout Cascades

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Layout Pipeline Analysis

### 1.1 How `markNeedsLayout()` Works Today

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts` (lines 145-160), the `markNeedsLayout()` method on `RenderObject` unconditionally propagates upward to the root:

```typescript
markNeedsLayout(): void {
  if (this._needsLayout) return;       // already dirty, stop
  if (!this._attached) {
    this._needsLayout = true;
    return;
  }
  this._needsLayout = true;
  // In Amp: always propagate to parent (NO RelayoutBoundary)
  if (this.parent) {
    this.parent.markNeedsLayout();      // propagate UP to parent
  } else {
    this._owner?.requestLayout();       // root: tell PipelineOwner
  }
}
```

This means any single dirty node -- even a deeply nested leaf -- causes every ancestor up to the root to be marked dirty. The comment on line 153 explicitly notes: `"In Amp: always propagate to parent (NO RelayoutBoundary)"`.

### 1.2 How `PipelineOwner.flushLayout()` Works Today

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts` (lines 126-138), `flushLayout()` starts layout exclusively from the root render object:

```typescript
flushLayout(): boolean {
  let layoutPerformed = false;
  if (
    this._rootRenderObject &&
    this._rootConstraints &&
    this._rootRenderObject.needsLayout
  ) {
    this._rootRenderObject.layout(this._rootConstraints);
    layoutPerformed = true;
  }
  this._needsLayout = false;
  return layoutPerformed;
}
```

The file header (lines 6-8) further documents this design choice:

```
// CRITICAL Amp fidelity notes:
// - PipelineOwner has NO _nodesNeedingLayout list -- layouts from ROOT ONLY
// - flushLayout() only calls layout on the root render object
```

### 1.3 How `RenderBox.layout()` Cascades

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts` (lines 262-270), `layout()` gates execution on constraint changes or dirty state:

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

The early-return on line 266 (`if (!this._needsLayout && !constraintsChanged) return`) provides partial protection: when a parent re-layouts but the constraints it passes to a child are unchanged and that child is not dirty, the child's `performLayout()` is skipped. However, this optimization only helps when constraints flow downward unchanged. It does nothing for the upward propagation problem.

### 1.4 The `performLayout()` Cascade in Practice

Consider a render tree for a typical TUI screen:

```
RootRenderBox                        (terminal: 120x40)
  RenderFlex (Column)                (120x40)
    RenderPadding                    (120x3)   -- header
      RenderText                     (116x1)
    RenderFlex (Column)              (120x35)  -- main content
      RenderConstrainedBox           (120x1)   -- toolbar
        RenderFlex (Row)
          RenderText                 (20x1)
          RenderText                 (30x1)
      RenderFlex (Column)            (120x34)  -- body
        RenderPadding                (120x30)
          RenderFlex (Column)
            RenderText               (100x1)   <-- THIS changes
            RenderText               (100x1)
        RenderConstrainedBox         (120x4)   -- status bar
          RenderText                 (50x1)
    RenderPadding                    (120x2)   -- footer
      RenderText                     (116x1)
```

When the deeply nested `RenderText` (marked with `<-- THIS changes`) has its content updated:

1. `markNeedsLayout()` is called on the `RenderText` (depth 6).
2. It propagates upward through RenderFlex, RenderPadding, RenderFlex, RenderFlex, and the Root -- **6 nodes** all get `_needsLayout = true`.
3. `flushLayout()` calls `layout()` on the root, which runs `performLayout()` on it.
4. The root's `performLayout()` calls `child.layout(constraints)` on its children.
5. Each child is dirty (because of the upward propagation), so it must run `performLayout()` and lay out its own children.
6. **Every single node in the tree runs `performLayout()`**, even though only the text changed.

In contrast, if the header `RenderPadding` were a relayout boundary, the propagation from the body area would stop at the body's boundary and would never dirty the header, toolbar, or footer subtrees.

### 1.5 The Frame Pipeline Integration

From `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts` (lines 295-306), the layout callback is wired into the FrameScheduler's LAYOUT phase:

```typescript
this.frameScheduler.addFrameCallback(
  'layout',
  () => {
    this.updateRootConstraints(this._renderViewSize);
    if (this.pipelineOwner.flushLayout()) {
      this._shouldPaintCurrentFrame = true;
    }
  },
  'layout',
  0,
  'PipelineOwner.flushLayout',
);
```

The `updateRootConstraints()` call (pipeline-owner.ts lines 81-98) also invokes `markNeedsLayout()` on the root when the terminal is resized, which is correct and would not be affected by RelayoutBoundary.

### 1.6 The `requestLayout()` Entry Point

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts` (lines 59-63):

```typescript
requestLayout(): void {
  this._needsLayout = true;
  // In full implementation, calls c9.instance.requestFrame()
}
```

In the Amp reference (`.reference/render-tree.md` lines 398-404), `requestLayout()` also calls `c9.instance.requestFrame()` directly. The current implementation omits this because the frame scheduling is handled by the binding's wiring. A `_nodesNeedingLayout` list would change how `requestLayout()` works.

---

## 2. The Problem

Every `markNeedsLayout()` call walks the entire ancestor chain up to root, setting `_needsLayout = true` on every node along the way. This means:

1. **Full-tree traversal on every layout invalidation**: If a leaf node changes, every ancestor is dirtied.
2. **Every `performLayout()` re-executes during `flushLayout()`**: Because all ancestors are dirty, the top-down layout pass visits every node in the tree, not just the subtree that actually changed.
3. **O(N) layout cost per frame regardless of change scope**: A single character edit in a text widget causes the same layout work as a full terminal resize.
4. **No incremental layout**: Without boundaries, there is no way to confine layout work to a subtree, even when the parent's size cannot possibly change (e.g., tight constraints from a `SizedBox`).

For small TUI trees (20-50 nodes), this is acceptable. But as flitter is used for more complex UIs -- chat views with hundreds of messages, tables with many cells, nested scroll views -- the O(N) per-frame layout cost becomes a bottleneck, especially at 60fps where the frame budget is 16.67ms.

---

## 3. Proposed Solution: RelayoutBoundary

### 3.1 Concept

A **relayout boundary** is a render object that absorbs `markNeedsLayout()` propagation. When a descendant calls `markNeedsLayout()`, instead of propagating all the way to the root, the dirty flag stops at the nearest relayout boundary ancestor. The boundary is then added to `PipelineOwner._nodesNeedingLayout`, and during `flushLayout()`, layout restarts from each boundary independently.

A node is a relayout boundary when it satisfies certain conditions indicating that its parent's layout cannot be affected by changes in the node's subtree. The primary condition is **tight constraints**: if a parent gives a child tight constraints (minWidth == maxWidth AND minHeight == maxHeight), the child's size is fully determined by those constraints regardless of the child's content. Therefore, changes within that child's subtree cannot affect the parent's layout, making the child a natural relayout boundary.

### 3.2 RenderObject Changes

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`**

#### 3.2.1 New Fields on `RenderObject`

Add a `_relayoutBoundary` field that each node uses to identify which ancestor (or itself) is its relayout boundary:

```typescript
export abstract class RenderObject {
  parent: RenderObject | null = null;
  parentData: ParentData | null = null;

  protected _needsLayout: boolean = true;
  protected _needsPaint: boolean = true;
  private _owner: PipelineOwner | null = null;
  private _attached: boolean = false;

  // NEW: relayout boundary tracking
  // Points to the nearest ancestor (or self) that is a relayout boundary.
  // When null, means not yet computed or not in tree.
  protected _relayoutBoundary: RenderObject | null = null;

  get relayoutBoundary(): RenderObject | null {
    return this._relayoutBoundary;
  }
  // ...
}
```

#### 3.2.2 New `sizedByParent` Property on `RenderBox`

Add the `sizedByParent` getter to `RenderBox`. Nodes that declare `sizedByParent = true` determine their size solely from constraints, making them always a relayout boundary. In practice, this is useful for `RenderConstrainedBox` with tight constraints:

```typescript
export abstract class RenderBox extends RenderObject {
  // ...

  /**
   * Whether this render box sizes itself based only on the incoming
   * constraints, independent of its children.
   *
   * When true, this node is always a relayout boundary because
   * changes in its subtree cannot alter its own size.
   *
   * Default is false. Subclasses may override.
   */
  get sizedByParent(): boolean {
    return false;
  }

  // ...
}
```

#### 3.2.3 Modified `markNeedsLayout()`

Replace the unconditional parent propagation with boundary-aware propagation:

```typescript
markNeedsLayout(): void {
  if (this._needsLayout) return;       // already dirty, stop
  if (!this._attached) {
    this._needsLayout = true;
    return;
  }
  this._needsLayout = true;

  if (this._relayoutBoundary === this) {
    // This node IS a relayout boundary -- stop propagation here,
    // add self to PipelineOwner's layout list.
    this._owner?.requestLayoutFor(this);
  } else if (this._relayoutBoundary !== null) {
    // Propagate up, but mark intermediate nodes dirty.
    // Continue until we hit the relayout boundary.
    this.parent?.markNeedsLayout();
  } else {
    // No relayout boundary known (detached or root).
    // Fall back to propagating to root.
    if (this.parent) {
      this.parent.markNeedsLayout();
    } else {
      this._owner?.requestLayoutFor(this);
    }
  }
}
```

**Simplified alternative** (closer to Flutter): just propagate up until `_relayoutBoundary === this`:

```typescript
markNeedsLayout(): void {
  if (this._needsLayout) return;
  if (!this._attached) {
    this._needsLayout = true;
    return;
  }
  this._needsLayout = true;

  if (this._relayoutBoundary !== this) {
    // Not a boundary -- propagate to parent.
    this.parent?.markNeedsLayout();
  } else {
    // Boundary reached -- register with PipelineOwner.
    this._owner?.addNodeNeedingLayout(this);
  }
}
```

#### 3.2.4 Modified `layout()` on `RenderBox`

The `layout()` method must now compute and assign `_relayoutBoundary` based on the `parentUsesSize` parameter and the constraint tightness:

```typescript
layout(constraints: BoxConstraints, { parentUsesSize = true }: { parentUsesSize?: boolean } = {}): void {
  // Determine if this node is a relayout boundary.
  // A node is a boundary if:
  //   1. It is the root (no parent), OR
  //   2. sizedByParent is true, OR
  //   3. constraints are tight (minWidth==maxWidth && minHeight==maxHeight), OR
  //   4. parentUsesSize is false
  const isRelayoutBoundary =
    !this.parent ||
    this.sizedByParent ||
    constraints.isTight ||
    !parentUsesSize;

  const newBoundary = isRelayoutBoundary ? this : (this.parent as RenderBox)?._relayoutBoundary ?? null;

  const constraintsChanged =
    !this._lastConstraints || !constraints.equals(this._lastConstraints);
  const boundaryChanged = this._relayoutBoundary !== newBoundary;

  if (!this._needsLayout && !constraintsChanged && !boundaryChanged) return;

  this._lastConstraints = constraints;
  this._relayoutBoundary = newBoundary;

  if (this.sizedByParent && constraintsChanged) {
    this.performResize();
  }

  this._needsLayout = false;
  this.performLayout();

  // If the boundary changed for this node, all descendants need their
  // boundary reference updated. This happens naturally during the
  // recursive performLayout() -> child.layout() calls.
}
```

**Note on `parentUsesSize`**: This is the main mechanism Flutter uses. It can be introduced as an optional parameter with a default of `true` to maintain backward compatibility. Widgets like `SizedBox` that ignore their child's size can pass `parentUsesSize: false`, causing the child to become a boundary.

However, for pragmatic reasons and to minimize the scope of this change, the implementation can initially rely only on **tight constraints** (condition 3) as the boundary trigger, since this is the most common case in TUI layouts. The `parentUsesSize` parameter can be added later.

#### 3.2.5 New `performResize()` Method

When `sizedByParent` is true, size is computed in a separate `performResize()` step before `performLayout()`:

```typescript
export abstract class RenderBox extends RenderObject {
  // ...

  /**
   * Called when sizedByParent is true and constraints have changed.
   * Must set this.size based only on this.constraints.
   * Default implementation sets size to constraints.smallest.
   */
  performResize(): void {
    this.size = this.constraints!.smallest;
  }

  // ...
}
```

### 3.3 PipelineOwner Changes

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts`**

#### 3.3.1 Add `_nodesNeedingLayout` List

Replace the simple boolean `_needsLayout` flag with a proper sorted node list:

```typescript
export class PipelineOwner {
  private _rootRenderObject: RenderBox | null = null;
  private _rootConstraints: BoxConstraints | null = null;
  private _nodesNeedingPaint: Set<RenderObject> = new Set();

  // NEW: list of relayout boundary nodes that need layout
  private _nodesNeedingLayout: RenderObject[] = [];

  /**
   * Add a node to the layout queue.
   * Called by RenderObject.markNeedsLayout() when a relayout boundary is reached.
   */
  addNodeNeedingLayout(node: RenderObject): void {
    this._nodesNeedingLayout.push(node);
  }
  // ...
}
```

#### 3.3.2 Modified `flushLayout()`

Instead of only laying out from the root, process all dirty boundary nodes in depth order:

```typescript
flushLayout(): boolean {
  if (this._nodesNeedingLayout.length === 0) return false;

  // Sort by depth (shallow first) so parents are laid out before children.
  // This prevents redundant layout when a parent and child are both dirty.
  this._nodesNeedingLayout.sort((a, b) => a.depth - b.depth);

  let layoutPerformed = false;

  while (this._nodesNeedingLayout.length > 0) {
    // Take a snapshot and clear -- layout may add new dirty nodes.
    const dirtyNodes = this._nodesNeedingLayout.splice(0);

    for (const node of dirtyNodes) {
      if (node.needsLayout && node.attached) {
        // For the root, use rootConstraints; for others, use their cached constraints.
        if (node === this._rootRenderObject && this._rootConstraints) {
          (node as RenderBox).layout(this._rootConstraints);
        } else if (node instanceof RenderBox && node.constraints) {
          node.layout(node.constraints);
        }
        layoutPerformed = true;
      }
    }
  }

  return layoutPerformed;
}
```

The depth-first ordering ensures that when both a parent boundary and a child boundary are dirty, the parent processes first. If the parent's layout clears the child's dirty flag (because `layout()` is called on the child during `performLayout()`), the child is skipped during its turn.

#### 3.3.3 Add `depth` Property to `RenderObject`

Add a `depth` property (cached, invalidated on tree changes) for the sort in `flushLayout()`. This is already present in the Amp reference (`n_._cachedDepth` on reference line 63-72):

```typescript
// In RenderObject
private _cachedDepth: number | undefined;

get depth(): number {
  if (this._cachedDepth !== undefined) return this._cachedDepth;
  let d = 0;
  let current = this.parent;
  while (current) {
    d++;
    current = current.parent;
  }
  this._cachedDepth = d;
  return d;
}

private _invalidateDepth(): void {
  this._cachedDepth = undefined;
  this.visitChildren((child) => {
    if (child instanceof RenderObject) {
      (child as RenderObject)._invalidateDepth();
    }
  });
}
```

### 3.4 Identifying Natural Relayout Boundaries

In the current codebase, the following render objects naturally receive tight constraints and would automatically become relayout boundaries:

| Widget / RenderObject | File | Reason |
|---|---|---|
| `RenderConstrainedBox` (SizedBox with exact width+height) | `render-constrained.ts` line 64 | When both dimensions are specified, parent passes `BoxConstraints.tight(Size(w,h))` |
| `RenderFlex` children with `flex > 0` and `fit = 'tight'` | `render-flex.ts` lines 356-390 | Expanded children get tight constraints along the main axis |
| Root render object | `pipeline-owner.ts` line 133 | Always a boundary since it has no parent |
| Any child receiving `stretch` cross-axis + tight main axis | `render-flex.ts` lines 359-367 | Both axes are tight |

### 3.5 The `parentUsesSize` Extension (Phase 2)

In a second phase, `parentUsesSize` can be added to `layout()` as an optional parameter. This allows parents to explicitly declare that they do not depend on their child's size. The primary beneficiary is any parent that gives a child constraints and then ignores the child's resulting size:

```typescript
// Example: a viewport that clips content to a fixed region
child.layout(innerConstraints, { parentUsesSize: false });
// The viewport's own size is determined by constraints alone, not by child size.
```

When `parentUsesSize: false`, the child becomes a relayout boundary regardless of constraint tightness. This is a powerful optimization for scroll views and similar containers.

---

## 4. `markNeedsLayout` Propagation Chain: Before vs After

### 4.1 Before (Current)

```
Leaf.markNeedsLayout()
  -> Leaf._needsLayout = true
  -> Leaf.parent.markNeedsLayout()    [Parent1]
    -> Parent1._needsLayout = true
    -> Parent1.parent.markNeedsLayout()  [Parent2]
      -> Parent2._needsLayout = true
      -> Parent2.parent.markNeedsLayout()  [Root]
        -> Root._needsLayout = true
        -> Root._owner.requestLayout()    --> PipelineOwner sets boolean flag
```

During flushLayout:
```
Root.layout(rootConstraints)
  -> Root.performLayout()
    -> Parent2.layout(constraints)
      -> Parent2.performLayout()          <-- WASTEFUL if constraints unchanged
        -> Parent1.layout(constraints)
          -> Parent1.performLayout()      <-- WASTEFUL if constraints unchanged
            -> Leaf.layout(constraints)
              -> Leaf.performLayout()     <-- ACTUAL WORK
```

**Result**: 4 `performLayout()` calls for 1 dirty leaf.

### 4.2 After (With RelayoutBoundary)

Assume `Parent2` receives tight constraints from Root (making `Parent2` a relayout boundary):

```
Leaf.markNeedsLayout()
  -> Leaf._needsLayout = true
  -> Leaf.parent.markNeedsLayout()    [Parent1]
    -> Parent1._needsLayout = true
    -> Parent1.parent.markNeedsLayout()  [Parent2]
      -> Parent2._needsLayout = true
      -> Parent2._relayoutBoundary === Parent2  --> STOP
      -> PipelineOwner.addNodeNeedingLayout(Parent2)
```

During flushLayout:
```
Parent2.layout(cachedConstraints)
  -> Parent2.performLayout()
    -> Parent1.layout(constraints)
      -> Parent1.performLayout()
        -> Leaf.layout(constraints)
          -> Leaf.performLayout()     <-- ACTUAL WORK
```

**Result**: 3 `performLayout()` calls, and crucially, Root's `performLayout()` is NOT called. The header, footer, and toolbar subtrees are completely untouched.

---

## 5. The `_nodesNeedingLayout` List: Detailed Design

### 5.1 Data Structure

```typescript
private _nodesNeedingLayout: RenderObject[] = [];
```

An array is used (matching Flutter) rather than a Set because:
- It needs to be sorted by depth before processing.
- Nodes are naturally added at most once (the `_needsLayout` guard in `markNeedsLayout` prevents duplicates).
- Array splice is efficient for the expected list sizes (typically 1-5 entries per frame).

### 5.2 Lifecycle

1. **Node added**: When `markNeedsLayout()` reaches a relayout boundary, it calls `this._owner.addNodeNeedingLayout(this)`.
2. **Frame requested**: `addNodeNeedingLayout()` also calls `requestFrame()` on the FrameScheduler (matching Amp's `requestLayout` behavior).
3. **Sorted**: In `flushLayout()`, nodes are sorted by depth ascending.
4. **Processed**: Each node has `layout(cachedConstraints)` called.
5. **Cleared**: The array is spliced to empty before processing (allowing re-entrant additions).
6. **Guard**: Inside the processing loop, nodes that are no longer dirty (because a parent's layout already re-laid them) are skipped.

### 5.3 Interaction with `requestLayout()`

The current `requestLayout()` (pipeline-owner.ts line 59) sets a boolean flag. With the new design:

```typescript
addNodeNeedingLayout(node: RenderObject): void {
  this._nodesNeedingLayout.push(node);
  // Request a frame from the scheduler.
  // This replaces the old requestLayout() boolean flag.
}
```

The old `requestLayout()` method is kept for backward compatibility but now delegates to `addNodeNeedingLayout`:

```typescript
requestLayout(): void {
  // Called by root node's markNeedsLayout when root is the boundary.
  if (this._rootRenderObject) {
    this.addNodeNeedingLayout(this._rootRenderObject);
  }
}
```

### 5.4 `hasNodesNeedingLayout` Update

```typescript
get hasNodesNeedingLayout(): boolean {
  return this._nodesNeedingLayout.length > 0;
}
```

---

## 6. Backward Compatibility

This proposal is designed to be backward-compatible:

1. **Default behavior unchanged**: Without tight constraints or `sizedByParent`, every node's `_relayoutBoundary` points to the root. The propagation chain is the same as today. The root is always added to `_nodesNeedingLayout`, and `flushLayout()` processes it identically.

2. **`layout()` signature**: The `parentUsesSize` parameter is optional with a default of `true`, meaning existing callers that pass only constraints continue to work unchanged.

3. **`sizedByParent` default is `false`**: No existing render object behavior changes unless it opts in.

4. **Tight constraints already exist**: Many render objects in the tree already receive tight constraints from parents like `SizedBox` and `Expanded(fit: tight)`. These nodes automatically become boundaries with zero code changes in those widgets.

5. **Existing tests pass**: Since the default boundary is the root (when constraints are not tight), the depth-sorted `_nodesNeedingLayout` list produces the same layout results as the current root-only approach. Tests that verify layout correctness continue to pass.

---

## 7. Testing Strategy

### 7.1 Unit Tests: `RenderObject.markNeedsLayout()` Boundary Propagation

**File**: `src/framework/__tests__/relayout-boundary.test.ts`

```
Test 1: markNeedsLayout stops at relayout boundary
  - Create a tree: root -> boundary (tight constraints) -> child -> leaf
  - Layout the tree so all nodes are clean
  - Call leaf.markNeedsLayout()
  - Assert: leaf._needsLayout === true
  - Assert: child._needsLayout === true
  - Assert: boundary._needsLayout === true
  - Assert: root._needsLayout === false  <-- KEY: boundary stopped propagation

Test 2: markNeedsLayout propagates to root when no boundary
  - Create a tree: root -> parent (loose constraints) -> child
  - Layout the tree
  - Call child.markNeedsLayout()
  - Assert: root._needsLayout === true  (same as current behavior)

Test 3: root is always a relayout boundary
  - Create a standalone root render box
  - Lay it out
  - Assert: root._relayoutBoundary === root

Test 4: tight constraints create a boundary
  - Create: root -> sizedBox(tight 10x10) -> child
  - Layout from root
  - Assert: sizedBox._relayoutBoundary === sizedBox
  - Assert: child._relayoutBoundary === sizedBox

Test 5: loose constraints do not create a boundary
  - Create: root -> parent (loose constraints) -> child
  - Layout from root
  - Assert: parent._relayoutBoundary === root
  - Assert: child._relayoutBoundary === root

Test 6: boundary changes when constraints change
  - Layout child with tight constraints -> boundary is child
  - Re-layout child with loose constraints -> boundary reverts to root
  - Assert _relayoutBoundary is updated correctly
```

### 7.2 Unit Tests: `PipelineOwner._nodesNeedingLayout` List

**File**: `src/framework/__tests__/pipeline-owner-layout-list.test.ts`

```
Test 7: flushLayout processes nodes in depth order
  - Add two boundary nodes at different depths to _nodesNeedingLayout
  - Call flushLayout()
  - Assert: shallower node is processed first

Test 8: flushLayout skips nodes cleaned by parent layout
  - Add a parent boundary and a child boundary (child is descendant of parent)
  - Call flushLayout()
  - Parent's performLayout re-layouts child (cleaning it)
  - Assert: child's performLayout is called only once (via parent), not twice

Test 9: flushLayout handles re-entrant additions
  - A node's performLayout marks a sibling as needing layout
  - Assert: the sibling is processed in a second pass of the while loop

Test 10: addNodeNeedingLayout triggers frame request
  - Add a node
  - Assert: requestFrame() was called

Test 11: empty list means no layout work
  - flushLayout() with empty list returns false
```

### 7.3 Integration Tests: Full Pipeline with Boundaries

**File**: `src/framework/__tests__/relayout-boundary-integration.test.ts`

```
Test 12: SizedBox with tight constraints creates boundary
  - Build: Column -> SizedBox(width:80, height:10) -> Text("hello")
  - Pump a frame (full build+layout+paint)
  - Update text to "world"
  - Pump a frame
  - Assert: Column's performLayout is NOT called on the second frame
  - Assert: SizedBox's performLayout IS called

Test 13: Expanded(fit: tight) creates boundary
  - Build: Row -> Expanded(child: Text("a")) -> Expanded(child: Text("b"))
  - Pump a frame
  - Update text "a" to "abc"
  - Pump a frame
  - Assert: the other Expanded's subtree is not re-laid-out

Test 14: Full pipeline: boundary prevents cascade
  - Build a deep tree with multiple boundary nodes
  - Count performLayout calls during initial layout
  - Mutate a deeply nested leaf
  - Count performLayout calls during second layout
  - Assert: second count << first count

Test 15: Resize still relayouts entire tree
  - Build tree with boundaries
  - Resize terminal (changes root constraints)
  - Assert: all nodes are re-laid-out (resize invalidates root boundary)
```

### 7.4 Performance Benchmarks

```
Benchmark 1: Layout time with N nodes, 1 dirty leaf
  - Without boundaries: O(N) -- all nodes re-layout
  - With boundaries: O(K) where K = subtree size under boundary

Benchmark 2: Frame time for chat UI with 100 messages
  - Measure time to process new message append
  - Without boundaries: re-layout all 100+ message render objects
  - With boundaries: re-layout only the new message + scroll container
```

### 7.5 Regression Tests

```
Test 16: Existing render-object.test.ts passes unchanged
  - All current markNeedsLayout tests continue to pass
  - All current layout tests continue to pass
  - The default behavior (no tight constraints) produces identical results

Test 17: render-flex.test.ts passes unchanged
  - Flex layout results are identical

Test 18: render-constrained.test.ts passes unchanged
  - Constrained box layout results are identical
```

---

## 8. Implementation Plan

### Phase 1: Core Infrastructure (Minimal Viable)
1. Add `_relayoutBoundary` field to `RenderObject`
2. Add `depth` property with caching to `RenderObject`
3. Add `_nodesNeedingLayout` array to `PipelineOwner`
4. Modify `flushLayout()` to process the sorted node list
5. Modify `markNeedsLayout()` to stop at boundaries
6. Modify `RenderBox.layout()` to compute boundary from tight constraints
7. Update `hasNodesNeedingLayout` to check the list length

### Phase 2: Opt-in Extensions
1. Add `sizedByParent` getter to `RenderBox` (default `false`)
2. Add `performResize()` to `RenderBox`
3. Override `sizedByParent` in `RenderConstrainedBox` when constraints are tight
4. Add optional `parentUsesSize` parameter to `layout()`

### Phase 3: Widget-Level Integration
1. Update `RenderConstrainedBox.layout()` to detect tight constraints
2. Update `RenderFlex.performLayout()` to pass tight constraints to flex children
3. Identify and annotate other natural boundary points in the widget catalog

### Phase 4: Validation
1. Run all existing tests
2. Run new boundary-specific tests
3. Benchmark layout times on complex UIs
4. Profile frame times with perf overlay

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect boundary computation causes layout bugs (size not updating when it should) | High -- visual glitches | Conservative approach: only tight constraints trigger boundaries initially. Extensive regression tests. |
| `_nodesNeedingLayout` sorting overhead | Low -- list is typically 1-5 items | Array.sort on tiny arrays is negligible. Use insertion sort for N < 8. |
| Boundary reference stale after tree restructuring | Medium -- could cause missed layouts | Clear `_relayoutBoundary` in `detach()` and recompute in `layout()`. |
| `depth` caching invalidation cost | Low -- only on tree mutations | Already present in Amp reference. Cache invalidation is recursive but only runs during `adoptChild`/`dropChild`. |
| Behavioral divergence from Amp reference | Medium -- violates fidelity mandate | This is an intentional enhancement beyond Amp. Document clearly in CLAUDE.md as a justified deviation. Ensure default behavior (without boundaries) matches Amp exactly. |

---

## 10. Relationship to Other Gaps and the Amp Reference

The Amp reference (`.reference/render-tree.md` line 180) explicitly documents the absence:

> **No RelayoutBoundary**: Unlike Flutter, `markNeedsLayout()` always walks to the root. There is no `_relayoutBoundary` field or `sizedByParent` optimization.

And the analysis (`.gap/../amp-src-analysis-3.md` line 57) rationalizes it:

> This is acceptable for a TUI where the widget tree is typically shallow (tens of nodes, not thousands), but would be prohibitively expensive in a GUI framework.

This proposal acknowledges the Amp fidelity constraint and proposes RelayoutBoundary as an **opt-in enhancement** that preserves default Amp behavior while enabling optimization for larger UIs. The key design principle is: **without tight constraints in the tree, behavior is identical to Amp**.
