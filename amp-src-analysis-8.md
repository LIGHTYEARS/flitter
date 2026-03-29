# Analysis 8: BashTool and GrepTool Specialized Renderers

## File Locations

- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/bash-tool.ts` (134 lines)
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/grep-tool.ts` (113 lines)
- Supporting dispatch: `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-call-widget.ts`
- Supporting header: `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-header.ts`
- Data types: `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts`

## Overview

BashTool and GrepTool are two of nine specialized tool renderers in the flitter-amp chat view. Both extend `StatelessWidget` and follow an identical structural pattern: construct a `ToolHeader` from extracted input fields, optionally render expanded output body below it using a `Column`, and apply consistent theming via `AmpThemeProvider`. They are dispatched by `ToolCallWidget`, which normalizes many tool-name variants into canonical names before routing to the appropriate renderer.

---

## BashTool: Shell Command Renderer

### Command Extraction

BashTool extracts the command string from `toolCall.rawInput` using a cascading fallback chain across five field names:

```typescript
const command = (input['command'] ?? input['cmd'] ?? input['shell_command'] ?? input['script'] ?? input['args'] ?? '') as string;
```

This multi-field approach accommodates different agent backends that may use varying parameter names for the same concept. The fallback order prioritizes the most common field names (`command`, `cmd`) and ends with less specific ones (`args`). If none is found, it defaults to an empty string, which means the header will render with no detail text (just the tool name and status icon).

### Dollar-Prefix Display Format

When a command is present, BashTool formats it with the classic shell prompt convention:

```typescript
const shortCmd = command.length > 80 ? command.slice(0, 80) + '...' : command;
details.push(`$ ${shortCmd}`);
```

The command is truncated at 80 characters with an ellipsis for the header line, preventing excessively long one-liner commands from breaking the layout. The `$ ` prefix provides immediate visual recognition that this is a shell command, mirroring the Amp CLI's original display convention.

### Exit Code Extraction and Display

The `extractExitCode()` method inspects `toolCall.result.rawOutput` for an `exit_code` field:

```typescript
private extractExitCode(): number | null {
  const raw = this.toolCall.result?.rawOutput;
  if (raw && typeof raw === 'object' && 'exit_code' in raw) {
    return raw['exit_code'] as number;
  }
  return null;
}
```

The exit code is rendered with semantic coloring:
- Exit code 0 (success) uses `theme.app.toolSuccess` (defaults to `Color.green`)
- Non-zero exit codes (failure) use `theme.base.destructive` (defaults to `Color.red`)

Both the exit code text and the output text use `dim: true` in their `TextStyle`, keeping the visual emphasis on the header while subordinating verbose output.

### Output Extraction (stdout/stderr)

The `extractOutput()` method implements a three-tier extraction strategy:

1. **rawOutput as string**: If `rawOutput` is a plain string, it is used directly.
2. **rawOutput as object with stdout/stderr**: Extracts `stdout` and `stderr` fields, concatenates them with a newline separator, filtering out empty values.
3. **rawOutput as object (other)**: Falls back to JSON-stringifying the entire raw output object with indentation.
4. **Content array fallback**: If no `rawOutput` exists, iterates over `result.content[]` extracting `.text` or `.content.text` from each element, joining with newlines.

This layered approach handles the different response shapes that various tool backends can produce. The output body is truncated at 2000 characters with a `\n...(truncated)` suffix to prevent extremely large command outputs from overwhelming the terminal viewport.

### Collapsed vs Expanded Behavior

When `isExpanded` is `false`, BashTool returns only the `ToolHeader` widget -- a single line showing status icon, tool name, and the `$ command` detail text. When expanded, it wraps the header and body children (output text + exit code) in a `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'`. If there are no body children even when expanded (no output and no exit code), it gracefully degrades to returning just the header.

---

## GrepTool: Search Result Renderer

### Pattern Extraction

GrepTool extracts the search pattern from `rawInput` with a six-field fallback chain:

```typescript
const pattern = (input['pattern'] ?? input['query'] ?? input['glob'] ?? input['search_pattern'] ?? input['regex'] ?? input['search'] ?? '') as string;
```

This covers the parameter naming conventions from Grep, Glob, ripgrep, and generic search tool backends. The `path` is similarly extracted from `input['path']` or `input['directory']`.

### Regex-Style Display Format

The pattern is displayed wrapped in forward slashes, mimicking regex literal notation:

