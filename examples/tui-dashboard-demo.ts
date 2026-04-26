/**
 * TUI Dashboard Demo — metrics dashboard showcase.
 *
 * Demonstrates a live-updating dashboard with ProgressBar, Badge, Table,
 * Container, Row/Column layout, and timer-driven setState.
 *
 * - Status bar with app title and current time
 * - 4 metric progress bars (CPU, Memory, Disk, Network)
 * - Server status table with hostname, status, uptime, load
 * - Auto-refreshes random values every 2 seconds
 *
 * Run: bun run examples/tui-dashboard-demo.ts
 * Keys: q quit
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import type { KeyEventResult } from "../packages/tui/src/focus/focus-node.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";
import type { KeyEvent } from "../packages/tui/src/vt/types.js";
import { Badge } from "../packages/tui/src/widgets/badge.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Focus } from "../packages/tui/src/widgets/focus.js";
import { Padding } from "../packages/tui/src/widgets/padding.js";
import { ProgressBar } from "../packages/tui/src/widgets/progress-bar.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Table } from "../packages/tui/src/widgets/table.js";
import type { TableRow } from "../packages/tui/src/widgets/table.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Mock Data
// ════════════════════════════════════════════════════

interface ServerInfo {
  hostname: string;
  status: "online" | "warning" | "offline";
  uptime: string;
  load: number;
}

const SERVERS: ServerInfo[] = [
  { hostname: "web-01.prod", status: "online", uptime: "34d 12h", load: 0.42 },
  { hostname: "web-02.prod", status: "online", uptime: "34d 12h", load: 0.38 },
  { hostname: "api-01.prod", status: "warning", uptime: "12d 6h", load: 0.87 },
  { hostname: "db-01.prod", status: "online", uptime: "90d 3h", load: 0.55 },
  { hostname: "cache-01.prod", status: "offline", uptime: "0d 0h", load: 0.0 },
  { hostname: "worker-01.prod", status: "online", uptime: "21d 8h", load: 0.63 },
];

function randomDrift(base: number, range: number): number {
  return Math.max(0, Math.min(1, base + (Math.random() - 0.5) * range));
}

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class DashboardDemo extends StatefulWidget {
  createState(): State {
    return new DashboardDemoState();
  }
}

class DashboardDemoState extends State<DashboardDemo> {
  private _timer!: ReturnType<typeof setInterval>;
  private _cpu = 0.45;
  private _memory = 0.62;
  private _disk = 0.78;
  private _network = 0.23;
  private _servers: ServerInfo[] = [...SERVERS];

  override initState(): void {
    super.initState();
    this._timer = setInterval(() => {
      this.setState(() => {
        this._cpu = randomDrift(this._cpu, 0.15);
        this._memory = randomDrift(this._memory, 0.08);
        this._disk = randomDrift(this._disk, 0.03);
        this._network = randomDrift(this._network, 0.2);
        // Randomize server loads
        this._servers = this._servers.map((s) => ({
          ...s,
          load: s.status === "offline" ? 0 : randomDrift(s.load, 0.12),
        }));
      });
    }, 2000);
  }

  override dispose(): void {
    clearInterval(this._timer);
    super.dispose();
  }

  // ────────────────────────────────────────────────────
  //  Status bar
  // ────────────────────────────────────────────────────

  private _buildStatusBar(): Widget {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour12: false });
    return new Container({
      width: 240,
      height: 1,
      decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Flitter Dashboard",
              style: new TextStyle({ foreground: Color.cyan(), bold: true }),
            }),
            new TextSpan({
              text: `  ${time}  `,
              style: new TextStyle({ foreground: Color.rgb(180, 180, 180) }),
            }),
            new TextSpan({
              text: "q quit",
              style: new TextStyle({ foreground: Color.rgb(100, 100, 100) }),
            }),
          ],
        }),
      }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Metric panels
  // ────────────────────────────────────────────────────

  private _metricColor(value: number): Color {
    if (value > 0.85) return Color.red();
    if (value > 0.6) return Color.yellow();
    return Color.green();
  }

  private _buildMetricRow(label: string, value: number): Widget {
    const pct = Math.round(value * 100);
    const color = this._metricColor(value);
    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 0 }),
      child: new Row({
        children: [
          new Text({
            data: `${label.padEnd(10)}`,
            style: new TextStyle({ foreground: Color.white(), bold: true }),
          }) as unknown as Widget,
          new ProgressBar({
            value,
            width: 30,
            color,
            backgroundColor: Color.rgb(60, 60, 60),
          }) as unknown as Widget,
          new Text({
            data: ` ${String(pct).padStart(3)}%`,
            style: new TextStyle({ foreground: color }),
          }) as unknown as Widget,
          new SizedBox({ width: 2 }) as unknown as Widget,
          new Badge({
            label: pct > 85 ? "CRIT" : pct > 60 ? "WARN" : "OK",
            color: color,
            bold: true,
          }) as unknown as Widget,
        ],
      }),
    }) as unknown as Widget;
  }

  private _buildMetricsPanel(): Widget {
    return new Column({
      children: [
        new Padding({
          padding: EdgeInsets.only({ left: 1 }),
          child: new Text({
            data: "System Metrics",
            style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        this._buildMetricRow("CPU", this._cpu),
        this._buildMetricRow("Memory", this._memory),
        this._buildMetricRow("Disk", this._disk),
        this._buildMetricRow("Network", this._network),
      ],
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Server table
  // ────────────────────────────────────────────────────

  private _statusColor(status: string): Color {
    if (status === "online") return Color.green();
    if (status === "warning") return Color.yellow();
    return Color.red();
  }

  private _buildServerTable(): Widget {
    const headerRow: TableRow = {
      cells: [
        {
          child: new Text({
            data: "Hostname",
            style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
          }) as unknown as Widget,
        },
        {
          child: new Text({
            data: "Status",
            style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
          }) as unknown as Widget,
        },
        {
          child: new Text({
            data: "Uptime",
            style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
          }) as unknown as Widget,
        },
        {
          child: new Text({
            data: "Load",
            style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
          }) as unknown as Widget,
        },
      ],
    };

    const dataRows: TableRow[] = this._servers.map((server) => ({
      cells: [
        {
          child: new Text({
            data: server.hostname,
            style: new TextStyle({ foreground: Color.white() }),
          }) as unknown as Widget,
        },
        {
          child: new RichText({
            text: new TextSpan({
              text: server.status.toUpperCase(),
              style: new TextStyle({
                foreground: this._statusColor(server.status),
                bold: true,
              }),
            }),
          }) as unknown as Widget,
        },
        {
          child: new Text({
            data: server.uptime,
            style: new TextStyle({ foreground: Color.rgb(180, 180, 180) }),
          }) as unknown as Widget,
        },
        {
          child: new Text({
            data: `${(server.load * 100).toFixed(0)}%`,
            style: new TextStyle({ foreground: this._metricColor(server.load) }),
          }) as unknown as Widget,
        },
      ],
    }));

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({
        children: [
          new Text({
            data: "Server Status",
            style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
          }) as unknown as Widget,
          new SizedBox({ height: 1 }) as unknown as Widget,
          new Table({
            rows: [headerRow, ...dataRows],
            columnConfigs: [
              { widthType: "fixed", fixedWidth: 20 },
              { widthType: "fixed", fixedWidth: 10 },
              { widthType: "fixed", fixedWidth: 12 },
              { widthType: "fixed", fixedWidth: 8 },
            ],
            borderColor: Color.rgb(80, 80, 100),
            showBorders: true,
          }) as unknown as Widget,
        ],
      }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Quit handler
  // ────────────────────────────────────────────────────

  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    return "ignored";
  };

  // ────────────────────────────────────────────────────
  //  Build
  // ────────────────────────────────────────────────────

  build(_context: BuildContext): WidgetInterface {
    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      child: new Column({
        children: [
          // Title / status bar
          this._buildStatusBar(),

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Help line
          new Text({
            data: "  Auto-refresh every 2s  |  q  Quit",
            style: new TextStyle({ foreground: Color.green() }),
          }) as unknown as Widget,

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Metrics panel
          this._buildMetricsPanel(),

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Server table
          this._buildServerTable(),

          // Fill remaining space
          new Expanded({
            child: new SizedBox() as unknown as Widget,
          }) as unknown as Widget,

          // Footer
          new Container({
            width: 240,
            height: 1,
            decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
            child: new Text({
              data: " ProgressBar + Badge + Table | Timer-driven setState",
              style: new TextStyle({ dim: true }),
            }),
          }) as unknown as Widget,
        ],
      }),
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new DashboardDemo() as unknown as WidgetInterface);
