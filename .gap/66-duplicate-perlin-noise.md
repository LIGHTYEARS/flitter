# A02: Duplicate Perlin Noise Implementations

## Problem

Three separate Perlin noise implementations exist across
`packages/flitter-amp/src/widgets/`. Each widget file contains its own
private permutation table, fade function, gradient logic, and noise
evaluation function. Two of the three implementations are **functionally
identical** (same algorithm, same structure, copy-pasted code), while the
third is a simplified 1D variant. All three initialize their permutation
tables at module load time using `Math.random()`, meaning each file gets
its own independent random seed -- the noise fields are visually
uncorrelated across widgets even when the same coordinates are sampled.

This duplication creates maintenance burden, inflates bundle size with
redundant lookup tables (3 x 512-byte `Uint8Array` permutation tables),
and makes it impossible to share a deterministic seed across the noise
consumers for visual coherence.

## Duplication Inventory

### Implementation 1: `glow-text.ts` -- 1D value noise

**File**: `packages/flitter-amp/src/widgets/glow-text.ts`
**Lines**: 9-29

```typescript
const PERM_GT = new Uint8Array(512);
(function initPermGT() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM_GT[i] = p[i & 255];
})();

function noiseGT(x: number): number {
  const xi = Math.floor(x) & 255;
  const xf = x - Math.floor(x);
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const a = (PERM_GT[xi] / 255) * 2 - 1;
  const b = (PERM_GT[xi + 1] / 255) * 2 - 1;
  return a + u * (b - a);
}
```

**Characteristics**:
- 1D only (takes a single `x` parameter)
- Value noise, not gradient noise: uses permutation table values directly as pseudo-random heights, scaled to [-1, 1]
- Uses the same quintic fade curve as the 2D implementations: `t^3 * (t * (t * 6 - 15) + 10)`
- Permutation table named `PERM_GT` (suffixed to avoid collision if bundled together)
- IIFE initialization pattern
- No gradient table -- interpolates directly between permutation-derived values
- No `fbm` (fractal Brownian motion) wrapper
- Called at line 89: `noiseGT(i * 0.3 + this.timeOffset)`

### Implementation 2: `orb-widget.ts` -- 2D gradient noise + fbm

**File**: `packages/flitter-amp/src/widgets/orb-widget.ts`
**Lines**: 25-88

```typescript
const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function initPerm(): void {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

initPerm();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad2d(hash: number, x: number, y: number): number {
  const g = GRAD[hash & 7];
  return g[0] * x + g[1] * y;
}

function noise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];

  const x1 = grad2d(aa, xf, yf) * (1 - u) + grad2d(ba, xf - 1, yf) * u;
  const x2 = grad2d(ab, xf, yf - 1) * (1 - u) + grad2d(bb, xf - 1, yf - 1) * u;

  return x1 * (1 - v) + x2 * v;
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return (value / maxAmplitude + 1) * 0.5;
}
```

