// Prompt symbol utility — maps SessionLifecycle to a visual indicator.
//
// Used by the input widget to show a contextual prompt character that
// reflects the current session state (mode cycling: I12).

import type { SessionLifecycle } from '../state/types';

/** Unicode prompt symbols for each lifecycle state. */
const PROMPT_SYMBOLS: Record<SessionLifecycle, string> = {
  idle: '>',                // > (AMP parity: plain ASCII greater-than)
  streaming: '\u2026',      // ...
  processing: '\u2699',     // gear
  tool_execution: '\u2699', // gear (same as processing — actively running tools)
  complete: '\u2713',       // check mark
  error: '\u2717',          // cross mark
  cancelled: '\u2717',      // cross mark (same as error)
};

/**
 * Return a single-character prompt symbol for the given session lifecycle.
 *
 * Mapping:
 *   idle           → ">"
 *   streaming      → "..."
 *   processing     → "gear"
 *   tool_execution → "gear"
 *   complete       → "checkmark"
 *   error          → "cross"
 *   cancelled      → "cross"
 */
export function getPromptSymbol(lifecycle: SessionLifecycle): string {
  return PROMPT_SYMBOLS[lifecycle] ?? PROMPT_SYMBOLS.idle;
}
