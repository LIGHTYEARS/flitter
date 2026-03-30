# Gap A04 (Gap #68): BrailleSpinner Alignment with Amp Reference

## Executive Summary

The `BrailleSpinner` utility in `flitter-core` diverges from the Amp binary's `class Af`
in ten distinct ways: state representation, initial state, neighbor topology, survival
rule, birth rule, generation counter, reseed density, cycle detection strategy, braille
encoding, and timer interval. This document provides a complete solution to align the
implementation with the Amp reference (`packages/flitter-amp/.ref/amp-cli/braille-spinner-Af.js`).

The fix is a targeted rewrite of a single self-contained file plus a one-line timer
interval change in `ToolHeader`. Public API surface (`step()`, `toBraille()`, `toCode()`,
`reset()`) remains identical -- no downstream consumers break.

---

## 1. Root Cause Analysis

The original `BrailleSpinner` was implemented speculatively before the Amp reference
`braille-spinner-Af.js` was extracted. The developer used a standard Game of Life on a
2D grid as an approximation, whereas Amp's `Af` class uses a fundamentally different
design:

1. **Flat 8-cell array** (not a 2D 4x2 grid)
2. **Hardcoded non-planar neighbor graph** (5 neighbors per cell, not Moore neighborhood)
3. **Strict Conway rules** (survive: exactly 2 or 3; birth: exactly 3)
4. **Generation counter** capping runs at 15 steps
5. **40% reseed density** with minimum 3 live cells
6. **Deterministic initial state** `[T,F,T,F,T,F,T,F]`

These differences compound into visually distinct animation: the current flitter spinner
produces denser, stickier patterns that animate too fast (100ms vs 200ms), while Amp's
spinner produces lighter, more dynamic patterns with guaranteed variety every 3 seconds.

---

## 2. Affected Files

| File | Path | Change Type |
|------|------|-------------|
| BrailleSpinner | `packages/flitter-core/src/utilities/braille-spinner.ts` | **Rewrite** |
| ToolHeader | `packages/flitter-amp/src/widgets/tool-call/tool-header.ts` | **Modify** (1 line) |
| BrailleSpinner tests | `packages/flitter-core/src/utilities/__tests__/braille-spinner.test.ts` | **New** |

---

## 3. Detailed Diff: Current vs. Amp Reference

### 3.1 State Representation

**Current** (`braille-spinner.ts:49-55`):
```typescript
private _grid: boolean[][];         // 2D: 4 rows x 2 cols
private _history: number[] = [];    // rolling 5-frame code history
private _maxHistory = 5;
constructor() {
  this._grid = this._randomGrid();  // random ~60% density
}
```

**Amp** (`braille-spinner-Af.js`):
```javascript
state = [!0, !1, !0, !1, !0, !1, !0, !1];  // flat 8 booleans, alternating
previousState = [];                           // single previous state
generation = 0;                               // generation counter
maxGenerations = 15;                          // forced reseed ceiling
```

**Fix**: Replace the 2D grid with a flat `boolean[8]`. Replace the rolling history with
a single `previousState` array. Add a `generation` counter with a `MAX_GENERATIONS = 15`
constant. Set the initial state to `[true, false, true, false, true, false, true, false]`.

### 3.2 Neighbor Topology

**Current** (`braille-spinner.ts:122-135`): Standard Moore neighborhood scan with bounds
checking on a 4x2 grid. Each cell has 3-5 neighbors depending on position (corners have
3, edges have 5, but the grid is only 2 columns wide so there are no truly interior
cells).

**Amp** (`braille-spinner-Af.js`): Hardcoded `neighborMap` defining a custom graph where
every cell has exactly 5 neighbors:
```javascript
neighborMap = [
  [1, 3, 4, 5, 7],   // cell 0
  [0, 2, 4, 5, 6],   // cell 1
  [1, 3, 5, 6, 7],   // cell 2
  [0, 2, 4, 6, 7],   // cell 3
  [0, 1, 3, 5, 7],   // cell 4
  [0, 1, 2, 4, 6],   // cell 5
  [1, 2, 3, 5, 7],   // cell 6
  [0, 2, 3, 4, 6],   // cell 7
];
```

