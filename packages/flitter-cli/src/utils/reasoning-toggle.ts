// Deep reasoning mode toggle utility (N12, MODE-01).
//
// Provides formatting for the deep reasoning tri-state indicator
// displayed in the status bar or prompt area.

import type { DeepReasoningEffort } from '../state/types';

/**
 * Format the current reasoning effort level as a display string.
 * Returns '[medium]', '[high]', '[xhigh]', or '[normal]'.
 *
 * @param effort - Current deep reasoning effort level, or null for disabled.
 * @returns Formatted reasoning effort indicator string.
 */
export function formatReasoningToggle(effort: DeepReasoningEffort | null): string {
  if (effort === null) return '[normal]';
  return `[${effort}]`;
}
