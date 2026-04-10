// handoff-service.test.ts -- Tests for HandoffService (F17) and
// agent mode per-thread persistence (F15).
//
// Validates: buildSystemPrompt with source thread context,
// followHandoffIfSourceActive worker state checking, lifecycle delegation,
// dispose cleanup, and per-thread agent mode save/restore on switch.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { HandoffService } from '../../src/state/handoff-service';
import { ThreadPool } from '../../src/state/thread-pool';
import { createThreadHandle } from '../../src/state/thread-handle';
import { AppState } from '../../src/state/app-state';
import { SessionState } from '../../src/state/session';
import { PromptHistory } from '../../src/state/history';
import { SessionStore } from '../../src/state/session-store';
import { DEFAULT_HANDOFF_STATE } from '../../src/state/types';
import type { HandoffState, ThreadHandle } from '../../src/state/types';

/** Helper to create a ThreadHandle with default options. */
function makeHandle(id?: `T-${string}`): ThreadHandle {
  return createThreadHandle({
    threadID: id,
    cwd: '/tmp',
    model: 'test',
  });
}

/**
 * Helper to create a minimal AppState for testing.
 * Does NOT wire a real PromptController -- submitPrompt is stubbed.
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

/**
 * Helper to create a standalone HandoffService with mock dependencies.
 */
function makeService(pool?: ThreadPool): {
  service: HandoffService;
  pool: ThreadPool;
  handoffState: HandoffState;
  notifications: number;
} {
  const tp = pool ?? new ThreadPool();
  let handoffState: HandoffState = { ...DEFAULT_HANDOFF_STATE };
  let notifications = 0;

  const service = new HandoffService({
    threadPool: tp,
    getHandoffState: () => handoffState,
    setHandoffState: (s) => { handoffState = s; },
    getActiveThreadID: () => tp.activeThreadContextID,
    getCurrentMode: () => 'smart',
    notifyListeners: () => { notifications++; },
  });

  return {
    service,
    pool: tp,
    get handoffState() { return handoffState; },
    get notifications() { return notifications; },
  };
}

// =============================================================================
// HandoffService -- buildSystemPrompt
// =============================================================================
describe('HandoffService.buildSystemPrompt', () => {
  // ---------------------------------------------------------------------------
  // 1. Includes source thread context when messages exist
  // ---------------------------------------------------------------------------
  test('includes source thread context from session items', async () => {
    const pool = new ThreadPool();
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    // Add a user message to the source thread
    handle.session.startProcessing('Hello from source');

    const { service } = makeService(pool);

    const prompt = service.buildSystemPrompt(handle.threadID, 'Build feature X');

    expect(prompt).toContain('Handoff from thread');
    expect(prompt).toContain(handle.threadID);
    expect(prompt).toContain('Goal: Build feature X');
    expect(prompt).toContain('User:');
  });

  // ---------------------------------------------------------------------------
  // 2. Returns just the goal when source thread not found
  // ---------------------------------------------------------------------------
  test('returns goal when source thread not found', () => {
    const { service } = makeService();

    const prompt = service.buildSystemPrompt('T-nonexistent', 'Build feature X');

    expect(prompt).toBe('Build feature X');
  });

  // ---------------------------------------------------------------------------
  // 3. Returns just the goal when source thread has no messages
  // ---------------------------------------------------------------------------
  test('returns goal when source thread has no messages', async () => {
    const pool = new ThreadPool();
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    const { service } = makeService(pool);

    const prompt = service.buildSystemPrompt(handle.threadID, 'Build feature X');

    // No messages means no context summary, so returns just the goal
    expect(prompt).toBe('Build feature X');
  });
});