This is a non-planar graph. It cannot be derived from any rectangular grid adjacency.
Each cell has exactly 5 neighbors, and the graph has symmetry properties that produce
interesting automaton dynamics on the 8-cell space.

**Fix**: Replace the dynamic `_countNeighbors()` method with a `NEIGHBOR_MAP` constant
array lookup. The step function becomes a simple `.map()` over the flat state array.

### 3.3 Automaton Rules

**Current** (`braille-spinner.ts:61-71`):
```
Survive: 1 <= neighbors <= 3  (too wide -- cells with 1 neighbor survive)
Birth:   2 <= neighbors <= 3  (too wide -- cells with 2 neighbors are born)
```

**Amp** (`braille-spinner-Af.js`):
```
Survive: neighbors === 2 || neighbors === 3  (standard Conway)
Birth:   neighbors === 3 || neighbors === 6  (3 is effective; 6 is unreachable)
```

Since every cell has exactly 5 neighbors in Amp's graph, `neighbors === 6` is
impossible (max is 5). The effective birth rule is `neighbors === 3` only.

The wider rules in the current implementation cause:
- Cells with 1 live neighbor surviving (should die) -- creates stickier patterns
- Cells with 2 live neighbors being born (should stay dead) -- creates denser patterns

**Fix**: Change survival to `neighbors === 2 || neighbors === 3` and birth to
`neighbors === 3`. Include the `neighbors === 6` check in a comment for reference
fidelity, but it is functionally a no-op.

### 3.4 Reseed Logic

**Current** (`braille-spinner.ts:137-160`):
- No generation counter (can run indefinitely)
- Rolling 5-frame history for cycle detection (period <= 4)
- Static detection: last 2 codes identical
- Depletion: `liveCount < 2`
- Reseed: `Math.random() > 0.4` (~60% density), no minimum cell enforcement

**Amp** (`braille-spinner-Af.js`):
- Generation counter: reseeds at `generation >= 15` (every 3 seconds at 200ms)
- Period-2 oscillation: compares with `previousState` (one generation back)
- Static detection: next identical to current
- All-dead check: `H.every(t => !t)`
- Depletion: `liveCount < 2`
- Reseed: `Math.random() > 0.6` (~40% density), loop until `liveCount >= 3`

The generation counter is the most impactful difference. At 200ms per step, Amp
guarantees a reseed at least every 3 seconds. The current implementation can get stuck
in long stable states that the 5-frame window does not detect (e.g., a period-5 cycle
with period > 4).

**Fix**: Add `_generation` counter incremented each step. Reseed when any of:
`isStatic || isOscillating || generation >= 15 || allDead || liveCount < 2`. Reseed
density ~40% with do-while loop ensuring >= 3 live cells.

### 3.5 Braille Encoding

**Current** (`braille-spinner.ts:26-31, 110-120`):
Uses a 2D `DOT_WEIGHTS` table mapping `[row][col]` to braille dot bit weights.

**Amp** (`braille-spinner-Af.js`):
Uses a permutation array `[0, 1, 2, 6, 3, 4, 5, 7]` that maps cell index to bit
position, then ORs `1 << permutedBit` into the codepoint.

Both produce the same mapping from cell position to braille dot:
```
Cell 0 -> dot1 (0x01)    Cell 4 -> dot4 (0x08)
Cell 1 -> dot2 (0x02)    Cell 5 -> dot5 (0x10)
Cell 2 -> dot3 (0x04)    Cell 6 -> dot6 (0x20)
Cell 3 -> dot7 (0x40)    Cell 7 -> dot8 (0x80)
```

Cells 0-3 = left column, cells 4-7 = right column. The encoding is mathematically
equivalent, but Amp uses `String.fromCharCode()` while the current code uses
`String.fromCodePoint()`. For the U+2800 range (all within BMP), both work, but
matching Amp's exact call is a fidelity improvement.

**Fix**: Use the flat permutation array approach with `String.fromCharCode()`.

### 3.6 Timer Interval

**Current** (`tool-header.ts:88`): `100` ms
**Amp** (README section 11.1): `200` ms

