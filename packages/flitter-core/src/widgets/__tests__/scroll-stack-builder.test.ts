// Tests for ScrollController, ScrollViewport, Stack, Positioned, RenderStack, Builder
// Plan 07-02: Scroll + Stack + Builder

import { describe, test, expect, beforeEach } from 'bun:test';
import { ScrollController } from '../scroll-controller';
import {
  RenderScrollViewport,
  SingleChildScrollView,
  Scrollable,
} from '../scroll-view';
import {
  Stack,
  Positioned,
  RenderStack,
  StackParentData,
} from '../stack';
import { Builder } from '../builder';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';
import { Widget, StatelessWidget, type BuildContext } from '../../framework/widget';
import { RenderBox, type PaintContext } from '../../framework/render-object';
import { ParentDataWidget, ParentDataElement } from '../parent-data-widget';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A simple concrete RenderBox for testing. */
class TestRenderBox extends RenderBox {
  fixedSize: Size;
  painted: boolean = false;
  lastPaintOffset: Offset = Offset.zero;

  constructor(size: Size = new Size(10, 10)) {
    super();
    this.fixedSize = size;
  }

  performLayout(): void {
    this.size = this.constraints!.constrain(this.fixedSize);
  }

  paint(context: PaintContext, offset: Offset): void {
    this.painted = true;
    this.lastPaintOffset = offset;
  }
}

/** A simple widget for testing Builder. */
class TestWidget extends StatelessWidget {
  readonly label: string;

  constructor(label: string) {
    super();
    this.label = label;
  }

  build(_context: BuildContext): Widget {
    return this;
  }
}

// ============================================================================
// ScrollController tests
// ============================================================================

describe('ScrollController', () => {
  let controller: ScrollController;

  beforeEach(() => {
    controller = new ScrollController();
  });

  test('initial state', () => {
    expect(controller.offset).toBe(0);
    expect(controller.maxScrollExtent).toBe(0);
    expect(controller.followMode).toBe(true);
    expect(controller.atBottom).toBe(true);
  });

  test('jumpTo clamps to valid range', () => {
    controller.updateMaxScrollExtent(100);
    controller.jumpTo(50);
    expect(controller.offset).toBe(50);
    expect(controller.atBottom).toBe(false);

    // Clamp to max
    controller.jumpTo(200);
    expect(controller.offset).toBe(100);
    expect(controller.atBottom).toBe(true);

    // Clamp to 0
    controller.jumpTo(-10);
    expect(controller.offset).toBe(0);
  });

  test('scrollBy adjusts relative to current offset', () => {
    controller.updateMaxScrollExtent(100);
    controller.jumpTo(20);

    controller.scrollBy(30);
    expect(controller.offset).toBe(50);

    controller.scrollBy(-10);
    expect(controller.offset).toBe(40);
  });

  test('maxScrollExtent always >= 0', () => {
    controller.updateMaxScrollExtent(-10);
    expect(controller.maxScrollExtent).toBe(0);
  });

  test('updateMaxScrollExtent clamps current offset', () => {
    controller.updateMaxScrollExtent(100);
    controller.jumpTo(80);
    controller.updateMaxScrollExtent(50);
    expect(controller.offset).toBe(50);
  });

  test('atBottom with 1px tolerance', () => {
    controller.updateMaxScrollExtent(100);
    controller.jumpTo(99);
    expect(controller.atBottom).toBe(true); // within 1px

    controller.jumpTo(98);
    expect(controller.atBottom).toBe(false); // beyond tolerance
  });

  test('followMode auto-scrolls to end', () => {
    expect(controller.followMode).toBe(true);
    controller.updateMaxScrollExtent(100);
    expect(controller.offset).toBe(100); // auto-scrolled

    controller.updateMaxScrollExtent(200);
    expect(controller.offset).toBe(200); // auto-scrolled again
  });

  test('disableFollowMode stops auto-scroll', () => {
    controller.updateMaxScrollExtent(100);
    controller.jumpTo(50);
    controller.disableFollowMode();
    expect(controller.followMode).toBe(false);

    controller.updateMaxScrollExtent(200);
    expect(controller.offset).toBe(50); // did NOT auto-scroll
  });

  test('listener notifications', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    controller.addListener(listener);
    controller.updateMaxScrollExtent(100);
    expect(callCount).toBe(1);

    controller.jumpTo(50);
    expect(callCount).toBe(2);

    controller.scrollBy(10);
    expect(callCount).toBe(3);
  });

  test('removeListener stops notifications', () => {
    let callCount = 0;
    const listener = () => { callCount++; };

    controller.addListener(listener);
    controller.updateMaxScrollExtent(100);
    expect(callCount).toBe(1);

    controller.removeListener(listener);
    controller.jumpTo(50);
    expect(callCount).toBe(1); // unchanged
  });

  test('dispose clears all listeners', () => {
    let callCount = 0;
    controller.addListener(() => { callCount++; });
    controller.addListener(() => { callCount++; });

    controller.dispose();
    controller.updateMaxScrollExtent(100);
    expect(callCount).toBe(0);
  });

  test('jumpTo does not notify if offset unchanged', () => {
    let callCount = 0;
    controller.addListener(() => { callCount++; });

    controller.jumpTo(0); // already at 0
    expect(callCount).toBe(0);
  });
});

