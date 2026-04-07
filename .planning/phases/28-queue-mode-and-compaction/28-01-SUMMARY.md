# Plan 28-01 Summary: Queue Mode State Machine

## Status: COMPLETE

## What was implemented

Queue mode state machine matching AMP's per-thread message queue architecture.
Allows users to enqueue follow-up messages while the assistant is processing,
then submit/discard/clear them as a batch.

## Tasks completed

### Task 1: QueuedMessage type + ThreadHandle extension
- Added `QueuedMessage` interface to `types.ts` with `id`, `text`, `queuedAt`, `images?` fields
- Extended `ThreadHandle` interface with `queuedMessages: QueuedMessage[]` field
- Updated `createThreadHandle()` factory to initialize `queuedMessages: []`
- Updated `AppState.create()` initialHandle to include `queuedMessages: []`
- Commit: `9dad2f4`

### Task 2: ThreadPool.queueMessage() / discardQueuedMessages()
- Added `queueMessage(text, images?)` method that delegates to active thread's queue
- Added `discardQueuedMessages()` method that clears active thread's queue
- Both methods match AMP's `gZR.queueMessage()` / `gZR.discardQueuedMessages()` delegation pattern
- Commit: `82018b8`

### Task 3: AppState queue mode UI state and operations
- Added `isInQueueMode: boolean = false` field (matches AMP's `GhR.isInQueueMode`)
- Added `enterQueueMode()` - idempotent enter, notifies listeners
- Added `exitQueueMode()` - sets false, discards queue, notifies
- Added `submitQueue()` - exits queue mode, dequeues first message, submits it
- Added `interruptQueue()` - removes first queued message
- Added `clearQueue()` - discards all messages, stays in queue mode
- Updated `switchToThread()` to call `exitQueueMode()` (AMP's `onThreadSwitch`)
- Updated `newThread()` to call `exitQueueMode()` (AMP's `startAndSwitchToNewThread`)
- Commit: `78b4d8a`

### Task 4: Queue mode tests
- Created `packages/flitter-cli/tests/state/queue-mode.test.ts`
- 23 tests covering all queue mode behavior:
  - QueuedMessage type shape (2 tests)
  - ThreadPool.queueMessage/discardQueuedMessages (8 tests)
  - AppState queue mode lifecycle (13 tests)
- All 23 tests pass
- Commit: `ec782d9`

## AMP alignment

| AMP concept | Flitter implementation |
|---|---|
| `thread.queuedMessages[]` | `ThreadHandle.queuedMessages: QueuedMessage[]` |
| `gZR.queueMessage(r)` delegates to active handle | `ThreadPool.queueMessage(text, images?)` |
| `gZR.discardQueuedMessages()` | `ThreadPool.discardQueuedMessages()` |
| `GhR.isInQueueMode = false` | `AppState.isInQueueMode = false` |
| `TuiUIState.enterQueueMode()` | `AppState.enterQueueMode()` |
| `TuiUIState.exitQueueMode()` | `AppState.exitQueueMode()` |
| `TuiUIState.submitQueue()` | `AppState.submitQueue()` |
| `onThreadSwitch() calls exitQueueMode()` | `switchToThread()`/`newThread()` call `exitQueueMode()` |

## Files modified
- `packages/flitter-cli/src/state/types.ts`
- `packages/flitter-cli/src/state/thread-handle.ts`
- `packages/flitter-cli/src/state/thread-pool.ts`
- `packages/flitter-cli/src/state/app-state.ts`
- `packages/flitter-cli/tests/state/queue-mode.test.ts` (new)

## Verification
- TypeScript compilation: PASS (no new errors; all pre-existing errors unrelated to queue mode)
- Queue mode tests: 23/23 pass
- Existing thread-pool tests: 17/17 pass (no regression)
- Existing thread-lifecycle tests: 18/18 pass (no regression)
