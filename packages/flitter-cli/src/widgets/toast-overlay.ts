// ToastController + ToastOverlay — Toast notification system
//
// Matches AMP's x1R (ToastController) class and toast overlay rendering.
// Provides a simple show/dismiss API with auto-dismiss timer and
// type-based styling (success, error, info).
//
// Key behaviors:
// - ToastController is a standalone observable (listener pattern)
// - show() replaces any current toast with the new one
// - Auto-dismiss via setTimeout (configurable duration)
// - Non-modal overlay at TOAST priority (10) — does not absorb keys
//
// AMP usage patterns:
// - toastController.show(message, "success")
// - toastController.show(message, "success", 8000)  // custom duration
// - showToast: (t, i="success", c) => this.toastController.show(t, i, c)

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { BoxDecoration } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { ToastType } from '../state/types';

// ---------------------------------------------------------------------------
// ToastController — manages toast lifecycle
// ---------------------------------------------------------------------------

/** Listener callback type matching OverlayManager pattern. */
type ToastListener = () => void;

/** Current toast state — null when no toast is visible. */
export interface ToastState {
  readonly message: string;
  readonly type: ToastType;
}

/** Default auto-dismiss durations per toast type (milliseconds). */
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
};

/**
 * ToastController — centralized toast notification lifecycle manager.
 *
 * Matches AMP's x1R (ToastController) class. Manages a single active
 * toast with auto-dismiss timer and listener notifications.
 *
 * Usage:
 *   const controller = new ToastController();
 *   controller.show("Copied to clipboard", "success");
 *   controller.show("Error occurred", "error", 5000);
 */
export class ToastController {
  private _current: ToastState | null = null;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _listeners: Set<ToastListener> = new Set();

  /** The currently active toast, or null if none. */
  get current(): ToastState | null {
    return this._current;
  }

  /**
   * Show a toast notification. Replaces any currently active toast.
   *
   * @param message - The text to display
   * @param type - Toast type for styling (default: 'success')
   * @param durationMs - Auto-dismiss duration in ms (default: per type)
   */
  show(message: string, type: ToastType = 'success', durationMs?: number): void {
    // Clear any existing timer
    this._clearTimer();

    this._current = { message, type };
    this._notifyListeners();

    // Set auto-dismiss timer
    const duration = durationMs ?? DEFAULT_DURATIONS[type];
    this._timer = setTimeout(() => {
      this.dismiss();
    }, duration);
  }

  /**
   * Dismiss the current toast immediately.
   * No-op if no toast is active.
   */
  dismiss(): void {
    if (this._current === null) return;
    this._clearTimer();
    this._current = null;
    this._notifyListeners();
  }

  /** Register a listener to be called when toast state changes. */
  addListener(listener: ToastListener): void {
    this._listeners.add(listener);
  }

  /** Unregister a previously registered listener. */
  removeListener(listener: ToastListener): void {
    this._listeners.delete(listener);
  }

  /** Dispose the controller — clears timer and listeners. */
  dispose(): void {
    this._clearTimer();
    this._listeners.clear();
  }

  /** Clear the auto-dismiss timer. */
  private _clearTimer(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /** Notify all registered listeners. */
  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }
}

// ---------------------------------------------------------------------------
// ToastOverlay — renders the toast notification widget
// ---------------------------------------------------------------------------

/** Type icon prefix per toast type. */
const TYPE_ICONS: Record<ToastType, string> = {
  success: '\u2713 ',   // checkmark
  error: '\u2717 ',     // X mark
  info: '\u2139 ',      // info circle
};

/** Type color per toast type. */
const TYPE_COLORS: Record<ToastType, Color> = {
  success: Color.green,
  error: Color.red,
  info: Color.cyan,
};

/** Props for the ToastOverlay widget. */
interface ToastOverlayProps {
  /** The toast message to display. */
  message: string;
  /** Toast type for styling. */
  type: ToastType;
}

/**
 * ToastOverlay — renders a single toast notification at the bottom of the screen.
 *
 * Non-modal (does not absorb keys), rendered with TOAST priority (10).
 * Positioned at the bottom-center of the viewport via anchored placement.
 *
 * Layout:
 *   Center (horizontal)
 *     Container (background, padding, maxWidth)
 *       Row
 *         Icon Text (type-colored)
 *         Message Text (white)
 */
export class ToastOverlay extends StatelessWidget {
  private readonly message: string;
  private readonly type: ToastType;

  constructor(props: ToastOverlayProps) {
    super({});
    this.message = props.message;
    this.type = props.type;
  }

  build(_context: BuildContext): Widget {
    const color = TYPE_COLORS[this.type];
    const icon = TYPE_ICONS[this.type];

    return new Center({
      child: new Container({
        decoration: new BoxDecoration({
          color: Color.rgb(30, 30, 30),
        }),
        padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 0 }),
        constraints: new BoxConstraints({ maxWidth: 60 }),
        child: new Row({
          mainAxisSize: 'min',
          children: [
            new Text({
              text: new TextSpan({
                text: icon,
                style: new TextStyle({ foreground: color, bold: true }),
              }),
            }),
            new Text({
              text: new TextSpan({
                text: this.message,
                style: new TextStyle({ foreground: Color.white }),
              }),
            }),
          ],
        }),
      }),
    });
  }
}
