// Tests for ScreenBuffer dirty region tracking (GAP-SUM-016).
// Verifies that getDiff() only scans rows within dirty regions when available,
// and falls back to full scan when clear() was called.

import { describe, expect, it } from 'bun:test';
import { Buffer, ScreenBuffer, type DirtyRegion } from '../screen-buffer';
import { EMPTY_CELL, createCell } from '../cell';

describe('Buffer.clearRegion', () => {
  it('clears a rectangular region to EMPTY_CELL', () => {
    const buf = new Buffer(10, 5);
    buf.setCell(2, 1, createCell('A'));
    buf.setCell(3, 1, createCell('B'));
    buf.setCell(2, 2, createCell('C'));
    buf.setCell(3, 2, createCell('D'));

    buf.clearRegion(2, 1, 2, 2);

    expect(buf.getCell(2, 1)).toBe(EMPTY_CELL);
    expect(buf.getCell(3, 1)).toBe(EMPTY_CELL);
    expect(buf.getCell(2, 2)).toBe(EMPTY_CELL);
    expect(buf.getCell(3, 2)).toBe(EMPTY_CELL);
  });

  it('does not affect cells outside the region', () => {
    const buf = new Buffer(10, 5);
    buf.setCell(0, 0, createCell('X'));
    buf.setCell(9, 4, createCell('Y'));

    buf.clearRegion(2, 1, 3, 2);

    expect(buf.getCell(0, 0).char).toBe('X');
    expect(buf.getCell(9, 4).char).toBe('Y');
  });

  it('clamps to buffer bounds', () => {
    const buf = new Buffer(5, 5);
    buf.setCell(4, 4, createCell('Z'));

    buf.clearRegion(-2, -2, 10, 10);

    expect(buf.getCell(4, 4)).toBe(EMPTY_CELL);
    expect(buf.getCell(0, 0)).toBe(EMPTY_CELL);
  });
});

describe('ScreenBuffer dirty regions', () => {
  describe('addDirtyRegion', () => {
    it('registers a dirty region', () => {
      const sb = new ScreenBuffer(20, 10);
      sb.addDirtyRegion({ x: 2, y: 3, width: 5, height: 2 });

      expect(sb.hasDirtyRegions).toBe(true);
      expect(sb.dirtyRegions.length).toBe(1);
      expect(sb.dirtyRegions[0]).toEqual({ x: 2, y: 3, width: 5, height: 2 });
    });

    it('registers multiple dirty regions', () => {
      const sb = new ScreenBuffer(20, 10);
      sb.addDirtyRegion({ x: 0, y: 0, width: 5, height: 2 });
      sb.addDirtyRegion({ x: 10, y: 5, width: 3, height: 3 });

      expect(sb.dirtyRegions.length).toBe(2);
    });

    it('clamps region to screen bounds', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.addDirtyRegion({ x: -2, y: -1, width: 20, height: 20 });

      expect(sb.dirtyRegions.length).toBe(1);
      expect(sb.dirtyRegions[0]).toEqual({ x: 0, y: 0, width: 10, height: 5 });
    });

    it('ignores zero-area regions', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.addDirtyRegion({ x: 5, y: 3, width: 0, height: 3 });
      sb.addDirtyRegion({ x: 5, y: 3, width: 3, height: 0 });

      expect(sb.hasDirtyRegions).toBe(false);
    });

    it('ignores fully out-of-bounds regions', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.addDirtyRegion({ x: 10, y: 5, width: 5, height: 3 });

      expect(sb.hasDirtyRegions).toBe(false);
    });
  });

  describe('clearDirtyRegions', () => {
    it('clears only the dirty region cells in back buffer', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.setChar(0, 0, 'A');
      sb.setChar(5, 2, 'B');
      sb.setChar(5, 3, 'C');

      sb.addDirtyRegion({ x: 4, y: 2, width: 3, height: 2 });
      const cleared = sb.clearDirtyRegions();

      expect(cleared).toBe(true);
      expect(sb.getCell(0, 0).char).toBe('A');
      expect(sb.getCell(5, 2)).toBe(EMPTY_CELL);
      expect(sb.getCell(5, 3)).toBe(EMPTY_CELL);
    });

    it('returns false when no dirty regions', () => {
      const sb = new ScreenBuffer(10, 5);
      expect(sb.clearDirtyRegions()).toBe(false);
    });
  });

  describe('resetDirtyRegions', () => {
    it('clears the dirty regions list', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.addDirtyRegion({ x: 0, y: 0, width: 5, height: 5 });
      expect(sb.hasDirtyRegions).toBe(true);

      sb.resetDirtyRegions();
      expect(sb.hasDirtyRegions).toBe(false);
    });
  });

  describe('clear() resets dirty regions', () => {
    it('clear() prevents dirty region optimization in getDiff', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.setChar(0, 0, 'A');
      sb.present();

      sb.clear();

      sb.setChar(0, 0, 'B');
      sb.addDirtyRegion({ x: 0, y: 0, width: 1, height: 1 });

      sb.setChar(5, 4, 'X');

      const diff = sb.getDiff();

      const rowsWithPatches = diff.map(p => p.row);
      expect(rowsWithPatches).toContain(0);
      expect(rowsWithPatches).toContain(4);
    });
  });

  describe('present() resets dirty regions', () => {
    it('present() clears dirty regions', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.addDirtyRegion({ x: 0, y: 0, width: 5, height: 5 });
      sb.present();

      expect(sb.hasDirtyRegions).toBe(false);
    });
  });

  describe('resize() resets dirty regions', () => {
    it('resize clears dirty regions', () => {
      const sb = new ScreenBuffer(10, 5);
      sb.addDirtyRegion({ x: 0, y: 0, width: 5, height: 5 });
      sb.resize(20, 10);

      expect(sb.hasDirtyRegions).toBe(false);
    });
  });
});

