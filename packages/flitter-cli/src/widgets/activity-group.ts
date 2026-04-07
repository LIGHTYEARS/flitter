// ActivityGroup — StatefulWidget for collapsible subagent tool-call groups.
//
// Port of AMP's G1R/z1R (01_activity_group_*.js):
//   - Collapsible expand/collapse with ▼/▶ chevron (ACTV-01)
//   - Collapsed summary shows "N ✓ | M ✗" aggregation (ACTV-02)
//   - Tree-line characters ├── / ╰── for visual hierarchy (ACTV-03)
//   - BrailleSpinner animation while group is active
//   - Staggered 90ms progressive reveal of actions
//
// The widget receives an array of ActivityAction items (tool calls or
// inline text messages from a subagent) and renders them as a tree.

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Row } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import { BrailleSpinner } from '../../../flitter-core/src/utilities/braille-spinner';
import { CliThemeProvider, type CliTheme } from '../themes';
import { icon } from '../utils/icon-registry';
import type { ToolCallItem } from '../state/types';
import { resolveToolDisplayName } from './tool-call/resolve-tool-name';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single action within an ActivityGroup — either a tool call or
 * an inline text message emitted by a subagent.
 */
export interface ActivityAction {
  /** Discriminator: tool_call renders a ToolHeader, text renders plain text. */
  kind: 'tool_call' | 'text';
  /** The tool call item (present when kind === 'tool_call'). */
  toolCall?: ToolCallItem;
  /** Inline text message (present when kind === 'text'). */
  text?: string;
}

/**
 * Props for the ActivityGroup widget.
 * Mirrors AMP's G1R.props.group structure.
 */
export interface ActivityGroupProps {
  /** Child actions in this group (tool calls + inline text). */
  actions: ActivityAction[];
  /** Aggregation counts for collapsed summary. */
  summary: { success: number; error: number };
  /** Whether any action is currently in-progress. */
  hasInProgress: boolean;
  /** Header display name (e.g. "Subagent"). */
  displayName: string;
  /** Header description text (e.g. subagent task description). */
  description: string;
}

// ---------------------------------------------------------------------------
// ActivityGroup — StatefulWidget (G1R equivalent)
// ---------------------------------------------------------------------------

/**
 * Collapsible activity group widget that renders a subagent's actions
 * as a tree with branch/leaf connectors.
 *
 * AMP equivalent: G1R / z1R from 01_activity_group_*.js
 */
export class ActivityGroup extends StatefulWidget {
  readonly props: ActivityGroupProps;

  constructor(props: ActivityGroupProps) {
    super();
    this.props = props;
  }

  createState(): ActivityGroupState {
    return new ActivityGroupState();
  }
}

// ---------------------------------------------------------------------------
// ActivityGroupState — State (z1R equivalent)
// ---------------------------------------------------------------------------

/** Staggered action reveal interval in ms (AMP: 90ms). */
const APPEND_STEP_MS = 90;

/** Spinner animation interval in ms (AMP: 200ms). */
const SPINNER_INTERVAL_MS = 200;

/**
 * Mutable state for ActivityGroup.
 *
 * Manages expand/collapse toggle, BrailleSpinner lifecycle, and
 * staggered progressive reveal of action items.
 */
class ActivityGroupState extends State<ActivityGroup> {
  /** Whether the group body is expanded (shows tree). Default: collapsed. */
  private _expanded = false;

  /** BrailleSpinner for active-state animation. */
  private _spinner = new BrailleSpinner();

  /** Interval handle for spinner stepping (200ms). */
  private _animationTimer: ReturnType<typeof setInterval> | null = null;

  /** Number of actions currently visible (for staggered reveal). */
  private _visibleActionCount = 0;

  /** Timeout handle for staggered append steps (90ms). */
  private _pendingAppendTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether the group is currently active (has in-progress actions). */
  private get _isActive(): boolean {
    return this.widget.props.hasInProgress;
  }

  override initState(): void {
    super.initState();
    this._visibleActionCount = this.widget.props.actions.length;
    if (this._isActive) {
      this._startAnimation();
    }
  }

