// HitTest -- Mouse event hit-testing on the render tree
// Amp ref: input-system.md Section 6.3, Section 9.2 (mouse dispatched by position)
//
// Hit-testing walks the render tree from root, checking if the point is within
// each node's bounds (offset + size). Builds a path from deepest hit to root.

import { RenderObject, RenderBox, ContainerRenderBox } from '../framework/render-object';
import { Offset } from '../core/types';

// ---------------------------------------------------------------------------
// BoxHitTestEntry / BoxHitTestResult (new, method-based hit-test protocol)
// Amp ref: g.addWithPaintOffset() accumulator in j9.hitTest(g, t, b, s)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Legacy hit-test types (deprecated -- use BoxHitTestResult / BoxHitTestEntry)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use BoxHitTestEntry instead.
 * A single entry in a hit test result path.
 * Contains the render object and the point in that object's local coordinate space.
 */
export interface HitTestEntry {
  renderObject: RenderObject;
  localX: number;
  localY: number;
}

/**
 * @deprecated Use BoxHitTestResult instead.
 * Result of a hit test at a screen position.
 * `path` is ordered from deepest (most specific) to shallowest (root).
 */
export interface HitTestResult {
  path: HitTestEntry[];
}

/**
 * @deprecated Use RenderBox.hitTest() method instead.
 *
 * Perform hit-test at a screen position against the render tree.
 *
 * Walks the tree from root, accumulating offsets to convert screen coordinates
 * to each node's local coordinate space. Returns a path from deepest hit to root.
 *
 * @param root - The root render object to start hit-testing from
 * @param x - Screen column (0-based)
 * @param y - Screen row (0-based)
 * @returns HitTestResult with path from deepest to shallowest
 */
export function hitTest(root: RenderObject, x: number, y: number): HitTestResult {
  const path: HitTestEntry[] = [];
  _hitTestNode(root, x, y, 0, 0, path);
  return { path };
}

/**
 * Recursive hit-test on a single node.
 * Accumulates parent offsets to compute the node's screen-space bounds.
 */
function _hitTestNode(
  node: RenderObject,
  screenX: number,
  screenY: number,
  parentOffsetX: number,
  parentOffsetY: number,
  path: HitTestEntry[],
): boolean {
  // Only RenderBox has offset/size for bounds checking
  if (!(node instanceof RenderBox)) {
    // For non-RenderBox nodes, just recurse into children
    let childHit = false;
    node.visitChildren((child) => {
      if (_hitTestNode(child, screenX, screenY, parentOffsetX, parentOffsetY, path)) {
        childHit = true;
      }
    });
    if (childHit) {
      path.push({ renderObject: node, localX: screenX, localY: screenY });
    }
    return childHit;
  }

  // Compute this node's screen-space position
  const nodeScreenX = parentOffsetX + node.offset.col;
  const nodeScreenY = parentOffsetY + node.offset.row;

  // Check if the point is within this node's bounds
  const localX = screenX - nodeScreenX;
  const localY = screenY - nodeScreenY;

  if (!hitTestSelf(node, localX, localY)) {
    return false;
  }

  // Recurse into children (deepest first)
  // Check children in reverse order so front-most (last painted) children are hit first
  let childHit = false;

  if (node instanceof ContainerRenderBox) {
    const children = node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      if (_hitTestNode(children[i]!, screenX, screenY, nodeScreenX, nodeScreenY, path)) {
        childHit = true;
        break; // Only take the first (front-most) child hit
      }
    }
  } else {
    // Single-child or leaf RenderBox -- visit children generically
    node.visitChildren((child) => {
      if (!childHit && _hitTestNode(child, screenX, screenY, nodeScreenX, nodeScreenY, path)) {
        childHit = true;
      }
    });
  }

  // Add this node to the path (deepest entries are already added by recursion)
  path.push({ renderObject: node, localX, localY });
  return true;
}

/**
 * @deprecated Use RenderBox.hitTestSelf() method instead.
 *
 * Check if a point is within a RenderBox's bounds.
 * The point must be in the render object's local coordinate space.
 *
 * @param renderObject - The RenderBox to test
 * @param localX - X coordinate in local space
 * @param localY - Y coordinate in local space
 * @returns true if the point is within the object's size bounds
 */
export function hitTestSelf(renderObject: RenderBox, localX: number, localY: number): boolean {
  const size = renderObject.size;
  return localX >= 0 && localX < size.width && localY >= 0 && localY < size.height;
}
