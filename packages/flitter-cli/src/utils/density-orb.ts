// DensityOrb visual indicator (N8).
//
// Provides both a simple symbol-based density indicator (getDensityOrb)
// and a full stateful DensityOrb class that renders animated ASCII art
// using 2D Perlin noise, matching AMP's density-orb-widget approach.

import { noise1D } from './perlin-animation';

// ---------------------------------------------------------------------------
// Simple symbol-based density indicator (backward compatible)
// ---------------------------------------------------------------------------

/** UI density modes. */
export type Density = 'compact' | 'normal' | 'comfortable';

/**
 * Get the density orb symbol for the given density mode.
 *
 * compact    -> filled diamond
 * normal     -> outline diamond
 * comfortable -> circle
 */
export function getDensityOrb(density: Density): string {
  switch (density) {
    case 'compact':
      return '\u25C6'; // filled diamond
    case 'normal':
      return '\u25C7'; // outline diamond
    case 'comfortable':
      return '\u25CB'; // circle
  }
}

// ---------------------------------------------------------------------------
// Perlin noise helpers for 2D field
// ---------------------------------------------------------------------------

/**
 * 2D noise derived from two offset 1D noise samples.
 * Returns a value in approximately [-1, 1].
 */
function noise2D(x: number, y: number): number {
  // Combine two 1D samples at different offsets for pseudo-2D behavior.
  const n1 = noise1D(x + y * 0.7 + 31.7);
  const n2 = noise1D(y - x * 0.3 + 97.3);
  return (n1 + n2) * 0.5;
}

/**
 * Fractal Brownian motion (fbm) using 2D noise.
 * Returns a value normalized to [0, 1].
 */
function fbm2D(
  x: number,
  y: number,
  octaves: number = 3,
  persistence: number = 0.5,
  lacunarity: number = 2,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return (value / maxAmplitude + 1) * 0.5;
}

// ---------------------------------------------------------------------------
// DensityOrb class
// ---------------------------------------------------------------------------

/** Density characters from empty to full, ordered by visual weight. */
const DENSITY_CHARS = ' .:-=+*#%@';
const WELCOME_DENSITY_CHARS = ' .:-=+*';

const DEFAULT_WIDTH = 40;
const DEFAULT_HEIGHT = 20;
const DEFAULT_NOISE_SCALE = 0.08;
const WELCOME_NOISE_SCALE = 0.06;

export type DensityOrbVariant = 'default' | 'welcome';

export interface DensityOrbOptions {
  /** Width of the character grid. Default: 40. */
  width?: number;
  /** Height of the character grid. Default: 20. */
  height?: number;
  /** Variant: 'default' for normal animation, 'welcome' for slower/softer. */
  variant?: DensityOrbVariant;
}

/**
 * Animated density-field orb rendered as an ASCII art ellipse.
 *
 * Uses 2D Perlin noise to generate a density field, masked by an
 * elliptical boundary, with density characters representing different
 * intensities. The noise field evolves over time to create smooth
 * animation.
 *
 * Usage:
 *   const orb = new DensityOrb({ width: 40, height: 20 });
 *   const lines = orb.render(0);    // lines at t=0
 *   const lines2 = orb.render(0.5); // animated frame at t=0.5
 */
export class DensityOrb {
  readonly width: number;
  readonly height: number;
  readonly variant: DensityOrbVariant;

  private readonly densityChars: string;
  private readonly noiseScale: number;

  constructor(options?: DensityOrbOptions) {
    this.width = options?.width ?? DEFAULT_WIDTH;
    this.height = options?.height ?? DEFAULT_HEIGHT;
    this.variant = options?.variant ?? 'default';

    if (this.variant === 'welcome') {
      this.densityChars = WELCOME_DENSITY_CHARS;
      this.noiseScale = WELCOME_NOISE_SCALE;
    } else {
      this.densityChars = DENSITY_CHARS;
      this.noiseScale = DEFAULT_NOISE_SCALE;
    }
  }

  /**
   * Render the density orb at time `t`.
   *
   * Returns an array of strings (one per row), each of length `this.width`,
   * forming an ASCII art ellipse whose interior is filled with density
   * characters driven by Perlin noise.
   *
   * @param t - Time parameter; advance to animate.
   * @returns Array of strings, one per row.
   */
  render(t: number): string[] {
    const { width, height, noiseScale, densityChars } = this;
    const rx = width / 2;
    const ry = height / 2;
    const numChars = densityChars.length;
    const timeScale = this.variant === 'welcome' ? 0.5 : 1.0;
    const scaledT = t * timeScale;

    const lines: string[] = [];

    for (let row = 0; row < height; row++) {
      const chars: string[] = [];

      for (let col = 0; col < width; col++) {
        // Normalized coordinates relative to ellipse center
        const nx = (col - rx) / rx;
        const ny = (row - ry) / ry;
        const dist = Math.sqrt(nx * nx + ny * ny);

        // Outside the ellipse: space
        if (dist > 1) {
          chars.push(' ');
          continue;
        }

        // Sample fbm noise at this position
        const n = fbm2D(
          col * noiseScale + scaledT,
          row * noiseScale + scaledT * 0.7,
        );

        // Fade towards edges of the ellipse
        const edgeFade = 1 - dist;
        const adjusted = n * edgeFade;

        // Map to density character
        let level = Math.floor(adjusted * (numChars - 1));
        level = Math.max(0, Math.min(numChars - 1, level));

        chars.push(densityChars[level]!);
      }

      lines.push(chars.join(''));
    }

    return lines;
  }
}
