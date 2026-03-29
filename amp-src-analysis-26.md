# Analysis 26: Element Tree and Reconciliation Algorithm

## Source File

`/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts` (1025 lines)

Supporting files:
- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts` (Widget, State, BuildContext interfaces)
- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts` (global build scheduler wiring)
- `/home/gem/workspace/flitter/packages/flitter-core/.reference/element-tree.md` (Amp reverse-engineered reference)

## Overview

The element tree is the central runtime structure that bridges the declarative widget descriptions and the imperative render object tree. Every widget in the tree has a corresponding element that holds a reference to the current widget configuration, manages its lifecycle (mount, update, unmount), participates in the rebuild scheduling pipeline, and for render object elements, owns the actual render object that performs layout and paint. The file implements 10 classes: `Element` (base), `StatelessElement`, `StatefulElement`, `InheritedElement`, `RenderObjectElement`, `SingleChildRenderObjectElement`, `MultiChildRenderObjectElement`, `LeafRenderObjectElement`, `BuildContextImpl`, and the `BuildOwner` interface.

## Element Base Class (Amp: T$)

The `Element` class (lines 38-206) carries the fields that define every node in the element tree:

- **`widget`**: The current `Widget` configuration object.
- **`parent`**: Parent element reference, `undefined` for the root.
- **`_children`**: Array of child elements managed via `addChild`/`removeChild`.
- **`_inheritedDependencies`**: A `Set<InheritedElement>` tracking which inherited widgets this element depends on. When the element unmounts, it unsubscribes from all of them.
- **`_dirty`**: Boolean flag for rebuild scheduling.
- **`_cachedDepth`**: Lazily computed tree depth, walked up the parent chain and cached. Invalidated recursively on reparent via `_invalidateDepth()`.
- **`_mounted`**: Lifecycle flag.

Key lifecycle methods on the base:

**`markMounted()`** (line 122): Sets `_mounted = true`. The Amp reference also registers GlobalKey elements here, but that is noted as deferred.

**`unmount()`** (line 130): Sets `_mounted = false`, clears the dirty flag and cached depth, then iterates over `_inheritedDependencies` calling `removeDependent(this)` on each inherited element before clearing the set. This ensures no stale subscriptions survive.

**`markNeedsRebuild()`** (line 143): The entry point for the dirty-marking chain. If the element is not mounted, it returns immediately (guard). Otherwise it sets `_dirty = true` and then calls `getBuildScheduler().scheduleBuildFor(this)` via a dynamic `require('./binding')` to avoid circular import issues. In the Amp original this is `XG8().scheduleBuildFor(this)`, which adds the element to BuildOwner's dirty set and requests a frame from the FrameScheduler.

**`update(newWidget)`** (line 91): Simply swaps the `widget` field. Subclasses override to do more.

**`dependOnInheritedWidgetOfExactType(widgetType)`** (line 164): Walks up the parent chain looking for an ancestor whose `widget.constructor === widgetType`. When found, registers a bidirectional dependency: the InheritedElement adds this element as a dependent, and this element adds the InheritedElement to `_inheritedDependencies`. Returns the found `InheritedElement` or null.

**`performRebuild()`** (line 160): A no-op on the base class, overridden by component elements.

A critical design note from the Amp reference: there is **no `deactivate()` phase**. Elements transition directly from mounted to unmounted, unlike Flutter which has a mounted -> inactive -> unmounted lifecycle. This simplification eliminates the inactive elements list and the deactivation step in BuildOwner.

## The canUpdate Predicate

Defined on `Widget` (widget.ts lines 65-78), `canUpdate` determines whether an existing element can be reused with a new widget configuration, or whether the old subtree must be torn down and a new one inflated. Two conditions must hold:

1. **Same constructor** (equivalent to same `runtimeType` in Dart).
2. **Matching keys**: Both `undefined` (unkeyed widgets always match same-type widgets), or both present and `key.equals(otherKey)` returns true.

This predicate is the gatekeeper for the entire reconciliation algorithm. When `canUpdate` returns true, the element's `update()` method is called to push the new widget configuration down. When it returns false, the old element is unmounted and a new element is created via `newWidget.createElement()`.

