# I02: No Incremental Reverse History Search (Ctrl+R)

## Status: Open
## Severity: Medium (UX gap, expected terminal behavior missing)
## Gap ID: 64
## Affected files:
- `packages/flitter-amp/src/state/history.ts`
- `packages/flitter-amp/src/app.ts`
- `packages/flitter-amp/src/widgets/bottom-grid.ts`
- `packages/flitter-amp/src/widgets/input-area.ts`

---

## 1. Problem Statement

In bash, zsh, and most terminal applications, pressing Ctrl+R activates an
**incremental reverse search** mode. As the user types characters, the shell
searches backward through history for the most recent entry containing the
typed substring, updating the display in real time. Pressing Ctrl+R again
cycles to the next older match. Pressing Enter accepts the match, Escape
cancels, and any other key exits search mode and passes through the key.

In the current flitter-amp implementation, Ctrl+R performs **linear backward
navigation**: each press steps to the previous history entry regardless of
content. There is no search query, no substring matching, and no incremental
filtering. This is functionally equivalent to pressing the Up Arrow repeatedly
-- it merely traverses the history stack one entry at a time.

The current handler in `app.ts` (lines 196-203):

```typescript
// Ctrl+R -- navigate prompt history (backward)
if (event.ctrlKey && event.key === 'r') {
  const prev = this.promptHistory.previous();
  if (prev !== null) {
    // TODO: inject text into InputArea when TextEditingController is exposed
    this.setState(() => {});
  }
  return 'handled';
}
```

This handler calls `PromptHistory.previous()` which simply decrements a cursor
and returns the entry at that index. There is no search query parameter, no
match highlighting, and no visual indication that a search is in progress.

The `PromptHistory` class in `state/history.ts` has only linear navigation
methods (`previous()`, `next()`, `resetCursor()`). It has no search or
filtering capability.

### What Users Expect (Bash Ctrl+R Behavior)

1. Press Ctrl+R: the prompt changes to `(reverse-i-search)'': ` showing an
   empty query.
2. Type `git`: the prompt updates to `(reverse-i-search)'git': git commit -m "fix"`,
   showing the most recent entry containing "git" with the match highlighted.
3. Type `p` (query is now `gitp`): if no match, prompt shows
   `(failing reverse-i-search)'gitp': git commit -m "fix"` (last successful
   match remains visible).
4. Press Ctrl+R again: cycles to the next older entry matching the current query.
5. Press Enter: accepts the displayed entry and exits search mode.
6. Press Escape: cancels the search and restores the original input.
7. Press any non-special key (e.g., ArrowLeft): exits search mode with the
   current match loaded, then the key is processed normally.

### What Currently Happens

Ctrl+R simply walks backward through history entries one-by-one. There is no
query input, no matching, no visual feedback beyond swapping the entire prompt
content (and even that does not work yet due to the controller exposure gap
described in Gap 55).

---

## 2. Root Cause Analysis

### 2.1 No Search State in `PromptHistory`

The `PromptHistory` class (`state/history.ts`) is a simple stack with a cursor.
Its `previous()` method decrements the cursor unconditionally. There is no
method to search for entries matching a substring, and the class has no concept
of a search query or filtered result set.

```typescript
// history.ts -- current implementation (48 lines total)
export class PromptHistory {
  private entries: string[] = [];
  private cursor = -1;
  private readonly maxSize: number;

  previous(): string | null {
    if (this.entries.length === 0) return null;
    if (this.cursor === -1) {
      this.cursor = this.entries.length - 1;
    } else if (this.cursor > 0) {
      this.cursor--;
    } else {
      return null; // At oldest entry
    }
    return this.entries[this.cursor];
  }
  // ...
}
```

### 2.2 No Search UI Mode in `AppStateWidget`

The `AppStateWidget` key handler treats Ctrl+R as a single-action navigation
command. There is no "search mode" state that would:
- Accept keystrokes as search query input
- Display a search prompt with the current query
- Update the match in real time as the query changes
- Handle special keys (Enter to accept, Escape to cancel, Ctrl+R to cycle)

### 2.3 No Visual Search Indicator

The `InputArea` and `BottomGrid` widgets have no concept of a search mode
display. In bash, the prompt itself changes to show `(reverse-i-search)'query': match`.
The flitter-amp equivalent would need to show a search overlay/inline
indicator within the input area or the status bar below it.

The existing `BorderOverlayText` mechanism in `InputArea` (lines 16-19 of
`input-area.ts`) already supports positioned overlay text on the input border,
which can be leveraged for the search indicator.

### 2.4 Dependencies on Other Gaps

This gap depends on Gap 55 (expose TextEditingController) being resolved first.
Without the hoisted controller, the search mode cannot inject matched text into
the input field or read the current input to save as a draft.

This gap also subsumes the current Ctrl+R linear navigation behavior. Once
incremental search is implemented, Ctrl+R enters search mode rather than
stepping linearly. Linear backward/forward navigation is handled exclusively
by ArrowUp/ArrowDown (Gap 63) and Ctrl+S (forward linear step outside search).

---

## 3. Proposed Solution

The solution introduces three interconnected components:

1. **`PromptHistory.searchBackward(query, startIndex?)` and `searchForward()`**
   -- new stateless methods that perform case-insensitive substring search
   through the history entries array.

2. **Search mode state machine in `AppStateWidget`** -- a new modal state that
   manages the lifecycle of an incremental search session (query accumulation,
   match cycling, accept/cancel/pass-through transitions).

3. **Search mode visual indicator** -- a UI modification using the existing
   `BorderOverlayText` overlay system to show the current search query and
   match status in the `BottomGrid` status line.

### 3.1 Design Principles

1. **Faithful to bash/readline semantics.** Ctrl+R enters search mode. Typing
   refines the query. Ctrl+R cycles matches. Enter accepts. Escape cancels.
   Non-special keys exit search and pass through.

2. **Incremental.** Every keystroke updates the search result immediately. The
   user does not need to press Enter to search -- the match updates as they type.

3. **Case-insensitive by default.** Matching is case-insensitive, matching
   the behavior of modern terminal search tools (fzf, atuin) while being more
   forgiving than bash's default case-sensitive search.

4. **No persistent search state in `PromptHistory`.** The history class provides
   stateless search methods. Search session state (query string, current match
   index) lives in `AppStateWidget`, keeping the history class focused on storage
   and simple traversal.

5. **Graceful degradation.** If history is empty or the query has no matches,
   the search mode displays a "failing" indicator but does not crash or dismiss.

6. **Integration with existing navigation.** ArrowUp/ArrowDown (Gap 63) remain
   available for linear navigation. Ctrl+R enters search mode, which is a
   separate interaction paradigm. The two do not conflict because search mode
   intercepts all key events while active.

### 3.2 Architecture Overview

