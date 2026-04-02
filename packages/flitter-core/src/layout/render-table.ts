// RenderTable — proper N-column table with custom layout and border painting
// Amp ref: class XYH — full table RenderObject with column width modes,
//   border painting, cell padding, and proportional shrinking
//
// Column width modes:
//   fixed(n)    — exact width in characters
//   flex(f)     — proportional share of remaining space
//   intrinsic() — measure children, use maximum width

import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import { Color } from '../core/color';
import { ContainerRenderBox, RenderBox, ParentData } from '../framework/render-object';
import { PaintContext } from '../scheduler/paint-context';
import { BOX_DRAWING, type BoxDrawingStyle } from '../painting/border-painter';

// ---------------------------------------------------------------------------
// Column Width Specification
// ---------------------------------------------------------------------------

export type TableColumnWidthType = 'fixed' | 'flex' | 'intrinsic';

export class TableColumnWidth {
  readonly type: TableColumnWidthType;
  readonly value: number;

  private constructor(type: TableColumnWidthType, value: number) {
    this.type = type;
    this.value = value;
  }

  /** Fixed width in characters. */
  static fixed(width: number): TableColumnWidth {
    return new TableColumnWidth('fixed', width);
  }

  /** Proportional share of remaining space. */
  static flex(factor: number = 1): TableColumnWidth {
    return new TableColumnWidth('flex', factor);
  }

  /** Width determined by measuring children (max intrinsic width). */
  static intrinsic(): TableColumnWidth {
    return new TableColumnWidth('intrinsic', 0);
  }
}

// ---------------------------------------------------------------------------
// Table Parent Data
// ---------------------------------------------------------------------------

/**
 * Parent data for children of RenderTable.
 * Stores the row and column indices for each cell.
 */
export class TableCellParentData extends ParentData {
  row: number = 0;
  col: number = 0;
}

// ---------------------------------------------------------------------------
// RenderTable Configuration
// ---------------------------------------------------------------------------

export interface TableConfig {
  /** Number of columns. */
  columns: number;
  /** Column width specifications. If shorter than `columns`, defaults to flex(1). */
  columnWidths?: TableColumnWidth[];
  /** Whether to draw borders between cells. Default: false. */
  showBorder?: boolean;
  /** Border drawing style. Default: 'solid'. */
  borderStyle?: BoxDrawingStyle;
  /** Border color. */
  borderColor?: Color;
  /** Cell padding (chars). Default: 0. */
  cellPadding?: number;
}

// ---------------------------------------------------------------------------
// RenderTable
// ---------------------------------------------------------------------------

/**
 * A multi-child RenderBox that lays out children in an N-column grid.
 *
 * Children are placed in row-major order:
 *   [row0-col0, row0-col1, ..., row1-col0, row1-col1, ...]
 *
 * Features:
 * - N-column support with configurable column widths
 * - Column width modes: fixed, flex, intrinsic
 * - Optional border painting with box-drawing characters
 * - Cell padding support
 *
 * Amp ref: class XYH
 */
export class RenderTable extends ContainerRenderBox {
  private _columns: number;
  private _columnWidths: TableColumnWidth[];
  private _showBorder: boolean;
  private _borderStyle: BoxDrawingStyle;
  private _borderColor: Color | undefined;
  private _cellPadding: number;

  // Computed during layout
  private _computedColWidths: number[] = [];
  private _computedRowHeights: number[] = [];

  constructor(config: TableConfig) {
    super();
    this._columns = config.columns;
    this._columnWidths = config.columnWidths ?? [];
    this._showBorder = config.showBorder ?? false;
    this._borderStyle = config.borderStyle ?? 'solid';
    this._borderColor = config.borderColor;
    this._cellPadding = config.cellPadding ?? 0;
  }

  // --- Config setters ---

  get columns(): number { return this._columns; }
  set columns(v: number) {
    if (this._columns === v) return;
    this._columns = v;
    this.markNeedsLayout();
  }

  get columnWidths(): TableColumnWidth[] { return this._columnWidths; }
  set columnWidths(v: TableColumnWidth[]) {
    this._columnWidths = v;
    this.markNeedsLayout();
  }

  get showBorder(): boolean { return this._showBorder; }
  set showBorder(v: boolean) {
    if (this._showBorder === v) return;
    this._showBorder = v;
    this.markNeedsLayout();
  }

