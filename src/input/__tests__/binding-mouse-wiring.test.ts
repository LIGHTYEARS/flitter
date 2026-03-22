// Tests for WidgetsBinding + MouseManager wiring
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding } from '../../framework/binding';
import { MouseManager } from '../../input/mouse-manager';

describe('WidgetsBinding MouseManager wiring', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
    MouseManager.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
    MouseManager.reset();
  });

  test('WidgetsBinding.instance has mouseManager set to MouseManager.instance', () => {
    const binding = WidgetsBinding.instance;
    expect(binding.mouseManager).toBe(MouseManager.instance);
  });

  test('mouseManager is a MouseManager instance', () => {
    const binding = WidgetsBinding.instance;
    expect(binding.mouseManager).toBeInstanceOf(MouseManager);
  });

  test('reset clears mouseManager', () => {
    const binding = WidgetsBinding.instance;
    expect(binding.mouseManager).not.toBeNull();
    WidgetsBinding.reset();
    // After reset, old binding is gone; new one gets fresh MouseManager
    const newBinding = WidgetsBinding.instance;
    expect(newBinding.mouseManager).toBe(MouseManager.instance);
  });

  test('mouseManager position tracking works through binding', () => {
    const binding = WidgetsBinding.instance;
    binding.mouseManager!.updatePosition(10, 20);
    expect(binding.mouseManager!.lastPosition).toEqual({ x: 10, y: 20 });
  });

  test('mouseManager cursor defaults to "default" through binding', () => {
    const binding = WidgetsBinding.instance;
    expect(binding.mouseManager!.currentCursor).toBe('default');
  });
});
