# Analysis 39: Command Palette, Shortcut Overlay, and Modal Interaction Widgets

## 1. Inventory of Modal/Overlay Widgets

The flitter-amp TUI client contains four distinct overlay/modal widget types, plus two framework-level overlay primitives in flitter-core. Here is the complete inventory:

### 1.1 flitter-amp Overlay Widgets

| Widget | File | Purpose | Trigger |
|--------|------|---------|---------|
| `PermissionDialog` | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/permission-dialog.ts` | ACP agent permission request (modal) | `appState.hasPendingPermission` becomes true |
| `CommandPalette` | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/command-palette.ts` | Searchable action list overlay | `Ctrl+O` keyboard shortcut |
| `FilePicker` | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/file-picker.ts` | `@file` mention autocomplete picker | File-selection trigger (state-driven) |
| `Autocomplete` (inline) | Rendered within `InputArea` via flitter-core's `Autocomplete` widget | Trigger-character completion popup | Typing `@` in the input field |

### 1.2 flitter-core Framework Primitives

| Class/Widget | File | Role |
|--------------|------|------|
| `Dialog` (data class) | `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/dialog.ts` | Pure data holder for dialog configuration (title, type, buttons, dimensions). NOT a widget -- consumed by a shell layer. |
| `ContainerWithOverlays` | `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/container-with-overlays.ts` | Container that places child widgets at edges/corners using `Stack` + `Positioned`. Used for border-overlay badges. |
| `Stack` / `Positioned` | `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/stack.ts` | General-purpose layering primitive. All modals are built on this. |

---

## 2. The Shortcut Help System

### 2.1 The "?" Hint in the Status Area

When the application is idle (not processing), the bottom-left area below the input box displays the hint `? for shortcuts`. This is rendered in two places, one deprecated and one current:

**Current (BottomGrid)** -- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts`, lines 187-200:

```typescript
return new Text({
  text: new TextSpan({
    children: [
      new TextSpan({
        text: '?',
        style: new TextStyle({ foreground: keybindColor }),
      }),
      new TextSpan({
        text: ' for shortcuts',
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    ],
  }),
});
```

The `?` character is rendered in the theme's `keybind` color (typically blue) while ` for shortcuts` is rendered in the `mutedForeground` color with the `dim` attribute.

**Deprecated (StatusBar)** -- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/status-bar.ts`, lines 66-74, which uses the same pattern but is now marked `@deprecated` in favor of `BottomGrid`.

### 2.2 Missing: The Actual "?" Shortcut Handler

Critically, there is **no implementation of a `?` key handler** anywhere in the codebase. Searching for key event handlers that match `?` or `showShortcuts` or `helpOverlay` yields zero results. The `onKey` handler in `app.ts` (lines 144-205) handles:

- `Escape` -- dismiss overlays
- `Ctrl+O` -- open command palette
- `Ctrl+C` -- cancel operation
- `Ctrl+L` -- clear conversation
- `Alt+T` -- toggle tool call expansion
- `Ctrl+G` -- open prompt in `$EDITOR` (stub/TODO)
- `Ctrl+R` -- navigate prompt history

The `?` key is never intercepted. This means the hint `? for shortcuts` is purely a UI label referencing a shortcut overlay that **does not yet exist**. There is no shortcut help screen, no keyboard shortcut overlay widget, and no handler to show one.

### 2.3 Contextual Status Switching

When processing is active (`isProcessing === true`), the hint text changes to display `Esc to cancel` instead, with `Esc` highlighted in the keybind color. This swap happens in `BottomGrid.buildBottomLeft()` at lines 170-185. A custom `hintText` prop can also override the default display entirely.

---

## 3. How Modals Are Shown and Dismissed

### 3.1 State-Driven Conditional Rendering

All overlays use a state-driven conditional rendering pattern in `AppStateWidget.build()` (`/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`, lines 271-350). The approach is:

1. Build `mainContent` (the normal app layout wrapped in a `FocusScope`).
2. Check overlay state in priority order:
   - `appState.hasPendingPermission` -- show `PermissionDialog`
   - `this.showCommandPalette` -- show `CommandPalette`
   - `this.showFilePicker` -- show `FilePicker`
3. If an overlay is active, wrap `mainContent` in a `Stack` with the overlay as a `Positioned` child on top.

```typescript
// Overlay priority: permission dialog > command palette > none
let result: Widget = mainContent;

