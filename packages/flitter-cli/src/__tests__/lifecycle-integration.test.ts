// Integration tests for the full session lifecycle — exercises AppState,
// PromptController, SessionState, and a mock Provider together.
//
// Verifies the complete behavioral contract: happy path, thinking, tool calls,
// cancellation, error propagation, exceptions, double-submit prevention,
// terminal-state recovery, metadata accuracy, listener ordering, and newThread.

import { describe, test, expect, beforeEach } from 'bun:test';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent, AssistantMessage, ThinkingItem, ToolCallItem } from '../state/types';
import { AppState } from '../state/app-state';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { PromptController } from '../state/prompt-controller';

// ---------------------------------------------------------------------------
// Mock Provider — shared helper for all integration tests
// ---------------------------------------------------------------------------

/**
 * Mock LLM provider that yields a configurable sequence of StreamEvents.
 * Supports delayed event emission for testing cancellation timing.
 */
class MockProvider implements Provider {
  readonly name = 'mock';
  readonly model = 'test-model';

  /** Pre-configured events to yield on sendPrompt. */
  mockEvents: StreamEvent[] = [];

  /** Tracks whether cancelRequest was called. */
  cancelCalled = false;

  /** Optional delay (ms) between events for testing cancellation timing. */
  eventDelay = 0;

  /** If set, sendPrompt will throw this error instead of yielding events. */
  throwOnSend: Error | null = null;

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
    if (this.throwOnSend) {
      throw this.throwOnSend;
    }

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
// Helper — create fully-wired AppState for integration testing
// ---------------------------------------------------------------------------

/** Creates a fully-wired AppState with MockProvider for integration testing. */
function createIntegrationHarness() {
  const provider = new MockProvider();
  const session = new SessionState({
    sessionId: 'integration-session',
    cwd: '/integration/test',
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

describe('Lifecycle Integration', () => {
  let appState: AppState;
  let provider: MockProvider;

  beforeEach(() => {
    const harness = createIntegrationHarness();
    appState = harness.appState;
    provider = harness.provider;
  });

  // --- Happy path: complete prompt lifecycle ---

  describe('happy path — complete prompt lifecycle', () => {
    test('drives lifecycle idle -> processing -> streaming -> complete', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' world' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      expect(appState.lifecycle).toBe('idle');

      await appState.submitPrompt('Hi');

      expect(appState.lifecycle).toBe('complete');
    });

    test('items contain user_message and finalized assistant_message', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' world' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('Hi');

      const items = appState.items;
      expect(items.length).toBe(2);
      expect(items[0].type).toBe('user_message');
      if (items[0].type === 'user_message') {
        expect(items[0].text).toBe('Hi');
      }
      expect(items[1].type).toBe('assistant_message');
      if (items[1].type === 'assistant_message') {
        expect(items[1].text).toBe('Hello world');
        expect(items[1].isStreaming).toBe(false);
      }
    });

    test('turnCount is 1 after one prompt', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Hi' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('Hello');
      expect(appState.metadata.turnCount).toBe(1);
    });

    test('lastStopReason is end_turn', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Done' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('test');
      expect(appState.session.lastStopReason).toBe('end_turn');
    });

    test('isInterrupted is false after end_turn', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'Ok' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('check');
      expect(appState.isInterrupted).toBe(false);
    });
  });

  // --- Thinking + text stream ---

