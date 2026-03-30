# Gap R04: Add `sizedByParent` / `performResize()` Two-Phase Layout Optimization

## Status: Proposal
## Affected packages: `flitter-core`
## Prerequisite: Gap R01 (RelayoutBoundary) recommended but not strictly required

---

## 1. Current Behavior Analysis

### 1.1 The Single-Phase Layout Protocol

In the current flitter codebase, every `RenderBox` subclass computes its own size and lays out its children in a single method: `performLayout()`. The call chain originates in `RenderBox.layout()`.

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

The `layout()` method performs three things in sequence:

1. **Gate check**: Determines whether layout work is actually needed -- skips if constraints are unchanged AND the node is not dirty (`_needsLayout` is false).
2. **Cache & clear**: Stores the new constraints in `_lastConstraints` and clears the `_needsLayout` dirty flag BEFORE calling `performLayout()`. This matches the Amp reference exactly (`j9.layout(g)` in amp-strings.txt:529716).
3. **Single dispatch**: Calls `performLayout()`, which must both determine `this.size` and lay out all children.

There is no separate sizing step. Every `performLayout()` implementation interleaves self-sizing with child layout. This is faithful to the Amp CLI reference, which explicitly lacks this optimization. From `.reference/render-tree.md` (lines 301-302):

> **No `sizedByParent` / `performResize()`**: The two-phase layout optimization does not exist. All sizing happens in `performLayout()`.

And from the summary table (line 943):

| Concept | Flutter | Amp TUI |
|---------|---------|---------|
| sizedByParent | Two-phase layout optimization | **No** -- all in performLayout |

### 1.2 Why This Matters

The single-phase approach means that when a render object can determine its own size purely from the parent's constraints -- without consulting any children -- it still must run the full `performLayout()` to establish that size. In Flutter's architecture, such objects declare `sizedByParent = true` and implement `performResize()`, which enables:

1. **Size computation separated from child layout** -- the framework can determine the node's size without triggering its children's layout. This is useful for intrinsic size queries and for establishing relayout boundaries.
2. **Stronger relayout boundaries** -- a node whose size depends only on parent constraints is always a natural relayout boundary, since its parent's layout result cannot change due to changes in the node's subtree. When combined with Gap R01, this produces the maximum layout pruning benefit.
3. **Potential for lazy child layout** -- if only the size is needed (e.g., for an intrinsic size query or for a parent deciding positioning), `performResize()` can run without `performLayout()`.
4. **Explicit contract enforcement** -- the two-phase split makes it impossible to accidentally introduce a dependency on child sizes when computing self-size, because `performResize()` runs before any children are laid out.

### 1.3 The `markNeedsLayout()` Propagation Problem (Context from Gap R01)

Currently, `markNeedsLayout()` in `RenderObject` (render-object.ts lines 145-160) unconditionally propagates upward to the root:

```typescript
markNeedsLayout(): void {
  if (this._needsLayout) return;
  if (!this._attached) {
    this._needsLayout = true;
    return;
  }
  this._needsLayout = true;
  // In Amp: always propagate to parent (NO RelayoutBoundary)
  if (this.parent) {
    this.parent.markNeedsLayout();
  } else {
    this._owner?.requestLayout();
  }
}
```

And `PipelineOwner.flushLayout()` (pipeline-owner.ts lines 126-138) always starts layout from the root:

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

This means any dirty leaf causes a full-tree layout traversal. When Gap R01 (RelayoutBoundary) is implemented, `sizedByParent` becomes a key condition for boundary eligibility. Without `sizedByParent`, the boundary determination can only use tight constraints and `parentUsesSize=false` -- both of which are external to the node. With `sizedByParent`, a node can declare itself as a boundary based on its own intrinsic knowledge of how it computes size.

### 1.4 Concrete Examples in the Current Codebase

Several existing render objects already compute their size purely from constraints, then separately handle children. These are natural `sizedByParent` candidates.

#### 1.4.1 `RenderDivider` -- Textbook Candidate

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/divider.ts`** (lines 59-64)

```typescript
performLayout(): void {
  const constraints = this.constraints!;
  const width = constraints.hasBoundedWidth ? constraints.maxWidth : 80;
  this.size = constraints.constrain(new Size(width, 1));
}
```

`RenderDivider` is a leaf node with no children. Its size is entirely determined by the incoming constraints: it takes the full available width (or 80 as fallback) and is always 1 row tall. This is the simplest and most clear-cut `sizedByParent = true` candidate.

#### 1.4.2 `RenderScrollViewport` -- Conditional Candidate

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scroll-view.ts`** (lines 332-365)

```typescript
performLayout(): void {
  const constraints = this.constraints!;
  if (!this._child) {
    this.size = constraints.constrain(Size.zero);
    return;
  }
  // Create unbounded constraints on the main axis
  let childConstraints: BoxConstraints;
  if (this.axisDirection === 'vertical') {
    childConstraints = new BoxConstraints({
      minWidth: constraints.minWidth,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: Infinity,
    });
  } else { /* ... horizontal ... */ }

  this._child.layout(childConstraints);

  // Self-size to parent constraints
  this.size = constraints.constrain(new Size(
    this.axisDirection === 'vertical' ? this._child.size.width : constraints.maxWidth,
    this.axisDirection === 'vertical' ? constraints.maxHeight : this._child.size.height,
  ));
  // ... scroll extent updates ...
}
```

For a vertical scroll viewport receiving tight constraints (the common case when it fills an `Expanded` slot), the viewport's own size is fully determined by the constraints. The child is laid out with unbounded height, but the viewport's self-size does not depend on the child's resulting size when constraints are tight. When `constraints.isTight`, this is a strong `sizedByParent` candidate.

