# Gap F09: Type-Safety -- Systematic `any` Removal at Framework Boundaries

## Problem Statement

The flitter framework currently uses `any` types pervasively at module boundaries. `Widget.createElement()` returns `any`, `Element.renderObject` is typed as `any`, various `as any` casts are used for duck-typing patterns (mount detection, render object property access, parent data application). This defeats TypeScript's type system at the exact boundaries where type safety matters most -- the Widget/Element/RenderObject triad that forms the core of the framework.

The root cause is circular dependencies between `widget.ts`, `element.ts`, and `render-object.ts`: widgets create elements, elements reference render objects, but render object widgets are defined in `render-object.ts` which imports from `widget.ts`. The initial implementation side-stepped this with `any` return types and runtime duck-typing checks.

---

## Full Inventory of `any` Usages

### File: `widget.ts`

| Line | Code | Category |
|------|------|----------|
| 25 | `readonly mediaQuery?: any` | Missing concrete type on `BuildContext` interface |
| 52 | `abstract createElement(): any` | Core createElement return type -- should be `Element` |
| 101 | `createElement(): any` (StatelessWidget) | Concrete createElement -- should return `StatelessElement` |
| 127 | `createElement(): any` (StatefulWidget) | Concrete createElement -- should return `StatefulElement` |
| 292 | `createElement(): any` (InheritedWidget) | Concrete createElement -- should return `InheritedElement` |

### File: `element.ts`

| Line | Code | Category |
|------|------|----------|
| 85 | `get renderObject(): any` | Base Element renderObject getter |
| 184 | `if (t instanceof (elementType as any))` | Constructor-as-value cast for `instanceof` |
| 194 | `if (t.widget instanceof (widgetType as any))` | Constructor-as-value cast for `instanceof` |
| 228 | `override get renderObject(): any` (StatelessElement) | Delegated renderObject |
| 297-298 | `(child as any).mount()` | Duck-typed mount call (StatelessElement._mountChild) |
| 328 | `override get renderObject(): any` (StatefulElement) | Delegated renderObject |
| 401-402 | `(child as any).mount()` | Duck-typed mount call (StatefulElement._mountChild) |
| 427 | `override get renderObject(): any` (InheritedElement) | Delegated renderObject |
| 494-495 | `(child as any).mount()` | Duck-typed mount call (InheritedElement._mountChild) |
| 508 | `_renderObject: any = undefined` (RenderObjectElement) | RenderObject field type |
| 514 | `get renderObjectWidget(): any` | Widget accessor on RenderObjectElement |
| 518 | `override get renderObject(): any` | RenderObjectElement renderObject getter |
| 571 | `get singleChildWidget(): any` | Widget accessor on SingleChildRenderObjectElement |
| 592 | `(this.renderObject as any).child = ...` | Duck-typed child setter on render object |
| 631 | `(this.renderObject as any).child = ...` | Same pattern in update path |
| 663-664 | `(child as any).mount()` | Duck-typed mount call (SingleChildRenderObjectElement) |
| 681 | `get multiChildWidget(): any` | Widget accessor on MultiChildRenderObjectElement |
| 702-703 | `(this.renderObject as any).insert(...)` | Duck-typed insert call on render object |
| 886-887 | `(this.renderObject as any).insert(...)` | Same in createChildElement |
| 905-906 | `(child as any).mount()` | Duck-typed mount call (MultiChildRenderObjectElement) |
| 922-923 | `(elem as any)._applyParentData()` | Duck-typed private method call |
| 937 | `get leafWidget(): any` | Widget accessor on LeafRenderObjectElement |
| 970 | `get mediaQuery(): any` | BuildContextImpl.mediaQuery return type |
| 975 | `const widget = element.widget as any` | Accessing `.data` on InheritedWidget |
| 998 | `if (t instanceof (elementType as any))` | Constructor-as-value cast (BuildContextImpl) |
| 1018 | `t.state instanceof (stateType as any)` | Constructor-as-value cast (findAncestorStateOfType) |

### File: `render-object.ts`

| Line | Code | Category |
|------|------|----------|
| 451 | `createElement(): any` (SingleChildRenderObjectWidget) | Should return `SingleChildRenderObjectElement` |
| 475 | `createElement(): any` (MultiChildRenderObjectWidget) | Should return `MultiChildRenderObjectElement` |
| 495 | `createElement(): any` (LeafRenderObjectWidget) | Should return `LeafRenderObjectElement` |

### File: `binding.ts`

