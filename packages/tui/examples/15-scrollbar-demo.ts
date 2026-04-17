/**
 * 示例 15: Scrollbar 演示
 *
 * 演示 Scrollbar Widget 的核心功能:
 * - 与 ScrollController 手动集成（非 Scrollable widget）
 * - j/k 和方向键滚动，g/G 顶/底
 * - 50 项内容列表 + 垂直滚动条并排显示
 * - 实时显示滚动偏移量和最大滚动范围
 *
 * 用法: bun run examples/15-scrollbar-demo.ts
 * 按 j/k 或 ↑↓ 滚动, g/G 顶/底, Ctrl+C 退出。
 */

import { runApp } from "../src/binding/run-app.js";
import { WidgetsBinding } from "../src/binding/widgets-binding.js";
import type { KeyEventResult } from "../src/focus/focus-node.js";
import { Color } from "../src/screen/color.js";
import { TextStyle } from "../src/screen/text-style.js";
import { ScrollController } from "../src/scroll/scroll-controller.js";
import { State, StatefulWidget } from "../src/tree/stateful-widget.js";
import type { BuildContext } from "../src/tree/stateless-widget.js";
import type { Widget } from "../src/tree/widget.js";
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
import { RichText } from "../src/widgets/rich-text.js";
import { Row } from "../src/widgets/row.js";
import { Scrollbar } from "../src/widgets/scrollbar.js";
import { SizedBox } from "../src/widgets/sized-box.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const ITEM_COUNT = 50;
const VIEWPORT_HEIGHT = 20;

// Generate items with varied content
const ITEMS = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const types = ["INFO", "WARN", "ERROR", "DEBUG", "OK"];
  const type = types[i % types.length];
  const messages = [
    "Server started on port 8080",
    "Database connection established",
    "Cache warmed up successfully",
    "Request timeout after 30s",
    "Memory usage: 512MB / 2GB",
    "File watcher initialized",
    "Worker thread spawned",
    "Queue depth: 42 items",
    "Retry attempt 1 of 3",
    "Checkpoint saved to disk",
  ];
  const msg = messages[i % messages.length];
  return { index: i, type, msg };
});

function getTypeColor(type: string): Color {
  switch (type) {
    case "ERROR":
      return Color.rgb(255, 80, 80);
    case "WARN":
      return Color.rgb(255, 200, 50);
    case "INFO":
      return Color.rgb(100, 200, 255);
    case "DEBUG":
      return Color.rgb(150, 150, 150);
    case "OK":
      return Color.rgb(100, 220, 100);
    default:
      return Color.rgb(200, 200, 200);
  }
}

// ════════════════════════════════════════════════════
//  ScrollbarDemo — StatefulWidget
// ════════════════════════════════════════════════════

class ScrollbarDemo extends StatefulWidget {
  createState(): State {
    return new ScrollbarDemoState();
  }
}

class ScrollbarDemoState extends State<ScrollbarDemo> {
  private _scrollCtrl!: ScrollController;
  private _listener!: () => void;

  override initState(): void {
    super.initState();
    this._scrollCtrl = new ScrollController();
    this._scrollCtrl.disableFollowMode();
    this._scrollCtrl.updateMaxScrollExtent(ITEM_COUNT - VIEWPORT_HEIGHT);

    this._listener = () => {
      if (this.mounted) this.setState();
    };
    this._scrollCtrl.addListener(this._listener);
  }

  override dispose(): void {
    this._scrollCtrl.removeListener(this._listener);
    this._scrollCtrl.dispose();
    super.dispose();
  }

  private _handleKey = (event: KeyEvent): KeyEventResult => {
    const { key, modifiers } = event;

    // Ctrl+C to quit
    if (key === "c" && modifiers.ctrl) {
      WidgetsBinding.instance.stop();
      return "handled";
    }

    // Scroll down
    if (key === "j" || key === "ArrowDown") {
      this._scrollCtrl.scrollDown(1);
      return "handled";
    }

    // Scroll up
    if (key === "k" || key === "ArrowUp") {
      this._scrollCtrl.scrollUp(1);
      return "handled";
    }

    // Go to top
    if (key === "g" && !modifiers.ctrl && !modifiers.shift) {
      this._scrollCtrl.scrollToTop();
      return "handled";
    }

    // Go to bottom
    if (key === "G" || (key === "g" && modifiers.shift)) {
      this._scrollCtrl.scrollToBottom();
      return "handled";
    }

    // Page down (Ctrl+d)
    if (key === "d" && modifiers.ctrl) {
      this._scrollCtrl.scrollPageDown(VIEWPORT_HEIGHT);
      return "handled";
    }

    // Page up (Ctrl+u)
    if (key === "u" && modifiers.ctrl) {
      this._scrollCtrl.scrollPageUp(VIEWPORT_HEIGHT);
      return "handled";
    }

    return "ignored";
  };

