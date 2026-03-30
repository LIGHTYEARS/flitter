# Gap R08: LayoutBuilder Widget -- Providing Parent Constraints to the Build Function

## Status: Detailed Implementation Proposal
## Affected packages: `flitter-core`
## Priority: High (blocks responsive layout patterns)

---

## 1. Problem Statement

### 1.1 What Is Missing

Flitter has an initial `LayoutBuilder` implementation in
`packages/flitter-core/src/widgets/builder.ts` (lines 49-177), but it suffers
from a **fundamental architectural flaw**: the builder callback is invoked during
`performLayout()` on the render object, but its result (a Widget) is never fed
back into the element tree synchronously. The current three-layer architecture
uses `StatefulWidget` + `_LayoutBuilderDelegate` + `RenderLayoutBuilder`, where
the callback merely stores constraints in `LayoutBuilderState._constraints`.
The widget tree produced by the user's builder callback is only materialized
during the normal `build()` phase, at which point the constraints from the
*previous* layout pass (or the default unconstrained `new BoxConstraints()`) are
used. On the very first frame, the builder always receives the default
unconstrained `BoxConstraints()` rather than the actual parent constraints.

In Flutter's architecture, `LayoutBuilder` is a special widget that bridges the
**layout phase** (render tree) with the **build phase** (widget/element tree).
Its render object calls the builder callback during `performLayout()`, receives
a widget subtree, and then inflates or updates that subtree *in the middle of
the layout pass* before laying out the resulting child render object. This
creates a unique cross-phase dependency that requires careful element/render
object coordination.

### 1.2 Why It Matters

Without a correct LayoutBuilder, developers cannot:

1. **Build responsive layouts** -- A TUI application that adapts its widget tree
   based on the actual terminal width/height available to a particular subtree
   (not just the root terminal size from MediaQuery). For example, a sidebar that
   collapses to icons when there is not enough horizontal space after flex
   allocation.

2. **Implement adaptive content** -- Showing or hiding columns in a table,
   switching between compact and expanded views, or adjusting content density
   based on the space actually available after padding, flex allocation, and
   other ancestor layout decisions.

3. **Debug constraint propagation** -- Inspecting the actual constraints
   arriving at a point in the tree, which is invaluable for diagnosing layout
   issues. Wrapping a subtree in `LayoutBuilder` and logging constraints is a
   common Flutter debugging technique.

4. **Implement container queries** -- The CSS/web equivalent of container
   queries, where a component adapts based on its container's size rather than
   the viewport size. MediaQuery gives you the terminal viewport size, but
   LayoutBuilder gives you the *available* size at any point in the tree.

5. **Build reusable responsive widgets** -- Components like responsive grids,
   adaptive navigation panels, and auto-collapsing toolbars all depend on
   knowing their parent's constraints at build time.

### 1.3 Analysis of the Current Broken Implementation

The existing code in `builder.ts` uses a three-layer architecture:

```
LayoutBuilder (StatefulWidget)
  --> LayoutBuilderState
       --> _LayoutBuilderDelegate (SingleChildRenderObjectWidget)
            --> RenderLayoutBuilder (RenderBox)
```

**Critical Problem 1: Stale constraints on first frame.**
`LayoutBuilderState._constraints` is initialized to `new BoxConstraints()` (fully
unconstrained). The `build()` method produces `_LayoutBuilderDelegate`, which
creates a `RenderLayoutBuilder`. During the first `performLayout()`, the callback
updates `_constraints`, but `LayoutBuilderState.build()` has already run and
produced `_LayoutBuilderDelegate` with no child (the user's builder result is
not used by `_LayoutBuilderDelegate`). The widget tree from the user's builder
is never inflated into the element tree.

**Critical Problem 2: No synchronous rebuild path.**
`LayoutBuilderState.updateConstraints()` does not call `setState()`, so the
state never triggers a rebuild. Even if it did, `setState()` schedules an
*asynchronous* rebuild for the next frame, creating a one-frame-behind
constraint lag and potential infinite layout loops (layout -> setState ->
rebuild -> layout -> setState -> ...).

**Critical Problem 3: _LayoutBuilderDelegate has no child.**
The `_LayoutBuilderDelegate` extends `SingleChildRenderObjectWidget` but its
constructor passes no `child` to `super()`. The `RenderLayoutBuilder._child` is
always `null`, so the render object always sizes to `constraints.constrain(Size.zero)`.
The user's builder callback result is effectively discarded.

**Net result: LayoutBuilder currently renders nothing and provides stale
constraints.** Any usage of LayoutBuilder in the current codebase will produce
a zero-sized, invisible widget.

---

## 2. Flutter's LayoutBuilder Architecture

### 2.1 How Flutter Solves This

In Flutter, `LayoutBuilder` uses a dedicated element class
(`_LayoutBuilderElement`) that extends `RenderObjectElement`. The key insight is
that the **element** has a special `_rebuildChild()` method that the render
object calls during `performLayout()`. This method performs a *synchronous*
element rebuild within the layout pass.

The complete data flow:

```
Parent.performLayout()
  |
  v
RenderConstrainedLayoutBuilder.performLayout()
  |
  +-- 1. Check if constraints changed (or forced via markNeedsBuild)
  |
  +-- 2. If rebuild needed: invoke _callback(constraints)
  |      |
  |      v
  |   _LayoutBuilderElement._layout(constraints)
  |      |
  |      +-- Calls widget.builder(context, constraints) -> Widget
  |      |
  |      +-- Calls updateChild(_child, newWidget, slot)
  |      |     |
  |      |     +-- Element.updateChild: inflate, update, or remove
  |      |
  |      +-- Child element + render object now exist in the tree
  |
  +-- 3. Layout the child render object: child.layout(constraints)
  |
  +-- 4. Size self: size = constraints.constrain(child.size)
```

### 2.2 The Critical Element-RenderObject Bridge

Flutter's `_LayoutBuilderElement` extends `RenderObjectElement`. It overrides
`mount()` and `update()` to wire a callback from the render object back to the
element. The render object holds a closure reference to the element's rebuild
method, creating a tight coupling:

