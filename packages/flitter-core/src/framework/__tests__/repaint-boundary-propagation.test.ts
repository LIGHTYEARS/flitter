// Tests for markNeedsPaint() propagation with RepaintBoundary
// Gap R02: RepaintBoundary enhancement per .gap/12-repaint-boundary.md

import { describe, expect, it } from 'bun:test';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import {
  RenderBox,
  ContainerRenderBox,
  type PaintContext,
  type PipelineOwner,
  type RenderObject,
} from '../render-object';
import { RenderRepaintBoundary } from '../../rendering/render-repaint-boundary';

// Concrete test render boxes
class TestRenderBox extends RenderBox {
  performLayout(): void {
    this.size = this.constraints!.biggest;
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

class TestContainerRenderBox extends ContainerRenderBox {
  performLayout(): void {
    for (const child of this.children) {
      (child as RenderBox).layout(this.constraints!);
    }
    this.size = this.constraints!.biggest;
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

/** Mock PipelineOwner that tracks requestPaint calls */
class MockPipelineOwner implements PipelineOwner {
  layoutRequested = false;
  paintRequests: (RenderObject | undefined)[] = [];
  requestLayout(): void {
    this.layoutRequested = true;
  }
  requestLayoutFor(): void {}
  requestPaint(node?: RenderObject): void {
    this.paintRequests.push(node);
  }
  addNodeNeedingLayout(_node: RenderObject): void {}
}

function clearPaintFlags(node: RenderObject): void {
  (node as any)._needsPaint = false;
  node.visitChildren((child: RenderObject) => clearPaintFlags(child));
}

describe('markNeedsPaint propagation with RepaintBoundary', () => {
  it('stops at RepaintBoundary', () => {
    // Tree: root -> boundary (isRepaintBoundary=true) -> child -> leaf
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    root.attach(owner);

    const boundary = new RenderRepaintBoundary();
    root.insert(boundary as any);

    const child = new TestRenderBox();
    boundary.child = child;

    // Layout everything
    root.layout(BoxConstraints.tight(new Size(80, 24)));

    // Clear all paint flags
    clearPaintFlags(root);
    owner.paintRequests = [];

    // Mark leaf dirty
    child.markNeedsPaint();

    // child and boundary should be dirty
    expect(child.needsPaint).toBe(true);
    expect(boundary.needsPaint).toBe(true);
    // root should NOT be dirty -- propagation stopped at boundary
    expect(root.needsPaint).toBe(false);

    // requestPaint should have been called with the boundary node
    expect(owner.paintRequests.length).toBe(1);
    expect(owner.paintRequests[0]).toBe(boundary);
  });

  it('propagates to root without boundary (backward compatible)', () => {
    // Tree: root -> parent -> child (no boundaries except root)
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    root.attach(owner);

    const parent = new TestContainerRenderBox();
    root.insert(parent as any);

    const child = new TestRenderBox();
    parent.insert(child as any);

    root.layout(BoxConstraints.tight(new Size(80, 24)));
    clearPaintFlags(root);
    owner.paintRequests = [];

    child.markNeedsPaint();

    // All ancestors should be dirty (no boundaries)
    expect(child.needsPaint).toBe(true);
    expect(parent.needsPaint).toBe(true);
    expect(root.needsPaint).toBe(true);

    // requestPaint called with root (since root has no parent, it's the implicit boundary)
    expect(owner.paintRequests.length).toBe(1);
    expect(owner.paintRequests[0]).toBe(root);
  });

  it('root is always an implicit boundary', () => {
    const owner = new MockPipelineOwner();
    const root = new TestRenderBox();
    root.attach(owner);

    root.layout(BoxConstraints.tight(new Size(80, 24)));
    clearPaintFlags(root);
    owner.paintRequests = [];

    root.markNeedsPaint();
    expect(root.needsPaint).toBe(true);
    expect(owner.paintRequests.length).toBe(1);
    expect(owner.paintRequests[0]).toBe(root);
  });

  it('_repaintBoundary computed correctly during attach', () => {
    // Tree: root -> A -> B(boundary) -> C -> D
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    root.attach(owner);

    const a = new TestContainerRenderBox();
    root.insert(a as any);

    const b = new RenderRepaintBoundary();
    a.insert(b as any);

    const c = new TestContainerRenderBox();
    b.child = c as any;

    const d = new TestRenderBox();
    c.insert(d);

    // root's repaint boundary is itself (it's the root, implicit boundary)
    expect(root.repaintBoundary).toBe(root);
    // A's repaint boundary is root (no boundary between A and root)
    expect(a.repaintBoundary).toBe(root);
    // B is a repaint boundary, so its repaintBoundary is itself
    expect(b.repaintBoundary).toBe(b);
    // C's repaint boundary is B
    expect(c.repaintBoundary).toBe(b);
    // D's repaint boundary is B
    expect(d.repaintBoundary).toBe(b);
  });

  it('nested boundaries -- inner change does not dirty outer', () => {
    // Tree: root -> outerBoundary -> innerBoundary -> leaf
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    root.attach(owner);

    const outerBoundary = new RenderRepaintBoundary();
    root.insert(outerBoundary as any);

    const innerBoundary = new RenderRepaintBoundary();
    outerBoundary.child = innerBoundary as any;

    const leaf = new TestRenderBox();
    innerBoundary.child = leaf;

    root.layout(BoxConstraints.tight(new Size(80, 24)));
    clearPaintFlags(root);
    owner.paintRequests = [];

    leaf.markNeedsPaint();

    // Only inner boundary and leaf should be dirty
    expect(leaf.needsPaint).toBe(true);
    expect(innerBoundary.needsPaint).toBe(true);
    expect(outerBoundary.needsPaint).toBe(false);
    expect(root.needsPaint).toBe(false);

    // requestPaint should be for innerBoundary only
    expect(owner.paintRequests.length).toBe(1);
    expect(owner.paintRequests[0]).toBe(innerBoundary);
  });

  it('markNeedsPaint deduplication -- second call is no-op', () => {
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    root.attach(owner);

    const boundary = new RenderRepaintBoundary();
    root.insert(boundary as any);

    const child = new TestRenderBox();
    boundary.child = child;

    root.layout(BoxConstraints.tight(new Size(80, 24)));
    clearPaintFlags(root);
    owner.paintRequests = [];

    // Call markNeedsPaint twice
    child.markNeedsPaint();
    child.markNeedsPaint(); // Should be no-op (already dirty)

    // requestPaint should have been called only once
    expect(owner.paintRequests.length).toBe(1);
  });

  it('sibling boundaries are independent', () => {
    // Tree: root -> [boundaryA -> childA, boundaryB -> childB]
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    root.attach(owner);

    const boundaryA = new RenderRepaintBoundary();
    root.insert(boundaryA as any);

    const childA = new TestRenderBox();
    boundaryA.child = childA;

    const boundaryB = new RenderRepaintBoundary();
    root.insert(boundaryB as any);

    const childB = new TestRenderBox();
    boundaryB.child = childB;

    root.layout(BoxConstraints.tight(new Size(80, 24)));
    clearPaintFlags(root);
    owner.paintRequests = [];

    // Dirty only childA
    childA.markNeedsPaint();

    expect(boundaryA.needsPaint).toBe(true);
    expect(boundaryB.needsPaint).toBe(false);
    expect(root.needsPaint).toBe(false);

    // Only boundaryA should have been registered
    expect(owner.paintRequests.length).toBe(1);
    expect(owner.paintRequests[0]).toBe(boundaryA);
  });

  it('detach clears _repaintBoundary', () => {
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    root.attach(owner);

    const boundary = new RenderRepaintBoundary();
    root.insert(boundary as any);

    expect(boundary.repaintBoundary).toBe(boundary);

    boundary.detach();
    expect(boundary.repaintBoundary).toBeNull();
  });

  it('markNeedsPaint on unattached node just sets flag', () => {
    const box = new TestRenderBox();
    expect(box.attached).toBe(false);
    (box as any)._needsPaint = false;

    box.markNeedsPaint();
    expect(box.needsPaint).toBe(true);
    // No crash, no PipelineOwner call
  });
});
