/**
 * PromptHistory — stack-based prompt history with up/down navigation.
 *
 * 逆向: qKT class in chunk-003.js (lines ~13807-13971)
 *   - history = [] array, index = -1 cursor
 *   - previous(): from -1 starts at end; at 0 stays; else decrements
 *   - next(): increments; past end returns null and resets to -1
 *   - reset(): sets index = -1
 *   - add(): trims, dedup last, push, evict oldest, calls reset()
 *
 * Consumer-side draft preservation (historyDraft/historyIndex in chunk-006.js
 * lines ~34320-34962) is folded into this class via startNavigation(draft).
 *
 * NavigateToPromptHistoryIntent (DM) in actions_intents.js carries a
 * `direction` field used by navigateHistoryPrevious / navigateHistoryNext.
 */

export interface PromptHistoryOptions {
  maxEntries?: number;
}

export class PromptHistory {
  private readonly _maxEntries: number;
  private _entries: string[] = [];
  private _cursor = -1;
  private _draft: string = "";
  private _navigating = false;

  constructor(opts: PromptHistoryOptions = {}) {
    this._maxEntries = opts.maxEntries ?? 500;
  }

  /** Readonly view of the stored history entries (oldest first). */
  get entries(): readonly string[] {
    return this._entries;
  }

  /**
   * Whether navigation is active. Task 3 uses this to prevent
   * startNavigation() from being called on every ArrowUp press
   * (which would overwrite the saved draft).
   */
  get isNavigating(): boolean {
    return this._navigating;
  }

  /**
   * Record a submitted prompt.
   *
   * 逆向: qKT.add() — trims, skips empty, deduplicates consecutive,
   * pushes to array, evicts oldest if over maxSize, calls reset().
   */
  push(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Deduplicate consecutive — matches amp: `this.history[this.history.length - 1]?.text === T`
    if (this._entries.length > 0 && this._entries[this._entries.length - 1] === trimmed) {
      return;
    }

    this._entries.push(trimmed);

    // Evict oldest if over limit — matches amp: `e.slice(e.length - this.maxSize)`
    if (this._entries.length > this._maxEntries) {
      this._entries.shift();
    }

    // Reset navigation state — matches amp: `this.reset()` at end of add()
    this._navigating = false;
    this._cursor = -1;
  }

  /**
   * Begin arrow-key navigation, saving the current editor draft.
   *
   * 逆向: Consumer-side in chunk-006.js navigateHistoryPrevious:
   *   `if (this.historyIndex === -1) this.historyDraft = this.textController.text;`
   * We fold that into this class so Task 3 can just call startNavigation()
   * once, guarded by isNavigating.
   */
  startNavigation(currentDraft: string): void {
    this._draft = currentDraft;
    this._cursor = this._entries.length; // Points past the end (= draft position)
    this._navigating = true;
  }

  /**
   * Whether we can navigate to an older entry.
   *
   * 逆向: amp's previous() returns null when history is empty.
   * Here we additionally require cursor > 0 so the caller can
   * check before calling goBack().
   */
  canGoBack(): boolean {
    return this._entries.length > 0 && this._cursor > 0;
  }

  /**
   * Whether we can navigate to a newer entry (or back to draft).
   *
   * 逆向: amp's next() returns null when index === -1.
   * Here we require _navigating && cursor < entries.length
   * (cursor === entries.length means we're at the draft position).
   */
  canGoForward(): boolean {
    return this._navigating && this._cursor < this._entries.length;
  }

  /**
   * Navigate to the previous (older) history entry.
   *
   * 逆向: qKT.previous() — at index 0 stays there;
   * from -1 starts at end; else decrements.
   * Amp returns history[index].text.
   */
  goBack(): string {
    if (!this._navigating) return this._draft;
    if (this._cursor > 0) {
      this._cursor--;
    }
    return this._entries[this._cursor] ?? this._draft;
  }

  /**
   * Navigate to the next (newer) history entry, or back to draft.
   *
   * 逆向: qKT.next() — increments; if past end, resets to -1
   * and returns null. Consumer then restores historyDraft.
   * We unify: if cursor reaches entries.length, return draft.
   */
  goForward(): string {
    if (!this._navigating) return this._draft;
    if (this._cursor < this._entries.length) {
      this._cursor++;
    }
    if (this._cursor >= this._entries.length) {
      return this._draft;
    }
    return this._entries[this._cursor];
  }
}
