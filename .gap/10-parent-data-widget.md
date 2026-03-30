# Gap F10: ParentDataWidget Not Yet Used by Positioned

## Status: Proposal
## Affected packages: `flitter-core`
## Plan reference: 07-01b

---

## 1. Problem Statement

In the Amp binary, `Positioned` (Amp: `L4`) extends `R_` (ParentDataWidget) and uses the
`ParentDataElement` (Amp: `iU0`) lifecycle to write `StackParentData` onto its child's render
object. This is the canonical Flutter/Amp pattern: parent data widgets do not create their own
render objects; they configure metadata on a child's render object that the *grandparent*
render object (e.g., `RenderStack`, `RenderFlex`) reads during layout.

In the current flitter-core codebase, `Positioned` is implemented as a
`SingleChildRenderObjectWidget` that creates a `RenderPositioned` render object. This
`RenderPositioned` is a thin wrapper that stores the six positional fields (`left`, `top`,
`right`, `bottom`, `width`, `height`) directly on itself and delegates layout and painting to
its child. The parent `RenderStack` then uses `instanceof RenderPositioned` checks to detect
positioned children and reads the positioning data from the `RenderPositioned` instance rather
than from `StackParentData` on the child's render object.

This workaround was implemented because `ParentDataWidget` and `ParentDataElement` were not
yet available at the time `stack.ts` was written. Those classes now exist in
`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/parent-data-widget.ts` and are
already successfully used by `Flexible` and `Expanded` to configure `FlexParentData` on
children of `Row`/`Column`/`Flex`.

### Concrete Amp Reference

From `.reference/widgets-catalog.md` lines 756-765:

```javascript
class L4 extends R_ {
  left; top; right; bottom; width; height;

  constructor({ key, left, top, right, bottom, width, height, child })

  createParentData() {
    return new uE(this.left, this.top, this.right, this.bottom, this.width, this.height);
  }
}
```

`L4` extends `R_` (ParentDataWidget), not `Qb` (SingleChildRenderObjectWidget). It has no
`createRenderObject()` or `updateRenderObject()`. Instead, it implements `createParentData()`
and relies on the `ParentDataElement` mechanism to apply `StackParentData` onto the child
render object that `RenderStack` will read during layout.

---

## 2. Current Workaround Analysis

### 2.1 Architecture Deviation

The current implementation introduces an extra render object (`RenderPositioned`) into the
render tree between `RenderStack` and the actual child's render object. In the Amp
architecture, `Positioned` does not produce a render object at all -- it is a pure metadata
widget. The element tree path should be:

```
Amp (correct):
  MultiChildRenderObjectElement (Stack)
    -> ParentDataElement (Positioned)  -- NO render object
      -> RenderObjectElement (child)   -- render object has StackParentData set by Positioned

Current flitter-core (workaround):
  MultiChildRenderObjectElement (Stack)
    -> SingleChildRenderObjectElement (Positioned) -- creates RenderPositioned
      -> RenderObjectElement (child)                -- render object ignored by RenderStack
```

### 2.2 Specific Problems

**Extra render tree node**: `RenderPositioned` is an unnecessary intermediate `RenderBox` in
the render tree. It adds memory overhead, an extra layout pass, and an extra paint pass for
every positioned child. In a TUI with multiple overlays (permission dialog, command palette,
file picker, badges), this multiplies.

**Dual detection logic in RenderStack**: Because of the workaround, `RenderStack._isPositioned()`
and `_getPositionData()` must check two paths:

```typescript
// Path 1: workaround (current primary)
if (child instanceof RenderPositioned) {
  return child.isPositioned();
}
// Path 2: correct ParentDataWidget path (currently fallback)
if (child.parentData instanceof StackParentData) {
  return child.parentData.isPositioned();
}
```

This dual detection should collapse to a single `StackParentData` check.

**Inconsistency with Flexible/Expanded**: `Flexible` and `Expanded` already use
`ParentDataWidget` correctly. `Positioned` is the only parent-data-style widget still using
the `SingleChildRenderObjectWidget` workaround. This inconsistency makes the codebase harder
to understand and maintain.

