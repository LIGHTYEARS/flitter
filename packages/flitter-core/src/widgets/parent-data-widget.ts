// ParentDataWidget and ParentDataElement — configures parent data on child render objects.
// Amp ref: R_ (ParentDataWidget), iU0 (ParentDataElement)
// Source: .reference/widgets-catalog.md, element-tree.md

import { Key } from '../core/key';
import { ProxyWidget, Widget } from '../framework/widget';
import { RenderObject } from '../framework/render-object';
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

    // Use the split pattern: swap widget, then update child
    this._swapWidget(newWidget);
    this._updateChild();

    // If child was replaced and render objects differ, handle replacement
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
   * Replace old render object with new one in the ancestor render object tree.
   * This handles the case where the child's render object changes during update.
   */
  private _replaceRenderObjectInAncestor(
    _oldRenderObject: RenderObject | undefined,
    _newRenderObject: RenderObject | undefined,
  ): void {
    // This is a placeholder for render object replacement logic.
    // The actual implementation would walk up to find the ancestor
    // RenderObjectElement and swap the child render object.
    // For now, the re-application of parent data handles the common case.
  }
}
