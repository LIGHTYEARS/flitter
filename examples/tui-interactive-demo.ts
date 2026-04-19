/**
 * TUI Interactive Demo — MouseRegion & GestureDetector showcase.
 *
 * A live interactive demo that runs inside the terminal with mouse tracking.
 * Click on buttons, hover over regions, and press 'q' to quit.
 *
 * Run: bun run examples/tui-interactive-demo.ts
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import { State } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget as WidgetInterface, Element } from "../packages/tui/src/tree/element.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Padding } from "../packages/tui/src/widgets/padding.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { Center } from "../packages/tui/src/widgets/center.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { MouseRegion } from "../packages/tui/src/widgets/mouse-region.js";
import { GestureDetector } from "../packages/tui/src/widgets/gesture-detector.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";

// ════════════════════════════════════════════════════
//  Root Widget — StatefulWidget for reactive feedback
// ════════════════════════════════════════════════════

class InteractiveDemo extends StatefulWidget {
  createState(): State {
    return new InteractiveDemoState();
  }
}

class InteractiveDemoState extends State<InteractiveDemo> {
  private _lastEvent = "None yet — click or hover a button!";
  private _clickCounts: Record<string, number> = {};
  private _hoveredButton: string | null = null;

  build(_context: BuildContext): WidgetInterface {
    return new Column({
      children: [
        // Title
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new Text({
            data: " Flitter TUI Interactive Demo — MouseRegion & GestureDetector",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
        }) as unknown as WidgetInterface,

        // Spacer
        new SizedBox({ height: 1 }) as unknown as WidgetInterface,

        // Event log
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Text({
            data: `Last event: ${this._lastEvent}`,
            style: new TextStyle({ foreground: Color.brightWhite() }),
          }),
        }) as unknown as WidgetInterface,

        new SizedBox({ height: 1 }) as unknown as WidgetInterface,

        // Section 1: Mouse region buttons
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Text({
            data: "Mouse Region Buttons (click/hover enabled):",
            style: new TextStyle({ foreground: Color.yellow(), bold: true }),
          }),
        }) as unknown as WidgetInterface,

        new SizedBox({ height: 1 }) as unknown as WidgetInterface,

        // Button row
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Row({
            children: [
              this._makeButton("Click Me", Color.blue()),
              new SizedBox({ width: 2 }) as unknown as WidgetInterface,
              this._makeButton("Hover Me", Color.green()),
              new SizedBox({ width: 2 }) as unknown as WidgetInterface,
              this._makeButton("Drag Me", Color.magenta()),
              new SizedBox({ width: 2 }) as unknown as WidgetInterface,
              this._makeButton("Double Click", Color.red(), "solid"),
            ],
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,

        new SizedBox({ height: 2 }) as unknown as WidgetInterface,

        // Section 2: GestureDetector demo
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Text({
            data: "GestureDetector (wraps MouseRegion with tap mapping):",
            style: new TextStyle({ foreground: Color.yellow(), bold: true }),
          }),
        }) as unknown as WidgetInterface,

        new SizedBox({ height: 1 }) as unknown as WidgetInterface,

        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new GestureDetector({
            onTap: () => {
              this.setState(() => {
                this._clickCounts["Tap"] = (this._clickCounts["Tap"] ?? 0) + 1;
                this._lastEvent = `GestureDetector tap #${this._clickCounts["Tap"]}`;
              });
            },
            child: new Container({
              width: 30,
              height: 3,
              decoration: new BoxDecoration({
                color: Color.rgb(60, 30, 80),
                border: Border.all(new BorderSide(Color.brightMagenta(), 1, "rounded")),
              }),
              child: new Center({
                child: new Text({
                  data: `Tap Me (count: ${this._clickCounts["Tap"] ?? 0})`,
                  style: new TextStyle({ foreground: Color.brightMagenta() }),
                }),
              }),
            }) as unknown as WidgetInterface,
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,

        new SizedBox({ height: 2 }) as unknown as WidgetInterface,

        // Section 3: Event types
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Column({
            children: [
              new Text({
                data: "Supported MouseEvent types:",
                style: new TextStyle({ foreground: Color.yellow(), bold: true }),
              }) as unknown as WidgetInterface,
              new Text({
                data: "  click · enter · exit · hover · scroll · drag · release",
                style: new TextStyle({ foreground: Color.green() }),
              }) as unknown as WidgetInterface,
            ],
          }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,

        // Fill remaining space
        new Expanded({
          child: new SizedBox() as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,

        // Footer
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
          child: new Text({
            data: " Press 'q' to quit | Mouse events dispatched by MouseManager + HitTest",
            style: new TextStyle({ dim: true }),
          }),
        }) as unknown as WidgetInterface,
      ],
    }) as unknown as WidgetInterface;
  }

  private _makeButton(
    label: string,
    bgColor: Color,
    borderStyle: "rounded" | "solid" = "rounded",
  ): WidgetInterface {
    const isHovered = this._hoveredButton === label;
    const count = this._clickCounts[label] ?? 0;
    const displayLabel = count > 0 ? `${label} (${count})` : label;

    const displayColor = isHovered ? Color.white() : bgColor;
    const side = new BorderSide(Color.white(), 1, borderStyle);
    const border = Border.all(side);
    const decoration = new BoxDecoration({ color: displayColor, border });

    return new MouseRegion({
      onClick: (_e) => {
        this.setState(() => {
          this._clickCounts[label] = count + 1;
          this._lastEvent = `Clicked "${label}" (#${count + 1})`;
        });
      },
      onEnter: (_e) => {
        this.setState(() => {
          this._hoveredButton = label;
          this._lastEvent = `Entered "${label}"`;
        });
      },
      onExit: (_e) => {
        this.setState(() => {
          if (this._hoveredButton === label) this._hoveredButton = null;
          this._lastEvent = `Exited "${label}"`;
        });
      },
      child: new Container({
        width: Math.max(displayLabel.length + 4, label.length + 4),
        height: 3,
        decoration,
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Center({
          child: new Text({
            data: displayLabel,
            style: new TextStyle({ foreground: Color.white(), bold: true }),
          }),
        }),
      }),
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new InteractiveDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    // Register 'q' key to quit
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