The 100ms interval makes the spinner animate at 10 fps -- twice the intended 5 fps.
At 200ms, the animation is calmer and each braille character is visible long enough
to perceive the pattern change.

**Fix**: Change `100` to `200` in `ToolHeader.startSpinner()`.

---

## 4. Proposed Implementation

### 4.1 New `braille-spinner.ts`

Replace the entire file at `packages/flitter-core/src/utilities/braille-spinner.ts`:

```typescript
// BrailleSpinner -- cellular automaton spinner mapped to Unicode braille characters
// Amp ref: class Af in braille-spinner-Af.js
//
// Uses an 8-cell state with a custom neighbor topology (hardcoded adjacency
// list). Each generation applies Conway-like rules and maps the state to a
// single Unicode braille character (U+2800 range) via a bit permutation.
//
// Usage:
//   const spinner = new BrailleSpinner();
//   setInterval(() => {
//     spinner.step();
//     setText(spinner.toBraille());
//   }, 200);

// ---------------------------------------------------------------------------
// Braille bit permutation: maps flat cell index to braille dot bit position.
// Amp ref: Af.toBraille() -- H = [0, 1, 2, 6, 3, 4, 5, 7]
//
// Cells 0-3 = left column (dots 1,2,3,7)
// Cells 4-7 = right column (dots 4,5,6,8)
//
//   Cell 0 -> bit 0 (0x01) dot1    Cell 4 -> bit 3 (0x08) dot4
//   Cell 1 -> bit 1 (0x02) dot2    Cell 5 -> bit 4 (0x10) dot5
//   Cell 2 -> bit 2 (0x04) dot3    Cell 6 -> bit 5 (0x20) dot6
//   Cell 3 -> bit 6 (0x40) dot7    Cell 7 -> bit 7 (0x80) dot8
// ---------------------------------------------------------------------------

const BRAILLE_BIT_MAP = [0, 1, 2, 6, 3, 4, 5, 7];

const CELL_COUNT = 8;
const BRAILLE_BASE = 0x2800;

// Amp ref: class Af.neighborMap -- custom non-planar graph where every cell
// has exactly 5 neighbors. This is NOT a standard 2D grid adjacency.
const NEIGHBOR_MAP: ReadonlyArray<ReadonlyArray<number>> = [
  [1, 3, 4, 5, 7], // cell 0
  [0, 2, 4, 5, 6], // cell 1
  [1, 3, 5, 6, 7], // cell 2
  [0, 2, 4, 6, 7], // cell 3
  [0, 1, 3, 5, 7], // cell 4
  [0, 1, 2, 4, 6], // cell 5
  [1, 2, 3, 5, 7], // cell 6
  [0, 2, 3, 4, 6], // cell 7
];

// Amp ref: maxGenerations = 15
const MAX_GENERATIONS = 15;

/**
 * A cellular automaton-based spinner that outputs a single Unicode braille
 * character per frame.
 *
 * Amp ref: class Af in braille-spinner-Af.js
 *
 * The automaton runs on 8 cells with a custom neighbor topology:
 * - A live cell with exactly 2 or 3 live neighbors survives
 * - A dead cell with exactly 3 live neighbors is born
 * - Otherwise the cell dies
 *
 * Auto-reseeds when the state becomes static, oscillating (period 2),
 * all dead, depleted (fewer than 2 live cells), or after 15 generations.
 */
export class BrailleSpinner {
  // Amp ref: state = [!0, !1, !0, !1, !0, !1, !0, !1]
  private _state: boolean[] = [true, false, true, false, true, false, true, false];
  private _previousState: boolean[] = [];
  private _generation = 0;

  /** Advance one generation. */
  step(): void {
    // Amp ref: Af.step()
    const next = this._state.map((alive, i) => {
      const neighbors = NEIGHBOR_MAP[i].filter((n) => this._state[n]).length;
      if (alive) return neighbors === 2 || neighbors === 3;
      // Amp also checks neighbors === 6, but max neighbors is 5, so it
      // is unreachable. Included for reference fidelity.
      return neighbors === 3 || neighbors === 6;
    });

    // Amp ref: static and period-2 oscillation detection
    const isStatic = next.every((v, i) => v === this._state[i]);
    const isOscillating =
      this._previousState.length > 0 &&
      next.every((v, i) => v === this._previousState[i]);

    this._previousState = [...this._state];
    this._state = next;
    this._generation++;

    const allDead = next.every((v) => !v);
    const liveCount = next.filter((v) => v).length;

    // Amp ref: reseed conditions
    if (
      isStatic ||
      isOscillating ||
      this._generation >= MAX_GENERATIONS ||
      allDead ||
      liveCount < 2
    ) {
      this._reseed();
    }
  }

  /** Convert current state to a single braille character. */
  toBraille(): string {
    // Amp ref: Af.toBraille() with permutation [0,1,2,6,3,4,5,7]
    let code = BRAILLE_BASE;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this._state[i]) {
        code |= 1 << BRAILLE_BIT_MAP[i];
      }
    }
    return String.fromCharCode(code);
  }

  /** Get the raw braille code point offset (0-255). */
  toCode(): number {
    let code = 0;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this._state[i]) {
        code |= 1 << BRAILLE_BIT_MAP[i];
      }
    }
    return code;
  }

  /** Reset with a fresh random state. */
  reset(): void {
    this._reseed();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** Amp ref: reseed with ~40% density, minimum 3 live cells. */
  private _reseed(): void {
    let state: boolean[];
    do {
      state = Array.from({ length: CELL_COUNT }, () => Math.random() > 0.6);
    } while (state.filter((v) => v).length < 3);
    this._state = state;
    this._previousState = [];
    this._generation = 0;
  }
}
```

