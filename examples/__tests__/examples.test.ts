// Smoke tests for example applications.
// Verifies that each example can be imported, widget trees can be constructed,
// and runApp can be called without errors in test mode.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding, resetSchedulers } from '../../src/framework/binding';
import { FocusManager } from '../../src/input/focus';
import { Widget } from '../../src/framework/widget';
import { Text } from '../../src/widgets/text';
import { Center } from '../../src/widgets/center';
import { Column, Row } from '../../src/widgets/flex';
import { Expanded } from '../../src/widgets/flexible';
import { SingleChildScrollView } from '../../src/widgets/scroll-view';

// ---------------------------------------------------------------------------
// Cleanup between tests — reset singleton state
// ---------------------------------------------------------------------------

beforeEach(() => {
  WidgetsBinding.reset();
  FocusManager.reset();
});

afterEach(() => {
  WidgetsBinding.reset();
  FocusManager.reset();
});

// ---------------------------------------------------------------------------
// hello-world.ts
// ---------------------------------------------------------------------------

describe('hello-world example', () => {
  test('widget tree can be constructed and imported', async () => {
    // Dynamic import so BUN_TEST env prevents runApp from executing
    const mod = await import('../hello-world');
    expect(mod.app).toBeDefined();
    expect(mod.app).toBeInstanceOf(Center);
  });

  test('root is Center with Text child', async () => {
    const mod = await import('../hello-world');
    const center = mod.app as Center;
    // Center wraps a child widget — verify it exists
    expect(center).toBeDefined();
    // The child property on Center is set via opts.child
    expect((center as any).child).toBeInstanceOf(Text);
  });

  test('can be mounted via runApp without errors', async () => {
    const { runApp } = await import('../../src/framework/binding');
    const mod = await import('../hello-world');
    const binding = runApp(mod.app);
    expect(binding).toBeDefined();
    expect(binding.isRunning).toBe(true);
    binding.stop();
  });
});

// ---------------------------------------------------------------------------
// counter.ts
// ---------------------------------------------------------------------------

describe('counter example', () => {
  test('CounterApp can be constructed', async () => {
    const mod = await import('../counter');
    const app = mod.createCounterApp();
    expect(app).toBeDefined();
  });

  test('CounterApp is a StatefulWidget', async () => {
    const { StatefulWidget } = await import('../../src/framework/widget');
    const mod = await import('../counter');
    const app = mod.createCounterApp();
    expect(app).toBeInstanceOf(StatefulWidget);
  });

  test('CounterApp.createState returns a State', async () => {
    const mod = await import('../counter');
    const app = mod.createCounterApp();
    const state = app.createState();
    expect(state).toBeDefined();
    expect(typeof state.build).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// flex-layout.ts
// ---------------------------------------------------------------------------

describe('flex-layout example', () => {
  test('widget tree can be constructed and imported', async () => {
    const mod = await import('../flex-layout');
    expect(mod.app).toBeDefined();
  });

  test('buildFlexLayout returns a widget', async () => {
    const mod = await import('../flex-layout');
    const tree = mod.buildFlexLayout();
    expect(tree).toBeDefined();
  });

  test('can be mounted via runApp without errors', async () => {
    const { runApp } = await import('../../src/framework/binding');
    const mod = await import('../flex-layout');
    const binding = runApp(mod.app);
    expect(binding).toBeDefined();
    expect(binding.isRunning).toBe(true);
    binding.stop();
  });
});

// ---------------------------------------------------------------------------
// scroll-demo.ts
// ---------------------------------------------------------------------------

describe('scroll-demo example', () => {
  test('widget tree can be constructed and imported', async () => {
    const mod = await import('../scroll-demo');
    expect(mod.app).toBeDefined();
  });

  test('buildScrollDemo returns a widget', async () => {
    const mod = await import('../scroll-demo');
    const tree = mod.buildScrollDemo();
    expect(tree).toBeDefined();
  });

  test('can be mounted via runApp without errors', async () => {
    const { runApp } = await import('../../src/framework/binding');
    const mod = await import('../scroll-demo');
    const binding = runApp(mod.app);
    expect(binding).toBeDefined();
    expect(binding.isRunning).toBe(true);
    binding.stop();
  });
});
