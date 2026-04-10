---
phase: 39-align-flitter-cli-with-amp-44-gaps
plan: 05
subsystem: state
tags: [agent-mode, per-thread, handoff-service, extraction, thread-pool]

# Dependency graph
requires:
  - phase: 39-align-flitter-cli-with-amp-44-gaps
    provides: "Plan 01 — ThreadWorker with state machine"
  - phase: 39-align-flitter-cli-with-amp-44-gaps
    provides: "Plan 04 — Async createThread with extended parameters"
provides:
  - Per-thread agent mode persistence (save on switch, restore on switch, sync on mode change)
  - HandoffService independent class with system prompt building
  - HandoffService.followHandoffIfSourceActive worker state check
affects: [39-06, 39-07]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-thread-state-persistence, service-extraction, lazy-singleton]

key-files:
  created:
    - packages/flitter-cli/src/state/handoff-service.ts
    - packages/flitter-cli/tests/state/handoff-service.test.ts
  modified:
    - packages/flitter-cli/src/state/thread-pool.ts
    - packages/flitter-cli/src/state/app-state.ts

key-decisions:
  - "switchThread accepts optional currentAgentMode to save on outgoing thread before switching"
  - "HandoffService uses lazy getter pattern on AppState to avoid circular init"
  - "HandoffService.submitHandoff returns ThreadHandle|null instead of void, letting AppState handle the _switchToHandle"
  - "Removed _spinnerFrame and _BRAILLE_FRAMES from AppState since they moved to HandoffService"

patterns-established:
  - "Service extraction: HandoffServiceDeps interface for dependency injection without circular imports"
  - "Per-thread state persistence: save on switch-away, restore on switch-to, sync on change"
  - "Lazy service creation: get handoffService() creates instance on first access"

requirements-completed: [F15, F17]

# Metrics
duration: 25min
completed: 2026-04-10
---

# Plan 39-05: Agent Mode Per-Thread and HandoffService Summary

**Per-thread agent mode persistence (F15) and HandoffService extraction from AppState (F17)**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-04-10
- **Tasks:** 3
- **Files modified/created:** 4

## Accomplishments
- Per-thread agent mode persistence: save on switch-away, restore on switch-to, sync on cycleMode, inherit on new thread creation
- Independent HandoffService class with enter/exit/submit/abort lifecycle, countdown timer, system prompt building from source thread context, and followHandoffIfSourceActive worker state check
- AppState delegates all handoff methods to HandoffService via lazy getter while preserving identical external API
- 17 new unit tests for HandoffService and per-thread agent mode
- All 50 existing handoff tests continue to pass with the delegation

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement agent mode per-thread persistence (F15)** - `a1f8b8f` (feat)
2. **Task 2: Extract HandoffService from AppState (F17)** - `6be22b8` (refactor)
3. **Task 3: Write HandoffService and per-thread mode tests** - `59b5806` (test)

## Files Created/Modified
- `packages/flitter-cli/src/state/handoff-service.ts` - New HandoffService class with HandoffServiceDeps interface, buildSystemPrompt, followHandoffIfSourceActive, lifecycle methods (enter/exit/submit/abort), countdown timer, and dispose cleanup
- `packages/flitter-cli/src/state/thread-pool.ts` - switchThread now accepts `options?: { currentAgentMode?: string | null }` to save outgoing thread's agent mode before switching (F15)
- `packages/flitter-cli/src/state/app-state.ts` - Delegates handoff methods to HandoffService via lazy getter; switchToThread saves/restores agent mode; cycleMode syncs to active thread handle; removed _spinnerFrame and _BRAILLE_FRAMES (moved to HandoffService)
- `packages/flitter-cli/tests/state/handoff-service.test.ts` - 17 tests covering buildSystemPrompt, followHandoffIfSourceActive, HandoffService lifecycle, submitHandoff, and per-thread agent mode save/restore/cycle/inherit

## Decisions Made
- **switchThread options parameter:** Added optional `currentAgentMode` parameter to switchThread rather than having ThreadPool auto-read the mode, since the mode is owned by AppState not ThreadPool.
- **HandoffService returns handle:** submitHandoff returns ThreadHandle|null instead of void, allowing AppState to handle the _switchToHandle call. This avoids HandoffService needing to know about session/conversation wiring.
- **Lazy getter pattern:** HandoffService is created on first access via `get handoffService()` to avoid adding constructor parameters to AppState and breaking existing callers.
- **Braille frames moved:** _BRAILLE_FRAMES and _spinnerFrame moved from AppState to HandoffService since they are purely handoff-related animation state.

## Deviations from Plan

None. All three tasks completed as specified.

## Issues Encountered
- `bun` not in PATH: used full path `/home/gem/home/.bun/bin/bun` for all test commands
- `npx tsc` not available: used `./node_modules/.bin/tsc --noEmit --pretty` directly
- Pre-existing test failures (6): all pre-existing and within the allowed baseline

## Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | No new type errors (pre-existing errors in other files only) |
| `bun test tests/state/handoff-service.test.ts` | 17 pass, 0 fail |
| `bun test tests/state/handoff.test.ts` | 50 pass, 0 fail |
| `bun test` (full suite) | 1244 pass, 6 fail (all pre-existing) |

## Next Phase Readiness
- HandoffService is independently testable and can be enhanced with more sophisticated system prompt building
- Per-thread agent mode persistence ready for consumption by mode-aware features
- followHandoffIfSourceActive ready for integration with handoff follow-up UX
- 6 pre-existing test failures remain (all documented, none from this plan)

---
*Phase: 39-align-flitter-cli-with-amp-44-gaps*
*Completed: 2026-04-10*
