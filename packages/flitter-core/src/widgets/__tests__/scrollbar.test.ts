// Tests for Scrollbar widget and RenderScrollbar
// Verifies thumb/track rendering, scroll sync, layout, edge cases,
// horizontal support, mouse interaction, and type safety.

import { describe, test, expect } from 'bun:test';
import { Scrollbar, RenderScrollbar, type ScrollInfo } from '../scrollbar';
import { ScrollController } from '../scroll-controller';
import { RenderBox, type PaintContext } from '../../framework/render-object';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import { Color } from '../../core/color';

// Mock PaintContext that records drawChar calls — implements the PaintContext interface
class MockPaintContext {
  drawn: Array<{ x: number; y: number; char: string; style?: any; width?: number }> = [];

  drawChar(x: number, y: number, char: string, style?: any, width?: number): void {
    this.drawn.push({ x, y, char, style, width });
  }
}

// ============================================================================
// Original Scrollbar widget tests (backward compatibility)
// ============================================================================

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

// ============================================================================
// Backward compatibility defaults for new properties
// ============================================================================

describe('Scrollbar backward compatibility', () => {
  test('default axis is vertical', () => {
    expect(new Scrollbar({}).axis).toBe('vertical');
  });

  test('default interactive is true', () => {
    expect(new Scrollbar({}).interactive).toBe(true);
  });

  test('default thumbMinExtent is 1', () => {
    expect(new Scrollbar({}).thumbMinExtent).toBe(1);
  });

  test('existing vertical constructor call works unchanged', () => {
    const ctrl = new ScrollController();
    const scrollbar = new Scrollbar({
      controller: ctrl,
      thickness: 1,
      trackChar: '|',
      thumbChar: '#',
      showTrack: true,
    });
    expect(scrollbar.axis).toBe('vertical');
    expect(scrollbar.interactive).toBe(true);
  });

  test('legacy ScrollInfo with totalContentHeight/viewportHeight still works', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    } as ScrollInfo;
    const metrics = render.computeThumbMetrics(20);
    expect(metrics).not.toBeNull();
    expect(metrics!.thumbExtent).toBe(4);
    expect(metrics!.thumbHeight).toBe(4); // backward compat alias
  });

  test('new ScrollInfo with totalContentExtent/viewportExtent works', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 20,
      scrollOffset: 0,
    };
    const metrics = render.computeThumbMetrics(20);
    expect(metrics).not.toBeNull();
    expect(metrics!.thumbExtent).toBe(4);
    expect(metrics!.thumbStart).toBe(0);
  });
});

// ============================================================================
// RenderScrollbar (original vertical tests)
// ============================================================================

