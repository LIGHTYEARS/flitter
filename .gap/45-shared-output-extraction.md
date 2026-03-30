# T07: Shared Output Extraction Utility

## Problem

Output extraction logic is reimplemented independently across **seven** tool
renderers in `packages/flitter-amp/src/widgets/tool-call/`. Each renderer
contains its own private method(s) that walk the same `ToolCallResult` structure
(`result.rawOutput` as string or object, `result.content[].text` via direct
cast, `result.content[].content.text` via nested access) to extract displayable
text. The implementations vary in truncation limits, serialization strategy,
`content[]` access patterns, and fallback chains. This creates a maintenance
burden: any change to the `ToolCallResult` schema forces coordinated edits
across all renderers, and subtle behavioral divergences have already crept in.

The `ToolCallResult` type definition (from `acp/types.ts`) is:

```typescript
export interface ToolCallResult {
  status: 'completed' | 'failed';
  content?: Array<{ type: string; content?: { type: string; text: string } }>;
  rawOutput?: Record<string, unknown>;
}
```

Two distinct paths to text exist: the untyped `rawOutput` bag and the typed
`content[]` array. Every renderer must decide which to use and how to serialize
it. This decision is currently scattered across seven files.

## Duplication Inventory

### Pattern A: Generic text output extraction

The core pattern -- "if rawOutput exists, stringify it; otherwise join
content[].text entries" -- appears in **six** separate files with seven
method implementations:

| File | Method | rawOutput handling | content[] handling | Truncation |
|------|--------|-------------------|--------------------|------------|
| `bash-tool.ts:109-122` | `extractOutput()` | Checks `typeof === 'string'`; tries `stdout`/`stderr` keys; falls back to `JSON.stringify` | `.map(c => c['text'] ?? c.content?.text)` | 2000 chars (applied in `build()`) |
| `grep-tool.ts:104-112` | `extractOutput()` | `JSON.stringify(raw, null, 2)` | `.map(c => c['text'] ?? c.content?.text)` | 2000 chars (applied in `build()`) |
| `generic-tool-card.ts:190-201` | `extractOutputText()` | `JSON.stringify(raw, null, 2)` with 2000-char truncation | `.map(c => c['text'] ?? c.content?.text)` | 2000 chars |
| `read-tool.ts:95-103` | `extractOutput()` | `JSON.stringify(raw, null, 2)` | `.map(c => c['text'] ?? c.content?.text)` | 1000 chars (applied in `build()`) |
| `web-search-tool.ts:120-128` | `extractOutput()` | `JSON.stringify(raw, null, 2)` | `.map(c => c['text'] ?? c.content?.text)` | 1000 chars (applied in `build()`) |
| `edit-file-tool.ts:131-139` | `extractSummary()` | `JSON.stringify(raw, null, 2).slice(0, 500)` | `.map(c => c.content?.text)` | 500 chars |
| `handoff-tool.ts:175-184` | `extractOutput()` | `JSON.stringify(raw, null, 2).slice(0, 500)` | `.map(c => c.content?.text)` | 500 chars |

The content-array traversal line is **nearly identical** in five of the seven
implementations. The canonical version seen in `bash-tool.ts`, `grep-tool.ts`,
`read-tool.ts`, and `web-search-tool.ts` is:

```typescript
return this.toolCall.result.content
  ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
  .join('\n') ?? '';
```

While `edit-file-tool.ts` and `handoff-tool.ts` use a slightly different form
that omits the direct `['text']` cast access:

```typescript
return result.content
  ?.map(c => c.content?.text ?? '')
  .join('\n') ?? '';
```

This means the same `ToolCallResult` can produce different output depending on
which renderer processes it, since the cast-access path (`c['text']`) may
resolve a value that the nested-access path (`c.content?.text`) does not.

### Pattern B: Diff extraction

The diff-detection heuristic appears in **two** files with near-identical logic:

| File | Method | Lines |
|------|--------|-------|
| `generic-tool-card.ts` | `extractDiff()` | 164-185 |
| `edit-file-tool.ts` | `extractDiff()` | 95-126 |

Both share the core detection logic:

```typescript
rawStr.includes('@@') && (rawStr.includes('---') || rawStr.includes('+++'))
```

`generic-tool-card.ts` checks rawOutput then iterates content[] entries.
`edit-file-tool.ts` does the same but adds a fallback that synthesizes a diff
from `old_str`/`new_str` rawInput fields. The core diff-detection traversal
through `ToolCallResult` is duplicated verbatim; only the synthetic-diff
fallback is truly edit-specific.

