// Tests for PerlinNoise shared module
// Gap #66: Extract shared PerlinNoise class from duplicated implementations

import { describe, test, expect } from 'bun:test';
import {
  fade,
  value1d,
  noise2d,
  fbm,
  createPermutationTable,
  PerlinNoise,
} from '../perlin-noise';

// ---------------------------------------------------------------------------
// Deterministic seed helper
// ---------------------------------------------------------------------------

/** Simple seedable PRNG (mulberry32) for reproducible tests. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// createPermutationTable
// ---------------------------------------------------------------------------

describe('createPermutationTable', () => {
  test('returns a 512-element Uint8Array', () => {
    const perm = createPermutationTable();
    expect(perm).toBeInstanceOf(Uint8Array);
    expect(perm.length).toBe(512);
  });

  test('contains each value 0-255 exactly twice (doubled table)', () => {
    const perm = createPermutationTable();
    const counts = new Array(256).fill(0);
    for (let i = 0; i < 512; i++) counts[perm[i]!]++;
    for (let v = 0; v < 256; v++) {
      expect(counts[v]).toBe(2);
    }
  });

  test('produces identical tables from the same seed', () => {
    const a = createPermutationTable(mulberry32(42));
    const b = createPermutationTable(mulberry32(42));
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('produces different tables from different seeds', () => {
    const a = createPermutationTable(mulberry32(1));
    const b = createPermutationTable(mulberry32(2));
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

// ---------------------------------------------------------------------------
// fade
// ---------------------------------------------------------------------------

describe('fade', () => {
  test('returns 0 at t=0', () => {
    expect(fade(0)).toBe(0);
  });

  test('returns 1 at t=1', () => {
    expect(fade(1)).toBe(1);
  });

  test('returns 0.5 at t=0.5', () => {
    expect(fade(0.5)).toBeCloseTo(0.5, 5);
  });

  test('is monotonically increasing on [0, 1]', () => {
    let prev = fade(0);
    for (let t = 0.01; t <= 1.0; t += 0.01) {
      const curr = fade(t);
      expect(curr).toBeGreaterThanOrEqual(prev);
      prev = curr;
    }
  });
});

// ---------------------------------------------------------------------------
// value1d (backward compat with glow-text noiseGT)
// ---------------------------------------------------------------------------

describe('value1d', () => {
  const perm = createPermutationTable(mulberry32(100));

  test('returns values in [-1, 1]', () => {
    for (let x = -10; x <= 10; x += 0.1) {
      const v = value1d(x, perm);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('is deterministic for the same input and perm table', () => {
    expect(value1d(3.7, perm)).toBe(value1d(3.7, perm));
  });

  test('varies across different x values', () => {
    const values = new Set<number>();
    for (let x = 0; x < 10; x += 0.5) {
      values.add(value1d(x, perm));
    }
    expect(values.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// noise2d
// ---------------------------------------------------------------------------

describe('noise2d', () => {
  const perm = createPermutationTable(mulberry32(200));

  test('returns values in approximately [-1, 1]', () => {
    for (let x = -5; x <= 5; x += 0.5) {
      for (let y = -5; y <= 5; y += 0.5) {
        const v = noise2d(x, y, perm);
        expect(v).toBeGreaterThanOrEqual(-1.5);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
  });

  test('is deterministic for the same input and perm table', () => {
    expect(noise2d(1.5, 2.3, perm)).toBe(noise2d(1.5, 2.3, perm));
  });

  test('returns 0 at integer coordinates (gradient property)', () => {
    // At integer coordinates, xf=0 and yf=0, so the gradient dot products
    // are all 0 and the result should be 0.
    expect(noise2d(0, 0, perm)).toBeCloseTo(0, 10);
    expect(noise2d(5, 3, perm)).toBeCloseTo(0, 10);
  });
});

// ---------------------------------------------------------------------------
// fbm
// ---------------------------------------------------------------------------

describe('fbm', () => {
  const perm = createPermutationTable(mulberry32(300));

  test('returns values in [0, 1]', () => {
    for (let x = -5; x <= 5; x += 0.5) {
      for (let y = -5; y <= 5; y += 0.5) {
        const v = fbm(x, y, perm);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  test('uses default 3 octaves when no options provided', () => {
    const a = fbm(1.5, 2.3, perm);
    const b = fbm(1.5, 2.3, perm, { octaves: 3 });
    expect(a).toBe(b);
  });

  test('produces different output with different octave counts', () => {
    const a = fbm(1.5, 2.3, perm, { octaves: 1 });
    const b = fbm(1.5, 2.3, perm, { octaves: 5 });
    expect(a).not.toBe(b);
  });

  test('is deterministic', () => {
    expect(fbm(3.1, 4.2, perm)).toBe(fbm(3.1, 4.2, perm));
  });
});

// ---------------------------------------------------------------------------
// PerlinNoise class
// ---------------------------------------------------------------------------

describe('PerlinNoise', () => {
  test('exposes value1d, noise2d, and fbm methods', () => {
    const n = new PerlinNoise(mulberry32(400));
    expect(typeof n.value1d(0)).toBe('number');
    expect(typeof n.noise2d(0, 0)).toBe('number');
    expect(typeof n.fbm(0, 0)).toBe('number');
  });

  test('produces deterministic output from the same seed', () => {
    const a = new PerlinNoise(mulberry32(500));
    const b = new PerlinNoise(mulberry32(500));
    expect(a.fbm(1.5, 2.3)).toBe(b.fbm(1.5, 2.3));
    expect(a.value1d(3.7)).toBe(b.value1d(3.7));
    expect(a.noise2d(4.1, 5.2)).toBe(b.noise2d(4.1, 5.2));
  });

  test('shared singleton is a PerlinNoise instance', () => {
    expect(PerlinNoise.shared).toBeInstanceOf(PerlinNoise);
  });

  test('shared singleton returns consistent values', () => {
    const a = PerlinNoise.shared.fbm(1, 2);
    const b = PerlinNoise.shared.fbm(1, 2);
    expect(a).toBe(b);
  });

  test('shared singleton value1d returns consistent values', () => {
    const a = PerlinNoise.shared.value1d(5.5);
    const b = PerlinNoise.shared.value1d(5.5);
    expect(a).toBe(b);
  });

  test('different seeds produce different output', () => {
    const a = new PerlinNoise(mulberry32(600));
    const b = new PerlinNoise(mulberry32(700));
    // Very unlikely (but not impossible) to be equal
    const va = a.fbm(1.5, 2.3);
    const vb = b.fbm(1.5, 2.3);
    expect(va).not.toBe(vb);
  });
});
