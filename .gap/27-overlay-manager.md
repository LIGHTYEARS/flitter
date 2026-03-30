# Gap U05: No Overlay Manager -- Ad-Hoc Stack/Positioned Priority Chain in App Widget

## Status: Proposal
## Affected packages: `flitter-core`, `flitter-amp`

---

## 1. Current Behavior Analysis

### 1.1 How Overlays Are Rendered Today

The `App` widget in `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` (lines 271-350) manages modal overlays through an imperative if/else-if chain that wraps the `mainContent` widget in a `Stack` + `Positioned` pair for whichever overlay is currently active:

```typescript
// Overlay priority: permission dialog > command palette > none
let result: Widget = mainContent;

if (appState.hasPendingPermission) {
  result = new Stack({ fit: 'expand', children: [
    mainContent,
    new Positioned({ top: 0, left: 0, right: 0, bottom: 0,
      child: new PermissionDialog({ ... }),
    }),
  ]});
} else if (this.showCommandPalette) {
  result = new Stack({ fit: 'expand', children: [
    mainContent,
    new Positioned({ top: 0, left: 0, right: 0, bottom: 0,
      child: new CommandPalette({ ... }),
    }),
  ]});
} else if (this.showFilePicker && this.fileList.length > 0) {
  result = new Stack({ fit: 'expand', children: [
    mainContent,
    new Positioned({ left: 1, bottom: 3,
      child: new FilePicker({ ... }),
    }),
  ]});
}
```

### 1.2 How Overlay State Is Tracked

Overlay visibility is split across two unrelated locations:

1. **`AppState` (external state)**: The `hasPendingPermission` boolean and `permissionRequest` getter live in `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts` (lines 60-66). This is driven by the ACP protocol and resolved via `resolvePermission()`.

2. **`AppStateWidget` (local widget state)**: The `showCommandPalette` and `showFilePicker` booleans are private fields on the `AppStateWidget` State class in `app.ts` (lines 76-78), toggled via `setState()` calls.

### 1.3 How Dismissal Works

The `Escape` key handler (lines 146-160) mirrors the render priority chain with its own if/else-if cascade:

```typescript
if (event.key === 'Escape') {
  if (this.showFilePicker) {
    this.setState(() => { this.showFilePicker = false; });
    return 'handled';
  }
  if (this.showCommandPalette) {
    this.setState(() => { this.showCommandPalette = false; });
    return 'handled';
  }
  if (appState.hasPendingPermission) {
    appState.resolvePermission(null);
    return 'handled';
  }
  return 'ignored';
}
```

Note: the Escape dismissal order (filePicker > commandPalette > permission) is inverted relative to the render priority (permission > commandPalette > filePicker). This is actually correct -- Escape should dismiss the most recently opened overlay first -- but the dual ordering is maintained manually and nothing enforces consistency.

### 1.4 How Individual Overlays Build Their Widget Trees

Each overlay independently constructs its own visual structure:

| Overlay | Background Mask | Positioning | Border Color Source | Focus |
|---------|----------------|-------------|---------------------|-------|
| `PermissionDialog` | `Color.rgba(0,0,0,0.6)` via Stack+Positioned | Centered (`Column mainAxisAlignment: center`) | `theme.base.warning` (yellow) | `FocusScope autofocus` |
| `CommandPalette` | None (no mask) | Top-center (`Column mainAxisAlignment: start`, SizedBox(height:2)) | `theme.base.info` (cyan) | `FocusScope autofocus` |
| `FilePicker` | None (no mask) | Bottom-left (`Column mainAxisAlignment: end`) | `theme.base.success` (green) | `FocusScope autofocus` |

All three share the same structural pattern -- a `FocusScope` wrapping a `Column` containing a bordered `Container` with a title `Text`, an optional `SizedBox` spacer, and a `SelectionList` -- but each re-implements it from scratch.

---

## 2. Problems

### 2.1 Scaling Failure

Every new overlay type requires modifications in three separate places inside `app.ts`:

1. A new boolean state field (`showNewOverlay`)
2. A new `else if` branch in the render priority chain (lines 274-350)
3. A new `if` branch in the Escape handler (lines 146-160)

Plus a new widget file that re-implements the same bordered-overlay pattern. Gaps 23 (ShortcutHelpOverlay) and 26 (Dialog class) both note the need to add yet more branches. Future overlays like confirmation dialogs, toast notifications, error modals, and search panels will each exacerbate this.

### 2.2 Duplicated Overlay Construction

The `Stack({ fit: 'expand', children: [mainContent, Positioned({ top:0, left:0, right:0, bottom:0, child: ... })] })` wrapper is repeated identically three times in the build method. Each overlay widget independently duplicates the bordered-container pattern (Container + BoxDecoration + Border.all + EdgeInsets + BoxConstraints + Column).

### 2.3 Inconsistent Priority Maintenance

The render priority chain (if/else-if order) and the Escape dismissal chain (if order) must be kept synchronized manually. There is no single declaration that defines "PermissionDialog is highest priority, FilePicker is lowest." A developer adding a new overlay must reason about both chains and insert their branches at the correct position in both.

### 2.4 Single-Overlay Limitation

The if/else-if chain is mutually exclusive -- only one overlay can be visible at a time. While this is correct for the current set (modals should not stack), the architecture does not support future requirements like:
- A toast notification appearing while a permission dialog is open
- A non-modal tooltip overlay coexisting with the command palette
- Multiple stacked modals (e.g., "Are you sure?" on top of a permission request)

### 2.5 State Fragmentation

Overlay state is scattered: `hasPendingPermission` lives in `AppState`, while `showCommandPalette` and `showFilePicker` live as local fields on `AppStateWidget`. A centralized overlay manager would unify visibility state into a single, inspectable structure.

---

## 3. Proposed Solution: `OverlayManager` + `OverlayEntry` Pattern

### 3.1 Architecture Overview

Introduce an `OverlayManager` class that maintains an ordered stack of overlay entries, each with a priority, a widget builder, and lifecycle callbacks. The App widget delegates overlay rendering to the manager, which produces the final `Stack` of overlay layers. This follows the Flutter `Overlay` / `OverlayEntry` pattern adapted for the terminal context.

```
                    OverlayManager
                    +-----------------------+
                    | entries: OverlayEntry[]|  (priority-sorted)
                    | show(entry)           |
                    | dismiss(id)           |
                    | dismissAll()          |
                    | topEntry              |  (highest visible)
                    | buildOverlays(base)   |  -> Stack widget
                    +-----------------------+
                           |
              +------------+------------+
              |            |            |
        OverlayEntry  OverlayEntry  OverlayEntry
        (permission)  (cmdPalette)  (filePicker)
        priority:100  priority:50   priority:25
        modal:true    modal:true    modal:false
```

### 3.2 `OverlayEntry` Type Definition

```typescript
// File: flitter-amp/src/state/overlay-manager.ts

import type { Widget } from 'flitter-core/src/framework/widget';

/**
 * Describes how an overlay is positioned within the viewport.
 *
 * - 'fullscreen': Positioned with top:0, left:0, right:0, bottom:0
 *   (used by PermissionDialog, CommandPalette)
 * - 'anchored': Positioned with specific edges (used by FilePicker
 *   which anchors to left:1, bottom:3)
 */
export type OverlayPlacement =
  | { type: 'fullscreen' }
  | { type: 'anchored'; left?: number; top?: number; right?: number; bottom?: number };

/**
 * Configuration for a single overlay layer.
 *
 * Each entry is a self-contained description of an overlay:
 * what to render, where to place it, whether it blocks
 * input to layers beneath, and what priority it has relative
 * to other overlays in the stack.
 */
export interface OverlayEntry {
  /** Unique identifier for this overlay (e.g., 'permission', 'commandPalette'). */
  readonly id: string;

  /**
   * Numeric priority. Higher values render on top and receive
   * Escape dismissal first. Suggested ranges:
   *   100+ : system modals (permission dialog)
   *   50-99: user-triggered modals (command palette, shortcut help)
   *   25-49: contextual popups (file picker, autocomplete)
   *   1-24 : passive/non-modal (toasts, status badges)
   */
  readonly priority: number;

  /**
   * Whether this overlay is modal. A modal overlay:
   * - Renders a semi-transparent background mask behind it
   * - Consumes all keyboard input not handled by its own FocusScope
   * - Prevents interaction with lower-priority overlays
   */
  readonly modal: boolean;

  /** How the overlay is positioned within the Stack. */
  readonly placement: OverlayPlacement;

  /**
   * Builder function that returns the overlay widget.
   * Called during each build cycle while the entry is active.
   * Receives an onDismiss callback that removes this entry.
   */
  readonly builder: (onDismiss: () => void) => Widget;
}
```

