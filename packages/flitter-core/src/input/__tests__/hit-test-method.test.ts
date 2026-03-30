// Tests for RenderBox.hitTest() / hitTestSelf() / hitTestChildren()
// and BoxHitTestResult / BoxHitTestEntry classes.
// Gap #13 (render-object hit-test) and Gap #22 (unify hit-test)

import { describe, test, expect } from 'bun:test';
import {
  RenderBox,
  ContainerRenderBox,
  type PaintContext,
} from '../../framework/render-object';
import { BoxHitTestResult, BoxHitTestEntry } from '../hit-test';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';

// ---------------------------------------------------------------------------
// Test helpers: concrete RenderBox subclasses
// ---------------------------------------------------------------------------

class TestLeafBox extends RenderBox {
  constructor(width: number, height: number, col: number = 0, row: number = 0) {
    super();
    this.size = new Size(width, height);
    this.offset = new Offset(col, row);
  }
  performLayout(): void {}
  paint(_ctx: PaintContext, _off: Offset): void {}
}

class TestContainerBox extends ContainerRenderBox {
  constructor(width: number, height: number, col: number = 0, row: number = 0) {
    super();
    this.size = new Size(width, height);
    this.offset = new Offset(col, row);
  }
  performLayout(): void {}
  paint(_ctx: PaintContext, _off: Offset): void {}

  addChild(child: RenderBox): void {
    this.insert(child);
  }
}

/** A leaf that overrides hitTestSelf to always return false (no hit area). */
class TestNonHittableBox extends RenderBox {
  constructor(width: number, height: number, col: number = 0, row: number = 0) {
    super();
    this.size = new Size(width, height);
    this.offset = new Offset(col, row);
  }
  override hitTestSelf(_localX: number, _localY: number): boolean {
    return false;
  }
  performLayout(): void {}
  paint(_ctx: PaintContext, _off: Offset): void {}
}

// ---------------------------------------------------------------------------
// BoxHitTestEntry
// ---------------------------------------------------------------------------

describe('BoxHitTestEntry', () => {
  test('stores target and localPosition', () => {
    const box = new TestLeafBox(10, 10);
    const localPos = new Offset(3, 4);
    const entry = new BoxHitTestEntry(box, localPos);

    expect(entry.target).toBe(box);
    expect(entry.localPosition).toBe(localPos);
  });
});

// ---------------------------------------------------------------------------
// BoxHitTestResult
// ---------------------------------------------------------------------------

