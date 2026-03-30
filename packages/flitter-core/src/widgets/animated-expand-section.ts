// AnimatedExpandSection — StatefulWidget that animates expand/collapse via SizedBox + ClipRect
// Uses setInterval(16ms) + setState() linear interpolation pattern from ScrollController.animateTo()
// Pattern: follows scroll-controller.ts animateTo() for timer-driven animation

import { Key } from '../core/key';
import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../framework/widget';
import { SizedBox } from './sized-box';
import { ClipRect } from './clip-rect';

// ---------------------------------------------------------------------------
// AnimatedExpandSection
// ---------------------------------------------------------------------------

interface AnimatedExpandSectionProps {
  /** Whether the section should be expanded (visible) or collapsed (hidden). */
  expanded: boolean;
  /** The child content to reveal/hide. */
  child: Widget;
  /** Animation duration in milliseconds. 0 = instant. Default 150. */
  duration?: number;
  /** Optional key. */
  key?: Key;
}

/**
 * A StatefulWidget that animates the height of its child between 0 and the
 * child's natural height, using SizedBox + ClipRect for progressive reveal.
 *
 * When `expanded` transitions from false to true, the child is progressively
 * revealed over `duration` ms. When it transitions from true to false, the
 * child is progressively hidden.
 *
 * The child is always present in the widget tree (wrapped in SizedBox + ClipRect),
 * allowing layout measurement even when collapsed.
 *
 * Mid-animation reversal is supported: toggling during an active animation
 * starts the reverse from the current height, not from 0 or target.
 *
 * Pattern: setInterval(16ms) + Date.now() elapsed + linear interpolation,
 * matching ScrollController.animateTo() in scroll-controller.ts.
 */
export class AnimatedExpandSection extends StatefulWidget {
  readonly expanded: boolean;
  readonly child: Widget;
  readonly duration: number;

  constructor(props: AnimatedExpandSectionProps) {
    super(props.key !== undefined ? { key: props.key } : undefined);
    this.expanded = props.expanded;
    this.child = props.child;
    this.duration = props.duration ?? 150;
  }

  createState(): AnimatedExpandSectionState {
    return new AnimatedExpandSectionState();
  }
}

// ---------------------------------------------------------------------------
// AnimatedExpandSectionState
// ---------------------------------------------------------------------------

export class AnimatedExpandSectionState extends State<AnimatedExpandSection> {
  /** Current visible height in rows. */
  private _animatedHeight: number = 0;

  /** Target natural height of the child (used as expand endpoint). */
  private _targetHeight: number = 0;

  /** The setInterval handle, null when idle. */
  private _animationTimer: ReturnType<typeof setInterval> | null = null;

  /** Date.now() when the current animation started. */
  private _animationStartTime: number = 0;

  /** Height at the start of the current animation. */
  private _startHeight: number = 0;

  /** Height at the end of the current animation. */
  private _endHeight: number = 0;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  override initState(): void {
    super.initState();
    if (this.widget.expanded) {
      // Start fully expanded — use Infinity as sentinel; SizedBox will
      // constrain to the child's actual size during layout.
      this._animatedHeight = Infinity;
    }
  }

  override didUpdateWidget(oldWidget: AnimatedExpandSection): void {
    if (oldWidget.expanded !== this.widget.expanded) {
      this._startAnimation();
    }
  }

  override dispose(): void {
    this._cancelAnimation();
    super.dispose();
  }

  // -----------------------------------------------------------------------
  // Animation
  // -----------------------------------------------------------------------

  /**
   * Starts (or restarts) the height animation toward the new target.
   * If already animating, reversal begins from the current animated height.
   */
  private _startAnimation(): void {
    this._cancelAnimation();

    this._startHeight = this._animatedHeight === Infinity
      ? this._targetHeight
      : this._animatedHeight;
    this._endHeight = this.widget.expanded ? this._targetHeight : 0;
    this._animationStartTime = Date.now();

    const duration = this.widget.duration;

    if (duration <= 0 || this._startHeight === this._endHeight) {
      // Instant mode or no-op
      this.setState(() => {
        this._animatedHeight = this._endHeight;
      });
      return;
    }

    this._animationTimer = setInterval(() => {
      this._tick();
    }, 16);
  }

  /**
   * Per-frame update: advance the animated height based on elapsed time.
   */
  private _tick(): void {
    const elapsed = Date.now() - this._animationStartTime;
    const duration = this.widget.duration;
    const progress = Math.min(elapsed / duration, 1);

    const delta = this._endHeight - this._startHeight;
    const newHeight = Math.round(this._startHeight + delta * progress);

    this.setState(() => {
      this._animatedHeight = newHeight;

      if (progress >= 1) {
        this._cancelAnimation();
      }
    });
  }

  /**
   * Cancels any running animation timer.
   */
  private _cancelAnimation(): void {
    if (this._animationTimer !== null) {
      clearInterval(this._animationTimer);
      this._animationTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // Public accessors (for testing)
  // -----------------------------------------------------------------------

  /** Current animated height value. */
  get animatedHeight(): number {
    return this._animatedHeight;
  }

  /** Whether an animation timer is currently running. */
  get isAnimating(): boolean {
    return this._animationTimer !== null;
  }

  /** Set the target height (for testing / measurement simulation). */
  setTargetHeight(height: number): void {
    this._targetHeight = height;
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  build(_context: BuildContext): Widget {
    return new SizedBox({
      height: this._animatedHeight,
      child: new ClipRect({ child: this.widget.child }),
    });
  }
}
