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
