/**
 * Edit and Restore confirmation dialog widgets.
 *
 * These dialogs appear when the user presses 'e' (edit) or 'r' (restore) on a
 * selected message, and the action would affect files in the working directory.
 *
 * 逆向: interactive_widgets.js — handleEditConfirmationRequest / handleRestoreConfirmation
 *   Edit:    "This will delete this message and any subsequent messages in the thread."
 *            + optional affected files list. Buttons: "Confirm edit" / "Cancel"
 *   Restore: "This will delete this message and any subsequent messages in the thread,
 *            and will restore the following files:"
 *            + file list. Buttons: "Delete and restore" / "Delete" / "Cancel"
 *
 * @module
 */

import type { BuildContext, Element, KeyEventResult, Widget } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  Center,
  Color,
  Column,
  Container,
  EdgeInsets,
  Focus,
  Padding,
  RichText,
  SizedBox,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Config for EditConfirmationWidget.
 *
 * 逆向: handleEditConfirmationRequest in interactive_widgets.js
 */
export interface EditConfirmationConfig {
  /** Files that will be affected by the edit. */
  affectedFiles?: string[];
  /** Called when user confirms the edit. */
  onConfirm: () => void;
  /** Called when user cancels. */
  onCancel: () => void;
}

/**
 * Config for RestoreConfirmationWidget.
 *
 * 逆向: handleRestoreConfirmation / showRestoreConfirmation in interactive_widgets.js
 */
export interface RestoreConfirmationConfig {
  /** Files that will be restored to their previous state. */
  affectedFiles?: string[];
  /** Called when user confirms the restore. */
  onConfirm: () => void;
  /** Called when user cancels. */
  onCancel: () => void;
}

// ════════════════════════════════════════════════════
//  Color fallbacks
// ════════════════════════════════════════════════════

const WARNING_COLOR = Color.yellow();
const FILE_REF_COLOR = Color.indexed(6);
const KEYBIND_COLOR = Color.blue();

// ════════════════════════════════════════════════════
//  EditConfirmationWidget
// ════════════════════════════════════════════════════

/**
 * Edit Confirmation dialog — shows warning about message deletion
 * and optionally lists affected files.
 *
 * 逆向: interactive_widgets.js handleEditConfirmationRequest
 *   Dialog text: "This will delete this message and any subsequent
 *   messages in the thread."
 *   + if affectedFiles: "The following files will be affected:" + list
 *   Buttons: [Enter] "Confirm edit" / [Esc] "Cancel"
 */
export class EditConfirmationWidget extends StatelessWidget {
  readonly config: EditConfirmationConfig;

  constructor(config: EditConfirmationConfig) {
    super();
    this.config = config;
  }

  build(context: BuildContext): Widget {
    let appTheme = null;
    try {
      appTheme = AppThemeController.maybeOf(context as unknown as Element);
    } catch {
      // fallback
    }

    const warningColor = appTheme?.waiting ?? WARNING_COLOR;
    const fileRefColor = appTheme?.fileReference ?? FILE_REF_COLOR;
    const keybindColor = appTheme?.keybind ?? KEYBIND_COLOR;
    const fgStyle = new TextStyle({ foreground: Color.default() });
    const dimStyle = new TextStyle({ foreground: Color.default(), dim: true });

    const bodySpans: TextSpan[] = [];

    // Warning text
    bodySpans.push(
      new TextSpan({
        text: "This will delete this message and any subsequent messages in the thread.\n",
        style: new TextStyle({ foreground: warningColor }),
      }),
    );

    // Affected files
    const files = this.config.affectedFiles ?? [];
    if (files.length > 0) {
      bodySpans.push(new TextSpan({ text: "\n" }));
      bodySpans.push(
        new TextSpan({
          text: "The following files will be affected:\n",
          style: dimStyle,
        }),
      );
      for (const f of files) {
        bodySpans.push(
          new TextSpan({
            text: `  \u2022 ${f}\n`,
            style: new TextStyle({ foreground: fileRefColor, dim: true, underline: true }),
          }),
        );
      }
    }

    // Actions
    bodySpans.push(new TextSpan({ text: "\n" }));
    bodySpans.push(
      new TextSpan({ text: "[Enter]", style: new TextStyle({ foreground: keybindColor }) }),
    );
    bodySpans.push(new TextSpan({ text: " Confirm edit", style: fgStyle }));
    bodySpans.push(new TextSpan({ text: "  " }));
    bodySpans.push(
      new TextSpan({ text: "[Esc]", style: new TextStyle({ foreground: keybindColor }) }),
    );
    bodySpans.push(new TextSpan({ text: " Cancel", style: fgStyle }));

    const handleKey = (event: { key: string }): KeyEventResult => {
      if (event.key === "Enter") {
        this.config.onConfirm();
        return "handled";
      }
      if (event.key === "Escape") {
        this.config.onCancel();
        return "handled";
      }
      return "ignored";
    };

    return new Center({
      child: new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide(warningColor, 1, "rounded")),
        }),
        child: new Focus({
          autofocus: true,
          onKey: handleKey,
          debugLabel: "EditConfirmation",
          child: new Padding({
            padding: EdgeInsets.all(2),
            child: new Column({
              mainAxisSize: "min",
              crossAxisAlignment: "start",
              children: [
                new RichText({
                  text: new TextSpan({
                    text: "Edit Message",
                    style: new TextStyle({ foreground: warningColor, bold: true }),
                  }),
                }) as unknown as Widget,
                new SizedBox({ height: 1 }) as unknown as Widget,
                new RichText({
                  text: new TextSpan({ children: bodySpans }),
                }) as unknown as Widget,
              ],
            }),
          }),
        }),
      }),
    }) as unknown as Widget;
  }
}

