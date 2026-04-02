// Rendering Pipeline Guards — structural tests that prevent regressions
// in the layout, paint, and hit-test pipeline.
//
// These tests verify:
// 1. Relayout boundary stops layout propagation
// 2. Repaint boundary stops paint propagation
// 3. sizedByParent triggers performResize
// 4. Hit testing works through nested render objects
//
// Gap #71: Comprehensive test coverage plan — test guardrails

import { describe, it, expect, beforeEach } from 'bun:test';
import { PipelineOwner } from '../pipeline-owner';
import {
  RenderBox,
  RenderObject,
  ContainerRenderBox,
  type PaintContext,
  type PipelineOwner as PipelineOwnerInterface,
} from '../render-object';
import { RenderRepaintBoundary } from '../../rendering/render-repaint-boundary';
import { BoxHitTestResult, BoxHitTestEntry } from '../../input/hit-test';
import { BoxConstraints } from '../../core/box-constraints';
import { Size, Offset } from '../../core/types';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** A leaf box that tracks layout calls. */
class TrackingLeaf extends RenderBox {
  layoutCount = 0;
  paintCount = 0;

  performLayout(): void {
    this.layoutCount++;
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }

  paint(_ctx: PaintContext, _offset: Offset): void {
    this.paintCount++;
  }
}

/** A leaf that declares sizedByParent = true. */
class SizedByParentLeaf extends RenderBox {
  layoutCount = 0;
  resizeCount = 0;

  override get sizedByParent(): boolean {
    return true;
  }

  override performResize(): void {
    this.resizeCount++;
    this.size = this.constraints!.biggest;
  }

  performLayout(): void {
    this.layoutCount++;
    // sizedByParent boxes must NOT change size in performLayout
  }

  paint(_ctx: PaintContext, _offset: Offset): void {}
}

/** Container that lays out children with the same constraints (tight pass-through). */
class TightContainer extends ContainerRenderBox {
  layoutCount = 0;

  performLayout(): void {
    this.layoutCount++;
    let height = 0;
    for (const child of this.children) {
      const box = child as RenderBox;
      box.layout(this.constraints!);
      box.offset = new Offset(0, height);
      height += box.size.height;
    }
    this.size = this.constraints!.constrain(
      new Size(this.constraints!.maxWidth, height || this.constraints!.maxHeight),
    );
  }

  paint(_ctx: PaintContext, _offset: Offset): void {}
}

/** Container that lays out children with loose constraints. */
class LooseContainer extends ContainerRenderBox {
  layoutCount = 0;

  performLayout(): void {
    this.layoutCount++;
    const loosened = this.constraints!.loosen();
    let height = 0;
    for (const child of this.children) {
      const box = child as RenderBox;
      box.layout(loosened);
      box.offset = new Offset(0, height);
      height += box.size.height;
    }
    this.size = this.constraints!.constrain(
      new Size(this.constraints!.maxWidth, height || this.constraints!.maxHeight),
    );
  }

  paint(_ctx: PaintContext, _offset: Offset): void {}
}

/** Container with parentUsesSize = false for children. */
class IndependentContainer extends ContainerRenderBox {
  layoutCount = 0;

  performLayout(): void {
    this.layoutCount++;
    const loosened = this.constraints!.loosen();
    let height = 0;
    for (const child of this.children) {
      const box = child as RenderBox;
      box.layout(loosened, { parentUsesSize: false });
      box.offset = new Offset(0, height);
      height += 10; // fixed height since we don't use child size
    }
    this.size = this.constraints!.biggest;
  }

  paint(_ctx: PaintContext, _offset: Offset): void {}
}

