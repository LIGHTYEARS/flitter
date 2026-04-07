# Phase 32: Shortcut Help, Missing Shortcuts, and Shell Mode

## Requirements

| ID | Description | Status |
|----|-------------|--------|
| SHELP-01 | Shortcut help renders inside InputArea (not as separate modal card), using dual-column layout (two shortcuts per row) | Pending |
| SHELP-02 | Shortcut help displays exactly 12 AMP shortcuts in 6 rows matching AMP data structure | Pending |
| SHELP-03 | Shortcut help detects tmux environment and shows extended-keys hint with link | Pending |
| KEYS-01 | Ctrl+V paste images shortcut registered and functional (image attachment flow) | Pending |
| KEYS-02 | Shift+Enter (non-tmux) / Alt+Enter (tmux) inserts newline in input area | Pending |
| KEYS-03 | Tab/Shift+Tab navigates between conversation messages | Pending |
| KEYS-04 | Up arrow edits previous user message in-place (editingMessageOrdinal, client_edit_message protocol) | Pending |
| KEYS-05 | @@ trigger opens thread picker for thread mentions | Pending |
| SHELL-01 | Shell mode with $ (foreground) and $$ (background) prefix detection, bashInvocations array, and shell mode status bar indicator | Pending |
| SHELL-02 | Bash invocation display widget (BashInvocationsWidget) showing running commands with show/hide timer and pendingBashInvocations map | Pending |

## AMP Architecture Analysis

### Shortcut Help (v9T)

AMP's shortcut help is **embedded inside InputArea** as a `topWidget` property, NOT rendered as a separate overlay:

```js
// In AMP's main build:
topWidget: this.isShowingShortcutsHelp ? new v9T({submitOnEnter: this.submitOnEnter}) : void 0
```

The `v9T` widget:
1. Reads from `C_R` — a static array of 6 dual-column entries (left + right per row = 12 shortcuts total)
2. Uses `tq0` constant (approx 27 chars) for left-column width alignment
3. Renders each row as a single `Text` with `TextSpan` children: `[keyLeft, " ", descLeft, padding, "  ", keyRight, " ", descRight]`
4. Colors: `app.keybind` for keys, `foreground dim` for descriptions
5. If tmux detected (`Fb()`) and not extended-keys (`!cFR`): replaces "Shift+Enter" with "Alt+Enter", appends tmux hint row
6. Ends with a horizontal divider (`$9T` = Divider with border color)

### C_R Data (11_shortcuts_data_C_R.js)

Exact AMP shortcut data — 6 rows, 12 shortcuts:
```
Row 1: Ctrl+O "command palette"          | Ctrl+R "prompt history"
Row 2: $ or $$ "shell commands"          | Ctrl+V "paste images"
Row 3: Shift+Enter "newline"             | Ctrl+S "switch modes"
Row 4: Alt+D "toggle deep reasoning"     | Alt+T "toggle thinking/dense view"
Row 5: Ctrl+G "edit in $EDITOR"          | Tab/Shift+Tab "navigate messages"
Row 6: @ / @@ "mention files/threads"    | ? "toggle this help"
```

When `submitOnEnter` is false, Row 3 left becomes "Ctrl/Cmd+Enter submit".
When tmux detected, "Shift+Enter" becomes "Alt+Enter".

### Shell Mode / Bash Invocations (AMP state)

AMP state fields:
- `bashInvocations: []` — array of active bash invocation objects
- `pendingBashInvocations: new Map` — pending invocations by ID
- `bashInvocationShownAt: new Map` — timestamp of when invocation was shown
- `bashInvocationRemoveTimers: new Map` — removal timers by ID
- `currentShellModeStatus: void 0` — "shell mode" or "shell mode (incognito)" status

Shell mode status is displayed as a top-left border overlay text:
```js
if (M) _.push({
  child: new pR({text: new F(M === "hidden" ? "shell mode (incognito)" : "shell mode", ...)}),
  position: "top-left"
});
```

## Current State in flitter-cli

### Shortcut Help
- `ShortcutHelpOverlay` is a **standalone modal overlay** shown via OverlayManager
- It renders as a bordered card with grouped categories (General, Display, Navigation, Input)
- This does NOT match AMP — AMP embeds it directly inside InputArea

### Missing Shortcuts
- Registered: Escape, Ctrl+O, Ctrl+C, Ctrl+L, Ctrl+Shift+C, Ctrl+S, Alt+T, Alt+D, Ctrl+G, Ctrl+R, ?
- Missing: Ctrl+V (paste images), Shift+Enter/Alt+Enter (newline), Tab/Shift+Tab (navigate messages), Up arrow (edit previous), @@ (thread picker)

### Shell Mode
- `detectShellMode()` exists in input-area.ts — returns 'shell' | 'background' | null
- Border color changes to cyan on shell mode
- Missing: bashInvocations tracking, shell mode status indicator, BashInvocationsWidget

## Key Files

| File | Role |
|------|------|
| `packages/flitter-cli/src/widgets/shortcut-help-overlay.ts` | Current overlay (to be replaced) |
| `packages/flitter-cli/src/widgets/input-area.ts` | InputArea with shell detection |
| `packages/flitter-cli/src/widgets/app-shell.ts` | Root shell, wires shortcuts and overlays |
| `packages/flitter-cli/src/shortcuts/defaults.ts` | Registered shortcuts |
| `packages/flitter-cli/src/shortcuts/registry.ts` | ShortcutRegistry + ShortcutContext |
| `packages/flitter-cli/src/state/app-state.ts` | AppState |
| `packages/flitter-cli/src/state/overlay-ids.ts` | Overlay ID constants |
| `packages/flitter-cli/src/themes/index.ts` | Theme colors (keybind, shellMode, etc.) |
| `tmux-capture/amp-source/04_shortcut_help_v9T.js` | AMP shortcut help widget |
| `tmux-capture/amp-source/11_shortcuts_data_C_R.js` | AMP shortcut data |
| `tmux-capture/screens/amp/shortcuts-popup/plain-63x244.golden` | Golden screenshot |
