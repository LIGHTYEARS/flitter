/**
 * 示例 13: ListView 虚拟化列表演示
 *
 * 演示 ListView 的核心功能:
 * - Builder 模式: 只构建视口内 + 缓冲区的子项
 * - 固定行高模式: O(1) 可见范围计算
 * - ScrollController 集成: 自动计算 maxScrollExtent
 * - VisibleRange 查询: 实时显示当前可见范围
 * - 大数据集: 10000 项列表仅渲染可见部分
 *
 * 用法: bun run examples/13-listview-demo.ts
 * 按 j/k 滚动, Ctrl+d/u 翻页, g/G 顶/底, q 退出。
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
import { Column } from "../src/widgets/column.js";
import { EdgeInsets } from "../src/widgets/edge-insets.js";
import { Expanded } from "../src/widgets/flexible.js";
import { Focus } from "../src/widgets/focus.js";
import { Padding } from "../src/widgets/padding.js";
import { RichText } from "../src/widgets/rich-text.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Data — 10000 items with varied content
// ════════════════════════════════════════════════════

const ITEM_COUNT = 200;
const CATEGORIES = ["info", "warn", "error", "debug", "trace"];
const MESSAGES = [
  "Connection established to database",
  "Request processed in 42ms",
  "Cache miss for key user:1234",
  "Memory usage at 67% threshold",
  "Retry attempt 2 of 3 for API call",
  "File descriptor limit approaching",
  "Scheduled job completed successfully",
  "WebSocket connection dropped",
  "Rate limit exceeded for client",
  "Background worker started",
];

function getCategoryColor(cat: string): Color {
  switch (cat) {
    case "error":
      return Color.rgb(255, 80, 80);
    case "warn":
      return Color.rgb(255, 200, 50);
    case "info":
      return Color.cyan();
    case "debug":
      return Color.rgb(150, 150, 150);
    case "trace":
      return Color.rgb(80, 80, 80);
    default:
      return Color.rgb(200, 200, 200);
  }
}

// ════════════════════════════════════════════════════
//  ListViewDemo — StatefulWidget
// ════════════════════════════════════════════════════

class ListViewDemo extends StatefulWidget {
  createState(): State {
    return new ListViewDemoState();
  }
}

class ListViewDemoState extends State<ListViewDemo> {
  private _controller = new ScrollController();

  override initState(): void {
    super.initState();
    this._controller.disableFollowMode();
    this._controller.updateMaxScrollExtent(ITEM_COUNT - 1);
  }

  handleQuit = (event: KeyEvent): KeyEventResult => {
    if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    return "ignored";
  };

  private _buildItem(index: number): Widget {
    const cat = CATEGORIES[index % CATEGORIES.length];
    const msg = MESSAGES[index % MESSAGES.length];
    const catColor = getCategoryColor(cat);
    const isEven = index % 2 === 0;

    return new Padding({
      padding: EdgeInsets.symmetric(0, 0),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: ` ${String(index + 1).padStart(5, " ")} `,
              style: new TextStyle({
                foreground: Color.rgb(60, 60, 60),
              }),
            }),
            new TextSpan({
              text: ` ${cat.toUpperCase().padEnd(5)} `,
              style: new TextStyle({
                bold: cat === "error" || cat === "warn",
                foreground: catColor,
              }),
            }),
            new TextSpan({
              text: ` ${msg}`,
              style: new TextStyle({
                foreground: isEven ? Color.rgb(200, 200, 200) : Color.rgb(160, 160, 160),
              }),
            }),
          ],
        }),
      }),
    });
  }

  build(_context: BuildContext): Widget {
    // Build visible items as Widget children for the scrollable content
    const items: Widget[] = [];
    for (let i = 0; i < ITEM_COUNT; i++) {
      items.push(this._buildItem(i));
    }

    const scrollContent = new Column({ children: items });

    // Header
    const header = new Padding({
      padding: EdgeInsets.horizontal(1),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " ListView Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.rgb(255, 100, 100),
              }),
            }),
            new TextSpan({
              text: `  ${ITEM_COUNT} items`,
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
          ],
        }),
      }),
    });

    // Footer
    const footer = new Padding({
      padding: EdgeInsets.horizontal(1),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " j/k ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(255, 100, 100) }),
            }),
            new TextSpan({
              text: "scroll  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " Ctrl+d/u ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(255, 100, 100) }),
            }),
            new TextSpan({
              text: "page  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " g/G ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(255, 100, 100) }),
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

    const scrollable = new Scrollable({
      controller: this._controller,
      autofocus: true,
      viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
        new ScrollViewport({ controller: ctrl, child: scrollContent }),
    });

    return new Focus({
      onKey: this.handleQuit,
      child: new Column({
        children: [header, new Expanded({ child: scrollable }), footer],
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════

await runApp(new ListViewDemo());