```
User presses Ctrl+R (search mode inactive)
       |
       v
AppStateWidget._enterSearchMode()
  -> saves current input text as _searchOriginalText
  -> sets _searchMode = true, _searchQuery = ''
  -> triggers rebuild (shows search indicator in bottom status)
       |
       v
User types character 'f'
  -> _handleSearchModeKey() intercepts the key
  -> _searchQuery = 'f'
  -> _performSearch() calls promptHistory.searchBackward('f')
  -> returns { index: 15, entry: 'fix typo in readme' }
  -> inputController.text = 'fix typo in readme'
  -> rebuild (shows "(reverse-i-search)'f': " in bottom status)
       |
       v
User types 'ix' (query now 'fix')
  -> _searchQuery = 'fix'
  -> _performSearch() searches from most recent entry
  -> narrows to entries containing 'fix', displays newest match
       |
       v
User presses Ctrl+R again (while in search mode)
  -> _handleSearchModeKey() intercepts Ctrl+R
  -> promptHistory.searchBackward('fix', currentMatchIndex - 1)
  -> cycles to next older matching entry
       |
       v
User presses Enter
  -> _exitSearchMode(accept=true)
  -> _searchMode = false
  -> inputController.text stays as matched entry
  -> cursor placed at end
  -> search state cleared, indicator hidden
```

---

## 4. Detailed Implementation

### Step 1: Add Search Methods to `PromptHistory`

**File:** `packages/flitter-amp/src/state/history.ts`

Add two new methods: `searchBackward()` for Ctrl+R search and `searchForward()`
for Ctrl+S within search mode. Also add the `isAtReset` getter (from Gap 55)
and a `length` getter for convenience.

```typescript
/**
 * Search backward (toward older entries) for the next entry containing
 * the given query substring (case-insensitive).
 *
 * @param query The substring to search for.
 * @param fromIndex The index to begin searching from (inclusive, counting
 *   backward). If undefined or negative, starts from the most recent entry.
 * @returns An object with the matched entry text and its index, or null if
 *   no match is found.
 */
searchBackward(
  query: string,
  fromIndex?: number,
): { index: number; entry: string } | null {
  if (this.entries.length === 0 || query === '') return null;

  const lowerQuery = query.toLowerCase();
  const start = (fromIndex === undefined || fromIndex < 0)
    ? this.entries.length - 1
    : Math.min(fromIndex, this.entries.length - 1);

  for (let i = start; i >= 0; i--) {
    if (this.entries[i]!.toLowerCase().includes(lowerQuery)) {
      return { index: i, entry: this.entries[i]! };
    }
  }

  return null;
}

/**
 * Search forward (toward newer entries) for the next entry containing
 * the given query substring (case-insensitive).
 *
 * @param query The substring to search for.
 * @param fromIndex The index to begin searching from (inclusive, counting
 *   forward). If undefined, starts from the oldest entry (index 0).
 * @returns An object with the matched entry text and its index, or null if
 *   no match is found.
 */
searchForward(
  query: string,
  fromIndex?: number,
): { index: number; entry: string } | null {
  if (this.entries.length === 0 || query === '') return null;

  const lowerQuery = query.toLowerCase();
  const start = Math.max(0, fromIndex ?? 0);

  for (let i = start; i < this.entries.length; i++) {
    if (this.entries[i]!.toLowerCase().includes(lowerQuery)) {
      return { index: i, entry: this.entries[i]! };
    }
  }

  return null;
}

/** True when no history navigation is in progress. */
get isAtReset(): boolean {
  return this.cursor === -1;
}

/** Returns the total number of history entries. */
get length(): number {
  return this.entries.length;
}
```

**Design decisions:**

- Returns both the matched `entry` and its `index` so the caller can pass
  `index - 1` as `fromIndex` on the next Ctrl+R press to cycle to the
  next older match.
- Case-insensitive matching using `toLowerCase()`. This matches bash's
  behavior when the `readline` variable `completion-ignore-case` is on, and
  matches modern tools like fzf.
- Returns `null` for empty queries. The caller can distinguish between "no
  query entered yet" (query is `''`) and "query has no matches" (query is
  non-empty but `searchBackward` returns `null`).
- The methods are pure / stateless: they do not modify the `cursor` field or
  any other internal state. Search session state is managed externally in
  `AppStateWidget`.

**Complete updated `PromptHistory` class:**

```typescript
export class PromptHistory {
  private entries: string[] = [];
  private cursor = -1;
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(text: string): void {
    if (text.trim() === '') return;
    if (this.entries.length > 0 && this.entries[this.entries.length - 1] === text) return;
    this.entries.push(text);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
    this.cursor = -1;
  }

  previous(): string | null {
    if (this.entries.length === 0) return null;
    if (this.cursor === -1) {
      this.cursor = this.entries.length - 1;
    } else if (this.cursor > 0) {
      this.cursor--;
    } else {
      return null;
    }
    return this.entries[this.cursor];
  }

  next(): string | null {
    if (this.cursor === -1) return null;
    if (this.cursor < this.entries.length - 1) {
      this.cursor++;
      return this.entries[this.cursor];
    }
    this.cursor = -1;
    return '';
  }

  resetCursor(): void {
    this.cursor = -1;
  }

  get isAtReset(): boolean {
    return this.cursor === -1;
  }

  get length(): number {
    return this.entries.length;
  }

  searchBackward(
    query: string,
    fromIndex?: number,
  ): { index: number; entry: string } | null {
    if (this.entries.length === 0 || query === '') return null;
    const lowerQuery = query.toLowerCase();
    const start = (fromIndex === undefined || fromIndex < 0)
      ? this.entries.length - 1
      : Math.min(fromIndex, this.entries.length - 1);
    for (let i = start; i >= 0; i--) {
      if (this.entries[i]!.toLowerCase().includes(lowerQuery)) {
        return { index: i, entry: this.entries[i]! };
      }
    }
    return null;
  }

  searchForward(
    query: string,
    fromIndex?: number,
  ): { index: number; entry: string } | null {
    if (this.entries.length === 0 || query === '') return null;
    const lowerQuery = query.toLowerCase();
    const start = Math.max(0, fromIndex ?? 0);
    for (let i = start; i < this.entries.length; i++) {
      if (this.entries[i]!.toLowerCase().includes(lowerQuery)) {
        return { index: i, entry: this.entries[i]! };
      }
    }
    return null;
  }
}
```

### Step 2: Define `ReverseSearchState` Interface

**File:** `packages/flitter-amp/src/app.ts` (inline interface near the top)

The search mode state tracks all information needed during an active
incremental search session:

