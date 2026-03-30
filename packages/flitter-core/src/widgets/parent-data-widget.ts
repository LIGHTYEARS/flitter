// ParentDataWidget and ParentDataElement — configures parent data on child render objects.
// Amp ref: R_ (ParentDataWidget), iU0 (ParentDataElement)
// Source: .reference/widgets-catalog.md, element-tree.md

import { Key } from '../core/key';
import { ProxyWidget, Widget } from '../framework/widget';
import { RenderObject, isContainerRenderObject, isSingleChildRenderObject } from '../framework/render-object';
import {
  Element,
  ProxyElement,
  RenderObjectElement,
} from '../framework/element';
// ---------------------------------------------------------------------------
// ParentDataWidget (Amp: R_ extends Sf)
// NOTE: In Amp, R_ extends Sf directly. We extend ProxyWidget for DRY.
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
 * NOTE: In Amp, R_ extends Sf directly. We extend ProxyWidget for DRY.
 */
export abstract class ParentDataWidget extends ProxyWidget {
  constructor(opts: { key?: Key; child: Widget }) {
    super(opts);
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
// NOTE: In Amp, iU0 extends T$ directly. We extend ProxyElement for DRY.
// ---------------------------------------------------------------------------

/**
 * Element for ParentDataWidget.
 *
 * Wraps a single child element. After mount/update, walks down the child
 * element tree to find the first RenderObjectElement and calls
 * widget.applyParentData() on its renderObject.
 *
 * Amp ref: class iU0 extends T$ (Element)
 * NOTE: In Amp, iU0 extends T$ directly. We extend ProxyElement for DRY.
 */
export class ParentDataElement extends ProxyElement {
  constructor(widget: ParentDataWidget) {
    super(widget);
  }

  get parentDataWidget(): ParentDataWidget {
    return this.widget as ParentDataWidget;
  }

  // Override mount to apply parent data after the child is mounted
  override mount(): void {
    super.mount();
    this._applyParentData();
  }

  // Amp ref: iU0.update(newWidget)
  override update(newWidget: Widget): void {
    if (this.widget === newWidget) return;

    const oldRenderObject = this._child?.renderObject;

    this._swapWidget(newWidget);
    this._updateChild();

    const newRenderObject = this._child?.renderObject;

    if (oldRenderObject && newRenderObject && oldRenderObject !== newRenderObject) {
      this._replaceRenderObjectInAncestor(oldRenderObject, newRenderObject);
    }

    this._applyParentData();
  }

  /**
   * Walk down child elements to find the first RenderObjectElement
   * and apply parent data to its renderObject.
   *
   * Amp ref: iU0._applyParentData — walks child tree until RenderObjectElement found
   */
  _applyParentData(): void {
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
        const elemWithChild = current as unknown as { _child?: Element };
        if (elemWithChild._child instanceof Element) {
          current = elemWithChild._child;
        } else {
          break;
        }
      }
    }
    return undefined;
  }

  /**
   * Walk up the element tree to find the nearest RenderObjectElement ancestor,
   * then swap the old child render object for the new one in the ancestor's
   * render object. This is needed because ParentDataElement itself is not a
   * RenderObjectElement and cannot host render objects directly.
   */
  private _replaceRenderObjectInAncestor(
    oldRenderObject: RenderObject | undefined,
    newRenderObject: RenderObject | undefined,
  ): void {
    if (!oldRenderObject || !newRenderObject) return;

    let ancestor: Element | undefined = this.parent;
    while (ancestor && !(ancestor instanceof RenderObjectElement)) {
      ancestor = ancestor.parent;
    }
    if (!ancestor) return;

    const ancestorRO = (ancestor as RenderObjectElement).renderObject;
    if (!ancestorRO) return;

    if (isContainerRenderObject(ancestorRO)) {
      const container = ancestorRO as RenderObject & {
        children: ReadonlyArray<RenderObject>;
        remove(child: RenderObject): void;
        insert(child: RenderObject, after?: RenderObject): void;
        move(child: RenderObject, after?: RenderObject): void;
      };
      const children = container.children;
      const idx = children.indexOf(oldRenderObject);
      if (idx >= 0) {
        const after = idx > 0 ? children[idx - 1] : undefined;
        container.remove(oldRenderObject);
        container.insert(newRenderObject);
        if (after || idx === 0) {
          container.move(newRenderObject, after);
        }
      }
    } else if (isSingleChildRenderObject(ancestorRO)) {
      ancestorRO.child = newRenderObject;
    }
  }
}
