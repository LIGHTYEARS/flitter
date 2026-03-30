// Activity-based idle detection for adaptive heartbeat intervals (Gap #58)
//
// Tracks protocol activity to optimize heartbeat frequency. When the
// connection is actively transferring data, heartbeat interval can be
// extended because stream activity itself proves liveness.

export class ActivityTracker {
  private lastActivityAt: number = Date.now();

  /** Record that protocol activity occurred. */
  recordActivity(): void {
    this.lastActivityAt = Date.now();
  }

  /** Milliseconds since last observed protocol activity. */
  get idleDurationMs(): number {
    return Date.now() - this.lastActivityAt;
  }

  /** Timestamp of last recorded activity. */
  get lastActivity(): number {
    return this.lastActivityAt;
  }

  /**
   * Compute the effective heartbeat interval based on activity.
   * - If the connection was active in the last 30 seconds, use a relaxed
   *   interval (3x the base) because the stream is demonstrably alive.
   * - Otherwise, use the configured base interval.
   */
  effectiveInterval(baseIntervalMs: number): number {
    const ACTIVE_THRESHOLD_MS = 30_000;
    if (this.idleDurationMs < ACTIVE_THRESHOLD_MS) {
      return baseIntervalMs * 3;  // Relax: stream is active
    }
    return baseIntervalMs;        // Standard: need proactive probing
  }

  /** Reset the tracker (e.g., on reconnection). */
  reset(): void {
    this.lastActivityAt = Date.now();
  }
}
