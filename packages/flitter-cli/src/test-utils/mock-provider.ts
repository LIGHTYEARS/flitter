// Shared MockProvider for unit and integration tests.
//
// Consolidates the MockProvider class that was duplicated across 11+ test files.
// Supports all variants:
// - Basic: yields mockEvents in order
// - Delayed: eventDelay ms between events (for cancellation tests)
// - Erroring: throwOnSend to simulate connection failures
// - Multi-call: callSequences for agentic loop tests (shifts one sequence per call)

import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent, ProviderMessage } from '../state/types';

/**
 * Mock LLM provider for unit and integration tests.
 *
 * Yields a configurable sequence of StreamEvents on each sendPrompt() call.
 * Supports delayed emission, error injection, and per-call event sequences.
 */
export class MockProvider implements Provider {
  readonly id = 'mock' as const;
  readonly name = 'mock';
  readonly model = 'test-model';
  readonly capabilities = {
    vision: true,
    functionCalling: true,
    streaming: true,
    systemPrompt: true,
  };

  /** Pre-configured events to yield on sendPrompt (simple mode). */
  mockEvents: StreamEvent[] = [];

  /** Array of event sequences — each sendPrompt() call shifts one off (multi-call mode). */
  callSequences: StreamEvent[][] = [];

  /** Record of messages passed to each call (for assertion). */
  callHistory: ProviderMessage[][] = [];

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
    messages: Array<{ role: string; content: string }> | ProviderMessage[],
    _options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    if (this.throwOnSend) {
      throw this.throwOnSend;
    }

    this.callHistory.push([...(messages as ProviderMessage[])]);
    this._abort = new AbortController();

    // Multi-call mode: shift one sequence off. Falls back to mockEvents.
    const events = this.callSequences.length > 0
      ? (this.callSequences.shift() ?? [])
      : this.mockEvents;

    for (const event of events) {
      if (this._abort?.signal.aborted) return;
      if (this.eventDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.eventDelay));
      }
      if (this._abort?.signal.aborted) return;
      yield event;
    }
  }
}