**Characteristics**:
- 2D gradient noise (classic Perlin algorithm)
- 8-entry gradient table with unit and diagonal vectors
- Quintic fade function (Ken Perlin's improved noise)
- `fbm()` wrapper with configurable octaves, 0.5 persistence, 2x lacunarity
- `fbm()` normalizes output to [0, 1] range
- `noise2d()` returns values in approximately [-1, 1]
- Named function `initPerm()` called at module scope (not IIFE)
- No non-null assertions on array accesses
- Called at lines 81 and 153-156 via `fbm(..., 3)`
- Widget is marked `@deprecated` in favor of `DensityOrbWidget`

### Implementation 3: `density-orb-widget.ts` -- 2D gradient noise + fbm (copy)

**File**: `packages/flitter-amp/src/widgets/density-orb-widget.ts`
**Lines**: 20-83

```typescript
const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function initPerm(): void {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

initPerm();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad2d(hash: number, x: number, y: number): number {
  const g = GRAD[hash & 7]!;
  return g[0]! * x + g[1]! * y;
}

function noise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[xi]! + yi]!;
  const ab = PERM[PERM[xi]! + yi + 1]!;
  const ba = PERM[PERM[xi + 1]! + yi]!;
  const bb = PERM[PERM[xi + 1]! + yi + 1]!;

  const x1 = grad2d(aa, xf, yf) * (1 - u) + grad2d(ba, xf - 1, yf) * u;
  const x2 = grad2d(ab, xf, yf - 1) * (1 - u) + grad2d(bb, xf - 1, yf - 1) * u;

  return x1 * (1 - v) + x2 * v;
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return (value / maxAmplitude + 1) * 0.5;
}
```

**Characteristics**:
- **Identical algorithm** to `orb-widget.ts`
- Only difference: non-null assertions (`!`) added on array accesses (stricter TypeScript)
- Same gradient table, same fade function, same `noise2d`, same `fbm`
- Each file creates its own 512-byte `PERM` array with an independent `Math.random()` seed
- Called at lines 76 and 293-296 via `fbm(..., 3)`

## Comparison Matrix

| Aspect | glow-text.ts | orb-widget.ts | density-orb-widget.ts |
|--------|-------------|---------------|----------------------|
| Dimensions | 1D | 2D | 2D |
| Algorithm | Value noise | Gradient noise (Perlin) | Gradient noise (Perlin) |
| Fade function | Inline quintic | Extracted `fade()` | Extracted `fade()` |
| Gradient table | None | 8 vectors | 8 vectors (identical) |
| Permutation init | IIFE | Named function | Named function (identical) |
| `fbm()` | No | Yes | Yes (identical) |
| Non-null assertions | No | No | Yes |
| Perm table name | `PERM_GT` | `PERM` | `PERM` |
| Output range (raw) | [-1, 1] | [-1, 1] | [-1, 1] |
| Output range (fbm) | N/A | [0, 1] | [0, 1] |
| Lines of code | 21 | 64 | 64 |
| **Total duplicated** | | | **149 lines** |

## Consequences of the Duplication

1. **Independent permutation tables**: Each file initializes its own `PERM`
   array with `Math.random()`. If both OrbWidget and DensityOrbWidget are
   rendered in the same application, they sample from different noise fields,
   making visual consistency impossible.

2. **Bundle bloat**: Three 512-byte `Uint8Array` instances are allocated at
   module load time. The gradient table is duplicated between orb-widget and
   density-orb-widget. Total: ~1.6 KB of redundant static data.

3. **Maintenance divergence**: The `density-orb-widget.ts` copy already
   diverged from `orb-widget.ts` by adding non-null assertions. Any future
   algorithm improvement (e.g., switching to a deterministic seed, adding 3D
   support) would need to be applied in all three files.

4. **No seeding control**: All three implementations use `Math.random()`,
   providing no way to create reproducible noise patterns for testing or
   deterministic rendering.

5. **No reuse path**: A new widget that needs noise (e.g., an animated
   background, a particle system, a procedural texture) would need to
   copy-paste one of these implementations again.

## Proposed Solution

Create a shared `perlin-noise.ts` module in `packages/flitter-amp/src/utils/`
that exports all noise primitives. The module provides both the low-level
building blocks (`noise1d`, `noise2d`, `fade`) and the higher-level `fbm`
compositor, plus a `PerlinNoise` class for seedable instances.

### File: `packages/flitter-amp/src/utils/perlin-noise.ts`

```typescript
/**
 * Perlin noise utilities.
 *
 * Provides 1D and 2D gradient noise, fractal Brownian motion (fbm),
 * and a seedable PerlinNoise class. Consolidates the three independent
 * noise implementations from glow-text.ts, orb-widget.ts, and
 * density-orb-widget.ts into a single shared module.
 *
 * Design decisions:
 *   - Default instance uses Math.random() for backward compatibility
 *   - PerlinNoise class accepts a seed function for deterministic output
 *   - All functions are pure given a fixed permutation table
 *   - The 1D noise in glow-text used value noise; we provide noise1d()
 *     as a gradient-based 1D variant for consistency, plus value1d()
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
 * Default parameters match the original orb-widget.ts / density-orb-widget.ts
 * implementations: 3 octaves, 0.5 persistence, 2x lacunarity.
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
```

### Key design decisions

1. **Functional core + OOP convenience**: All noise functions are exported as
   pure functions that take an explicit `perm` table parameter. The
   `PerlinNoise` class wraps these for ergonomic use but is not required.

2. **`PerlinNoise.shared` singleton**: Provides a single permutation table
   shared across all widgets that use it, enabling visual coherence between
   GlowText and the orb widgets. This is the primary behavioral improvement
   over the current code.

3. **`value1d` preserves glow-text behavior**: The original `noiseGT`
   function used value noise (not gradient noise). Rather than silently
   changing the algorithm, the shared module provides `value1d` as a
   separate function that replicates the original exactly.

4. **Seedable construction**: `PerlinNoise` accepts an optional RNG function,
   enabling deterministic noise for testing and reproducible visual snapshots.

5. **Non-null assertions everywhere**: The shared module uses `!` on all
   array accesses for TypeScript strictness, matching the newer
   `density-orb-widget.ts` convention.

6. **`FbmOptions` for flexibility**: The `fbm` function accepts optional
   persistence and lacunarity parameters. The defaults (0.5 / 2) match the
   original hard-coded values, so existing call sites need no changes.

## Per-Widget Migration Guide

### Migration: `glow-text.ts`

**Before** (lines 9-29, 21 lines of noise code):

```typescript
const PERM_GT = new Uint8Array(512);
(function initPermGT() { /* ... 8 lines ... */ })();

function noiseGT(x: number): number {
  /* ... 7 lines ... */
}
```

**After**:

```typescript
import { PerlinNoise } from '../utils/perlin-noise';

const noise = PerlinNoise.shared;
```

Call site change at line 89:

```typescript
// Before:
const n = (noiseGT(i * 0.3 + this.timeOffset) + 1) * 0.5;

// After:
const n = (noise.value1d(i * 0.3 + this.timeOffset) + 1) * 0.5;
```

**Lines removed**: ~21 (entire `PERM_GT` table, `initPermGT`, `noiseGT`).
**Lines added**: ~2 (import + instance).
**Behavioral change**: The permutation table is now shared with other noise
consumers via `PerlinNoise.shared`. The noise algorithm itself is identical.

### Migration: `orb-widget.ts`

**Before** (lines 25-88, 64 lines of noise code):

```typescript
const PERM = new Uint8Array(512);
const GRAD = [ /* ... */ ];
function initPerm(): void { /* ... */ }
initPerm();
function fade(t: number): number { /* ... */ }
function grad2d(hash: number, x: number, y: number): number { /* ... */ }
function noise2d(x: number, y: number): number { /* ... */ }
function fbm(x: number, y: number, octaves: number): number { /* ... */ }
```

**After**:

```typescript
import { PerlinNoise } from '../utils/perlin-noise';

const noise = PerlinNoise.shared;
```

Call site changes at lines 81 and 153-156:

```typescript
// Before:
const n = fbm(
  dotX * NOISE_SCALE + this.timeOffset,
  dotY * NOISE_SCALE + this.timeOffset * 0.7,
  3,
);

// After:
const n = noise.fbm(
  dotX * NOISE_SCALE + this.timeOffset,
  dotY * NOISE_SCALE + this.timeOffset * 0.7,
);
```

The `octaves: 3` argument is dropped because it matches the default.

**Lines removed**: ~64 (entire noise implementation block).
**Lines added**: ~2 (import + instance).
**Behavioral change**: Shared permutation table; algorithm is identical.

### Migration: `density-orb-widget.ts`

**Before** (lines 20-83, 64 lines of noise code):

```typescript
const PERM = new Uint8Array(512);
const GRAD = [ /* ... */ ];
function initPerm(): void { /* ... */ }
initPerm();
function fade(t: number): number { /* ... */ }
function grad2d(hash: number, x: number, y: number): number { /* ... */ }
function noise2d(x: number, y: number): number { /* ... */ }
function fbm(x: number, y: number, octaves: number): number { /* ... */ }
```

**After**:

```typescript
import { PerlinNoise } from '../utils/perlin-noise';

const noise = PerlinNoise.shared;
```

Call site changes at lines 76 and 293-296:

```typescript
// Before:
const n = fbm(
  cellCol * NOISE_SCALE + this.timeOffset,
  cellRow * NOISE_SCALE + this.timeOffset * 0.7,
  3,
);

// After:
const n = noise.fbm(
  cellCol * NOISE_SCALE + this.timeOffset,
  cellRow * NOISE_SCALE + this.timeOffset * 0.7,
);
```

**Lines removed**: ~64 (entire noise implementation block).
**Lines added**: ~2 (import + instance).
**Behavioral change**: Shared permutation table; algorithm is identical.
The non-null assertions from this file's version are preserved in the
shared module.

## Lines of Code Impact

| Area | Before | After | Delta |
|------|--------|-------|-------|
| `utils/perlin-noise.ts` (new) | 0 | ~170 lines | +170 |
| `glow-text.ts` | 109 lines | ~90 lines | -19 |
| `orb-widget.ts` | 199 lines | ~137 lines | -62 |
| `density-orb-widget.ts` | 346 lines | ~284 lines | -62 |
| **Production total** | 654 lines | ~681 lines | **+27 net** |
| **Test file** (new) | 0 | ~180 lines | +180 |

The net production code increase of ~27 lines reflects the shared module's
additional features (seedable construction, `PerlinNoise` class, JSDoc,
`FbmOptions` type) that go beyond what any single original implementation
provided. The raw algorithm deduplication saves 149 lines (21 + 64 + 64),
which is offset by the ~170-line shared module that includes documentation,
the class wrapper, and the options interface.

The real value is **single source of truth**: three independent copies of
the same algorithm (which have already begun to diverge in TypeScript
strictness) are replaced by one canonical implementation.

## Testing Strategy

The shared module's pure-function design makes it straightforward to test
without rendering widgets. Tests should cover correctness, determinism,
and backward compatibility.

### File: `packages/flitter-amp/src/utils/__tests__/perlin-noise.test.ts`

```typescript
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
// fade
// ---------------------------------------------------------------------------

describe('fade', () => {
  it('returns 0 at t=0', () => {
    expect(fade(0)).toBe(0);
  });

  it('returns 1 at t=1', () => {
    expect(fade(1)).toBe(1);
  });

  it('returns 0.5 at t=0.5', () => {
    expect(fade(0.5)).toBeCloseTo(0.5, 5);
  });

  it('is monotonically increasing on [0, 1]', () => {
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

  it('returns values in [-1, 1]', () => {
    for (let x = -10; x <= 10; x += 0.1) {
      const v = value1d(x, perm);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same input and perm table', () => {
    expect(value1d(3.7, perm)).toBe(value1d(3.7, perm));
  });

  it('varies across different x values', () => {
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

  it('returns values in approximately [-1, 1]', () => {
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

  it('returns values in [0, 1]', () => {
    for (let x = -5; x <= 5; x += 0.5) {
      for (let y = -5; y <= 5; y += 0.5) {
        const v = fbm(x, y, perm);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('uses default 3 octaves when no options provided', () => {
    const a = fbm(1.5, 2.3, perm);
    const b = fbm(1.5, 2.3, perm, { octaves: 3 });
    expect(a).toBe(b);
  });

  it('produces different output with different octave counts', () => {
    const a = fbm(1.5, 2.3, perm, { octaves: 1 });
    const b = fbm(1.5, 2.3, perm, { octaves: 5 });
    expect(a).not.toBe(b);
  });

  it('is deterministic', () => {
    expect(fbm(3.1, 4.2, perm)).toBe(fbm(3.1, 4.2, perm));
  });
});

// ---------------------------------------------------------------------------
// PerlinNoise class
// ---------------------------------------------------------------------------

describe('PerlinNoise', () => {
  it('exposes value1d, noise2d, and fbm methods', () => {
    const noise = new PerlinNoise(mulberry32(400));
    expect(typeof noise.value1d(0)).toBe('number');
    expect(typeof noise.noise2d(0, 0)).toBe('number');
    expect(typeof noise.fbm(0, 0)).toBe('number');
  });

  it('produces deterministic output from the same seed', () => {
    const a = new PerlinNoise(mulberry32(500));
    const b = new PerlinNoise(mulberry32(500));
    expect(a.fbm(1.5, 2.3)).toBe(b.fbm(1.5, 2.3));
    expect(a.value1d(3.7)).toBe(b.value1d(3.7));
    expect(a.noise2d(4.1, 5.2)).toBe(b.noise2d(4.1, 5.2));
  });

  it('shared singleton is a PerlinNoise instance', () => {
    expect(PerlinNoise.shared).toBeInstanceOf(PerlinNoise);
  });

  it('shared singleton returns consistent values', () => {
    const a = PerlinNoise.shared.fbm(1, 2);
    const b = PerlinNoise.shared.fbm(1, 2);
    expect(a).toBe(b);
  });
});
```

### Additional integration testing

Beyond unit tests, the migration should be validated by:

1. **Visual regression**: Run the existing flitter-amp demo/example that
   renders OrbWidget, DensityOrbWidget, and GlowText. Confirm the visual
   output looks qualitatively similar (exact pixel match is not expected
   since the permutation seed changes, but the noise character -- smoothness,
   scale, animation speed -- should be preserved).

2. **Existing widget tests**: Run `packages/flitter-amp/src/__tests__/` to
   confirm no regressions in layout or rendering tests that exercise these
   widgets.

3. **TypeScript strict mode**: The shared module uses non-null assertions
   throughout, matching `density-orb-widget.ts` conventions. Verify that
   `tsc --noEmit` passes with no new errors.

## Incremental Adoption Path

1. **Step 1**: Add `packages/flitter-amp/src/utils/perlin-noise.ts` and
   its test file. No existing code is touched. Ship and verify tests pass.

2. **Step 2**: Migrate `density-orb-widget.ts` first. It is the active
   (non-deprecated) orb widget and is the most recent copy. Remove the
   64-line noise block and import from the shared module.

3. **Step 3**: Migrate `orb-widget.ts`. It is marked `@deprecated` but
   still exists in the codebase. Same transformation as step 2.

4. **Step 4**: Migrate `glow-text.ts`. Uses `value1d` instead of `noise2d`,
   so the import path is slightly different but the transformation is
   straightforward.

5. **Step 5**: Verify that no private noise functions remain in any widget
   file. Run `grep -rn 'function noise\|function fade\|function fbm\|function grad2d\|function initPerm\|PERM.*Uint8Array' packages/flitter-amp/src/widgets/`
   and confirm zero matches.

Each step is independently shippable. The shared module is additive in
step 1, and each subsequent step is a pure refactor that reduces duplication
without changing widget behavior.

## Future Extensions

Once the shared module is in place, several improvements become feasible:

1. **Deterministic visual tests**: Use `new PerlinNoise(seedFn)` in snapshot
   tests to produce reproducible noise patterns, enabling pixel-exact visual
   regression tests for the orb and glow widgets.

2. **3D noise**: Add `noise3d` for time-varying effects that use 3D
   coordinates `(x, y, t)` instead of offsetting 2D coordinates with a
   time parameter. This would produce smoother temporal transitions.

3. **Simplex noise**: The module could be extended with a simplex noise
   implementation for better performance at higher dimensions and fewer
   directional artifacts.

4. **Shared noise field**: Because `PerlinNoise.shared` uses a single
   permutation table, multiple widgets can sample the same noise field at
   different scales, enabling coordinated visual effects (e.g., a background
   texture that matches the orb's noise pattern).
