/**
 * @flitter/llm — Model Fallback Chain
 *
 * Provides retry-with-fallback logic for LLM streaming: when the primary model
 * hits a retryable error (overloaded, rate-limited, server error, network error),
 * the chain tries fallback models in order.
 *
 * 逆向: amp-cli-reversed/chunk-002.js — shouldRetry(), retryRequest(),
 *        calculateDefaultRetryTimeoutMillis(), vUT(), fU(), $UT(), G4R()
 *
 * amp's retry decision:
 *   shouldRetry(response) → checks x-should-retry header, then status codes
 *     408 → true, 409 → true, 429 → true, >=500 → true
 *
 * amp's error classification (vUT):
 *   overloaded (fU) || stream stalled (IU) || network error ($UT) ||
 *   server error >=500 (G4R) || rate_limit_error || 429 ||
 *   InvalidModelOutputError || response incomplete
 *
 * amp's backoff: min(0.5 * 2^attempt, 8) * (1 - random*0.25) seconds
 */

import type { LLMProvider } from "./provider";
import type { StreamDelta, StreamParams } from "./types";
import { ProviderError } from "./types";
import { isContextOverflow } from "./utils/overflow";

// ─── Error Classification ────────────────────────────────

/**
 * 逆向: amp-cli-reversed/chunk-002.js:14538 — fU()
 * Detects overloaded errors by message content or error type.
 */
export function isOverloaded(err: ProviderError): boolean {
  const keywords = ["overloaded", "overload"];
  const msgLower = err.message?.toLowerCase() ?? "";
  return keywords.some((k) => msgLower.includes(k)) || err.status === 529;
}

/**
 * 逆向: amp-cli-reversed/chunk-002.js:14556 — $UT()
 * Detects network-level failures.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msgLower = err.message?.toLowerCase() ?? "";
  const networkKeywords = [
    "fetch failed",
    "failed to fetch",
    "enotfound",
    "econnrefused",
    "econnreset",
    "etimedout",
    "network request failed",
    "network error",
    "dns lookup failed",
    "getaddrinfo",
    "socket hang up",
    "connection refused",
    "unable to connect",
    "terminated",
    "other side closed",
  ];
  return networkKeywords.some((k) => msgLower.includes(k));
}

/**
 * 逆向: amp-cli-reversed/chunk-002.js:14551 — IU()
 * Detects stream stall / timeout.
 */
export function isStreamStalled(err: ProviderError): boolean {
  const msgLower = err.message?.toLowerCase() ?? "";
  return ["stream stalled", "no data received for"].some((k) => msgLower.includes(k));
}

/**
 * 逆向: amp-cli-reversed/chunk-002.js:14567 — V4R()
 * Detects incomplete response / unexpected stream end.
 */
export function isResponseIncomplete(err: ProviderError): boolean {
  const msgLower = err.message?.toLowerCase() ?? "";
  return ["response incomplete", "stream ended unexpectedly", "stream closed before"].some((k) =>
    msgLower.includes(k),
  );
}

/**
 * 逆向: amp-cli-reversed/chunk-002.js:14564 — K4R()
 * Detects invalid model output (malformed JSON, unexpected tokens).
 * amp checks: T.message.startsWith("InvalidModelOutputError")
 */
export function isInvalidModelOutput(err: ProviderError): boolean {
  return err.message?.startsWith("InvalidModelOutputError") ?? false;
}

/**
 * Detect context-overflow errors — skip retries, go to fallback.
 * 逆向: amp-cli-reversed/modules/1063_unknown_f4R.js:33-39
 * When totalInputTokens >= maxInputTokens, amp falls back to
 * eP = ya("GEMINI3_FLASH_PREVIEW") (chunk-005.js:106075).
 */
export function isContextOverflowError(err: unknown): boolean {
  if (err instanceof ProviderError) {
    return isContextOverflow(err.message ?? "");
  }
  return false;
}

/**
 * 逆向: amp-cli-reversed/chunk-002.js:14572 — vUT()
 * Master retryability check combining all error classifiers.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof ProviderError) {
    return (
      err.retryable ||
      isOverloaded(err) ||
      isStreamStalled(err) ||
      isResponseIncomplete(err) ||
      isInvalidModelOutput(err) ||
      err.status === 429 ||
      err.status === 503 ||
      err.status === 529 ||
      err.status >= 500
    );
  }
  return isNetworkError(err);
}

/**
 * 逆向: amp-cli-reversed/chunk-002.js:242 — shouldRetry()
 * HTTP-level retry decision based on response status.
 */
