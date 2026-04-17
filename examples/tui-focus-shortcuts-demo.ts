/**
 * TUI Focus + Shortcuts Demo — Tab traversal & Actions/Shortcuts showcase.
 *
 * Demonstrates the Focus system with Tab/Shift+Tab traversal, the
 * Actions/Shortcuts binding system, and custom Intent/Action pairs.
 *
 * - 4 focusable panels in a 2x2 grid
 * - Tab / Shift+Tab to cycle focus between panels
 * - Space to increment the focused panel's counter
 * - 1-4 to jump focus directly to a panel
 * - q to quit
 *
 * Run: bun run examples/tui-focus-shortcuts-demo.ts
 * Press q to quit.
 *
 * @module
 */

import { Action } from "../packages/tui/src/actions/action.js";
import { Actions } from "../packages/tui/src/actions/actions.js";
import { Intent } from "../packages/tui/src/actions/intent.js";
import { KeyActivator } from "../packages/tui/src/actions/key-activator.js";
import { Shortcuts } from "../packages/tui/src/actions/shortcuts.js";
import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { FocusNode } from "../packages/tui/src/focus/focus-node.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Center } from "../packages/tui/src/widgets/center.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Focus } from "../packages/tui/src/widgets/focus.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";

// ════════════════════════════════════════════════════
//  Custom Intents & Actions
// ════════════════════════════════════════════════════

class IncrementIntent extends Intent {}

class JumpToPanelIntent extends Intent {
  constructor(public readonly panelIndex: number) {
    super();
  }
}

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class FocusShortcutsDemo extends StatefulWidget {
  createState(): State {
    return new FocusShortcutsDemoState();
  }
}

const PANEL_COLORS: Color[] = [
  Color.rgb(40, 80, 120),  // blue
  Color.rgb(80, 40, 100),  // purple
  Color.rgb(40, 100, 60),  // green
  Color.rgb(120, 60, 40),  // orange
];

const PANEL_LABELS = ["Panel 1", "Panel 2", "Panel 3", "Panel 4"];

class FocusShortcutsDemoState extends State<FocusShortcutsDemo> {
  private counters = [0, 0, 0, 0];
  private focusedPanel = -1;
  private focusNodes: FocusNode[] = [];

  override initState(): void {
    super.initState();
    for (let i = 0; i < 4; i++) {
      this.focusNodes.push(
        new FocusNode({ debugLabel: `panel-${i + 1}` }),
      );
    }
  }

