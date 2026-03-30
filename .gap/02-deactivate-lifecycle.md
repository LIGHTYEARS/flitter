# Gap F02: Add `deactivate()` Lifecycle Phase to Element

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Behavior Analysis

### 1.1 The Element Lifecycle Today

The `Element` base class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts` (lines 38-206) implements a two-state lifecycle: **mounted** and **unmounted**. There is no intermediate "deactivated" state.

The lifecycle is explicitly documented at line 31:

```typescript
// - NO deactivate() -- Elements go mounted->unmounted directly
```

And again at line 129:

```typescript
// NO deactivate() -- elements go mounted->unmounted directly
```

The relevant lifecycle methods on the base `Element` class are:

| Method            | Line  | Purpose                                                  |
|-------------------|-------|----------------------------------------------------------|
| `markMounted()`   | 122   | Sets `_mounted = true`; GlobalKey registration point     |
| `unmount()`       | 130   | Sets `_mounted = false`, clears dirty flag, depth cache, inherited dependencies |

### 1.2 The `unmount()` Flow in Detail

The base `Element.unmount()` (lines 130-139) performs the following:

```typescript
unmount(): void {
  this._mounted = false;
  this._dirty = false;
  this._cachedDepth = undefined;
  for (const dep of this._inheritedDependencies) {
    dep.removeDependent(this);
  }
  this._inheritedDependencies.clear();
}
```

Each Element subclass overrides `unmount()` to first unmount its children, then call `super.unmount()`:

- **StatelessElement** (line 240): unmounts child, removes it, nulls reference, clears context, then `super.unmount()`
- **StatefulElement** (line 342): unmounts child, removes it, calls `state._unmount()` (which triggers `dispose()`), nulls references, then `super.unmount()`
- **InheritedElement** (line 440): unmounts child, removes it, clears dependents set, then `super.unmount()`
- **RenderObjectElement** (line 535): detaches and disposes the render object, nulls it, then `super.unmount()`
- **SingleChildRenderObjectElement** (line 600): unmounts child, removes it, then `super.unmount()`
- **MultiChildRenderObjectElement** (line 718): unmounts all children, removes them, clears array, then `super.unmount()`

### 1.3 How Children Are Removed During Reconciliation

The `MultiChildRenderObjectElement.deactivateChild()` at line 897 is the primary call site where elements are removed during tree reconciliation:

```typescript
deactivateChild(elem: Element): void {
  elem.unmount();
  this.removeChild(elem);
}
```

This method is called from `updateChildren()` (the three-phase O(N) reconciliation algorithm, lines 742-878) whenever an old element has no matching new widget. The element is immediately and permanently unmounted -- there is no opportunity for reactivation.

Similarly, in `StatelessElement.rebuild()` (line 263), `StatefulElement.rebuild()` (line 375), `InheritedElement.update()` (line 452), and `SingleChildRenderObjectElement.update()` (line 611), when `canUpdate()` returns false, the old child is immediately unmounted and a new element is inflated. Again, no deactivation window.

### 1.4 The State Lifecycle Today

The `State<T>` class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts` (lines 157-271) has no `deactivate()` hook. This is noted at line 152:

```typescript
// NO deactivate() -- Elements go mounted -> unmounted directly.
```

The `_unmount()` method (line 210) directly marks `_mounted = false` and calls `dispose()`:

```typescript
_unmount(): void {
  this._mounted = false;
  this.dispose();
}
```

### 1.5 GlobalKey Registration Today

The `GlobalKey` class in `/home/gem/workspace/flitter/packages/flitter-core/src/core/key.ts` (lines 64-79) is currently a placeholder that behaves like `UniqueKey` with identity-based equality. It has no `_currentElement` field and no `_setElement()` / `_clearElement()` methods.

However, the Amp reference at `.reference/element-tree.md` (lines 152-196) shows that `Zs` (GlobalKey) in the original Amp binary **does** have these fields:

```js
class Zs extends aJ {
  static _registry = new Map();
  _currentElement;  // T$ | undefined

  _setElement(element) { ... }  // called during markMounted()
  _clearElement() { ... }       // called during unmount()
}
```

And the Amp `T$.markMounted()` (reference line 269-273) registers the element with its GlobalKey:

```js
markMounted() {
  this._mounted = true;
  if (this.widget.key instanceof Zs)
    this.widget.key._setElement(this);
}
```

