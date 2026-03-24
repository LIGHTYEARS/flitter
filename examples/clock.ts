// clock.ts — Live updating clock with date display.
//
// Run with: bun run examples/clock.ts
//
// Controls:
// - Press 'q' or Ctrl+C to quit
//
// This example demonstrates:
// - StatefulWidget with setInterval for live updates
// - Time-based color changes (hour determines hue)
// - Large styled time display (HH:MM:SS)
// - Date display below the clock
// - Timer cleanup in dispose()

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
import { Container } from '../src/widgets/container';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { Padding } from '../src/widgets/padding';
import { EdgeInsets } from '../src/layout/edge-insets';
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
// Color palette based on hour of the day
// ---------------------------------------------------------------------------

function colorForHour(hour: number): Color {
  // Cycle through colors based on hour to give a sense of time passing
  const colors = [
    Color.blue,        // 0  - midnight
    Color.blue,        // 1
    Color.brightBlue,  // 2
    Color.brightBlue,  // 3
    Color.cyan,        // 4
    Color.cyan,        // 5  - early morning
    Color.brightCyan,  // 6
    Color.brightGreen, // 7
    Color.green,       // 8
    Color.green,       // 9
    Color.yellow,      // 10
    Color.yellow,      // 11 - late morning
    Color.brightYellow,// 12 - noon
    Color.yellow,      // 13
    Color.yellow,      // 14
    Color.brightGreen, // 15
    Color.green,       // 16
    Color.cyan,        // 17 - evening
    Color.brightCyan,  // 18
    Color.blue,        // 19
    Color.brightBlue,  // 20
    Color.magenta,     // 21
    Color.brightMagenta,// 22
    Color.blue,        // 23
  ];
  return colors[hour % 24]!;
}

// ---------------------------------------------------------------------------
// ClockApp — StatefulWidget with timer-based updates
// ---------------------------------------------------------------------------

export class ClockApp extends StatefulWidget {
  createState(): ClockState {
    return new ClockState();
  }
}

export class ClockState extends State<ClockApp> {
  private _now: Date = new Date();
  private _focusNode: FocusNode | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    // Keyboard handling
    this._focusNode = new FocusNode({
      debugLabel: 'ClockFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
          process.exit(0);
        }
        return 'ignored';
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();

    // Update every second
    this._timer = setInterval(() => {
      this.setState(() => {
        this._now = new Date();
      });
    }, 1000);
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

  build(_context: BuildContext): Widget {
    const now = this._now;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    // Date formatting
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const dayName = days[now.getDay()]!;
    const monthName = months[now.getMonth()]!;
    const dateStr = `${dayName}, ${monthName} ${now.getDate()}, ${now.getFullYear()}`;

    // Color based on current hour
    const timeColor = colorForHour(now.getHours());

    // Seconds indicator — blink the colon separator
    const colonStyle = now.getSeconds() % 2 === 0
      ? new TextStyle({ bold: true, foreground: timeColor })
      : new TextStyle({ dim: true, foreground: timeColor });

    // Build the time display with individually styled segments
    const timeDisplay = new Text({
      text: new TextSpan({
        children: [
          new TextSpan({ text: hours, style: new TextStyle({ bold: true, foreground: timeColor }) }),
          new TextSpan({ text: ':', style: colonStyle }),
          new TextSpan({ text: minutes, style: new TextStyle({ bold: true, foreground: timeColor }) }),
          new TextSpan({ text: ':', style: colonStyle }),
          new TextSpan({ text: seconds, style: new TextStyle({ bold: true, foreground: timeColor }) }),
        ],
      }),
    });

    // Period of day label
    const hour = now.getHours();
    let period: string;
    if (hour < 6) period = 'Night';
    else if (hour < 12) period = 'Morning';
    else if (hour < 18) period = 'Afternoon';
    else period = 'Evening';

    return new Center({
      child: new Container({
        width: 40,
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: timeColor, style: 'rounded' })),
        }),
        child: new Column({
          mainAxisSize: 'min',
          mainAxisAlignment: 'center',
          children: [
            // Title bar
            new Container({
              decoration: new BoxDecoration({ color: timeColor }),
              child: new Center({
                child: label(' Clock ', new TextStyle({ bold: true })),
              }),
            }),
            new SizedBox({ height: 1 }),

            // Time display
            new Center({ child: timeDisplay }),
            new SizedBox({ height: 1 }),

            // Date display
            new Center({
              child: label(dateStr, new TextStyle({ foreground: Color.defaultColor })),
            }),

            // Period of day
            new Center({
              child: label(period, new TextStyle({ dim: true, foreground: timeColor })),
            }),
            new SizedBox({ height: 1 }),

            // Help text
            new Center({
              child: label('q: quit', new TextStyle({ dim: true })),
            }),
          ],
        }),
      }),
    });
  }
}

// Export for testing
export const createClockApp = (): ClockApp => new ClockApp();

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new ClockApp(), { output: process.stdout });
}
