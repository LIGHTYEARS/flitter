/**
 * TUI Approval Demo — 4-option scoped approval widget with deny-with-feedback.
 *
 * Cycles through mock tool-approval requests (Bash, Edit, WebSearch).
 * Use arrow keys or 1-4 to select an option, Enter to confirm, Esc to deny.
 * Option 4 ("Deny with feedback") opens a text input for the denial reason.
 *
 * Run: bun run examples/tui-approval-demo.ts
 * Keys: ↑↓ navigate | Enter confirm | 1-4 shortcuts | Esc deny | q quit
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
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { StatusBar } from "../packages/cli/src/widgets/status-bar.js";
import type { StatusBarState } from "../packages/cli/src/widgets/status-bar.js";
import { ApprovalWidget } from "../packages/cli/src/widgets/approval-widget.js";
import type { ApprovalRequest } from "../packages/cli/src/widgets/approval-widget.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);
const YELLOW_FG = Color.yellow();
const DIM_FG = Color.rgb(0x56, 0x5f, 0x89);

const IDLE_STATUS: StatusBarState = {
  modelName: "claude-opus-4-6",
  inferenceState: "idle",
  hasStartedStreaming: false,
  tokenUsage: { inputTokens: 1200, outputTokens: 340, maxInputTokens: 200000 },
  compactionState: "idle",
  runningToolCount: 0,
  waitingForApproval: true,
};

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

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class ApprovalDemo extends StatefulWidget {
  createState(): State {
    return new ApprovalDemoState();
  }
}

class ApprovalDemoState extends State<ApprovalDemo> {
  private approvalIndex = 0;
  private approvalLog: string[] = [];

  build(_context: BuildContext): WidgetInterface {
    const request = MOCK_APPROVALS[this.approvalIndex];

    const logWidgets: Widget[] = this.approvalLog.slice(-6).map(
      (entry) =>
        new RichText({
          text: new TextSpan({
            text: ` ${entry}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
    );

    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter ApprovalWidget Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " ↑↓ navigate | Enter confirm | 1-4 shortcuts | Esc deny | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Mode info
        new RichText({
          text: new TextSpan({
            text: " Approval Widget Demo",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Use ↑↓, Enter, 1-4, or Esc. Try 'Deny with feedback' (option 4)",
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

        // Approval log
        ...logWidgets,

        // Separator + status bar
        new SizedBox({
          height: 1,
          child: new Text({ data: "\u2500".repeat(240) }),
        }) as unknown as Widget,
        new StatusBar({ state: IDLE_STATUS }) as unknown as Widget,
        new SizedBox({
          height: 1,
          child: new Text({ data: "\u2500".repeat(240) }),
        }) as unknown as Widget,

        // Approval widget
        new ApprovalWidget({
          request,
          onRespond: (_toolUseId, response) => {
            let decision: string;
            if (response.approved) {
              const scope = response.scope ?? "once";
              decision = `APPROVED (scope: ${scope})`;
            } else if (response.feedback) {
              decision = `DENIED with feedback: "${response.feedback}"`;
            } else {
              decision = "DENIED";
            }
            this.setState(() => {
              this.approvalLog.push(
                `${request.toolName} (${request.toolUseId}): ${decision}`,
              );
              this.approvalIndex = (this.approvalIndex + 1) % MOCK_APPROVALS.length;
            });
          },
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new ApprovalDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      // q quits — but NOT when the approval widget needs keys
      // The approval widget handles its own keys through the widget tree
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        binding.stop();
        return true;
      }
      return false;
    });
  },
});