**Incorrect widget type**: Code that checks `widget instanceof ParentDataWidget` (for
validation, debugging, or diagnostics) will not recognize `Positioned` as a parent data
widget, since it currently extends `SingleChildRenderObjectWidget`.

**Amp fidelity violation**: The CLAUDE.md development rules state: "If Amp does X, we do X."
Amp's `L4` extends `R_` (ParentDataWidget). The current implementation violates this rule.

### 2.3 Files Affected by the Workaround

| File | What needs to change |
|------|---------------------|
| `packages/flitter-core/src/widgets/stack.ts` | `Positioned` class, `RenderPositioned` class, `RenderStack` internals |
| `packages/flitter-core/src/widgets/__tests__/scroll-stack-builder.test.ts` | Tests for Stack/Positioned |

---

## 3. Proposed Implementation

### 3.1 Refactor `Positioned` to Extend `ParentDataWidget`

Replace the current `Positioned extends SingleChildRenderObjectWidget` with
`Positioned extends ParentDataWidget`, following the exact pattern used by `Flexible`.

```typescript
// file: packages/flitter-core/src/widgets/stack.ts

import { ParentDataWidget } from './parent-data-widget';
import { RenderObject } from '../framework/render-object';

/**
 * A widget that controls where a child of a Stack is positioned.
 * Wraps a child and applies StackParentData fields to the child's render object.
 *
 * Amp ref: class L4 extends R_ (ParentDataWidget)
 */
export class Positioned extends ParentDataWidget {
  readonly left?: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly width?: number;
  readonly height?: number;

  constructor(opts: {
    key?: Key;
    child: Widget;
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
    width?: number;
    height?: number;
  }) {
    super({ key: opts.key, child: opts.child });
    this.left = opts.left;
    this.top = opts.top;
    this.right = opts.right;
    this.bottom = opts.bottom;
    this.width = opts.width;
    this.height = opts.height;
  }

  /**
   * Apply positioning data to the child's render object's parentData.
   *
   * Amp ref: L4.applyParentData(renderObject) via R_.applyParentData
   */
  applyParentData(renderObject: RenderObject): void {
    if (renderObject.parentData instanceof StackParentData) {
      const pd = renderObject.parentData;
      let needsLayout = false;

      if (pd.left !== this.left) {
        pd.left = this.left;
        needsLayout = true;
      }
      if (pd.top !== this.top) {
        pd.top = this.top;
        needsLayout = true;
      }
      if (pd.right !== this.right) {
        pd.right = this.right;
        needsLayout = true;
      }
      if (pd.bottom !== this.bottom) {
        pd.bottom = this.bottom;
        needsLayout = true;
      }
      if (pd.width !== this.width) {
        pd.width = this.width;
        needsLayout = true;
      }
      if (pd.height !== this.height) {
        pd.height = this.height;
        needsLayout = true;
      }

      if (needsLayout && renderObject.parent) {
        (renderObject.parent as RenderObject).markNeedsLayout();
      }
    }
  }
}
```

Key differences from the current implementation:

1. **No `createRenderObject()` or `updateRenderObject()`** -- these are not needed because
   `ParentDataWidget` does not create render objects.
2. **No `widthValue`/`heightValue` renaming** -- the current code renames `width`/`height` to
   `widthValue`/`heightValue` to avoid shadowing the `HTMLElement` dimension properties. With
   `ParentDataWidget` (which has no render object), there is no such collision. The fields can
   use the natural names `width` and `height`.
3. **`applyParentData()` writes to `StackParentData`** on the child render object, following
   the same pattern as `Flexible.applyParentData()` writes to `FlexParentData`.
4. **`createElement()` returns `ParentDataElement`** -- inherited from `ParentDataWidget` base
   class. No override needed.

### 3.2 Remove `RenderPositioned`

The entire `RenderPositioned` class (lines 157-223 in the current `stack.ts`) should be
deleted. It exists solely to support the workaround and has no Amp equivalent.

### 3.3 Simplify `RenderStack` Internal Helpers

With `Positioned` writing to `StackParentData` through the `ParentDataWidget` mechanism, the
dual detection logic in `RenderStack` can be simplified.

#### Before (current):

