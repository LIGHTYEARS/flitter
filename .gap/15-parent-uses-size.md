# Gap R05: Add `parentUsesSize` Parameter to `layout()` for RelayoutBoundary Optimization

## Status: Proposal
## Affected packages: `flitter-core`
## Prerequisites: Gap R01 (RelayoutBoundary) required for full benefit; Gap R04 (sizedByParent) recommended

---

## 1. Current Behavior Analysis

### 1.1 The Single-Argument `layout()` Signature

In the current codebase, `RenderBox.layout()` accepts only a single parameter -- the `BoxConstraints` object. There is no mechanism for a parent to communicate whether it depends on the child's resulting size.

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`** (lines 262-270)

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

The method performs three operations:
1. Checks whether layout work is needed (constraints unchanged and node is clean).
2. Caches the new constraints and clears the dirty flag.
3. Calls `performLayout()` which computes `this.size` and lays out children.

The header comment on `RenderObject` (line 75) explicitly documents this absence:

```
// - NO parentUsesSize: layout() takes only constraints
```

And the `RenderBox` class comment (line 209) reiterates:

```
// - layout(constraints) is single-arg (no parentUsesSize)
```

### 1.2 How Layout Is Currently Invoked Across the Codebase

A comprehensive search of all `.layout()` call sites in the codebase reveals that every caller passes exactly one argument -- the `BoxConstraints`. Representative examples include:

**`RenderFlex.performLayout()`** (`/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-flex.ts`):
```typescript
child.layout(innerConstraints);
```

**`RenderPadding.performLayout()`** (`/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-padded.ts`):
```typescript
this._child.layout(innerConstraints);
```

**`RenderScrollViewport.performLayout()`** (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scroll-view.ts`):
```typescript
this._child.layout(childConstraints);
```

**`RenderConstrainedBox.performLayout()`** (`/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-constrained.ts`):
```typescript
this._child.layout(enforced);
```

**`PipelineOwner.flushLayout()`** (`/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts`, line 133):
```typescript
this._rootRenderObject.layout(this._rootConstraints);
```

**`RenderTable.performLayout()`** (`/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-table.ts`):
```typescript
child.layout(new BoxConstraints({ ... }));
```

No caller currently passes a second argument. This means the introduction of `parentUsesSize` as an optional parameter with a default of `true` is fully backward-compatible -- all existing call sites will continue to function identically.

### 1.3 The `markNeedsLayout()` Propagation Problem

Without `parentUsesSize`, there is no way for a parent to declare that it does not depend on a child's resulting size. This means the framework has no basis on which to establish the child as a relayout boundary except through constraint tightness.

From `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts` (lines 145-160):

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

Every dirty mark propagates unconditionally to the root. Even when a parent like a scroll viewport lays out its child with loose constraints and then completely ignores the child's resulting size for its own sizing, the framework cannot exploit this because it has no signal from the parent about the dependency.

### 1.4 The Amp Reference Position

The Amp CLI binary (`j9` class, `amp-strings.txt:529716`) implements `layout()` as a single-argument method:

```javascript
layout(g) {
  let t = !this._lastConstraints || !g.equals(this._lastConstraints);
  if (!this._needsLayout && !t) return;
  this._lastConstraints = g;
  this._needsLayout = !1;
  this.performLayout();
}
```

The `.reference/render-tree.md` summary table and the `RenderObject` class comments both document this as an intentional simplification:

> **No parentUsesSize**: `layout()` takes only constraints.

This proposal is therefore an **intentional enhancement beyond Amp fidelity**, consistent with the approach taken by Gap R01 (RelayoutBoundary) and Gap R04 (sizedByParent). The design principle remains: **default behavior without the parameter must be identical to Amp**.

### 1.5 The Flutter Reference Architecture

In Flutter, `RenderBox.layout()` has the signature:

```dart
void layout(Constraints constraints, { bool parentUsesSize = false })
```

Note Flutter's default is `false`, meaning a parent must explicitly opt-in to declare that it reads the child's size. When `parentUsesSize` is `false`, the child becomes a relayout boundary (assuming it is not already one for other reasons). When `true`, the parent acknowledges a dependency on the child's size, and layout invalidation in the child must propagate upward through the parent.

**Critical design decision**: For flitter, the default should be `true` (not `false` as in Flutter) to maintain Amp behavioral fidelity. With `parentUsesSize` defaulting to `true`, the framework assumes the worst case -- that the parent depends on the child's size -- which matches the current unconditional propagation behavior. Parents that want the optimization must explicitly opt out by passing `{ parentUsesSize: false }`.

---

## 2. The Problem in Detail

### 2.1 Missed Relayout Boundary Opportunities

