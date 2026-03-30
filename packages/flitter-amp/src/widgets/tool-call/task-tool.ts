// TaskTool — sub-agent recursive rendering using GenericToolCard
// Amp ref: Task/oracle tool — recursively renders nested tool calls

import { StatelessWidget, Widget, BuildContext } from 'flitter-core/src/framework/widget';
import { GenericToolCard } from './generic-tool-card';
import type { BaseToolProps, ToolCallItem } from './base-tool-props';

interface TaskToolProps extends BaseToolProps {}

/**
 * Renders a Task / oracle sub-agent tool call.
 * Delegates to GenericToolCard which supports recursive nested tool call rendering.
 */
export class TaskTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: TaskToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    return new GenericToolCard({
      toolCall: this.toolCall,
      isExpanded: this.isExpanded,
      onToggle: this.onToggle,
    });
  }
}
