// Tests for OverlayManager — Gap 27: Centralized overlay management system
//
// Verifies: show/dismiss/dismissTop/dismissAll, priority ordering,
// idempotent show, buildOverlays output, modal mask insertion, listener notification

import { describe, it, expect, beforeEach } from 'bun:test';
import { OverlayManager } from '../state/overlay-manager';
import type { OverlayEntry } from '../state/overlay-manager';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { Stack } from 'flitter-core/src/widgets/stack';

// Helper to create a minimal overlay entry
function makeEntry(id: string, priority: number, modal = false): OverlayEntry {
  return {
    id,
    priority,
    modal,
    placement: { type: 'fullscreen' },
    builder: () => new SizedBox({}),
  };
}

describe('OverlayManager', () => {
  let mgr: OverlayManager;

  beforeEach(() => {
    mgr = new OverlayManager();
  });

  describe('initial state', () => {
    it('starts with no overlays', () => {
      expect(mgr.hasOverlays).toBe(false);
      expect(mgr.count).toBe(0);
      expect(mgr.topEntry).toBeNull();
      expect(mgr.activeEntries).toEqual([]);
    });
  });

  describe('show()', () => {
    it('adds an entry', () => {
      mgr.show(makeEntry('a', 50));
      expect(mgr.hasOverlays).toBe(true);
      expect(mgr.count).toBe(1);
      expect(mgr.has('a')).toBe(true);
    });

    it('maintains priority-sorted order (ascending)', () => {
      mgr.show(makeEntry('high', 100));
      mgr.show(makeEntry('low', 10));
      mgr.show(makeEntry('mid', 50));

      const entries = mgr.activeEntries;
      expect(entries[0].id).toBe('low');
      expect(entries[1].id).toBe('mid');
      expect(entries[2].id).toBe('high');
    });

    it('topEntry returns the highest priority', () => {
      mgr.show(makeEntry('low', 10));
      mgr.show(makeEntry('high', 100));
      expect(mgr.topEntry!.id).toBe('high');
    });

    it('replaces existing entry with same id (idempotent)', () => {
      mgr.show(makeEntry('x', 50));
      mgr.show(makeEntry('x', 75));

      expect(mgr.count).toBe(1);
      expect(mgr.topEntry!.priority).toBe(75);
    });

    it('notifies listeners on show', () => {
      let callCount = 0;
      mgr.addListener(() => { callCount++; });

      mgr.show(makeEntry('a', 50));
      expect(callCount).toBe(1);
    });
  });

  describe('dismiss()', () => {
    it('removes an entry by id', () => {
      mgr.show(makeEntry('a', 50));
      mgr.dismiss('a');

      expect(mgr.hasOverlays).toBe(false);
      expect(mgr.count).toBe(0);
      expect(mgr.has('a')).toBe(false);
    });

    it('is a no-op for unknown ids', () => {
      let callCount = 0;
      mgr.addListener(() => { callCount++; });

      mgr.dismiss('nonexistent');
      expect(callCount).toBe(0);
    });

    it('notifies listeners on dismiss', () => {
      mgr.show(makeEntry('a', 50));

      let callCount = 0;
      mgr.addListener(() => { callCount++; });

      mgr.dismiss('a');
      expect(callCount).toBe(1);
    });
  });

  describe('dismissTop()', () => {
    it('removes the highest-priority entry', () => {
      mgr.show(makeEntry('a', 50));
      mgr.show(makeEntry('b', 100));

      const dismissed = mgr.dismissTop();
      expect(dismissed).toBe('b');
      expect(mgr.count).toBe(1);
      expect(mgr.topEntry!.id).toBe('a');
    });

    it('returns null when no overlays', () => {
      expect(mgr.dismissTop()).toBeNull();
    });

    it('notifies listeners', () => {
      mgr.show(makeEntry('a', 50));

      let callCount = 0;
      mgr.addListener(() => { callCount++; });

      mgr.dismissTop();
      expect(callCount).toBe(1);
    });
  });

  describe('dismissAll()', () => {
    it('removes all entries', () => {
      mgr.show(makeEntry('a', 50));
      mgr.show(makeEntry('b', 100));
      mgr.show(makeEntry('c', 25));

      mgr.dismissAll();
      expect(mgr.hasOverlays).toBe(false);
      expect(mgr.count).toBe(0);
    });

    it('is a no-op when empty', () => {
      let callCount = 0;
      mgr.addListener(() => { callCount++; });

      mgr.dismissAll();
      expect(callCount).toBe(0);
    });

    it('notifies listeners once', () => {
      mgr.show(makeEntry('a', 50));
      mgr.show(makeEntry('b', 100));

      let callCount = 0;
      mgr.addListener(() => { callCount++; });

      mgr.dismissAll();
      expect(callCount).toBe(1);
    });
  });

  describe('has()', () => {
    it('returns true for existing entries', () => {
      mgr.show(makeEntry('a', 50));
      expect(mgr.has('a')).toBe(true);
    });

    it('returns false for non-existing entries', () => {
      expect(mgr.has('a')).toBe(false);
    });

    it('returns false after dismiss', () => {
      mgr.show(makeEntry('a', 50));
      mgr.dismiss('a');
      expect(mgr.has('a')).toBe(false);
    });
  });

  describe('activeEntries', () => {
    it('returns a defensive copy', () => {
      mgr.show(makeEntry('a', 50));
      const entries1 = mgr.activeEntries;
      const entries2 = mgr.activeEntries;
      expect(entries1).not.toBe(entries2);
      expect(entries1).toEqual(entries2);
    });
  });

  describe('listener management', () => {
    it('removes listeners correctly', () => {
      let callCount = 0;
      const listener = () => { callCount++; };

      mgr.addListener(listener);
      mgr.show(makeEntry('a', 50));
      expect(callCount).toBe(1);

      mgr.removeListener(listener);
      mgr.show(makeEntry('b', 100));
      expect(callCount).toBe(1); // should not have been called again
    });
  });

  describe('buildOverlays()', () => {
    it('returns base content when no overlays', () => {
      const base = new SizedBox({});
      const result = mgr.buildOverlays(base);
      expect(result).toBe(base);
    });

    it('returns a Stack when overlays are active', () => {
      mgr.show(makeEntry('a', 50));
      const base = new SizedBox({});
      const result = mgr.buildOverlays(base);
      expect(result).toBeInstanceOf(Stack);
    });

    it('non-modal entry does not insert a mask', () => {
      mgr.show({
        id: 'nonmodal',
        priority: 50,
        modal: false,
        placement: { type: 'fullscreen' },
        builder: () => new SizedBox({}),
      });

      const base = new SizedBox({});
      const result = mgr.buildOverlays(base) as Stack;

      // Stack children: [base, overlay] -- no mask
      expect(result.children.length).toBe(2);
    });

    it('modal entry inserts a mask before overlay', () => {
      mgr.show({
        id: 'modal',
        priority: 50,
        modal: true,
        placement: { type: 'fullscreen' },
        builder: () => new SizedBox({}),
      });

      const base = new SizedBox({});
      const result = mgr.buildOverlays(base) as Stack;

      // Stack children: [base, mask, overlay]
      expect(result.children.length).toBe(3);
    });

    it('multiple overlays produce correct child order', () => {
      mgr.show({
        id: 'low',
        priority: 10,
        modal: false,
        placement: { type: 'fullscreen' },
        builder: () => new SizedBox({ width: 1 }),
      });
      mgr.show({
        id: 'high',
        priority: 100,
        modal: true,
        placement: { type: 'fullscreen' },
        builder: () => new SizedBox({ width: 2 }),
      });

      const base = new SizedBox({ width: 0 });
      const result = mgr.buildOverlays(base) as Stack;

      // [base, low_overlay, high_mask, high_overlay]
      expect(result.children.length).toBe(4);
    });

    it('calls builder with dismiss callback', () => {
      let dismissCalled = false;
      mgr.show({
        id: 'test',
        priority: 50,
        modal: false,
        placement: { type: 'fullscreen' },
        builder: (onDismiss) => {
          onDismiss(); // Calling dismiss immediately
          dismissCalled = true;
          return new SizedBox({});
        },
      });

      mgr.buildOverlays(new SizedBox({}));
      expect(dismissCalled).toBe(true);
      // After the builder called onDismiss, the entry should be gone
      expect(mgr.has('test')).toBe(false);
    });

    it('anchored placement passes positioning to Positioned', () => {
      mgr.show({
        id: 'anchored',
        priority: 50,
        modal: false,
        placement: { type: 'anchored', left: 1, bottom: 3 },
        builder: () => new SizedBox({}),
      });

      const result = mgr.buildOverlays(new SizedBox({})) as Stack;
      // Should produce Stack with [base, positioned(anchored)]
      expect(result.children.length).toBe(2);
    });
  });
});
