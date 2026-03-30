// Tests for RelayoutBoundary -- Gap R01
// Verifies that layout invalidation stops at relayout boundaries
// instead of cascading through the entire render tree.
// Reference: .gap/11-relayout-boundary.md

import { describe, it, expect, beforeEach } from 'bun:test';
import { PipelineOwner } from '../pipeline-owner';
import { RenderBox, RenderObject, ContainerRenderBox, type PaintContext } from '../render-object';
import { BoxConstraints } from '../../core/box-constraints';
import { Size, Offset } from '../../core/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * A simple leaf render box that tracks layout calls.
 */
class TestLeafBox extends RenderBox {
  layoutCount = 0;

  performLayout(): void {
    this.layoutCount++;
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/**
 * A leaf box that overrides sizedByParent to return true.
 * Its size is determined entirely by constraints, not by children.
 */
class SizedByParentBox extends RenderBox {
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
    // sizedByParent boxes don't change size in performLayout
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/**
 * Container that lays out children with the same constraints
 * and tracks layout calls.
 */
class TestContainerBox extends ContainerRenderBox {
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

  paint(_context: PaintContext, _offset: Offset): void {}
}

/**
 * Container that lays out children with LOOSE constraints.
 * Children under loose constraints are NOT relayout boundaries
 * (unless they have sizedByParent or parentUsesSize=false).
 */
class LooseContainerBox extends ContainerRenderBox {
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

  paint(_context: PaintContext, _offset: Offset): void {}
}

/**
 * Container that lays out children with parentUsesSize=false.
 * Children laid out this way become relayout boundaries.
 */
class ParentDoesNotUseSizeContainer extends ContainerRenderBox {
  layoutCount = 0;

  performLayout(): void {
    this.layoutCount++;
    const loosened = this.constraints!.loosen();
    let height = 0;
    for (const child of this.children) {
      const box = child as RenderBox;
      box.layout(loosened, { parentUsesSize: false });
      box.offset = new Offset(0, height);
      // Since parentUsesSize is false, we use a fixed height instead
      height += 10;
    }
    this.size = this.constraints!.constrain(
      new Size(this.constraints!.maxWidth, height || this.constraints!.maxHeight),
    );
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RelayoutBoundary', () => {
  let owner: PipelineOwner;

  beforeEach(() => {
    owner = new PipelineOwner();
  });

  // =========================================================================
  // Boundary assignment
  // =========================================================================

  describe('boundary assignment', () => {
    it('root is always its own relayout boundary', () => {
      const root = new TestLeafBox();
      owner.setRootRenderObject(root);
      owner.setConstraints(BoxConstraints.loose(new Size(80, 24)));
      owner.flushLayout();

      expect(root.relayoutBoundary).toBe(root);
    });

    it('child with tight constraints is its own relayout boundary', () => {
      const root = new TestContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      // Tight constraints make child a boundary
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(child);
    });

    it('child with loose constraints is NOT its own relayout boundary', () => {
      const root = new LooseContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      // Loose constraints: child inherits parent's boundary
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(root);
      expect(child.relayoutBoundary).not.toBe(child);
    });

    it('sizedByParent child is always its own relayout boundary', () => {
      const root = new LooseContainerBox();
      const child = new SizedByParentBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      // Even with loose constraints, sizedByParent makes child a boundary
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(child);
    });

    it('child with parentUsesSize=false is its own relayout boundary', () => {
      const root = new ParentDoesNotUseSizeContainer();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).toBe(child);
    });
  });

  // =========================================================================
  // markNeedsLayout stops at boundary
  // =========================================================================

  describe('markNeedsLayout stops at boundary', () => {
    it('marking deep node dirty stops at the child boundary (tight constraints)', () => {
      const root = new TestContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      // Initial layout with tight constraints
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      // Both are clean
      expect(root.needsLayout).toBe(false);
      expect(child.needsLayout).toBe(false);
      expect(root.layoutCount).toBe(1);
      expect(child.layoutCount).toBe(1);

      // Mark child dirty -- should NOT propagate to root
      child.markNeedsLayout();
      expect(child.needsLayout).toBe(true);
      expect(root.needsLayout).toBe(false); // Root stays clean!
    });

    it('marking deep node dirty propagates past non-boundary (loose constraints)', () => {
      const root = new LooseContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      // Initial layout -- child gets loose constraints, NOT a boundary
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(root.needsLayout).toBe(false);
      expect(child.needsLayout).toBe(false);

      // Mark child dirty -- should propagate to root (the boundary)
      child.markNeedsLayout();
      expect(child.needsLayout).toBe(true);
      expect(root.needsLayout).toBe(true); // Root gets dirty too
    });

    it('marking sizedByParent child dirty does not propagate to parent', () => {
      const root = new LooseContainerBox();
      const child = new SizedByParentBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(root.needsLayout).toBe(false);
      expect(child.needsLayout).toBe(false);

      // Mark child dirty -- sizedByParent means child IS the boundary
      child.markNeedsLayout();
      expect(child.needsLayout).toBe(true);
      expect(root.needsLayout).toBe(false);
    });
  });

  // =========================================================================
  // _nodesNeedingLayout
  // =========================================================================

  describe('_nodesNeedingLayout contains correct boundary nodes', () => {
    it('contains only the boundary node when deep node is marked dirty', () => {
      const root = new TestContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      // Clear the list
      expect(owner.hasNodesNeedingLayout).toBe(false);

      // Mark child dirty -- child is its own boundary (tight constraints)
      child.markNeedsLayout();
      expect(owner.hasNodesNeedingLayout).toBe(true);

      // The list should contain the child (the boundary), not the root
      const nodes = owner.nodesNeedingLayout;
      expect(nodes).toContain(child);
      // Root should NOT be in the list
      expect(nodes.filter(n => n === root).length).toBe(0);
    });

    it('contains root when non-boundary child is marked dirty', () => {
      const root = new LooseContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(owner.hasNodesNeedingLayout).toBe(false);

      // Mark child dirty -- propagates to root (the boundary)
      child.markNeedsLayout();
      expect(owner.hasNodesNeedingLayout).toBe(true);

      const nodes = owner.nodesNeedingLayout;
      expect(nodes).toContain(root);
    });

    it('contains multiple boundary nodes at different depths', () => {
      const root = new LooseContainerBox();
      const boundary1 = new SizedByParentBox();
      const boundary2 = new SizedByParentBox();
      owner.setRootRenderObject(root);
      root.insert(boundary1);
      root.insert(boundary2);
      boundary1.attach(owner);
      boundary2.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(owner.hasNodesNeedingLayout).toBe(false);

      // Mark both boundaries dirty
      boundary1.markNeedsLayout();
      boundary2.markNeedsLayout();

      const nodes = owner.nodesNeedingLayout;
      expect(nodes).toContain(boundary1);
      expect(nodes).toContain(boundary2);
      // Root should NOT be in the list
      expect(nodes.filter(n => n === root).length).toBe(0);
    });
  });

  // =========================================================================
  // flushLayout processes boundary nodes
  // =========================================================================

  describe('flushLayout with boundaries', () => {
    it('only relays out dirty boundary nodes and their subtrees', () => {
      const root = new TestContainerBox();
      const child1 = new TestLeafBox();
      const child2 = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child1);
      root.insert(child2);
      child1.attach(owner);
      child2.attach(owner);

      // Tight constraints -- both children are boundaries
      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(root.layoutCount).toBe(1);
      expect(child1.layoutCount).toBe(1);
      expect(child2.layoutCount).toBe(1);

      // Mark only child1 dirty
      child1.markNeedsLayout();
      owner.flushLayout();

      // Only child1 should be relaid out, not root or child2
      expect(child1.layoutCount).toBe(2);
      expect(root.layoutCount).toBe(1); // Root stayed clean
      expect(child2.layoutCount).toBe(1); // Child2 stayed clean
    });

    it('processes nodes in depth order (parents before children)', () => {
      const root = new LooseContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      // Mark child dirty -- propagates to root
      child.markNeedsLayout();

      // The root is the boundary. When root is relaid out,
      // it calls child.layout() which clears the child's dirty flag.
      owner.flushLayout();

      // Root was relaid out (it's the boundary)
      expect(root.layoutCount).toBe(2);
      // Child was also relaid out (as part of root's performLayout)
      expect(child.layoutCount).toBe(2);
    });

    it('avoids full-tree cascade when boundary exists', () => {
      // Tree structure:
      //   root (tight) -> middle (tight) -> leaf (tight)
      // All get tight constraints, so middle and leaf are boundaries.
      const root = new TestContainerBox();
      const middle = new TestContainerBox();
      const leaf = new TestLeafBox();

      owner.setRootRenderObject(root);
      root.insert(middle);
      middle.attach(owner);
      middle.insert(leaf);
      leaf.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(root.layoutCount).toBe(1);
      expect(middle.layoutCount).toBe(1);
      expect(leaf.layoutCount).toBe(1);

      // Mark leaf dirty. Since leaf gets tight constraints, it's its own
      // boundary. Only leaf should be in _nodesNeedingLayout.
      leaf.markNeedsLayout();

      expect(leaf.needsLayout).toBe(true);
      expect(middle.needsLayout).toBe(false);
      expect(root.needsLayout).toBe(false);

      owner.flushLayout();

      // Only leaf is relaid out
      expect(leaf.layoutCount).toBe(2);
      expect(middle.layoutCount).toBe(1); // untouched
      expect(root.layoutCount).toBe(1);   // untouched
    });
  });

  // =========================================================================
  // sizedByParent two-phase layout
  // =========================================================================

  describe('sizedByParent two-phase layout', () => {
    it('calls performResize when constraints change', () => {
      const root = new SizedByParentBox();
      owner.setRootRenderObject(root);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(root.resizeCount).toBe(1);
      expect(root.layoutCount).toBe(1);
      expect(root.size.width).toBe(80);
      expect(root.size.height).toBe(24);
    });

    it('calls performResize again when constraints change', () => {
      const root = new SizedByParentBox();
      owner.setRootRenderObject(root);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      // Change constraints
      owner.setConstraints(BoxConstraints.tight(new Size(120, 40)));
      owner.flushLayout();

      expect(root.resizeCount).toBe(2);
      expect(root.size.width).toBe(120);
      expect(root.size.height).toBe(40);
    });
  });

  // =========================================================================
  // depth property
  // =========================================================================

  describe('RenderObject.depth', () => {
    it('root has depth 0', () => {
      const root = new TestLeafBox();
      expect(root.depth).toBe(0);
    });

    it('child has correct depth', () => {
      const root = new TestContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      expect(root.depth).toBe(0);
      expect(child.depth).toBe(1);
    });

    it('grandchild has depth 2', () => {
      const root = new TestContainerBox();
      const middle = new TestContainerBox();
      const leaf = new TestLeafBox();

      owner.setRootRenderObject(root);
      root.insert(middle);
      middle.attach(owner);
      middle.insert(leaf);
      leaf.attach(owner);

      expect(root.depth).toBe(0);
      expect(middle.depth).toBe(1);
      expect(leaf.depth).toBe(2);
    });
  });

  // =========================================================================
  // Boundary cleared on detach
  // =========================================================================

  describe('boundary cleanup', () => {
    it('_relayoutBoundary is cleared on detach', () => {
      const root = new TestContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).not.toBeNull();

      // Detach child
      child.detach();
      expect(child.relayoutBoundary).toBeNull();
    });

    it('_relayoutBoundary is cleared when dropped from parent', () => {
      const root = new TestContainerBox();
      const child = new TestLeafBox();
      owner.setRootRenderObject(root);
      root.insert(child);
      child.attach(owner);

      owner.setConstraints(BoxConstraints.tight(new Size(80, 24)));
      owner.flushLayout();

      expect(child.relayoutBoundary).not.toBeNull();

      // Remove child from parent
      root.remove(child);
      expect(child.relayoutBoundary).toBeNull();
    });
  });
});
