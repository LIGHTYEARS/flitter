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
import { Color } from "../screen/color.js";
import { HitTestResult } from "../gestures/hit-test.js";
import { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
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

// ════════════════════════════════════════════════════
//  RenderParagraph — hitTest + onTap (Gap 5)
// ════════════════════════════════════════════════════

describe("RenderParagraph — hitTest + onTap (Gap 5)", () => {
  it("hitTest registers mouse target when span has onTap", () => {
    let _tapped = false;
    const span = new TextSpan({
      text: "Click me",
      onTap: () => {
        _tapped = true;
      },
    });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(20, 1));

    const result = new HitTestResult();
    const hit = rp.hitTest(result, { x: 2, y: 0 });

    assert.equal(hit, true);
    assert.ok(result.mouseTargets.length > 0, "should register as mouse target");
  });

  it("hitTest does NOT register mouse target when no onTap and not selectable", () => {
    const span = new TextSpan({ text: "Plain text" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(20, 1));

    const result = new HitTestResult();
    rp.hitTest(result, { x: 2, y: 0 });

    assert.equal(result.mouseTargets.length, 0, "should NOT register as mouse target");
  });

  it("hitTest registers mouse target when selectable is true", () => {
    const span = new TextSpan({ text: "Selectable text" });
    const rp = new RenderParagraph(span);
    rp.selectable = true;
    rp.layout(BoxConstraints.tight(20, 1));

    const result = new HitTestResult();
    rp.hitTest(result, { x: 2, y: 0 });

    assert.ok(result.mouseTargets.length > 0, "should register as mouse target for selectable");
  });

  it("handleMouseEvent dispatches onTap for clicked span", () => {
    let tapped = false;
    const span = new TextSpan({
      text: "Click",
      onTap: () => {
        tapped = true;
      },
    });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(20, 1));

    rp.handleMouseEvent({
      type: "click",
      position: { x: 2, y: 0 },
      localPosition: { x: 2, y: 0 },
    });

    assert.equal(tapped, true, "onTap should have been called");
  });

  it("handleMouseEvent does not crash when no onTap", () => {
    const span = new TextSpan({ text: "No tap handler" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(20, 1));

    // Should not throw
    rp.handleMouseEvent({
      type: "click",
      position: { x: 2, y: 0 },
      localPosition: { x: 2, y: 0 },
    });
  });

  it("handleMouseEvent dispatches to correct child span in nested tree", () => {
    let tappedA = false;
    let tappedB = false;
    const span = new TextSpan({
      children: [
        new TextSpan({
          text: "AAA",
          onTap: () => {
            tappedA = true;
          },
        }),
        new TextSpan({
          text: "BBB",
          onTap: () => {
            tappedB = true;
          },
        }),
      ],
    });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(20, 1));

    // Click at col 0 → should be in "AAA" span
    rp.handleMouseEvent({
      type: "click",
      position: { x: 0, y: 0 },
      localPosition: { x: 0, y: 0 },
    });
    assert.equal(tappedA, true, "onTap for A should fire");
    assert.equal(tappedB, false, "onTap for B should NOT fire");

    // Click at col 4 → should be in "BBB" span
    rp.handleMouseEvent({
      type: "click",
      position: { x: 4, y: 0 },
      localPosition: { x: 4, y: 0 },
    });
    assert.equal(tappedB, true, "onTap for B should fire");
  });

  it("_findGlyphAt returns null for out-of-bounds position", () => {
    const span = new TextSpan({ text: "Hi" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(20, 1));

    // Click outside → no glyph, no crash
    rp.handleMouseEvent({
      type: "click",
      position: { x: 50, y: 50 },
      localPosition: { x: 50, y: 50 },
    });
    // No assertion needed — just shouldn't crash
  });
});

// ════════════════════════════════════════════════════
//  RichText Widget — selectable prop (Gap 2 prep)
// ════════════════════════════════════════════════════

describe("RichText Widget — selectable prop", () => {
  it("creates RenderParagraph with selectable=false by default", () => {
    const widget = new RichText({ text: new TextSpan({ text: "test" }) });
    assert.equal(widget.selectable, false);
  });

  it("creates RenderParagraph with selectable=true when specified", () => {
    const widget = new RichText({ text: new TextSpan({ text: "test" }), selectable: true });
    assert.equal(widget.selectable, true);
  });

  it("updateRenderObject propagates selectable", () => {
    const rp = new RenderParagraph(new TextSpan({ text: "test" }));
    assert.equal(rp.selectable, false);

    const widget = new RichText({ text: new TextSpan({ text: "test" }), selectable: true });
    widget.updateRenderObject(rp);
    assert.equal(rp.selectable, true);
  });
});

describe("RenderParagraph — textSpan dirty marking", () => {
  it("仅文本样式变化时不触发布局，但会重绘新样式", () => {
    const rp = new RenderParagraph(
      new TextSpan({
        text: "A",
        style: new TextStyle({ foreground: Color.blue() }),
      }),
    );
    const internal = rp as unknown as {
      attach(): void;
      _needsLayout: boolean;
      _needsPaint: boolean;
    };

    internal.attach();
    rp.layout(BoxConstraints.tight(4, 1));
    internal._needsLayout = false;
    internal._needsPaint = false;

    rp.textSpan = new TextSpan({
      text: "A",
      style: new TextStyle({ foreground: Color.red() }),
    });

    assert.equal(rp.needsLayout, false);
    assert.equal(rp.needsPaint, true);

    const screen = new Screen(4, 1);
    rp.paint(screen, 0, 0);
    assert.equal(screen.getCell(0, 0).style.foreground.equals(Color.red()), true);
  });

  it("仅等宽文本变化时不触发布局，但会重绘新字形", () => {
    const rp = new RenderParagraph(new TextSpan({ text: "⠋ " }));
    const internal = rp as unknown as {
      attach(): void;
      _needsLayout: boolean;
      _needsPaint: boolean;
    };

    internal.attach();
    rp.layout(BoxConstraints.tight(4, 1));
    internal._needsLayout = false;
    internal._needsPaint = false;

    rp.textSpan = new TextSpan({ text: "⠙ " });

    assert.equal(rp.needsLayout, false);
    assert.equal(rp.needsPaint, true);

    const screen = new Screen(4, 1);
    rp.paint(screen, 0, 0);
    assert.equal(screen.getCell(0, 0).char, "⠙");
  });
});
