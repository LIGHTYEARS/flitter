/**
 * Offstage widget tests.
 *
 * 逆向: sQ/cQ (layout_widgets.js:1587-1640, misc_utils.js:2300-2318)
 */

import { describe, expect, it, mock } from "bun:test";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { Offstage, RenderOffstage } from "./offstage.js";
import { Text } from "./text.js";

// ── Mock child render box ──────────────────────────

/**
 * A mock RenderBox that reports configurable intrinsic dimensions
 * and sizes itself to the given natural size when laid out.
 */
class MockRenderBox extends RenderBox {
  private readonly _intrinsicWidth: number;
  private readonly _intrinsicHeight: number;

  constructor(intrinsicWidth: number, intrinsicHeight: number) {
    super();
    this._intrinsicWidth = intrinsicWidth;
    this._intrinsicHeight = intrinsicHeight;
  }

  override performLayout(): void {
    const c = this._lastConstraints;
    if (!c) throw new Error("no constraints");
    const w = Math.max(c.minWidth, Math.min(this._intrinsicWidth, c.maxWidth));
    const h = Math.max(c.minHeight, Math.min(this._intrinsicHeight, c.maxHeight));
    this.setSize(w, h);
  }

  override getMinIntrinsicWidth(_height: number): number {
    return this._intrinsicWidth;
  }
  override getMaxIntrinsicWidth(_height: number): number {
    return this._intrinsicWidth;
  }
  override getMinIntrinsicHeight(_width: number): number {
    return this._intrinsicHeight;
  }
  override getMaxIntrinsicHeight(_width: number): number {
    return this._intrinsicHeight;
  }
}

// ── RenderOffstage tests ───────────────────────────

describe("RenderOffstage", () => {
  // ── Intrinsic measurements ─────────────────────

  describe("intrinsic measurements when offstage", () => {
    it("returns 0 for all intrinsics when offstage (no child)", () => {
      const render = new RenderOffstage(true);
      expect(render.getMinIntrinsicWidth(100)).toBe(0);
      expect(render.getMaxIntrinsicWidth(100)).toBe(0);
      expect(render.getMinIntrinsicHeight(100)).toBe(0);
      expect(render.getMaxIntrinsicHeight(100)).toBe(0);
    });

    it("returns 0 for all intrinsics when offstage (with child)", () => {
      const render = new RenderOffstage(true);
      const child = new MockRenderBox(20, 10);
      render.adoptChild(child);

      expect(render.getMinIntrinsicWidth(100)).toBe(0);
      expect(render.getMaxIntrinsicWidth(100)).toBe(0);
      expect(render.getMinIntrinsicHeight(100)).toBe(0);
      expect(render.getMaxIntrinsicHeight(100)).toBe(0);
    });
  });

  describe("intrinsic measurements when not offstage", () => {
    it("delegates all intrinsics to child when not offstage", () => {
      const render = new RenderOffstage(false);
      const child = new MockRenderBox(30, 15);
      render.adoptChild(child);

      expect(render.getMinIntrinsicWidth(100)).toBe(30);
      expect(render.getMaxIntrinsicWidth(100)).toBe(30);
      expect(render.getMinIntrinsicHeight(100)).toBe(15);
      expect(render.getMaxIntrinsicHeight(100)).toBe(15);
    });

    it("returns 0 for all intrinsics when not offstage but no child", () => {
      const render = new RenderOffstage(false);
      expect(render.getMinIntrinsicWidth(100)).toBe(0);
      expect(render.getMaxIntrinsicWidth(100)).toBe(0);
      expect(render.getMinIntrinsicHeight(100)).toBe(0);
      expect(render.getMaxIntrinsicHeight(100)).toBe(0);
    });
  });

  // ── Layout ────────────────────────────────────

  describe("performLayout when offstage", () => {
    it("sets size to 0x0 when offstage with no child", () => {
      const render = new RenderOffstage(true);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
      expect(render.size.width).toBe(0);
      expect(render.size.height).toBe(0);
    });

    it("sets size to 0x0 when offstage but still lays out child", () => {
      const render = new RenderOffstage(true);
      const child = new MockRenderBox(20, 10);
      render.adoptChild(child);

      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));

      // Parent size is 0x0 even though child laid out to 20x10
      expect(render.size.width).toBe(0);
      expect(render.size.height).toBe(0);

      // Child was laid out (has a real size from its layout pass)
      expect(child.size.width).toBe(20);
      expect(child.size.height).toBe(10);
    });

    it("sets child offset to (0,0) when offstage", () => {
      const render = new RenderOffstage(true);
      const child = new MockRenderBox(20, 10);
      render.adoptChild(child);

      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));

      expect(child.offset.x).toBe(0);
      expect(child.offset.y).toBe(0);
    });
  });

  describe("performLayout when not offstage", () => {
    it("sizes to child when not offstage", () => {
      const render = new RenderOffstage(false);
      const child = new MockRenderBox(30, 12);
      render.adoptChild(child);

      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));

      expect(render.size.width).toBe(30);
      expect(render.size.height).toBe(12);
    });

    it("sizes to constrained(0,0) when not offstage and no child", () => {
      const render = new RenderOffstage(false);
      // Tight constraints force non-zero min
      render.layout(new BoxConstraints({ minWidth: 5, maxWidth: 80, minHeight: 3, maxHeight: 24 }));
      expect(render.size.width).toBe(5);
      expect(render.size.height).toBe(3);
    });

    it("sets child offset to (0,0) when not offstage", () => {
      const render = new RenderOffstage(false);
      const child = new MockRenderBox(10, 5);
      render.adoptChild(child);

      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));

      expect(child.offset.x).toBe(0);
      expect(child.offset.y).toBe(0);
    });
  });

  it("throws when performLayout called without constraints", () => {
    const render = new RenderOffstage(true);
    expect(() => render.performLayout()).toThrow("performLayout called without constraints");
  });

  // ── Paint ─────────────────────────────────────

  describe("paint", () => {
    it("skips paint entirely when offstage", () => {
      const render = new RenderOffstage(true);
      const child = new MockRenderBox(10, 5);
      // Track whether child.paint was called
      let childPaintCalled = false;
      child.paint = () => {
        childPaintCalled = true;
      };
      render.adoptChild(child);

      // null cast — paint should short-circuit before using screen
      render.paint(null as never, 0, 0);

      expect(childPaintCalled).toBe(false);
    });

    it("paints child when not offstage", () => {
      const render = new RenderOffstage(false);
      const child = new MockRenderBox(10, 5);
      let childPaintCalled = false;
      child.paint = () => {
        childPaintCalled = true;
      };
      render.adoptChild(child);

      // Layout first so size is set and viewport clipping in super.paint works
      render.layout(BoxConstraints.tight(10, 5));

      // Use a minimal screen stub — super.paint only reads screen.width/height
      const fakeScreen = { width: 80, height: 24 } as never;
      render.paint(fakeScreen, 0, 0);

      expect(childPaintCalled).toBe(true);
    });
  });

  // ── HitTest ───────────────────────────────────

  describe("hitTest", () => {
    it("returns false when offstage", () => {
      const render = new RenderOffstage(true);
      render.layout(BoxConstraints.tight(10, 5));
      const result = { add: mock(() => {}) } as never;
      const hit = render.hitTest(result, { x: 1, y: 1 });
      expect(hit).toBe(false);
    });

    it("delegates hitTest to super when not offstage", () => {
      const render = new RenderOffstage(false);
      render.layout(BoxConstraints.tight(10, 5));
      const result = { add: mock(() => {}) } as never;
      // Point inside the 10x5 box at offset (0,0)
      const hit = render.hitTest(result, { x: 1, y: 1 }, 0, 0);
      expect(hit).toBe(true);
    });
  });

  // ── Setter ────────────────────────────────────

  describe("offstage setter", () => {
    it("calls markNeedsLayout when value changes", () => {
      const render = new RenderOffstage(true);
      // Manually attach and set needsLayout to false so markNeedsLayout is observable
      render["_attached"] = true;
      render["_needsLayout"] = false;

      render.offstage = false;

      expect(render["_needsLayout"]).toBe(true);
    });

    it("does NOT call markNeedsLayout when value is unchanged", () => {
      const render = new RenderOffstage(true);
      render["_attached"] = true;
      render["_needsLayout"] = false;

      render.offstage = true; // same value — no change

      expect(render["_needsLayout"]).toBe(false);
    });
  });
});