describe('BoxHitTestResult', () => {
  test('starts with empty path', () => {
    const result = new BoxHitTestResult();
    expect(result.path.length).toBe(0);
  });

  test('addWithPaintOffset computes local position and adds entry', () => {
    const result = new BoxHitTestResult();
    const box = new TestLeafBox(20, 20);
    const boxOffset = new Offset(5, 10);
    const screenPos = new Offset(8, 15);

    result.addWithPaintOffset(box, boxOffset, screenPos);

    expect(result.path.length).toBe(1);
    const entry = result.path[0]!;
    expect(entry.target).toBe(box);
    // localPosition = screenPos - boxOffset = (8-5, 15-10) = (3, 5)
    expect(entry.localPosition.col).toBe(3);
    expect(entry.localPosition.row).toBe(5);
  });

  test('addWithPaintOffset can add multiple entries', () => {
    const result = new BoxHitTestResult();
    const box1 = new TestLeafBox(10, 10);
    const box2 = new TestLeafBox(10, 10);

    result.addWithPaintOffset(box1, Offset.zero, new Offset(5, 5));
    result.addWithPaintOffset(box2, new Offset(2, 3), new Offset(5, 5));

    expect(result.path.length).toBe(2);
    expect(result.path[0]!.target).toBe(box1);
    expect(result.path[1]!.target).toBe(box2);
  });

  test('path is readonly', () => {
    const result = new BoxHitTestResult();
    const path = result.path;
    expect(Array.isArray(path)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RenderBox.hitTestSelf()
// ---------------------------------------------------------------------------

describe('RenderBox.hitTestSelf', () => {
  test('returns true for point inside bounds', () => {
    const box = new TestLeafBox(10, 8);
    expect(box.hitTestSelf(0, 0)).toBe(true);
    expect(box.hitTestSelf(5, 4)).toBe(true);
    expect(box.hitTestSelf(9, 7)).toBe(true);
  });

  test('returns false for point at right/bottom edge (exclusive)', () => {
    const box = new TestLeafBox(10, 8);
    expect(box.hitTestSelf(10, 0)).toBe(false); // x == width
    expect(box.hitTestSelf(0, 8)).toBe(false);  // y == height
    expect(box.hitTestSelf(10, 8)).toBe(false);
  });

  test('returns false for negative coordinates', () => {
    const box = new TestLeafBox(10, 8);
    expect(box.hitTestSelf(-1, 0)).toBe(false);
    expect(box.hitTestSelf(0, -1)).toBe(false);
  });

  test('returns false for zero-size box', () => {
    const box = new TestLeafBox(0, 0);
    expect(box.hitTestSelf(0, 0)).toBe(false);
  });

  test('can be overridden to always return false', () => {
    const box = new TestNonHittableBox(10, 10);
    expect(box.hitTestSelf(5, 5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RenderBox.hitTest()
// ---------------------------------------------------------------------------

describe('RenderBox.hitTest', () => {
  test('returns true and adds self to result when position is inside', () => {
    const box = new TestLeafBox(20, 10, 5, 3);
    const result = new BoxHitTestResult();

    const hit = box.hitTest(result, new Offset(10, 5));

    expect(hit).toBe(true);
    expect(result.path.length).toBe(1);
    expect(result.path[0]!.target).toBe(box);
    // local = (10 - 5, 5 - 3) = (5, 2)
    expect(result.path[0]!.localPosition.col).toBe(5);
    expect(result.path[0]!.localPosition.row).toBe(2);
  });

  test('returns false and does not add to result when position is outside', () => {
    const box = new TestLeafBox(10, 10, 0, 0);
    const result = new BoxHitTestResult();

    const hit = box.hitTest(result, new Offset(15, 5));

    expect(hit).toBe(false);
    expect(result.path.length).toBe(0);
  });

  test('respects parentOffsetX and parentOffsetY', () => {
    const box = new TestLeafBox(10, 10, 2, 3); // own offset (2,3)
    const result = new BoxHitTestResult();

    // parent offset (5,5), own offset (2,3) -> global (7,8)
    // test position (10,10): local = (10-7, 10-8) = (3, 2) -> inside 10x10
    const hit = box.hitTest(result, new Offset(10, 10), 5, 5);

    expect(hit).toBe(true);
    expect(result.path.length).toBe(1);
    expect(result.path[0]!.localPosition.col).toBe(3);
    expect(result.path[0]!.localPosition.row).toBe(2);
  });

  test('does not hit when parentOffsetX shifts box out of range', () => {
    const box = new TestLeafBox(10, 10, 0, 0);
    const result = new BoxHitTestResult();

    // parent offset (50,50) + own (0,0) -> global (50,50)
    // test position (5,5): outside
    const hit = box.hitTest(result, new Offset(5, 5), 50, 50);

    expect(hit).toBe(false);
    expect(result.path.length).toBe(0);
  });

  test('non-hittable box returns false even when position is inside', () => {
    const box = new TestNonHittableBox(20, 20, 0, 0);
    const result = new BoxHitTestResult();

    const hit = box.hitTest(result, new Offset(5, 5));

    expect(hit).toBe(false);
    expect(result.path.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// RenderBox.hitTestChildren() (base class -- no-op)
// ---------------------------------------------------------------------------

describe('RenderBox.hitTestChildren (leaf)', () => {
  test('is a no-op on a leaf RenderBox', () => {
    const box = new TestLeafBox(10, 10);
    const result = new BoxHitTestResult();

    // Should not throw or add anything
    box.hitTestChildren(result, new Offset(5, 5), 0, 0);
    expect(result.path.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ContainerRenderBox.hitTestChildren()
// ---------------------------------------------------------------------------

describe('ContainerRenderBox.hitTestChildren', () => {
  test('tests children in reverse order', () => {
    const parent = new TestContainerBox(80, 40);
    const child1 = new TestLeafBox(10, 10, 0, 0);
    const child2 = new TestLeafBox(10, 10, 5, 5);
    parent.addChild(child1);
    parent.addChild(child2);

    const result = new BoxHitTestResult();
    // Position (6,6) hits both child1 (local 6,6) and child2 (local 1,1)
    // child2 was inserted last so it's at the end of the array
    parent.hitTestChildren(result, new Offset(6, 6), 0, 0);

    // Both children should be hit
    expect(result.path.length).toBe(2);
    // child2 is tested first (reverse order), so it appears first in the path
    expect(result.path[0]!.target).toBe(child2);
    expect(result.path[1]!.target).toBe(child1);
  });

  test('does not add children that are not hit', () => {
    const parent = new TestContainerBox(80, 40);
    const child1 = new TestLeafBox(5, 5, 0, 0);
    const child2 = new TestLeafBox(5, 5, 20, 20);
    parent.addChild(child1);
    parent.addChild(child2);

    const result = new BoxHitTestResult();
    // Position (2,2) hits child1 only
    parent.hitTestChildren(result, new Offset(2, 2), 0, 0);

    expect(result.path.length).toBe(1);
    expect(result.path[0]!.target).toBe(child1);
  });

  test('adds nothing when no children are hit', () => {
    const parent = new TestContainerBox(80, 40);
    const child = new TestLeafBox(5, 5, 10, 10);
    parent.addChild(child);

    const result = new BoxHitTestResult();
    parent.hitTestChildren(result, new Offset(0, 0), 0, 0);

    expect(result.path.length).toBe(0);
  });

  test('handles empty children list', () => {
    const parent = new TestContainerBox(80, 40);
    const result = new BoxHitTestResult();
    parent.hitTestChildren(result, new Offset(5, 5), 0, 0);
    expect(result.path.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// RenderBox.hitTest() with nested tree (integration)
// ---------------------------------------------------------------------------

describe('hitTest integration: nested tree', () => {
  test('parent and children are all added to the path', () => {
    const root = new TestContainerBox(80, 40);
    const child = new TestLeafBox(20, 10, 5, 5);
    root.addChild(child);

    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(10, 8));

    // root is hit (10 < 80, 8 < 40), then child is hit (local: 10-5=5, 8-5=3, inside 20x10)
    expect(result.path.length).toBe(2);
    expect(result.path[0]!.target).toBe(root);
    expect(result.path[1]!.target).toBe(child);
  });

  test('deeply nested tree produces correct path', () => {
    const root = new TestContainerBox(80, 40, 0, 0);
    const mid = new TestContainerBox(60, 30, 2, 2);
    const leaf = new TestLeafBox(10, 10, 3, 3);
    root.addChild(mid);
    mid.addChild(leaf);

    const result = new BoxHitTestResult();
    // global for root: (0,0), for mid: (0+2, 0+2) = (2,2), for leaf: (2+3, 2+3) = (5,5)
    // test at (8, 8): root hit (8<80,8<40), mid hit (local 8-2=6,6 < 60,30), leaf hit (local 8-5=3,3 < 10,10)
    root.hitTest(result, new Offset(8, 8));

    expect(result.path.length).toBe(3);
    expect(result.path[0]!.target).toBe(root);
    expect(result.path[1]!.target).toBe(mid);
    expect(result.path[2]!.target).toBe(leaf);
  });

  test('only root is hit when children are out of range', () => {
    const root = new TestContainerBox(80, 40);
    const child = new TestLeafBox(10, 10, 50, 30);
    root.addChild(child);

    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(5, 5));

    expect(result.path.length).toBe(1);
    expect(result.path[0]!.target).toBe(root);
  });
});

// ---------------------------------------------------------------------------
// allowHitTestOutsideBounds
// ---------------------------------------------------------------------------

describe('allowHitTestOutsideBounds', () => {
  test('defaults to false', () => {
    const box = new TestLeafBox(10, 10);
    expect(box.allowHitTestOutsideBounds).toBe(false);
  });

  test('when true, children are tested even if self is not hit', () => {
    // Parent is small (5x5 at 0,0), but allowHitTestOutsideBounds = true
    // Child is at (10,10) which is outside parent's bounds
    const parent = new TestContainerBox(5, 5, 0, 0);
    parent.allowHitTestOutsideBounds = true;
    const child = new TestLeafBox(10, 10, 10, 10);
    parent.addChild(child);

    const result = new BoxHitTestResult();
    // Test at (12,12): parent not hit (12 >= 5), but allowHitTestOutsideBounds
    // causes children to be tested. Child: global (0+10, 0+10) = (10,10), local (12-10, 12-10) = (2,2) -> hit
    parent.hitTest(result, new Offset(12, 12));

    // Parent is NOT in the path (not hit), but child IS
    expect(result.path.length).toBe(1);
    expect(result.path[0]!.target).toBe(child);
  });

  test('when false, children are not tested if self is not hit', () => {
    const parent = new TestContainerBox(5, 5, 0, 0);
    // allowHitTestOutsideBounds defaults to false
    const child = new TestLeafBox(10, 10, 10, 10);
    parent.addChild(child);

    const result = new BoxHitTestResult();
    parent.hitTest(result, new Offset(12, 12));

    // Neither parent nor child hit
    expect(result.path.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// hitTest local coordinates
// ---------------------------------------------------------------------------

describe('hitTest local coordinates', () => {
  test('local position is computed correctly for root node', () => {
    const root = new TestLeafBox(80, 40, 0, 0);
    const result = new BoxHitTestResult();

    root.hitTest(result, new Offset(15, 20));

    expect(result.path[0]!.localPosition.col).toBe(15);
    expect(result.path[0]!.localPosition.row).toBe(20);
  });

  test('local position accounts for nested offsets', () => {
    const root = new TestContainerBox(80, 40, 0, 0);
    const child = new TestLeafBox(30, 20, 10, 5);
    root.addChild(child);

    const result = new BoxHitTestResult();
    root.hitTest(result, new Offset(15, 8));

    // child global: (0+10, 0+5) = (10,5)
    // child local: (15-10, 8-5) = (5, 3)
    const childEntry = result.path[1]!;
    expect(childEntry.target).toBe(child);
    expect(childEntry.localPosition.col).toBe(5);
    expect(childEntry.localPosition.row).toBe(3);
  });
});