### Pattern C: Metadata extraction from rawOutput

Two renderers extract specific typed fields from `rawOutput` using the same
structural pattern:

| File | Method | Keys checked | Return type |
|------|--------|-------------|-------------|
| `bash-tool.ts:127-133` | `extractExitCode()` | `['exit_code']` | `number \| null` |
| `grep-tool.ts:91-98` | `extractMatchCount()` | `['count', 'matchCount', 'total']` | `number \| null` |

Both follow the exact same shape:

```typescript
private extractSomething(): number | null {
  const raw = this.toolCall.result?.rawOutput;
  if (raw && typeof raw === 'object' && 'key' in raw) {
    return raw['key'] as number;
  }
  return null;
}
```

### Pattern D: Summary extraction with truncation

`edit-file-tool.ts:extractSummary()` and `handoff-tool.ts:extractOutput()` are
functionally identical -- both stringify rawOutput and slice to 500 chars, then
fall back to joining content text. These are effectively `extractOutputText()`
with `maxLength: 500`.

### Pattern E: Link/array extraction from rawOutput

`web-search-tool.ts:extractLinks()` extracts an array from rawOutput by
checking `['results', 'links']` keys, then maps each element to extract URL
fields. While this is currently unique to WebSearchTool, the "extract array
from rawOutput by key" pattern generalizes to any tool that returns structured
lists.

## Behavioral Divergences (Bugs or Inconsistencies)

### 1. content[] text access inconsistency

Five renderers access text via both paths:
```typescript
(c as Record<string, unknown>)['text'] as string ?? c.content?.text
```

Two renderers (EditFileTool, HandoffTool) only use the nested path:
```typescript
c.content?.text
```

If a content entry has a top-level `text` property but no `content.text`, the
first group will extract it while the second group returns empty string. This
is a semantic inconsistency that should be resolved by the shared utility.

### 2. Truncation limit divergence

| Renderer | Truncation limit | Applied where |
|----------|-----------------|---------------|
| BashTool | 2000 | In `build()` after `extractOutput()` |
| GrepTool | 2000 | In `build()` after `extractOutput()` |
| GenericToolCard | 2000 | Inside `extractOutputText()` |
| ReadTool | 1000 | In `build()` after `extractOutput()` |
| WebSearchTool | 1000 | In `build()` after `extractOutput()` |
| EditFileTool | 500 | Inside `extractSummary()` |
| HandoffTool | 500 | Inside `extractOutput()` |

There is no documented rationale for why ReadTool uses 1000 while GrepTool uses
2000, or why HandoffTool uses 500. A shared utility would make these choices
explicit and self-documenting through named options.

### 3. Truncation location inconsistency

BashTool and GrepTool extract raw output without truncation, then truncate in
`build()`. GenericToolCard and EditFileTool truncate inside the extraction
method. This affects testability: you cannot verify truncation behavior by
testing the extraction method alone for BashTool, but you can for GenericToolCard.

### 4. rawOutput-as-string handling

Only `BashTool.extractOutput()` checks `typeof raw === 'string'` before
attempting to access object keys. All other renderers assume rawOutput is always
an object and call `JSON.stringify()` directly. If rawOutput were ever a string
in those contexts, they would produce `"the string value"` (JSON-encoded with
quotes) rather than the raw string. This is likely a latent bug.

## Consequences of the Duplication

1. **Schema fragility** -- The `ToolCallResult` type has two paths to text:
   `rawOutput` (untyped object) and `content[]` (typed array). If a third path
   is introduced (e.g., `result.text` shorthand), every renderer must be updated
   independently. With 7 implementations across 6 files this is error-prone.

2. **Inconsistent truncation** -- ReadTool and WebSearchTool truncate at 1000
   characters while BashTool, GrepTool, and GenericToolCard truncate at 2000.
   EditFileTool and HandoffTool truncate at 500. There is no documented reason
   for these divergences.

3. **Inconsistent content[].text access** -- Some renderers cast to
   `Record<string, unknown>` and access `['text']`; others go through
   `c.content?.text`. The BashTool does both in the same expression. This
   inconsistency means the same ToolCallResult can produce different output
   depending on which renderer processes it.

