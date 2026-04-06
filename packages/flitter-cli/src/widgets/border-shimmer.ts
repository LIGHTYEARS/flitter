// BorderShimmer — StatefulWidget that renders a left-to-right or right-to-left
// shimmer sweep animation on the top border line of InputArea.
//
// Triggered by an external `trigger` counter (agentModePulseSeq): whenever
// the trigger value changes, the shimmer starts a single sweep animation.
// The widget renders a row of colored characters with a gradient trail using
// lerpColor, simulating a highlight that travels across the border.
//
// Architecture:
//   - StatefulWidget: holds _position and _active state.
//   - Uses setInterval (same as WaveSpinner) for broad Bun/Node compatibility.
//   - Animation: one full sweep (right-to-left by default), then stops.
//   - Gradient: `trail` character-wide gradient from color → backgroundColor.
//
// Phase 23, Plan 03 (D-14/D-15).

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Row } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color, lerpColor } from '../../../flitter-core/src/core/color';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Speed in characters per interval tick (how many columns the head advances per frame). */
const SHIMMER_SPEED = 2;
/** Interval between frames in milliseconds. */
const SHIMMER_INTERVAL_MS = 80;
/** Default direction for the shimmer sweep. */
type ShimmerDirection = 'left-to-right' | 'right-to-left';

// ---------------------------------------------------------------------------
// BorderShimmerProps
// ---------------------------------------------------------------------------

/** Props for the BorderShimmer widget. */
interface BorderShimmerProps {
  /** Highlight color for the shimmer head. */
  color: Color;
  /** Background color used as the "off" state for trail gradient. */
  backgroundColor: Color;
  /** Monotonically-incrementing value; when it changes, starts a new shimmer sweep. */
  trigger: number;
  /** Number of characters in the gradient trail. Default 5. */
  trail?: number;
  /** Sweep direction. Default 'right-to-left'. */
  direction?: ShimmerDirection;
  /** Fixed width for the shimmer bar in columns. Defaults to terminal width or 80. */
  width?: number;
}

// ---------------------------------------------------------------------------
// BorderShimmer widget
// ---------------------------------------------------------------------------

/**
 * Renders a single-row shimmer sweep animation on a border line.
 *
 * When `trigger` changes, a gradient highlight sweeps across the width
 * of the widget from right to left (or left to right). The sweep pauses
 * once it exits the visible area.
 *
 * The animation uses setInterval for broad runtime compatibility.
 */
export class BorderShimmer extends StatefulWidget {
  readonly color: Color;
  readonly backgroundColor: Color;
  readonly trigger: number;
  readonly trail: number;
  readonly direction: ShimmerDirection;
  readonly width?: number;

  constructor(props: BorderShimmerProps) {
    super();
    this.color = props.color;
    this.backgroundColor = props.backgroundColor;
    this.trigger = props.trigger;
    this.trail = props.trail ?? 5;
    this.direction = props.direction ?? 'right-to-left';
    this.width = props.width;
  }

  createState(): BorderShimmerState {
    return new BorderShimmerState();
  }
}

// ---------------------------------------------------------------------------
// BorderShimmerState
// ---------------------------------------------------------------------------

/**
 * State for BorderShimmer.
 *
 * Tracks the current position of the shimmer head and whether the animation
 * is active. The position is a column index; negative means the head has
 * not yet entered the visible area (or has exited it).
 */
class BorderShimmerState extends State<BorderShimmer> {
  /** Current column position of the shimmer head (0 = left edge). */
  private _position = -1;
  /** Whether the sweep animation is currently running. */
  private _active = false;
  /** setInterval handle for the animation loop. */
  private _timer: ReturnType<typeof setInterval> | null = null;
  /** The trigger value we last saw — used to detect changes in didUpdateWidget. */
  private _lastTrigger = 0;

  /**
   * Store the initial trigger value so we can detect future changes.
   * Do NOT start animation on first mount (trigger=0 is the idle state).
   */
  override initState(): void {
    super.initState();
    this._lastTrigger = this.widget.trigger;
  }

