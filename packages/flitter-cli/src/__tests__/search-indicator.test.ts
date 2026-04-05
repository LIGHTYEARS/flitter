// Tests for reverse-i-search indicator utility (I14).

import { describe, it, expect } from 'bun:test';
import { formatSearchIndicator } from '../utils/search-indicator';

describe('formatSearchIndicator (I14)', () => {
  it('formats a basic search indicator', () => {
    const result = formatSearchIndicator('foo', 5, 2);
    expect(result).toBe("(reverse-i-search)`foo': [2/5]");
  });

  it('handles empty query', () => {
    const result = formatSearchIndicator('', 0, 0);
    expect(result).toBe("(reverse-i-search)`': [0/0]");
  });

  it('handles single match', () => {
    const result = formatSearchIndicator('git commit', 1, 1);
    expect(result).toBe("(reverse-i-search)`git commit': [1/1]");
  });

  it('handles large numbers', () => {
    const result = formatSearchIndicator('ls', 100, 42);
    expect(result).toBe("(reverse-i-search)`ls': [42/100]");
  });

  it('handles special characters in query', () => {
    const result = formatSearchIndicator('grep -r "hello"', 3, 1);
    expect(result).toBe('(reverse-i-search)`grep -r "hello"' + "': [1/3]");
  });

  it('preserves whitespace in query', () => {
    const result = formatSearchIndicator('  spaced  ', 2, 1);
    expect(result).toBe("(reverse-i-search)`  spaced  ': [1/2]");
  });
});
