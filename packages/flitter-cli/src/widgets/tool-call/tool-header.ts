// ToolHeader — status icon + tool name + details + spinner row
//
// Renders the header row for a tool call:
//   [status icon] [ToolName bold] [detail1 detail2 ...dim] [BrailleSpinner if in-progress]
//
// Ported from flitter-amp/src/widgets/tool-call/tool-header.ts
// — AmpThemeProvider colors replaced with direct Color constants
// — icon-registry import replaced with local tool-icons.ts
// — MouseRegion click handling and BrailleSpinner retained as-is

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../../flitter-core/src/framework/widget';
import { Row } from '../../../../flitter-core/src/widgets/flex';
import { Text } from '../../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../../flitter-core/src/core/text-span';
import { Color } from '../../../../flitter-core/src/core/color';
import { BrailleSpinner } from '../../../../flitter-core/src/utilities/braille-spinner';
import { MouseRegion } from '../../../../flitter-core/src/widgets/mouse-region';
import type { ToolCallItem } from '../../state/types';
import { toolStatusIcon } from './tool-icons';
import { CliThemeProvider, type CliTheme } from '../../themes';

/** Maximum character length for header detail strings before truncation. */
const MAX_DETAIL_LENGTH = 80;

/**
 * Normalizes a detail string by collapsing whitespace and truncating
 * to MAX_DETAIL_LENGTH characters with an ellipsis suffix.
 */
function normalizeInput(input: string): string {
  let normalized = input.replace(/\s+/g, ' ').trim();
  if (normalized.length > MAX_DETAIL_LENGTH) {
    normalized = normalized.slice(0, MAX_DETAIL_LENGTH - 1) + '\u2026';
  }
  return normalized;
}

/** Props for the ToolHeader widget. */
export interface ToolHeaderProps {
  name: string;
  status: ToolCallItem['status'];
  details?: string[];
  children?: Widget[];
  onToggle?: () => void;
  /**
   * Optional override color for the in-progress spinner.
   * When provided, the BrailleSpinner renders in this color.
   * Defaults to theme.app.toolRunning (VPOL-05: mode-aware spinner color).
   */
  spinnerColor?: Color;
}

/**
 * Renders the header row for a tool call:
 *   [status icon colored] [ToolName bold cyan] [detail1 detail2 ...dim] [BrailleSpinner if in-progress]
 *
 * Extended status colors (direct Color constants, no theme indirection):
 *   completed           -> green
 *   failed / blocked    -> red
 *   cancelled / rejected -> yellow
 *   in_progress         -> blue
 *   queued              -> brightBlack (dim)
 *   pending (default)   -> yellow
 *
 * Stateful: owns a BrailleSpinner that steps on a 200ms interval
 * while status is 'in_progress'. Spinner is stopped and cleaned up
 * when status transitions away or the widget is disposed.
 */
export class ToolHeader extends StatefulWidget {
  readonly name: string;
  readonly status: ToolCallItem['status'];
  readonly details: string[];
  readonly extraChildren: Widget[];
  readonly onToggle?: () => void;
  readonly spinnerColor?: Color;

  constructor(props: ToolHeaderProps) {
    super({});
    this.name = props.name;
    this.status = props.status;
    this.details = (props.details ?? []).map(normalizeInput);
    this.extraChildren = props.children ?? [];
    this.onToggle = props.onToggle;
    this.spinnerColor = props.spinnerColor;
  }

  createState(): ToolHeaderState {
    return new ToolHeaderState();
  }
}

/**
 * State for ToolHeader — manages BrailleSpinner lifecycle.
 */
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

  /** Start the 200ms spinner interval, calling setState on each step. */
  private startSpinner(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.spinner.step();
      });
    }, 200);
  }

  /** Stop the spinner interval and clean up the timer. */
  private stopSpinner(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const statusColor = this.getStatusColor(theme);
    const statusIcon = toolStatusIcon(this.widget.status);
    const statusDim = (this.widget.status as string) === 'queued';
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;

    const spans: TextSpan[] = [];
    const hasName = !!this.widget.name;
    const isRunning = this.widget.status === 'in_progress';

    if (hasName) {
      spans.push(
        new TextSpan({
          text: `${statusIcon} `,
          style: new TextStyle({ foreground: statusColor, dim: statusDim }),
        }),
        new TextSpan({
          text: this.widget.name,
          style: new TextStyle({ foreground: theme?.app.toolName ?? Color.cyan, bold: true, dim: statusDim }),
        }),
      );
    } else if (isRunning) {
      const spinColor = this.widget.spinnerColor ?? theme?.app.toolRunning ?? Color.blue;
      spans.push(new TextSpan({
        text: this.spinner.toBraille(),
        style: new TextStyle({ foreground: spinColor }),
      }));
    }

    for (const detail of this.widget.details) {
      const prefix = spans.length > 0 ? ' ' : '';
      spans.push(new TextSpan({
        text: `${prefix}${detail}`,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
    }

    if (isRunning && hasName) {
      const spinColor = this.widget.spinnerColor ?? theme?.app.toolRunning ?? Color.blue;
      spans.push(new TextSpan({
        text: ` ${this.spinner.toBraille()}`,
        style: new TextStyle({ foreground: spinColor }),
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
   * Maps tool status to the appropriate Color constant.
   * Extended: cancelled=yellow, queued=dim/brightBlack, blocked=red.
   */
  private getStatusColor(theme: CliTheme | undefined): Color {
    const status = this.widget.status as string;
    switch (status) {
      case 'completed':
        return theme?.app.toolSuccess ?? Color.green;
      case 'failed':
      case 'blocked':
      case 'blocked-on-user':
        return theme?.app.toolError ?? Color.red;
      case 'cancelled':
      case 'cancellation-requested':
      case 'rejected-by-user':
        return theme?.app.toolCancelled ?? Color.yellow;
      case 'in_progress':
        return theme?.app.toolRunning ?? Color.blue;
      case 'queued':
        return theme?.base.mutedForeground ?? Color.brightBlack;
      case 'pending':
      default:
        return theme?.base.warning ?? Color.yellow;
    }
  }
}
