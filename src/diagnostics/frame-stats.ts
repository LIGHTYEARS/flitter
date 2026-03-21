// FrameStats — Collects per-frame timing in a rolling ring buffer
// Amp ref: BB0 (PerformanceTracker)
// Source: .reference/frame-scheduler.md

const DEFAULT_CAPACITY = 1024;

/**
 * Collects per-frame timing data in a rolling ring buffer.
 * Provides percentile-based statistics (P50, P95, P99) and per-phase breakdowns.
 *
 * Amp ref: PerformanceTracker internals
 */
export class FrameStats {
  private _buffer: Float64Array;
  private _index: number = 0;
  private _count: number = 0;

  private _phaseTimings: Map<string, Float64Array> = new Map();
  private _phaseIndex: Map<string, number> = new Map();
  private _phaseCount: Map<string, number> = new Map();

  readonly capacity: number;

  constructor(capacity: number = DEFAULT_CAPACITY) {
    this.capacity = capacity;
    this._buffer = new Float64Array(capacity);
  }

  /**
   * Record a total frame time in milliseconds.
   * Pushes to the ring buffer, wrapping around when full.
   */
  recordFrame(totalMs: number): void {
    this._buffer[this._index] = totalMs;
    this._index = (this._index + 1) % this.capacity;
    this._count++;
  }

  /**
   * Record a phase timing (e.g. 'build', 'layout', 'paint', 'render').
   * Each phase has its own independent ring buffer.
   */
  recordPhase(phase: string, ms: number): void {
    if (!this._phaseTimings.has(phase)) {
      this._phaseTimings.set(phase, new Float64Array(this.capacity));
      this._phaseIndex.set(phase, 0);
      this._phaseCount.set(phase, 0);
    }

    const buffer = this._phaseTimings.get(phase)!;
    const index = this._phaseIndex.get(phase)!;
    buffer[index] = ms;
    this._phaseIndex.set(phase, (index + 1) % this.capacity);
    this._phaseCount.set(phase, this._phaseCount.get(phase)! + 1);
  }

  /** Total number of frames recorded (may exceed capacity). */
  get frameCount(): number {
    return this._count;
  }

  /** The most recent frame time in milliseconds. Returns 0 if no frames recorded. */
  get lastFrameMs(): number {
    if (this._count === 0) return 0;
    // The last written index is (_index - 1), wrapping around
    const lastIdx = (this._index - 1 + this.capacity) % this.capacity;
    return this._buffer[lastIdx]!;
  }

  /**
   * Get the P(p) percentile from the frame ring buffer.
   * @param p Percentile in [0..100]
   * @returns The value at that percentile, or 0 if no data
   */
  getPercentile(p: number): number {
    return this._getPercentileFromBuffer(this._buffer, this._count, p);
  }

  /**
   * Get the P(p) percentile for a specific phase.
   * @param phase Phase name (e.g. 'build', 'layout')
   * @param p Percentile in [0..100]
   * @returns The value at that percentile, or 0 if no data
   */
  getPhasePercentile(phase: string, p: number): number {
    const buffer = this._phaseTimings.get(phase);
    const count = this._phaseCount.get(phase);
    if (!buffer || !count) return 0;
    return this._getPercentileFromBuffer(buffer, count, p);
  }

  /** Shortcut for getPercentile(50) — median. */
  get p50(): number {
    return this.getPercentile(50);
  }

  /** Shortcut for getPercentile(95). */
  get p95(): number {
    return this.getPercentile(95);
  }

  /** Shortcut for getPercentile(99). */
  get p99(): number {
    return this.getPercentile(99);
  }

  /** Average frame time in milliseconds. Returns 0 if no data. */
  get averageMs(): number {
    const n = Math.min(this._count, this.capacity);
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += this._buffer[i]!;
    }
    return sum / n;
  }

  /** Reset all data (frame buffer and all phase buffers). */
  reset(): void {
    this._buffer.fill(0);
    this._index = 0;
    this._count = 0;
    this._phaseTimings.clear();
    this._phaseIndex.clear();
    this._phaseCount.clear();
  }

  /**
   * Internal: compute percentile from a ring buffer.
   * Sort the last min(count, capacity) samples, return value at floor(N * p / 100).
   */
  private _getPercentileFromBuffer(
    buffer: Float64Array,
    count: number,
    p: number,
  ): number {
    const n = Math.min(count, this.capacity);
    if (n === 0) return 0;

    // Copy the actual samples into a temporary array for sorting
    const samples = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      samples[i] = buffer[i]!;
    }
    samples.sort();

    // Compute index: floor(N * p / 100), clamped to [0, n-1]
    const idx = Math.min(Math.floor(n * p / 100), n - 1);
    return samples[idx]!;
  }
}
