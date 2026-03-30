// Tests for PromptHistory -- in-memory prompt history for Ctrl+R navigation
//
// Covers:
// 1. Construction and defaults
// 2. push() -- basic insertion, blank rejection, deduplication, max-size eviction
// 3. previous() -- backward navigation, boundary behavior
// 4. next() -- forward navigation, return-to-empty-string behavior
// 5. resetCursor() -- cursor reset semantics
// 6. push() + navigation interaction -- cursor reset after push
// 7. Full navigation round-trips and complex sequences
// 8. Edge cases -- whitespace handling, maxSize boundaries, type contracts

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PromptHistory } from '../state/history';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PromptHistory', () => {

  // --------------------------------------------------------------------------
  // 1. Construction
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates an instance with default maxSize of 100', () => {
      const h = new PromptHistory();
      // Push 101 items; only 100 should be retained
      for (let i = 0; i < 101; i++) h.push(`entry-${i}`);
      // The oldest (entry-0) should have been evicted.
      // Navigating back 100 times should reach entry-1, not entry-0.
      let item: string | null = null;
      for (let i = 0; i < 100; i++) {
        const prev = h.previous();
        if (prev !== null) item = prev;
      }
      expect(item).toBe('entry-1');
    });

    it('accepts a custom maxSize', () => {
      const h = new PromptHistory(3);
      h.push('a');
      h.push('b');
      h.push('c');
      h.push('d'); // should evict 'a'
      // Navigate backward: d, c, b -- no more
      expect(h.previous()).toBe('d');
      expect(h.previous()).toBe('c');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBeNull(); // 'a' was evicted
    });

    it('starts with empty history (previous returns null)', () => {
      const h = new PromptHistory();
      expect(h.previous()).toBeNull();
    });

    it('starts with inactive cursor (next returns null)', () => {
      const h = new PromptHistory();
      expect(h.next()).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 2. push()
  // --------------------------------------------------------------------------

  describe('push', () => {
    let h: PromptHistory;
    beforeEach(() => { h = new PromptHistory(10); });

    it('adds a non-empty string to history', () => {
      h.push('hello');
      expect(h.previous()).toBe('hello');
    });

    it('ignores empty strings', () => {
      h.push('');
      expect(h.previous()).toBeNull();
    });

    it('ignores whitespace-only strings (spaces)', () => {
      h.push('   ');
      expect(h.previous()).toBeNull();
    });

    it('ignores whitespace-only strings (tabs)', () => {
      h.push('\t');
      expect(h.previous()).toBeNull();
    });

    it('ignores whitespace-only strings (newlines)', () => {
      h.push('\n');
      expect(h.previous()).toBeNull();
    });

    it('ignores whitespace-only strings (mixed whitespace)', () => {
      h.push('  \t\n  ');
      expect(h.previous()).toBeNull();
    });

    it('deduplicates consecutive identical entries', () => {
      h.push('same');
      h.push('same');
      h.push('same');
      // Should only have one entry
      expect(h.previous()).toBe('same');
      expect(h.previous()).toBeNull();
    });

    it('allows non-consecutive duplicates', () => {
      h.push('alpha');
      h.push('beta');
      h.push('alpha');
      // All three should be present: alpha, beta, alpha
      expect(h.previous()).toBe('alpha');
      expect(h.previous()).toBe('beta');
      expect(h.previous()).toBe('alpha');
    });

    it('does not deduplicate strings that differ only by trailing whitespace', () => {
      h.push('hello');
      h.push('hello ');
      // These are different strings, both should be stored
      expect(h.previous()).toBe('hello ');
      expect(h.previous()).toBe('hello');
    });

    it('does not deduplicate strings that differ only by leading whitespace', () => {
      h.push('hello');
      h.push(' hello');
      expect(h.previous()).toBe(' hello');
      expect(h.previous()).toBe('hello');
    });

    it('evicts the oldest entry when maxSize is exceeded', () => {
      const h3 = new PromptHistory(3);
      h3.push('first');
      h3.push('second');
      h3.push('third');
      h3.push('fourth'); // evicts 'first'
      expect(h3.previous()).toBe('fourth');
      expect(h3.previous()).toBe('third');
      expect(h3.previous()).toBe('second');
      expect(h3.previous()).toBeNull(); // 'first' is gone
    });

    it('evicts multiple oldest entries as more are pushed', () => {
      const h3 = new PromptHistory(3);
      h3.push('a');
      h3.push('b');
      h3.push('c');
      h3.push('d'); // evicts 'a'
      h3.push('e'); // evicts 'b'
      expect(h3.previous()).toBe('e');
      expect(h3.previous()).toBe('d');
      expect(h3.previous()).toBe('c');
      expect(h3.previous()).toBeNull(); // 'a' and 'b' gone
    });

    it('resets cursor after a successful push', () => {
      h.push('one');
      h.push('two');
      h.previous(); // cursor at 'two'
      h.previous(); // cursor at 'one'
      h.push('three');
      // Cursor should have been reset; previous() starts from end
      expect(h.previous()).toBe('three');
    });

    it('handles maxSize of 1', () => {
      const h1 = new PromptHistory(1);
      h1.push('only');
      h1.push('replacement');
      expect(h1.previous()).toBe('replacement');
      expect(h1.previous()).toBeNull();
    });

    it('handles maxSize of 1 with dedup (no eviction needed)', () => {
      const h1 = new PromptHistory(1);
      h1.push('same');
      h1.push('same'); // dedup, no eviction
      expect(h1.previous()).toBe('same');
      expect(h1.previous()).toBeNull();
    });

    it('maintains order of pushed entries', () => {
      h.push('first');
      h.push('second');
      h.push('third');
      // previous() returns newest first
      expect(h.previous()).toBe('third');
      expect(h.previous()).toBe('second');
      expect(h.previous()).toBe('first');
    });
  });

  // --------------------------------------------------------------------------
  // 3. previous()
  // --------------------------------------------------------------------------

  describe('previous', () => {
    let h: PromptHistory;
    beforeEach(() => { h = new PromptHistory(10); });

    it('returns null on empty history', () => {
      expect(h.previous()).toBeNull();
    });

    it('returns the most recent entry on first call', () => {
      h.push('first');
      h.push('second');
      expect(h.previous()).toBe('second');
    });

    it('walks backward through entries on successive calls', () => {
      h.push('a');
      h.push('b');
      h.push('c');
      expect(h.previous()).toBe('c');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBe('a');
    });

    it('returns null when already at the oldest entry', () => {
      h.push('only');
      expect(h.previous()).toBe('only');
      expect(h.previous()).toBeNull();
    });

    it('stays at oldest entry after returning null (repeated calls)', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b
      h.previous(); // a
      expect(h.previous()).toBeNull(); // at oldest
      // Calling again should still return null (cursor stays at 0)
      expect(h.previous()).toBeNull();
      expect(h.previous()).toBeNull();
    });

    it('works with a single entry', () => {
      h.push('solo');
      expect(h.previous()).toBe('solo');
      expect(h.previous()).toBeNull();
    });

    it('returns the correct entry type (string, not null)', () => {
      h.push('test');
      const result = h.previous();
      expect(typeof result).toBe('string');
      expect(result).toBe('test');
    });
  });

  // --------------------------------------------------------------------------
  // 4. next()
  // --------------------------------------------------------------------------

  describe('next', () => {
    let h: PromptHistory;
    beforeEach(() => { h = new PromptHistory(10); });

    it('returns null when cursor is inactive (no previous() called)', () => {
      h.push('entry');
      expect(h.next()).toBeNull();
    });

    it('returns null on empty history', () => {
      expect(h.next()).toBeNull();
    });

    it('moves forward after previous()', () => {
      h.push('a');
      h.push('b');
      h.push('c');
      h.previous(); // c
      h.previous(); // b
      expect(h.next()).toBe('c');
    });

    it('returns empty string when moving past the newest entry', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b
      h.previous(); // a
      h.next();     // b
      expect(h.next()).toBe(''); // past newest -- restore "new prompt" state
    });

    it('returns null after returning empty string (cursor becomes inactive)', () => {
      h.push('x');
      h.previous(); // x
      const empty = h.next(); // past newest
      expect(empty).toBe('');
      expect(h.next()).toBeNull(); // cursor now -1
    });

    it('works correctly at boundary of single entry', () => {
      h.push('one');
      h.previous(); // one (cursor = 0)
      expect(h.next()).toBe(''); // past newest
      expect(h.next()).toBeNull();
    });

    it('empty string return is distinguishable from null', () => {
      h.push('entry');
      h.previous(); // entry
      const exitResult = h.next(); // returns ''
      const inactiveResult = h.next(); // returns null
      // These must be different values -- UI branches on this distinction
      expect(exitResult).toBe('');
      expect(exitResult).not.toBeNull();
      expect(inactiveResult).toBeNull();
      expect(inactiveResult).not.toBe('');
    });

    it('next after previous at oldest returns the next-newer entry', () => {
      h.push('a');
      h.push('b');
      h.push('c');
      h.previous(); // c
      h.previous(); // b
      h.previous(); // a
      h.previous(); // null (at oldest)
      // Cursor is still at 0 (oldest). next() should move to index 1
      expect(h.next()).toBe('b');
    });
  });

  // --------------------------------------------------------------------------
  // 5. resetCursor()
  // --------------------------------------------------------------------------

  describe('resetCursor', () => {
    let h: PromptHistory;
    beforeEach(() => { h = new PromptHistory(10); });

    it('makes next() return null (cursor becomes inactive)', () => {
      h.push('a');
      h.previous(); // activate cursor
      h.resetCursor();
      expect(h.next()).toBeNull();
    });

    it('causes previous() to start from the most recent entry again', () => {
      h.push('a');
      h.push('b');
      h.push('c');
      h.previous(); // c
      h.previous(); // b
      h.resetCursor();
      expect(h.previous()).toBe('c'); // starts from end again
    });

    it('is safe to call multiple times (idempotent)', () => {
      h.push('x');
      h.resetCursor();
      h.resetCursor();
      h.resetCursor();
      expect(h.previous()).toBe('x');
    });

    it('is safe to call on empty history', () => {
      h.resetCursor();
      expect(h.previous()).toBeNull();
      expect(h.next()).toBeNull();
    });

    it('does not affect stored entries', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b
      h.resetCursor();
      // Entries should still be intact
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBe('a');
    });

    it('can be called when cursor is already inactive (no-op)', () => {
      h.push('a');
      // Cursor is already -1, resetCursor should be a safe no-op
      h.resetCursor();
      expect(h.previous()).toBe('a');
    });
  });

  // --------------------------------------------------------------------------
  // 6. push + navigation interaction
  // --------------------------------------------------------------------------

  describe('push + navigation interaction', () => {
    let h: PromptHistory;
    beforeEach(() => { h = new PromptHistory(10); });

    it('push during backward navigation resets cursor so previous starts from new end', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b
      h.previous(); // a
      h.push('c');  // resets cursor
      expect(h.previous()).toBe('c');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBe('a');
    });

    it('push after next() also resets cursor', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b
      h.previous(); // a
      h.next();     // b
      h.push('new');
      expect(h.previous()).toBe('new');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBe('a');
    });

    it('blank push during navigation does not reset cursor (returns early)', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b -- cursor active at index 1
      // push('') returns early before this.cursor = -1
      h.push('');
      // Cursor should still be at index 1 (pointing at 'b')
      // So next() should go past newest and return ''
      expect(h.next()).toBe(''); // cursor was at 'b' (last entry), exits history
    });

    it('dedup push during navigation does not reset cursor (returns early)', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b -- cursor active
      // Push 'b' again -- consecutive duplicate, returns early before cursor=-1
      h.push('b');
      // Cursor should still be active at position of 'b'
      expect(h.next()).toBe(''); // still navigating from cursor at 'b'
    });

    it('successful push mid-navigation appends to entries and resets cursor', () => {
      h.push('x');
      h.push('y');
      h.previous(); // y
      h.previous(); // x -- cursor at index 0
      h.push('z');  // appends 'z', cursor reset to -1
      // History is now [x, y, z]
      expect(h.previous()).toBe('z');
      expect(h.previous()).toBe('y');
      expect(h.previous()).toBe('x');
      expect(h.previous()).toBeNull();
    });

    it('push after resetCursor works normally', () => {
      h.push('a');
      h.push('b');
      h.previous(); // b
      h.resetCursor();
      h.push('c');
      expect(h.previous()).toBe('c');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBe('a');
    });
  });

  // --------------------------------------------------------------------------
  // 7. Full navigation round-trips
  // --------------------------------------------------------------------------

  describe('full navigation round-trips', () => {
    it('navigates backward then fully forward through 5-entry history', () => {
      const h = new PromptHistory(10);
      h.push('1');
      h.push('2');
      h.push('3');
      h.push('4');
      h.push('5');

      // Go all the way back
      expect(h.previous()).toBe('5');
      expect(h.previous()).toBe('4');
      expect(h.previous()).toBe('3');
      expect(h.previous()).toBe('2');
      expect(h.previous()).toBe('1');
      expect(h.previous()).toBeNull(); // at oldest

      // Go all the way forward
      expect(h.next()).toBe('2');
      expect(h.next()).toBe('3');
      expect(h.next()).toBe('4');
      expect(h.next()).toBe('5');
      expect(h.next()).toBe(''); // past newest
      expect(h.next()).toBeNull(); // cursor inactive
    });

    it('zigzag navigation works correctly', () => {
      const h = new PromptHistory(10);
      h.push('a');
      h.push('b');
      h.push('c');
      h.push('d');

      expect(h.previous()).toBe('d');
      expect(h.previous()).toBe('c');
      expect(h.next()).toBe('d');     // forward one
      expect(h.previous()).toBe('c'); // back again
      expect(h.previous()).toBe('b');
      expect(h.next()).toBe('c');
      expect(h.next()).toBe('d');
      expect(h.next()).toBe('');      // exit history
    });

    it('interleaved push and navigation over many operations', () => {
      const h = new PromptHistory(5);
      h.push('cmd1');
      h.push('cmd2');
      expect(h.previous()).toBe('cmd2');
      h.resetCursor();
      h.push('cmd3');
      expect(h.previous()).toBe('cmd3');
      expect(h.previous()).toBe('cmd2');
      h.push('cmd4');
      h.push('cmd5');
      h.push('cmd6'); // evicts cmd1 (maxSize=5)
      // History should be: cmd2, cmd3, cmd4, cmd5, cmd6
      expect(h.previous()).toBe('cmd6');
      expect(h.previous()).toBe('cmd5');
      expect(h.previous()).toBe('cmd4');
      expect(h.previous()).toBe('cmd3');
      expect(h.previous()).toBe('cmd2');
      expect(h.previous()).toBeNull();
    });

    it('stress test: 200 pushes into maxSize=50 then full backward walk', () => {
      const h = new PromptHistory(50);
      for (let i = 0; i < 200; i++) {
        h.push(`prompt-${i}`);
      }
      // Only entries 150..199 should remain
      const collected: string[] = [];
      let entry = h.previous();
      while (entry !== null) {
        collected.push(entry);
        entry = h.previous();
      }
      expect(collected.length).toBe(50);
      expect(collected[0]).toBe('prompt-199');   // most recent
      expect(collected[49]).toBe('prompt-150');   // oldest retained
    });

    it('stress test: full backward then forward walk matches', () => {
      const h = new PromptHistory(20);
      for (let i = 0; i < 20; i++) {
        h.push(`p-${i}`);
      }

      // Walk all the way back, collecting entries
      const backward: string[] = [];
      let entry = h.previous();
      while (entry !== null) {
        backward.push(entry);
        entry = h.previous();
      }
      expect(backward.length).toBe(20);

      // Walk all the way forward, collecting entries
      const forward: string[] = [];
      let fwd = h.next();
      while (fwd !== null && fwd !== '') {
        forward.push(fwd);
        fwd = h.next();
      }
      // forward should be backward reversed, minus the first and last elements
      // (we started at oldest after null, so next gives us second-oldest first;
      //  we stop before the empty string exit)
      expect(forward.length).toBe(19); // 20 - 1 (oldest was our starting point)
      expect(forward[0]).toBe('p-1');
      expect(forward[18]).toBe('p-19');
    });

    it('repeated full backward-forward cycles produce consistent results', () => {
      const h = new PromptHistory(5);
      h.push('a');
      h.push('b');
      h.push('c');

      for (let cycle = 0; cycle < 3; cycle++) {
        // Full backward walk
        expect(h.previous()).toBe('c');
        expect(h.previous()).toBe('b');
        expect(h.previous()).toBe('a');
        expect(h.previous()).toBeNull();

        // Full forward walk back to inactive
        expect(h.next()).toBe('b');
        expect(h.next()).toBe('c');
        expect(h.next()).toBe('');
        // Cursor is now inactive, next cycle should work identically
      }
    });
  });

  // --------------------------------------------------------------------------
  // 8. Edge cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('previous() followed by push of same text (dedup) then navigation', () => {
      const h = new PromptHistory(10);
      h.push('repeat');
      h.previous(); // 'repeat' -- cursor at index 0
      h.push('repeat'); // dedup, early return, cursor not reset
      // Since dedup returns before cursor = -1, cursor stays at 0
      expect(h.next()).toBe(''); // move past newest (only 1 entry, cursor at 0)
    });

    it('maxSize boundary: exactly at maxSize does not evict', () => {
      const h = new PromptHistory(3);
      h.push('a');
      h.push('b');
      h.push('c');
      // Exactly 3 entries, no eviction
      expect(h.previous()).toBe('c');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBe('a');
      expect(h.previous()).toBeNull();
    });

    it('preserves leading/trailing whitespace in stored text', () => {
      const h = new PromptHistory(10);
      h.push('  spaced  ');
      expect(h.previous()).toBe('  spaced  ');
    });

    it('push checks trim for blank but stores the original untrimmed text', () => {
      // A string like "  hello  " trims to "hello" which is non-blank,
      // so it should be stored with original whitespace intact.
      const h = new PromptHistory(10);
      h.push('  hello  ');
      expect(h.previous()).toBe('  hello  ');
    });

    it('consecutive dedup compares exact strings, not trimmed versions', () => {
      const h = new PromptHistory(10);
      h.push('hello');
      h.push('  hello  '); // different from 'hello', not a duplicate
      expect(h.previous()).toBe('  hello  ');
      expect(h.previous()).toBe('hello');
    });

    it('multiple blank pushes between valid entries do not pollute history', () => {
      const h = new PromptHistory(10);
      h.push('first');
      h.push('');
      h.push('   ');
      h.push('\t\n');
      h.push('second');
      // Only 'first' and 'second' should be in history
      expect(h.previous()).toBe('second');
      expect(h.previous()).toBe('first');
      expect(h.previous()).toBeNull();
    });

    it('dedup does not apply across blank pushes', () => {
      const h = new PromptHistory(10);
      h.push('hello');
      h.push(''); // ignored, no-op
      h.push('hello'); // last real entry is still 'hello', so this is a consecutive dup
      // Only one entry should exist
      expect(h.previous()).toBe('hello');
      expect(h.previous()).toBeNull();
    });

    it('push with special characters preserves them exactly', () => {
      const h = new PromptHistory(10);
      const special = 'echo "hello world" && cat /dev/null | grep -E "^$"';
      h.push(special);
      expect(h.previous()).toBe(special);
    });

    it('push with multi-line string preserves it exactly', () => {
      const h = new PromptHistory(10);
      const multiline = 'line1\nline2\nline3';
      h.push(multiline);
      expect(h.previous()).toBe(multiline);
    });

    it('push with unicode content preserves it exactly', () => {
      const h = new PromptHistory(10);
      h.push('const x = "hello"');
      h.push('ls -la');
      expect(h.previous()).toBe('ls -la');
      expect(h.previous()).toBe('const x = "hello"');
    });

    it('rapid push-then-previous alternation', () => {
      const h = new PromptHistory(10);
      h.push('a');
      expect(h.previous()).toBe('a');
      h.push('b'); // resets cursor
      expect(h.previous()).toBe('b');
      h.push('c'); // resets cursor
      expect(h.previous()).toBe('c');
      expect(h.previous()).toBe('b');
      expect(h.previous()).toBe('a');
    });

    it('next() immediately after construction returns null', () => {
      const h = new PromptHistory(10);
      expect(h.next()).toBeNull();
    });

    it('previous() returns null at oldest even with cursor at 0', () => {
      // Verifies the else branch: cursor === 0 means we return null
      const h = new PromptHistory(10);
      h.push('a');
      h.push('b');
      h.previous(); // b (cursor = 1)
      h.previous(); // a (cursor = 0)
      // Now cursor is 0, calling previous should return null
      expect(h.previous()).toBeNull();
      // And next should still work from cursor 0
      expect(h.next()).toBe('b');
    });
  });

  // --------------------------------------------------------------------------
  // 9. Encode/Decode round-trip
  // --------------------------------------------------------------------------

  describe('encode/decode round-trip', () => {
    const testCases: Array<{ input: string; description: string }> = [
      { input: 'simple text', description: 'plain text' },
      { input: 'line1\nline2', description: 'text with newline' },
      { input: 'line1\nline2\nline3', description: 'text with multiple newlines' },
      { input: 'path\\to\\file', description: 'text with backslashes' },
      { input: 'has\\nnewline-like sequence', description: 'literal backslash-n' },
      { input: 'trailing backslash\\', description: 'trailing backslash' },
      { input: 'double\\\\backslash', description: 'double backslash' },
      { input: 'mixed\n\\path\\with\nnewlines', description: 'mixed newlines and backslashes' },
      { input: 'unicode: \u00e9\u00e8\u00ea \u{1f600}', description: 'unicode characters' },
    ];

    for (const { input, description } of testCases) {
      it(`round-trips: ${description}`, () => {
        const encoded = PromptHistory.encode(input);
        const decoded = PromptHistory.decode(encoded);
        expect(decoded).toBe(input);
      });
    }

    it('encode escapes backslashes before newlines', () => {
      expect(PromptHistory.encode('a\\b')).toBe('a\\\\b');
      expect(PromptHistory.encode('a\nb')).toBe('a\\nb');
      expect(PromptHistory.encode('a\\nb')).toBe('a\\\\nb');
    });

    it('decode handles unknown escape sequences literally', () => {
      // \t is not a recognized escape -- preserve the backslash
      expect(PromptHistory.decode('a\\tb')).toBe('a\\tb');
    });

    it('decode handles trailing backslash', () => {
      expect(PromptHistory.decode('hello\\')).toBe('hello\\');
    });
  });

  // --------------------------------------------------------------------------
  // 10. Disk persistence
  // --------------------------------------------------------------------------

  describe('persistence', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'history-test-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('saves entries to disk on push', () => {
      const filePath = join(tmpDir, 'history');
      const h = new PromptHistory(100, filePath);
      h.push('first prompt');
      h.push('second prompt');

      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('first prompt\nsecond prompt\n');
    });

    it('loads entries from disk on construction', () => {
      const filePath = join(tmpDir, 'history');
      writeFileSync(filePath, 'alpha\nbeta\ngamma\n', 'utf-8');

      const h = new PromptHistory(100, filePath);
      expect(h.length).toBe(3);
      expect(h.previous()).toBe('gamma');
      expect(h.previous()).toBe('beta');
      expect(h.previous()).toBe('alpha');
    });

    it('truncates loaded entries to maxSize, keeping the most recent', () => {
      const filePath = join(tmpDir, 'history');
      const lines = Array.from({ length: 200 }, (_, i) => `entry-${i}`);
      writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');

      const h = new PromptHistory(50, filePath);
      expect(h.length).toBe(50);
      // Should keep the last 50: entry-150 through entry-199
      expect(h.previous()).toBe('entry-199');
    });

    it('handles missing file gracefully', () => {
      const filePath = join(tmpDir, 'nonexistent');
      const h = new PromptHistory(100, filePath);
      expect(h.length).toBe(0);
    });

    it('creates parent directories on first save', () => {
      const filePath = join(tmpDir, 'nested', 'dir', 'history');
      const h = new PromptHistory(100, filePath);
      h.push('test');

      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('test\n');
    });

    it('handles entries with embedded newlines', () => {
      const filePath = join(tmpDir, 'history');
      const h1 = new PromptHistory(100, filePath);
      h1.push('line1\nline2');
      h1.push('simple');

      const raw = readFileSync(filePath, 'utf-8');
      expect(raw).toBe('line1\\nline2\nsimple\n');

      // Load in a new instance
      const h2 = new PromptHistory(100, filePath);
      expect(h2.length).toBe(2);
      expect(h2.previous()).toBe('simple');
      expect(h2.previous()).toBe('line1\nline2');
    });

    it('handles entries with literal backslashes', () => {
      const filePath = join(tmpDir, 'history');
      const h1 = new PromptHistory(100, filePath);
      h1.push('path\\to\\file');
      h1.save();

      const raw = readFileSync(filePath, 'utf-8');
      expect(raw).toBe('path\\\\to\\\\file\n');

      const h2 = new PromptHistory(100, filePath);
      expect(h2.previous()).toBe('path\\to\\file');
    });

    it('handles entries with literal backslash-n sequence', () => {
      const filePath = join(tmpDir, 'history');
      const h1 = new PromptHistory(100, filePath);
      // The string contains a literal backslash followed by 'n' (not a newline)
      h1.push('echo "hello\\nworld"');
      h1.save();

      const raw = readFileSync(filePath, 'utf-8');
      // The backslash is escaped to \\, so \\n on disk is literal, not a newline escape
      expect(raw).toBe('echo "hello\\\\nworld"\n');

      const h2 = new PromptHistory(100, filePath);
      expect(h2.previous()).toBe('echo "hello\\nworld"');
    });

    it('rewrites file when entries are evicted', () => {
      const filePath = join(tmpDir, 'history');
      const h = new PromptHistory(3, filePath);
      h.push('a');
      h.push('b');
      h.push('c');
      // File should have 3 lines via appends
      expect(readFileSync(filePath, 'utf-8')).toBe('a\nb\nc\n');

      h.push('d'); // Evicts 'a', triggers full rewrite
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('b\nc\nd\n');
    });

    it('save() writes current state regardless of needsFullRewrite', () => {
      const filePath = join(tmpDir, 'history');
      const h = new PromptHistory(100, filePath);
      h.push('one');
      h.push('two');

      // Corrupt the file externally
      writeFileSync(filePath, 'garbage\n', 'utf-8');

      // Explicit save restores correct state
      h.save();
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('one\ntwo\n');
    });

    it('deduplicates consecutive identical entries (no duplicate on disk)', () => {
      const filePath = join(tmpDir, 'history');
      const h = new PromptHistory(100, filePath);
      h.push('same');
      h.push('same');
      h.push('same');

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('same\n');
    });

    it('works without filePath (pure in-memory mode)', () => {
      const h = new PromptHistory(100);
      h.push('ephemeral');
      expect(h.length).toBe(1);
      h.save(); // Should be a no-op, not throw
    });

    it('persists across simulated sessions', () => {
      const filePath = join(tmpDir, 'history');

      // Session 1
      const s1 = new PromptHistory(100, filePath);
      s1.push('fix the bug');
      s1.push('add tests');
      s1.save();

      // Session 2
      const s2 = new PromptHistory(100, filePath);
      expect(s2.length).toBe(2);
      expect(s2.previous()).toBe('add tests');
      expect(s2.previous()).toBe('fix the bug');

      // Add more in session 2
      s2.push('deploy');
      s2.save();

      // Session 3
      const s3 = new PromptHistory(100, filePath);
      expect(s3.length).toBe(3);
      expect(s3.previous()).toBe('deploy');
      expect(s3.previous()).toBe('add tests');
      expect(s3.previous()).toBe('fix the bug');
    });

    it('ignores empty lines in the file', () => {
      const filePath = join(tmpDir, 'history');
      // Simulate a file with blank lines (e.g., from manual editing)
      writeFileSync(filePath, 'alpha\n\nbeta\n\n\ngamma\n', 'utf-8');

      const h = new PromptHistory(100, filePath);
      expect(h.length).toBe(3);
      expect(h.previous()).toBe('gamma');
      expect(h.previous()).toBe('beta');
      expect(h.previous()).toBe('alpha');
    });

    it('handles empty file (0 bytes)', () => {
      const filePath = join(tmpDir, 'history');
      writeFileSync(filePath, '', 'utf-8');

      const h = new PromptHistory(100, filePath);
      expect(h.length).toBe(0);
    });

    it('respects custom maxSize from config', () => {
      const filePath = join(tmpDir, 'history');
      const h = new PromptHistory(5, filePath);
      for (let i = 0; i < 10; i++) {
        h.push(`entry-${i}`);
      }
      // Only last 5 should remain: entry-5 through entry-9
      const entries: string[] = [];
      let prev = h.previous();
      while (prev !== null) {
        entries.push(prev);
        prev = h.previous();
      }
      expect(entries).toEqual(['entry-9', 'entry-8', 'entry-7', 'entry-6', 'entry-5']);

      // File should also only contain the last 5
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.length > 0);
      expect(lines).toEqual(['entry-5', 'entry-6', 'entry-7', 'entry-8', 'entry-9']);
    });
  });

  // --------------------------------------------------------------------------
  // 11. isAtReset and length getters
  // --------------------------------------------------------------------------

  describe('isAtReset and length', () => {
    it('isAtReset is true initially', () => {
      const h = new PromptHistory();
      expect(h.isAtReset).toBe(true);
    });

    it('isAtReset becomes false after previous()', () => {
      const h = new PromptHistory();
      h.push('a');
      h.previous();
      expect(h.isAtReset).toBe(false);
    });

    it('isAtReset becomes true after resetCursor()', () => {
      const h = new PromptHistory();
      h.push('a');
      h.previous();
      h.resetCursor();
      expect(h.isAtReset).toBe(true);
    });

    it('length reflects the number of entries', () => {
      const h = new PromptHistory(5);
      expect(h.length).toBe(0);
      h.push('a');
      expect(h.length).toBe(1);
      h.push('b');
      h.push('c');
      expect(h.length).toBe(3);
    });

    it('length respects maxSize after eviction', () => {
      const h = new PromptHistory(3);
      h.push('a');
      h.push('b');
      h.push('c');
      h.push('d');
      expect(h.length).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // 12. searchBackward() (Gap 64)
  // --------------------------------------------------------------------------

  describe('searchBackward', () => {
    it('returns null on empty history', () => {
      const h = new PromptHistory();
      expect(h.searchBackward('test')).toBeNull();
    });

    it('returns null for empty query', () => {
      const h = new PromptHistory();
      h.push('hello');
      expect(h.searchBackward('')).toBeNull();
    });

    it('finds the newest matching entry by default', () => {
      const h = new PromptHistory();
      h.push('fix bug in parser');      // index 0
      h.push('add new feature');        // index 1
      h.push('fix typo in readme');     // index 2
      const result = h.searchBackward('fix');
      expect(result).toEqual({ index: 2, entry: 'fix typo in readme' });
    });

    it('finds match starting from a specific index', () => {
      const h = new PromptHistory();
      h.push('fix bug in parser');      // index 0
      h.push('add new feature');        // index 1
      h.push('fix typo in readme');     // index 2
      const result = h.searchBackward('fix', 1);
      expect(result).toEqual({ index: 0, entry: 'fix bug in parser' });
    });

    it('is case-insensitive', () => {
      const h = new PromptHistory();
      h.push('Fix Bug');
      const result = h.searchBackward('fix bug');
      expect(result).toEqual({ index: 0, entry: 'Fix Bug' });
    });

    it('returns null when no entry matches', () => {
      const h = new PromptHistory();
      h.push('hello');
      h.push('world');
      expect(h.searchBackward('xyz')).toBeNull();
    });

    it('matches substring anywhere in entry', () => {
      const h = new PromptHistory();
      h.push('the quick brown fox');
      const result = h.searchBackward('brown');
      expect(result).toEqual({ index: 0, entry: 'the quick brown fox' });
    });

    it('clamps fromIndex to valid range (too high)', () => {
      const h = new PromptHistory();
      h.push('entry');
      const result = h.searchBackward('entry', 999);
      expect(result).toEqual({ index: 0, entry: 'entry' });
    });

    it('returns null for negative fromIndex (nothing before index 0)', () => {
      const h = new PromptHistory();
      h.push('entry');
      const result = h.searchBackward('entry', -1);
      // fromIndex < 0 means no entries to search
      expect(result).toBeNull();
    });

    it('does not modify the linear cursor', () => {
      const h = new PromptHistory();
      h.push('a');
      h.push('b');
      h.searchBackward('a');
      expect(h.isAtReset).toBe(true);
      expect(h.previous()).toBe('b');
    });

    it('cycles through multiple matches when called with decreasing fromIndex', () => {
      const h = new PromptHistory();
      h.push('fix alpha');    // 0
      h.push('add beta');     // 1
      h.push('fix gamma');    // 2
      h.push('add delta');    // 3
      h.push('fix epsilon');  // 4

      const r1 = h.searchBackward('fix');
      expect(r1).toEqual({ index: 4, entry: 'fix epsilon' });

      const r2 = h.searchBackward('fix', r1!.index - 1);
      expect(r2).toEqual({ index: 2, entry: 'fix gamma' });

      const r3 = h.searchBackward('fix', r2!.index - 1);
      expect(r3).toEqual({ index: 0, entry: 'fix alpha' });

      const r4 = h.searchBackward('fix', r3!.index - 1);
      expect(r4).toBeNull();
    });

    it('handles fromIndex of 0 correctly', () => {
      const h = new PromptHistory();
      h.push('match');
      h.push('no match');
      const result = h.searchBackward('match', 0);
      expect(result).toEqual({ index: 0, entry: 'match' });
    });

    it('returns null when fromIndex is 0 and entry does not match', () => {
      const h = new PromptHistory();
      h.push('no');
      h.push('match');
      const result = h.searchBackward('match', 0);
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 13. searchForward() (Gap 64)
  // --------------------------------------------------------------------------

  describe('searchForward', () => {
    it('returns null on empty history', () => {
      const h = new PromptHistory();
      expect(h.searchForward('test')).toBeNull();
    });

    it('returns null for empty query', () => {
      const h = new PromptHistory();
      h.push('hello');
      expect(h.searchForward('')).toBeNull();
    });

    it('finds the oldest matching entry by default', () => {
      const h = new PromptHistory();
      h.push('fix alpha');   // 0
      h.push('add beta');    // 1
      h.push('fix gamma');   // 2
      const result = h.searchForward('fix');
      expect(result).toEqual({ index: 0, entry: 'fix alpha' });
    });

    it('finds match starting from a specific index', () => {
      const h = new PromptHistory();
      h.push('fix alpha');   // 0
      h.push('add beta');    // 1
      h.push('fix gamma');   // 2
      const result = h.searchForward('fix', 1);
      expect(result).toEqual({ index: 2, entry: 'fix gamma' });
    });

    it('is case-insensitive', () => {
      const h = new PromptHistory();
      h.push('HELLO WORLD');
      const result = h.searchForward('hello');
      expect(result).toEqual({ index: 0, entry: 'HELLO WORLD' });
    });

    it('returns null when no entry matches', () => {
      const h = new PromptHistory();
      h.push('hello');
      expect(h.searchForward('xyz')).toBeNull();
    });

    it('cycles forward through matches', () => {
      const h = new PromptHistory();
      h.push('fix alpha');
      h.push('fix beta');
      h.push('fix gamma');

      const r1 = h.searchForward('fix', 0);
      expect(r1).toEqual({ index: 0, entry: 'fix alpha' });

      const r2 = h.searchForward('fix', r1!.index + 1);
      expect(r2).toEqual({ index: 1, entry: 'fix beta' });

      const r3 = h.searchForward('fix', r2!.index + 1);
      expect(r3).toEqual({ index: 2, entry: 'fix gamma' });

      const r4 = h.searchForward('fix', r3!.index + 1);
      expect(r4).toBeNull();
    });

    it('does not modify the linear cursor', () => {
      const h = new PromptHistory();
      h.push('a');
      h.push('b');
      h.searchForward('b');
      expect(h.isAtReset).toBe(true);
      expect(h.previous()).toBe('b');
    });

    it('clamps negative fromIndex to 0', () => {
      const h = new PromptHistory();
      h.push('match');
      const result = h.searchForward('match', -5);
      expect(result).toEqual({ index: 0, entry: 'match' });
    });

    it('returns null when fromIndex is past the end', () => {
      const h = new PromptHistory();
      h.push('match');
      const result = h.searchForward('match', 999);
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 14. searchBackward + searchForward interaction (Gap 64)
  // --------------------------------------------------------------------------

  describe('search backward + forward combined', () => {
    it('can cycle backward then forward through matches', () => {
      const h = new PromptHistory();
      h.push('fix alpha');   // 0
      h.push('add beta');    // 1
      h.push('fix gamma');   // 2
      h.push('add delta');   // 3
      h.push('fix epsilon'); // 4

      // Search backward from newest
      const r1 = h.searchBackward('fix');
      expect(r1!.index).toBe(4);

      const r2 = h.searchBackward('fix', r1!.index - 1);
      expect(r2!.index).toBe(2);

      // Now search forward from that point
      const r3 = h.searchForward('fix', r2!.index + 1);
      expect(r3!.index).toBe(4);
    });

    it('search does not affect linear navigation', () => {
      const h = new PromptHistory();
      h.push('first');
      h.push('second');
      h.push('third');

      // Perform a search
      h.searchBackward('first');
      h.searchForward('third');

      // Linear cursor should still be at reset
      expect(h.isAtReset).toBe(true);
      expect(h.previous()).toBe('third');
      expect(h.previous()).toBe('second');
    });

    it('matches with spaces in query', () => {
      const h = new PromptHistory();
      h.push('git commit -m "fix bug"');
      h.push('git push origin main');
      const result = h.searchBackward('git push');
      expect(result).toEqual({ index: 1, entry: 'git push origin main' });
    });
  });
});
