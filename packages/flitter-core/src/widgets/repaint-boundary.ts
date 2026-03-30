// RepaintBoundary widget -- Inserts a RepaintBoundary into the render tree.
// Wrap a subtree in RepaintBoundary when it repaints independently of siblings.
// Gap R02: RepaintBoundary enhancement per .gap/12-repaint-boundary.md

import {
  SingleChildRenderObjectWidget,
  type RenderObject,
} from '../framework/render-object';
import { RenderRepaintBoundary } from '../rendering/render-repaint-boundary';
import type { Widget } from '../framework/widget';
import type { Key } from '../core/key';

/**
 * A widget that inserts a RepaintBoundary into the render tree.
 *
 * Wrap a subtree in RepaintBoundary when it repaints independently of siblings.
 * Good candidates:
 * - Blinking cursors
 * - Animated spinners or progress bars
 * - Scroll view content vs. static headers/footers
 * - Independently updating panels in a multi-pane layout
 * - Status bars that update on a different cadence than main content
 *
 * The RepaintBoundary caches the subtree's painted cells in a CellLayer.
 * On frames where the subtree has not changed, the cached cells are blit
 * directly to the screen buffer, skipping the entire paint() DFS traversal
 * for that subtree.
 */
export class RepaintBoundary extends SingleChildRenderObjectWidget {
  constructor(opts?: { key?: Key; child?: Widget }) {
    super(opts);
  }

  createRenderObject(): RenderObject {
    return new RenderRepaintBoundary();
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // No mutable properties -- the boundary is structural only.
  }
}
