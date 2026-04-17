/**
 * ErrorDialog -- structured error display overlay with title, description,
 * and keyboard dismissal.
 *
 * 逆向: v0R (StatefulWidget) + j0R (State) in 1472_tui_components/misc_utils.js:5841-5861
 *        + 1472_tui_components/jetbrains_wizard.js:1494-1593
 *
 * In amp:
 * - v0R is the StatefulWidget with { error, options, onResponse, onCopy }
 * - j0R is the State that transforms error via OaT() into { title, description, actions }
 * - j0R.build() returns `io` dialog widget with:
 *     - title (bold), body (description text), options list, borderColor: R.destructive
 *     - autofocus: true, showDismissalMessage: false, enableMouseInteraction: false
 * - The `io` dialog (WQT state, actions_intents.js:1950-2069) renders:
 *     - Column with title (bold RichText), body (RichText or string), options, optional dismiss hint
 *     - Wrapped in Container with BoxDecoration(background, Border.all(BorderSide(color, 1, "rounded")))
 *     - Wrapped in Focus with focusNode for keyboard handling
 *     - Key handling: Escape -> onSelect(null) i.e. dismiss, Enter -> select current option
 *
 * Simplification for Flitter:
 * - We don't have the full error->actions pipeline (OaT, guT, etc.)
 * - ErrorDialog accepts pre-computed title + description + onDismiss
 * - No options list -- just title, description, and "Press Esc or Enter to dismiss" hint
 * - Matches amp's visual structure: error-colored border, bold title, muted hint
 *
 * @module
 */

import type { BuildContext, KeyEventResult } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  Color,
  Column,
  Container,
  EdgeInsets,
  Focus,
  RichText,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  ErrorDialogConfig
// ════════════════════════════════════════════════════

export interface ErrorDialogConfig {
  /** Error title displayed in bold error color. */
  title: string;
  /** Error description / body text. */
  description: string;
  /** Called when the user dismisses the dialog (Esc, Enter, or q). */
  onDismiss: () => void;
}

// ════════════════════════════════════════════════════
//  Color constants
// ════════════════════════════════════════════════════

/**
 * Error border/title color.
 *
 * 逆向: j0R.build -> borderColor: R.destructive (colorScheme.destructive)
 * In Tokyo Night theme, destructive maps to the error red.
 */
const ERROR_COLOR = Color.rgb(0xf7, 0x76, 0x8e);

/**
 * Muted text for the dismissal hint.
 *
 * 逆向: WQT.build -> t = R.mutedForeground
 * Used for "Escape to close" hint in the io dialog.
 */
const MUTED_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/**
 * Body/description text color.
 *
 * 逆向: Standard foreground from Tokyo Night theme.
 */
const TEXT_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);

// ════════════════════════════════════════════════════
//  ErrorDialog Widget
// ════════════════════════════════════════════════════

/**
 * ErrorDialog -- a structured error display overlay.
 *
 * 逆向: v0R extends NR (StatefulWidget) in misc_utils.js:5841
 * - v0R({ error, options, onResponse, onCopy }) -> createState() -> j0R
 */
export class ErrorDialog extends StatefulWidget {
  readonly config: ErrorDialogConfig;

  constructor(config: ErrorDialogConfig) {
    super();
    this.config = config;
  }

  createState(): ErrorDialogState {
    return new ErrorDialogState();
  }
}

// ════════════════════════════════════════════════════
//  ErrorDialogState
// ════════════════════════════════════════════════════

/**
 * State for ErrorDialog.
 *
 * 逆向: j0R extends wR (State) in jetbrains_wizard.js:1494
 *
 * j0R.build():
 *   1. Gets colorScheme from Z0.of(T)
 *   2. Transforms error via OaT() -> { title, description, actions }
 *   3. Returns `io` dialog with title, body (description), options (actions),
 *      borderColor: R.destructive, autofocus: true
 *
 * The `io` dialog (WQT) renders:
 *   - Focus wrapper with key handling (Escape -> dismiss, Enter -> select)
 *   - Container with BoxDecoration(background, Border.all(BorderSide(borderColor, 1, "rounded")))
 *   - Padding(1, 0, 1, 0) inside container
 *   - Column with: title (bold RichText), SizedBox(h:1) spacer, body, options, dismiss hint
 *
 * We simplify by removing the options list and using direct onDismiss.
 */
