---
phase: 19-markdown-diff-thinking-and-plan-rendering
plan: 01
subsystem: ui
tags: [markdown, streaming-cursor, syntax-highlight, flitter-cli, widgets]

requires:
  - phase: 18-tool-rendering
    provides: ToolCallWidget dispatch and GenericToolCard fallback rendering
provides:
  - StreamingCursor widget with blinking cursor and Markdown delegation
  - Markdown rendering for assistant messages in ChatView
  - Markdown rendering for tool output in GenericToolCard
affects: [19-03-thinking-block, 19-04-plan-view]

tech-stack:
  added: []
  patterns:
    - "StreamingCursor StatefulWidget with conditional blink timer (initState/didUpdateWidget/dispose)"
    - "Direct Color.* constants for flitter-cli (no theme provider until Phase 20)"

key-files:
  created:
    - packages/flitter-cli/src/widgets/streaming-cursor.ts
  modified:
    - packages/flitter-cli/src/widgets/chat-view.ts
    - packages/flitter-cli/src/widgets/tool-call/generic-tool-card.ts
    - packages/flitter-cli/src/__tests__/chat-view.test.ts

key-decisions:
  - "Ported StreamingCursor from flitter-amp with Color.* constants instead of AmpThemeProvider (Phase 20 adds theme)"
  - "Cursor character is LEFT HALF BLOCK U+258C (matching flitter-amp) replacing FULL BLOCK U+2588"
  - "GenericToolCard Markdown output replaces only non-diff path; diff path uses DiffCard from Plan 19-02"

patterns-established:
  - "StreamingCursor pattern: StatefulWidget with blink timer, delegates to Markdown for content rendering"

requirements-completed: [REND-01, REND-02]

duration: 8min
completed: 2026-04-04
---

# Phase 19 Plan 01: Markdown Renderer and Syntax Highlighting Integration Summary

**StreamingCursor widget ported from flitter-amp with Markdown delegation, wired into ChatView for assistant messages and GenericToolCard for tool output**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-04T09:00:00Z
- **Completed:** 2026-04-04T09:08:00Z
- **Tasks:** 3 implementation + 1 verification
- **Files modified:** 4

## Accomplishments
- Created `StreamingCursor` widget with 530ms blink timer, conditional start/stop on streaming transitions, and Markdown delegation
- Replaced plain-text assistant message rendering in `ChatView.buildAssistantTurnWidget` with `StreamingCursor`
- Replaced plain-text tool output in `GenericToolCard` with `Markdown` widget for inline formatting support
- Updated 4 ChatView tests to verify `StreamingCursor` widget props instead of searching for raw `Text` spans

## Task Commits

Each task was committed atomically:

1. **Task 1: Create StreamingCursor widget** - `bd7dd0b` (feat)
2. **Task 2: Wire StreamingCursor into ChatView** - `7993e2f` (feat)
3. **Task 3: Replace tool output with Markdown in GenericToolCard** - bundled with `a819c29` (feat)
4. **Task 4: Update ChatView tests for StreamingCursor** - `253d9c3` (test)

## Files Created/Modified
- `packages/flitter-cli/src/widgets/streaming-cursor.ts` - New StreamingCursor StatefulWidget with blink timer and Markdown delegation
- `packages/flitter-cli/src/widgets/chat-view.ts` - Assistant message rendering now delegates to StreamingCursor
- `packages/flitter-cli/src/widgets/tool-call/generic-tool-card.ts` - Non-diff output renders through Markdown widget
- `packages/flitter-cli/src/__tests__/chat-view.test.ts` - 4 tests updated to verify StreamingCursor props

## Decisions Made
- Used direct `Color.brightBlack` for muted color instead of theme provider (Phase 20 adds theme)
- Cursor character changed from FULL BLOCK (U+2588) to LEFT HALF BLOCK (U+258C) to match flitter-amp reference
- GenericToolCard diff path left as-is (DiffCard already wired by Plan 19-02); only non-diff output switched to Markdown

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated ChatView tests for StreamingCursor widget type**
- **Found during:** Task 4 (Verification)
- **Issue:** 4 tests in Group 4 asserted on `Text` widget with raw message text; after StreamingCursor integration, the body contains `StreamingCursor` instead of `Text`
- **Fix:** Updated tests to find `StreamingCursor` instances and check `.text` and `.isStreaming` props
- **Files modified:** packages/flitter-cli/src/__tests__/chat-view.test.ts
- **Verification:** All 305 flitter-cli tests pass
- **Committed in:** 253d9c3

**2. [Rule 3 - Blocking] GenericToolCard Markdown change bundled with prior commit**
- **Found during:** Task 3 (GenericToolCard edit)
- **Issue:** The header comment update and Markdown import were already partially applied by a prior Phase 19-02 commit; the output replacement committed alongside that same file
- **Fix:** Verified the Markdown output change is present in the committed file; no additional commit needed
- **Files modified:** packages/flitter-cli/src/widgets/tool-call/generic-tool-card.ts
- **Verification:** `git diff HEAD -- generic-tool-card.ts` shows no pending changes; Markdown import and usage confirmed

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing TS6196 warning (`ShortcutContext` unused in defaults.ts from Phase 17) — not introduced by this plan, not addressed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Markdown rendering is live for assistant messages and tool output
- StreamingCursor provides blinking cursor during streaming with clean final render
- Syntax highlighting active for fenced code blocks with language tags via flitter-core's `syntaxHighlight`
- Ready for Plan 19-03 (ThinkingBlock) and Plan 19-04 (PlanView)

---
*Phase: 19-markdown-diff-thinking-and-plan-rendering*
*Completed: 2026-04-04*
