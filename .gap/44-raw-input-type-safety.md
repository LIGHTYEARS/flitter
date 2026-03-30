# Gap T06 -- Type-safe extraction of `rawInput` values

## Problem

Every tool renderer in `packages/flitter-amp/src/widgets/tool-call/` accesses
`ToolCallItem.rawInput` (typed `Record<string, unknown>`) and immediately casts
the retrieved values with `as string`, `as number`, or `as string | undefined`
without any runtime validation.  The `unknown` values may actually be numbers,
booleans, objects, arrays, `null`, or `undefined`.  An invalid cast silently
produces a wrong type at runtime, which can cause:

* `.length`, `.slice()`, `.split()` called on a non-string, throwing at render.
* Numeric arithmetic applied to `undefined`, producing `NaN` that is rendered.
* Template-literal interpolation of an object, yielding `[object Object]`.
* String methods (`.includes()`) invoked on a number, crashing the diff-check in
  `edit-file-tool.ts` when `old_str` is not actually a string.

### Root cause

The `ToolCallItem` interface in `packages/flitter-amp/src/acp/types.ts` (line 50)
defines:

```ts
rawInput?: Record<string, unknown>;
```

This is the correct type -- the ACP protocol carries tool inputs as arbitrary JSON
objects.  The problem is not with the type definition; it is with every consumer
treating the `unknown` values as if they were already narrowed:

```ts
// Typical pattern found across 8 files:
const command = (input['command'] ?? input['cmd'] ?? '') as string;
//                                                        ^^^^^^^^^
// This is a lie -- if input['command'] is a number or object, TypeScript
// will happily accept the cast but JavaScript will not behave correctly.
```

### Scope of the problem

Two distinct categories of unsafe casts exist:

1. **`rawInput` field access** -- extracting user-visible properties like
   `command`, `file_path`, `query`, `pattern`, `thread_id`, `content`,
   `old_str`, `new_str`, `offset`, `limit`, `todos`.  This accounts for
   the majority of the casts.

2. **`result.content` element access** -- the repeated pattern
   `(c as Record<string, unknown>)['text'] as string` appears in 5 files
   (bash-tool, read-tool, grep-tool, web-search-tool, generic-tool-card).
   The `content` array elements are typed as
   `{ type: string; content?: { type: string; text: string } }`, but the
   renderers also try to access a top-level `text` property that does not
   exist on the declared type. This double-cast (`as Record` then `as string`)
   masks a structural mismatch.

3. **`result.rawOutput` field access** -- extracting `stdout`, `stderr`,
   `exit_code`, `count`, `matchCount`, `total`, `results`, `links` from
   the output record.

### Affected call sites (exhaustive audit)