And `T$.unmount()` (reference line 276-286) deregisters:

```js
unmount() {
  if (this.widget.key instanceof Zs)
    this.widget.key._clearElement();
  // ... rest of cleanup
}
```

The `BuildOwner` already owns a `GlobalKeyRegistry` (in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/build-owner.ts` lines 20-53), but elements do not currently interact with it during mount/unmount.

### 1.6 What Flutter's `deactivate()` Provides

In standard Flutter, the Element lifecycle has four states: `initial -> active -> inactive -> defunct`. The `deactivate()` phase serves a critical role:

1. When an element is removed from the tree, it enters the **inactive** state (not defunct).
2. Inactive elements are held in the `BuildOwner._inactiveElements` set until the end of the current frame.
3. If a `GlobalKey` reparenting occurs during the same frame (the same GlobalKey appears at a new location in the tree), the framework can **reactivate** the inactive element instead of creating a fresh one.
4. At the end of the frame, any elements still in `_inactiveElements` are permanently unmounted (moving to the defunct state).
5. `State.deactivate()` is called when the element is deactivated, giving user code a chance to clean up temporary resources. `State.activate()` is called if the element is reactivated.

This is the mechanism that makes GlobalKey-based state preservation work across reparenting.

---

## 2. Proposed Changes

### 2.1 Design Overview

The proposal introduces a three-state element lifecycle: `initial -> active -> inactive -> defunct`, matching Flutter's model. The key components:

1. **Element lifecycle states** (`_lifecycleState` enum)
2. **`deactivate()` method** on Element and all subclasses
3. **`activate()` method** on Element for reactivation
4. **`_inactiveElements` set** on BuildOwner
5. **`finalizeTree()` method** on BuildOwner (called at end of frame)
6. **`State.deactivate()` and `State.activate()` hooks**
7. **GlobalKey enhancement** to support element lookup for reparenting

### 2.2 Element Lifecycle State Enum

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

Add a new enum before the `Element` class definition:

```typescript
// ---------------------------------------------------------------------------
// Element lifecycle states
// Amp note: The original Amp binary does NOT have deactivate(). This is an
// extension beyond Amp fidelity to enable GlobalKey reparenting.
// ---------------------------------------------------------------------------

export enum _ElementLifecycleState {
  initial,      // Element created but never mounted
  active,       // Element is in the tree and mounted
  inactive,     // Element removed from tree but potentially reactivatable this frame
  defunct,      // Element permanently removed, dispose() has been called
}
```

### 2.3 Changes to `Element` Base Class

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

Replace the `_mounted: boolean` field with `_lifecycleState`:

```typescript
export class Element {
  widget: Widget;
  parent: Element | undefined = undefined;
  _children: Element[] = [];
  _inheritedDependencies: Set<InheritedElement> = new Set();
  _dirty: boolean = false;
  _cachedDepth: number | undefined = undefined;
  _lifecycleState: _ElementLifecycleState = _ElementLifecycleState.initial;

  // ...

  get mounted(): boolean {
    return this._lifecycleState === _ElementLifecycleState.active;
  }
```

Add the `deactivate()` method:

```typescript
  // --- Lifecycle: deactivate ---
  // Moves element from active -> inactive state.
  // Called when element is removed from the tree but may be reactivated
  // via GlobalKey reparenting within the same frame.
  deactivate(): void {
    this._lifecycleState = _ElementLifecycleState.inactive;
    // Unsubscribe from all inherited dependencies (will re-subscribe on activate)
    for (const dep of this._inheritedDependencies) {
      dep.removeDependent(this);
    }
    this._inheritedDependencies.clear();
  }
```

Add the `activate()` method:

```typescript
  // --- Lifecycle: activate ---
  // Moves element from inactive -> active state.
  // Called when a deactivated element is reinserted via GlobalKey reparenting.
  activate(): void {
    this._lifecycleState = _ElementLifecycleState.active;
    this._dirty = true; // Force rebuild to re-subscribe to inherited widgets
    // Depth will be recomputed lazily from new parent
    this._cachedDepth = undefined;
  }
```

Update `markMounted()`:

```typescript
  markMounted(): void {
    this._lifecycleState = _ElementLifecycleState.active;
    // GlobalKey registration
    if (this.widget.key instanceof GlobalKey) {
      this.widget.key._setElement(this);
    }
  }
```

Update `unmount()` to transition from inactive to defunct:

```typescript
  // --- Lifecycle: unmount (permanent removal) ---
  // Transitions from inactive -> defunct. Called at end of frame for
  // elements that were not reactivated via GlobalKey.
  unmount(): void {
    // Deregister GlobalKey
    if (this.widget.key instanceof GlobalKey) {
      this.widget.key._clearElement();
    }
    this._lifecycleState = _ElementLifecycleState.defunct;
    this._dirty = false;
    this._cachedDepth = undefined;
    // Clear inherited dependencies (may already be cleared by deactivate,
    // but defensively clear again for direct unmount paths)
    for (const dep of this._inheritedDependencies) {
      dep.removeDependent(this);
    }
    this._inheritedDependencies.clear();
  }
```

Update `markNeedsRebuild()` guard to use lifecycle state:

```typescript
  markNeedsRebuild(): void {
    if (this._lifecycleState !== _ElementLifecycleState.active) return;
    this._dirty = true;
    const { getBuildScheduler } = require('./binding');
    getBuildScheduler().scheduleBuildFor(this);
  }
```

### 2.4 Changes to `StatefulElement`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

Update `StatefulElement.unmount()` (line 342) to call `deactivate()` on children:

```typescript
  // Override deactivate to notify State
  deactivate(): void {
    if (this._state) {
      this._state._deactivate();
    }
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  // Override activate to notify State
  activate(): void {
    super.activate();
    if (this._state) {
      this._state._activate();
    }
    // Child will be activated when the element is reinserted and rebuilt
  }

  // unmount now transitions from inactive -> defunct
  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    if (this._state) {
      this._state._unmount();
      this._state = undefined;
    }
    this._context = undefined;
    super.unmount();
  }
```

### 2.5 Changes to Other Element Subclasses

Each Element subclass needs a `deactivate()` override that recursively deactivates children before calling `super.deactivate()`.

**StatelessElement**:

```typescript
  deactivate(): void {
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    this._context = undefined;
    super.unmount();
  }
```

**InheritedElement**:

```typescript
  deactivate(): void {
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    this._dependents.clear();
    super.unmount();
  }
```

**RenderObjectElement**:

```typescript
  deactivate(): void {
    // Detach render object from the render tree (but do NOT dispose yet)
    if (this._renderObject) {
      if (typeof this._renderObject.detach === 'function') {
        this._renderObject.detach();
      }
    }
    super.deactivate();
  }

  activate(): void {
    super.activate();
    // Re-attach render object when reactivated
    if (this._renderObject) {
      if (typeof this._renderObject.attach === 'function') {
        this._renderObject.attach();
      }
    }
  }

  override unmount(): void {
    if (this._renderObject) {
      // Only dispose if not already detached by deactivate
      if (typeof this._renderObject.detach === 'function') {
        this._renderObject.detach();
      }
      if (typeof this._renderObject.dispose === 'function') {
        this._renderObject.dispose();
      }
      this._renderObject = undefined;
    }
    super.unmount();
  }
```

**SingleChildRenderObjectElement**:

```typescript
  deactivate(): void {
    if (this._child) {
      this._child.deactivate();
    }
    super.deactivate();
  }

  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    super.unmount();
  }
```

**MultiChildRenderObjectElement**:

Update `deactivateChild()` (line 897) to use the new `deactivate()` instead of `unmount()`:

```typescript
  deactivate(): void {
    for (const elem of this._childElements) {
      elem.deactivate();
    }
    super.deactivate();
  }

  deactivateChild(elem: Element): void {
    elem.deactivate();
    this.removeChild(elem);
    // Register with BuildOwner's inactive elements for end-of-frame cleanup
    const { getBuildOwner } = require('./binding');
    const buildOwner = getBuildOwner();
    if (buildOwner) {
      buildOwner._addToInactiveElements(elem);
    }
  }

  override unmount(): void {
    for (const elem of this._childElements) {
      elem.unmount();
      this.removeChild(elem);
    }
    this._childElements.length = 0;
    super.unmount();
  }
```

### 2.6 Changes to `State<T>`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`

Add `_deactivate()`, `_activate()`, and the user-overridable hooks:

```typescript
export abstract class State<T extends StatefulWidget = StatefulWidget> {
  private _widget?: T;
  private _element?: ElementLike;
  private _mounted: boolean = false;

  // ... existing code ...

  /**
   * Called by StatefulElement during deactivation.
   * Marks as deactivated (but not yet disposed).
   */
  _deactivate(): void {
    this.deactivate();
  }

  /**
   * Called by StatefulElement during reactivation.
   * Restores mounted state.
   */
  _activate(): void {
    this._mounted = true;
    this.activate();
  }

  /**
   * Called by StatefulElement during unmount.
   * Marks as unmounted, then calls dispose().
   */
  _unmount(): void {
    this._mounted = false;
    this.dispose();
  }

  // --- User-overridable lifecycle hooks ---

  /**
   * Called when this State is temporarily removed from the tree.
   * May be followed by activate() (if GlobalKey reparenting) or dispose().
   * Override to clean up temporary resources that should be released
   * even if the State might be reinserted later.
   */
  deactivate(): void {}

  /**
   * Called when a previously deactivated State is reinserted into the tree.
   * This happens during GlobalKey reparenting within the same frame.
   */
  activate(): void {}

  // ... rest of existing code ...
}
```

### 2.7 Changes to `GlobalKey`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/key.ts`

Enhance `GlobalKey` to track the current element, matching the Amp reference:

```typescript
export class GlobalKey extends Key {
  readonly _id: number;
  _currentElement: any | undefined = undefined; // Element | undefined

  constructor() {
    super();
    this._id = _nextGlobalId++;
  }

  /** The Element currently associated with this GlobalKey. */
  get currentElement(): any | undefined {
    return this._currentElement;
  }

  /** The Widget of the currently associated Element. */
  get currentWidget(): any | undefined {
    return this._currentElement?.widget;
  }

  /** The State of the currently associated StatefulElement (if any). */
  get currentState(): any | undefined {
    return this._currentElement?.state;
  }

  /**
   * Called during Element.markMounted() to register the association.
   * Amp ref: Zs._setElement(element)
   */
  _setElement(element: any): void {
    if (this._currentElement !== undefined && this._currentElement !== element) {
      throw new Error(
        `GlobalKey ${this.toString()} is already associated with an element. ` +
        `Each GlobalKey can only be used once in the widget tree.`
      );
    }
    this._currentElement = element;
  }

  /**
   * Called during Element.unmount() to deregister the association.
   * Amp ref: Zs._clearElement()
   */
  _clearElement(): void {
    this._currentElement = undefined;
  }

  equals(other: Key): boolean {
    return this === other;
  }

  toString(): string {
    return `GlobalKey(#${this._id})`;
  }
}
```

### 2.8 Changes to `BuildOwner`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/build-owner.ts`

