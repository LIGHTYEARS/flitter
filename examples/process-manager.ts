// process-manager.ts — Interactive process manager like htop with sortable columns.
//
// Run with: bun run examples/process-manager.ts
//
// This example demonstrates:
// - StatefulWidget with complex state (sorting, filtering, selection)
// - Keyboard-driven navigation and actions (j/k, S, R, F, K, q)
// - setInterval for auto-updating CPU/MEM values every 2 seconds
// - FocusNode for keyboard event handling
// - Color-coded CPU usage: red (>80%), yellow (>50%), green (<=50%)
// - Sortable columns with direction indicators
// - Filter mode for searching processes by name
//
// Keys:
//   j/k or ArrowDown/ArrowUp  Navigate process list
//   1-6                        Sort by column (PID, Name, CPU, MEM, Status, Uptime)
//   S                          Cycle sort column forward
//   R                          Reverse sort order
//   F                          Toggle filter mode (type to filter by name)
//   K                          Kill (remove) selected process with confirmation
//   Y/N                        Confirm/cancel kill
//   Escape                     Cancel filter or kill confirmation
//   q                          Quit

import { StatefulWidget, State, Widget, type BuildContext } from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Expanded } from '../src/widgets/flexible';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  uptime: number; // seconds
  threads: number;
}

type SortColumn = 'pid' | 'name' | 'cpu' | 'mem' | 'status' | 'uptime';
type SortDirection = 'asc' | 'desc';

const COLUMN_ORDER: SortColumn[] = ['pid', 'name', 'cpu', 'mem', 'status', 'uptime'];
const COLUMN_LABELS: Record<SortColumn, string> = {
  pid: 'PID',
  name: 'Name',
  cpu: 'CPU%',
  mem: 'MEM%',
  status: 'Status',
  uptime: 'Uptime',
};
const COLUMN_WIDTHS: Record<SortColumn, number> = {
  pid: 7,
  name: 16,
  cpu: 8,
  mem: 8,
  status: 10,
  uptime: 12,
};

// ---------------------------------------------------------------------------
// Initial mock processes
// ---------------------------------------------------------------------------

function createInitialProcesses(): ProcessInfo[] {
  return [
    { pid: 1, name: 'systemd', cpu: 0.2, mem: 1.4, status: 'running', uptime: 864000, threads: 1 },
    { pid: 142, name: 'node', cpu: 45.3, mem: 12.8, status: 'running', uptime: 72340, threads: 14 },
    { pid: 287, name: 'postgres', cpu: 18.7, mem: 24.2, status: 'running', uptime: 432100, threads: 8 },
    { pid: 305, name: 'redis-server', cpu: 5.1, mem: 3.6, status: 'running', uptime: 432000, threads: 4 },
    { pid: 412, name: 'nginx', cpu: 2.3, mem: 1.8, status: 'running', uptime: 345600, threads: 4 },
    { pid: 518, name: 'bun', cpu: 82.4, mem: 18.5, status: 'running', uptime: 3600, threads: 12 },
    { pid: 623, name: 'docker', cpu: 12.1, mem: 8.4, status: 'running', uptime: 259200, threads: 6 },
    { pid: 701, name: 'cron', cpu: 0.0, mem: 0.5, status: 'sleeping', uptime: 864000, threads: 1 },
    { pid: 815, name: 'sshd', cpu: 0.1, mem: 0.8, status: 'sleeping', uptime: 864000, threads: 1 },
    { pid: 923, name: 'webpack', cpu: 67.8, mem: 32.1, status: 'running', uptime: 1800, threads: 10 },
    { pid: 1042, name: 'python3', cpu: 55.2, mem: 15.3, status: 'running', uptime: 7200, threads: 3 },
    { pid: 1155, name: 'java', cpu: 91.5, mem: 45.7, status: 'running', uptime: 14400, threads: 24 },
    { pid: 1263, name: 'mongod', cpu: 8.9, mem: 22.0, status: 'running', uptime: 172800, threads: 6 },
    { pid: 1378, name: 'rsyslogd', cpu: 0.3, mem: 0.9, status: 'sleeping', uptime: 864000, threads: 2 },
    { pid: 1490, name: 'containerd', cpu: 3.7, mem: 4.2, status: 'running', uptime: 259200, threads: 8 },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function txt(text: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text, style: style ?? new TextStyle() }),
  });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function cpuColor(cpu: number): Color {
  if (cpu > 80) return Color.red;
  if (cpu > 50) return Color.yellow;
  return Color.green;
}