### 4.2 Timer Interval Fix in `tool-header.ts`

In `packages/flitter-amp/src/widgets/tool-call/tool-header.ts`, change line 88:

```typescript
// BEFORE:
  }, 100);

// AFTER:
  }, 200);  // Amp ref: braille spinner stepped every 200ms (README section 11.1)
```

Also update the JSDoc comment on the `startSpinner` method (line 81-82):

```typescript
// BEFORE:
  /**
   * Starts the BrailleSpinner animation at ~100ms per frame.
   */

// AFTER:
  /**
   * Starts the BrailleSpinner animation at ~200ms per frame.
   * Amp ref: README section 11.1 -- stepped every 200ms
   */
```

And the class-level JSDoc (line 28):

```typescript
// BEFORE:
 * Uses StatefulWidget to drive BrailleSpinner animation at ~100ms per frame

// AFTER:
 * Uses StatefulWidget to drive BrailleSpinner animation at ~200ms per frame
```

---

## 5. Behavioral Impact Analysis

### 5.1 Visual Pattern Changes

| Aspect | Before (current) | After (aligned) |
|--------|-------------------|-----------------|
| Pattern density | ~60% live cells, heavy braille chars | ~40% live cells, lighter braille chars |
| Animation speed | 100ms (10 fps) -- fast, jittery | 200ms (5 fps) -- calm, readable |
| Pattern variety | Low (wide rules create stable attractors) | High (strict rules + gen cap force reseeds) |
| Reseed frequency | Irregular (only on stagnation) | Guaranteed every 15 steps (3s max) |
| First frame | Random | Deterministic `[T,F,T,F,T,F,T,F]` -> immediate reseed |

### 5.2 First-Frame Behavior

The initial alternating state `[T,F,T,F,T,F,T,F]` is not a stable configuration under
Amp's rules. Manual computation of the first step:

```
Cell 0 (alive): neighbors {1:F, 3:F, 4:T, 5:F, 7:F} = 1 -> dies (need 2 or 3)
Cell 1 (dead):  neighbors {0:T, 2:T, 4:T, 5:F, 6:T} = 4 -> stays dead (need 3)
Cell 2 (alive): neighbors {1:F, 3:F, 5:F, 6:T, 7:F} = 1 -> dies
Cell 3 (dead):  neighbors {0:T, 2:T, 4:T, 6:T, 7:F} = 4 -> stays dead
Cell 4 (alive): neighbors {0:T, 1:F, 3:F, 5:F, 7:F} = 1 -> dies
Cell 5 (dead):  neighbors {0:T, 1:F, 2:T, 4:T, 6:T} = 4 -> stays dead
Cell 6 (alive): neighbors {1:F, 2:T, 3:F, 5:F, 7:F} = 1 -> dies
Cell 7 (dead):  neighbors {0:T, 2:T, 3:F, 4:T, 6:T} = 4 -> stays dead
```

