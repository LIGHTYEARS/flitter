// ConfirmationOverlay — Generic confirmation dialog with N-option support.
//
// Matches AMP's eTT (StatefulWidget) / rTT (State) confirmation pattern.
// Used for exit confirmation, clear input confirmation, cancel processing
// confirmation, and any N-choice confirmation flows.
//
// Key behaviors:
// - Modal overlay at CONFIRMATION priority (90) — just below PERMISSION_DIALOG
// - FocusScope absorbs all keys
// - Arrow keys navigate between options, Enter confirms selected option
// - Backward-compatible: when options is empty/undefined, falls back to y/n behavior
// - Style-based coloring: 'primary' (green), 'destructive' (red), 'default' (blue)
//
// AMP ref: eTT/rTT in 10_confirmation_dialog_eTT.js
//   eTT.options → options array
//   eTT.onSelect → callback with selected option value
//   rTT.selectedIndex → arrow-key-navigated index
//
// AMP state fields:
// - isConfirmingExit, isConfirmingClearInput, isConfirmingCancelProcessing
// - exitConfirmTimeout, clearInputConfirmTimeout, cancelProcessingConfirmTimeout

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
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
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Option type
// ---------------------------------------------------------------------------

/** A single option in a multi-option confirmation dialog. */
export interface ConfirmationOption {
  /** Display label for the option. */
  label: string;
  /** Value returned to the onSelect callback when chosen. */
  value: string;
  /** Visual style: 'primary' (green), 'destructive' (red), 'default' (blue). */
  style?: 'primary' | 'destructive' | 'default';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ConfirmationOverlay widget. */
export interface ConfirmationOverlayProps {
  /** Title displayed in bold (e.g., "Exit?" or "Clear input?"). */
  title: string;
  /** Optional descriptive message below the title. */
  message?: string;
  /** Callback when user confirms (presses 'y'). Used in legacy y/n mode. */
  onConfirm: () => void;
  /** Callback when user cancels (presses 'n'). Used in legacy y/n mode. */
  onCancel: () => void;
  /** Callback to dismiss the overlay (presses Escape). Typically same as onCancel. */
  onDismiss: () => void;
  /**
   * Custom options for multi-choice mode (S2-5).
   * When provided and non-empty, replaces the default y/n buttons with
   * N navigable options using arrow keys + Enter.
   */
  options?: ConfirmationOption[];
  /**
   * Callback when user selects an option in multi-choice mode (S2-5).
   * Receives the `value` of the selected ConfirmationOption.
   */
  onSelect?: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.yellow;
const FG_COLOR = Color.white;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

/** Option style to background/foreground color mapping. */
const STYLE_COLORS: Record<string, { bg: Color; fg: Color }> = {
  primary:     { bg: Color.green, fg: Color.black },
  destructive: { bg: Color.red,   fg: Color.black },
  default:     { bg: Color.blue,  fg: Color.black },
};

// ---------------------------------------------------------------------------
// ConfirmationOverlay — routes to legacy or multi-option mode
// ---------------------------------------------------------------------------

/**
 * Generic confirmation overlay matching AMP's eTT/rTT confirmation widget.
 *
 * When `options` is empty or undefined, renders the classic y/n dialog.
 * When `options` is provided, renders a multi-option dialog with arrow
 * key navigation (Up/Down or Left/Right) and Enter to confirm.
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered yellow, padded, maxWidth: 50)
 *         Column
 *           Title (bold)
 *           Message (dim, optional)
 *           SizedBox spacer
 *           Row of option buttons (highlighted selection)
 *           Footer hints
 */
export class ConfirmationOverlay extends StatefulWidget {
  readonly title: string;
  readonly message: string | undefined;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onDismiss: () => void;
  readonly options: ConfirmationOption[];
  readonly onSelect?: (value: string) => void;

  constructor(props: ConfirmationOverlayProps) {
    super();
    this.title = props.title;
    this.message = props.message;
    this.onConfirm = props.onConfirm;
    this.onCancel = props.onCancel;
    this.onDismiss = props.onDismiss;
    this.options = props.options ?? [];
    this.onSelect = props.onSelect;
  }

  /** Whether multi-option mode is active. */
  get isMultiOption(): boolean {
    return this.options.length > 0;
  }

  createState(): ConfirmationOverlayState {
    return new ConfirmationOverlayState();
  }
}

// ---------------------------------------------------------------------------
// ConfirmationOverlayState — manages selectedIndex for arrow navigation
// ---------------------------------------------------------------------------

/**
 * State for ConfirmationOverlay. Tracks the currently selected option index
 * for multi-option mode. Matches AMP's rTT state class.
 */
class ConfirmationOverlayState extends State<ConfirmationOverlay> {
  /** Currently highlighted option index (multi-option mode). */
  private selectedIndex = 0;

  override initState(): void {
    super.initState();
    this.selectedIndex = 0;
  }

