/**
 * RenderChart — standalone chart renderer producing terminal string lines.
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/misc_utils.js:4227 (uRR class)
 *       amp-cli-reversed/modules/2735_unknown_rU0.js   — bar chart rendering
 *       amp-cli-reversed/modules/2737_unknown_iU0.js   — stacked-bar rendering
 *       amp-cli-reversed/modules/2740_unknown_oU0.js   — line/sparkline (braille)
 *       amp-cli-reversed/modules/2738_unknown_cU0.js   — stacked-area (braille)
 *       amp-cli-reversed/modules/2742_unknown_lU0.js   — horizontal-bar
 *       amp-cli-reversed/modules/2743_unknown_aL.js    — Y-axis
 *       amp-cli-reversed/modules/2744_unknown_AU0.js   — X-axis labels
 *       amp-cli-reversed/modules/2749_unknown_bU0.js   — braille point coords (Catmull-Rom spline)
 *       amp-cli-reversed/modules/2741_unknown_nU0.js   — Bresenham line algo
 *       amp-cli-reversed/modules/2739_unknown_W_.js    — braille dot setter (W_)
 *       amp-cli-reversed/modules/2747_unknown_PRR.js   — Catmull-Rom spline
 *       amp-cli-reversed/modules/2748_unknown_kRR.js   — spline eval
 *       amp-cli-reversed/modules/2751_unknown_$s.js    — color picker (PA)
 *
 * Produces terminal-escaped strings. Charts are rendered into a character cell
 * grid then converted to ANSI escape sequences per row.
 *
 * Layout constants (逆向: chunk-005.js:29543-29554):
 *   QN0 = MIN_HEIGHT = 10
 *   ZN0 = MAX_HEIGHT = 35
 *   JN0 = ASPECT_RATIO_DIVISOR = 2  (height ≈ width / 2)
 *   ra  = Y_AXIS_WIDTH = 8
 *   lgT = X_AXIS_HEIGHT = 2
 *   TU0 = AXIS_TITLE_HEIGHT = 1
 *   bRR = MAX_LABEL_WIDTH = 20
 *   mRR = BRAILLE_BASE = 0x2800 = 10240
 *   tU0 = THICK_THRESHOLD = 8  (≤8 points → thicker dots)
 *
 * @module
 */

// ════════════════════════════════════════════════════
//  Constants (逆向: chunk-005.js:29543-29554, 1472_tail_anonymous.js:6071)
// ════════════════════════════════════════════════════

/** Minimum chart content height (rows) — 逆向: QN0 */
const MIN_HEIGHT = 10;
/** Maximum chart content height (rows) — 逆向: ZN0 */
const MAX_HEIGHT = 35;
/** Aspect ratio divisor — 逆向: JN0. Content height ≈ width / JN0 */
const ASPECT_RATIO_DIV = 2;
/** Y-axis gutter width in chars — 逆向: ra */
const Y_AXIS_WIDTH = 8;
/** X-axis height in rows — 逆向: lgT */
const X_AXIS_HEIGHT = 2;
/** Axis title height — 逆向: TU0 */
const AXIS_TITLE_HEIGHT = 1;
/** Maximum horizontal-bar label width — 逆向: bRR */
const MAX_LABEL_WIDTH = 20;
/** Braille block base code point — 逆向: mRR = 10240 = 0x2800 */
const BRAILLE_BASE = 0x2800;
/** Thick dot threshold for line charts — 逆向: tU0 */
const THICK_THRESHOLD = 8;

/**
 * Vertical block chars (full → eighth, top-heavy) — 逆向: ue[]
 * Index 0 = full █, index 7 = ▁ (one-eighth)
 */
const VERT_BLOCKS: readonly string[] = ["█", "▇", "▆", "▅", "▄", "▃", "▂", "▁"];

/**
 * Horizontal block chars (one-eighth → full) — 逆向: JF[]
 * Index 0 = ▏ (one-eighth), index 7 = █ (full)
 */
const HORIZ_BLOCKS: readonly string[] = ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];

/**
 * Braille bit patterns: aU0[row % 4][col % 2]
 * 逆向: aU0 = [[1,8],[2,16],[4,32],[64,128]] in 1472_tail_anonymous.js:6071
 */
const BRAILLE_BITS: readonly (readonly [number, number])[] = [
  [1, 8],
  [2, 16],
  [4, 32],
  [64, 128],
];

/**
 * Default chart series colors — 逆向: QrT (data_structures.js:117)
 * ANSI indices: green(2), magenta(5), cyan(6), yellow(3), blue(4), red(1), bright-green(10), bright-cyan(14)
 */
const DEFAULT_COLORS: readonly string[] = [
  "\x1b[32m", // index 2: green
  "\x1b[35m", // index 5: magenta
  "\x1b[36m", // index 6: cyan
  "\x1b[33m", // index 3: yellow
  "\x1b[34m", // index 4: blue
  "\x1b[31m", // index 1: red
  "\x1b[92m", // index 10: bright green
  "\x1b[96m", // index 14: bright cyan
];

/** Dim gray color for axes/labels — 逆向: LT.index(7) with dim */
const DIM_GRAY = "\x1b[2;37m";
/** Reset ANSI escape */
const RESET = "\x1b[0m";

