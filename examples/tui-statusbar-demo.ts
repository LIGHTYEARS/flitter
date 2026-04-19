/**
 * TUI StatusBar Demo — cycles through all 9 status bar states.
 *
 * The status bar automatically cycles every 2 seconds through: idle, waiting
 * for response, streaming, running tools (1 and 3), waiting for approval,
 * compacting, context 80% warning, and context 90% danger.
 *
 * Run: bun run examples/tui-statusbar-demo.ts
 * Keys: q quit (auto-cycles through states)
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

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);
const YELLOW_FG = Color.yellow();
const DIM_FG = Color.rgb(0x56, 0x5f, 0x89);
const ACTIVE_MODE_FG = Color.rgb(0x7a, 0xa2, 0xf7);

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
//  Root Widget
// ════════════════════════════════════════════════════

class StatusBarDemo extends StatefulWidget {
  createState(): State {
    return new StatusBarDemoState();
  }
}

class StatusBarDemoState extends State<StatusBarDemo> {
  private statusIndex = 0;
  private statusTimer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    super.initState();
    this.statusTimer = setInterval(() => {
      this.setState(() => {
        this.statusIndex = (this.statusIndex + 1) % STATUS_SCENARIOS.length;
      });
    }, 2000);
  }

  dispose(): void {
    if (this.statusTimer) clearInterval(this.statusTimer);
    super.dispose();
  }

  build(_context: BuildContext): WidgetInterface {
    const scenario = STATUS_SCENARIOS[this.statusIndex];

    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter StatusBar Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Auto-cycles every 2s through all states | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // State info
        new RichText({
          text: new TextSpan({
            text: " StatusBar State Cycling Demo",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
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

        // All scenario names with indicator
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

        // Separator + status bar
        new SizedBox({ height: 2 }) as unknown as Widget,
        new SizedBox({
          height: 1,
          child: new Text({ data: "\u2500".repeat(240) }),
        }) as unknown as Widget,
        new StatusBar({ state: scenario.state }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new StatusBarDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        binding.stop();
        return true;
      }
      return false;
    });
  },
});
