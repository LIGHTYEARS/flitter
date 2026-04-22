/**
 * DialogBox widget tests.
 *
 * 逆向: pRR/RR (chunk-006.js:19492-19650)
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../screen/color.js";
import { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { DialogBox, RenderDialogBox } from "./dialog-box.js";
import { Text } from "./text.js";

// ── Mock child render box ──────────────────────────

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

// ════════════════════════════════════════════════════
//  RenderDialogBox tests
// ════════════════════════════════════════════════════

describe("RenderDialogBox", () => {
  const defaultBorderColor = Color.rgb(108, 112, 134);
  const defaultBgColor = Color.rgb(0, 0, 0);

  function createRender(
    opts?: Partial<{
      maxHeight: number;
      borderStyle: "rounded" | "square";
      hasBanner: boolean;
      userHeight: number;
    }>,
  ): RenderDialogBox {
    return new RenderDialogBox(
      opts?.maxHeight,
      defaultBorderColor,
      defaultBgColor,
      opts?.borderStyle ?? "rounded",
      opts?.hasBanner ?? false,
      opts?.userHeight,
    );
  }

  // ── Layout tests ──

  describe("performLayout", () => {
    it("sizes to (minWidth, 2) with no children", () => {
      const render = createRender();
      render.layout(
        new BoxConstraints({ minWidth: 40, maxWidth: 80, minHeight: 0, maxHeight: 24 }),
      );
      expect(render.size.width).toBe(40);
      expect(render.size.height).toBe(2);
    });

    it("sizes to maxWidth for width with a single child", () => {
      const render = createRender();
      const child = new MockRenderBox(20, 5);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 30 }));
      expect(render.size.width).toBe(60);
    });

    it("computes height from child intrinsic height plus border (2)", () => {
      const render = createRender();
      const child = new MockRenderBox(20, 5);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 30 }));
      // intrinsic height = min(5, 50) + 2 = 7
      expect(render.size.height).toBe(7);
    });

    it("caps left intrinsic height at 50", () => {
      const render = createRender();
      const child = new MockRenderBox(20, 100);
      render.adoptChild(child);
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 100 }),
      );
      // intrinsic height = min(100, 50) + 2 = 52
      expect(render.size.height).toBe(52);
    });

    it("positions single child at (1, 1) with full inner width", () => {
      const render = createRender();
      const child = new MockRenderBox(20, 5);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 30 }));
      expect(child.offset.x).toBe(1);
      expect(child.offset.y).toBe(1);
      // single child gets totalWidth - 2
      expect(child.size.width).toBe(20); // min of intrinsic and 58
    });

    it("positions left child in left column when two children exist", () => {
      const render = createRender();
      const left = new MockRenderBox(10, 5);
      const right = new MockRenderBox(10, 5);
      render.adoptChild(left);
      render.adoptChild(right);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 30 }));
      expect(left.offset.x).toBe(1);
      expect(left.offset.y).toBe(1);
    });

    it("positions right child in right column", () => {
      const render = createRender();
      const left = new MockRenderBox(10, 5);
      const right = new MockRenderBox(10, 5);
      render.adoptChild(left);
      render.adoptChild(right);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 30 }));
      const halfWidth = Math.floor(60 / 2);
      expect(right.offset.x).toBe(halfWidth + 1);
      expect(right.offset.y).toBe(1);
    });

    it("respects maxHeight constraint", () => {
      const render = createRender({ maxHeight: 10 });
      const child = new MockRenderBox(20, 50);
      render.adoptChild(child);
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 100 }),
      );
      expect(render.size.height).toBe(10);
    });

    it("uses userHeight when specified", () => {
      const render = createRender({ userHeight: 12 });
      const child = new MockRenderBox(20, 50);
      render.adoptChild(child);
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 100 }),
      );
      expect(render.size.height).toBe(12);
    });

    it("enforces minimum userHeight of 4", () => {
      const render = createRender({ userHeight: 2 });
      const child = new MockRenderBox(20, 50);
      render.adoptChild(child);
      render.layout(
        new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 100 }),
      );
      expect(render.size.height).toBe(4);
    });

    it("third child is positioned below second in right column", () => {
      const render = createRender();
      const left = new MockRenderBox(10, 5);
      const topRight = new MockRenderBox(10, 3);
      const bottomRight = new MockRenderBox(10, 3);
      render.adoptChild(left);
      render.adoptChild(topRight);
      render.adoptChild(bottomRight);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 30 }));

      const halfWidth = Math.floor(60 / 2);
      expect(topRight.offset.x).toBe(halfWidth + 1);
      expect(topRight.offset.y).toBe(1);
      // bottom right = secondHeight(3) + 2 (1-based offset + 1 separator)
      expect(bottomRight.offset.x).toBe(halfWidth + 1);
      expect(bottomRight.offset.y).toBe(3 + 2);
    });

    it("does not return early when constraints are present", () => {
      const render = createRender();
      render.layout(
        new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 0, maxHeight: 24 }),
      );
      // Should not throw and should produce a valid size
      expect(render.size.width).toBeGreaterThanOrEqual(0);
      expect(render.size.height).toBeGreaterThanOrEqual(0);
    });

    it("respects constraints maxHeight less than computed height", () => {
      const render = createRender();
      const child = new MockRenderBox(20, 10);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 5 }));
      expect(render.size.height).toBeLessThanOrEqual(5);
    });

    it("left column width is totalWidth-2 for single child", () => {
      const render = createRender();
      const child = new MockRenderBox(100, 5);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 30 }));
      // Child should be constrained to maxWidth = 40 - 2 = 38
      expect(child.size.width).toBeLessThanOrEqual(38);
    });

    it("left column width is halfWidth-2 for two children", () => {
      const render = createRender();
      const left = new MockRenderBox(100, 5);
      const right = new MockRenderBox(100, 5);
      render.adoptChild(left);
      render.adoptChild(right);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 30 }));
      const halfWidth = Math.floor(40 / 2);
      expect(left.size.width).toBeLessThanOrEqual(halfWidth - 2);
    });
  });

  // ── Intrinsic height tests ──

  describe("intrinsic height", () => {
    it("returns 2 with no children", () => {
      const render = createRender();
      expect(render.getMinIntrinsicHeight(60)).toBe(2);
    });

    it("returns userHeight when set", () => {
      const render = createRender({ userHeight: 15 });
      expect(render.getMinIntrinsicHeight(60)).toBe(15);
    });

    it("returns at least 4 for userHeight", () => {
      const render = createRender({ userHeight: 2 });
      expect(render.getMinIntrinsicHeight(60)).toBe(4);
    });

    it("getMaxIntrinsicHeight equals getMinIntrinsicHeight", () => {
      const render = createRender();
      const child = new MockRenderBox(20, 5);
      render.adoptChild(child);
      expect(render.getMaxIntrinsicHeight(60)).toBe(render.getMinIntrinsicHeight(60));
    });

    it("accounts for right-side children in height calculation", () => {
      const render = createRender();
      const left = new MockRenderBox(10, 3);
      const topRight = new MockRenderBox(10, 4);
      const bottomRight = new MockRenderBox(10, 4);
      render.adoptChild(left);
      render.adoptChild(topRight);
      render.adoptChild(bottomRight);
      // Right height = 4 + 4 + 1(separator) = 9
      // Left height = min(3, 50) = 3
      // max(3, 9) + 2 = 11
      expect(render.getMinIntrinsicHeight(60)).toBe(11);
    });
  });

  // ── Paint tests ──

  describe("paint", () => {
    it("draws rounded corners by default", () => {
      const render = createRender();
      const child = new MockRenderBox(10, 3);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(20, 10);
      render.paint(screen, 0, 0);

      expect(screen.getCell(0, 0).char).toBe("\u256D"); // ╭
      expect(screen.getCell(19, 0).char).toBe("\u256E"); // ╮
      expect(screen.getCell(0, 4).char).toBe("\u2570"); // ╰
      expect(screen.getCell(19, 4).char).toBe("\u256F"); // ╯
    });

    it("draws square corners when borderStyle is square", () => {
      const render = createRender({ borderStyle: "square" });
      const child = new MockRenderBox(10, 3);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(20, 10);
      render.paint(screen, 0, 0);

      expect(screen.getCell(0, 0).char).toBe("\u250C"); // ┌
      expect(screen.getCell(19, 0).char).toBe("\u2510"); // ┐
      expect(screen.getCell(0, 4).char).toBe("\u2514"); // └
      expect(screen.getCell(19, 4).char).toBe("\u2518"); // ┘
    });

    it("draws horizontal borders", () => {
      const render = createRender();
      const child = new MockRenderBox(10, 3);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(20, 10);
      render.paint(screen, 0, 0);

      // Top border (excluding corners)
      expect(screen.getCell(1, 0).char).toBe("\u2500"); // ─
      expect(screen.getCell(18, 0).char).toBe("\u2500"); // ─
      // Bottom border
      expect(screen.getCell(1, 4).char).toBe("\u2500"); // ─
    });

    it("draws vertical borders", () => {
      const render = createRender();
      const child = new MockRenderBox(10, 3);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(20, 10);
      render.paint(screen, 0, 0);

      expect(screen.getCell(0, 1).char).toBe("\u2502"); // │
      expect(screen.getCell(0, 2).char).toBe("\u2502"); // │
      expect(screen.getCell(19, 1).char).toBe("\u2502"); // │
    });

    it("draws banner mode top corners", () => {
      const render = createRender({ hasBanner: true });
      const child = new MockRenderBox(10, 3);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(20, 10);
      render.paint(screen, 0, 0);

      expect(screen.getCell(0, 0).char).toBe("\u251C"); // ├
      expect(screen.getCell(19, 0).char).toBe("\u2524"); // ┤
      // Bottom corners still use rounded style
      expect(screen.getCell(0, 4).char).toBe("\u2570"); // ╰
      expect(screen.getCell(19, 4).char).toBe("\u256F"); // ╯
    });

    it("draws center column divider for multiple children", () => {
      const render = createRender();
      const left = new MockRenderBox(10, 5);
      const right = new MockRenderBox(10, 5);
      render.adoptChild(left);
      render.adoptChild(right);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(20, 10);
      render.paint(screen, 0, 0);

      const halfWidth = Math.floor(20 / 2);
      // Top T-junction
      expect(screen.getCell(halfWidth, 0).char).toBe("\u252C"); // ┬
      // Middle vertical divider
      expect(screen.getCell(halfWidth, 1).char).toBe("\u2502"); // │
      expect(screen.getCell(halfWidth, 2).char).toBe("\u2502"); // │
      // Bottom T-junction
      expect(screen.getCell(halfWidth, 6).char).toBe("\u2534"); // ┴
    });

    it("draws horizontal separator between second and third children", () => {
      const render = createRender({ userHeight: 12 });
      const left = new MockRenderBox(10, 5);
      const topRight = new MockRenderBox(10, 3);
      const bottomRight = new MockRenderBox(10, 3);
      render.adoptChild(left);
      render.adoptChild(topRight);
      render.adoptChild(bottomRight);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 20 }));

      const screen = new Screen(20, 20);
      render.paint(screen, 0, 0);

      const halfWidth = Math.floor(20 / 2);
      // Separator Y = topRight.offset.y(1) + topRight.size.height(3) = 4
      const sepY = topRight.offset.y + topRight.size.height;
      // Horizontal separator
      expect(screen.getCell(halfWidth + 1, sepY).char).toBe("\u2500"); // ─
      // Left junction
      expect(screen.getCell(halfWidth, sepY).char).toBe("\u251C"); // ├
      // Right junction
      expect(screen.getCell(19, sepY).char).toBe("\u2524"); // ┤
    });

    it("fills background color", () => {
      const bgColor = Color.rgb(30, 30, 30);
      const render = new RenderDialogBox(undefined, defaultBorderColor, bgColor, "rounded", false);
      const child = new MockRenderBox(10, 3);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(20, 10);
      render.paint(screen, 0, 0);

      // Interior cell should have background color
      const cell = screen.getCell(2, 2);
      expect(cell.style.background).toBeDefined();
    });

    it("paints with offset", () => {
      const render = createRender();
      const child = new MockRenderBox(10, 3);
      render.adoptChild(child);
      render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

      const screen = new Screen(30, 15);
      render.paint(screen, 5, 3);

      // Top-left corner should be at (5, 3)
      expect(screen.getCell(5, 3).char).toBe("\u256D"); // ╭
      // Top-right corner
      expect(screen.getCell(24, 3).char).toBe("\u256E"); // ╮
    });
  });
});

// ════════════════════════════════════════════════════
//  DialogBox widget tests
// ════════════════════════════════════════════════════

describe("DialogBox widget", () => {
  const borderColor = Color.rgb(108, 112, 134);
  const bgColor = Color.rgb(0, 0, 0);

  it("creates widget with required props", () => {
    const widget = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
    });
    expect(widget.borderStyle).toBe("rounded");
    expect(widget.hasBanner).toBe(false);
    expect(widget.maxHeight).toBeUndefined();
    expect(widget.userHeight).toBeUndefined();
  });

  it("creates widget with all props", () => {
    const widget = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
      borderStyle: "square",
      hasBanner: true,
      maxHeight: 20,
      userHeight: 10,
    });
    expect(widget.borderStyle).toBe("square");
    expect(widget.hasBanner).toBe(true);
    expect(widget.maxHeight).toBe(20);
    expect(widget.userHeight).toBe(10);
  });

  it("exposes children array", () => {
    const child = new Text({ data: "hello" });
    const widget = new DialogBox({
      // biome-ignore lint/suspicious/noExplicitAny: widget type coercion in tests
      children: [child as any],
      borderColor,
      backgroundColor: bgColor,
    });
    expect(widget.children.length).toBe(1);
  });

  it("createRenderObject returns RenderDialogBox", () => {
    const widget = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
    });
    const ro = widget.createRenderObject();
    expect(ro).toBeInstanceOf(RenderDialogBox);
  });

  it("updateRenderObject updates properties", () => {
    const widget = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
      borderStyle: "square",
      hasBanner: true,
    });
    const ro = widget.createRenderObject() as RenderDialogBox;
    expect(ro.borderStyle).toBe("square");
    expect(ro.hasBanner).toBe(true);

    const widget2 = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
      borderStyle: "rounded",
      hasBanner: false,
    });
    widget2.updateRenderObject(ro);
    expect(ro.borderStyle).toBe("rounded");
    expect(ro.hasBanner).toBe(false);
  });

  it("updateRenderObject triggers relayout on userHeight change", () => {
    const widget1 = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
      userHeight: 10,
    });
    const ro = widget1.createRenderObject() as RenderDialogBox;
    expect(ro.userHeight).toBe(10);

    const widget2 = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
      userHeight: 15,
    });
    widget2.updateRenderObject(ro);
    expect(ro.userHeight).toBe(15);
  });

  it("createElement returns an element", () => {
    const widget = new DialogBox({
      children: [],
      borderColor,
      backgroundColor: bgColor,
    });
    const element = widget.createElement();
    expect(element).toBeDefined();
  });
});