**Important subtlety**: The current implementation reads `this._child.size.width` for the self-size width in the vertical case (line 363). When the parent constraints have tight width (minWidth === maxWidth), this is irrelevant because `constraints.constrain(...)` will clamp to the tight width regardless. But when width is loose, the viewport consults the child's width. So `sizedByParent` is only valid when the constraints on both axes provide enough information to determine size -- i.e., when `constraints.isTight`.

#### 1.4.3 `RenderConstrainedBox` -- Conditional Candidate

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-constrained.ts`** (lines 61-73)

```typescript
performLayout(): void {
  const constraints = this.constraints!;
  const enforced = this._additionalConstraints.enforce(constraints);
  if (this._child) {
    this._child.layout(enforced);
    this.size = enforced.constrain(this._child.size);
  } else {
    this.size = enforced.constrain(enforced.smallest);
  }
}
```

When `additionalConstraints` specifies exact width and height (e.g., `SizedBox(width: 80, height: 10)`), the enforced constraints after `enforce()` are tight. When `enforced.isTight`, the `constrain()` call always returns the tight size regardless of the child size argument. The self-size is independent of the child, but the code structure obscures this. A `sizedByParent` refactor would make the intent explicit.

The `BoxConstraints.enforce()` method (box-constraints.ts lines 87-94) clamps this constraint's values within the other constraint's bounds:

```typescript
enforce(constraints: BoxConstraints): BoxConstraints {
  return new BoxConstraints({
    minWidth: clamp(this.minWidth, constraints.minWidth, constraints.maxWidth),
    maxWidth: clamp(this.maxWidth, constraints.minWidth, constraints.maxWidth),
    minHeight: clamp(this.minHeight, constraints.minHeight, constraints.maxHeight),
    maxHeight: clamp(this.maxHeight, constraints.minHeight, constraints.maxHeight),
  });
}
```

When both `additionalConstraints` and the parent constraints together produce tight constraints, size is fully determined. The `isTight` getter on `BoxConstraints` (box-constraints.ts line 115-117) checks `minWidth === maxWidth && minHeight === maxHeight`.

#### 1.4.4 `RenderFlex` -- Conditional Candidate

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-flex.ts`** (lines 262-461)

A `RenderFlex` with `mainAxisSize = 'max'` takes the full available main extent when the main axis is bounded. If the cross axis is also tight (e.g., from `crossAxisAlignment: 'stretch'` with tight parent constraints), the size is fully constraint-determined. However, the `mainAxisSize = 'min'` mode uses `allocatedSize` which depends on child layout (line 448), so it can never be `sizedByParent`. Similarly, when `crossAxisAlignment` is not `'stretch'` and constraints are loose on the cross axis, the cross size depends on the max child cross size.

The `sizedByParent` determination for `RenderFlex` is therefore: `mainAxisSize === 'max'` AND parent constraints are tight. This is common in practice -- a `Column` filling an `Expanded` slot receives tight constraints on both axes.

### 1.5 The Amp Reference Position

The Amp CLI binary (`j9` class, amp-strings.txt:529716) does not implement `sizedByParent` or `performResize()`. The `layout()` method on `j9` is:

```javascript
layout(g) {
  let t = !this._lastConstraints || !g.equals(this._lastConstraints);
  if (!this._needsLayout && !t) return;
  this._lastConstraints = g;
  this._needsLayout = !1;
  this.performLayout();
}
```

No two-phase protocol exists. The `.reference/render-tree.md` summary table (line 943) explicitly lists `sizedByParent` as absent from Amp. This proposal is therefore an **intentional enhancement beyond Amp fidelity**, similar to the RelayoutBoundary proposal (Gap R01). The key design principle remains: **default behavior without any opt-in must be identical to Amp**.

---

## 2. Proposed Changes

### 2.1 New `sizedByParent` Getter on `RenderBox`

Add a virtual getter to `RenderBox` that subclasses can override to declare that their size depends only on incoming constraints.

**File: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`**

```typescript
export abstract class RenderBox extends RenderObject {
  // ... existing fields ...

  /**
   * Whether this render box determines its size solely from the incoming
   * constraints, independent of its children's sizes.
   *
   * When true:
   * - performResize() is called instead of (or before) performLayout() when
   *   only constraints change.
   * - This node is always a relayout boundary (when RelayoutBoundary is
   *   implemented per Gap R01).
   * - performResize() MUST set this.size based only on this.constraints.
   * - performLayout() MUST NOT change this.size.
   *
   * Default is false. Subclasses override to return true when appropriate.
   *
   * Enhancement beyond Amp fidelity (Amp has no sizedByParent).
   */
  get sizedByParent(): boolean {
    return false;
  }

  // ... rest of class ...
}
```

### 2.2 New `performResize()` Method on `RenderBox`

Add a default `performResize()` implementation that subclasses override when they declare `sizedByParent = true`.

```typescript
export abstract class RenderBox extends RenderObject {
  // ... existing fields ...

  /**
   * Called when sizedByParent is true and constraints have changed.
   * Must set this.size based solely on this.constraints.
   * Must NOT read or depend on any child sizes.
   *
   * Default implementation sizes to constraints.smallest (the minimum
   * allowed size). Subclasses that declare sizedByParent = true SHOULD
   * override this to compute their actual size.
   *
   * This method is only called when sizedByParent is true.
   * When sizedByParent is false, this method is never called -- all
   * sizing happens in performLayout().
   *
   * Enhancement beyond Amp fidelity.
   */
  performResize(): void {
    this.size = this.constraints!.smallest;
  }

