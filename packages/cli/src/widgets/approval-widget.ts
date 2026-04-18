/**
 * ApprovalWidget -- inline tool approval prompt.
 *
 * Renders a bordered dialog at the bottom of the TUI when a tool requires
 * user permission to execute. Shows tool name, args summary, reason, and
 * Allow/Deny radio-button options navigable with keyboard.
 *
 * 逆向: A0R (StatefulWidget, misc_utils.js:5768) + p0R (ConfirmationWidget state,
 *        actions_intents.js:3548) + _0R/b0R (ConfirmationSelect, actions_intents.js:3813-4002)
 *
 * In amp:
 * - A0R({ confirmationRequest, onResponse, onShowOverlay }) -> createState() -> p0R
 * - p0R.build() returns _0R (ConfirmationSelect) with options array, content, borderColor
 * - b0R (state of _0R) renders:
 *     - Focus wrapper with key handling
 *     - Container with BoxDecoration(background, Border.all(BorderSide(warning, 1, "rounded")))
 *     - Padding symmetric(1, 0)
 *     - Column: header (tool name + args), options list, footer hint
 *     - Options rendered as Row([arrow "▸"/" ", radio "●"/"○", spacer, label])
 * - Key handling: ArrowUp/k = up, ArrowDown/j = down, Enter = confirm, Escape = cancel
 *
 * Simplification for Flitter:
 * - Two options only: Allow / Deny (amp supports up to 5 for different scope levels)
 * - No deny-with-feedback sub-form
 * - No Alt+N shortcuts (only 2 options)
 *
 * @module
 */

import type { BuildContext, KeyEventResult } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  Color,
  Column,
  Container,
  EdgeInsets,
  Focus,
  RichText,
  Row,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Approval request payload.
 *
 * Matches the fields emitted by ApprovalRequestEvent from agent-core.
 */
export interface ApprovalRequest {
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
}

/**
 * User's response to an approval request.
 */
export interface ApprovalResponse {
  approved: boolean;
}

/**
 * ApprovalWidget configuration.
 */
export interface ApprovalWidgetConfig {
  /** The approval request to display. */
  request: ApprovalRequest;
  /** Called when the user approves or denies. */
  onRespond: (toolUseId: string, response: ApprovalResponse) => void;
}

// ════════════════════════════════════════════════════
//  Color constants
// ════════════════════════════════════════════════════

/**
 * Warning border color (yellow).
 *
 * 逆向: b0R.build -> borderColor = colorScheme.warning
 * In amp's Tokyo Night theme, warning maps to this amber/yellow.
 */
const WARNING_COLOR = Color.rgb(0xe0, 0xaf, 0x68);

/**
 * Primary/selected option color.
 *
 * 逆向: b0R.build -> colorScheme.primary (blue)
 */
const PRIMARY_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);

/**
 * Secondary/muted hint text color.
 *
 * 逆向: b0R.build -> colorScheme.secondary (dim gray)
 */
const SECONDARY_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/**
 * Standard foreground text color.
 *
 * 逆向: b0R.build -> colorScheme.foreground
 */
const FOREGROUND_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);

/**
 * Success/approve green.
 *
 * 逆向: b0R.buildHeader -> colorScheme.success
 */
const SUCCESS_COLOR = Color.rgb(0x9e, 0xce, 0x6a);

/**
 * Destructive/deny red.
 *
 * 逆向: p0R.buildFeedbackInput -> colorScheme.destructive
 */
const DENY_COLOR = Color.rgb(0xf7, 0x76, 0x8e);

// ════════════════════════════════════════════════════
//  ApprovalWidget
// ════════════════════════════════════════════════════

/**
 * Inline tool approval prompt widget.
 *
 * 逆向: A0R extends NR (StatefulWidget) in misc_utils.js:5768
 */
export class ApprovalWidget extends StatefulWidget {
  readonly config: ApprovalWidgetConfig;

