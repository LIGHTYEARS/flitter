// ConfirmationOverlay — Generic yes/no confirmation dialog
//
// Matches AMP's TTT (StatefulWidget) / aTT (State) confirmation pattern.
// Used for exit confirmation, clear input confirmation, and cancel processing
// confirmation flows.
//
// Key behaviors:
// - Modal overlay at CONFIRMATION priority (90) — just below PERMISSION_DIALOG
// - FocusScope absorbs all keys
// - 'y' → confirm, 'n' → cancel, Escape → dismiss
// - Inverted-color block style for option buttons matching AMP
//
// AMP state fields:
// - isConfirmingExit, isConfirmingClearInput, isConfirmingCancelProcessing
// - exitConfirmTimeout, clearInputConfirmTimeout, cancelProcessingConfirmTimeout

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ConfirmationOverlay widget. */
export interface ConfirmationOverlayProps {
  /** Title displayed in bold (e.g., "Exit?" or "Clear input?"). */
  title: string;
  /** Optional descriptive message below the title. */
  message?: string;
  /** Callback when user confirms (presses 'y'). */
  onConfirm: () => void;
  /** Callback when user cancels (presses 'n'). */
  onCancel: () => void;
  /** Callback to dismiss the overlay (presses Escape). Typically same as onCancel. */
  onDismiss: () => void;
  /** Additional options beyond yes/no. Each option has a label, keybind, and callback. */
  options?: Array<{
    label: string;
    keybind: string;  // e.g., 'a' for "always allow"
    callback: () => void;
  }>;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.yellow;
const FG_COLOR = Color.white;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

// ---------------------------------------------------------------------------
// ConfirmationOverlay
// ---------------------------------------------------------------------------

/**
 * Generic confirmation overlay matching AMP's TTT/aTT confirmation widget.
 *
 * Renders a modal dialog with a title, optional message, and [y]/[n]
 * option buttons. Used for exit, clear input, and cancel processing
 * confirmation flows.
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered yellow, padded, maxWidth: 50)
 *         Column
 *           Title (bold)
 *           Message (dim, optional)
 *           SizedBox spacer
 *           Row of option buttons
 *           Footer hints
 */
export class ConfirmationOverlay extends StatelessWidget {
  private readonly title: string;
  private readonly message: string | undefined;
  private readonly onConfirm: () => void;
  private readonly onCancel: () => void;
  private readonly onDismiss: () => void;
  private readonly _options: Array<{ label: string; keybind: string; callback: () => void }> | undefined;

  constructor(props: ConfirmationOverlayProps) {
    super({});
    this.title = props.title;
    this.message = props.message;
    this.onConfirm = props.onConfirm;
    this.onCancel = props.onCancel;
    this.onDismiss = props.onDismiss;
    this._options = props.options;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const contentChildren: Widget[] = [
      // Title
      new Text({
        text: new TextSpan({
          text: this.title,
          style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
        }),
      }),
    ];

    // Optional message
    if (this.message) {
      contentChildren.push(
        new Text({
          text: new TextSpan({
            text: this.message,
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    }

    contentChildren.push(new SizedBox({ height: 1 }));

    // Option buttons row — [y] Yes  [n] No matching AMP's inverted-color style
    // Plus any additional options when provided (F11 multi-option support)
    const buttonChildren: Widget[] = [
      // [y] Yes button
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: '[y]',
              style: new TextStyle({ foreground: Color.black, background: Color.green, bold: true }),
            }),
            new TextSpan({
              text: ' Yes',
              style: new TextStyle({ foreground: FG_COLOR }),
            }),
          ],
        }),
      }),
      new SizedBox({ width: 3 }),
      // [n] No button
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: '[n]',
              style: new TextStyle({ foreground: Color.black, background: Color.red, bold: true }),
            }),
            new TextSpan({
              text: ' No',
              style: new TextStyle({ foreground: FG_COLOR }),
            }),
          ],
        }),
      }),
    ];

    // Append additional option buttons (F11)
    if (this._options) {
      for (const opt of this._options) {
        buttonChildren.push(new SizedBox({ width: 3 }));
        buttonChildren.push(
          new Text({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `[${opt.keybind}]`,
                  style: new TextStyle({ foreground: Color.black, background: Color.cyan, bold: true }),
                }),
                new TextSpan({
                  text: ` ${opt.label}`,
                  style: new TextStyle({ foreground: FG_COLOR }),
                }),
              ],
            }),
          }),
        );
      }
    }

    contentChildren.push(new Row({ children: buttonChildren }));

    // Footer
    contentChildren.push(new SizedBox({ height: 1 }));
    contentChildren.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' to cancel',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
          ],
        }),
      }),
    );

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'y' || event.key === 'Y') {
          this.onConfirm();
          return 'handled';
        }
        if (event.key === 'n' || event.key === 'N') {
          this.onCancel();
          return 'handled';
        }
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        // Check additional option keybinds (F11)
        if (this._options) {
          for (const opt of this._options) {
            if (event.key === opt.keybind || event.key === opt.keybind.toUpperCase()) {
              opt.callback();
              return 'handled';
            }
          }
        }
        // Absorb all other keys while overlay is shown
        return 'handled';
      },
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 50 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: contentChildren,
          }),
        }),
      }),
    });
  }
}
