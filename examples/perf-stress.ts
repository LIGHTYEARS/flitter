// Performance Stress Test — Creates 1000 widgets and measures frame performance.
//
// Demonstrates:
// - Large widget tree construction (50 columns x 20 rows = 1000 cells)
// - FrameStats for collecting timing data
// - PerformanceOverlay for displaying P50/P95/P99 metrics
// - Periodic cell updates to trigger repaints
//
// Each cell is a Container with width=1, height=1, and a colored background.
// Colors cycle through a palette to create a visual pattern.
//
// Usage (conceptual — requires full binding to render):
//   bun run examples/perf-stress.ts

import {
  StatefulWidget,
  StatelessWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { Expanded } from '../src/widgets/flexible';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { BoxDecoration } from '../src/layout/render-decorated';
import { FrameStats } from '../src/diagnostics/frame-stats';
import { PerformanceOverlay } from '../src/diagnostics/perf-overlay';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GRID_COLS = 50;
export const GRID_ROWS = 20;
export const TOTAL_CELLS = GRID_COLS * GRID_ROWS; // 1000

/** Color palette for the grid cells. */
export const PALETTE: Color[] = [
  Color.red,
  Color.green,
  Color.yellow,
  Color.blue,
  Color.magenta,
  Color.cyan,
  Color.brightRed,
  Color.brightGreen,
  Color.brightYellow,
  Color.brightBlue,
  Color.brightMagenta,
  Color.brightCyan,
];

// ---------------------------------------------------------------------------
// Helper: create a Text widget
// ---------------------------------------------------------------------------

const dimStyle = new TextStyle({ dim: true });
const titleStyle = new TextStyle({ bold: true, foreground: Color.cyan });

function txt(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? new TextStyle() }),
  });
}

// ---------------------------------------------------------------------------
// Cell data structure
// ---------------------------------------------------------------------------

export interface CellData {
  colorIndex: number;
}

// ---------------------------------------------------------------------------
// Grid builder — constructs the 50x20 grid of Container cells
// ---------------------------------------------------------------------------

/**
 * Build a single row of colored cells.
 * Each cell is a Container with width=1, height=1 and a colored background.
 */
export function buildGridRow(
  rowIndex: number,
  cells: CellData[],
  cols: number,
): Row {
  const children: Widget[] = [];
  for (let c = 0; c < cols; c++) {
    const cellIndex = rowIndex * cols + c;
    const cell = cells[cellIndex];
    const color = cell ? PALETTE[cell.colorIndex % PALETTE.length]! : Color.black;
    children.push(
      new Container({
        width: 1,
        height: 1,
        decoration: new BoxDecoration({ color }),
      }),
    );
  }
  return new Row({ children });
}

/**
 * Build the full grid of rows.
 */
export function buildGrid(
  cells: CellData[],
  rows: number,
  cols: number,
): Column {
  const rowWidgets: Widget[] = [];
  for (let r = 0; r < rows; r++) {
    rowWidgets.push(buildGridRow(r, cells, cols));
  }
  return new Column({ children: rowWidgets, mainAxisSize: 'min' });
}

/**
 * Initialize a cell array with cycling colors based on position.
 */
export function initCells(rows: number, cols: number): CellData[] {
  const cells: CellData[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ colorIndex: (r + c) % PALETTE.length });
    }
  }
  return cells;
}

/**
 * Randomly update N cells in the grid to trigger repaints.
 * Uses a simple pseudo-random approach based on the frame number.
 */
export function randomizeCells(
  cells: CellData[],
  count: number,
  seed: number,
): void {
  let s = seed;
  for (let i = 0; i < count; i++) {
    // Simple LCG pseudo-random
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const idx = s % cells.length;
    const newColor = (s >> 8) % PALETTE.length;
    cells[idx]!.colorIndex = newColor;
  }
}

// ---------------------------------------------------------------------------
// PerfStressTest Widget
// ---------------------------------------------------------------------------

/**
 * PerfStressTest — A StatefulWidget that creates a 50x20 grid (1000 widgets)
 * and periodically randomizes cells to measure rebuild performance.
 */
export class PerfStressTest extends StatefulWidget {
  constructor() {
    super();
  }

  createState(): State<PerfStressTest> {
    return new PerfStressTestState();
  }
}

export class PerfStressTestState extends State<PerfStressTest> {
  private _cells!: CellData[];
  private _frameStats!: FrameStats;
  private _frameNumber: number = 0;

  initState(): void {
    super.initState();
    this._cells = initCells(GRID_ROWS, GRID_COLS);
    this._frameStats = new FrameStats(256);
  }

  get cells(): CellData[] {
    return this._cells;
  }

  get frameStats(): FrameStats {
    return this._frameStats;
  }

  get frameNumber(): number {
    return this._frameNumber;
  }

  /**
   * Simulate a frame tick: randomize some cells, record timing.
   * In a real app this would be called by the frame scheduler.
   */
  simulateFrame(): void {
    const start = performance.now();

    // Randomize 50 cells
    randomizeCells(this._cells, 50, this._frameNumber);
    this._frameNumber++;

    const elapsed = performance.now() - start;
    this._frameStats.recordFrame(elapsed);

    // Record synthetic per-phase timings (proportional to total)
    this._frameStats.recordPhase('build', elapsed * 0.4);
    this._frameStats.recordPhase('layout', elapsed * 0.3);
    this._frameStats.recordPhase('paint', elapsed * 0.2);
    this._frameStats.recordPhase('render', elapsed * 0.1);
  }

  build(_context: BuildContext): Widget {
    const grid = buildGrid(this._cells, GRID_ROWS, GRID_COLS);

    return new Column({
      children: [
        txt('Performance Stress Test - 1000 widgets', titleStyle),
        new Divider(),
        new Expanded({ child: grid }),
        new Divider(),
        new PerformanceOverlay({
          frameStats: this._frameStats,
          showPerPhase: true,
        }),
        txt(
          `Frame #${this._frameNumber} | ${TOTAL_CELLS} cells | ${GRID_COLS}x${GRID_ROWS} grid`,
          dimStyle,
        ),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { txt as perfTxt };
