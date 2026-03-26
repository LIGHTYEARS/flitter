// ThinkingBlock — collapsible thinking/reasoning display
// Amp ref: Collapsible "Thinking..." block with ▶/▼ toggle

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import type { ThinkingItem } from '../acp/types';

interface ThinkingBlockProps {
  item: ThinkingItem;
}

export class ThinkingBlock extends StatelessWidget {
  private readonly item: ThinkingItem;

  constructor(props: ThinkingBlockProps) {
    super({});
    this.item = props.item;
  }

  build(): Widget {
    const { item } = this;
    const chevron = item.collapsed ? '▶' : '▼';
    const indicator = item.isStreaming ? ' ●' : '';
    const label = `  ${chevron} Thinking${indicator}`;

    const children: Widget[] = [
      new Text({
        text: new TextSpan({
          text: label,
          style: new TextStyle({
            foreground: Color.brightBlack,
            italic: true,
          }),
        }),
      }),
    ];

    // Show thinking content when expanded
    if (!item.collapsed && item.text.length > 0) {
      // Truncate long thinking to first 500 chars
      const displayText = item.text.length > 500
        ? item.text.slice(0, 500) + '...'
        : item.text;

      children.push(
        new Padding({
          padding: EdgeInsets.only({ left: 4, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: displayText,
              style: new TextStyle({
                foreground: Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      );
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children,
    });
  }
}
