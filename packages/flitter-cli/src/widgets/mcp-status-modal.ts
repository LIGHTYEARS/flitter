// McpStatusModal — Overlay displaying MCP server connection status list
//
// Matches AMP's MCP status overlay pattern.
// Shows each MCP server's name, connection status, and latency.
//
// Key bindings:
//   Escape → dismiss overlay
//
// Modal overlay at MCP_STATUS priority (50).

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Connection status of an individual MCP server. */
export type McpConnectionStatus = 'connected' | 'disconnected' | 'error';

/** Data describing a single MCP server's current state. */
export interface McpServerEntry {
  /** Human-readable server name (e.g., "filesystem", "git"). */
  readonly name: string;
  /** Current connection status. */
  readonly status: McpConnectionStatus;
  /** Round-trip latency in milliseconds, or null if unavailable. */
  readonly latencyMs: number | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the McpStatusModal widget. */
interface McpStatusModalProps {
  /** List of MCP server entries to display. */
  servers: readonly McpServerEntry[];
  /** Callback to dismiss the overlay. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.magenta;
const TITLE_COLOR = Color.magenta;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;
const VALUE_COLOR = Color.white;

/** Status indicator colors per connection state. */
const STATUS_COLORS: Record<McpConnectionStatus, Color> = {
  connected: Color.green,
  disconnected: Color.brightBlack,
  error: Color.red,
};

/** Status indicator icons per connection state. */
const STATUS_ICONS: Record<McpConnectionStatus, string> = {
  connected: '●',
  disconnected: '○',
  error: '✗',
};

// ---------------------------------------------------------------------------
// McpStatusModal
// ---------------------------------------------------------------------------

/**
 * MCP status modal showing all MCP server connection states.
 *
 * Each row displays:
 *   [status icon] server_name   status_label   latency_ms
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered magenta, padded, maxWidth: 60)
 *         Column
 *           "MCP Status" title + server count
 *           Server entry rows (or empty state)
 *           Footer hints
 */
export class McpStatusModal extends StatelessWidget {
  private readonly servers: readonly McpServerEntry[];
  private readonly onDismiss: () => void;

  constructor(props: McpStatusModalProps) {
    super({});
    this.servers = props.servers;
    this.onDismiss = props.onDismiss;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const children: Widget[] = [];

    // Title with server count
    children.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'MCP Status',
              style: new TextStyle({ foreground: TITLE_COLOR, bold: true }),
            }),
            new TextSpan({
              text: ` (${this.servers.length})`,
              style: new TextStyle({ foreground: MUTED_COLOR }),
            }),
          ],
        }),
      }),
    );
    children.push(new SizedBox({ height: 1 }));

    if (this.servers.length === 0) {
      // Empty state
      children.push(
        new Text({
          text: new TextSpan({
            text: 'No MCP servers configured',
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    } else {
      // Server entry rows
      for (const server of this.servers) {
        const statusColor = STATUS_COLORS[server.status];
        const statusIcon = STATUS_ICONS[server.status];
        const latencyText = server.latencyMs !== null
          ? `${server.latencyMs}ms`
          : '—';

        children.push(
          new Row({
            children: [
              // Status indicator icon
              new Text({
                text: new TextSpan({
                  text: `${statusIcon} `,
                  style: new TextStyle({ foreground: statusColor, bold: true }),
                }),
              }),
              // Server name
              new Text({
                text: new TextSpan({
                  text: server.name,
                  style: new TextStyle({ foreground: VALUE_COLOR }),
                }),
              }),
              // Spacing
              new Text({
                text: new TextSpan({
                  text: '  ',
                }),
              }),
              // Connection status label
              new Text({
                text: new TextSpan({
                  text: server.status,
                  style: new TextStyle({ foreground: statusColor }),
                }),
              }),
              // Spacing
              new Text({
                text: new TextSpan({
                  text: '  ',
                }),
              }),
              // Latency
              new Text({
                text: new TextSpan({
                  text: latencyText,
                  style: new TextStyle({ foreground: MUTED_COLOR }),
                }),
              }),
            ],
          }),
        );
      }
    }

    // Footer
    children.push(new SizedBox({ height: 1 }));
    children.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' close',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
          ],
        }),
      }),
    );

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        // Absorb all keys while overlay is shown
        return 'handled';
      },
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 60 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children,
          }),
        }),
      }),
    });
  }
}