  constructor(config: ApprovalWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): ApprovalWidgetState {
    return new ApprovalWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  Option definitions
// ════════════════════════════════════════════════════

interface ApprovalOption {
  value: "yes" | "no";
  label: string;
  color: Color;
}

const APPROVAL_OPTIONS: ApprovalOption[] = [
  { value: "yes", label: "Allow", color: SUCCESS_COLOR },
  { value: "no", label: "Deny", color: DENY_COLOR },
];

// ════════════════════════════════════════════════════
//  ApprovalWidgetState
// ════════════════════════════════════════════════════

/**
 * State for ApprovalWidget.
 *
 * 逆向: p0R (actions_intents.js:3548) + b0R (actions_intents.js:3838)
 * Combined into one state class since we don't need the feedback sub-form.
 *
 * b0R tracks selectedIndex and handles keyboard navigation.
 * - ArrowUp/k moves up, ArrowDown/j moves down
 * - Enter confirms selected option
 * - y/Y shortcuts to approve, n/N to deny
 * - Escape cancels (deny)
 */
export class ApprovalWidgetState extends State<ApprovalWidget> {
  /** Currently selected option index (0 = Allow, 1 = Deny). */
  private _selectedIndex = 0;

  /**
   * Key handler matching amp's b0R.handleKeyEvent pattern.
   *
   * 逆向: b0R.handleKeyEvent (actions_intents.js:3854-3890)
   */
  private _handleKey = (event: { key: string }): KeyEventResult => {
    switch (event.key) {
      case "ArrowUp":
      case "k":
        this.setState(() => {
          this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        });
        return "handled";

      case "ArrowDown":
      case "j":
        this.setState(() => {
          this._selectedIndex = Math.min(APPROVAL_OPTIONS.length - 1, this._selectedIndex + 1);
        });
        return "handled";

      case "Enter":
        this._respond(APPROVAL_OPTIONS[this._selectedIndex].value);
        return "handled";

      case "y":
      case "Y":
        this._respond("yes");
        return "handled";

      case "n":
      case "N":
        this._respond("no");
        return "handled";

      case "Escape":
        this._respond("no");
        return "handled";

      default:
        return "ignored";
    }
  };

  /**
   * Emit the approval response to the callback.
   */
  private _respond(value: "yes" | "no"): void {
    const { request, onRespond } = this.widget.config;
    onRespond(request.toolUseId, { approved: value === "yes" });
  }

  /**
   * Build the approval dialog.
   *
   * 逆向: b0R.build (actions_intents.js:3895-4020)
   *
   * Structure:
   * 1. Header: tool name + reason
   * 2. Args summary (truncated JSON)
   * 3. Options list (Allow/Deny radio buttons)
   * 4. Footer hint line
   *
   * Wrapped in:
   * - Column(crossAxisAlignment: "stretch", mainAxisSize: "min")
   * - Container with BoxDecoration(border: Border.all(BorderSide(WARNING_COLOR, 1, "rounded")))
   * - Focus with autofocus + key handler
   */
  build(_context: BuildContext) {
    const { request } = this.widget.config;

    // ── Header ──
    // 逆向: b0R.buildHeader — tool name + reason
    const headerChildren = [
      // Tool name header (e.g. "Invoke tool Bash?")
      // 逆向: formatToolConfirmation — generic path: `Invoke tool ${T.name}?`
      new RichText({
        text: new TextSpan({
          text: this._formatHeader(request),
          style: new TextStyle({ foreground: FOREGROUND_COLOR, bold: true }),
        }),
      }),
    ];

    // Reason line if present
    if (request.reason) {
      headerChildren.push(
        new RichText({
          text: new TextSpan({
            text: `(${request.reason})`,
            style: new TextStyle({ foreground: SECONDARY_COLOR }),
          }),
        }),
      );
    }

    // ── Args summary ──
    // 逆向: formatToolConfirmation — json: JSON.stringify(T.input, null, 2) for generic tools
    const argsText = this._formatArgs(request);
    const argsChildren =
      argsText.length > 0
        ? [
            new SizedBox({ height: 1 }),
            new RichText({
              text: new TextSpan({
                text: argsText,
                style: new TextStyle({ foreground: SECONDARY_COLOR }),
              }),
            }),
          ]
        : [];

    // ── Options list ──
    // 逆向: b0R.build options rendering (actions_intents.js:3972-4002)
    const optionRows = APPROVAL_OPTIONS.map((opt, i) => {
      const isSelected = i === this._selectedIndex;
      return this._buildOptionRow(opt, isSelected);
    });

    // ── Footer hint ──
    // 逆向: b0R.build footer: "↑↓ navigate • Enter select • Esc cancel"
    const footerHint = new RichText({
      text: new TextSpan({
        text: "↑↓ navigate • Enter select • y approve • n deny",
        style: new TextStyle({ foreground: SECONDARY_COLOR, dim: true }),
      }),
    });

    // ── Assemble column ──
    const columnChildren = [
      ...headerChildren,
      ...argsChildren,
      new SizedBox({ height: 1 }),
      ...optionRows,
      new SizedBox({ height: 1 }),
      footerHint,
    ];

    // 逆向: b0R.build -> Column(crossAxisAlignment: "stretch", mainAxisSize: "min", children)
    const column = new Column({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: columnChildren,
    });

    // 逆向: b0R.build -> Container with padding + decoration
    // amp: padding: symmetric(1, 0) — 1 col horizontal, 0 vertical
    // amp: decoration: BoxDecoration(background, Border.all(BorderSide(borderColor, 1, "rounded")))
    const container = new Container({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(WARNING_COLOR, 1, "rounded")),
      }),
      child: column,
    });

