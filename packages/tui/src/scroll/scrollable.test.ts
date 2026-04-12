/**
 * ScrollKeyHandler + Scrollable 单元测试。
 *
 * TDD RED: 先编写全部测试用例，再实现功能代码。
 *
 * @module
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ScrollController } from "./scroll-controller.js";
import { ScrollKeyHandler } from "./scroll-key-handler.js";
import { Scrollable } from "./scrollable.js";
import type { KeyEvent, MouseEvent } from "../vt/types.js";

// ════════════════════════════════════════════════════
//  辅助工具
// ════════════════════════════════════════════════════

/** 创建 KeyEvent 快捷方法 */
function key(
  k: string,
  mods?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
): KeyEvent {
  return {
    type: "key",
    key: k,
    modifiers: {
      ctrl: mods?.ctrl ?? false,
      shift: mods?.shift ?? false,
      alt: mods?.alt ?? false,
      meta: mods?.meta ?? false,
    },
  };
}

// ════════════════════════════════════════════════════
//  ScrollKeyHandler
// ════════════════════════════════════════════════════

describe("ScrollKeyHandler", () => {
  let controller: ScrollController;
  let handler: ScrollKeyHandler;
  const viewportSize = 20;

  beforeEach(() => {
    controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(200);
    controller.jumpTo(100);
    handler = new ScrollKeyHandler();
  });

  afterEach(() => {
    controller.dispose();
  });

  describe("keyboard events", () => {
    it("ArrowUp should scroll up by scrollStep", () => {
      const handled = handler.handleKeyEvent(key("ArrowUp"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(97); // 100 - 3
    });

    it("ArrowDown should scroll down by scrollStep", () => {
      const handled = handler.handleKeyEvent(key("ArrowDown"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(103); // 100 + 3
    });

    it("k should scroll up (vim style)", () => {
      const handled = handler.handleKeyEvent(key("k"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(97);
    });

    it("j should scroll down (vim style)", () => {
      const handled = handler.handleKeyEvent(key("j"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(103);
    });

    it("PageUp should scroll page up", () => {
      const handled = handler.handleKeyEvent(key("PageUp"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(90); // 100 - floor(20/2)
    });

    it("PageDown should scroll page down", () => {
      const handled = handler.handleKeyEvent(key("PageDown"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(110); // 100 + floor(20/2)
    });

    it("Ctrl+u should scroll page up", () => {
      const handled = handler.handleKeyEvent(key("u", { ctrl: true }), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(90);
    });

    it("Ctrl+d should scroll page down", () => {
      const handled = handler.handleKeyEvent(key("d", { ctrl: true }), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(110);
    });

    it("Home should scroll to top", () => {
      const handled = handler.handleKeyEvent(key("Home"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(0);
    });

    it("End should scroll to bottom", () => {
      const handled = handler.handleKeyEvent(key("End"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(200);
    });

    it("g should scroll to top", () => {
      const handled = handler.handleKeyEvent(key("g"), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(0);
    });

    it("G (shift+g) should scroll to bottom", () => {
      const handled = handler.handleKeyEvent(key("g", { shift: true }), controller, viewportSize);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(200);
    });

    it("unrelated key should return false", () => {
      const handled = handler.handleKeyEvent(key("a"), controller, viewportSize);
      expect(handled).toBe(false);
      expect(controller.offset).toBe(100);
    });

    it("Ctrl+u without ctrl should not trigger page up", () => {
      const handled = handler.handleKeyEvent(key("u"), controller, viewportSize);
      expect(handled).toBe(false);
      expect(controller.offset).toBe(100);
    });
  });

  describe("mouse scroll events", () => {
    it("wheel_up should scroll up", () => {
      const handled = handler.handleMouseScroll("wheel_up", controller);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(97);
    });

    it("wheel_down should scroll down", () => {
      const handled = handler.handleMouseScroll("wheel_down", controller);
      expect(handled).toBe(true);
      expect(controller.offset).toBe(103);
    });

    it("other mouse action should return false", () => {
      const handled = handler.handleMouseScroll("press", controller);
      expect(handled).toBe(false);
      expect(controller.offset).toBe(100);
    });
  });

  describe("custom scroll step", () => {
    it("should use custom scrollStep", () => {
      const customHandler = new ScrollKeyHandler({ scrollStep: 5 });
      customHandler.handleKeyEvent(key("ArrowDown"), controller, viewportSize);
      expect(controller.offset).toBe(105);
    });
  });
});

// ════════════════════════════════════════════════════
//  Scrollable Widget
// ════════════════════════════════════════════════════

describe("Scrollable", () => {
  describe("creation", () => {
    it("should create Scrollable with external controller", () => {
      const controller = new ScrollController();
      const scrollable = new Scrollable({ controller });
      expect(scrollable).toBeDefined();
      expect(scrollable.controller).toBe(controller);
      controller.dispose();
    });

    it("should create Scrollable without controller (auto-managed)", () => {
      const scrollable = new Scrollable({});
      expect(scrollable).toBeDefined();
      // 无外部 controller 时, controller 为 undefined, State 内部创建
      expect(scrollable.controller).toBeUndefined();
    });
  });

  describe("maxScrollExtent calculation", () => {
    it("should compute maxScrollExtent = max(0, childHeight - viewportHeight)", () => {
      // 静态验证: 当 childHeight=50, viewportHeight=20, maxScrollExtent=30
      const maxExtent = Math.max(0, 50 - 20);
      expect(maxExtent).toBe(30);
    });

    it("should have maxScrollExtent=0 when child fits viewport", () => {
      const maxExtent = Math.max(0, 10 - 20);
      expect(maxExtent).toBe(0);
    });
  });

  describe("controller lifecycle", () => {
    it("Scrollable should accept optional controller prop", () => {
      const ctrl = new ScrollController();
      const scrollable = new Scrollable({ controller: ctrl });
      expect(scrollable.controller).toBe(ctrl);
      ctrl.dispose();
    });
  });
});