| Line | Code | Category |
|------|------|----------|
| 54-56 | `requestLayout(node?: any)`, `requestPaint(node?: any)`, `removeFromQueues(node?: any)` | PaintScheduler interface |
| 263-264 | `(node?: any) => ...` | PaintScheduler lambda implementations |
| 456-458 | `(this._rootElement as any).mount()` | Duck-typed mount call on root element |
| 491 | `this.pipelineOwner.setRootRenderObject(renderObject as any)` | RenderObject -> RenderBox cast |
| 506 | `private _findRootRenderObject(element: Element): any` | Return type should be RenderObject or null |
| 822 | `dispatcher.addKeyInterceptor((event: any) => ...)` | KeyEvent already typed, unnecessary `any` |

### File: `pipeline-owner.ts`

| Line | Code | Category |
|------|------|----------|
| 49 | `node.attach(this as any)` | PipelineOwner cast to satisfy RenderObject.attach() |
| 151 | `(node as any)._needsPaint = false` | Accessing protected field across class boundary |

---

## Root Cause Analysis

The `any` usages cluster into **6 distinct categories**, each requiring a different solution strategy:

### Category 1: Circular Dependency Return Types (18 occurrences)

`Widget.createElement()` must return an `Element`, but `Element` is defined in `element.ts` which imports from `widget.ts`. The original code used `any` to break the cycle. Similarly, `RenderObjectWidget` subclasses in `render-object.ts` return specific element types.

### Category 2: Missing `Mountable` Interface (12 occurrences)

The base `Element` class has no `mount()` method -- only subclasses like `StatelessElement`, `StatefulElement`, and `RenderObjectElement` define `mount()`. The framework uses duck-typing: `'mount' in child && typeof (child as any).mount === 'function'`. This pattern repeats in 6 different `_mountChild()` helpers.

### Category 3: RenderObject Protocol Mismatch (8 occurrences)

`SingleChildRenderObjectElement` needs to set `.child` on the render object, and `MultiChildRenderObjectElement` needs to call `.insert()`. But `RenderObject`/`RenderBox` base classes do not declare these methods -- they exist only on subclasses like `ContainerRenderBox`. The code uses `as any` to access them.

### Category 4: Constructor-as-Value for `instanceof` (5 occurrences)

`findAncestorElementOfType(elementType: Function)` uses `instanceof (elementType as any)` because `Function` is not compatible with the TypeScript `instanceof` right-hand side. The `as any` is needed to satisfy TypeScript's constraint that `instanceof` requires a constructor type.

### Category 5: Cross-Module Interface Gaps (6 occurrences)

The `PipelineOwner` interface in `render-object.ts` (minimal forward declaration) is narrower than the concrete `PipelineOwner` class in `pipeline-owner.ts`. This forces `this as any` casts when passing `PipelineOwner` to `RenderObject.attach()`. Similarly, `PaintScheduler` uses `any` for node parameters.

### Category 6: Widget Accessor Types (5 occurrences)

`RenderObjectElement.renderObjectWidget`, `SingleChildRenderObjectElement.singleChildWidget`, `MultiChildRenderObjectElement.multiChildWidget`, and `LeafRenderObjectElement.leafWidget` all return `any`. These should return their specific widget types (`RenderObjectWidget`, `SingleChildRenderObjectWidget`, etc.).

---

## Proposed Typed Replacements

### Solution 1: Forward-Reference Interface for Element (Category 1)

Introduce an `ElementBase` interface in `widget.ts` (or expand the existing `ElementLike`) that `createElement()` returns. Then narrow the return type in concrete subclasses.

```typescript
// widget.ts -- expand the existing ElementLike interface
export interface ElementLike {
  readonly widget: Widget;
  readonly mounted: boolean;
  markNeedsBuild?(): void;
  markNeedsRebuild?(): void;
  mount?(): void;                          // NEW
  unmount(): void;                         // NEW
  readonly renderObject?: RenderObject;    // NEW (import as type-only)
  readonly children: ElementLike[];        // NEW
}

// Widget base class
abstract createElement(): ElementLike;

// StatelessWidget
createElement(): ElementLike { ... }

// StatefulWidget
createElement(): ElementLike { ... }

// InheritedWidget
createElement(): ElementLike { ... }
```

For `render-object.ts`, since those widgets also need to return `ElementLike`:

```typescript
// SingleChildRenderObjectWidget
createElement(): ElementLike { ... }

// MultiChildRenderObjectWidget
createElement(): ElementLike { ... }

// LeafRenderObjectWidget
createElement(): ElementLike { ... }
```

