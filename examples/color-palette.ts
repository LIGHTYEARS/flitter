// color-palette.ts — Display all 16 named colors and a 24-color RGB gradient.
//
// Run with: bun run examples/color-palette.ts
//
// This example demonstrates:
// - All 16 named Color constants (8 standard + 8 bright)
// - RGB gradient using Color.rgb()
// - Foreground and background color in TextStyle
// - Column and Row layout for organizing color swatches
// - Container with BoxDecoration for background-colored blocks

import { runApp, WidgetsBinding } from '../src/framework/binding';
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
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Helper: create a Text widget with optional style
// ---------------------------------------------------------------------------

function label(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: style ?? new TextStyle(),
    }),
  });
}

function heading(content: string): Text {
  return label(content, new TextStyle({ bold: true, foreground: Color.cyan }));
}

// ---------------------------------------------------------------------------
// Named colors data
// ---------------------------------------------------------------------------

interface NamedColor {
  name: string;
  color: Color;
}

const STANDARD_COLORS: NamedColor[] = [
  { name: 'black  ', color: Color.black },
  { name: 'red    ', color: Color.red },
  { name: 'green  ', color: Color.green },
  { name: 'yellow ', color: Color.yellow },
  { name: 'blue   ', color: Color.blue },
  { name: 'magenta', color: Color.magenta },
  { name: 'cyan   ', color: Color.cyan },
  { name: 'white  ', color: Color.white },
];

const BRIGHT_COLORS: NamedColor[] = [
  { name: 'brBlack  ', color: Color.brightBlack },
  { name: 'brRed    ', color: Color.brightRed },
  { name: 'brGreen  ', color: Color.brightGreen },
  { name: 'brYellow ', color: Color.brightYellow },
  { name: 'brBlue   ', color: Color.brightBlue },
  { name: 'brMagenta', color: Color.brightMagenta },
  { name: 'brCyan   ', color: Color.brightCyan },
  { name: 'brWhite  ', color: Color.brightWhite },
];

// ---------------------------------------------------------------------------
// Build a color swatch row: colored label + background block
// ---------------------------------------------------------------------------

function buildColorSwatch(named: NamedColor): Widget {
  return new Row({
    children: [
      // Color name as foreground text
      label(` ${named.name} `, new TextStyle({ foreground: named.color, bold: true })),
      new SizedBox({ width: 1 }),
      // Background color block
      new Container({
        width: 6,
        height: 1,
        decoration: new BoxDecoration({ color: named.color }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Build the RGB gradient section (24 steps from red -> green -> blue)
// ---------------------------------------------------------------------------

function buildRgbGradient(): Widget {
  const swatches: Widget[] = [];

  for (let i = 0; i < 24; i++) {
    let r: number, g: number, b: number;

    if (i < 8) {
      // Red to Yellow (increase green)
      r = 255;
      g = Math.round((i / 7) * 255);
      b = 0;
    } else if (i < 16) {
      // Yellow to Cyan (decrease red, increase blue)
      r = Math.round(255 - ((i - 8) / 7) * 255);
      g = 255;
      b = Math.round(((i - 8) / 7) * 255);
    } else {
      // Cyan to Magenta (decrease green, increase red)
      r = Math.round(((i - 16) / 7) * 255);
      g = Math.round(255 - ((i - 16) / 7) * 255);
      b = 255;
    }

    const color = Color.rgb(r, g, b);

    swatches.push(
      new Container({
        width: 2,
        height: 1,
        decoration: new BoxDecoration({ color }),
      }),
    );
  }

  return new Row({ children: swatches });
}

// ---------------------------------------------------------------------------
// Build a row of foreground-colored text samples
// ---------------------------------------------------------------------------

function buildForegroundSamples(): Widget {
  return new Row({
    children: [
      label('Fore:', new TextStyle({ dim: true })),
      new SizedBox({ width: 1 }),
      label('Red', new TextStyle({ foreground: Color.red })),
      new SizedBox({ width: 1 }),
      label('Green', new TextStyle({ foreground: Color.green })),
      new SizedBox({ width: 1 }),
      label('Blue', new TextStyle({ foreground: Color.blue })),
      new SizedBox({ width: 1 }),
      label('Cyan', new TextStyle({ foreground: Color.cyan })),
      new SizedBox({ width: 1 }),
      label('Magenta', new TextStyle({ foreground: Color.magenta })),
    ],
  });
}

function buildBackgroundSamples(): Widget {
  return new Row({
    children: [
      label('Back:', new TextStyle({ dim: true })),
      new SizedBox({ width: 1 }),
      label(' Red ', new TextStyle({ background: Color.red })),
      new SizedBox({ width: 1 }),
      label(' Green ', new TextStyle({ background: Color.green })),
      new SizedBox({ width: 1 }),
      label(' Blue ', new TextStyle({ background: Color.blue })),
      new SizedBox({ width: 1 }),
      label(' Cyan ', new TextStyle({ background: Color.cyan })),
    ],
  });
}

// ---------------------------------------------------------------------------
// Build the full color palette layout
// ---------------------------------------------------------------------------

export function buildColorPalette() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'start',
      children: [
        heading('Color Palette Demo'),
        new Divider(),

        // Standard 8 colors
        label(' Standard Colors:', new TextStyle({ bold: true })),
        new SizedBox({ height: 1 }),
        ...STANDARD_COLORS.map(buildColorSwatch),
        new SizedBox({ height: 1 }),

        // Bright 8 colors
        label(' Bright Colors:', new TextStyle({ bold: true })),
        new SizedBox({ height: 1 }),
        ...BRIGHT_COLORS.map(buildColorSwatch),
        new Divider(),

        // RGB gradient
        label(' RGB Gradient (24 steps):', new TextStyle({ bold: true })),
        new SizedBox({ height: 1 }),
        new Padding({
          padding: EdgeInsets.only({ left: 1 }),
          child: buildRgbGradient(),
        }),
        new Divider(),

        // Foreground vs Background demo
        label(' Foreground vs Background:', new TextStyle({ bold: true })),
        new SizedBox({ height: 1 }),
        new Padding({
          padding: EdgeInsets.only({ left: 1 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              buildForegroundSamples(),
              new SizedBox({ height: 1 }),
              buildBackgroundSamples(),
            ],
          }),
        }),
      ],
    }),
  });
}

// Export the widget tree for testing
export const app = buildColorPalette();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app, { output: process.stdout });
}
