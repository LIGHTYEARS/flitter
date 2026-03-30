// Ticker — frame-synchronized timer that integrates with FrameScheduler
// Gap #65: Animation Framework (ANIM-01)
//
// Replaces raw setInterval as the timing mechanism for animations.
// Registers a BUILD-phase callback with FrameScheduler so animation
// values are updated before widgets rebuild, and only fires when a
// frame is actually being produced.

import { FrameScheduler } from '../scheduler/frame-scheduler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TickerCallback = (elapsed: number) => void;

// ---------------------------------------------------------------------------
// Ticker
// ---------------------------------------------------------------------------

/**
 * A timer that fires once per frame, synchronized with the FrameScheduler.
 *
 * Unlike setInterval (which fires at arbitrary times), a Ticker fires
 * exactly once during the BUILD phase of each frame. This ensures:
 * - Animation values are updated before widget rebuild
 * - Multiple animations sharing a frame advance in lockstep
 * - No extra frame requests from misaligned timer firings
 *
 * Usage:
 *   const ticker = new Ticker((elapsed) => {
 *     controller.tick(elapsed);
 *   });
 *   ticker.start();
 *   // ... later
 *   ticker.stop();
 *   ticker.dispose();
 */
export class Ticker {
  private _callback: TickerCallback;
  private _schedulerId: string | null = null;
  private _startTime: number = 0;
  private _active: boolean = false;
  private _disposed: boolean = false;

  /** Monotonically increasing ID for unique FrameScheduler registration. */
  private static _nextId = 0;

  constructor(callback: TickerCallback) {
    this._callback = callback;
  }

  /** Whether this ticker is currently scheduled and firing. */
  get isActive(): boolean {
    return this._active;
  }

  /**
   * Start the ticker. Registers a BUILD-phase callback with the
   * FrameScheduler at priority -1500 (after resize processing at -1000,
   * before buildScopes at 0). Each frame, the callback receives the
   * elapsed time since start() was called.
   */
  start(): void {
    if (this._disposed) {
      throw new Error('Cannot start a disposed Ticker');
    }
    if (this._active) return;

    this._active = true;
    this._startTime = performance.now();
    this._schedulerId = `ticker_${Ticker._nextId++}`;

    FrameScheduler.instance.addFrameCallback(
      this._schedulerId,
      () => this._tick(),
      'build',
      -1500,  // After resize (-2000/-1000), before buildScopes (0)
      this._schedulerId,
    );

    // Request the first frame
    FrameScheduler.instance.requestFrame();
  }

  /** Stop the ticker. Removes the FrameScheduler callback. */
  stop(): void {
    if (!this._active) return;
    this._active = false;

    if (this._schedulerId) {
      FrameScheduler.instance.removeFrameCallback(this._schedulerId);
      this._schedulerId = null;
    }
  }

  /** Dispose the ticker permanently. Cannot be restarted after disposal. */
  dispose(): void {
    this.stop();
    this._disposed = true;
  }

  private _tick(): void {
    if (!this._active) return;
    const elapsed = performance.now() - this._startTime;
    this._callback(elapsed);

    // Request next frame to keep the ticker firing
    if (this._active) {
      FrameScheduler.instance.requestFrame();
    }
  }
}