```
_LayoutBuilderElement (RenderObjectElement)
   |
   +-- owns child Element (inflated from builder result)
   +-- owns _child Widget (from builder callback)
   |
   +-- owns RenderConstrainedLayoutBuilder (render object)
         |
         +-- holds _callback -> element._layout
         +-- performLayout() invokes _callback when constraints change
         +-- then layouts child render object normally
```

### 2.3 Key Differences from Normal RenderObjectWidgets

A normal `SingleChildRenderObjectWidget` receives its child as a constructor
parameter. The child is known at build time. With LayoutBuilder:

- The child widget is NOT known at build time.
- The child widget is produced by the builder callback during LAYOUT.
- The element must be able to inflate/update its child subtree during layout.
- The element must wire the child's render object into the parent render object
  synchronously during layout.

This is why LayoutBuilder cannot be implemented as a StatefulWidget.

---

## 3. Proposed Implementation for Flitter

### 3.1 Architecture Overview

The proposed architecture replaces the current three-layer design with a
clean two-layer structure matching Flutter:

```
LayoutBuilder (extends RenderObjectWidget)
   |
   +-- createElement() -> LayoutBuilderElement
   +-- createRenderObject() -> RenderLayoutBuilder
```

```
LayoutBuilderElement (extends RenderObjectElement)
   |
   +-- _childElement: Element | undefined      (from builder result)
   +-- _context: BuildContextImpl              (for builder callback)
   |
   +-- mount(): creates render object, wires callback
   +-- update(): re-wires callback, marks layout dirty
   +-- unmount(): cleans up child and callback
   +-- _rebuildChild(constraints): synchronously calls builder, updates child
   +-- _updateChild(widget): inflate/update child element
   +-- _wireChildRenderObject(): connect child render object to parent
```

```
RenderLayoutBuilder (extends RenderBox)
   |
   +-- _callback: ((constraints) => void) | null
   +-- _child: RenderBox | null
   +-- _previousConstraints: BoxConstraints | null
   +-- _needsCallbackInvocation: boolean
   |
   +-- performLayout(): invokes callback if needed, then layouts child
   +-- paint(): delegates to child
```

### 3.2 LayoutBuilder Widget

```typescript
// File: packages/flitter-core/src/widgets/builder.ts
// Replaces existing LayoutBuilder, LayoutBuilderState, _LayoutBuilderDelegate

import { Key } from '../core/key';
import { BoxConstraints } from '../core/box-constraints';
import { Widget, type BuildContext } from '../framework/widget';
import {
  RenderObjectWidget,
  RenderBox,
  type PaintContext,
  type RenderObject,
} from '../framework/render-object';
import { Offset, Size } from '../core/types';

/**
 * A widget whose child is determined by a callback that receives the
 * parent's BoxConstraints during the layout phase.
 *
 * This enables responsive layout decisions based on the actual space
 * available to this widget, not just the root terminal size. The builder
 * callback runs during the LAYOUT phase, after the parent has determined
 * constraints for this subtree.
 *
 * Usage:
 * ```typescript
 * new LayoutBuilder({
 *   builder: (context, constraints) => {
 *     if (constraints.maxWidth >= 80) {
 *       return new WideLayout();
 *     } else {
 *       return new NarrowLayout();
 *     }
 *   },
 * })
 * ```
 *
 * The builder is called:
 * - Once during the first layout pass (with actual parent constraints)
 * - Again whenever parent constraints change
 * - Again when the LayoutBuilder widget is updated with a new builder
 *
 * The builder is NOT called when constraints are identical to the
 * previous invocation (performance optimization).
 */
export class LayoutBuilder extends RenderObjectWidget {
  readonly builder: (context: BuildContext, constraints: BoxConstraints) => Widget;

  constructor(opts: {
    key?: Key;
    builder: (context: BuildContext, constraints: BoxConstraints) => Widget;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.builder = opts.builder;
  }

  createElement(): any {
    // LayoutBuilderElement is defined below; uses lazy require
    // to match the project's pattern for avoiding circular imports.
    return new LayoutBuilderElement(this);
  }

  createRenderObject(): RenderLayoutBuilder {
    return new RenderLayoutBuilder();
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // No mutable properties on the render object derived from widget config.
    // The builder callback is accessed through the element, not stored on
    // the render object. When the widget updates, LayoutBuilderElement.update()
    // re-wires the callback and marks layout dirty.
  }
}
```

### 3.3 LayoutBuilderElement

This is the critical piece -- the bridge between the layout phase and the
build phase. It extends `RenderObjectElement` to own both a render object
AND a dynamically-built child subtree.

