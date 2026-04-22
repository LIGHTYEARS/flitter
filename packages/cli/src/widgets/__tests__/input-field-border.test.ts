import { describe, expect, it } from "bun:test";

describe("InputField border rendering", () => {
  it("should use rounded corner characters", async () => {
    const src = await Bun.file("packages/cli/src/widgets/input-field.ts").text();
    expect(src).toContain("\u256D"); // ╭ top-left
    expect(src).toContain("\u256E"); // ╮ top-right
    expect(src).toContain("\u2570"); // ╰ bottom-left
    expect(src).toContain("\u256F"); // ╯ bottom-right
    expect(src).not.toContain("\u250C"); // ┌ old square
    expect(src).not.toContain("\u2510"); // ┐ old square
    expect(src).not.toContain("\u2514"); // └ old square
    expect(src).not.toContain("\u2518"); // ┘ old square
  });

  it("should have fixed 3-row content height", async () => {
    const src = await Bun.file("packages/cli/src/widgets/input-field.ts").text();
    expect(src).not.toMatch(/Math\.min\(5/);
    expect(src).toMatch(/height:\s*3/);
  });

  it("should accept overlay text config", async () => {
    const src = await Bun.file("packages/cli/src/widgets/input-field.ts").text();
    expect(src).toMatch(/topLeftLabel|topRightLabel|bottomRightLabel/);
  });
});