// ════════════════════════════════════════════════════
//  Public types
// ════════════════════════════════════════════════════

/** A single data series for a chart. */
export interface ChartSeries {
  /** Series name shown in legend */
  label: string;
  /** Data values */
  values: number[];
  /** Optional override color (ANSI escape string) */
  color?: string;
}

/** Chart data descriptor. */
export interface ChartData {
  /** Chart style */
  chartType: "bar" | "stacked-bar" | "line" | "sparkline" | "stacked-area" | "horizontal-bar";
  /** One or more data series */
  series: ChartSeries[];
  /** X-axis tick labels */
  xLabels?: string[];
  /** Chart title (rendered above, not yet used in size calculation) */
  title?: string;
  /** Optional X-axis label string */
  xAxisLabel?: string;
  /** Optional Y-axis label string */
  yAxisLabel?: string;
  /** Custom value formatter — 逆向: MQ */
  valueFormatter?: (v: number) => string;
}

// ════════════════════════════════════════════════════
//  Cell grid helpers
// ════════════════════════════════════════════════════

/** A single rendered cell: char + ANSI color prefix. */
interface GridCell {
  char: string;
  color: string;
  bold?: boolean;
  dim?: boolean;
}

type Grid = (GridCell | null)[][];

function makeGrid(width: number, height: number): Grid {
  const g: Grid = [];
  for (let r = 0; r < height; r++) {
    g[r] = new Array(width).fill(null);
  }
  return g;
}

function setCell(
  grid: Grid,
  x: number,
  y: number,
  char: string,
  color: string,
  bold = false,
  dim = false,
): void {
  if (x < 0 || y < 0 || y >= grid.length || x >= (grid[0]?.length ?? 0)) return;
  grid[y]![x] = { char, color, bold, dim };
}

function getCell(grid: Grid, x: number, y: number): GridCell | null {
  if (x < 0 || y < 0 || y >= grid.length || x >= (grid[0]?.length ?? 0)) return null;
  return grid[y]![x] ?? null;
}

/** Convert grid to array of ANSI-escaped strings. */
function gridToLines(grid: Grid): string[] {
  return grid.map((row) => {
    let line = "";
    let currentColor = "";
    for (const cell of row) {
      if (!cell || cell.char === "" || cell.char === "\0") {
        if (currentColor !== "") {
          line += RESET;
          currentColor = "";
        }
        line += " ";
      } else {
        let esc = cell.color;
        if (cell.bold) esc = "\x1b[1m" + esc;
        if (cell.dim) esc = "\x1b[2m" + esc;
        if (esc !== currentColor) {
          if (currentColor !== "") line += RESET;
          line += esc;
          currentColor = esc;
        }
        line += cell.char;
      }
    }
    if (currentColor !== "") line += RESET;
    return line;
  });
}

// ════════════════════════════════════════════════════
//  Value formatting — 逆向: MQ (2735_unknown_rU0.js:1-5)
// ════════════════════════════════════════════════════

function defaultFormatter(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
}

// ════════════════════════════════════════════════════
//  Color helpers — 逆向: PA / $s (2751_unknown_$s.js)
// ════════════════════════════════════════════════════

/** Get ANSI color for series index — 逆向: PA */
function seriesColor(series: ChartSeries[], seriesIdx: number, colors: readonly string[]): string {
  const s = series[seriesIdx];
  if (s?.color) return s.color;
  if (series.length <= 1) return colors[0] ?? DEFAULT_COLORS[0]!;
  return colors[seriesIdx % colors.length] ?? DEFAULT_COLORS[0]!;
}

/** Return brightened color — 逆向: $s */
function brightenColor(color: string): string {
  // Map dim ANSI colors to their bright variants
  return color.replace(/\x1b\[(\d+)m/, (_m, n) => {
    const code = parseInt(n, 10);
    if (code >= 30 && code <= 37) return `\x1b[${code + 60}m`;
    return `\x1b[${n}m`;
  });
}

// ════════════════════════════════════════════════════
//  Stacked max — 逆向: hU0 (2736_unknown_hU0.js)
// ════════════════════════════════════════════════════

function stackedMax(series: ChartSeries[]): number {
  if (series.length === 0) return 1;
  const len = series[0]?.values.length ?? 0;
  if (len === 0) return 1;
  let max = 0;
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (const s of series) sum += s.values[i] ?? 0;
    if (sum > max) max = sum;
  }
  return max || 1;
}

// ════════════════════════════════════════════════════
//  Catmull-Rom spline — 逆向: PRR / kRR (2747, 2748)
// ════════════════════════════════════════════════════

interface Spline {
  xs: number[];
  ys: number[];
  m: number[];
}

function buildSpline(xs: number[], ys: number[]): Spline {
  const n = xs.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1]! - xs[i]!;
    slopes.push(dx === 0 ? 0 : (ys[i + 1]! - ys[i]!) / dx);
  }
  const m = new Array(n).fill(0);
  m[0] = slopes[0]!;
  m[n - 1] = slopes[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const s0 = slopes[i - 1]!;
    const s1 = slopes[i]!;
    m[i] = s0 * s1 <= 0 ? 0 : (s0 + s1) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const h = slopes[i]!;
    if (h === 0) {
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const a = m[i]! / h;
      const b = m[i + 1]! / h;
      const s = a * a + b * b;
      if (s > 9) {
        const sc = 3 / Math.sqrt(s);
        m[i] = sc * a * h;
        m[i + 1] = sc * b * h;
      }
    }
  }
  return { xs, ys, m };
}

