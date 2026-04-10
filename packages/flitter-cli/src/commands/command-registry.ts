// commands/command-registry.ts -- Command inventory for the command palette
//
// Defines the CommandItem type and builds a unified command list from
// ShortcutRegistry entries plus additional non-shortcut commands.
// The list is rebuilt each time the palette opens so it always reflects
// the current state of shortcuts and application state.

import type { ShortcutRegistry, ShortcutEntry, ShortcutContext } from '../shortcuts/registry';
import type { AppState } from '../state/app-state';

/**
 * A single command available in the command palette.
 * AMP displays commands in category+label dual-column format.
 */
export interface CommandItem {
  /** Unique identifier (matches shortcut id when derived from registry). */
  readonly id: string;
  /** Category shown left-aligned and dim (e.g., "amp", "mode", "thread"). */
  readonly category: string;
  /** Display label in the palette (shown bold after category). */
  readonly label: string;
  /** Detailed description (used for fuzzy search, not shown in AMP layout). */
  readonly description: string;
  /** Optional shortcut hint shown at the right edge (e.g., "Ctrl s"). */
  readonly shortcutHint?: string;
  /** The action to execute. Receives an onDismiss callback for self-dismissal. */
  readonly execute: (onDismiss: () => void) => void;
}

/**
 * Build the full command list for the command palette.
 *
 * Sources:
 * 1. ShortcutRegistry entries -- each shortcut becomes a command with its
 *    displayKey as the shortcutHint. The `dismiss-overlay` shortcut is excluded
 *    because Escape is handled structurally, not as a palette command.
 * 2. Additional non-shortcut commands -- actions that are only reachable
 *    through the palette (new thread, copy last response, view usage, toggle
 *    tool calls).
 *
 * @param registry - The shortcut registry to derive shortcut-bound commands from
 * @param appState - Application state for non-shortcut command handlers
 * @param ctx - ShortcutContext for executing shortcut-bound commands
 * @returns Array of CommandItem for display in the command palette
 */
