/**
 * TUI Diff Demo — color-coded unified diff renderer with sample diffs.
 *
 * Displays unified diffs with syntax-colored additions, deletions, and context
 * lines. Press 'd' to cycle through 3 sample diffs: a simple one-line edit,
 * a multi-line addition, and a deletion with replacement.
 *
 * Run: bun run examples/tui-diff-demo.ts
 * Keys: d cycle diffs | q quit
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
import { buildDiffWidget, generateSimpleDiff } from "../packages/cli/src/widgets/diff-widget.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);
const YELLOW_FG = Color.yellow();

const SAMPLE_DIFFS = [
  // Diff 1: Simple one-line edit
  generateSimpleDiff(
    'function calc(a: number, b: number) {\n  return a + b;\n}\n',
    'function calc(a: number, b: number) {\n  return a * b;\n}\n',
    "src/math.ts",
  ),
  // Diff 2: Multi-line addition
  [
    "--- a/src/config.ts",
    "+++ b/src/config.ts",
    "@@ -1,4 +1,10 @@",
    " export const config = {",
    "   debug: false,",
    "+  logLevel: 'info',",
    "+  retryAttempts: 3,",
    "+  retryBackoff: 'exponential',",
    "+  timeout: 30_000,",
    "+  cache: {",
    "+    enabled: true,",
    "+    ttl: 300,",
    "+  },",
    "   apiUrl: 'https://api.example.com',",
    " };",
  ].join("\n"),
  // Diff 3: Deletion
  [
    "--- a/src/legacy.ts",
    "+++ b/src/legacy.ts",
    "@@ -1,8 +1,3 @@",
    " import { newApi } from './api';",
    "-import { oldHelper } from './deprecated';",
    "-import { legacyTransform } from './compat';",
    " ",
    "-// TODO: remove after migration",
    "-const adapter = legacyTransform(oldHelper);",
    "-",
    " export function getData() {",
    "-  return adapter.fetch();",
    "+  return newApi.fetch();",
    " }",
  ].join("\n"),
];

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class DiffDemo extends StatefulWidget {
  createState(): State {
    return new DiffDemoState();
  }
}

class DiffDemoState extends State<DiffDemo> {
  diffIndex = 0;

  build(_context: BuildContext): WidgetInterface {
    const currentDiff = SAMPLE_DIFFS[this.diffIndex];
    const diffWidget = buildDiffWidget(currentDiff);

    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter DiffWidget Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " d cycle diffs | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Diff info
        new RichText({
          text: new TextSpan({
            text: " DiffWidget \u2014 Color-Coded Diff Renderer",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: ` Press d to cycle diffs. Showing ${this.diffIndex + 1} of ${SAMPLE_DIFFS.length}`,
            style: new TextStyle({ foreground: HINT_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // The actual diff widget
        diffWidget as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: DiffDemoState | null = null;

const originalCreateState = DiffDemo.prototype.createState;
DiffDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as DiffDemoState;
  demoState = state;
  return state;
};

await runApp(new DiffDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (!demoState) return false;

      // d: next diff
      if (event.key === "d" && !event.modifiers.ctrl && !event.modifiers.alt) {
        (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
          demoState!.diffIndex = (demoState!.diffIndex + 1) % SAMPLE_DIFFS.length;
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
