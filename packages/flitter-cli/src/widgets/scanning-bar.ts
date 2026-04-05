// ScanningBar — animated bouncing highlight bar widget.
//
// StatefulWidget port of flitter-amp/src/widgets/scanning-bar.ts.
// Uses timer-driven animation to sweep a bright highlight segment back
// and forth across a fixed-width horizontal bar. Renders using TextSpan
// with theme-aware colors.
//
// The utility class in utils/text-animations.ts provides raw ANSI render logic;
// this widget uses the StatefulWidget lifecycle with setInterval-driven
// animation ticks and TextSpan output, matching AMP's architecture.

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { CliThemeProvider } from '../themes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BAR_WIDTH = 20;
const SWEEP_INTERVAL_MS = 80;
const HIGHLIGHT_LENGTH = 4;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScanningBarProps {
  label?: string;
  width?: number;
}

// ---------------------------------------------------------------------------
// ScanningBar widget
// ---------------------------------------------------------------------------

/**
 * Animated bouncing highlight bar as a StatefulWidget.
 *
 * A horizontal bar of fixed width with a bright highlight segment of
 * HIGHLIGHT_LENGTH=4 cells that bounces back and forth. Uses theme-aware
 * accent and muted colors.
 */
export class ScanningBar extends StatefulWidget {
  readonly label: string;
  readonly barWidth: number;

  constructor(props?: ScanningBarProps) {
    super();
    this.label = props?.label ?? 'Scanning';
    this.barWidth = props?.width ?? DEFAULT_BAR_WIDTH;
  }

  createState(): ScanningBarState {
    return new ScanningBarState();
  }
}

// ---------------------------------------------------------------------------
// ScanningBarState
// ---------------------------------------------------------------------------

class ScanningBarState extends State<ScanningBar> {
  private position = 0;
  private direction = 1;
  private timer: ReturnType<typeof setInterval> | null = null;

  override initState(): void {
    super.initState();
    this.startSweep();
  }

  override dispose(): void {
    this.stopSweep();
    super.dispose();
  }

  private startSweep(): void {
    this.timer = setInterval(() => {
      this.setState(() => {
        this.position += this.direction;
        if (this.position >= this.widget.barWidth - HIGHLIGHT_LENGTH) {
          this.direction = -1;
        } else if (this.position <= 0) {
          this.direction = 1;
        }
      });
    }, SWEEP_INTERVAL_MS);
  }

  private stopSweep(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const accentColor = theme?.base.accent ?? Color.magenta;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;

    const spans: TextSpan[] = [
      new TextSpan({
        text: `${this.widget.label} `,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    ];

    const barChars: TextSpan[] = [];
    for (let i = 0; i < this.widget.barWidth; i++) {
      const inHighlight = i >= this.position && i < this.position + HIGHLIGHT_LENGTH;
      barChars.push(new TextSpan({
        text: inHighlight ? '\u2501' : '\u2500',
        style: new TextStyle({
          foreground: inHighlight ? accentColor : mutedColor,
          dim: !inHighlight,
        }),
      }));
    }

    spans.push(...barChars);

    return new Text({
      text: new TextSpan({ children: spans }),
    });
  }
}
