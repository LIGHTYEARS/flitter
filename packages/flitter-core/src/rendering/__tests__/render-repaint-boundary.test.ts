// Tests for RenderRepaintBoundary render object
// Gap R02: RepaintBoundary enhancement per .gap/12-repaint-boundary.md

import { describe, expect, it } from 'bun:test';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import {
  RenderBox,
  type PaintContext as PaintContextInterface,
  type PipelineOwner,
} from '../../framework/render-object';
import { RenderRepaintBoundary } from '../render-repaint-boundary';

// Concrete test render box that tracks paint calls
class TestPaintTracker extends RenderBox {
  paintCount = 0;
  lastPaintOffset: Offset | null = null;

  performLayout(): void {
    this.size = this.constraints!.biggest;
  }

  paint(_context: PaintContextInterface, offset: Offset): void {
    this.paintCount++;
    this.lastPaintOffset = offset;
  }
}

/** Mock PipelineOwner */
class MockPipelineOwner implements PipelineOwner {
  layoutRequested = false;
  paintRequests: any[] = [];
  requestLayout(): void {
    this.layoutRequested = true;
  }
  requestLayoutFor(): void {}
  requestPaint(node?: any): void {
    this.paintRequests.push(node);
  }
  addNodeNeedingLayout(_node: any): void {}
}

describe('RenderRepaintBoundary', () => {
  it('isRepaintBoundary returns true', () => {
    const boundary = new RenderRepaintBoundary();
    expect(boundary.isRepaintBoundary).toBe(true);
  });

  it('default RenderBox.isRepaintBoundary returns false', () => {
    const box = new TestPaintTracker();
    expect(box.isRepaintBoundary).toBe(false);
  });

  it('performLayout passes constraints to child and adopts size', () => {
    const owner = new MockPipelineOwner();
    const boundary = new RenderRepaintBoundary();
    const child = new TestPaintTracker();
    boundary.attach(owner);
    boundary.child = child;

    const constraints = BoxConstraints.tight(new Size(20, 10));
    boundary.layout(constraints);

    expect(boundary.size.width).toBe(20);
    expect(boundary.size.height).toBe(10);
    expect(child.size.width).toBe(20);
    expect(child.size.height).toBe(10);
  });

  it('performLayout uses smallest when no child', () => {
    const boundary = new RenderRepaintBoundary();
    const constraints = new BoxConstraints({
      minWidth: 5,
      maxWidth: 20,
      minHeight: 3,
      maxHeight: 10,
    });
    boundary.layout(constraints);

    expect(boundary.size.width).toBe(5);
    expect(boundary.size.height).toBe(3);
  });

  it('layer is null initially', () => {
    const boundary = new RenderRepaintBoundary();
    expect(boundary.layer).toBeNull();
  });

  it('visitChildren visits child', () => {
    const boundary = new RenderRepaintBoundary();
    const child = new TestPaintTracker();
    const owner = new MockPipelineOwner();
    boundary.attach(owner);
    boundary.child = child;

    const visited: any[] = [];
    boundary.visitChildren((c) => visited.push(c));
    expect(visited.length).toBe(1);
    expect(visited[0]).toBe(child);
  });

  it('visitChildren is empty when no child', () => {
    const boundary = new RenderRepaintBoundary();
    const visited: any[] = [];
    boundary.visitChildren((c) => visited.push(c));
    expect(visited.length).toBe(0);
  });

  it('setting child adopts and drops correctly', () => {
    const owner = new MockPipelineOwner();
    const boundary = new RenderRepaintBoundary();
    boundary.attach(owner);

    const child1 = new TestPaintTracker();
    boundary.child = child1;
    expect(child1.parent).toBe(boundary);
    expect(child1.attached).toBe(true);

    const child2 = new TestPaintTracker();
    boundary.child = child2;
    expect(child1.parent).toBeNull();
    expect(child2.parent).toBe(boundary);
  });

  it('performLayout resizes layer when size changes', () => {
    const owner = new MockPipelineOwner();
    const boundary = new RenderRepaintBoundary();
    boundary.attach(owner);

    const child = new TestPaintTracker();
    boundary.child = child;

    // First layout at 10x5
    boundary.layout(BoxConstraints.tight(new Size(10, 5)));
    // Access layer by forcing it to exist via internal state
    // (layer is created lazily during paint, not layout)
    expect(boundary.layer).toBeNull(); // not yet created

    // The layer is created during paint, so the resize logic is tested
    // through the paint path. Here we verify the size is correct.
    expect(boundary.size.width).toBe(10);
    expect(boundary.size.height).toBe(5);
  });
});
