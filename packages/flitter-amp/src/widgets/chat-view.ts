// ChatView — scrollable conversation view rendering messages, tool calls, and plans
// Amp ref: Column of conversation items inside SingleChildScrollView

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
import { ToolCallBlock } from './tool-call-block';
import { ThinkingBlock } from './thinking-block';
import { PlanView } from './plan-view';
import type { ConversationItem } from '../acp/types';

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
      return new Padding({
        padding: EdgeInsets.all(2),
        child: new Text({
          text: new TextSpan({
            text: '  Type a message below to start.',
            style: new TextStyle({ foreground: Color.brightBlack }),
          }),
        }),
      });
    }

    const children: Widget[] = [];

    // Error banner at the top of chat
    if (this.error) {
      children.push(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          child: new Text({
            text: new TextSpan({
              text: `  Error: ${this.error}`,
              style: new TextStyle({ foreground: Color.red, bold: true }),
            }),
          }),
        })
      );
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

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

    // Add a spacer at the end for visual breathing room
    children.push(new SizedBox({ height: 1 }));

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children,
    });
  }

  private buildUserMessage(text: string): Widget {
    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 1, horizontal: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: [
          // "You" label in bold
          new Text({
            text: new TextSpan({
              text: '  You',
              style: new TextStyle({
                foreground: Color.brightWhite,
                bold: true,
              }),
            }),
          }),
          // User's text
          new Padding({
            padding: EdgeInsets.only({ left: 2 }),
            child: new Text({
              text: new TextSpan({
                text: `  ${text}`,
                style: new TextStyle({ foreground: Color.brightWhite }),
              }),
            }),
          }),
        ],
      }),
    });
  }

  private buildAssistantMessage(text: string, isStreaming: boolean): Widget {
    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: [
          // "Assistant" label with streaming indicator
          new Text({
            text: new TextSpan({
              text: isStreaming ? '  Assistant ●' : '  Assistant',
              style: new TextStyle({
                foreground: Color.magenta,
                bold: true,
              }),
            }),
          }),
          // Markdown-rendered response
          new Padding({
            padding: EdgeInsets.only({ left: 2, right: 2 }),
            child: text.length > 0
              ? new Markdown({ markdown: `  ${text}` })
              : new Text({
                  text: new TextSpan({
                    text: '  ...',
                    style: new TextStyle({ foreground: Color.brightBlack }),
                  }),
                }),
          }),
        ],
      }),
    });
  }
}
