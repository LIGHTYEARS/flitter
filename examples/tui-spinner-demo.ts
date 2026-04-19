/**
 * TUI Spinner Demo — animated Game-of-Life cellular automaton in braille.
 *
 * Shows the BrailleSpinner widget animating at 200ms intervals. The 8-cell
 * automaton uses survival/birth rules mapped to Unicode braille characters.
 * Re-seeds automatically on stagnation, oscillation, or extinction.
 *
 * Run: bun run examples/tui-spinner-demo.ts
 * Keys: s manual step | r re-seed | q quit
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
import { BrailleSpinner } from "../packages/tui/src/widgets/braille-spinner.js";

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
const SUCCESS_COLOR = Color.rgb(0x9e, 0xce, 0x6a);
const DENY_COLOR = Color.rgb(0xf7, 0x76, 0x8e);

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class SpinnerDemo extends StatefulWidget {
  createState(): State {
    return new SpinnerDemoState();
  }
}

class SpinnerDemoState extends State<SpinnerDemo> {
  spinner = new BrailleSpinner();
  private spinnerTimer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    super.initState();
    this.spinnerTimer = setInterval(() => {
      this.setState(() => {
        this.spinner.step();
      });
    }, 200);
  }

  dispose(): void {
    if (this.spinnerTimer) clearInterval(this.spinnerTimer);
    super.dispose();
  }

  build(_context: BuildContext): WidgetInterface {
    const brailleChar = this.spinner.toBraille();
    const liveCount = this.spinner.state.filter((v) => v).length;
    const gen = this.spinner.generation;
    const cellDisplay = this.spinner.state.map((v) => (v ? "\u25cf" : "\u25cb")).join(" ");

    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter BrailleSpinner Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " s manual step | r re-seed | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Spinner info
        new RichText({
          text: new TextSpan({
            text: " BrailleSpinner \u2014 Cellular Automaton Demo",
            style: new TextStyle({ foreground: YELLOW_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Auto-animating at 200ms. Keys: s = manual step, r = re-seed",
            style: new TextStyle({ foreground: HINT_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Large braille character display
        new RichText({
          text: new TextSpan({
            text: `   Braille:  ${brailleChar}`,
            style: new TextStyle({ foreground: ACTIVE_MODE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Cell grid visualization
        new RichText({
          text: new TextSpan({
            text: `   Cells:    ${cellDisplay}`,
            style: new TextStyle({ foreground: FOREGROUND_COLOR }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: `   Live:     ${liveCount}/8`,
            style: new TextStyle({ foreground: liveCount >= 3 ? SUCCESS_COLOR : DENY_COLOR }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: `   Gen:      ${gen}/${this.spinner.maxGenerations}`,
            style: new TextStyle({ foreground: DIM_FG }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Rules explanation
        new RichText({
          text: new TextSpan({
            text: "   Rules: survive=2-3 neighbors, born=3 or 6 neighbors",
            style: new TextStyle({ foreground: DIM_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: "   Re-seeds on stagnation, oscillation, or all dead",
            style: new TextStyle({ foreground: DIM_FG, dim: true }),
          }),
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: SpinnerDemoState | null = null;

const originalCreateState = SpinnerDemo.prototype.createState;
SpinnerDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as SpinnerDemoState;
  demoState = state;
  return state;
};

await runApp(new SpinnerDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (!demoState) return false;

      // s: manual step
      if (event.key === "s" && !event.modifiers.ctrl && !event.modifiers.alt) {
        (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
          demoState!.spinner.step();
        });
        return true;
      }

      // r: re-seed
      if (event.key === "r" && !event.modifiers.ctrl && !event.modifiers.alt) {
        const sp = demoState.spinner;
        (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
          sp.generation = sp.maxGenerations;
          sp.step();
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
