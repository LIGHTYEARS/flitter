import {
  StatefulWidget, State, Widget, BuildContext,
} from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { MouseRegion } from 'flitter-core/src/widgets/mouse-region';
import type { MouseRegionEvent } from 'flitter-core/src/widgets/mouse-region';
import { AmpThemeProvider, perlinAgentModeColor } from '../themes/index';
import { PerlinNoise } from '../utils/perlin-noise';

const CELL_COLS = 40;
const CELL_ROWS = 20;
const NOISE_SCALE = 0.08;

const DENSITY_CHARS = ' .:-=+*#';
const WELCOME_DENSITY_CHARS = ' .:-=+*';

const noise = PerlinNoise.shared;

interface Shockwave {
  col: number;
  row: number;
  startTime: number;
}

const SHOCKWAVE_DURATION = 1.0;
const SHOCKWAVE_SPEED = 30;
const SHOCKWAVE_RADIUS = 3;
const MAX_CLICKS = 5;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: Color;
}

type DensityOrbVariant = 'default' | 'welcome';

/**
 * Animated density-field orb rendered as an ASCII art ellipse.
 *
 * When `agentMode` is provided, the orb's colour palette is derived from
 * perlinAgentModeColor — producing a smooth, Perlin-noise-driven hue pulse
 * that reflects the current agent mode (smart/code/ask/rush).
 */
export class DensityOrbWidget extends StatefulWidget {
  readonly agentMode: string | undefined;
  readonly variant: DensityOrbVariant;

  constructor(opts?: { agentMode?: string; variant?: DensityOrbVariant }) {
    super();
    this.agentMode = opts?.agentMode;
    this.variant = opts?.variant ?? 'default';
  }

  createState(): DensityOrbWidgetState {
    return new DensityOrbWidgetState();
  }
}

