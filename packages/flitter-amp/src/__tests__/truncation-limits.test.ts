// Unit tests for truncation-limits.ts — Gap #46
// Tests constant hierarchy and truncation helpers

import { describe, it, expect } from 'bun:test';
import {
  HEADER_TRUNCATION_LIMIT,
  INPUT_TRUNCATION_LIMIT,
  PREVIEW_TRUNCATION_LIMIT,
  OUTPUT_TRUNCATION_LIMIT,
  MAX_DISPLAY_ITEMS,
  TRUNCATION_SUFFIX,
  INLINE_TRUNCATION_SUFFIX,
  truncateText,
  truncateInline,
} from '../widgets/tool-call/truncation-limits';

// ---------------------------------------------------------------------------
// Constants validation
// ---------------------------------------------------------------------------

describe('truncation constant hierarchy', () => {
  it('HEADER < INPUT < PREVIEW < OUTPUT', () => {
    expect(HEADER_TRUNCATION_LIMIT).toBeLessThan(INPUT_TRUNCATION_LIMIT);
    expect(INPUT_TRUNCATION_LIMIT).toBeLessThan(PREVIEW_TRUNCATION_LIMIT);
    expect(PREVIEW_TRUNCATION_LIMIT).toBeLessThan(OUTPUT_TRUNCATION_LIMIT);
  });

  it('exports concrete numeric values', () => {
    expect(HEADER_TRUNCATION_LIMIT).toBe(80);
    expect(INPUT_TRUNCATION_LIMIT).toBe(120);
    expect(PREVIEW_TRUNCATION_LIMIT).toBe(500);
    expect(OUTPUT_TRUNCATION_LIMIT).toBe(2000);
  });

  it('MAX_DISPLAY_ITEMS is a positive integer', () => {
    expect(MAX_DISPLAY_ITEMS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_DISPLAY_ITEMS)).toBe(true);
  });

  it('suffixes are non-empty strings', () => {
    expect(typeof TRUNCATION_SUFFIX).toBe('string');
    expect(TRUNCATION_SUFFIX.length).toBeGreaterThan(0);
    expect(typeof INLINE_TRUNCATION_SUFFIX).toBe('string');
    expect(INLINE_TRUNCATION_SUFFIX.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// truncateText
// ---------------------------------------------------------------------------

describe('truncateText', () => {
  it('returns short strings unchanged', () => {
    expect(truncateText('hello', 10)).toBe('hello');
    expect(truncateText('', 10)).toBe('');
  });

  it('truncates long strings and appends suffix', () => {
    const text = 'a'.repeat(3000);
    const result = truncateText(text, 2000);
    expect(result.length).toBeLessThanOrEqual(2000 + TRUNCATION_SUFFIX.length);
    expect(result).toEndWith(TRUNCATION_SUFFIX);
  });

  it('does not truncate at exactly the limit', () => {
    const text = 'a'.repeat(100);
    expect(truncateText(text, 100)).toBe(text);
  });

  it('truncates at limit + 1', () => {
    const text = 'a'.repeat(101);
    const result = truncateText(text, 100);
    expect(result).toBe('a'.repeat(100) + TRUNCATION_SUFFIX);
  });

  it('uses default limit (OUTPUT_TRUNCATION_LIMIT)', () => {
    const short = 'a'.repeat(OUTPUT_TRUNCATION_LIMIT);
    expect(truncateText(short)).toBe(short);

    const long = 'a'.repeat(OUTPUT_TRUNCATION_LIMIT + 1);
    expect(truncateText(long)).toBe('a'.repeat(OUTPUT_TRUNCATION_LIMIT) + TRUNCATION_SUFFIX);
  });

  it('supports custom suffix', () => {
    const text = 'a'.repeat(20);
    const result = truncateText(text, 10, '...');
    expect(result).toBe('a'.repeat(10) + '...');
  });
});

// ---------------------------------------------------------------------------
// truncateInline
// ---------------------------------------------------------------------------

describe('truncateInline', () => {
  it('returns short strings unchanged', () => {
    expect(truncateInline('hello')).toBe('hello');
  });

  it('truncates long strings with inline suffix', () => {
    const text = 'x'.repeat(200);
    const result = truncateInline(text, 120);
    expect(result.length).toBeLessThanOrEqual(120 + INLINE_TRUNCATION_SUFFIX.length);
    expect(result).toEndWith(INLINE_TRUNCATION_SUFFIX);
  });

  it('does not truncate at exactly the limit', () => {
    const text = 'b'.repeat(120);
    expect(truncateInline(text, 120)).toBe(text);
  });

  it('uses INPUT_TRUNCATION_LIMIT as default', () => {
    const text = 'c'.repeat(INPUT_TRUNCATION_LIMIT);
    expect(truncateInline(text)).toBe(text);

    const long = 'c'.repeat(INPUT_TRUNCATION_LIMIT + 1);
    expect(truncateInline(long)).toBe('c'.repeat(INPUT_TRUNCATION_LIMIT) + INLINE_TRUNCATION_SUFFIX);
  });
});