Consider a scroll viewport that fills an `Expanded` slot in a `Column`. The viewport receives tight constraints from the `Expanded` (both axes are locked), so the viewport itself becomes a relayout boundary due to constraint tightness (per Gap R01). However, the viewport's child -- the scrollable content -- receives **loose constraints** (unbounded height for vertical scrolling):

```
Column                           (tight 120x40)
  Expanded                       (tight 120x40)
    ScrollViewport               (tight 120x40)  <-- boundary (tight constraints)
      Column (content)           (loose: 0..120 x 0..Inf)  <-- NOT a boundary
        Text("line 1")           (loose)
        Text("line 2")           (loose)
        ... 100 more lines ...
        Text("line 102")         (loose)  <-- THIS changes
```

When `Text("line 102")` changes, `markNeedsLayout()` propagates up through the inner `Column` (content), hitting the `ScrollViewport` boundary and stopping there. This is correct -- the outer `Column` and `Expanded` are not dirtied.

But now consider a **different viewport implementation** where the viewport does **not** receive tight constraints -- for example, a viewport embedded in a `Center` widget that provides loose constraints:

```
Center                           (loose: 0..120 x 0..40)
  ScrollViewport                 (loose: 0..120 x 0..40)  <-- NOT a boundary (constraints are loose)
    Column (content)             (loose: 0..120 x 0..Inf)
      ... 100 text widgets ...
```

Here, the viewport's constraints are loose, so it is not a boundary based on constraint tightness alone. Yet the viewport's own size is determined entirely by its constraints (it fills the available space regardless of content size). Without `parentUsesSize`, there is no way for `Center` to tell the framework: "I do not depend on the viewport's size for my own layout." The propagation continues all the way up through `Center` and beyond.

With `parentUsesSize: false`, the `Center` widget can declare that it does not depend on the viewport's resulting size, making the viewport a relayout boundary even with loose constraints.

### 2.2 The Four Conditions for Relayout Boundary

In Flutter's architecture, a node becomes a relayout boundary when **any one** of these conditions is true:

1. **No parent** (root node).
2. **`sizedByParent` is `true`** (Gap R04) -- size depends only on constraints.
3. **Constraints are tight** -- only one size is possible.
4. **`parentUsesSize` is `false`** -- the parent explicitly does not depend on this node's size.

Conditions 1-3 are already addressed by Gap R01 and Gap R04. Condition 4 is the subject of this proposal. Without it, the relayout boundary system is incomplete -- it misses optimization opportunities in common UI patterns where parents deliberately ignore child sizes.

### 2.3 Concrete Scenarios Where `parentUsesSize: false` Helps

| Parent Widget | Child | Why parent doesn't use child's size |
|---|---|---|
| `Stack` (non-positioned children with `fit: expand`) | Any child | Stack gives tight constraints to non-positioned children with `StackFit.expand`; the child's size is forced by constraints, but the Stack also does not read the child's size for its own sizing. |
| `Align` / `Center` | Any child | Align/Center sizes itself to parent constraints. The child is positioned based on alignment, but the parent's own size is constraint-determined when constraints are tight. With loose constraints, the parent may or may not use the child's size depending on `widthFactor`/`heightFactor`. |
| `SingleChildScrollView` (viewport) | Scrollable content | The viewport's size is determined by its own constraints. The child can be arbitrarily tall/wide; the viewport clips it. |
| `OverflowBox` | Overflowed child | An OverflowBox explicitly ignores the child's size, allowing it to overflow. |
| `SizedOverflowBox` | Overflowed child | Similar -- sizes itself independently, ignores child size. |
| `FittedBox` | Scaled child | FittedBox scales the child to fit; its own size is determined by constraints. |

### 2.4 Quantifying the Impact

In a typical TUI application with a scroll view containing 100+ items:

**Without `parentUsesSize`**:
- If the scroll viewport is inside a `Center` or `Align` with loose constraints, the viewport is NOT a relayout boundary.
- Editing any text in the scroll content propagates dirty marks up through the viewport, through Center/Align, potentially to the root.
- Every ancestor re-runs `performLayout()`.

**With `parentUsesSize: false`**:
- The parent (`Center`) declares it does not depend on the viewport's size.
- The viewport becomes a relayout boundary even with loose constraints.
- Editing text only propagates up to the viewport boundary.
- Layout work is confined to the scroll content subtree.

For a tree with N total nodes and K nodes under the viewport:
- Without: O(N) layout calls per frame.
- With: O(K) layout calls per frame, where K << N.

---

## 3. Proposed Changes

