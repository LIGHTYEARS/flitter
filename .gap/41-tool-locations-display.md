# Gap T03: ToolCallItem.locations Field Carried but Not Rendered

## Problem Statement

The `ToolCallItem` interface in `types.ts` (line 49) declares an optional `locations` field:

```typescript
export interface ToolCallItem {
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  locations?: Array<{ path: string }>;   // <-- populated but never rendered
  rawInput?: Record<string, unknown>;
  result?: ToolCallResult;
  collapsed: boolean;
}
```

This field is fully wired through the data pipeline:

1. **ACP client** (`client.ts`, line 35): The `PermissionRequest` interface includes
   `locations?: Array<{ path: string }>` on the tool call object.

2. **App state** (`app-state.ts`, line 99): The `tool_call` case in `onSessionUpdate`
   forwards `update.locations as Array<{ path: string }> | undefined` into the conversation
   store.

3. **Session** (`session.ts`, line 67): The `addToolCall` method accepts `locations` as a
   parameter and stores it on the `ToolCallItem`.

4. **Conversation** (`conversation.ts`, line 82): The `addToolCall` method also accepts and
   stores `locations`.

Despite this complete ingestion pipeline, **no widget in the rendering layer ever reads
`toolCall.locations`**. The field is silently discarded at the point of rendering.

## Evidence: Full Grep of `locations` Usage

A search for `locations` across the entire `flitter-amp/src` directory reveals exactly seven
references, all in the data/plumbing layer, and zero in any widget or rendering file:

| File | Line | Context |
|------|------|---------|
| `acp/types.ts` | 49 | Type definition: `locations?: Array<{ path: string }>` |
| `acp/session.ts` | 67 | `addToolCall` parameter: `locations?: Array<{ path: string }>` |
| `acp/session.ts` | 80 | Assignment: `locations,` |
| `acp/client.ts` | 35 | `PermissionRequest.toolCall.locations` type |
| `state/conversation.ts` | 82 | `addToolCall` parameter: `locations?: Array<{ path: string }>` |
| `state/conversation.ts` | 92 | Assignment: `locations,` |
| `state/app-state.ts` | 99 | Cast: `update.locations as Array<{ path: string }> \| undefined` |

Zero references in:
- `widgets/tool-call/generic-tool-card.ts`
- `widgets/tool-call/tool-header.ts`
- `widgets/tool-call/tool-call-widget.ts`
- `widgets/tool-call/read-tool.ts`
- `widgets/tool-call/edit-file-tool.ts`
- `widgets/tool-call/bash-tool.ts`
- `widgets/tool-call/grep-tool.ts`
- `widgets/tool-call/create-file-tool.ts`
- `widgets/tool-call/web-search-tool.ts`
- `widgets/tool-call/task-tool.ts`
- `widgets/tool-call/handoff-tool.ts`
- `widgets/tool-call/todo-list-tool.ts`
- `widgets/chat-view.ts`
- `widgets/permission-dialog.ts`

## Rendering Layer Analysis

The `GenericToolCard` (`generic-tool-card.ts`) -- which is the default fallback renderer and
serves as the base for `TaskTool` -- has three display areas:

- **Header details** (via `extractDetails()`, line 132): Only reads `this.toolCall.title`.
- **Input section** (via `extractInputText()`, line 143): Reads `this.toolCall.rawInput`.
- **Output section** (via `extractOutputText()`, line 190): Reads `this.toolCall.result`.

None of these access `this.toolCall.locations`.

Similarly, the 9 specialized renderers each extract their own details from `rawInput`
(e.g. `file_path`, `pattern`, `command`) but never touch `locations`:

| Renderer | What it reads from `rawInput` | `locations` used? |
|----------|-------------------------------|-------------------|
| `ReadTool` | `file_path`, `path`, `filename`, `file`, `offset`, `limit` | No |
| `EditFileTool` | `file_path`, `path`, `old_str`, `new_str` | No |
| `BashTool` | `command`, `cmd`, `shell_command`, `script`, `args` | No |
| `GrepTool` | `pattern`, `query`, `glob`, `path`, `directory` | No |
| `CreateFileTool` | `file_path`, `path`, `filename`, `file`, `destination`, `content` | No |
| `WebSearchTool` | `query`, `url`, `search_query`, `q`, `search` | No |
| `TaskTool` | Delegates to `GenericToolCard` | No |
| `HandoffTool` | `thread_id`, `threadId` | No |
| `TodoListTool` | `todos` (array), result `todos`/`items` | No |

## Semantic Purpose of `locations`

The `locations` field is populated by ACP (Agent Client Protocol) to indicate which file
system paths a tool call is operating on or has affected. Unlike `rawInput` -- which contains
the raw arguments the agent sent to the tool -- `locations` provides a normalized, structured
list of file references that the protocol itself has resolved.

Key differences from `rawInput`-based path extraction:

| Aspect             | `rawInput` paths                          | `locations` paths                    |
|--------------------|-------------------------------------------|--------------------------------------|
| Source             | Agent-provided tool arguments             | ACP protocol resolved                |
| Normalization      | Varies by tool (file_path, path, etc.)    | Always `{ path: string }`           |
| Availability       | Only present for tools with path args     | Present for any tool touching files  |
| Reliability        | May contain relative or abbreviated paths | Consistently absolute               |
| Count              | Typically single path per input key       | Array -- can list multiple files     |

For tools like `Bash` or `Task` that may touch many files without explicit path arguments,
`locations` is the *only* structured way to know which files were involved. For tools like
`Read` or `edit_file`, `locations` serves as a canonical confirmation of the file targeted,
potentially supplementing or correcting what was in `rawInput`.

## Root Cause

The original implementation focused on getting the data pipeline correct (ingest from ACP,
store in conversation state) but the rendering side was built to extract file context from
`rawInput` on a per-tool basis. The `locations` field was added to the type and plumbing but
no corresponding rendering logic was ever implemented.

## Proposed Solution

The fix has three tiers: (1) render locations in `GenericToolCard` as the baseline for all
tools, (2) integrate locations into specialized renderers that would benefit, and (3) extract
a reusable `LocationsBar` widget.

---

### Tier 1: Render Locations in GenericToolCard

This is the minimum viable fix. Since `GenericToolCard` is the default renderer and also the
base used by `TaskTool`, adding location rendering here provides coverage for all tools that
use the generic path.

#### 1a. Add `extractLocationsText()` helper method

Add a new private method to `GenericToolCard` that formats the locations array into a
human-readable display:

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts`

```typescript
/**
 * Formats the locations array into a compact file-reference display.
 * Returns one path per line, or null if locations is empty/undefined.
 */
private extractLocationsText(): string | null {
  const locs = this.toolCall.locations;
  if (!locs || locs.length === 0) return null;

  return locs.map(loc => loc.path).join('\n');
}
```

**Insertion point:** After the existing `extractOutputText()` method (after line 201).

#### 1b. Render locations as a labeled section in the expanded body

In `GenericToolCard.build()`, insert a locations section between the input section and
the output/diff section. The locations should appear with a subtle label and use the
`fileReference` theme color (which exists in `AmpAppColors` at line 55 of `amp-theme-data.ts`
as `readonly fileReference: Color`):

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts`

Changes to the `build()` method -- insert after the input section block (after line 87)
and before the diff/output section (before line 89):

```typescript
// --- Locations section (NEW) ---
const locationsText = this.extractLocationsText();
if (locationsText) {
  bodyChildren.push(
    new Padding({
      padding: EdgeInsets.only({ left: 2 }),
      child: new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Files: ',
              style: new TextStyle({
                foreground: theme?.base.mutedForeground ?? Color.brightBlack,
                dim: true,
              }),
            }),
            new TextSpan({
              text: locationsText,
              style: new TextStyle({
                foreground: theme?.app.fileReference ?? Color.cyan,
              }),
            }),
          ],
        }),
      }),
    }),
  );
}
```

