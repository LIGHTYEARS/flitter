// ToolHeader — status icon + tool name + details + spinner row
// Amp ref: wQ function — [statusIcon colored] [ToolName bold accent] [details dim] [spinner]
// Status icons are resolved via toolStatusIcon() (AMP ref: status-icon-rR.js)

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
import { toolStatusIcon } from '../../ui/icons/icon-registry';

const MAX_DETAIL_LENGTH = 80;

function normalizeInput(input: string): string {
  let normalized = input.replace(/\s+/g, ' ').trim();
  if (normalized.length > MAX_DETAIL_LENGTH) {
    normalized = normalized.slice(0, MAX_DETAIL_LENGTH - 1) + '\u2026';
  }
  return normalized;
}

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
 * Extended status colors:
 *   in-progress  -> app.toolRunning (blue)
 *   pending      -> app.waiting (yellow)
 *   completed    -> app.toolSuccess (green)
 *   failed       -> base.destructive (red)
 *   cancelled    -> base.warning (yellow)
 *   queued       -> mutedForeground (dim)
 *   blocked      -> base.destructive (red)
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
    this.details = (props.details ?? []).map(normalizeInput);
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

  private startSpinner(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.spinner.step();
      });
    }, 200);
  }

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
    const statusIcon = toolStatusIcon(this.widget.status);
    const statusDim = (this.widget.status as string) === 'queued';

    const spans: TextSpan[] = [
      new TextSpan({
        text: `${statusIcon} `,
        style: new TextStyle({ foreground: statusColor, dim: statusDim }),
      }),
      new TextSpan({
        text: this.widget.name,
        style: new TextStyle({ foreground: toolNameColor, bold: true, dim: statusDim }),
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

  /**
   * Maps tool status to the appropriate color.
   * Extended: cancelled=yellow, queued=dim/muted, blocked=red.
   */
  private getStatusColor(theme: ReturnType<typeof AmpThemeProvider.maybeOf>): Color {
    const status = this.widget.status as string;
    switch (status) {
      case 'completed':
        return theme?.app.toolSuccess ?? Color.green;
      case 'failed':
      case 'blocked':
      case 'blocked-on-user':
        return theme?.base.destructive ?? Color.red;
      case 'cancelled':
      case 'cancellation-requested':
      case 'rejected-by-user':
        return theme?.base.warning ?? Color.yellow;
      case 'in_progress':
        return theme?.app.toolRunning ?? Color.blue;
      case 'queued':
        return theme?.base.mutedForeground ?? Color.brightBlack;
      case 'pending':
      default:
        return theme?.app.waiting ?? Color.yellow;
    }
  }
}
