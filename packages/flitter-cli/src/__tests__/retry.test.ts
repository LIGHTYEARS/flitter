// Tests for retry policy — exponential backoff, jitter, retryable error detection,
// and integration with PromptController for automatic retry of transient errors.

import { describe, test, expect } from 'bun:test';
import {
  computeDelay,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
} from '../provider/retry';
import type { RetryConfig } from '../provider/retry';
import type { SessionError, StreamEvent } from '../state/types';
import type { Provider, PromptOptions } from '../provider/provider';
import { SessionState } from '../state/session';
import { PromptController } from '../state/prompt-controller';

// ---------------------------------------------------------------------------
// Unit Tests — computeDelay
// ---------------------------------------------------------------------------

describe('computeDelay', () => {
  const config: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitterFactor: 0, // zero jitter for deterministic tests
    retryableStatusCodes: [429, 500, 502, 503, 504],
  };

  test('returns increasing delays for successive attempts', () => {
    const d0 = computeDelay(0, config); // 1000 * 2^0 = 1000
    const d1 = computeDelay(1, config); // 1000 * 2^1 = 2000
    const d2 = computeDelay(2, config); // 1000 * 2^2 = 4000

    expect(d0).toBe(1000);
    expect(d1).toBe(2000);
    expect(d2).toBe(4000);
    expect(d1).toBeGreaterThan(d0);
    expect(d2).toBeGreaterThan(d1);
  });

  test('caps delay at maxDelayMs', () => {
    const smallMaxConfig: RetryConfig = { ...config, maxDelayMs: 3000 };

    const d0 = computeDelay(0, smallMaxConfig); // 1000 -> 1000 (under cap)
    const d5 = computeDelay(5, smallMaxConfig); // 1000 * 32 = 32000 -> 3000 (capped)

    expect(d0).toBe(1000);
    expect(d5).toBe(3000);
  });

  test('applies jitter within expected range', () => {
    const jitterConfig: RetryConfig = { ...config, jitterFactor: 0.3 };

    // Run many iterations to verify jitter stays within bounds
    for (let i = 0; i < 100; i++) {
      const delay = computeDelay(0, jitterConfig);
      // Base = 1000, jitter in [0, 0.3 * 1000] = [0, 300]
      // So delay should be in [1000, 1300]
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1300);
    }
  });

  test('uses DEFAULT_RETRY_CONFIG when no config provided', () => {
    const delay = computeDelay(0);
    // Default: baseDelay=1000, jitter up to 0.3*1000=300
    // So delay is in [1000, 1300]
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1300);
  });
});

// ---------------------------------------------------------------------------
// Unit Tests — isRetryableError
// ---------------------------------------------------------------------------

