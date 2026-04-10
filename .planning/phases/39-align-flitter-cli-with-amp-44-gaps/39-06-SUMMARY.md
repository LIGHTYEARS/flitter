---
phase: 39-align-flitter-cli-with-amp-44-gaps
plan: 06
status: complete
started: 2026-04-10
completed: 2026-04-10
---

## Summary

Plan 39-06 implements Queue UI display (F10), multi-option confirmation overlay (F11), and pending skills injection into the ThreadWorker pipeline (F14).

## Tasks Completed

### Task 1: QueuedMessagesList widget (F10)

- **Created** `packages/flitter-cli/src/widgets/queued-messages-list.ts`
  - `QueuedMessagesList` extends `StatelessWidget`
  - `QueuedMessagesListProps` with `messages: QueuedMessage[]` and `onInterrupt` callback
  - Renders a compact list with "Queued (N):" header (yellow) and numbered truncated message previews (brightBlack, max 50 chars)
  - Returns empty `SizedBox` when queue is empty
- **Modified** `packages/flitter-cli/src/widgets/app-shell.ts`
  - Imports `QueuedMessagesList`
  - Renders widget conditionally between bash invocations and InputArea when `activeThreadHandle.queuedMessages` is non-empty
  - Wires `onInterrupt` to filter messages from the thread handle

### Task 2: Multi-option ConfirmationOverlay (F11) + Pending Skills Injection (F14)

**F11 — ConfirmationOverlay multi-option:**
- **Modified** `packages/flitter-cli/src/widgets/confirmation-overlay.ts`
  - Extended `ConfirmationOverlayProps` with `options?: Array<{ label: string; keybind: string; callback: () => void }>`
  - Added `_options` private field and constructor wiring
  - Updated `build()` to render additional option buttons (cyan inverted-color style) after [y]/[n] when options provided
  - Updated key handler to check custom keybinds (case-insensitive) before absorbing keys
- **Modified** `packages/flitter-cli/src/state/app-state.ts`
  - Updated `showConfirmation()` signature to accept optional `options` array
  - Passes `options` through to `ConfirmationOverlay` builder

**F14 — Pending skills injection:**
- **Modified** `packages/flitter-cli/src/state/prompt-controller.ts`
  - Added `consumePendingSkills?: () => string | null` to `PromptControllerOptions`
  - Added `_consumePendingSkills` private field with constructor wiring
  - Injects pending skills as a system message at the start of `submitPrompt()` before `startProcessing()`
- **Modified** `packages/flitter-cli/src/state/app-state.ts`
  - Passes `consumePendingSkills: () => appState.consumePendingSkillsMessage()` when constructing `PromptController` in `AppState.create()`

## Verification

| Check | Result |
|-------|--------|
| `tsc --noEmit` | No new type errors (892 pre-existing from unbuilt flitter-core) |
| `bun test` | 1244 pass, 6 fail (pre-existing baseline; well under 10-failure threshold) |

## Files Changed

| File | Action |
|------|--------|
| `packages/flitter-cli/src/widgets/queued-messages-list.ts` | **Created** |
| `packages/flitter-cli/src/widgets/app-shell.ts` | Modified (import + render QueuedMessagesList) |
| `packages/flitter-cli/src/widgets/confirmation-overlay.ts` | Modified (multi-option support) |
| `packages/flitter-cli/src/state/prompt-controller.ts` | Modified (consumePendingSkills callback) |
| `packages/flitter-cli/src/state/app-state.ts` | Modified (options passthrough + consumePendingSkills wiring) |

## Architectural Notes

- QueuedMessagesList is a stateless widget that re-renders via AppShell state changes when the queue is modified
- The `onInterrupt` callback directly mutates the thread handle's `queuedMessages` array and triggers `setState()` on AppShell
- Pending skills injection uses the existing `addSystemMessage()` method on SessionState rather than a new `addInfoMessage()` method
- The `consumePendingSkills` callback follows the same pattern as other PromptControllerOptions callbacks (`getQueuedMessages`, `getContextUsagePercent`, etc.)