function evalSpline(sp: Spline, x: number, seg: number): number {
  const x0 = sp.xs[seg]!;
  const dx = sp.xs[seg + 1]! - x0;
  if (dx === 0) return sp.ys[seg]!;
  const t = (x - x0) / dx;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return (
    h00 * sp.ys[seg]! + h10 * dx * sp.m[seg]! + h01 * sp.ys[seg + 1]! + h11 * dx * sp.m[seg + 1]!
  );
}

// ════════════════════════════════════════════════════
//  Braille helpers — 逆向: W_ / nU0 / bU0 (2739, 2741, 2749)
// ════════════════════════════════════════════════════

type BrailleGrid = number[][];

/** Set a braille dot in the sub-cell grid — 逆向: W_ */
function brailleSet(
  grid: BrailleGrid,
  dotX: number,
  dotY: number,
  cellW: number,
  cellH: number,
): void {
  const cx = Math.floor(dotX / 2);
  const cy = Math.floor(dotY / 4);
  if (cx < 0 || cx >= cellW || cy < 0 || cy >= cellH) return;
  const bit = BRAILLE_BITS[dotY % 4]?.[dotX % 2];
  if (bit !== undefined) grid[cy]![cx]! |= bit;
}

/** Thicker dot (5-pixel cross) — 逆向: yRR */
function brailleSetThick(
  grid: BrailleGrid,
  dotX: number,
  dotY: number,
  cellW: number,
  cellH: number,
): void {
  brailleSet(grid, dotX, dotY, cellW, cellH);
  brailleSet(grid, dotX - 1, dotY, cellW, cellH);
  brailleSet(grid, dotX + 1, dotY, cellW, cellH);
  brailleSet(grid, dotX, dotY - 1, cellW, cellH);
  brailleSet(grid, dotX, dotY + 1, cellW, cellH);
}

/** Bresenham line in braille dot space — 逆向: nU0 */
function brailleDrawLine(
  grid: BrailleGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellW: number,
  cellH: number,
  thick: boolean,
): void {
  const setDot = thick ? brailleSetThick : brailleSet;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    setDot(grid, x, y, cellW, cellH);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Compute braille dot coordinates for each pixel column — 逆向: bU0
 * Returns array of [dotX, dotY] pairs for every dot-column.
 */
function computeBraillePoints(
  values: number[],
  dotW: number,
  dotH: number,
  maxVal: number,
): Array<[number, number]> {
  if (values.length === 0) return [];
  if (values.length === 1) {
    const ratio = maxVal > 0 ? values[0]! / maxVal : 0;
    const cx = Math.floor(dotW / 2);
    const cy = Math.round((1 - ratio) * (dotH - 1));
    return [[cx, cy]];
  }
  const n = values.length;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    xs.push(Math.round((i / (n - 1)) * (dotW - 1)));
    const ratio = maxVal > 0 ? values[i]! / maxVal : 0;
    ys.push((1 - ratio) * (dotH - 1));
  }
  if (xs.length < 2) {
    return xs.length === 1 ? [[xs[0]!, Math.round(ys[0]!)]] : [];
  }
  const spline = buildSpline(xs, ys);
  const result: Array<[number, number]> = [];
  let seg = 0;
  for (let col = 0; col < dotW; col++) {
    while (seg < xs.length - 2 && col > xs[seg + 1]!) seg++;
    const y = evalSpline(spline, col, seg);
    result.push([col, Math.round(Math.max(0, Math.min(dotH - 1, y)))]);
  }
  return result;
}

// ════════════════════════════════════════════════════
//  Y-axis rendering — 逆向: aL (2743_unknown_aL.js)
// ════════════════════════════════════════════════════

function renderYAxis(
  grid: Grid,
  x: number,
  y: number,
  height: number,
  maxVal: number,
  fmt: (v: number) => string,
): void {
  if (height <= 0) return;
  // Top label (max value)
  const topLabel = fmt(maxVal).padStart(Y_AXIS_WIDTH - 2);
  for (let i = 0; i < topLabel.length && x + i < x + Y_AXIS_WIDTH - 1; i++) {
    setCell(grid, x + i, y, topLabel[i]!, DIM_GRAY, false, true);
  }
  setCell(grid, x + Y_AXIS_WIDTH - 1, y, "┤", DIM_GRAY, false, true);

  // Mid label (half max)
  if (height > 2) {
    const midY = y + Math.floor(height / 2);
    const midLabel = fmt(maxVal / 2).padStart(Y_AXIS_WIDTH - 2);
    for (let i = 0; i < midLabel.length && x + i < x + Y_AXIS_WIDTH - 1; i++) {
      setCell(grid, x + i, midY, midLabel[i]!, DIM_GRAY, false, true);
    }
    setCell(grid, x + Y_AXIS_WIDTH - 1, midY, "┤", DIM_GRAY, false, true);
  }

  // Bottom label (zero)
  const botLabel = fmt(0).padStart(Y_AXIS_WIDTH - 2);
  for (let i = 0; i < botLabel.length && x + i < x + Y_AXIS_WIDTH - 1; i++) {
    setCell(grid, x + i, y + height - 1, botLabel[i]!, DIM_GRAY, false, true);
  }
  setCell(grid, x + Y_AXIS_WIDTH - 1, y + height - 1, "┤", DIM_GRAY, false, true);

  // Vertical line fill
  for (let row = 0; row < height; row++) {
    const existing = getCell(grid, x + Y_AXIS_WIDTH - 1, y + row);
    if (!existing || existing.char === " " || existing.char === "") {
      setCell(grid, x + Y_AXIS_WIDTH - 1, y + row, "│", DIM_GRAY, false, true);
    }
  }
}

