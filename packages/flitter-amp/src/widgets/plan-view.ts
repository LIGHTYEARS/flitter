// PlanView — todo/plan display matching Amp's plan rendering
// Shows a checklist of plan entries with status icons

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import type { PlanEntry } from '../acp/types';

interface PlanViewProps {
  entries: PlanEntry[];
}

export class PlanView extends StatelessWidget {
  private readonly entries: PlanEntry[];

  constructor(props: PlanViewProps) {
    super({});
    this.entries = props.entries;
  }

  build(): Widget {
    const children: Widget[] = [
      new Text({
        text: new TextSpan({
          text: '  Plan',
          style: new TextStyle({
            foreground: Color.blue,
            bold: true,
          }),
        }),
      }),
    ];

    for (const entry of this.entries) {
      const icon =
        entry.status === 'completed' ? '✓' :
        entry.status === 'in_progress' ? '●' : '○';

      const color =
        entry.status === 'completed' ? Color.green :
        entry.status === 'in_progress' ? Color.yellow :
        Color.brightBlack;

      children.push(
        new Text({
          text: new TextSpan({
            text: `    ${icon} ${entry.content}`,
            style: new TextStyle({ foreground: color }),
          }),
        }),
      );
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children,
      }),
    });
  }
}