if (appState.hasPendingPermission) {
  result = new Stack({ fit: 'expand', children: [mainContent, new Positioned({...})] });
} else if (this.showCommandPalette) {
  result = new Stack({ fit: 'expand', children: [mainContent, new Positioned({...})] });
} else if (this.showFilePicker && this.fileList.length > 0) {
  result = new Stack({ fit: 'expand', children: [mainContent, new Positioned({...})] });
}
```

This is a **mutually exclusive overlay system** -- only one overlay can be shown at a time, with an explicit priority chain.

### 3.2 Opening Mechanisms

| Overlay | How It Opens |
|---------|-------------|
| `PermissionDialog` | Externally driven: the ACP client sets `appState.hasPendingPermission` to true when a permission request arrives. The `AppState` listener triggers a rebuild. |
| `CommandPalette` | User presses `Ctrl+O`. The `onKey` handler in the root `FocusScope` sets `this.showCommandPalette = true` inside `setState()`. |
| `FilePicker` | Set by `this.showFilePicker = true` via `setState()`. The trigger mechanism to populate `this.fileList` is not fully wired (marked with TODO comments). |

### 3.3 Dismissal Mechanisms

Each overlay widget accepts `onDismiss`/`onCancel` callbacks. Dismissal can happen through:

1. **Escape key at the root level** -- The root `FocusScope.onKey` handler checks for `Escape` and dismisses overlays in priority order (file picker > command palette > permission dialog), lines 146-160 of `app.ts`.

2. **Escape key within the overlay** -- Each overlay wraps its content in its own `FocusScope` with `autofocus: true`, and the inner `SelectionList` handles `Escape` to call its `onCancel` callback. This means there are two layers of Escape handling: the overlay's internal one and the app-level one.

3. **Selection completion** -- When the user selects an item (presses Enter on a `SelectionList` item), the `onSelect`/`onExecute` callback fires, which typically calls `setState(() => { this.showCommandPalette = false; })` or equivalent.

4. **External resolution** -- For `PermissionDialog`, calling `appState.resolvePermission(optionId)` or `appState.resolvePermission(null)` clears the pending permission, which triggers a state change notification and rebuild.

---

## 4. Keyboard Shortcut Registration and Handling

### 4.1 Architecture Overview

The keyboard event pipeline flows through three layers:

1. **EventDispatcher** (`/home/gem/workspace/flitter/packages/flitter-core/src/input/event-dispatcher.ts`) -- Receives raw terminal input and dispatches `KeyEvent` objects.

2. **FocusManager** (`/home/gem/workspace/flitter/packages/flitter-core/src/input/focus.ts`, line 397) -- Singleton that walks the focus tree from the primary-focused node upward, calling `handleKeyEvent()` on each `FocusNode` until one returns `'handled'`.

3. **FocusNode.handleKeyEvent()** (line 241) -- Calls the node's `onKey` handler first, then each registered key handler. Returns `'handled'` if any handler consumed the event.

The bubbling algorithm from `FocusManager.dispatchKeyEvent()`:

```typescript
dispatchKeyEvent(event: KeyEvent): KeyEventResult {
  let node: FocusNode | null = this.primaryFocus;
  while (node !== null) {
    const result = node.handleKeyEvent(event);
    if (result === 'handled') return 'handled';
    node = node.parent;
  }
  return 'ignored';
}
```

### 4.2 Shortcut Registration Pattern

There is **no centralized shortcut registry**. All keyboard shortcuts are registered implicitly through the `FocusScope.onKey` callback at the widget level. The pattern is:

```typescript
new FocusScope({
  autofocus: true,
  onKey: (event: KeyEvent): KeyEventResult => {
    if (event.ctrlKey && event.key === 'o') {
      // handle Ctrl+O
      return 'handled';
    }
    return 'ignored';
  },
  child: /* ... */,
});
```

This means:
- Shortcuts are scattered across widget `build()` methods.
- There is no declarative shortcut map or keybinding table.
- The effective shortcut for any given key depends on which `FocusScope` currently has (or is an ancestor of) the primary focus.
- The root-level app `FocusScope` in `app.ts` (line 142) acts as a catch-all for global shortcuts since it is the outermost `FocusScope` in the widget tree.

### 4.3 Complete Shortcut Catalog

From the root `FocusScope.onKey` in `app.ts`:

| Key Combination | Action | Status |
|----------------|--------|--------|
| `Escape` | Dismiss active overlay (priority: file picker, command palette, permission dialog) | Implemented |
| `Ctrl+O` | Open command palette | Implemented |
| `Ctrl+C` | Cancel current operation | Implemented |
| `Ctrl+L` | Clear conversation | Implemented |
| `Alt+T` | Toggle tool call expansion | Implemented |
| `Ctrl+G` | Open prompt in `$EDITOR` | Stub (TODO: requires TUI suspend/resume) |
| `Ctrl+R` | Navigate prompt history backward | Partially implemented (no InputArea integration) |
| `?` | Show shortcut help overlay | **Not implemented** (only hint text exists) |

From `SelectionList` (active within any overlay):

| Key | Action |
|-----|--------|
| `ArrowUp` / `k` | Move selection up |
| `ArrowDown` / `j` | Move selection down |
| `Tab` | Cycle forward |
| `Shift+Tab` | Cycle backward |
| `Ctrl+n` | Move next |
| `Ctrl+p` | Move previous |
| `Enter` | Confirm selection |
| `Escape` | Cancel/dismiss |

### 4.4 Command Palette Commands

The `CommandPalette` widget defines a static `COMMANDS` array:

```typescript
const COMMANDS: SelectionItem[] = [
  { label: 'Clear conversation', value: 'clear', description: 'Remove all messages (Ctrl+L)' },
  { label: 'Toggle tool calls', value: 'toggle-tools', description: 'Expand/collapse all tool blocks (Alt+T)' },
  { label: 'Toggle thinking', value: 'toggle-thinking', description: 'Expand/collapse all thinking blocks' },
];
```

These mirror the keyboard shortcuts but provide a discoverable interface. The command palette acts as a secondary discovery mechanism for shortcuts (the descriptions include the keyboard equivalents like `Ctrl+L` and `Alt+T`).

---

## 5. Z-Order and Overlay Rendering Approach

### 5.1 Stack-Based Layering

All overlays use the `Stack` widget with `fit: 'expand'` for full-screen coverage. The z-order is determined by child order in the `Stack.children` array -- later children paint on top of earlier ones.

The `RenderStack.paint()` method iterates children in order:

```typescript
paint(context: PaintContext, offset: Offset): void {
  for (const child of this.children) {
    child.paint(context, offset.add(child.offset));
  }
}
```

Since later children paint last, they overwrite earlier children's output in the screen buffer.

### 5.2 Full-Screen Overlay Positioning

Both `PermissionDialog` and `CommandPalette` use `Positioned({ top: 0, left: 0, right: 0, bottom: 0 })` to fill the entire screen. The `FilePicker` uses partial positioning with `Positioned({ left: 1, bottom: 3 })` to anchor near the input area.

### 5.3 Background Dimming

Only `PermissionDialog` implements a semi-transparent background mask:

```typescript
new Positioned({
  top: 0, left: 0, right: 0, bottom: 0,
  child: new Container({
    color: Color.rgba(0, 0, 0, 0.6),
  }),
}),
```

`CommandPalette` and `FilePicker` do **not** dim the background -- they just render on top of the existing content. This creates a visual distinction: `PermissionDialog` is a true modal (blocks and dims), while the others are lightweight overlays.

### 5.4 ContainerWithOverlays for Border Badges

The `ContainerWithOverlays` widget from flitter-core is a different overlay concept -- it places small text/widget badges at the edges and corners of a container's border. It groups overlays by `position` (top/bottom) and `alignment` (left/center/right), then uses `Stack` + `Positioned` internally. This is used by `InputArea` for mode labels, image attachment badges, and CWD/git info overlaid on the input box border.

---

## 6. Integration with the Focus System

### 6.1 Focus Stealing by Overlays

Each overlay widget wraps its interactive content in a `FocusScope({ autofocus: true })`. The `autofocus` property causes the overlay's focus node to request focus via a microtask in `FocusScopeState.initState()`:

```typescript
if (this.widget.autofocus && this.effectiveFocusNode.canRequestFocus) {
  queueMicrotask(() => {
    if (this.mounted && this.effectiveFocusNode.canRequestFocus) {
      this.effectiveFocusNode.requestFocus();
    }
  });
}
```

This means when an overlay appears, it grabs focus away from the input area (or wherever focus was). When the overlay is dismissed and removed from the widget tree, its `FocusNode` is disposed and unregistered from the `FocusManager`, which should allow focus to return to the previously focused node (though there is no explicit focus restoration mechanism visible in the code).

### 6.2 Nested FocusScope Hierarchy

The focus tree when an overlay is active looks like:

```
FocusManager.rootScope
  └── App FocusScope (root onKey handler for global shortcuts)
      ├── TextField FocusScope (input area -- currently unfocused)
      └── Overlay FocusScope (autofocus: true)
          └── SelectionList FocusScope (autofocus: true)
