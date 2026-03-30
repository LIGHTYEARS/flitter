// Builder and LayoutBuilder widgets
// Amp ref: custom utility widgets
//
// LayoutBuilder implementation follows Flutter's design:
// - LayoutBuilder is a RenderObjectWidget (NOT StatefulWidget)
// - LayoutBuilderElement manages building the child during layout
// - RenderLayoutBuilder calls back into the element during performLayout()
// - The element inflates/updates the child subtree with constraint knowledge
//
// This is the correct approach because LayoutBuilder needs its child
// to be built DURING the layout phase, not the build phase.

import { Widget, StatelessWidget, type BuildContext, type ElementLike } from '../framework/widget';
import { RenderObjectWidget, RenderBox, type PaintContext, type RenderObject, isSingleChildRenderObject } from '../framework/render-object';
import { Element, RenderObjectElement, BuildContextImpl } from '../framework/element';
import { BoxConstraints } from '../core/box-constraints';
import { Offset, Size } from '../core/types';
import { Key } from '../core/key';

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * A widget that delegates its build to a callback.
 * Useful for inline widget creation without subclassing StatelessWidget.
 */
export class Builder extends StatelessWidget {
  readonly builder: (context: BuildContext) => Widget;

  constructor(opts: {
    key?: Key;
    builder: (context: BuildContext) => Widget;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.builder = opts.builder;
  }

  build(context: BuildContext): Widget {
    return this.builder(context);
  }
}

// ---------------------------------------------------------------------------
// LayoutBuilder
// ---------------------------------------------------------------------------

/**
 * A widget that builds its child based on the parent's constraints.
 *
 * Unlike a normal widget whose child is determined during the build phase,
 * LayoutBuilder defers building its child until the layout phase, when
 * the incoming BoxConstraints are known.
 *
 * Implementation follows Flutter's ConstraintLayoutBuilder pattern:
 * - LayoutBuilder extends RenderObjectWidget
 * - Creates a LayoutBuilderElement (custom element)
 * - Creates a RenderLayoutBuilder (custom render object)
 * - During performLayout(), RenderLayoutBuilder invokes a callback
 * - The callback triggers LayoutBuilderElement to build/update its child
 *
 * Flutter ref: flutter/lib/src/widgets/layout_builder.dart
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

  createRenderObject(): RenderLayoutBuilder {
    return new RenderLayoutBuilder();
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // RenderLayoutBuilder has no mutable properties from the widget.
    // The callback is wired through the element, not the render object.
  }

  createElement(): ElementLike {
    return new LayoutBuilderElement(this);
  }
}

// ---------------------------------------------------------------------------
// LayoutBuilderElement
// ---------------------------------------------------------------------------

/**
 * Custom element for LayoutBuilder that manages building its child
 * during the layout phase rather than the build phase.
 *
 * Key lifecycle:
 * 1. mount() -- creates RenderLayoutBuilder, wires the callback
 * 2. performLayout() on the render object -- invokes the callback
 * 3. Callback calls _layoutCallback() on this element
 * 4. _layoutCallback() invokes the builder with constraints, then
 *    inflates/updates the child element subtree
 * 5. The child's render object is attached to RenderLayoutBuilder
 *
 * Flutter ref: _LayoutBuilderElement in layout_builder.dart
 */
export class LayoutBuilderElement extends RenderObjectElement {
  private _child: Element | undefined = undefined;
  private _context: BuildContextImpl | undefined = undefined;

  constructor(widget: LayoutBuilder) {
    super(widget);
  }

  get layoutBuilderWidget(): LayoutBuilder {
    return this.widget as LayoutBuilder;
  }

  get child(): Element | undefined {
    return this._child;
  }

  override get children(): Element[] {
    return this._child ? [this._child] : [];
  }

  // -------------------------------------------------------------------
  // mount: create the render object and wire the layout callback
  // -------------------------------------------------------------------
  override mount(): void {
    this._context = new BuildContextImpl(this, this.widget);
    super.mount(); // creates the RenderLayoutBuilder

    const renderObj = this._renderObject as RenderLayoutBuilder;
    renderObj.updateCallback(this._layoutCallback.bind(this));
  }

  // -------------------------------------------------------------------
  // update: the LayoutBuilder widget was replaced (new builder callback)
  // -------------------------------------------------------------------
  override update(newWidget: Widget): void {
    super.update(newWidget);
    if (this._context) {
      this._context.widget = newWidget;
    }

    const renderObj = this._renderObject as RenderLayoutBuilder;
    renderObj.updateCallback(this._layoutCallback.bind(this));

    // Mark layout dirty so performLayout re-runs with the new builder
    renderObj.markNeedsLayout();
  }

