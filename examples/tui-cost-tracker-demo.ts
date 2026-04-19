/**
 * TUI Cost Tracker Demo — simulated SessionCostTracker with live USD estimation.
 *
 * Shows how the SessionCostTracker accumulates token usage across inference
 * turns and estimates USD cost. Press 'i' to simulate an inference turn with
 * random token counts (using random model pricing), 'c' to clear/reset.
 *
 * Run: bun run examples/tui-cost-tracker-demo.ts
 * Keys: i simulate turn | c clear | q quit
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
import { SessionCostTracker } from "../packages/agent-core/src/cost/session-cost-tracker.js";
import type { AgentEvent } from "../packages/agent-core/src/worker/events.js";
import { Subject } from "../packages/util/src/reactive/subject.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);
const YELLOW_FG = Color.yellow();
const DIM_FG = Color.rgb(0x56, 0x5f, 0x89);
const ACTIVE_MODE_FG = Color.rgb(0x7a, 0xa2, 0xf7);
const FOREGROUND_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);

const COST_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-opus-4-6",
  "claude-haiku-4-5-20251001",
];

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class CostTrackerDemo extends StatefulWidget {
  createState(): State {
    return new CostTrackerDemoState();
  }
}

class CostTrackerDemoState extends State<CostTrackerDemo> {
  costEvents$ = new Subject<AgentEvent>();
  costTracker = new SessionCostTracker(this.costEvents$);
  costTurnCount = 0;

  dispose(): void {
    this.costTracker.dispose();
    super.dispose();
  }

  build(_context: BuildContext): WidgetInterface {
    const totals = this.costTracker.getTotals();
    const costStr = totals.estimatedUSD !== null
      ? `$${totals.estimatedUSD.toFixed(4)}`
      : "unknown model";

    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter SessionCostTracker Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " i simulate turn | c clear | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Cost info
        new RichText({
          text: new TextSpan({
            text: " SessionCostTracker \u2014 Token Usage Accumulator",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Press i = simulate inference turn, c = clear/reset",
            style: new TextStyle({ foreground: HINT_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Token totals
        new RichText({
          text: new TextSpan({
            text: `   Input tokens:       ${totals.inputTokens.toLocaleString()}`,
            style: new TextStyle({ foreground: FOREGROUND_COLOR }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: `   Output tokens:      ${totals.outputTokens.toLocaleString()}`,
            style: new TextStyle({ foreground: FOREGROUND_COLOR }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: `   Cache write tokens: ${totals.cacheCreationInputTokens.toLocaleString()}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: `   Cache read tokens:  ${totals.cacheReadInputTokens.toLocaleString()}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: `   Estimated cost:     ${costStr}`,
            style: new TextStyle({ foreground: ACTIVE_MODE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: `   Inference turns:    ${this.costTurnCount}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: CostTrackerDemoState | null = null;

const originalCreateState = CostTrackerDemo.prototype.createState;
CostTrackerDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as CostTrackerDemoState;
  demoState = state;
  return state;
};

await runApp(new CostTrackerDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (!demoState) return false;

      // i: simulate inference turn
      if (event.key === "i" && !event.modifiers.ctrl && !event.modifiers.alt) {
        const model = COST_MODELS[Math.floor(Math.random() * COST_MODELS.length)];
        demoState.costEvents$.next({
          type: "inference:complete",
          usage: {
            inputTokens: 2000 + Math.floor(Math.random() * 8000),
            outputTokens: 200 + Math.floor(Math.random() * 2000),
            cacheCreationInputTokens: Math.floor(Math.random() * 500),
            cacheReadInputTokens: Math.floor(Math.random() * 5000),
          },
          model,
        });
        (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
          demoState!.costTurnCount++;
        });
        return true;
      }

      // c: clear/reset
      if (event.key === "c" && !event.modifiers.ctrl && !event.modifiers.alt) {
        (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
          demoState!.costTracker.dispose();
          demoState!.costEvents$ = new Subject<AgentEvent>();
          demoState!.costTracker = new SessionCostTracker(demoState!.costEvents$);
          demoState!.costTurnCount = 0;
        });
        return true;
      }

      // q: quit
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        binding.stop();
        return true;
      }

      return false;
    });
  },
});
