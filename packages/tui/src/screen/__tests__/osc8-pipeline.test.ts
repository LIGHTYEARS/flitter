/**
 * OSC 8 hyperlink pipeline tests.
 *
 * Verifies that url propagates through:
 * - ScreenBuffer.writeChar → Cell.url
 * - Screen.writeChar → Cell.url
 * - RenderParagraph (TextSpan.url → LayoutGlyph → performPaint → Cell.url)
 */
import { describe, expect, it } from "bun:test";
import { BoxConstraints } from "../../tree/constraints.js";
import { RenderParagraph } from "../../widgets/rich-text.js";
import { TextSpan } from "../../widgets/text-span.js";
import { Screen } from "../screen.js";
import { TextStyle } from "../text-style.js";

describe("OSC 8 hyperlink pipeline", () => {
  describe("Screen.writeChar", () => {
    it("propagates url to Cell", () => {
      const screen = new Screen(20, 5);
      const style = new TextStyle({ bold: true });
      const url = "https://example.com/file.ts";

      screen.writeChar(0, 0, "A", style, 1, url);

      const cell = screen.back.getCell(0, 0);
      expect(cell).not.toBeNull();
      expect(cell!.char).toBe("A");
      expect(cell!.url).toBe(url);
    });

    it("without url leaves Cell.url undefined", () => {
      const screen = new Screen(20, 5);
      const style = new TextStyle({ bold: true });

      screen.writeChar(0, 0, "B", style, 1);

      const cell = screen.back.getCell(0, 0);
      expect(cell).not.toBeNull();
      expect(cell!.char).toBe("B");
      expect(cell!.url).toBeUndefined();
    });

    it("propagates url to wide character continuation cell", () => {
      const screen = new Screen(20, 5);
      const style = TextStyle.NORMAL;
      const url = "https://example.com";

      screen.writeChar(0, 0, "中", style, 2, url);

      const mainCell = screen.back.getCell(0, 0);
      expect(mainCell).not.toBeNull();
      expect(mainCell!.char).toBe("中");
      expect(mainCell!.width).toBe(2);
      expect(mainCell!.url).toBe(url);

      // Continuation cell (width=0) should also carry the url
      const contCell = screen.back.getCell(1, 0);
      expect(contCell).not.toBeNull();
      expect(contCell!.width).toBe(0);
      expect(contCell!.url).toBe(url);
    });
  });

  describe("RenderParagraph → Cell.url", () => {
    it("propagates TextSpan.url through performPaint to Cell", () => {
      const url = "https://example.com/path";
      const span = new TextSpan({
        text: "click",
        url,
      });

      const rp = new RenderParagraph(span);
      rp.layout(new BoxConstraints({ maxWidth: 40, maxHeight: 10 }));

      const screen = new Screen(40, 10);
      rp.performPaint(screen, 0, 0);

      // Each character of "click" should have the url
      for (let i = 0; i < "click".length; i++) {
        const cell = screen.back.getCell(i, 0);
        expect(cell).not.toBeNull();
        expect(cell!.char).toBe("click"[i]);
        expect(cell!.url).toBe(url);
      }
    });

    it("leaves Cell.url undefined when TextSpan has no url", () => {
      const span = new TextSpan({
        text: "plain",
      });

      const rp = new RenderParagraph(span);
      rp.layout(new BoxConstraints({ maxWidth: 40, maxHeight: 10 }));

      const screen = new Screen(40, 10);
      rp.performPaint(screen, 0, 0);

      const cell = screen.back.getCell(0, 0);
      expect(cell).not.toBeNull();
      expect(cell!.char).toBe("p");
      expect(cell!.url).toBeUndefined();
    });

    it("child TextSpan inherits parent url", () => {
      // 逆向: amp getStyledSegments — r = T.hyperlink ?? a (child inherits parent)
      const parentUrl = "https://example.com/parent";
      const span = new TextSpan({
        url: parentUrl,
        children: [new TextSpan({ text: "child" })],
      });

      const rp = new RenderParagraph(span);
      rp.layout(new BoxConstraints({ maxWidth: 40, maxHeight: 10 }));

      const screen = new Screen(40, 10);
      rp.performPaint(screen, 0, 0);

      const cell = screen.back.getCell(0, 0);
      expect(cell).not.toBeNull();
      expect(cell!.char).toBe("c");
      expect(cell!.url).toBe(parentUrl);
    });

    it("child TextSpan url overrides parent url", () => {
      // 逆向: amp getStyledSegments — r = T.hyperlink ?? a (child overrides parent)
      const parentUrl = "https://example.com/parent";
      const childUrl = "https://example.com/child";
      const span = new TextSpan({
        text: "AB",
        url: parentUrl,
        children: [new TextSpan({ text: "CD", url: childUrl })],
      });

      const rp = new RenderParagraph(span);
      rp.layout(new BoxConstraints({ maxWidth: 40, maxHeight: 10 }));

      const screen = new Screen(40, 10);
      rp.performPaint(screen, 0, 0);

      // "A" and "B" from parent span should have parentUrl
      expect(screen.back.getCell(0, 0)!.url).toBe(parentUrl);
      expect(screen.back.getCell(1, 0)!.url).toBe(parentUrl);

      // "C" and "D" from child span should have childUrl
      expect(screen.back.getCell(2, 0)!.url).toBe(childUrl);
      expect(screen.back.getCell(3, 0)!.url).toBe(childUrl);
    });
  });
});