```typescript
/** State for an active incremental reverse search session. */
interface ReverseSearchState {
  /** The current search query string, built up character by character. */
  query: string;

  /** The history entry currently matched (displayed in the input area),
   *  or null if no match has been found yet. */
  matchedEntry: string | null;

  /** The index of the current match in PromptHistory entries, or -1
   *  if no match. Used to resume searching on subsequent Ctrl+R presses. */
  matchIndex: number;

  /** Whether the current query has any matches. When true, the UI shows
   *  a "failing" prefix (like bash's "failing reverse-i-search"). */
  isFailing: boolean;

  /** The input text that was present before entering search mode.
   *  Restored on Escape (cancel). */
  savedInput: string;
}
```

### Step 3: Add Search Mode Fields to `AppStateWidget`

**File:** `packages/flitter-amp/src/app.ts`

Add a nullable `ReverseSearchState` field. When `null`, search mode is
inactive and keys are handled normally. When non-null, all key events are
intercepted by the search mode handler first.

```typescript
class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private inputController = new TextEditingController();   // from Gap 55
  private stateListener: (() => void) | null = null;
  private showCommandPalette = false;
  private showFilePicker = false;
  private fileList: string[] = [];
  private promptHistory = new PromptHistory();
  private _savedDraft: string = '';                        // from Gap 55
  private _isNavigatingHistory = false;                    // from Gap 63
  private _reverseSearch: ReverseSearchState | null = null; // NEW: search state
  private _lastUpdate = 0;
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;
  // ...
}
```

### Step 4: Implement Search Mode Entry and Exit

**File:** `packages/flitter-amp/src/app.ts`

```typescript
/**
 * Enter incremental reverse search mode.
 * Saves the current input text as the restore point and shows the search UI.
 */
private _enterSearchMode(): void {
  this._reverseSearch = {
    query: '',
    matchedEntry: null,
    matchIndex: -1,
    isFailing: false,
    savedInput: this.inputController.text,
  };
  this.setState(() => {});  // rebuild to show search indicator
}

/**
 * Exit search mode.
 * @param accept If true, keep the matched text in the input.
 *   If false, restore the original text from before search started.
 */
private _exitSearchMode(accept: boolean): void {
  if (!this._reverseSearch) return;

  if (!accept) {
    // Restore original text
    this._isNavigatingHistory = true;
    try {
      this.inputController.text = this._reverseSearch.savedInput;
      this.inputController.cursorPosition = this._reverseSearch.savedInput.length;
    } finally {
      this._isNavigatingHistory = false;
    }
  } else {
    // Accept: text is already set to the match. Place cursor at end.
    this.inputController.cursorPosition = this.inputController.text.length;
    // Reset the linear history cursor since the user has accepted a
    // specific entry via search.
    this.promptHistory.resetCursor();
  }

  this._reverseSearch = null;
  this.setState(() => {});  // rebuild to hide search indicator
}
```

### Step 5: Replace the Ctrl+R Handler

**File:** `packages/flitter-amp/src/app.ts`

Replace the current linear-stepping Ctrl+R handler with one that enters
search mode.

**At the top of the `FocusScope` `onKey` callback, before all other handlers,
add the search mode intercept:**

```typescript
onKey: (event: KeyEvent): KeyEventResult => {
  // Search mode intercepts ALL keys while active
  if (this._reverseSearch !== null) {
    return this._handleSearchModeKey(event);
  }

  // ... existing Escape, Ctrl+O, Ctrl+C, Ctrl+L, Alt+T, Ctrl+G handlers ...
```

**Replace the existing Ctrl+R handler:**

```typescript
// Ctrl+R -- enter incremental reverse history search mode
if (event.ctrlKey && event.key === 'r') {
  // Do not enter search mode while the agent is processing
  if (appState.isProcessing) return 'handled';
  this._enterSearchMode();
  return 'handled';
}
```

### Step 6: Implement the Search Mode Key Handler

**File:** `packages/flitter-amp/src/app.ts`

This is the core of the feature: a key handler that runs while search mode is
active. It processes characters as query input, handles special keys for
cycling/accepting/canceling, and gracefully exits on unrecognized keys.

```typescript
/**
 * Handle a key event while incremental reverse search is active.
 * This method intercepts ALL keys during search mode.
 */
private _handleSearchModeKey(event: KeyEvent): KeyEventResult {
  const rs = this._reverseSearch!;

  // --- Ctrl+R: cycle to next older match ---
  if (event.ctrlKey && event.key === 'r') {
    if (rs.query !== '' && rs.matchIndex > 0) {
      const result = this.promptHistory.searchBackward(
        rs.query,
        rs.matchIndex - 1,
      );
      if (result) {
        rs.matchedEntry = result.entry;
        rs.matchIndex = result.index;
        rs.isFailing = false;
        this._setInputFromSearch(result.entry);
      } else {
        // No more older matches -- mark as failing but keep last match visible
        rs.isFailing = true;
      }
    }
    this.setState(() => {});
    return 'handled';
  }

  // --- Ctrl+S: cycle to next newer match (forward search) ---
  if (event.ctrlKey && event.key === 's') {
    if (rs.query !== '' && rs.matchIndex >= 0) {
      const result = this.promptHistory.searchForward(
        rs.query,
        rs.matchIndex + 1,
      );
      if (result) {
        rs.matchedEntry = result.entry;
        rs.matchIndex = result.index;
        rs.isFailing = false;
        this._setInputFromSearch(result.entry);
      } else {
        rs.isFailing = true;
      }
    }
    this.setState(() => {});
    return 'handled';
  }

  // --- Escape: cancel search, restore original text ---
  if (event.key === 'Escape') {
    this._exitSearchMode(false);
    return 'handled';
  }

  // --- Enter/Return: accept current match ---
  if (event.key === 'Enter' || event.key === 'Return') {
    this._exitSearchMode(true);
    return 'handled';
  }

  // --- Ctrl+G or Ctrl+C: cancel search (bash convention) ---
  if (event.ctrlKey && (event.key === 'g' || event.key === 'c')) {
    this._exitSearchMode(false);
    return 'handled';
  }

  // --- Backspace: remove last character from query ---
  if (event.key === 'Backspace') {
    if (rs.query.length > 0) {
      rs.query = rs.query.slice(0, -1);
      if (rs.query.length === 0) {
        // Query is now empty -- restore original text, clear match state
        rs.matchedEntry = null;
        rs.matchIndex = -1;
        rs.isFailing = false;
        this._isNavigatingHistory = true;
        try {
          this.inputController.text = rs.savedInput;
          this.inputController.cursorPosition = rs.savedInput.length;
        } finally {
          this._isNavigatingHistory = false;
        }
      } else {
        this._performSearch();
      }
    } else {
      // Backspace on empty query: exit search mode, restore saved input
      this._exitSearchMode(false);
    }
    this.setState(() => {});
    return 'handled';
  }

  // --- ArrowLeft/ArrowRight: accept match, let arrow pass through ---
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    this._exitSearchMode(true);
    return 'ignored';  // re-process for cursor movement
  }

  // --- ArrowUp: accept match, let arrow pass through for history nav ---
  if (event.key === 'ArrowUp') {
    this._exitSearchMode(true);
    return 'ignored';  // will be caught by Gap 63 ArrowUp handler
  }

  // --- ArrowDown: accept match, let arrow pass through ---
  if (event.key === 'ArrowDown') {
    this._exitSearchMode(true);
    return 'ignored';
  }

  // --- Printable character: append to search query ---
  if (!event.ctrlKey && !event.altKey && !event.metaKey) {
    const ch = event.key;
    if (ch.length === 1 && ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) <= 0x7E) {
      rs.query += ch;
      this._performSearch();
      this.setState(() => {});
      return 'handled';
    }
    if (ch === 'Space') {
      rs.query += ' ';
      this._performSearch();
      this.setState(() => {});
      return 'handled';
    }
  }

  // --- Any other key: exit search mode, accept match, pass key through ---
  this._exitSearchMode(true);
  return 'ignored';
}
```

