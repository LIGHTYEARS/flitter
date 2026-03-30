# Gap R12: Unify Hit-Test Implementations

## Status: Proposal
## Affected packages: `flitter-core`
## Prerequisite gaps: R03 (Gap 13 -- Unify Hit Testing onto RenderObject)

---

## 1. Problem Statement

The flitter codebase contains two completely separate hit-test implementations that perform
the same fundamental operation -- walking the render tree to determine which nodes contain a
given screen coordinate -- but with different traversal logic, different result formats, and
different call sites. The generic module (`hit-test.ts`) is not used by the mouse system at
all, while the `MouseManager` re-implements everything internally.

### 1.1 Implementation A: `hit-test.ts` (Generic Module)

**File:** `/packages/flitter-core/src/input/hit-test.ts` (122 lines)

This standalone module exports two free functions and two interfaces:

```typescript
// Types
export interface HitTestEntry {
  renderObject: RenderObject;
  localX: number;
  localY: number;
}

export interface HitTestResult {
  path: HitTestEntry[];  // ordered deepest-first
}

// Functions
export function hitTest(root: RenderObject, x: number, y: number): HitTestResult;
export function hitTestSelf(renderObject: RenderBox, localX: number, localY: number): boolean;
```

The `hitTest()` function performs a recursive DFS traversal from a root `RenderObject`,
accumulating parent offsets to convert screen coordinates into each node's local coordinate
space. It builds a `path` array ordered deepest-first.

**Key behavioral characteristics:**

1. **Handles two node types.** For `ContainerRenderBox` nodes (line 87), it accesses
   `.children` directly to iterate in reverse order (last-painted = front-most first). For
   generic `RenderObject` nodes (line 57), it falls back to `visitChildren()`.

2. **Breaks on first front-most child hit.** At line 92, when iterating children of a
   `ContainerRenderBox`, a `break;` statement stops after the first child that reports a hit.
   This means overlapping siblings are not all explored -- only the topmost one.

3. **No opaque handling.** The module has no concept of opaque regions. Every node that
   contains the point is included unconditionally.

4. **Provides local coordinates.** Each `HitTestEntry` stores `localX` and `localY` in the
   hit node's own coordinate space, which is useful for determining where within a widget the
   click landed.

5. **No depth tracking.** The path is ordered by DFS traversal (deepest first via recursion),
   but there is no explicit `depth` number on each entry.

**Callers:**

| File | Usage |
|------|-------|
| `input/__tests__/event-dispatcher.test.ts` (line 8) | Imports `hitTest`, `hitTestSelf`, `HitTestResult` for unit tests (lines 626-769) |

No production code imports this module. It is exclusively test infrastructure. It is dead code
in the live mouse event pipeline.

### 1.2 Implementation B: `MouseManager._hitTest()` (Specialized Traversal)

**File:** `/packages/flitter-core/src/input/mouse-manager.ts` (lines 246-314)

A private method on the `MouseManager` singleton that performs its own independent DFS
traversal of the render tree, searching specifically for `RenderMouseRegion` instances.

**Key infrastructure:**

```typescript
// Lazy class reference to avoid circular require (lines 9-17)
let _RenderMouseRegionClass: any = null;
function getRenderMouseRegionClass(): any {
  if (_RenderMouseRegionClass === null) {
    const mod = require('../widgets/mouse-region');
    _RenderMouseRegionClass = mod.RenderMouseRegion;
  }
  return _RenderMouseRegionClass;
}

// Local result type (lines 20-23)
interface HitTestEntry {
  region: RenderMouseRegion;
  depth: number;
}
```

**Key behavioral characteristics:**

1. **Scoped to `RenderMouseRegion` only.** Uses `instanceof` against the lazily-loaded class
   reference (line 269: `if (node instanceof RMR)`). No other render object type can
   participate in mouse event dispatch.

2. **Tests all children unless opaque blocks.** Children are iterated in reverse order
   (lines 295), but unlike `hit-test.ts`, there is no unconditional `break`. Instead, the
   method returns a boolean `opaqueHit`, and when a child returns `true` (indicating an opaque
   `RenderMouseRegion` was hit in that subtree), the parent breaks out of the sibling loop
   (lines 305-309).

3. **Uses unsafe casts for offset/size.** At line 258, the node is cast to `RenderBox` via
   `node as unknown as RenderBox`, then checks are performed for the existence of `offset` and
   `size` properties (lines 261, 271). This is fragile and bypasses TypeScript's type system.

4. **Tracks depth for z-ordering.** Each entry stores a `depth` integer that represents DFS
   depth. After traversal, results are sorted by depth (lines 226, 353) to establish z-order.

5. **Uses global coordinates only.** The result entries contain `{ region, depth }` -- no
   local coordinates are computed. The global screen position is used directly when dispatching
   events.

**Callers (both internal to `MouseManager`):**

| Method | Line | Purpose |
|--------|------|---------|
| `reestablishHoverState()` | 200 | Post-frame callback to reconcile hover state after layout |
| `dispatchMouseAction()` | 340 | Dispatch scroll/press/release to the deepest matching handler |

### 1.3 Side-by-Side Comparison

| Aspect | `hit-test.ts` (free function) | `MouseManager._hitTest()` |
|--------|-------------------------------|---------------------------|
| **Traversal scope** | All `RenderBox` nodes | Only `RenderMouseRegion` instances |
| **Overlapping siblings** | `break;` on first hit (line 92) | Tests all; `break` only on opaque (line 308) |
| **Result content** | `{ renderObject, localX, localY }` | `{ region, depth }` |
| **Coordinate space** | Local coordinates per node | Global screen coordinates |
| **Opaque handling** | None | Returns `true` to parent which `break`s |
| **`instanceof` usage** | `RenderBox`, `ContainerRenderBox` | Lazy `require()` for `RenderMouseRegion` |
| **Production usage** | None (dead code) | All mouse events go through this path |
| **Node type handling** | Separate paths for Container vs generic | Unsafe cast `as unknown as RenderBox` |
| **Child iteration** | `.children` direct access or `visitChildren` | Collects children via `visitChildren` into array |
| **Post-traversal sort** | Not needed (DFS order from recursion) | Sorted by `depth` after collection |

