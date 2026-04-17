/**
 * TUI Scrollable + Scrollbar Demo — scroll viewport showcase.
 *
 * Demonstrates the Scrollable widget (auto keyboard/mouse scrolling),
 * ScrollViewport render object, ScrollController, and Scrollbar widget
 * with clickable track and draggable thumb.
 *
 * - 60 colored rows inside a Scrollable viewport
 * - Scrollbar alongside content (Row layout)
 * - Status bar showing scroll position, visible range, atTop/atBottom
 * - Keyboard: j/k (3 lines), arrows (3 lines), Ctrl+d/u (page), g/G (top/bottom)
 * - Mouse: scroll wheel, scrollbar click/drag
 *
 * Run: bun run examples/tui-scrollable-demo.ts
 * Press q to quit.
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import type { KeyEventResult } from "../packages/tui/src/focus/focus-node.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { ScrollController } from "../packages/tui/src/scroll/scroll-controller.js";
import { Scrollable, ScrollViewport } from "../packages/tui/src/scroll/scrollable.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";
import type { KeyEvent } from "../packages/tui/src/vt/types.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Focus } from "../packages/tui/src/widgets/focus.js";
import { Padding } from "../packages/tui/src/widgets/padding.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { Scrollbar } from "../packages/tui/src/widgets/scrollbar.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Data
// ════════════════════════════════════════════════════

const ITEM_COUNT = 60;

const ROW_COLORS: Color[] = [
  Color.rgb(255, 100, 100), // red
  Color.rgb(255, 180, 60),  // orange
  Color.rgb(255, 255, 80),  // yellow
  Color.rgb(100, 220, 100), // green
  Color.rgb(100, 200, 255), // blue
  Color.rgb(180, 120, 255), // purple
];

function rowColor(index: number): Color {
  return ROW_COLORS[index % ROW_COLORS.length] ?? Color.white();
}

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class ScrollableDemo extends StatefulWidget {
  createState(): State {
    return new ScrollableDemoState();
  }
}

class ScrollableDemoState extends State<ScrollableDemo> {
  private scrollCtrl!: ScrollController;
  private listener!: () => void;

  override initState(): void {
    super.initState();
    this.scrollCtrl = new ScrollController();
    this.scrollCtrl.disableFollowMode();

    // Rebuild on scroll changes so status bar + scrollbar update
    this.listener = () => {
      if (this.mounted) this.setState();
    };
    this.scrollCtrl.addListener(this.listener);
  }

  override dispose(): void {
    this.scrollCtrl.removeListener(this.listener);
    this.scrollCtrl.dispose();
    super.dispose();
  }

  private _buildRow(index: number): Widget {
    const color = rowColor(index);
    const isEven = index % 2 === 0;
    const bgColor = isEven ? Color.rgb(25, 25, 30) : Color.rgb(30, 30, 35);

    const categories = ["Server", "Client", "Worker", "Queue", "Cache", "Auth"];
    const messages = [
      "Connection established successfully",
      "Request processed in 42ms",
      "Background job completed",
      "Items enqueued for processing",
      "Cache hit ratio: 94.2%",
      "Token refreshed for session",
      "Heartbeat received from peer",
      "Configuration reloaded",
      "Metrics exported to dashboard",
      "Health check passed",
    ];

    const cat = categories[index % categories.length] ?? "System";
    const msg = messages[index % messages.length] ?? "OK";

    return new Container({
      decoration: new BoxDecoration({ color: bgColor }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: ` ${String(index + 1).padStart(3, " ")} `,
              style: new TextStyle({ foreground: Color.rgb(80, 80, 80) }),
            }),
            new TextSpan({
              text: `${cat.padEnd(7)} `,
              style: new TextStyle({ foreground: color, bold: true }),
            }),
            new TextSpan({
              text: msg,
              style: new TextStyle({
                foreground: isEven ? Color.rgb(200, 200, 200) : Color.rgb(160, 160, 160),
              }),
            }),
          ],
        }),
      }),
    }) as unknown as Widget;
  }

  private _handleQuit = (event: KeyEvent): KeyEventResult => {
    if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    return "ignored";
  };

  build(_context: BuildContext): WidgetInterface {
    const offset = this.scrollCtrl.offset;
    const maxExtent = this.scrollCtrl.maxScrollExtent;
    const atTop = this.scrollCtrl.atTop;
    const atBottom = this.scrollCtrl.atBottom;

    // Build all rows (Scrollable + ScrollViewport handles clipping)
    const rows: Widget[] = [];
    for (let i = 0; i < ITEM_COUNT; i++) {
      rows.push(this._buildRow(i));
    }

    // Scrollable content area with viewport
    const scrollable = new Scrollable({
      controller: this.scrollCtrl,
      autofocus: true,
      viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
        new ScrollViewport({
          controller: ctrl,
          child: new Column({ children: rows }),
        }),
    });

    // Scrollbar alongside
    const scrollbar = new Scrollbar({
      controller: this.scrollCtrl,
      getScrollInfo: () => ({
        totalContentHeight: ITEM_COUNT,
        viewportHeight:
          this.scrollCtrl.maxScrollExtent > 0
            ? ITEM_COUNT - this.scrollCtrl.maxScrollExtent
            : ITEM_COUNT,
        scrollOffset: this.scrollCtrl.offset,
      }),
      thumbColor: Color.rgb(120, 180, 255),
      trackColor: Color.rgb(40, 40, 50),
    });

    // Content area: scrollable + scrollbar side by side
    const contentArea = new Row({
      children: [
        new Expanded({ child: scrollable }) as unknown as Widget,
        scrollbar as unknown as Widget,
      ],
    });

    // Status line
    const visibleStart = Math.floor(offset) + 1;
    const viewportH = maxExtent > 0 ? ITEM_COUNT - maxExtent : ITEM_COUNT;
    const visibleEnd = Math.min(visibleStart + viewportH - 1, ITEM_COUNT);

    const statusLine = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: "Offset: ",
              style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
            }),
            new TextSpan({
              text: `${Math.round(offset)}`,
              style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
            }),
            new TextSpan({
              text: ` / ${Math.round(maxExtent)}`,
              style: new TextStyle({ foreground: Color.rgb(100, 100, 100) }),
            }),
            new TextSpan({
              text: `  Visible: ${visibleStart}-${visibleEnd}`,
              style: new TextStyle({ foreground: Color.rgb(140, 140, 140) }),
            }),
            new TextSpan({
              text: `  ${atTop ? "[TOP]" : ""}${atBottom ? "[BOTTOM]" : ""}`,
              style: new TextStyle({
                foreground: Color.yellow(),
                bold: true,
              }),
            }),
          ],
        }),
      }),
    });

    return new Focus({
      onKey: this._handleQuit,
      child: new Column({
        children: [
          // Title bar
          new Container({
            width: 80,
            height: 1,
            decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
            child: new Text({
              data: " Flitter Scrollable + Scrollbar Demo",
              style: new TextStyle({ foreground: Color.cyan(), bold: true }),
            }),
          }) as unknown as Widget,

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Help
          new Text({
            data: "  j/k  Scroll  |  Ctrl+d/u  Page  |  g/G  Top/Bottom  |  Mouse wheel  |  q  Quit",
            style: new TextStyle({ foreground: Color.green() }),
          }) as unknown as Widget,

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Status
          statusLine as unknown as Widget,

          new SizedBox({ height: 1 }) as unknown as Widget,

          // Main scrollable area
          new Expanded({
            child: new Padding({
              padding: EdgeInsets.symmetric({ horizontal: 1 }),
              child: contentArea,
            }),
          }) as unknown as Widget,

          // Footer
          new Container({
            width: 80,
            height: 1,
            decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
            child: new Text({
              data: ` ${ITEM_COUNT} items | Scrollable + ScrollViewport + Scrollbar`,
              style: new TextStyle({ dim: true }),
            }),
          }) as unknown as Widget,
        ],
      }),
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new ScrollableDemo() as unknown as WidgetInterface);