// ════════════════════════════════════════════════════
//  X-axis rendering — 逆向: AU0 (2744_unknown_AU0.js)
// ════════════════════════════════════════════════════

function renderXAxis(
  grid: Grid,
  x: number,
  y: number,
  labels: string[],
  spacing: number,
  totalWidth: number | undefined,
): void {
  if (labels.length === 0) return;
  const axisW = totalWidth ?? labels.length * spacing;
  // Horizontal line
  for (let i = 0; i < axisW; i++) setCell(grid, x + i, y, "─", DIM_GRAY, false, true);

  const maxLabelLen = Math.max(...labels.map((l) => l.length));
  const skip =
    totalWidth !== undefined
      ? 1
      : spacing >= maxLabelLen + 2
        ? 1
        : Math.max(1, Math.ceil((maxLabelLen + 2) / Math.max(1, spacing)));

  for (let i = 0; i < labels.length; i += skip) {
    const label = labels[i];
    if (!label) continue;
    const nx =
      totalWidth !== undefined
        ? Math.round((i / Math.max(1, labels.length - 1)) * (axisW - 1))
        : i * spacing;
    setCell(grid, x + nx, y, "┬", DIM_GRAY, false, true);
    for (let c = 0; c < label.length; c++) {
      setCell(grid, x + nx + c, y + 1, label[c]!, DIM_GRAY, false, true);
    }
  }
}

// ════════════════════════════════════════════════════
//  Legend rendering — 逆向: _U0 (2746_unknown__U0.js)
// ════════════════════════════════════════════════════

function renderLegend(
  grid: Grid,
  x: number,
  y: number,
  width: number,
  series: ChartSeries[],
  colors: readonly string[],
): void {
  let col = 0;
  for (let i = 0; i < series.length; i++) {
    const s = series[i]!;
    const color = seriesColor(series, i, colors);
    const entry = `● ${s.label}`;
    if (col + entry.length > width) break;
    setCell(grid, x + col, y, "●", color);
    col += 2;
    for (let c = 0; c < s.label.length; c++) {
      if (col >= width) break;
      setCell(grid, x + col, y, s.label[c]!, DIM_GRAY, false, true);
      col++;
    }
    col += 2;
  }
}

// ════════════════════════════════════════════════════
//  Bar chart — 逆向: rU0 (2735_unknown_rU0.js)
// ════════════════════════════════════════════════════

function renderBar(
  grid: Grid,
  area: { x: number; y: number; width: number; height: number },
  series: ChartSeries[],
  highlightIdx: number | null,
  colors: readonly string[],
  maxVal: number,
): void {
  const values = series[0]?.values ?? [];
  if (values.length === 0 || area.width <= 0 || area.height <= 0) return;
  const barWidth = Math.max(1, Math.floor(area.width / values.length));

  for (let c = 0; c < values.length; c++) {
    const val = values[c] ?? 0;
    const ratio = maxVal > 0 ? val / maxVal : 0;
    const filled = ratio * area.height;
    const fullRows = Math.floor(filled);
    const frac = filled - fullRows;
    const color = seriesColor(series, 0, colors);
    const isHighlighted = highlightIdx === c;
    const cellColor = isHighlighted ? brightenColor(color) : color;
    const cellX = area.x + c * barWidth;

    // Full blocks
    for (let r = 0; r < fullRows && r < area.height; r++) {
      const cellY = area.y + area.height - 1 - r;
      for (let col = 0; col < barWidth - 1; col++) {
        setCell(grid, cellX + col, cellY, "█", cellColor, isHighlighted);
      }
    }

    // Fractional block
    if (frac > 0 && fullRows < area.height) {
      const fracIdx = Math.min(VERT_BLOCKS.length - 1, Math.floor(frac * VERT_BLOCKS.length));
      const fracChar = VERT_BLOCKS[fracIdx] ?? "▁";
      const cellY = area.y + area.height - 1 - fullRows;
      for (let col = 0; col < barWidth - 1; col++) {
        setCell(grid, cellX + col, cellY, fracChar, cellColor, isHighlighted);
      }
    }
  }
}

// ════════════════════════════════════════════════════
//  Stacked bar chart — 逆向: iU0 (2737_unknown_iU0.js)
// ════════════════════════════════════════════════════

