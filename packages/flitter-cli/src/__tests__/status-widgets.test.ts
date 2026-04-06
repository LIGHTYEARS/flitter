import { describe, expect, it } from 'bun:test';

import { shortenPath } from '../widgets/border-helpers';
import {
  formatTokenCount,
  formatElapsed,
  thresholdColor,
} from '../widgets/border-helpers';
import { Color } from '../../../flitter-core/src/core/color';

// ---------------------------------------------------------------------------
// StatusBar — shortenPath helper
// ---------------------------------------------------------------------------

describe('shortenPath (status-bar)', () => {
  it('replaces $HOME prefix with ~', () => {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (home) {
      const result = shortenPath(`${home}/projects/my-app`);
      expect(result.startsWith('~')).toBe(true);
      expect(result).not.toContain(home);
    }
  });

  it('truncates long paths from the left', () => {
    const long = '/a/very/deeply/nested/directory/structure/that/goes/on/and/on/file.ts';
    const result = shortenPath(long, 30);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.startsWith('...')).toBe(true);
  });

  it('returns short paths unchanged', () => {
    const short = '/tmp/x';
    expect(shortenPath(short)).toBe(short);
  });

  it('respects custom maxLen parameter', () => {
    const path = '/a/b/c/d/e/f/g/h/i/j/file.ts';
    const result = shortenPath(path, 20);
    expect(result.length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// HeaderBar — formatTokenCount
// ---------------------------------------------------------------------------

describe('formatTokenCount', () => {
  it('formats millions', () => {
    expect(formatTokenCount(1_500_000)).toBe('1.5M');
  });

  it('formats thousands', () => {
    expect(formatTokenCount(1_200)).toBe('1.2k');
  });

  it('formats small counts as-is', () => {
    expect(formatTokenCount(42)).toBe('42');
  });

  it('formats exactly 1M', () => {
    expect(formatTokenCount(1_000_000)).toBe('1.0M');
  });

  it('formats exactly 1k', () => {
    expect(formatTokenCount(1_000)).toBe('1.0k');
  });

  it('formats zero', () => {
    expect(formatTokenCount(0)).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// HeaderBar — formatElapsed
// ---------------------------------------------------------------------------

describe('formatElapsed', () => {
  it('formats seconds under 60', () => {
    expect(formatElapsed(12_000)).toBe('12s');
  });

  it('formats minutes and seconds', () => {
    expect(formatElapsed(83_000)).toBe('1m 23s');
  });

  it('formats hours and minutes', () => {
    expect(formatElapsed(3_720_000)).toBe('1h 2m');
  });

  it('formats zero', () => {
    expect(formatElapsed(0)).toBe('0s');
  });

  it('formats exactly 60s as 1m 0s', () => {
    expect(formatElapsed(60_000)).toBe('1m 0s');
  });
});

// ---------------------------------------------------------------------------
// HeaderBar — thresholdColor
// ---------------------------------------------------------------------------

describe('thresholdColor', () => {
  it('returns red for >80%', () => {
    const color = thresholdColor(85);
    expect(color.equals(Color.red)).toBe(true);
  });

  it('returns yellow for 50-80%', () => {
    const color = thresholdColor(50);
    expect(color.equals(Color.yellow)).toBe(true);
  });

  it('returns yellow for 80% exactly', () => {
    const color = thresholdColor(80);
    expect(color.equals(Color.yellow)).toBe(true);
  });

  it('returns blue for <50%', () => {
    const color = thresholdColor(30);
    expect(color.equals(Color.blue)).toBe(true);
  });

  it('returns blue for 0%', () => {
    const color = thresholdColor(0);
    expect(color.equals(Color.blue)).toBe(true);
  });
});