export function shouldRetryStatus(status: number, retryHeader?: string | null): boolean {
  if (retryHeader === "true") return true;
  if (retryHeader === "false") return false;
  if (status === 408) return true;
  if (status === 409) return true;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
}

// ─── Backoff ─────────────────────────────────────────────

/**
 * 逆向: amp-cli-reversed/chunk-002.js:271 — calculateDefaultRetryTimeoutMillis()
 * Exponential backoff with jitter: min(0.5 * 2^attempt, 8) * (1 - random*0.25)
 */
export function calculateBackoffMs(
  retriesRemaining: number,
  maxRetries: number,
  retryAfterMs?: number,
): number {
  // If server sent Retry-After and it's sane, use it
  if (retryAfterMs !== undefined && retryAfterMs >= 0 && retryAfterMs < 60_000) {
    return retryAfterMs;
  }

  const attempt = maxRetries - retriesRemaining;
  const baseDelay = Math.min(0.5 * Math.pow(2, attempt), 8);
  const jitter = 1 - Math.random() * 0.25;
  return baseDelay * jitter * 1000;
}

// ─── ModelFallbackChain ──────────────────────────────────

export interface FallbackChainOptions {
  /** Maximum retries per model before trying next fallback */
  maxRetriesPerModel?: number;
  /** Models to try in order (primary first, then fallbacks) */
  models: string[];
  /** The provider to use for streaming */
  provider: LLMProvider;
  /** Delay function (for testing) */
  delay?: (ms: number) => Promise<void>;
}

/**
 * ModelFallbackChain — tries primary model, falls back on retryable errors.
 *
 * 逆向: amp-cli-reversed/chunk-002.js — makeRequest() retry loop and
 *        amp-cli-reversed/modules/1063_unknown_f4R.js — context overflow fallback to Gemini
 *
 * Usage:
 * ```ts
 * const chain = new ModelFallbackChain({
 *   models: ['claude-sonnet-4-20250514', 'gemini-2.5-flash'],
 *   provider,
 *   maxRetriesPerModel: 2,
 * });
 * for await (const delta of chain.stream(params)) { ... }
 * ```
 */
export class ModelFallbackChain {
  private readonly _models: string[];
  private readonly _provider: LLMProvider;
  private readonly _maxRetries: number;
  private readonly _delay: (ms: number) => Promise<void>;

  constructor(opts: FallbackChainOptions) {
    this._models = opts.models;
    this._provider = opts.provider;
    this._maxRetries = opts.maxRetriesPerModel ?? 2;
    this._delay = opts.delay ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /**
   * Stream with automatic retry and model fallback.
   * Tries each model up to maxRetries times before moving to the next.
   */
  async *stream(params: StreamParams): AsyncGenerator<StreamDelta> {
    let lastError: unknown;

    for (const model of this._models) {
      let retriesLeft = this._maxRetries;

      while (retriesLeft >= 0) {
        try {
          const gen = this._provider.stream({ ...params, model });
          for await (const delta of gen) {
            yield delta;
          }
          // Success — return without trying fallbacks
          return;
        } catch (err: unknown) {
          lastError = err;

          // Context overflow — skip retries, try next model immediately
          // 逆向: amp-cli-reversed/modules/1063_unknown_f4R.js:33-39
          if (isContextOverflowError(err)) {
            break; // exits retry while-loop, continues to next model in for-loop
          }

          if (!isRetryableError(err)) {
            // Non-retryable error — throw immediately, don't try fallbacks
            throw err;
          }

          retriesLeft--;

          if (retriesLeft >= 0) {
            // Retry same model with backoff
            const backoff = calculateBackoffMs(
              retriesLeft,
              this._maxRetries,
              err instanceof ProviderError ? err.retryAfterMs : undefined,
            );
            await this._delay(backoff);
          }
          // If retriesLeft < 0, fall through to try next model
        }
      }
    }

    // All models exhausted — throw last error
    throw lastError;
  }
}
