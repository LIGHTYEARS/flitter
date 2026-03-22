// dashboard.ts — Multi-panel dashboard layout.
//
// Run with: bun run examples/dashboard.ts
//
// This example demonstrates:
// - Header bar with title
// - 3-column layout with different panels
// - Each panel has a border, title, and content
// - Footer with status info
// - Complex layout composition with Expanded and flex ratios
// - Container decorations for visual structure

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

// ---------------------------------------------------------------------------
// Dashboard panel builder
// ---------------------------------------------------------------------------

function dashboardPanel(
  title: string,
  borderColor: Color,
  children: Widget[],
): Widget {
  return new Container({
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: borderColor, style: 'rounded' })),
    }),
    child: new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        // Panel title bar with background color
        new Container({
          decoration: new BoxDecoration({ color: borderColor }),
          child: label(` ${title} `, new TextStyle({ bold: true })),
        }),
        // Panel content
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
// Header
// ---------------------------------------------------------------------------

function buildHeader(): Widget {
  return new Container({
    decoration: new BoxDecoration({
      color: Color.blue,
      border: Border.all(new BorderSide({ color: Color.brightBlue, style: 'solid' })),
    }),
    child: new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: Row.spaceBetween([
        label('Dashboard', new TextStyle({ bold: true, foreground: Color.brightWhite })),
        label('flutter-tui v1.0', new TextStyle({ dim: true })),
      ]),
    }),
  });
}

// ---------------------------------------------------------------------------
// Left panel: System Info
// ---------------------------------------------------------------------------

function buildSystemPanel(): Widget {
  return dashboardPanel('System Info', Color.green, [
    new Row({
      children: [
        label('CPU:    ', new TextStyle({ dim: true })),
        label('45%', new TextStyle({ foreground: Color.green })),
      ],
    }),
    new Row({
      children: [
        label('Memory: ', new TextStyle({ dim: true })),
        label('2.1 GB / 8 GB', new TextStyle({ foreground: Color.yellow })),
      ],
    }),
    new Row({
      children: [
        label('Disk:   ', new TextStyle({ dim: true })),
        label('120 GB / 500 GB', new TextStyle({ foreground: Color.cyan })),
      ],
    }),
    new Row({
      children: [
        label('Network:', new TextStyle({ dim: true })),
        label(' 1.2 Gbps', new TextStyle({ foreground: Color.green })),
      ],
    }),
    new Divider({ color: Color.green }),
    label('Uptime: 14d 3h 22m', new TextStyle({ dim: true })),
    label('Load: 0.42 0.38 0.35', new TextStyle({ dim: true })),
  ]);
}

// ---------------------------------------------------------------------------
// Center panel: Activity Log
// ---------------------------------------------------------------------------

function buildActivityPanel(): Widget {
  const activities = [
    { time: '14:32', event: 'Deploy completed', color: Color.green },
    { time: '14:28', event: 'Build #847 started', color: Color.cyan },
    { time: '14:15', event: 'PR #123 merged', color: Color.magenta },
    { time: '13:50', event: 'Alert: High memory', color: Color.yellow },
    { time: '13:42', event: 'Rollback v2.0.1', color: Color.red },
    { time: '13:30', event: 'Config updated', color: Color.white },
    { time: '13:15', event: 'Cache cleared', color: Color.cyan },
  ];

  return dashboardPanel('Activity Log', Color.cyan, [
    ...activities.map((a) =>
      new Row({
        children: [
          label(`${a.time} `, new TextStyle({ dim: true })),
          label(a.event, new TextStyle({ foreground: a.color })),
        ],
      }),
    ),
    new Divider({ color: Color.cyan }),
    label('7 events today', new TextStyle({ dim: true })),
  ]);
}

// ---------------------------------------------------------------------------
// Right panel: Quick Stats
// ---------------------------------------------------------------------------

function buildStatsPanel(): Widget {
  return dashboardPanel('Quick Stats', Color.magenta, [
    label('Services', new TextStyle({ bold: true, underline: true })),
    new Row({
      children: [
        label('  API:   ', new TextStyle({ dim: true })),
        label('OK', new TextStyle({ foreground: Color.green, bold: true })),
      ],
    }),
    new Row({
      children: [
        label('  DB:    ', new TextStyle({ dim: true })),
        label('OK', new TextStyle({ foreground: Color.green, bold: true })),
      ],
    }),
    new Row({
      children: [
        label('  Cache: ', new TextStyle({ dim: true })),
        label('WARN', new TextStyle({ foreground: Color.yellow, bold: true })),
      ],
    }),
    new Row({
      children: [
        label('  Queue: ', new TextStyle({ dim: true })),
        label('OK', new TextStyle({ foreground: Color.green, bold: true })),
      ],
    }),
    new Divider({ color: Color.magenta }),
    label('Metrics', new TextStyle({ bold: true, underline: true })),
    new Row({
      children: [
        label('  Req/s: ', new TextStyle({ dim: true })),
        label('1,247', new TextStyle({ foreground: Color.cyan })),
      ],
    }),
    new Row({
      children: [
        label('  P99:   ', new TextStyle({ dim: true })),
        label('42ms', new TextStyle({ foreground: Color.green })),
      ],
    }),
    new Row({
      children: [
        label('  Errors:', new TextStyle({ dim: true })),
        label(' 0.02%', new TextStyle({ foreground: Color.green })),
      ],
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function buildFooter(): Widget {
  return new Container({
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
    }),
    child: new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: Row.spaceBetween([
        label('Status: All systems operational', new TextStyle({ foreground: Color.green })),
        label('Last refresh: just now', new TextStyle({ dim: true })),
      ]),
    }),
  });
}

// ---------------------------------------------------------------------------
// Build the full dashboard layout
// ---------------------------------------------------------------------------

export function buildDashboard() {
  return new Column({
    mainAxisAlignment: 'start',
    crossAxisAlignment: 'stretch',
    children: [
      // Header
      buildHeader(),

      // Main content area: 3-column layout
      new Expanded({
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1, vertical: 1 }),
          child: new Row({
            crossAxisAlignment: 'start',
            children: [
              // Left panel (flex: 1)
              new Expanded({
                flex: 1,
                child: buildSystemPanel(),
              }),
              new SizedBox({ width: 1 }),
              // Center panel (flex: 2)
              new Expanded({
                flex: 2,
                child: buildActivityPanel(),
              }),
              new SizedBox({ width: 1 }),
              // Right panel (flex: 1)
              new Expanded({
                flex: 1,
                child: buildStatsPanel(),
              }),
            ],
          }),
        }),
      }),

      // Footer
      buildFooter(),
    ],
  });
}

// Export the widget tree for testing
export const app = buildDashboard();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
