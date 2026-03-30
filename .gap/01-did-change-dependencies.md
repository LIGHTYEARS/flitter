# Gap F01: Add `didChangeDependencies()` Lifecycle Method to State

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Behavior Analysis

### 1.1 The State Lifecycle Today

The `State<T>` class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts` (lines 157-271) implements the following lifecycle:

```
_mount(widget, context)   --> sets widget/context, mounted=true, calls initState()
build(context)            --> called by StatefulElement.rebuild()
_update(newWidget)        --> sets new widget, calls didUpdateWidget(oldWidget)
setState(fn?)             --> executes callback, marks element dirty
_unmount()                --> sets mounted=false, calls dispose()
```

The file explicitly documents this omission at line 151:

```typescript
// NO didChangeDependencies() -- Amp doesn't have it.
```

The available user-overridable lifecycle hooks are (lines 215-239):

| Hook                  | Line | Purpose                                         |
|-----------------------|------|-------------------------------------------------|
| `initState()`         | 221  | One-time initialization after mount              |
| `didUpdateWidget(old)`| 227  | Parent rebuilt with a new widget of the same type|
| `build(context)`      | 233  | Produce the widget subtree                       |
| `dispose()`           | 239  | Release resources on permanent removal           |

There is no `didChangeDependencies()`.

### 1.2 How InheritedElement Notifies Dependents

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`, the `InheritedElement` class (lines 411-498) manages a set of dependent elements:

```typescript
// element.ts line 413
_dependents: Set<Element> = new Set();
```

When an `InheritedElement` is updated with a new widget, `update()` (lines 452-474) checks `updateShouldNotify()`. If it returns true, `notifyDependents()` is called (lines 485-489):

```typescript
notifyDependents(): void {
    for (const dep of this._dependents) {
        dep.markNeedsRebuild();
    }
}
```

This simply calls `markNeedsRebuild()` on each dependent element, which sets the `_dirty` flag (line 145) and schedules the element for rebuild via `getBuildScheduler().scheduleBuildFor(this)` (lines 143-150).

### 1.3 How Dependencies Are Registered

Element base class (lines 164-177) provides `dependOnInheritedWidgetOfExactType()`:

```typescript
dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    let ancestor = this.parent;
    while (ancestor) {
        if (ancestor.widget.constructor === widgetType) {
            if (ancestor instanceof InheritedElement) {
                ancestor.addDependent(this);
                this._inheritedDependencies.add(ancestor);
            }
            return ancestor as InheritedElement;
        }
        ancestor = ancestor.parent;
    }
    return null;
}
```

Each element tracks its inherited dependencies in `_inheritedDependencies: Set<InheritedElement>` (line 42), which is cleared on unmount (lines 134-138).

### 1.4 The Problem

When an `InheritedWidget` changes (e.g., theme data, media query data), all dependent elements are merely marked dirty and rebuilt. There is no lifecycle hook that fires *specifically* because a dependency changed. This matters for several reasons:

1. **Side effects on dependency change**: A `State` that subscribes to a service based on inherited configuration (e.g., a locale provider) needs to know when to re-subscribe. Without `didChangeDependencies()`, the developer has no clean way to distinguish "I was rebuilt because my parent changed my widget config" from "I was rebuilt because an inherited widget I depend on changed."

2. **First-mount initialization that needs inherited data**: `initState()` fires before the first `build()`, but inherited widgets are not yet available at that point (the element hasn't been inserted into the tree yet, or more precisely, the dependency registration hasn't happened yet). In Flutter, `didChangeDependencies()` fires immediately after `initState()` during the first mount, providing a safe place to read inherited data for initialization.

3. **Performance optimization**: Code that only needs to run when a dependency actually changes (not on every rebuild) can be placed in `didChangeDependencies()` instead of in `build()`.

### 1.5 The StatefulElement Mount and Rebuild Flow

Looking at `StatefulElement` in element.ts (lines 307-405):

**Mount** (lines 333-339):
```typescript
mount(): void {
    this._context = new BuildContextImpl(this, this.widget);
    this._state = this.statefulWidget.createState();
    this._state._mount(this.statefulWidget, this._context);
    this.rebuild();
    this.markMounted();
}
```

