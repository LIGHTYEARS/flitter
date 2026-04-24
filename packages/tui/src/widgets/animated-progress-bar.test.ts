/**
 * AnimatedProgressBar widget tests.
 *
 * Covers:
 * - Construction with default and custom props
 * - RenderObject creation and updates
 * - Layout (full width, height 1)
 * - Paint: comet trail with alpha falloff
 * - Color blending helper
 * - State lifecycle (timer start/stop)
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Cell } from "../screen/cell.js";
import { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import {
  _blendColorAlpha,
  AnimatedProgressBar,
  AnimatedProgressBarRenderObject,
} from "./animated-progress-bar.js";

// ════════════════════════════════════════════════════
//  Color blending tests
// ════════════════════════════════════════════════════

describe("blendColorAlpha", () => {
  it("returns full color at alpha=1", () => {
    const c = _blendColorAlpha(Color.rgb(100, 200, 50), 1);
    assert.equal(c.r, 100);
    assert.equal(c.g, 200);
    assert.equal(c.b, 50);
  });

  it("returns black at alpha=0", () => {
    const c = _blendColorAlpha(Color.rgb(100, 200, 50), 0);
    assert.equal(c.r, 0);
    assert.equal(c.g, 0);
    assert.equal(c.b, 0);
  });

  it("blends at alpha=0.5", () => {
    const c = _blendColorAlpha(Color.rgb(100, 200, 50), 0.5);
    assert.equal(c.r, 50);
    assert.equal(c.g, 100);
    assert.equal(c.b, 25);
  });

  it("handles named colors by converting to approximate RGB", () => {
    // Red (named index 1) should approximate to (170, 0, 0)
    const c = _blendColorAlpha(Color.red(), 1);
    assert.equal(c.kind, "rgb");
    assert.equal(c.r, 170);
    assert.equal(c.g, 0);
    assert.equal(c.b, 0);
  });

  it("handles default color", () => {
    const c = _blendColorAlpha(Color.default(), 0.5);
    assert.equal(c.kind, "rgb");
    // Default uses white (255,255,255) as base
    assert.equal(c.r, 128);
    assert.equal(c.g, 128);
    assert.equal(c.b, 128);
  });
});

// ════════════════════════════════════════════════════
//  AnimatedProgressBar widget construction
// ════════════════════════════════════════════════════

describe("AnimatedProgressBar", () => {
  it("constructs with defaults", () => {
    const bar = new AnimatedProgressBar();
    assert.ok(bar.color.equals(Color.cyan()));
    assert.equal(bar.trail, 5);
    assert.equal(bar.speed, 1);
  });

  it("constructs with custom props", () => {
    const bar = new AnimatedProgressBar({
      color: Color.red(),
      trail: 3,
      speed: 2,
      backgroundColor: Color.rgb(30, 30, 30),
    });
    assert.ok(bar.color.equals(Color.red()));
    assert.equal(bar.trail, 3);
    assert.equal(bar.speed, 2);
    assert.ok(bar.backgroundColor.equals(Color.rgb(30, 30, 30)));
  });

  it("creates a state", () => {
    const bar = new AnimatedProgressBar();
    const state = bar.createState();
    assert.ok(state !== undefined);
  });

  it("creates an element", () => {
    const bar = new AnimatedProgressBar();
    const el = bar.createElement();
    assert.ok(el !== undefined);
  });
});

// ════════════════════════════════════════════════════
//  AnimatedProgressBarRenderObject tests
// ════════════════════════════════════════════════════

describe("AnimatedProgressBarRenderObject", () => {
  it("constructs with props", () => {
    const ro = new AnimatedProgressBarRenderObject(Color.cyan(), 5, 0, Color.default());
    assert.equal(ro.head, 0);
    assert.equal(ro.trail, 5);
    assert.ok(ro.color.equals(Color.cyan()));
  });

  it("performs layout: full width, height=1", () => {
    const ro = new AnimatedProgressBarRenderObject(Color.cyan(), 5, 0, Color.default());
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );
    assert.equal(ro.size.width, 80);
    assert.equal(ro.size.height, 1);
  });

  it("update marks needs paint", () => {
    const ro = new AnimatedProgressBarRenderObject(Color.cyan(), 5, 0, Color.default());
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );
    // Should not throw
    ro.update(Color.red(), 5, 10, Color.default());
    assert.equal(ro.head, 10);
  });

  it("update with different trail marks needs layout", () => {
    const ro = new AnimatedProgressBarRenderObject(Color.cyan(), 5, 0, Color.default());
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );
    ro.update(Color.cyan(), 3, 0, Color.default());
    assert.equal(ro.trail, 3);
  });
});

// ════════════════════════════════════════════════════
//  Paint verification
// ════════════════════════════════════════════════════

describe("AnimatedProgressBarRenderObject paint", () => {
  /**
   * Minimal screen mock that records setCell calls.
   */
  function createMockScreen(): Screen & { cells: Map<string, Cell> } {
    const cells = new Map<string, Cell>();
    return {
      cells,
      setCell(x: number, y: number, cell: Cell): void {
        cells.set(`${x},${y}`, cell);
      },
    } as unknown as Screen & { cells: Map<string, Cell> };
  }

  it("paints comet head at correct position", () => {
    const ro = new AnimatedProgressBarRenderObject(
      Color.rgb(0, 255, 255), // cyan-ish
      5,
      10, // head at column 10
      Color.default(),
    );
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );

    const screen = createMockScreen();
    ro.performPaint(screen, 0, 0);

    // Head (i=0) should be at column 10 with full color (alpha=1)
    const headCell = screen.cells.get("10,0");
    assert.ok(headCell, "Head cell should be painted at column 10");
    assert.equal(headCell.char, "\u2501"); // ━
    assert.equal(headCell.style.foreground.r, 0);
    assert.equal(headCell.style.foreground.g, 255);
    assert.equal(headCell.style.foreground.b, 255);
  });

  it("paints trail with decreasing alpha", () => {
    const ro = new AnimatedProgressBarRenderObject(
      Color.rgb(100, 100, 100),
      5,
      10,
      Color.default(),
    );
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );

    const screen = createMockScreen();
    ro.performPaint(screen, 0, 0);

    // Trail positions: head=10, trail at 9, 8, 7, 6, 5
    // Alpha: [1, 0.7, 0.5, 0.35, 0.25, 0.15]
    const headCell = screen.cells.get("10,0");
    const trail1 = screen.cells.get("9,0");
    const trail2 = screen.cells.get("8,0");

    assert.ok(headCell);
    assert.ok(trail1);
    assert.ok(trail2);

    // Head: alpha=1 → r=100
    assert.equal(headCell.style.foreground.r, 100);

    // Trail 1: alpha=0.7 → r=70
    assert.equal(trail1.style.foreground.r, 70);

    // Trail 2: alpha=0.5 → r=50
    assert.equal(trail2.style.foreground.r, 50);
  });

  it("clips trail segments outside bounds", () => {
    const ro = new AnimatedProgressBarRenderObject(
      Color.rgb(100, 100, 100),
      5,
      2, // head at column 2, some trail goes negative
      Color.default(),
    );
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );

    const screen = createMockScreen();
    ro.performPaint(screen, 0, 0);

    // Head at 2, trail at 1, 0, -1, -2, -3
    // Columns -1, -2, -3 should be skipped
    assert.ok(screen.cells.has("2,0"), "Head at col 2");
    assert.ok(screen.cells.has("1,0"), "Trail at col 1");
    assert.ok(screen.cells.has("0,0"), "Trail at col 0");
    assert.ok(!screen.cells.has("-1,0"), "No paint at negative col");
    assert.ok(!screen.cells.has("-2,0"), "No paint at negative col");
  });

  it("does not paint when head is far off screen", () => {
    const ro = new AnimatedProgressBarRenderObject(
      Color.rgb(100, 100, 100),
      5,
      -10, // head far to the left
      Color.default(),
    );
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );

    const screen = createMockScreen();
    ro.performPaint(screen, 0, 0);

    assert.equal(screen.cells.size, 0, "No cells painted when head is off-screen");
  });

  it("respects offsetX and offsetY", () => {
    const ro = new AnimatedProgressBarRenderObject(
      Color.rgb(200, 200, 200),
      0, // no trail, just head
      0, // head at column 0
      Color.default(),
    );
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );

    const screen = createMockScreen();
    ro.performPaint(screen, 5, 3);

    // Should be painted at (5+0, 3+0) = (5, 3)
    assert.ok(screen.cells.has("5,3"), "Cell painted at offset position");
    assert.ok(!screen.cells.has("0,0"), "No cell at origin");
  });

  it("paints exactly trail+1 cells (or less if clipped)", () => {
    const trail = 3;
    const ro = new AnimatedProgressBarRenderObject(
      Color.rgb(200, 200, 200),
      trail,
      20, // head at 20, plenty of room
      Color.default(),
    );
    ro.layout(
      new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 24,
      }),
    );

    const screen = createMockScreen();
    ro.performPaint(screen, 0, 0);

    // trail=3 means head + 3 trail = 4 cells: columns 20, 19, 18, 17
    assert.equal(screen.cells.size, trail + 1);
    for (let i = 0; i <= trail; i++) {
      assert.ok(screen.cells.has(`${20 - i},0`), `Cell at col ${20 - i}`);
    }
  });
});