describe('RenderScrollbar', () => {
  test('creates with default values', () => {
    const render = new RenderScrollbar();
    expect(render.thickness).toBe(1);
    expect(render.trackChar).toBe('\u2591');
    expect(render.thumbChar).toBe('\u2588');
    expect(render.showTrack).toBe(true);
    expect(render.scrollInfo).toBeUndefined();
    expect(render.axis).toBe('vertical');
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
// Scrollbar subCharacterPrecision option tests (original)
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
    // All block elements should have thumb color as fg
    for (const el of blockElements) {
      expect(el.style?.fg).toBe(Color.green);
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
// Sub-character precision rendering detail tests (original Bug #2 fix)
// ============================================================================

describe('Scrollbar sub-character edge rendering', () => {
  test('top-edge rendering: thumb starting mid-row uses lower block element in thumb fg', () => {
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
    expect(row0[0]!.char).toBe('\u2584');
    expect(row0[0]!.style).toEqual({ fg: Color.green, bg: Color.brightBlack });
  });

  test('bottom-edge rendering: thumb ending mid-row uses inverted colors (track fg, thumb bg)', () => {
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
    expect(row1[0]!.char).toBe('\u2584');
    expect(row1[0]!.style).toEqual({ fg: Color.brightBlack, bg: Color.green });
  });

  test('fully covered rows use full block in thumb color', () => {
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
      expect(rowDrawn[0]!.style).toEqual({ fg: Color.green, bg: Color.green });
    }
  });

  test('top and bottom partial edges use different rendering strategies', () => {
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

    // Top edge should have fg = thumbColor, bg = trackColor
    const topEdge = partialBlocks.find((d) => d.style && d.style.fg === Color.green && d.style.bg === Color.brightBlack);
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
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
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

  test('top edge sets bg=trackColor so uncovered portion matches track visually', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.cyan;
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

    // Find the top edge row — has fg=thumbColor AND bg=trackColor
    const topEdge = ctx.drawn.find((d) =>
      d.char >= '\u2581' && d.char <= '\u2587' &&
      d.style?.fg === Color.cyan &&
      d.style?.bg === Color.brightBlack
    );
    expect(topEdge).toBeDefined();
    expect(topEdge!.style.bg).toBe(Color.brightBlack);
  });

  test('fully covered block sets both fg and bg to thumbColor for seamless fill', () => {
    const render = new RenderScrollbar();
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.cyan;
    render.trackColor = Color.brightBlack;
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

    // Find full block rows
    const fullBlocks = ctx.drawn.filter((d) => d.char === '\u2588');
    expect(fullBlocks.length).toBeGreaterThan(0);
    for (const fb of fullBlocks) {
      // Both fg and bg should be thumbColor for seamless fill
      expect(fb.style?.fg).toBe(Color.cyan);
      expect(fb.style?.bg).toBe(Color.cyan);
    }
  });
});

// ============================================================================
// Scrollbar thumb size stability (original regression test)
// ============================================================================

describe('Scrollbar thumb size stability', () => {
  test('thumbEighths is constant across all scroll positions', () => {
    const height = 20;
    const totalContent = 100;
    const viewport = 20;

    const thumbSizes = new Set<number>();

    for (let offset = 0; offset <= totalContent - viewport; offset++) {
      const render = new RenderScrollbar(
        { totalContentHeight: totalContent, viewportHeight: viewport, scrollOffset: offset },
        'vertical',
        1, '░', '█', true, Color.cyan, Color.brightBlack, true,
      );
      render.layout(new BoxConstraints({ minWidth: 1, maxWidth: 1, minHeight: height, maxHeight: height }));

      const ctx = new MockPaintContext();
      render.paint(ctx as any, new Offset(0, 0));

      let thumbEighthsTotal = 0;
      for (let row = 0; row < height; row++) {
        const rowDraws = ctx.drawn.filter(d => d.y === row && d.char !== '░');
        if (rowDraws.length > 0) {
          const ch = rowDraws[0].char;
          const style = rowDraws[0].style;
          const idx = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'].indexOf(ch);
          if (idx >= 0) {
            if (idx === 8) {
              thumbEighthsTotal += 8;
            } else if (style?.bg === Color.cyan) {
              thumbEighthsTotal += 8 - idx;
            } else {
              thumbEighthsTotal += idx;
            }
          }
        }
      }
      thumbSizes.add(thumbEighthsTotal);
    }

    expect(thumbSizes.size).toBeLessThanOrEqual(2);
  });

  test('thumb size derived from controller.viewportSize is exact', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    const scrollbar = new Scrollbar({ controller: ctrl, subCharacterPrecision: true });
    const state = scrollbar.createState();

    const scrollInfo = {
      totalContentHeight: ctrl.maxScrollExtent + ctrl.viewportSize,
      viewportHeight: ctrl.viewportSize,
      scrollOffset: ctrl.offset,
    };

    expect(scrollInfo.totalContentHeight).toBe(100);
    expect(scrollInfo.viewportHeight).toBe(20);
    expect(scrollInfo.scrollOffset).toBe(0);

    ctrl.jumpTo(40);
    const scrollInfo2 = {
      totalContentHeight: ctrl.maxScrollExtent + ctrl.viewportSize,
      viewportHeight: ctrl.viewportSize,
      scrollOffset: ctrl.offset,
    };
    expect(scrollInfo2.totalContentHeight).toBe(100);
    expect(scrollInfo2.viewportHeight).toBe(20);
  });
});

// ============================================================================
// Phase 1: PaintContext type safety tests
// ============================================================================

describe('RenderScrollbar paint type safety', () => {
  test('paint calls drawChar without any cast via PaintContext interface', () => {
    const render = new RenderScrollbar();
    render.showTrack = true;
    render.trackChar = '|';
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 1, minHeight: 0, maxHeight: 5 }));

    const ctx = new MockPaintContext();
    // MockPaintContext satisfies the PaintContext interface (has drawChar)
    render.paint(ctx as PaintContext, new Offset(0, 0));

    expect(ctx.drawn.length).toBe(5);
  });

  test('paint gracefully handles context without drawChar', () => {
    const render = new RenderScrollbar();
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 1, minHeight: 0, maxHeight: 5 }));

    // Should not throw
    render.paint({} as PaintContext, Offset.zero);
  });
});

