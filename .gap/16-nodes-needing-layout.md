# Gap R06: Add `_nodesNeedingLayout` List to PipelineOwner for Incremental Re-Layout

## Status: Proposal
## Affected packages: `flitter-core`
## Prerequisites: Gap R01 (RelayoutBoundary) must be implemented first for full benefit; standalone value exists for diagnostics and API parity

---

## 1. Current Pipeline Analysis

### 1.1 Root-Only Layout Strategy

The file `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts` implements `PipelineOwner` (Amp ref: UB0) with a simple boolean `_needsLayout` flag and a root-only `flushLayout()` method. The file header comments on lines 6-8 make this design choice explicit:

```
// CRITICAL Amp fidelity notes:
// - PipelineOwner has NO _nodesNeedingLayout list -- layouts from ROOT ONLY
// - flushLayout() only calls layout on the root render object
```

The `flushLayout()` method (lines 126-138) checks three conditions and, if all are met, calls `layout()` on the root:

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

This means that every single frame where layout is needed starts from the root and cascades through the entire render tree, regardless of which node actually changed.

### 1.2 The `markNeedsLayout()` Upward Propagation

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts` (lines 145-160), `markNeedsLayout()` unconditionally propagates upward through every ancestor until it reaches the root:

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

The consequence is clear: any leaf node change marks every ancestor dirty, and `flushLayout()` starts from the root, causing `performLayout()` to execute on every dirty node in the tree.

### 1.3 The `requestLayout()` Boolean Flag

When propagation reaches the root, `requestLayout()` on PipelineOwner (lines 59-63) sets a simple boolean flag:

```typescript
requestLayout(): void {
  this._needsLayout = true;
  // In full implementation, calls c9.instance.requestFrame()
}
```

This flag feeds into `beginFrame()` in `WidgetsBinding` (binding.ts lines 527-536) to determine whether the current frame should paint:

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

### 1.4 The `hasNodesNeedingLayout` Query

The `hasNodesNeedingLayout` getter (pipeline-owner.ts lines 163-167) checks the root render object's dirty flag directly:

```typescript
get hasNodesNeedingLayout(): boolean {
  return Boolean(
    this._rootRenderObject && this._rootRenderObject.needsLayout,
  );
}
```

This is correct for the current root-only model but provides zero diagnostic value -- there is no way to know *how many* or *which* nodes need layout.

### 1.5 Asymmetry with the Paint Dirty List

The PipelineOwner already maintains a proper dirty list for paint: `_nodesNeedingPaint: Set<RenderObject>` (line 32). The `requestPaint()` method (lines 69-75) adds nodes to this set, and `flushPaint()` (lines 146-157) iterates and clears it. The fact that paint has an explicit dirty list while layout uses a boolean flag is the core asymmetry this gap addresses.

### 1.6 The Frame Pipeline Integration

The layout callback is wired into the FrameScheduler's LAYOUT phase in `WidgetsBinding` (binding.ts lines 295-306):

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

The synchronous test helper `drawFrameSync()` (binding.ts lines 682-708) reproduces the same pipeline: BUILD -> LAYOUT -> PAINT -> RENDER.

### 1.7 How `RenderBox.layout()` Cascades Downward

In `render-object.ts` (lines 262-270), the `layout()` method gates execution on constraint changes or dirty state:

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

The early-return on line 266 provides partial protection: when a parent re-layouts but passes unchanged constraints to a clean child, the child's `performLayout()` is skipped. However, this optimization is defeated by the upward propagation in `markNeedsLayout()`, which marks every ancestor dirty.

---

## 2. The Problem

### 2.1 Full-Tree Layout on Every Invalidation

When a deeply nested leaf node's content changes, the following chain executes:

```
Leaf.markNeedsLayout()
  -> Leaf._needsLayout = true
  -> Parent1.markNeedsLayout()
    -> Parent1._needsLayout = true
    -> Parent2.markNeedsLayout()
      -> Parent2._needsLayout = true
      -> ... (all ancestors)
        -> Root._needsLayout = true
        -> Root._owner.requestLayout()  --> sets boolean flag
```

During `flushLayout()`:
```
Root.layout(rootConstraints)
  -> Root.performLayout()
    -> Parent2.layout(constraints)
      -> Parent2.performLayout()         <-- WASTEFUL if constraints unchanged
        -> Parent1.layout(constraints)
          -> Parent1.performLayout()     <-- WASTEFUL if constraints unchanged
            -> Leaf.layout(constraints)
              -> Leaf.performLayout()    <-- ACTUAL WORK