Result: all cells die -> `[F,F,F,F,F,F,F,F]` -> `allDead` triggers immediate reseed.
This means the first visible frame after `step()` is called will always be a random
state with >= 3 live cells and ~40% density. This matches Amp's behavior exactly.

### 5.3 Reseed Quality

The reseed loop `do { ... } while (liveCount < 3)` with ~40% density:
- Expected live cells per random seed: 3.2 (8 * 0.4)
- P(liveCount < 3) per attempt: ~31.5% (binomial CDF)
- Expected attempts before acceptance: ~1.46
- Maximum live cells: 8 (P ~ 0.065%)

This produces sparser seeds than the current 60% density (expected 4.8 live cells),
resulting in lighter braille characters that die more readily, producing more visual
variation.

---

## 6. API Compatibility

The public interface is unchanged:

| Method | Signature | Behavior Change |
|--------|-----------|-----------------|
| `step()` | `(): void` | Different automaton rules (aligned with Amp) |
| `toBraille()` | `(): string` | Same return type; different character distribution |
| `toCode()` | `(): number` | Same return type; different value distribution |
| `reset()` | `(): void` | Now reseeds with ~40% density (was ~60%) |

The `BrailleSpinner` export from `packages/flitter-core/src/index.ts` (line 91) requires
no changes.

### 6.1 Downstream Consumer Audit

| Consumer | File | Impact |
|----------|------|--------|
| `ToolHeader` | `packages/flitter-amp/src/widgets/tool-call/tool-header.ts` | Timer interval change required |
| `CollapsibleDrawer` | `packages/flitter-core/src/widgets/collapsible-drawer.ts` | Uses hardcoded braille frame array, NOT `BrailleSpinner` -- unaffected |
| `SpinnerApp` example | `packages/flitter-core/examples/spinner.ts` | Uses hardcoded frame arrays, NOT `BrailleSpinner` -- unaffected |
| Re-exports | `packages/flitter-core/src/index.ts:91` | No change needed |

---

## 7. Testing Plan

### 7.1 Unit Tests