  // -------------------------------------------------------------------
  // performRebuild: LayoutBuilder's rebuild is triggered by layout, not build
  // -------------------------------------------------------------------
  override performRebuild(): void {
    // When the BuildOwner asks us to rebuild (e.g., because an ancestor
    // changed), we need the render object to re-run performLayout so
    // it can invoke _layoutCallback with fresh constraints.
    // Simply mark layout dirty -- the layout phase will handle the rest.
    if (this._renderObject) {
      this._renderObject.markNeedsLayout();
    }
  }

  // -------------------------------------------------------------------
  // _layoutCallback: invoked by RenderLayoutBuilder.performLayout()
  // -------------------------------------------------------------------
  private _layoutCallback(constraints: BoxConstraints): void {
    if (!this._context) return;

    // Call the user's builder with the actual constraints
    const newChildWidget = this.layoutBuilderWidget.builder(
      this._context,
      constraints,
    );

    // Inflate or update the child element subtree
    this._updateChild(newChildWidget);
  }

  /**
   * Inflate, update, or replace the child element based on the new widget.
   * This follows the same canUpdate / replace logic as StatelessElement.rebuild().
   */
  private _updateChild(newWidget: Widget): void {
    const renderObj = this._renderObject as RenderLayoutBuilder;

    if (this._child) {
      if (this._child.widget === newWidget) return; // identity shortcut
      if (this._child.widget.canUpdate(newWidget)) {
        this._child.update(newWidget);
      } else {
        // Replace: unmount old child, inflate new
        this._detachChildRenderObject();
        this._child.unmount();
        this.removeChild(this._child);
        this._child = newWidget.createElement() as Element;
        this.addChild(this._child);
        this._child.mount();
        this._attachChildRenderObject(renderObj);
      }
    } else {
      // First build: inflate
      this._child = newWidget.createElement() as Element;
      this.addChild(this._child);
      this._child.mount();
      this._attachChildRenderObject(renderObj);
    }
  }

  /**
   * Attach the child's render object to our RenderLayoutBuilder.
   */
  private _attachChildRenderObject(renderObj: RenderLayoutBuilder): void {
    if (this._child?.renderObject) {
      renderObj.child = this._child.renderObject as RenderBox;
    }
  }

  /**
   * Detach the child's render object from our RenderLayoutBuilder.
   */
  private _detachChildRenderObject(): void {
    const renderObj = this._renderObject as RenderLayoutBuilder;
    renderObj.child = null;
  }

  // -------------------------------------------------------------------
  // Lifecycle: deactivate, unmount
  // -------------------------------------------------------------------
  override deactivate(): void {
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
}

// ---------------------------------------------------------------------------
// RenderLayoutBuilder
// ---------------------------------------------------------------------------

/**
 * A RenderBox that invokes a callback during performLayout() to let the
 * LayoutBuilderElement build its child with knowledge of the constraints.
 *
 * The callback is wired by LayoutBuilderElement during mount() and
 * receives the incoming constraints. After the callback returns,
 * the element has inflated/updated the child element, and this render
 * object's `child` property points to the child's render object.
 *
 * Flutter ref: _RenderLayoutBuilder in layout_builder.dart
 */
export class RenderLayoutBuilder extends RenderBox {
  private _callback: ((constraints: BoxConstraints) => void) | null = null;
  private _child: RenderBox | null = null;

  constructor() {
    super();
  }

  /**
   * Set or update the layout callback.
   * Called by LayoutBuilderElement when wiring up.
   */
  updateCallback(callback: (constraints: BoxConstraints) => void): void {
    this._callback = callback;
  }

  get child(): RenderBox | null {
    return this._child;
  }

  set child(value: RenderBox | null) {
    if (this._child === value) return;
    if (this._child) this.dropChild(this._child);
    this._child = value;
    if (this._child) this.adoptChild(this._child);
  }

  override visitChildren(visitor: (child: RenderObject) => void): void {
    if (this._child) visitor(this._child);
  }

  performLayout(): void {
    const constraints = this.constraints!;

    // Invoke the callback -- this triggers LayoutBuilderElement._layoutCallback()
    // which will build/update the child widget and attach the child render object.
    if (this._callback) {
      this._callback(constraints);
    }

    // Now layout the child (which was just built/updated by the callback)
    if (this._child) {
      this._child.layout(constraints);
      this.size = constraints.constrain(this._child.size);
    } else {
      this.size = constraints.constrain(Size.zero);
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    if (this._child) {
      this._child.paint(context, offset);
    }
  }
}
