/**
 * StickyHeader widget tests.
 *
 * 逆向: d9R/E9R (chunk-006.js:28390-28456)
 */

import { describe, expect, it } from "bun:test";
import { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { RenderStickyHeader, StickyHeader } from "./sticky-header.js";
import { Text } from "./text.js";
import { ClipScreen } from "./viewport.js";

// ── Mock child render box ──────────────────────────

class MockRenderBox extends RenderBox {
  private readonly _intrinsicWidth: number;
  private readonly _intrinsicHeight: number;
  private _paintCount = 0;

  constructor(intrinsicWidth: number, intrinsicHeight: number) {
    super();
    this._intrinsicWidth = intrinsicWidth;
    this._intrinsicHeight = intrinsicHeight;
  }

  get paintCount(): number {
    return this._paintCount;
  }

  override performLayout(): void {
    const c = this._lastConstraints;
    if (!c) throw new Error("no constraints");
    const w = Math.max(c.minWidth, Math.min(this._intrinsicWidth, c.maxWidth));
    const h = Math.max(c.minHeight, Math.min(this._intrinsicHeight, c.maxHeight));
    this.setSize(w, h);
  }

  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    this._paintCount++;
    // Paint a recognizable pattern for testing
    for (
      let col = 0;
      col < this._size.width && col + offsetX < (screen as unknown as { width: number }).width;
      col++
    ) {
      for (
        let row = 0;
        row < this._size.height && row + offsetY < (screen as unknown as { height: number }).height;
        row++
      ) {
        screen.writeChar(
          Math.floor(offsetX) + col,
          Math.floor(offsetY) + row,
          "X",
          new TextStyle({}),
        );
      }
    }
  }

  override getMaxIntrinsicHeight(_width: number): number {
    return this._intrinsicHeight;
  }

  override getMinIntrinsicHeight(_width: number): number {
    return this._intrinsicHeight;
  }

  override getMaxIntrinsicWidth(_height: number): number {
    return this._intrinsicWidth;
  }

  override getMinIntrinsicWidth(_height: number): number {
    return this._intrinsicWidth;
  }
}

// A mock that paints a specific character for identification
class LabeledRenderBox extends RenderBox {
  private readonly _intrinsicWidth: number;
  private readonly _intrinsicHeight: number;
  private readonly _char: string;

  constructor(intrinsicWidth: number, intrinsicHeight: number, char: string) {
    super();
    this._intrinsicWidth = intrinsicWidth;
    this._intrinsicHeight = intrinsicHeight;
    this._char = char;
  }

  override performLayout(): void {
    const c = this._lastConstraints;
    if (!c) throw new Error("no constraints");
    const w = Math.max(c.minWidth, Math.min(this._intrinsicWidth, c.maxWidth));
    const h = Math.max(c.minHeight, Math.min(this._intrinsicHeight, c.maxHeight));
    this.setSize(w, h);
  }

  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    for (let col = 0; col < this._size.width; col++) {
      for (let row = 0; row < this._size.height; row++) {
        const x = Math.floor(offsetX) + col;
        const y = Math.floor(offsetY) + row;
        if (
          x >= 0 &&
          x < (screen as unknown as { width: number }).width &&
          y >= 0 &&
          y < (screen as unknown as { height: number }).height
        ) {
          screen.writeChar(x, y, this._char, new TextStyle({}));
        }
      }
    }
  }

  override getMaxIntrinsicHeight(_width: number): number {
    return this._intrinsicHeight;
  }

  override getMinIntrinsicHeight(_width: number): number {
    return this._intrinsicHeight;
  }
}

// ════════════════════════════════════════════════════
//  RenderStickyHeader tests
// ════════════════════════════════════════════════════

