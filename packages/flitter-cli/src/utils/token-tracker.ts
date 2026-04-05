// Token usage tracker with formatting (N14).
//
// Accumulates token usage across multiple API calls and provides
// a formatted summary string.

import type { TokenUsage } from '../state/types';

/**
 * TokenTracker accumulates token usage across API interactions
 * and provides accessors for totals and formatted summaries.
 */
export class TokenTracker {
  private _inputTokens: number = 0;
  private _outputTokens: number = 0;

  /** Add a token usage record to the running total. */
  add(usage: TokenUsage): void {
    this._inputTokens += usage.inputTokens;
    this._outputTokens += usage.outputTokens;
  }

  /** Get the cumulative token usage. */
  total(): TokenUsage {
    return {
      inputTokens: this._inputTokens,
      outputTokens: this._outputTokens,
      totalTokens: this._inputTokens + this._outputTokens,
    };
  }

  /** Reset all counters to zero. */
  reset(): void {
    this._inputTokens = 0;
    this._outputTokens = 0;
  }

  /**
   * Format the current usage as a compact string.
   * Returns a string like: "up-arrow 1.2k down-arrow 3.4k"
   */
  format(): string {
    return `\u2191${formatCount(this._inputTokens)} \u2193${formatCount(this._outputTokens)}`;
  }
}

/**
 * Format a token count as a compact string.
 * Counts >= 1000 are displayed as "X.Xk", otherwise as the raw number.
 */
function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return String(n);
}