  override didUpdateWidget(oldWidget: ActivityGroup): void {
    super.didUpdateWidget(oldWidget);

    const oldActions = oldWidget.props.actions;
    const newActions = this.widget.props.actions;

    // Handle action list changes (same logic as AMP z1R.didUpdateWidget)
    if (oldActions !== newActions) {
      const oldLen = oldActions.length;
      const newLen = newActions.length;

      if (newLen < oldLen) {
        // Actions removed — reset to new length
        this._clearPendingAppendTimer();
        this._visibleActionCount = newLen;
      } else {
        // Actions added or same length
        if (!this._isActive) {
          // Not active — show all immediately
          this._clearPendingAppendTimer();
          this._visibleActionCount = newLen;
        } else {
          // Active — stagger new actions
          this._visibleActionCount = Math.max(this._visibleActionCount, oldLen);
          this._scheduleAppendStep(newLen);
        }
      }
    }

    // Handle activity state transitions
    const wasActive = oldWidget.props.hasInProgress;
    if (!wasActive && this._isActive) {
      // Became active — start animation
      this._startAnimation();
      this._scheduleAppendStep(newActions.length);
    } else if (wasActive && !this._isActive) {
      // Became inactive — stop animation, show all
      this._stopAnimation();
      this._clearPendingAppendTimer();
      this._visibleActionCount = newActions.length;
    }
  }

  override dispose(): void {
    this._stopAnimation();
    this._clearPendingAppendTimer();
    super.dispose();
  }

  // --- Animation control (AMP: _startAnimation / _stopAnimation) ---

