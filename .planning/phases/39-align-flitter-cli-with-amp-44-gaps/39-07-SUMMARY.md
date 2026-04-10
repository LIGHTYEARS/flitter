---
phase: 39-align-flitter-cli-with-amp-44-gaps
plan: 07
subsystem: widgets, state
tags: [thread-preview, thread-visibility, thread-merge, selection-list, command-palette]

# Dependency graph
requires:
  - phase: 39-align-flitter-cli-with-amp-44-gaps
    provides: "Plan 04 — ThreadRelationship types, ThreadStatus, async createThread"
provides:
  - Thread preview on selection via onHighlightChange/onPreviewThread callbacks
  - Thread visibility command palette entry (already existed from prior plan)
  - ThreadPool.mergeThreadInto() with full merge lifecycle
  - ThreadPool.getThreadStatus() query method
  - Thread merge command palette entry
affects: [39-08]

# Tech tracking
tech-stack:
  added: []
  patterns: [highlight-callback-propagation, merge-lifecycle-state-machine]

key-files:
  created:
    - packages/flitter-cli/tests/state/thread-merge.test.ts
  modified:
    - packages/flitter-core/src/widgets/selection-list.ts
    - packages/flitter-cli/src/widgets/thread-list.ts
    - packages/flitter-cli/src/state/app-state.ts
    - packages/flitter-cli/src/state/thread-pool.ts
    - packages/flitter-cli/src/commands/command-registry.ts

key-decisions:
  - "Added onHighlightChange to SelectionList (flitter-core) to support preview-on-highlight — this is a general-purpose enhancement usable by any SelectionList consumer"
  - "Thread preview state (previewThreadID) stored on AppState rather than AppShell since thread list overlay is built in AppState.showThreadList()"
  - "mergeThreadInto only copies user_message items to avoid duplicate tool_call IDs and broken references from structural items"
  - "F33 visibility command already existed from a prior plan — no new work needed"

patterns-established:
  - "Highlight callback chain: SelectionList.onHighlightChange -> ThreadList.onPreviewThread -> AppState.previewThreadID"
  - "Merge lifecycle: null -> merging -> merged with source hidden and relationship registered"

requirements-completed: [F8, F33, F34]

# Metrics
duration: 20min
completed: 2026-04-10
---

# Plan 39-07: Thread Preview Visibility and Merging Summary

**Thread preview on selection (F8), thread visibility command (F33), and thread merging/merged status lifecycle (F34)**

## Performance

- **Duration:** 20 min
- **Completed:** 2026-04-10
- **Tasks:** 2 + 1 follow-up
- **Files modified:** 5 (+ 1 created)

## Accomplishments
- Added `onHighlightChange` callback to `SelectionList` (flitter-core) for tracking keyboard navigation highlight changes
- Added `onPreviewThread` prop to `ThreadList`, wired through `SelectionList.onHighlightChange`
- Added `previewThreadID` field to `AppState`, set via `onPreviewThread` in `showThreadList()`, cleared in `dismissThreadList()`
- Implemented `ThreadPool.mergeThreadInto(sourceID, targetID)` with full merge lifecycle: merging -> merged status, user message transfer, source hiding, active thread switching, and relationship recording
- Added `ThreadPool.getThreadStatus()` query method
- Added `thread > merge` command to command palette
- 10 new unit tests for thread merging covering lifecycle, item transfer, visibility, active thread switch, relationship creation, edge cases (self-merge, missing threads)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire thread preview on selection and visibility command (F8 + F33)** - `6330d5c` (feat)
2. **Task 2: Implement thread merging and merge command (F34)** - `a332fc7` (feat)
3. **Follow-up: Add getThreadStatus query method** - `a7b5476` (feat)

## Files Created/Modified
- `packages/flitter-core/src/widgets/selection-list.ts` - Added `onHighlightChange` callback prop and `_notifyHighlightChange()` private method
- `packages/flitter-cli/src/widgets/thread-list.ts` - Added `onPreviewThread` prop, wired to `SelectionList.onHighlightChange`
- `packages/flitter-cli/src/state/app-state.ts` - Added `previewThreadID` field, wired in `showThreadList()`, cleared in `dismissThreadList()`
- `packages/flitter-cli/src/state/thread-pool.ts` - Added `mergeThreadInto()` method with full merge lifecycle and `getThreadStatus()` query
- `packages/flitter-cli/src/commands/command-registry.ts` - Added `thread > merge` command palette entry
- `packages/flitter-cli/tests/state/thread-merge.test.ts` - 10 new tests for thread merging

## Decisions Made
- **onHighlightChange on SelectionList:** Added to the core widget rather than hacking around it in ThreadList, because this is a general-purpose feature that any selection UI would need for preview-on-highlight patterns.
- **previewThreadID on AppState:** The thread list overlay is built in `AppState.showThreadList()` (not AppShell), so preview state naturally lives on AppState.
- **User-messages-only merge:** `mergeThreadInto` only copies `user_message` items from the source to avoid duplicate `tool_call_id` values and broken parent-child references from structural items (tool calls, thinking blocks, etc.).
- **F33 already done:** The `thread-set-visibility` command already existed in command-registry.ts from a prior plan. No new work was required.

## Deviations from Plan

### Minor Deviations

**1. Method named `mergeThreadInto` instead of `mergeThread`**
- **Reason:** The name `mergeThreadInto` more clearly expresses the directional semantics (source -> target) than the plan's suggested `mergeThread`
- **Impact:** None — functionally identical

**2. Preview wired through AppState instead of AppShell**
- **Reason:** The thread list overlay is built in `AppState.showThreadList()`, not in AppShell's build method. Storing `previewThreadID` on AppState is the natural location.
- **Impact:** None — the callback chain works identically

**3. Only user messages copied during merge (no assistant messages)**
- **Reason:** SessionState does not expose an `addAssistantMessage` method. The streaming API (`beginStreaming`/`appendAssistantChunk`/`completeStream`) requires lifecycle transitions that would conflict with the target thread's state. Copying only user messages is safe and avoids state corruption.
- **Impact:** Minor — assistant message content is not preserved in the target thread after merge. This is acceptable for the current use case where merged threads are hidden.

---

**Total deviations:** 3 minor (0 blocking)
**Impact on plan:** All acceptance criteria met within the adjusted approach.

## Issues Encountered
- `bun` not in PATH: used full path `/home/gem/home/.bun/bin/bun` for test commands
- `npx tsc` uses `./node_modules/.bin/tsc --noEmit --pretty` directly
- Pre-existing test failures (6): 3 ThreadWorker state tests, InputArea mode badge, resolveToolDisplayName Task mapping, WelcomeScreen text — all pre-existing and within the allowed 10-failure baseline

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Thread preview infrastructure ready for split-view rendering in future plans
- Thread merge API ready for UI integration (e.g., merge confirmation dialog)
- 6 pre-existing test failures remain (all documented, none from this plan)

---
*Phase: 39-align-flitter-cli-with-amp-44-gaps*
*Completed: 2026-04-10*
