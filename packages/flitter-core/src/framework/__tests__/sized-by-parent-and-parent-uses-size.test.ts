// Tests for Gap R04 (sizedByParent / performResize) and Gap R05 (parentUsesSize)
// These tests verify the two-phase layout protocol and the parentUsesSize parameter.

import { describe, expect, it, jest } from 'bun:test';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import {
  RenderBox,
  ContainerRenderBox,
  PipelineOwner,
  PaintContext,
  RenderObject,
} from '../render-object';

// ============================================================
// Test render objects
// ============================================================

/** Standard RenderBox (sizedByParent = false, the default) */
class TestRenderBox extends RenderBox {
  performLayoutCallCount = 0;
  performLayout(): void {
    this.performLayoutCallCount++;
    this.size = this.constraints!.biggest;
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

/** RenderBox with sizedByParent = true, using custom performResize */
class SizedByParentRenderBox extends RenderBox {
  performResizeCallCount = 0;
  performLayoutCallCount = 0;

  get sizedByParent(): boolean {
    return true;
  }

  performResize(): void {
    this.performResizeCallCount++;
    const c = this.constraints!;
    // Size to full width but fixed height of 10 (clamped to constraints)
    const height = Math.max(c.minHeight, Math.min(10, c.maxHeight));
    this.size = new Size(c.maxWidth, height);
  }

  performLayout(): void {
    this.performLayoutCallCount++;
    // Must NOT set this.size when sizedByParent is true
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/** RenderBox with sizedByParent = true that does NOT override performResize */
class DefaultPerformResizeRenderBox extends RenderBox {
  get sizedByParent(): boolean {
    return true;
  }

  performLayout(): void {
    // No-op: size set by default performResize()
  }

  paint(_context: PaintContext, _offset: Offset): void {}
}

/** RenderBox with sizedByParent = true and a child */
class SizedByParentWithChildRenderBox extends RenderBox {
  private _child: RenderBox | null = null;
  performResizeCallCount = 0;
  performLayoutCallCount = 0;

  get sizedByParent(): boolean {
    return true;
  }

  set child(c: RenderBox | null) {
    if (this._child) this.dropChild(this._child);
    this._child = c;
    if (c) this.adoptChild(c);
  }

  get child(): RenderBox | null {
    return this._child;
  }

  performResize(): void {
    this.performResizeCallCount++;
    // Directly set size based on constraints only, ignoring children.
    // Uses maxWidth/2 and a fixed height of 20, clamped to constraints.
    const c = this.constraints!;
    const w = Math.max(c.minWidth, Math.min(c.maxWidth / 2, c.maxWidth));
    const h = Math.max(c.minHeight, Math.min(20, c.maxHeight));
    this.size = new Size(w, h);
  }

  performLayout(): void {
    this.performLayoutCallCount++;
    if (this._child) {
      this._child.layout(this.constraints!);
    }
  }

  paint(_context: PaintContext, _offset: Offset): void {}

  visitChildren(visitor: (child: RenderObject) => void): void {
    if (this._child) visitor(this._child);
  }
}

/** Container that can lay out children with parentUsesSize option */
class TestContainerRenderBox extends ContainerRenderBox {
  useParentUsesSize: boolean | undefined = undefined;

  performLayout(): void {
    let height = 0;
    for (const child of this.children) {
      const box = child as RenderBox;
      if (this.useParentUsesSize !== undefined) {
        box.layout(this.constraints!, { parentUsesSize: this.useParentUsesSize });
      } else {
        box.layout(this.constraints!);
      }
      box.offset = new Offset(0, height);
      height += box.size.height;
    }
    this.size = new Size(this.constraints!.maxWidth, height);
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

/** Mock PipelineOwner */
class MockPipelineOwner implements PipelineOwner {
  layoutRequested = false;
  paintRequested = false;
  nodesNeedingLayout: RenderObject[] = [];
  requestLayout(): void {
    this.layoutRequested = true;
  }
  requestPaint(_node?: RenderObject): void {
    this.paintRequested = true;
  }
  addNodeNeedingLayout(node: RenderObject): void {
    this.nodesNeedingLayout.push(node);
  }
}

// ============================================================
// sizedByParent tests (Gap R04)
// ============================================================

describe('sizedByParent (Gap R04)', () => {
  it('default sizedByParent is false', () => {
    const box = new TestRenderBox();
    expect(box.sizedByParent).toBe(false);
  });

  it('performResize() is NOT called when sizedByParent is false', () => {
    const box = new TestRenderBox();
    const originalPerformResize = box.performResize.bind(box);
    let resizeCalled = false;
    box.performResize = () => {
      resizeCalled = true;
      originalPerformResize();
    };

    box.layout(BoxConstraints.tight(new Size(80, 24)));
    expect(resizeCalled).toBe(false);
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(24);
  });

  it('performResize() IS called when sizedByParent is true and constraints changed', () => {
    const box = new SizedByParentRenderBox();
    // Use loose constraints so performResize can set height=10
    const constraints = new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 24,
    });

    box.layout(constraints);

    expect(box.performResizeCallCount).toBe(1);
    expect(box.performLayoutCallCount).toBe(1);
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(10); // performResize sets height to 10
  });

  it('performResize() is called BEFORE performLayout()', () => {
    const callOrder: string[] = [];

    class OrderTrackingRenderBox extends RenderBox {
      get sizedByParent(): boolean { return true; }

      performResize(): void {
        callOrder.push('performResize');
        this.size = this.constraints!.constrain(new Size(10, 10));
      }

      performLayout(): void {
        callOrder.push('performLayout');
      }

      paint(_context: PaintContext, _offset: Offset): void {}
    }

    const box = new OrderTrackingRenderBox();
    box.layout(BoxConstraints.tight(new Size(80, 24)));

    expect(callOrder).toEqual(['performResize', 'performLayout']);
  });

  it('performResize() is called only when constraints change', () => {
    const box = new SizedByParentRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));

    // First layout: performResize called (no previous constraints)
    box.layout(constraints);
    expect(box.performResizeCallCount).toBe(1);
    expect(box.performLayoutCallCount).toBe(1);

    // Force dirty, same constraints: performResize NOT called
    (box as any)._needsLayout = true;
    box.layout(constraints);
    expect(box.performResizeCallCount).toBe(1); // unchanged
    expect(box.performLayoutCallCount).toBe(2); // performLayout runs again

    // New constraints: performResize called
    const newConstraints = BoxConstraints.tight(new Size(120, 40));
    (box as any)._needsLayout = true;
    box.layout(newConstraints);
    expect(box.performResizeCallCount).toBe(2);
    expect(box.performLayoutCallCount).toBe(3);
  });

  it('performResize() sets size from constraints only (with child present)', () => {
    const parent = new SizedByParentWithChildRenderBox();
    const child = new TestRenderBox();
    parent.child = child;

    // Use loose constraints so performResize can choose its own size
    const constraints = new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 40,
    });
    parent.layout(constraints);

    // Size set by performResize: maxWidth/2=40, height=20
    expect(parent.size.width).toBe(40);
    expect(parent.size.height).toBe(20);
    expect(parent.performResizeCallCount).toBe(1);
    expect(parent.performLayoutCallCount).toBe(1);

    // Child was still laid out (with the original constraints)
    expect(child.size.width).toBe(80);
    expect(child.size.height).toBe(40);
  });

  it('default performResize() returns constraints.smallest', () => {
    const box = new DefaultPerformResizeRenderBox();
    const constraints = new BoxConstraints({
      minWidth: 5,
      maxWidth: 100,
      minHeight: 3,
      maxHeight: 50,
    });

    box.layout(constraints);
    expect(box.size.width).toBe(5);
    expect(box.size.height).toBe(3);
  });

  it('sizedByParent node keeps size stable across dirty-only relayouts', () => {
    const parent = new SizedByParentWithChildRenderBox();
    const child = new TestRenderBox();
    parent.child = child;

    // Use loose constraints so performResize can choose its own size
    const constraints = new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 40,
    });
    parent.layout(constraints);
    expect(parent.size.width).toBe(40);
    expect(parent.size.height).toBe(20);

    // Force dirty (simulating child change)
    (parent as any)._needsLayout = true;
    parent.layout(constraints); // same constraints, dirty node

    // performResize was NOT called again (same constraints)
    expect(parent.performResizeCallCount).toBe(1);
    // performLayout WAS called (to re-layout child)
    expect(parent.performLayoutCallCount).toBe(2);
    // Size unchanged
    expect(parent.size.width).toBe(40);
    expect(parent.size.height).toBe(20);
  });

  it('backward compatibility: non-sizedByParent layout is unchanged', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));

    box.layout(constraints);
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(24);
    expect(box.performLayoutCallCount).toBe(1);

    // Skip optimization still works
    box.size = new Size(999, 999);
    box.layout(constraints);
    expect(box.size.width).toBe(999); // performLayout not called
    expect(box.size.height).toBe(999);
    expect(box.performLayoutCallCount).toBe(1);

    // Constraint change triggers re-layout
    box.layout(BoxConstraints.tight(new Size(120, 40)));
    expect(box.size.width).toBe(120);
    expect(box.size.height).toBe(40);
    expect(box.performLayoutCallCount).toBe(2);
  });
});

