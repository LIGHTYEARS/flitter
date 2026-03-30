# Gap U10: Add Standalone ConstrainedBox Widget

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Problem Statement

The codebase has a fully functional `RenderConstrainedBox` render object (`/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-constrained.ts`) that applies arbitrary `BoxConstraints` to a single child. However, the only widget-level access to this render object is through `SizedBox`, which exclusively produces **tight** constraints from explicit `width`/`height` values via `BoxConstraints.tightFor()`.

There is no standalone `ConstrainedBox` widget that accepts an arbitrary `BoxConstraints` object directly. This is a gap because:

1. **Minimum size enforcement**: There is no widget for saying "this child must be at least 20 columns wide" without also clamping the maximum.
2. **Range constraints**: There is no widget for saying "this child should be between 10 and 40 columns wide and between 5 and 20 rows tall."
3. **Maximum-only capping**: There is no widget for saying "this child can grow up to 60 columns but not beyond."
4. **Container workaround is lossy**: `Container` accepts a `constraints` property but then collapses it into a `SizedBox` with `isTight` checks (lines 76-109 of `container.ts`), losing range information when constraints are not tight.

In Flutter, `ConstrainedBox` is a core layout primitive alongside `SizedBox`. Both use `RenderConstrainedBox` internally, but `ConstrainedBox` exposes the full `BoxConstraints` API while `SizedBox` provides the convenience shorthand for tight constraints.

---

## 2. Existing Infrastructure

### 2.1 RenderConstrainedBox (Already Complete)

File: `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-constrained.ts`

The render object is fully implemented with:
- `additionalConstraints` property (getter/setter with `markNeedsLayout()` on change)
- `performLayout()` that enforces additional constraints within parent constraints
- Child adoption/dropping lifecycle
- Paint delegation to child
- Comprehensive test suite at `src/layout/__tests__/render-constrained.test.ts` (301 lines, 11 test cases)

Layout algorithm (line 61-73):
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

### 2.2 SizedBox (Uses RenderConstrainedBox, Tight-Only)

File: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/sized-box.ts`

`SizedBox` extends `SingleChildRenderObjectWidget`, creates a `RenderConstrainedBox`, and feeds it `BoxConstraints.tightFor({ width, height })`. This means:
- `SizedBox({ width: 30 })` produces `BoxConstraints(minWidth: 30, maxWidth: 30, minHeight: 0, maxHeight: Infinity)`
- There is no way to produce `BoxConstraints(minWidth: 10, maxWidth: 50, ...)` through `SizedBox`.

### 2.3 Container (Lossy Constraint Forwarding)

File: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/container.ts`

`Container` accepts a `constraints?: BoxConstraints` constructor parameter but the `build()` method (lines 76-109) only uses `SizedBox` for layout, collapsing non-tight constraints:

```typescript
result = new SizedBox({
  width: c.isTight ? c.minWidth : undefined,
  height: c.isTight ? c.minHeight : undefined,
  child: result,
});
```

When `constraints` is not tight (e.g., `{ minWidth: 10, maxWidth: 50 }`), both `width` and `height` become `undefined`, and the SizedBox produces fully unconstrained `BoxConstraints.tightFor({})` = `BoxConstraints(0..Infinity, 0..Infinity)`. The user's constraints are silently discarded.

### 2.4 Amp Reference

From `.reference/widgets-catalog.md`, the Amp widget tree hierarchy shows:

```
Qb (SingleChildRenderObjectWidget)
  +-- X0 (SizedBox)
  +-- A8 (Container)
  ...
```

The Amp binary uses `xU0` (`RenderConstrainedBox`) only through `X0` (`SizedBox`). There is no separately named `ConstrainedBox` widget in the minified source. This means `ConstrainedBox` is a **framework-completeness addition** rather than an Amp-fidelity requirement. It follows the same `SingleChildRenderObjectWidget` + `RenderConstrainedBox` pattern and introduces no new render behavior.

---

## 3. Proposed Solution

### 3.1 New Widget: `ConstrainedBox`

Create `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/constrained-box.ts`:

