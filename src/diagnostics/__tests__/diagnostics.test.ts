// Diagnostics module tests — FrameStats, PerformanceOverlay, debug flags
// Tests for Phase 8, Plan 01: Diagnostics

import { describe, it, expect, beforeEach } from 'bun:test';
import { FrameStats } from '../frame-stats';
import { PerformanceOverlay, severityStyle } from '../perf-overlay';
import { debugFlags, setDebugFlag, resetDebugFlags } from '../debug-flags';
import { TextSpan } from '../../core/text-span';
import { TextStyle } from '../../core/text-style';
import { Color } from '../../core/color';
import { Text } from '../../widgets/text';

// ---------------------------------------------------------------------------
// FrameStats
// ---------------------------------------------------------------------------

describe('FrameStats', () => {
  let stats: FrameStats;

  beforeEach(() => {
    stats = new FrameStats();
  });

  it('recordFrame stores values and frameCount increments', () => {
    expect(stats.frameCount).toBe(0);
    stats.recordFrame(10);
    expect(stats.frameCount).toBe(1);
    stats.recordFrame(20);
    expect(stats.frameCount).toBe(2);
    stats.recordFrame(30);
    expect(stats.frameCount).toBe(3);
  });

  it('getPercentile returns correct P50 for known data', () => {
    // Record values 1..100 — P50 should be around 50
    for (let i = 1; i <= 100; i++) {
      stats.recordFrame(i);
    }
    // P50 = value at index floor(100 * 50 / 100) = index 50
    // Sorted array: [1, 2, ..., 100], index 50 = 51
    expect(stats.getPercentile(50)).toBe(51);
  });

  it('getPercentile returns correct P95 for known data', () => {
    for (let i = 1; i <= 100; i++) {
      stats.recordFrame(i);
    }
    // P95 = value at index floor(100 * 95 / 100) = index 95
    // Sorted: [1..100], index 95 = 96
    expect(stats.getPercentile(95)).toBe(96);
  });

  it('getPercentile returns correct P99 for known data', () => {
    for (let i = 1; i <= 100; i++) {
      stats.recordFrame(i);
    }
    // P99 = value at index floor(100 * 99 / 100) = index 99
    // Sorted: [1..100], index 99 = 100
    expect(stats.getPercentile(99)).toBe(100);
  });

  it('ring buffer wraps around after capacity', () => {
    const small = new FrameStats(4);
    // Fill the buffer: [10, 20, 30, 40]
    small.recordFrame(10);
    small.recordFrame(20);
    small.recordFrame(30);
    small.recordFrame(40);
    expect(small.frameCount).toBe(4);

    // Overwrite: index wraps to 0, buffer becomes [50, 20, 30, 40]
    small.recordFrame(50);
    expect(small.frameCount).toBe(5);
    // Last frame should be 50
    expect(small.lastFrameMs).toBe(50);

    // The buffer now contains [50, 20, 30, 40]
    // Sorted: [20, 30, 40, 50]
    // P50 = index floor(4 * 50 / 100) = index 2 = 40
    expect(small.getPercentile(50)).toBe(40);
  });

  it('ring buffer only considers actual samples (not capacity)', () => {
    // Only record 3 samples in a buffer with capacity 1024
    stats.recordFrame(5);
    stats.recordFrame(10);
    stats.recordFrame(15);

    // With 3 samples [5, 10, 15]:
    // P50 = index floor(3 * 50 / 100) = index 1 = 10
    expect(stats.getPercentile(50)).toBe(10);
    // Average should be (5+10+15)/3 = 10
    expect(stats.averageMs).toBe(10);
  });

  it('averageMs computes mean correctly', () => {
    stats.recordFrame(10);
    stats.recordFrame(20);
    stats.recordFrame(30);
    stats.recordFrame(40);
    // Average = (10+20+30+40)/4 = 25
    expect(stats.averageMs).toBe(25);
  });

  it('reset clears all data', () => {
    stats.recordFrame(10);
    stats.recordFrame(20);
    stats.recordPhase('build', 5);

    stats.reset();

    expect(stats.frameCount).toBe(0);
    expect(stats.lastFrameMs).toBe(0);
    expect(stats.averageMs).toBe(0);
    expect(stats.p50).toBe(0);
    expect(stats.getPhasePercentile('build', 50)).toBe(0);
  });

  it('recordPhase stores per-phase timings', () => {
    stats.recordPhase('build', 3);
    stats.recordPhase('build', 5);
    stats.recordPhase('layout', 7);

    // Build has 2 samples, layout has 1
    expect(stats.getPhasePercentile('build', 50)).toBeGreaterThan(0);
    expect(stats.getPhasePercentile('layout', 50)).toBe(7);
  });

  it('getPhasePercentile works independently per phase', () => {
    // Record different values for different phases
    for (let i = 1; i <= 10; i++) {
      stats.recordPhase('build', i);
      stats.recordPhase('paint', i * 10);
    }

    const buildP50 = stats.getPhasePercentile('build', 50);
    const paintP50 = stats.getPhasePercentile('paint', 50);

    // Build: sorted [1..10], P50 = index floor(10*50/100) = index 5 = 6
    expect(buildP50).toBe(6);
    // Paint: sorted [10,20,...,100], P50 = index 5 = 60
    expect(paintP50).toBe(60);
  });

  it('lastFrameMs returns most recent sample', () => {
    stats.recordFrame(100);
    expect(stats.lastFrameMs).toBe(100);
    stats.recordFrame(200);
    expect(stats.lastFrameMs).toBe(200);
    stats.recordFrame(50);
    expect(stats.lastFrameMs).toBe(50);
  });

  it('empty stats returns 0 for all metrics', () => {
    expect(stats.frameCount).toBe(0);
    expect(stats.lastFrameMs).toBe(0);
    expect(stats.averageMs).toBe(0);
    expect(stats.p50).toBe(0);
    expect(stats.p95).toBe(0);
    expect(stats.p99).toBe(0);
    expect(stats.getPercentile(50)).toBe(0);
    expect(stats.getPhasePercentile('build', 50)).toBe(0);
    expect(stats.getPhasePercentile('nonexistent', 99)).toBe(0);
  });

  it('p50/p95/p99 shortcut properties work', () => {
    for (let i = 1; i <= 100; i++) {
      stats.recordFrame(i);
    }
    expect(stats.p50).toBe(stats.getPercentile(50));
    expect(stats.p95).toBe(stats.getPercentile(95));
    expect(stats.p99).toBe(stats.getPercentile(99));
  });

  it('handles single sample correctly', () => {
    stats.recordFrame(42);
    expect(stats.frameCount).toBe(1);
    expect(stats.lastFrameMs).toBe(42);
    expect(stats.averageMs).toBe(42);
    // With 1 sample, any percentile returns that single value
    // P50 = index floor(1 * 50 / 100) = 0 -> value at 0 = 42
    expect(stats.p50).toBe(42);
    expect(stats.p95).toBe(42);
    expect(stats.p99).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// PerformanceOverlay
// ---------------------------------------------------------------------------

describe('PerformanceOverlay', () => {
  let stats: FrameStats;

  beforeEach(() => {
    stats = new FrameStats();
  });

  it('renders P50/P95/P99 text', () => {
    // Record some frame times
    for (let i = 1; i <= 50; i++) {
      stats.recordFrame(i);
    }

    const overlay = new PerformanceOverlay({ frameStats: stats });
    // BuildContext is not needed for our test — just need the Widget output
    const widget = overlay.build({} as any);

    // The widget should be a Text widget
    expect(widget).toBeInstanceOf(Text);
    const textWidget = widget as Text;
    const plainText = textWidget.text.toPlainText();

    // Should contain P50, P95, P99, and frame count
    expect(plainText).toContain('P50=');
    expect(plainText).toContain('P95=');
    expect(plainText).toContain('P99=');
    expect(plainText).toContain('50 frames');
  });

  it('shows per-phase metrics when showPerPhase is true', () => {
    stats.recordFrame(10);
    stats.recordPhase('build', 2);
    stats.recordPhase('layout', 3);
    stats.recordPhase('paint', 4);
    stats.recordPhase('render', 1);

    const overlay = new PerformanceOverlay({
      frameStats: stats,
      showPerPhase: true,
    });
    const widget = overlay.build({} as any) as Text;
    const plainText = widget.text.toPlainText();

    expect(plainText).toContain('Build:');
    expect(plainText).toContain('Layout:');
    expect(plainText).toContain('Paint:');
    expect(plainText).toContain('Render:');
  });

  it('does not show per-phase metrics by default', () => {
    stats.recordFrame(10);
    stats.recordPhase('build', 2);

    const overlay = new PerformanceOverlay({ frameStats: stats });
    const widget = overlay.build({} as any) as Text;
    const plainText = widget.text.toPlainText();

    expect(plainText).not.toContain('Build:');
    expect(plainText).not.toContain('Layout:');
  });

  it('color codes values by severity', () => {
    // severityStyle is the core function
    // < 16ms = green (good)
    const goodStyle = severityStyle(5);
    expect(goodStyle.foreground).toBeDefined();
    expect(goodStyle.foreground!.equals(Color.green)).toBe(true);

    // 16-33ms = yellow (warning)
    const warnStyle = severityStyle(20);
    expect(warnStyle.foreground).toBeDefined();
    expect(warnStyle.foreground!.equals(Color.yellow)).toBe(true);

    // > 33ms = red (bad)
    const badStyle = severityStyle(50);
    expect(badStyle.foreground).toBeDefined();
    expect(badStyle.foreground!.equals(Color.red)).toBe(true);
  });

  it('severity thresholds at boundaries', () => {
    // Exactly 16ms = warning (>= 16)
    expect(severityStyle(16).foreground!.equals(Color.yellow)).toBe(true);
    // Exactly 33ms = warning (<= 33)
    expect(severityStyle(33).foreground!.equals(Color.yellow)).toBe(true);
    // Just above 33ms = bad
    expect(severityStyle(33.1).foreground!.equals(Color.red)).toBe(true);
    // Just below 16ms = good
    expect(severityStyle(15.9).foreground!.equals(Color.green)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Debug Flags
// ---------------------------------------------------------------------------

describe('debugFlags', () => {
  beforeEach(() => {
    resetDebugFlags();
  });

  it('default flags are all false', () => {
    expect(debugFlags.debugPaintSize).toBe(false);
    expect(debugFlags.debugPrintBuilds).toBe(false);
    expect(debugFlags.debugPrintLayouts).toBe(false);
    expect(debugFlags.debugPrintPaints).toBe(false);
    expect(debugFlags.debugRepaintRainbow).toBe(false);
    expect(debugFlags.debugShowFrameStats).toBe(false);
  });

  it('setDebugFlag toggles specific flag', () => {
    setDebugFlag('debugPaintSize', true);
    expect(debugFlags.debugPaintSize).toBe(true);
    // Other flags should remain false
    expect(debugFlags.debugPrintBuilds).toBe(false);
    expect(debugFlags.debugPrintLayouts).toBe(false);
    expect(debugFlags.debugPrintPaints).toBe(false);
    expect(debugFlags.debugRepaintRainbow).toBe(false);
    expect(debugFlags.debugShowFrameStats).toBe(false);

    // Toggle it back
    setDebugFlag('debugPaintSize', false);
    expect(debugFlags.debugPaintSize).toBe(false);
  });

  it('resetDebugFlags sets all to false', () => {
    // Set several flags
    setDebugFlag('debugPaintSize', true);
    setDebugFlag('debugPrintBuilds', true);
    setDebugFlag('debugRepaintRainbow', true);
    setDebugFlag('debugShowFrameStats', true);

    // Verify they are set
    expect(debugFlags.debugPaintSize).toBe(true);
    expect(debugFlags.debugPrintBuilds).toBe(true);

    // Reset
    resetDebugFlags();

    // All should be false
    expect(debugFlags.debugPaintSize).toBe(false);
    expect(debugFlags.debugPrintBuilds).toBe(false);
    expect(debugFlags.debugPrintLayouts).toBe(false);
    expect(debugFlags.debugPrintPaints).toBe(false);
    expect(debugFlags.debugRepaintRainbow).toBe(false);
    expect(debugFlags.debugShowFrameStats).toBe(false);
  });

  it('flags are independent', () => {
    setDebugFlag('debugPrintBuilds', true);
    setDebugFlag('debugPrintPaints', true);

    expect(debugFlags.debugPrintBuilds).toBe(true);
    expect(debugFlags.debugPrintPaints).toBe(true);
    expect(debugFlags.debugPrintLayouts).toBe(false);

    // Changing one doesn't affect the other
    setDebugFlag('debugPrintBuilds', false);
    expect(debugFlags.debugPrintBuilds).toBe(false);
    expect(debugFlags.debugPrintPaints).toBe(true);
  });

  it('setDebugFlag can set multiple flags independently', () => {
    setDebugFlag('debugPaintSize', true);
    setDebugFlag('debugPrintLayouts', true);
    setDebugFlag('debugShowFrameStats', true);

    expect(debugFlags.debugPaintSize).toBe(true);
    expect(debugFlags.debugPrintBuilds).toBe(false);
    expect(debugFlags.debugPrintLayouts).toBe(true);
    expect(debugFlags.debugPrintPaints).toBe(false);
    expect(debugFlags.debugRepaintRainbow).toBe(false);
    expect(debugFlags.debugShowFrameStats).toBe(true);
  });
});