  // ... rest of class ...
}
```

### 2.3 Modified `layout()` Method on `RenderBox`

The `layout()` method must be updated to call `performResize()` when `sizedByParent` is true and constraints have changed. The key invariants are:

- When `sizedByParent` is `true`, `performResize()` is called only when constraints actually changed (not on every layout pass).
- `performLayout()` is still always called on every layout pass (to position children, set up child offsets, etc.), but it MUST NOT modify `this.size` when `sizedByParent` is true.
- The separation ensures that size computation is a pure function of constraints.

```typescript
layout(constraints: BoxConstraints): void {
  const constraintsChanged =
    !this._lastConstraints ||
    !constraints.equals(this._lastConstraints);

  if (!this._needsLayout && !constraintsChanged) return;

  this._lastConstraints = constraints;

  // Two-phase protocol: if sizedByParent, compute size first
  if (this.sizedByParent) {
    if (constraintsChanged) {
      this.performResize();
    }
  }

  this._needsLayout = false;
  this.performLayout();
}
```

### 2.4 Debug Assertion (Development Mode)

In debug mode, add an assertion that `performLayout()` does not change `this.size` when `sizedByParent` is true. This catches contract violations early, preventing subtle layout bugs.

```typescript
layout(constraints: BoxConstraints): void {
  const constraintsChanged =
    !this._lastConstraints ||
    !constraints.equals(this._lastConstraints);

  if (!this._needsLayout && !constraintsChanged) return;

  this._lastConstraints = constraints;

  if (this.sizedByParent) {
    if (constraintsChanged) {
      this.performResize();
    }
  }

  // Capture size before performLayout for debug validation
  const sizeBeforeLayout = this.sizedByParent
    ? { width: this.size.width, height: this.size.height }
    : null;

  this._needsLayout = false;
  this.performLayout();

  // Debug assertion: sizedByParent nodes must not change size in performLayout
  if (sizeBeforeLayout && process.env.NODE_ENV !== 'production') {
    const sizeAfterLayout = this.size;
    if (
      sizeAfterLayout.width !== sizeBeforeLayout.width ||
      sizeAfterLayout.height !== sizeBeforeLayout.height
    ) {
      console.warn(
        `[flitter] ${this.constructor.name} declares sizedByParent=true ` +
        `but performLayout() changed size from ` +
        `${sizeBeforeLayout.width}x${sizeBeforeLayout.height} to ` +
        `${sizeAfterLayout.width}x${sizeAfterLayout.height}. ` +
        `performLayout() must not change size when sizedByParent is true.`
      );
    }
  }
}
```

### 2.5 Note on `ContainerRenderBox`

`ContainerRenderBox` extends `RenderBox` (render-object.ts lines 341-410) and does not override `layout()`. It inherits the two-phase protocol automatically. No changes are needed to `ContainerRenderBox` itself. Subclasses of `ContainerRenderBox` (such as `RenderFlex`) can independently opt in to `sizedByParent`.

---

## 3. Existing Render Objects That Would Benefit

### 3.1 Immediate Candidates (sizedByParent = true always)

| Render Object | File | Reason |
|---|---|---|
| `RenderDivider` | `src/widgets/divider.ts` | Leaf node. Size = `(maxWidth, 1)`. No children. |

**Proposed change to `RenderDivider`:**

```typescript
export class RenderDivider extends RenderBox {
  // ... existing fields ...

  get sizedByParent(): boolean {
    return true;
  }

  performResize(): void {
    const constraints = this.constraints!;
    const width = constraints.hasBoundedWidth ? constraints.maxWidth : 80;
    this.size = constraints.constrain(new Size(width, 1));
  }

  performLayout(): void {
    // No children to layout. Size already set by performResize().
  }

  // ... paint() unchanged ...
}
```

### 3.2 Conditional Candidates (sizedByParent depends on runtime state)

| Render Object | File | Condition for sizedByParent | Reason |
|---|---|---|---|
| `RenderConstrainedBox` | `src/layout/render-constrained.ts` | When enforced constraints are tight | Size is fully determined by `enforce(parentConstraints)` result; child size is irrelevant. |
| `RenderScrollViewport` | `src/widgets/scroll-view.ts` | When parent constraints are tight | Viewport self-sizes to constraints, independent of child content size. |
| `RenderFlex` (with `mainAxisSize = 'max'`) | `src/layout/render-flex.ts` | When parent constraints are tight | A flex container with `mainAxisSize='max'` takes the full available main extent, and if cross axis is also tight, size is fully constraint-determined. |

**Proposed change to `RenderConstrainedBox`:**

```typescript
export class RenderConstrainedBox extends RenderBox {
  // ... existing fields ...

  get sizedByParent(): boolean {
    // If the enforced constraints are tight, size is determined purely
    // by the parent constraints + additionalConstraints, not by child.
    if (!this.constraints) return false;
    const enforced = this._additionalConstraints.enforce(this.constraints);
    return enforced.isTight;
  }

  performResize(): void {
    const constraints = this.constraints!;
    const enforced = this._additionalConstraints.enforce(constraints);
    // When enforced is tight, constrain returns the tight size regardless of argument.
    this.size = enforced.constrain(enforced.smallest);
  }

  performLayout(): void {
    const constraints = this.constraints!;
    const enforced = this._additionalConstraints.enforce(constraints);

    if (this._child) {
      this._child.layout(enforced);
      // When sizedByParent is true, size is already set by performResize().
      // When false, we set it here from child size.
      if (!this.sizedByParent) {
        this.size = enforced.constrain(this._child.size);
      }
    } else if (!this.sizedByParent) {
      this.size = enforced.constrain(enforced.smallest);
    }
  }