function memColor(mem: number): Color {
  if (mem > 80) return Color.red;
  if (mem > 50) return Color.yellow;
  return Color.green;
}

function statusColor(status: string): Color {
  switch (status) {
    case 'running': return Color.green;
    case 'sleeping': return Color.cyan;
    case 'stopped': return Color.yellow;
    case 'zombie': return Color.red;
    default: return Color.defaultColor;
  }
}

/** Randomly perturb a value within a range, clamped to [0, 100]. */
function jitter(value: number, range: number): number {
  const delta = (Math.random() - 0.5) * 2 * range;
  return Math.max(0, Math.min(100, +(value + delta).toFixed(1)));
}

// ---------------------------------------------------------------------------
// ProcessManager Widget
// ---------------------------------------------------------------------------

export class ProcessManager extends StatefulWidget {
  createState(): State<ProcessManager> {
    return new ProcessManagerState();
  }
}

// ---------------------------------------------------------------------------
// ProcessManagerState
// ---------------------------------------------------------------------------

export class ProcessManagerState extends State<ProcessManager> {
  private _processes: ProcessInfo[] = [];
  private _selectedIndex: number = 0;
  private _sortColumn: SortColumn = 'cpu';
  private _sortDirection: SortDirection = 'desc';
  private _filterMode: boolean = false;
  private _filterText: string = '';
  private _confirmKill: boolean = false;
  private _focusNode: FocusNode | null = null;
  private _timerId: ReturnType<typeof setInterval> | null = null;

  // --- Lifecycle ---