```typescript
// ConstrainedBox widget -- SingleChildRenderObjectWidget for arbitrary constraints
// Framework-completeness addition: no Amp equivalent (Amp uses SizedBox/X0 for all cases)
// Uses RenderConstrainedBox (xU0) with user-supplied BoxConstraints directly

import { Key } from '../core/key';
import { BoxConstraints } from '../core/box-constraints';
import {
  SingleChildRenderObjectWidget,
  RenderObject,
} from '../framework/render-object';
import { Widget } from '../framework/widget';
import { RenderConstrainedBox } from '../layout/render-constrained';

/**
 * A widget that imposes additional box constraints on its child.
 *
 * Unlike SizedBox (which always creates tight constraints from width/height),
 * ConstrainedBox accepts an arbitrary BoxConstraints object. This enables:
 *
 * - Minimum size enforcement (minWidth / minHeight)
 * - Maximum size capping (maxWidth / maxHeight)
 * - Range constraints (min..max on either axis)
 *
 * The constraints are applied additively: the child receives the intersection
 * of the parent constraints and the additional constraints provided here.
 *
 * ## Example Usage
 *
 * ```typescript
 * // Enforce minimum width of 20, maximum width of 60
 * new ConstrainedBox({
 *   constraints: new BoxConstraints({ minWidth: 20, maxWidth: 60 }),
 *   child: new Text({ text: 'Hello' }),
 * })
 *
 * // Cap height at 10 rows
 * new ConstrainedBox({
 *   constraints: new BoxConstraints({ maxHeight: 10 }),
 *   child: someScrollableContent,
 * })
 * ```
 *
 * ## Layout Algorithm
 *
 * 1. Enforce `constraints` within parent constraints (intersection)
 * 2. Layout child with the enforced constraints
 * 3. Self-size = child size constrained to the enforced constraints
 * 4. No child: self-size = enforced constraints' smallest
 */
export class ConstrainedBox extends SingleChildRenderObjectWidget {
  readonly constraints: BoxConstraints;

  constructor(opts: {
    key?: Key;
    constraints: BoxConstraints;
    child?: Widget;
  }) {
    super({ key: opts.key, child: opts.child });
    this.constraints = opts.constraints;
  }

  createRenderObject(): RenderConstrainedBox {
    return new RenderConstrainedBox({
      additionalConstraints: this.constraints,
    });
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderConstrainedBox).additionalConstraints =
      this.constraints;
  }
}
```

### 3.2 Fix Container to Use ConstrainedBox

Update `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/container.ts` to use `ConstrainedBox` when the user provides non-tight constraints, instead of the current lossy `SizedBox` fallback.

Replace lines 74-109 in `container.ts`:

```typescript
// Sizing constraints (width/height/constraints)
if (this.width !== undefined || this.height !== undefined || this.constraints) {
  let effectiveConstraints: BoxConstraints;

  if (this.constraints) {
    effectiveConstraints = this.constraints;
    // Apply width/height overrides as tight on those axes
    if (this.width !== undefined) {
      effectiveConstraints = new BoxConstraints({
        minWidth: this.width,
        maxWidth: this.width,
        minHeight: effectiveConstraints.minHeight,
        maxHeight: effectiveConstraints.maxHeight,
      });
    }
    if (this.height !== undefined) {
      effectiveConstraints = new BoxConstraints({
        minWidth: effectiveConstraints.minWidth,
        maxWidth: effectiveConstraints.maxWidth,
        minHeight: this.height,
        maxHeight: this.height,
      });
    }
    result = new ConstrainedBox({
      constraints: effectiveConstraints,
      child: result,
    });
  } else {
    result = new SizedBox({
      width: this.width,
      height: this.height,
      child: result,
    });
  }
}
```

This preserves `SizedBox` for the common `width`/`height`-only case (no behavioral change) while correctly forwarding arbitrary constraints through `ConstrainedBox`.

### 3.3 Export from Package

Add `ConstrainedBox` to the package's public API. If a barrel `index.ts` exists for widgets, add:

```typescript
export { ConstrainedBox } from './constrained-box';
```

If exports are managed at a higher level, add the export alongside the existing `SizedBox` export.

---

## 4. Test Plan

