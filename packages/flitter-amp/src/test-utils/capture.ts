/**
 * capture — headless flitter-amp rendering to SVG.
 *
 * Spins up WidgetsBinding in test/headless mode, attaches a widget tree,
 * runs one synchronous frame (BUILD → LAYOUT → PAINT → RENDER → PRESENT),
 * then reads the committed front buffer and serializes to SVG.
 *
 * Usage:
 *   const svg = captureToSvg(myWidget, { cols: 120, rows: 40 });
 *   fs.writeFileSync('snapshot.svg', svg);
 */

import { WidgetsBinding } from 'flitter-core/src/framework/binding';
import { FrameScheduler } from 'flitter-core/src/scheduler/frame-scheduler';
import type { Widget } from 'flitter-core/src/framework/widget';
import type { CellStyle } from 'flitter-core/src/terminal/cell';
import { bufferToSvg, type SvgConfig } from './termshot';

export interface CaptureOptions extends SvgConfig {
  /** Terminal columns. Default 120. */
  cols?: number;
  /** Terminal rows. Default 40. */
  rows?: number;
}

/**
 * Render a widget tree headlessly and return the SVG snapshot.
 *
 * Internally:
 * 1. Reset singletons (WidgetsBinding + FrameScheduler)
 * 2. Get binding (auto-creates MockPlatform, no TTY needed)
 * 3. Set terminal size
 * 4. Attach root widget
 * 5. Force paint + drawFrameSync()
 * 6. Read front buffer → SVG
 * 7. Reset singletons (cleanup)
 */
export function captureToSvg(widget: Widget, options?: CaptureOptions): string {
  const cols = options?.cols ?? 120;
  const rows = options?.rows ?? 40;

  // 1. Reset singletons
  WidgetsBinding.reset();
  FrameScheduler.reset();

  try {
    // 2. Get binding instance (MockPlatform in test env)
    const binding = WidgetsBinding.instance;

    // 3. Set terminal size via handleResize (queues resize + updates constraints)
    binding.handleResize(cols, rows);

    // 4. Attach root widget
    binding.attachRootWidget(widget);

    // 5. Run one synchronous frame (processResizeIfPending runs first inside drawFrameSync)
    binding.requestForcedPaintFrame();
    binding.drawFrameSync();

    // 6. Read committed front buffer → SVG
    const screen = binding.getScreen();
    const frontBuffer = screen.getFrontBuffer();
    const cursor = screen.getCursor();

    return bufferToSvg(frontBuffer, options, cursor ? {
      x: cursor.x,
      y: cursor.y,
      visible: screen.isCursorVisible(),
    } : undefined);
  } finally {
    // 7. Cleanup
    WidgetsBinding.reset();
    FrameScheduler.reset();
  }
}

/**
 * Render a widget tree headlessly and return the raw cell grid
 * (for cell-level assertions without SVG overhead).
 */
export function captureToGrid(
  widget: Widget,
  options?: { cols?: number; rows?: number },
): {
  getCell: (x: number, y: number) => { char: string; style: CellStyle };
  width: number;
  height: number;
} {
  const cols = options?.cols ?? 120;
  const rows = options?.rows ?? 40;

  WidgetsBinding.reset();
  FrameScheduler.reset();

  try {
    const binding = WidgetsBinding.instance;
    binding.handleResize(cols, rows);
    binding.attachRootWidget(widget);
    binding.requestForcedPaintFrame();
    binding.drawFrameSync();

    const screen = binding.getScreen();
    const frontBuffer = screen.getFrontBuffer();

    // Return a snapshot (deep copy the cells we need)
    const cells: Array<{ char: string; style: CellStyle }> = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = frontBuffer.getCell(x, y);
        cells.push({ char: cell.char, style: { ...cell.style } });
      }
    }

    return {
      width: cols,
      height: rows,
      getCell(x: number, y: number) {
        if (x < 0 || x >= cols || y < 0 || y >= rows) {
          return { char: ' ', style: {} };
        }
        return cells[y * cols + x]!;
      },
    };
  } finally {
    WidgetsBinding.reset();
    FrameScheduler.reset();
  }
}
