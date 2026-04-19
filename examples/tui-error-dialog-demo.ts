/**
 * TUI Error Dialog Demo — modal error overlay with keyboard dismiss.
 *
 * Shows a mock API rate-limit error dialog. Press Enter or Escape to dismiss,
 * then press 'e' to show it again.
 *
 * Run: bun run examples/tui-error-dialog-demo.ts
 * Keys: Enter/Esc dismiss | e re-show | q quit
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
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { ErrorDialog } from "../packages/cli/src/widgets/error-dialog.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);
const YELLOW_FG = Color.yellow();

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class ErrorDialogDemo extends StatefulWidget {
  createState(): State {
    return new ErrorDialogDemoState();
  }
}

class ErrorDialogDemoState extends State<ErrorDialogDemo> {
  showErrorDialog = true;

  build(_context: BuildContext): WidgetInterface {
    if (this.showErrorDialog) {
      return new Column({
        children: [
          new Container({
            height: 1,
            decoration: new BoxDecoration({ color: TITLE_BG }),
            child: new Text({
              data: " Flitter ErrorDialog Demo  [ERROR DIALOG]",
              style: new TextStyle({ foreground: TITLE_FG, bold: true }),
            }),
          }) as unknown as Widget,
          new SizedBox({ height: 1 }) as unknown as Widget,
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
            }),
          }) as unknown as Widget,
        ],
      }) as unknown as WidgetInterface;
    }

    return new Column({
      children: [
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter ErrorDialog Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " e re-show dialog | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,
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
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: ErrorDialogDemoState | null = null;

const originalCreateState = ErrorDialogDemo.prototype.createState;
ErrorDialogDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as ErrorDialogDemoState;
  demoState = state;
  return state;
};

await runApp(new ErrorDialogDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (!demoState) return false;

      if (event.key === "e" && !event.modifiers.ctrl && !event.modifiers.alt) {
        if (!demoState.showErrorDialog) {
          (demoState as unknown as { setState: (fn: () => void) => void }).setState(() => {
            demoState!.showErrorDialog = true;
          });
          return true;
        }
      }

      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        if (!demoState.showErrorDialog) {
          binding.stop();
          return true;
        }
      }

      return false;
    });
  },
});
