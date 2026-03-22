// border-showcase.ts — All border styles and decorations.
//
// Run with: bun run examples/border-showcase.ts
//
// This example demonstrates:
// - Solid border style
// - Rounded border style
// - Colored borders on each side
// - Boxes with background colors
// - Nested containers with borders
// - Container width, height, and padding

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

function dimLabel(content: string): Text {
  return label(content, new TextStyle({ dim: true }));
}

// ---------------------------------------------------------------------------
// Section 1: Solid vs Rounded borders
// ---------------------------------------------------------------------------

function buildBorderStyles(): Widget {
  return new Row({
    children: [
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.white, style: 'solid' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Solid Border', new TextStyle({ foreground: Color.white })),
        }),
      }),
      new SizedBox({ width: 2 }),
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.white, style: 'rounded' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Rounded Border', new TextStyle({ foreground: Color.white })),
        }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Section 2: Colored borders
// ---------------------------------------------------------------------------

function buildColoredBorders(): Widget {
  return new Row({
    children: [
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.red, style: 'rounded' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Red', new TextStyle({ foreground: Color.red, bold: true })),
        }),
      }),
      new SizedBox({ width: 1 }),
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.green, style: 'rounded' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Green', new TextStyle({ foreground: Color.green, bold: true })),
        }),
      }),
      new SizedBox({ width: 1 }),
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.blue, style: 'rounded' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Blue', new TextStyle({ foreground: Color.blue, bold: true })),
        }),
      }),
      new SizedBox({ width: 1 }),
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide({ color: Color.yellow, style: 'rounded' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Yellow', new TextStyle({ foreground: Color.yellow, bold: true })),
        }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Section 3: Background colored boxes
// ---------------------------------------------------------------------------

function buildBackgroundBoxes(): Widget {
  return new Row({
    children: [
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({ color: Color.red }),
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: label(' BG: Red ', new TextStyle({ bold: true })),
        }),
      }),
      new SizedBox({ width: 1 }),
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({ color: Color.blue }),
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: label(' BG: Blue ', new TextStyle({ bold: true })),
        }),
      }),
      new SizedBox({ width: 1 }),
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({ color: Color.green }),
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: label(' BG: Green ', new TextStyle({ bold: true })),
        }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Section 4: Background + Border combined
// ---------------------------------------------------------------------------

function buildBorderWithBackground(): Widget {
  return new Row({
    children: [
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            color: Color.blue,
            border: Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Cyan on Blue', new TextStyle({ foreground: Color.cyan, bold: true })),
        }),
      }),
      new SizedBox({ width: 2 }),
      new Expanded({
        child: new Container({
          decoration: new BoxDecoration({
            color: Color.red,
            border: Border.all(new BorderSide({ color: Color.yellow, style: 'solid' })),
          }),
          padding: EdgeInsets.all(1),
          child: label('Yellow on Red', new TextStyle({ foreground: Color.yellow, bold: true })),
        }),
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Section 5: Nested containers with borders
// ---------------------------------------------------------------------------

function buildNestedContainers(): Widget {
  return new Container({
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: Color.white, style: 'solid' })),
    }),
    padding: EdgeInsets.all(1),
    child: new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' })),
      }),
      padding: EdgeInsets.all(1),
      child: new Container({
        decoration: new BoxDecoration({
          color: Color.blue,
          border: Border.all(new BorderSide({ color: Color.magenta, style: 'rounded' })),
        }),
        padding: EdgeInsets.all(1),
        child: label('3 Levels Deep', new TextStyle({ bold: true, foreground: Color.brightWhite })),
      }),
    }),
  });
}

// ---------------------------------------------------------------------------
// Build the full border showcase
// ---------------------------------------------------------------------------

export function buildBorderShowcase() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      children: [
        heading('Border Showcase'),
        new Divider(),

        // Solid vs Rounded
        dimLabel(' Solid vs Rounded:'),
        new SizedBox({ height: 1 }),
        buildBorderStyles(),
        new Divider(),

        // Colored borders
        dimLabel(' Colored Borders:'),
        new SizedBox({ height: 1 }),
        buildColoredBorders(),
        new Divider(),

        // Background boxes
        dimLabel(' Background Colors:'),
        new SizedBox({ height: 1 }),
        buildBackgroundBoxes(),
        new Divider(),

        // Background + Border
        dimLabel(' Border + Background Combined:'),
        new SizedBox({ height: 1 }),
        buildBorderWithBackground(),
        new Divider(),

        // Nested containers
        dimLabel(' Nested Containers (3 levels):'),
        new SizedBox({ height: 1 }),
        buildNestedContainers(),
      ],
    }),
  });
}

// Export the widget tree for testing
export const app = buildBorderShowcase();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
