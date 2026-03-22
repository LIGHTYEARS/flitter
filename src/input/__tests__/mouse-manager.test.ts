// Tests for MouseManager singleton
import { describe, test, expect, beforeEach } from 'bun:test';
import { MouseManager } from '../mouse-manager';
import { RenderMouseRegion } from '../../widgets/mouse-region';

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
});