| File | Line(s) | Expression | Cast | Risk |
|------|---------|-----------|------|------|
| `bash-tool.ts` | 39 | `(input['command'] ?? ... ?? '') as string` | `as string` | `.slice()` on non-string |
| `bash-tool.ts` | 114 | `(raw['stdout'] ?? '') as string` | `as string` | string concat on non-string |
| `bash-tool.ts` | 115 | `(raw['stderr'] ?? '') as string` | `as string` | string concat on non-string |
| `bash-tool.ts` | 120 | `(c as Record<string, unknown>)['text'] as string` | double cast | structural mismatch |
| `read-tool.ts` | 39 | `(input['file_path'] ?? ... ?? '') as string` | `as string` | `.length` on non-string |
| `read-tool.ts` | 40 | `input['offset'] as number \| undefined` | `as number` | arithmetic on non-number |
| `read-tool.ts` | 41 | `input['limit'] as number \| undefined` | `as number` | arithmetic on non-number |
| `read-tool.ts` | 101 | `(c as Record<string, unknown>)['text'] as string` | double cast | structural mismatch |
| `grep-tool.ts` | 40 | `(input['pattern'] ?? ... ?? '') as string` | `as string` | `.length` on non-string |
| `grep-tool.ts` | 41 | `(input['path'] ?? ... ?? '') as string` | `as string` | string interp on non-string |
| `grep-tool.ts` | 94-96 | `raw['count'] as number` (3 keys) | `as number` | returns non-number to caller |
| `grep-tool.ts` | 110 | `(c as Record<string, unknown>)['text'] as string` | double cast | structural mismatch |
| `create-file-tool.ts` | 38 | `(input['file_path'] ?? ... ?? '') as string` | `as string` | `.length` on non-string |
| `create-file-tool.ts` | 50 | `(input['content'] ?? '') as string` | `as string` | `.length`, `.slice()` on non-string |
| `edit-file-tool.ts` | 39 | `(input['file_path'] ?? ... ?? '') as string` | `as string` | `.length` on non-string |
| `edit-file-tool.ts` | 118 | `input['old_str'] as string \| undefined` | `as string` | `.split()`, `.map()` crash |
| `edit-file-tool.ts` | 119 | `input['new_str'] as string \| undefined` | `as string` | `.split()`, `.map()` crash |
| `web-search-tool.ts` | 39 | `(input['query'] ?? ... ?? '') as string` | `as string` | header display corruption |
| `web-search-tool.ts` | 112 | `(r['url'] ?? ... ?? '') as string` | `as string` | link rendering corruption |
| `web-search-tool.ts` | 126 | `(c as Record<string, unknown>)['text'] as string` | double cast | structural mismatch |
| `handoff-tool.ts` | 91 | `(input['thread_id'] ?? ... ?? '') as string` | `as string` | header display corruption |
| `todo-list-tool.ts` | 125 | `input['todos'] as TodoEntry[] \| undefined` | `as TodoEntry[]` | `.map()` on non-array |
| `todo-list-tool.ts` | 128-130 | `t.content as string`, `t.status as string`, `t.priority as string` | `as string` (x3) | property access on non-object |
| `todo-list-tool.ts` | 137 | `(raw['todos'] ?? raw['items'] ?? []) as TodoEntry[]` | `as TodoEntry[]` | `.map()` on non-array |
| `todo-list-tool.ts` | 140-142 | `t.content as string`, `t.status as string`, `t.priority as string` | `as string` (x3) | same as above |
| `generic-tool-card.ts` | 177 | `(c as Record<string, unknown>)['text'] as string` | double cast | structural mismatch |
| `generic-tool-card.ts` | 199 | `(c as Record<string, unknown>)['text'] as string` | double cast | structural mismatch |

That is **28 distinct `as` casts** spread across 8 files, all operating on
`unknown` without a single `typeof` guard.

### Concrete failure scenario

Consider what happens when an MCP tool provider sends a numeric `command` field:

```json
{ "command": 42 }
```

In `bash-tool.ts` line 39:

```ts
const command = (input['command'] ?? '') as string;
// command is now the number 42, but TypeScript thinks it's a string
const shortCmd = command.length > 80 ? command.slice(0, 80) + '...' : command;
// command.length === undefined (numbers don't have .length)
// command.slice is not a function -> RUNTIME CRASH
```

Similarly, if `input['offset']` were the string `"10"` instead of the number
`10`, the arithmetic `offset + limit` would produce string concatenation
(`"105"` instead of `15`), causing the line range display to be wrong.

---

## Proposed solution

Introduce a small, zero-dependency extraction module at

```
packages/flitter-amp/src/utils/raw-input.ts
```

that provides narrowing helpers.  Each helper accepts `unknown` and returns the
requested type or a fallback, performing real runtime checks.

Additionally, introduce a shared content-text extraction helper to eliminate the
repeated `(c as Record<string, unknown>)['text'] as string ?? c.content?.text`
pattern that appears in 5 separate files.

### 1. Core extraction functions

