// nested-layout.ts — Complex deeply nested layout.
//
// Run with: bun run examples/nested-layout.ts
//
// This example demonstrates:
// - 3+ levels of nested Row/Column
// - Mixed Expanded with different flex ratios (1:2:1)
// - Layout composition patterns
// - Combining Container, Padding, Divider within nested structures
// - Building reusable panel components

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

// Create a labeled panel with a border
function panel(title: string, borderColor: Color, children: Widget[]): Widget {
  return new Container({
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: borderColor, style: 'rounded' })),
    }),
    child: new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        // Panel title bar
        new Container({
          decoration: new BoxDecoration({ color: borderColor }),
          child: label(` ${title} `, new TextStyle({ bold: true })),
        }),
        // Panel body
        new Padding({
          padding: EdgeInsets.all(1),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children,
          }),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Level 1: Top-level three-column layout (flex 1:2:1)
// ---------------------------------------------------------------------------

function buildSidebar(): Widget {
  // Left sidebar — a vertical list of navigation-like items
  return panel('Sidebar', Color.green, [
    label('> Dashboard', new TextStyle({ foreground: Color.green, bold: true })),
    label('  Settings', new TextStyle({ dim: true })),
    label('  Profile', new TextStyle({ dim: true })),
    label('  Logs', new TextStyle({ dim: true })),
    new Divider({ color: Color.green }),
    label('v1.0.0', new TextStyle({ dim: true })),
  ]);
}

function buildMainContent(): Widget {
  // Center main area — two rows stacked
  return panel('Main Content', Color.cyan, [
    // Level 2: Two-row layout inside main content
    // Top row: stats cards side by side
    label('Stats:', new TextStyle({ bold: true })),
    new SizedBox({ height: 1 }),
    new Row({
      children: [
        // Level 3: Each stat card is a nested Container > Column
        new Expanded({
          child: new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide({ color: Color.yellow, style: 'rounded' })),
            }),
            padding: EdgeInsets.symmetric({ horizontal: 1 }),
            child: new Column({
              mainAxisSize: 'min',
              children: [
                label('Users', new TextStyle({ dim: true })),
                label('1,234', new TextStyle({ bold: true, foreground: Color.yellow })),
              ],
            }),
          }),
        }),
        new SizedBox({ width: 1 }),
        new Expanded({
          child: new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide({ color: Color.green, style: 'rounded' })),
            }),
            padding: EdgeInsets.symmetric({ horizontal: 1 }),
            child: new Column({
              mainAxisSize: 'min',
              children: [
                label('Events', new TextStyle({ dim: true })),
                label('5,678', new TextStyle({ bold: true, foreground: Color.green })),
              ],
            }),
          }),
        }),
        new SizedBox({ width: 1 }),
        new Expanded({
          child: new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide({ color: Color.red, style: 'rounded' })),
            }),
            padding: EdgeInsets.symmetric({ horizontal: 1 }),
            child: new Column({
              mainAxisSize: 'min',
              children: [
                label('Errors', new TextStyle({ dim: true })),
                label('12', new TextStyle({ bold: true, foreground: Color.red })),
              ],
            }),
          }),
        }),
      ],
    }),
    new SizedBox({ height: 1 }),
    new Divider({ color: Color.cyan }),
    // Bottom section inside main: a nested Row with two columns
    label('Details:', new TextStyle({ bold: true })),
    new SizedBox({ height: 1 }),
    new Row({
      crossAxisAlignment: 'start',
      children: [
        new Expanded({
          flex: 1,
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              label('Recent Activity', new TextStyle({ underline: true })),
              label('- Deploy v1.2', new TextStyle({ foreground: Color.green })),
              label('- Fix bug #42', new TextStyle({ foreground: Color.yellow })),
              label('- Update docs', new TextStyle({ dim: true })),
            ],
          }),
        }),
        new SizedBox({ width: 1 }),
        new Expanded({
          flex: 1,
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              label('Alerts', new TextStyle({ underline: true })),
              label('! High CPU', new TextStyle({ foreground: Color.red, bold: true })),
              label('~ Low disk', new TextStyle({ foreground: Color.yellow })),
              label('  All OK', new TextStyle({ foreground: Color.green })),
            ],
          }),
        }),
      ],
    }),
  ]);
}

function buildRightPanel(): Widget {
  // Right panel — metadata and info
  return panel('Info', Color.magenta, [
    label('Status', new TextStyle({ bold: true })),
    new SizedBox({ height: 1 }),
    new Row({
      children: [
        label('Health: ', new TextStyle({ dim: true })),
        label('OK', new TextStyle({ foreground: Color.green, bold: true })),
      ],
    }),
    new Row({
      children: [
        label('Uptime: ', new TextStyle({ dim: true })),
        label('99.9%', new TextStyle({ foreground: Color.cyan })),
      ],
    }),
    new Divider({ color: Color.magenta }),
    label('Tags', new TextStyle({ bold: true })),
    new SizedBox({ height: 1 }),
    label('prod', new TextStyle({ foreground: Color.green })),
    label('us-east', new TextStyle({ foreground: Color.blue })),
    label('tier-1', new TextStyle({ foreground: Color.yellow })),
  ]);
}

// ---------------------------------------------------------------------------
// Build the full nested layout
// ---------------------------------------------------------------------------

export function buildNestedLayout() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      children: [
        heading('Nested Layout Demo'),
        label('3+ levels of nested Row/Column with flex ratios (1:2:1)', new TextStyle({ dim: true })),
        new Divider(),

        // Top-level three-column layout
        new Expanded({
          child: new Row({
            crossAxisAlignment: 'start',
            children: [
              // Left sidebar (flex: 1)
              new Expanded({
                flex: 1,
                child: buildSidebar(),
              }),
              new SizedBox({ width: 1 }),
              // Main content (flex: 2)
              new Expanded({
                flex: 2,
                child: buildMainContent(),
              }),
              new SizedBox({ width: 1 }),
              // Right panel (flex: 1)
              new Expanded({
                flex: 1,
                child: buildRightPanel(),
              }),
            ],
          }),
        }),
      ],
    }),
  });
}

// Export the widget tree for testing
export const app = buildNestedLayout();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app, { output: process.stdout });
}
