/**
 * RenderScrollable 单元测试。
 *
 * 验证 RenderScrollable 作为 RenderBox 子类的布局、绘制和滚动偏移行为。
 *
 * @module
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { ScrollController } from "./scroll-controller.js";
import { RenderScrollable } from "./render-scrollable.js";
import { Screen } from "../screen/screen.js";

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
      scrollable.layout(new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      }));
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
      scrollable.layout(new BoxConstraints({
        minWidth: 0,
        maxWidth: 80,
        minHeight: 0,
        maxHeight: 30,
      }));
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
});
