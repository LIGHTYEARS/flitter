/**
 * Table Widget — 表格布局组件。
 *
 * 支持固定宽度（fixed）、内容自适应（intrinsic）、弹性（flex）和比例（proportional）
 * 四种列宽策略，可选择绘制圆角边框和行列分隔线。
 *
 * 逆向: JY (Widget) + EQT (RenderObject)
 *   at amp-cli-reversed/modules/1472_tui_components/layout_widgets.js:1080-1436
 *
 * @module
 */

import { Cell } from "../screen/cell.js";
import type { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Element } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { EdgeInsets } from "./edge-insets.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";
import { Padding } from "./padding.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** Column width strategy. */
export type TableColumnWidthType = "fixed" | "intrinsic" | "flex" | "proportional";

/** Configuration for a single table column. */
export interface TableColumnConfig {
  /** Width strategy. */
  widthType: TableColumnWidthType;
  /** Only required when widthType is "fixed". */
  fixedWidth?: number;
}

/** A single cell in the table. */
export interface TableCell {
  /** Child widget rendered inside the cell. */
  child: Widget;
}

/** A single row in the table. */
export interface TableRow {
  /** Cells in this row (must match columnConfigs.length). */
  cells: TableCell[];
}

/** Table widget constructor arguments. */
export interface TableProps {
  /** Optional identity key. */
  key?: Key;
  /** Row data. */
  rows: TableRow[];
  /** Column configuration list. */
  columnConfigs: TableColumnConfig[];
  /** Border color. */
  borderColor?: Color;
  /** Whether to show borders (default true). */
  showBorders?: boolean;
  /** Cell padding (default EdgeInsets.symmetric({ horizontal: 1, vertical: 0 })). */
  cellPadding?: EdgeInsets;
}

// ════════════════════════════════════════════════════
//  RenderTable
// ════════════════════════════════════════════════════

/**
 * Render object for the Table widget.
 *
 * 逆向: EQT extends O9 at layout_widgets.js:1127-1436
 */
export class RenderTable extends RenderBox {
  rows: TableRow[];
  columnConfigs: TableColumnConfig[];
  borderColor: Color | undefined;
  showBorders: boolean;
  cellPadding: EdgeInsets;

  /** Computed column widths after layout. */
  columnWidths: number[] = [];
  /** Computed row heights after layout. */
  rowHeights: number[] = [];

  constructor({
    rows,
    columnConfigs,
    borderColor,
    showBorders,
    cellPadding,
  }: {
    rows: TableRow[];
    columnConfigs: TableColumnConfig[];
    borderColor?: Color;
    showBorders: boolean;
    cellPadding: EdgeInsets;
  }) {
    super();
    this.rows = rows;
    this.columnConfigs = columnConfigs;
    this.borderColor = borderColor;
    this.showBorders = showBorders;
    this.cellPadding = cellPadding;
  }

  /**
   * Update configuration and trigger re-layout.
   *
   * 逆向: EQT.updateTable at layout_widgets.js:1145-1153
   */
  updateTable({
    rows,
    columnConfigs,
    borderColor,
    showBorders,
    cellPadding,
  }: {
    rows: TableRow[];
    columnConfigs: TableColumnConfig[];
    borderColor?: Color;
    showBorders: boolean;
    cellPadding: EdgeInsets;
  }): void {
    this.rows = rows;
    this.columnConfigs = columnConfigs;
    this.borderColor = borderColor;
    this.showBorders = showBorders;
    this.cellPadding = cellPadding;
    this.markNeedsLayout();
  }

  // ════════════════════════════════════════════════════
  //  Layout
  // ════════════════════════════════════════════════════

