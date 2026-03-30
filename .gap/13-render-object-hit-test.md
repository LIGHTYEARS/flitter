# Gap R03: Unify Hit Testing onto RenderObject

## Status: Proposal
## Affected packages: `flitter-core`
## Companion gaps: R01 (RelayoutBoundary), R02 (RepaintBoundary)

---

## 1. Problem Statement

In Flutter, hit testing is a first-class protocol on `RenderObject` itself. Every `RenderBox` implements `hitTest()`, `hitTestChildren()`, and `hitTestSelf()` as virtual methods. The render tree owns its own hit-test traversal, and a `BoxHitTestResult` accumulates entries with paint-transform-aware coordinate mapping as it walks the tree.

In flitter today, hit testing is split across two disconnected systems:

1. **`hit-test.ts`** -- A standalone module with free functions (`hitTest()`, `hitTestSelf()`) that walk the render tree externally. Used in tests (see `event-dispatcher.test.ts` lines 626-769) but not wired into the live event pipeline.
2. **`MouseManager._hitTest()`** -- A private method on the `MouseManager` singleton that performs its own independent DFS traversal looking specifically for `RenderMouseRegion` instances.

Neither system places hit-test logic on `RenderObject` itself. This creates three concrete problems:

- **No polymorphic override**: A custom `RenderBox` subclass cannot customize its own hit-test behavior. For example, `RenderClipRect` should reject hits outside its clip region, and `RenderStack` with `allowHitTestOutsideBounds = true` should pass hits through to children even when outside its own bounds. Today neither can do this.
- **Duplicated traversal logic**: `MouseManager._hitTest()` and `hit-test.ts._hitTestNode()` both implement their own DFS with offset accumulation. They have subtly different semantics (one collects `HitTestEntry[]` with `depth`, the other collects a `path[]` with `localX/localY`). The free-function version in `hit-test.ts` uses `break` on the first front-most child hit (line 92), while `MouseManager._hitTest()` iterates all children unless an opaque region blocks further traversal (lines 295-310). These two code paths will inevitably diverge further.
- **Tight coupling to RenderMouseRegion**: The `MouseManager` uses `instanceof` checks and a lazy `require()` (via `getRenderMouseRegionClass()` at line 9-17) to detect `RenderMouseRegion`. This prevents any other render object type from participating in mouse event dispatch.

### 1.1 What the Amp Reference Shows

The Amp binary's `j9` (RenderBox) class includes a `hitTest()` method directly on the render object (`.reference/render-tree.md` lines 274-290):

