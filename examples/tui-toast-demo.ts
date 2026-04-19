/**
 * TUI Toast Demo — fire success/error/info toast notifications.
 *
 * Press 't' to fire a toast notification. Toasts appear at the top of the
 * screen and auto-dismiss after 3 seconds. Cycles through success, error,
 * and info toast types with rotating messages.
 *
 * Run: bun run examples/tui-toast-demo.ts
 * Keys: t fire toast | q quit
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
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Stack } from "../packages/tui/src/widgets/stack.js";
import { Positioned } from "../packages/tui/src/widgets/stack.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { ToastManager } from "../packages/cli/src/widgets/toast-manager.js";
import { ToastOverlay } from "../packages/cli/src/widgets/toast-overlay.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);
const YELLOW_FG = Color.yellow();
const DIM_FG = Color.rgb(0x56, 0x5f, 0x89);

const TOAST_TYPES = ["success", "error", "info"] as const;
const TOAST_MESSAGES = [
  "Operation completed successfully",
  "Failed to connect to API server",
  "Context window is 80% full",
  "File saved: src/app.ts",
  "Tests passed: 12/12",
  "Rate limit warning: 50 req/min",
];

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class ToastDemo extends StatefulWidget {
  createState(): State {
    return new ToastDemoState();
  }
}

class ToastDemoState extends State<ToastDemo> {
  toastManager = new ToastManager();
  toastCount = 0;

  build(_context: BuildContext): WidgetInterface {
    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter ToastOverlay Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Press t to fire toast | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Content with toast overlay
        new Expanded({
          child: new Stack({
            children: [
              new Column({
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
              }) as unknown as Widget,
              new Positioned({
                top: 0,
                left: 0,
                right: 0,
                child: new ToastOverlay({ manager: this.toastManager }),
              }) as unknown as Widget,
            ],
          }),
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: ToastDemoState | null = null;

const originalCreateState = ToastDemo.prototype.createState;
ToastDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as ToastDemoState;
  demoState = state;
  return state;
};

await runApp(new ToastDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (!demoState) return false;

      if (event.key === "t" && !event.modifiers.ctrl && !event.modifiers.alt) {
        const type = TOAST_TYPES[demoState.toastCount % 3];
        const msg = TOAST_MESSAGES[demoState.toastCount % TOAST_MESSAGES.length];
        demoState.toastManager.show(msg, type);
        (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
          demoState!.toastCount++;
        });
        return true;
      }

      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        binding.stop();
        return true;
      }

      return false;
    });
  },
});
