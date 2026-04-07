// ContextAnalyzeOverlay — Context analysis modal with dependency analysis
//
// Matches AMP's isShowingContextAnalyzeModal and contextAnalyzeDeps pattern.
// Shows conversation analysis: message counts, tool call counts, and
// per-message token estimate breakdown.
//
// Key bindings:
//   Escape → dismiss overlay
//
// Modal overlay at CONTEXT_ANALYZE priority (50).

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import type { ConversationItem, UsageInfo } from '../state/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ContextAnalyzeOverlay widget. */
interface ContextAnalyzeOverlayProps {
  /** All conversation items in the current session. */
  items: readonly ConversationItem[];
  /** Current token usage data (may be null). */
  usage: UsageInfo | null;
  /** Callback to dismiss the overlay. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.magenta;
const LABEL_COLOR = Color.brightBlack;
const VALUE_COLOR = Color.white;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;
const SECTION_COLOR = Color.cyan;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple heuristic token estimate: ~4 characters per token.
 * Matches AMP's contextAnalyzeDeps per-message breakdown approach.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extract displayable text content from a conversation item for token estimation.
 */
function getItemText(item: ConversationItem): string {
  switch (item.type) {
    case 'user_message':
      return item.text ?? '';
    case 'assistant_message':
      return item.text ?? '';
    case 'tool_call':
      return (item.title ?? '') + (item.rawInput ? JSON.stringify(item.rawInput) : '') + (item.result?.rawOutput ? String(item.result.rawOutput) : '');
    case 'thinking':
      return item.text ?? '';
    case 'system_message':
      return item.text ?? '';
    case 'plan':
      return item.entries?.map((e: any) => e.title ?? '').join(' ') ?? '';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// ContextAnalyzeOverlay
// ---------------------------------------------------------------------------

/**
 * Context analysis modal showing conversation breakdown.
 *
 * Matches AMP's isShowingContextAnalyzeModal + contextAnalyzeDeps pattern.
 * Displays message counts, tool call counts, token estimates per type,
 * and a list of tools/files referenced as "dependencies."
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered magenta, padded, maxWidth: 55)
 *         Column
 *           "Context Analysis" title
 *           Summary stats section
 *           Per-type token breakdown
 *           Dependencies section
 *           Footer hints
 */
export class ContextAnalyzeOverlay extends StatelessWidget {
  private readonly items: readonly ConversationItem[];
  private readonly usage: UsageInfo | null;
  private readonly onDismiss: () => void;

  constructor(props: ContextAnalyzeOverlayProps) {
    super({});
    this.items = props.items;
    this.usage = props.usage;
    this.onDismiss = props.onDismiss;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const children: Widget[] = [];

    // Title
    children.push(
      new Text({
        text: new TextSpan({
          text: 'Context Analysis',
          style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
        }),
      }),
    );
    children.push(new SizedBox({ height: 1 }));

    // Count items by type
    let userCount = 0;
    let assistantCount = 0;
    let toolCallCount = 0;
    let thinkingCount = 0;
    const toolNames = new Set<string>();
    let userTokens = 0;
    let assistantTokens = 0;
    let toolTokens = 0;

    for (const item of this.items) {
      const text = getItemText(item);
      const tokens = estimateTokens(text);

      switch (item.type) {
        case 'user_message':
          userCount++;
          userTokens += tokens;
          break;
        case 'assistant_message':
          assistantCount++;
          assistantTokens += tokens;
          break;
        case 'tool_call':
          toolCallCount++;
          toolTokens += tokens;
          if (item.title) toolNames.add(item.title);
          break;
        case 'thinking':
          thinkingCount++;
          break;
      }
    }

    // Summary section
    children.push(
      new Text({
        text: new TextSpan({
          text: 'Summary',
          style: new TextStyle({ foreground: SECTION_COLOR, bold: true }),
        }),
      }),
    );

    const summaryRows: [string, string][] = [
      ['Messages', `${this.items.length} total`],
      ['User messages', `${userCount}`],
      ['Assistant messages', `${assistantCount}`],
      ['Tool calls', `${toolCallCount}`],
    ];

    if (thinkingCount > 0) {
      summaryRows.push(['Thinking blocks', `${thinkingCount}`]);
    }

    if (this.usage) {
      summaryRows.push(['Context used', `${this.usage.used.toLocaleString('en-US')} / ${this.usage.size.toLocaleString('en-US')}`]);
    }

    for (const [label, value] of summaryRows) {
      children.push(
        new Row({
          children: [
            new Text({
              text: new TextSpan({
                text: `  ${label}: `,
                style: new TextStyle({ foreground: LABEL_COLOR }),
              }),
            }),
            new Text({
              text: new TextSpan({
                text: value,
                style: new TextStyle({ foreground: VALUE_COLOR }),
              }),
            }),
          ],
        }),
      );
    }

    children.push(new SizedBox({ height: 1 }));

    // Token estimate breakdown
    children.push(
      new Text({
        text: new TextSpan({
          text: 'Token Estimates (chars/4)',
          style: new TextStyle({ foreground: SECTION_COLOR, bold: true }),
        }),
      }),
    );

    const tokenRows: [string, number][] = [
      ['User messages', userTokens],
      ['Assistant messages', assistantTokens],
      ['Tool calls', toolTokens],
    ];

    for (const [label, tokens] of tokenRows) {
      children.push(
        new Row({
          children: [
            new Text({
              text: new TextSpan({
                text: `  ${label}: `,
                style: new TextStyle({ foreground: LABEL_COLOR }),
              }),
            }),
            new Text({
              text: new TextSpan({
                text: `~${tokens.toLocaleString('en-US')}`,
                style: new TextStyle({ foreground: VALUE_COLOR }),
              }),
            }),
          ],
        }),
      );
    }

    // Dependencies section (tools used)
    if (toolNames.size > 0) {
      children.push(new SizedBox({ height: 1 }));
      children.push(
        new Text({
          text: new TextSpan({
            text: 'Tools Used',
            style: new TextStyle({ foreground: SECTION_COLOR, bold: true }),
          }),
        }),
      );

      for (const name of Array.from(toolNames).sort()) {
        children.push(
          new Text({
            text: new TextSpan({
              text: `  \u2022 ${name}`,
              style: new TextStyle({ foreground: VALUE_COLOR }),
            }),
          }),
        );
      }
    }

    // Footer
    children.push(new SizedBox({ height: 1 }));
    children.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' close',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
          ],
        }),
      }),
    );

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        // Absorb all keys while overlay is shown
        return 'handled';
      },
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 55 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children,
          }),
        }),
      }),
    });
  }
}