```typescript
// File: packages/flitter-core/src/widgets/builder.ts (same file, below LayoutBuilder)
// Alternatively: packages/flitter-core/src/widgets/layout-builder-element.ts

import {
  Element,
  RenderObjectElement,
  BuildContextImpl,
} from '../framework/element';

/**
 * Custom element for LayoutBuilder that synchronously rebuilds its child
 * subtree during the layout phase.
 *
 * Lifecycle:
 * 1. mount() -- creates RenderLayoutBuilder, wires callback
 * 2. [layout pass] -- RenderLayoutBuilder.performLayout() invokes callback
 *    -> _rebuildChild(constraints) -> builder(context, constraints) -> Widget
 *    -> _updateChild(widget) -> inflate/update child Element
 *    -> _wireChildRenderObject() -> attach child's render object
 * 3. update(newWidget) -- re-wires callback, marks layout dirty
 * 4. unmount() -- cleans up child element and render object wiring
 *
 * NOTE: performRebuild() is intentionally a no-op. Rebuilds are driven
 * exclusively by the render object during layout, not by the BuildOwner.
 * However, if markNeedsRebuild() is called (e.g., from an InheritedWidget
 * dependency), we translate it into markNeedsLayout() on the render object
 * so the callback is re-invoked in the next layout pass.
 */
class LayoutBuilderElement extends RenderObjectElement {
  private _childElement: Element | undefined = undefined;
  private _context: BuildContextImpl;
  private _debugIsPerformingLayout: boolean = false;

  constructor(widget: LayoutBuilder) {
    super(widget);
    this._context = new BuildContextImpl(this, widget);
  }

  get layoutBuilderWidget(): LayoutBuilder {
    return this.widget as LayoutBuilder;
  }

  // --- Lifecycle: mount ---

  override mount(): void {
    super.mount(); // creates render object via createRenderObject()

    // Wire the callback: render object -> this element
    const renderObj = this.renderObject as RenderLayoutBuilder;
    renderObj.updateCallback((constraints: BoxConstraints) => {
      this._rebuildChild(constraints);
    });

    // Do NOT build the child here. The first build happens during
    // performLayout(), which provides actual parent constraints.
    // Building here with dummy constraints would produce wrong results.
  }

  // --- Lifecycle: unmount ---

  override unmount(): void {
    // Unmount child element
    if (this._childElement) {
      this._childElement.unmount();
      this.removeChild(this._childElement);
      this._childElement = undefined;
    }

    // Clear render object references
    const renderObj = this.renderObject as RenderLayoutBuilder;
    if (renderObj) {
      renderObj.child = null;
      renderObj.updateCallback(null);
    }

    this._context = undefined!;
    super.unmount();
  }

  // --- Lifecycle: update ---

  override update(newWidget: Widget): void {
    super.update(newWidget); // swaps widget, calls updateRenderObject

    // Update the context's widget reference
    if (this._context) {
      this._context.widget = newWidget;
    }

    // Re-wire callback (builder function reference may have changed)
    const renderObj = this.renderObject as RenderLayoutBuilder;
    renderObj.updateCallback((constraints: BoxConstraints) => {
      this._rebuildChild(constraints);
    });

    // Force re-invocation of the callback on next layout pass,
    // even if constraints have not changed, because the builder
    // function itself may have changed.
    renderObj.forceCallbackInvocation();
  }

  // --- Rebuild: driven by render object during layout ---

  /**
   * Called by RenderLayoutBuilder.performLayout() with the current
   * parent constraints. Synchronously invokes the user's builder
   * callback and inflates/updates the child element subtree.
   */
  private _rebuildChild(constraints: BoxConstraints): void {
    if (this._debugIsPerformingLayout) {
      throw new Error(
        'LayoutBuilder: re-entrant _rebuildChild detected. ' +
        'The builder callback must not trigger layout on its own LayoutBuilder.',
      );
    }

    this._debugIsPerformingLayout = true;
    try {
      const newWidget = this.layoutBuilderWidget.builder(
        this._context,
        constraints,
      );
      this._updateChild(newWidget);
    } finally {
      this._debugIsPerformingLayout = false;
    }
  }

  /**
   * Inflate, update, or replace the child element based on the widget
   * returned by the builder callback. Mirrors the updateChild logic
   * from SingleChildRenderObjectElement.
   */
  private _updateChild(newWidget: Widget): void {
    const renderObj = this.renderObject as RenderLayoutBuilder;

    if (this._childElement) {
      if (this._childElement.widget === newWidget) {
        // Identity match: exact same Widget instance, no work needed
        return;
      }

      if (this._childElement.widget.canUpdate(newWidget)) {
        // Same type + matching key: update in place
        this._childElement.update(newWidget);
        // Re-wire render object in case update changed the child's
        // render object (e.g., if the child is a RenderObjectWidget
        // that returns a new render object type)
        this._wireChildRenderObject();
      } else {
        // Different type or mismatched key: tear down and rebuild
        renderObj.child = null;
        this._childElement.unmount();
        this.removeChild(this._childElement);

        this._childElement = newWidget.createElement();
        this.addChild(this._childElement);
        this._mountChild(this._childElement);
        this._wireChildRenderObject();
      }
    } else {
      // First build: inflate from scratch
      this._childElement = newWidget.createElement();
      this.addChild(this._childElement);
      this._mountChild(this._childElement);
      this._wireChildRenderObject();
    }
  }

  /**
   * Connect the child element's render object to our RenderLayoutBuilder.
   * This must be called after any child element inflation or replacement
   * so the render object tree stays in sync with the element tree.
   */
  private _wireChildRenderObject(): void {
    if (this._childElement && this._childElement.renderObject) {
      const renderObj = this.renderObject as RenderLayoutBuilder;
      if (renderObj.child !== this._childElement.renderObject) {
        renderObj.child = this._childElement.renderObject;
      }
    }
  }

  /**
   * Mount a child element. Uses the same pattern as other elements in
   * the codebase for consistency.
   */
  private _mountChild(child: Element): void {
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
    }
  }

  // --- performRebuild: translate build-phase rebuild into layout ---

  /**
   * LayoutBuilder's performRebuild() does not directly rebuild the child.
   * Instead, it marks the render object as needing layout, which will
   * cause performLayout() to re-invoke the callback.
   *
   * This handles the case where an InheritedWidget ancestor changes and
   * the LayoutBuilderElement is marked dirty via the BuildOwner. The
   * actual rebuild happens during the layout pass, not the build pass.
   */
  override performRebuild(): void {
    const renderObj = this.renderObject as RenderLayoutBuilder;
    if (renderObj) {
      renderObj.forceCallbackInvocation();
    }
    // Clear the dirty flag (set by markNeedsRebuild)
    this._dirty = false;
  }
}
```

### 3.4 RenderLayoutBuilder (Revised)

