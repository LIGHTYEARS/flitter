// Tests for I15: Context window warning utility.

import { describe, it, expect } from 'bun:test';
import {
  estimateTokenCount,
  getContextWarning,
} from '../utils/context-warning';

describe('estimateTokenCount', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('estimates ~1 token per 4 characters', () => {
    // 12 chars => ceil(12/4) = 3
    expect(estimateTokenCount('hello world!')).toBe(3);
  });

  it('rounds up partial tokens', () => {
    // 5 chars => ceil(5/4) = 2
    expect(estimateTokenCount('hello')).toBe(2);
  });

  it('handles long text proportionally', () => {
    const text = 'a'.repeat(1000);
    expect(estimateTokenCount(text)).toBe(250);
  });

  it('handles single character', () => {
    expect(estimateTokenCount('x')).toBe(1);
  });

  it('handles exactly 4 characters', () => {
    expect(estimateTokenCount('abcd')).toBe(1);
  });
});

describe('getContextWarning', () => {
  const MAX = 100_000;

  it('returns "none" when usage is below 75%', () => {
    const result = getContextWarning(50_000, MAX);
    expect(result.level).toBe('none');
    expect(result.message).toBe('');
    expect(result.percentage).toBe(50);
  });

  it('returns "none" at exactly 0 tokens', () => {
    const result = getContextWarning(0, MAX);
    expect(result.level).toBe('none');
    expect(result.percentage).toBe(0);
  });

  it('returns "warning" at exactly 75%', () => {
    const result = getContextWarning(75_000, MAX);
    expect(result.level).toBe('warning');
    expect(result.percentage).toBe(75);
    expect(result.message).toContain('75%');
  });

  it('returns "warning" between 75% and 90%', () => {
    const result = getContextWarning(80_000, MAX);
    expect(result.level).toBe('warning');
    expect(result.percentage).toBe(80);
    expect(result.message).toContain('80%');
    expect(result.message).toContain('Approaching limit');
  });

  it('returns "critical" at exactly 90%', () => {
    const result = getContextWarning(90_000, MAX);
    expect(result.level).toBe('critical');
    expect(result.percentage).toBe(90);
    expect(result.message).toContain('critically full');
  });

  it('returns "critical" above 90%', () => {
    const result = getContextWarning(95_000, MAX);
    expect(result.level).toBe('critical');
    expect(result.percentage).toBe(95);
    expect(result.message).toContain('new conversation');
  });

  it('caps percentage at 100 when exceeding max', () => {
    const result = getContextWarning(150_000, MAX);
    expect(result.level).toBe('critical');
    expect(result.percentage).toBe(100);
  });

  it('handles maxTokens of 0 gracefully', () => {
    const result = getContextWarning(100, 0);
    expect(result.level).toBe('none');
    expect(result.percentage).toBe(0);
  });

  it('handles negative maxTokens gracefully', () => {
    const result = getContextWarning(100, -1);
    expect(result.level).toBe('none');
    expect(result.percentage).toBe(0);
  });

  it('returns "none" just below warning threshold', () => {
    const result = getContextWarning(74_999, MAX);
    expect(result.level).toBe('none');
  });

  it('returns "warning" just below critical threshold', () => {
    const result = getContextWarning(89_999, MAX);
    expect(result.level).toBe('warning');
  });
});
