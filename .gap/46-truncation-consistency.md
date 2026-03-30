# T08: Truncation Limit Inconsistency Across Tool Renderers

## Problem

Each tool renderer in `packages/flitter-amp/src/widgets/tool-call/` applies its
own hard-coded truncation limit when displaying output text. There is no shared
constant, no shared truncation helper, and no documented rationale for why limits
differ between renderers. The result is an unpredictable user experience: the
same volume of output is shown in full for one tool but silently cut short for
another, with no way for a consumer of the widget library to configure or
override these limits globally.

## Current State: Full Truncation Audit

A systematic search of all `.slice()` and `.length >` patterns across the
`tool-call/` directory reveals **six distinct truncation limits** spread across
**eight renderers** in **three conceptual categories** (output body, input
preview, fallback summary).

### Category 1: Output Body Truncation

These limits control the main output text shown when a tool card is expanded.

| File | Limit | Code Location | Truncation Expression |
|------|-------|---------------|----------------------|
| `bash-tool.ts:66` | **2000** | `build()` output block | `output.length > 2000 ? output.slice(0, 2000) + '\n...(truncated)' : output` |
| `grep-tool.ts:76` | **2000** | `build()` output block | `output.length > 2000 ? output.slice(0, 2000) + '\n...(truncated)' : output` |
| `generic-tool-card.ts:195` | **2000** | `extractOutputText()` | `s.length > 2000 ? s.slice(0, 2000) + '\n...(truncated)' : s` |
| `read-tool.ts:70` | **1000** | `build()` output block | `outputText.length > 1000 ? outputText.slice(0, 1000) + '\n...(truncated)' : outputText` |
| `web-search-tool.ts:78` | **1000** | `build()` output block | `output.length > 1000 ? output.slice(0, 1000) + '\n...(truncated)' : output` |

Two distinct groups: BashTool/GrepTool/GenericToolCard use 2000, while
ReadTool/WebSearchTool use 1000. There is no documented justification for the
split.

### Category 2: Input/Preview Truncation

These limits control how tool inputs or file content previews are trimmed.

| File | Limit | Context | Truncation Expression |
|------|-------|---------|----------------------|
| `bash-tool.ts:43` | **80** | Command header display | `command.length > 80 ? command.slice(0, 80) + '...' : command` |
| `generic-tool-card.ts:152,155` | **120** | Input key-value pairs | `val.length > 120 ? val.slice(0, 120) + '...' : val` |
| `create-file-tool.ts:55` | **500** | File content preview | `content.length > 500 ? content.slice(0, 500) + '\n...(truncated)' : content` |
| `web-search-tool.ts:114` | **10** (items) | Max search result links | `.slice(0, 10)` |

### Category 3: Fallback Summary Truncation

These are used in fallback code paths when primary rendering (e.g., diff view)
is unavailable.

| File | Limit | Context | Truncation Expression |
|------|-------|---------|----------------------|
| `edit-file-tool.ts:134` | **500** | `extractSummary()` rawOutput fallback | `JSON.stringify(...).slice(0, 500)` |
| `edit-file-tool.ts:139` | **500** | `extractSummary()` content fallback | `.join('\n').slice(0, 500)` |
| `handoff-tool.ts:179` | **500** | `extractOutput()` rawOutput fallback | `JSON.stringify(...).slice(0, 500)` |

### Summary of All Unique Limits

| Limit Value | Occurrences | Category | Used By |
|-------------|-------------|----------|---------|
| 80 | 1 | Header detail | BashTool (command) |
| 120 | 2 | Input preview | GenericToolCard (key-value pairs) |
| 500 | 3 | Preview / Summary | CreateFileTool, EditFileTool, HandoffTool |
| 1000 | 2 | Output body | ReadTool, WebSearchTool |
| 2000 | 3 | Output body | BashTool, GrepTool, GenericToolCard |
| 10 (items) | 1 | Item count | WebSearchTool (links) |

**Total: 12 hard-coded truncation points across 8 files, using 6 distinct
numeric limits, with zero shared constants.**

### Inconsistent Truncation Suffix

The truncation suffix string is also not consistent:

