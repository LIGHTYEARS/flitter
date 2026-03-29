# Analysis 43: InheritedWidget Pattern and Data Propagation in flitter-core

## 1. InheritedWidget Base Class Implementation

The `InheritedWidget` abstract class is defined in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts` (lines 284-303). It maps directly to the minified Amp class `Bt` and extends the base `Widget` class.

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

Key structural observations:

- **Single child model**: Unlike `StatelessWidget` or `StatefulWidget`, which produce their child dynamically via `build()`, `InheritedWidget` takes a concrete `child: Widget` as a constructor parameter. The inherited widget itself does not build anything -- it wraps exactly one child and makes data available to descendants.

- **Lazy circular-dependency import**: The `createElement()` method uses `require('./element')` rather than a top-level import. This is a deliberate pattern to break the circular dependency between `widget.ts` (which defines widget base classes) and `element.ts` (which imports from `widget.ts`). Since `createElement()` is only invoked at runtime during tree inflation, the circular reference resolves safely.

- **`updateShouldNotify` contract**: Subclasses must implement `updateShouldNotify(oldWidget)`. This is the gatekeeper for the notification cascade -- it receives the *previous* widget instance and returns `true` if dependents should be rebuilt. This is called during `InheritedElement.update()` *before* the child subtree is reconciled, which is an important ordering guarantee.

---

## 2. InheritedElement and the Dependency Tracking Mechanism

The `InheritedElement` class is defined in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts` (lines 411-498). It maps to Amp's minified class `Z_0`.

### Core Data Structures

```typescript
export class InheritedElement extends Element {
  _child: Element | undefined = undefined;
  _dependents: Set<Element> = new Set();
  // ...
}
```

Two data structures are central to the dependency tracking system:

1. **`InheritedElement._dependents: Set<Element>`** -- Each `InheritedElement` maintains a set of all elements that have declared a dependency on it. This is the "publisher" side of the publish-subscribe relationship.

2. **`Element._inheritedDependencies: Set<InheritedElement>`** -- Each `Element` (the base class) maintains a set of all `InheritedElement` instances it depends on. This is the "subscriber" side. It exists on the base `Element` at line 42:
   ```typescript
   _inheritedDependencies: Set<InheritedElement> = new Set();
   ```

This bidirectional linkage is critical for two operations:
- **Forward notification**: When an `InheritedElement` updates and `updateShouldNotify` returns `true`, it iterates `_dependents` to mark each dependent dirty.
- **Cleanup on unmount**: When an element is unmounted, it iterates `_inheritedDependencies` to remove itself from each `InheritedElement`'s `_dependents` set, preventing stale references.

### Lifecycle Methods

**Mount** (lines 432-437):
```typescript
mount(): void {
  this._child = this.inheritedWidget.child.createElement();
  this.addChild(this._child);
  this._mountChild(this._child);
  this.markMounted();
}
```
On mount, the `InheritedElement` inflates its single child widget into an element, adds it to the element tree, and mounts it. No dependency registration happens during mount -- dependencies are established lazily when descendants call `dependOnInheritedWidgetOfExactType`.

**Unmount** (lines 440-448):
```typescript
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
On unmount, the `InheritedElement` first recursively unmounts its child subtree, then clears all dependents. Note that `super.unmount()` (the base `Element.unmount()`) also handles the reverse direction -- each dependent element removes itself from `_inheritedDependencies` during its own unmount.

**Update** (lines 452-474):
```typescript
override update(newWidget: Widget): void {
  const oldWidget = this.inheritedWidget;
  super.update(newWidget);  // swaps this.widget to newWidget
  const newInherited = this.inheritedWidget;

  if (newInherited.updateShouldNotify(oldWidget)) {
    this.notifyDependents();
  }

  // Update child using canUpdate pattern
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
```
The update sequence is:
1. Capture the old widget reference.
2. Call `super.update()` to swap in the new widget.
3. Invoke `updateShouldNotify(oldWidget)` on the *new* widget, passing the *old* widget. If data changed, notify dependents.
4. Reconcile the child subtree (reuse via `canUpdate` or replace).

The ordering matters: dependents are notified *before* the child subtree is reconciled. This means dependent elements are marked dirty first, and during the subsequent build phase, they will rebuild with the new inherited data available.

---

## 3. How `dependOnInheritedWidgetOfExactType` Works

This is the method that descendant elements call to look up and subscribe to an ancestor `InheritedWidget`. It is defined on the base `Element` class (lines 164-177):

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

### Walk-through

1. Start from the calling element's `parent` and walk up the ancestor chain.
2. At each ancestor, compare `ancestor.widget.constructor === widgetType`. This is an **exact type match** using JavaScript constructor identity -- not `instanceof`. This means it will not match subclasses, only the exact class that was passed in.
3. When found, and if the ancestor is an `InheritedElement`:
   - Register the calling element as a dependent via `ancestor.addDependent(this)`.
   - Record the dependency on the calling element via `this._inheritedDependencies.add(ancestor)`.
4. Return the found `InheritedElement`, or `null` if none is found.

### BuildContextImpl Delegation

The `BuildContextImpl` class (lines 952-1025) wraps an `Element` and is passed as the `BuildContext` to widget `build()` methods. It delegates the lookup:

```typescript
dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
  return this.element.dependOnInheritedWidgetOfExactType(widgetType);
}
```

Additionally, `BuildContextImpl` provides a convenience `mediaQuery` getter that internally calls `dependOnInheritedWidgetOfExactType(MediaQuery)`, demonstrating how the lookup is integrated into the context API (lines 970-982).

### The of/maybeOf Pattern

All concrete `InheritedWidget` subclasses follow a consistent static accessor pattern:

```typescript
static maybeOf(context: BuildContext): T | undefined {
  const ctx = context as any;
  if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
    const element = ctx.dependOnInheritedWidgetOfExactType(ThisWidgetClass);
    if (element) {
      const widget = element.widget as ThisWidgetClass;
      return widget.data;
    }
  }
  return undefined;
}

