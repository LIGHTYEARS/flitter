# Analysis 33: HandoffTool, TaskTool, CreateFileTool, and ToolCallWidget Dispatch Completion

## Overview

This analysis covers the remaining specialized tool renderers in the flitter-amp TUI ACP client that were not examined in previous analyses (agents 1-32): `HandoffTool`, `TaskTool`, `CreateFileTool`, and the barrel `index.ts`. It also provides a comprehensive view of the `ToolCallWidget` dispatch system and the full `index.ts` public API surface, unifying the picture of how all 15 tool-call source files compose into a cohesive subsystem.

---

## 1. File Locations and Directory Structure

All files reside under:

```
/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/
```

| File | Lines | Purpose | Widget Type |
|------|-------|---------|-------------|
| `handoff-tool.ts` | 185 | Thread handoff with blink animation | StatefulWidget |
| `task-tool.ts` | 33 | Sub-agent / oracle delegation | StatelessWidget |
| `create-file-tool.ts` | 77 | File creation display | StatelessWidget |
| `index.ts` | 15 | Barrel re-export for the module | N/A |
| `tool-call-widget.ts` | 149 | Top-level dispatch router | StatelessWidget |
| `generic-tool-card.ts` | 202 | Default fallback card | StatelessWidget |
| `tool-header.ts` | 174 | Status/name/spinner header row | StatefulWidget |
| `bash-tool.ts` | ~140 | Shell command renderer | StatelessWidget |
| `grep-tool.ts` | ~120 | Search results renderer | StatelessWidget |
| `read-tool.ts` | ~110 | File read display | StatelessWidget |
| `edit-file-tool.ts` | ~140 | File edit / diff display | StatelessWidget |
| `web-search-tool.ts` | ~130 | Web search results | StatelessWidget |
| `todo-list-tool.ts` | ~150 | Todo list rendering | StatelessWidget |

The directory contains exactly 14 source files (13 components + 1 barrel). Only two widgets in this entire subsystem require `StatefulWidget`: `HandoffTool` (blink animation) and `ToolHeader` (spinner animation). Every other tool renderer is purely stateless.

---

## 2. HandoffTool -- Thread Link Display with Blink Animation

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/handoff-tool.ts`

### 2.1 Purpose

The `HandoffTool` renders a visual indicator when the agent delegates work to another thread via a "handoff" mechanism. In the Amp CLI architecture, handoffs represent control transfer between agent threads. The TUI must convey this asynchronous waiting state clearly to the user.

### 2.2 Props Interface

```typescript
interface HandoffToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}
```

Both properties are stored as `readonly` instance fields in the constructor. The `toolCall` provides the ACP-layer data (status, rawInput, result), while `isExpanded` controls whether the body section is rendered.

### 2.3 State Management and Blink Animation

`HandoffTool` extends `StatefulWidget` to drive a 700ms blink animation. The state class `HandoffToolState` manages:

- **`blinkVisible: boolean`** -- Toggled every 700ms to alternate the blink indicator color.
- **`timer: ReturnType<typeof setInterval> | null`** -- Holds the interval handle for cleanup.

The animation lifecycle is carefully managed across three hooks:

1. **`initState()`** -- Starts the blink if `status === 'in_progress'` at mount time.
2. **`didUpdateWidget()`** -- Starts or stops the blink when the tool status transitions. This handles the case where a handoff completes or begins after the widget is already mounted.
3. **`dispose()`** -- Cleans up the interval to prevent memory leaks.

The `startBlink()` and `stopBlink()` methods encapsulate the interval management:

```typescript
private startBlink(): void {
  this.timer = setInterval(() => {
    this.setState(() => {
      this.blinkVisible = !this.blinkVisible;
    });
  }, 700);
}
```

The 700ms interval creates a deliberate, unhurried blink -- fast enough to signal activity but slow enough to avoid visual distraction. This rate is distinct from the `ToolHeader` spinner at 100ms, establishing a visual hierarchy where the handoff blink is a lower-frequency "heartbeat" signal.

### 2.4 Rendering Approach

The `build()` method constructs up to three visual elements:

**Thread ID extraction** -- The method reads `thread_id` or `threadId` from `rawInput`, accommodating both snake_case and camelCase conventions from different ACP server implementations:

```typescript
const threadId = (input['thread_id'] ?? input['threadId'] ?? '') as string;
```

**Blink color computation** -- When in progress, the `blinkVisible` flag alternates between `theme.app.toolSuccess` (green) and `theme.base.mutedForeground` (dim gray). This creates a green-to-dim blink pattern on the bullet indicator character `●`.

**Layout structure:**

When collapsed and not in progress, only the `ToolHeader` is returned. When in progress or expanded, the widget builds a `Column` with:

1. The `ToolHeader` (name="Handoff", status, thread ID as detail)
2. A "Waiting for handoff" label with the blinking `●` indicator (only during `in_progress`)
3. The extracted output text (only when expanded), truncated to 500 characters

The "Waiting for handoff" text uses the theme's `handoffMode` color (`base.secondary`, typically cyan), establishing a distinct visual identity for handoff operations.

### 2.5 Output Extraction

The `extractOutput()` method has a two-tier extraction strategy:

1. First checks `result.rawOutput`, serializing it to JSON (truncated at 500 chars).
2. Falls back to iterating `result.content` and joining text elements.

This mirrors the extraction patterns used in `GenericToolCard` but with a tighter 500-character limit appropriate for the typically brief handoff results.

### 2.6 Theme Integration

The HandoffTool uses three theme tokens:
- `theme.app.toolSuccess` -- Green blink-on color
- `theme.base.mutedForeground` -- Dim blink-off color and output text color
- `theme.app.handoffMode` -- Cyan color for "Waiting for handoff" label

The `handoffMode` token is defined in the theme data structure at `amp-theme-data.ts:61` and defaults to `base.secondary` in the theme provider at `index.ts:78`. This is the only tool renderer that uses a dedicated mode-specific theme color, underscoring the special visual treatment handoffs receive in the UI.

---

## 3. TaskTool -- Sub-Agent Recursive Delegation

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/task-tool.ts`

