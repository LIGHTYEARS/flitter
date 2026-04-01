// ChatView — scrollable conversation view rendering messages, tool calls, and plans
// Amp ref: $uH (thread view), Sa (user msg), XkL (assistant msg)
// Each user message is wrapped in a StickyHeader (header = "You" role label)
// Each assistant turn (thinking + markdown + tool calls) is wrapped in a StickyHeader

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column, Row } from 'flitter-core/src/widgets/flex';
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
import { StickyHeader } from 'flitter-core/src/widgets/sticky-header';
import { ToolCallWidget } from './tool-call/index';
import { resolveToolName, TOOL_NAME_MAP } from './tool-call/resolve-tool-name';
import { StreamingCursor } from './streaming-cursor';
import { ThinkingBlock } from './thinking-block';
import { PlanView } from './plan-view';
import { AmpThemeProvider } from '../themes/index';
import type { AmpTheme } from '../themes/index';
import type { ConversationItem } from '../acp/types';
import { DensityOrbWidget } from './density-orb-widget';
import { GlowText } from './glow-text';

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
  onToggleToolCall?: (toolCallId: string) => void;
}

export class ChatView extends StatelessWidget {
  private readonly items: ConversationItem[];
  private readonly error: string | null;
  private readonly onToggleToolCall?: (toolCallId: string) => void;

  constructor(props: ChatViewProps) {
    super({});
    this.items = props.items;
    this.error = props.error ?? null;
    this.onToggleToolCall = props.onToggleToolCall;
  }

