// WaveSpinner — StatefulWidget that cycles through wave characters on a timer
// Pattern: setInterval(200ms) + setState() frame cycling,
// matching AnimatedExpandSection's timer-driven animation pattern

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../framework/widget';
import { Text } from './text';
import { TextSpan } from '../core/text-span';

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
 * characters. Cycles through the frame sequence [" ", "∼", "≈", "≋", "≈", "∼"]
 * at 200ms intervals, looping continuously.
 *
 * The widget manages its own setInterval timer, starting in initState and
 * cleaning up in dispose. Each tick advances the frame index and triggers
 * a rebuild via setState.
 */
export class WaveSpinner extends StatefulWidget {
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
 * State for WaveSpinner. Manages a setInterval timer that advances the
 * current frame index through the WAVE_FRAMES sequence, rebuilding the
 * widget on each tick.
 */
export class WaveSpinnerState extends State<WaveSpinner> {
  /** Current index into the WAVE_FRAMES array. */
  private _frameIndex: number = 0;

  /** The setInterval handle, null when not running. */
  private _timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the animation timer when the widget is first inserted into the tree.
   */
  override initState(): void {
    super.initState();
    this._startTimer();
  }

  /**
   * Cancel the animation timer when the widget is removed from the tree.
   */
  override dispose(): void {
    this._stopTimer();
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
  // Timer management
  // -----------------------------------------------------------------------

  /**
   * Start the periodic timer that advances the frame index every WAVE_INTERVAL_MS.
   */
  private _startTimer(): void {
    this._timer = setInterval(() => {
      this.setState(() => {
        this._frameIndex = (this._frameIndex + 1) % WAVE_FRAMES.length;
      });
    }, WAVE_INTERVAL_MS);
  }

  /**
   * Stop and clear the animation timer.
   */
  private _stopTimer(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
