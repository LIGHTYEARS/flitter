/**
 * 示例 08: Focus + 键盘事件演示
 *
 * 演示 Focus 系统的核心功能:
 * - Focus widget 管理 FocusNode 生命周期
 * - onKey handler 处理键盘事件
 * - KeyEventResult 事件冒泡 ("handled" 停止, "ignored" 继续)
 * - 嵌套 Focus 树的事件传播
 *
 * 用法: bun run examples/08-focus-keyboard-demo.ts
 * 按 q 退出。按 1-4 选择面板，按方向键/vim 键改变所选面板的计数。
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
import { Padding } from "../src/widgets/padding.js";
import { RichText } from "../src/widgets/rich-text.js";
import { Row } from "../src/widgets/row.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  FocusKeyboardDemo — 主界面 (StatefulWidget)
// ════════════════════════════════════════════════════

class FocusKeyboardDemo extends StatefulWidget {
  createState(): State {
    return new FocusKeyboardDemoState();
  }
}

class FocusKeyboardDemoState extends State<FocusKeyboardDemo> {
  private _selectedPanel = 0;
  private _counters = [0, 0, 0, 0];
  private _lastKey = "(none)";

  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    const { key, modifiers } = event;

    // q to quit
    if (key === "q" && !modifiers.ctrl && !modifiers.alt) {
      WidgetsBinding.instance.stop();
      return "handled";
    }

    // 1-4 select panel
    if (key >= "1" && key <= "4") {
      this.setState(() => {
        this._selectedPanel = Number.parseInt(key, 10) - 1;
        this._lastKey = key;
      });
      return "handled";
    }

    // Arrow keys / vim keys modify counter
    let delta = 0;
    if (key === "ArrowUp" || key === "k") delta = 1;
    else if (key === "ArrowDown" || key === "j") delta = -1;
    else if (key === "ArrowRight" || key === "l") delta = 5;
    else if (key === "ArrowLeft" || key === "h") delta = -5;

    if (delta !== 0) {
      this.setState(() => {
        this._counters[this._selectedPanel] += delta;
        this._lastKey = key;
      });
      return "handled";
    }

    this.setState(() => {
      this._lastKey = key;
    });
    return "ignored";
  };

  build(_context: BuildContext): Widget {
    const panelColors = [
      Color.cyan(),
      Color.rgb(255, 165, 0),
      Color.rgb(0, 200, 0),
      Color.rgb(200, 100, 255),
    ];
    const panelNames = ["Alpha", "Beta", "Gamma", "Delta"];

    // Build 4 counter panels
    const panels: Widget[] = [];
    for (let i = 0; i < 4; i++) {
      const isSelected = i === this._selectedPanel;
      const borderColor = isSelected ? panelColors[i] : Color.rgb(60, 60, 60);
      const labelColor = isSelected ? panelColors[i] : Color.rgb(100, 100, 100);

      panels.push(
        new Expanded({
          child: new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide(borderColor, 1, "rounded")),
            }),
            padding: EdgeInsets.all(1),
            child: new Column({
              children: [
                new RichText({
                  text: new TextSpan({
                    children: [
                      new TextSpan({
                        text: ` [${i + 1}] ${panelNames[i]} `,
                        style: new TextStyle({
                          bold: isSelected,
                          foreground: labelColor,
                        }),
                      }),
                      ...(isSelected
                        ? [
                            new TextSpan({
                              text: " ◆",
                              style: new TextStyle({ foreground: panelColors[i] }),
                            }),
                          ]
                        : []),
                    ],
                  }),
                }),
                new Padding({
                  padding: EdgeInsets.only({ top: 1 }),
                  child: new RichText({
                    text: new TextSpan({
                      text: `  Count: ${this._counters[i]}`,
                      style: new TextStyle({
                        foreground: isSelected ? Color.rgb(255, 255, 255) : Color.rgb(80, 80, 80),
                        bold: isSelected,
                      }),
                    }),
                  }),
                }),
              ],
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
              text: " Focus + Keyboard Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.cyan(),
              }),
            }),
            new TextSpan({
              text: `  Last key: ${this._lastKey}  `,
              style: new TextStyle({
                foreground: Color.rgb(150, 150, 150),
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
              text: " 1-4 ",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
            new TextSpan({
              text: "select  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " ↑/k ↓/j ",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
            new TextSpan({
              text: "±1  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " ←/h →/l ",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }),
            new TextSpan({
              text: "±5  ",
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
        children: [header, new Expanded({ child: new Row({ children: panels }) }), footer],
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════

await runApp(new FocusKeyboardDemo());