```

Key events bubble from `SelectionList` -> `Overlay FocusScope` -> `App FocusScope`. The `SelectionList` handles navigation keys (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`). If the `SelectionList` returns `'handled'` (e.g., for `Escape`), the event does not propagate further. If it returns `'ignored'`, the event continues bubbling up to the app-level handler.

### 6.3 Double Escape Handling

There is a subtle pattern: both the `SelectionList` inside an overlay and the app-level `FocusScope` handle `Escape`. When `Escape` is pressed in the command palette:

1. The `SelectionList`'s `FocusScope` catches it first and calls `onCancel` (which calls `onDismiss` on the palette).
2. `onDismiss` calls `setState(() => { this.showCommandPalette = false; })` which triggers a rebuild.
3. The app-level `Escape` handler would also try to handle it, but since `SelectionList` already returned `'handled'`, the event never reaches the app level.

This is correct behavior -- the inner handler takes priority due to the focus tree bubbling algorithm.

### 6.4 Focus During Permission Dialogs

When a `PermissionDialog` is active, the permission dialog's `FocusScope` steals focus. However, the `PermissionDialog` also renders a semi-transparent mask over the entire screen, visually indicating that background content is not interactive. The app-level `Escape` handler still has a fallback for dismissing permissions (`appState.resolvePermission(null)`), but it would only fire if the dialog's internal `SelectionList` did not consume the Escape event first.

