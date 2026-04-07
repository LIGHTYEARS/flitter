// shortcut-help-data.ts — Static shortcut data matching AMP's C_R exactly.
//
// AMP ref: tmux-capture/amp-source/11_shortcuts_data_C_R.js
// This is the single source of truth for the shortcut help dual-column display.
// 6 rows, 2 shortcuts per row = 12 total shortcuts.
//
// The data is consumed by ShortcutHelpInline widget (AMP's v9T equivalent).
// It is NOT derived from ShortcutRegistry — it is a fixed display list
// matching AMP's static C_R array.

/**
 * A pair of shortcuts displayed side-by-side in one row.
 * Left and right each have a key combination string and a description.
 */
export interface ShortcutHelpPair {
  left: { keys: string; description: string };
  right: { keys: string; description: string };
}

/**
 * Left column alignment width for dual-column layout.
 * Computed from the widest left entry:
 *   "Alt+D" (5) + " " (1) + "toggle deep reasoning" (21) = 27
 *
 * AMP ref: tq0 constant in 04_shortcut_help_v9T.js
 */
export const SHORTCUT_LEFT_COL_WIDTH = 27;

/**
 * Static shortcut data matching AMP's C_R array exactly.
 * 6 rows, each with a left and right shortcut pair.
 *
 * AMP ref: tmux-capture/amp-source/11_shortcuts_data_C_R.js
 */
export const SHORTCUT_HELP_DATA: ShortcutHelpPair[] = [
  {
    left:  { keys: 'Ctrl+O',       description: 'command palette' },
    right: { keys: 'Ctrl+R',       description: 'prompt history' },
  },
  {
    left:  { keys: '$ or $$',      description: 'shell commands' },
    right: { keys: 'Ctrl+V',       description: 'paste images' },
  },
  {
    left:  { keys: 'Shift+Enter',  description: 'newline' },
    right: { keys: 'Ctrl+S',       description: 'switch modes' },
  },
  {
    left:  { keys: 'Alt+D',        description: 'toggle deep reasoning' },
    right: { keys: 'Alt+T',        description: 'toggle thinking/dense view' },
  },
  {
    left:  { keys: 'Ctrl+G',       description: 'edit in $EDITOR' },
    right: { keys: 'Tab/Shift+Tab', description: 'navigate messages' },
  },
  {
    left:  { keys: '@ / @@',       description: 'mention files/threads' },
    right: { keys: '?',            description: 'toggle this help' },
  },
];
