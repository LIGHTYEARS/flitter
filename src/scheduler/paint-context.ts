// PaintContext — canvas API for render objects to draw to ScreenBuffer's back buffer.
// Handles offset accumulation, clip rects, text drawing, and border rendering.
// Amp ref: amp-strings.txt — paint context wraps ScreenBuffer for DFS paint traversal

import { ScreenBuffer } from '../terminal/screen-buffer.js';
import { type CellStyle } from '../terminal/cell.js';
import { TextSpan } from '../core/text-span.js';
import { TextStyle } from '../core/text-style.js';
import { Color } from '../core/color.js';
import { wcwidth } from '../core/wcwidth.js';

// ---------------------------------------------------------------------------
// Border character definitions
// ---------------------------------------------------------------------------

export type BorderStyle = 'rounded' | 'solid';

export const BORDER_CHARS: Record<
  BorderStyle,
  { tl: string; tr: string; bl: string; br: string; h: string; v: string }
> = {
  rounded: { tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F', h: '\u2500', v: '\u2502' },
  solid:   { tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518', h: '\u2500', v: '\u2502' },
};

// ---------------------------------------------------------------------------
// TextStyle -> CellStyle converter
// ---------------------------------------------------------------------------

function textStyleToCellStyle(ts: TextStyle): CellStyle {
  const cs: CellStyle = {};
  if (ts.foreground !== undefined) cs.fg = ts.foreground;
  if (ts.background !== undefined) cs.bg = ts.background;
  if (ts.bold !== undefined) cs.bold = ts.bold;
  if (ts.dim !== undefined) cs.dim = ts.dim;
  if (ts.italic !== undefined) cs.italic = ts.italic;
  if (ts.underline !== undefined) cs.underline = ts.underline;
  if (ts.strikethrough !== undefined) cs.strikethrough = ts.strikethrough;
  if (ts.inverse !== undefined) cs.inverse = ts.inverse;
  return cs;
}

// ---------------------------------------------------------------------------
// PaintContext
// ---------------------------------------------------------------------------

/**
 * Canvas API that render objects use to draw to the ScreenBuffer's back buffer.
 * Supports clipping via withClip() which returns a restricted sub-context.
 *
 * All coordinates are absolute screen positions (not relative to clip).
 */
export class PaintContext {
  protected readonly screen: ScreenBuffer;
  protected readonly clipX: number;
  protected readonly clipY: number;
  protected readonly clipW: number;
  protected readonly clipH: number;

  constructor(screen: ScreenBuffer) {
    this.screen = screen;
    this.clipX = 0;
    this.clipY = 0;
    this.clipW = screen.width;
    this.clipH = screen.height;
  }

  /** Internal constructor for clip contexts. */
  protected static createClipped(
    screen: ScreenBuffer,
    clipX: number,
    clipY: number,
    clipW: number,
    clipH: number,
  ): PaintContext {
    const ctx = Object.create(PaintContext.prototype) as PaintContext;
    (ctx as any).screen = screen;
    (ctx as any).clipX = clipX;
    (ctx as any).clipY = clipY;
    (ctx as any).clipW = clipW;
    (ctx as any).clipH = clipH;
    return ctx;
  }

  /**
   * Check if coordinate (x, y) is within the clip rect.
   * For wide characters, checks that the full width fits.
   */
  protected isInClip(x: number, y: number, width: number = 1): boolean {
    const clipRight = this.clipX + this.clipW;
    const clipBottom = this.clipY + this.clipH;
    return (
      x >= this.clipX &&
      x + width <= clipRight &&
      y >= this.clipY &&
      y < clipBottom
    );
  }

  /**
   * Check if just the position is in clip (for single-column check).
   */
  protected isPositionInClip(x: number, y: number): boolean {
    return (
      x >= this.clipX &&
      x < this.clipX + this.clipW &&
      y >= this.clipY &&
      y < this.clipY + this.clipH
    );
  }

  // ---------------------------------------------------------------------------
  // Drawing primitives
  // ---------------------------------------------------------------------------

  /**
   * Draw a single character at (x, y) with optional style and width.
   * Silently ignores draws outside the clip rect.
   */
  drawChar(x: number, y: number, char: string, style?: CellStyle, width?: number): void {
    const charWidth = width ?? (char.length > 0 ? wcwidth(char.codePointAt(0)!) : 1);
    const effectiveWidth = Math.max(1, charWidth);

    // For wide chars, ensure the full width is within clip
    if (!this.isInClip(x, y, effectiveWidth)) return;

    this.screen.setChar(x, y, char, style, effectiveWidth);
  }

  /**
   * Draw a text string starting at (x, y) with optional style.
   * Handles CJK wide characters (width 2). Characters outside clip are skipped.
   */
  drawText(x: number, y: number, text: string, style?: CellStyle): void {
    let curX = x;
    for (const char of text) {
      const cp = char.codePointAt(0)!;
      const w = wcwidth(cp);
      if (w === 0) continue; // Skip zero-width characters

      if (this.isInClip(curX, y, w)) {
        this.screen.setChar(curX, y, char, style, w);
      }
      curX += w;
    }
  }

  /**
   * Draw a TextSpan tree starting at (x, y).
   * Walks the span tree, extracts text + style, draws each character with the span's merged style.
   * Returns the total number of characters drawn (by column width, not grapheme count).
   */
  drawTextSpan(x: number, y: number, span: TextSpan, maxWidth?: number): number {
    let curX = x;
    const limit = maxWidth !== undefined ? x + maxWidth : Infinity;

    span.visitChildren((text: string, textStyle: TextStyle) => {
      const cellStyle = textStyleToCellStyle(textStyle);
      for (const char of text) {
        const cp = char.codePointAt(0)!;
        const w = wcwidth(cp);
        if (w === 0) continue;

        // Check maxWidth limit
        if (curX + w > limit) return;

        if (this.isInClip(curX, y, w)) {
          this.screen.setChar(curX, y, char, cellStyle, w);
        }
        curX += w;
      }
    });

    return curX - x;
  }

  /**
   * Fill a rectangular region with a character and style.
   * Only fills cells within the clip rect.
   */
  fillRect(
    x: number,
    y: number,
    w: number,
    h: number,
    char: string = ' ',
    style?: CellStyle,
  ): void {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (this.isPositionInClip(col, row)) {
          this.screen.setChar(col, row, char, style, 1);
        }
      }
    }
  }

  /**
   * Draw a Unicode box-drawing border.
   * Requires w >= 2 and h >= 2 for a valid border.
   */
  drawBorder(
    x: number,
    y: number,
    w: number,
    h: number,
    borderStyle: BorderStyle,
    color?: Color,
  ): void {
    if (w < 2 || h < 2) return;

    const chars = BORDER_CHARS[borderStyle];
    const style: CellStyle = color ? { fg: color } : {};

    // Top-left corner
    this.drawChar(x, y, chars.tl, style, 1);
    // Top-right corner
    this.drawChar(x + w - 1, y, chars.tr, style, 1);
    // Bottom-left corner
    this.drawChar(x, y + h - 1, chars.bl, style, 1);
    // Bottom-right corner
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
   * Create a clipped sub-context that restricts painting to a rect.
   * The clip is intersected with the current clip rect.
   * Any draw call outside the resulting clip rect is silently ignored.
   */
  withClip(x: number, y: number, w: number, h: number): PaintContext {
    // Intersect the requested clip with the current clip
    const newLeft = Math.max(x, this.clipX);
    const newTop = Math.max(y, this.clipY);
    const newRight = Math.min(x + w, this.clipX + this.clipW);
    const newBottom = Math.min(y + h, this.clipY + this.clipH);

    const clippedW = Math.max(0, newRight - newLeft);
    const clippedH = Math.max(0, newBottom - newTop);

    return PaintContext.createClipped(
      this.screen,
      newLeft,
      newTop,
      clippedW,
      clippedH,
    );
  }
}