// ============================================================================
// RenderScrollViewport tests
// ============================================================================

describe('RenderScrollViewport', () => {
  test('child gets unbounded vertical constraints', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });
    const child = new TestRenderBox(new Size(40, 100));

    viewport.child = child;

    const parentConstraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    });

    viewport.layout(parentConstraints);

    // Child should have been laid out with unbounded height
    expect(child.constraints!.maxHeight).toBe(Infinity);
    expect(child.constraints!.maxWidth).toBe(40);
  });

  test('child gets unbounded horizontal constraints when horizontal', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({
      scrollController: controller,
      axisDirection: 'horizontal',
    });
    const child = new TestRenderBox(new Size(100, 20));

    viewport.child = child;

    const parentConstraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    });

    viewport.layout(parentConstraints);

    // Child should have been laid out with unbounded width
    expect(child.constraints!.maxWidth).toBe(Infinity);
    expect(child.constraints!.maxHeight).toBe(20);
  });

  test('self sizes to viewport constraints', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });
    const child = new TestRenderBox(new Size(40, 100));

    viewport.child = child;

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    }));

    // Viewport should size to parent constraints, not child size
    expect(viewport.size.height).toBe(20);
    expect(viewport.size.width).toBe(40);
  });

  test('updates scroll controller max extent', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });
    const child = new TestRenderBox(new Size(40, 100));

    viewport.child = child;

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    }));

    // Max scroll extent = child height - viewport height = 100 - 20 = 80
    expect(controller.maxScrollExtent).toBe(80);
  });

  test('paints with clipping (calls withClip if available)', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });
    const child = new TestRenderBox(new Size(40, 100));
    viewport.child = child;

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    }));

    let clipped = false;
    let clipArgs: number[] = [];
    const mockContext: any = {
      withClip(x: number, y: number, w: number, h: number) {
        clipped = true;
        clipArgs = [x, y, w, h];
        return mockContext;
      },
    };

    viewport.paint(mockContext, new Offset(5, 3));

    expect(clipped).toBe(true);
    expect(clipArgs).toEqual([5, 3, 40, 20]);
  });

  test('paint adjusts child position by scroll offset', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });
    const child = new TestRenderBox(new Size(40, 100));
    viewport.child = child;

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    }));

    // Scroll down 30 rows
    controller.jumpTo(30);

    const mockContext: any = {
      withClip() { return mockContext; },
    };

    viewport.paint(mockContext, new Offset(0, 0));

    // Child should be painted at offset (0, -30) (scroll offset subtracted)
    expect(child.lastPaintOffset.row).toBe(-30);
    expect(child.lastPaintOffset.col).toBe(0);
  });

  test('no child: sizes to zero constrained', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });

    viewport.layout(new BoxConstraints({
      minWidth: 5,
      maxWidth: 40,
      minHeight: 5,
      maxHeight: 20,
    }));

    expect(viewport.size.width).toBe(5);
    expect(viewport.size.height).toBe(5);
  });
});

