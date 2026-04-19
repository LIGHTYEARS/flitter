/**
 * TUI Overlay Demo — interactive OverlayState & OverlayEntry showcase.
 *
 * Demonstrates the overlay system live: add/remove overlay layers with
 * keyboard shortcuts, see stacking order, and inspect entry lifecycle
 * (mounted, maintainState, entryCount).
 *
 * Run: bun run examples/tui-overlay-demo.ts
 * Keys: 1-4 toggle layers | r remove top | c clear all | q quit
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { Widget } from "../packages/tui/src/tree/widget.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { Center } from "../packages/tui/src/widgets/center.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { OverlayEntry } from "../packages/tui/src/overlay/overlay-entry.js";
import { OverlayState } from "../packages/tui/src/overlay/overlay.js";
import { Stack } from "../packages/tui/src/widgets/stack.js";
import { Positioned } from "../packages/tui/src/widgets/stack.js";

// ════════════════════════════════════════════════════
//  Layer definitions
// ════════════════════════════════════════════════════

interface LayerDef {
  key: string;
  label: string;
  color: Color;
  borderColor: Color;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  maintainState: boolean;
}

const LAYERS: LayerDef[] = [
  {
    key: "1",
    label: "Layer 1 — Notification",
    color: Color.rgb(25, 50, 80),
    borderColor: Color.cyan(),
    offsetX: 4,
    offsetY: 2,
    width: 40,
    height: 5,
    maintainState: false,
  },
  {
    key: "2",
    label: "Layer 2 — Dialog",
    color: Color.rgb(60, 25, 50),
    borderColor: Color.magenta(),
    offsetX: 10,
    offsetY: 4,
    width: 40,
    height: 5,
    maintainState: true,
  },
  {
    key: "3",
    label: "Layer 3 — Tooltip",
    color: Color.rgb(25, 60, 30),
    borderColor: Color.green(),
    offsetX: 16,
    offsetY: 6,
    width: 40,
    height: 5,
    maintainState: false,
  },
  {
    key: "4",
    label: "Layer 4 — Alert",
    color: Color.rgb(70, 40, 15),
    borderColor: Color.yellow(),
    offsetX: 22,
    offsetY: 8,
    width: 40,
    height: 5,
    maintainState: true,
  },
];

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class OverlayDemo extends StatefulWidget {
  createState(): State {
    return new OverlayDemoState();
  }
}

class OverlayDemoState extends State<OverlayDemo> {
  private overlayState!: OverlayState;
  private entries: Record<string, OverlayEntry> = {};
  private lastAction = "Press 1-4 to toggle overlay layers";
  private actionCount = 0;

  initState(): void {
    super.initState();
    this.overlayState = new OverlayState((fn) => {
      this.setState(() => fn?.());
    });
  }

  /** Toggle a layer on/off by its key ("1"-"4") */
  toggleLayer(key: string): void {
    if (this.entries[key]) {
      this.removeLayer(key);
    } else {
      this.addLayer(key);
    }
  }

  /** Add a layer */
  addLayer(key: string): void {
    const def = LAYERS.find((l) => l.key === key);
    if (!def || this.entries[key]) return;

    const entry = new OverlayEntry({
      builder: () =>
        new Container({
          width: def.width,
          height: def.height,
          decoration: new BoxDecoration({
            color: def.color,
            border: Border.all(new BorderSide(def.borderColor, 1, "rounded")),
          }),
          child: new Center({
            child: new Column({
              children: [
                new Text({
                  data: def.label,
                  style: new TextStyle({ foreground: def.borderColor, bold: true }),
                }) as unknown as Widget,
                new Text({
                  data: `maintainState: ${def.maintainState}`,
                  style: new TextStyle({ foreground: Color.brightBlack() }),
                }) as unknown as Widget,
                new Text({
                  data: `Press '${key}' to remove`,
                  style: new TextStyle({ foreground: Color.rgb(140, 140, 160) }),
                }) as unknown as Widget,
              ],
            }),
          }),
        }) as unknown as Widget,
      maintainState: def.maintainState,
    });

    this.setState(() => {
      this.overlayState.insert(entry);
      this.entries[key] = entry;
      this.actionCount++;
      this.lastAction = `[${this.actionCount}] Added ${def.label}`;
    });
  }

  /** Remove a layer by key */
  removeLayer(key: string): void {
    const entry = this.entries[key];
    const def = LAYERS.find((l) => l.key === key);
    if (!entry || !def) return;

    this.setState(() => {
      this.overlayState.remove(entry);
      delete this.entries[key];
      this.actionCount++;
      this.lastAction = `[${this.actionCount}] Removed ${def.label}`;
    });
  }

  /** Remove the topmost layer */
  removeTop(): void {
    const allEntries = this.overlayState.entries;
    if (allEntries.length === 0) return;
    const top = allEntries[allEntries.length - 1];
    // Find the key for this entry
    for (const key of Object.keys(this.entries)) {
      if (this.entries[key] === top) {
        this.removeLayer(key);
        return;
      }
    }
  }

  /** Clear all layers */
  clearAll(): void {
    const keys = Object.keys(this.entries);
    if (keys.length === 0) return;
    this.setState(() => {
      for (const key of keys) {
        this.overlayState.remove(this.entries[key]);
      }
      this.entries = {};
      this.actionCount++;
      this.lastAction = `[${this.actionCount}] Cleared all layers`;
    });
  }

  build(_context: BuildContext): WidgetInterface {
    // Build overlay widgets from OverlayState
    const overlayWidgets = this.overlayState.buildEntries();

    // Status info about each layer
    const layerStatusRows = LAYERS.map((def) => {
      const entry = this.entries[def.key];
      const active = !!entry;
      const mounted = entry?.mounted ?? false;
      const indicator = active ? "[ON] " : "[  ] ";
      const statusText = active
        ? `mounted:${mounted} maintainState:${def.maintainState}`
        : "not inserted";

      return new Row({
        children: [
          new Text({
            data: `  ${indicator}`,
            style: new TextStyle({
              foreground: active ? def.borderColor : Color.brightBlack(),
              bold: active,
            }),
          }) as unknown as Widget,
          new Text({
            data: `${def.key}: ${def.label.padEnd(24)}`,
            style: new TextStyle({
              foreground: active ? Color.white() : Color.brightBlack(),
            }),
          }) as unknown as Widget,
          new Text({
            data: statusText,
            style: new TextStyle({
              foreground: active ? Color.green() : Color.rgb(80, 80, 80),
            }),
          }) as unknown as Widget,
        ],
      }) as unknown as Widget;
    });

    // Build the positioned overlay entries for the Stack
    const positionedOverlays = overlayWidgets.map((widget, i) => {
      // Find which layer this corresponds to by order in entries map
      const activeKeys = Object.keys(this.entries);
      const key = activeKeys[i];
      const def = LAYERS.find((l) => l.key === key);
      if (!def) {
        return new Positioned({
          top: 2,
          left: 4,
          child: widget as unknown as WidgetInterface,
        }) as unknown as Widget;
      }
      return new Positioned({
        top: def.offsetY,
        left: def.offsetX,
        child: widget as unknown as WidgetInterface,
      }) as unknown as Widget;
    });

    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new Text({
            data: " Flitter TUI Overlay Demo — OverlayState & OverlayEntry",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Controls
        new Text({
          data: "  1-4 Toggle layers | r Remove top | c Clear all | q Quit",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Last action
        new Row({
          children: [
            new Text({
              data: "  Last: ",
              style: new TextStyle({ foreground: Color.white(), bold: true }),
            }) as unknown as Widget,
            new Text({
              data: this.lastAction,
              style: new TextStyle({ foreground: Color.brightCyan() }),
            }) as unknown as Widget,
          ],
        }) as unknown as Widget,

        // OverlayState stats
        new Row({
          children: [
            new Text({
              data: `  entryCount: ${this.overlayState.entryCount}`,
              style: new TextStyle({ foreground: Color.yellow() }),
            }) as unknown as Widget,
            new Text({
              data: `    Stacking order (bottom to top): [${Object.keys(this.entries).join(", ") || "empty"}]`,
              style: new TextStyle({ foreground: Color.rgb(140, 140, 160) }),
            }) as unknown as Widget,
          ],
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Layer status table
        new Text({
          data: "  Layer Status:",
          style: new TextStyle({ foreground: Color.white(), bold: true }),
        }) as unknown as Widget,
        ...layerStatusRows,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Overlay display area
        new Expanded({
          child: new Stack({
            children: [
              // Background — simulated app content
              new Container({
                decoration: new BoxDecoration({
                  color: Color.rgb(20, 20, 30),
                  border: Border.all(new BorderSide(Color.brightBlack(), 1, "solid")),
                }),
                child: new Column({
                  children: [
                    new SizedBox({ height: 1 }) as unknown as Widget,
                    new Text({
                      data: "    Application Content (overlays render on top)",
                      style: new TextStyle({ foreground: Color.brightBlack() }),
                    }) as unknown as Widget,
                    new Text({
                      data: "    This area simulates the main app behind overlays.",
                      style: new TextStyle({ foreground: Color.rgb(60, 60, 80) }),
                    }) as unknown as Widget,
                    new Text({
                      data: "    Each overlay layer stacks above previous ones.",
                      style: new TextStyle({ foreground: Color.rgb(60, 60, 80) }),
                    }) as unknown as Widget,
                  ],
                }),
              }) as unknown as Widget,

              // Overlay entries as positioned children
              ...positionedOverlays,
            ],
          }),
        }) as unknown as Widget,

        // Footer
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
          child: new Text({
            data: " OverlayState manages insert/remove lifecycle | OverlayEntry wraps lazy widget builders",
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

let demoState: OverlayDemoState | null = null;

const originalCreateState = OverlayDemo.prototype.createState;
OverlayDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as OverlayDemoState;
  demoState = state;
  return state;
};

await runApp(new OverlayDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (!demoState) return false;

      // No modifiers for these keys
      if (event.modifiers.ctrl || event.modifiers.alt) return false;

      switch (event.key) {
        case "1":
        case "2":
        case "3":
        case "4":
          demoState.toggleLayer(event.key);
          return true;
        case "r":
          demoState.removeTop();
          return true;
        case "c":
          demoState.clearAll();
          return true;
        case "q":
          binding.stop();
          return true;
        default:
          return false;
      }
    });
  },
});
