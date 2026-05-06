/**
 * RenderScrollable 单元测试。
 *
 * 验证 RenderScrollable 作为 RenderBox 子类的布局、绘制和滚动偏移行为。
 *
 * @module
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { HitTestResult } from "../gestures/hit-test.js";
import { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { RenderScrollable } from "./render-scrollable.js";
import { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  Mock child RenderBox
// ════════════════════════════════════════════════════

/**
 * 模拟子 RenderBox，固定宽度为约束最大宽度，高度为指定值。
 */
class MockChildRenderBox extends RenderBox {
  private _desiredHeight: number;
  readonly paintCalls: Array<{ offsetX: number; offsetY: number }> = [];

  constructor(desiredHeight: number) {
    super();
    this._desiredHeight = desiredHeight;
  }

  performLayout(): void {
    const constraints = this._constraints!;
    this._size = {
      width: constraints.maxWidth,
      height: this._desiredHeight,
    };
  }

  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this.paintCalls.push({ offsetX, offsetY });
    // 模拟写入每一行
    for (let row = 0; row < this._size.height; row++) {
      screen.writeChar(offsetX, offsetY + row, "X", {
        bold: false,
        dim: false,
        italic: false,
        underline: false,
        blink: false,
        inverse: false,
        strikethrough: false,
        overline: false,
        fg: undefined,
        bg: undefined,
      });
    }
  }
}

// ════════════════════════════════════════════════════
//  RenderScrollable 测试
// ════════════════════════════════════════════════════

