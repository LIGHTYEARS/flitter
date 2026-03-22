---
phase: "12"
plan: "02"
subsystem: "widgets"
tags: [scrollbar, intrinsic-height, scroll-sync, layout]
dependency_graph:
  requires: [scroll-controller, render-object, box-constraints, color]
  provides: [scrollbar-widget, intrinsic-height-widget]
  affects: [scroll-view, layout-system]
tech_stack:
  added: []
  patterns: [stateful-widget-with-controller-listener, single-child-render-object, leaf-render-object]
key_files:
  created:
    - src/widgets/scrollbar.ts
    - src/widgets/intrinsic-height.ts
    - src/widgets/__tests__/scrollbar.test.ts
    - src/widgets/__tests__/intrinsic-height.test.ts
  modified:
    - src/index.ts
decisions:
  - "Used LeafRenderObjectWidget for Scrollbar render layer instead of painting directly in StatefulWidget"
  - "Scrollbar supports both ScrollController and getScrollInfo callback for flexibility"
  - "IntrinsicHeight passes through tight constraints directly without querying intrinsic dimensions"
metrics:
  duration: "282s"
  completed: "2026-03-22"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 44
requirements: [MWDG-02, MWDG-07]
---

# Phase 12 Plan 02: Scrollbar + IntrinsicHeight Summary

Scrollbar widget rendering vertical track/thumb synced to ScrollController, and IntrinsicHeight widget that sizes its child to the child's max intrinsic height.

## Completed Tasks

### Task 1: Scrollbar Widget (MWDG-02)

Implemented `Scrollbar` as a StatefulWidget that:
- Listens to a `ScrollController` and rebuilds on scroll changes
- Supports alternative `getScrollInfo` callback for custom scroll data
- Delegates rendering to `_ScrollbarRender` (LeafRenderObjectWidget) and `RenderScrollbar`
- Configurable track/thumb characters (`trackChar: '░'`, `thumbChar: '█'`)
- Configurable `thickness`, `showTrack`, `thumbColor`, `trackColor`
- Thumb position calculated as `(scrollOffset / (totalContent - viewport)) * maxThumbTop`
- Thumb height calculated as `max(1, round((viewport / totalContent) * renderHeight))`

### Task 2: IntrinsicHeight Widget (MWDG-07)

Implemented `IntrinsicHeight` as a SingleChildRenderObjectWidget that:
- Queries `child.getMaxIntrinsicHeight(constraints.maxWidth)` when constraints are not tight
- Layouts child with tight height at the intrinsic value, clamped to parent constraints
- Passes through tight height constraints directly (optimization: no intrinsic query needed)
- Delegates all intrinsic dimension queries to child
- Properly manages child lifecycle (adopt/drop)

## Test Coverage

- **Scrollbar tests (24):** Widget creation, layout sizing, intrinsic width, thumb metrics computation (top/middle/bottom/minimum height/content-fits/controller-derived), paint track/thumb rendering, color application, thickness, edge cases
- **IntrinsicHeight tests (20):** Widget creation, child management, layout with tight constraints, intrinsic height sizing, constraint clamping, intrinsic delegation, paint delegation, visitChildren, child replacement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] BoxConstraints.constrainWidth does not exist**
- **Found during:** Task 1
- **Issue:** `BoxConstraints` does not have a `constrainWidth` method
- **Fix:** Replaced with manual clamping: `Math.max(constraints.minWidth, Math.min(this.thickness, constraints.maxWidth))`
- **Files modified:** src/widgets/scrollbar.ts
- **Commit:** c288a31

**2. [Rule 3 - Blocking] BoxConstraints.hasTightHeight does not exist**
- **Found during:** Task 2
- **Issue:** `BoxConstraints` does not have a `hasTightHeight` property
- **Fix:** Replaced with direct comparison: `constraints.minHeight === constraints.maxHeight`
- **Files modified:** src/widgets/intrinsic-height.ts
- **Commit:** c288a31

## Commits

| Hash | Message |
|------|---------|
| c288a31 | feat(12-02): add Scrollbar and IntrinsicHeight widgets |

## Known Stubs

None - all widgets are fully functional with complete rendering and layout logic.

## Self-Check: PASSED

- All 5 created/modified files verified on disk
- Commit c288a31 verified in git log
- 1908/1908 tests passing (44 new + 1864 existing)