4. **Test surface** -- Each private method is only testable through the widget's
   `build()` output. A shared utility can be unit-tested independently with
   simple assertion-based tests, improving confidence.

5. **Onboarding friction** -- New tool renderers require understanding the
   full `ToolCallResult` traversal pattern. A shared utility documents the
   canonical approach and reduces the learning curve.

## Proposed Solution

Create a new module `tool-output-utils.ts` in the `tool-call/` directory that
exports pure functions for each extraction concern. Each renderer then delegates
to these shared functions, passing only the `ToolCallResult` and any
tool-specific options.

### File: `packages/flitter-amp/src/widgets/tool-call/tool-output-utils.ts`

```typescript
/**
 * Shared output extraction utilities for tool-call renderers.
 *
 * These pure functions encapsulate the common patterns for walking
 * ToolCallResult structures, so individual tool widgets do not need
 * to reimplement the same traversal logic.
 *
 * Design principles:
 *   - Every function takes a ToolCallResult (or undefined) as its first arg
 *   - Options are passed via a typed object with sensible defaults
 *   - Functions are pure and side-effect free for easy testing
 *   - The traversal order (rawOutput -> content[]) is consistent everywhere
 */

import type { ToolCallResult } from '../../acp/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractTextOptions {
  /** Maximum character length before truncation. Default: 2000. */
  maxLength?: number;
  /** Suffix appended when text is truncated. Default: '\n...(truncated)'. */
  truncationSuffix?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the text value from a single content entry, handling both
 * the direct-property shape (c.text) and the nested shape (c.content.text).
 *
 * This normalizes the two access patterns seen across renderers into a
 * single canonical implementation.
 */
function extractContentEntryText(
  entry: { type: string; content?: { type: string; text: string } },
): string {
  // Direct text property (accessed via cast in the original code)
  const direct = (entry as Record<string, unknown>)['text'] as
    | string
    | undefined;
  if (typeof direct === 'string') return direct;

  // Nested content.text property
  return entry.content?.text ?? '';
}

/**
 * Applies truncation to a string if it exceeds maxLength.
 */
function truncate(
  text: string,
  maxLength: number,
  suffix: string,
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}

// ---------------------------------------------------------------------------
// Core: content array text joining
// ---------------------------------------------------------------------------

/**
 * Joins all text fragments found in a ToolCallResult.content array.
 *
 * Handles both shapes observed in the codebase:
 *   - Direct `text` property on the content item (cast access)
 *   - Nested `content.text` property
 *
 * Returns an empty string when content is absent or contains no text.
 */
export function joinContentText(result: ToolCallResult | undefined): string {
  if (!result?.content) return '';
  return result.content.map(extractContentEntryText).join('\n');
}

// ---------------------------------------------------------------------------
// Generic text extraction (Pattern A)
// ---------------------------------------------------------------------------

/**
 * Extracts a plain-text representation of the tool output.
 *
 * Resolution order:
 *   1. rawOutput as a string (returned verbatim)
 *   2. rawOutput as an object (JSON-stringified with 2-space indent)
 *   3. content[] text join via joinContentText()
 *
 * The result is truncated to `maxLength` characters (default 2000).
 */
export function extractOutputText(
  result: ToolCallResult | undefined,
  options: ExtractTextOptions = {},
): string {
  const {
    maxLength = 2000,
    truncationSuffix = '\n\u2026(truncated)',
  } = options;

  if (!result) return '';

  let text = '';

  if (result.rawOutput !== undefined) {
    const raw = result.rawOutput;
    if (typeof raw === 'string') {
      text = raw;
    } else {
      text = JSON.stringify(raw, null, 2);
    }
  } else {
    text = joinContentText(result);
  }

  return truncate(text, maxLength, truncationSuffix);
}

// ---------------------------------------------------------------------------
// Bash-specific: stdout/stderr extraction (Pattern A variant)
// ---------------------------------------------------------------------------

/**
 * Extracts shell output from a ToolCallResult, preferring structured
 * stdout/stderr fields when rawOutput is an object.
 *
 * Resolution order:
 *   1. rawOutput is a string -> return it directly
 *   2. rawOutput has stdout/stderr keys -> join non-empty parts with newline
 *   3. rawOutput is another object shape -> JSON.stringify
 *   4. Fallback to content[] text join
 *
 * This is the only variant that inspects specific keys inside rawOutput
 * before falling back to generic stringification.
 */
export function extractShellOutput(
  result: ToolCallResult | undefined,
  options: ExtractTextOptions = {},
): string {
  const {
    maxLength = 2000,
    truncationSuffix = '\n\u2026(truncated)',
  } = options;

  if (!result) return '';

  let text = '';

  if (result.rawOutput !== undefined) {
    const raw = result.rawOutput;
    if (typeof raw === 'string') {
      text = raw;
    } else {
      const stdout = (raw['stdout'] ?? '') as string;
      const stderr = (raw['stderr'] ?? '') as string;
      if (stdout || stderr) {
        text = [stdout, stderr].filter(Boolean).join('\n');
      } else {
        text = JSON.stringify(raw, null, 2);
      }
    }
  } else {
    text = joinContentText(result);
  }

  return truncate(text, maxLength, truncationSuffix);
}

// ---------------------------------------------------------------------------
// Diff extraction (Pattern B)
// ---------------------------------------------------------------------------

/**
 * Detects whether a string looks like a unified diff.
 *
 * Checks for the presence of hunk headers (@@) combined with
 * file markers (--- or +++).
 */
export function looksLikeDiff(text: string): boolean {
  return text.includes('@@') && (text.includes('---') || text.includes('+++'));
}

/**
 * Attempts to extract a unified diff string from the tool result.
 *
 * Checks rawOutput first (as string or stringified), then scans each
 * content[] entry. Returns null if no diff-like content is found.
 *
 * Tool-specific diff synthesis (e.g., EditFileTool's old_str/new_str
 * construction) should be handled by the caller after this function
 * returns null.
 */
export function extractDiff(result: ToolCallResult | undefined): string | null {
  if (!result) return null;

  // Check rawOutput
  if (result.rawOutput !== undefined) {
    const raw = result.rawOutput;
    const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    if (looksLikeDiff(rawStr)) return rawStr;
  }

  // Check content[] entries
  if (result.content) {
    for (const c of result.content) {
      const text = extractContentEntryText(c);
      if (text && looksLikeDiff(text)) return text;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Metadata field extraction (Pattern C)
// ---------------------------------------------------------------------------

/**
 * Extracts a numeric field from rawOutput by checking a list of candidate
 * keys in order. Returns null if rawOutput is absent or none of the keys
 * are present with a numeric value.
 *
 * Usage:
 *   extractRawNumber(result, ['exit_code'])                     // BashTool
 *   extractRawNumber(result, ['count', 'matchCount', 'total'])  // GrepTool
 */
export function extractRawNumber(
  result: ToolCallResult | undefined,
  keys: string[],
): number | null {
  const raw = result?.rawOutput;
  if (!raw || typeof raw !== 'object') return null;
  for (const key of keys) {
    if (key in raw) {
      const val = raw[key];
      if (typeof val === 'number') return val;
    }
  }
  return null;
}

/**
 * Extracts a string field from rawOutput by checking a list of candidate
 * keys in order. Returns null if not found.
 */
export function extractRawString(
  result: ToolCallResult | undefined,
  keys: string[],
): string | null {
  const raw = result?.rawOutput;
  if (!raw || typeof raw !== 'object') return null;
  for (const key of keys) {
    if (key in raw) {
      const val = raw[key];
      if (typeof val === 'string') return val;
    }
  }
  return null;
}

/**
 * Extracts an array field from rawOutput by checking a list of candidate
 * keys in order. Returns an empty array if not found.
 *
 * Usage:
 *   extractRawArray<Record<string, unknown>>(result, ['results', 'links'])
 */
export function extractRawArray<T = unknown>(
  result: ToolCallResult | undefined,
  keys: string[],
): T[] {
  const raw = result?.rawOutput;
  if (!raw || typeof raw !== 'object') return [];
  for (const key of keys) {
    if (key in raw) {
      const val = raw[key];
      if (Array.isArray(val)) return val as T[];
    }
  }
  return [];
}
```

