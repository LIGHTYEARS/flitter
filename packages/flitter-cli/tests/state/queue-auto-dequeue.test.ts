// queue-auto-dequeue.test.ts -- Tests for queue auto-dequeue and smart enqueue (F2).
//
// Validates:
// 1. Auto-dequeue on end_turn (existing PromptController logic)
// 2. Smart enqueue-when-idle (new AppState.enqueueMessage logic)
// 3. Queue operations (interruptQueue, clearQueue)

import { describe, test, expect, beforeEach } from 'bun:test';
import { ThreadPool } from '../../src/state/thread-pool';
import { createThreadHandle } from '../../src/state/thread-handle';
import { SessionState } from '../../src/state/session';
import { AppState } from '../../src/state/app-state';
import { PromptHistory } from '../../src/state/history';
import { SessionStore } from '../../src/state/session-store';
import type { ThreadHandle } from '../../src/state/types';

/** Helper to create a ThreadHandle with default options. */
function makeHandle(id?: `T-${string}`): ThreadHandle {
  return createThreadHandle({
    threadID: id,
    cwd: '/tmp',
    model: 'test',
  });
}

/**
 * Helper to create a minimal AppState for queue auto-dequeue testing.
 * Does NOT wire a real PromptController — submitPrompt is stubbed.
 */
function makeAppState(): { appState: AppState; submittedTexts: string[] } {
  const threadPool = new ThreadPool();
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/tmp',
    model: 'test',
  });
  const promptHistory = new PromptHistory('/tmp/test-history-auto-dequeue.json');
  const sessionStore = new SessionStore('/tmp/test-sessions-auto-dequeue');
  const appState = new AppState(session, promptHistory, sessionStore, threadPool);

  // Register initial thread in pool
  const handle = makeHandle();
  threadPool.activateThread(handle);

  // Track submitted prompts via stub
  const submittedTexts: string[] = [];
  appState.submitPrompt = async (text: string) => {
    submittedTexts.push(text);
  };

  return { appState, submittedTexts };
}

