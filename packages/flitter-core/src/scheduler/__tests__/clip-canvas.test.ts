// Tests for ClipCanvas — a PaintContext wrapper that clips all draw operations to a Rect.
// Covers: drawChar, drawText, drawTextSpan, fillRect, drawBorder, withClip (nested clipping)

import { describe, test, expect, beforeEach } from 'bun:test';
import { ScreenBuffer } from '../../terminal/screen-buffer';
import { type CellStyle } from '../../terminal/cell';
import { TextSpan } from '../../core/text-span';
import { TextStyle } from '../../core/text-style';
import { Color } from '../../core/color';
import { Rect } from '../../core/types';
import { PaintContext, BORDER_CHARS } from '../paint-context';
import { BOX_DRAWING } from '../../painting/border-painter';
import { ClipCanvas } from '../clip-canvas';

describe('ClipCanvas', () => {
  let screen: ScreenBuffer;
  let ctx: PaintContext;

  beforeEach(() => {
    screen = new ScreenBuffer(20, 10);
    ctx = new PaintContext(screen);
  });

  // =========================================================================
  // Constructor and properties
  // =========================================================================

  describe('constructor', () => {
    test('stores context and clip rect', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      expect(canvas.context).toBe(ctx);
      expect(canvas.clip).toBe(clip);
    });
  });

  // =========================================================================
  // drawChar
  // =========================================================================

  describe('drawChar', () => {
    test('draws character inside clip rect', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(3, 3, 'A');
      expect(screen.getCell(3, 3).char).toBe('A');
    });

    test('skips character outside clip rect (left)', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(1, 3, 'X');
      expect(screen.getCell(1, 3).char).toBe(' ');
    });

    test('skips character outside clip rect (right)', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(7, 3, 'X');
      expect(screen.getCell(7, 3).char).toBe(' ');
    });

    test('skips character outside clip rect (top)', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(3, 1, 'X');
      expect(screen.getCell(3, 1).char).toBe(' ');
    });

    test('skips character outside clip rect (bottom)', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(3, 7, 'X');
      expect(screen.getCell(3, 7).char).toBe(' ');
    });

    test('draws at clip boundary (top-left corner)', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(2, 2, 'A');
      expect(screen.getCell(2, 2).char).toBe('A');
    });

    test('draws at clip boundary (bottom-right inner)', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      // Right edge is 2+5=7, bottom edge is 2+5=7
      // Last valid position is (6, 6)
      canvas.drawChar(6, 6, 'B');
      expect(screen.getCell(6, 6).char).toBe('B');
    });

    test('skips at clip boundary (right edge exclusive)', () => {
      const clip = new Rect(2, 2, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(7, 3, 'X');
      expect(screen.getCell(7, 3).char).toBe(' ');
    });

    test('passes style to underlying context', () => {
      const clip = new Rect(0, 0, 10, 10);
      const canvas = new ClipCanvas(ctx, clip);
      const style: CellStyle = { fg: Color.red, bold: true };

      canvas.drawChar(1, 1, 'S', style);
      const cell = screen.getCell(1, 1);
      expect(cell.char).toBe('S');
      expect(cell.style.fg!.equals(Color.red)).toBe(true);
      expect(cell.style.bold).toBe(true);
    });
  });

  // =========================================================================
  // drawText
  // =========================================================================

  describe('drawText', () => {
    test('draws text fully inside clip', () => {
      const clip = new Rect(0, 0, 10, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawText(1, 1, 'Hello');
      expect(screen.getCell(1, 1).char).toBe('H');
      expect(screen.getCell(2, 1).char).toBe('e');
      expect(screen.getCell(3, 1).char).toBe('l');
      expect(screen.getCell(4, 1).char).toBe('l');
      expect(screen.getCell(5, 1).char).toBe('o');
    });

    test('truncates text at right clip boundary', () => {
      const clip = new Rect(0, 0, 4, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawText(1, 1, 'Hello');
      expect(screen.getCell(1, 1).char).toBe('H');
      expect(screen.getCell(2, 1).char).toBe('e');
      expect(screen.getCell(3, 1).char).toBe('l');
      // Column 4 is outside clip (0+4=4, exclusive)
      expect(screen.getCell(4, 1).char).toBe(' ');
      expect(screen.getCell(5, 1).char).toBe(' ');
    });

    test('skips text when row is above clip', () => {
      const clip = new Rect(0, 2, 10, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawText(0, 1, 'Hidden');
      expect(screen.getCell(0, 1).char).toBe(' ');
    });

    test('skips text when row is below clip', () => {
      const clip = new Rect(0, 0, 10, 3);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawText(0, 3, 'Hidden');
      expect(screen.getCell(0, 3).char).toBe(' ');
    });

    test('skips characters before left clip boundary', () => {
      const clip = new Rect(3, 0, 5, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawText(0, 0, 'ABCDEFGH');
      // Only D, E, F, G, H should be drawn (cols 3-7)
      expect(screen.getCell(0, 0).char).toBe(' '); // A clipped
      expect(screen.getCell(1, 0).char).toBe(' '); // B clipped
      expect(screen.getCell(2, 0).char).toBe(' '); // C clipped
      expect(screen.getCell(3, 0).char).toBe('D'); // in clip
      expect(screen.getCell(4, 0).char).toBe('E'); // in clip
      expect(screen.getCell(5, 0).char).toBe('F'); // in clip
      expect(screen.getCell(6, 0).char).toBe('G'); // in clip
      expect(screen.getCell(7, 0).char).toBe('H'); // in clip (3+5=8, exclusive)
    });

    test('draws text with style', () => {
      const clip = new Rect(0, 0, 10, 5);
      const canvas = new ClipCanvas(ctx, clip);
      const style: CellStyle = { fg: Color.green };

      canvas.drawText(0, 0, 'Hi', style);
      expect(screen.getCell(0, 0).style.fg!.equals(Color.green)).toBe(true);
    });
  });

  // =========================================================================
  // drawTextSpan
  // =========================================================================

  describe('drawTextSpan', () => {
    test('draws span inside clip', () => {
      const clip = new Rect(0, 0, 10, 5);
      const canvas = new ClipCanvas(ctx, clip);
      const span = new TextSpan({ text: 'Test' });

      const written = canvas.drawTextSpan(0, 0, span);
      expect(written).toBe(4);
      expect(screen.getCell(0, 0).char).toBe('T');
      expect(screen.getCell(3, 0).char).toBe('t');
    });

    test('truncates span at clip right boundary', () => {
      const clip = new Rect(0, 0, 3, 5);
      const canvas = new ClipCanvas(ctx, clip);
      const span = new TextSpan({ text: 'ABCDE' });

      const written = canvas.drawTextSpan(0, 0, span);
      expect(written).toBe(3);
      expect(screen.getCell(0, 0).char).toBe('A');
      expect(screen.getCell(1, 0).char).toBe('B');
      expect(screen.getCell(2, 0).char).toBe('C');
      expect(screen.getCell(3, 0).char).toBe(' '); // not drawn
    });

    test('returns 0 when row is outside clip', () => {
      const clip = new Rect(0, 2, 10, 3);
      const canvas = new ClipCanvas(ctx, clip);
      const span = new TextSpan({ text: 'Hidden' });

      const written = canvas.drawTextSpan(0, 0, span);
      expect(written).toBe(0);
    });

    test('returns 0 when col is past clip right', () => {
      const clip = new Rect(0, 0, 3, 5);
      const canvas = new ClipCanvas(ctx, clip);
      const span = new TextSpan({ text: 'Hello' });

      const written = canvas.drawTextSpan(5, 0, span);
      expect(written).toBe(0);
    });
  });

  // =========================================================================
  // fillRect
  // =========================================================================

  describe('fillRect', () => {
    test('fills area fully inside clip', () => {
      const clip = new Rect(0, 0, 10, 10);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.fillRect(1, 1, 3, 2, '#');
      expect(screen.getCell(1, 1).char).toBe('#');
      expect(screen.getCell(3, 2).char).toBe('#');
    });

    test('intersects fill rect with clip rect', () => {
      const clip = new Rect(2, 2, 4, 4); // (2,2) to (5,5)
      const canvas = new ClipCanvas(ctx, clip);

      canvas.fillRect(0, 0, 10, 10, '#');
      // Only (2,2)-(5,5) should be filled
      expect(screen.getCell(1, 1).char).toBe(' '); // outside clip
      expect(screen.getCell(2, 2).char).toBe('#'); // inside clip
      expect(screen.getCell(5, 5).char).toBe('#'); // inside clip
      expect(screen.getCell(6, 6).char).toBe(' '); // outside clip
    });

    test('does nothing when fill rect is outside clip', () => {
      const clip = new Rect(5, 5, 3, 3);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.fillRect(0, 0, 3, 3, '#');
      // Nothing should be drawn
      expect(screen.getCell(0, 0).char).toBe(' ');
      expect(screen.getCell(2, 2).char).toBe(' ');
    });

    test('clips fill rect that partially overlaps', () => {
      const clip = new Rect(3, 3, 4, 4); // (3,3) to (6,6)
      const canvas = new ClipCanvas(ctx, clip);

      canvas.fillRect(1, 1, 5, 5, '#'); // (1,1) to (5,5)
      // Intersection: (3,3) to (5,5)
      expect(screen.getCell(2, 2).char).toBe(' '); // outside intersection
      expect(screen.getCell(3, 3).char).toBe('#'); // inside intersection
      expect(screen.getCell(5, 5).char).toBe('#'); // inside intersection
      expect(screen.getCell(6, 3).char).toBe(' '); // outside fill rect
    });

    test('passes style through', () => {
      const clip = new Rect(0, 0, 10, 10);
      const canvas = new ClipCanvas(ctx, clip);
      const style: CellStyle = { bg: Color.blue };

      canvas.fillRect(0, 0, 2, 2, '.', style);
      expect(screen.getCell(0, 0).style.bg!.equals(Color.blue)).toBe(true);
    });
  });

  // =========================================================================
  // drawBorder
  // =========================================================================

  describe('drawBorder', () => {
    test('draws border fully inside clip', () => {
      const clip = new Rect(0, 0, 10, 10);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawBorder(1, 1, 5, 3, 'rounded');
      const chars = BORDER_CHARS.rounded;
      expect(screen.getCell(1, 1).char).toBe(chars.tl);
      expect(screen.getCell(5, 1).char).toBe(chars.tr);
      expect(screen.getCell(1, 3).char).toBe(chars.bl);
      expect(screen.getCell(5, 3).char).toBe(chars.br);
    });

    test('skips border when clipped intersection is too small', () => {
      const clip = new Rect(0, 0, 2, 2); // only 2x2
      const canvas = new ClipCanvas(ctx, clip);

      // Border at (5,5) is completely outside clip
      canvas.drawBorder(5, 5, 4, 3, 'solid');
      expect(screen.getCell(5, 5).char).toBe(' ');
    });

    test('clips border to intersection rect', () => {
      const clip = new Rect(0, 0, 8, 8);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawBorder(2, 2, 4, 3, 'solid');
      const chars = BORDER_CHARS.solid;
      expect(screen.getCell(2, 2).char).toBe(chars.tl);
      expect(screen.getCell(5, 2).char).toBe(chars.tr);
      expect(screen.getCell(2, 4).char).toBe(chars.bl);
      expect(screen.getCell(5, 4).char).toBe(chars.br);
    });

    test('passes border color through', () => {
      const clip = new Rect(0, 0, 10, 10);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawBorder(0, 0, 4, 3, 'solid', Color.red);
      const cell = screen.getCell(0, 0);
      expect(cell.style.fg!.equals(Color.red)).toBe(true);
    });

    // Gap 31: Dashed and double border styles
    test('draws dashed border fully inside clip', () => {
      const clip = new Rect(0, 0, 10, 10);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawBorder(1, 1, 5, 3, 'dashed');
      expect(screen.getCell(1, 1).char).toBe('\u250C'); // solid corner
      expect(screen.getCell(2, 1).char).toBe('\u2504'); // dashed horizontal
      expect(screen.getCell(1, 2).char).toBe('\u2506'); // dashed vertical
    });

    test('draws double border fully inside clip', () => {
      const clip = new Rect(0, 0, 10, 10);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawBorder(1, 1, 5, 3, 'double');
      expect(screen.getCell(1, 1).char).toBe('\u2554'); // double corner
      expect(screen.getCell(2, 1).char).toBe('\u2550'); // double horizontal
      expect(screen.getCell(1, 2).char).toBe('\u2551'); // double vertical
    });

    test('clips dashed border at boundary', () => {
      // Clip allows only first 3 columns
      const clip = new Rect(0, 0, 3, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawBorder(0, 0, 5, 3, 'dashed');
      // tl corner visible
      expect(screen.getCell(0, 0).char).toBe('\u250C');
      // dashed h edge
      expect(screen.getCell(1, 0).char).toBe('\u2504');
      expect(screen.getCell(2, 0).char).toBe('\u2504');
      // tr corner outside clip
      expect(screen.getCell(4, 0).char).toBe(' ');
    });

    test('clips double border at boundary', () => {
      const clip = new Rect(0, 0, 3, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawBorder(0, 0, 5, 3, 'double');
      expect(screen.getCell(0, 0).char).toBe('\u2554');
      expect(screen.getCell(1, 0).char).toBe('\u2550');
      expect(screen.getCell(2, 0).char).toBe('\u2550');
      // tr corner outside clip
      expect(screen.getCell(4, 0).char).toBe(' ');
    });
  });

  // =========================================================================
  // withClip (nested clipping)
  // =========================================================================

  describe('withClip', () => {
    test('creates nested ClipCanvas with intersected clip', () => {
      const clip = new Rect(2, 2, 6, 6); // (2,2) to (7,7)
      const canvas = new ClipCanvas(ctx, clip);

      const nested = canvas.withClip(new Rect(4, 4, 6, 6)); // (4,4) to (9,9)
      // Intersection: (4,4) to (7,7)
      expect(nested.clip.left).toBe(4);
      expect(nested.clip.top).toBe(4);
      expect(nested.clip.right).toBe(8);
      expect(nested.clip.bottom).toBe(8);
    });

    test('nested clip restricts drawing', () => {
      const clip = new Rect(2, 2, 6, 6);
      const canvas = new ClipCanvas(ctx, clip);
      const nested = canvas.withClip(new Rect(4, 4, 4, 4));

      // Inside nested clip
      nested.drawChar(4, 4, 'A');
      expect(screen.getCell(4, 4).char).toBe('A');

      // Inside outer but outside nested
      nested.drawChar(2, 2, 'X');
      expect(screen.getCell(2, 2).char).toBe(' ');

      // Outside both
      nested.drawChar(0, 0, 'X');
      expect(screen.getCell(0, 0).char).toBe(' ');
    });

    test('nested clip does not expand parent clip', () => {
      const clip = new Rect(3, 3, 2, 2); // (3,3) to (4,4)
      const canvas = new ClipCanvas(ctx, clip);
      const nested = canvas.withClip(new Rect(0, 0, 20, 20));

      // Still restricted to parent
      nested.drawChar(3, 3, 'A');
      expect(screen.getCell(3, 3).char).toBe('A');

      nested.drawChar(5, 5, 'X');
      expect(screen.getCell(5, 5).char).toBe(' ');
    });
  });

  // =========================================================================
  // Zero-size clip
  // =========================================================================

  describe('zero-size clip', () => {
    test('draws nothing with zero-width clip', () => {
      const clip = new Rect(5, 5, 0, 5);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(5, 5, 'X');
      canvas.drawText(5, 5, 'Hello');
      canvas.fillRect(5, 5, 3, 3, '#');

      expect(screen.getCell(5, 5).char).toBe(' ');
    });

    test('draws nothing with zero-height clip', () => {
      const clip = new Rect(5, 5, 5, 0);
      const canvas = new ClipCanvas(ctx, clip);

      canvas.drawChar(5, 5, 'X');
      expect(screen.getCell(5, 5).char).toBe(' ');
    });
  });
});