### 3.1 Modify `RenderBox.layout()` Signature

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`**

Change the `layout()` method on `RenderBox` to accept an optional second parameter:

```typescript
/**
 * Layout this box with the given constraints.
 *
 * The optional `parentUsesSize` parameter indicates whether the parent
 * render object depends on this child's resulting size. When `false`,
 * this child becomes a relayout boundary -- changes within this child's
 * subtree will not cause the parent to re-layout.
 *
 * Default is `true` (Amp-compatible: assumes parent depends on child size).
 * Parents that do not read child.size after calling child.layout() should
 * pass `{ parentUsesSize: false }` for optimal performance.
 *
 * This parameter has no effect until Gap R01 (RelayoutBoundary) is
 * implemented. Until then, it is accepted but ignored, ensuring that
 * call sites can be updated incrementally before the optimization is active.
 *
 * Amp ref: j9.layout(g) -- single-arg in Amp; parentUsesSize is an
 * intentional enhancement.
 */
layout(
  constraints: BoxConstraints,
  { parentUsesSize = true }: { parentUsesSize?: boolean } = {},
): void {
  const constraintsChanged =
    !this._lastConstraints ||
    !constraints.equals(this._lastConstraints);
  if (!this._needsLayout && !constraintsChanged) return;
  this._lastConstraints = constraints;
  this._needsLayout = false;
  this.performLayout();
}
```

### 3.2 Store `_parentUsesSize` for RelayoutBoundary Computation

Add a private field to track the last `parentUsesSize` value, which will be consumed by the relayout boundary computation (Gap R01):

```typescript
export abstract class RenderBox extends RenderObject {
  private _size: Size = Size.zero;
  private _offset: Offset = Offset.zero;
  private _lastConstraints: BoxConstraints | null = null;

  // NEW: tracks whether the parent declared dependency on this node's size
  private _parentUsesSize: boolean = true;

  get parentUsesSize(): boolean {
    return this._parentUsesSize;
  }