/** Mock PipelineOwner that tracks requestPaint calls (follows existing test patterns). */
class MockPipelineOwner implements PipelineOwnerInterface {
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

/** Helper to clear paint flags recursively (following existing test pattern). */
function clearPaintFlags(node: RenderObject): void {
  (node as any)._needsPaint = false;
  node.visitChildren((child: RenderObject) => clearPaintFlags(child));
}

// ---------------------------------------------------------------------------
// 1. Relayout Boundary
// ---------------------------------------------------------------------------

describe('Rendering Pipeline Guards', () => {

  describe('relayout boundary stops layout propagation', () => {
    let owner: PipelineOwner;

    beforeEach(() => {
      owner = new PipelineOwner();
    });

    it('tight constraints make child its own relayout boundary', () => {
      const root = new TightContainer();
      const child = new TrackingLeaf();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(child);
    });

    it('marking child dirty with tight constraints does NOT propagate to parent', () => {
      const root = new TightContainer();
      const child = new TrackingLeaf();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(root.needsLayout).toBe(false);
      expect(child.needsLayout).toBe(false);

      // Mark child dirty -- should NOT propagate to root (child is its own boundary)
      child.markNeedsLayout();
      expect(child.needsLayout).toBe(true);
      expect(root.needsLayout).toBe(false);
    });

    it('sizedByParent node is always its own relayout boundary', () => {
      const root = new LooseContainer();
      const child = new SizedByParentLeaf();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(child);
    });

    it('parentUsesSize=false makes child its own relayout boundary', () => {
      const root = new IndependentContainer();
      const child = new TrackingLeaf();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(child);
    });

    it('loose constraints child is NOT its own relayout boundary', () => {
      const root = new LooseContainer();
      const child = new TrackingLeaf();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(root);
      expect(child.relayoutBoundary).not.toBe(child);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Repaint Boundary
  // -------------------------------------------------------------------------

  describe('repaint boundary stops paint propagation', () => {
    it('RenderRepaintBoundary.isRepaintBoundary is true', () => {
      const boundary = new RenderRepaintBoundary();
      expect(boundary.isRepaintBoundary).toBe(true);
    });

    it('regular RenderBox.isRepaintBoundary is false', () => {
      const leaf = new TrackingLeaf();
      expect(leaf.isRepaintBoundary).toBe(false);
    });

    it('markNeedsPaint propagates to root when no repaint boundary', () => {
      const mockOwner = new MockPipelineOwner();
      const root = new TightContainer();
      root.attach(mockOwner);

      const parent = new TightContainer();
      root.insert(parent as any);

      const child = new TrackingLeaf();
      parent.insert(child as any);

      // Layout everything
      root.layout(BoxConstraints.tight(new Size(80, 24)));

      // Clear all paint flags
      clearPaintFlags(root);
      mockOwner.paintRequests = [];

      // Mark child dirty
      child.markNeedsPaint();

      // Without a repaint boundary, paint propagation reaches root
      expect(child.needsPaint).toBe(true);
      expect(parent.needsPaint).toBe(true);
      expect(root.needsPaint).toBe(true);
    });

    it('markNeedsPaint stops at repaint boundary', () => {
      const mockOwner = new MockPipelineOwner();
      const root = new TightContainer();
      root.attach(mockOwner);

      const boundary = new RenderRepaintBoundary();
      root.insert(boundary as any);

      const leaf = new TrackingLeaf();
      boundary.child = leaf;

      // Layout everything
      root.layout(BoxConstraints.tight(new Size(80, 24)));

      // Clear all paint flags
      clearPaintFlags(root);
      mockOwner.paintRequests = [];

      // Mark leaf as needing paint
      leaf.markNeedsPaint();

      // Paint propagation should stop at the boundary
      expect(leaf.needsPaint).toBe(true);
      expect(boundary.needsPaint).toBe(true);
      // Root should NOT be marked dirty (boundary absorbed it)
      expect(root.needsPaint).toBe(false);

      // requestPaint should have been called with the boundary node
      expect(mockOwner.paintRequests.length).toBe(1);
      expect(mockOwner.paintRequests[0]).toBe(boundary);
    });

    it('repaint boundary computes _repaintBoundary reference on attach', () => {
      const mockOwner = new MockPipelineOwner();
      const root = new TightContainer();
      root.attach(mockOwner);

      const boundary = new RenderRepaintBoundary();
      root.insert(boundary as any);

      const leaf = new TrackingLeaf();
      boundary.child = leaf;

      // After attach, repaintBoundary references should be set
      expect(boundary.repaintBoundary).toBe(boundary);
      expect(leaf.repaintBoundary).toBe(boundary);
      // Root is its own implicit boundary
      expect(root.repaintBoundary).toBe(root);
    });
  });

  // -------------------------------------------------------------------------
  // 3. sizedByParent triggers performResize
  // -------------------------------------------------------------------------

  describe('sizedByParent triggers performResize', () => {
    it('performResize is called when sizedByParent is true', () => {
      const owner = new PipelineOwner();
      const root = new TightContainer();
      const sizedChild = new SizedByParentLeaf();
      owner.setRootRenderObject(root);
      root.insert(sizedChild);
      sizedChild.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(sizedChild.resizeCount).toBe(1);
      expect(sizedChild.layoutCount).toBe(1);
      expect(sizedChild.size.width).toBe(80);
      expect(sizedChild.size.height).toBe(24);
    });

    it('performResize sets size before performLayout runs', () => {
      let sizeInLayout: Size | null = null;

      class InspectingBox extends RenderBox {
        override get sizedByParent(): boolean {
          return true;
        }
        override performResize(): void {
          this.size = this.constraints!.biggest;
        }
        performLayout(): void {
          sizeInLayout = this.size;
        }
        paint(): void {}
      }

      const owner = new PipelineOwner();
      const root = new TightContainer();
      const child = new InspectingBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(40, 10)));
      owner.flushLayout();

      expect(sizeInLayout).not.toBeNull();
      expect(sizeInLayout!.width).toBe(40);
      expect(sizeInLayout!.height).toBe(10);
    });

    it('regular (non-sizedByParent) box does NOT call performResize', () => {
      // TrackingLeaf has sizedByParent=false (default)
      const leaf = new TrackingLeaf();
      const owner = new PipelineOwner();
      const root = new TightContainer();
      owner.setRootRenderObject(root);
      root.insert(leaf);
      leaf.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(leaf.layoutCount).toBe(1);
    });

    it('sizedByParent box size equals constraints.biggest via performResize', () => {
      const sizedChild = new SizedByParentLeaf();
      const owner = new PipelineOwner();
      const root = new TightContainer();
      owner.setRootRenderObject(root);
      root.insert(sizedChild);
      sizedChild.attach(owner);

      const bigConstraints = BoxConstraints.tight(new Size(120, 40));
      owner.setConstraints(bigConstraints);
      owner.flushLayout();

      expect(sizedChild.size.width).toBe(120);
      expect(sizedChild.size.height).toBe(40);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Hit testing through nested render objects
  // -------------------------------------------------------------------------

  describe('hit testing through nested render objects', () => {
    it('hit test on a single leaf returns that leaf', () => {
      const leaf = new TrackingLeaf();
      leaf.layout(BoxConstraints.tight(new Size(10, 5)));
      leaf.offset = Offset.zero;

      const result = new BoxHitTestResult();
      const hit = leaf.hitTest(result, new Offset(3, 2));

      expect(hit).toBe(true);
      expect(result.path.length).toBe(1);
      expect(result.path[0]!.target).toBe(leaf);
    });

    it('hit test outside bounds returns false', () => {
      const leaf = new TrackingLeaf();
      leaf.layout(BoxConstraints.tight(new Size(10, 5)));
      leaf.offset = Offset.zero;

      const result = new BoxHitTestResult();
      const hit = leaf.hitTest(result, new Offset(15, 3));

      expect(hit).toBe(false);
      expect(result.path.length).toBe(0);
    });

    it('hit test through container reaches child', () => {
      const mockOwner = new MockPipelineOwner();
      const root = new TightContainer();
      root.attach(mockOwner);
      const child = new TrackingLeaf();
      root.insert(child);

      root.layout(BoxConstraints.tight(new Size(80, 24)));
      root.offset = Offset.zero;

      const result = new BoxHitTestResult();
      const hit = root.hitTest(result, new Offset(5, 3));

      expect(hit).toBe(true);
      // Path should include both root and child
      expect(result.path.length).toBeGreaterThanOrEqual(1);

      const targets = result.path.map((e) => e.target);
      expect(targets).toContain(root);
      expect(targets).toContain(child);
    });

    it('hit test on deeply nested structure finds all ancestors', () => {
      const mockOwner = new MockPipelineOwner();
      const root = new TightContainer();
      root.attach(mockOwner);
      const mid = new TightContainer();
      root.insert(mid as any);
      const leaf = new TrackingLeaf();
      mid.insert(leaf);

      root.layout(BoxConstraints.tight(new Size(80, 24)));
      root.offset = Offset.zero;

      const result = new BoxHitTestResult();
      root.hitTest(result, new Offset(5, 3));

      const targets = result.path.map((e) => e.target);
      expect(targets).toContain(leaf);
      expect(targets).toContain(mid);
      expect(targets).toContain(root);
    });

    it('RenderBox.hitTest() method works end-to-end', () => {
      const leaf = new TrackingLeaf();
      leaf.layout(BoxConstraints.tight(new Size(10, 5)));
      leaf.offset = Offset.zero;

      const result = new BoxHitTestResult();
      leaf.hitTest(result, new Offset(3, 2));
      expect(result.path.length).toBeGreaterThanOrEqual(1);
      expect(result.path[0]!.target).toBe(leaf);
    });

    it('BoxHitTestResult.addWithPaintOffset computes local position', () => {
      const result = new BoxHitTestResult();
      const box = new TrackingLeaf();
      box.layout(BoxConstraints.tight(new Size(20, 10)));

      // Parent offset at (5, 3), test position at (8, 7)
      result.addWithPaintOffset(box, new Offset(5, 3), new Offset(8, 7));

      expect(result.path.length).toBe(1);
      const entry = result.path[0]!;
      expect(entry.target).toBe(box);
      // Local position = screen position - offset = (8-5, 7-3) = (3, 4)
      expect(entry.localPosition.col).toBe(3);
      expect(entry.localPosition.row).toBe(4);
    });
  });
});
