// Tests for Scrollbar widget and RenderScrollbar
// Verifies thumb/track rendering, scroll sync, layout, and edge cases

import { describe, test, expect } from 'bun:test';
import { Scrollbar, RenderScrollbar } from '../scrollbar';
import { ScrollController } from '../scroll-controller';
import { RenderBox, type PaintContext } from '../../framework/render-object';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import { Color } from '../../core/color';

// Mock PaintContext that records drawChar calls
class MockPaintContext {
  drawn: Array<{ x: number; y: number; char: string; style?: any; width?: number }> = [];

  drawChar(x: number, y: number, char: string, style?: any, width?: number): void {
    this.drawn.push({ x, y, char, style, width });
  }
}

describe('Scrollbar widget', () => {
  test('creates with default options', () => {
    const scrollbar = new Scrollbar({});
    expect(scrollbar.thickness).toBe(1);
    expect(scrollbar.trackChar).toBe('\u2591');
    expect(scrollbar.thumbChar).toBe('\u2588');
    expect(scrollbar.showTrack).toBe(true);
    expect(scrollbar.controller).toBeUndefined();
    expect(scrollbar.thumbColor).toBeUndefined();
    expect(scrollbar.trackColor).toBeUndefined();
  });

  test('creates with custom options', () => {
    const ctrl = new ScrollController();
    const thumbColor = Color.green;
    const trackColor = Color.brightBlack;
    const scrollbar = new Scrollbar({
      controller: ctrl,
      thickness: 2,
      trackChar: '|',
      thumbChar: '#',
      showTrack: false,
      thumbColor,
      trackColor,
    });
    expect(scrollbar.controller).toBe(ctrl);
    expect(scrollbar.thickness).toBe(2);
    expect(scrollbar.trackChar).toBe('|');
    expect(scrollbar.thumbChar).toBe('#');
    expect(scrollbar.showTrack).toBe(false);
    expect(scrollbar.thumbColor).toBe(thumbColor);
    expect(scrollbar.trackColor).toBe(trackColor);
  });

  test('creates with getScrollInfo callback', () => {
    const getScrollInfo = () => ({
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    });
    const scrollbar = new Scrollbar({ getScrollInfo });
    expect(scrollbar.getScrollInfo).toBe(getScrollInfo);
  });

  test('createState returns a State', () => {
    const scrollbar = new Scrollbar({});
    const state = scrollbar.createState();
    expect(state).toBeDefined();
  });
});