  /**
   * Perform table layout.
   *
   * 逆向: EQT.performLayout at layout_widgets.js:1154-1161
   */
  override performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) return;
    this.columnWidths = this.calculateColumnWidths(constraints);
    this.rowHeights = this.calculateRowHeights();
    this.layoutCells();
    const totalW = this.getTotalTableWidth();
    const totalH = this.getTotalTableHeight();
    this.setSize(totalW, totalH);
  }

  /**
   * Calculate column widths from constraints.
   *
   * Pass 1: fixed → exact; intrinsic → getMaxIntrinsicWidth(Infinity); flex/proportional → 0
   * Border overhead: 2 + max(0, numCols-1) if showBorders
   * Pass 2: proportional columns distributed by intrinsic ratio
   * Pass 3: flex columns get equal share of remaining
   * Shrink if total exceeds bounded width.
   *
   * 逆向: EQT.calculateColumnWidths at layout_widgets.js:1162-1239
   */
  calculateColumnWidths(constraints: BoxConstraints): number[] {
    const widths: number[] = [];
    let allocated = 0;
    let flexCount = 0;

    // Pass 1: fixed and intrinsic columns
    for (let col = 0; col < this.columnConfigs.length; col++) {
      const config = this.columnConfigs[col];
      if (!config) continue;
      switch (config.widthType) {
        case "fixed": {
          const w = config.fixedWidth ?? 0;
          widths[col] = w;
          allocated += w;
          break;
        }
        case "intrinsic": {
          const w = this.calculateIntrinsicColumnWidth(col);
          widths[col] = w;
          allocated += w;
          break;
        }
        case "flex":
          flexCount++;
          widths[col] = 0;
          break;
        case "proportional":
          widths[col] = 0;
          break;
      }
    }

    // Border overhead
    let borderOverhead = 0;
    if (this.showBorders) {
      borderOverhead += 2;
      borderOverhead += Math.max(0, this.columnConfigs.length - 1);
    }

    const remaining = Math.max(0, constraints.maxWidth - allocated - borderOverhead);
    const minColWidth = 16;

    // Pass 2: proportional columns
    const proportionalCols: Array<{ index: number; intrinsicWidth: number; minWidth: number }> = [];
    let totalIntrinsic = 0;
    // _totalMin mirrors amp's `s` variable — accumulated but not used in distribution
    let _totalMin = 0;

    for (let col = 0; col < this.columnConfigs.length; col++) {
      if (this.columnConfigs[col]?.widthType === "proportional") {
        const intrinsic = this.calculateIntrinsicColumnWidth(col);
        const minW = this.calculateMinColumnWidth(col, minColWidth);
        proportionalCols.push({ index: col, intrinsicWidth: intrinsic, minWidth: minW });
        totalIntrinsic += intrinsic;
        _totalMin += minW;
      }
    }

    if (proportionalCols.length > 0 && totalIntrinsic > 0) {
      // Space available for proportional columns (flex takes 0 initially)
      const spaceForProportional = remaining - flexCount * 0;
      const canFitIntrinsic = totalIntrinsic <= spaceForProportional;
      let leftover = spaceForProportional;

      for (let idx = 0; idx < proportionalCols.length; idx++) {
        const entry = proportionalCols[idx];
        if (!entry) continue;

        if (idx === proportionalCols.length - 1) {
          // Last proportional column gets the remainder
          const w = Math.max(entry.minWidth, leftover);
          widths[entry.index] = canFitIntrinsic ? Math.max(entry.intrinsicWidth, w) : w;
        } else {
          const ratio = entry.intrinsicWidth / totalIntrinsic;
          const share = Math.floor(spaceForProportional * ratio);
          const w = canFitIntrinsic
            ? Math.max(entry.intrinsicWidth, share)
            : Math.max(entry.minWidth, share);
          widths[entry.index] = w;
          leftover -= w;
        }
      }
    } else if (proportionalCols.length > 0) {
      // No intrinsic width info — split remaining evenly
      const share = Math.floor(remaining / proportionalCols.length);
      for (const entry of proportionalCols) {
        widths[entry.index] = share;
      }
    }

    // Pass 3: flex columns — equal share of remaining after all non-flex
    if (flexCount > 0) {
      const currentTotal = widths.reduce((sum, w) => sum + w, 0);
      const flexRemaining = Math.max(0, remaining - currentTotal + allocated);
      const flexShare = Math.floor(flexRemaining / flexCount);
      for (let col = 0; col < widths.length; col++) {
        if (this.columnConfigs[col]?.widthType === "flex") {
          widths[col] = flexShare;
        }
      }
    }

    // Shrink if total exceeds bounded width
    if (constraints.hasBoundedWidth) {
      const maxContentWidth = Math.max(0, constraints.maxWidth - borderOverhead);
      const total = widths.reduce((sum, w) => sum + w, 0);
      if (total > maxContentWidth && total > 0) {
        return this.shrinkColumnWidths(widths, maxContentWidth);
      }
    }

    return widths;
  }

  /**
   * Shrink column widths proportionally to fit within target total.
   *
   * 逆向: EQT.shrinkColumnWidths at layout_widgets.js:1241-1260
   */
  shrinkColumnWidths(widths: number[], target: number): number[] {
    if (widths.length === 0) return [];
    if (target <= 0) return widths.map(() => 0);
    const total = widths.reduce((sum, w) => sum + w, 0);
    if (total <= target || total === 0) return [...widths];

    // Distribute proportionally using floor + remainder distribution
    const floored = widths.map((w) => Math.floor((w / total) * target));
    let remainder = target - floored.reduce((sum, w) => sum + w, 0);
    if (remainder <= 0) return floored;

    // Sort by fractional part descending to give extra pixels to columns with largest fractions
    const fractions = widths.map((w, i) => ({
      index: i,
      fraction: (w / total) * target - (floored[i] ?? 0),
    }));
    fractions.sort((a, b) => b.fraction - a.fraction);

    let i = 0;
    while (remainder > 0) {
      const entry = fractions[i % fractions.length];
      if (!entry) break;
      floored[entry.index] = (floored[entry.index] ?? 0) + 1;
      remainder -= 1;
      i += 1;
    }

    return floored;
  }

  /**
   * Compute the max intrinsic width for a given column (max across all rows).
   *
   * 逆向: EQT.calculateIntrinsicColumnWidth at layout_widgets.js:1262-1280
   */
  calculateIntrinsicColumnWidth(col: number): number {
    let maxW = 0;
    let childIdx = 0;

    for (let row = 0; row < this.rows.length; row++) {
      const rowData = this.rows[row];
      if (!rowData) continue;
      for (let c = 0; c < rowData.cells.length; c++) {
        if (c === col) {
          const cell = rowData.cells[c];
          const child = this._children[childIdx] as RenderBox | undefined;
          if (cell && child) {
            const w = child.getMaxIntrinsicWidth(Number.POSITIVE_INFINITY);
            maxW = Math.max(maxW, w);
          }
        }
        childIdx++;
      }
    }

    return maxW;
  }

  /**
   * Compute the min column width (capped at minFloor + padding).
   *
   * 逆向: EQT.calculateMinColumnWidth at layout_widgets.js:1282-1301
   */
  calculateMinColumnWidth(col: number, minFloor: number): number {
    let minW = 0;
    let childIdx = 0;
    const padH = this.cellPadding.left + this.cellPadding.right;

    for (let row = 0; row < this.rows.length; row++) {
      const rowData = this.rows[row];
      if (!rowData) continue;
      for (let c = 0; c < rowData.cells.length; c++) {
        if (c === col) {
          const child = this._children[childIdx] as RenderBox | undefined;
          if (child) {
            const intrinsicMin = child.getMinIntrinsicWidth(Number.POSITIVE_INFINITY);
            const capped = Math.min(intrinsicMin, minFloor + padH);
            minW = Math.max(minW, capped);
          }
        }
        childIdx++;
      }
    }

    return minW;
  }

  /**
   * Compute row heights — for each row, layout each cell and take max height (min 1).
   *
   * 逆向: EQT.calculateRowHeights at layout_widgets.js:1303-1323
   */
  calculateRowHeights(): number[] {
    const heights: number[] = [];
    let childIdx = 0;

    for (let row = 0; row < this.rows.length; row++) {
      const rowData = this.rows[row];
      if (!rowData) continue;
      let rowH = 1;

      for (let col = 0; col < rowData.cells.length; col++) {
        const cell = rowData.cells[col];
        const child = this._children[childIdx] as RenderBox | undefined;
        const colW = this.columnWidths[col];

        if (!cell || !child) {
          childIdx++;
          continue;
        }

        const h = this.measureCellHeight(child, colW ?? 0);
        rowH = Math.max(rowH, h);
        childIdx++;
      }

      heights[row] = rowH;
    }

    return heights;
  }

  /**
   * Measure the height of a single cell at a given width.
   *
   * 逆向: EQT.measureCellHeight at layout_widgets.js:1392-1395
   */
  measureCellHeight(child: RenderBox, width: number): number {
    const constraints = new BoxConstraints({
      minWidth: width,
      maxWidth: width,
      minHeight: 0,
      maxHeight: Number.POSITIVE_INFINITY,
    });
    child.layout(constraints);
    return child.size.height;
  }

  /**
   * Layout all cells at tight constraints and set their offsets.
   *
   * 逆向: EQT.layoutCells at layout_widgets.js:1325-1347
   */
  layoutCells(): void {
    let childIdx = 0;

    for (let row = 0; row < this.rows.length; row++) {
      const rowData = this.rows[row];
      if (!rowData) continue;

      for (let col = 0; col < rowData.cells.length; col++) {
        const cell = rowData.cells[col];
        const child = this._children[childIdx] as RenderBox | undefined;

        if (!cell || !child) {
          childIdx++;
          continue;
        }

        const colW = this.columnWidths[col] ?? 0;
        const rowH = this.rowHeights[row] ?? 1;
        child.layout(BoxConstraints.tight(colW, rowH));

        const offsetX = this.getColumnOffset(col);
        const offsetY = this.getRowOffset(row);
        child.setOffset(offsetX, offsetY);

        childIdx++;
      }
    }
  }

  // ════════════════════════════════════════════════════
  //  Dimension helpers
  // ════════════════════════════════════════════════════

  /**
   * Total table width including borders.
   *
   * 逆向: EQT.getTotalTableWidth at layout_widgets.js:1349-1353
   */
  getTotalTableWidth(): number {
    let total = this.columnWidths.reduce((sum, w) => sum + w, 0);
    if (this.showBorders) {
      total += 2;
      total += Math.max(0, this.columnWidths.length - 1);
    }
    return total;
  }

  /**
   * Total table height including borders.
   *
   * 逆向: EQT.getTotalTableHeight at layout_widgets.js:1354-1358
   */
  getTotalTableHeight(): number {
    let total = this.rowHeights.reduce((sum, h) => sum + h, 0);
    if (this.showBorders) {
      total += 2;
      total += Math.max(0, this.rowHeights.length - 1);
    }
    return total;
  }

  /**
   * X offset of a column (accounts for left border + inter-column borders).
   *
   * 逆向: EQT.getColumnOffset at layout_widgets.js:1359-1362
   */
  getColumnOffset(col: number): number {
    let offset = this.showBorders ? 1 : 0;
    for (let c = 0; c < col; c++) {
      offset += this.columnWidths[c] ?? 0;
      if (this.showBorders) offset += 1;
    }
    return offset;
  }

  /**
   * Y offset of a row (accounts for top border + inter-row borders).
   *
   * 逆向: EQT.getRowOffset at layout_widgets.js:1363-1367
   */
  getRowOffset(row: number): number {
    let offset = this.showBorders ? 1 : 0;
    for (let r = 0; r < row; r++) {
      offset += this.rowHeights[r] ?? 0;
      if (this.showBorders) offset += 1;
    }
    return offset;
  }

  // ════════════════════════════════════════════════════
  //  Intrinsic sizes
  // ════════════════════════════════════════════════════

  /**
   * 逆向: EQT.getMaxIntrinsicWidth at layout_widgets.js:1369-1391
   */
  override getMaxIntrinsicWidth(_height: number): number {
    let total = 0;
    for (let col = 0; col < this.columnConfigs.length; col++) {
      const config = this.columnConfigs[col];
      if (!config) continue;
      switch (config.widthType) {
        case "fixed":
          total += config.fixedWidth ?? 0;
          break;
        case "intrinsic":
          total += this.calculateIntrinsicColumnWidth(col);
          break;
        case "flex":
          total += 0;
          break;
        case "proportional":
          total += 0;
          break;
      }
    }
    if (this.showBorders) {
      total += 2;
      total += Math.max(0, this.columnConfigs.length - 1);
    }
    return total;
  }

  // ════════════════════════════════════════════════════
  //  Paint
  // ════════════════════════════════════════════════════

  /**
   * Paint borders before children are painted.
   *
   * Flitter's paint convention: offsetX/offsetY are this node's absolute coords.
   * We override paint() (not performPaint()) to mirror amp's EQT.paint which
   * calls paintTableBorders then super.paint (which paints children).
   *
   * 逆向: EQT.paint at layout_widgets.js:1396-1404
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    if (this.showBorders) {
      const absX = offsetX;
      const absY = offsetY;
      this.paintTableBorders(screen, absX, absY);
    }
    // Paint children via super (RenderBox.paint)
    super.paint(screen, offsetX, offsetY);
  }

  /**
   * Draw a single border cell, preserving existing background color.
   *
   * 逆向: EQT.setBorderCell at layout_widgets.js:1405-1412
   */
  setBorderCell(screen: Screen, x: number, y: number, char: string): void {
    const existing = screen.getCell(x, y);
    const bg = existing.style.background.kind !== "default" ? existing.style.background : undefined;
    const style = new TextStyle({
      foreground: this.borderColor,
      background: bg,
    });
    screen.setCell(x, y, new Cell(char, style));
  }

  /**
   * Paint all table borders: outer box + row dividers + column dividers.
   *
   * 逆向: EQT.paintTableBorders at layout_widgets.js:1413-1428
   */
  paintTableBorders(screen: Screen, x: number, y: number): void {
    const totalW = this.getTotalTableWidth();
    const totalH = this.getTotalTableHeight();

    // Draw outer box (corners + top/bottom/left/right edges)
    this.drawBox(screen, x, y, totalW, totalH);

    // Row dividers
    let rowY = y + 1;
    for (let row = 0; row < this.rowHeights.length - 1; row++) {
      rowY += this.rowHeights[row] ?? 0;
      // Draw horizontal line across interior
      for (let cx = x + 1; cx < x + totalW - 1; cx++) {
        this.setBorderCell(screen, cx, rowY, "─");
      }
      // Left/right T-pieces
      this.setBorderCell(screen, x, rowY, "├");
      this.setBorderCell(screen, x + totalW - 1, rowY, "┤");
      rowY += 1;
    }

    // Column dividers
    let colX = x + 1;
    for (let col = 0; col < this.columnWidths.length - 1; col++) {
      colX += this.columnWidths[col] ?? 0;
      // Draw vertical line across interior
      for (let cy = y + 1; cy < y + totalH - 1; cy++) {
        const existing = screen.getCell(colX, cy);
        if (existing.char === "─") {
          this.setBorderCell(screen, colX, cy, "┼");
        } else {
          this.setBorderCell(screen, colX, cy, "│");
        }
      }
      // Top/bottom T-pieces
      this.setBorderCell(screen, colX, y, "┬");
      this.setBorderCell(screen, colX, y + totalH - 1, "┴");
      colX += 1;
    }
  }

  /**
   * Draw outer box using rounded corners.
   *
   * 逆向: EQT.drawBox at layout_widgets.js:1430-1436
   * Corners: ╭╮╰╯  Horizontal: ─  Vertical: │
   */
  drawBox(screen: Screen, x: number, y: number, w: number, h: number): void {
    // Top edge (excluding corners)
    for (let col = 1; col < w - 1; col++) {
      this.setBorderCell(screen, x + col, y, "─");
    }
    // Bottom edge (excluding corners)
    for (let col = 1; col < w - 1; col++) {
      this.setBorderCell(screen, x + col, y + h - 1, "─");
    }
    // Left edge (excluding corners)
    for (let row = 1; row < h - 1; row++) {
      this.setBorderCell(screen, x, y + row, "│");
    }
    // Right edge (excluding corners)
    for (let row = 1; row < h - 1; row++) {
      this.setBorderCell(screen, x + w - 1, y + row, "│");
    }
    // Corners
    this.setBorderCell(screen, x, y, "╭");
    this.setBorderCell(screen, x + w - 1, y, "╮");
    this.setBorderCell(screen, x, y + h - 1, "╰");
    this.setBorderCell(screen, x + w - 1, y + h - 1, "╯");
  }
}

