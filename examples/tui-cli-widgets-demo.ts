/**
 * TUI CLI Widgets Demo — interactive showcase of all CLI-layer widgets.
 *
 * Demonstrates the widgets built for the Flitter CLI conversation UI:
 *   Mode 1: ConversationView — message list with tool items and activity groups
 *   Mode 2: ApprovalWidget — inline tool approval dialog with keyboard nav
 *   Mode 3: StatusBar cycling — walks through all status bar states
 *   Mode 4: ToastOverlay — fire success/error/info toasts with `t`
 *   Mode 5: ErrorDialog — modal error overlay with keyboard dismiss
 *
 * Run: bun run examples/tui-cli-widgets-demo.ts
 * Keys: 1-5 switch mode | q quit | mode-specific keys shown in UI
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { Widget } from "../packages/tui/src/tree/widget.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Stack } from "../packages/tui/src/widgets/stack.js";
import { Positioned } from "../packages/tui/src/widgets/stack.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { StatusBar } from "../packages/cli/src/widgets/status-bar.js";
import type { StatusBarState } from "../packages/cli/src/widgets/status-bar.js";
import { InputField } from "../packages/cli/src/widgets/input-field.js";
import { ApprovalWidget } from "../packages/cli/src/widgets/approval-widget.js";
import type { ApprovalRequest } from "../packages/cli/src/widgets/approval-widget.js";
import { ToastManager } from "../packages/cli/src/widgets/toast-manager.js";
import { ToastOverlay } from "../packages/cli/src/widgets/toast-overlay.js";
import { ErrorDialog } from "../packages/cli/src/widgets/error-dialog.js";
import { ConversationView } from "../packages/cli/src/widgets/conversation-view.js";
import { transformThreadToDisplayItems } from "../packages/cli/src/widgets/display-items.js";
import type { DisplayItem } from "../packages/cli/src/widgets/display-items.js";
import { PromptHistory } from "../packages/cli/src/widgets/prompt-history.js";

// ════════════════════════════════════════════════════
//  Color constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);
const ACTIVE_MODE_FG = Color.rgb(0x7a, 0xa2, 0xf7);
const DIM_FG = Color.rgb(0x56, 0x5f, 0x89);
const YELLOW_FG = Color.yellow();

// ════════════════════════════════════════════════════
//  Mock data
// ════════════════════════════════════════════════════

/** Build mock conversation DisplayItems via the real pipeline. */
function buildMockConversation(): DisplayItem[] {
  const messages = [
    {
      role: "user" as const,
      content: [{ type: "text" as const, text: "Fix the bug in src/app.ts" }],
    },
    {
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Looking at the code..." },
        {
          type: "tool_use" as const,
          id: "tu_1",
          name: "Read",
          input: { file_path: "src/app.ts" },
          complete: true,
        },
        {
          type: "tool_use" as const,
          id: "tu_2",
          name: "Grep",
          input: { pattern: "BUG" },
          complete: true,
        },
      ],
      state: { type: "complete" as const },
    },
    {
      role: "user" as const,
      content: [
        {
          type: "tool_result" as const,
          toolUseID: "tu_1",
          run: { status: "done" as const, result: "function calc(a, b) { return a + b; }" },
        },
        {
          type: "tool_result" as const,
          toolUseID: "tu_2",
          run: { status: "done" as const, result: "src/app.ts:1: // BUG" },
        },
      ],
    },
    {
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Found it. Fixing `+` to `*`." },
        {
          type: "tool_use" as const,
          id: "tu_3",
          name: "Edit",
          input: { file_path: "src/app.ts", old_string: "a + b", new_string: "a * b" },
          complete: true,
        },
      ],
      state: { type: "complete" as const },
    },
    {
      role: "user" as const,
      content: [
        {
          type: "tool_result" as const,
          toolUseID: "tu_3",
          run: { status: "done" as const, result: "OK" },
        },
      ],
    },
    {
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Bug fixed. Changed addition to multiplication." },
      ],
      state: { type: "complete" as const },
    },
  ];
  return transformThreadToDisplayItems(messages);
}