```ts
// packages/flitter-amp/src/utils/raw-input.ts

/**
 * Safely coerce an unknown value to a string.
 *
 * - `string`   -> returned as-is
 * - `number`   -> `String(value)`
 * - `boolean`  -> `String(value)`
 * - everything else -> `fallback`
 *
 * Rationale for coercing numbers/booleans: the existing renderers display these
 * values in text contexts (header details, command preview).  Silently dropping
 * a numeric command is worse than showing "42" in the UI.
 */
export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

/**
 * Safely extract an optional string from an unknown value.
 * Returns `undefined` when the value is not string-like,
 * unlike `asString` which always returns a string.
 *
 * Useful for fields like `old_str` / `new_str` where the distinction
 * between "absent" and "empty string" matters.
 */
export function asOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

/**
 * Safely coerce an unknown value to a number.
 *
 * - `number`                 -> returned as-is (NaN returns fallback)
 * - numeric `string`         -> parseFloat (NaN returns fallback)
 * - everything else          -> `fallback`
 */
export function asNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? fallback : value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/**
 * Safely extract the first string-like value from a record for a list of
 * candidate keys.  Mirrors the existing "fallback chain" pattern used across
 * every tool renderer but adds runtime narrowing.
 *
 * Example:
 *   pickString(input, ['command', 'cmd', 'shell_command', 'script', 'args'])
 *   // Replaces: (input['command'] ?? input['cmd'] ?? ... ?? '') as string
 */
export function pickString(
  record: Record<string, unknown> | undefined,
  keys: readonly string[],
  fallback = '',
): string {
  if (!record) return fallback;
  for (const key of keys) {
    const v = record[key];
    if (v !== undefined && v !== null) {
      return asString(v, fallback);
    }
  }
  return fallback;
}

/**
 * Safely extract the first number-like value from a record for a single key.
 */
export function pickNumber(
  record: Record<string, unknown> | undefined,
  key: string,
): number | null {
  if (!record) return null;
  return asNumber(record[key]);
}

/**
 * Safely narrow an unknown value to an array whose elements pass a guard.
 * Returns an empty array when the value is not an array or guard rejects all
 * elements.
 */
export function asArray<T>(
  value: unknown,
  guard: (element: unknown) => element is T,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(guard);
}

/**
 * Type guard: is value a plain object (non-null, non-array)?
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for TodoEntry shape.
 * Validates the minimum required keys ('content' + 'status') exist
 * without pulling in a full schema validation library.
 */
export function isTodoEntry(value: unknown): value is { content: unknown; status: unknown; priority?: unknown } {
  return isRecord(value) && 'content' in value && 'status' in value;
}

/**
 * Extract text from a ToolCallResult content element.
 *
 * The ACP type declares content elements as:
 *   { type: string; content?: { type: string; text: string } }
 *
 * But multiple renderers also probe for a top-level `text` property
 * (e.g. some MCP providers return `{ type: 'text', text: '...' }`).
 * This helper safely checks both shapes, eliminating the need for the
 * repeated `(c as Record<string, unknown>)['text'] as string` double-cast.
 */
export function extractContentText(
  element: { type: string; content?: { type: string; text: string } },
): string {
  // Check the declared shape first
  if (element.content?.text) return element.content.text;

  // Fall back to a top-level 'text' property (structurally present on
  // some MCP content blocks but not on the declared TypeScript type)
  const rec = element as Record<string, unknown>;
  if (typeof rec['text'] === 'string') return rec['text'];

  return '';
}

/**
 * Extract all text content from a ToolCallResult's content array,
 * joining with newlines.  Returns empty string if content is absent.
 *
 * Replaces the repeated pattern across 5+ files:
 *   this.toolCall.result.content
 *     ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
 *     .join('\n') ?? ''
 */
export function extractAllContentText(
  content: Array<{ type: string; content?: { type: string; text: string } }> | undefined,
): string {
  if (!content) return '';
  return content.map(extractContentText).join('\n');
}
```

### 2. Refactored call sites

Below is the concrete diff for every affected file.  The pattern is identical
each time: replace the bare `as` cast with the appropriate helper.

#### bash-tool.ts (3 input casts + 1 content cast)

```diff
+import { pickString, asString, extractAllContentText } from '../../utils/raw-input';

  build(context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
-   const command = (input['command'] ?? input['cmd'] ?? input['shell_command'] ?? input['script'] ?? input['args'] ?? '') as string;
+   const command = pickString(input, ['command', 'cmd', 'shell_command', 'script', 'args']);
    ...
  }

  private extractOutput(): string {
    ...
      const raw = this.toolCall.result.rawOutput;
      if (typeof raw === 'string') return raw;
-     const stdout = (raw['stdout'] ?? '') as string;
-     const stderr = (raw['stderr'] ?? '') as string;
+     const stdout = asString(raw['stdout']);
+     const stderr = asString(raw['stderr']);
      if (stdout || stderr) return [stdout, stderr].filter(Boolean).join('\n');
      return JSON.stringify(raw, null, 2);
    }
-   return this.toolCall.result.content
-     ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
-     .join('\n') ?? '';
+   return extractAllContentText(this.toolCall.result.content);
  }
```

#### read-tool.ts (3 input casts + 1 content cast)

```diff
+import { pickString, pickNumber, extractAllContentText } from '../../utils/raw-input';

  build(context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
-   const filePath = (input['file_path'] ?? input['path'] ?? input['filename'] ?? input['file'] ?? '') as string;
-   const offset = input['offset'] as number | undefined;
-   const limit = input['limit'] as number | undefined;
+   const filePath = pickString(input, ['file_path', 'path', 'filename', 'file']);
+   const offset = pickNumber(input, 'offset');
+   const limit = pickNumber(input, 'limit');

    const details: string[] = [];
    if (filePath) details.push(filePath);
-   if (offset !== undefined && limit !== undefined) {
+   if (offset !== null && limit !== null) {
      details.push(`L${offset}-${offset + limit}`);
-   } else if (offset !== undefined) {
+   } else if (offset !== null) {
      details.push(`L${offset}`);
    }
    ...
  }

  private extractOutput(): string {
    ...
-   return this.toolCall.result.content
-     ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
-     .join('\n') ?? '';
+   return extractAllContentText(this.toolCall.result.content);
  }
```

