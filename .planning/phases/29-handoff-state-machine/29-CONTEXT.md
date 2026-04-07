# Phase 29: Handoff State Machine — Context

## Requirements

| ID | Description | Source |
|----|-------------|--------|
| HAND-01 | Handoff state machine with enterHandoffMode/exitHandoffMode/submitHandoff/abortHandoffConfirmation | REQUIREMENTS.md |
| HAND-02 | Handoff countdown timer with "Auto-submitting in N..." UI and cancel capability | REQUIREMENTS.md |
| HAND-03 | Cross-thread handoff with sourceThreadID/targetThreadID tracking | REQUIREMENTS.md |

## AMP Implementation Analysis

### 1. HandoffState on TuiUIState (GhR)

AMP's `GhR` (main TUI state class) holds:

```js
handoffController = null;
handoffState = {
  isInHandoffMode: false,
  isGeneratingHandoff: false,
  isConfirmingAbortHandoff: false,
  pendingHandoffPrompt: null,
  spinner: null,
  countdownSeconds: null,
};
```

Key observations:
- `handoffController`: External controller object (nullable), wired to `resetUIState()` on thread switch
- `handoffState`: Plain object with 6 fields — all UI-facing flags
- `spinner`: Braille spinner animation object for generating state
- `countdownSeconds`: Nullable number for auto-submit countdown

### 2. HandoffState on ThreadWorker

AMP's ThreadWorker holds a separate `handoffState` BehaviorSubject:

```js
handoffState = new j0(void 0); // BehaviorSubject<{ goal: string } | undefined>
```

This is piped into the thread's `status` observable:
```js
status = this._state.pipe(
  switchMap(R => R === "active"
    ? combineLatest([inferenceState, fileChanges, ephemeralError, handoffState, ...])
      .pipe(map(([T,a,e,r,...]) => ({
        state: R,
        handoff: r,  // <-- handoff goal from ThreadWorker
        ...
      })))
    : of({ state: R })
  )
);
```

The `handoff` field in viewState indicates when a handoff is active on the worker level.

### 3. Handoff Lifecycle

**Enter handoff mode** (`enterHandoffMode` on GhR):
- Sets `handoffState.isInHandoffMode = true`
- Passed as callback to InputArea build context
- Wired to command palette "New thread (handoff)" or `@@` trigger

**Submit handoff** (submitting text while in handoff mode):
- Sets `isGeneratingHandoff = true`, starts spinner
- Calls `threadPool.createHandoff(goal, options)` which delegates to:
  - `threadWorkerService.handoff(deps, { threadID, goal, images, mode, agentMode, queuedMessages, ... })`
  - This creates a new thread worker, builds handoff content via `kET()`, posts as handoff message
- On completion: navigates to new thread via `legacyHandoffNavigation$`

**Abort handoff** (Escape while in handoff mode):
- First Escape: sets `isConfirmingAbortHandoff = true`
- Second Escape: calls `exitHandoffMode()`, resets all flags

**Exit handoff mode** (`exitHandoffMode` / `resetUIState`):
- Resets all handoffState fields to defaults
- Called on thread switch via `onThreadSwitch()` -> `handoffController?.resetUIState()`

### 4. Countdown Timer

- `countdownSeconds`: Starts at N (observed as configurable, often 10-30 seconds)
- Auto-decrements via `setInterval` every 1 second
- When reaches 0: auto-submits the handoff
- UI shows: "Auto-submitting in N..." in bottom-left of InputArea (handoffMode color)
- Typing cancels the countdown: "type to edit" hint shown

### 5. Cross-Thread Handoff (HAND-03)

- `threadWorkerService.handoff()` takes `threadID` (target) from current context
- Source thread is `this.threadID` on the worker executing the handoff
- `legacyHandoffNavigation$` subject emits navigation event to switch to target
- Thread pool's `createHandoff(R, T)` delegates to attached pool
- `getEmptyHandoffParentThreadID()` on active thread handle returns source thread ID when handoff context exists

### 6. UI Rendering

**Top-left overlay** (when `isInHandoffMode`):
- "handoff (submit a goal for the new thread)" in handoffMode color
- If `isGeneratingHandoff`: "handoff [spinner]" with braille spinner animation
- If generating: "Esc to cancel" in bottom-left

**Bottom-left overlay** (when has handoff parent, not in handoff mode):
- `countdownSeconds === null`: "Esc to abort handoff" or "Esc again to abort handoff"
- `countdownSeconds !== null`: "Auto-submitting in Ns" + "type to edit"

**Border color**: Uses default border color when `isGeneratingHandoff` is true (not focused color)

**Top-left context bar**: Hidden when `isInHandoffMode` is true (no token/cost display)

### 7. Processing State

`isProcessing()` on GhR includes handoff check:
```js
if (viewState.interactionState === "handoff") return true;
```

### 8. Agent Mode During Handoff

`canChangeAgentModeInPromptEditor()`:
```js
const { isInHandoffMode, isGeneratingHandoff } = this.handoffState;
return !hasMessages || isEditingFirst || (isInHandoffMode && !isGeneratingHandoff);
```
When in handoff mode (not generating), user CAN change agent mode.

## Current Flitter-CLI State

### Existing Handoff Support (Partial)

- `handoff-tool.ts`: Renders handoff tool calls with blink animation
- Theme colors: `handoffMode`, `handoffModeDim` defined
- Icon: `handoff` icon registered
- No `HandoffState` type in `types.ts`
- No handoff methods on `AppState`
- No handoff controller or countdown logic
- No cross-thread handoff tracking

### Files to Modify

| File | Changes |
|------|---------|
| `packages/flitter-cli/src/state/types.ts` | Add `HandoffState` interface, `HandoffMode` type |
| `packages/flitter-cli/src/state/app-state.ts` | Add handoff state machine methods |
| `packages/flitter-cli/src/state/thread-pool.ts` | Add `createHandoff()` with cross-thread tracking |

---
*Context created: 2026-04-07 | Source: AMP source analysis + REQUIREMENTS.md*
