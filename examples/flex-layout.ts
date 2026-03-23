// flex-layout.ts — Demonstrates the flex layout system.
//
// Run with: bun run examples/flex-layout.ts
//
// This example demonstrates:
// - Row and Column layout widgets
// - Expanded with different flex factors (1:2 ratios)
// - MainAxisAlignment variants (start, spaceBetween, spaceEvenly)
// - Container with decoration (borders, background colors)
// - Divider for visual separation
// - Padding for spacing
// - Nested Row/Column structures

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { DecoratedBox } from '../src/widgets/decorated-box';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';

// ---------------------------------------------------------------------------
// Helper: create a styled Text widget for concise usage
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

function dimLabel(content: string): Text {
  return label(content, new TextStyle({ dim: true }));
}

// ---------------------------------------------------------------------------
// Build the layout
// ---------------------------------------------------------------------------

export function buildFlexLayout() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      children: [
        // Title
        heading('Flex Layout Demo'),
        new Divider(),

        // Section 1: Equal expansion
        dimLabel('Row with equal Expanded children:'),
        new Row({
          children: [
            new Expanded({
              child: label(' Left ', new TextStyle({ foreground: Color.green })),
            }),
            new Expanded({
              child: label(' Center ', new TextStyle({ foreground: Color.yellow })),
            }),
            new Expanded({
              child: label(' Right ', new TextStyle({ foreground: Color.magenta })),
            }),
          ],
        }),
        new Divider(),

        // Section 2: Flex ratios (1:2)
        dimLabel('Row with flex ratios (1:2):'),
        new Row({
          children: [
            new Expanded({
              flex: 1,
              child: new DecoratedBox({
                decoration: new BoxDecoration({
                  color: Color.red,
                  border: Border.all(new BorderSide({ color: Color.red })),
                }),
                child: label(' flex:1 ', new TextStyle({ bold: true })),
              }),
            }),
            new Expanded({
              flex: 2,
              child: new DecoratedBox({
                decoration: new BoxDecoration({
                  color: Color.blue,
                  border: Border.all(new BorderSide({ color: Color.blue })),
                }),
                child: label(' flex:2 ', new TextStyle({ bold: true })),
              }),
            }),
          ],
        }),
        new Divider(),

        // Section 3: MainAxisAlignment demos
        dimLabel('Row.spaceBetween:'),
        Row.spaceBetween([
          label('A', new TextStyle({ foreground: Color.green })),
          label('B', new TextStyle({ foreground: Color.yellow })),
          label('C', new TextStyle({ foreground: Color.red })),
        ]),
        new SizedBox({ height: 1 }),
        dimLabel('Row.spaceEvenly:'),
        Row.spaceEvenly([
          label('X', new TextStyle({ foreground: Color.cyan })),
          label('Y', new TextStyle({ foreground: Color.magenta })),
          label('Z', new TextStyle({ foreground: Color.brightWhite })),
        ]),
        new Divider(),

        // Section 4: Nested columns in a row
        dimLabel('Nested Column widgets inside a Row:'),
        new Row({
          crossAxisAlignment: 'start',
          children: [
            new Expanded({
              child: new Column({
                mainAxisSize: 'min',
                crossAxisAlignment: 'start',
                children: [
                  label('Col 1', new TextStyle({ bold: true, foreground: Color.green })),
                  label('  Row 1'),
                  label('  Row 2'),
                ],
              }),
            }),
            new Expanded({
              child: new Column({
                mainAxisSize: 'min',
                crossAxisAlignment: 'start',
                children: [
                  label('Col 2', new TextStyle({ bold: true, foreground: Color.blue })),
                  label('  Row A'),
                  label('  Row B'),
                ],
              }),
            }),
          ],
        }),
      ],
    }),
  });
}

// Export the built widget tree for testing
export const app = buildFlexLayout();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app, { output: process.stdout });
}
