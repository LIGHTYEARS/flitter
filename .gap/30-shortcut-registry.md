# Gap U08: No Centralized Shortcut Registry

## Problem Statement

All keyboard shortcuts in flitter-amp are hardcoded inside a single monolithic
`FocusScope.onKey` callback in `app.ts` (lines 144-206). This 62-line function
is a flat chain of `if (event.key === '...')` branches with inline action logic,
modifier checks, and early returns. There is no registry, no discovery mechanism,
no way for external code to introspect available shortcuts, and no path toward
user customization.

The problems this causes:

1. **No discovery.** The `ShortcutHelpOverlay` (gap U01) must duplicate the
   shortcut list as a separate `SHORTCUT_GROUPS` constant. If a shortcut is
   added or changed in the `onKey` handler, the help overlay silently goes stale.
   The `CommandPalette` (`command-palette.ts`, line 20-24) also maintains its own
   `COMMANDS` array with duplicate description strings like
   `'Remove all messages (Ctrl+L)'`. Three separate locations must stay in sync.

2. **No customization.** Users cannot rebind keys. Adding a config file or
   settings UI for keybindings would require parsing the monolithic handler,
   which is not structured data -- it is imperative code.

3. **No composition.** Widgets that want to contribute shortcuts (e.g., a future
   plugin system, or the `InputArea` adding its own bindings) cannot register
   them in a central location. Each widget must manage its own `FocusScope.onKey`
   independently, with no way to detect conflicts or list all active bindings.

4. **No conflict detection.** Adding a new shortcut requires manually reading
   every branch in the handler to verify the key combination is not already used.
   There is no programmatic check.

5. **Inline action logic.** Each branch contains the full action implementation
   (`appState.conversation.clear()`, `this.setState(() => {...})`, etc.) rather
   than calling named action functions. This makes the handler hard to test in
   isolation and tightly couples key bindings to state mutation code.

## Affected Files

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | Monolithic `FocusScope.onKey` handler (lines 144-206); overlay state management; all action implementations inlined |
| `/home/gem/workspace/flitter/packages/flitter-core/src/input/shortcuts.ts` | Existing `ShortcutBinding` interface and `matchesShortcut()` function -- the foundation to build on |
| `/home/gem/workspace/flitter/packages/flitter-core/src/input/events.ts` | `KeyEvent` and `KeyEventResult` types consumed by the handler |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/command-palette.ts` | Duplicate `COMMANDS` array (lines 20-24) with hardcoded shortcut descriptions |

## Current Monolithic Handler Analysis

The `onKey` handler at `app.ts:144-206` handles seven shortcut branches plus a
fallthrough. Here is the exact structure:

```
FocusScope.onKey(event):
  if Escape        -> dismiss overlays (file picker > command palette > permission)
  if Ctrl+O        -> this.setState(() => showCommandPalette = true)
  if Ctrl+C        -> this.widget.onCancel()
  if Ctrl+L        -> appState.conversation.clear(); this.setState()
  if Alt+T         -> appState.conversation.toggleToolCalls(); this.setState()
  if Ctrl+G        -> (stub, returns 'handled')
  if Ctrl+R        -> this.promptHistory.previous(); this.setState()
  return 'ignored'
```

Each branch directly accesses:
- `this.showFilePicker`, `this.showCommandPalette` (private widget state)
- `appState.hasPendingPermission`, `appState.conversation`, `appState.resolvePermission`
- `this.widget.onCancel`, `this.widget.onSubmit`
- `this.promptHistory`
- `this.setState()`

This means the action callbacks need a context object that provides access to
both the `AppState` and the `AppStateWidget`'s local overlay state.

## Existing Foundation in flitter-core

The file `flitter-core/src/input/shortcuts.ts` already provides:

```typescript
export interface ShortcutBinding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export function matchesShortcut(event: KeyEvent, binding: ShortcutBinding): boolean;
```

This is the correct low-level primitive. The registry builds on top of it,
adding metadata (description, category, enabled predicate) and a dispatch loop.

## Proposed Solution: `ShortcutRegistry`

### 1. Core Types

Create a new file at:
```
/home/gem/workspace/flitter/packages/flitter-amp/src/shortcuts/registry.ts
```

```typescript
// shortcuts/registry.ts -- Centralized shortcut registry for flitter-amp
//
// Provides registration, matching, dispatch, discovery, and conflict detection
// for all keyboard shortcuts. Replaces the monolithic FocusScope.onKey handler.