  // ... paint(), visitChildren() unchanged ...
}
```

**Proposed change to `RenderScrollViewport`:**

```typescript
export class RenderScrollViewport extends RenderBox {
  // ... existing fields ...

  get sizedByParent(): boolean {
    // Viewport size is constraint-determined when both axes are tight
    // (common case: fills an Expanded slot in a Column/Row).
    return this.constraints?.isTight ?? false;
  }

  performResize(): void {
    const constraints = this.constraints!;
    // Tight constraints: biggest === smallest, so either works.
    this.size = constraints.constrain(constraints.biggest);
  }

  performLayout(): void {
    const constraints = this.constraints!;
    if (!this._child) {
      if (!this.sizedByParent) {
        this.size = constraints.constrain(Size.zero);
      }
      return;
    }

    // Create unbounded constraints on the main axis (unchanged)
    let childConstraints: BoxConstraints;
    if (this.axisDirection === 'vertical') {
      childConstraints = new BoxConstraints({
        minWidth: constraints.minWidth,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: Infinity,
      });
    } else {
      childConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: Infinity,
        minHeight: constraints.minHeight,
        maxHeight: constraints.maxHeight,
      });
    }

    this._child.layout(childConstraints);

    // Only set self-size if not sizedByParent (when sizedByParent,
    // performResize() already set the correct size).
    if (!this.sizedByParent) {
      this.size = constraints.constrain(new Size(
        this.axisDirection === 'vertical' ? this._child.size.width : constraints.maxWidth,
        this.axisDirection === 'vertical' ? constraints.maxHeight : this._child.size.height,
      ));
    }

    // Calculate max scroll extent (unchanged)
    const childMainSize = this.axisDirection === 'vertical'
      ? this._child.size.height
      : this._child.size.width;
    const viewportMainSize = this.axisDirection === 'vertical'
      ? this.size.height
      : this.size.width;
    const maxExtent = Math.max(0, childMainSize - viewportMainSize);

    this.scrollController.updateViewportSize(viewportMainSize);
    this.scrollController.updateMaxScrollExtent(maxExtent);
    this._scrollOffset = this.scrollController.offset;

    // Position anchoring (unchanged)
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

  // ... paint() unchanged ...
}
```

### 3.3 Non-Candidates

These render objects fundamentally need child sizes to determine their own size:

| Render Object | File | Why NOT sizedByParent |
|---|---|---|
| `RenderPadding` | `src/layout/render-padded.ts` | Size = child.size + padding insets. Depends on child. |
| `RenderDecoratedBox` | `src/layout/render-decorated.ts` | Size = child.size + border widths. Depends on child. |
| `RenderText` | `src/widgets/text.ts` | Size depends on text content, wrapping, and available width. |
| `RenderFlex` (mainAxisSize='min') | `src/layout/render-flex.ts` | Size depends on children's total extent along main axis. |
| `RenderFlex` (loose cross constraints) | `src/layout/render-flex.ts` | Cross size = max of children's cross sizes. Depends on children. |

---

## 4. Integration with RelayoutBoundary (Gap R01)

### 4.1 sizedByParent as a Boundary Trigger

When Gap R01 (RelayoutBoundary) is implemented, `sizedByParent = true` becomes one of the conditions that makes a node a relayout boundary. From the R01 proposal, the boundary determination logic in `layout()` would be:

```typescript
const isRelayoutBoundary =
  !this.parent ||                // root node
  this.sizedByParent ||          // size independent of children
  constraints.isTight ||         // only one size allowed by parent
  !parentUsesSize;               // parent ignores our size
```

This is the canonical Flutter logic. A `sizedByParent` node is *always* a boundary because its size cannot change due to subtree changes, and therefore its parent's layout result cannot be affected by changes in the node's subtree.

### 4.2 How the Two Features Compose

Consider the render tree from Gap R01's motivating example:

```
RootRenderBox                        (terminal: 120x40)
  RenderFlex (Column)                (120x40)
    RenderPadding                    (120x3)   -- header
      RenderText                     (116x1)
    RenderFlex (Column)              (120x35)  -- main content
      RenderConstrainedBox           (120x1)   -- toolbar (tight)
        RenderFlex (Row)
          RenderText                 (20x1)
          RenderText                 (30x1)
      RenderFlex (Column)            (120x34)  -- body
        RenderPadding                (120x30)
          RenderFlex (Column)
            RenderText               (100x1)   <-- THIS changes
            RenderText               (100x1)
        RenderConstrainedBox         (120x4)   -- status bar (tight)
          RenderText                 (50x1)
    RenderPadding                    (120x2)   -- footer
      RenderText                     (116x1)
