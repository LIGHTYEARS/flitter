// Curves — easing curve library for TUI animations
// Gap #65: Animation Framework (ANIM-01, ANIM-02)
//
// Provides a minimal set of easing curves appropriate for terminal UI:
// - linear: no easing (backward compatible with existing animations)
// - easeIn: quadratic ease-in (accelerating)
// - easeOut: quadratic ease-out (decelerating)
// - easeInOut: cubic ease-in-out (smooth start and end)
// - decelerate: deceleration curve (for scroll fling)
//
// TUI animations operate on integer values over ~10-15 frames;
// exotic curves (bounce, elastic, spring) require sub-pixel precision
// to be perceptible and are intentionally omitted.

// ---------------------------------------------------------------------------
// Abstract Curve
// ---------------------------------------------------------------------------

/**
 * Abstract base for easing curves.
 * Takes a linear progress value t in [0, 1] and returns a curved value in [0, 1].
 */
export abstract class Curve {
  abstract transform(t: number): number;

  /**
   * Returns the inverse curve (useful for reverse animations).
   * Default implementation returns a FlippedCurve.
   */
  get flipped(): Curve {
    return new FlippedCurve(this);
  }
}

// ---------------------------------------------------------------------------
// Concrete Curves
// ---------------------------------------------------------------------------

/** Linear interpolation (no easing). */
class LinearCurve extends Curve {
  transform(t: number): number {
    return t;
  }
}

/** Quadratic ease-in: starts slow, accelerates. */
class EaseInCurve extends Curve {
  transform(t: number): number {
    return t * t;
  }
}

/** Quadratic ease-out: starts fast, decelerates. */
class EaseOutCurve extends Curve {
  transform(t: number): number {
    return t * (2 - t);
  }
}

/** Cubic ease-in-out: slow start and end, fast middle. */
class EaseInOutCurve extends Curve {
  transform(t: number): number {
    if (t < 0.5) {
      return 2 * t * t;
    }
    return -1 + (4 - 2 * t) * t;
  }
}

/** Deceleration curve (matching Material Design's decelerate). */
class DecelerateCurve extends Curve {
  transform(t: number): number {
    const inv = 1 - t;
    return 1 - inv * inv;
  }
}

/** Flips a curve so it runs in the opposite direction. */
class FlippedCurve extends Curve {
  private _base: Curve;

  constructor(base: Curve) {
    super();
    this._base = base;
  }

  transform(t: number): number {
    return 1 - this._base.transform(1 - t);
  }
}

// ---------------------------------------------------------------------------
// Interval
// ---------------------------------------------------------------------------

/**
 * Restricts a curve to a sub-interval of [0, 1].
 * Useful for staggered animations.
 */
export class Interval extends Curve {
  private _begin: number;
  private _end: number;
  private _curve: Curve;

  constructor(begin: number, end: number, curve?: Curve) {
    super();
    this._begin = begin;
    this._end = end;
    this._curve = curve ?? Curves.linear;
  }

  transform(t: number): number {
    if (t <= this._begin) return 0;
    if (t >= this._end) return 1;
    const localT = (t - this._begin) / (this._end - this._begin);
    return this._curve.transform(localT);
  }
}

// ---------------------------------------------------------------------------
// Standard Curve Constants
// ---------------------------------------------------------------------------

/**
 * Standard curve constants.
 * TUI-appropriate subset -- omits bounce, elastic, and spring curves
 * that require sub-pixel precision to be visually meaningful.
 */
export const Curves = {
  /** No easing. Matches current ScrollController and all existing animations. */
  linear: new LinearCurve() as Curve,

  /** Quadratic ease-in. Useful for exit animations (accelerating away). */
  easeIn: new EaseInCurve() as Curve,

  /** Quadratic ease-out. Useful for entry animations (decelerating into place). */
  easeOut: new EaseOutCurve() as Curve,

  /** Cubic ease-in-out. Useful for bidirectional animations. */
  easeInOut: new EaseInOutCurve() as Curve,

  /** Deceleration curve. Useful for fling/scroll deceleration. */
  decelerate: new DecelerateCurve() as Curve,
} as const;
