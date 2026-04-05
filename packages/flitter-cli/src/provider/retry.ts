// Retry policy with exponential backoff and jitter for transient provider errors.
//
// Wraps provider sendPrompt() calls transparently — callers of PromptController
// see automatic retries for transient errors (429, 5xx) without any interface
// changes. Only retries when error.retryable === true AND streaming has not yet
// begun delivering content.

import type { SessionError } from '../state/types';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration for retry behaviour on transient provider errors. */
export interface RetryConfig {
  /** Maximum number of attempts (including the initial attempt). Default 3. */
  maxAttempts: number;
  /** Base delay in milliseconds before the first retry. Default 1000. */
  baseDelayMs: number;
  /** Upper bound on computed delay in milliseconds. Default 30000. */
  maxDelayMs: number;
  /** Jitter factor (0..1) — random proportion of base delay added. Default 0.3. */
  jitterFactor: number;
  /** HTTP status codes considered retryable. Default [429, 500, 502, 503, 504]. */
  retryableStatusCodes: number[];
}

/** Sensible defaults for retry configuration. */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.3,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Compute the delay before the next retry attempt using exponential backoff
 * with additive jitter.
 *
 * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 *   where jitter = random() * jitterFactor * baseDelay
 *
 * @param attempt - Zero-based attempt index (0 = first retry, 1 = second, ...).
 * @param config  - Retry configuration.
 * @returns Delay in milliseconds.
 */
export function computeDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.jitterFactor * config.baseDelayMs;
  return Math.min(exponential + jitter, config.maxDelayMs);
}

/**
 * Sleep for the given number of milliseconds.
 * Returns a promise that resolves after the delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine whether a SessionError is eligible for retry.
 *
 * An error is retryable when its `retryable` flag is explicitly true.
 * This flag is set by provider implementations for transient failures
 * (e.g. HTTP 429, 500, 502, 503, 504, network timeouts).
 *
 * @param error - The session error to evaluate.
 * @returns true if the error should trigger a retry.
 */
export function isRetryableError(error: SessionError): boolean {
  return error.retryable === true;
}