static of(context: BuildContext): T {
  const result = ThisWidgetClass.maybeOf(context);
  if (result === undefined) throw new Error('...');
  return result;
}
```

The `as any` cast is notable -- it is necessary because the `BuildContext` interface defined in `widget.ts` is minimal (just `widget` and `mounted` properties). The `dependOnInheritedWidgetOfExactType` method lives on `BuildContextImpl`, which is the concrete implementation. This is a pragmatic TypeScript workaround for what Dart handles via interface methods on `BuildContext`.

---

## 4. The Notification/Rebuild Cascade When Inherited Data Changes

The complete data flow when an InheritedWidget's data changes:

### Step 1: Parent Rebuilds with New InheritedWidget

A parent `StatefulWidget` calls `setState()`, which triggers `markNeedsRebuild()` on its element. This calls `getBuildScheduler().scheduleBuildFor(this)`, which adds the element to `BuildOwner._dirtyElements` and requests a frame via `FrameScheduler`.

### Step 2: Build Phase Processes Parent

During `BuildOwner.buildScopes()`, dirty elements are sorted by depth (parents first) and rebuilt. The parent's `build()` returns a new `InheritedWidget` instance with updated data. The framework reconciles this via `canUpdate` (same constructor, same key), resulting in `InheritedElement.update(newWidget)` being called.

### Step 3: updateShouldNotify Gate

Inside `InheritedElement.update()`:
```typescript
if (newInherited.updateShouldNotify(oldWidget)) {
  this.notifyDependents();
}
```
The `updateShouldNotify` implementation on the concrete subclass compares old and new data. For example, `Theme.updateShouldNotify` calls `themeDataEquals()` which does a deep field-by-field comparison. Only if data actually changed does notification proceed.

### Step 4: notifyDependents Marks Dependents Dirty

```typescript
notifyDependents(): void {
  for (const dep of this._dependents) {
    dep.markNeedsRebuild();
  }
}
```

Each dependent element's `markNeedsRebuild()` sets `_dirty = true` and calls `getBuildScheduler().scheduleBuildFor(this)`, adding it to the BuildOwner's dirty set. These newly-dirtied elements will be processed in the same build phase (the BuildOwner uses a `while` loop, not a simple `for` loop, to handle cascading dirtying).

### Step 5: Dependents Rebuild

When each dependent element is rebuilt (its `performRebuild()` -> `rebuild()` -> `build(context)` is called), the `build()` method typically calls the `of(context)` static method again, which walks up to find the `InheritedElement` and reads the new data from the new widget. Importantly, calling `dependOnInheritedWidgetOfExactType` during rebuild re-registers the dependency (the `Set` naturally deduplicates).

### Step 6: Cleanup on Unmount

When an element is unmounted (removed from the tree), `Element.unmount()` cleans up:
```typescript
unmount(): void {
  this._mounted = false;
  this._dirty = false;
  for (const dep of this._inheritedDependencies) {
    dep.removeDependent(this);
  }
  this._inheritedDependencies.clear();
}
```
This ensures no stale references remain in the `InheritedElement._dependents` set after an element is removed from the tree.

---

## 5. All Concrete InheritedWidget Subclasses Found

A search for `extends InheritedWidget` across both packages reveals **7 concrete subclasses**:

### 5.1 Theme (`flitter-core`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/theme.ts`
- **Amp ref**: `w3` class
- **Data**: `ThemeData` interface -- 15 color fields (primary, background, surface, text, success, error, warning, info, border, scrollbar, diff colors, selection)
- **updateShouldNotify**: Deep field-by-field `Color.equals()` comparison via `themeDataEquals()`
- **Default factory**: `Theme.defaultTheme()` returns ANSI named colors matching Amp CLI defaults

