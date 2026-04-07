// PermissionDialog — AMP-style HITL confirmation dialog for flitter-cli
//
// Phase 33 rewrite: replaces the old StatelessWidget (Dialog/DialogOverlay/SelectionList)
// with a StatefulWidget that matches AMP's exact HITL confirmation layout:
//   - Full-width bordered box (matches InputArea width)
//   - "Allow [tool_name]?" or "Run this command?" title with bold styling
//   - Command content preview above option buttons
//   - Radio-style option list with ▸● / ○ indicators and [Alt+N] labels
//   - Footer hint: "↑↓ navigate • Enter select • Esc cancel"
//   - Feedback input mode for "Deny with feedback"
//
// AMP source ref: aTT (ConfirmationWidget state), eTT/rTT (ConfirmationDialog)
// Golden ref: tmux-capture/screens/amp/hitl-confirmation/

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Stack, Positioned } from '../../../flitter-core/src/widgets/stack';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { TextField, TextEditingController } from '../../../flitter-core/src/widgets/text-field';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { Theme } from '../../../flitter-core/src/widgets/theme';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { CliThemeProvider, type CliTheme } from '../themes';
import type { PermissionRequest, PermissionResult } from '../state/permission-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for the PermissionDialog widget.
 */
interface PermissionDialogProps {
  /** The permission request to display. */
  request: PermissionRequest;
  /** Callback when the user selects a result (optionId, feedback, or null for cancel). */
  onResult: (result: PermissionResult) => void;
}

// ---------------------------------------------------------------------------
// PermissionDialog — StatefulWidget
// ---------------------------------------------------------------------------

/**
 * AMP-style HITL confirmation dialog.
 *
 * Renders a full-width bordered box at the bottom of the screen with:
 * - Content preview (command, filePath, or JSON) above options
 * - Radio-style option list with ▸●/○ indicators and [Alt+N] shortcut labels
 * - "↑↓ navigate • Enter select • Esc cancel" footer hint
 * - Feedback input mode when "Deny with feedback" is selected
 *
 * Keyboard handling:
 * - ArrowUp/k: move selection up
 * - ArrowDown/j: move selection down
 * - Enter: confirm current selection
 * - Escape: cancel (or exit feedback mode)
 * - Alt+1..Alt+9: direct-select option by index
 */
export class PermissionDialog extends StatefulWidget {
  readonly request: PermissionRequest;
  readonly onResult: (result: PermissionResult) => void;

  constructor(props: PermissionDialogProps) {
    super();
    this.request = props.request;
    this.onResult = props.onResult;
  }

  createState(): PermissionDialogState {
    return new PermissionDialogState();
  }
}

// ---------------------------------------------------------------------------
// PermissionDialogState
// ---------------------------------------------------------------------------

/**
 * State for PermissionDialog. Manages selected index, feedback mode toggle,
 * and builds the AMP-style HITL layout.
 */
export class PermissionDialogState extends State<PermissionDialog> {
  /** Currently selected option index. */
  private _selectedIndex = 0;

  /** Whether feedback input mode is active (user chose "Deny with feedback"). */
  private _feedbackInputActive = false;

  /** Controller for the feedback text input. */
  private _feedbackController: TextEditingController | null = null;

  dispose(): void {
    if (this._feedbackController) {
      this._feedbackController.dispose();
      this._feedbackController = null;
    }
    super.dispose();
  }

  // -----------------------------------------------------------------------
  // Key handling
  // -----------------------------------------------------------------------

  /**
   * Handle key events for option navigation and selection.
   * In feedback mode, only Escape is intercepted; all else goes to TextField.
   */
  private _handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    // Feedback mode: Escape exits back to options
    if (this._feedbackInputActive) {
      if (event.key === 'Escape') {
        this.setState(() => {
          this._feedbackInputActive = false;
          if (this._feedbackController) {
            this._feedbackController.text = '';
          }
        });
        return 'handled';
      }
      return 'ignored';
    }

    const options = this.widget.request.options;

