// RenderRepaintBoundary -- A render object that caches its subtree's painted
// output in a CellLayer. When the subtree is clean, paint() blits the cached
// cells instead of recursively painting all descendants.
// Gap R02: RepaintBoundary enhancement per .gap/12-repaint-boundary.md
// GAP-SUM-016: Registers dirty region on ScreenBuffer when subtree is repainted.

import { RenderBox, type PaintContext as PaintContextInterface } from '../framework/render-object';
import { CellLayer } from './cell-layer';
import { Offset } from '../core/types';
import { PaintContext } from '../scheduler/paint-context';

/**
 * A render object that is its own repaint boundary.
 *
 * When the subtree is clean (no node within has called markNeedsPaint()),
 * paint() blits the cached CellLayer to the back buffer instead of
 * recursively executing paint() on all descendants.
 *
 * When the subtree is dirty, paint() executes normally, then captures
 * the painted cells into the CellLayer for future reuse. The screen-space
 * rect is registered as a dirty region on the ScreenBuffer so that
 * getDiff() only scans the affected rows (GAP-SUM-016).
 */
export class RenderRepaintBoundary extends RenderBox {
  private _child: RenderBox | null = null;
  private _layer: CellLayer | null = null;

  override get isRepaintBoundary(): boolean {
    return true;
  }

  get layer(): CellLayer | null {
    return this._layer;
  }

  set child(value: RenderBox | null) {
    if (this._child) this.dropChild(this._child);
    this._child = value;
    if (this._child) this.adoptChild(this._child);
  }

  get child(): RenderBox | null {
    return this._child;
  }

  performLayout(): void {
    if (this._child) {
      this._child.layout(this.constraints!);
      this.size = this._child.size;
    } else {
      this.size = this.constraints!.smallest;
    }

    if (this._layer) {
      const w = Math.round(this.size.width);
      const h = Math.round(this.size.height);
      if (this._layer.width !== w || this._layer.height !== h) {
        this._layer.resize(w, h);
      }
    }
  }

  paint(context: PaintContextInterface, offset: Offset): void {
    if (!this._child) return;

    const w = Math.round(this.size.width);
    const h = Math.round(this.size.height);
    const ox = Math.round(offset.col);
    const oy = Math.round(offset.row);

    // FAST PATH: layer is clean and position unchanged -- blit from cache.
    // The blit writes identical cells to what was already in the front buffer
    // from last frame, so no dirty region is needed for getDiff().
    if (
      this._layer &&
      !this._layer.isDirty &&
      !this._needsPaint &&
      this._layer.lastOffsetX === ox &&
      this._layer.lastOffsetY === oy &&
      this._layer.width === w &&
      this._layer.height === h
    ) {
      const screen = PaintContext.getScreen(context as PaintContext);
      this._layer.blitTo(screen.getBackBuffer(), ox, oy);
      return; // SKIP entire subtree
    }

    // SLOW PATH: layer is dirty or missing -- paint subtree and capture
    this._ensureLayer(w, h);

    this._child.paint(context, offset.add(this._child.offset));

    const screen = PaintContext.getScreen(context as PaintContext);
    this._layer!.captureFrom(screen.getBackBuffer(), ox, oy);

    // GAP-SUM-016: Register the repainted region so getDiff() can restrict
    // scanning to only the affected rows.
    screen.addDirtyRegion({ x: ox, y: oy, width: w, height: h });
  }

  private _ensureLayer(w: number, h: number): void {
    if (!this._layer) {
      this._layer = new CellLayer(w, h);
    } else if (this._layer.width !== w || this._layer.height !== h) {
      this._layer.resize(w, h);
    }
  }

  override visitChildren(visitor: (child: RenderBox) => void): void {
    if (this._child) visitor(this._child);
  }

  override detach(): void {
    super.detach();
  }
}