// ════════════════════════════════════════════════════
//  RestoreConfirmationWidget
// ════════════════════════════════════════════════════

/**
 * Restore Confirmation dialog — shows warning about message deletion
 * and file restoration, with affected files list.
 *
 * 逆向: interactive_widgets.js showRestoreConfirmation
 *   Dialog text: "This will delete this message and any subsequent
 *   messages in the thread, and will restore the following files:"
 *   + file list
 *   Buttons: [Enter] "Delete and restore" (if files) or "Delete" / [Esc] "Cancel"
 */
export class RestoreConfirmationWidget extends StatelessWidget {
  readonly config: RestoreConfirmationConfig;

  constructor(config: RestoreConfirmationConfig) {
    super();
    this.config = config;
  }

  build(context: BuildContext): Widget {
    let appTheme = null;
    try {
      appTheme = AppThemeController.maybeOf(context as unknown as Element);
    } catch {
      // fallback
    }

    const destructiveColor = appTheme?.toolError ?? Color.red();
    const fileRefColor = appTheme?.fileReference ?? FILE_REF_COLOR;
    const keybindColor = appTheme?.keybind ?? KEYBIND_COLOR;
    const fgStyle = new TextStyle({ foreground: Color.default() });
    const _dimStyle = new TextStyle({ foreground: Color.default(), dim: true });

    const bodySpans: TextSpan[] = [];
    const files = this.config.affectedFiles ?? [];
    const hasFiles = files.length > 0;

    // Warning text
    const warningText = hasFiles
      ? "This will delete this message and any subsequent messages in the thread, and will restore the following files:\n"
      : "This will delete this message and any subsequent messages in the thread.\n";

    bodySpans.push(
      new TextSpan({
        text: warningText,
        style: new TextStyle({ foreground: destructiveColor }),
      }),
    );

    // File list
    if (hasFiles) {
      bodySpans.push(new TextSpan({ text: "\n" }));
      for (const f of files) {
        bodySpans.push(
          new TextSpan({
            text: `  \u2022 ${f}\n`,
            style: new TextStyle({ foreground: fileRefColor, dim: true, underline: true }),
          }),
        );
      }
    }

    // Actions
    const confirmLabel = hasFiles ? "Delete and restore" : "Delete";
    bodySpans.push(new TextSpan({ text: "\n" }));
    bodySpans.push(
      new TextSpan({ text: "[Enter]", style: new TextStyle({ foreground: keybindColor }) }),
    );
    bodySpans.push(new TextSpan({ text: ` ${confirmLabel}`, style: fgStyle }));
    bodySpans.push(new TextSpan({ text: "  " }));
    bodySpans.push(
      new TextSpan({ text: "[Esc]", style: new TextStyle({ foreground: keybindColor }) }),
    );
    bodySpans.push(new TextSpan({ text: " Cancel", style: fgStyle }));

    const handleKey = (event: { key: string }): KeyEventResult => {
      if (event.key === "Enter") {
        this.config.onConfirm();
        return "handled";
      }
      if (event.key === "Escape") {
        this.config.onCancel();
        return "handled";
      }
      return "ignored";
    };

    return new Center({
      child: new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide(destructiveColor, 1, "rounded")),
        }),
        child: new Focus({
          autofocus: true,
          onKey: handleKey,
          debugLabel: "RestoreConfirmation",
          child: new Padding({
            padding: EdgeInsets.all(2),
            child: new Column({
              mainAxisSize: "min",
              crossAxisAlignment: "start",
              children: [
                new RichText({
                  text: new TextSpan({
                    text: "Restore to Message",
                    style: new TextStyle({ foreground: destructiveColor, bold: true }),
                  }),
                }) as unknown as Widget,
                new SizedBox({ height: 1 }) as unknown as Widget,
                new RichText({
                  text: new TextSpan({ children: bodySpans }),
                }) as unknown as Widget,
              ],
            }),
          }),
        }),
      }),
    }) as unknown as Widget;
  }
}
