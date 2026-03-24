// Tests for MouseManager singleton
import { describe, test, expect, beforeEach } from 'bun:test';
import { MouseManager } from '../mouse-manager';
import { RenderMouseRegion, type MouseRegionEvent } from '../../widgets/mouse-region';
import { ContainerRenderBox, RenderBox, type PaintContext } from '../../framework/render-object';
import { Offset, Size } from '../../core/types';
import { BoxConstraints } from '../../core/box-constraints';

// -- Test helper: concrete ContainerRenderBox for building render trees --
class TestContainer extends ContainerRenderBox {
  constructor(width: number, height: number) {
    super();
    this.size = new Size(width, height);
    this.offset = Offset.zero;
  }

  performLayout(): void {
    // no-op: sizes set in constructor
  }

  paint(_context: PaintContext, _offset: Offset): void {}

  addTestChild(child: RenderBox): void {
    this.insert(child);
  }
}

/** Helper: create a RenderMouseRegion with a given size and offset, and optional handlers. */
function createRegion(opts: {
  width: number;
  height: number;
  col?: number;
  row?: number;
  onScroll?: (e: MouseRegionEvent) => void;
  onClick?: (e: MouseRegionEvent) => void;
  onRelease?: (e: MouseRegionEvent) => void;
  onEnter?: (e: MouseRegionEvent) => void;
  onExit?: (e: MouseRegionEvent) => void;
  cursor?: string;
  opaque?: boolean;
}): RenderMouseRegion {
  const region = new RenderMouseRegion({
    onScroll: opts.onScroll,
    onClick: opts.onClick,
    onRelease: opts.onRelease,
    onEnter: opts.onEnter,
    onExit: opts.onExit,
    cursor: opts.cursor,
    opaque: opts.opaque,
  });
  region.size = new Size(opts.width, opts.height);
  region.offset = new Offset(opts.col ?? 0, opts.row ?? 0);
  return region;
}