import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';
import { matchesShortcut, type ShortcutBinding } from 'flitter-core/src/input/shortcuts';

/**
 * Context provided to shortcut action callbacks.
 * Gives actions access to everything they need without importing
 * AppState or widget internals directly.
 */
export interface ShortcutContext {
  /** The full AppState instance */
  readonly appState: import('../state/app-state').AppState;

  /** Trigger a widget rebuild */
  setState(fn: () => void): void;

  /** Current overlay visibility (read-only for guard predicates) */
  readonly showCommandPalette: boolean;
  readonly showFilePicker: boolean;
  readonly showShortcutHelp: boolean;

  /** Mutators for overlay state */
  setCommandPalette(visible: boolean): void;
  setFilePicker(visible: boolean): void;
  setShortcutHelp(visible: boolean): void;

  /** External callbacks */
  readonly onCancel: () => void;

  /** Prompt history navigation */
  readonly promptHistory: import('../state/history').PromptHistory;
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
```

### 2. Default Shortcut Definitions

Create a separate file that registers all the built-in shortcuts:

```
/home/gem/workspace/flitter/packages/flitter-amp/src/shortcuts/defaults.ts
```

```typescript
// shortcuts/defaults.ts -- Built-in shortcut definitions for flitter-amp
//
// Single source of truth for all default keyboard shortcuts.
// Both the key handler (dispatch) and the help overlay (getEntries)
// read from this same registry.

import type { ShortcutRegistry, ShortcutContext } from './registry';
import type { KeyEventResult } from 'flitter-core/src/input/events';

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
      if (ctx.showShortcutHelp) {
        ctx.setShortcutHelp(false);
        return 'handled';
      }
      if (ctx.showFilePicker) {
        ctx.setFilePicker(false);
        return 'handled';
      }
      if (ctx.showCommandPalette) {
        ctx.setCommandPalette(false);
        return 'handled';
      }
      if (ctx.appState.hasPendingPermission) {
        ctx.appState.resolvePermission(null);
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
      ctx.setCommandPalette(true);
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
    // TODO: Full TUI suspend requires WidgetsBinding.suspend()/resume()
    action: (): KeyEventResult => {
      return 'handled';
    },
  });

  registry.register({
    id: 'history-previous',
    binding: { key: 'r', ctrl: true },
    displayKey: 'Ctrl+R',
    description: 'Search prompt history',
    category: 'navigation',
    action: (ctx): KeyEventResult => {
      const prev = ctx.promptHistory.previous();
      if (prev !== null) {
        // TODO: inject text into InputArea when TextEditingController is exposed
        ctx.setState(() => {});
      }
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
        !ctx.showCommandPalette &&
        !ctx.showFilePicker &&
        !ctx.appState.hasPendingPermission
      );
    },
    action: (ctx): KeyEventResult => {
      ctx.setShortcutHelp(!ctx.showShortcutHelp);
      return 'handled';
    },
  });
}
```

### 3. Re-export Barrel

```
/home/gem/workspace/flitter/packages/flitter-amp/src/shortcuts/index.ts
```

```typescript
export { ShortcutRegistry } from './registry';
export type { ShortcutEntry, ShortcutContext, ShortcutCategory } from './registry';
export { registerDefaultShortcuts } from './defaults';
```

### 4. Migration of `app.ts`

The `AppStateWidget` class in `app.ts` changes as follows:

#### 4a. New imports

```typescript
import { ShortcutRegistry, registerDefaultShortcuts } from './shortcuts';
import type { ShortcutContext } from './shortcuts';
```

#### 4b. New instance field

In `AppStateWidget`, add a registry field initialized in `initState()`:

```typescript
private shortcutRegistry = new ShortcutRegistry();
```

And in `initState()`:

```typescript
override initState(): void {
  super.initState();
  registerDefaultShortcuts(this.shortcutRegistry);
  // ... existing listener setup unchanged ...
}
```

#### 4c. Replace the monolithic onKey handler

The entire `FocusScope.onKey` callback (lines 144-206) is replaced with a
single dispatch call:

```typescript
onKey: (event: KeyEvent): KeyEventResult => {
  const ctx: ShortcutContext = {
    appState,
    setState: (fn) => this.setState(fn),
    showCommandPalette: this.showCommandPalette,
    showFilePicker: this.showFilePicker,
    showShortcutHelp: this.showShortcutHelp,
    setCommandPalette: (v) => this.setState(() => { this.showCommandPalette = v; }),
    setFilePicker: (v) => this.setState(() => { this.showFilePicker = v; }),
    setShortcutHelp: (v) => this.setState(() => { this.showShortcutHelp = v; }),
    onCancel: this.widget.onCancel,
    promptHistory: this.promptHistory,
  };
  return this.shortcutRegistry.dispatch(event, ctx);
},
```

This reduces the handler from 62 lines to 13 lines. All action logic moves
into the `defaults.ts` registration entries.

#### 4d. Wire ShortcutHelpOverlay to the registry

The `ShortcutHelpOverlay` (from gap U01) should receive the registry instead of
maintaining its own `SHORTCUT_GROUPS` constant:

```typescript
new ShortcutHelpOverlay({
  registry: this.shortcutRegistry,
  onDismiss: () => {
    this.setState(() => { this.showShortcutHelp = false; });
  },
}),
```

The overlay then calls `registry.getGroupedEntries()` to build its display,
ensuring the help text always matches the actual registered bindings.

#### 4e. Wire CommandPalette to the registry

The `CommandPalette` can derive its `COMMANDS` array from the registry:

```typescript
const commands = this.shortcutRegistry.getEntries()
  .filter(e => e.id !== 'dismiss-overlay') // Escape is not a "command"
  .map(e => ({
    label: e.description,
    value: e.id,
    description: e.displayKey,
  }));