describe('getDiff with dirty regions', () => {
  it('scans only dirty rows when regions are registered (no full clear)', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.setChar(0, 0, 'A');
    sb.setChar(0, 1, 'B');
    sb.setChar(0, 2, 'C');
    sb.setChar(0, 3, 'D');
    sb.setChar(0, 4, 'E');
    sb.present();

    sb.setChar(0, 0, 'A');
    sb.setChar(0, 1, 'B');
    sb.setChar(0, 2, 'X');
    sb.setChar(0, 3, 'D');
    sb.setChar(0, 4, 'E');

    sb.addDirtyRegion({ x: 0, y: 2, width: 10, height: 1 });

    const diff = sb.getDiff();

    expect(diff.length).toBe(1);
    expect(diff[0]!.row).toBe(2);
    expect(diff[0]!.patches[0]!.cells[0]!.char).toBe('X');
  });

  it('scans multiple dirty regions', () => {
    const sb = new ScreenBuffer(10, 10);
    sb.setChar(0, 0, 'A');
    sb.setChar(0, 5, 'B');
    sb.present();

    sb.setChar(0, 0, 'X');
    sb.setChar(0, 5, 'Y');
    sb.setChar(0, 3, 'Z');

    sb.addDirtyRegion({ x: 0, y: 0, width: 10, height: 1 });
    sb.addDirtyRegion({ x: 0, y: 5, width: 10, height: 1 });

    const diff = sb.getDiff();
    const rowsWithPatches = diff.map(p => p.row);

    expect(rowsWithPatches).toContain(0);
    expect(rowsWithPatches).toContain(5);
    expect(rowsWithPatches).not.toContain(3);
  });

  it('falls back to full scan when no dirty regions registered', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.setChar(0, 0, 'A');
    sb.setChar(0, 4, 'B');
    sb.present();

    sb.setChar(0, 0, 'X');
    sb.setChar(0, 4, 'Y');

    const diff = sb.getDiff();
    const rowsWithPatches = diff.map(p => p.row);

    expect(rowsWithPatches).toContain(0);
    expect(rowsWithPatches).toContain(4);
  });

  it('falls back to full scan after clear() even with dirty regions', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.setChar(0, 0, 'A');
    sb.setChar(0, 4, 'B');
    sb.present();

    sb.clear();

    sb.setChar(0, 0, 'X');
    sb.addDirtyRegion({ x: 0, y: 0, width: 10, height: 1 });

    const diff = sb.getDiff();

    const rowsWithPatches = diff.map(p => p.row);
    expect(rowsWithPatches).toContain(0);
    expect(rowsWithPatches).toContain(4);
  });

  it('full refresh ignores dirty regions', () => {
    const sb = new ScreenBuffer(5, 3);
    sb.setChar(0, 0, 'A');
    sb.setChar(0, 2, 'C');
    sb.markForRefresh();
    sb.addDirtyRegion({ x: 0, y: 0, width: 5, height: 1 });

    const diff = sb.getDiff();
    expect(diff.length).toBe(3);
  });

  it('getDiff consumes dirty regions after use', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.addDirtyRegion({ x: 0, y: 0, width: 5, height: 2 });

    sb.getDiff();
    expect(sb.hasDirtyRegions).toBe(false);
  });

  it('dirty region spanning multiple rows restricts scan to those rows', () => {
    const sb = new ScreenBuffer(10, 10);
    for (let y = 0; y < 10; y++) {
      sb.setChar(0, y, String.fromCharCode(65 + y));
    }
    sb.present();

    for (let y = 0; y < 10; y++) {
      sb.setChar(0, y, String.fromCharCode(65 + y));
    }
    sb.setChar(0, 3, 'X');
    sb.setChar(0, 4, 'Y');
    sb.setChar(0, 5, 'Z');

    sb.addDirtyRegion({ x: 0, y: 3, width: 10, height: 3 });

    const diff = sb.getDiff();
    const rowsWithPatches = diff.map(p => p.row);

    expect(rowsWithPatches).toEqual([3, 4, 5]);
  });

  it('unchanged rows within dirty region produce no patches', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.setChar(0, 0, 'A');
    sb.setChar(0, 1, 'B');
    sb.setChar(0, 2, 'C');
    sb.present();

    sb.setChar(0, 0, 'A');
    sb.setChar(0, 1, 'X');
    sb.setChar(0, 2, 'C');

    sb.addDirtyRegion({ x: 0, y: 0, width: 10, height: 3 });

    const diff = sb.getDiff();

    expect(diff.length).toBe(1);
    expect(diff[0]!.row).toBe(1);
    expect(diff[0]!.patches[0]!.cells[0]!.char).toBe('X');
  });

  it('overlapping dirty regions are handled correctly', () => {
    const sb = new ScreenBuffer(10, 10);
    sb.setChar(0, 2, 'A');
    sb.setChar(0, 4, 'B');
    sb.present();

    sb.setChar(0, 2, 'X');
    sb.setChar(0, 4, 'Y');

    sb.addDirtyRegion({ x: 0, y: 1, width: 10, height: 3 });
    sb.addDirtyRegion({ x: 0, y: 3, width: 10, height: 3 });

    const diff = sb.getDiff();
    const rowsWithPatches = diff.map(p => p.row);

    expect(rowsWithPatches).toContain(2);
    expect(rowsWithPatches).toContain(4);
  });

  it('empty dirty regions array behaves like no regions (full scan)', () => {
    const sb = new ScreenBuffer(10, 5);
    sb.setChar(0, 0, 'A');
    sb.setChar(0, 4, 'B');
    sb.present();

    sb.setChar(0, 0, 'X');
    sb.setChar(0, 4, 'Y');

    const diff = sb.getDiff();
    const rowsWithPatches = diff.map(p => p.row);
    expect(rowsWithPatches).toContain(0);
    expect(rowsWithPatches).toContain(4);
  });
});
