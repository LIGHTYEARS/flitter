// Padding widget — SingleChildRenderObjectWidget that applies padding
// Amp ref: R8 (Padding), RU0 (RenderPadding)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { EdgeInsets } from '../layout/edge-insets';
import { SingleChildRenderObjectWidget, RenderObject } from '../framework/render-object';
import { Widget } from '../framework/widget';
import { RenderPadding } from '../layout/render-padded';

/**
 * A widget that insets its child by the given padding.
 *
 * Uses RenderPadding under the hood.
 *
 * Amp ref: class R8 extends SingleChildRenderObjectWidget
 */
export class Padding extends SingleChildRenderObjectWidget {
  readonly padding: EdgeInsets;

  constructor(opts: { key?: Key; padding: EdgeInsets; child?: Widget }) {
    super({ key: opts.key, child: opts.child });
    this.padding = opts.padding;
  }

  createRenderObject(): RenderPadding {
    return new RenderPadding({ padding: this.padding });
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderPadding).padding = this.padding;
  }
}
