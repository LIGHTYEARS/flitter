import { describe, expect, it } from "bun:test";
import { TextEditingController } from "../text-editing-controller.js";

describe("TextEditingController.getLayoutLines()", () => {
  it("returns one line for simple text with no wrap", () => {
    const ctrl = new TextEditingController({ text: "hello", width: 80 });
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.startOffset).toBe(0);
    expect(lines[0]!.endOffset).toBe(5);
    expect(lines[0]!.isHardBreak).toBe(false);
  });

  it("returns two lines on hard newline", () => {
    const ctrl = new TextEditingController({ text: "ab\ncd", width: 80 });
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]!.endOffset).toBe(2); // "ab" (not including \n)
    expect(lines[0]!.isHardBreak).toBe(true);
    expect(lines[1]!.startOffset).toBe(3);
  });

  it("soft-wraps when text exceeds width", () => {
    const ctrl = new TextEditingController({ text: "abcde", width: 3 });
    const lines = ctrl.getLayoutLines();
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]!.endOffset).toBe(3);
    expect(lines[0]!.isHardBreak).toBe(false);
  });
});

describe("TextEditingController.getLayoutColumnFromOffset()", () => {
  it("returns display column 0 at line start", () => {
    const ctrl = new TextEditingController({ text: "hello", width: 80 });
    expect(ctrl.getLayoutColumnFromOffset(0)).toBe(0);
  });

  it("returns display column 3 for ASCII at offset 3", () => {
    const ctrl = new TextEditingController({ text: "hello", width: 80 });
    expect(ctrl.getLayoutColumnFromOffset(3)).toBe(3);
  });

  it("returns display column 2 for CJK char (width=2)", () => {
    const ctrl = new TextEditingController({ text: "你好", width: 80 });
    // offset 1 = after first CJK char (width 2) → display column 2
    expect(ctrl.getLayoutColumnFromOffset(1)).toBe(2);
  });
});
