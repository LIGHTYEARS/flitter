// ConstrainedBox widget -- SingleChildRenderObjectWidget for arbitrary constraints
// Framework-completeness addition: no Amp equivalent (Amp uses SizedBox/X0 for all cases)
// Uses RenderConstrainedBox (xU0) with user-supplied BoxConstraints directly
// Gap 32: Standalone ConstrainedBox widget

import { Key } from '../core/key';
import { BoxConstraints } from '../core/box-constraints';
import {
  SingleChildRenderObjectWidget,
  RenderObject,
} from '../framework/render-object';
import { Widget } from '../framework/widget';
import { RenderConstrainedBox } from '../layout/render-constrained';

/**
 * A widget that imposes additional box constraints on its child.
 *
 * Unlike SizedBox (which always creates tight constraints from width/height),
 * ConstrainedBox accepts an arbitrary BoxConstraints object. This enables:
 *
 * - Minimum size enforcement (minWidth / minHeight)
 * - Maximum size capping (maxWidth / maxHeight)
 * - Range constraints (min..max on either axis)
 *
 * The constraints are applied additively: the child receives the intersection
 * of the parent constraints and the additional constraints provided here.
 *
 * ## Example Usage
 *
 * ```typescript
 * // Enforce minimum width of 20, maximum width of 60
 * new ConstrainedBox({
 *   constraints: new BoxConstraints({ minWidth: 20, maxWidth: 60 }),
 *   child: new Text({ text: 'Hello' }),
 * })
 *
 * // Cap height at 10 rows
 * new ConstrainedBox({
 *   constraints: new BoxConstraints({ maxHeight: 10 }),
 *   child: someScrollableContent,
 * })
 * ```
 *
 * ## Layout Algorithm
 *
 * 1. Enforce `constraints` within parent constraints (intersection)
 * 2. Layout child with the enforced constraints
 * 3. Self-size = child size constrained to the enforced constraints
 * 4. No child: self-size = enforced constraints' smallest
 */
export class ConstrainedBox extends SingleChildRenderObjectWidget {
  readonly constraints: BoxConstraints;

  constructor(opts: {
    key?: Key;
    constraints: BoxConstraints;
    child?: Widget;
  }) {
    super({ key: opts.key, child: opts.child });
    this.constraints = opts.constraints;
  }

  createRenderObject(): RenderConstrainedBox {
    return new RenderConstrainedBox({
      additionalConstraints: this.constraints,
    });
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderConstrainedBox).additionalConstraints =
      this.constraints;
  }
}
