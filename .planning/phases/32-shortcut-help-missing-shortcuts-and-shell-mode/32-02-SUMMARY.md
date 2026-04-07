# Summary: Plan 32-02 — Register Missing Shortcuts

## Completed

All tasks completed successfully.

### ShortcutHooks Interface Update
Added 4 new optional methods to `ShortcutHooks` in `registry.ts`:
- `insertNewline?(): void` — KEYS-02
- `navigateMessages?(direction: 'forward' | 'backward'): void` — KEYS-03
- `editPreviousMessage?(): void` — KEYS-04
- `canEditPreviousMessage?(): boolean` — KEYS-04

### isTmux() Utility
Added `isTmux()` function to `defaults.ts` for KEYS-02 binding selection.

### New Shortcut Registrations

| ID | Shortcut | Description | Status |
|----|----------|-------------|--------|
| KEYS-01 | Ctrl+V | Paste images from clipboard | Registered, calls `hooks.pasteImage?.()` |
| KEYS-02 | Shift+Enter / Alt+Enter (tmux) | Insert newline | Registered, calls `hooks.insertNewline?.()` |
| KEYS-03 | Tab | Navigate to next message | Registered, calls `hooks.navigateMessages?.('forward')` |
| KEYS-03 | Shift+Tab | Navigate to previous message | Registered, calls `hooks.navigateMessages?.('backward')` |
| KEYS-04 | ArrowUp | Edit previous user message | Registered, guarded by `canEditPreviousMessage?.()` |

### KEYS-05: @@ Thread Picker
The @@ trigger is an InputArea text-level behavior (detected in text change handler), not a global shortcut. It is already handled by the `onSpecialCommandTrigger` prop pattern. No shortcut registration needed.

## Requirements Status
- KEYS-01: Done — Ctrl+V registered
- KEYS-02: Done — Shift+Enter / Alt+Enter registered with tmux detection
- KEYS-03: Done — Tab/Shift+Tab registered
- KEYS-04: Done — ArrowUp registered with canEdit guard
- KEYS-05: Done — @@ is text-level, already wired via InputArea

## Verification
- `npx tsc --noEmit` passes (no new errors)
