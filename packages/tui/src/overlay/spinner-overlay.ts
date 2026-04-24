/**
 * SpinnerOverlay — modal loading dialog with animated braille spinner.
 *
 * 逆向: Ko/HRR at chunk-006.js:20868-20952 — LoadingDialog StatefulWidget
 *       chunk-006.js:20878-20887 — _spinner, animationInterval (100ms), initState/dispose
 *       chunk-006.js:20890-20929 — build: Container(bg+border) > SizedBox(60x7)
 *         > Column(start) > [Expanded(Column(center,center,[spinnerText])), cancelHint]
 *       chunk-006.js:20941-20949 — Focus(autofocus, onKey: Escape -> onAbort)
 *
 * SpinnerOverlay is a StatefulWidget that renders a centered loading dialog:
 * - Animated BrailleSpinner (100ms interval matching amp)
 * - Optional message text next to the spinner
 * - Optional "Press Esc to cancel" hint
 * - Container with background color and solid border
 * - Focus trapping with Escape key dismissal when onCancel is provided
 *
 * Since this widget lives in packages/tui which does not have access to
 * ThemeController from packages/cli, colors are accepted as constructor
 * parameters. Callers in packages/cli should pass colors from the theme.
 *
 * @module
 */

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { BrailleSpinner } from "../widgets/braille-spinner.js";
import { Column } from "../widgets/column.js";
import { Container } from "../widgets/container.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { Expanded } from "../widgets/flexible.js";
import { Focus } from "../widgets/focus.js";
import { RichText } from "../widgets/rich-text.js";
import { SizedBox } from "../widgets/sized-box.js";
import { TextSpan } from "../widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Theme colors for SpinnerOverlay
// ════════════════════════════════════════════════════

/**
 * Color configuration for SpinnerOverlay.
 *
 * Since this widget lives in packages/tui and does not have access to
 * ThemeController (packages/cli), colors must be passed explicitly.
 *
 * 逆向: HRR.build uses:
 *   - colors.foreground → border, message text, hint text
 *   - colors.background → box background
 *   - colors.info → "Esc" keybind highlight
 *   - app.processing → spinner braille color
 */
export interface SpinnerOverlayColors {
  /** Spinner braille character color. 逆向: app.processing */
  processing: Color;
  /** Message text, hint text, and border color. 逆向: colors.foreground */
  foreground: Color;
  /** Box background color. 逆向: colors.background */
  background: Color;
  /** "Esc" keybind highlight color. 逆向: colors.info */
  info: Color;
}

/**
 * Default colors matching amp's dark theme defaults.
 * Used as fallback when caller does not provide colors.
 */
const DEFAULT_COLORS: SpinnerOverlayColors = {
  processing: Color.cyan(),
  foreground: Color.default(),
  background: Color.rgb(30, 30, 46),
  info: Color.blue(),
};

// ════════════════════════════════════════════════════
//  SpinnerOverlay Widget (StatefulWidget)
// ════════════════════════════════════════════════════

/** SpinnerOverlay constructor arguments. */
export interface SpinnerOverlayArgs {
  /** Optional key */
  key?: Key;
  /** Message text displayed next to the spinner. 逆向: props.message */
  message?: string;
  /**
   * Called when user presses Escape. If provided, renders the "Esc to cancel"
   * hint and wraps content in Focus for key handling.
   * 逆向: props.onAbort
   */
  onCancel?: () => void;
  /** Theme colors. See {@link SpinnerOverlayColors}. */
  colors?: SpinnerOverlayColors;
}

