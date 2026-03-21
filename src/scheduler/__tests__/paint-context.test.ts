// Tests for PaintContext and paint traversal
// Covers: drawChar, drawText, drawTextSpan, fillRect, drawBorder, withClip, nested clips

import { describe, test, expect, beforeEach } from 'bun:test';
import { ScreenBuffer } from '../../terminal/screen-buffer';
import { createCell, type CellStyle } from '../../terminal/cell';
import { TextSpan } from '../../core/text-span';
import { TextStyle } from '../../core/text-style';
import { Color } from '../../core/color';
import { PaintContext, BORDER_CHARS } from '../paint-context';
import { paintRenderTree, paintRenderObject } from '../paint';
import { RenderBox, RenderObject, ContainerRenderBox } from '../../framework/render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';

describe('PaintContext', () => {
  let screen: ScreenBuffer;
  let ctx: PaintContext;

  beforeEach(() => {
    screen = new ScreenBuffer(20, 10);
    ctx = new PaintContext(screen);
  });

  // =========================================================================
  // 1. drawChar places a character at the correct position
  // =========================================================================
  describe('drawChar', () => {
    test('places a character at the correct position', () => {
      ctx.drawChar(5, 3, 'A');

      const cell = screen.getCell(5, 3);
      expect(cell.char).toBe('A');
      expect(cell.width).toBe(1);
    });

    test('does nothing for out-of-bounds coordinates', () => {
      ctx.drawChar(-1, 0, 'X');
      ctx.drawChar(0, -1, 'X');
      ctx.drawChar(20, 0, 'X');
      ctx.drawChar(0, 10, 'X');

      // Verify cells at boundaries are empty
      const cell = screen.getCell(0, 0);
      expect(cell.char).toBe(' ');
    });

    // =========================================================================
    // 2. drawChar with CellStyle (fg, bg, bold, etc.)
    // =========================================================================
    test('applies CellStyle (fg, bg, bold)', () => {
      const style: CellStyle = {
        fg: Color.red,
        bg: Color.blue,
        bold: true,
      };
      ctx.drawChar(2, 1, 'B', style);

      const cell = screen.getCell(2, 1);
      expect(cell.char).toBe('B');
      expect(cell.style.fg).toBeDefined();
      expect(cell.style.fg!.equals(Color.red)).toBe(true);
      expect(cell.style.bg).toBeDefined();
      expect(cell.style.bg!.equals(Color.blue)).toBe(true);
      expect(cell.style.bold).toBe(true);
    });

    test('applies italic, underline, strikethrough', () => {
      const style: CellStyle = {
        italic: true,
        underline: true,
        strikethrough: true,
      };
      ctx.drawChar(0, 0, 'I', style);

      const cell = screen.getCell(0, 0);
      expect(cell.style.italic).toBe(true);
      expect(cell.style.underline).toBe(true);
      expect(cell.style.strikethrough).toBe(true);
    });

    test('handles width-2 character', () => {
      // CJK character '中' is width 2
      ctx.drawChar(3, 0, '中', undefined, 2);

      const cell = screen.getCell(3, 0);
      expect(cell.char).toBe('中');
      expect(cell.width).toBe(2);

      // Continuation marker at x=4
      const continuation = screen.getCell(4, 0);
      expect(continuation.char).toBe('');
      expect(continuation.width).toBe(0);
    });
  });

  // =========================================================================
  // 3. drawText draws a string of characters
  // =========================================================================
  describe('drawText', () => {
    test('draws a string of characters', () => {
      ctx.drawText(2, 1, 'Hello');

      expect(screen.getCell(2, 1).char).toBe('H');
      expect(screen.getCell(3, 1).char).toBe('e');
      expect(screen.getCell(4, 1).char).toBe('l');
      expect(screen.getCell(5, 1).char).toBe('l');
      expect(screen.getCell(6, 1).char).toBe('o');
    });

    test('draws text with style', () => {
      const style: CellStyle = { fg: Color.green, bold: true };
      ctx.drawText(0, 0, 'Hi', style);

      const cellH = screen.getCell(0, 0);
      expect(cellH.char).toBe('H');
      expect(cellH.style.fg!.equals(Color.green)).toBe(true);
      expect(cellH.style.bold).toBe(true);

      const cellI = screen.getCell(1, 0);
      expect(cellI.char).toBe('i');
      expect(cellI.style.fg!.equals(Color.green)).toBe(true);
    });

    // =========================================================================
    // 4. drawText handles CJK wide characters (width 2)
    // =========================================================================
    test('handles CJK wide characters (width 2)', () => {
      // '你好' — each character is width 2, total 4 columns
      ctx.drawText(0, 0, '你好');

      const cell0 = screen.getCell(0, 0);
      expect(cell0.char).toBe('你');
      expect(cell0.width).toBe(2);

      // Column 1 is continuation
      const cell1 = screen.getCell(1, 0);
      expect(cell1.width).toBe(0);

      const cell2 = screen.getCell(2, 0);
      expect(cell2.char).toBe('好');
      expect(cell2.width).toBe(2);

      // Column 3 is continuation
      const cell3 = screen.getCell(3, 0);
      expect(cell3.width).toBe(0);
    });

    test('handles mixed ASCII and CJK', () => {
      ctx.drawText(0, 0, 'A你B');

      expect(screen.getCell(0, 0).char).toBe('A');
      expect(screen.getCell(0, 0).width).toBe(1);

      expect(screen.getCell(1, 0).char).toBe('你');
      expect(screen.getCell(1, 0).width).toBe(2);

      // Column 2 is continuation for '你'
      expect(screen.getCell(2, 0).width).toBe(0);

      expect(screen.getCell(3, 0).char).toBe('B');
      expect(screen.getCell(3, 0).width).toBe(1);
    });
  });

  // =========================================================================
  // 5. fillRect fills a region
  // =========================================================================
  describe('fillRect', () => {
    test('fills a rectangular region with a character', () => {
      ctx.fillRect(1, 1, 3, 2, '#');

      // Check filled region
      for (let row = 1; row <= 2; row++) {
        for (let col = 1; col <= 3; col++) {
          expect(screen.getCell(col, row).char).toBe('#');
        }
      }

      // Check outside region is empty
      expect(screen.getCell(0, 0).char).toBe(' ');
      expect(screen.getCell(4, 1).char).toBe(' ');
      expect(screen.getCell(1, 3).char).toBe(' ');
    });

    test('fills with style', () => {
      const style: CellStyle = { bg: Color.yellow };
      ctx.fillRect(0, 0, 2, 2, '.', style);

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const cell = screen.getCell(col, row);
          expect(cell.char).toBe('.');
          expect(cell.style.bg!.equals(Color.yellow)).toBe(true);
        }
      }
    });

    test('fills with default space character', () => {
      ctx.fillRect(0, 0, 3, 1);

      for (let col = 0; col < 3; col++) {
        expect(screen.getCell(col, 0).char).toBe(' ');
      }
    });
  });

  // =========================================================================
  // 6. drawBorder with rounded style draws correct corner and edge characters
  // =========================================================================
  describe('drawBorder', () => {
    test('draws rounded border with correct corners and edges', () => {
      ctx.drawBorder(0, 0, 5, 3, 'rounded');

      const chars = BORDER_CHARS.rounded;

      // Corners
      expect(screen.getCell(0, 0).char).toBe(chars.tl);   // ╭
      expect(screen.getCell(4, 0).char).toBe(chars.tr);   // ╮
      expect(screen.getCell(0, 2).char).toBe(chars.bl);   // ╰
      expect(screen.getCell(4, 2).char).toBe(chars.br);   // ╯

      // Top edge
      expect(screen.getCell(1, 0).char).toBe(chars.h);    // ─
      expect(screen.getCell(2, 0).char).toBe(chars.h);
      expect(screen.getCell(3, 0).char).toBe(chars.h);

      // Bottom edge
      expect(screen.getCell(1, 2).char).toBe(chars.h);
      expect(screen.getCell(2, 2).char).toBe(chars.h);
      expect(screen.getCell(3, 2).char).toBe(chars.h);

      // Left edge
      expect(screen.getCell(0, 1).char).toBe(chars.v);    // │

      // Right edge
      expect(screen.getCell(4, 1).char).toBe(chars.v);
    });

    // =========================================================================
    // 7. drawBorder with solid style
    // =========================================================================
    test('draws solid border with correct corners and edges', () => {
      ctx.drawBorder(1, 1, 4, 3, 'solid');

      const chars = BORDER_CHARS.solid;

      // Corners
      expect(screen.getCell(1, 1).char).toBe(chars.tl);   // ┌
      expect(screen.getCell(4, 1).char).toBe(chars.tr);   // ┐
      expect(screen.getCell(1, 3).char).toBe(chars.bl);   // └
      expect(screen.getCell(4, 3).char).toBe(chars.br);   // ┘

      // Top edge
      expect(screen.getCell(2, 1).char).toBe(chars.h);
      expect(screen.getCell(3, 1).char).toBe(chars.h);

      // Bottom edge
      expect(screen.getCell(2, 3).char).toBe(chars.h);
      expect(screen.getCell(3, 3).char).toBe(chars.h);

      // Side edges
      expect(screen.getCell(1, 2).char).toBe(chars.v);
      expect(screen.getCell(4, 2).char).toBe(chars.v);
    });

    test('draws border with color', () => {
      ctx.drawBorder(0, 0, 3, 2, 'solid', Color.cyan);

      const cell = screen.getCell(0, 0);
      expect(cell.style.fg).toBeDefined();
      expect(cell.style.fg!.equals(Color.cyan)).toBe(true);
    });

    test('does nothing for too-small dimensions', () => {
      ctx.drawBorder(0, 0, 1, 1, 'solid');
      // All cells should still be empty
      expect(screen.getCell(0, 0).char).toBe(' ');
    });
  });

  // =========================================================================
  // 8. withClip prevents drawing outside clip rect
  // =========================================================================
  describe('withClip', () => {
    test('prevents drawing outside clip rect', () => {
      const clipped = ctx.withClip(2, 2, 3, 3);

      // Inside clip — should work
      clipped.drawChar(2, 2, 'A');
      clipped.drawChar(4, 4, 'B');

      expect(screen.getCell(2, 2).char).toBe('A');
      expect(screen.getCell(4, 4).char).toBe('B');

      // Outside clip — should be ignored
      clipped.drawChar(0, 0, 'X');
      clipped.drawChar(5, 2, 'X');
      clipped.drawChar(2, 5, 'X');
      clipped.drawChar(1, 2, 'X');

      expect(screen.getCell(0, 0).char).toBe(' ');
      expect(screen.getCell(5, 2).char).toBe(' ');
      expect(screen.getCell(2, 5).char).toBe(' ');
      expect(screen.getCell(1, 2).char).toBe(' ');
    });

    test('clips drawText at boundaries', () => {
      const clipped = ctx.withClip(2, 0, 3, 1);

      clipped.drawText(0, 0, 'ABCDE');

      // Only characters within clip (columns 2-4) should be drawn
      expect(screen.getCell(0, 0).char).toBe(' '); // clipped
      expect(screen.getCell(1, 0).char).toBe(' '); // clipped
      expect(screen.getCell(2, 0).char).toBe('C'); // in clip
      expect(screen.getCell(3, 0).char).toBe('D'); // in clip
      expect(screen.getCell(4, 0).char).toBe('E'); // in clip
      expect(screen.getCell(5, 0).char).toBe(' '); // clipped (outside)
    });

    test('clips fillRect at boundaries', () => {
      const clipped = ctx.withClip(1, 1, 2, 2);
      clipped.fillRect(0, 0, 5, 5, '#');

      // Only (1,1), (2,1), (1,2), (2,2) should be filled
      expect(screen.getCell(0, 0).char).toBe(' ');
      expect(screen.getCell(1, 1).char).toBe('#');
      expect(screen.getCell(2, 1).char).toBe('#');
      expect(screen.getCell(1, 2).char).toBe('#');
      expect(screen.getCell(2, 2).char).toBe('#');
      expect(screen.getCell(3, 1).char).toBe(' ');
      expect(screen.getCell(1, 3).char).toBe(' ');
    });

    // =========================================================================
    // 9. Nested clips (clip within clip)
    // =========================================================================
    test('nested clips intersect correctly', () => {
      // First clip: (2,2) to (7,7) — 5x5
      const clip1 = ctx.withClip(2, 2, 5, 5);

      // Second clip within first: (4,4) to (8,8) — 4x4
      // But intersected with first: (4,4) to (7,7) — 3x3
      const clip2 = clip1.withClip(4, 4, 4, 4);

      // Inside nested clip — should work
      clip2.drawChar(4, 4, 'A');
      clip2.drawChar(6, 6, 'B');

      expect(screen.getCell(4, 4).char).toBe('A');
      expect(screen.getCell(6, 6).char).toBe('B');

      // Inside first clip but outside second — should be ignored
      clip2.drawChar(2, 2, 'X');
      clip2.drawChar(3, 3, 'X');

      expect(screen.getCell(2, 2).char).toBe(' ');
      expect(screen.getCell(3, 3).char).toBe(' ');

      // Outside both clips — should be ignored
      clip2.drawChar(0, 0, 'X');
      clip2.drawChar(8, 8, 'X');

      expect(screen.getCell(0, 0).char).toBe(' ');
      expect(screen.getCell(8, 8).char).toBe(' ');
    });

    test('nested clip does not expand parent clip', () => {
      const clip1 = ctx.withClip(3, 3, 2, 2); // (3,3)-(4,4)
      const clip2 = clip1.withClip(0, 0, 10, 10); // tries full screen

      // Should still be limited to parent clip
      clip2.drawChar(3, 3, 'A'); // in both
      clip2.drawChar(4, 4, 'B'); // in both
      clip2.drawChar(0, 0, 'X'); // outside parent
      clip2.drawChar(5, 5, 'X'); // outside parent

      expect(screen.getCell(3, 3).char).toBe('A');
      expect(screen.getCell(4, 4).char).toBe('B');
      expect(screen.getCell(0, 0).char).toBe(' ');
      expect(screen.getCell(5, 5).char).toBe(' ');
    });

    test('clips wide CJK characters that straddle the boundary', () => {
      const clipped = ctx.withClip(2, 0, 3, 1); // columns 2-4

      // Draw a CJK char at column 4 — it needs columns 4-5, but 5 is outside clip
      clipped.drawText(4, 0, '中');

      // Should be clipped since the full width (4,5) doesn't fit in clip (2-4)
      expect(screen.getCell(4, 0).char).toBe(' ');
    });
  });

  // =========================================================================
  // 10. drawTextSpan walks span tree and draws styled text
  // =========================================================================
  describe('drawTextSpan', () => {
    test('draws plain text from a TextSpan', () => {
      const span = new TextSpan({ text: 'Hello' });

      const written = ctx.drawTextSpan(0, 0, span);

      expect(written).toBe(5);
      expect(screen.getCell(0, 0).char).toBe('H');
      expect(screen.getCell(1, 0).char).toBe('e');
      expect(screen.getCell(2, 0).char).toBe('l');
      expect(screen.getCell(3, 0).char).toBe('l');
      expect(screen.getCell(4, 0).char).toBe('o');
    });

    test('draws styled text from a TextSpan', () => {
      const span = new TextSpan({
        text: 'AB',
        style: new TextStyle({ foreground: Color.red, bold: true }),
      });

      ctx.drawTextSpan(1, 2, span);

      const cellA = screen.getCell(1, 2);
      expect(cellA.char).toBe('A');
      expect(cellA.style.fg!.equals(Color.red)).toBe(true);
      expect(cellA.style.bold).toBe(true);

      const cellB = screen.getCell(2, 2);
      expect(cellB.char).toBe('B');
      expect(cellB.style.fg!.equals(Color.red)).toBe(true);
    });

    test('walks span tree with children and applies merged styles', () => {
      const span = new TextSpan({
        style: new TextStyle({ foreground: Color.green }),
        children: [
          new TextSpan({ text: 'Hi' }),
          new TextSpan({
            text: '!',
            style: new TextStyle({ bold: true }),
          }),
        ],
      });

      const written = ctx.drawTextSpan(0, 0, span);

      expect(written).toBe(3);

      // 'H' and 'i' inherit green foreground
      expect(screen.getCell(0, 0).char).toBe('H');
      expect(screen.getCell(0, 0).style.fg!.equals(Color.green)).toBe(true);

      expect(screen.getCell(1, 0).char).toBe('i');
      expect(screen.getCell(1, 0).style.fg!.equals(Color.green)).toBe(true);

      // '!' has green fg (inherited) + bold (own)
      expect(screen.getCell(2, 0).char).toBe('!');
      expect(screen.getCell(2, 0).style.fg!.equals(Color.green)).toBe(true);
      expect(screen.getCell(2, 0).style.bold).toBe(true);
    });

    test('respects maxWidth parameter', () => {
      const span = new TextSpan({ text: 'ABCDE' });

      const written = ctx.drawTextSpan(0, 0, span, 3);

      expect(written).toBe(3);
      expect(screen.getCell(0, 0).char).toBe('A');
      expect(screen.getCell(1, 0).char).toBe('B');
      expect(screen.getCell(2, 0).char).toBe('C');
      expect(screen.getCell(3, 0).char).toBe(' '); // not drawn
    });

    test('handles CJK text in spans', () => {
      const span = new TextSpan({ text: '你好' });

      const written = ctx.drawTextSpan(0, 0, span);

      expect(written).toBe(4); // Each CJK char is width 2
      expect(screen.getCell(0, 0).char).toBe('你');
      expect(screen.getCell(0, 0).width).toBe(2);
      expect(screen.getCell(2, 0).char).toBe('好');
      expect(screen.getCell(2, 0).width).toBe(2);
    });

    test('handles deeply nested span tree', () => {
      const span = new TextSpan({
        children: [
          new TextSpan({
            style: new TextStyle({ foreground: Color.red }),
            children: [
              new TextSpan({ text: 'A' }),
              new TextSpan({
                text: 'B',
                style: new TextStyle({ foreground: Color.blue }),
              }),
            ],
          }),
          new TextSpan({ text: 'C' }),
        ],
      });

      const written = ctx.drawTextSpan(0, 0, span);
      expect(written).toBe(3);

      // 'A' inherits red
      expect(screen.getCell(0, 0).char).toBe('A');
      expect(screen.getCell(0, 0).style.fg!.equals(Color.red)).toBe(true);

      // 'B' overrides with blue
      expect(screen.getCell(1, 0).char).toBe('B');
      expect(screen.getCell(1, 0).style.fg!.equals(Color.blue)).toBe(true);

      // 'C' has no inherited color (parent root has no style)
      expect(screen.getCell(2, 0).char).toBe('C');
    });
  });
});