### Barrel export addition

Update `packages/flitter-amp/src/widgets/tool-call/index.ts`:

```typescript
// Add to existing exports:
export {
  extractOutputText,
  extractShellOutput,
  extractDiff,
  extractRawNumber,
  extractRawString,
  extractRawArray,
  joinContentText,
  looksLikeDiff,
} from './tool-output-utils';
```

## Per-Renderer Migration Guide

### Migration: BashTool (`bash-tool.ts`)

**Before** (two private methods, 25 lines):

```typescript
private extractOutput(): string {
  if (!this.toolCall.result) return '';
  if (this.toolCall.result.rawOutput) {
    const raw = this.toolCall.result.rawOutput;
    if (typeof raw === 'string') return raw;
    const stdout = (raw['stdout'] ?? '') as string;
    const stderr = (raw['stderr'] ?? '') as string;
    if (stdout || stderr) return [stdout, stderr].filter(Boolean).join('\n');
    return JSON.stringify(raw, null, 2);
  }
  return this.toolCall.result.content
    ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
    .join('\n') ?? '';
}

private extractExitCode(): number | null {
  const raw = this.toolCall.result?.rawOutput;
  if (raw && typeof raw === 'object' && 'exit_code' in raw) {
    return raw['exit_code'] as number;
  }
  return null;
}
```