### 1.4 Why This Is a Problem

1. **Dead code in production.** The `hit-test.ts` module is well-tested (8 test cases in
   `event-dispatcher.test.ts` lines 626-769) but contributes nothing to runtime behavior.
   It creates a false sense of coverage -- the tested code is not the code that runs.

2. **Semantic divergence.** The two implementations handle overlapping siblings, opaque
   regions, and coordinate spaces differently. As the codebase evolves, these two paths
   will diverge further, creating subtle bugs where hit-test behavior in tests does not
   match production.

3. **No polymorphic override.** Neither implementation allows a `RenderBox` subclass to
   customize its own hit-test behavior. This means:
   - `RenderClipRect` cannot reject hits outside its clip region.
   - `RenderStack` cannot enable `allowHitTestOutsideBounds` for overflow children.
   - No future render object can absorb or redirect hit tests.

4. **Tight coupling via `instanceof`.** `MouseManager._hitTest()` uses a lazy `require()`
   anti-pattern (lines 9-17) to detect `RenderMouseRegion`. This is a code smell that
   indicates an inverted responsibility: the traverser should not know about specific
   render object types.

5. **Violates the Amp reference.** In the Amp binary, `hitTest()` is a method on `j9`
   (RenderBox), and the `Pg` class (MouseManager) delegates tree traversal to the render
   tree. Flitter inverts this by having MouseManager own the traversal.

### 1.5 Amp Architecture Reference

From `.reference/render-tree.md` lines 274-290:

```javascript
// j9.hitTest(g, t, b = 0, s = 0)
//   g = HitTestResult accumulator
//   t = position { x, y }
//   b = parent offset X
//   s = parent offset Y
hitTest(g, t, b = 0, s = 0) {
  let a = b + this.offset.x, r = s + this.offset.y;
  let m = t.x >= a && t.x < a + this.size.width;
  let p = t.y >= r && t.y < r + this.size.height;
  if (m && p) {
    g.addWithPaintOffset(this, { x: a, y: r }, t);
    for (let l = this.children.length - 1; l >= 0; l--)
      this.children[l].hitTest(g, t, a, r);
    return !0;
  }
  if (this.allowHitTestOutsideBounds) {
    for (let l = this.children.length - 1; l >= 0; l--)
      this.children[l].hitTest(g, t, a, r);
  }
  return !1;
}
```

Key observations:
- `hitTest()` is a **method on `j9` (RenderBox)**, not a free function or MouseManager method.
- The `n_` (RenderObject) base class declares `allowHitTestOutsideBounds = !1` (line 50).
- The accumulator `g` has `addWithPaintOffset(renderObject, offset, position)`.
- Children are iterated in **reverse order** (back-to-front for z-correctness).
- Amp does **not** short-circuit child iteration: all children are tested unconditionally.
- The `Pg` class (MouseManager) calls `rootRenderObject.hitTest(result, position)` -- it
  delegates to the render tree rather than implementing its own DFS.

---

## 2. Detailed Code Analysis

### 2.1 `hit-test.ts` Internal Structure

The module has three components:

**`hitTest()` (lines 38-42):** Entry point. Creates an empty path array, calls
`_hitTestNode()`, and wraps the result.

**`_hitTestNode()` (lines 48-107):** Recursive traversal function with these branches:

- **Non-RenderBox nodes (lines 57-69):** Recurse through all children via `visitChildren()`.
  If any child was hit, add the non-RenderBox node to the path. This handles intermediate
  non-box nodes that may exist in the render tree (though in practice, all flitter render
  objects extend `RenderBox`).

- **RenderBox bounds check (lines 72-81):** Compute screen-space position by adding parent
  offset to node offset. Convert to local coordinates. Call `hitTestSelf()` to check bounds.
  Return false on miss.

- **ContainerRenderBox children (lines 87-94):** Iterate children in reverse order via
  `.children` array. **Break on first hit** -- this is the critical behavioral difference
  from `MouseManager._hitTest()`.

- **Generic RenderBox children (lines 96-101):** Use `visitChildren()` for non-container
  boxes. Uses a `childHit` flag to stop at first hit (line 98: `if (!childHit && ...)`).

- **Self addition (line 105):** After child recursion, add this node to the path. This means
  the path is naturally deepest-first (children appear before parents).

**`hitTestSelf()` (lines 118-121):** Simple bounds check against the node's `size`.

### 2.2 `MouseManager._hitTest()` Internal Structure (lines 246-314)

**Class reference (line 255):** `const RMR = getRenderMouseRegionClass();` -- loaded once
per call via the lazy cache.

**Offset accumulation (lines 258-264):** Casts node to `RenderBox` unsafely, then reads
`offset.col` and `offset.row` if they exist. This is defensive but type-unsafe.

**RenderMouseRegion detection (lines 269-285):** Uses `instanceof` check against the lazy
class. If the node is a `RenderMouseRegion` and the position is within bounds, the region
is pushed to the results array with its DFS depth. If the region is opaque, `opaqueHit`
is set to `true`.

**Child iteration (lines 289-311):** Collects all children into an array via `visitChildren()`,
then iterates in reverse. For each child, recursively calls `_hitTest()`. If a child returns
`true` (opaque hit), the loop breaks, skipping remaining siblings.

**Return value (line 313):** Returns `opaqueHit` boolean, used by the parent caller to
decide whether to stop sibling iteration.

### 2.3 How MouseManager Uses `_hitTest()`

