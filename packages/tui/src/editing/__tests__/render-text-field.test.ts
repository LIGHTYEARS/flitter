import { describe, expect, it } from "bun:test";
import { Color } from "../../screen/color.js";
import { Screen } from "../../screen/screen.js";
import { BoxConstraints } from "../../tree/constraints.js";
import { RenderTextField } from "../render-text-field.js";
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

  it("soft-wraps when text exceeds width and wrapMode is char", () => {
    const ctrl = new TextEditingController({ text: "abcde", width: 3 });
    ctrl.updateLayoutConfig(3, "char");
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

describe("RenderTextField layout", () => {
  it("intrinsic width: min=1, max=longest line length", () => {
    const ctrl = new TextEditingController({ text: "hi\nlonger", width: 80 });
    const rf = new RenderTextField({
      controller: ctrl,
      focused: false,
      enabled: true,
      readOnly: false,
      minLines: 1,
      maxLines: null,
    });
    expect(rf.getMinIntrinsicWidth(0)).toBe(1);
    expect(rf.getMaxIntrinsicWidth(0)).toBe(6); // "longer" = 6
  });

  it("intrinsic height clamps to [minLines, maxLines]", () => {
    const ctrl = new TextEditingController({ text: "a\nb\nc", width: 80 });
    const rf = new RenderTextField({
      controller: ctrl,
      focused: false,
      enabled: true,
      readOnly: false,
      minLines: 2,
      maxLines: 2,
    });
    expect(rf.getMinIntrinsicHeight(80)).toBe(2);
    expect(rf.getMaxIntrinsicHeight(80)).toBe(2);
  });

  it("height = total lines when maxLines is null", () => {
    const ctrl = new TextEditingController({ text: "a\nb\nc", width: 80 });
    const rf = new RenderTextField({
      controller: ctrl,
      focused: false,
      enabled: true,
      readOnly: false,
      minLines: 1,
      maxLines: null,
    });
    expect(rf.getMinIntrinsicHeight(80)).toBe(3);
  });
});

describe("RenderTextField cursor fallback colors", () => {
  it("uses concrete (non-default) colors for cursor when no explicit colors are set", () => {
    // 逆向: L1T.paint passes textColor ?? LT.white, backgroundColor ?? LT.black to _paintSoftwareCursor
    // (actions_intents.js:1675). When both fg and bg are Color.default(), the manual
    // fg↔bg swap is a no-op → invisible cursor. This test guards against that regression.
    const ctrl = new TextEditingController({ text: "hello", width: 20 });
    ctrl.cursorPosition = 0; // cursor at 'h'

    const rf = new RenderTextField({
      controller: ctrl,
      focused: true,
      enabled: true,
      readOnly: false,
      minLines: 1,
      maxLines: 1,
      // No cursorColor, no backgroundColor, no textStyle — all default
    });

    rf.layout(new BoxConstraints({ minWidth: 20, maxWidth: 20, minHeight: 1, maxHeight: 1 }));

    const screen = new Screen(20, 1);
    rf.paint(screen, 0, 0);

    // Read the cell at cursor position (0, 0)
    const cursorCell = screen.back.getCell(0, 0);
    expect(cursorCell.char).toBe("h");

    // Both fg and bg must NOT be "default" — the cursor must be visible
    expect(cursorCell.style.foreground.kind).not.toBe("default");
    expect(cursorCell.style.background.kind).not.toBe("default");

    // Specifically: fg should be black (backgroundColor fallback), bg should be white (cursorColor fallback)
    // This matches amp's behavior: textColor ?? white, backgroundColor ?? black, with reverse
    expect(cursorCell.style.foreground.kind).toBe("named");
    expect(cursorCell.style.foreground.index).toBe(0); // black
    expect(cursorCell.style.background.kind).toBe("named");
    expect(cursorCell.style.background.index).toBe(7); // white
  });

  it("uses explicit cursorColor when provided (no fallback needed)", () => {
    const ctrl = new TextEditingController({ text: "hi", width: 20 });
    ctrl.cursorPosition = 0;

    const rf = new RenderTextField({
      controller: ctrl,
      focused: true,
      enabled: true,
      readOnly: false,
      minLines: 1,
      maxLines: 1,
      cursorColor: Color.green(),
      backgroundColor: Color.blue(),
    });

    rf.layout(new BoxConstraints({ minWidth: 20, maxWidth: 20, minHeight: 1, maxHeight: 1 }));

    const screen = new Screen(20, 1);
    rf.paint(screen, 0, 0);

    const cursorCell = screen.back.getCell(0, 0);
    // fg = backgroundColor (blue), bg = cursorColor (green) — manual reverse
    expect(cursorCell.style.foreground.index).toBe(Color.blue().index);
    expect(cursorCell.style.background.index).toBe(Color.green().index);
  });
});