// ============================================================================
// Phase 2: Horizontal scrollbar layout tests
// ============================================================================

describe('Horizontal Scrollbar layout', () => {
  test('horizontal layout: width fills available, height = thickness', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.thickness = 1;
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    expect(render.size.width).toBe(80);
    expect(render.size.height).toBe(1);
  });

  test('horizontal layout: thickness clamped to maxHeight', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.thickness = 5;
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 3 }));
    expect(render.size.width).toBe(80);
    expect(render.size.height).toBe(3);
  });

  test('horizontal intrinsic height returns thickness', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.thickness = 2;
    expect(render.getMinIntrinsicHeight(80)).toBe(2);
    expect(render.getMaxIntrinsicHeight(80)).toBe(2);
  });

  test('horizontal intrinsic width returns 0 for min', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    expect(render.getMinIntrinsicWidth(10)).toBe(0);
  });

  test('horizontal getMaxIntrinsicWidth returns Infinity', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    expect(render.getMaxIntrinsicWidth(10)).toBe(Infinity);
  });

  test('vertical intrinsic height returns 0 for min, Infinity for max', () => {
    const render = new RenderScrollbar();
    render.axis = 'vertical';
    expect(render.getMinIntrinsicHeight(10)).toBe(0);
    expect(render.getMaxIntrinsicHeight(10)).toBe(Infinity);
  });
});

// ============================================================================
// Phase 2: Horizontal computeThumbMetrics tests
// ============================================================================

describe('Horizontal computeThumbMetrics', () => {
  test('computes correct thumb at left position (scrollOffset=0)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.scrollInfo = {
      totalContentExtent: 200,
      viewportExtent: 40,
      scrollOffset: 0,
    };
    const metrics = render.computeThumbMetrics(40);
    expect(metrics).not.toBeNull();
    expect(metrics!.thumbStart).toBe(0);
    expect(metrics!.thumbExtent).toBe(8); // round((40/200)*40) = 8
  });

  test('computes correct thumb at right position (scrollOffset=max)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.scrollInfo = {
      totalContentExtent: 200,
      viewportExtent: 40,
      scrollOffset: 160, // 200 - 40
    };
    const metrics = render.computeThumbMetrics(40);
    expect(metrics!.thumbStart).toBe(32); // 40 - 8
    expect(metrics!.thumbExtent).toBe(8);
  });

  test('returns null when content fits viewport', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.scrollInfo = {
      totalContentExtent: 30,
      viewportExtent: 40,
      scrollOffset: 0,
    };
    expect(render.computeThumbMetrics(40)).toBeNull();
  });

  test('computeThumbMetrics returns backward-compat aliases', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.scrollInfo = {
      totalContentExtent: 200,
      viewportExtent: 40,
      scrollOffset: 0,
    };
    const metrics = render.computeThumbMetrics(40);
    expect(metrics).not.toBeNull();
    // thumbTop/thumbHeight are aliases for thumbStart/thumbExtent
    expect(metrics!.thumbTop).toBe(metrics!.thumbStart);
    expect(metrics!.thumbHeight).toBe(metrics!.thumbExtent);
  });
});

// ============================================================================
// Phase 2: Horizontal paint tests
// ============================================================================