**`reestablishHoverState()` (lines 193-232):**
1. Calls `_hitTest()` to collect all `RenderMouseRegion` instances at `_lastPosition`.
2. Builds a `Set<RenderMouseRegion>` from the results.
3. Unregisters regions that were hovered but are no longer hit (fires `exit` events).
4. Sorts results by `depth` (ascending: shallowest first, line 226).
5. Registers newly hit regions in sorted order (deepest regions added last).
6. The sort order matters for cursor resolution: `updateCursor()` iterates the
   `_hoveredRegions` Set and picks the **last** region with a cursor property (line 176-180),
   so adding deepest regions last means the deepest cursor wins.

**`dispatchMouseAction()` (lines 329-386):**
1. Calls `_hitTest()` to collect all `RenderMouseRegion` instances at the event position.
2. Sorts results by `depth` (ascending, line 353).
3. Iterates from the end (deepest region) to find the first region with a matching handler.
4. Dispatches the event to that region and returns.

### 2.4 Wiring Through WidgetsBinding

From `binding.ts`, the `MouseManager` is wired into the frame lifecycle:

1. `setupEventHandlers()` registers a mouse handler on `EventDispatcher` that calls
   `mouseManager.updatePosition()` for move events and `mouseManager.dispatchMouseAction()`
   for scroll/press/release.
2. `attachRootWidget()` calls `mouseManager.setRootRenderObject(rootRO)`.
3. The render-phase frame callback calls `mouseManager.reestablishHoverState()` as a
   post-frame action to reconcile hover state after layout changes.

---

## 3. Proposed Solution: Unify onto `RenderBox.hitTest()` Method

### 3.1 Design Principles

1. **Amp fidelity.** Match the Amp `j9.hitTest(g, t, b, s)` signature. Hit testing is a
   method on `RenderBox`, not a free function or something owned by `MouseManager`.

2. **Polymorphic override.** Any `RenderBox` subclass can override `hitTest()`,
   `hitTestChildren()`, and `hitTestSelf()` to customize behavior (clipping, absorbing,
   allowing out-of-bounds hits, etc.).

3. **Single traversal path.** Both hover reconciliation and action dispatch use the same
   `hitTest()` method on the render tree. No duplicate traversal logic.

4. **MouseManager becomes a coordinator, not a traverser.** `MouseManager` calls
   `root.hitTest(result, position)` and processes the result to extract
   `RenderMouseRegion` instances. It no longer owns the DFS logic.

5. **Opaque filtering is post-processing.** The render tree always tests all children
   (matching Amp). The `opaque` semantic is handled by `MouseManager` when processing
   the hit-test result.

### 3.2 New Types

```typescript
/**
 * A single entry in a hit-test result.
 * Amp ref: entries collected by g.addWithPaintOffset()
 */
export class BoxHitTestEntry {
  constructor(
    public readonly target: RenderObject,
    public readonly localPosition: Offset,
  ) {}
}

/**
 * Accumulates hit-test entries during a tree walk.
 * Amp ref: the `g` parameter in j9.hitTest(g, t, b, s)
 */
export class BoxHitTestResult {
  private readonly _path: BoxHitTestEntry[] = [];

  get path(): ReadonlyArray<BoxHitTestEntry> {
    return this._path;
  }

  addWithPaintOffset(
    target: RenderObject,
    offset: Offset,
    position: Offset,
  ): void {
    const localPosition = new Offset(
      position.col - offset.col,
      position.row - offset.row,
    );
    this._path.push(new BoxHitTestEntry(target, localPosition));
  }
}
```

### 3.3 New Methods on `RenderObject` / `RenderBox`

**On `RenderObject`:**

```typescript
// Amp ref: n_.allowHitTestOutsideBounds = !1
allowHitTestOutsideBounds: boolean = false;
```

**On `RenderBox`:**

```typescript
hitTest(
  result: BoxHitTestResult,
  position: Offset,
  parentOffsetX: number = 0,
  parentOffsetY: number = 0,
): boolean {
  const globalX = parentOffsetX + this.offset.col;
  const globalY = parentOffsetY + this.offset.row;

  const withinBounds = this.hitTestSelf(
    position.col - globalX,
    position.row - globalY,
  );

  if (withinBounds) {
    result.addWithPaintOffset(this, new Offset(globalX, globalY), position);
    this.hitTestChildren(result, position, globalX, globalY);
    return true;
  }

  if (this.allowHitTestOutsideBounds) {
    this.hitTestChildren(result, position, globalX, globalY);
  }

  return false;
}

hitTestSelf(localX: number, localY: number): boolean {
  return localX >= 0 && localX < this.size.width
      && localY >= 0 && localY < this.size.height;
}

hitTestChildren(
  _result: BoxHitTestResult,
  _position: Offset,
  _parentOffsetX: number,
  _parentOffsetY: number,
): void {
  // Default: leaf node, no children
}
```

**On `ContainerRenderBox`:**

```typescript
hitTestChildren(
  result: BoxHitTestResult,
  position: Offset,
  parentOffsetX: number,
  parentOffsetY: number,
): void {
  const children = this.children;
  for (let i = children.length - 1; i >= 0; i--) {
    children[i]!.hitTest(result, position, parentOffsetX, parentOffsetY);
  }
}
```

**On `RenderMouseRegion`:**

```typescript
hitTestChildren(
  result: BoxHitTestResult,
  position: Offset,
  parentOffsetX: number,
  parentOffsetY: number,
): void {
  if (this._child) {
    this._child.hitTest(result, position, parentOffsetX, parentOffsetY);
  }
}
```

### 3.4 Rewritten `MouseManager.reestablishHoverState()`