```typescript
private _isPositioned(child: RenderBox): boolean {
  // Path 1: workaround
  if (child instanceof RenderPositioned) {
    return child.isPositioned();
  }
  // Path 2: ParentDataWidget path
  if (child.parentData instanceof StackParentData) {
    return child.parentData.isPositioned();
  }
  return false;
}

private _getPositionData(child: RenderBox): { ... } {
  // Path 1: workaround
  if (child instanceof RenderPositioned) {
    return {
      left: child.left,
      top: child.top,
      right: child.right,
      bottom: child.bottom,
      width: child.widthValue,
      height: child.heightValue,
    };
  }
  // Path 2: ParentDataWidget path
  if (child.parentData instanceof StackParentData) {
    const pd = child.parentData;
    return { left: pd.left, top: pd.top, right: pd.right,
             bottom: pd.bottom, width: pd.width, height: pd.height };
  }
  return {};
}
```

#### After (proposed):

```typescript
private _isPositioned(child: RenderBox): boolean {
  if (child.parentData instanceof StackParentData) {
    return child.parentData.isPositioned();
  }
  return false;
}

private _getPositionData(child: RenderBox): {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
} {
  if (child.parentData instanceof StackParentData) {
    const pd = child.parentData;
    return {
      left: pd.left,
      top: pd.top,
      right: pd.right,
      bottom: pd.bottom,
      width: pd.width,
      height: pd.height,
    };
  }
  return {};
}
```

This eliminates the `RenderPositioned` import and the `instanceof RenderPositioned` checks
entirely. `RenderStack.setupParentData()` already creates `StackParentData` instances for all
children (line 244-248 of current `stack.ts`), so the `ParentDataElement._applyParentData()`
call will find a `StackParentData` instance ready to be configured.

### 3.4 Update Exports

The module's public exports must be updated:

- **Remove**: `RenderPositioned` export
- **Keep**: `StackParentData`, `Stack`, `Positioned`, `RenderStack`, `StackFit`

Any barrel file (`index.ts`) that re-exports `RenderPositioned` must be updated.

### 3.5 Handle `_reapplyParentData` in `MultiChildRenderObjectElement`

The `_reapplyParentData()` method in `MultiChildRenderObjectElement` (element.ts line 919-925)
already handles `ParentDataElement` instances. When the element has a `_applyParentData`
method, it calls it to restore parent data after `setupParentData()` overwrites it during
`insert`/`adoptChild`. This mechanism already works for `Flexible`/`Expanded` and will work
for `Positioned` once it becomes a `ParentDataWidget`.

The key lifecycle is:

1. `MultiChildRenderObjectElement.mount()` inflates each child widget into an element
2. The child element is mounted (if it is a `ParentDataElement`, it runs `_applyParentData()`)
3. The child's render object is inserted into the parent render object via `insert()`
4. `insert()` calls `adoptChild()` which calls `setupParentData()`, creating fresh
   `StackParentData` and potentially overwriting values set in step 2
5. `_reapplyParentData(elem)` is called, which finds the `ParentDataElement` and re-runs
   `_applyParentData()` to restore the values

This existing mechanism handles the `Positioned` case without modification.

---

## 4. Detailed Migration Steps

### Step 1: Update `stack.ts` imports

Add import for `ParentDataWidget`:

```typescript
import { ParentDataWidget } from './parent-data-widget';
```

Remove `SingleChildRenderObjectWidget` from the render-object imports if it was only used
by `Positioned`.

### Step 2: Rewrite `Positioned` class

Replace the class body as shown in Section 3.1. The constructor signature remains the same
(no breaking API change for users). The only visible difference is that `Positioned` now
extends `ParentDataWidget` instead of `SingleChildRenderObjectWidget`, and the `widthValue`/
`heightValue` renaming is eliminated in favor of the natural `width`/`height` names.

### Step 3: Delete `RenderPositioned` class

Remove the entire class definition (currently lines 149-223 of `stack.ts`).

### Step 4: Simplify `RenderStack._isPositioned()` and `_getPositionData()`

Remove the `RenderPositioned` code paths as shown in Section 3.3.

### Step 5: Update exports

Remove `RenderPositioned` from the module's exports. Search for and update any import
statements in other files that reference `RenderPositioned`.

### Step 6: Update tests

See Section 5 below.

---

## 5. Testing Strategy

