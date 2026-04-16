/**
 * 示例 07: Scrollable + Focus + Actions 交互演示
 *
 * 演示 Tier 2 Wave 2+3 的核心功能:
 * - Scrollable StatefulWidget (自动集成 Focus + MouseRegion)
 * - ScrollBehavior vim 键绑定 (j/k/g/G/Ctrl+d/Ctrl+u)
 * - 鼠标滚轮滚动
 * - Focus 系统 + 键盘事件冒泡
 *
 * 用法: bun run examples/07-scrollable-demo.ts
 * 按 q 或 Ctrl+C 退出。
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
import { Column } from "../src/widgets/column.js";
import { EdgeInsets } from "../src/widgets/edge-insets.js";
import { Expanded } from "../src/widgets/flexible.js";
import { Focus } from "../src/widgets/focus.js";
import { Padding } from "../src/widgets/padding.js";
import { RichText } from "../src/widgets/rich-text.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  ScrollableDemo — 主界面
// ════════════════════════════════════════════════════

class ScrollableDemo extends StatelessWidget {
  build(_context: BuildContext): Widget {
    const controller = new ScrollController();
    controller.disableFollowMode();

    // 生成 50 行内容
    const lines: Widget[] = [];
    for (let i = 0; i < 50; i++) {
      const isEven = i % 2 === 0;
      lines.push(
        new Padding({
          padding: EdgeInsets.symmetric(0, 1),
          child: new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `  ${String(i + 1).padStart(3, " ")}  `,
                  style: new TextStyle({
                    foreground: Color.rgb(100, 100, 100),
                    bold: true,
                  }),
                }),
                new TextSpan({
                  text: isEven
                    ? `  Item ${i + 1}: The quick brown fox jumps over the lazy dog`
                    : `  Item ${i + 1}: Lorem ipsum dolor sit amet, consectetur`,
                  style: new TextStyle({
                    foreground: isEven ? Color.cyan() : Color.rgb(180, 180, 180),
                  }),
                }),
              ],
            }),
          }),
        }),
      );
    }

    // 标题栏
    const header = new Padding({
      padding: EdgeInsets.symmetric(0, 1),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Flitter Scrollable Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.cyan(),
              }),
            }),
            new TextSpan({
              text: "  50 items  ",
              style: new TextStyle({
                foreground: Color.rgb(150, 150, 150),
              }),
            }),
          ],
        }),
      }),
    });

    // 帮助栏
    const footer = new Padding({
      padding: EdgeInsets.symmetric(0, 1),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " j/k ",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
            new TextSpan({
              text: "scroll  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " Ctrl+d/u ",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
            new TextSpan({
              text: "page  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " g/G ",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
            new TextSpan({
              text: "top/bot  ",
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

    // 可滚动内容区
    const scrollContent = new Column({ children: lines });

    const scrollable = new Scrollable({
      controller,
      autofocus: true,
      viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
        new ScrollViewport({
          controller: ctrl,
          child: scrollContent,
        }),
    });

    // 顶层 Focus 捕获 q 退出
    // 在 Focus 树中，ScrollBehavior 对 "q" 返回 "ignored"，
    // 事件会冒泡到父 Focus 节点。
    const handleQuit = (event: KeyEvent): KeyEventResult => {
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        WidgetsBinding.instance.stop();
        return "handled";
      }
      return "ignored";
    };

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

await runApp(new ScrollableDemo());