### 5.2 AppTheme (`flitter-core`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/app-theme.ts`
- **Amp ref**: `h8` class
- **Data**: `AppThemeData` interface -- syntax highlighting config (13 color token types) plus app-level colors (background, foreground, accent, muted, border)
- **updateShouldNotify**: Deep comparison of all syntax highlight + color fields via `appThemeDataEquals()`
- **Coexistence note**: Designed to coexist with `Theme` -- they serve different purposes (base UI colors vs application-specific configuration)

### 5.3 MediaQuery (`flitter-core`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/media-query.ts`
- **Amp ref**: `Q3` (widget), `nA` (data class)
- **Data**: `MediaQueryData` class -- terminal size (width x height) and capabilities (colorDepth, mouseSupport, emojiWidth, kittyGraphics)
- **updateShouldNotify**: Delegates to `MediaQueryData.equals()` which compares all fields
- **Convenience accessors**: `sizeOf(context)`, `capabilitiesOf(context)` provide narrower lookups
- **Special integration**: `BuildContextImpl` has a built-in `mediaQuery` getter that auto-lookups `MediaQuery`

### 5.4 DefaultTextStyle (`flitter-core`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/default-text-style.ts`
- **Data**: `TextStyle` -- cascaded text styling (bold, italic, colors, etc.)
- **updateShouldNotify**: Uses `TextStyle.equals()` for comparison
- **Fallback**: `of(context)` returns `new TextStyle()` (empty/default) when no ancestor is found, rather than throwing

### 5.5 HoverContext (`flitter-core`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/hover-context.ts`
- **Amp ref**: `J_` class
- **Data**: Single `isHovered: boolean` flag
- **updateShouldNotify**: Simple `this.isHovered !== old.isHovered` comparison
- **Fallback**: `of(context)` returns `false` (default: not hovered) when no ancestor found

### 5.6 ForceDim (`flitter-core`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/force-dim.ts`
- **Amp ref**: `ao` (extends `yf` which is InheritedWidget in that context)
- **Data**: Single `forceDim: boolean` flag
- **updateShouldNotify**: Simple `this.forceDim !== oldWidget.forceDim`
- **Usage**: Used to visually dim inactive/unfocused panes
- **Notable**: `shouldForceDim(context)` convenience static returns boolean with `false` fallback

### 5.7 ImagePreviewProvider (`flitter-core`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/image-preview.ts`
- **Data**: `ImagePreviewData` interface -- imageData (Uint8Array), width, height, displayState
- **updateShouldNotify**: Uses `imagePreviewDataEquals()` which compares dimensions, displayState, and imageData by reference equality
- **Usage**: Wraps the Kitty graphics protocol image rendering subsystem

