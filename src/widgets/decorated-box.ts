// DecoratedBox widget — SingleChildRenderObjectWidget wrapper around RenderDecoratedBox
// Amp ref: part of A8 (Container) decoration support
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { SingleChildRenderObjectWidget, RenderObject } from '../framework/render-object';
import { Widget } from '../framework/widget';
import { RenderDecoratedBox, BoxDecoration } from '../layout/render-decorated';

/**
 * A widget that paints a BoxDecoration (background color, border)
 * behind/around its child.
 *
 * This is a thin widget wrapper around RenderDecoratedBox.
 */
export class DecoratedBox extends SingleChildRenderObjectWidget {
  readonly decoration: BoxDecoration;

  constructor(opts: { key?: Key; decoration: BoxDecoration; child?: Widget }) {
    super({ key: opts.key, child: opts.child });
    this.decoration = opts.decoration;
  }

  createRenderObject(): RenderDecoratedBox {
    return new RenderDecoratedBox({ decoration: this.decoration });
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderDecoratedBox).decoration = this.decoration;
  }
}