**Rebuild** (lines 375-398):
```typescript
rebuild(): void {
    if (!this._context || !this._state) {
        throw new Error('Cannot rebuild unmounted element');
    }
    const newWidget = this._state.build(this._context);
    // ... child diffing logic
}
```

During the first `mount()`, the sequence is:
1. Create context
2. Create state
3. `state._mount()` -> calls `initState()`
4. `rebuild()` -> calls `state.build(context)`
5. `markMounted()`

When a dependency changes, `InheritedElement.notifyDependents()` calls `markNeedsRebuild()` on the `StatefulElement`, which eventually causes `performRebuild()` -> `rebuild()` -> `state.build(context)`. There is no intermediate `didChangeDependencies()` call.

---

## 2. Proposed Changes

### 2.1 Overview

The implementation adds `didChangeDependencies()` to the `State` class and ensures it is called:

1. **After `initState()` during first mount** -- matching Flutter behavior where `didChangeDependencies()` always fires at least once.
2. **Before `build()` when an InheritedWidget dependency changes** -- so the State can react to the change before producing its subtree.

### 2.2 Changes to `State<T>` in `widget.ts`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`

#### 2.2.1 Add `_didChangeDependencies` flag

Add a private flag to track whether dependencies have changed since the last build, used by the element to know whether to call the hook.

```typescript
export abstract class State<T extends StatefulWidget = StatefulWidget> {
  private _widget?: T;
  private _element?: ElementLike;
  private _mounted: boolean = false;
  private _dependenciesChanged: boolean = false;  // NEW

  // ... existing code ...
```

#### 2.2.2 Update `_mount()` to call `didChangeDependencies()`

```typescript
_mount(widget: T, context: BuildContext): void {
    this._widget = widget;
    this._element = context as unknown as ElementLike;
    this._mounted = true;
    this.initState();
    this.didChangeDependencies();  // NEW: always fires after initState on first mount
}
```

#### 2.2.3 Add internal `_notifyDependenciesChanged()` method

This is called by `StatefulElement` when an `InheritedElement` notifies it. It sets the flag so that the next rebuild triggers `didChangeDependencies()` before `build()`.

```typescript
/**
 * Called by StatefulElement when inherited dependencies change.
 * Sets flag so didChangeDependencies() fires before next build().
 *
 * This is an internal framework method, not user-facing.
 */
_notifyDependenciesChanged(): void {
    this._dependenciesChanged = true;
}
```

#### 2.2.4 Add internal `_maybCallDidChangeDependencies()` method

Called by `StatefulElement.rebuild()` just before invoking `build()`:

```typescript
/**
 * Called by StatefulElement.rebuild() before build().
 * If dependencies changed since last build, calls didChangeDependencies()
 * and resets the flag.
 */
_maybeCallDidChangeDependencies(): void {
    if (this._dependenciesChanged) {
        this._dependenciesChanged = false;
        this.didChangeDependencies();
    }
}
```

#### 2.2.5 Add user-overridable `didChangeDependencies()` hook

```typescript
// --- Lifecycle hooks (user-overridable) ---

initState(): void {}

/**
 * Called when a dependency of this State object changes.
 *
 * This is called immediately after initState() on the first mount,
 * and subsequently whenever an InheritedWidget that this State
 * depends on (via context.dependOnInheritedWidgetOfExactType)
 * changes.
 *
 * Safe to call BuildContext.dependOnInheritedWidgetOfExactType
 * from this method, unlike initState().
 *
 * Subclasses that override this must call super.didChangeDependencies().
 */
didChangeDependencies(): void {}

didUpdateWidget(_oldWidget: T): void {}
```

#### 2.2.6 Update class documentation comment

Replace lines 141-156:

