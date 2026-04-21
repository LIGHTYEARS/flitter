import { afterEach, describe, expect, it } from "bun:test";
import {
  _resetTrackingState,
  getIsIdle,
  getTerminalFocused,
  initFocusTracking,
  initIdleTracking,
} from "../tui/terminal-tracking.js";

/** Minimal TuiController stub for testing */
function createMockTui() {
  const focusHandlers: ((event: { type: "focus"; focused: boolean }) => void)[] = [];
  const keyHandlers: (() => void)[] = [];
  const mouseHandlers: (() => void)[] = [];

  return {
    onFocus(handler: (event: { type: "focus"; focused: boolean }) => void) {
      focusHandlers.push(handler);
    },
    onKey(handler: () => void) {
      keyHandlers.push(handler);
    },
    onMouse(handler: () => void) {
      mouseHandlers.push(handler);
    },
    emitFocus(focused: boolean) {
      for (const h of focusHandlers) h({ type: "focus", focused });
    },
    emitKey() {
      for (const h of keyHandlers) h();
    },
    emitMouse() {
      for (const h of mouseHandlers) h();
    },
  };
}

describe("terminal-tracking", () => {
  afterEach(() => {
    _resetTrackingState();
  });

  describe("initFocusTracking", () => {
    it("defaults to focused=true", () => {
      expect(getTerminalFocused()).toBe(true);
    });

    it("tracks focus in events", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initFocusTracking(tui);

      tui.emitFocus(false);
      expect(getTerminalFocused()).toBe(false);

      tui.emitFocus(true);
      expect(getTerminalFocused()).toBe(true);
    });

    it("tracks focus out events", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initFocusTracking(tui);

      tui.emitFocus(false);
      expect(getTerminalFocused()).toBe(false);
    });
  });

  describe("initIdleTracking", () => {
    it("not idle immediately after init", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initIdleTracking(tui, 100);

      expect(getIsIdle()).toBe(false);
    });

    it("becomes idle after threshold", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      // Use a very short threshold for testing
      initIdleTracking(tui, 1);

      // Wait a tiny bit past threshold
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }
      expect(getIsIdle()).toBe(true);
    });

    it("key event resets idle timer", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initIdleTracking(tui, 1);

      // Wait past threshold
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }
      expect(getIsIdle()).toBe(true);

      // Key event resets
      tui.emitKey();
      expect(getIsIdle()).toBe(false);
    });

    it("mouse event resets idle timer", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initIdleTracking(tui, 1);

      // Wait past threshold
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }
      expect(getIsIdle()).toBe(true);

      // Mouse event resets
      tui.emitMouse();
      expect(getIsIdle()).toBe(false);
    });

    it("uses default 5-minute threshold", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initIdleTracking(tui);

      // Should not be idle with default 5min threshold
      expect(getIsIdle()).toBe(false);
    });
  });

  describe("_resetTrackingState", () => {
    it("resets focus to true", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initFocusTracking(tui);
      tui.emitFocus(false);
      expect(getTerminalFocused()).toBe(false);

      _resetTrackingState();
      expect(getTerminalFocused()).toBe(true);
    });

    it("resets idle state", () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      const tui = createMockTui() as any;
      initIdleTracking(tui, 1);

      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }
      expect(getIsIdle()).toBe(true);

      _resetTrackingState();
      expect(getIsIdle()).toBe(false);
    });
  });
});
