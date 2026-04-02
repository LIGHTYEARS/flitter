// shortcuts/defaults.ts -- Built-in shortcut definitions for flitter-amp
//
// Single source of truth for all default keyboard shortcuts.
// Both the key handler (dispatch) and the help overlay (getEntries)
// read from this same registry.

import type { ShortcutRegistry, ShortcutContext } from './registry';
import type { KeyEventResult } from 'flitter-core/src/input/events';
import { OVERLAY_IDS } from '../state/overlay-ids';

/**
 * Register all default shortcuts into the given registry.
 * Called once during App initialization.
 */
export function registerDefaultShortcuts(registry: ShortcutRegistry): void {

  // --- General ---

  registry.register({
    id: 'dismiss-overlay',
    binding: { key: 'Escape' },
    displayKey: 'Escape',
    description: 'Dismiss overlay / cancel',
    category: 'general',
    action: (ctx): KeyEventResult => {
      if (ctx.overlayManager.hasOverlays) {
        const dismissedId = ctx.overlayManager.dismissTop();
        // If permission dialog was dismissed, resolve it
        if (dismissedId === OVERLAY_IDS.PERMISSION_DIALOG) {
          ctx.appState.resolvePermission(null);
        }
        return 'handled';
      }
      return 'ignored';
    },
  });

  registry.register({
    id: 'open-command-palette',
    binding: { key: 'o', ctrl: true },
    displayKey: 'Ctrl+O',
    description: 'Open command palette',
    category: 'general',
    action: (ctx): KeyEventResult => {
      if (ctx.overlayManager.has(OVERLAY_IDS.COMMAND_PALETTE)) {
        ctx.overlayManager.dismiss(OVERLAY_IDS.COMMAND_PALETTE);
      } else {
        ctx.hooks.showCommandPalette();
      }
      return 'handled';
    },
  });

  registry.register({
    id: 'cancel-operation',
    binding: { key: 'c', ctrl: true },
    displayKey: 'Ctrl+C',
    description: 'Cancel current operation',
    category: 'general',
    action: (ctx): KeyEventResult => {
      ctx.onCancel();
      return 'handled';
    },
  });

  registry.register({
    id: 'clear-conversation',
    binding: { key: 'l', ctrl: true },
    displayKey: 'Ctrl+L',
    description: 'Clear conversation',
    category: 'general',
    action: (ctx): KeyEventResult => {
      ctx.appState.conversation.clear();
      ctx.setState(() => {});
      return 'handled';
    },
  });

  // --- Display ---

  registry.register({
    id: 'toggle-tool-calls',
    binding: { key: 't', alt: true },
    displayKey: 'Alt+T',
    description: 'Toggle tool call expansion',
    category: 'display',
    action: (ctx): KeyEventResult => {
      ctx.appState.conversation.toggleToolCalls();
      ctx.setState(() => {});
      return 'handled';
    },
  });

  // --- Navigation ---

  registry.register({
    id: 'open-editor',
    binding: { key: 'g', ctrl: true },
    displayKey: 'Ctrl+G',
    description: 'Open prompt in $EDITOR',
    category: 'navigation',
    action: (ctx): KeyEventResult => {
      ctx.hooks.openInEditor();
      return 'handled';
    },
  });

  registry.register({
    id: 'history-previous',
    binding: { key: 'r', ctrl: true },
    displayKey: 'Ctrl+R',
    description: 'Search prompt history (backward)',
    category: 'navigation',
    action: (ctx): KeyEventResult => {
      // Gap 64: Do not enter search mode while the agent is processing
      if (ctx.appState.isProcessing) return 'handled';
      ctx.hooks.historyPrevious();
      return 'handled';
    },
  });

  registry.register({
    id: 'cycle-mode',
    binding: { key: 's', ctrl: true },
    displayKey: 'Ctrl+S',
    description: 'Cycle agent mode (smart/code/ask)',
    category: 'general',
    action: (ctx): KeyEventResult => {
      ctx.appState.cycleMode();
      ctx.setState(() => {});
      return 'handled';
    },
  });

  registry.register({
    id: 'toggle-deep-reasoning',
    binding: { key: 'd', alt: true },
    displayKey: 'Alt+D',
    description: 'Toggle deep reasoning',
    category: 'display',
    action: (ctx): KeyEventResult => {
      ctx.appState.toggleDeepReasoning();
      ctx.setState(() => {});
      return 'handled';
    },
  });

  // --- Clipboard ---

  registry.register({
    id: 'copy-last-response',
    binding: { key: 'c', ctrl: true, shift: true },
    displayKey: 'Ctrl+Shift+C',
    description: 'Copy last response to clipboard',
    category: 'general',
    action: (ctx): KeyEventResult => {
      ctx.hooks.copyLastResponse();
      return 'handled';
    },
  });

  // --- Help overlay (context-sensitive: only when idle, no overlays) ---

  registry.register({
    id: 'toggle-shortcut-help',
    binding: { key: '?' },
    displayKey: '?',
    description: 'Toggle shortcut help',
    category: 'general',
    enabled: (ctx): boolean => {
      return (
        !ctx.appState.isProcessing &&
        !ctx.overlayManager.hasOverlays
      );
    },
    action: (ctx): KeyEventResult => {
      ctx.hooks.showShortcutHelp();
      return 'handled';
    },
  });
}
