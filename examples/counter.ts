// counter.ts — A counter app demonstrating StatefulWidget and keyboard handling.
//
// Run with: bun run examples/counter.ts
//
// Controls:
// - Press UP arrow or '+' / '=' to increment
// - Press DOWN arrow or '-' to decrement
// - Press 'r' to reset to 0
// - Press 'q' or Ctrl+C to quit
//
// This example demonstrates:
// - StatefulWidget and State for mutable state management
// - setState() to trigger rebuilds when state changes
// - FocusNode for keyboard input handling
// - Column layout with mainAxisSize and mainAxisAlignment
// - Dynamic styling based on state (color changes with count)

import { runApp, WidgetsBinding } from '../src/framework/binding';
import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { Center } from '../src/widgets/center';
import { Column } from '../src/widgets/flex';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// CounterApp — StatefulWidget with keyboard-driven state
// ---------------------------------------------------------------------------

export class CounterApp extends StatefulWidget {
  createState(): CounterState {
    return new CounterState();
  }
}

class CounterState extends State<CounterApp> {
  count = 0;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    // Create a focus node to receive keyboard events.
    // In a full app, a FocusScope widget would manage this; here we wire it manually.
    this._focusNode = new FocusNode({
      debugLabel: 'CounterFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        return this._handleKey(event);
      },
    });
    // Register and request focus so key events are routed here
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
    if (['ArrowUp', '+', '='].includes(event.key)) {
      this.setState(() => { this.count++; });
      return 'handled';
    }
    if (['ArrowDown', '-'].includes(event.key)) {
      this.setState(() => { this.count--; });
      return 'handled';
    }
    if (event.key === 'r') {
      this.setState(() => { this.count = 0; });
      return 'handled';
    }
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
      process.exit(0);
    }
    return 'ignored';
  }

  build(_context: BuildContext): Widget {
    // Choose color based on count value: green for positive, red for negative, white for zero
    const countColor = this.count > 0
      ? Color.green
      : this.count < 0
        ? Color.red
        : Color.white;

    return new Center({
      child: new Column({
        mainAxisSize: 'min',
        mainAxisAlignment: 'center',
        children: [
          // Title
          new Text({
            text: new TextSpan({
              text: 'Counter',
              style: new TextStyle({ bold: true, foreground: Color.cyan }),
            }),
          }),
          // Spacer
          new SizedBox({ height: 1 }),
          // Count display — dynamic color
          new Text({
            text: new TextSpan({
              text: String(this.count),
              style: new TextStyle({
                foreground: countColor,
                bold: true,
              }),
            }),
          }),
          // Spacer
          new SizedBox({ height: 1 }),
          // Instructions
          new Text({
            text: new TextSpan({
              text: 'Up/+ increment  Down/- decrement  r reset  q quit',
              style: new TextStyle({ dim: true }),
            }),
          }),
        ],
      }),
    });
  }
}

// Export the widget class for testing
export const createCounterApp = (): CounterApp => new CounterApp();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(new CounterApp(), { output: process.stdout });
}
