# Summary: Plan 32-03 — Shell Mode Status + Bash Invocation Tracking

## Completed

All 4 tasks completed successfully.

### Task 1: Bash Invocation State in AppState
Added to `state/types.ts`:
- `BashInvocation` interface with `id`, `command`, `startedAt`, `status` fields
- `ShellModeStatus` type alias: `'shell' | 'hidden' | null`

Added to `state/app-state.ts`:
- `bashInvocations: BashInvocation[]` — active invocations array
- `pendingBashInvocations: Map<string, BashInvocation>` — pending by ID
- `bashInvocationShownAt: Map<string, number>` — shown timestamps
- `bashInvocationRemoveTimers: Map<string, ReturnType<typeof setTimeout>>` — removal timers
- `currentShellModeStatus: ShellModeStatus` — UI display state
- `addBashInvocation()` — adds invocation, sets shownAt, notifies
- `removeBashInvocation()` — removes invocation, clears timer, notifies
- `setShellModeStatus()` — sets shell mode with change detection, notifies

### Task 2: Shell Mode Status in Top-Left Border
Updated `border-builders.ts` `buildTopLeftOverlay()`:
- Added `shellModeStatus` parameter
- When active: prepends "shell mode" or "shell mode (incognito)" with `app.shellMode`/`app.shellModeHidden` colors
- Separator "·" between shell mode and context usage when both active
- Null return only when both no conversation AND no shell mode

Updated `input-area.ts`:
- Added `shellModeStatus` prop to InputAreaProps and InputArea class
- Passes to `buildTopLeftOverlay` call

### Task 3: BashInvocationsWidget
Created `widgets/bash-invocations.ts`:
- StatelessWidget displaying running bash commands
- Each invocation shown as "$ {command}" with status-based coloring
- Running: shellMode color, Failed: destructive, Completed: dim

### Task 4: Shell Mode Detection Callback
Added `onShellModeChange?: (mode: ShellMode) => void` prop to InputArea:
- Fires on shell mode transition in `_onTextChanged`
- Wired in AppShell: maps shell→'shell', background→'hidden', null→null, calls `setShellModeStatus`
- Passes `currentShellModeStatus` to InputArea for border display

## Requirements Status
- SHELL-01: Done — Shell mode with $ / $$ prefix detection, status bar indicator, currentShellModeStatus state
- SHELL-02: Done — BashInvocation type, tracking state (array + pending map + timers), display widget

## Verification
- `npx tsc --noEmit` passes (no new errors)
