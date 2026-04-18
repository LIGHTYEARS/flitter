/**
 * ApprovalWidget -- inline tool approval prompt.
 *
 * Renders a bordered dialog at the bottom of the TUI when a tool requires
 * user permission to execute. Shows tool name, args summary, reason, and
 * radio-button options navigable with keyboard.
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
 * - Alt+1..N = direct select by position (1-indexed)
 *
 * p0R also has a feedback sub-form (_feedbackActive):
 * - Triggered when user selects "no-with-feedback"
 * - Shows a text input, Enter submits with feedback text
 * - Escape exits feedback mode without response
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
 * Scope of an approval decision.
 *
 * 逆向: chunk-006.js:22722-22738 createConfirmationOptions options values
 * - "once": approve this one invocation only
 * - "session": allow all invocations this session
 * - "always": allow all invocations persistently
 * - "always-guarded": allow with file-level guard (file tools only)
 */
export type ApprovalScope = "once" | "session" | "always" | "always-guarded";

/**
 * User's response to an approval request.
 */
export interface ApprovalResponse {
  approved: boolean;
  scope?: ApprovalScope;
  feedback?: string;
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

type ApprovalOptionValue =
  | "yes"
  | "allow-all-session"
  | "allow-all-persistent"
  | "no-with-feedback";

interface ApprovalOption {
  value: ApprovalOptionValue;
  label: string;
  color: Color;
}

/** 逆向: chunk-006.js:22722-22738 createConfirmationOptions tool-use branch */
const APPROVAL_OPTIONS: ApprovalOption[] = [
  { value: "yes", label: "Approve", color: SUCCESS_COLOR },
  { value: "allow-all-session", label: "Allow All for This Session", color: SUCCESS_COLOR },
  { value: "allow-all-persistent", label: "Allow All for Every Session", color: SUCCESS_COLOR },
  { value: "no-with-feedback", label: "Deny with feedback", color: DENY_COLOR },
];

/** Map from option value to ApprovalScope */
const SCOPE_MAP: Record<string, ApprovalScope> = {
  yes: "once",
  "allow-all-session": "session",
  "allow-all-persistent": "always",
};

// ════════════════════════════════════════════════════
//  ApprovalWidgetState
// ════════════════════════════════════════════════════

/**
 * State for ApprovalWidget.
 *
 * 逆向: p0R (actions_intents.js:3548) + b0R (actions_intents.js:3838)
 * Combined into one state class.
 *
 * b0R tracks selectedIndex and handles keyboard navigation.
 * - ArrowUp/k moves up, ArrowDown/j moves down
 * - Enter confirms selected option
 * - Alt+1..4 shortcuts for direct select (amp uses altKey+digit)
 * - Escape cancels (null response → simple deny in amp; we emit no-feedback deny)
 *
 * p0R handles the feedback sub-form:
 * - feedbackInputActive = true shows the feedback entry
 * - Escape exits feedback mode without submitting
 * - Enter submits the feedback text (or simple deny if empty)
 */
export class ApprovalWidgetState extends State<ApprovalWidget> {
  /** Currently selected option index. */
  private _selectedIndex = 0;

  /**
   * Whether the feedback input sub-form is active.
   * 逆向: p0R.feedbackInputActive (actions_intents.js:3549)
   */
  private _feedbackActive = false;

  /**
   * Current text in the feedback input.
   * 逆向: p0R.feedbackController (actions_intents.js:3550) — we simulate with a string
   */
  private _feedbackText = "";

  /**
   * Key handler matching amp's b0R.handleKeyEvent + p0R.handleKeyEvent patterns.
   *
   * 逆向: b0R.handleKeyEvent (actions_intents.js:3854-3890)
   *        p0R.handleKeyEvent (actions_intents.js:3561-3572) for Escape in feedback mode
   */
  private _handleKey = (event: {
    key: string;
    altKey?: boolean;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  }): KeyEventResult => {
    // ── Feedback mode ──
    if (this._feedbackActive) {
      return this._handleFeedbackKey(event);
    }

    // ── Normal navigation mode ──
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

      case "Enter": {
        const opt = APPROVAL_OPTIONS[this._selectedIndex];
        if (opt) this._selectOption(opt.value);
        return "handled";
      }

      case "Escape":
        // amp: onSelect(null) → simple deny, no feedback
        this._respondFull({ approved: false });
        return "handled";

      default:
        // 逆向: b0R.handleKeyEvent altKey+digit selects by position (1-indexed)
        // We use plain digit keys (1-4) as a simplified shortcut since our TUI
        // does not expose altKey in all scenarios.
        if (
          event.altKey === true &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          event.key >= "1" &&
          event.key <= "9"
        ) {
          const idx = Number.parseInt(event.key, 10) - 1;
          if (idx < APPROVAL_OPTIONS.length) {
            const opt = APPROVAL_OPTIONS[idx];
            if (opt) this._selectOption(opt.value);
          }
          return "handled";
        }
        // Also support plain 1-4 for convenience
        if (event.key >= "1" && event.key <= "4") {
          const idx = Number.parseInt(event.key, 10) - 1;
          if (idx < APPROVAL_OPTIONS.length) {
            const opt = APPROVAL_OPTIONS[idx];
            if (opt) this._selectOption(opt.value);
          }
          return "handled";
        }
        return "ignored";
    }
  };

