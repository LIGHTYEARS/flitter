/**
 * ModeIndicator — animated mode indicator widget.
 *
 * 逆向: GZT at chunk-006.js:14954 — animated orb render object
 *       oQ at chunk-006.js:14915 — orb widget with text/color/glow/time/agentMode
 *       chunk-006.js:14997 — agentMode === "rush" ? 2.5 : 1 speed multiplier
 *       chunk-006.js:15001 — _XT(agentMode) for mode-specific colors
 *       chunk-006.js:15268 — orbExploded state, shockwaves
 *
 * Simplified version of amp's orb: shows current mode name with
 * an animated pulsing/breathing effect using BrailleSpinner animation
 * ticks for frame updates.
 *
 * @module
 */

import type { Widget as WidgetInterface } from "@flitter/tui";
import { State, StatefulWidget } from "@flitter/tui";
import type { Key } from "@flitter/tui";
import { BrailleSpinner } from "@flitter/tui";
import { Text } from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color as ColorClass } from "@flitter/tui";
import { Row } from "@flitter/tui";
import { RichText } from "@flitter/tui";
import { TextSpan } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Mode colors mapping
// ════════════════════════════════════════════════════

/**
 * Mode-specific color pairs.
 *
 * 逆向: _XT(agentMode) at chunk-006.js:15001 — returns { primary, secondary }
 *       "rush" mode uses higher animation speed (2.5x)
 */
const MODE_COLORS: Record<string, { primary: string; secondary: string }> = {
  normal: { primary: "#7C3AED", secondary: "#06B6D4" },
  rush: { primary: "#F38BA8", secondary: "#FAB387" },
  agent: { primary: "#A6E3A1", secondary: "#94E2D5" },
  plan: { primary: "#89B4FA", secondary: "#74C7EC" },
};

// ════════════════════════════════════════════════════
//  ModeIndicator Widget
// ════════════════════════════════════════════════════

/** ModeIndicator constructor arguments. */
interface ModeIndicatorArgs {
  /** Optional key */
  key?: Key;
  /** Current agent mode name */
  agentMode: string;
  /** Display text (typically the mode name) */
  text?: string;
  /** Animation frame interval in ms, default 200 (matching amp's BrailleSpinner interval) */
  frameInterval?: number;
}

/**
 * ModeIndicator Widget.
 *
 * Shows the current agent mode with an animated braille spinner prefix.
 * The spinner animates at regular intervals using BrailleSpinner from
 * the existing animation infrastructure.
 *
 * 逆向: GZT RenderObject paint at chunk-006.js:14993
 *   - Iterates over text characters
 *   - Applies glow intensity based on position and time
 *   - Uses mode-specific primary/secondary colors
 *
 * Simplified: uses BrailleSpinner character + mode text with mode color.
 *
 * @example
 * ```ts
 * new ModeIndicator({ agentMode: "normal" });
 * new ModeIndicator({ agentMode: "rush", text: "Rush Mode" });
 * ```
 */
export class ModeIndicator extends StatefulWidget {
  readonly agentMode: string;
  readonly text: string;
  readonly frameInterval: number;

  constructor(args: ModeIndicatorArgs) {
    super({ key: args.key });
    this.agentMode = args.agentMode;
    this.text = args.text ?? args.agentMode;
    this.frameInterval = args.frameInterval ?? 200;
  }

  createState(): State {
    return new ModeIndicatorState();
  }
}

/**
 * ModeIndicator state — manages animation timer and spinner.
 *
 * 逆向: chunk-006.js:15215-15237 — state with orb click count, shockwaves
 *       Y0R at chunk-006.js:25880-25917 — animation timer pattern
 *       chunk-006.js:6121 — Y1T._spinner, _startAnimation (200ms interval)
 */
class ModeIndicatorState extends State<ModeIndicator> {
  /** The braille spinner automaton */
  private _spinner: BrailleSpinner = new BrailleSpinner();

  /** Current spinner character */
  private _currentChar: string = "";

  /** Animation timer handle */
  private _timer: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize state and start animation.
   *
   * 逆向: chunk-006.js:6121 — _startAnimation uses 200ms interval
   */
  initState(): void {
    this._currentChar = this._spinner.toBraille();
    this._startAnimation();
  }

  /**
   * Handle widget updates — restart animation if mode changes.
   */
  didUpdateWidget(oldWidget: ModeIndicator): void {
    if (oldWidget.agentMode !== this.widget.agentMode) {
      this._spinner = new BrailleSpinner();
    }
  }

  /**
   * Clean up animation timer.
   */
  dispose(): void {
    this._stopAnimation();
  }

  private _startAnimation(): void {
    if (this._timer) return;
    // 逆向: chunk-006.js:25897 — Math.max(16, Math.round(1000 / fps))
    this._timer = setInterval(() => {
      this._spinner.step();
      this.setState(() => {
        this._currentChar = this._spinner.toBraille();
      });
    }, this.widget.frameInterval);
  }

  private _stopAnimation(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Build: spinner char + mode text.
   *
   * 逆向: GZT.paint at chunk-006.js:14993 — renders text with glow coloring
   * Simplified: braille char prefix + mode name
   */
  build(_context: unknown): WidgetInterface {
    const colors = MODE_COLORS[this.widget.agentMode] ?? MODE_COLORS.normal;

    // Parse hex color to Color.rgb
    const parseHex = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return ColorClass.rgb(r, g, b);
    };

    const primaryColor = parseHex(colors.primary);

    const spinnerText = new RichText({
      text: new TextSpan({
        text: this._currentChar + " ",
        style: new TextStyle({ foreground: primaryColor }),
      }),
    });

    const modeText = new RichText({
      text: new TextSpan({
        text: this.widget.text,
        style: new TextStyle({ foreground: primaryColor, bold: true }),
      }),
    });

    return new Row({
      children: [spinnerText, modeText],
    }) as WidgetInterface;
  }
}
