# Gap A01 (Gap #65): No Shared Animation Framework

## Problem Statement

Flitter lacks a shared animation framework. Every animated widget independently
implements its own `setInterval` + `setState` timer loop, duplicating the same
boilerplate for timer creation, lifecycle management (start/stop/dispose), and
value interpolation. There is no `AnimationController`, `Ticker`, or `Curves`
library analogous to Flutter's animation system.

This is explicitly identified in `REQUIREMENTS.md` lines 186-190 as deferred
to v2:

```
### Animation
- **ANIM-01**: Tween-based animation controller
- **ANIM-02**: Curve library (ease, bounce, elastic)
- **ANIM-03**: AnimatedContainer, AnimatedOpacity widgets
```

And in the "Explicitly Out of Scope" table (line 211):

```
| Animation framework (Tween/Curve) | Amp uses timer-based scheduling, not tweens |
```

The analysis files document this gap repeatedly:
- `amp-src-analysis-44.md` line 192: "No Animation Controller Abstraction"
- `amp-src-analysis-44.md` line 393: "There is no shared animation controller, ticker, or animation curve system."
- `amp-src-analysis-38.md` line 229: "No Shared Animation Framework"
- `amp-src-analysis-50.md` line 512: "Animation framework | AnimationController, Tween, Curves | Minimal (timer-based in DensityOrb)"

### Current Ad-Hoc Animation Inventory

Every animated widget in the codebase manages its own `setInterval` independently.
The full inventory from analysis-44:

| Widget | File | Interval | Pattern |
|--------|------|----------|---------|
| `BrailleSpinner` via `ToolHeader` | `packages/flitter-amp/src/widgets/tool-call/tool-header.ts:84` | 100ms | Conditional start/stop on `status` |
| `CollapsibleDrawer` spinner | `packages/flitter-core/src/widgets/collapsible-drawer.ts:261` | 200ms | Conditional start/stop on `spinner` prop |
| `ScrollController.animateTo` | `packages/flitter-core/src/widgets/scroll-controller.ts:90` | 16ms | Finite duration, self-terminating |
| `GlowText` | `packages/flitter-amp/src/widgets/glow-text.ts:66` | 100ms | Unconditional, always-on |
| `OrbWidget` (deprecated) | `packages/flitter-amp/src/widgets/orb-widget.ts:103` | 100ms | Unconditional, always-on |
| `DensityOrbWidget` | `packages/flitter-amp/src/widgets/density-orb-widget.ts:122` | 100ms | Unconditional, always-on |
| `HandoffTool` blink | `packages/flitter-amp/src/widgets/tool-call/handoff-tool.ts:70` | 700ms | Conditional start/stop on `status` |

### Problems with the Current Approach

**1. Boilerplate Duplication.** Every animated widget repeats the same 15-20 lines
of timer management code:

```typescript
// This pattern appears in 7+ widgets, nearly identical each time:
private timer: ReturnType<typeof setInterval> | null = null;

initState(): void {
  super.initState();
  this.timer = setInterval(() => {
    this.setState(() => { /* mutate state */ });
  }, INTERVAL);
}

dispose(): void {
  if (this.timer) { clearInterval(this.timer); this.timer = null; }
  super.dispose();
}
```

**2. Timers are Not Synchronized to Frames.** Each `setInterval` fires
independently from the `FrameScheduler`'s 60fps pipeline. A 100ms timer
may fire between frames, triggering `requestFrame()` at an arbitrary offset
from the frame boundary. As noted in analysis-44 (line 196): "Animations are
not synchronized to the frame boundary. Multiple animations may fire at
slightly different times, potentially causing extra frame requests."

