# Analysis 30 of 50 — WebSearchTool and TodoListTool Specialized Renderers

## File Locations

- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/web-search-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/todo-list-tool.ts`

---

## WebSearchTool

`WebSearchTool` is a `StatelessWidget` that renders web-search and URL-fetch tool calls. It accepts a `ToolCallItem` and an `isExpanded` boolean via `WebSearchToolProps`.

### Query Extraction

The search query is extracted from `toolCall.rawInput` by attempting multiple field names in a priority-ordered fallback chain:

```ts
const query = (input['query'] ?? input['url'] ?? input['search_query'] ?? input['q'] ?? input['search'] ?? '') as string;
```

This covers a wide range of search-related tool schemas: `query` (the most common), `url` (for page-fetch tools like `read_web_page`), `search_query`, the shorthand `q`, and bare `search`. If none of those fields exist the query falls back to an empty string. The resolved query string is passed as the `details` array to `ToolHeader`, which displays it beside the tool name in the collapsed view.

### Result Links Extraction

When expanded, the widget first calls `extractLinks()` to pull URLs from `toolCall.result.rawOutput`. It looks for an array under either `results` or `links` on the raw output object:

```ts
const results = (raw['results'] ?? raw['links'] ?? []) as Array<Record<string, unknown>>;
```

Each element is then probed for a URL string via `r['url'] ?? r['link'] ?? r['href']`. The result is filtered to remove falsy entries and capped at **10 links maximum** via `.slice(0, 10)`. Each link is rendered as a `Text` widget with a `"-> "` prefix (the arrow character), colored with the theme's `app.link` color (defaulting to `Color.cyan`), and left-padded by 2 units inside a `Padding` wrapper.

### Fallback to Raw Output

If no links are extracted, the widget falls back to `extractOutput()`. This method first tries `JSON.stringify(rawOutput, null, 2)` for a pretty-printed JSON dump, and if that is unavailable, it concatenates the `.content` array's text fields with newlines. The output is truncated at 1000 characters with a `"...(truncated)"` suffix. This fallback text is rendered in a muted/dim style using `theme.base.mutedForeground` (defaulting to `Color.brightBlack`).

### Layout

When collapsed (`isExpanded === false`), only the `ToolHeader` is returned. When expanded with body content, a `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'` wraps the header and all body children together.

---

## TodoListTool

`TodoListTool` is a `StatelessWidget` that renders todo-list management tool calls (`todo_list`, `todo_write`, `todo_read`). It takes the same shape of props: a `ToolCallItem` and an `isExpanded` flag.

### Todo Entry Interface

Each todo is modeled by the internal `TodoEntry` interface:

```ts
interface TodoEntry {
  content: string;
  status: string;
  priority?: string;
}
```

### Todo Extraction

The `extractTodoEntries()` method implements a two-stage lookup strategy:

1. **rawInput first**: It checks `toolCall.rawInput['todos']`. If this is a valid array, each element is normalized into a `TodoEntry` with `content` defaulting to `''` and `status` defaulting to `'pending'`.
2. **rawOutput fallback**: If input extraction yields nothing, it checks `toolCall.result.rawOutput` for a `todos` or `items` array and applies the same normalization.

This dual-source approach means the widget works both when writing todos (input contains the list) and when reading them (output contains the list).

### Status Icon Mapping

The `getStatusDisplay()` method maps each status string to a Unicode icon and a theme-aware color:

| Status        | Icon | Color                                      |
|---------------|------|--------------------------------------------|
| `pending`     | `○`  | `theme.base.mutedForeground` / `Color.brightBlack` |
| `in_progress` | `◐`  | `theme.base.warning` / `Color.yellow`      |
| `completed`   | `●`  | `theme.app.toolSuccess` / `Color.green`    |
| `cancelled`   | `∅`  | `theme.base.mutedForeground` / `Color.brightBlack` |

Any unrecognized status falls through to the `default` case, which mirrors `pending` (open circle, muted color).

### Text Styling by Status

Each todo entry is rendered as a `Text` widget containing a `TextSpan` with two children:
- The **icon span**, colored according to the status table above, prefixed with two spaces for indentation.
- The **content span**, which uses the base foreground color for active items but switches to `mutedForeground` with `dim: true` for `completed` entries. This visual dimming clearly distinguishes finished work from outstanding items.

### Layout

The expanded layout uses a nested `Column` structure. The outer column holds the `ToolHeader` and a `Padding` wrapper (left-padded by 2 units). Inside the padding sits an inner `Column` containing all the entry widgets. Both columns use `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'`. When there are no entries or when collapsed, the widget returns just the header.

---

## Shared Patterns

Both widgets share several architectural conventions:

- **Theme integration**: Both retrieve the current `AmpThemeProvider` from the build context and use it for color decisions, with hardcoded `Color.*` fallbacks ensuring the widgets degrade gracefully when no theme is provided.
- **Collapse/expand gating**: Both short-circuit to return only `ToolHeader` when `isExpanded` is false or when body content is empty, keeping the collapsed view lightweight.
- **Column-based layout**: Both use Flitter's `Column` with `mainAxisSize: 'min'` to avoid occupying more vertical space than needed.
- **Defensive extraction**: Both employ nullish coalescing chains and `Array.isArray` guards to handle varied or missing data shapes without throwing errors.