**After** (import + inline calls, 0 private methods):

```typescript
import { extractShellOutput, extractRawNumber } from './tool-output-utils';

// In build():
const output = extractShellOutput(this.toolCall.result, { maxLength: 2000 });
const exitCode = extractRawNumber(this.toolCall.result, ['exit_code']);
```

Lines removed: ~25. Lines added: ~3 (import + calls).

### Migration: GrepTool (`grep-tool.ts`)

**Before** (two private methods, 21 lines):

```typescript
private extractMatchCount(): number | null { /* 8 lines */ }
private extractOutput(): string { /* 8 lines */ }
```

**After**:

```typescript
import { extractOutputText, extractRawNumber } from './tool-output-utils';

// In build():
const matchCount = extractRawNumber(this.toolCall.result, ['count', 'matchCount', 'total']);
const output = extractOutputText(this.toolCall.result, { maxLength: 2000 });
```

Lines removed: ~21. Lines added: ~3.

### Migration: ReadTool (`read-tool.ts`)

**Before** (one private method, 8 lines):

```typescript
private extractOutput(): string {
  if (!this.toolCall.result) return '';
  if (this.toolCall.result.rawOutput) {
    return JSON.stringify(this.toolCall.result.rawOutput, null, 2);
  }
  return this.toolCall.result.content
    ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
    .join('\n') ?? '';
}
```

**After**:

```typescript
import { extractOutputText } from './tool-output-utils';

// In build():
const outputText = extractOutputText(this.toolCall.result, { maxLength: 1000 });
```

The tool-specific truncation limit (1000 for ReadTool) is now an explicit,
documented parameter rather than a hidden divergence buried in `build()`.

Lines removed: ~8. Lines added: ~2.

### Migration: WebSearchTool (`web-search-tool.ts`)

**Before** (two private methods, 25 lines):

```typescript
private extractLinks(): string[] { /* 11 lines */ }
private extractOutput(): string { /* 8 lines */ }
```

**After**:

```typescript
import { extractOutputText, extractRawArray } from './tool-output-utils';

// In build():
const links = extractRawArray<Record<string, unknown>>(
  this.toolCall.result,
  ['results', 'links'],
)
  .map((r) => (r['url'] ?? r['link'] ?? r['href'] ?? '') as string)
  .filter(Boolean)
  .slice(0, 10);

const output = extractOutputText(this.toolCall.result, { maxLength: 1000 });
```

The URL-mapping logic stays inline since it is specific to WebSearchTool, but
the array extraction from rawOutput is now shared.

Lines removed: ~19 (extractOutput deleted, extractLinks simplified).
Lines added: ~5.

### Migration: GenericToolCard (`generic-tool-card.ts`)

**Before** (two private methods, 37 lines):

```typescript
private extractDiff(): string | null { /* 21 lines */ }
private extractOutputText(): string { /* 12 lines */ }
```

**After**:

```typescript
import { extractOutputText, extractDiff } from './tool-output-utils';

// In build():
const diff = extractDiff(this.toolCall.result);
const outputText = extractOutputText(this.toolCall.result, { maxLength: 2000 });
```

Both private methods are deleted entirely. The `extractInputText()` method
remains since it processes `rawInput`, not `result`.

Lines removed: ~37. Lines added: ~3.

### Migration: EditFileTool (`edit-file-tool.ts`)

**Before** (two private methods, 45 lines):

```typescript
private extractDiff(): string | null { /* 31 lines */ }
private extractSummary(): string { /* 8 lines */ }
```

**After**:

```typescript
import {
  extractDiff as extractDiffUtil,
  extractOutputText,
} from './tool-output-utils';

// extractDiff becomes a thin wrapper that adds the edit-specific
// old_str/new_str synthetic diff fallback:
private extractDiff(): string | null {
  const shared = extractDiffUtil(this.toolCall.result);
  if (shared) return shared;

  // Edit-specific: synthesize diff from old_str / new_str input
  const input = this.toolCall.rawInput;
  if (input) {
    const oldStr = input['old_str'] as string | undefined;
    const newStr = input['new_str'] as string | undefined;
    if (oldStr !== undefined && newStr !== undefined) {
      return [
        '--- a', '+++ b', '@@ @@',
        ...oldStr.split('\n').map((l) => `-${l}`),
        ...newStr.split('\n').map((l) => `+${l}`),
      ].join('\n');
    }
  }
  return null;
}

// extractSummary() replaced:
const summary = extractOutputText(this.toolCall.result, { maxLength: 500 });
```

This shows the intended layering: shared utilities handle the common
`ToolCallResult` traversal, while tool-specific logic (synthetic diffs from
edit inputs) stays in the renderer as a thin wrapper.

Lines removed: ~25 (extractDiff shrunk, extractSummary deleted).
Lines added: ~5.

### Migration: HandoffTool (`handoff-tool.ts`)

**Before** (one private method, 9 lines):

```typescript
private extractOutput(): string {
  const result = this.widget.toolCall.result;
  if (!result) return '';
  if (result.rawOutput) {
    return JSON.stringify(result.rawOutput, null, 2).slice(0, 500);
  }
  return result.content
    ?.map(c => c.content?.text ?? '')
    .join('\n') ?? '';
}
```

**After**:

```typescript
import { extractOutputText } from './tool-output-utils';

// In build():
const output = extractOutputText(this.widget.toolCall.result, { maxLength: 500 });
```

This also fixes the inconsistency where HandoffTool only accessed
`c.content?.text` and missed the direct `c['text']` path.

Lines removed: ~9. Lines added: ~2.

## Testing Strategy

The extracted functions are pure and take only a `ToolCallResult` value, making
them straightforward to unit test without rendering widgets.

### File: `packages/flitter-amp/src/widgets/tool-call/__tests__/tool-output-utils.test.ts`