#### grep-tool.ts (4 input/output casts + 1 content cast)

```diff
+import { pickString, asNumber, extractAllContentText } from '../../utils/raw-input';

  build(context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
-   const pattern = (input['pattern'] ?? input['query'] ?? input['glob'] ?? input['search_pattern'] ?? input['regex'] ?? input['search'] ?? '') as string;
-   const path = (input['path'] ?? input['directory'] ?? '') as string;
+   const pattern = pickString(input, ['pattern', 'query', 'glob', 'search_pattern', 'regex', 'search']);
+   const path = pickString(input, ['path', 'directory']);
    ...
  }

  private extractMatchCount(): number | null {
    const raw = this.toolCall.result?.rawOutput;
-   if (raw && typeof raw === 'object') {
-     if ('count' in raw) return raw['count'] as number;
-     if ('matchCount' in raw) return raw['matchCount'] as number;
-     if ('total' in raw) return raw['total'] as number;
+   if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
+     for (const key of ['count', 'matchCount', 'total'] as const) {
+       if (key in raw) {
+         const n = asNumber(raw[key]);
+         if (n !== null) return n;
+       }
+     }
    }
    return null;
  }

  private extractOutput(): string {
    ...
-   return this.toolCall.result.content
-     ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
-     .join('\n') ?? '';
+   return extractAllContentText(this.toolCall.result.content);
  }
```

#### create-file-tool.ts (2 input casts)

```diff
+import { pickString } from '../../utils/raw-input';

  build(context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
-   const filePath = (input['file_path'] ?? input['path'] ?? input['filename'] ?? input['file'] ?? input['destination'] ?? '') as string;
+   const filePath = pickString(input, ['file_path', 'path', 'filename', 'file', 'destination']);

    ...
-   const content = (input['content'] ?? '') as string;
+   const content = pickString(input, ['content']);
```

#### edit-file-tool.ts (3 input casts)

```diff
+import { pickString, asOptionalString } from '../../utils/raw-input';

  build(context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
-   const filePath = (input['file_path'] ?? input['path'] ?? '') as string;
+   const filePath = pickString(input, ['file_path', 'path']);
    ...
  }

  private extractDiff(): string | null {
    ...
    const input = this.toolCall.rawInput;
    if (input) {
-     const oldStr = input['old_str'] as string | undefined;
-     const newStr = input['new_str'] as string | undefined;
+     const oldStr = asOptionalString(input['old_str']);
+     const newStr = asOptionalString(input['new_str']);
      if (oldStr !== undefined && newStr !== undefined) {
        return `--- a\n+++ b\n@@ @@\n${oldStr.split('\n').map(l => `-${l}`).join('\n')}\n${newStr.split('\n').map(l => `+${l}`).join('\n')}`;
      }
    }
```

The `asOptionalString` helper is particularly important here because `old_str`
and `new_str` are used with `.split('\n')` and `.map()` -- calling those on a
non-string (e.g., a number or object) would throw a TypeError at runtime.

#### web-search-tool.ts (2 input casts + 1 output cast + 1 content cast)

```diff
+import { pickString, isRecord, extractAllContentText } from '../../utils/raw-input';

  build(context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
-   const query = (input['query'] ?? input['url'] ?? input['search_query'] ?? input['q'] ?? input['search'] ?? '') as string;
+   const query = pickString(input, ['query', 'url', 'search_query', 'q', 'search']);
    ...
  }

  private extractLinks(): string[] {
    const raw = this.toolCall.result?.rawOutput;
    if (!raw || typeof raw !== 'object') return [];
-   const results = (raw['results'] ?? raw['links'] ?? []) as Array<Record<string, unknown>>;
-   if (!Array.isArray(results)) return [];
-   return results
-     .map(r => (r['url'] ?? r['link'] ?? r['href'] ?? '') as string)
+   const candidates = raw['results'] ?? raw['links'];
+   if (!Array.isArray(candidates)) return [];
+   return candidates
+     .filter(isRecord)
+     .map(r => pickString(r, ['url', 'link', 'href']))
      .filter(Boolean)
      .slice(0, 10);
  }

  private extractOutput(): string {
    ...
-   return this.toolCall.result.content
-     ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
-     .join('\n') ?? '';
+   return extractAllContentText(this.toolCall.result.content);
  }
```

