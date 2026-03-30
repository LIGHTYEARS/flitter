// GenericToolCard — default tool call card with StickyHeader, ToolHeader, and expandable body
// Amp ref: xD widget — header (ToolHeader) + body (input/thinking/nested tools/output)
// Body sections rendered when expanded: inputSection, thinkingBlocks, nested toolCalls, outputSection

import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { StickyHeader } from 'flitter-core/src/widgets/sticky-header';
import { Markdown } from 'flitter-core/src/widgets/markdown';
import { DiffView } from 'flitter-core/src/widgets/diff-view';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { ToolHeader } from './tool-header';
import { AmpThemeProvider } from '../../themes/index';
import type { BaseToolProps } from './base-tool-props';
import type { ToolCallItem } from '../../acp/types';
import { extractOutputText, extractDiff } from './tool-output-utils';
import {
  INPUT_TRUNCATION_LIMIT,
  OUTPUT_TRUNCATION_LIMIT,
  truncateInline,
} from './truncation-limits';

interface GenericToolCardProps extends BaseToolProps {
  hideHeader?: boolean;
  children?: Widget[];
}

/**
 * A generic tool call card used as the default renderer for all tool types.
 *
 * Layout:
 *   StickyHeader
 *     header: ToolHeader (status + name + details)
 *     body: Column
 *       - inputSection (Markdown of rawInput)
 *       - outputSection (Markdown of result content, or DiffView for diffs)
 *       - children (optional extra widgets injected by specific tools)
 */
export class GenericToolCard extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly hideHeader: boolean;
  private readonly extraChildren: Widget[];
  private readonly onToggle?: () => void;

  constructor(props: GenericToolCardProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.hideHeader = props.hideHeader ?? false;
    this.extraChildren = props.children ?? [];
    this.onToggle = props.onToggle;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const details = this.extractDetails();
    const header = this.hideHeader
      ? new SizedBox({})
      : new ToolHeader({
          name: this.toolCall.kind,
          status: this.toolCall.status,
          details,
          onToggle: this.onToggle,
        });

    if (!this.isExpanded) {
      return header;
    }

    const bodyChildren: Widget[] = [];

    const inputText = this.extractInputText();
    if (inputText) {
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Text({
            text: new TextSpan({
              text: inputText,
              style: new TextStyle({
                foreground: theme?.base.mutedForeground ?? Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      );
    }

    // --- Locations section ---
    const locationsText = this.extractLocationsText();
    if (locationsText) {
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Text({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: 'Files: ',
                  style: new TextStyle({
                    foreground: theme?.base.mutedForeground ?? Color.brightBlack,
                    dim: true,
                  }),
                }),
                new TextSpan({
                  text: locationsText,
                  style: new TextStyle({
                    foreground: theme?.app.fileReference ?? Color.cyan,
                  }),
                }),
              ],
            }),
          }),
        }),
      );
    }

    const diff = extractDiff(this.toolCall.result);
    if (diff) {
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new DiffView({ diff }),
        }),
      );
    } else {
      const outputText = this.extractOutputText();
      if (outputText) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2, right: 2 }),
            child: new Markdown({ markdown: outputText }),
          }),
        );
      }
    }

    for (const child of this.extraChildren) {
      bodyChildren.push(child);
    }

    if (bodyChildren.length === 0) {
      return header;
    }

    const body = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: bodyChildren,
    });

    return new StickyHeader({
      header,
      body,
    });
  }

  /**
   * Extracts human-readable detail strings from the tool call (e.g. file path, command).
   * Appends shortened location paths for collapsed-view context.
   */
  private extractDetails(): string[] {
    const details: string[] = [];
    if (this.toolCall.title) {
      details.push(this.toolCall.title);
    }

    // Append location paths as header details
    const locs = this.toolCall.locations;
    if (locs && locs.length > 0) {
      const displayPaths = locs.slice(0, 2).map(loc => this.shortenPath(loc.path));
      details.push(...displayPaths);
      if (locs.length > 2) {
        details.push(`+${locs.length - 2} more`);
      }
    }

    return details;
  }

  /**
   * Shortens a file path for header display by showing only the filename
   * and immediate parent directory.
   */
  private shortenPath(fullPath: string): string {
    const parts = fullPath.split('/').filter(p => p.length > 0);
    if (parts.length <= 2) return fullPath;
    return parts.slice(-2).join('/');
  }

  /**
   * Formats the locations array into a compact file-reference display.
   * Returns one path per line, or null if locations is empty/undefined.
   */
  private extractLocationsText(): string | null {
    const locs = this.toolCall.locations;
    if (!locs || locs.length === 0) return null;

    return locs.map(loc => loc.path).join('\n');
  }

  /**
   * Builds a compact input summary from rawInput for display in the body.
   */
  private extractInputText(): string {
    if (!this.toolCall.rawInput) return '';
    const keys = Object.keys(this.toolCall.rawInput);
    if (keys.length === 0) return '';

    const parts: string[] = [];
    for (const key of keys) {
      const val = this.toolCall.rawInput[key];
      if (typeof val === 'string') {
        parts.push(`${key}: ${truncateInline(val, INPUT_TRUNCATION_LIMIT)}`);
      } else if (val !== undefined && val !== null) {
        const s = JSON.stringify(val);
        parts.push(`${key}: ${truncateInline(s, INPUT_TRUNCATION_LIMIT)}`);
      }
    }
    return parts.join('\n');
  }

  /**
   * Extracts plain text output from the tool result for display.
   * Prefers streaming output during execution, falls back to final result.
   */
  private extractOutputText(): string {
    // Prefer streaming output during execution
    if (this.toolCall.isStreaming && this.toolCall.streamingOutput) {
      const output = this.toolCall.streamingOutput;
      return output.length > OUTPUT_TRUNCATION_LIMIT
        ? '...(truncated)\n' + output.slice(-OUTPUT_TRUNCATION_LIMIT) + ' \u2588'
        : output + ' \u2588';
    }

    return extractOutputText(this.toolCall.result, { maxLength: OUTPUT_TRUNCATION_LIMIT });
  }
}