describe("RenderStickyHeader", () => {
  // ── Layout tests ──

  describe("performLayout", () => {
    it("sizes to (minWidth, minHeight) with no children", () => {
      const render = new RenderStickyHeader();
      render.layout(
        new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 }),
      );
      expect(render.size.width).toBe(10);
      expect(render.size.height).toBe(5);
    });

    it("sizes to (minWidth, minHeight) with only one child", () => {
      const render = new RenderStickyHeader();
      const header = new MockRenderBox(20, 3);
      render.adoptChild(header);
      render.layout(
        new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 }),
      );
      // Only one child, so falls into the !header || !body branch
      expect(render.size.width).toBe(10);
      expect(render.size.height).toBe(5);
    });

    it("lays out header and body with correct total height", () => {
      const render = new RenderStickyHeader();
      const header = new MockRenderBox(20, 3);
      const body = new MockRenderBox(20, 15);
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 100 }),
      );
      expect(render.size.width).toBe(80);
      expect(render.size.height).toBe(3 + 15); // header + body
    });

    it("positions header at (0, 0)", () => {
      const render = new RenderStickyHeader();
      const header = new MockRenderBox(20, 3);
      const body = new MockRenderBox(20, 15);
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 100 }),
      );
      expect(header.offset.x).toBe(0);
      expect(header.offset.y).toBe(0);
    });

    it("positions body below header", () => {
      const render = new RenderStickyHeader();
      const header = new MockRenderBox(20, 3);
      const body = new MockRenderBox(20, 15);
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 100 }),
      );
      expect(body.offset.x).toBe(0);
      expect(body.offset.y).toBe(3); // header height
    });

    it("gives body infinite height constraint", () => {
      const render = new RenderStickyHeader();
      const header = new MockRenderBox(20, 3);
      // Body that wants 200 height — should not be capped by parent maxHeight
      const body = new MockRenderBox(20, 200);
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 50 }));
      expect(body.size.height).toBe(200); // unconstrained
      expect(render.size.height).toBe(203); // 3 + 200
    });

    it("header gets bounded height from parent constraints", () => {
      const render = new RenderStickyHeader();
      const header = new MockRenderBox(20, 3);
      const body = new MockRenderBox(20, 15);
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 10 }));
      // Header is capped at maxHeight=10, but intrinsic is only 3
      expect(header.size.height).toBe(3);
    });

    it("uses maxWidth for total width", () => {
      const render = new RenderStickyHeader();
      const header = new MockRenderBox(20, 3);
      const body = new MockRenderBox(20, 15);
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(
        new BoxConstraints({ minWidth: 10, maxWidth: 60, minHeight: 0, maxHeight: 100 }),
      );
      expect(render.size.width).toBe(60);
    });
  });

  // ── Paint tests (normal, no clip region) ──

  describe("paint without clip region", () => {
    it("paints children normally on a regular Screen", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 2, "H");
      const body = new LabeledRenderBox(10, 5, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(10, 10);
      render.paint(screen, 0, 0);

      // Header at rows 0-1
      expect(screen.getCell(0, 0).char).toBe("H");
      expect(screen.getCell(0, 1).char).toBe("H");
      // Body at rows 2-6
      expect(screen.getCell(0, 2).char).toBe("B");
      expect(screen.getCell(0, 6).char).toBe("B");
    });

    it("does not attempt sticky behavior without ClipScreen", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 2, "H");
      const body = new LabeledRenderBox(10, 5, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(10, 10);
      render.paint(screen, 0, 0);

      // Just check normal painting happened
      expect(screen.getCell(0, 0).char).toBe("H");
      expect(screen.getCell(0, 2).char).toBe("B");
    });
  });

  // ── Paint tests (with ClipScreen / sticky behavior) ──

  describe("paint with ClipScreen (sticky behavior)", () => {
    it("does not sticky when header is within clip region", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 2, "H");
      const body = new LabeledRenderBox(10, 5, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(10, 10);
      // Clip region includes the entire widget — no need to sticky
      const clipScreen = new ClipScreen(screen, 0, 0, 10, 10);

      render.paint(clipScreen as unknown as Screen, 0, 0);

      // Header is visible at its natural position, no sticky needed
      expect(screen.getCell(0, 0).char).toBe("H");
      expect(screen.getCell(0, 1).char).toBe("H");
      expect(screen.getCell(0, 2).char).toBe("B");
    });

    it("re-paints header at clip top when scrolled above viewport", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 2, "H");
      const body = new LabeledRenderBox(10, 8, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(10, 10);
      // Clip region starts at y=3 (header natural position y=0 is above clip)
      const clipScreen = new ClipScreen(screen, 0, 3, 10, 7);

      // Paint at y=-2 (simulating scroll: node has scrolled up 2 pixels)
      render.paint(clipScreen as unknown as Screen, 0, -2);

      // The header should be re-painted at the clip top (y=3)
      expect(screen.getCell(0, 3).char).toBe("H");
      expect(screen.getCell(0, 4).char).toBe("H");
    });

    it("pushes header up when widget bottom approaches clip top", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 2, "H");
      const body = new LabeledRenderBox(10, 5, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(10, 20);
      // Clip region starts at y=5, height 10
      const clipScreen = new ClipScreen(screen, 0, 5, 10, 10);

      // Paint at y=2: nodeY=2, nodeBottom=2+7=9
      // headerAbsY = 2 + 0 = 2 < clipTop(5) => headerAboveClip = true
      // isVisible: 9 > 5 && 2 < 15 => true
      // stickyY = clipTop = 5
      // nodeBottom(9) - clipTop(5) = 4 >= headerHeight(2), so stickyY stays at 5
      render.paint(clipScreen as unknown as Screen, 0, 2);

      // Header should be re-painted at stickyY=5
      expect(screen.getCell(0, 5).char).toBe("H");
      expect(screen.getCell(0, 6).char).toBe("H");
    });

    it("skips sticky when widget is not visible in clip region", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 2, "H");
      const body = new LabeledRenderBox(10, 3, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(10, 20);
      // Clip region at y=10-20, widget at y=0 with height 5 — completely outside
      const clipScreen = new ClipScreen(screen, 0, 10, 10, 10);

      render.paint(clipScreen as unknown as Screen, 0, 0);

      // No sticky painting should happen — widget not visible
      // Cells at clip region should be empty (space)
      expect(screen.getCell(0, 10).char).toBe(" ");
    });

    it("adjusts stickyY when widget bottom is close to clip top", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 3, "H");
      const body = new LabeledRenderBox(10, 4, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));
      // Total height = 3 + 4 = 7

      const screen = new Screen(10, 20);
      // Clip region starts at y=5, height 10
      const clipScreen = new ClipScreen(screen, 0, 5, 10, 10);

      // Paint at y=0: nodeY=0, nodeBottom=7
      // headerAbsY=0 < clipTop(5) => headerAboveClip=true
      // isVisible: 7>5 && 0<15 => true
      // nodeBottom(7) - clipTop(5) = 2 < headerHeight(3)
      // so stickyY = 7 - 3 = 4 (pushed up from clipTop)
      // stickyY(4) + headerHeight(3) = 7 > clipTop(5) => paints
      render.paint(clipScreen as unknown as Screen, 0, 0);

      // Header paints at y=4, but ClipScreen clips y<5
      // So only y=5 and y=6 will be visible
      expect(screen.getCell(0, 5).char).toBe("H");
      expect(screen.getCell(0, 6).char).toBe("H");
    });

    it("does not sticky when header has not scrolled past clip top", () => {
      const render = new RenderStickyHeader();
      const header = new LabeledRenderBox(10, 2, "H");
      const body = new LabeledRenderBox(10, 10, "B");
      render.adoptChild(header);
      render.adoptChild(body);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(10, 20);
      // Clip region starts at y=0
      const clipScreen = new ClipScreen(screen, 0, 0, 10, 15);

      // Paint at y=0: header at y=0, clipTop=0 — header is NOT above clip
      render.paint(clipScreen as unknown as Screen, 0, 0);

      // Normal painting only — header at y=0
      expect(screen.getCell(0, 0).char).toBe("H");
      // Body starts at y=2
      expect(screen.getCell(0, 2).char).toBe("B");
    });
  });
});