Add the inactive elements set and `finalizeTree()`:

```typescript
export class BuildOwner {
  private _dirtyElements: Set<Element> = new Set();
  private _building: boolean = false;
  private _inactiveElements: Set<Element> = new Set();

  // ... existing stats fields ...

  readonly globalKeyRegistry: GlobalKeyRegistry = new GlobalKeyRegistry();

  /**
   * Add an element to the inactive set.
   * Called by deactivateChild() when an element is removed from the tree.
   * The element will be permanently unmounted at the end of the frame
   * unless it is reactivated via GlobalKey reparenting.
   */
  _addToInactiveElements(element: Element): void {
    this._inactiveElements.add(element);
  }

  /**
   * Remove an element from the inactive set (e.g., when reactivated).
   */
  _removeFromInactiveElements(element: Element): void {
    this._inactiveElements.delete(element);
  }

  /**
   * Finalize the tree at the end of the frame.
   * Permanently unmounts all elements that remain in the inactive set
   * (i.e., were not reactivated via GlobalKey reparenting during this frame).
   *
   * This must be called at the end of every frame, after buildScopes().
   * Flutter equivalent: BuildOwner.finalizeTree()
   */
  finalizeTree(): void {
    for (const element of this._inactiveElements) {
      element.unmount();
    }
    this._inactiveElements.clear();
  }

  // ... existing scheduleBuildFor, buildScope, etc. ...

  dispose(): void {
    // Unmount any remaining inactive elements
    for (const element of this._inactiveElements) {
      element.unmount();
    }
    this._inactiveElements.clear();
    this._dirtyElements.clear();
    this.globalKeyRegistry.clear();
  }
}
```