  describe('thinking + text stream', () => {
    test('items contain thinking item and assistant message', async () => {
      provider.mockEvents = [
        { type: 'thinking_delta', text: 'Let me think' },
        { type: 'text_delta', text: 'Response' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('deep question');

      const items = appState.items;
      // user_message + thinking + assistant_message
      expect(items.length).toBe(3);

      const thinkingItem = items.find(i => i.type === 'thinking') as ThinkingItem | undefined;
      expect(thinkingItem).toBeTruthy();
      expect(thinkingItem!.text).toContain('Let me think');
      expect(thinkingItem!.isStreaming).toBe(false);

      const assistantItem = items.find(i => i.type === 'assistant_message') as AssistantMessage | undefined;
      expect(assistantItem).toBeTruthy();
      expect(assistantItem!.text).toBe('Response');
    });
  });

  // --- Tool call lifecycle ---

  describe('tool call lifecycle', () => {
    test('tool call item exists with correct status after completion', async () => {
      provider.mockEvents = [
        { type: 'tool_call_start', toolCallId: 'tc-1', title: 'readFile', kind: 'tool' },
        { type: 'tool_call_end', toolCallId: 'tc-1', status: 'completed' },
        { type: 'text_delta', text: 'Done' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('read a file');

      const toolItem = appState.items.find(i => i.type === 'tool_call') as ToolCallItem | undefined;
      expect(toolItem).toBeTruthy();
      expect(toolItem!.toolCallId).toBe('tc-1');
      expect(toolItem!.title).toBe('readFile');
      expect(toolItem!.status).toBe('completed');
    });

    test('failed tool call has failed status', async () => {
      provider.mockEvents = [
        { type: 'tool_call_start', toolCallId: 'tc-fail', title: 'dangerousOp', kind: 'tool' },
        { type: 'tool_call_end', toolCallId: 'tc-fail', status: 'failed' },
        { type: 'text_delta', text: 'Sorry' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('do something');

      const toolItem = appState.items.find(i => i.type === 'tool_call') as ToolCallItem | undefined;
      expect(toolItem).toBeTruthy();
      expect(toolItem!.status).toBe('failed');
    });
  });

  // --- Cancellation mid-stream ---

  describe('cancellation mid-stream', () => {
    test('lifecycle transitions to cancelled and provider.cancelRequest called', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'start' },
        { type: 'text_delta', text: ' more' },
        { type: 'text_delta', text: ' even more' },
        { type: 'text_delta', text: ' still going' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      provider.eventDelay = 50;

      const submitPromise = appState.submitPrompt('long task');

      // Wait for streaming to begin, then cancel
      await new Promise(resolve => setTimeout(resolve, 30));
      appState.cancelPrompt();

      await submitPromise;

      expect(appState.lifecycle).toBe('cancelled');
      expect(provider.cancelCalled).toBe(true);
    });

    test('partial assistant message is finalized after cancel', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'partial' },
        { type: 'text_delta', text: ' content' },
        { type: 'text_delta', text: ' more' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      provider.eventDelay = 50;

      const submitPromise = appState.submitPrompt('cancel me');

      await new Promise(resolve => setTimeout(resolve, 80));
      appState.cancelPrompt();

      await submitPromise;

      const assistantMsg = appState.items.find(i => i.type === 'assistant_message') as AssistantMessage | undefined;
      if (assistantMsg) {
        // The message should be finalized (isStreaming=false) even if partial
        expect(assistantMsg.isStreaming).toBe(false);
      }
    });
  });

  // --- Provider error propagation ---

  describe('provider error propagation', () => {
    test('stream error event transitions to error state with correct info', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'partial' },
        { type: 'error', error: { message: 'rate limited', code: '429', retryable: true } },
      ];

      await appState.submitPrompt('hello');

      expect(appState.lifecycle).toBe('error');
      expect(appState.error).not.toBeNull();
      expect(appState.error!.message).toBe('rate limited');
      expect(appState.error!.retryable).toBe(true);
    });

    test('partial assistant text is finalized on error', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'partial text' },
        { type: 'error', error: { message: 'fail', code: null, retryable: false } },
      ];

      await appState.submitPrompt('hello');

      const assistantMsg = appState.items.find(i => i.type === 'assistant_message') as AssistantMessage | undefined;
      expect(assistantMsg).toBeTruthy();
      expect(assistantMsg!.text).toContain('partial text');
      expect(assistantMsg!.isStreaming).toBe(false);
    });
  });

  // --- Provider exception propagation ---

  describe('provider exception propagation', () => {
    test('thrown error transitions to error state with message', async () => {
      provider.throwOnSend = new Error('Connection refused');

      await appState.submitPrompt('hello');

      expect(appState.lifecycle).toBe('error');
      expect(appState.error).not.toBeNull();
      expect(appState.error!.message).toContain('Connection refused');
    });

    test('non-Error throw is converted to string', async () => {
      provider.throwOnSend = { message: 'not a real Error' } as Error;
      // Override sendPrompt to throw a string
      const origSend = provider.sendPrompt.bind(provider);
      provider.sendPrompt = async function*() {
        throw 'string error';
      };

      await appState.submitPrompt('hello');

      expect(appState.lifecycle).toBe('error');
      expect(appState.error!.message).toContain('string error');
    });
  });

  // --- Double-submit prevention ---

  describe('double-submit prevention', () => {
    test('only one user message is added when double-submitting', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'slow' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      provider.eventDelay = 50;

      const p1 = appState.submitPrompt('first');
      const p2 = appState.submitPrompt('second');
      await Promise.all([p1, p2]);

      const userMessages = appState.items.filter(i => i.type === 'user_message');
      expect(userMessages.length).toBe(1);
    });
  });

  // --- Recovery from terminal states ---

  describe('recovery from terminal states', () => {
    test('complete -> new submit auto-resets and processes', async () => {
      // First prompt: complete
      provider.mockEvents = [
        { type: 'text_delta', text: 'first' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('hello');
      expect(appState.lifecycle).toBe('complete');

      // Second prompt: should auto-reset
      provider.mockEvents = [
        { type: 'text_delta', text: 'second' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('again');
      expect(appState.lifecycle).toBe('complete');

      // Two user messages should exist
      const userMessages = appState.items.filter(i => i.type === 'user_message');
      expect(userMessages.length).toBe(2);
    });

    test('turnCount increments to 2 on recovery submit', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'a' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('one');
      expect(appState.metadata.turnCount).toBe(1);

      provider.mockEvents = [
        { type: 'text_delta', text: 'b' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('two');
      expect(appState.metadata.turnCount).toBe(2);
    });

    test('error -> new submit auto-resets and processes', async () => {
      // First prompt: error
      provider.mockEvents = [
        { type: 'error', error: { message: 'fail', code: null, retryable: false } },
      ];
      await appState.submitPrompt('oops');
      expect(appState.lifecycle).toBe('error');

      // Second prompt: should auto-reset
      provider.mockEvents = [
        { type: 'text_delta', text: 'recovered' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('retry');
      expect(appState.lifecycle).toBe('complete');
    });

    test('cancelled -> new submit auto-resets and processes', async () => {
      // First prompt: cancel mid-stream
      provider.mockEvents = [
        { type: 'text_delta', text: 'start' },
        { type: 'text_delta', text: ' more' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      provider.eventDelay = 50;
      const p1 = appState.submitPrompt('cancel me');
      await new Promise(resolve => setTimeout(resolve, 30));
      appState.cancelPrompt();
      await p1;
      expect(appState.lifecycle).toBe('cancelled');

      // Second prompt: should auto-reset
      provider.eventDelay = 0;
      provider.cancelCalled = false;
      provider.mockEvents = [
        { type: 'text_delta', text: 'back' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('after cancel');
      expect(appState.lifecycle).toBe('complete');
    });
  });

  // --- Session metadata accuracy ---

  describe('session metadata accuracy', () => {
    test('turnCount increments correctly across multiple prompts', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'one' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('first');
      expect(appState.metadata.turnCount).toBe(1);

      provider.mockEvents = [
        { type: 'text_delta', text: 'two' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('second');
      expect(appState.metadata.turnCount).toBe(2);
    });

    test('sessionId is unchanged between turns', async () => {
      const originalId = appState.metadata.sessionId;

      provider.mockEvents = [
        { type: 'text_delta', text: 'a' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('first');
      expect(appState.metadata.sessionId).toBe(originalId);

      provider.mockEvents = [
        { type: 'text_delta', text: 'b' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('second');
      expect(appState.metadata.sessionId).toBe(originalId);
    });
  });

  // --- Listener notification ordering ---

  describe('listener notification ordering', () => {
    test('listener captures transitions in order: processing, streaming, complete', async () => {
      const lifecycles: string[] = [];
      appState.addListener(() => {
        const current = appState.lifecycle;
        // Only record transitions (avoid duplicates from multiple notifications per state)
        if (lifecycles.length === 0 || lifecycles[lifecycles.length - 1] !== current) {
          lifecycles.push(current);
        }
      });

      provider.mockEvents = [
        { type: 'text_delta', text: 'hi' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('test');

      expect(lifecycles).toContain('processing');
      expect(lifecycles).toContain('streaming');
      expect(lifecycles).toContain('complete');

      // Verify ordering: processing before streaming before complete
      const procIdx = lifecycles.indexOf('processing');
      const streamIdx = lifecycles.indexOf('streaming');
      const completeIdx = lifecycles.indexOf('complete');
      expect(procIdx).toBeLessThan(streamIdx);
      expect(streamIdx).toBeLessThan(completeIdx);
    });

    test('listener fires for error transitions', async () => {
      const lifecycles: string[] = [];
      appState.addListener(() => {
        const current = appState.lifecycle;
        if (lifecycles.length === 0 || lifecycles[lifecycles.length - 1] !== current) {
          lifecycles.push(current);
        }
      });

      provider.mockEvents = [
        { type: 'text_delta', text: 'partial' },
        { type: 'error', error: { message: 'boom', code: null, retryable: false } },
      ];

      await appState.submitPrompt('test');

      expect(lifecycles).toContain('processing');
      expect(lifecycles).toContain('streaming');
      expect(lifecycles).toContain('error');
    });
  });

  // --- newThread() resets conversation ---

  describe('newThread() resets conversation', () => {
    test('clears items to empty', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'response' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('hello');
      expect(appState.items.length).toBeGreaterThan(0);

      appState.newThread();
      expect(appState.items.length).toBe(0);
    });

    test('resets lifecycle to idle', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'done' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('test');
      expect(appState.lifecycle).toBe('complete');

      appState.newThread();
      expect(appState.lifecycle).toBe('idle');
    });

    test('preserves sessionId', async () => {
      const originalId = appState.metadata.sessionId;

      provider.mockEvents = [
        { type: 'text_delta', text: 'hi' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('test');

      appState.newThread();
      expect(appState.metadata.sessionId).toBe(originalId);
    });

    test('allows new prompt submission after newThread', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'first' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('hello');

      appState.newThread();

      provider.mockEvents = [
        { type: 'text_delta', text: 'fresh' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await appState.submitPrompt('new thread prompt');
      expect(appState.lifecycle).toBe('complete');

      // Should only have the new prompt's items
      const userMessages = appState.items.filter(i => i.type === 'user_message');
      expect(userMessages.length).toBe(1);
    });
  });

  // --- Usage tracking through lifecycle ---

  describe('usage tracking', () => {
    test('usage_update event is reflected in appState.usage', async () => {
      provider.mockEvents = [
        { type: 'text_delta', text: 'hi' },
        { type: 'usage_update', usage: { size: 200000, used: 1500, cost: { amount: 0.003, currency: '$' } } },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await appState.submitPrompt('check usage');

      expect(appState.usage).not.toBeNull();
      expect(appState.usage!.size).toBe(200000);
      expect(appState.usage!.used).toBe(1500);
      expect(appState.usage!.cost).toEqual({ amount: 0.003, currency: '$' });
    });
  });
});
