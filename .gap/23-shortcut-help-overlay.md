# Gap U01: "?" Shortcut Help Overlay -- Not Implemented

## Problem Statement

The bottom grid widget (`bottom-grid.ts`, lines 187-200) renders a hint that reads
`? for shortcuts` when the application is idle (not processing). The `?` character is
styled with the theme's `keybindColor` (mapped to `base.info`, typically cyan/blue),
clearly signaling to the user that pressing `?` will show available keyboard shortcuts.

However, pressing `?` does nothing. The keyboard handler in `app.ts` (lines 144-206,
inside the `FocusScope.onKey` callback) has no branch for the `?` key. No shortcut
help overlay widget exists anywhere in the codebase. This is a broken affordance --
the UI advertises functionality that does not exist.

## Affected Files

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts` | Renders the `? for shortcuts` hint text (lines 187-200) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | `AppStateWidget` keyboard handler in `FocusScope.onKey` (lines 144-206); overlay rendering logic (lines 272-350) |

## Current Keyboard Shortcuts (from `app.ts`)

These are the shortcuts already wired in the `FocusScope.onKey` handler:

| Shortcut | Action | Line |
|----------|--------|------|
| `Escape` | Dismiss overlays (file picker > command palette > permission dialog) | 146-160 |
| `Ctrl+O` | Open command palette | 163-166 |
| `Ctrl+C` | Cancel current operation | 169-171 |
| `Ctrl+L` | Clear conversation | 175-179 |
| `Alt+T`  | Toggle tool call expansion | 182-186 |
| `Ctrl+G` | Open prompt in `$EDITOR` (TODO -- not fully implemented) | 191-193 |
| `Ctrl+R` | Navigate prompt history backward (TODO -- partial) | 196-203 |

Additional shortcuts from `CommandPalette` (opened via `Ctrl+O`):

| Command | Action | Description |
|---------|--------|-------------|
| Clear conversation | `clear` | Remove all messages (`Ctrl+L`) |
| Toggle tool calls | `toggle-tools` | Expand/collapse all tool blocks (`Alt+T`) |
| Toggle thinking | `toggle-thinking` | Expand/collapse all thinking blocks |

## Proposed Solution

### 1. New Widget: `ShortcutHelpOverlay`

Create a new file at:
```
/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/shortcut-help-overlay.ts
```

This widget follows the exact same overlay pattern used by `CommandPalette`
(`command-palette.ts`) and `PermissionDialog` (`permission-dialog.ts`):

- `StatelessWidget` subclass
- Uses `FocusScope` with `autofocus: true` to capture keyboard input
- Renders a bordered `Container` with a theme-aware color scheme
- Accepts an `onDismiss` callback to close itself
- Listens for `Escape` or `?` to dismiss

#### Widget Structure

```typescript
// shortcut-help-overlay.ts -- Keyboard shortcut reference overlay
// Displayed when user presses "?" from the idle input state

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column, Row } from 'flitter-core/src/widgets/flex';
import { Container } from 'flitter-core/src/widgets/container';
import { Text } from 'flitter-core/src/widgets/text';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { Color } from 'flitter-core/src/core/color';
import { FocusScope } from 'flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { Padding } from 'flitter-core/src/widgets/padding';
import { BoxConstraints } from 'flitter-core/src/core/box-constraints';
import { Stack, Positioned } from 'flitter-core/src/widgets/stack';
import { AmpThemeProvider } from '../themes';
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';

/**
 * A single shortcut entry for display in the help overlay.
 */
interface ShortcutEntry {
  key: string;        // e.g. "Ctrl+O", "Escape", "?"
  description: string; // e.g. "Open command palette"
}

/**
 * A group of related shortcuts under a heading.
 */
interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

/**
 * The complete list of shortcut groups to display.
 * This is the single source of truth for all advertised shortcuts.
 */
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { key: '?',       description: 'Toggle this help overlay' },
      { key: 'Ctrl+O',  description: 'Open command palette' },
      { key: 'Ctrl+C',  description: 'Cancel current operation' },
      { key: 'Ctrl+L',  description: 'Clear conversation' },
      { key: 'Escape',  description: 'Dismiss overlay / cancel' },
    ],
  },
  {
    title: 'Display',
    shortcuts: [
      { key: 'Alt+T',   description: 'Toggle tool call expansion' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Ctrl+R',  description: 'Search prompt history' },
      { key: 'Ctrl+G',  description: 'Open prompt in $EDITOR' },
    ],
  },
  {
    title: 'Input',
    shortcuts: [
      { key: 'Enter',     description: 'Submit prompt' },
      { key: '@',          description: 'Trigger file autocomplete' },
      { key: '$ ...',      description: 'Shell mode (run command)' },
      { key: '$$ ...',     description: 'Background shell mode' },
    ],
  },
];

