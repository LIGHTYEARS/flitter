/**
 * FlingScrollPhysics — velocity-based momentum scrolling.
 *
 * 逆向: chunk-006.js scroll physics — velocity tracking and deceleration
 *       Amp tracks drag velocity over recent mouse events and animates
 *       with friction-based deceleration on release.
 *
 * Extends the ScrollPhysics interface with:
 * - Velocity tracking over last N mouse events
 * - Deceleration curve with configurable friction coefficient
 * - Integration with ScrollController for fling animations
 *
 * @module
 */

import type { ScrollPhysics } from "./scroll-physics.js";
import { ClampingScrollPhysics } from "./scroll-physics.js";

// ════════════════════════════════════════════════════
//  VelocityTracker
// ════════════════════════════════════════════════════

/** A timestamped position sample for velocity estimation. */
interface PositionSample {
  /** Position (scroll offset) at this sample */
  position: number;
  /** Timestamp in milliseconds */
  timestamp: number;
}

/**
 * Tracks position samples and estimates velocity.
 *
 * 逆向: Amp tracks mouse/touch events with timestamps to compute
 * drag velocity for momentum scrolling.
 *
 * Uses a sliding window of recent position samples to estimate
 * velocity via linear regression over the last N samples.
 */
export class VelocityTracker {
  /** Maximum number of samples to keep */
  private _maxSamples: number;
  /** Sliding window of position samples */
  private _samples: PositionSample[] = [];

  /**
   * Create a VelocityTracker.
   *
   * @param maxSamples - Maximum samples in the sliding window, default 10
   */
  constructor(maxSamples: number = 10) {
    this._maxSamples = maxSamples;
  }

  /**
   * Record a position sample.
   *
   * @param position - Current scroll position
   * @param timestamp - Current time in ms (Date.now())
   */
  addSample(position: number, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    this._samples.push({ position, timestamp: ts });
    // Keep only last N samples
    if (this._samples.length > this._maxSamples) {
      this._samples.shift();
    }
  }

  /**
   * Estimate current velocity in positions per millisecond.
   *
   * Uses the difference between first and last sample in the window.
   * Returns 0 if insufficient samples or time window is too small.
   *
   * @returns Estimated velocity (positive = scrolling down, negative = up)
   */
  estimateVelocity(): number {
    if (this._samples.length < 2) return 0;

    const first = this._samples[0];
    const last = this._samples[this._samples.length - 1];
    const dt = last.timestamp - first.timestamp;

    if (dt <= 0) return 0;

    return (last.position - first.position) / dt;
  }

  /**
   * Clear all samples.
   */
  reset(): void {
    this._samples = [];
  }

  /**
   * Get the number of samples currently tracked.
   */
  get sampleCount(): number {
    return this._samples.length;
  }
}

// ════════════════════════════════════════════════════
//  FlingScrollPhysics
// ════════════════════════════════════════════════════

/**
 * Physics-based fling scrolling with velocity tracking and deceleration.
 *
 * 逆向: Amp's scroll physics combines clamping with momentum:
 * - Clamping: offset stays within [min, max]
 * - Fling: on release with velocity, animate with friction deceleration
 *
 * The deceleration curve uses:
 *   position(t) = initialVelocity / friction * (1 - e^(-friction * t))
 *
 * This is a standard exponential decay friction model.
 */
export class FlingScrollPhysics implements ScrollPhysics {
  /** Friction coefficient — higher = faster deceleration */
  private _friction: number;

  /** Underlying clamping physics for boundary enforcement */
  private _clamping: ClampingScrollPhysics = new ClampingScrollPhysics();

  /** Velocity tracker for drag gestures */
  readonly tracker: VelocityTracker;

  /**
   * Create FlingScrollPhysics.
   *
   * @param friction - Friction coefficient, default 0.015
   * @param maxSamples - Max velocity tracking samples, default 10
   */
  constructor(friction: number = 0.015, maxSamples: number = 10) {
    this._friction = friction;
    this.tracker = new VelocityTracker(maxSamples);
  }

  /** Friction coefficient. */
  get friction(): number {
    return this._friction;
  }

  /**
   * Clamp offset to bounds (delegates to ClampingScrollPhysics).
   */
  clampOffset(offset: number, minExtent: number, maxExtent: number): number {
    return this._clamping.clampOffset(offset, minExtent, maxExtent);
  }

  /**
   * Compute the fling displacement at time t.
   *
   * Uses exponential decay: d(t) = v0 / friction * (1 - e^(-friction * t))
   *
   * @param initialVelocity - Initial velocity in pixels per ms
   * @param elapsedMs - Time elapsed since fling start in ms
   * @returns Displacement from start position
   */
  computeFlingDisplacement(initialVelocity: number, elapsedMs: number): number {
    if (this._friction <= 0) return initialVelocity * elapsedMs;
    return (initialVelocity / this._friction) * (1 - Math.exp(-this._friction * elapsedMs));
  }

  /**
   * Compute the velocity at time t during a fling.
   *
   * v(t) = v0 * e^(-friction * t)
   *
   * @param initialVelocity - Initial velocity
   * @param elapsedMs - Time elapsed in ms
   * @returns Current velocity
   */
  computeFlingVelocity(initialVelocity: number, elapsedMs: number): number {
    return initialVelocity * Math.exp(-this._friction * elapsedMs);
  }

  /**
   * Check if a fling has effectively stopped.
   *
   * @param initialVelocity - Initial fling velocity
   * @param elapsedMs - Time elapsed in ms
   * @param threshold - Minimum velocity to consider "stopped", default 0.01
   * @returns true if the fling has decelerated below threshold
   */
  isFlingComplete(initialVelocity: number, elapsedMs: number, threshold: number = 0.01): boolean {
    return Math.abs(this.computeFlingVelocity(initialVelocity, elapsedMs)) < threshold;
  }

  /**
   * Compute the total distance a fling will travel before stopping.
   *
   * Integral of v0 * e^(-friction * t) from 0 to infinity = v0 / friction
   *
   * @param initialVelocity - Initial fling velocity
   * @returns Total displacement
   */
  computeTotalFlingDistance(initialVelocity: number): number {
    if (this._friction <= 0) return Infinity;
    return initialVelocity / this._friction;
  }
}
