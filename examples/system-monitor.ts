// system-monitor.ts — Fake system metrics display with multi-panel layout.
//
// Run with: bun run examples/system-monitor.ts
//
// This example demonstrates:
// - CPU/Memory/Disk usage bars with percentage fills
// - Network activity display
// - Process list with PID, Name, CPU%, Memory
// - Bordered panels with colored headers
// - Multi-column layout using Row + Expanded
// - Complex widget composition

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
// Panel builder
// ---------------------------------------------------------------------------

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
// Usage bar component
// ---------------------------------------------------------------------------

function usageBar(
  name: string,
  percentage: number,
  barWidth: number,
  used: string,
  total: string,
): Widget {
  // Color based on usage level
  let barColor: Color;
  if (percentage < 50) barColor = Color.green;
  else if (percentage < 80) barColor = Color.yellow;
  else barColor = Color.red;

  const filledWidth = Math.round((percentage / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  const barChildren: Widget[] = [];
  if (filledWidth > 0) {
    barChildren.push(
      new Container({
        width: filledWidth,
        height: 1,
        decoration: new BoxDecoration({ color: barColor }),
      }),
    );
  }
  if (emptyWidth > 0) {
    barChildren.push(
      new Container({
        width: emptyWidth,
        height: 1,
        decoration: new BoxDecoration({ color: Color.brightBlack }),
      }),
    );
  }

  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'start',
    children: [
      // Label row
      new Row({
        children: [
          label(`${name.padEnd(8)}`, new TextStyle({ bold: true, foreground: Color.white })),
          label(`${percentage}%`, new TextStyle({ bold: true, foreground: barColor })),
          label(`  ${used} / ${total}`, new TextStyle({ dim: true })),
        ],
      }),
      // Bar
      new Row({ children: barChildren }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Resource usage panel (CPU, Memory, Disk)
// ---------------------------------------------------------------------------

function buildResourcePanel(): Widget {
  return panel('Resource Usage', Color.green, [
    usageBar('CPU', 47, 20, '47%', '100%'),
    new SizedBox({ height: 1 }),
    usageBar('Memory', 68, 20, '5.4 GB', '8.0 GB'),
    new SizedBox({ height: 1 }),
    usageBar('Disk', 34, 20, '170 GB', '500 GB'),
    new SizedBox({ height: 1 }),
    usageBar('Swap', 12, 20, '0.5 GB', '4.0 GB'),
  ]);
}

// ---------------------------------------------------------------------------
// Network panel
// ---------------------------------------------------------------------------

function buildNetworkPanel(): Widget {
  return panel('Network', Color.cyan, [
    new Row({
      children: [
        label('Interface: ', new TextStyle({ dim: true })),
        label('eth0', new TextStyle({ foreground: Color.cyan })),
      ],
    }),
    new Row({
      children: [
        label('IP:        ', new TextStyle({ dim: true })),
        label('10.0.1.42', new TextStyle({ foreground: Color.white })),
      ],
    }),
    new Divider({ color: Color.cyan }),
    new Row({
      children: [
        label('Upload:    ', new TextStyle({ dim: true })),
        label('12.4 MB/s ', new TextStyle({ foreground: Color.green })),
        label(' ^', new TextStyle({ foreground: Color.green, bold: true })),
      ],
    }),
    new Row({
      children: [
        label('Download:  ', new TextStyle({ dim: true })),
        label('45.8 MB/s ', new TextStyle({ foreground: Color.cyan })),
        label(' v', new TextStyle({ foreground: Color.cyan, bold: true })),
      ],
    }),
    new Divider({ color: Color.cyan }),
    new Row({
      children: [
        label('Packets:   ', new TextStyle({ dim: true })),
        label('In: 142K  Out: 98K', new TextStyle({ foreground: Color.white })),
      ],
    }),
    new Row({
      children: [
        label('Errors:    ', new TextStyle({ dim: true })),
        label('0', new TextStyle({ foreground: Color.green })),
      ],
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Process list panel
// ---------------------------------------------------------------------------

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: string;
  status: string;
}

const PROCESSES: ProcessInfo[] = [
  { pid: 1, name: 'systemd', cpu: 0.1, memory: '12 MB', status: 'running' },
  { pid: 142, name: 'node', cpu: 23.4, memory: '340 MB', status: 'running' },
  { pid: 287, name: 'postgres', cpu: 8.2, memory: '512 MB', status: 'running' },
  { pid: 305, name: 'redis', cpu: 2.1, memory: '64 MB', status: 'running' },
  { pid: 412, name: 'nginx', cpu: 1.3, memory: '48 MB', status: 'running' },
  { pid: 518, name: 'bun', cpu: 15.7, memory: '256 MB', status: 'running' },
  { pid: 623, name: 'docker', cpu: 4.5, memory: '128 MB', status: 'running' },
  { pid: 701, name: 'cron', cpu: 0.0, memory: '4 MB', status: 'sleeping' },
];

function buildProcessPanel(): Widget {
  // Table header
  const header = new Row({
    children: [
      new Container({
        width: 6,
        child: label('PID', new TextStyle({ bold: true, underline: true, foreground: Color.yellow })),
      }),
      new Container({
        width: 12,
        child: label('Name', new TextStyle({ bold: true, underline: true, foreground: Color.yellow })),
      }),
      new Container({
        width: 8,
        child: label('CPU%', new TextStyle({ bold: true, underline: true, foreground: Color.yellow })),
      }),
      new Container({
        width: 10,
        child: label('Memory', new TextStyle({ bold: true, underline: true, foreground: Color.yellow })),
      }),
      label('Status', new TextStyle({ bold: true, underline: true, foreground: Color.yellow })),
    ],
  });

  // Process rows
  const processRows: Widget[] = PROCESSES.map(proc => {
    const cpuColor = proc.cpu > 15 ? Color.red
      : proc.cpu > 5 ? Color.yellow
      : Color.green;

    const statusColor = proc.status === 'running' ? Color.green : Color.brightBlack;

    return new Row({
      children: [
        new Container({
          width: 6,
          child: label(String(proc.pid).padStart(5), new TextStyle({ foreground: Color.white })),
        }),
        new Container({
          width: 12,
          child: label(proc.name.padEnd(11), new TextStyle({ foreground: Color.cyan })),
        }),
        new Container({
          width: 8,
          child: label(proc.cpu.toFixed(1).padStart(5), new TextStyle({ foreground: cpuColor })),
        }),
        new Container({
          width: 10,
          child: label(proc.memory.padStart(8), new TextStyle({ foreground: Color.white })),
        }),
        label(proc.status, new TextStyle({ foreground: statusColor })),
      ],
    });
  });

  return panel('Processes', Color.yellow, [
    header,
    new Divider({ color: Color.yellow }),
    ...processRows,
    new Divider({ color: Color.yellow }),
    new Row({
      children: [
        label('Total: ', new TextStyle({ dim: true })),
        label(`${PROCESSES.length} processes`, new TextStyle({ foreground: Color.white })),
        label('  CPU Total: ', new TextStyle({ dim: true })),
        label(
          `${PROCESSES.reduce((sum, p) => sum + p.cpu, 0).toFixed(1)}%`,
          new TextStyle({ foreground: Color.yellow }),
        ),
      ],
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Build the full system monitor layout
// ---------------------------------------------------------------------------

export function buildSystemMonitor() {
  return new Column({
    mainAxisAlignment: 'start',
    crossAxisAlignment: 'stretch',
    children: [
      // Header bar
      new Container({
        decoration: new BoxDecoration({
          color: Color.blue,
          border: Border.all(new BorderSide({ color: Color.brightBlue, style: 'solid' })),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: Row.spaceBetween([
            label('System Monitor', new TextStyle({ bold: true, foreground: Color.brightWhite })),
            label('Host: prod-node-01', new TextStyle({ dim: true })),
          ]),
        }),
      }),

      // Top row: Resources + Network side by side
      new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1, vertical: 1 }),
        child: new Row({
          crossAxisAlignment: 'start',
          children: [
            new Expanded({
              flex: 3,
              child: buildResourcePanel(),
            }),
            new SizedBox({ width: 1 }),
            new Expanded({
              flex: 2,
              child: buildNetworkPanel(),
            }),
          ],
        }),
      }),

      // Bottom: Process list (full width)
      new Expanded({
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: buildProcessPanel(),
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
            label('Uptime: 23d 14h 07m', new TextStyle({ foreground: Color.green })),
            label('Load: 1.42 0.98 0.87', new TextStyle({ dim: true })),
          ]),
        }),
      }),
    ],
  });
}

// Export for testing
export const app = buildSystemMonitor();
export { PROCESSES };
export type { ProcessInfo };

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app, { output: process.stdout });
}