  get borderStyle(): BoxDrawingStyle { return this._borderStyle; }
  set borderStyle(v: BoxDrawingStyle) {
    if (this._borderStyle === v) return;
    this._borderStyle = v;
    this.markNeedsPaint();
  }

  get borderColor(): Color | undefined { return this._borderColor; }
  set borderColor(v: Color | undefined) {
    this._borderColor = v;
    this.markNeedsPaint();
  }

  get cellPadding(): number { return this._cellPadding; }
  set cellPadding(v: number) {
    if (this._cellPadding === v) return;
    this._cellPadding = v;
    this.markNeedsLayout();
  }

  // --- Parent data ---

  setupParentData(child: RenderBox): void {
    if (!(child.parentData instanceof TableCellParentData)) {
      child.parentData = new TableCellParentData();
    }
  }

  // --- Layout ---

  performLayout(): void {
    const constraints = this.constraints!;
    const children = this.children;
    const cols = this._columns;
    const rows = Math.ceil(children.length / cols);
    const pad = this._cellPadding;
    const pad2 = pad * 2;

    if (cols === 0 || rows === 0 || children.length === 0) {
      this._computedColWidths = [];
      this._computedRowHeights = [];
      this.size = constraints.constrain(Size.zero);
      return;
    }

    // Border overhead
    const borderColDividers = this._showBorder ? cols - 1 : 0; // vertical lines between columns
    const borderOuterH = this._showBorder ? 2 : 0; // left + right outer borders
    const borderRowDividers = this._showBorder ? rows - 1 : 0;
    const borderOuterV = this._showBorder ? 2 : 0;

    const availableWidth = Math.max(0,
      constraints.maxWidth - borderOuterH - borderColDividers,
    );

    // --- Step 1: Resolve column widths ---
    const colWidths = new Array(cols).fill(0);

    // First pass: fixed and intrinsic widths
    let fixedTotal = 0;
    let flexTotal = 0;

    for (let c = 0; c < cols; c++) {
      const spec = this._columnWidths[c] ?? TableColumnWidth.flex(1);
      if (spec.type === 'fixed') {
        colWidths[c] = spec.value;
        fixedTotal += spec.value;
      } else if (spec.type === 'intrinsic') {
        // Measure max width needed by children in this column
        let maxW = 0;
        for (let r = 0; r < rows; r++) {
          const childIdx = r * cols + c;
          if (childIdx < children.length) {
            const child = children[childIdx];
            // Use loose constraints to measure intrinsic width
            child.layout(new BoxConstraints({
              minWidth: 0,
              maxWidth: availableWidth,
              minHeight: 0,
              maxHeight: Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : Infinity,
            }));
            maxW = Math.max(maxW, child.size.width - pad2);
          }
        }
        colWidths[c] = Math.max(0, maxW);
        fixedTotal += colWidths[c];
      } else {
        flexTotal += spec.value;
      }
    }

    // Second pass: distribute remaining space to flex columns
    const remainingWidth = Math.max(0, availableWidth - fixedTotal - pad2 * cols);
    for (let c = 0; c < cols; c++) {
      const spec = this._columnWidths[c] ?? TableColumnWidth.flex(1);
      if (spec.type === 'flex' && flexTotal > 0) {
        colWidths[c] = Math.floor((spec.value / flexTotal) * remainingWidth);
      }
    }

    // Adjust rounding errors
    const totalColWidth = colWidths.reduce((a: number, b: number) => a + b, 0);
    const colRoundingError = remainingWidth - (totalColWidth - fixedTotal);
    if (colRoundingError > 0 && flexTotal > 0) {
      // Find first flex column and add the remainder
      for (let c = 0; c < cols; c++) {
        const spec = this._columnWidths[c] ?? TableColumnWidth.flex(1);
        if (spec.type === 'flex') {
          colWidths[c] += colRoundingError;
          break;
        }
      }
    }

    this._computedColWidths = colWidths;

    // --- Step 2: Layout children and compute row heights ---
    const rowHeights = new Array(rows).fill(0);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const childIdx = r * cols + c;
        if (childIdx >= children.length) continue;

        const child = children[childIdx];
        const cellWidth = colWidths[c] + pad2;

        const cellConstraints = new BoxConstraints({
          minWidth: cellWidth,
          maxWidth: cellWidth,
          minHeight: 0,
          maxHeight: Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : Infinity,
        });

        child.layout(cellConstraints);

        // Update parent data
        const pd = child.parentData as TableCellParentData;
        pd.row = r;
        pd.col = c;

        rowHeights[r] = Math.max(rowHeights[r], child.size.height);
      }
    }

    this._computedRowHeights = rowHeights;

    // --- Step 3: Position children ---
    let currentY = this._showBorder ? 1 : 0; // skip top border

    for (let r = 0; r < rows; r++) {
      let currentX = this._showBorder ? 1 : 0; // skip left border

      for (let c = 0; c < cols; c++) {
        const childIdx = r * cols + c;
        if (childIdx >= children.length) continue;

        const child = children[childIdx];
        child.offset = new Offset(currentX, currentY);

        currentX += colWidths[c] + pad2;
        if (this._showBorder && c < cols - 1) {
          currentX += 1; // column divider
        }
      }

      currentY += rowHeights[r];
      if (this._showBorder && r < rows - 1) {
        currentY += 1; // row divider
      }
    }

    // --- Step 4: Compute total size ---
    const totalWidth = colWidths.reduce((a: number, b: number) => a + b, 0)
      + pad2 * cols
      + borderColDividers
      + borderOuterH;
    const totalHeight = rowHeights.reduce((a: number, b: number) => a + b, 0)
      + borderRowDividers
      + borderOuterV;

    this.size = constraints.constrain(new Size(totalWidth, totalHeight));
  }

  // --- Paint ---

  paint(context: PaintContext, offset: Offset): void {
    const w = this.size.width;
    const h = this.size.height;
    if (w <= 0 || h <= 0) return;

    // Paint children first
    for (const child of this.children) {
      child.paint(context, offset.add(child.offset));
    }

    // Paint borders
    if (this._showBorder) {
      this._paintBorders(context, offset);
    }
  }

  private _paintBorders(ctx: PaintContext, offset: Offset): void {
    const w = this.size.width;
    const h = this.size.height;
    const col = offset.col;
    const row = offset.row;
    const chars = BOX_DRAWING[this._borderStyle];
    const style = this._borderColor ? { fg: this._borderColor } : {};
    const cols = this._columns;
    const rows = this._computedRowHeights.length;
    const pad2 = this._cellPadding * 2;

    // Outer border
    ctx.drawChar(col, row, chars.tl, style, 1);
    ctx.drawChar(col + w - 1, row, chars.tr, style, 1);
    ctx.drawChar(col, row + h - 1, chars.bl, style, 1);
    ctx.drawChar(col + w - 1, row + h - 1, chars.br, style, 1);

    for (let c = col + 1; c < col + w - 1; c++) {
      ctx.drawChar(c, row, chars.h, style, 1);
      ctx.drawChar(c, row + h - 1, chars.h, style, 1);
    }
    for (let r = row + 1; r < row + h - 1; r++) {
      ctx.drawChar(col, r, chars.v, style, 1);
      ctx.drawChar(col + w - 1, r, chars.v, style, 1);
    }

    // Column dividers
    const colDividerXs: number[] = [];
    let cx = col + 1;
    for (let c = 0; c < cols - 1; c++) {
      cx += this._computedColWidths[c] + pad2;
      colDividerXs.push(cx);
      // Top T-junction
      ctx.drawChar(cx, row, chars.teeDown, style, 1);
      // Vertical line
      for (let r = row + 1; r < row + h - 1; r++) {
        ctx.drawChar(cx, r, chars.v, style, 1);
      }
      // Bottom T-junction
      ctx.drawChar(cx, row + h - 1, chars.teeUp, style, 1);
      cx += 1; // the divider column
    }

    // Row dividers
    let ry = row + 1;
    for (let r = 0; r < rows - 1; r++) {
      ry += this._computedRowHeights[r];

      // Left T-junction
      ctx.drawChar(col, ry, chars.teeRight, style, 1);
      // Horizontal line
      for (let c = col + 1; c < col + w - 1; c++) {
        ctx.drawChar(c, ry, chars.h, style, 1);
      }
      // Right T-junction
      ctx.drawChar(col + w - 1, ry, chars.teeLeft, style, 1);

      // Cross junctions at column intersections
      for (const dx of colDividerXs) {
        ctx.drawChar(dx, ry, chars.cross, style, 1);
      }

      ry += 1; // the divider row
    }
  }
}
