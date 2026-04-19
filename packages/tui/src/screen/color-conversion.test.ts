/**
 * Color conversion utility tests — rgbToXterm256 and xterm256ToAnsi16.
 *
 * 逆向: These conversions enable color depth branching in the renderer,
 * adapting to terminal capabilities detected by QXR (modules/0080_unknown_QXR.js).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Color, rgbToXterm256, xterm256ToAnsi16 } from "./color.js";

describe("rgbToXterm256", () => {
  it("maps pure black to index 16 (cube 0,0,0)", () => {
    assert.equal(rgbToXterm256(0, 0, 0), 16);
  });

  it("maps pure white (255,255,255) to index 231 (cube 5,5,5)", () => {
    assert.equal(rgbToXterm256(255, 255, 255), 231);
  });

  it("maps pure red to index 196 (cube 5,0,0)", () => {
    assert.equal(rgbToXterm256(255, 0, 0), 196);
  });

  it("maps pure green to index 46 (cube 0,5,0)", () => {
    assert.equal(rgbToXterm256(0, 255, 0), 46);
  });

  it("maps pure blue to index 21 (cube 0,0,5)", () => {
    assert.equal(rgbToXterm256(0, 0, 255), 21);
  });

  it("maps mid-gray to grayscale ramp", () => {
    // 128,128,128 — nearest gray is 8+10*12=128 at index 232+12=244
    const idx = rgbToXterm256(128, 128, 128);
    assert.ok(idx >= 232 && idx <= 255, `Expected grayscale index, got ${idx}`);
  });

  it("returns a valid xterm-256 index (0-255)", () => {
    for (let r = 0; r <= 255; r += 85) {
      for (let g = 0; g <= 255; g += 85) {
        for (let b = 0; b <= 255; b += 85) {
          const idx = rgbToXterm256(r, g, b);
          assert.ok(idx >= 0 && idx <= 255, `Invalid index ${idx} for rgb(${r},${g},${b})`);
        }
      }
    }
  });
});

describe("xterm256ToAnsi16", () => {
  it("returns identity for indices 0-15", () => {
    for (let i = 0; i < 16; i++) {
      assert.equal(xterm256ToAnsi16(i), i);
    }
  });

  it("returns a valid 0-15 index for cube colors", () => {
    for (let i = 16; i < 232; i++) {
      const result = xterm256ToAnsi16(i);
      assert.ok(result >= 0 && result <= 15, `Invalid result ${result} for index ${i}`);
    }
  });

  it("returns a valid 0-15 index for grayscale", () => {
    for (let i = 232; i <= 255; i++) {
      const result = xterm256ToAnsi16(i);
      assert.ok(result >= 0 && result <= 15, `Invalid result ${result} for index ${i}`);
    }
  });

  it("maps dark grayscale to black or bright black", () => {
    // Index 232 = value 8, very dark → should be black (0) or bright black (8)
    const result = xterm256ToAnsi16(232);
    assert.ok(result === 0 || result === 8, `Expected black-ish, got ${result}`);
  });

  it("maps bright grayscale to white or bright white", () => {
    // Index 255 = value 238, very bright → should be white (7) or bright white (15)
    const result = xterm256ToAnsi16(255);
    assert.ok(result === 7 || result === 15, `Expected white-ish, got ${result}`);
  });
});

describe("Color.toAnsiAt", () => {
  it("default color is always 39/49 regardless of depth", () => {
    const c = Color.default();
    assert.equal(c.toAnsiAt(true, "16"), "39");
    assert.equal(c.toAnsiAt(false, "256"), "49");
    assert.equal(c.toAnsiAt(true, "truecolor"), "39");
  });

  it("named colors are unchanged at all depths", () => {
    const c = Color.red();
    assert.equal(c.toAnsiAt(true, "16"), "31");
    assert.equal(c.toAnsiAt(true, "256"), "31");
    assert.equal(c.toAnsiAt(true, "truecolor"), "31");
  });

  it("rgb color emits 38;2;R;G;B at truecolor depth", () => {
    const c = Color.rgb(100, 200, 50);
    assert.equal(c.toAnsiAt(true, "truecolor"), "38;2;100;200;50");
  });

  it("rgb color emits 38;5;N at 256-color depth", () => {
    const c = Color.rgb(255, 0, 0);
    const result = c.toAnsiAt(true, "256");
    assert.ok(result.startsWith("38;5;"), `Expected 38;5;N, got ${result}`);
  });

  it("rgb color emits 3N or 9N at 16-color depth", () => {
    const c = Color.rgb(255, 0, 0);
    const result = c.toAnsiAt(true, "16");
    // Should be a basic SGR code (30-37 or 90-97)
    const num = parseInt(result, 10);
    assert.ok(
      (num >= 30 && num <= 37) || (num >= 90 && num <= 97),
      `Expected 3N or 9N, got ${result}`,
    );
  });

  it("indexed color at 16-depth is downgraded to named", () => {
    const c = Color.indexed(196); // bright red in 256 palette
    const result = c.toAnsiAt(true, "16");
    const num = parseInt(result, 10);
    assert.ok(
      (num >= 30 && num <= 37) || (num >= 90 && num <= 97),
      `Expected 3N or 9N, got ${result}`,
    );
  });

  it("indexed color at 256/truecolor depth keeps 38;5;N format", () => {
    const c = Color.indexed(128);
    assert.equal(c.toAnsiAt(true, "256"), "38;5;128");
    assert.equal(c.toAnsiAt(true, "truecolor"), "38;5;128");
  });
});

describe("AnsiRenderer color depth branching", () => {
  // Integration: verify that the renderer uses color depth
  it("renderer emits 38;5;N for rgb colors at 256-depth", async () => {
    // Dynamically import to avoid issues
    const { AnsiRenderer } = await import("./ansi-renderer.js");
    const { Screen } = await import("./screen.js");

    const screen = new Screen(10, 2);
    const renderer = new AnsiRenderer();
    renderer.setColorDepth("256");

    const { TextStyle } = await import("./text-style.js");
    const style = new TextStyle({ foreground: Color.rgb(255, 0, 0) });
    screen.writeChar(0, 0, "X", style);

    const output = renderer.renderFull(screen);
    // Should contain 38;5; format, NOT 38;2;
    assert.ok(output.includes("38;5;"), `Expected 38;5 in output, got: ${JSON.stringify(output)}`);
    assert.ok(!output.includes("38;2;"), `Should NOT contain 38;2 at 256 depth`);
  });

  it("renderer emits named color codes for rgb colors at 16-depth", async () => {
    const { AnsiRenderer } = await import("./ansi-renderer.js");
    const { Screen } = await import("./screen.js");

    const screen = new Screen(10, 2);
    const renderer = new AnsiRenderer();
    renderer.setColorDepth("16");

    const { TextStyle } = await import("./text-style.js");
    const style = new TextStyle({ foreground: Color.rgb(255, 0, 0) });
    screen.writeChar(0, 0, "X", style);

    const output = renderer.renderFull(screen);
    // Should NOT contain 38;2; or 38;5;
    assert.ok(!output.includes("38;2;"), `Should NOT contain 38;2 at 16 depth`);
    assert.ok(!output.includes("38;5;"), `Should NOT contain 38;5 at 16 depth`);
  });
});