export function buildCommandList(
  registry: ShortcutRegistry,
  appState: AppState,
  ctx: ShortcutContext,
): CommandItem[] {
  const commands: CommandItem[] = [];

  // --- Helper to create a shortcut executor from a registry entry ---
  /** Creates an execute callback that synthesizes a KeyEvent for a shortcut entry. */
  const makeShortcutExecutor = (entry: ShortcutEntry) => {
    return (_onDismiss: () => void) => {
      entry.action(ctx, {
        type: 'key',
        key: entry.binding.key,
        ctrlKey: entry.binding.ctrl ?? false,
        altKey: entry.binding.alt ?? false,
        shiftKey: entry.binding.shift ?? false,
        metaKey: entry.binding.meta ?? false,
      });
    };
  };

  // --- Collect shortcut entries for later reference by palette commands ---
  const shortcutMap = new Map<string, ShortcutEntry>();
  const entries: ReadonlyArray<ShortcutEntry> = registry.getEntries();
  for (const entry of entries) {
    shortcutMap.set(entry.id, entry);
  }

  // --- AMP Palette Commands (exact order from golden screenshot) ---
  // Category order: amp, mode, thread, prompt, context, news

  // 1. amp > help
  commands.push({
    id: 'help',
    category: 'amp',
    label: 'help',
    description: 'Show shortcut help overlay',
    execute: (_onDismiss: () => void) => {
      ctx.hooks.showShortcutHelp();
    },
  });

  // 2. mode > use rush
  commands.push({
    id: 'use-rush',
    category: 'mode',
    label: 'use rush',
    description: 'Switch agent mode to rush',
    execute: (_onDismiss: () => void) => {
      (appState as any).setAgentMode?.('rush');
    },
  });

  // 3. mode > use large
  commands.push({
    id: 'use-large',
    category: 'mode',
    label: 'use large',
    description: 'Switch agent mode to large',
    execute: (_onDismiss: () => void) => {
      (appState as any).setAgentMode?.('large');
    },
  });

  // 4. mode > use deep
  commands.push({
    id: 'use-deep',
    category: 'mode',
    label: 'use deep',
    description: 'Switch agent mode to deep',
    execute: (_onDismiss: () => void) => {
      (appState as any).setAgentMode?.('deep');
    },
  });

  // 5. mode > set
  commands.push({
    id: 'mode-set',
    category: 'mode',
    label: 'set',
    description: 'Open mode selector',
    execute: (_onDismiss: () => void) => {
      (appState as any).showModeSelector?.();
    },
  });

  // 6. mode > toggle (Ctrl s)
  const cycleModeEntry = shortcutMap.get('cycle-mode');
  commands.push({
    id: 'mode-toggle',
    category: 'mode',
    label: 'toggle',
    description: 'Cycle through agent modes',
    shortcutHint: cycleModeEntry?.displayKey,
    execute: cycleModeEntry
      ? makeShortcutExecutor(cycleModeEntry)
      : (_onDismiss: () => void) => { (appState as any).cycleAgentMode?.(); },
  });

  // 7. thread > switch
  commands.push({
    id: 'thread-switch',
    category: 'thread',
    label: 'switch',
    description: 'Open thread list to switch to another thread',
    execute: (_onDismiss: () => void) => {
      appState.showThreadList();
    },
  });

  // 8. thread > new
  commands.push({
    id: 'thread-new',
    category: 'thread',
    label: 'new',
    description: 'Start a new conversation thread',
    execute: (_onDismiss: () => void) => {
      appState.newThread();
    },
  });

  // 9. prompt > open in editor (Ctrl g)
  const editorEntry = shortcutMap.get('open-editor');
  commands.push({
    id: 'prompt-open-editor',
    category: 'prompt',
    label: 'open in editor',
    description: 'Open prompt in $EDITOR',
    shortcutHint: editorEntry?.displayKey,
    execute: editorEntry
      ? makeShortcutExecutor(editorEntry)
      : (_onDismiss: () => void) => { ctx.hooks.openInEditor(); },
  });

  // 10. thread > map
  commands.push({
    id: 'thread-map',
    category: 'thread',
    label: 'map',
    description: 'Show all threads in the thread list',
    execute: (_onDismiss: () => void) => {
      appState.showThreadList();
    },
  });

  // 11. thread > switch to cluster
  commands.push({
    id: 'thread-switch-to-cluster',
    category: 'thread',
    label: 'switch to cluster',
    description: 'Show thread cluster picker',
    execute: (_onDismiss: () => void) => {
      appState.showThreadList();
    },
  });

  // 12. context > analyze
  commands.push({
    id: 'context-analyze',
    category: 'context',
    label: 'analyze',
    description: 'Show context analysis modal',
    execute: (_onDismiss: () => void) => {
      appState.showContextAnalyze();
    },
  });

  // 13. news > open in browser
  commands.push({
    id: 'news-open',
    category: 'news',
    label: 'open in browser',
    description: 'Open news feed in browser',
    execute: (_onDismiss: () => void) => {
      (appState as any).openNewsInBrowser?.();
    },
  });

  // 14. thread > set visibility
  commands.push({
    id: 'thread-set-visibility',
    category: 'thread',
    label: 'set visibility',
    description: 'Toggle current thread visibility (visible/hidden)',
    execute: (_onDismiss: () => void) => {
      const activeID = appState.threadPool.activeThreadContextID;
      if (!activeID) return;
      const handle = appState.threadPool.threadHandleMap.get(activeID);
      if (!handle) return;
      const newVisibility = handle.visibility === 'visible' ? 'hidden' : 'visible';
      appState.threadPool.setThreadVisibility(activeID, newVisibility);
    },
  });

  // 15. prompt > paste image from clipboard (Ctrl v)
  commands.push({
    id: 'paste-image',
    category: 'prompt',
    label: 'paste image from clipboard',
    description: 'Paste image from clipboard into input',
    shortcutHint: 'Ctrl+V',
    execute: (_onDismiss: () => void) => {
      ctx.hooks.pasteImage?.();
    },
  });

  // 16. thread > merge (F34)
  commands.push({
    id: 'thread-merge',
    category: 'thread',
    label: 'merge',
    description: 'Merge current thread into another thread',
    execute: (_onDismiss: () => void) => {
      // Open thread list for merge target selection.
      // The active thread is the source; the selected thread is the target.
      appState.showThreadList();
    },
  });

  return commands;
}