describe('isRetryableError', () => {
  test('returns true for retryable errors', () => {
    const error: SessionError = {
      message: 'Rate limited',
      code: 'HTTP_429',
      retryable: true,
    };
    expect(isRetryableError(error)).toBe(true);
  });

  test('returns true for server errors marked retryable', () => {
    const error: SessionError = {
      message: 'Internal server error',
      code: 'HTTP_500',
      retryable: true,
    };
    expect(isRetryableError(error)).toBe(true);
  });

  test('returns false for non-retryable errors', () => {
    const error: SessionError = {
      message: 'Invalid API key',
      code: 'AUTH_ERROR',
      retryable: false,
    };
    expect(isRetryableError(error)).toBe(false);
  });

  test('returns false when retryable is explicitly false', () => {
    const error: SessionError = {
      message: 'Bad request',
      code: 'HTTP_400',
      retryable: false,
    };
    expect(isRetryableError(error)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mock Provider for integration tests
// ---------------------------------------------------------------------------

class RetryMockProvider implements Provider {
  readonly id = 'mock' as const;
  readonly name = 'RetryMockProvider';
  readonly model = 'mock-model';
  readonly capabilities = { vision: true, functionCalling: true, streaming: true, systemPrompt: true };

  /**
   * Array of event sequences — each element is the events for one attempt.
   * The provider shifts the first element on each sendPrompt call.
   */
  eventSequences: StreamEvent[][] = [];

  /** Tracks how many times sendPrompt was called. */
  sendCount = 0;

  cancelCalled = false;

  cancelRequest(): void {
    this.cancelCalled = true;
  }

  async *sendPrompt(
    _messages: Array<{ role: string; content: string }>,
    _options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    this.sendCount++;
    const events = this.eventSequences.shift() ?? [];
    for (const event of events) {
      yield event;
    }
  }
}

function createRetryTestHarness() {
  const session = new SessionState({
    sessionId: 'retry-test',
    cwd: '/test',
    model: 'mock-model',
  });
  const provider = new RetryMockProvider();
  const controller = new PromptController({ session, provider });
  return { session, provider, controller };
}

// ---------------------------------------------------------------------------
// Integration Tests — retry in PromptController
// ---------------------------------------------------------------------------

describe('PromptController retry integration', () => {
  test('retries on retryable error before streaming begins and succeeds', async () => {
    const { session, provider, controller } = createRetryTestHarness();

    // First attempt: retryable error before any content
    // Second attempt: retryable error before any content
    // Third attempt: success
    provider.eventSequences = [
      [
        { type: 'error', error: { message: 'Rate limited', code: 'HTTP_429', retryable: true } },
      ],
      [
        { type: 'error', error: { message: 'Server error', code: 'HTTP_500', retryable: true } },
      ],
      [
        { type: 'text_delta', text: 'Hello after retry' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ],
    ];

    await controller.submitPrompt('test retry');

    expect(provider.sendCount).toBe(3);
    expect(session.lifecycle).toBe('complete');

    const assistantMsg = session.items.find(i => i.type === 'assistant_message');
    expect(assistantMsg).toBeTruthy();
    if (assistantMsg && assistantMsg.type === 'assistant_message') {
      expect(assistantMsg.text).toContain('Hello after retry');
    }
  });

  test('does not retry non-retryable errors', async () => {
    const { session, provider, controller } = createRetryTestHarness();

    provider.eventSequences = [
      [
        { type: 'error', error: { message: 'Bad API key', code: 'AUTH_ERROR', retryable: false } },
      ],
      // This should never be reached
      [
        { type: 'text_delta', text: 'Should not reach here' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ],
    ];

    await controller.submitPrompt('test no retry');

    expect(provider.sendCount).toBe(1);
    expect(session.lifecycle).toBe('error');
    expect(session.error?.message).toBe('Bad API key');
  });

  test('does not retry after streaming has begun delivering content', async () => {
    const { session, provider, controller } = createRetryTestHarness();

    provider.eventSequences = [
      [
        { type: 'text_delta', text: 'partial content' },
        { type: 'error', error: { message: 'Connection lost', code: 'HTTP_502', retryable: true } },
      ],
      // This should never be reached because streaming already began
      [
        { type: 'text_delta', text: 'Should not reach here' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ],
    ];

    await controller.submitPrompt('test no retry after streaming');

    expect(provider.sendCount).toBe(1);
    expect(session.lifecycle).toBe('error');
    expect(session.error?.message).toBe('Connection lost');
  });

  test('exhausts all retry attempts then surfaces the error', async () => {
    const { session, provider, controller } = createRetryTestHarness();

    // All 3 attempts fail with retryable errors
    provider.eventSequences = [
      [
        { type: 'error', error: { message: 'Rate limited 1', code: 'HTTP_429', retryable: true } },
      ],
      [
        { type: 'error', error: { message: 'Rate limited 2', code: 'HTTP_429', retryable: true } },
      ],
      [
        { type: 'error', error: { message: 'Rate limited 3', code: 'HTTP_429', retryable: true } },
      ],
    ];

    await controller.submitPrompt('test exhaust retries');

    expect(provider.sendCount).toBe(3);
    expect(session.lifecycle).toBe('error');
    // The last error should be surfaced
    expect(session.error?.message).toBe('Rate limited 3');
  });

  test('retries once then succeeds on second attempt', async () => {
    const { session, provider, controller } = createRetryTestHarness();

    provider.eventSequences = [
      [
        { type: 'error', error: { message: 'Temporary failure', code: 'HTTP_503', retryable: true } },
      ],
      [
        { type: 'text_delta', text: 'Success!' },
        { type: 'message_complete', stopReason: 'end_turn' },
      ],
    ];

    await controller.submitPrompt('test single retry');

    expect(provider.sendCount).toBe(2);
    expect(session.lifecycle).toBe('complete');

    const assistantMsg = session.items.find(i => i.type === 'assistant_message');
    expect(assistantMsg).toBeTruthy();
    if (assistantMsg && assistantMsg.type === 'assistant_message') {
      expect(assistantMsg.text).toContain('Success!');
    }
  });
});
