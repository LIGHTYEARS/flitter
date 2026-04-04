// Tests for PromptHistory — persistent, deduplicated prompt history with cursor
// navigation, encode/decode, file persistence, search, and size limits.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PromptHistory } from '../state/history';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PromptHistory', () => {
  // ---------------------------------------------------------------------------
  // push / dedup / ordering
  // ---------------------------------------------------------------------------

  describe('push, dedup, and ordering', () => {
    let history: PromptHistory;

    beforeEach(() => {
      history = new PromptHistory({ maxSize: 100 });
    });

    it('pushes entries in order', () => {
      history.push('first');
      history.push('second');
      history.push('third');
      expect(history.getEntries()).toEqual(['first', 'second', 'third']);
    });

    it('deduplicates by moving existing entry to the end', () => {
      history.push('alpha');
      history.push('beta');
      history.push('alpha');
      expect(history.getEntries()).toEqual(['beta', 'alpha']);
    });

    it('skips empty strings', () => {
      history.push('');
      history.push('   ');
      history.push('\t');
      expect(history.length).toBe(0);
    });

    it('skips entries that are only whitespace after sanitization', () => {
      history.push('\x00\x01\x02');
      expect(history.length).toBe(0);
    });

    it('strips control characters from entries', () => {
      history.push('hello\x00world');
      expect(history.getEntries()).toEqual(['helloworld']);
    });

    it('preserves newlines (not stripped as control chars)', () => {
      history.push('line1\nline2');
      expect(history.getEntries()).toEqual(['line1\nline2']);
    });

    it('returns a copy from getEntries', () => {
      history.push('test');
      const entries = history.getEntries();
      entries.push('mutated');
      expect(history.getEntries()).toEqual(['test']);
    });

    it('reports correct length', () => {
      expect(history.length).toBe(0);
      history.push('one');
      expect(history.length).toBe(1);
      history.push('two');
      expect(history.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Cursor navigation (previous / next / resetCursor)
  // ---------------------------------------------------------------------------

  describe('cursor navigation', () => {
    let history: PromptHistory;

    beforeEach(() => {
      history = new PromptHistory({ maxSize: 100 });
      history.push('first');
      history.push('second');
      history.push('third');
    });

    it('starts at reset position', () => {
      expect(history.isAtReset).toBe(true);
    });

    it('previous() returns entries from newest to oldest', () => {
      expect(history.previous()).toBe('third');
      expect(history.previous()).toBe('second');
      expect(history.previous()).toBe('first');
    });

    it('previous() returns null at the oldest entry', () => {
      history.previous(); // third
      history.previous(); // second
      history.previous(); // first
      expect(history.previous()).toBeNull();
    });

    it('next() returns null when at reset position', () => {
      expect(history.next()).toBeNull();
    });

    it('next() moves forward after previous()', () => {
      history.previous(); // third
      history.previous(); // second
      expect(history.next()).toBe('third');
    });

    it('next() returns null when reaching past-end', () => {
      history.previous(); // third
      expect(history.next()).toBeNull();
      expect(history.isAtReset).toBe(true);
    });

    it('resetCursor() resets to past-end position', () => {
      history.previous();
      history.previous();
      expect(history.isAtReset).toBe(false);
      history.resetCursor();
      expect(history.isAtReset).toBe(true);
    });

    it('push() resets cursor to past-end', () => {
      history.previous(); // third
      history.previous(); // second
      history.push('fourth');
      expect(history.isAtReset).toBe(true);
      expect(history.previous()).toBe('fourth');
    });

    it('returns null on empty history', () => {
      const empty = new PromptHistory({ maxSize: 100 });
      expect(empty.previous()).toBeNull();
      expect(empty.next()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // encode / decode
  // ---------------------------------------------------------------------------

  describe('encode and decode', () => {
    it('round-trips plain text', () => {
      const text = 'hello world';
      expect(PromptHistory.decode(PromptHistory.encode(text))).toBe(text);
    });

    it('round-trips text with newlines', () => {
      const text = 'line1\nline2\nline3';
      const encoded = PromptHistory.encode(text);
      expect(encoded).toBe('line1\\nline2\\nline3');
      expect(PromptHistory.decode(encoded)).toBe(text);
    });

    it('round-trips text with backslashes', () => {
      const text = 'path\\to\\file';
      const encoded = PromptHistory.encode(text);
      expect(encoded).toBe('path\\\\to\\\\file');
      expect(PromptHistory.decode(encoded)).toBe(text);
    });

    it('round-trips text with both newlines and backslashes', () => {
      const text = 'line1\\n\nline2\\end';
      expect(PromptHistory.decode(PromptHistory.encode(text))).toBe(text);
    });

    it('round-trips empty string', () => {
      expect(PromptHistory.decode(PromptHistory.encode(''))).toBe('');
    });

    it('handles trailing backslash in decode', () => {
      expect(PromptHistory.decode('trailing\\')).toBe('trailing\\');
    });

    it('handles unknown escape sequences in decode', () => {
      expect(PromptHistory.decode('hello\\tworld')).toBe('hello\\tworld');
    });
  });

  // ---------------------------------------------------------------------------
  // File persistence
  // ---------------------------------------------------------------------------

  describe('file persistence', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'history-test-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('writes to file and reloads entries', () => {
      const filePath = join(tmpDir, 'history.txt');

      const h1 = new PromptHistory({ filePath, maxSize: 100 });
      h1.push('alpha');
      h1.push('beta');
      h1.push('gamma');
      h1.save();

      const h2 = new PromptHistory({ filePath, maxSize: 100 });
      expect(h2.getEntries()).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('persists entries with newlines correctly', () => {
      const filePath = join(tmpDir, 'history.txt');

      const h1 = new PromptHistory({ filePath, maxSize: 100 });
      h1.push('line1\nline2');
      h1.push('another\nmultiline\nentry');
      h1.save();

      const h2 = new PromptHistory({ filePath, maxSize: 100 });
      expect(h2.getEntries()).toEqual(['line1\nline2', 'another\nmultiline\nentry']);
    });

    it('creates parent directories if missing', () => {
      const filePath = join(tmpDir, 'nested', 'deep', 'history.txt');
      const h = new PromptHistory({ filePath, maxSize: 100 });
      h.push('test');
      h.save();
      expect(existsSync(filePath)).toBe(true);
    });

    it('truncates file on load when exceeding maxSize', () => {
      const filePath = join(tmpDir, 'history.txt');

      const h1 = new PromptHistory({ filePath, maxSize: 100 });
      for (let i = 0; i < 10; i++) {
        h1.push(`entry-${i}`);
      }
      h1.save();

      const h2 = new PromptHistory({ filePath, maxSize: 5 });
      expect(h2.length).toBe(5);
      expect(h2.getEntries()).toEqual(['entry-5', 'entry-6', 'entry-7', 'entry-8', 'entry-9']);
    });

    it('handles missing file gracefully', () => {
      const filePath = join(tmpDir, 'nonexistent.txt');
      const h = new PromptHistory({ filePath, maxSize: 100 });
      expect(h.length).toBe(0);
    });

    it('file content uses encoded format', () => {
      const filePath = join(tmpDir, 'history.txt');
      const h = new PromptHistory({ filePath, maxSize: 100 });
      h.push('hello\nworld');
      h.save();

      const raw = readFileSync(filePath, 'utf-8');
      expect(raw).toBe('hello\\nworld\n');
    });
  });

  // ---------------------------------------------------------------------------
  // Search (searchBackward / searchForward)
  // ---------------------------------------------------------------------------

  describe('search', () => {
    let history: PromptHistory;

    beforeEach(() => {
      history = new PromptHistory({ maxSize: 100 });
      history.push('build the app');
      history.push('deploy to staging');
      history.push('run tests');
      history.push('build the docs');
      history.push('fix the bug');
    });

    it('searchBackward finds the latest match', () => {
      const result = history.searchBackward('build');
      expect(result).not.toBeNull();
      expect(result!.entry).toBe('build the docs');
      expect(result!.index).toBe(3);
    });

    it('searchBackward is case-insensitive', () => {
      const result = history.searchBackward('BUILD');
      expect(result).not.toBeNull();
      expect(result!.entry).toBe('build the docs');
    });

    it('searchBackward finds earlier match from a given index', () => {
      const result = history.searchBackward('build', 2);
      expect(result).not.toBeNull();
      expect(result!.entry).toBe('build the app');
      expect(result!.index).toBe(0);
    });

    it('searchBackward returns null for no match', () => {
      expect(history.searchBackward('nonexistent')).toBeNull();
    });

    it('searchBackward returns null for empty query', () => {
      expect(history.searchBackward('')).toBeNull();
    });

    it('searchBackward returns null on empty history', () => {
      const empty = new PromptHistory({ maxSize: 100 });
      expect(empty.searchBackward('test')).toBeNull();
    });

    it('searchForward finds the earliest match', () => {
      const result = history.searchForward('build');
      expect(result).not.toBeNull();
      expect(result!.entry).toBe('build the app');
      expect(result!.index).toBe(0);
    });

    it('searchForward finds match from a given index', () => {
      const result = history.searchForward('build', 1);
      expect(result).not.toBeNull();
      expect(result!.entry).toBe('build the docs');
      expect(result!.index).toBe(3);
    });

    it('searchForward returns null for no match', () => {
      expect(history.searchForward('nonexistent')).toBeNull();
    });

    it('searchForward returns null for empty query', () => {
      expect(history.searchForward('')).toBeNull();
    });

    it('searchForward is case-insensitive', () => {
      const result = history.searchForward('DEPLOY');
      expect(result).not.toBeNull();
      expect(result!.entry).toBe('deploy to staging');
    });
  });

  // ---------------------------------------------------------------------------
  // maxSize truncation
  // ---------------------------------------------------------------------------

  describe('maxSize truncation', () => {
    it('evicts oldest entries when exceeding maxSize', () => {
      const history = new PromptHistory({ maxSize: 3 });
      history.push('one');
      history.push('two');
      history.push('three');
      history.push('four');
      expect(history.getEntries()).toEqual(['two', 'three', 'four']);
      expect(history.length).toBe(3);
    });

    it('maxSize=1 keeps only the last entry', () => {
      const history = new PromptHistory({ maxSize: 1 });
      history.push('first');
      history.push('second');
      expect(history.getEntries()).toEqual(['second']);
    });

    it('dedup + eviction works together', () => {
      const history = new PromptHistory({ maxSize: 3 });
      history.push('a');
      history.push('b');
      history.push('c');
      history.push('a'); // dedup moves 'a' to end, no eviction needed
      expect(history.getEntries()).toEqual(['b', 'c', 'a']);
    });
  });

  // ---------------------------------------------------------------------------
  // maxEntryLength filtering
  // ---------------------------------------------------------------------------

  describe('maxEntryLength filtering', () => {
    it('truncates entries exceeding maxEntryLength', () => {
      const history = new PromptHistory({ maxSize: 100, maxEntryLength: 10 });
      history.push('short');
      history.push('this is a very long entry that exceeds the limit');
      expect(history.getEntries()[0]).toBe('short');
      expect(history.getEntries()[1]).toBe('this is a ');
      expect(history.getEntries()[1].length).toBe(10);
    });

    it('uses default maxEntryLength of 10000', () => {
      const history = new PromptHistory({ maxSize: 100 });
      const longEntry = 'x'.repeat(15000);
      history.push(longEntry);
      expect(history.getEntries()[0].length).toBe(10000);
    });

    it('exact-length entries are kept as-is', () => {
      const history = new PromptHistory({ maxSize: 100, maxEntryLength: 5 });
      history.push('abcde');
      expect(history.getEntries()[0]).toBe('abcde');
    });
  });
});