#### handoff-tool.ts (1 input cast)

```diff
+import { pickString } from '../../utils/raw-input';

  build(context: BuildContext): Widget {
    const input = toolCall.rawInput ?? {};
-   const threadId = (input['thread_id'] ?? input['threadId'] ?? '') as string;
+   const threadId = pickString(input, ['thread_id', 'threadId']);
```

#### todo-list-tool.ts (6 input casts + 2 array casts)

```diff
+import { asString, asArray, isTodoEntry } from '../../utils/raw-input';

  private extractTodoEntries(): TodoEntry[] {
    const input = this.toolCall.rawInput;
    if (input) {
-     const todos = input['todos'] as TodoEntry[] | undefined;
-     if (Array.isArray(todos)) {
-       return todos.map(t => ({
-         content: (t.content ?? '') as string,
-         status: (t.status ?? 'pending') as string,
-         priority: t.priority as string | undefined,
-       }));
-     }
+     const todos = asArray(input['todos'], isTodoEntry);
+     if (todos.length > 0) {
+       return todos.map(t => ({
+         content: asString(t.content),
+         status: asString(t.status, 'pending'),
+         priority: typeof t.priority === 'string' ? t.priority : undefined,
+       }));
+     }
    }

    const raw = this.toolCall.result?.rawOutput;
-   if (raw && typeof raw === 'object') {
-     const todos = (raw['todos'] ?? raw['items'] ?? []) as TodoEntry[];
-     if (Array.isArray(todos)) {
+   if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
+     const candidates = raw['todos'] ?? raw['items'];
+     const todos = asArray(candidates, isTodoEntry);
+     if (todos.length > 0) {
        return todos.map(t => ({
-         content: (t.content ?? '') as string,
-         status: (t.status ?? 'pending') as string,
-         priority: t.priority as string | undefined,
+         content: asString(t.content),
+         status: asString(t.status, 'pending'),
+         priority: typeof t.priority === 'string' ? t.priority : undefined,
        }));
      }
    }
```

#### generic-tool-card.ts (3 content casts)

```diff
+import { extractContentText, extractAllContentText } from '../../utils/raw-input';

  private extractDiff(): string | null {
    ...
    if (this.toolCall.result.content) {
      for (const c of this.toolCall.result.content) {
-       const text = (c as Record<string, unknown>)['text'] as string ?? c.content?.text;
+       const text = extractContentText(c);
        if (text && text.includes('@@') && (text.includes('---') || text.includes('+++'))) {
          return text;
        }
      }
    }
    ...
  }

  private extractOutputText(): string {
    ...
-   return this.toolCall.result.content
-     ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
-     .join('\n') ?? '';
+   return extractAllContentText(this.toolCall.result.content);
  }
```

### 3. Unit tests