```typescript
/**
 * The mutable state for a StatefulWidget.
 *
 * Lifecycle:
 *   1. _mount(widget, context)  -- sets widget/context, mounted=true,
 *                                  calls initState(), then didChangeDependencies()
 *   2. didChangeDependencies()  -- called when inherited dependencies change
 *   3. build(context)           -- called by StatefulElement.rebuild()
 *   4. _update(newWidget)       -- sets new widget, calls didUpdateWidget(oldWidget)
 *   5. setState(fn?)            -- executes callback, marks element dirty
 *   6. _unmount()               -- sets mounted=false, calls dispose()
 *
 * Amp ref: class _8, amp-strings.txt:529716
 * Extension: didChangeDependencies() added for Flutter API parity (not in Amp).
 */
```

### 2.3 Changes to `StatefulElement` in `element.ts`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

#### 2.3.1 Override `markNeedsRebuild()` to detect dependency-driven rebuilds

The key challenge is distinguishing "marked dirty because InheritedElement changed" from "marked dirty because setState() was called." We solve this by having `InheritedElement.notifyDependents()` call a new method on the dependent element that both sets the State flag and marks it dirty.

Add a new method to `StatefulElement`:

```typescript
/**
 * Called when an InheritedWidget that this element depends on changes.
 * Sets the State's dependency-changed flag before marking dirty.
 *
 * This method is called by InheritedElement.notifyDependents() instead
 * of the generic markNeedsRebuild(), allowing StatefulElement to
 * distinguish dependency changes from other rebuild triggers.
 */
didChangeDependencies(): void {
    if (this._state) {
        this._state._notifyDependenciesChanged();
    }
    this.markNeedsRebuild();
}
```

#### 2.3.2 Update `rebuild()` to call `_maybeCallDidChangeDependencies()`

Modify the `rebuild()` method (lines 375-398) to invoke the dependency check before `build()`:

```typescript
rebuild(): void {
    if (!this._context || !this._state) {
        throw new Error('Cannot rebuild unmounted element');
    }

    // If dependencies changed, fire the lifecycle hook before building
    this._state._maybeCallDidChangeDependencies();

    const newWidget = this._state.build(this._context);

    // ... rest of child diffing unchanged ...
}
```

### 2.4 Changes to `InheritedElement.notifyDependents()` in `element.ts`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

Modify `notifyDependents()` (lines 485-489) to call the more specific method on StatefulElements:

```typescript
notifyDependents(): void {
    for (const dep of this._dependents) {
        if (dep instanceof StatefulElement) {
            dep.didChangeDependencies();
        } else {
            dep.markNeedsRebuild();
        }
    }
}
```

### 2.5 Add `didChangeDependencies()` to `Element` Base Class

For uniformity, add a default implementation on `Element` that simply delegates to `markNeedsRebuild()`. This way `InheritedElement.notifyDependents()` can call it uniformly without an `instanceof` check:

```typescript
// In Element base class (element.ts)

/**
 * Called by InheritedElement when a dependency changes.
 * Base implementation simply marks the element dirty.
 * StatefulElement overrides to also fire State.didChangeDependencies().
 */
didChangeDependencies(): void {
    this.markNeedsRebuild();
}
```

Then `InheritedElement.notifyDependents()` simplifies to:

```typescript
notifyDependents(): void {
    for (const dep of this._dependents) {
        dep.didChangeDependencies();
    }
}
```

This is cleaner and avoids `instanceof` checks in a hot path.

### 2.6 Complete Diff Summary

| File | Change | Lines Affected |
|------|--------|---------------|
| `widget.ts` | Add `_dependenciesChanged` field to `State` | After line 160 |
| `widget.ts` | Add `didChangeDependencies()` user hook to `State` | After line 221 |
| `widget.ts` | Add `_notifyDependenciesChanged()` internal method to `State` | After `_update()` |
| `widget.ts` | Add `_maybeCallDidChangeDependencies()` to `State` | After `_notifyDependenciesChanged()` |
| `widget.ts` | Update `_mount()` to call `didChangeDependencies()` | Line 189 |
| `widget.ts` | Update class doc comment | Lines 141-156 |
| `element.ts` | Add `didChangeDependencies()` to `Element` base class | After line 156 |
| `element.ts` | Override `didChangeDependencies()` on `StatefulElement` | After line 372 |
| `element.ts` | Update `StatefulElement.rebuild()` to call `_maybeCallDidChangeDependencies()` | Line 379 |
| `element.ts` | Update `InheritedElement.notifyDependents()` to call `didChangeDependencies()` | Lines 485-489 |

