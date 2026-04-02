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
import { toolStatusIcon } from '../ui/icons/icon-registry';

const SUGGESTIONS: Array<{ text: string; type: 'command' | 'hint' | 'prompt' | 'quote' }> = [
  { text: '"The best way to predict the future is to invent it." — Alan Kay', type: 'quote' },
  { text: '"Simplicity is the ultimate sophistication." — Leonardo da Vinci', type: 'quote' },
  { text: '"Talk is cheap. Show me the code." — Linus Torvalds', type: 'quote' },
  { text: '"First, solve the problem. Then, write the code." — John Johnson', type: 'quote' },
  { text: '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke', type: 'quote' },
  { text: '"Programs must be written for people to read." — Abelson & Sussman', type: 'quote' },
  { text: '"Make it work, make it right, make it fast." — Kent Beck', type: 'quote' },
  { text: '"The only way to go fast is to go well." — Robert C. Martin', type: 'quote' },
  { text: 'Ctrl+O — Open command palette', type: 'command' },
  { text: 'Ctrl+L — Clear conversation', type: 'command' },
  { text: 'Ctrl+C — Cancel current operation', type: 'command' },
  { text: 'Ctrl+G — Open prompt in $EDITOR', type: 'command' },
  { text: 'Ctrl+R — Reverse search history', type: 'command' },
  { text: 'Ctrl+S — Cycle agent mode', type: 'command' },
  { text: 'Alt+T — Toggle tool call expansion', type: 'command' },
  { text: 'Alt+D — Toggle deep reasoning', type: 'command' },
  { text: '? — Show shortcut help', type: 'command' },
  { text: 'Use @ to mention files in your prompt', type: 'hint' },
  { text: 'Use $ prefix for shell commands', type: 'hint' },
  { text: 'Use $$ prefix for background shell', type: 'hint' },
  { text: 'Tab/Shift+Tab navigates through messages', type: 'hint' },
  { text: 'Press e on a selected message to edit', type: 'hint' },
  { text: 'Press r on a selected message to restore', type: 'hint' },
  { text: 'ArrowUp/Down navigates prompt history', type: 'hint' },
  { text: 'Dense view mode collapses tool calls', type: 'hint' },
  { text: 'Explain this codebase architecture', type: 'prompt' },
  { text: 'Find and fix bugs in the current file', type: 'prompt' },
  { text: 'Write tests for the untested functions', type: 'prompt' },
  { text: 'Refactor this module to reduce complexity', type: 'prompt' },
  { text: 'Add error handling to the API endpoints', type: 'prompt' },
  { text: 'Review the recent changes for issues', type: 'prompt' },
  { text: 'Generate a migration script for the schema', type: 'prompt' },
];

interface ChatViewProps {
  items: readonly ConversationItem[];
  selectedMessageIndex?: number | null;
  error?: string | null;
  onToggleToolCall?: (toolCallId: string) => void;
  denseView?: boolean;
}

export class ChatView extends StatelessWidget {
  private readonly items: readonly ConversationItem[];
  private readonly error: string | null;
  private readonly onToggleToolCall?: (toolCallId: string) => void;
  private readonly selectedMessageIndex: number | null;
  private readonly denseView: boolean;