```javascript
// Amp: j9.hitTest(g, t, b = 0, s = 0)
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

Key observations from the Amp source:

- `hitTest()` is a **method on `j9` (RenderBox)**, not a free function or something owned by MouseManager.
- The `n_` (RenderObject) base class declares `allowHitTestOutsideBounds = !1` (`.reference/render-tree.md` line 50).
- The result accumulator `g` has an `addWithPaintOffset(renderObject, offset, position)` method.
- Children are iterated in **reverse order** (back-to-front, matching paint order for z-correctness).
- `RenderStack` (`hF`) sets `allowHitTestOutsideBounds = true` so positioned children outside the stack's bounds can still receive hits.
- Amp does NOT short-circuit child iteration: all children are tested unconditionally within a given parent's `hitTest()`.

### 1.2 What the Amp MouseManager (Pg) Shows

The Amp `Pg` class (our `MouseManager`) is a coordinator, not a traverser. In Amp, `Pg.reestablishHoverState()` calls `rootRenderObject.hitTest(result, position)` -- it delegates the actual tree walk to the render tree. Flitter's current `MouseManager._hitTest()` (lines 246-314) inverts this responsibility by implementing its own DFS internally.

---

## 2. Current Architecture Analysis

### 2.1 Free-Function Hit Test (`/packages/flitter-core/src/input/hit-test.ts`)

This module exports two functions:

```typescript
export function hitTest(root: RenderObject, x: number, y: number): HitTestResult;
export function hitTestSelf(renderObject: RenderBox, localX: number, localY: number): boolean;
```

The `hitTest()` function performs a recursive DFS from `root`, accumulating parent offsets and building a `path` array ordered deepest-first. It handles both `ContainerRenderBox` (using `.children` directly) and generic `RenderObject` (using `visitChildren`). It **breaks on the first front-most child hit** (line 92: `break;`), which is semantically different from the Amp code that always tests all children.

The `HitTestResult` interface:

```typescript
export interface HitTestResult {
  path: HitTestEntry[];  // deepest first
}
export interface HitTestEntry {
  renderObject: RenderObject;
  localX: number;
  localY: number;
}
```

This module is well-tested (see `event-dispatcher.test.ts` lines 626-769) but is **not used anywhere in the live event dispatch pipeline**. It is effectively dead code in production.

### 2.2 MouseManager Hit Test (`/packages/flitter-core/src/input/mouse-manager.ts`)

The `MouseManager` singleton performs two kinds of hit tests:

1. **`reestablishHoverState()`** (called as post-frame callback, line 193): DFS walk to find all `RenderMouseRegion` instances at `_lastPosition`, then diff against `_hoveredRegions` to fire `enter`/`exit` events.
2. **`dispatchMouseAction()`** (called on press/release/scroll, line 329): DFS walk to find all `RenderMouseRegion` instances at the event position, then dispatch to the deepest region with a matching handler.

Both use the private `_hitTest()` method (line 246) which:

- Uses `instanceof` check against a lazily-required `RenderMouseRegion` class (line 269)
- Accumulates global offsets manually via `parentOffsetX`/`parentOffsetY` parameters
- Tracks `depth` for z-ordering
- Respects `RenderMouseRegion.opaque` to block hits to siblings behind an opaque region (lines 280, 303-309)
- Returns `boolean` (whether an opaque hit occurred)
- Collects results into `HitTestEntry[]` where each entry is `{ region: RenderMouseRegion, depth: number }`

### 2.3 Semantic Differences Between the Two Systems

| Aspect | `hit-test.ts` (free function) | `MouseManager._hitTest()` |
|--------|-------------------------------|---------------------------|
| Traversal scope | All `RenderBox` nodes | Only `RenderMouseRegion` |
| Child iteration | Breaks on first front-most child hit | Tests all children (unless opaque blocks) |
| Result format | `{ renderObject, localX, localY }` | `{ region, depth }` |
| Coordinate space | Local coordinates per node | Global screen coordinates only |
| Opaque handling | None | Returns `true` to parent loop which `break`s |
| Production use | None (test-only dead code) | Active -- all mouse events go through here |

### 2.4 Wiring Through WidgetsBinding

The binding (`/packages/flitter-core/src/framework/binding.ts`) wires things together:

1. `setupEventHandlers()` (line 802) registers a mouse handler on `EventDispatcher` that calls `mouseManager.updatePosition()` and `mouseManager.dispatchMouseAction()`.
2. `attachRootWidget()` (line 447) calls `mouseManager.setRootRenderObject(rootRO)` to provide the tree root.
3. The render-phase frame callback (line 314) calls `mouseManager.reestablishHoverState()` as a post-frame action.
4. `drawFrameSync()` (line 682) mirrors this for test use.

### 2.5 The `allowHitTestOutsideBounds` Field

The Amp `n_` (RenderObject) base class declares `allowHitTestOutsideBounds = !1` (`.reference/render-tree.md` line 50). This field is currently **absent** from flitter's `RenderObject`. It is used by `RenderStack` (`hF`) which sets it to `true` so positioned children that overflow the stack's bounds can still be hit-tested.

### 2.6 Existing `RenderClipRect` and `RenderStack`

Both `RenderClipRect` (`/packages/flitter-core/src/widgets/clip-rect.ts`) and `RenderStack` (`/packages/flitter-core/src/widgets/stack.ts`) exist in the codebase but have **no hit-test overrides**. `RenderStack` does not set `allowHitTestOutsideBounds`. `RenderClipRect` does not prevent hit-testing outside its clip region. Both are bugs that this proposal would fix.

---

## 3. Proposed Solution: `hitTest()` as a RenderBox Method

### 3.1 Design Principles

1. **Amp fidelity**: Match the Amp `j9.hitTest(result, position, parentOffsetX, parentOffsetY)` signature as closely as TypeScript allows.
2. **Polymorphic override**: Any `RenderBox` subclass can override `hitTest()`, `hitTestChildren()`, and `hitTestSelf()` to customize behavior.
3. **Single traversal path**: Both hover state reconciliation and action dispatch use the same `hitTest()` method on `RenderBox`.
4. **MouseManager becomes a coordinator, not a traverser**: `MouseManager` calls `rootRenderObject.hitTest(result, position)` and processes the result, rather than implementing its own DFS.

### 3.2 New Types: `BoxHitTestResult` and `BoxHitTestEntry`

```typescript
// /packages/flitter-core/src/input/hit-test.ts (revised -- add alongside existing types)

/**
 * A single entry in a hit-test result.
 * Amp ref: entries collected by g.addWithPaintOffset()
 */
export class BoxHitTestEntry {
  constructor(
    /** The render object that was hit. */
    public readonly target: RenderObject,
    /** The test position in this object's local coordinate space. */
    public readonly localPosition: Offset,
  ) {}
}

/**
 * Accumulates hit-test entries during a tree walk.
 * Passed down through hitTest() calls on RenderBox nodes.
 *
 * Amp ref: the `g` parameter in j9.hitTest(g, t, b, s)
 */
export class BoxHitTestResult {
  private readonly _path: BoxHitTestEntry[] = [];

  /** The hit-test path, ordered from deepest to shallowest. */
  get path(): ReadonlyArray<BoxHitTestEntry> {
    return this._path;
  }

