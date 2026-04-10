// thread-merge.test.ts -- Tests for thread merging (F34).
//
// Validates mergeThreadInto: status lifecycle (merging -> merged),
// item transfer, visibility hiding, active thread switching, and
// edge cases (self-merge, missing threads).

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

describe('Thread Merging (F34)', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  // -------------------------------------------------------------------------
  // 1. mergeThreadInto copies user messages from source to target
  // -------------------------------------------------------------------------
  test('mergeThreadInto copies user messages from source to target', () => {
    const source = makeHandle();
    const target = makeHandle();
    pool.activateThread(source);
    pool.activateThread(target);

    // Add messages to source
    source.session.startProcessing('Hello from source');
    source.session.beginStreaming();
    source.session.completeStream('end_turn');
    source.session.reset();

    const sourceItemsBefore = source.session.items.length;
    expect(sourceItemsBefore).toBeGreaterThan(0);

    const targetItemsBefore = target.session.items.length;

    const result = pool.mergeThreadInto(source.threadID, target.threadID);
    expect(result).toBe(true);

    // Target should have gained items
    expect(target.session.items.length).toBeGreaterThan(targetItemsBefore);
  });

  // -------------------------------------------------------------------------
  // 2. mergeThreadInto sets source status to 'merged'
  // -------------------------------------------------------------------------
  test('mergeThreadInto sets source status to merged', () => {
    const source = makeHandle();
    const target = makeHandle();
    pool.activateThread(source);
    pool.activateThread(target);

    expect(source.status).toBeNull();

    pool.mergeThreadInto(source.threadID, target.threadID);

    expect(source.status).toBe('merged');
  });

  // -------------------------------------------------------------------------
  // 3. mergeThreadInto hides the source thread
  // -------------------------------------------------------------------------
  test('mergeThreadInto hides the source thread', () => {
    const source = makeHandle();
    const target = makeHandle();
    pool.activateThread(source);
    pool.activateThread(target);

    expect(source.visibility).toBe('visible');

    pool.mergeThreadInto(source.threadID, target.threadID);

    expect(source.visibility).toBe('hidden');
  });

  // -------------------------------------------------------------------------
  // 4. mergeThreadInto switches to target if source was active
  // -------------------------------------------------------------------------
  test('mergeThreadInto switches to target if source was active', () => {
    const source = makeHandle();
    const target = makeHandle();
    pool.activateThread(source);
    pool.activateThread(target);

    // Switch back to source so it is active
    pool.switchThread(source.threadID);
    expect(pool.activeThreadContextID).toBe(source.threadID);

    pool.mergeThreadInto(source.threadID, target.threadID);

    // Should now be on target
    expect(pool.activeThreadContextID).toBe(target.threadID);
  });

  // -------------------------------------------------------------------------
  // 5. mergeThreadInto does not switch if source was not active
  // -------------------------------------------------------------------------
  test('mergeThreadInto does not switch if source was not active', () => {
    const source = makeHandle();
    const target = makeHandle();
    const other = makeHandle();
    pool.activateThread(source);
    pool.activateThread(target);
    pool.activateThread(other);

    // 'other' is now active
    expect(pool.activeThreadContextID).toBe(other.threadID);

    pool.mergeThreadInto(source.threadID, target.threadID);

    // Should still be on 'other'
    expect(pool.activeThreadContextID).toBe(other.threadID);
  });

  // -------------------------------------------------------------------------
  // 6. mergeThreadInto creates a merge relationship
  // -------------------------------------------------------------------------
  test('mergeThreadInto creates a merge relationship', () => {
    const source = makeHandle();
    const target = makeHandle();
    pool.activateThread(source);
    pool.activateThread(target);

    pool.mergeThreadInto(source.threadID, target.threadID);

    const rels = pool.getRelationships(source.threadID);
    expect(rels.length).toBeGreaterThan(0);
    expect(rels.some(r => r.sourceThreadID === source.threadID && r.targetThreadID === target.threadID)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 7. mergeThreadInto returns false for missing source thread
  // -------------------------------------------------------------------------
  test('mergeThreadInto returns false for missing source thread', () => {
    const target = makeHandle();
    pool.activateThread(target);

    const result = pool.mergeThreadInto('T-nonexistent', target.threadID);
    expect(result).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 8. mergeThreadInto returns false for missing target thread
  // -------------------------------------------------------------------------
  test('mergeThreadInto returns false for missing target thread', () => {
    const source = makeHandle();
    pool.activateThread(source);

    const result = pool.mergeThreadInto(source.threadID, 'T-nonexistent');
    expect(result).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 9. mergeThreadInto returns false for self-merge
  // -------------------------------------------------------------------------
  test('mergeThreadInto returns false for self-merge', () => {
    const handle = makeHandle();
    pool.activateThread(handle);

    const result = pool.mergeThreadInto(handle.threadID, handle.threadID);
    expect(result).toBe(false);
    expect(handle.status).toBeNull(); // Status should not change
  });

  // -------------------------------------------------------------------------
  // 10. merged source is excluded from getVisibleThreads
  // -------------------------------------------------------------------------
  test('merged source is excluded from getVisibleThreads', () => {
    const source = makeHandle();
    const target = makeHandle();
    pool.activateThread(source);
    pool.activateThread(target);

    const visibleBefore = pool.getVisibleThreads();
    expect(visibleBefore.some(h => h.threadID === source.threadID)).toBe(true);

    pool.mergeThreadInto(source.threadID, target.threadID);

    const visibleAfter = pool.getVisibleThreads();
    expect(visibleAfter.some(h => h.threadID === source.threadID)).toBe(false);
    expect(visibleAfter.some(h => h.threadID === target.threadID)).toBe(true);
  });
});
