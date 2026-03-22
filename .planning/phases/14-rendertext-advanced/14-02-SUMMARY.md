---
phase: "14"
plan: "02"
subsystem: widgets/text
tags: [interaction, hyperlink, onClick, mouse-events, emoji-width, render-text]
dependency_graph:
  requires: [text-span, mouse-manager, mouse-cursors, media-query, render-text-selection]
  provides: [text-interaction, hyperlink-query, click-handler, emoji-width-detection]
  affects: [text-widget, mouse-manager]
tech_stack:
  added: []
  patterns: [exact-cell-hit-testing, interaction-cache-on-layout, cursor-override]
key_files:
  created:
    - src/widgets/__tests__/render-text-interaction.test.ts
  modified:
    - src/widgets/text.ts
    - src/input/mouse-manager.ts
    - src/index.ts
decisions:
  - "Interaction queries use exact cell hit-testing (not center-based nearest) for precise hyperlink/onClick detection"
  - "MouseManager gains updateCursorOverride for non-MouseRegion render objects to control cursor shape"
  - "Character interaction cache is rebuilt alongside position cache during performLayout()"
  - "Emoji width flag uses simple boolean derived from MediaQuery emojiWidth capability string"
metrics:
  duration: "7m 20s"
  completed: "2026-03-22T04:10:49Z"
  tests_added: 36
  tests_total: 2121
  files_changed: 4
---

# Phase 14 Plan 02: Text Interaction + Emoji Width Detection Summary

RenderText enhanced with mouse interaction handling (hyperlink/onClick queries, click dispatch, hover cursor) and emoji width detection flag from MediaQuery capabilities.

## Tasks Completed

### Task 1: RenderText Mouse/Hyperlink Interaction (ROBJ-03)

Added interaction query methods and mouse event handling to RenderText:

- `getHyperlinkAtPosition(x, y): TextSpanHyperlink | null` -- exact cell hit-test returning hyperlink data at position
- `getOnClickAtPosition(x, y): (() => void) | null` -- exact cell hit-test returning onClick handler at position
- `handleMouseEvent({ type, x, y })` -- dispatches click/hover/exit events:
  - 'click': invokes onClick handler if found at position
  - 'enter'/'hover': sets cursor to POINTER via MouseManager if hyperlink or onClick present
  - 'exit': resets cursor to DEFAULT

Internal implementation:
- `_characterInteractions: CharacterInteraction[]` -- per-character hyperlink/onClick data, rebuilt during `performLayout()` alongside position cache
- `_getCharacterIndexAtExactPosition(x, y)` -- exact cell bounds check (not center-based nearest), requires point within [col, col+width) range
- Interaction data inherits from parent TextSpan nodes (hyperlink and onClick propagate through visitChildren)

MouseManager changes:
- Added `updateCursorOverride(cursor)` method for non-MouseRegion cursor control
- Override takes priority over region-based cursor; passing 'default' clears override
- Override cleared on `MouseManager.reset()`

### Task 2: Emoji Width Detection (ROBJ-04)

Added emoji width detection flag to RenderText:

- `emojiWidthSupported: boolean` (readonly accessor, defaults to false)
- `updateEmojiSupport(emojiWidth: 'unknown' | 'narrow' | 'wide')` -- sets flag based on MediaQuery capability string
- When 'wide', flag is true (emoji characters take 2 columns); when 'narrow' or 'unknown', flag is false
- Changing the flag triggers `markNeedsLayout()` since it affects width calculations
- No-op when value doesn't actually change

## Decisions Made

1. **Exact cell hit-testing for interactions**: Unlike `getOffsetForPosition` (which returns the nearest character by center distance for selection), interaction queries use exact cell bounds checking. This prevents false positives where a click between two characters would trigger the wrong handler.
2. **Cursor override pattern**: Rather than coupling RenderText directly to MouseRegion, added a `updateCursorOverride` method to MouseManager. This allows any render object to control the cursor without being a MouseRegion.
3. **Interaction cache co-built with positions**: The `_characterInteractions` array is built in the same `_rebuildPositionCache` pass as positions and visual lines, ensuring consistent indexing.
4. **Simple boolean for emoji width**: Rather than storing the full emojiWidth string, we derive a boolean. The wcwidth module already handles width calculations; this flag provides a way to override or query the capability.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functionality is fully wired.

## Verification

- 36 new tests covering hyperlink queries, onClick queries, mouse events, cursor management, emoji detection, and interaction cache
- All 2121 tests pass (0 failures)
- Existing 43 RenderText selection tests unaffected

## Commits

| Hash | Message |
|------|---------|
| 10960f3 | feat(14-02): add text interaction and emoji width detection to RenderText |

## Self-Check: PASSED