### 5.1 Existing Tests That Must Continue to Pass

The following test suites exercise Stack/Positioned behavior and must pass without
modification to their *assertions* (though test setup code may need to change):

**`scroll-stack-builder.test.ts`** (lines 354-648):
- Stack widget creation (default and custom fit)
- `RenderStack` layout with loose/expand/passthrough fit
- Non-positioned children laid out and positioned at (0,0)
- Stack self-sizing to max of non-positioned children
- Positioned child placement with left+top, right+bottom
- Determined width from left+right
- Explicit width constraint
- `StackParentData.isPositioned()` behavior
- Painting all children with correct offsets

Any tests that directly construct `RenderPositioned` objects and insert them into
`RenderStack` must be updated to instead use `StackParentData` on regular `RenderBox`
children, since `RenderPositioned` no longer exists.

**`flex-widgets.test.ts`** (lines 265-401):
- `ParentDataWidget` abstract contract
- `ParentDataElement` creation
- `Flexible.applyParentData()` on `FlexParentData`
- `Expanded` is instance of `ParentDataWidget`

These tests should pass unchanged, since the `ParentDataWidget` infrastructure is not being
modified.

### 5.2 New Tests to Add

#### Test: Positioned extends ParentDataWidget

```typescript
describe('Positioned (as ParentDataWidget)', () => {
  test('is an instance of ParentDataWidget', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({ child, left: 5, top: 10 });
    expect(positioned).toBeInstanceOf(ParentDataWidget);
  });

  test('createElement returns ParentDataElement', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({ child, left: 5 });
    const elem = positioned.createElement();
    expect(elem).toBeInstanceOf(ParentDataElement);
  });

  test('stores positioning properties', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({
      child,
      left: 1,
      top: 2,
      right: 3,
      bottom: 4,
      width: 5,
      height: 6,
    });
    expect(positioned.left).toBe(1);
    expect(positioned.top).toBe(2);
    expect(positioned.right).toBe(3);
    expect(positioned.bottom).toBe(4);
    expect(positioned.width).toBe(5);
    expect(positioned.height).toBe(6);
  });

  test('properties default to undefined', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({ child });
    expect(positioned.left).toBeUndefined();
    expect(positioned.top).toBeUndefined();
    expect(positioned.right).toBeUndefined();
    expect(positioned.bottom).toBeUndefined();
    expect(positioned.width).toBeUndefined();
    expect(positioned.height).toBeUndefined();
  });
});
```

#### Test: applyParentData writes to StackParentData

```typescript
describe('Positioned.applyParentData', () => {
  test('sets all six fields on StackParentData', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({
      child,
      left: 1, top: 2, right: 3, bottom: 4, width: 5, height: 6,
    });

    const renderObj = new FixedSizeBox(10, 10);
    renderObj.parentData = new StackParentData();

    positioned.applyParentData(renderObj);

    const pd = renderObj.parentData as StackParentData;
    expect(pd.left).toBe(1);
    expect(pd.top).toBe(2);
    expect(pd.right).toBe(3);
    expect(pd.bottom).toBe(4);
    expect(pd.width).toBe(5);
    expect(pd.height).toBe(6);
  });

  test('marks parent as needing layout when values change', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({ child, left: 5 });

    const renderObj = new FixedSizeBox(10, 10);
    const parentObj = new RenderStack();
    renderObj.parentData = new StackParentData();
    parentObj.insert(renderObj);

    // Spy on markNeedsLayout
    let layoutRequested = false;
    const origMark = parentObj.markNeedsLayout.bind(parentObj);
    parentObj.markNeedsLayout = () => { layoutRequested = true; origMark(); };

    positioned.applyParentData(renderObj);
    expect(layoutRequested).toBe(true);
  });

  test('does not mark layout if values unchanged', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({ child, left: 5 });

    const renderObj = new FixedSizeBox(10, 10);
    renderObj.parentData = new StackParentData();
    (renderObj.parentData as StackParentData).left = 5; // already set

    const parentObj = new RenderStack();
    parentObj.insert(renderObj);

    let layoutRequested = false;
    const origMark = parentObj.markNeedsLayout.bind(parentObj);
    parentObj.markNeedsLayout = () => { layoutRequested = true; origMark(); };

    positioned.applyParentData(renderObj);
    expect(layoutRequested).toBe(false);
  });

  test('does not crash on non-StackParentData', () => {
    const child = new TestLeafWidget(10, 10);
    const positioned = new Positioned({ child, left: 5 });

    const renderObj = new FixedSizeBox(10, 10);
    // parentData is default ParentData, not StackParentData
    expect(() => positioned.applyParentData(renderObj)).not.toThrow();
  });
});
```