### 3.3 `OverlayManager` Class

```typescript
// Continuation of overlay-manager.ts

import { Stack, Positioned } from 'flitter-core/src/widgets/stack';
import { Container } from 'flitter-core/src/widgets/container';
import { Color } from 'flitter-core/src/core/color';
import type { StateListener } from './app-state';

/**
 * Manages a priority-ordered stack of overlay entries.
 *
 * The manager is a standalone observable (listener pattern matching AppState)
 * that can be owned by AppState or by the AppStateWidget directly. It holds
 * the source of truth for which overlays are visible and their ordering.
 *
 * Key behaviors:
 * - Entries are maintained in priority-sorted order (highest priority last
 *   so they paint on top in the Stack children list).
 * - show() adds or replaces an entry by id (idempotent).
 * - dismiss() removes an entry by id.
 * - dismissTop() pops the highest-priority entry (for Escape handling).
 * - buildOverlays() produces a Stack widget combining the base content
 *   and all active overlay entries.
 */
export class OverlayManager {
  private entries: OverlayEntry[] = [];
  private listeners: Set<StateListener> = new Set();

  // --- Listener Management (mirrors AppState pattern) ---

  addListener(listener: StateListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: StateListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --- Entry Management ---

  /**
   * Show an overlay. If an entry with the same id already exists,
   * it is replaced (updated). Entries are kept sorted by priority
   * ascending (lowest priority first = painted first = behind higher ones).
   */
  show(entry: OverlayEntry): void {
    // Remove existing entry with same id
    this.entries = this.entries.filter((e) => e.id !== entry.id);
    // Insert in priority-sorted position
    let insertIndex = this.entries.length;
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].priority > entry.priority) {
        insertIndex = i;
        break;
      }
    }
    this.entries.splice(insertIndex, 0, entry);
    this.notifyListeners();
  }

  /**
   * Dismiss (remove) an overlay by id.
   * No-op if the id is not found.
   */
  dismiss(id: string): void {
    const prevLength = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.entries.length !== prevLength) {
      this.notifyListeners();
    }
  }

  /**
   * Dismiss the highest-priority overlay. Used by the Escape key handler.
   * Returns the id of the dismissed entry, or null if no overlays are active.
   */
  dismissTop(): string | null {
    if (this.entries.length === 0) return null;
    const top = this.entries[this.entries.length - 1];
    this.entries = this.entries.slice(0, -1);
    this.notifyListeners();
    return top.id;
  }

  /**
   * Dismiss all overlays at once.
   */
  dismissAll(): void {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.notifyListeners();
  }

  /**
   * Whether any overlays are currently active.
   */
  get hasOverlays(): boolean {
    return this.entries.length > 0;
  }

  /**
   * The number of active overlays.
   */
  get count(): number {
    return this.entries.length;
  }

  /**
   * The highest-priority active entry, or null.
   */
  get topEntry(): OverlayEntry | null {
    return this.entries.length > 0
      ? this.entries[this.entries.length - 1]
      : null;
  }

  /**
   * Check whether a specific overlay is currently active.
   */
  has(id: string): boolean {
    return this.entries.some((e) => e.id === id);
  }

  /**
   * All active entries in priority order (ascending).
   * Returns a defensive copy.
   */
  get activeEntries(): readonly OverlayEntry[] {
    return [...this.entries];
  }

  // --- Widget Building ---

  /**
   * Build the final widget tree by layering all active overlays
   * on top of the base content widget.
   *
   * If no overlays are active, returns baseContent directly
   * (no unnecessary Stack wrapper).
   *
   * For each entry:
   * - If modal, a semi-transparent mask Positioned(all:0) is inserted
   *   before the overlay widget.
   * - The overlay widget is wrapped in a Positioned according to
   *   its placement config.
   *
   * Children order in the Stack: [base, mask1?, overlay1, mask2?, overlay2, ...]
   * with lower-priority entries first (painted behind higher ones).
   */
  buildOverlays(baseContent: Widget): Widget {
    if (this.entries.length === 0) {
      return baseContent;
    }

    const stackChildren: Widget[] = [baseContent];

    for (const entry of this.entries) {
      // Modal mask
      if (entry.modal) {
        stackChildren.push(
          new Positioned({
            top: 0, left: 0, right: 0, bottom: 0,
            child: new Container({
              color: Color.rgba(0, 0, 0, 0.6),
            }),
          }),
        );
      }

      // Overlay widget
      const overlayWidget = entry.builder(() => this.dismiss(entry.id));

      if (entry.placement.type === 'fullscreen') {
        stackChildren.push(
          new Positioned({
            top: 0, left: 0, right: 0, bottom: 0,
            child: overlayWidget,
          }),
        );
      } else {
        const { left, top, right, bottom } = entry.placement;
        stackChildren.push(
          new Positioned({
            left, top, right, bottom,
            child: overlayWidget,
          }),
        );
      }
    }

    return new Stack({
      fit: 'expand',
      children: stackChildren,
    });
  }
}
```

