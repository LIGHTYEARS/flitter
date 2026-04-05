// Tests for PromptController — prompt submission, cancellation, and error orchestration.
//
// Uses mock Provider yielding controlled StreamEvent sequences to verify
// the full lifecycle dispatch: submit -> stream -> complete/cancel/error.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent, SessionError } from '../state/types';
import { SessionState } from '../state/session';
import { PromptController } from '../state/prompt-controller';

// ---------------------------------------------------------------------------
// Mock Provider — yields a controlled sequence of StreamEvents
// ---------------------------------------------------------------------------

class MockProvider implements Provider {
  readonly id = 'mock' as const;
  readonly name = 'MockProvider';
  readonly model = 'mock-model';
  readonly capabilities = { vision: true, functionCalling: true, streaming: true, systemPrompt: true };

  /** Pre-configured events to yield on sendPrompt. */
  events: StreamEvent[] = [];

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
    options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    if (this.throwOnSend) {
      throw this.throwOnSend;
    }

    this._abort = new AbortController();
    const signal = options.abortSignal;

    for (const event of this.events) {
      if (signal?.aborted || this._abort?.signal.aborted) return;
      if (this.eventDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.eventDelay));
      }
      if (signal?.aborted || this._abort?.signal.aborted) return;
      yield event;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper — create fresh session + controller per test
// ---------------------------------------------------------------------------

