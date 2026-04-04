// Unit tests for AppState — composition, computed properties, UI state, and listener management.
//
// Tests that AppState correctly delegates to SessionState for lifecycle,
// items, metadata, and error state, while independently managing UI-specific
// concerns like dense view, message selection, and listener relay.

import { describe, test, expect, beforeEach } from 'bun:test';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent } from '../state/types';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';

// ---------------------------------------------------------------------------
// Mock Provider — minimal implementation for unit tests
// ---------------------------------------------------------------------------

/** Mock LLM provider yielding a configurable sequence of StreamEvents. */
class MockProvider implements Provider {
  readonly name = 'mock';
  readonly model = 'test-model';

  /** Pre-configured events to yield on sendPrompt. */
  mockEvents: StreamEvent[] = [];

  /** Tracks whether cancelRequest was called. */
  cancelCalled = false;

  cancelRequest(): void {
    this.cancelCalled = true;
  }

  async *sendPrompt(
    _messages: Array<{ role: string; content: string }>,
    _options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    for (const event of this.mockEvents) {
      yield event;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper — create a wired AppState with MockProvider
// ---------------------------------------------------------------------------

/** Creates a fully-wired AppState with MockProvider for unit testing. */
function createTestAppState(opts?: { cwd?: string }) {
  const provider = new MockProvider();
  const session = new SessionState({
    sessionId: 'test-session-id',
    cwd: opts?.cwd ?? '/test/cwd',
    model: provider.model,
  });
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return { appState, session, provider, controller };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppState', () => {
  let appState: AppState;
  let session: SessionState;
  let provider: MockProvider;

  beforeEach(() => {
    const harness = createTestAppState();
    appState = harness.appState;
    session = harness.session;
    provider = harness.provider;
  });

  // --- Factory: AppState.create() ---

  describe('AppState.create()', () => {
    test('creates an AppState with lifecycle idle', () => {
      const created = AppState.create({ cwd: '/factory/test', provider: new MockProvider() });
      expect(created.lifecycle).toBe('idle');
    });

    test('metadata has non-empty sessionId', () => {
      const created = AppState.create({ cwd: '/factory/test', provider: new MockProvider() });
      expect(created.metadata.sessionId).toBeTruthy();
      expect(typeof created.metadata.sessionId).toBe('string');
      expect(created.metadata.sessionId.length).toBeGreaterThan(0);
    });

    test('metadata.cwd matches input', () => {
      const created = AppState.create({ cwd: '/my/project', provider: new MockProvider() });
      expect(created.metadata.cwd).toBe('/my/project');
    });

    test('metadata.model comes from provider', () => {
      const p = new MockProvider();
      const created = AppState.create({ cwd: '/test', provider: p });
      expect(created.metadata.model).toBe('test-model');
    });

    test('turnCount starts at 0', () => {
      const created = AppState.create({ cwd: '/test', provider: new MockProvider() });
      expect(created.metadata.turnCount).toBe(0);
    });
  });

  // --- Computed property delegation ---

  describe('computed property delegation', () => {
    test('isProcessing is false when idle', () => {
      expect(appState.isProcessing).toBe(false);
    });

    test('isProcessing is true when processing', () => {
      session.startProcessing('test');
      expect(appState.isProcessing).toBe(true);
    });

    test('isProcessing is true when streaming', () => {
      session.startProcessing('test');
      session.beginStreaming();
      expect(appState.isProcessing).toBe(true);
    });

    test('isStreaming is false when idle', () => {
      expect(appState.isStreaming).toBe(false);
    });

    test('isStreaming is false when processing', () => {
      session.startProcessing('test');
      expect(appState.isStreaming).toBe(false);
    });

    test('isStreaming is true when streaming', () => {
      session.startProcessing('test');
      session.beginStreaming();
      expect(appState.isStreaming).toBe(true);
    });

    test('lifecycle matches session.lifecycle', () => {
      expect(appState.lifecycle).toBe(session.lifecycle);
      session.startProcessing('test');
      expect(appState.lifecycle).toBe('processing');
      session.beginStreaming();
      expect(appState.lifecycle).toBe('streaming');
      session.completeStream('end_turn');
      expect(appState.lifecycle).toBe('complete');
    });

    test('error is null when no error', () => {
      expect(appState.error).toBeNull();
    });

    test('error returns SessionError when in error state', () => {
      session.startProcessing('test');
      session.handleError({ message: 'bad', code: '500', retryable: true });
      expect(appState.error).not.toBeNull();
      expect(appState.error?.message).toBe('bad');
      expect(appState.error?.code).toBe('500');
      expect(appState.error?.retryable).toBe(true);
    });

    test('items starts empty', () => {
      expect(appState.items.length).toBe(0);
    });

    test('items grows after user message', () => {
      session.startProcessing('hello');
      expect(appState.items.length).toBe(1);
      expect(appState.items[0].type).toBe('user_message');
    });

    test('usage delegates to session.usage', () => {
      expect(appState.usage).toBeNull();
      session.setUsage({ size: 100000, used: 5000 });
      expect(appState.usage).not.toBeNull();
      expect(appState.usage?.size).toBe(100000);
      expect(appState.usage?.used).toBe(5000);
    });

    test('metadata delegates to session.metadata', () => {
      expect(appState.metadata.sessionId).toBe('test-session-id');
      expect(appState.metadata.cwd).toBe('/test/cwd');
      expect(appState.metadata.model).toBe('test-model');
    });
  });

  // --- UI-specific state ---

  describe('UI-specific state', () => {
    test('denseView defaults to false', () => {
      expect(appState.denseView).toBe(false);
    });

    test('toggleDenseView() flips denseView', () => {
      appState.toggleDenseView();
      expect(appState.denseView).toBe(true);
      appState.toggleDenseView();
      expect(appState.denseView).toBe(false);
    });

    test('selectedMessageIndex defaults to null', () => {
      expect(appState.selectedMessageIndex).toBeNull();
    });

    test('newThread() clears items', () => {
      session.startProcessing('msg');
      session.appendAssistantChunk('reply');
      session.beginStreaming();
      session.completeStream('end_turn');
      expect(appState.items.length).toBeGreaterThan(0);

      appState.newThread();
      expect(appState.items.length).toBe(0);
    });

    test('newThread() keeps sessionId unchanged', () => {
      const originalId = appState.metadata.sessionId;
      session.startProcessing('msg');
      session.beginStreaming();
      session.completeStream('end_turn');

      appState.newThread();
      expect(appState.metadata.sessionId).toBe(originalId);
    });

    test('newThread() resets lifecycle to idle', () => {
      session.startProcessing('msg');
      session.beginStreaming();
      session.completeStream('end_turn');
      expect(appState.lifecycle).toBe('complete');

      appState.newThread();
      expect(appState.lifecycle).toBe('idle');
    });

    test('newThread() clears selectedMessageIndex and currentMode', () => {
      appState.selectedMessageIndex = 2;
      appState.currentMode = 'code';
      appState.newThread();
      expect(appState.selectedMessageIndex).toBeNull();
      expect(appState.currentMode).toBeNull();
    });
  });

  // --- Listener management ---

  describe('listener management', () => {
    test('addListener callback fires on state changes', () => {
      let callCount = 0;
      appState.addListener(() => { callCount++; });

      // Trigger a session state change
      session.startProcessing('test');
      expect(callCount).toBeGreaterThan(0);
    });

    test('removeListener stops notifications', () => {
      let callCount = 0;
      const listener = () => { callCount++; };
      appState.addListener(listener);

      session.startProcessing('test');
      const countAfterFirst = callCount;

      appState.removeListener(listener);
      session.beginStreaming();
      expect(callCount).toBe(countAfterFirst);
    });

    test('multiple listeners all fire', () => {
      let countA = 0;
      let countB = 0;
      appState.addListener(() => { countA++; });
      appState.addListener(() => { countB++; });

      session.startProcessing('test');
      expect(countA).toBeGreaterThan(0);
      expect(countB).toBeGreaterThan(0);
    });

    test('toggleDenseView notifies listeners', () => {
      let called = false;
      appState.addListener(() => { called = true; });
      appState.toggleDenseView();
      expect(called).toBe(true);
    });

    test('newThread notifies listeners', () => {
      let callCount = 0;
      appState.addListener(() => { callCount++; });
      appState.newThread();
      // newThread triggers session.newThread (session listener fires) + _notifyListeners
      expect(callCount).toBeGreaterThan(0);
    });
  });

  // --- isInterrupted ---

  describe('isInterrupted', () => {
    test('is false after end_turn completion', () => {
      session.startProcessing('test');
      session.beginStreaming();
      session.completeStream('end_turn');
      expect(appState.isInterrupted).toBe(false);
    });

    test('is true after non-end_turn stop reason in complete state', () => {
      session.startProcessing('test');
      session.beginStreaming();
      session.completeStream('max_tokens');
      expect(appState.isInterrupted).toBe(true);
    });

    test('is false when idle with no previous stop reason', () => {
      expect(appState.isInterrupted).toBe(false);
    });
  });

  // --- clearError ---

  describe('clearError', () => {
    test('resets from error state back to idle', () => {
      session.startProcessing('test');
      session.handleError({ message: 'fail', code: null, retryable: false });
      expect(appState.lifecycle).toBe('error');

      appState.clearError();
      expect(appState.lifecycle).toBe('idle');
      expect(appState.error).toBeNull();
    });
  });

  // --- promptController access ---

  describe('promptController access', () => {
    test('throws if promptController not set', () => {
      const session = new SessionState({ sessionId: 'x', cwd: '/x', model: 'm' });
      const bareAppState = new AppState(session, new PromptHistory(), new SessionStore());
      expect(() => bareAppState.promptController).toThrow();
    });

    test('returns controller after setPromptController', () => {
      // appState from beforeEach already has controller set
      expect(() => appState.promptController).not.toThrow();
    });
  });
});
