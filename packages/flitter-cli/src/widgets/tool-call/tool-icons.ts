/**
 * Status icon and arrow icon helpers for tool-call renderers.
 *
 * Pure string lookup functions with zero external dependencies beyond the
 * centralized icon registry.  Maps tool and todo statuses to Unicode symbols
 * for compact display in ToolHeader and TodoListTool (Plan 18-03).
 *
 * All glyphs are sourced from the central `icon-registry.ts` (N13) so that
 * every symbol in the TUI has a single point of definition.
 */

import { icon } from '../../utils/icon-registry';

// ---------------------------------------------------------------------------
// Tool status icons
// ---------------------------------------------------------------------------

/**
 * Maps a tool call status to a single Unicode status icon character.
 *
 * - completed   -> checkmark
 * - failed      -> cross
 * - in_progress -> empty circle (BrailleSpinner replaces this visually in ToolHeader)
 * - pending     -> empty circle
 * - default     -> empty circle
 */
export function toolStatusIcon(status: string): string {
  switch (status) {
    case 'done':
    case 'completed':
      return icon('tool.status.done');
    case 'error':
    case 'failed':
    case 'cancelled':
    case 'rejected-by-user':
    case 'cancellation-requested':
      return icon('tool.status.error');
    case 'in-progress':
    case 'in_progress':
    case 'queued':
    case 'pending':
    case 'blocked-on-user':
    default:
      return icon('tool.status.pending');
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
      return icon('todo.status.pending');
    case 'in_progress':
      return icon('todo.status.in_progress');
    case 'completed':
      return icon('todo.status.completed');
    case 'cancelled':
      return icon('todo.status.cancelled');
    default:
      return icon('todo.status.pending');
  }
}

// ---------------------------------------------------------------------------
// Generic arrow icon (used by WebSearchTool results in Plan 18-03)
// ---------------------------------------------------------------------------

/** Right arrow for web search result links. */
export const arrowIcon = icon('arrow.right');
