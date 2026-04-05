// ThinkingBlock — collapsible thinking/reasoning display
// Streaming: accent (magenta) with animated BrailleSpinner
// Done: success (green) with checkmark icon
// Cancelled: warning (yellow) with "(interrupted)"
// Content: dim, italic when expanded (rendered via Markdown for rich formatting)

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { BrailleSpinner } from '../../../flitter-core/src/utilities/braille-spinner';
import { Markdown } from '../../../flitter-core/src/widgets/markdown';
import type { ThinkingItem } from '../state/types';
import { CliThemeProvider } from '../themes';
import { icon } from '../utils/icon-registry';

interface ThinkingBlockProps {
  item: ThinkingItem;
}

/**
 * A collapsible thinking/reasoning display block.
 *
 * Layout: [status icon] [Thinking] [suffix?] [spinner or chevron]
 *   - Streaming: animated BrailleSpinner at ~200ms per frame (magenta)
 *   - Done (has text): checkmark (green), disclosure chevron at end
 *   - Cancelled (no text): "(interrupted)" suffix (yellow), no chevron
 *
 * Expanded content is rendered via Markdown with dim+italic style overrides.
 * Uses StatefulWidget to drive BrailleSpinner animation when isStreaming=true.
 */
export class ThinkingBlock extends StatefulWidget {
  readonly item: ThinkingItem;

  constructor(props: ThinkingBlockProps) {
    super({});
    this.item = props.item;
  }

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
 *   initState       -> start if streaming
 *   didUpdateWidget -> start/stop based on streaming transition
 *   dispose         -> always stop
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

  private startSpinner(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.spinner.step();
      });
    }, 200);
  }

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
   * Expanded content: Markdown rendering of thinking text (dim + italic).
   */
  build(context: BuildContext): Widget {
    const { item } = this.widget;

    const theme = CliThemeProvider.maybeOf(context);
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;

    let statusGlyph: string;
    let color: Color;
    let suffix = '';

    if (item.isStreaming) {
      statusGlyph = `${this.spinner.toBraille()} `;
      color = theme?.base.accent ?? Color.magenta;
    } else if (item.text.length > 0) {
      statusGlyph = `${icon('success')} `;
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
      const chevron = item.collapsed ? icon('disclosure.collapsed') : icon('disclosure.expanded');
      labelSpans.push(new TextSpan({
        text: ` ${chevron}`,
        style: new TextStyle({ foreground: mutedColor }),
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

      children.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Markdown({
            markdown: displayText,
            styleOverrides: {
              paragraph: { dim: true, italic: true, foreground: theme?.base.foreground ?? Color.defaultColor },
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
