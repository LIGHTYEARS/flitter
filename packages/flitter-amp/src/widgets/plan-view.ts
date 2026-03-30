// PlanView — todo/plan display matching Amp's plan rendering
// Shows a checklist of plan entries with status icons and priority tags

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import type { PlanEntry } from '../acp/types';
import { AmpThemeProvider } from '../themes';

interface PlanViewProps {
  entries: PlanEntry[];
}

export class PlanView extends StatelessWidget {
  private readonly entries: PlanEntry[];

  constructor(props: PlanViewProps) {
    super({});
    this.entries = props.entries;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);

    const children: Widget[] = [
      new Text({
        text: new TextSpan({
          text: '  Plan',
          style: new TextStyle({
            foreground: theme?.base.info ?? Color.cyan,
            bold: true,
          }),
        }),
      }),
    ];

    for (const entry of this.entries) {
      const icon =
        entry.status === 'completed' ? '\u2713' :
        entry.status === 'in_progress' ? '\u25CF' : '\u25CB';

      const color =
        entry.status === 'completed' ? (theme?.base.success ?? Color.green) :
        entry.status === 'in_progress' ? (theme?.base.warning ?? Color.yellow) :
        (theme?.base.mutedForeground ?? Color.brightBlack);

      const { tag, tagColor } = PlanView.getPriorityDisplay(entry.priority, theme);

      children.push(
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: `    ${icon} `,
                style: new TextStyle({ foreground: color }),
              }),
              new TextSpan({
                text: `${tag} `,
                style: new TextStyle({ foreground: tagColor, bold: true }),
              }),
              new TextSpan({
                text: entry.content,
                style: new TextStyle({ foreground: color }),
              }),
            ],
          }),
        }),
      );
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children,
      }),
    });
  }

  /**
   * Returns the display tag and color for a plan entry's priority level.
   *
   * Mapping:
   *   'high'   -> [H] in destructive (red)        -- urgent items
   *   'medium' -> [M] in warning (yellow)          -- normal items
   *   'low'    -> [L] in mutedForeground (gray)    -- background items
   */
  private static getPriorityDisplay(
    priority: PlanEntry['priority'],
    theme: ReturnType<typeof AmpThemeProvider.maybeOf>,
  ): { tag: string; tagColor: Color } {
    switch (priority) {
      case 'high':
        return { tag: '[H]', tagColor: theme?.base.destructive ?? Color.red };
      case 'medium':
        return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
      case 'low':
        return { tag: '[L]', tagColor: theme?.base.mutedForeground ?? Color.brightBlack };
      default:
        return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
    }
  }
}
