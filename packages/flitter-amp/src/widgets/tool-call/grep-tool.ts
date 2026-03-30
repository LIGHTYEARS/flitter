// GrepTool — search result display with pattern + path + match count
// Amp ref: Grep/glob/Glob/Search tools — pattern and match summary

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
import { extractOutputText, extractRawNumber } from './tool-output-utils';
import { OUTPUT_TRUNCATION_LIMIT, truncateText } from './truncation-limits';

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

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const input = this.toolCall.rawInput ?? {};

    const pattern = pickString(input, ['pattern', 'query', 'glob', 'search_pattern', 'regex', 'search']);
    const path = pickString(input, ['path', 'directory']);

    const details: string[] = [];
    if (pattern) details.push(`/${pattern}/`);
    if (path) details.push(path);

    const matchCount = extractRawNumber(this.toolCall.result, ['count', 'matchCount', 'total']);
    if (matchCount !== null) {
      details.push(`(${matchCount} matches)`);
    }

    const header = new ToolHeader({
      name: this.toolCall.kind,
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
                foreground: theme?.base.mutedForeground ?? Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      ],
    });
  }
}