### 2.9 Changes to `WidgetsBinding`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`

Add a `getBuildOwner()` export for elements to access:

```typescript
let _buildOwner: BuildOwner | null = null;

export function getBuildOwner(): BuildOwner | null {
  return _buildOwner;
}
```

Set this during `WidgetsBinding` construction (in the constructor, after creating `buildOwner`):

```typescript
_buildOwner = this.buildOwner;
```

Add `finalizeTree()` call to the frame pipeline. In the build frame callback (line 286):

```typescript
this.frameScheduler.addFrameCallback(
  'build',
  () => {
    this.buildOwner.buildScopes();
    this.buildOwner.finalizeTree(); // Permanently unmount deactivated elements
    this.updateRootRenderObject();
  },
  'build',
  0,
  'BuildOwner.buildScopes',
);
```

Also add it to `drawFrameSync()` (line 682):

```typescript
drawFrameSync(): void {
  this.beginFrame();
  this.processResizeIfPending();

  // BUILD phase
  this.buildOwner.buildScopes();
  this.buildOwner.finalizeTree(); // finalize after build
  this.updateRootRenderObject();

  // LAYOUT phase
  this.updateRootConstraints(this._renderViewSize);
  this.pipelineOwner.flushLayout();

  // PAINT + RENDER phases
  this.paint();
  this.render();

  if (this.mouseManager) {
    this.mouseManager.reestablishHoverState();
  }
}
```