  constructor(props: ChatViewProps) {
    super({});
    this.items = props.items;
    this.error = props.error ?? null;
    this.onToggleToolCall = props.onToggleToolCall;
    this.selectedMessageIndex = props.selectedMessageIndex ?? null;
    this.denseView = props.denseView ?? false;
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
        children.push(this.buildUserStickyHeader(item.text, theme, item.interrupted, i === this.selectedMessageIndex, item.images));
        i++;
      } else if (item.type === 'plan') {
        children.push(new PlanView({ entries: item.entries }));
        i++;
      } else if (item.type === 'system_message') {
        children.push(this.buildSystemMessage(item.text, theme));
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

            if (this.denseView) {
              turnWidgets.push(this.buildDenseToolCall(cur, canonicalName));
              i++;
              continue;
            }

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
  private buildUserStickyHeader(text: string, theme?: AmpTheme, interrupted?: boolean, isSelected?: boolean, images?: Array<{ filename: string }>): Widget {
    const borderColor = isSelected
      ? (theme?.base.info ?? Color.brightCyan)
      : interrupted
        ? (theme?.base.warning ?? Color.yellow)
        : (theme?.base.success ?? Color.green);
    const textColor = interrupted
      ? (theme?.base.warning ?? Color.yellow)
      : (theme?.base.success ?? Color.green);

    const contentChildren: Widget[] = [
      new Text({
        text: new TextSpan({
          text: text,
          style: new TextStyle({
            foreground: textColor,
            italic: true,
            bold: isSelected ? true : undefined,
          }),
        }),
      }),
    ];

    if (images && images.length > 0) {
      const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
      const filenames = images.map(img => img.filename).join(', ');
      contentChildren.push(
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: `\u{1F4CE} ${images.length} image${images.length > 1 ? 's' : ''}: `,
                style: new TextStyle({ foreground: mutedColor, dim: true }),
              }),
              new TextSpan({
                text: filenames,
                style: new TextStyle({ foreground: mutedColor, dim: true, italic: true }),
              }),
            ],
          }),
        }),
      );
    }

    const child = contentChildren.length === 1
      ? contentChildren[0]
      : new Column({
          mainAxisSize: 'min',
          crossAxisAlignment: 'stretch',
          children: contentChildren,
        });

    return new Container({
      decoration: new BoxDecoration({
        border: new Border({
          left: new BorderSide({ color: borderColor, width: isSelected ? 3 : 2, style: 'solid' }),
        }),
      }),
      padding: EdgeInsets.only({ left: 1 }),
      child,
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

  private buildDenseToolCall(toolCall: ConversationItem & { type: 'tool_call' }, name: string): Widget {
    const statusIcon = toolStatusIcon(toolCall.status);
    const statusLabel = toolCall.status === 'completed' ? 'done'
      : toolCall.status === 'failed' ? 'fail'
      : toolCall.status;
    return new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: `${statusIcon} `,
            style: new TextStyle({
              foreground: toolCall.status === 'completed' ? Color.green
                : toolCall.status === 'failed' ? Color.red
                : Color.yellow,
            }),
          }),
          new TextSpan({
            text: name,
            style: new TextStyle({ foreground: Color.cyan, bold: true }),
          }),
          new TextSpan({
            text: ` ${statusLabel}`,
            style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
          }),
        ],
      }),
    });
  }

  private buildWelcomeScreen(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const dayIndex = Math.floor(Date.now() / 86400000) % SUGGESTIONS.length;

    const orbWidget = new DensityOrbWidget({ variant: 'welcome' });

    const successColor = theme?.base.success ?? Color.green;
    const keybindColor = theme?.app.keybind ?? Color.blue;
    const warningColor = theme?.base.warning ?? Color.yellow;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const fgColor = theme?.base.foreground ?? Color.defaultColor;

    const picks = this.pickSuggestions(dayIndex, 4);
    const suggestionWidgets: Widget[] = [];
    for (const s of picks) {
      suggestionWidgets.push(this.buildSuggestionItem(s, theme));
    }

    const headerBlock = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: [
        new Text({
          text: new TextSpan({
            text: 'Welcome to Amp',
            style: new TextStyle({ foreground: successColor, bold: true }),
          }),
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
      ],
    });

    const suggestionsBlock = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children: suggestionWidgets,
    });

    const textContent = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: [
        headerBlock,
        new SizedBox({ height: 1 }),
        suggestionsBlock,
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

  private pickSuggestions(seed: number, count: number): Array<typeof SUGGESTIONS[number]> {
    const result: Array<typeof SUGGESTIONS[number]> = [];
    const used = new Set<number>();
    let idx = seed;
    while (result.length < count && used.size < SUGGESTIONS.length) {
      idx = (idx * 7 + 13) % SUGGESTIONS.length;
      if (!used.has(idx)) {
        used.add(idx);
        result.push(SUGGESTIONS[idx]);
      }
    }
    return result;
  }

  private buildSuggestionItem(
    s: { text: string; type: 'command' | 'hint' | 'prompt' | 'quote' },
    theme?: AmpTheme,
  ): Widget {
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    let color: Color;
    let prefix: string;
    switch (s.type) {
      case 'command':
        color = theme?.app.keybind ?? Color.blue;
        prefix = '⌘ ';
        break;
      case 'hint':
        color = theme?.base.warning ?? Color.yellow;
        prefix = '💡 ';
        break;
      case 'prompt':
        color = theme?.base.success ?? Color.green;
        prefix = '▸ ';
        break;
      case 'quote':
        color = mutedColor;
        prefix = '';
        break;
    }
    return new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: prefix,
            style: new TextStyle({ foreground: color }),
          }),
          new TextSpan({
            text: s.text,
            style: new TextStyle({
              foreground: color,
              italic: s.type === 'quote',
              dim: s.type === 'quote',
            }),
          }),
        ],
      }),
    });
  }

  /**
   * Renders a system message (e.g., reconnection separator) with dim styling
   * and a horizontal rule.
   */
  private buildSystemMessage(text: string, theme?: AmpTheme): Widget {
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        new Text({
          text: new TextSpan({
            text: '─'.repeat(40),
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        }),
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Text({
            text: new TextSpan({
              text,
              style: new TextStyle({ foreground: mutedColor, dim: true, italic: true }),
            }),
          }),
        }),
        new Text({
          text: new TextSpan({
            text: '─'.repeat(40),
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        }),
      ],
    });
  }

  /**
   * Renders an assistant message as Markdown, or a streaming placeholder.
   * Delegates to StreamingCursor for blink animation support.
   */
  private buildAssistantMessage(text: string, isStreaming: boolean, _theme?: AmpTheme): Widget {
    if (!isStreaming && text.includes("You're absolutely right")) {
      return this.buildRainbowMessage(text);
    }
    return new StreamingCursor({ text, isStreaming });
  }

  private buildRainbowMessage(text: string): Widget {
    const RAINBOW: Color[] = [
      Color.red,
      Color.yellow,
      Color.green,
      Color.cyan,
      Color.blue,
      Color.magenta,
    ];

    const spans: TextSpan[] = [];
    let colorIdx = 0;
    for (const char of text) {
      if (char === ' ' || char === '\n') {
        spans.push(new TextSpan({ text: char }));
      } else {
        spans.push(new TextSpan({
          text: char,
          style: new TextStyle({ foreground: RAINBOW[colorIdx % RAINBOW.length] }),
        }));
        colorIdx++;
      }
    }

    return new Text({
      text: new TextSpan({ children: spans }),
    });
  }
}