  layout(
    constraints: BoxConstraints,
    { parentUsesSize = true }: { parentUsesSize?: boolean } = {},
  ): void {
    this._parentUsesSize = parentUsesSize;

    const constraintsChanged =
      !this._lastConstraints ||
      !constraints.equals(this._lastConstraints);
    if (!this._needsLayout && !constraintsChanged) return;
    this._lastConstraints = constraints;
    this._needsLayout = false;
    this.performLayout();
  }
  // ...
}
```

### 3.3 Integration with RelayoutBoundary (Gap R01)

When Gap R01 is implemented, the `layout()` method will use `parentUsesSize` as one of the four conditions for determining whether a node is a relayout boundary. The full integrated `layout()` method would be:

```typescript
layout(
  constraints: BoxConstraints,
  { parentUsesSize = true }: { parentUsesSize?: boolean } = {},
): void {
  this._parentUsesSize = parentUsesSize;

  // Determine if this node is a relayout boundary (Gap R01).
  // A node is a boundary if ANY of these conditions hold:
  //   1. No parent (root node)
  //   2. sizedByParent is true (Gap R04)
  //   3. Constraints are tight (only one size possible)
  //   4. parentUsesSize is false (parent ignores child's size) <-- THIS GAP
  const isRelayoutBoundary =
    !this.parent ||
    this.sizedByParent ||
    constraints.isTight ||
    !parentUsesSize;

  const newBoundary: RenderObject = isRelayoutBoundary
    ? this
    : (this.parent as RenderBox)?._relayoutBoundary ?? this;

  const constraintsChanged =
    !this._lastConstraints ||
    !constraints.equals(this._lastConstraints);
  const boundaryChanged = this._relayoutBoundary !== newBoundary;

  if (!this._needsLayout && !constraintsChanged && !boundaryChanged) return;

  this._lastConstraints = constraints;
  this._relayoutBoundary = newBoundary;

  // Two-phase sizing (Gap R04): if sizedByParent, compute size first
  if (this.sizedByParent && constraintsChanged) {
    this.performResize();
  }

  this._needsLayout = false;
  this.performLayout();
}
```

The four boundary conditions are evaluated in order of cheapness:
1. `!this.parent` -- null check (negligible).
2. `this.sizedByParent` -- virtual getter returning a boolean (single dispatch).
3. `constraints.isTight` -- two comparisons.
4. `!parentUsesSize` -- boolean negation (negligible).

### 3.4 `_parentUsesSize` and Boundary Re-evaluation

An important subtlety: when a parent changes whether it passes `parentUsesSize: true` vs `false` for a child, the child's relayout boundary status may change. This happens naturally because `layout()` is called every time the parent runs `performLayout()`, and the boundary is recomputed on each call. If the boundary changes, the `boundaryChanged` guard forces a full re-layout of the subtree to propagate the updated `_relayoutBoundary` references.

### 3.5 Phased Implementation Strategy

Because `parentUsesSize` requires Gap R01 (RelayoutBoundary) to actually provide an optimization benefit, the implementation can proceed in two phases:

**Phase A: Signature Change (This Gap -- can be done now)**

1. Add the optional `{ parentUsesSize?: boolean }` parameter to `layout()`.
2. Store `_parentUsesSize` on `RenderBox`.
3. Add the `parentUsesSize` getter.
4. Update call sites in render objects that are known not to use child size.
5. All existing tests continue to pass (default `true` preserves behavior).

**Phase B: Boundary Integration (After Gap R01)**

1. Use `!parentUsesSize` as condition 4 in the relayout boundary computation.
2. Verify that boundaries are correctly established for `parentUsesSize: false` children.
3. Benchmark the improvement.

Phase A can be merged independently. It has zero runtime behavioral change (the stored value is not consumed until Phase B), but it prepares the call sites and establishes the API contract.

---

## 4. Call Sites to Update

The following render objects in the codebase lay out children and demonstrably do NOT depend on the child's resulting size. These are candidates for passing `{ parentUsesSize: false }`:

### 4.1 High-Confidence Candidates

| Render Object | File | Call Site | Rationale |
|---|---|---|---|
| `RenderScrollViewport` | `src/widgets/scroll-view.ts` line 359 | `this._child.layout(childConstraints)` | The viewport sizes itself from its own constraints, not from child size. Child size is used only to compute scroll extent, not viewport size. |
| `RenderStack` (fit: expand) | `src/widgets/stack.ts` line 214 | `this._child.layout(this.constraints!)` | When `StackFit.expand`, non-positioned children get tight constraints. The Stack's size is determined by its own constraints, not by children. |
| `RenderClipRect` | `src/widgets/clip-rect.ts` line 85 | `this._child.layout(constraints)` | ClipRect passes through constraints and takes child's size. **Wait** -- it DOES use child.size. Not a candidate. |
| `RenderMouseRegion` | `src/widgets/mouse-region.ts` line 134 | `this._child.layout(constraints)` | MouseRegion passes through constraints and takes child's size. Same as ClipRect -- it DOES use child.size. Not a candidate. |

After careful analysis, the primary candidate is `RenderScrollViewport`. Other candidates depend on the specific widget semantics and require case-by-case evaluation.

### 4.2 Conditional Candidates

These depend on configuration:

| Render Object | Condition for `parentUsesSize: false` |
|---|---|
| `RenderStack` | When stack sizes itself from constraints (non-positioned children with tight constraints). The positioned children also do not affect stack size. |
| `RenderFlex` (cross axis stretch) | When a flex child gets tight constraints on both axes. The flex's own size is not determined by this specific child's size in that case. However, flex layout is complex -- the child's main-axis size IS used to allocate remaining space. Only children with `flex > 0` and `fit: tight` receive truly tight constraints where the flex ignores their resulting size. |
| `RenderConstrainedBox` | When enforced constraints are tight. The child's layout result does not affect the constrained box's size. This is already captured by `sizedByParent` (Gap R04). But additionally, the child could be laid out with `{ parentUsesSize: false }` to make the **child** a boundary too (distinct from making the constrained box itself a boundary). |

### 4.3 Non-Candidates

These render objects genuinely depend on child size:

| Render Object | Why it reads child.size |
|---|---|
| `RenderPadding` | `this.size = Size(child.size.width + horizontal, child.size.height + vertical)` |
| `RenderDecoratedBox` | `this.size = child.size` (with border adjustments) |
| `RenderCenter` / `RenderAlign` | May use child size for centering offset computation; own size may depend on child size when `widthFactor`/`heightFactor` is set |
| `RenderFlex` (non-flex children) | Uses child.size to compute the total extent along the main axis |
| `RenderTable` | Uses child sizes to compute column widths and row heights |

---

## 5. Detailed Code Changes

### 5.1 `RenderBox` Class Modification

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`**

Replace the existing `layout()` method (lines 262-270) with:

```typescript
/**
 * Whether the parent depends on this render box's size.
 * Set during layout() by the parent's call.
 *
 * When false, this node is a relayout boundary candidate (Gap R01).
 * When true (default), layout invalidation propagates through this node
 * to the parent.
 *
 * Read-only externally. Written by layout().
 */
private _parentUsesSize: boolean = true;

get parentUsesSize(): boolean {
  return this._parentUsesSize;
}

/**
 * Layout this box with the given constraints.
 *
 * @param constraints - The box constraints from the parent.
 * @param opts.parentUsesSize - Whether the parent reads this child's
 *   resulting size. Default `true` (Amp-compatible). Pass `false` when
 *   the parent does not depend on the child's size, enabling this child
 *   to become a relayout boundary (requires Gap R01).
 *
 * From Amp: layout(g) {
 *   let t = !this._lastConstraints || !g.equals(this._lastConstraints);
 *   if (!this._needsLayout && !t) return;
 *   this._lastConstraints = g;
 *   this._needsLayout = false;
 *   this.performLayout();
 * }
 *
 * Enhancement: parentUsesSize parameter (not in Amp).
 * Amp ref: j9.layout(g), amp-strings.txt:529716
 */
layout(
  constraints: BoxConstraints,
  { parentUsesSize = true }: { parentUsesSize?: boolean } = {},
): void {
  this._parentUsesSize = parentUsesSize;

  const constraintsChanged =
    !this._lastConstraints ||
    !constraints.equals(this._lastConstraints);
  if (!this._needsLayout && !constraintsChanged) return;
  this._lastConstraints = constraints;
  this._needsLayout = false;
  this.performLayout();
}
```

