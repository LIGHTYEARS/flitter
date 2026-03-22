// rich-text.ts — Complex TextSpan trees.
//
// Run with: bun run examples/rich-text.ts
//
// This example demonstrates:
// - Multi-segment text with different styles per word
// - Nested TextSpan children with style inheritance
// - Mixed bold/color/underline in one line
// - Building complex rich text displays
// - TextSpan trees for advanced text rendering

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column } from '../src/widgets/flex';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Divider } from '../src/widgets/divider';
import { Container } from '../src/widgets/container';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function heading(content: string): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: new TextStyle({ bold: true, foreground: Color.cyan }),
    }),
  });
}

function dimLabel(content: string): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: new TextStyle({ dim: true }),
    }),
  });
}

// ---------------------------------------------------------------------------
// Demo 1: Multi-segment styled text — each word with its own style
// ---------------------------------------------------------------------------

function buildRainbowLine(): Text {
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: 'R', style: new TextStyle({ foreground: Color.red, bold: true }) }),
        new TextSpan({ text: 'a', style: new TextStyle({ foreground: Color.yellow, bold: true }) }),
        new TextSpan({ text: 'i', style: new TextStyle({ foreground: Color.green, bold: true }) }),
        new TextSpan({ text: 'n', style: new TextStyle({ foreground: Color.cyan, bold: true }) }),
        new TextSpan({ text: 'b', style: new TextStyle({ foreground: Color.blue, bold: true }) }),
        new TextSpan({ text: 'o', style: new TextStyle({ foreground: Color.magenta, bold: true }) }),
        new TextSpan({ text: 'w', style: new TextStyle({ foreground: Color.red, bold: true }) }),
        new TextSpan({ text: ' Text', style: new TextStyle({ foreground: Color.white, bold: true }) }),
      ],
    }),
  });
}

function buildMixedStyleLine(): Text {
  // "The quick brown fox jumps over the lazy dog" with varied styles
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: 'The ', style: new TextStyle({ foreground: Color.white }) }),
        new TextSpan({ text: 'quick ', style: new TextStyle({ foreground: Color.cyan, bold: true }) }),
        new TextSpan({ text: 'brown ', style: new TextStyle({ foreground: Color.yellow, italic: true }) }),
        new TextSpan({ text: 'fox ', style: new TextStyle({ foreground: Color.red, bold: true }) }),
        new TextSpan({ text: 'jumps ', style: new TextStyle({ foreground: Color.green, underline: true }) }),
        new TextSpan({ text: 'over ', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: 'the ', style: new TextStyle({ foreground: Color.white }) }),
        new TextSpan({ text: 'lazy ', style: new TextStyle({ foreground: Color.magenta, italic: true }) }),
        new TextSpan({ text: 'dog', style: new TextStyle({ foreground: Color.blue, bold: true, underline: true }) }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Demo 2: Nested TextSpan with style inheritance
// ---------------------------------------------------------------------------

function buildNestedInheritance(): Text {
  // Parent: bold + cyan. Children inherit bold but can override color.
  return new Text({
    text: new TextSpan({
      style: new TextStyle({ bold: true, foreground: Color.cyan }),
      children: [
        new TextSpan({ text: 'Parent(bold+cyan) ' }),
        new TextSpan({
          text: '> ',
          style: new TextStyle({ foreground: Color.white }),
        }),
        new TextSpan({
          style: new TextStyle({ italic: true }),
          children: [
            new TextSpan({ text: 'Child(+italic) ' }),
            new TextSpan({
              text: 'GrandChild(red)',
              style: new TextStyle({ foreground: Color.red }),
            }),
          ],
        }),
      ],
    }),
  });
}

function buildDeepNesting(): Text {
  // 4 levels of nesting with cascading styles
  return new Text({
    text: new TextSpan({
      style: new TextStyle({ foreground: Color.white }),
      children: [
        new TextSpan({ text: 'L0: white ' }),
        new TextSpan({
          style: new TextStyle({ foreground: Color.green, bold: true }),
          children: [
            new TextSpan({ text: '> L1: green+bold ' }),
            new TextSpan({
              style: new TextStyle({ foreground: Color.yellow, underline: true }),
              children: [
                new TextSpan({ text: '> L2: yellow+underline ' }),
                new TextSpan({
                  text: '> L3: red+dim',
                  style: new TextStyle({ foreground: Color.red, dim: true }),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Demo 3: Mixed bold/color/underline in one line
// ---------------------------------------------------------------------------

function buildCodeSnippet(): Text {
  // Simulate syntax-highlighted code: "const x = 42;"
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: 'const', style: new TextStyle({ foreground: Color.magenta, bold: true }) }),
        new TextSpan({ text: ' x', style: new TextStyle({ foreground: Color.cyan }) }),
        new TextSpan({ text: ' = ', style: new TextStyle({ foreground: Color.white }) }),
        new TextSpan({ text: '42', style: new TextStyle({ foreground: Color.yellow, bold: true }) }),
        new TextSpan({ text: ';', style: new TextStyle({ foreground: Color.white, dim: true }) }),
      ],
    }),
  });
}

function buildStatusLine(): Text {
  // A status line: "[OK] Build passed (2.3s) - 47 tests"
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: '[', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: 'OK', style: new TextStyle({ foreground: Color.green, bold: true }) }),
        new TextSpan({ text: '] ', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: 'Build passed', style: new TextStyle({ foreground: Color.green }) }),
        new TextSpan({ text: ' (', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: '2.3s', style: new TextStyle({ foreground: Color.yellow, bold: true }) }),
        new TextSpan({ text: ') - ', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: '47', style: new TextStyle({ foreground: Color.cyan, bold: true }) }),
        new TextSpan({ text: ' tests', style: new TextStyle({ foreground: Color.white }) }),
      ],
    }),
  });
}

function buildLogLine(): Text {
  // A log entry: "2024-01-15 14:32:01 [WARN] Connection timeout on db-replica-3"
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: '2024-01-15 14:32:01 ', style: new TextStyle({ foreground: Color.brightBlack }) }),
        new TextSpan({ text: '[', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: 'WARN', style: new TextStyle({ foreground: Color.yellow, bold: true }) }),
        new TextSpan({ text: '] ', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: 'Connection timeout on ', style: new TextStyle({ foreground: Color.white }) }),
        new TextSpan({ text: 'db-replica-3', style: new TextStyle({ foreground: Color.red, underline: true }) }),
      ],
    }),
  });
}

