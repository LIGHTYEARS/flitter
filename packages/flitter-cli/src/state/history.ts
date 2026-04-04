/**
 * PromptHistory — persistent, deduplicated prompt history with cursor
 * navigation and incremental search.
 *
 * Cursor semantics: _cursor === _entries.length means "past end" (reset
 * position). Navigation moves the cursor within [0, _entries.length].
 */

import {
  readFileSync, writeFileSync, appendFileSync,
  existsSync, mkdirSync,
} from 'node:fs';
import { dirname } from 'node:path';

export interface PromptHistoryOptions {
  /** Maximum number of entries to retain. */
  maxSize?: number;
  /** Path to the persistent history file (null = in-memory only). */
  filePath?: string | null;
  /** Maximum character length of a single entry (longer entries are truncated). */
  maxEntryLength?: number;
}

export class PromptHistory {
  private _entries: string[] = [];
  private _cursor = 0;
  private readonly _maxSize: number;
  private readonly _maxEntryLength: number;
  private readonly _filePath: string | null;
  private _needsFullRewrite = false;

  constructor(options: PromptHistoryOptions = {}) {
    const {
      maxSize = 100,
      filePath = null,
      maxEntryLength = 10_000,
    } = options;

    this._maxSize = maxSize;
    this._filePath = filePath;
    this._maxEntryLength = maxEntryLength;

    if (this._filePath) {
      this.load();
    }

    this._cursor = this._entries.length;
  }

  // ---------------------------------------------------------------------------
  // Persistence — encode / decode
  // ---------------------------------------------------------------------------

  /**
   * Encode a prompt entry for single-line storage.
   * Escapes backslashes first, then newlines.
   */
  static encode(entry: string): string {
    return entry
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n');
  }

