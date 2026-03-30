// Tests for RenderObject, RenderBox, ContainerRenderBox, RenderObjectWidget
// Amp ref: n_ (RenderObject), j9 (RenderBox), yj (RenderObjectWidget)

import { describe, expect, it } from 'bun:test';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import {
  RenderObject,
  RenderBox,
  ContainerRenderBox,
  ParentData,
  BoxParentData,
  PipelineOwner,
  PaintContext,
  RenderObjectWidget,
  SingleChildRenderObjectWidget,
  MultiChildRenderObjectWidget,
  LeafRenderObjectWidget,
} from '../render-object';
import { Widget } from '../widget';

// ============================================================
// Concrete test render objects
// ============================================================

class TestRenderBox extends RenderBox {
  performLayout(): void {
    this.size = this.constraints!.biggest;
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

class TestContainerRenderBox extends ContainerRenderBox {
  performLayout(): void {
    let height = 0;
    for (const child of this.children) {
      const box = child as RenderBox;
      box.layout(this.constraints!);
      box.offset = new Offset(0, height);
      height += box.size.height;
    }
    this.size = new Size(this.constraints!.maxWidth, height);
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

/** Mock PipelineOwner to track requests */
class MockPipelineOwner implements PipelineOwner {
  layoutRequested = false;
  paintRequested = false;
  nodesNeedingLayout: RenderObject[] = [];
  requestLayout(): void {
    this.layoutRequested = true;
  }
  requestPaint(): void {
    this.paintRequested = true;
  }
  addNodeNeedingLayout(node: RenderObject): void {
    this.nodesNeedingLayout.push(node);
    this.layoutRequested = true;
  }
}

// ============================================================
// RenderBox tests
// ============================================================

describe('RenderBox', () => {
  it('layout() with tight constraints sets size', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));
    box.layout(constraints);
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(24);
  });

  it('layout() skips performLayout when constraints unchanged and not dirty', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));
    box.layout(constraints);

    // Manually change size to detect if performLayout runs again
    box.size = new Size(999, 999);
    box.layout(constraints);

    // If performLayout ran, size would be 80x24 again (the biggest of tight constraints).
    // Since constraints didn't change and not dirty, performLayout should NOT run.
    expect(box.size.width).toBe(999);
    expect(box.size.height).toBe(999);
  });

  it('layout() re-layouts when constraints change', () => {
    const box = new TestRenderBox();
    box.layout(BoxConstraints.tight(new Size(80, 24)));
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(24);

    box.layout(BoxConstraints.tight(new Size(120, 40)));
    expect(box.size.width).toBe(120);
    expect(box.size.height).toBe(40);
  });

  it('offset can be set directly', () => {
    const box = new TestRenderBox();
    expect(box.offset.col).toBe(0);
    expect(box.offset.row).toBe(0);

    box.offset = new Offset(10, 5);
    expect(box.offset.col).toBe(10);
    expect(box.offset.row).toBe(5);
  });

  it('constraints getter returns last constraints passed to layout()', () => {
    const box = new TestRenderBox();
    expect(box.constraints).toBeNull();

    const c = BoxConstraints.tight(new Size(80, 24));
    box.layout(c);
    expect(box.constraints).toBe(c);
  });

  it('hasSize returns false for zero size, true after layout', () => {
    const box = new TestRenderBox();
    expect(box.hasSize).toBe(false);

    box.layout(BoxConstraints.tight(new Size(10, 10)));
    expect(box.hasSize).toBe(true);
  });
});

// ============================================================
// markNeedsLayout / markNeedsPaint
// ============================================================

