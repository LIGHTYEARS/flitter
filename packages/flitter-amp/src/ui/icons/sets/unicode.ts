import type { IconMap } from '../types';

/**
 * Unicode icon set.
 *
 * Portable, non-emoji symbols that should render on most systems and remain
 * readable in GitHub-rendered SVG snapshots.
 */
export const UNICODE_ICONS: IconMap = {
  // Avoid emoji-like warning/hourglass symbols to prevent emoji presentation
  // and/or width surprises in some terminals.
  'status.warning': '!',
  // Ellipsis is single-cell and widely supported.
  'status.processing': '…',

  // AMP ref: expand-collapse-lT.js uses ▼/▶.
  'disclosure.collapsed': '▶',
  'disclosure.expanded': '▼',

  // AMP ref: status-icon-rR.js
  'tool.status.done': '✓',
  'tool.status.error': '✕',
  'tool.status.pending': '⋯',

  // Keep existing plan/todo glyphs (portable unicode).
  'plan.status.completed': '✓',
  'plan.status.in_progress': '●',
  'plan.status.pending': '○',

  'todo.status.pending': '○',
  'todo.status.in_progress': '◐',
  'todo.status.completed': '●',
  'todo.status.cancelled': '∅',

  'arrow.right': '→',
};
