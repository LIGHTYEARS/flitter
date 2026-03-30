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