Create `packages/flitter-core/src/utilities/__tests__/braille-spinner.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { BrailleSpinner } from '../braille-spinner';

describe('BrailleSpinner', () => {
  describe('initial state', () => {
    it('starts with alternating state producing code 0x2D', () => {
      const spinner = new BrailleSpinner();
      // Cells 0,2,4,6 active -> bits 0,2,3,5 -> 0x01|0x04|0x08|0x20 = 0x2D
      expect(spinner.toCode()).toBe(0x2d);
    });

    it('produces a valid braille character before any steps', () => {
      const spinner = new BrailleSpinner();
      const ch = spinner.toBraille();
      const cp = ch.codePointAt(0)!;
      expect(cp).toBeGreaterThanOrEqual(0x2800);
      expect(cp).toBeLessThanOrEqual(0x28ff);
    });
  });

  describe('automaton rules', () => {
    it('initial alternating state dies in one step (all cells have 1 neighbor)', () => {
      const spinner = new BrailleSpinner();
      spinner.step();
      // All cells die -> immediate reseed -> at least 3 live cells
      const code = spinner.toCode();
      let bits = 0;
      for (let b = 0; b < 8; b++) {
        if (code & (1 << b)) bits++;
      }
      expect(bits).toBeGreaterThanOrEqual(3);
    });

    it('always produces valid braille characters over 100 steps', () => {
      const spinner = new BrailleSpinner();
      for (let i = 0; i < 100; i++) {
        const ch = spinner.toBraille();
        const cp = ch.codePointAt(0)!;
        expect(cp).toBeGreaterThanOrEqual(0x2800);
        expect(cp).toBeLessThanOrEqual(0x28ff);
        spinner.step();
      }
    });

    it('reseeds within 15 generations producing visual variety', () => {
      const spinner = new BrailleSpinner();
      const codes = new Set<number>();
      for (let i = 0; i < 30; i++) {
        codes.add(spinner.toCode());
        spinner.step();
      }
      // With reseeds at max 15 generations, expect multiple distinct states
      expect(codes.size).toBeGreaterThan(3);
    });
  });

  describe('reseed behavior', () => {
    it('reset() produces state with at least 3 live cells', () => {
      const spinner = new BrailleSpinner();
      for (let trial = 0; trial < 50; trial++) {
        spinner.reset();
        const code = spinner.toCode();
        let bits = 0;
        for (let b = 0; b < 8; b++) {
          if (code & (1 << b)) bits++;
        }
        expect(bits).toBeGreaterThanOrEqual(3);
      }
    });

    it('reset() produces ~40% density on average', () => {
      const spinner = new BrailleSpinner();
      let totalBits = 0;
      const trials = 200;
      for (let t = 0; t < trials; t++) {
        spinner.reset();
        const code = spinner.toCode();
        for (let b = 0; b < 8; b++) {
          if (code & (1 << b)) totalBits++;
        }
      }
      const avgDensity = totalBits / (trials * 8);
      // ~40% density with min-3 filter pushes it slightly higher
      expect(avgDensity).toBeGreaterThan(0.3);
      expect(avgDensity).toBeLessThan(0.6);
    });
  });

  describe('braille encoding', () => {
    it('single character output', () => {
      const spinner = new BrailleSpinner();
      expect(spinner.toBraille().length).toBe(1);
    });

    it('toCode() returns offset from BRAILLE_BASE', () => {
      const spinner = new BrailleSpinner();
      const code = spinner.toCode();
      const ch = spinner.toBraille();
      expect(ch.charCodeAt(0)).toBe(0x2800 + code);
    });
  });

  describe('public API compatibility', () => {
    it('exposes step(), toBraille(), toCode(), reset()', () => {
      const spinner = new BrailleSpinner();
      expect(typeof spinner.step).toBe('function');
      expect(typeof spinner.toBraille).toBe('function');
      expect(typeof spinner.toCode).toBe('function');
      expect(typeof spinner.reset).toBe('function');
    });
  });
});
```

### 7.2 Deterministic Verification

To confirm rule fidelity, the test for the initial state proves the automaton matches
Amp's rules. The alternating state `[T,F,T,F,T,F,T,F]` has a known, hand-computable
outcome under the Amp rules: every live cell has exactly 1 live neighbor (below the
survival threshold of 2), so all cells die. This triggers the `allDead` reseed path,
which is the same path Amp takes. The test verifies:
1. After one step, the state has been reseeded (>= 3 live cells)
2. The code is not 0 (not all-dead after reseed)

### 7.3 Integration Test for Timer

Verify in `packages/flitter-amp/src/__tests__/tool-header.test.ts`:
- The `setInterval` is called with 200ms (not 100ms)
- After 200ms, spinner has stepped once
- After 400ms, spinner has stepped twice
- After 100ms (half-interval), no extra step has occurred

### 7.4 Visual Regression Checklist

1. Launch the flitter-amp TUI and trigger a tool call
2. Observe the braille spinner next to the tool name
3. Verify: animation rate is ~5 fps (200ms), not 10 fps
4. Verify: braille characters appear lighter (fewer dots active on average)
5. Verify: pattern changes frequently (at least every 3 seconds)
6. Verify: no frozen/stuck patterns persist beyond ~15 frames
7. Compare with Amp CLI binary if available

---

## 8. Migration Considerations

### 8.1 No Breaking Changes

The change is fully backward-compatible at the API level. The only observable difference
is the visual output (different braille character sequences, different animation speed).
No code that depends on specific braille character values will break, because:
- `toBraille()` still returns a single braille character in U+2800-U+28FF
- `toCode()` still returns 0-255
- `step()` still advances one generation
- `reset()` still randomizes the state

### 8.2 Snapshot Test Impact

If any snapshot tests capture the exact braille character output, they will need updating.
Currently no such snapshot tests exist (gap #71 notes zero test coverage for
`braille-spinner.ts`).