describe('RenderScrollbar', () => {
  test('creates with default values', () => {
    const render = new RenderScrollbar();
    expect(render.thickness).toBe(1);
    expect(render.trackChar).toBe('\u2591');
    expect(render.thumbChar).toBe('\u2588');
    expect(render.showTrack).toBe(true);
    expect(render.scrollInfo).toBeUndefined();
  });

  test('layout sizes to thickness x max height', () => {
    const render = new RenderScrollbar();
    render.thickness = 1;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 24,
    });

    render.layout(constraints);

    expect(render.size.width).toBe(1);
    expect(render.size.height).toBe(24);
  });

  test('layout respects thickness', () => {
    const render = new RenderScrollbar();
    render.thickness = 2;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 30,
    });

    render.layout(constraints);

    expect(render.size.width).toBe(2);
    expect(render.size.height).toBe(30);
  });

  test('intrinsic width returns thickness', () => {
    const render = new RenderScrollbar();
    render.thickness = 3;
    expect(render.getMinIntrinsicWidth(100)).toBe(3);
    expect(render.getMaxIntrinsicWidth(100)).toBe(3);
  });

  test('computeThumbMetrics returns null when no scrollInfo', () => {
    const render = new RenderScrollbar();
    expect(render.computeThumbMetrics(20)).toBeNull();
  });

  test('computeThumbMetrics returns null when viewport is zero', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    };
    expect(render.computeThumbMetrics(0)).toBeNull();
  });

  test('computeThumbMetrics returns null when content fits in viewport', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 10,
      viewportHeight: 20,
      scrollOffset: 0,
    };
    expect(render.computeThumbMetrics(20)).toBeNull();
  });

  test('computeThumbMetrics calculates correct thumb for top position', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    };

    const metrics = render.computeThumbMetrics(20);
    expect(metrics).not.toBeNull();
    expect(metrics!.thumbTop).toBe(0);
    // thumbHeight = max(1, round((20 / 100) * 20)) = max(1, 4) = 4
    expect(metrics!.thumbHeight).toBe(4);
  });

  test('computeThumbMetrics calculates correct thumb for middle position', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 40, // 50% of (100-20)=80
    };

    const metrics = render.computeThumbMetrics(20);
    expect(metrics).not.toBeNull();
    // thumbHeight = 4
    // maxThumbTop = 20 - 4 = 16
    // scrollFraction = 40 / 80 = 0.5
    // thumbTop = round(0.5 * 16) = 8
    expect(metrics!.thumbHeight).toBe(4);
    expect(metrics!.thumbTop).toBe(8);
  });

  test('computeThumbMetrics calculates correct thumb for bottom position', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 80, // 100% of (100-20)=80
    };

    const metrics = render.computeThumbMetrics(20);
    expect(metrics).not.toBeNull();
    // thumbHeight = 4
    // maxThumbTop = 16
    // scrollFraction = 80 / 80 = 1.0
    // thumbTop = round(1.0 * 16) = 16
    expect(metrics!.thumbHeight).toBe(4);
    expect(metrics!.thumbTop).toBe(16);
  });

  test('computeThumbMetrics ensures minimum thumb height of 1', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 10000,
      viewportHeight: 5,
      scrollOffset: 0,
    };

    const metrics = render.computeThumbMetrics(5);
    expect(metrics).not.toBeNull();
    // thumbHeight = max(1, round((5 / 10000) * 5)) = max(1, 0) = 1
    expect(metrics!.thumbHeight).toBe(1);
  });

  test('paint draws track when showTrack is true', () => {
    const render = new RenderScrollbar();
    render.showTrack = true;
    render.trackChar = '|';

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 5,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(10, 5));

    // Should have 5 track chars (height=5, width=1)
    const trackChars = ctx.drawn.filter((d) => d.char === '|');
    expect(trackChars.length).toBe(5);
    expect(trackChars[0]).toEqual({ x: 10, y: 5, char: '|', style: undefined, width: 1 });
    expect(trackChars[4]).toEqual({ x: 10, y: 9, char: '|', style: undefined, width: 1 });
  });

  test('paint does not draw track when showTrack is false', () => {
    const render = new RenderScrollbar();
    render.showTrack = false;
    render.trackChar = '|';

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 5,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const trackChars = ctx.drawn.filter((d) => d.char === '|');
    expect(trackChars.length).toBe(0);
  });

  test('paint draws thumb at correct position', () => {
    const render = new RenderScrollbar();
    render.showTrack = true;
    render.trackChar = '.';
    render.thumbChar = '#';
    render.subCharacterPrecision = false;
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0, // top
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const thumbChars = ctx.drawn.filter((d) => d.char === '#');
    // thumbHeight = max(1, round((20/100) * 20)) = 4
    expect(thumbChars.length).toBe(4);
    // Thumb should start at row 0 (scrollOffset = 0)
    expect(thumbChars[0].y).toBe(0);
    expect(thumbChars[3].y).toBe(3);
  });

  test('paint draws thumb at bottom when scrolled to end', () => {
    const render = new RenderScrollbar();
    render.showTrack = false;
    render.thumbChar = '#';
    render.subCharacterPrecision = false;
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 80, // bottom (100 - 20)
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const thumbChars = ctx.drawn.filter((d) => d.char === '#');
    // thumbHeight = 4, maxThumbTop = 16
    expect(thumbChars.length).toBe(4);
    expect(thumbChars[0].y).toBe(16);
    expect(thumbChars[3].y).toBe(19);
  });

  test('paint applies thumb color', () => {
    const render = new RenderScrollbar();
    render.showTrack = false;
    render.thumbChar = '#';
    render.thumbColor = Color.green;
    render.subCharacterPrecision = false;
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 10,
      scrollOffset: 0,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const thumbChars = ctx.drawn.filter((d) => d.char === '#');
    expect(thumbChars.length).toBeGreaterThan(0);
    expect(thumbChars[0].style).toEqual({ fg: Color.green });
  });

  test('paint applies track color', () => {
    const render = new RenderScrollbar();
    render.showTrack = true;
    render.trackChar = '.';
    render.trackColor = Color.brightBlack;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 3,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const trackChars = ctx.drawn.filter((d) => d.char === '.');
    expect(trackChars.length).toBe(3);
    expect(trackChars[0].style).toEqual({ fg: Color.brightBlack });
  });

  test('paint does nothing with non-PaintContext', () => {
    const render = new RenderScrollbar();
    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    // Should not throw with a plain object that has no drawChar
    render.paint({} as any, Offset.zero);
  });

  test('paint with thickness 2 draws two columns', () => {
    const render = new RenderScrollbar();
    render.showTrack = true;
    render.trackChar = '.';
    render.thickness = 2;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 3,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(5, 0));

    const trackChars = ctx.drawn.filter((d) => d.char === '.');
    // 3 rows x 2 cols = 6
    expect(trackChars.length).toBe(6);
    // Check both columns are drawn
    const xValues = new Set(trackChars.map((d) => d.x));
    expect(xValues.has(5)).toBe(true);
    expect(xValues.has(6)).toBe(true);
  });

  test('computeThumbMetrics with zero viewportHeight in scrollInfo uses render height', () => {
    const render = new RenderScrollbar();
    // Simulates controller-derived scrollInfo where viewportHeight is 0
    render.scrollInfo = {
      totalContentHeight: 81, // maxScrollExtent(80) + 1 approximation
      viewportHeight: 0,
      scrollOffset: 0,
    };

    // The render height is 20
    const metrics = render.computeThumbMetrics(20);
    expect(metrics).not.toBeNull();
    // After adjustment: totalContentHeight = 81 - 1 + 20 = 100
    // thumbHeight = max(1, round((20 / 100) * 20)) = 4
    expect(metrics!.thumbHeight).toBe(4);
    expect(metrics!.thumbTop).toBe(0);
  });
});