| Pattern | Used By |
|---------|---------|
| `'\n...(truncated)'` | BashTool, GrepTool, GenericToolCard, ReadTool, WebSearchTool, CreateFileTool |
| (no suffix, silent slice) | EditFileTool, HandoffTool, GenericToolCard (input preview) |
| `'...'` (ellipsis only) | BashTool (header), GenericToolCard (input preview) |

Some tools append a visible "(truncated)" marker so the user knows content was
cut; others silently slice with no indication.

## Consequences

1. **Unpredictable UX** -- A user reading 1500 characters of bash output sees
   the full text, but the same 1500 characters from a Read tool call is
   truncated at 1000 with no explanation for the difference.

2. **No global configurability** -- A downstream consumer who wants to raise or
   lower the truncation threshold must find and patch every individual renderer.
   There is no single knob to turn.

3. **Maintenance burden** -- Adding a new tool renderer requires the author to
   pick a truncation limit by looking at existing renderers. Without a shared
   constant or documentation, the choice is arbitrary, leading to further drift.

4. **Silent data loss** -- The three fallback-summary sites (EditFileTool,
   HandoffTool) silently slice to 500 characters with no truncation indicator,
   so the user cannot tell whether the output was complete or cut off.

5. **Relationship to T07 (gap 45)** -- The shared output extraction utility
   proposed in gap 45 (`tool-output-utils.ts`) accepts a `maxLength` parameter
   but still depends on each caller picking its own value. Without standardized
   constants, the extraction refactor alone does not solve the inconsistency.

## Proposed Solution

### Step 1: Define a shared constants module

Create `truncation-limits.ts` in the `tool-call/` directory that exports named
constants for each truncation tier, along with the shared truncation suffix and a
reusable truncation helper function.

#### File: `packages/flitter-amp/src/widgets/tool-call/truncation-limits.ts`

```typescript
/**
 * Shared truncation constants for tool-call renderers.
 *
 * All output display truncation across tool widgets should reference these
 * constants rather than using hard-coded numeric literals. This ensures
 * consistent behavior, makes limits discoverable, and provides a single
 * place to adjust thresholds globally.
 *
 * The tier system is organized by display context:
 *
 *   HEADER  -- Single-line details shown in the collapsed tool header.
 *              Kept short because it shares a line with the tool name and
 *              status indicator.
 *
 *   INPUT   -- Key-value input parameter summaries. Slightly longer than
 *              header since these appear in the expanded body, but still
 *              compact to avoid overwhelming the tool card.
 *
 *   PREVIEW -- Content previews for file creation, fallback summaries,
 *              and secondary output. A middle ground between input
 *              summaries and full output.
 *
 *   OUTPUT  -- Primary tool output (stdout, search results, file content).
 *              This is the main content area and gets the most space.
 *
 * The default OUTPUT limit is 2000 characters. Tools that previously used
 * 1000 (ReadTool, WebSearchTool) are standardized upward to 2000 for
 * consistency. If a tool genuinely needs a different limit, it should use
 * the PREVIEW tier or document the override with a comment referencing
 * this module.
 */

// ---------------------------------------------------------------------------
// Character limits by display tier
// ---------------------------------------------------------------------------

/** Maximum characters for single-line header detail strings. */
export const HEADER_TRUNCATION_LIMIT = 80;

/** Maximum characters for input parameter value summaries. */
export const INPUT_TRUNCATION_LIMIT = 120;

/** Maximum characters for content previews and fallback summaries. */
export const PREVIEW_TRUNCATION_LIMIT = 500;

/** Maximum characters for primary tool output bodies. */
export const OUTPUT_TRUNCATION_LIMIT = 2000;

// ---------------------------------------------------------------------------
// Item count limits
// ---------------------------------------------------------------------------

/** Maximum number of links/items to display in list-oriented tools. */
export const MAX_DISPLAY_ITEMS = 10;

// ---------------------------------------------------------------------------
// Truncation suffixes
// ---------------------------------------------------------------------------

/**
 * Suffix appended to truncated output bodies.
 * Includes a leading newline so the marker appears on its own line.
 */
export const TRUNCATION_SUFFIX = '\n…(truncated)';

/**
 * Suffix appended to truncated single-line strings (headers, input values).
 * Uses a bare ellipsis to keep inline text compact.
 */
export const INLINE_TRUNCATION_SUFFIX = '…';

// ---------------------------------------------------------------------------
// Truncation helpers
// ---------------------------------------------------------------------------

/**
 * Truncates a string to `maxLength` characters, appending `suffix` if
 * the string was truncated. Returns the original string unmodified when
 * it fits within the limit.
 *
 * This should be the single call-site for all truncation logic in tool
 * renderers, replacing the scattered `s.length > N ? s.slice(0, N) + '...' : s`
 * pattern.
 *
 * @param text     - The string to potentially truncate.
 * @param maxLength - Maximum character count before truncation.
 *                    Defaults to OUTPUT_TRUNCATION_LIMIT (2000).
 * @param suffix   - Suffix to append when truncated.
 *                    Defaults to TRUNCATION_SUFFIX ('\n...(truncated)').
 * @returns The original string, or the truncated string with suffix appended.
 */
export function truncateText(
  text: string,
  maxLength: number = OUTPUT_TRUNCATION_LIMIT,
  suffix: string = TRUNCATION_SUFFIX,
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}

/**
 * Truncates a single-line string for inline display (headers, input values).
 * Uses the compact ellipsis suffix by default.
 *
 * @param text      - The string to potentially truncate.
 * @param maxLength - Maximum character count. Defaults to INPUT_TRUNCATION_LIMIT.
 * @returns The original or truncated string.
 */
export function truncateInline(
  text: string,
  maxLength: number = INPUT_TRUNCATION_LIMIT,
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + INLINE_TRUNCATION_SUFFIX;
}
```