## StatelessElement (Amp: lU0)

`StatelessElement` (lines 212-301) is the element for `StatelessWidget`. It holds a single `_child` element and a `BuildContextImpl` (`_context`).

**`mount()`**: Creates the `BuildContextImpl`, calls `rebuild()`, then `markMounted()`. The build happens before marking as mounted.

**`rebuild()`** (line 263): Calls `this.statelessWidget.build(this._context)` to get a new widget. Then applies the updateChild logic:
- If there is an existing child and `canUpdate` passes, calls `child.update(newWidget)` (element reuse).
- If `canUpdate` fails, unmounts the old child, creates a new element via `newWidget.createElement()`, adds it as a child, and mounts it.
- If there is no existing child, inflates a new element from the build result.
- An identity shortcut (`this._child.widget === newWidget`) skips the update entirely.
- A self-referential build shortcut (`newWidget === this.widget`) handles leaf StatelessWidgets that return themselves from `build()`.

**`update(newWidget)`**: Identity check (`this.widget === newWidget`) to skip unnecessary work. Otherwise swaps the widget, updates the context's widget reference, and calls `rebuild()`.

The `renderObject` getter delegates to the child element's render object, since component elements are transparent wrappers that do not own render objects themselves.

## StatefulElement (Amp: V_0)

`StatefulElement` (lines 307-405) mirrors `StatelessElement` but adds state management:

**`mount()`**: Creates the `BuildContextImpl`, calls `createState()` on the `StatefulWidget` to obtain the `State` object, calls `state._mount(widget, context)` which sets the state's widget/context references and calls `initState()`, then `rebuild()`, then `markMounted()`.

**`rebuild()`** (line 375): Identical structure to StatelessElement's rebuild, except it calls `this._state.build(this._context)` instead of `this.statelessWidget.build(this._context)`.

**`update(newWidget)`** (line 357): After the identity check and widget swap, calls `state._update(this.statefulWidget)` which saves the old widget and calls `didUpdateWidget(oldWidget)`, then updates the context widget reference and calls `rebuild()`.

**`unmount()`**: Unmounts the child, then calls `state._unmount()` which sets `mounted = false` and calls `dispose()`, then clears all references.

**`markNeedsBuild()`**: Aliases to `markNeedsRebuild()`. This is the method that `State.setState()` ultimately calls through the chain: `setState(fn)` -> `_markNeedsBuild()` -> `element.markNeedsBuild()` -> `markNeedsRebuild()` -> `BuildOwner.scheduleBuildFor()` -> `FrameScheduler.requestFrame()`.

## InheritedElement (Amp: Z_0)

`InheritedElement` (lines 411-498) implements the data propagation mechanism. It holds:

- **`_child`**: The single child element (inflated from `InheritedWidget.child`).
- **`_dependents`**: A `Set<Element>` of all elements that have called `dependOnInheritedWidgetOfExactType` and matched this inherited element.

**`mount()`**: Inflates the child from `inheritedWidget.child.createElement()`, adds and mounts it.

**`update(newWidget)`** (line 452): The update sequence is critical:
1. Captures `oldWidget` before `super.update(newWidget)` swaps it.
2. Calls `updateShouldNotify(oldWidget)` on the new inherited widget. If true, calls `notifyDependents()`.
3. Updates the child subtree using the standard `canUpdate` pattern.

**`notifyDependents()`** (line 485): Iterates over the `_dependents` set and calls `markNeedsRebuild()` on each. This is how changes to theme data, media queries, or any inherited data propagate to consumers without explicit wiring.