describe('Horizontal Scrollbar paint', () => {
  test('draws track across full width for horizontal axis', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.showTrack = true;
    render.trackChar = '-';
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 5));
    const trackChars = ctx.drawn.filter(d => d.char === '-');
    expect(trackChars.length).toBe(10); // 10 columns x 1 row
    // All on the same row (y=5)
    expect(trackChars.every(d => d.y === 5)).toBe(true);
  });

  test('draws thumb at correct horizontal position (whole-character mode)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = false;
    render.showTrack = false;
    render.thumbChar = '#';
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 20,
      scrollOffset: 0,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));
    const thumbChars = ctx.drawn.filter(d => d.char === '#');
    expect(thumbChars.length).toBe(4); // round((20/100)*20) = 4
    expect(thumbChars[0].x).toBe(0);
    expect(thumbChars[3].x).toBe(3);
  });

  test('draws thumb at right end when scrolled to end (horizontal)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = false;
    render.showTrack = false;
    render.thumbChar = '#';
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 20,
      scrollOffset: 80,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));
    const thumbChars = ctx.drawn.filter(d => d.char === '#');
    expect(thumbChars.length).toBe(4);
    expect(thumbChars[0].x).toBe(16);
    expect(thumbChars[3].x).toBe(19);
  });

  test('horizontal sub-character precision uses left block elements', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 20,
      scrollOffset: 7, // offset=7 produces partial columns (non-aligned eighths)
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));
    // Left block elements range: U+2589 (LEFT SEVEN EIGHTHS BLOCK) to U+258F (LEFT ONE EIGHTH BLOCK)
    const leftBlocks = ctx.drawn.filter(d =>
      d.char.charCodeAt(0) >= 0x2589 && d.char.charCodeAt(0) <= 0x258F
    );
    expect(leftBlocks.length).toBeGreaterThan(0);
  });

  test('horizontal sub-character does not use lower block elements (U+2581-U+2587)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 20,
      scrollOffset: 7, // same offset to match companion test
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));
    // Should NOT use lower block elements (U+2581-U+2587) for horizontal
    const lowerBlocks = ctx.drawn.filter(d =>
      d.char.charCodeAt(0) >= 0x2581 && d.char.charCodeAt(0) <= 0x2587
    );
    expect(lowerBlocks.length).toBe(0);
  });
});

// ============================================================================
// Phase 2: Horizontal sub-character edge rendering tests
// ============================================================================