/**
 * SpinnerOverlay Widget.
 *
 * Renders a modal loading dialog matching amp's Ko/HRR exactly.
 *
 * 逆向: Ko at chunk-006.js:20868-20877 (StatefulWidget)
 *       HRR at chunk-006.js:20878-20952 (State)
 *
 * Layout (from amp):
 *   [Focus(autofocus, onKey: Escape)] → Container(bg, border: solid)
 *     → SizedBox(width: 60, height: 7)
 *       → Column(mainAxis: start) → [
 *           Expanded(Column(center, center, [RichText(spinner + message)])),
 *           if onCancel: SizedBox(h: 2, child: Container(padding, RichText("Press Esc to cancel")))
 *         ]
 *
 * @example
 * ```ts
 * new SpinnerOverlay({
 *   message: "Loading threads...",
 *   onCancel: () => dismiss(),
 *   colors: {
 *     processing: appTheme.processing,
 *     foreground: themeData.foreground,
 *     background: themeData.background,
 *     info: themeData.info,
 *   },
 * });
 * ```
 */
export class SpinnerOverlay extends StatefulWidget {
  readonly message: string | undefined;
  readonly onCancel: (() => void) | undefined;
  readonly colors: SpinnerOverlayColors;

  constructor(args: SpinnerOverlayArgs) {
    super({ key: args.key });
    this.message = args.message;
    this.onCancel = args.onCancel;
    this.colors = args.colors ?? DEFAULT_COLORS;
  }

  /**
   * Create the associated state.
   * 逆向: Ko.createState() → new HRR()
   */
  createState(): State<SpinnerOverlay> {
    return new SpinnerOverlayState();
  }
}

// ════════════════════════════════════════════════════
//  SpinnerOverlay State
// ════════════════════════════════════════════════════

/**
 * State for SpinnerOverlay.
 *
 * Manages the BrailleSpinner animation interval (100ms).
 *
 * 逆向: HRR at chunk-006.js:20878-20952
 *   - _spinner = new xa()
 *   - animationInterval: setInterval(100ms) { spinner.step(), setState }
 *   - initState: start interval
 *   - dispose: clear interval
 */
export class SpinnerOverlayState extends State<SpinnerOverlay> {
  // 逆向: HRR._spinner = new xa()
  _spinner = new BrailleSpinner();

  // 逆向: HRR.animationInterval = null
  _animationInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the spinner animation on mount.
   *
   * 逆向: HRR.initState — setInterval(100ms) { spinner.step(), setState }
   */
  override initState(): void {
    super.initState();
    // 逆向: this.animationInterval = setInterval(() => {
    //   this._spinner.step(), this.setState(() => {});
    // }, 100);
    this._animationInterval = setInterval(() => {
      this._spinner.step();
      this.setState(() => {});
    }, 100);
  }

  /**
   * Clean up the animation interval on unmount.
   *
   * 逆向: HRR.dispose — clearInterval(this.animationInterval)
   */
  override dispose(): void {
    if (this._animationInterval) {
      clearInterval(this._animationInterval);
      this._animationInterval = null;
    }
    super.dispose();
  }