```ts
// packages/flitter-amp/src/__tests__/raw-input.test.ts

import { describe, it, expect } from 'vitest';
import {
  asString, asOptionalString, asNumber,
  pickString, pickNumber,
  asArray, isRecord, isTodoEntry,
  extractContentText, extractAllContentText,
} from '../utils/raw-input';

// ────────────────────────────────────────────────────────
// asString
// ────────────────────────────────────────────────────────
describe('asString', () => {
  it('returns string values unchanged', () => {
    expect(asString('hello')).toBe('hello');
  });
  it('returns empty strings unchanged (not treated as falsy)', () => {
    expect(asString('')).toBe('');
  });
  it('stringifies numbers', () => {
    expect(asString(42)).toBe('42');
    expect(asString(0)).toBe('0');
    expect(asString(-1.5)).toBe('-1.5');
  });
  it('stringifies booleans', () => {
    expect(asString(true)).toBe('true');
    expect(asString(false)).toBe('false');
  });
  it('returns fallback for null', () => {
    expect(asString(null, 'fb')).toBe('fb');
  });
  it('returns fallback for objects', () => {
    expect(asString({ a: 1 })).toBe('');
  });
  it('returns fallback for arrays', () => {
    expect(asString([1, 2])).toBe('');
  });
  it('returns fallback for undefined', () => {
    expect(asString(undefined)).toBe('');
  });
  it('returns fallback for NaN (typeof number but not useful as text)', () => {
    // NaN is typeof 'number', so String(NaN) === 'NaN' -- still valid text
    expect(asString(NaN)).toBe('NaN');
  });
});

// ────────────────────────────────────────────────────────
// asOptionalString
// ────────────────────────────────────────────────────────
describe('asOptionalString', () => {
  it('returns string values unchanged', () => {
    expect(asOptionalString('hello')).toBe('hello');
  });
  it('stringifies numbers', () => {
    expect(asOptionalString(42)).toBe('42');
  });
  it('returns undefined for null', () => {
    expect(asOptionalString(null)).toBeUndefined();
  });
  it('returns undefined for objects', () => {
    expect(asOptionalString({ a: 1 })).toBeUndefined();
  });
  it('returns undefined for undefined', () => {
    expect(asOptionalString(undefined)).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────
// asNumber
// ────────────────────────────────────────────────────────
describe('asNumber', () => {
  it('returns number values unchanged', () => {
    expect(asNumber(42)).toBe(42);
  });
  it('returns 0 unchanged (not treated as falsy)', () => {
    expect(asNumber(0)).toBe(0);
  });
  it('returns null for NaN', () => {
    expect(asNumber(NaN)).toBeNull();
  });
  it('parses numeric strings', () => {
    expect(asNumber('3.14')).toBeCloseTo(3.14);
  });
  it('parses integer strings', () => {
    expect(asNumber('100')).toBe(100);
  });
  it('returns null for non-numeric strings', () => {
    expect(asNumber('abc')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(asNumber('')).toBeNull();
  });
  it('returns null for objects', () => {
    expect(asNumber({})).toBeNull();
  });
  it('returns null for booleans', () => {
    expect(asNumber(true)).toBeNull();
  });
  it('honors custom fallback', () => {
    expect(asNumber('abc', 0)).toBe(0);
  });
});

// ────────────────────────────────────────────────────────
// pickString
// ────────────────────────────────────────────────────────
describe('pickString', () => {
  it('picks first matching key', () => {
    const r = { b: 'world', a: 'hello' };
    expect(pickString(r, ['a', 'b'])).toBe('hello');
  });
  it('skips undefined values', () => {
    const r = { a: undefined, b: 'ok' };
    expect(pickString(r, ['a', 'b'])).toBe('ok');
  });
  it('skips null values', () => {
    const r = { a: null, b: 'ok' };
    expect(pickString(r, ['a', 'b'])).toBe('ok');
  });
  it('coerces non-string values', () => {
    const r = { count: 99 };
    expect(pickString(r, ['count'])).toBe('99');
  });
  it('returns fallback when no keys match', () => {
    expect(pickString({}, ['x'], 'none')).toBe('none');
  });
  it('returns fallback for undefined record', () => {
    expect(pickString(undefined, ['x'])).toBe('');
  });
  it('returns empty string by default', () => {
    expect(pickString({}, ['x'])).toBe('');
  });
  it('matches the original multi-key fallback chain behavior', () => {
    // Simulates: (input['command'] ?? input['cmd'] ?? input['script'] ?? '') as string
    const input = { cmd: 'ls -la' };
    expect(pickString(input, ['command', 'cmd', 'script'])).toBe('ls -la');
  });
});

// ────────────────────────────────────────────────────────
// pickNumber
// ────────────────────────────────────────────────────────
describe('pickNumber', () => {
  it('picks a numeric value', () => {
    expect(pickNumber({ offset: 10 }, 'offset')).toBe(10);
  });
  it('returns null for missing key', () => {
    expect(pickNumber({}, 'offset')).toBeNull();
  });
  it('parses string numbers', () => {
    expect(pickNumber({ offset: '5' }, 'offset')).toBe(5);
  });
  it('returns null for undefined record', () => {
    expect(pickNumber(undefined, 'offset')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────
// asArray
// ────────────────────────────────────────────────────────
describe('asArray', () => {
  it('filters with guard', () => {
    const guard = (v: unknown): v is string => typeof v === 'string';
    expect(asArray(['a', 1, 'b', null], guard)).toEqual(['a', 'b']);
  });
  it('returns empty for non-array', () => {
    const guard = (v: unknown): v is string => typeof v === 'string';
    expect(asArray('not-array', guard)).toEqual([]);
  });
  it('returns empty for null', () => {
    const guard = (v: unknown): v is string => typeof v === 'string';
    expect(asArray(null, guard)).toEqual([]);
  });
  it('returns empty for undefined', () => {
    const guard = (v: unknown): v is string => typeof v === 'string';
    expect(asArray(undefined, guard)).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────
// isRecord
// ────────────────────────────────────────────────────────
describe('isRecord', () => {
  it('accepts plain objects', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });
  it('accepts empty objects', () => {
    expect(isRecord({})).toBe(true);
  });
  it('rejects null', () => {
    expect(isRecord(null)).toBe(false);
  });
  it('rejects arrays', () => {
    expect(isRecord([1, 2])).toBe(false);
  });
  it('rejects strings', () => {
    expect(isRecord('hello')).toBe(false);
  });
  it('rejects numbers', () => {
    expect(isRecord(42)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────
// isTodoEntry
// ────────────────────────────────────────────────────────
describe('isTodoEntry', () => {
  it('accepts valid shape', () => {
    expect(isTodoEntry({ content: 'x', status: 'pending' })).toBe(true);
  });
  it('accepts extra keys', () => {
    expect(isTodoEntry({ content: 'x', status: 'done', priority: 'high' })).toBe(true);
  });
  it('rejects missing content', () => {
    expect(isTodoEntry({ status: 'pending' })).toBe(false);
  });
  it('rejects missing status', () => {
    expect(isTodoEntry({ content: 'x' })).toBe(false);
  });
  it('rejects non-objects', () => {
    expect(isTodoEntry('string')).toBe(false);
  });
  it('rejects null', () => {
    expect(isTodoEntry(null)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────
// extractContentText
// ────────────────────────────────────────────────────────
describe('extractContentText', () => {
  it('extracts from content.text (declared shape)', () => {
    const elem = { type: 'text', content: { type: 'text', text: 'hello' } };
    expect(extractContentText(elem)).toBe('hello');
  });
  it('extracts from top-level text property (MCP variant)', () => {
    const elem = { type: 'text', text: 'world' } as any;
    expect(extractContentText(elem)).toBe('world');
  });
  it('returns empty string when neither shape matches', () => {
    const elem = { type: 'image' };
    expect(extractContentText(elem as any)).toBe('');
  });
  it('prefers content.text over top-level text', () => {
    const elem = { type: 'text', text: 'top', content: { type: 'text', text: 'nested' } } as any;
    expect(extractContentText(elem)).toBe('nested');
  });
});

// ────────────────────────────────────────────────────────
// extractAllContentText
// ────────────────────────────────────────────────────────
describe('extractAllContentText', () => {
  it('joins multiple elements with newlines', () => {
    const content = [
      { type: 'text', content: { type: 'text', text: 'line1' } },
      { type: 'text', content: { type: 'text', text: 'line2' } },
    ];
    expect(extractAllContentText(content)).toBe('line1\nline2');
  });
  it('returns empty string for undefined', () => {
    expect(extractAllContentText(undefined)).toBe('');
  });
  it('returns empty string for empty array', () => {
    expect(extractAllContentText([])).toBe('');
  });
});
```