### Step 7: Implement Search Execution and Helper Methods

**File:** `packages/flitter-amp/src/app.ts`

```typescript
/**
 * Execute the search with the current query.
 * Called when the query changes (character added or removed).
 * Searches from the most recent entry to find the best match for the
 * current query. This matches bash behavior where adding a character
 * to the query re-searches from the top, not from the current position.
 */
private _performSearch(): void {
  const rs = this._reverseSearch;
  if (!rs || rs.query === '') return;

  // Search backward from the most recent entry.
  // On query refinement (adding characters), bash re-searches from the top
  // to find the newest match for the new, more specific query.
  const result = this.promptHistory.searchBackward(rs.query);

  if (result) {
    rs.matchedEntry = result.entry;
    rs.matchIndex = result.index;
    rs.isFailing = false;
    this._setInputFromSearch(result.entry);
  } else {
    // No match found for the current query.
    // Keep the input showing the original text (not a stale match).
    rs.matchedEntry = null;
    rs.matchIndex = -1;
    rs.isFailing = true;
    this._isNavigatingHistory = true;
    try {
      this.inputController.text = rs.savedInput;
      this.inputController.cursorPosition = rs.savedInput.length;
    } finally {
      this._isNavigatingHistory = false;
    }
  }
}

/**
 * Set the input controller text from a search result.
 * Guards with _isNavigatingHistory to prevent the text change listener
 * (from Gap 63) from resetting the linear history cursor.
 */
private _setInputFromSearch(entry: string): void {
  this._isNavigatingHistory = true;
  try {
    this.inputController.text = entry;
    this.inputController.cursorPosition = entry.length;
  } finally {
    this._isNavigatingHistory = false;
  }
}
```

### Step 8: Add Search Mode Visual Indicator

**File:** `packages/flitter-amp/src/app.ts` (in `build()` method)

Build a search overlay widget that displays the search state in the bottom
status area. This uses the existing `hintText` prop on `BottomGrid` (or
alternatively the `BorderOverlayText` overlay system).

**Approach A: Override `hintText` on `BottomGrid`**

The simplest approach is to pass a formatted search status string as the
`hintText` prop on `BottomGrid`. When `hintText` is set, it replaces the
default `? for shortcuts` text in the bottom-left status line (see
`bottom-grid.ts` lines 161-168). This requires no new widget infrastructure.

```typescript
// In AppStateWidget.build(), when constructing BottomGrid:

// Build search hint text if in search mode
let searchHintText: string | undefined;
if (this._reverseSearch) {
  const rs = this._reverseSearch;
  const prefix = rs.isFailing
    ? '(failing reverse-i-search)'
    : '(reverse-i-search)';
  searchHintText = `${prefix}'${rs.query}': `;
}

new BottomGrid({
  onSubmit: (text: string) => {
    if (this._reverseSearch) this._exitSearchMode(true);
    this.promptHistory.push(text);
    this.promptHistory.resetCursor();
    this._savedDraft = '';
    this.widget.onSubmit(text);
  },
  isProcessing: appState.isProcessing,
  currentMode: appState.currentMode ?? 'smart',
  agentName: appState.agentName ?? undefined,
  cwd: appState.cwd,
  gitBranch: appState.gitBranch ?? undefined,
  tokenUsage: appState.usage ?? undefined,
  skillCount: appState.skillCount,
  controller: this.inputController,
  hintText: searchHintText,                    // NEW: search indicator
}),
```

**Approach B: Richer overlay with colored text (recommended)**

For a more polished display with distinct colors for the prefix, query, and
separator, use a `searchState` prop that `BottomGrid` renders with
`TextSpan` children. This approach requires adding a new prop to `BottomGrid`.

Add to `BottomGridProps`:

```typescript
interface BottomGridProps {
  // ... existing props ...
  searchState?: {
    query: string;
    isFailing: boolean;
  } | null;
}
```

In `BottomGridState.buildBottomLeft()`, add a check before the existing
hint/processing/shortcut logic:

```typescript
private buildBottomLeft(
  w: BottomGrid,
  mutedColor: Color,
  keybindColor: Color,
): Widget {
  // Search mode indicator takes priority
  if (w.searchState) {
    const prefix = w.searchState.isFailing
      ? '(failing reverse-i-search)'
      : '(reverse-i-search)';
    const errorColor = theme?.base.error ?? Color.red;
    const infoColor = theme?.base.info ?? Color.cyan;

    return new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: prefix,
            style: new TextStyle({
              foreground: w.searchState.isFailing ? errorColor : infoColor,
            }),
          }),
          new TextSpan({
            text: `'${w.searchState.query}'`,
            style: new TextStyle({
              foreground: keybindColor,
              bold: true,
            }),
          }),
          new TextSpan({
            text: ': ',
            style: new TextStyle({ foreground: mutedColor }),
          }),
        ],
      }),
    });
  }

  // ... existing hintText / processing / "? for shortcuts" logic ...
}
```

Wire from `AppStateWidget.build()`:

```typescript
new BottomGrid({
  // ... existing props ...
  controller: this.inputController,
  searchState: this._reverseSearch
    ? { query: this._reverseSearch.query, isFailing: this._reverseSearch.isFailing }
    : null,
}),
```

Add the field and constructor assignment in `BottomGrid`:

```typescript
export class BottomGrid extends StatefulWidget {
  // ... existing fields ...
  readonly searchState: { query: string; isFailing: boolean } | null;

  constructor(props: BottomGridProps) {
    super({});
    // ... existing assignments ...
    this.searchState = props.searchState ?? null;
  }
}
```

---

## 5. Event Flow During Search Mode

### 5.1 User Enters Search Mode and Types "git"

