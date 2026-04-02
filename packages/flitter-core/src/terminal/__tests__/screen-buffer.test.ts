import { describe, expect, it } from 'bun:test';
import { Buffer, ScreenBuffer } from '../screen-buffer';
import {
  EMPTY_CELL,
  createCell,
  cellsEqual,
  type CellStyle,
} from '../cell';
import { Color } from '../../core/color';

// ============================================================
// Buffer (internal grid)
// ============================================================
describe('Buffer', () => {
  it('initializes with EMPTY_CELL in all positions', () => {
    const buf = new Buffer(4, 3);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        expect(buf.getCell(x, y)).toBe(EMPTY_CELL);
      }
    }
  });

  it('get/set cell within bounds', () => {
    const buf = new Buffer(10, 5);
    const cell = createCell('A', { bold: true });
    buf.setCell(3, 2, cell);
    expect(buf.getCell(3, 2).char).toBe('A');
    expect(buf.getCell(3, 2).style.bold).toBe(true);
  });

  it('getCell returns EMPTY_CELL for out-of-bounds', () => {
    const buf = new Buffer(5, 5);
    expect(buf.getCell(-1, 0)).toBe(EMPTY_CELL);
    expect(buf.getCell(0, -1)).toBe(EMPTY_CELL);
    expect(buf.getCell(5, 0)).toBe(EMPTY_CELL);
    expect(buf.getCell(0, 5)).toBe(EMPTY_CELL);
    expect(buf.getCell(100, 100)).toBe(EMPTY_CELL);
  });

  it('setCell silently ignores out-of-bounds', () => {
    const buf = new Buffer(5, 5);
    // Should not throw
    buf.setCell(-1, 0, createCell('X'));
    buf.setCell(0, -1, createCell('X'));
    buf.setCell(5, 0, createCell('X'));
    buf.setCell(0, 5, createCell('X'));
    // Buffer unchanged
    expect(buf.getCell(0, 0)).toBe(EMPTY_CELL);
  });

  it('clear fills all cells with EMPTY_CELL', () => {
    const buf = new Buffer(3, 3);
    buf.setCell(1, 1, createCell('X'));
    buf.clear();
    expect(buf.getCell(1, 1)).toBe(EMPTY_CELL);
  });

  it('resize expanding clears buffer (GAP-SUM-042 optimization)', () => {
    const buf = new Buffer(4, 4);
    buf.setCell(0, 0, createCell('A'));
    buf.setCell(3, 3, createCell('D'));
    buf.resize(6, 6);
    expect(buf.getCell(0, 0)).toBe(EMPTY_CELL);
    expect(buf.getCell(3, 3)).toBe(EMPTY_CELL);
    expect(buf.getCell(5, 5)).toBe(EMPTY_CELL);
  });

  it('resize shrink discards content outside bounds', () => {
    const buf = new Buffer(5, 5);
    buf.setCell(4, 4, createCell('X'));
    buf.resize(3, 3);
    expect(buf.width).toBe(3);
    expect(buf.height).toBe(3);
    // (4,4) is now out of bounds
    expect(buf.getCell(4, 4)).toBe(EMPTY_CELL);
  });

  it('resize to same size is a no-op', () => {
    const buf = new Buffer(5, 5);
    buf.setCell(2, 2, createCell('Z'));
    buf.resize(5, 5);
    expect(buf.getCell(2, 2).char).toBe('Z');
  });

  it('width-2 cell sets continuation marker at x+1', () => {
    const buf = new Buffer(10, 1);
    const cjk = createCell('\u4e16', {}, 2);
    buf.setCell(3, 0, cjk);
    // Main cell
    expect(buf.getCell(3, 0).char).toBe('\u4e16');
    expect(buf.getCell(3, 0).width).toBe(2);
    // Continuation marker
    expect(buf.getCell(4, 0).char).toBe('');
    expect(buf.getCell(4, 0).width).toBe(0);
  });

  it('width-2 cell at right edge clips continuation', () => {
    const buf = new Buffer(5, 1);
    const cjk = createCell('\u4e16', {}, 2);
    buf.setCell(4, 0, cjk);
    // Main cell at x=4
    expect(buf.getCell(4, 0).char).toBe('\u4e16');
    // x=5 is out of bounds, no crash
    expect(buf.getCell(5, 0)).toBe(EMPTY_CELL);
  });
});

