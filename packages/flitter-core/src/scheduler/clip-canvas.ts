// ClipCanvas — wraps a PaintContext and clips all draw operations to a Rect.
// Used by RenderScrollViewport.paint() to clip content to viewport bounds.
// Amp ref: E$ class — clip wrapper for paint context
//
// All draw operations outside the clip rect are silently discarded.
// Draw operations that partially overlap are truncated/intersected to fit.
//
// IMPORTANT: ClipCanvas extends PaintContext so it can be used as a transparent
// drop-in replacement (Amp: E$ is used interchangeably with the canvas).

import { Rect } from '../core/types.js';
import { PaintContext } from './paint-context.js';
import { BOX_DRAWING, type BoxDrawingStyle } from '../painting/border-painter.js';
import { type CellStyle, type CellHyperlinkValue } from '../terminal/cell.js';
import { TextSpan } from '../core/text-span.js';
import { Color } from '../core/color.js';
import { wcwidth } from '../core/wcwidth.js';

/**
 * A canvas wrapper that clips all drawing operations to a specified Rect.
 *
 * Extends PaintContext so it can be used transparently wherever a PaintContext
 * is expected (Amp ref: E$ is a full canvas substitute, not a separate API).
 *
 * ClipCanvas delegates to an underlying PaintContext but silently discards
 * or truncates any draw calls that fall outside the clip region.
 *
 * Amp ref: E$ class — used by scroll viewport paint
 */
export class ClipCanvas extends PaintContext {
  private readonly _innerContext: PaintContext;
  private readonly _clip: Rect;

  constructor(context: PaintContext, clip: Rect) {
    // Use PaintContext.createClipped to set up clip bounds without `as any` casts.
    super(PaintContext.getScreen(context));
    this._innerContext = context;
    this._clip = clip;

    // Set clip bounds via the protected static helper to avoid `as any`
    PaintContext.setClipBounds(this, clip.left, clip.top, clip.width, clip.height);
  }

  /** The clip rectangle for this canvas. */
  get clip(): Rect {
    return this._clip;
  }

  /** The underlying paint context. */
  get context(): PaintContext {
    return this._innerContext;
  }

  /**
   * Override drawChar to clip against our rect and delegate to inner context.
   * Handles CJK wide characters (width 2) — a wide char is rejected if its
   * full width would bleed past the clip boundary.
   */
  override drawChar(col: number, row: number, char: string, style?: CellStyle, width?: number, hyperlink?: CellHyperlinkValue): void {
    if (row < this._clip.top || row >= this._clip.bottom) return;

    const charWidth = width ?? (char.length > 0 ? wcwidth(char.codePointAt(0)!) : 1);
    const effectiveWidth = Math.max(1, charWidth);

    // Check full width fits within clip
    if (col < this._clip.left || col + effectiveWidth > this._clip.right) return;

    this._innerContext.drawChar(col, row, char, style, width, hyperlink);
  }

  /**
   * Override drawText to clip against our rect.
   * Handles CJK wide characters — uses wcwidth for each character and
   * rejects wide chars that would bleed past the clip boundary.
   */
  override drawText(col: number, row: number, text: string, style?: CellStyle): void {
    if (row < this._clip.top || row >= this._clip.bottom) return;

    const clipLeft = this._clip.left;
    const clipRight = this._clip.right;

    let curCol = col;

    for (const char of text) {
      const cp = char.codePointAt(0)!;
      const charWidth = wcwidth(cp);
      if (charWidth === 0) continue; // Skip zero-width characters

      if (curCol + charWidth > clipRight) break;
      if (curCol >= clipLeft && curCol + charWidth <= clipRight) {
        this._innerContext.drawChar(curCol, row, char, style, charWidth);
      }
      curCol += charWidth;
    }
  }

  /**
   * Override drawTextSpan to clip against our rect.
   */
  override drawTextSpan(col: number, row: number, span: TextSpan, maxWidth?: number): number {
    if (row < this._clip.top || row >= this._clip.bottom) return 0;

    const clipMaxWidth = Math.max(0, this._clip.right - col);
    if (clipMaxWidth <= 0) return 0;
    const effectiveMaxWidth = maxWidth !== undefined ? Math.min(maxWidth, clipMaxWidth) : clipMaxWidth;
    return this._innerContext.drawTextSpan(col, row, span, effectiveMaxWidth);
  }

  /**
   * Override fillRect to clip against our rect.
   */
  override fillRect(
    x: number,
    y: number,
    w: number,
    h: number,
    char: string = ' ',
    style?: CellStyle,
  ): void {
    const fillRect = new Rect(x, y, w, h);
    const clipped = fillRect.intersect(this._clip);
    if (clipped.width <= 0 || clipped.height <= 0) return;

    this._innerContext.fillRect(
      clipped.left,
      clipped.top,
      clipped.width,
      clipped.height,
      char,
      style,
    );
  }

  /**
   * Override drawBorder to clip — draws individual border characters via
   * this.drawChar so partially visible borders are rendered correctly
   * instead of drawing a smaller complete border.
   */
  override drawBorder(
    x: number,
    y: number,
    w: number,
    h: number,
    borderStyle: BoxDrawingStyle,
    color?: Color,
  ): void {
    if (w < 2 || h < 2) return;

    const chars = BOX_DRAWING[borderStyle];
    const style: CellStyle = color ? { fg: color } : {};

    // Draw each border character individually via this.drawChar,
    // which clips properly per-character.
    // Corners
    this.drawChar(x, y, chars.tl, style, 1);
    this.drawChar(x + w - 1, y, chars.tr, style, 1);
    this.drawChar(x, y + h - 1, chars.bl, style, 1);
    this.drawChar(x + w - 1, y + h - 1, chars.br, style, 1);

    // Top and bottom edges (horizontal)
    for (let col = x + 1; col < x + w - 1; col++) {
      this.drawChar(col, y, chars.h, style, 1);
      this.drawChar(col, y + h - 1, chars.h, style, 1);
    }

    // Left and right edges (vertical)
    for (let row = y + 1; row < y + h - 1; row++) {
      this.drawChar(x, row, chars.v, style, 1);
      this.drawChar(x + w - 1, row, chars.v, style, 1);
    }
  }

  /**
   * Create a sub-ClipCanvas with a further-restricted clip rect.
   * Overrides PaintContext.withClip to return a ClipCanvas.
   * Accepts either (x, y, w, h) numbers or a single Rect object.
   */
  override withClip(x: number | Rect, y?: number, w?: number, h?: number): ClipCanvas {
    let requestedRect: Rect;
    if (x instanceof Rect) {
      requestedRect = x;
    } else {
      requestedRect = new Rect(x, y!, w!, h!);
    }
    const newClip = this._clip.intersect(requestedRect);
    return new ClipCanvas(this._innerContext, newClip);
  }

  /**
   * Create a sub-ClipCanvas from a Rect (convenience method).
   */
  withClipRect(rect: Rect): ClipCanvas {
    const newClip = this._clip.intersect(rect);
    return new ClipCanvas(this._innerContext, newClip);
  }
}