  build(context: BuildContext): Widget {
    if (this.items.length === 0) {
      return this.buildWelcomeScreen(context);
    }

    const theme = AmpThemeProvider.maybeOf(context);
    const children: Widget[] = [];

    if (this.error) {
      children.push(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          child: new Text({
            text: new TextSpan({
              text: `Error: ${this.error}`,
              style: new TextStyle({ foreground: theme?.base.destructive ?? Color.red, bold: true }),
            }),
          }),
        })
      );
    }

    /**
     * Group consecutive assistant-related items (thinking, assistant_message,
     * tool_call) into "assistant turns". Each user_message and plan item
     * stands on its own. Each group becomes a StickyHeader block.
     */
    let i = 0;
    while (i < this.items.length) {
      const item = this.items[i];

      if (children.length > 0) {
        children.push(new SizedBox({ height: 1 }));
      }

      if (item.type === 'user_message') {
        children.push(this.buildUserStickyHeader(item.text, theme, item.interrupted));
        i++;
      } else if (item.type === 'plan') {
        children.push(new PlanView({ entries: item.entries }));
        i++;
      } else {
        const turnWidgets: Widget[] = [];
        while (i < this.items.length) {
          const cur = this.items[i];
          if (cur.type === 'thinking') {
            turnWidgets.push(new ThinkingBlock({ item: cur }));
            i++;
          } else if (cur.type === 'assistant_message') {
            turnWidgets.push(this.buildAssistantMessage(cur.text, cur.isStreaming, theme));
            i++;
          } else if (cur.type === 'tool_call' && cur.parentToolCallId) {
            i++;
            continue;
          } else if (cur.type === 'tool_call') {
            const toolCallId = cur.toolCallId;
            const rawName = resolveToolName(cur);
            const canonicalName = TOOL_NAME_MAP[rawName] ?? rawName;
            const isTask = canonicalName === 'Task' || rawName.startsWith('sa__') || rawName.startsWith('tb__');

            let childWidgets: Widget[] | undefined;
            if (isTask) {
              childWidgets = this.items
                .filter(
                  (it): it is typeof cur =>
                    it.type === 'tool_call' && it.parentToolCallId === toolCallId,
                )
                .map(child => new ToolCallWidget({
                  toolCall: child,
                  isExpanded: !child.collapsed,
                  onToggle: this.onToggleToolCall
                    ? () => this.onToggleToolCall!(child.toolCallId)
                    : undefined,
                }));
            }

            turnWidgets.push(new ToolCallWidget({
              toolCall: cur,
              isExpanded: !cur.collapsed,
              onToggle: this.onToggleToolCall
                ? () => this.onToggleToolCall!(toolCallId)
                : undefined,
              childWidgets,
            }));
            i++;
          } else {
            break;
          }
        }
        if (turnWidgets.length > 0) {
          children.push(this.buildAssistantStickyHeader(turnWidgets));
        }
      }
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children,
    });
  }

  /**
   * Renders a user message with a colored left border and italic text.
   * Uses warning (yellow) color when interrupted, success (green) otherwise.
   * Amp ref: no "You" label — just │ + italic colored text.
   */
  private buildUserStickyHeader(text: string, theme?: AmpTheme, interrupted?: boolean): Widget {
    const color = interrupted
      ? (theme?.base.warning ?? Color.yellow)
      : (theme?.base.success ?? Color.green);

    return new Container({
      decoration: new BoxDecoration({
        border: new Border({
          left: new BorderSide({ color, width: 2, style: 'solid' }),
        }),
      }),
      padding: EdgeInsets.only({ left: 1 }),
      child: new Text({
        text: new TextSpan({
          text: text,
          style: new TextStyle({
            foreground: color,
            italic: true,
          }),
        }),
      }),
    });
  }

  /**
   * Wraps a group of assistant-turn widgets in a StickyHeader with an empty header.
   */
  private buildAssistantStickyHeader(turnWidgets: Widget[]): Widget {
    const header = SizedBox.shrink();

    const body = turnWidgets.length === 1
      ? turnWidgets[0]
      : new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'stretch',
          children: turnWidgets,
        });

    return new StickyHeader({ header, body });
  }

  private buildWelcomeScreen(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const dayIndex = Math.floor(Date.now() / 86400000) % QUOTES.length;
    const quote = QUOTES[dayIndex];

    const orbWidget = new DensityOrbWidget();

    const successColor = theme?.base.success ?? Color.green;
    const keybindColor = theme?.app.keybind ?? Color.blue;
    const warningColor = theme?.base.warning ?? Color.yellow;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const fgColor = theme?.base.foreground ?? Color.defaultColor;

    const textContent = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children: [
        new GlowText({
          text: 'Welcome to Amp',
          baseColor: successColor,
          glowColor: Color.rgb(200, 255, 200),
          bold: true,
          glowIntensity: 0.4,
        }),

        new SizedBox({ height: 1 }),

        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: 'Ctrl+O',
                style: new TextStyle({ foreground: keybindColor }),
              }),
              new TextSpan({
                text: ' for help',
                style: new TextStyle({ foreground: warningColor }),
              }),
            ],
          }),
        }),

        new SizedBox({ height: 1 }),

        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: 'Use the ',
                style: new TextStyle({ foreground: mutedColor }),
              }),
              new TextSpan({
                text: 'settings: open in editor',
                style: new TextStyle({ foreground: fgColor }),
              }),
              new TextSpan({
                text: ' command to configure Amp',
                style: new TextStyle({ foreground: mutedColor }),
              }),
            ],
          }),
        }),

        new SizedBox({ height: 1 }),

        new Text({
          text: new TextSpan({
            text: quote,
            style: new TextStyle({ foreground: mutedColor, italic: true }),
          }),
        }),
      ],
    });

    const welcomeRow = new Row({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: [
        orbWidget,
        new SizedBox({ width: 2 }),
        textContent,
      ],
    });

    return new Column({
      mainAxisAlignment: 'center',
      crossAxisAlignment: 'center',
      children: [welcomeRow],
    });
  }

  /**
   * Renders an assistant message as Markdown, or a streaming placeholder.
   * Delegates to StreamingCursor for blink animation support.
   */
  private buildAssistantMessage(text: string, isStreaming: boolean, _theme?: AmpTheme): Widget {
    return new StreamingCursor({ text, isStreaming });
  }
}
