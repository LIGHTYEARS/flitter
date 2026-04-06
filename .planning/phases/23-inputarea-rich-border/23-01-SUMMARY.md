---
phase: 23-inputarea-rich-border
plan: "01"
subsystem: flitter-core
tags: [border, paint-context, gap-aware, color-interpolation, backward-compatible]
dependency_graph:
  requires: []
  provides:
    - BorderGap/BorderGaps types in paint-context.ts
    - gap-aware drawBorder and drawBorderSides in PaintContext
    - borderGaps field on BoxDecoration
    - RenderDecoratedBox gap forwarding to paint context
    - lerpColor color interpolation utility
  affects:
    - packages/flitter-core/src/scheduler/paint-context.ts
    - packages/flitter-core/src/layout/render-decorated.ts
    - packages/flitter-core/src/core/color.ts
    - packages/flitter-core/src/index.ts
tech_stack:
  added: []
  patterns:
    - Optional trailing parameter for backward-compatible API extension
    - Reference equality for mutable gap arrays in BoxDecoration.equals()
    - Fast-path delegation from drawBorderSides to drawBorder with gap pass-through
key_files:
  created: []
  modified:
    - packages/flitter-core/src/scheduler/paint-context.ts
    - packages/flitter-core/src/layout/render-decorated.ts
    - packages/flitter-core/src/core/color.ts
    - packages/flitter-core/src/index.ts
decisions:
  - "Use reference equality for borderGaps in BoxDecoration.equals() — gap arrays are rebuilt each render, value equality would cause missed repaints"
  - "Split combined top+bottom loop in drawBorder into separate loops — required to apply independent gap specifications per edge"
  - "Keep gaps as optional last parameter — preserves backward compatibility, no changes to existing callers"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-06T15:53:30Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 23 Plan 01: Border Gap-Aware Rendering and lerpColor Summary

Gap-aware border rendering pipeline: `BorderGap/BorderGaps` types added to paint-context, `drawBorder`/`drawBorderSides` extended with optional gaps parameter that skips horizontal edge columns, `BoxDecoration` extended with `borderGaps` field threaded through `RenderDecoratedBox`, and `lerpColor` color interpolation utility added for shimmer animation.

## Objective

Extend flitter-core's border rendering pipeline so that horizontal border characters can be skipped at specified column ranges (gaps), enabling overlay text to be placed directly on border lines without stacking widgets. Add `lerpColor` for smooth color interpolation needed by shimmer/animation effects.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add BorderGap/BorderGaps types and gap-aware drawBorder/drawBorderSides | bc6181c | paint-context.ts |
| 2 | Add borderGaps to BoxDecoration, thread through RenderDecoratedBox, add lerpColor | fce3895 | render-decorated.ts, color.ts, index.ts |

## Changes Made

### Task 1 — paint-context.ts

Added two exported interfaces above the `PaintContext` class:

```typescript
export interface BorderGap {
  start: number;  // column offset from box left edge (inclusive, 0-based)
  end: number;    // exclusive
}

export interface BorderGaps {
  top?: BorderGap[];
  bottom?: BorderGap[];
}
```

Modified `drawBorder` signature: `gaps?: BorderGaps` added as optional last parameter. Split the original combined top+bottom loop into two separate loops, each with gap skip logic.

Modified `drawBorderSides` signature: `gaps?: BorderGaps` added as optional last parameter. Fast path (all-same-style) passes `gaps` to `drawBorder`. Slow path top/bottom loops include gap skip logic (only for interior columns, not corner columns).

### Task 2 — render-decorated.ts, color.ts, index.ts

**render-decorated.ts:**
- Imported `BorderGaps` from `../scheduler/paint-context`
- Added `readonly borderGaps?: BorderGaps` to `BoxDecoration`
- Updated constructor to accept `borderGaps` option
- Updated `equals()` to compare `borderGaps` with reference equality
- `_paintDecoration()` now passes `this._decoration.borderGaps` as 6th arg to `ctx.drawBorderSides()`

**color.ts:**
- Added `lerpColor(a: Color, b: Color, t: number): Color` after `blendColor`
- Clamps t to [0,1], converts both colors to RGB, interpolates per-channel
- Non-RGB fallback: snaps to a if t < 0.5, else b

**index.ts:**
- Extended Color export: `export { Color, blendColor, lerpColor } from './core/color'`
- Added: `export type { BorderGap, BorderGaps } from './scheduler/paint-context'`

## Verification

```
cd packages/flitter-core && npx tsc --noEmit
```

Result: Only pre-existing errors (TS6133 unused vars, TS7029 switch fallthrough in unrelated files). Zero new errors introduced by this plan.

Grep checks:
- `BorderGap` in paint-context.ts: ✓ interface definitions at L58, L67; parameter at L297, L352
- `borderGaps` in render-decorated.ts: ✓ field at L99, constructor L101, assignment L104, equals L115, forwarding L271
- `lerpColor` in color.ts: ✓ function definition at L311
- `BorderGap|lerpColor` in index.ts: ✓ lerpColor at L6, BorderGap/BorderGaps at L84

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All APIs are fully implemented with functional logic; no placeholder returns or empty values.

## Self-Check: PASSED

- [x] `packages/flitter-core/src/scheduler/paint-context.ts` — modified, BorderGap/BorderGaps exported, drawBorder/drawBorderSides updated
- [x] `packages/flitter-core/src/layout/render-decorated.ts` — modified, borderGaps on BoxDecoration, RenderDecoratedBox forwards gaps
- [x] `packages/flitter-core/src/core/color.ts` — modified, lerpColor added
- [x] `packages/flitter-core/src/index.ts` — modified, BorderGap/BorderGaps/lerpColor exported
- [x] Commit bc6181c exists (Task 1)
- [x] Commit fce3895 exists (Task 2)
- [x] flitter-core tsc --noEmit: no new errors introduced