```typescript
// File: packages/flitter-core/src/widgets/builder.ts (same file)

/**
 * Render object for LayoutBuilder.
 *
 * During performLayout():
 *   1. Check if callback invocation is needed (constraints changed, or forced)
 *   2. If yes: invoke _callback(constraints)
 *      -> This synchronously builds/updates the child element subtree
 *      -> This may create, replace, or update this._child
 *   3. Layout the child (if any) with the parent constraints
 *   4. Size self to the constrained child size
 *
 * The callback is only invoked when:
 *   - Constraints changed since last invocation (_previousConstraints)
 *   - OR invocation was explicitly forced (builder function changed, or
 *     element was marked dirty by InheritedWidget)
 */
export class RenderLayoutBuilder extends RenderBox {
  private _callback: ((constraints: BoxConstraints) => void) | null = null;
  private _child: RenderBox | null = null;
  private _previousConstraints: BoxConstraints | null = null;
  private _needsCallbackInvocation: boolean = false;

  // --- Child management ---

  get child(): RenderBox | null {
    return this._child;
  }

  set child(value: RenderBox | null) {
    if (this._child === value) return;
    if (this._child) this.dropChild(this._child);
    this._child = value;
    if (this._child) this.adoptChild(this._child);
  }

  // --- Callback management ---

  /**
   * Set or clear the layout callback.
   * Called by LayoutBuilderElement during mount/update/unmount.
   */
  updateCallback(callback: ((constraints: BoxConstraints) => void) | null): void {
    if (this._callback !== callback) {
      this._callback = callback;
      // New callback needs invocation even if constraints unchanged
      this._needsCallbackInvocation = true;
      this.markNeedsLayout();
    }
  }

  /**
   * Force the callback to be invoked on the next layout pass,
   * even if constraints have not changed. Used when:
   * - The builder function reference changed (widget update)
   * - An InheritedWidget dependency triggered a rebuild
   */
  forceCallbackInvocation(): void {
    this._needsCallbackInvocation = true;
    this.markNeedsLayout();
  }

  // --- Visitor ---

  override visitChildren(visitor: (child: RenderObject) => void): void {
    if (this._child) visitor(this._child);
  }

  // --- Layout ---

  performLayout(): void {
    const constraints = this.constraints!;

    // Determine if the callback needs invocation
    const constraintsChanged =
      !this._previousConstraints ||
      !this._previousConstraints.equals(constraints);

    if ((constraintsChanged || this._needsCallbackInvocation) && this._callback) {
      this._previousConstraints = constraints;
      this._needsCallbackInvocation = false;

      // Invoke the callback. This synchronously creates/updates
      // the child element and render object via LayoutBuilderElement.
      this._callback(constraints);
    }

    // Layout the child (which may have been created/updated by the callback)
    if (this._child) {
      this._child.layout(constraints);
      this.size = constraints.constrain(this._child.size);
    } else {
      this.size = constraints.constrain(Size.zero);
    }
  }

  // --- Paint ---

  paint(context: PaintContext, offset: Offset): void {
    if (this._child) {
      this._child.paint(context, offset.add(this._child.offset));
    }
  }
}
```

---

## 4. Key Design Decisions

### 4.1 RenderObjectWidget, Not StatefulWidget

The current broken implementation uses `StatefulWidget`. The correct approach
uses `RenderObjectWidget` directly. Rationale:

- **LayoutBuilder must bridge two phases**: The build phase (widget/element
  tree) and the layout phase (render tree). A `StatefulWidget` only
  participates in the build phase. A `RenderObjectWidget` gives us a custom
  element that can participate in both.

- **Synchronous rebuilds during layout**: With `StatefulWidget`, calling
  `setState()` schedules an *asynchronous* rebuild for the next frame. We need
  a *synchronous* rebuild within the current layout pass. Only a custom element
  (with a direct callback from the render object) can achieve this.

- **No intermediate delegate widget**: The current implementation creates a
  `_LayoutBuilderDelegate` intermediate widget. The proposed design eliminates
  this unnecessary indirection, reducing the element and render object count
  from 4 (StatefulElement + LayoutBuilderState + SingleChildRenderObjectElement +
  RenderLayoutBuilder) to 2 (LayoutBuilderElement + RenderLayoutBuilder).

### 4.2 Constraint-Change Gating

`RenderLayoutBuilder.performLayout()` only invokes the callback when
constraints actually change (tracked via `_previousConstraints`). This is
critical for performance: without it, every layout pass would rebuild the
child subtree even if constraints are identical, causing unnecessary work.

The callback is unconditionally invoked on the very first layout pass
(`_previousConstraints === null`), ensuring the child is built.

### 4.3 Forced Callback Invocation

When the LayoutBuilder widget is updated with a new builder function (the
parent rebuilt), the constraints may not have changed but the builder output
will be different. The `_needsCallbackInvocation` flag handles this:

- `LayoutBuilderElement.update()` calls `renderObj.forceCallbackInvocation()`
- This sets `_needsCallbackInvocation = true` and `markNeedsLayout()`
- On the next `performLayout()`, the callback fires regardless of constraints

Similarly, if `performRebuild()` is triggered by an InheritedWidget change,
it also sets `_needsCallbackInvocation = true`.

### 4.4 Re-entrancy Guard

The `_debugIsPerformingLayout` flag in `LayoutBuilderElement._rebuildChild()`
prevents infinite recursion. If the builder callback somehow triggers layout
on its own LayoutBuilder (which would be a bug), we throw a clear error instead
of silently recursing.

### 4.5 Interaction with Flitter's Root-Only Layout Model

Flitter's `PipelineOwner.flushLayout()` (in
`packages/flitter-core/src/framework/pipeline-owner.ts`, lines 126-138) always
starts layout from the root render object. This means
`RenderLayoutBuilder.performLayout()` is called as part of a top-down layout
traversal. The synchronous child rebuild (inflate + mount + render object
wiring) all happens within this traversal, which is safe because:

1. The parent has already computed constraints for this node
2. The child element and render object are created/updated before
   `this._child.layout(constraints)` is called
3. No asynchronous scheduling is needed
4. The new child render object is wired via `adoptChild()` which sets up
   the parent pointer and triggers `setupParentData()`

### 4.6 performRebuild() Strategy

When an InheritedWidget ancestor changes and the LayoutBuilderElement is marked
dirty by the BuildOwner, `performRebuild()` is called during the build phase.
Rather than rebuilding the child directly (which would require constraints that
may not be available during the build phase), we translate the rebuild request
into a layout request: `renderObj.forceCallbackInvocation()`. The actual
rebuild then happens during the subsequent layout pass, where constraints are
available.

