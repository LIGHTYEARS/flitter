// StatusBar — bottom status bar for flitter-cli, fixed height 1 row.
//
// Left section: contextual text based on current state:
//   - copyHighlight → "Copied!" in green
//   - isStreaming → "Esc to cancel" in yellow dim
//   - idle (no overlay) → "? for shortcuts" in brightBlack dim
//   - statusMessage → custom message
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
  isProcessing: boolean;
  isStreaming?: boolean;
  isInterrupted?: boolean;
  statusMessage?: string;
  copyHighlight?: boolean;
}

/**
 * Bottom status bar with contextual state messages.
 *
 * States (left section, evaluated in priority order):
 *   1. copyHighlight  → "Copied!" (green, bold)
 *   2. isStreaming     → "Esc to cancel" (yellow dim)
 *   3. statusMessage   → custom text (brightBlack dim)
 *   4. idle            → "? for shortcuts" (brightBlack dim)
 *
 * Right section always shows shortened cwd + optional git branch.
 *
 * Height is always exactly 1 line.
 */
export class StatusBar extends StatelessWidget {
  private readonly cwd: string;
  private readonly gitBranch: string | undefined;
  private readonly isStreaming: boolean;
  private readonly statusMessage: string | undefined;
  private readonly copyHighlight: boolean;

  constructor(props: StatusBarProps) {
    super({});
    this.cwd = props.cwd;
    this.gitBranch = props.gitBranch;
    this.isStreaming = props.isStreaming ?? false;
    this.statusMessage = props.statusMessage;
    this.copyHighlight = props.copyHighlight ?? false;
  }

  /** Builds the status bar row: left status region + right cwd/branch region. */
  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const left = this.buildLeft(theme);

    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const shortCwd = shortenPath(this.cwd);
    const rightSpans: TextSpan[] = [
      new TextSpan({
        text: shortCwd,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    ];

    if (this.gitBranch) {
      rightSpans.push(new TextSpan({
        text: ` (${this.gitBranch})`,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
    }

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
   * Priority: copyHighlight > isStreaming > statusMessage > idle hint.
   */
  private buildLeft(theme: CliTheme | undefined): Widget {
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;

    if (this.copyHighlight) {
      return new Text({
        text: new TextSpan({
          text: 'Copied!',
          style: new TextStyle({ foreground: theme?.base.success ?? Color.green, bold: true }),
        }),
      });
    }

    if (this.isStreaming) {
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