The concrete `Element` class in `element.ts` already satisfies `ElementLike`. TypeScript structural typing ensures compatibility without explicit `implements`.

**Key insight**: Use `import type` to bring `RenderObject` into `widget.ts` for the interface, avoiding runtime circular dependency.

### Solution 2: `Mountable` Interface (Category 2)

Add `mount()` to the `ElementLike` interface as an optional method (since base `Element` does not have it). Then replace every `_mountChild` duck-typing check with a typed guard:

```typescript
// widget.ts
export interface ElementLike {
  // ... existing fields ...
  mount?(): void;
}

// element.ts -- replace all _mountChild helpers with:
private _mountChild(child: Element): void {
  const mountable = child as ElementLike;
  if (typeof mountable.mount === 'function') {
    mountable.mount();
  }
}
```

Alternatively, add `mount()` as an empty method on the base `Element` class:

```typescript
// element.ts -- Element base class
mount(): void {
  // Base no-op; overridden by subclasses (StatelessElement, StatefulElement, etc.)
}
```

This is the **preferred approach** because it eliminates all 12 duck-typing checks entirely. Every element type already overrides `mount()`, so adding a no-op base method changes no behavior. The `_mountChild` helpers simplify to just `child.mount()`.

### Solution 3: Render Object Child Protocol Interfaces (Category 3)

Define interfaces for the two child-management protocols:

```typescript
// render-object.ts

/** Render objects that have a single child settable via `.child` */
export interface SingleChildRenderObject {
  child: RenderObject | null;
}

/** Render objects that manage a list of children via `.insert()` */
export interface ContainerRenderObjectProtocol {
  insert(child: RenderObject, after?: RenderObject): void;
  removeAllChildren?(): void;
}

// Type guard functions
export function isSingleChildRenderObject(
  obj: RenderObject
): obj is RenderObject & SingleChildRenderObject {
  return 'child' in obj;
}

export function isContainerRenderObject(
  obj: RenderObject
): obj is RenderObject & ContainerRenderObjectProtocol {
  return typeof (obj as any).insert === 'function';
}
```

Then in `element.ts`, replace `as any` casts:

```typescript
// SingleChildRenderObjectElement.mount() -- before:
(this.renderObject as any).child = this._child.renderObject;

// After:
if (isSingleChildRenderObject(this.renderObject)) {
  this.renderObject.child = this._child.renderObject;
} else if (typeof this.renderObject.adoptChild === 'function') {
  this.renderObject.adoptChild(this._child.renderObject);
}
```

```typescript
// MultiChildRenderObjectElement.mount() -- before:
if (typeof (this.renderObject as any).insert === 'function') {
  (this.renderObject as any).insert(elem.renderObject);
}

// After:
if (isContainerRenderObject(this.renderObject)) {
  this.renderObject.insert(elem.renderObject);
} else if (typeof this.renderObject.adoptChild === 'function') {
  this.renderObject.adoptChild(elem.renderObject);
}
```

### Solution 4: Abstract Constructor Type (Category 4)

Replace `Function` parameter with a proper abstract constructor type:

```typescript
// element.ts or a shared types file

/** A constructable type (for instanceof checks) */
type AbstractConstructor<T = unknown> = abstract new (...args: any[]) => T;

// findAncestorElementOfType -- before:
findAncestorElementOfType(elementType: Function): Element | null {
  let t = this.parent;
  while (t) {
    if (t instanceof (elementType as any)) return t;
    t = t.parent;
  }
  return null;
}

// After:
findAncestorElementOfType<T extends Element>(
  elementType: AbstractConstructor<T>
): T | null {
  let t = this.parent;
  while (t) {
    if (t instanceof elementType) return t;
    t = t.parent;
  }
  return null;
}
```

Same pattern for `findAncestorWidgetOfType`:

```typescript
findAncestorWidgetOfType<T extends Widget>(
  widgetType: AbstractConstructor<T>
): T | null {
  let t = this.parent;
  while (t) {
    if (t.widget instanceof widgetType) return t.widget as T;
    t = t.parent;
  }
  return null;
}
```

And `findAncestorStateOfType`:

```typescript
findAncestorStateOfType<T extends State<StatefulWidget>>(
  stateType: AbstractConstructor<T>
): T | null {
  let t = this.element.parent;
  while (t) {
    if (t instanceof StatefulElement && t.state instanceof stateType) {
      return t.state as T;
    }
    t = t.parent;
  }
  return null;
}
```

