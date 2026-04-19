/**
 * 示例 12: 布局 Widget 演示
 *
 * 演示 Flitter 的布局系统:
 * - Container with BoxDecoration + Border (rounded, solid)
 * - Padding + EdgeInsets (all, symmetric, only)
 * - SizedBox (fixed dimensions)
 * - Row + Column + Expanded/Flexible
 * - Stack + Positioned (layered layout)
 * - Center / Align
 *
 * 用法: bun run examples/12-layout-demo.ts
 * 按 j/k 滚动, q 退出。
 */

import { runApp } from "../src/binding/run-app.js";
import { WidgetsBinding } from "../src/binding/widgets-binding.js";
import type { KeyEventResult } from "../src/focus/focus-node.js";
import { Color } from "../src/screen/color.js";
import { TextStyle } from "../src/screen/text-style.js";
import { ScrollController } from "../src/scroll/scroll-controller.js";
import { Scrollable, ScrollViewport } from "../src/scroll/scrollable.js";
import type { BuildContext, Widget } from "../src/tree/element.js";
import { StatelessWidget } from "../src/tree/stateless-widget.js";
import type { KeyEvent } from "../src/vt/types.js";
import { Border } from "../src/widgets/border.js";
import { BorderSide } from "../src/widgets/border-side.js";
import { BoxDecoration } from "../src/widgets/box-decoration.js";
import { Center } from "../src/widgets/center.js";
import { Column } from "../src/widgets/column.js";
import { Container } from "../src/widgets/container.js";
import { EdgeInsets } from "../src/widgets/edge-insets.js";
import { Expanded } from "../src/widgets/flexible.js";
import { Focus } from "../src/widgets/focus.js";
import { Padding } from "../src/widgets/padding.js";
import { RichText } from "../src/widgets/rich-text.js";
import { Row } from "../src/widgets/row.js";
import { SizedBox } from "../src/widgets/sized-box.js";
import { Positioned, Stack } from "../src/widgets/stack.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Helper: section label
// ════════════════════════════════════════════════════

function sectionLabel(text: string): Widget {
  return new Padding({
    padding: EdgeInsets.only({ bottom: 1 }),
    child: new RichText({
      text: new TextSpan({
        text: ` ${text}`,
        style: new TextStyle({ bold: true, foreground: Color.cyan() }),
      }),
    }),
  });
}

// ════════════════════════════════════════════════════
//  LayoutDemo
// ════════════════════════════════════════════════════

