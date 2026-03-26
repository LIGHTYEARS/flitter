// ToolCallBlock — collapsible tool call display matching Amp's style
// Amp ref: ▶/▼ chevron + kind + title + status icon, expandable body

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { DiffView } from 'flitter-core/src/widgets/diff-view';
import type { ToolCallItem } from '../acp/types';

interface ToolCallBlockProps {
  item: ToolCallItem;
}

export class ToolCallBlock extends StatelessWidget {
  private readonly item: ToolCallItem;

  constructor(props: ToolCallBlockProps) {
    super({});
    this.item = props.item;
  }

  build(): Widget {
    const { item } = this;

    const statusIcon =
      item.status === 'completed' ? '✓' :
      item.status === 'failed' ? '✗' :
      item.status === 'in_progress' ? '⏳' : '◌';

    const statusColor =
      item.status === 'completed' ? Color.green :
      item.status === 'failed' ? Color.red :
      Color.yellow;

    const chevron = item.collapsed ? '▶' : '▼';

    const children: Widget[] = [
      // Header line: ▶ Kind  title  ✓
      new Text({
        text: new TextSpan({
          text: `  ${chevron} ${item.kind}  ${item.title}  ${statusIcon}`,
          style: new TextStyle({ foreground: statusColor }),
        }),
      }),
    ];

    // If expanded, show details
    if (!item.collapsed) {
      // Show diff if the result contains one
      const diff = this.extractDiff();
      if (diff) {
        children.push(
          new Padding({
            padding: EdgeInsets.only({ left: 4, right: 2 }),
            child: new DiffView({ diff }),
          }),
        );
      } else if (item.result) {
        // Show raw output
        const output = this.extractOutput();
        if (output) {
          children.push(
            new Padding({
              padding: EdgeInsets.only({ left: 4, right: 2 }),
              child: new Text({
                text: new TextSpan({
                  text: output,
                  style: new TextStyle({ foreground: Color.brightBlack }),
                }),
              }),
            }),
          );
        }
      }
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'start',
      children,
    });
  }

  /**
   * Try to extract a unified diff from the tool call result.
   * Edit/Write tool calls often contain diffs in their output.
   */
  private extractDiff(): string | null {
    if (!this.item.result) return null;

    // Check rawOutput for diff content
    const raw = this.item.result.rawOutput;
    if (raw) {
      const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      // Simple heuristic: if it contains unified diff markers
      if (rawStr.includes('@@') && (rawStr.includes('---') || rawStr.includes('+++'))) {
        return rawStr;
      }
    }

    // Check content array
    if (this.item.result.content) {
      for (const c of this.item.result.content) {
        const text = c.content?.text;
        if (text && text.includes('@@') && (text.includes('---') || text.includes('+++'))) {
          return text;
        }
      }
    }

    return null;
  }

  /**
   * Extract displayable output from the tool call result.
   */
  private extractOutput(): string {
    if (!this.item.result) return '';

    if (this.item.result.rawOutput) {
      return JSON.stringify(this.item.result.rawOutput, null, 2).slice(0, 500);
    }

    return this.item.result.content
      ?.map(c => c.content?.text ?? '')
      .join('\n') ?? '';
  }
}