### 5.8 AmpThemeProvider (`flitter-amp`)
- **File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/index.ts`
- **Data**: `AmpTheme` (composite of `AmpBaseTheme` + `AmpAppColors`)
- **updateShouldNotify**: Deep equality via `ampThemeEquals()` -> `ampBaseThemeEquals()` + `ampAppColorsEquals()`, comparing ~40 color fields total
- **Relationship to Theme/AppTheme**: This is an app-layer wrapper that bundles both base theme colors and derived application colors. It is specific to the `flitter-amp` package.

---

## 6. Comparison with Flutter's InheritedWidget

### Similarities

| Aspect | Flutter | flitter-core |
|--------|---------|--------------|
| Base class | `InheritedWidget extends ProxyWidget` | `InheritedWidget extends Widget` |
| Element class | `InheritedElement extends ProxyElement` | `InheritedElement extends Element` |
| updateShouldNotify | `bool updateShouldNotify(covariant InheritedWidget)` | `abstract updateShouldNotify(oldWidget: InheritedWidget): boolean` |
| of/maybeOf pattern | Static methods on subclass | Static methods on subclass |
| Dependency tracking | `Set<Element>` on InheritedElement | `Set<Element>` on InheritedElement |
| Reverse tracking | `_dependencies` on Element | `_inheritedDependencies` on Element |
| Cleanup on unmount | Auto-unsubscribe | Auto-unsubscribe |

### Differences

1. **No `ProxyWidget` intermediate class**: Flutter has `ProxyWidget` (which `InheritedWidget` and `ParentDataWidget` both extend). In flitter-core, `InheritedWidget` directly extends `Widget`. This simplifies the hierarchy but means there is no shared "proxy" abstraction for widgets that merely wrap a child without building.

2. **No `_inheritedWidgets` hash map**: Flutter's framework maintains a `Map<Type, InheritedElement>` (`_inheritedWidgets`) on each element, built up during mount by inheriting from the parent and adding self. This gives O(1) lookup by type. In flitter-core, `dependOnInheritedWidgetOfExactType` performs an **O(d) linear walk** up the parent chain (where d = depth). This is a significant architectural divergence.

3. **No `didChangeDependencies()`**: Flutter calls `State.didChangeDependencies()` when an inherited widget that the state depends on changes. The flitter-core `State` class explicitly documents: "NO didChangeDependencies() -- Amp doesn't have it" (line 151 of widget.ts). Dependents are simply marked dirty and rebuilt.

4. **No `deactivate()`/reactivation cycle**: Flutter elements go through a deactivate phase before unmount, allowing for potential reactivation (e.g., via GlobalKey reparenting). flitter-core goes directly from mounted to unmounted. This simplifies the lifecycle but means inherited dependency cleanup is one-way.

5. **No `InheritedModel` or aspect-based dependencies**: Flutter provides `InheritedModel<T>` for fine-grained dependency tracking where consumers can declare they only care about specific "aspects" of the data. flitter-core has no equivalent -- all dependents are notified equally.

6. **Constructor identity matching vs Type system**: Flutter uses `dependOnInheritedWidgetOfExactType<T>()` with Dart's reified generics. flitter-core uses `widgetType: Function` and compares `widget.constructor === widgetType`. This achieves the same semantics (exact type match, no subclass matching) but is specific to JavaScript's prototype system.

7. **`as any` casts in of/maybeOf**: All concrete subclasses cast `context as any` before calling `dependOnInheritedWidgetOfExactType`. This is because the `BuildContext` interface in widget.ts is deliberately minimal. In Flutter, `BuildContext` directly declares the `dependOnInheritedWidgetOfExactType` method.

---

## 7. Performance Implications and O(n) Characteristics

### Lookup: O(d) per call

Each call to `dependOnInheritedWidgetOfExactType` walks up the parent chain from the calling element to the root. In the worst case this is O(d) where d is the tree depth. Flutter optimizes this to O(1) by maintaining a `_inheritedWidgets` map on each element.

For typical TUI applications with tree depths of 10-30, this is not a practical concern. For deeply nested widget trees with frequent rebuilds that each perform inherited lookups, the difference could become measurable. However, given that the Amp CLI binary (which this project is faithfully reproducing) uses this same linear walk pattern, it is the correct implementation for fidelity.

### Notification: O(k) per InheritedElement update

When `notifyDependents()` is called, it iterates over `_dependents` (size k) and marks each dirty. This is O(k) -- proportional to the number of dependents. Each `markNeedsRebuild()` is O(1) (adding to a Set in BuildOwner). In the worst case, if every element in the tree depends on a single InheritedWidget (e.g., Theme), a theme change triggers O(n) dirty marks.

### Build Phase: O(n log n) for sort + O(n) for rebuild

`BuildOwner.buildScopes()` sorts dirty elements by depth before rebuilding. The sort is O(n log n). Rebuilding each element is O(1) for the rebuild itself, but each rebuild may dirty additional elements (cascading), handled by the while loop.

### Set-based deduplication

Both `_dependents` and `_inheritedDependencies` use `Set`, which means:
- Re-registration during rebuild is naturally deduplicated (O(1) amortized).
- Removal on unmount is O(1) amortized.
- No risk of duplicate notifications.

### Memory: O(n) bidirectional references

Each dependency creates two Set entries (one in the InheritedElement, one in the dependent Element). For m dependencies total across the tree, memory usage is O(m). Cleanup is automatic on unmount.

### updateShouldNotify cost

The deep equality checks in `updateShouldNotify` vary significantly across subclasses:
- `HoverContext`, `ForceDim`: O(1) -- single boolean comparison
- `MediaQuery`: O(1) -- 6 field comparisons
- `Theme`: O(15) -- 15 Color.equals() calls
- `AppTheme`: O(18) -- 13 syntax highlight + 5 color comparisons
- `AmpThemeProvider`: O(~40) -- full base theme + app colors comparison

These are all constant-time with respect to tree size, but the `AmpThemeProvider` equality check is notably more expensive than simpler widgets. The equality check runs on every parent rebuild that produces a new `AmpThemeProvider` widget instance, even if the data has not changed.

---

## 8. Code Patterns and Observations

### Pattern 1: Consistent of/maybeOf with defensive casting

Every single InheritedWidget subclass follows the exact same pattern for `maybeOf`:
```typescript
static maybeOf(context: BuildContext): T | undefined {
  const ctx = context as any;
  if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
    const element = ctx.dependOnInheritedWidgetOfExactType(ThisClass);
    if (element) {
      return (element.widget as ThisClass).someData;
    }
  }
  return undefined;
}
```
The runtime type check (`typeof ctx.dependOnInheritedWidgetOfExactType === 'function'`) provides defensive safety in case the context does not have the method, which could happen if a bare `Element` is passed instead of a `BuildContextImpl`.

### Pattern 2: Immutable data classes with deep equality

All data carried by InheritedWidgets is either immutable (frozen objects, readonly interfaces) or treated as immutable by convention. Each has a corresponding deep equality function. This is essential because `updateShouldNotify` must be able to compare old and new data to decide whether to trigger rebuilds.

### Pattern 3: Default/fallback behavior varies

| Widget | Missing ancestor behavior |
|--------|---------------------------|
| Theme.of | Throws |
| AppTheme.of | Throws |
| MediaQuery.of | Throws |
| AmpThemeProvider.of | Throws |
| ImagePreviewProvider.of | Throws |
| DefaultTextStyle.of | Returns empty `TextStyle()` |
| HoverContext.of | Returns `false` |
| ForceDim.shouldForceDim | Returns `false` |

The widgets with safe defaults (HoverContext, ForceDim, DefaultTextStyle) represent optional ambient data where a sensible default exists. The others (Theme, MediaQuery, etc.) represent required infrastructure that must be provided by the application root.

### Pattern 4: No inherited widget caching (O(1) lookup map)

As noted in the Flutter comparison, the most significant architectural choice is the absence of an `_inheritedWidgets` map. In Flutter, each element inherits a `Map<Type, InheritedElement>` from its parent during mount, and InheritedElements add themselves to this map. This gives O(1) lookup. flitter-core instead walks the parent chain each time, which is O(d).

This is explicitly an Amp fidelity decision -- the Amp binary uses linear walk, and the project's primary directive is to match Amp's architecture exactly, not to optimize.

### Pattern 5: No separate BuildContext class for InheritedElement

In Flutter, `InheritedElement` overrides `_updateInheritance()` to update the inherited map. flitter-core's `InheritedElement` does not override any inheritance-related method -- the dependency registration happens purely through the `dependOnInheritedWidgetOfExactType` linear walk.

### Pattern 6: Reference equality for Uint8Array in ImagePreviewProvider

`imagePreviewDataEquals` uses reference equality (`a.imageData === b.imageData`) for the `Uint8Array` image data rather than byte-by-byte comparison. This is a pragmatic optimization -- image data buffers are typically replaced wholesale, not mutated in-place, so reference equality catches all meaningful changes.

### Observation: Single InheritedElement for all InheritedWidget subclasses

Unlike Flutter where custom InheritedWidgets can optionally override `InheritedElement`, flitter-core uses a single `InheritedElement` class for all InheritedWidget subclasses. The polymorphism is entirely at the widget level (`updateShouldNotify`, data accessors). This simplifies the element layer at the cost of preventing element-level customization (e.g., aspect-based notification filtering).

### Observation: Notification happens before child reconciliation

In `InheritedElement.update()`, `notifyDependents()` is called before the child subtree is reconciled. This is the correct ordering because:
1. Dependents may exist anywhere in the subtree (or in sibling subtrees).
2. The build phase processes elements by depth, so parents rebuild before children.
3. If a dependent is a descendant of this InheritedElement, it will be rebuilt after the child reconciliation completes, ensuring it sees the new data.

### Observation: Two parallel theme hierarchies

The codebase has two separate theme InheritedWidgets:
- `Theme` (flitter-core) -- provides basic UI `ThemeData` (15 colors)
- `AppTheme` (flitter-core) -- provides `AppThemeData` (syntax highlighting + app colors)
- `AmpThemeProvider` (flitter-amp) -- provides the full `AmpTheme` (base + derived app colors)

This layering allows the core framework to provide basic theming while the Amp-specific package adds its richer theme system on top. The `AmpThemeProvider` in particular bundles everything into a single InheritedWidget, which is more efficient than having descendants look up both `Theme` and `AppTheme` separately.
