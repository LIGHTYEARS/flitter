// PerformanceOverlay — Direct-to-buffer performance metrics overlay
// Amp ref: BB0 (PerformanceOverlay)
// Source: .reference/frame-scheduler.md
//
// Phase 21 upgrade: Direct-to-buffer rendering via ScreenBuffer.setChar().
// Paints a 34x14 box at the top-right corner of the screen buffer.
// No longer a StatelessWidget — used as a standalone draw utility.

import { ScreenBuffer } from '../terminal/screen-buffer';
import { Color } from '../core/color';
import { FrameStats } from './frame-stats';
import type { CellStyle } from '../terminal/cell';
import { PerfAttribution } from './perf-attribution';

// --- Constants ---

/** Overlay box dimensions */
const BOX_WIDTH = 34;
const BOX_HEIGHT = 17;

/** Frame budget at 60fps */
const FRAME_BUDGET_MS = 16.67;

// --- Color threshold helpers ---

/**
 * Returns the foreground Color for a budget percentage.
 * < 70% = green, 70-100% = yellow, > 100% = red
 */
export function budgetColor(percent: number): Color {
  if (percent < 70) return Color.green;
  if (percent <= 100) return Color.yellow;
  return Color.red;
}

/**
 * Returns the foreground Color for a frame time in ms.
 * Uses budget percentage thresholds: <70% budget = green, etc.
 */
export function severityColor(ms: number): Color {
  const percent = (ms / FRAME_BUDGET_MS) * 100;
  return budgetColor(percent);
}

/**
 * Legacy: Returns a TextStyle-compatible object for severity.
 * Kept for backward compatibility with existing tests.
 */
export function severityStyle(ms: number): { foreground?: Color } {
  if (ms < 16) return { foreground: Color.green };
  if (ms <= 33) return { foreground: Color.yellow };
  return { foreground: Color.red };
}

// --- Format helpers ---

/** Format milliseconds to fixed-width string (e.g. " 12.3") */
function fmtMs(ms: number, width: number = 5): string {
  return ms.toFixed(1).padStart(width);
}

/** Format percentage to fixed-width string (e.g. " 42%") */
function fmtPct(pct: number, width: number = 4): string {
  return (Math.round(pct) + '%').padStart(width);
}

/** Format bytes to human-readable (e.g. "1.2K", " 512") */
function fmtBytes(bytes: number, width: number = 5): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1).padStart(width - 1) + 'M';
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1).padStart(width - 1) + 'K';
  }
  return Math.round(bytes).toString().padStart(width);
}

// --- PerformanceOverlay ---

/**
 * PerformanceOverlay — Renders frame performance metrics directly to a ScreenBuffer.
 *
 * Paints a 34x14 Unicode box-drawing bordered panel at the top-right of the screen.
 * Color-coded thresholds: green (<70% budget), yellow (70-100%), red (>100%).
 *
 * Shows: FPS, frame time P50/P95/P99, layout/paint/build times,
 *        repaint %, bytes written.
 *
 * Amp ref: class BB0 — direct buffer paint mode
 */
export class PerformanceOverlay {
  // Kept for backward compat — not used by direct-to-buffer draw
  readonly frameStats: FrameStats;
  readonly showPerPhase: boolean;

  constructor(opts?: {
    key?: unknown;
    frameStats?: FrameStats;
    showPerPhase?: boolean;
  }) {
    this.frameStats = opts?.frameStats ?? new FrameStats();
    this.showPerPhase = opts?.showPerPhase ?? false;
  }

