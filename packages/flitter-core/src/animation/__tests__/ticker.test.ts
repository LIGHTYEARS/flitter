// Tests for Ticker — frame-synchronized timer
// Gap #65: Animation Framework

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Ticker } from '../ticker';
import { FrameScheduler } from '../../scheduler/frame-scheduler';

describe('Ticker', () => {
  beforeEach(() => {
    FrameScheduler.reset();
    FrameScheduler.instance.disableFramePacing();
  });

  afterEach(() => {
    FrameScheduler.reset();
  });

  test('isActive is false before start', () => {
    const ticker = new Ticker(() => {});
    expect(ticker.isActive).toBe(false);
    ticker.dispose();
  });

  test('isActive is true after start', () => {
    const ticker = new Ticker(() => {});
    ticker.start();
    expect(ticker.isActive).toBe(true);
    ticker.dispose();
  });

  test('isActive is false after stop', () => {
    const ticker = new Ticker(() => {});
    ticker.start();
    ticker.stop();
    expect(ticker.isActive).toBe(false);
    ticker.dispose();
  });

  test('isActive is false after dispose', () => {
    const ticker = new Ticker(() => {});
    ticker.start();
    ticker.dispose();
    expect(ticker.isActive).toBe(false);
  });

  test('dispose prevents restart', () => {
    const ticker = new Ticker(() => {});
    ticker.dispose();
    expect(() => ticker.start()).toThrow('Cannot start a disposed Ticker');
  });

  test('start is idempotent', () => {
    const ticker = new Ticker(() => {});
    ticker.start();
    ticker.start(); // should not throw or create duplicate
    expect(ticker.isActive).toBe(true);
    ticker.dispose();
  });

  test('stop is idempotent', () => {
    const ticker = new Ticker(() => {});
    ticker.stop(); // should not throw when not active
    ticker.start();
    ticker.stop();
    ticker.stop(); // should not throw
    expect(ticker.isActive).toBe(false);
    ticker.dispose();
  });

  test('registers BUILD phase callback with FrameScheduler', () => {
    const beforeCount = FrameScheduler.instance.frameCallbackCount;
    const ticker = new Ticker(() => {});
    ticker.start();
    expect(FrameScheduler.instance.frameCallbackCount).toBe(beforeCount + 1);
    ticker.dispose();
    expect(FrameScheduler.instance.frameCallbackCount).toBe(beforeCount);
  });

  test('callback receives elapsed time', (done) => {
    let receivedElapsed = -1;
    const ticker = new Ticker((elapsed) => {
      receivedElapsed = elapsed;
      ticker.stop();
      expect(receivedElapsed).toBeGreaterThanOrEqual(0);
      ticker.dispose();
      done();
    });
    ticker.start();
  });

  test('callback fires on each frame when active', (done) => {
    let callCount = 0;
    const ticker = new Ticker(() => {
      callCount++;
      if (callCount >= 3) {
        ticker.stop();
        expect(callCount).toBeGreaterThanOrEqual(3);
        ticker.dispose();
        done();
      }
    });
    ticker.start();
  });
});