### 3.4 Integration Constants

Define well-known overlay ids and priorities as constants to prevent magic strings/numbers:

```typescript
// File: flitter-amp/src/state/overlay-ids.ts

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
 */
export const OVERLAY_PRIORITIES = {
  PERMISSION_DIALOG: 100,   // System modal -- always on top
  COMMAND_PALETTE: 50,      // User-triggered modal
  SHORTCUT_HELP: 50,        // User-triggered modal (same tier)
  FILE_PICKER: 25,          // Contextual popup
  TOAST: 10,                // Non-modal notification
} as const;
```

### 3.5 Refactored `App` Widget

The `AppStateWidget` class is transformed from managing overlay state directly to delegating to the `OverlayManager`:

```typescript
// Changes to app.ts -- key sections shown

class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private stateListener: (() => void) | null = null;
  private overlayManager = new OverlayManager();  // replaces individual booleans
  private fileList: string[] = [];
  private promptHistory = new PromptHistory();
  // ... (removed: showCommandPalette, showFilePicker booleans)

  override initState(): void {
    super.initState();
    // Listen to both AppState and OverlayManager changes
    this.stateListener = () => { /* existing throttled rebuild logic */ };
    this.widget.appState.addListener(this.stateListener);
    this.overlayManager.addListener(() => this.setState(() => {}));
  }

  // The key handler is simplified:
  private handleKey(event: KeyEvent, appState: AppState): KeyEventResult {
    // Escape -- dismiss the topmost overlay
    if (event.key === 'Escape') {
      if (this.overlayManager.hasOverlays) {
        const dismissedId = this.overlayManager.dismissTop();
        // If permission dialog was dismissed, resolve it
        if (dismissedId === OVERLAY_IDS.PERMISSION_DIALOG) {
          appState.resolvePermission(null);
        }
        return 'handled';
      }
      return 'ignored';
    }

    // Ctrl+O -- toggle command palette
    if (event.ctrlKey && event.key === 'o') {
      if (this.overlayManager.has(OVERLAY_IDS.COMMAND_PALETTE)) {
        this.overlayManager.dismiss(OVERLAY_IDS.COMMAND_PALETTE);
      } else {
        this.overlayManager.show({
          id: OVERLAY_IDS.COMMAND_PALETTE,
          priority: OVERLAY_PRIORITIES.COMMAND_PALETTE,
          modal: false,
          placement: { type: 'fullscreen' },
          builder: (onDismiss) => new CommandPalette({
            onExecute: (command: string) => {
              onDismiss();
              this.executeCommand(command);
            },
            onDismiss,
          }),
        });
      }
      return 'handled';
    }

    // ... other key handlers remain similar but use overlayManager.show/dismiss
    return 'ignored';
  }

  // The build method collapses from 80 lines to ~5 lines for overlays:
  build(): Widget {
    const appState = this.widget.appState;
    // ... (mainContent construction unchanged)

    // Sync permission dialog state from AppState into OverlayManager
    if (appState.hasPendingPermission && !this.overlayManager.has(OVERLAY_IDS.PERMISSION_DIALOG)) {
      const request = appState.permissionRequest!;
      this.overlayManager.show({
        id: OVERLAY_IDS.PERMISSION_DIALOG,
        priority: OVERLAY_PRIORITIES.PERMISSION_DIALOG,
        modal: true,
        placement: { type: 'fullscreen' },
        builder: (_onDismiss) => new PermissionDialog({
          request,
          onSelect: (optionId: string) => appState.resolvePermission(optionId),
          onCancel: () => appState.resolvePermission(null),
        }),
      });
    } else if (!appState.hasPendingPermission && this.overlayManager.has(OVERLAY_IDS.PERMISSION_DIALOG)) {
      this.overlayManager.dismiss(OVERLAY_IDS.PERMISSION_DIALOG);
    }

    // Single call replaces 80 lines of if/else-if Stack wrapping
    const result = this.overlayManager.buildOverlays(mainContent);

    return new AmpThemeProvider({
      theme: createAmpTheme(darkBaseTheme),
      child: result,
    });
  }
}
```

