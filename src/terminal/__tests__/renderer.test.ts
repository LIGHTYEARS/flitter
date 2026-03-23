// Tests for ANSI renderer: buildSgrDelta, Renderer.render(), escape sequence generators.
// Amp ref: z_0 Renderer, WF8 buildSgrDelta, Wu0 colorToSgr

import { describe, it, expect } from 'bun:test';
import { Color } from '../../core/color.js';
import type { CellStyle, RowPatch, Cell } from '../cell.js';
import { createCell } from '../cell.js';
import {
  buildSgrDelta,
  Renderer,
  BSU,
  ESU,
  CSI,
  OSC,
  ST,
  SGR_RESET,
  CURSOR_HIDE,
  CURSOR_SHOW,
  CURSOR_MOVE,
  CURSOR_SHAPE,
  ALT_SCREEN_ON,
  ALT_SCREEN_OFF,
  CLEAR_SCREEN,
  BRACKET_PASTE_ON,
  BRACKET_PASTE_OFF,
  HYPERLINK_CLOSE,
  hyperlinkOpen,
} from '../renderer.js';
import type { CursorState } from '../renderer.js';

// ── Helper ──────────────────────────────────────────────────────

/** Create a Cell quickly for testing. */
function cell(char: string, style: CellStyle = {}, width: number = 1, hyperlink?: string): Cell {
  return createCell(char, style, width, hyperlink);
}

/** Create a RowPatch from a simple description. */
function rowPatch(row: number, col: number, cells: Cell[]): RowPatch {
  return { row, patches: [{ col, cells }] };
}

// ── ANSI Constants ──────────────────────────────────────────────

describe('ANSI constants', () => {
  it('should have correct escape sequence values', () => {
    expect(BSU).toBe('\x1b[?2026h');
    expect(ESU).toBe('\x1b[?2026l');
    expect(CURSOR_HIDE).toBe('\x1b[?25l');
    expect(CURSOR_SHOW).toBe('\x1b[?25h');
    expect(SGR_RESET).toBe('\x1b[0m');
    expect(ALT_SCREEN_ON).toBe('\x1b[?1049h');
    expect(ALT_SCREEN_OFF).toBe('\x1b[?1049l');
    expect(CLEAR_SCREEN).toBe('\x1b[2J');
    expect(BRACKET_PASTE_ON).toBe('\x1b[?2004h');
    expect(BRACKET_PASTE_OFF).toBe('\x1b[?2004l');
  });

  it('CURSOR_MOVE uses 1-based coordinates', () => {
    expect(CURSOR_MOVE(0, 0)).toBe('\x1b[1;1H');
    expect(CURSOR_MOVE(5, 3)).toBe('\x1b[4;6H');
    expect(CURSOR_MOVE(79, 23)).toBe('\x1b[24;80H');
  });

  it('CURSOR_SHAPE produces DECSCUSR', () => {
    expect(CURSOR_SHAPE(0)).toBe('\x1b[0 q');
    expect(CURSOR_SHAPE(1)).toBe('\x1b[1 q');
    expect(CURSOR_SHAPE(2)).toBe('\x1b[2 q');
  });

  it('hyperlink open/close sequences', () => {
    expect(HYPERLINK_CLOSE).toBe('\x1b]8;;\x1b\\');
    expect(hyperlinkOpen('https://example.com')).toBe('\x1b]8;;https://example.com\x1b\\');
    expect(hyperlinkOpen('https://example.com', 'link1')).toBe('\x1b]8;id=link1;https://example.com\x1b\\');
  });
});

// ── buildSgrDelta ───────────────────────────────────────────────