// ============================================================================
// Scrollbar subCharacterPrecision option tests
// ============================================================================

describe('Scrollbar subCharacterPrecision', () => {
  test('subCharacterPrecision defaults to true', () => {
    const scrollbar = new Scrollbar({});
    expect(scrollbar.subCharacterPrecision).toBe(true);
  });

  test('subCharacterPrecision can be set to false', () => {
    const scrollbar = new Scrollbar({ subCharacterPrecision: false });
    expect(scrollbar.subCharacterPrecision).toBe(false);
  });

  test('subCharacterPrecision can be set to true explicitly', () => {
    const scrollbar = new Scrollbar({ subCharacterPrecision: true });
    expect(scrollbar.subCharacterPrecision).toBe(true);
  });

  test('RenderScrollbar subCharacterPrecision defaults to true', () => {
    const render = new RenderScrollbar();
    expect(render.subCharacterPrecision).toBe(true);
  });

  test('sub-character precision uses block elements instead of thumbChar', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbChar = '#';
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Should NOT draw '#' when using sub-character precision
    const thumbChars = ctx.drawn.filter((d) => d.char === '#');
    expect(thumbChars.length).toBe(0);

    // Should draw block elements instead
    const blockElements = ctx.drawn.filter((d) =>
      d.char === '\u2581' || d.char === '\u2582' || d.char === '\u2583' ||
      d.char === '\u2584' || d.char === '\u2585' || d.char === '\u2586' ||
      d.char === '\u2587' || d.char === '\u2588'
    );
    expect(blockElements.length).toBeGreaterThan(0);
  });

  test('sub-character precision draws nothing when content fits viewport', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.scrollInfo = {
      totalContentHeight: 10,
      viewportHeight: 20,
      scrollOffset: 0,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // No block elements should be drawn
    expect(ctx.drawn.length).toBe(0);
  });

  test('sub-character precision handles zero scroll extent', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.scrollInfo = {
      totalContentHeight: 0,
      viewportHeight: 20,
      scrollOffset: 0,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // No drawing should happen
    expect(ctx.drawn.length).toBe(0);
  });

  test('classic rendering (subCharacterPrecision=false) uses thumbChar', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = false;
    render.showTrack = false;
    render.thumbChar = '#';
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const thumbChars = ctx.drawn.filter((d) => d.char === '#');
    expect(thumbChars.length).toBeGreaterThan(0);
  });

  test('sub-character precision applies thumbColor to block elements', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const blockElements = ctx.drawn.filter((d) =>
      d.char >= '\u2581' && d.char <= '\u2588'
    );
    expect(blockElements.length).toBeGreaterThan(0);
    // All block elements should have the thumb color
    for (const el of blockElements) {
      expect(el.style).toEqual({ fg: Color.green });
    }
  });

  test('sub-character precision full block at full scroll renders at bottom', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 80, // fully scrolled: totalContent - viewport = 80
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const blockElements = ctx.drawn.filter((d) =>
      d.char >= '\u2581' && d.char <= '\u2588'
    );
    expect(blockElements.length).toBeGreaterThan(0);

    // The last block element should be at or near the bottom of the viewport
    const maxRow = Math.max(...blockElements.map(e => e.y));
    expect(maxRow).toBe(19); // row 19 is the last row of a 20-row viewport
  });
});

// ============================================================================
// Sub-character precision rendering detail tests (Bug #2 fix)
// ============================================================================

