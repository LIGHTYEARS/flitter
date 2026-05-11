/**
 * TUI Chat Demo — markdown-enabled chat interface showcase.
 *
 * Demonstrates TextField for input, Scrollable for message history,
 * MarkdownView for rich message display,
 * and auto-scroll to latest message.
 *
 * - Scrollable message list with colored bubbles
 * - Text input field at bottom
 * - Messages rendered with markdown formatting via MarkdownView Widget
 * - Type message + Enter to send (mock assistant replies)
 * - Pre-populated with sample messages
 *
 * Run: bun run examples/tui-chat-demo.ts
 * Keys: Enter send | q (when input empty) quit | Ctrl+C quit
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { TextEditingController } from "../packages/tui/src/editing/text-editing-controller.js";
import { TextField } from "../packages/tui/src/editing/text-field.js";
import { MarkdownView } from "../packages/tui/src/markdown/markdown-view.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { ScrollController } from "../packages/tui/src/scroll/scroll-controller.js";
import { Scrollable, ScrollViewport } from "../packages/tui/src/scroll/scrollable.js";
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
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Message model
// ════════════════════════════════════════════════════

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CANNED_RESPONSES: string[] = [
  "That's a great question! Here's what I think:\n\n1. **First**, consider the architecture\n2. **Second**, write tests\n3. **Third**, iterate on the design",
  "I can help with that. Here's a quick example:\n\n```typescript\nconst greeting = 'Hello, world!';\nconsole.log(greeting);\n```\n\nThis demonstrates a basic TypeScript snippet.",
  "Here are some *key points* to consider:\n\n- Use `async/await` for cleaner code\n- Handle errors with **try/catch**\n- Always validate input",
  "Let me break this down:\n\n> The best code is code that doesn't need comments.\n\nThat said, **documentation** is still important for public APIs.",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  { role: "user", content: "What is Flitter?" },
  {
    role: "assistant",
    content:
      "**Flitter** is a *Flutter-for-Terminal* framework. It brings the widget tree model to TUI applications:\n\n- `StatefulWidget` + `State` lifecycle\n- Layout with `Row`, `Column`, `Expanded`\n- Rich text with `RichText` + `TextSpan`\n- Scroll, focus, and input handling",
  },
  { role: "user", content: "Show me a code example" },
  {
    role: "assistant",
    content:
      "Here's a minimal Flitter app:\n\n```typescript\nclass MyApp extends StatefulWidget {\n  createState() {\n    return new MyAppState();\n  }\n}\n```\n\nRun it with `bun run examples/your-app.ts`.",
  },
];

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class ChatDemo extends StatefulWidget {
  createState(): State {
    return new ChatDemoState();
  }
}

class ChatDemoState extends State<ChatDemo> {
  private _messages: ChatMessage[] = [...INITIAL_MESSAGES];
  private _inputCtrl!: TextEditingController;
  private _scrollCtrl!: ScrollController;
  private _responseIndex = 0;

  override initState(): void {
    super.initState();
    this._inputCtrl = new TextEditingController();
    this._scrollCtrl = new ScrollController();
  }

  override dispose(): void {
    this._inputCtrl.dispose();
    this._scrollCtrl.dispose();
    super.dispose();
  }

  private _sendMessage(text: string): void {
    if (!text.trim()) return;
    this.setState(() => {
      // Add user message
      this._messages.push({ role: "user", content: text });
      // Add canned assistant response
      const response = CANNED_RESPONSES[this._responseIndex % CANNED_RESPONSES.length]!;
      this._responseIndex++;
      this._messages.push({ role: "assistant", content: response });
      this._inputCtrl.text = "";
      // Scroll to bottom
      if (this._scrollCtrl.maxScrollExtent > 0) {
        this._scrollCtrl.jumpTo(this._scrollCtrl.maxScrollExtent + 20);
      }
    });
  }

  // ────────────────────────────────────────────────────
  //  Message bubble
  // ────────────────────────────────────────────────────

  private _buildMessageBubble(msg: ChatMessage): Widget {
    const isUser = msg.role === "user";
    const bgColor = isUser ? Color.rgb(30, 50, 80) : Color.rgb(35, 35, 45);
    const labelColor = isUser ? Color.cyan() : Color.green();
    const label = isUser ? "You" : "Assistant";

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1, vertical: 0 }),
      child: new Container({
        decoration: new BoxDecoration({ color: bgColor }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Column({
          children: [
            // Role label
            new Text({
              data: label,
              style: new TextStyle({ foreground: labelColor, bold: true }),
            }) as unknown as Widget,
            // Message content (rendered markdown via MarkdownView)
            new MarkdownView({ content: msg.content }) as unknown as Widget,
          ],
        }),
      }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Message list
  // ────────────────────────────────────────────────────

  private _buildMessageList(): Widget {
    const msgWidgets: Widget[] = [];
    for (let i = 0; i < this._messages.length; i++) {
      const msg = this._messages[i]!;
      msgWidgets.push(this._buildMessageBubble(msg));
      if (i < this._messages.length - 1) {
        msgWidgets.push(new SizedBox({ height: 1 }) as unknown as Widget);
      }
    }

    return new Scrollable({
      controller: this._scrollCtrl,
      viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
        new ScrollViewport({
          controller: ctrl,
          child: new Column({ children: msgWidgets }),
        }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Input area
  // ────────────────────────────────────────────────────

  private _buildInput(): Widget {
    return new Container({
      decoration: new BoxDecoration({ color: Color.rgb(25, 25, 35) }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({
        children: [
          new Text({
            data: "> ",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }) as unknown as Widget,
          new Expanded({
            child: new TextField({
              controller: this._inputCtrl,
              placeholder: "Type a message... (Enter to send, q when empty to quit)",
              autofocus: true,
              textStyle: new TextStyle({ foreground: Color.white() }),
              cursorColor: Color.brightCyan(),
              backgroundColor: Color.rgb(25, 25, 35),
              onSubmitted: (text: string) => {
                // If input is "q", quit
                if (text.trim() === "q") {
                  WidgetsBinding.instance.stop();
                  return;
                }
                this._sendMessage(text);
              },
            }),
          }) as unknown as Widget,
        ],
      }),
    }) as unknown as Widget;
  }

  // ────────────────────────────────────────────────────
  //  Build
  // ────────────────────────────────────────────────────

  build(_context: BuildContext): WidgetInterface {
    const msgCount = this._messages.length;

    return new Column({
      children: [
        // Title bar
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
          child: new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: " Flitter Chat",
                  style: new TextStyle({ foreground: Color.cyan(), bold: true }),
                }),
                new TextSpan({
                  text: `  ${msgCount} messages`,
                  style: new TextStyle({ foreground: Color.rgb(140, 140, 140) }),
                }),
              ],
            }),
          }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Help line
        new Text({
          data: "  Enter  Send  |  Type q + Enter  Quit  |  Ctrl+C  Quit",
          style: new TextStyle({ foreground: Color.green() }),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Message list
        new Expanded({
          child: this._buildMessageList(),
        }) as unknown as Widget,

        new SizedBox({ height: 1 }) as unknown as Widget,

        // Input field
        this._buildInput(),

        // Footer
        new Container({
          width: 240,
          height: 1,
          decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
          child: new Text({
            data: " TextField + MarkdownView | Scrollable auto-scroll",
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

await runApp(new ChatDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (event.key === "c" && event.modifiers.ctrl) {
        binding.stop();
        return true;
      }
      return false;
    });
  },
});
