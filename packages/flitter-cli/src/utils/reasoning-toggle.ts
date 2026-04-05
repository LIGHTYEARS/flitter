// Deep reasoning mode toggle utility (N12).
//
// Provides formatting for the deep reasoning toggle indicator
// displayed in the status bar or prompt area.

/**
 * Format the current reasoning mode as a display string.
 *
 * @param active - Whether deep/extended reasoning is active.
 * @returns `"[extended]"` when active, `"[normal]"` when not.
 */
export function formatReasoningToggle(active: boolean): string {
  return active ? '[extended]' : '[normal]';
}
