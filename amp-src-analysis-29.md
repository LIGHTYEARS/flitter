# Analysis 29: ReadTool and EditFileTool Specialized Renderers

## Files Analyzed

- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/read-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/edit-file-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/diff-view.ts` (supporting widget)
- `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts` (shared types)

## ReadTool

`ReadTool` is a `StatelessWidget` that renders a file-read tool call. It accepts a `ToolCallItem` and an `isExpanded` boolean.

### File Path Extraction

The widget extracts the file path from `rawInput` using a four-key fallback chain:

```ts
const filePath = (input['file_path'] ?? input['path'] ?? input['filename'] ?? input['file'] ?? '') as string;
```

This accommodates multiple possible input schemas that different tool implementations may use. The path is passed into the `ToolHeader` via the `details` array.

### Line Range Display

The widget reads `offset` and `limit` from `rawInput`. When both are present, it constructs a line-range label in the format `L{offset}-{offset+limit}` (e.g., `L10-30`). When only `offset` is provided, it shows `L{offset}`. These labels are appended to the `details` array alongside the file path, so the header displays something like `Read: /src/foo.ts L10-30`.

### Output Extraction

The private `extractOutput()` method uses a two-tier strategy:

1. **rawOutput path**: If `this.toolCall.result.rawOutput` exists, the entire object is serialized via `JSON.stringify(rawOutput, null, 2)` with pretty-printing.
2. **content array path**: Otherwise, it iterates over `result.content`, extracting text from each item by first checking `(c as Record<string, unknown>)['text']` and falling back to `c.content?.text`. The results are joined with newlines.

### 1000-Character Truncation

When expanded, the output text is hard-capped at 1000 characters. If the text exceeds this threshold, it is sliced to 1000 characters and the string `\n...(truncated)` is appended. The truncated text is rendered as a `Text` widget with a muted, dimmed `TextStyle` using the theme's `mutedForeground` or `Color.brightBlack` as a fallback.

### Collapsed Behavior

When `isExpanded` is false, only the `ToolHeader` is returned -- no output body is rendered. When expanded but no output text is available, the header is also returned alone, avoiding an empty Column.

---

## EditFileTool

`EditFileTool` is a `StatelessWidget` that handles three tool kinds: `edit_file`, `apply_patch`, and `undo_edit`. Its JSDoc explicitly documents this multi-kind responsibility.

### File Path Extraction

The path extraction is simpler than ReadTool, using only a two-key chain:

```ts
const filePath = (input['file_path'] ?? input['path'] ?? '') as string;
```

The `kind` is passed directly from `this.toolCall.kind` without a fallback default, unlike ReadTool which defaults to `'Read'`.

### Unified Diff Detection and DiffView Rendering

The core rendering logic revolves around `extractDiff()`, which attempts to locate a unified diff string through a multi-stage pipeline:

1. **rawOutput check**: If the result has `rawOutput`, it converts it to a string (directly if already a string, otherwise via `JSON.stringify`). A `checkDiff` helper tests whether the string contains both `@@` and at least one of `---` or `+++`, which are the hallmarks of a unified diff format.
2. **content array check**: If rawOutput yields no diff, it iterates over `result.content`, pulling `c.content?.text` from each entry and applying the same `checkDiff` test.
3. **old_str/new_str fallback construction**: If neither the result rawOutput nor content contains a diff, the method falls back to reading `old_str` and `new_str` from `rawInput` and manually constructs a synthetic unified diff. Each line of `old_str` is prefixed with `-` and each line of `new_str` with `+`, wrapped with `--- a` / `+++ b` headers and a minimal `@@ @@` hunk header (without line numbers).

When a diff is found, it is rendered using `DiffView` from `flitter-core`, which is a full-featured unified diff renderer. `DiffView` parses the diff into hunks, classifies lines (addition, deletion, context, meta, hunk-header), applies color-coded `TextStyle` values (green for additions, red for deletions, cyan for hunk headers), supports optional word-level diff highlighting via the Myers algorithm, and can display dual old/new line numbers. The `EditFileTool` instantiates it with `showLineNumbers: true` and wraps it in `Padding` with left/right insets of 2.

### Summary Fallback

When no diff can be extracted at all, the widget falls back to `extractSummary()`, which mirrors the ReadTool output extraction but truncates at 500 characters (not 1000). The summary is rendered as muted, dimmed text -- the same style ReadTool uses for its output.

### apply_patch and undo_edit Handling

The widget does not special-case these tool kinds at the rendering level. They share the same `extractDiff()` and `extractSummary()` pipelines. The `apply_patch` tool typically produces unified diffs in its output, so the `checkDiff` detection captures them naturally. For `undo_edit`, which may not produce a diff, the summary fallback handles the output gracefully by showing the raw result text. The tool kind name is passed through to the `ToolHeader` via `this.toolCall.kind`, so the header label reflects whichever operation was invoked.

### Output Extraction Patterns Comparison

| Aspect | ReadTool | EditFileTool |
|--------|----------|--------------|
| Primary output | Plain text, JSON-serialized | Unified diff via DiffView |
| Path keys | `file_path`, `path`, `filename`, `file` | `file_path`, `path` |
| Truncation | 1000 chars | 500 chars (summary only) |
| Expanded body | Text with muted style | DiffView or muted summary |
| Default kind | `'Read'` | No default (uses `kind` directly) |
| rawOutput handling | `JSON.stringify` always | String check first, then `JSON.stringify` |

Both widgets share the same overall structure: header-only when collapsed, Column with header + body when expanded, and graceful fallback to header-only when no content is available.
