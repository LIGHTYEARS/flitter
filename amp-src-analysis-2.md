# Analysis 2: Widget Framework Core -- StatelessWidget, StatefulWidget, State Lifecycle

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`
**Related files**:
- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/core/key.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/build-owner.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/widget.test.ts`

---

## 1. Widget Base Class (Amp: `Sf`)

The `Widget` abstract class at lines 38-84 of `widget.ts` serves as the root of the entire widget hierarchy. It is a pure configuration descriptor -- immutable, lightweight, and never directly instantiated (enforced by a `new.target === Widget` runtime check in the constructor). Every widget optionally accepts a `Key` through an options object, stored as a readonly property.

The class provides two critical methods:

### `createElement()` (abstract)
Each concrete widget subclass must produce its corresponding Element. This is the bridge from the declarative widget tree to the imperative element tree that actually manages the lifecycle. The method returns `any` to avoid circular type dependencies with `element.ts` -- a pragmatic TypeScript compromise documented in the file header. The lazy `require()` calls inside each subclass's `createElement()` break the circular dependency at module evaluation time while working fine at runtime.

### `canUpdate(oldWidget, newWidget)` (static + instance)
This method determines whether an existing Element can be reused with a new widget configuration, or whether a fresh Element must be created. The algorithm checks two conditions:

