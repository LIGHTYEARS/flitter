// Well-known overlay identifiers and priorities for flitter-cli
//
// Ported from flitter-amp/src/state/overlay-ids.ts.
// Centralizes overlay configuration to prevent magic strings/numbers
// and provides single-glance documentation of the overlay layering order.
//
// Removed from amp version: THREAD_LIST, PROMPT_HISTORY (Phase 21 scope),
// MYSTERY_MODAL (not needed in flitter-cli).

/**
 * Well-known overlay identifiers.
 * Using constants prevents typos and enables IDE autocomplete.
 */
export const OVERLAY_IDS = {
  PERMISSION_DIALOG: 'permission',
  COMMAND_PALETTE: 'commandPalette',
  SHORTCUT_HELP: 'shortcutHelp',
  FILE_PICKER: 'filePicker',
  TOAST: 'toast',
} as const;

/**
 * Well-known overlay priorities.
 * Higher values render on top and receive Escape first.
 *
 * Priority ranges:
 *   100+ : system modals (permission dialog)
 *   50-99: user-triggered modals (command palette, shortcut help)
 *   25-49: contextual popups (file picker, autocomplete)
 *   1-24 : passive/non-modal (toasts, status badges)
 */
export const OVERLAY_PRIORITIES = {
  PERMISSION_DIALOG: 100,
  COMMAND_PALETTE: 50,
  SHORTCUT_HELP: 50,
  FILE_PICKER: 25,
  TOAST: 10,
} as const;