### 3.6 Handling the PermissionDialog Bridge

The `PermissionDialog` is unique because its visibility is driven by external state (`AppState.hasPendingPermission`) rather than a local toggle. The refactored `build()` method above shows the synchronization pattern: read `appState.hasPendingPermission` each build, and imperatively `show()`/`dismiss()` the overlay entry when the state changes. The `OverlayManager.show()` method is idempotent by id, so repeated calls during rebuilds are safe.

An alternative is to have `AppState` own a reference to the `OverlayManager` and call `show()`/`dismiss()` directly from `onPermissionRequest()` and `resolvePermission()`. This is cleaner but couples `AppState` to the overlay system. The synchronization approach in `build()` is recommended as the initial implementation to keep the layers decoupled.

---

## 4. Benefits of the Proposed Design

### 4.1 Single Source of Priority

Overlay priority is declared once in the `OverlayEntry.priority` field. The manager sorts entries by priority and both rendering order and Escape dismissal order are derived from this single declaration. No manual synchronization of two if/else chains is needed.

### 4.2 O(1) Overlay Addition

Adding a new overlay type requires:
1. Define a constant id and priority in `overlay-ids.ts` (2 lines)
2. Call `overlayManager.show({ ... })` wherever the overlay is triggered (5-10 lines)

No modifications to the build method's overlay rendering section. No new Escape handler branch.

### 4.3 Multi-Overlay Support

The manager naturally supports multiple simultaneous overlays. A toast notification (priority 10, modal: false) can coexist with a permission dialog (priority 100, modal: true). The Stack simply contains both, with the higher-priority overlay painted on top.

### 4.4 Testability

The `OverlayManager` is a plain TypeScript class with no widget dependencies in its state management. It can be unit-tested independently:

```typescript
describe('OverlayManager', () => {
  it('should maintain priority-sorted order', () => {
    const mgr = new OverlayManager();
    mgr.show({ id: 'low', priority: 10, modal: false,
               placement: { type: 'fullscreen' },
               builder: () => someWidget });
    mgr.show({ id: 'high', priority: 100, modal: true,
               placement: { type: 'fullscreen' },
               builder: () => someWidget });
    expect(mgr.topEntry!.id).toBe('high');
    expect(mgr.activeEntries[0].id).toBe('low');
  });

  it('dismissTop should remove highest priority entry', () => {
    const mgr = new OverlayManager();
    mgr.show({ id: 'a', priority: 50, ... });
    mgr.show({ id: 'b', priority: 100, ... });
    const dismissed = mgr.dismissTop();
    expect(dismissed).toBe('b');
    expect(mgr.topEntry!.id).toBe('a');
  });

  it('show with same id should replace existing entry', () => {
    const mgr = new OverlayManager();
    mgr.show({ id: 'x', priority: 50, ... });
    mgr.show({ id: 'x', priority: 75, ... });
    expect(mgr.count).toBe(1);
    expect(mgr.topEntry!.priority).toBe(75);
  });

  it('buildOverlays with no entries should return base widget', () => {
    const mgr = new OverlayManager();
    const base = new SizedBox({});
    expect(mgr.buildOverlays(base)).toBe(base);
  });

  it('modal entry should insert mask before overlay', () => {
    const mgr = new OverlayManager();
    mgr.show({ id: 'modal', priority: 100, modal: true,
               placement: { type: 'fullscreen' },
               builder: () => new SizedBox({}) });
    const result = mgr.buildOverlays(new SizedBox({}));
    // result is a Stack with 3 children: base, mask, overlay
    expect(result).toBeInstanceOf(Stack);
  });
});
```

### 4.5 Declarative Priority Documentation

The `overlay-ids.ts` constants file serves as a single-glance reference for all overlay types, their priorities, and the implicit layering order. New developers can understand the overlay system without reading the App widget's build method.

---

## 5. Relationship to Existing Gap Documents

### Gap 23 (Shortcut Help Overlay)

Gap 23 proposes adding a `ShortcutHelpOverlay` widget, which requires adding yet another boolean state field, another `else if` branch in the render chain, and another `if` branch in the Escape handler. Under the overlay manager design, this becomes:

```typescript
// In key handler:
if (event.key === '?' && !event.ctrlKey && !event.altKey) {
  if (this.overlayManager.has(OVERLAY_IDS.SHORTCUT_HELP)) {
    this.overlayManager.dismiss(OVERLAY_IDS.SHORTCUT_HELP);
  } else {
    this.overlayManager.show({
      id: OVERLAY_IDS.SHORTCUT_HELP,
      priority: OVERLAY_PRIORITIES.SHORTCUT_HELP,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss) => new ShortcutHelpOverlay({ onDismiss }),
    });
  }
  return 'handled';
}
// No changes needed in build() or Escape handler
```

### Gap 26 (Dialog Class)

Gap 26 proposes a `DialogOverlay` widget that consumes the unused `Dialog` data class. The overlay manager is orthogonal to and compatible with this: `DialogOverlay` would be a widget returned by an `OverlayEntry.builder`, and the `Dialog` data class would parameterize its content. The two proposals are complementary -- Gap 26 addresses "how to render a dialog widget" while this gap addresses "how to manage overlay lifecycle and layering."

---

## 6. Implementation Plan

### Step 1: Create `OverlayManager` and `OverlayEntry` (flitter-amp)

- File: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/overlay-manager.ts`
- Contains: `OverlayEntry` interface, `OverlayPlacement` type, `OverlayManager` class
- Pure TypeScript, no widget imports except in `buildOverlays()` which uses `Stack`, `Positioned`, `Container`
- Estimated: ~130 lines

### Step 2: Create `overlay-ids.ts` constants

- File: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/overlay-ids.ts`
- Contains: `OVERLAY_IDS` and `OVERLAY_PRIORITIES` constant objects
- Estimated: ~20 lines

### Step 3: Unit tests for `OverlayManager`