```

Every node in the ancestor chain runs `performLayout()`, even when its constraints have not changed and its other children are clean. This is O(N) work for a single dirty leaf.

### 2.2 No Tracking of Specific Dirty Nodes

The boolean `_needsLayout` flag and root-check `hasNodesNeedingLayout` provide only a binary "yes/no" answer. There is no list of *which* nodes need layout, *how many* are dirty, or *at what depth* they sit. This prevents:

1. **Incremental re-layout**: Without a list, `flushLayout()` cannot start layout from individual dirty subtree roots.
2. **Diagnostic visibility**: No way to inspect which nodes are awaiting layout in a given frame.
3. **Optimization**: No path to skip subtrees that are not affected by a change.

### 2.3 Co-Dependency with Gap R01 (RelayoutBoundary)

Without RelayoutBoundary, every `markNeedsLayout()` propagates to the root, so the list would always contain exactly one entry: the root. The list becomes meaningfully useful only when RelayoutBoundary stops propagation at intermediate nodes, which then register themselves in the list.

However, `_nodesNeedingLayout` is a **prerequisite** for RelayoutBoundary: when a boundary node stops propagation, it needs somewhere to register itself. The two gaps are co-dependent:

- Gap R01 needs `_nodesNeedingLayout` to register boundary nodes.
- Gap R06 needs Gap R01 to produce multiple entries in the list.

Implementing `_nodesNeedingLayout` first establishes the infrastructure that Gap R01 will consume.

### 2.4 Performance Impact

| UI Complexity | Render Nodes | Layout Cost (root-only) | Layout Cost (with list + boundaries) |
|---|---|---|---|
| Simple prompt | 5-10 | ~10 performLayout() | ~10 (same) |
| Chat with 50 messages | 100-200 | ~200 performLayout() | ~5-10 |
| Table with 100 rows | 300-500 | ~500 performLayout() | ~5-20 |
| Complex IDE-like UI | 500-1000 | ~1000 performLayout() | ~20-50 |

---

## 3. Proposed `_nodesNeedingLayout` Design

### 3.1 Data Structure Choice: Array vs Set

The `_nodesNeedingLayout` list uses an `Array<RenderObject>` rather than a `Set`:

- **Array** is chosen because the list needs to be **sorted by depth** before processing. Sets have no ordering guarantee and would need to be converted to an array for sorting anyway.
- **Deduplication** is handled naturally by the `_needsLayout` guard in `markNeedsLayout()`: a node that is already dirty returns early and never re-adds itself to the list.
- For the expected list sizes (1-5 entries in typical frames, at most 10-20 in pathological cases), array operations are negligible.

This contrasts with `_nodesNeedingPaint` which uses a `Set` because paint processing does not require depth ordering, and Set provides O(1) `has()` checks for deduplication.

### 3.2 New Field on PipelineOwner

Replace the boolean `_needsLayout` flag with an array:

```typescript
export class PipelineOwner {
  private _rootRenderObject: RenderBox | null = null;
  private _rootConstraints: BoxConstraints | null = null;
  private _nodesNeedingPaint: Set<RenderObject> = new Set();

  // NEW: replaces boolean _needsLayout flag.
  // Tracks relayout boundary nodes (or root) that need layout.
  // Processed in depth-ascending order by flushLayout().
  private _nodesNeedingLayout: RenderObject[] = [];

  // ...
}
```

### 3.3 New `addNodeNeedingLayout()` Method

```typescript
/**
 * Register a node for layout in the next flushLayout() pass.
 * Called by RenderObject.markNeedsLayout() when propagation reaches
 * a relayout boundary (or the root).
 *
 * Duplicates are prevented by the _needsLayout guard in
 * markNeedsLayout() -- a node that is already dirty will not
 * propagate again, so it will not call this method twice.
 *
 * Amp ref: Not present in UB0 (Amp has no _nodesNeedingLayout).
 * Flutter ref: PipelineOwner._nodesNeedingLayout.add(node)
 */
addNodeNeedingLayout(node: RenderObject): void {
  this._nodesNeedingLayout.push(node);
}
```

### 3.4 Modified `requestLayout()`

The existing `requestLayout()` is kept for backward compatibility. It now delegates to `addNodeNeedingLayout()` using the root render object:

```typescript
/**
 * Called by the root RenderObject's markNeedsLayout() when the
 * root is the relayout boundary (which it always is).
 *
 * Backward compatible: existing code that calls requestLayout()
 * without a node argument adds the root to the layout list.
 *
 * Amp ref: UB0.requestLayout(g) -- just triggers frame request.
 * Enhanced: now also registers root in _nodesNeedingLayout.
 */
requestLayout(): void {
  if (this._rootRenderObject) {
    this.addNodeNeedingLayout(this._rootRenderObject);
  }
}
```

### 3.5 New `requestLayoutFor()` Method

An additional method accepts a specific node for use by RelayoutBoundary (Gap R01):

```typescript
/**
 * Register a specific node for layout.
 * Used by markNeedsLayout() when a relayout boundary is reached
 * that is not the root.
 */
requestLayoutFor(node: RenderObject): void {
  this.addNodeNeedingLayout(node);
}
```

### 3.6 Depth Computation Helper

A private helper computes depth by walking the parent chain. When Gap R01 adds a cached `depth` property to `RenderObject`, this can be replaced:

```typescript
/**
 * Compute the depth of a node by counting ancestors.
 * Returns 0 for the root, 1 for root's direct child, etc.
 *
 * Once RenderObject has a cached _depth property (Gap R01),
 * this method should delegate to node.depth.
 */