  /**
   * Detect trigger changes and start a new sweep when the agent mode changes.
   * Only reacts to trigger increments > 0 (ignores initial mount).
   */
  override didUpdateWidget(oldWidget: BorderShimmer): void {
    super.didUpdateWidget(oldWidget);
    if (this.widget.trigger !== this._lastTrigger) {
      this._lastTrigger = this.widget.trigger;
      if (this.widget.trigger > 0) {
        this._startAnimation();
      }
    }
  }

  /**
   * Stop and dispose the animation timer when the widget is removed from the tree.
   */
  override dispose(): void {
    this._stopAnimation();
    super.dispose();
  }

  /**
   * Build a single-row Row of Text widgets that renders the shimmer gradient.
   *
   * When the animation is not active, renders a transparent / empty row.
   */
  build(_context: BuildContext): Widget {
    const totalWidth = this.widget.width ?? (process.stdout.columns || 80) - 2;

    if (!this._active) {
      // Idle: render an invisible single-row spacer.
      return new SizedBox({ width: totalWidth, height: 1 });
    }

    return this._buildShimmerRow(totalWidth);
  }

  // -------------------------------------------------------------------------
  // Private animation helpers
  // -------------------------------------------------------------------------

  /**
   * Start the shimmer sweep from the appropriate edge based on direction.
   * If an animation is already running, restart from the edge.
   */
  private _startAnimation(): void {
    this._stopAnimation();
    const totalWidth = this.widget.width ?? (process.stdout.columns || 80) - 2;
    // Right-to-left: head starts at far right (position = totalWidth - 1).
    // Left-to-right: head starts just off the left edge (position = -1).
    this._position = this.widget.direction === 'right-to-left' ? totalWidth - 1 : -1;
    this._active = true;

    this._timer = setInterval(() => {
      this._onTick(totalWidth);
    }, SHIMMER_INTERVAL_MS);
  }

  /**
   * Advance the shimmer position by SHIMMER_SPEED columns per tick.
   * Stop animation when the head exits the visible area.
   */
  private _onTick(totalWidth: number): void {
    const isRtl = this.widget.direction === 'right-to-left';
    const delta = isRtl ? -SHIMMER_SPEED : SHIMMER_SPEED;
    const newPosition = this._position + delta;

    // Check exit condition.
    const exited = isRtl
      ? newPosition + this.widget.trail < 0       // head + trail fully left of visible
      : newPosition - this.widget.trail >= totalWidth; // head + trail fully right of visible

    if (exited) {
      this._stopAnimation();
      this.setState(() => {
        this._active = false;
        this._position = -1;
      });
    } else {
      this.setState(() => {
        this._position = newPosition;
      });
    }
  }

  /**
   * Stop the animation timer without changing active/position state.
   */
  private _stopAnimation(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Build the shimmer row as a Row of Text spans.
   *
   * Each column is one character '─'. The shimmer head column uses the full
   * highlight color; trailing columns use lerpColor(color, backgroundColor, t)
   * where t = 1 (full background) at the end of the trail. Columns outside
   * the trail use the background color (border color, rendered as '─').
   *
   * The border character '─' is used to preserve the visual border line.
   */
  private _buildShimmerRow(totalWidth: number): Widget {
    const children: Widget[] = [];

    for (let col = 0; col < totalWidth; col++) {
      const distFromHead = this.widget.direction === 'right-to-left'
        ? col - this._position    // positive values are to the right of head (the trail)
        : this._position - col;   // positive values are to the left of head (the trail)

      let charColor: Color;
      const borderChar = '\u2500'; // '─'

      if (distFromHead === 0) {
        // Shimmer head: full highlight color.
        charColor = this.widget.color;
      } else if (distFromHead > 0 && distFromHead <= this.widget.trail) {
        // Trail: gradient from highlight to background.
        const t = distFromHead / this.widget.trail;
        charColor = lerpColor(this.widget.color, this.widget.backgroundColor, t);
      } else {
        // Outside shimmer: background border color.
        charColor = this.widget.backgroundColor;
      }

      children.push(
        new Text({
          text: new TextSpan({
            text: borderChar,
            style: new TextStyle({ foreground: charColor }),
          }),
        }),
      );
    }

    return new Row({
      mainAxisSize: 'min',
      children,
    });
  }
}