### 2.10 Updating All `deactivateChild` Call Sites

Every place that currently calls `elem.unmount()` directly during reconciliation should be updated to call `elem.deactivate()` and register the element with the BuildOwner's inactive set instead. The key call sites are:

1. **`MultiChildRenderObjectElement.deactivateChild()`** (line 897) -- already addressed in 2.5 above.
2. **`StatelessElement.rebuild()`** (line 280) -- when `canUpdate()` fails:

```typescript
// OLD:
this._child.unmount();
this.removeChild(this._child);

// NEW:
this._child.deactivate();
this.removeChild(this._child);
getBuildOwner()?._addToInactiveElements(this._child);
```

3. **`StatefulElement.rebuild()`** (line 384) -- same pattern.
4. **`InheritedElement.update()`** (line 466) -- same pattern.
5. **`SingleChildRenderObjectElement.update()`** (lines 620, 649) -- same pattern.

### 2.11 GlobalKey Reparenting in `updateChild` / `inflateWidget`

To fully support GlobalKey reparenting, a new method should be added to detect when a widget being inflated already has an associated element via GlobalKey:

```typescript
// In Element base class or as a utility
_inflateWidget(newWidget: Widget): Element {
  const key = newWidget.key;
  if (key instanceof GlobalKey) {
    const existingElement = key.currentElement;
    if (existingElement && existingElement._lifecycleState === _ElementLifecycleState.inactive) {
      // Reactivate the existing element instead of creating a new one
      const buildOwner = getBuildOwner();
      if (buildOwner) {
        buildOwner._removeFromInactiveElements(existingElement);
      }
      existingElement.activate();
      // Update the widget on the reactivated element
      existingElement.update(newWidget);
      return existingElement;
    }
  }
  // Default: create a new element
  return newWidget.createElement();
}
```

This method should be used in place of `newWidget.createElement()` in:
- `StatelessElement.rebuild()` (line 283)
- `StatefulElement.rebuild()` (line 388)
- `InheritedElement.update()` (line 470)
- `SingleChildRenderObjectElement.update()` (line 622)
- `MultiChildRenderObjectElement.createChildElement()` (line 881)

---

## 3. Impact on GlobalKey Behavior

### 3.1 Before (Current State)

- `GlobalKey` is a placeholder that behaves like `UniqueKey`.
- No `_currentElement` tracking on `GlobalKey`.
- No reparenting support: moving a widget with a GlobalKey to a new location in the tree creates a brand new element and state.
- State is lost on reparenting.

### 3.2 After (With This Proposal)

- `GlobalKey._currentElement` tracks the associated element.
- `GlobalKey.currentState` provides access to the State of a StatefulElement.
- When a widget with a GlobalKey is removed from one location and appears at another location **within the same frame**, the framework reuses the existing element (and its State) instead of creating a new one.
- `State.deactivate()` is called when the element is removed, giving user code a cleanup opportunity.
- `State.activate()` is called if the element is reinserted, allowing user code to restore resources.
- Elements that are not reinserted by the end of the frame are permanently unmounted via `finalizeTree()`.

### 3.3 Interaction with `GlobalKeyRegistry`

