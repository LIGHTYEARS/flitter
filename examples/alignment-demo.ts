// alignment-demo.ts — MainAxisAlignment + CrossAxisAlignment showcase.
//
// Run with: bun run examples/alignment-demo.ts
//
// This example demonstrates:
// - All 6 MainAxisAlignment values for Row (start, end, center,
//   spaceBetween, spaceAround, spaceEvenly)
// - All 4 CrossAxisAlignment values for Column (start, end, center, stretch)
// - Visual comparison side by side with labeled sections
// - Container borders for visual framing

import { runApp, WidgetsBinding } from '../src/framework/binding';
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
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Helpers
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

function sectionLabel(content: string): Text {
  return label(content, new TextStyle({ dim: true }));
}

// Items used for alignment demos
const ITEMS = ['A', 'B', 'C'];
const ITEM_COLORS = [Color.green, Color.yellow, Color.magenta];

function makeItems(): Widget[] {
  return ITEMS.map((item, i) =>
    label(` ${item} `, new TextStyle({ bold: true, foreground: ITEM_COLORS[i]! })),
  );
}

// Wrap a Row demo in a bordered container with a label above it
function alignmentRow(title: string, mainAxisAlignment: string): Widget {
  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [
      sectionLabel(`  ${title}:`),
      new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
        }),
        child: new Row({
          mainAxisAlignment: mainAxisAlignment as any,
          children: makeItems(),
        }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Main axis alignment section (all 6 values)
// ---------------------------------------------------------------------------

function buildMainAxisSection(): Widget {
  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [
      label(' MainAxisAlignment (Row):', new TextStyle({ bold: true })),
      new SizedBox({ height: 1 }),
      alignmentRow('start', 'start'),
      alignmentRow('end', 'end'),
      alignmentRow('center', 'center'),
      alignmentRow('spaceBetween', 'spaceBetween'),
      alignmentRow('spaceAround', 'spaceAround'),
      alignmentRow('spaceEvenly', 'spaceEvenly'),
    ],
  });
}

// ---------------------------------------------------------------------------
// Cross axis alignment section (all 4 values)
// ---------------------------------------------------------------------------

function buildCrossAxisSection(): Widget {
  // For cross axis, we use Column with children of varying text lengths
  const crossValues = ['start', 'end', 'center', 'stretch'] as const;

  const demos = crossValues.map((alignment) => {
    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        sectionLabel(`  ${alignment}:`),
        new Container({
          height: 5,
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
          }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: alignment,
            children: [
              label('Short', new TextStyle({ foreground: Color.green })),
              label('Medium text', new TextStyle({ foreground: Color.yellow })),
              label('Longer text here', new TextStyle({ foreground: Color.magenta })),
            ],
          }),
        }),
      ],
    });
  });

  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [
      label(' CrossAxisAlignment (Column):', new TextStyle({ bold: true })),
      new SizedBox({ height: 1 }),
      // Display in a 2x2 grid using Rows
      new Row({
        crossAxisAlignment: 'start',
        children: [
          new Expanded({ child: demos[0]! }),
          new SizedBox({ width: 1 }),
          new Expanded({ child: demos[1]! }),
        ],
      }),
      new SizedBox({ height: 1 }),
      new Row({
        crossAxisAlignment: 'start',
        children: [
          new Expanded({ child: demos[2]! }),
          new SizedBox({ width: 1 }),
          new Expanded({ child: demos[3]! }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Build the full alignment demo
// ---------------------------------------------------------------------------

export function buildAlignmentDemo() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      children: [
        heading('Alignment Demo'),
        new Divider(),

        // Main axis alignment
        buildMainAxisSection(),
        new Divider(),

        // Cross axis alignment
        buildCrossAxisSection(),
      ],
    }),
  });
}

// Export the widget tree for testing
export const app = buildAlignmentDemo();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