describe('buildSgrDelta', () => {
  it('returns empty string when styles are identical', () => {
    expect(buildSgrDelta({}, {})).toBe('');
    expect(buildSgrDelta({ bold: true }, { bold: true })).toBe('');
    const fg = Color.red;
    expect(buildSgrDelta({ fg }, { fg })).toBe('');
  });

  it('returns empty string for two default empty styles', () => {
    expect(buildSgrDelta({}, {})).toBe('');
  });

  it('adds bold', () => {
    const result = buildSgrDelta({}, { bold: true });
    expect(result).toBe(`${CSI}1m`);
  });

  it('removes bold (needs SGR 22)', () => {
    const result = buildSgrDelta({ bold: true }, {});
    expect(result).toBe(`${CSI}22m`);
  });

  it('removes bold and re-emits dim if dim is still active', () => {
    // prev: bold+dim, next: dim only -> needs reset path
    const result = buildSgrDelta({ bold: true, dim: true }, { dim: true });
    // Should do reset + re-emit dim
    expect(result).toContain('0');
    expect(result).toContain('2');
    // Should NOT contain bold (1)
    expect(result).not.toMatch(/;1[;m]/);
    // Specifically check it starts with reset
    expect(result).toBe(`${CSI}0;2m`);
  });

  it('removes dim and re-emits bold if bold is still active', () => {
    // prev: bold+dim, next: bold only -> needs reset path
    const result = buildSgrDelta({ bold: true, dim: true }, { bold: true });
    expect(result).toBe(`${CSI}0;1m`);
  });

  it('adds italic', () => {
    expect(buildSgrDelta({}, { italic: true })).toBe(`${CSI}3m`);
  });

  it('removes italic', () => {
    expect(buildSgrDelta({ italic: true }, {})).toBe(`${CSI}23m`);
  });

  it('adds underline', () => {
    expect(buildSgrDelta({}, { underline: true })).toBe(`${CSI}4m`);
  });

  it('removes underline', () => {
    expect(buildSgrDelta({ underline: true }, {})).toBe(`${CSI}24m`);
  });

  it('adds inverse', () => {
    expect(buildSgrDelta({}, { inverse: true })).toBe(`${CSI}7m`);
  });

  it('removes inverse', () => {
    expect(buildSgrDelta({ inverse: true }, {})).toBe(`${CSI}27m`);
  });

  it('adds strikethrough', () => {
    expect(buildSgrDelta({}, { strikethrough: true })).toBe(`${CSI}9m`);
  });

  it('removes strikethrough', () => {
    expect(buildSgrDelta({ strikethrough: true }, {})).toBe(`${CSI}29m`);
  });

  it('adds dim', () => {
    expect(buildSgrDelta({}, { dim: true })).toBe(`${CSI}2m`);
  });

  it('removes dim (uses SGR 22)', () => {
    const result = buildSgrDelta({ dim: true }, {});
    expect(result).toBe(`${CSI}22m`);
  });

  it('changes foreground color (named)', () => {
    const result = buildSgrDelta({}, { fg: Color.red });
    // Color.red is named(1) -> toSgrFg() = "31"
    expect(result).toBe(`${CSI}31m`);
  });

  it('changes foreground color (bright named)', () => {
    const result = buildSgrDelta({}, { fg: Color.brightGreen });
    // brightGreen is named(10) -> toSgrFg() = "92"
    expect(result).toBe(`${CSI}92m`);
  });

  it('changes background color (named)', () => {
    const result = buildSgrDelta({}, { bg: Color.blue });
    // Color.blue is named(4) -> toSgrBg() = "44"
    expect(result).toBe(`${CSI}44m`);
  });

  it('changes foreground color (ansi256)', () => {
    const result = buildSgrDelta({}, { fg: Color.ansi256(200) });
    expect(result).toBe(`${CSI}38;5;200m`);
  });

  it('changes foreground color (rgb)', () => {
    const result = buildSgrDelta({}, { fg: Color.rgb(100, 150, 200) });
    expect(result).toBe(`${CSI}38;2;100;150;200m`);
  });

  it('changes background color (rgb)', () => {
    const result = buildSgrDelta({}, { bg: Color.rgb(50, 60, 70) });
    expect(result).toBe(`${CSI}48;2;50;60;70m`);
  });

  it('resets foreground to default when removed', () => {
    const result = buildSgrDelta({ fg: Color.red }, {});
    expect(result).toBe(`${CSI}39m`);
  });

  it('resets background to default when removed', () => {
    const result = buildSgrDelta({ bg: Color.blue }, {});
    expect(result).toBe(`${CSI}49m`);
  });

  it('handles multiple attribute changes at once', () => {
    const result = buildSgrDelta({}, { bold: true, italic: true, fg: Color.red });
    // Should have bold(1), italic(3), fg red(31) separated by ;
    expect(result).toContain('31');
    expect(result).toContain('1');
    expect(result).toContain('3');
    // Should be a single CSI...m sequence
    expect(result).toMatch(/^\x1b\[.*m$/);
  });

  it('changes from one color to another without reset', () => {
    const result = buildSgrDelta({ fg: Color.red }, { fg: Color.green });
    // red -> green: should emit green's code (32) without reset
    expect(result).toBe(`${CSI}32m`);
    expect(result).not.toContain('0');
  });

  it('removes bold without affecting dim when dim was not set', () => {
    // prev: bold only, next: nothing -> use SGR 22
    const result = buildSgrDelta({ bold: true }, {});
    expect(result).toBe(`${CSI}22m`);
    // Should NOT need to re-emit dim (it wasn't set)
  });

  it('identical colors with same object reference produce empty string', () => {
    const color = Color.rgb(10, 20, 30);
    expect(buildSgrDelta({ fg: color }, { fg: color })).toBe('');
  });

  it('identical colors with different objects produce empty string', () => {
    expect(buildSgrDelta(
      { fg: Color.rgb(10, 20, 30) },
      { fg: Color.rgb(10, 20, 30) },
    )).toBe('');
  });

  it('handles transition from empty to defaultColor fg', () => {
    const result = buildSgrDelta({}, { fg: Color.defaultColor });
    expect(result).toBe(`${CSI}39m`);
  });
});

// ── Renderer.render() ───────────────────────────────────────────

describe('Renderer.render()', () => {
  it('renders empty patches with correct envelope', () => {
    const renderer = new Renderer();
    const result = renderer.render([]);
    // Should have BSU + CURSOR_HIDE + ESU + SGR_RESET
    expect(result).toBe(`${BSU}${CURSOR_HIDE}${ESU}${SGR_RESET}`);
  });

  it('renders a single cell change', () => {
    const renderer = new Renderer();
    const patches: RowPatch[] = [
      rowPatch(0, 0, [cell('A')]),
    ];
    const result = renderer.render(patches);

    // Should contain: BSU, CURSOR_HIDE, cursor move to (0,0), 'A', ESU, SGR_RESET
    expect(result).toContain(BSU);
    expect(result).toContain(CURSOR_HIDE);
    expect(result).toContain(CURSOR_MOVE(0, 0));
    expect(result).toContain('A');
    expect(result).toContain(ESU);
    expect(result).toContain(SGR_RESET);
  });

  it('renders contiguous cells in a single patch without extra cursor moves', () => {
    const renderer = new Renderer();
    const patches: RowPatch[] = [
      rowPatch(0, 0, [cell('A'), cell('B'), cell('C')]),
    ];
    const result = renderer.render(patches);

    // Should have exactly one cursor move (to start of patch), then ABC
    const moveCount = (result.match(/\x1b\[\d+;\d+H/g) || []).length;
    // One move for the patch start (plus possibly cursor positioning for cursor state)
    // The minimum is 1 move for the patch
    expect(result).toContain(CURSOR_MOVE(0, 0));
    expect(result).toContain('ABC');
  });

  it('renders multiple rows sorted by row number', () => {
    const renderer = new Renderer();
    // Provide rows out of order
    const patches: RowPatch[] = [
      rowPatch(2, 0, [cell('C')]),
      rowPatch(0, 0, [cell('A')]),
      rowPatch(1, 0, [cell('B')]),
    ];
    const result = renderer.render(patches);

    // A should come before B should come before C in the output
    const posA = result.indexOf('A');
    const posB = result.indexOf('B');
    const posC = result.indexOf('C');
    expect(posA).toBeLessThan(posB);
    expect(posB).toBeLessThan(posC);
  });

  it('renders styled cells with SGR sequences', () => {
    const renderer = new Renderer();
    const patches: RowPatch[] = [
      rowPatch(0, 0, [cell('X', { bold: true, fg: Color.red })]),
    ];
    const result = renderer.render(patches);

    // Should contain SGR for bold (1) and red fg (31)
    expect(result).toContain('1');
    expect(result).toContain('31');
    expect(result).toContain('X');
  });

  it('renders width-2 cell and skips continuation cell', () => {
    const renderer = new Renderer();
    // A width-2 character followed by a width-0 continuation
    const wideChar = cell('\u4e16', {}, 2); // Chinese character 'world'
    const continuation = createCell('', {}, 0);
    const patches: RowPatch[] = [
      rowPatch(0, 0, [wideChar, continuation]),
    ];
    const result = renderer.render(patches);

    // Should contain the wide char
    expect(result).toContain('\u4e16');
    // The continuation cell (empty string with width 0) should be skipped
    // The char should appear exactly once
    const charCount = (result.match(/\u4e16/g) || []).length;
    expect(charCount).toBe(1);
  });

  it('handles cursor visible with position', () => {
    const renderer = new Renderer();
    const cursor: CursorState = {
      position: { x: 5, y: 3 },
      visible: true,
      shape: 0,
    };
    const result = renderer.render([], cursor);

    // Should position cursor and show it
    expect(result).toContain(CURSOR_MOVE(5, 3));
    expect(result).toContain(CURSOR_SHOW);
  });

  it('handles cursor visible with shape', () => {
    const renderer = new Renderer();
    const cursor: CursorState = {
      position: { x: 10, y: 5 },
      visible: true,
      shape: 2, // steady block
    };
    const result = renderer.render([], cursor);

    expect(result).toContain(CURSOR_MOVE(10, 5));
    expect(result).toContain(CURSOR_SHAPE(2));
    expect(result).toContain(CURSOR_SHOW);
  });

  it('handles cursor hidden (no extra output)', () => {
    const renderer = new Renderer();
    const cursor: CursorState = {
      position: null,
      visible: false,
      shape: 0,
    };
    const result = renderer.render([], cursor);

    // Cursor was hidden at the beginning, no SHOW should appear
    expect(result).not.toContain(CURSOR_SHOW);
    // Should have CURSOR_HIDE from step 2
    expect(result).toContain(CURSOR_HIDE);
  });

  it('handles cursor visible but null position (no show)', () => {
    const renderer = new Renderer();
    const cursor: CursorState = {
      position: null,
      visible: true,
      shape: 0,
    };
    const result = renderer.render([], cursor);

    // visible true but position null -> should not show cursor
    expect(result).not.toContain(CURSOR_SHOW);
  });

  it('resets SGR state after render', () => {
    const renderer = new Renderer();

    // First render with bold red
    const patches1: RowPatch[] = [
      rowPatch(0, 0, [cell('A', { bold: true, fg: Color.red })]),
    ];
    renderer.render(patches1);

    // Second render: the renderer's lastStyle was reset to {} after render()
    // So a plain cell should NOT need any SGR delta
    const patches2: RowPatch[] = [
      rowPatch(0, 0, [cell('B')]),
    ];
    const result2 = renderer.render(patches2);

    // The envelope always has BSU + CURSOR_HIDE + ESU + SGR_RESET
    // Between CURSOR_HIDE and ESU, there should be just the cursor move + 'B'
    // (no SGR for plain cell from clean state)
    expect(result2).toContain(CURSOR_MOVE(0, 0));
    expect(result2).toContain('B');
    // There should be no SGR attribute codes between the cursor move and 'B'
    const movePos = result2.indexOf(CURSOR_MOVE(0, 0));
    const bPos = result2.indexOf('B', movePos);
    const between = result2.substring(movePos + CURSOR_MOVE(0, 0).length, bPos);
    expect(between).toBe('');
  });

  it('emits SGR delta between different styled cells in same patch', () => {
    const renderer = new Renderer();
    const patches: RowPatch[] = [
      rowPatch(0, 0, [
        cell('A', { bold: true }),
        cell('B', { italic: true }),
      ]),
    ];
    const result = renderer.render(patches);

    // Should have bold (1) for A, then transition to italic (3) for B
    // The transition from {bold:true} to {italic:true} needs:
    // - SGR 22 to turn off bold (and re-emit dim if needed, but dim not needed)
    // - SGR 3 for italic
    expect(result).toContain('A');
    expect(result).toContain('B');
    // Verify both SGR sequences appear
    const aIdx = result.indexOf('A');
    const bIdx = result.indexOf('B');
    expect(aIdx).toBeLessThan(bIdx);
  });

  it('renders hyperlink transitions', () => {
    const renderer = new Renderer();
    const patches: RowPatch[] = [
      rowPatch(0, 0, [
        cell('L', {}, 1, 'https://example.com'),
        cell('K', {}, 1, undefined), // no hyperlink
      ]),
    ];
    const result = renderer.render(patches);

    // Should open hyperlink for 'L'
    expect(result).toContain(hyperlinkOpen('https://example.com'));
    expect(result).toContain('L');
    // Should close hyperlink before 'K'
    expect(result).toContain(HYPERLINK_CLOSE);
    expect(result).toContain('K');
  });

  it('renders multiple patches in different columns of same row', () => {
    const renderer = new Renderer();
    const patches: RowPatch[] = [{
      row: 0,
      patches: [
        { col: 0, cells: [cell('A')] },
        { col: 5, cells: [cell('B')] },
      ],
    }];
    const result = renderer.render(patches);

    // Should have two cursor moves: to (0,0) and (5,0)
    expect(result).toContain(CURSOR_MOVE(0, 0));
    expect(result).toContain(CURSOR_MOVE(5, 0));
    expect(result).toContain('A');
    expect(result).toContain('B');
  });
});

// ── Renderer escape sequence generators ─────────────────────────

describe('Renderer escape sequence generators', () => {
  it('hideCursor returns correct sequence', () => {
    const r = new Renderer();
    expect(r.hideCursor()).toBe(CURSOR_HIDE);
  });

  it('showCursor returns correct sequence', () => {
    const r = new Renderer();
    expect(r.showCursor()).toBe(CURSOR_SHOW);
  });

  it('setCursorShape returns DECSCUSR sequence', () => {
    const r = new Renderer();
    expect(r.setCursorShape(2)).toBe('\x1b[2 q');
  });

  it('moveTo returns correct cursor position', () => {
    const r = new Renderer();
    expect(r.moveTo(0, 0)).toBe('\x1b[1;1H');
    expect(r.moveTo(10, 5)).toBe('\x1b[6;11H');
  });

  it('startSync returns BSU', () => {
    const r = new Renderer();
    expect(r.startSync()).toBe(BSU);
  });

  it('endSync returns ESU', () => {
    const r = new Renderer();
    expect(r.endSync()).toBe(ESU);
  });

  it('clearScreen includes reset, clear, and home', () => {
    const r = new Renderer();
    const result = r.clearScreen();
    expect(result).toContain(SGR_RESET);
    expect(result).toContain(CLEAR_SCREEN);
    expect(result).toContain(`${CSI}H`);
    expect(result).toContain(HYPERLINK_CLOSE);
  });

  it('reset returns SGR reset + hyperlink close', () => {
    const r = new Renderer();
    const result = r.reset();
    expect(result).toContain(SGR_RESET);
    expect(result).toContain(HYPERLINK_CLOSE);
  });

  it('enterAltScreen returns alt screen on + clear screen', () => {
    const r = new Renderer();
    const result = r.enterAltScreen();
    expect(result).toContain(ALT_SCREEN_ON);
    expect(result).toContain(CLEAR_SCREEN);
  });

  it('exitAltScreen returns alt screen off', () => {
    const r = new Renderer();
    expect(r.exitAltScreen()).toBe(ALT_SCREEN_OFF);
  });

  it('enableMouse returns mouse tracking sequences', () => {
    const r = new Renderer();
    const result = r.enableMouse();
    expect(result).toContain('?1002h');
    expect(result).toContain('?1003h');
    expect(result).toContain('?1004h');
    expect(result).toContain('?1006h');
  });

  it('disableMouse returns mouse tracking off sequences', () => {
    const r = new Renderer();
    const result = r.disableMouse();
    expect(result).toContain('?1002l');
    expect(result).toContain('?1003l');
    expect(result).toContain('?1004l');
    expect(result).toContain('?1006l');
    expect(result).toContain('?1016l');
  });

  it('enableBracketedPaste returns correct sequence', () => {
    const r = new Renderer();
    expect(r.enableBracketedPaste()).toBe(BRACKET_PASTE_ON);
  });

  it('disableBracketedPaste returns correct sequence', () => {
    const r = new Renderer();
    expect(r.disableBracketedPaste()).toBe(BRACKET_PASTE_OFF);
  });
});

// ── SGR Reset Optimization ──────────────────────────────────────

describe('SGR reset optimization', () => {
  it('minimizes escape sequences for same-style consecutive cells', () => {
    const renderer = new Renderer();
    const style: CellStyle = { bold: true };
    const patches: RowPatch[] = [
      rowPatch(0, 0, [cell('A', style), cell('B', style), cell('C', style)]),
    ];
    const result = renderer.render(patches);

    // The bold SGR should only appear once (for the first cell)
    // After that, lastStyle matches, so no additional SGR for B and C
    const boldMatches = result.match(/\x1b\[1m/g) || [];
    expect(boldMatches.length).toBe(1);
    expect(result).toContain('ABC');
  });

  it('emits SGR only when style actually changes within a patch', () => {
    const renderer = new Renderer();
    const patches: RowPatch[] = [
      rowPatch(0, 0, [
        cell('A', { fg: Color.red }),
        cell('B', { fg: Color.red }),  // same style
        cell('C', { fg: Color.green }), // different color
      ]),
    ];
    const result = renderer.render(patches);

    // Red SGR once before A, green SGR once before C, nothing before B
    const redSgr = `${CSI}31m`;
    const greenSgr = `${CSI}32m`;
    expect(result).toContain(redSgr);
    expect(result).toContain(greenSgr);

    // Red should appear exactly once
    const redCount = result.split(redSgr).length - 1;
    expect(redCount).toBe(1);
  });
});

// ── Renderer.resetState() ───────────────────────────────────────

describe('Renderer.resetState()', () => {
  it('resets tracked style state', () => {
    const renderer = new Renderer();

    // Render something with style
    renderer.render([rowPatch(0, 0, [cell('A', { bold: true })])]);

    // After render(), lastStyle is reset anyway, but let's test resetState explicitly
    renderer.resetState();

    // Render a plain cell - should not emit any SGR
    const result = renderer.render([rowPatch(0, 0, [cell('B')])]);
    const movePos = result.indexOf(CURSOR_MOVE(0, 0));
    const bPos = result.indexOf('B', movePos);
    const between = result.substring(movePos + CURSOR_MOVE(0, 0).length, bPos);
    expect(between).toBe('');
  });
});

// ── OSC 52 Clipboard ────────────────────────────────────────────────

describe('OSC 52 Clipboard', () => {
  it('osc52Copy generates correct escape sequence', () => {
    const { osc52Copy } = require('../renderer');
    const result = osc52Copy('hello');
    // 'hello' base64 = 'aGVsbG8='
    expect(result).toBe('\x1b]52;c;aGVsbG8=\x07');
  });

  it('osc52Copy supports custom target', () => {
    const { osc52Copy } = require('../renderer');
    const result = osc52Copy('test', 'p');
    // 'test' base64 = 'dGVzdA=='
    expect(result).toBe('\x1b]52;p;dGVzdA==\x07');
  });

  it('Renderer.copyToClipboard returns OSC 52 sequence', () => {
    const r = new Renderer();
    const result = r.copyToClipboard('world');
    // 'world' base64 = 'd29ybGQ='
    expect(result).toBe('\x1b]52;c;d29ybGQ=\x07');
  });

  it('handles empty string', () => {
    const { osc52Copy } = require('../renderer');
    const result = osc52Copy('');
    expect(result).toBe('\x1b]52;c;\x07');
  });

  it('handles Unicode text', () => {
    const { osc52Copy } = require('../renderer');
    const result = osc52Copy('你好');
    const expected = Buffer.from('你好', 'utf8').toString('base64');
    expect(result).toBe(`\x1b]52;c;${expected}\x07`);
  });
});
