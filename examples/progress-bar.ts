// progress-bar.ts — Animated progress bar with StatefulWidget.
//
// Run with: bun run examples/progress-bar.ts
//
// Controls:
// - Press 'r' to reset progress to 0%
// - Press 'q' or Ctrl+C to quit
//
// This example demonstrates:
// - StatefulWidget and State for mutable state management
// - Auto-incrementing progress (timer-based state update via setInterval)
// - Colored bar that fills using Container width
// - Percentage text display
// - setState with setInterval pattern
// - FocusNode for keyboard handling

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
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_WIDTH = 40;
const TICK_INTERVAL_MS = 200;
const INCREMENT_PER_TICK = 2;

// ---------------------------------------------------------------------------
// ProgressBarApp — StatefulWidget with timer-based progress
// ---------------------------------------------------------------------------

export class ProgressBarApp extends StatefulWidget {
  createState(): ProgressBarState {
    return new ProgressBarState();
  }
}

export class ProgressBarState extends State<ProgressBarApp> {
  progress = 0; // 0 to 100
  private _focusNode: FocusNode | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    // Set up keyboard focus
    this._focusNode = new FocusNode({
      debugLabel: 'ProgressBarFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        return this._handleKey(event);
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();

    // Start auto-increment timer
    this._timer = setInterval(() => {
      if (this.progress < 100) {
        this.setState(() => {
          this.progress = Math.min(100, this.progress + INCREMENT_PER_TICK);
        });
      }
    }, TICK_INTERVAL_MS);
  }

  dispose(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    super.dispose();
  }

  private _handleKey(event: KeyEvent): KeyEventResult {
    if (event.key === 'r') {
      this.setState(() => { this.progress = 0; });
      return 'handled';
    }
    if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
      process.exit(0);
    }
    return 'ignored';
  }

  build(_context: BuildContext): Widget {
    const pct = this.progress;
    const filledWidth = Math.round((pct / 100) * BAR_WIDTH);
    const emptyWidth = BAR_WIDTH - filledWidth;

    // Color transitions: red (0-33), yellow (34-66), green (67-100)
    let barColor: Color;
    if (pct < 34) {
      barColor = Color.red;
    } else if (pct < 67) {
      barColor = Color.yellow;
    } else {
      barColor = Color.green;
    }

    // Status text
    let statusText: string;
    let statusStyle: TextStyle;
    if (pct >= 100) {
      statusText = 'Complete!';
      statusStyle = new TextStyle({ bold: true, foreground: Color.green });
    } else {
      statusText = 'Loading...';
      statusStyle = new TextStyle({ foreground: barColor });
    }

    // Build the bar using two Containers side by side
    const barChildren: Widget[] = [];

    if (filledWidth > 0) {
      barChildren.push(
        new Container({
          width: filledWidth,
          height: 1,
          decoration: new BoxDecoration({ color: barColor }),
        }),
      );
    }

    if (emptyWidth > 0) {
      barChildren.push(
        new Container({
          width: emptyWidth,
          height: 1,
          decoration: new BoxDecoration({ color: Color.brightBlack }),
        }),
      );
    }

    return new Center({
      child: new Column({
        mainAxisSize: 'min',
        mainAxisAlignment: 'center',
        children: [
          // Title
          new Text({
            text: new TextSpan({
              text: 'Progress Bar',
              style: new TextStyle({ bold: true, foreground: Color.cyan }),
            }),
          }),
          new SizedBox({ height: 1 }),

          // Status line
          new Text({
            text: new TextSpan({ text: statusText, style: statusStyle }),
          }),
          new SizedBox({ height: 1 }),

          // Progress bar
          new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide({ color: barColor, style: 'rounded' })),
            }),
            child: new Row({ children: barChildren }),
          }),
          new SizedBox({ height: 1 }),

          // Percentage
          new Text({
            text: new TextSpan({
              text: `${pct}%`,
              style: new TextStyle({ bold: true, foreground: barColor }),
            }),
          }),
          new SizedBox({ height: 1 }),

          // Instructions
          new Text({
            text: new TextSpan({
              text: 'r: reset  q: quit',
              style: new TextStyle({ dim: true }),
            }),
          }),
        ],
      }),
    });
  }
}

// Export for testing
export const createProgressBarApp = (): ProgressBarApp => new ProgressBarApp();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(new ProgressBarApp()).then(binding => binding.setOutput(process.stdout));
}