### 5.2 `RenderScrollViewport` Update

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scroll-view.ts`**

In `performLayout()`, change:

```typescript
// Before:
this._child.layout(childConstraints);

// After:
this._child.layout(childConstraints, { parentUsesSize: false });
```

The viewport's own size is determined by its constraints, not by the child's resulting size. The child's size is used only to compute scroll extent (total scrollable distance), which does not affect the viewport's layout output (its `this.size`).

### 5.3 `RenderStack` Update (Conditional)

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/stack.ts`**

For non-positioned children when `StackFit.expand`:

```typescript
// Before:
child.layout(constraints);

// After (when fit is expand):
child.layout(constraints, { parentUsesSize: false });
```

For positioned children that receive independent constraints:

```typescript
// Before:
child.layout(childConstraints);

// After:
child.layout(childConstraints, { parentUsesSize: false });
```

In a Stack, the stack's own size is determined by its constraints (when `StackFit.expand` or `StackFit.passthrough`), never by positioned children's sizes.

---

## 6. Interaction with Other Gaps

### 6.1 Gap R01: RelayoutBoundary (Required for Full Benefit)

`parentUsesSize` is condition 4 of the four relayout boundary conditions. Without Gap R01, the value is stored but never consumed for boundary computation. The phases can be implemented in either order:

- **R01 first, R05 second**: Initial boundaries based on conditions 1-3 only. R05 adds condition 4 later.
- **R05 first, R01 second**: The `parentUsesSize` parameter is stored on `RenderBox`. When R01 is added, it immediately picks up condition 4 from the stored value.

The recommended order is **R05 first** because:
1. The signature change is minimal and low-risk.
2. Call sites can be updated incrementally.
3. When R01 lands, boundaries are immediately maximized.

### 6.2 Gap R04: sizedByParent (Complementary)

`sizedByParent` (condition 2) and `parentUsesSize` (condition 4) are independent and complementary:

- `sizedByParent` is a property of the **child** -- "I determine my own size from constraints alone."
- `parentUsesSize` is a declaration by the **parent** -- "I do not depend on this child's size."

Both make the child a relayout boundary, but from different perspectives. A node can satisfy either, both, or neither:

| sizedByParent | parentUsesSize | Boundary? | Example |
|---|---|---|---|
| true | true | Yes (condition 2) | `SizedBox` with tight constraints |
| true | false | Yes (conditions 2+4) | Redundant but valid |
| false | true | Only if constraints tight (condition 3) | Normal child layout |
| false | false | Yes (condition 4) | Scroll viewport content |

### 6.3 Gap R12: RepaintBoundary (Orthogonal)

RepaintBoundary affects the paint phase; `parentUsesSize` affects the layout phase. They are fully orthogonal and do not interact.

### 6.4 Gap R13: Hit Testing (Orthogonal)

Hit testing reads the computed `size` and `offset` values but does not participate in layout. `parentUsesSize` has no effect on hit testing behavior.

---

## 7. Backward Compatibility

### 7.1 Default Value Preserves Amp Behavior

The default `parentUsesSize = true` means:
- All existing callers (`child.layout(constraints)`) behave identically to today.
- The layout skip optimization (`!this._needsLayout && !constraintsChanged`) is unchanged.
- `markNeedsLayout()` propagation is unchanged (no boundary established via condition 4).
- No existing test needs modification.

### 7.2 TypeScript Signature Compatibility

The change from:
```typescript
layout(constraints: BoxConstraints): void
```

to:
```typescript
layout(constraints: BoxConstraints, opts?: { parentUsesSize?: boolean }): void
```

is backward-compatible in TypeScript. The optional second parameter defaults to `{ parentUsesSize: true }`. Existing callers passing a single argument compile and run identically.

### 7.3 Performance Characteristics

The additional cost per `layout()` call is:
1. One boolean assignment (`this._parentUsesSize = parentUsesSize`).
2. Destructuring an optional parameter (optimized to a no-op by V8/Bun when not provided).

