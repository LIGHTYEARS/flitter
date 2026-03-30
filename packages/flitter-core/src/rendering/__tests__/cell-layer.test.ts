// Tests for CellLayer -- cached rectangular cell grid
// Gap R02: RepaintBoundary enhancement per .gap/12-repaint-boundary.md

import { describe, expect, it } from 'bun:test';
import { CellLayer } from '../cell-layer';
import { EMPTY_CELL, createCell, cellsEqual } from '../../terminal/cell';
import { Buffer } from '../../terminal/screen-buffer';
import { Color } from '../../core/color';

describe('CellLayer', () => {
  it('stores and retrieves cells correctly', () => {
    const layer = new CellLayer(10, 5);
    const cell = createCell('A', { bold: true }, 1);
    layer.setCell(3, 2, cell);

    const retrieved = layer.getCell(3, 2);
    expect(retrieved.char).toBe('A');
    expect(retrieved.style.bold).toBe(true);

    // Other positions should return EMPTY_CELL
    expect(layer.getCell(0, 0)).toBe(EMPTY_CELL);
  });

  it('clear() resets all cells to EMPTY_CELL', () => {
    const layer = new CellLayer(5, 5);
    layer.setCell(0, 0, createCell('X', {}, 1));
    layer.setCell(2, 3, createCell('Y', {}, 1));
    layer.clear();

    expect(layer.getCell(0, 0)).toBe(EMPTY_CELL);
    expect(layer.getCell(2, 3)).toBe(EMPTY_CELL);
  });

  it('resize() marks dirty and resizes', () => {
    const layer = new CellLayer(10, 5);
    layer.setCell(0, 0, createCell('A', {}, 1));
    layer.markClean();
    expect(layer.isDirty).toBe(false);

    layer.resize(20, 10);
    expect(layer.isDirty).toBe(true);
    expect(layer.width).toBe(20);
    expect(layer.height).toBe(10);
  });

  it('resize() is a no-op for same dimensions', () => {
    const layer = new CellLayer(10, 5);
    layer.markClean();
    layer.resize(10, 5);
    // Should NOT re-dirty since dimensions unchanged
    expect(layer.isDirty).toBe(false);
  });

  it('captureFrom() deep-clones cells from back buffer', () => {
    const buffer = new Buffer(20, 10);
    const cell = createCell('Z', { fg: Color.rgb(255, 0, 0) }, 1);
    buffer.setCell(5, 3, cell);

    const layer = new CellLayer(10, 5);
    layer.captureFrom(buffer, 5, 3);

    // Layer should have the cell at local (0, 0) -- screenX=5, screenY=3 mapped to local
    const captured = layer.getCell(0, 0);
    expect(captured.char).toBe('Z');
    expect(captured.style.fg).toBeDefined();
    expect(layer.isDirty).toBe(false);
    expect(layer.lastOffsetX).toBe(5);
    expect(layer.lastOffsetY).toBe(3);

    // Modify the original buffer -- layer should be unaffected (deep clone)
    buffer.setCell(5, 3, createCell('W', {}, 1));
    const stillZ = layer.getCell(0, 0);
    expect(stillZ.char).toBe('Z');
  });

  it('blitTo() writes cached cells to target buffer', () => {
    // Set up a source buffer with known content
    const sourceBuffer = new Buffer(10, 5);
    sourceBuffer.setCell(0, 0, createCell('A', {}, 1));
    sourceBuffer.setCell(1, 0, createCell('B', {}, 1));

    // Capture from source
    const layer = new CellLayer(10, 5);
    layer.captureFrom(sourceBuffer, 0, 0);

    // Clear a target buffer and blit into it
    const targetBuffer = new Buffer(20, 10);
    layer.blitTo(targetBuffer, 5, 3);

    const blitted1 = targetBuffer.getCell(5, 3);
    const blitted2 = targetBuffer.getCell(6, 3);
    expect(blitted1.char).toBe('A');
    expect(blitted2.char).toBe('B');
  });

  it('handles CJK wide characters (width 2)', () => {
    const buffer = new Buffer(10, 5);
    // Simulate a width-2 character
    buffer.setCell(0, 0, createCell('\u4e16', {}, 2)); // Chinese character

    const layer = new CellLayer(10, 5);
    layer.captureFrom(buffer, 0, 0);

    const primary = layer.getCell(0, 0);
    expect(primary.char).toBe('\u4e16');
    expect(primary.width).toBe(2);
  });

  it('out-of-bounds access is safe', () => {
    const layer = new CellLayer(5, 5);
    // setCell out-of-bounds should not crash
    layer.setCell(-1, 0, createCell('X', {}, 1));
    layer.setCell(100, 0, createCell('X', {}, 1));
    layer.setCell(0, -1, createCell('X', {}, 1));
    layer.setCell(0, 100, createCell('X', {}, 1));

    // getCell out-of-bounds should return EMPTY_CELL
    expect(layer.getCell(-1, 0)).toBe(EMPTY_CELL);
    expect(layer.getCell(999, 999)).toBe(EMPTY_CELL);
  });

  it('markDirty() and markClean() toggle isDirty', () => {
    const layer = new CellLayer(5, 5);
    expect(layer.isDirty).toBe(true); // initially dirty

    layer.markClean();
    expect(layer.isDirty).toBe(false);

    layer.markDirty();
    expect(layer.isDirty).toBe(true);
  });

  it('dispose() clears internal state', () => {
    const layer = new CellLayer(5, 5);
    layer.setCell(0, 0, createCell('A', {}, 1));
    layer.dispose();

    expect(layer.width).toBe(0);
    expect(layer.height).toBe(0);
    expect(layer.isDirty).toBe(true);
  });
});
