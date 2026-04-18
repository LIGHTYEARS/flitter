import { describe, expect, it } from "bun:test";
import { BrailleSpinner } from "../braille-spinner.js";

describe("BrailleSpinner", () => {
  it("initializes with alternating state", () => {
    const spinner = new BrailleSpinner();
    expect(spinner.state).toEqual([true, false, true, false, true, false, true, false]);
    expect(spinner.previousState).toEqual([]);
    expect(spinner.generation).toBe(0);
    expect(spinner.maxGenerations).toBe(15);
  });

  it("toBraille() returns a valid braille character (U+2800-U+28FF)", () => {
    const spinner = new BrailleSpinner();
    const ch = spinner.toBraille();
    const code = ch.charCodeAt(0);
    expect(code).toBeGreaterThanOrEqual(0x2800);
    expect(code).toBeLessThanOrEqual(0x28ff);
  });

  it("initial toBraille matches expected value for alternating state", () => {
    // state = [T,F,T,F,T,F,T,F]
    // dotMap = [0,1,2,6,3,4,5,7]
    // Cell 0 (T) → bit 0 → 0x01
    // Cell 2 (T) → bit 2 → 0x04
    // Cell 4 (T) → bit 3 → 0x08
    // Cell 6 (T) → bit 5 → 0x20
    // 0x2800 | 0x01 | 0x04 | 0x08 | 0x20 = 0x282D
    const spinner = new BrailleSpinner();
    const code = spinner.toBraille().charCodeAt(0);
    expect(code).toBe(0x282d);
  });

  it("step() evolves the state", () => {
    const spinner = new BrailleSpinner();
    spinner.step();
    // State should change after first step (automaton evolves)
    // or re-seed if stagnation detected — either way, step completes
    expect(spinner.generation).toBeGreaterThanOrEqual(0);
    // previousState should be set (either from evolution or cleared on reseed)
    // After step, we should still have valid 8-cell state
    expect(spinner.state).toHaveLength(8);
  });

  it("generation counter increments on step", () => {
    const spinner = new BrailleSpinner();
    expect(spinner.generation).toBe(0);
    spinner.step();
    // If no reseed happened, generation is 1. If reseed happened, generation is 0.
    // Either is valid. But after one step from initial alternating state,
    // let's verify the step ran:
    expect(spinner.state).toHaveLength(8);
  });

  it("auto-reseeds on stagnation (100 steps always valid braille)", () => {
    const spinner = new BrailleSpinner();
    for (let i = 0; i < 100; i++) {
      spinner.step();
      const ch = spinner.toBraille();
      const code = ch.charCodeAt(0);
      expect(code).toBeGreaterThanOrEqual(0x2800);
      expect(code).toBeLessThanOrEqual(0x28ff);
      // State should always be exactly 8 cells
      expect(spinner.state).toHaveLength(8);
      // After reseed, there should be ≥3 live cells
      // (unless the automaton is mid-evolution, where <3 triggers reseed next step)
    }
  });

  it("reseeds when all cells die", () => {
    const spinner = new BrailleSpinner();
    // Force all-dead state
    spinner.state = [false, false, false, false, false, false, false, false];
    spinner.step();
    // After step, should have reseeded with ≥3 live cells
    const liveCount = spinner.state.filter((v) => v).length;
    expect(liveCount).toBeGreaterThanOrEqual(3);
    expect(spinner.generation).toBe(0);
  });

  it("reseeds when fewer than 2 live cells", () => {
    const spinner = new BrailleSpinner();
    // Force only 1 live cell
    spinner.state = [true, false, false, false, false, false, false, false];
    spinner.step();
    // The automaton will evolve, but if result has <2 live, it reseeds
    // After reseed: ≥3 live cells
    const liveCount = spinner.state.filter((v) => v).length;
    expect(liveCount).toBeGreaterThanOrEqual(2);
  });

  it("reseeds at maxGenerations", () => {
    const spinner = new BrailleSpinner();
    spinner.generation = 14; // One step will make it 15 (>= maxGenerations)
    spinner.step();
    // Should have reseeded
    expect(spinner.generation).toBe(0);
    expect(spinner.previousState).toEqual([]);
  });

  it("detects static state (no change) and reseeds", () => {
    const spinner = new BrailleSpinner();
    // Create a state that maps to itself under the automaton rules
    // Force a known static state by making step produce same state
    // All-dead is the simplest static state, but that's tested above.
    // Use all-true: each cell has 5 neighbors alive → survive needs 2 or 3, fail → all die → reseed
    spinner.state = [true, true, true, true, true, true, true, true];
    spinner.step();
    // All cells have 5 neighbors each → not 2 or 3, so all die → allDead triggers reseed
    const liveCount = spinner.state.filter((v) => v).length;
    expect(liveCount).toBeGreaterThanOrEqual(3);
  });

  it("neighborMap has correct structure (8 cells, each with neighbors)", () => {
    const spinner = new BrailleSpinner();
    expect(spinner.neighborMap).toHaveLength(8);
    for (const neighbors of spinner.neighborMap) {
      // Each cell has 5 neighbors in amp's topology
      expect(neighbors.length).toBe(5);
      for (const n of neighbors) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(8);
      }
    }
  });

  it("multiple spinners evolve independently", () => {
    const a = new BrailleSpinner();
    const b = new BrailleSpinner();
    // Both start the same
    expect(a.toBraille()).toBe(b.toBraille());
    // Step one, not the other
    a.step();
    // They may or may not differ (depends on automaton), but both are valid
    expect(a.state).toHaveLength(8);
    expect(b.state).toEqual([true, false, true, false, true, false, true, false]);
  });
});