```
 1. User presses Ctrl+R
 2. FocusScope onKey handler in AppStateWidget
 3. _reverseSearch is null -> enters Ctrl+R handler
 4. Calls _enterSearchMode():
    _reverseSearch = { query:'', matchedEntry:null, matchIndex:-1,
                       isFailing:false, savedInput:'current text' }
 5. setState() -> BottomGrid rebuilds, bottom-left shows:
    (reverse-i-search)'':
 6. Input text is unchanged (the user's draft is preserved visually)

 7. User types 'g'
 8. FocusScope onKey -> _reverseSearch is non-null
 9. Delegates to _handleSearchModeKey(event)
10. Printable char case: rs.query = 'g'
11. _performSearch() -> searchBackward('g') from most recent entry
12. Found: { index:15, entry:"git push origin main" }
13. rs.matchedEntry = "git push origin main", rs.matchIndex = 15
14. _setInputFromSearch("git push origin main")
    -> inputController.text = "git push origin main"
15. setState() -> BottomGrid shows: (reverse-i-search)'g':
16. Input area displays: git push origin main

17. User types 'i'
18. rs.query = 'gi'
19. _performSearch() -> searchBackward('gi') from most recent
20. Still matches "git push origin main" (or a more recent "gi" entry)
21. Input updates accordingly

22. User types 't'
23. rs.query = 'git'
24. _performSearch() -> searchBackward('git') from most recent
25. Matches the most recent entry containing "git"
```

### 5.2 User Cycles Through Matches with Ctrl+R

```
 1. Search mode active, query='git', match at index 15
 2. User presses Ctrl+R
 3. _handleSearchModeKey -> Ctrl+R branch
 4. rs.query is non-empty, rs.matchIndex > 0
 5. searchBackward('git', 14)  [matchIndex - 1]
 6. Found: { index:12, entry:"git commit -m 'fix'" }
 7. Input updates to "git commit -m 'fix'"
 8. User presses Ctrl+R again
 9. searchBackward('git', 11)
10. Found: { index:8, entry:"git add ." }
11. Input updates to "git add ."
12. User presses Ctrl+R again
13. searchBackward('git', 7) -> null (no more matches)
14. rs.isFailing = true
15. Bottom status shows: (failing reverse-i-search)'git':
```

### 5.3 User Accepts Match with Enter

```
 1. Search mode active, input shows "git commit -m 'fix'"
 2. User presses Enter
 3. _handleSearchModeKey -> Enter branch
 4. _exitSearchMode(true)
    -> text stays as "git commit -m 'fix'"
    -> cursor placed at end
    -> _reverseSearch = null
 5. setState() -> search indicator disappears
 6. Input retains "git commit -m 'fix'"
 7. User can now edit the text or press Enter again to submit
```

### 5.4 User Cancels with Escape

```
 1. Search mode active, input shows "git commit -m 'fix'"
 2. User presses Escape
 3. _handleSearchModeKey -> Escape branch
 4. _exitSearchMode(false)
    -> inputController.text = rs.savedInput (restores original)
    -> _reverseSearch = null
 5. setState() -> search indicator disappears
 6. Input shows the text that was present before Ctrl+R was pressed
```

### 5.5 User Types Non-Special Key (Exit + Pass-Through)

```
 1. Search mode active, input shows "git commit -m 'fix'"
 2. User presses Tab (or any unrecognized key)
 3. _handleSearchModeKey -> falls to default case
 4. _exitSearchMode(true) -> accept match, text stays
 5. Returns 'ignored' -> event re-processed by normal key handler
 6. Tab handled by focus system (or ignored)
 7. Search mode is exited, match text remains in the input
```

### 5.6 ArrowLeft/Right During Search

```
 1. Search mode active, input shows "git commit -m 'fix'"
 2. User presses ArrowLeft
 3. _handleSearchModeKey -> ArrowLeft branch
 4. _exitSearchMode(true) -> accept match
 5. Returns 'ignored' -> event re-processed
 6. Normal TextField handler moves cursor left in "git commit -m 'fix'"
```

---

## 6. Optional Enhancement: Match Highlighting

An additional visual enhancement would be to highlight the matched substring
within the input text. When search mode is active and a match is found, the
`TextEditingController`'s selection can be set to the range of the matched
substring within the entry:

```typescript
// Inside _setInputFromSearch(), after setting text:
private _setInputFromSearch(entry: string): void {
  this._isNavigatingHistory = true;
  try {
    this.inputController.text = entry;
    // Highlight the matched portion
    const rs = this._reverseSearch;
    if (rs && rs.query) {
      const matchStart = entry.toLowerCase().indexOf(rs.query.toLowerCase());
      if (matchStart >= 0) {
        this.inputController.setSelection(
          matchStart,
          matchStart + rs.query.length,
        );
        // Place cursor at the end of the match
        this.inputController.cursorPosition = matchStart + rs.query.length;
        return;
      }
    }
    this.inputController.cursorPosition = entry.length;
  } finally {
    this._isNavigatingHistory = false;
  }
}
```

This causes the `TextField` to render the matched portion with the selection
highlight color (configured as `selectionColor` on TextField, defaulting to
a blue tint). This provides visual feedback about which part of the entry
matched the query, similar to how many terminal emulators highlight the
matched text in Ctrl+R search results.

This enhancement is optional and can be implemented in a follow-up. The core
functionality works without it.

---

## 7. Complete Diff Summary

### `packages/flitter-amp/src/state/history.ts`

```diff
   resetCursor(): void {
     this.cursor = -1;
   }
+
+  /** True when no history navigation is in progress. */
+  get isAtReset(): boolean {
+    return this.cursor === -1;
+  }
+
+  /** Returns the total number of history entries. */
+  get length(): number {
+    return this.entries.length;
+  }
+
+  /**
+   * Search backward for the next entry containing `query` (case-insensitive).
+   * Searches from `fromIndex` toward index 0.
+   */
+  searchBackward(
+    query: string,
+    fromIndex?: number,
+  ): { index: number; entry: string } | null {
+    if (this.entries.length === 0 || query === '') return null;
+    const lowerQuery = query.toLowerCase();
+    const start = (fromIndex === undefined || fromIndex < 0)
+      ? this.entries.length - 1
+      : Math.min(fromIndex, this.entries.length - 1);
+    for (let i = start; i >= 0; i--) {
+      if (this.entries[i]!.toLowerCase().includes(lowerQuery)) {
+        return { index: i, entry: this.entries[i]! };
+      }
+    }
+    return null;
+  }
+
+  /**
+   * Search forward for the next entry containing `query` (case-insensitive).
+   * Searches from `fromIndex` toward the newest entry.
+   */
+  searchForward(
+    query: string,
+    fromIndex?: number,
+  ): { index: number; entry: string } | null {
+    if (this.entries.length === 0 || query === '') return null;
+    const lowerQuery = query.toLowerCase();
+    const start = Math.max(0, fromIndex ?? 0);
+    for (let i = start; i < this.entries.length; i++) {
+      if (this.entries[i]!.toLowerCase().includes(lowerQuery)) {
+        return { index: i, entry: this.entries[i]! };
+      }
+    }
+    return null;
+  }
 }
```

