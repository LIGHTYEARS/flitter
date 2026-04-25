/**
 * McpTrustDialogWidget -- MCP server trust confirmation dialog.
 *
 * Renders a centered, bordered dialog asking the user whether to trust
 * an MCP server. Offers four actions: Trust once, Always trust, Open
 * settings, and Dismiss.
 *
 * 逆向: ZZT (modules/2512_unknown_ZZT.js) — MCP trust notification manager
 *        - trustAlways() approves workspace + all pending servers
 *        - trustOnce(serverName) approves a single server
 *        - deny() denies all pending servers
 *        - D5T (modules/1282_unknown_D5T.js) — trust store with isTrusted/setTrust
 *        - MC0 (modules/2511_unknown_MC0.js) — untrusted server warning output
 *
 * In amp the trust UI is handled via the notification system:
 *   MC0.onUntrustedWorkspaceServer prints yellow warning with instructions
 *   ZZT tracks pending servers, debounces 700ms, and provides trustAlways/trustOnce/deny
 *
 * Flitter simplification:
 *   Instead of a notification-based flow, we render a dedicated dialog widget
 *   with clear keybindings. The four actions map to amp's ZZT methods:
 *   - [t] Trust once → ZZT.trustOnce(serverName)
 *   - [a] Always trust → ZZT.trustAlways()
 *   - [s] Open settings → navigate to settings
 *   - [Esc] Dismiss → ZZT.deny()
 *
 * @module mcp-trust-dialog
 */

import type { BuildContext, KeyEventResult, Widget } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  Center,
  Color,
  Column,
  Container,
  EdgeInsets,
  Focus,
  RichText,
  SizedBox,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Props for McpTrustDialogWidget.
 *
 * 逆向: ZZT constructor(mcpService, workspaceFolder) + pending server name
 */
export interface McpTrustDialogProps {
  /** Name of the MCP server requesting trust. */
  serverName: string;
  /** Called when the user trusts the server for this session only. */
  onTrust: () => void;
  /** Called when the user permanently trusts the server. */
  onAlwaysTrust: () => void;
  /** Called when the user wants to open settings to manage trust. */
  onOpenSettings: () => void;
  /** Called when the user dismisses the dialog (Esc). */
  onDismiss: () => void;
}

// ════════════════════════════════════════════════════
//  Color constants
// ════════════════════════════════════════════════════

/**
 * Warning border color (yellow) — matches amp's untrusted server warning.
 *
 * 逆向: MC0 → oR.yellow() for untrusted server warning text
 */
const WARNING_COLOR = Color.indexed(3);

/**
 * Title text color (bold foreground).
 *
 * 逆向: MC0 warning title uses terminal default foreground
 */
const TITLE_COLOR = Color.default();

/**
 * Body text color.
 */
const BODY_COLOR = Color.default();

/**
 * Keybind label color (blue) — matches amp's keybind color.
 *
 * 逆向: modules/2179_unknown_yS.js line 131 — keybind: LT.blue (indexed 4)
 */
const KEYBIND_COLOR = Color.indexed(4);

/**
 * Muted hint text color.
 */
const MUTED_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  McpTrustDialogWidget
// ════════════════════════════════════════════════════

/**
 * MCP Server Trust Dialog.
 *
 * StatelessWidget that renders a centered dialog asking the user to trust
 * an MCP server. It wraps itself in a Focus widget for keyboard handling.
 *
 * 逆向: ZZT manages trust state; this widget is the UI counterpart.
 * amp uses MC0 to print warning text + ZZT for programmatic trust;
 * we unify into a single dialog widget.
 */
export class McpTrustDialogWidget extends StatelessWidget {
  readonly props: McpTrustDialogProps;

  constructor(props: McpTrustDialogProps) {
    super();
    this.props = props;
  }

  /**
   * Key handler: maps t/a/s/Escape to callbacks.
   *
   * 逆向: ZZT.trustOnce / ZZT.trustAlways / ZZT.deny
   *        Keyboard shortcuts are a Flitter-specific UI addition.
   */
  private _handleKey = (event: {
    key: string;
    altKey?: boolean;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  }): KeyEventResult => {
    switch (event.key) {
      case "t":
      case "T":
        this.props.onTrust();
        return "handled";
      case "a":
      case "A":
        this.props.onAlwaysTrust();
        return "handled";
      case "s":
      case "S":
        this.props.onOpenSettings();
        return "handled";
      case "Escape":
        this.props.onDismiss();
        return "handled";
      default:
        return "ignored";
    }
  };

  /**
   * Build the trust dialog.
   *
   * Structure:
   *   Center
   *     Focus (autofocus, key handler)
   *       Container (warning border, padding)
   *         Column
   *           Title: "MCP Server Trust" (bold)
   *           SizedBox(1)
   *           Body: "The MCP server '<serverName>' wants to connect..."
   *           SizedBox(1)
   *           Action: [t] Trust
   *           Action: [a] Always trust
   *           Action: [s] Open settings
   *           Action: [Esc] Dismiss
   *
   * 逆向: Layout inspired by amp's WQT dialog (actions_intents.js:1994-2069):
   *        Column with title, spacer, body, spacer, options
   *        wrapped in Container with BoxDecoration + Border.all
   */
  build(_context: BuildContext): Widget {
    const { serverName } = this.props;

    // ── Title ──
    const title = new RichText({
      text: new TextSpan({
        text: "MCP Server Trust",
        style: new TextStyle({ foreground: TITLE_COLOR, bold: true }),
      }),
    });

    // ── Body ──
    const body = new RichText({
      text: new TextSpan({
        text: `The MCP server '${serverName}' wants to connect. Do you trust this server?`,
        style: new TextStyle({ foreground: BODY_COLOR }),
      }),
    });

    // ── Action rows ──
    // 逆向: ZZT actions: trustOnce, trustAlways, (settings nav), deny
    const actions = [
      this._buildAction("[t]", "Trust"),
      this._buildAction("[a]", "Always trust"),
      this._buildAction("[s]", "Open settings"),
      this._buildAction("[Esc]", "Dismiss"),
    ];

    // ── Column assembly ──
    const column = new Column({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: [title, new SizedBox({ height: 1 }), body, new SizedBox({ height: 1 }), ...actions],
    });

    // ── Container with warning border ──
    // 逆向: WQT.build → Container + BoxDecoration + Border.all(BorderSide(color, 1, "rounded"))
    const container = new Container({
      padding: EdgeInsets.symmetric({ vertical: 1, horizontal: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(WARNING_COLOR, 1, "rounded")),
      }),
      child: column,
    });

    // ── Focus wrapper ──
    const focused = new Focus({
      autofocus: true,
      onKey: this._handleKey,
      debugLabel: "McpTrustDialog",
      child: container,
    });

    // ── Center the dialog ──
    return new Center({ child: focused });
  }

  /**
   * Build a single action row: "[key] Label"
   *
   * 逆向: amp keybind display pattern — key in accent color, label in muted
   */
  private _buildAction(key: string, label: string): RichText {
    return new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: `${key} `,
            style: new TextStyle({ foreground: KEYBIND_COLOR }),
          }),
          new TextSpan({
            text: label,
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
        ],
      }),
    });
  }
}
