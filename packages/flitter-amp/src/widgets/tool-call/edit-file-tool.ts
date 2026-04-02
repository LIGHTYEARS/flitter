// EditFileTool — file edit display wrapping DiffView from flitter-core
// Amp ref: edit_file tool — shows file path + diff of changes

import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { DiffView } from 'flitter-core/src/widgets/diff-view';
import { ToolHeader } from './tool-header';
import { AmpThemeProvider } from '../../themes/index';
import type { BaseToolProps, ToolCallItem } from './base-tool-props';
import { pickString, asOptionalString } from '../../utils/raw-input';
import { extractDiff as extractDiffUtil, extractOutputText } from './tool-output-utils';
import { PREVIEW_TRUNCATION_LIMIT } from './truncation-limits';
import { resolveToolDisplayName, shortenPath } from './resolve-tool-name';

interface EditFileToolProps extends BaseToolProps {}

/**
 * Renders an edit_file / apply_patch / undo_edit tool call.
 * Shows the file path in the header and a DiffView when expanded.
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

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
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
      const { added, removed } = this.countDiffStats(diff);
      if (added > 0 || removed > 0) {
        const statSpans: TextSpan[] = [];
        if (added > 0) {
          statSpans.push(new TextSpan({
            text: `+${added}`,
            style: new TextStyle({ foreground: theme?.app.diffAdded ?? Color.green }),
          }));
        }
        if (added > 0 && removed > 0) {
          statSpans.push(new TextSpan({
            text: ' / ',
            style: new TextStyle({ foreground: theme?.base.mutedForeground ?? Color.brightBlack, dim: true }),
          }));
        }
        if (removed > 0) {
          statSpans.push(new TextSpan({
            text: `-${removed}`,
            style: new TextStyle({ foreground: theme?.app.diffRemoved ?? Color.red }),
          }));
        }
        statSpans.push(new TextSpan({
          text: ' lines',
          style: new TextStyle({ foreground: theme?.base.mutedForeground ?? Color.brightBlack, dim: true }),
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
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2 }),
          child: new DiffView({ diff, showLineNumbers: true }),
        }),
      );
    } else {
      const summary = extractOutputText(this.toolCall.result, { maxLength: PREVIEW_TRUNCATION_LIMIT });
      if (summary) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2, right: 2 }),
            child: new Text({
              text: new TextSpan({
                text: summary,
                style: new TextStyle({
                  foreground: theme?.base.mutedForeground ?? Color.brightBlack,
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
