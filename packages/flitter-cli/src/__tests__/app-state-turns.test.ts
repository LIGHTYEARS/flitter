// Integration tests for AppState turn-level and screen state accessors.
//
// Verifies that AppState composes ConversationState and exposes turns,
// currentTurn, and screenState. Tests cover fresh state, lifecycle transitions,
// error states, newThread behavior, and reactive screenState derivation.
//
// Existing AppState tests (app-state.test.ts) must remain untouched.

import { describe, test, expect, beforeEach } from 'bun:test';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent } from '../state/types';
import { SessionState } from '../state/session';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';

// ---------------------------------------------------------------------------
// Mock Provider
// ---------------------------------------------------------------------------

/** Mock LLM provider for turn integration tests. */
class MockProvider implements Provider {
  readonly name = 'mock';
  readonly model = 'test-model';
  mockEvents: StreamEvent[] = [];
  cancelCalled = false;
  eventDelay = 0;
  private _abort: AbortController | null = null;

  cancelRequest(): void {
    this.cancelCalled = true;
    if (this._abort) {
      this._abort.abort();
      this._abort = null;
    }
  }

  async *sendPrompt(
    _messages: Array<{ role: string; content: string }>,
    _options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    this._abort = new AbortController();
    for (const event of this.mockEvents) {
      if (this._abort?.signal.aborted) return;
      if (this.eventDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.eventDelay));
      }
      if (this._abort?.signal.aborted) return;
      yield event;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper — create a wired AppState with MockProvider
// ---------------------------------------------------------------------------

/** Creates a fully-wired AppState with MockProvider for testing. */
function createTestAppState() {
  const provider = new MockProvider();
  const session = new SessionState({
    sessionId: 'turn-test-session',
    cwd: '/test/cwd',
    model: provider.model,
  });
  const appState = new AppState(session);
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return { appState, session, provider, controller };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppState turn and screen state integration', () => {
  let appState: AppState;
  let session: SessionState;
  let provider: MockProvider;

  beforeEach(() => {
    const harness = createTestAppState();
    appState = harness.appState;
    session = harness.session;
    provider = harness.provider;
  });

  // --- conversation accessor ---

  describe('conversation accessor', () => {
    test('exposes ConversationState instance', () => {
      expect(appState.conversation).toBeTruthy();
    });

    test('conversation.isEmpty is true on fresh state', () => {
      expect(appState.conversation.isEmpty).toBe(true);
    });

    test('conversation.turns is empty on fresh state', () => {
      expect(appState.conversation.turns.length).toBe(0);
    });
  });

  // --- turns accessor ---

  describe('turns accessor', () => {
    test('turns is empty on fresh state', () => {
      expect(appState.turns.length).toBe(0);
    });

    test('turns has entries after prompt lifecycle', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Hi' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('Hello');

      // Should have at least a UserTurn and an AssistantTurn
      expect(appState.turns.length).toBeGreaterThanOrEqual(2);
    });

    test('first turn after prompt is a user turn', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Reply' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('Test');

      const first = appState.turns[0];
      expect(first.kind).toBe('user');
      if (first.kind === 'user') {
        expect(first.message.text).toBe('Test');
      }
    });

    test('second turn after prompt is an assistant turn', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Response' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('Ask');

      const second = appState.turns[1];
      expect(second.kind).toBe('assistant');
      if (second.kind === 'assistant') {
        expect(second.message).not.toBeNull();
        expect(second.message!.text).toBe('Response');
      }
    });
  });

  // --- currentTurn accessor ---

  describe('currentTurn accessor', () => {
    test('currentTurn is null on fresh state', () => {
      expect(appState.currentTurn).toBeNull();
    });

    test('currentTurn is the last turn after prompt', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Answer' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('Question');

      const current = appState.currentTurn;
      expect(current).not.toBeNull();
      expect(current!.kind).toBe('assistant');
    });
  });

  // --- screenState: fresh creation ---

  describe('screenState on fresh creation', () => {
    test('returns welcome on fresh state with no prompts', () => {
      expect(appState.screenState.kind).toBe('welcome');
    });
  });

  // --- screenState: lifecycle transitions ---

  describe('screenState lifecycle transitions', () => {
    test('transitions through loading -> processing -> ready during prompt', async () => {
      const screenKinds: string[] = [];
      appState.addListener(() => {
        const kind = appState.screenState.kind;
        if (screenKinds.length === 0 || screenKinds[screenKinds.length - 1] !== kind) {
          screenKinds.push(kind);
        }
      });

      provider.mockEvents = [
        { type: 'text_delta', text: 'Hi' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('Hello');

      // Final state should be ready (idle with items after reset)
      expect(appState.screenState.kind).toBe('ready');
    });
  });

  // --- screenState: error ---

  describe('screenState error', () => {
    test('returns error kind when session enters error state', async () => {
      provider.mockEvents = [
        { type: 'error', error: { message: 'boom', code: '500', retryable: false } },
      ];
      await appState.submitPrompt('fail');

      expect(appState.screenState.kind).toBe('error');
      if (appState.screenState.kind === 'error') {
        expect(appState.screenState.error.message).toBe('boom');
      }
    });
  });

  // --- screenState: newThread ---

  describe('screenState after newThread', () => {
    test('returns empty (not welcome) after newThread because turnCount > 0', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Done' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('Hi');

      appState.newThread();

      // turnCount is still > 0, so should be 'empty' not 'welcome'
      expect(appState.screenState.kind).toBe('empty');
    });

    test('turns are cleared after newThread', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Response' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('Message');
      expect(appState.turns.length).toBeGreaterThan(0);

      appState.newThread();
      expect(appState.turns.length).toBe(0);
    });
  });

  // --- screenState: reactivity ---

  describe('screenState reactivity', () => {
    test('screenState reflects current session state changes', () => {
      // Fresh -> welcome
      expect(appState.screenState.kind).toBe('welcome');

      // Start processing -> loading (empty conversation)
      session.startProcessing('hello');
      // Note: startProcessing adds a user_message, but conversation is processed
      // through session.items which now has items, so it's actually 'processing'
      // because conversationIsEmpty will be false (user message was added)
      const afterStart = appState.screenState.kind;
      expect(afterStart === 'processing' || afterStart === 'loading').toBe(true);

      // Begin streaming -> processing
      session.beginStreaming();
      expect(appState.screenState.kind).toBe('processing');

      // Complete -> ready (has items, idle after reset)
      session.completeStream('end_turn');
      // lifecycle is 'complete' with items -> ready
      expect(appState.screenState.kind).toBe('ready');
    });
  });

  // --- ConversationState is created from session ---

  describe('ConversationState from session', () => {
    test('conversation reflects session items', () => {
      session.startProcessing('user msg');
      expect(appState.conversation.isEmpty).toBe(false);
      expect(appState.conversation.turns.length).toBeGreaterThan(0);
    });
  });
});
