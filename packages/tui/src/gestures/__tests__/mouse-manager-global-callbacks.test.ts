import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { RenderBox } from "../../tree/render-box.js";
import type { MouseEvent as TermMouseEvent } from "../../vt/types.js";
import { MouseManager } from "../mouse-manager.js";

// ════════════════════════════════════════════════════
//  测试用 RenderBox 子类
// ════════════════════════════════════════════════════

class TestRenderBox extends RenderBox {
  performLayout(): void {
    // no-op for testing
  }

  setTestBounds(size: { width: number; height: number }, offset: { x: number; y: number }): void {
    this._size = size;
    this._offset = offset;
  }
}

// ════════════════════════════════════════════════════
//  工具函数
// ════════════════════════════════════════════════════

function createMouseEvent(
  x: number,
  y: number,
  action: "press" | "release" | "move" = "press",
  button: "left" | "right" | "middle" | "none" = "left",
): TermMouseEvent {
  return {
    type: "mouse",
    x,
    y,
    button,
    action,
    modifiers: { shift: false, ctrl: false, alt: false, meta: false },
  };
}

function createRoot(): TestRenderBox {
  const root = new TestRenderBox();
  root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
  return root;
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("MouseManager global callbacks", () => {
  let mm: MouseManager;

  beforeEach(() => {
    mm = MouseManager.instance;
  });

  afterEach(() => {
    mm.dispose();
  });

  describe("global release callbacks", () => {
    it("fires registered release callback on mouse release", () => {
      let called = false;
      const cb = () => {
        called = true;
      };
      mm.addGlobalReleaseCallback(cb);
      mm.setRootRenderObject(createRoot());

      mm.handleMouseEvent(createMouseEvent(5, 5, "press"));
      mm.handleMouseEvent(createMouseEvent(5, 5, "release"));

      expect(called).toBe(true);
    });

    it("does not fire after removeGlobalReleaseCallback", () => {
      let callCount = 0;
      const cb = () => {
        callCount++;
      };
      mm.addGlobalReleaseCallback(cb);
      mm.removeGlobalReleaseCallback(cb);
      mm.setRootRenderObject(createRoot());

      mm.handleMouseEvent(createMouseEvent(5, 5, "release"));

      expect(callCount).toBe(0);
    });

    it("release callbacks receive no arguments", () => {
      let argCount = -1;
      const cb = (...args: unknown[]) => {
        argCount = args.length;
      };
      mm.addGlobalReleaseCallback(cb as () => void);
      mm.setRootRenderObject(createRoot());

      mm.handleMouseEvent(createMouseEvent(5, 5, "release"));

      expect(argCount).toBe(0);
    });
  });

  describe("dispose clears global callbacks", () => {
    it("clears both callback sets on dispose", () => {
      let releaseCalled = false;
      let clickCalled = false;
      mm.addGlobalReleaseCallback(() => {
        releaseCalled = true;
      });
      mm.addGlobalClickCallback(() => {
        clickCalled = true;
      });

      mm.dispose();

      mm = MouseManager.instance;
      mm.setRootRenderObject(createRoot());

      mm.handleMouseEvent(createMouseEvent(5, 5, "press"));
      mm.handleMouseEvent(createMouseEvent(5, 5, "release"));

      expect(releaseCalled).toBe(false);
      expect(clickCalled).toBe(false);
    });
  });
});