```

With `sizedByParent` + RelayoutBoundary:
- The toolbar `RenderConstrainedBox(120x1)` with tight additional constraints has `sizedByParent = true`, making it a relayout boundary.
- The status bar `RenderConstrainedBox(120x4)` likewise becomes a boundary.
- When the nested `RenderText` changes, `markNeedsLayout()` propagation stops at the nearest boundary.
- `performResize()` on these boundaries is skipped (constraints unchanged), and if not dirty, their entire subtree is skipped.

Without RelayoutBoundary but with `sizedByParent`, the propagation still reaches the root (current behavior). However, the `performResize()` / `performLayout()` split still provides:
- Code clarity about which render objects have constraint-only sizing.
- Debug assertions catching accidental size mutations in `performLayout()`.
- Immediate readiness for when R01 is implemented.

### 4.3 Standalone Value Without RelayoutBoundary

Even without Gap R01, `sizedByParent` + `performResize()` provides value:

1. **Code clarity**: Makes it explicit which render objects have constraint-only sizing. This is documentation-as-code.
2. **Debug assertions**: The invariant check catches bugs where `performLayout()` accidentally modifies size in a `sizedByParent` node.
3. **Future-proofing**: When RelayoutBoundary is eventually added, all the `sizedByParent` overrides are already in place.
4. **Potential for skip-children optimization**: In the future, if we need only the size of a subtree (e.g., for intrinsic size estimation), `performResize()` can run without `performLayout()`, avoiding unnecessary child layout work.

### 4.4 Why sizedByParent Cannot Be Fully Replaced by Tight Constraints Alone

One might argue that tight constraints already provide the same guarantee (size is determined by constraints, not children). However, `sizedByParent` captures a broader class of nodes:

- A `RenderDivider` with loose constraints still has `sizedByParent = true` -- its formula `(maxWidth or 80, 1)` depends only on constraints, even when constraints are not tight.
- A `RenderConstrainedBox` with `additionalConstraints = BoxConstraints.tight(10, 5)` is `sizedByParent` even when the parent passes loose constraints -- because `enforce()` makes the result tight.
- In general, `sizedByParent` is a property of the *render object's algorithm*, while tight constraints are a property of *what the parent passes*. Both trigger relayout boundaries, but they capture different information.

---

## 5. Detailed Implementation Plan

### Phase 1: Core Infrastructure

**Changes to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`:**

1. **Add `sizedByParent` getter** to `RenderBox` class (default returns `false`).
2. **Add `performResize()` method** to `RenderBox` class (default sets `this.size = this.constraints!.smallest`).
3. **Modify `RenderBox.layout()`** to call `performResize()` when `sizedByParent` is true and constraints changed. Add debug assertion for size invariant.
4. **Ensure `ContainerRenderBox`** inherits the new protocol correctly -- no changes needed since it extends `RenderBox` and does not override `layout()`.

Estimated diff: ~30 lines added to `RenderBox` class definition.

### Phase 2: Opt-in Render Object Updates

1. **`RenderDivider`** (`src/widgets/divider.ts`):
   - Override `sizedByParent` to return `true`.
   - Move sizing logic from `performLayout()` to `performResize()`.
   - Make `performLayout()` a no-op (empty body).

2. **`RenderConstrainedBox`** (`src/layout/render-constrained.ts`):
   - Override `sizedByParent` to return `true` when enforced constraints are tight.
   - Add `performResize()` for the tight case.
   - Update `performLayout()` to skip `this.size = ...` when `sizedByParent` is true.

3. **`RenderScrollViewport`** (`src/widgets/scroll-view.ts`):
   - Override `sizedByParent` to return `true` when parent constraints are tight.
   - Add `performResize()` for the tight case.
   - Update `performLayout()` to skip self-sizing when `sizedByParent` is true.

### Phase 3: Validation

1. Run all existing tests -- they must pass unchanged (backward compatibility).
2. Add new tests for the two-phase protocol (see Testing Strategy below).
3. Verify debug assertions fire correctly on violations.

---

## 6. Migration Guide for Custom Render Objects

For consumers of flitter who write custom `RenderBox` subclasses, the migration is entirely opt-in.

### Before (current, still works unchanged)

```typescript
class MyRenderBox extends RenderBox {
  performLayout(): void {
    const constraints = this.constraints!;
    // Compute size from constraints only
    this.size = constraints.constrain(new Size(constraints.maxWidth, 5));
    // Layout children
    if (this._child) this._child.layout(constraints);
  }

  paint(context: PaintContext, offset: Offset): void { /* ... */ }
}
```

### After (opt-in optimization)

```typescript
class MyRenderBox extends RenderBox {
  get sizedByParent(): boolean {
    return true; // Size depends only on constraints
  }

  performResize(): void {
    const constraints = this.constraints!;
    this.size = constraints.constrain(new Size(constraints.maxWidth, 5));
  }

  performLayout(): void {
    // MUST NOT set this.size here when sizedByParent is true.
    if (this._child) {
      this._child.layout(this.constraints!);
    }
  }

  paint(context: PaintContext, offset: Offset): void { /* ... */ }
}
```

### Key rules for opting in:

1. Override `get sizedByParent()` to return `true` (can be conditional on runtime state).
2. Implement `performResize()` to set `this.size` using only `this.constraints`.
3. Remove all `this.size = ...` assignments from `performLayout()`.
4. Never read child sizes or child layout results in `performResize()`.
5. If `sizedByParent` is conditional (returns `true` or `false` depending on constraints or configuration), ensure both code paths work correctly in `performLayout()`.

---

## 7. Testing Strategy

### 7.1 Unit Tests: Core Protocol

**File**: `src/framework/__tests__/sized-by-parent.test.ts`

