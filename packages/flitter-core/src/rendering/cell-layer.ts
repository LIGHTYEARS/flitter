// CellLayer -- Cached rectangular cell grid for RepaintBoundary.
// Stores the painted output of a RepaintBoundary subtree in local coordinates.
// When the subtree is clean, cached cells are blit to the screen buffer
// instead of re-executing paint() on the subtree.
// Gap R02: RepaintBoundary enhancement per .gap/12-repaint-boundary.md

import { type Cell, EMPTY_CELL, cloneCell } from '../terminal/cell.js';
import type { Buffer } from '../terminal/screen-buffer.js';

/**
 * Rectangular cell grid caching the painted output of a RepaintBoundary subtree.
 * Stores cells in local coordinates (0,0 is top-left of the boundary's region).
 */
export class CellLayer {
  private _cells: Cell[];
  private _width: number;
  private _height: number;
  private _dirty: boolean = true;

  /** Screen-space offset where this layer was last painted. */
  private _lastOffsetX: number = 0;
  private _lastOffsetY: number = 0;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._cells = CellLayer._createCells(width, height);
  }

  private static _createCells(w: number, h: number): Cell[] {
    const arr = new Array<Cell>(w * h);
    for (let i = 0; i < arr.length; i++) arr[i] = EMPTY_CELL;
    return arr;
  }

  get width(): number {
    return this._width;
  }
  get height(): number {
    return this._height;
  }
  get isDirty(): boolean {
    return this._dirty;
  }
  get lastOffsetX(): number {
    return this._lastOffsetX;
  }
  get lastOffsetY(): number {
    return this._lastOffsetY;
  }

  markDirty(): void {
    this._dirty = true;
  }
  markClean(): void {
    this._dirty = false;
  }

  /** Store a cell at local (x, y) within the layer. */
  setCell(localX: number, localY: number, cell: Cell): void {
    if (
      localX < 0 ||
      localX >= this._width ||
      localY < 0 ||
      localY >= this._height
    )
      return;
    this._cells[localY * this._width + localX] = cell;
  }

  /** Get a cell at local (x, y). Returns EMPTY_CELL for out-of-bounds. */
  getCell(localX: number, localY: number): Cell {
    if (
      localX < 0 ||
      localX >= this._width ||
      localY < 0 ||
      localY >= this._height
    ) {
      return EMPTY_CELL;
    }
    return this._cells[localY * this._width + localX]!;
  }

  /** Resize the layer, discarding cached content and marking dirty. */
  resize(newWidth: number, newHeight: number): void {
    if (newWidth === this._width && newHeight === this._height) return;
    this._width = newWidth;
    this._height = newHeight;
    this._cells = CellLayer._createCells(newWidth, newHeight);
    this._dirty = true;
  }

  /** Clear all cells to EMPTY_CELL. */
  clear(): void {
    for (let i = 0; i < this._cells.length; i++) {
      this._cells[i] = EMPTY_CELL;
    }
  }

  /**
   * Capture cells from a Buffer at the given absolute screen offset.
   * Called after painting a dirty boundary subtree.
   */
  captureFrom(backBuffer: Buffer, screenX: number, screenY: number): void {
    this._lastOffsetX = screenX;
    this._lastOffsetY = screenY;
    for (let ly = 0; ly < this._height; ly++) {
      for (let lx = 0; lx < this._width; lx++) {
        const cell = backBuffer.getCell(screenX + lx, screenY + ly);
        this._cells[ly * this._width + lx] =
          cell === EMPTY_CELL ? EMPTY_CELL : cloneCell(cell);
      }
    }
    this._dirty = false;
  }

  /**
   * Blit cached cells to a Buffer at the given absolute screen offset.
   * Used for clean boundaries -- skips the entire subtree paint.
   */
  blitTo(backBuffer: Buffer, screenX: number, screenY: number): void {
    for (let ly = 0; ly < this._height; ly++) {
      for (let lx = 0; lx < this._width; ) {
        const cell = this._cells[ly * this._width + lx];
        if (cell !== EMPTY_CELL) {
          backBuffer.setCell(screenX + lx, screenY + ly, cloneCell(cell));
        }
        lx += Math.max(1, cell.width);
      }
    }
  }

  /** Dispose all cached cells. */
  dispose(): void {
    this._cells = [];
    this._width = 0;
    this._height = 0;
    this._dirty = true;
  }
}