describe('MouseManager', () => {
  beforeEach(() => {
    MouseManager.reset();
  });

  describe('singleton', () => {
    test('returns the same instance', () => {
      const a = MouseManager.instance;
      const b = MouseManager.instance;
      expect(a).toBe(b);
    });

    test('reset clears and recreates instance', () => {
      const a = MouseManager.instance;
      MouseManager.reset();
      const b = MouseManager.instance;
      expect(a).not.toBe(b);
    });
  });

  describe('lastPosition', () => {
    test('defaults to (-1, -1)', () => {
      const mm = MouseManager.instance;
      expect(mm.lastPosition).toEqual({ x: -1, y: -1 });
    });

    test('updatePosition updates lastPosition', () => {
      const mm = MouseManager.instance;
      mm.updatePosition(10, 20);
      expect(mm.lastPosition).toEqual({ x: 10, y: 20 });
    });

    test('lastPosition returns a copy (not a reference)', () => {
      const mm = MouseManager.instance;
      mm.updatePosition(5, 5);
      const pos = mm.lastPosition;
      pos.x = 999;
      expect(mm.lastPosition).toEqual({ x: 5, y: 5 });
    });
  });

  describe('currentCursor', () => {
    test('defaults to "default"', () => {
      const mm = MouseManager.instance;
      expect(mm.currentCursor).toBe('default');
    });

    test('updates based on hovered region cursor', () => {
      const mm = MouseManager.instance;
      const region = new RenderMouseRegion({ cursor: 'pointer' });
      mm.registerHover(region);
      expect(mm.currentCursor).toBe('pointer');
    });

    test('reverts to default when region is unregistered', () => {
      const mm = MouseManager.instance;
      const region = new RenderMouseRegion({ cursor: 'text' });
      mm.registerHover(region);
      expect(mm.currentCursor).toBe('text');
      mm.unregisterHover(region);
      expect(mm.currentCursor).toBe('default');
    });

    test('last registered region cursor wins', () => {
      const mm = MouseManager.instance;
      const r1 = new RenderMouseRegion({ cursor: 'pointer' });
      const r2 = new RenderMouseRegion({ cursor: 'text' });
      mm.registerHover(r1);
      mm.registerHover(r2);
      expect(mm.currentCursor).toBe('text');
    });

    test('region without cursor does not override default', () => {
      const mm = MouseManager.instance;
      const region = new RenderMouseRegion({});
      mm.registerHover(region);
      expect(mm.currentCursor).toBe('default');
    });
  });

  describe('registerHover / unregisterHover', () => {
    test('registerHover adds region to hoveredRegions', () => {
      const mm = MouseManager.instance;
      const region = new RenderMouseRegion({});
      mm.registerHover(region);
      expect(mm.hoveredRegions.has(region)).toBe(true);
    });

    test('unregisterHover removes region from hoveredRegions', () => {
      const mm = MouseManager.instance;
      const region = new RenderMouseRegion({});
      mm.registerHover(region);
      mm.unregisterHover(region);
      expect(mm.hoveredRegions.has(region)).toBe(false);
    });

    test('duplicate registerHover is a no-op', () => {
      const mm = MouseManager.instance;
      let enterCount = 0;
      const region = new RenderMouseRegion({
        onEnter: () => { enterCount++; },
      });
      mm.registerHover(region);
      mm.registerHover(region);
      expect(enterCount).toBe(1);
      expect(mm.hoveredRegions.size).toBe(1);
    });

    test('unregisterHover on non-hovered region is a no-op', () => {
      const mm = MouseManager.instance;
      let exitCount = 0;
      const region = new RenderMouseRegion({
        onExit: () => { exitCount++; },
      });
      mm.unregisterHover(region);
      expect(exitCount).toBe(0);
    });

    test('registerHover fires onEnter event', () => {
      const mm = MouseManager.instance;
      mm.updatePosition(5, 10);
      let enterEvent: { x: number; y: number } | null = null;
      const region = new RenderMouseRegion({
        onEnter: (e) => { enterEvent = { x: e.x, y: e.y }; },
      });
      mm.registerHover(region);
      expect(enterEvent).toEqual({ x: 5, y: 10 });
    });

    test('unregisterHover fires onExit event', () => {
      const mm = MouseManager.instance;
      mm.updatePosition(3, 7);
      let exitEvent: { x: number; y: number } | null = null;
      const region = new RenderMouseRegion({
        onExit: (e) => { exitEvent = { x: e.x, y: e.y }; },
      });
      mm.registerHover(region);
      mm.unregisterHover(region);
      expect(exitEvent).toEqual({ x: 3, y: 7 });
    });
  });

  describe('updateCursor', () => {
    test('uses last region with cursor set', () => {
      const mm = MouseManager.instance;
      const r1 = new RenderMouseRegion({ cursor: 'pointer' });
      const r2 = new RenderMouseRegion({}); // no cursor
      const r3 = new RenderMouseRegion({ cursor: 'text' });
      mm.registerHover(r1);
      mm.registerHover(r2);
      mm.registerHover(r3);
      expect(mm.currentCursor).toBe('text');
    });

    test('falls back to default when all regions removed', () => {
      const mm = MouseManager.instance;
      const r1 = new RenderMouseRegion({ cursor: 'pointer' });
      mm.registerHover(r1);
      mm.unregisterHover(r1);
      expect(mm.currentCursor).toBe('default');
    });
  });

  describe('reset', () => {
    test('clears hovered regions', () => {
      const mm = MouseManager.instance;
      const region = new RenderMouseRegion({});
      mm.registerHover(region);
      MouseManager.reset();
      const newMm = MouseManager.instance;
      expect(newMm.hoveredRegions.size).toBe(0);
    });

    test('resets position', () => {
      const mm = MouseManager.instance;
      mm.updatePosition(50, 50);
      MouseManager.reset();
      const newMm = MouseManager.instance;
      expect(newMm.lastPosition).toEqual({ x: -1, y: -1 });
    });

    test('resets cursor', () => {
      const mm = MouseManager.instance;
      const region = new RenderMouseRegion({ cursor: 'text' });
      mm.registerHover(region);
      MouseManager.reset();
      const newMm = MouseManager.instance;
      expect(newMm.currentCursor).toBe('default');
    });
  });

  // =========================================================================
  // dispatchMouseAction tests
  // =========================================================================

  describe('dispatchMouseAction', () => {
    test('scroll-up (button=64) dispatches to deepest region with onScroll', () => {
      const mm = MouseManager.instance;
      const events: MouseRegionEvent[] = [];

      const root = new TestContainer(80, 24);
      const region = createRegion({
        width: 40, height: 20, col: 0, row: 0,
        onScroll: (e) => { events.push(e); },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      mm.dispatchMouseAction('scroll', 5, 5, 64);

      expect(events.length).toBe(1);
      expect(events[0]!.x).toBe(5);
      expect(events[0]!.y).toBe(5);
      expect(events[0]!.button).toBe(64);
    });

    test('scroll-down (button=65) dispatches to region with onScroll', () => {
      const mm = MouseManager.instance;
      const events: MouseRegionEvent[] = [];

      const root = new TestContainer(80, 24);
      const region = createRegion({
        width: 40, height: 20, col: 0, row: 0,
        onScroll: (e) => { events.push(e); },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      mm.dispatchMouseAction('scroll', 10, 10, 65);

      expect(events.length).toBe(1);
      expect(events[0]!.button).toBe(65);
    });

    test('press (button=0) dispatches click to deepest region with onClick', () => {
      const mm = MouseManager.instance;
      const events: MouseRegionEvent[] = [];

      const root = new TestContainer(80, 24);
      const region = createRegion({
        width: 30, height: 15, col: 5, row: 3,
        onClick: (e) => { events.push(e); },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      mm.dispatchMouseAction('press', 10, 8, 0);

      expect(events.length).toBe(1);
      expect(events[0]!.x).toBe(10);
      expect(events[0]!.y).toBe(8);
      expect(events[0]!.button).toBe(0);
    });

    test('release (button=0) dispatches to deepest region with onRelease', () => {
      const mm = MouseManager.instance;
      const events: MouseRegionEvent[] = [];

      const root = new TestContainer(80, 24);
      const region = createRegion({
        width: 30, height: 15, col: 0, row: 0,
        onRelease: (e) => { events.push(e); },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      mm.dispatchMouseAction('release', 5, 5, 0);

      expect(events.length).toBe(1);
      expect(events[0]!.x).toBe(5);
      expect(events[0]!.y).toBe(5);
      expect(events[0]!.button).toBe(0);
    });

    test('scroll outside any region bounds is ignored', () => {
      const mm = MouseManager.instance;
      let scrollCalled = false;

      const root = new TestContainer(80, 24);
      const region = createRegion({
        width: 10, height: 10, col: 0, row: 0,
        onScroll: () => { scrollCalled = true; },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      // Position outside the region (region is at 0,0 size 10x10)
      mm.dispatchMouseAction('scroll', 50, 50, 64);

      expect(scrollCalled).toBe(false);
    });

    test('button value is passed through in the event', () => {
      const mm = MouseManager.instance;
      const events: MouseRegionEvent[] = [];

      const root = new TestContainer(80, 24);
      const region = createRegion({
        width: 40, height: 20, col: 0, row: 0,
        onScroll: (e) => { events.push(e); },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      mm.dispatchMouseAction('scroll', 5, 5, 66); // scroll-left button code
      expect(events.length).toBe(1);
      expect(events[0]!.button).toBe(66);

      mm.dispatchMouseAction('scroll', 5, 5, 67); // scroll-right button code
      expect(events.length).toBe(2);
      expect(events[1]!.button).toBe(67);
    });

    test('deepest (innermost) region with handler wins when nested', () => {
      const mm = MouseManager.instance;
      const outerEvents: MouseRegionEvent[] = [];
      const innerEvents: MouseRegionEvent[] = [];

      const root = new TestContainer(80, 24);
      const outerRegion = createRegion({
        width: 40, height: 20, col: 0, row: 0,
        onScroll: (e) => { outerEvents.push(e); },
      });
      const innerRegion = createRegion({
        width: 20, height: 10, col: 5, row: 5,
        onScroll: (e) => { innerEvents.push(e); },
      });
      // Inner is a child of outer
      outerRegion.child = innerRegion;
      root.addTestChild(outerRegion);
      mm.setRootRenderObject(root);

      // Position inside the inner region (5+5=10, 5+5=10 within both)
      mm.dispatchMouseAction('scroll', 10, 10, 64);

      expect(innerEvents.length).toBe(1);
      expect(outerEvents.length).toBe(0); // outer should NOT receive the event
    });

    test('does nothing without a root render object', () => {
      const mm = MouseManager.instance;
      // No root set, should not throw
      mm.dispatchMouseAction('scroll', 5, 5, 64);
    });

    test('dispatch does not affect hover/enter/exit state (no regression)', () => {
      const mm = MouseManager.instance;
      const enterEvents: MouseRegionEvent[] = [];
      const exitEvents: MouseRegionEvent[] = [];
      const scrollEvents: MouseRegionEvent[] = [];

      const root = new TestContainer(80, 24);
      const region = createRegion({
        width: 40, height: 20, col: 0, row: 0,
        onEnter: (e) => { enterEvents.push(e); },
        onExit: (e) => { exitEvents.push(e); },
        onScroll: (e) => { scrollEvents.push(e); },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      // First, establish hover via reestablishHoverState
      mm.updatePosition(5, 5);
      mm.reestablishHoverState();
      expect(enterEvents.length).toBe(1);
      expect(mm.hoveredRegions.size).toBe(1);

      // Now dispatch a scroll action
      mm.dispatchMouseAction('scroll', 5, 5, 64);
      expect(scrollEvents.length).toBe(1);

      // Hover state should still be intact
      expect(mm.hoveredRegions.size).toBe(1);
      expect(exitEvents.length).toBe(0);
    });

    test('scroll to region without onScroll handler is not dispatched', () => {
      const mm = MouseManager.instance;
      let clickCalled = false;

      const root = new TestContainer(80, 24);
      // Region has onClick but no onScroll
      const region = createRegion({
        width: 40, height: 20, col: 0, row: 0,
        onClick: () => { clickCalled = true; },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      mm.dispatchMouseAction('scroll', 5, 5, 64);
      // scroll should not trigger onClick
      expect(clickCalled).toBe(false);
    });

    test('press to region without onClick handler is not dispatched', () => {
      const mm = MouseManager.instance;
      let scrollCalled = false;

      const root = new TestContainer(80, 24);
      // Region has onScroll but no onClick
      const region = createRegion({
        width: 40, height: 20, col: 0, row: 0,
        onScroll: () => { scrollCalled = true; },
      });
      root.addTestChild(region);
      mm.setRootRenderObject(root);

      mm.dispatchMouseAction('press', 5, 5, 0);
      expect(scrollCalled).toBe(false);
    });
  });
});
