// shortcuts/registry.ts -- Centralized shortcut registry for flitter-cli
//
// Ported from flitter-amp/src/shortcuts/registry.ts.
// Provides registration, matching, dispatch, discovery, and conflict detection
// for all keyboard shortcuts. Replaces the monolithic FocusScope.onKey handler.
//
// Adapted from amp version:
// - AppState import points to flitter-cli/src/state/app-state
// - OverlayManager import points to flitter-cli/src/state/overlay-manager
// - PromptHistory removed (Phase 21 scope — left as optional placeholder)

import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { matchesShortcut, type ShortcutBinding } from '../../../flitter-core/src/input/shortcuts';
import type { AppState } from '../state/app-state';
import type { OverlayManager } from '../state/overlay-manager';

/**
 * Context provided to shortcut action callbacks.
 * Gives actions access to everything they need without importing
 * AppState or widget internals directly.
 */
export interface ShortcutContext {
  /** The full AppState instance */
  readonly appState: AppState;

  /** The overlay manager for managing overlays */
  readonly overlayManager: OverlayManager;

  /** Trigger a widget rebuild */
  setState(fn?: () => void): void;

  /**
   * Widget-level action hooks. These are provided by AppShell to handle
   * actions that need access to widget internals (e.g., inputController,
   * TUI suspend/resume).
   */
  readonly hooks: ShortcutHooks;
}

/**
 * Optional hooks for widget-level actions that cannot be performed
 * with just AppState and OverlayManager.
 */
export interface ShortcutHooks {
  /** Show the command palette overlay. AppShell provides the builder. */
  showCommandPalette(): void;
  /** Show the shortcut help overlay. AppShell provides the builder. */
  showShortcutHelp(): void;
  /** Open current input text in $EDITOR (async TUI suspend) */
  openInEditor(): void;
  /** Navigate prompt history backward */
  historyPrevious(): void;
  /** Navigate prompt history forward */
  historyNext(): void;
}

/**
 * Category for grouping shortcuts in help displays.
 */
export type ShortcutCategory = 'general' | 'display' | 'navigation' | 'input';

/**
 * A registered shortcut entry: binding + metadata + action.
 */
export interface ShortcutEntry {
  /** Unique identifier for this shortcut (e.g., 'open-command-palette') */
  readonly id: string;

  /** The key combination that triggers this shortcut */
  readonly binding: ShortcutBinding;

  /** Human-readable description for help overlay and command palette */
  readonly description: string;

  /** Category for grouping in the help overlay */
  readonly category: ShortcutCategory;

  /** Display string for the key combination (e.g., 'Ctrl+O') */
  readonly displayKey: string;

  /**
   * Guard predicate -- if provided, the shortcut only fires when this
   * returns true. Used for context-sensitive shortcuts like '?' which
   * should not fire during processing or when overlays are open.
   */
  readonly enabled?: (ctx: ShortcutContext) => boolean;

  /**
   * The action to execute when the shortcut is triggered.
   * Returns 'handled' to stop propagation or 'ignored' to continue.
   */
  readonly action: (ctx: ShortcutContext, event: KeyEvent) => KeyEventResult;
}

/**
 * Centralized shortcut registry.
 *
 * Responsibilities:
 * - Stores all registered shortcuts
 * - Dispatches incoming KeyEvents to the matching shortcut
 * - Provides introspection for help overlays and command palette
 * - Detects conflicting bindings at registration time
 *
 * Usage:
 *   const registry = new ShortcutRegistry();
 *   registry.register({ ... });
 *   // In FocusScope.onKey:
 *   return registry.dispatch(event, context);
 */
export class ShortcutRegistry {
  private entries: Map<string, ShortcutEntry> = new Map();

  /**
   * Register a shortcut. Throws if the id is already registered.
   * Warns (via console.warn) if the binding conflicts with an existing entry.
   */
  register(entry: ShortcutEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(
        `ShortcutRegistry: duplicate id '${entry.id}'. `
        + `Each shortcut must have a unique identifier.`
      );
    }

    // Conflict detection: warn if another entry has the same binding
    const conflict = this.findConflict(entry.binding);
    if (conflict) {
      console.warn(
        `ShortcutRegistry: binding conflict — '${entry.id}' `
        + `(${entry.displayKey}) conflicts with '${conflict.id}' `
        + `(${conflict.displayKey}). Both will be registered; `
        + `the first matching enabled shortcut wins at dispatch time.`
      );
    }

    this.entries.set(entry.id, entry);
  }

  /**
   * Unregister a shortcut by id. Returns true if it was removed.
   */
  unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Dispatch a key event through all registered shortcuts.
   *
   * Iterates in registration order. The first entry whose binding matches
   * AND whose guard predicate (if any) returns true will have its action
   * invoked. Returns the action's result, or 'ignored' if no match.
   */
  dispatch(event: KeyEvent, ctx: ShortcutContext): KeyEventResult {
    for (const entry of this.entries.values()) {
      if (!matchesShortcut(event, entry.binding)) {
        continue;
      }
      if (entry.enabled && !entry.enabled(ctx)) {
        continue;
      }
      return entry.action(ctx, event);
    }
    return 'ignored';
  }

  /**
   * Return all registered entries, optionally filtered by category.
   * Used by ShortcutHelpOverlay and CommandPalette to build their displays
   * from a single source of truth.
   */
  getEntries(category?: ShortcutCategory): ReadonlyArray<ShortcutEntry> {
    const all = Array.from(this.entries.values());
    if (category) {
      return all.filter(e => e.category === category);
    }
    return all;
  }

  /**
   * Return entries grouped by category, in display order.
   */
  getGroupedEntries(): Map<ShortcutCategory, ReadonlyArray<ShortcutEntry>> {
    const order: ShortcutCategory[] = ['general', 'display', 'navigation', 'input'];
    const grouped = new Map<ShortcutCategory, ShortcutEntry[]>();

    for (const cat of order) {
      grouped.set(cat, []);
    }
    for (const entry of this.entries.values()) {
      const list = grouped.get(entry.category);
      if (list) {
        list.push(entry);
      }
    }
    return grouped;
  }

  /**
   * Look up a shortcut by id. Returns undefined if not found.
   */
  get(id: string): ShortcutEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Check if a binding conflicts with any already-registered entry.
   */
  private findConflict(binding: ShortcutBinding): ShortcutEntry | undefined {
    for (const entry of this.entries.values()) {
      if (
        entry.binding.key === binding.key &&
        (entry.binding.ctrl ?? false) === (binding.ctrl ?? false) &&
        (entry.binding.alt ?? false) === (binding.alt ?? false) &&
        (entry.binding.shift ?? false) === (binding.shift ?? false) &&
        (entry.binding.meta ?? false) === (binding.meta ?? false)
      ) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Number of registered shortcuts.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Remove all registered shortcuts.
   */
  clear(): void {
    this.entries.clear();
  }
}
