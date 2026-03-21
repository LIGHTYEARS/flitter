// ParentDataWidget and ParentDataElement — configures parent data on child render objects.
// Amp ref: R_ (ParentDataWidget), iU0 (ParentDataElement)
// Source: .reference/widgets-catalog.md, element-tree.md

import { Key } from '../core/key';
import { Widget } from '../framework/widget';
import { RenderObject } from '../framework/render-object';
import {
  Element,
  RenderObjectElement,
} from '../framework/element';

// ---------------------------------------------------------------------------
// ParentDataWidget (Amp: R_ extends Sf)
// ---------------------------------------------------------------------------

/**
 * Abstract widget that configures parent data on a child's render object.
 *
 * ParentDataWidget wraps a single child and, after the child is mounted
 * or updated, walks down the element tree to find the child's RenderObject
 * and calls applyParentData() on it.
 *
 * Subclasses (e.g., Flexible, Expanded) override applyParentData() to set
 * properties like flex and fit on FlexParentData.
 *
 * Amp ref: class R_ extends Sf (Widget)
 */
export abstract class ParentDataWidget extends Widget {
  readonly child: Widget;

  constructor(opts: { key?: Key; child: Widget }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts.child;
  }

  /**
   * Apply parent data configuration to the given render object.
   * Subclasses override this to set specific parent data properties.
   */
  abstract applyParentData(renderObject: RenderObject): void;

  // Amp ref: R_.createElement() -> new iU0(this)
  createElement(): ParentDataElement {
    return new ParentDataElement(this);
  }
}

// ---------------------------------------------------------------------------
// ParentDataElement (Amp: iU0 extends T$)
// ---------------------------------------------------------------------------

/**
 * Element for ParentDataWidget.
 *
 * Wraps a single child element. After mount/update, walks down the child
 * element tree to find the first RenderObjectElement and calls
 * widget.applyParentData() on its renderObject.
 *
 * Amp ref: class iU0 extends T$ (Element)
 */
export class ParentDataElement extends Element {
  _child: Element | undefined = undefined;

  constructor(widget: ParentDataWidget) {
    super(widget);
  }

  get parentDataWidget(): ParentDataWidget {
    return this.widget as ParentDataWidget;
  }

  override get renderObject(): RenderObject | undefined {
    return this._child?.renderObject;
  }

  // Amp ref: iU0.mount()
  mount(): void {
    const childWidget = this.parentDataWidget.child;
    this._child = childWidget.createElement();
    this.addChild(this._child);
    this._mountChild(this._child);
    this._applyParentData();
    this.markMounted();
  }

  // Amp ref: iU0.unmount()
  override unmount(): void {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    super.unmount();
  }

  // Amp ref: iU0.update(newWidget)
  override update(newWidget: Widget): void {
    if (this.widget === newWidget) return;
    super.update(newWidget);

    const w = this.parentDataWidget;
    if (this._child) {
      if (this._child.widget.canUpdate(w.child)) {
        this._child.update(w.child);
      } else {
        // Replace child
        this._child.unmount();
        this.removeChild(this._child);
        this._child = w.child.createElement();
        this.addChild(this._child);
        this._mountChild(this._child);
      }
    }
    this._applyParentData();
  }

  override performRebuild(): void {}

  /**
   * Walk down child elements to find the first RenderObjectElement
   * and apply parent data to its renderObject.
   *
   * Amp ref: iU0._applyParentData — walks child tree until RenderObjectElement found
   */
  private _applyParentData(): void {
    const renderObject = this._findChildRenderObject();
    if (renderObject) {
      this.parentDataWidget.applyParentData(renderObject);
    }
  }

  /**
   * Walk down the child element tree to find the first render object.
   * Stops at the first RenderObjectElement encountered.
   */
  private _findChildRenderObject(): RenderObject | undefined {
    let current: Element | undefined = this._child;
    while (current) {
      if (current instanceof RenderObjectElement) {
        return current.renderObject;
      }
      // Walk deeper — check if it has a single child
      // ParentDataWidget children are typically single-child paths
      const children = current.children;
      if (children.length > 0) {
        current = children[0];
      } else {
        // Check for _child property on component elements
        if ('_child' in current && (current as any)._child instanceof Element) {
          current = (current as any)._child;
        } else {
          break;
        }
      }
    }
    return undefined;
  }

  private _mountChild(child: Element): void {
    if ('mount' in child && typeof (child as any).mount === 'function') {
      (child as any).mount();
    }
  }
}
