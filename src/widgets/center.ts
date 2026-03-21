// Center widget — SingleChildRenderObjectWidget that centers its child
// Amp ref: h3 (Center)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import { SingleChildRenderObjectWidget, RenderBox, PaintContext, RenderObject } from '../framework/render-object';
import { Widget } from '../framework/widget';

// ---------------------------------------------------------------------------
// RenderCenter
// ---------------------------------------------------------------------------

/**
 * A render object that centers its child within the available space.
 *
 * Layout algorithm:
 * 1. Layout child with loosened constraints (min=0, max=parent max)
 * 2. Determine own size:
 *    - If widthFactor set: child.width * widthFactor
 *    - If constraints are bounded: use constraints maxWidth
 *    - Otherwise: child.width * (widthFactor ?? 1)
 *    Same logic for height.
 * 3. Center child: offset = floor((self - child) / 2)
 *
 * Amp ref: class h3 render object
 */
export class RenderCenter extends RenderBox {
  private _widthFactor?: number;
  private _heightFactor?: number;
  private _child: RenderBox | null = null;

  constructor(opts?: {
    widthFactor?: number;
    heightFactor?: number;
    child?: RenderBox | null;
  }) {
    super();
    this._widthFactor = opts?.widthFactor;
    this._heightFactor = opts?.heightFactor;
    if (opts?.child) {
      this.child = opts.child;
    }
  }

  get widthFactor(): number | undefined {
    return this._widthFactor;
  }

  set widthFactor(value: number | undefined) {
    if (this._widthFactor === value) return;
    this._widthFactor = value;
    this.markNeedsLayout();
  }

  get heightFactor(): number | undefined {
    return this._heightFactor;
  }

  set heightFactor(value: number | undefined) {
    if (this._heightFactor === value) return;
    this._heightFactor = value;
    this.markNeedsLayout();
  }

  get child(): RenderBox | null {
    return this._child;
  }

  set child(value: RenderBox | null) {
    if (this._child) {
      this.dropChild(this._child);
    }
    this._child = value;
    if (value) {
      this.adoptChild(value);
    }
  }

  performLayout(): void {
    const constraints = this.constraints!;

    if (this._child) {
      // Loosen constraints: min=0, keep max
      const loosened = new BoxConstraints({
        minWidth: 0,
        minHeight: 0,
        maxWidth: constraints.maxWidth,
        maxHeight: constraints.maxHeight,
      });

      this._child.layout(loosened);

      // Determine own width
      let ownWidth: number;
      if (this._widthFactor !== undefined) {
        ownWidth = this._child.size.width * this._widthFactor;
      } else if (constraints.hasBoundedWidth) {
        ownWidth = constraints.maxWidth;
      } else {
        ownWidth = this._child.size.width;
      }

      // Determine own height
      let ownHeight: number;
      if (this._heightFactor !== undefined) {
        ownHeight = this._child.size.height * this._heightFactor;
      } else if (constraints.hasBoundedHeight) {
        ownHeight = constraints.maxHeight;
      } else {
        ownHeight = this._child.size.height;
      }

      this.size = constraints.constrain(new Size(ownWidth, ownHeight));

      // Center child
      const dx = Math.floor((this.size.width - this._child.size.width) / 2);
      const dy = Math.floor((this.size.height - this._child.size.height) / 2);
      this._child.offset = new Offset(dx, dy);
    } else {
      // No child: size to constraints
      if (constraints.hasBoundedWidth && constraints.hasBoundedHeight) {
        this.size = constraints.constrain(new Size(constraints.maxWidth, constraints.maxHeight));
      } else {
        this.size = constraints.constrain(Size.zero);
      }
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    if (this._child) {
      this._child.paint(context, offset.add(this._child.offset));
    }
  }

  visitChildren(visitor: (child: RenderBox) => void): void {
    if (this._child) {
      visitor(this._child);
    }
  }
}

// ---------------------------------------------------------------------------
// Center widget (Amp: h3)
// ---------------------------------------------------------------------------

/**
 * A convenience widget that centers its child.
 *
 * Amp ref: class h3 extends SingleChildRenderObjectWidget
 */
export class Center extends SingleChildRenderObjectWidget {
  readonly widthFactor?: number;
  readonly heightFactor?: number;

  constructor(opts?: {
    key?: Key;
    widthFactor?: number;
    heightFactor?: number;
    child?: Widget;
  }) {
    super({ key: opts?.key, child: opts?.child });
    this.widthFactor = opts?.widthFactor;
    this.heightFactor = opts?.heightFactor;
  }

  createRenderObject(): RenderCenter {
    return new RenderCenter({
      widthFactor: this.widthFactor,
      heightFactor: this.heightFactor,
    });
  }

  updateRenderObject(renderObject: RenderObject): void {
    const rc = renderObject as RenderCenter;
    rc.widthFactor = this.widthFactor;
    rc.heightFactor = this.heightFactor;
  }
}
