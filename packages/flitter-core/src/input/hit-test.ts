// HitTest -- Mouse event hit-testing on the render tree
// Amp ref: input-system.md Section 6.3, Section 9.2 (mouse dispatched by position)
//
// Hit-testing walks the render tree from root, checking if the point is within
// each node's bounds (offset + size). Builds a path from deepest hit to root.

import type { RenderObject } from '../framework/render-object';
import { Offset } from '../core/types';

/**
 * A single entry in a box hit-test result.
 * Stores the render object that was hit and the test position
 * in that object's local coordinate space.
 *
 * Amp ref: entries collected by g.addWithPaintOffset()
 */
export class BoxHitTestEntry {
  constructor(
    /** The render object that was hit. */
    public readonly target: RenderObject,
    /** The test position in this object's local coordinate space. */
    public readonly localPosition: Offset,
  ) {}
}

/**
 * Accumulates hit-test entries during a tree walk.
 * Passed down through hitTest() calls on RenderBox nodes.
 *
 * Amp ref: the `g` parameter in j9.hitTest(g, t, b, s)
 */
export class BoxHitTestResult {
  private readonly _path: BoxHitTestEntry[] = [];

  /** The hit-test path, in insertion order (parents before children per Amp). */
  get path(): ReadonlyArray<BoxHitTestEntry> {
    return this._path;
  }

  /**
   * Add a render object to the hit-test result with its paint offset.
   *
   * Amp ref: g.addWithPaintOffset(this, { x: a, y: r }, t)
   *
   * @param target   The render object that was hit
   * @param offset   The accumulated paint offset of the target (screen-space top-left)
   * @param position The original test position in screen coordinates
   */
  addWithPaintOffset(
    target: RenderObject,
    offset: Offset,
    position: Offset,
  ): void {
    const localPosition = new Offset(
      position.col - offset.col,
      position.row - offset.row,
    );
    this._path.push(new BoxHitTestEntry(target, localPosition));
  }
}
