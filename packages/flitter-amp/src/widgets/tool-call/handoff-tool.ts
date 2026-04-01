// HandoffTool — thread link display with 700ms blink animation
// Amp ref: handoff tool — shows thread link with blinking indicator

import {
  StatefulWidget, State, Widget, BuildContext,
} from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { ToolHeader } from './tool-header';
import { AmpThemeProvider } from '../../themes/index';
import type { BaseToolProps, ToolCallItem } from './base-tool-props';
import { pickString } from '../../utils/raw-input';
import { extractOutputText } from './tool-output-utils';
import { PREVIEW_TRUNCATION_LIMIT } from './truncation-limits';
import { resolveToolDisplayName } from './resolve-tool-name';
import { icon } from '../../ui/icons/icon-registry';

interface HandoffToolProps extends BaseToolProps {}

/**
 * Renders a handoff tool call with a blinking thread link indicator.
 * Uses StatefulWidget for the 700ms blink animation via setInterval + setState.
 */
export class HandoffTool extends StatefulWidget {
  readonly toolCall: ToolCallItem;
  readonly isExpanded: boolean;
  readonly onToggle?: () => void;

  constructor(props: HandoffToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;
  }

  createState(): HandoffToolState {
    return new HandoffToolState();
  }
}

class HandoffToolState extends State<HandoffTool> {
  private blinkVisible = true;
  private timer: ReturnType<typeof setInterval> | null = null;

  override initState(): void {
    super.initState();
    if (this.widget.toolCall.status === 'in_progress') {
      this.startBlink();
    }
  }

  override didUpdateWidget(_oldWidget: HandoffTool): void {
    if (this.widget.toolCall.status === 'in_progress' && !this.timer) {
      this.startBlink();
    } else if (this.widget.toolCall.status !== 'in_progress' && this.timer) {
      this.stopBlink();
    }
  }

  override dispose(): void {
    this.stopBlink();
    super.dispose();
  }

  /**
   * Starts the 700ms blink animation interval.
   */
  private startBlink(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.blinkVisible = !this.blinkVisible;
      });
    }, 700);
  }

  /**
   * Stops the blink animation interval.
   */
  private stopBlink(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const toolCall = this.widget.toolCall;
    const input = toolCall.rawInput ?? {};
    const threadId = pickString(input, ['thread_id', 'threadId']);

    const details: string[] = [];
    if (threadId) details.push(threadId);

    const isInProgress = toolCall.status === 'in_progress';
    const blinkColor = isInProgress
      ? (this.blinkVisible
          ? (theme?.app.toolSuccess ?? Color.green)
          : (theme?.base.mutedForeground ?? Color.brightBlack))
      : undefined;

    const header = new ToolHeader({
      name: resolveToolDisplayName(toolCall),
      status: toolCall.status,
      details,
      onToggle: this.widget.onToggle,
    });

    if (!this.widget.isExpanded && !isInProgress) {
      return header;
    }

    const bodyChildren: Widget[] = [];

    if (isInProgress) {
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Text({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: 'Waiting for handoff ',
                  style: new TextStyle({
                    foreground: theme?.app.handoffMode ?? Color.cyan,
                  }),
                }),
                new TextSpan({
                  text: icon('plan.status.in_progress'),
                  style: new TextStyle({
                    foreground: blinkColor,
                  }),
                }),
              ],
            }),
          }),
        }),
      );
    }

    if (this.widget.isExpanded) {
      const output = this.extractOutput();
      if (output) {
        bodyChildren.push(
          new Padding({
            padding: EdgeInsets.only({ left: 2, right: 2 }),
            child: new Text({
              text: new TextSpan({
                text: output,
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
   * Extracts output text from the tool result.
   */
  private extractOutput(): string {
    return extractOutputText(this.widget.toolCall.result, { maxLength: PREVIEW_TRUNCATION_LIMIT });
  }
}
