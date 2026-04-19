/**
 * Color.toHex() tests.
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Color } from "./color.js";

describe("Color.toHex", () => {
  it("converts rgb(0, 0, 0) to #000000", () => {
    assert.equal(Color.rgb(0, 0, 0).toHex(), "#000000");
  });

  it("converts rgb(255, 255, 255) to #FFFFFF", () => {
    assert.equal(Color.rgb(255, 255, 255).toHex(), "#FFFFFF");
  });

  it("converts rgb(255, 0, 0) to #FF0000", () => {
    assert.equal(Color.rgb(255, 0, 0).toHex(), "#FF0000");
  });

  it("converts rgb(11, 13, 11) to #0B0D0B", () => {
    assert.equal(Color.rgb(11, 13, 11).toHex(), "#0B0D0B");
  });

  it("converts rgb(30, 30, 46) to #1E1E2E", () => {
    assert.equal(Color.rgb(30, 30, 46).toHex(), "#1E1E2E");
  });

  it("default color returns #FFFFFF", () => {
    assert.equal(Color.default().toHex(), "#FFFFFF");
  });

  it("named color returns #FFFFFF (best-effort)", () => {
    assert.equal(Color.red().toHex(), "#FFFFFF");
  });
});