  private _buildItem(itemIdx: number): Widget {
    const item = ITEMS[itemIdx];
    if (!item) return new RichText({ text: new TextSpan({ text: "" }) });
    const typeColor = getTypeColor(item.type);
    const isEven = itemIdx % 2 === 0;

    return new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: ` ${String(item.index + 1).padStart(3, " ")} `,
            style: new TextStyle({ foreground: Color.rgb(80, 80, 80) }),
          }),
          new TextSpan({
            text: ` ${item.type.padEnd(5)} `,
            style: new TextStyle({
              foreground: typeColor,
              bold: item.type === "ERROR" || item.type === "WARN",
            }),
          }),
          new TextSpan({
            text: item.msg,
            style: new TextStyle({
              foreground: isEven ? Color.rgb(200, 200, 200) : Color.rgb(160, 160, 160),
            }),
          }),
        ],
      }),
    });
  }

  build(_context: BuildContext): Widget {
    const offset = this._scrollCtrl.offset;
    const maxExtent = this._scrollCtrl.maxScrollExtent;

    // Render only visible items (viewport slice)
    const startIdx = Math.floor(offset);
    const visibleItems: Widget[] = [];
    for (let i = 0; i < VIEWPORT_HEIGHT; i++) {
      const itemIdx = startIdx + i;
      if (itemIdx < ITEM_COUNT) {
        visibleItems.push(this._buildItem(itemIdx));
      } else {
        // Empty padding row to fill viewport
        visibleItems.push(
          new RichText({
            text: new TextSpan({ text: "" }),
          }),
        );
      }
    }

    // List content (fixed height viewport)
    const listContent = new SizedBox({
      height: VIEWPORT_HEIGHT,
      child: new Column({ children: visibleItems }),
    });

    // Scrollbar alongside the list
    const scrollbar = new Scrollbar({
      controller: this._scrollCtrl,
      getScrollInfo: () => ({
        totalContentHeight: ITEM_COUNT,
        viewportHeight: VIEWPORT_HEIGHT,
        scrollOffset: this._scrollCtrl.offset,
      }),
      thumbColor: Color.rgb(150, 200, 255),
      trackColor: Color.rgb(50, 50, 60),
    });

    // Main content area: list + scrollbar side by side
    const contentArea = new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(Color.rgb(60, 80, 120), 1, "rounded")),
      }),
      child: new Row({
        children: [new Expanded({ child: listContent }), scrollbar],
      }),
    });

    // Header
    const header = new Padding({
      padding: EdgeInsets.horizontal(1),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Scrollbar Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.rgb(100, 200, 255),
              }),
            }),
            new TextSpan({
              text: `  ${ITEM_COUNT} items, viewport: ${VIEWPORT_HEIGHT}`,
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
          ],
        }),
      }),
    });

    // Status line
    const statusLine = new Padding({
      padding: EdgeInsets.only({ top: 1, left: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: "Offset: ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: `${Math.round(offset)}`,
              style: new TextStyle({ foreground: Color.rgb(100, 200, 255), bold: true }),
            }),
            new TextSpan({
              text: "  Max: ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: `${maxExtent}`,
              style: new TextStyle({ foreground: Color.rgb(100, 200, 255), bold: true }),
            }),
            new TextSpan({
              text: `  Items ${startIdx + 1}–${Math.min(startIdx + VIEWPORT_HEIGHT, ITEM_COUNT)} / ${ITEM_COUNT}`,
              style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
            }),
          ],
        }),
      }),
    });

    // Footer keybindings
    const footer = new Padding({
      padding: EdgeInsets.only({ top: 1, left: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " j/k ↑↓ ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(100, 200, 255) }),
            }),
            new TextSpan({
              text: "scroll  ",
              style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
            }),
            new TextSpan({
              text: " Ctrl+d/u ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(100, 200, 255) }),
            }),
            new TextSpan({
              text: "page  ",
              style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
            }),
            new TextSpan({
              text: " g/G ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(100, 200, 255) }),
            }),
            new TextSpan({
              text: "top/bot  ",
              style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
            }),
            new TextSpan({
              text: " Ctrl+C ",
              style: new TextStyle({ bold: true, foreground: Color.red() }),
            }),
            new TextSpan({
              text: "quit",
              style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
            }),
          ],
        }),
      }),
    });

    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      child: new Column({
        children: [
          header,
          new Padding({
            padding: EdgeInsets.all(1),
            child: new Column({
              children: [contentArea, statusLine, footer],
            }),
          }),
        ],
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════

await runApp(new ScrollbarDemo());