  initState(): void {
    super.initState();
    this._processes = createInitialProcesses();
    this._sortProcesses();

    this._focusNode = new FocusNode({
      debugLabel: 'ProcessManagerFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        const result = this._handleKeyEvent(event.key);
        if (result === 'handled') {
          this.setState(() => {});
        }
        return result;
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();

    // Auto-update CPU/MEM every 2 seconds
    this._timerId = setInterval(() => {
      this._updateMetrics();
      this.setState(() => {});
    }, 2000);
  }

  dispose(): void {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    super.dispose();
  }

  // --- Public accessors (testing) ---

  get processes(): readonly ProcessInfo[] { return this._processes; }
  get selectedIndex(): number { return this._selectedIndex; }
  get sortColumn(): SortColumn { return this._sortColumn; }
  get sortDirection(): SortDirection { return this._sortDirection; }
  get filterMode(): boolean { return this._filterMode; }
  get filterText(): string { return this._filterText; }
  get confirmKill(): boolean { return this._confirmKill; }

  // --- Internal logic ---

  private _getFilteredProcesses(): ProcessInfo[] {
    if (this._filterText.length === 0) return this._processes;
    const lower = this._filterText.toLowerCase();
    return this._processes.filter(p => p.name.toLowerCase().includes(lower));
  }

  private _sortProcesses(): void {
    const dir = this._sortDirection === 'asc' ? 1 : -1;
    this._processes.sort((a, b) => {
      let cmp = 0;
      switch (this._sortColumn) {
        case 'pid': cmp = a.pid - b.pid; break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'cpu': cmp = a.cpu - b.cpu; break;
        case 'mem': cmp = a.mem - b.mem; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'uptime': cmp = a.uptime - b.uptime; break;
      }
      return cmp * dir;
    });
  }

  private _updateMetrics(): void {
    for (const proc of this._processes) {
      if (proc.status === 'running') {
        proc.cpu = jitter(proc.cpu, 5);
        proc.mem = jitter(proc.mem, 2);
        proc.uptime += 2;
      }
    }
    this._sortProcesses();
  }

  private _clampSelection(): void {
    const filtered = this._getFilteredProcesses();
    if (filtered.length === 0) {
      this._selectedIndex = 0;
    } else if (this._selectedIndex >= filtered.length) {
      this._selectedIndex = filtered.length - 1;
    }
  }

  // --- Key handling ---

  private _handleKeyEvent(key: string): KeyEventResult {
    if (this._confirmKill) {
      return this._handleConfirmKillKey(key);
    }
    if (this._filterMode) {
      return this._handleFilterKey(key);
    }
    return this._handleNormalKey(key);
  }

  private _handleConfirmKillKey(key: string): KeyEventResult {
    if (key === 'y' || key === 'Y') {
      const filtered = this._getFilteredProcesses();
      const target = filtered[this._selectedIndex];
      if (target) {
        const idx = this._processes.indexOf(target);
        if (idx >= 0) this._processes.splice(idx, 1);
      }
      this._confirmKill = false;
      this._clampSelection();
      return 'handled';
    }
    if (key === 'n' || key === 'N' || key === 'Escape') {
      this._confirmKill = false;
      return 'handled';
    }
    return 'ignored';
  }

  private _handleFilterKey(key: string): KeyEventResult {
    if (key === 'Escape') {
      this._filterMode = false;
      this._filterText = '';
      this._clampSelection();
      return 'handled';
    }
    if (key === 'Enter') {
      this._filterMode = false;
      this._clampSelection();
      return 'handled';
    }
    if (key === 'Backspace') {
      if (this._filterText.length > 0) {
        this._filterText = this._filterText.slice(0, -1);
        this._selectedIndex = 0;
      }
      return 'handled';
    }
    if (key === 'Space') {
      this._filterText += ' ';
      this._selectedIndex = 0;
      return 'handled';
    }
    if (key.length === 1) {
      this._filterText += key;
      this._selectedIndex = 0;
      return 'handled';
    }
    return 'ignored';
  }

  private _handleNormalKey(key: string): KeyEventResult {
    switch (key) {
      case 'j':
      case 'ArrowDown': {
        const maxIdx = this._getFilteredProcesses().length - 1;
        if (this._selectedIndex < maxIdx) this._selectedIndex++;
        return 'handled';
      }
      case 'k':
      case 'ArrowUp':
        if (this._selectedIndex > 0) this._selectedIndex--;
        return 'handled';

      case 'S':
      case 's': {
        const idx = COLUMN_ORDER.indexOf(this._sortColumn);
        this._sortColumn = COLUMN_ORDER[(idx + 1) % COLUMN_ORDER.length]!;
        this._sortProcesses();
        this._clampSelection();
        return 'handled';
      }
      case 'R':
      case 'r':
        this._sortDirection = this._sortDirection === 'asc' ? 'desc' : 'asc';
        this._sortProcesses();
        return 'handled';

      case 'F':
      case 'f':
        this._filterMode = true;
        this._filterText = '';
        this._selectedIndex = 0;
        return 'handled';

      case 'K':
        if (this._getFilteredProcesses().length > 0) {
          this._confirmKill = true;
        }
        return 'handled';

      case '1': case '2': case '3': case '4': case '5': case '6': {
        const colIdx = parseInt(key) - 1;
        const col = COLUMN_ORDER[colIdx];
        if (col) {
          if (this._sortColumn === col) {
            this._sortDirection = this._sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            this._sortColumn = col;
            this._sortDirection = col === 'name' || col === 'status' ? 'asc' : 'desc';
          }
          this._sortProcesses();
          this._clampSelection();
        }
        return 'handled';
      }

      case 'q':
        process.exit(0);
        return 'handled';

      default:
        return 'ignored';
    }
  }

  // --- Build ---

  build(_context: BuildContext): Widget {
    const filtered = this._getFilteredProcesses();
    const runningCount = this._processes.filter(p => p.status === 'running').length;
    const sleepingCount = this._processes.filter(p => p.status === 'sleeping').length;

    return new Column({
      crossAxisAlignment: 'stretch',
      children: [
        // Title bar
        this._buildTitleBar(),
        // Column headers
        this._buildColumnHeaders(),
        new Divider({ color: Color.brightBlack }),
        // Process rows
        new Expanded({
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'stretch',
            children: filtered.length > 0
              ? filtered.map((proc, i) => this._buildProcessRow(proc, i))
              : [txt('  No matching processes.', new TextStyle({ dim: true }))],
          }),
        }),
        new Divider({ color: Color.brightBlack }),
        // Status bar
        this._buildStatusBar(runningCount, sleepingCount),
        // Help bar / filter bar / confirm bar
        this._buildBottomBar(filtered),
      ],
    });
  }