### `packages/flitter-amp/src/app.ts`

```diff
+// NEW: interface for search mode state
+interface ReverseSearchState {
+  query: string;
+  matchedEntry: string | null;
+  matchIndex: number;
+  isFailing: boolean;
+  savedInput: string;
+}

 class AppStateWidget extends State<App> {
   private scrollController = new ScrollController();
+  private inputController = new TextEditingController();   // from Gap 55
   private stateListener: (() => void) | null = null;
   private showCommandPalette = false;
   private showFilePicker = false;
   private fileList: string[] = [];
   private promptHistory = new PromptHistory();
+  private _savedDraft: string = '';                        // from Gap 55
+  private _isNavigatingHistory = false;                    // from Gap 63
+  private _reverseSearch: ReverseSearchState | null = null; // NEW
   private _lastUpdate = 0;
   private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

   build(): Widget {
     const appState = this.widget.appState;
     // ...

     const mainContent = new FocusScope({
       autofocus: true,
       onKey: (event: KeyEvent): KeyEventResult => {
+        // Search mode intercepts ALL keys while active
+        if (this._reverseSearch !== null) {
+          return this._handleSearchModeKey(event);
+        }

         // Escape -- dismiss overlays (unchanged)
         // Ctrl+O -- open command palette (unchanged)
         // Ctrl+C -- cancel current operation (unchanged)
         // Ctrl+L -- clear conversation (unchanged)
         // Alt+T -- toggle tool call expansion (unchanged)
         // Ctrl+G -- open prompt in $EDITOR (unchanged)

-        // Ctrl+R -- navigate prompt history (backward)
-        if (event.ctrlKey && event.key === 'r') {
-          const prev = this.promptHistory.previous();
-          if (prev !== null) {
-            // TODO: inject text into InputArea when TextEditingController is exposed
-            this.setState(() => {});
-          }
-          return 'handled';
-        }
+        // Ctrl+R -- enter incremental reverse history search
+        if (event.ctrlKey && event.key === 'r') {
+          if (appState.isProcessing) return 'handled';
+          this._enterSearchMode();
+          return 'handled';
+        }

         // ... ArrowUp/ArrowDown handlers from Gap 63 ...

         return 'ignored';
       },
       child: new Column({
         // ...
         children: [
           // ... chat view ...
           new BottomGrid({
             onSubmit: (text: string) => {
+              if (this._reverseSearch) this._exitSearchMode(true);
               this.promptHistory.push(text);
+              this.promptHistory.resetCursor();
+              this._savedDraft = '';
               this.widget.onSubmit(text);
             },
             isProcessing: appState.isProcessing,
             currentMode: appState.currentMode ?? 'smart',
             // ... other props ...
+            controller: this.inputController,
+            searchState: this._reverseSearch
+              ? { query: this._reverseSearch.query,
+                  isFailing: this._reverseSearch.isFailing }
+              : null,
           }),
         ],
       }),
     });
     // ...
   }

+  private _enterSearchMode(): void { /* see Step 4 */ }
+  private _exitSearchMode(accept: boolean): void { /* see Step 4 */ }
+  private _handleSearchModeKey(event: KeyEvent): KeyEventResult { /* see Step 6 */ }
+  private _performSearch(): void { /* see Step 7 */ }
+  private _setInputFromSearch(entry: string): void { /* see Step 7 */ }
 }
```

### `packages/flitter-amp/src/widgets/bottom-grid.ts`

```diff
 interface BottomGridProps {
   onSubmit: (text: string) => void;
   // ... existing props ...
+  controller?: TextEditingController;                       // from Gap 55
+  searchState?: { query: string; isFailing: boolean } | null; // NEW
 }

 export class BottomGrid extends StatefulWidget {
   // ... existing fields ...
+  readonly controller: TextEditingController | undefined;
+  readonly searchState: { query: string; isFailing: boolean } | null;

   constructor(props: BottomGridProps) {
     super({});
     // ... existing assignments ...
+    this.controller = props.controller;
+    this.searchState = props.searchState ?? null;
   }
 }

 // In BottomGridState.buildBottomLeft():
+  if (w.searchState) {
+    const prefix = w.searchState.isFailing
+      ? '(failing reverse-i-search)'
+      : '(reverse-i-search)';
+    return new Text({
+      text: new TextSpan({
+        children: [
+          new TextSpan({ text: prefix, style: new TextStyle({
+            foreground: w.searchState.isFailing ? errorColor : infoColor,
+          }) }),
+          new TextSpan({ text: `'${w.searchState.query}'`, style: new TextStyle({
+            foreground: keybindColor, bold: true,
+          }) }),
+          new TextSpan({ text: ': ', style: new TextStyle({
+            foreground: mutedColor,
+          }) }),
+        ],
+      }),
+    });
+  }

   // ... existing hintText / processing / "? for shortcuts" logic unchanged ...
```

### `packages/flitter-amp/src/widgets/input-area.ts`

No changes beyond those from Gap 55 (controller hoisting). The search
indicator is rendered by `BottomGrid`'s `buildBottomLeft()`, not by `InputArea`
itself. The input area continues to display whatever the `TextEditingController`
contains, which is set by the search mode handler.

---

## 8. Behavioral Specification

### Search Mode Lifecycle

| Event | State Before | State After | Action |
|-------|-------------|-------------|--------|
| Ctrl+R (not in search) | Inactive | Active | Save input, show search prompt, query='' |
| Ctrl+R (in search, has match) | Active | Active | Cycle to next older match |
| Ctrl+R (in search, no older match) | Active | Active | Mark as failing |
| Printable char | Active | Active | Append to query, re-search from most recent |
| Space | Active | Active | Append space to query, re-search |
| Backspace (query non-empty) | Active | Active | Remove last char, re-search |
| Backspace (query empty) | Active | Inactive | Cancel, restore original text |
| Ctrl+S (in search, has match) | Active | Active | Cycle to next newer match |
| Ctrl+S (in search, no newer match) | Active | Active | Mark as failing |
| Enter/Return | Active | Inactive | Accept match, exit search |
| Escape | Active | Inactive | Cancel, restore original text |
| Ctrl+G | Active | Inactive | Cancel (bash convention) |
| Ctrl+C | Active | Inactive | Cancel (bash convention) |
| ArrowLeft/Right | Active | Inactive | Accept match, pass key through |
| ArrowUp/Down | Active | Inactive | Accept match, pass key through |
| Any unrecognized key | Active | Inactive | Accept match, pass key through |

### Visual Indicator States

