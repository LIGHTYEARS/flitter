// WebSearchTool — search query + result links display
//
// Renders a WebSearch / read_web_page tool call:
//   Header: [status icon] WebSearch [query]
//   Body (expanded): result URLs as cyan arrow-prefixed lines,
//     or fallback extractOutputText as dim text
//
// Ported from flitter-amp/src/widgets/tool-call/web-search-tool.ts
// — AmpThemeProvider color lookups replaced with direct Color.* constants
// — icon('arrow.right') replaced with arrowIcon constant from tool-icons.ts

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
import { pickString, isRecord } from '../../utils/raw-input';
import { extractOutputText, extractRawArray } from './tool-output-utils';
import { OUTPUT_TRUNCATION_LIMIT, MAX_DISPLAY_ITEMS } from './truncation-limits';
import { resolveToolDisplayName } from './resolve-tool-name';
import { arrowIcon } from './tool-icons';

interface WebSearchToolProps extends BaseToolProps {}

/**
 * Renders a WebSearch / read_web_page tool call.
 * Header shows the search query. When expanded, shows result URLs/content.
 */
export class WebSearchTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: WebSearchToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
    const query = pickString(input, ['query', 'url', 'search_query', 'q', 'search']);

    const header = new ToolHeader({
      name: resolveToolDisplayName(this.toolCall),
      status: this.toolCall.status,
      details: query ? [query] : [],
      onToggle: this.onToggle,
    });

    if (!this.isExpanded) {
      return header;
    }

    const bodyChildren: Widget[] = [];
    const links = this.extractLinks();

    if (links.length > 0) {
      // Render each URL as a cyan arrow-prefixed line
      for (const link of links) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2 }),
            child: new Text({
              text: new TextSpan({
                text: `${arrowIcon} ${link}`,
                style: new TextStyle({
                  foreground: Color.cyan,
                }),
              }),
            }),
          }),
        );
      }
    } else {
      // Fallback: plain output text when no structured URLs found
      const output = extractOutputText(this.toolCall.result, { maxLength: OUTPUT_TRUNCATION_LIMIT });
      if (output) {
        bodyChildren.push(
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
        );
      }
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
   * Extracts URLs from the tool result using shared extraction utilities.
   * Checks rawOutput for 'results' or 'links' array, filters for records,
   * extracts url/link/href strings, limited to MAX_DISPLAY_ITEMS.
   */
  private extractLinks(): string[] {
    const candidates = extractRawArray<Record<string, unknown>>(
      this.toolCall.result,
      ['results', 'links'],
    );
    return candidates
      .filter(isRecord)
      .map(r => pickString(r, ['url', 'link', 'href']))
      .filter(Boolean)
      .slice(0, MAX_DISPLAY_ITEMS);
  }
}