This approach is consistent with Flutter's implementation where
`RenderConstrainedLayoutBuilder._needsBuild` is set to true and
`markNeedsLayout()` is called.

### 4.7 Edge Cases

**Builder returns the same widget identity**: If the builder callback returns
the exact same Widget instance across two invocations (referential equality),
`_updateChild()` short-circuits with no work.

**Builder changes widget type**: If the builder returns a widget of a different
type than before (e.g., switching from Row to Column), `_updateChild()` unmounts
the old child element, creates a new one, and wires the new render object. This
is safe because we set `renderObj.child = null` before unmounting the old child.

**Nested LayoutBuilders**: Outer LayoutBuilder's `performLayout()` calls its
callback, which builds an inner LayoutBuilder widget. The inner one is inflated
and mounted immediately. When the outer then calls `this._child.layout(constraints)`,
the layout traversal reaches the inner `RenderLayoutBuilder`, which invokes
its own callback. This naturally nests without special handling because the
top-down layout traversal handles the ordering.

**Constraints become unbounded**: If a LayoutBuilder is placed inside a
Column with no height constraint, `constraints.maxHeight` may be `Infinity`.
The builder callback receives these unbounded constraints and must handle them
appropriately. This matches Flutter's behavior -- LayoutBuilder does not mask
or transform constraints.

**Builder returns same widget type, different key**: The `canUpdate()` check
fails (keys differ), so the old child is unmounted and a new one inflated.
This is standard Flutter reconciliation behavior.

**Empty builder**: If the builder throws or returns a widget that fails to
inflate, the error propagates naturally through the call stack. Future work
could add `ErrorWidget` wrapping for resilience.

---

## 5. Use Cases

### 5.1 Responsive Panel Layout

```typescript
new LayoutBuilder({
  builder: (context, constraints) => {
    if (constraints.maxWidth >= 120) {
      // Three-column layout: sidebar + main + detail
      return new Row({
        children: [
          new SizedBox({ width: 30, child: new Sidebar() }),
          new Expanded({ child: new MainContent() }),
          new SizedBox({ width: 40, child: new DetailPanel() }),
        ],
      });
    } else if (constraints.maxWidth >= 60) {
      // Two-column layout: main + detail
      return new Row({
        children: [
          new Expanded({ child: new MainContent() }),
          new SizedBox({ width: 40, child: new DetailPanel() }),
        ],
      });
    } else {
      // Single-column layout
      return new MainContent();
    }
  },
})
```

### 5.2 Adaptive Table Columns

```typescript
new LayoutBuilder({
  builder: (context, constraints) => {
    const availableWidth = constraints.maxWidth;
    const columns = [
      { name: 'Name', minWidth: 20 },
      { name: 'Status', minWidth: 10 },
      { name: 'Date', minWidth: 12 },
      { name: 'Description', minWidth: 30 },
    ];

    // Only show columns that fit
    const visibleColumns = [];
    let usedWidth = 0;
    for (const col of columns) {
      if (usedWidth + col.minWidth <= availableWidth) {
        visibleColumns.push(col);
        usedWidth += col.minWidth;
      }
    }

    return new DataTable({
      columns: visibleColumns,
      // ... data
    });
  },
})
```

### 5.3 Constraint Debugging

```typescript
new LayoutBuilder({
  builder: (context, constraints) => {
    console.log(`Constraints at this point: ${constraints}`);
    return child; // pass through
  },
})
```

### 5.4 Collapsible Sidebar

```typescript
new Row({
  children: [
    new LayoutBuilder({
      builder: (context, constraints) => {
        // Collapse sidebar to icons when narrow
        if (constraints.maxWidth < 20) {
          return new IconOnlySidebar();
        }
        return new FullSidebar();
      },
    }),
    new Expanded({ child: new MainContent() }),
  ],
})
```

### 5.5 Truncating Long Content

```typescript
new LayoutBuilder({
  builder: (context, constraints) => {
    const maxChars = constraints.maxWidth - 3; // room for "..."
    const displayText = text.length > maxChars
      ? text.slice(0, maxChars) + '...'
      : text;
    return new Text(displayText);
  },
})
```

---

## 6. Migration Plan

### 6.1 Files to Modify

| File | Change |
|------|--------|
| `packages/flitter-core/src/widgets/builder.ts` | Replace `LayoutBuilder`, `LayoutBuilderState`, `_LayoutBuilderDelegate`, `RenderLayoutBuilder` with the new implementation. Keep the `Builder` widget unchanged. Add `LayoutBuilderElement` class. |
| `packages/flitter-core/src/index.ts` | Add export for `LayoutBuilder` and `RenderLayoutBuilder` if not already present. Consider exporting `LayoutBuilderElement` for testing. |
| `packages/flitter-core/src/framework/element.ts` | No changes needed. `RenderObjectElement` and `BuildContextImpl` already have all required infrastructure. |
| `packages/flitter-core/src/framework/render-object.ts` | No changes needed. `RenderBox` already has the `layout()`, `markNeedsLayout()`, and child management infrastructure. |

### 6.2 Export Updates

```typescript
// In packages/flitter-core/src/index.ts, add:
export { Builder, LayoutBuilder, RenderLayoutBuilder } from './widgets/builder';
```

The `LayoutBuilderElement` should also be exported for advanced use cases and
testing:

```typescript
export { LayoutBuilderElement } from './widgets/builder';
```

### 6.3 Backward Compatibility

The constructor signature remains identical:

```typescript
new LayoutBuilder({
  key?: Key,
  builder: (context: BuildContext, constraints: BoxConstraints) => Widget,
})
```

Existing users of LayoutBuilder will see their code start working correctly
without any API changes. The only observable difference is that the builder
callback now receives actual constraints and its output is actually rendered.

### 6.4 Implementation Order

1. **Step 1**: Write RenderLayoutBuilder (revised) with `forceCallbackInvocation()`
   and the `_needsCallbackInvocation` flag. Unit test it.
2. **Step 2**: Write LayoutBuilderElement with `_rebuildChild()`,
   `_updateChild()`, `_wireChildRenderObject()`. Unit test it with mock render
   objects.