  /**
   * Draw the performance overlay directly onto the screen buffer.
   * Paints a BOX_WIDTH x BOX_HEIGHT box at the top-right corner.
   *
   * @param screen The ScreenBuffer to paint into
   * @param frameStats The FrameStats to read metrics from
   */
  draw(screen: ScreenBuffer, frameStats: FrameStats): void {
    const { width: screenW, height: screenH } = screen.getSize();
    if (screenW < BOX_WIDTH || screenH < BOX_HEIGHT) return;

    const originX = screenW - BOX_WIDTH;
    const originY = 0;

    const borderStyle: CellStyle = { fg: Color.white };
    const labelStyle: CellStyle = { fg: Color.white, dim: true };
    const titleStyle: CellStyle = { fg: Color.cyan, bold: true };

    // --- Draw border ---
    this._drawBorder(screen, originX, originY, borderStyle, titleStyle);

    // --- Draw content lines ---
    let row = originY + 1;
    const contentX = originX + 1;
    const contentW = BOX_WIDTH - 2; // inner width

    // Line 1: FPS + budget %
    const fps = frameStats.frameCount > 0 ? Math.round(1000 / Math.max(frameStats.averageMs, 0.001)) : 0;
    const budgetPct = (frameStats.averageMs / FRAME_BUDGET_MS) * 100;
    const fpsStr = `FPS: ${fps.toString().padStart(3)}`;
    const budgetStr = `Budget: ${fmtPct(budgetPct)}`;
    this._drawText(screen, contentX, row, fpsStr, labelStyle, contentW);
    this._drawTextAt(screen, originX + BOX_WIDTH - 2 - budgetStr.length, row, budgetStr, { fg: budgetColor(budgetPct) });
    row++;

    // Line 2: separator
    this._drawHSep(screen, originX, row, borderStyle);
    row++;

    // Line 3: Frame time header
    this._drawText(screen, contentX, row, '         P50    P95    P99', labelStyle, contentW);
    row++;

    // Line 4: Frame times
    const fp50 = frameStats.p50;
    const fp95 = frameStats.p95;
    const fp99 = frameStats.p99;
    this._drawLabel(screen, contentX, row, 'Frame ', labelStyle);
    this._drawMetricTriplet(screen, contentX + 6, row, fp50, fp95, fp99, true);
    row++;

    // Line 5: Build times
    const bp50 = frameStats.getPhasePercentile('build', 50);
    const bp95 = frameStats.getPhaseP95('build');
    const bp99 = frameStats.getPhaseP99('build');
    this._drawLabel(screen, contentX, row, 'Build ', labelStyle);
    this._drawMetricTriplet(screen, contentX + 6, row, bp50, bp95, bp99, true);
    row++;

    // Line 6: Layout times
    const lp50 = frameStats.getPhasePercentile('layout', 50);
    const lp95 = frameStats.getPhaseP95('layout');
    const lp99 = frameStats.getPhaseP99('layout');
    this._drawLabel(screen, contentX, row, 'Layout', labelStyle);
    this._drawMetricTriplet(screen, contentX + 6, row, lp50, lp95, lp99, true);
    row++;

    // Line 7: Paint times
    const pp50 = frameStats.getPhasePercentile('paint', 50);
    const pp95 = frameStats.getPhaseP95('paint');
    const pp99 = frameStats.getPhaseP99('paint');
    this._drawLabel(screen, contentX, row, 'Paint ', labelStyle);
    this._drawMetricTriplet(screen, contentX + 6, row, pp50, pp95, pp99, true);
    row++;

    // Line 8: separator
    this._drawHSep(screen, originX, row, borderStyle);
    row++;

    // Line 9: Repaint %
    const rp50 = frameStats.repaintPercents.getPercentile(50);
    const rp95 = frameStats.repaintPercentP95;
    const rp99 = frameStats.repaintPercentP99;
    const repaintLine = `Repaint  ${fmtPct(rp50)}   ${fmtPct(rp95)}   ${fmtPct(rp99)}`;
    this._drawText(screen, contentX, row, repaintLine, labelStyle, contentW);
    row++;

    // Line 10: Bytes written
    const bw50 = frameStats.bytesWritten.getPercentile(50);
    const bw95 = frameStats.bytesWrittenP95;
    const bw99 = frameStats.bytesWrittenP99;
    const bytesLine = `Bytes  ${fmtBytes(bw50)} ${fmtBytes(bw95)} ${fmtBytes(bw99)}`;
    this._drawText(screen, contentX, row, bytesLine, labelStyle, contentW);
    row++;

    // Line 11: separator
    this._drawHSep(screen, originX, row, borderStyle);
    row++;

    // Line 12: Key/Mouse event times
    const kp95 = frameStats.keyEventP95;
    const mp95 = frameStats.mouseEventP95;
    const evtLine = `Key P95:${fmtMs(kp95, 5)} Mouse:${fmtMs(mp95, 5)}`;
    this._drawText(screen, contentX, row, evtLine, labelStyle, contentW);
    row++;

    this._drawHSep(screen, originX, row, borderStyle);
    row++;

    const attribution = PerfAttribution.instance;
    const dirtyLine = `Dirty  build:${attribution.frameBuildCount.toString().padStart(4)} layout:${attribution.frameLayoutCount.toString().padStart(4)}`;
    this._drawText(screen, contentX, row, dirtyLine, labelStyle, contentW);
    row++;

    const recentTimes = frameStats.getRecentFrameTimes(30);
    const sparkChars = '▁▂▃▄▅▆▇█';
    const maxTime = Math.max(FRAME_BUDGET_MS * 2, ...recentTimes);
    const sparkStyles: { char: string; style: CellStyle }[] = [];
    for (let i = 0; i < 30; i++) {
      if (i < recentTimes.length) {
        const t = recentTimes[i]!;
        const level = Math.min(Math.floor((t / maxTime) * (sparkChars.length - 1)), sparkChars.length - 1);
        const fg = t > FRAME_BUDGET_MS ? Color.red : Color.green;
        sparkStyles.push({ char: sparkChars[level]!, style: { fg } });
      } else {
        sparkStyles.push({ char: ' ', style: { fg: Color.white } });
      }
    }
    for (let i = 0; i < Math.min(sparkStyles.length, contentW); i++) {
      screen.setChar(contentX + i, row, sparkStyles[i]!.char, sparkStyles[i]!.style);
    }
  }