```

This eliminates the duplicate `COMMANDS` constant in `command-palette.ts`.

### 5. Design Decisions

| Decision | Rationale |
|----------|-----------|
| Registry lives in flitter-amp, not flitter-core | The `ShortcutBinding` and `matchesShortcut` primitives belong in flitter-core (framework-level). The registry with categories, descriptions, and `ShortcutContext` is application-level concern specific to flitter-amp. |
| `ShortcutContext` interface instead of passing `AppStateWidget` directly | Decouples action callbacks from the widget implementation. Actions only see the context interface, making them testable with mock contexts. Also prevents actions from calling arbitrary widget methods. |
| Guard predicate (`enabled`) on individual entries | Some shortcuts (like `?`) are context-sensitive and should only fire under specific conditions. Embedding the guard in the entry keeps the dispatch loop simple and makes the conditions discoverable alongside the binding. |
| Registration order determines priority | When two entries have the same binding (e.g., both bound to Escape but with different guards), the first one registered that passes its guard wins. This is simple, deterministic, and matches the existing top-to-bottom priority in the `if/else` chain. |
| `id` field for each entry | Enables lookup, unregistration, and conflict reporting by name. Also used by `CommandPalette` to execute shortcuts by id rather than by simulating key events. |
| `displayKey` is a separate string, not computed | Key display names like `Ctrl+O` vs `^O` vs `C-o` are a presentation concern. Letting the registrant provide the display string avoids complex formatting logic and supports future localization. |
| Conflict detection warns but does not throw | Some conflicts are intentional (e.g., two entries on the same key with different `enabled` guards). Throwing would block legitimate use cases. A warning surfaces accidental conflicts during development. |
| `ShortcutCategory` is a union type, not an enum | Categories are a closed set used for display grouping. A string union is simpler than an enum and does not require imports at every usage site. |
| Separate `defaults.ts` from `registry.ts` | The registry class is generic infrastructure. The default bindings are application-specific configuration. Separating them allows the registry to be tested independently and makes it clear where to add new shortcuts. |

### 6. Future Extensibility

With the registry in place, several features become straightforward:

**User-customizable keybindings.** Load a `keybindings.json` config file at
startup, iterate its entries, and call `registry.unregister(id)` +
`registry.register({...overriddenBinding})` for each customization. The
`id` field provides stable identifiers across config file versions.

**Plugin-contributed shortcuts.** A plugin system can call
`registry.register()` to add its own shortcuts. The conflict detection
warns if the plugin's binding collides with a built-in shortcut.

**Dynamic enable/disable.** The `enabled` predicate is evaluated at dispatch
time, so shortcuts can become active or inactive based on runtime state
(e.g., a "submit" shortcut that only fires when the input area has text).

**Chords and sequences.** The registry's `dispatch()` method could be extended
to support multi-key sequences (e.g., `g g` for go-to-top) by maintaining
a pending-key buffer. The current single-key design does not preclude this.

**Keymap profiles.** Multiple sets of defaults (Vim, Emacs, default) can be
implemented as different `registerXxxShortcuts()` functions that populate
the registry with different bindings for the same set of action ids.

### 7. Testing Strategy

#### 7a. Unit Tests for `ShortcutRegistry`

```
/home/gem/workspace/flitter/packages/flitter-amp/src/shortcuts/__tests__/registry.test.ts
```

```typescript
import { describe, test, expect } from 'bun:test';
import { ShortcutRegistry } from '../registry';
import { createKeyEvent } from 'flitter-core/src/input/events';

