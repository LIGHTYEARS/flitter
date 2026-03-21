// PerformanceOverlay — StatelessWidget that renders frame performance metrics
// Amp ref: BB0 (PerformanceOverlay)
// Source: .reference/frame-scheduler.md

import { StatelessWidget, Widget, BuildContext } from '../framework/widget';
import { TextSpan } from '../core/text-span';
import { TextStyle } from '../core/text-style';
import { Color } from '../core/color';
import { Text } from '../widgets/text';
import { Key } from '../core/key';
import { FrameStats } from './frame-stats';

// Severity thresholds (milliseconds)
const GOOD_THRESHOLD = 16;   // < 16ms = green (60fps)
const WARN_THRESHOLD = 33;   // 16-33ms = yellow (30fps)
                              // > 33ms = red

// Styles
const DIM_STYLE = new TextStyle({ dim: true });
const GOOD_STYLE = new TextStyle({ foreground: Color.green });
const WARN_STYLE = new TextStyle({ foreground: Color.yellow });
const BAD_STYLE = new TextStyle({ foreground: Color.red });

/**
 * Returns the appropriate TextStyle for a given frame time value.
 * < 16ms (60fps) = green, 16-33ms (30fps) = yellow, > 33ms = red
 */
export function severityStyle(ms: number): TextStyle {
  if (ms < GOOD_THRESHOLD) return GOOD_STYLE;
  if (ms <= WARN_THRESHOLD) return WARN_STYLE;
  return BAD_STYLE;
}

/**
 * Format a millisecond value to a fixed-width string with 1 decimal place.
 */
function fmtMs(ms: number): string {
  return ms.toFixed(1);
}

/**
 * PerformanceOverlay — Displays frame timing statistics.
 *
 * Renders P50/P95/P99 percentile values with color-coded severity.
 * Optionally shows per-phase (build, layout, paint, render) breakdowns.
 *
 * Amp ref: class BB0 extends StatelessWidget
 */
export class PerformanceOverlay extends StatelessWidget {
  readonly frameStats: FrameStats;
  readonly showPerPhase: boolean;

  constructor(opts: {
    key?: Key;
    frameStats: FrameStats;
    showPerPhase?: boolean;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.frameStats = opts.frameStats;
    this.showPerPhase = opts.showPerPhase ?? false;
  }

  build(_context: BuildContext): Widget {
    const stats = this.frameStats;
    const children: TextSpan[] = [];

    // Main frame line: "Frame: P50=Xms P95=Xms P99=Xms (N frames)"
    children.push(this._buildFrameLine(stats));

    // Per-phase lines if requested
    if (this.showPerPhase) {
      const phases = ['build', 'layout', 'paint', 'render'];
      for (const phase of phases) {
        children.push(this._buildPhaseLine(stats, phase));
      }
    }

    return new Text({
      text: new TextSpan({ children }),
    });
  }

  private _buildFrameLine(stats: FrameStats): TextSpan {
    const p50 = stats.p50;
    const p95 = stats.p95;
    const p99 = stats.p99;

    return new TextSpan({
      children: [
        new TextSpan({ text: 'Frame: ', style: DIM_STYLE }),
        new TextSpan({ text: 'P50=', style: DIM_STYLE }),
        new TextSpan({ text: `${fmtMs(p50)}ms `, style: severityStyle(p50) }),
        new TextSpan({ text: 'P95=', style: DIM_STYLE }),
        new TextSpan({ text: `${fmtMs(p95)}ms `, style: severityStyle(p95) }),
        new TextSpan({ text: 'P99=', style: DIM_STYLE }),
        new TextSpan({ text: `${fmtMs(p99)}ms `, style: severityStyle(p99) }),
        new TextSpan({
          text: `(${stats.frameCount} frames)\n`,
          style: DIM_STYLE,
        }),
      ],
    });
  }

  private _buildPhaseLine(stats: FrameStats, phase: string): TextSpan {
    const p50 = stats.getPhasePercentile(phase, 50);
    const p95 = stats.getPhasePercentile(phase, 95);
    // Pad phase name to 7 chars for alignment
    const label = (phase.charAt(0).toUpperCase() + phase.slice(1) + ':').padEnd(
      8,
    );

    return new TextSpan({
      children: [
        new TextSpan({ text: label, style: DIM_STYLE }),
        new TextSpan({ text: 'P50=', style: DIM_STYLE }),
        new TextSpan({ text: `${fmtMs(p50)}ms `, style: severityStyle(p50) }),
        new TextSpan({ text: 'P95=', style: DIM_STYLE }),
        new TextSpan({ text: `${fmtMs(p95)}ms`, style: severityStyle(p95) }),
        new TextSpan({ text: '\n', style: DIM_STYLE }),
      ],
    });
  }
}
