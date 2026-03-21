// Divider widget — horizontal line separator
// Amp ref: WF0, DF0 classes in widgets-catalog.md
// LeafRenderObjectWidget with RenderDivider (no children)

import { Key } from '../core/key';
import { Color } from '../core/color';
import { TextStyle } from '../core/text-style';
import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import {
  LeafRenderObjectWidget,
  RenderBox,
  RenderObject,
  type PaintContext,
} from '../framework/render-object';

// ---------------------------------------------------------------------------
// Extended PaintContext for divider painting
// ---------------------------------------------------------------------------

/**
 * PaintContext with setChar for character-level drawing.
 * Matches the pattern used by RenderDecoratedBox.
 */
interface DividerPaintContext extends PaintContext {
  setChar?(col: number, row: number, char: string, style?: { fg?: Color }): void;
}

// ---------------------------------------------------------------------------
// RenderDivider
// ---------------------------------------------------------------------------

/**
 * Render object for the Divider widget.
 * Takes full width from constraints, height = 1.
 * Paints a horizontal line using Unicode '---' (U+2500).
 *
 * Amp ref: DF0 RenderObject
 */
export class RenderDivider extends RenderBox {
  private _color?: Color;

  constructor(color?: Color) {
    super();
    this._color = color;
  }

  get color(): Color | undefined {
    return this._color;
  }

  set color(value: Color | undefined) {
    if (this._color === value) return;
    if (this._color && value && this._color.equals(value)) return;
    this._color = value;
    this.markNeedsPaint();
  }

  performLayout(): void {
    const constraints = this.constraints!;
    // Take full width, height = 1
    const width = constraints.hasBoundedWidth ? constraints.maxWidth : 80;
    this.size = constraints.constrain(new Size(width, 1));
  }

  paint(context: PaintContext, offset: Offset): void {
    const ctx = context as DividerPaintContext;
    if (!ctx.setChar) return;

    const style = this._color ? { fg: this._color } : undefined;
    for (let x = 0; x < this.size.width; x++) {
      ctx.setChar(offset.col + x, offset.row, '\u2500', style);
    }
  }
}

// ---------------------------------------------------------------------------
// Divider Widget
// ---------------------------------------------------------------------------

/**
 * A horizontal line divider widget.
 *
 * Takes the full available width and has a height of 1 row.
 * Draws a horizontal line using Unicode box-drawing characters.
 *
 * Usage:
 *   new Divider()
 *   new Divider({ color: Color.cyan })
 */
export class Divider extends LeafRenderObjectWidget {
  readonly color?: Color;

  constructor(opts?: { key?: Key; color?: Color }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.color = opts?.color;
  }

  createRenderObject(): RenderDivider {
    return new RenderDivider(this.color);
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof RenderDivider) {
      renderObject.color = this.color;
    }
  }
}
