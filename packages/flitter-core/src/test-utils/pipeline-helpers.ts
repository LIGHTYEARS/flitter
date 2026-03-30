/**
 * Shared test helpers for flitter-core pipeline integration tests.
 * Provides utilities for reading screen buffers, inspecting render trees,
 * and bootstrapping test bindings.
 */

import { WidgetsBinding } from '../framework/binding';
import { RenderObject, isContainerRenderObject, isSingleChildRenderObject } from '../framework/render-object';
import { FrameScheduler } from '../scheduler/frame-scheduler';

/**
 * Read a row of characters from the committed front buffer.
 * After drawFrameSync() → render() → present(), painted content lives in the
 * FRONT buffer because present() swaps front/back and clears the new back buffer.
 */
export function readScreenRow(binding: WidgetsBinding, row: number, maxCols?: number): string {
  const screen = binding.getScreen();
  const frontBuffer = screen.getFrontBuffer();
  const cols = maxCols ?? screen.width;
  let result = '';
  for (let x = 0; x < cols; x++) {
    const cell = frontBuffer.getCell(x, row);
    result += cell.char;
  }
  return result;
}

/**
 * Read a single cell from the front buffer (committed frame).
 */
export function readFrontCell(binding: WidgetsBinding, x: number, y: number): { char: string; style: any } {
  return binding.getScreen().getFrontBuffer().getCell(x, y);
}

/**
 * Recursively collect render tree info into a flat list.
 * For each RenderObject, records className, width, height, and childCount.
 */
export function collectRenderTree(
  rootRO: RenderObject,
): Array<{ className: string; width: number; height: number; childCount: number }> {
  const result: Array<{ className: string; width: number; height: number; childCount: number }> = [];

  function walk(ro: RenderObject): void {
    const children: RenderObject[] = [];

    if (isContainerRenderObject(ro)) {
      for (const child of (ro as any).children) {
        children.push(child);
      }
    } else if (isSingleChildRenderObject(ro) && (ro as any).child) {
      children.push((ro as any).child);
    }

    result.push({
      className: ro.constructor.name,
      width: ro.hasSize ? ro.size.width : 0,
      height: ro.hasSize ? ro.size.height : 0,
      childCount: children.length,
    });

    for (const child of children) {
      walk(child);
    }
  }

  walk(rootRO);
  return result;
}

/**
 * Find the first RenderObject matching the given class name.
 * Performs a depth-first search through the render tree.
 */
export function findRenderObject(rootRO: RenderObject, className: string): RenderObject | null {
  if (rootRO.constructor.name === className) {
    return rootRO;
  }

  const children: RenderObject[] = [];

  if (isContainerRenderObject(rootRO)) {
    for (const child of (rootRO as any).children) {
      children.push(child);
    }
  } else if (isSingleChildRenderObject(rootRO) && (rootRO as any).child) {
    children.push((rootRO as any).child);
  }

  for (const child of children) {
    const found = findRenderObject(child, className);
    if (found) return found;
  }

  return null;
}

/**
 * Create a test binding with the given terminal size.
 * Does NOT reset in cleanup (allows multi-frame operations).
 * Returns helpers for drawing frames and reading screen.
 */
export function createTestBinding(
  cols?: number,
  rows?: number,
): {
  binding: WidgetsBinding;
  drawFrame: () => void;
  readRow: (y: number, maxCols?: number) => string;
  cleanup: () => void;
} {
  WidgetsBinding.reset();
  FrameScheduler.reset();

  const binding = WidgetsBinding.instance;
  binding.handleResize(cols ?? 80, rows ?? 24);

  return {
    binding,
    drawFrame: () => {
      binding.requestForcedPaintFrame();
      binding.drawFrameSync();
    },
    readRow: (y: number, maxCols?: number) => readScreenRow(binding, y, maxCols),
    cleanup: () => {
      WidgetsBinding.reset();
      FrameScheduler.reset();
    },
  };
}