```typescript
reestablishHoverState(): void {
  if (this._disposed) return;
  if (this._lastPosition.x < 0 || this._lastPosition.y < 0) return;
  if (!this._rootRenderObject) return;

  const result = new BoxHitTestResult();
  const root = this._rootRenderObject as RenderBox;
  const position = new Offset(this._lastPosition.x, this._lastPosition.y);
  root.hitTest(result, position, 0, 0);

  // Extract RenderMouseRegion instances from the unified hit path
  const hitRegions = new Set<RenderMouseRegion>();
  for (const entry of result.path) {
    if (entry.target instanceof RenderMouseRegion) {
      hitRegions.add(entry.target);
    }
  }

  // Unregister regions no longer under cursor
  for (const region of [...this._hoveredRegions]) {
    if (!hitRegions.has(region)) {
      this.unregisterHover(region);
    }
  }

  // Register newly hovered regions in path order
  // Path is DFS-ordered (deepest first from recursion)
  // Registering in this order means deepest regions are added first,
  // and updateCursor() picks the last region with a cursor -- so we
  // reverse to match the current behavior (shallowest first, deepest last)
  for (const entry of [...result.path].reverse()) {
    if (entry.target instanceof RenderMouseRegion) {
      if (!this._hoveredRegions.has(entry.target)) {
        this.registerHover(entry.target);
      }
    }
  }
}
```

### 3.5 Rewritten `MouseManager.dispatchMouseAction()`

```typescript
dispatchMouseAction(
  action: 'scroll' | 'press' | 'release',
  x: number,
  y: number,
  button: number,
): void {
  if (this._disposed) return;
  if (!this._rootRenderObject) return;

  const result = new BoxHitTestResult();
  const root = this._rootRenderObject as RenderBox;
  root.hitTest(result, new Offset(x, y), 0, 0);

  // Walk the path (deepest first) to find the first matching handler
  const event = { x, y, button };
  for (const entry of result.path) {
    if (!(entry.target instanceof RenderMouseRegion)) continue;
    const region = entry.target;

    if (action === 'scroll' && region.onScroll) {
      region.handleMouseEvent('scroll', event);
      return;
    } else if (action === 'press' && region.onClick) {
      region.handleMouseEvent('click', event);
      return;
    } else if (action === 'release' && region.onRelease) {
      region.handleMouseEvent('release', event);
      return;
    }
  }
}
```

### 3.6 Deletions from `mouse-manager.ts`

The following code is removed entirely:

```typescript
// Lines 9-17: Lazy class cache
let _RenderMouseRegionClass: any = null;
function getRenderMouseRegionClass(): any {
  if (_RenderMouseRegionClass === null) {
    const mod = require('../widgets/mouse-region');
    _RenderMouseRegionClass = mod.RenderMouseRegion;
  }
  return _RenderMouseRegionClass;
}

// Lines 20-23: Local HitTestEntry interface
interface HitTestEntry {
  region: RenderMouseRegion;
  depth: number;
}

// Lines 246-314: Private _hitTest method (entire method body)
private _hitTest(
  node: RenderObject,
  x: number, y: number,
  parentOffsetX: number, parentOffsetY: number,
  depth: number,
  results: HitTestEntry[],
): boolean { ... }
```

Replaced by direct imports:

```typescript
import { RenderMouseRegion } from '../widgets/mouse-region';
import { BoxHitTestResult } from './hit-test';  // or from render-object.ts
import { Offset } from '../core/types';
```

### 3.7 Handling the `opaque` Semantic

**Current behavior:** `MouseManager._hitTest()` uses the `opaque` flag during traversal to
short-circuit sibling iteration. When an opaque `RenderMouseRegion` is hit, the method returns
`true`, and the parent loop breaks (lines 305-309).

**New behavior:** The render tree always tests all children (matching Amp). The `opaque` flag
is consumed by `MouseManager` during post-processing. For `dispatchMouseAction()`, this is
already correct -- the method walks the result path deepest-first and takes the first
matching handler. For `reestablishHoverState()`, opaque filtering can be added as follows:

```typescript
// Optional opaque filtering in reestablishHoverState
const hitRegions = new Set<RenderMouseRegion>();
let opaqueBlocked = false;
for (const entry of result.path) {
  if (entry.target instanceof RenderMouseRegion) {
    if (!opaqueBlocked) {
      hitRegions.add(entry.target);
      if (entry.target.opaque) {
        opaqueBlocked = true;
      }
    }
  }
}
```

However, in practice the DFS path ordering means the deepest regions appear first. For
non-overlapping siblings (the common case in TUI layouts), opaque filtering produces identical
results to the current behavior. The post-processing approach is recommended (Gap 13 Option A)
because it:
- Matches Amp's traversal pattern (no short-circuit)
- Keeps the render tree protocol simple and composable
- Makes opaque a coordinator concern, not a tree-traversal concern

### 3.8 Circular Dependency Resolution

Adding `BoxHitTestResult` requires resolving the import cycle:

```
render-object.ts --imports--> hit-test.ts (for BoxHitTestResult)
hit-test.ts      --imports--> render-object.ts (for RenderObject, RenderBox)
```

**Recommended: Option C (simplest).** Define `BoxHitTestResult` and `BoxHitTestEntry`
directly in `render-object.ts`. This avoids any circular dependency. The `hit-test.ts` file
either becomes a re-export shim during deprecation or is deleted.

**Fallback: Option A.** Extract types into `hit-test-result.ts` with no imports from
`render-object.ts`, using a marker interface `HitTestTarget` for the `target` field.

### 3.9 Subclass Override Examples

**`RenderClipRect`** -- Override `hitTest()` to reject all hits outside clip bounds:

```typescript
hitTest(result, position, parentOffsetX = 0, parentOffsetY = 0): boolean {
  const globalX = parentOffsetX + this.offset.col;
  const globalY = parentOffsetY + this.offset.row;
  if (!this.hitTestSelf(position.col - globalX, position.row - globalY)) {
    return false;  // Clipped -- no hit testing at all
  }
  result.addWithPaintOffset(this, new Offset(globalX, globalY), position);
  this.hitTestChildren(result, position, globalX, globalY);
  return true;
}
```