// ============================================================
// parentUsesSize tests (Gap R05)
// ============================================================

describe('parentUsesSize (Gap R05)', () => {
  it('layout() accepts parentUsesSize parameter without error', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));

    box.layout(constraints, { parentUsesSize: false });
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(24);
  });

  it('parentUsesSize defaults to true', () => {
    const box = new TestRenderBox();
    box.layout(BoxConstraints.tight(new Size(80, 24)));
    expect(box.parentUsesSize).toBe(true);
  });

  it('parentUsesSize false is stored', () => {
    const box = new TestRenderBox();
    box.layout(BoxConstraints.tight(new Size(80, 24)), { parentUsesSize: false });
    expect(box.parentUsesSize).toBe(false);
  });

  it('parentUsesSize true is stored', () => {
    const box = new TestRenderBox();
    box.layout(BoxConstraints.tight(new Size(80, 24)), { parentUsesSize: true });
    expect(box.parentUsesSize).toBe(true);
  });

  it('parentUsesSize can change between layout calls', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));

    box.layout(constraints, { parentUsesSize: false });
    expect(box.parentUsesSize).toBe(false);

    (box as any)._needsLayout = true;
    box.layout(constraints, { parentUsesSize: true });
    expect(box.parentUsesSize).toBe(true);
  });

  it('layout skip optimization still works with parentUsesSize', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));

    box.layout(constraints, { parentUsesSize: false });
    expect(box.performLayoutCallCount).toBe(1);

    // Manually change size to detect if performLayout runs again
    box.size = new Size(999, 999);
    box.layout(constraints, { parentUsesSize: false });

    // performLayout should NOT run (same constraints, not dirty)
    expect(box.size.width).toBe(999);
    expect(box.size.height).toBe(999);
    expect(box.performLayoutCallCount).toBe(1);
  });

  it('layout re-executes when dirty even with parentUsesSize false', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));

    box.layout(constraints, { parentUsesSize: false });
    expect(box.performLayoutCallCount).toBe(1);

    (box as any)._needsLayout = true;
    box.layout(constraints, { parentUsesSize: false });
    expect(box.performLayoutCallCount).toBe(2);
    expect(box.size.width).toBe(80);
  });

  it('parentUsesSize is updated even when layout is skipped', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));

    // First layout with parentUsesSize true
    box.layout(constraints, { parentUsesSize: true });
    expect(box.parentUsesSize).toBe(true);

    // Second call with same constraints and not dirty should skip layout
    // but still update parentUsesSize
    box.layout(constraints, { parentUsesSize: false });
    // parentUsesSize is set BEFORE the skip check, so it IS updated
    expect(box.parentUsesSize).toBe(false);
  });

  it('container can pass parentUsesSize false to children', () => {
    const container = new TestContainerRenderBox();
    const child = new TestRenderBox();
    container.useParentUsesSize = false;

    container.insert(child);
    container.layout(BoxConstraints.tight(new Size(80, 24)));

    expect(child.parentUsesSize).toBe(false);
    expect(child.size.width).toBe(80);
    expect(child.size.height).toBe(24);
  });

  it('container passes parentUsesSize true by default', () => {
    const container = new TestContainerRenderBox();
    const child = new TestRenderBox();
    // useParentUsesSize = undefined means layout() called with single arg

    container.insert(child);
    container.layout(BoxConstraints.tight(new Size(80, 24)));

    expect(child.parentUsesSize).toBe(true);
  });
});

