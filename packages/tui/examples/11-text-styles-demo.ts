/**
 * 示例 11: RichText 样式演示
 *
 * 演示 RichText 的高级功能:
 * - TextSpan 嵌套与混合样式 (bold, italic, dim, underline, strikethrough)
 * - TextAlign: left / center / right
 * - TextOverflow: clip / ellipsis
 * - maxLines 截断
 * - Color 方案: rgb, named colors, indexed
 *
 * 用法: bun run examples/11-text-styles-demo.ts
 * 按 q 退出。按 Tab 切换 textAlign。按 m 切换 maxLines。
 */

import { runApp } from "../src/binding/run-app.js";
import { WidgetsBinding } from "../src/binding/widgets-binding.js";
import type { KeyEventResult } from "../src/focus/focus-node.js";
import { Color } from "../src/screen/color.js";
import { TextStyle } from "../src/screen/text-style.js";
import { ScrollController } from "../src/scroll/scroll-controller.js";
import { Scrollable, ScrollViewport } from "../src/scroll/scrollable.js";
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
import { Padding } from "../src/widgets/padding.js";
import type { TextAlign } from "../src/widgets/rich-text.js";
import { RichText } from "../src/widgets/rich-text.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  TextStylesDemo
// ════════════════════════════════════════════════════

class TextStylesDemo extends StatefulWidget {
  createState(): State {
    return new TextStylesDemoState();
  }
}

const ALIGNS: TextAlign[] = ["left", "center", "right"];

class TextStylesDemoState extends State<TextStylesDemo> {
  private _alignIndex = 0;
  private _maxLinesEnabled = false;
  private _controller = new ScrollController();

  override initState(): void {
    super.initState();
    this._controller.disableFollowMode();
  }

  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    if (event.key === "q" && !event.modifiers.ctrl) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    if (event.key === "Tab") {
      this.setState(() => {
        this._alignIndex = (this._alignIndex + 1) % 3;
      });
      return "handled";
    }
    if (event.key === "m") {
      this.setState(() => {
        this._maxLinesEnabled = !this._maxLinesEnabled;
      });
      return "handled";
    }
    return "ignored";
  };

  build(_context: BuildContext): Widget {
    const align = ALIGNS[this._alignIndex];
    const borderColor = Color.rgb(60, 60, 60);
    const sectionBorder = Border.all(new BorderSide(borderColor, 1, "rounded"));

    // Section 1: Style showcase
    const styleSection = new Container({
      decoration: new BoxDecoration({ border: sectionBorder }),
      padding: EdgeInsets.all(1),
      child: new Column({
        children: [
          new RichText({
            text: new TextSpan({
              text: " Text Styles",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
          }),
          new Padding({
            padding: EdgeInsets.only({ top: 1 }),
            child: new RichText({
              text: new TextSpan({
                children: [
                  new TextSpan({
                    text: "Bold ",
                    style: new TextStyle({ bold: true, foreground: Color.rgb(255, 255, 255) }),
                  }),
                  new TextSpan({
                    text: "Italic ",
                    style: new TextStyle({ italic: true, foreground: Color.rgb(200, 200, 100) }),
                  }),
                  new TextSpan({
                    text: "Dim ",
                    style: new TextStyle({ dim: true, foreground: Color.rgb(150, 150, 150) }),
                  }),
                  new TextSpan({
                    text: "Underline ",
                    style: new TextStyle({ underline: true, foreground: Color.rgb(100, 200, 255) }),
                  }),
                  new TextSpan({
                    text: "Strike",
                    style: new TextStyle({
                      strikethrough: true,
                      foreground: Color.rgb(255, 100, 100),
                    }),
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    });

    // Section 2: Color palette
    const colorChildren: TextSpan[] = [];
    const colorNames = ["Red", "Green", "Blue", "Cyan", "Yellow", "Magenta"];
    const colors = [
      Color.red(),
      Color.rgb(0, 200, 0),
      Color.rgb(50, 100, 255),
      Color.cyan(),
      Color.rgb(255, 255, 0),
      Color.rgb(255, 0, 255),
    ];
    for (let i = 0; i < colorNames.length; i++) {
      colorChildren.push(
        new TextSpan({
          text: ` ${colorNames[i]} `,
          style: new TextStyle({
            foreground: Color.rgb(0, 0, 0),
            background: colors[i],
            bold: true,
          }),
        }),
        new TextSpan({ text: " " }),
      );
    }

    const colorSection = new Container({
      decoration: new BoxDecoration({ border: sectionBorder }),
      padding: EdgeInsets.all(1),
      child: new Column({
        children: [
          new RichText({
            text: new TextSpan({
              text: " Color Palette",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
          }),
          new Padding({
            padding: EdgeInsets.only({ top: 1 }),
            child: new RichText({
              text: new TextSpan({ children: colorChildren }),
            }),
          }),
        ],
      }),
    });

    // Section 3: Text alignment
    const alignSection = new Container({
      decoration: new BoxDecoration({ border: sectionBorder }),
      padding: EdgeInsets.all(1),
      child: new Column({
        children: [
          new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: " Text Align",
                  style: new TextStyle({ bold: true, foreground: Color.cyan() }),
                }),
                new TextSpan({
                  text: ` (${align})`,
                  style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
                }),
              ],
            }),
          }),
          new Padding({
            padding: EdgeInsets.only({ top: 1 }),
            child: new RichText({
              textAlign: align,
              text: new TextSpan({
                text: "This text respects alignment.",
                style: new TextStyle({ foreground: Color.rgb(200, 200, 200) }),
              }),
            }),
          }),
          new RichText({
            textAlign: align,
            text: new TextSpan({
              text: "Press Tab to cycle alignments.",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
          }),
        ],
      }),
    });

    // Section 4: Overflow & maxLines
    const longText =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.";

    const overflowSection = new Container({
      decoration: new BoxDecoration({ border: sectionBorder }),
      padding: EdgeInsets.all(1),
      child: new Column({
        children: [
          new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: " Overflow / maxLines",
                  style: new TextStyle({ bold: true, foreground: Color.cyan() }),
                }),
                new TextSpan({
                  text: this._maxLinesEnabled ? " (maxLines=2)" : " (unlimited)",
                  style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
                }),
              ],
            }),
          }),
          new Padding({
            padding: EdgeInsets.only({ top: 1 }),
            child: new RichText({
              overflow: "ellipsis",
              maxLines: this._maxLinesEnabled ? 2 : undefined,
              text: new TextSpan({
                text: longText,
                style: new TextStyle({ foreground: Color.rgb(200, 200, 200) }),
              }),
            }),
          }),
        ],
      }),
    });

    // Header
    const header = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Text Styles Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.rgb(255, 165, 0),
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
              text: " Tab ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(255, 165, 0) }),
            }),
            new TextSpan({
              text: "align  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " m ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(255, 165, 0) }),
            }),
            new TextSpan({
              text: "maxLines  ",
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

    // Scrollable content
    const scrollContent = new Column({
      children: [
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: styleSection,
        }),
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: colorSection,
        }),
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: alignSection,
        }),
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: overflowSection,
        }),
      ],
    });

    const scrollable = new Scrollable({
      controller: this._controller,
      autofocus: true,
      viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
        new ScrollViewport({
          controller: ctrl,
          child: scrollContent,
        }),
    });

    return new Focus({
      onKey: this.handleKeyEvent,
      child: new Column({
        children: [header, new Expanded({ child: scrollable }), footer],
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════

await runApp(new TextStylesDemo());