private _getDepth(node: RenderObject): number {
  let depth = 0;
  let current = node.parent;
  while (current !== null) {
    depth++;
    current = current.parent;
  }
  return depth;
}
```

### 3.7 Modified `flushLayout()` -- Depth-Ordered Processing

This is the heart of the change. Instead of a single `root.layout(constraints)` call, process all registered nodes in depth order with a while loop for re-entrant additions:

```typescript
/**
 * Process all dirty layout nodes in depth-ascending order.
 *
 * Depth ordering ensures parents are laid out before children.
 * When a parent's performLayout() calls child.layout(), the child's
 * _needsLayout flag is cleared. If the child was also in the list,
 * it is skipped (the guard `if (!node.needsLayout || !node.attached)`
 * handles this).
 *
 * The while loop handles re-entrant additions: if a node's
 * performLayout() marks another node dirty (e.g., a sibling),
 * that new entry is processed in a subsequent iteration.
 *
 * Amp ref: UB0.flushLayout() -- root-only layout.
 * Flutter ref: PipelineOwner.flushLayout() -- depth-sorted list.
 */
flushLayout(): boolean {
  if (this._nodesNeedingLayout.length === 0) {
    return false;
  }

  let layoutPerformed = false;

  while (this._nodesNeedingLayout.length > 0) {
    // Sort by depth ascending (parents first).
    // For the common case of 1-3 entries, sort overhead is negligible.
    this._nodesNeedingLayout.sort(
      (a, b) => this._getDepth(a) - this._getDepth(b)
    );

    // Snapshot and clear -- performLayout may add new entries.
    const dirtyNodes = this._nodesNeedingLayout.splice(0);

    for (const node of dirtyNodes) {
      // Skip if already cleaned (a parent's layout handled this child)
      // or if detached from the tree.
      if (!node.needsLayout || !node.attached) {
        continue;
      }

      // Root gets rootConstraints; other nodes use their cached constraints.
      if (node === this._rootRenderObject && this._rootConstraints) {
        (node as RenderBox).layout(this._rootConstraints);
        layoutPerformed = true;
      } else if (node instanceof RenderBox) {
        const cached = node.constraints;
        if (cached) {
          node.layout(cached);
          layoutPerformed = true;
        }
      }
    }
  }

  return layoutPerformed;
}
```

### 3.8 Updated `hasNodesNeedingLayout`

```typescript
get hasNodesNeedingLayout(): boolean {
  return this._nodesNeedingLayout.length > 0;
}
```

### 3.9 New Diagnostic `nodesNeedingLayout` Getter

```typescript
/**
 * Return a snapshot of nodes awaiting layout.
 * Useful for diagnostics and testing.
 */
get nodesNeedingLayout(): ReadonlyArray<RenderObject> {
  return [...this._nodesNeedingLayout];
}
```

### 3.10 Updated `removeFromQueues()`

Extend to also remove from the layout queue:

```typescript
removeFromQueues(node: RenderObject): void {
  this._nodesNeedingPaint.delete(node);
  const layoutIdx = this._nodesNeedingLayout.indexOf(node);
  if (layoutIdx >= 0) {
    this._nodesNeedingLayout.splice(layoutIdx, 1);
  }
}
```

### 3.11 Updated `dispose()`

```typescript
dispose(): void {
  this._nodesNeedingPaint.clear();
  this._nodesNeedingLayout.length = 0;
  this._rootRenderObject = null;
  this._rootConstraints = null;
}
```

### 3.12 RenderObject Interface Update

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`, the forward-declared `PipelineOwner` interface (lines 34-37) needs the new method:

```typescript
export interface PipelineOwner {
  requestLayout(): void;
  requestLayoutFor?(node: RenderObject): void;  // NEW: for boundary registration
  requestPaint(): void;
}
```

The `requestLayoutFor` is marked optional with `?` to maintain backward compatibility.

---

## 4. Depth-Ordered Processing: Why and How

### 4.1 Why Parents Must Process Before Children

Consider a tree where both a parent boundary and a child boundary are in `_nodesNeedingLayout`:

```
Root (boundary, depth 0)
  ParentBoundary (boundary, depth 1, dirty)   <-- in list
    ChildBoundary (boundary, depth 2, dirty)  <-- in list
      Leaf
```

If `ChildBoundary` is processed first:
1. It calls `layout(cachedConstraints)` which runs `performLayout()`.
2. Then `ParentBoundary` is processed and its `performLayout()` calls `ChildBoundary.layout(constraints)` again.
3. In the worst case, the child is laid out **twice**.

By sorting depth-ascending and processing `ParentBoundary` first:
1. Its `performLayout()` lays out `ChildBoundary` as part of the normal cascade.
2. When we reach `ChildBoundary` in the list, its `_needsLayout` is already `false`.
3. The `if (!node.needsLayout)` guard causes it to be **skipped**. Zero redundant work.

### 4.2 The Sort Strategy

For the expected list size (1-5 entries in typical frames), `Array.sort()` is effectively free. JavaScript engines use InsertionSort for small arrays (V8 uses InsertionSort for N <= 10), which runs in O(n^2) worst case but is O(n) for nearly-sorted or tiny inputs.

If profiling ever shows sort overhead, the alternative is to maintain the list in sorted order using binary insertion at add time:

```typescript
addNodeNeedingLayout(node: RenderObject): void {
  const depth = this._getDepth(node);
  let lo = 0, hi = this._nodesNeedingLayout.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (this._getDepth(this._nodesNeedingLayout[mid]) <= depth) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  this._nodesNeedingLayout.splice(lo, 0, node);
}
```

This is the approach Flutter uses internally. For flitter, the simpler sort-before-processing approach is preferred until benchmarks indicate otherwise.