describe('markNeedsLayout', () => {
  it('propagates to parent when not a relayout boundary', () => {
    const owner = new MockPipelineOwner();
    const parent = new TestContainerRenderBox();
    const child = new TestRenderBox();

    parent.attach(owner);
    parent.insert(child);
    child.attach(owner);

    // Layout both with loose constraints so child is NOT a relayout boundary.
    // (Tight constraints would make the child its own boundary.)
    parent.layout(BoxConstraints.loose(new Size(80, 24)));
    expect(parent.needsLayout).toBe(false);
    expect(child.needsLayout).toBe(false);

    // Marking child dirty should propagate to parent since
    // child is not a relayout boundary (loose constraints).
    owner.layoutRequested = false;
    child.markNeedsLayout();
    expect(child.needsLayout).toBe(true);
    expect(parent.needsLayout).toBe(true);
  });

  it('does not propagate past relayout boundary (tight constraints)', () => {
    const owner = new MockPipelineOwner();
    const parent = new TestContainerRenderBox();
    const child = new TestRenderBox();

    parent.attach(owner);
    parent.insert(child);
    child.attach(owner);

    // Layout with tight constraints: child becomes its own relayout boundary.
    parent.layout(BoxConstraints.tight(new Size(80, 24)));
    expect(parent.needsLayout).toBe(false);
    expect(child.needsLayout).toBe(false);

    // Marking child dirty: propagation stops at child (the boundary).
    // Parent stays clean.
    owner.layoutRequested = false;
    owner.nodesNeedingLayout = [];
    child.markNeedsLayout();
    expect(child.needsLayout).toBe(true);
    expect(parent.needsLayout).toBe(false);
    // The child should be registered with PipelineOwner
    expect(owner.nodesNeedingLayout).toContain(child);
  });

  it('on root notifies owner', () => {
    const owner = new MockPipelineOwner();
    const root = new TestRenderBox();
    root.attach(owner);

    // Layout first to clear dirty flag
    root.layout(BoxConstraints.tight(new Size(80, 24)));
    expect(root.needsLayout).toBe(false);

    owner.layoutRequested = false;
    root.markNeedsLayout();
    expect(owner.layoutRequested).toBe(true);
  });

  it('does not propagate if already dirty', () => {
    const owner = new MockPipelineOwner();
    const parent = new TestContainerRenderBox();
    const child = new TestRenderBox();

    parent.attach(owner);
    parent.insert(child);
    child.attach(owner);

    // Both are initially dirty (needsLayout=true by default)
    // markNeedsLayout on child should be a no-op since it's already dirty
    owner.layoutRequested = false;
    child.markNeedsLayout();
    // Should not have requested layout again since already dirty
    // (parent was also already dirty)
  });
});

describe('markNeedsPaint', () => {
  it('propagates to parent', () => {
    const owner = new MockPipelineOwner();
    const parent = new TestContainerRenderBox();
    const child = new TestRenderBox();

    parent.attach(owner);
    parent.insert(child);
    child.attach(owner);

    // Layout to clear dirty flags (layout clears _needsLayout;
    // _needsPaint is initially true, so we need to clear it manually for the test)
    parent.layout(BoxConstraints.tight(new Size(80, 24)));

    // Manually clear paint flags to test propagation
    // Access via casting to test internal state
    (parent as any)._needsPaint = false;
    (child as any)._needsPaint = false;

    owner.paintRequested = false;
    child.markNeedsPaint();
    expect(child.needsPaint).toBe(true);
    expect(parent.needsPaint).toBe(true);
  });

  it('on root notifies owner', () => {
    const owner = new MockPipelineOwner();
    const root = new TestRenderBox();
    root.attach(owner);

    // Clear paint flag
    (root as any)._needsPaint = false;

    owner.paintRequested = false;
    root.markNeedsPaint();
    expect(root.needsPaint).toBe(true);
    expect(owner.paintRequested).toBe(true);
  });
});

// ============================================================
// adoptChild / dropChild
// ============================================================

describe('adoptChild / dropChild', () => {
  it('adoptChild sets parent pointer', () => {
    const parent = new TestContainerRenderBox();
    const child = new TestRenderBox();

    parent.adoptChild(child);
    expect(child.parent).toBe(parent);
  });

  it('dropChild clears parent pointer', () => {
    const parent = new TestContainerRenderBox();
    const child = new TestRenderBox();

    parent.adoptChild(child);
    expect(child.parent).toBe(parent);

    parent.dropChild(child);
    expect(child.parent).toBeNull();
  });

  it('adoptChild attaches child if parent is attached', () => {
    const owner = new MockPipelineOwner();
    const parent = new TestContainerRenderBox();
    parent.attach(owner);

    const child = new TestRenderBox();
    parent.adoptChild(child);
    expect(child.attached).toBe(true);
  });

  it('dropChild detaches child if child is attached', () => {
    const owner = new MockPipelineOwner();
    const parent = new TestContainerRenderBox();
    parent.attach(owner);

    const child = new TestRenderBox();
    parent.adoptChild(child);
    expect(child.attached).toBe(true);

    parent.dropChild(child);
    expect(child.attached).toBe(false);
  });
});

// ============================================================
// ContainerRenderBox
// ============================================================