- File: `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/overlay-manager.test.ts`
- Test: show, dismiss, dismissTop, dismissAll, priority ordering, idempotent show, buildOverlays output, modal mask insertion, listener notification
- Estimated: ~120 lines

### Step 4: Refactor `AppStateWidget` in `app.ts`

- Remove `showCommandPalette` and `showFilePicker` boolean fields
- Add `overlayManager` instance field
- Wire overlay manager listener in `initState()` / `dispose()`
- Refactor key handler to use `overlayManager.show()` / `overlayManager.dismiss()` / `overlayManager.dismissTop()`
- Replace the 80-line if/else-if overlay chain in `build()` with the permission-dialog sync block + `overlayManager.buildOverlays(mainContent)` call
- Net change: ~40 lines removed, ~30 lines added

### Step 5: Verify existing overlay widgets are unchanged

- `PermissionDialog`, `CommandPalette`, `FilePicker` widget files require zero modifications. They remain self-contained `StatelessWidget` classes. Only the calling code in `app.ts` changes.

### Step 6: Integration test

- Test that the visual behavior (which overlay appears, Escape dismissal order, modal mask presence) is identical to the current implementation
- Use the existing `app-layout.test.ts` test infrastructure

---

## 7. Migration Path

The refactoring can be done incrementally:

1. **Phase A**: Introduce `OverlayManager` alongside the existing booleans. Have the `build()` method use the manager for rendering but keep the booleans as the triggers. This validates the rendering output matches.

2. **Phase B**: Replace the boolean triggers with `overlayManager.show()`/`dismiss()` calls. Remove the booleans.

3. **Phase C**: Simplify the Escape handler to a single `overlayManager.dismissTop()` call.

Each phase can be committed and tested independently, minimizing risk.

---

## 8. Alternatives Considered

### 8.1 InheritedWidget-Based Overlay Context

Instead of an explicit manager, overlays could be driven by an `InheritedWidget` that descendants use to push/pop overlays. This is the Flutter `Navigator`/`Overlay` pattern. However, in this terminal TUI context:
- The widget tree is shallow and the App widget already has direct access to all overlay triggers
- InheritedWidget adds complexity (context lookups, rebuild scoping) without clear benefit for ~5 overlay types
- The current project has InheritedWidget support but the pattern would be novel usage

**Verdict**: Over-engineered for the current scale. The explicit manager is simpler and sufficient.

### 8.2 State Machine for Overlay Transitions

A formal state machine (e.g., `idle -> permissionPending -> commandPaletteOpen`) could enforce valid overlay transitions. However:
- The current requirement is simple mutual exclusion for modals
- A state machine adds complexity for transitions that may never be needed
- The priority-sorted entry list already handles valid layering

**Verdict**: Premature. Can be layered on top of the manager if transition rules become complex.

### 8.3 Keep the Status Quo

The if/else-if chain works today. The argument against change is "if it ain't broke, don't fix it." However:
- Gap 23 (shortcut help) and Gap 26 (dialog class) will both add new overlays, directly exacerbating the scaling problem
- The existing code already has a subtle inconsistency (render vs. dismiss ordering)
- The refactoring is low-risk (< 200 lines changed) with clear maintainability benefits

**Verdict**: The cost of inaction compounds with each new overlay type.

---

## 9. Files Referenced in This Analysis

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | App widget with overlay rendering chain (lines 271-350) and Escape handler (lines 146-160) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts` | AppState with permission dialog state (lines 29-32, 60-66, 153-158, 187-193) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/permission-dialog.ts` | PermissionDialog overlay widget (119 lines) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/command-palette.ts` | CommandPalette overlay widget (89 lines) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/file-picker.ts` | FilePicker overlay widget (89 lines) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/stack.ts` | Stack and Positioned widget implementations (428 lines) |
| `/home/gem/workspace/flitter/.gap/23-shortcut-help-overlay.md` | Related gap: adds another overlay to the chain |
| `/home/gem/workspace/flitter/.gap/26-dialog-class.md` | Related gap: proposes DialogOverlay widget consumed by the overlay manager |