```typescript
import {
  extractOutputText,
  extractShellOutput,
  extractDiff,
  extractRawNumber,
  extractRawString,
  extractRawArray,
  joinContentText,
  looksLikeDiff,
} from '../tool-output-utils';
import type { ToolCallResult } from '../../../acp/types';

// ---------------------------------------------------------------------------
// Helper to create ToolCallResult fixtures
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<ToolCallResult> = {}): ToolCallResult {
  return { status: 'completed', ...overrides };
}

function makeContentResult(...texts: string[]): ToolCallResult {
  return makeResult({
    content: texts.map((t) => ({
      type: 'text',
      content: { type: 'text', text: t },
    })),
  });
}

// ---------------------------------------------------------------------------
// joinContentText
// ---------------------------------------------------------------------------

describe('joinContentText', () => {
  it('returns empty string for undefined result', () => {
    expect(joinContentText(undefined)).toBe('');
  });

  it('returns empty string when content is absent', () => {
    expect(joinContentText(makeResult())).toBe('');
  });

  it('joins nested content.text entries', () => {
    expect(joinContentText(makeContentResult('line1', 'line2'))).toBe(
      'line1\nline2',
    );
  });

  it('handles direct text property via cast', () => {
    const result = makeResult({
      content: [{ type: 'text', text: 'direct' } as any],
    });
    expect(joinContentText(result)).toBe('direct');
  });

  it('prefers direct text over nested content.text', () => {
    const result = makeResult({
      content: [
        { type: 'text', text: 'direct', content: { type: 'text', text: 'nested' } } as any,
      ],
    });
    expect(joinContentText(result)).toBe('direct');
  });
});

// ---------------------------------------------------------------------------
// extractOutputText
// ---------------------------------------------------------------------------

describe('extractOutputText', () => {
  it('returns empty string for undefined result', () => {
    expect(extractOutputText(undefined)).toBe('');
  });

  it('stringifies rawOutput object', () => {
    const result = makeResult({ rawOutput: { key: 'val' } });
    const output = extractOutputText(result);
    expect(output).toContain('"key"');
    expect(output).toContain('"val"');
  });

  it('returns rawOutput string verbatim', () => {
    const result = makeResult({ rawOutput: 'plain text' as any });
    expect(extractOutputText(result)).toBe('plain text');
  });

  it('joins content text entries when no rawOutput', () => {
    const result = makeContentResult('line1', 'line2');
    expect(extractOutputText(result)).toBe('line1\nline2');
  });

  it('truncates at default maxLength of 2000', () => {
    const long = 'a'.repeat(3000);
    const result = makeResult({ rawOutput: { x: long } });
    const out = extractOutputText(result);
    expect(out.length).toBeLessThan(2200);
    expect(out).toContain('(truncated)');
  });

  it('truncates at custom maxLength', () => {
    const long = 'a'.repeat(200);
    const result = makeResult({ rawOutput: { x: long } });
    const out = extractOutputText(result, { maxLength: 50 });
    expect(out.length).toBeLessThan(80);
    expect(out).toContain('(truncated)');
  });

  it('does not truncate when under maxLength', () => {
    const result = makeResult({ rawOutput: { x: 'short' } });
    const out = extractOutputText(result);
    expect(out).not.toContain('(truncated)');
  });

  it('uses custom truncation suffix', () => {
    const long = 'a'.repeat(3000);
    const result = makeResult({ rawOutput: { x: long } });
    const out = extractOutputText(result, {
      maxLength: 100,
      truncationSuffix: ' [...]',
    });
    expect(out).toContain('[...]');
  });
});

// ---------------------------------------------------------------------------
// extractShellOutput
// ---------------------------------------------------------------------------

describe('extractShellOutput', () => {
  it('prefers stdout/stderr over JSON stringify', () => {
    const result = makeResult({
      rawOutput: { stdout: 'hello', stderr: '', other: 'ignored' },
    });
    expect(extractShellOutput(result)).toBe('hello');
  });

  it('joins stdout and stderr', () => {
    const result = makeResult({
      rawOutput: { stdout: 'out', stderr: 'err' },
    });
    expect(extractShellOutput(result)).toBe('out\nerr');
  });

  it('falls back to JSON when no stdout/stderr', () => {
    const result = makeResult({ rawOutput: { data: 42 } });
    expect(extractShellOutput(result)).toContain('"data"');
  });

  it('handles rawOutput as string', () => {
    const result = makeResult({ rawOutput: 'command output' as any });
    expect(extractShellOutput(result)).toBe('command output');
  });

  it('falls back to content text when no rawOutput', () => {
    const result = makeContentResult('fallback line');
    expect(extractShellOutput(result)).toBe('fallback line');
  });
});

// ---------------------------------------------------------------------------
// Diff extraction
// ---------------------------------------------------------------------------

describe('looksLikeDiff', () => {
  it('detects unified diff markers', () => {
    expect(looksLikeDiff('--- a/f\n+++ b/f\n@@ -1 +1 @@\n-old\n+new')).toBe(true);
  });

  it('rejects non-diff text', () => {
    expect(looksLikeDiff('just a regular message')).toBe(false);
  });

  it('requires @@ plus --- or +++', () => {
    expect(looksLikeDiff('@@@ something @@@')).toBe(false);
    expect(looksLikeDiff('@@ with --- marker')).toBe(true);
  });
});

describe('extractDiff', () => {
  it('detects unified diff in rawOutput', () => {
    const result = makeResult({
      rawOutput: { diff: '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new' },
    });
    expect(extractDiff(result)).toBeTruthy();
  });

  it('detects diff in content entries', () => {
    const diffText = '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new';
    const result = makeResult({
      content: [{ type: 'text', content: { type: 'text', text: diffText } }],
    });
    expect(extractDiff(result)).toBe(diffText);
  });

  it('returns null when no diff markers present', () => {
    const result = makeResult({ rawOutput: { msg: 'just a message' } });
    expect(extractDiff(result)).toBeNull();
  });

  it('returns null for undefined result', () => {
    expect(extractDiff(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

describe('extractRawNumber', () => {
  it('finds first matching key', () => {
    const result = makeResult({ rawOutput: { total: 42, count: 10 } });
    expect(extractRawNumber(result, ['count', 'total'])).toBe(10);
  });

  it('returns null when key absent', () => {
    const result = makeResult({ rawOutput: { other: 5 } });
    expect(extractRawNumber(result, ['exit_code'])).toBeNull();
  });

  it('returns null for undefined result', () => {
    expect(extractRawNumber(undefined, ['exit_code'])).toBeNull();
  });

  it('skips non-numeric values', () => {
    const result = makeResult({ rawOutput: { count: 'not a number' } });
    expect(extractRawNumber(result, ['count'])).toBeNull();
  });
});

describe('extractRawString', () => {
  it('extracts string value by key', () => {
    const result = makeResult({ rawOutput: { name: 'test' } });
    expect(extractRawString(result, ['name'])).toBe('test');
  });

  it('returns null when key absent', () => {
    const result = makeResult({ rawOutput: {} });
    expect(extractRawString(result, ['name'])).toBeNull();
  });
});

describe('extractRawArray', () => {
  it('extracts array by first matching key', () => {
    const result = makeResult({
      rawOutput: { results: [{ url: 'https://example.com' }] },
    });
    const arr = extractRawArray(result, ['results', 'links']);
    expect(arr).toHaveLength(1);
  });

  it('returns empty array when key absent', () => {
    const result = makeResult({ rawOutput: {} });
    expect(extractRawArray(result, ['results'])).toEqual([]);
  });

  it('returns empty array for undefined result', () => {
    expect(extractRawArray(undefined, ['results'])).toEqual([]);
  });
});
```

