// RenderDecoratedBox — single-child render box with decoration (border + background)
// Amp ref: class fE extends j9 — Container with decoration, border, color
// Source: .reference/widgets-catalog.md

import { Offset, Size } from '../core/types';
import { Color } from '../core/color';
import { RenderBox } from '../framework/render-object';
import { PaintContext } from '../scheduler/paint-context';
import { type BoxDrawingStyle } from '../painting/border-painter';
import { type BorderGaps } from '../scheduler/paint-context';

// ---------------------------------------------------------------------------
// Decoration types
// ---------------------------------------------------------------------------

// Re-export for backward compatibility
export type BorderStyle = BoxDrawingStyle;

/**
 * A single side of a border.
 */
export class BorderSide {
  readonly color: Color;
  readonly width: number;
  readonly style: BorderStyle;

  constructor(opts?: { color?: Color; width?: number; style?: BorderStyle }) {
    this.color = opts?.color ?? Color.defaultColor;
    this.width = Math.round(opts?.width ?? 1);
    this.style = opts?.style ?? 'solid';
  }

  static readonly none: BorderSide = new BorderSide({ width: 0 });

  equals(other: BorderSide): boolean {
    return (
      this.color.equals(other.color) &&
      this.width === other.width &&
      this.style === other.style
    );
  }
}

/**
 * Border for all four sides.
 * Amp ref: part of fE._decoration.border
 */
export class Border {
  readonly top: BorderSide;
  readonly right: BorderSide;
  readonly bottom: BorderSide;
  readonly left: BorderSide;

  constructor(opts?: {
    top?: BorderSide;
    right?: BorderSide;
    bottom?: BorderSide;
    left?: BorderSide;
  }) {
    this.top = opts?.top ?? BorderSide.none;
    this.right = opts?.right ?? BorderSide.none;
    this.bottom = opts?.bottom ?? BorderSide.none;
    this.left = opts?.left ?? BorderSide.none;
  }

  /** Create a border with the same side on all edges. */
  static all(side: BorderSide): Border {
    return new Border({ top: side, right: side, bottom: side, left: side });
  }

  /** Total horizontal border width (left + right). */
  get horizontal(): number {
    return this.left.width + this.right.width;
  }

  /** Total vertical border width (top + bottom). */
  get vertical(): number {
    return this.top.width + this.bottom.width;
  }

  equals(other: Border): boolean {
    return (
      this.top.equals(other.top) &&
      this.right.equals(other.right) &&
      this.bottom.equals(other.bottom) &&
      this.left.equals(other.left)
    );
  }
}

/**
 * Box decoration with background color and border.
 * Amp ref: fE._decoration with color and border
 */
export class BoxDecoration {
  readonly color?: Color;
  readonly border?: Border;
  /** Optional gap specifications for top/bottom horizontal border edges. */
  readonly borderGaps?: BorderGaps;

  constructor(opts?: { color?: Color; border?: Border; borderGaps?: BorderGaps }) {
    this.color = opts?.color;
    this.border = opts?.border;
    this.borderGaps = opts?.borderGaps;
  }

  equals(other: BoxDecoration): boolean {
    const colorEq =
      this.color === other.color ||
      (this.color !== undefined && other.color !== undefined && this.color.equals(other.color));
    const borderEq =
      this.border === other.border ||
      (this.border !== undefined && other.border !== undefined && this.border.equals(other.border));
    // borderGaps: reference equality is sufficient (they change every rebuild)
    const gapsEq = this.borderGaps === other.borderGaps;
    return colorEq && borderEq && gapsEq;
  }
}

// ---------------------------------------------------------------------------
// RenderDecoratedBox
// ---------------------------------------------------------------------------

/**
 * A single-child render object that paints a decoration (background color, border)
 * behind/around its child.
 *
 * Layout algorithm:
 * 1. Compute border widths
 * 2. Deflate parent constraints by border widths
 * 3. Layout child with deflated constraints
 * 4. Self-size = child size + border widths, constrained
 *
 * Paint algorithm:
 * 1. Fill background color within border bounds
 * 2. Draw border using Unicode box-drawing characters
 * 3. Recurse into child
 *
 * Amp ref: class fE extends j9, amp-strings.txt
 */
export class RenderDecoratedBox extends RenderBox {
  private _decoration: BoxDecoration;
  private _child: RenderBox | null = null;

  constructor(opts: { decoration: BoxDecoration; child?: RenderBox | null }) {
    super();
    this._decoration = opts.decoration;
    if (opts.child) {
      this.child = opts.child;
    }
  }

  get decoration(): BoxDecoration {
    return this._decoration;
  }

  set decoration(value: BoxDecoration) {
    if (this._decoration.equals(value)) return;
    this._decoration = value;
    this.markNeedsPaint();
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

  /** Compute the total border deflation. */
  private get _borderHorizontal(): number {
    return this._decoration.border?.horizontal ?? 0;
  }

  private get _borderVertical(): number {
    return this._decoration.border?.vertical ?? 0;
  }

  private get _borderLeft(): number {
    return this._decoration.border?.left.width ?? 0;
  }

  private get _borderTop(): number {
    return this._decoration.border?.top.width ?? 0;
  }

  get borderRight(): number {
    return this._decoration.border?.right.width ?? 0;
  }

  get borderBottom(): number {
    return this._decoration.border?.bottom.width ?? 0;
  }

  performLayout(): void {
    const constraints = this.constraints!;
    const h = this._borderHorizontal;
    const v = this._borderVertical;

    if (this._child) {
      const childConstraints = constraints.deflate({
        left: this._borderLeft,
        top: this._borderTop,
        right: this._decoration.border?.right.width ?? 0,
        bottom: this._decoration.border?.bottom.width ?? 0,
      });

      this._child.layout(childConstraints);

      // Set child offset to inside the border
      this._child.offset = new Offset(this._borderLeft, this._borderTop);

      // Self-size = child + border, constrained
      const result = constraints.constrain(
        new Size(this._child.size.width + h, this._child.size.height + v),
      );
      this.size = result;
    } else {
      // No child: size to the border alone, constrained
      const result = constraints.constrain(new Size(h, v));
      this.size = result;
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    this._paintDecoration(context, offset);

    // Paint child
    if (this._child) {
      this._child.paint(context, offset.add(this._child.offset));
    }
  }

  /**
   * Paint the decoration (background color + border) using PaintContext API.
   * Delegates to drawBorderSides so each side's color/style is respected
   * independently — critical when only a subset of sides is set (e.g. left-only).
   */
  private _paintDecoration(ctx: PaintContext, offset: Offset): void {
    const w = this.size.width;
    const h = this.size.height;
    const col = offset.col;
    const row = offset.row;

    if (w <= 0 || h <= 0) return;

    if (this._decoration.color) {
      ctx.fillRect(col, row, w, h, ' ', { bg: this._decoration.color });
    }

    if (this._decoration.border) {
      const border = this._decoration.border;
      const toSide = (s: BorderSide) => {
        if (s.width <= 0) return undefined;
        const color = s.color.equals(Color.defaultColor) ? undefined : s.color;
        return { width: s.width, style: s.style, color };
      };
      ctx.drawBorderSides(col, row, w, h, {
        top: toSide(border.top),
        right: toSide(border.right),
        bottom: toSide(border.bottom),
        left: toSide(border.left),
      }, this._decoration.borderGaps);
    }
  }

  visitChildren(visitor: (child: RenderBox) => void): void {
    if (this._child) {
      visitor(this._child);
    }
  }
}