| State | Bottom-left display |
|-------|-------------------|
| Not in search mode | `? for shortcuts` (or `Esc to cancel` during processing) |
| Search mode, empty query | `(reverse-i-search)'': ` |
| Search mode, query with match | `(reverse-i-search)'query': ` |
| Search mode, query without match | `(failing reverse-i-search)'query': ` |

### Search Algorithm Details

1. **Empty query**: No search performed. Input shows original text.
2. **Query with match**: `searchBackward()` finds the newest entry containing
   the query as a case-insensitive substring. Input shows the matched entry.
3. **Query without match**: `searchBackward()` returns null. Input shows
   original text. Indicator shows "failing" state.
4. **Ctrl+R cycling**: Searches from `matchIndex - 1` backward. If no more
   matches, shows "failing" state but keeps last match in input.
5. **Ctrl+S cycling**: Searches from `matchIndex + 1` forward. If no more
   matches, shows "failing" state.
6. **Backspace**: Removes last query character. Re-searches from the most
   recent entry (not from the current position), which is standard bash
   behavior on query shortening. If query becomes empty, restores original.
7. **Re-search on query change**: When the query is modified (character added
   or removed), `_performSearch()` always starts from the most recent entry.
   This ensures the user always sees the newest match for their query.

### Interaction with Linear Navigation (Gap 63)

- Entering search mode does NOT modify `PromptHistory.cursor` (the linear
  navigation cursor). Search uses its own `_reverseSearch.matchIndex`.
- Exiting search mode with `accept=true` resets the linear cursor via
  `promptHistory.resetCursor()`, since the user has selected a specific entry.
- Exiting with `accept=false` (Escape) restores the original text and does
  not touch the linear cursor.
- After exiting search mode, ArrowUp/ArrowDown resume linear navigation from
  the reset position (most recent entry first).

### Interaction with Draft Preservation (Gap 55/63)

- Entering search mode saves the current input text as
  `_reverseSearch.savedInput`.
- This is a separate field from `_savedDraft` (used by ArrowUp/Down in Gap 63)
  because search mode has its own cancel/restore semantics.
- On accept, `_savedDraft` is cleared since the user has chosen a specific
  entry.
- On cancel, `_reverseSearch.savedInput` is restored; `_savedDraft` is
  unaffected.

---

## 9. Testing Plan

### 9.1 Unit Tests: `PromptHistory.searchBackward()`

```typescript
describe('PromptHistory.searchBackward', () => {
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

  it('clamps fromIndex to valid range (negative)', () => {
    const h = new PromptHistory();
    h.push('entry');
    const result = h.searchBackward('entry', -1);
    // fromIndex < 0 triggers default (start from newest)
    expect(result).toEqual({ index: 0, entry: 'entry' });
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
});
```

### 9.2 Unit Tests: `PromptHistory.searchForward()`

```typescript
describe('PromptHistory.searchForward', () => {
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
});
```

### 9.3 Unit Tests: `PromptHistory.length`

```typescript
describe('PromptHistory.length', () => {
  it('returns 0 for empty history', () => {
    expect(new PromptHistory().length).toBe(0);
  });

  it('returns correct count after pushes', () => {
    const h = new PromptHistory();
    h.push('a'); h.push('b'); h.push('c');
    expect(h.length).toBe(3);
  });

  it('accounts for eviction', () => {
    const h = new PromptHistory(2);
    h.push('a'); h.push('b'); h.push('c');
    expect(h.length).toBe(2);
  });

  it('accounts for deduplication', () => {
    const h = new PromptHistory();
    h.push('same'); h.push('same');
    expect(h.length).toBe(1);
  });
});
```

### 9.4 Integration Tests: Search Mode State Machine

```typescript
describe('Incremental reverse search mode', () => {
  it('Ctrl+R enters search mode and shows indicator', () => {
    // Submit "hello", "world"
    // Press Ctrl+R
    // Verify _reverseSearch is non-null
    // Verify search indicator rendered in bottom-left
  });

  it('typing characters performs incremental search', () => {
    // Submit "fix parser bug", "add feature", "fix typo"
    // Press Ctrl+R -> search mode
    // Type 'f' -> input shows "fix typo" (newest match)
    // Type 'i' -> query "fi", still matches "fix typo"
    // Type 'x p' -> query "fix p", matches "fix parser bug"
  });

  it('Ctrl+R in search mode cycles to older match', () => {
    // Submit "fix alpha", "add beta", "fix gamma"
    // Ctrl+R, type 'fix' -> shows "fix gamma"
    // Ctrl+R again -> shows "fix alpha"
    // Ctrl+R again -> no more matches, failing indicator
  });

  it('Ctrl+S in search mode cycles to newer match', () => {
    // Submit "fix alpha", "fix beta", "fix gamma"
    // Ctrl+R, type 'fix' -> shows "fix gamma"
    // Ctrl+R -> shows "fix beta"
    // Ctrl+S -> shows "fix gamma"
  });

  it('Enter accepts the match and exits search mode', () => {
    // Submit "hello world"
    // Ctrl+R, type 'hello' -> shows "hello world"
    // Press Enter
    // Verify input text is "hello world"
    // Verify _reverseSearch is null
  });

  it('Escape cancels search and restores original text', () => {
    // Type "my draft" in input (don't submit)
    // Ctrl+R, type 'old' -> input shows some history match
    // Press Escape
    // Verify input text is "my draft" (restored)
    // Verify _reverseSearch is null
  });

  it('Backspace removes last character from query', () => {
    // Submit "fix bug", "fix typo"
    // Ctrl+R, type 'fix ty' -> shows "fix typo"
    // Backspace -> query "fix t", still matches "fix typo"
    // Backspace 5 times -> query empty, shows original text
  });

  it('Backspace on empty query exits search mode', () => {
    // Ctrl+R (query is '')
    // Press Backspace
    // Search mode exits, input restored
  });

  it('failed search shows failing indicator', () => {
    // Submit "hello"
    // Ctrl+R, type 'xyz' -> no match
    // Verify indicator shows "(failing reverse-i-search)'xyz': "
    // Verify input shows original text
  });

  it('search is case-insensitive', () => {
    // Submit "Fix Bug in Parser"
    // Ctrl+R, type 'fix bug'
    // Verify match found: "Fix Bug in Parser"
  });

  it('Ctrl+R is ignored during agent processing', () => {
    // Set appState.isProcessing = true
    // Press Ctrl+R
    // Verify _reverseSearch is null (search mode NOT entered)
  });

  it('ArrowLeft exits search mode and moves cursor', () => {
    // Submit "hello world"
    // Ctrl+R, type 'hello' -> shows "hello world"
    // Press ArrowLeft
    // Verify search mode is off
    // Verify input text is "hello world" (accepted)
    // Cursor should have moved (arrow passed through)
  });

  it('submit during search mode accepts match then submits', () => {
    // Submit "old entry"
    // Type "new text"
    // Ctrl+R, type 'old' -> shows "old entry"
    // The onSubmit handler calls _exitSearchMode(true) first
  });

  it('Ctrl+G cancels search like Escape', () => {
    // Type "my draft"
    // Ctrl+R, type 'something' -> match displayed
    // Ctrl+G
    // Verify input restored to "my draft"
  });

  it('Ctrl+C cancels search like Escape', () => {
    // Same as Ctrl+G test
  });
});
```

