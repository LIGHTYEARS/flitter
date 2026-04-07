// ReadTool — file read display: file path + optional line range
//
// Renders a Read tool call:
//   Header: [status icon] Read [filepath] [L{offset}-{offset+limit}]
//   Body (expanded): file content as dim pre-formatted text
//
// Ported from flitter-amp/src/widgets/tool-call/read-tool.ts
// — AmpThemeProvider color lookups replaced with direct Color.* constants

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
import { ToolHeader } from './tool-header';
import type { BaseToolProps, ToolCallItem } from './base-tool-props';
import { pickString, pickNumber } from '../../utils/raw-input';
import { extractOutputText } from './tool-output-utils';
import { OUTPUT_TRUNCATION_LIMIT } from './truncation-limits';
import { resolveToolDisplayName, shortenPath } from './resolve-tool-name';
import { fileLink } from '../../utils/osc8-link';

interface ReadToolProps extends BaseToolProps {}

/**
 * Renders a Read tool call showing the file path and optional line range.
 * When expanded, displays the file content from the result.
 */
export class ReadTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: ReadToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};

    const filePath = pickString(input, ['file_path', 'path', 'filename', 'file']);
    const offset = pickNumber(input, 'offset');
    const limit = pickNumber(input, 'limit');

    const details: string[] = [];
    // VPOL-02: Wrap file path in OSC8 terminal hyperlink for clickable editor links.
    if (filePath) details.push(fileLink(filePath, shortenPath(filePath)));
    if (offset !== null && limit !== null) {
      details.push(`L${offset}-${offset + limit}`);
    } else if (offset !== null) {
      details.push(`L${offset}`);
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

    const outputText = extractOutputText(this.toolCall.result, { maxLength: OUTPUT_TRUNCATION_LIMIT });
    if (!outputText) {
      return header;
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        header,
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: outputText,
              style: new TextStyle({
                foreground: Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      ],
    });
  }
}
