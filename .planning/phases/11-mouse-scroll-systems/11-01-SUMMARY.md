---
phase: "11"
plan: "01"
subsystem: "mouse-scroll-systems"
tags: [mouse, input, singleton, events, cursor]
dependency_graph:
  requires: []
  provides: [MouseManager, SystemMouseCursors, MouseRegion-onRelease, MouseRegion-onDrag]
  affects: [WidgetsBinding, RenderMouseRegion]
tech_stack:
  added: []
  patterns: [singleton, event-dispatch, ANSI-escape-sequences]
key_files:
  created:
    - src/input/mouse-manager.ts
    - src/input/mouse-cursors.ts
    - src/input/__tests__/mouse-manager.test.ts
    - src/input/__tests__/mouse-cursors.test.ts
    - src/input/__tests__/binding-mouse-wiring.test.ts
  modified:
    - src/widgets/mouse-region.ts
    - src/framework/binding.ts
    - src/widgets/__tests__/interactive-widgets.test.ts
    - src/framework/__tests__/binding-enhancements.test.ts
decisions:
  - "MouseManager uses Set<RenderMouseRegion> for hover tracking; last-registered region with cursor property wins"
  - "cursorToAnsi uses DECSCUSR escape sequences for cursor shape and DECTCEM for visibility"
  - "WidgetsBinding constructor auto-wires MouseManager.instance; reset() resets both"
metrics:
  duration: "6m 9s"
  completed: "2026-03-22T02:57:44Z"
  tasks: 3
  files_created: 5
  files_modified: 4
  tests_added: 48
requirements: [MOUS-01, MOUS-02, MOUS-03, MOUS-04]
---

# Phase 11 Plan 01: MouseManager/MouseCursors + MouseRegion Events Summary

MouseManager singleton with hover coordination, SystemMouseCursors with DECSCUSR ANSI mapping, and onRelease/onDrag events on MouseRegion

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MouseManager singleton (MOUS-01) | 78d97f4 | src/input/mouse-manager.ts, src/input/__tests__/mouse-manager.test.ts |
| 2 | SystemMouseCursors (MOUS-02) | 80e2d02 | src/input/mouse-cursors.ts, src/input/__tests__/mouse-cursors.test.ts |
| 3 | MouseRegion onRelease/onDrag + WidgetsBinding wiring (MOUS-03, MOUS-04) | 1bf6c22 | src/widgets/mouse-region.ts, src/framework/binding.ts, +3 test files |

## Implementation Details

### MouseManager (Task 1)
- Singleton pattern with `static get instance()` and `static reset()`
- Tracks last mouse position (`updatePosition(x, y)`)
- Manages hovered regions via `registerHover()`/`unregisterHover()` using a `Set<RenderMouseRegion>`
- Auto-fires `onEnter`/`onExit` events on regions during hover registration
- `updateCursor()` selects cursor from last registered region with a `cursor` property set

### SystemMouseCursors (Task 2)
- Four cursor constants: DEFAULT, POINTER, TEXT, NONE
- `cursorToAnsi()` maps cursors to terminal DECSCUSR sequences:
  - DEFAULT: show cursor + blinking block (`\x1b[?25h\x1b[0 q`)
  - POINTER: show cursor + steady block (`\x1b[?25h\x1b[2 q`)
  - TEXT: show cursor + steady bar/I-beam (`\x1b[?25h\x1b[6 q`)
  - NONE: hide cursor (`\x1b[?25l`)
  - Unknown: empty string (no-op)

### MouseRegion onRelease/onDrag + Wiring (Task 3)
- Added `onRelease` and `onDrag` callbacks to both `RenderMouseRegion` and `MouseRegion` widget
- Extended `MouseEventType` union with `'release'` and `'drag'`
- Updated `hasMouseListeners` to include new callbacks
- Updated `handleMouseEvent` switch to dispatch new event types
- Updated `createRenderObject()` and `updateRenderObject()` to pass/sync new callbacks
- `WidgetsBinding` constructor now sets `mouseManager = MouseManager.instance`
- `WidgetsBinding.reset()` calls `MouseManager.reset()` for test isolation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing binding-enhancements tests for new mouseManager default**
- **Found during:** Task 3
- **Issue:** Existing tests in `binding-enhancements.test.ts` expected `mouseManager` to be `null` by default. After wiring MouseManager.instance, these assertions failed.
- **Fix:** Updated test expectations to check for `MouseManager.instance` instead of `null`, and added `as any` cast for fake mouseManager assignment since field type changed from `any` to `MouseManager | null`.
- **Files modified:** src/framework/__tests__/binding-enhancements.test.ts
- **Commit:** 1bf6c22

## Test Results

- **Tests added:** 48 (21 MouseManager + 12 MouseCursors + 10 MouseRegion events + 5 binding wiring)
- **Total test suite:** 1800 pass, 0 fail
- **Coverage areas:** singleton lifecycle, position tracking, hover coordination, cursor resolution, ANSI output, event dispatch for all 7 event types, WidgetsBinding wiring

## Known Stubs

None - all functionality is fully implemented and tested.

## Decisions Made

1. **MouseManager hover set iteration order**: The last region with a `cursor` property wins during `updateCursor()`. Since `Set` preserves insertion order, this means the most recently hovered region takes priority.
2. **DECSCUSR mapping**: POINTER maps to steady block (style 2) as the closest terminal approximation of a hand cursor. TEXT maps to steady bar (style 6) as the I-beam equivalent.
3. **WidgetsBinding auto-wiring**: MouseManager is wired in the constructor rather than lazily, matching the Amp pattern where J3 sets up Pg in construction.

## Self-Check: PASSED
