/**
 * ToastOverlay -- renders visible toasts from a ToastManager as a vertical stack.
 *
 * 逆向: fd0 (chunk-006.js:11023-11059)
 * - Subscribes to BQT (ToastManager) via addListener
 * - _onToastsChanged calls setState(() => {})
 * - When toasts.length === 0: returns SizedBox(0, 0) (XT)
 * - Otherwise: Column (xR) with crossAxisAlignment: "center", mainAxisSize: "min"
 *   containing mapped toast items
 *
 * Toast item rendering:
 * 逆向: Id0 (chunk-004.js:20465-20482) + $d0 (2445_unknown_$d0.js)
 * - Container (SR) with horizontal padding(1), border all sides (type color, "rounded")
 * - RichText (xT) with icon span (colored) + message span (foreground)
 * - Icon mapping ($d0): error -> "\u2715", success -> "\u2713", info -> "\u2139"
 *
 * Differences from amp:
 * - fd0 wraps in a Stack (Ta) with Positioned (ca) overlay; we render
 *   the Column directly since overlay positioning is handled by the
 *   parent (Task 4: integrate into widget tree).
 * - amp's srT/HQT has a fade-in animation delay (xd0); we skip that
 *   since we don't yet have an animation framework.
 *
 * @module
 */

import type { BuildContext } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  Color,
  Column,
  Container,
  EdgeInsets,
  Padding,
  RichText,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import type { Toast, ToastManager, ToastType } from "./toast-manager.js";

// ════════════════════════════════════════════════════
//  ToastOverlayConfig
// ════════════════════════════════════════════════════

export interface ToastOverlayConfig {
  manager: ToastManager;
}

// ════════════════════════════════════════════════════
//  Color constants
// ════════════════════════════════════════════════════

/**
 * Toast type -> border/icon color mapping.
 *
 * 逆向: $d0 (2445_unknown_$d0.js)
 * - error -> R.toolError (maps to Tokyo Night error red)
 * - success -> R.toolSuccess (maps to Tokyo Night green)
 * - info -> falls through to success color in amp; we use blue
 */
const TOAST_COLORS: Record<ToastType, Color> = {
  success: Color.rgb(0x9e, 0xce, 0x6a), // Tokyo Night green (toolSuccess)
  error: Color.rgb(0xf7, 0x76, 0x8e), // Tokyo Night red (toolError)
  info: Color.rgb(0x7a, 0xa2, 0xf7), // Tokyo Night blue
};

/**
 * Icon mapping per toast type.
 *
 * 逆向: $d0 (2445_unknown_$d0.js)
 * - error -> "\u2715" (✕)
 * - success -> "\u2713" (✓)
 * - info -> "\u2139" (ℹ) -- amp has no explicit info icon; we add one
 */
const TOAST_ICONS: Record<ToastType, string> = {
  success: "\u2713", // ✓
  error: "\u2715", // ✕
  info: "\u2139", // ℹ
};

/** Foreground text color for toast message body. */
const TEXT_COLOR = Color.rgb(0xa9, 0xb1, 0xd6); // Tokyo Night foreground

// ════════════════════════════════════════════════════
//  ToastOverlay Widget
// ════════════════════════════════════════════════════

/**
 * ToastOverlay -- renders visible toasts from a ToastManager.
 *
 * 逆向: fd0 extends NR (chunk-006.js:11023)
 * - NR is StatefulWidget; fd0 creates fd0State (extends wR = State)
 */
export class ToastOverlay extends StatefulWidget {
  readonly config: ToastOverlayConfig;

  constructor(config: ToastOverlayConfig) {
    super();
    this.config = config;
  }

  createState(): ToastOverlayState {
    return new ToastOverlayState();
  }
}

// ════════════════════════════════════════════════════
//  ToastOverlayState
// ════════════════════════════════════════════════════

/**
 * State for ToastOverlay.
 *
 * 逆向: fd0 state (chunk-006.js:11023-11059)
 * - _listenerBound = this._onToastsChanged.bind(this)
 * - initState: addListener
 * - dispose: removeListener
 * - _onToastsChanged: setState(() => {})
 * - build: if toasts.length === 0 return SizedBox(0,0); else Column of toast items
 */
class ToastOverlayState extends State<ToastOverlay> {
  // 逆向: _listenerBound = this._onToastsChanged.bind(this)
  private _listener: (() => void) | null = null;

  /**
   * 逆向: fd0.initState -> super.initState(), this.widget.props.controller.addListener(this._listenerBound)
   */
  initState(): void {
    super.initState();
    this._listener = () => {
      this.setState(() => {});
    };
    this.widget.config.manager.addListener(this._listener);
  }

  /**
   * 逆向: fd0.dispose -> this.widget.props.controller.removeListener(this._listenerBound), super.dispose()
   */
  dispose(): void {
    if (this._listener) {
      this.widget.config.manager.removeListener(this._listener);
      this._listener = null;
    }
    super.dispose();
  }

  /**
   * 逆向: fd0.build (chunk-006.js:11034-11059)
   *
   * - let R = this.widget.props.controller.toasts;
   * - if (R.length === 0) return new XT({ width: 0, height: 0 });
   * - let a = R.map(t => new srT({ message: t.message, type: t.type, onDismiss: ... }))
   * - let e = new xR({ crossAxisAlignment: "center", mainAxisSize: "min", children: a });
   * - return ... (Stack overlay wrapper -- omitted, handled by parent integration)
   */
  build(_context: BuildContext) {
    const toasts = this.widget.config.manager.visibleToasts;

    // 逆向: if (R.length === 0) return new XT({ width: 0, height: 0 })
    if (toasts.length === 0) {
      return new SizedBox({ width: 0, height: 0 });
    }

    // 逆向: xR({ crossAxisAlignment: "center", mainAxisSize: "min", children: a })
    const children = toasts.map((toast) => this._buildToast(toast));
    return new Column({
      crossAxisAlignment: "center",
      mainAxisSize: "min",
      children,
    });
  }

  /**
   * Build a single toast item widget.
   *
   * 逆向: Id0(T, R, a, e, t) in chunk-004.js:20465-20482
   * - { color, icon } = $d0(R, t.app)
   * - Container (SR) with:
   *   - padding: TR.horizontal(1)
   *   - decoration: p8(background, h9.all(new e9(color, 1, "rounded")))
   *   - child: RichText (xT) with TextSpan containing icon span + message spans
   */
  private _buildToast(toast: Toast) {
    const color = TOAST_COLORS[toast.type] ?? TOAST_COLORS.info;
    const icon = TOAST_ICONS[toast.type] ?? TOAST_ICONS.info;

    // 逆向: Id0 structure
    // Container with border all sides, horizontal padding, RichText child
    return new Padding({
      padding: EdgeInsets.only({ bottom: 1 }),
      child: new Container({
        // 逆向: padding: TR.horizontal(1)
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        // 逆向: decoration: p8(background, h9.all(new e9(color, 1, "rounded")))
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide(color, 1, "rounded")),
        }),
        // 逆向: child: xT({ text: G(void 0, void 0, [G(` icon `, cT({color})), ...messageSpans]) })
        child: new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: ` ${icon} `,
                style: new TextStyle({ foreground: color, bold: true }),
              }),
              new TextSpan({
                text: toast.message,
                style: new TextStyle({ foreground: TEXT_COLOR }),
              }),
            ],
          }),
        }),
      }),
    });
  }
}