/** Mock approval requests to cycle through. */
const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    toolUseId: "tu_a1",
    toolName: "Bash",
    args: { command: "rm -rf node_modules && npm install" },
    reason: "Tool requires approval: Bash",
  },
  {
    toolUseId: "tu_a2",
    toolName: "Edit",
    args: { file_path: "/src/config.ts", old_string: "debug: false", new_string: "debug: true" },
    reason: "Tool requires approval: Edit",
  },
  {
    toolUseId: "tu_a3",
    toolName: "WebSearch",
    args: { query: "latest TypeScript release notes 2026" },
    reason: "Tool requires approval: WebSearch",
  },
];

/** All status bar state scenarios for mode 3 cycling. */
const STATUS_SCENARIOS: Array<{ label: string; state: StatusBarState }> = [
  {
    label: "Idle",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 1200, outputTokens: 340, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    },
  },
  {
    label: "Waiting for response",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "running",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 5000, outputTokens: 1200, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    },
  },
  {
    label: "Streaming tokens",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "running",
      hasStartedStreaming: true,
      tokenUsage: { inputTokens: 8000, outputTokens: 2500, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    },
  },
  {
    label: "Running 1 tool",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 12000, outputTokens: 3800, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 1,
      waitingForApproval: false,
    },
  },
  {
    label: "Running 3 tools",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 15000, outputTokens: 4500, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 3,
      waitingForApproval: false,
    },
  },
  {
    label: "Waiting for approval",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 18000, outputTokens: 5200, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: true,
    },
  },
  {
    label: "Compacting context",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 170000, outputTokens: 15000, maxInputTokens: 200000 },
      compactionState: "compacting",
      runningToolCount: 0,
      waitingForApproval: false,
    },
  },
  {
    label: "Context 80% (warning)",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 160000, outputTokens: 10000, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    },
  },
  {
    label: "Context 90% (danger)",
    state: {
      modelName: "claude-opus-4-6",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 185000, outputTokens: 10000, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    },
  },
];

// ════════════════════════════════════════════════════
//  Mode names
// ════════════════════════════════════════════════════

const MODE_NAMES = [
  "1:Conversation",
  "2:Approval",
  "3:StatusBar",
  "4:Toasts",
  "5:ErrorDialog",
];

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class CliWidgetsDemo extends StatefulWidget {
  createState(): State {
    return new CliWidgetsDemoState();
  }
}

// ════════════════════════════════════════════════════
//  Root State
// ════════════════════════════════════════════════════

class CliWidgetsDemoState extends State<CliWidgetsDemo> {
  // ── Mode ──
  private mode = 1;

  // ── Mode 1: Conversation ──
  private displayItems: DisplayItem[] = buildMockConversation();
  private promptHistory = new PromptHistory();

  // ── Mode 2: Approval ──
  private approvalIndex = 0;
  private approvalLog: string[] = [];

  // ── Mode 3: Status cycling ──
  private statusIndex = 0;
  private statusTimer: ReturnType<typeof setInterval> | null = null;

  // ── Mode 4: Toasts ──
  private toastManager = new ToastManager();
  private toastCount = 0;

  // ── Mode 5: Error dialog ──
  private showErrorDialog = false;

  // ── Shared status bar state ──
  private statusState: StatusBarState = STATUS_SCENARIOS[0].state;

  initState(): void {
    super.initState();
  }

  dispose(): void {
    if (this.statusTimer) clearInterval(this.statusTimer);
    super.dispose();
  }