### 3.1 Purpose

The `TaskTool` renders sub-agent and oracle tool calls -- situations where the primary agent delegates a subtask to a secondary agent thread. In multi-agent ACP architectures, this is common for code review, library research, and general-purpose task delegation.

### 3.2 Implementation

At only 33 lines, `TaskTool` is the simplest specialized renderer in the entire tool-call subsystem. It is a pure delegation wrapper:

```typescript
export class TaskTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;

  constructor(props: TaskToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
  }

  build(_context: BuildContext): Widget {
    return new GenericToolCard({
      toolCall: this.toolCall,
      isExpanded: this.isExpanded,
    });
  }
}
```

The `build()` method directly returns a `GenericToolCard`. There is no custom rendering logic, no additional props transformation, and no state management.

### 3.3 Design Rationale

Why does `TaskTool` exist as a separate class rather than being handled inline in the dispatch switch? Several reasons emerge from the architecture:

1. **Semantic naming** -- The dispatch switch maps `Task`, `oracle`, `code_review`, `librarian`, and all `sa__*` / `tb__*` prefixed tool names to `TaskTool`. Having a named class makes the mapping explicit and debuggable.

2. **Extension point** -- The class provides a clean insertion point for future Task-specific rendering. If sub-agent tool calls need custom headers, nested progress indicators, or recursive tool-call tree rendering, `TaskTool` can be extended without modifying the dispatch logic.

3. **Consistency** -- Every specialized tool type follows the same pattern: a named class with `ToolCallItem` + `isExpanded` props. This uniformity simplifies the dispatch switch and makes the codebase predictable.

4. **GenericToolCard's recursive capability** -- The `GenericToolCard` already supports rendering nested tool calls, making it appropriate for task/oracle scenarios. `GenericToolCard` extracts diff output, handles `StickyHeader` wrapping, and renders `extraChildren` -- all features that sub-agent results may leverage.

### 3.4 Integration with ToolCallWidget Dispatch

`TaskTool` is the most heavily mapped renderer in the dispatch system. It handles:

- Direct names: `Task`, `oracle`, `code_review`, `librarian`
- Prefix patterns: `sa__*` (sub-agent tools), `tb__*` (toolbox tools)

The prefix matching occurs before the main switch statement:

```typescript
if (name.startsWith('sa__') || name.startsWith('tb__')) {
  return new TaskTool({ toolCall: this.toolCall, isExpanded: expanded });
}
```

This pre-switch check means any tool name with these prefixes will always route to `TaskTool`, regardless of what follows the prefix. This is a deliberate design choice for extensibility -- new sub-agent tools are automatically rendered correctly without any dispatch changes.

---

## 4. CreateFileTool -- File Creation Display

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/create-file-tool.ts`

### 4.1 Purpose

The `CreateFileTool` renders tool calls that create new files. It displays the target file path in the header and, when expanded, shows a preview of the file content being written.

### 4.2 Props Interface

```typescript
interface CreateFileToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}
```

Standard two-prop interface, consistent with all other specialized renderers.

### 4.3 File Path Extraction

The file path extraction demonstrates robust handling of multiple ACP tool naming conventions:

```typescript
const filePath = (
  input['file_path'] ??
  input['path'] ??
  input['filename'] ??
  input['file'] ??
  input['destination'] ??
  ''
) as string;
```

Five different input field names are tried in priority order:
1. `file_path` -- Most common convention in Claude/ACP tools
2. `path` -- Generic fallback
3. `filename` -- Alternative naming
4. `file` -- Shortened form
5. `destination` -- Used by some copy/move-oriented tools

This is the most defensive path extraction in the codebase. By comparison, `ReadTool` typically only checks `file_path` and `path`. The extra variants reflect the fact that `CreateFileTool` handles multiple tool name aliases (`write_file`, `write_to_file`, `WriteFile`, `create_file`), each potentially using different parameter names.

### 4.4 Rendering Approach

The rendering has three levels of detail:

**Collapsed (header only):**
```
[status] CreateFile /path/to/file.ts
```
The `ToolHeader` receives `name` from `toolCall.kind` (falling back to `'CreateFile'`) and the file path as the details array.

**Expanded with no content:**
Same as collapsed -- if the input has no `content` field, there is nothing extra to show.

**Expanded with content:**
```
[status] CreateFile /path/to/file.ts
  <content preview, truncated at 500 chars>
```

The content preview is rendered with muted/dim styling:

```typescript
const preview = content.length > 500
  ? content.slice(0, 500) + '\n...(truncated)'
  : content;
```

The 500-character truncation limit is consistent with `HandoffTool`'s output truncation, suggesting a project-wide convention for preview lengths.

### 4.5 Differences from EditFileTool

While `EditFileTool` focuses on displaying diffs (insertions, deletions, context lines) and integrates with `DiffView`, `CreateFileTool` displays the raw content being written. This makes architectural sense: a newly created file has no "before" state to diff against, so a plain content preview is the appropriate visualization.

### 4.6 Tool Name Mapping

In the `ToolCallWidget` dispatch, `CreateFileTool` is reached through these aliases:

```typescript
// In TOOL_NAME_MAP
write_file: 'create_file',
write_to_file: 'create_file',
WriteFile: 'create_file',

// In the switch
case 'create_file':
  return new CreateFileTool({ ... });
```

This consolidation means that any tool call conceptually writing a new file will use this renderer, regardless of the specific tool name used by the ACP server.

---

## 5. Barrel Export (index.ts) -- Public API Surface

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/index.ts`

### 5.1 Exported Symbols

```typescript
export { ToolCallWidget } from './tool-call-widget';
export { GenericToolCard } from './generic-tool-card';
export { ToolHeader } from './tool-header';
export { ReadTool } from './read-tool';
export { EditFileTool } from './edit-file-tool';
export { BashTool } from './bash-tool';
export { GrepTool } from './grep-tool';
export { TaskTool } from './task-tool';
export { CreateFileTool } from './create-file-tool';
export { WebSearchTool } from './web-search-tool';
export { HandoffTool } from './handoff-tool';
export { TodoListTool } from './todo-list-tool';
```

Twelve symbols are exported, comprising:
- 1 dispatch widget (`ToolCallWidget`)
- 2 shared primitives (`GenericToolCard`, `ToolHeader`)
- 9 specialized renderers

### 5.2 API Design Observations

Every specialized renderer is exported individually, even though the typical consumer only needs `ToolCallWidget` (which internally dispatches to the rest). This design enables two usage patterns:

1. **Standard use** -- Import `ToolCallWidget` and let it handle routing automatically.
2. **Direct use** -- Import a specific renderer (e.g., `BashTool`) for testing, custom layouts, or embedding a tool visualization outside the normal conversation flow.

The exports are ordered by conceptual grouping (infrastructure first, then I/O tools, search, agents, utilities), though this ordering is not strictly alphabetical or by dependency.

---

## 6. ToolCallWidget Dispatch -- Complete Routing Analysis

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-call-widget.ts`

### 6.1 Name Normalization Layer

The `TOOL_NAME_MAP` provides a normalization layer that maps variant tool names to canonical names:

```typescript
const TOOL_NAME_MAP: Record<string, string> = {
  read_file: 'Read',    ReadFile: 'Read',
  execute_command: 'Bash', shell: 'Bash', run_command: 'Bash', terminal: 'Bash',
  search: 'Grep', grep: 'Grep', ripgrep: 'Grep', find_files: 'Grep', list_files: 'Grep',
  write_file: 'create_file', write_to_file: 'create_file', WriteFile: 'create_file',
  edit: 'edit_file', str_replace_editor: 'edit_file', EditTool: 'edit_file',
  web_search: 'WebSearch', browser: 'WebSearch', fetch_url: 'WebSearch',
};
```

This map handles 18 variant names, normalizing them to 6 canonical names. If a tool name is not in the map, it passes through unchanged to the switch statement.

### 6.2 Complete Routing Table

After normalization, the switch statement routes to these renderers:

| Canonical Name(s) | Renderer | Notes |
|---|---|---|
| `sa__*`, `tb__*` (prefix match) | TaskTool | Pre-switch check |
| `Read` | ReadTool | |
| `edit_file`, `apply_patch`, `undo_edit` | EditFileTool | |
| `create_file` | CreateFileTool | |
| `Bash`, `shell_command`, `REPL` | BashTool | |
| `Grep`, `glob`, `Glob`, `Search` | GrepTool | |
| `WebSearch`, `read_web_page` | WebSearchTool | |
| `Task`, `oracle`, `code_review`, `librarian` | TaskTool | |
| `handoff` | HandoffTool | |
| `todo_list`, `todo_write`, `todo_read` | TodoListTool | |
| `painter`, `mermaid`, `chart`, `look_at`, `format_file`, `skill`, `get_diagnostics` | GenericToolCard | Explicit fallthrough |
| (everything else) | GenericToolCard | Default case |

In total, the dispatch handles approximately 35+ distinct tool names, routing them to 10 specialized renderers plus the generic fallback.

### 6.3 Expansion State Default

The `isExpanded` prop defaults via a nuanced expression:

```typescript
this.isExpanded = props.isExpanded ?? !props.toolCall.collapsed;
```

This means:
- If the parent explicitly provides `isExpanded`, that takes precedence.
- Otherwise, the expansion state is derived from the `toolCall.collapsed` flag, inverted. This allows the ACP layer to control default visibility (e.g., collapsing completed tool calls automatically).

### 6.4 onToggle Forwarding

Only `GenericToolCard` receives the `onToggle` callback. The specialized renderers (`ReadTool`, `BashTool`, etc.) do not receive it. This means toggle behavior for specialized renderers must be handled at a higher level in the widget tree, while the generic card can manage its own expand/collapse interaction.

---

## 7. Shared Data Contract: ToolCallItem

All tool renderers consume the same `ToolCallItem` interface from `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts`:

```typescript
export interface ToolCallItem {
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  locations?: Array<{ path: string }>;
  rawInput?: Record<string, unknown>;
  result?: ToolCallResult;
  collapsed: boolean;
}