describe('ContainerRenderBox', () => {
  it('insert adds child', () => {
    const container = new TestContainerRenderBox();
    const child = new TestRenderBox();

    container.insert(child);
    expect(container.childCount).toBe(1);
    expect(container.firstChild).toBe(child);
    expect(container.lastChild).toBe(child);
  });

  it('insert after positions child correctly', () => {
    const container = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();
    const child3 = new TestRenderBox();

    container.insert(child1);
    container.insert(child3);
    container.insert(child2, child1); // insert child2 after child1

    expect(container.childCount).toBe(3);
    expect(container.children[0]).toBe(child1);
    expect(container.children[1]).toBe(child2);
    expect(container.children[2]).toBe(child3);
  });

  it('remove removes child', () => {
    const container = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();

    container.insert(child1);
    container.insert(child2);
    expect(container.childCount).toBe(2);

    container.remove(child1);
    expect(container.childCount).toBe(1);
    expect(container.firstChild).toBe(child2);
  });

  it('removeAll removes all children', () => {
    const container = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();
    const child3 = new TestRenderBox();

    container.insert(child1);
    container.insert(child2);
    container.insert(child3);
    expect(container.childCount).toBe(3);

    container.removeAll();
    expect(container.childCount).toBe(0);
    expect(container.firstChild).toBeNull();
    expect(container.lastChild).toBeNull();
  });

  it('move reorders children', () => {
    const container = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();
    const child3 = new TestRenderBox();

    container.insert(child1);
    container.insert(child2);
    container.insert(child3);

    // Move child3 after child1 (child3 was at end, now between child1 and child2)
    container.move(child3, child1);
    expect(container.children[0]).toBe(child1);
    expect(container.children[1]).toBe(child3);
    expect(container.children[2]).toBe(child2);
  });

  it('move to beginning when no after specified', () => {
    const container = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();
    const child3 = new TestRenderBox();

    container.insert(child1);
    container.insert(child2);
    container.insert(child3);

    // Move child3 to beginning
    container.move(child3);
    expect(container.children[0]).toBe(child3);
    expect(container.children[1]).toBe(child1);
    expect(container.children[2]).toBe(child2);
  });

  it('visitChildren visits all children', () => {
    const container = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();
    const child3 = new TestRenderBox();

    container.insert(child1);
    container.insert(child2);
    container.insert(child3);

    const visited: RenderObject[] = [];
    container.visitChildren((child) => visited.push(child));

    expect(visited.length).toBe(3);
    expect(visited[0]).toBe(child1);
    expect(visited[1]).toBe(child2);
    expect(visited[2]).toBe(child3);
  });

  it('firstChild returns null when empty', () => {
    const container = new TestContainerRenderBox();
    expect(container.firstChild).toBeNull();
  });

  it('lastChild returns null when empty', () => {
    const container = new TestContainerRenderBox();
    expect(container.lastChild).toBeNull();
  });

  it('performLayout stacks children vertically', () => {
    const container = new TestContainerRenderBox();
    const child1 = new TestRenderBox();
    const child2 = new TestRenderBox();

    container.insert(child1);
    container.insert(child2);

    container.layout(BoxConstraints.tight(new Size(80, 10)));
    // Each child gets 80x10 from tight constraints -> biggest = 80x10
    // child1 offset (0,0), child2 offset (0,10)
    // container size = (80, 20) -> 10+10

    expect(child1.size.width).toBe(80);
    expect(child1.size.height).toBe(10);
    expect(child1.offset.col).toBe(0);
    expect(child1.offset.row).toBe(0);

    expect(child2.size.width).toBe(80);
    expect(child2.size.height).toBe(10);
    expect(child2.offset.col).toBe(0);
    expect(child2.offset.row).toBe(10);

    expect(container.size.width).toBe(80);
    expect(container.size.height).toBe(20);
  });
});

// ============================================================
// ParentData
// ============================================================

describe('ParentData', () => {
  it('is set up via setupParentData', () => {
    const parent = new TestRenderBox();
    const child = new TestRenderBox();

    expect(child.parentData).toBeNull();
    parent.setupParentData(child);
    expect(child.parentData).toBeInstanceOf(ParentData);
  });

  it('does not replace existing ParentData', () => {
    const parent = new TestRenderBox();
    const child = new TestRenderBox();
    const existing = new BoxParentData();
    child.parentData = existing;

    parent.setupParentData(child);
    // Should NOT replace since BoxParentData extends ParentData
    expect(child.parentData).toBe(existing);
  });
});

// ============================================================
// RenderObjectWidget, SingleChild, MultiChild, Leaf
// ============================================================

class TestLeafRenderObjectWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }
}

class TestSingleChildWidget extends SingleChildRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestContainerRenderBox();
  }
}

class TestMultiChildWidget extends MultiChildRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestContainerRenderBox();
  }
}

describe('RenderObjectWidget', () => {
  it('createRenderObject returns a render object', () => {
    const widget = new TestLeafRenderObjectWidget();
    const renderObject = widget.createRenderObject();
    expect(renderObject).toBeInstanceOf(RenderBox);
  });

  it('updateRenderObject is a no-op by default', () => {
    const widget = new TestLeafRenderObjectWidget();
    const renderObject = widget.createRenderObject();
    // Should not throw
    widget.updateRenderObject(renderObject);
  });
});

