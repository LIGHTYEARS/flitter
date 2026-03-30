/**
 * Perlin noise utilities.
 * Gap #66: Extract shared PerlinNoise class from duplicated implementations.
 *
 * Provides 1D and 2D gradient noise, fractal Brownian motion (fbm),
 * and a seedable PerlinNoise class. Consolidates the independent
 * noise implementations from glow-text.ts and density-orb-widget.ts
 * into a single shared module.
 *
 * Design decisions:
 *   - Default instance uses Math.random() for backward compatibility
 *   - PerlinNoise class accepts a seed function for deterministic output
 *   - All functions are pure given a fixed permutation table
 *   - The 1D noise in glow-text used value noise; we provide value1d()
 *     to preserve the original glow-text behavior exactly
 */

// ---------------------------------------------------------------------------
// Gradient tables
// ---------------------------------------------------------------------------

/** 2D gradient vectors -- 8 directions covering diagonals and axes. */
const GRAD_2D: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

/**
 * Ken Perlin's improved quintic fade curve: 6t^5 - 15t^4 + 10t^3.
 * Produces C2-continuous interpolation (no second-derivative discontinuities).
 */
export function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ---------------------------------------------------------------------------
// Permutation table utilities
// ---------------------------------------------------------------------------

/**
 * Creates a 512-element permutation table by shuffling [0..255] and
 * doubling it. Accepts an optional random function for deterministic seeding.
 *
 * The doubled table avoids modular index wrapping in the noise functions:
 * PERM[x + y] is always valid for x, y in [0, 255].
 */
export function createPermutationTable(
  random: () => number = Math.random,
): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = (random() * (i + 1)) | 0;
    const tmp = p[i]!;
    p[i] = p[j]!;
    p[j] = tmp;
  }

  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;
  return perm;
}

// ---------------------------------------------------------------------------
// 1D noise
// ---------------------------------------------------------------------------

/**
 * 1D value noise -- preserves the exact algorithm from glow-text.ts.
 *
 * Uses the permutation table as a source of pseudo-random values (not
 * gradients), scaled to [-1, 1], with quintic interpolation.
 *
 * This is NOT classic Perlin gradient noise in 1D; it is a simpler value
 * noise that was sufficient for the per-character glow effect.
 */
export function value1d(x: number, perm: Uint8Array): number {
  const xi = Math.floor(x) & 255;
  const xf = x - Math.floor(x);
  const u = fade(xf);
  const a = (perm[xi]! / 255) * 2 - 1;
  const b = (perm[(xi + 1)]! / 255) * 2 - 1;
  return a + u * (b - a);
}

// ---------------------------------------------------------------------------
// 2D noise
// ---------------------------------------------------------------------------

/**
 * 2D gradient dot product. Selects one of 8 gradient vectors based on
 * the low 3 bits of the hash value and dots it with the distance vector.
 */
function grad2d(hash: number, x: number, y: number): number {
  const g = GRAD_2D[hash & 7]!;
  return g[0] * x + g[1] * y;
}

/**
 * 2D Perlin gradient noise.
 *
 * Returns a value in approximately [-1, 1]. Uses Ken Perlin's improved
 * noise algorithm with the quintic fade curve and 8-direction gradient
 * table.
 */
export function noise2d(
  x: number,
  y: number,
  perm: Uint8Array,
): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = perm[perm[xi]! + yi]!;
  const ab = perm[perm[xi]! + yi + 1]!;
  const ba = perm[perm[xi + 1]! + yi]!;
  const bb = perm[perm[xi + 1]! + yi + 1]!;

  const x1 = grad2d(aa, xf, yf) * (1 - u) + grad2d(ba, xf - 1, yf) * u;
  const x2 = grad2d(ab, xf, yf - 1) * (1 - u) + grad2d(bb, xf - 1, yf - 1) * u;

  return x1 * (1 - v) + x2 * v;
}

// ---------------------------------------------------------------------------
// Fractal Brownian motion
// ---------------------------------------------------------------------------

export interface FbmOptions {
  /** Number of noise octaves to sum. Default: 3. */
  octaves?: number;
  /** Amplitude multiplier per octave. Default: 0.5. */
  persistence?: number;
  /** Frequency multiplier per octave. Default: 2. */
  lacunarity?: number;
}

/**
 * Fractal Brownian motion (fbm) using 2D Perlin noise.
 *
 * Sums multiple octaves of noise2d at increasing frequencies and
 * decreasing amplitudes. Returns a value normalized to [0, 1].
 *
 * Default parameters match the original density-orb-widget.ts
 * implementation: 3 octaves, 0.5 persistence, 2x lacunarity.
 */
export function fbm(
  x: number,
  y: number,
  perm: Uint8Array,
  options: FbmOptions = {},
): number {
  const {
    octaves = 3,
    persistence = 0.5,
    lacunarity = 2,
  } = options;

  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * frequency, y * frequency, perm) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return (value / maxAmplitude + 1) * 0.5;
}

// ---------------------------------------------------------------------------
// PerlinNoise class -- convenience wrapper with encapsulated state
// ---------------------------------------------------------------------------

/**
 * Encapsulates a permutation table and provides bound noise methods.
 *
 * Usage:
 *   const noise = new PerlinNoise();            // random seed
 *   const noise = new PerlinNoise(seedRng);     // deterministic seed
 *   const noise = PerlinNoise.shared;           // singleton for cross-widget coherence
 *
 *   noise.value1d(x);
 *   noise.noise2d(x, y);
 *   noise.fbm(x, y);
 *   noise.fbm(x, y, { octaves: 4 });
 */
export class PerlinNoise {
  /** Shared singleton instance for cross-widget noise coherence. */
  static readonly shared = new PerlinNoise();

  readonly perm: Uint8Array;

  constructor(random?: () => number) {
    this.perm = createPermutationTable(random);
  }

  /** 1D value noise in [-1, 1]. */
  value1d(x: number): number {
    return value1d(x, this.perm);
  }

  /** 2D gradient noise in approximately [-1, 1]. */
  noise2d(x: number, y: number): number {
    return noise2d(x, y, this.perm);
  }

  /** 2D fractal Brownian motion in [0, 1]. */
  fbm(x: number, y: number, options?: FbmOptions): number {
    return fbm(x, y, this.perm, options);
  }
}
