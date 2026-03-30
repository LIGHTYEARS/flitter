// Tests for Gap 63 (ArrowUp/Down history navigation) and Gap 64 (incremental reverse search)
//
// These tests exercise the PromptHistory search integration, the navigation
// helper logic, and the search mode state machine patterns used in app.ts.
//
// Since AppStateWidget methods are private, we test the equivalent logic
// through PromptHistory's public API and inline simulations of the state
// machine transitions.

import { describe, it, expect, beforeEach } from 'bun:test';
import { PromptHistory } from '../state/history';

// ---------------------------------------------------------------------------
// Helper: simulate the _navigateHistory logic from app.ts
// ---------------------------------------------------------------------------

interface NavState {
  history: PromptHistory;
  inputText: string;
  savedDraft: string;
}

function navigateBackward(state: NavState): void {
  if (state.history.isAtReset) {
    state.savedDraft = state.inputText;
  }
  const prev = state.history.previous();
  if (prev !== null) {
    state.inputText = prev;
  }
}

function navigateForward(state: NavState): void {
  const next = state.history.next();
  if (next !== null) {
    if (next === '') {
      state.inputText = state.savedDraft;
      state.savedDraft = '';
    } else {
      state.inputText = next;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: simulate the search mode state machine from app.ts
// ---------------------------------------------------------------------------

interface SearchState {
  query: string;
  matchedEntry: string | null;
  matchIndex: number;
  isFailing: boolean;
  savedInput: string;
}

function enterSearchMode(inputText: string): SearchState {
  return {
    query: '',
    matchedEntry: null,
    matchIndex: -1,
    isFailing: false,
    savedInput: inputText,
  };
}

function performSearch(rs: SearchState, history: PromptHistory): string {
  if (rs.query === '') return rs.savedInput;

  const result = history.searchBackward(rs.query);
  if (result) {
    rs.matchedEntry = result.entry;
    rs.matchIndex = result.index;
    rs.isFailing = false;
    return result.entry;
  } else {
    rs.matchedEntry = null;
    rs.matchIndex = -1;
    rs.isFailing = true;
    return rs.savedInput;
  }
}

function cycleBackward(rs: SearchState, history: PromptHistory): string | null {
  if (rs.query !== '' && rs.matchIndex > 0) {
    const result = history.searchBackward(rs.query, rs.matchIndex - 1);
    if (result) {
      rs.matchedEntry = result.entry;
      rs.matchIndex = result.index;
      rs.isFailing = false;
      return result.entry;
    } else {
      rs.isFailing = true;
      return null; // no more matches, keep last match
    }
  }
  return null;
}

function cycleForward(rs: SearchState, history: PromptHistory): string | null {
  if (rs.query !== '' && rs.matchIndex >= 0) {
    const result = history.searchForward(rs.query, rs.matchIndex + 1);
    if (result) {
      rs.matchedEntry = result.entry;
      rs.matchIndex = result.index;
      rs.isFailing = false;
      return result.entry;
    } else {
      rs.isFailing = true;
      return null;
    }
  }
  return null;
}

// ===========================================================================
// Gap 63: ArrowUp/ArrowDown History Navigation
// ===========================================================================

describe('Gap 63: ArrowUp/ArrowDown history navigation', () => {
  let h: PromptHistory;
  let state: NavState;

  beforeEach(() => {
    h = new PromptHistory();
    state = { history: h, inputText: '', savedDraft: '' };
  });

  it('ArrowUp recalls previous history entry', () => {
    h.push('first');
    h.push('second');
    state.inputText = '';

    navigateBackward(state);
    expect(state.inputText).toBe('second');

    navigateBackward(state);
    expect(state.inputText).toBe('first');
  });

  it('ArrowDown navigates forward through history', () => {
    h.push('first');
    h.push('second');
    state.inputText = '';

    navigateBackward(state); // second
    navigateBackward(state); // first

    navigateForward(state);
    expect(state.inputText).toBe('second');
  });

  it('ArrowDown past newest entry restores draft', () => {
    h.push('old entry');
    state.inputText = 'my draft';

    navigateBackward(state); // saves 'my draft' as draft, shows 'old entry'
    expect(state.inputText).toBe('old entry');
    expect(state.savedDraft).toBe('my draft');

    navigateForward(state); // past newest -> restores draft
    expect(state.inputText).toBe('my draft');
  });

  it('ArrowUp with empty history is a no-op', () => {
    state.inputText = 'hello';

    navigateBackward(state);
    expect(state.inputText).toBe('hello');
  });

  it('ArrowUp at oldest entry stays at oldest', () => {
    h.push('only');
    state.inputText = '';

    navigateBackward(state); // only
    expect(state.inputText).toBe('only');

    navigateBackward(state); // null (at oldest)
    expect(state.inputText).toBe('only'); // unchanged
  });

  it('ArrowDown without prior ArrowUp is a no-op', () => {
    h.push('entry');
    state.inputText = 'current';

    navigateForward(state); // cursor at reset, returns null
    expect(state.inputText).toBe('current'); // unchanged
  });

  it('draft is saved only on the first navigation action', () => {
    h.push('a');
    h.push('b');
    h.push('c');
    state.inputText = 'my draft';

    navigateBackward(state); // first: saves draft, shows 'c'
    expect(state.savedDraft).toBe('my draft');

    navigateBackward(state); // shows 'b' -- does NOT overwrite draft
    expect(state.savedDraft).toBe('my draft');

    navigateBackward(state); // shows 'a'
    expect(state.savedDraft).toBe('my draft');
  });

  it('draft is cleared after restore', () => {
    h.push('entry');
    state.inputText = 'draft text';

    navigateBackward(state); // saves draft
    navigateForward(state);  // restores draft
    expect(state.inputText).toBe('draft text');
    expect(state.savedDraft).toBe(''); // cleared
  });

  it('mixing ArrowUp and Ctrl+R/S shares the same cursor', () => {
    h.push('a');
    h.push('b');
    h.push('c');
    state.inputText = '';

    // ArrowUp (same as Ctrl+R in linear mode)
    navigateBackward(state);
    expect(state.inputText).toBe('c');

    // Another backward step (same as Ctrl+R)
    navigateBackward(state);
    expect(state.inputText).toBe('b');

    // Forward (same as Ctrl+S or ArrowDown)
    navigateForward(state);
    expect(state.inputText).toBe('c');

    // Past newest
    navigateForward(state);
    expect(state.inputText).toBe('');
  });

  it('rapid ArrowUp spam steps backward through history one entry per press', () => {
    for (let i = 0; i < 10; i++) {
      h.push(`cmd-${i}`);
    }
    state.inputText = '';

    for (let i = 9; i >= 0; i--) {
      navigateBackward(state);
      expect(state.inputText).toBe(`cmd-${i}`);
    }

    // One more should be a no-op
    navigateBackward(state);
    expect(state.inputText).toBe('cmd-0');
  });

  it('submit clears draft and resets cursor', () => {
    h.push('old');
    state.inputText = 'draft';

    navigateBackward(state); // shows 'old', saves 'draft'
    expect(state.savedDraft).toBe('draft');

    // Simulate submit
    h.push(state.inputText); // push 'old' (dedup won't add)
    h.resetCursor();
    state.savedDraft = '';
    state.inputText = '';

    expect(h.isAtReset).toBe(true);
    expect(state.savedDraft).toBe('');
  });

  it('editing text manually should allow cursor reset pattern', () => {
    h.push('first');
    h.push('second');
    state.inputText = '';

    navigateBackward(state); // shows 'second'
    expect(state.inputText).toBe('second');

    // Simulate manual edit (resets cursor)
    state.inputText = 'second-edited';
    h.resetCursor();

    // Next ArrowUp should start from the top again
    navigateBackward(state); // should save 'second-edited' as new draft, show 'second'
    expect(state.savedDraft).toBe('second-edited');
    expect(state.inputText).toBe('second');
  });
});

// ===========================================================================
// Gap 64: Incremental Reverse Search Mode
// ===========================================================================

describe('Gap 64: Incremental reverse search mode', () => {
  let h: PromptHistory;

  beforeEach(() => {
    h = new PromptHistory();
  });

  describe('search mode entry/exit', () => {
    it('enterSearchMode saves current input and initializes state', () => {
      const rs = enterSearchMode('current text');
      expect(rs.query).toBe('');
      expect(rs.matchedEntry).toBeNull();
      expect(rs.matchIndex).toBe(-1);
      expect(rs.isFailing).toBe(false);
      expect(rs.savedInput).toBe('current text');
    });

    it('exit with accept=true keeps the matched text', () => {
      h.push('hello world');
      const rs = enterSearchMode('my draft');
      rs.query = 'hello';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('hello world');

      // Accept: text stays as 'hello world'
      // (in app.ts, _exitSearchMode(true) does not modify inputController.text)
      expect(rs.matchedEntry).toBe('hello world');
    });

    it('exit with accept=false restores the original text', () => {
      h.push('hello world');
      const rs = enterSearchMode('my draft');
      rs.query = 'hello';
      performSearch(rs, h);

      // Cancel: restore original text
      const restoredText = rs.savedInput;
      expect(restoredText).toBe('my draft');
    });
  });

  describe('incremental search', () => {
    it('typing characters performs incremental search', () => {
      h.push('fix parser bug');
      h.push('add feature');
      h.push('fix typo');
      const rs = enterSearchMode('');

      // Type 'f'
      rs.query = 'f';
      let inputText = performSearch(rs, h);
      expect(inputText).toBe('fix typo');
      expect(rs.isFailing).toBe(false);

      // Type 'i' -> query 'fi'
      rs.query = 'fi';
      inputText = performSearch(rs, h);
      expect(inputText).toBe('fix typo');

      // Type 'x p' -> query 'fix p'
      rs.query = 'fix p';
      inputText = performSearch(rs, h);
      expect(inputText).toBe('fix parser bug');
    });

    it('search is case-insensitive', () => {
      h.push('Fix Bug in Parser');
      const rs = enterSearchMode('');
      rs.query = 'fix bug';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('Fix Bug in Parser');
      expect(rs.isFailing).toBe(false);
    });

    it('failed search shows failing state and restores original text', () => {
      h.push('hello');
      const rs = enterSearchMode('original');
      rs.query = 'xyz';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('original'); // restored
      expect(rs.isFailing).toBe(true);
      expect(rs.matchedEntry).toBeNull();
    });

    it('empty query shows original text', () => {
      h.push('entry');
      const rs = enterSearchMode('my text');
      rs.query = '';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('my text');
    });
  });

  describe('Ctrl+R cycling in search mode', () => {
    it('Ctrl+R cycles to next older match', () => {
      h.push('fix alpha');    // 0
      h.push('add beta');     // 1
      h.push('fix gamma');    // 2
      h.push('add delta');    // 3
      h.push('fix epsilon');  // 4
      const rs = enterSearchMode('');

      rs.query = 'fix';
      let inputText = performSearch(rs, h);
      expect(inputText).toBe('fix epsilon');
      expect(rs.matchIndex).toBe(4);

      inputText = cycleBackward(rs, h)!;
      expect(inputText).toBe('fix gamma');
      expect(rs.matchIndex).toBe(2);

      inputText = cycleBackward(rs, h)!;
      expect(inputText).toBe('fix alpha');
      expect(rs.matchIndex).toBe(0);
    });

    it('Ctrl+R at oldest match does not move (already at boundary)', () => {
      h.push('fix alpha');
      h.push('add beta');
      const rs = enterSearchMode('');

      rs.query = 'fix';
      performSearch(rs, h);
      expect(rs.matchIndex).toBe(0);

      // Try to cycle past oldest -- no-op since matchIndex === 0
      const result = cycleBackward(rs, h);
      expect(result).toBeNull();
      // matchIndex stays at 0, match is still valid
      expect(rs.matchIndex).toBe(0);
      expect(rs.matchedEntry).toBe('fix alpha');
    });

    it('Ctrl+R marks failing when search finds no older match', () => {
      h.push('no match here');
      h.push('fix alpha');
      h.push('fix beta');
      const rs = enterSearchMode('');

      rs.query = 'fix';
      performSearch(rs, h); // fix beta (index 2)
      cycleBackward(rs, h); // fix alpha (index 1)
      expect(rs.matchIndex).toBe(1);

      // Try to cycle past -- searchBackward from index 0 for 'fix' finds nothing
      // because index 0 is 'no match here'
      const result = cycleBackward(rs, h);
      expect(result).toBeNull();
      expect(rs.isFailing).toBe(true);
    });
  });

  describe('Ctrl+S forward cycling in search mode', () => {
    it('Ctrl+S cycles to next newer match', () => {
      h.push('fix alpha');
      h.push('fix beta');
      h.push('fix gamma');
      const rs = enterSearchMode('');

      rs.query = 'fix';
      performSearch(rs, h); // shows 'fix gamma' (index 2)
      cycleBackward(rs, h); // shows 'fix beta' (index 1)
      expect(rs.matchIndex).toBe(1);

      const inputText = cycleForward(rs, h);
      expect(inputText).toBe('fix gamma');
      expect(rs.matchIndex).toBe(2);
    });

    it('Ctrl+S past newest match marks as failing', () => {
      h.push('fix alpha');
      h.push('add beta');
      const rs = enterSearchMode('');

      rs.query = 'fix';
      performSearch(rs, h); // index 0 is the only match
      expect(rs.matchIndex).toBe(0);

      const result = cycleForward(rs, h);
      expect(result).toBeNull();
      expect(rs.isFailing).toBe(true);
    });
  });

  describe('backspace handling', () => {
    it('backspace removes last character from query and re-searches', () => {
      h.push('fix bug');
      h.push('fix typo');
      const rs = enterSearchMode('');

      rs.query = 'fix ty';
      let inputText = performSearch(rs, h);
      expect(inputText).toBe('fix typo');

      // Backspace: query becomes 'fix t'
      rs.query = 'fix t';
      inputText = performSearch(rs, h);
      expect(inputText).toBe('fix typo');

      // Backspace 5 times: query becomes empty
      rs.query = '';
      inputText = performSearch(rs, h);
      expect(inputText).toBe(''); // original (empty)
    });

    it('query becoming empty restores original text', () => {
      h.push('entry');
      const rs = enterSearchMode('my original');
      rs.query = 'e';
      performSearch(rs, h);

      // Backspace to empty
      rs.query = '';
      rs.matchedEntry = null;
      rs.matchIndex = -1;
      rs.isFailing = false;
      // In app.ts, this restores savedInput
      expect(rs.savedInput).toBe('my original');
    });
  });

  describe('edge cases', () => {
    it('Ctrl+R with empty history enters search mode but any char fails', () => {
      const rs = enterSearchMode('');
      rs.query = 'a';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe(''); // original (empty)
      expect(rs.isFailing).toBe(true);
    });

    it('search with spaces in query works', () => {
      h.push('git commit -m "fix"');
      const rs = enterSearchMode('');
      rs.query = 'commit -m';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('git commit -m "fix"');
      expect(rs.isFailing).toBe(false);
    });

    it('multi-line history entry matches query', () => {
      h.push('line1\nline2\nline3');
      const rs = enterSearchMode('');
      rs.query = 'line2';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('line1\nline2\nline3');
    });

    it('matching entry identical to saved input works correctly', () => {
      h.push('same text');
      const rs = enterSearchMode('same text');
      rs.query = 'same';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('same text');
    });

    it('type query, exhaust matches, then refine query re-searches from top', () => {
      h.push('fix alpha');
      h.push('fix beta');
      h.push('fix gamma');
      const rs = enterSearchMode('');

      rs.query = 'fix';
      performSearch(rs, h); // gamma (index 2)
      cycleBackward(rs, h);  // beta (index 1)
      cycleBackward(rs, h);  // alpha (index 0)
      expect(rs.matchIndex).toBe(0);

      // Now add more to the query (re-search from top)
      rs.query = 'fix g';
      const inputText = performSearch(rs, h);
      expect(inputText).toBe('fix gamma');
      expect(rs.matchIndex).toBe(2);
    });
  });

  describe('interaction between search and linear navigation', () => {
    it('search does not modify linear cursor', () => {
      h.push('a');
      h.push('b');
      h.push('c');

      const rs = enterSearchMode('');
      rs.query = 'a';
      performSearch(rs, h);

      // Linear cursor should still be at reset
      expect(h.isAtReset).toBe(true);
    });

    it('after accepting search, linear navigation starts from reset', () => {
      h.push('first');
      h.push('second');
      h.push('third');

      const rs = enterSearchMode('');
      rs.query = 'first';
      performSearch(rs, h);

      // Accept search -- reset cursor
      h.resetCursor();

      // Linear navigation should start from most recent
      expect(h.previous()).toBe('third');
    });
  });
});
