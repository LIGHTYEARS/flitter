/**
 * ToastManager — imperative toast notification manager.
 *
 * 逆向: BQT (2442_unknown_BQT.js)
 * - Max 3 visible (nIT = 3), queue overflow
 * - Auto-dismiss after 3000ms (aQ = 3000)
 * - Listener notification on state change
 * - Newline replacement: /[\r\n]+/g -> " " then .trim()
 *
 * Differences from amp:
 * - show() returns the toast id (amp returns void)
 * - Constructor accepts configurable maxVisible/defaultDuration (amp uses constants)
 * - TypeScript types for Toast, ToastType
 */

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface QueuedToast extends Toast {
  duration: number;
}

interface ToastManagerOptions {
  maxVisible?: number;
  defaultDuration?: number;
}

export class ToastManager {
  // 逆向: BQT._nextId = 0
  private _nextId = 0;
  // 逆向: BQT._visibleToasts = []
  private _visible: Toast[] = [];
  // 逆向: BQT._queuedToasts = []
  private _queued: QueuedToast[] = [];
  // 逆向: BQT._listeners = new Set()
  private _listeners = new Set<() => void>();
  // 逆向: BQT._timers = new Map()
  private _timers = new Map<number, ReturnType<typeof setTimeout>>();

  // 逆向: nIT = 3, aQ = 3000 (constants in amp)
  private readonly _maxVisible: number;
  private readonly _defaultDuration: number;

  constructor(opts: ToastManagerOptions = {}) {
    this._maxVisible = opts.maxVisible ?? 3;
    this._defaultDuration = opts.defaultDuration ?? 3000;
  }

  // 逆向: BQT.toasts getter
  get visibleToasts(): readonly Toast[] {
    return this._visible;
  }

  get queuedCount(): number {
    return this._queued.length;
  }

  /**
   * Show a toast notification.
   *
   * 逆向: BQT.show(T, R = "success", a = aQ)
   * - Sanitizes message: replace [\r\n]+ with space, then trim
   * - If under max visible, push to visible and start timer
   * - Otherwise queue with duration for later promotion
   * - Notifies listeners
   *
   * Enhancement over amp: returns the toast id.
   */
  show(message: string, type: ToastType = "success", duration?: number): number {
    // 逆向: let e = this._nextId++
    const id = this._nextId++;
    // 逆向: let t = T.replace(/[\r\n]+/g, " ").trim()
    const sanitized = message.replace(/[\r\n]+/g, " ").trim();
    const dur = duration ?? this._defaultDuration;
    const toast: Toast = { id, message: sanitized, type };

    // 逆向: if (this._visibleToasts.length < nIT) ... else ...
    if (this._visible.length < this._maxVisible) {
      this._visible.push(toast);
      this._startTimer(id, dur);
    } else {
      this._queued.push({ ...toast, duration: dur });
    }

    this._notifyListeners();
    return id;
  }

  /**
   * Dismiss a toast by id.
   *
   * 逆向: BQT.dismiss(T)
   * - Clear timer if exists
   * - If in visible: splice out, promote from queue, notify
   * - If in queued: splice out, notify
   * - If not found: no notification (matches amp)
   */
  dismiss(id: number): void {
    // 逆向: let R = this._timers.get(T); if (R) clearTimeout(R), this._timers.delete(T)
    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(id);
    }

    // 逆向: let a = this._visibleToasts.findIndex(t => t.id === T)
    const visIdx = this._visible.findIndex((t) => t.id === id);
    if (visIdx !== -1) {
      // 逆向: this._visibleToasts.splice(a, 1), this._promoteFromQueue(), this._notifyListeners(); return;
      this._visible.splice(visIdx, 1);
      this._promoteFromQueue();
      this._notifyListeners();
      return;
    }

    // 逆向: let e = this._queuedToasts.findIndex(t => t.id === T)
    const qIdx = this._queued.findIndex((t) => t.id === id);
    if (qIdx !== -1) {
      // 逆向: this._queuedToasts.splice(e, 1), this._notifyListeners()
      this._queued.splice(qIdx, 1);
      this._notifyListeners();
    }
  }

  /**
   * Dismiss all toasts (visible and queued).
   *
   * 逆向: BQT.dismissAll()
   * - Clear all timers
   * - Reset arrays (amp uses = [], we match that pattern)
   * - Notify listeners
   */
  dismissAll(): void {
    // 逆向: for (let T of this._timers.values()) clearTimeout(T)
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    // 逆向: this._timers.clear(), this._visibleToasts = [], this._queuedToasts = []
    this._timers.clear();
    this._visible = [];
    this._queued = [];
    this._notifyListeners();
  }

  // 逆向: BQT.addListener(T)
  addListener(fn: () => void): void {
    this._listeners.add(fn);
  }

  // 逆向: BQT.removeListener(T)
  removeListener(fn: () => void): void {
    this._listeners.delete(fn);
  }

  /**
   * Dispose of all timers and listeners.
   *
   * 逆向: BQT.dispose()
   */
  dispose(): void {
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();
    this._listeners.clear();
  }

  /**
   * Start an auto-dismiss timer for a toast.
   *
   * 逆向: BQT._startTimer(T, R)
   * - setTimeout -> dismiss(id)
   * - timer.unref() to avoid holding event loop open
   */
  private _startTimer(id: number, duration: number): void {
    const timer = setTimeout(() => {
      this.dismiss(id);
    }, duration);
    // 逆向: a.unref()
    if (typeof timer === "object" && "unref" in timer) {
      (timer as NodeJS.Timeout).unref();
    }
    this._timers.set(id, timer);
  }

  /**
   * Promote queued toasts to visible when space opens up.
   *
   * 逆向: BQT._promoteFromQueue()
   * - While visible < max and queue has items: shift from queue, push to visible, start timer
   * - Uses queued toast's stored duration (fallback to default)
   */
  private _promoteFromQueue(): void {
    while (this._visible.length < this._maxVisible && this._queued.length > 0) {
      const queued = this._queued.shift()!;
      // 逆向: let R = T.duration ?? aQ
      const { duration, ...toast } = queued;
      this._visible.push(toast);
      this._startTimer(toast.id, duration ?? this._defaultDuration);
    }
  }

  /**
   * Notify all registered listeners.
   *
   * 逆向: BQT._notifyListeners()
   */
  private _notifyListeners(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }
}
