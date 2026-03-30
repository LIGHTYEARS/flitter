// ClipRect widget — SingleChildRenderObjectWidget that clips child painting to bounds
// Amp ref: nv class — clips child painting to parent bounds
// Used to prevent child content from overflowing its allocated area

import { Key } from '../core/key';
import { Offset, Size, Rect } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import {
  SingleChildRenderObjectWidget,
  RenderBox,
  RenderObject,
  type PaintContext,
} from '../framework/render-object';
import { Widget } from '../framework/widget';
import type { BoxHitTestResult } from '../input/hit-test';

// ---------------------------------------------------------------------------
// ClipRect (Amp: nv)
// ---------------------------------------------------------------------------

/**
 * A widget that clips its child to its own bounds.
 *
 * Any part of the child that would paint outside the ClipRect's allocated
 * area is silently discarded. This is useful for:
 * - Preventing text overflow from bleeding into adjacent widgets
 * - Containing scroll content within viewport bounds
 * - Any situation where child content must not exceed parent size
 *
 * Under the hood, ClipRect creates a RenderClipRect that uses
 * PaintContext.withClip() to restrict the painting area.
 *
 * Usage:
 *   new ClipRect({ child: someOverflowingWidget })
 *
 * Amp ref: nv class — SingleChildRenderObjectWidget for clipping
 */
export class ClipRect extends SingleChildRenderObjectWidget {
  constructor(opts: { child: Widget; key?: Key }) {
    super({ key: opts.key, child: opts.child });
  }

  createRenderObject(): RenderClipRect {
    return new RenderClipRect();
  }
}

// ---------------------------------------------------------------------------
// RenderClipRect
// ---------------------------------------------------------------------------

/**
 * A RenderBox that clips its child's painting to its own bounds.
 *
 * Layout: passes constraints through to child, takes child's size.
 * Paint: creates a clipped PaintContext via withClip() so any child
 * painting outside the render object's bounds is discarded.
 *
 * Amp ref: nv's render object — clips via E$ (ClipCanvas)
 */
export class RenderClipRect extends RenderBox {
  private _child: RenderBox | null = null;

  get child(): RenderBox | null {
    return this._child;
  }

  set child(value: RenderBox | null) {
    if (this._child) {
      this.dropChild(this._child);
    }
    this._child = value;
    if (value) {
      this.adoptChild(value);
    }
  }

  /**
   * Hit-test override: clips hit-testing to this object's bounds.
   * Children outside the clip rect cannot be hit even if they paint
   * beyond (their painting is clipped, so hit-testing should be too).
   *
   * Unlike the base RenderBox.hitTest(), this never checks children
   * via allowHitTestOutsideBounds -- the clip always wins.
   */
  override hitTest(
    result: BoxHitTestResult,
    position: Offset,
    parentOffsetX: number = 0,
    parentOffsetY: number = 0,
  ): boolean {
    const globalX = parentOffsetX + this.offset.col;
    const globalY = parentOffsetY + this.offset.row;

    // Only proceed if within our clipped bounds
    if (!this.hitTestSelf(position.col - globalX, position.row - globalY)) {
      return false;
    }

    result.addWithPaintOffset(this, new Offset(globalX, globalY), position);
    this.hitTestChildren(result, position, globalX, globalY);
    return true;
  }

  /**
   * Hit-test the single child if present.
   */
  override hitTestChildren(
    result: BoxHitTestResult,
    position: Offset,
    parentOffsetX: number,
    parentOffsetY: number,
  ): void {
    if (this._child) {
      this._child.hitTest(result, position, parentOffsetX, parentOffsetY);
    }
  }

  /**
   * Layout: pass constraints through to child, adopt child's size.
   * If no child, size to the smallest allowed by constraints.
   */
  performLayout(): void {
    const constraints = this.constraints!;

    if (this._child) {
      this._child.layout(constraints);
      this.size = constraints.constrain(this._child.size);
    } else {
      this.size = constraints.constrain(Size.zero);
    }
  }

  /**
   * Paint: clip the child's painting to this render object's bounds.
   * Uses PaintContext.withClip() to create a restricted sub-context.
   */
  paint(context: PaintContext, offset: Offset): void {
    if (!this._child) return;

    // Create a clipped paint context restricted to our bounds
    const paintContext = context as any;
    if (typeof paintContext.withClip === 'function') {
      const clippedContext = paintContext.withClip(
        offset.col,
        offset.row,
        this.size.width,
        this.size.height,
      );
      this._child.paint(clippedContext, offset.add(this._child.offset));
    } else {
      // Fallback: paint without clipping if context doesn't support withClip
      this._child.paint(context, offset.add(this._child.offset));
    }
  }

  visitChildren(visitor: (child: RenderObject) => void): void {
    if (this._child) {
      visitor(this._child);
    }
  }
}
