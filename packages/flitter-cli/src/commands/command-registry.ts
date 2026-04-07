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
 */
export interface CommandItem {
  /** Unique identifier (matches shortcut id when derived from registry). */
  readonly id: string;
  /** Display label in the palette. */
  readonly label: string;
  /** Detailed description shown below the label. */
  readonly description: string;
  /** Optional shortcut hint shown at the right edge (e.g., "Ctrl+L"). */
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

  // --- From ShortcutRegistry ---
  const entries: ReadonlyArray<ShortcutEntry> = registry.getEntries();
  for (const entry of entries) {
    // Skip the dismiss-overlay shortcut (Escape) -- it is structural, not a palette command
    if (entry.id === 'dismiss-overlay') continue;
    // Skip the command palette itself to avoid recursion
    if (entry.id === 'open-command-palette') continue;

    // Capture entry in closure for the execute callback
    const shortcutEntry = entry;
    commands.push({
      id: shortcutEntry.id,
      label: shortcutEntry.description,
      description: `Shortcut: ${shortcutEntry.displayKey}`,
      shortcutHint: shortcutEntry.displayKey,
      execute: (_onDismiss: () => void) => {
        // Synthesize a minimal KeyEvent to dispatch through the shortcut action.
        // The palette is already dismissed by the caller before execute() runs.
        shortcutEntry.action(ctx, {
          type: 'key',
          key: shortcutEntry.binding.key,
          ctrlKey: shortcutEntry.binding.ctrl ?? false,
          altKey: shortcutEntry.binding.alt ?? false,
          shiftKey: shortcutEntry.binding.shift ?? false,
          metaKey: shortcutEntry.binding.meta ?? false,
        });
      },
    });
  }

  // --- Additional non-shortcut commands ---

  // --- Thread commands ---

  commands.push({
    id: 'thread-new',
    label: 'New thread',
    description: 'Start a new conversation thread (preserves existing)',
    execute: (_onDismiss: () => void) => {
      appState.newThread();
    },
  });

  commands.push({
    id: 'thread-switch',
    label: 'Switch thread',
    description: 'Open thread list to switch to another thread',
    execute: (_onDismiss: () => void) => {
      appState.showThreadList();
    },
  });

  commands.push({
    id: 'thread-map',
    label: 'Thread map',
    description: 'Show all threads in the thread list',
    execute: (_onDismiss: () => void) => {
      appState.showThreadList();
    },
  });

  commands.push({
    id: 'thread-set-visibility',
    label: 'Set thread visibility',
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

  commands.push({
    id: 'thread-navigate-back',
    label: 'Navigate back',
    description: 'Go to the previous thread in navigation history',
    execute: (_onDismiss: () => void) => {
      if (appState.threadPool.canNavigateBack()) {
        appState.threadPool.navigateBack();
        const handle = appState.threadPool.activeThreadHandleOrNull;
        if (handle) {
          // Re-point AppState to the new active thread
          (appState as any)._switchToHandle(handle);
        }
      }
    },
  });

  commands.push({
    id: 'thread-navigate-forward',
    label: 'Navigate forward',
    description: 'Go to the next thread in navigation history',
    execute: (_onDismiss: () => void) => {
      if (appState.threadPool.canNavigateForward()) {
        appState.threadPool.navigateForward();
        const handle = appState.threadPool.activeThreadHandleOrNull;
        if (handle) {
          (appState as any)._switchToHandle(handle);
        }
      }
    },
  });

  commands.push({
    id: 'toggle-tool-calls',
    label: 'Toggle tool calls',
    description: 'Show or hide tool call details in compact view',
    execute: (_onDismiss: () => void) => {
      appState.toggleDenseView();
    },
  });

  commands.push({
    id: 'insert-file-mention',
    label: 'Insert file mention',
    description: 'Open file picker to insert @file reference',
    execute: (_onDismiss: () => void) => {
      ctx.hooks.showFilePicker();
    },
  });

  return commands;
}
