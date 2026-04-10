// BashInvocationsWidget — displays bash command invocations and their output.
//
// AMP reference: BJR widget from 30_main_tui_state.js
//
// Renders a list of bash commands tracked in AppState:
//   - Running commands show animated braille spinner + "$ {command}" with shellMode color
//   - Completed/failed commands show status prefix + command, followed by output
//
// StatefulWidget: owns a 10-frame braille spinner animation (100ms interval)
// for running commands. Uses a 200ms show delay to avoid flicker for
// fast-completing commands.

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { CliThemeProvider } from '../themes';
import type { BashInvocation } from '../state/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Braille spinner frames matching AMP's toBraille() 10-frame sequence. */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Interval between spinner frame advances (ms). */
const SPINNER_INTERVAL_MS = 100;

/** Delay before showing the spinner to avoid flicker for fast commands (ms). */
const SHOW_DELAY_MS = 200;

// ---------------------------------------------------------------------------
// BashInvocationsWidget
// ---------------------------------------------------------------------------

interface BashInvocationsWidgetProps {
  invocations: BashInvocation[];
}

/**
 * Displays bash command invocations with animated status and output.
 *
 * Running commands: animated braille spinner + "$ {command}" in shellMode color.
 * The spinner only appears after SHOW_DELAY_MS (200ms) to avoid flicker
 * for commands that complete quickly.
 *
 * Completed commands: "✓ $ {command}" in dim, followed by output lines.
 * Failed commands: "✗ $ {command}" in error color, followed by output lines.
 *
 * AMP ref: BJR widget in 30_main_tui_state.js
 */
export class BashInvocationsWidget extends StatefulWidget {
  readonly invocations: BashInvocation[];

  constructor(props: BashInvocationsWidgetProps) {
    super({});
    this.invocations = props.invocations;
  }

  /** Create the mutable state for BashInvocationsWidget. */
  createState(): BashInvocationsState {
    return new BashInvocationsState();
  }
}

// ---------------------------------------------------------------------------
// BashInvocationsState — manages spinner animation lifecycle
// ---------------------------------------------------------------------------

/**
 * State for BashInvocationsWidget.
 *
 * Manages a braille spinner animation timer (100ms interval) that runs
 * while any invocation has status='running'. The spinner is gated by
 * a 200ms show delay to prevent flicker for fast-completing commands.
 *
 * Timer lifecycle:
 *   initState       -> start if any running
 *   didUpdateWidget -> start/stop based on running state transition
 *   dispose         -> always stop
 */
class BashInvocationsState extends State<BashInvocationsWidget> {
  /** Current spinner frame index (0-9). */
  private _spinnerFrame = 0;

  /** Interval timer handle for spinner animation. */
  private _spinnerTimer: ReturnType<typeof setInterval> | null = null;

  /** Timeout handle for the show delay. */
  private _showDelayTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether the spinner is visible (past the show delay). */
  private _spinnerVisible = false;

  // --- Lifecycle ---

  override initState(): void {
    super.initState();
    if (this._hasRunning()) {
      this._scheduleSpinnerStart();
    }
  }

  override didUpdateWidget(oldWidget: BashInvocationsWidget): void {
    const wasRunning = oldWidget.invocations.some(inv => inv.status === 'running' && !inv.hidden);
    const isRunning = this._hasRunning();

    if (isRunning && !wasRunning) {
      // Transition to running state: schedule spinner start with delay
      this._scheduleSpinnerStart();
    } else if (!isRunning && wasRunning) {
      // Transition away from running: stop spinner and hide
      this._stopSpinner();
      this._spinnerVisible = false;
    }
  }

  override dispose(): void {
    this._stopSpinner();
    super.dispose();
  }

  // --- Spinner management ---

  /**
   * Check if any non-hidden invocation is currently running.
   */
  private _hasRunning(): boolean {
    return this.widget.invocations.some(inv => inv.status === 'running' && !inv.hidden);
  }

  /**
   * Schedule the spinner to start after SHOW_DELAY_MS.
   * If a show delay is already pending, this is a no-op.
   */
  private _scheduleSpinnerStart(): void {
    if (this._spinnerTimer || this._showDelayTimer) return;

    this._showDelayTimer = setTimeout(() => {
      this._showDelayTimer = null;
      // Re-check: the command may have completed during the delay
      if (this._hasRunning()) {
        this._spinnerVisible = true;
        this._startSpinner();
        this.setState(() => {});
      }
    }, SHOW_DELAY_MS);
  }

  /**
   * Start the spinner animation interval timer.
   * Advances the frame every SPINNER_INTERVAL_MS and triggers a rebuild.
   */
  private _startSpinner(): void {
    if (this._spinnerTimer) return;
    this._spinnerTimer = setInterval(() => {
      this.setState(() => {
        this._spinnerFrame = (this._spinnerFrame + 1) % SPINNER_FRAMES.length;
      });
    }, SPINNER_INTERVAL_MS);
  }

  /**
   * Stop the spinner animation and clear all timers.
   */
  private _stopSpinner(): void {
    if (this._spinnerTimer) {
      clearInterval(this._spinnerTimer);
      this._spinnerTimer = null;
    }
    if (this._showDelayTimer) {
      clearTimeout(this._showDelayTimer);
      this._showDelayTimer = null;
    }
  }

  // --- Build ---

  build(context: BuildContext): Widget {
    if (this.widget.invocations.length === 0) {
      return new SizedBox({});
    }

    const theme = CliThemeProvider.maybeOf(context);
    const shellColor = theme?.app.shellMode;
    const errorColor = theme?.base.destructive;
    const dimColor = theme?.base.mutedForeground;
    const fgColor = theme?.base.foreground;

    const rows: Widget[] = [];

    for (const inv of this.widget.invocations) {
      // G5: skip hidden invocations ($$ prefix), matching AMP BJR behavior
      if (inv.hidden) continue;

      let color = shellColor;
      if (inv.status === 'failed') color = errorColor;
      if (inv.status === 'completed') color = dimColor;

      let statusIcon: string;
      if (inv.status === 'running') {
        // Animated braille spinner (only shown after show delay)
        statusIcon = this._spinnerVisible
          ? SPINNER_FRAMES[this._spinnerFrame % SPINNER_FRAMES.length] + ' '
          : '  '; // Reserve space during delay period
      } else if (inv.status === 'completed') {
        statusIcon = '✓ ';
      } else {
        statusIcon = '✗ ';
      }

      rows.push(new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: statusIcon,
              style: new TextStyle({ foreground: color, dim: inv.status !== 'running' }),
            }),
            new TextSpan({
              text: `$ ${inv.command}`,
              style: new TextStyle({ foreground: color, dim: inv.status !== 'running' }),
            }),
          ],
        }),
      }));

      if (inv.output && inv.status !== 'running') {
        rows.push(new Text({
          text: new TextSpan({
            text: inv.output,
            style: new TextStyle({ foreground: fgColor }),
          }),
        }));
      }
    }

    return new Column({
      crossAxisAlignment: 'start',
      mainAxisSize: 'min',
      children: rows,
    });
  }
}