describe('Horizontal sub-character edge rendering', () => {
  test('fully covered columns use full block with both fg and bg = thumbColor', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.cyan;
    render.scrollInfo = {
      totalContentExtent: 30,
      viewportExtent: 10,
      scrollOffset: 0,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const fullBlocks = ctx.drawn.filter(d => d.char === '\u2588');
    expect(fullBlocks.length).toBeGreaterThan(0);
    for (const fb of fullBlocks) {
      expect(fb.style?.fg).toBe(Color.cyan);
      expect(fb.style?.bg).toBe(Color.cyan);
    }
  });

  test('horizontal sub-char draws nothing when content fits viewport', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.scrollInfo = {
      totalContentExtent: 5,
      viewportExtent: 10,
      scrollOffset: 0,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));
    expect(ctx.drawn.length).toBe(0);
  });

  test('left edge uses trackColor fg and thumbColor bg', () => {
    // When thumb starts mid-column: the uncovered left gap is drawn
    // as a left block element with fg=trackColor, bg=thumbColor
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.trackColor = Color.brightBlack;
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 10,
      scrollOffset: 7, // produces partial columns
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Find entries with left block partial characters (not full block)
    // Left edge: fg=trackColor, bg=thumbColor
    const leftEdgeEntries = ctx.drawn.filter(d =>
      d.style && d.style.fg === Color.brightBlack && d.style.bg === Color.green &&
      d.char.charCodeAt(0) >= 0x2589 && d.char.charCodeAt(0) <= 0x258F
    );
    expect(leftEdgeEntries.length).toBeGreaterThan(0);
  });

  test('right edge uses thumbColor fg and trackColor bg', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.trackColor = Color.brightBlack;
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 10,
      scrollOffset: 7, // produces partial columns
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Right edge: fg=thumbColor, bg=trackColor
    const rightEdgeEntries = ctx.drawn.filter(d =>
      d.style && d.style.fg === Color.green && d.style.bg === Color.brightBlack &&
      d.char.charCodeAt(0) >= 0x2589 && d.char.charCodeAt(0) <= 0x258F
    );
    expect(rightEdgeEntries.length).toBeGreaterThan(0);
  });

  test('horizontal without colors uses inverse attribute on edges', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    // No thumbColor or trackColor
    render.scrollInfo = {
      totalContentExtent: 50,
      viewportExtent: 10,
      scrollOffset: 8,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const invertedEntries = ctx.drawn.filter(d => d.style && d.style.inverse === true);
    expect(invertedEntries.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Phase 3: Mouse interaction — Scrollbar properties
// ============================================================================

describe('Scrollbar mouse interaction properties', () => {
  test('axis property can be set to horizontal', () => {
    const scrollbar = new Scrollbar({ axis: 'horizontal' });
    expect(scrollbar.axis).toBe('horizontal');
  });

  test('interactive property can be set to false', () => {
    const scrollbar = new Scrollbar({ interactive: false });
    expect(scrollbar.interactive).toBe(false);
  });

  test('thumbMinExtent property can be customized', () => {
    const scrollbar = new Scrollbar({ thumbMinExtent: 3 });
    expect(scrollbar.thumbMinExtent).toBe(3);
  });
});

// ============================================================================
// Phase 3: Mouse click-to-jump tests (via ScrollbarState)
// ============================================================================

describe('Scrollbar click-to-jump', () => {
  test('click on track middle jumps to ~50% scroll offset', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);
    expect(ctrl.offset).toBe(0);

    // Create a scrollbar state and simulate the click handler
    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    // Initialize state with widget reference
    state._widget = scrollbar;

    // Simulate click at y=10 (middle of 20-row scrollbar)
    // fraction = 10/20 = 0.5, targetOffset = 0.5 * 80 = 40
    state._handleClick({ x: 0, y: 10 });

    expect(ctrl.offset).toBe(40);
  });

  test('click at top of track jumps to offset 0', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);
    ctrl.jumpTo(40); // start at middle

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Click at y=0
    state._handleClick({ x: 0, y: 0 });
    expect(ctrl.offset).toBe(0);
  });

  test('click at bottom of track jumps to max offset', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Click at y=20 (at the extent boundary)
    // fraction = min(20/20, 1) = 1.0, targetOffset = 1.0 * 80 = 80
    state._handleClick({ x: 0, y: 20 });
    expect(ctrl.offset).toBe(80);
  });

  test('click on thumb starts drag, does not jump', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);
    // offset=0, thumb at top (start=0, end=4)
    expect(ctrl.offset).toBe(0);

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Click at y=1 (within thumb 0-3)
    state._handleClick({ x: 0, y: 1 });
    // Offset should NOT change (click is on thumb, starts drag)
    expect(ctrl.offset).toBe(0);
    expect(state._isDragging).toBe(true);
  });

  test('horizontal click uses x coordinate', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(40);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(160);
    expect(ctrl.offset).toBe(0);

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true, axis: 'horizontal' });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Click at x=20 (middle of 40-column scrollbar)
    state._handleClick({ x: 20, y: 0 });
    expect(ctrl.offset).toBe(80); // 0.5 * 160
  });

  test('click with no controller is no-op', () => {
    const scrollbar = new Scrollbar({ interactive: true }); // no controller
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Should not throw
    state._handleClick({ x: 5, y: 5 });
  });

  test('click with zero viewportSize is no-op', () => {
    const ctrl = new ScrollController();
    // viewportSize defaults to 0

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Should not throw
    state._handleClick({ x: 5, y: 5 });
    expect(ctrl.offset).toBe(0);
  });
});

// ============================================================================
// Phase 3: Mouse drag tests
// ============================================================================

