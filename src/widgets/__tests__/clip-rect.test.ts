// Tests for ClipRect widget and RenderClipRect
// Verifies clipping behavior, layout pass-through, and paint clipping

import { describe, test, expect } from 'bun:test';
import { ClipRect, RenderClipRect } from '../clip-rect';
import { RenderBox, type PaintContext } from '../../framework/render-object';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';
import { StatelessWidget, type BuildContext, Widget } from '../../framework/widget';

// A minimal child widget for ClipRect
class _DummyWidget extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this;
  }
}

// A mock RenderBox for testing layout and paint
class MockRenderBox extends RenderBox {
  paintCalls: Array<{ context: any; offset: Offset }> = [];
  layoutSize: Size = new Size(20, 10);

  performLayout(): void {
    const constraints = this.constraints!;
    this.size = constraints.constrain(this.layoutSize);
  }

  paint(context: PaintContext, offset: Offset): void {
    this.paintCalls.push({ context, offset });
  }
}

// A mock PaintContext that supports withClip
class MockPaintContext {
  clipCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
  private _clipped: MockPaintContext | null = null;

  withClip(x: number, y: number, w: number, h: number): MockPaintContext {
    this.clipCalls.push({ x, y, w, h });
    this._clipped = new MockPaintContext();
    return this._clipped;
  }

  get lastClippedContext(): MockPaintContext | null {
    return this._clipped;
  }
}

describe('ClipRect', () => {
  test('creates with child', () => {
    const child = new _DummyWidget();
    const clipRect = new ClipRect({ child });
    expect(clipRect.child).toBe(child);
  });

  test('is a SingleChildRenderObjectWidget', () => {
    const child = new _DummyWidget();
    const clipRect = new ClipRect({ child });
    expect(clipRect.createRenderObject).toBeDefined();
  });

  test('createRenderObject returns RenderClipRect', () => {
    const child = new _DummyWidget();
    const clipRect = new ClipRect({ child });
    const renderObject = clipRect.createRenderObject();
    expect(renderObject).toBeInstanceOf(RenderClipRect);
  });
});

describe('RenderClipRect', () => {
  test('creates with no child by default', () => {
    const render = new RenderClipRect();
    expect(render.child).toBeNull();
  });

  test('can set and get child', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    render.child = child;
    expect(render.child).toBe(child);
  });

  test('can clear child by setting null', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    render.child = child;
    render.child = null;
    expect(render.child).toBeNull();
  });

  test('layout passes constraints to child and adopts child size', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    child.layoutSize = new Size(30, 15);
    render.child = child;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    });

    render.layout(constraints);

    expect(render.size.width).toBe(30);
    expect(render.size.height).toBe(15);
  });

  test('layout constrains child size to parent constraints', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    child.layoutSize = new Size(100, 50); // larger than constraints
    render.child = child;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    });

    render.layout(constraints);

    expect(render.size.width).toBe(40);
    expect(render.size.height).toBe(20);
  });

  test('layout with no child sizes to zero', () => {
    const render = new RenderClipRect();

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 40,
      minHeight: 0,
      maxHeight: 20,
    });

    render.layout(constraints);

    expect(render.size.width).toBe(0);
    expect(render.size.height).toBe(0);
  });

  test('layout with no child respects min constraints', () => {
    const render = new RenderClipRect();

    const constraints = new BoxConstraints({
      minWidth: 5,
      maxWidth: 40,
      minHeight: 3,
      maxHeight: 20,
    });

    render.layout(constraints);

    // constrain(Size.zero) with min constraints should give min size
    expect(render.size.width).toBe(5);
    expect(render.size.height).toBe(3);
  });

  test('paint clips child to own bounds via withClip', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    child.layoutSize = new Size(20, 10);
    render.child = child;

    // Layout first
    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 20,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    // Paint with mock context
    const mockContext = new MockPaintContext();
    const offset = new Offset(5, 3);
    render.paint(mockContext as any, offset);

    // Should have called withClip with our bounds
    expect(mockContext.clipCalls.length).toBe(1);
    expect(mockContext.clipCalls[0]).toEqual({
      x: 5,
      y: 3,
      w: 20,
      h: 10,
    });

    // Child should have been painted with the clipped context
    expect(child.paintCalls.length).toBe(1);
    expect(child.paintCalls[0].context).toBe(mockContext.lastClippedContext);
  });

  test('paint with offset applies correctly', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    child.layoutSize = new Size(10, 5);
    render.child = child;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 10,
      minHeight: 0,
      maxHeight: 5,
    });
    render.layout(constraints);

    const mockContext = new MockPaintContext();
    const offset = new Offset(10, 20);
    render.paint(mockContext as any, offset);

    expect(mockContext.clipCalls[0]).toEqual({
      x: 10,
      y: 20,
      w: 10,
      h: 5,
    });
  });

  test('paint does nothing with no child', () => {
    const render = new RenderClipRect();

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 20,
      minHeight: 0,
      maxHeight: 10,
    });
    render.layout(constraints);

    const mockContext = new MockPaintContext();
    // Should not throw
    render.paint(mockContext as any, Offset.zero);

    expect(mockContext.clipCalls.length).toBe(0);
  });

  test('visitChildren visits child when present', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    render.child = child;

    const visited: RenderBox[] = [];
    render.visitChildren((c) => visited.push(c as RenderBox));

    expect(visited.length).toBe(1);
    expect(visited[0]).toBe(child);
  });

  test('visitChildren does nothing when no child', () => {
    const render = new RenderClipRect();

    const visited: RenderBox[] = [];
    render.visitChildren((c) => visited.push(c as RenderBox));

    expect(visited.length).toBe(0);
  });

  test('replacing child drops old and adopts new', () => {
    const render = new RenderClipRect();
    const child1 = new MockRenderBox();
    const child2 = new MockRenderBox();

    render.child = child1;
    expect(child1.parent).toBe(render);

    render.child = child2;
    expect(child1.parent).toBeNull();
    expect(child2.parent).toBe(render);
  });

  test('fallback paint without withClip support', () => {
    const render = new RenderClipRect();
    const child = new MockRenderBox();
    child.layoutSize = new Size(10, 5);
    render.child = child;

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 10,
      minHeight: 0,
      maxHeight: 5,
    });
    render.layout(constraints);

    // Use a plain object without withClip
    const plainContext = {} as PaintContext;
    render.paint(plainContext, Offset.zero);

    // Child should still be painted (fallback path)
    expect(child.paintCalls.length).toBe(1);
    expect(child.paintCalls[0].context).toBe(plainContext);
  });
});
