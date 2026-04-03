// HandoffTool -- StatefulWidget with 700ms blink animation for handoff thread links.
//
// Renders a handoff tool call with:
//   - ToolHeader showing thread ID in details
//   - Blinking indicator (700ms interval) alternating green/dim when in_progress
//   - "Waiting for handoff" cyan text with blinking filled circle
//   - Result output text (dim) when expanded and completed
//
// Ported from flitter-amp/src/widgets/tool-call/handoff-tool.ts
// -- AmpThemeProvider replaced with direct Color constants
// -- icon('plan.status.in_progress') replaced with '\u25CF' (filled circle)

import {
  StatefulWidget,
  State,
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
import type { BaseToolProps } from './base-tool-props';
import { pickString } from '../../utils/raw-input';
import { extractOutputText } from './tool-output-utils';
import { PREVIEW_TRUNCATION_LIMIT } from './truncation-limits';
import { resolveToolDisplayName } from './resolve-tool-name';

/** Props for HandoffTool -- extends BaseToolProps with no additional fields. */
interface HandoffToolProps extends BaseToolProps {}

/**
 * Renders a handoff tool call with a blinking thread-link indicator.
 *
 * Uses StatefulWidget for the 700ms blink animation via setInterval + setState.
 * The blink alternates the filled circle between green and dim brightBlack.
 *
 * States:
 *   - in_progress: shows "Waiting for handoff" text + blinking dot (always visible)
 *   - completed/expanded: shows result output text as dim text
 *   - collapsed/not in_progress: header only
 */
export class HandoffTool extends StatefulWidget {
  readonly toolCall: HandoffToolProps['toolCall'];
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

/**
 * State for HandoffTool -- manages the 700ms blink animation lifecycle.
 *
 * The blink timer is started when the tool status is 'in_progress' and
 * stopped when the status transitions away or the widget is disposed.
 */
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
   * Toggles blinkVisible boolean and calls setState to trigger rebuild.
   */
  private startBlink(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.blinkVisible = !this.blinkVisible;
      });
    }, 700);
  }

  /**
   * Stops the blink animation interval and cleans up the timer reference.
   */
  private stopBlink(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  build(_context: BuildContext): Widget {
    const toolCall = this.widget.toolCall;
    const input = toolCall.rawInput ?? {};
    const threadId = pickString(input, ['thread_id', 'threadId']);

    const details: string[] = [];
    if (threadId) details.push(threadId);

    const isInProgress = toolCall.status === 'in_progress';

    // Blink alternates between green and dim brightBlack
    const blinkColor = isInProgress
      ? (this.blinkVisible ? Color.green : Color.brightBlack)
      : undefined;

    const header = new ToolHeader({
      name: resolveToolDisplayName(toolCall),
      status: toolCall.status,
      details,
      onToggle: this.widget.onToggle,
    });

    // When collapsed and not in_progress, show header only
    if (!this.widget.isExpanded && !isInProgress) {
      return header;
    }

    const bodyChildren: Widget[] = [];

    // "Waiting for handoff" text with blinking filled circle indicator
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
                    foreground: Color.cyan,
                  }),
                }),
                new TextSpan({
                  text: '\u25CF', // filled circle (replaces icon('plan.status.in_progress'))
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

    // Result output text when expanded and completed
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

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [header, ...bodyChildren],
    });
  }

  /**
   * Extracts output text from the tool result, truncated to PREVIEW_TRUNCATION_LIMIT.
   */
  private extractOutput(): string {
    return extractOutputText(this.widget.toolCall.result, { maxLength: PREVIEW_TRUNCATION_LIMIT });
  }
}
