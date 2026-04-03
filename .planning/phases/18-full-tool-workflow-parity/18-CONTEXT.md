# Phase 18: Full Tool Workflow Parity - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Recreate the complete Amp tool-call rendering and workflow system, including specialized tools and fallback behavior. This phase fills in the tool-call placeholders that Phase 15's AssistantTurnWidget currently renders as simple text stubs.

</domain>

<decisions>
## Implementation Decisions

### Tool Dispatch
- Tool dispatch with name normalization (resolve-tool-name pattern from flitter-amp)
- Tool name mapping from title/kind fields to standardized tool identifiers
- Type-safe tool parameter extraction per specialized tool type

### Tool Rendering
- ToolHeader with status spinners + expand/collapse model per tool call
- Status transitions: pending → running → complete/failed with visual indicators
- Expand/collapse state per tool call, toggled via click or keyboard

### Specialized Renderers
- Shell/Bash: command display with exit code, truncated output, ANSI rendering
- Grep: match results with file:line format
- Read: file content with line numbers
- Edit: diff-style before/after with syntax highlighting stubs
- Create: new file content preview
- Web search: search results list
- Todo: task list items
- Handoff: thread-link with waiting indicator
- Task: nested delegation with recursive tool-tree rendering

### Permission Flow
- Integration with Phase 17's PermissionDialog for tool execution approval
- Permission request before tool execution with tool-specific context
- Always/deny memory for repeated approvals

### Fallback
- Generic fallback renderer for unknown/unrecognized tools
- Renders tool name, parameters as JSON, and output as pre-formatted text
- No information loss — all tool data must be visible

### Claude's Discretion
- Internal widget composition per tool renderer
- ANSI color rendering approach
- Diff rendering detail level
- Task/handoff visual hierarchy

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flitter-amp/src/widgets/tool-*` — all specialized tool renderers
- `flitter-amp/src/state/resolve-tool-name.ts` — tool name mapping
- `flitter-cli/src/widgets/chat-view.ts` — current tool placeholder rendering
- `flitter-cli/src/state/types.ts` — ToolCallItem with status, parameters, output

### Integration Points
- AssistantTurnWidget.buildToolCallWidget() — currently renders placeholder Text
- AppState.resolvePermission() — permission flow from Phase 17
- SessionState.updateToolCall/appendToolOutput — tool lifecycle updates

</code_context>

<deferred>
## Deferred Ideas

- Diff syntax highlighting belongs to Phase 19
- ANSI full-spectrum rendering may be deferred if not needed for Amp parity

</deferred>
