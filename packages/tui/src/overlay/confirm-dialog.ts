/**
 * ConfirmDialog — modal confirmation dialog with inline keybind hints.
 *
 * 逆向: n0R at actions_intents.js:3469-3547 — confirmation dialog
 *       Z0.of(T).colorScheme — title/border/bg colors from ThemeController
 *       $R.of(T).app.keybind — keybind hint color from AppThemeController
 *       I9.of(T) — MediaQuery for terminal size
 *
 * ConfirmDialog renders a modal dialog with:
 * - A title (primary color, bold)
 * - An optional message (foreground color)
 * - Inline keybind hints: y (keybind) "yes ·" n (keybind) / Esc (keybind) "cancel"
 * - Keyboard: Y/y → confirm, N/n/Escape → cancel
 * - Focus trapping via Focus widget with autofocus
 * - Wrapped in Center, not PopupOverlay
 *
 * This widget lives in packages/tui which does not have access to
 * AppThemeController or ThemeController from packages/cli. Colors are
 * accepted as constructor parameters. Callers in packages/cli should pass
 * colors from AppThemeController.of(context) and ThemeController.of(context).
 *
 * @module
 */

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Center } from "../widgets/center.js";
import { Column } from "../widgets/column.js";
import { Container } from "../widgets/container.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { Focus } from "../widgets/focus.js";
import { RichText } from "../widgets/rich-text.js";
import { Row } from "../widgets/row.js";
import { SizedBox } from "../widgets/sized-box.js";
import { TextSpan } from "../widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Theme colors for ConfirmDialog
// ════════════════════════════════════════════════════

/**
 * Color configuration for ConfirmDialog.
 *
 * Since this widget lives in packages/tui and does not have access to
 * AppThemeController (packages/cli), colors must be passed explicitly.
 *
 * 逆向: n0R.build uses:
 *   - colorScheme.primary → title text, border
 *   - colorScheme.foreground → message text, dim hint text
 *   - colorScheme.background → box background
 *   - app.keybind → keybind letter color
 */
export interface ConfirmDialogColors {
  /** Title color and border color. 逆向: colorScheme.primary */
  primary: Color;
  /** Message text color. 逆向: colorScheme.foreground */
  foreground: Color;
  /** Box background color. 逆向: colorScheme.background */
  background: Color;
  /** Keybind hint letter color. 逆向: app.keybind */
  keybind: Color;
}

/**
 * Default colors matching amp's dark theme defaults.
 * Used as fallback when caller does not provide colors.
 */
const DEFAULT_COLORS: ConfirmDialogColors = {
  primary: Color.cyan(),
  foreground: Color.default(),
  background: Color.rgb(30, 30, 46),
  keybind: Color.blue(),
};

// ════════════════════════════════════════════════════
//  ConfirmDialog Widget
// ════════════════════════════════════════════════════

/** ConfirmDialog constructor arguments. */
interface ConfirmDialogArgs {
  /** Optional key */
  key?: Key;
  /** Title of the dialog (required). 逆向: options.title */
  title: string;
  /** Optional message body. 逆向: options.message */
  message?: string;
  /** Text for the confirm action, default "yes". 逆向: options.confirmButtonText ?? "Yes" */
  confirmButtonText?: string;
  /** Called when user confirms (y/Y key) */
  onConfirm: () => void;
  /** Called when user cancels (n/N/Escape key) */
  onCancel: () => void;
  /** Terminal width — used for box width calculation. 逆向: I9.of(T).size.width */
  terminalWidth?: number;
  /** Terminal height — used for max height constraint. 逆向: I9.of(T).size.height */
  terminalHeight?: number;
  /** Theme colors. See {@link ConfirmDialogColors}. */
  colors?: ConfirmDialogColors;
}

/**
 * ConfirmDialog Widget.
 *
 * Renders a modal confirmation dialog matching amp's n0R exactly.
 *
 * 逆向: n0R at actions_intents.js:3469-3547
 *
 * Layout:
 *   Focus(autofocus, onKey) → Center → Container(constraints, border, bg, padding)
 *     → Column(crossAxis: start, mainSize: min) → [
 *         RichText(title, primary+bold),
 *         if message: SizedBox(h:1) + RichText(message, foreground),
 *         SizedBox(h:1),
 *         Row → RichText(keybind hints)
 *       ]
 *
 * @example
 * ```ts
 * new ConfirmDialog({
 *   title: "Delete file?",
 *   message: "This action cannot be undone.",
 *   onConfirm: () => doAction(),
 *   onCancel: () => dismiss(),
 *   terminalWidth: 80,
 *   terminalHeight: 24,
 *   colors: {
 *     primary: themeData.primary,
 *     foreground: themeData.text,
 *     background: themeData.background,
 *     keybind: appTheme.keybind,
 *   },
 * });
 * ```
 */
export class ConfirmDialog extends StatelessWidget {
  readonly title: string;
  readonly message: string | undefined;
  readonly confirmButtonText: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly terminalWidth: number;
  readonly terminalHeight: number;
  readonly colors: ConfirmDialogColors;