// ════════════════════════════════════════════════════
//  StickyHeader widget tests
// ════════════════════════════════════════════════════

describe("StickyHeader widget", () => {
  it("creates widget with header and body", () => {
    const header = new Text({ data: "Header" });
    const body = new Text({ data: "Body" });
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const widget = new StickyHeader({ header: header as any, body: body as any });
    expect(widget.children.length).toBe(2);
  });

  it("createRenderObject returns RenderStickyHeader", () => {
    const header = new Text({ data: "H" });
    const body = new Text({ data: "B" });
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const widget = new StickyHeader({ header: header as any, body: body as any });
    const ro = widget.createRenderObject();
    expect(ro).toBeInstanceOf(RenderStickyHeader);
  });

  it("updateRenderObject is a no-op", () => {
    const header = new Text({ data: "H" });
    const body = new Text({ data: "B" });
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const widget = new StickyHeader({ header: header as any, body: body as any });
    const ro = widget.createRenderObject();
    // Should not throw
    widget.updateRenderObject(ro);
  });

  it("createElement returns an element", () => {
    const header = new Text({ data: "H" });
    const body = new Text({ data: "B" });
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const widget = new StickyHeader({ header: header as any, body: body as any });
    const element = widget.createElement();
    expect(element).toBeDefined();
  });

  it("supports optional key", () => {
    const header = new Text({ data: "H" });
    const body = new Text({ data: "B" });
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const widget = new StickyHeader({ key: "sticky-1", header: header as any, body: body as any });
    expect(widget.key).toBe("sticky-1");
  });

  it("exposes header and body as children in correct order", () => {
    const header = new Text({ data: "H" });
    const body = new Text({ data: "B" });
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const widget = new StickyHeader({ header: header as any, body: body as any });
    expect(widget.children[0]).toBe(header);
    expect(widget.children[1]).toBe(body);
  });
});
