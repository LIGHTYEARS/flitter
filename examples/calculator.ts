// calculator.ts — Simple calculator display with keyboard input.
//
// Run with: bun run examples/calculator.ts
//
// Controls:
// - 0-9: Input digits
// - +, -, *, /: Operations
// - = or Enter: Evaluate expression
// - c: Clear
// - Backspace: Delete last character
// - q or Ctrl+C: Quit
//
// This example demonstrates:
// - StatefulWidget with complex keyboard handling
// - Expression parsing and evaluation
// - Bordered display panel with styled number rendering
// - Dynamic color feedback based on state
// - Container decorations and layout composition

import { runApp, WidgetsBinding } from '../src/framework/binding';
import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { Center } from '../src/widgets/center';
import { Column, Row } from '../src/widgets/flex';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
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
// CalculatorApp — StatefulWidget with keyboard-driven calculator
// ---------------------------------------------------------------------------

export class CalculatorApp extends StatefulWidget {
  createState(): CalculatorState {
    return new CalculatorState();
  }
}

export class CalculatorState extends State<CalculatorApp> {
  expression = '';
  result = '';
  hasError = false;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    this._focusNode = new FocusNode({
      debugLabel: 'CalculatorFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        return this._handleKey(event);
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
    super.dispose();
  }

  private _handleKey(event: KeyEvent): KeyEventResult {
    // Quit
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
      process.exit(0);
    }

    // Clear
    if (event.key === 'c') {
      this.setState(() => {
        this.expression = '';
        this.result = '';
        this.hasError = false;
      });
      return 'handled';
    }

    // Backspace
    if (event.key === 'Backspace') {
      this.setState(() => {
        this.expression = this.expression.slice(0, -1);
        this.hasError = false;
      });
      return 'handled';
    }

    // Evaluate
    if (event.key === '=' || event.key === 'Enter') {
      this.setState(() => {
        this._evaluate();
      });
      return 'handled';
    }

    // Digits
    if (event.key >= '0' && event.key <= '9') {
      this.setState(() => {
        this.expression += event.key;
        this.hasError = false;
      });
      return 'handled';
    }

    // Decimal point
    if (event.key === '.') {
      this.setState(() => {
        this.expression += '.';
        this.hasError = false;
      });
      return 'handled';
    }

    // Operators
    if (['+', '-', '*', '/'].includes(event.key)) {
      this.setState(() => {
        this.expression += ` ${event.key} `;
        this.hasError = false;
      });
      return 'handled';
    }

    return 'ignored';
  }

  private _evaluate(): void {
    if (this.expression.trim().length === 0) return;

    try {
      // Simple safe evaluation: only allow digits, operators, dots, spaces, parens
      const sanitized = this.expression.replace(/[^0-9+\-*/.() ]/g, '');
      if (sanitized.length === 0) {
        this.result = 'Error';
        this.hasError = true;
        return;
      }

      // Use Function constructor for basic math evaluation
      const fn = new Function(`return (${sanitized});`);
      const value = fn();

      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        this.result = String(Math.round(value * 100000000) / 100000000);
        this.hasError = false;
      } else {
        this.result = 'Error';
        this.hasError = true;
      }
    } catch {
      this.result = 'Error';
      this.hasError = true;
    }
  }

  build(_context: BuildContext): Widget {
    const borderColor = this.hasError ? Color.red : Color.cyan;
    const resultColor = this.hasError
      ? Color.red
      : this.result.length > 0
        ? Color.green
        : Color.white;

    // Display expression (or placeholder if empty)
    const displayExpr = this.expression.length > 0
      ? this.expression
      : '0';

    // Display result
    const displayResult = this.result.length > 0
      ? `= ${this.result}`
      : '';

    // Build button-like grid display (visual only, not clickable)
    const buttonRow = (keys: string[]): Widget => {
      return new Row({
        mainAxisAlignment: 'center',
        children: keys.map(k => {
          const isOp = ['+', '-', '*', '/', '=', 'C'].includes(k);
          return new Padding({
            padding: EdgeInsets.symmetric({ horizontal: 1 }),
            child: new Container({
              width: 5,
              height: 1,
              decoration: new BoxDecoration({
                color: isOp ? Color.blue : Color.brightBlack,
              }),
              child: new Center({
                child: label(k, new TextStyle({
                  bold: true,
                  foreground: isOp ? Color.yellow : Color.white,
                })),
              }),
            }),
          });
        }),
      });
    };

    return new Center({
      child: new Container({
        width: 42,
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: borderColor, style: 'rounded' })),
        }),
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'stretch',
          children: [
            // Title bar
            new Container({
              decoration: new BoxDecoration({ color: borderColor }),
              child: label(' Calculator ', new TextStyle({ bold: true })),
            }),
            new SizedBox({ height: 1 }),

            // Display panel
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: new Container({
                decoration: new BoxDecoration({
                  border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
                }),
                child: new Padding({
                  padding: EdgeInsets.symmetric({ horizontal: 1 }),
                  child: new Column({
                    mainAxisSize: 'min',
                    crossAxisAlignment: 'end',
                    children: [
                      // Expression line
                      label(displayExpr, new TextStyle({ foreground: Color.white })),
                      // Result line
                      label(displayResult, new TextStyle({
                        bold: true,
                        foreground: resultColor,
                      })),
                    ],
                  }),
                }),
              }),
            }),
            new SizedBox({ height: 1 }),

            // Button grid (visual reference)
            buttonRow(['7', '8', '9', '/', 'C']),
            buttonRow(['4', '5', '6', '*', ' ']),
            buttonRow(['1', '2', '3', '-', ' ']),
            buttonRow(['0', '.', ' ', '+', '=']),
            new SizedBox({ height: 1 }),

            // Help text
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 1 }),
              child: label('Type digits/ops  Enter/=: eval  c: clear  q: quit', new TextStyle({ dim: true })),
            }),
          ],
        }),
      }),
    });
  }
}

// Export for testing
export const createCalculatorApp = (): CalculatorApp => new CalculatorApp();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(new CalculatorApp()).then(binding => binding.setOutput(process.stdout));
}
