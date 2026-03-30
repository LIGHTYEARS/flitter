# Gap F08: No `InheritedModel` or Aspect-Based Dependencies

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Behavior Analysis

### 1.1 How `InheritedWidget` Dependency Tracking Works Today

The current dependency tracking system in flitter is binary: a descendant element either depends on an entire `InheritedWidget` or it does not. There is no mechanism for a consumer to declare that it only cares about a specific "aspect" (sub-field) of the inherited data.

The relevant code lives in two files:

**`/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`** -- `Element._inheritedDependencies` (line 42) is a `Set<InheritedElement>`, and `dependOnInheritedWidgetOfExactType()` (lines 164-177) performs a parent-chain walk, registers the calling element as a dependent, and adds the `InheritedElement` to the caller's `_inheritedDependencies` set:

```typescript
// element.ts lines 42, 164-177
_inheritedDependencies: Set<InheritedElement> = new Set();

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

**`/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`** -- `InheritedElement` (lines 411-498) holds a flat `Set<Element>` of dependents. When `update()` is called and `updateShouldNotify()` returns true, **every** dependent is marked dirty via `notifyDependents()`:

```typescript
// element.ts lines 413, 476-489
_dependents: Set<Element> = new Set();

addDependent(element: Element): void {
    this._dependents.add(element);
}

notifyDependents(): void {
    for (const dep of this._dependents) {
        dep.markNeedsRebuild();
    }
}
```

**`/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`** -- `InheritedWidget` (lines 284-303) defines a single abstract method `updateShouldNotify(oldWidget)` that returns a boolean -- no aspect parameter is involved:

```typescript
// widget.ts lines 284-303
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

### 1.2 The All-or-Nothing Notification Problem

The consequence of this design is that when an `InheritedWidget`'s data changes, **all dependents rebuild**, even those that only use a small sub-field of the data. This is a significant performance issue for widgets that carry rich, multi-field data objects. Consider the real examples in the flitter codebase:

**`Theme`** (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/theme.ts`) holds a `ThemeData` object with 15 color fields (`primary`, `background`, `surface`, `text`, `textSecondary`, `success`, `error`, `warning`, `info`, `border`, `scrollbarThumb`, `scrollbarTrack`, `diffAdded`, `diffRemoved`, `selectionBackground`). If only `scrollbarThumb` changes, every single widget that depends on `Theme` rebuilds -- including those that only read `primary` or `text`.

**`AppTheme`** (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/app-theme.ts`) holds `AppThemeData` containing a `SyntaxHighlightConfig` (13 color fields) and `colors` (5 color fields). A widget that only uses `syntaxHighlight.keyword` will still rebuild when `colors.muted` changes.