```
Test 1: Default sizedByParent is false
  - Create a plain RenderBox subclass (TestRenderBox from existing tests)
  - Assert: sizedByParent === false

Test 2: performResize() is NOT called when sizedByParent is false
  - Create a RenderBox with sizedByParent = false
  - Spy on performResize
  - Call layout(constraints)
  - Assert: performResize was NOT called
  - Assert: performLayout WAS called

Test 3: performResize() IS called when sizedByParent is true and constraints changed
  - Create a RenderBox subclass that overrides sizedByParent to return true
  - Override performResize to set size = constraints.biggest
  - Spy on both performResize and performLayout
  - Call layout(constraints)
  - Assert: performResize was called BEFORE performLayout
  - Assert: performLayout was called after performResize
  - Assert: size was set by performResize, not by performLayout

Test 4: performResize() is called only when constraints change
  - Create a sizedByParent=true RenderBox
  - layout(constraintsA) -- performResize called, performLayout called
  - Force _needsLayout=true (simulating child marking parent dirty)
  - layout(constraintsA) again -- performResize NOT called (same constraints),
    but performLayout IS called (node is dirty)
  - layout(constraintsB) -- performResize called (new constraints),
    performLayout also called

Test 5: performResize() sets size from constraints only (with child present)
  - Create a sizedByParent=true RenderBox that has a child
  - Override performResize to set size = constraints.constrain(Size(10, 10))
  - Override performLayout to lay out child but NOT change size
  - layout(tight 10x10)
  - Assert: size is 10x10
  - Simulate child change (force _needsLayout=true)
  - layout(tight 10x10) again (same constraints, dirty node)
  - Assert: size is still 10x10 -- performResize was not called (same constraints)
  - Assert: performLayout WAS called (to re-layout child)

Test 6: Default performResize() returns constraints.smallest
  - Create a sizedByParent=true RenderBox that does NOT override performResize
  - layout(BoxConstraints(min: 5x3, max: 100x50))
  - Assert: size is 5x3 (smallest)

Test 7: sizedByParent + performLayout must not change size (debug check)
  - Create a sizedByParent=true RenderBox that INCORRECTLY sets this.size
    in performLayout
  - Set process.env.NODE_ENV to 'development'
  - layout(constraints)
  - Assert: console.warn was called with the violation message
  - Assert: message includes constructor name and old/new size

Test 8: Backward compatibility -- non-sizedByParent layout is unchanged
  - Create a standard RenderBox subclass (sizedByParent=false)
  - layout(constraints)
  - Assert: performLayout called, size set correctly
  - Assert: behavior is identical to current codebase
  - This is effectively a regression test ensuring the existing TestRenderBox
    from render-object.test.ts continues to work
```

### 7.2 Unit Tests: RenderDivider with sizedByParent

**File**: `src/widgets/__tests__/divider-sized-by-parent.test.ts`

```
Test 9: RenderDivider.sizedByParent is true
  - Create a RenderDivider
  - Assert: sizedByParent === true

Test 10: RenderDivider.performResize sets correct size with bounded width
  - Create a RenderDivider
  - layout(BoxConstraints(min: 0, maxWidth: 120, maxHeight: 40))
  - Assert: size.width === 120, size.height === 1

Test 11: RenderDivider.performResize uses fallback 80 for unbounded width
  - Create a RenderDivider
  - layout(BoxConstraints(min: 0, maxWidth: Infinity, maxHeight: 40))
  - Assert: size.width === 80, size.height === 1

Test 12: RenderDivider.performLayout is a no-op
  - Spy on performLayout
  - Verify it does not modify size
  - layout(constraints)
  - Capture size after performResize, verify performLayout does not change it

Test 13: RenderDivider layout skip optimization
  - layout(constraints) -- full layout (performResize + performLayout)
  - Force _needsLayout = true
  - layout(same constraints) -- performResize NOT called, performLayout called
  - layout(different constraints) -- performResize called, performLayout called
```

### 7.3 Unit Tests: RenderConstrainedBox with sizedByParent

**File**: `src/layout/__tests__/render-constrained-sized-by-parent.test.ts`

```
Test 14: sizedByParent is true when enforced constraints are tight
  - Create RenderConstrainedBox with additionalConstraints = BoxConstraints.tight(Size(10, 5))
  - layout(loose parent constraints BoxConstraints(0..100, 0..50))
  - Assert: sizedByParent === true
  - Assert: size is 10x5

Test 15: sizedByParent is false when enforced constraints are loose
  - Create RenderConstrainedBox with additionalConstraints = BoxConstraints({ maxWidth: 100 })
  - layout(loose parent constraints)
  - Assert: sizedByParent === false

Test 16: Size correct when sizedByParent is true with child present
  - Create RenderConstrainedBox tight(10x5) with a child that wants to be 3x3
  - layout(loose parent constraints)
  - Assert: size is 10x5 regardless of child size
  - Assert: child was still laid out (child.performLayout was called)

Test 17: Size correct when sizedByParent is false (child-dependent)
  - Create RenderConstrainedBox with loose additionalConstraints and child
  - layout(constraints)
  - Assert: size depends on child.size (constrained through enforced constraints)

Test 18: Child still laid out when sizedByParent is true
  - Create RenderConstrainedBox tight(10x5) with a TestRenderBox child
  - Spy on child.layout
  - layout(constraints)
  - Assert: child.layout was called with enforced constraints

Test 19: sizedByParent changes dynamically when additionalConstraints change
  - Start with tight additionalConstraints (sizedByParent = true)
  - Verify sizedByParent === true, size set by performResize
  - Change additionalConstraints to loose (sizedByParent = false)
  - markNeedsLayout(), layout again
  - Assert: sizedByParent === false, size now set by performLayout from child
```

### 7.4 Integration Tests

**File**: `src/framework/__tests__/sized-by-parent-integration.test.ts`