  /**
   * Build the loading dialog.
   *
   * 逆向: HRR.build at chunk-006.js:20890-20951
   *
   * Structure:
   *   [Focus(autofocus, onKey)] →
   *     Container(decoration: BoxDecoration(bg, border: solid)) →
   *       SizedBox(width: 60, height: 7) →
   *         Column(mainAxisAlignment: start) → [
   *           Expanded(Column(center, center, [spinnerText])),
   *           if onCancel: cancelHint
   *         ]
   */
  build(_context: BuildContext): WidgetInterface {
    const { processing, foreground, background, info } = this.widget.colors;

    // 逆向: line 20896 — t = h9.all(new e9(a.foreground, 1, "solid"))
    const border = Border.all(new BorderSide(foreground, 1, "solid"));

    // 逆向: line 20897 — r = this._spinner.toBraille()
    const braille = this._spinner.toBraille();

    // ── Spinner text line ────────────────────────────
    // 逆向: lines 20898-20904
    //   h = new xT({ textAlign: "center", text: new G("", void 0, [
    //     new G(r, new cT({ color: e.processing })),
    //     new G(" ", void 0),
    //     new G(this.widget.props.message, new cT({ color: a.foreground }))
    //   ]) })
    const spinnerTextChildren: TextSpan[] = [
      new TextSpan({
        text: braille,
        style: new TextStyle({ foreground: processing }),
      }),
    ];

    if (this.widget.message) {
      spinnerTextChildren.push(
        new TextSpan({ text: " " }),
        new TextSpan({
          text: this.widget.message,
          style: new TextStyle({ foreground }),
        }),
      );
    }

    const spinnerText = new RichText({
      textAlign: "center",
      text: new TextSpan({ children: spinnerTextChildren }),
    }) as unknown as WidgetInterface;

    // ── Inner content: centered spinner text ─────────
    // 逆向: lines 20906-20912
    //   i = [new j0({ child: new xR({
    //     mainAxisAlignment: "center", crossAxisAlignment: "center",
    //     children: [h]
    //   }) })]
    const children: WidgetInterface[] = [
      new Expanded({
        child: new Column({
          mainAxisAlignment: "center",
          crossAxisAlignment: "center",
          children: [spinnerText],
        }) as unknown as WidgetInterface,
      }) as unknown as WidgetInterface,
    ];

    // ── Cancel hint (only if onCancel provided) ──────
    // 逆向: lines 20913-20929
    //   if (this.widget.props.onAbort) i.push(new XT({
    //     height: 2, child: new SR({
    //       padding: TR.symmetric(2, 0),
    //       child: new xT({ text: new G("", new cT({ dim: !0 }), [
    //         new G("Press ", new cT({ color: a.foreground })),
    //         new G("Esc", new cT({ color: a.info })),
    //         new G(" to cancel", new cT({ color: a.foreground }))
    //       ]) })
    //     })
    //   }));
    if (this.widget.onCancel) {
      children.push(
        new SizedBox({
          height: 2,
          child: new Container({
            padding: EdgeInsets.symmetric({ vertical: 0, horizontal: 2 }),
            child: new RichText({
              text: new TextSpan({
                style: new TextStyle({ dim: true }),
                children: [
                  new TextSpan({
                    text: "Press ",
                    style: new TextStyle({ foreground }),
                  }),
                  new TextSpan({
                    text: "Esc",
                    style: new TextStyle({ foreground: info }),
                  }),
                  new TextSpan({
                    text: " to cancel",
                    style: new TextStyle({ foreground }),
                  }),
                ],
              }),
            }) as unknown as WidgetInterface,
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,
      );
    }

    // ── Container with border and background ─────────
    // 逆向: lines 20930-20939
    //   c = new SR({
    //     decoration: new p8(a.background, t),
    //     child: new XT({ width: 60, height: 7,
    //       child: new xR({ mainAxisAlignment: "start", children: i })
    //     })
    //   })
    const dialogBox = new Container({
      decoration: new BoxDecoration({
        color: background,
        border,
      }),
      child: new SizedBox({
        width: 60,
        height: 7,
        child: new Column({
          mainAxisAlignment: "start",
          children,
        }) as unknown as WidgetInterface,
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    // ── Optionally wrap in Focus for Escape handling ──
    // 逆向: lines 20941-20950
    //   if (this.widget.props.onAbort) return new C8({
    //     debugLabel: "LoadingDialog", autofocus: !0,
    //     onKey: s => { if (s.key === "Escape") return this.widget.props.onAbort?.(), "handled"; return "ignored"; },
    //     child: c
    //   });
    //   return c;
    if (this.widget.onCancel) {
      return new Focus({
        autofocus: true,
        debugLabel: "LoadingDialog",
        onKey: (event) => {
          if (event.key === "Escape") {
            this.widget.onCancel?.();
            return "handled";
          }
          return "ignored";
        },
        child: dialogBox,
      }) as unknown as WidgetInterface;
    }

    return dialogBox;
  }
}