#### Test: RenderStack reads from StackParentData (no RenderPositioned)

```typescript
describe('RenderStack with StackParentData (no RenderPositioned)', () => {
  test('detects positioned child via StackParentData', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const child = new TestRenderBox(new Size(10, 10));

    stack.insert(child);

    // Manually set StackParentData (simulating what ParentDataElement does)
    const pd = child.parentData as StackParentData;
    pd.left = 5;
    pd.top = 10;

    stack.layout(new BoxConstraints({
      minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 30,
    }));

    expect(child.offset.col).toBe(5);
    expect(child.offset.row).toBe(10);
  });

  test('positioned child with right+bottom computes correct offset', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const nonPosChild = new TestRenderBox(new Size(40, 30));
    const posChild = new TestRenderBox(new Size(10, 10));

    stack.insert(nonPosChild);
    stack.insert(posChild);

    const pd = posChild.parentData as StackParentData;
    pd.right = 5;
    pd.bottom = 3;

    stack.layout(new BoxConstraints({
      minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 30,
    }));

    // Stack size = 40x30 (from nonPosChild)
    // posChild offset: x = 40 - 5 - 10 = 25, y = 30 - 3 - 10 = 17
    expect(posChild.offset.col).toBe(25);
    expect(posChild.offset.row).toBe(17);
  });

  test('determined width from left+right via StackParentData', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const nonPosChild = new TestRenderBox(new Size(40, 30));
    const posChild = new TestRenderBox(new Size(10, 10));

    stack.insert(nonPosChild);
    stack.insert(posChild);

    const pd = posChild.parentData as StackParentData;
    pd.left = 5;
    pd.right = 10;

    stack.layout(new BoxConstraints({
      minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 30,
    }));

    // Width should be 40 - 5 - 10 = 25 (tight constraint)
    expect(posChild.constraints!.minWidth).toBe(25);
    expect(posChild.constraints!.maxWidth).toBe(25);
    expect(posChild.offset.col).toBe(5);
  });
});
```

### 5.3 Integration Test: Full Widget Tree with Stack + Positioned

An integration test should mount a complete widget tree through the element framework to
verify the end-to-end flow:

```typescript
describe('Stack + Positioned integration', () => {
  test('Positioned applies StackParentData through element tree', () => {
    // Build widget tree
    const leaf = new TestLeafWidget(10, 10);
    const positioned = new Positioned({ child: leaf, left: 5, top: 3 });
    const bgChild = new TestLeafWidget(40, 30);
    const stack = new Stack({ children: [bgChild, positioned] });

    // Inflate and mount through element tree
    const element = stack.createElement();
    element.mount();

    // Get the render object for RenderStack
    const renderStack = element.renderObject as RenderStack;

    // Layout
    renderStack.layout(new BoxConstraints({
      minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24,
    }));

    // Verify: the positioned child's render object should have
    // StackParentData with left=5, top=3, and be offset at (5, 3)
    const children = [...renderStack.children];
    expect(children.length).toBe(2);

    const positionedChildRO = children[1];
    expect(positionedChildRO.parentData).toBeInstanceOf(StackParentData);
    expect((positionedChildRO.parentData as StackParentData).left).toBe(5);
    expect((positionedChildRO.parentData as StackParentData).top).toBe(3);
    expect(positionedChildRO.offset.col).toBe(5);
    expect(positionedChildRO.offset.row).toBe(3);
  });
});
```

### 5.4 Regression Guard: RenderPositioned Must Not Exist

```typescript
test('RenderPositioned is not exported (removed)', () => {
  const stackModule = require('../stack');
  expect(stackModule.RenderPositioned).toBeUndefined();
});
```

---

## 6. Risk Assessment

### 6.1 Breaking Changes