```
Test 20: Full pipeline with sizedByParent render objects
  - Build tree: TestContainerRenderBox -> RenderConstrainedBox(tight 10x10) -> TestRenderBox
  - layout from root
  - Assert: RenderConstrainedBox used performResize (size = 10x10)
  - Assert: child was laid out within enforced constraints
  - Assert: layout results identical to without sizedByParent opt-in

Test 21: Divider in a column-like container
  - Build tree: TestContainerRenderBox -> TestRenderBox + RenderDivider
  - layout(BoxConstraints(max: 80x24))
  - Assert: Divider has correct width (80) and height (1)
  - Assert: Divider used performResize for sizing

Test 22: Mixed tree -- some sizedByParent, some not
  - Build tree with both sizedByParent=true nodes (RenderDivider,
    tight RenderConstrainedBox) and sizedByParent=false nodes
    (RenderPadding, loose RenderConstrainedBox)
  - layout from root
  - Assert: all sizes and positions are correct
  - Assert: identical visual output to the non-optimized version

Test 23: Multiple layout passes with sizedByParent stability
  - Build tree with sizedByParent nodes
  - layout(constraints)
  - Mark a deep leaf as needing layout
  - layout(same constraints from root)
  - Assert: sizedByParent nodes only ran performResize on first pass
    (constraints unchanged on second pass)
  - Assert: final sizes identical
```

### 7.5 Regression Tests

```
Test 24: All existing render-object.test.ts tests pass unchanged
  - Run the full existing test suite
  - Assert: every test passes without modification
  - Key tests to verify:
    - "layout() with tight constraints sets size"
    - "layout() skips performLayout when constraints unchanged and not dirty"
    - "layout() re-layouts when constraints change"
    - "markNeedsLayout propagates to parent"
    - "ContainerRenderBox performLayout stacks children vertically"

Test 25: All existing render-constrained.test.ts tests pass unchanged
  - Assert: all pass (the sizedByParent optimization should produce
    identical results for all existing test scenarios)

Test 26: All existing render-flex.test.ts tests pass unchanged
  - Assert: all pass

Test 27: All existing render-decorated.test.ts tests pass unchanged
  - Assert: all pass

Test 28: All existing render-padded.test.ts tests pass unchanged
  - Assert: all pass
```

### 7.6 Performance Validation

```
Benchmark 1: Repeated layout of sizedByParent tree
  - Create tree with 50 sizedByParent leaf nodes (RenderDivider instances)
  - Measure time for 1000 layout cycles with only one leaf marked dirty
  - With sizedByParent: performResize skipped on 49 of 50 nodes
    when constraints unchanged
  - Assert: fewer total method calls per layout cycle

Benchmark 2: Constraint change propagation (terminal resize)
  - Terminal resize causes constraint change from root
  - All sizedByParent nodes run performResize once
  - Assert: each node's performResize runs exactly once per resize
  - Assert: total layout time is not significantly worse than without sizedByParent
    (the overhead of one additional getter check per node is negligible)
```

---

## 8. Edge Cases and Invariants

### 8.1 Dynamic sizedByParent

A render object's `sizedByParent` can change over its lifetime. For example, `RenderConstrainedBox` returns `true` only when its enforced constraints are tight, which depends on both `additionalConstraints` and the parent constraints. If `additionalConstraints` changes from tight to loose (via the property setter on line 40-44 of render-constrained.ts), `sizedByParent` flips from `true` to `false`.

The `layout()` method handles this correctly because it checks `this.sizedByParent` on each call, not once at construction time:

- When `sizedByParent` transitions from `true` to `false`: `performResize()` is no longer called; `performLayout()` now must set `this.size`. The existing `performLayout()` code already handles this (it has the `if (!this.sizedByParent)` guard).
- When `sizedByParent` transitions from `false` to `true`: `performResize()` is called on the next layout pass with constraint changes, and `performLayout()` skips size setting.

**Potential concern**: If `sizedByParent` changes but constraints do NOT change in the same layout pass, `performResize()` will not be called (because `constraintsChanged` is false). This is acceptable because:
- If the node is dirty (from `markNeedsLayout()` triggered by the property change), `performLayout()` will run and set the size correctly (since the `performLayout()` implementation must handle both `sizedByParent` states).
- The size should still be correct because the constraints haven't changed -- the same constraints that previously determined the size through `performResize()` would determine the same size through `performLayout()`.

However, to be safe, the implementation could also trigger `performResize()` when `sizedByParent` is true and the node is dirty, regardless of constraints:

```typescript
if (this.sizedByParent) {
  // Always call performResize when sizedByParent and either constraints
  // changed or the node was dirty (to handle sizedByParent transitions).
  this.performResize();
}
```

This is a more conservative approach that ensures correctness at the cost of an extra `performResize()` call when only `_needsLayout` is true (but constraints are unchanged). Since `performResize()` is typically a few lines of math, this cost is negligible.

### 8.2 The performResize/performLayout Contract

- `performResize()` MUST set `this.size` and MUST NOT call `child.layout()`.
- `performLayout()` MUST call `child.layout()` for each child that needs layout, but MUST NOT change `this.size` when `sizedByParent` is true.
- If a subclass declares `sizedByParent = true` but violates the contract (e.g., reads child size in `performResize` or changes size in `performLayout`), the debug assertion catches the latter. The former would need explicit documentation and code review -- the framework cannot automatically detect reads of child sizes in `performResize` because the children might not even have been laid out yet.

### 8.3 Interaction with markNeedsLayout

When `sizedByParent` is true and a child calls `markNeedsLayout()`, the parent's `performLayout()` is still invoked (to re-layout the child). But `performResize()` is NOT called again (constraints haven't changed). This is correct because the parent's size is constraint-determined and cannot change due to child layout changes.

This interaction becomes crucial when RelayoutBoundary (Gap R01) is added: a `sizedByParent` node stops the upward propagation of `markNeedsLayout()`, so the parent of the `sizedByParent` node is never dirtied. Only the `sizedByParent` node itself and its descendants run `performLayout()`.