// =============================================================================
// HandoffService -- followHandoffIfSourceActive
// =============================================================================
describe('HandoffService.followHandoffIfSourceActive', () => {
  // ---------------------------------------------------------------------------
  // 4. Returns false when worker is idle (default state)
  // ---------------------------------------------------------------------------
  test('returns false when worker is idle', async () => {
    const pool = new ThreadPool();
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    const { service } = makeService(pool);

    const result = service.followHandoffIfSourceActive(handle.threadID);

    expect(result).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Returns true when worker is running
  // ---------------------------------------------------------------------------
  test('returns true when worker is running', async () => {
    const pool = new ThreadPool();
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    // Transition worker to running state
    pool.setWorkerInferenceState(handle.threadID, 'running');

    const { service } = makeService(pool);

    const result = service.followHandoffIfSourceActive(handle.threadID);

    expect(result).toBe(true);
  });
});

// =============================================================================
// HandoffService -- enterHandoffMode / exitHandoffMode lifecycle
// =============================================================================
describe('HandoffService lifecycle', () => {
  // ---------------------------------------------------------------------------
  // 6. enterHandoffMode sets isInHandoffMode
  // ---------------------------------------------------------------------------
  test('enterHandoffMode sets isInHandoffMode to true', () => {
    const ctx = makeService();

    ctx.service.enterHandoffMode();

    expect(ctx.handoffState.isInHandoffMode).toBe(true);
    expect(ctx.notifications).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 7. enterHandoffMode is idempotent
  // ---------------------------------------------------------------------------
  test('enterHandoffMode is idempotent', () => {
    const ctx = makeService();

    ctx.service.enterHandoffMode();
    const countAfter = ctx.notifications;

    ctx.service.enterHandoffMode();
    // Should not notify again
    expect(ctx.notifications).toBe(countAfter);
  });

  // ---------------------------------------------------------------------------
  // 8. exitHandoffMode resets all state to defaults
  // ---------------------------------------------------------------------------
  test('exitHandoffMode resets all state to defaults', () => {
    const ctx = makeService();

    ctx.service.enterHandoffMode();
    ctx.service.exitHandoffMode();

    expect(ctx.handoffState).toEqual(DEFAULT_HANDOFF_STATE);
  });

  // ---------------------------------------------------------------------------
  // 9. exitHandoffMode is a no-op when already in default state
  // ---------------------------------------------------------------------------
  test('exitHandoffMode is a no-op when already in default state', () => {
    const ctx = makeService();
    const countBefore = ctx.notifications;

    ctx.service.exitHandoffMode();

    expect(ctx.notifications).toBe(countBefore);
  });

  // ---------------------------------------------------------------------------
  // 10. abortHandoffConfirmation two-stage works
  // ---------------------------------------------------------------------------
  test('abortHandoffConfirmation: first Escape sets confirming, second exits', () => {
    const ctx = makeService();

    ctx.service.enterHandoffMode();

    ctx.service.abortHandoffConfirmation();
    expect(ctx.handoffState.isConfirmingAbortHandoff).toBe(true);
    expect(ctx.handoffState.isInHandoffMode).toBe(true);

    ctx.service.abortHandoffConfirmation();
    expect(ctx.handoffState.isInHandoffMode).toBe(false);
    expect(ctx.handoffState.isConfirmingAbortHandoff).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 11. dispose clears countdown timer
  // ---------------------------------------------------------------------------
  test('dispose clears countdown timer without throwing', () => {
    const ctx = makeService();

    ctx.service.enterHandoffMode();
    ctx.service.startCountdown(30, 'long goal');
    expect(ctx.handoffState.countdownSeconds).toBe(30);

    expect(() => ctx.service.dispose()).not.toThrow();
  });
});

// =============================================================================
// HandoffService -- submitHandoff
// =============================================================================
describe('HandoffService.submitHandoff', () => {
  // ---------------------------------------------------------------------------
  // 12. submitHandoff creates thread and returns handle
  // ---------------------------------------------------------------------------
  test('submitHandoff creates a new thread and returns handle', async () => {
    const pool = new ThreadPool();
    const initial = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const ctx = makeService(pool);

    ctx.service.enterHandoffMode();
    const handle = await ctx.service.submitHandoff('Build feature X');

    expect(handle).not.toBeNull();
    expect(handle!.threadID).toBeDefined();
    expect(handle!.threadID).not.toBe(initial.threadID);
    // Handoff mode should be fully exited
    expect(ctx.handoffState.isInHandoffMode).toBe(false);
    expect(ctx.handoffState.isGeneratingHandoff).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 13. submitHandoff returns null when not in handoff mode
  // ---------------------------------------------------------------------------
  test('submitHandoff returns null when not in handoff mode', async () => {
    const pool = new ThreadPool();
    await pool.createThread({ cwd: '/tmp', model: 'test' });
    const ctx = makeService(pool);

    const handle = await ctx.service.submitHandoff('should be ignored');

    expect(handle).toBeNull();
  });
});

// =============================================================================
// Agent mode per-thread persistence (F15)
// =============================================================================
describe('Agent mode per-thread (F15)', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = makeAppState();
  });

  // ---------------------------------------------------------------------------
  // 14. switchThread saves current mode to outgoing thread
  // ---------------------------------------------------------------------------
  test('switchThread saves current mode to outgoing thread', async () => {
    // Get original thread ID
    const originalID = appState.threadPool.activeThreadContextID!;

    // Create a second thread (this auto-activates it)
    const h2 = await appState.threadPool.createThread({ cwd: '/tmp', model: 'test' });

    // Switch back to original thread
    appState.switchToThread(originalID);

    // Set current mode to something specific on the original thread
    appState.currentMode = 'code';

    // Switch to h2 -- should save 'code' to the original (outgoing) thread
    appState.switchToThread(h2.threadID);

    // The outgoing (original) thread should have 'code' saved
    const outgoingHandle = appState.threadPool.threadHandleMap.get(originalID);
    expect(outgoingHandle!.agentMode).toBe('code');
  });

  // ---------------------------------------------------------------------------
  // 15. switchThread restores mode from target thread
  // ---------------------------------------------------------------------------
  test('switchThread restores mode from target thread', async () => {
    // Create second thread with different mode
    const h2 = await appState.threadPool.createThread({
      cwd: '/tmp',
      model: 'test',
      agentMode: 'code',
    });
    h2.agentMode = 'code'; // Ensure it is set

    const originalID = appState.threadPool.recentThreadIDs.find(id => id !== h2.threadID)!;
    appState.threadPool.switchThread(originalID);

    // Now switch to h2 -- should restore 'code' mode
    appState.switchToThread(h2.threadID);

    expect(appState.currentMode).toBe('code');
  });

  // ---------------------------------------------------------------------------
  // 16. cycleMode updates active thread handle's agentMode
  // ---------------------------------------------------------------------------
  test('cycleMode updates active thread handle agentMode', () => {
    const initialMode = appState.currentMode;

    appState.cycleMode();

    const activeHandle = appState.threadPool.activeThreadHandleOrNull;
    expect(activeHandle).not.toBeNull();
    expect(activeHandle!.agentMode).toBe(appState.currentMode);
    expect(activeHandle!.agentMode).not.toBe(initialMode);
  });

  // ---------------------------------------------------------------------------
  // 17. new thread inherits current mode
  // ---------------------------------------------------------------------------
  test('new thread inherits current agent mode', async () => {
    appState.currentMode = 'code';

    await appState.newThread();

    const handle = appState.threadPool.activeThreadHandleOrNull;
    expect(handle).not.toBeNull();
    expect(handle!.agentMode).toBe('code');
  });
});