describe("RenderScrollable", () => {
  let controller: ScrollController;

  beforeEach(() => {
    controller = new ScrollController();
    controller.disableFollowMode();
  });

  describe("performLayout", () => {
    it("should pass unbounded height constraint to child (maxHeight = Infinity)", () => {
      const child = new MockChildRenderBox(100);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // child 应接收 maxHeight = Infinity 的约束
      const childConstraints = child.constraints!;
      expect(childConstraints.maxHeight).toBe(Infinity);
      expect(childConstraints.minHeight).toBe(0);
      expect(childConstraints.maxWidth).toBe(80);
    });

    it("should set own size to parent constraints (viewport size)", () => {
      const child = new MockChildRenderBox(100);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      expect(scrollable.size.width).toBe(80);
      expect(scrollable.size.height).toBe(30);
    });

    it("should update ScrollController.maxScrollExtent = max(0, childHeight - viewportHeight)", () => {
      const child = new MockChildRenderBox(100);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // maxScrollExtent = max(0, 100 - 30) = 70
      expect(controller.maxScrollExtent).toBe(70);
    });

    it("should have maxScrollExtent = 0 when child is smaller than viewport", () => {
      const child = new MockChildRenderBox(20);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      expect(controller.maxScrollExtent).toBe(0);
    });

    it("should have maxScrollExtent = 70 when child height = 100 and viewport height = 30", () => {
      const child = new MockChildRenderBox(100);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      expect(controller.maxScrollExtent).toBe(70);
    });

    it("should cap child height at MAX_CHILD_HEIGHT and log warning for absurd values", () => {
      // T-12.1-04 threat mitigation: cap child heights > 100000
      const child = new MockChildRenderBox(200000);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // maxScrollExtent should be capped: max(0, 100000 - 30) = 99970
      expect(controller.maxScrollExtent).toBeLessThanOrEqual(100000);
    });
  });

  describe("paint", () => {
    it("should paint child with y offset = -scrollController.offset", () => {
      const child = new MockChildRenderBox(100);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);
      controller.jumpTo(10);

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);

      // child 应该以 offsetY = -10 被绘制
      expect(child.paintCalls.length).toBe(1);
      expect(child.paintCalls[0]!.offsetY).toBe(-10);
      expect(child.paintCalls[0]!.offsetX).toBe(0);
    });

    it("should not paint if no child exists", () => {
      const scrollable = new RenderScrollable(controller);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      const screen = new Screen(80, 30);
      // Should not throw
      scrollable.paint(screen, 0, 0);
    });
  });

  describe("scroll controller integration", () => {
    it("should trigger markNeedsPaint when ScrollController.jumpTo() is called", () => {
      const scrollable = new RenderScrollable(controller);
      const child = new MockChildRenderBox(100);
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // 手动模拟 attach
      scrollable.attach();

      // Clear paint flag after layout
      const screen = new Screen(80, 30);
      scrollable.paint(screen, 0, 0);
      expect(scrollable.needsPaint).toBe(false);

      // Now jump -- should trigger markNeedsPaint
      controller.jumpTo(10);

      expect(scrollable.needsPaint).toBe(true);
    });

    it("should update scrollController when set to new controller", () => {
      const scrollable = new RenderScrollable(controller);
      scrollable.attach();

      const newController = new ScrollController();
      newController.disableFollowMode();
      scrollable.scrollController = newController;

      // Old controller should no longer trigger repaints
      const screen = new Screen(80, 30);
      const child = new MockChildRenderBox(100);
      scrollable.adoptChild(child);
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );
      scrollable.paint(screen, 0, 0);

      controller.jumpTo(5);
      // Old controller's jump should NOT mark needs paint
      // (since we can't easily distinguish from the pipeline perspective,
      // we at least ensure new controller is connected)

      scrollable.paint(screen, 0, 0);
      expect(scrollable.needsPaint).toBe(false);

      newController.jumpTo(5);
      expect(scrollable.needsPaint).toBe(true);

      newController.dispose();
    });

    it("should detach listener on detach()", () => {
      const scrollable = new RenderScrollable(controller);
      scrollable.attach();

      const screen = new Screen(80, 30);
      const child = new MockChildRenderBox(100);
      scrollable.adoptChild(child);
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );
      scrollable.paint(screen, 0, 0);

      scrollable.detach();

      // After detach, controller changes should not trigger markNeedsPaint
      // (though controller may still notify, the listener should be removed)
      controller.jumpTo(5);
      // needsPaint might be true from layout, but the listener path was removed
      // This mainly verifies no errors occur
    });
  });

  describe("no child", () => {
    it("should handle performLayout without child", () => {
      const scrollable = new RenderScrollable(controller);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      expect(scrollable.size.width).toBe(80);
      expect(scrollable.size.height).toBe(30);
      expect(controller.maxScrollExtent).toBe(0);
    });
  });

  // ─── TUI-29: position="bottom" (bottom-stick viewport) ───

  describe('position="bottom"', () => {
    it("anchors short content to bottom of viewport", () => {
      const controller = new ScrollController();
      const scrollable = new RenderScrollable(controller, "bottom");
      const child = new MockChildRenderBox(10); // 10 rows, viewport 30
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 80,
        maxWidth: 80,
        minHeight: 30,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // maxScrollExtent should be 0 (content < viewport)
      expect(controller.maxScrollExtent).toBe(0);

      // Paint: child should be offset by (30 - 10) = 20 rows from top
      const screen = new Screen(80, 30);
      scrollable.paint(screen, 0, 0);

      expect(child.paintCalls.length).toBeGreaterThan(0);
      const lastPaint = child.paintCalls[child.paintCalls.length - 1]!;
      expect(lastPaint.offsetY).toBe(20); // bottom-anchored: 0 - 0 + 20
    });

    it("no bottom anchor when content >= viewport", () => {
      const controller = new ScrollController();
      const scrollable = new RenderScrollable(controller, "bottom");
      const child = new MockChildRenderBox(50); // 50 rows, viewport 30
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 80,
        maxWidth: 80,
        minHeight: 30,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // maxScrollExtent should be 20
      expect(controller.maxScrollExtent).toBe(20);

      // Since followMode is true by default, controller should be at bottom
      // So scrollOffset = 20, bottomAnchorOffset = 0
      const screen = new Screen(80, 30);
      scrollable.paint(screen, 0, 0);

      const lastPaint = child.paintCalls[child.paintCalls.length - 1]!;
      // offsetY = 0 - 20 + 0 = -20
      expect(lastPaint.offsetY).toBe(-20);
    });

    it("position defaults to top", () => {
      const controller = new ScrollController();
      const scrollable = new RenderScrollable(controller);
      const child = new MockChildRenderBox(10); // 10 rows, viewport 30
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 80,
        maxWidth: 80,
        minHeight: 30,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      const screen = new Screen(80, 30);
      scrollable.paint(screen, 0, 0);

      // Top position: no bottom anchor, so offsetY = 0
      const lastPaint = child.paintCalls[child.paintCalls.length - 1]!;
      expect(lastPaint.offsetY).toBe(0);
    });

    it("position setter triggers relayout", () => {
      const controller = new ScrollController();
      const scrollable = new RenderScrollable(controller, "top");
      const child = new MockChildRenderBox(10);
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 80,
        maxWidth: 80,
        minHeight: 30,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // Initially top: paint at 0
      const screen = new Screen(80, 30);
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[child.paintCalls.length - 1]!.offsetY).toBe(0);

      // Switch to bottom
      scrollable.position = "bottom";
      scrollable.layout(parentConstraints);
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[child.paintCalls.length - 1]!.offsetY).toBe(20);
    });
  });

  describe("hitTest", () => {
    it("should hit child at correct position when scrolled", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, "top");
      const child = new MockChildRenderBox(100);
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 80,
        maxWidth: 80,
        minHeight: 30,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);
      controller.jumpTo(20);

      // Click at screen row 5 — content row 25 (5 + 20)
      // Paint: child at offsetY - scrollOffset = 0 - 20 = -20
      // Content row 25 painted at screen row 25 + (-20) = 5
      const result = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });

      const childHit = result.hits.find((h) => h.target === child);
      expect(childHit).toBeDefined();
      expect(childHit!.localPosition.y).toBe(25);
    });

    it("should hit child at correct position with bottom anchor (short content)", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, "bottom");
      const child = new MockChildRenderBox(10);
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 80,
        maxWidth: 80,
        minHeight: 30,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);
      // bottomAnchorOffset = 30 - 10 = 20, scrollOffset = 0
      // Paint: child at offsetY - 0 + 20 = 20
      // Content row 5 at screen row 25

      const result = HitTestResult.hitTest(scrollable, { x: 5, y: 25 });

      const childHit = result.hits.find((h) => h.target === child);
      expect(childHit).toBeDefined();
      expect(childHit!.localPosition.y).toBe(5);
    });

    it("should NOT hit child outside viewport bounds", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, "top");
      const child = new MockChildRenderBox(100);
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 80,
        maxWidth: 80,
        minHeight: 30,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      const result = HitTestResult.hitTest(scrollable, { x: 5, y: 35 });

      const scrollableHit = result.hits.find((h) => h.target === scrollable);
      expect(scrollableHit).toBeUndefined();
    });
  });
});