function mockContext(overrides?: Partial<ShortcutContext>): ShortcutContext {
  return {
    appState: { /* minimal mock */ } as any,
    setState: () => {},
    showCommandPalette: false,
    showFilePicker: false,
    showShortcutHelp: false,
    setCommandPalette: () => {},
    setFilePicker: () => {},
    setShortcutHelp: () => {},
    onCancel: () => {},
    promptHistory: { previous: () => null, push: () => {} } as any,
    ...overrides,
  };
}

describe('ShortcutRegistry', () => {
  test('register and dispatch a simple shortcut', () => {
    const registry = new ShortcutRegistry();
    let fired = false;
    registry.register({
      id: 'test-shortcut',
      binding: { key: 'x', ctrl: true },
      displayKey: 'Ctrl+X',
      description: 'Test shortcut',
      category: 'general',
      action: () => { fired = true; return 'handled'; },
    });

    const event = createKeyEvent('x', { ctrlKey: true });
    const result = registry.dispatch(event, mockContext());

    expect(result).toBe('handled');
    expect(fired).toBe(true);
  });

  test('returns ignored when no shortcut matches', () => {
    const registry = new ShortcutRegistry();
    const event = createKeyEvent('z');
    expect(registry.dispatch(event, mockContext())).toBe('ignored');
  });

  test('throws on duplicate id', () => {
    const registry = new ShortcutRegistry();
    const entry = {
      id: 'dup',
      binding: { key: 'a' },
      displayKey: 'a',
      description: 'dup',
      category: 'general' as const,
      action: () => 'handled' as const,
    };
    registry.register(entry);
    expect(() => registry.register(entry)).toThrow(/duplicate id/);
  });

  test('enabled guard prevents dispatch', () => {
    const registry = new ShortcutRegistry();
    let fired = false;
    registry.register({
      id: 'guarded',
      binding: { key: '?' },
      displayKey: '?',
      description: 'Guarded',
      category: 'general',
      enabled: (ctx) => !ctx.showCommandPalette,
      action: () => { fired = true; return 'handled'; },
    });

    const event = createKeyEvent('?');

    // Guard passes: showCommandPalette = false
    registry.dispatch(event, mockContext({ showCommandPalette: false }));
    expect(fired).toBe(true);

    // Guard fails: showCommandPalette = true
    fired = false;
    const result = registry.dispatch(event, mockContext({ showCommandPalette: true }));
    expect(result).toBe('ignored');
    expect(fired).toBe(false);
  });

  test('unregister removes a shortcut', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'temp',
      binding: { key: 'q' },
      displayKey: 'q',
      description: 'Temp',
      category: 'general',
      action: () => 'handled',
    });
    expect(registry.size).toBe(1);
    expect(registry.unregister('temp')).toBe(true);
    expect(registry.size).toBe(0);
  });

  test('getEntries filters by category', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'a', binding: { key: 'a' }, displayKey: 'a',
      description: 'A', category: 'general',
      action: () => 'handled',
    });
    registry.register({
      id: 'b', binding: { key: 'b' }, displayKey: 'b',
      description: 'B', category: 'display',
      action: () => 'handled',
    });

    expect(registry.getEntries('general')).toHaveLength(1);
    expect(registry.getEntries('display')).toHaveLength(1);
    expect(registry.getEntries()).toHaveLength(2);
  });

  test('getGroupedEntries returns categories in display order', () => {
    const registry = new ShortcutRegistry();
    registry.register({
      id: 'nav', binding: { key: 'n' }, displayKey: 'n',
      description: 'Nav', category: 'navigation',
      action: () => 'handled',
    });
    registry.register({
      id: 'gen', binding: { key: 'g' }, displayKey: 'g',
      description: 'Gen', category: 'general',
      action: () => 'handled',
    });

    const grouped = registry.getGroupedEntries();
    const keys = Array.from(grouped.keys());
    expect(keys).toEqual(['general', 'display', 'navigation', 'input']);
    expect(grouped.get('general')).toHaveLength(1);
    expect(grouped.get('navigation')).toHaveLength(1);
    expect(grouped.get('display')).toHaveLength(0);
  });

  test('first matching entry wins on same binding', () => {
    const registry = new ShortcutRegistry();
    const order: string[] = [];

    registry.register({
      id: 'first',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'First',
      category: 'general',
      action: () => { order.push('first'); return 'handled'; },
    });
    registry.register({
      id: 'second',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'Second',
      category: 'general',
      action: () => { order.push('second'); return 'handled'; },
    });

    const event = createKeyEvent('Escape');
    registry.dispatch(event, mockContext());

    expect(order).toEqual(['first']);
  });

  test('skips disabled entry, dispatches to next match', () => {
    const registry = new ShortcutRegistry();
    const order: string[] = [];

    registry.register({
      id: 'disabled',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'Disabled',
      category: 'general',
      enabled: () => false,
      action: () => { order.push('disabled'); return 'handled'; },
    });
    registry.register({
      id: 'fallback',
      binding: { key: 'Escape' },
      displayKey: 'Esc',
      description: 'Fallback',
      category: 'general',
      action: () => { order.push('fallback'); return 'handled'; },
    });

    const event = createKeyEvent('Escape');
    registry.dispatch(event, mockContext());

    expect(order).toEqual(['fallback']);
  });
});
```

#### 7b. Integration Tests for Default Shortcuts

```
/home/gem/workspace/flitter/packages/flitter-amp/src/shortcuts/__tests__/defaults.test.ts
```

```typescript
import { describe, test, expect } from 'bun:test';
import { ShortcutRegistry } from '../registry';
import { registerDefaultShortcuts } from '../defaults';
import { createKeyEvent } from 'flitter-core/src/input/events';

