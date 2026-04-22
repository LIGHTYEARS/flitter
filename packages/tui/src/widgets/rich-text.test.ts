/**
 * RenderParagraph textAlign / overflow / maxLines / intrinsic sizes 单元测试。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/rich-text.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderParagraph, RichText } from "./rich-text.js";
import { TextSpan } from "./text-span.js";

// ════════════════════════════════════════════════════
//  RenderParagraph — textAlign (amp t1T alignment)
// ════════════════════════════════════════════════════

describe("RenderParagraph — textAlign (amp t1T alignment)", () => {
  it("center alignment offsets text to the center of the line", () => {
    const span = new TextSpan({ text: "Hi" }); // width=2
    const rp = new RenderParagraph(span, { textAlign: "center" });
    rp.layout(BoxConstraints.tight(10, 3));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    // "Hi" is 2 wide in a 10-wide box → offset = floor((10-2)/2) = 4
    const cell0 = screen.getCell(4, 0);
    assert.equal(cell0.char, "H");
  });

  it("right alignment offsets text to the right edge", () => {
    const span = new TextSpan({ text: "Hi" }); // width=2
    const rp = new RenderParagraph(span, { textAlign: "right" });
    rp.layout(BoxConstraints.tight(10, 3));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    // "Hi" is 2 wide in a 10-wide box → offset = 10-2 = 8
    const cell0 = screen.getCell(8, 0);
    assert.equal(cell0.char, "H");
  });

  it("left alignment (default) paints at offset 0", () => {
    const span = new TextSpan({ text: "Hi" });
    const rp = new RenderParagraph(span, { textAlign: "left" });
    rp.layout(BoxConstraints.tight(10, 3));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    const cell0 = screen.getCell(0, 0);
    assert.equal(cell0.char, "H");
  });
});

// ════════════════════════════════════════════════════
//  RenderParagraph — maxLines + overflow (amp t1T alignment)
// ════════════════════════════════════════════════════

describe("RenderParagraph — maxLines + overflow (amp t1T alignment)", () => {
  it("maxLines truncates visible lines", () => {
    const span = new TextSpan({ text: "abcde fghij klmno" });
    const rp = new RenderParagraph(span, { maxLines: 2 });
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 6, minHeight: 0, maxHeight: 100 }));

    assert.equal(rp.size.height, 2, "height should be capped at maxLines");
  });

  it("overflow ellipsis appends '…' on last visible line", () => {
    const span = new TextSpan({ text: "abcde fghij klmno" });
    const rp = new RenderParagraph(span, { maxLines: 2, overflow: "ellipsis" });
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 6, minHeight: 0, maxHeight: 100 }));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    // Last visible line (line 1) should end with "…"
    const lastChar = screen.getCell(5, 1);
    assert.equal(lastChar.char, "…");
  });

  it("overflow clip does not append ellipsis", () => {
    const span = new TextSpan({ text: "abcde fghij klmno" });
    const rp = new RenderParagraph(span, { maxLines: 2, overflow: "clip" });
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 6, minHeight: 0, maxHeight: 100 }));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    // Last visible line should NOT have ellipsis char
    const lastChar = screen.getCell(5, 1);
    assert.notEqual(lastChar.char, "…");
  });

  it("no maxLines: all lines rendered", () => {
    const span = new TextSpan({ text: "abcde fghij klmno" });
    const rp = new RenderParagraph(span);
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 6, minHeight: 0, maxHeight: 100 }));

    // Without maxLines, should have 3 lines
    assert.equal(rp.size.height, 3);
  });
});

// ════════════════════════════════════════════════════
//  RenderParagraph — intrinsic sizes (amp t1T alignment)
// ════════════════════════════════════════════════════

describe("RenderParagraph — intrinsic sizes (amp t1T alignment)", () => {
  it("getMaxIntrinsicWidth returns total single-line width", () => {
    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    assert.equal(rp.getMaxIntrinsicWidth(Infinity), 11);
  });

  it("getMinIntrinsicWidth returns widest word", () => {
    const span = new TextSpan({ text: "Hi There" });
    const rp = new RenderParagraph(span);
    assert.equal(rp.getMinIntrinsicWidth(Infinity), 5);
  });

  it("getMinIntrinsicHeight returns wrapped line count", () => {
    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    assert.equal(rp.getMinIntrinsicHeight(6), 2);
  });

  it("getMaxIntrinsicHeight equals minIntrinsicHeight for text", () => {
    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    assert.equal(rp.getMaxIntrinsicHeight(6), rp.getMinIntrinsicHeight(6));
  });

  it("getMinIntrinsicHeight respects maxLines", () => {
    const span = new TextSpan({ text: "a b c d e f" });
    const rp = new RenderParagraph(span, { maxLines: 2 });
    assert.equal(rp.getMinIntrinsicHeight(2), 2);
  });
});

// ════════════════════════════════════════════════════
//  RichText — propagates textAlign / overflow / maxLines
// ════════════════════════════════════════════════════

describe("RichText — propagates textAlign / overflow / maxLines", () => {
  it("createRenderObject passes textAlign to RenderParagraph", () => {
    const richText = new RichText({
      text: new TextSpan({ text: "Hi" }),
      textAlign: "center",
    });
    const ro = richText.createRenderObject() as RenderParagraph;
    assert.equal(ro.textAlign, "center");
  });

  it("updateRenderObject propagates overflow and maxLines", () => {
    const richText1 = new RichText({
      text: new TextSpan({ text: "old" }),
      overflow: "clip",
      maxLines: 5,
    });
    const ro = richText1.createRenderObject() as RenderParagraph;

    const richText2 = new RichText({
      text: new TextSpan({ text: "new" }),
      overflow: "ellipsis",
      maxLines: 2,
    });
    richText2.updateRenderObject(ro);
    assert.equal(ro.overflow, "ellipsis");
    assert.equal(ro.maxLines, 2);
  });
});

// ════════════════════════════════════════════════════
//  RenderParagraph — newline hard breaks (amp Kw alignment)
// ════════════════════════════════════════════════════

describe("RenderParagraph — newline hard breaks (amp Kw alignment)", () => {
  it("\\n creates a hard line break", () => {
    const span = new TextSpan({ text: "Hello\nWorld" });
    const rp = new RenderParagraph(span);
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 100 }));

    // Should produce 2 lines: "Hello" and "World"
    assert.equal(rp.size.height, 2);

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);
    assert.equal(screen.getCell(0, 0).char, "H");
    assert.equal(screen.getCell(0, 1).char, "W");
  });

  it("\\n\\n creates a blank line between paragraphs", () => {
    const span = new TextSpan({ text: "Para1\n\nPara2" });
    const rp = new RenderParagraph(span);
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 100 }));

    // Should produce 3 lines: "Para1", "" (empty), "Para2"
    assert.equal(rp.size.height, 3);

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);
    assert.equal(screen.getCell(0, 0).char, "P"); // "Para1"
    assert.equal(screen.getCell(0, 2).char, "P"); // "Para2"
  });

  it("trailing \\n produces an extra empty line", () => {
    const span = new TextSpan({ text: "Hello\n" });
    const rp = new RenderParagraph(span);
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 100 }));

    // "Hello" + trailing empty line = 2 lines
    assert.equal(rp.size.height, 2);
  });

  it("\\n interacts with soft wrapping", () => {
    const span = new TextSpan({ text: "abcdef\nghij" });
    const rp = new RenderParagraph(span);
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 4, minHeight: 0, maxHeight: 100 }));

    // "abcdef" soft-wraps to ["abcd", "ef"], then \n, then "ghij" → 3 lines
    assert.equal(rp.size.height, 3);

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);
    assert.equal(screen.getCell(0, 0).char, "a");
    assert.equal(screen.getCell(0, 1).char, "e"); // soft-wrap continuation
    assert.equal(screen.getCell(0, 2).char, "g"); // after hard break
  });

  it("getMinIntrinsicHeight accounts for \\n", () => {
    const span = new TextSpan({ text: "Hi\nThere" });
    const rp = new RenderParagraph(span);
    // Width 80 — no soft wrap, but \n produces 2 lines
    assert.equal(rp.getMinIntrinsicHeight(80), 2);
  });

  it("getMaxIntrinsicWidth counts only the widest line", () => {
    const span = new TextSpan({ text: "Hi\nThere" });
    const rp = new RenderParagraph(span);
    // "There" = 5 is wider than "Hi" = 2
    assert.equal(rp.getMaxIntrinsicWidth(Infinity), 5);
  });

  it("getMinIntrinsicWidth counts widest word across \\n lines", () => {
    const span = new TextSpan({ text: "ab\ncdef" });
    const rp = new RenderParagraph(span);
    // Widest word: "cdef" = 4
    assert.equal(rp.getMinIntrinsicWidth(Infinity), 4);
  });
});
