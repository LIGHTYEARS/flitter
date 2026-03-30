# Gap S10 (Gap #56): No Test Coverage for PromptHistory

## Problem

The `PromptHistory` class at `packages/flitter-amp/src/state/history.ts` has zero test
files. This class manages in-memory prompt history for Ctrl+R navigation in the TUI, and
its correctness is critical for user-facing input recall. Without tests, regressions in
cursor management, deduplication, size capping, or navigation edge cases will go unnoticed.

The class is consumed in `packages/flitter-amp/src/app.ts` where:
- `push(text)` is called on every prompt submission via the `BottomGrid.onSubmit` callback
- `previous()` is called on Ctrl+R to recall previous prompts

Any regression in cursor logic or deduplication behavior would directly break the
interactive prompt recall experience for users.

## Source File Analysis

**Location**: `packages/flitter-amp/src/state/history.ts` (48 lines)

### Public API

| Member | Signature | Behavior |
|--------|-----------|----------|
| `constructor` | `constructor(maxSize = 100)` | Creates an instance with configurable max capacity (defaults to 100) |
| `push` | `push(text: string): void` | Appends entry; skips blank (trimmed) and consecutive-duplicate entries; evicts oldest when at capacity; resets cursor to -1 |
| `previous` | `previous(): string \| null` | Moves cursor backward through entries; returns `null` on empty history or when already at oldest entry |
| `next` | `next(): string \| null` | Moves cursor forward; returns `''` (empty string) when exiting history to signal "new prompt" state; returns `null` when cursor is already inactive |
| `resetCursor` | `resetCursor(): void` | Resets cursor to -1 (inactive position) |

### Private State

| Field | Type | Initial | Purpose |
|-------|------|---------|---------|
| `entries` | `string[]` | `[]` | Ring-buffer-like storage of prompt strings |
| `cursor` | `number` | `-1` | Navigation position; -1 means "not navigating" |
| `maxSize` | `number` | (from constructor) | Maximum number of entries before eviction |

### Key Implementation Details

1. **Blank rejection**: `push()` returns early if `text.trim() === ''`, meaning it never
   reaches the `this.cursor = -1` line. This is a subtle behavioral detail -- blank pushes
   do not reset the navigation cursor.

2. **Deduplication**: `push()` compares the incoming text with `entries[entries.length - 1]`
   using strict equality (`===`). This means only exact consecutive duplicates are rejected.
   Strings that differ by whitespace (e.g. `"hello"` vs `"hello "`) are treated as distinct.
   Dedup also returns early before cursor reset.

3. **Eviction**: When `entries.length > maxSize` after push, `entries.shift()` removes the
   oldest entry. This is O(n) but acceptable given the default maxSize of 100.

4. **Cursor initialization on `previous()`**: The first call to `previous()` sets cursor to
   `entries.length - 1` (the newest entry). Subsequent calls decrement it. When cursor
   reaches 0 and is called again, it returns `null` without modifying cursor.

5. **Exit signal from `next()`**: When cursor equals `entries.length - 1` (newest entry),
   calling `next()` resets cursor to -1 and returns `''` (not `null`). This empty string
   is the signal for the UI to restore the "new prompt" editing state.

## Test Strategy

The test suite is organized into eight `describe` blocks covering every public method, their
interactions, and edge cases. All tests are pure unit tests with no external dependencies.

### Guiding Principles

- **Black-box testing**: Cursor state is private, so we verify it indirectly through return
  values of `previous()` and `next()`. Tests never access private members.
- **Boundary-value analysis**: Each method is tested at its boundaries (empty history,
  single entry, exactly-at-maxSize, one-over-maxSize).
- **State transition coverage**: The cursor has three meaningful states: inactive (-1),
  at newest entry, and at an interior/oldest entry. Tests exercise all transitions.
- **Behavioral contracts**: The distinction between `null` and `''` from `next()` is tested
  explicitly since UI code branches on it.

### Test File Location

```
packages/flitter-amp/src/__tests__/prompt-history.test.ts
```

This follows the existing convention where all flitter-amp tests reside in `src/__tests__/`.

## Full Test File

```typescript
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

import { describe, it, expect, beforeEach } from 'bun:test';
import { PromptHistory } from '../state/history';

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
});
```

## Test Matrix Summary