### 4.3 Re-Entrant Additions During `flushLayout()`

A node's `performLayout()` may call `markNeedsLayout()` on a sibling or unrelated subtree, adding new entries to `_nodesNeedingLayout` during iteration. The `while (this._nodesNeedingLayout.length > 0)` loop with `splice(0)` snapshot handles this:

```
Iteration 1:
  dirtyNodes = [ParentBoundary, ChildBoundary]   (sorted)
  Process ParentBoundary -> its performLayout() marks SiblingBoundary dirty
  SiblingBoundary added to _nodesNeedingLayout (now non-empty)
  Process ChildBoundary -> skipped (already clean from parent's layout)

Iteration 2:
  dirtyNodes = [SiblingBoundary]
  Process SiblingBoundary -> layout runs, cleans it
  _nodesNeedingLayout now empty -> exit while loop
```

Infinite loops are prevented because each `markNeedsLayout()` call checks `if (this._needsLayout) return` -- a node that is already dirty does not re-add itself.

### 4.4 Deduplication Guarantee

The `_needsLayout` guard in `markNeedsLayout()` is the primary deduplication mechanism. Once a node sets `_needsLayout = true` and propagates to its boundary (adding the boundary to the list), subsequent calls to `markNeedsLayout()` on the same node return early without adding anything. The boundary node itself also has `_needsLayout = true`, so repeated calls stop immediately.

The only scenario where a node could appear twice is if `_needsLayout` is cleared (by `layout()`) and then re-dirtied before `flushLayout()` processes it. This is handled by the while loop: the first processing clears the node, and if it is re-dirtied, it appears in the next iteration's snapshot.

---

## 5. Backward Compatibility

### 5.1 Default Behavior Unchanged

Without Gap R01 (RelayoutBoundary), every `markNeedsLayout()` call propagates to the root, which calls `requestLayout()`, which adds the root to `_nodesNeedingLayout`. The list always contains at most one entry: the root. The depth-sorted processing lays out the root with `rootConstraints`, producing identical behavior to the current implementation.

### 5.2 API Surface Compatibility

| Method | Before | After | Compatible? |
|---|---|---|---|
| `requestLayout()` | Sets boolean `_needsLayout` | Calls `addNodeNeedingLayout(root)` | Yes -- same external effect |
| `flushLayout()` | Returns `boolean` | Returns `boolean` | Yes -- same signature |
| `hasNodesNeedingLayout` | Checks `root.needsLayout` | Checks `_nodesNeedingLayout.length > 0` | Yes -- same semantics |
| `removeFromQueues(node)` | Removes from paint set | Removes from paint set AND layout array | Yes -- superset behavior |
| `dispose()` | Clears paint set + nulls | Clears both lists + nulls | Yes -- superset behavior |
| `setConstraints()` | Sets `_needsLayout = true` + calls root.markNeedsLayout | Calls root.markNeedsLayout (which adds to list) | Yes -- `_needsLayout` boolean removed but list serves same purpose |

### 5.3 Binding Integration

No changes needed to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`. The layout callback (lines 295-306) already calls `pipelineOwner.flushLayout()`, which now processes the list instead of only the root. The `hasNodesNeedingLayout` check in `beginFrame()` (line 532) now checks the list length instead of the root's dirty flag. Both integrate seamlessly.

---

## 6. Complete Modified PipelineOwner Class

Below is the full proposed class with all modifications integrated. This replaces the existing file at `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts`:

```typescript
// PipelineOwner -- manages layout and paint scheduling
// Amp ref: UB0, amp-strings.txt:530127
// Reference: .reference/render-tree.md, .reference/frame-scheduler.md
//
// CRITICAL Amp fidelity notes:
// - Original Amp PipelineOwner has NO _nodesNeedingLayout list
// - This implementation adds _nodesNeedingLayout as infrastructure for
//   RelayoutBoundary (Gap R01). Without boundaries, behavior is identical
//   to Amp's root-only approach (list always contains only the root).
// - flushPaint() clears dirty paint flags (actual painting done by WidgetsBinding)
// - requestLayout() and requestPaint() only request a frame if not mid-frame

import { RenderBox, type RenderObject } from './render-object';
import { BoxConstraints } from '../core/box-constraints';
import { Size } from '../core/types';

export class PipelineOwner {
  // Amp ref: UB0._rootRenderObject = null
  private _rootRenderObject: RenderBox | null = null;
  // Amp ref: UB0._rootConstraints = null
  private _rootConstraints: BoxConstraints | null = null;
  // Amp ref: UB0._nodesNeedingPaint = new Set()
  private _nodesNeedingPaint: Set<RenderObject> = new Set();

  // NEW: Replaces boolean _needsLayout flag.
  // Tracks relayout boundary nodes (or root) that need layout.
  // Processed in depth-ascending order by flushLayout().
  // Amp ref: Not present in UB0.
  // Flutter ref: PipelineOwner._nodesNeedingLayout
  private _nodesNeedingLayout: RenderObject[] = [];

  /** Amp ref: UB0._rootRenderObject getter */
  get rootNode(): RenderBox | null {
    return this._rootRenderObject;
  }

  /**
   * Set the root render object.
   * Amp ref: UB0.setRootRenderObject(g)
   */
  setRootRenderObject(node: RenderBox | null): void {
    this._rootRenderObject = node;
    if (node) {
      node.attach(this as any);
    }
  }

