/**
 * ScrollController + ClampingScrollPhysics 单元测试。
 *
 * TDD RED: 先编写全部测试用例，再实现功能代码。
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ScrollController } from "./scroll-controller.js";
import { ClampingScrollPhysics } from "./scroll-physics.js";

// ════════════════════════════════════════════════════
//  ClampingScrollPhysics
// ════════════════════════════════════════════════════

describe("ClampingScrollPhysics", () => {
  it("should clamp offset within [min, max]", () => {
    const physics = new ClampingScrollPhysics();
    expect(physics.clampOffset(50, 0, 100)).toBe(50);
    expect(physics.clampOffset(-10, 0, 100)).toBe(0);
    expect(physics.clampOffset(200, 0, 100)).toBe(100);
  });

  it("should handle min equals max", () => {
    const physics = new ClampingScrollPhysics();
    expect(physics.clampOffset(50, 0, 0)).toBe(0);
  });

  it("should handle zero range", () => {
    const physics = new ClampingScrollPhysics();
    expect(physics.clampOffset(0, 0, 0)).toBe(0);
  });
});

// ════════════════════════════════════════════════════
//  ScrollController — 初始状态
// ════════════════════════════════════════════════════

describe("ScrollController", () => {
  let controller: ScrollController;

  beforeEach(() => {
    controller = new ScrollController();
  });

  afterEach(() => {
    controller.dispose();
  });

  describe("initial state", () => {
    it("should have offset 0", () => {
      expect(controller.offset).toBe(0);
    });

    it("should have maxScrollExtent 0", () => {
      expect(controller.maxScrollExtent).toBe(0);
    });

    it("should have followMode true", () => {
      expect(controller.followMode).toBe(true);
    });

    it("should not be disposed", () => {
      expect(controller.disposed).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════
  //  jumpTo + clamping
  // ════════════════════════════════════════════════════

  describe("jumpTo", () => {
    it("should set offset to given value", () => {
      controller.updateMaxScrollExtent(200);
      controller.jumpTo(50);
      expect(controller.offset).toBe(50);
    });

    it("should clamp negative offset to 0", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(-10);
      expect(controller.offset).toBe(0);
    });

    it("should clamp offset exceeding maxScrollExtent", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(999);
      expect(controller.offset).toBe(100);
    });

    it("should notify listeners on offset change", () => {
      controller.updateMaxScrollExtent(100);
      let notified = false;
      controller.addListener(() => {
        notified = true;
      });
      controller.jumpTo(50);
      expect(notified).toBe(true);
    });

    it("should not notify listeners if offset unchanged", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(0);
      let notified = false;
      controller.addListener(() => {
        notified = true;
      });
      controller.jumpTo(0);
      expect(notified).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════
  //  scrollUp / scrollDown
  // ════════════════════════════════════════════════════

  describe("scrollUp / scrollDown", () => {
    it("scrollDown should increase offset", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(10);
      controller.scrollDown(5);
      expect(controller.offset).toBe(15);
    });

    it("scrollUp should decrease offset", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(10);
      controller.scrollUp(5);
      expect(controller.offset).toBe(5);
    });

    it("scrollUp should clamp to 0", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(3);
      controller.scrollUp(10);
      expect(controller.offset).toBe(0);
    });

    it("scrollDown should clamp to maxScrollExtent", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(95);
      controller.scrollDown(10);
      expect(controller.offset).toBe(100);
    });
  });

  // ════════════════════════════════════════════════════
  //  scrollToTop / scrollToBottom
  // ════════════════════════════════════════════════════

  describe("scrollToTop / scrollToBottom", () => {
    it("scrollToTop should set offset to 0", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(50);
      controller.scrollToTop();
      expect(controller.offset).toBe(0);
    });

    it("scrollToBottom should set offset to maxScrollExtent", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(10);
      controller.scrollToBottom();
      expect(controller.offset).toBe(100);
    });
  });

  // ════════════════════════════════════════════════════
  //  scrollPageUp / scrollPageDown
  // ════════════════════════════════════════════════════

  describe("scrollPageUp / scrollPageDown", () => {
    it("scrollPageDown should scroll half viewport", () => {
      controller.updateMaxScrollExtent(200);
      controller.jumpTo(0);
      controller.scrollPageDown(20);
      expect(controller.offset).toBe(10);
    });

    it("scrollPageUp should scroll half viewport back", () => {
      controller.updateMaxScrollExtent(200);
      controller.jumpTo(50);
      controller.scrollPageUp(20);
      expect(controller.offset).toBe(40);
    });

    it("scrollPageUp should clamp to 0", () => {
      controller.updateMaxScrollExtent(200);
      controller.jumpTo(3);
      controller.scrollPageUp(20);
      expect(controller.offset).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════
  //  followMode
  // ════════════════════════════════════════════════════

  describe("followMode", () => {
    it("updateMaxScrollExtent should auto-scroll to bottom when followMode is true", () => {
      controller.updateMaxScrollExtent(100);
      expect(controller.offset).toBe(100);
    });

    it("updateMaxScrollExtent should NOT auto-scroll when followMode is false", () => {
      controller.disableFollowMode();
      controller.updateMaxScrollExtent(100);
      expect(controller.offset).toBe(0);
    });

    it("enableFollowMode should set followMode to true", () => {
      controller.disableFollowMode();
      expect(controller.followMode).toBe(false);
      controller.enableFollowMode();
      expect(controller.followMode).toBe(true);
    });

    it("toggleFollowMode should toggle", () => {
      expect(controller.followMode).toBe(true);
      controller.toggleFollowMode();
      expect(controller.followMode).toBe(false);
      controller.toggleFollowMode();
      expect(controller.followMode).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════
  //  listeners
  // ════════════════════════════════════════════════════

  describe("listeners", () => {
    it("addListener / removeListener should manage callback set", () => {
      let count = 0;
      const fn = () => {
        count++;
      };
      controller.addListener(fn);
      controller.updateMaxScrollExtent(50);
      expect(count).toBeGreaterThan(0);

      const prevCount = count;
      controller.removeListener(fn);
      controller.updateMaxScrollExtent(100);
      // 即便 followMode 触发也不应再通知已移除的 listener
      // 但 offset 可能变化导致 listener 被调用——listener 已移除故不应增加
      expect(count).toBe(prevCount);
    });

    it("listener errors should not break other listeners", () => {
      let called = false;
      controller.addListener(() => {
        throw new Error("boom");
      });
      controller.addListener(() => {
        called = true;
      });
      controller.updateMaxScrollExtent(50);
      expect(called).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════
  //  animateTo
  // ════════════════════════════════════════════════════

  describe("animateTo", () => {
    it("should animate offset to target over time", async () => {
      controller.updateMaxScrollExtent(200);
      controller.jumpTo(0);
      controller.animateTo(100, 50);
      // 等待动画完成
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(controller.offset).toBe(100);
    });

    it("should jump directly for very short duration or small distance", () => {
      controller.updateMaxScrollExtent(200);
      controller.jumpTo(0);
      controller.animateTo(1, 0);
      expect(controller.offset).toBe(1);
    });
  });

  // ════════════════════════════════════════════════════
  //  dispose
  // ════════════════════════════════════════════════════

  describe("dispose", () => {
    it("should set disposed to true", () => {
      controller.dispose();
      expect(controller.disposed).toBe(true);
    });

    it("jumpTo should be no-op after dispose", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(50);
      controller.dispose();
      controller.jumpTo(80);
      expect(controller.offset).toBe(50);
    });

    it("scrollDown should be no-op after dispose", () => {
      controller.updateMaxScrollExtent(100);
      controller.jumpTo(10);
      controller.dispose();
      controller.scrollDown(5);
      expect(controller.offset).toBe(10);
    });

    it("animateTo should be no-op after dispose", () => {
      controller.disableFollowMode();
      controller.updateMaxScrollExtent(100);
      controller.dispose();
      controller.animateTo(50, 100);
      expect(controller.offset).toBe(0);
    });

    it("double dispose should not throw", () => {
      controller.dispose();
      expect(() => controller.dispose()).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════
  //  atTop / atBottom / atEdge
  // ════════════════════════════════════════════════════

  describe("edge detection", () => {
    it("atTop should be true when offset is 0", () => {
      expect(controller.atTop).toBe(true);
    });

    it("atBottom should be true when offset equals maxScrollExtent", () => {
      controller.updateMaxScrollExtent(100);
      expect(controller.atBottom).toBe(true); // followMode auto-scrolls
    });

    it("atEdge should be true when at top or bottom", () => {
      expect(controller.atEdge).toBe(true);
    });
  });
});