| Change | Risk | Mitigation |
|--------|------|------------|
| `Positioned` no longer extends `SingleChildRenderObjectWidget` | Medium | Any code doing `widget instanceof SingleChildRenderObjectWidget` to detect Positioned will break. Search the codebase. |
| `RenderPositioned` removed | Medium | Any code directly constructing or checking `instanceof RenderPositioned` will break. Grep for all references. |
| `Positioned.widthValue` / `Positioned.heightValue` renamed to `width` / `height` | Low | External API uses constructor option names (`width`, `height`), which are unchanged. Only internal access to `widthValue`/`heightValue` is affected. |
| `RenderStack` children list no longer contains `RenderPositioned` nodes | Medium | The render tree is flatter. Tests that inspect render tree structure must be updated. |

### 6.2 Edge Cases

**Nested ParentDataWidgets**: A `Positioned` wrapping a `Flexible` (or vice versa) is
semantically invalid but should not crash. The `applyParentData()` method guards against
wrong `parentData` types with `instanceof` checks.

**Empty Positioned**: A `Positioned` with no positional properties set (all undefined) should
behave identically to a non-positioned child. `StackParentData.isPositioned()` returns `false`
when all fields are undefined, so `RenderStack` will treat it as non-positioned.

**ParentData overwrite during insert**: As documented in Section 3.5, the
`_reapplyParentData()` mechanism in `MultiChildRenderObjectElement` handles the case where
`setupParentData()` creates a fresh `StackParentData` after `Positioned` has already applied
its values.

---

## 7. Relationship to Other Gaps

### Gap F06: ProxyWidget

Gap F06 proposes introducing a `ProxyWidget` / `ProxyElement` base class to factor out the
single-child lifecycle shared by `InheritedWidget` and `ParentDataWidget`. This gap (F10) is
independent of F06 -- the `Positioned` refactoring should be done first using the existing
`ParentDataWidget` base class. If F06 is later implemented, `Positioned` will automatically
benefit because it extends `ParentDataWidget`, which would then extend `ProxyWidget`.

### Gap F09: Type Safety / `any` Removal

Gap F09 notes that `_reapplyParentData()` in `MultiChildRenderObjectElement` uses a duck-typed
`_applyParentData` check. Once F10 is implemented, `Positioned` will go through the same
`ParentDataElement` path as `Flexible`/`Expanded`, making the duck-typed check more
consistently exercised. F09's proposed `reapplyParentData()` public method would complement
this change.

---

## 8. Implementation Checklist

- [ ] Add `ParentDataWidget` import to `stack.ts`
- [ ] Rewrite `Positioned` class to extend `ParentDataWidget`
- [ ] Implement `Positioned.applyParentData()` to write `StackParentData`
- [ ] Delete `RenderPositioned` class entirely
- [ ] Remove `RenderPositioned` from module exports
- [ ] Simplify `RenderStack._isPositioned()` -- remove `instanceof RenderPositioned` path
- [ ] Simplify `RenderStack._getPositionData()` -- remove `RenderPositioned` path
- [ ] Remove `SingleChildRenderObjectWidget` import if no longer used in `stack.ts`
- [ ] Update `scroll-stack-builder.test.ts` -- replace `RenderPositioned` usage with
      `StackParentData` on regular render boxes
- [ ] Add new unit tests for `Positioned.applyParentData()`
- [ ] Add `instanceof ParentDataWidget` assertion test
- [ ] Add integration test for full Stack + Positioned element tree
- [ ] Add regression test verifying `RenderPositioned` is no longer exported
- [ ] Search codebase for any remaining `RenderPositioned` references and update
- [ ] Run full test suite: `bun test`
- [ ] Verify Amp reference compliance: `Positioned` extends `R_` (ParentDataWidget)

---

## 9. Estimated Effort

- **Complexity**: Low-Medium
- **Lines changed**: ~150 removed (RenderPositioned + dual detection), ~80 added
  (applyParentData + tests), net reduction ~70 lines
- **Risk**: Medium (render tree structure change, but well-precedented by Flexible/Expanded)
- **Dependencies**: None -- `ParentDataWidget` and `ParentDataElement` already exist and work
- **Testing**: ~4 hours (update existing tests, write new tests, run integration)
- **Total estimate**: 1 day