**`RenderStack`** -- Set `allowHitTestOutsideBounds = true` so positioned children that
overflow the stack bounds can still receive hits:

```typescript
constructor() {
  super();
  this.allowHitTestOutsideBounds = true;
}
```

---

## 4. What Gets Removed, Refactored, and Added

### 4.1 Removed

| Item | File | Line(s) | Reason |
|------|------|---------|--------|
| `_RenderMouseRegionClass` lazy cache | `mouse-manager.ts` | 9 | Replaced by direct import |
| `getRenderMouseRegionClass()` | `mouse-manager.ts` | 11-17 | Replaced by direct import |
| `HitTestEntry` (MouseManager-local) | `mouse-manager.ts` | 20-23 | Replaced by `BoxHitTestEntry` |
| `_hitTest()` private method | `mouse-manager.ts` | 246-314 | Replaced by `RenderBox.hitTest()` |
| `hitTest()` free function | `hit-test.ts` | 38-42 | Replaced by `RenderBox.hitTest()` |
| `_hitTestNode()` private function | `hit-test.ts` | 48-107 | Internal to removed `hitTest()` |
| `hitTestSelf()` free function | `hit-test.ts` | 118-121 | Replaced by `RenderBox.hitTestSelf()` |
| `HitTestEntry` interface | `hit-test.ts` | 13-17 | Replaced by `BoxHitTestEntry` class |
| `HitTestResult` interface | `hit-test.ts` | 23-25 | Replaced by `BoxHitTestResult` class |

### 4.2 Refactored

| Item | Location | Change |
|------|----------|--------|
| `MouseManager.reestablishHoverState()` | `mouse-manager.ts:193-232` | Rewritten to call `root.hitTest()` |
| `MouseManager.dispatchMouseAction()` | `mouse-manager.ts:329-386` | Rewritten to call `root.hitTest()` |
| `hit-test.ts` file | `input/hit-test.ts` | Becomes home for `BoxHitTestResult`/`BoxHitTestEntry` (or deleted if types move to `render-object.ts`) |

### 4.3 Added

| Item | Location | Purpose |
|------|----------|---------|
| `RenderObject.allowHitTestOutsideBounds` | `render-object.ts` | Amp ref: `n_.allowHitTestOutsideBounds = !1` |
| `RenderBox.hitTest()` | `render-object.ts` | Amp ref: `j9.hitTest(g, t, b, s)` |
| `RenderBox.hitTestSelf()` | `render-object.ts` | Bounds check in local coordinates |
| `RenderBox.hitTestChildren()` | `render-object.ts` | Virtual method for child traversal |
| `ContainerRenderBox.hitTestChildren()` | `render-object.ts` | Reverse-order child iteration |
| `BoxHitTestResult` class | `hit-test.ts` or `render-object.ts` | Result accumulator with `addWithPaintOffset()` |
| `BoxHitTestEntry` class | `hit-test.ts` or `render-object.ts` | Entry with `target` and `localPosition` |
| `RenderMouseRegion.hitTestChildren()` | `mouse-region.ts` | Single-child passthrough |
| `RenderStack` constructor change | `stack.ts` | `allowHitTestOutsideBounds = true` |
| `RenderClipRect.hitTest()` override | `clip-rect.ts` | Reject hits outside clip region |

---

## 5. Behavioral Differences to Validate

The unified implementation introduces behavioral changes that must be carefully validated.

### 5.1 Sibling Short-Circuiting

**Current `hit-test.ts`:** Breaks on first front-most child hit. Only one sibling subtree
is explored for `ContainerRenderBox` (line 92: `break;`).

**Current `MouseManager._hitTest()`:** Explores all siblings unless an opaque hit causes
a `break` (line 308).

**New unified behavior:** All children are always tested (matching Amp). No `break` in
the base `hitTestChildren()`.

**Impact:** For overlapping non-opaque siblings, the new behavior collects hits from
*all* overlapping regions rather than just the topmost. This is correct for hover state
(multiple overlapping regions can be hovered simultaneously) and neutral for action dispatch
(which still takes only the deepest handler).

### 5.2 Result Ordering

**Current `hit-test.ts`:** Path is naturally deepest-first because children push themselves
before the parent (recursion order).

**Current `MouseManager._hitTest()`:** Results are collected in traversal order, then
sorted by `depth` ascending (shallowest first) at lines 226 and 353. For dispatch,
iteration goes from end to start (deepest first).

**New unified behavior:** `BoxHitTestResult.path` accumulates entries in DFS order.
Within a single `hitTest()` call, `addWithPaintOffset()` is called after the bounds check
but before `hitTestChildren()`. This means a parent adds itself *before* its children
recurse. Wait -- looking at the Amp code more carefully:

```javascript
if (m && p) {
  g.addWithPaintOffset(this, { x: a, y: r }, t);  // parent adds self
  for (...) children[l].hitTest(g, t, a, r);       // then children recurse
  return !0;
}
```

So the parent appears in the result *before* its children. This is the opposite of the
current `hit-test.ts` behavior (where children appear before parents). The `MouseManager`
sorts by depth, so it does not depend on insertion order.

**Resolution:** The `BoxHitTestResult.path` will have parents before children (matching Amp).
For `MouseManager.dispatchMouseAction()`, which wants the deepest handler first, iterate
from the *end* of the path (or reverse iterate). For `reestablishHoverState()`, register
in reverse path order so deepest regions are registered last (matching current cursor
resolution behavior).

### 5.3 Non-RenderBox Nodes

**Current `hit-test.ts`:** Handles non-RenderBox nodes by recursing without bounds checking
(lines 57-69).

**Current `MouseManager._hitTest()`:** Uses unsafe casts, checking for `offset` and `size`
existence at runtime.