// ============================================================================
// Stack and RenderStack tests
// ============================================================================

describe('Stack', () => {
  test('creates RenderStack with default fit', () => {
    const stack = new Stack({ children: [] });
    const renderObject = stack.createRenderObject();
    expect(renderObject).toBeInstanceOf(RenderStack);
    expect(renderObject.fit).toBe('loose');
  });

  test('creates RenderStack with custom fit', () => {
    const stack = new Stack({ children: [], fit: 'expand' });
    const renderObject = stack.createRenderObject();
    expect(renderObject.fit).toBe('expand');
  });
});

describe('RenderStack', () => {
  test('non-positioned children laid out with loose constraints', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const child1 = new TestRenderBox(new Size(20, 10));
    const child2 = new TestRenderBox(new Size(15, 25));

    stack.insert(child1);
    stack.insert(child2);

    const constraints = new BoxConstraints({
      minWidth: 5,
      maxWidth: 40,
      minHeight: 5,
      maxHeight: 30,
    });

    stack.layout(constraints);

    // Children should receive loose constraints (min=0, max=parent.max)
    expect(child1.constraints!.minWidth).toBe(0);
    expect(child1.constraints!.minHeight).toBe(0);
    expect(child1.constraints!.maxWidth).toBe(40);
    expect(child1.constraints!.maxHeight).toBe(30);
  });

  test('sizes to max of non-positioned children', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const child1 = new TestRenderBox(new Size(20, 10));
    const child2 = new TestRenderBox(new Size(15, 25));

    stack.insert(child1);
    stack.insert(child2);

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 30,
    }));

    // Stack should size to max of children
    expect(stack.size.width).toBe(20);
    expect(stack.size.height).toBe(25);
  });

  test('non-positioned children positioned at (0, 0)', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const child = new TestRenderBox(new Size(20, 10));

    stack.insert(child);

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 30,
    }));

    expect(child.offset.col).toBe(0);
    expect(child.offset.row).toBe(0);
  });

  test('fit: expand gives children tight constraints', () => {
    const stack = new RenderStack({ fit: 'expand' });
    const child = new TestRenderBox(new Size(20, 10));

    stack.insert(child);

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 30,
    }));

    // Child should receive tight constraints = biggest (40x30)
    expect(child.constraints!.minWidth).toBe(40);
    expect(child.constraints!.maxWidth).toBe(40);
    expect(child.constraints!.minHeight).toBe(30);
    expect(child.constraints!.maxHeight).toBe(30);
  });

  test('fit: passthrough passes constraints as-is', () => {
    const stack = new RenderStack({ fit: 'passthrough' });
    const child = new TestRenderBox(new Size(20, 10));

    stack.insert(child);

    const constraints = new BoxConstraints({
      minWidth: 5,
      maxWidth: 40,
      minHeight: 5,
      maxHeight: 30,
    });

    stack.layout(constraints);

    expect(child.constraints!.minWidth).toBe(5);
    expect(child.constraints!.maxWidth).toBe(40);
    expect(child.constraints!.minHeight).toBe(5);
    expect(child.constraints!.maxHeight).toBe(30);
  });

  test('paints all children', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const child1 = new TestRenderBox(new Size(20, 10));
    const child2 = new TestRenderBox(new Size(15, 25));

    stack.insert(child1);
    stack.insert(child2);

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 30,
    }));

    const mockContext: any = {};
    stack.paint(mockContext, new Offset(5, 3));

    expect(child1.painted).toBe(true);
    expect(child2.painted).toBe(true);

    expect(child1.lastPaintOffset.col).toBe(5);
    expect(child1.lastPaintOffset.row).toBe(3);
  });
});

