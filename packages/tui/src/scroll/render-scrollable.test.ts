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
import { ScrollBehavior } from "./scroll-behavior.js";
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

  /**
   * 更新模拟子节点的期望高度。
   *
   * @param desiredHeight - 下一次布局时返回的高度
   */
  setDesiredHeight(desiredHeight: number): void {
    this._desiredHeight = desiredHeight;
    this.markNeedsLayout();
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
    it("synchronizes cached offset for paint immediately after scroll input", () => {
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
      controller.updateOffset(10);
      // Push offset change via updateProperties (simulates ScrollViewport.updateRenderObject)
      scrollable.updateProperties(controller, controller.offset, "top");

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);

      // 滚动输入后，无需等待下一次 layout，paint 立即消费最新 offset
      expect(child.paintCalls.length).toBe(1);
      expect(child.paintCalls[0]!.offsetY).toBe(-10);
      expect(child.paintCalls[0]!.offsetX).toBe(0);
    });

    it("refreshes paint snapshot after relayout", () => {
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
      // Push offset via updateProperties then trigger relayout
      scrollable.updateProperties(controller, controller.offset, "top");
      scrollable.markNeedsLayout();
      scrollable.layout(parentConstraints);

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);

      expect(child.paintCalls.length).toBe(1);
      expect(child.paintCalls[0]!.offsetY).toBe(-10);
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
    it("should trigger markNeedsPaint when updateProperties propagates new offset", () => {
      const scrollable = new RenderScrollable(controller);
      const child = new MockChildRenderBox(100);
      scrollable.adoptChild(child);
      scrollable.attach();

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);

      // Clear paint flag after layout
      const screen = new Screen(80, 30);
      scrollable.paint(screen, 0, 0);
      expect(scrollable.needsPaint).toBe(false);

      // Simulate what ScrollViewport.updateRenderObject does after controller.jumpTo
      controller.jumpTo(10);
      scrollable.updateProperties(controller, controller.offset, "top");

      expect(scrollable.needsPaint).toBe(true);
    });

    it("should update scrollController via updateProperties", () => {
      const scrollable = new RenderScrollable(controller);
      scrollable.attach();

      const newController = new ScrollController();
      newController.disableFollowMode();

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
      expect(scrollable.needsPaint).toBe(false);

      // Switch to new controller via updateProperties
      scrollable.updateProperties(newController, 0, "top");

      // updateProperties with new controller triggers markNeedsLayout
      // After relayout with new controller, verify new controller is active
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );
      scrollable.paint(screen, 0, 0);
      expect(scrollable.needsPaint).toBe(false);

      // Push offset change via new controller path
      newController.jumpTo(5);
      scrollable.updateProperties(newController, newController.offset, "top");
      expect(scrollable.needsPaint).toBe(true);

      newController.dispose();
    });

    it("should handle detach() without errors", () => {
      const scrollable = new RenderScrollable(controller);

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

      // After detach, updateProperties should still work without errors
      controller.jumpTo(5);
      scrollable.updateProperties(controller, controller.offset, "top");
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
    it("auto-scrolls only when the viewport was already at bottom", () => {
      const child = new MockChildRenderBox(40);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      controller.enableFollowMode();
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 10,
        }),
      );

      controller.jumpTo(controller.maxScrollExtent);
      child.setDesiredHeight(60);
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 10,
        }),
      );

      expect(controller.offset).toBe(controller.maxScrollExtent);
    });

    it("does not auto-scroll when the user has left the bottom", () => {
      const child = new MockChildRenderBox(40);
      const scrollable = new RenderScrollable(controller);
      scrollable.adoptChild(child);

      controller.enableFollowMode();
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 10,
        }),
      );

      controller.jumpTo(5);
      child.setDesiredHeight(60);
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 10,
        }),
      );

      expect(controller.offset).toBe(5);
    });

    it("does not auto-scroll when content grows from fit to overflow", () => {
      const child = new MockChildRenderBox(10);
      const scrollable = new RenderScrollable(controller, 0, "bottom");
      scrollable.adoptChild(child);
      scrollable.attach();

      controller.enableFollowMode();
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );

      expect(controller.maxScrollExtent).toBe(0);
      expect(controller.offset).toBe(0);

      child.setDesiredHeight(50);
      scrollable.markNeedsLayout();
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );

      expect(controller.maxScrollExtent).toBe(20);
      expect(controller.offset).toBe(0);
    });

    it("does not auto-scroll after a positive->0->positive extent transition", () => {
      const child = new MockChildRenderBox(50);
      const scrollable = new RenderScrollable(controller, 0, "bottom");
      scrollable.adoptChild(child);
      scrollable.attach();

      controller.enableFollowMode();
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );

      expect(controller.maxScrollExtent).toBe(20);
      expect(controller.offset).toBe(0);

      controller.jumpTo(controller.maxScrollExtent);
      child.setDesiredHeight(10);
      scrollable.markNeedsLayout();
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );

      expect(controller.maxScrollExtent).toBe(0);
      expect(controller.offset).toBe(0);

      child.setDesiredHeight(50);
      scrollable.markNeedsLayout();
      scrollable.layout(
        new BoxConstraints({
          minWidth: 0,
          maxWidth: 80,
          minHeight: 0,
          maxHeight: 30,
        }),
      );

      expect(controller.maxScrollExtent).toBe(20);
      expect(controller.offset).toBe(0);
    });

    it("anchors short content to bottom of viewport", () => {
      const controller = new ScrollController();
      const scrollable = new RenderScrollable(controller, 0, "bottom");
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
      const scrollable = new RenderScrollable(controller, 0, "bottom");
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

      // fit->overflow 不应触发额外 auto-scroll，因此保持顶部对齐
      const screen = new Screen(80, 30);
      scrollable.paint(screen, 0, 0);

      const lastPaint = child.paintCalls[child.paintCalls.length - 1]!;
      expect(lastPaint.offsetY).toBe(0);
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
      const scrollable = new RenderScrollable(controller, 0, "top");
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

      // Switch to bottom via updateProperties
      scrollable.updateProperties(controller, 0, "bottom");
      scrollable.layout(parentConstraints);
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[child.paintCalls.length - 1]!.offsetY).toBe(20);
    });
  });

  describe("visible scroll snapshot", () => {
    it("uses the latest controller offset for hitTest before paint", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, 0, "top");
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
      controller.updateOffset(20);
      scrollable.updateProperties(controller, controller.offset, "top");

      const beforePaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const beforePaintChildHit = beforePaint.hits.find((h) => h.target === child);
      expect(beforePaintChildHit).toBeDefined();
      expect(beforePaintChildHit!.localPosition.y).toBe(25);

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[0]!.offsetY).toBe(-20);

      const afterPaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const afterPaintChildHit = afterPaint.hits.find((h) => h.target === child);
      expect(afterPaintChildHit).toBeDefined();
      expect(afterPaintChildHit!.localPosition.y).toBe(25);
    });

    it("uses the latest layout snapshot for hitTest before paint", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, 0, "top");
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
      scrollable.updateProperties(controller, controller.offset, "top");
      scrollable.markNeedsLayout();
      scrollable.layout(parentConstraints);

      const beforePaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const beforePaintChildHit = beforePaint.hits.find((h) => h.target === child);
      expect(beforePaintChildHit).toBeDefined();
      expect(beforePaintChildHit!.localPosition.y).toBe(25);

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[0]!.offsetY).toBe(-20);

      const afterPaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const afterPaintChildHit = afterPaint.hits.find((h) => h.target === child);
      expect(afterPaintChildHit).toBeDefined();
      expect(afterPaintChildHit!.localPosition.y).toBe(25);
    });

    it("keeps hitTest aligned with the latest bottom-anchor snapshot before paint", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, 0, "top");
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

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[0]!.offsetY).toBe(0);

      scrollable.updateProperties(controller, 0, "bottom");
      scrollable.layout(parentConstraints);

      const beforePaint = HitTestResult.hitTest(scrollable, { x: 5, y: 25 });
      const beforePaintChildHit = beforePaint.hits.find((h) => h.target === child);
      expect(beforePaintChildHit).toBeDefined();
      expect(beforePaintChildHit!.localPosition.y).toBe(5);

      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[0]!.offsetY).toBe(20);

      const afterPaint = HitTestResult.hitTest(scrollable, { x: 5, y: 25 });
      const afterPaintChildHit = afterPaint.hits.find((h) => h.target === child);
      expect(afterPaintChildHit).toBeDefined();
      expect(afterPaintChildHit!.localPosition.y).toBe(5);
    });

    it("uses the final controller snapshot when multiple updates are coalesced before paint", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, 0, "top");
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

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[0]!.offsetY).toBe(0);

      controller.jumpTo(5);
      controller.jumpTo(4);
      controller.jumpTo(3);
      scrollable.updateProperties(controller, controller.offset, "top");

      const beforePaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const beforePaintChildHit = beforePaint.hits.find((h) => h.target === child);
      expect(beforePaintChildHit).toBeDefined();
      expect(beforePaintChildHit!.localPosition.y).toBe(8);

      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls).toHaveLength(1);
      expect(child.paintCalls[0]!.offsetY).toBe(-3);

      const afterPaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const afterPaintChildHit = afterPaint.hits.find((h) => h.target === child);
      expect(afterPaintChildHit).toBeDefined();
      expect(afterPaintChildHit!.localPosition.y).toBe(8);
    });

    it("drops stale non-zero snapshots when the final coalesced controller update returns to zero", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, 0, "top");
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

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls[0]!.offsetY).toBe(0);

      controller.jumpTo(5);
      controller.jumpTo(0);
      scrollable.updateProperties(controller, controller.offset, "top");

      const beforePaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const beforePaintChildHit = beforePaint.hits.find((h) => h.target === child);
      expect(beforePaintChildHit).toBeDefined();
      expect(beforePaintChildHit!.localPosition.y).toBe(5);

      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);
      expect(child.paintCalls).toHaveLength(1);
      expect(child.paintCalls[0]!.offsetY).toBe(0);

      const afterPaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const afterPaintChildHit = afterPaint.hits.find((h) => h.target === child);
      expect(afterPaintChildHit).toBeDefined();
      expect(afterPaintChildHit!.localPosition.y).toBe(5);
    });

    it("should hit child at correct position with bottom anchor (short content)", () => {
      const controller = new ScrollController();
      controller.disableFollowMode();
      const scrollable = new RenderScrollable(controller, 0, "bottom");
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
      const scrollable = new RenderScrollable(controller, 0, "top");
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

  describe("regression: user scroll input", () => {
    it("renders the latest scroll snapshot even when updates are coalesced before paint", () => {
      const child = new MockChildRenderBox(100);
      const scrollable = new RenderScrollable(controller);
      const behavior = new ScrollBehavior(controller, { axisDirection: "vertical", scrollStep: 1 });
      scrollable.adoptChild(child);

      const parentConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      });

      scrollable.layout(parentConstraints);
      behavior.handleScrollDelta(7);
      // Push offset change via updateProperties (simulates ScrollViewport.updateRenderObject)
      scrollable.updateProperties(controller, controller.offset, "top");

      const beforePaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const beforePaintChildHit = beforePaint.hits.find((hit) => hit.target === child);
      expect(beforePaintChildHit).toBeDefined();
      expect(beforePaintChildHit!.localPosition.y).toBe(12);

      const screen = new Screen(80, 30);
      child.paintCalls.length = 0;
      scrollable.paint(screen, 0, 0);

      expect(child.paintCalls.length).toBe(1);
      expect(child.paintCalls[0]!.offsetY).toBe(-7);

      const afterPaint = HitTestResult.hitTest(scrollable, { x: 5, y: 5 });
      const afterPaintChildHit = afterPaint.hits.find((hit) => hit.target === child);
      expect(afterPaintChildHit).toBeDefined();
      expect(afterPaintChildHit!.localPosition.y).toBe(12);
    });
  });
});
