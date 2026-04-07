// BashInvocationsWidget — displays running bash command invocations.
//
// AMP reference: BJR widget from 30_main_tui_state.js
//
// Renders a list of currently-running bash commands tracked in AppState.
// Each invocation is displayed as a single row with the command string.
// This widget is used within the chat area or InputArea border region
// to show active shell command activity.
//
// Integration with the actual bash tool execution pipeline is wired when
// bash_tool support is added. This widget provides the display layer.

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
  /** Active bash invocations to display. */
  invocations: BashInvocation[];
}

/**
 * Displays running bash command invocations.
 *
 * Renders each invocation as a row: "$ {command}" with appropriate
 * status coloring. Running commands use shellMode color, completed
 * commands use dim foreground, failed commands use error color.
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

    const rows: Widget[] = this.invocations.map((inv) => {
      // Select color based on invocation status
      let color = shellColor;
      if (inv.status === 'failed') color = errorColor;
      if (inv.status === 'completed') color = dimColor;

      const prefix = inv.status === 'running' ? '$ ' : '  ';

      return new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: prefix,
              style: new TextStyle({ foreground: color, dim: inv.status !== 'running' }),
            }),
            new TextSpan({
              text: inv.command,
              style: new TextStyle({ foreground: color, dim: inv.status !== 'running' }),
            }),
          ],
        }),
      });
    });

    return new Column({
      crossAxisAlignment: 'start',
      mainAxisSize: 'min',
      children: rows,
    });
  }
}
