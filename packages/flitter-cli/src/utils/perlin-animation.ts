// Perlin-like noise animation for thinking indicators.
//
// Implements 1D gradient noise, 2D gradient noise, fractal Brownian motion
// (fbm), and a frame generator that produces a string of block characters
// (░▒▓█) creating a smooth wave-like animation driven by a time parameter.
//
// The PerlinNoise class provides a seedable, self-contained noise generator
// matching the capabilities of flitter-amp's perlin module.

// ---------------------------------------------------------------------------
// Permutation table utilities
// ---------------------------------------------------------------------------

/**
 * Simple seedable PRNG (mulberry32) used to generate deterministic
 * permutation tables from a numeric seed.
 */
function _mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a 512-element permutation table by shuffling [0..255] and
 * doubling it. Accepts an optional random function for deterministic seeding.
 *
 * The doubled table avoids modular index wrapping in the noise functions:
 * perm[x + y] is always valid for x, y in [0, 255].
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
// Legacy permutation table (for backward-compatible noise1D / generateAnimationFrame)
// ---------------------------------------------------------------------------

/** Pre-shuffled permutation table for legacy hash lookups. */
const PERM: readonly number[] = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  // Deterministic Fisher-Yates shuffle using a simple LCG seed.
  let seed = 42;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    const j = ((seed >>> 0) % (i + 1));
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  // Double the table so we can index without wrapping.
  return Object.freeze([...p, ...p]);
})();

// ---------------------------------------------------------------------------
// 2D gradient table
// ---------------------------------------------------------------------------

/** 2D gradient vectors -- 8 directions covering diagonals and axes. */
const GRAD_2D: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// ---------------------------------------------------------------------------
// Core math helpers
// ---------------------------------------------------------------------------

/** Perlin improved fade curve: 6t^5 - 15t^4 + 10t^3. */
export function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Linear interpolation. */
function _lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * 1D gradient function.
 * Uses the hash to pick a sign (+1 or -1) and returns the dot product
 * with the distance vector (which in 1D is just `dist`).
 */
function _grad1D(hash: number, dist: number): number {
  return (hash & 1) === 0 ? dist : -dist;
}

/**
 * 2D gradient dot product. Selects one of 8 gradient vectors based on
 * the low 3 bits of the hash value and dots it with the distance vector.
 */
function _grad2D(hash: number, x: number, y: number): number {
  const g = GRAD_2D[hash & 7]!;
  return g[0] * x + g[1] * y;
}

// ---------------------------------------------------------------------------
// 1D gradient noise (legacy standalone export)
// ---------------------------------------------------------------------------

/**
 * Simple 1D Perlin-like gradient noise.
 *
 * Returns a value in roughly [-1, 1] that varies smoothly as `x` changes.
 * Uses the classic approach: hash integer lattice points, compute gradient
 * dot products, and interpolate with a fade curve.
 *
 * This function uses the legacy hardcoded permutation table for backward
 * compatibility. For seedable noise, use the PerlinNoise class.
 *
 * @param x - The input coordinate.
 * @returns A noise value in approximately [-1, 1].
 */
export function noise1D(x: number): number {
  const xi = Math.floor(x) & 255;
  const xf = x - Math.floor(x);

  // Fade curve: 6t^5 - 15t^4 + 10t^3  (Perlin improved)
  const u = fade(xf);

  // Gradient values at the two lattice points.
  const g0 = _grad1D(PERM[xi]!, xf);
  const g1 = _grad1D(PERM[xi + 1]!, xf - 1);

  // Linear interpolation.
  return _lerp(g0, g1, u);
}

// ---------------------------------------------------------------------------
// 2D gradient noise (standalone function)
// ---------------------------------------------------------------------------

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

  const x1 = _grad2D(aa, xf, yf) * (1 - u) + _grad2D(ba, xf - 1, yf) * u;
  const x2 = _grad2D(ab, xf, yf - 1) * (1 - u) + _grad2D(bb, xf - 1, yf - 1) * u;

  return x1 * (1 - v) + x2 * v;
}

// ---------------------------------------------------------------------------
// Fractal Brownian motion
// ---------------------------------------------------------------------------

export interface FbmOptions {
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
}

