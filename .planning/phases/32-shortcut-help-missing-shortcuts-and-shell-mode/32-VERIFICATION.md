---
phase: 32-shortcut-help-missing-shortcuts-and-shell-mode
verified: 2026-04-07T00:00:00Z
status: gaps_found
score: 8/10 requirements verified
gaps:
  - truth: "KEYS-05: @@ trigger opens thread picker for thread mentions"
    status: partial
    reason: "@@ detection exists in InputArea but onSpecialCommandTrigger callback is NOT wired in app-shell — trigger fires into the void"
    artifacts:
      - path: "packages/flitter-cli/src/widgets/input-area.ts"
        issue: "onSpecialCommandTrigger callback defined and fires on @@ detection (line 385-386)"
      - path: "packages/flitter-cli/src/widgets/app-shell.ts"
        issue: "No onSpecialCommandTrigger prop passed when constructing InputArea — callback unwired"
    missing:
      - "Wire onSpecialCommandTrigger in app-shell.ts InputArea construction to open thread picker"
  - truth: "SHELL-02: BashInvocationsWidget displayed in UI"
    status: partial
    reason: "BashInvocationsWidget exists with full implementation but is ORPHANED — not imported or used in app-shell or any other widget"
    artifacts:
      - path: "packages/flitter-cli/src/widgets/bash-invocations.ts"
        issue: "Widget class exists and is substantive (StatelessWidget, renders invocation rows), but zero imports outside its own file"
      - path: "packages/flitter-cli/src/widgets/app-shell.ts"
        issue: "No import of BashInvocationsWidget, no rendering of bash invocation list"
    missing:
      - "Import BashInvocationsWidget in app-shell.ts and render it when appState.bashInvocations.length > 0"
---

# Phase 32: Shortcut Help, Missing Shortcuts, and Shell Mode — Verification Report

**Phase Goal:** Inline shortcut help, register missing shortcuts, and implement shell mode with bash invocation tracking
**Verified:** 2026-04-07
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SHELP-01: Shortcut help renders inside InputArea as topWidget | VERIFIED | `ShortcutHelpInline` class in `shortcut-help-inline.ts`; wired as `topWidget` in `app-shell.ts:907-908`; old overlay marked `@deprecated` |
| 2 | SHELP-02: Exactly 12 shortcuts in 6 rows | VERIFIED | `SHORTCUT_HELP_DATA` in `shortcut-help-data.ts` — 6 entries with `left`+`right` = 12 shortcuts, matching AMP's C_R exactly |
| 3 | SHELP-03: Tmux detection + extended-keys hint | VERIFIED | `isTmux()` in `shortcut-help-inline.ts:39`; Shift+Enter -> Alt+Enter swap at line 105; extended-keys hint with tmux link at lines 136-157 |
| 4 | KEYS-01: Ctrl+V paste images | VERIFIED | `defaults.ts:202-211` — Ctrl+V registered, calls `ctx.hooks.pasteImage?.()` |
| 5 | KEYS-02: Shift+Enter / Alt+Enter newline | VERIFIED | `defaults.ts:216-222` — tmux-aware binding via `isTmux()`, calls `hooks.insertNewline?.()` |
| 6 | KEYS-03: Tab/Shift+Tab navigate messages | VERIFIED | `defaults.ts:232-257` — Tab + Shift+Tab registered, calls `hooks.navigateMessages?.('forward'/'backward')` |
| 7 | KEYS-04: ArrowUp edits previous message | VERIFIED | `defaults.ts:265-278` — ArrowUp registered, guarded by `canEditPreviousMessage?.()`, calls `editPreviousMessage?.()` |
| 8 | KEYS-05: @@ trigger opens thread picker | PARTIAL | `input-area.ts:384-386` detects `@@` and fires `onSpecialCommandTrigger`, BUT `app-shell.ts` does NOT pass this callback — unwired |
| 9 | SHELL-01: Shell mode with $ prefix detection + status indicator | VERIFIED | `detectShellMode()` in `input-area.ts:74`; `currentShellModeStatus` in `app-state.ts:113-114`; `setShellModeStatus()` at line 1130; wired in `app-shell.ts:911-916`; border indicator in `border-builders.ts:80-99` |
| 10 | SHELL-02: BashInvocationsWidget with tracking state | PARTIAL | `BashInvocation` type in `types.ts:660`; state fields in `app-state.ts:101-111`; `add/removeBashInvocation` methods at lines 1106-1125; `BashInvocationsWidget` in `bash-invocations.ts:44` — BUT widget is ORPHANED (not imported/rendered anywhere) |

**Score:** 8/10 requirements verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `widgets/shortcut-help-inline.ts` | ShortcutHelpInline widget | VERIFIED | 157 lines, full StatelessWidget, dual-column layout, tmux support |
| `widgets/shortcut-help-data.ts` | 12-shortcut data | VERIFIED | 60 lines, 6 ShortcutHelpPair entries = 12 shortcuts |
| `shortcuts/defaults.ts` | KEYS-01..04 bindings | VERIFIED | Ctrl+V, Shift/Alt+Enter, Tab/Shift+Tab, ArrowUp all registered |
| `widgets/input-area.ts` | @@ detection + shell mode | VERIFIED | onSpecialCommandTrigger callback + detectShellMode |
| `state/app-state.ts` | Shell mode + bash invocation state | VERIFIED | currentShellModeStatus, bashInvocations, pendingBashInvocations, timer maps, add/remove methods |
| `state/types.ts` | BashInvocation interface + ShellModeStatus | VERIFIED | Full interface with id, command, status, timestamps |
| `widgets/bash-invocations.ts` | BashInvocationsWidget | ORPHANED | Widget exists and is substantive, but not imported anywhere |
| `widgets/border-builders.ts` | Shell mode border indicator | VERIFIED | shellModeStatus prop, "shell mode" / "shell mode (incognito)" text rendering |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| app-shell.ts | ShortcutHelpInline | topWidget prop | WIRED | Line 907-908: conditionally passes `new ShortcutHelpInline(...)` |
| app-shell.ts | AppState.setShellModeStatus | onShellModeChange callback | WIRED | Line 911-913: callback maps mode to status |
| InputArea | onSpecialCommandTrigger | @@ detection | NOT WIRED | Detection at line 385 exists, but app-shell passes no callback |
| app-shell.ts | BashInvocationsWidget | import + render | NOT WIRED | No import, no rendering |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| shortcut-help-overlay.ts | 146 | @deprecated but file not removed | Info | Dead code; not blocking |

### Gaps Summary

Two partial gaps found:

1. **KEYS-05 (@@ thread picker)** — InputArea correctly detects `@@` and fires `onSpecialCommandTrigger`, but `app-shell.ts` never passes this callback when constructing InputArea. The trigger fires into the void. Fix: wire `onSpecialCommandTrigger` in app-shell to open thread picker.

2. **SHELL-02 (BashInvocationsWidget)** — The widget is fully implemented (`bash-invocations.ts`), the backing state exists (`bashInvocations`, `pendingBashInvocations`, `add/removeBashInvocation`), but the widget is never imported or rendered. It is orphaned infrastructure. Fix: import and render in app-shell when `appState.bashInvocations.length > 0`.

---

_Verified: 2026-04-07_
_Verifier: gsd-verifier_