### 8.4 Childless Render Objects

Leaf render objects (no children) that are `sizedByParent = true` have a trivially empty `performLayout()`:

```typescript
performLayout(): void {
  // No children. Size set by performResize().
}
```

This is the simplest and most common `sizedByParent` case (e.g., `RenderDivider`). The empty `performLayout()` still gets called every layout pass -- this is by design, as it maintains the invariant that `performLayout()` is always called.

### 8.5 First Layout Pass (No Previous Constraints)

On the first layout call, `_lastConstraints` is `null`, so `constraintsChanged` is always `true`. This means `performResize()` is always called on the first pass for `sizedByParent` nodes. This is correct and necessary -- the node needs its initial size.

### 8.6 Interaction with Intrinsic Size Methods

The intrinsic size methods (`getMinIntrinsicWidth`, etc.) on `RenderBox` do not interact with `sizedByParent` or `performResize()`. They have their own independent computation. However, a future optimization could use `performResize()` to answer intrinsic size queries for `sizedByParent` nodes without running full layout, since the size depends only on constraints.

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Subclass incorrectly declares sizedByParent=true but reads child size in performResize | High -- incorrect layout, potential crash if child not yet laid out | Debug assertion checks that performLayout does not change size; JSDoc clearly states the contract; code review guidelines |
| Dynamic sizedByParent transitions cause stale size | Medium -- visual glitches | `layout()` always re-evaluates `sizedByParent` each call; constraint change triggers performResize; property setters call `markNeedsLayout()` which forces re-layout |
| Performance regression from additional getter call on every layout | Negligible -- boolean getter | The `sizedByParent` getter is a trivial boolean return (or simple check of `isTight`); cost is a single virtual dispatch per layout call, far less than the `performLayout()` call itself |
| Divergence from Amp reference | Medium -- fidelity concern | Document clearly as intentional enhancement; default `false` ensures Amp-identical behavior without opt-in; no code path changes for nodes that don't override `sizedByParent` |
| Contract confusion for new contributors | Low -- learning curve | Clear JSDoc on all three methods (`sizedByParent`, `performResize`, `performLayout`); debug assertions catch violations; this document explains the protocol |
| Debug assertion overhead in development | Negligible | Size capture and comparison is two property reads and two equality checks; gated behind `process.env.NODE_ENV !== 'production'` |

---

## 10. Relationship to Other Gaps

| Gap | Relationship |
|-----|-------------|
| **R01 (RelayoutBoundary)** | `sizedByParent` is one of the four conditions that makes a node a relayout boundary. Can be implemented independently but provides maximum benefit when combined. The R01 proposal already includes `sizedByParent` in its boundary computation logic (section 3.2.4). This gap provides the implementation that R01 references. |
| **R12 (RepaintBoundary)** | Orthogonal. `sizedByParent` affects layout; RepaintBoundary affects painting. However, a node that is both a relayout boundary (via `sizedByParent`) and a repaint boundary would provide complete isolation from its subtree for both layout and paint. |
| **R13 (Hit Testing)** | Orthogonal. `sizedByParent` does not affect hit test behavior. The hit test area is determined by `this.size`, which is set correctly by either `performResize()` or `performLayout()`. |
| **R15 (parentUsesSize)** | Complementary. `parentUsesSize` is another relayout boundary trigger that operates from the parent's perspective (parent declares it doesn't use child size). `sizedByParent` operates from the child's perspective (child declares its size doesn't depend on its own children). Together they cover the full set of Flutter's boundary conditions. |
| **R16 (nodesNeedingLayout)** | Prerequisite for full optimization. Without a `_nodesNeedingLayout` list on `PipelineOwner`, the relayout boundary advantage of `sizedByParent` is not realized -- layout still starts from root. But the code clarity and debug assertion benefits of `sizedByParent` are available immediately. |

---

## 11. Implementation Ordering Recommendation

Given the dependency relationships:

1. **Implement R04 (this gap) first** -- it is self-contained and provides immediate value (code clarity, debug assertions, explicit contracts).
2. **Then implement R01 (RelayoutBoundary)** -- it depends on `sizedByParent` being available on `RenderBox` to compute boundary eligibility.
3. **Then implement R16 (nodesNeedingLayout)** -- it depends on RelayoutBoundary to populate the list.
4. **Optionally implement R15 (parentUsesSize)** -- adds another boundary trigger.

This ordering maximizes incremental value at each step and avoids any wasted work.

---

## 12. Summary

The `sizedByParent` / `performResize()` optimization is a well-understood pattern from Flutter's rendering pipeline that provides:

1. **Explicit separation** of constraint-based sizing from child-dependent layout. Makes the code self-documenting about which render objects have constraint-only sizing.
2. **Stronger invariants** that catch bugs via debug assertions. The framework can verify at runtime that `performLayout()` does not violate the size contract.
3. **Foundation for relayout boundaries** (Gap R01) where `sizedByParent` nodes are always boundaries. This is the primary performance motivation.
4. **Backward compatibility** -- the default `sizedByParent = false` preserves identical behavior to the current Amp-faithful implementation. No existing code changes behavior unless it explicitly opts in.

The implementation touches only `RenderBox.layout()` in the core framework (adding approximately 25 lines of logic including the debug assertion), plus a new getter and method on `RenderBox` (~15 lines). Opt-in overrides in specific render object subclasses add another ~50 lines across 3 files. All existing tests continue to pass without modification.

The total cost is small, the risks are well-mitigated, and the foundation it provides for the RelayoutBoundary optimization (Gap R01) makes it a high-value investment in the framework's performance architecture.
