# Gap F06: No ProxyWidget Intermediate Class

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Problem Statement

In Flutter, `ProxyWidget` is an abstract intermediate class that sits between `Widget` and
both `InheritedWidget` and `ParentDataWidget`. It provides a shared abstraction for widgets
that hold a single `child` but delegate rendering to that child rather than building their
own widget subtree or creating a render object. The corresponding `ProxyElement` base class
factors out the single-child mount/update/unmount lifecycle that both `InheritedElement` and
`ParentDataElement` share.

In flitter-core, this intermediate layer does not exist. Both `InheritedWidget` and
`ParentDataWidget` extend `Widget` (Amp: `Sf`) directly. Similarly, `InheritedElement` and
`ParentDataElement` both extend `Element` (Amp: `T$`) directly, each independently
implementing near-identical single-child element lifecycle code.

### Flutter Hierarchy (Reference)

```
Widget
  +-- ProxyWidget              <-- abstract, holds `child: Widget`
  |     +-- InheritedWidget    <-- adds updateShouldNotify()
  |     +-- ParentDataWidget   <-- adds applyParentData()
  +-- StatelessWidget
  +-- StatefulWidget
  +-- RenderObjectWidget

Element
  +-- ProxyElement             <-- abstract, single-child mount/update/unmount
  |     +-- InheritedElement   <-- adds dependency tracking, notifyDependents()
  |     +-- ParentDataElement  <-- adds _applyParentData()
  +-- ComponentElement
  |     +-- StatelessElement
  |     +-- StatefulElement
  +-- RenderObjectElement
```

### Flitter-Core Hierarchy (Current)

```
Widget (Sf)
  +-- InheritedWidget (Bt)     <-- directly extends Widget, holds child
  +-- ParentDataWidget (R_)    <-- directly extends Widget, holds child
  +-- StatelessWidget (H3)
  +-- StatefulWidget (H8)
  +-- RenderObjectWidget (yj)

Element (T$)
  +-- InheritedElement (Z_0)   <-- directly extends Element, manages single child
  +-- ParentDataElement (iU0)  <-- directly extends Element, manages single child
  +-- StatelessElement (lU0)
  +-- StatefulElement (V_0)
  +-- RenderObjectElement (oj)
```

---

## 2. Current Behavior Analysis

### 2.1 InheritedWidget (`/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`, lines 284-303)

```typescript
export abstract class InheritedWidget extends Widget {
  readonly child: Widget;

  constructor(opts: { key?: Key; child: Widget }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts.child;
  }

  createElement(): any {
    const { InheritedElement } = require('./element');
    return new InheritedElement(this);
  }

  abstract updateShouldNotify(oldWidget: InheritedWidget): boolean;
}
```

### 2.2 ParentDataWidget (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/parent-data-widget.ts`, lines 29-47)

```typescript
export abstract class ParentDataWidget extends Widget {
  readonly child: Widget;

  constructor(opts: { key?: Key; child: Widget }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts.child;
  }

  abstract applyParentData(renderObject: RenderObject): void;

  createElement(): ParentDataElement {
    return new ParentDataElement(this);
  }
}
```

### 2.3 Duplicated Code in Elements

