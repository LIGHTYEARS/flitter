/**
 * ConfirmDialog — modal confirmation dialog with Yes/No buttons.
 *
 * 逆向: T0R at chunk-006.js:21579 — confirmation dialog state
 *       chunk-006.js:36824-36828 — showConfirmDialog({ message, onConfirm, onCancel })
 *       chunk-006.js:37430-37441 — pendingConfirmDialog rendering pattern
 *       XRR at chunk-006.js:21244 — dialog with border + scroll + button footer
 *
 * ConfirmDialog renders a modal dialog with:
 * - A message
 * - Yes/No (or custom) buttons
 * - Keyboard navigation: Y/Enter for confirm, N/Escape for cancel
 * - Focus trapping
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { PopupOverlay } from "./popup-overlay.js";
import { Container } from "../widgets/container.js";
import { Column } from "../widgets/column.js";
import { Row } from "../widgets/row.js";
import { Text } from "../widgets/text.js";
import { Focus } from "../widgets/focus.js";
import { GestureDetector } from "../widgets/gesture-detector.js";
import { SizedBox } from "../widgets/sized-box.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "../widgets/text-span.js";
import { RichText } from "../widgets/rich-text.js";
import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  ConfirmDialog Widget
// ════════════════════════════════════════════════════

/** ConfirmDialog constructor arguments. */
interface ConfirmDialogArgs {
  /** Optional key */
  key?: Key;
  /** Message to display */
  message: string;
  /** Title of the dialog */
  title?: string;
  /** Text for the confirm button, default "Yes" */
  confirmLabel?: string;
  /** Text for the cancel button, default "No" */
  cancelLabel?: string;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Width of the dialog, default 40 */
  width?: number;
}

/**
 * ConfirmDialog Widget.
 *
 * Renders a modal dialog asking for user confirmation. Supports
 * keyboard shortcuts (Y/Enter = confirm, N/Escape = cancel) and
 * mouse click on buttons.
 *
 * 逆向: chunk-006.js:36824-36828 — showConfirmDialog pattern:
 *   R.showConfirmDialog = NT => {
 *     this.pendingConfirmDialog = {
 *       message: NT.message, onConfirm: ..., onCancel: ...
 *     };
 *   }
 *
 * 逆向: chunk-006.js:37430-37441 — rendering:
 *   if (this.pendingConfirmDialog) {
 *     // Render with confirm/cancel buttons
 *     this.pendingConfirmDialog = null; // on resolution
 *   }
 *
 * @example
 * ```ts
 * new ConfirmDialog({
 *   message: "Are you sure?",
 *   title: "Confirmation",
 *   onConfirm: () => doAction(),
 *   onCancel: () => dismiss(),
 * });
 * ```
 */
export class ConfirmDialog extends StatelessWidget {
  readonly message: string;
  readonly title: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly dialogWidth: number;

  constructor(args: ConfirmDialogArgs) {
    super({ key: args.key });
    this.message = args.message;
    this.title = args.title ?? "Confirm";
    this.confirmLabel = args.confirmLabel ?? "Yes";
    this.cancelLabel = args.cancelLabel ?? "No";
    this.onConfirm = args.onConfirm;
    this.onCancel = args.onCancel;
    this.dialogWidth = args.width ?? 40;
  }

  /**
   * Build the confirmation dialog.
   *
   * 逆向: XRR.build at chunk-006.js:21271-21414
   *   Structure: PopupOverlay > Container(border) > Column > [title, message, buttons]
   */
  build(_context: BuildContext): WidgetInterface {
    // Title row
    const titleWidget = new RichText({
      text: new TextSpan({
        text: this.title,
        style: new TextStyle({ foreground: Color.cyan(), bold: true }),
      }),
    }) as unknown as WidgetInterface;

    // Message
    const messageWidget = new Text({ data: this.message }) as unknown as WidgetInterface;

    // Button row: [confirmLabel]  [cancelLabel]
    // 逆向: chunk-006.js:21350-21383 — footer with keybind hints
    const confirmBtn = new GestureDetector({
      onTap: this.onConfirm,
      child: new RichText({
        text: new TextSpan({
          text: `[${this.confirmLabel}]`,
          style: new TextStyle({ foreground: Color.green(), bold: true }),
        }),
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    const cancelBtn = new GestureDetector({
      onTap: this.onCancel,
      child: new RichText({
        text: new TextSpan({
          text: `[${this.cancelLabel}]`,
          style: new TextStyle({ foreground: Color.red(), bold: true }),
        }),
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    // Keybind hint
    const hintWidget = new RichText({
      text: new TextSpan({
        text: "Y/Enter = confirm, N/Esc = cancel",
        style: new TextStyle({ foreground: Color.rgb(128, 128, 128), dim: true }),
      }),
    }) as unknown as WidgetInterface;

    const buttonRow = new Row({
      children: [confirmBtn, new Spacer() as unknown as WidgetInterface, cancelBtn],
    }) as unknown as WidgetInterface;

    const dialogContent = new Container({
      width: this.dialogWidth,
      padding: EdgeInsets.all(1),
      decoration: new BoxDecoration({
        color: Color.rgb(30, 30, 46),
        border: Border.all(new BorderSide(Color.rgb(108, 112, 134), 1, "rounded")),
      }),
      child: new Column({
        children: [
          titleWidget,
          new SizedBox({ height: 1 }) as unknown as WidgetInterface,
          messageWidget,
          new SizedBox({ height: 1 }) as unknown as WidgetInterface,
          buttonRow,
          hintWidget,
        ],
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    return new PopupOverlay({
      onDismiss: this.onCancel,
      child: new Focus({
        autofocus: true,
        debugLabel: "ConfirmDialog",
        onKey: (event) => {
          if (event.key === "y" || event.key === "Y" || event.key === "Enter") {
            this.onConfirm();
            return "handled";
          }
          if (event.key === "n" || event.key === "N" || event.key === "Escape") {
            this.onCancel();
            return "handled";
          }
          return "ignored";
        },
        child: dialogContent,
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }
}