function buildGitDiff(): Text {
  // Simulated git diff header: "+ added line" in green, "- removed line" in red
  return new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: '  ', style: new TextStyle({ foreground: Color.white }) }),
        new TextSpan({ text: 'unchanged line\n', style: new TextStyle({ foreground: Color.white, dim: true }) }),
        new TextSpan({ text: '+ ', style: new TextStyle({ foreground: Color.green, bold: true }) }),
        new TextSpan({ text: 'added line\n', style: new TextStyle({ foreground: Color.green }) }),
        new TextSpan({ text: '- ', style: new TextStyle({ foreground: Color.red, bold: true }) }),
        new TextSpan({ text: 'removed line', style: new TextStyle({ foreground: Color.red, strikethrough: true }) }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Build the full rich text demo
// ---------------------------------------------------------------------------

export function buildRichText() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'start',
      children: [
        heading('Rich Text Demo'),
        dimLabel('Complex TextSpan trees with mixed styles'),
        new Divider(),

        // Section 1: Multi-segment styled text
        new Text({
          text: new TextSpan({
            text: ' Per-Character / Per-Word Styling:',
            style: new TextStyle({ bold: true }),
          }),
        }),
        new SizedBox({ height: 1 }),
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              buildRainbowLine(),
              new SizedBox({ height: 1 }),
              buildMixedStyleLine(),
            ],
          }),
        }),
        new Divider(),

        // Section 2: Nested style inheritance
        new Text({
          text: new TextSpan({
            text: ' Nested Style Inheritance:',
            style: new TextStyle({ bold: true }),
          }),
        }),
        new SizedBox({ height: 1 }),
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              buildNestedInheritance(),
              new SizedBox({ height: 1 }),
              buildDeepNesting(),
            ],
          }),
        }),
        new Divider(),

        // Section 3: Practical examples
        new Text({
          text: new TextSpan({
            text: ' Practical Rich Text Examples:',
            style: new TextStyle({ bold: true }),
          }),
        }),
        new SizedBox({ height: 1 }),
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              dimLabel('Syntax highlight:'),
              buildCodeSnippet(),
              new SizedBox({ height: 1 }),
              dimLabel('Status line:'),
              buildStatusLine(),
              new SizedBox({ height: 1 }),
              dimLabel('Log entry:'),
              buildLogLine(),
              new SizedBox({ height: 1 }),
              dimLabel('Git diff:'),
              buildGitDiff(),
            ],
          }),
        }),
      ],
    }),
  });
}

// Export the widget tree for testing
export const app = buildRichText();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
