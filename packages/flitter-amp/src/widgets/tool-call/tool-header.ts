// ToolHeader — status icon + tool name + details + spinner row
// Amp ref: wQ function — [statusIcon colored] [ToolName bold accent] [details dim] [spinner]
// Status: ✓ completed (toolSuccess), ✗ failed (destructive), ⋯ in-progress (toolRunning), ⋯ pending (waiting)

import {
  StatefulWidget, State, Widget, BuildContext,
} from 'flitter-core/src/framework/widget';
import { Row } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { BrailleSpinner } from 'flitter-core/src/utilities/braille-spinner';
import { MouseRegion } from 'flitter-core/src/widgets/mouse-region';
import { AmpThemeProvider } from '../../themes/index';
import type { ToolCallItem } from '../../acp/types';

interface ToolHeaderProps {
  name: string;
  status: ToolCallItem['status'];
  details?: string[];
  children?: Widget[];
  onToggle?: () => void;
}

/**
 * Renders the header row for a tool call:
 *   [status icon] [ToolName bold] [detail1 detail2 ...dim] [BrailleSpinner if in-progress]
 *
 * Uses StatefulWidget to drive BrailleSpinner animation at ~200ms per frame
 * when toolCall.status === 'in_progress'.
 *
 * Uses AmpThemeProvider for status colors:
 *   in-progress → app.toolRunning
 *   pending     → app.waiting
 *   completed   → app.toolSuccess
 *   failed      → base.destructive
 */
export class ToolHeader extends StatefulWidget {
  readonly name: string;
  readonly status: ToolCallItem['status'];
  readonly details: string[];
  readonly extraChildren: Widget[];
  readonly onToggle?: () => void;

  constructor(props: ToolHeaderProps) {
    super({});
    this.name = props.name;
    this.status = props.status;
    this.details = props.details ?? [];
    this.extraChildren = props.children ?? [];
    this.onToggle = props.onToggle;
  }

  createState(): ToolHeaderState {
    return new ToolHeaderState();
  }
}

class ToolHeaderState extends State<ToolHeader> {
  private spinner = new BrailleSpinner();
  private timer: ReturnType<typeof setInterval> | null = null;

  override initState(): void {
    super.initState();
    if (this.widget.status === 'in_progress') {
      this.startSpinner();
    }
  }

  override didUpdateWidget(_oldWidget: ToolHeader): void {
    if (this.widget.status === 'in_progress' && !this.timer) {
      this.startSpinner();
    } else if (this.widget.status !== 'in_progress' && this.timer) {
      this.stopSpinner();
    }
  }

  override dispose(): void {
    this.stopSpinner();
    super.dispose();
  }

  /**
   * Starts the BrailleSpinner animation at ~200ms per frame.
   * Amp ref: README section 11.1 -- stepped every 200ms
   */
  private startSpinner(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.spinner.step();
      });
    }, 200);  // Amp ref: braille spinner stepped every 200ms (README section 11.1)
  }

  /**
   * Stops the BrailleSpinner animation interval.
   */
  private stopSpinner(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);

    const statusColor = this.getStatusColor(theme);
    const toolNameColor = theme?.app.toolName ?? Color.cyan;

    const statusIcon = this.getStatusIcon();

    const spans: TextSpan[] = [
      new TextSpan({
        text: `${statusIcon} `,
        style: new TextStyle({ foreground: statusColor }),
      }),
      new TextSpan({
        text: this.widget.name,
        style: new TextStyle({ foreground: toolNameColor, bold: true }),
      }),
    ];

    for (const detail of this.widget.details) {
      spans.push(new TextSpan({
        text: ` ${detail}`,
        style: new TextStyle({ foreground: theme?.base.mutedForeground ?? Color.brightBlack, dim: true }),
      }));
    }

    if (this.widget.status === 'in_progress') {
      spans.push(new TextSpan({
        text: ` ${this.spinner.toBraille()}`,
        style: new TextStyle({ foreground: theme?.base.mutedForeground ?? Color.brightBlack }),
      }));
    }

    const headerText = new Text({
      text: new TextSpan({ children: spans }),
    });

    let result: Widget;
    if (this.widget.extraChildren.length === 0) {
      result = headerText;
    } else {
      result = new Row({
        mainAxisSize: 'min',
        children: [headerText, ...this.widget.extraChildren],
      });
    }

    if (this.widget.onToggle) {
      result = new MouseRegion({
        onClick: () => this.widget.onToggle!(),
        child: result,
      });
    }

    return result;
  }

  private getStatusIcon(): string {
    switch (this.widget.status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'in_progress':
      case 'pending':
      default:
        return '⋯';
    }
  }

  private getStatusColor(theme: ReturnType<typeof AmpThemeProvider.maybeOf>): Color {
    switch (this.widget.status) {
      case 'completed':
        return theme?.app.toolSuccess ?? Color.green;
      case 'failed':
        return theme?.base.destructive ?? Color.red;
      case 'in_progress':
        return theme?.app.toolRunning ?? Color.blue;
      case 'pending':
      default:
        return theme?.app.waiting ?? Color.yellow;
    }
  }
}
