/**
 * 示例 10: Actions + Shortcuts + Intent 系统演示
 *
 * 演示 Flitter 的命令分发架构:
 * - Intent: 纯数据标记类，描述用户意图
 * - Action: 知道如何执行一个 Intent
 * - Actions widget: 在 Widget 树中注册 Intent→Action 映射
 * - Shortcuts widget: 桥接 Focus 系统和 Actions 系统
 * - KeyActivator: 定义键盘快捷键组合
 *
 * 用法: bun run examples/10-actions-shortcuts-demo.ts
 * 按 Ctrl+R 重置, Ctrl+S 保存, Ctrl+N 新建, q 退出。
 */

import { Action } from "../src/actions/action.js";
import { Actions } from "../src/actions/actions.js";
import { Intent } from "../src/actions/intent.js";
import { KeyActivator } from "../src/actions/key-activator.js";
import { Shortcuts } from "../src/actions/shortcuts.js";
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
import { TextSpan } from "../src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Intent 定义
// ════════════════════════════════════════════════════

class ResetIntent extends Intent {}
class SaveIntent extends Intent {}
class NewItemIntent extends Intent {}

// ════════════════════════════════════════════════════
//  ActionsDemo — 主界面
// ════════════════════════════════════════════════════

class ActionsDemo extends StatefulWidget {
  createState(): State {
    return new ActionsDemoState();
  }
}

class ActionsDemoState extends State<ActionsDemo> {
  private _log: string[] = ["Welcome! Use shortcuts to trigger actions."];
  private _saveCount = 0;
  private _itemCount = 0;

  private _addLog(msg: string): void {
    this._log.push(msg);
    if (this._log.length > 15) this._log.shift();
  }

  // Action factories — need setState access
  makeResetAction(): Action<ResetIntent> {
    const state = this;
    return new (class extends Action<ResetIntent> {
      invoke(_intent: ResetIntent): "handled" {
        state.setState(() => {
          state._saveCount = 0;
          state._itemCount = 0;
          state._log = ["Counters reset via Ctrl+R"];
        });
        return "handled";
      }
    })();
  }

  makeSaveAction(): Action<SaveIntent> {
    const state = this;
    return new (class extends Action<SaveIntent> {
      invoke(_intent: SaveIntent): "handled" {
        state.setState(() => {
          state._saveCount++;
          state._addLog(`Save #${state._saveCount} triggered via Ctrl+S`);
        });
        return "handled";
      }
    })();
  }

  makeNewItemAction(): Action<NewItemIntent> {
    const state = this;
    return new (class extends Action<NewItemIntent> {
      invoke(_intent: NewItemIntent): "handled" {
        state.setState(() => {
          state._itemCount++;
          state._addLog(`New item #${state._itemCount} created via Ctrl+N`);
        });
        return "handled";
      }
    })();
  }

  handleQuit = (event: KeyEvent): KeyEventResult => {
    if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
      WidgetsBinding.instance.stop();
      return "handled";
    }
    return "ignored";
  };

  build(_context: BuildContext): Widget {
    // Build log display
    const logLines: Widget[] = this._log.map(
      (line, i) =>
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new RichText({
            text: new TextSpan({
              text: `  ${line}`,
              style: new TextStyle({
                foreground:
                  i === this._log.length - 1 ? Color.rgb(255, 255, 255) : Color.rgb(100, 100, 100),
              }),
            }),
          }),
        }),
    );

    // Header
    const header = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Actions + Shortcuts Demo ",
              style: new TextStyle({
                bold: true,
                foreground: Color.rgb(0, 0, 0),
                background: Color.rgb(200, 100, 255),
              }),
            }),
          ],
        }),
      }),
    });

    // Status bar
    const statusBar = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide(Color.rgb(80, 80, 80), 1, "rounded")),
        }),
        padding: EdgeInsets.all(1),
        child: new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: ` Saves: ${this._saveCount} `,
                style: new TextStyle({
                  bold: true,
                  foreground: Color.rgb(50, 200, 50),
                }),
              }),
              new TextSpan({
                text: "  |  ",
                style: new TextStyle({ foreground: Color.rgb(60, 60, 60) }),
              }),
              new TextSpan({
                text: ` Items: ${this._itemCount} `,
                style: new TextStyle({
                  bold: true,
                  foreground: Color.cyan(),
                }),
              }),
            ],
          }),
        }),
      }),
    });

    // Log area
    const logArea = new Column({ children: logLines });

    // Footer
    const footer = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: " Ctrl+S ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(200, 100, 255) }),
            }),
            new TextSpan({
              text: "save  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " Ctrl+N ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(200, 100, 255) }),
            }),
            new TextSpan({
              text: "new  ",
              style: new TextStyle({ foreground: Color.rgb(150, 150, 150) }),
            }),
            new TextSpan({
              text: " Ctrl+R ",
              style: new TextStyle({ bold: true, foreground: Color.rgb(200, 100, 255) }),
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

    // Shortcut bindings
    const shortcuts = new Map<KeyActivator, Intent>([
      [KeyActivator.ctrl("s"), new SaveIntent()],
      [KeyActivator.ctrl("n"), new NewItemIntent()],
      [KeyActivator.ctrl("r"), new ResetIntent()],
    ]);

    // Action registrations
    const actions = new Map<abstract new (...args: never[]) => Intent, Action>([
      [SaveIntent, this.makeSaveAction()],
      [NewItemIntent, this.makeNewItemAction()],
      [ResetIntent, this.makeResetAction()],
    ]);

    // Widget tree: Focus(quit) > Actions > Shortcuts > content
    return new Focus({
      onKey: this.handleQuit,
      child: new Actions({
        actions,
        child: new Shortcuts({
          shortcuts,
          child: new Focus({
            autofocus: true,
            child: new Column({
              children: [header, statusBar, new Expanded({ child: logArea }), footer],
            }),
          }),
        }),
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════

await runApp(new ActionsDemo());