  /** Start the 200ms spinner interval. */
  private _startAnimation(): void {
    if (this._animationTimer) return;
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, SPINNER_INTERVAL_MS);
  }

  /** Stop the spinner interval and clean up. */
  private _stopAnimation(): void {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer);
    this._animationTimer = null;
  }

  // --- Staggered reveal (AMP: _scheduleAppendStep / _clearPendingAppendTimer) ---

  /** Clear any pending append timer. */
  private _clearPendingAppendTimer(): void {
    if (!this._pendingAppendTimer) return;
    clearTimeout(this._pendingAppendTimer);
    this._pendingAppendTimer = null;
  }

  /** Schedule the next staggered action reveal step. */
  private _scheduleAppendStep(targetCount: number): void {
    if (this._visibleActionCount >= targetCount || this._pendingAppendTimer) return;
    this._pendingAppendTimer = setTimeout(() => {
      this._pendingAppendTimer = null;
      this.setState(() => {
        this._visibleActionCount = Math.min(this._visibleActionCount + 1, targetCount);
      });
      this._scheduleAppendStep(targetCount);
    }, APPEND_STEP_MS);
  }

  // --- Toggle ---

  /** Toggle expanded/collapsed state. */
  private _toggle(): void {
    this.setState(() => {
      this._expanded = !this._expanded;
    });
  }

  // --- Build ---

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const { actions, summary, displayName, description } = this.widget.props;

    // --- Header spans ---
    const spans: TextSpan[] = [];

    // Status icon: spinner when active, checkmark when done
    if (this._isActive) {
      spans.push(new TextSpan({
        text: `${this._spinner.toBraille()} `,
        style: new TextStyle({
          foreground: theme?.app.toolRunning ?? Color.blue,
        }),
      }));
    } else {
      spans.push(new TextSpan({
        text: '\u2713 ',
        style: new TextStyle({
          foreground: theme?.app.toolSuccess ?? Color.green,
        }),
      }));
    }

    // Display name (bold)
    spans.push(new TextSpan({
      text: displayName,
      style: new TextStyle({
        bold: true,
      }),
    }));

    // Description (dim)
    if (description) {
      spans.push(new TextSpan({
        text: ` ${description}`,
        style: new TextStyle({
          foreground: theme?.base.mutedForeground ?? Color.brightBlack,
          dim: true,
        }),
      }));
    }

    // Expand/collapse chevron
    const chevron = this._expanded ? ' \u25BC' : ' \u25B6';
    spans.push(new TextSpan({
      text: chevron,
      style: new TextStyle({
        foreground: theme?.base.mutedForeground ?? Color.brightBlack,
        dim: true,
      }),
    }));

    // Summary counts when collapsed (ACTV-02)
    if (!this._expanded && (summary.success > 0 || summary.error > 0)) {
      const summaryParts: string[] = [];
      if (summary.success > 0) {
        summaryParts.push(`${summary.success} \u2713`);
      }
      if (summary.error > 0) {
        summaryParts.push(`${summary.error} \u2715`);
      }
      spans.push(new TextSpan({
        text: ` ${summaryParts.join(' | ')}`,
        style: new TextStyle({
          foreground: theme?.base.mutedForeground ?? Color.brightBlack,
          dim: true,
        }),
      }));
    }

    const headerText = new Text({
      text: new TextSpan({ children: spans }),
    });

    // Wrap header in MouseRegion for click-to-toggle
    const header = new MouseRegion({
      onClick: () => this._toggle(),
      child: headerText,
    });

    // --- If collapsed, return header only ---
    if (!this._expanded) {
      return header;
    }

    // --- Expanded body: tree-lined actions ---
    const bodyChildren: Widget[] = [];
    const visibleCount = Math.min(this._visibleActionCount, actions.length);

    for (let i = 0; i < visibleCount; i++) {
      const action = actions[i];
      const isLast = i === visibleCount - 1;

      // Tree-line prefix: ├── for non-last, ╰── for last (dim)
      const prefix = isLast ? icon('tree.leaf') : icon('tree.branch');
      const prefixSpan = new TextSpan({
        text: prefix,
        style: new TextStyle({
          foreground: theme?.base.mutedForeground ?? Color.brightBlack,
          dim: true,
        }),
      });

      let contentWidget: Widget;
      if (action.kind === 'tool_call' && action.toolCall) {
        // Tool call — render as inline ToolHeader
        contentWidget = this._buildToolCallAction(action.toolCall, theme);
      } else {
        // Text message — render as plain text
        contentWidget = new Text({
          text: new TextSpan({
            text: action.text ?? '',
          }),
        });
      }

      // Combine prefix + content in a Row
      bodyChildren.push(
        new Padding({
          padding: EdgeInsets.only({ left: 2 }),
          child: new Row({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              new Text({ text: prefixSpan }),
              contentWidget,
            ],
          }),
        }),
      );
    }

    // Combine header + body
    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [header, ...bodyChildren],
    });
  }

  /**
   * Build a compact tool-call action row for inside the tree.
   * Shows: [status_icon colored] [ToolName bold] [detail dim]
   */
  private _buildToolCallAction(toolCall: ToolCallItem, theme: CliTheme | undefined): Widget {
    const displayName = resolveToolDisplayName(toolCall);
    const statusColor = this._getStatusColor(toolCall.status, theme);
    const statusIcon = toolCall.status === 'completed'
      ? '\u2713'
      : toolCall.status === 'failed'
        ? '\u2715'
        : '\u22EF';

    const spans: TextSpan[] = [
      new TextSpan({
        text: `${statusIcon} `,
        style: new TextStyle({ foreground: statusColor }),
      }),
      new TextSpan({
        text: displayName,
        style: new TextStyle({ bold: true }),
      }),
    ];

    // Extract detail from title (strip leading tool name)
    const title = toolCall.title ?? '';
    const spaceIdx = title.indexOf(' ');
    if (spaceIdx !== -1) {
      const detail = title.slice(spaceIdx + 1);
      if (detail) {
        spans.push(new TextSpan({
          text: ` ${detail}`,
          style: new TextStyle({
            foreground: theme?.base.mutedForeground ?? Color.brightBlack,
            dim: true,
          }),
        }));
      }
    }

    return new Text({
      text: new TextSpan({ children: spans }),
    });
  }

  /**
   * Map tool status to the appropriate color constant.
   */
  private _getStatusColor(status: string, theme: CliTheme | undefined): Color {
    switch (status) {
      case 'completed':
        return theme?.app.toolSuccess ?? Color.green;
      case 'failed':
        return theme?.app.toolError ?? Color.red;
      case 'in_progress':
        return theme?.app.toolRunning ?? Color.blue;
      default:
        return theme?.base.warning ?? Color.yellow;
    }
  }
}
