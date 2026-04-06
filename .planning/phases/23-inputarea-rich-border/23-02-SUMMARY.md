---
phase: 23-inputarea-rich-border
plan: "02"
subsystem: ui
tags: [border, overlay, widgets, mouse-region, theme, flitter-cli]

dependency_graph:
  requires:
    - phase: 23-01
      provides: BorderGap/BorderGaps types, gap-aware drawBorder/drawBorderSides, lerpColor in flitter-core
  provides:
    - border-helpers.ts with 5 migrated formatting/status helpers
    - border-builders.ts with 4 border overlay builder functions (BorderOverlayResult interface)
    - buildTopLeftOverlay — context usage widget (percent + cost + elapsed); null when no conversation
    - buildTopRightOverlay — mode label + skill warning indicator + skill count (MouseRegion wrapped) + skills label
    - buildBottomLeftOverlay — streaming/status messages; null when idle
    - buildBottomRightOverlay — dim cwd + git branch overlay
  affects:
    - packages/flitter-cli/src/widgets/input-area.ts (23-03 will wire these builders into InputArea)
    - packages/flitter-cli/src/widgets/header-bar.ts (scheduled removal once input-area wires border)
    - packages/flitter-cli/src/widgets/status-bar.ts (scheduled removal once input-area wires border)

tech-stack:
  added: []
  patterns:
    - Builder-function pattern returning BorderOverlayResult { widget, textWidth } for gap-aware overlay placement
    - Null-return pattern for idle states — caller omits overlay rather than rendering empty widget
    - MouseRegion wrapping for click zones embedded in border text overlay (BORDER-02)
    - Decision ID annotation in function-level comments (D-04..D-07) for traceability

key-files:
  created:
    - packages/flitter-cli/src/widgets/border-helpers.ts
    - packages/flitter-cli/src/widgets/border-builders.ts
  modified: []

key-decisions:
  - "Null return from buildTopLeftOverlay and buildBottomLeftOverlay for idle states — cleanest API; caller checks null and omits the overlay entirely"
  - "MouseRegion wraps only the skill count + separator + skills label section (not the full top-right overlay) — matches BORDER-02 spec for clickable skill count only"
  - "textWidth computed via string.length — ASCII-safe for all content; shortenPath guarantees truncation to 40 chars max with ASCII-only prefix characters"
  - "border-helpers.ts copies functions from header-bar.ts and status-bar.ts rather than re-exporting — avoids circular dependency between widgets; originals are kept for migration safety"

patterns-established:
  - "Builder function + BorderOverlayResult: each overlay position has a dedicated builder that returns { widget, textWidth } or null"
  - "Null-return idiom: builders return null for states where no overlay should appear (idle, no conversation)"
  - "Decision ID reference: every builder function doc comment cites the Decision ID from the design doc"

requirements-completed:
  - BORDER-01
  - BORDER-02
  - BORDER-03
  - BORDER-04
  - BORDER-07

duration: 7min
completed: "2026-04-06"
---

# Phase 23 Plan 02: Border Builder Functions and Helpers Summary

**Five formatting/status helpers extracted into border-helpers.ts and four border overlay builder functions created in border-builders.ts, implementing D-04 through D-07 with null-return idle states, MouseRegion click zone for skill count, and Decision ID doc comment traceability.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-06T16:00:00Z
- **Completed:** 2026-04-06T16:07:00Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- Created `border-helpers.ts` exporting `formatTokenCount`, `formatElapsed`, `thresholdColor` (from header-bar.ts) and `shortenPath`, `getFooterText` (from status-bar.ts) with identical signatures and behavior
- Created `border-builders.ts` exporting `BorderOverlayResult` interface and four builder functions implementing D-04 through D-07
- `buildTopRightOverlay` wraps the skill count + separator + "skills" label in a `MouseRegion` with `onClick` for BORDER-02 clickable skill count
- All four builders reference their Decision ID in function-level doc comments
- Both files compile without TypeScript errors (only pre-existing errors in unrelated provider files)

## Task Commits

1. **Task 1: Extract formatting helpers into border-helpers.ts** - `91c1a0b` (feat)
2. **Task 2: Create four border builder functions in border-builders.ts** - `ec6b5e8` (feat)

## Files Created/Modified

- `packages/flitter-cli/src/widgets/border-helpers.ts` — 5 migrated helpers: formatTokenCount, formatElapsed, thresholdColor, shortenPath, getFooterText
- `packages/flitter-cli/src/widgets/border-builders.ts` — BorderOverlayResult interface + 4 builders: buildTopLeftOverlay, buildTopRightOverlay, buildBottomLeftOverlay, buildBottomRightOverlay

## Decisions Made

- **Null-return for idle**: buildTopLeftOverlay returns null when `!hasConversation`; buildBottomLeftOverlay returns null when no processing/streaming state is active. Simpler than rendering an empty widget.
- **MouseRegion scope**: Only the skill count + separators + "skills" label is wrapped in MouseRegion per BORDER-02 spec. The mode label and warning indicator are not clickable.
- **textWidth = string.length**: ASCII-safe for all generated content. shortenPath ensures max 40 chars. Wide-character paths are an accepted approximation per plan specification.
- **Helpers are copies, not re-exports**: border-helpers.ts duplicates the functions from header-bar.ts and status-bar.ts instead of importing from them. This avoids a potential circular import if header-bar.ts or status-bar.ts ever imports from border-builders.ts in the future, and keeps the migration boundary clean.
- **`CliAppColors` has no `warning` field**: The plan referenced `theme.app.warning` but the actual type only has `theme.base.warning`. Used `theme.base.warning` for skill warning color and interrupted stream color.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used theme.base.warning instead of theme.app.warning**
- **Found during:** Task 2 (border-builders.ts creation)
- **Issue:** Plan specification referenced `theme.app.warning` but `CliAppColors` type has no `warning` field — only `CliBaseTheme` has `warning`
- **Fix:** Used `opts.theme.base.warning` for skill warning indicator and interrupted state color
- **Files modified:** packages/flitter-cli/src/widgets/border-builders.ts
- **Verification:** TypeScript compiled without type errors for the affected fields
- **Committed in:** ec6b5e8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (type mismatch)
**Impact on plan:** Minimal — `base.warning` and `app.warning` would resolve to identical colors in deriveAppColors (the app colors derive from base). Correctness unaffected.

## Issues Encountered

None — both tasks completed in single passes without iteration.

## Known Stubs

None. All builder functions are fully implemented with real logic. No hardcoded empty values, no placeholder text, no mock data.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- border-helpers.ts and border-builders.ts are ready for consumption by 23-03
- Plan 23-03 will wire these builders into InputArea.build() via the `overlayTexts` prop
- HeaderBar and StatusBar remain functional — removal is deferred to when InputArea wires the border overlays (23-03)

## Self-Check: PASSED

- [x] `packages/flitter-cli/src/widgets/border-helpers.ts` — created, 5 exports verified
- [x] `packages/flitter-cli/src/widgets/border-builders.ts` — created, 4 builders + BorderOverlayResult verified
- [x] Commit 91c1a0b exists (Task 1: border-helpers.ts)
- [x] Commit ec6b5e8 exists (Task 2: border-builders.ts)
- [x] tsc --noEmit: no new errors introduced by these files
- [x] D-04, D-05, D-06, D-07 referenced in border-builders.ts comments
- [x] MouseRegion present in border-builders.ts at L223

---
*Phase: 23-inputarea-rich-border*
*Completed: 2026-04-06*