// ============================================================================
// Positioned (as ParentDataWidget) tests
// ============================================================================

describe('Positioned', () => {
  test('is an instance of ParentDataWidget', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
      left: 5,
      top: 10,
    });
    expect(positioned).toBeInstanceOf(ParentDataWidget);
  });

  test('createElement returns ParentDataElement', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
      left: 5,
    });
    const elem = positioned.createElement();
    expect(elem).toBeInstanceOf(ParentDataElement);
  });

  test('stores positioning properties', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
      left: 1,
      top: 2,
      right: 3,
      bottom: 4,
      width: 5,
      height: 6,
    });
    expect(positioned.left).toBe(1);
    expect(positioned.top).toBe(2);
    expect(positioned.right).toBe(3);
    expect(positioned.bottom).toBe(4);
    expect(positioned.width).toBe(5);
    expect(positioned.height).toBe(6);
  });

  test('properties default to undefined', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
    });
    expect(positioned.left).toBeUndefined();
    expect(positioned.top).toBeUndefined();
    expect(positioned.right).toBeUndefined();
    expect(positioned.bottom).toBeUndefined();
    expect(positioned.width).toBeUndefined();
    expect(positioned.height).toBeUndefined();
  });
});

// ============================================================================
// Positioned.applyParentData tests
// ============================================================================

describe('Positioned.applyParentData', () => {
  test('sets all six fields on StackParentData', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
      left: 1, top: 2, right: 3, bottom: 4, width: 5, height: 6,
    });

    const renderObj = new TestRenderBox(new Size(10, 10));
    renderObj.parentData = new StackParentData();

    positioned.applyParentData(renderObj);

    const pd = renderObj.parentData as StackParentData;
    expect(pd.left).toBe(1);
    expect(pd.top).toBe(2);
    expect(pd.right).toBe(3);
    expect(pd.bottom).toBe(4);
    expect(pd.width).toBe(5);
    expect(pd.height).toBe(6);
  });

  test('marks parent as needing layout when values change', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
      left: 5,
    });

    const renderObj = new TestRenderBox(new Size(10, 10));
    const parentObj = new RenderStack();
    // Insert triggers setupParentData which creates StackParentData
    parentObj.insert(renderObj);

    let layoutRequested = false;
    const origMark = parentObj.markNeedsLayout.bind(parentObj);
    parentObj.markNeedsLayout = () => { layoutRequested = true; origMark(); };

    positioned.applyParentData(renderObj);
    expect(layoutRequested).toBe(true);
  });

  test('does not mark layout if values unchanged', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
      left: 5,
    });

    const renderObj = new TestRenderBox(new Size(10, 10));
    renderObj.parentData = new StackParentData();
    (renderObj.parentData as StackParentData).left = 5; // already set

    const parentObj = new RenderStack();
    // We need the parent relationship but don't want setupParentData to overwrite
    // So first insert, then manually restore the parentData
    parentObj.insert(renderObj);
    (renderObj.parentData as StackParentData).left = 5;

    let layoutRequested = false;
    const origMark = parentObj.markNeedsLayout.bind(parentObj);
    parentObj.markNeedsLayout = () => { layoutRequested = true; origMark(); };

    positioned.applyParentData(renderObj);
    expect(layoutRequested).toBe(false);
  });

  test('does not crash on non-StackParentData', () => {
    const positioned = new Positioned({
      child: new TestWidget('test'),
      left: 5,
    });

    const renderObj = new TestRenderBox(new Size(10, 10));
    // parentData is default, not StackParentData
    expect(() => positioned.applyParentData(renderObj)).not.toThrow();
  });
});

// ============================================================================
// RenderStack with positioned children (via StackParentData)
// ============================================================================