**New unified behavior:** `hitTest()` is a method on `RenderBox`. Non-RenderBox nodes do not
have this method. In practice, all render objects in the flitter tree extend `RenderBox`, so
this is not a concern. If mixed trees arise in the future, the `RenderObject` base class
could gain a no-op `hitTest()` stub.

---

## 6. Migration Phases

### Phase 1: Add Methods to Render Object Hierarchy (Non-Breaking, Additive)

**Scope:**
- Add `allowHitTestOutsideBounds: boolean = false` to `RenderObject`.
- Add `BoxHitTestEntry` and `BoxHitTestResult` classes.
- Add `hitTest()`, `hitTestSelf()`, `hitTestChildren()` to `RenderBox`.
- Add `hitTestChildren()` override to `ContainerRenderBox`.
- Add `hitTestChildren()` override to `RenderMouseRegion`.

**Impact:** Zero. All existing code continues to work. Both old and new hit-test paths coexist.

**Validation:** All existing tests pass. New unit tests verify the method-based protocol
produces equivalent results to the free-function module for the same inputs.

### Phase 2: Wire MouseManager to Use `RenderBox.hitTest()`

**Scope:**
- Import `BoxHitTestResult`, `Offset`, `RenderMouseRegion` directly.
- Rewrite `reestablishHoverState()` to call `root.hitTest(result, position, 0, 0)`.
- Rewrite `dispatchMouseAction()` to call `root.hitTest(result, position, 0, 0)`.
- Delete `_hitTest()`, `getRenderMouseRegionClass()`, local `HitTestEntry`.

**Validation:** All `mouse-manager.test.ts` tests pass unchanged. These tests exercise the
public API (`reestablishHoverState`, `dispatchMouseAction`, hover enter/exit, cursor updates)
and do not depend on `_hitTest()` internals.

### Phase 3: Deprecate and Remove Free Functions

**Scope:**
- Mark `hitTest()` and `hitTestSelf()` in `hit-test.ts` as `@deprecated`.
- Migrate `event-dispatcher.test.ts` lines 626-769 to use `RenderBox.hitTest()` with
  `BoxHitTestResult`.
- Delete deprecated free functions and old interfaces.

### Phase 4: Subclass Overrides

**Scope:**
- `RenderStack`: set `allowHitTestOutsideBounds = true`.
- `RenderClipRect`: override `hitTest()` to hard-reject out-of-clip hits.
- Future subclasses (`RenderAbsorbPointer`, etc.) as needed.

**Dependencies:** Phases 1 and 4 can run in parallel. Phase 2 depends on Phase 1.
Phase 3 depends on Phase 2.

---

## 7. Testing Strategy

### 7.1 Parallel Validation (Phase 1)

Before removing old code, run both implementations on identical inputs and assert
equivalent outputs:

```typescript
describe('Parallel validation: free function vs method', () => {
  it('should produce equivalent results for a simple tree', () => {
    const root = new TestContainerRenderBox(80, 24, 0, 0);
    const child = new TestRenderBox(40, 12, 5, 3);
    root.addTestChild(child);
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    // Old way
    const oldResult = hitTest(root, 10, 5);

    // New way
    const newResult = new BoxHitTestResult();
    root.hitTest(newResult, new Offset(10, 5), 0, 0);

    // Same number of entries
    expect(newResult.path.length).toBe(oldResult.path.length);

    // Same render objects (order may differ -- see Section 5.2)
    const oldTargets = new Set(oldResult.path.map(e => e.renderObject));
    const newTargets = new Set(newResult.path.map(e => e.target));
    for (const target of oldTargets) {
      expect(newTargets.has(target)).toBe(true);
    }
  });

  it('should produce equivalent results for nested containers', () => {
    const root = new TestContainerRenderBox(80, 24, 0, 0);
    const middle = new TestContainerRenderBox(60, 20, 2, 1);
    const leaf = new TestRenderBox(20, 10, 5, 3);
    root.addTestChild(middle);
    middle.addTestChild(leaf);
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    const oldResult = hitTest(root, 12, 8);
    const newResult = new BoxHitTestResult();
    root.hitTest(newResult, new Offset(12, 8), 0, 0);

    expect(newResult.path.length).toBe(oldResult.path.length);
  });

  it('should both return empty for a miss', () => {
    const box = new TestRenderBox(10, 5, 0, 0);
    box.layout(BoxConstraints.tight(new Size(10, 5)));

    const oldResult = hitTest(box, 50, 50);
    const newResult = new BoxHitTestResult();
    box.hitTest(newResult, new Offset(50, 50), 0, 0);

    expect(oldResult.path).toHaveLength(0);
    expect(newResult.path).toHaveLength(0);
  });
});
```

### 7.2 Unit Tests for `BoxHitTestResult`

```typescript
describe('BoxHitTestResult', () => {
  it('should start with an empty path', () => {
    const result = new BoxHitTestResult();
    expect(result.path).toHaveLength(0);
  });

  it('should accumulate entries via addWithPaintOffset', () => {
    const result = new BoxHitTestResult();
    const target = createTestRenderBox(10, 5);
    result.addWithPaintOffset(target, new Offset(3, 7), new Offset(8, 10));
    expect(result.path).toHaveLength(1);
    expect(result.path[0].target).toBe(target);
  });

  it('should compute correct local positions', () => {
    const result = new BoxHitTestResult();
    const target = createTestRenderBox(10, 5);
    result.addWithPaintOffset(target, new Offset(3, 7), new Offset(8, 10));
    expect(result.path[0].localPosition.col).toBe(5);   // 8 - 3
    expect(result.path[0].localPosition.row).toBe(3);    // 10 - 7
  });

  it('should maintain insertion order', () => {
    const result = new BoxHitTestResult();
    const parent = createTestRenderBox(20, 20);
    const child = createTestRenderBox(5, 5);
    result.addWithPaintOffset(parent, Offset.zero, new Offset(2, 2));
    result.addWithPaintOffset(child, new Offset(1, 1), new Offset(2, 2));
    expect(result.path[0].target).toBe(parent);
    expect(result.path[1].target).toBe(child);
  });
});
```

