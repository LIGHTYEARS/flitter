# Analysis 7: ToolCallWidget Dispatch System and Tool Name Normalization

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-call-widget.ts`

## Purpose

ToolCallWidget is the top-level dispatch hub for rendering every tool invocation in the Amp chat view. It accepts a `ToolCallItem` from the ACP layer and routes it to one of nine specialized widget renderers (or a generic fallback) based on the tool's name. This is the single point through which all tool call visualization flows, making it the keystone of the tool rendering subsystem.

## TOOL_NAME_MAP: The Normalization Layer (21 Entries)

Before dispatch, every raw tool name passes through `TOOL_NAME_MAP`, a `Record<string, string>` with 21 entries that collapses the diversity of tool naming conventions from different AI agents into a small set of canonical names. The map is organized into five semantic groups:

1. **Read variants (2 entries):** `read_file` and `ReadFile` both map to `'Read'`.
2. **Bash/Shell variants (4 entries):** `execute_command`, `shell`, `run_command`, and `terminal` all map to `'Bash'`.
3. **Search/Grep variants (5 entries):** `search`, `grep`, `ripgrep`, `find_files`, and `list_files` all map to `'Grep'`.
4. **Write/Create variants (3 entries):** `write_file`, `write_to_file`, and `WriteFile` map to `'create_file'`.
5. **Edit variants (3 entries):** `edit`, `str_replace_editor`, and `EditTool` map to `'edit_file'`.
6. **Web variants (3 entries):** `web_search`, `browser`, and `fetch_url` map to `'WebSearch'`.

A notable inconsistency in the canonical names: some use PascalCase (`Read`, `Bash`, `Grep`, `WebSearch`) while others use snake_case (`create_file`, `edit_file`). This reflects the convention split between Claude's native tool names (PascalCase) and the Amp protocol's internal naming (snake_case). The normalization line is concise:

```typescript
const name = TOOL_NAME_MAP[rawName] ?? rawName;
```

If the raw name has no entry in the map, it passes through unchanged. This means tool names that already match their canonical form (e.g., `'Read'`, `'Bash'`, `'Grep'`) do not need map entries -- they fall through directly to the switch statement.

## The ToolCallWidget Class

ToolCallWidget extends `StatelessWidget` from flitter-core, meaning it has no mutable state -- its output is a pure function of its props. The class stores three properties set at construction time:

- **toolCall** (`ToolCallItem`): The full tool call data including `kind` (the raw tool name), `status`, `rawInput`, `result`, `collapsed`, `locations`, and more.
- **isExpanded** (`boolean`): Computed as `props.isExpanded ?? !props.toolCall.collapsed`. This dual-source logic means callers can override the collapsed state explicitly, but the default behavior is to invert the `collapsed` flag from the data model. The deprecated `ToolCallBlock` wrapper uses exactly this path: `isExpanded: !this.item.collapsed`.
- **onToggle** (optional callback): Passed through only to `GenericToolCard` instances. The specialized widgets (ReadTool, BashTool, etc.) do not receive this callback, suggesting they manage their own toggle behavior internally or are non-collapsible.

## The build() Dispatch Logic

The `build()` method is where routing happens. It follows a three-stage dispatch:

### Stage 1: Prefix-Based Sub-Agent Routing

```typescript
if (name.startsWith('sa__') || name.startsWith('tb__')) {
  return new TaskTool({ toolCall: this.toolCall, isExpanded: expanded });
}
```

Before the switch statement, the method checks for two prefixes:
- **`sa__`** (sub-agent): Tools delegated to a child agent session. These are dynamically named (e.g., `sa__code_review`, `sa__search_expert`) so they cannot be enumerated in a static switch.
- **`tb__`** (toolbox): Tools from external toolbox integrations, similarly dynamically named.

Both prefix families route to `TaskTool`, which renders a sub-agent-style card with streaming support and nested output. This is architecturally significant: it means any tool whose name starts with these prefixes is treated as a delegation boundary, regardless of what the tool actually does.

### Stage 2: The Switch Statement (Explicit Name Matching)

The switch handles 22 case labels across 9 return paths:

| Cases | Widget | Category |
|-------|--------|----------|
| `Read` | ReadTool | File I/O |
| `edit_file`, `apply_patch`, `undo_edit` | EditFileTool | File I/O |
| `create_file` | CreateFileTool | File I/O |
| `Bash`, `shell_command`, `REPL` | BashTool | Shell execution |
| `Grep`, `glob`, `Glob`, `Search` | GrepTool | Search |
| `WebSearch`, `read_web_page` | WebSearchTool | Web |
| `Task`, `oracle`, `code_review`, `librarian` | TaskTool | Sub-agents |
| `handoff` | HandoffTool | Agent handoff |
| `todo_list`, `todo_write`, `todo_read` | TodoListTool | Task tracking |
| `painter`, `mermaid`, `chart`, `look_at`, `format_file`, `skill`, `get_diagnostics` | GenericToolCard | Visual/Utility |

Some tools appear in both the normalization map and the switch (e.g., `Grep` is both a map target and a switch case), while some switch cases have no map entries (e.g., `apply_patch`, `REPL`, `oracle`) because those names are already canonical from the protocol.

### Stage 3: The Default Fallback

```typescript
default:
  return new GenericToolCard({ ... });
```

Any tool name that is neither prefix-matched nor switch-matched falls through to `GenericToolCard`. This is the safety net ensuring that new or unknown tools still render something usable. The fallback also handles the explicit visual/utility cases (`painter`, `mermaid`, etc.) that are listed in the switch but route to GenericToolCard anyway -- this explicit listing is likely for documentation clarity and to prevent future regressions if those tools later get specialized renderers.

## isExpanded / Collapsed Semantics

The expansion state flows through two paths:

1. **Data model path:** `ToolCallItem.collapsed` is a boolean set by the ACP session layer (defaults to `true` in both `session.ts` and `conversation.ts`). The `conversation.ts` state manager can bulk-toggle all tool calls via `this.toolCallsExpanded`.
2. **Widget prop path:** The `isExpanded` prop can override the data model. The constructor applies `props.isExpanded ?? !props.toolCall.collapsed`, so an explicit `false` from the parent takes precedence over the data model.

The `onToggle` callback is only forwarded to GenericToolCard, not to the specialized widgets. This means the specialized renderers either manage their own toggle internally (likely via the data model's `collapsed` field directly) or they are always shown in whatever state is passed to them.

## Architectural Observations

1. **Single Responsibility:** ToolCallWidget does exactly one thing -- dispatch. It contains zero rendering logic of its own.
2. **Open-Closed Alignment:** Adding a new tool type requires adding a map entry (if the name needs normalization), a switch case, and the corresponding widget class. The existing code does not need modification beyond this mechanical addition.
3. **Naming Inconsistency:** The canonical names mix PascalCase and snake_case. This does not cause bugs but adds cognitive load. It reflects the organic growth of the tool ecosystem.
4. **GenericToolCard Dual Role:** It serves as both the explicit renderer for visual/utility tools and the fallback for unknown tools. The `onToggle` callback is only present in GenericToolCard invocations, not in specialized widget invocations, suggesting the two categories handle interaction differently.
5. **Backward Compatibility:** The deprecated `ToolCallBlock` wrapper in `tool-call-block.ts` simply delegates to `ToolCallWidget`, proving the new dispatch system is a drop-in replacement for the old monolithic renderer.