**`MediaQuery`** (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/media-query.ts`) holds `MediaQueryData` with `size` and `capabilities`. A widget that only reads `size` will rebuild when `capabilities.mouseSupport` changes.

### 1.3 What Flutter Provides That Flitter Lacks

Flutter solves this with `InheritedModel<T>`, a subclass of `InheritedWidget` that adds aspect-based dependency tracking. The key API surface is:

1. **`InheritedModel<T>.createElement()`** returns an `InheritedModelElement<T>` (not a plain `InheritedElement`).
2. **`InheritedModel.inheritFrom(context, aspect)`** -- static method that registers a dependency on a specific aspect `T`.
3. **`InheritedModelElement<T>`** overrides `notifyDependents()` to check whether each dependent's recorded aspects are affected by the change.
4. **`InheritedModel.updateShouldNotifyDependent(oldWidget, dependencies)`** -- abstract method that receives the set of aspects a particular dependent cares about and returns whether that dependent should rebuild.

The dependent storage changes from `Set<Element>` to `Map<Element, Set<T>>` -- each dependent maps to the set of aspects it declared interest in.

### 1.4 Concrete Impact in Flitter

The all-or-nothing approach means:

- **Theme changes are expensive**: Changing any single theme color rebuilds every themed widget in the tree.
- **MediaQuery terminal resize is expensive**: A resize updates `size`, but widgets only reading `capabilities` also rebuild.
- **No selective subscription API**: Widget authors have no way to express "I only care about `Theme.data.primary`" -- they always get the full notification blast.
- **Workaround tax**: Authors must split a single logical `InheritedWidget` into many smaller ones (e.g., `ThemePrimaryColor`, `ThemeErrorColor`) to get fine-grained notifications, which is ergonomically poor.

---

## 2. Proposed `InheritedModel` Implementation

### 2.1 Design Overview

The implementation introduces three new types:

1. **`InheritedModel<T>` abstract class** (extends `InheritedWidget`) -- in `widget.ts`
2. **`InheritedModelElement<T>` class** (extends `InheritedElement`) -- in `element.ts`
3. **Updated `dependOnInheritedWidgetOfExactType` signature** or a new `dependOnInheritedModel` method on `Element` / `BuildContextImpl`

The generic type parameter `T` represents the "aspect" type -- typically a string enum or string union for theme fields, or a discriminated union for more complex cases.

### 2.2 `InheritedModel<T>` Widget Class

Add to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`:

```typescript
/**
 * An InheritedWidget subclass that supports fine-grained dependency tracking
 * via "aspects". Descendants can declare they only depend on specific aspects
 * of the inherited data, and will only rebuild when those aspects change.
 *
 * Subclasses must implement:
 *   - updateShouldNotify(oldWidget) -- coarse check (same as InheritedWidget)
 *   - updateShouldNotifyDependent(oldWidget, dependencies) -- fine-grained check
 *
 * Consumers register aspect dependencies via:
 *   InheritedModel.inheritFrom<MyModel>(context, aspect: 'fieldName')
 *
 * Flutter ref: InheritedModel<T> from package:flutter/widgets.dart
 */
export abstract class InheritedModel<T> extends InheritedWidget {
    constructor(opts: { key?: Key; child: Widget }) {
        super(opts);
    }

    createElement(): any {
        const { InheritedModelElement } = require('./element');
        return new InheritedModelElement<T>(this);
    }

    /**
     * Called for each dependent that registered with specific aspects.
     * Return true if the dependent should rebuild given the old widget
     * and the set of aspects that dependent declared interest in.
     *
     * @param oldWidget - The previous widget configuration
     * @param dependencies - The set of aspects this particular dependent cares about
     */
    abstract updateShouldNotifyDependent(
        oldWidget: InheritedModel<T>,
        dependencies: Set<T>,
    ): boolean;

    /**
     * Look up the nearest ancestor InheritedModel of the given type and
     * register a dependency on the specified aspect. If aspect is undefined,
     * a full (unconditional) dependency is registered.
     *
     * @param context - The BuildContext of the consuming widget
     * @param widgetType - The constructor of the InheritedModel subclass
     * @param aspect - Optional aspect to register interest in
     */
    static inheritFrom<M extends InheritedModel<A>, A>(
        context: BuildContext,
        opts: {
            widgetType: new (...args: any[]) => M;
            aspect?: A;
        },
    ): M | null {
        const ctx = context as any;
        if (typeof ctx.dependOnInheritedModel === 'function') {
            return ctx.dependOnInheritedModel(opts.widgetType, opts.aspect) as M | null;
        }
        // Fallback: use non-aspect-aware lookup
        if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
            const element = ctx.dependOnInheritedWidgetOfExactType(opts.widgetType);
            return element ? (element.widget as M) : null;
        }
        return null;
    }
}
```

### 2.3 `InheritedModelElement<T>` Element Class

Add to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`:

```typescript
/**
 * Element for InheritedModel<T>. Extends InheritedElement with aspect-aware
 * dependency tracking.
 *
 * Instead of a flat Set<Element> for dependents, this uses a
 * Map<Element, Set<T> | null> where:
 *   - null means "unconditional dependency" (rebuild on any change)
 *   - Set<T> means "only rebuild if one of these aspects changed"
 *
 * Flutter ref: InheritedModelElement<T>
 */
export class InheritedModelElement<T> extends InheritedElement {
    /**
     * Maps each dependent element to its set of aspects, or null for
     * unconditional (full) dependencies.
     */
    _aspectDependents: Map<Element, Set<T> | null> = new Map();

    constructor(widget: InheritedModel<T>) {
        super(widget);
    }

    get inheritedModel(): InheritedModel<T> {
        return this.widget as InheritedModel<T>;
    }

    /**
     * Register a dependent with an optional aspect.
     * If aspect is undefined, the dependent is unconditional (always notified).
     * If aspect is provided, it is added to the dependent's aspect set.
     *
     * Calling this multiple times with different aspects accumulates them.
     * Calling once with no aspect makes it unconditional regardless of
     * previous aspect registrations.
     */
    addDependentWithAspect(element: Element, aspect?: T): void {
        // Also register in the base class's _dependents set for unmount cleanup
        super.addDependent(element);

        const existing = this._aspectDependents.get(element);

        if (aspect === undefined) {
            // Unconditional dependency -- overrides any previous aspects
            this._aspectDependents.set(element, null);
        } else if (existing === null) {
            // Already unconditional -- adding an aspect doesn't narrow it
            return;
        } else if (existing) {
            // Add to existing aspect set
            existing.add(aspect);
        } else {
            // First aspect for this dependent
            this._aspectDependents.set(element, new Set([aspect]));
        }
    }

    /**
     * Override addDependent to also track in _aspectDependents as unconditional.
     * This handles the case where a consumer uses the basic
     * dependOnInheritedWidgetOfExactType (no aspect) on an InheritedModel.
     */
    override addDependent(element: Element): void {
        super.addDependent(element);
        // Register as unconditional if not already tracked
        if (!this._aspectDependents.has(element)) {
            this._aspectDependents.set(element, null);
        }
    }

    override removeDependent(element: Element): void {
        super.removeDependent(element);
        this._aspectDependents.delete(element);
    }

    /**
     * Override notifyDependents to perform aspect-aware filtering.
     *
     * For each dependent:
     *   - If aspects is null (unconditional), always notify.
     *   - If aspects is a Set<T>, call updateShouldNotifyDependent()
     *     to check whether those specific aspects changed.
     */
    override notifyDependents(): void {
        const oldWidget = this._previousWidget as InheritedModel<T> | undefined;

        for (const [dep, aspects] of this._aspectDependents) {
            if (aspects === null) {
                // Unconditional dependency -- always rebuild
                dep.markNeedsRebuild();
            } else if (oldWidget) {
                // Aspect-filtered dependency -- ask the model
                if (this.inheritedModel.updateShouldNotifyDependent(oldWidget, aspects)) {
                    dep.markNeedsRebuild();
                }
            } else {
                // No old widget to compare against (first build?) -- rebuild
                dep.markNeedsRebuild();
            }
        }
    }

    override unmount(): void {
        this._aspectDependents.clear();
        super.unmount();
    }
}
```

### 2.4 Changes to `InheritedElement.update()` -- Capture Previous Widget

The `notifyDependents()` override in `InheritedModelElement` needs access to the old widget to pass it to `updateShouldNotifyDependent()`. Currently, `InheritedElement.update()` calls `notifyDependents()` after `super.update(newWidget)` has already swapped the widget reference. We need to capture the old widget before it is swapped.

Modify `InheritedElement` in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`:

```typescript
export class InheritedElement extends Element {
    _child: Element | undefined = undefined;
    _dependents: Set<Element> = new Set();
    _previousWidget: InheritedWidget | undefined = undefined; // <-- NEW

    // ... existing constructor and accessors ...

    override update(newWidget: Widget): void {
        const oldWidget = this.inheritedWidget;
        this._previousWidget = oldWidget; // <-- NEW: capture for notifyDependents
        super.update(newWidget);
        const newInherited = this.inheritedWidget;

        if (newInherited.updateShouldNotify(oldWidget)) {
            this.notifyDependents();
        }

        this._previousWidget = undefined; // <-- NEW: clear after notification

        // ... existing child update logic ...
    }
}
```

This is a minimal, non-breaking change to `InheritedElement`. The `_previousWidget` field is set just before `notifyDependents()` is called and cleared immediately after. The base `InheritedElement.notifyDependents()` does not use it, so behavior is unchanged for existing code. Only `InheritedModelElement` reads it.

### 2.5 New `dependOnInheritedModel` Method

Add to `Element` class in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`:

```typescript
/**
 * Look up an InheritedModel<T> ancestor and register a dependency
 * on a specific aspect. If aspect is undefined, registers an
 * unconditional dependency (same as dependOnInheritedWidgetOfExactType).
 */
dependOnInheritedModel<T>(widgetType: Function, aspect?: T): InheritedModelElement<T> | null {
    let ancestor = this.parent;
    while (ancestor) {
        if (ancestor.widget.constructor === widgetType) {
            if (ancestor instanceof InheritedModelElement) {
                (ancestor as InheritedModelElement<T>).addDependentWithAspect(this, aspect);
                this._inheritedDependencies.add(ancestor);
                return ancestor as InheritedModelElement<T>;
            }
            // Fall through to regular InheritedElement handling
            if (ancestor instanceof InheritedElement) {
                ancestor.addDependent(this);
                this._inheritedDependencies.add(ancestor);
            }
            return ancestor as any;
        }
        ancestor = ancestor.parent;
    }
    return null;
}
```

Add the corresponding method to `BuildContextImpl`:

```typescript
/**
 * Look up an InheritedModel<T> and register a dependency on a specific aspect.
 */
dependOnInheritedModel<T>(widgetType: Function, aspect?: T): any {
    return this.element.dependOnInheritedModel(widgetType, aspect);
}
```

### 2.6 Backward Compatibility

This design is fully backward-compatible:

1. **Existing `InheritedWidget` subclasses** (`Theme`, `MediaQuery`, `AppTheme`, `ForceDim`, `HoverContext`, `DefaultTextStyle`, `ImagePreviewProvider`) continue working without any changes. They still use `InheritedElement` and the old `updateShouldNotify` mechanism.

2. **Existing `dependOnInheritedWidgetOfExactType` calls** continue working even against `InheritedModel` instances. When a consumer uses the old API against an `InheritedModelElement`, `addDependent()` is called (which registers an unconditional dependency in the aspect map), so they always get notified.

3. **Incremental migration**: Widget authors can choose to convert individual `InheritedWidget` subclasses to `InheritedModel` at their own pace, and consumers can adopt aspect-based subscriptions incrementally.

### 2.7 Example: Converting `MediaQuery` to `InheritedModel`

To illustrate how the migration would work, here is how `MediaQuery` could be converted from `InheritedWidget` to `InheritedModel`:

```typescript
// Define the aspects
type MediaQueryAspect = 'size' | 'capabilities';

export class MediaQuery extends InheritedModel<MediaQueryAspect> {
    readonly data: MediaQueryData;

    constructor(opts: { data: MediaQueryData; child: Widget; key?: Key }) {
        super({ key: opts.key, child: opts.child });
        this.data = opts.data;
    }

    // Coarse-grained check (same as before)
    updateShouldNotify(oldWidget: InheritedWidget): boolean {
        const old = oldWidget as MediaQuery;
        return !this.data.equals(old.data);
    }

    // Fine-grained check for aspect-aware dependents
    updateShouldNotifyDependent(
        oldWidget: InheritedModel<MediaQueryAspect>,
        dependencies: Set<MediaQueryAspect>,
    ): boolean {
        const old = oldWidget as MediaQuery;
        if (dependencies.has('size')) {
            if (this.data.size.width !== old.data.size.width ||
                this.data.size.height !== old.data.size.height) {
                return true;
            }
        }
        if (dependencies.has('capabilities')) {
            if (this.data.capabilities.colorDepth !== old.data.capabilities.colorDepth ||
                this.data.capabilities.mouseSupport !== old.data.capabilities.mouseSupport ||
                this.data.capabilities.emojiWidth !== old.data.capabilities.emojiWidth ||
                this.data.capabilities.kittyGraphics !== old.data.capabilities.kittyGraphics) {
                return true;
            }
        }
        return false;
    }

    // Aspect-aware accessor
    static sizeOf(context: BuildContext): { readonly width: number; readonly height: number } {
        const widget = InheritedModel.inheritFrom<MediaQuery, MediaQueryAspect>(context, {
            widgetType: MediaQuery,
            aspect: 'size',
        });
        if (!widget) throw new Error('No MediaQuery ancestor found');
        return widget.data.size;
    }

    static capabilitiesOf(context: BuildContext): TerminalCapabilities {
        const widget = InheritedModel.inheritFrom<MediaQuery, MediaQueryAspect>(context, {
            widgetType: MediaQuery,
            aspect: 'capabilities',
        });
        if (!widget) throw new Error('No MediaQuery ancestor found');
        return widget.data.capabilities;
    }

    // Full dependency (backward-compatible)
    static of(context: BuildContext): MediaQueryData {
        const widget = InheritedModel.inheritFrom<MediaQuery, MediaQueryAspect>(context, {
            widgetType: MediaQuery,
            // No aspect -- unconditional dependency
        });
        if (!widget) throw new Error('No MediaQuery ancestor found');
        return widget.data;
    }
}
```

### 2.8 Example: Converting `Theme` to `InheritedModel`

Theme is an even more compelling case because it has 15 fields:

```typescript
type ThemeAspect =
    | 'primary' | 'background' | 'surface' | 'text' | 'textSecondary'
    | 'success' | 'error' | 'warning' | 'info' | 'border'
    | 'scrollbarThumb' | 'scrollbarTrack' | 'diffAdded' | 'diffRemoved'
    | 'selectionBackground';

export class Theme extends InheritedModel<ThemeAspect> {
    readonly data: ThemeData;

    // ... constructor ...

    updateShouldNotify(oldWidget: InheritedWidget): boolean {
        const old = oldWidget as Theme;
        return !themeDataEquals(this.data, old.data);
    }

    updateShouldNotifyDependent(
        oldWidget: InheritedModel<ThemeAspect>,
        dependencies: Set<ThemeAspect>,
    ): boolean {
        const old = (oldWidget as Theme).data;
        const cur = this.data;
        for (const aspect of dependencies) {
            if (!cur[aspect].equals(old[aspect])) {
                return true;
            }
        }
        return false;
    }

    // Aspect-aware color accessor
    static colorOf(context: BuildContext, aspect: ThemeAspect): Color {
        const widget = InheritedModel.inheritFrom<Theme, ThemeAspect>(context, {
            widgetType: Theme,
            aspect,
        });
        if (!widget) throw new Error('No Theme ancestor found');
        return widget.data[aspect];
    }

    // Full dependency (backward-compatible)
    static of(context: BuildContext): ThemeData {
        const widget = InheritedModel.inheritFrom<Theme, ThemeAspect>(context, {
            widgetType: Theme,
        });
        if (!widget) throw new Error('No Theme ancestor found');
        return widget.data;
    }
}
```

With this design, a widget that only reads `Theme.colorOf(context, 'primary')` will not rebuild when `scrollbarThumb` changes.

---

## 3. Implementation Plan

### 3.1 File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `framework/widget.ts` | **Add** | `InheritedModel<T>` abstract class (extends `InheritedWidget`) |
| `framework/element.ts` | **Add** | `InheritedModelElement<T>` class (extends `InheritedElement`) |
| `framework/element.ts` | **Modify** | Add `_previousWidget` field to `InheritedElement` |
| `framework/element.ts` | **Modify** | Update `InheritedElement.update()` to capture old widget |
| `framework/element.ts` | **Add** | `dependOnInheritedModel()` on `Element` |
| `framework/element.ts` | **Add** | `dependOnInheritedModel()` on `BuildContextImpl` |
| `framework/widget.ts` | **Add** | Export `InheritedModel` from module |

### 3.2 Implementation Order

1. Add `_previousWidget` field and capture logic to `InheritedElement.update()`.
2. Add `InheritedModel<T>` to `widget.ts`.
3. Add `InheritedModelElement<T>` to `element.ts`.
4. Add `dependOnInheritedModel()` to `Element` and `BuildContextImpl`.
5. Add `InheritedModel.inheritFrom()` static helper.
6. Export all new types from the package index.
7. Write unit tests (see section 4).
8. (Optional, separate PR) Convert `MediaQuery` to `InheritedModel` as a proof-of-concept migration.

### 3.3 Edge Cases

**Multiple aspects from the same widget**: A consumer may call `InheritedModel.inheritFrom(context, { widgetType: Theme, aspect: 'primary' })` and later in the same build method call it again with `aspect: 'error'`. The `addDependentWithAspect` method correctly accumulates both aspects in the same `Set<T>`.

**Mixed aspect/non-aspect consumers**: If one widget calls `Theme.of(context)` (no aspect) and another calls `Theme.colorOf(context, 'primary')` (with aspect), both are correctly handled. The first gets an unconditional dependency (null in the aspect map), the second gets aspect-filtered.

**Unconditional overrides aspect**: If a consumer first registers with aspect `'primary'` and then later calls `dependOnInheritedWidgetOfExactType` (no aspect), the dependency becomes unconditional. This is correct -- once you depend on everything, aspect filtering is moot.

**Empty aspect set**: If an element is registered in `_aspectDependents` with an empty `Set<T>`, `updateShouldNotifyDependent` will receive an empty set. The implementation should return `false` (no aspects matched), meaning the dependent does not rebuild. This is the correct semantic: "I registered but care about nothing."

**`InheritedModel` without aspect registration**: If all consumers of an `InheritedModel` use `dependOnInheritedWidgetOfExactType` (the old API) rather than `dependOnInheritedModel`, all dependencies are unconditional. The behavior is identical to a plain `InheritedWidget`. No performance regression.

---

## 4. Testing Strategy

### 4.1 Unit Tests for `InheritedModelElement`

These tests should be added to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/element.test.ts`:

#### Test 1: Aspect-aware notification -- only matching dependents rebuild

```typescript
test('InheritedModelElement only notifies dependents whose aspects changed', () => {
    // Create an InheritedModel with aspects 'a' and 'b'
    // Register dependent1 with aspect 'a'
    // Register dependent2 with aspect 'b'
    // Update the model such that only aspect 'a' changes
    // Assert: dependent1 is dirty, dependent2 is NOT dirty
});
```

#### Test 2: Unconditional dependent always rebuilds

```typescript
test('InheritedModelElement always notifies unconditional dependents', () => {
    // Register dependent1 with no aspect (unconditional)
    // Register dependent2 with aspect 'b'
    // Update the model such that only aspect 'a' changes
    // Assert: dependent1 is dirty (unconditional), dependent2 is NOT dirty
});
```

#### Test 3: Multiple aspects accumulated

```typescript
test('InheritedModelElement accumulates multiple aspects per dependent', () => {
    // Register dependent1 with aspect 'a', then again with aspect 'b'
    // Update the model such that only aspect 'b' changes
    // Assert: dependent1 is dirty (has aspect 'b' in its set)
});
```

#### Test 4: Unconditional overrides previous aspects

```typescript
test('unconditional dependency overrides previous aspect registrations', () => {
    // Register dependent1 with aspect 'a'
    // Then register dependent1 with no aspect (unconditional)
    // Update the model such that only aspect 'b' changes
    // Assert: dependent1 is dirty (unconditional overrode aspect-specific)
});
```

#### Test 5: Adding aspect to unconditional does not narrow it

```typescript
test('adding aspect to unconditional dependent does not narrow dependency', () => {
    // Register dependent1 with no aspect (unconditional)
    // Then register dependent1 with aspect 'a'
    // Update the model such that only aspect 'b' changes
    // Assert: dependent1 is dirty (still unconditional)
});
```

#### Test 6: removeDependent clears aspect tracking

```typescript
test('removeDependent clears aspect tracking for that element', () => {
    // Register dependent1 with aspect 'a'
    // Remove dependent1
    // Update the model such that aspect 'a' changes
    // Assert: dependent1 is NOT dirty (was removed)
    // Assert: _aspectDependents does not contain dependent1
});
```

#### Test 7: unmount clears all aspect dependents

```typescript
test('InheritedModelElement unmount clears _aspectDependents', () => {
    // Register multiple dependents with various aspects
    // Call unmount()
    // Assert: _aspectDependents is empty
    // Assert: base _dependents is empty
});
```

#### Test 8: No old widget comparison (first mount scenario)

```typescript
test('InheritedModelElement notifies all dependents when no previous widget exists', () => {
    // This tests the edge case where _previousWidget is undefined
    // Directly call notifyDependents() without a prior update()
    // Assert: all dependents (including aspect-filtered) are notified
});
```

### 4.2 Unit Tests for `InheritedModel` Widget

#### Test 9: createElement returns InheritedModelElement

```typescript
test('InheritedModel.createElement returns InheritedModelElement', () => {
    // Create a concrete InheritedModel subclass
    // Call createElement()
    // Assert: result is an instance of InheritedModelElement
});
```

#### Test 10: InheritedModel.inheritFrom with aspect

```typescript
test('InheritedModel.inheritFrom registers aspect dependency', () => {
    // Build a tree with an InheritedModel at the top
    // From a descendant, call InheritedModel.inheritFrom with an aspect
    // Assert: the dependent is in _aspectDependents with the correct aspect set
});
```

#### Test 11: InheritedModel.inheritFrom without aspect (unconditional)

```typescript
test('InheritedModel.inheritFrom without aspect registers unconditional dependency', () => {
    // Build a tree with an InheritedModel at the top
    // From a descendant, call InheritedModel.inheritFrom without an aspect
    // Assert: the dependent is in _aspectDependents with null (unconditional)
});
```

### 4.3 Integration Tests

#### Test 12: Full update cycle with aspect filtering

```typescript
test('full update cycle: aspect-filtered dependent skips rebuild', () => {
    // 1. Create a tree: InheritedModel > StatefulWidget > leaf
    // 2. The StatefulWidget's build calls inheritFrom with aspect 'a'
    // 3. Update the InheritedModel, changing only aspect 'b'
    // 4. Verify updateShouldNotify returns true (something changed)
    // 5. Verify updateShouldNotifyDependent returns false for aspect 'a'
    // 6. Verify the dependent is NOT marked dirty
});
```

#### Test 13: Full update cycle with matching aspect

```typescript
test('full update cycle: matching aspect triggers rebuild', () => {
    // 1. Create same tree as Test 12
    // 2. Update the InheritedModel, changing aspect 'a'
    // 3. Verify the dependent IS marked dirty
});
```

#### Test 14: Backward compatibility -- InheritedModel used via old API

```typescript
test('InheritedModel works with dependOnInheritedWidgetOfExactType', () => {
    // Use the old API (no aspect) against an InheritedModel
    // Verify it registers as unconditional
    // Verify it always rebuilds when any data changes
});
```

### 4.4 Performance Benchmark Tests (Optional)

These would demonstrate the value of the feature, not correctness:

```typescript
test('performance: aspect-aware notification avoids unnecessary rebuilds', () => {
    // Create an InheritedModel with 100 dependents
    // 50 depend on aspect 'a', 50 depend on aspect 'b'
    // Update only aspect 'a'
    // Count how many markNeedsRebuild calls happen
    // Assert: exactly 50 (not 100)
});
```

### 4.5 Test Helpers Needed

A concrete `TestInheritedModel` subclass for testing:

```typescript
type TestAspect = 'a' | 'b' | 'c';

class TestInheritedModel extends InheritedModel<TestAspect> {
    readonly values: Record<TestAspect, number>;

    constructor(opts: {
        values: Record<TestAspect, number>;
        child: Widget;
        key?: Key;
    }) {
        super({ key: opts.key, child: opts.child });
        this.values = opts.values;
    }

    updateShouldNotify(oldWidget: InheritedWidget): boolean {
        const old = oldWidget as TestInheritedModel;
        return (
            this.values.a !== old.values.a ||
            this.values.b !== old.values.b ||
            this.values.c !== old.values.c
        );
    }

    updateShouldNotifyDependent(
        oldWidget: InheritedModel<TestAspect>,
        dependencies: Set<TestAspect>,
    ): boolean {
        const old = oldWidget as TestInheritedModel;
        for (const aspect of dependencies) {
            if (this.values[aspect] !== old.values[aspect]) {
                return true;
            }
        }
        return false;
    }
}
```

---

## 5. Risks and Mitigations

### 5.1 Memory Overhead

**Risk**: The `Map<Element, Set<T> | null>` in `InheritedModelElement` uses more memory than the flat `Set<Element>` in `InheritedElement`.

**Mitigation**: The overhead is proportional to the number of dependents, which is typically small (10s, not 1000s). Each entry is a Map key (object reference) plus a Set or null. For widgets that are never converted to `InheritedModel`, there is zero overhead -- they continue using `InheritedElement`.

### 5.2 Complexity of `notifyDependents` Override

**Risk**: The aspect-checking loop in `notifyDependents()` calls `updateShouldNotifyDependent()` for each aspect-filtered dependent, which is O(D * A) where D is the number of dependents and A is the average aspect set size.

**Mitigation**: In practice, A is tiny (1-3 aspects per dependent). The `updateShouldNotifyDependent` method is a simple field comparison. The cost is negligible compared to the widget rebuild cost saved by not rebuilding unaffected dependents.

### 5.3 Circular Import Concerns

**Risk**: `InheritedModel` in `widget.ts` needs to reference `InheritedModelElement` from `element.ts`, while `element.ts` already imports from `widget.ts`.

**Mitigation**: The existing codebase already handles this pattern via lazy `require()` inside `createElement()` methods (see lines 104, 129, 294 of `widget.ts`). `InheritedModel.createElement()` will use the same pattern.

### 5.4 Type Safety with Generics

**Risk**: TypeScript generics with the lazy `require()` pattern and `any` return types for `createElement()` may lose type information.

**Mitigation**: The public API surface (`InheritedModel.inheritFrom<M, A>()`) is fully typed. Internal framework wiring through `createElement()` already uses `any` throughout the codebase. Type safety is maintained at the consumer level where it matters most.

---

## 6. Alternatives Considered

### 6.1 Split InheritedWidgets Instead

**Approach**: Instead of adding `InheritedModel`, split `Theme` into `ThemePrimaryColor`, `ThemeBackgroundColor`, etc.

**Rejected because**: This is ergonomically terrible. A `ThemeData` with 15 fields would require 15 separate `InheritedWidget` classes, 15 nested widgets in the tree, and 15 separate `of(context)` calls. It also makes adding new theme fields a breaking change.

### 6.2 Selector-Based Approach

**Approach**: Add a `select<R>(context, selector: (data) => R)` method that memoizes the selected value and only rebuilds when the selector output changes.

**Rejected because**: While powerful, this diverges from Flutter's API significantly. It also requires storing previous selected values per dependent, which is more complex than aspect sets. The `InheritedModel` approach is a well-understood pattern from Flutter with clear semantics.

### 6.3 Do Nothing

**Approach**: Accept the all-or-nothing notification behavior and rely on widgets being cheap to rebuild.

**Rejected because**: In a TUI context, rebuild costs are non-trivial (text measurement, ANSI escape computation). Theme and MediaQuery changes ripple through the entire widget tree. As the widget tree grows in complexity, the performance impact of unnecessary rebuilds becomes significant.

---

## 7. Summary

The current flitter framework lacks `InheritedModel<T>` and aspect-based dependency tracking, forcing all dependents of an `InheritedWidget` to rebuild whenever any part of the inherited data changes. This proposal adds:

- `InheritedModel<T>` -- an `InheritedWidget` subclass with `updateShouldNotifyDependent(oldWidget, aspects)`
- `InheritedModelElement<T>` -- an `InheritedElement` subclass tracking `Map<Element, Set<T> | null>`
- `dependOnInheritedModel(widgetType, aspect?)` -- a new method on `Element` and `BuildContextImpl`
- `InheritedModel.inheritFrom(context, { widgetType, aspect? })` -- a static convenience method

The implementation is fully backward-compatible, requires no changes to existing `InheritedWidget` subclasses, and enables incremental migration. The testing strategy covers correctness (14 tests), edge cases, and optional performance validation.
