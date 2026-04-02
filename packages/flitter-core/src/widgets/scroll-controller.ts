// ScrollController - manages scroll state for scroll views
// Amp ref: Lg class, amp-strings.txt
//
// W4-5: Migrated animateTo() from setInterval to AnimationController + Ticker
// for frame-synchronized animation with easeOutCubic easing.

import { AnimationController } from '../animation/animation-controller';
import { Curves, type Curve } from '../animation/curves';

/**
 * Controls scroll position and manages follow mode for auto-scrolling.
 * Listeners are notified whenever the scroll offset changes.
 *
 * animateTo() uses AnimationController + Ticker for frame-synchronized
 * scroll animations with easeOutCubic easing by default.
 *
 * Amp ref: class Lg
 */
export class ScrollController {
  private _offset: number = 0;
  private _maxScrollExtent: number = 0;
  private _listeners: Set<() => void> = new Set();
  private _followMode: boolean = true;
  private _disposed: boolean = false;

  /**
   * Internal AnimationController that drives animateTo().
   * Animates a normalized value from 0 to 1; the tick listener maps it
   * to the actual scroll offset range [startOffset, targetOffset].
   */
  private _animController: AnimationController | null = null;

  /** Start offset for the current animation segment. */
  private _animStartOffset: number = 0;

  /** Target offset for the current animation segment. */
  private _animTargetOffset: number = 0;

  /** Current scroll offset in the main axis. */
  get offset(): number {
    return this._offset;
  }

  /** Maximum scroll extent (childSize - viewportSize), always >= 0. */
  get maxScrollExtent(): number {
    return this._maxScrollExtent;
  }

  /** Whether the scroll position is at or near the bottom (within 1px tolerance). */
  get atBottom(): boolean {
    return this._offset >= this._maxScrollExtent - 1;
  }

  /** Whether follow mode is active (auto-scroll to end on content changes). */
  get followMode(): boolean {
    return this._followMode;
  }

  /** Whether a smooth scroll animation is currently in progress. */
  get isAnimating(): boolean {
    return this._animController?.isAnimating ?? false;
  }

  private _viewportSize: number = 0;

  /** The viewport size (height for vertical, width for horizontal scroll). */
  get viewportSize(): number {
    return this._viewportSize;
  }

  /** Update the viewport size. Called by RenderScrollViewport during layout. */
  updateViewportSize(size: number): void {
    this._viewportSize = size;
  }

  /**
   * Smoothly animate from current offset to targetOffset using
   * AnimationController with easeOutCubic easing.
   * Cancels any existing animation. Clamps target to [0, maxScrollExtent].
   * Notifies listeners on each frame.
   *
   * @param targetOffset - The desired scroll offset
   * @param duration - Animation duration in ms (default 200)
   * @param curve - Easing curve (default Curves.easeOutCubic)
   */
  animateTo(
    targetOffset: number,
    duration: number = 200,
    curve: Curve = Curves.easeOutCubic,
  ): void {
    if (this._disposed) return;

    this._cancelAnimation();

    const clampedTarget = Math.max(0, Math.min(targetOffset, this._maxScrollExtent));

    if (clampedTarget === this._offset) {
      return;
    }

    if (duration <= 0) {
      this.jumpTo(clampedTarget);
      return;
    }

    this._animStartOffset = this._offset;
    this._animTargetOffset = clampedTarget;

    const controller = new AnimationController({
      duration,
      curve,
    });

    controller.addListener(() => {
      const t = controller.value;
      const newOffset = this._animStartOffset
        + (this._animTargetOffset - this._animStartOffset) * t;

      const clamped = Math.max(0, Math.min(newOffset, this._maxScrollExtent));
      if (clamped !== this._offset) {
        this._offset = clamped;
        this._notifyListeners();
      }
    });

    controller.addStatusListener((status) => {
      if (status === 'completed') {
        this._offset = this._animTargetOffset;
        this._notifyListeners();
        this._disposeAnimController();
      }
    });

    this._animController = controller;
    controller.forward();
  }

  /**
   * Jump to a specific offset, clamped to [0, maxScrollExtent].
   * Notifies all listeners if the offset changes.
   * Re-enables followMode if scrolled to bottom.
   */
  jumpTo(offset: number): void {
    if (this._disposed) return;

    const clamped = Math.max(0, Math.min(offset, this._maxScrollExtent));
    if (clamped !== this._offset) {
      this._offset = clamped;

      // Re-enable follow mode when user scrolls to bottom
      if (!this._followMode && this.atBottom) {
        this._followMode = true;
      }

      this._notifyListeners();
    }
  }

  /**
   * Scroll by a delta amount relative to the current offset.
   * Positive delta scrolls down/right, negative scrolls up/left.
   */
  scrollBy(delta: number): void {
    this.jumpTo(this._offset + delta);
  }

  /**
   * Ensure the region [targetOffset, targetOffset + targetSize] is fully visible
   * within the viewport. If it is already visible, do nothing. If it extends below
   * the viewport, scroll down so the region's bottom aligns with the viewport bottom.
   * If it extends above the viewport, scroll up so the region's top aligns with the
   * viewport top.
   *
   * @param targetOffset - Start position of the target region in scroll content coordinates
   * @param targetSize - Size of the target region along the scroll axis
   */
  ensureVisible(targetOffset: number, targetSize: number): void {
    if (this._disposed) return;

    const viewportStart = this._offset;
    const viewportEnd = this._offset + this._viewportSize;
    const targetEnd = targetOffset + targetSize;

    if (targetOffset >= viewportStart && targetEnd <= viewportEnd) {
      return;
    }

    if (targetEnd > viewportEnd) {
      this.jumpTo(targetEnd - this._viewportSize);
    } else if (targetOffset < viewportStart) {
      this.jumpTo(targetOffset);
    }
  }

  /**
   * Update the maximum scroll extent.
   * If followMode is active and we were at the bottom, auto-scroll to the new end.
   */
  updateMaxScrollExtent(extent: number): void {
    const wasAtBottom = this.atBottom;
    this._maxScrollExtent = Math.max(0, extent);

    // Clamp current offset if it exceeds new max
    if (this._offset > this._maxScrollExtent) {
      this._offset = this._maxScrollExtent;
    }

    // Auto-scroll if follow mode is on and we were at the bottom
    if (this._followMode && wasAtBottom) {
      this._offset = this._maxScrollExtent;
    }

    this._notifyListeners();
  }

  /** Disable follow mode (e.g., when user manually scrolls up). */
  disableFollowMode(): void {
    this._followMode = false;
  }

  /** Re-enable follow mode. */
  enableFollowMode(): void {
    this._followMode = true;
  }

  /** Add a listener that is called whenever the scroll state changes. */
  addListener(fn: () => void): void {
    this._listeners.add(fn);
  }

  /** Remove a previously-added listener. */
  removeListener(fn: () => void): void {
    this._listeners.delete(fn);
  }

  /** Remove all listeners, cancel animations, and reset state. */
  dispose(): void {
    this._disposed = true;
    this._cancelAnimation();
    this._listeners.clear();
  }

  /** Cancel the current animation if one is running. */
  private _cancelAnimation(): void {
    this._disposeAnimController();
  }

  /** Dispose and null-out the internal AnimationController. */
  private _disposeAnimController(): void {
    if (this._animController !== null) {
      this._animController.dispose();
      this._animController = null;
    }
  }

  private _notifyListeners(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }
}
