// Double-buffered ScreenBuffer for terminal rendering.
// Widgets paint to the back buffer; after diff computation the buffers swap.
// Amp ref: amp-strings.txt:529716 — class ij (ScreenBuffer), class $F (Buffer)

import {
  type Cell,
  type CellStyle,
  type CellPatch,
  type RowPatch,
  EMPTY_CELL,
  createCell,
  cellsEqual,
  cloneCell,
} from './cell.js';

import { Color } from '../core/color.js';

// Re-export diff types for convenience
export type { CellPatch, RowPatch } from './cell.js';

// ---------------------------------------------------------------------------
// DirtyRegion — rectangular screen area that was modified during painting.
// Used by RepaintBoundary to report which screen regions need diffing.
// GAP-SUM-016: Selective dirty region rendering.
// ---------------------------------------------------------------------------

/**
 * A rectangular region of the screen that was modified during painting.
 * Coordinates are absolute screen positions (col, row).
 */
export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Buffer — single cell grid (internal to ScreenBuffer)
// Amp ref: class $F
// ---------------------------------------------------------------------------

/**
 * Internal cell grid. ScreenBuffer owns two of these (front + back).
 * Uses a flat array in row-major order: index = y * width + x.
 */
export class Buffer {
  width: number;
  height: number;
  private cells: Cell[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = Buffer.createCells(width, height);
  }

  /** Create a flat array of EMPTY_CELL references. */
  private static createCells(width: number, height: number): Cell[] {
    const len = width * height;
    const arr = new Array<Cell>(len);
    for (let i = 0; i < len; i++) {
      arr[i] = EMPTY_CELL;
    }
    return arr;
  }

  /** Get cell at (x, y). Returns EMPTY_CELL for out-of-bounds. */
  getCell(x: number, y: number): Cell {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return EMPTY_CELL;
    }
    return this.cells[y * this.width + x]!;
  }

  /** Set cell at (x, y). Silently no-ops for out-of-bounds. */
  setCell(x: number, y: number, cell: Cell): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.cells[y * this.width + x] = cell;

    // Width-2 cells (CJK): fill trailing columns with continuation marker
    if (cell.width > 1) {
      for (let r = 1; r < cell.width; r++) {
        const nx = x + r;
        if (nx < this.width) {
          this.cells[y * this.width + nx] = createCell('', cell.style, 0);
        }
      }
    }
  }

  /** Fill all cells with EMPTY_CELL. */
  clear(): void {
    const len = this.width * this.height;
    for (let i = 0; i < len; i++) {
      this.cells[i] = EMPTY_CELL;
    }
  }

  /**
   * Fill a rectangular region with EMPTY_CELL.
   * Coordinates are clamped to buffer bounds. GAP-SUM-016.
   */
  clearRegion(x: number, y: number, w: number, h: number): void {
    const startX = Math.max(0, x);
    const startY = Math.max(0, y);
    const endX = Math.min(x + w, this.width);
    const endY = Math.min(y + h, this.height);
    for (let row = startY; row < endY; row++) {
      const base = row * this.width;
      for (let col = startX; col < endX; col++) {
        this.cells[base + col] = EMPTY_CELL;
      }
    }
  }

  /**
   * Resize the buffer. Preserves existing content where possible.
   * New cells are filled with EMPTY_CELL.
   * GAP-SUM-042: When expanding in both dimensions, skip the redundant
   * cell-by-cell copy — the caller (ScreenBuffer.resize) marks
   * needsFullRefresh so the old content will be fully repainted.
   */
  resize(newWidth: number, newHeight: number): void {
    if (newWidth === this.width && newHeight === this.height) return;

    if (newWidth >= this.width && newHeight >= this.height) {
      this.width = newWidth;
      this.height = newHeight;
      this.cells = Buffer.createCells(newWidth, newHeight);
      return;
    }

    const newCells = Buffer.createCells(newWidth, newHeight);
    const copyW = Math.min(this.width, newWidth);
    const copyH = Math.min(this.height, newHeight);

    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        newCells[y * newWidth + x] = this.cells[y * this.width + x]!;
      }
    }

    this.width = newWidth;
    this.height = newHeight;
    this.cells = newCells;
  }

  /** Get raw cell array (for diff scanning). */
  getCells(): Cell[] {
    return this.cells;
  }

  /**
   * Returns a deep copy of the cells array. Each cell is cloned.
   * Use this when you need a snapshot that won't be affected by future mutations.
   */
  getDeepCopiedCells(): Cell[] {
    return this.cells.map(cell => cell === EMPTY_CELL ? EMPTY_CELL : cloneCell(cell));
  }

  /**
   * Deep-copy all cells from this buffer to the target buffer.
   * Target must have the same dimensions. Cells are cloned (not shared by reference).
   */
  copyTo(target: Buffer): void {
    if (target.width !== this.width || target.height !== this.height) {
      target.resize(this.width, this.height);
    }
    const len = this.width * this.height;
    const srcCells = this.cells;
    const dstCells = target.cells;
    for (let i = 0; i < len; i++) {
      const cell = srcCells[i]!;
      dstCells[i] = cell === EMPTY_CELL ? EMPTY_CELL : cloneCell(cell);
    }
  }
}