3. **Step 3**: Write the new LayoutBuilder widget class. Integration test the
   full mount -> layout -> build -> render cycle.
4. **Step 4**: Remove old `LayoutBuilderState`, `_LayoutBuilderDelegate`.
5. **Step 5**: Update exports and run full test suite.

---

## 7. Testing Strategy

### 7.1 Unit Tests for RenderLayoutBuilder

```typescript
describe('RenderLayoutBuilder', () => {
  test('invokes callback on first performLayout with correct constraints', () => {
    const calls: BoxConstraints[] = [];
    const render = new RenderLayoutBuilder();
    render.updateCallback((c) => calls.push(c));

    const constraints = new BoxConstraints({ maxWidth: 80, maxHeight: 24 });
    render.layout(constraints);

    expect(calls).toHaveLength(1);
    expect(calls[0].maxWidth).toBe(80);
    expect(calls[0].maxHeight).toBe(24);
  });

  test('does not re-invoke callback when constraints unchanged', () => {
    const calls: BoxConstraints[] = [];
    const render = new RenderLayoutBuilder();
    render.updateCallback((c) => calls.push(c));

    const constraints = new BoxConstraints({ maxWidth: 80, maxHeight: 24 });
    render.layout(constraints);
    // Force needsLayout so layout() entry point actually runs
    render.markNeedsLayout();
    render.layout(constraints);

    // Callback only invoked once because constraints are the same
    expect(calls).toHaveLength(1);
  });

  test('re-invokes callback when constraints change', () => {
    const calls: BoxConstraints[] = [];
    const render = new RenderLayoutBuilder();
    render.updateCallback((c) => calls.push(c));

    render.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    render.layout(new BoxConstraints({ maxWidth: 120, maxHeight: 40 }));

    expect(calls).toHaveLength(2);
    expect(calls[1].maxWidth).toBe(120);
  });

  test('re-invokes callback when forceCallbackInvocation() is called', () => {
    const calls: BoxConstraints[] = [];
    const render = new RenderLayoutBuilder();
    render.updateCallback((c) => calls.push(c));

    const constraints = new BoxConstraints({ maxWidth: 80, maxHeight: 24 });
    render.layout(constraints);
    expect(calls).toHaveLength(1);

    // Force re-invocation even with same constraints
    render.forceCallbackInvocation();
    render.layout(constraints);
    expect(calls).toHaveLength(2);
    expect(calls[1].maxWidth).toBe(80); // same constraints
  });

  test('sizes to zero when no child after callback', () => {
    const render = new RenderLayoutBuilder();
    render.updateCallback(() => { /* callback does not set child */ });

    render.layout(new BoxConstraints({ minWidth: 5, maxWidth: 80, maxHeight: 24 }));
    expect(render.size.width).toBe(5); // constrained minimum
    expect(render.size.height).toBe(0);
  });

  test('sizes to child size when child is set by callback', () => {
    const render = new RenderLayoutBuilder();
    const mockChild = createMockRenderBox({ width: 40, height: 12 });

    render.updateCallback(() => {
      render.child = mockChild;
    });

    render.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(render.size.width).toBe(40);
    expect(render.size.height).toBe(12);
  });

  test('child setter handles null -> child -> null transitions', () => {
    const render = new RenderLayoutBuilder();

    expect(render.child).toBeNull();

    const child1 = createMockRenderBox({ width: 10, height: 5 });
    render.child = child1;
    expect(render.child).toBe(child1);

    render.child = null;
    expect(render.child).toBeNull();
  });

  test('child setter replaces old child correctly', () => {
    const render = new RenderLayoutBuilder();
    const child1 = createMockRenderBox({ width: 10, height: 5 });
    const child2 = createMockRenderBox({ width: 20, height: 10 });

    render.child = child1;
    expect(child1.parent).toBe(render);

    render.child = child2;
    expect(child1.parent).toBeNull();
    expect(child2.parent).toBe(render);
  });

  test('visitChildren visits child when present', () => {
    const render = new RenderLayoutBuilder();
    const child = createMockRenderBox({ width: 10, height: 5 });
    render.child = child;

    const visited: RenderObject[] = [];
    render.visitChildren((c) => visited.push(c));

    expect(visited).toHaveLength(1);
    expect(visited[0]).toBe(child);
  });

  test('visitChildren does nothing when no child', () => {
    const render = new RenderLayoutBuilder();
    const visited: RenderObject[] = [];
    render.visitChildren((c) => visited.push(c));
    expect(visited).toHaveLength(0);
  });

  test('callback is not invoked when null', () => {
    const render = new RenderLayoutBuilder();
    // No callback set
    render.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    // Should not throw
    expect(render.size.width).toBe(0);
  });
});
```

### 7.2 Integration Tests for LayoutBuilder Widget

