/**
 * PopupOverlay — positions child content in the overlay layer with focus trapping.
 *
 * 逆向: QQT at chunk-006.js:11550 — popup overlay state management
 *       XRR at chunk-006.js:21244 — message dialog with scroll + overlay
 *       chunk-006.js:21387-21414 — Stack(fit: "expand") + backdrop + onKey(Escape)
 *
 * PopupOverlay is a StatelessWidget that renders a modal overlay:
 * - Full-screen backdrop that captures clicks
 * - Centered child content
 * - Escape key dismissal
 * - Focus trapping via Focus widget
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Stack, Positioned } from "../widgets/stack.js";
import { Center } from "../widgets/center.js";
import { Container } from "../widgets/container.js";
import { Focus } from "../widgets/focus.js";
import { GestureDetector } from "../widgets/gesture-detector.js";
import { SizedBox } from "../widgets/sized-box.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  PopupOverlay Widget
// ════════════════════════════════════════════════════

/** PopupOverlay constructor arguments. */
interface PopupOverlayArgs {
  /** Optional key */
  key?: Key;
  /** The content to display in the popup */
  child: WidgetInterface;
  /** Called when the popup should be dismissed (Escape or backdrop click) */
  onDismiss: () => void;
  /** Whether clicking the backdrop dismisses the popup, default true */
  barrierDismissible?: boolean;
  /** Whether Escape key dismisses the popup, default true */
  escapeDismissible?: boolean;
  /** Whether the popup should autofocus, default true */
  autofocus?: boolean;
}

/**
 * PopupOverlay Widget.
 *
 * Renders a modal popup with backdrop, focus trapping, and Escape dismissal.
 *
 * 逆向: chunk-006.js:21387-21414 — Ta(Stack) + G0(GestureDetector backdrop) + C8(Focus onKey)
 *   new Ta({ fit: "expand", children: [
 *     new G0({ onClick: () => {}, child: new XT() }),  // backdrop
 *     new C8({ onKey: ..., child: content })           // focused content
 *   ] })
 *
 * @example
 * ```ts
 * new PopupOverlay({
 *   onDismiss: () => closePopup(),
 *   child: new Container({
 *     child: new Text({ data: "Hello from popup!" }),
 *   }),
 * });
 * ```
 */
export class PopupOverlay extends StatelessWidget {
  readonly child: WidgetInterface;
  readonly onDismiss: () => void;
  readonly barrierDismissible: boolean;
  readonly escapeDismissible: boolean;
  readonly autofocus: boolean;

  constructor(args: PopupOverlayArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.onDismiss = args.onDismiss;
    this.barrierDismissible = args.barrierDismissible ?? true;
    this.escapeDismissible = args.escapeDismissible ?? true;
    this.autofocus = args.autofocus ?? true;
  }

  /**
   * Build the popup overlay.
   *
   * 逆向: chunk-006.js:21387-21414 — Stack with backdrop + focused content
   */
  build(_context: BuildContext): WidgetInterface {
    // 逆向: new G0({ onClick: () => {}, child: new XT() }) — backdrop
    const backdrop = new GestureDetector({
      onTap: this.barrierDismissible ? this.onDismiss : undefined,
      child: new SizedBox({}) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    // 逆向: new C8({ onKey: ..., child: content }) — focused content with Escape
    const focusedContent = new Focus({
      autofocus: this.autofocus,
      debugLabel: "PopupOverlay",
      onKey: (event) => {
        if (this.escapeDismissible && event.key === "Escape") {
          this.onDismiss();
          return "handled";
        }
        return "ignored";
      },
      child: new Center({
        child: this.child,
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    // 逆向: new Ta({ fit: "expand", children: [backdrop, content] })
    return new Stack({
      children: [backdrop, focusedContent],
    }) as unknown as WidgetInterface;
  }
}
