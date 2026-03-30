// BorderPainter — extended box-drawing character utilities
// Provides junction characters (T, cross) and composite border painting
// beyond the basic rectangular border in PaintContext.drawBorder().
//
// Amp ref: GJH custom RenderObject uses these for internal grid dividers
// with T-junctions at intersections.

import type { PaintContext } from '../scheduler/paint-context';
import type { Color } from '../core/color';

// ---------------------------------------------------------------------------
// Extended Box-Drawing Character Sets
// ---------------------------------------------------------------------------

/**
 * Full set of box-drawing characters including junctions.
 *
 * Layout reference (solid style):
 *   ┌───┬───┐
 *   │   │   │
 *   ├───┼───┤
 *   │   │   │
 *   └───┴───┘
 */
export interface BoxDrawingChars {
  // Corners
  readonly tl: string; // top-left
  readonly tr: string; // top-right
  readonly bl: string; // bottom-left
  readonly br: string; // bottom-right
  // Edges
  readonly h: string;  // horizontal
  readonly v: string;  // vertical
  // T-junctions
  readonly teeDown: string;  // ┬ (top edge, junction going down)
  readonly teeUp: string;    // ┴ (bottom edge, junction going up)
  readonly teeRight: string; // ├ (left edge, junction going right)
  readonly teeLeft: string;  // ┤ (right edge, junction going left)
  // Cross
  readonly cross: string;    // ┼ (4-way intersection)
}

export type BoxDrawingStyle = 'rounded' | 'solid' | 'dashed' | 'double';

export const BOX_DRAWING: Record<BoxDrawingStyle, BoxDrawingChars> = {
  rounded: {
    tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F',
    h: '\u2500', v: '\u2502',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  solid: {
    tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518',
    h: '\u2500', v: '\u2502',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  dashed: {
    tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518',
    h: '\u2504', v: '\u2506',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  double: {
    tl: '\u2554', tr: '\u2557', bl: '\u255A', br: '\u255D',
    h: '\u2550', v: '\u2551',
    teeDown: '\u2566', teeUp: '\u2569', teeRight: '\u2560', teeLeft: '\u2563',
    cross: '\u256C',
  },
};

// ---------------------------------------------------------------------------
// Border Painting Utilities
// ---------------------------------------------------------------------------

export interface BorderPaintStyle {
  readonly style?: BoxDrawingStyle;
  readonly color?: Color;
}

/**
 * Draw a horizontal divider across a bordered region.
 * Produces: ├───────┤ (teeRight + horizontal + teeLeft)
 *
 * @param ctx   PaintContext to draw on
 * @param x     Left edge X (the ├ position)
 * @param y     Row to draw on
 * @param width Total width including junction chars
 * @param opts  Style and color options
 */
export function drawHorizontalDivider(
  ctx: PaintContext,
  x: number,
  y: number,
  width: number,
  opts?: BorderPaintStyle,
): void {
  if (width < 2) return;
  const chars = BOX_DRAWING[opts?.style ?? 'solid'];
  const cellStyle = opts?.color ? { fg: opts.color } : {};

  ctx.drawChar(x, y, chars.teeRight, cellStyle, 1);
  for (let col = x + 1; col < x + width - 1; col++) {
    ctx.drawChar(col, y, chars.h, cellStyle, 1);
  }
  ctx.drawChar(x + width - 1, y, chars.teeLeft, cellStyle, 1);
}

/**
 * Draw a vertical divider within a bordered region.
 * Produces:  ┬
 *            │
 *            │
 *            ┴
 *
 * @param ctx    PaintContext to draw on
 * @param x      Column to draw on
 * @param y      Top edge Y (the ┬ position)
 * @param height Total height including junction chars
 * @param opts   Style and color options
 */
export function drawVerticalDivider(
  ctx: PaintContext,
  x: number,
  y: number,
  height: number,
  opts?: BorderPaintStyle,
): void {
  if (height < 2) return;
  const chars = BOX_DRAWING[opts?.style ?? 'solid'];
  const cellStyle = opts?.color ? { fg: opts.color } : {};

  ctx.drawChar(x, y, chars.teeDown, cellStyle, 1);
  for (let row = y + 1; row < y + height - 1; row++) {
    ctx.drawChar(x, row, chars.v, cellStyle, 1);
  }
  ctx.drawChar(x, y + height - 1, chars.teeUp, cellStyle, 1);
}

/**
 * Draw a full grid border with internal dividers.
 *
 * @param ctx       PaintContext
 * @param x         Left edge
 * @param y         Top edge
 * @param width     Total width
 * @param height    Total height
 * @param colSplits Array of X offsets (relative to x) for vertical dividers
 * @param rowSplits Array of Y offsets (relative to y) for horizontal dividers
 * @param opts      Style and color
 */
export function drawGridBorder(
  ctx: PaintContext,
  x: number,
  y: number,
  width: number,
  height: number,
  colSplits: number[],
  rowSplits: number[],
  opts?: BorderPaintStyle,
): void {
  if (width < 2 || height < 2) return;
  const chars = BOX_DRAWING[opts?.style ?? 'solid'];
  const cellStyle = opts?.color ? { fg: opts.color } : {};

  // 1. Draw outer border (corners + edges)
  ctx.drawChar(x, y, chars.tl, cellStyle, 1);
  ctx.drawChar(x + width - 1, y, chars.tr, cellStyle, 1);
  ctx.drawChar(x, y + height - 1, chars.bl, cellStyle, 1);
  ctx.drawChar(x + width - 1, y + height - 1, chars.br, cellStyle, 1);

  // Top and bottom horizontal edges
  for (let col = x + 1; col < x + width - 1; col++) {
    ctx.drawChar(col, y, chars.h, cellStyle, 1);
    ctx.drawChar(col, y + height - 1, chars.h, cellStyle, 1);
  }

  // Left and right vertical edges
  for (let row = y + 1; row < y + height - 1; row++) {
    ctx.drawChar(x, row, chars.v, cellStyle, 1);
    ctx.drawChar(x + width - 1, row, chars.v, cellStyle, 1);
  }

  // 2. Draw column dividers (vertical lines with T-junctions at top/bottom)
  for (const cx of colSplits) {
    const absX = x + cx;
    if (absX <= x || absX >= x + width - 1) continue;

    // Top T-junction
    ctx.drawChar(absX, y, chars.teeDown, cellStyle, 1);
    // Vertical line
    for (let row = y + 1; row < y + height - 1; row++) {
      ctx.drawChar(absX, row, chars.v, cellStyle, 1);
    }
    // Bottom T-junction
    ctx.drawChar(absX, y + height - 1, chars.teeUp, cellStyle, 1);
  }

  // 3. Draw row dividers (horizontal lines with T-junctions at left/right)
  for (const ry of rowSplits) {
    const absY = y + ry;
    if (absY <= y || absY >= y + height - 1) continue;

    // Left T-junction
    ctx.drawChar(x, absY, chars.teeRight, cellStyle, 1);
    // Horizontal line
    for (let col = x + 1; col < x + width - 1; col++) {
      ctx.drawChar(col, absY, chars.h, cellStyle, 1);
    }
    // Right T-junction
    ctx.drawChar(x + width - 1, absY, chars.teeLeft, cellStyle, 1);
  }

  // 4. Draw cross junctions at intersections
  for (const cx of colSplits) {
    for (const ry of rowSplits) {
      const absX = x + cx;
      const absY = y + ry;
      if (absX <= x || absX >= x + width - 1) continue;
      if (absY <= y || absY >= y + height - 1) continue;
      ctx.drawChar(absX, absY, chars.cross, cellStyle, 1);
    }
  }
}