export interface ToolCallResult {
  status: 'completed' | 'failed';
  content?: Array<{ type: string; content?: { type: string; text: string } }>;
  rawOutput?: Record<string, unknown>;
}
```

Key observations:
- `kind` is the tool name string used for dispatch routing.
- `rawInput` is an untyped record, requiring each renderer to defensively extract known fields with fallback chains.
- `result.content` uses a nested structure where text is at `content.content.text` -- a two-level indirection that every renderer must navigate.
- `collapsed` provides a server-side hint about default visibility.

---

## 8. Code Quality Observations

### 8.1 Strengths

**Consistent prop pattern** -- Every specialized renderer uses the identical `{ toolCall: ToolCallItem; isExpanded: boolean }` interface. This uniformity makes the dispatch switch clean and predictable. Adding a new renderer requires implementing exactly this contract.

**Defensive input extraction** -- Both `HandoffTool` (checking `thread_id` and `threadId`) and `CreateFileTool` (checking 5 path field variants) demonstrate awareness that ACP servers may use inconsistent field naming. This robustness prevents rendering failures from minor protocol variations.

**Clean timer lifecycle** -- `HandoffTool` manages its blink interval across all three relevant lifecycle hooks (`initState`, `didUpdateWidget`, `dispose`). The `didUpdateWidget` hook correctly handles both start and stop transitions, and the guard conditions (`!this.timer` / `this.timer`) prevent duplicate intervals. This is textbook timer management in a Flutter-style framework.

**Separation of concerns** -- `TaskTool` delegates entirely to `GenericToolCard` rather than duplicating any rendering logic. This maintains a clear single responsibility and avoids the "copy and modify" antipattern.

**Prefix-based routing** -- The `sa__*` / `tb__*` prefix check in `ToolCallWidget` is an elegant extensibility mechanism. New sub-agent or toolbox tools are automatically routed without dispatch changes.

### 8.2 Areas for Improvement

**Missing `onToggle` propagation** -- Specialized renderers like `HandoffTool`, `TaskTool`, and `CreateFileTool` do not receive or handle `onToggle`. This means their expand/collapse state can only be controlled externally, not via user interaction on the widget itself. The `GenericToolCard` receives `onToggle` but the specialized renderers do not, creating an inconsistency.

**Type safety on rawInput** -- Every renderer casts `rawInput` fields with `as string`, which could silently produce incorrect results if the field is a number or object. A shared utility function like `getStringField(input, 'file_path', 'path', ...)` could centralize this pattern and add type checking.

**Duplicate output extraction** -- `HandoffTool.extractOutput()` and `GenericToolCard.extractOutputText()` contain nearly identical logic for extracting text from `ToolCallResult`. A shared utility could eliminate this duplication.

**TaskTool's minimalism** -- While the delegation pattern is clean, `TaskTool` could arguably be a factory function rather than a full class. However, maintaining it as a class preserves the pattern and leaves room for future enhancement.

**Truncation inconsistency** -- Different renderers use different truncation limits: `HandoffTool` uses 500 characters for output, `CreateFileTool` uses 500 for content preview, while `GenericToolCard` uses 2000 for output text and 120 per input field. These magic numbers could be centralized as named constants.

**Blink animation visual concern** -- The `HandoffTool` blink alternates between green (`toolSuccess`) and dim gray (`mutedForeground`). Using the "success" color for a still-in-progress operation could be misleading. A dedicated `handoffBlink` theme token might be more semantically accurate.

### 8.3 Architecture Summary

The tool-call subsystem follows a clean **Strategy pattern**: `ToolCallWidget` acts as the context, the name normalization map and switch statement form the strategy selection, and each specialized renderer is a concrete strategy. `GenericToolCard` serves as the null/default strategy. The barrel export in `index.ts` provides a clean public API, and the shared `ToolCallItem` type contract ensures all strategies are interchangeable.

The two stateful widgets (`HandoffTool` and `ToolHeader`) are the only components in this subsystem that manage their own timers, and both follow identical lifecycle patterns. Every other component is stateless, keeping the overall subsystem simple and predictable.

---

## 9. File Reference Summary

| File | Absolute Path |
|------|---------------|
| HandoffTool | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/handoff-tool.ts` |
| TaskTool | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/task-tool.ts` |
| CreateFileTool | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/create-file-tool.ts` |
| Barrel index | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/index.ts` |
| ToolCallWidget dispatch | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-call-widget.ts` |
| GenericToolCard | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts` |
| ToolHeader | `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-header.ts` |
| ACP types (ToolCallItem) | `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts` |
| Theme (handoffMode) | `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/amp-theme-data.ts` |
| Theme provider | `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/index.ts` |
