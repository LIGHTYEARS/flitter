// BashTool — shell command display with $ prefix + output + exit code
// Amp ref: Bash/shell_command tool — "$ command" header, spinner during exec, output + exit code

import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { ToolHeader } from './tool-header';
import { AmpThemeProvider } from '../../themes/index';
import type { BaseToolProps, ToolCallItem } from './base-tool-props';
import { pickString } from '../../utils/raw-input';
import { extractShellOutput, extractRawNumber } from './tool-output-utils';
import { resolveToolDisplayName } from './resolve-tool-name';
import {
  HEADER_TRUNCATION_LIMIT,
  OUTPUT_TRUNCATION_LIMIT,
  truncateInline,
  truncateText,
  TRUNCATION_SUFFIX,
} from './truncation-limits';

interface BashToolProps extends BaseToolProps {}

/**
 * Renders a Bash / shell_command tool call.
 * Header shows "$ command" with accent coloring.
 * When expanded, shows stdout/stderr output and exit code.
 */
export class BashTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: BashToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const input = this.toolCall.rawInput ?? {};
    const command = pickString(input, ['command', 'Command', 'cmd', 'shell_command', 'script', 'args']);

    const details: string[] = [];
    if (command) {
      const shortCmd = truncateInline(command, HEADER_TRUNCATION_LIMIT);
      details.push(`$ ${shortCmd}`);
    }

    const header = new ToolHeader({
      name: resolveToolDisplayName(this.toolCall),
      status: this.toolCall.status,
      details,
      onToggle: this.onToggle,
    });

    if (!this.isExpanded) {
      return header;
    }

    const bodyChildren: Widget[] = [];

    const output = this.extractOutput();
    if (output) {
      // During streaming, show the TAIL of output with a block cursor.
      // After completion, show the HEAD of output (standard behavior).
      const displayOutput = this.toolCall.isStreaming
        ? (output.length > OUTPUT_TRUNCATION_LIMIT
            ? '...(truncated)\n' + output.slice(-OUTPUT_TRUNCATION_LIMIT) + ' \u2588'
            : output + ' \u2588')
        : truncateText(output, OUTPUT_TRUNCATION_LIMIT);

      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: displayOutput,
              style: new TextStyle({
                foreground: theme?.base.mutedForeground ?? Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      );
    }

    const exitCode = extractRawNumber(this.toolCall.result, ['exit_code']);
    if (exitCode !== null) {
      const exitColor = exitCode === 0
        ? (theme?.app.toolSuccess ?? Color.green)
        : (theme?.base.destructive ?? Color.red);
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Text({
            text: new TextSpan({
              text: `exit code: ${exitCode}`,
              style: new TextStyle({ foreground: exitColor, dim: true }),
            }),
          }),
        }),
      );
    }

    if (bodyChildren.length === 0) {
      return header;
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [header, ...bodyChildren],
    });
  }

  /**
   * Extracts stdout/stderr output from the result or streaming output.
   * During execution, prefers streamingOutput (populated by appendToolOutput).
   * After completion, uses result.rawOutput (populated by tool_call_update).
   */
  private extractOutput(): string {
    // Prefer streaming output during execution
    if (this.toolCall.isStreaming && this.toolCall.streamingOutput) {
      return this.toolCall.streamingOutput;
    }

    return extractShellOutput(this.toolCall.result);
  }
}
