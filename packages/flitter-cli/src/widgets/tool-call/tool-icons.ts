/**
 * Status icon and arrow icon helpers for tool-call renderers.
 *
 * Pure string lookup functions with zero external dependencies.
 * Maps tool and todo statuses to Unicode symbols for compact display
 * in ToolHeader and TodoListTool (Plan 18-03).
 *
 * Ported from flitter-amp icon-registry — replaced theme-aware icon
 * objects with simple string returns since flitter-cli uses direct
 * Color constants (no theme indirection until Phase 20).
 */

import type { ToolCallItem } from '../../state/types';

// ---------------------------------------------------------------------------
// Tool status icons
// ---------------------------------------------------------------------------

/**
 * Maps a tool call status to a single Unicode status icon character.
 *
 * - completed   -> checkmark
 * - failed      -> cross
 * - in_progress -> circle (BrailleSpinner replaces this visually in ToolHeader)
 * - pending     -> circle
 * - default     -> circle
 */
export function toolStatusIcon(status: ToolCallItem['status']): string {
  switch (status) {
    case 'completed':
      return '\u2713'; // checkmark
    case 'failed':
      return '\u2717'; // cross
    case 'in_progress':
      return '\u25CB'; // circle (spinner replaces visually)
    case 'pending':
      return '\u25CB'; // circle
    default:
      return '\u25CB'; // circle
  }
}

// ---------------------------------------------------------------------------
// Todo status icons (used by TodoListTool in Plan 18-03)
// ---------------------------------------------------------------------------

/**
 * Maps a todo entry status to a single Unicode icon character.
 *
 * - pending     -> empty circle
 * - in_progress -> half circle
 * - completed   -> checkmark
 * - cancelled   -> cross
 * - default     -> empty circle
 */
export function todoStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return '\u25CB'; // empty circle
    case 'in_progress':
      return '\u25D4'; // half circle
    case 'completed':
      return '\u2713'; // checkmark
    case 'cancelled':
      return '\u2717'; // cross
    default:
      return '\u25CB'; // empty circle
  }
}

// ---------------------------------------------------------------------------
// Generic arrow icon (used by WebSearchTool results in Plan 18-03)
// ---------------------------------------------------------------------------

/** Right arrow for web search result links. */
export const arrowIcon = '\u2192';
