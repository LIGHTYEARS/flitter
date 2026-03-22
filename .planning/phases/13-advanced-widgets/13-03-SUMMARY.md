---
phase: "13"
plan: "03"
subsystem: "widgets"
tags: [container, overlay, stack, positioned, composition-widget]
dependency-graph:
  requires: [widgets/container, widgets/stack, widgets/flex, widgets/sized-box, layout/edge-insets, layout/render-decorated, core/box-constraints]
  provides: [widgets/container-with-overlays]
  affects: [index.ts]
tech-stack:
  added: []
  patterns: [stateless-composition, group-by-key, stack-positioned-overlay]
key-files:
  created:
    - src/widgets/container-with-overlays.ts
    - src/widgets/__tests__/container-with-overlays.test.ts
  modified:
    - src/index.ts
decisions:
  - "Overlays grouped by position:alignment key, each group produces one Positioned widget"
  - "Multiple overlays in same group arranged in Row with configurable spacing (SizedBox separators)"
  - "Stack fit is passthrough so container sizes the stack, overlays float on top"
  - "Center alignment implemented via left=0 + right=0 on Positioned for Stack centering"
  - "Margin applied via outer Container wrapper (same pattern as Container widget)"
metrics:
  duration: "296s"
  completed: "2026-03-22T03:49:00Z"
  tasks: 1
  tests-added: 34
  files-created: 2
  files-modified: 1
---

# Phase 13 Plan 03: ContainerWithOverlays Summary

Container extension widget using Stack+Positioned internally to place overlay widgets at edge/corner positions (top/bottom x left/center/right) with offsetX support and configurable group spacing.

## Task Completion

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | ContainerWithOverlays widget + tests + exports (MWDG-09) | ab894aa | Complete |

## Implementation Details

### ContainerWithOverlays Widget

Created `src/widgets/container-with-overlays.ts` with:

- **Type definitions**: `OverlayPosition` ('top' | 'bottom'), `OverlayAlignment` ('left' | 'center' | 'right'), `OverlaySpec` interface
- **ContainerWithOverlays** StatelessWidget extending Container's functionality:
  - All Container properties: child, padding, decoration, constraints, width, height, margin
  - `overlays: readonly OverlaySpec[]` -- list of overlay specifications
  - `overlayGroupSpacing: number` -- spacing between items in the same group (default: 1)

**Build logic:**
1. Creates inner Container with child, padding, decoration, constraints, width, height
2. If no overlays, returns Container (with optional margin wrapper)
3. Groups overlays by `position:alignment` key using Map
4. Each group produces a Positioned widget:
   - **top**: `top=0`, **bottom**: `bottom=0`
   - **left**: `left=offsetX`, **right**: `right=offsetX`, **center**: `left=offsetX, right=offsetX`
5. Single overlay in group: child placed directly; multiple: wrapped in Row with SizedBox spacing
6. Stack wraps Container + all Positioned groups with `fit='passthrough'`
7. Margin applied via outer Container wrapper if present

### Public API Exports

Updated `src/index.ts` to export:
- `ContainerWithOverlays` class
- `OverlayPosition`, `OverlayAlignment`, `OverlaySpec` types

## Tests

**34 tests** in `container-with-overlays.test.ts`:

- **Construction (3):** Defaults, all properties, readonly overlays
- **Build without overlays (2):** Returns Container, margin wrapping
- **Build with overlays (4):** Stack wrapping, passthrough fit, children structure, margin with overlays
- **Overlay grouping (4):** Position/alignment grouping, single vs Row, spacing SizedBox
- **Overlay positioning (9):** All 6 position/alignment combos, offsetX for left/right/center
- **Position/alignment combinations (6):** Exhaustive matrix test
- **Container property pass-through (3):** width/height, padding/decoration, constraints
- **Edge cases (3):** Empty overlays, zero spacing, all 6 distinct groups

All 2042 tests pass (2008 pre-existing + 34 new).

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Group by position:alignment key**: Overlays sharing the same position+alignment are merged into a single Positioned widget containing a Row.
2. **Stack fit passthrough**: The inner Container determines the Stack size; overlays float on top without affecting layout.
3. **Center via left=0 + right=0**: Center alignment sets both left and right to offsetX, allowing the Stack to center the child.
4. **Margin as outer Container**: Same pattern as Container widget -- margin is the outermost wrapper.

## Known Stubs

None - all functionality is fully wired.

## Self-Check: PASSED
