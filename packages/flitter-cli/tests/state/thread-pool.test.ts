// thread-pool.test.ts -- Tests for ThreadPool navigation and state management.
//
// Validates AMP-aligned behavior: threadHandleMap, back/forward stacks,
// recentThreadIDs cap at 50, activateThreadWithNavigation, removeThread, dispose.

import { describe, test, expect, beforeEach } from 'bun:test';
import { ThreadPool } from '../../src/state/thread-pool';
import { createThreadHandle } from '../../src/state/thread-handle';
import type { ThreadHandle } from '../../src/state/types';

/** Helper to create a ThreadHandle with default options. */
function makeHandle(id?: `T-${string}`): ThreadHandle {
  return createThreadHandle({
    threadID: id,
    cwd: '/tmp',
    model: 'test',
  });
}

describe('ThreadPool', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  // -------------------------------------------------------------------------
  // 1. Initialization
  // -------------------------------------------------------------------------
  test('initializes with empty state', () => {
    expect(pool.threadHandleMap.size).toBe(0);
    expect(pool.activeThreadContextID).toBeNull();
    expect(pool.threadBackStack).toEqual([]);
    expect(pool.threadForwardStack).toEqual([]);
    expect(pool.recentThreadIDs).toEqual([]);
    expect(pool.threadCount).toBe(0);
    expect(pool.activeThreadHandleOrNull).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. activateThread
  // -------------------------------------------------------------------------
  test('activateThread sets activeThreadContextID, adds to map and recentThreadIDs', () => {
    const h = makeHandle();
    pool.activateThread(h);

    expect(pool.activeThreadContextID).toBe(h.threadID);
    expect(pool.threadHandleMap.get(h.threadID)).toBe(h);
    expect(pool.recentThreadIDs).toContain(h.threadID);
    expect(pool.threadCount).toBe(1);
    expect(pool.activeThreadHandle).toBe(h);
    expect(pool.activeThreadHandleOrNull).toBe(h);
  });

  // -------------------------------------------------------------------------
  // 3. activateThreadWithNavigation(recordNavigation: true)
  // -------------------------------------------------------------------------
  test('activateThreadWithNavigation with recordNavigation=true pushes previous to backStack and clears forwardStack', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();
    const h3 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, true);

    expect(pool.threadBackStack).toEqual([h1.threadID]);
    expect(pool.threadForwardStack).toEqual([]);

    // Manually push to forwardStack to test that recordNavigation clears it
    pool.threadForwardStack.push('T-stale');
    pool.activateThreadWithNavigation(h3, true);

    expect(pool.threadBackStack).toEqual([h1.threadID, h2.threadID]);
    expect(pool.threadForwardStack).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 4. activateThreadWithNavigation(recordNavigation: false)
  // -------------------------------------------------------------------------
  test('activateThreadWithNavigation with recordNavigation=false does NOT modify stacks', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, false);

    expect(pool.threadBackStack).toEqual([]);
    expect(pool.threadForwardStack).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 5. navigateBack
  // -------------------------------------------------------------------------
  test('navigateBack pops from backStack, pushes current to forwardStack, activates popped thread', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, true);

    expect(pool.activeThreadContextID).toBe(h2.threadID);
    expect(pool.threadBackStack).toEqual([h1.threadID]);

    pool.navigateBack();

    expect(pool.activeThreadContextID).toBe(h1.threadID);
    expect(pool.threadBackStack).toEqual([]);
    expect(pool.threadForwardStack).toContain(h2.threadID);
  });

  // -------------------------------------------------------------------------
  // 6. navigateBack when empty
  // -------------------------------------------------------------------------
  test('navigateBack when backStack is empty is a no-op', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.navigateBack();

    expect(pool.activeThreadContextID).toBe(h.threadID);
    expect(pool.threadForwardStack).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 7. navigateForward
  // -------------------------------------------------------------------------
  test('navigateForward pops from forwardStack, pushes current to backStack, activates popped thread', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, true);
    pool.navigateBack(); // now h1 is active, h2 in forwardStack

    expect(pool.activeThreadContextID).toBe(h1.threadID);

    pool.navigateForward();

    expect(pool.activeThreadContextID).toBe(h2.threadID);
    expect(pool.threadForwardStack).toEqual([]);
    expect(pool.threadBackStack).toContain(h1.threadID);
  });

  // -------------------------------------------------------------------------
  // 8. navigateForward when empty
  // -------------------------------------------------------------------------
  test('navigateForward when forwardStack is empty is a no-op', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.navigateForward();

    expect(pool.activeThreadContextID).toBe(h.threadID);
    expect(pool.threadBackStack).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 9. navigateBack with missing thread
  // -------------------------------------------------------------------------
  test('navigateBack restores backStack when target thread is missing from map', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, true);

    // Remove h1 from the map to simulate a missing thread
    pool.threadHandleMap.delete(h1.threadID);

    const backStackBefore = [...pool.threadBackStack];
    pool.navigateBack();

    // Stack should be restored, active thread unchanged
    expect(pool.threadBackStack).toEqual(backStackBefore);
    expect(pool.activeThreadContextID).toBe(h2.threadID);
  });

  // -------------------------------------------------------------------------
  // 10. recentThreadIDs max 50
  // -------------------------------------------------------------------------
  test('recentThreadIDs caps at 50 entries, dropping oldest', () => {
    const handles: ThreadHandle[] = [];
    for (let i = 0; i < 51; i++) {
      handles.push(makeHandle());
    }

    for (const h of handles) {
      pool.activateThread(h);
    }

    expect(pool.recentThreadIDs.length).toBe(50);
    // The first handle's ID should have been evicted
    expect(pool.recentThreadIDs).not.toContain(handles[0].threadID);
    // The last handle's ID should be at the front
    expect(pool.recentThreadIDs[0]).toBe(handles[50].threadID);
  });

  // -------------------------------------------------------------------------
  // 11. recentThreadIDs dedup
  // -------------------------------------------------------------------------
  test('recentThreadIDs moves re-visited thread to front without duplicates', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();
    const h3 = makeHandle();

    pool.activateThread(h1);
    pool.activateThread(h2);
    pool.activateThread(h3);

    expect(pool.recentThreadIDs[0]).toBe(h3.threadID);
    expect(pool.recentThreadIDs[1]).toBe(h2.threadID);
    expect(pool.recentThreadIDs[2]).toBe(h1.threadID);

    // Re-visit h1
    pool.activateThread(h1);

    expect(pool.recentThreadIDs[0]).toBe(h1.threadID);
    expect(pool.recentThreadIDs.length).toBe(3);
    // No duplicates
    const uniqueIDs = new Set(pool.recentThreadIDs);
    expect(uniqueIDs.size).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 12. removeThread
  // -------------------------------------------------------------------------
  test('removeThread removes from map, recentThreadIDs, backStack, forwardStack, threadTitles', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();
    const h3 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, true);
    pool.activateThreadWithNavigation(h3, true);
    pool.navigateBack(); // h2 active, h3 in forwardStack

    // Verify h1 is in backStack and h3 in forwardStack
    expect(pool.threadBackStack).toContain(h1.threadID);
    expect(pool.threadForwardStack).toContain(h3.threadID);
    expect(pool.recentThreadIDs).toContain(h1.threadID);

    pool.removeThread(h1.threadID);

    expect(pool.threadHandleMap.has(h1.threadID)).toBe(false);
    expect(pool.recentThreadIDs).not.toContain(h1.threadID);
    expect(pool.threadBackStack).not.toContain(h1.threadID);
    expect(pool.threadTitles[h1.threadID]).toBeUndefined();

    pool.removeThread(h3.threadID);

    expect(pool.threadForwardStack).not.toContain(h3.threadID);
  });

  // -------------------------------------------------------------------------
  // 13. setThreadTitle
  // -------------------------------------------------------------------------
  test('setThreadTitle updates both handle.title and threadTitles map', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.setThreadTitle(h.threadID, 'New Title');

    expect(h.title).toBe('New Title');
    expect(pool.threadTitles[h.threadID]).toBe('New Title');
  });

  // -------------------------------------------------------------------------
  // 14. dispose
  // -------------------------------------------------------------------------
  test('dispose clears all state', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, true);

    pool.dispose();

    expect(pool.threadHandleMap.size).toBe(0);
    expect(pool.activeThreadContextID).toBeNull();
    expect(pool.threadBackStack).toEqual([]);
    expect(pool.threadForwardStack).toEqual([]);
    expect(pool.recentThreadIDs).toEqual([]);
    expect(Object.keys(pool.threadTitles)).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 15. activeThreadHandle throws when no active thread
  // -------------------------------------------------------------------------
  test('activeThreadHandle throws when no active thread context', () => {
    expect(() => pool.activeThreadHandle).toThrow('ThreadPool: No active thread context');
  });

  // -------------------------------------------------------------------------
  // 16. listener notification
  // -------------------------------------------------------------------------
  test('listeners are notified on activateThread and removeThread', () => {
    let callCount = 0;
    pool.addListener(() => callCount++);

    const h = makeHandle();
    pool.activateThread(h);
    expect(callCount).toBe(1);

    pool.removeThread(h.threadID);
    expect(callCount).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 17. navigateForward with missing thread restores forwardStack
  // -------------------------------------------------------------------------
  test('navigateForward restores forwardStack when target thread is missing', () => {
    const h1 = makeHandle();
    const h2 = makeHandle();

    pool.activateThread(h1);
    pool.activateThreadWithNavigation(h2, true);
    pool.navigateBack(); // h1 active, h2 in forwardStack

    // Remove h2 from the map
    pool.threadHandleMap.delete(h2.threadID);

    const forwardBefore = [...pool.threadForwardStack];
    pool.navigateForward();

    expect(pool.threadForwardStack).toEqual(forwardBefore);
    expect(pool.activeThreadContextID).toBe(h1.threadID);
  });
});
