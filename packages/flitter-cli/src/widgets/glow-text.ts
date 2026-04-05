// GlowText — per-character Perlin-noise glow animation widget.
//
// StatefulWidget port of flitter-amp/src/widgets/glow-text.ts.
// Uses timer-driven animation to interpolate each character's color between
// a base color and a glow color, driven by 1D Perlin noise. This creates
// a shimmering wave effect across the text.
//
// The utility class in utils/text-animations.ts provides raw ANSI render logic;
// this widget wraps the effect in the StatefulWidget lifecycle with proper
// Color/TextSpan output, matching AMP's architecture.

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { noise1D } from '../utils/perlin-animation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GlowTextProps {
  text: string;
  baseColor: Color;
  glowColor: Color;
  bold?: boolean;
  glowIntensity?: number;
}

// ---------------------------------------------------------------------------
// GlowText widget
// ---------------------------------------------------------------------------

/**
 * Per-character Perlin-noise glow effect as a StatefulWidget.
 *
 * Each character's color is interpolated between baseColor and glowColor
 * based on 1D Perlin noise sampled at (charIndex * 0.3 + timeOffset).
 * A setInterval timer drives the animation at 100ms intervals.
 */
export class GlowText extends StatefulWidget {
  readonly text: string;
  readonly baseColor: Color;
  readonly glowColor: Color;
  readonly bold: boolean;
  readonly glowIntensity: number;

  constructor(props: GlowTextProps) {
    super();
    this.text = props.text;
    this.baseColor = props.baseColor;
    this.glowColor = props.glowColor;
    this.bold = props.bold ?? false;
    this.glowIntensity = props.glowIntensity ?? 0.4;
  }

  createState(): GlowTextState {
    return new GlowTextState();
  }
}

// ---------------------------------------------------------------------------
// GlowTextState
// ---------------------------------------------------------------------------

class GlowTextState extends State<GlowText> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeOffset = 0;

  override initState(): void {
    super.initState();
    this.timer = setInterval(() => {
      this.setState(() => {
        this.timeOffset += 0.08;
      });
    }, 100);
  }

  override dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    super.dispose();
  }

  build(_context: BuildContext): Widget {
    const { text, baseColor, glowColor, bold, glowIntensity } = this.widget;

    const baseRgb = baseColor.toRgb();
    const glowRgb = glowColor.toRgb();

    // Safely extract RGB components (fallback to gray if not convertible)
    const br = baseRgb.mode === 'rgb' ? baseRgb.r : 180;
    const bg = baseRgb.mode === 'rgb' ? baseRgb.g : 180;
    const bb = baseRgb.mode === 'rgb' ? baseRgb.b : 180;
    const gr = glowRgb.mode === 'rgb' ? glowRgb.r : 255;
    const gg = glowRgb.mode === 'rgb' ? glowRgb.g : 255;
    const gb = glowRgb.mode === 'rgb' ? glowRgb.b : 255;

    const spans: TextSpan[] = [];
    for (let i = 0; i < text.length; i++) {
      const n = (noise1D(i * 0.3 + this.timeOffset) + 1) * 0.5;
      const t = n * glowIntensity;

      const r = Math.round(br + (gr - br) * t);
      const g = Math.round(bg + (gg - bg) * t);
      const b = Math.round(bb + (gb - bb) * t);

      spans.push(new TextSpan({
        text: text[i],
        style: new TextStyle({
          foreground: Color.rgb(r, g, b),
          bold,
        }),
      }));
    }

    return new Text({
      text: new TextSpan({ children: spans }),
    });
  }
}
