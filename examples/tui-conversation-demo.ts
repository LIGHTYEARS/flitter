/**
 * TUI Conversation Demo — ConversationView with mock messages and tool items.
 *
 * Displays a mock conversation thread with user messages, assistant responses,
 * and tool-use items (Read, Grep, Edit). Type a message and press Enter to
 * add it to the conversation (echoed back by a mock assistant).
 *
 * Run: bun run examples/tui-conversation-demo.ts
 * Keys: q quit | type + Enter to add messages
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { Widget } from "../packages/tui/src/tree/widget.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { StatusBar } from "../packages/cli/src/widgets/status-bar.js";
import type { StatusBarState } from "../packages/cli/src/widgets/status-bar.js";
import { InputField } from "../packages/cli/src/widgets/input-field.js";
import { ConversationView } from "../packages/cli/src/widgets/conversation-view.js";
import { transformThreadToDisplayItems } from "../packages/cli/src/widgets/display-items.js";
import type { DisplayItem } from "../packages/cli/src/widgets/display-items.js";
import { PromptHistory } from "../packages/cli/src/widgets/prompt-history.js";

// ════════════════════════════════════════════════════
//  Mock data
// ════════════════════════════════════════════════════

function buildMockConversation(): DisplayItem[] {
  const messages = [
    {
      role: "user" as const,
      content: [{ type: "text" as const, text: "Fix the bug in src/app.ts" }],
    },
    {
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Looking at the code..." },
        {
          type: "tool_use" as const,
          id: "tu_1",
          name: "Read",
          input: { file_path: "src/app.ts" },
          complete: true,
        },
        {
          type: "tool_use" as const,
          id: "tu_2",
          name: "Grep",
          input: { pattern: "BUG" },
          complete: true,
        },
      ],
      state: { type: "complete" as const },
    },
    {
      role: "user" as const,
      content: [
        {
          type: "tool_result" as const,
          toolUseID: "tu_1",
          run: { status: "done" as const, result: "function calc(a, b) { return a + b; }" },
        },
        {
          type: "tool_result" as const,
          toolUseID: "tu_2",
          run: { status: "done" as const, result: "src/app.ts:1: // BUG" },
        },
      ],
    },
    {
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Found it. Fixing `+` to `*`." },
        {
          type: "tool_use" as const,
          id: "tu_3",
          name: "Edit",
          input: { file_path: "src/app.ts", old_string: "a + b", new_string: "a * b" },
          complete: true,
        },
      ],
      state: { type: "complete" as const },
    },
    {
      role: "user" as const,
      content: [
        {
          type: "tool_result" as const,
          toolUseID: "tu_3",
          run: { status: "done" as const, result: "OK" },
        },
      ],
    },
    {
      role: "assistant" as const,
      content: [
        { type: "text" as const, text: "Bug fixed. Changed addition to multiplication." },
      ],
      state: { type: "complete" as const },
    },
  ];
  return transformThreadToDisplayItems(messages);
}

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

const TITLE_BG = Color.rgb(30, 60, 100);
const TITLE_FG = Color.cyan();
const HINT_FG = Color.rgb(0x56, 0x5f, 0x89);

const IDLE_STATUS: StatusBarState = {
  modelName: "claude-opus-4-6",
  inferenceState: "idle",
  hasStartedStreaming: false,
  tokenUsage: { inputTokens: 1200, outputTokens: 340, maxInputTokens: 200000 },
  compactionState: "idle",
  runningToolCount: 0,
  waitingForApproval: false,
};

// ════════════════════════════════════════════════════
//  Root Widget
// ════════════════════════════════════════════════════

class ConversationDemo extends StatefulWidget {
  createState(): State {
    return new ConversationDemoState();
  }
}

class ConversationDemoState extends State<ConversationDemo> {
  private displayItems: DisplayItem[] = buildMockConversation();
  private promptHistory = new PromptHistory();

  build(_context: BuildContext): WidgetInterface {
    return new Column({
      children: [
        // Title bar
        new Container({
          height: 1,
          decoration: new BoxDecoration({ color: TITLE_BG }),
          child: new Text({
            data: " Flitter ConversationView Demo",
            style: new TextStyle({ foreground: TITLE_FG, bold: true }),
          }),
        }) as unknown as Widget,
        new RichText({
          text: new TextSpan({
            text: " Type a message + Enter to echo | q quit",
            style: new TextStyle({ foreground: HINT_FG, dim: true }),
          }),
        }) as unknown as Widget,
        new SizedBox({ height: 1 }) as unknown as Widget,

        // Conversation
        new Expanded({
          child: new ConversationView({
            items: this.displayItems,
            inferenceState: "idle",
            error: null,
          }),
        }) as unknown as Widget,

        // Separator + status bar
        new SizedBox({
          height: 1,
          child: new Text({ data: "\u2500".repeat(80) }),
        }) as unknown as Widget,
        new StatusBar({ state: IDLE_STATUS }) as unknown as Widget,
        new SizedBox({
          height: 1,
          child: new Text({ data: "\u2500".repeat(80) }),
        }) as unknown as Widget,

        // Input
        new InputField({
          onSubmit: (text) => {
            if (text.trim()) {
              this.setState(() => {
                this.displayItems = [
                  ...this.displayItems,
                  { type: "message", role: "user", text: text.trim() },
                  { type: "message", role: "assistant", text: `(Echo) You said: "${text.trim()}"` },
                ];
              });
            }
          },
          promptHistory: this.promptHistory,
          placeholder: "Type a message...",
        }) as unknown as Widget,
      ],
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  Launch
// ════════════════════════════════════════════════════

await runApp(new ConversationDemo() as unknown as WidgetInterface, {
  onRootElementMounted: () => {
    const binding = WidgetsBinding.instance;
    binding.addKeyInterceptor((event) => {
      if (event.key === "q" && !event.modifiers.ctrl && !event.modifiers.alt) {
        binding.stop();
        return true;
      }
      return false;
    });
  },
});
