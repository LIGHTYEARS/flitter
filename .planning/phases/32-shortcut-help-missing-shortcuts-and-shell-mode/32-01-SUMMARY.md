# Summary: Plan 32-01 — Rebuild Shortcut Help as Dual-Column Widget Embedded in InputArea

## Completed

All 5 tasks completed successfully.

### Task 1: shortcut-help-data.ts
Created `packages/flitter-cli/src/widgets/shortcut-help-data.ts` with:
- `ShortcutHelpPair` interface matching AMP's C_R structure
- `SHORTCUT_LEFT_COL_WIDTH = 27` constant (AMP's tq0)
- `SHORTCUT_HELP_DATA` array with exactly 6 rows, 12 shortcuts matching AMP C_R

### Task 2: ShortcutHelpInline widget
Created `packages/flitter-cli/src/widgets/shortcut-help-inline.ts`:
- StatelessWidget matching AMP's v9T
- Reads theme colors (app.keybind, base.foreground, base.border)
- Detects tmux via `process.env.TMUX`
- Dual-column layout with left/right alignment using SHORTCUT_LEFT_COL_WIDTH padding
- submitOnEnter=false transforms row 3 to "Ctrl/Cmd+Enter submit"
- tmux detection replaces "Shift+Enter" with "Alt+Enter" and appends extended-keys hint
- Trailing Expanded(Divider) separator

### Task 3: topWidget prop on InputArea
Added `topWidget?: Widget` prop to InputAreaProps and InputArea class.
When present, wraps `[topWidget, autocompleteWrapped]` in a Column inside the bordered container.

### Task 4: AppShell wiring
- Added `_isShowingShortcutsHelp` boolean state
- `_showShortcutHelp()` now toggles the inline state + setState() instead of OverlayManager
- InputArea receives `topWidget: isShowingShortcutsHelp ? new ShortcutHelpInline(...) : undefined`
- Escape and ? both dismiss inline help when shown (handled before registry dispatch)

### Task 5: ShortcutHelpOverlay deprecated
Added `@deprecated` JSDoc to ShortcutHelpOverlay class. Removed unused import from app-shell.ts.

## Requirements Status
- SHELP-01: Done — shortcut help renders inside InputArea, not as separate modal
- SHELP-02: Done — exactly 12 AMP shortcuts in 6 rows
- SHELP-03: Done — tmux detection shows Alt+Enter and extended-keys hint

## Verification
- `npx tsc --noEmit` passes (no new errors)
