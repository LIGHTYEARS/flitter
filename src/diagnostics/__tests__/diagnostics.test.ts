// Diagnostics module tests — FrameStats, PerformanceOverlay, debug flags
// Tests for Phase 8, Plan 01: Diagnostics
// Phase 21 upgrade: Additional metrics, P95/P99, direct-to-buffer overlay, toggle

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { FrameStats, RingBuffer } from '../frame-stats';
import { PerformanceOverlay, severityStyle, budgetColor, severityColor, BOX_WIDTH, BOX_HEIGHT } from '../perf-overlay';
import { debugFlags, setDebugFlag, resetDebugFlags } from '../debug-flags';
import { Color } from '../../core/color';
import { ScreenBuffer } from '../../terminal/screen-buffer';
import { WidgetsBinding } from '../../framework/binding';

// ---------------------------------------------------------------------------
// RingBuffer
// ---------------------------------------------------------------------------

describe('RingBuffer', () => {
  it('push and count', () => {
    const rb = new RingBuffer(4);
    expect(rb.count).toBe(0);
    rb.push(10);
    expect(rb.count).toBe(1);
    rb.push(20);
    expect(rb.count).toBe(2);
  });

  it('last returns most recent value', () => {
    const rb = new RingBuffer(4);
    expect(rb.last).toBe(0);
    rb.push(42);
    expect(rb.last).toBe(42);
    rb.push(99);
    expect(rb.last).toBe(99);
  });

  it('wraps around after capacity', () => {
    const rb = new RingBuffer(3);
    rb.push(1);
    rb.push(2);
    rb.push(3);
    rb.push(4); // overwrites index 0
    expect(rb.count).toBe(4);
    expect(rb.last).toBe(4);
  });

  it('getPercentile with sorted data', () => {
    const rb = new RingBuffer(100);
    for (let i = 1; i <= 100; i++) {
      rb.push(i);
    }
    expect(rb.getPercentile(50)).toBe(51);
    expect(rb.getPercentile(95)).toBe(96);
    expect(rb.getPercentile(99)).toBe(100);
  });

  it('average computes mean', () => {
    const rb = new RingBuffer(10);
    rb.push(10);
    rb.push(20);
    rb.push(30);
    expect(rb.average).toBe(20);
  });

  it('reset clears data', () => {
    const rb = new RingBuffer(4);
    rb.push(10);
    rb.push(20);
    rb.reset();
    expect(rb.count).toBe(0);
    expect(rb.last).toBe(0);
    expect(rb.getPercentile(50)).toBe(0);
  });
});

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
    stats.recordKeyEvent(1);
    stats.recordMouseEvent(2);
    stats.recordRepaintPercent(50);
    stats.recordBytesWritten(1024);

    stats.reset();

    expect(stats.frameCount).toBe(0);
    expect(stats.lastFrameMs).toBe(0);
    expect(stats.averageMs).toBe(0);
    expect(stats.p50).toBe(0);
    expect(stats.getPhasePercentile('build', 50)).toBe(0);
    expect(stats.keyEventTimes.count).toBe(0);
    expect(stats.mouseEventTimes.count).toBe(0);
    expect(stats.repaintPercents.count).toBe(0);
    expect(stats.bytesWritten.count).toBe(0);
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

  // --- Phase 21: New metric ring buffers (PERF-01) ---

  describe('keyEventTimes', () => {
    it('records and retrieves key event timings', () => {
      stats.recordKeyEvent(1);
      stats.recordKeyEvent(2);
      stats.recordKeyEvent(3);
      expect(stats.keyEventTimes.count).toBe(3);
      expect(stats.keyEventTimes.last).toBe(3);
    });

    it('P95/P99 getters work', () => {
      for (let i = 1; i <= 100; i++) {
        stats.recordKeyEvent(i);
      }
      expect(stats.keyEventP95).toBe(96);
      expect(stats.keyEventP99).toBe(100);
    });
  });

  describe('mouseEventTimes', () => {
    it('records and retrieves mouse event timings', () => {
      stats.recordMouseEvent(5);
      stats.recordMouseEvent(10);
      expect(stats.mouseEventTimes.count).toBe(2);
      expect(stats.mouseEventTimes.last).toBe(10);
    });

    it('P95/P99 getters work', () => {
      for (let i = 1; i <= 100; i++) {
        stats.recordMouseEvent(i);
      }
      expect(stats.mouseEventP95).toBe(96);
      expect(stats.mouseEventP99).toBe(100);
    });
  });

  describe('repaintPercents', () => {
    it('records and retrieves repaint percentages', () => {
      stats.recordRepaintPercent(25);
      stats.recordRepaintPercent(50);
      stats.recordRepaintPercent(75);
      expect(stats.repaintPercents.count).toBe(3);
      expect(stats.repaintPercents.last).toBe(75);
    });

    it('P95/P99 getters work', () => {
      for (let i = 1; i <= 100; i++) {
        stats.recordRepaintPercent(i);
      }
      expect(stats.repaintPercentP95).toBe(96);
      expect(stats.repaintPercentP99).toBe(100);
    });
  });

  describe('bytesWritten', () => {
    it('records and retrieves bytes written', () => {
      stats.recordBytesWritten(512);
      stats.recordBytesWritten(1024);
      expect(stats.bytesWritten.count).toBe(2);
      expect(stats.bytesWritten.last).toBe(1024);
    });

    it('P95/P99 getters work', () => {
      for (let i = 1; i <= 100; i++) {
        stats.recordBytesWritten(i * 100);
      }
      expect(stats.bytesWrittenP95).toBe(9600);
      expect(stats.bytesWrittenP99).toBe(10000);
    });
  });

  describe('phase P95/P99 getters', () => {
    it('getPhaseP95 and getPhaseP99 return correct values', () => {
      for (let i = 1; i <= 100; i++) {
        stats.recordPhase('build', i);
      }
      expect(stats.getPhaseP95('build')).toBe(96);
      expect(stats.getPhaseP99('build')).toBe(100);
    });

    it('returns 0 for unknown phase', () => {
      expect(stats.getPhaseP95('nonexistent')).toBe(0);
      expect(stats.getPhaseP99('nonexistent')).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// PerformanceOverlay (Phase 21: Direct-to-buffer)
// ---------------------------------------------------------------------------

describe('PerformanceOverlay', () => {
  let stats: FrameStats;
  let screen: ScreenBuffer;
  let overlay: PerformanceOverlay;

  beforeEach(() => {
    stats = new FrameStats();
    screen = new ScreenBuffer(80, 24);
    overlay = new PerformanceOverlay();
  });

  describe('draw() border and title', () => {
    it('draws box-drawing borders at top-right corner', () => {
      stats.recordFrame(10);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH; // 46
      const originY = 0;

      // Top-left corner
      expect(screen.getCell(originX, originY).char).toBe('\u250C'); // ┌
      // Top-right corner
      expect(screen.getCell(originX + BOX_WIDTH - 1, originY).char).toBe('\u2510'); // ┐
      // Bottom-left corner
      expect(screen.getCell(originX, originY + BOX_HEIGHT - 1).char).toBe('\u2514'); // └
      // Bottom-right corner
      expect(screen.getCell(originX + BOX_WIDTH - 1, originY + BOX_HEIGHT - 1).char).toBe('\u2518'); // ┘
    });

    it('draws "Gotta Go Fast" title centered in top border', () => {
      stats.recordFrame(10);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      // Extract chars from top border row
      let topBorder = '';
      for (let i = 0; i < BOX_WIDTH; i++) {
        topBorder += screen.getCell(originX + i, 0).char;
      }
      expect(topBorder).toContain('Gotta Go Fast');
    });

    it('draws side borders (vertical lines)', () => {
      stats.recordFrame(10);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      // Check a few vertical borders
      for (let r = 1; r < BOX_HEIGHT - 1; r++) {
        const leftCell = screen.getCell(originX, r);
        const rightCell = screen.getCell(originX + BOX_WIDTH - 1, r);
        // Left side should be │ or ├
        expect(['\u2502', '\u251C']).toContain(leftCell.char);
        // Right side should be │ or ┤
        expect(['\u2502', '\u2524']).toContain(rightCell.char);
      }
    });
  });

  describe('draw() content', () => {
    it('shows FPS value', () => {
      // Record frame times of 10ms each -> 100 FPS
      for (let i = 0; i < 10; i++) {
        stats.recordFrame(10);
      }
      overlay.draw(screen, stats);

      // Extract first content row
      const originX = 80 - BOX_WIDTH;
      let line1 = '';
      for (let i = 1; i < BOX_WIDTH - 1; i++) {
        line1 += screen.getCell(originX + i, 1).char;
      }
      expect(line1).toContain('FPS:');
      expect(line1).toContain('100');
    });

    it('shows frame time P50/P95/P99', () => {
      for (let i = 1; i <= 50; i++) {
        stats.recordFrame(i);
      }
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      // Row 3 should be the header row with P50/P95/P99
      let headerRow = '';
      for (let i = 1; i < BOX_WIDTH - 1; i++) {
        headerRow += screen.getCell(originX + i, 3).char;
      }
      expect(headerRow).toContain('P50');
      expect(headerRow).toContain('P95');
      expect(headerRow).toContain('P99');
    });

    it('shows Build, Layout, Paint labels', () => {
      stats.recordFrame(10);
      stats.recordPhase('build', 2);
      stats.recordPhase('layout', 3);
      stats.recordPhase('paint', 4);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      // Rows 5, 6, 7 should have Build, Layout, Paint
      const getRowText = (row: number) => {
        let text = '';
        for (let i = 1; i < BOX_WIDTH - 1; i++) {
          text += screen.getCell(originX + i, row).char;
        }
        return text;
      };

      expect(getRowText(5)).toContain('Build');
      expect(getRowText(6)).toContain('Layout');
      expect(getRowText(7)).toContain('Paint');
    });

    it('shows Repaint percentage row', () => {
      stats.recordFrame(10);
      stats.recordRepaintPercent(42);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      let repaintRow = '';
      for (let i = 1; i < BOX_WIDTH - 1; i++) {
        repaintRow += screen.getCell(originX + i, 9).char;
      }
      expect(repaintRow).toContain('Repaint');
    });

    it('shows Bytes written row', () => {
      stats.recordFrame(10);
      stats.recordBytesWritten(1024);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      let bytesRow = '';
      for (let i = 1; i < BOX_WIDTH - 1; i++) {
        bytesRow += screen.getCell(originX + i, 10).char;
      }
      expect(bytesRow).toContain('Bytes');
    });

    it('shows Key/Mouse event times row', () => {
      stats.recordFrame(10);
      stats.recordKeyEvent(2);
      stats.recordMouseEvent(3);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      let evtRow = '';
      for (let i = 1; i < BOX_WIDTH - 1; i++) {
        evtRow += screen.getCell(originX + i, 12).char;
      }
      expect(evtRow).toContain('Key');
      expect(evtRow).toContain('Mouse');
    });
  });

  describe('draw() edge cases', () => {
    it('does not draw if screen is too small', () => {
      const smallScreen = new ScreenBuffer(20, 10);
      overlay.draw(smallScreen, stats);
      // No crash, and no border chars at (0,0) since screen is too small
      expect(smallScreen.getCell(0, 0).char).toBe(' ');
    });

    it('handles empty stats gracefully', () => {
      overlay.draw(screen, stats);
      // Should not throw, should show FPS: 0
      const originX = 80 - BOX_WIDTH;
      let line1 = '';
      for (let i = 1; i < BOX_WIDTH - 1; i++) {
        line1 += screen.getCell(originX + i, 1).char;
      }
      expect(line1).toContain('FPS:');
      expect(line1).toContain('0');
    });
  });

  describe('draw() color thresholds', () => {
    it('uses green for fast frame times (< 70% budget)', () => {
      // 5ms is well under budget (16.67ms), so < 30% budget = green
      stats.recordFrame(5);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      // Frame row is row 4, metrics start after "Frame " label (6 chars)
      // The first digit of the metric value should have green fg
      const metricCell = screen.getCell(originX + 7, 4);
      expect(metricCell.style.fg).toBeDefined();
      expect(metricCell.style.fg!.equals(Color.green)).toBe(true);
    });

    it('uses red for slow frame times (> 100% budget)', () => {
      // 50ms is well over budget (300% of 16.67ms) = red
      stats.recordFrame(50);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      // Check a metric cell in the frame row
      // We need to find a digit cell that's colored
      let foundRed = false;
      for (let i = 7; i < BOX_WIDTH - 2; i++) {
        const cell = screen.getCell(originX + i, 4);
        if (cell.style.fg && cell.style.fg.equals(Color.red)) {
          foundRed = true;
          break;
        }
      }
      expect(foundRed).toBe(true);
    });

    it('uses yellow for medium frame times (70-100% budget)', () => {
      // 14ms is about 84% of budget = yellow
      stats.recordFrame(14);
      overlay.draw(screen, stats);

      const originX = 80 - BOX_WIDTH;
      let foundYellow = false;
      for (let i = 7; i < BOX_WIDTH - 2; i++) {
        const cell = screen.getCell(originX + i, 4);
        if (cell.style.fg && cell.style.fg.equals(Color.yellow)) {
          foundYellow = true;
          break;
        }
      }
      expect(foundYellow).toBe(true);
    });
  });

  describe('color functions', () => {
    it('severityStyle returns green for fast times (< 16ms)', () => {
      const style = severityStyle(5);
      expect(style.foreground).toBeDefined();
      expect(style.foreground!.equals(Color.green)).toBe(true);
    });

    it('severityStyle returns yellow for medium times (16-33ms)', () => {
      const style = severityStyle(20);
      expect(style.foreground).toBeDefined();
      expect(style.foreground!.equals(Color.yellow)).toBe(true);
    });

    it('severityStyle returns red for slow times (> 33ms)', () => {
      const style = severityStyle(50);
      expect(style.foreground).toBeDefined();
      expect(style.foreground!.equals(Color.red)).toBe(true);
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

    it('budgetColor returns green for < 70%', () => {
      expect(budgetColor(50).equals(Color.green)).toBe(true);
    });

    it('budgetColor returns yellow for 70-100%', () => {
      expect(budgetColor(85).equals(Color.yellow)).toBe(true);
    });

    it('budgetColor returns red for > 100%', () => {
      expect(budgetColor(150).equals(Color.red)).toBe(true);
    });

    it('severityColor maps ms to budget-based color', () => {
      // 5ms = ~30% budget = green
      expect(severityColor(5).equals(Color.green)).toBe(true);
      // 14ms = ~84% budget = yellow
      expect(severityColor(14).equals(Color.yellow)).toBe(true);
      // 25ms = ~150% budget = red
      expect(severityColor(25).equals(Color.red)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// toggleFrameStatsOverlay (Phase 21: PERF-03)
// ---------------------------------------------------------------------------

describe('toggleFrameStatsOverlay', () => {
  afterEach(() => {
    WidgetsBinding.reset();
  });

  it('toggles overlay on and off', () => {
    const binding = WidgetsBinding.instance;
    expect(binding.showFrameStatsOverlay).toBe(false);
    binding.toggleFrameStatsOverlay();
    expect(binding.showFrameStatsOverlay).toBe(true);
    binding.toggleFrameStatsOverlay();
    expect(binding.showFrameStatsOverlay).toBe(false);
  });

  it('getFrameStats returns a FrameStats instance', () => {
    const binding = WidgetsBinding.instance;
    const stats = binding.getFrameStats();
    expect(stats).toBeInstanceOf(FrameStats);
    // Same instance on repeated calls
    expect(binding.getFrameStats()).toBe(stats);
  });

  it('reset clears overlay state', () => {
    const binding = WidgetsBinding.instance;
    binding.toggleFrameStatsOverlay();
    expect(binding.showFrameStatsOverlay).toBe(true);
    WidgetsBinding.reset();
    const binding2 = WidgetsBinding.instance;
    expect(binding2.showFrameStatsOverlay).toBe(false);
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
