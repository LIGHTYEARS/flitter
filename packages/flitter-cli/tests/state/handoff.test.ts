// handoff.test.ts -- Tests for handoff state machine (HAND-01, HAND-02, HAND-03).
//
// Validates AMP-aligned behavior: HandoffState lifecycle (enter/exit/submit/abort),
// countdown timer with auto-submit, and cross-thread handoff tracking
// (createHandoff, completeHandoff, getHandoffSourceThreadID).

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ThreadPool } from '../../src/state/thread-pool';
import { createThreadHandle } from '../../src/state/thread-handle';
import { SessionState } from '../../src/state/session';
import { AppState } from '../../src/state/app-state';
import { PromptHistory } from '../../src/state/history';
import { SessionStore } from '../../src/state/session-store';
import { DEFAULT_HANDOFF_STATE } from '../../src/state/types';
import type { ThreadHandle, HandoffState } from '../../src/state/types';

/** Helper to create a ThreadHandle with default options. */
function makeHandle(id?: `T-${string}`): ThreadHandle {
  return createThreadHandle({
    threadID: id,
    cwd: '/tmp',
    model: 'test',
  });
}

/**
 * Helper to create a minimal AppState for handoff mode testing.
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
// HAND-01: enterHandoffMode / exitHandoffMode / submitHandoff / abortHandoff
// =============================================================================
describe('HAND-01: Handoff mode lifecycle', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // -------------------------------------------------------------------------
  // 1. handoffState defaults to DEFAULT_HANDOFF_STATE
  // -------------------------------------------------------------------------
  test('handoffState defaults to DEFAULT_HANDOFF_STATE', () => {
    expect(appState.handoffState.isInHandoffMode).toBe(false);
    expect(appState.handoffState.isGeneratingHandoff).toBe(false);
    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(false);
    expect(appState.handoffState.pendingHandoffPrompt).toBeNull();
    expect(appState.handoffState.spinner).toBeNull();
    expect(appState.handoffState.countdownSeconds).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. DEFAULT_HANDOFF_STATE constant has correct shape
  // -------------------------------------------------------------------------
  test('DEFAULT_HANDOFF_STATE has all-false/null values', () => {
    expect(DEFAULT_HANDOFF_STATE).toEqual({
      isInHandoffMode: false,
      isGeneratingHandoff: false,
      isConfirmingAbortHandoff: false,
      pendingHandoffPrompt: null,
      spinner: null,
      countdownSeconds: null,
    });
  });

  // -------------------------------------------------------------------------
  // 3. enterHandoffMode sets isInHandoffMode to true
  // -------------------------------------------------------------------------
  test('enterHandoffMode sets isInHandoffMode to true', () => {
    appState.enterHandoffMode();
    expect(appState.handoffState.isInHandoffMode).toBe(true);
    // Other fields remain at defaults
    expect(appState.handoffState.isGeneratingHandoff).toBe(false);
    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(false);
    expect(appState.handoffState.pendingHandoffPrompt).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 4. enterHandoffMode is idempotent
  // -------------------------------------------------------------------------
  test('enterHandoffMode is idempotent (double-call is no-op)', () => {
    let notifyCount = 0;
    appState.addListener(() => notifyCount++);

    appState.enterHandoffMode();
    const countAfterFirst = notifyCount;

    appState.enterHandoffMode();
    expect(notifyCount).toBe(countAfterFirst);
    expect(appState.handoffState.isInHandoffMode).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. enterHandoffMode notifies listeners
  // -------------------------------------------------------------------------
  test('enterHandoffMode notifies listeners', () => {
    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.enterHandoffMode();
    expect(notified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6. exitHandoffMode resets all handoff state to defaults
  // -------------------------------------------------------------------------
  test('exitHandoffMode resets all handoff state to defaults', () => {
    appState.enterHandoffMode();
    expect(appState.handoffState.isInHandoffMode).toBe(true);

    appState.exitHandoffMode();

    expect(appState.handoffState.isInHandoffMode).toBe(false);
    expect(appState.handoffState.isGeneratingHandoff).toBe(false);
    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(false);
    expect(appState.handoffState.pendingHandoffPrompt).toBeNull();
    expect(appState.handoffState.spinner).toBeNull();
    expect(appState.handoffState.countdownSeconds).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 7. exitHandoffMode is idempotent when already in default state
  // -------------------------------------------------------------------------
  test('exitHandoffMode is idempotent when already in default state', () => {
    let notifyCount = 0;
    appState.addListener(() => notifyCount++);

    appState.exitHandoffMode();
    expect(notifyCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 8. submitHandoff completes the full generating lifecycle
  // -------------------------------------------------------------------------
  test('submitHandoff completes the full generating lifecycle', async () => {
    appState.enterHandoffMode();

    // The internal createHandoff() is synchronous, so submitHandoff()
    // transitions through generating -> exit in one tick. We verify the
    // end-state: handoff exited, new thread created, pendingHandoff tracked.
    await appState.submitHandoff('Implement feature X');

    // Handoff mode should be fully exited after completion
    expect(appState.handoffState.isGeneratingHandoff).toBe(false);
    expect(appState.handoffState.isInHandoffMode).toBe(false);
    expect(appState.handoffState.spinner).toBeNull();
    // The ThreadPool should have recorded the handoff
    expect(appState.threadPool.pendingHandoff).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // 9. submitHandoff creates a new thread and switches to it
  // -------------------------------------------------------------------------
  test('submitHandoff creates a new thread and switches to it', async () => {
    appState.enterHandoffMode();

    const originalThreadID = appState.threadPool.activeThreadContextID;
    const originalThreadCount = appState.threadPool.threadCount;

    await appState.submitHandoff('Build the thing');

    expect(appState.threadPool.threadCount).toBe(originalThreadCount + 1);
    expect(appState.threadPool.activeThreadContextID).not.toBe(originalThreadID);
  });

  // -------------------------------------------------------------------------
  // 10. submitHandoff exits handoff mode on completion
  // -------------------------------------------------------------------------
  test('submitHandoff exits handoff mode on completion', async () => {
    appState.enterHandoffMode();

    await appState.submitHandoff('Build the thing');

    expect(appState.handoffState.isInHandoffMode).toBe(false);
    expect(appState.handoffState.isGeneratingHandoff).toBe(false);
    expect(appState.handoffState.spinner).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 11. submitHandoff when not in handoff mode is a no-op
  // -------------------------------------------------------------------------
  test('submitHandoff when not in handoff mode is a no-op', async () => {
    const threadCountBefore = appState.threadPool.threadCount;

    await appState.submitHandoff('should be ignored');

    expect(appState.threadPool.threadCount).toBe(threadCountBefore);
    expect(appState.handoffState.isGeneratingHandoff).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 12. submitHandoff clears countdown timer
  // -------------------------------------------------------------------------
  test('submitHandoff clears countdown when called during countdown', async () => {
    appState.enterHandoffMode();
    appState.startCountdown(10, 'countdown goal');
    expect(appState.handoffState.countdownSeconds).toBe(10);

    await appState.submitHandoff('countdown goal');

    expect(appState.handoffState.countdownSeconds).toBeNull();
  });
});

// =============================================================================
// Two-stage abort: abortHandoffConfirmation
// =============================================================================
describe('Two-stage abort: abortHandoffConfirmation', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // -------------------------------------------------------------------------
  // 13. First Escape sets isConfirmingAbortHandoff
  // -------------------------------------------------------------------------
  test('first Escape sets isConfirmingAbortHandoff to true', () => {
    appState.enterHandoffMode();

    appState.abortHandoffConfirmation();

    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(true);
    expect(appState.handoffState.isInHandoffMode).toBe(true); // still in handoff mode
  });

  // -------------------------------------------------------------------------
  // 14. Second Escape exits handoff mode entirely
  // -------------------------------------------------------------------------
  test('second Escape exits handoff mode entirely', () => {
    appState.enterHandoffMode();

    appState.abortHandoffConfirmation(); // first Escape
    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(true);

    appState.abortHandoffConfirmation(); // second Escape
    expect(appState.handoffState.isInHandoffMode).toBe(false);
    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 15. abortHandoffConfirmation when not in handoff mode is a no-op
  // -------------------------------------------------------------------------
  test('abortHandoffConfirmation when not in handoff mode is a no-op', () => {
    let notifyCount = 0;
    appState.addListener(() => notifyCount++);

    appState.abortHandoffConfirmation();

    expect(notifyCount).toBe(0);
    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 16. First Escape notifies listeners
  // -------------------------------------------------------------------------
  test('first Escape notifies listeners', () => {
    appState.enterHandoffMode();

    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.abortHandoffConfirmation();
    expect(notified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 17. Second Escape resets all handoff state fields
  // -------------------------------------------------------------------------
  test('second Escape resets all handoff state fields', () => {
    appState.enterHandoffMode();

    appState.abortHandoffConfirmation(); // first
    appState.abortHandoffConfirmation(); // second

    expect(appState.handoffState).toEqual(DEFAULT_HANDOFF_STATE);
  });
});

// =============================================================================
// HAND-02: Countdown timer (startCountdown, cancelCountdown, auto-submit at 0)
// =============================================================================
describe('HAND-02: Countdown timer', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // -------------------------------------------------------------------------
  // 18. startCountdown sets countdownSeconds and pendingHandoffPrompt
  // -------------------------------------------------------------------------
  test('startCountdown sets countdownSeconds and pendingHandoffPrompt', () => {
    appState.enterHandoffMode();
    appState.startCountdown(15, 'auto-submit goal');

    expect(appState.handoffState.countdownSeconds).toBe(15);
    expect(appState.handoffState.pendingHandoffPrompt).toBe('auto-submit goal');
  });

  // -------------------------------------------------------------------------
  // 19. cancelCountdown clears countdownSeconds without exiting handoff mode
  // -------------------------------------------------------------------------
  test('cancelCountdown clears countdownSeconds without exiting handoff mode', () => {
    appState.enterHandoffMode();
    appState.startCountdown(10, 'goal');

    appState.cancelCountdown();

    expect(appState.handoffState.countdownSeconds).toBeNull();
    expect(appState.handoffState.isInHandoffMode).toBe(true); // still in handoff mode
  });

  // -------------------------------------------------------------------------
  // 20. cancelCountdown when no countdown is a no-op
  // -------------------------------------------------------------------------
  test('cancelCountdown when no countdown active is a no-op', () => {
    appState.enterHandoffMode();

    let notifyCount = 0;
    appState.addListener(() => notifyCount++);

    appState.cancelCountdown();
    expect(notifyCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 21. cancelCountdown notifies listeners
  // -------------------------------------------------------------------------
  test('cancelCountdown notifies listeners when countdown active', () => {
    appState.enterHandoffMode();
    appState.startCountdown(10, 'goal');

    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.cancelCountdown();
    expect(notified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 22. startCountdown notifies listeners
  // -------------------------------------------------------------------------
  test('startCountdown notifies listeners', () => {
    appState.enterHandoffMode();

    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.startCountdown(5, 'test goal');
    expect(notified).toBe(true);

    // Clean up timer
    appState.exitHandoffMode();
  });

  // -------------------------------------------------------------------------
  // 23. exitHandoffMode clears active countdown
  // -------------------------------------------------------------------------
  test('exitHandoffMode clears active countdown', () => {
    appState.enterHandoffMode();
    appState.startCountdown(20, 'a goal');
    expect(appState.handoffState.countdownSeconds).toBe(20);

    appState.exitHandoffMode();

    expect(appState.handoffState.countdownSeconds).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 24. Countdown decrements countdownSeconds by 1 each second
  // -------------------------------------------------------------------------
  test('countdown decrements countdownSeconds by 1 each second', async () => {
    appState.enterHandoffMode();
    appState.startCountdown(3, 'goal');

    expect(appState.handoffState.countdownSeconds).toBe(3);

    // Wait ~1.1 seconds for a single decrement
    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(appState.handoffState.countdownSeconds).toBe(2);

    // Clean up
    appState.exitHandoffMode();
  });

  // -------------------------------------------------------------------------
  // 25. Countdown auto-submits when reaching 0
  // -------------------------------------------------------------------------
  test('countdown auto-submits when reaching 0', async () => {
    appState.enterHandoffMode();

    // Start a 1-second countdown — it will auto-submit after 1 tick
    appState.startCountdown(1, 'auto-goal');

    // Wait for the timer to fire and auto-submit
    await new Promise(resolve => setTimeout(resolve, 1500));

    // After auto-submit, handoff mode should be exited
    // and a new thread should have been created
    expect(appState.handoffState.isInHandoffMode).toBe(false);
    expect(appState.handoffState.countdownSeconds).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 26. abortHandoffConfirmation works during countdown
  // -------------------------------------------------------------------------
  test('abortHandoffConfirmation two-stage works during countdown', () => {
    appState.enterHandoffMode();
    appState.startCountdown(10, 'countdown goal');

    appState.abortHandoffConfirmation(); // first Escape
    expect(appState.handoffState.isConfirmingAbortHandoff).toBe(true);
    expect(appState.handoffState.countdownSeconds).toBe(10); // countdown still active

    appState.abortHandoffConfirmation(); // second Escape
    expect(appState.handoffState.isInHandoffMode).toBe(false);
    expect(appState.handoffState.countdownSeconds).toBeNull();
  });
});

// =============================================================================
// HAND-03: Cross-thread tracking (ThreadPool)
// =============================================================================
describe('HAND-03: Cross-thread handoff tracking', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
    const h = makeHandle();
    pool.activateThread(h);
  });

  // -------------------------------------------------------------------------
  // 27. createHandoff creates a new thread and sets pendingHandoff
  // -------------------------------------------------------------------------
  test('createHandoff creates a new thread and sets pendingHandoff', async () => {
    const sourceID = pool.activeThreadContextID!;
    const handleCountBefore = pool.threadCount;

    const newHandle = await pool.createHandoff('Build feature X');

    expect(pool.threadCount).toBe(handleCountBefore + 1);
    expect(pool.pendingHandoff).not.toBeNull();
    expect(pool.pendingHandoff!.sourceThreadID).toBe(sourceID);
    expect(pool.pendingHandoff!.targetThreadID).toBe(newHandle.threadID);
    expect(pool.pendingHandoff!.goal).toBe('Build feature X');
  });

  // -------------------------------------------------------------------------
  // 28. createHandoff switches active thread to the new thread
  // -------------------------------------------------------------------------
  test('createHandoff switches active thread to the new thread', async () => {
    const sourceID = pool.activeThreadContextID!;

    const newHandle = await pool.createHandoff('goal');

    expect(pool.activeThreadContextID).toBe(newHandle.threadID);
    expect(pool.activeThreadContextID).not.toBe(sourceID);
  });

  // -------------------------------------------------------------------------
  // 29. createHandoff records navigation (source in backStack)
  // -------------------------------------------------------------------------
  test('createHandoff records navigation (source pushed to backStack)', async () => {
    const sourceID = pool.activeThreadContextID!;

    await pool.createHandoff('goal');

    expect(pool.threadBackStack).toContain(sourceID);
  });

  // -------------------------------------------------------------------------
  // 30. createHandoff with agentMode option passes it to request
  // -------------------------------------------------------------------------
  test('createHandoff with agentMode passes it to HandoffRequest', async () => {
    await pool.createHandoff('goal', { agentMode: 'rush' });

    expect(pool.pendingHandoff!.agentMode).toBe('rush');
  });

  // -------------------------------------------------------------------------
  // 31. createHandoff without agentMode defaults to null
  // -------------------------------------------------------------------------
  test('createHandoff without agentMode defaults to null in request', async () => {
    await pool.createHandoff('goal');

    expect(pool.pendingHandoff!.agentMode).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 32. createHandoff with no active thread throws
  // -------------------------------------------------------------------------
  test('createHandoff with no active thread throws', async () => {
    const emptyPool = new ThreadPool();

    expect(emptyPool.createHandoff('goal')).rejects.toThrow(
      'ThreadPool.createHandoff: no active thread context',
    );
  });

  // -------------------------------------------------------------------------
  // 33. completeHandoff moves pending to completedHandoffs
  // -------------------------------------------------------------------------
  test('completeHandoff moves pendingHandoff to completedHandoffs', async () => {
    await pool.createHandoff('goal');
    expect(pool.pendingHandoff).not.toBeNull();
    expect(pool.completedHandoffs.length).toBe(0);

    pool.completeHandoff();

    expect(pool.pendingHandoff).toBeNull();
    expect(pool.completedHandoffs.length).toBe(1);
    expect(pool.completedHandoffs[0].goal).toBe('goal');
  });

  // -------------------------------------------------------------------------
  // 34. completeHandoff when no pending is a no-op
  // -------------------------------------------------------------------------
  test('completeHandoff when no pending handoff is a no-op', () => {
    pool.completeHandoff();

    expect(pool.pendingHandoff).toBeNull();
    expect(pool.completedHandoffs.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 35. getHandoffSourceThreadID returns source for handoff-created thread
  // -------------------------------------------------------------------------
  test('getHandoffSourceThreadID returns source for handoff-created thread', async () => {
    const sourceID = pool.activeThreadContextID!;
    const newHandle = await pool.createHandoff('goal');

    const result = pool.getHandoffSourceThreadID(newHandle.threadID);

    expect(result).toBe(sourceID);
  });

  // -------------------------------------------------------------------------
  // 36. getHandoffSourceThreadID returns null for non-handoff thread
  // -------------------------------------------------------------------------
  test('getHandoffSourceThreadID returns null for non-handoff thread', () => {
    const h = makeHandle();
    pool.activateThread(h);

    const result = pool.getHandoffSourceThreadID(h.threadID);

    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 37. getHandoffSourceThreadID defaults to active thread when no arg
  // -------------------------------------------------------------------------
  test('getHandoffSourceThreadID defaults to active thread when no arg', async () => {
    const sourceID = pool.activeThreadContextID!;
    await pool.createHandoff('goal');

    // Active thread is now the handoff target
    const result = pool.getHandoffSourceThreadID();

    expect(result).toBe(sourceID);
  });

  // -------------------------------------------------------------------------
  // 38. getHandoffSourceThreadID returns null when no active thread
  // -------------------------------------------------------------------------
  test('getHandoffSourceThreadID returns null when pool has no active thread', () => {
    const emptyPool = new ThreadPool();

    expect(emptyPool.getHandoffSourceThreadID()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 39. Multiple handoffs accumulate in completedHandoffs
  // -------------------------------------------------------------------------
  test('multiple handoffs accumulate in completedHandoffs', async () => {
    await pool.createHandoff('first goal');
    pool.completeHandoff();

    await pool.createHandoff('second goal');
    pool.completeHandoff();

    expect(pool.completedHandoffs.length).toBe(2);
    expect(pool.completedHandoffs[0].goal).toBe('first goal');
    expect(pool.completedHandoffs[1].goal).toBe('second goal');
  });

  // -------------------------------------------------------------------------
  // 40. HandoffRequest has createdAt timestamp
  // -------------------------------------------------------------------------
  test('HandoffRequest has createdAt timestamp', async () => {
    const before = Date.now();
    await pool.createHandoff('goal');
    const after = Date.now();

    expect(pool.pendingHandoff!.createdAt).toBeGreaterThanOrEqual(before);
    expect(pool.pendingHandoff!.createdAt).toBeLessThanOrEqual(after);
  });

  // -------------------------------------------------------------------------
  // 41. createHandoff notifies listeners
  // -------------------------------------------------------------------------
  test('createHandoff notifies listeners', async () => {
    let notified = false;
    pool.addListener(() => { notified = true; });

    await pool.createHandoff('goal');

    expect(notified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 42. completeHandoff notifies listeners
  // -------------------------------------------------------------------------
  test('completeHandoff notifies listeners', async () => {
    await pool.createHandoff('goal');

    let notified = false;
    pool.addListener(() => { notified = true; });

    pool.completeHandoff();

    expect(notified).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 43. removeThread cleans up handoff source map
  // -------------------------------------------------------------------------
  test('removeThread cleans up handoff source map entry', async () => {
    const sourceID = pool.activeThreadContextID!;
    const newHandle = await pool.createHandoff('goal');

    expect(pool.getHandoffSourceThreadID(newHandle.threadID)).toBe(sourceID);

    pool.removeThread(newHandle.threadID);

    expect(pool.getHandoffSourceThreadID(newHandle.threadID)).toBeNull();
  });
});

// =============================================================================
// Integration: exitHandoffMode on thread switch
// =============================================================================
describe('exitHandoffMode on thread switch', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // -------------------------------------------------------------------------
  // 44. switchToThread exits handoff mode
  // -------------------------------------------------------------------------
  test('switchToThread exits handoff mode', () => {
    // Create a second thread to switch to
    const h2 = makeHandle();
    appState.threadPool.activateThread(h2);
    // Switch back to original thread
    const originalID = appState.threadPool.recentThreadIDs[1];
    appState.threadPool.switchThread(originalID!);

    appState.enterHandoffMode();
    expect(appState.handoffState.isInHandoffMode).toBe(true);

    appState.switchToThread(h2.threadID);

    expect(appState.handoffState.isInHandoffMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 45. newThread exits handoff mode
  // -------------------------------------------------------------------------
  test('newThread exits handoff mode', () => {
    appState.enterHandoffMode();
    expect(appState.handoffState.isInHandoffMode).toBe(true);

    appState.newThread();

    expect(appState.handoffState.isInHandoffMode).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 46. switchToThread clears countdown timer
  // -------------------------------------------------------------------------
  test('switchToThread clears countdown timer', () => {
    const h2 = makeHandle();
    appState.threadPool.activateThread(h2);
    const originalID = appState.threadPool.recentThreadIDs[1];
    appState.threadPool.switchThread(originalID!);

    appState.enterHandoffMode();
    appState.startCountdown(10, 'goal');
    expect(appState.handoffState.countdownSeconds).toBe(10);

    appState.switchToThread(h2.threadID);

    expect(appState.handoffState.countdownSeconds).toBeNull();
  });
});

// =============================================================================
// isProcessing includes isGeneratingHandoff
// =============================================================================
describe('isProcessing includes isGeneratingHandoff', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // -------------------------------------------------------------------------
  // 47. isProcessing is false by default
  // -------------------------------------------------------------------------
  test('isProcessing is false when idle and not generating handoff', () => {
    expect(appState.isProcessing).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 48. isProcessing is true when isGeneratingHandoff is true
  // -------------------------------------------------------------------------
  test('isProcessing is true when isGeneratingHandoff is true', () => {
    // Manually set handoff state to generating (simulate in-flight submitHandoff)
    appState.handoffState = {
      ...appState.handoffState,
      isGeneratingHandoff: true,
    };

    expect(appState.isProcessing).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 49. isProcessing reflects session lifecycle OR handoff generating
  // -------------------------------------------------------------------------
  test('isProcessing is true for session processing even without handoff', () => {
    // Transition session to processing state
    appState.session.startProcessing('test prompt');

    expect(appState.isProcessing).toBe(true);
    expect(appState.handoffState.isGeneratingHandoff).toBe(false);
  });
});

// =============================================================================
// Shutdown cleanup
// =============================================================================
describe('Shutdown cleans up handoff state', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // -------------------------------------------------------------------------
  // 50. shutdown clears countdown timer
  // -------------------------------------------------------------------------
  test('shutdown clears countdown timer without throwing', () => {
    appState.enterHandoffMode();
    appState.startCountdown(30, 'long goal');

    // shutdown should not throw even with active countdown
    expect(() => appState.shutdown()).not.toThrow();
  });
});