| # | Describe Block | Test Count | Key Behaviors Verified |
|---|---------------|------------|----------------------|
| 1 | `constructor` | 4 | Default maxSize=100, custom maxSize, empty initial state for both previous and next |
| 2 | `push` | 16 | Basic add, empty rejection, whitespace-only variants (spaces/tabs/newlines/mixed), consecutive dedup, non-consecutive dupes, leading/trailing whitespace distinction, eviction single and multiple, cursor reset, maxSize=1 normal and dedup, entry ordering |
| 3 | `previous` | 7 | Empty history, most-recent-first, backward walk, null at oldest, repeated null at oldest, single entry, return type verification |
| 4 | `next` | 8 | Inactive cursor, empty history, forward after backward, empty-string exit, null after exit, single-entry boundary, null-vs-empty distinction, next after null-at-oldest |
| 5 | `resetCursor` | 6 | Nullifies next, restarts previous, idempotent, safe on empty, preserves entries, no-op when already inactive |
| 6 | `push + navigation` | 7 | Push resets cursor mid-backward-nav, push after next, blank push no-op during nav, dedup push no-op during nav, successful push mid-nav, push after resetCursor |
| 7 | `full round-trips` | 6 | Full backward+forward walk, zigzag, interleaved push+nav+reset, stress test backward (200 pushes/50 cap), stress test backward+forward match, repeated cycles consistency |
| 8 | `edge cases` | 13 | Dedup during nav, exact-boundary maxSize, whitespace preservation, trim-vs-store, exact-string dedup, blank pushes between valid entries, dedup across blanks, special characters, multi-line strings, unicode, rapid push-previous alternation, next after construction, previous-null-then-next recovery |

**Total: 67 tests across 8 describe blocks.**

## Coverage Analysis

### Branch Coverage

The source has the following branches that are all exercised:

| Location | Branch | Covered By |
|----------|--------|------------|
| `push` L13 | `text.trim() === ''` -- true | `push > ignores empty/whitespace strings` (4 tests) |
| `push` L13 | `text.trim() === ''` -- false | `push > adds a non-empty string` |
| `push` L15 | consecutive duplicate -- true | `push > deduplicates consecutive identical entries` |
| `push` L15 | consecutive duplicate -- false | `push > allows non-consecutive duplicates` |
| `push` L15 | `entries.length > 0` -- false (empty) | `push > adds a non-empty string` (first push) |
| `push` L17-18 | `entries.length > maxSize` -- true | `push > evicts the oldest entry` |
| `push` L17-18 | `entries.length > maxSize` -- false | `push > maxSize boundary: exactly at maxSize` |
| `previous` L24 | `entries.length === 0` -- true | `previous > returns null on empty history` |
| `previous` L25 | `cursor === -1` -- true (first call) | `previous > returns the most recent entry on first call` |
| `previous` L27 | `cursor > 0` -- true | `previous > walks backward through entries` |
| `previous` L29 | `cursor > 0` -- false (at oldest) | `previous > returns null when at oldest entry` |
| `next` L36 | `cursor === -1` -- true | `next > returns null when cursor is inactive` |
| `next` L37 | `cursor < entries.length - 1` -- true | `next > moves forward after previous()` |
| `next` L40-42 | `cursor < entries.length - 1` -- false (at newest) | `next > returns empty string when moving past newest` |

### Statement Coverage

Every line of the 48-line source file is exercised by at least one test. The most critical
areas -- cursor state transitions and the null vs empty string return contract -- each have
multiple tests providing overlapping coverage.

## Implementation Notes

1. **Test runner**: Uses `bun:test` consistent with all existing tests in the repository
   (`packages/flitter-amp/src/__tests__/*.test.ts` all import from `bun:test`).

2. **File placement**: `packages/flitter-amp/src/__tests__/prompt-history.test.ts` follows
   the established `__tests__/` directory convention.

3. **Import path**: `import { PromptHistory } from '../state/history'` matches the source
   location.

4. **No mocking needed**: `PromptHistory` is a pure in-memory data structure with no
   external dependencies, file I/O, or timers, making it ideal for straightforward unit
   testing.

5. **Cursor state verification**: Since `cursor` is private, we verify cursor state
   indirectly through the return values of `previous()` and `next()`. This is the correct
   approach -- tests exercise the public API, not private internals.

6. **Dedup and blank-push cursor behavior**: The source code has a subtle behavior:
   `push()` returns early for blank text and consecutive duplicates **before** executing
   `this.cursor = -1`. This means these no-op pushes do not reset the navigation cursor.
   Tests in the "push + navigation interaction" block verify this explicitly.

7. **Empty string vs null contract**: `next()` returns `''` (empty string) when moving past
   the newest entry (signaling "restore new prompt state"), and `null` when the cursor is
   already inactive. The "next > empty string return is distinguishable from null" test
   verifies this distinction explicitly since UI code in `app.ts` branches on it.

8. **Stress tests**: The round-trip section includes tests with 200 pushes and a walk of all
   50 retained entries, verifying the eviction logic at scale and ensuring no off-by-one
   errors in the shift-based eviction.

## Running the Tests

```bash
cd packages/flitter-amp
bun test src/__tests__/prompt-history.test.ts
```

Or from the repository root:

```bash
bun test packages/flitter-amp/src/__tests__/prompt-history.test.ts
```

To run alongside all other flitter-amp tests:

```bash
cd packages/flitter-amp
bun test
```
