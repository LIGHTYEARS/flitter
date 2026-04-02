// RenderPadding — single-child render box that applies padding
// Amp ref: class RU0 extends j9 — deflates constraints by padding, offsets child
// Source: .reference/widgets-catalog.md

import { Offset, Size } from '../core/types';
import { RenderBox, PaintContext } from '../framework/render-object';
import { EdgeInsets } from './edge-insets';

/**
 * A single-child render object that insets its child by the given padding.
 *
 * Layout algorithm (from Amp RU0.performLayout):
 * 1. Deflate parent constraints by padding amounts
 * 2. Layout child with deflated constraints
 * 3. Set child offset to (padding.left, padding.top)
 * 4. Self-size = child size + padding, constrained to parent constraints
 * 5. If no child: self-size = padding only, constrained
 *
 * Amp ref: class RU0 extends j9, amp-strings.txt
 */
export class RenderPadding extends RenderBox {
  private _padding: EdgeInsets;
  private _child: RenderBox | null = null;

  constructor(opts: { padding: EdgeInsets; child?: RenderBox | null }) {
    super();
    this._padding = opts.padding;
    if (opts.child) {
      this.child = opts.child;
    }
  }

  get padding(): EdgeInsets {
    return this._padding;
  }

  set padding(value: EdgeInsets) {
    if (this._padding.equals(value)) return;
    this._padding = value;
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

  // Amp ref: RU0.performLayout()
  performLayout(): void {
    const constraints = this.constraints!;
    const h = this._padding.horizontal;
    const v = this._padding.vertical;

    if (this._child) {
      const childConstraints = constraints.deflate(this._padding);

      this._child.layout(childConstraints);

      this._child.offset = new Offset(this._padding.left, this._padding.top);

      const result = constraints.constrain(
        new Size(this._child.size.width + h, this._child.size.height + v),
      );
      this.size = result;
    } else {
      const result = constraints.constrain(new Size(h, v));
      this.size = result;
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    if (this._child) {
      // Recurse into child with accumulated offset
      this._child.paint(context, offset.add(this._child.offset));
    }
  }

  visitChildren(visitor: (child: RenderBox) => void): void {
    if (this._child) {
      visitor(this._child);
    }
  }
}
