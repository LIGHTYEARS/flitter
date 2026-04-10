---
phase: 39-align-flitter-cli-with-amp-44-gaps
plan: 03
subsystem: state, widgets
tags: [queue-auto-dequeue, smart-enqueue, edit-previous-message, app-state, app-shell]

# Dependency graph
requires:
  - phase: 39-align-flitter-cli-with-amp-44-gaps
    plan: 01
    provides: ThreadWorker state machine (isIdle/isRunning), ThreadPool.getOrCreateWorker()
provides:
  - enqueueMessage() on AppState with smart-enqueue-when-idle (immediate dequeue if worker idle)
  - editPreviousMessage hook wired in AppShellState (Up arrow populates InputArea with last user message)
  - 10 unit tests covering smart enqueue, FIFO dequeue, and queue operations
affects: [queue-responsiveness, conversation-replay, input-area-editing]

# Tech tracking
tech-stack:
  added: []
  patterns: [smart-enqueue-when-idle, edit-previous-message-truncation]

key-files:
  created:
    - packages/flitter-cli/tests/state/queue-auto-dequeue.test.ts
  modified:
    - packages/flitter-cli/src/state/app-state.ts
    - packages/flitter-cli/src/widgets/app-shell.ts

key-decisions:
  - "enqueueMessage wraps threadPool.queueMessage with idle check — only auto-dequeues when queuedMessages.length === 1 after push to prevent re-triggering"
  - "editPreviousMessage uses session.newThread() for edge case when user message is at index 0 since truncateAfter(-1) is a no-op"
  - "canEditPreviousMessage guards on empty input, idle lifecycle, and existence of user_message items"

patterns-established:
  - "Smart enqueue: push to queue, then check worker.isIdle && queue.length === 1 for immediate dequeue"
  - "Edit-previous-message flow: find last user_message -> truncateAfter(index-1) -> populate InputArea -> setCursor to end"

requirements-completed: [F2, F13]

# Metrics
duration: 15min
completed: 2026-04-10
---

# Plan 39-03: Queue Auto-Dequeue and Edit Previous Message Summary

**Add smart-enqueue-when-idle logic for queue auto-dequeue (F2) and wire editPreviousMessage hook in app-shell (F13)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-10
- **Completed:** 2026-04-10
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added `enqueueMessage()` method to AppState that wraps `threadPool.queueMessage()` with a smart-enqueue-when-idle check: when the worker is idle and the queue has exactly 1 message after adding, it immediately dequeues and calls `submitPrompt()`
- Wired `editPreviousMessage` and `canEditPreviousMessage` hooks in AppShellState's `_buildShortcutContext()`, connecting the Up arrow shortcut to find the last user_message, truncate subsequent items, and populate InputArea with the message text
- Created 10 unit tests across 3 describe blocks covering smart enqueue-when-idle, auto-dequeue FIFO order, and queue operations (interruptQueue, clearQueue)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add smart-enqueue-when-idle logic to AppState** - `6be1908` (feat)
2. **Task 2: Wire editPreviousMessage hook in app-shell** - `0073175` (feat)
3. **Task 3: Add queue auto-dequeue and smart enqueue tests** - `41936a1` (test)

## Files Created/Modified
- `packages/flitter-cli/src/state/app-state.ts` - Added `enqueueMessage(text, images?)` method that pushes to queue via `threadPool.queueMessage()`, then checks `worker.isIdle && queuedMessages.length === 1` for immediate dequeue and submission
- `packages/flitter-cli/src/widgets/app-shell.ts` - Added `_editPreviousMessage()` and `_canEditPreviousMessage()` private methods to AppShellState; wired both into hooks object in `_buildShortcutContext()`. The edit method iterates `session.items` backwards to find last `user_message`, calls `truncateAfter(index-1)` or `session.newThread()` for index 0, then sets `textController.text` and `cursorPosition`
- `packages/flitter-cli/tests/state/queue-auto-dequeue.test.ts` - 10 test cases across 3 describe blocks: smart enqueue-when-idle (4 tests), auto-dequeue on end_turn (3 tests), queue operations (3 tests)

## Decisions Made
- `enqueueMessage` placed on AppState (not ThreadPool) because it needs access to both `threadPool.queueMessage()` and `submitPrompt()`, which live at different layers
- The `queuedMessages.length === 1` guard prevents auto-dequeue from firing when accumulating multiple messages while worker is running (only the first message in an empty queue triggers immediate dequeue)
- For the edge case where the last user message is at index 0, `session.newThread()` is used instead of `truncateAfter(-1)` which would be a no-op due to bounds checking in SessionState
- `canEditPreviousMessage` checks three conditions: input text is empty, session lifecycle is 'idle', and at least one user_message exists in items

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TS6305 errors from flitter-core cross-package references; zero new errors from our changes
- Full test suite: 1208 pass / 10 fail (10 failures are all pre-existing, 0 new failures from this plan)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Queue mode is now fully responsive: messages enqueued while idle skip the queue and go straight to inference
- editPreviousMessage enables conversation replay, a core AMP interaction pattern
- The existing auto-dequeue on `end_turn` in prompt-controller.ts (lines 341-356) continues to work for chained queue processing

---
*Phase: 39-align-flitter-cli-with-amp-44-gaps*
*Plan: 03*
*Completed: 2026-04-10*