### 9.5 Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Ctrl+R with empty history | Enter search mode, any typed char -> "failing" |
| Ctrl+R then immediately Enter | Exit search, input unchanged (no match selected) |
| Ctrl+R then immediately Escape | Exit search, input unchanged |
| Search query matches multiple entries | Shows newest match first, Ctrl+R cycles older |
| All entries match (query "a" in ["alpha","banana"]) | Cycles through all entries |
| Search after history eviction | Only searches retained entries |
| Multi-line history entry matches query | Full multi-line text loaded into input |
| Special characters in query (regex chars) | Literal substring match, not regex |
| Rapid Ctrl+R spam in search mode | Cycles through matches correctly |
| Type during search then backspace all | Restores to pre-search state cleanly |
| `_isNavigatingHistory` flag during error | try/finally ensures flag always cleared |
| Ctrl+R, type query, Ctrl+R to exhaust matches, then type more | Re-searches from top for new query |
| Matching entry is identical to saved input | Works correctly, no visual change |
| Query contains spaces | Spaces are appended to query, search works normally |

---

## 10. Impact Assessment

- **Risk**: Moderate. The search mode introduces a new modal UI state that
  intercepts all key events while active. The `_reverseSearch` field gates
  this behavior, and all exit paths set it to `null`. The try/finally pattern
  on `_isNavigatingHistory` prevents flag leaks.

- **Regression risk**: Low for non-search paths. The only change to the
  normal key handling flow is the early-return check at the top of the
  `onKey` handler (`if (this._reverseSearch !== null)`). When search mode is
  inactive, this check fails immediately and all existing handlers execute
  unchanged.

- **Performance**: Negligible. `searchBackward()` / `searchForward()` are
  O(n * m) where n is the number of history entries (max 100 by default) and
  m is the average entry length. For 100 entries this is sub-microsecond.
  Each character typed during search triggers one O(n*m) scan.

- **UI complexity**: The search indicator adds conditional rendering in
  `BottomGridState.buildBottomLeft()`. This uses the existing `TextSpan` /
  `Text` widget infrastructure and does not introduce new widget types.

- **Lines changed**: Approximately 50 lines in `history.ts` (new methods),
  150 lines in `app.ts` (interface + state + handlers + helpers), 30 lines
  in `bottom-grid.ts` (visual indicator). Total approximately 230 new lines.

- **Interaction with Gap 55 (controller hoisting)**: Required. The search
  mode uses `this.inputController.text` to inject matched entries and
  `this.inputController.cursorPosition` to place the cursor.

- **Interaction with Gap 63 (ArrowUp/Down)**: Independent. The
  `_isNavigatingHistory` flag from Gap 63 is reused to prevent the text
  change listener from resetting the linear navigation cursor during
  search text injection. ArrowUp/Down during search mode exit search and
  pass through to the linear navigation handlers.

---

## 11. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Gap 55 (expose TextEditingController) | Required | Controller must be hoisted for text injection |
| Gap 51 (prompt history fix) | Required | Same controller hoisting; this gap replaces Ctrl+R linear nav |
| Gap 63 (ArrowUp/Down navigation) | Recommended | `_isNavigatingHistory` guard reused; arrow keys during search pass through |
| `PromptHistory.isAtReset` | Required | Added by Gap 55; used for draft logic in linear nav |
| `BorderOverlayText` type | Already exists | Defined in input-area.ts lines 16-19 |
| `TextEditingController.text` setter | Already exists | text-field.ts lines 101-108 |
| `TextEditingController.setSelection()` | Already exists | text-field.ts lines 149-158 (for optional match highlighting) |
| `AmpThemeProvider` | Already exists | For theming the search indicator colors |

---

## 12. Implementation Order

1. **Apply Gap 55 first** (controller hoisting, `isAtReset`).
2. **Apply Gap 63** (`_isNavigatingHistory` flag, ArrowUp/Down handlers).
3. **Step 1**: Add `searchBackward()`, `searchForward()`, `length` to
   `PromptHistory`. Write unit tests. Merge independently.
4. **Steps 2-3**: Define `ReverseSearchState`, add `_reverseSearch` field.
5. **Steps 4-5**: Implement `_enterSearchMode()`, `_exitSearchMode()`,
   replace the Ctrl+R handler.
6. **Steps 6-7**: Implement `_handleSearchModeKey()`, `_performSearch()`,
   `_setInputFromSearch()`.
7. **Step 8**: Add `searchState` prop to `BottomGrid`, implement
   `buildBottomLeft()` search indicator rendering.
8. **Optional**: Add match highlighting (Section 6).

Steps 4-7 form the core search functionality and should be committed
together as a single coherent feature. Step 8 (visual indicator) can be
committed separately if desired, though shipping it with the core is
recommended for a complete user experience.

---

## 13. Future Enhancements

### 13.1 Fuzzy Matching

Replace exact substring matching with a fuzzy matching algorithm (like fzf's
Smith-Waterman variant) that ranks matches by relevance and tolerates typos.
This would require a scoring function and potentially highlight the matched
portions with different colors.

### 13.2 Smart Case

If the query contains any uppercase character, switch to case-sensitive
matching. Otherwise use case-insensitive. This matches the convention of
tools like `ripgrep --smart-case` and vim's `smartcase` option.

### 13.3 Search History Persistence

When history persistence (Gap 53) is implemented, the incremental search
would automatically benefit from a larger history spanning multiple sessions,
making it even more valuable for finding commands from previous sessions.

### 13.4 Full-Screen Search Overlay

For very long histories, a full-screen search overlay (similar to fzf) could
show multiple matches simultaneously in a scrollable list, allowing the user
to browse results rather than cycling one-at-a-time with Ctrl+R. This would
be a significant UI feature built on top of the existing `SelectionList`
widget.

### 13.5 Match Substring Highlighting

As described in Section 6, highlighting the matched substring within the
input text provides visual feedback. This can be implemented using
`TextEditingController.setSelection()` or by building a custom `TextSpan`
with highlighted ranges.

### 13.6 Prefix Search Mode

Add a separate key binding (e.g., Ctrl+P) for prefix-only search, which
matches entries that start with the query rather than containing it anywhere.
This is useful for commands that share common prefixes (e.g., `git ` prefix
for all git commands).