  override didUpdateWidget(oldWidget: ConfirmationOverlay): void {
    // Reset selection when options change
    if (this.widget.options !== oldWidget.options) {
      this.selectedIndex = 0;
    }
  }

  /**
   * Handle key events for the confirmation overlay.
   * Legacy mode: y/n/Escape.
   * Multi-option mode: ArrowLeft/ArrowRight/ArrowUp/ArrowDown + Enter/Escape.
   */
  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (this.widget.isMultiOption) {
      return this._handleMultiOptionKey(event);
    }
    return this._handleLegacyKey(event);
  };

  /** Legacy y/n key handler. */
  private _handleLegacyKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'y' || event.key === 'Y') {
      this.widget.onConfirm();
      return 'handled';
    }
    if (event.key === 'n' || event.key === 'N') {
      this.widget.onCancel();
      return 'handled';
    }
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }
    // Absorb all other keys while overlay is shown
    return 'handled';
  }

  /** Multi-option arrow key navigation + Enter handler. */
  private _handleMultiOptionKey(event: KeyEvent): KeyEventResult {
    const optionCount = this.widget.options.length;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      this.setState(() => {
        this.selectedIndex = (this.selectedIndex + 1) % optionCount;
      });
      log.debug('ConfirmationOverlay: navigate', { selectedIndex: this.selectedIndex });
      return 'handled';
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      this.setState(() => {
        this.selectedIndex = (this.selectedIndex - 1 + optionCount) % optionCount;
      });
      log.debug('ConfirmationOverlay: navigate', { selectedIndex: this.selectedIndex });
      return 'handled';
    }
    if (event.key === 'Enter') {
      const selected = this.widget.options[this.selectedIndex];
      log.info('ConfirmationOverlay: selected', { value: selected.value, index: this.selectedIndex });
      if (this.widget.onSelect) {
        this.widget.onSelect(selected.value);
      }
      return 'handled';
    }
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }
    // Absorb all other keys while overlay is shown
    return 'handled';
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
          text: this.widget.title,
          style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
        }),
      }),
    ];

    // Optional message
    if (this.widget.message) {
      contentChildren.push(
        new Text({
          text: new TextSpan({
            text: this.widget.message,
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    }

    contentChildren.push(new SizedBox({ height: 1 }));

    // Build option buttons: legacy y/n or multi-option
    if (this.widget.isMultiOption) {
      contentChildren.push(this._buildMultiOptionRow());
    } else {
      contentChildren.push(this._buildLegacyOptionRow());
    }

    // Footer
    contentChildren.push(new SizedBox({ height: 1 }));
    contentChildren.push(this._buildFooter());

    return new FocusScope({
      autofocus: true,
      onKey: this._handleKey,
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

  /** Build legacy [y] Yes / [n] No option row. */
  private _buildLegacyOptionRow(): Widget {
    return new Row({
      children: [
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
      ],
    });
  }

  /**
   * Build multi-option row with arrow-key-navigable buttons.
   * The currently selected option gets an inverted-color highlight;
   * unselected options are rendered with dim text.
   */
  private _buildMultiOptionRow(): Widget {
    const children: Widget[] = [];

    for (let i = 0; i < this.widget.options.length; i++) {
      const opt = this.widget.options[i];
      const isSelected = i === this.selectedIndex;
      const styleKey = opt.style ?? 'default';
      const colors = STYLE_COLORS[styleKey] ?? STYLE_COLORS.default;

      if (i > 0) {
        children.push(new SizedBox({ width: 2 }));
      }

      if (isSelected) {
        // Selected: inverted-color background with bold label
        children.push(
          new Text({
            text: new TextSpan({
              text: ` ${opt.label} `,
              style: new TextStyle({
                foreground: colors.fg,
                background: colors.bg,
                bold: true,
              }),
            }),
          }),
        );
      } else {
        // Unselected: dim text
        children.push(
          new Text({
            text: new TextSpan({
              text: ` ${opt.label} `,
              style: new TextStyle({ foreground: MUTED_COLOR }),
            }),
          }),
        );
      }
    }

    return new Row({ children });
  }

  /** Build footer hints. */
  private _buildFooter(): Widget {
    const hints: TextSpan[] = [];

    if (this.widget.isMultiOption) {
      hints.push(
        new TextSpan({
          text: '\u2190\u2192',
          style: new TextStyle({ foreground: KEYBIND_COLOR }),
        }),
        new TextSpan({
          text: ' navigate  ',
          style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
        }),
        new TextSpan({
          text: 'Enter',
          style: new TextStyle({ foreground: KEYBIND_COLOR }),
        }),
        new TextSpan({
          text: ' select  ',
          style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
        }),
      );
    }

    hints.push(
      new TextSpan({
        text: 'Esc',
        style: new TextStyle({ foreground: KEYBIND_COLOR }),
      }),
      new TextSpan({
        text: ' to cancel',
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    );

    return new Text({
      text: new TextSpan({ children: hints }),
    });
  }
}