function renderStackedBar(
  grid: Grid,
  area: { x: number; y: number; width: number; height: number },
  series: ChartSeries[],
  highlightIdx: number | null,
  colors: readonly string[],
  maxVal: number,
): void {
  const values0 = series[0]?.values ?? [];
  if (values0.length === 0 || area.width <= 0 || area.height <= 0) return;
  const barWidth = Math.max(1, Math.floor(area.width / values0.length));
  const dotH = area.height * 8;

  for (let col = 0; col < values0.length; col++) {
    const cellX = area.x + col * barWidth;
    const isHighlighted = highlightIdx === col;
    let offset = 0;

    for (let si = 0; si < series.length; si++) {
      const val = series[si]?.values[col] ?? 0;
      if (val <= 0) continue;
      const ratio = maxVal > 0 ? val / maxVal : 0;
      const dots = Math.round(ratio * dotH);
      if (dots <= 0) continue;
      const color = seriesColor(series, si, colors);
      const cellColor = isHighlighted ? brightenColor(color) : color;

      const start = offset;
      const end = Math.min(offset + dots, dotH);
      const startRow = Math.floor(start / 8);
      const endRow = Math.ceil(end / 8);

      for (let row = startRow; row < endRow && row < area.height; row++) {
        const rowBase = row * 8;
        const rowTop = rowBase + 8;
        const cellY = area.y + area.height - 1 - row;
        const segStart = Math.max(rowBase, start);
        const segLen = Math.min(rowTop, end) - segStart;
        let ch: string;
        if (segLen >= 8) {
          ch = "█";
        } else {
          const idx = Math.min(VERT_BLOCKS.length - 1, VERT_BLOCKS.length - segLen);
          ch = VERT_BLOCKS[idx] ?? "▁";
        }
        for (let bc = 0; bc < barWidth - 1; bc++) {
          setCell(grid, cellX + bc, cellY, ch, cellColor, isHighlighted);
        }
      }
      offset = end;
    }
  }
}

// ════════════════════════════════════════════════════
//  Line / sparkline chart — 逆向: oU0 (2740_unknown_oU0.js)
// ════════════════════════════════════════════════════

function renderLine(
  grid: Grid,
  area: { x: number; y: number; width: number; height: number },
  series: ChartSeries[],
  _highlightIdx: number | null,
  colors: readonly string[],
  maxVal: number,
): void {
  if (series.length === 0 || area.width <= 0 || area.height <= 0) return;
  const dotW = area.width * 2;
  const dotH = area.height * 4;

  // Per-series bit grids and density grids
  const bitGrids: BrailleGrid[] = [];
  const densityGrids: number[][][] = [];

  for (let si = 0; si < series.length; si++) {
    const vals = series[si]?.values ?? [];
    if (vals.length === 0) continue;

    const thick = vals.length <= THICK_THRESHOLD;
    const setFn = thick ? brailleSetThick : brailleSet;
    const bitGrid: BrailleGrid = [];
    for (let r = 0; r < area.height; r++) bitGrid[r] = new Array(area.width).fill(0);

    const points = computeBraillePoints(vals, dotW, dotH, maxVal);
    for (let pi = 0; pi < points.length; pi++) {
      const [px, py] = points[pi]!;
      if (pi === 0) {
        setFn(bitGrid, px, py, area.width, area.height);
        continue;
      }
      const [prevX, prevY] = points[pi - 1]!;
      brailleDrawLine(bitGrid, prevX, prevY, px, py, area.width, area.height, thick);
    }
    bitGrids[si] = bitGrid;

    // Compute density (popcount)
    const dens: number[][] = [];
    for (let r = 0; r < area.height; r++) {
      dens[r] = new Array(area.width).fill(0);
      for (let c = 0; c < area.width; c++) {
        let bits = bitGrid[r]![c]!;
        let count = 0;
        while (bits) {
          count += bits & 1;
          bits >>= 1;
        }
        dens[r]![c] = count;
      }
    }
    densityGrids[si] = dens;
  }

  // Merge series and paint
  for (let r = 0; r < area.height; r++) {
    for (let c = 0; c < area.width; c++) {
      let combined = 0;
      let dominantSi = 0;
      let maxDens = 0;

      for (let si = 0; si < series.length; si++) {
        const bits = bitGrids[si]?.[r]?.[c] ?? 0;
        if (bits !== 0) {
          combined |= bits;
          const d = densityGrids[si]?.[r]?.[c] ?? 0;
          if (d > maxDens) {
            maxDens = d;
            dominantSi = si;
          }
        }
      }

      if (combined !== 0) {
        const color = seriesColor(series, dominantSi, colors);
        const ch = String.fromCharCode(BRAILLE_BASE + combined);
        setCell(grid, area.x + c, area.y + r, ch, color);
      }
    }
  }
}

// ════════════════════════════════════════════════════
//  Stacked area chart — 逆向: cU0 (2738_unknown_cU0.js)
// ════════════════════════════════════════════════════

