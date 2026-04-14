---
phase: 12-widgetsbinding-and-runapp-tui-application-bootstrap
plan: 05
subsystem: tui
tags: [terminal, controller, raw-mode, alt-screen, input-parser, mouse, keyboard, signal-handling]

# Dependency graph
requires:
  - phase: 03-tui-bottom-render
    provides: Screen, AnsiRenderer, ANSI constants (ALT_SCREEN_ON/OFF, MOUSE_ON/OFF, PASTE_ON/OFF, SHOW_CURSOR)
  - phase: 03-tui-bottom-render
    provides: InputParser, KeyEvent, MouseEvent, PasteEvent types
provides:
  - TuiController class — terminal lifecycle management (init/deinit)
  - Event dispatch API (onKey/offKey/onMouse/onResize/onPaste/onCapabilities)
  - Terminal capability detection (waitForCapabilities)
  - Alt screen management (enterAltScreen/exitAltScreen)
  - Render pipeline (AnsiRenderer.render → screen.present)
  - TerminalSize, TerminalCapabilities, CapabilityEvent types
affects: [12-06-MouseManager, 12-07-MediaQuery, 12-08-WidgetsBinding, 12-09-runApp]

# Tech tracking
tech-stack:
  added: []
  patterns: [event-dispatch-via-onInput-filter, stdin-unref-for-non-tty, try-catch-deinit-safety]

key-files:
  created:
    - packages/tui/src/tui/tui-controller.ts
    - packages/tui/src/tui/index.ts
    - packages/tui/src/tui/tui-controller.test.ts
  modified:
    - packages/tui/src/index.ts

key-decisions:
  - "Adapted InputParser.onInput() filter-by-type pattern instead of separate onKey/onMouse/onPaste methods (InputParser only exposes onInput)"
  - "Used AnsiRenderer + ANSI constants directly instead of renderer.disableMouse() pattern (AnsiRenderer has no such methods)"
  - "Added process.stdin.unref() for non-TTY environments to prevent blocking process exit in tests"

patterns-established:
  - "Event handler arrays with push/splice for registration/deregistration"
  - "try/catch safety in init() — deinit on failure to ensure terminal state recovery"
  - "Non-TTY stdin unref pattern for testability"

requirements-completed: [TUI-CONTROLLER]

# Metrics
duration: 8min
completed: 2026-04-14
---

# Phase 12 Plan 05: TuiController Summary

**TuiController terminal lifecycle manager with raw mode, alt screen, input event dispatch, signal handling, and capability detection**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-14T16:13:16Z
- **Completed:** 2026-04-14T16:20:49Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 4

## Accomplishments
- TuiController class managing terminal raw mode, alt screen, stdin input parsing, and signal handling
- Event dispatch API: onKey/offKey, onMouse, onResize, onPaste, onCapabilities
- waitForCapabilities with timeout fallback to default capabilities
- render() pipeline: AnsiRenderer.render(screen) + screen.present()
- Barrel exports via tui/index.ts and re-export from packages/tui/src/index.ts
- 16 tests passing (constructor, init/deinit, event handlers, getSize, getScreen, waitForCapabilities, enterAltScreen, render)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests** - `731a794` (test)
2. **Task 2: GREEN — implementation** - `7b90af0` (feat)

## Files Created/Modified
- `packages/tui/src/tui/tui-controller.ts` - TuiController class with init/deinit, event dispatch, render, capability detection
- `packages/tui/src/tui/index.ts` - Barrel export for tui module
- `packages/tui/src/tui/tui-controller.test.ts` - 16 unit tests using node:test + node:assert/strict
- `packages/tui/src/index.ts` - Added `export * from "./tui/index.js"` re-export

## Decisions Made
- **InputParser adaptation:** InputParser exposes only `onInput()` (not separate onKey/onMouse/onPaste). TuiController filters events by `type` field in the single onInput callback.
- **AnsiRenderer + constants:** AnsiRenderer doesn't have `disableMouse()`/`showCursor()` methods. Used ANSI constant strings directly (MOUSE_OFF, PASTE_OFF, SHOW_CURSOR, ALT_SCREEN_ON/OFF) from screen/ansi-renderer.ts.
- **stdin.unref() for non-TTY:** Adding a data listener to process.stdin keeps the event loop alive. In non-TTY environments (test runner), unref stdin so tests don't hang.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted to actual InputParser API (onInput not onKey/onMouse/onPaste)**
- **Found during:** Task 2 (Implementation)
- **Issue:** Plan reference assumed InputParser has separate onKey/onMouse/onPaste methods, but actual API only has onInput()
- **Fix:** Used onInput() with switch on event.type to dispatch to separate handler arrays
- **Files modified:** packages/tui/src/tui/tui-controller.ts
- **Verification:** All 16 tests pass
- **Committed in:** 7b90af0

**2. [Rule 3 - Blocking] Adapted to AnsiRenderer (not Renderer) without control methods**
- **Found during:** Task 2 (Implementation)
- **Issue:** Plan reference used `this.renderer.disableMouse()`, `this.renderer.showCursor()` etc., but AnsiRenderer has no such methods
- **Fix:** Used ANSI constant strings directly: MOUSE_OFF, PASTE_OFF, SHOW_CURSOR, ALT_SCREEN_ON/OFF, MOUSE_ON, PASTE_ON
- **Files modified:** packages/tui/src/tui/tui-controller.ts
- **Verification:** All 16 tests pass
- **Committed in:** 7b90af0

**3. [Rule 1 - Bug] Added stdin.unref() for non-TTY to prevent test hanging**
- **Found during:** Task 2 (Test verification)
- **Issue:** process.stdin.on("data") keeps event loop alive, causing test runner to hang indefinitely
- **Fix:** Added `process.stdin.unref()` when `!process.stdin.isTTY`
- **Files modified:** packages/tui/src/tui/tui-controller.ts
- **Verification:** Tests complete in ~200ms instead of hanging
- **Committed in:** 7b90af0

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary to adapt reference implementation to actual codebase APIs. No scope creep.

## Issues Encountered
- node:test `beforeEach` in parent describe not propagating to nested describes in this Node version — restructured tests to use flat describe blocks with helper function `withController()` for setup/teardown

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TuiController ready to be consumed by MouseManager (12-06), MediaQuery (12-07), and WidgetsBinding (12-08)
- Event dispatch API (onKey/onMouse/onResize/onPaste) provides event source for WidgetsBinding's input pipeline
- render() provides output channel for frame rendering

## Self-Check: PASSED

- All 3 created files verified on disk
- Both commit hashes (731a794, 7b90af0) found in git log
- No stubs, TODOs, or placeholders found
- Tests exit cleanly with code 0

---
*Phase: 12-widgetsbinding-and-runapp-tui-application-bootstrap*
*Completed: 2026-04-14*
