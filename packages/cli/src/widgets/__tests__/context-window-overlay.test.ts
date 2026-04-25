import { describe, expect, it } from "bun:test";
import {
  type ContextWindowData,
  ContextWindowOverlay,
  type ContextWindowOverlayConfig,
  ContextWindowOverlayState,
  formatCompact,
} from "../context-window-overlay.js";

// ════════════════════════════════════════════════════
//  Helper factories
// ════════════════════════════════════════════════════

function makeData(overrides: Partial<ContextWindowData> = {}): ContextWindowData {
  return {
    usedTokens: 50_000,
    maxTokens: 200_000,
    usedPercent: 25,
    ...overrides,
  };
}

function makeConfig(
  overrides: Partial<ContextWindowOverlayConfig> = {},
): ContextWindowOverlayConfig {
  return {
    data: makeData(),
    onDismiss: () => {},
    ...overrides,
  };
}

// ════════════════════════════════════════════════════
//  formatCompact tests
// ════════════════════════════════════════════════════

describe("formatCompact", () => {
  it("formats millions with M suffix", () => {
    expect(formatCompact(1_500_000)).toBe("2M");
    expect(formatCompact(1_000_000)).toBe("1M");
    expect(formatCompact(10_000_000)).toBe("10M");
  });

  it("formats thousands with k suffix", () => {
    expect(formatCompact(1_000)).toBe("1k");
    expect(formatCompact(50_000)).toBe("50k");
    expect(formatCompact(999_999)).toBe("1000k");
  });

  it("returns plain number for values under 1000", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(500)).toBe("500");
  });
});

// ════════════════════════════════════════════════════
//  ContextWindowOverlay widget tests
// ════════════════════════════════════════════════════

