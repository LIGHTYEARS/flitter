// StatusBar — bottom status bar for flitter-cli, fixed height 1 row.
//
// Renders as the last line in the terminal, below InputArea.
// Shows contextual status (running tools, waiting for approval, streaming)
// with a static wave character prefix. Hidden when idle.
//

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Row } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { CliThemeProvider } from '../themes';

export interface StatusBarProps {
  cwd: string;
  gitBranch?: string;
  agentName?: string;
  contextWindowUsagePercent?: number;
  isProcessing: boolean;
  isStreaming?: boolean;
  isInterrupted?: boolean;
  isExecutingCommand?: boolean;
  isRunningShell?: boolean;
  isAutoCompacting?: boolean;
  isHandingOff?: boolean;
  isAwaitingPermission?: boolean;
  hasRunningTools?: boolean;
  hasStartedResponse?: boolean;
  statusMessage?: string;
  copyHighlight?: boolean;
  searchState?: { query: string; isFailing: boolean } | null;
  hintText?: string;
  deepReasoningActive?: boolean;
  /** S3-4: Current deep reasoning effort level string (e.g. 'medium', 'high', 'xhigh'). */
  deepReasoningEffort?: string | null;
  /** S3-4: Effort hint text to display when deep reasoning is active. */
  effortHintText?: string | null;
  inputText?: string;
  isShowingShortcutsHelp?: boolean;
  /** 是否有正在运行或等待显示的 bash invocations（bashInvocations.length > 0 || pendingBashInvocations.size > 0）。 */
  runningBashInvocations?: boolean;
}

// ---------------------------------------------------------------------------
// getFooterText — contextual status text based on app sub-states
// ---------------------------------------------------------------------------

export function getFooterText(props: {
  isProcessing: boolean;
  isStreaming: boolean;
  isInterrupted: boolean;
  isExecutingCommand: boolean;
  isRunningShell: boolean;
  isAutoCompacting: boolean;
  isHandingOff: boolean;
  isAwaitingPermission: boolean;
  hasRunningTools: boolean;
  hasStartedResponse: boolean;
  /** 是否有正在运行或等待显示的 bash invocations。 */
  runningBashInvocations?: boolean;
}): string {
  if (props.isInterrupted) return 'Stream interrupted';
  if (props.isExecutingCommand) return 'Executing command...';
  // AMP yB(): executingCommand → runningBashInvocations → compacting
  if (props.isRunningShell) return 'Running shell...';
  if (props.runningBashInvocations) return 'Running shell command...';
  if (props.isAutoCompacting) return 'Auto-compacting context...';
  if (props.isHandingOff) return 'Handing off to subagent...';
  if (props.isProcessing && props.hasRunningTools) return 'Running tools...';
  if (props.isProcessing && props.isAwaitingPermission) return 'Waiting for approval...';
  // AMP yB(): streaming + hasStarted + runningBashInvocations → 'Running tools...'
  if (props.isStreaming && props.hasStartedResponse && props.runningBashInvocations) return 'Running tools...';
  if (props.isStreaming && props.hasStartedResponse) return 'Streaming response...';
  if (props.isStreaming && !props.hasStartedResponse) return 'Waiting for response...';
  if (props.isProcessing) return 'Running tools...';
  return '';
}

export class StatusBar extends StatelessWidget {
  private readonly cwd: string;
  private readonly gitBranch: string | undefined;
  private readonly agentName: string | undefined;
  private readonly contextWindowUsagePercent: number | undefined;
  private readonly isProcessing: boolean;
  private readonly isStreaming: boolean;
  private readonly isInterrupted: boolean;
  private readonly isExecutingCommand: boolean;
  private readonly isRunningShell: boolean;
  private readonly isAutoCompacting: boolean;
  private readonly isHandingOff: boolean;
  private readonly isAwaitingPermission: boolean;
  private readonly hasRunningTools: boolean;
  private readonly hasStartedResponse: boolean;
  private readonly statusMessage: string | undefined;
  private readonly copyHighlight: boolean;
  private readonly searchState: { query: string; isFailing: boolean } | null;
  private readonly hintText: string | undefined;
  private readonly deepReasoningActive: boolean;
  /** S3-4: Current deep reasoning effort level. */
  private readonly deepReasoningEffort: string | null;
  /** S3-4: Effort hint text from EffortHintController. */
  private readonly effortHintText: string | null;
  private readonly inputText: string;
  private readonly isShowingShortcutsHelp: boolean;
  private readonly runningBashInvocations: boolean;