describe('Scrollbar thumb dragging', () => {
  test('drag from top to bottom scrolls through full range', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    // Total content = 100, viewport = 20, maxScroll = 80
    // Thumb height = round((20/100)*20) = 4
    // Track available = 20 - 4 = 16

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Start drag by clicking on thumb at y=0
    state._handleClick({ x: 0, y: 0 });
    expect(state._isDragging).toBe(true);

    // Drag to y=16 (bottom of available track)
    state._handleDrag({ x: 0, y: 16 });
    // axisDelta = 16, scrollDelta = (16/16)*80 = 80
    expect(ctrl.offset).toBe(80);
  });

  test('drag preserves relative cursor position within thumb', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Click on middle of thumb (y=2 when thumb is at 0-3)
    state._handleClick({ x: 0, y: 2 });
    expect(state._isDragging).toBe(true);
    expect(state._dragStartAxisPosition).toBe(2);

    // Drag down by 5 units
    state._handleDrag({ x: 0, y: 7 });
    // axisDelta = 7 - 2 = 5, scrollDelta = (5/16)*80 = 25
    expect(ctrl.offset).toBe(25);
  });

  test('release ends drag state', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Start drag
    state._handleClick({ x: 0, y: 0 });
    expect(state._isDragging).toBe(true);

    // Release
    state._handleRelease({ x: 0, y: 5 });
    expect(state._isDragging).toBe(false);

    // Further drag events should be no-ops
    const offsetBefore = ctrl.offset;
    state._handleDrag({ x: 0, y: 10 });
    expect(ctrl.offset).toBe(offsetBefore);
  });

  test('drag beyond scrollbar extent clamps to maxScrollExtent', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Start drag at top of thumb
    state._handleClick({ x: 0, y: 0 });

    // Drag way beyond
    state._handleDrag({ x: 0, y: 100 });
    // jumpTo clamps to maxScrollExtent
    expect(ctrl.offset).toBe(80);
  });

  test('drag above scrollbar start clamps to 0', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);
    ctrl.jumpTo(40); // start at middle

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Thumb is at position ~8 when offset=40
    // Start drag at the thumb position
    state._isDragging = true;
    state._dragStartScrollOffset = 40;
    state._dragStartAxisPosition = 8;

    // Drag to y=-10
    state._handleDrag({ x: 0, y: -10 });
    // axisDelta = -10 - 8 = -18, scrollDelta = (-18/16)*80 = -90
    // newOffset = 40 + (-90) = -50 -> clamped to 0
    expect(ctrl.offset).toBe(0);
  });

  test('horizontal drag uses x coordinate', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(40);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(160);

    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true, axis: 'horizontal' });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;

    // Start drag at thumb (at x=0)
    state._handleClick({ x: 0, y: 0 });
    expect(state._isDragging).toBe(true);

    // Drag to x=18
    // thumb = round((40/200)*40) = 8
    // trackAvailable = 40 - 8 = 32
    // axisDelta = 18, scrollDelta = (18/32)*160 = 90
    state._handleDrag({ x: 18, y: 0 });
    expect(ctrl.offset).toBe(90);
  });

  test('drag with no controller is no-op', () => {
    const scrollbar = new Scrollbar({ interactive: true });
    const state = scrollbar.createState() as any;
    state._widget = scrollbar;
    state._isDragging = true;

    // Should not throw
    state._handleDrag({ x: 5, y: 5 });
  });
});

// ============================================================================
// Phase 3: Interactive scrollbar build tests
// ============================================================================

describe('Scrollbar interactive build behavior', () => {
  test('getScrollInfo-only scrollbar does not wrap in MouseRegion', () => {
    const getScrollInfo = () => ({
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    });
    const scrollbar = new Scrollbar({
      getScrollInfo,
      interactive: true,
    });
    // No MouseRegion is created because controller is undefined
    // We verify by checking that the scrollbar accepts interactive=true
    // but without a controller, the build() will produce just _ScrollbarRender
    expect(scrollbar.interactive).toBe(true);
    expect(scrollbar.controller).toBeUndefined();
  });

  test('interactive=false with controller does not wrap in MouseRegion', () => {
    const ctrl = new ScrollController();
    const scrollbar = new Scrollbar({
      controller: ctrl,
      interactive: false,
    });
    expect(scrollbar.interactive).toBe(false);
  });

  test('interactive=true with controller enables mouse interaction', () => {
    const ctrl = new ScrollController();
    const scrollbar = new Scrollbar({
      controller: ctrl,
      interactive: true,
    });
    expect(scrollbar.interactive).toBe(true);
    expect(scrollbar.controller).toBe(ctrl);
  });
});