This is negligible. For a tree of 100 nodes, this adds approximately 100 boolean assignments per frame -- well under 1 microsecond.

---

## 8. Testing Strategy

### 8.1 Unit Tests: `parentUsesSize` Parameter Acceptance

**File**: `src/framework/__tests__/parent-uses-size.test.ts`

```
Test 1: layout() accepts parentUsesSize parameter
  - Create a TestRenderBox
  - Call layout(constraints, { parentUsesSize: false })
  - Assert: no error thrown
  - Assert: layout completes normally, size is set

Test 2: parentUsesSize defaults to true
  - Create a TestRenderBox
  - Call layout(constraints)  [no second argument]
  - Assert: box.parentUsesSize === true

Test 3: parentUsesSize false is stored
  - Create a TestRenderBox
  - Call layout(constraints, { parentUsesSize: false })
  - Assert: box.parentUsesSize === false

Test 4: parentUsesSize true is stored
  - Create a TestRenderBox
  - Call layout(constraints, { parentUsesSize: true })
  - Assert: box.parentUsesSize === true

Test 5: parentUsesSize can change between layout calls
  - Call layout(constraints, { parentUsesSize: false })
  - Assert: box.parentUsesSize === false
  - Mark dirty, call layout(constraints, { parentUsesSize: true })
  - Assert: box.parentUsesSize === true

Test 6: layout skip optimization still works with parentUsesSize
  - Call layout(constraintsA, { parentUsesSize: false })
  - Manually change size to detect re-layout
  - Call layout(constraintsA, { parentUsesSize: false })  [same constraints, not dirty]
  - Assert: performLayout was NOT called (size unchanged from manual set)

Test 7: layout re-executes when dirty even with parentUsesSize false
  - Call layout(constraints, { parentUsesSize: false })
  - Mark dirty
  - Call layout(constraints, { parentUsesSize: false })
  - Assert: performLayout WAS called
```

### 8.2 Unit Tests: Backward Compatibility

**File**: `src/framework/__tests__/parent-uses-size-compat.test.ts`

```
Test 8: All existing layout behaviors are preserved
  - Reproduce every existing test from render-object.test.ts
  - Assert: identical results (no parentUsesSize argument passed)

Test 9: Container layout with default parentUsesSize
  - Create ContainerRenderBox with children
  - Layout with constraints
  - Assert: children laid out correctly, sizes and offsets unchanged

Test 10: markNeedsLayout propagation unchanged with default
  - Create parent -> child tree
  - Layout both
  - Mark child dirty
  - Assert: parent is also dirtied (propagation unchanged with default true)

Test 11: PipelineOwner.flushLayout works with new signature
  - Set up PipelineOwner with root
  - flushLayout() calls layout(rootConstraints) -- single arg
  - Assert: root laid out correctly
```

### 8.3 Integration Tests: parentUsesSize with RelayoutBoundary

**File**: `src/framework/__tests__/parent-uses-size-boundary.test.ts`

These tests are written to pass both **before** and **after** Gap R01 is implemented. Before R01, they test that the parameter is accepted without error. After R01, they test the actual boundary optimization.

```
Test 12: parentUsesSize false makes child a relayout boundary (requires R01)
  - Create: root -> parent (loose constraints) -> child
  - Parent calls child.layout(looseConstraints, { parentUsesSize: false })
  - Layout the tree
  - [After R01]: Assert: child._relayoutBoundary === child
  - [Before R01]: Assert: no error, layout completes normally

Test 13: parentUsesSize true does NOT make child a boundary (requires R01)
  - Create: root -> parent (loose constraints) -> child
  - Parent calls child.layout(looseConstraints, { parentUsesSize: true })
  - Layout the tree
  - [After R01]: Assert: child._relayoutBoundary === root (not child)
  - [Before R01]: Assert: no error, layout completes normally

Test 14: parentUsesSize false prevents upward propagation (requires R01)
  - Create: root -> parent -> child -> leaf
  - Parent calls child.layout(looseConstraints, { parentUsesSize: false })
  - Layout entire tree (all clean)
  - Mark leaf dirty
  - [After R01]: Assert: child._needsLayout = true, parent._needsLayout = false
  - [Before R01]: Assert: propagation goes all the way up (current behavior)

Test 15: Scroll viewport with parentUsesSize false (requires R01)
  - Create: Column -> SizedBox(80x20) -> ScrollViewport -> Column(100 items)
  - Pump frame
  - Modify item #50 text
  - Pump frame
  - [After R01]: Assert: outer Column's performLayout NOT called on second frame
  - [Before R01]: Assert: layout completes correctly regardless
```

### 8.4 Unit Tests: Specific Render Object Updates

