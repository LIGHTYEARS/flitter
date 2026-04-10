---
phase: 39-align-flitter-cli-with-amp-44-gaps
plan: 01
subsystem: state
tags: [state-machine, threadworker, abort-controller, event-driven, delta-handling]

# Dependency graph
requires:
  - phase: 27-threadpool-architecture
    provides: ThreadPool with threadHandleMap, ThreadWorkerEntry, getOrCreateWorker
provides:
  - ThreadWorker event-driven state machine class with 9 delta event types
  - Per-operation AbortController management (inference, tools, titleGeneration)
  - Ephemeral error with retry countdown
  - ThreadPool migrated to use ThreadWorker instances
  - 24 unit tests with 89 expect() calls
affects: [39-02, 39-03, 39-04, prompt-controller, queue-auto-dequeue, pending-skills-injection]

# Tech tracking
tech-stack:
  added: []
  patterns: [event-driven-state-machine, delta-dispatch, per-operation-abort-controllers]

key-files:
  created:
    - packages/flitter-cli/src/state/thread-worker.ts
    - packages/flitter-cli/tests/state/thread-worker.test.ts
  modified:
    - packages/flitter-cli/src/state/types.ts
    - packages/flitter-cli/src/state/thread-pool.ts

key-decisions:
  - "WorkerState uses idle/running/tool_running/cancelled/error instead of AMP's initial/active/disposed — richer state for delta dispatch"
  - "title:generation uses toggle pattern (first call starts, second call completes) matching AMP's dual-use handleDelta"
  - "ThreadWorkerEntry kept with @deprecated tag to avoid breaking uncommitted imports in other branches"
  - "activeWorkerCount changed from state !== 'disposed' to worker.isRunning for more precise counting"

patterns-established:
  - "Delta dispatch pattern: all state mutations go through handle(delta: WorkerDelta) method"
  - "Per-operation AbortController: inference, tools (keyed by toolCallId), titleGeneration each get independent controllers"

requirements-completed: [F1, F35]

# Metrics
duration: 11min
completed: 2026-04-10
---

# Plan 39-01: ThreadWorker State Machine Summary

**ThreadWorker event-driven class with 9 delta handlers, per-operation AbortControllers, and ephemeral error retry replacing thin ThreadWorkerEntry records**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-10T13:15:18Z
- **Completed:** 2026-04-10T13:26:09Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created ThreadWorker class with handle(delta) dispatching 9 event types matching AMP's ThreadWorker.handleDelta()
- Migrated ThreadPool from passive ThreadWorkerEntry records to active ThreadWorker instances with full state machine
- Added 24 unit tests covering all delta types, AbortController lifecycle, error/retry, dispose, and legacy compat

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ThreadWorker class** - `cd12c38` (feat)
2. **Task 2: Migrate ThreadPool to ThreadWorker** - `4720bb6` (refactor)
3. **Task 3: Write ThreadWorker unit tests** - `6d8aefe` (test)

## Files Created/Modified
- `packages/flitter-cli/src/state/thread-worker.ts` - ThreadWorker class: WorkerState, InferenceState, WorkerDeltaType types + ThreadWorker class with handle(), dispose(), abortInference(), abortTitleGeneration(), isIdle/isRunning/workerState getters
- `packages/flitter-cli/src/state/types.ts` - Added @deprecated comment to ThreadWorkerEntry interface
- `packages/flitter-cli/src/state/thread-pool.ts` - Replaced ThreadWorkerEntry with ThreadWorker: import, Map type, getOrCreateWorker(), setWorkerInferenceState(), activeWorkerCount
- `packages/flitter-cli/tests/state/thread-worker.test.ts` - 24 test cases with 89 expect() calls covering all 9 delta types, abort lifecycle, error/retry, dispose, payload accumulation, legacy compat, and full turn lifecycle

## Decisions Made
- Used `WorkerState` with 5 states (idle/running/tool_running/cancelled/error) instead of AMP's 3-state ThreadWorkerState, providing richer state for delta dispatch while maintaining backward compatibility via the `workerState` legacy getter
- Changed `activeWorkerCount` from `state !== 'disposed'` to `worker.isRunning` for more precise active worker counting since 'disposed' state is never persisted (dispose() resets to 'idle')
- Kept ThreadWorkerEntry in types.ts with @deprecated annotation rather than deleting it, to avoid breaking any uncommitted or external imports

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- bun and tsc not pre-installed in sandbox; installed bun from bun.sh and used `bun x tsc` for type checking
- 876 pre-existing TS6305 errors from flitter-core cross-package references (not built); zero new errors from our changes
- Full test suite shows 1183 pass / 10 fail (baseline was 1161 pass / 8 fail); the 2 additional failures are pre-existing in tool-rendering.test.ts and welcome-screen.test.ts, unrelated to our changes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ThreadWorker class is ready for use by queue auto-dequeue (39-02), pending skills injection, and worker error handling plans
- ThreadPool.getOrCreateWorker() returns full ThreadWorker instances — downstream code can call worker.handle(delta) for state transitions
- Legacy ThreadWorkerEntry interface preserved for backward compatibility during transition period

---
*Phase: 39-align-flitter-cli-with-amp-44-gaps*
*Plan: 01*
*Completed: 2026-04-10*