// ===========================================================================
// Paint traversal tests
// ===========================================================================

describe('paintRenderTree', () => {
  // Helper: a simple leaf render box that draws a character at its offset
  class TestRenderBox extends RenderBox {
    drawChar: string;

    constructor(char: string) {
      super();
      this.drawChar = char;
    }

    performLayout(): void {
      this.size = new Size(1, 1);
    }

    paint(context: any, offset: Offset): void {
      context.drawChar(offset.col, offset.row, this.drawChar);
    }
  }

  // Helper: a container render box that paints children at their offsets
  class TestContainerRenderBox extends ContainerRenderBox {
    performLayout(): void {
      const constraints = this.constraints!;
      let y = 0;
      this.visitChildren((child) => {
        const renderChild = child as RenderBox;
        renderChild.layout(constraints);
        renderChild.offset = new Offset(0, y);
        y += renderChild.size.height;
      });
      this.size = new Size(constraints.maxWidth, y);
    }

    paint(context: any, offset: Offset): void {
      this.visitChildren((child) => {
        const renderChild = child as RenderBox;
        const childOffset = new Offset(
          offset.col + renderChild.offset.col,
          offset.row + renderChild.offset.row,
        );
        renderChild.paint(context, childOffset);
      });
    }
  }

  test('paintRenderTree paints root at (0, 0)', () => {
    const screen = new ScreenBuffer(10, 5);
    const root = new TestRenderBox('R');
    root.layout(new BoxConstraints({ minWidth: 1, maxWidth: 10, minHeight: 1, maxHeight: 5 }));

    paintRenderTree(root, screen);

    expect(screen.getCell(0, 0).char).toBe('R');
  });

  test('paintRenderTree paints container children at offsets', () => {
    const screen = new ScreenBuffer(10, 5);
    const container = new TestContainerRenderBox();
    const childA = new TestRenderBox('A');
    const childB = new TestRenderBox('B');

    container.insert(childA);
    container.insert(childB);

    container.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 5 }));

    paintRenderTree(container, screen);

    // childA at (0, 0), childB at (0, 1)
    expect(screen.getCell(0, 0).char).toBe('A');
    expect(screen.getCell(0, 1).char).toBe('B');
  });

  test('paintRenderObject respects offset', () => {
    const screen = new ScreenBuffer(10, 5);
    const ctx = new PaintContext(screen);
    const box = new TestRenderBox('X');
    box.layout(new BoxConstraints({ minWidth: 1, maxWidth: 10, minHeight: 1, maxHeight: 5 }));

    paintRenderObject(box, ctx, 3, 2);

    expect(screen.getCell(3, 2).char).toBe('X');
  });
});
