// Cell type and helpers for the double-buffered terminal screen.
// Amp ref: amp-strings.txt:529716 — q3 createCell, yu EMPTY_CELL, bF8 cellsEqual, sF8 stylesEqual

import { Color, blendColor } from '../core/color.js';

/**
 * Visual style attributes for a single terminal cell.
 * Amp ref: style properties on cell objects (fg, bg, bold, italic, etc.)
 */
export interface CellStyle {
  fg?: Color;
  bg?: Color;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
  inverse?: boolean;
}

/**
 * OSC 8 hyperlink descriptor for a terminal cell.
 * Supports an optional id parameter for link grouping.
 */
export interface CellHyperlink {
  uri: string;
  id?: string;
}

/**
 * Union type for cell hyperlinks: plain string (URI only) or structured object with optional id.
 */
export type CellHyperlinkValue = string | CellHyperlink;

/**
 * A single cell in the terminal grid.
 * Amp ref: q3 createCell — { char, style, width, hyperlink }
 */
export interface Cell {
  char: string;              // single grapheme (default ' ')
  style: CellStyle;          // fg, bg, bold, italic, etc.
  width: number;             // display width (1 or 2 for CJK)
  hyperlink?: CellHyperlinkValue; // OSC 8 hyperlink URL, optionally with id
}

/**
 * Frozen sentinel representing an empty/blank cell.
 * Identity comparison (===) is used as a fast-path optimization in getDiff().
 * Amp ref: yu = q3(' ', {})
 */
export const EMPTY_CELL: Readonly<Cell> = Object.freeze({
  char: ' ',
  style: Object.freeze({}) as CellStyle,
  width: 1,
});

/**
 * Factory function to create a new Cell.
 * Amp ref: q3(char, style, width, hyperlink)
 */
export function createCell(
  char: string = ' ',
  style: CellStyle = {},
  width: number = 1,
  hyperlink?: CellHyperlinkValue,
): Cell {
  return {
    char,
    style: { ...style },
    width,
    hyperlink,
  };
}

/**
 * Compare two optional Color values for equality.
 */
function colorsEqual(a: Color | undefined, b: Color | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return a.equals(b);
}

/**
 * Deep equality check for two CellStyle objects.
 * Amp ref: sF8 stylesEqual
 */
export function stylesEqual(a: CellStyle, b: CellStyle): boolean {
  return (
    colorsEqual(a.fg, b.fg) &&
    colorsEqual(a.bg, b.bg) &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.dim === b.dim &&
    a.inverse === b.inverse
  );
}

/**
 * Deep equality check for two CellHyperlinkValue values.
 * Handles string, object, and undefined forms.
 */
export function hyperlinksEqual(
  a: CellHyperlinkValue | undefined,
  b: CellHyperlinkValue | undefined,
): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;

  const aUri = typeof a === 'string' ? a : a.uri;
  const bUri = typeof b === 'string' ? b : b.uri;
  if (aUri !== bUri) return false;

  const aId = typeof a === 'string' ? undefined : a.id;
  const bId = typeof b === 'string' ? undefined : b.id;
  return aId === bId;
}

/**
 * Deep equality check for two Cell objects.
 * Amp ref: bF8 cellsEqual — compares char, width, style, hyperlink
 */
export function cellsEqual(a: Cell, b: Cell): boolean {
  if (a === b) return true;
  return (
    a.char === b.char &&
    a.width === b.width &&
    stylesEqual(a.style, b.style) &&
    hyperlinksEqual(a.hyperlink, b.hyperlink)
  );
}

/**
 * Creates a deep clone of a Cell.
 */
export function cloneCell(cell: Cell): Cell {
  return {
    char: cell.char,
    style: { ...cell.style },
    width: cell.width,
    hyperlink: cell.hyperlink !== undefined && typeof cell.hyperlink === 'object'
      ? { ...cell.hyperlink }
      : cell.hyperlink,
  };
}

/**
 * A contiguous run of changed cells within a single row.
 * Produced by the diff algorithm to describe a horizontal span of changes.
 */
export interface CellPatch {
  col: number;     // starting column
  cells: Cell[];   // contiguous changed cells
}

/**
 * All cell patches for a single row.
 * Groups CellPatch entries by row for efficient rendering.
 */
export interface RowPatch {
  row: number;       // the row index
  patches: CellPatch[];  // contiguous runs of changed cells in this row
}

/**
 * Blend two CellStyles using alpha compositing on fg/bg colors.
 * Boolean attributes (bold, italic, etc.) are inherited from front.
 * Colors with alpha < 1 are blended using blendColor.
 */
export function blendStyle(front: CellStyle, back: CellStyle): CellStyle {
  let fg: Color | undefined = front.fg;
  let bg: Color | undefined = front.bg;

  // Blend fg color if front fg has alpha < 1
  if (front.fg && front.fg.alpha < 1.0 && back.fg) {
    fg = blendColor(front.fg, back.fg);
  } else if (!front.fg) {
    fg = back.fg;
  }

  // Blend bg color if front bg has alpha < 1
  if (front.bg && front.bg.alpha < 1.0 && back.bg) {
    bg = blendColor(front.bg, back.bg);
  } else if (!front.bg) {
    bg = back.bg;
  }

  return {
    fg,
    bg,
    bold: front.bold ?? back.bold,
    italic: front.italic ?? back.italic,
    underline: front.underline ?? back.underline,
    strikethrough: front.strikethrough ?? back.strikethrough,
    dim: front.dim ?? back.dim,
    inverse: front.inverse ?? back.inverse,
  };
}