### Step 2: Migrate each renderer to use shared constants

Below is the concrete diff for each file. Every hard-coded numeric literal and
inline truncation suffix is replaced with a reference to the shared module.

#### bash-tool.ts

```typescript
// Add import:
import {
  HEADER_TRUNCATION_LIMIT,
  OUTPUT_TRUNCATION_LIMIT,
  truncateText,
  truncateInline,
} from './truncation-limits';

// Line 43 -- header command:
// Before:
const shortCmd = command.length > 80 ? command.slice(0, 80) + '…' : command;
// After:
const shortCmd = truncateInline(command, HEADER_TRUNCATION_LIMIT);

// Line 66 -- output body:
// Before:
text: output.length > 2000 ? output.slice(0, 2000) + '\n…(truncated)' : output,
// After:
text: truncateText(output, OUTPUT_TRUNCATION_LIMIT),
```

#### grep-tool.ts

```typescript
import { OUTPUT_TRUNCATION_LIMIT, truncateText } from './truncation-limits';

// Line 76 -- output body:
// Before:
text: output.length > 2000 ? output.slice(0, 2000) + '\n…(truncated)' : output,
// After:
text: truncateText(output, OUTPUT_TRUNCATION_LIMIT),
```

#### generic-tool-card.ts

```typescript
import {
  INPUT_TRUNCATION_LIMIT,
  OUTPUT_TRUNCATION_LIMIT,
  truncateText,
  truncateInline,
} from './truncation-limits';

// Lines 152, 155 -- input summary values:
// Before:
parts.push(`${key}: ${val.length > 120 ? val.slice(0, 120) + '…' : val}`);
// After:
parts.push(`${key}: ${truncateInline(val, INPUT_TRUNCATION_LIMIT)}`);

// Line 195 -- output text:
// Before:
return s.length > 2000 ? s.slice(0, 2000) + '\n…(truncated)' : s;
// After:
return truncateText(s, OUTPUT_TRUNCATION_LIMIT);
```

#### read-tool.ts (LIMIT CHANGE: 1000 -> 2000)

```typescript
import { OUTPUT_TRUNCATION_LIMIT, truncateText } from './truncation-limits';

// Line 70 -- output body:
// Before:
text: outputText.length > 1000 ? outputText.slice(0, 1000) + '\n…(truncated)' : outputText,
// After:
text: truncateText(outputText, OUTPUT_TRUNCATION_LIMIT),
```