describe('Scrollbar sub-character edge rendering', () => {
  // BLOCK_ELEMENTS: [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588']
  // Index 0 = space, 1-7 = lower 1/8 to 7/8, 8 = full block

  test('top-edge rendering: thumb starting mid-row uses lower block element in thumb fg', () => {
    // Set up a scenario where the thumb starts mid-row.
    // With height=8, totalContent=64 (8*8 eighths = 64), viewport=8, scroll=0:
    //   scrollRatio = 8/64 = 0.125
    //   thumbEighths = max(8, round(0.125*64)) = max(8,8) = 8 (1 full row)
    //   thumbTopEighths = 0 => starts at top, no partial top edge
    //
    // We need the thumb to start mid-row. Let's use a scroll offset that pushes
    // the thumb partway into a row.
    // height=10, totalContent=100, viewport=10, scrollOffset=5 (out of 90)
    //   scrollRatio = 10/100 = 0.1
    //   totalEighths = 10*8 = 80
    //   thumbEighths = max(8, round(0.1*80)) = max(8,8) = 8
    //   scrollPositionRatio = 5/90 = 0.0556
    //   thumbTopEighths = round(0.0556 * (80-8)) = round(4.0) = 4
    //   thumbBottomEighths = 4 + 8 = 12
    //   Row 0: top=0, bottom=8, overlapStart=max(0,4)=4, overlapEnd=min(8,12)=8, covered=4
    //     overlapStart(4) > rowTopEighths(0) => top edge: BLOCK_ELEMENTS[4] = '\u2584' with thumb fg
    //   Row 1: top=8, bottom=16, overlapStart=max(8,4)=8, overlapEnd=min(16,12)=12, covered=4
    //     overlapStart(8) == rowTopEighths(8) => NOT top edge => bottom edge!
    //     gapEighths = 8-4 = 4, BLOCK_ELEMENTS[4] inverted

    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.trackColor = Color.brightBlack;
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 10,
      scrollOffset: 5,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 1,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Row 0 should be the top edge: lower block with thumb color fg
    const row0 = ctx.drawn.filter((d) => d.y === 0 && d.char >= '\u2581' && d.char <= '\u2588');
    expect(row0.length).toBe(1);
    // The block element for covered=4 is BLOCK_ELEMENTS[4] = '\u2584' (lower half)
    expect(row0[0]!.char).toBe('\u2584');
    // Top edge: style should have fg = thumbColor
    expect(row0[0]!.style).toEqual({ fg: Color.green });
  });

  test('bottom-edge rendering: thumb ending mid-row uses inverted colors (track fg, thumb bg)', () => {
    // Using the same scenario from top-edge test:
    // Row 1 is the bottom edge where thumb covers top 4/8, leaves gap 4/8 at bottom.
    // Expected: BLOCK_ELEMENTS[4] (for the gap) with fg=trackColor, bg=thumbColor

    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.trackColor = Color.brightBlack;
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 10,
      scrollOffset: 5,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 1,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Row 1 should be the bottom edge: inverted block with track fg + thumb bg
    const row1 = ctx.drawn.filter((d) => d.y === 1 && d.char >= '\u2581' && d.char <= '\u2588');
    expect(row1.length).toBe(1);
    // Gap = 8-4 = 4, so BLOCK_ELEMENTS[4] = '\u2584'
    expect(row1[0]!.char).toBe('\u2584');
    // Bottom edge inverted: fg = trackColor, bg = thumbColor
    expect(row1[0]!.style).toEqual({ fg: Color.brightBlack, bg: Color.green });
  });

  test('fully covered rows use full block in thumb color', () => {
    // Use a larger thumb that covers several whole rows.
    // height=10, totalContent=30, viewport=10, scrollOffset=0
    //   scrollRatio = 10/30 = 0.333
    //   totalEighths = 80
    //   thumbEighths = max(8, round(0.333*80)) = max(8,27) = 27
    //   thumbTopEighths = 0, thumbBottomEighths = 27
    //   Row 0: top=0, bottom=8, covered=8 => fully covered
    //   Row 1: top=8, bottom=16, covered=8 => fully covered
    //   Row 2: top=16, bottom=24, covered=8 => fully covered
    //   Row 3: top=24, bottom=32, overlap=24-27=3 => partial (bottom edge)

    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.scrollInfo = {
      totalContentHeight: 30,
      viewportHeight: 10,
      scrollOffset: 0,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 1,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Rows 0, 1, 2 should all be full blocks
    for (const row of [0, 1, 2]) {
      const rowDrawn = ctx.drawn.filter((d) => d.y === row && d.char === '\u2588');
      expect(rowDrawn.length).toBe(1);
      expect(rowDrawn[0]!.style).toEqual({ fg: Color.green });
    }
  });

  test('top and bottom partial edges use different rendering strategies', () => {
    // Create a scenario where the thumb has BOTH a partial top edge and partial bottom edge.
    // height=10, totalContent=50, viewport=10, scrollOffset=10 (out of 40)
    //   scrollRatio = 10/50 = 0.2
    //   totalEighths = 80
    //   thumbEighths = max(8, round(0.2*80)) = max(8,16) = 16
    //   scrollPositionRatio = 10/40 = 0.25
    //   thumbTopEighths = round(0.25 * (80-16)) = round(16) = 16
    //   thumbBottomEighths = 16+16 = 32
    //   Row 2: top=16, bottom=24, overlapStart=16, overlapEnd=24, covered=8 => fully covered
    //   Row 3: top=24, bottom=32, overlapStart=24, overlapEnd=32, covered=8 => fully covered
    //
    // Hmm, let me force partial edges. scrollOffset=8
    //   scrollPositionRatio = 8/40 = 0.2
    //   thumbTopEighths = round(0.2 * 64) = round(12.8) = 13
    //   thumbBottomEighths = 13+16 = 29
    //   Row 1: top=8, bottom=16, overlapStart=max(8,13)=13, overlapEnd=min(16,29)=16, covered=3
    //     overlapStart(13) > rowTop(8) => top edge: BLOCK_ELEMENTS[3]
    //   Row 2: top=16, bottom=24, overlapStart=16, overlapEnd=24, covered=8 => fully covered
    //   Row 3: top=24, bottom=32, overlapStart=24, overlapEnd=min(32,29)=29, covered=5
    //     overlapStart(24) == rowTop(24) => bottom edge: gap=3, BLOCK_ELEMENTS[3] inverted

    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.trackColor = Color.brightBlack;
    render.scrollInfo = {
      totalContentHeight: 50,
      viewportHeight: 10,
      scrollOffset: 8,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 1,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Find partial block elements (not full block \u2588)
    const partialBlocks = ctx.drawn.filter((d) =>
      d.char >= '\u2581' && d.char <= '\u2587'
    );

    // There should be at least 2 partial blocks (top edge and bottom edge)
    expect(partialBlocks.length).toBeGreaterThanOrEqual(2);

    // Top edge should have fg = thumbColor (thumb fg)
    const topEdge = partialBlocks.find((d) => d.style && d.style.fg === Color.green && !d.style.bg);
    expect(topEdge).toBeDefined();

    // Bottom edge should have fg = trackColor, bg = thumbColor (inverted)
    const bottomEdge = partialBlocks.find((d) =>
      d.style && d.style.fg === Color.brightBlack && d.style.bg === Color.green
    );
    expect(bottomEdge).toBeDefined();

    // They should be on different rows
    expect(topEdge!.y).not.toBe(bottomEdge!.y);
    // Top edge row should be above bottom edge row
    expect(topEdge!.y).toBeLessThan(bottomEdge!.y);
  });

  test('bottom edge with thumbColor and trackColor uses correct inverted colors', () => {
    // Specifically verify: fg = trackColor, bg = thumbColor on bottom edge
    const thumbCol = Color.cyan;
    const trackCol = Color.brightBlack;
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = thumbCol;
    render.trackColor = trackCol;
    render.scrollInfo = {
      totalContentHeight: 50,
      viewportHeight: 10,
      scrollOffset: 8,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 1,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Find bottom-edge entry (has both fg and bg set, fg = trackColor, bg = thumbColor)
    const bottomEdgeEntries = ctx.drawn.filter((d) =>
      d.style &&
      d.style.bg === thumbCol && // bg = thumbColor
      d.style.fg === trackCol    // fg = trackColor
    );
    expect(bottomEdgeEntries.length).toBeGreaterThanOrEqual(1);

    // Verify the char is a partial block element (not full block)
    for (const entry of bottomEdgeEntries) {
      expect(entry.char >= '\u2581' && entry.char <= '\u2587').toBe(true);
    }
  });

  test('bottom edge without explicit colors uses inverse attribute', () => {
    // When neither thumbColor nor trackColor is set, bottom edge should use inverse
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    // No thumbColor or trackColor set
    render.scrollInfo = {
      totalContentHeight: 50,
      viewportHeight: 10,
      scrollOffset: 8,
    };

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 1,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Find entries with inverse style
    const invertedEntries = ctx.drawn.filter((d) =>
      d.style && d.style.inverse === true
    );
    expect(invertedEntries.length).toBeGreaterThanOrEqual(1);
  });
});
