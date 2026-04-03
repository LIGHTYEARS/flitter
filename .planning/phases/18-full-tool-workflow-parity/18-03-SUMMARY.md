---
phase: 18-full-tool-workflow-parity
plan: "03"
subsystem: ui
tags: [tool-renderers, widgets, stateless-widget, diff-coloring, tool-dispatch]

# Dependency graph
requires:
  - phase: 18-full-tool-workflow-parity
    provides: ToolHeader, GenericToolCard, ToolCallWidget dispatch shell, shared utilities
provides:
  - BashTool renderer with $ command header, streaming output, exit code coloring
  - ReadTool renderer with file path, line range, content preview
  - GrepTool renderer with /pattern/, path, match count
  - EditFileTool renderer with inline diff coloring and diff stats
  - CreateFileTool renderer with content preview and success/failure status
  - WebSearchTool renderer with query header and cyan URL links
  - TodoListTool renderer with status-colored checklist icons
  - Full ToolCallWidget dispatch for all 7 high-frequency tool types
affects: [18-04-handoff-task-tools, 19-markdown-diffview, phase-22-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [inline-diff-coloring, tool-specific-header-details, streaming-tail-display]

key-files:
  created:
    - packages/flitter-cli/src/widgets/tool-call/bash-tool.ts
    - packages/flitter-cli/src/widgets/tool-call/read-tool.ts
    - packages/flitter-cli/src/widgets/tool-call/grep-tool.ts
    - packages/flitter-cli/src/widgets/tool-call/edit-file-tool.ts
    - packages/flitter-cli/src/widgets/tool-call/create-file-tool.ts
    - packages/flitter-cli/src/widgets/tool-call/web-search-tool.ts
    - packages/flitter-cli/src/widgets/tool-call/todo-list-tool.ts
  modified:
    - packages/flitter-cli/src/widgets/tool-call/tool-call-widget.ts
    - packages/flitter-cli/src/widgets/tool-call/index.ts

key-decisions:
  - "Inline diff coloring via TextSpan children instead of DiffView widget — temporary until Phase 19"
  - "All seven renderers are StatelessWidget — no timers, animation, or mutable state"
  - "apply_patch and undo_edit route to EditFileTool — same diff output structure"
  - "URL extraction uses same key candidates as flitter-amp for cross-provider compatibility"
  - "todoStatusIcon() from tool-icons.ts replaces icon registry dependency"

patterns-established:
  - "Tool renderer pattern: ToolHeader + Column body with Padding(left:2) sections"
  - "Streaming output pattern: tail with block cursor during isStreaming, head with truncation after"
  - "Inline diff coloring: +lines green, -lines red, context dim via TextSpan children"

requirements-completed: [TOOL-03, TOOL-05]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 18 Plan 03: Specialized Tool Renderers Summary

**Seven tool-specific renderers (Bash, Read, Grep, EditFile, CreateFile, WebSearch, TodoList) with full ToolCallWidget dispatch, inline diff coloring, and streaming output support**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T15:29:25Z
- **Completed:** 2026-04-03T15:37:23Z
- **Tasks:** 9
- **Files modified:** 9

## Accomplishments
- Created all 7 specialized tool renderers ported from flitter-amp with direct Color constants
- Wired full dispatch switch in ToolCallWidget replacing GenericToolCard stubs
- EditFileTool renders inline colored diffs with +N/-M stats and old_str/new_str synthesis
- BashTool supports streaming tail with block cursor and exit code coloring
- WebSearchTool extracts structured URLs from rawOutput with cyan arrow display
- TodoListTool renders status-colored checklists with Unicode icons
- All renderers barrel-exported from tool-call/index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: BashTool** - `58b77b8` (feat)
2. **Task 2: ReadTool** - `f693469` (feat)
3. **Task 3: GrepTool** - `7c3907d` (feat)
4. **Task 4: EditFileTool** - `b84e495` (feat)
5. **Task 5: CreateFileTool** - `fec49a6` (feat)
6. **Task 6: WebSearchTool** - `051f78d` (feat)
7. **Task 7: TodoListTool** - `f67e2ab` (feat)
8. **Task 8: Wire dispatch** - `4feb6e8` (feat)
9. **Task 9: Barrel exports** - `75b95b5` (feat)

## Files Created/Modified
- `packages/flitter-cli/src/widgets/tool-call/bash-tool.ts` - Shell command renderer with $ prefix, streaming output, exit code
- `packages/flitter-cli/src/widgets/tool-call/read-tool.ts` - File read renderer with path, line range, content preview
- `packages/flitter-cli/src/widgets/tool-call/grep-tool.ts` - Search renderer with /pattern/, path, match count
- `packages/flitter-cli/src/widgets/tool-call/edit-file-tool.ts` - Edit renderer with inline diff coloring and diff stats
- `packages/flitter-cli/src/widgets/tool-call/create-file-tool.ts` - File creation renderer with content preview and result status
- `packages/flitter-cli/src/widgets/tool-call/web-search-tool.ts` - Web search renderer with query and URL link list
- `packages/flitter-cli/src/widgets/tool-call/todo-list-tool.ts` - Todo renderer with status-colored checklist icons
- `packages/flitter-cli/src/widgets/tool-call/tool-call-widget.ts` - Dispatch switch wired to all 7 specialized renderers
- `packages/flitter-cli/src/widgets/tool-call/index.ts` - Barrel exports for all 7 new renderers

## Decisions Made
- Inline diff coloring via TextSpan children instead of DiffView widget — temporary approach until Phase 19 provides proper DiffView. EditFileTool will be updated to delegate to DiffView at that point.
- All seven renderers are StatelessWidget with no timers, animation, or mutable state. Render output is a pure function of toolCall props.
- apply_patch and undo_edit route to EditFileTool since their output structure (diff content) is identical.
- URL extraction in WebSearchTool uses the same key candidates as flitter-amp (results, links, url, link, href) covering Anthropic web_search, Coco WebFetch, and MCP shapes.
- todoStatusIcon() from tool-icons.ts replaces the flitter-amp icon('todo.status.*') registry pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 high-frequency tool types now have specialized renderers
- Plan 18-04 (HandoffTool, TaskTool) is already wired — those renderers were added in a prior pass
- Phase 19 will upgrade EditFileTool's inline diff coloring to use proper DiffView widget
- Phase 22 testing will add snapshot tests for all specialized renderers

## Self-Check: PASSED
- All 7 created files verified present on disk
- All 9 commit hashes verified in git log
- TypeScript compilation passes (pre-existing unrelated TS6196 warning only)
- All 305 flitter-cli tests pass, all 3718 flitter-core tests pass

---
*Phase: 18-full-tool-workflow-parity*
*Completed: 2026-04-03*
