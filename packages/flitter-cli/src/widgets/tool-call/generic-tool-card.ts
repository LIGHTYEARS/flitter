// GenericToolCard — default tool call card with StickyHeader, ToolHeader, and expandable body
//
// Fallback renderer for all tool types that don't have a specialized widget.
// Layout: StickyHeader(header=ToolHeader, body=Column of input/locations/output sections).
//
// Ported from flitter-amp/src/widgets/tool-call/generic-tool-card.ts
// — AmpThemeProvider colors replaced with direct Color constants
// — Markdown widget replaced with plain Text (Phase 19 provides Markdown)
// — DiffView replaced with plain Text (Phase 19 provides DiffView)
// — StickyHeader layout, extractDetails/Input/Output/Locations methods retained

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
import { StickyHeader } from '../../../../flitter-core/src/widgets/sticky-header';
import { SizedBox } from '../../../../flitter-core/src/widgets/sized-box';
import { ToolHeader } from './tool-header';
import type { BaseToolProps } from './base-tool-props';
import type { ToolCallItem } from '../../state/types';
import { extractOutputText, extractDiff } from './tool-output-utils';
import {
  INPUT_TRUNCATION_LIMIT,
  OUTPUT_TRUNCATION_LIMIT,
  truncateInline,
} from './truncation-limits';
import { resolveToolDisplayName, extractTitleDetail, shortenPath } from './resolve-tool-name';

/** Props for GenericToolCard. Extends BaseToolProps with optional header hiding. */
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
 *       - inputSection (plain Text of rawInput key-value pairs)
 *       - locationsSection ("Files:" line with cyan file paths)
 *       - outputSection (plain Text of result content, or diff as plain text)
 *       - children (optional extra widgets injected by specific tools)
 *
 * When collapsed (isExpanded=false), only the ToolHeader is rendered.
 * When expanded, the full body is shown via StickyHeader.
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

  build(_context: BuildContext): Widget {
    const details = this.extractDetails();
    const header = this.hideHeader
      ? new SizedBox({})
      : new ToolHeader({
          name: resolveToolDisplayName(this.toolCall),
          status: this.toolCall.status,
          details,
          onToggle: this.onToggle,
        });

    if (!this.isExpanded) {
      return header;
    }

    const bodyChildren: Widget[] = [];

    // --- Input summary section ---
    const inputText = this.extractInputText();
    if (inputText) {
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Text({
            text: new TextSpan({
              text: inputText,
              style: new TextStyle({
                foreground: Color.brightBlack,
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
                    foreground: Color.brightBlack,
                    dim: true,
                  }),
                }),
                new TextSpan({
                  text: locationsText,
                  style: new TextStyle({
                    foreground: Color.cyan,
                  }),
                }),
              ],
            }),
          }),
        }),
      );
    }

    // --- Diff or output section ---
    // Phase 19 will swap Text -> DiffView / Markdown
    const diff = extractDiff(this.toolCall.result);
    if (diff) {
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({
              text: diff,
              style: new TextStyle({
                foreground: Color.brightBlack,
                dim: true,
              }),
            }),
          }),
        }),
      );
    } else {
      const outputText = this.extractOutputText();
      if (outputText) {
        bodyChildren.push(
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
        );
      }
    }

    // --- Extra children (injected by specialized tool wrappers) ---
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
   * Extracts human-readable detail strings from the tool call for ToolHeader.
   * Includes title detail and shortened location paths for collapsed-view context.
   */
  private extractDetails(): string[] {
    const details: string[] = [];
    const titleDetail = extractTitleDetail(this.toolCall);
    if (titleDetail) {
      details.push(shortenPath(titleDetail));
    }

    // Append location paths as header details
    const locs = this.toolCall.locations;
    if (locs && locs.length > 0) {
      const displayPaths = locs.slice(0, 2).map(loc => this.shortenLocationPath(loc.path));
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
  private shortenLocationPath(fullPath: string): string {
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
   * Each key-value pair on its own line, values truncated to INPUT_TRUNCATION_LIMIT.
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
   * Prefers streaming output during execution (tail + block cursor),
   * falls back to final result with truncation.
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
