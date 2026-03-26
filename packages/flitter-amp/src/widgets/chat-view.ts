// ChatView — scrollable conversation view rendering messages, tool calls, and plans
// Amp ref: $uH (thread view), Sa (user msg), XkL (assistant msg)
// User messages: left border only (2px green, italic green text), NO label
// Assistant messages: no border, no label, plain markdown

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { Markdown } from 'flitter-core/src/widgets/markdown';
import { Container } from 'flitter-core/src/widgets/container';
import { Border, BorderSide, BoxDecoration } from 'flitter-core/src/layout/render-decorated';
import { ToolCallBlock } from './tool-call-block';
import { ThinkingBlock } from './thinking-block';
import { PlanView } from './plan-view';
import type { ConversationItem } from '../acp/types';

// Amp-style ASCII art logo
const AMP_LOGO = [
  '    _    __  __ ____  ',
  '   / \\  |  \\/  |  _ \\ ',
  '  / _ \\ | |\\/| | |_) |',
  ' / ___ \\| |  | |  __/ ',
  '/_/   \\_\\_|  |_|_|    ',
];

// Inspirational quotes shown on welcome screen (Amp rotates these)
const QUOTES = [
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"Simplicity is the ultimate sophistication." — Leonardo da Vinci',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke',
];

interface ChatViewProps {
  items: ConversationItem[];
  error?: string | null;
}

export class ChatView extends StatelessWidget {
  private readonly items: ConversationItem[];
  private readonly error: string | null;

  constructor(props: ChatViewProps) {
    super({});
    this.items = props.items;
    this.error = props.error ?? null;
  }

  build(): Widget {
    if (this.items.length === 0) {
      return this.buildWelcomeScreen();
    }

    const children: Widget[] = [];

    // Error banner at the top of chat
    if (this.error) {
      children.push(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          child: new Text({
            text: new TextSpan({
              text: `Error: ${this.error}`,
              style: new TextStyle({ foreground: Color.red, bold: true }),
            }),
          }),
        })
      );
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      // Amp ref: 1-line gap between messages (new YH({height: 1}))
      if (i > 0) {
        children.push(new SizedBox({ height: 1 }));
      }

      switch (item.type) {
        case 'user_message':
          children.push(this.buildUserMessage(item.text));
          break;

        case 'assistant_message':
          children.push(this.buildAssistantMessage(item.text, item.isStreaming));
          break;

        case 'tool_call':
          children.push(new ToolCallBlock({ item }));
          break;

        case 'thinking':
          children.push(new ThinkingBlock({ item }));
          break;

        case 'plan':
          children.push(new PlanView({ entries: item.entries }));
          break;
      }
    }

    // Amp ref: 1 line bottom margin handled by outer padding in app.ts

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children,
    });
  }

  private buildWelcomeScreen(): Widget {
    // Pick a deterministic quote based on the day
    const dayIndex = Math.floor(Date.now() / 86400000) % QUOTES.length;
    const quote = QUOTES[dayIndex];

    const lines: Widget[] = [];

    // ASCII art logo in green
    for (const line of AMP_LOGO) {
      lines.push(new Text({
        text: new TextSpan({
          text: line,
          style: new TextStyle({ foreground: Color.green, bold: true }),
        }),
        textAlign: 'center',
      }));
    }

    lines.push(new SizedBox({ height: 1 }));

    // "Welcome to Amp" title
    lines.push(new Text({
      text: new TextSpan({
        text: 'Welcome to Amp',
        style: new TextStyle({ foreground: Color.green, bold: true }),
      }),
      textAlign: 'center',
    }));

    lines.push(new SizedBox({ height: 1 }));

    // Help hint — Amp: "Ctrl+O" keybind(blue), " for " dim, "help" command(yellow)
    lines.push(new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: 'Ctrl+O',
            style: new TextStyle({ foreground: Color.blue }),
          }),
          new TextSpan({
            text: ' for ',
            style: new TextStyle({ foreground: Color.defaultColor, dim: true }),
          }),
          new TextSpan({
            text: 'help',
            style: new TextStyle({ foreground: Color.yellow }),
          }),
        ],
      }),
      textAlign: 'center',
    }));

    lines.push(new SizedBox({ height: 1 }));

    // Inspirational quote
    lines.push(new Text({
      text: new TextSpan({
        text: quote,
        style: new TextStyle({ dim: true, italic: true }),
      }),
      textAlign: 'center',
    }));

    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 4, horizontal: 2 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'center',
        children: lines,
      }),
    });
  }

  // Amp ref: Sa widget — left border 2px success/green, italic green text, NO label
  private buildUserMessage(text: string): Widget {
    return new Container({
      decoration: new BoxDecoration({
        border: new Border({
          left: new BorderSide({ color: Color.green, width: 2, style: 'solid' }),
        }),
      }),
      padding: EdgeInsets.only({ left: 1 }),
      child: new Text({
        text: new TextSpan({
          text: text,
          style: new TextStyle({
            foreground: Color.green,
            italic: true,
          }),
        }),
      }),
    });
  }

  // Amp ref: XkL function — no border, no label, just markdown directly
  private buildAssistantMessage(text: string, _isStreaming: boolean): Widget {
    if (text.length > 0) {
      return new Markdown({ markdown: text });
    }
    // Placeholder while streaming hasn't produced text yet
    return new Text({
      text: new TextSpan({
        text: '...',
        style: new TextStyle({ foreground: Color.brightBlack }),
      }),
    });
  }
}