// ════════════════════════════════════════════════════
//  Table Widget
// ════════════════════════════════════════════════════

/**
 * Table widget — renders rows and columns of widgets with optional borders.
 *
 * Children are flattened (row-major order) and wrapped in Padding(cellPadding).
 * The flat `children` array is consumed by MultiChildRenderObjectElement.
 *
 * 逆向: JY extends Dn at layout_widgets.js:1080-1126
 */
export class Table extends Widget {
  readonly rows: TableRow[];
  readonly columnConfigs: TableColumnConfig[];
  readonly borderColor: Color | undefined;
  readonly showBorders: boolean;
  readonly cellPadding: EdgeInsets;

  /** Flat list of wrapped cell widgets (row-major order). */
  readonly children: Widget[];

  constructor({
    key,
    rows,
    columnConfigs,
    borderColor,
    showBorders = true,
    cellPadding = EdgeInsets.symmetric({ horizontal: 1, vertical: 0 }),
  }: TableProps) {
    super({ key });
    this.rows = rows;
    this.columnConfigs = columnConfigs;
    this.borderColor = borderColor;
    this.showBorders = showBorders;
    this.cellPadding = cellPadding;

    // Flatten all cell children into a single list, wrapping each in Padding
    const flatChildren: Widget[] = [];
    for (const row of rows) {
      for (const cell of row.cells) {
        flatChildren.push(new Padding({ padding: cellPadding, child: cell.child }));
      }
    }
    this.children = flatChildren;
  }

  /** Create the RenderTable render object. */
  createRenderObject(): RenderObject {
    return new RenderTable({
      rows: this.rows,
      columnConfigs: this.columnConfigs,
      borderColor: this.borderColor,
      showBorders: this.showBorders,
      cellPadding: this.cellPadding,
    });
  }

  /** Update an existing RenderTable with current configuration. */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderTable).updateTable({
      rows: this.rows,
      columnConfigs: this.columnConfigs,
      borderColor: this.borderColor,
      showBorders: this.showBorders,
      cellPadding: this.cellPadding,
    });
  }

  /** Create the element — uses MultiChildRenderObjectElement for flat children list. */
  createElement(): Element {
    return new MultiChildRenderObjectElement(
      this as unknown as import("../tree/element.js").Widget,
    );
  }
}