describe('RenderStack with positioned children', () => {
  test('positioned child with left+top gets correct offset', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const nonPosChild = new TestRenderBox(new Size(40, 30));
    const posChild = new TestRenderBox(new Size(10, 10));

    stack.insert(nonPosChild);
    stack.insert(posChild);

    // Manually set StackParentData (simulating what ParentDataElement does)
    const pd = posChild.parentData as StackParentData;
    pd.left = 5;
    pd.top = 10;

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 50,
      minHeight: 0,
      maxHeight: 40,
    }));

    expect(posChild.offset.col).toBe(5);
    expect(posChild.offset.row).toBe(10);
  });

  test('positioned child with right+bottom gets correct offset', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const nonPosChild = new TestRenderBox(new Size(40, 30));
    const posChild = new TestRenderBox(new Size(10, 8));

    stack.insert(nonPosChild);
    stack.insert(posChild);

    const pd = posChild.parentData as StackParentData;
    pd.right = 5;
    pd.bottom = 10;

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 50,
      minHeight: 0,
      maxHeight: 40,
    }));

    // Stack sizes to (40, 30) from non-positioned child
    // right=5: x = 40 - 5 - 10 = 25
    // bottom=10: y = 30 - 10 - 8 = 12
    expect(posChild.offset.col).toBe(25);
    expect(posChild.offset.row).toBe(12);
  });

  test('positioned child with left+right gets determined width', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const nonPosChild = new TestRenderBox(new Size(40, 30));
    const posChild = new TestRenderBox(new Size(100, 10)); // will be constrained

    stack.insert(nonPosChild);
    stack.insert(posChild);

    const pd = posChild.parentData as StackParentData;
    pd.left = 5;
    pd.right = 10;

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 50,
      minHeight: 0,
      maxHeight: 40,
    }));

    // Width should be stack.width - left - right = 40 - 5 - 10 = 25
    expect(posChild.size.width).toBe(25);
    expect(posChild.offset.col).toBe(5);
  });

  test('positioned child with explicit width gets tight width', () => {
    const stack = new RenderStack({ fit: 'loose' });
    const nonPosChild = new TestRenderBox(new Size(40, 30));
    const posChild = new TestRenderBox(new Size(100, 10));

    stack.insert(nonPosChild);
    stack.insert(posChild);

    const pd = posChild.parentData as StackParentData;
    pd.left = 5;
    pd.width = 15;

    stack.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 50,
      minHeight: 0,
      maxHeight: 40,
    }));

    expect(posChild.size.width).toBe(15);
    expect(posChild.offset.col).toBe(5);
  });
});

// ============================================================================
// RenderPositioned removal regression test
// ============================================================================

describe('RenderPositioned removal', () => {
  test('RenderPositioned is not exported from stack module', () => {
    const stackModule = require('../stack');
    expect(stackModule.RenderPositioned).toBeUndefined();
  });
});

// ============================================================================
// StackParentData tests
// ============================================================================

describe('StackParentData', () => {
  test('isPositioned returns false when all undefined', () => {
    const pd = new StackParentData();
    expect(pd.isPositioned()).toBe(false);
  });

  test('isPositioned returns true when any field is set', () => {
    const pd1 = new StackParentData();
    pd1.left = 10;
    expect(pd1.isPositioned()).toBe(true);

    const pd2 = new StackParentData();
    pd2.bottom = 0;
    expect(pd2.isPositioned()).toBe(true);

    const pd3 = new StackParentData();
    pd3.width = 50;
    expect(pd3.isPositioned()).toBe(true);
  });
});

// ============================================================================
// Builder tests
// ============================================================================

describe('Builder', () => {
  test('calls builder function with context', () => {
    let receivedContext: BuildContext | null = null;

    const builder = new Builder({
      builder: (context) => {
        receivedContext = context;
        return new TestWidget('built');
      },
    });

    const mockContext: any = {
      widget: builder,
      mounted: true,
    };

    const result = builder.build(mockContext);
    expect(receivedContext).toBe(mockContext);
    expect(result).toBeInstanceOf(TestWidget);
    expect((result as TestWidget).label).toBe('built');
  });

  test('returns the widget from builder', () => {
    const expected = new TestWidget('expected');

    const builder = new Builder({
      builder: () => expected,
    });

    const mockContext: any = {
      widget: builder,
      mounted: true,
    };

    const result = builder.build(mockContext);
    expect(result).toBe(expected);
  });
});

