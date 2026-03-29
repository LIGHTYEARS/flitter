# Analysis 9: GenericToolCard and ToolHeader Components

## File Locations

- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-header.ts`

---

## GenericToolCard

`GenericToolCard` is a `StatelessWidget` that serves as the default renderer for all tool call types in the Amp TUI. It receives a `ToolCallItem`, an `isExpanded` boolean, an optional `onToggle` callback, an optional `hideHeader` flag, and optional extra children widgets. The component orchestrates two major sub-widgets: `ToolHeader` for the status row, and a `Column`-based body that appears only when expanded.

### StickyHeader Layout

The outermost structural pattern is `StickyHeader`, a flitter-core widget that keeps the header pinned while the body scrolls. When `isExpanded` is false, only the header is returned directly (no StickyHeader wrapping). When expanded, the header and body are wrapped in `StickyHeader({ header, body })`. If the header is hidden (`hideHeader: true`), an empty `SizedBox` replaces it. If there are no body children to display even in expanded mode, the widget falls back to returning just the header, avoiding an empty StickyHeader container.

### extractDetails

The `extractDetails()` method is deliberately simple. It examines `toolCall.title` and, if present, pushes it into an array. The returned string array is passed to `ToolHeader` as `details`, where each string is rendered as a dimmed TextSpan after the tool name. This design allows future expansion -- the method signature returns an array, so additional detail sources (file paths, command summaries) could be added by specialized subclasses or overrides.

### extractInputText

`extractInputText()` builds a compact summary of `toolCall.rawInput`, which is typed as `Record<string, unknown>`. It iterates over every key in the input object. For string values, it formats as `key: value`. For non-string, non-null/undefined values, it JSON-stringifies them first. In both cases, a hard truncation limit of 120 characters is applied per value -- strings longer than 120 characters are sliced and suffixed with an ellipsis character (`...`). The individual `key: value` pairs are then joined with newline characters, producing a multi-line summary block. The result is rendered inside a `Padding` (left: 2) with a `Text` widget styled in dim muted foreground color from the theme (falling back to `Color.brightBlack`).

### extractDiff (Unified Diff Detection)

`extractDiff()` attempts to identify whether the tool result contains a unified diff. It performs a two-stage search:

1. **rawOutput check**: If `toolCall.result.rawOutput` exists, it is stringified (or used directly if already a string) and checked for the presence of both `@@` markers and either `---` or `+++` prefixes. These are the canonical markers of unified diff format -- `@@` introduces hunk headers, while `---` and `+++` mark the old and new file paths.

2. **content array check**: If rawOutput does not contain a diff, the method iterates over `toolCall.result.content`, extracting text from either a direct `text` property or a nested `content.text` path. Each text block is similarly checked for the `@@` plus `---`/`+++` pattern.

When a diff is detected, the raw diff string is returned and rendered through `DiffView({ diff })`, a specialized flitter-core widget for displaying unified diffs with syntax-highlighted additions and deletions. The `DiffView` is padded with left: 2 and right: 2. When no diff is detected, the code falls through to `extractOutputText()` and renders the output as Markdown instead.

### extractOutputText

`extractOutputText()` extracts plain text output for non-diff results. If `rawOutput` exists, it is JSON-stringified with 2-space indentation. A hard 2000-character truncation is applied with an appended `...(truncated)` indicator. If no rawOutput is available, the method maps over the `content` array, extracting text from each entry (checking both direct `.text` and nested `.content.text` paths), joining results with newlines. The output is rendered through the `Markdown` widget, supporting rich text formatting in the terminal.

### Body Assembly and Extra Children

After the input and output sections are assembled, any extra children widgets passed via the `children` prop are appended to the body column. This mechanism allows tool-specific card implementations to inject custom widgets (such as file trees, permission prompts, or progress bars) into the generic card layout. The body `Column` uses `mainAxisSize: 'min'` to avoid consuming excess vertical space and `crossAxisAlignment: 'stretch'` to ensure children fill the available width.

---

## ToolHeader

`ToolHeader` is a `StatefulWidget` that renders the single-line status row for a tool call. It displays, from left to right: a status icon, the tool name in bold, detail strings in dim text, and optionally a BrailleSpinner animation when the tool is in progress.

### Props and State Separation

The widget class (`ToolHeader`) stores immutable configuration: `name` (the tool kind string), `status` (one of `'pending' | 'in_progress' | 'completed' | 'failed'`), `details` (string array), and `extraChildren` (optional additional widgets). State management is delegated to `ToolHeaderState`, which owns the spinner instance and its interval timer.

### BrailleSpinner Animation

The spinner is driven by a `BrailleSpinner` instance -- a cellular automaton running on a 2x4 grid that maps to Unicode braille characters (U+2800 range). The automaton uses Game of Life-like rules on the tiny grid, with auto-reseeding when the pattern becomes static, cyclical (period <= 4), or depleted (fewer than 2 live cells). This produces visually organic, non-repetitive animation patterns unique to each tool invocation.

The animation runs on a 100ms `setInterval` timer. Each tick calls `this.spinner.step()` inside `this.setState()`, triggering a rebuild that reads the spinner's current braille character via `this.spinner.toBraille()`. The resulting character is appended as the final TextSpan in the header row.

### Status Icon Mapping

`getStatusIcon()` returns a Unicode character based on the tool status:

| Status | Icon |
|--------|------|
| `completed` | `\u2713` (checkmark) |
| `failed` | `\u2717` (cross/ballot X) |
| `in_progress` | `\u22EF` (midline horizontal ellipsis) |
| `pending` | `\u22EF` (midline horizontal ellipsis) |

Both `in_progress` and `pending` share the same ellipsis icon, but they are distinguished by color.

### Status Color Mapping

`getStatusColor()` maps each status to a theme color, with hardcoded fallbacks:

| Status | Theme Path | Fallback |
|--------|-----------|----------|
| `completed` | `app.toolSuccess` | `Color.green` |
| `failed` | `base.destructive` | `Color.red` |
| `in_progress` | `app.toolRunning` | `Color.blue` |
| `pending` | `app.waiting` | `Color.yellow` |

The color is applied to the status icon TextSpan. The tool name uses a separate `app.toolName` theme color (falling back to `Color.cyan`) and is rendered bold. Detail strings use `base.mutedForeground` (falling back to `Color.brightBlack`) with the `dim` attribute enabled.

### Lifecycle Management

The lifecycle of the spinner timer is carefully managed across three hooks:

1. **`initState()`**: If the initial status is `in_progress`, `startSpinner()` is called immediately, beginning the 100ms animation loop.

2. **`didUpdateWidget(oldWidget)`**: This handles transitions. If the status changes to `in_progress` and no timer is running, the spinner starts. If the status changes away from `in_progress` and a timer exists, `stopSpinner()` clears it. This correctly handles all four transitions: pending->in_progress (start), in_progress->completed (stop), in_progress->failed (stop), and no-change cases (no-op).

3. **`dispose()`**: Unconditionally calls `stopSpinner()` to prevent leaked intervals when the widget is removed from the tree.

The `stopSpinner()` method is null-safe, checking for `this.timer` before calling `clearInterval` and then nulling the reference. This guard allows it to be called safely from both `didUpdateWidget` and `dispose` without double-clearing.

### Render Structure

The `build()` method assembles a `TextSpan` with children spans for the icon, name, details, and optional spinner. If no `extraChildren` are provided, the root `Text` widget is returned directly. If extra children exist, the text is wrapped in a `Row({ mainAxisSize: 'min' })` alongside them, allowing tool-specific header additions (like action buttons or badges) to be placed inline.

### Theme Integration

Both components integrate with `AmpThemeProvider`, the TUI's inherited theme system. `AmpThemeProvider.maybeOf(context)` is used rather than a required lookup, meaning both components degrade gracefully with hardcoded color fallbacks when no theme is available. This is a deliberate resilience pattern that supports testing without a full theme tree.

---

## Interaction Between Components

The two components form a clean parent-child relationship. `GenericToolCard` constructs a `ToolHeader` with extracted details and passes it as the `header` of a `StickyHeader`. The `ToolHeader` handles its own animation lifecycle independently -- `GenericToolCard` never needs to manage spinners or timers. Status changes flow through widget reconstruction: when the parent rebuilds with an updated `toolCall.status`, `ToolHeader` receives a new widget instance, and `didUpdateWidget` handles the spinner state transition. This separation of concerns keeps `GenericToolCard` focused purely on content extraction and layout, while `ToolHeader` encapsulates all presentation logic for the status row.
