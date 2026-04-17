/**
 * 示例 14: TextField 演示
 *
 * 演示 TextField 的核心功能:
 * - 多行文本输入 (maxLines=null)
 * - 光标位置、grapheme 数量和行数显示
 * - Enter 提交文本
 * - 显示最后提交的文本
 *
 * 用法: bun run examples/14-text-field-demo.ts
 * 按 Enter 提交，Ctrl+C 退出。
 */

import { runApp } from "../src/binding/run-app.js";
import { WidgetsBinding } from "../src/binding/widgets-binding.js";
import { TextEditingController } from "../src/editing/text-editing-controller.js";
import { TextField } from "../src/editing/text-field.js";
import type { KeyEventResult } from "../src/focus/focus-node.js";
import { Color } from "../src/screen/color.js";
import { TextStyle } from "../src/screen/text-style.js";
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
import { Focus } from "../src/widgets/focus.js";
import { Padding } from "../src/widgets/padding.js";
import { RichText } from "../src/widgets/rich-text.js";
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  TextFieldDemo — 主界面 (StatefulWidget)
// ════════════════════════════════════════════════════

class TextFieldDemo extends StatefulWidget {
  createState(): State {
    return new TextFieldDemoState();
  }
}

class TextFieldDemoState extends State<TextFieldDemo> {
  private _controller!: TextEditingController;
  private _lastSubmitted = "(none)";
  private _submitCount = 0;
  private _listener!: () => void;

  override initState(): void {
    super.initState();
    this._controller = new TextEditingController();
    this._listener = () => {
      if (this.mounted) this.setState();
    };
    this._controller.addListener(this._listener);
  }

  override dispose(): void {
    this._controller.removeListener(this._listener);
    this._controller.dispose();
    super.dispose();
  }

  private _handleSubmit = (text: string): void => {
    this.setState(() => {
      this._lastSubmitted = text || "(empty)";
      this._submitCount += 1;
      this._controller.text = "";
    });
  };

  private _handleOuterKey = (event: KeyEvent): KeyEventResult => {
    // Ctrl+C to quit
    if (event.key === "c" && event.modifiers.ctrl) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    return "ignored";
  };

  build(_context: BuildContext): Widget {
    const ctrl = this._controller;
    const cursorPos = ctrl.cursorPosition;
    const graphemeCount = ctrl.graphemes.length;
    const lineCount = ctrl.lineCount;

    // Header
    const header = new Padding({
      padding: EdgeInsets.symmetric({ vertical: 0, horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " TextField Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.rgb(100, 200, 100),
              }),
            }),
            new TextSpan({
              text: "  Enter to submit, Ctrl+C to quit",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
          ],
        }),
      }),
    });

    // TextField section
    const textFieldSection = new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(Color.rgb(80, 120, 200), 1, "rounded")),
      }),
      padding: EdgeInsets.all(1),
      child: new TextField({
        controller: this._controller,
        autofocus: true,
        maxLines: 1,
        minLines: 1,
        cursorColor: Color.rgb(100, 200, 100),
        selectionColor: Color.rgb(50, 80, 150),
        onSubmitted: this._handleSubmit,
      }),
    });

    // Stats row
    const statsSection = new Padding({
      padding: EdgeInsets.only({ top: 1, left: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: "Cursor: ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: `${cursorPos}`,
              style: new TextStyle({ foreground: Color.rgb(100, 200, 100), bold: true }),
            }),
            new TextSpan({
              text: "  Graphemes: ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: `${graphemeCount}`,
              style: new TextStyle({ foreground: Color.rgb(100, 200, 100), bold: true }),
            }),
            new TextSpan({
              text: "  Lines: ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: `${lineCount}`,
              style: new TextStyle({ foreground: Color.rgb(100, 200, 100), bold: true }),
            }),
          ],
        }),
      }),
    });

    // Last submitted
    const submittedSection = new Padding({
      padding: EdgeInsets.only({ top: 1, left: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: `Submitted (${this._submitCount}x): `,
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: this._lastSubmitted.slice(0, 60),
              style: new TextStyle({
                foreground: Color.rgb(255, 200, 100),
                bold: true,
              }),
            }),
          ],
        }),
      }),
    });

    // Keybindings footer
    const footer = new Padding({
      padding: EdgeInsets.only({ top: 1, left: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Enter ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(100, 200, 100) }),
            }),
            new TextSpan({
              text: "submit  ",
              style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
            }),
            new TextSpan({
              text: " ↑↓←→ ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(100, 200, 100) }),
            }),
            new TextSpan({
              text: "navigate  ",
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
      autofocus: false,
      onKey: this._handleOuterKey,
      child: new Column({
        children: [
          header,
          new Padding({
            padding: EdgeInsets.all(1),
            child: new Column({
              children: [textFieldSection, statsSection, submittedSection, footer],
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

await runApp(new TextFieldDemo());