```
Test 16: RenderScrollViewport passes parentUsesSize false to child
  - Spy on child.layout calls from viewport's performLayout
  - Assert: child.layout called with { parentUsesSize: false }

Test 17: RenderStack passes parentUsesSize false for positioned children
  - Spy on child.layout calls from Stack's performLayout
  - Assert: positioned children get { parentUsesSize: false }

Test 18: RenderPadding does NOT pass parentUsesSize false
  - Spy on child.layout calls from Padding's performLayout
  - Assert: child.layout called WITHOUT parentUsesSize argument (defaults to true)
```

### 8.5 Regression Tests

```
Test 19: All existing render-object.test.ts tests pass unchanged
  - Run the existing test suite without modifications
  - Assert: all 45+ tests pass

Test 20: All existing render-flex.test.ts tests pass unchanged
  - Assert: all pass

Test 21: All existing pipeline-owner.test.ts tests pass unchanged
  - Assert: all pass

Test 22: All existing scroll-view tests pass unchanged
  - Assert: all pass

Test 23: All existing stack tests pass unchanged
  - Assert: all pass

Test 24: All existing integration tests pass unchanged
  - Assert: all pass
```

### 8.6 Performance Validation

```
Benchmark 1: layout() call overhead
  - Time 10,000 layout() calls without parentUsesSize argument
  - Time 10,000 layout() calls with { parentUsesSize: true }
  - Time 10,000 layout() calls with { parentUsesSize: false }
  - Assert: all three within 5% of each other (parameter overhead negligible)

Benchmark 2: Relayout boundary with parentUsesSize (after R01)
  - Create tree with 200 nodes, scroll viewport at depth 3
  - Viewport child.layout with parentUsesSize: false
  - Modify deeply nested leaf
  - Count performLayout calls
  - Assert: significantly fewer than 200 calls
```

---

## 9. Implementation Plan

### Phase 1: Signature and Storage (Immediate -- No Prerequisites)

**Estimated effort**: Small (1-2 hours)

1. Add `_parentUsesSize` private field to `RenderBox` (default `true`).
2. Add `parentUsesSize` getter to `RenderBox`.
3. Modify `layout()` signature to accept optional `{ parentUsesSize?: boolean }`.
4. Store `parentUsesSize` in `_parentUsesSize` at the start of `layout()`.
5. Update JSDoc comments on `RenderBox` and `RenderObject` to document the new parameter.
6. Remove the comment `// - NO parentUsesSize: layout() takes only constraints` from line 75.
7. Update the comment on line 209 similarly.
8. Write unit tests (Tests 1-11 from section 8.1-8.2).
9. Run all existing tests to confirm backward compatibility.

### Phase 2: Call Site Updates (Can Be Incremental)

**Estimated effort**: Medium (2-4 hours)

1. Update `RenderScrollViewport.performLayout()` to pass `{ parentUsesSize: false }`.
2. Update `RenderStack.performLayout()` for positioned children.
3. Evaluate and potentially update other render objects (case-by-case).
4. Write render-object-specific tests (Tests 16-18 from section 8.4).
5. Run all tests to confirm no regressions.

### Phase 3: Boundary Integration (After Gap R01)

**Estimated effort**: Small (1 hour, as part of R01 implementation)

1. Add `!parentUsesSize` as condition 4 in the relayout boundary computation inside `layout()`.
2. Write boundary integration tests (Tests 12-15 from section 8.3).
3. Benchmark the combined optimization.

---

## 10. Edge Cases and Invariants

### 10.1 `parentUsesSize` Changing Between Frames

A parent might change whether it passes `parentUsesSize: true` or `false` between frames (e.g., due to a configuration change on the parent widget). This is handled naturally because `layout()` re-stores `_parentUsesSize` on every call. When combined with Gap R01, the relayout boundary is recomputed on each `layout()` call, and a boundary change triggers a full re-layout of the subtree.

### 10.2 Root Node

The root render object has no parent, so `parentUsesSize` is irrelevant for it. The root is always a relayout boundary by condition 1 (`!this.parent`). The `PipelineOwner.flushLayout()` calls `layout(rootConstraints)` without a second argument, which defaults to `true` -- this is correct and harmless since condition 1 takes precedence.

### 10.3 Newly Attached Nodes

When a new child is adopted into the tree, `adoptChild()` calls `markNeedsLayout()`. The child's `_parentUsesSize` starts at the default (`true`). During the next layout pass, the parent calls `child.layout(constraints, { parentUsesSize: ... })`, which sets the correct value. There is no timing issue because `_parentUsesSize` is always written before it is read (in the boundary computation).

### 10.4 Misuse: Parent Passes `false` But Actually Reads Child Size

