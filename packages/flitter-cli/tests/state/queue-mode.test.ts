// queue-mode.test.ts -- Tests for queue mode state machine (QUEUE-01).
//
// Validates AMP-aligned behavior: QueuedMessage type, per-thread queuedMessages,
// ThreadPool.queueMessage/discardQueuedMessages, and AppState queue mode
// lifecycle (enterQueueMode, exitQueueMode, submitQueue, interruptQueue, clearQueue).

import { describe, test, expect, beforeEach } from 'bun:test';
import { ThreadPool } from '../../src/state/thread-pool';
import { createThreadHandle } from '../../src/state/thread-handle';
import { SessionState } from '../../src/state/session';
import { AppState } from '../../src/state/app-state';
import { PromptHistory } from '../../src/state/history';
import { SessionStore } from '../../src/state/session-store';
import type { ThreadHandle, QueuedMessage } from '../../src/state/types';

/** Helper to create a ThreadHandle with default options. */
function makeHandle(id?: `T-${string}`): ThreadHandle {
  return createThreadHandle({
    threadID: id,
    cwd: '/tmp',
    model: 'test',
  });
}

/**
 * Helper to create a minimal AppState for queue mode testing.
 * Does NOT wire a real PromptController — submitPrompt is stubbed.
 */
function makeAppState(): AppState {
  const threadPool = new ThreadPool();
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/tmp',
    model: 'test',
  });
  const promptHistory = new PromptHistory('/tmp/test-history.json');
  const sessionStore = new SessionStore('/tmp/test-sessions');
  const appState = new AppState(session, promptHistory, sessionStore, threadPool);

  // Register initial thread in pool
  const handle = makeHandle();
  threadPool.activateThread(handle);

  return appState;
}

