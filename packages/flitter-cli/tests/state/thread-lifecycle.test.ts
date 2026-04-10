// thread-lifecycle.test.ts -- Tests for thread lifecycle operations.
//
// Validates createThread, switchThread, deleteThread, generateTitle,
// setThreadVisibility, getVisibleThreads, thread worker map, and
// SessionFile thread persistence fields.

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

describe('Thread Lifecycle Operations', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  // -------------------------------------------------------------------------
  // 1. createThread preserves existing thread
  // -------------------------------------------------------------------------
  test('createThread preserves existing thread in threadHandleMap', () => {
    // Create first thread manually and activate it
    const h1 = makeHandle();
    pool.activateThread(h1);

    // Add an item to thread A's session to verify state preservation
    h1.session.startProcessing('Hello from thread A');

    // Now create a second thread
    const h2 = pool.createThread({ cwd: '/tmp', model: 'test' });

    // Thread A should still be in the map with its items
    expect(pool.threadHandleMap.has(h1.threadID)).toBe(true);
    expect(pool.threadHandleMap.get(h1.threadID)!.session.items.length).toBeGreaterThan(0);

    // Thread B is now active
    expect(pool.activeThreadContextID).toBe(h2.threadID);
    expect(pool.threadHandleMap.has(h2.threadID)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. switchThread changes activeThreadContextID
  // -------------------------------------------------------------------------
  test('switchThread changes activeThreadContextID', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = pool.createThread({ cwd: '/tmp', model: 'test' });

    expect(pool.activeThreadContextID).toBe(h2.threadID);

    pool.switchThread(h1.threadID);
    expect(pool.activeThreadContextID).toBe(h1.threadID);

    pool.switchThread(h2.threadID);
    expect(pool.activeThreadContextID).toBe(h2.threadID);
  });

  // -------------------------------------------------------------------------
  // 3. switchThread with invalid ID throws
  // -------------------------------------------------------------------------
  test('switchThread with invalid ID throws', () => {
    expect(() => pool.switchThread('T-nonexistent')).toThrow('not found');
  });

  // -------------------------------------------------------------------------
  // 4. deleteThread removes from map
  // -------------------------------------------------------------------------
  test('deleteThread removes thread from map', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = pool.createThread({ cwd: '/tmp', model: 'test' });

    expect(pool.threadHandleMap.size).toBe(2);

    pool.deleteThread(h1.threadID);
    expect(pool.threadHandleMap.size).toBe(1);
    expect(pool.threadHandleMap.has(h1.threadID)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 5. deleteThread active thread switches to next
  // -------------------------------------------------------------------------
  test('deleteThread on active thread switches to most recent alternative', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = pool.createThread({ cwd: '/tmp', model: 'test' });

    // h2 is active
    expect(pool.activeThreadContextID).toBe(h2.threadID);

    // Delete h2 -> should switch to h1
    pool.deleteThread(h2.threadID);
    expect(pool.activeThreadContextID).toBe(h1.threadID);
    expect(pool.threadHandleMap.has(h2.threadID)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. deleteThread last thread sets activeThreadContextID to null
  // -------------------------------------------------------------------------
  test('deleteThread last thread sets activeThreadContextID to null', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.deleteThread(h1.threadID);
    expect(pool.activeThreadContextID).toBeNull();
    expect(pool.threadHandleMap.size).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 7. generateTitle from first user message
  // -------------------------------------------------------------------------
  test('generateTitle sets title from first user message', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });

    // Add a user message to the thread's session
    h1.session.startProcessing('Hello world');

    pool.generateTitle(h1.threadID);
    expect(h1.title).toBe('Hello world');
    expect(pool.threadTitles[h1.threadID]).toBe('Hello world');
  });

  // -------------------------------------------------------------------------
  // 8. generateTitle truncates at 80 chars
  // -------------------------------------------------------------------------
  test('generateTitle truncates long messages at 80 chars with ellipsis', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });

    const longText = 'A'.repeat(100);
    h1.session.startProcessing(longText);

    pool.generateTitle(h1.threadID);
    expect(h1.title!.length).toBe(80);
    expect(h1.title!.endsWith('\u2026')).toBe(true);
    expect(h1.title!.slice(0, 79)).toBe('A'.repeat(79));
  });

  // -------------------------------------------------------------------------
  // 9. generateTitle skips if already titled
  // -------------------------------------------------------------------------
  test('generateTitle skips threads that already have a title', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });

    h1.session.startProcessing('Hello world');
    pool.setThreadTitle(h1.threadID, 'Custom Title');

    pool.generateTitle(h1.threadID);
    expect(h1.title).toBe('Custom Title');
  });

  // -------------------------------------------------------------------------
  // 10. setThreadVisibility updates handle
  // -------------------------------------------------------------------------
  test('setThreadVisibility updates the handle visibility', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    expect(h1.visibility).toBe('visible');

    pool.setThreadVisibility(h1.threadID, 'hidden');
    expect(h1.visibility).toBe('hidden');

    pool.setThreadVisibility(h1.threadID, 'archived');
    expect(h1.visibility).toBe('archived');
  });

  // -------------------------------------------------------------------------
  // 11. getVisibleThreads excludes hidden
  // -------------------------------------------------------------------------
  test('getVisibleThreads excludes hidden and archived threads', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = pool.createThread({ cwd: '/tmp', model: 'test' });
    const h3 = pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.setThreadVisibility(h2.threadID, 'hidden');

    const visible = pool.getVisibleThreads();
    expect(visible.length).toBe(2);
    expect(visible.some(h => h.threadID === h2.threadID)).toBe(false);
    expect(visible.some(h => h.threadID === h1.threadID)).toBe(true);
    expect(visible.some(h => h.threadID === h3.threadID)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 12. threadWorkerMap getOrCreateWorker
  // -------------------------------------------------------------------------
  test('getOrCreateWorker creates worker with initial state', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });

    const worker = pool.getOrCreateWorker(h1.threadID);
    expect(worker.state).toBe('initial');
    expect(worker.inferenceState).toBe('idle');
    expect(worker.turnStartTime).toBeNull();
    expect(worker.threadID).toBe(h1.threadID);

    // Calling again returns the same worker
    const worker2 = pool.getOrCreateWorker(h1.threadID);
    expect(worker2).toBe(worker);
  });

  // -------------------------------------------------------------------------
  // 13. setWorkerInferenceState updates state
  // -------------------------------------------------------------------------
  test('setWorkerInferenceState updates inference state and turnStartTime', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.setWorkerInferenceState(h1.threadID, 'running');
    const worker = pool.getOrCreateWorker(h1.threadID);
    expect(worker.inferenceState).toBe('running');
    expect(worker.turnStartTime).not.toBeNull();
    expect(typeof worker.turnStartTime).toBe('number');

    pool.setWorkerInferenceState(h1.threadID, 'idle');
    expect(worker.inferenceState).toBe('idle');
    expect(worker.turnStartTime).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 14. activeWorkerCount getter
  // -------------------------------------------------------------------------
  test('activeWorkerCount counts non-disposed workers', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.getOrCreateWorker(h1.threadID);
    pool.getOrCreateWorker(h2.threadID);
    expect(pool.activeWorkerCount).toBe(2);

    // Dispose one worker
    const worker1 = pool.getOrCreateWorker(h1.threadID);
    worker1.state = 'disposed';
    expect(pool.activeWorkerCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 15. createThread records navigation (back stack populated)
  // -------------------------------------------------------------------------
  test('createThread records navigation via activateThreadWithNavigation', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = pool.createThread({ cwd: '/tmp', model: 'test' });

    // h1 should be on the back stack after h2 creation
    expect(pool.threadBackStack).toContain(h1.threadID);
    expect(pool.threadForwardStack.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 16. deleteThread cleans up worker map
  // -------------------------------------------------------------------------
  test('deleteThread also removes from threadWorkerMap', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    pool.getOrCreateWorker(h1.threadID);
    expect(pool.threadWorkerMap.has(h1.threadID)).toBe(true);

    pool.deleteThread(h1.threadID);
    expect(pool.threadWorkerMap.has(h1.threadID)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 17. deleteThread returns false for nonexistent thread
  // -------------------------------------------------------------------------
  test('deleteThread returns false for nonexistent thread', () => {
    expect(pool.deleteThread('T-nonexistent')).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 18. generateTitle with no user messages is a no-op
  // -------------------------------------------------------------------------
  test('generateTitle with no user messages does not set title', () => {
    const h1 = pool.createThread({ cwd: '/tmp', model: 'test' });
    pool.generateTitle(h1.threadID);
    expect(h1.title).toBeNull();
  });
});
