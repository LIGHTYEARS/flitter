// EditFileTool — file edit display with diff stats and inline diff coloring
//
// Renders an edit_file / apply_patch / undo_edit tool call:
//   Header: [status icon] edit_file [filepath]
//   Body (expanded): diff stats (+N green / -M red) + diff content
//     - Lines starting with '+' (not '+++') colored green
//     - Lines starting with '-' (not '---') colored red
//     - Context lines rendered dim
//     - Fallback: extractOutputText as dim text when no diff found
//
// Ported from flitter-amp/src/widgets/tool-call/edit-file-tool.ts
// — DiffView widget replaced with inline diff coloring using TextSpan
//   children (temporary until Phase 19 provides proper DiffView)
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
import { pickString, asOptionalString } from '../../utils/raw-input';
import { extractDiff as extractDiffUtil, extractOutputText } from './tool-output-utils';
import { PREVIEW_TRUNCATION_LIMIT } from './truncation-limits';
import { resolveToolDisplayName, shortenPath } from './resolve-tool-name';

interface EditFileToolProps extends BaseToolProps {}

/**
 * Renders an edit_file / apply_patch / undo_edit tool call.
 * Shows the file path in the header and inline-colored diff when expanded.
 * Phase 19 will replace the inline diff with a proper DiffView widget.
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

    const header = new ToolHeader({
      name: resolveToolDisplayName(this.toolCall),
      status: this.toolCall.status,
      details: filePath ? [shortenPath(filePath)] : [],
      onToggle: this.onToggle,
    });

    if (!this.isExpanded) {
      return header;
    }

    const diff = this.extractDiff();
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

      // Inline diff coloring: +lines green, -lines red, context dim
      // Temporary approach until Phase 19 provides proper DiffView widget
      const diffSpans = this.buildDiffSpans(diff);
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new Text({
            text: new TextSpan({ children: diffSpans }),
          }),
        }),
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

  /**
   * Builds an array of TextSpan children for inline diff coloring.
   * Each line gets its own span with color based on the +/- prefix:
   *   '+' (not '+++') -> green
   *   '-' (not '---') -> red
   *   everything else -> dim brightBlack
   */
  private buildDiffSpans(diff: string): TextSpan[] {
    const lines = diff.split('\n');
    const spans: TextSpan[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLast = i === lines.length - 1;
      const text = isLast ? line : line + '\n';

      if (line.startsWith('+') && !line.startsWith('+++')) {
        spans.push(new TextSpan({
          text,
          style: new TextStyle({ foreground: Color.green }),
        }));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        spans.push(new TextSpan({
          text,
          style: new TextStyle({ foreground: Color.red }),
        }));
      } else {
        spans.push(new TextSpan({
          text,
          style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
        }));
      }
    }

    return spans;
  }
}