### 8.3 Documentation Updates

The following files reference the old 100ms interval or old rules and should be updated
for consistency (non-blocking, informational only):

| File | Lines | Change Needed |
|------|-------|---------------|
| `packages/flitter-amp/.ref/amp-cli/TUI-CHATVIEW-SPEC.md` | 774-785 | Update section 10.1 to reflect 200ms and Amp rules |
| `packages/flitter-core/docs/widgets/display/collapsible-drawer.md` | Various | Clarify CollapsibleDrawer uses a separate frame array |
| `amp-src-analysis-44.md` | Various | Update BrailleSpinner description |

These documentation updates are informational and do not block the code change.

---

## 9. Implementation Checklist

- [ ] Replace `packages/flitter-core/src/utilities/braille-spinner.ts` with Amp-aligned version
  - [ ] Flat `boolean[8]` state with alternating initial value
  - [ ] Hardcoded `NEIGHBOR_MAP` (5 neighbors per cell)
  - [ ] Survival rule: `neighbors === 2 || neighbors === 3`
  - [ ] Birth rule: `neighbors === 3 || neighbors === 6`
  - [ ] Generation counter with `MAX_GENERATIONS = 15`
  - [ ] Single `previousState` for period-2 detection
  - [ ] Reseed: ~40% density, minimum 3 live cells
  - [ ] Braille encoding via permutation array `[0,1,2,6,3,4,5,7]`
  - [ ] Use `String.fromCharCode()` (not `fromCodePoint()`)
- [ ] Change timer interval in `tool-header.ts` from 100ms to 200ms
- [ ] Update JSDoc comments in `tool-header.ts` (100ms -> 200ms references)
- [ ] Create unit tests in `braille-spinner.test.ts`
- [ ] Run `bun test` and verify all tests pass
- [ ] Visual verification of spinner in TUI

---

## 10. Verification Against Amp Reference

The following table maps each element of Amp's `class Af` to the proposed implementation:

| Amp `Af` Element | Amp Code | Proposed Code | Match? |
|------------------|----------|---------------|--------|
| `state` init | `[!0,!1,!0,!1,!0,!1,!0,!1]` | `[true,false,true,false,true,false,true,false]` | Yes |
| `previousState` init | `[]` | `[]` | Yes |
| `generation` init | `0` | `0` | Yes |
| `maxGenerations` | `15` | `MAX_GENERATIONS = 15` | Yes |
| `neighborMap` | Hardcoded 8x5 | `NEIGHBOR_MAP` (identical values) | Yes |
| Survival rule | `B===2\|\|B===3` | `neighbors === 2 \|\| neighbors === 3` | Yes |
| Birth rule | `B===3\|\|B===6` | `neighbors === 3 \|\| neighbors === 6` | Yes |
| Static detection | `H.every((t,f)=>t===this.state[f])` | `next.every((v,i)=>v===this._state[i])` | Yes |
| Oscillation detection | `H.every((t,f)=>t===this.previousState[f])` | `next.every((v,i)=>v===this._previousState[i])` | Yes |
| All-dead check | `H.every(t=>!t)` | `next.every(v=>!v)` | Yes |
| Live count check | `H.filter(t=>t).length` + `D<2` | `next.filter(v=>v).length` + `liveCount<2` | Yes |
| Reseed density | `Math.random()>0.6` | `Math.random() > 0.6` | Yes |
| Reseed minimum | `t.filter(f=>f).length<3` loop | `state.filter(v=>v).length < 3` loop | Yes |
| Reseed gen reset | `this.generation=0` | `this._generation = 0` | Yes |
| Braille permutation | `[0,1,2,6,3,4,5,7]` | `BRAILLE_BIT_MAP = [0,1,2,6,3,4,5,7]` | Yes |
| Braille base | `10240` (0x2800) | `BRAILLE_BASE = 0x2800` | Yes |
| `String.fromCharCode` | Yes | Yes | Yes |
| Timer interval | 200ms (README 11.1) | 200ms | Yes |

All 17 elements match. The proposed implementation is a faithful reproduction of Amp's
`class Af` with TypeScript typing and descriptive constant names.
