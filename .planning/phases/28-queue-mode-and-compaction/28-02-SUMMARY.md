# Plan 28-02 Summary: Compaction System and Auto-Dequeue

## Status: COMPLETE

## What was implemented

Two interconnected features completing the queue mode / context management story:

1. **Auto-dequeue on turn completion (QUEUE-02)**: When the agentic loop completes with
   `stopReason === "end_turn"` and `queuedMessages.length > 0`, automatically dequeue
   and submit the next queued message. Matches AMP's `inference:completed` handler.

2. **Context compaction (COMP-01)**: When context window usage exceeds a configurable
   threshold (default 80%), trigger compaction that marks a `cutMessageId` boundary,
   tracks `compactionState` lifecycle, and logs `compaction_started` / `compaction_complete`.

## Tasks completed

### Task 1: CompactionState type and CompactionStatus interface
- Added `CompactionState` type union: `'idle' | 'pending' | 'compacting' | 'complete'`
- Added `CompactionStatus` interface with `compactionState`, `cutMessageId`, `usagePercent` fields
- Matches AMP's `getCompactionStatus()` -> `{ compactionState }` pattern
- Commit: `8a38dd7`

### Task 2: internal.compactionThresholdPercent in ConfigService
- Added `'internal.compactionThresholdPercent': z.number().min(0).max(100).optional()` to settingsSchema
- Exact match of AMP's `sKR` schema from `22_providers_reasoning_modes.js`
- Default value of 80 is applied by consumer, not in schema (matching AMP)
- Commit: `593abbe`

### Task 3: Auto-dequeue and compaction in PromptController
- Extended `PromptControllerOptions` with `getQueuedMessages`, `getContextUsagePercent`, `getCompactionThreshold` callbacks
- Added `_compactionState`, `_cutMessageId` private fields
- Added `getCompactionStatus()` public method matching AMP's RhR pattern
- Implemented auto-dequeue in `_agenticLoop()`: on `end_turn` + non-empty queue, `shift()` first message and `continue` loop
- Implemented `_checkCompaction()`: checks usage vs threshold, transitions `idle -> pending -> compacting -> complete`
- Updated `AppState.create()` to pass all callbacks and accept optional `configService`
- Commit: `7fc0d06`

### Task 4: ThreadPool compaction delegation
- Added `setCompactionStatusProvider()` and `getCompactionStatus()` to ThreadPool
- Matches AMP's `RhR.getCompactionStatus()` -> `activeProvider.getCompactionState()` delegation
- Wired in `AppState.create()`: `threadPool.setCompactionStatusProvider(() => controller.getCompactionStatus())`
- Commit: `c7bcc94`

### Task 5: Compaction and auto-dequeue tests
- Created `packages/flitter-cli/tests/state/compaction.test.ts` with 20 tests:
  - ConfigService compaction threshold: 4 tests (valid values, reject >100, reject <0, default undefined)
  - Auto-dequeue (QUEUE-02): 6 tests (dequeue on end_turn, no dequeue empty queue, no dequeue on max_tokens, FIFO shift, sequential dequeue, user message submission)
  - Compaction (COMP-01): 7 tests (initial idle, idle below threshold, complete above 80%, custom threshold, cutMessageId set, preserve 2 turns, idle without callback)
  - ThreadPool delegation: 3 tests (undefined without provider, delegates correctly, wiring verification)
- All 20 tests pass
- Commit: `22a66dc`

## AMP alignment

| AMP concept | Flitter implementation |
|---|---|
| `inference:completed` handler checks `queuedMessages.length > 0` | `_agenticLoop()` checks `stopReason === 'end_turn'` + `getQueuedMessages().length > 0` |
| `user:message-queue:dequeue` dispatch | `queue.shift()` + `session.reset()` + `session.startProcessing(next.text)` + `continue` |
| Only `end_turn` triggers dequeue (not `tool_use`) | Dequeue guard: `stopReason === 'end_turn'` |
| `internal.compactionThresholdPercent` z.number().min(0).max(100) | Exact same schema in `settingsSchema` |
| Default threshold 80% applied by consumer | `getCompactionThreshold?.() ?? 80` |
| `getCompactionStatus()` -> `{ compactionState }` | `getCompactionStatus(): CompactionStatus` |
| `compactionState`: idle/pending/compacting/complete | `CompactionState` type union |
| `cutMessageId` boundary marker | `_cutMessageId` in PromptController |
| `RhR.getCompactionStatus()` delegates to activeProvider | `ThreadPool.getCompactionStatus()` delegates via `_getCompactionStatus` callback |
| `DeferredThreadPool.getCompactionStatus()` delegates to attachedPool | Same delegation pattern |

## Files modified
- `packages/flitter-cli/src/state/types.ts` (CompactionState, CompactionStatus)
- `packages/flitter-cli/src/state/config-service.ts` (compactionThresholdPercent)
- `packages/flitter-cli/src/state/prompt-controller.ts` (auto-dequeue, compaction)
- `packages/flitter-cli/src/state/app-state.ts` (wiring callbacks, configService param)
- `packages/flitter-cli/src/state/thread-pool.ts` (compaction delegation)
- `packages/flitter-cli/tests/state/compaction.test.ts` (new, 20 tests)

## Verification
- TypeScript compilation: PASS (no new errors; all pre-existing errors unrelated to changes)
- Compaction tests: 20/20 pass
- Queue mode tests (28-01): 23/23 pass (no regression)
- All state tests: 90/90 pass (no regression)
