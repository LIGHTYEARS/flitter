# Phase 28: Queue Mode and Compaction - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — strict AMP alignment)

<domain>
## Phase Boundary

Implement message queue system and context compaction:
1. Queue mode state machine: `queuedMessages[]`, `isInQueueMode`, `enterQueueMode`/`exitQueueMode`/`submitQueue`/`interruptQueue`/`clearQueue`
2. Auto-dequeue on turn completion when `stop_reason === "end_turn"` and `queuedMessages.length > 0`
3. Context compaction with `compactionThresholdPercent` (80%), `compactionState`, `cutMessageId`, `compaction_started`/`compaction_complete` events

</domain>

<decisions>
## Implementation Decisions

### AMP Alignment (Non-Negotiable)
- Queue mode state machine matches AMP's `GhR.isInQueueMode` + ThreadWorker enqueue/dequeue events
- Auto-dequeue triggers in `inference:completed` when `stopReason === "end_turn"` and `queuedMessages.length > 0`
- `queuedMessages` stored on thread (ThreadHandle level)
- Compaction threshold defaults to 80% from `internal.compactionThresholdPercent` setting
- `cutMessageId` marks the oldest preserved message after compaction
- Compaction events: `compaction_started`, `compaction_complete`

### Architecture
- Queue state lives on ThreadHandle (per-thread queue)
- Queue UI state (`isInQueueMode`) on AppState (global UI concern)
- Compaction state on prompt-controller (it manages the agentic loop and knows context window usage)
- ConfigService gets `internal.compactionThresholdPercent` setting

</decisions>

<code_context>
## Key Files
- `packages/flitter-cli/src/state/app-state.ts` — add queue mode UI state
- `packages/flitter-cli/src/state/thread-handle.ts` — add queuedMessages
- `packages/flitter-cli/src/state/thread-pool.ts` — add queueMessage/discardQueuedMessages
- `packages/flitter-cli/src/state/prompt-controller.ts` — add auto-dequeue, compaction
- `packages/flitter-cli/src/state/types.ts` — QueuedMessage type, CompactionState type
- `packages/flitter-cli/src/state/config-service.ts` — compactionThresholdPercent setting

### AMP References
- `tmux-capture/amp-source/29_thread_worker_statemachine.js` — enqueue/dequeue events
- `tmux-capture/amp-source/20_thread_queue_handoff.js` — queue methods, compaction status
- `tmux-capture/amp-source/30_main_tui_state.js` — isInQueueMode UI state

</code_context>

<specifics>
User directive: "对齐 amp，禁止 subagent 自由发挥"

</specifics>

<deferred>
None

</deferred>
