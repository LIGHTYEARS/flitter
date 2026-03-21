// SizedBox widget — SingleChildRenderObjectWidget that applies size constraints
// Amp ref: X0 (SizedBox), xU0 (RenderConstrainedBox)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { BoxConstraints } from '../core/box-constraints';
import { SingleChildRenderObjectWidget, RenderObject } from '../framework/render-object';
import { Widget } from '../framework/widget';
import { RenderConstrainedBox } from '../layout/render-constrained';

/**
 * A widget that forces its child to have a specific width and/or height.
 *
 * Uses RenderConstrainedBox under the hood with tight constraints
 * derived from the specified width/height.
 *
 * Amp ref: class X0 extends SingleChildRenderObjectWidget
 */
export class SizedBox extends SingleChildRenderObjectWidget {
  readonly width?: number;
  readonly height?: number;

  constructor(opts?: { key?: Key; width?: number; height?: number; child?: Widget }) {
    super({ key: opts?.key, child: opts?.child });
    this.width = opts?.width;
    this.height = opts?.height;
  }

  private _buildConstraints(): BoxConstraints {
    return BoxConstraints.tightFor({ width: this.width, height: this.height });
  }

  createRenderObject(): RenderConstrainedBox {
    return new RenderConstrainedBox({
      additionalConstraints: this._buildConstraints(),
    });
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderConstrainedBox).additionalConstraints = this._buildConstraints();
  }

  // --- Static factory constructors ---

  /** Creates a SizedBox that expands to fill available space. */
  static expand(opts?: { key?: Key; child?: Widget }): SizedBox {
    return new SizedBox({
      key: opts?.key,
      width: Infinity,
      height: Infinity,
      child: opts?.child,
    });
  }

  /** Creates a SizedBox that shrinks to zero size. */
  static shrink(opts?: { key?: Key; child?: Widget }): SizedBox {
    return new SizedBox({
      key: opts?.key,
      width: 0,
      height: 0,
      child: opts?.child,
    });
  }

  /** Creates a SizedBox with the given width and height. */
  static fromSize(width: number, height: number, opts?: { key?: Key; child?: Widget }): SizedBox {
    return new SizedBox({
      key: opts?.key,
      width,
      height,
      child: opts?.child,
    });
  }

  /** Creates a SizedBox with only a fixed height. */
  static fixedHeight(height: number, opts?: { key?: Key; child?: Widget }): SizedBox {
    return new SizedBox({
      key: opts?.key,
      height,
      child: opts?.child,
    });
  }

  /** Creates a SizedBox with only a fixed width. */
  static fixedWidth(width: number, opts?: { key?: Key; child?: Widget }): SizedBox {
    return new SizedBox({
      key: opts?.key,
      width,
      child: opts?.child,
    });
  }
}
