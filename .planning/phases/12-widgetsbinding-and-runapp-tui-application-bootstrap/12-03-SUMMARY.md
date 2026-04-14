---
phase: 12-widgetsbinding-and-runapp-tui-application-bootstrap
plan: 03
subsystem: tui
tags: [focus, singleton, event-bubbling, tab-navigation, focus-stack]

# Dependency graph
requires:
  - phase: 12-02
    provides: FocusNode focus tree node with _attach/_detach/_setFocus/_handleKeyEvent/_handlePasteEvent
provides:
  - FocusManager singleton for global focus state management
  - Keyboard/paste event bubbling from primaryFocus upward
  - Tab/Shift+Tab cyclic focus navigation
  - Focus history stack for focus fallback on unfocus/unregister
affects: [12-08 WidgetsBinding, 12-12 InputField, 12-06 MouseManager]

# Tech tracking
tech-stack:
  added: []
  patterns: [singleton-with-dispose, event-bubbling, focus-history-stack, dfs-cache-invalidation]

key-files:
  created:
    - packages/tui/src/focus/focus-manager.ts
    - packages/tui/src/focus/focus-manager.test.ts
  modified:
    - packages/tui/src/focus/index.ts

key-decisions:
  - "Import KeyEvent/PasteEvent from ../vt/types.js (not input-parser.js) to match FocusNode import convention"

patterns-established:
  - "Singleton with dispose: static _instance + dispose() resets to null for test isolation"
  - "Event bubbling: walk parent chain from primaryFocus, stop at 'handled'"
  - "Focus stack: push on focus, pop on unfocus, fallback to previous on requestFocus(null)"

requirements-completed: [TUI-FOCUS-MANAGER]

# Metrics
duration: 3min
completed: 2026-04-14
---

# Phase 12 Plan 03: FocusManager Summary

**FocusManager singleton with focus history stack, key/paste event bubbling, and Tab cyclic navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-14T15:55:32Z
- **Completed:** 2026-04-14T15:59:19Z
- **Tasks:** 2 (TDD RED + GREEN; no refactor needed)
- **Files modified:** 3

## Accomplishments
- FocusManager singleton (static _instance + static get instance) with rootScope (canRequestFocus=false)
- requestFocus(node) switches primaryFocus with _setFocus old/new; requestFocus(null) falls back via history stack
- handleKeyEvent/handlePasteEvent bubble from primaryFocus to root, stop at "handled"
- focusNext/focusPrevious implement Tab/Shift+Tab cyclic navigation with DFS-cached node list
- registerNode/unregisterNode manage focus tree with automatic cache invalidation
- 16 passing tests covering all FocusManager behaviors

## Task Commits

Each task was committed atomically:

1. **Task 1: RED - Failing tests** - `37bc4dd` (test)
2. **Task 2: GREEN - Implementation + index re-export** - `b78eb75` (feat)

_TDD: No refactor commit needed - implementation was clean from GREEN phase._

## Files Created/Modified
- `packages/tui/src/focus/focus-manager.ts` - FocusManager singleton: focus switching, event bubbling, Tab navigation, focus stack
- `packages/tui/src/focus/focus-manager.test.ts` - 16 tests: singleton, rootScope, requestFocus, events, register/unregister, navigation, dispose
- `packages/tui/src/focus/index.ts` - Added FocusManager re-export

## Decisions Made
- Used `../vt/types.js` for KeyEvent/PasteEvent imports (matching FocusNode convention, not `../vt/input-parser.js` as in plan reference)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed import path for KeyEvent/PasteEvent**
- **Found during:** Task 2 (implementation)
- **Issue:** Plan reference code imported from `../vt/input-parser.js` but FocusNode imports from `../vt/types.js` where the types are actually defined
- **Fix:** Used `../vt/types.js` import path consistently
- **Files modified:** packages/tui/src/focus/focus-manager.ts
- **Verification:** All 39 focus tests pass (23 focus-node + 16 focus-manager)
- **Committed in:** b78eb75 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Import path correction necessary for consistency. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FocusManager ready for WidgetsBinding (12-08) integration: setupEventHandlers will call focusManager.handleKeyEvent
- FocusManager ready for InputField (12-12): FocusNode.requestFocus() delegates to this manager
- All 39 focus module tests pass (23 focus-node + 16 focus-manager), no regressions

## Self-Check: PASSED

- [x] focus-manager.ts exists
- [x] focus-manager.test.ts exists
- [x] focus/index.ts updated
- [x] 12-03-SUMMARY.md exists
- [x] Commit 37bc4dd (RED tests) exists
- [x] Commit b78eb75 (GREEN implementation) exists

---
*Phase: 12-widgetsbinding-and-runapp-tui-application-bootstrap*
*Completed: 2026-04-14*