function renderStackedArea(
  grid: Grid,
  area: { x: number; y: number; width: number; height: number },
  series: ChartSeries[],
  _highlightIdx: number | null,
  colors: readonly string[],
  maxVal: number,
): void {
  if (series.length === 0 || area.width <= 0 || area.height <= 0) return;
  const numPts = series[0]?.values.length ?? 0;
  if (numPts === 0) return;

  const dotH = area.height * 8;

  // Compute normalized per-series per-column values (spline smoothed)
  const normalized: number[][] = [];
  for (let si = 0; si < series.length; si++) {
    const vals = series[si]?.values ?? [];
    normalized[si] = computeNormalizedWidths(vals, area.width, maxVal);
  }

  // Cumulative tops per series
  const cumTops: number[][] = [];
  for (let si = 0; si < series.length; si++) {
    const top: number[] = new Array(area.width).fill(0);
    for (let c = 0; c < area.width; c++) {
      let sum = 0;
      for (let j = 0; j <= si; j++) sum += normalized[j]?.[c] ?? 0;
      top[c] = Math.max(0, Math.min(dotH, Math.round(sum * dotH)));
    }
    cumTops[si] = top;
  }

  for (let col = 0; col < area.width; col++) {
    const segments: Array<{ si: number; start: number; end: number }> = [];
    for (let si = 0; si < series.length; si++) {
      const bot = si > 0 ? (cumTops[si - 1]![col] ?? 0) : 0;
      const top = cumTops[si]![col] ?? 0;
      if (top > bot) segments.push({ si, start: bot, end: top });
    }

    const maxTop = segments.length > 0 ? segments[segments.length - 1]!.end : 0;
    const minRow = 0;
    const maxRow = Math.min(area.height - 1, Math.ceil(maxTop / 8) - 1);

    for (let row = minRow; row <= maxRow; row++) {
      const rowBase = row * 8;
      const rowTop = rowBase + 8;
      const cellY = area.y + area.height - 1 - row;

      // Find primary (lowest) and secondary (highest) series in this row band
      let loSi = -1;
      let hiSi = -1;
      let loStart = rowTop;
      let hiEnd = rowBase;

      for (const seg of segments) {
        if (seg.end <= rowBase || seg.start >= rowTop) continue;
        const segStart = Math.max(rowBase, seg.start);
        const segEnd = Math.min(rowTop, seg.end);
        if (segStart < loStart) {
          loStart = segStart;
          loSi = seg.si;
        }
        if (segEnd > hiEnd) {
          hiEnd = segEnd;
          hiSi = seg.si;
        }
      }

      if (loSi === -1 && hiSi === -1) continue;

      const totalFill = hiEnd - loStart;
      if (totalFill <= 0) continue;
      const topFill = hiEnd - rowBase;

      const si = loSi !== -1 ? loSi : hiSi;
      const color = seriesColor(series, si, colors);

      if (loSi === hiSi || totalFill >= 8) {
        // Single series dominates
        if (topFill >= 8) {
          setCell(grid, area.x + col, cellY, "█", color);
        } else {
          const idx = Math.min(VERT_BLOCKS.length - 1, VERT_BLOCKS.length - topFill);
          setCell(grid, area.x + col, cellY, VERT_BLOCKS[idx] ?? "▁", color);
        }
      } else {
        // Two series blending — show lower series with upper as bg hint
        const loColor = seriesColor(series, loSi, colors);
        const loDots = loStart - rowBase; // filled by lower
        if (loDots <= 0) {
          const hiColor = seriesColor(series, hiSi, colors);
          const idx = Math.min(VERT_BLOCKS.length - 1, VERT_BLOCKS.length - topFill);
          setCell(grid, area.x + col, cellY, VERT_BLOCKS[idx] ?? "▁", hiColor);
        } else {
          // Show lower color up to its fill, use fractional block
          const idx = Math.min(VERT_BLOCKS.length - 1, VERT_BLOCKS.length - loDots);
          setCell(grid, area.x + col, cellY, VERT_BLOCKS[idx] ?? "▁", loColor);
        }
      }
    }
  }
}

/**
 * Compute spline-smoothed normalized values per pixel column — 逆向: mU0 (2750_unknown_mU0.js)
 */
function computeNormalizedWidths(values: number[], width: number, maxVal: number): number[] {
  const result = new Array(width).fill(0) as number[];
  if (values.length === 0 || maxVal <= 0) return result;
  if (values.length === 1) {
    const v = Math.max(0, Math.min(1, (values[0] ?? 0) / maxVal));
    return result.fill(v);
  }
  const n = values.length;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    xs.push(Math.round((i / (n - 1)) * (width - 1)));
    ys.push((values[i] ?? 0) / maxVal);
  }
  if (xs.length < 2) {
    if (xs.length === 1) result.fill(Math.max(0, Math.min(1, ys[0]!)));
    return result;
  }
  const spline = buildSpline(xs, ys);
  let seg = 0;
  for (let c = 0; c < width; c++) {
    while (seg < xs.length - 2 && c > xs[seg + 1]!) seg++;
    result[c] = Math.max(0, Math.min(1, evalSpline(spline, c, seg)));
  }
  return result;
}

// ════════════════════════════════════════════════════
//  Horizontal bar chart — 逆向: lU0 (2742_unknown_lU0.js)
// ════════════════════════════════════════════════════

