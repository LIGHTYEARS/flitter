// ThinkingBlock — collapsible thinking/reasoning display
// Amp ref: zk widget
// Streaming: accent (magenta) with animated BrailleSpinner
// Done: success (green) with icon('tool.status.done')
// Cancelled: warning (yellow) with "(interrupted)"
// Content: dim, italic when expanded (rendered via Markdown for rich formatting)
// Chevron appears at end of the header line (AMP ref: expand-collapse-lT.js)

import {
  StatefulWidget, State, Widget, type BuildContext,
} from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { BrailleSpinner } from 'flitter-core/src/utilities/braille-spinner';
import { Markdown } from 'flitter-core/src/widgets/markdown';
import type { ThinkingItem } from '../acp/types';
import { AmpThemeProvider } from '../themes';
import { icon } from '../ui/icons/icon-registry';

interface ThinkingBlockProps {
  item: ThinkingItem;
}

/**
 * A collapsible thinking/reasoning display block.
 *
 * Layout: [status icon] [label] [suffix?] [BrailleSpinner | chevron]
 *   - Streaming: animated BrailleSpinner at ~200ms per frame (accent color)
 *   - Done: icon('tool.status.done') (green), disclosure icon at end of line
 *   - Cancelled: "(interrupted)" suffix (yellow), chevron at end
 *
 * Expanded content is rendered via Markdown for rich formatting support.
 * Uses StatefulWidget to drive BrailleSpinner animation when isStreaming=true.
 */
export class ThinkingBlock extends StatefulWidget {
  readonly item: ThinkingItem;

  constructor(props: ThinkingBlockProps) {
    super({});
    this.item = props.item;
  }

  /** Creates the mutable state that drives the BrailleSpinner animation. */
  createState(): ThinkingBlockState {
    return new ThinkingBlockState();
  }
}

/**
 * State for ThinkingBlock.
 *
 * Manages a BrailleSpinner instance and a setInterval timer that advances
 * the spinner at ~200ms intervals while the thinking item is streaming.
 * Follows the same conditional timer lifecycle as ToolHeader:
 *   initState  → start if streaming
 *   didUpdateWidget → start/stop based on streaming transition
 *   dispose    → always stop
 */
export class ThinkingBlockState extends State<ThinkingBlock> {
  private spinner = new BrailleSpinner();
  private timer: ReturnType<typeof setInterval> | null = null;

  override initState(): void {
    super.initState();
    if (this.widget.item.isStreaming) {
      this.startSpinner();
    }
  }

  override didUpdateWidget(_oldWidget: ThinkingBlock): void {
    if (this.widget.item.isStreaming && !this.timer) {
      this.startSpinner();
    } else if (!this.widget.item.isStreaming && this.timer) {
      this.stopSpinner();
    }
  }

  override dispose(): void {
    this.stopSpinner();
    super.dispose();
  }

  /**
   * Starts the BrailleSpinner animation at ~200ms per frame.
   * Matches ToolHeader spinner interval (README section 11.1).
   */
  private startSpinner(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.spinner.step();
      });
    }, 200);
  }

  /**
   * Stops the BrailleSpinner animation interval.
   */
  private stopSpinner(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Builds the ThinkingBlock widget tree.
   *
   * Header layout: [icon] [Thinking] [suffix?] [spinner or chevron]
   *   - Chevron is placed at the END of the header line (not the beginning)
   *   - During streaming, a BrailleSpinner replaces the chevron
   * Expanded content: Markdown rendering of thinking text (dim + italic via styleOverrides).
   */
  build(context: BuildContext): Widget {
    const { item } = this.widget;
    const theme = AmpThemeProvider.maybeOf(context);

    let statusGlyph: string;
    let color: Color;
    let suffix = '';

    if (item.isStreaming) {
      statusGlyph = `${this.spinner.toBraille()} `;
      color = theme?.base.accent ?? Color.magenta;
    } else if (item.text.length > 0) {
      statusGlyph = `${icon('tool.status.done')} `;
      color = theme?.base.success ?? Color.green;
    } else {
      statusGlyph = '';
      color = theme?.base.warning ?? Color.yellow;
      suffix = ' (interrupted)';
    }

    const labelSpans: TextSpan[] = [
      new TextSpan({
        text: statusGlyph,
        style: new TextStyle({ foreground: color }),
      }),
      new TextSpan({
        text: 'Thinking',
        style: new TextStyle({ foreground: color, dim: true }),
      }),
    ];

    if (suffix) {
      labelSpans.push(new TextSpan({
        text: suffix,
        style: new TextStyle({ foreground: theme?.base.warning ?? Color.yellow, italic: true }),
      }));
    }

    if (!item.isStreaming && item.text.trim().length > 0) {
      const chevron = item.collapsed
        ? icon('disclosure.collapsed')
        : icon('disclosure.expanded');
      labelSpans.push(new TextSpan({
        text: ` ${chevron}`,
        style: new TextStyle({ foreground: theme?.base.mutedForeground ?? Color.brightBlack }),
      }));
    }

    const children: Widget[] = [
      new Text({
        text: new TextSpan({ children: labelSpans }),
      }),
    ];

    if (!item.collapsed && item.text.length > 0) {
      const displayText = item.text.length > 10000
        ? item.text.slice(0, 10000) + '...'
        : item.text;

      const dimFg = theme?.base.foreground ?? Color.defaultColor;
      children.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Markdown({
            markdown: displayText,
            styleOverrides: {
              paragraph: { dim: true, italic: true, foreground: dimFg },
              'code-block': { dim: true },
            },
          }),
        }),
      );
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children,
    });
  }
}
