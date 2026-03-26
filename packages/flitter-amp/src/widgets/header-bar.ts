// HeaderBar — top status bar showing agent info, mode, and cost
// Amp ref: ContainerWithOverlays with top overlays on the border

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Row } from 'flitter-core/src/widgets/flex';
import { Expanded } from 'flitter-core/src/widgets/flexible';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import type { UsageInfo } from '../acp/types';

interface HeaderBarProps {
  agentName: string;
  sessionId: string | null;
  mode: string | null;
  usage: UsageInfo | null;
  isProcessing: boolean;
}

export class HeaderBar extends StatelessWidget {
  private readonly props: HeaderBarProps;

  constructor(props: HeaderBarProps) {
    super({});
    this.props = props;
  }

  build(): Widget {
    const { agentName, mode, usage, isProcessing } = this.props;

    // Left side: agent name + mode
    const leftParts: string[] = [` ${agentName}`];
    if (mode) leftParts.push(`[${mode}]`);
    if (isProcessing) leftParts.push('⏳');

    const leftText = leftParts.join(' ');

    // Right side: token usage + cost
    let rightText = '';
    if (usage) {
      rightText = `${usage.inputTokens + usage.outputTokens} tokens`;
      if (usage.cost !== undefined) {
        rightText += ` ($${usage.cost.toFixed(4)})`;
      }
      rightText += ' ';
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 0, horizontal: 1 }),
      child: new Row({
        children: [
          new Expanded({
            child: new Text({
              text: new TextSpan({
                text: leftText,
                style: new TextStyle({
                  foreground: Color.cyan,
                  bold: true,
                }),
              }),
            }),
          }),
          new Text({
            text: new TextSpan({
              text: rightText,
              style: new TextStyle({
                foreground: Color.brightBlack,
              }),
            }),
          }),
        ],
      }),
    });
  }
}