/**
 * Fractal Brownian motion (fbm) using 2D Perlin noise.
 *
 * Sums multiple octaves of noise at increasing frequencies and
 * decreasing amplitudes. Returns a value normalized to approximately [0, 1].
 *
 * @param noise - PerlinNoise instance.
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @param options - FbmOptions or a number (octaves) for backward compat.
 */
export function fbm(
  noise: PerlinNoise,
  x: number,
  y: number,
  options?: FbmOptions | number,
): number {
  const opts: FbmOptions = typeof options === 'number' ? { octaves: options } : (options ?? {});
  const octaves = opts.octaves ?? 4;
  const persistence = opts.persistence ?? 0.5;
  const lacunarity = opts.lacunarity ?? 2;
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise.value(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return (total / maxValue + 1) * 0.5;
}

// ---------------------------------------------------------------------------
// PerlinNoise class -- convenience wrapper with encapsulated state
// ---------------------------------------------------------------------------

/**
 * Encapsulates a permutation table and provides bound noise methods.
 *
 * Usage:
 *   const noise = new PerlinNoise();            // random permutation
 *   const noise = new PerlinNoise(12345);        // deterministic from seed
 *   const noise = PerlinNoise.shared;            // lazy-initialized singleton
 *
 *   noise.noise2d(x, y);
 *   noise.fbm(x, y);
 *   noise.fbm(x, y, 4);  // 4 octaves
 *   noise.fbm(x, y, { octaves: 4, persistence: 0.5 });
 */
export class PerlinNoise {
  /** Lazy-initialized shared singleton for cross-module noise coherence. */
  private static _shared: PerlinNoise | undefined;

  static get shared(): PerlinNoise {
    if (!PerlinNoise._shared) {
      PerlinNoise._shared = new PerlinNoise();
    }
    return PerlinNoise._shared;
  }

  readonly perm: Uint8Array;

  /**
   * Create a new PerlinNoise instance.
   *
   * @param seed - Optional numeric seed for deterministic output.
   *               If omitted, Math.random is used for the permutation table.
   */
  constructor(seed?: number) {
    const random = seed !== undefined ? _mulberry32(seed) : Math.random;
    this.perm = createPermutationTable(random);
  }

  /** 1D value noise in [0, 1] using the instance permutation table. */
  value1d(x: number): number {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = fade(xf);
    const a = this.perm[xi]! / 255;
    const b = this.perm[(xi + 1) & 255]! / 255;
    return a + u * (b - a);
  }

  /** 2D gradient noise in approximately [-1, 1]. */
  value(x: number, y: number): number {
    return noise2d(x, y, this.perm);
  }

  /** 2D gradient noise in approximately [-1, 1]. */
  noise2d(x: number, y: number): number {
    return noise2d(x, y, this.perm);
  }

  /** 2D fractal Brownian motion in [0, 1]. */
  fbm(x: number, y: number, options?: FbmOptions | number): number {
    return fbm(this, x, y, options);
  }
}

// ---------------------------------------------------------------------------
// Animation frame generation (legacy standalone export)
// ---------------------------------------------------------------------------

/** Block characters ordered from light to heavy. */
const BLOCKS = [' ', '░', '▒', '▓', '█'] as const;

/**
 * Generate a single animation frame as a string of block characters.
 *
 * Each column samples the noise function at a position derived from its
 * x-coordinate and the time parameter `t`, producing a smooth wave effect.
 * Multiple noise octaves are blended for richer visual texture.
 *
 * @param width - Number of characters in the output line.
 * @param t     - Time parameter (advance to animate; any float works).
 * @returns A string of `width` block characters representing the frame.
 */
export function generateAnimationFrame(width: number, t: number): string {
  if (width <= 0) return '';

  const chars: string[] = [];
  for (let i = 0; i < width; i++) {
    // Sample noise at two octaves for richer movement.
    const n1 = noise1D(i * 0.08 + t * 0.6);
    const n2 = noise1D(i * 0.15 + t * 1.1 + 100);
    // Combine octaves and normalise from [-1,1] to [0,1].
    const combined = (n1 * 0.6 + n2 * 0.4 + 1) / 2;
    // Map to block character index.
    const idx = Math.min(
      BLOCKS.length - 1,
      Math.max(0, Math.floor(combined * BLOCKS.length)),
    );
    chars.push(BLOCKS[idx]!);
  }

  return chars.join('');
}
