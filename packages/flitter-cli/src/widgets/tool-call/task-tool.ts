// TaskTool -- StatelessWidget for sub-agent task delegation with nested child tools.
//
// Renders a task/sub-agent tool call with:
//   - ToolHeader showing subagent type, description, and child count
//   - Nested child tool widgets indented with left padding of 2
//   - Summary text fallback when no child widgets are provided
//   - StickyHeader layout so task header stays visible during scroll
//
// Ported from flitter-amp/src/widgets/tool-call/task-tool.ts
// -- AmpThemeProvider replaced with direct Color constants

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../../flitter-core/src/framework/widget';
import { Column } from '../../../../flitter-core/src/widgets/flex';
import { Padding } from '../../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../../flitter-core/src/layout/edge-insets';
import { Text } from '../../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../../flitter-core/src/core/text-span';
import { Color } from '../../../../flitter-core/src/core/color';
import { StickyHeader } from '../../../../flitter-core/src/widgets/sticky-header';
import { ToolHeader } from './tool-header';
import type { BaseToolProps } from './base-tool-props';
import { resolveToolDisplayName } from './resolve-tool-name';

/** Props for TaskTool -- extends BaseToolProps with optional child widgets. */
interface TaskToolProps extends BaseToolProps {
  /** Pre-built ToolCallWidgets for child tool calls belonging to this Task. */
  childWidgets?: Widget[];
}

/**
 * Renders a task/sub-agent tool call with optional nested child tool widgets.
 *
 * When childWidgets are provided, they render indented (left padding 2) under
 * the task header inside a StickyHeader layout. Without childWidgets, a summary
 * text (description + subagentType) is shown.
 *
 * Header details include:
 *   - SubagentType / subagentType from rawInput
 *   - Description / description / Prompt / prompt from rawInput (truncated to 80 chars)
 *   - Child count: "(N tools)" if childWidgets present
 */
export class TaskTool extends StatelessWidget {
  private readonly toolCall: TaskToolProps['toolCall'];
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;
  private readonly childWidgets: Widget[];

  constructor(props: TaskToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
    this.childWidgets = props.childWidgets ?? [];
  }

  build(_context: BuildContext): Widget {
    const details = this.extractDetails();

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

    // Render nested child tool widgets with left indent
    if (this.childWidgets.length > 0) {
      for (const child of this.childWidgets) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2 }),
            child: child,
          }),
        );
      }
    } else {
      // No child widgets -- render summary text as fallback
      const summaryText = this.extractSummaryText();
      if (summaryText) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2 }),
            child: new Text({
              text: new TextSpan({
                text: summaryText,
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

    // If no body content, return header only
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
   * Extracts header detail strings from rawInput fields.
   * Includes subagent type, description (truncated to 80 chars), and child count.
   */
  private extractDetails(): string[] {
    const details: string[] = [];
    const raw = this.toolCall.rawInput;
    if (raw) {
      const subagentType = raw['SubagentType'] || raw['subagentType'];
      if (subagentType) details.push(String(subagentType));
      const description =
        raw['Description'] || raw['description'] || raw['Prompt'] || raw['prompt'];
      if (description) details.push(String(description).slice(0, 80));
    }
    if (this.childWidgets.length > 0) {
      details.push(`(${this.childWidgets.length} tools)`);
    }
    return details;
  }

  /**
   * Extracts summary text from rawInput for display when no child widgets exist.
   * Combines description and subagent type, separated by newlines.
   */
  private extractSummaryText(): string {
    const raw = this.toolCall.rawInput;
    if (!raw) return '';
    const parts: string[] = [];
    const description =
      raw['Description'] || raw['description'] || raw['Prompt'] || raw['prompt'];
    if (description) parts.push(String(description));
    const subagentType = raw['SubagentType'] || raw['subagentType'];
    if (subagentType) parts.push(String(subagentType));
    return parts.join('\n');
  }
}