ReadTool previously truncated at 1000. There is no documented reason for this
lower limit. File content from the Read tool is structurally the same kind of
text as bash stdout or grep matches, so the standard 2000-character limit
applies. If a future use case requires shorter output for read operations, it
should be expressed as a named constant in `truncation-limits.ts` (e.g.,
`FILE_CONTENT_TRUNCATION_LIMIT`) with a documented rationale, not as an
anonymous magic number.

#### web-search-tool.ts (LIMIT CHANGE: 1000 -> 2000)

```typescript
import {
  OUTPUT_TRUNCATION_LIMIT,
  MAX_DISPLAY_ITEMS,
  truncateText,
} from './truncation-limits';

// Line 78 -- output body:
// Before:
text: output.length > 1000 ? output.slice(0, 1000) + '\n…(truncated)' : output,
// After:
text: truncateText(output, OUTPUT_TRUNCATION_LIMIT),

// Line 114 -- link count limit:
// Before:
.slice(0, 10);
// After:
.slice(0, MAX_DISPLAY_ITEMS);
```

Same rationale as ReadTool: web search text output is rendered in the same
visual context as other tool outputs and should use the same limit.

#### create-file-tool.ts

```typescript
import { PREVIEW_TRUNCATION_LIMIT, truncateText } from './truncation-limits';

// Line 55 -- content preview:
// Before:
const preview = content.length > 500 ? content.slice(0, 500) + '\n…(truncated)' : content;
// After:
const preview = truncateText(content, PREVIEW_TRUNCATION_LIMIT);
```

#### edit-file-tool.ts

```typescript
import { PREVIEW_TRUNCATION_LIMIT, truncateText } from './truncation-limits';

// Line 134 -- summary rawOutput:
// Before:
return JSON.stringify(this.toolCall.result.rawOutput, null, 2).slice(0, 500);
// After:
return truncateText(
  JSON.stringify(this.toolCall.result.rawOutput, null, 2),
  PREVIEW_TRUNCATION_LIMIT,
);

// Line 139 -- summary content:
// Before:
.slice(0, 500) ?? '';
// After (applied via truncateText for consistency):
return truncateText(
  this.toolCall.result.content
    ?.map(c => c.content?.text ?? '')
    .join('\n') ?? '',
  PREVIEW_TRUNCATION_LIMIT,
);
```

Note: The previous code silently sliced with no truncation indicator. The
`truncateText` helper now appends `'\n...(truncated)'`, fixing the silent data
loss issue for these fallback paths.

#### handoff-tool.ts

```typescript
import { PREVIEW_TRUNCATION_LIMIT, truncateText } from './truncation-limits';

// Line 179 -- output extraction:
// Before:
return JSON.stringify(result.rawOutput, null, 2).slice(0, 500);
// After:
return truncateText(
  JSON.stringify(result.rawOutput, null, 2),
  PREVIEW_TRUNCATION_LIMIT,
);
```

Same silent-slice fix as EditFileTool above.

### Step 3: Export from the barrel module

```typescript
// index.ts -- add export:
export {
  HEADER_TRUNCATION_LIMIT,
  INPUT_TRUNCATION_LIMIT,
  PREVIEW_TRUNCATION_LIMIT,
  OUTPUT_TRUNCATION_LIMIT,
  MAX_DISPLAY_ITEMS,
  TRUNCATION_SUFFIX,
  INLINE_TRUNCATION_SUFFIX,
  truncateText,
  truncateInline,
} from './truncation-limits';
```

This allows downstream consumers to import and use the same constants if they
build custom tool renderers.

### Step 4: Integration with T07 (tool-output-utils.ts)

The `tool-output-utils.ts` module proposed in gap 45 already accepts a
`maxLength` option. After this change, the default value for that option should
be sourced from the shared constant rather than a hard-coded `2000`:

```typescript
// In tool-output-utils.ts:
import { OUTPUT_TRUNCATION_LIMIT, TRUNCATION_SUFFIX } from './truncation-limits';

export interface ExtractTextOptions {
  maxLength?: number;   // Default: OUTPUT_TRUNCATION_LIMIT
  truncationSuffix?: string;  // Default: TRUNCATION_SUFFIX
}

export function extractOutputText(
  result: ToolCallResult | undefined,
  options: ExtractTextOptions = {},
): string {
  const {
    maxLength = OUTPUT_TRUNCATION_LIMIT,
    truncationSuffix = TRUNCATION_SUFFIX,
  } = options;
  // ... rest unchanged
}
```

This ensures the two proposals compose cleanly: gap 45 eliminates the duplicated
extraction logic, and this gap (46) eliminates the duplicated truncation limits.
Together they produce a single source of truth for both *how* output is extracted
and *how much* of it is displayed.

## Standardization Decision: Why 2000 for OUTPUT

The choice to standardize on 2000 rather than 1000 is based on:

1. **Majority rule** -- 3 of 5 output-body sites already use 2000. Standardizing
   on the majority value minimizes behavioral change.

2. **Terminal viewport** -- A typical terminal is 80 columns by 40 rows,
   yielding ~3200 visible characters. 2000 characters fits comfortably on one
   screen page, providing enough context without requiring scrolling past a wall
   of text.

3. **User expectation** -- When a user expands a tool card to see output, they
   expect to see a meaningful portion. 1000 characters (~12 lines of 80-column
   text) is often too little for compiler errors, test output, or file content.
   2000 characters (~25 lines) covers most single-screen use cases.

4. **No performance concern** -- The truncation happens at the string level
   before any rendering. The difference between 1000 and 2000 characters has
   negligible impact on layout computation and paint time.

If a specific tool is later found to need a different limit (e.g., a binary
output tool that should truncate aggressively), the correct approach is to add a
new named constant to `truncation-limits.ts` with a documenting comment, not to
scatter another magic number into the renderer.

## Testing Strategy

```typescript
// truncation-limits.test.ts

import {
  truncateText,
  truncateInline,
  OUTPUT_TRUNCATION_LIMIT,
  PREVIEW_TRUNCATION_LIMIT,
  HEADER_TRUNCATION_LIMIT,
  INPUT_TRUNCATION_LIMIT,
  TRUNCATION_SUFFIX,
  INLINE_TRUNCATION_SUFFIX,
} from './truncation-limits';

describe('truncateText', () => {
  it('returns original string when under limit', () => {
    const text = 'hello world';
    expect(truncateText(text)).toBe(text);
  });

  it('truncates at OUTPUT_TRUNCATION_LIMIT by default', () => {
    const text = 'a'.repeat(3000);
    const result = truncateText(text);
    expect(result.length).toBe(OUTPUT_TRUNCATION_LIMIT + TRUNCATION_SUFFIX.length);
    expect(result.endsWith(TRUNCATION_SUFFIX)).toBe(true);
  });

  it('truncates at custom limit', () => {
    const text = 'a'.repeat(1000);
    const result = truncateText(text, 500);
    expect(result).toBe('a'.repeat(500) + TRUNCATION_SUFFIX);
  });

  it('uses custom suffix', () => {
    const text = 'a'.repeat(100);
    const result = truncateText(text, 50, ' [more]');
    expect(result).toBe('a'.repeat(50) + ' [more]');
  });

  it('handles exact boundary (length === limit)', () => {
    const text = 'a'.repeat(2000);
    expect(truncateText(text, 2000)).toBe(text);
  });

  it('handles empty string', () => {
    expect(truncateText('')).toBe('');
  });
});

describe('truncateInline', () => {
  it('returns original when under limit', () => {
    const text = 'short';
    expect(truncateInline(text)).toBe(text);
  });

  it('truncates at INPUT_TRUNCATION_LIMIT by default', () => {
    const text = 'x'.repeat(200);
    const result = truncateInline(text);
    expect(result).toBe('x'.repeat(INPUT_TRUNCATION_LIMIT) + INLINE_TRUNCATION_SUFFIX);
  });

  it('truncates header text at HEADER_TRUNCATION_LIMIT', () => {
    const text = 'ls -la /very/long/path/that/keeps/going/and/going/forever/and/ever/and/ever/amen/extra';
    const result = truncateInline(text, HEADER_TRUNCATION_LIMIT);
    expect(result.length).toBe(HEADER_TRUNCATION_LIMIT + INLINE_TRUNCATION_SUFFIX.length);
  });
});

describe('constant values', () => {
  it('HEADER < INPUT < PREVIEW < OUTPUT', () => {
    expect(HEADER_TRUNCATION_LIMIT).toBeLessThan(INPUT_TRUNCATION_LIMIT);
    expect(INPUT_TRUNCATION_LIMIT).toBeLessThan(PREVIEW_TRUNCATION_LIMIT);
    expect(PREVIEW_TRUNCATION_LIMIT).toBeLessThan(OUTPUT_TRUNCATION_LIMIT);
  });

  it('OUTPUT_TRUNCATION_LIMIT is 2000', () => {
    expect(OUTPUT_TRUNCATION_LIMIT).toBe(2000);
  });

  it('PREVIEW_TRUNCATION_LIMIT is 500', () => {
    expect(PREVIEW_TRUNCATION_LIMIT).toBe(500);
  });
});
```

