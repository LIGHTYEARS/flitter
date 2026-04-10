// BashInvocationsWidget — displays bash command invocations and their output.
//
// AMP reference: BJR widget from 30_main_tui_state.js
//
// Renders a list of bash commands tracked in AppState:
//   - Running commands show "$ {command}" with shellMode color
//   - Completed/failed commands show status prefix + command, followed by output

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { CliThemeProvider } from '../themes';
import type { BashInvocation } from '../state/types';

// ---------------------------------------------------------------------------
// BashInvocationsWidget
// ---------------------------------------------------------------------------

interface BashInvocationsWidgetProps {
  invocations: BashInvocation[];
}

/**
 * Displays bash command invocations with status and output.
 *
 * Running commands: "$ {command}" in shellMode color.
 * Completed commands: "✓ $ {command}" in dim, followed by output lines.
 * Failed commands: "✗ $ {command}" in error color, followed by output lines.
 *
 * AMP ref: BJR widget in 30_main_tui_state.js
 */
export class BashInvocationsWidget extends StatelessWidget {
  private readonly invocations: BashInvocation[];

  constructor(props: BashInvocationsWidgetProps) {
    super({});
    this.invocations = props.invocations;
  }

  build(context: BuildContext): Widget {
    if (this.invocations.length === 0) {
      return new SizedBox({});
    }

    const theme = CliThemeProvider.maybeOf(context);
    const shellColor = theme?.app.shellMode;
    const errorColor = theme?.base.destructive;
    const dimColor = theme?.base.mutedForeground;
    const fgColor = theme?.base.foreground;

    const rows: Widget[] = [];

    for (const inv of this.invocations) {
      // G5: 跳过 hidden invocations（$$ 前缀），匹配 AMP BJR 行为
      if (inv.hidden) continue;

      let color = shellColor;
      if (inv.status === 'failed') color = errorColor;
      if (inv.status === 'completed') color = dimColor;

      const statusIcon = inv.status === 'running' ? '⠋ '
        : inv.status === 'completed' ? '✓ '
        : '✗ ';

      rows.push(new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: statusIcon,
              style: new TextStyle({ foreground: color, dim: inv.status !== 'running' }),
            }),
            new TextSpan({
              text: `$ ${inv.command}`,
              style: new TextStyle({ foreground: color, dim: inv.status !== 'running' }),
            }),
          ],
        }),
      }));

      if (inv.output && inv.status !== 'running') {
        rows.push(new Text({
          text: new TextSpan({
            text: inv.output,
            style: new TextStyle({ foreground: fgColor }),
          }),
        }));
      }
    }

    return new Column({
      crossAxisAlignment: 'start',
      mainAxisSize: 'min',
      children: rows,
    });
  }
}
