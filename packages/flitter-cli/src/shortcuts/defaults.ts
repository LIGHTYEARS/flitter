// shortcuts/defaults.ts -- Built-in shortcut definitions for flitter-cli
//
// Single source of truth for all default keyboard shortcuts.
// Both the key handler (dispatch) and the help overlay (getEntries)
// read from this same registry.
//
// Adapted from flitter-amp/src/shortcuts/defaults.ts for flitter-cli:
// - Uses flitter-cli AppState methods (newThread, toggleDenseView, toggleDeepReasoning, etc.)
// - Escape fallback returns 'ignored' when no overlays are active (matches AMP)
// - Phase 21 shortcuts (Ctrl+R) remain as stubs

import type { ShortcutRegistry } from './registry';
import type { KeyEventResult } from '../../../flitter-core/src/input/events';
import { OVERLAY_IDS } from '../state/overlay-ids';
import { log } from '../utils/logger';

/**
 * Detect whether we are running inside tmux.
 * Used for KEYS-02 to determine Shift+Enter vs Alt+Enter binding.
 */
function isTmux(): boolean {
  return Boolean(process.env.TMUX);
}

/**
 * Register all default shortcuts into the given registry.
 * Called once during AppShell initialization.
 */
export function registerDefaultShortcuts(registry: ShortcutRegistry): void {

  // --- General ---

  registry.register({
    id: 'dismiss-overlay',
    binding: { key: 'Escape' },
    displayKey: 'Escape',
    description: 'Dismiss overlay',
    category: 'general',
    action: (ctx): KeyEventResult => {
      if (ctx.overlayManager.hasOverlays) {
        const dismissedId = ctx.overlayManager.dismissTop();
        // If the dismissed overlay was the permission dialog, resolve as denied (null)
        if (dismissedId === OVERLAY_IDS.PERMISSION_DIALOG) {
          ctx.appState.resolvePermission(null);
        }
        log.info(`ShortcutRegistry: Escape dismissed overlay '${dismissedId}'`);
        return 'handled';
      }
      // Fallback: no overlays active — ignore (matches AMP behavior)
      log.info('ShortcutRegistry: Escape ignored (no overlays)');
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
    description: 'Cancel current operation / exit',
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
      log.info('ShortcutRegistry: Ctrl+L clearing conversation');
      ctx.appState.newThread();
      return 'handled';
    },
  });

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

  registry.register({
    id: 'cycle-mode',
    binding: { key: 's', ctrl: true },
    displayKey: 'Ctrl+S',
    description: 'Cycle agent mode',
    category: 'general',
    action: (ctx): KeyEventResult => {
      ctx.appState.cycleMode();
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
      ctx.appState.session?.toggleToolCalls?.();
      ctx.setState(() => {});
      return 'handled';
    },
  });

  registry.register({
    id: 'toggle-deep-reasoning',
    binding: { key: 'd', alt: true },
    displayKey: 'Alt+D',
    description: 'Cycle deep reasoning (medium/high/xhigh/off)',
    category: 'display',
    action: (ctx): KeyEventResult => {
      ctx.appState.cycleDeepReasoning();
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
      log.info('ShortcutRegistry: Ctrl+G — opening external editor');
      ctx.hooks.openInEditor();
      return 'handled';
    },
  });

  registry.register({
    id: 'history-search',
    binding: { key: 'r', ctrl: true },
    displayKey: 'Ctrl+R',
    description: 'Search prompt history',
    category: 'navigation',
    action: (ctx): KeyEventResult => {
      if (ctx.appState.isProcessing) return 'handled';
      // Phase 21 stub: history search not yet implemented
      log.info('ShortcutRegistry: Ctrl+R — history search stub (Phase 21)');
      ctx.hooks.historyPrevious();
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
      log.info('ShortcutRegistry: ? toggling shortcut help');
      ctx.hooks.showShortcutHelp();
      return 'handled';
    },
  });

  // --- Input shortcuts (KEYS-01 through KEYS-04) ---

  // KEYS-01: Ctrl+V paste images
  registry.register({
    id: 'paste-image',
    binding: { key: 'v', ctrl: true },
    displayKey: 'Ctrl+V',
    description: 'Paste images from clipboard',
    category: 'input',
    action: (ctx): KeyEventResult => {
      log.info('ShortcutRegistry: Ctrl+V — paste image');
      ctx.hooks.pasteImage?.();
      return 'handled';
    },
  });

  // KEYS-02: Shift+Enter (non-tmux) / Alt+Enter (tmux) inserts newline
  registry.register({
    id: 'insert-newline',
    binding: isTmux()
      ? { key: 'Enter', alt: true }
      : { key: 'Enter', shift: true },
    displayKey: isTmux() ? 'Alt+Enter' : 'Shift+Enter',
    description: 'Insert newline',
    category: 'input',
    action: (ctx): KeyEventResult => {
      log.info('ShortcutRegistry: insert newline');
      ctx.hooks.insertNewline?.();
      return 'handled';
    },
  });

  // KEYS-03: Tab navigates to next message
  registry.register({
    id: 'navigate-messages-forward',
    binding: { key: 'Tab' },
    displayKey: 'Tab',
    description: 'Navigate to next message',
    category: 'navigation',
    enabled: (ctx): boolean => !ctx.appState.isProcessing,
    action: (ctx): KeyEventResult => {
      log.info('ShortcutRegistry: Tab — navigate messages forward');
      ctx.hooks.navigateMessages?.('forward');
      return 'handled';
    },
  });

  // KEYS-03: Shift+Tab navigates to previous message
  registry.register({
    id: 'navigate-messages-backward',
    binding: { key: 'Tab', shift: true },
    displayKey: 'Shift+Tab',
    description: 'Navigate to previous message',
    category: 'navigation',
    enabled: (ctx): boolean => !ctx.appState.isProcessing,
    action: (ctx): KeyEventResult => {
      log.info('ShortcutRegistry: Shift+Tab — navigate messages backward');
      ctx.hooks.navigateMessages?.('backward');
      return 'handled';
    },
  });

  // KEYS-04: Up arrow edits previous user message (when input is empty and at cursor pos 0)
  registry.register({
    id: 'edit-previous-message',
    binding: { key: 'ArrowUp' },
    displayKey: 'Up',
    description: 'Edit previous user message',
    category: 'input',
    enabled: (ctx): boolean => {
      return (
        !ctx.appState.isProcessing &&
        !ctx.overlayManager.hasOverlays &&
        (ctx.hooks.canEditPreviousMessage?.() === true)
      );
    },
    action: (ctx): KeyEventResult => {
      log.info('ShortcutRegistry: ArrowUp — edit previous message');
      ctx.hooks.editPreviousMessage?.();
      return 'handled';
    },
  });
}