// ============================================================
// Integration: sizedByParent + parentUsesSize together
// ============================================================

describe('sizedByParent + parentUsesSize integration', () => {
  it('sizedByParent node with parentUsesSize false works correctly', () => {
    const sizedBox = new SizedByParentRenderBox();
    // Use loose constraints so performResize can set height=10
    const constraints = new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 24,
    });

    sizedBox.layout(constraints, { parentUsesSize: false });

    expect(sizedBox.sizedByParent).toBe(true);
    expect(sizedBox.parentUsesSize).toBe(false);
    expect(sizedBox.performResizeCallCount).toBe(1);
    expect(sizedBox.performLayoutCallCount).toBe(1);
    expect(sizedBox.size.width).toBe(80);
    expect(sizedBox.size.height).toBe(10);
  });

  it('full pipeline with sizedByParent and parentUsesSize', () => {
    const container = new TestContainerRenderBox();
    const sizedChild = new SizedByParentRenderBox();
    const normalChild = new TestRenderBox();
    container.useParentUsesSize = false;

    container.insert(sizedChild);
    container.insert(normalChild);

    // Use loose constraints so sizedChild's performResize can set height=10
    const constraints = new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 100,
    });
    container.layout(constraints);

    // sizedChild: performResize sets height=10, performLayout is no-op for size
    expect(sizedChild.size.width).toBe(80);
    expect(sizedChild.size.height).toBe(10);
    expect(sizedChild.performResizeCallCount).toBe(1);
    expect(sizedChild.parentUsesSize).toBe(false);

    // normalChild: standard layout takes biggest (80x100)
    expect(normalChild.size.width).toBe(80);
    expect(normalChild.size.height).toBe(100);
    expect(normalChild.parentUsesSize).toBe(false);

    // Container accounts for child heights
    expect(container.size.width).toBe(80);
    expect(container.size.height).toBe(110); // 10 + 100
  });

  it('multiple layout passes with sizedByParent stability', () => {
    const container = new TestContainerRenderBox();
    const sizedChild = new SizedByParentRenderBox();

    container.insert(sizedChild);

    // Use loose constraints so performResize can set height=10
    const constraints = new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 100,
    });
    container.layout(constraints);

    // First pass: both performResize and performLayout called
    expect(sizedChild.performResizeCallCount).toBe(1);
    expect(sizedChild.performLayoutCallCount).toBe(1);

    // Force parent dirty (simulating some change)
    (container as any)._needsLayout = true;
    (sizedChild as any)._needsLayout = true;
    container.layout(constraints);

    // Second pass: same constraints for sizedChild, so performResize NOT called again
    expect(sizedChild.performResizeCallCount).toBe(1);
    expect(sizedChild.performLayoutCallCount).toBe(2);

    // Size still stable
    expect(sizedChild.size.width).toBe(80);
    expect(sizedChild.size.height).toBe(10);
  });

  it('parentUsesSize false creates a relayout boundary', () => {
    const owner = new MockPipelineOwner();
    const container = new TestContainerRenderBox();
    const child = new TestRenderBox();

    container.attach(owner);
    container.useParentUsesSize = false;
    container.insert(child);
    child.attach(owner);

    // Layout the tree to set up boundaries
    container.layout(BoxConstraints.tight(new Size(80, 24)));

    // The parentUsesSize flag is stored on the child
    expect(child.parentUsesSize).toBe(false);

    // The parentUsesSize value is accessible for future relayout boundary computation
    // (actual boundary computation is done in Gap R01, but the flag is stored)
  });

  it('sizedByParent with constraint change triggers performResize', () => {
    const box = new SizedByParentRenderBox();

    // Use loose constraints so performResize can set height=10
    box.layout(new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 100,
    }));
    expect(box.performResizeCallCount).toBe(1);
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(10);

    // Change constraints (still loose)
    box.layout(new BoxConstraints({
      minWidth: 0, maxWidth: 120,
      minHeight: 0, maxHeight: 100,
    }));
    expect(box.performResizeCallCount).toBe(2);
    expect(box.size.width).toBe(120);
    expect(box.size.height).toBe(10);
  });

  it('layout propagation respects both sizedByParent and parentUsesSize flags', () => {
    const owner = new MockPipelineOwner();
    const root = new TestContainerRenderBox();
    const sizedChild = new SizedByParentWithChildRenderBox();
    const leaf = new TestRenderBox();

    root.attach(owner);
    root.insert(sizedChild);
    sizedChild.attach(owner);
    sizedChild.child = leaf;
    leaf.attach(owner);

    // Use loose constraints so sizedChild's performResize can set its own size
    const constraints = new BoxConstraints({
      minWidth: 0, maxWidth: 80,
      minHeight: 0, maxHeight: 100,
    });
    root.layout(constraints);

    // sizedChild: performResize sets width=40 (maxWidth/2), height=20
    expect(sizedChild.size.width).toBe(40);
    expect(sizedChild.size.height).toBe(20);
    // leaf gets the full constraints (biggest = 80x100)
    expect(leaf.size.width).toBe(80);
    expect(leaf.size.height).toBe(100);

    // The sizedByParent node computed size via performResize
    expect(sizedChild.performResizeCallCount).toBe(1);
    // performLayout was called to lay out the child
    expect(sizedChild.performLayoutCallCount).toBe(1);
  });
});
