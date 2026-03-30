// Tests for Curves — easing curve library
// Gap #65: Animation Framework

import { describe, test, expect } from 'bun:test';
import { Curves, Interval } from '../curves';

describe('Curves', () => {
  test('linear: transform(t) === t for all t in [0, 1]', () => {
    expect(Curves.linear.transform(0)).toBe(0);
    expect(Curves.linear.transform(0.5)).toBe(0.5);
    expect(Curves.linear.transform(1)).toBe(1);
  });

  test('all curves return 0 at t=0', () => {
    for (const curve of Object.values(Curves)) {
      expect(curve.transform(0)).toBe(0);
    }
  });

  test('all curves return 1 at t=1', () => {
    for (const curve of Object.values(Curves)) {
      expect(curve.transform(1)).toBeCloseTo(1, 10);
    }
  });

  test('easeIn: starts slow (transform(0.25) < 0.25)', () => {
    expect(Curves.easeIn.transform(0.25)).toBeLessThan(0.25);
  });

  test('easeOut: starts fast (transform(0.25) > 0.25)', () => {
    expect(Curves.easeOut.transform(0.25)).toBeGreaterThan(0.25);
  });

  test('easeInOut: symmetric around 0.5', () => {
    const a = Curves.easeInOut.transform(0.25);
    const b = Curves.easeInOut.transform(0.75);
    expect(a + b).toBeCloseTo(1, 5);
  });

  test('decelerate: starts fast (transform(0.25) > 0.25)', () => {
    expect(Curves.decelerate.transform(0.25)).toBeGreaterThan(0.25);
  });

  test('all curves are monotonically increasing', () => {
    for (const curve of Object.values(Curves)) {
      let prev = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const v = curve.transform(t);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-10);
        prev = v;
      }
    }
  });

  test('Interval restricts curve to sub-range', () => {
    const interval = new Interval(0.25, 0.75);
    expect(interval.transform(0)).toBe(0);
    expect(interval.transform(0.25)).toBe(0);
    expect(interval.transform(0.5)).toBeCloseTo(0.5);
    expect(interval.transform(0.75)).toBe(1);
    expect(interval.transform(1)).toBe(1);
  });

  test('Interval with custom curve', () => {
    const interval = new Interval(0, 1, Curves.easeIn);
    // easeIn at 0.5 should be < 0.5 (since it starts slow)
    expect(interval.transform(0.5)).toBeLessThan(0.5);
    expect(interval.transform(0)).toBe(0);
    expect(interval.transform(1)).toBeCloseTo(1, 10);
  });

  test('flipped curve reverses the easing', () => {
    const flipped = Curves.easeIn.flipped;
    // flipped easeIn should behave like easeOut: starts fast
    expect(flipped.transform(0.25)).toBeGreaterThan(0.25);
    expect(flipped.transform(0)).toBe(0);
    expect(flipped.transform(1)).toBeCloseTo(1, 10);
  });

  test('double-flipping returns to original behavior', () => {
    const original = Curves.easeIn;
    const doubleFlipped = original.flipped.flipped;
    for (let t = 0; t <= 1; t += 0.1) {
      expect(doubleFlipped.transform(t)).toBeCloseTo(original.transform(t), 10);
    }
  });
});