// =============================================================================
// QueuedMessage type and ThreadHandle
// =============================================================================
describe('QueuedMessage type and ThreadHandle', () => {
  // -------------------------------------------------------------------------
  // 1. New ThreadHandle has empty queuedMessages array
  // -------------------------------------------------------------------------
  test('new ThreadHandle has empty queuedMessages array', () => {
    const h = makeHandle();
    expect(h.queuedMessages).toEqual([]);
    expect(Array.isArray(h.queuedMessages)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. QueuedMessage has id, text, queuedAt fields
  // -------------------------------------------------------------------------
  test('QueuedMessage has id, text, queuedAt fields', () => {
    const msg: QueuedMessage = {
      id: 'qm-test-123',
      text: 'hello world',
      queuedAt: Date.now(),
    };
    expect(msg.id).toBe('qm-test-123');
    expect(msg.text).toBe('hello world');
    expect(typeof msg.queuedAt).toBe('number');
    expect(msg.images).toBeUndefined();
  });
});

// =============================================================================
// ThreadPool.queueMessage / discardQueuedMessages
// =============================================================================
describe('ThreadPool.queueMessage / discardQueuedMessages', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  // -------------------------------------------------------------------------
  // 3. queueMessage adds message to active thread's queuedMessages
  // -------------------------------------------------------------------------
  test('queueMessage adds message to active thread queuedMessages', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.queueMessage('first message');

    expect(h.queuedMessages.length).toBe(1);
    expect(h.queuedMessages[0].text).toBe('first message');
    expect(h.queuedMessages[0].id).toMatch(/^qm-/);
    expect(typeof h.queuedMessages[0].queuedAt).toBe('number');
  });

  // -------------------------------------------------------------------------
  // 4. queueMessage with no active thread is a no-op
  // -------------------------------------------------------------------------
  test('queueMessage with no active thread is a no-op', () => {
    // pool has no active thread
    pool.queueMessage('should be ignored');
    // No throw, no side effects
    expect(pool.activeThreadHandleOrNull).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. Multiple queueMessage calls accumulate in order
  // -------------------------------------------------------------------------
  test('multiple queueMessage calls accumulate in order', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.queueMessage('first');
    pool.queueMessage('second');
    pool.queueMessage('third');

    expect(h.queuedMessages.length).toBe(3);
    expect(h.queuedMessages[0].text).toBe('first');
    expect(h.queuedMessages[1].text).toBe('second');
    expect(h.queuedMessages[2].text).toBe('third');
  });

  // -------------------------------------------------------------------------
  // 6. discardQueuedMessages clears all queued messages
  // -------------------------------------------------------------------------
  test('discardQueuedMessages clears all queued messages', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.queueMessage('msg1');
    pool.queueMessage('msg2');
    expect(h.queuedMessages.length).toBe(2);

    pool.discardQueuedMessages();
    expect(h.queuedMessages.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 7. discardQueuedMessages with no active thread is a no-op
  // -------------------------------------------------------------------------
  test('discardQueuedMessages with no active thread is a no-op', () => {
    // pool has no active thread
    pool.discardQueuedMessages();
    // No throw
    expect(pool.activeThreadHandleOrNull).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 8. discardQueuedMessages notifies listeners
  // -------------------------------------------------------------------------
  test('discardQueuedMessages notifies listeners', () => {
    const h = makeHandle();
    pool.activateThread(h);
    pool.queueMessage('msg');

    let notified = false;
    pool.addListener(() => { notified = true; });

    pool.discardQueuedMessages();
    expect(notified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 8b. queueMessage with images stores them correctly
  // -------------------------------------------------------------------------
  test('queueMessage with images stores them', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.queueMessage('with image', [{ filename: 'test.png' }]);

    expect(h.queuedMessages[0].images).toEqual([{ filename: 'test.png' }]);
  });

  // -------------------------------------------------------------------------
  // 8c. queueMessage with empty images array stores undefined
  // -------------------------------------------------------------------------
  test('queueMessage with empty images array stores undefined', () => {
    const h = makeHandle();
    pool.activateThread(h);

    pool.queueMessage('no images', []);

    expect(h.queuedMessages[0].images).toBeUndefined();
  });
});

// =============================================================================
// AppState queue mode lifecycle
// =============================================================================
describe('AppState queue mode lifecycle', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // -------------------------------------------------------------------------
  // 9. isInQueueMode defaults to false
  // -------------------------------------------------------------------------
  test('isInQueueMode defaults to false', () => {
    expect(appState.isInQueueMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 10. enterQueueMode sets isInQueueMode to true
  // -------------------------------------------------------------------------
  test('enterQueueMode sets isInQueueMode to true', () => {
    appState.enterQueueMode();
    expect(appState.isInQueueMode).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 11. enterQueueMode is idempotent
  // -------------------------------------------------------------------------
  test('enterQueueMode is idempotent (double-call is no-op)', () => {
    let notifyCount = 0;
    appState.addListener(() => notifyCount++);

    appState.enterQueueMode();
    const countAfterFirst = notifyCount;

    appState.enterQueueMode();
    // Should NOT have notified again
    expect(notifyCount).toBe(countAfterFirst);
    expect(appState.isInQueueMode).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 12. exitQueueMode sets isInQueueMode to false and discards queue
  // -------------------------------------------------------------------------
  test('exitQueueMode sets isInQueueMode to false and discards queue', () => {
    appState.enterQueueMode();
    appState.threadPool.queueMessage('pending msg');

    const handle = appState.threadPool.activeThreadHandleOrNull!;
    expect(handle.queuedMessages.length).toBe(1);

    appState.exitQueueMode();

    expect(appState.isInQueueMode).toBe(false);
    expect(handle.queuedMessages.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 13. exitQueueMode is idempotent (no-op when already false)
  // -------------------------------------------------------------------------
  test('exitQueueMode is idempotent (no-op when already false)', () => {
    let notifyCount = 0;
    appState.addListener(() => notifyCount++);

    appState.exitQueueMode();
    // Should NOT notify when already not in queue mode
    expect(notifyCount).toBe(0);
    expect(appState.isInQueueMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 14. submitQueue exits queue mode and dequeues first message
  // -------------------------------------------------------------------------
  test('submitQueue exits queue mode and dequeues first message', async () => {
    // Stub submitPrompt to track calls without actually submitting
    let submittedText: string | null = null;
    appState.submitPrompt = async (text: string) => {
      submittedText = text;
    };

    appState.enterQueueMode();
    appState.threadPool.queueMessage('first');
    appState.threadPool.queueMessage('second');

    const handle = appState.threadPool.activeThreadHandleOrNull!;
    expect(handle.queuedMessages.length).toBe(2);

    await appState.submitQueue();

    expect(appState.isInQueueMode).toBe(false);
    expect(submittedText).toBe('first');
    // Second message remains in queue for auto-dequeue (Plan 28-02)
    expect(handle.queuedMessages.length).toBe(1);
    expect(handle.queuedMessages[0].text).toBe('second');
  });

  // -------------------------------------------------------------------------
  // 15. submitQueue with empty queue exits queue mode
  // -------------------------------------------------------------------------
  test('submitQueue with empty queue exits queue mode', async () => {
    appState.enterQueueMode();
    expect(appState.isInQueueMode).toBe(true);

    await appState.submitQueue();

    expect(appState.isInQueueMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 16. interruptQueue removes the first queued message
  // -------------------------------------------------------------------------
  test('interruptQueue removes the first queued message', () => {
    appState.threadPool.queueMessage('first');
    appState.threadPool.queueMessage('second');

    const handle = appState.threadPool.activeThreadHandleOrNull!;
    expect(handle.queuedMessages.length).toBe(2);

    appState.interruptQueue();

    expect(handle.queuedMessages.length).toBe(1);
    expect(handle.queuedMessages[0].text).toBe('second');
  });

  // -------------------------------------------------------------------------
  // 17. interruptQueue with empty queue is a no-op
  // -------------------------------------------------------------------------
  test('interruptQueue with empty queue is a no-op', () => {
    const handle = appState.threadPool.activeThreadHandleOrNull!;
    expect(handle.queuedMessages.length).toBe(0);

    // Should not throw
    appState.interruptQueue();
    expect(handle.queuedMessages.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 18. clearQueue discards all messages but stays in queue mode
  // -------------------------------------------------------------------------
  test('clearQueue discards all messages but stays in queue mode', () => {
    appState.enterQueueMode();
    appState.threadPool.queueMessage('msg1');
    appState.threadPool.queueMessage('msg2');

    const handle = appState.threadPool.activeThreadHandleOrNull!;
    expect(handle.queuedMessages.length).toBe(2);

    appState.clearQueue();

    expect(handle.queuedMessages.length).toBe(0);
    expect(appState.isInQueueMode).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 19. switchToThread exits queue mode (AMP's onThreadSwitch pattern)
  // -------------------------------------------------------------------------
  test('switchToThread exits queue mode', () => {
    // Create a second thread to switch to
    const h2 = makeHandle();
    appState.threadPool.activateThread(h2);
    // Switch back to original thread first
    const originalID = appState.threadPool.recentThreadIDs[1];
    appState.threadPool.switchThread(originalID!);

    appState.enterQueueMode();
    appState.threadPool.queueMessage('pending');

    expect(appState.isInQueueMode).toBe(true);

    appState.switchToThread(h2.threadID);

    expect(appState.isInQueueMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 20. newThread exits queue mode
  // -------------------------------------------------------------------------
  test('newThread exits queue mode', () => {
    appState.enterQueueMode();
    appState.threadPool.queueMessage('pending');

    expect(appState.isInQueueMode).toBe(true);

    appState.newThread();

    expect(appState.isInQueueMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 21. submitQueue when not in queue mode is a no-op
  // -------------------------------------------------------------------------
  test('submitQueue when not in queue mode is a no-op', async () => {
    let submittedText: string | null = null;
    appState.submitPrompt = async (text: string) => {
      submittedText = text;
    };

    appState.threadPool.queueMessage('msg');

    await appState.submitQueue();

    // Should not have called submitPrompt
    expect(submittedText).toBeNull();
  });
});
