/**
 * BrailleSpinner — cellular automaton mapped to braille Unicode characters.
 *
 * 逆向: amp-cli-reversed/modules/0526_unknown_xa.js — full xa class
 * 逆向: amp-cli-reversed/chunk-006.js:6121 — Y1T._spinner, _startAnimation (200ms)
 * 逆向: amp-cli-reversed/chunk-006.js:6178 — this._spinner.toBraille() in activity group
 * 逆向: amp-cli-reversed/chunk-004.js:21004 — t.toBraille() for in-progress tool status
 *
 * An 8-cell grid evolves via cellular automaton rules each step().
 * The state maps to braille characters (U+2800–U+28FF) via toBraille().
 * On stagnation (static, oscillating, all dead, <2 live, or maxGenerations),
 * the automaton re-seeds with a random state having ≥3 live cells.
 */
export class BrailleSpinner {
  // 逆向: xa.state = [!0, !1, !0, !1, !0, !1, !0, !1]
  state: boolean[] = [true, false, true, false, true, false, true, false];

  // 逆向: xa.previousState = []
  previousState: boolean[] = [];

  // 逆向: xa.generation = 0
  generation = 0;

  // 逆向: xa.maxGenerations = 15
  maxGenerations = 15;

  // 逆向: xa.neighborMap — exact adjacency from amp's xa class
  neighborMap: number[][] = [
    [1, 3, 4, 5, 7],
    [0, 2, 4, 5, 6],
    [1, 3, 5, 6, 7],
    [0, 2, 4, 6, 7],
    [0, 1, 3, 5, 7],
    [0, 1, 2, 4, 6],
    [1, 2, 3, 5, 7],
    [0, 2, 3, 4, 6],
  ];

  /**
   * Advance the automaton one generation.
   *
   * 逆向: xa.step()
   *
   * Rules:
   * - Live cell survives if exactly 2 or 3 neighbors are live
   * - Dead cell is born if exactly 3 or 6 neighbors are live
   *
   * Stagnation detection triggers re-seed:
   * - Static (new state === current state)
   * - Oscillating (new state === previous state)
   * - All cells dead
   * - Fewer than 2 live cells
   * - generation >= maxGenerations
   */
  step(): void {
    // 逆向: let T = this.state.map((r, h) => { ... })
    const newState = this.state.map((alive, idx) => {
      const liveNeighbors = this.neighborMap[idx].filter((n) => this.state[n]).length;
      if (alive) return liveNeighbors === 2 || liveNeighbors === 3;
      return liveNeighbors === 3 || liveNeighbors === 6;
    });

    // 逆向: R = T.every((r, h) => r === this.state[h])
    const isStatic = newState.every((v, i) => v === this.state[i]);

    // 逆向: a = this.previousState.length > 0 && T.every((r, h) => r === this.previousState[h])
    const isOscillating =
      this.previousState.length > 0 && newState.every((v, i) => v === this.previousState[i]);

    // 逆向: this.previousState = [...this.state], this.state = T, this.generation++
    this.previousState = [...this.state];
    this.state = newState;
    this.generation++;

    // 逆向: e = T.every(r => !r), t = T.filter(r => r).length
    const allDead = newState.every((v) => !v);
    const liveCount = newState.filter((v) => v).length;

    // 逆向: if (R || a || this.generation >= this.maxGenerations || e || t < 2) { re-seed }
    if (
      isStatic ||
      isOscillating ||
      this.generation >= this.maxGenerations ||
      allDead ||
      liveCount < 2
    ) {
      // 逆向: do r = Array.from({length: 8}, () => Math.random() > 0.6); while (r.filter(h => h).length < 3)
      let seed: boolean[];
      do {
        seed = Array.from({ length: 8 }, () => Math.random() > 0.6);
      } while (seed.filter((v) => v).length < 3);

      this.state = seed;
      this.previousState = [];
      this.generation = 0;
    }
  }

  /**
   * Convert current state to a braille Unicode character.
   *
   * 逆向: xa.toBraille()
   *
   * Braille dot mapping: [0,1,2,6,3,4,5,7]
   * Base codepoint: 0x2800 (10240)
   * Each live cell sets the corresponding bit.
   */
  toBraille(): string {
    // 逆向: let T = [0, 1, 2, 6, 3, 4, 5, 7], R = 10240
    const dotMap = [0, 1, 2, 6, 3, 4, 5, 7];
    let codePoint = 0x2800;

    // 逆向: for (let a = 0; a < 8; a++) if (this.state[a]) R |= 1 << T[a]
    for (let i = 0; i < 8; i++) {
      if (this.state[i]) {
        codePoint |= 1 << dotMap[i];
      }
    }

    return String.fromCharCode(codePoint);
  }
}
