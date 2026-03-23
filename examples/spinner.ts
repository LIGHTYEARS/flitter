// spinner.ts — Animated loading spinners with multiple styles.
//
// Run with: bun run examples/spinner.ts
//
// Controls:
// - Press 'q' or Ctrl+C to quit
//
// This example demonstrates:
// - StatefulWidget with timer-based animation
// - Multiple spinner styles using Unicode/braille characters
// - Color cycling through frames
// - Animated "Loading..." text with growing dots
// - setInterval + setState pattern for smooth animation

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
// Spinner definitions
// ---------------------------------------------------------------------------

interface SpinnerDef {
  name: string;
  frames: string[];
  color: Color;
}

const SPINNERS: SpinnerDef[] = [
  {
    name: 'Braille',
    frames: ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'],
    color: Color.cyan,
  },
  {
    name: 'Line',
    frames: ['-', '\\', '|', '/'],
    color: Color.green,
  },
  {
    name: 'Dots',
    frames: ['\u2801', '\u2802', '\u2804', '\u2840', '\u2880', '\u2820', '\u2810', '\u2808'],
    color: Color.yellow,
  },
  {
    name: 'Arrow',
    frames: ['\u2190', '\u2196', '\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199'],
    color: Color.magenta,
  },
  {
    name: 'Bounce',
    frames: ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[ ===]', '[  ==]', '[   =]', '[    ]'],
    color: Color.blue,
  },
  {
    name: 'Clock',
    frames: ['\uD83D\uDD5B', '\uD83D\uDD50', '\uD83D\uDD51', '\uD83D\uDD52', '\uD83D\uDD53', '\uD83D\uDD54', '\uD83D\uDD55', '\uD83D\uDD56', '\uD83D\uDD57', '\uD83D\uDD58', '\uD83D\uDD59', '\uD83D\uDD5A'],
    color: Color.red,
  },
];

// Color cycle for the animated text
const CYCLE_COLORS: Color[] = [
  Color.red, Color.yellow, Color.green, Color.cyan, Color.blue, Color.magenta,
];

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
// SpinnerApp — StatefulWidget with timer-based animation
// ---------------------------------------------------------------------------

export class SpinnerApp extends StatefulWidget {
  createState(): SpinnerState {
    return new SpinnerState();
  }
}

export class SpinnerState extends State<SpinnerApp> {
  frame = 0;
  private _focusNode: FocusNode | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    this._focusNode = new FocusNode({
      debugLabel: 'SpinnerFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'q' || (event.key === 'c' && event.ctrlKey)) {
          process.exit(0);
        }
        return 'ignored';
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();

    // Animate at ~10fps
    this._timer = setInterval(() => {
      this.setState(() => {
        this.frame++;
      });
    }, 100);
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
    const f = this.frame;

    // Build each spinner row
    const spinnerRows: Widget[] = SPINNERS.map(spinner => {
      const frameIndex = f % spinner.frames.length;
      const currentFrame = spinner.frames[frameIndex]!;

      return new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 0 }),
        child: new Row({
          children: [
            // Spinner character
            new Container({
              width: 8,
              child: label(currentFrame, new TextStyle({ bold: true, foreground: spinner.color })),
            }),
            // Spinner name
            new Container({
              width: 10,
              child: label(spinner.name, new TextStyle({ foreground: spinner.color })),
            }),
            // Status text with animated dots
            label(
              `Working${'.'.repeat((f % 4) + 1)}${' '.repeat(3 - (f % 4))}`,
              new TextStyle({ dim: true }),
            ),
          ],
        }),
      });
    });

    // Animated loading bar
    const barWidth = 30;
    const barPos = f % (barWidth * 2);
    const pos = barPos < barWidth ? barPos : barWidth * 2 - barPos;
    const barChars = Array.from({ length: barWidth }, (_, i) => {
      if (i >= pos - 2 && i <= pos + 2) return '=';
      return ' ';
    }).join('');

    // Color cycling text
    const cycleColor = CYCLE_COLORS[f % CYCLE_COLORS.length]!;

    return new Center({
      child: new Container({
        width: 50,
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: cycleColor, style: 'rounded' })),
        }),
        child: new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'stretch',
          children: [
            // Title
            new Container({
              decoration: new BoxDecoration({ color: cycleColor }),
              child: new Center({
                child: label(' Loading Spinners ', new TextStyle({ bold: true })),
              }),
            }),
            new SizedBox({ height: 1 }),

            // Spinner rows
            ...spinnerRows,
            new SizedBox({ height: 1 }),

            // Animated loading bar
            new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 2 }),
              child: new Container({
                decoration: new BoxDecoration({
                  border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
                }),
                child: label(barChars, new TextStyle({ foreground: cycleColor, bold: true })),
              }),
            }),
            new SizedBox({ height: 1 }),

            // Frame counter
            new Center({
              child: label(`Frame: ${f}`, new TextStyle({ dim: true })),
            }),

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
export const createSpinnerApp = (): SpinnerApp => new SpinnerApp();
export { SPINNERS };

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(new SpinnerApp(), { output: process.stdout });
}
