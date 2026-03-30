// Unit tests for tool-output-utils.ts — Gap #45
// Tests shared output extraction functions

import { describe, it, expect } from 'bun:test';
import type { ToolCallResult } from '../acp/types';
import {
  joinContentText,
  extractOutputText,
  extractShellOutput,
  looksLikeDiff,
  extractDiff,
  extractRawNumber,
  extractRawString,
  extractRawArray,
} from '../widgets/tool-call/tool-output-utils';

// ---------------------------------------------------------------------------
// Helper: make a ToolCallResult
// ---------------------------------------------------------------------------

function makeResult(opts?: Partial<ToolCallResult>): ToolCallResult {
  return {
    status: 'completed',
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// joinContentText
// ---------------------------------------------------------------------------

describe('joinContentText', () => {
  it('joins content text entries', () => {
    const result = makeResult({
      content: [
        { type: 'text', content: { type: 'text', text: 'line1' } },
        { type: 'text', content: { type: 'text', text: 'line2' } },
      ],
    });
    expect(joinContentText(result)).toBe('line1\nline2');
  });

  it('handles top-level text property', () => {
    const result = makeResult({
      content: [
        { type: 'text', text: 'direct' } as any,
      ],
    });
    expect(joinContentText(result)).toBe('direct');
  });

  it('returns empty for undefined result', () => {
    expect(joinContentText(undefined)).toBe('');
  });

  it('returns empty for result with no content', () => {
    expect(joinContentText(makeResult())).toBe('');
  });
});

// ---------------------------------------------------------------------------
// extractOutputText
// ---------------------------------------------------------------------------

describe('extractOutputText', () => {
  it('returns empty for undefined result', () => {
    expect(extractOutputText(undefined)).toBe('');
  });

  it('uses rawOutput string directly', () => {
    // rawOutput typed as Record<string, unknown> but test string-like behavior
    const result = makeResult({
      rawOutput: 'raw string output' as any,
    });
    expect(extractOutputText(result)).toBe('raw string output');
  });

  it('JSON-stringifies object rawOutput', () => {
    const result = makeResult({
      rawOutput: { key: 'value' },
    });
    const output = extractOutputText(result);
    expect(output).toContain('"key"');
    expect(output).toContain('"value"');
  });

  it('falls back to content text when no rawOutput', () => {
    const result = makeResult({
      content: [
        { type: 'text', content: { type: 'text', text: 'fallback' } },
      ],
    });
    expect(extractOutputText(result)).toBe('fallback');
  });

  it('truncates long output', () => {
    const result = makeResult({
      rawOutput: { text: 'x'.repeat(3000) },
    });
    const output = extractOutputText(result, { maxLength: 100 });
    expect(output.length).toBeLessThanOrEqual(150); // 100 + suffix
  });

  it('respects custom maxLength', () => {
    const result = makeResult({
      rawOutput: { text: 'a'.repeat(600) },
    });
    const output = extractOutputText(result, { maxLength: 50 });
    expect(output.length).toBeLessThanOrEqual(100); // 50 + suffix
  });
});

// ---------------------------------------------------------------------------
// extractShellOutput
// ---------------------------------------------------------------------------

describe('extractShellOutput', () => {
  it('returns empty for undefined result', () => {
    expect(extractShellOutput(undefined)).toBe('');
  });

  it('extracts stdout from rawOutput', () => {
    const result = makeResult({
      rawOutput: { stdout: 'hello world', stderr: '' },
    });
    expect(extractShellOutput(result)).toBe('hello world');
  });

  it('joins stdout and stderr', () => {
    const result = makeResult({
      rawOutput: { stdout: 'out', stderr: 'err' },
    });
    expect(extractShellOutput(result)).toBe('out\nerr');
  });

  it('skips empty stdout/stderr and falls back to JSON', () => {
    const result = makeResult({
      rawOutput: { other: 'data' },
    });
    const output = extractShellOutput(result);
    expect(output).toContain('"other"');
    expect(output).toContain('"data"');
  });

  it('falls back to content text', () => {
    const result = makeResult({
      content: [
        { type: 'text', content: { type: 'text', text: 'shell output' } },
      ],
    });
    expect(extractShellOutput(result)).toBe('shell output');
  });
});

// ---------------------------------------------------------------------------
// looksLikeDiff
// ---------------------------------------------------------------------------

describe('looksLikeDiff', () => {
  it('detects unified diff markers', () => {
    expect(looksLikeDiff('--- a/file\n+++ b/file\n@@ -1,3 +1,3 @@')).toBe(true);
  });

  it('rejects non-diff text', () => {
    expect(looksLikeDiff('just regular text')).toBe(false);
    expect(looksLikeDiff('@@only hunk markers')).toBe(false);
    expect(looksLikeDiff('--- only file markers')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractDiff
// ---------------------------------------------------------------------------

describe('extractDiff', () => {
  it('returns null for undefined result', () => {
    expect(extractDiff(undefined)).toBeNull();
  });

  it('extracts diff from rawOutput', () => {
    const diffText = '--- a/file\n+++ b/file\n@@ -1,3 +1,3 @@\n-old\n+new';
    const result = makeResult({
      rawOutput: { diff: diffText } as any,
    });
    // rawOutput is stringified, so the JSON will contain the diff markers
    const extracted = extractDiff(result);
    // The JSON stringify of the object should contain @@ and --- or +++
    expect(extracted).not.toBeNull();
  });

  it('extracts diff from content', () => {
    const diffText = '--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new';
    const result = makeResult({
      content: [
        { type: 'text', content: { type: 'text', text: diffText } },
      ],
    });
    expect(extractDiff(result)).toBe(diffText);
  });

  it('returns null when no diff found', () => {
    const result = makeResult({
      rawOutput: { text: 'not a diff' },
    });
    expect(extractDiff(result)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractRawNumber
// ---------------------------------------------------------------------------

describe('extractRawNumber', () => {
  it('extracts number by key', () => {
    const result = makeResult({ rawOutput: { exit_code: 0 } });
    expect(extractRawNumber(result, ['exit_code'])).toBe(0);
  });

  it('tries multiple keys in order', () => {
    const result = makeResult({ rawOutput: { matchCount: 42 } });
    expect(extractRawNumber(result, ['count', 'matchCount', 'total'])).toBe(42);
  });

  it('returns null for missing keys', () => {
    const result = makeResult({ rawOutput: { other: 'value' } });
    expect(extractRawNumber(result, ['exit_code'])).toBeNull();
  });

  it('returns null for undefined result', () => {
    expect(extractRawNumber(undefined, ['exit_code'])).toBeNull();
  });

  it('returns null when rawOutput is absent', () => {
    expect(extractRawNumber(makeResult(), ['exit_code'])).toBeNull();
  });

  it('rejects non-numeric values', () => {
    const result = makeResult({ rawOutput: { exit_code: 'not a number' } });
    expect(extractRawNumber(result, ['exit_code'])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractRawString
// ---------------------------------------------------------------------------

describe('extractRawString', () => {
  it('extracts string by key', () => {
    const result = makeResult({ rawOutput: { message: 'hello' } });
    expect(extractRawString(result, ['message'])).toBe('hello');
  });

  it('returns null for missing keys', () => {
    const result = makeResult({ rawOutput: { other: 'value' } });
    expect(extractRawString(result, ['message'])).toBeNull();
  });

  it('returns null for undefined result', () => {
    expect(extractRawString(undefined, ['message'])).toBeNull();
  });

  it('rejects non-string values', () => {
    const result = makeResult({ rawOutput: { count: 42 } });
    expect(extractRawString(result, ['count'])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractRawArray
// ---------------------------------------------------------------------------

describe('extractRawArray', () => {
  it('extracts array by key', () => {
    const items = [{ url: 'https://example.com' }];
    const result = makeResult({ rawOutput: { results: items } });
    expect(extractRawArray(result, ['results'])).toEqual(items);
  });

  it('tries multiple keys', () => {
    const items = [{ href: 'link' }];
    const result = makeResult({ rawOutput: { links: items } });
    expect(extractRawArray(result, ['results', 'links'])).toEqual(items);
  });

  it('returns empty for missing keys', () => {
    const result = makeResult({ rawOutput: { other: 'value' } });
    expect(extractRawArray(result, ['results'])).toEqual([]);
  });

  it('returns empty for undefined result', () => {
    expect(extractRawArray(undefined, ['results'])).toEqual([]);
  });

  it('rejects non-array values', () => {
    const result = makeResult({ rawOutput: { results: 'not array' } });
    expect(extractRawArray(result, ['results'])).toEqual([]);
  });
});
