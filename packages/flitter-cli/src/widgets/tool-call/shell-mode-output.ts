import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../../flitter-core/src/framework/widget';
import { Column } from '../../../../flitter-core/src/widgets/flex';
import { Text } from '../../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../../flitter-core/src/core/text-span';
import { Color } from '../../../../flitter-core/src/core/color';
import { Padding } from '../../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../../flitter-core/src/layout/edge-insets';
import { CliThemeProvider } from '../../themes';
import type { ToolCallItem } from '../../state/types';
import { extractShellOutput } from './tool-output-utils';
import { pickString } from '../../utils/raw-input';
import { truncateText, OUTPUT_TRUNCATION_LIMIT } from './truncation-limits';

interface ShellModeOutputProps {
  toolCall: ToolCallItem;
}

/**
 * Renders shell mode ($/$$ prefix) command output with AMP-matching style.
 *
 * Unlike BashTool (which has ToolHeader with collapse/expand, dim output,
 * and exit code line), ShellModeOutputWidget renders a simple:
 *   - Header: "$ command" in shellMode color (cyan)
 *   - Body: command output in foreground color (not dim)
 *   - Exit code: green/red indicator (optional)
 *
 * This matches AMP's BJR widget style for user-initiated shell commands.
 */
export class ShellModeOutputWidget extends StatelessWidget {
  private readonly toolCall: ToolCallItem;

  constructor(props: ShellModeOutputProps) {
    super({});
    this.toolCall = props.toolCall;
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const shellColor = theme?.app.shellMode ?? Color.cyan;
    const fgColor = theme?.base.foreground ?? Color.defaultColor;
    const errorColor = theme?.base.destructive ?? Color.red;

    const input = this.toolCall.rawInput ?? {};
    const command = pickString(input, ['command', 'Command', 'cmd', 'shell_command', 'script', 'args']);

    const isFailed = this.toolCall.status === 'failed';
    const headerColor = isFailed ? errorColor : shellColor;

    const children: Widget[] = [];

    children.push(new Text({
      text: new TextSpan({
        text: `$ ${command}`,
        style: new TextStyle({ foreground: headerColor }),
      }),
    }));

    const output = this._extractOutput();
    if (output) {
      const displayOutput = truncateText(output, OUTPUT_TRUNCATION_LIMIT);
      children.push(new Padding({
        padding: EdgeInsets.only({ left: 2 }),
        child: new Text({
          text: new TextSpan({
            text: displayOutput,
            style: new TextStyle({ foreground: fgColor }),
          }),
        }),
      }));
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children,
    });
  }

  private _extractOutput(): string {
    if (this.toolCall.isStreaming && this.toolCall.streamingOutput) {
      return this.toolCall.streamingOutput;
    }
    return extractShellOutput(this.toolCall.result);
  }
}
