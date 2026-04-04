# Phase 19: Markdown, Diff, Thinking, and Plan Rendering - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Reach parity for content rendering primitives used throughout the Amp experience. Replace all plain Text placeholders in ChatView and tool widgets with rich renderers: Markdown (block and inline), DiffView (unified and token), ThinkingBlock (collapsible, streaming), and PlanBlock (checklist).

</domain>

<decisions>
## Implementation Decisions

### Markdown Renderer
- Support headings (h1-h6), bold, italic, code spans, fenced code blocks, links, ordered/unordered lists, blockquotes, horizontal rules
- Parse markdown using a lightweight regex-based approach or port flitter-amp's existing parser
- Render as TextSpan tree with appropriate styling (bold=fontStyle:1, italic=dim, code=brightWhite on gray, headings=bold+color)
- Code blocks render with optional language label

### DiffView
- Unified diff rendering with +/- line coloring (green for additions, red for deletions, dim for context)
- Token-level diff highlighting within changed lines when available
- File header with path and change stats
- Scrollable content for large diffs

### ThinkingBlock
- Collapsible container with "Thinking..." header
- Streaming text display during thinking phase
- Dim/italic styling to visually distinguish from assistant text
- Auto-collapse when thinking completes and assistant text begins

### PlanBlock
- Checklist-style rendering with status icons per entry
- Green check for complete, dim circle for pending, yellow for in-progress
- Indented entry descriptions

### Claude's Discretion
- Markdown parsing implementation details
- Whether to use TextSpan or nested widgets for markdown elements
- DiffView line-number column width and alignment
- ThinkingBlock collapse animation (if any)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flitter-amp/src/widgets/markdown-renderer.ts` — reference Markdown renderer
- `flitter-amp/src/widgets/diff-view.ts` — reference DiffView
- `flitter-amp/src/widgets/thinking-block.ts` — reference ThinkingBlock
- `flitter-cli/src/widgets/chat-view.ts` — currently renders thinking/text/plan as plain Text
- `flitter-core/src/painting/text-span.ts` — TextSpan for rich text composition

### Integration Points
- ChatView.buildAssistantTurnWidget — thinking, text, tool output placeholders
- ToolCallWidget specialized renderers — diff output in EditFileTool, code in BashTool

</code_context>

<deferred>
## Deferred Ideas

- Syntax highlighting for code blocks (may use ANSI escape sequences from tool output)
- Mermaid diagram rendering (out of scope)

</deferred>