  /**
   * Add a render object to the hit-test result with its paint offset.
   *
   * Amp ref: g.addWithPaintOffset(this, { x: a, y: r }, t)
   *
   * @param target   The render object that was hit
   * @param offset   The accumulated paint offset of the target (screen-space top-left)
   * @param position The original test position in screen coordinates
   */
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

### 3.3 Changes to `RenderObject` Base Class

Add the `allowHitTestOutsideBounds` field to match Amp's `n_`:

```typescript
// In RenderObject (/packages/flitter-core/src/framework/render-object.ts)
export abstract class RenderObject {
  // ... existing fields ...

  /**
   * Whether hit testing should be performed on children even when the
   * test position is outside this object's own bounds.
   *
   * Used by RenderStack to allow positioned children that overflow
   * the stack's bounds to still receive hit events.
   *
   * Amp ref: n_.allowHitTestOutsideBounds = !1
   */
  allowHitTestOutsideBounds: boolean = false;
}
```

### 3.4 Changes to `RenderBox`

Add `hitTest()`, `hitTestSelf()`, and `hitTestChildren()` as virtual methods:

```typescript
// In RenderBox (/packages/flitter-core/src/framework/render-object.ts)
export abstract class RenderBox extends RenderObject {
  // ... existing fields and methods ...

  /**
   * Determine whether the given screen position hits this render object.
   *
   * Computes this node's screen-space bounds from parentOffsetX/Y + own offset,
   * tests containment, and if hit, adds self to the result and recurses into children.
   *
   * Subclasses override this to customize hit-test behavior (e.g., clipping).
   *
   * Amp ref: j9.hitTest(g, t, b = 0, s = 0)
   *   g = BoxHitTestResult, t = position, b = parentOffsetX, s = parentOffsetY
   *
   * @param result         Accumulator for hit entries
   * @param position       The test position in screen coordinates { col, row }
   * @param parentOffsetX  Accumulated X offset from ancestors (default: 0)
   * @param parentOffsetY  Accumulated Y offset from ancestors (default: 0)
   * @returns true if this object or a descendant was hit
   */
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
      // Self is hit -- add to result and test children
      result.addWithPaintOffset(this, new Offset(globalX, globalY), position);
      this.hitTestChildren(result, position, globalX, globalY);
      return true;
    }

    if (this.allowHitTestOutsideBounds) {
      // Even though self is not hit, children may extend beyond our bounds
      this.hitTestChildren(result, position, globalX, globalY);
    }

    return false;
  }

  /**
   * Test whether the given local-space point falls within this object's bounds.
   * Subclasses can override to implement non-rectangular hit regions.
   *
   * The default implementation checks against the rectangular bounds
   * defined by this.size.
   *
   * @param localX X in this object's local coordinate space
   * @param localY Y in this object's local coordinate space
   * @returns true if the point is within bounds
   */
  hitTestSelf(localX: number, localY: number): boolean {
    return localX >= 0 && localX < this.size.width
        && localY >= 0 && localY < this.size.height;
  }

  /**
   * Hit-test this object's children in reverse paint order (front to back).
   * Subclasses override this to customize child traversal.
   *
   * The base RenderBox implementation is a no-op (leaf node has no children).
   *
   * @param result         Accumulator for hit entries
   * @param position       Screen-space test position
   * @param parentOffsetX  This object's accumulated X offset
   * @param parentOffsetY  This object's accumulated Y offset
   */
  hitTestChildren(
    _result: BoxHitTestResult,
    _position: Offset,
    _parentOffsetX: number,
    _parentOffsetY: number,
  ): void {
    // Default: no children to test (leaf node)
  }
}
```

### 3.5 Changes to `ContainerRenderBox`

Override `hitTestChildren()` to iterate the children array in reverse:

```typescript
// In ContainerRenderBox (/packages/flitter-core/src/framework/render-object.ts)
export abstract class ContainerRenderBox extends RenderBox {
  // ... existing fields and methods ...

  /**
   * Hit-test children in reverse order (last painted = topmost = tested first).
   *
   * Amp ref: for (let l = this.children.length - 1; l >= 0; l--)
   *            this.children[l].hitTest(g, t, a, r);
   */
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
}
```

### 3.6 Changes to `RenderMouseRegion`

Override `hitTestChildren()` to pass through to its single child:

```typescript
// In RenderMouseRegion (/packages/flitter-core/src/widgets/mouse-region.ts)
export class RenderMouseRegion extends RenderBox {
  // ... existing fields ...

  /**
   * Hit-test the single child of this mouse region.
   * The hitTest() method is inherited from RenderBox and does not need
   * an override -- the default behavior of adding self to the result
   * and calling hitTestChildren() is correct.
   *
   * The opaque flag is NOT handled during traversal. It is a post-processing
   * concern for MouseManager when it filters the hit-test result.
   */
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
}
```

Note: `RenderMouseRegion.hitTest()` does NOT need an override. The inherited `RenderBox.hitTest()` will:
1. Compute global bounds
2. Call `hitTestSelf()` to check containment
3. Call `result.addWithPaintOffset()` if hit
4. Call `hitTestChildren()` which delegates to the single child

The `opaque` flag is consumed by `MouseManager` during post-processing, not during tree traversal. This matches the Amp pattern where `j9.hitTest()` always tests all children unconditionally.

### 3.7 Changes to `MouseManager`

Replace the private `_hitTest()` DFS with a call to `RenderBox.hitTest()`:

```typescript
// In MouseManager (/packages/flitter-core/src/input/mouse-manager.ts) -- revised

import { BoxHitTestResult } from './hit-test';
import { Offset } from '../core/types';

// Remove: getRenderMouseRegionClass() helper
// Remove: HitTestEntry interface (local to MouseManager)
// Remove: private _hitTest() method

reestablishHoverState(): void {
  if (this._disposed) return;
  if (this._lastPosition.x < 0 || this._lastPosition.y < 0) return;
  if (!this._rootRenderObject) return;

  // Use the RenderObject's own hitTest protocol
  const result = new BoxHitTestResult();
  const root = this._rootRenderObject as RenderBox;
  const position = new Offset(this._lastPosition.x, this._lastPosition.y);

  root.hitTest(result, position, 0, 0);

  // Extract RenderMouseRegion instances from the hit path.
  // The path is ordered deepest-first (entries added by child before parent
  // in DFS order). We walk the path and stop at the first opaque
  // RenderMouseRegion to implement opaque blocking.
  const hitRegions = new Set<RenderMouseRegion>();
  for (const entry of result.path) {
    if (entry.target instanceof RenderMouseRegion) {
      hitRegions.add(entry.target as RenderMouseRegion);
      // NOTE: opaque filtering could be added here in the future
      // if we need to stop accumulating regions at an opaque boundary.
    }
  }

  // Unregister regions that are no longer hit
  for (const region of [...this._hoveredRegions]) {
    if (!hitRegions.has(region)) {
      this.unregisterHover(region);
    }
  }

  // Register newly hit regions (in path order for z-correct cursor)
  for (const entry of result.path) {
    if (entry.target instanceof RenderMouseRegion) {
      const region = entry.target as RenderMouseRegion;
      if (!this._hoveredRegions.has(region)) {
        this.registerHover(region);
      }
    }
  }
}

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
  const position = new Offset(x, y);

  root.hitTest(result, position, 0, 0);

  // Walk the result path to find the deepest RenderMouseRegion
  // with a matching handler. path[0] is deepest.
  const event = { x, y, button };
  for (const entry of result.path) {
    if (!(entry.target instanceof RenderMouseRegion)) continue;
    const region = entry.target as RenderMouseRegion;

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

### 3.8 Handling Opaque Regions

The Amp approach to opaque region blocking is structural: because `hitTest()` iterates children in reverse paint order and each child's `hitTest()` returns a boolean, a parent can choose to stop iterating when a child returns `true`. However, the Amp code does **not** actually do this -- it always iterates all children.

The opaque blocking in flitter's current `MouseManager._hitTest()` is achieved by returning `true` from the DFS when an opaque `RenderMouseRegion` is hit, causing the parent loop to `break` (lines 303-309).

To preserve this semantic with the new protocol, we have two options:

**Option A (Recommended): Process opaque in MouseManager post-traversal.**
The `BoxHitTestResult.path` contains entries in depth-first order (deepest first, since children add themselves before the parent returns). When `MouseManager` processes the result, it walks the path and, for purposes of determining z-order for event dispatch, uses the inherent ordering. The `dispatchMouseAction()` already takes the first matching handler (deepest-first walk), which is the correct z-order behavior. For hover state, the opaque flag could be used to filter out regions that are "behind" an opaque region, though in practice the DFS ordering already ensures correct behavior for non-overlapping siblings.

**Option B: Override `hitTestChildren()` to support short-circuiting.**
A custom `hitTestChildren()` could check child `hitTest()` return values and stop iteration when a hit is found in an opaque subtree. This adds complexity and does not match the Amp code pattern.

**Option C: Add opaque-aware iteration to `ContainerRenderBox.hitTestChildren()`.**
Use the `hitTest()` return value to skip remaining siblings when a hit is found. This would make `ContainerRenderBox` opaque-aware but still does not match Amp's behavior (which tests all children).

Option A is recommended because:
- It matches the Amp code which does not short-circuit child iteration
- It keeps the `hitTest()` protocol simple and composable
- The opaque filtering is a MouseManager concern, not a render tree concern
- The existing behavior (deepest handler wins) is already correct for the common case

---

## 4. Subclass Override Examples

### 4.1 RenderClipRect

`RenderClipRect` (`nv` in Amp, see `/packages/flitter-core/src/widgets/clip-rect.ts`) should reject hits outside its clip bounds:

```typescript
class RenderClipRect extends RenderBox {
  hitTest(
    result: BoxHitTestResult,
    position: Offset,
    parentOffsetX: number = 0,
    parentOffsetY: number = 0,
  ): boolean {
    // RenderClipRect NEVER allows hit testing outside its own bounds,
    // regardless of allowHitTestOutsideBounds on children.
    // This is the fundamental semantic of clipping: content outside
    // the clip region does not exist for interaction purposes.
    const globalX = parentOffsetX + this.offset.col;
    const globalY = parentOffsetY + this.offset.row;

    if (!this.hitTestSelf(position.col - globalX, position.row - globalY)) {
      return false; // Clipped -- no hit testing at all
    }

    result.addWithPaintOffset(this, new Offset(globalX, globalY), position);
    this.hitTestChildren(result, position, globalX, globalY);
    return true;
  }
}
```

### 4.2 RenderStack

`RenderStack` (`hF` in Amp, see `/packages/flitter-core/src/widgets/stack.ts`) sets `allowHitTestOutsideBounds = true`:

```typescript
class RenderStack extends ContainerRenderBox {
  constructor() {
    super();
    // Amp ref: hF.allowHitTestOutsideBounds = true
    this.allowHitTestOutsideBounds = true;
  }
  // hitTest() inherited from RenderBox already handles allowHitTestOutsideBounds
}
```

### 4.3 RenderPadding / RenderDecoratedBox

These pass through to children with adjusted offsets. The default `hitTest()` on `RenderBox` already handles this correctly because each child's `offset` accounts for padding/decoration insets.

### 4.4 Future: RenderAbsorbPointer

A future `RenderAbsorbPointer` could override `hitTest()` to always return `true` (absorbing all hits) without adding itself or children to the result:

```typescript
class RenderAbsorbPointer extends RenderBox {
  hitTest(
    result: BoxHitTestResult,
    position: Offset,
    parentOffsetX: number = 0,
    parentOffsetY: number = 0,
  ): boolean {
    // Absorb the hit -- return true but do not add anything to the result
    const globalX = parentOffsetX + this.offset.col;
    const globalY = parentOffsetY + this.offset.row;
    return this.hitTestSelf(position.col - globalX, position.row - globalY);
  }
}
```

---

## 5. Migration Plan

### Phase 1: Add Methods to RenderObject/RenderBox (Non-Breaking)

These changes are purely additive. No existing behavior is altered.

1. Add `allowHitTestOutsideBounds` field to `RenderObject` (default `false`).
2. Add `BoxHitTestEntry` class and `BoxHitTestResult` class to `hit-test.ts`.
3. Add `hitTest()`, `hitTestSelf()`, `hitTestChildren()` to `RenderBox`.
4. Add `hitTestChildren()` override to `ContainerRenderBox`.
5. Add `hitTestChildren()` override to `RenderMouseRegion`.

All existing code continues to work because `MouseManager._hitTest()` is unchanged. Both the old `_hitTest()` and the new `RenderBox.hitTest()` can coexist.

**Validation**: Run all existing tests. Add new tests that call `RenderBox.hitTest()` directly and verify they produce the same results as the old free-function `hitTest()` and `MouseManager._hitTest()`.

### Phase 2: Wire MouseManager to Use RenderBox.hitTest()

1. Import `BoxHitTestResult` and `Offset` into `mouse-manager.ts`.
2. Replace `reestablishHoverState()` to call `root.hitTest(result, position, 0, 0)` instead of `this._hitTest(...)`.
3. Replace `dispatchMouseAction()` similarly.
4. Remove the private `_hitTest()` method.
5. Remove the `getRenderMouseRegionClass()` lazy-require helper.
6. Remove the `HitTestEntry` interface (local to MouseManager -- the `{ region, depth }` one).

**Validation**: All `mouse-manager.test.ts` tests must pass unchanged. These tests exercise the public API of `MouseManager` (hover, dispatch, cursor), so they validate that the new traversal path produces the same externally-observable behavior.

### Phase 3: Deprecate and Remove Free Functions

1. Mark `hitTest()` and `hitTestSelf()` in `hit-test.ts` as `@deprecated` with JSDoc.
2. Update `event-dispatcher.test.ts` lines 626-769 to use `RenderBox.hitTest()` directly.
3. Remove the deprecated free functions after all call sites are migrated.

### Phase 4: Add Overrides to Existing RenderBox Subclasses

1. `RenderClipRect` -- override `hitTest()` to reject hits outside clip bounds.
2. `RenderStack` -- set `allowHitTestOutsideBounds = true` in constructor.
3. Any other subclass that requires custom hit-test behavior.

---

## 6. Testing Strategy

### 6.1 Unit Tests for `BoxHitTestResult`

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
    // Target is at screen (3, 7), test position is (8, 10)
    // Local position should be (8-3, 10-7) = (5, 3)
    result.addWithPaintOffset(target, new Offset(3, 7), new Offset(8, 10));
    expect(result.path[0].localPosition.col).toBe(5);
    expect(result.path[0].localPosition.row).toBe(3);
  });

  it('should maintain insertion order in path', () => {
    const result = new BoxHitTestResult();
    const child = createTestRenderBox(5, 5);
    const parent = createTestRenderBox(20, 20);
    result.addWithPaintOffset(child, new Offset(2, 2), new Offset(4, 4));
    result.addWithPaintOffset(parent, new Offset(0, 0), new Offset(4, 4));
    expect(result.path).toHaveLength(2);
    expect(result.path[0].target).toBe(child);
    expect(result.path[1].target).toBe(parent);
  });
});
```

### 6.2 Unit Tests for `RenderBox.hitTest()`

Port and extend the existing `hit-test.ts` tests to use the method-based protocol:

```typescript
describe('RenderBox.hitTest()', () => {
  it('should add self to result when point is within bounds', () => {
    const box = createTestRenderBox(40, 20);
    box.offset = Offset.zero;
    const result = new BoxHitTestResult();
    const hit = box.hitTest(result, new Offset(10, 5));
    expect(hit).toBe(true);
    expect(result.path).toHaveLength(1);
    expect(result.path[0].target).toBe(box);
  });

  it('should return false and add nothing when point is outside bounds', () => {
    const box = createTestRenderBox(10, 10);
    box.offset = Offset.zero;
    const result = new BoxHitTestResult();
    const hit = box.hitTest(result, new Offset(15, 5));
    expect(hit).toBe(false);
    expect(result.path).toHaveLength(0);
  });

  it('should accumulate parent offsets correctly for nested boxes', () => {
    const root = createTestContainer(80, 24);
    const child = createTestRenderBox(20, 10);
    child.offset = new Offset(5, 3);
    root.insert(child);
    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(10, 5));
    // Both root (at 0,0) and child (at 5,3) should be hit
    expect(result.path.length).toBeGreaterThanOrEqual(2);
  });

  it('should respect allowHitTestOutsideBounds = true', () => {
    const parent = createTestContainer(10, 10);
    parent.allowHitTestOutsideBounds = true;
    const child = createTestRenderBox(5, 5);
    child.offset = new Offset(12, 0); // child extends beyond parent bounds
    parent.insert(child);
    const result = new BoxHitTestResult();
    parent.hitTest(result, new Offset(14, 2));
    // Parent is NOT hit (14,2 is outside 10x10)
    // But child IS hit (14,2 is inside child at 12,0 with size 5x5)
    const childEntry = result.path.find(e => e.target === child);
    expect(childEntry).toBeDefined();
  });

  it('should NOT recurse into children when outside bounds and allowHitTestOutsideBounds = false', () => {
    const parent = createTestContainer(10, 10);
    parent.allowHitTestOutsideBounds = false;
    const child = createTestRenderBox(5, 5);
    child.offset = new Offset(12, 0);
    parent.insert(child);
    const result = new BoxHitTestResult();
    parent.hitTest(result, new Offset(14, 2));
    expect(result.path).toHaveLength(0);
  });

  it('should iterate children in reverse order (deepest entries appear first in path)', () => {
    const root = createTestContainer(80, 24);
    const a = createTestRenderBox(10, 10);
    a.offset = new Offset(0, 0);
    const b = createTestRenderBox(10, 10);
    b.offset = new Offset(0, 0);
    root.insert(a);
    root.insert(b); // b is last child = painted last = topmost
    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(5, 5));
    // In reverse order, b is tested first.
    // Both are added to the result since they are at the same position.
    const targets = result.path.map(e => e.target);
    expect(targets.indexOf(b)).toBeLessThan(targets.indexOf(a));
  });
});
```

### 6.3 Unit Tests for `RenderBox.hitTestSelf()`

```typescript
describe('RenderBox.hitTestSelf()', () => {
  it('should return true for point at (0, 0)', () => {
    const box = createTestRenderBox(10, 5);
    expect(box.hitTestSelf(0, 0)).toBe(true);
  });

  it('should return true for point at (width-1, height-1)', () => {
    const box = createTestRenderBox(10, 5);
    expect(box.hitTestSelf(9, 4)).toBe(true);
  });

  it('should return false for point at (width, 0)', () => {
    const box = createTestRenderBox(10, 5);
    expect(box.hitTestSelf(10, 0)).toBe(false);
  });

  it('should return false for negative coordinates', () => {
    const box = createTestRenderBox(10, 5);
    expect(box.hitTestSelf(-1, 0)).toBe(false);
    expect(box.hitTestSelf(0, -1)).toBe(false);
  });

  it('should return true for zero-size box at (0,0) only', () => {
    const box = createTestRenderBox(1, 1);
    expect(box.hitTestSelf(0, 0)).toBe(true);
    expect(box.hitTestSelf(1, 0)).toBe(false);
  });
});
```

### 6.4 Unit Tests for `ContainerRenderBox.hitTestChildren()`

```typescript
describe('ContainerRenderBox.hitTestChildren()', () => {
  it('should test children in reverse order (last child first)', () => {
    const root = createTestContainer(80, 24);
    const callOrder: string[] = [];
    // Create children that record when hitTest is called
    const a = createSpyRenderBox(10, 10, () => callOrder.push('a'));
    const b = createSpyRenderBox(10, 10, () => callOrder.push('b'));
    a.offset = new Offset(0, 0);
    b.offset = new Offset(0, 0);
    root.insert(a);
    root.insert(b);
    const result = new BoxHitTestResult();
    root.hitTestChildren(result, new Offset(5, 5), 0, 0);
    expect(callOrder).toEqual(['b', 'a']); // reverse order
  });

  it('should test ALL children (no early exit in base class)', () => {
    const root = createTestContainer(80, 24);
    const callOrder: string[] = [];
    const a = createSpyRenderBox(10, 10, () => callOrder.push('a'));
    const b = createSpyRenderBox(10, 10, () => callOrder.push('b'));
    const c = createSpyRenderBox(10, 10, () => callOrder.push('c'));
    [a, b, c].forEach(child => { child.offset = Offset.zero; root.insert(child); });
    const result = new BoxHitTestResult();
    root.hitTestChildren(result, new Offset(5, 5), 0, 0);
    expect(callOrder).toEqual(['c', 'b', 'a']); // all children tested
  });

  it('should accumulate entries from all hit children', () => {
    const root = createTestContainer(80, 24);
    const a = createTestRenderBox(10, 10);
    const b = createTestRenderBox(10, 10);
    a.offset = new Offset(0, 0);
    b.offset = new Offset(0, 0);
    root.insert(a);
    root.insert(b);
    const result = new BoxHitTestResult();
    root.hitTestChildren(result, new Offset(5, 5), 0, 0);
    expect(result.path.length).toBe(2); // both children hit
  });
});
```

### 6.5 Integration Tests for `RenderMouseRegion.hitTest()`

```typescript
describe('RenderMouseRegion.hitTest()', () => {
  it('should add self to result when mouse is within bounds', () => {
    const region = createRegion({ width: 20, height: 10, col: 5, row: 3 });
    const result = new BoxHitTestResult();
    const hit = region.hitTest(result, new Offset(10, 5));
    expect(hit).toBe(true);
    expect(result.path.some(e => e.target === region)).toBe(true);
  });

  it('should hit-test child through to the result', () => {
    const outer = createRegion({ width: 40, height: 20, col: 0, row: 0 });
    const inner = createRegion({ width: 20, height: 10, col: 5, row: 5 });
    outer.child = inner;
    const result = new BoxHitTestResult();
    outer.hitTest(result, new Offset(10, 10));
    // Both outer and inner should be in the path
    const targets = result.path.map(e => e.target);
    expect(targets).toContain(outer);
    expect(targets).toContain(inner);
    // inner should be before outer (deeper first)
    expect(targets.indexOf(inner)).toBeLessThan(targets.indexOf(outer));
  });

  it('should not add self when mouse is outside bounds', () => {
    const region = createRegion({ width: 10, height: 10, col: 0, row: 0 });
    const result = new BoxHitTestResult();
    const hit = region.hitTest(result, new Offset(50, 50));
    expect(hit).toBe(false);
    expect(result.path).toHaveLength(0);
  });
});
```

### 6.6 Integration Tests for `MouseManager` with New Protocol

```typescript
describe('MouseManager with RenderBox.hitTest()', () => {
  it('should dispatch hover enter/exit using RenderBox.hitTest()', () => {
    // Existing reestablishHoverState tests should pass unchanged
    const mm = MouseManager.instance;
    const enters: MouseRegionEvent[] = [];
    const exits: MouseRegionEvent[] = [];

    const root = createTestContainer(80, 24);
    const region = createRegion({
      width: 20, height: 10, col: 5, row: 3,
      onEnter: (e) => enters.push(e),
      onExit: (e) => exits.push(e),
    });
    root.addTestChild(region);
    mm.setRootRenderObject(root);
    mm.updatePosition(10, 5);
    mm.reestablishHoverState();
    expect(enters).toHaveLength(1);

    mm.updatePosition(50, 50);
    mm.reestablishHoverState();
    expect(exits).toHaveLength(1);
  });

  it('should dispatch click to deepest RenderMouseRegion with onClick', () => {
    // Identical to existing test in mouse-manager.test.ts
  });

  it('should dispatch scroll to deepest RenderMouseRegion with onScroll', () => {
    // Identical to existing test in mouse-manager.test.ts
  });

  it('should handle opaque regions by filtering the result path', () => {
    // Verify that overlapping opaque regions still work correctly
    // The deepest region gets the event, matching current behavior
  });

  it('should handle nested MouseRegions correctly', () => {
    // Inner region gets scroll, outer does not -- existing test
  });

  it('should handle allowHitTestOutsideBounds on ancestor', () => {
    const mm = MouseManager.instance;
    const events: MouseRegionEvent[] = [];
    const stack = createTestContainer(10, 10);
    stack.allowHitTestOutsideBounds = true;
    const region = createRegion({
      width: 5, height: 5, col: 12, row: 0, // extends beyond stack
      onClick: (e) => events.push(e),
    });
    stack.addTestChild(region);
    const root = createTestContainer(80, 24);
    root.addTestChild(stack);
    mm.setRootRenderObject(root);
    mm.dispatchMouseAction('press', 14, 2, 0);
    expect(events).toHaveLength(1);
  });
});
```

### 6.7 Regression Tests

All existing tests in `event-dispatcher.test.ts` (lines 626-769, the hitTest section) and `mouse-manager.test.ts` must continue to pass. The free-function tests can be adapted to call the method-based API while preserving the same assertions.

Key regression scenarios:
- Nested MouseRegions: deepest handler wins
- Non-overlapping siblings: only the one under the cursor fires
- Scroll/press/release outside any region: no dispatch
- Hover enter/exit: fires on crossing region boundaries
- Cursor shape: determined by last registered hovered region with a cursor
- Opaque regions: siblings behind an opaque region are not hovered

---

## 7. Dependency and Import Graph

The new code introduces one new import into `render-object.ts`:

```
render-object.ts  --imports-->  hit-test.ts  (for BoxHitTestResult, BoxHitTestEntry)
hit-test.ts       --imports-->  render-object.ts  (for RenderObject, RenderBox) [EXISTING]
```

This creates a **circular dependency**. To break it:

**Option A (Recommended):** Move `BoxHitTestResult` and `BoxHitTestEntry` into a separate file `hit-test-result.ts` that has NO imports from `render-object.ts`. The `target` field uses a `RenderObject` type import, but since TypeScript uses structural typing for type imports, this can be a forward-declared interface:

```typescript
// hit-test-result.ts
export interface HitTestTarget {
  // Marker -- any render object
}

export class BoxHitTestEntry {
  constructor(
    public readonly target: HitTestTarget,
    public readonly localPosition: Offset,
  ) {}
}
```

Then `render-object.ts` imports from `hit-test-result.ts` (no circular).

**Option B:** Keep everything in `hit-test.ts` but use `import type` for the RenderObject references in `hit-test.ts`. Since `render-object.ts` already imports from `hit-test.ts`, the circular import would need TypeScript's `import type` to avoid runtime issues. This works in practice with bundlers and ts-node but is fragile.

**Option C:** Define `BoxHitTestResult` and `BoxHitTestEntry` directly in `render-object.ts`. This avoids circular imports entirely but makes `render-object.ts` larger and mixes concerns.

Option A is recommended for clean separation. Option C is the simplest fallback if Option A proves over-engineered.

---

## 8. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Breaking existing MouseManager behavior during migration | Medium | Phase 1 is additive-only; Phase 2 runs both paths in parallel during testing before removing the old one |
| Performance regression from deeper call stack (virtual dispatch vs. direct DFS) | Low | TUI render trees are small (hundreds of nodes, not thousands). The overhead of virtual method dispatch is negligible. Benchmarking before/after can confirm. |
| `allowHitTestOutsideBounds` not set correctly on RenderStack | Low | Explicit test coverage for Stack hit-testing with positioned children |
| Circular dependency between `hit-test.ts` and `render-object.ts` | Medium | Use Option A (separate `hit-test-result.ts` file) or Option C (inline in `render-object.ts`) |
| `BoxHitTestResult.path` ordering differs from `MouseManager._hitTest()` depth ordering | Medium | The DFS path ordering is depth-first (deepest entries appear first due to recursion), which matches the current `depth`-sorted ordering. Validate with explicit ordering tests. |
| Opaque region semantics change subtly | Medium | The current code blocks sibling iteration on opaque hit. The new code collects all entries then filters. For non-overlapping cases (the common case), behavior is identical. For overlapping siblings, add explicit test cases. |

---

## 9. Files to Modify

| File | Change |
|------|--------|
| `/packages/flitter-core/src/framework/render-object.ts` | Add `allowHitTestOutsideBounds` to `RenderObject`; add `hitTest()`, `hitTestSelf()`, `hitTestChildren()` to `RenderBox`; add `hitTestChildren()` override to `ContainerRenderBox` |
| `/packages/flitter-core/src/input/hit-test.ts` | Add `BoxHitTestResult`, `BoxHitTestEntry` classes; deprecate free functions |
| `/packages/flitter-core/src/input/mouse-manager.ts` | Replace `_hitTest()` with calls to `RenderBox.hitTest()`; remove `getRenderMouseRegionClass()` lazy loader; remove local `HitTestEntry` interface |
| `/packages/flitter-core/src/widgets/mouse-region.ts` | Add `hitTestChildren()` override to `RenderMouseRegion` |
| `/packages/flitter-core/src/widgets/stack.ts` | Set `allowHitTestOutsideBounds = true` on `RenderStack` constructor |
| `/packages/flitter-core/src/widgets/clip-rect.ts` | Override `hitTest()` on `RenderClipRect` to reject out-of-clip hits |
| `/packages/flitter-core/src/input/__tests__/event-dispatcher.test.ts` | Update hitTest section to use method-based API |
| `/packages/flitter-core/src/input/__tests__/mouse-manager.test.ts` | Add tests for new protocol; verify existing tests pass |
| `/packages/flitter-core/src/framework/__tests__/render-object.test.ts` | Add tests for `hitTest()`, `hitTestSelf()`, `hitTestChildren()` |

---

## 10. Open Questions

1. **Should `hitTest()` on `RenderBox` return a boolean like Amp, or void?** The Amp code returns `!0` / `!1` and the current `MouseManager._hitTest()` uses the return value to implement opaque blocking. If we follow Option A (process opaque in MouseManager), the boolean return is still useful for callers that want to know if anything was hit, but it is not strictly necessary for the opaque logic. **Recommendation:** keep the boolean return for Amp fidelity.

2. **Should `BoxHitTestResult` store the paint offset per entry?** The Amp `g.addWithPaintOffset(this, { x: a, y: r }, t)` stores both the global offset and the position. Our `BoxHitTestEntry` stores `target` and `localPosition`. We could additionally store the global offset for use cases like cursor shape determination. **Recommendation:** store `localPosition` only for now; global offset can be derived if needed by walking the result path and summing ancestor offsets.

3. **Should `hitTestChildren()` return a boolean indicating child hit?** In the Amp code, the parent does not use the child's `hitTest()` return value to short-circuit (all children are always tested). However, a return value would be useful for future optimizations (e.g., opaque short-circuit at the render tree level). **Recommendation:** have `hitTestChildren()` return `void` for simplicity, matching the Amp pattern of always testing all children. This can be changed later if needed.

4. **Where should `BoxHitTestResult` and `BoxHitTestEntry` live?** Three options are outlined in Section 7. **Recommendation:** start with Option C (inline in `render-object.ts`) for simplicity. If the file becomes too large, extract to `hit-test-result.ts` (Option A).

5. **Should the free-function `hitTest()` in `hit-test.ts` be removed immediately or deprecated first?** The free functions are currently tested but not used in production. **Recommendation:** deprecate in Phase 1, remove in Phase 3, giving test authors time to migrate.

---

## 11. Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Add methods (additive) | 2-3 hours | Low |
| Phase 2: Wire MouseManager | 2-3 hours | Medium |
| Phase 3: Deprecate free functions | 1 hour | Low |
| Phase 4: Subclass overrides (ClipRect, Stack) | 1-2 hours | Low |
| **Total** | **6-9 hours** | - |

Phase 1 and Phase 4 can be done in parallel. Phase 2 depends on Phase 1. Phase 3 depends on Phase 2.