  // ── Mode switching ──
  switchMode(newMode: number): void {
    if (newMode < 1 || newMode > 5) return;
    // Stop status cycling timer when leaving mode 3
    if (this.mode === 3 && this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    this.setState(() => {
      this.mode = newMode;
      this.showErrorDialog = false;
    });
    // Start status cycling timer when entering mode 3
    if (newMode === 3) {
      this.statusTimer = setInterval(() => {
        this.setState(() => {
          this.statusIndex = (this.statusIndex + 1) % STATUS_SCENARIOS.length;
          this.statusState = STATUS_SCENARIOS[this.statusIndex].state;
        });
      }, 2000);
    }
    // Reset status to idle for non-cycling modes
    if (newMode !== 3) {
      this.statusState = STATUS_SCENARIOS[0].state;
    }
    // Show error dialog on mode 5 entry
    if (newMode === 5) {
      this.setState(() => {
        this.showErrorDialog = true;
      });
    }
  }

  // ── Build ──

  build(_context: BuildContext): WidgetInterface {
    const modeContent = this._buildModeContent();
    const bottomWidget = this._buildBottomWidget();

    // Mode selector tabs
    const modeTabChildren: Widget[] = MODE_NAMES.map((name, i) => {
      const isActive = this.mode === i + 1;
      return new RichText({
        text: new TextSpan({
          text: ` ${name} `,
          style: new TextStyle({
            foreground: isActive ? ACTIVE_MODE_FG : DIM_FG,
            bold: isActive,
          }),
        }),
      }) as unknown as Widget;
    });

    const children: Widget[] = [
      // Title bar
      new Container({
        height: 1,
        decoration: new BoxDecoration({ color: TITLE_BG }),
        child: new Text({
          data: " Flitter CLI Widgets Demo",
          style: new TextStyle({ foreground: TITLE_FG, bold: true }),
        }),
      }) as unknown as Widget,

      // Mode tabs
      new Row({ children: modeTabChildren }) as unknown as Widget,

      // Hint line
      new RichText({
        text: new TextSpan({
          text: " Press 1-5 to switch mode | q to quit",
          style: new TextStyle({ foreground: HINT_FG, dim: true }),
        }),
      }) as unknown as Widget,

      // Separator
      new SizedBox({ height: 1 }) as unknown as Widget,
    ];

    // Mode content (expanded)
    if (this.mode === 4) {
      // Toast mode: Stack with toast overlay on top
      children.push(
        new Expanded({
          child: new Stack({
            children: [
              modeContent as unknown as Widget,
              new Positioned({
                top: 0,
                left: 0,
                right: 0,
                child: new ToastOverlay({ manager: this.toastManager }),
              }) as unknown as Widget,
            ],
          }) as unknown as Widget,
        }) as unknown as Widget,
      );
    } else {
      children.push(new Expanded({ child: modeContent as unknown as Widget }) as unknown as Widget);
    }

    // Separator
    children.push(
      new SizedBox({
        height: 1,
        child: new Text({ data: "\u2500".repeat(80) }),
      }) as unknown as Widget,
    );

    // Status bar
    children.push(
      new StatusBar({ state: this.statusState }) as unknown as Widget,
    );

    // Separator
    children.push(
      new SizedBox({
        height: 1,
        child: new Text({ data: "\u2500".repeat(80) }),
      }) as unknown as Widget,
    );

    // Bottom widget (InputField or ApprovalWidget)
    children.push(bottomWidget as unknown as Widget);

    // Error dialog overlay (mode 5)
    if (this.showErrorDialog) {
      // Show error dialog as fullscreen replacement (same pattern as CommandPalette demo)
      return new Column({
        children: [
          // Title bar
          new Container({
            height: 1,
            decoration: new BoxDecoration({ color: TITLE_BG }),
            child: new Text({
              data: " Flitter CLI Widgets Demo  [ERROR DIALOG]",
              style: new TextStyle({ foreground: TITLE_FG, bold: true }),
            }),
          }) as unknown as Widget,
          new SizedBox({ height: 1 }) as unknown as Widget,
          // Error dialog takes remaining space
          new Expanded({
            child: new ErrorDialog({
              title: "API Rate Limit Exceeded",
              description:
                "The model API returned HTTP 429. Your request was throttled because the account\nexceeded the rate limit of 60 requests per minute.\n\nWait a moment and try again, or check your API usage dashboard.",
              onDismiss: () => {
                this.setState(() => {
                  this.showErrorDialog = false;
                });
              },
            }) as unknown as Widget,
          }) as unknown as Widget,
        ],
      }) as unknown as WidgetInterface;
    }

    return new Column({ children }) as unknown as WidgetInterface;
  }

  // ── Mode-specific content builders ──

  private _buildModeContent(): WidgetInterface {
    switch (this.mode) {
      case 1:
        return this._buildConversationMode();
      case 2:
        return this._buildApprovalMode();
      case 3:
        return this._buildStatusMode();
      case 4:
        return this._buildToastMode();
      case 5:
        return this._buildErrorMode();
      default:
        return new Text({ data: "Unknown mode" }) as unknown as WidgetInterface;
    }
  }

  /** Mode 1: Conversation with mock messages and tool items. */
  private _buildConversationMode(): WidgetInterface {
    return new ConversationView({
      items: this.displayItems,
      inferenceState: "idle",
      error: null,
    }) as unknown as WidgetInterface;
  }

  /** Mode 2: Approval dialog info + log of decisions. */
  private _buildApprovalMode(): WidgetInterface {
    const children: Widget[] = [
      new RichText({
        text: new TextSpan({
          text: " Approval Widget Demo",
          style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
        }),
      }) as unknown as Widget,
      new SizedBox({ height: 1 }) as unknown as Widget,
      new RichText({
        text: new TextSpan({
          text: " Use Arrow keys to navigate, Enter/y/n to respond",
          style: new TextStyle({ foreground: HINT_FG }),
        }),
      }) as unknown as Widget,
      new RichText({
        text: new TextSpan({
          text: ` Request ${this.approvalIndex + 1} of ${MOCK_APPROVALS.length}`,
          style: new TextStyle({ foreground: DIM_FG }),
        }),
      }) as unknown as Widget,
      new SizedBox({ height: 1 }) as unknown as Widget,
    ];

    // Show approval log
    for (const entry of this.approvalLog.slice(-6)) {
      children.push(
        new RichText({
          text: new TextSpan({
            text: ` ${entry}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
      );
    }

    return new Column({ children }) as unknown as WidgetInterface;
  }

  /** Mode 3: Shows current status scenario label. */
  private _buildStatusMode(): WidgetInterface {
    const scenario = STATUS_SCENARIOS[this.statusIndex];
    return new Column({
      children: [
        new RichText({
          text: new TextSpan({
            text: " StatusBar State Cycling Demo",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Status bar below cycles through all states every 2 seconds.",
            style: new TextStyle({ foreground: HINT_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: ` Current state: ${scenario.label}`,
            style: new TextStyle({ foreground: ACTIVE_MODE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: ` Scenario ${this.statusIndex + 1} of ${STATUS_SCENARIOS.length}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 2 }) as unknown as Widget,
        // Show all scenario names with indicator
        ...STATUS_SCENARIOS.map(
          (s, i) =>
            new RichText({
              text: new TextSpan({
                text: ` ${i === this.statusIndex ? "▸" : " "} ${s.label}`,
                style: new TextStyle({
                  foreground: i === this.statusIndex ? ACTIVE_MODE_FG : DIM_FG,
                  bold: i === this.statusIndex,
                }),
              }),
            }) as unknown as Widget,
        ),
      ],
    }) as unknown as WidgetInterface;
  }

  /** Mode 4: Toast demo with hints. */
  private _buildToastMode(): WidgetInterface {
    return new Column({
      children: [
        new RichText({
          text: new TextSpan({
            text: " Toast Overlay Demo",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Press t to fire a toast notification. Toasts auto-dismiss after 3s.",
            style: new TextStyle({ foreground: HINT_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: ` Toasts fired: ${this.toastCount}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }

  /** Mode 5: Error dialog info (dialog itself overlays in build()). */
  private _buildErrorMode(): WidgetInterface {
    return new Column({
      children: [
        new RichText({
          text: new TextSpan({
            text: " ErrorDialog Demo",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Press Enter or Escape to dismiss the error dialog.",
            style: new TextStyle({ foreground: HINT_FG }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Press e to show the error dialog again.",
            style: new TextStyle({ foreground: HINT_FG }),
          }),
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }

  // ── Bottom widget: InputField or ApprovalWidget ──

  private _buildBottomWidget(): WidgetInterface {
    if (this.mode === 2) {
      const request = MOCK_APPROVALS[this.approvalIndex];
      return new ApprovalWidget({
        request,
        onRespond: (_toolUseId, response) => {
          const decision = response.approved ? "APPROVED" : "DENIED";
          this.setState(() => {
            this.approvalLog.push(
              `${request.toolName} (${request.toolUseId}): ${decision}`,
            );
            this.approvalIndex = (this.approvalIndex + 1) % MOCK_APPROVALS.length;
          });
        },
      }) as unknown as WidgetInterface;
    }

    return new InputField({
      onSubmit: (text) => {
        if (this.mode === 1 && text.trim()) {
          // Add user message to conversation
          this.setState(() => {
            this.displayItems = [
              ...this.displayItems,
              { type: "message", role: "user", text: text.trim() },
              { type: "message", role: "assistant", text: `(Echo) You said: "${text.trim()}"` },
            ];
          });
        }
      },
      promptHistory: this.promptHistory,
      placeholder: this.mode === 1 ? "Type a message..." : "Input disabled in this mode",
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: CliWidgetsDemoState | null = null;

// Stash state reference for key interceptor access.
const originalCreateState = CliWidgetsDemo.prototype.createState;
CliWidgetsDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as CliWidgetsDemoState;
  demoState = state;
  return state;
};

await runApp(new CliWidgetsDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;

    binding.addKeyInterceptor((event) => {
      if (!demoState) return false;

      // Mode switching: number keys 1-5
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= 5 && !event.modifiers.ctrl && !event.modifiers.alt) {
        // Don't intercept numbers when in approval mode (they'd be for the widget)
        if (demoState && (demoState as unknown as { mode: number }).mode !== 2) {
          demoState.switchMode(num);
          return true;
        }
        // In approval mode, only intercept if not a valid approval key
        if (num !== 1) {
          demoState.switchMode(num);
          return true;
        }
      }

      // Ctrl+N: next mode
      if (event.key === "n" && event.modifiers.ctrl) {
        const current = (demoState as unknown as { mode: number }).mode;
        demoState.switchMode((current % 5) + 1);
        return true;
      }

      // t: fire toast (mode 4 only)
      if (event.key === "t" && !event.modifiers.ctrl && !event.modifiers.alt) {
        if ((demoState as unknown as { mode: number }).mode === 4) {
          const types = ["success", "error", "info"] as const;
          const messages = [
            "Operation completed successfully",
            "Failed to connect to API server",
            "Context window is 80% full",
            "File saved: src/app.ts",
            "Tests passed: 12/12",
            "Rate limit warning: 50 req/min",
          ];
          const type = types[(demoState as unknown as { toastCount: number }).toastCount % 3];
          const msg = messages[(demoState as unknown as { toastCount: number }).toastCount % messages.length];
          (demoState as unknown as { toastManager: ToastManager }).toastManager.show(msg, type);
          (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
            (demoState as unknown as { toastCount: number }).toastCount++;
          });
          return true;
        }
      }

      // e: show error dialog (mode 5 only)
      if (event.key === "e" && !event.modifiers.ctrl && !event.modifiers.alt) {
        if ((demoState as unknown as { mode: number }).mode === 5) {
          (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
            (demoState as unknown as { showErrorDialog: boolean }).showErrorDialog = true;
          });
          return true;
        }
      }

      // q: quit (not when error dialog is showing or in approval mode)
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        const mode = (demoState as unknown as { mode: number }).mode;
        const errorShowing = (demoState as unknown as { showErrorDialog: boolean }).showErrorDialog;
        if (mode !== 2 && !errorShowing) {
          binding.stop();
          return true;
        }
      }

      return false;
    });
  },
});
