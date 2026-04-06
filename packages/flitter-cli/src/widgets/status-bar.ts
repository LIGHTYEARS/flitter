// StatusBar — bottom status bar for flitter-cli, fixed height 1 row.
//
// Left section: contextual text based on current state:
//   - copyHighlight → "Copied!" in green
//   - searchState → "(reverse-i-search)'query':" or "(failing reverse-i-search)'query':"
//   - hintText → dim muted text (placeholder hint from AMP BottomGrid)
//   - isStreaming → "Esc to cancel" in yellow dim
//   - statusMessage → custom message
//   - idle (no overlay) → "? for shortcuts" in brightBlack dim
//
// Right section: shortened cwd + optional git branch in brightBlack dim.
//
// Layout: Row with Expanded left + right Text.
// Modeled after flitter-amp's BottomGrid bottom-left/bottom-right sections,
// simplified for flitter-cli. Phase 20-03 will wire theme colors.

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Row } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { CliThemeProvider, type CliTheme } from '../themes';

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
  statusMessage?: string;
  copyHighlight?: boolean;
  /** Reverse-i-search state: shows search indicator in the status bar. */
  searchState?: { query: string; isFailing: boolean } | null;
  /** Hint text displayed below the input when idle (matches AMP BottomGrid.hintText). */
  hintText?: string;
  /** Whether deep/extended reasoning mode is active. */
  deepReasoningActive?: boolean;
}

// ---------------------------------------------------------------------------
// getFooterText — contextual status text based on app sub-states
// ---------------------------------------------------------------------------

/**
 * Returns the contextual footer/status text based on current app sub-states.
 *
 * Matches AMP's getFooterText from bottom-grid.ts with the following priority:
 *   1. isInterrupted   → 'Stream interrupted'
 *   2. isExecutingCommand → 'Executing command...'
 *   3. isRunningShell  → 'Running shell...'
 *   4. isAutoCompacting → 'Auto-compacting context...'
 *   5. isHandingOff    → 'Handing off to subagent...'
 *   6. isProcessing    → 'Streaming response...'
 *   7. default         → ''
 */
export function getFooterText(props: {
  isProcessing: boolean;
  isInterrupted: boolean;
  isExecutingCommand: boolean;
  isRunningShell: boolean;
  isAutoCompacting: boolean;
  isHandingOff: boolean;
}): string {
  if (props.isInterrupted) return 'Stream interrupted';
  if (props.isExecutingCommand) return 'Executing command...';
  if (props.isRunningShell) return 'Running shell...';
  if (props.isAutoCompacting) return 'Auto-compacting context...';
  if (props.isHandingOff) return 'Handing off to subagent...';
  if (props.isProcessing) return 'Streaming response...';
  return '';
}