interface ShortcutHelpOverlayProps {
  onDismiss: () => void;
}

export class ShortcutHelpOverlay extends StatelessWidget {
  private readonly onDismiss: () => void;

  constructor(props: ShortcutHelpOverlayProps) {
    super({});
    this.onDismiss = props.onDismiss;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const infoColor = theme?.base.info ?? Color.cyan;
    const fgColor = theme?.base.foreground ?? Color.white;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const keybindColor = theme?.app.keybind ?? Color.blue;

    const side = new BorderSide({
      color: infoColor,
      width: 1,
      style: 'rounded' as any,
    });

    // Build the shortcut rows from SHORTCUT_GROUPS
    const contentChildren: Widget[] = [
      // Title
      new Text({
        text: new TextSpan({
          text: 'Keyboard Shortcuts',
          style: new TextStyle({ foreground: infoColor, bold: true }),
        }),
      }),
      new SizedBox({ height: 1 }),
    ];

    for (let gi = 0; gi < SHORTCUT_GROUPS.length; gi++) {
      const group = SHORTCUT_GROUPS[gi];

      // Group heading
      contentChildren.push(
        new Text({
          text: new TextSpan({
            text: group.title,
            style: new TextStyle({ foreground: fgColor, bold: true }),
          }),
        }),
      );

      // Shortcut rows
      for (const shortcut of group.shortcuts) {
        contentChildren.push(
          new Row({
            children: [
              // Fixed-width key column (padded to 12 chars for alignment)
              new SizedBox({
                width: 14,
                child: new Text({
                  text: new TextSpan({
                    text: shortcut.key,
                    style: new TextStyle({ foreground: keybindColor }),
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: shortcut.description,
                  style: new TextStyle({ foreground: mutedColor }),
                }),
              }),
            ],
          }),
        );
      }

      // Spacer between groups (except after the last one)
      if (gi < SHORTCUT_GROUPS.length - 1) {
        contentChildren.push(new SizedBox({ height: 1 }));
      }
    }

    // Footer hint
    contentChildren.push(new SizedBox({ height: 1 }));
    contentChildren.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Press ',
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
            new TextSpan({
              text: '?',
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: ' or ',
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: ' to close',
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          ],
        }),
      }),
    );

    return new Stack({
      fit: 'expand',
      children: [
        // Semi-transparent background mask (same as PermissionDialog)
        new Positioned({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          child: new Container({
            color: Color.rgba(0, 0, 0, 0.6),
          }),
        }),
        // Centered overlay
        new FocusScope({
          autofocus: true,
          onKey: (event: KeyEvent): KeyEventResult => {
            // Dismiss on Escape or pressing "?" again (toggle behavior)
            if (event.key === 'Escape' || event.key === '?') {
              this.onDismiss();
              return 'handled';
            }
            // Absorb all other keys while overlay is shown
            return 'handled';
          },
          child: new Column({
            mainAxisAlignment: 'center',
            crossAxisAlignment: 'center',
            children: [
              new Container({
                decoration: new BoxDecoration({ border: Border.all(side) }),
                padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
                constraints: new BoxConstraints({ maxWidth: 55 }),
                child: new Column({
                  mainAxisSize: 'min',
                  crossAxisAlignment: 'start',
                  children: contentChildren,
                }),
              }),
            ],
          }),
        }),
      ],
    });
  }
}
```

### 2. Wire Into `app.ts` -- State and Key Handler

Three changes are required in `app.ts`:

#### 2a. Add import

At the top of `app.ts`, alongside the existing overlay imports:

```typescript
import { ShortcutHelpOverlay } from './widgets/shortcut-help-overlay';
```

#### 2b. Add state field

In the `AppStateWidget` class, add a new boolean field next to the existing
overlay state booleans (`showCommandPalette`, `showFilePicker`):

```typescript
private showShortcutHelp = false;
```

#### 2c. Add `?` key handler

Inside the `FocusScope.onKey` callback, add a new branch **after** the existing
`Ctrl+R` handler (line 203) and **before** the final `return 'ignored'`
(line 205). The `?` key should only trigger when:
- No modifier keys are held (not Ctrl, Alt, Meta)
- The application is NOT currently processing a request
- No other overlay is already visible

```typescript
// ? — toggle shortcut help overlay
if (
  event.key === '?' &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.metaKey &&
  !appState.isProcessing &&
  !this.showCommandPalette &&
  !this.showFilePicker &&
  !appState.hasPendingPermission
) {
  this.setState(() => { this.showShortcutHelp = !this.showShortcutHelp; });
  return 'handled';
}
```

**Important guard**: The `?` key is a regular character key. The handler must
NOT intercept `?` when the `TextField` in `InputArea` has focus and the user
is typing. The `FocusScope.onKey` handler in `app.ts` runs at a parent level.
In practice, when the `TextField` is focused, character key events are consumed
by the text field's own handler and do not propagate up to the parent
`FocusScope`. This means the `?` handler will only fire when:
1. The input field is empty and the key event is not consumed by the text field,
   OR
2. Focus is not inside the text field (e.g., during processing when the text
   field is not rendered/focused).

If testing reveals that `?` is consumed by `TextField` even when the field is
empty, an alternative approach is to handle `?` only when `appState.isProcessing`
is false AND to check if the TextField is empty. However, the simpler approach
should work first given the FocusScope propagation model in flitter-core.

**Alternative guard (fallback)**: If the simple approach does not work because
the TextField always consumes `?`, modify `bottom-grid.ts` to change the hint
from `?` to `Ctrl+/` or `Ctrl+?`, and use a Ctrl-modified shortcut instead.
This avoids all conflicts with text input.

#### 2d. Add overlay to the render stack

In the `build()` method of `AppStateWidget`, add a new `else if` branch in the
overlay priority chain (after the `showFilePicker` block at line 349, before
the final `return`):

```typescript
} else if (this.showShortcutHelp) {
  result = new Stack({
    fit: 'expand',
    children: [
      mainContent,
      new Positioned({
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        child: new ShortcutHelpOverlay({
          onDismiss: () => {
            this.setState(() => { this.showShortcutHelp = false; });
          },
        }),
      }),
    ],
  });
}
```

#### 2e. Update Escape handler

The existing `Escape` handler (lines 146-160) should also dismiss the shortcut
help overlay. Add a new branch at the top of the Escape chain, before the
`showFilePicker` check:

```typescript
if (event.key === 'Escape') {
  if (this.showShortcutHelp) {
    this.setState(() => { this.showShortcutHelp = false; });
    return 'handled';
  }
  if (this.showFilePicker) {
    // ... existing code
```

### 3. Overlay Priority Order

After this change, the full overlay priority (highest to lowest) is:

1. **PermissionDialog** -- modal agent permission request (cannot be overridden)
2. **CommandPalette** -- `Ctrl+O` action palette
3. **FilePicker** -- `@` file mention picker
4. **ShortcutHelpOverlay** -- `?` shortcut reference

This matches the existing pattern where permission dialogs always take
precedence, and more transient overlays rank lower.

### 4. Design Decisions

| Decision | Rationale |
|----------|-----------|
| StatelessWidget (not StatefulWidget) | The overlay is purely presentational with no internal state. All content is static. Dismissal is handled by the parent. This matches the `CommandPalette` pattern. |
| Semi-transparent background mask | Matches `PermissionDialog` pattern (`Color.rgba(0, 0, 0, 0.6)`), providing visual separation from the main content beneath. |
| FocusScope with key absorption | The overlay's `FocusScope` captures all keys, returning `'handled'` for everything. This prevents key events from leaking to the input area or scroll view while the overlay is visible. Only `Escape` and `?` trigger dismissal. |
| Toggle behavior for `?` | Pressing `?` once opens the overlay; pressing it again closes it. This is intuitive and matches common help overlay UX patterns (e.g., GitHub, Gmail). |
| Grouped shortcut layout | Shortcuts are organized into semantic groups (General, Display, Navigation, Input) for quick scanning. This is more readable than a flat list. |
| Fixed key column width (14 chars) | Ensures all description text aligns consistently, making the overlay easy to scan. The longest key string is `Ctrl+G` (6 chars) but `$$ ...` is 6 chars too, so 14 gives comfortable padding. |
| `maxWidth: 55` constraint | Keeps the overlay compact and centered. Wide enough for the longest row (`Ctrl+G` + padding + `Open prompt in $EDITOR`) but not so wide it dominates the terminal. |
| Info color for border | Uses `theme.base.info` (cyan/blue family), matching the `CommandPalette` color and staying consistent with the `keybindColor` used for the `?` in the bottom hint. |

### 5. Testing Strategy

#### Unit Test: Widget renders correctly

```typescript
// shortcut-help-overlay.test.ts
import { ShortcutHelpOverlay } from './shortcut-help-overlay';

describe('ShortcutHelpOverlay', () => {
  it('should create without errors', () => {
    const overlay = new ShortcutHelpOverlay({
      onDismiss: () => {},
    });
    expect(overlay).toBeDefined();
  });

  it('should call onDismiss when Escape is pressed', async () => {
    // Use WidgetTester to pump the widget and simulate key events
    // Verify onDismiss is called
  });

  it('should call onDismiss when ? is pressed', async () => {
    // Use WidgetTester to simulate ? key press
    // Verify onDismiss is called (toggle behavior)
  });

  it('should absorb non-dismiss key events', async () => {
    // Simulate pressing 'a', 'Ctrl+L', etc.
    // Verify they return 'handled' but do not call onDismiss
  });
});
```

#### Integration Test: App-level toggle

```typescript
describe('App shortcut help overlay', () => {
  it('should show overlay when ? is pressed in idle state', async () => {
    // Create App with mock AppState (isProcessing: false)
    // Pump, simulate ? key, pump again
    // Verify ShortcutHelpOverlay is in the widget tree
  });

  it('should hide overlay when ? is pressed again', async () => {
    // Open overlay, then press ? again
    // Verify overlay is removed from the widget tree
  });

  it('should not show overlay when processing', async () => {
    // Create App with mock AppState (isProcessing: true)
    // Simulate ? key
    // Verify overlay does NOT appear
  });

  it('should not show overlay when another overlay is active', async () => {
    // Open CommandPalette first, then press ?
    // Verify ShortcutHelpOverlay does NOT appear
  });

  it('should dismiss via Escape', async () => {
    // Open overlay, press Escape
    // Verify overlay is dismissed
  });
});
```

### 6. Visual Mockup (ASCII)

When the user presses `?` from the idle state, the overlay appears centered
over the main content with a semi-transparent backdrop:

```
+----------------------------------------------------+
|                                                      |
|          +-- Keyboard Shortcuts ---------------+     |
|          |                                     |     |
|          | General                             |     |
|          | ?             Toggle this help       |     |
|          | Ctrl+O        Open command palette   |     |
|          | Ctrl+C        Cancel operation       |     |
|          | Ctrl+L        Clear conversation     |     |
|          | Escape        Dismiss overlay        |     |
|          |                                     |     |
|          | Display                             |     |
|          | Alt+T          Toggle tool calls     |     |
|          |                                     |     |
|          | Navigation                          |     |
|          | Ctrl+R         Search history        |     |
|          | Ctrl+G         Open in $EDITOR       |     |
|          |                                     |     |
|          | Input                               |     |
|          | Enter          Submit prompt         |     |
|          | @              File autocomplete     |     |
|          | $ ...          Shell mode            |     |
|          | $$ ...         Background shell      |     |
|          |                                     |     |
|          | Press ? or Esc to close             |     |
|          +------------------------------------- +     |
|                                                      |
+------------------------------------------------------+
| ? for shortcuts                        ~/project (m) |
+------------------------------------------------------+
```

### 7. File Inventory

| File | Action | Description |
|------|--------|-------------|
| `src/widgets/shortcut-help-overlay.ts` | **CREATE** | New `ShortcutHelpOverlay` widget |
| `src/app.ts` | **MODIFY** | Import overlay, add state, wire `?` key, add overlay to render stack, update Escape handler |
| `src/widgets/shortcut-help-overlay.test.ts` | **CREATE** | Unit and integration tests |

### 8. Estimated Complexity

- **New widget**: ~170 lines (following established overlay patterns exactly)
- **App changes**: ~25 lines across 5 insertion points
- **Tests**: ~80 lines
- **Risk**: Low. The pattern is identical to `CommandPalette` and `PermissionDialog`. The only novel aspect is handling a non-modified character key (`?`) which may conflict with `TextField` input -- the guard conditions and fallback strategy are documented above.
