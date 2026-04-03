/**
 * Type-safe extraction helpers for rawInput and content values.
 *
 * Every tool renderer in widgets/tool-call/ accesses ToolCallItem.rawInput
 * (typed Record<string, unknown>) and ToolCallResult.content arrays.
 * These helpers perform runtime narrowing so that callers never need
 * unsafe `as` casts on `unknown` values.
 *
 * Design principles:
 *   - Pure functions with zero dependencies
 *   - Graceful coercion for primitives (numbers/booleans -> string)
 *   - Strict rejection for objects/arrays (return fallback)
 *   - Composable building blocks, not a monolithic schema library
 *
 * Ported from flitter-amp/src/utils/raw-input.ts — zero changes needed
 * since all functions are pure with no external dependencies.
 */

// ---------------------------------------------------------------------------
// Primitive extraction
// ---------------------------------------------------------------------------

/**
 * Safely coerce an unknown value to a string.
 *
 * - `string`   -> returned as-is
 * - `number`   -> `String(value)`
 * - `boolean`  -> `String(value)`
 * - everything else -> `fallback`
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
 * - `number`          -> returned as-is (NaN returns fallback)
 * - numeric `string`  -> parseFloat (NaN returns fallback)
 * - everything else   -> `fallback`
 */
export function asNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? fallback : value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Record-level extraction
// ---------------------------------------------------------------------------

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
 * Safely extract a number-like value from a record for a single key.
 */
export function pickNumber(
  record: Record<string, unknown> | undefined,
  key: string,
): number | null {
  if (!record) return null;
  return asNumber(record[key]);
}

// ---------------------------------------------------------------------------
// Array and object guards
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Content text extraction
// ---------------------------------------------------------------------------

/**
 * Extract text from a ToolCallResult content element.
 *
 * The type declares content elements as:
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
