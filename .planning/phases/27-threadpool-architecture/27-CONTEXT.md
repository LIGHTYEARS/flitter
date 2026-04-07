# Phase 27: ThreadPool Architecture - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — strict AMP alignment)

<domain>
## Phase Boundary

Replace the single-thread model (AppState → SessionState → ConversationState) with AMP's ThreadPool architecture:
1. ThreadPool class with `threadHandleMap` (Map<ThreadID, ThreadHandle>), `activeThreadContextID`, `threadBackStack[]`, `threadForwardStack[]`
2. Thread lifecycle: create (preserving existing state), switch (via activeThreadContextID), delete
3. Browser-style back/forward navigation across thread history
4. Thread title auto-generation from conversation content
5. ThreadList widget wired and rendered (currently dead code at `widgets/thread-list.ts`)
6. Thread preview split-view before switching
7. Thread worker pool with per-thread independent state machines

</domain>

<decisions>
## Implementation Decisions

### AMP Alignment (Non-Negotiable)
- ThreadPool class mirrors AMP's RhR class from `20_thread_management.js`
- Thread IDs use format "T-{uuid}"
- `threadHandleMap` is `Map<string, ThreadHandle>`
- `threadBackStack` / `threadForwardStack` for browser-style navigation
- `navigateBack()` pops from backStack, pushes current to forwardStack
- `navigateForward()` does the reverse
- `createThread` and `switchThread` both call `activateThread` with `recordNavigation: true`
- Recent threads capped at max 50
- ThreadHandle wraps per-thread SessionState + ConversationState
- Thread title auto-generation uses first user message content (truncated)
- Thread visibility modes (switchThreadVisibility)

### Architecture Mapping
- AMP's `gZR` (DeferredThreadPool) → Not needed (flitter doesn't have lazy init)
- AMP's `RhR` (DTW ThreadPool) → Our `ThreadPool` class
- AMP's `yZR` (ThreadHandle) → Our `ThreadHandle` interface/class
- AMP's ThreadWorker state machine → Per-thread independent worker managing inference/tools
- AMP's `threadService` persistence → Extend existing `SessionStore` for multi-thread

### Claude's Discretion
- Internal module structure (single file vs split across multiple files)
- Whether to use RxJS-style subjects or existing listener pattern
- Test organization

</decisions>

<code_context>
## Existing Code Insights

### Files to Modify/Extend
- `packages/flitter-cli/src/state/app-state.ts` — Replace single SessionState with ThreadPool
- `packages/flitter-cli/src/state/session.ts` — Per-thread instance (each thread gets its own SessionState)
- `packages/flitter-cli/src/state/conversation.ts` — Per-thread instance
- `packages/flitter-cli/src/state/types.ts` — Add ThreadPool/ThreadHandle types
- `packages/flitter-cli/src/state/session-store.ts` — Thread-aware persistence
- `packages/flitter-cli/src/widgets/thread-list.ts` — Wire existing dead code widget
- `packages/flitter-cli/src/state/overlay-ids.ts` — THREAD_LIST already registered (priority 50)

### AMP Reference Sources
- `tmux-capture/amp-source/20_thread_management.js` — Primary: RhR ThreadPool class, navigation, lifecycle
- `tmux-capture/amp-source/28_thread_pool_class.js` — gZR DeferredThreadPool
- `tmux-capture/amp-source/20_thread_queue_handoff.js` — Thread creation, switching
- `tmux-capture/amp-source/29_thread_worker_statemachine.js` — Per-thread worker
- `tmux-capture/amp-source/30_main_tui_state.js` — TUI state thread integration

### Established Patterns
- State changes via `_notifyListeners()` in AppState
- SessionStore uses atomic file writes (tmp+rename) at `~/.flitter-cli/sessions/`
- OverlayManager with priority-based layering
- ScreenState derived from session lifecycle state

</code_context>

<specifics>
## Specific Ideas

User directive: "对齐 amp，禁止 subagent 自由发挥" — all implementation must strictly follow AMP's observed behavior. No creative additions or deviations.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