This produces output like:

```
Files: /home/user/project/src/widgets/tool-call/generic-tool-card.ts
       /home/user/project/src/acp/types.ts
```

The `Files:` label uses the muted/dim style for visual hierarchy, while the paths use the
`fileReference` color to visually connect them with other file references in the UI.

---

### Tier 2: Surface Locations in the Header Details for Collapsed View

The expanded-body rendering from Tier 1 only helps when a tool card is expanded. For
collapsed cards, locations should also appear in the header as detail strings, giving the
user at-a-glance context about which files are being touched.

#### 2a. Add a `shortenPath()` utility method

Long absolute paths would overwhelm the header line. A utility method truncates to the
last two path segments:

```typescript
/**
 * Shortens a file path for header display by showing only the filename
 * and immediate parent directory. Long paths like
 * '/home/user/project/src/widgets/tool-call/generic-tool-card.ts'
 * become 'tool-call/generic-tool-card.ts'.
 */
private shortenPath(fullPath: string): string {
  const parts = fullPath.split('/').filter(p => p.length > 0);
  if (parts.length <= 2) return fullPath;
  return parts.slice(-2).join('/');
}
```

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts`
**Insertion point:** After `extractLocationsText()`.

#### 2b. Enhance `extractDetails()` in `GenericToolCard`

Modify `extractDetails()` to append location paths after the title, capped at 2 paths
with an overflow indicator:

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts`
**Replace:** Lines 132-138 (`extractDetails()` method body)

```typescript
private extractDetails(): string[] {
  const details: string[] = [];
  if (this.toolCall.title) {
    details.push(this.toolCall.title);
  }

  // Append location paths as header details
  const locs = this.toolCall.locations;
  if (locs && locs.length > 0) {
    const displayPaths = locs.slice(0, 2).map(loc => this.shortenPath(loc.path));
    details.push(...displayPaths);
    if (locs.length > 2) {
      details.push(`+${locs.length - 2} more`);
    }
  }

  return details;
}
```

This produces collapsed header lines like:

```
✓ Bash  tool-call/generic-tool-card.ts  acp/types.ts  +3 more
⋯ Read  acp/types.ts
✓ edit_file  widgets/tool-header.ts
```

#### 2c. Deduplication in specialized renderers

Specialized renderers like `ReadTool` and `EditFileTool` already extract a file path from
`rawInput` and display it as a header detail. If these renderers also gain locations
rendering, there is a risk of duplicate path display.

The solution is a dedup check: if a location path matches the path already extracted from
`rawInput`, skip it. This applies to the following 5 renderers that display paths from
rawInput:

1. **ReadTool** (`read-tool.ts`)
2. **EditFileTool** (`edit-file-tool.ts`)
3. **GrepTool** (`grep-tool.ts`)
4. **CreateFileTool** (`create-file-tool.ts`)

In each, after building the initial `details` array from rawInput, append non-duplicate
locations:

```typescript
// Example for ReadTool, after existing details construction (line 43-49):

// Append non-duplicate locations
const locs = this.toolCall.locations;
if (locs && locs.length > 0) {
  for (const loc of locs) {
    // Skip if this path is already shown (exact match or suffix match)
    if (filePath && (loc.path === filePath || loc.path.endsWith('/' + filePath))) {
      continue;
    }
    const parts = loc.path.split('/').filter(p => p.length > 0);
    const short = parts.length <= 2 ? loc.path : parts.slice(-2).join('/');
    details.push(short);
  }
  // Cap at reasonable count for header
  if (details.length > 4) {
    const overflow = details.length - 3;
    details.length = 3;
    details.push(`+${overflow} more`);
  }
}
```

For **BashTool**, **WebSearchTool**, **HandoffTool**, and **TodoListTool**, there is no
rawInput file path to deduplicate against. These can directly append all location paths:

```typescript
// Example for BashTool, after existing details construction (line 41-45):

const locs = this.toolCall.locations;
if (locs && locs.length > 0) {
  const displayPaths = locs.slice(0, 2).map(loc => {
    const parts = loc.path.split('/').filter(p => p.length > 0);
    return parts.length <= 2 ? loc.path : parts.slice(-2).join('/');
  });
  details.push(...displayPaths);
  if (locs.length > 2) {
    details.push(`+${locs.length - 2} more`);
  }
}
```

---

### Tier 3: Dedicated LocationsBar Widget (Optional Enhancement)

For a richer display, create a small `LocationsBar` widget that can be reused by any tool
renderer. This widget renders the locations as a horizontal row of file-reference chips,
each styled with the `fileReference` color.

#### 3a. New file: `locations-bar.ts`

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/locations-bar.ts`

```typescript
// LocationsBar -- renders a row of file path references from ToolCallItem.locations
// Styled using AmpTheme.app.fileReference color with a folder icon prefix.

import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { AmpThemeProvider } from '../../themes/index';

interface LocationsBarProps {
  locations: Array<{ path: string }>;
  /** Maximum number of locations to display before showing "+N more" */
  maxDisplay?: number;
}

/**
 * Renders a compact bar of file location references.
 *
 * Layout:
 *   [folder icon] path/to/file1  path/to/file2  +3 more
 *
 * Each path is shortened to its last two segments for brevity.
 * Uses the fileReference theme color for paths.
 */
export class LocationsBar extends StatelessWidget {
  private readonly locations: Array<{ path: string }>;
  private readonly maxDisplay: number;

  constructor(props: LocationsBarProps) {
    super({});
    this.locations = props.locations;
    this.maxDisplay = props.maxDisplay ?? 3;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);

    if (this.locations.length === 0) {
      return new Text({ text: new TextSpan({ text: '' }) });
    }

    const pathColor = theme?.app.fileReference ?? Color.cyan;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;

    const displayLocs = this.locations.slice(0, this.maxDisplay);
    const overflow = this.locations.length - this.maxDisplay;

    const spans: TextSpan[] = [];

    // Folder icon prefix
    spans.push(new TextSpan({
      text: '\u{1F4C2} ',
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }));

    for (let i = 0; i < displayLocs.length; i++) {
      if (i > 0) {
        spans.push(new TextSpan({
          text: '  ',
          style: new TextStyle({ foreground: mutedColor }),
        }));
      }
      spans.push(new TextSpan({
        text: this.shortenPath(displayLocs[i].path),
        style: new TextStyle({ foreground: pathColor }),
      }));
    }