class DensityOrbWidgetState extends State<DensityOrbWidget> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeOffset = 0;
  private clickCount = 0;
  private shockwaves: Shockwave[] = [];
  private exploded = false;
  private explodeTime = -1;
  private particles: Particle[] = [];

  /** Returns rendering and animation parameters for the current orb variant. */
  private getVariantConfig(): {
    tickMs: number;
    timeStep: number;
    noiseScale: number;
    densityChars: string;
    interactive: boolean;
  } {
    if (this.widget.variant === 'welcome') {
      return {
        tickMs: 120,
        timeStep: 0.03,
        noiseScale: 0.06,
        densityChars: WELCOME_DENSITY_CHARS,
        interactive: false,
      };
    }
    return {
      tickMs: 100,
      timeStep: 0.06,
      noiseScale: NOISE_SCALE,
      densityChars: DENSITY_CHARS,
      interactive: true,
    };
  }

  override initState(): void {
    super.initState();
    const config = this.getVariantConfig();
    this.timer = setInterval(() => {
      this.setState(() => {
        this.timeOffset += config.timeStep;
        this.updateShockwaves();
        if (this.exploded && this.explodeTime >= 0) {
          this.updateParticles();
        }
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

  private updateShockwaves(): void {
    const now = this.timeOffset;
    this.shockwaves = this.shockwaves.filter(
      sw => (now - sw.startTime) < SHOCKWAVE_DURATION,
    );
  }

  private initParticles(): void {
    const cx = CELL_COLS / 2;
    const cy = CELL_ROWS / 2;
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        char: DENSITY_CHARS[Math.floor(Math.random() * (DENSITY_CHARS.length - 1)) + 1]!,
        color: Color.rgb(0, Math.floor(100 + Math.random() * 155), Math.floor(50 + Math.random() * 86)),
      });
    }
  }

  private updateParticles(): void {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  private handleClick(event: MouseRegionEvent): void {
    if (!this.getVariantConfig().interactive || this.exploded) return;
    this.setState(() => {
      this.clickCount++;
      this.shockwaves.push({
        col: event.x,
        row: event.y,
        startTime: this.timeOffset,
      });
      if (this.clickCount >= MAX_CLICKS) {
        this.exploded = true;
        this.explodeTime = this.timeOffset;
        this.initParticles();
      }
    });
  }

  private getShockwaveBoost(col: number, row: number): number {
    let boost = 0;
    const now = this.timeOffset;
    for (const sw of this.shockwaves) {
      const elapsed = now - sw.startTime;
      if (elapsed < 0 || elapsed >= SHOCKWAVE_DURATION) continue;
      const waveDist = elapsed * SHOCKWAVE_SPEED;
      const dx = col - sw.col;
      const dy = row - sw.row;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const diff = Math.abs(dist - waveDist);
      if (diff < SHOCKWAVE_RADIUS) {
        const intensity = 1 - diff / SHOCKWAVE_RADIUS;
        boost = Math.max(boost, intensity * 2);
      }
    }
    return boost;
  }

  build(context: BuildContext): Widget {
    if (this.exploded) {
      const elapsed = this.timeOffset - this.explodeTime;
      if (elapsed > 0.5) {
        return new SizedBox({ width: CELL_COLS, height: CELL_ROWS });
      }
      return this.buildExplosion(context);
    }
    return this.buildOrb(context);
  }

  private buildExplosion(_context: BuildContext): Widget {
    const grid: string[][] = [];
    const colors: (Color | null)[][] = [];
    for (let r = 0; r < CELL_ROWS; r++) {
      grid.push(new Array<string>(CELL_COLS).fill(' '));
      colors.push(new Array<Color | null>(CELL_COLS).fill(null));
    }

    for (const p of this.particles) {
      const col = Math.round(p.x);
      const row = Math.round(p.y);
      if (col >= 0 && col < CELL_COLS && row >= 0 && row < CELL_ROWS) {
        grid[row]![col] = p.char;
        colors[row]![col] = p.color;
      }
    }

    const rows: Widget[] = [];
    for (let r = 0; r < CELL_ROWS; r++) {
      const spans: TextSpan[] = [];
      for (let c = 0; c < CELL_COLS; c++) {
        const ch = grid[r]![c]!;
        const color = colors[r]![c];
        if (color) {
          spans.push(new TextSpan({
            text: ch,
            style: new TextStyle({ foreground: color }),
          }));
        } else {
          spans.push(new TextSpan({ text: ch }));
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

  /**
   * Resolves the dark/bright RGB endpoints for the orb gradient.
   *
   * When an agentMode is set, extracts RGB channels from the Perlin-noise
   * modulated mode color and scales them to produce dim and bright variants.
   * Falls back to the original hardcoded green palette when no mode is set.
   */
  private resolveOrbPalette(isLight: boolean): {
    darkR: number; darkG: number; darkB: number;
    brightR: number; brightG: number; brightB: number;
  } {
    const mode = this.widget.agentMode;
    if (mode) {
      const modeColor = perlinAgentModeColor(mode, this.timeOffset, isLight);
      const rgb = modeColor.toRgb();
      return {
        darkR: Math.round(rgb.r * 0.22),
        darkG: Math.round(rgb.g * 0.22),
        darkB: Math.round(rgb.b * 0.22),
        brightR: rgb.r,
        brightG: rgb.g,
        brightB: rgb.b,
      };
    }
    return {
      darkR: 0,
      darkG: isLight ? 30 : 55,
      darkB: isLight ? 10 : 20,
      brightR: 0,
      brightG: isLight ? 200 : 255,
      brightB: isLight ? 100 : 136,
    };
  }

  private buildOrb(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const isLight = theme?.base.isLight ?? false;
    const config = this.getVariantConfig();

    const { darkR, darkG, darkB, brightR, brightG, brightB } =
      this.resolveOrbPalette(isLight);

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

        const n = noise.fbm(
          cellCol * config.noiseScale + this.timeOffset,
          cellRow * config.noiseScale + this.timeOffset * 0.7,
        );

        const edgeFade = 1 - dist;
        let adjusted = n * edgeFade;

        const boost = this.getShockwaveBoost(cellCol, cellRow);
        adjusted = Math.min(1, adjusted + boost * 0.15);

        let level = Math.floor(adjusted * (config.densityChars.length - 1));
        level = Math.max(0, Math.min(config.densityChars.length - 1, level));

        if (boost > 0) {
          level = Math.min(config.densityChars.length - 1, level + Math.ceil(boost));
        }

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

    const orbColumn = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: rows,
    });

    if (!config.interactive) {
      return orbColumn;
    }

    return new MouseRegion({
      onClick: (event: MouseRegionEvent) => this.handleClick(event),
      child: orbColumn,
    });
  }
}
