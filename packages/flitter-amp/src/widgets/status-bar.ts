// StatusBar — bottom status bar matching Amp's footer layout
// Amp ref: iJH (status bar state) + dy() (footer status computation)
// Left: contextual status message (spinner + text)
// Right: cwd + git branch (dim, foreground)
// Amp: overlays position cwd+branch at bottom-right
//
// @deprecated Use BottomGrid instead, which implements Amp's 4-corner overlay system.

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Row } from 'flitter-core/src/widgets/flex';
import { Expanded } from 'flitter-core/src/widgets/flexible';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { WaveSpinner } from 'flitter-core/src/widgets/wave-spinner';
import { icon } from '../ui/icons/icon-registry';

interface StatusBarProps {
  cwd: string;
  gitBranch: string | null;
  isProcessing: boolean;
  isInterrupted?: boolean;
  statusMessage?: string | null;
}

/**
 * Bottom status bar with contextual state messages and animated wave spinner.
 *
 * States:
 *   - Idle: "? for shortcuts" (dim)
 *   - Streaming: WaveSpinner + status text (foreground)
 *   - Interrupted: "[warning] Response interrupted" (warning yellow)
 *
 * Height is always exactly 1 line.
 *
 * @deprecated Use {@link BottomGrid} instead, which implements Amp's 4-corner overlay system.
 */
export class StatusBar extends StatelessWidget {
  private readonly cwd: string;
  private readonly gitBranch: string | null;
  private readonly isProcessing: boolean;
  private readonly isInterrupted: boolean;
  private readonly statusMessage: string | null;

  constructor(props: StatusBarProps) {
    super({});
    this.cwd = props.cwd;
    this.gitBranch = props.gitBranch;
    this.isProcessing = props.isProcessing;
    this.isInterrupted = props.isInterrupted ?? false;
    this.statusMessage = props.statusMessage ?? null;
  }

  /** Builds the status bar row: left status region + right cwd/branch region. */
  build(): Widget {
    const leftChildren: Widget[] = this.buildLeftChildren();

    const shortCwd = this.shortenPath(this.cwd);
    const rightSpans: TextSpan[] = [
      new TextSpan({
        text: shortCwd,
        style: new TextStyle({ foreground: Color.defaultColor, dim: true }),
      }),
    ];

    if (this.gitBranch) {
      rightSpans.push(new TextSpan({
        text: ` (${this.gitBranch})`,
        style: new TextStyle({ foreground: Color.defaultColor, dim: true }),
      }));
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({
        children: [
          new Expanded({
            child: new Row({ children: leftChildren }),
          }),
          new Text({
            text: new TextSpan({ children: rightSpans }),
          }),
        ],
      }),
    });
  }

  /**
   * Builds left-side children based on current state.
   * Returns an array of widgets suitable for a Row.
   */
  private buildLeftChildren(): Widget[] {
    if (this.isInterrupted) {
      return [
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: `${icon('status.warning')} `,
                style: new TextStyle({ foreground: Color.yellow }),
              }),
              new TextSpan({
                text: 'Response interrupted',
                style: new TextStyle({ foreground: Color.yellow }),
              }),
            ],
          }),
        }),
      ];
    }

    if (this.isProcessing) {
      const leftText = this.getStatusText();
      return [
        new WaveSpinner(),
        new Text({
          text: new TextSpan({
            text: ` ${leftText}`,
            style: new TextStyle({ foreground: Color.defaultColor }),
          }),
        }),
      ];
    }

    return [
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: '?',
              style: new TextStyle({ foreground: Color.blue }),
            }),
            new TextSpan({
              text: ' for shortcuts',
              style: new TextStyle({ foreground: Color.defaultColor, dim: true }),
            }),
          ],
        }),
      }),
    ];
  }

  /** Maps state to the appropriate status message string. */
  private getStatusText(): string {
    if (!this.isProcessing) {
      if (this.statusMessage) return this.statusMessage;
      return '? for shortcuts';
    }

    if (this.statusMessage) return this.statusMessage;
    return 'Streaming response...';
  }

  /** Shortens a filesystem path by replacing $HOME with ~. */
  private shortenPath(fullPath: string): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    let p = fullPath;
    if (home && p.startsWith(home)) {
      p = '~' + p.slice(home.length);
    }
    return p;
  }
}
