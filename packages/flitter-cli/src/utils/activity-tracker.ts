// Activity tracker for user idle detection (N6).
//
// Tracks the last user interaction timestamp and provides helpers
// to query idle duration and threshold checks.

/**
 * ActivityTracker records user interactions and computes idle time.
 *
 * Call `touch()` on any user activity (keypress, mouse, etc.).
 * Query `idleMs()` or `isIdle(threshold)` to check inactivity.
 */
export class ActivityTracker {
  private _lastActivity: number;

  constructor() {
    this._lastActivity = Date.now();
  }

  /** Record a user activity event (resets the idle timer). */
  touch(): void {
    this._lastActivity = Date.now();
  }

  /** Milliseconds since the last recorded activity. */
  idleMs(): number {
    return Date.now() - this._lastActivity;
  }

  /** True if idle time exceeds the given threshold in milliseconds. */
  isIdle(thresholdMs: number): boolean {
    return this.idleMs() >= thresholdMs;
  }

  /** Timestamp of the last recorded activity. */
  get lastActivity(): number {
    return this._lastActivity;
  }
}
