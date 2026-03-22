// help-screen.ts — Help/keybinding reference screen.
//
// Run with: bun run examples/help-screen.ts
//
// This example demonstrates:
// - Two-column layout: command on left, description on right
// - Grouped into sections (Navigation, Editing, System)
// - Styled key names with inverse/bold
// - Dividers between sections
// - SingleChildScrollView for scrollable content
// - Complex TextSpan composition for inline key badges

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { SingleChildScrollView } from '../src/widgets/scroll-view';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface KeyBinding {
  keys: string[];      // e.g. ['Ctrl+C', 'q']
  description: string;
}

interface HelpSection {
  title: string;
  color: Color;
  bindings: KeyBinding[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Navigation',
    color: Color.cyan,
    bindings: [
      { keys: ['Up', 'k'], description: 'Move cursor up / previous item' },
      { keys: ['Down', 'j'], description: 'Move cursor down / next item' },
      { keys: ['Left', 'h'], description: 'Move cursor left / collapse' },
      { keys: ['Right', 'l'], description: 'Move cursor right / expand' },
      { keys: ['Home'], description: 'Jump to beginning' },
      { keys: ['End'], description: 'Jump to end' },
      { keys: ['PgUp'], description: 'Scroll one page up' },
      { keys: ['PgDn'], description: 'Scroll one page down' },
      { keys: ['Tab'], description: 'Next focusable element' },
      { keys: ['Shift+Tab'], description: 'Previous focusable element' },
    ],
  },
  {
    title: 'Editing',
    color: Color.green,
    bindings: [
      { keys: ['Enter'], description: 'Confirm / submit / newline' },
      { keys: ['Backspace'], description: 'Delete character before cursor' },
      { keys: ['Delete'], description: 'Delete character after cursor' },
      { keys: ['Ctrl+A'], description: 'Select all text' },
      { keys: ['Ctrl+C'], description: 'Copy selection to clipboard' },
      { keys: ['Ctrl+V'], description: 'Paste from clipboard' },
      { keys: ['Ctrl+X'], description: 'Cut selection to clipboard' },
      { keys: ['Ctrl+Z'], description: 'Undo last action' },
      { keys: ['Ctrl+Y'], description: 'Redo last undone action' },
    ],
  },
  {
    title: 'Search & Filter',
    color: Color.yellow,
    bindings: [
      { keys: ['/'], description: 'Open search prompt' },
      { keys: ['n'], description: 'Find next match' },
      { keys: ['N'], description: 'Find previous match' },
      { keys: ['Ctrl+F'], description: 'Find in document' },
      { keys: ['Escape'], description: 'Close search / cancel' },
    ],
  },
  {
    title: 'View',
    color: Color.magenta,
    bindings: [
      { keys: ['1', '2', '3'], description: 'Switch to tab 1 / 2 / 3' },
      { keys: ['[', ']'], description: 'Previous / next tab' },
      { keys: ['Ctrl+\\'], description: 'Toggle sidebar' },
      { keys: ['+', '-'], description: 'Zoom in / out' },
      { keys: ['='], description: 'Reset zoom to 100%' },
    ],
  },
  {
    title: 'System',
    color: Color.red,
    bindings: [
      { keys: ['Ctrl+S'], description: 'Save current file' },
      { keys: ['Ctrl+O'], description: 'Open file dialog' },
      { keys: ['Ctrl+N'], description: 'New file / project' },
      { keys: ['Ctrl+W'], description: 'Close current tab' },
      { keys: ['Ctrl+Q', 'q'], description: 'Quit application' },
      { keys: ['F1'], description: 'Show this help screen' },
      { keys: ['F5'], description: 'Refresh / reload' },
      { keys: ['F11'], description: 'Toggle fullscreen' },
    ],
  },
];

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

/**
 * Build a styled key badge with inverse text to make it stand out.
 * Example: renders " Ctrl+C " with inverse styling.
 */