// ---------------------------------------------------------------------------
// ScreenBuffer — double-buffered screen abstraction
// Amp ref: class ij
// ---------------------------------------------------------------------------

export class ScreenBuffer {
  private frontBuffer: Buffer;
  private backBuffer: Buffer;
  width: number;
  height: number;
  needsFullRefresh: boolean;
  cursorPosition: { x: number; y: number } | null;
  cursorVisible: boolean;
  cursorShape: number; // 0-6 DECSCUSR
  /** Default background color used by Renderer when cell has no bg. */
  defaultBg?: Color;
  /** Default foreground color used by Renderer when cell has no fg. */
  defaultFg?: Color;
  /** Mapping from 256-color indices to RGB values, used for alpha blending with ansi256 colors. */
  indexRgbMapping?: Map<number, Color>;

  /**
   * Dirty regions registered during the current paint pass.
   * When non-empty, getDiff() only scans rows within these regions
   * instead of the full screen. GAP-SUM-016.
   */
  private _dirtyRegions: DirtyRegion[] = [];

  /**
   * Set to true when clear() is called, indicating the entire back buffer was
   * cleared and getDiff() must scan all rows regardless of dirty regions.
   * Reset by getDiff() after consuming. GAP-SUM-016.
   */
  private _fullClearPerformed: boolean = false;

  constructor(width: number = 80, height: number = 24) {
    this.width = width;
    this.height = height;
    this.frontBuffer = new Buffer(width, height);
    this.backBuffer = new Buffer(width, height);
    this.needsFullRefresh = false;
    this.cursorPosition = null;
    this.cursorVisible = false;
    this.cursorShape = 0;
  }

  // --- Accessors ---

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /** Returns the back buffer (the writable surface for painting). */
  getBuffer(): Buffer {
    return this.backBuffer;
  }

  /** Returns the front buffer (the committed frame). */
  getFrontBuffer(): Buffer {
    return this.frontBuffer;
  }

  /** Returns the back buffer. */
  getBackBuffer(): Buffer {
    return this.backBuffer;
  }

  /** Get cell from the back buffer at (x, y). */
  getCell(x: number, y: number): Cell {
    return this.backBuffer.getCell(x, y);
  }

  getCursor(): { x: number; y: number } | null {
    return this.cursorPosition;
  }

  isCursorVisible(): boolean {
    return this.cursorVisible;
  }

  getCursorShape(): number {
    return this.cursorShape;
  }

  get requiresFullRefresh(): boolean {
    return this.needsFullRefresh;
  }

  // --- Mutators ---