### Solution 5: Aligned PipelineOwner Interface (Category 5)

Expand the minimal `PipelineOwner` interface in `render-object.ts` to include the attach protocol:

```typescript
// render-object.ts
export interface PipelineOwner {
  requestLayout(): void;
  requestPaint(): void;
}
```

The issue is `PipelineOwner.setRootRenderObject()` calls `node.attach(this as any)`. The `RenderObject.attach()` signature expects `PipelineOwner` (the interface), but the concrete `PipelineOwner` class is being passed. Since the concrete class satisfies the interface, the cast is unnecessary if we ensure the type match:

```typescript
// pipeline-owner.ts
setRootRenderObject(node: RenderBox | null): void {
  this._rootRenderObject = node;
  if (node) {
    // The concrete PipelineOwner satisfies the PipelineOwner interface
    // that RenderObject.attach() expects
    node.attach(this);  // Remove `as any`
  }
}
```

This requires making the concrete `PipelineOwner` class explicitly implement the interface from `render-object.ts`, or changing `RenderObject.attach()` to accept the concrete class. The cleanest solution is to change the type:

```typescript
// render-object.ts -- RenderObject.attach accepts the interface
attach(owner: PipelineOwner): void { ... }

// pipeline-owner.ts -- concrete class implements the interface
import { PipelineOwner as PipelineOwnerInterface } from './render-object';

export class PipelineOwner implements PipelineOwnerInterface { ... }
```

For `flushPaint()` accessing `_needsPaint`:

```typescript
// Option A: Add a public method to RenderObject
clearNeedsPaint(): void {
  this._needsPaint = false;
}

// Then in pipeline-owner.ts:
for (const node of this._nodesNeedingPaint) {
  if (node.needsPaint) {
    node.clearNeedsPaint();
  }
}
```

For the `PaintScheduler` interface in `binding.ts`, replace `any` with `RenderObject`:

```typescript
interface PaintScheduler {
  requestLayout(node?: RenderObject): void;
  requestPaint(node?: RenderObject): void;
  removeFromQueues(node?: RenderObject): void;
}
```

### Solution 6: Typed Widget Accessors (Category 6)

Replace `any` return types with the proper widget types:

```typescript
// RenderObjectElement
get renderObjectWidget(): RenderObjectWidget {
  return this.widget as RenderObjectWidget;
}

// SingleChildRenderObjectElement
get singleChildWidget(): SingleChildRenderObjectWidget {
  return this.widget as SingleChildRenderObjectWidget;
}

// MultiChildRenderObjectElement
get multiChildWidget(): MultiChildRenderObjectWidget {
  return this.widget as MultiChildRenderObjectWidget;
}

// LeafRenderObjectElement
get leafWidget(): LeafRenderObjectWidget {
  return this.widget as LeafRenderObjectWidget;
}
```

This requires importing the widget types from `render-object.ts` into `element.ts`. Since `element.ts` already does lazy `require()` of element types, and `render-object.ts` imports `Widget` from `widget.ts`, this introduces a new import direction (element -> render-object widget types). Use `import type` to keep it safe:

```typescript
// element.ts -- top-level type-only imports (no runtime circular dependency)
import type {
  RenderObjectWidget,
  SingleChildRenderObjectWidget,
  MultiChildRenderObjectWidget,
  LeafRenderObjectWidget,
  RenderObject,
  RenderBox,
  ContainerRenderBox,
} from './render-object';
```

### Solution 7: BuildContext.mediaQuery and MediaQuery.maybeOf (Misc)

Replace `mediaQuery?: any` with `MediaQueryData | undefined`:

```typescript
// widget.ts
import type { MediaQueryData } from '../widgets/media-query';

export interface BuildContext {
  readonly widget: Widget;
  readonly mounted: boolean;
  readonly mediaQuery?: MediaQueryData;
}
```

In `BuildContextImpl.mediaQuery`, replace the `any` cast:

```typescript
get mediaQuery(): MediaQueryData | undefined {
  try {
    const { MediaQuery } = require('../widgets/media-query');
    const element = this.element.dependOnInheritedWidgetOfExactType(MediaQuery);
    if (element) {
      const widget = element.widget as MediaQuery;  // safe: we know the type
      return widget.data;
    }
  } catch (_e) {
    // MediaQuery module not available
  }
  return undefined;
}
```

In `MediaQuery.maybeOf`, replace `context as any`:

```typescript
static maybeOf(context: BuildContext): MediaQueryData | undefined {
  // BuildContext may be a BuildContextImpl (which has dependOnInheritedWidgetOfExactType)
  // or a raw BuildContext interface (which does not).
  // Use a type guard:
  if ('dependOnInheritedWidgetOfExactType' in context) {
    const ctx = context as BuildContextImpl;
    const element = ctx.dependOnInheritedWidgetOfExactType(MediaQuery);
    if (element) {
      const widget = element.widget as MediaQuery;
      return widget.data;
    }
  }
  return undefined;
}
```

### Solution 8: _findRootRenderObject and Binding Mount (Misc)

```typescript
// binding.ts -- _findRootRenderObject should return RenderObject | null
private _findRootRenderObject(element: Element): RenderObject | null {
  if (element.renderObject) {
    return element.renderObject;
  }
  for (const child of element.children) {
    const ro = this._findRootRenderObject(child);
    if (ro) return ro;
  }
  return null;
}
```

For `attachRootWidget`, once `mount()` is on base `Element`:

```typescript
// Before:
if (typeof (this._rootElement as any).mount === 'function') {
  (this._rootElement as any).mount();
}

// After (with mount() on Element base):
this._rootElement.mount();
```

For `setRootRenderObject`, verify `_findRootRenderObject` returns `RenderBox`:

```typescript
const renderObject = this._findRootRenderObject(this._rootElement);
if (renderObject && renderObject instanceof RenderBox) {
  this.pipelineOwner.setRootRenderObject(renderObject);
}
```

### Solution 9: _reapplyParentData (Misc)

Import the `ParentDataElement` type and use a proper check:

```typescript
import type { ParentDataElement } from '../widgets/parent-data-widget';

private _reapplyParentData(elem: Element): void {
  // Lazily import to avoid circular dependency at module evaluation time
  const { ParentDataElement: PDElement } = require('../widgets/parent-data-widget');
  if (elem instanceof PDElement) {
    // ParentDataElement._applyParentData is private; call the public interface instead
    // The mount() already calls _applyParentData, but after adoption we need re-apply.
    // Solution: add a public reapplyParentData() method on ParentDataElement.
    elem.reapplyParentData();
  }
}
```

Then in `parent-data-widget.ts`:

```typescript
// Add public method on ParentDataElement
reapplyParentData(): void {
  this._applyParentData();
}
```

### Solution 10: KeyEvent in Binding (Misc)

```typescript
// Before:
dispatcher.addKeyInterceptor((event: any) => { ... });

// After (KeyEvent is already imported):
dispatcher.addKeyInterceptor((event: KeyEvent) => {
  if (event.key === 'c' && event.ctrlKey) {
    process.exit(0);
  }
  return 'ignored';
});
```

---

## Migration Strategy

### Phase 1: Non-Breaking Foundation (Low Risk)

These changes are internal refactors with zero external API impact.

1. **Add `mount()` to base `Element`** -- Add an empty `mount(): void {}` method on the `Element` base class. This eliminates all 12 duck-typing `_mountChild` patterns. All existing subclass `mount()` methods already use `override`, so this is backward-compatible.

2. **Type the widget accessor getters** -- Change `renderObjectWidget`, `singleChildWidget`, `multiChildWidget`, `leafWidget` from `any` to their proper types. Uses `import type` for render-object widget types.

3. **Type `_renderObject` field** -- Change from `any` to `RenderObject | undefined`.

4. **Type `_findRootRenderObject`** -- Return `RenderObject | null` instead of `any`.

5. **Fix `KeyEvent` typing** -- Replace `event: any` with `event: KeyEvent`.

6. **Type `PaintScheduler` parameters** -- Replace `node?: any` with `node?: RenderObject`.

### Phase 2: Interface Evolution (Medium Risk)

These changes modify public/shared interfaces.

7. **Expand `ElementLike` / create `Mountable`** -- Add `mount?(): void`, `unmount(): void`, and `renderObject` to `ElementLike`. Update `BuildContext` to include `dependOnInheritedWidgetOfExactType`.

8. **Change `createElement()` return type** -- Update `Widget.createElement()` from `any` to `ElementLike`. All concrete implementations return `ElementLike`-compatible objects.

9. **Type `BuildContext.mediaQuery`** -- Change from `any` to `MediaQueryData | undefined`. Requires `import type` for `MediaQueryData`.

10. **Add `clearNeedsPaint()` to RenderObject** -- Public method to replace the `(node as any)._needsPaint = false` pattern in `PipelineOwner.flushPaint()`.

### Phase 3: Generic Ancestor Queries (Higher Risk)

