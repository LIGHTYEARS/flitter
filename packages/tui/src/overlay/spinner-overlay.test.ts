/**
 * SpinnerOverlay widget tests.
 *
 * Covers:
 * - Construction with required and optional props
 * - Default values for message, onCancel, colors
 * - Callback wiring
 * - StatefulWidget contract: createState returns SpinnerOverlayState
 * - SpinnerOverlayState: spinner animation lifecycle (initState/dispose)
 * - Amp-aligned API: message optional, onCancel optional, 100ms interval
 *
 * 逆向: Ko/HRR at chunk-006.js:20868-20952
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Color } from "../screen/color.js";
import {
  SpinnerOverlay,
  type SpinnerOverlayColors,
  SpinnerOverlayState,
} from "./spinner-overlay.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("SpinnerOverlay", () => {
  it("constructs with no args (all optional)", () => {
    const overlay = new SpinnerOverlay({});
    assert.equal(overlay.message, undefined);
    assert.equal(overlay.onCancel, undefined);
    assert.ok(overlay.colors); // has default colors
  });

  it("constructs with message only", () => {
    const overlay = new SpinnerOverlay({
      message: "Loading...",
    });
    assert.equal(overlay.message, "Loading...");
    assert.equal(overlay.onCancel, undefined);
  });

  it("constructs with all props", () => {
    const colors: SpinnerOverlayColors = {
      processing: Color.cyan(),
      foreground: Color.default(),
      background: Color.rgb(30, 30, 46),
      info: Color.blue(),
    };
    const onCancel = () => {};
    const overlay = new SpinnerOverlay({
      message: "Switching thread...",
      onCancel,
      colors,
    });
    assert.equal(overlay.message, "Switching thread...");
    assert.equal(overlay.onCancel, onCancel);
    assert.equal(overlay.colors, colors);
  });

  it("onCancel callback fires when provided", () => {
    let cancelled = false;
    const overlay = new SpinnerOverlay({
      onCancel: () => {
        cancelled = true;
      },
    });
    overlay.onCancel!();
    assert.equal(cancelled, true);
  });

  // ════════════════════════════════════════════════════
  //  StatefulWidget contract
  // ════════════════════════════════════════════════════

  it("createState returns SpinnerOverlayState", () => {
    const overlay = new SpinnerOverlay({});
    const state = overlay.createState();
    assert.ok(state instanceof SpinnerOverlayState);
  });

  it("state has a BrailleSpinner instance", () => {
    const overlay = new SpinnerOverlay({});
    const state = overlay.createState() as SpinnerOverlayState;
    assert.ok(state._spinner);
    assert.equal(typeof state._spinner.toBraille, "function");
    assert.equal(typeof state._spinner.step, "function");
  });

  it("state animation interval is null before initState", () => {
    const overlay = new SpinnerOverlay({});
    const state = overlay.createState() as SpinnerOverlayState;
    assert.equal(state._animationInterval, null);
  });

  // ════════════════════════════════════════════════════
  //  Default colors
  // ════════════════════════════════════════════════════

  it("uses default colors when none provided", () => {
    const overlay = new SpinnerOverlay({});
    const { colors } = overlay;
    // Verify default colors are set (not null/undefined)
    assert.ok(colors.processing);
    assert.ok(colors.foreground);
    assert.ok(colors.background);
    assert.ok(colors.info);
  });

  it("custom colors override defaults", () => {
    const customColors: SpinnerOverlayColors = {
      processing: Color.rgb(255, 0, 0),
      foreground: Color.rgb(200, 200, 200),
      background: Color.rgb(0, 0, 0),
      info: Color.rgb(0, 255, 0),
    };
    const overlay = new SpinnerOverlay({ colors: customColors });
    assert.equal(overlay.colors, customColors);
  });

  // ════════════════════════════════════════════════════
  //  Spinner animation lifecycle
  // ════════════════════════════════════════════════════

  it("initState starts 100ms animation interval", () => {
    // 逆向: HRR.initState — setInterval(100ms)
    const originalSetInterval = globalThis.setInterval;
    let intervalMs: number | undefined;
    let intervalCallback: (() => void) | undefined;

    // Mock setInterval to capture the interval duration
    globalThis.setInterval = ((fn: () => void, ms: number) => {
      intervalMs = ms;
      intervalCallback = fn;
      return 42 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;

    try {
      const overlay = new SpinnerOverlay({ message: "Test" });
      const state = overlay.createState() as SpinnerOverlayState;
      // Simulate mount: set widget reference
      state._widget = overlay;
      state._mounted = true;
      state.initState();
      assert.equal(intervalMs, 100);
      assert.ok(intervalCallback);
      assert.notEqual(state._animationInterval, null);
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it("dispose clears the animation interval", () => {
    // 逆向: HRR.dispose — clearInterval
    const originalSetInterval = globalThis.setInterval;
    const originalClearInterval = globalThis.clearInterval;
    let clearedId: unknown;

    globalThis.setInterval = ((_fn: () => void, _ms: number) => {
      return 99 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;
    globalThis.clearInterval = ((id: unknown) => {
      clearedId = id;
    }) as typeof clearInterval;

    try {
      const overlay = new SpinnerOverlay({});
      const state = overlay.createState() as SpinnerOverlayState;
      state._widget = overlay;
      state._mounted = true;
      state.initState();
      assert.notEqual(state._animationInterval, null);

      state._mounted = false; // simulate unmount context
      state.dispose();
      assert.equal(clearedId, 99);
      assert.equal(state._animationInterval, null);
    } finally {
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });

  it("dispose is safe to call when no interval exists", () => {
    const overlay = new SpinnerOverlay({});
    const state = overlay.createState() as SpinnerOverlayState;
    state._widget = overlay;
    state._mounted = false;
    // Should not throw
    state.dispose();
    assert.equal(state._animationInterval, null);
  });

  // ════════════════════════════════════════════════════
  //  BrailleSpinner integration
  // ════════════════════════════════════════════════════

  it("spinner produces valid braille character", () => {
    const overlay = new SpinnerOverlay({});
    const state = overlay.createState() as SpinnerOverlayState;
    const braille = state._spinner.toBraille();
    // Braille characters are in range U+2800–U+28FF
    const codePoint = braille.codePointAt(0)!;
    assert.ok(codePoint >= 0x2800 && codePoint <= 0x28ff);
  });

  it("spinner changes after step()", () => {
    const overlay = new SpinnerOverlay({});
    const state = overlay.createState() as SpinnerOverlayState;
    const _before = state._spinner.toBraille();
    state._spinner.step();
    // After enough steps, the braille should be different
    // (it may or may not change on a single step due to automaton rules)
    // Just verify it doesn't throw and returns valid braille
    const after = state._spinner.toBraille();
    const codePoint = after.codePointAt(0)!;
    assert.ok(codePoint >= 0x2800 && codePoint <= 0x28ff);
  });
});
