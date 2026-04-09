// Paint traversal — DFS walk of the render tree painting to screen buffer.
// Amp ref: amp-strings.txt — frame scheduler Phase 3: PAINT
// Reference: .reference/frame-scheduler.md Section 15

import { ScreenBuffer } from '../terminal/screen-buffer.js';
import { PaintContext } from './paint-context.js';
import { RenderObject } from '../framework/render-object.js';
import { Offset } from '../core/types.js';
import { debugFlags } from '../diagnostics/debug-flags.js';
import { PerfAttribution } from '../diagnostics/perf-attribution.js';

/**
 * Paint a single render object and recursively paint its children.
 *
 * DFS traversal:
 * 1. Call renderObj.paint(context, offset) — the render object draws itself
 * 2. Each render object is responsible for painting its children with accumulated offsets
 *
 * For ContainerRenderBox, the paint() method iterates children:
 *   child.paint(context, offset + child.offset)
 */
export function paintRenderObject(
  renderObj: RenderObject,
  context: PaintContext,
  offsetX: number,
  offsetY: number,
): void {
  const offset = new Offset(offsetX, offsetY);
  if (debugFlags.debugProfilePaints) {
    const paintStart = performance.now();
    renderObj.paint(context, offset);
    PerfAttribution.instance.recordPaint(renderObj.constructor.name, performance.now() - paintStart);
  } else {
    renderObj.paint(context, offset);
  }
}

/**
 * Paint the entire render tree to the screen.
 *
 * Creates a PaintContext wrapping the screen buffer, then starts
 * a DFS paint traversal from the root render object at offset (0, 0).
 *
 * Amp ref: frame scheduler calls root.paint(screen, 0, 0) in Phase 3
 */
export function paintRenderTree(
  root: RenderObject,
  screen: ScreenBuffer,
): void {
  const context = new PaintContext(screen);
  paintRenderObject(root, context, 0, 0);
}
