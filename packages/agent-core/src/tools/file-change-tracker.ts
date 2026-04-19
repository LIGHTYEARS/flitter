/**
 * @flitter/agent-core — FileChangeTracker
 *
 * Records per-file edit history so that edits can be undone.
 * Used by WriteTool, EditTool, and UndoEditTool.
 *
 * 逆向: amp's fileChangeTracker with record() / getLastEdit() / revert()
 * (modules/2026_tail_anonymous.js:14302-14334)
 *
 * @example
 * ```ts
 * const tracker = new FileChangeTracker();
 * tracker.record('/path/to/file', 'old content', 'new content');
 * const last = tracker.getLastEdit('/path/to/file');
 * tracker.revertLastEdit('/path/to/file');
 * ```
 */

export interface FileChange {
  /** Absolute path to the changed file */
  path: string;
  /** Content before the edit */
  oldContent: string;
  /** Content after the edit */
  newContent: string;
  /** Timestamp when the change was recorded */
  timestamp: number;
}

/**
 * FileChangeTracker — per-file edit history stack.
 *
 * Each file maintains a stack of changes. `record()` pushes,
 * `getLastEdit()` peeks, `revertLastEdit()` pops and returns.
 *
 * 逆向: amp uses fileChangeTracker.record() in write/edit handlers,
 * and fileChangeTracker.getLastEdit() / .revert() in undo_edit (RGR).
 */
export class FileChangeTracker {
  private history: Map<string, FileChange[]> = new Map();

  /**
   * Record a file change (push to per-file stack).
   * Called by Write/Edit tools before writing new content.
   */
  record(path: string, oldContent: string, newContent: string): void {
    let stack = this.history.get(path);
    if (!stack) {
      stack = [];
      this.history.set(path, stack);
    }
    stack.push({
      path,
      oldContent,
      newContent,
      timestamp: Date.now(),
    });
  }

  /**
   * Peek at the last edit for a file (does not remove).
   * Returns null if no edit history exists.
   */
  getLastEdit(path: string): FileChange | null {
    const stack = this.history.get(path);
    if (!stack || stack.length === 0) return null;
    return stack[stack.length - 1];
  }

  /**
   * Pop the last edit for a file and return it.
   * Returns null if no edit history exists.
   *
   * 逆向: amp's r.revert() in RGR (undo_edit handler)
   */
  revertLastEdit(path: string): FileChange | null {
    const stack = this.history.get(path);
    if (!stack || stack.length === 0) return null;
    const change = stack.pop()!;
    if (stack.length === 0) {
      this.history.delete(path);
    }
    return change;
  }

  /**
   * Get full edit history for a file (oldest first).
   */
  getHistory(path: string): FileChange[] {
    return this.history.get(path) ?? [];
  }

  /**
   * Clear all edit history for all files.
   */
  clear(): void {
    this.history.clear();
  }
}
