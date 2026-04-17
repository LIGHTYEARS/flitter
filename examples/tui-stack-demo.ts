/**
 * TUI Stack + Positioned Demo — layered layout showcase.
 *
 * Demonstrates Stack with Positioned children, 9-way alignment,
 * z-ordering (later children on top), and interactive position control.
 *
 * - Stack fills the terminal with a background pattern
 * - Floating "badge" panel movable with arrow keys
 * - 1-9 to switch Stack alignment (topLeft, topCenter, ..., bottomRight)
 * - Several fixed Positioned panels showing z-ordering
 *
 * Run: bun run examples/tui-stack-demo.ts
 * Press q to quit.
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Positioned, Stack, type StackAlignment } from "../packages/tui/src/widgets/stack.js";
import { Text } from "../packages/tui/src/widgets/text.js";

// ════════════════════════════════════════════════════
//  Alignment options
// ════════════════════════════════════════════════════

const ALIGNMENTS: StackAlignment[] = [
  "topLeft",
  "topCenter",
  "topRight",
  "centerLeft",
  "center",
  "centerRight",
  "bottomLeft",
  "bottomCenter",
  "bottomRight",
];

const ALIGNMENT_LABELS = [
  "1:TopLeft",
  "2:TopCenter",
  "3:TopRight",
  "4:CenterLeft",
  "5:Center",
  "6:CenterRight",
  "7:BottomLeft",
  "8:BottomCenter",
  "9:BottomRight",
];

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class StackDemo extends StatefulWidget {
  createState(): State {
    return new StackDemoState();
  }
}

class StackDemoState extends State<StackDemo> {
  private alignmentIndex = 0; // topLeft
  private badgeLeft = 10;
  private badgeTop = 5;

  build(_context: BuildContext): WidgetInterface {
    const alignment = ALIGNMENTS[this.alignmentIndex] ?? "topLeft";
    const alignmentLabel = ALIGNMENT_LABELS[this.alignmentIndex] ?? "topLeft";

    // ── Background pattern (non-positioned, fills via alignment) ──
    const bgRows: Widget[] = [];
    for (let row = 0; row < 20; row++) {
      const char = row % 2 === 0 ? "·" : "∘";
      bgRows.push(
        new Text({
          data: char.repeat(78),
          style: new TextStyle({ foreground: Color.rgb(40, 40, 50) }),
        }) as unknown as Widget,
      );
    }
    const background = new Container({
      width: 78,
      height: 20,
      decoration: new BoxDecoration({ color: Color.rgb(20, 20, 25) }),
      child: new Column({ children: bgRows }),
    }) as unknown as Widget;

    // ── Positioned panel: top-left info box (z-index: 1st) ──
    const infoPanel = new Positioned({
      left: 1,
      top: 0,
      child: new Container({
        width: 28,
        height: 5,
        decoration: new BoxDecoration({ color: Color.rgb(40, 30, 60) }),
        padding: EdgeInsets.all(1),
        child: new Column({
          children: [
            new Text({
              data: "Stack Info",
              style: new TextStyle({ foreground: Color.brightMagenta(), bold: true }),
            }) as unknown as Widget,
            new Text({
              data: `Alignment: ${alignment}`,
              style: new TextStyle({ foreground: Color.rgb(180, 180, 180) }),
            }) as unknown as Widget,
            new Text({
              data: `Children: 5 layers`,
              style: new TextStyle({ foreground: Color.rgb(140, 140, 140) }),
            }) as unknown as Widget,
          ],
        }),
      }) as unknown as Widget,
    }) as unknown as Widget;

    // ── Positioned panel: bottom-right status (z-index: 2nd) ──
    const statusPanel = new Positioned({
      right: 1,
      bottom: 0,
      child: new Container({
        width: 24,
        height: 3,
        decoration: new BoxDecoration({ color: Color.rgb(30, 50, 30) }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Column({
          children: [
            new Text({
              data: "Badge Position",
              style: new TextStyle({ foreground: Color.green(), bold: true }),
            }) as unknown as Widget,
            new Text({
              data: `left:${this.badgeLeft} top:${this.badgeTop}`,
              style: new TextStyle({ foreground: Color.rgb(160, 220, 160) }),
            }) as unknown as Widget,
          ],
        }),
      }) as unknown as Widget,
    }) as unknown as Widget;

    // ── Positioned panel: center decoration (z-index: 3rd) ──
    const centerDecor = new Positioned({
      left: 30,
      top: 8,
      child: new Container({
        width: 18,
        height: 3,
        decoration: new BoxDecoration({ color: Color.rgb(50, 30, 30) }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Column({
          children: [
            new Text({
              data: "Z-Order: Layer 3",
              style: new TextStyle({ foreground: Color.rgb(255, 120, 120) }),
            }) as unknown as Widget,
            new Text({
              data: "(behind badge)",
              style: new TextStyle({ foreground: Color.rgb(140, 80, 80) }),
            }) as unknown as Widget,
          ],
        }),
      }) as unknown as Widget,
    }) as unknown as Widget;

    // ── Movable badge (z-index: 4th — on top) ──
    const badge = new Positioned({
      left: this.badgeLeft,
      top: this.badgeTop,
      child: new Container({
        width: 16,
        height: 3,
        decoration: new BoxDecoration({ color: Color.rgb(80, 60, 20) }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Column({
          children: [
            new Text({
              data: " Move Me! ",
              style: new TextStyle({ foreground: Color.brightYellow(), bold: true }),
            }) as unknown as Widget,
            new Text({
              data: " Arrow Keys ",
              style: new TextStyle({ foreground: Color.rgb(200, 180, 100) }),
            }) as unknown as Widget,
          ],
        }),
      }) as unknown as Widget,
    }) as unknown as Widget;

    // ── Stack assembly ──
    // Non-positioned child (background) + 4 Positioned overlays
    const stack = new Stack({
      alignment,
      children: [background, infoPanel, statusPanel, centerDecor, badge],
    });

    return new Column({
      children: [
        // Title bar
        new Container({
          width: 80,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new Text({
            data: " Flitter Stack + Positioned Demo",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Instructions
        new Text({
          data: "  Arrows  Move badge  |  1-9  Change alignment  |  q  Quit",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,

        // Alignment status
        new Text({
          data: `  Alignment: ${alignmentLabel}  |  Badge: (${this.badgeLeft}, ${this.badgeTop})`,
          style: new TextStyle({ foreground: Color.yellow(), bold: true }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Main stack area
        new Expanded({
          child: stack,
        }) as unknown as Widget,

        // Footer
        new Container({
          width: 80,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
          child: new Text({
            data: " Stack + Positioned | 9-way alignment | Z-ordering: later = on top",
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

let demoState: StackDemoState | null = null;

const originalCreateState = StackDemo.prototype.createState;
StackDemo.prototype.createState = function () {
  const state = originalCreateState.call(this) as StackDemoState;
  demoState = state;
  return state;
};

await runApp(new StackDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;

    binding.addKeyInterceptor((event) => {
      // q to quit
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        binding.stop();
        return true;
      }

      if (!demoState) return false;

      // Arrow keys to move badge
      if (event.key === "ArrowLeft") {
        (demoState as unknown as { badgeLeft: number; setState: (fn?: () => void) => void }).setState(() => {
          (demoState as unknown as { badgeLeft: number }).badgeLeft = Math.max(0, (demoState as unknown as { badgeLeft: number }).badgeLeft - 1);
        });
        return true;
      }
      if (event.key === "ArrowRight") {
        (demoState as unknown as { badgeLeft: number; setState: (fn?: () => void) => void }).setState(() => {
          (demoState as unknown as { badgeLeft: number }).badgeLeft = Math.min(62, (demoState as unknown as { badgeLeft: number }).badgeLeft + 1);
        });
        return true;
      }
      if (event.key === "ArrowUp") {
        (demoState as unknown as { badgeTop: number; setState: (fn?: () => void) => void }).setState(() => {
          (demoState as unknown as { badgeTop: number }).badgeTop = Math.max(0, (demoState as unknown as { badgeTop: number }).badgeTop - 1);
        });
        return true;
      }
      if (event.key === "ArrowDown") {
        (demoState as unknown as { badgeTop: number; setState: (fn?: () => void) => void }).setState(() => {
          (demoState as unknown as { badgeTop: number }).badgeTop = Math.min(17, (demoState as unknown as { badgeTop: number }).badgeTop + 1);
        });
        return true;
      }

      // 1-9 to change alignment
      const num = Number.parseInt(event.key, 10);
      if (num >= 1 && num <= 9) {
        (demoState as unknown as { alignmentIndex: number; setState: (fn?: () => void) => void }).setState(() => {
          (demoState as unknown as { alignmentIndex: number }).alignmentIndex = num - 1;
        });
        return true;
      }

      return false;
    });
  },
});
