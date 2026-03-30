// CreateFileTool — file creation card showing the file path and creation result
// Amp ref: create_file tool — shows the created file path and result

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
import { extractOutputText } from './tool-output-utils';
import { PREVIEW_TRUNCATION_LIMIT, truncateText } from './truncation-limits';
import { resolveToolDisplayName, shortenPath } from './resolve-tool-name';

interface CreateFileToolProps extends BaseToolProps {}

/**
 * Renders a create_file tool call showing the file path being created.
 * When expanded, shows file content preview and/or the creation result.
 */
export class CreateFileTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: CreateFileToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const input = this.toolCall.rawInput ?? {};
    const filePath = pickString(input, ['file_path', 'path', 'filename', 'file', 'destination']);

    const header = new ToolHeader({
      name: resolveToolDisplayName(this.toolCall),
      status: this.toolCall.status,
      details: filePath ? [shortenPath(filePath)] : [],
      onToggle: this.onToggle,
    });

    if (!this.isExpanded) {
      return header;
    }

    const bodyChildren: Widget[] = [];

    // --- Input content preview ----------------------------------------
    const content = pickString(input, ['content']);
    if (content) {
      const preview = truncateText(content, PREVIEW_TRUNCATION_LIMIT);

      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: preview,
              style: new TextStyle({
                foreground: theme?.base.mutedForeground ?? Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      );
    }

    // --- Result / output section --------------------------------------
    const resultText = extractOutputText(this.toolCall.result);
    if (resultText) {
      const isError = this.isResultError();
      const resultColor = isError
        ? (theme?.base.destructive ?? Color.red)
        : (theme?.app.toolSuccess ?? Color.green);

      const truncatedResult = truncateText(resultText, 1000);

      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: truncatedResult,
              style: new TextStyle({
                foreground: resultColor,
                dim: !isError, // errors are not dimmed for visibility
              }),
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

  // -------------------------------------------------------------------
  // Result extraction helpers
  // -------------------------------------------------------------------

  /**
   * Returns true when the tool result indicates a failure.
   */
  private isResultError(): boolean {
    if (this.toolCall.status === 'failed') return true;
    if (this.toolCall.result?.status === 'failed') return true;
    return false;
  }
}