function createTestHarness() {
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/test',
    model: 'mock-model',
  });
  const provider = new MockProvider();
  const controller = new PromptController({ session, provider });
  return { session, provider, controller };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PromptController', () => {
  let harness: ReturnType<typeof createTestHarness>;

  beforeEach(() => {
    harness = createTestHarness();
  });

  // --- Submit Prompt: Full Lifecycle ---

  describe('submitPrompt — full lifecycle', () => {
    test('drives session through processing -> streaming -> complete', async () => {
      const { session, provider, controller } = harness;
      provider.events = [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' world' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await controller.submitPrompt('test prompt');

      expect(session.lifecycle).toBe('complete');
      expect(session.lastStopReason).toBe('end_turn');

      // Check that user message and assistant message are in items
      const items = session.items;
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items[0].type).toBe('user_message');
      if (items[0].type === 'user_message') {
        expect(items[0].text).toBe('test prompt');
      }
      // Assistant message should contain the streamed text
      const assistantMsg = items.find(i => i.type === 'assistant_message');
      expect(assistantMsg).toBeTruthy();
      if (assistantMsg && assistantMsg.type === 'assistant_message') {
        expect(assistantMsg.text).toContain('Hello');
        expect(assistantMsg.text).toContain('world');
      }
    });

    test('dispatches thinking_delta to session.appendThinkingChunk', async () => {
      const { session, provider, controller } = harness;
      provider.events = [
        { type: 'thinking_delta', text: 'Let me think...' },
        { type: 'text_delta', text: 'Answer' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await controller.submitPrompt('deep question');

      const thinkingItem = session.items.find(i => i.type === 'thinking');
      expect(thinkingItem).toBeTruthy();
      if (thinkingItem && thinkingItem.type === 'thinking') {
        expect(thinkingItem.text).toContain('Let me think...');
      }
    });

    test('dispatches tool_call_start and tool_call_end to session', async () => {
      const { session, provider, controller } = harness;
      provider.events = [
        { type: 'tool_call_start', toolCallId: 'tc-1', title: 'readFile', kind: 'tool' },
        { type: 'tool_call_end', toolCallId: 'tc-1', status: 'completed' },
        { type: 'text_delta', text: 'Done' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await controller.submitPrompt('read a file');

      const toolCall = session.items.find(i => i.type === 'tool_call');
      expect(toolCall).toBeTruthy();
      if (toolCall && toolCall.type === 'tool_call') {
        expect(toolCall.toolCallId).toBe('tc-1');
        expect(toolCall.status).toBe('completed');
      }
    });

    test('dispatches usage_update to session.setUsage', async () => {
      const { session, provider, controller } = harness;
      provider.events = [
        { type: 'text_delta', text: 'Hi' },
        { type: 'usage_update', usage: { size: 200000, used: 5000 } },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await controller.submitPrompt('hello');

      expect(session.usage).toBeTruthy();
      expect(session.usage?.size).toBe(200000);
      expect(session.usage?.used).toBe(5000);
    });

    test('calls beginStreaming on first text_delta', async () => {
      const { session, provider, controller } = harness;
      const lifecycles: string[] = [];
      session.addListener(() => lifecycles.push(session.lifecycle));

      provider.events = [
        { type: 'text_delta', text: 'Hi' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await controller.submitPrompt('hello');

      // Lifecycle should have gone through: processing -> streaming -> complete
      expect(lifecycles).toContain('processing');
      expect(lifecycles).toContain('streaming');
      expect(lifecycles).toContain('complete');
    });

    test('calls beginStreaming on first thinking_delta', async () => {
      const { session, provider, controller } = harness;
      const lifecycles: string[] = [];
      session.addListener(() => lifecycles.push(session.lifecycle));

      provider.events = [
        { type: 'thinking_delta', text: 'Hmm' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];

      await controller.submitPrompt('think');

      expect(lifecycles).toContain('streaming');
    });
  });

  // --- Double-Submit Prevention ---

  describe('submitPrompt — double-submit prevention', () => {
    test('is a no-op while already processing', async () => {
      const { session, provider, controller } = harness;
      // First submission will block on event delay
      provider.events = [
        { type: 'text_delta', text: 'slow' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      provider.eventDelay = 50;

      const p1 = controller.submitPrompt('first');

      // Attempt second while first is in-flight — should be no-op
      const p2 = controller.submitPrompt('second');
      await Promise.all([p1, p2]);

      // Only one user message should exist
      const userMessages = session.items.filter(i => i.type === 'user_message');
      expect(userMessages.length).toBe(1);
    });

    test('resets session from terminal state before new submission', async () => {
      const { session, provider, controller } = harness;

      // First: complete successfully
      provider.events = [
        { type: 'text_delta', text: 'first' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await controller.submitPrompt('hello');
      expect(session.lifecycle).toBe('complete');

      // Second: should auto-reset and proceed
      provider.events = [
        { type: 'text_delta', text: 'second' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await controller.submitPrompt('again');
      expect(session.lifecycle).toBe('complete');

      // Two user messages
      const userMessages = session.items.filter(i => i.type === 'user_message');
      expect(userMessages.length).toBe(2);
    });
  });

  // --- Cancellation ---

  describe('cancel', () => {
    test('aborts provider and transitions session to cancelled', async () => {
      const { session, provider, controller } = harness;
      provider.events = [
        { type: 'text_delta', text: 'start...' },
        { type: 'text_delta', text: 'more...' },
        { type: 'text_delta', text: 'even more...' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      provider.eventDelay = 50;

      const submitPromise = controller.submitPrompt('long task');

      // Cancel after a short delay
      await new Promise(resolve => setTimeout(resolve, 30));
      controller.cancel();

      await submitPromise;

      expect(provider.cancelCalled).toBe(true);
      expect(session.lifecycle).toBe('cancelled');
    });

    test('is a no-op when not processing', () => {
      const { session, provider, controller } = harness;
      controller.cancel();
      expect(provider.cancelCalled).toBe(false);
      expect(session.lifecycle).toBe('idle');
    });
  });

  // --- Error Handling ---

  describe('error handling', () => {
    test('stream error event routes to session.handleError', async () => {
      const { session, provider, controller } = harness;
      const sessionError: SessionError = {
        message: 'Rate limited',
        code: 'HTTP_429',
        retryable: true,
      };
      provider.events = [
        { type: 'text_delta', text: 'partial' },
        { type: 'error', error: sessionError },
      ];

      await controller.submitPrompt('hello');

      expect(session.lifecycle).toBe('error');
      expect(session.error).toBeTruthy();
      expect(session.error?.message).toBe('Rate limited');
      expect(session.error?.retryable).toBe(true);
    });

    test('provider exception routes to session.handleError', async () => {
      const { session, provider, controller } = harness;
      provider.throwOnSend = new Error('Network failure');

      await controller.submitPrompt('hello');

      expect(session.lifecycle).toBe('error');
      expect(session.error).toBeTruthy();
      expect(session.error?.message).toContain('Network failure');
    });
  });

  // --- Message Building ---

  describe('message building', () => {
    test('builds messages from conversation items for provider', async () => {
      const { session, provider, controller } = harness;

      // Complete a first turn
      provider.events = [
        { type: 'text_delta', text: 'Hi there!' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await controller.submitPrompt('hello');

      // Capture what the provider receives on the second turn
      let capturedMessages: Array<{ role: string; content: string }> = [];
      const origSend = provider.sendPrompt.bind(provider);
      provider.sendPrompt = async function*(messages, options) {
        capturedMessages = messages;
        yield* origSend(messages, options);
      };

      provider.events = [
        { type: 'text_delta', text: 'Fine!' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ];
      await controller.submitPrompt('how are you?');

      // Should include previous turns
      expect(capturedMessages.length).toBeGreaterThanOrEqual(2);
      expect(capturedMessages[0]).toEqual({ role: 'user', content: 'hello' });
      expect(capturedMessages[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });
  });
});