  /**
   * Register a node for layout in the next flushLayout() pass.
   * Called by markNeedsLayout() when propagation reaches a boundary.
   *
   * Duplicates are prevented by the _needsLayout guard in
   * markNeedsLayout() -- a node that is already dirty will not
   * call this method twice.
   */
  addNodeNeedingLayout(node: RenderObject): void {
    this._nodesNeedingLayout.push(node);
  }

  /**
   * Backward-compatible entry point: adds root to layout list.
   * Called by root RenderObject's markNeedsLayout().
   *
   * Amp ref: UB0.requestLayout(g) -- just triggers frame request
   */
  requestLayout(): void {
    if (this._rootRenderObject) {
      this.addNodeNeedingLayout(this._rootRenderObject);
    }
    // In full implementation, calls c9.instance.requestFrame()
  }

  /**
   * Register a specific node for layout.
   * Used when RelayoutBoundary stops propagation at a non-root node.
   */
  requestLayoutFor(node: RenderObject): void {
    this.addNodeNeedingLayout(node);
  }

  /**
   * Called by RenderObject.markNeedsPaint() to register a node for paint.
   * Amp ref: UB0.requestPaint(g) -- adds to _nodesNeedingPaint set
   */
  requestPaint(node?: RenderObject): void {
    if (node) {
      if (this._nodesNeedingPaint.has(node)) return;
      this._nodesNeedingPaint.add(node);
    }
    // In full implementation, calls c9.instance.requestFrame()
  }

