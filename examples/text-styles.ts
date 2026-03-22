// text-styles.ts — Showcase all TextStyle attributes.
//
// Run with: bun run examples/text-styles.ts
//
// This example demonstrates:
// - Bold, dim, italic, underline, strikethrough, inverse text styles
// - Combined styles (multiple attributes at once)
// - Rich TextSpan with children (multi-segment styled text)
// - TextStyle foreground color with style combinations
// - Column layout for organized display

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column } from '../src/widgets/flex';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';

// ---------------------------------------------------------------------------
// Helper: quick text widget from a span
// ---------------------------------------------------------------------------

function styledText(content: string, style: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style }),
  });
}

function heading(content: string): Text {
  return styledText(content, new TextStyle({ bold: true, foreground: Color.cyan }));
}

function dimLabel(content: string): Text {
  return styledText(content, new TextStyle({ dim: true }));
}

// ---------------------------------------------------------------------------
// Individual style demos
// ---------------------------------------------------------------------------

function buildIndividualStyles() {
  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'start',
    children: [
      styledText('  Normal text (no attributes)', new TextStyle()),
      styledText('  Bold text', new TextStyle({ bold: true })),
      styledText('  Dim text', new TextStyle({ dim: true })),
      styledText('  Italic text', new TextStyle({ italic: true })),
      styledText('  Underline text', new TextStyle({ underline: true })),
      styledText('  Strikethrough text', new TextStyle({ strikethrough: true })),
      styledText('  Inverse text', new TextStyle({ inverse: true })),
    ],
  });
}

// ---------------------------------------------------------------------------
// Combined styles
// ---------------------------------------------------------------------------

function buildCombinedStyles() {
  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'start',
    children: [
      styledText('  Bold + Italic', new TextStyle({ bold: true, italic: true })),
      styledText('  Bold + Underline + Cyan', new TextStyle({
        bold: true,
        underline: true,
        foreground: Color.cyan,
      })),
      styledText('  Dim + Strikethrough', new TextStyle({
        dim: true,
        strikethrough: true,
      })),
      styledText('  Bold + Inverse + Red', new TextStyle({
        bold: true,
        inverse: true,
        foreground: Color.red,
      })),
      styledText('  Italic + Underline + Green', new TextStyle({
        italic: true,
        underline: true,
        foreground: Color.green,
      })),
      styledText('  Bold + Dim + Italic + Underline', new TextStyle({
        bold: true,
        dim: true,
        italic: true,
        underline: true,
      })),
    ],
  });
}

// ---------------------------------------------------------------------------
// Rich TextSpan with children — multi-segment styled text
// ---------------------------------------------------------------------------

function buildRichTextSpan(): Text {
  // Build a multi-segment line: "Hello " (bold cyan) + "beautiful " (italic magenta)
  // + "world" (underline green) + "!" (bold red)
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({
          text: 'Hello ',
          style: new TextStyle({ bold: true, foreground: Color.cyan }),
        }),
        new TextSpan({
          text: 'beautiful ',
          style: new TextStyle({ italic: true, foreground: Color.magenta }),
        }),
        new TextSpan({
          text: 'world',
          style: new TextStyle({ underline: true, foreground: Color.green }),
        }),
        new TextSpan({
          text: '!',
          style: new TextStyle({ bold: true, foreground: Color.red }),
        }),
      ],
    }),
  });
}

function buildNestedTextSpan(): Text {
  // Nested: parent style (dim) with children that override selectively
  return new Text({
    text: new TextSpan({
      style: new TextStyle({ dim: true }),
      children: [
        new TextSpan({ text: 'Parent dim | ' }),
        new TextSpan({
          text: 'Bold child',
          style: new TextStyle({ bold: true, foreground: Color.yellow }),
        }),
        new TextSpan({ text: ' | ' }),
        new TextSpan({
          text: 'Underline child',
          style: new TextStyle({ underline: true, foreground: Color.blue }),
        }),
        new TextSpan({ text: ' | back to dim' }),
      ],
    }),
  });
}

function buildColoredSentence(): Text {
  // Each word in a different color
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: 'Every ', style: new TextStyle({ foreground: Color.red, bold: true }) }),
        new TextSpan({ text: 'word ', style: new TextStyle({ foreground: Color.yellow, bold: true }) }),
        new TextSpan({ text: 'has ', style: new TextStyle({ foreground: Color.green, bold: true }) }),
        new TextSpan({ text: 'its ', style: new TextStyle({ foreground: Color.cyan, bold: true }) }),
        new TextSpan({ text: 'own ', style: new TextStyle({ foreground: Color.blue, bold: true }) }),
        new TextSpan({ text: 'color', style: new TextStyle({ foreground: Color.magenta, bold: true }) }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Build the full text styles showcase
// ---------------------------------------------------------------------------

export function buildTextStyles() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'start',
      children: [
        heading('Text Styles Showcase'),
        new Divider(),

        // Individual styles
        dimLabel(' Individual Attributes:'),
        new SizedBox({ height: 1 }),
        buildIndividualStyles(),
        new Divider(),

        // Combined styles
        dimLabel(' Combined Attributes:'),
        new SizedBox({ height: 1 }),
        buildCombinedStyles(),
        new Divider(),

        // Rich TextSpan
        dimLabel(' Rich TextSpan (multi-segment styled text):'),
        new SizedBox({ height: 1 }),
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              buildRichTextSpan(),
              new SizedBox({ height: 1 }),
              buildNestedTextSpan(),
              new SizedBox({ height: 1 }),
              buildColoredSentence(),
            ],
          }),
        }),
      ],
    }),
  });
}

// Export the widget tree for testing
export const app = buildTextStyles();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
