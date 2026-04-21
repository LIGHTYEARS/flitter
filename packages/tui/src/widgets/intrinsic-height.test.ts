/**
 * IntrinsicHeight widget tests.
 *
 * 逆向: BtT/n1T (chunk-006.js:3019-3065)
 */

import { describe, expect, it } from "bun:test";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { IntrinsicHeight, RenderIntrinsicHeight } from "./intrinsic-height.js";
import { Text } from "./text.js";

// ── Mock child render box ──────────────────────────

/**
 * A mock RenderBox that reports a configurable intrinsic height
 * and sizes to the provided constraints.
 */
class MockRenderBox extends RenderBox {
  private readonly _intrinsicHeight: number;
  private readonly _intrinsicWidth: number;

  constructor(intrinsicWidth: number, intrinsicHeight: number) {
    super();
    this._intrinsicWidth = intrinsicWidth;
    this._intrinsicHeight = intrinsicHeight;
  }

  override performLayout(): void {
    const c = this._lastConstraints;
    if (!c) throw new Error("no constraints");
    // Size to the constrained dimensions (clamped)
    const w = Math.max(c.minWidth, Math.min(this._intrinsicWidth, c.maxWidth));
    const h = Math.max(c.minHeight, Math.min(this._intrinsicHeight, c.maxHeight));
    this.setSize(w, h);
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

// ── RenderIntrinsicHeight tests ────────────────────

describe("RenderIntrinsicHeight", () => {
  describe("performLayout", () => {
    it("sizes to min constraints when no child", () => {
      const render = new RenderIntrinsicHeight();
      render.layout(new BoxConstraints({ minWidth: 5, maxWidth: 20, minHeight: 3, maxHeight: 10 }));
      expect(render.size.width).toBe(5);
      expect(render.size.height).toBe(3);
    });

    it("constrains child height to its intrinsic height (loose constraints)", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(10, 7);
      render.adoptChild(child);

      // Loose height constraints: min=0, max=100
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 100 }),
      );

      // Child should be sized to intrinsic height (7), not max (100) or min (0)
      expect(render.size.height).toBe(7);
      expect(child.size.height).toBe(7);
    });

    it("passes through tight constraints unchanged", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(10, 7);
      render.adoptChild(child);

      // Tight height constraints: min=5, max=5
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 5, maxHeight: 5 }));

      // Should use tight constraint (5), not intrinsic (7)
      expect(render.size.height).toBe(5);
      expect(child.size.height).toBe(5);
    });

    it("preserves width from child", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(15, 8);
      render.adoptChild(child);

      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 100 }),
      );

      expect(render.size.width).toBe(15);
      expect(render.size.height).toBe(8);
    });

    it("sets child offset to (0, 0)", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(10, 5);
      render.adoptChild(child);

      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 100 }),
      );

      expect(child.offset.x).toBe(0);
      expect(child.offset.y).toBe(0);
    });

    it("throws when called without constraints", () => {
      const render = new RenderIntrinsicHeight();
      expect(() => render.performLayout()).toThrow("performLayout called without constraints");
    });
  });

  describe("intrinsic measurements", () => {
    it("getMinIntrinsicHeight delegates to getMaxIntrinsicHeight", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(10, 12);
      render.adoptChild(child);

      // min should equal max (that's the point of IntrinsicHeight)
      expect(render.getMinIntrinsicHeight(20)).toBe(12);
      expect(render.getMaxIntrinsicHeight(20)).toBe(12);
    });

    it("getMaxIntrinsicHeight returns 0 with no child", () => {
      const render = new RenderIntrinsicHeight();
      expect(render.getMaxIntrinsicHeight(20)).toBe(0);
    });

    it("getMinIntrinsicWidth resolves infinite height via intrinsic", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(10, 7);
      render.adoptChild(child);

      // When height is infinite, should resolve to child's intrinsic height first
      const result = render.getMinIntrinsicWidth(Number.POSITIVE_INFINITY);
      expect(result).toBe(10);
    });

    it("getMaxIntrinsicWidth resolves infinite height via intrinsic", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(15, 7);
      render.adoptChild(child);

      const result = render.getMaxIntrinsicWidth(Number.POSITIVE_INFINITY);
      expect(result).toBe(15);
    });

    it("getMinIntrinsicWidth passes finite height directly", () => {
      const render = new RenderIntrinsicHeight();
      const child = new MockRenderBox(10, 7);
      render.adoptChild(child);

      const result = render.getMinIntrinsicWidth(5);
      expect(result).toBe(10);
    });

    it("getMaxIntrinsicWidth returns 0 with no child", () => {
      const render = new RenderIntrinsicHeight();
      expect(render.getMaxIntrinsicWidth(20)).toBe(0);
    });

    it("getMinIntrinsicWidth returns 0 with no child", () => {
      const render = new RenderIntrinsicHeight();
      expect(render.getMinIntrinsicWidth(20)).toBe(0);
    });
  });
});

// ── IntrinsicHeight widget tests ───────────────────

describe("IntrinsicHeight widget", () => {
  it("creates widget with child", () => {
    const child = new Text({ data: "hello" });
    // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
    const widget = new IntrinsicHeight({ child: child as any });
    expect(widget.child).toBe(child);
  });

  it("creates widget without child", () => {
    const widget = new IntrinsicHeight();
    expect(widget.child).toBeUndefined();
  });

  it("createElement returns an element", () => {
    const widget = new IntrinsicHeight({
      // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
      child: new Text({ data: "test" }) as any,
    });
    const element = widget.createElement();
    expect(element).toBeDefined();
    expect(element.widget).toBe(widget);
  });

  it("createRenderObject returns RenderIntrinsicHeight", () => {
    const widget = new IntrinsicHeight();
    const renderObject = widget.createRenderObject();
    expect(renderObject).toBeInstanceOf(RenderIntrinsicHeight);
  });

  it("updateRenderObject is a no-op", () => {
    const widget = new IntrinsicHeight();
    const renderObject = widget.createRenderObject();
    // Should not throw
    widget.updateRenderObject(renderObject);
  });

  it("supports optional key", () => {
    const widget = new IntrinsicHeight({ key: "my-key" });
    expect(widget.key).toBe("my-key");
  });
});