  // --- Private drawing helpers ---

  /**
   * Draw the box border with title "Gotta Go Fast" centered in the top edge.
   */
  private _drawBorder(
    screen: ScreenBuffer,
    x: number,
    y: number,
    borderStyle: CellStyle,
    titleStyle: CellStyle,
  ): void {
    const w = BOX_WIDTH;
    const h = BOX_HEIGHT;
    const title = ' Gotta Go Fast ';

    // Top border: ┌──── Gotta Go Fast ────┐
    screen.setChar(x, y, '\u250C', borderStyle); // ┌
    screen.setChar(x + w - 1, y, '\u2510', borderStyle); // ┐
    const titleStart = Math.floor((w - 2 - title.length) / 2) + 1;
    for (let i = 1; i < w - 1; i++) {
      if (i >= titleStart && i < titleStart + title.length) {
        screen.setChar(x + i, y, title[i - titleStart]!, titleStyle);
      } else {
        screen.setChar(x + i, y, '\u2500', borderStyle); // ─
      }
    }

    // Bottom border: └────────────────────────────────┘
    screen.setChar(x, y + h - 1, '\u2514', borderStyle); // └
    screen.setChar(x + w - 1, y + h - 1, '\u2518', borderStyle); // ┘
    for (let i = 1; i < w - 1; i++) {
      screen.setChar(x + i, y + h - 1, '\u2500', borderStyle); // ─
    }

    // Side borders
    for (let r = 1; r < h - 1; r++) {
      screen.setChar(x, y + r, '\u2502', borderStyle); // │
      screen.setChar(x + w - 1, y + r, '\u2502', borderStyle); // │
    }
  }

  /**
   * Draw a horizontal separator line: ├─────────────────────────────────┤
   */
  private _drawHSep(screen: ScreenBuffer, x: number, row: number, style: CellStyle): void {
    screen.setChar(x, row, '\u251C', style); // ├
    for (let i = 1; i < BOX_WIDTH - 1; i++) {
      screen.setChar(x + i, row, '\u2500', style); // ─
    }
    screen.setChar(x + BOX_WIDTH - 1, row, '\u2524', style); // ┤
  }

  /** Draw a text string at a position, char by char. */
  private _drawText(
    screen: ScreenBuffer,
    x: number,
    y: number,
    text: string,
    style: CellStyle,
    maxWidth: number,
  ): void {
    for (let i = 0; i < Math.min(text.length, maxWidth); i++) {
      screen.setChar(x + i, y, text[i]!, style);
    }
  }

  /** Draw text at an absolute position (no maxWidth clipping). */
  private _drawTextAt(
    screen: ScreenBuffer,
    x: number,
    y: number,
    text: string,
    style: CellStyle,
  ): void {
    for (let i = 0; i < text.length; i++) {
      screen.setChar(x + i, y, text[i]!, style);
    }
  }

  /** Draw a label (6 chars) at a position. */
  private _drawLabel(
    screen: ScreenBuffer,
    x: number,
    y: number,
    label: string,
    style: CellStyle,
  ): void {
    for (let i = 0; i < label.length; i++) {
      screen.setChar(x + i, y, label[i]!, style);
    }
  }

  /**
   * Draw a P50/P95/P99 metric triplet with severity coloring.
   * Each value is color-coded by budget percentage threshold.
   * @param isMs Whether values are milliseconds (use severityColor) or percent
   */
  private _drawMetricTriplet(
    screen: ScreenBuffer,
    x: number,
    y: number,
    p50: number,
    p95: number,
    p99: number,
    isMs: boolean,
  ): void {
    const colorFn = isMs ? severityColor : budgetColor;
    const fmtFn = isMs ? (v: number) => fmtMs(v) + 'ms' : (v: number) => fmtPct(v);

    const vals = [
      { value: p50, str: fmtFn(p50) },
      { value: p95, str: fmtFn(p95) },
      { value: p99, str: fmtFn(p99) },
    ];

    let col = x;
    for (const v of vals) {
      // severityColor expects ms, budgetColor expects percent
      const fg = isMs ? severityColor(v.value) : budgetColor(v.value);
      const style: CellStyle = { fg };
      for (let i = 0; i < v.str.length; i++) {
        screen.setChar(col + i, y, v.str[i]!, style);
      }
      col += v.str.length + 1; // +1 for spacing
    }
  }
}

// Re-export BOX_WIDTH and BOX_HEIGHT for testing
export { BOX_WIDTH, BOX_HEIGHT };