  /**
   * Handle keyboard input while the feedback sub-form is active.
   *
   * 逆向: p0R.handleKeyEvent (Escape), Gm (TextField onSubmitted for Enter),
   *        feedbackController text manipulation
   */
  private _handleFeedbackKey = (event: { key: string }): KeyEventResult => {
    switch (event.key) {
      case "Escape":
        // 逆向: p0R.handleKeyEvent — Escape exits feedback mode, clears text
        this.setState(() => {
          this._feedbackActive = false;
          this._feedbackText = "";
        });
        return "handled";

      case "Enter":
        this._submitFeedback();
        return "handled";

      case "Backspace":
        this.setState(() => {
          this._feedbackText = this._feedbackText.slice(0, -1);
        });
        return "handled";

      default:
        // Append printable characters
        if (event.key.length === 1) {
          this.setState(() => {
            this._feedbackText += event.key;
          });
          return "handled";
        }
        return "ignored";
    }
  };

  /**
   * Select an option by value. Triggers feedback mode or emits response.
   *
   * 逆向: p0R.handleOptionSelect (actions_intents.js:3583-3596)
   */
  private _selectOption(value: ApprovalOptionValue): void {
    if (value === "no-with-feedback") {
      this.setState(() => {
        this._feedbackActive = true;
      });
      return;
    }
    this._respondFull({ approved: true, scope: SCOPE_MAP[value] ?? "once" });
  }

  /**
   * Submit the feedback text and emit a deny-with-feedback response.
   *
   * 逆向: p0R.submitFeedback (actions_intents.js:3575-3583)
   * If feedback text is empty, emits a simple deny (no feedback).
   */
  private _submitFeedback(): void {
    const text = this._feedbackText.trim();
    this._feedbackText = "";
    if (text) {
      this._respondFull({ approved: false, feedback: text });
    } else {
      this._respondFull({ approved: false });
    }
  }

  /**
   * Emit the approval response to the callback.
   *
   * 逆向: p0R.handleOptionSelect calls this.widget.onResponse(...)
   */
  private _respondFull(response: ApprovalResponse): void {
    const { request, onRespond } = this.widget.config;
    onRespond(request.toolUseId, response);
  }

  /**
   * Build the approval dialog.
   *
   * 逆向: b0R.build (actions_intents.js:3895-4020)
   *
   * If feedback mode active, shows feedback input form.
   * Otherwise shows main options list.
   */
  build(_context: BuildContext) {
    const { request } = this.widget.config;

    // ── Feedback mode ──
    if (this._feedbackActive) {
      return this._buildFeedbackInput();
    }

    // ── Header ──
    // 逆向: b0R.buildHeader — tool name + reason
    const headerChildren = [
      // Tool name header (e.g. "Run this command?")
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
    // 逆向: b0R.build footer hint line
    const footerHint = new RichText({
      text: new TextSpan({
        text: "↑↓ navigate • 1-4 select • Enter confirm • Esc cancel",
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
   * Build the feedback input sub-form.
   *
   * 逆向: p0R.buildFeedbackInput (actions_intents.js:3597-3650)
   * Shows: "✗ Denied — tell Amp what to do instead"
   *        "› [text input placeholder]"
   *        "Enter send  •  Esc cancel"
   *
   * Since @flitter/tui has no TextField, we simulate with a text cursor display.
   */
  private _buildFeedbackInput() {
    // Header line: "✗ Denied — tell Amp what to do instead"
    const headerLine = new RichText({
      text: new TextSpan({
        text: "",
        style: new TextStyle({ foreground: FOREGROUND_COLOR }),
        children: [
          new TextSpan({
            text: "✗ ",
            style: new TextStyle({ foreground: DENY_COLOR, bold: true }),
          }),
          new TextSpan({
            text: "Denied",
            style: new TextStyle({ foreground: DENY_COLOR, bold: true }),
          }),
          new TextSpan({
            text: " — ",
            style: new TextStyle({ foreground: SECONDARY_COLOR }),
          }),
          new TextSpan({
            text: "tell what to do instead",
            style: new TextStyle({ foreground: FOREGROUND_COLOR }),
          }),
        ],
      }),
    });

    // Input row: "› <text>_"
    const inputText =
      this._feedbackText.length > 0 ? this._feedbackText + "█" : `e.g. "use grep instead"█`;
    const inputRow = new Row({
      children: [
        new RichText({
          text: new TextSpan({
            text: "› ",
            style: new TextStyle({ foreground: PRIMARY_COLOR, bold: true }),
          }),
        }),
        new RichText({
          text: new TextSpan({
            text: inputText,
            style: new TextStyle({
              foreground: this._feedbackText.length > 0 ? FOREGROUND_COLOR : SECONDARY_COLOR,
            }),
          }),
        }),
      ],
    });

    // Footer hint
    const footerLine = new RichText({
      text: new TextSpan({
        text: "",
        style: new TextStyle({ foreground: SECONDARY_COLOR }),
        children: [
          new TextSpan({
            text: "Enter",
            style: new TextStyle({ foreground: PRIMARY_COLOR }),
          }),
          new TextSpan({
            text: " send",
            style: new TextStyle({ foreground: SECONDARY_COLOR, dim: true }),
          }),
          new TextSpan({
            text: "  •  ",
            style: new TextStyle({ foreground: SECONDARY_COLOR, dim: true }),
          }),
          new TextSpan({
            text: "Esc",
            style: new TextStyle({ foreground: PRIMARY_COLOR }),
          }),
          new TextSpan({
            text: " cancel",
            style: new TextStyle({ foreground: SECONDARY_COLOR, dim: true }),
          }),
        ],
      }),
    });

    const column = new Column({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: [
        headerLine,
        new SizedBox({ height: 1 }),
        inputRow,
        new SizedBox({ height: 1 }),
        footerLine,
      ],
    });

    const container = new Container({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(PRIMARY_COLOR, 1, "rounded")),
      }),
      child: column,
    });

    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      debugLabel: "ApprovalWidget-Feedback",
      child: container,
    });
  }

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