### 7.3 Unit Tests for `RenderBox.hitTest()`

```typescript
describe('RenderBox.hitTest()', () => {
  it('should add self when point is within bounds', () => {
    const box = createTestRenderBox(40, 20);
    box.offset = Offset.zero;
    const result = new BoxHitTestResult();
    expect(box.hitTest(result, new Offset(10, 5))).toBe(true);
    expect(result.path).toHaveLength(1);
    expect(result.path[0].target).toBe(box);
  });

  it('should return false for point outside bounds', () => {
    const box = createTestRenderBox(10, 10);
    box.offset = Offset.zero;
    const result = new BoxHitTestResult();
    expect(box.hitTest(result, new Offset(15, 5))).toBe(false);
    expect(result.path).toHaveLength(0);
  });

  it('should accumulate parent offsets for nested boxes', () => {
    const root = createTestContainer(80, 24);
    const child = createTestRenderBox(20, 10);
    child.offset = new Offset(5, 3);
    root.insert(child);
    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(10, 5));
    expect(result.path.length).toBeGreaterThanOrEqual(2);
  });

  it('should respect allowHitTestOutsideBounds = true', () => {
    const parent = createTestContainer(10, 10);
    parent.allowHitTestOutsideBounds = true;
    const child = createTestRenderBox(5, 5);
    child.offset = new Offset(12, 0);
    parent.insert(child);
    const result = new BoxHitTestResult();
    parent.hitTest(result, new Offset(14, 2));
    expect(result.path.find(e => e.target === child)).toBeDefined();
  });

  it('should NOT recurse when outside bounds and flag is false', () => {
    const parent = createTestContainer(10, 10);
    parent.allowHitTestOutsideBounds = false;
    const child = createTestRenderBox(5, 5);
    child.offset = new Offset(12, 0);
    parent.insert(child);
    const result = new BoxHitTestResult();
    parent.hitTest(result, new Offset(14, 2));
    expect(result.path).toHaveLength(0);
  });

  it('should handle zero-size render objects', () => {
    const box = createTestRenderBox(0, 0);
    box.offset = Offset.zero;
    const result = new BoxHitTestResult();
    expect(box.hitTest(result, new Offset(0, 0))).toBe(false);
    expect(result.path).toHaveLength(0);
  });
});
```

### 7.4 Unit Tests for `RenderBox.hitTestSelf()`

```typescript
describe('RenderBox.hitTestSelf()', () => {
  it('should return true for points inside bounds', () => {
    const box = createTestRenderBox(10, 5);
    expect(box.hitTestSelf(0, 0)).toBe(true);
    expect(box.hitTestSelf(5, 3)).toBe(true);
    expect(box.hitTestSelf(9, 4)).toBe(true);
  });

  it('should return false for points outside bounds', () => {
    const box = createTestRenderBox(10, 5);
    expect(box.hitTestSelf(-1, 0)).toBe(false);
    expect(box.hitTestSelf(0, -1)).toBe(false);
    expect(box.hitTestSelf(10, 0)).toBe(false);
    expect(box.hitTestSelf(0, 5)).toBe(false);
  });

  it('should handle 1x1 boundary', () => {
    const box = createTestRenderBox(1, 1);
    expect(box.hitTestSelf(0, 0)).toBe(true);
    expect(box.hitTestSelf(1, 0)).toBe(false);
    expect(box.hitTestSelf(0, 1)).toBe(false);
  });
});
```

### 7.5 MouseManager Regression Tests

All existing tests in `mouse-manager.test.ts` must pass without modification after Phase 2.
These cover:

- Singleton lifecycle (`instance`, `reset`)
- Position tracking (`lastPosition`, `updatePosition`)
- Cursor management (`currentCursor`, `updateCursor`, cursor override)
- Hover registration (`registerHover`, `unregisterHover`, enter/exit events)
- Dispatch actions (`dispatchMouseAction` for scroll/press/release)
- Nested region dispatch (deepest handler wins)
- Dispatch outside region bounds (no-op)
- Button value passthrough
- Hover state preserved across dispatches
- Handler specificity (scroll to non-scroll region is no-op)

### 7.6 New MouseManager Tests for `allowHitTestOutsideBounds`

```typescript
describe('MouseManager with allowHitTestOutsideBounds', () => {
  it('should dispatch to overflowing MouseRegion when ancestor allows it', () => {
    const mm = MouseManager.instance;
    const events: MouseRegionEvent[] = [];

    const root = new TestContainer(80, 24);
    const stack = new TestContainer(10, 10);
    stack.allowHitTestOutsideBounds = true;
    const region = createRegion({
      width: 5, height: 5, col: 12, row: 0,
      onClick: (e) => events.push(e),
    });
    stack.addTestChild(region);
    root.addTestChild(stack);
    mm.setRootRenderObject(root);

    mm.dispatchMouseAction('press', 14, 2, 0);
    expect(events).toHaveLength(1);
  });

  it('should NOT dispatch to overflowing MouseRegion when ancestor forbids it', () => {
    const mm = MouseManager.instance;
    const events: MouseRegionEvent[] = [];

    const root = new TestContainer(80, 24);
    const container = new TestContainer(10, 10);
    // allowHitTestOutsideBounds = false (default)
    const region = createRegion({
      width: 5, height: 5, col: 12, row: 0,
      onClick: (e) => events.push(e),
    });
    container.addTestChild(region);
    root.addTestChild(container);
    mm.setRootRenderObject(root);

    mm.dispatchMouseAction('press', 14, 2, 0);
    expect(events).toHaveLength(0);
  });
});
```

### 7.7 Integration: RenderClipRect Hit Testing