    // 逆向: p0R.build -> Focus wrapper
    // amp: new C8({ focusNode, child, autofocus: true })
    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      debugLabel: "ApprovalWidget",
      child: container,
    });
  }

  // ────────────────────────────────────────────────────
  //  Private helpers
  // ────────────────────────────────────────────────────

  /**
   * Format the header text based on tool name.
   *
   * 逆向: formatToolConfirmation (actions_intents.js, called by p0R)
   * - Bash: "Run this command?"
   * - Edit: "Allow editing file:"
   * - Write: "Allow creating file:"
   * - Generic: "Invoke tool <name>?"
   */
  private _formatHeader(request: ApprovalRequest): string {
    switch (request.toolName) {
      case "Bash":
        return "Run this command?";
      case "Edit":
        return `Allow editing file: ${(request.args as { file_path?: string }).file_path ?? ""}`;
      case "Write":
        return `Allow creating file: ${(request.args as { file_path?: string }).file_path ?? ""}`;
      default:
        return `Invoke tool ${request.toolName}?`;
    }
  }

  /**
   * Format tool args into a truncated summary string.
   *
   * 逆向: formatToolConfirmation — for Bash shows `$ <command>`,
   * for generic tools shows JSON.stringify(input, null, 2) truncated to 3 lines.
   */
  private _formatArgs(request: ApprovalRequest): string {
    if (request.toolName === "Bash") {
      const cmd = (request.args as { command?: string }).command ?? "";
      const lines = cmd.split("\n");
      if (lines.length > 3) {
        return `$ ${lines.slice(0, 3).join("\n")}...`;
      }
      return `$ ${cmd}`;
    }

    if (request.toolName === "Edit" || request.toolName === "Write") {
      // File path is already in the header
      return "";
    }

    // Generic: JSON summary, truncated
    const json = JSON.stringify(request.args, null, 2);
    const lines = json.split("\n");
    if (lines.length > 3) {
      return `${lines.slice(0, 3).join("\n")}...`;
    }
    return json;
  }

  /**
   * Build a single option row with radio-button styling.
   *
   * 逆向: b0R.build option rendering (actions_intents.js:3972-4002)
   * Each row: [arrow "▸"/" "] [radio "●"/"○"] [spacer] [label]
   * Selected: primary color, bold label
   * Unselected: secondary radio, foreground label
   */
  private _buildOptionRow(option: ApprovalOption, isSelected: boolean): Row {
    // Arrow indicator
    const arrow = new RichText({
      text: new TextSpan({
        text: isSelected ? "▸ " : "  ",
        style: new TextStyle({ foreground: PRIMARY_COLOR }),
      }),
    });

    // Radio dot
    const radio = new RichText({
      text: new TextSpan({
        text: isSelected ? "● " : "○ ",
        style: new TextStyle({
          foreground: isSelected ? option.color : SECONDARY_COLOR,
        }),
      }),
    });

    // Label text
    const label = new RichText({
      text: new TextSpan({
        text: option.label,
        style: new TextStyle({
          foreground: isSelected ? option.color : FOREGROUND_COLOR,
          bold: isSelected,
        }),
      }),
    });

    return new Row({ children: [arrow, radio, label] });
  }
}
