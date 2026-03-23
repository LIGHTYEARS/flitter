// login-form.ts — Login form UI with text fields and validation.
//
// Run with: bun run examples/login-form.ts
//
// Controls:
// - Tab: Navigate between fields
// - Enter: Submit form
// - Escape: Clear current field
// - q (when not in a field): Quit
//
// This example demonstrates:
// - Two TextFields (username, password)
// - Login button with submit action
// - StatefulWidget tracking focused field
// - Validation messages with styled feedback
// - FocusNode for keyboard handling
// - Container with border decorations for form layout

import { runApp, WidgetsBinding } from '../src/framework/binding';
import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { Center } from '../src/widgets/center';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { Button } from '../src/widgets/button';
import { TextField, TextEditingController } from '../src/widgets/text-field';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function label(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: style ?? new TextStyle(),
    }),
  });
}

// ---------------------------------------------------------------------------
// LoginFormApp — StatefulWidget with form fields and validation
// ---------------------------------------------------------------------------

export class LoginFormApp extends StatefulWidget {
  createState(): LoginFormState {
    return new LoginFormState();
  }
}

export class LoginFormState extends State<LoginFormApp> {
  private _usernameCtrl!: TextEditingController;
  private _passwordCtrl!: TextEditingController;
  private _focusedField: 0 | 1 = 0; // 0 = username, 1 = password
  private _message = '';
  private _messageIsError = false;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    this._usernameCtrl = new TextEditingController();
    this._passwordCtrl = new TextEditingController();

    this._focusNode = new FocusNode({
      debugLabel: 'LoginFormFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        return this._handleKey(event);
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
  }

  dispose(): void {
    this._usernameCtrl.dispose();
    this._passwordCtrl.dispose();
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    super.dispose();
  }

  // Public accessors for testing
  get focusedField(): number { return this._focusedField; }
  get message(): string { return this._message; }
  get usernameController(): TextEditingController { return this._usernameCtrl; }
  get passwordController(): TextEditingController { return this._passwordCtrl; }

  private _handleKey(event: KeyEvent): KeyEventResult {
    // Tab to switch fields
    if (event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      this.setState(() => {
        this._focusedField = this._focusedField === 0 ? 1 : 0;
      });
      return 'handled';
    }

    // Enter to submit
    if (event.key === 'Enter') {
      this.setState(() => {
        this._validate();
      });
      return 'handled';
    }

    // Escape to clear current field
    if (event.key === 'Escape') {
      this.setState(() => {
        if (this._focusedField === 0) {
          this._usernameCtrl.clear();
        } else {
          this._passwordCtrl.clear();
        }
        this._message = '';
      });
      return 'handled';
    }

    // Quit
    if (event.key === 'q' && event.ctrlKey) {
      process.exit(0);
    }

    // Backspace
    if (event.key === 'Backspace') {
      this.setState(() => {
        const ctrl = this._focusedField === 0 ? this._usernameCtrl : this._passwordCtrl;
        ctrl.deleteBackward();
      });
      return 'handled';
    }

    // Printable characters
    if (event.key.length === 1) {
      this.setState(() => {
        const ctrl = this._focusedField === 0 ? this._usernameCtrl : this._passwordCtrl;
        ctrl.insertText(event.key);
      });
      return 'handled';
    }

    return 'ignored';
  }

  private _validate(): void {
    const username = this._usernameCtrl.text.trim();
    const password = this._passwordCtrl.text.trim();

    if (username.length === 0) {
      this._message = 'Username is required';
      this._messageIsError = true;
      return;
    }

    if (username.length < 3) {
      this._message = 'Username must be at least 3 characters';
      this._messageIsError = true;
      return;
    }

    if (password.length === 0) {
      this._message = 'Password is required';
      this._messageIsError = true;
      return;
    }

    if (password.length < 6) {
      this._message = 'Password must be at least 6 characters';
      this._messageIsError = true;
      return;
    }

    // Success
    this._message = `Welcome, ${username}! Login successful.`;
    this._messageIsError = false;
  }

  private _buildField(
    fieldLabel: string,
    controller: TextEditingController,
    placeholder: string,
    isFocused: boolean,
    isPassword: boolean,
  ): Widget {
    const borderColor = isFocused ? Color.cyan : Color.brightBlack;
    const labelColor = isFocused ? Color.cyan : Color.white;

    // For password field, show masked text as asterisks
    const displayText = isPassword
      ? '*'.repeat(controller.text.length)
      : controller.text;

    return new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: borderColor, style: 'rounded' })),
      }),
      child: new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Row({
          children: [
            // Focus indicator
            label(isFocused ? '> ' : '  ', new TextStyle({ bold: true, foreground: Color.cyan })),
            // Field label
            label(`${fieldLabel}: `, new TextStyle({ bold: true, foreground: labelColor })),
            // Text field
            new Expanded({
              child: new TextField({
                controller,
                placeholder,
              }),
            }),
          ],
        }),
      }),
    });
  }

  build(_context: BuildContext): Widget {
    // Message styling
    const messageWidget = this._message.length > 0
      ? label(this._message, new TextStyle({
          foreground: this._messageIsError ? Color.red : Color.green,
          bold: true,
        }))
      : label('', new TextStyle());

    return new Center({
      child: new Container({
        width: 50,
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' })),
        }),
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'stretch',
          children: [
            // Title bar
            new Container({
              decoration: new BoxDecoration({ color: Color.cyan }),
              child: new Center({
                child: label(' Login ', new TextStyle({ bold: true })),
              }),
            }),
            new SizedBox({ height: 1 }),

            // Username field
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: this._buildField('Username', this._usernameCtrl, 'Enter username', this._focusedField === 0, false),
            }),
            new SizedBox({ height: 1 }),

            // Password field
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: this._buildField('Password', this._passwordCtrl, 'Enter password', this._focusedField === 1, true),
            }),
            new SizedBox({ height: 1 }),

            // Login button
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: Row.center([
                new Button({
                  text: '  Login  ',
                  onPressed: () => {
                    this.setState(() => {
                      this._validate();
                    });
                  },
                }),
              ]),
            }),
            new SizedBox({ height: 1 }),

            // Validation message
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: new Center({ child: messageWidget }),
            }),

            new Divider({ color: Color.brightBlack }),

            // Help text
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: label('Tab: switch fields  Enter: login  Esc: clear  Ctrl+q: quit', new TextStyle({ dim: true })),
            }),
          ],
        }),
      }),
    });
  }
}

// Export for testing
export const createLoginFormApp = (): LoginFormApp => new LoginFormApp();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(new LoginFormApp(), { output: process.stdout });
}