```typescript
describe('RenderClipRect hit testing', () => {
  it('should reject hits outside clip bounds even for overflowing children', () => {
    const clip = createClipRect(20, 10);
    const child = createTestRenderBox(30, 20);  // larger than clip
    child.offset = Offset.zero;
    clip.child = child;

    const result = new BoxHitTestResult();
    clip.hitTest(result, new Offset(25, 5));  // within child but outside clip
    expect(result.path).toHaveLength(0);
  });

  it('should accept hits inside clip bounds', () => {
    const clip = createClipRect(20, 10);
    const child = createTestRenderBox(30, 20);
    child.offset = Offset.zero;
    clip.child = child;

    const result = new BoxHitTestResult();
    clip.hitTest(result, new Offset(15, 5));  // within both clip and child
    expect(result.path.length).toBeGreaterThanOrEqual(1);
  });
});
```

---

## 8. Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `src/framework/render-object.ts` | 1 | Add `allowHitTestOutsideBounds` to `RenderObject`; add `hitTest()`, `hitTestSelf()`, `hitTestChildren()` to `RenderBox`; add `hitTestChildren()` override to `ContainerRenderBox` |
| `src/input/hit-test.ts` | 1, 3 | Phase 1: add `BoxHitTestResult`, `BoxHitTestEntry`. Phase 3: deprecate then remove free functions and old interfaces |
| `src/input/mouse-manager.ts` | 2 | Replace `_hitTest()` with `RenderBox.hitTest()` calls; remove lazy require; remove local interface; rewrite `reestablishHoverState()` and `dispatchMouseAction()` |
| `src/widgets/mouse-region.ts` | 1 | Add `hitTestChildren()` override to `RenderMouseRegion` |
| `src/widgets/stack.ts` | 4 | Set `allowHitTestOutsideBounds = true` on `RenderStack` |
| `src/widgets/clip-rect.ts` | 4 | Override `hitTest()` on `RenderClipRect` |
| `src/input/__tests__/event-dispatcher.test.ts` | 3 | Migrate hitTest section (lines 626-769) to method-based API |
| `src/input/__tests__/mouse-manager.test.ts` | 2, 4 | Add new tests for unified protocol and `allowHitTestOutsideBounds` |
| `src/framework/__tests__/render-object.test.ts` | 1 | Add tests for `hitTest()`, `hitTestSelf()`, `hitTestChildren()` on `RenderBox` |

All paths are relative to `/packages/flitter-core/`.

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Result ordering differs (parent-before-child vs child-before-parent) | High | Medium | Validate ordering in Phase 1 parallel tests; adjust `MouseManager` iteration direction to match |
| Opaque filtering behavior changes for overlapping siblings | Medium | Low | Add explicit overlapping-region test cases; current codebase has minimal overlapping usage |
| Circular dependency between hit-test types and render-object | Medium | Medium | Use Option C (inline in `render-object.ts`) or Option A (separate file) |
| Non-RenderBox nodes break with method-based hitTest | Low | Low | All production render objects extend `RenderBox`; add guard in `ContainerRenderBox.hitTestChildren()` |
| Performance regression from virtual dispatch | Low | Low | TUI trees are small (hundreds of nodes); benchmark before/after |
| `cursor` z-ordering changes due to registration order | Medium | Low | Verify cursor tests pass; the `updateCursor()` iterates `_hoveredRegions` set which preserves insertion order |

---

## 10. Estimated Effort

| Phase | Work | Hours | Dependency |
|-------|------|-------|------------|
| Phase 1 | Add methods + types to render object hierarchy | 2-3h | None |
| Phase 2 | Rewrite MouseManager to delegate | 2-3h | Phase 1 |
| Phase 3 | Remove deprecated free functions + migrate tests | 1h | Phase 2 |
| Phase 4 | Subclass overrides (ClipRect, Stack) | 1-2h | Phase 1 |
| **Total** | | **6-9h** | |

Phases 1 and 4 can run in parallel. Phase 2 depends on Phase 1. Phase 3 depends on Phase 2.

---

## 11. Relationship to Gap 13

This document (Gap 22/R12) and Gap 13 (`13-render-object-hit-test.md`) describe the same
fundamental work from different angles:

- **Gap 22 (this document):** Focuses on the duplication diagnosis -- why two implementations
  exist, how they differ, and why unification is necessary. Provides the motivating analysis
  and behavioral validation matrix.

- **Gap 13:** Provides the comprehensive implementation specification with full code examples,
  type definitions, and detailed file-by-file change descriptions.

Implementation should follow Gap 13's phased plan, using this document as the motivating
analysis and behavioral validation reference.

---

## 12. Summary of Recommendations

1. **Move hit-test protocol onto `RenderBox`** as `hitTest()`, `hitTestSelf()`,
   `hitTestChildren()` virtual methods, matching the Amp `j9.hitTest()` architecture exactly.

2. **Refactor `MouseManager` to be a coordinator** that calls `root.hitTest()` and processes
   the result, removing its internal DFS traversal entirely.

3. **Delete the `_hitTest()` private method and the lazy `require()` hack** from
   `MouseManager`, replacing them with a direct import of `RenderMouseRegion`.

4. **Process `opaque` semantics in `MouseManager` post-traversal**, not during tree walk.
   This matches Amp and simplifies the render tree protocol.

5. **Add `allowHitTestOutsideBounds`** to `RenderObject` and set it on `RenderStack`,
   matching the Amp `n_` / `hF` pattern.

6. **Deprecate then remove `hit-test.ts` free functions.** Evolve the file into the home
   for `BoxHitTestResult` and `BoxHitTestEntry`, or move those types into `render-object.ts`
   to avoid circular dependencies.

7. **Validate behavioral differences carefully.** The two implementations differ in sibling
   short-circuiting, result ordering, and opaque handling. Phase 1 parallel validation tests
   ensure the new protocol produces equivalent externally-observable behavior before the old
   code is removed.
