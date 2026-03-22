// Tests for RenderText selection support and character position tracking
// Phase 14, Plan 01: Text Selection + Position Tracking

import { describe, it, expect } from 'bun:test';
import { TextStyle } from '../../core/text-style';
import { TextSpan } from '../../core/text-span';
import { Color } from '../../core/color';
import { Offset, Rect } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import {
  RenderText,
  TextSelectionRange,
  CharacterPosition,
  VisualLine,
} from '../text';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class TestPaintContext {
  chars: { col: number; row: number; char: string; style?: TextStyle }[] = [];

  drawChar(col: number, row: number, char: string, style?: TextStyle): void {
    this.chars.push({ col, row, char, style });
  }

  /** Get all characters on a given row as a string. */
  getRow(row: number): string {
    return this.chars
      .filter((c) => c.row === row)
      .sort((a, b) => a.col - b.col)
      .map((c) => c.char)
      .join('');
  }

  /** Get chars with their styles at a specific row. */
  getRowWithStyles(row: number): { col: number; char: string; style?: TextStyle }[] {
    return this.chars
      .filter((c) => c.row === row)
      .sort((a, b) => a.col - b.col);
  }
}

function createRenderText(text: string, opts?: {
  textAlign?: 'left' | 'center' | 'right';
  maxLines?: number;
  selectable?: boolean;
  selectionColor?: Color;
  copyHighlightColor?: Color;
  selectableId?: string;
}): RenderText {
  return new RenderText({
    text: new TextSpan({ text }),
    textAlign: opts?.textAlign,
    maxLines: opts?.maxLines,
    selectable: opts?.selectable,
    selectionColor: opts?.selectionColor,
    copyHighlightColor: opts?.copyHighlightColor,
    selectableId: opts?.selectableId,
  });
}

function layoutAndPaint(rt: RenderText, maxWidth = 80, maxHeight = 24): TestPaintContext {
  rt.layout(new BoxConstraints({ maxWidth, maxHeight }));
  const ctx = new TestPaintContext();
  rt.paint(ctx as any, Offset.zero);
  return ctx;
}

// ---------------------------------------------------------------------------
// Selection state tests
// ---------------------------------------------------------------------------