function renderHorizontalBar(
  grid: Grid,
  area: { x: number; y: number; width: number; height: number },
  series: ChartSeries[],
  highlightIdx: number | null,
  colors: readonly string[],
  maxVal: number,
  fmt: (v: number) => string,
  xLabels?: string[],
): void {
  // Use first series values as row values; labels come from xLabels or series[0].label per index
  const values = series[0]?.values ?? [];
  if (values.length === 0 || area.width <= 0 || area.height <= 0) return;

  // Determine label width (capped at MAX_LABEL_WIDTH) — 逆向: bRR
  let maxLabelLen = 0;
  for (let i = 0; i < values.length; i++) {
    const lbl = xLabels?.[i] ?? series[0]?.label ?? "";
    maxLabelLen = Math.max(maxLabelLen, lbl.length);
  }
  maxLabelLen = Math.min(maxLabelLen, MAX_LABEL_WIDTH);
  const labelCols = maxLabelLen + 2; // label + separator space + │
  const barAreaW = Math.max(0, area.width - labelCols - 1);

  for (let i = 0; i < values.length && i < area.height; i++) {
    const val = values[i] ?? 0;
    const rowY = area.y + i;
    const color = seriesColor(series, 0, colors);
    const isHighlighted = highlightIdx === i;
    const cellColor = isHighlighted ? brightenColor(color) : color;
    const labelColor = isHighlighted ? brightenColor("\x1b[37m") : "\x1b[37m";

    // Label (right-aligned in labelCols-2 chars)
    const rawLabel = xLabels?.[i] ?? series[0]?.label ?? "";
    const truncLabel =
      rawLabel.length > maxLabelLen ? rawLabel.slice(0, maxLabelLen - 1) + "…" : rawLabel;
    const padLen = maxLabelLen - truncLabel.length;
    for (let p = 0; p < padLen; p++) setCell(grid, area.x + p, rowY, " ", "");
    for (let c = 0; c < truncLabel.length; c++) {
      setCell(grid, area.x + padLen + c, rowY, truncLabel[c]!, labelColor);
    }
    // Separator
    setCell(grid, area.x + maxLabelLen, rowY, " ", "");
    setCell(grid, area.x + maxLabelLen + 1, rowY, "│", DIM_GRAY, false, true);

    // Bar
    const filled = (maxVal > 0 ? val / maxVal : 0) * barAreaW;
    const fullCols = Math.floor(filled);
    const frac = filled - fullCols;

    for (let c = 0; c < fullCols && c < barAreaW; c++) {
      setCell(grid, area.x + labelCols + c, rowY, "█", cellColor, isHighlighted);
    }
    if (frac > 0 && fullCols < barAreaW) {
      const idx = Math.min(HORIZ_BLOCKS.length - 1, Math.floor(frac * HORIZ_BLOCKS.length));
      setCell(
        grid,
        area.x + labelCols + fullCols,
        rowY,
        HORIZ_BLOCKS[idx] ?? "▏",
        cellColor,
        isHighlighted,
      );
    }

    // Value label after bar
    const valStr = " " + fmt(val);
    const barEnd = labelCols + fullCols + (frac > 0 ? 1 : 0);
    for (let c = 0; c < valStr.length; c++) {
      const cx = area.x + barEnd + c;
      if (cx >= area.x + area.width) break;
      setCell(grid, cx, rowY, valStr[c]!, DIM_GRAY, false, true);
    }
  }
}

// ════════════════════════════════════════════════════
//  RenderChart — public API
// ════════════════════════════════════════════════════

/**
 * Standalone chart renderer.
 *
 * Produces terminal-escaped string lines ready for printing.
 * Does not depend on the flitter widget tree — can be used in any
 * context that needs chart output.
 *
 * 逆向: uRR class in misc_utils.js:4227
 *
 * @example
 * ```ts
 * const chart = new RenderChart({
 *   chartType: "bar",
 *   series: [{ label: "CPU", values: [10, 40, 80, 60] }],
 *   xLabels: ["Mon", "Tue", "Wed", "Thu"],
 * });
 * const lines = chart.renderToLines(60, 15);
 * lines.forEach(l => process.stdout.write(l + "\n"));
 * ```
 */
export class RenderChart {
  private readonly _data: ChartData;
  private readonly _showAxes: boolean;
  private readonly _colors: readonly string[];
  private readonly _highlightIdx: number | null;

  constructor(
    data: ChartData,
    options: {
      showAxes?: boolean;
      colors?: string[];
      highlightIndex?: number | null;
    } = {},
  ) {
    this._data = data;
    this._showAxes = options.showAxes ?? true;
    this._colors = options.colors ?? DEFAULT_COLORS;
    this._highlightIdx = options.highlightIndex ?? null;
  }

