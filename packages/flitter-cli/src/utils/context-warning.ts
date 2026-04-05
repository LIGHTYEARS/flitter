// Context window warning utility.
//
// Provides rough token estimation and warning level calculation
// to alert users when a conversation is approaching the context window limit.
// Uses a simple chars/4 heuristic (matches the commonly used rough approximation
// for English text and code).

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

/**
 * Rough estimate of token count based on character length.
 * Uses the widely accepted ~4 characters per token approximation.
 * Not precise for all languages/encodings, but sufficient for UI warnings.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Warning levels
// ---------------------------------------------------------------------------

/** Warning severity level for context window usage. */
export type ContextWarningLevel = 'none' | 'warning' | 'critical';

/** Result from context warning evaluation. */
export interface ContextWarning {
  level: ContextWarningLevel;
  message: string;
  percentage: number;
}

/** Threshold (0-1) at which we show a warning. */
const WARNING_THRESHOLD = 0.75;

/** Threshold (0-1) at which we show a critical warning. */
const CRITICAL_THRESHOLD = 0.90;

/**
 * Evaluate context window usage and return the appropriate warning level.
 *
 * @param estimatedTokens - Current estimated token count.
 * @param maxTokens - Maximum token capacity of the context window.
 * @returns A ContextWarning with level, human-readable message, and percentage.
 */
export function getContextWarning(
  estimatedTokens: number,
  maxTokens: number,
): ContextWarning {
  if (maxTokens <= 0) {
    return { level: 'none', message: '', percentage: 0 };
  }

  const percentage = Math.min((estimatedTokens / maxTokens) * 100, 100);

  if (estimatedTokens / maxTokens >= CRITICAL_THRESHOLD) {
    return {
      level: 'critical',
      message: `Context window critically full (${percentage.toFixed(0)}%). Consider starting a new conversation.`,
      percentage,
    };
  }

  if (estimatedTokens / maxTokens >= WARNING_THRESHOLD) {
    return {
      level: 'warning',
      message: `Context window ${percentage.toFixed(0)}% full. Approaching limit.`,
      percentage,
    };
  }

  return { level: 'none', message: '', percentage };
}