class LayoutDemo extends StatelessWidget {
  build(_context: BuildContext): Widget {
    const controller = new ScrollController();
    controller.disableFollowMode();

    // ── Section 1: Border styles ──
    const borderSection = new Column({
      children: [
        sectionLabel("Border Styles"),
        new Row({
          children: [
            new Expanded({
              child: new Container({
                height: 5,
                decoration: new BoxDecoration({
                  border: Border.all(new BorderSide(Color.cyan(), 1, "rounded")),
                }),
                child: new Center({
                  child: new RichText({
                    text: new TextSpan({
                      text: "Rounded",
                      style: new TextStyle({ foreground: Color.cyan() }),
                    }),
                  }),
                }),
              }),
            }),
            new Expanded({
              child: new Container({
                height: 5,
                decoration: new BoxDecoration({
                  border: Border.all(new BorderSide(Color.rgb(255, 165, 0), 1, "solid")),
                }),
                child: new Center({
                  child: new RichText({
                    text: new TextSpan({
                      text: "Solid",
                      style: new TextStyle({ foreground: Color.rgb(255, 165, 0) }),
                    }),
                  }),
                }),
              }),
            }),
            new Expanded({
              child: new Container({
                height: 5,
                decoration: new BoxDecoration({
                  border: Border.all(new BorderSide(Color.rgb(50, 200, 50), 2, "solid")),
                  color: Color.rgb(20, 40, 20),
                }),
                child: new Center({
                  child: new RichText({
                    text: new TextSpan({
                      text: "Thick+BG",
                      style: new TextStyle({
                        bold: true,
                        foreground: Color.rgb(50, 200, 50),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          ],
        }),
      ],
    });

    // ── Section 2: Padding & SizedBox ──
    const paddingSection = new Column({
      children: [
        sectionLabel("Padding + SizedBox"),
        new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide(Color.rgb(80, 80, 80), 1, "rounded")),
          }),
          child: new Row({
            children: [
              new Padding({
                padding: EdgeInsets.all(1),
                child: new Container({
                  width: 12,
                  height: 3,
                  decoration: new BoxDecoration({ color: Color.rgb(80, 40, 40) }),
                  child: new Center({
                    child: new RichText({
                      text: new TextSpan({
                        text: "pad=1",
                        style: new TextStyle({ foreground: Color.rgb(255, 150, 150) }),
                      }),
                    }),
                  }),
                }),
              }),
              new SizedBox({
                width: 20,
                height: 5,
                child: new Container({
                  decoration: new BoxDecoration({ color: Color.rgb(40, 40, 80) }),
                  child: new Center({
                    child: new RichText({
                      text: new TextSpan({
                        text: "SizedBox 20x5",
                        style: new TextStyle({ foreground: Color.rgb(150, 150, 255) }),
                      }),
                    }),
                  }),
                }),
              }),
              new Expanded({
                child: new Padding({
                  padding: EdgeInsets.symmetric({ vertical: 1 }),
                  child: new Container({
                    height: 3,
                    decoration: new BoxDecoration({ color: Color.rgb(40, 60, 40) }),
                    child: new Center({
                      child: new RichText({
                        text: new TextSpan({
                          text: "Expanded",
                          style: new TextStyle({ foreground: Color.rgb(150, 255, 150) }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            ],
          }),
        }),
      ],
    });

    // ── Section 3: Stack + Positioned ──
    const stackSection = new Column({
      children: [
        sectionLabel("Stack + Positioned"),
        new SizedBox({
          height: 8,
          child: new Stack({
            children: [
              // Base layer
              new Container({
                decoration: new BoxDecoration({
                  border: Border.all(new BorderSide(Color.rgb(60, 60, 60), 1, "rounded")),
                  color: Color.rgb(20, 20, 30),
                }),
              }),
              // Positioned elements
              new Positioned({
                left: 2,
                top: 1,
                child: new RichText({
                  text: new TextSpan({
                    text: "[top-left]",
                    style: new TextStyle({
                      foreground: Color.rgb(255, 100, 100),
                      bold: true,
                    }),
                  }),
                }),
              }),
              new Positioned({
                right: 2,
                top: 1,
                child: new RichText({
                  text: new TextSpan({
                    text: "[top-right]",
                    style: new TextStyle({
                      foreground: Color.rgb(100, 255, 100),
                      bold: true,
                    }),
                  }),
                }),
              }),
              new Positioned({
                left: 2,
                bottom: 1,
                child: new RichText({
                  text: new TextSpan({
                    text: "[bottom-left]",
                    style: new TextStyle({
                      foreground: Color.rgb(100, 100, 255),
                      bold: true,
                    }),
                  }),
                }),
              }),
              new Positioned({
                right: 2,
                bottom: 1,
                child: new RichText({
                  text: new TextSpan({
                    text: "[bottom-right]",
                    style: new TextStyle({
                      foreground: Color.rgb(255, 255, 100),
                      bold: true,
                    }),
                  }),
                }),
              }),
            ],
          }),
        }),
      ],
    });

    // ── Section 4: Nested containers ──
    const nestedSection = new Column({
      children: [
        sectionLabel("Nested Containers"),
        new Container({
          height: 7,
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide(Color.rgb(200, 100, 255), 1, "rounded")),
          }),
          padding: EdgeInsets.all(1),
          child: new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide(Color.rgb(100, 200, 255), 1, "rounded")),
              color: Color.rgb(15, 20, 30),
            }),
            padding: EdgeInsets.all(1),
            child: new Container({
              decoration: new BoxDecoration({
                border: Border.all(new BorderSide(Color.rgb(255, 200, 100), 1, "rounded")),
                color: Color.rgb(30, 25, 15),
              }),
              child: new Center({
                child: new RichText({
                  text: new TextSpan({
                    text: "3 layers deep",
                    style: new TextStyle({
                      bold: true,
                      foreground: Color.rgb(255, 200, 100),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      ],
    });

    // Main content
    const content = new Column({
      children: [
        new Padding({ padding: EdgeInsets.only({ top: 1 }), child: borderSection }),
        new Padding({ padding: EdgeInsets.only({ top: 1 }), child: paddingSection }),
        new Padding({ padding: EdgeInsets.only({ top: 1 }), child: stackSection }),
        new Padding({ padding: EdgeInsets.only({ top: 1 }), child: nestedSection }),
      ],
    });

    // Header
    const header = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Layout Widgets Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.rgb(100, 200, 255),
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
              text: " j/k ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(100, 200, 255) }),
            }),
            new TextSpan({
              text: "scroll  ",
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

    const handleQuit = (event: KeyEvent): KeyEventResult => {
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        WidgetsBinding.instance.stop();
        return "handled";
      }
      return "ignored";
    };

    const scrollable = new Scrollable({
      controller,
      autofocus: true,
      viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
        new ScrollViewport({ controller: ctrl, child: content }),
    });

    return new Focus({
      onKey: handleQuit,
      child: new Column({
        children: [header, new Expanded({ child: scrollable }), footer],
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════

await runApp(new LayoutDemo());