`InheritedElement` (`/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`, lines 411-498) and `ParentDataElement` (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/parent-data-widget.ts`, lines 62-169) both independently implement:

1. A `_child: Element | undefined` field
2. A `mount()` method that creates an element from the child widget, adds it, mounts it, then calls `markMounted()`
3. An `unmount()` method that unmounts/removes the child, then calls `super.unmount()`
4. An `update(newWidget)` method that swaps the widget, diffs the child via `canUpdate()`, and either updates in-place or replaces the child element
5. A `renderObject` getter that delegates to `this._child?.renderObject`
6. A `performRebuild()` that is a no-op
7. A private `_mountChild()` helper that duck-types the `mount()` call

The duplication is substantial -- approximately 40-50 lines of near-identical logic in each class.

### 2.4 Amp Reference Confirmation

The Amp binary (the authoritative reference for this project) does **not** have a `ProxyWidget` or `ProxyElement` class. The hierarchy is:

- `Bt` (InheritedWidget) extends `Sf` (Widget) directly
- `R_` (ParentDataWidget) extends `Sf` (Widget) directly
- `Z_0` (InheritedElement) extends `T$` (Element) directly
- `iU0` (ParentDataElement) extends `T$` (Element) directly

This is confirmed by:
- `.reference/element-tree.md` line 468: `class Bt extends Sf`
- `.reference/element-tree.md` line 538: `class R_ extends Sf`
- `.reference/widget-tree.md` line 627: `class Bt extends Sf`
- `.reference/widgets-catalog.md` hierarchy tree (lines 46-83)

---

## 3. Impact Assessment

### 3.1 What Works Today

- `InheritedWidget` and `InheritedElement` are fully functional. Dependency tracking (`addDependent`, `removeDependent`, `notifyDependents`) works correctly. `updateShouldNotify` is called during update.
- `ParentDataWidget` and `ParentDataElement` are fully functional. `Flexible`, `Expanded`, and `Positioned` all extend `ParentDataWidget` and correctly apply parent data to child render objects.
- The `dependOnInheritedWidgetOfExactType()` lookup on `Element` and `BuildContextImpl` works.
- The `_reapplyParentData()` in `MultiChildRenderObjectElement` works with the current `ParentDataElement` implementation.

### 3.2 What Is Suboptimal

1. **Code duplication**: ~50 lines of nearly identical single-child element management are duplicated between `InheritedElement` and `ParentDataElement`.
2. **Type-checking gap**: There is no common type to check `instanceof ProxyWidget` or `instanceof ProxyElement` when code needs to distinguish "pass-through single-child widgets" from component or render object widgets.
3. **API surface gap**: Flutter framework code sometimes uses `ProxyElement` as a type in visitors, debugging tools, and diagnostics. Without this type, equivalent flitter code must check for `InheritedElement || ParentDataElement` separately.
4. **Extensibility**: Any future single-child pass-through widget type (e.g., `NotificationListener` if added later) would need to re-implement the same child management logic from scratch.

### 3.3 Amp Fidelity Consideration

The Amp binary does not have `ProxyWidget`/`ProxyElement`. Per the project's **Anti-Drift Rule** (see `CLAUDE.md`), the implementation should match Amp's architecture faithfully. Introducing a class that does not exist in the Amp source is technically a deviation.

However, this gap document proposes a solution that:
1. Is strictly backward-compatible (no behavioral changes).
2. Does not alter the Amp-faithful public API or lifecycle semantics.
3. Merely reduces internal code duplication through an intermediary base class that is invisible to subclass authors.

The recommendation accounts for this tension and provides both a "full introduction" path and a "minimal/no-change" path.

---

## 4. Proposed Solution

### Approach A: Introduce ProxyWidget and ProxyElement (Recommended for Long-Term)

#### 4.1 ProxyWidget

Add a new abstract class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`:

```typescript
// ---------------------------------------------------------------------------
// ProxyWidget -- abstract base for single-child pass-through widgets
//
// Flutter has this as an intermediate between Widget and InheritedWidget/
// ParentDataWidget. Amp does not have it (Bt and R_ both extend Sf directly),
// but we introduce it to reduce code duplication in Element subclasses.
//
// NOTE: This is a flitter-specific structural enhancement, NOT an Amp ref.
// ---------------------------------------------------------------------------

/**
 * Abstract base for widgets that have a single child and do not build
 * their own subtree. Both InheritedWidget and ParentDataWidget extend this.
 *
 * ProxyWidget does not add any behavior beyond holding the child reference.
 * Subclasses override createElement() to create the appropriate element.
 */
export abstract class ProxyWidget extends Widget {
  readonly child: Widget;

  constructor(opts: { key?: Key; child: Widget }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts.child;
  }
}
```

#### 4.2 Refactor InheritedWidget to Extend ProxyWidget

```typescript
/**
 * A widget that propagates data to descendant widgets.
 * Descendants that depend on this widget will rebuild when it changes
 * (if updateShouldNotify returns true).
 *
 * Amp ref: class Bt extends Sf, amp-strings.txt:529716
 * NOTE: In Amp, Bt extends Sf directly. We extend ProxyWidget for DRY.
 */
export abstract class InheritedWidget extends ProxyWidget {
  constructor(opts: { key?: Key; child: Widget }) {
    super(opts);
  }

  createElement(): any {
    const { InheritedElement } = require('./element');
    return new InheritedElement(this);
  }

  abstract updateShouldNotify(oldWidget: InheritedWidget): boolean;
}
```

#### 4.3 Refactor ParentDataWidget to Extend ProxyWidget

In `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/parent-data-widget.ts`:

```typescript
import { ProxyWidget } from '../framework/widget';

export abstract class ParentDataWidget extends ProxyWidget {
  constructor(opts: { key?: Key; child: Widget }) {
    super(opts);
  }

  abstract applyParentData(renderObject: RenderObject): void;

  createElement(): ParentDataElement {
    return new ParentDataElement(this);
  }
}
```

#### 4.4 ProxyElement

Add a new abstract class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`:

```typescript
// ---------------------------------------------------------------------------
// ProxyElement -- abstract base for single-child pass-through elements
//
// Factors out the shared child lifecycle (mount, unmount, update, renderObject
// delegation) used by both InheritedElement and ParentDataElement.
//
// NOTE: This is a flitter-specific structural enhancement, NOT an Amp ref.
// ---------------------------------------------------------------------------

export abstract class ProxyElement extends Element {
  _child: Element | undefined = undefined;

  constructor(widget: Widget) {
    super(widget);
  }

  get proxyWidget(): ProxyWidget {
    return this.widget as ProxyWidget;
  }

  get child(): Element | undefined {
    return this._child;
  }

  override get renderObject(): any {
    return this._child?.renderObject;
  }

  mount(): void {
    const childWidget = this.proxyWidget.child;
    this._child = childWidget.createElement();
    this.addChild(this._child);
    this._mountChild(this._child);
    this.markMounted();
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    super.unmount();
  }

  /**
   * Base update logic: swap widget, diff child via canUpdate, replace if needed.
   * Subclasses (InheritedElement, ParentDataElement) call super.update() and
   * then add their own notification/parent-data logic.
   */
  override update(newWidget: Widget): void {
    super.update(newWidget);

    const newChildWidget = this.proxyWidget.child;
    if (this._child && this._child.widget.canUpdate(newChildWidget)) {
      this._child.update(newChildWidget);
    } else {
      if (this._child) {
        this._child.unmount();
        this.removeChild(this._child);
      }
      this._child = newChildWidget.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  }

  override performRebuild(): void {}

  protected _mountChild(child: Element): void {
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
    }
  }
}
```

#### 4.5 Refactor InheritedElement to Extend ProxyElement

```typescript
export class InheritedElement extends ProxyElement {
  _dependents: Set<Element> = new Set();

  constructor(widget: InheritedWidget) {
    super(widget);
  }

  get inheritedWidget(): InheritedWidget {
    return this.widget as InheritedWidget;
  }

  // Override update to add notification logic BEFORE child update
  override update(newWidget: Widget): void {
    const oldWidget = this.inheritedWidget;
    // Call Element.update() to swap the widget (NOT ProxyElement.update
    // which also updates the child -- we need to notify first)
    Element.prototype.update.call(this, newWidget);
    const newInherited = this.inheritedWidget;

    if (newInherited.updateShouldNotify(oldWidget)) {
      this.notifyDependents();
    }

    // Now update the child (same logic as ProxyElement.update child portion)
    if (this._child && this._child.widget.canUpdate(newInherited.child)) {
      this._child.update(newInherited.child);
    } else {
      if (this._child) {
        this._child.unmount();
        this.removeChild(this._child);
      }
      this._child = newInherited.child.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  }

  override unmount(): void {
    this._dependents.clear();
    super.unmount();
  }

  addDependent(element: Element): void {
    this._dependents.add(element);
  }

  removeDependent(element: Element): void {
    this._dependents.delete(element);
  }

  notifyDependents(): void {
    for (const dep of this._dependents) {
      dep.markNeedsRebuild();
    }
  }
}
```

**Important subtlety**: `InheritedElement.update()` must call `updateShouldNotify()` with the old widget *before* the child is updated. The Amp source (line 666-680 in widget-tree.md) confirms this ordering: save old widget, call `super.update(g)` to swap the widget reference, check `updateShouldNotify`, then update the child. Because `ProxyElement.update()` bundles the widget swap and child update together, `InheritedElement` must override `update()` entirely rather than calling `super.update()` then notifying. This is an inherent design tension with the `ProxyElement` approach.

**Alternative**: `ProxyElement.update()` could be split into two protected methods:
```typescript
protected _swapWidget(newWidget: Widget): void {
  Element.prototype.update.call(this, newWidget);
}

protected _updateChild(): void {
  const newChildWidget = this.proxyWidget.child;
  if (this._child && this._child.widget.canUpdate(newChildWidget)) {
    this._child.update(newChildWidget);
  } else {
    // ... replace child
  }
}
```

Then `InheritedElement.update()` would be:
```typescript
override update(newWidget: Widget): void {
  const oldWidget = this.inheritedWidget;
  this._swapWidget(newWidget);
  if (this.inheritedWidget.updateShouldNotify(oldWidget)) {
    this.notifyDependents();
  }
  this._updateChild();
}
```

This is cleaner and reduces duplication further.

#### 4.6 Refactor ParentDataElement to Extend ProxyElement

```typescript
export class ParentDataElement extends ProxyElement {
  constructor(widget: ParentDataWidget) {
    super(widget);
  }

  get parentDataWidget(): ParentDataWidget {
    return this.widget as ParentDataWidget;
  }

  override mount(): void {
    super.mount();
    this._applyParentData();
  }

  override update(newWidget: Widget): void {
    if (this.widget === newWidget) return;
    super.update(newWidget);
    this._applyParentData();
  }

  // _applyParentData and _findChildRenderObject remain the same
  _applyParentData(): void {
    const renderObject = this._findChildRenderObject();
    if (renderObject) {
      this.parentDataWidget.applyParentData(renderObject);
    }
  }

  private _findChildRenderObject(): RenderObject | undefined {
    let current: Element | undefined = this._child;
    while (current) {
      if (current instanceof RenderObjectElement) {
        return current.renderObject;
      }
      const children = current.children;
      if (children.length > 0) {
        current = children[0];
      } else if ('_child' in current && (current as any)._child instanceof Element) {
        current = (current as any)._child;
      } else {
        break;
      }
    }
    return undefined;
  }
}
```

---

### Approach B: Minimal / No-Change (Amp Fidelity Purist)

If strict Amp fidelity is the overriding concern, the alternative is to **not introduce ProxyWidget/ProxyElement at all** and accept the code duplication as faithful to the Amp architecture.

Under this approach:
1. Leave `InheritedWidget extends Widget` and `ParentDataWidget extends Widget` as-is.
2. Leave `InheritedElement extends Element` and `ParentDataElement extends Element` as-is.
3. Document the duplication with comments referencing why it exists.
4. Optionally extract a **standalone utility function** (not a class) for the shared child-update logic:

```typescript
/**
 * Shared single-child update logic used by InheritedElement and ParentDataElement.
 * NOT a class to preserve Amp-faithful hierarchy (no ProxyElement in Amp).
 */
export function updateSingleChild(
  parent: Element,
  currentChild: Element | undefined,
  newChildWidget: Widget,
  mountChild: (child: Element) => void,
): Element {
  if (currentChild && currentChild.widget.canUpdate(newChildWidget)) {
    currentChild.update(newChildWidget);
    return currentChild;
  } else {
    if (currentChild) {
      currentChild.unmount();
      parent.removeChild(currentChild);
    }
    const newChild = newChildWidget.createElement();
    parent.addChild(newChild);
    mountChild(newChild);
    return newChild;
  }
}
```

This avoids changing the class hierarchy while still reducing some duplication.

---

## 5. Recommended Approach

**Approach A** (introduce `ProxyWidget` and `ProxyElement`) is recommended for the following reasons:

1. **Type safety**: `instanceof ProxyWidget` and `instanceof ProxyElement` are useful in diagnostic tools, tree visitors, and debugging inspectors (e.g., `serializeElementTree` in debug-inspector.ts).
2. **Maintainability**: The duplicated ~50 lines of element lifecycle code are a maintenance burden. Any bug fix in the child update logic must be applied in two places.
3. **Extensibility**: Future additions (e.g., `NotificationListener`, `InheritedNotifier`) would extend `ProxyWidget` directly instead of copying boilerplate.
4. **Backward compatibility**: Since both `InheritedWidget` and `ParentDataWidget` previously extended `Widget`, and `ProxyWidget extends Widget`, all `instanceof Widget` checks continue to work. All existing subclasses remain unaffected.
5. **Amp deviation is minimal**: The new classes add zero behavioral differences. They are purely structural refactoring. The Amp comments already document the original hierarchy.

---

## 6. Migration Plan

### Phase 1: Introduce ProxyWidget (widget.ts changes)

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`

1. Add the `ProxyWidget` abstract class after the `Widget` class definition (before `StatelessWidget`).
2. Change `InheritedWidget` to `extends ProxyWidget` instead of `extends Widget`.
3. Remove the `child` field and constructor body from `InheritedWidget` (inherited from `ProxyWidget`).
4. Export `ProxyWidget` from the module.

**Estimated diff**: ~15 lines added, ~8 lines removed from widget.ts.

### Phase 2: Introduce ProxyElement (element.ts changes)

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

1. Add the `ProxyElement` abstract class after the `Element` class definition (before `StatelessElement`).
2. Include the `_swapWidget()` and `_updateChild()` protected methods for flexible override patterns.
3. Refactor `InheritedElement` to extend `ProxyElement`.
4. Remove duplicated child lifecycle code from `InheritedElement`, retaining only the dependency-tracking logic.
5. Export `ProxyElement` from the module.

**Estimated diff**: ~60 lines added (ProxyElement), ~40 lines removed (from InheritedElement).

### Phase 3: Refactor ParentDataElement (parent-data-widget.ts changes)

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/parent-data-widget.ts`

1. Change `ParentDataWidget` to `extends ProxyWidget` (import from `../framework/widget`).
2. Remove the duplicated `child` field and constructor body from `ParentDataWidget`.
3. Change `ParentDataElement` to `extends ProxyElement` (import from `../framework/element`).
4. Remove duplicated child lifecycle code, keeping only `_applyParentData()` and `_findChildRenderObject()`.
5. Override `mount()` to call `super.mount()` then `_applyParentData()`.
6. Override `update()` to call `super.update()` then `_applyParentData()`.

**Estimated diff**: ~10 lines added (overrides), ~50 lines removed (duplicated lifecycle).

### Phase 4: Update Exports

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/index.ts`

1. Export `ProxyWidget` from `./framework/widget`.
2. Export `ProxyElement` from `./framework/element`.

### Phase 5: Update References

Grep for any code that does `instanceof InheritedElement` or `instanceof ParentDataElement` to see if `instanceof ProxyElement` would be a cleaner check. Update diagnostic/debugging code if appropriate.

---

## 7. Testing Strategy

### 7.1 Existing Tests Must Continue to Pass

All existing tests are regression tests. The refactoring must not change any observable behavior.

- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/widget.test.ts` -- All `InheritedWidget` tests must pass unchanged.
- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/element.test.ts` -- All `InheritedElement` lifecycle tests must pass.
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/flex-widgets.test.ts` -- All `ParentDataWidget`, `Flexible`, `Expanded` tests must pass.

### 7.2 New Unit Tests for ProxyWidget

Add to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/widget.test.ts`:

```typescript
describe('ProxyWidget', () => {
  it('cannot be instantiated directly (abstract)', () => {
    // ProxyWidget is abstract, so we verify through subclasses
    const child = new TestStatelessWidget();
    const inherited = new TestInheritedWidget({ child, data: 1 });
    expect(inherited).toBeInstanceOf(ProxyWidget);
    expect(inherited).toBeInstanceOf(Widget);
  });

  it('InheritedWidget is instanceof ProxyWidget', () => {
    const child = new TestStatelessWidget();
    const inh = new TestInheritedWidget({ child, data: 42 });
    expect(inh instanceof ProxyWidget).toBe(true);
  });

  it('ParentDataWidget is instanceof ProxyWidget', () => {
    const child = new TestStatelessWidget();
    const pdw = new TestParentDataWidget({ child });
    expect(pdw instanceof ProxyWidget).toBe(true);
  });

  it('StatelessWidget is NOT instanceof ProxyWidget', () => {
    const w = new TestStatelessWidget();
    expect(w instanceof ProxyWidget).toBe(false);
  });

  it('StatefulWidget is NOT instanceof ProxyWidget', () => {
    const w = new TestStatefulWidget();
    expect(w instanceof ProxyWidget).toBe(false);
  });

  it('child is accessible on ProxyWidget', () => {
    const child = new TestStatelessWidget();
    const inh = new TestInheritedWidget({ child, data: 1 });
    expect(inh.child).toBe(child);
  });
});
```

### 7.3 New Unit Tests for ProxyElement

Add to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/element.test.ts`:

```typescript
describe('ProxyElement', () => {
  it('InheritedElement is instanceof ProxyElement', () => {
    const child = new TestStatelessWidget();
    const inh = new TestInheritedWidget({ child, data: 1 });
    const elem = inh.createElement();
    expect(elem).toBeInstanceOf(ProxyElement);
    expect(elem).toBeInstanceOf(Element);
  });

  it('ParentDataElement is instanceof ProxyElement', () => {
    const child = new TestStatelessWidget();
    const pdw = new TestParentDataWidget({ child });
    const elem = pdw.createElement();
    expect(elem).toBeInstanceOf(ProxyElement);
    expect(elem).toBeInstanceOf(Element);
  });

  it('StatelessElement is NOT instanceof ProxyElement', () => {
    const w = new TestStatelessWidget();
    const elem = w.createElement();
    expect(elem instanceof ProxyElement).toBe(false);
  });

  it('mount() creates child element and mounts it', () => {
    const child = new TestStatelessWidget();
    const inh = new TestInheritedWidget({ child, data: 1 });
    const elem = inh.createElement() as InheritedElement;
    elem.mount();
    expect(elem.child).toBeDefined();
    expect(elem.mounted).toBe(true);
  });

  it('unmount() cleans up child', () => {
    const child = new TestStatelessWidget();
    const inh = new TestInheritedWidget({ child, data: 1 });
    const elem = inh.createElement() as InheritedElement;
    elem.mount();
    const childElem = elem.child!;
    elem.unmount();
    expect(elem.child).toBeUndefined();
    expect(elem.mounted).toBe(false);
  });

  it('renderObject delegates to child', () => {
    const child = new TestStatelessWidget();
    const inh = new TestInheritedWidget({ child, data: 1 });
    const elem = inh.createElement() as InheritedElement;
    elem.mount();
    // renderObject is undefined for non-RenderObject children
    expect(elem.renderObject).toBeUndefined();
  });
});
```

### 7.4 Integration Tests

Verify that the `InheritedWidget` dependency notification system still works end-to-end:

```typescript
describe('InheritedElement notification (with ProxyElement base)', () => {
  it('notifies dependents when updateShouldNotify returns true', () => {
    // Create InheritedWidget -> child tree
    // Register dependent
    // Update with new data
    // Verify dependent.markNeedsRebuild was called
  });

  it('does NOT notify when updateShouldNotify returns false', () => {
    // Same setup, but update with same data
    // Verify dependent.markNeedsRebuild was NOT called
  });
});
```

Verify that `ParentDataElement` still applies parent data correctly:

```typescript
describe('ParentDataElement (with ProxyElement base)', () => {
  it('applies parent data on mount', () => {
    // Create Flexible -> SizedBox
    // Mount in a Flex context
    // Verify FlexParentData.flex is set
  });

  it('re-applies parent data on update', () => {
    // Mount with flex=1
    // Update to flex=2
    // Verify FlexParentData.flex changed
  });
});
```

### 7.5 Run Full Test Suite

```bash
cd /home/gem/workspace/flitter/packages/flitter-core && bun test
```

All existing tests must pass with zero regressions.

---

## 8. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Circular import issues | Medium | `ProxyWidget` lives in `widget.ts` alongside `Widget`; `ProxyElement` lives in `element.ts` alongside `Element`. No new import cycles. |
| `InheritedElement.update()` ordering | High | The `updateShouldNotify` call must happen after widget swap but before child update. Use the split `_swapWidget()`/`_updateChild()` pattern to enable this. |
| `instanceof` checks break | Low | `ProxyWidget extends Widget` and `ProxyElement extends Element`, so all existing `instanceof` checks remain valid. |
| Amp fidelity purists object | Medium | Document the deviation clearly with comments. The change is purely structural (DRY) with no behavioral delta. |
| `ParentDataElement._replaceRenderObjectInAncestor` | Low | This method is only called in the current `ParentDataElement.update()`. It can remain in the `ParentDataElement` override without issue. |

---

## 9. Files Affected Summary

| File | Changes |
|------|---------|
| `packages/flitter-core/src/framework/widget.ts` | Add `ProxyWidget` class; refactor `InheritedWidget` to extend it |
| `packages/flitter-core/src/framework/element.ts` | Add `ProxyElement` class; refactor `InheritedElement` to extend it |
| `packages/flitter-core/src/widgets/parent-data-widget.ts` | Refactor `ParentDataWidget` to extend `ProxyWidget`; refactor `ParentDataElement` to extend `ProxyElement` |
| `packages/flitter-core/src/index.ts` | Export `ProxyWidget`, `ProxyElement` |
| `packages/flitter-core/src/framework/__tests__/widget.test.ts` | Add ProxyWidget tests |
| `packages/flitter-core/src/framework/__tests__/element.test.ts` | Add ProxyElement tests |

---

## 10. Open Questions

1. **Should the Amp ref comments on `InheritedWidget` explicitly note the deviation?** Recommendation: Yes. Add a comment like `// NOTE: In Amp, Bt extends Sf directly. We extend ProxyWidget for DRY purposes.`

2. **Should `ProxyWidget` be exported as a public API?** Recommendation: Yes, but document it as an advanced/framework class that most users will not need to use directly.

3. **Should we add `ComponentElement` as a shared base for `StatelessElement`/`StatefulElement`?** This is a related gap but a separate concern. Amp does not have `ComponentElement` either. This could be addressed in a future gap analysis.

4. **Should `ProxyElement._mountChild()` be made `protected` instead of using duck-typing?** Recommendation: Yes. When proper `mount()` signatures are standardized across all Element subclasses, the duck-typed `_mountChild()` pattern should be replaced with a proper abstract or interface-based call.