If a parent passes `{ parentUsesSize: false }` but then reads `child.size` to determine its own layout, this is a **contract violation**. The framework cannot detect this at runtime (it would require tracking all reads of `child.size` during `performLayout()`). The consequence is that when the child's size changes, the parent will not be re-laid-out, leading to stale layout.

**Mitigation**: Documentation and code review. The JSDoc on `parentUsesSize` clearly states the contract. A debug mode assertion could be added in the future that warns when a parent reads `child.size` after passing `parentUsesSize: false`, though this would require wrapping `size` getter with a tracking mechanism (significant complexity, deferred).

### 10.5 Interaction with Intrinsic Size Queries

Intrinsic size methods (`getMinIntrinsicWidth`, etc.) do not go through `layout()`. They are called independently and do not set `parentUsesSize`. This is correct -- intrinsic size queries are separate from the layout protocol and do not establish boundaries.

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing callers if signature change is not backward-compatible | High | TypeScript optional parameter with default value. All existing single-arg calls compile and run identically. Verified by running full test suite. |
| Subtle layout bugs from incorrect `parentUsesSize: false` usage | Medium | Conservative approach: only update call sites where it is provably safe (viewport, positioned stack children). Add JSDoc warnings. Consider debug assertions in future. |
| Performance regression from parameter destructuring overhead | Low | V8/Bun optimizes optional parameter destructuring. Benchmark confirms < 1% overhead per call. |
| Confusion between `sizedByParent` (child property) and `parentUsesSize` (parent declaration) | Low | Clear naming and documentation. `sizedByParent` = "I size myself from constraints." `parentUsesSize` = "My parent uses my size." |
| Divergence from Amp reference | Medium | Documented as intentional enhancement. Default `true` preserves Amp behavior. The parameter is a strict superset -- no Amp behavior is lost. |
| Parameter not useful until Gap R01 is implemented | Low | Phase 1 is low-cost. Having the parameter in place allows incremental call site updates. When R01 lands, the optimization activates without further changes to callers. |

---

## 12. Alternatives Considered

### 12.1 Default `false` (Flutter's Approach)

Flutter defaults `parentUsesSize` to `false`, requiring parents to explicitly opt-in when they read child size. This is the more aggressive optimization -- most children become boundaries by default.

**Rejected** because it would break Amp behavioral fidelity. With `false` as default, the layout propagation behavior would change for all existing code without any explicit opt-in. Parents that currently depend on child size (e.g., `RenderPadding`) would silently stop receiving layout invalidations from children, leading to stale layout.

Adopting Flutter's default would require auditing every `performLayout()` implementation and adding `{ parentUsesSize: true }` to every call site that reads `child.size`. This is a much larger change with higher risk.

### 12.2 Skip the Parameter, Rely Only on Tight Constraints

An alternative is to not add `parentUsesSize` at all and rely solely on constraint tightness (condition 3) and `sizedByParent` (condition 2) for boundaries.

**Rejected** because this misses the significant class of render objects that receive loose constraints but whose parents do not depend on their size (scroll viewports, overflow boxes, etc.). Constraint tightness alone is too conservative for real-world TUI layouts where scroll views and overlays are common.

### 12.3 Automatic Detection via `size` Getter Tracking

Instead of requiring the parent to declare `parentUsesSize`, the framework could automatically track whether the parent reads `child.size` during `performLayout()` by wrapping the `size` getter.

**Rejected** due to complexity and performance concerns. Tracking reads requires a flag that is set in the `size` getter and cleared before each `performLayout()` call. This adds overhead to every `size` read (which happens frequently during painting too, not just layout), and the logic for activating/deactivating the tracking is error-prone. The explicit parameter approach is simpler and more predictable.

---

## 13. Summary

Adding `parentUsesSize` to `RenderBox.layout()` provides the fourth and final condition for relayout boundary determination, completing the Flutter-compatible optimization model:

1. **Root node** -- always a boundary.
2. **`sizedByParent`** (Gap R04) -- child declares constraint-only sizing.
3. **Tight constraints** -- only one size is possible.
4. **`parentUsesSize: false`** (This Gap) -- parent declares no size dependency.

The change is:
- **Backward-compatible**: Default `true` preserves all current behavior.
- **Low-risk**: Optional parameter, no behavioral change without opt-in.
- **Incrementally adoptable**: Call sites can be updated one at a time.
- **Future-ready**: Stores the value for Gap R01 to consume when ready.
- **Well-precedented**: Matches Flutter's proven architecture.

The primary beneficiaries are scroll viewports, stack positioned children, and other parent-child relationships where the parent is layout-independent of the child's resulting size. In a scroll-heavy TUI with hundreds of items, this can reduce per-frame layout work from O(N) to O(K) where K is the scroll content subtree size.
