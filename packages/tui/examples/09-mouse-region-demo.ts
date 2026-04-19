/**
 * 示例 09: MouseRegion 鼠标事件演示
 *
 * 演示 MouseRegion 的核心功能:
 * - onClick: 点击事件
 * - onEnter / onExit: 鼠标进入/离开区域
 * - onScroll: 鼠标滚轮事件
 * - 组合使用 Focus + MouseRegion 处理键鼠混合输入
 *
 * 用法: bun run examples/09-mouse-region-demo.ts
 * 点击各区域查看事件。按 q 退出。
 */

import { runApp } from "../src/binding/run-app.js";
import { WidgetsBinding } from "../src/binding/widgets-binding.js";
import type { KeyEventResult } from "../src/focus/focus-node.js";
import { Color } from "../src/screen/color.js";
import { TextStyle } from "../src/screen/text-style.js";
import type { BuildContext, Widget } from "../src/tree/element.js";
import { State, StatefulWidget } from "../src/tree/stateful-widget.js";
import type { KeyEvent } from "../src/vt/types.js";
import { Border } from "../src/widgets/border.js";
import { BorderSide } from "../src/widgets/border-side.js";
import { BoxDecoration } from "../src/widgets/box-decoration.js";
import { Column } from "../src/widgets/column.js";
import { Container } from "../src/widgets/container.js";
import { EdgeInsets } from "../src/widgets/edge-insets.js";
import { Expanded } from "../src/widgets/flexible.js";
import { Focus } from "../src/widgets/focus.js";
import type { MouseEvent } from "../src/widgets/mouse-region.js";
import { MouseRegion } from "../src/widgets/mouse-region.js";
import { Padding } from "../src/widgets/padding.js";
import { RichText } from "../src/widgets/rich-text.js";
import { Row } from "../src/widgets/row.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  MouseRegionDemo — StatefulWidget
// ════════════════════════════════════════════════════

class MouseRegionDemo extends StatefulWidget {
  createState(): State {
    return new MouseRegionDemoState();
  }
}

class MouseRegionDemoState extends State<MouseRegionDemo> {
  private _clickCounts = [0, 0, 0];
  private _hovered = [false, false, false];
  private _scrollCount = 0;
  private _lastEvent = "No events yet";

  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    if (event.key === "r") {
      this.setState(() => {
        this._clickCounts = [0, 0, 0];
        this._scrollCount = 0;
        this._lastEvent = "Counters reset";
      });
      return "handled";
    }
    return "ignored";
  };

  private _makeClickHandler(index: number): (event: MouseEvent) => void {
    const names = ["Red", "Green", "Blue"];
    return (_event: MouseEvent) => {
      this.setState(() => {
        this._clickCounts[index]++;
        this._lastEvent = `Click: ${names[index]} (${this._clickCounts[index]})`;
      });
    };
  }

  private _makeEnterHandler(index: number): (event: MouseEvent) => void {
    const names = ["Red", "Green", "Blue"];
    return (_event: MouseEvent) => {
      this.setState(() => {
        this._hovered[index] = true;
        this._lastEvent = `Enter: ${names[index]}`;
      });
    };
  }

  private _makeExitHandler(index: number): (event: MouseEvent) => void {
    const names = ["Red", "Green", "Blue"];
    return (_event: MouseEvent) => {
      this.setState(() => {
        this._hovered[index] = false;
        this._lastEvent = `Exit: ${names[index]}`;
      });
    };
  }

  private _handleScroll = (_event: MouseEvent): void => {
    this.setState(() => {
      this._scrollCount++;
      this._lastEvent = `Scroll event #${this._scrollCount}`;
    });
  };

  build(_context: BuildContext): Widget {
    const boxColors = [Color.rgb(200, 50, 50), Color.rgb(50, 200, 50), Color.rgb(50, 100, 200)];
    const boxNames = ["Red", "Green", "Blue"];

    // Build clickable mouse regions
    const boxes: Widget[] = [];
    for (let i = 0; i < 3; i++) {
      const isHover = this._hovered[i];
      const baseColor = boxColors[i];
      const borderColor = isHover ? Color.rgb(255, 255, 255) : baseColor;

      boxes.push(
        new Expanded({
          child: new MouseRegion({
            onClick: this._makeClickHandler(i),
            onEnter: this._makeEnterHandler(i),
            onExit: this._makeExitHandler(i),
            onScroll: this._handleScroll,
            child: new Container({
              decoration: new BoxDecoration({
                border: Border.all(new BorderSide(borderColor, 1, "rounded")),
                color: isHover ? Color.rgb(40, 40, 40) : undefined,
              }),
              padding: EdgeInsets.all(1),
              child: new Column({
                children: [
                  new RichText({
                    text: new TextSpan({
                      text: ` ${boxNames[i]} Box`,
                      style: new TextStyle({
                        bold: true,
                        foreground: baseColor,
                      }),
                    }),
                  }),
                  new Padding({
                    padding: EdgeInsets.only({ top: 1 }),
                    child: new RichText({
                      text: new TextSpan({
                        text: `  Clicks: ${this._clickCounts[i]}`,
                        style: new TextStyle({
                          foreground: Color.rgb(200, 200, 200),
                        }),
                      }),
                    }),
                  }),
                  new RichText({
                    text: new TextSpan({
                      text: isHover ? "  [HOVER]" : "  [    ]",
                      style: new TextStyle({
                        foreground: isHover ? Color.rgb(255, 255, 0) : Color.rgb(60, 60, 60),
                      }),
                    }),
                  }),
                ],
              }),
            }),
          }),
        }),
      );
    }

    // Header
    const header = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " MouseRegion Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.rgb(50, 200, 50),
              }),
            }),
            new TextSpan({
              text: `  ${this._lastEvent}`,
              style: new TextStyle({
                foreground: Color.rgb(150, 150, 150),
              }),
            }),
          ],
        }),
      }),
    });

    // Scroll info
    const scrollInfo = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: ` Scroll events: ${this._scrollCount}`,
              style: new TextStyle({
                foreground: Color.rgb(200, 200, 200),
              }),
            }),
          ],
        }),
      }),
    });

    // Footer
    const footer = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " click ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(50, 200, 50) }),
            }),
            new TextSpan({
              text: "boxes  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " hover ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(50, 200, 50) }),
            }),
            new TextSpan({
              text: "to highlight  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " r ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(50, 200, 50) }),
            }),
            new TextSpan({
              text: "reset  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " q ",
              style: new TextStyle({ bold: true, foreground: Color.red() }),
            }),
            new TextSpan({
              text: "quit",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
          ],
        }),
      }),
    });

    return new Focus({
      autofocus: true,
      onKey: this.handleKeyEvent,
      child: new Column({
        children: [
          header,
          new Expanded({ child: new Row({ children: boxes }) }),
          scrollInfo,
          footer,
        ],
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════

await runApp(new MouseRegionDemo());