// ============================================================================
// SingleChildScrollView option defaults
// ============================================================================

describe('SingleChildScrollView options', () => {
  test('enableKeyboardScroll defaults to false', () => {
    const view = new SingleChildScrollView({
      child: new TestWidget('content'),
    });
    expect(view.enableKeyboardScroll).toBe(false);
  });

  test('enableMouseScroll defaults to true', () => {
    const view = new SingleChildScrollView({
      child: new TestWidget('content'),
    });
    expect(view.enableMouseScroll).toBe(true);
  });

  test('enableKeyboardScroll can be set to true', () => {
    const view = new SingleChildScrollView({
      child: new TestWidget('content'),
      enableKeyboardScroll: true,
    });
    expect(view.enableKeyboardScroll).toBe(true);
  });

  test('enableMouseScroll can be set to false', () => {
    const view = new SingleChildScrollView({
      child: new TestWidget('content'),
      enableMouseScroll: false,
    });
    expect(view.enableMouseScroll).toBe(false);
  });

  test('scrollDirection defaults to vertical', () => {
    const view = new SingleChildScrollView({
      child: new TestWidget('content'),
    });
    expect(view.scrollDirection).toBe('vertical');
  });

  test('position defaults to top', () => {
    const view = new SingleChildScrollView({
      child: new TestWidget('content'),
    });
    expect(view.position).toBe('top');
  });
});

// ============================================================================
// Scrollable option defaults
// ============================================================================

describe('Scrollable options', () => {
  test('enableKeyboardScroll defaults to false', () => {
    const scrollable = new Scrollable({
      child: new TestWidget('content'),
    });
    expect(scrollable.enableKeyboardScroll).toBe(false);
  });

  test('enableMouseScroll defaults to true', () => {
    const scrollable = new Scrollable({
      child: new TestWidget('content'),
    });
    expect(scrollable.enableMouseScroll).toBe(true);
  });

  test('enableKeyboardScroll can be set to true', () => {
    const scrollable = new Scrollable({
      child: new TestWidget('content'),
      enableKeyboardScroll: true,
    });
    expect(scrollable.enableKeyboardScroll).toBe(true);
  });

  test('enableMouseScroll can be set to false', () => {
    const scrollable = new Scrollable({
      child: new TestWidget('content'),
      enableMouseScroll: false,
    });
    expect(scrollable.enableMouseScroll).toBe(false);
  });
});

// ============================================================================
// RenderScrollViewport updates viewportSize on controller
// ============================================================================

describe('RenderScrollViewport - viewportSize', () => {
  test('updates controller viewportSize during layout', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });
    const child = new TestRenderBox(new Size(40, 100));
    viewport.child = child;

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 25,
    }));

    expect(controller.viewportSize).toBe(25);
  });

  test('updates controller viewportSize for horizontal scroll', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({
      scrollController: controller,
      axisDirection: 'horizontal',
    });
    const child = new TestRenderBox(new Size(100, 20));
    viewport.child = child;

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 50,
      minHeight: 0,
      maxHeight: 20,
    }));

    // For horizontal scroll, viewportMainSize = width
    expect(controller.viewportSize).toBe(50);
  });

  test('viewportSize updates on re-layout with different constraints', () => {
    const controller = new ScrollController();
    const viewport = new RenderScrollViewport({ scrollController: controller });
    const child = new TestRenderBox(new Size(40, 100));
    viewport.child = child;

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    }));
    expect(controller.viewportSize).toBe(20);

    viewport.layout(new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 30,
    }));
    expect(controller.viewportSize).toBe(30);
  });
});