```typescript
describe('LayoutBuilder widget', () => {
  test('builder receives parent constraints on first layout', () => {
    let receivedConstraints: BoxConstraints | null = null;

    const tree = new SizedBox({
      width: 60,
      height: 20,
      child: new LayoutBuilder({
        builder: (context, constraints) => {
          receivedConstraints = constraints;
          return SizedBox.shrink();
        },
      }),
    });

    mountAndLayout(tree, new BoxConstraints({ maxWidth: 100, maxHeight: 50 }));

    expect(receivedConstraints).not.toBeNull();
    // SizedBox(60, 20) produces tight constraints: exactly 60x20
    expect(receivedConstraints!.minWidth).toBe(60);
    expect(receivedConstraints!.maxWidth).toBe(60);
    expect(receivedConstraints!.minHeight).toBe(20);
    expect(receivedConstraints!.maxHeight).toBe(20);
  });

  test('builder result is actually inflated and rendered', () => {
    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        if (constraints.maxWidth >= 40) {
          return new Text('wide');
        } else {
          return new Text('narrow');
        }
      },
    });

    // Layout with wide constraints
    const result = mountAndLayout(tree, new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(findTextInTree(result, 'wide')).toBe(true);
    expect(findTextInTree(result, 'narrow')).toBe(false);
  });

  test('rebuilds child when constraints change', () => {
    let buildCount = 0;

    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        buildCount++;
        return new SizedBox({ width: constraints.maxWidth });
      },
    });

    const handle = mountAndLayout(tree, new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(buildCount).toBe(1);

    // Re-layout with different constraints
    relayout(handle, new BoxConstraints({ maxWidth: 120, maxHeight: 40 }));
    expect(buildCount).toBe(2);
  });

  test('does not rebuild child when constraints are unchanged', () => {
    let buildCount = 0;

    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        buildCount++;
        return SizedBox.shrink();
      },
    });

    const constraints = new BoxConstraints({ maxWidth: 80, maxHeight: 24 });
    const handle = mountAndLayout(tree, constraints);
    expect(buildCount).toBe(1);

    // Re-layout with same constraints should not rebuild
    relayout(handle, constraints);
    expect(buildCount).toBe(1);
  });

  test('handles builder returning different widget types', () => {
    let wide = true;

    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        if (wide) {
          return new Row({ children: [new Text('A'), new Text('B')] });
        } else {
          return new Column({ children: [new Text('A'), new Text('B')] });
        }
      },
    });

    const handle = mountAndLayout(tree, new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(findWidgetTypeInTree(handle, 'Row')).toBe(true);

    // Change builder behavior and force re-layout
    wide = false;
    relayout(handle, new BoxConstraints({ maxWidth: 30, maxHeight: 24 }));
    expect(findWidgetTypeInTree(handle, 'Column')).toBe(true);
    expect(findWidgetTypeInTree(handle, 'Row')).toBe(false);
  });

  test('nested LayoutBuilders receive correct constraints', () => {
    let outerConstraints: BoxConstraints | null = null;
    let innerConstraints: BoxConstraints | null = null;

    const tree = new SizedBox({
      width: 100,
      height: 50,
      child: new LayoutBuilder({
        builder: (ctx, constraints) => {
          outerConstraints = constraints;
          return new Padding({
            padding: { left: 10, right: 10, top: 5, bottom: 5 },
            child: new LayoutBuilder({
              builder: (ctx2, constraints2) => {
                innerConstraints = constraints2;
                return SizedBox.shrink();
              },
            }),
          });
        },
      }),
    });

    mountAndLayout(tree, new BoxConstraints({ maxWidth: 100, maxHeight: 50 }));

    expect(outerConstraints!.maxWidth).toBe(100);
    expect(outerConstraints!.maxHeight).toBe(50);
    // Inner constraints deflated by padding: 100-20=80, 50-10=40
    expect(innerConstraints!.maxWidth).toBe(80);
    expect(innerConstraints!.maxHeight).toBe(40);
  });

  test('builder result sizes the LayoutBuilder correctly', () => {
    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        return new SizedBox({ width: 30, height: 10 });
      },
    });

    const handle = mountAndLayout(tree, new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    const renderObj = getRenderObject(handle);
    expect(renderObj.size.width).toBe(30);
    expect(renderObj.size.height).toBe(10);
  });
});
```

### 7.3 Edge Case Tests

```typescript
describe('LayoutBuilder edge cases', () => {
  test('handles unbounded constraints', () => {
    let received: BoxConstraints | null = null;

    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        received = constraints;
        return new SizedBox({ width: 40, height: 10 });
      },
    });

    mountAndLayout(tree, new BoxConstraints()); // fully unbounded
    expect(received!.maxWidth).toBe(Infinity);
    expect(received!.maxHeight).toBe(Infinity);
  });

  test('handles zero-size tight constraints', () => {
    let received: BoxConstraints | null = null;

    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        received = constraints;
        return SizedBox.shrink();
      },
    });

    mountAndLayout(tree, BoxConstraints.tight(Size.zero));
    expect(received!.maxWidth).toBe(0);
    expect(received!.maxHeight).toBe(0);
    expect(received!.minWidth).toBe(0);
    expect(received!.minHeight).toBe(0);
  });

  test('unmounting cleans up render object callback', () => {
    const tree = new LayoutBuilder({
      builder: (context, constraints) => SizedBox.shrink(),
    });

    const handle = mountAndLayout(tree, new BoxConstraints({ maxWidth: 80 }));
    const renderObj = getRenderObject(handle) as RenderLayoutBuilder;
    expect(renderObj['_callback']).not.toBeNull();

    unmount(handle);
    expect(renderObj['_callback']).toBeNull();
    expect(renderObj.child).toBeNull();
  });

  test('handles builder that returns identical widget instance', () => {
    const staticChild = SizedBox.shrink();
    let buildCount = 0;

    const tree = new LayoutBuilder({
      builder: (context, constraints) => {
        buildCount++;
        return staticChild; // same instance every time
      },
    });

    const handle = mountAndLayout(tree, new BoxConstraints({ maxWidth: 80 }));
    expect(buildCount).toBe(1);

    // Force re-layout with different constraints
    relayout(handle, new BoxConstraints({ maxWidth: 100 }));
    expect(buildCount).toBe(2);
    // The _updateChild should detect identity match and skip work
  });

  test('LayoutBuilder inside Expanded receives flex-allocated constraints', () => {
    let receivedConstraints: BoxConstraints | null = null;

    const tree = new Row({
      children: [
        new SizedBox({ width: 20 }),
        new Expanded({
          child: new LayoutBuilder({
            builder: (context, constraints) => {
              receivedConstraints = constraints;
              return SizedBox.shrink();
            },
          }),
        }),
      ],
    });

    mountAndLayout(tree, new BoxConstraints({ maxWidth: 100, maxHeight: 24 }));

    // Expanded should give remaining width: 100 - 20 = 80
    expect(receivedConstraints).not.toBeNull();
    expect(receivedConstraints!.maxWidth).toBe(80);
  });

  test('re-entrant layout detection', () => {
    // This test verifies the debug guard works
    // In practice this should never happen, but the guard prevents
    // infinite recursion if it does.

    // The _debugIsPerformingLayout flag in LayoutBuilderElement
    // throws if the builder callback triggers layout on the same
    // LayoutBuilder.

    // This is tested at the element level, not via widget mounting,
    // because triggering re-entrant layout is abnormal.
  });
});
```

