// Tests for MINR-01 (JetBrains wheel filter) and MINR-05 (scrollStep)
import { describe, test, expect, beforeEach } from 'bun:test';
import { TerminalManager } from '../terminal-manager';
import { MockPlatform } from '../platform';

describe('MINR-01: JetBrains Wheel Filter', () => {
  let platform: MockPlatform;
  let manager: TerminalManager;

  beforeEach(() => {
    platform = new MockPlatform();
    manager = new TerminalManager(platform);
  });

  test('jetBrainsWheelFilter defaults to false in non-JetBrains terminal', () => {
    // In the test environment, TERMINAL_EMULATOR and TERM_PROGRAM are typically not set
    // to JetBrains values, so filter should be off by default
    const env = process.env;
    const isJetBrains =
      env.TERMINAL_EMULATOR?.includes('JetBrains') ||
      env.TERM_PROGRAM === 'JetBrains-JediTerm';

    if (!isJetBrains) {
      expect(manager.jetBrainsWheelFilter).toBe(false);
    }
  });

  test('jetBrainsWheelFilter is settable', () => {
    manager.jetBrainsWheelFilter = true;
    expect(manager.jetBrainsWheelFilter).toBe(true);
    manager.jetBrainsWheelFilter = false;
    expect(manager.jetBrainsWheelFilter).toBe(false);
  });

  test('filterWheelEvent returns true when filter is disabled', () => {
    manager.jetBrainsWheelFilter = false;
    expect(manager.filterWheelEvent(64)).toBe(true);
    expect(manager.filterWheelEvent(64)).toBe(true);
    expect(manager.filterWheelEvent(65)).toBe(true);
  });

  test('filterWheelEvent allows first event when filter is enabled', () => {
    manager.jetBrainsWheelFilter = true;
    // First event should always pass (enough time has elapsed since epoch 0)
    expect(manager.filterWheelEvent(64)).toBe(true);
  });

  test('filterWheelEvent debounces rapid events when filter is enabled', () => {
    manager.jetBrainsWheelFilter = true;

    // First event passes
    const first = manager.filterWheelEvent(64);
    expect(first).toBe(true);

    // Immediate second event should be filtered (within 50ms)
    const second = manager.filterWheelEvent(64);
    expect(second).toBe(false);

    // Third immediate event also filtered
    const third = manager.filterWheelEvent(65);
    expect(third).toBe(false);
  });

  test('filterWheelEvent allows events after debounce window', async () => {
    manager.jetBrainsWheelFilter = true;

    // First event passes
    expect(manager.filterWheelEvent(64)).toBe(true);

    // Wait longer than the debounce window (50ms)
    await new Promise((resolve) => setTimeout(resolve, 60));

    // This should pass now
    expect(manager.filterWheelEvent(64)).toBe(true);
  });
});

describe('MINR-05: scrollStep', () => {
  let platform: MockPlatform;
  let manager: TerminalManager;

  beforeEach(() => {
    platform = new MockPlatform();
    manager = new TerminalManager(platform);
  });

  test('scrollStep defaults to 3', () => {
    expect(manager.scrollStep).toBe(3);
  });

  test('setScrollStep changes the value', () => {
    manager.setScrollStep(5);
    expect(manager.scrollStep).toBe(5);
  });

  test('setScrollStep clamps to minimum of 1', () => {
    manager.setScrollStep(0);
    expect(manager.scrollStep).toBe(1);

    manager.setScrollStep(-5);
    expect(manager.scrollStep).toBe(1);
  });

  test('setScrollStep clamps to maximum of 20', () => {
    manager.setScrollStep(25);
    expect(manager.scrollStep).toBe(20);

    manager.setScrollStep(100);
    expect(manager.scrollStep).toBe(20);
  });

  test('setScrollStep rounds fractional values', () => {
    manager.setScrollStep(3.7);
    expect(manager.scrollStep).toBe(4);

    manager.setScrollStep(2.3);
    expect(manager.scrollStep).toBe(2);
  });

  test('setScrollStep accepts boundary values', () => {
    manager.setScrollStep(1);
    expect(manager.scrollStep).toBe(1);

    manager.setScrollStep(20);
    expect(manager.scrollStep).toBe(20);
  });
});