---

## 7. Code Patterns and Observations

### 7.1 Consistent Widget Construction Pattern

All three overlay widgets (`PermissionDialog`, `CommandPalette`, `FilePicker`) follow an identical structural pattern:

1. `StatelessWidget` with constructor accepting callbacks (`onSelect`/`onExecute` + `onDismiss`/`onCancel`).
2. Themed border using `BoxDecoration` with `Border.all()` and a semantically-colored `BorderSide` (warning=yellow for permission, info=cyan for command palette, success=green for file picker).
3. A title `Text` widget at the top.
4. A `SelectionList` for interactive item selection.
5. Wrapped in `FocusScope({ autofocus: true })`.
6. Constrained width via `BoxConstraints({ maxWidth: N })`.

This is a strong, consistent pattern that could be extracted into a reusable `OverlayDialog` base widget.

### 7.2 The Dialog Data Class is Unused

The `Dialog` class in flitter-core (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/dialog.ts`) is a pure data class with no rendering logic. Its documentation states it is "consumed by the application shell to render overlay dialogs," but there is no shell renderer that consumes it. The amp overlay widgets (PermissionDialog, CommandPalette, FilePicker) do not use the `Dialog` class at all -- they directly construct their own widget trees. The `Dialog` class appears to be a forward-looking abstraction that is not yet connected to the overlay system.

### 7.3 No Overlay Manager

There is no centralized overlay/modal manager. Overlay visibility is tracked via simple boolean flags (`showCommandPalette`, `showFilePicker`) and checked imperatively in `build()`. The mutually exclusive priority is enforced by `if/else if` chaining. This works for a small number of overlays but would become unwieldy with more.

### 7.4 Autocomplete is Architecturally Different

The `Autocomplete` widget (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/autocomplete.ts`) takes a fundamentally different approach from the three overlay widgets:

- It is embedded inline within the widget tree (inside `InputArea`), not overlaid via `Stack`.
- It uses a `Column` to place the options list above the input field.
- It manages its own text detection logic (trigger character scanning with fuzzy matching).
- It supports async option builders.
- It does NOT use `Stack`/`Positioned` at all -- options appear above the input in the normal document flow.

This means the autocomplete popup can be clipped or pushed off-screen if the available space is insufficient, unlike the `Stack`-based overlays which use absolute positioning.

### 7.5 Missing "?" Shortcut Implementation

The most notable gap is that the `? for shortcuts` hint advertises a feature that does not exist. Implementing it would require:

1. A new `ShortcutOverlay` widget (following the `CommandPalette` pattern).
2. A static data structure listing all available shortcuts.
3. A `?` key handler in the app-level `FocusScope.onKey` (being careful not to conflict with text input -- `?` should only trigger when the input field does not have focus or is empty).
4. Adding it to the overlay priority chain in `app.ts`.

### 7.6 Theme Integration

All overlay widgets use `AmpThemeProvider.maybeOf(context)` to retrieve colors. The theme system defines a `keybind` color in `AmpAppColors` (line 57 of `amp-theme-data.ts`) specifically for keyboard shortcut hints, demonstrating that the theme was designed with shortcut display in mind. Each overlay type uses a different semantic color for its border:

- `PermissionDialog`: `theme.base.warning` (bright yellow)
- `CommandPalette`: `theme.base.info` (cyan)
- `FilePicker`: `theme.base.success` (green)

### 7.7 No Animation or Transition

Overlay appearance and disappearance is immediate -- there are no fade, slide, or transition effects. The overlay is either in the widget tree or not, determined by the boolean flags in the `build()` method. This is consistent with TUI conventions where smooth animation is not typically expected.

### 7.8 Positioning Differences

Each overlay has a distinct positioning strategy reflecting its purpose:

- `PermissionDialog`: Vertically and horizontally centered (`mainAxisAlignment: 'center'`, `crossAxisAlignment: 'center'`) with a full-screen dimming mask.
- `CommandPalette`: Top-center aligned (`mainAxisAlignment: 'start'`, `crossAxisAlignment: 'center'`) with a 2-row spacer from the top.
- `FilePicker`: Bottom-left aligned (`mainAxisAlignment: 'end'`, `crossAxisAlignment: 'start'`) to appear near the input area, with explicit `left: 1, bottom: 3` positioning.

### 7.9 SelectionList as the Universal Interaction Primitive

Every modal/overlay in the system uses `SelectionList` as its sole interaction mechanism. There are no text inputs in overlays (no search/filter in the command palette), no checkboxes, no multi-select. The `SelectionList` provides a consistent vim-compatible navigation interface (`j`/`k`, `Ctrl+n`/`Ctrl+p`) that works across all overlays. This creates a unified interaction model but limits the complexity of overlay interactions.

---

## 8. Summary

The flitter-amp overlay system is a straightforward, state-driven approach built on the `Stack`/`Positioned` primitives from flitter-core. Three overlay widgets share an identical structural pattern, all using `SelectionList` for keyboard-navigable item selection. The focus system's tree-based key event bubbling naturally handles the interaction between nested `FocusScope` widgets in overlays and the app-level shortcut handlers.

The main architectural gap is the absence of a shortcut help overlay despite the UI advertising `? for shortcuts`. The `Dialog` data class in flitter-core exists but is not connected to any rendering pipeline. A centralized overlay manager and the advertised shortcut help screen are the two most obvious next steps for this subsystem.
