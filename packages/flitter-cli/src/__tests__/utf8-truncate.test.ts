// Tests for I17: UTF-8 safe truncation utility.

import { describe, it, expect } from 'bun:test';
import { utf8Truncate, utf8ByteLength } from '../utils/utf8-truncate';

describe('utf8ByteLength', () => {
  it('returns 0 for empty string', () => {
    expect(utf8ByteLength('')).toBe(0);
  });

  it('returns correct length for ASCII', () => {
    expect(utf8ByteLength('hello')).toBe(5);
  });

  it('returns correct length for 2-byte characters', () => {
    // e.g. 'e' with acute accent: U+00E9 = 2 bytes in UTF-8
    expect(utf8ByteLength('\u00E9')).toBe(2);
  });

  it('returns correct length for 3-byte CJK characters', () => {
    // Each CJK ideograph is 3 bytes in UTF-8
    expect(utf8ByteLength('\u4F60\u597D')).toBe(6); // 你好
  });

  it('returns correct length for 4-byte emoji', () => {
    // U+1F600 (grinning face) is 4 bytes in UTF-8
    expect(utf8ByteLength('\u{1F600}')).toBe(4);
  });

  it('returns correct length for mixed content', () => {
    // 'a' (1) + 'é' (2) + '你' (3) + '😀' (4) = 10
    expect(utf8ByteLength('a\u00E9\u4F60\u{1F600}')).toBe(10);
  });
});

describe('utf8Truncate', () => {
  // ---------------------------------------------------------------------------
  // Basic behavior
  // ---------------------------------------------------------------------------

  it('returns unchanged string when within limit', () => {
    expect(utf8Truncate('hello', 10)).toBe('hello');
  });

  it('returns unchanged string at exact byte length', () => {
    expect(utf8Truncate('hello', 5)).toBe('hello');
  });

  it('returns empty string for maxBytes 0', () => {
    expect(utf8Truncate('hello', 0)).toBe('');
  });

  it('returns empty string for negative maxBytes', () => {
    expect(utf8Truncate('hello', -1)).toBe('');
  });

  it('truncates ASCII correctly', () => {
    expect(utf8Truncate('abcdef', 3)).toBe('abc');
  });

  // ---------------------------------------------------------------------------
  // Multi-byte safety
  // ---------------------------------------------------------------------------

  it('does not split 2-byte characters', () => {
    const str = '\u00E9\u00E9\u00E9'; // ééé — 6 bytes total
    // maxBytes = 5 — can fit 2 full chars (4 bytes), must not split third
    const result = utf8Truncate(str, 5);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(5);
    expect(result).toBe('\u00E9\u00E9');
  });

  it('does not split 3-byte CJK characters', () => {
    const str = '\u4F60\u597D\u4E16'; // 你好世 — 9 bytes
    // maxBytes = 7 — can fit 2 CJK (6 bytes), not 3
    const result = utf8Truncate(str, 7);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(7);
    expect(result).toBe('\u4F60\u597D');
  });

  it('does not split 4-byte emoji', () => {
    const str = '\u{1F600}\u{1F601}'; // 😀😁 — 8 bytes
    // maxBytes = 5 — can fit 1 emoji (4 bytes), not a partial second
    const result = utf8Truncate(str, 5);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(5);
    expect(result).toBe('\u{1F600}');
  });

  it('returns empty when maxBytes is less than first character', () => {
    // CJK character needs 3 bytes, but only 2 available
    expect(utf8Truncate('\u4F60', 2)).toBe('');
  });

  it('handles emoji requiring 4 bytes with only 3 available', () => {
    expect(utf8Truncate('\u{1F600}', 3)).toBe('');
  });

  // ---------------------------------------------------------------------------
  // Mixed content
  // ---------------------------------------------------------------------------

  it('truncates mixed ASCII and CJK safely', () => {
    const str = 'ab\u4F60cd'; // 'a'(1) + 'b'(1) + '你'(3) + 'c'(1) + 'd'(1) = 7 bytes
    // maxBytes = 4 — fits 'ab' + partial CJK, should keep 'ab' only
    const result = utf8Truncate(str, 4);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(4);
    expect(result).toBe('ab');
  });

  it('truncates mixed ASCII and emoji safely', () => {
    const str = 'hi\u{1F600}!'; // 'h'(1) + 'i'(1) + emoji(4) + '!'(1) = 7 bytes
    // maxBytes = 6 fits 'hi' + emoji
    const result = utf8Truncate(str, 6);
    expect(result).toBe('hi\u{1F600}');
    expect(utf8ByteLength(result)).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('handles empty string', () => {
    expect(utf8Truncate('', 10)).toBe('');
  });

  it('handles very large maxBytes', () => {
    const str = 'short';
    expect(utf8Truncate(str, 1_000_000)).toBe('short');
  });

  it('handles string of only emoji', () => {
    const str = '\u{1F600}\u{1F601}\u{1F602}'; // 12 bytes
    const result = utf8Truncate(str, 8);
    expect(result).toBe('\u{1F600}\u{1F601}');
    expect(utf8ByteLength(result)).toBe(8);
  });

  it('handles flag emoji (multi-codepoint)', () => {
    // Flag emoji like 🇺🇸 are two regional indicator symbols, each 4 bytes = 8 bytes
    const flag = '\u{1F1FA}\u{1F1F8}';
    expect(utf8ByteLength(flag)).toBe(8);

    // Truncating at 4 bytes gives first regional indicator (visually incomplete but byte-safe)
    const result = utf8Truncate(flag, 4);
    expect(utf8ByteLength(result)).toBeLessThanOrEqual(4);
  });

  it('maxBytes = 1 with ASCII gives single char', () => {
    expect(utf8Truncate('abc', 1)).toBe('a');
  });
});
