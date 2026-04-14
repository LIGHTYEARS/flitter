---
phase: 12-widgetsbinding-and-runapp-tui-application-bootstrap
plan: 08
subsystem: tui
tags: [widgets-binding, singleton, orchestrator, frame-scheduler, build-owner, pipeline-owner, focus-manager, mouse-manager, tui-controller, media-query, runapp]

# Dependency graph
requires:
  - phase: 12-01
    provides: InheritedWidget + InheritedElement for MediaQuery
  - phase: 12-03
    provides: FocusManager singleton for key/paste event routing
  - phase: 12-04
    provides: HitTestResult for MouseManager
  - phase: 12-05
    provides: TuiController for terminal I/O
  - phase: 12-06
    provides: MouseManager singleton for mouse event dispatch
  - phase: 12-07
    provides: MediaQuery + MediaQueryData for terminal size injection
provides:
  - WidgetsBinding singleton core orchestrator
  - 6 frame callbacks (frame-start, resize, build, layout, paint, render)
  - Key event routing (interceptors -> focusManager -> global)
  - runApp lifecycle (init, mount, event setup, await exit, cleanup)
  - addKeyInterceptor with unsubscribe for command palette
  - setRootElementMountedCallback for external injection
affects: [12-09, 12-10, 12-13, 12-15]

# Tech tracking
tech-stack:
  added: []
  patterns: [singleton-orchestrator, frame-callback-priority, key-interceptor-chain, media-query-wrapper]

key-files:
  created:
    - packages/tui/src/binding/widgets-binding.ts
    - packages/tui/src/binding/index.ts
    - packages/tui/src/binding/widgets-binding.test.ts
  modified:
    - packages/tui/src/index.ts

key-decisions:
  - "FrameScheduler is not a singleton — instantiated per WidgetsBinding (plan reference had FrameScheduler.instance which does not exist)"
  - "frame-start and resize callbacks mapped to build phase with priority -20 and -10 respectively to run before buildScopes"
  - "Test helper methods (_handleKeyEventForTesting, _simulateResizeForTesting) exposed for integration testing"

patterns-established:
  - "Frame callback priority ordering: frame-start (-20) < resize (-10) < build (0) within build phase"
  - "Key event chain: interceptors[] -> focusManager.handleKeyEvent -> handleGlobalKeyEvent"
  - "resetForTesting static method pattern for singleton cleanup in tests"

requirements-completed: [TUI-WIDGETS-BINDING]

# Metrics
duration: 9min
completed: 2026-04-14
---

# Phase 12 Plan 08: WidgetsBinding Core Orchestrator Summary

**WidgetsBinding singleton composing BuildOwner + PipelineOwner + FrameScheduler + FocusManager + MouseManager + TuiController with 6 frame callbacks and runApp lifecycle**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-14T16:37:06Z
- **Completed:** 2026-04-14T16:45:52Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 4

## Accomplishments
- WidgetsBinding singleton orchestrator composing all 6 subsystems
- 6 frame callbacks registered with priority-based ordering within build phase
- Full runApp lifecycle: init TUI, create MediaQuery wrapper, mount rootElement, setup events, await exit, cleanup
- Key event routing chain: interceptors -> focusManager -> handleGlobalKeyEvent (Ctrl+Z suspend)
- 13 tests passing covering singleton, subsystem init, frame callbacks, bridge, runApp, stop, interceptors, Ctrl+Z, cleanup, resize

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing tests (TDD RED)** - `9051aa7` (test)
2. **Task 2: Implementation (TDD GREEN)** - `6ca468b` (feat)

## Files Created/Modified
- `packages/tui/src/binding/widgets-binding.ts` - WidgetsBinding singleton core orchestrator
- `packages/tui/src/binding/index.ts` - Barrel export for binding module
- `packages/tui/src/binding/widgets-binding.test.ts` - 13 tests for WidgetsBinding
- `packages/tui/src/index.ts` - Added binding re-export

## Decisions Made
- FrameScheduler is instantiated per WidgetsBinding (not a singleton; plan reference code had `FrameScheduler.instance` which doesn't exist in the codebase)
- `frame-start` and `resize` callbacks are mapped to the `build` FramePhase with priorities -20 and -10 respectively, ensuring they run before `buildOwner.buildScopes()` at priority 0
- Test helper methods `_handleKeyEventForTesting` and `_simulateResizeForTesting` prefixed with underscore to indicate internal/test-only usage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FrameScheduler.instance does not exist**
- **Found during:** Task 2 (Implementation)
- **Issue:** Plan reference code used `this.frameScheduler = FrameScheduler.instance` but FrameScheduler has no static `instance` getter
- **Fix:** Changed to `this.frameScheduler = new FrameScheduler()` (direct instantiation)
- **Files modified:** packages/tui/src/binding/widgets-binding.ts
- **Verification:** All 13 tests pass
- **Committed in:** 6ca468b

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal — FrameScheduler instantiation approach corrected to match actual API.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WidgetsBinding ready for 12-09 (runApp top-level function)
- All subsystems properly composed and frame pipeline operational
- Key interceptor API available for 12-13 (interactive.ts replacement)

## Self-Check: PASSED

- All 4 files exist on disk
- Both commit hashes (9051aa7, 6ca468b) found in git log
- 13/13 tests passing

---
*Phase: 12-widgetsbinding-and-runapp-tui-application-bootstrap*
*Completed: 2026-04-14*
