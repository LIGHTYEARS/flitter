// Unit tests for utils/raw-input.ts — Gap #44
// Tests type-safe extraction helpers for tool inputs

import { describe, it, expect } from 'bun:test';
import {
  asString,
  asOptionalString,
  asNumber,
  pickString,
  pickNumber,
  asArray,
  isRecord,
  isTodoEntry,
  extractContentText,
  extractAllContentText,
} from '../utils/raw-input';

// ---------------------------------------------------------------------------
// asString
// ---------------------------------------------------------------------------

describe('asString', () => {
  it('returns strings as-is', () => {
    expect(asString('hello')).toBe('hello');
    expect(asString('')).toBe('');
  });

  it('coerces numbers to string', () => {
    expect(asString(42)).toBe('42');
    expect(asString(0)).toBe('0');
    expect(asString(-1.5)).toBe('-1.5');
  });

  it('coerces booleans to string', () => {
    expect(asString(true)).toBe('true');
    expect(asString(false)).toBe('false');
  });

  it('returns fallback for objects', () => {
    expect(asString({ key: 'val' })).toBe('');
    expect(asString({ key: 'val' }, 'fb')).toBe('fb');
  });

  it('returns fallback for null/undefined', () => {
    expect(asString(null)).toBe('');
    expect(asString(undefined)).toBe('');
    expect(asString(null, 'default')).toBe('default');
  });

  it('returns fallback for arrays', () => {
    expect(asString([1, 2])).toBe('');
  });
});

// ---------------------------------------------------------------------------
// asOptionalString
// ---------------------------------------------------------------------------

describe('asOptionalString', () => {
  it('returns string values', () => {
    expect(asOptionalString('hello')).toBe('hello');
    expect(asOptionalString('')).toBe('');
  });

  it('coerces numbers', () => {
    expect(asOptionalString(42)).toBe('42');
  });

  it('returns undefined for non-primitives', () => {
    expect(asOptionalString(null)).toBeUndefined();
    expect(asOptionalString(undefined)).toBeUndefined();
    expect(asOptionalString({ a: 1 })).toBeUndefined();
    expect(asOptionalString([1])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// asNumber
// ---------------------------------------------------------------------------

describe('asNumber', () => {
  it('returns numbers as-is', () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber(0)).toBe(0);
    expect(asNumber(-3.14)).toBe(-3.14);
  });

  it('returns fallback for NaN', () => {
    expect(asNumber(NaN)).toBeNull();
    expect(asNumber(NaN, -1)).toBe(-1);
  });

  it('parses numeric strings', () => {
    expect(asNumber('42')).toBe(42);
    expect(asNumber('3.14')).toBe(3.14);
    expect(asNumber('-7')).toBe(-7);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(asNumber('abc')).toBeNull();
    expect(asNumber('')).toBeNull();
  });

  it('returns fallback for other types', () => {
    expect(asNumber(null)).toBeNull();
    expect(asNumber(undefined)).toBeNull();
    expect(asNumber(true)).toBeNull();
    expect(asNumber({ x: 1 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pickString
// ---------------------------------------------------------------------------

describe('pickString', () => {
  it('picks first matching key', () => {
    const record = { cmd: 'ls', command: 'echo' };
    expect(pickString(record, ['command', 'cmd'])).toBe('echo');
  });

  it('falls back along the key list', () => {
    const record = { cmd: 'ls' };
    expect(pickString(record, ['command', 'cmd'])).toBe('ls');
  });

  it('returns fallback when no keys match', () => {
    expect(pickString({}, ['command', 'cmd'])).toBe('');
    expect(pickString({}, ['command'], 'none')).toBe('none');
  });

  it('handles undefined record', () => {
    expect(pickString(undefined, ['command'])).toBe('');
  });

  it('coerces number values', () => {
    expect(pickString({ offset: 10 }, ['offset'])).toBe('10');
  });

  it('skips null/undefined values', () => {
    expect(pickString({ a: null, b: 'ok' }, ['a', 'b'])).toBe('ok');
    expect(pickString({ a: undefined, b: 'ok' }, ['a', 'b'])).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// pickNumber
// ---------------------------------------------------------------------------

describe('pickNumber', () => {
  it('extracts numeric values', () => {
    expect(pickNumber({ offset: 10 }, 'offset')).toBe(10);
  });

  it('parses numeric strings', () => {
    expect(pickNumber({ limit: '20' }, 'limit')).toBe(20);
  });

  it('returns null for missing keys', () => {
    expect(pickNumber({}, 'offset')).toBeNull();
  });

  it('handles undefined record', () => {
    expect(pickNumber(undefined, 'offset')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// asArray
// ---------------------------------------------------------------------------

describe('asArray', () => {
  it('filters array elements with guard', () => {
    const isString = (x: unknown): x is string => typeof x === 'string';
    expect(asArray(['a', 1, 'b', null], isString)).toEqual(['a', 'b']);
  });

  it('returns empty array for non-arrays', () => {
    const isString = (x: unknown): x is string => typeof x === 'string';
    expect(asArray('not an array', isString)).toEqual([]);
    expect(asArray(42, isString)).toEqual([]);
    expect(asArray(null, isString)).toEqual([]);
    expect(asArray(undefined, isString)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isRecord
// ---------------------------------------------------------------------------

describe('isRecord', () => {
  it('identifies plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord('str')).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTodoEntry
// ---------------------------------------------------------------------------

describe('isTodoEntry', () => {
  it('accepts valid todo entries', () => {
    expect(isTodoEntry({ content: 'task', status: 'pending' })).toBe(true);
    expect(isTodoEntry({ content: 'task', status: 'done', priority: 'high' })).toBe(true);
  });

  it('rejects invalid shapes', () => {
    expect(isTodoEntry({})).toBe(false);
    expect(isTodoEntry({ content: 'task' })).toBe(false);
    expect(isTodoEntry({ status: 'pending' })).toBe(false);
    expect(isTodoEntry(null)).toBe(false);
    expect(isTodoEntry('string')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractContentText
// ---------------------------------------------------------------------------

describe('extractContentText', () => {
  it('extracts from nested content.text', () => {
    const elem = { type: 'text', content: { type: 'text', text: 'hello' } };
    expect(extractContentText(elem)).toBe('hello');
  });

  it('extracts from top-level text property', () => {
    const elem = { type: 'text', text: 'direct' } as any;
    expect(extractContentText(elem)).toBe('direct');
  });

  it('returns empty for missing text', () => {
    const elem = { type: 'image' };
    expect(extractContentText(elem)).toBe('');
  });

  it('prefers content.text over top-level text', () => {
    const elem = { type: 'text', content: { type: 'text', text: 'nested' }, text: 'top' } as any;
    expect(extractContentText(elem)).toBe('nested');
  });
});

// ---------------------------------------------------------------------------
// extractAllContentText
// ---------------------------------------------------------------------------

describe('extractAllContentText', () => {
  it('joins multiple content texts', () => {
    const content = [
      { type: 'text', content: { type: 'text', text: 'line1' } },
      { type: 'text', content: { type: 'text', text: 'line2' } },
    ];
    expect(extractAllContentText(content)).toBe('line1\nline2');
  });

  it('returns empty for undefined', () => {
    expect(extractAllContentText(undefined)).toBe('');
  });

  it('returns empty for empty array', () => {
    expect(extractAllContentText([])).toBe('');
  });
});