describe("ContextWindowOverlay", () => {
  it("creates with data and onDismiss", () => {
    const widget = new ContextWindowOverlay(makeConfig());
    expect(widget).toBeDefined();
    expect(widget.config.data.usedTokens).toBe(50_000);
    expect(widget.config.data.maxTokens).toBe(200_000);
  });

  it("stores onDismiss callback in config", () => {
    let dismissed = false;
    const widget = new ContextWindowOverlay(
      makeConfig({
        onDismiss: () => {
          dismissed = true;
        },
      }),
    );
    widget.config.onDismiss();
    expect(dismissed).toBe(true);
  });

  it("stores onOpenBreakdown callback in config", () => {
    let opened = false;
    const widget = new ContextWindowOverlay(
      makeConfig({
        onOpenBreakdown: () => {
          opened = true;
        },
      }),
    );
    widget.config.onOpenBreakdown!();
    expect(opened).toBe(true);
  });

  it("is a StatefulWidget with createState", () => {
    const widget = new ContextWindowOverlay(makeConfig());
    const state = widget.createState();
    expect(state).toBeDefined();
    expect(state).toBeInstanceOf(ContextWindowOverlayState);
  });

  it("config stores optional fields when provided", () => {
    const data = makeData({
      cachedTokens: 10_000,
      cacheCreation: 5_000,
      threadCost: 0.05,
      totalCost: 1.23,
      remainingUsd: 8.77,
      limitUsd: 10,
      usagePercent: 12.3,
      resetCountdown: "2h 30m",
    });
    const widget = new ContextWindowOverlay(makeConfig({ data }));
    expect(widget.config.data.cachedTokens).toBe(10_000);
    expect(widget.config.data.totalCost).toBe(1.23);
    expect(widget.config.data.resetCountdown).toBe("2h 30m");
  });

  it("handles minimal data with only required fields", () => {
    const data: ContextWindowData = {
      usedTokens: 0,
      maxTokens: 100_000,
      usedPercent: 0,
    };
    const widget = new ContextWindowOverlay(makeConfig({ data }));
    expect(widget.config.data.usedTokens).toBe(0);
    expect(widget.config.data.cachedTokens).toBeUndefined();
    expect(widget.config.data.threadCost).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════
//  ContextWindowOverlayState tests
// ════════════════════════════════════════════════════

describe("ContextWindowOverlayState", () => {
  function makeState(): ContextWindowOverlayState {
    const widget = new ContextWindowOverlay(makeConfig());
    const state = widget.createState() as ContextWindowOverlayState;
    return state;
  }

  it("initial showExact is false", () => {
    const state = makeState();
    expect(state.showExact).toBe(false);
  });

  it("formatTokens uses compact format when showExact is false", () => {
    const state = makeState();
    state.showExact = false;
    expect(state.formatTokens(50_000)).toBe("50k");
    expect(state.formatTokens(1_500_000)).toBe("2M");
    expect(state.formatTokens(500)).toBe("500");
  });

  it("formatTokens uses locale string when showExact is true", () => {
    const state = makeState();
    state.showExact = true;
    const result = state.formatTokens(50_000);
    // toLocaleString output varies by locale, but it should contain "50" and "000"
    expect(result).toContain("50");
    expect(result).toContain("000");
  });

  // ── Key handler tests ──────────────────────────

  describe("key handling", () => {
    it("Escape calls onDismiss and returns handled", () => {
      let dismissed = false;
      const widget = new ContextWindowOverlay(
        makeConfig({
          onDismiss: () => {
            dismissed = true;
          },
        }),
      );
      const state = widget.createState() as ContextWindowOverlayState;
      // Manually wire state to widget (in real framework, initState does this)
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      const result = state.handleKeyEvent({ key: "Escape" });
      expect(result).toBe("handled");
      expect(dismissed).toBe(true);
    });

    it("e toggles showExact and returns handled", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });
      let setStateCalled = false;
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {
          setStateCalled = true;
        },
        configurable: true,
      });

      expect(state.showExact).toBe(false);
      const result = state.handleKeyEvent({ key: "e" });
      expect(result).toBe("handled");
      expect(state.showExact).toBe(true);
      expect(setStateCalled).toBe(true);
    });

    it("b calls onOpenBreakdown when provided and returns handled", () => {
      let opened = false;
      const widget = new ContextWindowOverlay(
        makeConfig({
          onOpenBreakdown: () => {
            opened = true;
          },
        }),
      );
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });

      const result = state.handleKeyEvent({ key: "b" });
      expect(result).toBe("handled");
      expect(opened).toBe(true);
    });

    it("b returns ignored when onOpenBreakdown is not provided", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });

      const result = state.handleKeyEvent({ key: "b" });
      expect(result).toBe("ignored");
    });

    it("ArrowUp returns handled (scroll key)", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      const result = state.handleKeyEvent({ key: "ArrowUp" });
      expect(result).toBe("handled");
    });

    it("ArrowDown returns handled (scroll key)", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      const result = state.handleKeyEvent({ key: "ArrowDown" });
      expect(result).toBe("handled");
    });

    it("j and k return handled (vim scroll keys)", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      expect(state.handleKeyEvent({ key: "j" })).toBe("handled");
      expect(state.handleKeyEvent({ key: "k" })).toBe("handled");
    });

    it("Home and End return handled", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      expect(state.handleKeyEvent({ key: "Home" })).toBe("handled");
      expect(state.handleKeyEvent({ key: "End" })).toBe("handled");
    });

    it("PageUp and PageDown return handled", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      expect(state.handleKeyEvent({ key: "PageUp" })).toBe("handled");
      expect(state.handleKeyEvent({ key: "PageDown" })).toBe("handled");
    });

    it("unknown key returns ignored", () => {
      const widget = new ContextWindowOverlay(makeConfig());
      const state = widget.createState() as ContextWindowOverlayState;
      Object.defineProperty(state, "widget", { get: () => widget, configurable: true });

      expect(state.handleKeyEvent({ key: "x" })).toBe("ignored");
      expect(state.handleKeyEvent({ key: "Enter" })).toBe("ignored");
    });
  });

  // ── Scroll logic tests ────────────────────────

  describe("scroll logic", () => {
    it("scroll clamps to [0, maxScrollOffset]", () => {
      const state = makeState();
      state.maxScrollOffset = 100;
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      state.scroll(50);
      expect(state.scrollOffset).toBe(50);

      state.scroll(200);
      expect(state.scrollOffset).toBe(100);

      state.scroll(-200);
      expect(state.scrollOffset).toBe(0);
    });

    it("scrollToTop sets offset to 0", () => {
      const state = makeState();
      state.maxScrollOffset = 100;
      state.scrollOffset = 50;
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      state.scrollToTop();
      expect(state.scrollOffset).toBe(0);
    });

    it("scrollToBottom sets offset to maxScrollOffset", () => {
      const state = makeState();
      state.maxScrollOffset = 100;
      state.scrollOffset = 0;
      Object.defineProperty(state, "setState", {
        value: (_fn: () => void) => {},
        configurable: true,
      });

      state.scrollToBottom();
      expect(state.scrollOffset).toBe(100);
    });
  });
});