## Lines of Code Impact

| Area | Before | After | Delta |
|------|--------|-------|-------|
| `tool-output-utils.ts` (new) | 0 | ~155 lines | +155 |
| `bash-tool.ts` | 134 lines | ~105 lines | -29 |
| `grep-tool.ts` | 113 lines | ~85 lines | -28 |
| `generic-tool-card.ts` | 202 lines | ~155 lines | -47 |
| `read-tool.ts` | 104 lines | ~85 lines | -19 |
| `web-search-tool.ts` | 129 lines | ~105 lines | -24 |
| `edit-file-tool.ts` | 141 lines | ~115 lines | -26 |
| `handoff-tool.ts` | 185 lines | ~170 lines | -15 |
| **Production total** | 1008 lines | ~975 lines | **-33 net** |
| **Test file** (new) | 0 | ~200 lines | +200 |

The net production code change is modest (-33 lines), but the real value is
**deduplication**: 7 independent implementations of the same traversal logic
are replaced by a single source of truth. The test file provides ~200 lines of
focused coverage for logic that was previously untestable in isolation.

## Incremental Adoption Path

The migration can be done file-by-file without breaking changes:

1. **Step 1**: Add `tool-output-utils.ts` with all exported functions and the
   test file. No existing code is touched. Ship and verify tests pass.

2. **Step 2**: Migrate `generic-tool-card.ts` first (highest impact, used as
   fallback for all unmapped tool types, and currently has the most extraction
   methods).

3. **Step 3**: Migrate `bash-tool.ts` and `grep-tool.ts` (most complex
   extraction logic with tool-specific variants).

4. **Step 4**: Migrate `read-tool.ts`, `web-search-tool.ts`, and
   `handoff-tool.ts` (straightforward 1:1 replacements).

5. **Step 5**: Migrate `edit-file-tool.ts` (requires keeping the thin wrapper
   for synthetic diff generation).

6. **Step 6**: Delete all now-unused private `extractOutput`/`extractOutputText`/
   `extractDiff`/`extractSummary`/`extractExitCode`/`extractMatchCount` methods
   from the renderers. Verify that no private extraction methods remain.

Each step is independently shippable and testable. Existing widget behavior is
preserved because the shared functions replicate the exact same traversal logic
with the same defaults. The only behavioral change is in HandoffTool and
EditFileTool, which gain the direct `c['text']` access path they were previously
missing -- this is a bug fix, not a breaking change.

## Future Extensions

Once the shared utility is in place, several follow-up improvements become
straightforward:

1. **Standardize truncation limits**: Document and potentially unify the
   per-tool limits (2000, 1000, 500) if there is no user-facing reason for
   the differences.

2. **Support `result.text` shorthand**: If the `ToolCallResult` type gains a
   direct `text` field, only `tool-output-utils.ts` needs to be updated.

3. **Streaming-aware extraction**: Add an `isStreaming` option that returns
   partial content without truncation suffix, useful for live-updating tool
   output displays.

4. **Typed rawOutput schemas**: The `extractRawNumber`/`extractRawString`/
   `extractRawArray` functions could be generalized into a single
   `extractRawField<T>` with runtime type guards, reducing the API surface.
