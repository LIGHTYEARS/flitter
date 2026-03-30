import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { StickyHeader } from 'flitter-core/src/widgets/sticky-header';
import { ToolHeader } from './tool-header';
import type { BaseToolProps } from './base-tool-props';
import { resolveToolDisplayName } from './resolve-tool-name';
import { AmpThemeProvider } from '../../themes/index';

interface TaskToolProps extends BaseToolProps {
  childWidgets?: Widget[];
}

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

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
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
      const summaryText = this.extractSummaryText();
      if (summaryText) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2 }),
            child: new Text({
              text: new TextSpan({
                text: summaryText,
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