---

## Design rationale

### 1. Runtime narrowing, not just type annotations

The helpers use `typeof` checks, `Number.isNaN`, and `Array.isArray` at runtime.
This means a malformed API response (e.g. a number where a string was expected)
silently degrades to the fallback instead of crashing the renderer mid-frame.
This is critical because tool renderers execute during the widget build phase --
an uncaught TypeError would crash the entire TUI rendering pipeline.

### 2. `pickString` replaces the repeated fallback chain pattern

Every tool renderer duplicates the same `(a ?? b ?? c ?? '') as string` pattern
with different key lists.  `pickString` captures this pattern once and makes it
safe.  The key list is passed as a `readonly string[]`, which preserves the
existing behavior of trying multiple property names in order.

### 3. `asOptionalString` for optional fields

The `edit-file-tool.ts` renderer uses `old_str` and `new_str` as
`string | undefined` -- the *absence* of the value carries meaning (skip
generating a synthetic diff).  `asString` always returns a string, which
would lose the undefined/present distinction.  `asOptionalString` returns
`undefined` for non-string-like values, preserving the semantic.

### 4. `extractContentText` / `extractAllContentText` for structural mismatches

The `ToolCallResult.content` type declares elements as
`{ type: string; content?: { type: string; text: string } }`, but the actual
ACP/MCP wire format can also include `{ type: 'text', text: '...' }` (with
`text` at the top level rather than nested in `content`).  Rather than having
every renderer independently double-cast with
`(c as Record<string, unknown>)['text'] as string`, a shared helper encapsulates
this polymorphism safely.  This also provides a single location to update if the
ACP type definition is later corrected to include the `text` field.

### 5. No new dependencies