  /**
   * Render chart to an array of ANSI-escaped strings.
   *
   * 逆向: uRR.paint() + uRR.performLayout()
   *
   * @param width  Terminal columns available
   * @param height Terminal rows available (0 = auto-compute)
   */
  renderToLines(width: number, height: number = 0): string[] {
    const series = this._data.series;
    if (series.length === 0) return [];

    const totalHeight = height > 0 ? height : this._computeAutoHeight(width);
    if (width <= 0 || totalHeight <= 0) return [];

    const grid = makeGrid(width, totalHeight);
    const fmt = this._data.valueFormatter ?? defaultFormatter;
    const maxVal = this._getMaxValue();
    const area = this._computeChartArea(width, totalHeight);

    if (area.width <= 0 || area.height <= 0) return new Array(totalHeight).fill("");

    const shifted = { ...area, x: area.x, y: area.y };

    switch (this._data.chartType) {
      case "bar":
        if (this._showAxes) renderYAxis(grid, 0, area.y, area.height, maxVal, fmt);
        renderBar(grid, shifted, series, this._highlightIdx, this._colors, maxVal);
        if (this._showAxes) this._renderXAxis(grid, area, width);
        break;

      case "stacked-bar":
        if (this._showAxes) renderYAxis(grid, 0, area.y, area.height, maxVal, fmt);
        renderStackedBar(grid, shifted, series, this._highlightIdx, this._colors, maxVal);
        if (this._showAxes) this._renderXAxis(grid, area, width);
        break;

      case "line":
      case "sparkline":
        if (this._showAxes) renderYAxis(grid, 0, area.y, area.height, maxVal, fmt);
        renderLine(grid, shifted, series, this._highlightIdx, this._colors, maxVal);
        if (this._showAxes) this._renderXAxis(grid, area, width);
        break;

      case "stacked-area":
        if (this._showAxes) renderYAxis(grid, 0, area.y, area.height, maxVal, fmt);
        renderStackedArea(grid, shifted, series, this._highlightIdx, this._colors, maxVal);
        if (this._showAxes) this._renderXAxis(grid, area, width);
        break;

      case "horizontal-bar":
        renderHorizontalBar(
          grid,
          shifted,
          series,
          this._highlightIdx,
          this._colors,
          maxVal,
          fmt,
          this._data.xLabels,
        );
        break;
    }

    // Legend (multi-series, non-horizontal-bar)
    if (this._showAxes && series.length > 1 && this._data.chartType !== "horizontal-bar") {
      const legendY =
        area.y + area.height + this._computeXAxisHeight(area.width) + this._getAxisTitleHeight();
      if (legendY < totalHeight) {
        renderLegend(grid, area.x, legendY, area.width, series, this._colors);
      }
    }

    return gridToLines(grid);
  }

  // ────────────────────────────────────────────────────
  //  Private layout helpers — 逆向: uRR.*
  // ────────────────────────────────────────────────────

  private _computeAutoHeight(width: number): number {
    if (this._data.chartType === "horizontal-bar") return this._computeHorizontalBarHeight();
    const chartW = width - (this._showAxes ? Y_AXIS_WIDTH : 0);
    const raw = Math.round(Math.max(0, chartW) / ASPECT_RATIO_DIV);
    const contentH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, raw));
    const extra =
      this._computeXAxisHeight(chartW) + this._getAxisTitleHeight() + this._getLegendHeight();
    return contentH + extra;
  }

  private _computeChartArea(
    width: number,
    height: number,
  ): { x: number; y: number; width: number; height: number } {
    if (this._data.chartType === "horizontal-bar") {
      return { x: 0, y: 0, width, height };
    }
    const axisX = this._showAxes ? Y_AXIS_WIDTH : 0;
    const chartW = Math.max(0, width - axisX);
    const extra =
      this._computeXAxisHeight(chartW) + this._getAxisTitleHeight() + this._getLegendHeight();
    return { x: axisX, y: 0, width: chartW, height: Math.max(0, height - extra) };
  }

  private _computeXAxisHeight(_chartW: number): number {
    if (!this._showAxes || this._data.chartType === "horizontal-bar") return 0;
    return X_AXIS_HEIGHT;
  }

  private _getAxisTitleHeight(): number {
    return this._data.xAxisLabel ? AXIS_TITLE_HEIGHT : 0;
  }

  private _getLegendHeight(): number {
    return this._showAxes && this._data.series.length > 1 ? 1 : 0;
  }

  private _computeHorizontalBarHeight(): number {
    return Math.max(1, this._data.series[0]?.values.length ?? 1);
  }

  private _getMaxValue(): number {
    const { chartType, series } = this._data;
    if (chartType === "stacked-bar" || chartType === "stacked-area") return stackedMax(series);
    let max = 0;
    for (const s of series) for (const v of s.values) if (v > max) max = v;
    return max || 1;
  }

  private _renderXAxis(
    grid: Grid,
    area: { x: number; y: number; width: number; height: number },
    _totalWidth: number,
  ): void {
    const labels = this._data.xLabels ?? [];
    if (labels.length === 0) return;
    const axisY = area.y + area.height;
    const { chartType } = this._data;
    const isBar = chartType === "bar" || chartType === "stacked-bar";
    const spacing = isBar
      ? Math.max(1, Math.floor(area.width / labels.length))
      : labels.length > 1
        ? Math.max(1, Math.floor(area.width / (labels.length - 1)))
        : area.width;
    const lineWidth = isBar ? undefined : area.width;
    renderXAxis(grid, area.x, axisY, labels, spacing, lineWidth);
  }
}