// ============================================================
// ScreenBuffer
// ============================================================
describe('ScreenBuffer', () => {
  it('defaults to 80x24', () => {
    const sb = new ScreenBuffer();
    const size = sb.getSize();
    expect(size.width).toBe(80);
    expect(size.height).toBe(24);
  });

  it('accepts custom dimensions', () => {
    const sb = new ScreenBuffer(40, 12);
    expect(sb.width).toBe(40);
    expect(sb.height).toBe(12);
  });

  // --- setCell / getCell ---
  it('setCell and getCell work through the back buffer', () => {
    const sb = new ScreenBuffer(10, 5);
    const cell = createCell('H', { fg: Color.red });
    sb.setCell(2, 1, cell);
    expect(sb.getCell(2, 1).char).toBe('H');
  });

  it('out-of-bounds getCell returns EMPTY_CELL', () => {
    const sb = new ScreenBuffer(10, 5);
    expect(sb.getCell(-1, 0)).toBe(EMPTY_CELL);
    expect(sb.getCell(10, 0)).toBe(EMPTY_CELL);
  });

  // --- setChar ---
  it('setChar creates and sets cell', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.setChar(0, 0, 'A', { bold: true }, 1);
    const cell = sb.getCell(0, 0);
    expect(cell.char).toBe('A');
    expect(cell.style.bold).toBe(true);
    expect(cell.width).toBe(1);
  });

  // --- fill ---
  it('fill sets a rectangular region', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.fill(1, 1, 3, 2, '#', { bg: Color.blue });
    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 3; x++) {
        const cell = sb.getCell(x, y);
        expect(cell.char).toBe('#');
        expect(cell.style.bg).toBe(Color.blue);
      }
    }
    // Outside region is still empty
    expect(sb.getCell(0, 0)).toBe(EMPTY_CELL);
    expect(sb.getCell(4, 1)).toBe(EMPTY_CELL);
  });

  it('fill clips to buffer bounds', () => {
    const sb = new ScreenBuffer(5, 5);
    // Should not throw even when region extends beyond buffer
    sb.fill(-1, -1, 10, 10, 'X');
    expect(sb.getCell(0, 0).char).toBe('X');
    expect(sb.getCell(4, 4).char).toBe('X');
  });

  // --- clear ---
  it('clear resets back buffer to EMPTY_CELL', () => {
    const sb = new ScreenBuffer(5, 5);
    sb.setChar(2, 2, 'Z');
    sb.clear();
    expect(sb.getCell(2, 2)).toBe(EMPTY_CELL);
  });

  // --- Cursor management ---
  describe('cursor', () => {
    it('starts with no cursor', () => {
      const sb = new ScreenBuffer();
      expect(sb.getCursor()).toBeNull();
      expect(sb.isCursorVisible()).toBe(false);
      expect(sb.getCursorShape()).toBe(0);
    });

    it('setCursor sets position and makes visible', () => {
      const sb = new ScreenBuffer();
      sb.setCursor(5, 10);
      expect(sb.getCursor()).toEqual({ x: 5, y: 10 });
      expect(sb.isCursorVisible()).toBe(true);
    });

    it('setCursorPositionHint sets position without changing visibility', () => {
      const sb = new ScreenBuffer();
      expect(sb.isCursorVisible()).toBe(false);
      sb.setCursorPositionHint(3, 7);
      expect(sb.getCursor()).toEqual({ x: 3, y: 7 });
      expect(sb.isCursorVisible()).toBe(false);
    });

    it('setCursorPositionHint preserves existing visibility', () => {
      const sb = new ScreenBuffer();
      sb.setCursor(0, 0); // makes visible
      sb.setCursorPositionHint(5, 5);
      expect(sb.getCursor()).toEqual({ x: 5, y: 5 });
      expect(sb.isCursorVisible()).toBe(true);
    });

    it('clearCursor hides and nulls position', () => {
      const sb = new ScreenBuffer();
      sb.setCursor(5, 10);
      sb.clearCursor();
      expect(sb.getCursor()).toBeNull();
      expect(sb.isCursorVisible()).toBe(false);
    });

    it('setCursorShape sets DECSCUSR value', () => {
      const sb = new ScreenBuffer();
      sb.setCursorShape(2);
      expect(sb.getCursorShape()).toBe(2);
    });
  });

  // --- present() swap behavior ---
  describe('present', () => {
    it('swaps front and back buffers', () => {
      const sb = new ScreenBuffer(5, 5);
      // Paint to back buffer
      sb.setChar(0, 0, 'A');
      // present: back -> front, old front -> back (cleared)
      sb.present();
      // The front buffer now has 'A' at (0,0)
      expect(sb.getFrontBuffer().getCell(0, 0).char).toBe('A');
      // The back buffer (old front, now cleared) should be empty
      expect(sb.getCell(0, 0)).toBe(EMPTY_CELL);
    });

    it('clears the new back buffer after swap', () => {
      const sb = new ScreenBuffer(3, 3);
      sb.setChar(1, 1, 'X');
      sb.present();
      // Back buffer is cleared
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(sb.getCell(x, y)).toBe(EMPTY_CELL);
        }
      }
    });

    it('double present swaps back', () => {
      const sb = new ScreenBuffer(3, 3);
      sb.setChar(0, 0, 'A');
      sb.present();
      sb.setChar(0, 0, 'B');
      sb.present();
      // Now front has 'B', back (old front from first present) retains 'A'
      expect(sb.getFrontBuffer().getCell(0, 0).char).toBe('B');
      expect(sb.getBackBuffer().getCell(0, 0).char).toBe('A');
    });
  });

  // --- resize ---
  describe('resize', () => {
    it('updates dimensions', () => {
      const sb = new ScreenBuffer(10, 10);
      sb.resize(20, 15);
      expect(sb.width).toBe(20);
      expect(sb.height).toBe(15);
      expect(sb.getSize()).toEqual({ width: 20, height: 15 });
    });

    it('marks for full refresh', () => {
      const sb = new ScreenBuffer(10, 10);
      expect(sb.needsFullRefresh).toBe(false);
      sb.resize(20, 15);
      expect(sb.needsFullRefresh).toBe(true);
    });

    it('expanding clears buffer and marks full refresh (GAP-SUM-042)', () => {
      const sb = new ScreenBuffer(5, 5);
      sb.setChar(1, 1, 'K');
      sb.resize(10, 10);
      expect(sb.getCell(1, 1)).toBe(EMPTY_CELL);
      expect(sb.needsFullRefresh).toBe(true);
    });

    it('no-ops when dimensions unchanged', () => {
      const sb = new ScreenBuffer(10, 10);
      sb.setChar(1, 1, 'K');
      sb.resize(10, 10);
      expect(sb.needsFullRefresh).toBe(false);
      expect(sb.getCell(1, 1).char).toBe('K');
    });
  });

  // --- getDiff ---
  describe('getDiff', () => {
    it('returns empty when no changes (both buffers empty)', () => {
      const sb = new ScreenBuffer(5, 5);
      const diff = sb.getDiff();
      expect(diff).toEqual([]);
    });

    it('detects single cell change', () => {
      const sb = new ScreenBuffer(5, 5);
      sb.setChar(2, 1, 'X');
      const diff = sb.getDiff();

      expect(diff.length).toBe(1);
      expect(diff[0]!.row).toBe(1);
      expect(diff[0]!.patches.length).toBe(1);
      expect(diff[0]!.patches[0]!.col).toBe(2);
      expect(diff[0]!.patches[0]!.cells.length).toBe(1);
      expect(diff[0]!.patches[0]!.cells[0]!.char).toBe('X');
    });

    it('detects contiguous run of changes', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.setChar(2, 0, 'A');
      sb.setChar(3, 0, 'B');
      sb.setChar(4, 0, 'C');
      const diff = sb.getDiff();

      expect(diff.length).toBe(1);
      expect(diff[0]!.row).toBe(0);
      expect(diff[0]!.patches.length).toBe(1);
      const patch = diff[0]!.patches[0]!;
      expect(patch.col).toBe(2);
      expect(patch.cells.length).toBe(3);
      expect(patch.cells.map(c => c.char)).toEqual(['A', 'B', 'C']);
    });

    it('splits non-contiguous changes into separate patches', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.setChar(1, 0, 'A');
      sb.setChar(5, 0, 'B');
      const diff = sb.getDiff();

      expect(diff.length).toBe(1);
      expect(diff[0]!.patches.length).toBe(2);
      expect(diff[0]!.patches[0]!.col).toBe(1);
      expect(diff[0]!.patches[0]!.cells[0]!.char).toBe('A');
      expect(diff[0]!.patches[1]!.col).toBe(5);
      expect(diff[0]!.patches[1]!.cells[0]!.char).toBe('B');
    });

    it('detects changes on multiple rows', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.setChar(0, 0, 'A');
      sb.setChar(0, 3, 'B');
      const diff = sb.getDiff();

      expect(diff.length).toBe(2);
      expect(diff[0]!.row).toBe(0);
      expect(diff[1]!.row).toBe(3);
    });

    it('full screen change returns all cells', () => {
      const sb = new ScreenBuffer(3, 2);
      sb.fill(0, 0, 3, 2, '#');
      const diff = sb.getDiff();

      expect(diff.length).toBe(2); // 2 rows
      let totalCells = 0;
      for (const row of diff) {
        for (const patch of row.patches) {
          totalCells += patch.cells.length;
        }
      }
      expect(totalCells).toBe(6); // 3x2
    });

    it('no changes after present + identical paint', () => {
      const sb = new ScreenBuffer(5, 5);
      sb.setChar(2, 2, 'X');
      sb.present();
      // Paint the same thing again
      sb.setChar(2, 2, 'X');
      const diff = sb.getDiff();
      expect(diff).toEqual([]);
    });

    it('detects changes between present frames', () => {
      const sb = new ScreenBuffer(5, 5);
      sb.setChar(0, 0, 'A');
      sb.present();
      sb.setChar(0, 0, 'B');
      const diff = sb.getDiff();

      expect(diff.length).toBe(1);
      expect(diff[0]!.patches[0]!.cells[0]!.char).toBe('B');
    });

    it('detects removal (cell changed to EMPTY)', () => {
      const sb = new ScreenBuffer(5, 5);
      sb.setChar(2, 2, 'X');
      sb.present();
      // Back buffer is cleared after present, so (2,2) is now EMPTY
      // Front buffer has 'X' at (2,2)
      // Diff should detect that (2,2) changed from 'X' to empty
      const diff = sb.getDiff();

      expect(diff.length).toBe(1);
      expect(diff[0]!.row).toBe(2);
      expect(diff[0]!.patches[0]!.col).toBe(2);
      expect(diff[0]!.patches[0]!.cells[0]!.char).toBe(' '); // EMPTY_CELL
    });

    it('full refresh returns all back buffer cells', () => {
      const sb = new ScreenBuffer(3, 2);
      sb.setChar(0, 0, 'A');
      sb.markForRefresh();
      const diff = sb.getDiff();

      // Full refresh: all rows should be present
      expect(diff.length).toBe(2);
      // After getDiff with full refresh, the flag is cleared
      expect(sb.needsFullRefresh).toBe(false);
    });

    it('uses EMPTY_CELL identity fast-path', () => {
      // When both front and back are EMPTY_CELL, skip (no diff entry)
      const sb = new ScreenBuffer(10, 10);
      const diff = sb.getDiff();
      expect(diff).toEqual([]);
    });
  });

  // --- markForRefresh ---
  it('markForRefresh forces full refresh', () => {
    const sb = new ScreenBuffer(5, 5);
    expect(sb.requiresFullRefresh).toBe(false);
    sb.markForRefresh();
    expect(sb.requiresFullRefresh).toBe(true);
  });

  // --- getBuffer / getFrontBuffer / getBackBuffer ---
  it('getBuffer returns back buffer', () => {
    const sb = new ScreenBuffer(5, 5);
    expect(sb.getBuffer()).toBe(sb.getBackBuffer());
  });

  // --- Width-2 (CJK) cell handling in ScreenBuffer ---
  describe('CJK width-2 cells', () => {
    it('setCell with width-2 creates continuation marker', () => {
      const sb = new ScreenBuffer(10, 1);
      const cjk = createCell('\u4e16', {}, 2); // "world" in Chinese
      sb.setCell(3, 0, cjk);

      const main = sb.getCell(3, 0);
      expect(main.char).toBe('\u4e16');
      expect(main.width).toBe(2);

      const cont = sb.getCell(4, 0);
      expect(cont.char).toBe('');
      expect(cont.width).toBe(0);
    });

    it('setChar with width-2 creates continuation marker', () => {
      const sb = new ScreenBuffer(10, 1);
      sb.setChar(0, 0, '\u6d4b', {}, 2); // "test" in Chinese

      expect(sb.getCell(0, 0).char).toBe('\u6d4b');
      expect(sb.getCell(0, 0).width).toBe(2);
      expect(sb.getCell(1, 0).char).toBe('');
      expect(sb.getCell(1, 0).width).toBe(0);
    });

    it('getDiff handles width-2 cells correctly', () => {
      const sb = new ScreenBuffer(10, 1);
      sb.setChar(2, 0, '\u4e16', {}, 2);
      const diff = sb.getDiff();

      // Should have a patch for row 0
      expect(diff.length).toBe(1);
      expect(diff[0]!.row).toBe(0);
      // The patch should include the main cell and the continuation marker
      const allCells = diff[0]!.patches.flatMap(p => p.cells);
      expect(allCells.length).toBeGreaterThanOrEqual(1);
    });
  });
});
