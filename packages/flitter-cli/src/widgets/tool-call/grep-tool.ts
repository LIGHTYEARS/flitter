// GrepTool — search result display with pattern + path + match count
//
// Renders a Grep / glob / Glob / Search / LS tool call:
//   Header: [status icon] Grep [/pattern/] [path] [(N matches)]
//   Body (expanded): search results as dim pre-formatted text
//
// Ported from flitter-amp/src/widgets/tool-call/grep-tool.ts
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
import { pickString } from '../../utils/raw-input';
import { extractOutputText, extractRawNumber } from './tool-output-utils';
import { OUTPUT_TRUNCATION_LIMIT } from './truncation-limits';
import { resolveToolDisplayName, shortenPath } from './resolve-tool-name';

interface GrepToolProps extends BaseToolProps {}

/**
 * Renders a Grep / glob / Glob / Search tool call.
 * Header shows the search pattern and path.
 * When expanded, shows match results summary.
 */
export class GrepTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: GrepToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};

    const pattern = pickString(input, ['pattern', 'query', 'glob', 'search_pattern', 'regex', 'search']);
    const searchPath = pickString(input, ['path', 'directory']);

    const details: string[] = [];
    if (pattern) details.push(`/${pattern}/`);
    if (searchPath) details.push(shortenPath(searchPath));

    const matchCount = extractRawNumber(this.toolCall.result, ['count', 'matchCount', 'total']);
    if (matchCount !== null) {
      details.push(`(${matchCount} matches)`);
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

    const output = extractOutputText(this.toolCall.result, { maxLength: OUTPUT_TRUNCATION_LIMIT });
    if (!output) {
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
              text: output,
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
