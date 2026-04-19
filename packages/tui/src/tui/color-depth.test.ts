/**
 * Color depth detection tests.
 *
 * 逆向: QXR in modules/0080_unknown_QXR.js
 * Tests the detectColorDepth function against amp's detection logic.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectColorDepth } from "./tui-controller.js";

describe("detectColorDepth", () => {
  // 逆向: QXR line 37 — COLORTERM === "truecolor" → level 3
  it("returns truecolor when COLORTERM=truecolor", () => {
    assert.equal(detectColorDepth({ COLORTERM: "truecolor" }), "truecolor");
  });

  it("returns truecolor when COLORTERM=24bit", () => {
    assert.equal(detectColorDepth({ COLORTERM: "24bit" }), "truecolor");
  });

  // 逆向: QXR line 38 — TERM === "xterm-kitty" → level 3
  it("returns truecolor when TERM=xterm-kitty", () => {
    assert.equal(detectColorDepth({ TERM: "xterm-kitty" }), "truecolor");
  });

  // 逆向: QXR line 39-46 — TERM_PROGRAM checks
  it("returns truecolor for iTerm.app v3+", () => {
    assert.equal(
      detectColorDepth({ TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "3.2.0" }),
      "truecolor",
    );
    assert.equal(
      detectColorDepth({ TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "4.0.0" }),
      "truecolor",
    );
  });

  it("returns 256 for iTerm.app v2", () => {
    assert.equal(
      detectColorDepth({ TERM_PROGRAM: "iTerm.app", TERM_PROGRAM_VERSION: "2.9.3" }),
      "256",
    );
  });

  it("returns 256 for Apple_Terminal", () => {
    assert.equal(
      detectColorDepth({ TERM_PROGRAM: "Apple_Terminal" }),
      "256",
    );
  });

  // 逆向: QXR line 48 — TERM containing 256color → level 2
  it("returns 256 when TERM contains 256color", () => {
    assert.equal(detectColorDepth({ TERM: "xterm-256color" }), "256");
    assert.equal(detectColorDepth({ TERM: "screen-256color" }), "256");
  });

  // 逆向: QXR line 49 — common TERM values → level 1
  it("returns 16 for xterm", () => {
    assert.equal(detectColorDepth({ TERM: "xterm" }), "16");
  });

  it("returns 16 for screen", () => {
    assert.equal(detectColorDepth({ TERM: "screen" }), "16");
  });

  it("returns 16 for linux", () => {
    assert.equal(detectColorDepth({ TERM: "linux" }), "16");
  });

  it("returns 16 for vt100", () => {
    assert.equal(detectColorDepth({ TERM: "vt100" }), "16");
  });

  // 逆向: QXR line 50 — COLORTERM present (any value) → level 1
  it("returns 16 when COLORTERM is present but not truecolor/24bit", () => {
    assert.equal(detectColorDepth({ COLORTERM: "yes" }), "16");
    assert.equal(detectColorDepth({ COLORTERM: "" }), "16");
  });

  // Fallback
  it("returns 16 with empty env", () => {
    assert.equal(detectColorDepth({}), "16");
  });

  // Priority: COLORTERM=truecolor overrides TERM
  it("COLORTERM=truecolor takes priority over TERM=xterm", () => {
    assert.equal(
      detectColorDepth({ COLORTERM: "truecolor", TERM: "xterm" }),
      "truecolor",
    );
  });
});
