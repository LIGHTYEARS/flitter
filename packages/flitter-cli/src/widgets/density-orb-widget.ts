// DensityOrbWidget — animated density-field orb rendered as ASCII art ellipse.
//
// StatefulWidget port of flitter-amp/src/widgets/density-orb-widget.ts.
// Uses timer-driven animation with Perlin noise to generate a density field
// masked by an elliptical boundary. Supports 'default' and 'welcome' variants
// with different animation speeds and density character sets.
//
// The utility class in utils/density-orb.ts provides the raw render logic;
// this widget wraps it in the StatefulWidget lifecycle with setInterval-driven
// animation ticks, matching AMP's architecture.

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { PerlinNoise } from '../utils/perlin-animation';
import { CliThemeProvider } from '../themes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CELL_COLS = 40;
const CELL_ROWS = 20;
const NOISE_SCALE = 0.08;

const DENSITY_CHARS = ' .:-=+*#';
const WELCOME_DENSITY_CHARS = ' .:-=+*#';

// Use a deterministic seed for consistent orb appearance across runs.
// Seed 7 produces a balanced density distribution that reaches the full
// character range (' .:-=+*') matching AMP's visual output.
const noise = new PerlinNoise(7);

// ---------------------------------------------------------------------------
// Variant type
// ---------------------------------------------------------------------------

export type DensityOrbVariant = 'default' | 'welcome';

// ---------------------------------------------------------------------------
// DensityOrbWidget
// ---------------------------------------------------------------------------

/**
 * Animated density-field orb rendered as an ASCII art ellipse.
 *
 * A StatefulWidget that uses setInterval-driven Perlin noise animation
 * to produce a smooth, evolving density field inside an elliptical boundary.
 *
 * Variants:
 *   - 'default': faster animation, full density character set
 *   - 'welcome': slower/softer animation, reduced character set
 */
export class DensityOrbWidget extends StatefulWidget {
  readonly variant: DensityOrbVariant;

  constructor(opts?: { variant?: DensityOrbVariant }) {
    super();
    this.variant = opts?.variant ?? 'default';
  }

  createState(): DensityOrbWidgetState {
    return new DensityOrbWidgetState();
  }
}

// ---------------------------------------------------------------------------
// DensityOrbWidgetState
// ---------------------------------------------------------------------------

class DensityOrbWidgetState extends State<DensityOrbWidget> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeOffset = 0.5;

  /** Returns rendering and animation parameters for the current variant. */
  private getVariantConfig(): {
    tickMs: number;
    timeStep: number;
    noiseScale: number;
    densityChars: string;
  } {
    if (this.widget.variant === 'welcome') {
      return {
        tickMs: 120,
        timeStep: 0.03,
        noiseScale: 0.06,
        densityChars: WELCOME_DENSITY_CHARS,
      };
    }
    return {
      tickMs: 100,
      timeStep: 0.06,
      noiseScale: NOISE_SCALE,
      densityChars: DENSITY_CHARS,
    };
  }

  override initState(): void {
    super.initState();
    const config = this.getVariantConfig();
    this.timer = setInterval(() => {
      this.setState(() => {
        this.timeOffset += config.timeStep;
      });
    }, config.tickMs);
  }

  override dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    super.dispose();
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const isLight = theme?.base.isLight ?? false;
    const config = this.getVariantConfig();

    // Color palette: green gradient (matches AMP default without agentMode)
    const darkR = 0;
    const darkG = isLight ? 30 : 55;
    const darkB = isLight ? 10 : 20;
    const brightR = 0;
    const brightG = isLight ? 200 : 255;
    const brightB = isLight ? 100 : 136;

    const rx = CELL_COLS / 2;
    const ry = CELL_ROWS / 2;

    const rows: Widget[] = [];

    for (let cellRow = 0; cellRow < CELL_ROWS; cellRow++) {
      const spans: TextSpan[] = [];

      for (let cellCol = 0; cellCol < CELL_COLS; cellCol++) {
        const nx = (cellCol - rx) / rx;
        const ny = (cellRow - ry) / ry;
        const dist = Math.sqrt(nx * nx + ny * ny);

        if (dist > 1) {
          spans.push(new TextSpan({ text: ' ' }));
          continue;
        }

        const raw = noise.fbm(
          cellCol * config.noiseScale + this.timeOffset,
          cellRow * config.noiseScale + this.timeOffset * 0.7,
        );

        // Remap fbm output from its effective ~[0.25,0.75] range to full [0,1].
        // Perlin fbm clusters around 0.5 due to Gaussian-like distribution;
        // without this stretch the density chars are limited to the lowest levels.
        // Apply gamma 0.6 to boost midtones towards the higher density characters.
        const stretched = Math.max(0, Math.min(1, (raw - 0.2) * 3.0));
        const n = stretched ** 0.5;

        const edgeFade = 1 - dist;
        const adjusted = n * edgeFade;

        let level = Math.floor(adjusted * (config.densityChars.length - 1));
        level = Math.max(0, Math.min(config.densityChars.length - 1, level));

        const ch = config.densityChars[level]!;

        if (level === 0) {
          spans.push(new TextSpan({ text: ' ' }));
        } else {
          const t = level / (config.densityChars.length - 1);
          const r = Math.round(darkR + (brightR - darkR) * t);
          const g = Math.round(darkG + (brightG - darkG) * t);
          const b = Math.round(darkB + (brightB - darkB) * t);

          spans.push(new TextSpan({
            text: ch,
            style: new TextStyle({ foreground: Color.rgb(r, g, b) }),
          }));
        }
      }

      rows.push(new Text({
        text: new TextSpan({ children: spans }),
      }));
    }

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: rows,
    });
  }
}