**3. No Interpolation Curves.** `ScrollController.animateTo()` uses linear
interpolation only (line 95: `const newOffset = startOffset + delta * progress`).
There is no easing function library. All future animations (expand/collapse from
gap #36, opacity fades from ANIM-03) would need to implement their own curves
or settle for linear motion.

**4. No Shared Time Base.** Each widget maintains its own `timeOffset` counter
(`glow-text.ts:62`, `orb-widget.ts:99`, `density-orb-widget.ts:113`). These
offsets drift independently. There is no global animation clock that widgets
can reference for coordinated effects.

**5. Stateful Upgrade Tax.** Widgets that are conceptually stateless must become
`StatefulWidget` solely to host a timer (analysis-44, line 351: "Several widgets
that are conceptually 'stateless' become StatefulWidget solely to host a timer").

### Scope Clarification

This gap proposes a **minimal, TUI-appropriate** animation framework -- not a full
port of Flutter's animation system. Flutter's animation framework includes
`TickerProvider` mixins, `AnimationController` with `vsync`, `CurvedAnimation`,
`Tween`, `AnimatedBuilder`, `ImplicitlyAnimatedWidget`, and 50+ easing curves.
Most of this complexity serves pixel-based GUI rendering where sub-pixel
interpolation and 60fps smoothness are essential.

In a TUI context:
- Values snap to integers (row heights, column positions)
- Most animations are decorative (spinners, glow effects)
- The dominant animation rate is 10fps, not 60fps
- Easing curves over 15 integer steps are nearly imperceptible

The framework proposed here is deliberately minimal: a `Ticker`, an
`AnimationController`, a small `Curves` library, and a `TickerProviderMixin` --
approximately 300 lines of production code that eliminate the boilerplate and
provide a foundation for future animated widgets.

---

## Current Behavior Analysis

### Pattern 1: Unconditional Always-On Animation

Used by `GlowText`, `OrbWidget`, `DensityOrbWidget`. Timer starts in `initState`
and runs until `dispose`.

**File: `packages/flitter-amp/src/widgets/glow-text.ts`, lines 60-79**

```typescript
class GlowTextState extends State<GlowText> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeOffset = 0;

  override initState(): void {
    super.initState();
    this.timer = setInterval(() => {
      this.setState(() => {
        this.timeOffset += 0.08;
      });
    }, 100);
  }

  override dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    super.dispose();
  }
}
```

Identical pattern in `OrbWidget` (lines 97-116) and `DensityOrbWidget` (lines
111-139), each with a `timeOffset` field incremented by a different delta.

### Pattern 2: Conditional Start/Stop Animation

Used by `ToolHeader`, `HandoffTool`, `CollapsibleDrawer`. Timer starts/stops
based on widget property changes detected in `didUpdateWidget`.

**File: `packages/flitter-amp/src/widgets/tool-call/tool-header.ts`, lines 56-99**

```typescript
class ToolHeaderState extends State<ToolHeader> {
  private spinner = new BrailleSpinner();
  private timer: ReturnType<typeof setInterval> | null = null;

  override initState(): void {
    super.initState();
    if (this.widget.status === 'in_progress') {
      this.startSpinner();
    }
  }

  override didUpdateWidget(_oldWidget: ToolHeader): void {
    if (this.widget.status === 'in_progress' && !this.timer) {
      this.startSpinner();
    } else if (this.widget.status !== 'in_progress' && this.timer) {
      this.stopSpinner();
    }
  }

  override dispose(): void {
    this.stopSpinner();
    super.dispose();
  }

  private startSpinner(): void {
    this.timer = setInterval(() => {
      this.setState(() => { this.spinner.step(); });
    }, 100);
  }

  private stopSpinner(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
```

Nearly identical in `HandoffTool` (lines 42-85) and `CollapsibleDrawer` (lines
97-276), differing only in the condition and interval.

### Pattern 3: Finite-Duration Self-Terminating Animation

Used by `ScrollController.animateTo()`. Timer runs for a fixed duration then
cancels itself.

**File: `packages/flitter-core/src/widgets/scroll-controller.ts`, lines 65-108**

```typescript
animateTo(targetOffset: number, duration: number = 200): void {
  this._cancelAnimation();
  const clampedTarget = Math.max(0, Math.min(targetOffset, this._maxScrollExtent));
  if (clampedTarget === this._offset) return;
  if (duration <= 0) { this.jumpTo(clampedTarget); return; }

  const startOffset = this._offset;
  const delta = clampedTarget - startOffset;
  const frameInterval = 16;
  const startTime = Date.now();

  this._animationTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const newOffset = startOffset + delta * progress; // linear only
    // ... update offset
    if (progress >= 1) this._cancelAnimation();
  }, frameInterval);
}
```

This is the only animation that uses 16ms intervals (matching 60fps). All others
use 100ms or slower. It also has no easing -- purely linear interpolation.

### Existing Infrastructure: Listenable/ChangeNotifier

**File: `packages/flitter-core/src/framework/listenable.ts`**

The `Listenable` interface and `ChangeNotifier` class already exist and are the
exact base types that Flutter's `AnimationController` extends. The
`ValueNotifier<T>` extends `ChangeNotifier` and holds a typed value with
change notification.

The `ChangeNotifier` has:
- `addListener(callback)` / `removeListener(callback)` (lines 34-47)
- `notifyListeners()` with snapshot-safe iteration (lines 59-69)
- `dispose()` to clear listeners (lines 75-78)
- `hasListeners` getter (line 50)

This means the foundation for `AnimationController extends ChangeNotifier` is
already in place.

### Existing Infrastructure: FrameScheduler

**File: `packages/flitter-core/src/scheduler/frame-scheduler.ts`**

The `FrameScheduler` singleton supports:
- `addFrameCallback(id, callback, phase, priority)` (line 448)
- `removeFrameCallback(id)` (line 469)
- `requestFrame()` with coalescing and pacing (line 214)
- 4-phase pipeline: BUILD -> LAYOUT -> PAINT -> RENDER

The `Ticker` can register a BUILD-phase callback at high negative priority
(before `buildScopes`) to advance animations before widgets rebuild. This
integrates animations directly into the frame pipeline instead of relying on
external `setInterval` timers.

---

## Proposed Architecture

### Module Structure

```
packages/flitter-core/src/animation/
  ticker.ts                    -- Ticker class (vsync-synchronized timer)
  animation-controller.ts      -- AnimationController (value + status + notifications)
  curves.ts                    -- Easing curve library
  __tests__/
    ticker.test.ts
    animation-controller.test.ts
    curves.test.ts
```

### Class Hierarchy

```
Listenable (interface, existing)
  |
ChangeNotifier (class, existing)
  |
  +-- AnimationController
  |     value: number (0..1)
  |     status: AnimationStatus
  |     forward() / reverse() / stop() / reset()
  |     duration: number (ms)
  |     curve: Curve
  |
  +-- ValueNotifier<T> (existing)

Ticker
  _callback: (elapsed: number) => void
  _schedulerId: string | null
  start() / stop() / dispose()
  isActive: boolean

Curve (abstract)
  transform(t: number): number
  |
  +-- LinearCurve
  +-- EaseInCurve
  +-- EaseOutCurve
  +-- EaseInOutCurve
  +-- Interval(begin, end, curve)
```

### Component 1: Ticker

The `Ticker` replaces `setInterval` as the timing mechanism. It registers a
BUILD-phase callback with the `FrameScheduler` so that animation values are
updated before widgets rebuild, and only fires when a frame is actually
being produced.

```typescript
// packages/flitter-core/src/animation/ticker.ts

import { FrameScheduler } from '../scheduler/frame-scheduler';

export type TickerCallback = (elapsed: number) => void;

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
```

**Key design decisions:**

1. **BUILD phase at priority -1500**: This places animation ticks after
   resize processing (`processResizeIfPending` at -1000 per MINR-03) but
   before `buildScopes` (priority 0). Widgets that depend on animation values
   will see the updated values when they rebuild.

2. **`performance.now()` elapsed time**: Wall-clock based, consistent with
   `ScrollController.animateTo()` (line 88: `const startTime = Date.now()`).
   Using `performance.now()` gives sub-millisecond precision.

3. **Continuous frame requests**: While active, the ticker requests a new
   frame after each tick. This integrates with the FrameScheduler's pacing
   (60fps in production, immediate in tests) rather than imposing its own
   interval.

### Component 2: AnimationController

```typescript
// packages/flitter-core/src/animation/animation-controller.ts

import { ChangeNotifier } from '../framework/listenable';
import { Ticker, type TickerCallback } from './ticker';
import { Curves, type Curve } from './curves';

export type AnimationStatus =
  | 'dismissed'   // at lowerBound, not animating
  | 'forward'     // animating toward upperBound
  | 'reverse'     // animating toward lowerBound
  | 'completed';  // at upperBound, not animating

export type AnimationStatusListener = (status: AnimationStatus) => void;

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
    this._animateTowards(this._upperBound);
  }

  /**
   * Animate in reverse from the current value to lowerBound.
   * If already at lowerBound, completes immediately.
   */
  reverse(): void {
    this._direction = 'reverse';
    this._animateTowards(this._lowerBound);
  }

  /**
   * Animate to a specific target value.
   * Direction is inferred from current value.
   */
  animateTo(target: number, opts?: { duration?: number; curve?: Curve }): void {
    const targetClamped = Math.max(this._lowerBound, Math.min(this._upperBound, target));
    this._direction = targetClamped >= this._value ? 'forward' : 'reverse';

    // Temporarily override duration/curve if provided
    const prevDuration = this._duration;
    const prevCurve = this._curve;
    if (opts?.duration !== undefined) this._duration = opts.duration;
    if (opts?.curve !== undefined) this._curve = opts.curve;

    this._animateTowards(targetClamped);

    // Restore defaults after starting (the animation captures the values)
    this._duration = prevDuration;
    this._curve = prevCurve;
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
    const duration = this._duration;

    if (duration <= 0) {
      // Zero duration: jump to target
      const target = this._direction === 'forward'
        ? this._upperBound
        : this._lowerBound;
      this._internalSetValue(target);
      this._ticker.stop();
      this._setStatus(target === this._upperBound ? 'completed' : 'dismissed');
      return;
    }

    const linearProgress = Math.min(animationElapsed / duration, 1);
    const curvedProgress = this._curve.transform(linearProgress);

    const target = this._direction === 'forward'
      ? this._upperBound
      : this._lowerBound;
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
```

**Key design decisions:**

1. **Extends `ChangeNotifier`**: Reuses the existing `Listenable` infrastructure.
   Value listeners get notified on every tick. Status listeners are separate.

2. **Owns its own `Ticker`**: Each controller creates one ticker. This is
   simpler than Flutter's `TickerProvider` mixin (which exists to support
   `TabController` sharing tickers across tabs). For a TUI, one-controller-
   per-animation is sufficient.

3. **Mid-animation reversal**: Calling `reverse()` while `forward()` is in
   progress captures the current value as `_animationStartValue` and animates
   from there toward `lowerBound`. The animation restarts from the current
   position, not from the beginning. This matches the behavior needed by
   gap #36 (expand/collapse) where mid-toggle reversal should be smooth.

4. **Curve support**: The controller applies a `Curve.transform(t)` to the
   linear progress before interpolation. Default is `Curves.linear`.

### Component 3: Curves Library

```typescript
// packages/flitter-core/src/animation/curves.ts

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
```

**Why only 5 curves:**

TUI animations operate on integer values (row heights, column positions). Over
a typical 9-frame animation (150ms at 60fps), the difference between most
curves is 0-1 integer steps. Exotic curves (bounce, elastic, spring) require
20+ frames of sub-pixel motion to be perceptible. The five curves provided cover
the common cases:

- `linear`: Existing behavior, backward compatible
- `easeOut`: Natural for expand animations (fast start, gentle landing)
- `easeIn`: Natural for collapse animations (gentle start, fast exit)
- `easeInOut`: Bidirectional transitions
- `decelerate`: Scroll deceleration (replaces ScrollController's linear)

---

## Migration Plan

### Phase 1: Framework Implementation (New Files)

Create the three core files and their tests. No existing code changes.

**New files:**
- `packages/flitter-core/src/animation/ticker.ts`
- `packages/flitter-core/src/animation/animation-controller.ts`
- `packages/flitter-core/src/animation/curves.ts`
- `packages/flitter-core/src/animation/__tests__/ticker.test.ts`
- `packages/flitter-core/src/animation/__tests__/animation-controller.test.ts`
- `packages/flitter-core/src/animation/__tests__/curves.test.ts`

**Exports added to `packages/flitter-core/src/index.ts`:**

```typescript
// Animation framework (ANIM-01, ANIM-02)
export { Ticker } from './animation/ticker';
export type { TickerCallback } from './animation/ticker';
export { AnimationController } from './animation/animation-controller';
export type { AnimationStatus, AnimationStatusListener } from './animation/animation-controller';
export { Curve, Curves, Interval } from './animation/curves';
```

### Phase 2: Migrate ScrollController.animateTo

The `ScrollController` is the cleanest migration target because it already
uses the finite-duration `setInterval` + elapsed time pattern.

**File: `packages/flitter-core/src/widgets/scroll-controller.ts`**

Before (lines 65-108):
```typescript
animateTo(targetOffset: number, duration: number = 200): void {
  this._cancelAnimation();
  // ...
  this._animationTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const newOffset = startOffset + delta * progress;
    // ...
    if (progress >= 1) this._cancelAnimation();
  }, 16);
}
```

After:
```typescript
private _animationController: AnimationController | null = null;

animateTo(targetOffset: number, duration: number = 200): void {
  this._cancelAnimation();
  const clampedTarget = Math.max(0, Math.min(targetOffset, this._maxScrollExtent));
  if (clampedTarget === this._offset) return;
  if (duration <= 0) { this.jumpTo(clampedTarget); return; }

  const startOffset = this._offset;
  const delta = clampedTarget - startOffset;

  this._animationController = new AnimationController({
    duration,
    curve: Curves.decelerate,
  });

  this._animationController.addListener(() => {
    const newOffset = startOffset + delta * this._animationController!.value;
    const clamped = Math.max(0, Math.min(newOffset, this._maxScrollExtent));
    if (clamped !== this._offset) {
      this._offset = clamped;
      this._notifyListeners();
    }
  });

  this._animationController.addStatusListener((status) => {
    if (status === 'completed' || status === 'dismissed') {
      this._cancelAnimation();
    }
  });

  this._animationController.forward();
}

private _cancelAnimation(): void {
  if (this._animationController) {
    this._animationController.dispose();
    this._animationController = null;
  }
}
```

This removes the raw `setInterval`/`clearInterval` management and gains:
- Frame-synchronized timing (no 16ms interval drift)
- Decelerate easing (smoother scroll feel)
- Proper disposal with listener cleanup

### Phase 3: Migrate Continuous Animations (GlowText, OrbWidget, DensityOrbWidget)

These widgets use `timeOffset` counters rather than 0-to-1 animation values.
They can use a `Ticker` directly without `AnimationController`.

**File: `packages/flitter-amp/src/widgets/glow-text.ts`**

Before (lines 60-79):
```typescript
class GlowTextState extends State<GlowText> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeOffset = 0;

  override initState(): void {
    super.initState();
    this.timer = setInterval(() => {
      this.setState(() => { this.timeOffset += 0.08; });
    }, 100);
  }

  override dispose(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    super.dispose();
  }
}
```

After:
```typescript
class GlowTextState extends State<GlowText> {
  private _ticker: Ticker | null = null;
  private timeOffset = 0;
  private _lastTickTime = 0;

  override initState(): void {
    super.initState();
    this._ticker = new Ticker((elapsed) => {
      // Throttle to ~10fps (100ms intervals) to match current behavior
      if (elapsed - this._lastTickTime >= 100) {
        this._lastTickTime = elapsed;
        this.setState(() => { this.timeOffset += 0.08; });
      }
    });
    this._ticker.start();
  }

  override dispose(): void {
    this._ticker?.dispose();
    this._ticker = null;
    super.dispose();
  }
}
```

The same pattern applies to `OrbWidget` and `DensityOrbWidget`. The key change
is replacing `setInterval(100)` with a `Ticker` that throttles to the same
effective rate but fires in sync with the frame pipeline.

**Note on throttling**: The 100ms rate is preserved for backward compatibility
and to avoid increasing CPU usage. The Ticker fires every frame (~16ms), but
the throttle gate ensures the animation state only advances every ~100ms. This
gives better frame synchronization without changing the visual effect.

### Phase 4: Migrate Conditional Animations (ToolHeader, HandoffTool, CollapsibleDrawer)

These widgets need conditional start/stop. The Ticker provides `start()`/`stop()`
directly.

**File: `packages/flitter-amp/src/widgets/tool-call/tool-header.ts`**

Before (lines 56-99):
```typescript
private startSpinner(): void {
  this.timer = setInterval(() => {
    this.setState(() => { this.spinner.step(); });
  }, 100);
}

private stopSpinner(): void {
  if (this.timer) { clearInterval(this.timer); this.timer = null; }
}
```

After:
```typescript
private _ticker: Ticker | null = null;
private _lastTickTime = 0;

private startSpinner(): void {
  if (this._ticker?.isActive) return;
  this._ticker = new Ticker((elapsed) => {
    if (elapsed - this._lastTickTime >= 100) {
      this._lastTickTime = elapsed;
      this.setState(() => { this.spinner.step(); });
    }
  });
  this._ticker.start();
}

private stopSpinner(): void {
  this._ticker?.stop();
}

override dispose(): void {
  this._ticker?.dispose();
  this._ticker = null;
  super.dispose();
}
```

The `didUpdateWidget` logic remains identical -- it already calls
`startSpinner()`/`stopSpinner()` based on `status` changes.

### Phase 5: Migrate or Enable AnimatedExpandSection (Gap #36)

With the animation framework in place, the `AnimatedExpandSection` widget
proposed in gap #36 can use `AnimationController` instead of raw `setInterval`:

```typescript
class AnimatedExpandSectionState extends State<AnimatedExpandSection> {
  private _controller: AnimationController;

  override initState(): void {
    super.initState();
    this._controller = new AnimationController({
      duration: this.widget.duration,
      value: this.widget.expanded ? 1 : 0,
      curve: Curves.easeOut,
    });
    this._controller.addListener(() => {
      this.setState(() => {});
    });
  }

  override didUpdateWidget(oldWidget: AnimatedExpandSection): void {
    if (oldWidget.expanded !== this.widget.expanded) {
      if (this.widget.expanded) {
        this._controller.forward();
      } else {
        this._controller.reverse();
      }
    }
  }

  override dispose(): void {
    this._controller.dispose();
    super.dispose();
  }

  build(context: BuildContext): Widget {
    const height = Math.round(this._controller.value * this._targetHeight);
    return new SizedBox({
      height: height,
      child: new ClipRect({ child: this.widget.child }),
    });
  }
}
```

This is dramatically simpler than the raw `setInterval` approach in gap #36
(the `_startAnimation`, `_tick`, `_cancelAnimation` methods totaling ~50 lines
are replaced by `forward()` / `reverse()` calls).

---

## Performance Analysis

### Ticker vs setInterval Overhead

**setInterval (current):**
- Each animation creates a timer in the runtime's event loop
- Timer fires at its own cadence, may trigger between frames
- `setState` -> `requestFrame` -> FrameScheduler coalesces
- Multiple timers firing in the same 16ms window = single frame (coalesced)
- Multiple timers firing in adjacent 16ms windows = potentially extra frames

**Ticker (proposed):**
- Each active Ticker registers ONE FrameScheduler callback
- ALL Tickers fire during the same BUILD phase of the same frame
- No extra frame requests from misaligned timers
- The FrameScheduler already iterates callbacks with `Array.from().filter().sort()`
  (frame-scheduler.ts line 372-374), so adding Ticker callbacks is O(n) in the
  number of active animations

For the typical Amp TUI with 2-3 concurrent animations (spinner + glow + orb),
the overhead difference is negligible. The benefit is architectural: all
animation values are updated atomically before BUILD, ensuring consistent
widget state within each frame.

### Memory

Each `Ticker` holds a callback function, a scheduler ID string, and a few
numeric fields (~100 bytes). Each `AnimationController` adds a `ChangeNotifier`
listener set, a curve reference, and numeric state (~200 bytes). This is
comparable to the current `setInterval` handle + closure + state fields.

### Frame Budget Impact

The current animations consume 0.1-0.5ms per frame (analysis-44 cost table).
The Ticker/AnimationController adds one additional function call layer per tick
(the curve transform). For all 5 curves, `transform(t)` is a single arithmetic
expression (0.01ms). This is unmeasurable compared to the existing BUILD/PAINT
costs.

---

## Testing Strategy

### Unit Tests: Curves

```typescript
// packages/flitter-core/src/animation/__tests__/curves.test.ts

import { describe, test, expect } from 'bun:test';
import { Curves, Interval } from '../curves';

describe('Curves', () => {
  test('linear: transform(t) === t for all t in [0, 1]', () => {
    expect(Curves.linear.transform(0)).toBe(0);
    expect(Curves.linear.transform(0.5)).toBe(0.5);
    expect(Curves.linear.transform(1)).toBe(1);
  });

  test('all curves return 0 at t=0', () => {
    for (const curve of Object.values(Curves)) {
      expect(curve.transform(0)).toBe(0);
    }
  });

  test('all curves return 1 at t=1', () => {
    for (const curve of Object.values(Curves)) {
      expect(curve.transform(1)).toBeCloseTo(1, 10);
    }
  });

  test('easeIn: starts slow (transform(0.25) < 0.25)', () => {
    expect(Curves.easeIn.transform(0.25)).toBeLessThan(0.25);
  });

  test('easeOut: starts fast (transform(0.25) > 0.25)', () => {
    expect(Curves.easeOut.transform(0.25)).toBeGreaterThan(0.25);
  });

  test('easeInOut: symmetric around 0.5', () => {
    const a = Curves.easeInOut.transform(0.25);
    const b = Curves.easeInOut.transform(0.75);
    expect(a + b).toBeCloseTo(1, 5);
  });

  test('all curves are monotonically increasing', () => {
    for (const curve of Object.values(Curves)) {
      let prev = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const v = curve.transform(t);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-10);
        prev = v;
      }
    }
  });

  test('Interval restricts curve to sub-range', () => {
    const interval = new Interval(0.25, 0.75);
    expect(interval.transform(0)).toBe(0);
    expect(interval.transform(0.25)).toBe(0);
    expect(interval.transform(0.5)).toBeCloseTo(0.5);
    expect(interval.transform(0.75)).toBe(1);
    expect(interval.transform(1)).toBe(1);
  });

  test('flipped curve reverses the easing', () => {
    const flipped = Curves.easeIn.flipped;
    // flipped easeIn should behave like easeOut
    expect(flipped.transform(0.25)).toBeGreaterThan(0.25);
  });
});
```

### Unit Tests: Ticker

```typescript
// packages/flitter-core/src/animation/__tests__/ticker.test.ts

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Ticker } from '../ticker';
import { FrameScheduler } from '../../scheduler/frame-scheduler';

describe('Ticker', () => {
  beforeEach(() => {
    FrameScheduler.reset();
    FrameScheduler.instance.disableFramePacing();
  });

  afterEach(() => {
    FrameScheduler.reset();
  });

  test('isActive is false before start', () => {
    const ticker = new Ticker(() => {});
    expect(ticker.isActive).toBe(false);
    ticker.dispose();
  });

  test('isActive is true after start', () => {
    const ticker = new Ticker(() => {});
    ticker.start();
    expect(ticker.isActive).toBe(true);
    ticker.dispose();
  });

  test('isActive is false after stop', () => {
    const ticker = new Ticker(() => {});
    ticker.start();
    ticker.stop();
    expect(ticker.isActive).toBe(false);
    ticker.dispose();
  });

  test('callback receives elapsed time', (done) => {
    let receivedElapsed = -1;
    const ticker = new Ticker((elapsed) => {
      receivedElapsed = elapsed;
      ticker.stop();
      expect(receivedElapsed).toBeGreaterThanOrEqual(0);
      ticker.dispose();
      done();
    });
    ticker.start();
  });

  test('dispose prevents restart', () => {
    const ticker = new Ticker(() => {});
    ticker.dispose();
    expect(() => ticker.start()).toThrow('Cannot start a disposed Ticker');
  });

  test('start is idempotent', () => {
    const ticker = new Ticker(() => {});
    ticker.start();
    ticker.start(); // should not throw or create duplicate
    expect(ticker.isActive).toBe(true);
    ticker.dispose();
  });

  test('registers BUILD phase callback with FrameScheduler', () => {
    const beforeCount = FrameScheduler.instance.frameCallbackCount;
    const ticker = new Ticker(() => {});
    ticker.start();
    expect(FrameScheduler.instance.frameCallbackCount).toBe(beforeCount + 1);
    ticker.dispose();
    expect(FrameScheduler.instance.frameCallbackCount).toBe(beforeCount);
  });
});
```

### Unit Tests: AnimationController

```typescript
// packages/flitter-core/src/animation/__tests__/animation-controller.test.ts

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { AnimationController } from '../animation-controller';
import { Curves } from '../curves';
import { FrameScheduler } from '../../scheduler/frame-scheduler';

describe('AnimationController', () => {
  beforeEach(() => {
    FrameScheduler.reset();
    FrameScheduler.instance.disableFramePacing();
  });

  afterEach(() => {
    FrameScheduler.reset();
  });

  test('initial value defaults to lowerBound (0)', () => {
    const c = new AnimationController({ duration: 300 });
    expect(c.value).toBe(0);
    expect(c.status).toBe('dismissed');
    c.dispose();
  });

  test('initial value can be set', () => {
    const c = new AnimationController({ duration: 300, value: 0.5 });
    expect(c.value).toBe(0.5);
    c.dispose();
  });

  test('forward() starts animating', () => {
    const c = new AnimationController({ duration: 300 });
    c.forward();
    expect(c.isAnimating).toBe(true);
    expect(c.status).toBe('forward');
    c.dispose();
  });

  test('reverse() starts animating backward', () => {
    const c = new AnimationController({ duration: 300, value: 1 });
    c.reverse();
    expect(c.isAnimating).toBe(true);
    expect(c.status).toBe('reverse');
    c.dispose();
  });

  test('stop() halts animation', () => {
    const c = new AnimationController({ duration: 300 });
    c.forward();
    c.stop();
    expect(c.isAnimating).toBe(false);
    c.dispose();
  });

  test('reset() returns to lowerBound', () => {
    const c = new AnimationController({ duration: 300, value: 0.7 });
    c.reset();
    expect(c.value).toBe(0);
    expect(c.status).toBe('dismissed');
    c.dispose();
  });

  test('value setter stops animation and sets value', () => {
    const c = new AnimationController({ duration: 300 });
    c.forward();
    c.value = 0.5;
    expect(c.isAnimating).toBe(false);
    expect(c.value).toBe(0.5);
    c.dispose();
  });

  test('forward() at upperBound sets completed immediately', () => {
    const c = new AnimationController({ duration: 300, value: 1 });
    c.forward();
    expect(c.isAnimating).toBe(false);
    expect(c.status).toBe('completed');
    c.dispose();
  });

  test('reverse() at lowerBound sets dismissed immediately', () => {
    const c = new AnimationController({ duration: 300, value: 0 });
    c.reverse();
    expect(c.isAnimating).toBe(false);
    expect(c.status).toBe('dismissed');
    c.dispose();
  });

  test('listeners are notified on value changes', async () => {
    const c = new AnimationController({ duration: 100 });
    const values: number[] = [];
    c.addListener(() => values.push(c.value));
    c.forward();

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(values.length).toBeGreaterThan(0);
    expect(values[values.length - 1]).toBe(1);
    c.dispose();
  });

  test('status listeners are notified on transitions', async () => {
    const c = new AnimationController({ duration: 100 });
    const statuses: string[] = [];
    c.addStatusListener((s) => statuses.push(s));
    c.forward();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(statuses).toContain('forward');
    expect(statuses).toContain('completed');
    c.dispose();
  });

  test('custom curve is applied', async () => {
    const c = new AnimationController({
      duration: 100,
      curve: Curves.easeIn,
    });
    const values: number[] = [];
    c.addListener(() => values.push(c.value));
    c.forward();

    await new Promise(resolve => setTimeout(resolve, 200));

    // easeIn starts slow, so early values should be below linear
    if (values.length >= 3) {
      expect(values[1]).toBeLessThan(0.5);
    }
    c.dispose();
  });

  test('dispose cleans up ticker and listeners', () => {
    const c = new AnimationController({ duration: 300 });
    c.addListener(() => {});
    c.addStatusListener(() => {});
    c.forward();
    c.dispose();
    expect(c.isAnimating).toBe(false);
    expect(c.hasListeners).toBe(false);
  });

  test('custom bounds work correctly', async () => {
    const c = new AnimationController({
      duration: 50,
      lowerBound: 10,
      upperBound: 20,
    });
    c.forward();

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(c.value).toBe(20);
    c.dispose();
  });
});
```

### Integration Tests

After migrating each widget, verify that:

1. **Visual behavior is unchanged**: The spinner still animates at ~10fps, the
   glow effect still has the same Perlin noise pattern, scroll still smooths.

2. **Timer cleanup works**: Mount and unmount animated widgets, verify no
   lingering FrameScheduler callbacks via `FrameScheduler.instance.frameCallbackCount`.

3. **Frame coalescing still works**: Multiple concurrent animations should
   produce ~60fps total, not 60fps per animation.

4. **Conditional animations still start/stop**: `ToolHeader` spinner starts
   when `status='in_progress'` and stops when status changes.

### Backward Compatibility

All migrations are internal implementation changes. No public API changes
except the new exports from `index.ts`. Existing widget consumers see no
difference. The `AnimationController`/`Ticker`/`Curves` types are additive-only.

---

## Affected Files

| File | Action | Estimated Lines |
|------|--------|-----------------|
| `packages/flitter-core/src/animation/ticker.ts` | **New** | ~80 |
| `packages/flitter-core/src/animation/animation-controller.ts` | **New** | ~180 |
| `packages/flitter-core/src/animation/curves.ts` | **New** | ~100 |
| `packages/flitter-core/src/animation/__tests__/ticker.test.ts` | **New** | ~80 |
| `packages/flitter-core/src/animation/__tests__/animation-controller.test.ts` | **New** | ~120 |
| `packages/flitter-core/src/animation/__tests__/curves.test.ts` | **New** | ~80 |
| `packages/flitter-core/src/index.ts` | Add animation exports | ~8 |
| `packages/flitter-core/src/widgets/scroll-controller.ts` | Migrate `animateTo` to `AnimationController` | ~30 modified |
| `packages/flitter-amp/src/widgets/glow-text.ts` | Replace `setInterval` with `Ticker` | ~15 modified |
| `packages/flitter-amp/src/widgets/orb-widget.ts` | Replace `setInterval` with `Ticker` | ~15 modified |
| `packages/flitter-amp/src/widgets/density-orb-widget.ts` | Replace `setInterval` with `Ticker` | ~15 modified |
| `packages/flitter-amp/src/widgets/tool-call/tool-header.ts` | Replace `setInterval` with `Ticker` | ~15 modified |
| `packages/flitter-amp/src/widgets/tool-call/handoff-tool.ts` | Replace `setInterval` with `Ticker` | ~15 modified |
| `packages/flitter-core/src/widgets/collapsible-drawer.ts` | Replace `setInterval` with `Ticker` | ~15 modified |

**Total new production code:** ~360 lines
**Total new test code:** ~280 lines
**Total modified in existing files:** ~130 lines

---

## Verification Steps

1. **Type check:**
   ```bash
   cd packages/flitter-core && bun run build
   cd packages/flitter-amp && bun run build
   ```

2. **Framework unit tests:**
   ```bash
   cd packages/flitter-core && bun test -- --grep "Curves"
   cd packages/flitter-core && bun test -- --grep "Ticker"
   cd packages/flitter-core && bun test -- --grep "AnimationController"
   ```

3. **Full test suite (regression):**
   ```bash
   cd packages/flitter-core && bun test
   cd packages/flitter-amp && bun test
   ```

4. **Visual verification:**
   ```bash
   # Verify spinners still animate correctly
   cd packages/flitter-core && bun run examples/spinner.ts
   # Verify scroll still works
   cd packages/flitter-core && bun run examples/scroll-demo.ts
   ```

5. **Frame timing check:**
   With `PerformanceOverlay` enabled, verify that frame times during animation
   remain under 16ms and that frame counts do not increase vs the pre-migration
   baseline.

---

## Relationship to Other Gaps

- **Gap #36 (Expand/Collapse Animation)**: This framework provides the
  `AnimationController` that gap #36's `AnimatedExpandSection` can use instead
  of raw `setInterval`. Implementation order: this gap first, then gap #36
  becomes simpler.

- **Gap #38 (Streaming Cursor Blink)**: The `StreamingCursor` widget proposed
  in gap #38 uses a simple boolean toggle on a 530ms timer. It can optionally
  use a `Ticker` but the `AnimationController` is overkill for a boolean blink.
  A `Ticker` with 530ms throttle gate is appropriate.

- **ANIM-03 (AnimatedContainer, AnimatedOpacity)**: These future implicit
  animation widgets would build on the `AnimationController` from this gap.
  They are NOT part of this proposal but become straightforward to implement
  once this foundation exists.

---

## Alternatives Considered

### A. Keep Ad-Hoc setInterval Pattern

Continue with each widget managing its own timer. Add helper functions to reduce
boilerplate.

**Rejected**: Does not solve the frame synchronization problem. Timer helpers
reduce boilerplate but still leave animations as external clocks disconnected
from the frame pipeline. Each new animated widget would still need to implement
its own lifecycle management.

### B. Full Flutter Animation System Port

Port the complete Flutter animation hierarchy: `TickerProvider`, `TickerProviderStateMixin`,
`SingleTickerProviderStateMixin`, `AnimationController`, `Animation<T>`,
`CurvedAnimation`, `Tween<T>`, `ColorTween`, `SizeTween`, `AnimatedBuilder`,
`AnimatedWidget`, `ImplicitlyAnimatedWidget`, etc.

**Rejected**: Over-engineered for TUI needs. Flutter's animation system serves
pixel-based rendering where sub-pixel interpolation across 60fps is essential.
The `TickerProvider` mixin system exists for `TabBar` widgets sharing tickers,
which flitter does not have. The full system is ~2000 lines for minimal
practical benefit in a character-grid UI. The minimal set proposed here (Ticker
+ AnimationController + 5 Curves) covers all current and foreseeable use cases.

### C. Timer Mixin Only

Create a mixin that adds `startTimer(interval, callback)` / `stopTimer()` /
auto-dispose to `State` subclasses.

**Rejected**: Reduces boilerplate but does not provide value interpolation,
curves, or frame synchronization. The mixin approach also has TypeScript
limitations (no true mixins without complexity). A dedicated `Ticker` class
composed into states achieves the same goal more cleanly.

### D. Use FrameScheduler Callbacks Directly (No Ticker Abstraction)

Have each widget call `FrameScheduler.instance.addFrameCallback()` directly
instead of using `setInterval`.

**Rejected**: This eliminates the external timer problem but leaves widgets
managing raw callback registration, elapsed time tracking, and cleanup.
The `Ticker` wraps these concerns into a clean, tested abstraction that
widgets compose rather than implement.

---

## Summary

Flitter lacks a shared animation framework. All 7+ animated widgets implement
identical `setInterval` + `setState` + `dispose` boilerplate independently.
Timers fire asynchronously from the frame pipeline, creating potential frame
synchronization issues. There is no interpolation curve library.

The proposed solution adds three modules (~360 lines of production code) to
`packages/flitter-core/src/animation/`:

1. **`Ticker`**: Frame-synchronized timer that registers with `FrameScheduler`'s
   BUILD phase, replacing raw `setInterval`.

2. **`AnimationController`**: Extends `ChangeNotifier` to animate a value from
   0 to 1 over a duration with optional easing. Supports `forward()`,
   `reverse()`, `stop()`, `reset()`, and mid-animation reversal.

3. **`Curves`**: Five TUI-appropriate easing functions (`linear`, `easeIn`,
   `easeOut`, `easeInOut`, `decelerate`) plus an `Interval` curve for
   staggered animations.

Migration of existing widgets is incremental and backward-compatible. Each
widget replaces its raw `setInterval` with a `Ticker` (for continuous animations)
or `AnimationController` (for finite animations), preserving identical visual
behavior while gaining frame synchronization, easing curves, and reduced
boilerplate. The framework also provides the foundation for gap #36
(expand/collapse animations) and future ANIM-03 implicit animation widgets.