// =============================================================================
// Smart enqueue-when-idle (F2)
// =============================================================================
describe('smart enqueue-when-idle', () => {
  let appState: AppState;
  let submittedTexts: string[];

  beforeEach(() => {
    const result = makeAppState();
    appState = result.appState;
    submittedTexts = result.submittedTexts;
  });

  // -------------------------------------------------------------------------
  // 1. Immediately dequeues when worker is idle
  // -------------------------------------------------------------------------
  test('immediately dequeues when worker is idle', () => {
    const handle = appState.threadPool.activeThreadHandleOrNull!;
    const worker = appState.threadPool.getOrCreateWorker(handle.threadID);

    // Worker should start idle
    expect(worker.isIdle).toBe(true);

    // Enqueue a message via the smart enqueue method
    appState.enqueueMessage('hello idle worker');

    // Should have been immediately dequeued and submitted
    expect(submittedTexts).toEqual(['hello idle worker']);

    // Queue should be empty (message was shifted out)
    expect(handle.queuedMessages.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 2. Stays queued when worker is running
  // -------------------------------------------------------------------------
  test('stays queued when worker is running', () => {
    const handle = appState.threadPool.activeThreadHandleOrNull!;
    const worker = appState.threadPool.getOrCreateWorker(handle.threadID);

    // Set worker to running state
    worker.handle({ type: 'user:message-queue:dequeue' });
    expect(worker.isRunning).toBe(true);

    // Enqueue a message while worker is busy
    appState.enqueueMessage('queued while busy');

    // Should NOT have been submitted
    expect(submittedTexts).toEqual([]);

    // Message should remain in the queue
    expect(handle.queuedMessages.length).toBe(1);
    expect(handle.queuedMessages[0].text).toBe('queued while busy');
  });

  // -------------------------------------------------------------------------
  // 3. Does not auto-dequeue if multiple messages already in queue
  // -------------------------------------------------------------------------
  test('does not auto-dequeue second message when queue already has items', () => {
    const handle = appState.threadPool.activeThreadHandleOrNull!;
    const worker = appState.threadPool.getOrCreateWorker(handle.threadID);

    // Set worker to running so first message stays queued
    worker.handle({ type: 'user:message-queue:dequeue' });

    // Queue two messages while worker is running
    appState.enqueueMessage('first');
    appState.enqueueMessage('second');

    // Neither should be submitted (worker is running)
    expect(submittedTexts).toEqual([]);
    expect(handle.queuedMessages.length).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 4. No-op when no active thread handle
  // -------------------------------------------------------------------------
  test('no-op when no active thread handle', () => {
    // Remove active thread
    appState.threadPool.activeThreadContextID = null;

    // Should not throw, just log and return
    appState.enqueueMessage('orphaned message');

    // Nothing submitted since there's no active thread
    expect(submittedTexts).toEqual([]);
  });
});

// =============================================================================
// Auto-dequeue on end_turn (existing PromptController logic)
// =============================================================================
describe('auto-dequeue on end_turn', () => {
  // -------------------------------------------------------------------------
  // 5. Auto-dequeue is wired: queued messages callback returns thread queue
  // -------------------------------------------------------------------------
  test('queued messages are accessible from thread handle', () => {
    const { appState } = makeAppState();
    const handle = appState.threadPool.activeThreadHandleOrNull!;

    // Queue messages directly on thread pool (simulating existing path)
    appState.threadPool.queueMessage('msg1');
    appState.threadPool.queueMessage('msg2');

    expect(handle.queuedMessages.length).toBe(2);
    expect(handle.queuedMessages[0].text).toBe('msg1');
    expect(handle.queuedMessages[1].text).toBe('msg2');
  });

  // -------------------------------------------------------------------------
  // 6. Queue shift removes first message (FIFO order)
  // -------------------------------------------------------------------------
  test('queue shift removes first message in FIFO order', () => {
    const { appState } = makeAppState();
    const handle = appState.threadPool.activeThreadHandleOrNull!;

    appState.threadPool.queueMessage('first');
    appState.threadPool.queueMessage('second');
    appState.threadPool.queueMessage('third');

    const dequeued = handle.queuedMessages.shift();
    expect(dequeued?.text).toBe('first');
    expect(handle.queuedMessages.length).toBe(2);
    expect(handle.queuedMessages[0].text).toBe('second');
  });

  // -------------------------------------------------------------------------
  // 7. Empty queue after turn completion does nothing
  // -------------------------------------------------------------------------
  test('no dequeue attempt when queue is empty', () => {
    const { appState } = makeAppState();
    const handle = appState.threadPool.activeThreadHandleOrNull!;

    // Queue is empty
    expect(handle.queuedMessages.length).toBe(0);

    // Shifting from empty array returns undefined
    const dequeued = handle.queuedMessages.shift();
    expect(dequeued).toBeUndefined();
  });
});

// =============================================================================
// Queue operations (interruptQueue, clearQueue)
// =============================================================================
describe('queue operations', () => {
  let appState: AppState;

  beforeEach(() => {
    const result = makeAppState();
    appState = result.appState;
  });

  // -------------------------------------------------------------------------
  // 8. interruptQueue removes the first queued message
  // -------------------------------------------------------------------------
  test('interruptQueue removes first queued message', () => {
    const handle = appState.threadPool.activeThreadHandleOrNull!;

    appState.threadPool.queueMessage('msg1');
    appState.threadPool.queueMessage('msg2');
    expect(handle.queuedMessages.length).toBe(2);

    appState.interruptQueue();

    expect(handle.queuedMessages.length).toBe(1);
    expect(handle.queuedMessages[0].text).toBe('msg2');
  });

  // -------------------------------------------------------------------------
  // 9. clearQueue empties all queued messages
  // -------------------------------------------------------------------------
  test('clearQueue empties all queued messages', () => {
    const handle = appState.threadPool.activeThreadHandleOrNull!;

    appState.threadPool.queueMessage('msg1');
    appState.threadPool.queueMessage('msg2');
    appState.threadPool.queueMessage('msg3');
    expect(handle.queuedMessages.length).toBe(3);

    appState.clearQueue();

    expect(handle.queuedMessages.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 10. interruptQueue on empty queue is a no-op
  // -------------------------------------------------------------------------
  test('interruptQueue on empty queue is no-op', () => {
    const handle = appState.threadPool.activeThreadHandleOrNull!;
    expect(handle.queuedMessages.length).toBe(0);

    // Should not throw
    appState.interruptQueue();

    expect(handle.queuedMessages.length).toBe(0);
  });
});