  constructor(args: ConfirmDialogArgs) {
    super({ key: args.key });
    this.title = args.title;
    this.message = args.message;
    this.confirmButtonText = args.confirmButtonText ?? "yes";
    this.onConfirm = args.onConfirm;
    this.onCancel = args.onCancel;
    this.terminalWidth = args.terminalWidth ?? 80;
    this.terminalHeight = args.terminalHeight ?? 24;
    this.colors = args.colors ?? DEFAULT_COLORS;
  }

  /**
   * Build the confirmation dialog.
   *
   * 逆向: n0R.build at actions_intents.js:3483-3546
   *
   * Structure: Focus(autofocus, onKey) → Center → Container(constraints, border, bg, padding)
   *   → Column(crossAxis: start, mainSize: min) → children
   */
  build(_context: BuildContext): WidgetInterface {
    const { primary, foreground, background, keybind } = this.colors;

    // 逆向: lines 3488-3489 — h = termWidth - 4, i = clamp(h, 50, 80)
    const h = this.terminalWidth - 4;
    const boxWidth = Math.max(50, Math.min(80, h));

    // ── Text styles ──────────────────────────────────
    // 逆向: line 3491-3492 — c = TextStyle(primary, bold)
    const titleStyle = new TextStyle({ foreground: primary, bold: true });
    // 逆向: line 3493-3495 — s = TextStyle(foreground)
    const messageStyle = new TextStyle({ foreground });
    // 逆向: line 3496-3498 — A = TextStyle(foreground, dim)
    const dimStyle = new TextStyle({ foreground, dim: true });
    // 逆向: line 3499-3501 — l = TextStyle(app.keybind)
    const keybindStyle = new TextStyle({ foreground: keybind });

    // ── Build children array ─────────────────────────
    // 逆向: lines 3505-3520
    const children: WidgetInterface[] = [];

    // Title
    // 逆向: line 3507-3509 — new xT({ text: new G(title, c) })
    children.push(
      new RichText({
        text: new TextSpan({ text: this.title, style: titleStyle }),
      }) as unknown as WidgetInterface,
    );

    // Optional message with spacer
    // 逆向: lines 3510-3514
    if (this.message) {
      children.push(new SizedBox({ height: 1 }) as unknown as WidgetInterface);
      children.push(
        new RichText({
          text: new TextSpan({ text: this.message, style: messageStyle }),
        }) as unknown as WidgetInterface,
      );
    }

    // Spacer before keybind hints
    // 逆向: lines 3515-3516
    children.push(new SizedBox({ height: 1 }) as unknown as WidgetInterface);

    // Keybind hints — inline text, not buttons
    // 逆向: lines 3517-3521
    //   new T0({ children: [new xT({ text: new G("", void 0, [
    //     new G("y", l), new G(` ${n.toLowerCase()} · `, A),
    //     new G("n", l), new G("/"),
    //     new G("Esc", l), new G(" cancel", A)
    //   ]) })] })
    const confirmText = this.confirmButtonText.toLowerCase();
    const keybindHints = new Row({
      children: [
        new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({ text: "y", style: keybindStyle }),
              new TextSpan({ text: ` ${confirmText} \u00B7 `, style: dimStyle }),
              new TextSpan({ text: "n", style: keybindStyle }),
              new TextSpan({ text: "/" }),
              new TextSpan({ text: "Esc", style: keybindStyle }),
              new TextSpan({ text: " cancel", style: dimStyle }),
            ],
          }),
        }) as unknown as WidgetInterface,
      ],
    }) as unknown as WidgetInterface;

    children.push(keybindHints);

    // ── Container with border and padding ────────────
    // 逆向: lines 3522-3534
    //   new SR({
    //     constraints: new o0(i - 4, i - 4, 0, r - 6),
    //     decoration: { color: R.background, border: h9.all(new e9(R.primary, 1, "rounded")) },
    //     padding: TR.all(2),
    //     child: new xR({ crossAxisAlignment: "start", mainAxisSize: "min", children: p })
    //   })
    const dialogBox = new Container({
      constraints: new BoxConstraints({
        minWidth: boxWidth - 4,
        maxWidth: boxWidth - 4,
        minHeight: 0,
        maxHeight: this.terminalHeight - 6,
      }),
      decoration: new BoxDecoration({
        color: background,
        border: Border.all(new BorderSide(primary, 1, "rounded")),
      }),
      padding: EdgeInsets.all(2),
      child: new Column({
        crossAxisAlignment: "start",
        mainAxisSize: "min",
        children,
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    // ── Focus wrapper with key handler ───────────────
    // 逆向: lines 3535-3546
    //   new C8({ autofocus: true, onKey: m => { ... }, child: new N0({ child: _ }) })
    return new Focus({
      autofocus: true,
      debugLabel: "ConfirmDialog",
      onKey: (event) => {
        if (event.key === "y" || event.key === "Y") {
          this.onConfirm();
          return "handled";
        }
        if (event.key === "n" || event.key === "N" || event.key === "Escape") {
          this.onCancel();
          return "handled";
        }
        return "ignored";
      },
      child: new Center({
        child: dialogBox,
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }
}