    if (overflow > 0) {
      spans.push(new TextSpan({
        text: `  +${overflow} more`,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
    }

    return new Padding({
      padding: EdgeInsets.only({ left: 2 }),
      child: new Text({
        text: new TextSpan({ children: spans }),
      }),
    });
  }

  private shortenPath(fullPath: string): string {
    const parts = fullPath.split('/').filter(p => p.length > 0);
    if (parts.length <= 2) return fullPath;
    return parts.slice(-2).join('/');
  }
}
```

#### 3b. Update barrel export

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/index.ts`

Add after existing exports:

```typescript
export { LocationsBar } from './locations-bar';
```

#### 3c. Integrate LocationsBar into GenericToolCard

Instead of the inline Text rendering from Tier 1, use the dedicated widget:

```typescript
import { LocationsBar } from './locations-bar';

// Inside GenericToolCard.build(), replace the inline locations Text with:
if (this.toolCall.locations && this.toolCall.locations.length > 0) {
  bodyChildren.push(
    new LocationsBar({
      locations: this.toolCall.locations,
      maxDisplay: 3,
    }),
  );
}
```

#### 3d. Integrate LocationsBar into all specialized renderers

Each specialized renderer that builds a `bodyChildren` array can include the same pattern.
The insertion point for each is after the header and before the main output content:

| Renderer | Insert after | Insert before |
|----------|-------------|---------------|
| `ReadTool` | header (line 58-59) | outputText block (line 64) |
| `EditFileTool` | header (line 47-49) | diff extraction (line 51) |
| `BashTool` | header (line 53-55) | output extraction (line 59) |
| `GrepTool` | header (line 58-59) | output check (line 62) |
| `CreateFileTool` | header (line 46-48) | content extraction (line 50) |
| `WebSearchTool` | header (line 47-49) | bodyChildren construction (line 51) |
| `HandoffTool` | header (line 107-109) | isInProgress check (line 115) |
| `TodoListTool` | header (line 52-54) | entries extraction (line 56) |

For `TaskTool`, which delegates to `GenericToolCard`, the locations bar is automatically
included once `GenericToolCard` renders it.

Example for `ReadTool`:

```typescript
import { LocationsBar } from './locations-bar';

// In ReadTool.build(), after the header and before output rendering:
if (this.toolCall.locations && this.toolCall.locations.length > 0) {
  bodyChildren.push(
    new LocationsBar({
      locations: this.toolCall.locations,
    }),
  );
}
```

---

## Detailed File Change Summary

| # | File | Change | Tier |
|---|------|--------|------|
| 1 | `generic-tool-card.ts` | Add `extractLocationsText()` method; render locations in body; enhance `extractDetails()` with location paths; add `shortenPath()` helper | 1 + 2 |
| 2 | `read-tool.ts` | Add location paths to header details with dedup against rawInput `file_path` | 2 |
| 3 | `edit-file-tool.ts` | Add location paths to header details with dedup against rawInput `file_path` | 2 |
| 4 | `bash-tool.ts` | Add location paths to header details (no dedup needed -- Bash has no rawInput path) | 2 |
| 5 | `grep-tool.ts` | Add location paths to header details with dedup against rawInput `path` | 2 |
| 6 | `create-file-tool.ts` | Add location paths to header details with dedup against rawInput `file_path` | 2 |
| 7 | `web-search-tool.ts` | Add location paths to header details (no dedup needed) | 2 |
| 8 | `handoff-tool.ts` | Add location paths to header details (no dedup needed) | 2 |
| 9 | `todo-list-tool.ts` | Add location paths to header details (no dedup needed) | 2 |
| 10 | `locations-bar.ts` (NEW) | Dedicated reusable widget for rendering locations | 3 |
| 11 | `index.ts` | Export `LocationsBar` from the tool-call widget barrel | 3 |

---

## Visual Examples

### Collapsed tool card (Tier 2 header details)

Before:
```
✓ Bash
⋯ Read  /home/user/project/src/acp/types.ts
✓ edit_file  /home/user/project/src/widgets/tool-header.ts
```

After:
```
✓ Bash  tool-call/generic-tool-card.ts  acp/types.ts  +3 more
⋯ Read  /home/user/project/src/acp/types.ts
✓ edit_file  /home/user/project/src/widgets/tool-header.ts  acp/session.ts
```

Note: `Read` and `edit_file` already show the primary path from `rawInput`, so only
*additional* locations beyond the rawInput path appear (deduplication in action). For `Bash`,
which has no file path in its rawInput, the locations field is the sole source of file
context.

### Expanded tool card (Tier 1 body rendering)

Before:
```
✓ Bash
  command: npm run build
  {"exitCode": 0, "stdout": "..."}
```

After:
```
✓ Bash
  command: npm run build
  Files: tool-call/generic-tool-card.ts
         acp/types.ts
         acp/session.ts
         state/conversation.ts
         state/app-state.ts
  {"exitCode": 0, "stdout": "..."}
```

### Expanded tool card with LocationsBar (Tier 3)

```
✓ Bash
  command: npm run build
  [folder] tool-call/generic-tool-card.ts  acp/types.ts  acp/session.ts  +2 more
  {"exitCode": 0, "stdout": "..."}
```

### Permission dialog context

The `PermissionDialog` at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/permission-dialog.ts`
currently displays `toolCall.title` and `toolCall.kind` (line 96) but not `locations`. While
not strictly part of this gap (the dialog is a separate rendering context), a future
enhancement could display locations in the permission dialog to give users more context when
approving tool calls. This is out of scope for this gap but worth noting as a follow-on.

---

## Edge Cases and Considerations

### 1. Empty locations array

The `locations` field may be present but empty (`[]`). All rendering code guards against this
with `locs.length > 0` checks. An empty array produces no visual output.

### 2. Undefined locations

The field is optional (`locations?`). All code uses optional chaining or explicit undefined
checks. If not present, no locations rendering occurs -- identical to current behavior.

### 3. Very long paths

Paths can be deeply nested (e.g. `/home/user/workspace/monorepo/packages/core/src/deep/path/file.ts`).
The `shortenPath()` helper truncates to the last two segments for header display. In the
expanded body, full paths are shown since there is more horizontal space.

`shortenPath()` behavior table:

| Input | Output |
|-------|--------|
| `/home/user/project/src/widgets/tool-call/generic-tool-card.ts` | `tool-call/generic-tool-card.ts` |
| `/a/b.ts` | `/a/b.ts` (unchanged, <= 2 segments) |
| `relative/path.ts` | `relative/path.ts` (unchanged, <= 2 segments) |
| `/root.ts` | `/root.ts` (unchanged, <= 2 segments) |

### 4. Many locations

Some tool calls (e.g. a Bash command that runs a formatter across dozens of files) may have
many locations. The display caps at configurable limits:

- **Header details (Tier 2):** Maximum 2 paths + overflow indicator
- **LocationsBar (Tier 3):** Maximum 3 paths (configurable via `maxDisplay`) + overflow indicator
- **Expanded body text (Tier 1):** Shows all paths, but the body itself may be scrollable

### 5. Duplicate paths between locations and rawInput

Specialized renderers like `ReadTool` already display a file path extracted from `rawInput`.
If the same path appears in `locations`, it would be shown twice. The Tier 2 solution
includes deduplication logic that compares location paths against the already-displayed
rawInput path using both exact match and suffix match (to handle relative vs absolute paths).

Dedup comparison logic:

```typescript
// Exact match
loc.path === filePath

// Suffix match (handles relative paths in rawInput matching absolute in locations)
loc.path.endsWith('/' + filePath)
```

### 6. Path-only type structure and forward compatibility

The current type is `Array<{ path: string }>`. If ACP later enriches this with line numbers
(e.g. `{ path: string; line?: number; endLine?: number }`), the rendering code should be
forward-compatible. The proposed implementation accesses only `.path` today but the
`LocationsBar` widget can be extended to show line ranges when the type is enriched:

```typescript
// Future-compatible extension:
interface LocationEntry {
  path: string;
  line?: number;
  endLine?: number;
}

// In LocationsBar:
const lineRange = loc.line !== undefined
  ? (loc.endLine !== undefined ? `:${loc.line}-${loc.endLine}` : `:${loc.line}`)
  : '';
const display = `${this.shortenPath(loc.path)}${lineRange}`;
```

This would produce displays like `tool-call/generic-tool-card.ts:45-80`.

### 7. Theme color availability

The `fileReference` color is defined in `AmpAppColors` (line 55 of `amp-theme-data.ts`).
All theme implementations provide this color. The fallback `Color.cyan` is used when no
theme is available (e.g., in test contexts without `AmpThemeProvider`).

### 8. ToolHeader detail rendering constraints

The `ToolHeader` component renders details as `TextSpan` elements with the `dim: true`
style and `mutedForeground` color. Location paths added to the details array will inherit
this styling. This is intentional -- location paths in the collapsed header should be
visually secondary to the tool name and status icon.

However, this means location paths in the header and in the expanded body have *different*
styling:
- **Header:** Dim, muted foreground (via ToolHeader detail spans)
- **Body:** `fileReference` color, not dim (via the explicit new section)

This visual distinction is correct and intentional: the header provides a brief hint, while
the body provides a detailed reference.

---

## Recommended Implementation Order

1. **Start with Tier 1** -- Modify `GenericToolCard` only. This provides immediate coverage
   for all tools using the generic renderer (which includes the default fallback for unknown
   tools and the `TaskTool` delegation path). Minimal risk, localized change.

2. **Add Tier 2** -- Enhance `extractDetails()` in `GenericToolCard` and add dedup logic to
   specialized renderers. This gives collapsed-view context across all tool types. Moderate
   scope but each file change is small (3-10 lines per renderer).

3. **Optionally add Tier 3** -- Extract `LocationsBar` as a reusable widget. This is a
   refactoring step that improves code reuse and provides a richer visual treatment. It can
   be done independently after Tiers 1 and 2 are verified.

---

## Testing Considerations

### Unit Tests for GenericToolCard

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/tool-card-layout.test.ts`

The existing test file already has a `makeToolCall()` helper and tests for all tool card
types. Add tests for locations rendering:

```typescript
describe('GenericToolCard: locations rendering', () => {
  it('renders locations section when locations are present and expanded', () => {
    const tc = makeToolCall('painter', {
      locations: [
        { path: '/home/user/project/src/foo.ts' },
        { path: '/home/user/project/src/bar.ts' },
      ],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);

    // Verify that the rendered tree contains a TextSpan with "Files: "
    const textContent = extractTextContent(tree);
    expect(textContent).toContain('Files:');
    expect(textContent).toContain('/home/user/project/src/foo.ts');
    expect(textContent).toContain('/home/user/project/src/bar.ts');
  });

  it('does not render locations section when locations is undefined', () => {
    const tc = makeToolCall('painter', { locations: undefined });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);

    const textContent = extractTextContent(tree);
    expect(textContent).not.toContain('Files:');
  });

  it('does not render locations section when locations is empty', () => {
    const tc = makeToolCall('painter', { locations: [] });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);

    const textContent = extractTextContent(tree);
    expect(textContent).not.toContain('Files:');
  });

  it('includes locations in header details when collapsed', () => {
    const tc = makeToolCall('painter', {
      locations: [
        { path: '/home/user/project/src/a/b.ts' },
        { path: '/home/user/project/src/c/d.ts' },
        { path: '/home/user/project/src/e/f.ts' },
      ],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    // Header should contain shortened paths
    const headerContent = extractHeaderText(tree);
    expect(headerContent).toContain('a/b.ts');
    expect(headerContent).toContain('c/d.ts');
    expect(headerContent).toContain('+1 more');
  });
});
```

### Unit Tests for Path Shortening

```typescript
describe('shortenPath utility', () => {
  it('shortens long paths to last 2 segments', () => {
    // Need to access the private method; extract to a module-level utility
    // or test via the integration path (header details output)
    const tc = makeToolCall('painter', {
      locations: [
        { path: '/a/b/c/d/e.ts' },
      ],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    const headerContent = extractHeaderText(tree);
    expect(headerContent).toContain('d/e.ts');
    expect(headerContent).not.toContain('/a/b/c/d/e.ts');
  });

  it('does not shorten paths with 2 or fewer segments', () => {
    const tc = makeToolCall('painter', {
      locations: [{ path: 'a/b.ts' }],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    const headerContent = extractHeaderText(tree);
    expect(headerContent).toContain('a/b.ts');
  });
});
```

### Unit Tests for Deduplication in Specialized Renderers

```typescript
describe('ReadTool: location deduplication', () => {
  it('does not duplicate path already shown from rawInput', () => {
    const tc = makeToolCall('Read', {
      rawInput: { file_path: '/project/src/types.ts' },
      locations: [{ path: '/project/src/types.ts' }],
    });
    const widget = new ReadTool({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    // Path should appear exactly once in header, not twice
    const headerContent = extractHeaderText(tree);
    const matches = headerContent.match(/types\.ts/g) || [];
    expect(matches.length).toBe(1);
  });

  it('shows additional locations not in rawInput', () => {
    const tc = makeToolCall('Read', {
      rawInput: { file_path: '/project/src/types.ts' },
      locations: [
        { path: '/project/src/types.ts' },
        { path: '/project/src/other.ts' },
      ],
    });
    const widget = new ReadTool({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    const headerContent = extractHeaderText(tree);
    expect(headerContent).toContain('types.ts');
    expect(headerContent).toContain('other.ts');
  });
});
```

### Unit Tests for LocationsBar Widget (Tier 3)

```typescript
describe('LocationsBar', () => {
  it('renders all paths when count <= maxDisplay', () => {
    const widget = new LocationsBar({
      locations: [
        { path: '/a/b/c.ts' },
        { path: '/d/e/f.ts' },
      ],
      maxDisplay: 3,
    });
    const tree = widget.build({} as any);
    const text = extractTextContent(tree);
    expect(text).toContain('b/c.ts');
    expect(text).toContain('e/f.ts');
    expect(text).not.toContain('more');
  });

  it('shows overflow indicator when count > maxDisplay', () => {
    const widget = new LocationsBar({
      locations: [
        { path: '/a/b/c.ts' },
        { path: '/d/e/f.ts' },
        { path: '/g/h/i.ts' },
        { path: '/j/k/l.ts' },
      ],
      maxDisplay: 2,
    });
    const tree = widget.build({} as any);
    const text = extractTextContent(tree);
    expect(text).toContain('+2 more');
  });

  it('renders empty text for empty locations', () => {
    const widget = new LocationsBar({ locations: [] });
    const tree = widget.build({} as any);
    const text = extractTextContent(tree);
    expect(text.trim()).toBe('');
  });
});
```

### Integration / Visual Snapshot Tests

If the visual snapshot test harness supports it (the project has
`visual-snapshot.test.ts` and `visual-cell-assertions.test.ts`), capture rendered output
for tool cards with 0, 1, 3, and 10 locations to verify layout stability:

1. **0 locations:** Identical to current behavior (regression guard)
2. **1 location:** Single path shown in header and body
3. **3 locations:** All shown in body; 2 in header + "+1 more"
4. **10 locations:** 3 shown in body LocationsBar + "+7 more"; 2 in header + "+8 more"

---

## Relationship to Other Gaps

- **Gap T02 (40-ontoggle-propagation.md)**: The `onToggle` propagation fix ensures that
  expand/collapse works for all tool types. Locations are most useful in the expanded view
  (Tier 1), so this gap's rendering depends on users being able to expand cards. However,
  Tier 2 (header details) works regardless of expand/collapse state.

- **Gap 39 (per-card toggle)**: Per-card toggle would allow users to expand individual tool
  cards to see the full locations list. Locations display motivates per-card toggle since
  it adds meaningful content to the expanded body that is worth revealing.

- **Gap 33 (session-id-display.md)**: No direct interaction, but both gaps improve the
  information density of the TUI by surfacing data that was already available in the data
  model but not rendered.

---

## Summary

The `ToolCallItem.locations` field is fully ingested from ACP through the client, app-state,
session, and conversation layers, but zero rendering widgets ever access it. The proposed
three-tier solution progressively adds location display:

1. **Tier 1 (minimum viable):** Inline locations section in `GenericToolCard` expanded body.
   Single file change, covers all generic and `TaskTool` cases.

2. **Tier 2 (collapsed view):** Location paths in header details for all tool types with
   smart deduplication against rawInput paths. Nine file changes, each 3-10 lines.

3. **Tier 3 (reusable widget):** Extract `LocationsBar` as a dedicated component with
   configurable max display, folder icon, `fileReference` color. One new file plus
   integration into existing renderers.

Total estimated scope: 1 new file (Tier 3), 10 modified files (Tiers 1+2+3 integration).