describe('registerDefaultShortcuts', () => {
  test('registers all expected shortcuts without throwing', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    // Verify expected ids are registered
    expect(registry.get('dismiss-overlay')).toBeDefined();
    expect(registry.get('open-command-palette')).toBeDefined();
    expect(registry.get('cancel-operation')).toBeDefined();
    expect(registry.get('clear-conversation')).toBeDefined();
    expect(registry.get('toggle-tool-calls')).toBeDefined();
    expect(registry.get('open-editor')).toBeDefined();
    expect(registry.get('history-previous')).toBeDefined();
    expect(registry.get('toggle-shortcut-help')).toBeDefined();
  });

  test('every entry has a non-empty description and displayKey', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    for (const entry of registry.getEntries()) {
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.displayKey.length).toBeGreaterThan(0);
    }
  });

  test('Ctrl+L clears conversation via context', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let cleared = false;
    const ctx = mockContext({
      appState: {
        conversation: { clear: () => { cleared = true; } },
      } as any,
    });

    const event = createKeyEvent('l', { ctrlKey: true });
    const result = registry.dispatch(event, ctx);

    expect(result).toBe('handled');
    expect(cleared).toBe(true);
  });

  test('Ctrl+C calls onCancel', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    let cancelled = false;
    const ctx = mockContext({ onCancel: () => { cancelled = true; } });

    const event = createKeyEvent('c', { ctrlKey: true });
    registry.dispatch(event, ctx);

    expect(cancelled).toBe(true);
  });

  test('? shortcut is guarded by isProcessing', () => {
    const registry = new ShortcutRegistry();
    registerDefaultShortcuts(registry);

    const event = createKeyEvent('?');

    // While processing, ? should not fire
    const ctxBusy = mockContext({
      appState: { isProcessing: true, hasPendingPermission: false } as any,
    });
    expect(registry.dispatch(event, ctxBusy)).toBe('ignored');

    // When idle, ? should fire
    let helpToggled = false;
    const ctxIdle = mockContext({
      appState: { isProcessing: false, hasPendingPermission: false } as any,
      setShortcutHelp: () => { helpToggled = true; },
    });
    expect(registry.dispatch(event, ctxIdle)).toBe('handled');
    expect(helpToggled).toBe(true);
  });
});
```

#### 7c. App-level Regression Test

Ensure the migrated `app.ts` still passes the existing `app-layout.test.ts`
tests. The key verification: the `FocusScope.onKey` handler now delegates to
`ShortcutRegistry.dispatch()`, but the observable behavior (which overlays open,
which state changes occur) remains identical.

### 8. Migration Plan

The migration can be done in three atomic commits:

**Commit 1: Add `shortcuts/` module (no behavioral change)**
- Create `shortcuts/registry.ts`, `shortcuts/defaults.ts`, `shortcuts/index.ts`
- Create `shortcuts/__tests__/registry.test.ts` and `defaults.test.ts`
- All tests pass. No existing code is modified.

**Commit 2: Wire registry into `app.ts` (behavioral equivalence)**
- Import registry in `app.ts`
- Initialize registry in `initState()`
- Replace the `FocusScope.onKey` body with the dispatch call
- Verify all existing `app-layout.test.ts` tests still pass
- Verify manual testing: Escape, Ctrl+O, Ctrl+C, Ctrl+L, Alt+T, Ctrl+G, Ctrl+R

**Commit 3: Derive CommandPalette and ShortcutHelpOverlay from registry**
- Modify `CommandPalette` to accept the registry and derive `COMMANDS` from it
- Modify `ShortcutHelpOverlay` to accept the registry and derive groups from it
- Delete the hardcoded `COMMANDS` and `SHORTCUT_GROUPS` constants
- Single source of truth achieved

### 9. File Inventory

| File | Action | Description |
|------|--------|-------------|
| `src/shortcuts/registry.ts` | **CREATE** | `ShortcutRegistry` class, `ShortcutEntry` / `ShortcutContext` / `ShortcutCategory` types |
| `src/shortcuts/defaults.ts` | **CREATE** | `registerDefaultShortcuts()` -- all built-in shortcut definitions |
| `src/shortcuts/index.ts` | **CREATE** | Barrel re-exports |
| `src/shortcuts/__tests__/registry.test.ts` | **CREATE** | Unit tests for registry: register, dispatch, guard, conflict, introspection |
| `src/shortcuts/__tests__/defaults.test.ts` | **CREATE** | Integration tests for default shortcuts against mock context |
| `src/app.ts` | **MODIFY** | Import registry, init in `initState()`, replace `onKey` body with dispatch |
| `src/widgets/command-palette.ts` | **MODIFY** | Accept registry prop, derive `COMMANDS` from `registry.getEntries()` |
| `src/widgets/shortcut-help-overlay.ts` | **MODIFY** | Accept registry prop, derive groups from `registry.getGroupedEntries()` |

### 10. Estimated Complexity

- **`registry.ts`**: ~140 lines (class + types)
- **`defaults.ts`**: ~120 lines (8 shortcut registrations with full metadata)
- **`index.ts`**: ~4 lines (barrel)
- **`registry.test.ts`**: ~150 lines (10+ test cases)
- **`defaults.test.ts`**: ~80 lines (5+ integration test cases)
- **`app.ts` changes**: net -50 lines (remove 62-line handler, add 13-line dispatch + 5-line init)
- **`command-palette.ts` changes**: ~10 lines (accept registry, derive items)
- **`shortcut-help-overlay.ts` changes**: ~15 lines (accept registry, derive groups)
- **Total new code**: ~510 lines
- **Risk**: Low. The registry is a pure additive module. The migration in commit 2
  replaces imperative logic with equivalent declarative entries, verified by the
  existing test suite. No changes to flitter-core are required.