function keyBadge(keyName: string, color: Color): Widget {
  return new Container({
    decoration: new BoxDecoration({ color }),
    child: label(` ${keyName} `, new TextStyle({ bold: true })),
  });
}

// ---------------------------------------------------------------------------
// Build a keybinding row
// ---------------------------------------------------------------------------

function buildBindingRow(binding: KeyBinding, sectionColor: Color): Widget {
  // Build key badges with "or" separators
  const keyWidgets: Widget[] = [];
  binding.keys.forEach((key, i) => {
    keyWidgets.push(keyBadge(key, sectionColor));
    if (i < binding.keys.length - 1) {
      keyWidgets.push(new SizedBox({ width: 1 }));
    }
  });

  return new Padding({
    padding: EdgeInsets.symmetric({ horizontal: 2 }),
    child: new Row({
      children: [
        // Keys column (fixed width area)
        new Container({
          width: 22,
          child: new Row({ children: keyWidgets }),
        }),
        // Description
        label(binding.description, new TextStyle({ foreground: Color.white })),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Build a help section
// ---------------------------------------------------------------------------

function buildSection(section: HelpSection): Widget[] {
  const widgets: Widget[] = [];

  // Section header
  widgets.push(
    new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Text({
        text: new TextSpan({
          children: [
            new TextSpan({ text: '  ', style: new TextStyle() }),
            new TextSpan({
              text: section.title,
              style: new TextStyle({ bold: true, foreground: section.color, underline: true }),
            }),
          ],
        }),
      }),
    }),
  );
  widgets.push(new SizedBox({ height: 1 }));

  // Binding rows
  section.bindings.forEach(binding => {
    widgets.push(buildBindingRow(binding, section.color));
  });

  return widgets;
}

// ---------------------------------------------------------------------------
// Build the full help screen layout
// ---------------------------------------------------------------------------

export function buildHelpScreen() {
  // Build all sections with dividers between them
  const sectionWidgets: Widget[] = [];
  HELP_SECTIONS.forEach((section, i) => {
    sectionWidgets.push(...buildSection(section));
    if (i < HELP_SECTIONS.length - 1) {
      sectionWidgets.push(new Divider({ color: Color.brightBlack }));
    }
  });

  // Count total bindings
  const totalBindings = HELP_SECTIONS.reduce((sum, s) => sum + s.bindings.length, 0);

  return new Column({
    mainAxisAlignment: 'start',
    crossAxisAlignment: 'stretch',
    children: [
      // Header
      new Container({
        decoration: new BoxDecoration({
          color: Color.blue,
          border: Border.all(new BorderSide({ color: Color.brightBlue, style: 'solid' })),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: Row.spaceBetween([
            label(' Keyboard Shortcuts ', new TextStyle({ bold: true, foreground: Color.brightWhite })),
            label('Press F1 or ? for help', new TextStyle({ dim: true })),
          ]),
        }),
      }),

      // Scrollable help content
      new Expanded({
        child: new SingleChildScrollView({
          child: new Padding({
            padding: EdgeInsets.symmetric({ vertical: 1 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'stretch',
              children: sectionWidgets,
            }),
          }),
        }),
      }),

      // Footer
      new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: Row.spaceBetween([
            new Text({
              text: new TextSpan({
                children: [
                  new TextSpan({ text: `${HELP_SECTIONS.length} sections`, style: new TextStyle({ dim: true }) }),
                  new TextSpan({ text: '  ', style: new TextStyle() }),
                  new TextSpan({ text: `${totalBindings} shortcuts`, style: new TextStyle({ dim: true }) }),
                ],
              }),
            }),
            label('Scroll with arrow keys', new TextStyle({ dim: true })),
          ]),
        }),
      }),
    ],
  });
}

// Export for testing
export const app = buildHelpScreen();
export { HELP_SECTIONS };
export type { KeyBinding, HelpSection };

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