  override dispose(): void {
    for (const node of this.focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  private _buildPanel(index: number): Widget {
    const isFocused = this.focusedPanel === index;
    const counter = this.counters[index] ?? 0;
    const bgColor = PANEL_COLORS[index] ?? Color.rgb(60, 60, 60);
    const label = PANEL_LABELS[index] ?? `Panel ${index + 1}`;

    const borderColor = isFocused ? Color.brightWhite() : Color.rgb(80, 80, 80);
    const borderStyle = isFocused ? "solid" : "rounded";

    // IncrementAction for this panel — closures over index
    const incrementAction = new (class extends Action<IncrementIntent> {
      constructor(private state: FocusShortcutsDemoState, private idx: number) {
        super();
      }
      invoke(_intent: IncrementIntent): "handled" {
        this.state.setState(() => {
          this.state.counters[this.idx] = (this.state.counters[this.idx] ?? 0) + 1;
        });
        return "handled";
      }
    })(this, index);

    return new Expanded({
      child: new Actions({
        actions: new Map([[IncrementIntent, incrementAction]]),
        child: new Shortcuts({
          shortcuts: new Map([
            [KeyActivator.key(" "), new IncrementIntent()],
          ]),
          focusNode: this.focusNodes[index],
          child: new Focus({
            focusNode: this.focusNodes[index],
            autofocus: index === 0,
            onFocusChange: (hasFocus: boolean) => {
              this.setState(() => {
                if (hasFocus) {
                  this.focusedPanel = index;
                } else if (this.focusedPanel === index) {
                  this.focusedPanel = -1;
                }
              });
            },
            child: new Container({
              decoration: new BoxDecoration({
                color: isFocused ? bgColor : Color.rgb(30, 30, 30),
                border: Border.all(new BorderSide(borderColor, 1, borderStyle as "solid" | "rounded")),
              }),
              padding: EdgeInsets.all(1),
              child: new Column({
                children: [
                  new Text({
                    data: isFocused ? `> ${label} <` : `  ${label}  `,
                    style: new TextStyle({
                      foreground: isFocused ? Color.brightWhite() : Color.rgb(140, 140, 140),
                      bold: isFocused,
                    }),
                  }) as unknown as Widget,

                  new SizedBox({ height: 1 }) as unknown as Widget,

                  new Center({
                    child: new Text({
                      data: `Count: ${counter}`,
                      style: new TextStyle({
                        foreground: isFocused ? Color.brightCyan() : Color.rgb(100, 100, 100),
                        bold: true,
                      }),
                    }),
                  }) as unknown as Widget,

                  new SizedBox({ height: 1 }) as unknown as Widget,

                  new Text({
                    data: isFocused ? "Press Space +1" : "",
                    style: new TextStyle({
                      foreground: Color.rgb(100, 100, 100),
                      dim: true,
                    }),
                  }) as unknown as Widget,
                ],
              }),
            }),
          }),
        }),
      }),
    }) as unknown as Widget;
  }

  build(_context: BuildContext): WidgetInterface {
    const focusedLabel =
      this.focusedPanel >= 0 ? PANEL_LABELS[this.focusedPanel] : "None";

    return new Column({
      children: [
        // Title bar
        new Container({
          width: 80,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new Text({
            data: " Flitter Focus + Shortcuts Demo",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Instructions
        new Text({
          data: "  Tab/Shift+Tab  Navigate panels  |  Space  Increment counter",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,
        new Text({
          data: "  1-4            Jump to panel     |  q      Quit",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Status bar
        new Text({
          data: `  Focused: ${focusedLabel}`,
          style: new TextStyle({ foreground: Color.yellow(), bold: true }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // 2x2 grid of panels
        new Expanded({
          child: new Column({
            children: [
              // Top row
              new Expanded({
                child: new Row({
                  children: [
                    this._buildPanel(0),
                    new SizedBox({ width: 1 }) as unknown as Widget,
                    this._buildPanel(1),
                  ],
                }),
              }) as unknown as Widget,

              new SizedBox({ height: 1 }) as unknown as Widget,

              // Bottom row
              new Expanded({
                child: new Row({
                  children: [
                    this._buildPanel(2),
                    new SizedBox({ width: 1 }) as unknown as Widget,
                    this._buildPanel(3),
                  ],
                }),
              }) as unknown as Widget,
            ],
          }),
        }) as unknown as Widget,

        // Footer
        new Container({
          width: 80,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
          child: new Text({
            data: " Focus system: Tab traversal + Actions/Shortcuts + FocusNode",
            style: new TextStyle({ dim: true }),
          }),
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

let demoState: FocusShortcutsDemoState | null = null;

const originalCreateState = FocusShortcutsDemo.prototype.createState;
FocusShortcutsDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as FocusShortcutsDemoState;
  demoState = state;
  return state;
};

await runApp(new FocusShortcutsDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;

    binding.addKeyInterceptor((event) => {
      // q to quit
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        binding.stop();
        return true;
      }

      // 1-4 to jump focus to specific panel
      const panelNum = Number.parseInt(event.key, 10);
      if (panelNum >= 1 && panelNum <= 4 && demoState) {
        const nodes = (demoState as unknown as { focusNodes: FocusNode[] }).focusNodes;
        const node = nodes[panelNum - 1];
        if (node) {
          node.requestFocus();
          return true;
        }
      }

      return false;
    });
  },
});
