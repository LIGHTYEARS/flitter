/**
 * PromptDialog — modal text input dialog with confirm/cancel.
 *
 * 逆向: chunk-006.js:35929-35945 — pendingInputDialog pattern
 *       chunk-006.js:36814-36823 — showInputDialog({ message, onSubmit, onCancel })
 *       chunk-006.js:37414-37429 — pendingInputDialog rendering
 *
 * Renders a dialog with:
 * - A prompt message
 * - A text input field (placeholder for now — actual input field integration
 *   would use InputField from packages/cli)
 * - Confirm/Cancel actions
 * - Keyboard: Enter to submit, Escape to cancel
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
//  PromptDialog Widget
// ════════════════════════════════════════════════════

/** PromptDialog constructor arguments. */
interface PromptDialogArgs {
  /** Optional key */
  key?: Key;
  /** Prompt message to display */
  message: string;
  /** Title of the dialog */
  title?: string;
  /** Placeholder text for the input field */
  placeholder?: string;
  /** Initial input value */
  initialValue?: string;
  /** Text for the confirm button, default "OK" */
  confirmLabel?: string;
  /** Text for the cancel button, default "Cancel" */
  cancelLabel?: string;
  /** Called when user submits (with the input value) */
  onSubmit: (value: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Width of the dialog, default 50 */
  width?: number;
}

/**
 * PromptDialog Widget.
 *
 * Renders a modal dialog with a text prompt and input area.
 * This is a structural/layout widget — the actual text input
 * editing is handled by the child InputField widget provided
 * by the CLI layer when wired into the app.
 *
 * 逆向: chunk-006.js:36814-36823 — showInputDialog pattern:
 *   R.showInputDialog = NT => {
 *     this.pendingInputDialog = {
 *       message: NT.message, onSubmit: ..., onCancel: ...
 *     };
 *   }
 *
 * @example
 * ```ts
 * new PromptDialog({
 *   message: "Enter file name:",
 *   placeholder: "filename.txt",
 *   onSubmit: (value) => saveFile(value),
 *   onCancel: () => dismiss(),
 * });
 * ```
 */
export class PromptDialog extends StatelessWidget {
  readonly message: string;
  readonly title: string;
  readonly placeholder: string;
  readonly initialValue: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onSubmit: (value: string) => void;
  readonly onCancel: () => void;
  readonly dialogWidth: number;

  constructor(args: PromptDialogArgs) {
    super({ key: args.key });
    this.message = args.message;
    this.title = args.title ?? "Input";
    this.placeholder = args.placeholder ?? "";
    this.initialValue = args.initialValue ?? "";
    this.confirmLabel = args.confirmLabel ?? "OK";
    this.cancelLabel = args.cancelLabel ?? "Cancel";
    this.onSubmit = args.onSubmit;
    this.onCancel = args.onCancel;
    this.dialogWidth = args.width ?? 50;
  }

  /**
   * Build the prompt dialog.
   *
   * 逆向: chunk-006.js:37414-37429 — input dialog rendering pattern
   */
  build(_context: BuildContext): WidgetInterface {
    // Title
    const titleWidget = new RichText({
      text: new TextSpan({
        text: this.title,
        style: new TextStyle({ foreground: Color.cyan(), bold: true }),
      }),
    }) as unknown as WidgetInterface;

    // Message
    const messageWidget = new Text({ data: this.message }) as unknown as WidgetInterface;

    // Input area placeholder
    // Note: in a full wiring, this would be replaced by an InputField widget
    const inputDisplay = new Container({
      padding: EdgeInsets.symmetric(0, 1),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(Color.rgb(108, 112, 134), 1, "solid")),
      }),
      child: new Text({
        data: this.initialValue || this.placeholder,
        style: this.initialValue
          ? undefined
          : new TextStyle({ foreground: Color.rgb(128, 128, 128), dim: true }),
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    // Button row
    const confirmBtn = new GestureDetector({
      onTap: () => this.onSubmit(this.initialValue),
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

    const buttonRow = new Row({
      children: [confirmBtn, new SizedBox({ width: 2 }) as unknown as WidgetInterface, cancelBtn],
    }) as unknown as WidgetInterface;

    // Keybind hint
    const hintWidget = new RichText({
      text: new TextSpan({
        text: "Enter = submit, Esc = cancel",
        style: new TextStyle({ foreground: Color.rgb(128, 128, 128), dim: true }),
      }),
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
          inputDisplay,
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
        debugLabel: "PromptDialog",
        onKey: (event) => {
          if (event.key === "Enter") {
            this.onSubmit(this.initialValue);
            return "handled";
          }
          if (event.key === "Escape") {
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