  constructor(props: StatusBarProps) {
    super({});
    this.cwd = props.cwd;
    this.gitBranch = props.gitBranch;
    this.agentName = props.agentName;
    this.contextWindowUsagePercent = props.contextWindowUsagePercent;
    this.isProcessing = props.isProcessing;
    this.isStreaming = props.isStreaming ?? false;
    this.isInterrupted = props.isInterrupted ?? false;
    this.isExecutingCommand = props.isExecutingCommand ?? false;
    this.isRunningShell = props.isRunningShell ?? false;
    this.isAutoCompacting = props.isAutoCompacting ?? false;
    this.isHandingOff = props.isHandingOff ?? false;
    this.isAwaitingPermission = props.isAwaitingPermission ?? false;
    this.hasRunningTools = props.hasRunningTools ?? false;
    this.hasStartedResponse = props.hasStartedResponse ?? false;
    this.statusMessage = props.statusMessage;
    this.copyHighlight = props.copyHighlight ?? false;
    this.searchState = props.searchState ?? null;
    this.hintText = props.hintText;
    this.deepReasoningActive = props.deepReasoningActive ?? false;
    this.deepReasoningEffort = props.deepReasoningEffort ?? null;
    this.effortHintText = props.effortHintText ?? null;
    this.inputText = props.inputText ?? '';
    this.isShowingShortcutsHelp = props.isShowingShortcutsHelp ?? false;
    this.runningBashInvocations = props.runningBashInvocations ?? false;
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const footerText = getFooterText({
      isProcessing: this.isProcessing,
      isStreaming: this.isStreaming,
      isInterrupted: this.isInterrupted,
      isExecutingCommand: this.isExecutingCommand,
      isRunningShell: this.isRunningShell,
      isAutoCompacting: this.isAutoCompacting,
      isHandingOff: this.isHandingOff,
      isAwaitingPermission: this.isAwaitingPermission,
      hasRunningTools: this.hasRunningTools,
      hasStartedResponse: this.hasStartedResponse,
      runningBashInvocations: this.runningBashInvocations,
    });

    if (!footerText) {
      // S3-4: Show effort level hint when deep reasoning is active and idle
      if (this.deepReasoningActive && this.effortHintText) {
        const effortColor = theme?.base.accent ?? Color.magenta;
        const mutedColor2 = theme?.base.mutedForeground ?? Color.brightBlack;

        const effortHint = new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: '◆ ',
                style: new TextStyle({ foreground: effortColor }),
              }),
              new TextSpan({
                text: this.effortHintText,
                style: new TextStyle({ foreground: mutedColor2, dim: true }),
              }),
            ],
          }),
        });

        return new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Row({
            children: [
              new Expanded({ child: effortHint }),
            ],
          }),
        });
      }

      if (this.inputText === '' && !this.isShowingShortcutsHelp) {
        const keybindColor = theme?.app.keybind ?? Color.blue;
        const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;

        const hint = new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: '?',
                style: new TextStyle({ foreground: keybindColor }),
              }),
              new TextSpan({
                text: ' for shortcuts',
                style: new TextStyle({ foreground: mutedColor, dim: true }),
              }),
            ],
          }),
        });

        return new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Row({
            children: [
              new Expanded({ child: hint }),
            ],
          }),
        });
      }

      return SizedBox.shrink();
    }

    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const waveChar = getWavePrefix(footerText);
    const leftText = waveChar ? `${waveChar} ${footerText}` : ` ${footerText}`;

    const left = new Text({
      text: new TextSpan({
        text: leftText,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    });

    const warningColor = theme?.base.warning ?? Color.yellow;
    const right = new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: 'Esc',
            style: new TextStyle({ foreground: warningColor, dim: true }),
          }),
          new TextSpan({
            text: ' to cancel',
            style: new TextStyle({ foreground: warningColor, dim: true }),
          }),
        ],
      }),
    });

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({
        children: [
          new Expanded({ child: left }),
          right,
        ],
      }),
    });
  }

}

function getWavePrefix(footerText: string): string {
  if (footerText.startsWith('Waiting')) return '\u223C';
  return '\u224B';
}

/**
 * Shortens a filesystem path for display in the status bar.
 * Replaces $HOME prefix with ~ and truncates from the left with "..."
 * if the result exceeds maxLen characters.
 */
export function shortenPath(fullPath: string, maxLen: number = 40): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  let p = fullPath;
  if (home && p.startsWith(home)) {
    p = '~' + p.slice(home.length);
  }
  if (p.length > maxLen) {
    p = '...' + p.slice(p.length - maxLen + 3);
  }
  return p;
}
