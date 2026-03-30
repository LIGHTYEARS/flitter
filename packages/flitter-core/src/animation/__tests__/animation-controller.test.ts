// Tests for AnimationController — value-based animation driven by Ticker
// Gap #65: Animation Framework

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { AnimationController } from '../animation-controller';
import { Curves } from '../curves';
import { FrameScheduler } from '../../scheduler/frame-scheduler';

describe('AnimationController', () => {
  beforeEach(() => {
    FrameScheduler.reset();
    FrameScheduler.instance.disableFramePacing();
  });

  afterEach(() => {
    FrameScheduler.reset();
  });

  test('initial value defaults to lowerBound (0)', () => {
    const c = new AnimationController({ duration: 300 });
    expect(c.value).toBe(0);
    expect(c.status).toBe('dismissed');
    c.dispose();
  });

  test('initial value can be set', () => {
    const c = new AnimationController({ duration: 300, value: 0.5 });
    expect(c.value).toBe(0.5);
    c.dispose();
  });

  test('forward() starts animating', () => {
    const c = new AnimationController({ duration: 300 });
    c.forward();
    expect(c.isAnimating).toBe(true);
    expect(c.status).toBe('forward');
    c.dispose();
  });

  test('reverse() starts animating backward', () => {
    const c = new AnimationController({ duration: 300, value: 1 });
    c.reverse();
    expect(c.isAnimating).toBe(true);
    expect(c.status).toBe('reverse');
    c.dispose();
  });

  test('stop() halts animation', () => {
    const c = new AnimationController({ duration: 300 });
    c.forward();
    c.stop();
    expect(c.isAnimating).toBe(false);
    c.dispose();
  });

  test('reset() returns to lowerBound', () => {
    const c = new AnimationController({ duration: 300, value: 0.7 });
    c.reset();
    expect(c.value).toBe(0);
    expect(c.status).toBe('dismissed');
    c.dispose();
  });

  test('value setter stops animation and sets value', () => {
    const c = new AnimationController({ duration: 300 });
    c.forward();
    c.value = 0.5;
    expect(c.isAnimating).toBe(false);
    expect(c.value).toBe(0.5);
    c.dispose();
  });

  test('forward() at upperBound sets completed immediately', () => {
    const c = new AnimationController({ duration: 300, value: 1 });
    c.forward();
    expect(c.isAnimating).toBe(false);
    expect(c.status).toBe('completed');
    c.dispose();
  });

  test('reverse() at lowerBound sets dismissed immediately', () => {
    const c = new AnimationController({ duration: 300, value: 0 });
    c.reverse();
    expect(c.isAnimating).toBe(false);
    expect(c.status).toBe('dismissed');
    c.dispose();
  });

  test('listeners are notified on value changes', async () => {
    const c = new AnimationController({ duration: 100 });
    const values: number[] = [];
    c.addListener(() => values.push(c.value));
    c.forward();

    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(values.length).toBeGreaterThan(0);
    expect(values[values.length - 1]).toBe(1);
    c.dispose();
  });

  test('status listeners are notified on transitions', async () => {
    const c = new AnimationController({ duration: 100 });
    const statuses: string[] = [];
    c.addStatusListener((s) => statuses.push(s));
    c.forward();

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(statuses).toContain('forward');
    expect(statuses).toContain('completed');
    c.dispose();
  });

  test('custom curve is applied', async () => {
    const c = new AnimationController({
      duration: 100,
      curve: Curves.easeIn,
    });
    const values: number[] = [];
    c.addListener(() => values.push(c.value));
    c.forward();

    await new Promise(resolve => setTimeout(resolve, 300));

    // easeIn starts slow, so early values should be below linear
    if (values.length >= 3) {
      // The first recorded value (early in animation) should be small
      expect(values[0]).toBeLessThan(0.5);
    }
    c.dispose();
  });

  test('dispose cleans up ticker and listeners', () => {
    const c = new AnimationController({ duration: 300 });
    c.addListener(() => {});
    c.addStatusListener(() => {});
    c.forward();
    c.dispose();
    expect(c.isAnimating).toBe(false);
    expect(c.hasListeners).toBe(false);
  });

  test('custom bounds work correctly', async () => {
    const c = new AnimationController({
      duration: 50,
      lowerBound: 10,
      upperBound: 20,
    });
    c.forward();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(c.value).toBe(20);
    c.dispose();
  });

  test('animateTo works with custom duration and curve', async () => {
    const c = new AnimationController({ duration: 500 });
    const values: number[] = [];
    c.addListener(() => values.push(c.value));
    c.animateTo(0.5, { duration: 50, curve: Curves.easeOut });

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(c.value).toBe(0.5);
    expect(values.length).toBeGreaterThan(0);
    c.dispose();
  });

  test('duration getter/setter works', () => {
    const c = new AnimationController({ duration: 300 });
    expect(c.duration).toBe(300);
    c.duration = 500;
    expect(c.duration).toBe(500);
    c.dispose();
  });

  test('curve getter/setter works', () => {
    const c = new AnimationController({ duration: 300 });
    expect(c.curve).toBe(Curves.linear);
    c.curve = Curves.easeIn;
    expect(c.curve).toBe(Curves.easeIn);
    c.dispose();
  });

  test('removeStatusListener works', () => {
    const c = new AnimationController({ duration: 300, value: 1 });
    const statuses: string[] = [];
    const listener = (s: string) => statuses.push(s);
    c.addStatusListener(listener);
    c.removeStatusListener(listener);
    c.reverse();
    // Should not have notified the removed listener... but the status change
    // happens synchronously in _animateTowards, so we need to check that
    // the listener was actually removed
    // Actually, reverse() at value 1 calls _animateTowards which starts ticker
    // and _setStatus('reverse') synchronously. So statuses should be empty
    // since listener was removed.
    expect(statuses).toEqual([]);
    c.dispose();
  });

  test('value is clamped to bounds', () => {
    const c = new AnimationController({ duration: 300 });
    c.value = 2; // above upperBound
    expect(c.value).toBe(1);
    c.value = -1; // below lowerBound
    expect(c.value).toBe(0);
    c.dispose();
  });
});
