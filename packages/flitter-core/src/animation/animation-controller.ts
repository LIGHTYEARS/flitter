// AnimationController — value-based animation driven by Ticker
// Gap #65: Animation Framework (ANIM-01)
//
// Extends ChangeNotifier to animate a value from lowerBound to upperBound
// over a given duration, using a Ticker for frame-synchronized timing.
// Supports forward(), reverse(), stop(), reset(), mid-animation reversal,
// and optional easing curves.

import { ChangeNotifier } from '../framework/listenable';
import { Ticker } from './ticker';
import { Curves, type Curve } from './curves';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnimationStatus =
  | 'dismissed'   // at lowerBound, not animating
  | 'forward'     // animating toward upperBound
  | 'reverse'     // animating toward lowerBound
  | 'completed';  // at upperBound, not animating

export type AnimationStatusListener = (status: AnimationStatus) => void;

// ---------------------------------------------------------------------------
// AnimationController
// ---------------------------------------------------------------------------

/**
 * Controls an animation value from lowerBound (default 0) to upperBound
 * (default 1) over a given duration, using a Ticker for frame-synchronized
 * timing.
 *
 * Extends ChangeNotifier, so listeners are notified on every value change.
 * Also supports status listeners for transition events.
 *
 * Usage:
 *   const controller = new AnimationController({ duration: 300 });
 *   controller.addListener(() => this.setState(() => {}));
 *   controller.forward();
 *   // ... later
 *   controller.dispose();
 */
export class AnimationController extends ChangeNotifier {
  private _value: number;
  private _status: AnimationStatus = 'dismissed';
  private _duration: number;
  private _ticker: Ticker;
  private _curve: Curve;
  private _lowerBound: number;
  private _upperBound: number;
  private _statusListeners: Set<AnimationStatusListener> = new Set();

  /** The direction of the current animation, if animating. */
  private _direction: 'forward' | 'reverse' = 'forward';

  /** The elapsed time when the animation was last started or reversed. */
  private _animationStartElapsed: number = 0;

  /** The value at which the current animation segment began. */
  private _animationStartValue: number = 0;

  /** The target value for the current animation segment. */
  private _animationTarget: number = 0;

  /** Duration for the current animation segment (may differ from _duration via animateTo). */
  private _segmentDuration: number;

  /** Curve for the current animation segment (may differ from _curve via animateTo). */
  private _segmentCurve: Curve;

  constructor(opts: {
    duration: number;
    value?: number;
    lowerBound?: number;
    upperBound?: number;
    curve?: Curve;
  }) {
    super();
    this._duration = opts.duration;
    this._lowerBound = opts.lowerBound ?? 0;
    this._upperBound = opts.upperBound ?? 1;
    this._value = opts.value ?? this._lowerBound;
    this._curve = opts.curve ?? Curves.linear;
    this._segmentDuration = this._duration;
    this._segmentCurve = this._curve;
    this._ticker = new Ticker((elapsed) => this._tick(elapsed));
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Current animation value in [lowerBound, upperBound]. */
  get value(): number {
    return this._value;
  }

  /** Set value directly (stops any running animation). */
  set value(newValue: number) {
    this.stop();
    this._internalSetValue(newValue);
  }

  /** Current animation status. */
  get status(): AnimationStatus {
    return this._status;
  }

  /** Whether the controller is currently animating. */
  get isAnimating(): boolean {
    return this._ticker.isActive;
  }

  /** Animation duration in milliseconds. */
  get duration(): number {
    return this._duration;
  }

  set duration(d: number) {
    this._duration = d;
  }

  /** The easing curve applied to the animation. */
  get curve(): Curve {
    return this._curve;
  }

  set curve(c: Curve) {
    this._curve = c;
  }

  /**
   * Animate forward from the current value to upperBound.
   * If already at upperBound, completes immediately.
   */
  forward(): void {
    this._direction = 'forward';
    this._segmentDuration = this._duration;
    this._segmentCurve = this._curve;
    this._animateTowards(this._upperBound);
  }

  /**
   * Animate in reverse from the current value to lowerBound.
   * If already at lowerBound, completes immediately.
   */
  reverse(): void {
    this._direction = 'reverse';
    this._segmentDuration = this._duration;
    this._segmentCurve = this._curve;
    this._animateTowards(this._lowerBound);
  }

  /**
   * Animate to a specific target value.
   * Direction is inferred from current value.
   */
  animateTo(target: number, opts?: { duration?: number; curve?: Curve }): void {
    const targetClamped = Math.max(this._lowerBound, Math.min(this._upperBound, target));
    this._direction = targetClamped >= this._value ? 'forward' : 'reverse';
    this._segmentDuration = opts?.duration ?? this._duration;
    this._segmentCurve = opts?.curve ?? this._curve;
    this._animateTowards(targetClamped);
  }

  /** Stop the animation at the current value. */
  stop(): void {
    this._ticker.stop();
  }

  /** Reset to lowerBound without animation. Sets status to 'dismissed'. */
  reset(): void {
    this.stop();
    this._internalSetValue(this._lowerBound);
    this._setStatus('dismissed');
  }

  /** Add a status change listener. */
  addStatusListener(listener: AnimationStatusListener): void {
    this._statusListeners.add(listener);
  }

  /** Remove a status change listener. */
  removeStatusListener(listener: AnimationStatusListener): void {
    this._statusListeners.delete(listener);
  }

  /** Dispose the controller and its ticker. */
  override dispose(): void {
    this._ticker.dispose();
    this._statusListeners.clear();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private _animateTowards(target: number): void {
    // If already at target, set status and return
    if (this._value === target) {
      this._setStatus(
        target === this._upperBound ? 'completed' : 'dismissed',
      );
      return;
    }

    // Capture animation parameters for this segment
    this._animationStartValue = this._value;
    this._animationTarget = target;
    this._animationStartElapsed = 0;

    // If ticker is already running, it will pick up new params on next tick.
    // Otherwise, start it.
    if (!this._ticker.isActive) {
      this._ticker.start();
    }

    this._setStatus(this._direction === 'forward' ? 'forward' : 'reverse');
  }

  private _tick(elapsed: number): void {
    // On the first tick after start, capture the elapsed baseline
    if (this._animationStartElapsed === 0) {
      this._animationStartElapsed = elapsed;
    }

    const animationElapsed = elapsed - this._animationStartElapsed;
    const duration = this._segmentDuration;
    const target = this._animationTarget;

    if (duration <= 0) {
      // Zero duration: jump to target
      this._internalSetValue(target);
      this._ticker.stop();
      this._setStatus(target === this._upperBound ? 'completed' : 'dismissed');
      return;
    }

    const linearProgress = Math.min(animationElapsed / duration, 1);
    const curvedProgress = this._segmentCurve.transform(linearProgress);

    const newValue = this._animationStartValue
      + (target - this._animationStartValue) * curvedProgress;

    this._internalSetValue(newValue);

    if (linearProgress >= 1) {
      // Ensure we hit the exact target
      this._internalSetValue(target);
      this._ticker.stop();
      this._setStatus(target === this._upperBound ? 'completed' : 'dismissed');
    }
  }

  private _internalSetValue(v: number): void {
    const clamped = Math.max(this._lowerBound, Math.min(this._upperBound, v));
    if (clamped !== this._value) {
      this._value = clamped;
      this.notifyListeners();
    }
  }

  private _setStatus(status: AnimationStatus): void {
    if (status === this._status) return;
    this._status = status;
    const snapshot = [...this._statusListeners];
    for (const listener of snapshot) {
      if (this._statusListeners.has(listener)) {
        listener(status);
      }
    }
  }
}