// ── Offstage widget tests ──────────────────────────

describe("Offstage widget", () => {
  it("creates widget with offstage=true by default", () => {
    const widget = new Offstage();
    expect(widget.offstage).toBe(true);
  });

  it("creates widget with explicit offstage=false", () => {
    const widget = new Offstage({ offstage: false });
    expect(widget.offstage).toBe(false);
  });

  it("creates widget with child", () => {
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const child = new Text({ data: "hello" }) as any;
    const widget = new Offstage({ child });
    expect(widget.child).toBe(child);
  });

  it("createRenderObject returns RenderOffstage with correct offstage value", () => {
    const widget = new Offstage({ offstage: false });
    const renderObject = widget.createRenderObject();
    expect(renderObject).toBeInstanceOf(RenderOffstage);
    expect((renderObject as RenderOffstage).offstage).toBe(false);
  });

  it("createRenderObject returns RenderOffstage with offstage=true by default", () => {
    const widget = new Offstage();
    const renderObject = widget.createRenderObject();
    expect(renderObject).toBeInstanceOf(RenderOffstage);
    expect((renderObject as RenderOffstage).offstage).toBe(true);
  });

  it("updateRenderObject updates offstage property", () => {
    const widget = new Offstage({ offstage: false });
    const renderObject = new RenderOffstage(true);
    widget.updateRenderObject(renderObject);
    expect(renderObject.offstage).toBe(false);
  });

  it("createElement returns an element associated with widget", () => {
    const widget = new Offstage();
    const element = widget.createElement();
    expect(element).toBeDefined();
    expect(element.widget).toBe(widget);
  });

  it("supports optional key", () => {
    const widget = new Offstage({ key: "test-key" });
    expect(widget.key).toBe("test-key");
  });
});