**`addDependent(element)` / `removeDependent(element)`**: Manage the dependents set. The remove is called during element unmount (from the base class's `_inheritedDependencies` cleanup loop).

## RenderObjectElement (Amp: oj)

`RenderObjectElement` (lines 507-558) is the base for elements that own render objects. Key differences from component elements:

**`mount()`**: Calls `widget.createRenderObject()` to create the render object, then `renderObject.attach()`, then `markMounted()`. The render object is the real layout/paint node.

**`update(newWidget)`**: Swaps the widget, then calls `widget.updateRenderObject(this._renderObject)` to push new configuration to the existing render object without recreating it.

**`unmount()`**: Calls `renderObject.detach()` and `renderObject.dispose()`, then clears the reference and calls `super.unmount()`.

**`performRebuild()`**: No-op. Render object elements do not call `build()` -- their configuration comes from `updateRenderObject()` during `update()`.

## SingleChildRenderObjectElement (Amp: uv)

`SingleChildRenderObjectElement` (lines 564-667) extends `RenderObjectElement` and manages a single child element. Its `update()` method (line 611) implements the **four-case updateChild logic** inline:

| Old Child | New Widget | Action |
|-----------|-----------|--------|
| null | null | No-op |
| null | widget | `createElement()` + `mount()` (inflate) |
| child | null | `unmount()` + `removeChild()` (remove) |
| child | widget | `canUpdate()` ? `update()` : unmount old + inflate new |

When replacing a child, the render object hierarchy must also be updated: `removeAllChildren()` on the parent render object, then `adoptChild()` or setting the `child` setter for the new render object. The implementation checks for both a `child` setter (used by `RenderCenter`, `RenderPadding`, etc.) and falls back to `adoptChild()`.

## MultiChildRenderObjectElement and the Three-Phase updateChildren Algorithm (Amp: rJ)

`MultiChildRenderObjectElement` (lines 674-926) is the most algorithmically complex element type. It manages an array of child elements (`_childElements`) and uses the `updateChildren()` method for O(N) reconciliation.

### The Three-Phase Algorithm (line 742)

The algorithm takes `oldElements` (the current child elements) and `newWidgets` (the new widget list from the rebuilt parent) and produces a new list of elements with minimal create/destroy operations.

**Phase 1 -- Top-down scan** (lines 751-761): Walks forward from the start of both lists while `canUpdate` holds between the old element's widget and the new widget. For each match, calls `update()` if the widgets are not identity-equal. Pushes matched elements to the result. Stops at the first mismatch.

**Phase 2 -- Bottom-up scan** (lines 765-776): Walks backward from the end of both lists with the same `canUpdate` logic. Matched elements are collected in `bottomResult` (prepended via `unshift` to maintain order). This phase narrows the "middle" region that needs more expensive reconciliation.

**Phase 3 -- Middle reconciliation** (lines 778-873): Three sub-cases:

1. **All old consumed** (`oldStart > oldEnd`): The remaining new widgets are pure insertions. Each is inflated via `createChildElement()`.

2. **All new consumed** (`newStart > newEnd`): The remaining old elements are pure removals. Each is unmounted via `deactivateChild()`.

3. **Both sides have remaining elements**: This is where key-based matching happens.
   - Builds two maps from the remaining old elements: `oldKeyedChildren` (key string -> Element) and `oldKeyedIndices` (key string -> index).
   - For each remaining new widget:
     - **Keyed path**: Looks up the key in `oldKeyedChildren`. If found, marks the old slot as consumed (`oldElements[oldIdx] = null`), then applies `canUpdate`/`update` or replaces. If not found, creates a new element.
     - **Non-keyed path**: Does a linear scan through remaining old elements looking for an unkeyed element whose widget is identity-equal or `canUpdate`-compatible. If found, marks consumed and updates. If not found, creates new.
   - After processing all new widgets, deactivates any remaining unconsumed old elements.

Finally, merges the three regions: `result` (top matches + middle results) + `bottomResult` (bottom matches), and assigns to `_childElements`.

### Render Object Wiring

`createChildElement()` (line 880) inflates the widget, adds the element to the tree, mounts it, and then wires the render object to the parent via `insert()` (for `ContainerRenderBox` which manages a children list) or `adoptChild()`. After insertion, `_reapplyParentData()` is called because `setupParentData()` (triggered by `adoptChild`/`insert`) may create a fresh `ParentData` instance that overwrites values previously set by `ParentDataElement._applyParentData()` during mount. This re-application restores flex/fit values.

`deactivateChild()` (line 897) simply calls `unmount()` and `removeChild()`.

## LeafRenderObjectElement (Amp: O$)

`LeafRenderObjectElement` (lines 932-942) is a trivial subclass of `RenderObjectElement` with no children. Its `performRebuild()` is a no-op. Used by terminal-level widgets like `RichText` that paint directly without child elements.

## BuildContextImpl (Amp: jd)

`BuildContextImpl` (lines 952-1025) is the concrete `BuildContext` implementation passed to `build()` methods. In the Amp original, `jd` is a separate class from `Element` (unlike Flutter where `Element` implements `BuildContext` directly). It stores:

- **`element`**: The backing `Element`.
- **`widget`**: The current widget (mutable, updated on rebuild).

Key methods delegate to the element:
- **`dependOnInheritedWidgetOfExactType(widgetType)`**: Delegates to `element.dependOnInheritedWidgetOfExactType()`.
- **`findAncestorStateOfType(stateType)`**: Walks up the parent chain looking for a `StatefulElement` whose state is an instance of the given type.
- **`mediaQuery`**: Convenience getter that uses `dependOnInheritedWidgetOfExactType(MediaQuery)` to look up the nearest `MediaQuery` inherited widget and return its `data`.
- **`markNeedsBuild()` / `markNeedsRebuild()`**: Delegates to the element, enabling `State._markNeedsBuild()` to trigger rebuilds through the context.

## How Elements Bridge Widgets and Render Objects

The element tree serves as the mutable, long-lived intermediary between the immutable widget tree (rebuilt frequently) and the render object tree (mutated in-place):

1. **Widget -> Element**: `Widget.createElement()` creates the corresponding element type. Each widget class maps to a specific element: `StatelessWidget` -> `StatelessElement`, `StatefulWidget` -> `StatefulElement`, `SingleChildRenderObjectWidget` -> `SingleChildRenderObjectElement`, etc.

2. **Element -> Render Object**: Only `RenderObjectElement` and its subclasses create render objects. Component elements (`StatelessElement`, `StatefulElement`, `InheritedElement`) are transparent -- their `renderObject` getter delegates to their child. This means the render object tree is a "flattened" view of the element tree, containing only the actual layout/paint nodes.

3. **Reconciliation flow**: When `setState()` or external data changes trigger a rebuild, the element is marked dirty, BuildOwner collects it, and on the next frame calls `performRebuild()`. The rebuild produces a new widget via `build()`, and the element decides via `canUpdate` whether to reuse or replace the child element. If reused, `update()` propagates the new widget configuration down, eventually reaching a `RenderObjectElement` that calls `updateRenderObject()` to push new properties to the render object. If replaced, the old subtree is unmounted (render objects detached/disposed) and a new subtree is inflated.

## Reconciliation Flow Summary

```
setState(fn)
  -> State._markNeedsBuild()
    -> Element.markNeedsBuild()
      -> Element.markNeedsRebuild()
        -> _dirty = true
        -> getBuildScheduler().scheduleBuildFor(this)
          -> BuildOwner adds to _dirtyElements Set
          -> FrameScheduler.requestFrame()

[Next frame - build phase]
  -> BuildOwner.buildScopes()
    -> Sort dirty elements by depth (parents first)
    -> For each: element.performRebuild()
      -> StatelessElement/StatefulElement.rebuild()
        -> newWidget = build(context)
        -> canUpdate(oldChild.widget, newWidget)?
          -> YES: child.update(newWidget) -- reuse element, recurse
          -> NO:  child.unmount() + newWidget.createElement() + mount()

[Next frame - layout phase]
  -> PipelineOwner.flushLayout()

[Next frame - paint phase]
  -> paint()

[Next frame - render phase]
  -> render() -- flush to terminal screen buffer
```

## Key Deviations from Flutter

1. **No deactivate/activate lifecycle**: Elements go directly from mounted to unmounted. There is no inactive elements list.
2. **BuildContext is a separate class** (`BuildContextImpl` / Amp's `jd`), not the element itself implementing the interface.
3. **No `inflateWidget()` named method**: `widget.createElement()` is called directly at each use site.
4. **Depth is lazily computed and cached**, walked up the parent chain on demand rather than maintained incrementally.
5. **BuildOwner uses a `Set`** for dirty elements rather than a list, providing automatic deduplication.
6. **Non-keyed fallback in `updateChildren`** does a linear scan for compatible elements, not just position-based matching.