/**
 * Bottom status bar with contextual state messages.
 *
 * States (left section, evaluated in priority order):
 *   1. copyHighlight  → "Copied!" (green, bold)
 *   2. searchState    → "(reverse-i-search)'query':" or "(failing reverse-i-search)'query':"
 *   3. hintText       → dim muted hint text (from AMP BottomGrid)
 *   4. isStreaming     → "Esc to cancel" (yellow dim)
 *   5. statusMessage   → custom text (brightBlack dim)
 *   6. idle            → "? for shortcuts" (brightBlack dim)
 *
 * Right section always shows shortened cwd + optional git branch.
 *
 * Height is always exactly 1 line.
 */
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
  private readonly statusMessage: string | undefined;
  private readonly copyHighlight: boolean;
  private readonly searchState: { query: string; isFailing: boolean } | null;
  private readonly hintText: string | undefined;
  private readonly deepReasoningActive: boolean;

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
    this.statusMessage = props.statusMessage;
    this.copyHighlight = props.copyHighlight ?? false;
    this.searchState = props.searchState ?? null;
    this.hintText = props.hintText;
    this.deepReasoningActive = props.deepReasoningActive ?? false;
  }

  /** Builds the status bar row: left status region + right cwd/branch region. */
  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const left = this.buildLeft(theme);

    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const rightParts: string[] = [];
    if (this.agentName) rightParts.push(this.agentName);
    if (this.gitBranch) rightParts.push(this.gitBranch);
    rightParts.push(shortenPath(this.cwd));
    const rightText = rightParts.join(' \u00b7 ');

    const rightSpans: TextSpan[] = [
      new TextSpan({
        text: rightText,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    ];

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({
        children: [
          new Expanded({
            child: left,
          }),
          new Text({
            text: new TextSpan({ children: rightSpans }),
          }),
        ],
      }),
    });
  }

  /**
   * Builds the left-side contextual text based on current state.
   * Priority: copyHighlight > searchState > hintText > deepReasoning >
   *           isInterrupted > isStreaming/processing sub-states > statusMessage > idle hint.
   */
  private buildLeft(theme: CliTheme | undefined): Widget {
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const keybindColor = theme?.app?.keybind ?? Color.blue;

    if (this.copyHighlight) {
      return new Text({
        text: new TextSpan({
          text: 'Copied!',
          style: new TextStyle({ foreground: theme?.base.success ?? Color.green, bold: true }),
        }),
      });
    }

    if (this.searchState) {
      const prefix = this.searchState.isFailing
        ? '(failing reverse-i-search)'
        : '(reverse-i-search)';
      const errorColor = Color.red;
      const infoColor = theme?.base.info ?? Color.cyan;

      return new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: prefix,
              style: new TextStyle({
                foreground: this.searchState.isFailing ? errorColor : infoColor,
              }),
            }),
            new TextSpan({
              text: `'${this.searchState.query}'`,
              style: new TextStyle({
                foreground: keybindColor,
                bold: true,
              }),
            }),
            new TextSpan({
              text: ': ',
              style: new TextStyle({ foreground: mutedColor }),
            }),
          ],
        }),
      });
    }

    if (this.hintText) {
      return new Text({
        text: new TextSpan({
          text: this.hintText,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      });
    }

    // Deep reasoning indicator (shown in left section when active, dim style)
    if (this.deepReasoningActive) {
      return new Text({
        text: new TextSpan({
          text: '[Deep Reasoning]',
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      });
    }

    // Interrupted state: warning-colored message
    if (this.isInterrupted) {
      const warningColor = theme?.base.warning ?? Color.yellow;
      return new Text({
        text: new TextSpan({
          text: 'Stream interrupted',
          style: new TextStyle({ foreground: warningColor }),
        }),
      });
    }

    // Processing sub-states: use getFooterText for contextual status
    if (this.isProcessing || this.isStreaming) {
      const footerText = getFooterText({
        isProcessing: this.isProcessing,
        isInterrupted: this.isInterrupted,
        isExecutingCommand: this.isExecutingCommand,
        isRunningShell: this.isRunningShell,
        isAutoCompacting: this.isAutoCompacting,
        isHandingOff: this.isHandingOff,
      });

      if (footerText) {
        return new Text({
          text: new TextSpan({
            text: footerText,
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        });
      }

      // Fallback to "Esc to cancel" for streaming
      const warningColor = theme?.base.warning ?? Color.yellow;
      return new Text({
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
    }

    if (this.statusMessage) {
      return new Text({
        text: new TextSpan({
          text: this.statusMessage,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      });
    }

    if (this.contextWindowUsagePercent !== undefined && this.contextWindowUsagePercent > 80) {
      const warningColor = theme?.base.warning ?? Color.yellow;
      return new Text({
        text: new TextSpan({
          text: `Context window at ${this.contextWindowUsagePercent}% — consider compacting`,
          style: new TextStyle({ foreground: warningColor }),
        }),
      });
    }

    return new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: '?',
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
          new TextSpan({
            text: ' for shortcuts',
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        ],
      }),
    });
  }
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