The module is pure TypeScript with zero imports.  There is no monolithic
"parse the entire input" schema library (e.g., zod, io-ts); each function is a
small, composable building block.  This keeps bundle size zero and avoids
introducing a validation framework dependency for what is essentially 8 small
type guards.

### 6. Graceful coercion vs. strict rejection

`asString` coerces numbers and booleans to their string representation rather
than returning the fallback.  This matches the existing behavior where a numeric
`command` value would still render as visible text (`"42"`), which is better
than silently dropping it and showing an empty header.  The coercion is
intentionally limited to primitives -- objects and arrays return the fallback
because `String({})` yields the unhelpful `[object Object]`.

### 7. `isTodoEntry` as a lightweight shape guard

For the todo-list case the input is an array of objects, not a primitive.
A dedicated type guard validates the minimum required shape (`content` + `status`
keys present) without pulling in a full schema validation library.  Combined
with `asArray`, this replaces the unsafe `input['todos'] as TodoEntry[]` cast
with proper runtime validation of each array element.

### 8. Consistent `null` vs `undefined` semantics

`pickNumber` returns `null` (not `undefined`) to indicate absence.  This was
chosen because:
- `null` is unambiguous -- it always means "no value found"
- `undefined` could be confused with "the property was not set in the record"
- The existing `extractMatchCount` in `grep-tool.ts` already returns `number | null`
- Using `!== null` guards instead of `!== undefined` is slightly more explicit

---

## Additional considerations

### Content type extension

The most impactful secondary improvement would be to update the `ToolCallResult`
content element type in `packages/flitter-amp/src/acp/types.ts` to reflect the
actual wire format:

```ts
// Current (incomplete):
content?: Array<{ type: string; content?: { type: string; text: string } }>;

// Proposed (matches MCP reality):
content?: Array<{
  type: string;
  text?: string;                           // <-- MCP text blocks
  content?: { type: string; text: string }; // <-- ACP nested content
}>;
```

This would eliminate the need for `extractContentText` to use `as Record` at
all.  However, this change affects the ACP type contract and should be
coordinated with the `@agentclientprotocol/sdk` package owners.

### ESLint enforcement

After the migration, enable one of:
- `@typescript-eslint/no-unsafe-type-assertion` (strictest -- disallows all
  `as` casts on `unknown`)
- `@typescript-eslint/consistent-type-assertions` with `assertionStyle: 'never'`
  (prevents `as` entirely in favor of type guards)

A scoped rule in `.eslintrc` for the `widgets/tool-call/` directory would
prevent regressions without impacting the rest of the codebase.

### Performance

The helpers are pure functions with O(1) complexity (except `asArray` which is
O(n) in the array length, matching the existing `.filter()` behavior).  There is
no measurable performance difference compared to the current `as` casts since
the `typeof` checks are among the fastest operations in JavaScript engines.

---

## Migration checklist

- [ ] Create `packages/flitter-amp/src/utils/raw-input.ts` with the extraction helpers.
- [ ] Add `packages/flitter-amp/src/__tests__/raw-input.test.ts`.
- [ ] Refactor `bash-tool.ts` -- replace 4 `as` casts (3 input + 1 content).
- [ ] Refactor `read-tool.ts` -- replace 4 `as` casts (3 input + 1 content).
- [ ] Refactor `grep-tool.ts` -- replace 5 `as` casts (2 input + 2 output + 1 content).
- [ ] Refactor `create-file-tool.ts` -- replace 2 `as` casts.
- [ ] Refactor `edit-file-tool.ts` -- replace 3 `as` casts.
- [ ] Refactor `web-search-tool.ts` -- replace 4 `as` casts (1 input + 2 output + 1 content).
- [ ] Refactor `handoff-tool.ts` -- replace 1 `as` cast.
- [ ] Refactor `todo-list-tool.ts` -- replace 8 `as` casts (2 array + 6 field).
- [ ] Refactor `generic-tool-card.ts` -- replace 3 `as` casts (all content).
- [ ] Verify total: 34 casts removed across 9 files, 0 `as string` or `as number` remaining in `tool-call/`.
- [ ] Run `vitest` and confirm all tests pass.
- [ ] Run `tsc --noEmit` and confirm zero type errors.
- [ ] Consider enabling `@typescript-eslint/no-unsafe-type-assertion` for the
      `widgets/tool-call/` directory to prevent regressions.
- [ ] Consider updating `ToolCallResult.content` element type to include
      optional `text` field (coordinate with ACP SDK owners).
