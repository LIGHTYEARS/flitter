// Smoke tests for the 20 new example applications.
// Verifies that each example can be imported, widget trees can be constructed,
// and exports are correctly defined.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { WidgetsBinding, runApp, resetSchedulers } from '../../src/framework/binding';
import { FocusManager } from '../../src/input/focus';
import { StatefulWidget } from '../../src/framework/widget';

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
// Helper: test a static example (exports app + buildXxx)
// ---------------------------------------------------------------------------

function describeStaticExample(
  name: string,
  importPath: string,
  buildFnName: string,
) {
  describe(`${name} example`, () => {
    test('widget tree can be imported', async () => {
      const mod = await import(importPath);
      expect(mod.app).toBeDefined();
    });

    test(`${buildFnName} returns a widget`, async () => {
      const mod = await import(importPath);
      expect(typeof mod[buildFnName]).toBe('function');
      const tree = mod[buildFnName]();
      expect(tree).toBeDefined();
    });

    test('can be mounted via runApp without errors', async () => {
      const mod = await import(importPath);
      const binding = await runApp(mod.app);
      expect(binding).toBeDefined();
      expect(binding.isRunning).toBe(true);
      binding.stop();
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: test a StatefulWidget example (exports createXxxApp)
// ---------------------------------------------------------------------------

function describeStatefulExample(
  name: string,
  importPath: string,
  createFnName: string,
  appClassName: string,
) {
  describe(`${name} example`, () => {
    test(`${appClassName} can be constructed`, async () => {
      const mod = await import(importPath);
      expect(typeof mod[createFnName]).toBe('function');
      const app = mod[createFnName]();
      expect(app).toBeDefined();
    });

    test(`${appClassName} is a StatefulWidget`, async () => {
      const mod = await import(importPath);
      const app = mod[createFnName]();
      expect(app).toBeInstanceOf(StatefulWidget);
    });

    test(`${appClassName}.createState returns a State with build()`, async () => {
      const mod = await import(importPath);
      const app = mod[createFnName]();
      const state = app.createState();
      expect(state).toBeDefined();
      expect(typeof state.build).toBe('function');
    });
  });
}

// ---------------------------------------------------------------------------
// Static examples (10)
// ---------------------------------------------------------------------------

describeStaticExample('color-palette', '../color-palette', 'buildColorPalette');
describeStaticExample('text-styles', '../text-styles', 'buildTextStyles');
describeStaticExample('border-showcase', '../border-showcase', 'buildBorderShowcase');
describeStaticExample('alignment-demo', '../alignment-demo', 'buildAlignmentDemo');
describeStaticExample('nested-layout', '../nested-layout', 'buildNestedLayout');
describeStaticExample('stack-layers', '../stack-layers', 'buildStackLayers');
describeStaticExample('dashboard', '../dashboard', 'buildDashboard');
describeStaticExample('rich-text', '../rich-text', 'buildRichText');
describeStaticExample('file-browser', '../file-browser', 'buildFileBrowser');
describeStaticExample('notification-list', '../notification-list', 'buildNotificationList');
describeStaticExample('system-monitor', '../system-monitor', 'buildSystemMonitor');
describeStaticExample('kanban-board', '../kanban-board', 'buildKanbanBoard');
describeStaticExample('help-screen', '../help-screen', 'buildHelpScreen');

// ---------------------------------------------------------------------------
// StatefulWidget examples (7)
// ---------------------------------------------------------------------------

describeStatefulExample('progress-bar', '../progress-bar', 'createProgressBarApp', 'ProgressBarApp');
describeStatefulExample('menu-selector', '../menu-selector', 'createMenuSelectorApp', 'MenuSelectorApp');
describeStatefulExample('calculator', '../calculator', 'createCalculatorApp', 'CalculatorApp');
describeStatefulExample('clock', '../clock', 'createClockApp', 'ClockApp');
describeStatefulExample('tabs-demo', '../tabs-demo', 'createTabsDemoApp', 'TabsDemoApp');
describeStatefulExample('login-form', '../login-form', 'createLoginFormApp', 'LoginFormApp');
describeStatefulExample('spinner', '../spinner', 'createSpinnerApp', 'SpinnerApp');

// ---------------------------------------------------------------------------
// Data export tests
// ---------------------------------------------------------------------------

describe('example data exports', () => {
  test('menu-selector exports MENU_ITEMS array', async () => {
    const mod = await import('../menu-selector');
    expect(Array.isArray(mod.MENU_ITEMS)).toBe(true);
    expect(mod.MENU_ITEMS.length).toBeGreaterThan(0);
  });

  test('tabs-demo exports TABS array', async () => {
    const mod = await import('../tabs-demo');
    expect(Array.isArray(mod.TABS)).toBe(true);
    expect(mod.TABS.length).toBeGreaterThan(0);
  });

  test('notification-list exports NOTIFICATIONS array', async () => {
    const mod = await import('../notification-list');
    expect(Array.isArray(mod.NOTIFICATIONS)).toBe(true);
    expect(mod.NOTIFICATIONS.length).toBeGreaterThan(0);
  });

  test('spinner exports SPINNERS array', async () => {
    const mod = await import('../spinner');
    expect(Array.isArray(mod.SPINNERS)).toBe(true);
    expect(mod.SPINNERS.length).toBeGreaterThan(0);
  });

  test('system-monitor exports PROCESSES array', async () => {
    const mod = await import('../system-monitor');
    expect(Array.isArray(mod.PROCESSES)).toBe(true);
    expect(mod.PROCESSES.length).toBeGreaterThan(0);
  });

  test('kanban-board exports BOARD data', async () => {
    const mod = await import('../kanban-board');
    expect(mod.BOARD).toBeDefined();
  });

  test('help-screen exports HELP_SECTIONS array', async () => {
    const mod = await import('../help-screen');
    expect(Array.isArray(mod.HELP_SECTIONS)).toBe(true);
    expect(mod.HELP_SECTIONS.length).toBeGreaterThan(0);
  });
});