```typescript
if (pattern) details.push(`/${pattern}/`);
if (path) details.push(path);
```

This gives an instantly recognizable visual cue that a search operation is being performed. The path is appended as a separate detail element. Both are rendered as dim, muted text in the header via `ToolHeader`.

### Match Count Extraction

The `extractMatchCount()` method checks `rawOutput` for three possible field names:

```typescript
if ('count' in raw) return raw['count'] as number;
if ('matchCount' in raw) return raw['matchCount'] as number;
if ('total' in raw) return raw['total'] as number;
```

When a match count is found, it is appended to the header details in parenthetical format: `(N matches)`. This provides at-a-glance feedback about search effectiveness without needing to expand the full results.

### Output Extraction

Unlike BashTool's nuanced stdout/stderr handling, GrepTool's `extractOutput()` is simpler:

1. If `rawOutput` exists, it is JSON-stringified with indentation.
2. Otherwise, it falls back to the same `result.content[]` text extraction pattern.

There is no special parsing of search-result structure (file paths, line numbers, matched lines) -- the raw JSON or content text is shown as-is. This keeps the renderer simple while still providing full result data when expanded.

### Expanded Body Rendering

When expanded, GrepTool wraps the header and output in a `Column`. However, unlike BashTool, if there is no output when expanded, it returns just the header -- it does not render an empty body. The output text uses the same 2000-character truncation threshold, dim styling, and muted foreground color as BashTool, maintaining visual consistency.

---

## Shared Patterns: ToolHeader Usage

Both renderers delegate header rendering to the `ToolHeader` widget (a `StatefulWidget` in `tool-header.ts`). ToolHeader displays:

1. **Status icon**: Checkmark for completed, X for failed, ellipsis for in-progress/pending
2. **Tool name**: Bold, colored with `theme.app.toolName` (default cyan)
3. **Details array**: Dim, muted text segments appended after the name
4. **Braille spinner**: Animated at ~100ms intervals when status is `in_progress`

The status-to-color mapping:
- `completed` -> `theme.app.toolSuccess` (green)
- `failed` -> `theme.base.destructive` (red)
- `in_progress` -> `theme.app.toolRunning` (blue)
- `pending` -> `theme.app.waiting` (yellow)

ToolHeader manages its own spinner lifecycle using `initState`, `didUpdateWidget`, and `dispose` -- starting/stopping a `setInterval` timer as the status transitions. This is the only stateful component in the tool rendering pipeline; BashTool and GrepTool themselves are stateless.

---

## Dispatch and Name Normalization

The `ToolCallWidget` dispatcher in `tool-call-widget.ts` routes tool calls to BashTool for canonical names `Bash`, `shell_command`, and `REPL`, with the `TOOL_NAME_MAP` also normalizing `execute_command`, `shell`, `run_command`, and `terminal` to `Bash`. Similarly, GrepTool handles `Grep`, `glob`, `Glob`, and `Search`, with `search`, `grep`, `ripgrep`, `find_files`, and `list_files` all normalized to `Grep`. This normalization layer means the renderers themselves can remain focused on presentation without worrying about name variations.

---

## Theme Integration

Both renderers access the theme through `AmpThemeProvider.maybeOf(context)`, which returns an optional theme object. Every color reference includes a fallback:

- Output text foreground: `theme?.base.mutedForeground ?? Color.brightBlack`
- BashTool success exit code: `theme?.app.toolSuccess ?? Color.green`
- BashTool failure exit code: `theme?.base.destructive ?? Color.red`

The `dim: true` flag on `TextStyle` ensures output and exit code text is visually de-emphasized relative to the header, creating a clear information hierarchy in the TUI.

---

## Summary

BashTool and GrepTool implement the specialized rendering for the two most frequently invoked tool categories in an AI coding assistant. They share an identical architectural skeleton -- props-based `StatelessWidget`, `ToolHeader` delegation, `isExpanded` gating, `Column` layout, 2000-character output truncation, and theme-driven dim styling -- while differing in their domain-specific input extraction fields (command vs. pattern/path), display formats (`$ cmd` vs. `/pattern/`), and result parsing (stdout/stderr/exit_code vs. match count/JSON). The separation of header rendering into the stateful `ToolHeader` widget keeps animation concerns (the braille spinner) isolated, while the `ToolCallWidget` dispatcher and `TOOL_NAME_MAP` insulate both renderers from the proliferation of tool name variants across different agent backends.