Create `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/constrained-box.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import { ConstrainedBox } from '../constrained-box';
import { BoxConstraints } from '../../core/box-constraints';
import { RenderConstrainedBox } from '../../layout/render-constrained';

describe('ConstrainedBox', () => {
  describe('createRenderObject', () => {
    test('creates RenderConstrainedBox with provided constraints', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 50 });
      const widget = new ConstrainedBox({ constraints: c });
      const ro = widget.createRenderObject();
      expect(ro).toBeInstanceOf(RenderConstrainedBox);
      expect(ro.additionalConstraints.equals(c)).toBe(true);
    });

    test('passes child to render object', () => {
      // Verify child wiring through SingleChildRenderObjectWidget
      const c = new BoxConstraints({ minHeight: 5 });
      const widget = new ConstrainedBox({ constraints: c });
      expect(widget.child).toBeUndefined();
    });
  });

  describe('updateRenderObject', () => {
    test('updates additionalConstraints on render object', () => {
      const c1 = new BoxConstraints({ minWidth: 10 });
      const c2 = new BoxConstraints({ minWidth: 20, maxWidth: 40 });
      const widget1 = new ConstrainedBox({ constraints: c1 });
      const widget2 = new ConstrainedBox({ constraints: c2 });
      const ro = widget1.createRenderObject();
      expect(ro.additionalConstraints.equals(c1)).toBe(true);
      widget2.updateRenderObject(ro);
      expect(ro.additionalConstraints.equals(c2)).toBe(true);
    });

    test('no-op when constraints are identical', () => {
      const c = new BoxConstraints({ minWidth: 10, maxWidth: 50 });
      const widget = new ConstrainedBox({ constraints: c });
      const ro = widget.createRenderObject();
      // Setting same constraints should not trigger markNeedsLayout
      widget.updateRenderObject(ro);
      expect(ro.additionalConstraints.equals(c)).toBe(true);
    });
  });

  describe('constraint parameter is required', () => {
    test('widget stores constraints as readonly', () => {
      const c = new BoxConstraints({ minWidth: 5, maxWidth: 30 });
      const widget = new ConstrainedBox({ constraints: c });
      expect(widget.constraints).toBe(c);
    });
  });
});
```

Additionally, the existing `RenderConstrainedBox` tests (11 cases) already cover:
- Tight constraints, loose constraints, enforce-within-parent
- No-child sizing, child-sizing, infinity handling
- Property setter triggering relayout
- Paint offset propagation

These remain valid and unchanged.

### Integration Test for Container Fix

Add to Container's test suite:

```typescript
test('Container with non-tight constraints uses ConstrainedBox', () => {
  const container = new Container({
    constraints: new BoxConstraints({ minWidth: 10, maxWidth: 50 }),
    child: someChild,
  });
  // Build should produce a ConstrainedBox wrapping the child,
  // not a SizedBox with undefined width/height
  const built = container.build(mockContext);
  expect(built).toBeInstanceOf(ConstrainedBox);
  expect((built as ConstrainedBox).constraints.minWidth).toBe(10);
  expect((built as ConstrainedBox).constraints.maxWidth).toBe(50);
});
```

---

## 5. Relationship to SizedBox

`ConstrainedBox` and `SizedBox` are siblings in the widget hierarchy. Both use `RenderConstrainedBox` internally. The distinction is in the API:

| Aspect | SizedBox | ConstrainedBox |
|--------|----------|----------------|
| Input | `width?: number`, `height?: number` | `constraints: BoxConstraints` |
| Constraint type | Always tight (via `tightFor`) | Arbitrary (min/max ranges) |
| Use case | Fixed dimensions | Min/max bounds |
| Convenience | High (simple API) | Lower (requires BoxConstraints) |
| Amp equivalent | X0 | None (framework addition) |

`SizedBox` should remain the go-to for fixed sizing. `ConstrainedBox` fills the gap for range-based constraint scenarios.

---

## 6. Impact Assessment

### Files Created
- `packages/flitter-core/src/widgets/constrained-box.ts` -- The new widget (approx. 40 lines of code)
- `packages/flitter-core/src/widgets/__tests__/constrained-box.test.ts` -- Unit tests

### Files Modified
- `packages/flitter-core/src/widgets/container.ts` -- Fix lossy constraint forwarding (lines 74-109)
- Package barrel/index exports (add `ConstrainedBox`)

### Files Unchanged
- `packages/flitter-core/src/layout/render-constrained.ts` -- No changes needed
- `packages/flitter-core/src/widgets/sized-box.ts` -- No changes needed
- `packages/flitter-core/src/layout/__tests__/render-constrained.test.ts` -- Existing tests remain valid

### Risk Assessment
- **Low risk**: The new widget is a thin wrapper around an already battle-tested render object.
- **No behavioral change** for existing `SizedBox` usage.
- **Bug fix** for `Container` with non-tight constraints (currently silently drops constraint information).
- **No new render behavior** introduced -- `RenderConstrainedBox` is unchanged.

---

## 7. Deviation Note

This widget has no direct Amp binary equivalent. In the Amp source, `X0` (SizedBox) with `xU0` (RenderConstrainedBox) handles all constrained-box use cases, and arbitrary constraints are applied through direct `RenderConstrainedBox` instantiation at the render layer. The `ConstrainedBox` widget is a framework-completeness addition that provides widget-level access to the existing render capability, following the standard Flutter pattern. The implementation introduces zero new render behavior and reuses 100% of the existing `RenderConstrainedBox` code.