---

## 3. Full Lifecycle After Changes

### 3.1 First Mount Sequence

```
StatefulElement.mount()
  -> createState()
  -> state._mount(widget, context)
       -> initState()
       -> didChangeDependencies()    <-- NEW: always fires on first mount
  -> rebuild()
       -> state._maybeCallDidChangeDependencies()
            -> (flag is false after _mount already called it, so no-op)
       -> state.build(context)
  -> markMounted()
```

### 3.2 InheritedWidget Change Sequence

```
InheritedElement.update(newWidget)
  -> updateShouldNotify(oldWidget) returns true
  -> notifyDependents()
       -> for each dependent:
            -> dep.didChangeDependencies()  <-- calls the Element method
                 -> (if StatefulElement) state._notifyDependenciesChanged()
                      -> sets _dependenciesChanged = true
                 -> markNeedsRebuild()
                      -> sets _dirty = true
                      -> scheduleBuildFor(this)

... later, during BuildOwner.buildScopes() ...

StatefulElement.performRebuild()
  -> rebuild()
       -> state._maybeCallDidChangeDependencies()
            -> _dependenciesChanged is true
            -> calls state.didChangeDependencies()  <-- user code runs
            -> resets _dependenciesChanged = false
       -> state.build(context)
       -> ... child diffing ...
```

### 3.3 Normal setState Sequence (unchanged)

```
state.setState(fn)
  -> fn() executes
  -> _markNeedsBuild()
       -> element.markNeedsBuild()
            -> markNeedsRebuild()
                 -> scheduleBuildFor(this)

... later, during BuildOwner.buildScopes() ...

StatefulElement.performRebuild()
  -> rebuild()
       -> state._maybeCallDidChangeDependencies()
            -> _dependenciesChanged is false, no-op
       -> state.build(context)
       -> ... child diffing ...
```

### 3.4 Widget Update Sequence (unchanged, with one addition)

```
StatefulElement.update(newWidget)
  -> state._update(newWidget)
       -> didUpdateWidget(oldWidget)
  -> rebuild()
       -> state._maybeCallDidChangeDependencies()
            -> no-op unless dependencies also changed
       -> state.build(context)
```

---

## 4. Migration and Compatibility Considerations

### 4.1 Backward Compatibility

This change is **fully backward compatible**:

- The default implementation of `didChangeDependencies()` is an empty no-op method, identical to `initState()` and `didUpdateWidget()`. Existing `State` subclasses that do not override it will see zero behavioral difference.
- The `_mount()` method gains an additional call to `didChangeDependencies()` after `initState()`, but since the default is a no-op, existing code is unaffected.
- The `InheritedElement.notifyDependents()` change from `markNeedsRebuild()` to `didChangeDependencies()` on the `Element` base class is semantically identical for non-StatefulElement dependents, since `Element.didChangeDependencies()` delegates directly to `markNeedsRebuild()`.
- For `StatefulElement` dependents, the only addition is that `didChangeDependencies()` fires before `build()` on the next rebuild -- this is strictly additive.

### 4.2 Breaking Change Risk

**None.** No existing public API signatures change. No existing method behaviors change for callers that do not override `didChangeDependencies()`.

### 4.3 Amp Fidelity Deviation

This is an acknowledged extension beyond the Amp reference implementation. The CLAUDE.md project instructions state that the codebase must faithfully reproduce the Amp architecture. This change should be:

1. **Clearly documented** as an extension, not a reproduction of Amp behavior.
2. **Annotated in code** with comments like:
   ```typescript
   // Extension: didChangeDependencies() added for Flutter API parity.
   // Not present in Amp (_8 class). See .gap/01-did-change-dependencies.md
   ```
3. **Gated behind a decision** -- the project maintainers should explicitly approve this deviation from the "100% Amp fidelity" rule before implementation proceeds.

### 4.4 TypeScript Interface Updates

The `ElementLike` interface in `widget.ts` (lines 13-18) does not need changes since `didChangeDependencies()` is on the concrete `Element` class and called within the element/framework layer, not through the minimal forward-reference interface.