describe('SingleChildRenderObjectWidget', () => {
  it('has optional child', () => {
    const noChild = new TestSingleChildWidget();
    expect(noChild.child).toBeUndefined();

    const leaf = new TestLeafRenderObjectWidget();
    const withChild = new TestSingleChildWidget({ child: leaf });
    expect(withChild.child).toBe(leaf);
  });

  it('createElement returns real SingleChildRenderObjectElement', () => {
    const widget = new TestSingleChildWidget();
    const element = widget.createElement();
    expect(element.widget).toBe(widget);
    expect(element.constructor.name).toBe('SingleChildRenderObjectElement');
  });
});

describe('MultiChildRenderObjectWidget', () => {
  it('has children array', () => {
    const noChildren = new TestMultiChildWidget();
    expect(noChildren.children).toEqual([]);

    const leaf1 = new TestLeafRenderObjectWidget();
    const leaf2 = new TestLeafRenderObjectWidget();
    const withChildren = new TestMultiChildWidget({
      children: [leaf1, leaf2],
    });
    expect(withChildren.children.length).toBe(2);
    expect(withChildren.children[0]).toBe(leaf1);
    expect(withChildren.children[1]).toBe(leaf2);
  });

  it('children is a defensive copy', () => {
    const leaf = new TestLeafRenderObjectWidget();
    const original = [leaf];
    const widget = new TestMultiChildWidget({ children: original });

    // Modifying original should not affect widget
    original.push(new TestLeafRenderObjectWidget());
    expect(widget.children.length).toBe(1);
  });

  it('createElement returns real MultiChildRenderObjectElement', () => {
    const widget = new TestMultiChildWidget();
    const element = widget.createElement();
    expect(element.widget).toBe(widget);
    expect(element.constructor.name).toBe('MultiChildRenderObjectElement');
  });
});

describe('LeafRenderObjectWidget', () => {
  it('createElement returns real LeafRenderObjectElement', () => {
    const widget = new TestLeafRenderObjectWidget();
    const element = widget.createElement();
    expect(element.widget).toBe(widget);
    expect(element.constructor.name).toBe('LeafRenderObjectElement');
  });
});

// ============================================================
// attach / detach
// ============================================================

describe('attach / detach', () => {
  it('attach sets owner and attached flag', () => {
    const owner = new MockPipelineOwner();
    const box = new TestRenderBox();
    expect(box.attached).toBe(false);
    expect(box.owner).toBeNull();

    box.attach(owner);
    expect(box.attached).toBe(true);
    expect(box.owner).toBe(owner);
  });

  it('detach clears owner and attached flag', () => {
    const owner = new MockPipelineOwner();
    const box = new TestRenderBox();
    box.attach(owner);
    expect(box.attached).toBe(true);

    box.detach();
    expect(box.attached).toBe(false);
    expect(box.owner).toBeNull();
  });

  it('attach is idempotent', () => {
    const owner = new MockPipelineOwner();
    const box = new TestRenderBox();
    box.attach(owner);
    box.attach(owner); // second call should be no-op
    expect(box.attached).toBe(true);
  });

  it('detach is idempotent', () => {
    const box = new TestRenderBox();
    box.detach(); // should not throw when not attached
    expect(box.attached).toBe(false);
  });
});

// ============================================================
// RenderBox intrinsic size base methods
// ============================================================

describe('RenderBox intrinsic size base methods', () => {
  it('getMinIntrinsicWidth returns 0 by default', () => {
    const box = new TestRenderBox();
    expect(box.getMinIntrinsicWidth(100)).toBe(0);
  });

  it('getMaxIntrinsicWidth returns 0 by default', () => {
    const box = new TestRenderBox();
    expect(box.getMaxIntrinsicWidth(100)).toBe(0);
  });

  it('getMinIntrinsicHeight returns 0 by default', () => {
    const box = new TestRenderBox();
    expect(box.getMinIntrinsicHeight(100)).toBe(0);
  });

  it('getMaxIntrinsicHeight returns 0 by default', () => {
    const box = new TestRenderBox();
    expect(box.getMaxIntrinsicHeight(100)).toBe(0);
  });
});

// ============================================================
// RenderBox layout edge cases
// ============================================================

describe('RenderBox layout edge cases', () => {
  it('layout re-layouts when dirty even if constraints same', () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(new Size(80, 24));
    box.layout(constraints);

    // Force dirty via markNeedsLayout (need to attach first)
    const owner = new MockPipelineOwner();
    box.attach(owner);
    // _needsLayout was cleared by layout(), now mark dirty
    (box as any)._needsLayout = true;

    // Change size to detect if performLayout runs
    box.size = new Size(999, 999);
    box.layout(constraints); // same constraints but dirty -> should re-layout
    expect(box.size.width).toBe(80);
    expect(box.size.height).toBe(24);
  });
});