class ErrorDialogState extends State<ErrorDialog> {
  /**
   * Key handler matching amp's WQT.handleKeyEvent pattern.
   *
   * 逆向: WQT.handleKeyEvent (actions_intents.js:1960-1978)
   * - Enter -> onSelect(selectedOption) -> in our case, dismiss
   * - Escape -> onSelect(null) -> dismiss
   * We also accept "q" as an additional dismiss key for convenience.
   */
  private _handleKey = (event: { key: string }): KeyEventResult => {
    if (event.key === "Escape" || event.key === "Enter" || event.key === "q") {
      this.widget.config.onDismiss();
      return "handled";
    }
    return "ignored";
  };

  /**
   * 逆向: j0R.build -> io dialog (WQT.build)
   *
   * Structure (matching amp's WQT.build at actions_intents.js:1994-2069):
   * 1. Title: RichText with bold style
   * 2. SizedBox(height: 1) spacer
   * 3. Body: RichText with description text
   * 4. SizedBox(height: 1) spacer
   * 5. Hint: RichText with muted "Press Esc or Enter to dismiss"
   *
   * Wrapped in:
   * - Column(crossAxisAlignment: "stretch", mainAxisSize: "min")
   * - Padding(top: 1, bottom: 1) -- amp's default padding: new TR(1, 0, 1, 0)
   * - Container with BoxDecoration(border: Border.all(BorderSide(ERROR_COLOR, 1, "rounded")))
   * - Focus with autofocus: true, onKey handler
   */
  build(_context: BuildContext) {
    const { title, description } = this.widget.config;

    // 逆向: WQT.build -- Column children array `r`
    const children = [
      // 逆向: if (this.widget.title) r.push(new xT({ text: new G(title, new cT({ bold: true })) }))
      new RichText({
        text: new TextSpan({
          text: title,
          style: new TextStyle({ foreground: ERROR_COLOR, bold: true }),
        }),
      }),

      // 逆向: r.push(new XT({ height: 1 })) -- spacer after title
      new SizedBox({ height: 1 }),

      // 逆向: if (typeof this.widget.body === "string") r.push(new xT({ text: new G(body) }))
      new RichText({
        text: new TextSpan({
          text: description,
          style: new TextStyle({ foreground: TEXT_COLOR }),
        }),
      }),

      // 逆向: r.push(new XT({ height: 1 })) -- spacer before dismiss hint
      new SizedBox({ height: 1 }),

      // 逆向: WQT.build showDismissalMessage section:
      //   r.push(new xT({ text: new G("Escape to close", new cT({ color: t })) }))
      // We expand the hint since we handle Enter and q as well.
      new RichText({
        text: new TextSpan({
          text: "Press Esc or Enter to dismiss",
          style: new TextStyle({ foreground: MUTED_COLOR }),
        }),
      }),
    ];

    // 逆向: WQT.build container structure:
    //   c = new xR({ crossAxisAlignment: "stretch", mainAxisSize: "min", children: r })
    const column = new Column({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children,
    });

    // 逆向: WQT.build wrapping:
    //   s = new SR({ child: new uR({ padding: this.widget.padding, child: c }),
    //               decoration: new p8(background, h9.all(new e9(borderColor, 1, "rounded"))) })
    // amp default padding: new TR(1, 0, 1, 0) = EdgeInsets(top:1, right:0, bottom:1, left:0)
    const container = new Container({
      padding: EdgeInsets.symmetric({ vertical: 1, horizontal: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(ERROR_COLOR, 1, "rounded")),
      }),
      child: column,
    });

    // 逆向: WQT.build final wrapping:
    //   return new C8({ focusNode: this.focusNode, child: s, autofocus: this.widget.autofocus })
    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      debugLabel: "ErrorDialog",
      child: container,
    });
  }
}
