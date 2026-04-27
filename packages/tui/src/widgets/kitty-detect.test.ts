/**
 * supportsKittyGraphics 终端检测 - 单元测试。
 *
 * @module
 */

import { afterEach, describe, expect, it } from "bun:test";
import { supportsKittyGraphics } from "./kitty-detect.js";

describe("supportsKittyGraphics", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env.TERM_PROGRAM = originalEnv.TERM_PROGRAM;
    process.env.TERM = originalEnv.TERM;
  });

  it("returns true for TERM_PROGRAM=kitty", () => {
    process.env.TERM_PROGRAM = "kitty";
    expect(supportsKittyGraphics()).toBe(true);
  });

  it("returns true for TERM_PROGRAM=WezTerm (case-insensitive)", () => {
    process.env.TERM_PROGRAM = "WezTerm";
    expect(supportsKittyGraphics()).toBe(true);
  });

  it("returns true for TERM_PROGRAM=ghostty", () => {
    process.env.TERM_PROGRAM = "ghostty";
    expect(supportsKittyGraphics()).toBe(true);
  });

  it("returns true for TERM=xterm-kitty", () => {
    process.env.TERM_PROGRAM = "";
    process.env.TERM = "xterm-kitty";
    expect(supportsKittyGraphics()).toBe(true);
  });

  it("returns false for TERM_PROGRAM=Apple_Terminal", () => {
    process.env.TERM_PROGRAM = "Apple_Terminal";
    process.env.TERM = "xterm-256color";
    expect(supportsKittyGraphics()).toBe(false);
  });

  it("returns false when env vars are unset", () => {
    delete process.env.TERM_PROGRAM;
    delete process.env.TERM;
    expect(supportsKittyGraphics()).toBe(false);
  });
});
