// EditFileTool — file edit display with diff stats and DiffCard
//
// Renders an edit_file / apply_patch / undo_edit tool call:
//   Header: [status icon] edit_file [filepath]
//   Body (expanded): diff stats (+N green / -M red) + DiffCard
//     - DiffCard wraps flitter-core's DiffView for unified diff rendering
//       with line numbers, hunk headers, word-level diff, and color semantics
//     - Fallback: extractOutputText as dim text when no diff found
//
// Ported from flitter-amp/src/widgets/tool-call/edit-file-tool.ts
// — Diff rendering delegated to DiffCard (Phase 19 Plan 02)
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
import { DiffCard } from '../diff-card';
import { pickString, asOptionalString } from '../../utils/raw-input';
import { extractDiff as extractDiffUtil, extractOutputText } from './tool-output-utils';
import { PREVIEW_TRUNCATION_LIMIT } from './truncation-limits';
import { resolveToolDisplayName, shortenPath } from './resolve-tool-name';
import { fileLink } from '../../utils/osc8-link';
import type { ToolHeaderDetail } from './tool-header';

interface EditFileToolProps extends BaseToolProps {}

/**
 * Renders an edit_file / apply_patch / undo_edit tool call.
 * Shows the file path (OSC8 linked) in the header and DiffCard with unified diff when expanded.
 * Collapsed header includes "+N/-M" diff stats when a diff is available (VPOL-03).
 */
export class EditFileTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: EditFileToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    const input = this.toolCall.rawInput ?? {};
    const filePath = pickString(input, ['file_path', 'path']);

    // VPOL-02: Wrap file path in OSC8 terminal hyperlink for clickable editor links.
    // VPOL-03: Extract diff stats unconditionally for collapsed header display.
    const details: ToolHeaderDetail[] = [];
    if (filePath) {
      details.push(fileLink(filePath, shortenPath(filePath)));
    }

    const diff = this.extractDiff();
    if (diff) {
      const { added, removed } = this.countDiffStats(diff);
      if (added > 0 || removed > 0) {
        const parts: string[] = [];
        if (added > 0) parts.push(`+${added}`);
        if (removed > 0) parts.push(`-${removed}`);
        details.push(parts.join('/'));
      }
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

    if (diff) {
      // Diff stats line: +N (green) / -M (red) lines
      const { added, removed } = this.countDiffStats(diff);
      if (added > 0 || removed > 0) {
        const statSpans: TextSpan[] = [];
        if (added > 0) {
          statSpans.push(new TextSpan({
            text: `+${added}`,
            style: new TextStyle({ foreground: Color.green }),
          }));
        }
        if (added > 0 && removed > 0) {
          statSpans.push(new TextSpan({
            text: ' / ',
            style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
          }));
        }
        if (removed > 0) {
          statSpans.push(new TextSpan({
            text: `-${removed}`,
            style: new TextStyle({ foreground: Color.red }),
          }));
        }
        statSpans.push(new TextSpan({
          text: ' lines',
          style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
        }));
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2, right: 2 }),
            child: new Text({
              text: new TextSpan({ children: statSpans }),
            }),
          }),
        );
      }

      // Unified diff rendering via DiffCard (DiffView + bordered container)
      bodyChildren.push(
        new DiffCard({ filePath: filePath ?? '', diff }),
      );
    } else {
      // Fallback: show extractOutputText as dim text
      const summary = extractOutputText(this.toolCall.result, { maxLength: PREVIEW_TRUNCATION_LIMIT });
      if (summary) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2, right: 2 }),
            child: new Text({
              text: new TextSpan({
                text: summary,
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
   * Extracts a unified diff from the tool result or rawInput.
   * Uses the shared extractDiff utility, then falls back to
   * synthesizing a diff from old_str/new_str if present.
   */
  private extractDiff(): string | null {
    const shared = extractDiffUtil(this.toolCall.result);
    if (shared) return shared;

    const input = this.toolCall.rawInput;
    if (input) {
      const oldStr = asOptionalString(input['old_str']);
      const newStr = asOptionalString(input['new_str']);
      if (oldStr !== undefined && newStr !== undefined) {
        return `--- a\n+++ b\n@@ @@\n${oldStr.split('\n').map(l => `-${l}`).join('\n')}\n${newStr.split('\n').map(l => `+${l}`).join('\n')}`;
      }
    }

    return null;
  }

  /**
   * Counts added (+) and removed (-) lines in a unified diff string.
   * Skips file marker lines (+++ / ---).
   */
  private countDiffStats(diff: string): { added: number; removed: number } {
    let added = 0;
    let removed = 0;
    for (const line of diff.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) added++;
      else if (line.startsWith('-') && !line.startsWith('---')) removed++;
    }
    return { added, removed };
  }
}