The existing `GlobalKeyRegistry` in `BuildOwner` (build-owner.ts lines 20-53) can be used alongside or eventually replace the `GlobalKey._currentElement` pattern. The registry provides a `getElement(key)` lookup that can be used during inflation to check for reactivatable elements.

However, for simplicity and Amp fidelity, the `GlobalKey._currentElement` approach (matching Amp's `Zs._currentElement`) is preferred for the initial implementation, since the Amp binary uses per-key element tracking rather than a centralized registry.

### 3.4 Migration Path

Since the current `GlobalKey` is documented as a "placeholder for Phase 3" (key.ts line 63), this change fulfills that placeholder. The migration is additive:
- All existing code that does not use `GlobalKey` is unaffected.
- The `deactivate()` base implementation is a no-op, so existing elements that do not override it behave identically.
- The only behavioral change is that removal during reconciliation now goes through `deactivate()` -> `finalizeTree()` -> `unmount()` instead of immediate `unmount()`, but the end result is the same for non-GlobalKey widgets.

---

## 4. Deviation from Amp Fidelity

This proposal is an **intentional deviation** from the original Amp binary behavior. The Amp reference documents (`.reference/element-tree.md` line 332, `.reference/widget-tree.md` line 1556) explicitly state:

> No `deactivate()` / `activate()` lifecycle in this implementation -- the framework uses a simpler mount/unmount pair.

> Elements go directly from mounted to unmounted. There is no intermediate "deactivated" state.

This deviation should be documented with clear comments at every new method:

```typescript
// NOTE: deactivate() is NOT present in the original Amp binary.
// This is a deliberate extension to support GlobalKey reparenting,
// matching Flutter's Element lifecycle.
// Amp ref deviation: See .gap/02-deactivate-lifecycle.md
```

The `CLAUDE.md` anti-drift rule requires flagging this as a deviation. The justification is that GlobalKey reparenting is a fundamental Flutter capability that many widgets depend on (e.g., `Hero`, `Navigator`, form field state preservation), and without `deactivate()`, the flitter framework cannot support these use cases.

---

## 5. Affected Files Summary

| File | Changes |
|------|---------|
| `src/core/key.ts` | Add `_currentElement`, `_setElement()`, `_clearElement()`, `currentElement`, `currentWidget`, `currentState` to `GlobalKey` |
| `src/framework/element.ts` | Add `_ElementLifecycleState` enum; add `_lifecycleState` field; add `deactivate()` and `activate()` to Element and all subclasses; update `markMounted()`, `unmount()`, `markNeedsRebuild()` to use lifecycle state; update `deactivateChild()` to use deactivate instead of unmount; add `_inflateWidget()` helper for GlobalKey reparenting |
| `src/framework/widget.ts` | Add `deactivate()`, `activate()`, `_deactivate()`, `_activate()` to `State<T>` |
| `src/framework/build-owner.ts` | Add `_inactiveElements` set; add `_addToInactiveElements()`, `_removeFromInactiveElements()`, `finalizeTree()` methods; update `dispose()` |
| `src/framework/binding.ts` | Add `getBuildOwner()` export; wire `finalizeTree()` into frame pipeline (build callback and `drawFrameSync()`); set `_buildOwner` during construction |

---

## 6. Testing Strategy

### 6.1 Unit Tests for Element Lifecycle States

**File**: `src/framework/__tests__/element-deactivate.test.ts`

```typescript
describe('Element.deactivate()', () => {
  test('transitions from active to inactive', () => {
    const element = createAndMountElement();
    expect(element.mounted).toBe(true);

    element.deactivate();
    expect(element.mounted).toBe(false);
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
  });

  test('clears inherited dependencies on deactivate', () => {
    // Set up element with inherited dependency, deactivate,
    // verify dependency is cleared
  });

  test('activate transitions from inactive to active', () => {
    const element = createAndMountElement();
    element.deactivate();
    element.activate();
    expect(element.mounted).toBe(true);
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
  });

  test('unmount transitions from inactive to defunct', () => {
    const element = createAndMountElement();
    element.deactivate();
    element.unmount();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.defunct);
  });

  test('markNeedsRebuild is ignored in inactive state', () => {
    const element = createAndMountElement();
    element.deactivate();
    element.markNeedsRebuild();
    expect(element.dirty).toBe(false);
  });

  test('markNeedsRebuild is ignored in defunct state', () => {
    const element = createAndMountElement();
    element.deactivate();
    element.unmount();
    element.markNeedsRebuild();
    expect(element.dirty).toBe(false);
  });
});
```

### 6.2 Unit Tests for StatefulElement Deactivation

```typescript
describe('StatefulElement deactivation', () => {
  test('State.deactivate() is called when element is deactivated', () => {
    let deactivateCalled = false;
    const state = new TestState(() => leaf);
    state.deactivate = () => { deactivateCalled = true; };

    const element = createStatefulElement(state);
    element.mount();
    element.deactivate();

    expect(deactivateCalled).toBe(true);
  });

  test('State.activate() is called when element is reactivated', () => {
    let activateCalled = false;
    const state = new TestState(() => leaf);
    state.activate = () => { activateCalled = true; };

    const element = createStatefulElement(state);
    element.mount();
    element.deactivate();
    element.activate();

    expect(activateCalled).toBe(true);
    expect(state.mounted).toBe(true);
  });

  test('State.dispose() is called on unmount, not deactivate', () => {
    let disposeCalled = false;
    const state = new TestState(() => leaf);
    state.dispose = () => { disposeCalled = true; };

    const element = createStatefulElement(state);
    element.mount();
    element.deactivate();
    expect(disposeCalled).toBe(false); // NOT called yet

    element.unmount();
    expect(disposeCalled).toBe(true); // NOW called
  });
});
```

### 6.3 Unit Tests for BuildOwner.finalizeTree()

```typescript
describe('BuildOwner.finalizeTree()', () => {
  test('unmounts all inactive elements', () => {
    const buildOwner = new BuildOwner();
    const elem1 = createAndMountElement();
    const elem2 = createAndMountElement();

    elem1.deactivate();
    elem2.deactivate();
    buildOwner._addToInactiveElements(elem1);
    buildOwner._addToInactiveElements(elem2);

    buildOwner.finalizeTree();

    expect(elem1._lifecycleState).toBe(_ElementLifecycleState.defunct);
    expect(elem2._lifecycleState).toBe(_ElementLifecycleState.defunct);
  });

  test('clears inactive set after finalization', () => {
    const buildOwner = new BuildOwner();
    const elem = createAndMountElement();
    elem.deactivate();
    buildOwner._addToInactiveElements(elem);

    buildOwner.finalizeTree();

    // Adding new inactive after finalize should work cleanly
    expect(buildOwner._inactiveElements.size).toBe(0);
  });

  test('element removed from inactive set before finalize is not unmounted', () => {
    const buildOwner = new BuildOwner();
    const elem = createAndMountElement();
    elem.deactivate();
    buildOwner._addToInactiveElements(elem);
    buildOwner._removeFromInactiveElements(elem);

    buildOwner.finalizeTree();

    // Element was removed before finalize, so it should still be inactive
    // (not defunct), as it was reactivated
    expect(elem._lifecycleState).toBe(_ElementLifecycleState.inactive);
  });
});
```

### 6.4 Integration Tests for GlobalKey Reparenting

```typescript
describe('GlobalKey reparenting', () => {
  test('State is preserved when widget moves to a new parent via GlobalKey', () => {
    const key = new GlobalKey();
    let stateValue = 0;

    // Build tree: Parent1 -> StatefulWidget(key)
    // Rebuild tree: Parent2 -> StatefulWidget(key)
    // State should be preserved (same instance, stateValue intact)

    const state = new TestState(() => leaf);
    state.initState = () => { stateValue = 42; };

    // Mount under parent1
    const widget1 = new TestStatefulWidget({ key, createState: () => state });
    const parent1Element = mountWidgetTree(widget1);

    expect(stateValue).toBe(42);
    const originalState = getStateFromTree(parent1Element);

    // Rebuild with widget under parent2 (simulating reparenting)
    // ... rebuild logic that removes from parent1, adds to parent2 ...

    const newState = getStateFromTree(parent2Element);
    expect(newState).toBe(originalState); // Same State instance
  });

  test('GlobalKey.currentState returns the active State', () => {
    const key = new GlobalKey();
    const widget = new TestStatefulWidget({
      key,
      createState: () => new TestState(() => leaf),
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    expect(key.currentElement).toBe(element);
    expect(key.currentState).toBe(element.state);
  });

  test('GlobalKey.currentElement is cleared after unmount', () => {
    const key = new GlobalKey();
    const widget = new TestStatefulWidget({
      key,
      createState: () => new TestState(() => leaf),
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();
    element.deactivate();
    // Still available during deactivation (for reparenting lookup)
    element.unmount();

    expect(key.currentElement).toBeUndefined();
  });
});
```

### 6.5 Tests for RenderObjectElement Deactivation

```typescript
describe('RenderObjectElement deactivation', () => {
  test('render object is detached on deactivate, not disposed', () => {
    let detached = false;
    let disposed = false;

    const mockRenderObject = {
      detach: () => { detached = true; },
      dispose: () => { disposed = true; },
      attach: () => { detached = false; },
    };

    const element = createRenderObjectElement(mockRenderObject);
    element.mount();
    element.deactivate();

    expect(detached).toBe(true);
    expect(disposed).toBe(false); // NOT disposed yet

    element.unmount();
    expect(disposed).toBe(true); // NOW disposed
  });

  test('render object is re-attached on activate', () => {
    let attached = false;
    const mockRenderObject = {
      attach: () => { attached = true; },
      detach: () => { attached = false; },
      dispose: () => {},
    };

    const element = createRenderObjectElement(mockRenderObject);
    element.mount();
    element.deactivate();
    expect(attached).toBe(false);

    element.activate();
    expect(attached).toBe(true);
  });
});
```

### 6.6 Regression Tests

Ensure all existing tests in `src/framework/__tests__/element.test.ts` continue to pass. The behavioral change (deactivate before unmount) should be transparent to existing code since:

1. `mounted` still returns `false` for both inactive and defunct states.
2. Elements without GlobalKeys follow the same deactivate -> finalizeTree -> unmount path, just with a brief window of inactivity within the same frame.
3. The `deactivateChild()` method in `MultiChildRenderObjectElement` already exists and is named after this concept -- it just needs to call `deactivate()` instead of `unmount()`.

### 6.7 Performance Considerations

Add a benchmark test to verify that the additional deactivate/finalize overhead is negligible:

```typescript
describe('deactivate performance', () => {
  test('finalizeTree with 1000 elements completes in < 5ms', () => {
    const buildOwner = new BuildOwner();
    const elements = Array.from({ length: 1000 }, () => {
      const elem = createAndMountElement();
      elem.deactivate();
      return elem;
    });
    for (const elem of elements) {
      buildOwner._addToInactiveElements(elem);
    }

    const start = performance.now();
    buildOwner.finalizeTree();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5);
  });
});
```

---

## 7. Implementation Order

1. **Phase A**: Add `_ElementLifecycleState` enum and `_lifecycleState` field to Element. Update `mounted` getter to use it. Update `markMounted()` and `unmount()`. Verify all existing tests pass.

2. **Phase B**: Add `deactivate()` and `activate()` to Element base class and all subclasses. Add `State.deactivate()` and `State.activate()` hooks.

3. **Phase C**: Add `_inactiveElements` and `finalizeTree()` to BuildOwner. Wire `finalizeTree()` into the frame pipeline.

4. **Phase D**: Enhance `GlobalKey` with `_currentElement`, `_setElement()`, `_clearElement()`. Wire registration into `markMounted()` and deregistration into `unmount()`.

5. **Phase E**: Add `_inflateWidget()` helper for GlobalKey reparenting lookup. Update all child inflation call sites.

6. **Phase F**: Add `getBuildOwner()` export to binding.ts. Update `deactivateChild()` and all reconciliation sites to use `deactivate()` + register inactive instead of `unmount()`.

7. **Phase G**: Write and run all tests described in Section 6.

---

## 8. Open Questions

1. **Should `deactivate()` clear the GlobalKey association?** In Flutter, `deactivate()` does NOT clear the GlobalKey -- it remains registered so that `_inflateWidget()` can find it. The `unmount()` call at the end of `finalizeTree()` clears it. This is the proposed behavior above.

2. **Should recursive child deactivation be depth-first or breadth-first?** Flutter uses depth-first (children deactivated before parent), matching the existing `unmount()` recursion pattern. This proposal follows the same order.

3. **Thread safety of `_inactiveElements`?** In a single-threaded TUI environment, this is not a concern. The set is only mutated during the build phase and cleared during `finalizeTree()`, both of which run synchronously within a single frame.

4. **Should `BuildContextImpl.mounted` also check for inactive state?** Yes -- `mounted` should only return `true` when the element is in the `active` state. The current implementation delegates to `element.mounted`, which with the proposed change will correctly return `false` for inactive elements.