    // Alt+1..Alt+9: direct-select option by index
    if (event.altKey && event.key >= '1' && event.key <= '9') {
      const idx = parseInt(event.key, 10) - 1;
      if (idx >= 0 && idx < options.length) {
        this._confirmOption(idx);
        return 'handled';
      }
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'k':
        this.setState(() => {
          this._selectedIndex = (this._selectedIndex - 1 + options.length) % options.length;
        });
        return 'handled';

      case 'ArrowDown':
      case 'j':
        this.setState(() => {
          this._selectedIndex = (this._selectedIndex + 1) % options.length;
        });
        return 'handled';

      case 'Tab':
        this.setState(() => {
          this._selectedIndex = (this._selectedIndex + 1) % options.length;
        });
        return 'handled';

      case 'Enter':
        this._confirmOption(this._selectedIndex);
        return 'handled';

      case 'Escape':
        this.widget.onResult(null);
        return 'handled';

      default:
        return 'ignored';
    }
  };

  /**
   * Confirm the option at the given index.
   * If the option kind is 'reject_with_feedback', enter feedback mode instead.
   */
  private _confirmOption(index: number): void {
    const options = this.widget.request.options;
    if (index < 0 || index >= options.length) return;

    const option = options[index]!;
    if (option.kind === 'reject_with_feedback') {
      this.setState(() => {
        this._feedbackInputActive = true;
        if (!this._feedbackController) {
          this._feedbackController = new TextEditingController();
        }
      });
      return;
    }

    this.widget.onResult(option.optionId);
  }

  /**
   * Submit feedback text. If empty, fall back to simple "no" response.
   */
  private _submitFeedback = (): void => {
    const text = this._feedbackController?.text.trim() ?? '';
    if (text) {
      this.widget.onResult({ type: 'deny-with-feedback', feedback: text });
    } else {
      // Empty feedback = simple deny
      const denyOption = this.widget.request.options.find(
        (o) => o.kind === 'reject_once' || o.kind === 'reject_always',
      );
      this.widget.onResult(denyOption?.optionId ?? null);
    }
  };

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context) ?? null;
    const themeData = Theme.maybeOf(context);
    const borderColor = theme?.base.warning ?? Color.brightYellow;
    const bgColor = themeData?.background ?? Color.defaultColor;

    // Choose sub-build based on feedback mode
    const innerContent = this._feedbackInputActive
      ? this._buildFeedbackInput(theme, borderColor)
      : this._buildConfirmationContent(theme, borderColor);

    // Full-screen overlay: mask + bottom-aligned dialog
    return new Stack({
      fit: 'expand',
      children: [
        // Background mask
        new Positioned({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          child: new Container({ decoration: new BoxDecoration({ color: bgColor }) }),
        }),
        // Dialog positioned at bottom, full width
        new FocusScope({
          autofocus: true,
          onKey: this._handleKeyEvent,
          child: new Column({
            mainAxisAlignment: 'end',
            crossAxisAlignment: 'stretch',
            children: [innerContent],
          }),
        }),
      ],
    });
  }

  // -----------------------------------------------------------------------
  // Confirmation layout (normal mode)
  // -----------------------------------------------------------------------

  /**
   * Build the AMP-style confirmation dialog content.
   * Layout matches the golden screenshot exactly.
   */
  private _buildConfirmationContent(theme: CliTheme | null, borderColor: Color): Widget {
    const request = this.widget.request;
    const options = request.options;
    const preview = request.contentPreview;

    const primaryColor = theme?.base.primary ?? Color.blue;
    const cyanColor = Color.cyan;
    const dimStyle = new TextStyle({ dim: true });

    const children: Widget[] = [];

    // --- Title / header ---
    const headerText = preview?.header ?? `Allow ${request.toolCall.title}?`;
    children.push(new Text({
      text: new TextSpan({ text: headerText, style: new TextStyle({ bold: true }) }),
    }));

    // --- Content preview (command / filePath / json) ---
    if (preview?.command != null) {
      // Bash command: "$ command" with syntax coloring
      children.push(new Text({
        text: new TextSpan({
          children: [
            new TextSpan({ text: '$ ', style: new TextStyle({ foreground: Color.green, bold: true }) }),
            new TextSpan({ text: preview.command, style: new TextStyle({ foreground: cyanColor }) }),
          ],
        }),
      }));
    }

    if (preview?.filePath != null) {
      children.push(new Text({
        text: new TextSpan({
          text: preview.filePath,
          style: new TextStyle({ foreground: cyanColor, underline: true }),
        }),
      }));
    }

    if (preview?.json != null) {
      // Truncate JSON to 5 lines max
      const lines = preview.json.split('\n');
      const truncated = lines.length > 5
        ? lines.slice(0, 5).join('\n') + '\n...'
        : preview.json;
      children.push(new Text({
        text: new TextSpan({ text: truncated, style: new TextStyle({ foreground: cyanColor }) }),
      }));
    }

    // --- Reason text ---
    if (preview?.reason) {
      children.push(new Text({
        text: new TextSpan({
          text: `(${preview.reason})`,
          style: new TextStyle({ foreground: cyanColor }),
        }),
      }));
    }

    // --- Option list with radio indicators ---
    for (let i = 0; i < options.length; i++) {
      const option = options[i]!;
      const isSelected = i === this._selectedIndex;
      const altLabel = `[Alt+${i + 1}]`;

      const prefix = isSelected ? '\u25B8\u25CF ' : ' \u25CB ';
      const labelStyle = isSelected
        ? new TextStyle({ bold: true, foreground: primaryColor })
        : new TextStyle();
      const shortcutStyle = new TextStyle({ dim: true, foreground: cyanColor });

      children.push(new Text({
        text: new TextSpan({
          children: [
            new TextSpan({ text: prefix, style: isSelected
              ? new TextStyle({ foreground: primaryColor })
              : new TextStyle({ foreground: cyanColor }) }),
            new TextSpan({ text: option.name, style: labelStyle }),
            new TextSpan({ text: ` ${altLabel}`, style: shortcutStyle }),
          ],
        }),
      }));
    }

    // --- Hint text ---
    if (preview?.hint) {
      children.push(new Text({
        text: new TextSpan({ text: preview.hint, style: dimStyle }),
      }));
    }

    // --- Footer ---
    children.push(new Text({
      text: new TextSpan({
        children: [
          new TextSpan({ text: '\u2191\u2193 navigate', style: new TextStyle({ dim: true, foreground: cyanColor }) }),
          new TextSpan({ text: ' \u2022 ', style: new TextStyle({ dim: true, foreground: cyanColor }) }),
          new TextSpan({ text: 'Enter select', style: new TextStyle({ dim: true, foreground: cyanColor }) }),
          new TextSpan({ text: ' \u2022 ', style: new TextStyle({ dim: true, foreground: cyanColor }) }),
          new TextSpan({ text: 'Esc cancel', style: new TextStyle({ dim: true, foreground: cyanColor }) }),
        ],
      }),
    }));

    // --- Bordered container (full-width, rounded, warning color) ---
    const side = new BorderSide({ color: borderColor, width: 1, style: 'rounded' });
    return new Container({
      decoration: new BoxDecoration({ border: Border.all(side) }),
      padding: EdgeInsets.symmetric({ horizontal: 1, vertical: 0 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children,
      }),
    });
  }

  // -----------------------------------------------------------------------
  // Feedback input layout
  // -----------------------------------------------------------------------

  /**
   * Build the feedback input UI matching AMP's buildFeedbackInput().
   * Renders inside a bordered box with primary color border.
   */
  private _buildFeedbackInput(theme: CliTheme | null, _borderColor: Color): Widget {
    const primaryColor = theme?.base.primary ?? Color.blue;
    const destructiveColor = theme?.base.destructive ?? Color.red;
    const secondaryColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const fgColor = theme?.base.foreground ?? Color.defaultColor;

    const children: Widget[] = [];

    // Header: "✗ Denied — tell Amp what to do instead"
    children.push(new Text({
      text: new TextSpan({
        children: [
          new TextSpan({ text: '\u2717 ', style: new TextStyle({ foreground: destructiveColor, bold: true }) }),
          new TextSpan({ text: 'Denied', style: new TextStyle({ foreground: destructiveColor, bold: true }) }),
          new TextSpan({ text: ' \u2014 ', style: new TextStyle({ foreground: secondaryColor }) }),
          new TextSpan({ text: 'tell the assistant what to do instead', style: new TextStyle({ foreground: fgColor }) }),
        ],
      }),
    }));

    children.push(new SizedBox({ height: 1 }));

    // Input row: "› " + TextField
    children.push(new Row({
      crossAxisAlignment: 'center',
      children: [
        new Text({
          text: new TextSpan({
            text: '\u203A ',
            style: new TextStyle({ foreground: primaryColor, bold: true }),
          }),
        }),
        new Expanded({
          child: new TextField({
            controller: this._feedbackController ?? undefined,
            autofocus: true,
            placeholder: 'e.g. "use grep instead" or "don\'t modify that file"',
            onSubmitted: this._submitFeedback,
            maxLines: 1,
          }),
        }),
      ],
    }));

    children.push(new SizedBox({ height: 1 }));

    // Footer: "Enter send  •  Esc cancel"
    children.push(new Text({
      text: new TextSpan({
        children: [
          new TextSpan({ text: 'Enter', style: new TextStyle({ foreground: primaryColor }) }),
          new TextSpan({ text: ' send', style: new TextStyle({ foreground: secondaryColor, dim: true }) }),
          new TextSpan({ text: '  \u2022  ', style: new TextStyle({ foreground: secondaryColor, dim: true }) }),
          new TextSpan({ text: 'Esc', style: new TextStyle({ foreground: primaryColor }) }),
          new TextSpan({ text: ' cancel', style: new TextStyle({ foreground: secondaryColor, dim: true }) }),
        ],
      }),
    }));

    // Bordered with primary color
    const side = new BorderSide({ color: primaryColor, width: 1, style: 'rounded' });
    return new Container({
      decoration: new BoxDecoration({ border: Border.all(side) }),
      padding: EdgeInsets.symmetric({ horizontal: 1, vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children,
      }),
    });
  }
}