  /**
   * Update root constraints based on terminal size.
   * Amp ref: UB0.updateRootConstraints(g)
   */
  updateRootConstraints(size: Size): void {
    const newConstraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: size.width,
      minHeight: 0,
      maxHeight: size.height,
    });

    const changed =
      !this._rootConstraints ||
      this._rootConstraints.maxWidth !== newConstraints.maxWidth ||
      this._rootConstraints.maxHeight !== newConstraints.maxHeight;

    this._rootConstraints = newConstraints;

    if (changed && this._rootRenderObject) {
      this._rootRenderObject.markNeedsLayout();
    }
  }

  /**
   * Set constraints directly (convenience method).
   */
  setConstraints(constraints: BoxConstraints): void {
    const changed =
      !this._rootConstraints ||
      !constraints.equals(this._rootConstraints);

    this._rootConstraints = constraints;

    if (changed) {
      if (this._rootRenderObject) {
        this._rootRenderObject.markNeedsLayout();
      }
    }
  }

  /**
   * Process all dirty layout nodes in depth-ascending order.
   *
   * Depth ordering ensures parents are laid out before children.
   * When a parent's performLayout() calls child.layout(), the child's
   * _needsLayout flag is cleared. If the child was also in the list,
   * it is skipped (the guard `if (!node.needsLayout || !node.attached)`
   * handles this).
   *
   * The while loop handles re-entrant additions: if a node's
   * performLayout() marks another node dirty (e.g., a sibling),
   * that new entry is processed in a subsequent iteration.
   *
   * Amp ref: UB0.flushLayout() -- root-only layout.
   * Flutter ref: PipelineOwner.flushLayout() -- depth-sorted list.
   */
  flushLayout(): boolean {
    if (this._nodesNeedingLayout.length === 0) {
      return false;
    }

    let layoutPerformed = false;

    while (this._nodesNeedingLayout.length > 0) {
      // Sort by depth ascending (parents first).
      this._nodesNeedingLayout.sort(
        (a, b) => this._getDepth(a) - this._getDepth(b)
      );

      // Snapshot and clear -- performLayout may add new entries.
      const dirtyNodes = this._nodesNeedingLayout.splice(0);

      for (const node of dirtyNodes) {
        // Skip if already cleaned or detached.
        if (!node.needsLayout || !node.attached) {
          continue;
        }

        // Root gets rootConstraints; other nodes use their cached constraints.
        if (node === this._rootRenderObject && this._rootConstraints) {
          (node as RenderBox).layout(this._rootConstraints);
          layoutPerformed = true;
        } else if (node instanceof RenderBox) {
          const cached = node.constraints;
          if (cached) {
            node.layout(cached);
            layoutPerformed = true;
          }
        }
      }
    }

    return layoutPerformed;
  }

  /**
   * Clear paint dirty flags.
   * Amp ref: UB0.flushPaint()
   */
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

  /**
   * Whether any nodes are registered for layout.
   */
  get hasNodesNeedingLayout(): boolean {
    return this._nodesNeedingLayout.length > 0;
  }

  /**
   * Return a snapshot of nodes awaiting layout.
   * Useful for diagnostics and testing.
   */
  get nodesNeedingLayout(): ReadonlyArray<RenderObject> {
    return [...this._nodesNeedingLayout];
  }

  /** Amp ref: UB0.hasNodesNeedingPaint */
  get hasNodesNeedingPaint(): boolean {
    return this._nodesNeedingPaint.size > 0;
  }

  /** Check if paint is needed */
  get needsPaint(): boolean {
    return this._nodesNeedingPaint.size > 0;
  }

  /** Remove a node from all queues (layout and paint) */
  removeFromQueues(node: RenderObject): void {
    this._nodesNeedingPaint.delete(node);
    const layoutIdx = this._nodesNeedingLayout.indexOf(node);
    if (layoutIdx >= 0) {
      this._nodesNeedingLayout.splice(layoutIdx, 1);
    }
  }

  /** Amp ref: UB0.dispose() */
  dispose(): void {
    this._nodesNeedingPaint.clear();
    this._nodesNeedingLayout.length = 0;
    this._rootRenderObject = null;
    this._rootConstraints = null;
  }

  /**
   * Compute node depth by walking the parent chain.
   * Returns 0 for the root, 1 for root's direct child, etc.
   *
   * TODO: Replace with node.depth once RenderObject has cached depth (Gap R01).
   */
  private _getDepth(node: RenderObject): number {
    let depth = 0;
    let current = node.parent;
    while (current !== null) {
      depth++;
      current = current.parent;
    }
    return depth;
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests: `_nodesNeedingLayout` List Management

**File: `src/framework/__tests__/pipeline-owner-layout-list.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { PipelineOwner } from '../pipeline-owner';
import { RenderBox } from '../render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Size, Offset } from '../../core/types';

class TestRenderBox extends RenderBox {
  layoutCount = 0;
  performLayout(): void {
    this.layoutCount++;
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(): void {}
}

describe('PipelineOwner _nodesNeedingLayout', () => {
  let owner: PipelineOwner;

  beforeEach(() => {
    owner = new PipelineOwner();
  });

  // Test 1
  it('addNodeNeedingLayout adds node to the list', () => {
    const node = new TestRenderBox();
    owner.addNodeNeedingLayout(node);
    expect(owner.hasNodesNeedingLayout).toBe(true);
    expect(owner.nodesNeedingLayout).toContain(node);
  });

  // Test 2
  it('requestLayout adds root to the list', () => {
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
    // Clear initial state
    owner.flushLayout();

    root.markNeedsLayout();
    expect(owner.hasNodesNeedingLayout).toBe(true);
    expect(owner.nodesNeedingLayout.length).toBeGreaterThan(0);
  });

  // Test 3
  it('flushLayout clears the list', () => {
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
    // root is dirty from construction, added to list via requestLayout
    expect(owner.hasNodesNeedingLayout).toBe(true);

    owner.flushLayout();
    expect(owner.hasNodesNeedingLayout).toBe(false);
    expect(owner.nodesNeedingLayout.length).toBe(0);
  });

  // Test 4
  it('flushLayout returns false for empty list', () => {
    expect(owner.flushLayout()).toBe(false);
  });

  // Test 5
  it('flushLayout returns true when nodes are processed', () => {
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
    expect(owner.flushLayout()).toBe(true);
  });

  // Test 6
  it('flushLayout skips non-dirty nodes', () => {
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));

    // Layout root to clear dirty flag
    owner.flushLayout();
    expect(root.layoutCount).toBe(1);

    // Manually add root to list even though it is clean
    owner.addNodeNeedingLayout(root);
    owner.flushLayout();
    // Should NOT have re-laid-out because root.needsLayout is false
    expect(root.layoutCount).toBe(1);
  });

  // Test 7
  it('removeFromQueues removes from the layout list', () => {
    const node = new TestRenderBox();
    owner.addNodeNeedingLayout(node);
    expect(owner.hasNodesNeedingLayout).toBe(true);

    owner.removeFromQueues(node);
    expect(owner.hasNodesNeedingLayout).toBe(false);
  });

  // Test 8
  it('dispose clears the layout list', () => {
    const node = new TestRenderBox();
    owner.addNodeNeedingLayout(node);
    expect(owner.hasNodesNeedingLayout).toBe(true);

    owner.dispose();
    expect(owner.hasNodesNeedingLayout).toBe(false);
  });

  // Test 9
  it('removeFromQueues removes from both layout and paint lists', () => {
    const node = new TestRenderBox();
    owner.addNodeNeedingLayout(node);
    owner.requestPaint(node);
    expect(owner.hasNodesNeedingLayout).toBe(true);
    expect(owner.hasNodesNeedingPaint).toBe(true);

    owner.removeFromQueues(node);
    expect(owner.hasNodesNeedingLayout).toBe(false);
    expect(owner.hasNodesNeedingPaint).toBe(false);
  });
});
```

### 7.2 Unit Tests: Depth-Ordered Processing

**File: `src/framework/__tests__/pipeline-owner-depth-order.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { PipelineOwner } from '../pipeline-owner';
import { RenderBox, ContainerRenderBox } from '../render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Size, Offset } from '../../core/types';

class OrderTrackingRenderBox extends RenderBox {
  static layoutOrder: string[] = [];
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  performLayout(): void {
    OrderTrackingRenderBox.layoutOrder.push(this.name);
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(): void {}
}

class OrderTrackingContainerBox extends ContainerRenderBox {
  static layoutOrder: string[] = [];
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  performLayout(): void {
    OrderTrackingContainerBox.layoutOrder.push(this.name);
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
      // Layout children with same constraints
      for (const child of this.children) {
        (child as RenderBox).layout(this.constraints!);
      }
    }
  }
  paint(): void {}
}

describe('PipelineOwner depth-ordered processing', () => {
  beforeEach(() => {
    OrderTrackingRenderBox.layoutOrder = [];
    OrderTrackingContainerBox.layoutOrder = [];
  });

  // Test 10
  it('processes nodes in depth order (shallow first)', () => {
    const owner = new PipelineOwner();
    const root = new OrderTrackingContainerBox('root');
    const child = new OrderTrackingRenderBox('child');

    owner.setRootRenderObject(root as any);
    root.insert(child as any);
    const constraints = BoxConstraints.tight(new Size(80, 24));
    owner.setConstraints(constraints);

    // Layout to establish tree
    owner.flushLayout();
    OrderTrackingContainerBox.layoutOrder = [];
    OrderTrackingRenderBox.layoutOrder = [];

    // Add child first, then root (reverse depth order)
    child.markNeedsLayout(); // propagates to root
    // Both root and child are dirty

    // flushLayout should process root before child
    owner.flushLayout();

    // Root should be processed first (depth 0 < depth 1)
    const combined = [
      ...OrderTrackingContainerBox.layoutOrder,
    ];
    expect(combined[0]).toBe('root');
  });

  // Test 11
  it('skips child when parent layout already cleaned it', () => {
    const owner = new PipelineOwner();
    const root = new OrderTrackingContainerBox('root');
    const child = new OrderTrackingRenderBox('child');

    owner.setRootRenderObject(root as any);
    root.insert(child as any);
    const constraints = BoxConstraints.tight(new Size(80, 24));
    owner.setConstraints(constraints);
    owner.flushLayout();

    OrderTrackingRenderBox.layoutOrder = [];
    OrderTrackingContainerBox.layoutOrder = [];

    // Mark child dirty (propagates to root)
    child.markNeedsLayout();

    // flushLayout processes root first, root's performLayout
    // calls child.layout() which clears child's dirty flag.
    // When child's turn comes in the list, it should be skipped.
    owner.flushLayout();

    // child.performLayout should be called exactly once
    // (via root's performLayout, not directly from the list)
    expect(OrderTrackingRenderBox.layoutOrder.filter(
      n => n === 'child'
    ).length).toBe(1);
  });

  // Test 12
  it('processes nodes out-of-order insertion correctly', () => {
    const owner = new PipelineOwner();
    const root = new OrderTrackingContainerBox('root');
    const mid = new OrderTrackingContainerBox('mid');
    const leaf = new OrderTrackingRenderBox('leaf');

    owner.setRootRenderObject(root as any);
    root.insert(mid as any);
    mid.insert(leaf as any);
    const constraints = BoxConstraints.tight(new Size(80, 24));
    owner.setConstraints(constraints);
    owner.flushLayout();

    OrderTrackingContainerBox.layoutOrder = [];
    OrderTrackingRenderBox.layoutOrder = [];

    // Add in reverse depth order: leaf (depth 2), root (depth 0), mid (depth 1)
    // By marking leaf dirty, propagation marks mid and root dirty too
    leaf.markNeedsLayout();

    owner.flushLayout();

    // Root should process first regardless of insertion order
    const allOrders = [
      ...OrderTrackingContainerBox.layoutOrder,
      ...OrderTrackingRenderBox.layoutOrder,
    ];
    // The first performLayout call should be root
    expect(OrderTrackingContainerBox.layoutOrder[0]).toBe('root');
  });
});
```

### 7.3 Regression Tests: Existing Tests Must Pass

The following existing test files must continue to pass with zero changes:

1. **`/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/pipeline-owner.test.ts`** -- All 10 existing tests covering `setRootRenderObject`, `setConstraints`, `flushLayout`, `requestLayout`, `requestPaint`, `flushPaint`, `updateRootConstraints`, `removeFromQueues`, and `dispose`.

2. **`/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/pipeline-integration.test.ts`** -- All 9 integration tests covering the full `setState -> ScreenBuffer` pipeline, dirty element scheduling, build phase ordering, frame scheduling integration, layout + paint + render pipeline, and end-to-end multi-frame rendering.

Key regression scenarios to verify:

```
Test R1: existing "calls layout on root with constraints" passes
  - Root is added to list via requestLayout(), processed in flushLayout()
  - Assert: root.layoutCount === 1

Test R2: existing "is no-op when root does not need layout" passes
  - After first flushLayout(), list is empty
  - Second flushLayout() returns false

Test R3: existing "sets needsLayout flag" passes
  - markNeedsLayout -> requestLayout -> addNodeNeedingLayout(root)
  - Assert: hasNodesNeedingLayout === true

Test R4: pipeline integration "updates ScreenBuffer after setState" passes
  - Full build -> layout -> paint -> render chain works identically

Test R5: pipeline integration "handles multiple setState calls" passes
  - Multiple state changes coalesce into single frame correctly
```

### 7.4 Performance Benchmarks

```
Benchmark 1: flushLayout with single dirty node (root-only, no boundaries)
  - Create tree of 100 nodes
  - Mark leaf dirty (propagates to root)
  - Measure flushLayout() time
  - Assert: comparable to current root-only approach (no regression)
  - Expected: < 0.5ms overhead from list management

Benchmark 2: flushLayout with multiple boundary nodes (after Gap R01)
  - Create tree with 3 relayout boundaries at different depths
  - Mark nodes dirty in 2 different boundary subtrees
  - Measure flushLayout() time
  - Assert: faster than full-tree layout
  - Expected: 2-3x improvement for isolated subtree changes

Benchmark 3: flushLayout sort overhead for small lists
  - Add 1, 2, 3, 5, 10 nodes to layout list
  - Measure sort + processing time
  - Assert: sort overhead < 1% of total flushLayout time for N <= 10
```

---

## 8. Interaction with Other Gaps

| Gap | Relationship |
|---|---|
| **R01 (RelayoutBoundary)** | Primary consumer. Without boundaries, `_nodesNeedingLayout` always contains only the root. With boundaries, multiple entries appear, and depth-sorted processing prevents redundant layout work. Gap R01 modifies `markNeedsLayout()` to call `requestLayoutFor(this)` when `this === this._relayoutBoundary`. |
| **R04 (sizedByParent)** | Contributes to boundary determination. Nodes with `sizedByParent = true` are always relayout boundaries, adding themselves to the layout list instead of propagating upward. |
| **R05 (parentUsesSize)** | Another boundary condition. When `parentUsesSize = false`, the child becomes a boundary and registers in the layout list. |
| **R02 (RepaintBoundary)** | Orthogonal but analogous. `_nodesNeedingPaint` already exists; this gap adds the layout equivalent, establishing symmetry between layout and paint dirty tracking. |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Duplicate entries in layout list | Low -- redundant `performLayout()` calls | The `_needsLayout` guard in `markNeedsLayout()` prevents a dirty node from being added twice. The `if (!node.needsLayout)` check in `flushLayout()` handles edge cases. |
| Depth computation cost per sort | Low -- O(D) per node where D is depth, typically < 20 | Cache depth on first access per frame. Or wait for Gap R01 to add `node.depth`. For N <= 5 entries and D <= 20, total cost is < 100 pointer hops per frame. |
| Re-entrant infinite loop | Medium -- if performLayout always marks nodes dirty | The `if (this._needsLayout) return` guard in `markNeedsLayout()` prevents re-entry for already-dirty nodes. A node can only be added once per frame. If infinite loops are still a concern, add a maximum iteration count (e.g., 100) as a safety valve. |
| Non-root nodes with null constraints | Medium -- crash if cached constraints are null | The `if (cached)` guard in `flushLayout()` protects against this. A node without constraints has never been laid out and should not be in the list. |
| Behavioral change from root-only to list-based | Low -- default behavior unchanged | Without RelayoutBoundary, the list always contains only the root. All existing tests verify this path. |
| `setConstraints()` no longer sets boolean flag | Low -- API change | `setConstraints()` calls `markNeedsLayout()` on root, which calls `requestLayout()`, which adds root to list. The boolean is no longer needed. |
| Memory leak if nodes accumulate in list | Very Low -- list is cleared every frame | `flushLayout()` uses `splice(0)` to take a snapshot and clear. Even if nodes are added between frames, the next `flushLayout()` processes and clears them. `dispose()` also clears the list. |

---

## 10. Implementation Plan

### Phase 1: Core Infrastructure (This Gap)

1. Replace `_needsLayout: boolean` with `_nodesNeedingLayout: RenderObject[]` in PipelineOwner.
2. Add `addNodeNeedingLayout()` method.
3. Add `requestLayoutFor()` method.
4. Modify `requestLayout()` to delegate to `addNodeNeedingLayout(root)`.
5. Implement depth-sorted `flushLayout()` with while loop for re-entrant additions.
6. Add `_getDepth()` private helper.
7. Update `hasNodesNeedingLayout` to check list length.
8. Add `nodesNeedingLayout` diagnostic getter.
9. Update `removeFromQueues()` to also remove from layout list.
10. Update `dispose()` to clear layout list.
11. Update `PipelineOwner` interface in `render-object.ts` to include `requestLayoutFor?`.
12. Write all unit tests from Sections 7.1 and 7.2.
13. Verify all existing tests pass (Section 7.3).

### Phase 2: Integration with RelayoutBoundary (Gap R01)

1. Modify `markNeedsLayout()` in `RenderObject` to call `requestLayoutFor(this)` when `this === this._relayoutBoundary`.
2. Replace `_getDepth()` with `node.depth` cached property (from Gap R01).
3. Write integration tests with boundary nodes producing multiple list entries.

### Phase 3: Validation

1. Run full test suite (`bun test`).
2. Benchmark layout performance with and without boundaries.
3. Profile frame times using the performance overlay.
4. Verify no regression in the full `setState -> ScreenBuffer` pipeline.

---

## 11. Amp Fidelity Note

This proposal is an **intentional enhancement beyond Amp fidelity**. The Amp reference (`UB0`) explicitly does not maintain a `_nodesNeedingLayout` list. The file header in the current `pipeline-owner.ts` documents this at line 6:

```
// - PipelineOwner has NO _nodesNeedingLayout list -- layouts from ROOT ONLY
```

The design preserves Amp-identical behavior as the default: without RelayoutBoundary (Gap R01), the list contains only the root, and `flushLayout()` produces the same result as the current root-only implementation. The enhancement only manifests when RelayoutBoundary is also implemented, providing incremental re-layout that skips unaffected subtrees.

This follows the project's established pattern for justified deviations: **default behavior matches Amp exactly; optimization activates only when explicitly enabled through other enhancements**.