  /**
   * Decode a single line from the history file back to the original entry.
   * Uses a state-machine to handle escape sequences correctly.
   */
  static decode(line: string): string {
    let result = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '\\' && i + 1 < line.length) {
        const next = line[i + 1];
        if (next === 'n') {
          result += '\n';
          i += 2;
        } else if (next === '\\') {
          result += '\\';
          i += 2;
        } else {
          result += line[i];
          i++;
        }
      } else {
        result += line[i];
        i++;
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Persistence — load
  // ---------------------------------------------------------------------------

  /**
   * Load history entries from the persistence file.
   * Silently ignores missing or unreadable files.
   */
  private load(): void {
    if (!this._filePath) return;
    try {
      if (!existsSync(this._filePath)) return;
      const raw = readFileSync(this._filePath, 'utf-8');
      const lines = raw.split('\n').filter(l => l.length > 0);
      const decoded = lines.map(l => PromptHistory.decode(l));
      if (decoded.length > this._maxSize) {
        this._entries = decoded.slice(decoded.length - this._maxSize);
        this._needsFullRewrite = true;
      } else {
        this._entries = decoded;
      }
    } catch {
      this._entries = [];
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence — save
  // ---------------------------------------------------------------------------

  /**
   * Save the full history to disk, replacing the file contents.
   * Creates parent directories if they do not exist.
   * Safe to call at any time (no-op when no filePath was provided).
   */
  save(): void {
    if (!this._filePath) return;
    try {
      this.ensureDirectory();
      const encoded = this._entries.map(e => PromptHistory.encode(e));
      writeFileSync(this._filePath, encoded.join('\n') + '\n', 'utf-8');
      this._needsFullRewrite = false;
    } catch {
      // Disk write failed — silently degrade (history remains in memory only)
    }
  }

  /**
   * Append a single entry to the history file without rewriting the whole file.
   * Falls back to a full save when a rewrite is pending (e.g. after eviction
   * or deduplication removal).
   */
  private appendToFile(text: string): void {
    if (!this._filePath) return;
    if (this._needsFullRewrite) {
      this.save();
      return;
    }
    try {
      this.ensureDirectory();
      const encoded = PromptHistory.encode(text);
      appendFileSync(this._filePath, encoded + '\n', 'utf-8');
    } catch {
      // Append failed — will be caught by next full save or exit save
    }
  }

  /**
   * Ensure the parent directory of the history file exists.
   */
  private ensureDirectory(): void {
    if (!this._filePath) return;
    const dir = dirname(this._filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Sanitize an entry: strip control characters, truncate to _maxEntryLength.
   */
  private sanitize(text: string): string {
    // eslint-disable-next-line no-control-regex
    let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (cleaned.length > this._maxEntryLength) {
      cleaned = cleaned.slice(0, this._maxEntryLength);
    }
    return cleaned;
  }

  /**
   * Push a new entry into history.
   *
   * - Trims and skips empty or over-length entries.
   * - Deduplicates: if the entry already exists anywhere in the list the old
   *   occurrence is removed so the new one appears at the end.
   * - Evicts the oldest entry when _maxSize is exceeded.
   * - Incrementally appends to the persistence file.
   */
  push(text: string): void {
    const sanitized = this.sanitize(text);
    if (sanitized.trim() === '') return;

    const existingIndex = this._entries.indexOf(sanitized);
    if (existingIndex !== -1) {
      this._entries.splice(existingIndex, 1);
      this._needsFullRewrite = true;
    }

    this._entries.push(sanitized);

    if (this._entries.length > this._maxSize) {
      this._entries.shift();
      this._needsFullRewrite = true;
    }

    this._cursor = this._entries.length;
    this.appendToFile(sanitized);
  }

  /**
   * Move cursor backward (toward older entries) and return the entry, or
   * null when already at the oldest entry.
   */
  previous(): string | null {
    if (this._entries.length === 0) return null;
    if (this._cursor <= 0) return null;
    this._cursor--;
    return this._entries[this._cursor]!;
  }

  /**
   * Move cursor forward (toward newer entries) and return the entry, or
   * null when already past the end (reset position).
   */
  next(): string | null {
    if (this._cursor >= this._entries.length) return null;
    this._cursor++;
    if (this._cursor >= this._entries.length) {
      return null;
    }
    return this._entries[this._cursor]!;
  }

  /**
   * Reset cursor to past-end (no navigation in progress).
   */
  resetCursor(): void {
    this._cursor = this._entries.length;
  }

  /** True when no history navigation is in progress. */
  get isAtReset(): boolean {
    return this._cursor === this._entries.length;
  }

  /** Return the number of entries currently in history. */
  get length(): number {
    return this._entries.length;
  }

  /** Return a shallow copy of the entries array. */
  getEntries(): string[] {
    return [...this._entries];
  }

  // ---------------------------------------------------------------------------
  // Search API
  // ---------------------------------------------------------------------------

  /**
   * Search backward (toward older entries) for the next entry containing the
   * given query substring (case-insensitive).
   *
   * @param query     Substring to search for.
   * @param fromIndex Index to begin searching from (inclusive, counting
   *   backward). Defaults to the most recent entry.
   * @returns Matched entry and its index, or null if no match is found.
   */
  searchBackward(
    query: string,
    fromIndex?: number,
  ): { index: number; entry: string } | null {
    if (this._entries.length === 0 || query === '') return null;

    const lowerQuery = query.toLowerCase();
    const start = fromIndex === undefined
      ? this._entries.length - 1
      : Math.min(fromIndex, this._entries.length - 1);

    if (start < 0) return null;

    for (let i = start; i >= 0; i--) {
      if (this._entries[i]!.toLowerCase().includes(lowerQuery)) {
        return { index: i, entry: this._entries[i]! };
      }
    }

    return null;
  }

  /**
   * Search forward (toward newer entries) for the next entry containing the
   * given query substring (case-insensitive).
   *
   * @param query     Substring to search for.
   * @param fromIndex Index to begin searching from (inclusive, counting
   *   forward). Defaults to the oldest entry (index 0).
   * @returns Matched entry and its index, or null if no match is found.
   */
  searchForward(
    query: string,
    fromIndex?: number,
  ): { index: number; entry: string } | null {
    if (this._entries.length === 0 || query === '') return null;

    const lowerQuery = query.toLowerCase();
    const start = Math.max(0, fromIndex ?? 0);

    for (let i = start; i < this._entries.length; i++) {
      if (this._entries[i]!.toLowerCase().includes(lowerQuery)) {
        return { index: i, entry: this._entries[i]! };
      }
    }

    return null;
  }
}