describe('RenderText selection state', () => {
  it('defaults to non-selectable with no selection', () => {
    const rt = createRenderText('hello');
    expect(rt.selectable).toBe(false);
    expect(rt.selectedRanges).toEqual([]);
    expect(rt.highlightMode).toBe('none');
    expect(rt.selectionColor).toBeUndefined();
    expect(rt.copyHighlightColor).toBeUndefined();
    expect(rt.selectableId).toBeUndefined();
  });

  it('can be constructed with selectable options', () => {
    const selColor = Color.rgb(60, 80, 120);
    const copyColor = Color.rgb(80, 120, 60);
    const rt = createRenderText('hello', {
      selectable: true,
      selectionColor: selColor,
      copyHighlightColor: copyColor,
      selectableId: 'text-1',
    });
    expect(rt.selectable).toBe(true);
    expect(rt.selectionColor!.equals(selColor)).toBe(true);
    expect(rt.copyHighlightColor!.equals(copyColor)).toBe(true);
    expect(rt.selectableId).toBe('text-1');
  });

  it('updateSelection sets range and mode', () => {
    const rt = createRenderText('hello world');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    rt.updateSelection(2, 7, 'selection');

    expect(rt.selectedRanges.length).toBe(1);
    expect(rt.selectedRanges[0]!.start).toBe(2);
    expect(rt.selectedRanges[0]!.end).toBe(7);
    expect(rt.highlightMode).toBe('selection');
  });

  it('updateSelection clamps out-of-range indices', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // 'hello' has 5 characters (indices 0-4)
    rt.updateSelection(-5, 100, 'selection');

    expect(rt.selectedRanges[0]!.start).toBe(0);
    expect(rt.selectedRanges[0]!.end).toBe(5); // clamped to total chars
  });

  it('updateSelection with copy mode', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    rt.updateSelection(0, 3, 'copy');
    expect(rt.highlightMode).toBe('copy');
  });

  it('clearSelection resets all selection state', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    rt.updateSelection(1, 4, 'selection');
    expect(rt.selectedRanges.length).toBe(1);
    expect(rt.highlightMode).toBe('selection');

    rt.clearSelection();
    expect(rt.selectedRanges.length).toBe(0);
    expect(rt.highlightMode).toBe('none');
  });

  it('clearSelection is a no-op when already cleared', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // Should not throw or change state
    rt.clearSelection();
    expect(rt.selectedRanges.length).toBe(0);
    expect(rt.highlightMode).toBe('none');
  });

  it('selectionColor setter triggers repaint when highlighting is active', () => {
    const rt = createRenderText('hello', { selectable: true });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    rt.updateSelection(0, 3, 'selection');

    // Setting color should mark needs paint
    rt.selectionColor = Color.rgb(100, 100, 100);
    expect(rt.selectionColor!.equals(Color.rgb(100, 100, 100))).toBe(true);
  });

  it('copyHighlightColor setter works', () => {
    const rt = createRenderText('hello', { selectable: true });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const copyColor = Color.rgb(200, 100, 50);
    rt.copyHighlightColor = copyColor;
    expect(rt.copyHighlightColor!.equals(copyColor)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Selection painting tests
// ---------------------------------------------------------------------------

describe('RenderText selection painting', () => {
  it('paints normally when not selectable', () => {
    const rt = createRenderText('hello');
    rt.selectable = false;
    rt.selectedRanges = [{ start: 0, end: 5 }];

    const ctx = layoutAndPaint(rt);
    // No highlighting should be applied even with selectedRanges set
    for (const ch of ctx.chars) {
      expect(ch.style?.background).toBeUndefined();
    }
  });

  it('paints with selection highlight when selectable', () => {
    const selColor = Color.rgb(60, 80, 120);
    const rt = createRenderText('hello', {
      selectable: true,
      selectionColor: selColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    rt.updateSelection(1, 4, 'selection');

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // Characters 0 and 4 should NOT have highlight
    expect(ctx.chars[0]!.style?.background).toBeUndefined();
    expect(ctx.chars[4]!.style?.background).toBeUndefined();

    // Characters 1, 2, 3 should have highlight background
    expect(ctx.chars[1]!.style?.background?.equals(selColor)).toBe(true);
    expect(ctx.chars[2]!.style?.background?.equals(selColor)).toBe(true);
    expect(ctx.chars[3]!.style?.background?.equals(selColor)).toBe(true);
  });

  it('uses copy highlight color in copy mode', () => {
    const selColor = Color.rgb(60, 80, 120);
    const copyColor = Color.rgb(120, 80, 60);
    const rt = createRenderText('hello', {
      selectable: true,
      selectionColor: selColor,
      copyHighlightColor: copyColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    rt.updateSelection(0, 3, 'copy');

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // Characters 0, 1, 2 should use copy highlight color
    expect(ctx.chars[0]!.style?.background?.equals(copyColor)).toBe(true);
    expect(ctx.chars[1]!.style?.background?.equals(copyColor)).toBe(true);
    expect(ctx.chars[2]!.style?.background?.equals(copyColor)).toBe(true);
  });

  it('falls back to selection color when copy color not set', () => {
    const selColor = Color.rgb(60, 80, 120);
    const rt = createRenderText('hello', {
      selectable: true,
      selectionColor: selColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    rt.updateSelection(0, 2, 'copy');

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // Should fall back to selectionColor
    expect(ctx.chars[0]!.style?.background?.equals(selColor)).toBe(true);
    expect(ctx.chars[1]!.style?.background?.equals(selColor)).toBe(true);
  });

  it('does not highlight when highlight mode is none', () => {
    const selColor = Color.rgb(60, 80, 120);
    const rt = createRenderText('hello', {
      selectable: true,
      selectionColor: selColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    // Directly set ranges without using updateSelection (which sets mode)
    rt.selectedRanges = [{ start: 0, end: 5 }];

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // No highlight because highlightMode is 'none'
    for (const ch of ctx.chars) {
      expect(ch.style?.background).toBeUndefined();
    }
  });

  it('highlights across multiple lines', () => {
    const selColor = Color.rgb(60, 80, 120);
    const rt = new RenderText({
      text: new TextSpan({ text: 'ab\ncd\nef' }),
      selectable: true,
      selectionColor: selColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // Select from character 1 ('b') through character 4 ('d')
    // Line 0: 'a'(0), 'b'(1) -- newline not counted
    // Line 1: 'c'(2), 'd'(3)
    // Line 2: 'e'(4), 'f'(5)
    rt.updateSelection(1, 5, 'selection');

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // 'a' at index 0 — not highlighted
    expect(ctx.chars[0]!.char).toBe('a');
    expect(ctx.chars[0]!.style?.background).toBeUndefined();

    // 'b' at index 1 — highlighted
    expect(ctx.chars[1]!.char).toBe('b');
    expect(ctx.chars[1]!.style?.background?.equals(selColor)).toBe(true);

    // 'c' at index 2 — highlighted
    expect(ctx.chars[2]!.char).toBe('c');
    expect(ctx.chars[2]!.style?.background?.equals(selColor)).toBe(true);

    // 'd' at index 3 — highlighted
    expect(ctx.chars[3]!.char).toBe('d');
    expect(ctx.chars[3]!.style?.background?.equals(selColor)).toBe(true);

    // 'e' at index 4 — highlighted
    expect(ctx.chars[4]!.char).toBe('e');
    expect(ctx.chars[4]!.style?.background?.equals(selColor)).toBe(true);

    // 'f' at index 5 — not highlighted
    expect(ctx.chars[5]!.char).toBe('f');
    expect(ctx.chars[5]!.style?.background).toBeUndefined();
  });

  it('preserves existing style attributes when highlighting', () => {
    const selColor = Color.rgb(60, 80, 120);
    const boldStyle = new TextStyle({ bold: true, foreground: Color.red });
    const rt = new RenderText({
      text: new TextSpan({ text: 'abc', style: boldStyle }),
      selectable: true,
      selectionColor: selColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    rt.updateSelection(0, 3, 'selection');

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // All characters should be highlighted AND keep bold + foreground
    for (const ch of ctx.chars) {
      expect(ch.style?.bold).toBe(true);
      expect(ch.style?.foreground?.equals(Color.red)).toBe(true);
      expect(ch.style?.background?.equals(selColor)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Character position cache tests
// ---------------------------------------------------------------------------

describe('RenderText character position cache', () => {
  it('populates character positions during layout', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const positions = rt.characterPositions;
    expect(positions.length).toBe(5);

    // 'h' at col 0, 'e' at col 1, 'l' at col 2, 'l' at col 3, 'o' at col 4
    expect(positions[0]).toEqual({ col: 0, row: 0, width: 1 });
    expect(positions[1]).toEqual({ col: 1, row: 0, width: 1 });
    expect(positions[2]).toEqual({ col: 2, row: 0, width: 1 });
    expect(positions[3]).toEqual({ col: 3, row: 0, width: 1 });
    expect(positions[4]).toEqual({ col: 4, row: 0, width: 1 });
  });

  it('tracks multi-line character positions', () => {
    const rt = createRenderText('ab\ncd');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const positions = rt.characterPositions;
    expect(positions.length).toBe(4); // newline is not a character position

    expect(positions[0]).toEqual({ col: 0, row: 0, width: 1 }); // 'a'
    expect(positions[1]).toEqual({ col: 1, row: 0, width: 1 }); // 'b'
    expect(positions[2]).toEqual({ col: 0, row: 1, width: 1 }); // 'c'
    expect(positions[3]).toEqual({ col: 1, row: 1, width: 1 }); // 'd'
  });

  it('handles CJK characters with width 2', () => {
    const rt = createRenderText('a\u4F60b'); // a你b
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const positions = rt.characterPositions;
    expect(positions.length).toBe(3);

    expect(positions[0]).toEqual({ col: 0, row: 0, width: 1 }); // 'a'
    expect(positions[1]).toEqual({ col: 1, row: 0, width: 2 }); // '你'
    expect(positions[2]).toEqual({ col: 3, row: 0, width: 1 }); // 'b'
  });

  it('accounts for center alignment in positions', () => {
    const rt = createRenderText('hi', { textAlign: 'center' });
    rt.layout(new BoxConstraints({ minWidth: 10, maxWidth: 10, maxHeight: 24 }));

    const positions = rt.characterPositions;
    // 'hi' is 2 wide, container is 10, left offset = floor((10-2)/2) = 4
    expect(positions[0]).toEqual({ col: 4, row: 0, width: 1 }); // 'h'
    expect(positions[1]).toEqual({ col: 5, row: 0, width: 1 }); // 'i'
  });

  it('accounts for right alignment in positions', () => {
    const rt = createRenderText('hi', { textAlign: 'right' });
    rt.layout(new BoxConstraints({ minWidth: 10, maxWidth: 10, maxHeight: 24 }));

    const positions = rt.characterPositions;
    // 'hi' is 2 wide, container is 10, left offset = 10 - 2 = 8
    expect(positions[0]).toEqual({ col: 8, row: 0, width: 1 }); // 'h'
    expect(positions[1]).toEqual({ col: 9, row: 0, width: 1 }); // 'i'
  });

  it('rebuilds cache on re-layout', () => {
    const rt = createRenderText('abc');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(rt.characterPositions.length).toBe(3);

    // Change text and re-layout
    rt.text = new TextSpan({ text: 'abcdef' });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));
    expect(rt.characterPositions.length).toBe(6);
  });

  it('handles empty text', () => {
    const rt = createRenderText('');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    expect(rt.characterPositions.length).toBe(0);
    expect(rt.visualLines.length).toBe(1); // one empty line
    expect(rt.visualLines[0]!.startIndex).toBe(0);
    expect(rt.visualLines[0]!.endIndex).toBe(0);
  });

  it('respects maxLines for position cache', () => {
    const rt = createRenderText('ab\ncd\nef', { maxLines: 2 });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // Only 2 lines, so only 4 characters
    expect(rt.characterPositions.length).toBe(4);
    expect(rt.visualLines.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Visual line tests
// ---------------------------------------------------------------------------

describe('RenderText visual lines', () => {
  it('creates visual lines for single line', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const lines = rt.visualLines;
    expect(lines.length).toBe(1);
    expect(lines[0]).toEqual({ startIndex: 0, endIndex: 5, row: 0 });
  });

  it('creates visual lines for multi-line text', () => {
    const rt = createRenderText('ab\ncd\nef');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const lines = rt.visualLines;
    expect(lines.length).toBe(3);
    expect(lines[0]).toEqual({ startIndex: 0, endIndex: 2, row: 0 }); // 'ab'
    expect(lines[1]).toEqual({ startIndex: 2, endIndex: 4, row: 1 }); // 'cd'
    expect(lines[2]).toEqual({ startIndex: 4, endIndex: 6, row: 2 }); // 'ef'
  });

  it('handles lines with varying lengths', () => {
    const rt = createRenderText('hello\nhi\nworld!');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const lines = rt.visualLines;
    expect(lines.length).toBe(3);
    expect(lines[0]).toEqual({ startIndex: 0, endIndex: 5, row: 0 });  // 'hello'
    expect(lines[1]).toEqual({ startIndex: 5, endIndex: 7, row: 1 });  // 'hi'
    expect(lines[2]).toEqual({ startIndex: 7, endIndex: 13, row: 2 }); // 'world!'
  });
});

// ---------------------------------------------------------------------------
// getCharacterRect tests
// ---------------------------------------------------------------------------

describe('RenderText.getCharacterRect', () => {
  it('returns correct rect for ASCII characters', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const rect = rt.getCharacterRect(0);
    expect(rect).not.toBeNull();
    expect(rect!.left).toBe(0);
    expect(rect!.top).toBe(0);
    expect(rect!.width).toBe(1);
    expect(rect!.height).toBe(1);

    const rect2 = rt.getCharacterRect(3);
    expect(rect2).not.toBeNull();
    expect(rect2!.left).toBe(3);
    expect(rect2!.top).toBe(0);
    expect(rect2!.width).toBe(1);
    expect(rect2!.height).toBe(1);
  });

  it('returns correct rect for CJK characters', () => {
    const rt = createRenderText('a\u4F60b'); // a你b
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const rectCjk = rt.getCharacterRect(1); // '你'
    expect(rectCjk).not.toBeNull();
    expect(rectCjk!.left).toBe(1);
    expect(rectCjk!.top).toBe(0);
    expect(rectCjk!.width).toBe(2); // CJK character is width 2
  });

  it('returns null for out-of-range index', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    expect(rt.getCharacterRect(-1)).toBeNull();
    expect(rt.getCharacterRect(5)).toBeNull();
    expect(rt.getCharacterRect(100)).toBeNull();
  });

  it('returns correct rect for characters on different lines', () => {
    const rt = createRenderText('ab\ncd');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // 'c' is character index 2, on row 1
    const rect = rt.getCharacterRect(2);
    expect(rect).not.toBeNull();
    expect(rect!.left).toBe(0);
    expect(rect!.top).toBe(1);
    expect(rect!.width).toBe(1);
    expect(rect!.height).toBe(1);
  });

  it('returns correct rect with center alignment', () => {
    const rt = createRenderText('hi', { textAlign: 'center' });
    rt.layout(new BoxConstraints({ minWidth: 10, maxWidth: 10, maxHeight: 24 }));

    const rect = rt.getCharacterRect(0); // 'h'
    expect(rect).not.toBeNull();
    expect(rect!.left).toBe(4); // centered offset
    expect(rect!.width).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getOffsetForPosition tests
// ---------------------------------------------------------------------------

describe('RenderText.getOffsetForPosition', () => {
  it('returns correct index for position on first character', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    expect(rt.getOffsetForPosition(0, 0)).toBe(0); // 'h'
  });

  it('returns correct index for position in the middle', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // At x=2, 'e'(center 1.5, dist 0.5) ties with 'l'(center 2.5, dist 0.5).
    // Tie goes to first match (index 1 = 'e'). Use x=2.5 for exact 'l' center.
    expect(rt.getOffsetForPosition(2, 0)).toBe(1); // tie, first match = 'e'
    expect(rt.getOffsetForPosition(3, 0)).toBe(2); // 'l' at index 2, center 2.5 vs 'l' at index 3 center 3.5 -> tie again at 3, first = index 2
  });

  it('returns last character for position past end of line', () => {
    const rt = createRenderText('hello');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    expect(rt.getOffsetForPosition(10, 0)).toBe(4); // 'o' (last char)
  });

  it('returns -1 for empty text', () => {
    const rt = createRenderText('');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    expect(rt.getOffsetForPosition(0, 0)).toBe(-1);
  });

  it('finds correct character on second line', () => {
    const rt = createRenderText('ab\ncd');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // Row 1, col 0 = 'c' which is character index 2
    expect(rt.getOffsetForPosition(0, 1)).toBe(2);
    // Row 1, col 1: 'c'(center 0.5, dist 0.5) ties with 'd'(center 1.5, dist 0.5)
    // Tie goes to first match = 'c' (index 2)
    expect(rt.getOffsetForPosition(1, 1)).toBe(2);
    // Past the end of line: should be last char 'd' (index 3)
    expect(rt.getOffsetForPosition(5, 1)).toBe(3);
  });

  it('snaps to nearest row when y is between lines', () => {
    const rt = createRenderText('ab\ncd\nef');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // y=5 is past all lines (0, 1, 2), should snap to line 2 (row 2)
    const idx = rt.getOffsetForPosition(0, 5);
    expect(idx).toBe(4); // 'e' on line 2
  });

  it('handles CJK character hit testing', () => {
    const rt = createRenderText('a\u4F60b'); // a你b
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // 'a' is at col 0 (center 0.5)
    // '你' is at col 1, width 2 (center 2.0)
    // 'b' is at col 3 (center 3.5)

    expect(rt.getOffsetForPosition(0, 0)).toBe(0); // 'a' — closest to col 0
    expect(rt.getOffsetForPosition(2, 0)).toBe(1); // '你' — center is at 2.0
    expect(rt.getOffsetForPosition(3, 0)).toBe(2); // 'b' — center is at 3.5, closer than '你' center at 2.0
  });

  it('handles center-aligned text positions', () => {
    const rt = createRenderText('hi', { textAlign: 'center' });
    rt.layout(new BoxConstraints({ minWidth: 10, maxWidth: 10, maxHeight: 24 }));

    // 'h' at col 4 (center 4.5), 'i' at col 5 (center 5.5)
    expect(rt.getOffsetForPosition(4, 0)).toBe(0); // 'h'
    // x=5 is equidistant from h(4.5) and i(5.5), tie goes to first = 'h'
    expect(rt.getOffsetForPosition(5, 0)).toBe(0);
    // x=6 is past end of 'i' (col 5 + width 1 = 6), returns last char
    expect(rt.getOffsetForPosition(6, 0)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('RenderText selection + position integration', () => {
  it('selection maps correctly to character positions', () => {
    const selColor = Color.rgb(60, 80, 120);
    const rt = new RenderText({
      text: new TextSpan({ text: 'hello world' }),
      selectable: true,
      selectionColor: selColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // Select "world" directly using known indices (6-10)
    rt.updateSelection(6, 11, 'selection');

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // Characters 0-5 (including space) should NOT be highlighted
    for (let i = 0; i < 6; i++) {
      expect(ctx.chars[i]!.style?.background).toBeUndefined();
    }

    // Characters 6-10 should be highlighted ("world")
    for (let i = 6; i <= 10; i++) {
      expect(ctx.chars[i]!.style?.background?.equals(selColor)).toBe(true);
    }
  });

  it('getCharacterRect returns positions that match paint output', () => {
    const rt = createRenderText('abc');
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    for (let i = 0; i < 3; i++) {
      const rect = rt.getCharacterRect(i)!;
      expect(rect.left).toBe(ctx.chars[i]!.col);
      expect(rect.top).toBe(ctx.chars[i]!.row);
    }
  });

  it('styled text spans work with selection', () => {
    const selColor = Color.rgb(60, 80, 120);
    const rt = new RenderText({
      text: new TextSpan({
        children: [
          new TextSpan({ text: 'bold', style: new TextStyle({ bold: true }) }),
          new TextSpan({ text: 'normal' }),
        ],
      }),
      selectable: true,
      selectionColor: selColor,
    });
    rt.layout(new BoxConstraints({ maxWidth: 80, maxHeight: 24 }));

    // Select across both spans (indices 2-6 = "ldno")
    rt.updateSelection(2, 6, 'selection');

    const ctx = new TestPaintContext();
    rt.paint(ctx as any, Offset.zero);

    // 'l' at index 2 (bold span) — highlighted with bold preserved
    expect(ctx.chars[2]!.style?.bold).toBe(true);
    expect(ctx.chars[2]!.style?.background?.equals(selColor)).toBe(true);

    // 'n' at index 4 (normal span) — highlighted without bold
    expect(ctx.chars[4]!.style?.bold).toBeUndefined();
    expect(ctx.chars[4]!.style?.background?.equals(selColor)).toBe(true);
  });
});
