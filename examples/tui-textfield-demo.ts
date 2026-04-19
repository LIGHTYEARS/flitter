/**
 * TUI TextField Demo — live text input showcase.
 *
 * Demonstrates TextField with TextEditingController, FocusNode,
 * placeholder text, read-only mode, and onSubmitted callback.
 *
 * - 3 text fields: name input, message input, read-only field
 * - Tab to switch between fields
 * - Enter to submit (logged below)
 * - Emacs key bindings (Ctrl+A/E/K/U/W/Y, Alt+f/b/d)
 * - Mouse click to position cursor, double-click to select word
 *
 * Run: bun run examples/tui-textfield-demo.ts
 * Press Ctrl+C to quit.
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { TextEditingController } from "../packages/tui/src/editing/text-editing-controller.js";
import { TextField } from "../packages/tui/src/editing/text-field.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Padding } from "../packages/tui/src/widgets/padding.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class TextFieldDemo extends StatefulWidget {
  createState(): State {
    return new TextFieldDemoState();
  }
}

const MAX_LOG_LINES = 8;

class TextFieldDemoState extends State<TextFieldDemo> {
  private nameCtrl!: TextEditingController;
  private messageCtrl!: TextEditingController;
  private readOnlyCtrl!: TextEditingController;
  private logLines: string[] = [];

  override initState(): void {
    super.initState();
    this.nameCtrl = new TextEditingController();
    this.messageCtrl = new TextEditingController();
    this.readOnlyCtrl = new TextEditingController({
      text: "This field is read-only. You can select text but not edit it.",
    });
  }

  override dispose(): void {
    this.nameCtrl.dispose();
    this.messageCtrl.dispose();
    this.readOnlyCtrl.dispose();
    super.dispose();
  }

  private _addLog(entry: string): void {
    this.logLines.push(entry);
    if (this.logLines.length > MAX_LOG_LINES) {
      this.logLines.shift();
    }
  }

  private _buildFieldLabel(label: string): Widget {
    return new Padding({
      padding: EdgeInsets.only({ bottom: 0, left: 1 }),
      child: new Text({
        data: label,
        style: new TextStyle({ foreground: Color.brightCyan(), bold: true }),
      }),
    }) as unknown as Widget;
  }

  private _buildFieldContainer(child: Widget): Widget {
    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Container({
        decoration: new BoxDecoration({ color: Color.rgb(30, 30, 40) }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child,
      }),
    }) as unknown as Widget;
  }

  build(_context: BuildContext): WidgetInterface {
    // Name field
    const nameField = new TextField({
      controller: this.nameCtrl,
      placeholder: "Type your name...",
      autofocus: true,
      textStyle: new TextStyle({ foreground: Color.white() }),
      cursorColor: Color.brightCyan(),
      backgroundColor: Color.rgb(30, 30, 40),
      onSubmitted: (text: string) => {
        this.setState(() => {
          this._addLog(`Name submitted: "${text}"`);
          this.nameCtrl.text = "";
        });
      },
    });

    // Message field
    const messageField = new TextField({
      controller: this.messageCtrl,
      placeholder: "Type a message and press Enter...",
      textStyle: new TextStyle({ foreground: Color.white() }),
      cursorColor: Color.yellow(),
      backgroundColor: Color.rgb(30, 30, 40),
      onSubmitted: (text: string) => {
        this.setState(() => {
          this._addLog(`Message: "${text}"`);
          this.messageCtrl.text = "";
        });
      },
    });

    // Read-only field
    const readOnlyField = new TextField({
      controller: this.readOnlyCtrl,
      readOnly: true,
      textStyle: new TextStyle({ foreground: Color.rgb(160, 160, 160) }),
      backgroundColor: Color.rgb(25, 25, 30),
    });

    // Log area
    const logWidgets: Widget[] = this.logLines.map(
      (line, _i) =>
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Text({
            data: `> ${line}`,
            style: new TextStyle({ foreground: Color.rgb(180, 220, 180) }),
          }),
        }) as unknown as Widget,
    );

    // Pad with empty lines if fewer than MAX_LOG_LINES
    while (logWidgets.length < MAX_LOG_LINES) {
      logWidgets.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Text({
            data: "",
            style: new TextStyle({ foreground: Color.rgb(60, 60, 60) }),
          }),
        }) as unknown as Widget,
      );
    }

    return new Column({
      children: [
        // Title bar
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new Text({
            data: " Flitter TextField Demo",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Instructions
        new Text({
          data: "  Tab  Switch fields  |  Enter  Submit  |  Ctrl+C  Quit",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,
        new Text({
          data: "  Ctrl+A/E  Home/End  |  Ctrl+K  Kill line  |  Ctrl+W  Delete word",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Field 1: Name
        this._buildFieldLabel("Name:"),
        this._buildFieldContainer(nameField as unknown as Widget),

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Field 2: Message
        this._buildFieldLabel("Message:"),
        this._buildFieldContainer(messageField as unknown as Widget),

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Field 3: Read-only
        this._buildFieldLabel("Read-Only:"),
        this._buildFieldContainer(readOnlyField as unknown as Widget),

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Log header
        new Padding({
          padding: EdgeInsets.only({ left: 1 }),
          child: new Text({
            data: "Submission Log:",
            style: new TextStyle({ foreground: Color.yellow(), bold: true }),
          }),
        }) as unknown as Widget,

        // Log entries
        ...logWidgets,

        // Fill remaining space
        new Expanded({
          child: new SizedBox() as unknown as Widget,
        }) as unknown as Widget,

        // Footer
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
          child: new Text({
            data: " TextField + TextEditingController + FocusNode | Emacs bindings",
            style: new TextStyle({ dim: true }),
          }),
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new TextFieldDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;

    binding.addKeyInterceptor((event) => {
      // Ctrl+C to quit
      if (event.key === "c" && event.modifiers.ctrl) {
        binding.stop();
        return true;
      }
      return false;
    });
  },
});
