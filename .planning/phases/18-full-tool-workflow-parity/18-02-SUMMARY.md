---
phase: 18-full-tool-workflow-parity
plan: 02
subsystem: ui
tags: [tool-call, tool-header, generic-tool-card, dispatch, widget, braille-spinner, sticky-header]

# Dependency graph
requires:
  - phase: 18-full-tool-workflow-parity
    provides: tool infrastructure modules (resolve-tool-name, tool-output-utils, truncation-limits, base-tool-props)
provides:
  - ToolHeader StatefulWidget with BrailleSpinner and MouseRegion toggle
  - GenericToolCard fallback renderer with StickyHeader layout
  - ToolCallWidget top-level dispatch (35+ tool name variants)
  - tool-icons.ts status icon helpers (toolStatusIcon, todoStatusIcon, arrowIcon)
  - ChatView integration replacing placeholder text with real tool rendering
affects: [18-03, 18-04, 19-markdown-rendering, 20-theme-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ToolHeader StatefulWidget pattern: spinner lifecycle managed by setInterval in initState/didUpdateWidget/dispose"
    - "Direct Color constants for status mapping (no theme indirection until Phase 20)"
    - "GenericToolCard StickyHeader pattern: header=ToolHeader, body=Column of input/locations/output"
    - "ToolCallWidget dispatch pattern: resolveToolName -> TOOL_NAME_MAP -> switch for specialized renderers"

key-files:
  created:
    - packages/flitter-cli/src/widgets/tool-call/tool-icons.ts
    - packages/flitter-cli/src/widgets/tool-call/tool-header.ts
    - packages/flitter-cli/src/widgets/tool-call/generic-tool-card.ts
    - packages/flitter-cli/src/widgets/tool-call/tool-call-widget.ts
  modified:
    - packages/flitter-cli/src/widgets/chat-view.ts
    - packages/flitter-cli/src/widgets/tool-call/index.ts
    - packages/flitter-cli/src/__tests__/chat-view.test.ts

key-decisions:
  - "No theme indirection — direct Color constants; Phase 20 adds AmpThemeProvider lookups"
  - "No Markdown or DiffView — output rendered as plain Text; Phase 19 swaps to Markdown/DiffView"
  - "ToolCallWidget stores childWidgets for Plan 18-04 TaskTool nesting (ts-expect-error for unused field)"
  - "Expand/collapse reads from toolCall.collapsed field — session state machine owns the toggle state"

patterns-established:
  - "ToolHeader owns BrailleSpinner lifecycle via setInterval + clearInterval in State"
  - "GenericToolCard is the fallback for all unknown/unrecognized tool names"
  - "ToolCallWidget dispatch: resolveToolName() -> TOOL_NAME_MAP -> switch statement -> specialized or fallback"
  - "ChatView passes isExpanded: !toolCall.collapsed to ToolCallWidget"

requirements-completed: [TOOL-01, TOOL-02, TOOL-04, TOOL-06]

# Metrics
duration: 16min
completed: 2026-04-03
---

# Phase 18 Plan 02: ToolHeader, GenericToolCard, ToolCallWidget Dispatch, and ChatView Integration Summary

**ToolHeader with BrailleSpinner status indicator, GenericToolCard StickyHeader fallback, ToolCallWidget 35+ tool dispatch, and ChatView wired with real tool rendering replacing placeholder text**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-03T14:35:14Z
- **Completed:** 2026-04-03T14:51:23Z
- **Tasks:** 6 (+ 1 test fix deviation)
- **Files created:** 4
- **Files modified:** 3

## Accomplishments
- Ported ToolHeader StatefulWidget with BrailleSpinner, MouseRegion toggle, and extended status color mapping (7 statuses)
- Ported GenericToolCard with StickyHeader layout (input/locations/diff/output sections), streaming output handling
- Created ToolCallWidget dispatch switch covering 35+ tool name variants from Amp CLI and Coco ACP
- Replaced dim `[tool: title]` placeholder in ChatView with full ToolCallWidget rendering
- All tool calls now render with proper status icon, tool name, detail strings, and expandable body

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tool-icons.ts** - `2835605` (feat)
2. **Task 2: Port ToolHeader** - `1d5a4db` (feat)
3. **Task 3: Port GenericToolCard** - `06f426d` (feat)
4. **Task 4: Create ToolCallWidget dispatch** - `faf38d6` (feat)
5. **Task 5: Wire into ChatView** - `3c4e800` (feat)
6. **Task 6: Update barrel export** - `a82237a` (feat)
7. **Test fix deviation** - `fef86a6` (fix)

## Files Created/Modified
- `packages/flitter-cli/src/widgets/tool-call/tool-icons.ts` - toolStatusIcon, todoStatusIcon, arrowIcon (pure string lookups)
- `packages/flitter-cli/src/widgets/tool-call/tool-header.ts` - ToolHeader StatefulWidget with BrailleSpinner, MouseRegion, status colors
- `packages/flitter-cli/src/widgets/tool-call/generic-tool-card.ts` - GenericToolCard StatelessWidget with StickyHeader, input/locations/output
- `packages/flitter-cli/src/widgets/tool-call/tool-call-widget.ts` - ToolCallWidget dispatch switch (all routes -> GenericToolCard initially)
- `packages/flitter-cli/src/widgets/chat-view.ts` - Replaced tool placeholder loop with ToolCallWidget dispatch
- `packages/flitter-cli/src/widgets/tool-call/index.ts` - Added ToolHeader, GenericToolCard, ToolCallWidget, tool-icons exports
- `packages/flitter-cli/src/__tests__/chat-view.test.ts` - Updated test 4.3 for ToolCallWidget assertion

## Decisions Made
- Direct Color constants used throughout (Color.green, Color.red, Color.blue, etc.) — Phase 20 adds theme lookups
- Output text rendered as plain Text widgets — Phase 19 swaps to Markdown and DiffView
- ToolCallWidget stores childWidgets prop for future TaskTool nesting (Plan 18-04) with ts-expect-error suppression
- Expand/collapse state reads from `toolCall.collapsed` boolean — session state machine owns the toggle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated chat-view test for ToolCallWidget rendering**
- **Found during:** Task 5 (ChatView integration)
- **Issue:** Test 4.3 expected `[tool: Read file]` placeholder text which no longer exists after ToolCallWidget integration
- **Fix:** Updated test to check for ToolCallWidget instances in the assistant turn body instead of placeholder text
- **Files modified:** `packages/flitter-cli/src/__tests__/chat-view.test.ts`
- **Verification:** 305 tests pass, 0 failures
- **Committed in:** `fef86a6`

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary test adaptation for the new widget rendering. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all widgets are fully wired to live data from ToolCallItem and ToolCallResult.

## Next Phase Readiness
- Core tool rendering layer complete, ready for Plan 18-03 (specialized tool renderers: ReadTool, EditFileTool, BashTool, GrepTool, etc.)
- ToolCallWidget dispatch switch has commented placeholders for each specialized renderer
- GenericToolCard structure prepared for Phase 19 Text -> Markdown/DiffView swap
- TypeScript compilation passes (pre-existing `ShortcutContext` unused import is out-of-scope)
- 305 tests pass (0 failures)

## Self-Check: PASSED

---
*Phase: 18-full-tool-workflow-parity*
*Completed: 2026-04-03*
