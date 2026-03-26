// StatusBar — bottom status bar matching Amp's footer layout
// Amp ref: iJH (status bar state) + dy() (footer status computation)
// Left: contextual status message (spinner + text)
// Right: cwd + git branch (dim, foreground)
// Amp: overlays position cwd+branch at bottom-right

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Row } from 'flitter-core/src/widgets/flex';
import { Expanded } from 'flitter-core/src/widgets/flexible';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';

interface StatusBarProps {
  cwd: string;
  gitBranch: string | null;
  isProcessing: boolean;
  statusMessage?: string | null;
}

export class StatusBar extends StatelessWidget {
  private readonly cwd: string;
  private readonly gitBranch: string | null;
  private readonly isProcessing: boolean;
  private readonly statusMessage: string | null;

  constructor(props: StatusBarProps) {
    super({});
    this.cwd = props.cwd;
    this.gitBranch = props.gitBranch;
    this.isProcessing = props.isProcessing;
    this.statusMessage = props.statusMessage ?? null;
  }

  build(): Widget {
    // Amp ref: dy() function — contextual footer text
    // Idle: "? for shortcuts"
    // Processing: "Streaming response..." / "Running tools..." / etc.
    const leftText = this.getStatusText();

    // Amp ref: status text color
    // Idle hint: dim (mutedForeground)
    // Active status: foreground
    const leftStyle = this.isProcessing
      ? new TextStyle({ foreground: Color.defaultColor })
      : new TextStyle({ dim: true });

    // Amp ref: iJH spinner chars [" ", "∼", "≈", "≋", "≈", "∼"]
    const leftSpans: TextSpan[] = [];
    if (this.isProcessing) {
      leftSpans.push(new TextSpan({
        text: '≈ ',
        style: new TextStyle({ foreground: Color.blue }),
      }));
      leftSpans.push(new TextSpan({
        text: leftText,
        style: leftStyle,
      }));
    } else {
      // Amp ref: "?" in keybind color (blue), " for shortcuts" dim
      leftSpans.push(new TextSpan({
        text: '?',
        style: new TextStyle({ foreground: Color.blue }),
      }));
      leftSpans.push(new TextSpan({
        text: ' for shortcuts',
        style: new TextStyle({ foreground: Color.defaultColor, dim: true }),
      }));
    }

    // Right side: cwd + git branch
    // Amp ref: buildDisplayText — dim foreground
    const shortCwd = this.shortenPath(this.cwd);
    const rightSpans: TextSpan[] = [
      new TextSpan({
        text: shortCwd,
        style: new TextStyle({ foreground: Color.defaultColor, dim: true }),
      }),
    ];

    if (this.gitBranch) {
      rightSpans.push(new TextSpan({
        text: ` ${this.gitBranch}`,
        style: new TextStyle({ foreground: Color.defaultColor, dim: true }),
      }));
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({
        children: [
          new Expanded({
            child: new Text({
              text: new TextSpan({ children: leftSpans }),
            }),
          }),
          new Text({
            text: new TextSpan({ children: rightSpans }),
          }),
        ],
      }),
    });
  }

  // Amp ref: dy() function — maps state to status message
  private getStatusText(): string {
    if (!this.isProcessing) {
      if (this.statusMessage) return this.statusMessage;
      return '? for shortcuts';
    }

    if (this.statusMessage) return this.statusMessage;
    return 'Streaming response...';
  }

  private shortenPath(fullPath: string): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    let p = fullPath;
    if (home && p.startsWith(home)) {
      p = '~' + p.slice(home.length);
    }
    const parts = p.split('/');
    if (parts.length > 3) {
      return '…/' + parts.slice(-2).join('/');
    }
    return p;
  }
}