### 7.4 Performance Tests

```typescript
describe('LayoutBuilder performance', () => {
  test('does not rebuild when parent rebuilds with same constraints', () => {
    let builderCallCount = 0;

    // Parent that rebuilds frequently
    const tree = new SizedBox({
      width: 80,
      height: 24,
      child: new LayoutBuilder({
        builder: (context, constraints) => {
          builderCallCount++;
          return new Text(`Build #${builderCallCount}`);
        },
      }),
    });

    const handle = mountAndLayout(tree, new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(builderCallCount).toBe(1);

    // Re-layout 10 times with same constraints
    for (let i = 0; i < 10; i++) {
      relayout(handle, new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    }

    // Builder should still only have been called once
    expect(builderCallCount).toBe(1);
  });
});
```

---

## 8. Performance Considerations

### 8.1 Synchronous Rebuild Cost

LayoutBuilder performs widget tree construction during the layout pass. This is
inherently more expensive than a simple `performLayout()`. However:

- **Only on constraint change**: The callback is gated on constraint equality.
  If constraints are unchanged and no force-invocation was requested, zero
  widget work happens.
- **Incremental updates**: When the builder returns a widget of the same type
  and key, element `update()` is used instead of full inflation. This reuses
  the existing element and render object.
- **Subtree scope**: Only the subtree below the LayoutBuilder is affected.
  The rest of the tree layouts normally.

### 8.2 Avoiding Infinite Layout Loops

The constraint-change gating prevents cycles:

1. `performLayout()` invokes callback with constraints C
2. Callback builds subtree S, which is laid out
3. Layout propagates up (in Flitter, layout is always root-down, so this
   does not happen)
4. Next frame, `performLayout()` is called again with same constraints C
5. `_previousConstraints.equals(C)` is true, callback is skipped
6. Loop broken

The only way the callback fires again is if constraints genuinely change or
`forceCallbackInvocation()` is called explicitly.

### 8.3 Memory

Each LayoutBuilder adds one `LayoutBuilderElement` and one
`RenderLayoutBuilder` to the tree. This is lighter than the current
implementation which adds a `StatefulElement`, `LayoutBuilderState`,
`SingleChildRenderObjectElement` (for `_LayoutBuilderDelegate`), and
`RenderLayoutBuilder` -- 4 objects vs 2.

### 8.4 Comparison with MediaQuery

LayoutBuilder is complementary to MediaQuery. MediaQuery provides the root
terminal size as an InheritedWidget. LayoutBuilder provides the *actual
available space* at any point in the tree. The cost profiles are different:

- MediaQuery: O(1) lookup via InheritedWidget, but does not account for
  ancestor layout decisions
- LayoutBuilder: Runs during layout, accounts for all ancestor constraints,
  but adds a callback invocation to the layout pass

For most responsive layout needs, LayoutBuilder is the correct choice when
the relevant constraints differ from the root terminal size.

---

## 9. Open Questions

### 9.1 Should LayoutBuilder support InheritedWidget rebuilds?

**Answer: Yes.** The proposed implementation handles this via `performRebuild()`
translating into `forceCallbackInvocation()` on the render object. When an
InheritedWidget ancestor changes, the LayoutBuilderElement is marked dirty,
`performRebuild()` is called during the build phase, which sets the force flag,
and the callback re-fires during the next layout pass.

### 9.2 Should we support SliverLayoutBuilder?

**Answer: Out of scope.** Flutter also has a `SliverLayoutBuilder` for
scrollable viewports. Flitter's scroll view implementation may benefit from
this in the future, but it requires sliver-based rendering which is not part
of Flitter's current architecture.

### 9.3 Thread safety during synchronous rebuild?

**Answer: Not a concern in single-threaded JavaScript/TypeScript.** However,
the `_debugIsPerformingLayout` guard prevents re-entrant calls which could
arise from programming errors in user code.

### 9.4 Should the builder callback receive the BuildContext?

**Answer: Yes.** The builder signature is
`(context: BuildContext, constraints: BoxConstraints) => Widget`. The context
allows the builder to look up InheritedWidgets (Theme, MediaQuery, etc.),
find ancestor state, and perform other context-dependent operations. This
matches Flutter's API.

### 9.5 What happens if constraints are not available?

In Flitter's architecture, constraints are always available during
`performLayout()` because the parent has already called `child.layout(constraints)`
which sets `this._lastConstraints` on the RenderBox before `performLayout()`
runs. The `this.constraints!` assertion in `performLayout()` is safe.

---

## 10. Summary

The current `LayoutBuilder` in Flitter is architecturally broken: it uses a
`StatefulWidget` pattern that cannot synchronously rebuild the widget subtree
during the layout pass, resulting in zero-sized invisible output and stale
constraints. The fix requires:

1. **Replacing `LayoutBuilder` with a `RenderObjectWidget`** that has a custom
   `LayoutBuilderElement` -- NOT a StatefulWidget.
2. **`LayoutBuilderElement`** extends `RenderObjectElement` and owns both the
   render object AND a dynamically-built child element subtree. It provides
   `_rebuildChild(constraints)` as a synchronous callback for the render object.
3. **`RenderLayoutBuilder`** invokes the element's callback during
   `performLayout()`, which synchronously builds/updates the child subtree,
   then layouts the resulting child render object.
4. **Constraint-change gating** (`_previousConstraints`) prevents unnecessary
   rebuilds. **Force-invocation** (`_needsCallbackInvocation`) handles builder
   function changes and InheritedWidget dependency updates.
5. **Re-entrancy guard** (`_debugIsPerformingLayout`) prevents infinite
   recursion from programming errors.

This design matches Flutter's proven architecture while adapting to Flitter's
simpler root-only layout model, integer coordinate system, and existing
element/render object patterns. The public API is backward-compatible: the
constructor signature is unchanged, and existing (broken) usages will start
working correctly.
