// ThinkingBlock — collapsible thinking/reasoning display
// Amp ref: zk widget
// Streaming: accent (magenta) with braille spinner ●
// Done: success (green) with ✓
// Cancelled: warning (yellow) with "(interrupted)"
// Content: dim, italic when expanded

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import type { ThinkingItem } from '../acp/types';
import { AmpThemeProvider } from '../themes';

interface ThinkingBlockProps {
  item: ThinkingItem;
}

export class ThinkingBlock extends StatelessWidget {
  private readonly item: ThinkingItem;

  constructor(props: ThinkingBlockProps) {
    super({});
    this.item = props.item;
  }

  build(context: BuildContext): Widget {
    const { item } = this;
    const theme = AmpThemeProvider.maybeOf(context);

    let icon: string;
    let color: Color;
    let suffix = '';

    if (item.isStreaming) {
      icon = '● ';
      color = theme?.base.accent ?? Color.magenta;
    } else if (item.text.length > 0) {
      icon = '\u2713 ';
      color = theme?.base.success ?? Color.green;
    } else {
      icon = '';
      color = theme?.base.warning ?? Color.yellow;
      suffix = ' (interrupted)';
    }

    const chevron = item.collapsed ? '\u25B6' : '\u25BC';

    const labelSpans: TextSpan[] = [
      new TextSpan({
        text: `${chevron} `,
        style: new TextStyle({ foreground: theme?.base.mutedForeground ?? Color.brightBlack }),
      }),
      new TextSpan({
        text: icon,
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
          child: new Text({
            text: new TextSpan({
              text: displayText,
              style: new TextStyle({
                foreground: theme?.base.foreground ?? Color.defaultColor,
                dim: true,
                italic: true,
              }),
            }),
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