  /** Resize both buffers. Marks for full refresh. */
  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.frontBuffer.resize(width, height);
    this.backBuffer.resize(width, height);
    this.needsFullRefresh = true;
    this._dirtyRegions.length = 0;
    this._fullClearPerformed = false;
  }

  /** Set a cell in the back buffer. */
  setCell(x: number, y: number, cell: Cell): void {
    this.backBuffer.setCell(x, y, cell);
  }

  /** Convenience: set a character with optional style and width in the back buffer. */
  setChar(
    x: number,
    y: number,
    char: string,
    style?: CellStyle,
    width?: number,
    hyperlink?: CellHyperlinkValue,
  ): void {
    this.backBuffer.setCell(x, y, createCell(char, style, width, hyperlink));
  }

  /** Clear the back buffer (fill with EMPTY_CELL). Also resets dirty regions
   *  since a full clear means getDiff() must scan all rows. */
  clear(): void {
    this.backBuffer.clear();
    this._dirtyRegions.length = 0;
    this._fullClearPerformed = true;
  }

  /**
   * Fill a rectangular region of the back buffer.
   * Amp ref: fill(x, y, w, h, char = ' ', style = {})
   */
  fill(
    x: number,
    y: number,
    w: number,
    h: number,
    char: string = ' ',
    style: CellStyle = {},
  ): void {
    const maxX = Math.min(x + w, this.width);
    const maxY = Math.min(y + h, this.height);
    const startX = Math.max(x, 0);
    const startY = Math.max(y, 0);

    for (let row = startY; row < maxY; row++) {
      for (let col = startX; col < maxX; col++) {
        this.backBuffer.setCell(col, row, createCell(char, style, 1));
      }
    }
  }

  /** Force full redraw on next getDiff(). */
  markForRefresh(): void {
    this.needsFullRefresh = true;
  }

  // --- Dirty Regions (GAP-SUM-016) ---

  /**
   * Register a rectangular dirty region for the current paint pass.
   * Called by RepaintBoundary (or any subsystem) to indicate which
   * screen area was modified. getDiff() uses these to restrict scanning.
   * Coordinates are clamped to screen bounds.
   */
  addDirtyRegion(region: DirtyRegion): void {
    const x = Math.max(0, Math.min(region.x, this.width));
    const y = Math.max(0, Math.min(region.y, this.height));
    const right = Math.max(x, Math.min(region.x + region.width, this.width));
    const bottom = Math.max(y, Math.min(region.y + region.height, this.height));
    if (right > x && bottom > y) {
      this._dirtyRegions.push({ x, y, width: right - x, height: bottom - y });
    }
  }

  /**
   * Return a read-only view of the current dirty regions.
   * Useful for testing and diagnostics.
   */
  get dirtyRegions(): ReadonlyArray<DirtyRegion> {
    return this._dirtyRegions;
  }

  /**
   * Whether any dirty regions have been registered for this paint pass.
   */
  get hasDirtyRegions(): boolean {
    return this._dirtyRegions.length > 0;
  }

  /**
   * Clear only the registered dirty regions in the back buffer (fill with EMPTY_CELL).
   * Used as an alternative to full clear() when dirty regions are available.
   * Returns true if any regions were cleared, false if there were no dirty regions.
   */
  clearDirtyRegions(): boolean {
    if (this._dirtyRegions.length === 0) return false;
    for (const region of this._dirtyRegions) {
      this.backBuffer.clearRegion(region.x, region.y, region.width, region.height);
    }
    return true;
  }

  /**
   * Reset the dirty regions list. Called after getDiff() consumes the regions.
   */
  resetDirtyRegions(): void {
    this._dirtyRegions.length = 0;
  }

  /**
   * Set default foreground and/or background colors.
   * These are used by the Renderer when a cell has no explicit fg/bg color.
   */
  setDefaultColors(bg?: Color, fg?: Color): void {
    this.defaultBg = bg;
    this.defaultFg = fg;
  }

  /**
   * Set the index-to-RGB mapping table for 256-color indices.
   * Used when doing alpha blending with ansi256 colors — need RGB values to do the blend math.
   */
  setIndexRgbMapping(mapping: Map<number, Color>): void {
    this.indexRgbMapping = mapping;
  }

  // --- Cursor ---

  /** Set cursor position and make visible. */
  setCursor(x: number, y: number): void {
    this.cursorPosition = { x, y };
    this.cursorVisible = true;
  }

  /** Set cursor position without changing visibility. */
  setCursorPositionHint(x: number, y: number): void {
    this.cursorPosition = { x, y };
  }

  /** Hide and null cursor position. */
  clearCursor(): void {
    this.cursorPosition = null;
    this.cursorVisible = false;
  }

  /** Set cursor shape (DECSCUSR 0-6). */
  setCursorShape(shape: number): void {
    this.cursorShape = shape;
  }

  // --- Buffer swap ---

  /**
   * Swap front and back buffers (classic double-buffer swap).
   * After present(), the old front becomes the new back (recycled for next frame).
   * The new back retains the old front's content so getDiff() can compute
   * accurate deltas between the previous frame and the next painted frame.
   * Amp ref: let g = this.frontBuffer; this.frontBuffer = this.backBuffer; this.backBuffer = g;
   */
  present(): void {
    const tmp = this.frontBuffer;
    this.frontBuffer = this.backBuffer;
    this.backBuffer = tmp;
    this._dirtyRegions.length = 0;
    this._fullClearPerformed = false;
  }

  /**
   * Compute diff between front and back buffer.
   * Returns RowPatch[] with only changed rows, each containing contiguous runs
   * of changed cells.
   *
   * GAP-SUM-016: When dirty regions are registered, the incremental path
   * only scans rows within those regions. This avoids full-screen scanning
   * when only a subset of the screen was modified (e.g., a single
   * RepaintBoundary subtree changed).
   *
   * Amp ref: getDiff() scans ALL cells (no dirty region tracking).
   * Uses identity check (===) for EMPTY_CELL as fast-path skip.
   */
  getDiff(): RowPatch[] {
    const patches: RowPatch[] = [];
    const frontCells = this.frontBuffer.getCells();
    const backCells = this.backBuffer.getCells();
    const w = this.width;
    const h = this.height;

    if (this.needsFullRefresh) {
      // Full refresh path: emit all back-buffer cells
      for (let y = 0; y < h; y++) {
        const rowPatches: CellPatch[] = [];
        let runStart = -1;
        let runCells: Cell[] = [];

        for (let x = 0; x < w; ) {
          const cell = backCells[y * w + x] ?? EMPTY_CELL;
          if (runStart === -1) {
            runStart = x;
            runCells = [cell];
          } else {
            runCells.push(cell);
          }
          x += Math.max(1, cell.width);
        }

        if (runCells.length > 0) {
          rowPatches.push({ col: runStart, cells: runCells });
        }
        if (rowPatches.length > 0) {
          patches.push({ row: y, patches: rowPatches });
        }
      }

      this.needsFullRefresh = false;
      this._dirtyRegions.length = 0;
      this._fullClearPerformed = false;
      return patches;
    }

    // Build row scan set from dirty regions (GAP-SUM-016).
    // When dirty regions are present and no full clear was performed,
    // only scan rows that intersect at least one dirty region. Within
    // those rows, we scan the full row width for correctness (column-level
    // clipping is a future optimization).
    // When clear() was called, the entire back buffer was zeroed, so we
    // must scan all rows to detect changes.
    const useDirtyRegions =
      this._dirtyRegions.length > 0 && !this._fullClearPerformed;
    let dirtyRowSet: Set<number> | null = null;
    if (useDirtyRegions) {
      dirtyRowSet = new Set<number>();
      for (const region of this._dirtyRegions) {
        const endY = Math.min(region.y + region.height, h);
        for (let ry = region.y; ry < endY; ry++) {
          dirtyRowSet.add(ry);
        }
      }
    }
    this._dirtyRegions.length = 0;
    this._fullClearPerformed = false;

    // Incremental diff path
    for (let y = 0; y < h; y++) {
      // Skip rows not in any dirty region (when regions are available)
      if (dirtyRowSet && !dirtyRowSet.has(y)) continue;

      const rowPatches: CellPatch[] = [];
      let runStart = -1;
      let runCells: Cell[] = [];

      for (let x = 0; x < w; ) {
        const frontCell = frontCells[y * w + x] ?? EMPTY_CELL;
        const backCell = backCells[y * w + x] ?? EMPTY_CELL;

        // GAP-SUM-044: Identity fast-path — both cells are the exact same
        // EMPTY_CELL singleton. Skip without deep comparison.
        if (frontCell === backCell) {
          if (runCells.length > 0) {
            rowPatches.push({ col: runStart, cells: runCells });
            runStart = -1;
            runCells = [];
          }
          x += Math.max(1, backCell.width);
          continue;
        }

        if (!cellsEqual(frontCell, backCell)) {
          if (runCells.length === 0) {
            runStart = x;
          }
          runCells.push(backCell);
          x += Math.max(1, backCell.width);
        } else {
          if (runCells.length > 0) {
            rowPatches.push({ col: runStart, cells: runCells });
            runStart = -1;
            runCells = [];
          }
          x += Math.max(1, backCell.width);
        }
      }

      // Flush remaining run
      if (runCells.length > 0) {
        rowPatches.push({ col: runStart, cells: runCells });
      }

      if (rowPatches.length > 0) {
        patches.push({ row: y, patches: rowPatches });
      }
    }

    return patches;
  }
}
