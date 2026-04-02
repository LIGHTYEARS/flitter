// WaveSpinner — StatefulWidget that cycles through wave characters on a timer
//
// W4-6: Added optional Ticker-based mode for frame-synchronized animation.
// Default uses setInterval for backward compatibility; set useTicker=true
// to use FrameScheduler-integrated Ticker instead.

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../framework/widget';
import { Text } from './text';
import { TextSpan } from '../core/text-span';
import { Ticker } from '../animation/ticker';

// ---------------------------------------------------------------------------
// Frame sequence for the wave animation
// ---------------------------------------------------------------------------

const WAVE_FRAMES: readonly string[] = [' ', '∼', '≈', '≋', '≈', '∼'];
const WAVE_INTERVAL_MS = 200;

// ---------------------------------------------------------------------------
// WaveSpinner
// ---------------------------------------------------------------------------

/**
 * A StatefulWidget that displays a cycling wave animation using Unicode
 * characters. Cycles through the frame sequence at 200ms intervals,
 * looping continuously.
 *
 * Supports two animation modes:
 * - Default (setInterval): backward-compatible timer-driven animation
 * - Ticker mode (useTicker=true): frame-synchronized timing via FrameScheduler
 */
export class WaveSpinner extends StatefulWidget {
  /** When true, use Ticker for frame-synchronized animation instead of setInterval. */
  readonly useTicker: boolean;

  constructor(opts?: { useTicker?: boolean }) {
    super();
    this.useTicker = opts?.useTicker ?? false;
  }

  /**
   * Creates a new WaveSpinner widget.
   */
  createState(): WaveSpinnerState {
    return new WaveSpinnerState();
  }
}

// ---------------------------------------------------------------------------
// WaveSpinnerState
// ---------------------------------------------------------------------------

/**
 * State for WaveSpinner. Supports two animation modes:
 * - setInterval (default): advances frame index via a periodic timer
 * - Ticker (opt-in): uses FrameScheduler-integrated Ticker with elapsed-time gating
 */
export class WaveSpinnerState extends State<WaveSpinner> {
  /** Current index into the WAVE_FRAMES array. */
  private _frameIndex: number = 0;

  /** Ticker for frame-synchronized animation, null when using setInterval mode. */
  private _ticker: Ticker | null = null;

  /** Elapsed time of the last frame advancement (for Ticker interval gating). */
  private _lastFrameElapsed: number = 0;

  /** The setInterval handle, null when using Ticker mode. */
  private _timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the animation when the widget is first inserted into the tree.
   */
  override initState(): void {
    super.initState();
    if (this.widget.useTicker) {
      this._startTicker();
    } else {
      this._startTimer();
    }
  }

  /**
   * Cancel the animation when the widget is removed from the tree.
   */
  override dispose(): void {
    this._stopAnimation();
    super.dispose();
  }

  /**
   * Build a Text widget displaying the current wave frame character.
   */
  build(_context: BuildContext): Widget {
    return new Text({
      text: new TextSpan({ text: WAVE_FRAMES[this._frameIndex] }),
    });
  }

  // -----------------------------------------------------------------------
  // Animation management
  // -----------------------------------------------------------------------

  /**
   * Start Ticker-based animation (frame-synchronized via FrameScheduler).
   */
  private _startTicker(): void {
    this._ticker = new Ticker((elapsed) => this._onTick(elapsed));
    this._lastFrameElapsed = 0;
    this._ticker.start();
  }

  /**
   * Ticker callback: advance the frame when WAVE_INTERVAL_MS has elapsed
   * since the last frame change.
   */
  private _onTick(elapsed: number): void {
    if (elapsed - this._lastFrameElapsed >= WAVE_INTERVAL_MS) {
      this._lastFrameElapsed = elapsed;
      this.setState(() => {
        this._frameIndex = (this._frameIndex + 1) % WAVE_FRAMES.length;
      });
    }
  }

  /**
   * Start the periodic setInterval timer (backward-compatible default path).
   */
  private _startTimer(): void {
    this._timer = setInterval(() => {
      this.setState(() => {
        this._frameIndex = (this._frameIndex + 1) % WAVE_FRAMES.length;
      });
    }, WAVE_INTERVAL_MS);
  }

  /**
   * Stop all animation sources (Ticker and setInterval timer).
   */
  private _stopAnimation(): void {
    if (this._ticker !== null) {
      this._ticker.dispose();
      this._ticker = null;
    }
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
