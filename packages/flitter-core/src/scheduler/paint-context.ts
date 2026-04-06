// PaintContext — canvas API for render objects to draw to ScreenBuffer's back buffer.
// Handles offset accumulation, clip rects, text drawing, and border rendering.
// Amp ref: amp-strings.txt — paint context wraps ScreenBuffer for DFS paint traversal

import { ScreenBuffer } from '../terminal/screen-buffer.js';
import { type CellStyle, type CellHyperlinkValue } from '../terminal/cell.js';
import { TextSpan } from '../core/text-span.js';
import { TextStyle } from '../core/text-style.js';
import { Color, blendColor } from '../core/color.js';
import { wcwidth } from '../core/wcwidth.js';
import { BOX_DRAWING, type BoxDrawingStyle } from '../painting/border-painter.js';

// Re-export for backward compatibility — consumers that import from paint-context
// will get the consolidated types from border-painter via these re-exports.
export { BOX_DRAWING as BORDER_CHARS } from '../painting/border-painter.js';
export type { BoxDrawingStyle as BorderStyle } from '../painting/border-painter.js';

// ---------------------------------------------------------------------------
// TextStyle -> CellStyle converter
// ---------------------------------------------------------------------------

export function textStyleToCellStyle(ts: TextStyle): CellStyle {
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

/**
 * Writable view of PaintContext's readonly fields, used exclusively during
 * controlled internal construction (createClipped / setClipBounds).
 */
type WritablePaintContext = {
  screen: ScreenBuffer;
  clipX: number;
  clipY: number;
  clipW: number;
  clipH: number;
};

// ---------------------------------------------------------------------------
// BorderGap types — gap-aware border rendering
// ---------------------------------------------------------------------------

/**
 * Specifies a column range to skip when drawing a horizontal border edge.
 * `start` is the column offset from the box's left edge (inclusive, 0-based,
 * where 0 is the left corner column). `end` is exclusive.
 * Only columns 1 through w-2 (interior edge columns) are affected;
 * corner columns are never skipped.
 */
export interface BorderGap {
  start: number;
  end: number;
}

/**
 * Gap specifications for the top and bottom edges of a border box.
 * Used to skip drawing border characters where overlay text will be placed.
 */
export interface BorderGaps {
  top?: BorderGap[];
  bottom?: BorderGap[];
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
    const w = ctx as unknown as WritablePaintContext;
    w.screen = screen;
    w.clipX = clipX;
    w.clipY = clipY;
    w.clipW = clipW;
    w.clipH = clipH;
    return ctx;
  }

  /**
   * Get the screen buffer from a PaintContext.
   * Used by ClipCanvas to pass screen to super() without casting.
   */
  static getScreen(ctx: PaintContext): ScreenBuffer {
    return ctx.screen;
  }

  /**
   * Set clip bounds on a PaintContext subclass instance.
   * Used by ClipCanvas constructor to set readonly fields during construction.
   */
  static setClipBounds(ctx: PaintContext, x: number, y: number, w: number, h: number): void {
    const m = ctx as unknown as WritablePaintContext;
    m.clipX = x;
    m.clipY = y;
    m.clipW = w;
    m.clipH = h;
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
  drawChar(x: number, y: number, char: string, style?: CellStyle, width?: number, hyperlink?: CellHyperlinkValue): void {
    const charWidth = width ?? (char.length > 0 ? wcwidth(char.codePointAt(0)!) : 1);
    const effectiveWidth = Math.max(1, charWidth);

    if (!this.isInClip(x, y, effectiveWidth)) return;

    const merged = this._mergeWithExistingBg(x, y, style);
    this.screen.setChar(x, y, char, merged, effectiveWidth, hyperlink);
  }

  /**
   * Draw a text string starting at (x, y) with optional style.
   * Handles CJK wide characters (width 2). Characters outside clip are skipped.
   * Preserves existing cell background color when the new style has no bg.
   */
  drawText(x: number, y: number, text: string, style?: CellStyle): void {
    let curX = x;
    for (const char of text) {
      const cp = char.codePointAt(0)!;
      const w = wcwidth(cp);
      if (w === 0) continue; // Skip zero-width characters

      if (this.isInClip(curX, y, w)) {
        const merged = this._mergeWithExistingBg(curX, y, style);
        this.screen.setChar(curX, y, char, merged, w);
      }
      curX += w;
    }
  }

  /**
   * Draw a TextSpan tree starting at (x, y).
   * Walks the span tree, extracts text + style, draws each character with the span's merged style.
   * Preserves existing cell background color when the span style has no bg.
   * Returns the total number of characters drawn (by column width, not grapheme count).
   */
  drawTextSpan(x: number, y: number, span: TextSpan, maxWidth?: number): number {
    let curX = x;
    const limit = maxWidth !== undefined ? x + maxWidth : Infinity;

    span.visitChildren((text: string, textStyle: TextStyle, hyperlink) => {
      const cellStyle = textStyleToCellStyle(textStyle);
      const hlValue: CellHyperlinkValue | undefined = hyperlink
        ? (hyperlink.id ? { uri: hyperlink.uri, id: hyperlink.id } : hyperlink.uri)
        : undefined;
      for (const char of text) {
        const cp = char.codePointAt(0)!;
        const w = wcwidth(cp);
        if (w === 0) continue;

        if (curX + w > limit) return;

        if (this.isInClip(curX, y, w)) {
          const merged = this._mergeWithExistingBg(curX, y, cellStyle);
          this.screen.setChar(curX, y, char, merged, w, hlValue);
        }
        curX += w;
      }
    });

    return curX - x;
  }

  /**
   * Merge a new style with the existing cell's background color.
   * If the new style has no bg, inherit the existing cell's bg.
   */
  private _mergeWithExistingBg(x: number, y: number, style?: CellStyle): CellStyle | undefined {
    if (!style) {
      const existing = this.screen.getCell(x, y);
      if (!existing.style?.bg) return style;
      return { bg: existing.style.bg };
    }

    const existing = this.screen.getCell(x, y);
    let fg = style.fg;
    let bg = style.bg;

    if (fg && fg.alpha < 1.0 && existing.style?.fg) {
      fg = blendColor(fg, existing.style.fg);
    }

    if (!bg && existing.style?.bg) {
      bg = existing.style.bg;
    }

    if (fg !== style.fg || bg !== style.bg) {
      return { ...style, fg, bg };
    }

    return style;
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
   * When gaps is provided, horizontal edge columns within gap ranges are skipped
   * (corners are never skipped; only interior edge columns 1..w-2 are affected).
   */
  drawBorder(
    x: number,
    y: number,
    w: number,
    h: number,
    borderStyle: BoxDrawingStyle,
    color?: Color,
    gaps?: BorderGaps,
  ): void {
    if (w < 2 || h < 2) return;

    const chars = BOX_DRAWING[borderStyle];
    const style: CellStyle = color ? { fg: color } : {};

    // Top-left corner
    this.drawChar(x, y, chars.tl, style, 1);
    // Top-right corner
    this.drawChar(x + w - 1, y, chars.tr, style, 1);
    // Bottom-left corner
    this.drawChar(x, y + h - 1, chars.bl, style, 1);
    // Bottom-right corner
    this.drawChar(x + w - 1, y + h - 1, chars.br, style, 1);

    // Top edge (horizontal) — separate loop to support per-side gap skipping
    const topGaps = gaps?.top ?? [];
    for (let col = x + 1; col < x + w - 1; col++) {
      const relCol = col - x;
      if (topGaps.some(g => relCol >= g.start && relCol < g.end)) continue;
      this.drawChar(col, y, chars.h, style, 1);
    }

    // Bottom edge (horizontal) — separate loop to support per-side gap skipping
    const bottomGaps = gaps?.bottom ?? [];
    for (let col = x + 1; col < x + w - 1; col++) {
      const relCol = col - x;
      if (bottomGaps.some(g => relCol >= g.start && relCol < g.end)) continue;
      this.drawChar(col, y + h - 1, chars.h, style, 1);
    }

    // Left and right edges (vertical)
    for (let row = y + 1; row < y + h - 1; row++) {
      this.drawChar(x, row, chars.v, style, 1);
      this.drawChar(x + w - 1, row, chars.v, style, 1);
    }
  }

  /**
   * Per-side border description for drawBorderSides.
   * A side with width <= 0 is not drawn.
   * When gaps is provided, horizontal edge columns within gap ranges are skipped.
   */
  drawBorderSides(
    x: number,
    y: number,
    w: number,
    h: number,
    sides: {
      top?: { width: number; style: BoxDrawingStyle; color?: Color };
      right?: { width: number; style: BoxDrawingStyle; color?: Color };
      bottom?: { width: number; style: BoxDrawingStyle; color?: Color };
      left?: { width: number; style: BoxDrawingStyle; color?: Color };
    },
    gaps?: BorderGaps,
  ): void {
    if (w <= 0 || h <= 0) return;

    const hasTop = (sides.top?.width ?? 0) > 0;
    const hasRight = (sides.right?.width ?? 0) > 0;
    const hasBottom = (sides.bottom?.width ?? 0) > 0;
    const hasLeft = (sides.left?.width ?? 0) > 0;

    const allPresent = hasTop && hasRight && hasBottom && hasLeft;

    if (allPresent && w >= 2 && h >= 2) {
      const topStyle = sides.top!.style;
      const topColor = sides.top!.color;
      const sameStyle =
        sides.right!.style === topStyle &&
        sides.bottom!.style === topStyle &&
        sides.left!.style === topStyle;
      const sameColor =
        sides.right!.color === topColor &&
        sides.bottom!.color === topColor &&
        sides.left!.color === topColor;
      if (sameStyle && sameColor) {
        // Fast path: delegate to drawBorder, passing gaps through
        this.drawBorder(x, y, w, h, topStyle, topColor, gaps);
        return;
      }
    }

    if (hasTop) {
      const { style, color } = sides.top!;
      const chars = BOX_DRAWING[style];
      const cs: CellStyle = color ? { fg: color } : {};
      const topGaps = gaps?.top ?? [];
      for (let col = x; col < x + w; col++) {
        // Skip gap columns on interior (corners at x and x+w-1 are handled by corner logic below)
        const relCol = col - x;
        if (relCol > 0 && relCol < w - 1 && topGaps.some(g => relCol >= g.start && relCol < g.end)) continue;
        this.drawChar(col, y, chars.h, cs, 1);
      }
    }

    if (hasBottom) {
      const { style, color } = sides.bottom!;
      const chars = BOX_DRAWING[style];
      const cs: CellStyle = color ? { fg: color } : {};
      const bottomGaps = gaps?.bottom ?? [];
      for (let col = x; col < x + w; col++) {
        const relCol = col - x;
        if (relCol > 0 && relCol < w - 1 && bottomGaps.some(g => relCol >= g.start && relCol < g.end)) continue;
        this.drawChar(col, y + h - 1, chars.h, cs, 1);
      }
    }

    if (hasLeft) {
      const { style, color } = sides.left!;
      const chars = BOX_DRAWING[style];
      const cs: CellStyle = color ? { fg: color } : {};
      for (let row = y; row < y + h; row++) {
        this.drawChar(x, row, chars.v, cs, 1);
      }
    }

    if (hasRight) {
      const { style, color } = sides.right!;
      const chars = BOX_DRAWING[style];
      const cs: CellStyle = color ? { fg: color } : {};
      for (let row = y; row < y + h; row++) {
        this.drawChar(x + w - 1, row, chars.v, cs, 1);
      }
    }

    if (w >= 2 && h >= 2) {
      if (hasTop && hasLeft) {
        const chars = BOX_DRAWING[sides.top!.style];
        const cs: CellStyle = sides.top!.color ? { fg: sides.top!.color } : {};
        this.drawChar(x, y, chars.tl, cs, 1);
      }
      if (hasTop && hasRight) {
        const chars = BOX_DRAWING[sides.top!.style];
        const cs: CellStyle = sides.top!.color ? { fg: sides.top!.color } : {};
        this.drawChar(x + w - 1, y, chars.tr, cs, 1);
      }
      if (hasBottom && hasLeft) {
        const chars = BOX_DRAWING[sides.bottom!.style];
        const cs: CellStyle = sides.bottom!.color ? { fg: sides.bottom!.color } : {};
        this.drawChar(x, y + h - 1, chars.bl, cs, 1);
      }
      if (hasBottom && hasRight) {
        const chars = BOX_DRAWING[sides.bottom!.style];
        const cs: CellStyle = sides.bottom!.color ? { fg: sides.bottom!.color } : {};
        this.drawChar(x + w - 1, y + h - 1, chars.br, cs, 1);
      }
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
