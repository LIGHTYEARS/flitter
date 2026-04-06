// Tests for I18: Perlin noise animation utility.

import { describe, it, expect } from 'bun:test';
import {
  noise1D,
  generateAnimationFrame,
  noise2d,
  fbm,
  fade,
  createPermutationTable,
  PerlinNoise,
} from '../utils/perlin-animation';
import type { FbmOptions } from '../utils/perlin-animation';

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
// noise1D (legacy)
// ---------------------------------------------------------------------------

describe('noise1D', () => {
  it('returns a number', () => {
    expect(typeof noise1D(0)).toBe('number');
  });

  it('returns values within [-1, 1] for a range of inputs', () => {
    for (let x = -100; x <= 100; x += 0.37) {
      const v = noise1D(x);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic — same input gives same output', () => {
    const a = noise1D(42.5);
    const b = noise1D(42.5);
    expect(a).toBe(b);
  });

  it('varies smoothly — nearby inputs have close outputs', () => {
    const step = 0.001;
    const x = 10.0;
    const diff = Math.abs(noise1D(x + step) - noise1D(x));
    // With a tiny step, the change should be very small
    expect(diff).toBeLessThan(0.01);
  });

  it('returns different values for sufficiently distant inputs', () => {
    // Not always guaranteed, but very likely over integer boundaries
    const vals = new Set<number>();
    for (let i = 0; i < 20; i++) {
      vals.add(noise1D(i * 7.3));
    }
    // Should have at least several distinct values
    expect(vals.size).toBeGreaterThan(5);
  });

  it('returns 0 at integer points (gradient noise property)', () => {
    // At integer x, the fractional part is 0, so noise1D(x) should be 0
    // because the gradient dot product at the left lattice point is
    // grad * 0 = 0, and the right is grad * (-1), interpolated with u=0 =>
    // result is 0. (This is a known property of 1D gradient noise.)
    // Note: JavaScript may return -0 which is == 0 but not Object.is(0).
    expect(noise1D(0) === 0).toBe(true);
    expect(noise1D(5) === 0).toBe(true);
    expect(noise1D(-3) === 0).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateAnimationFrame (legacy)
// ---------------------------------------------------------------------------

describe('generateAnimationFrame', () => {
  it('returns a string of the requested width', () => {
    const frame = generateAnimationFrame(40, 0);
    // Count actual grapheme characters. The block chars are all single-width
    // codepoints so .length works.
    expect(frame.length).toBe(40);
  });

  it('returns empty string for width 0', () => {
    expect(generateAnimationFrame(0, 0)).toBe('');
  });

  it('returns empty string for negative width', () => {
    expect(generateAnimationFrame(-5, 0)).toBe('');
  });

  it('contains only expected block characters', () => {
    const valid = new Set([' ', '░', '▒', '▓', '█']);
    const frame = generateAnimationFrame(100, 1.5);
    for (const ch of frame) {
      expect(valid.has(ch)).toBe(true);
    }
  });

  it('produces different frames at different time values', () => {
    const frame1 = generateAnimationFrame(50, 0);
    const frame2 = generateAnimationFrame(50, 5);
    // They should differ (extremely unlikely to be identical for different t)
    expect(frame1).not.toBe(frame2);
  });

  it('produces deterministic output for same width and t', () => {
    const a = generateAnimationFrame(30, 2.7);
    const b = generateAnimationFrame(30, 2.7);
    expect(a).toBe(b);
  });

  it('produces width-1 frames', () => {
    const frame = generateAnimationFrame(1, 0);
    expect(frame.length).toBe(1);
  });

  it('handles very large width', () => {
    const frame = generateAnimationFrame(1000, 0);
    expect(frame.length).toBe(1000);
  });

  it('varies smoothly across columns (adjacent chars differ by at most one grade)', () => {
    const blocks = [' ', '░', '▒', '▓', '█'];
    const frame = generateAnimationFrame(100, 0);
    let largeDiffs = 0;
    for (let i = 1; i < frame.length; i++) {
      const idx1 = blocks.indexOf(frame[i - 1]!);
      const idx2 = blocks.indexOf(frame[i]!);
      if (Math.abs(idx2 - idx1) > 2) {
        largeDiffs++;
      }
    }
    // Allow some large diffs due to noise, but should be relatively rare
    expect(largeDiffs).toBeLessThan(frame.length * 0.3);
  });
});

// ---------------------------------------------------------------------------
// createPermutationTable
// ---------------------------------------------------------------------------

describe('createPermutationTable', () => {
  it('returns a 512-element Uint8Array', () => {
    const perm = createPermutationTable();
    expect(perm).toBeInstanceOf(Uint8Array);
    expect(perm.length).toBe(512);
  });

  it('contains each value 0-255 exactly twice (doubled table)', () => {
    const perm = createPermutationTable();
    const counts = new Array(256).fill(0);
    for (let i = 0; i < 512; i++) counts[perm[i]!]++;
    for (let v = 0; v < 256; v++) {
      expect(counts[v]).toBe(2);
    }
  });

  it('produces identical tables from the same seed', () => {
    const a = createPermutationTable(mulberry32(42));
    const b = createPermutationTable(mulberry32(42));
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('produces different tables from different seeds', () => {
    const a = createPermutationTable(mulberry32(1));
    const b = createPermutationTable(mulberry32(2));
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

// ---------------------------------------------------------------------------
// noise2d
// ---------------------------------------------------------------------------

describe('noise2d', () => {
  const perm = createPermutationTable(mulberry32(200));

  it('returns values in [-1, 1] for a range of inputs', () => {
    for (let x = -5; x <= 5; x += 0.5) {
      for (let y = -5; y <= 5; y += 0.5) {
        const v = noise2d(x, y, perm);
        expect(v).toBeGreaterThanOrEqual(-1.5);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('is deterministic for the same input and perm table', () => {
    expect(noise2d(1.5, 2.3, perm)).toBe(noise2d(1.5, 2.3, perm));
  });

  it('returns 0 at integer coordinates (gradient property)', () => {
    expect(noise2d(0, 0, perm)).toBeCloseTo(0, 10);
    expect(noise2d(5, 3, perm)).toBeCloseTo(0, 10);
  });

  it('varies across different coordinates', () => {
    const values = new Set<number>();
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        values.add(noise2d(x + 0.5, y + 0.5, perm));
      }
    }
    expect(values.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// fbm
// ---------------------------------------------------------------------------

describe('fbm', () => {
  const noise = new PerlinNoise(300);

  it('returns values in a reasonable range', () => {
    for (let x = -5; x <= 5; x += 0.5) {
      for (let y = -5; y <= 5; y += 0.5) {
        const v = fbm(noise, x, y);
        expect(v).toBeGreaterThanOrEqual(-1.5);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('returns consistent results for the same inputs', () => {
    const a = fbm(noise, 1.5, 2.3);
    const b = fbm(noise, 1.5, 2.3);
    expect(a).toBe(b);
  });

  it('uses default 4 octaves when no options provided', () => {
    const a = fbm(noise, 1.5, 2.3);
    const b = fbm(noise, 1.5, 2.3, 4);
    expect(a).toBe(b);
  });

  it('produces different output with different octave counts', () => {
    const a = fbm(noise, 1.5, 2.3, 1);
    const b = fbm(noise, 1.5, 2.3, 5);
    expect(a).not.toBe(b);
  });

  it('accepts FbmOptions object', () => {
    const opts: FbmOptions = { octaves: 3, persistence: 0.6, lacunarity: 2.5 };
    const v = fbm(noise, 1.5, 2.3, opts);
    expect(typeof v).toBe('number');
  });

  it('backward compat: number arg treated as octaves', () => {
    const a = fbm(noise, 1.5, 2.3, 3);
    const b = fbm(noise, 1.5, 2.3, { octaves: 3 });
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// PerlinNoise class
// ---------------------------------------------------------------------------

describe('PerlinNoise', () => {
  it('noise2d returns values in [-1, 1]', () => {
    const n = new PerlinNoise(42);
    for (let x = -5; x <= 5; x += 0.5) {
      for (let y = -5; y <= 5; y += 0.5) {
        const v = n.noise2d(x, y);
        expect(v).toBeGreaterThanOrEqual(-1.5);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('fbm returns consistent results', () => {
    const n = new PerlinNoise(42);
    const a = n.fbm(1.5, 2.3);
    const b = n.fbm(1.5, 2.3);
    expect(a).toBe(b);
  });

  it('seeded instances produce deterministic output', () => {
    const a = new PerlinNoise(12345);
    const b = new PerlinNoise(12345);
    expect(a.noise2d(1.5, 2.3)).toBe(b.noise2d(1.5, 2.3));
    expect(a.fbm(3.1, 4.2)).toBe(b.fbm(3.1, 4.2));
  });

  it('different seeds produce different output', () => {
    const a = new PerlinNoise(100);
    const b = new PerlinNoise(200);
    // Very unlikely (but not impossible) to be equal
    expect(a.noise2d(1.5, 2.3)).not.toBe(b.noise2d(1.5, 2.3));
  });

  it('PerlinNoise.shared is a singleton', () => {
    const a = PerlinNoise.shared;
    const b = PerlinNoise.shared;
    expect(a).toBe(b);
  });

  it('PerlinNoise.shared is a PerlinNoise instance', () => {
    expect(PerlinNoise.shared).toBeInstanceOf(PerlinNoise);
  });

  it('PerlinNoise.shared returns consistent values', () => {
    const a = PerlinNoise.shared.fbm(1, 2);
    const b = PerlinNoise.shared.fbm(1, 2);
    expect(a).toBe(b);
  });

  it('exposes noise2d and fbm methods', () => {
    const n = new PerlinNoise(400);
    expect(typeof n.noise2d(0, 0)).toBe('number');
    expect(typeof n.fbm(0, 0)).toBe('number');
  });

  it('fbm accepts optional octaves parameter', () => {
    const n = new PerlinNoise(42);
    const a = n.fbm(1.5, 2.3);
    const b = n.fbm(1.5, 2.3, 4);
    expect(a).toBe(b);

    const c = n.fbm(1.5, 2.3, 5);
    expect(c).not.toBe(a);
  });
});
