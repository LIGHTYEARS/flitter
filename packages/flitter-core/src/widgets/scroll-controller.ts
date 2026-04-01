// ScrollController - manages scroll state for scroll views
// Amp ref: Lg class, amp-strings.txt

/**
 * Controls scroll position and manages follow mode for auto-scrolling.
 * Listeners are notified whenever the scroll offset changes.
 *
 * Amp ref: class Lg
 */
export class ScrollController {
  private _offset: number = 0;
  private _maxScrollExtent: number = 0;
  private _listeners: Set<() => void> = new Set();
  private _followMode: boolean = true;
  private _disposed: boolean = false;

  /** Timer handle for the current animateTo animation, or null if idle. */
  private _animationTimer: ReturnType<typeof setInterval> | null = null;

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
    return this._animationTimer !== null;
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
   * Smoothly animate from current offset to targetOffset using linear interpolation.
   * Cancels any existing animation. Clamps target to [0, maxScrollExtent].
   * Notifies listeners on each frame.
   *
   * @param targetOffset - The desired scroll offset
   * @param duration - Animation duration in ms (default 200)
   */
  animateTo(targetOffset: number, duration: number = 200): void {
    if (this._disposed) return;

    // Cancel any running animation
    this._cancelAnimation();

    // Clamp target to valid range
    const clampedTarget = Math.max(0, Math.min(targetOffset, this._maxScrollExtent));

    // If already at target, nothing to do
    if (clampedTarget === this._offset) {
      return;
    }

    // For zero or negative duration, jump immediately
    if (duration <= 0) {
      this.jumpTo(clampedTarget);
      return;
    }

    const startOffset = this._offset;
    const delta = clampedTarget - startOffset;
    const frameInterval = 16; // ~60fps
    const startTime = Date.now();

    this._animationTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear interpolation
      const newOffset = startOffset + delta * progress;

      // Update offset (bypass jumpTo to avoid followMode re-enable during animation)
      const clamped = Math.max(0, Math.min(newOffset, this._maxScrollExtent));
      if (clamped !== this._offset) {
        this._offset = clamped;
        this._notifyListeners();
      }

      // Animation complete
      if (progress >= 1) {
        this._cancelAnimation();
      }
    }, frameInterval);
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
    if (this._animationTimer !== null) {
      clearInterval(this._animationTimer);
      this._animationTimer = null;
    }
  }

  private _notifyListeners(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }
}