  private _buildTitleBar(): Widget {
    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        new Row({
          children: [
            txt(' Process Manager ', new TextStyle({ bold: true, foreground: Color.cyan })),
            new Expanded({
              child: txt('', new TextStyle()),
            }),
            txt(`${this._processes.length} processes `, new TextStyle({ dim: true })),
          ],
        }),
        new Divider({ color: Color.brightBlack }),
      ],
    });
  }

  private _buildColumnHeaders(): Widget {
    const headerWidgets: Widget[] = COLUMN_ORDER.map(col => {
      const isActive = this._sortColumn === col;
      const arrow = isActive
        ? (this._sortDirection === 'asc' ? ' \u25B2' : ' \u25BC')
        : '  ';
      const label = COLUMN_LABELS[col] + arrow;
      const style = isActive
        ? new TextStyle({ bold: true, foreground: Color.yellow, underline: true })
        : new TextStyle({ bold: true, foreground: Color.defaultColor });
      return new Container({
        width: COLUMN_WIDTHS[col],
        child: txt(label, style),
      });
    });

    return new Container({
      child: new Row({ children: headerWidgets }),
    });
  }

  private _buildProcessRow(proc: ProcessInfo, index: number): Widget {
    const isSelected = index === this._selectedIndex;
    const decoration = isSelected
      ? new BoxDecoration({ color: Color.brightBlack })
      : new BoxDecoration();

    const baseStyle = isSelected
      ? new TextStyle({ bold: true, foreground: Color.defaultColor })
      : new TextStyle({ foreground: Color.defaultColor });

    const cpuStyle = isSelected
      ? new TextStyle({ bold: true, foreground: Color.defaultColor })
      : new TextStyle({ foreground: cpuColor(proc.cpu) });

    const memStyle = isSelected
      ? new TextStyle({ bold: true, foreground: Color.defaultColor })
      : new TextStyle({ foreground: memColor(proc.mem) });

    const statStyle = isSelected
      ? new TextStyle({ bold: true, foreground: Color.defaultColor })
      : new TextStyle({ foreground: statusColor(proc.status) });

    return new Container({
      decoration,
      child: new Row({
        children: [
          new Container({
            width: COLUMN_WIDTHS.pid,
            child: txt(String(proc.pid).padStart(5) + '  ', baseStyle),
          }),
          new Container({
            width: COLUMN_WIDTHS.name,
            child: txt(proc.name.padEnd(16).slice(0, 16), baseStyle),
          }),
          new Container({
            width: COLUMN_WIDTHS.cpu,
            child: txt(proc.cpu.toFixed(1).padStart(6) + '  ', cpuStyle),
          }),
          new Container({
            width: COLUMN_WIDTHS.mem,
            child: txt(proc.mem.toFixed(1).padStart(6) + '  ', memStyle),
          }),
          new Container({
            width: COLUMN_WIDTHS.status,
            child: txt(proc.status.padEnd(10), statStyle),
          }),
          new Container({
            width: COLUMN_WIDTHS.uptime,
            child: txt(formatUptime(proc.uptime).padStart(8), baseStyle),
          }),
        ],
      }),
    });
  }

  private _buildStatusBar(running: number, sleeping: number): Widget {
    const stopped = this._processes.filter(p => p.status === 'stopped').length;
    const zombie = this._processes.filter(p => p.status === 'zombie').length;

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        new Divider({ color: Color.brightBlack }),
        new Row({
          children: [
            txt(` Total: ${this._processes.length}`, new TextStyle({ bold: true, foreground: Color.defaultColor })),
            txt('  ', new TextStyle()),
            txt(`Running: ${running}`, new TextStyle({ foreground: Color.green })),
            txt('  ', new TextStyle()),
            txt(`Sleeping: ${sleeping}`, new TextStyle({ foreground: Color.cyan })),
            ...(stopped > 0
              ? [txt('  ', new TextStyle()), txt(`Stopped: ${stopped}`, new TextStyle({ foreground: Color.yellow }))]
              : []),
            ...(zombie > 0
              ? [txt('  ', new TextStyle()), txt(`Zombie: ${zombie}`, new TextStyle({ foreground: Color.red }))]
              : []),
            new Expanded({ child: txt('', new TextStyle()) }),
            txt(`Sort: ${COLUMN_LABELS[this._sortColumn]} ${this._sortDirection === 'asc' ? '\u25B2' : '\u25BC'} `,
              new TextStyle({ dim: true })),
          ],
        }),
      ],
    });
  }

  private _buildBottomBar(filtered: ProcessInfo[]): Widget {
    if (this._confirmKill) {
      const target = filtered[this._selectedIndex];
      const name = target ? target.name : '???';
      const pid = target ? target.pid : 0;
      return new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children: [
          new Divider({ color: Color.red }),
          txt(
            ` Kill process ${pid} (${name})? [Y]es / [N]o `,
            new TextStyle({ bold: true, foreground: Color.red }),
          ),
        ],
      });
    }

    if (this._filterMode) {
      return new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.yellow, style: 'solid' })),
        }),
        child: new Row({
          children: [
            txt(' Filter: ', new TextStyle({ bold: true, foreground: Color.yellow })),
            txt(this._filterText, new TextStyle({ foreground: Color.defaultColor })),
            txt('\u2588', new TextStyle({ foreground: Color.yellow })),
            new Expanded({ child: txt('', new TextStyle()) }),
            txt(`${filtered.length} matches `, new TextStyle({ dim: true })),
          ],
        }),
      });
    }

    return new Row({
      children: [
        txt(' j/k', new TextStyle({ bold: true, foreground: Color.cyan })),
        txt(':Nav ', new TextStyle({ dim: true })),
        txt('1-6', new TextStyle({ bold: true, foreground: Color.cyan })),
        txt(':Sort ', new TextStyle({ dim: true })),
        txt('S', new TextStyle({ bold: true, foreground: Color.cyan })),
        txt(':Cycle ', new TextStyle({ dim: true })),
        txt('R', new TextStyle({ bold: true, foreground: Color.cyan })),
        txt(':Rev ', new TextStyle({ dim: true })),
        txt('F', new TextStyle({ bold: true, foreground: Color.cyan })),
        txt(':Filter ', new TextStyle({ dim: true })),
        txt('K', new TextStyle({ bold: true, foreground: Color.cyan })),
        txt(':Kill ', new TextStyle({ dim: true })),
        txt('q', new TextStyle({ bold: true, foreground: Color.cyan })),
        txt(':Quit', new TextStyle({ dim: true })),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { txt, formatUptime, cpuColor, memColor, statusColor, jitter };
export { createInitialProcesses, COLUMN_ORDER, COLUMN_LABELS, COLUMN_WIDTHS };
export type { SortColumn, SortDirection };

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (import.meta.main) {
  runApp(new ProcessManager(), { output: process.stdout });
}
