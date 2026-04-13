/**
 * Context overflow detection
 *
 * Detects context window overflow errors across multiple providers
 * by matching known error message patterns.
 */

const OVERFLOW_PATTERNS: RegExp[] = [
  // Anthropic
  /prompt is too long/i,
  /exceeds the maximum number of tokens/i,
  /context length exceeded/i,
  // OpenAI
  /maximum context length/i,
  /Request too large/i,
  /reduce the length/i,
  /tokens exceeds/i,
  // Gemini
  /exceeds the maximum token count/i,
  /input too long/i,
  // xAI / generic
  /context.?window/i,
  /token limit/i,
  /too many tokens/i,
];

/**
 * Returns true if the error message indicates a context window overflow.
 */
export function isContextOverflow(errorMessage: string): boolean {
  return OVERFLOW_PATTERNS.some((p) => p.test(errorMessage));
}
