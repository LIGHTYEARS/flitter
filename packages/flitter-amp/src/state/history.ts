// Prompt history -- persistent history of previous prompts for Ctrl+R navigation

import {
  readFileSync, writeFileSync, appendFileSync,
  existsSync, mkdirSync,
} from 'node:fs';
import { dirname } from 'node:path';

export class PromptHistory {
  private entries: string[] = [];
  private cursor = -1;
  private readonly maxSize: number;
  private readonly maxEntryLength: number;
  private readonly filePath: string | null;
  private needsFullRewrite = false;

  constructor(maxSize = 100, filePath: string | null = null, maxEntryLength = 10_000) {
    this.maxSize = maxSize;
    this.filePath = filePath;
    this.maxEntryLength = maxEntryLength;

    if (filePath) {
      this.load();
    }
  }

  // --- Persistence: Encode / Decode ---

  /**
   * Encode a prompt entry for single-line storage.
   * Escapes backslashes first, then newlines.
   */
  static encode(entry: string): string {
    return entry
      .replace(/\\/g, '\\\\')   // Step 1: escape backslashes
      .replace(/\n/g, '\\n');    // Step 2: escape newlines
  }

  /**
   * Decode a single line from the history file back to the original entry.
   * Uses a state machine to handle escape sequences correctly.
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
          // Unknown escape -- preserve literally
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

  // --- Persistence: Load ---

  /**
   * Load history entries from the persistence file.
   * Silently ignores missing or unreadable files.
   */
  private load(): void {
    if (!this.filePath) return;
    try {
      if (!existsSync(this.filePath)) return;
      const raw = readFileSync(this.filePath, 'utf-8');
      const lines = raw.split('\n').filter(line => line.length > 0);
      const decoded = lines.map(line => PromptHistory.decode(line));
      // If file has more entries than maxSize, keep only the most recent
      if (decoded.length > this.maxSize) {
        this.entries = decoded.slice(decoded.length - this.maxSize);
        // File is oversized; schedule a rewrite to trim it
        this.needsFullRewrite = true;
      } else {
        this.entries = decoded;
      }
    } catch {
      // File is missing, corrupt, or unreadable -- start with empty history
      this.entries = [];
    }
  }

  // --- Persistence: Save ---

  /**
   * Save the full history to disk, replacing the file contents.
   * Creates parent directories if they do not exist.
   * Safe to call at any time (no-op if no filePath was provided).
   */
  save(): void {
    if (!this.filePath) return;
    try {
      this.ensureDirectory();
      const encoded = this.entries.map(entry => PromptHistory.encode(entry));
      writeFileSync(this.filePath, encoded.join('\n') + '\n', 'utf-8');
      this.needsFullRewrite = false;
    } catch {
      // Disk write failed -- silently degrade (history remains in memory only)
    }
  }

  /**
   * Append a single entry to the history file without rewriting the whole file.
   * Falls back to a full save if a rewrite is pending (e.g., after eviction).
   */
  private appendToFile(text: string): void {
    if (!this.filePath) return;
    if (this.needsFullRewrite) {
      this.save();
      return;
    }
    try {
      this.ensureDirectory();
      const encoded = PromptHistory.encode(text);
      appendFileSync(this.filePath, encoded + '\n', 'utf-8');
    } catch {
      // Append failed -- will be caught by next full save or exit save
    }
  }

  /**
   * Ensure the parent directory of the history file exists.
   */
  private ensureDirectory(): void {
    if (!this.filePath) return;
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // --- Core API (unchanged behavior, persistence hooks added) ---

  private sanitize(text: string): string {
    // eslint-disable-next-line no-control-regex
    let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (cleaned.length > this.maxEntryLength) {
      cleaned = cleaned.slice(0, this.maxEntryLength);
    }
    return cleaned;
  }

  push(text: string): void {
    const sanitized = this.sanitize(text);
    if (sanitized.trim() === '') return;
    if (this.entries.length > 0 && this.entries[this.entries.length - 1] === sanitized) return;
    this.entries.push(sanitized);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
      this.needsFullRewrite = true;
    }
    this.cursor = -1;
    this.appendToFile(sanitized);
  }

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

  next(): string | null {
    if (this.cursor === -1) return null;
    if (this.cursor < this.entries.length - 1) {
      this.cursor++;
      return this.entries[this.cursor];
    }
    this.cursor = -1;
    return ''; // Return empty to restore "new prompt" state
  }

  resetCursor(): void {
    this.cursor = -1;
  }

  /** True when no history navigation is in progress. */
  get isAtReset(): boolean {
    return this.cursor === -1;
  }

  /** Return the number of entries currently in history. */
  get length(): number {
    return this.entries.length;
  }

  getEntries(): string[] {
    return [...this.entries];
  }

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
    const start = fromIndex === undefined
      ? this.entries.length - 1
      : Math.min(fromIndex, this.entries.length - 1);

    if (start < 0) return null;

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
}