The `BuildContext` interface (lines 21-26) also does not need changes.

### 4.5 Performance Impact

The added overhead is minimal:

- **Per mount**: One additional empty function call (`didChangeDependencies()`) during `_mount()`. Cost: negligible.
- **Per dependency-driven rebuild**: One boolean check (`_dependenciesChanged`) and one conditional function call before `build()`. Cost: negligible.
- **Per normal rebuild (setState)**: One boolean check (`_dependenciesChanged` is false, short-circuit). Cost: negligible.
- **In `notifyDependents()`**: Calling `didChangeDependencies()` instead of `markNeedsRebuild()` -- same call overhead since the base implementation delegates to `markNeedsRebuild()`.

---

## 5. Testing Strategy

### 5.1 Unit Tests for State.didChangeDependencies()

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/element.test.ts`

Add a new `describe('State.didChangeDependencies', ...)` block with the following test cases:

#### Test 1: didChangeDependencies is called on first mount

```typescript
test('didChangeDependencies is called during first mount after initState', () => {
    const callOrder: string[] = [];
    const leaf = new TestTerminalLeaf();

    const widget = new TestStatefulWidget({
        createState: () => {
            const state = new TestState(() => leaf);
            state.initState = () => { callOrder.push('initState'); };
            state.didChangeDependencies = () => { callOrder.push('didChangeDependencies'); };
            return state;
        },
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    expect(callOrder).toEqual(['initState', 'didChangeDependencies']);
});
```

#### Test 2: didChangeDependencies is called when inherited widget changes

```typescript
test('didChangeDependencies fires when inherited dependency changes', () => {
    let didChangeCalled = false;
    // ... setup InheritedWidget -> StatefulWidget that depends on it
    // ... update the InheritedWidget
    // ... trigger rebuild
    // ... assert didChangeCalled === true
});
```

#### Test 3: didChangeDependencies is NOT called on normal setState rebuild

```typescript
test('didChangeDependencies does NOT fire on normal setState rebuild', () => {
    let didChangeCallCount = 0;
    // ... setup StatefulWidget, mount it
    // ... didChangeCallCount should be 1 (from mount)
    // ... call setState()
    // ... trigger rebuild
    // ... assert didChangeCallCount is still 1
});
```

#### Test 4: didChangeDependencies is NOT called on didUpdateWidget rebuild

```typescript
test('didChangeDependencies does NOT fire on widget update rebuild', () => {
    let didChangeCallCount = 0;
    // ... setup, mount
    // ... update with new widget of same type
    // ... assert didChangeCallCount is still 1
});
```

#### Test 5: didChangeDependencies fires before build when dependency changes

```typescript
test('didChangeDependencies fires before build on dependency change', () => {
    const callOrder: string[] = [];
    // ... setup with InheritedWidget dependency
    // ... change inherited widget
    // ... rebuild
    // ... assert callOrder is ['didChangeDependencies', 'build']
});
```

#### Test 6: Multiple dependency changes coalesce into single didChangeDependencies call

```typescript
test('multiple dependency notifications coalesce into one didChangeDependencies call', () => {
    let didChangeCallCount = 0;
    // ... setup State depending on two different InheritedWidgets
    // ... both change simultaneously
    // ... single rebuild
    // ... assert didChangeCallCount incremented by exactly 1
});
```

### 5.2 Integration Tests

#### Test 7: MediaQuery change triggers didChangeDependencies

Since `MediaQuery` is a key `InheritedWidget` already in the codebase, verify that a terminal resize (which updates `MediaQueryData`) triggers `didChangeDependencies()` in dependent State objects.

#### Test 8: Full mount->dependency-change->unmount lifecycle

```typescript
test('complete lifecycle: mount -> dependency change -> unmount', () => {
    const events: string[] = [];
    // Track: initState, didChangeDependencies, build, didChangeDependencies,
    //        build, dispose
    // Assert correct ordering throughout full lifecycle
});
```

### 5.3 Regression Tests

- Verify that all existing tests in `element.test.ts` continue to pass without modification.
- Verify that the `InheritedElement` test suite (lines 872-1001 of element.test.ts) continues to pass -- dependent elements should still be marked dirty and rebuilt.
- Run the full test suite: `bun test` across all packages.

### 5.4 Edge Case Tests

#### Test 9: didChangeDependencies with no dependencies registered

```typescript
test('didChangeDependencies on mount even with no inherited dependencies', () => {
    // A StatefulWidget that never calls dependOnInheritedWidgetOfExactType
    // should still get didChangeDependencies on first mount
    let called = false;
    // ... assert called === true after mount
});
```

#### Test 10: setState inside didChangeDependencies

```typescript
test('setState inside didChangeDependencies does not cause infinite loop', () => {
    // Calling setState inside didChangeDependencies should schedule another
    // rebuild, but the _dependenciesChanged flag is already reset, so
    // the next rebuild won't re-trigger didChangeDependencies.
    // ... verify no infinite loop and state mutation is applied
});
```

#### Test 11: Dependency removed and re-added

```typescript
test('dependency change after element unmounted is safe', () => {
    // Unmount the dependent element, then update the InheritedWidget.
    // The unmounted element should not crash or receive callbacks.
});
```

---

## 6. Implementation Order

1. **Phase A -- State class changes** (`widget.ts`):
   - Add `_dependenciesChanged` field
   - Add `didChangeDependencies()` empty hook
   - Add `_notifyDependenciesChanged()` internal method
   - Add `_maybeCallDidChangeDependencies()` internal method
   - Update `_mount()` to call `didChangeDependencies()`
   - Update documentation comment

2. **Phase B -- Element class changes** (`element.ts`):
   - Add `didChangeDependencies()` to `Element` base class
   - Override `didChangeDependencies()` on `StatefulElement`
   - Update `StatefulElement.rebuild()` to call `_maybeCallDidChangeDependencies()`
   - Update `InheritedElement.notifyDependents()` to call `dep.didChangeDependencies()`

3. **Phase C -- Tests** (`element.test.ts`):
   - Add all unit tests from Section 5.1
   - Add integration tests from Section 5.2
   - Run full regression suite

4. **Phase D -- Documentation**:
   - Update any widget lifecycle documentation
   - Add Amp deviation annotation comment in source

---

## 7. Alternative Designs Considered

### 7.1 Callback-based approach (rejected)

Instead of a lifecycle method, we could have `dependOnInheritedWidgetOfExactType()` accept an `onChange` callback. This was rejected because:
- It diverges from the Flutter API that developers expect
- It would require managing callback cleanup
- It scatters the "when dependencies change" logic across multiple call sites

### 7.2 Separate `_dependencyChangedElements` set in BuildOwner (rejected)

We could track dependency-changed elements separately in `BuildOwner` and process them differently during `buildScopes()`. This was rejected because:
- It adds complexity to the build phase
- The flag-based approach is simpler and matches Flutter's implementation
- It would require `BuildOwner` to know about `State`, violating separation of concerns

### 7.3 Override performRebuild on StatefulElement (considered)

Instead of modifying `rebuild()`, we could override `performRebuild()` on `StatefulElement`. However, `performRebuild()` simply delegates to `rebuild()` already (line 365-367), and modifying `rebuild()` directly is clearer about when the hook fires relative to `build()`.

---

## 8. Open Questions

1. **Amp fidelity approval**: This change is explicitly documented as "not in Amp." Does the project accept this Flutter-parity extension? The CLAUDE.md file is strict about Amp fidelity, so this needs an explicit sign-off.

2. **Should `didChangeDependencies()` be called during `_mount()` or during the first `rebuild()`?** The proposed design calls it during `_mount()` (matching Flutter), which means it fires synchronously before the first `build()`. An alternative would be to set `_dependenciesChanged = true` during `_mount()` and let `rebuild()` fire it, but this would make the first-mount behavior slightly different from Flutter where `didChangeDependencies()` fires before `build()` in both cases.

3. **Should non-StatefulElement dependents (e.g., StatelessElement) also get a `didChangeDependencies()` hook?** The current proposal only adds meaningful behavior for `StatefulElement`. `StatelessElement` and `RenderObjectElement` simply rebuild. This matches Flutter, where only `State` has this lifecycle method.