## Lines of Code Impact

| Area | Change |
|------|--------|
| `truncation-limits.ts` (new) | +85 lines |
| `truncation-limits.test.ts` (new) | +65 lines |
| `bash-tool.ts` | -2 lines, +3 lines (net +1) |
| `grep-tool.ts` | -1 line, +2 lines (net +1) |
| `generic-tool-card.ts` | -3 lines, +4 lines (net +1) |
| `read-tool.ts` | -1 line, +2 lines (net +1) |
| `web-search-tool.ts` | -2 lines, +3 lines (net +1) |
| `create-file-tool.ts` | -1 line, +2 lines (net +1) |
| `edit-file-tool.ts` | -2 lines, +6 lines (net +4) |
| `handoff-tool.ts` | -1 line, +4 lines (net +3) |
| `index.ts` | +1 line |
| **Net production code** | **+14 lines** (8 files touched, 1 new file) |

The net increase is small because the actual truncation logic moves into two
helper functions; the renderers replace 3-expression ternaries with single
function calls.

## Incremental Adoption Path

1. **Step 1**: Create `truncation-limits.ts` with all constants and helpers.
   This is a pure addition with zero impact on existing code.

2. **Step 2**: Migrate `generic-tool-card.ts` first, since it is the default
   fallback renderer used for all unmapped tool types.

3. **Step 3**: Migrate `bash-tool.ts` and `grep-tool.ts` (no behavioral change,
   already use 2000).

4. **Step 4**: Migrate `read-tool.ts` and `web-search-tool.ts` (behavioral
   change: 1000 -> 2000). These should be tested explicitly to confirm no
   layout overflow issues in narrow terminal widths.

5. **Step 5**: Migrate `create-file-tool.ts`, `edit-file-tool.ts`, and
   `handoff-tool.ts` (no limit change, but gains truncation suffix on
   previously silent slices).

6. **Step 6**: If gap 45 (`tool-output-utils.ts`) is implemented, update its
   defaults to import from `truncation-limits.ts` as described above.

Each step is independently shippable. Steps 1-3 are pure refactors with no
behavioral change. Step 4 widens the truncation window for two tools. Step 5
adds user-visible truncation markers where they were previously absent. Step 6
is a coordination point with the other gap proposal.

## Future Considerations

- **Theme-based limits**: If flitter-amp gains responsive layout awareness, the
  truncation limits could become theme properties (e.g., short limits for narrow
  terminals, wider limits for large screens). The constants module provides the
  natural extension point for this.

- **Per-tool overrides**: The `truncateText` function already accepts a custom
  `maxLength`. If a new tool genuinely needs a non-standard limit, it can pass
  an explicit value while still using the shared helper and suffix constant.

- **Streaming truncation**: For tools that stream output (gap 42), truncation
  may need to be applied incrementally. The `truncateText` function is
  stateless and can be called on each streaming update, though a more
  sophisticated approach (tracking cumulative length) may be needed.
