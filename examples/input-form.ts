// Input Form Demo — Demonstrates TextField widgets with focus navigation.
//
// A simple form with multiple input fields (Name, Email, Message).
// Tab to navigate between fields, Enter to submit, Esc to clear.
//
// This example demonstrates:
// - TextEditingController for managing text state
// - TextField widgets with placeholder text
// - StatefulWidget with form state management
// - Row/Column layout for form structure
// - Button for submit action
//
// Run with: bun run examples/input-form.ts

import {
  StatefulWidget,
  StatelessWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { Button } from '../src/widgets/button';
import { TextField, TextEditingController } from '../src/widgets/text-field';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { Expanded } from '../src/widgets/flexible';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const titleStyle = new TextStyle({ bold: true, foreground: Color.cyan });
const labelStyle = new TextStyle({ bold: true });
const dimStyle = new TextStyle({ dim: true });
const successStyle = new TextStyle({ foreground: Color.green });
const errorStyle = new TextStyle({ foreground: Color.red });

// ---------------------------------------------------------------------------
// Helper: create a Text widget from a plain string with optional style
// ---------------------------------------------------------------------------

function textWidget(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? new TextStyle() }),
  });
}

// ---------------------------------------------------------------------------
// InputFormState — manages the form controllers and submission
// ---------------------------------------------------------------------------

export interface FormData {
  name: string;
  email: string;
  message: string;
}

/**
 * InputForm — A StatefulWidget demonstrating TextField + focus navigation.
 */
export class InputForm extends StatefulWidget {
  readonly onSubmit?: (data: FormData) => void;

  constructor(opts?: { onSubmit?: (data: FormData) => void }) {
    super();
    this.onSubmit = opts?.onSubmit;
  }

  createState(): State<InputForm> {
    return new InputFormState();
  }
}

class InputFormState extends State<InputForm> {
  private _nameCtrl!: TextEditingController;
  private _emailCtrl!: TextEditingController;
  private _msgCtrl!: TextEditingController;
  private _statusMessage: string = '';
  private _statusStyle: TextStyle = dimStyle;
  private _focusIndex: number = 0;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    super.initState();
    this._nameCtrl = new TextEditingController();
    this._emailCtrl = new TextEditingController();
    this._msgCtrl = new TextEditingController();
    // Wire keyboard input via FocusNode
    this._focusNode = new FocusNode({
      debugLabel: 'InputFormFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        // Handle quit
        if (event.key === 'q' && event.ctrlKey) {
          process.exit(0);
        }
        const result = this.handleKeyEvent(event.key);
        if (result === 'handled') {
          this.setState(() => {});
        }
        // For printable characters, also type into the current field
        if (result === 'ignored' && event.key.length === 1) {
          this.currentController.insertText(event.key);
          this.setState(() => {});
          return 'handled';
        }
        // Space key is mapped to 'Space' by input parser
        if (result === 'ignored' && event.key === 'Space') {
          this.currentController.insertText(' ');
          this.setState(() => {});
          return 'handled';
        }
        return result;
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
  }

  dispose(): void {
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    this._nameCtrl.dispose();
    this._emailCtrl.dispose();
    this._msgCtrl.dispose();
    super.dispose();
  }

  /** Get the controller for the currently focused field. */
  get currentController(): TextEditingController {
    switch (this._focusIndex) {
      case 0: return this._nameCtrl;
      case 1: return this._emailCtrl;
      case 2: return this._msgCtrl;
      default: return this._nameCtrl;
    }
  }

  /** Get the current focus index (0=Name, 1=Email, 2=Message). */
  get focusIndex(): number {
    return this._focusIndex;
  }

  /** Get the current status message. */
  get statusMessage(): string {
    return this._statusMessage;
  }

  /** Get controllers for testing. */
  get nameController(): TextEditingController { return this._nameCtrl; }
  get emailController(): TextEditingController { return this._emailCtrl; }
  get messageController(): TextEditingController { return this._msgCtrl; }

  /**
   * Handle key events for focus navigation and form actions.
   * Tab: move focus to next field
   * Escape: clear current field
   * Enter: submit form (only from message field or via button)
   */
  handleKeyEvent(key: string): 'handled' | 'ignored' {
    if (key === 'Tab') {
      this._focusIndex = (this._focusIndex + 1) % 3;
      return 'handled';
    }
    if (key === 'Escape') {
      this.currentController.clear();
      return 'handled';
    }
    if (key === 'Enter') {
      this._handleSubmit();
      return 'handled';
    }
    return 'ignored';
  }

  /** Validate and submit the form data. */
  _handleSubmit(): void {
    const name = this._nameCtrl.text.trim();
    const email = this._emailCtrl.text.trim();
    const message = this._msgCtrl.text.trim();

    // Basic validation
    if (name.length === 0) {
      this._statusMessage = 'Error: Name is required';
      this._statusStyle = errorStyle;
      return;
    }
    if (email.length === 0 || !email.includes('@')) {
      this._statusMessage = 'Error: Valid email is required';
      this._statusStyle = errorStyle;
      return;
    }

    const data: FormData = { name, email, message };
    this._statusMessage = `Submitted: ${name} <${email}>`;
    this._statusStyle = successStyle;

    this.widget.onSubmit?.(data);
  }

  build(_context: BuildContext): Widget {
    const formBorder = Border.all(
      new BorderSide({ color: Color.cyan, style: 'rounded' }),
    );

    return new Container({
      decoration: new BoxDecoration({ border: formBorder }),
      child: new Column({
        children: [
          textWidget('Input Form Demo', titleStyle),
          new Divider(),
          // Name field
          new Row({
            children: [
              textWidget('Name:  ', labelStyle),
              new Expanded({
                child: new TextField({
                  controller: this._nameCtrl,
                  placeholder: 'Enter your name',
                }),
              }),
            ],
          }),
          new SizedBox({ height: 1 }),
          // Email field
          new Row({
            children: [
              textWidget('Email: ', labelStyle),
              new Expanded({
                child: new TextField({
                  controller: this._emailCtrl,
                  placeholder: 'you@example.com',
                }),
              }),
            ],
          }),
          new SizedBox({ height: 1 }),
          // Message field
          new Row({
            children: [
              textWidget('Msg:   ', labelStyle),
              new Expanded({
                child: new TextField({
                  controller: this._msgCtrl,
                  placeholder: 'Type your message',
                }),
              }),
            ],
          }),
          new Divider(),
          // Submit button
          Row.center([
            new Button({
              text: 'Submit',
              onPressed: () => this._handleSubmit(),
            }),
          ]),
          // Status message
          textWidget(this._statusMessage, this._statusStyle),
          // Help text
          textWidget('Tab: next field | Esc: clear | Enter: submit', dimStyle),
        ],
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export { textWidget };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new InputForm(), { output: process.stdout });
}