These change method signatures to use generics.

11. **Convert `findAncestorElementOfType` to generic** -- `<T extends Element>(elementType: AbstractConstructor<T>): T | null`. This is a breaking change for callers using `Function` directly.

12. **Convert `findAncestorWidgetOfType` to generic** -- Same pattern.

13. **Convert `findAncestorStateOfType` to generic** -- Same pattern.

14. **Align `PipelineOwner` interface with concrete class** -- Make the concrete `PipelineOwner` explicitly implement the interface from `render-object.ts`, removing the `this as any` cast.

### Phase 4: Render Object Protocol (Highest Risk)

15. **Introduce `SingleChildRenderObject` and `ContainerRenderObjectProtocol` interfaces** -- Define proper interfaces for the child-management patterns used in element.ts.

16. **Add type guard functions** -- `isSingleChildRenderObject()`, `isContainerRenderObject()`.

17. **Replace `as any` casts** in `SingleChildRenderObjectElement` and `MultiChildRenderObjectElement` with type-guarded access.

18. **Add `reapplyParentData()` public method** on `ParentDataElement` and replace the duck-typed `_applyParentData` call.

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| `any` usages in `widget.ts` | 5 | 0 |
| `any` usages in `element.ts` | 38 | 0 |
| `any` usages in `render-object.ts` | 3 | 0 |
| `any` usages in `binding.ts` | 10 | 0 |
| `any` usages in `pipeline-owner.ts` | 2 | 0 |
| Duck-typed mount calls | 12 | 0 |
| Duck-typed render object property access | 8 | 0 |
| Constructor-as-value `as any` casts | 5 | 0 |
| **Total `any` in framework/** | **~58** | **0** |

---

## Risks and Mitigations

### Circular Dependency Risk

**Risk**: Adding `import type { RenderObject }` to `widget.ts` or `import type { RenderObjectWidget }` to `element.ts` could create import cycles.

**Mitigation**: TypeScript's `import type` is erased at compile time and does not create runtime circular dependencies. The existing `require()` calls in `createElement()` methods already handle runtime circular references correctly. Adding type-only imports at the top of files is safe because they have no runtime effect.

### API Breakage Risk

**Risk**: Changing `createElement()` return type from `any` to `ElementLike` could break downstream code that assigns the result to a specific element type without casting.

**Mitigation**: Since `ElementLike` is a structural interface that `Element` satisfies, most code will work without changes. Code that does `const elem: StatelessElement = widget.createElement()` will need a cast, but this is an improvement (makes the narrowing explicit rather than hiding it behind `any`).

### Generic Method Migration Risk

**Risk**: Changing `findAncestorElementOfType(elementType: Function)` to a generic signature changes the external API.

**Mitigation**: Keep the `Function` overload as a deprecated compatibility shim:

```typescript
findAncestorElementOfType(elementType: Function): Element | null;
findAncestorElementOfType<T extends Element>(
  elementType: AbstractConstructor<T>
): T | null;
findAncestorElementOfType<T extends Element>(
  elementType: AbstractConstructor<T> | Function
): T | Element | null {
  // implementation
}
```

### Test Impact

All existing tests that use `any` (primarily in `__tests__/pipeline-integration.test.ts` and `__tests__/element.test.ts`) should continue to work because:

- Test-local `createElement(): any` overrides are on test-specific widget subclasses
- Duck-typed element access patterns in tests use `any` for convenience, not necessity
- Test code can retain `any` usages without impacting framework type safety

The test files have their own `any` usages (approximately 20+) which are separate from the framework code. These can be addressed in a follow-up, but are not part of the core framework boundary type safety gap.

---

## Summary of New Types Introduced

| Type | Location | Purpose |
|------|----------|---------|
| `AbstractConstructor<T>` | `widget.ts` or shared types | Generic constructor type for `instanceof` |
| `SingleChildRenderObject` | `render-object.ts` | Interface for render objects with a `.child` setter |
| `ContainerRenderObjectProtocol` | `render-object.ts` | Interface for render objects with `.insert()` |
| `isSingleChildRenderObject()` | `render-object.ts` | Type guard function |
| `isContainerRenderObject()` | `render-object.ts` | Type guard function |
| `clearNeedsPaint()` | `RenderObject` class | Public method to clear paint dirty flag |
| `reapplyParentData()` | `ParentDataElement` class | Public method to re-apply parent data |

The expanded `ElementLike` interface and typed `BuildContext` are modifications to existing types, not new introductions.