1. **Same constructor** (equivalent to Dart's `runtimeType` comparison): `oldWidget.constructor !== newWidget.constructor`
2. **Matching keys**: Both undefined (the common case for keyless widgets), or both present and equal via `Key.equals()`

The dual static+instance form (`Widget.canUpdate(a, b)` and `a.canUpdate(b)`) exists because Amp provides an instance-level method on `Sf`, while Flutter uses a static method. Flitter provides both for compatibility. This method is the linchpin of the reconciliation algorithm -- it is called repeatedly in `StatelessElement.rebuild()`, `StatefulElement.rebuild()`, `SingleChildRenderObjectElement.update()`, and the three-phase `updateChildren()` algorithm in `MultiChildRenderObjectElement`.

---

## 2. StatelessWidget (Amp: `H3`)

`StatelessWidget` (lines 96-110) is the simplest concrete widget type. It extends `Widget`, overrides `createElement()` to return a `StatelessElement` (Amp: `lU0`), and declares a single abstract method: `build(context: BuildContext): Widget`.

A StatelessWidget has no mutable state. Every time the parent rebuilds and provides a new widget configuration (or when the element is first mounted), `build()` is called with a `BuildContext` to produce the child widget tree. The `BuildContext` is actually a `BuildContextImpl` instance (Amp: `jd`) that wraps the element, providing ancestor queries, inherited widget lookups, and a `mediaQuery` shortcut.

The `StatelessElement` lifecycle is straightforward:
- **mount()**: Creates a `BuildContextImpl`, calls `rebuild()`, then `markMounted()`
- **rebuild()**: Calls `widget.build(context)`, then reconciles the resulting child widget via `canUpdate()` -- either updating the existing child element in-place or tearing it down and inflating a new one
- **update(newWidget)**: Swaps the widget reference and triggers a `rebuild()`
- **unmount()**: Recursively unmounts the child and clears references

---

## 3. StatefulWidget (Amp: `H8`)

`StatefulWidget` (lines 122-135) adds mutable state to the picture. Like `StatelessWidget`, it extends `Widget` and overrides `createElement()` -- but this time returning a `StatefulElement` (Amp: `V_0`). The key abstract method is `createState(): State<StatefulWidget>`, which produces the `State` object that holds mutable data and implements `build()`.

The `StatefulElement` lifecycle is more involved:
- **mount()**: Creates `BuildContextImpl`, calls `widget.createState()` to produce the State, calls `state._mount(widget, context)` which triggers `initState()`, then calls `rebuild()`, then `markMounted()`
- **rebuild()**: Calls `state.build(context)` instead of `widget.build(context)`, then reconciles the child
- **update(newWidget)**: Swaps widget, calls `state._update(newWidget)` which triggers `didUpdateWidget(oldWidget)`, then rebuilds
- **unmount()**: Unmounts child, calls `state._unmount()` which triggers `dispose()`

The critical distinction from `StatelessWidget` is that the `State` object persists across widget updates. When a parent rebuilds and provides a new `StatefulWidget` of the same type (passing the `canUpdate()` check), the existing Element and its State are reused -- only `didUpdateWidget()` is called, not `createState()`.

---

## 4. State Lifecycle (Amp: `_8`)

The `State<T>` class (lines 157-271) is the heart of mutable state management. It maintains three private fields:
- `_widget?: T` -- the current widget configuration
- `_element?: ElementLike` -- the element (used for `markNeedsBuild` delegation)
- `_mounted: boolean` -- lifecycle flag

### Lifecycle Methods (in order of invocation)

1. **`_mount(widget, context)`** (framework-internal): Sets `_widget`, `_element`, and `_mounted = true`, then calls `initState()`. This is invoked exactly once during `StatefulElement.mount()`.

2. **`initState()`** (user-overridable): Called once after creation. This is where one-time initialization happens -- subscribing to streams, starting animations, fetching data. The default implementation is a no-op.

3. **`build(context): Widget`** (abstract, user-implemented): Called by `StatefulElement.rebuild()` to produce the child widget subtree. This is the render function. It may be called many times over the State's lifetime.

4. **`_update(newWidget)`** (framework-internal): Called during `StatefulElement.update()`. Saves the old widget, swaps in the new one, then calls `didUpdateWidget(oldWidget)`.

5. **`didUpdateWidget(oldWidget)`** (user-overridable): Called when the parent provides a new widget configuration of the same runtime type. Enables comparing old and new configurations. Default is a no-op.

6. **`setState(fn?)`** (user-callable): The primary mechanism for triggering rebuilds. Optionally executes a synchronous callback to mutate state, then calls `_markNeedsBuild()` which delegates to `element.markNeedsBuild()`. Throws if called after `dispose()` (i.e., when `_mounted` is false). The optional callback pattern is identical to Flutter's `setState(() { ... })`.

7. **`_unmount()`** (framework-internal): Sets `_mounted = false`, then calls `dispose()`. Invoked during `StatefulElement.unmount()`.

8. **`dispose()`** (user-overridable): Called once when the State is permanently removed. This is where cleanup happens -- canceling subscriptions, disposing controllers. Default is a no-op.

### Deliberate Omissions from Flutter

The State class deliberately omits several Flutter lifecycle methods:
- **No `didChangeDependencies()`**: Amp does not have this hook. In Flutter, this fires when an InheritedWidget dependency changes. In Flitter, dependents simply get `markNeedsRebuild()` called directly via `InheritedElement.notifyDependents()`.
- **No `deactivate()`**: Amp elements go directly from mounted to unmounted. There is no intermediate "deactivated" state and no global key reparenting across frames.
- **No `reassemble()`**: No hot reload support in a TUI context.

---

## 5. The setState Chain

The `setState()` call triggers a well-defined chain that ultimately results in a frame being scheduled and the element being rebuilt:

1. `State.setState(fn)` -- executes callback, calls `_markNeedsBuild()`
2. `_markNeedsBuild()` -- delegates to `element.markNeedsBuild()`
3. `Element.markNeedsBuild()` (alias) -> `Element.markNeedsRebuild()`
4. `Element.markNeedsRebuild()` -- sets `_dirty = true`, calls `getBuildScheduler().scheduleBuildFor(this)`
5. `BuildOwner.scheduleBuildFor(element)` -- adds to dirty `Set`, calls `FrameScheduler.instance.requestFrame()`
6. On next frame: `BuildOwner.buildScope()` -- sorts dirty elements by depth, calls `element.performRebuild()` on each
7. `StatefulElement.performRebuild()` -> `rebuild()` -> `state.build(context)` -- produces new widget tree, reconciles child

This chain exactly matches the Amp reference: `_8.setState` -> `_8._markNeedsBuild` -> `V_0.markNeedsBuild` -> `T$.markNeedsRebuild` -> `XG8().scheduleBuildFor` -> `NB0.scheduleBuildFor` + `c9.requestFrame`. The `BuildOwner` uses a `Set` for deduplication (not a list), and its `buildScope()` uses a `while` loop to handle cascading dirtying where rebuilding one element may dirty another.

---

## 6. Key Mechanism

The key system (`/home/gem/workspace/flitter/packages/flitter-core/src/core/key.ts`) provides three key types:

- **`ValueKey<T>`**: Value-based equality. Two `ValueKey("foo")` instances are equal. Used for list items with stable identifiers.
- **`UniqueKey`**: Identity-based equality. Every instance is unique. Used to force element recreation.
- **`GlobalKey`**: Currently a placeholder that behaves like `UniqueKey` with a separate ID sequence. Intended for cross-tree access to State and BuildContext (not yet implemented).

Keys participate in reconciliation through `Widget.canUpdate()`. When keys are present, both widgets must have keys and those keys must be equal (via `Key.equals()`). When both widgets lack keys, only the runtime type is compared. This asymmetry -- one keyed and one unkeyed always returns `false` -- prevents subtle bugs where a keyed widget might accidentally reuse a keyless element's state.

In the `MultiChildRenderObjectElement.updateChildren()` three-phase algorithm, keys enable O(1) lookup of reusable elements via a `Map<string, Element>` built from the old keyed children. Non-keyed children fall back to linear scanning.

---

## 7. BuildContext (Amp: `jd`)

`BuildContext` is defined as an interface in `widget.ts` (lines 21-26) with minimal properties: `widget`, `mounted`, and an optional `mediaQuery`. The concrete implementation, `BuildContextImpl` in `element.ts` (lines 952-1025), wraps an Element and provides:

- **`dependOnInheritedWidgetOfExactType()`**: Walks the ancestor chain to find an `InheritedElement` of the specified widget type, registers as a dependent, and returns it. This is how widgets subscribe to inherited data changes.
- **`findAncestorElementOfType()` / `findAncestorWidgetOfType()`**: Unregistered ancestor queries for non-reactive lookups.
- **`findAncestorStateOfType()`**: Walks ancestors to find a `StatefulElement` whose state is an instance of the given type. Enables patterns like `Navigator.of(context)`.
- **`markNeedsBuild()` / `markNeedsRebuild()`**: Proxied to the underlying element, enabling the `setState` chain described above.
- **`mediaQuery`**: Convenience getter that does a `dependOnInheritedWidgetOfExactType(MediaQuery)` lookup, lazily imported to avoid hard dependency on the widgets layer.

In Amp, `jd` is a concrete class separate from elements. Flitter follows this pattern -- `BuildContextImpl` is not the Element itself but wraps it, maintaining the separation of concerns between the context API and the internal element machinery.

---

## 8. InheritedWidget (Amp: `Bt`)

`InheritedWidget` (lines 284-303) is the third major widget type. It wraps a single `child` widget and propagates data down the tree. The abstract method `updateShouldNotify(oldWidget: InheritedWidget): boolean` determines whether dependents should be rebuilt when this widget is replaced with a new configuration.

The corresponding `InheritedElement` (Amp: `Z_0`) maintains a `Set<Element>` of dependents. During `update()`, it:
1. Saves the old widget
2. Swaps to the new widget
3. Calls `updateShouldNotify(oldWidget)` -- if true, calls `notifyDependents()`
4. Reconciles the child via `canUpdate()`

`notifyDependents()` simply iterates the dependent set and calls `markNeedsRebuild()` on each, triggering the standard rebuild chain. During `Element.unmount()`, all inherited dependencies are cleaned up by calling `removeDependent()` on each tracked `InheritedElement`.

---

## 9. Comparison to Flutter

Flitter's widget framework is a faithful reproduction of Flutter's core architecture adapted for a TUI environment, with these key differences:

| Aspect | Flutter | Flitter (Amp) |
|--------|---------|---------------|
| `deactivate()` | Present, enables GlobalKey reparenting | Absent -- elements go directly to unmounted |
| `didChangeDependencies()` | Called when inherited deps change | Absent -- dependents get `markNeedsRebuild()` directly |
| `reassemble()` | Hot reload support | Absent -- no hot reload in TUI |
| `BuildContext` | Interface implemented by Element | Separate concrete class (`BuildContextImpl` / `jd`) wrapping Element |
| `canUpdate()` | Static method only | Both static and instance methods |
| Runtime type check | `runtimeType` property | `constructor` identity comparison |
| Key equality | `operator ==` | `Key.equals()` method |
| Dirty set | List with manual dedup | `Set` with automatic dedup |

The overall architecture -- immutable widgets as configuration, elements as the persistent tree managing lifecycle, State as the mutable companion to StatefulWidget, and the `canUpdate()` reconciliation predicate -- is preserved with high fidelity. The simplifications (no deactivate, no didChangeDependencies) reflect Amp's streamlined TUI requirements where global key reparenting and fine-grained dependency tracking are unnecessary overhead.

---

## 10. Summary

The widget framework in `widget.ts` establishes a clean three-tier hierarchy:

- **Widget** (immutable configuration) -> **Element** (persistent lifecycle manager) -> **RenderObject** (layout and paint)

`StatelessWidget` provides the simplest path: `build()` returns a widget tree, and the framework handles reconciliation. `StatefulWidget` adds a persistent `State` object with a well-defined lifecycle (`initState` -> `build` -> `didUpdateWidget` -> `dispose`) and the `setState()` trigger for reactive rebuilds. `InheritedWidget` enables efficient data propagation with selective rebuild notification. Together, these three widget types and their corresponding elements form a complete reactive UI framework that, despite targeting a terminal rather than a GPU canvas, faithfully reproduces the architecture of the Amp CLI's TUI rendering system.
