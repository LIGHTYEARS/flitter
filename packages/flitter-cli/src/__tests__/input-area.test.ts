// Tests for InputArea — construction, shell mode detection, submit behavior,
// height computation, and controller lifecycle.
//
// Phase 16 Plan 04 — Test File 1.
// Tests verify both state mutations and widget tree structure per AGENTS.md rules.

import { describe, test, expect } from 'bun:test';
import type { BuildContext, Widget } from '../../../flitter-core/src/framework/widget';
import { TextEditingController } from '../../../flitter-core/src/widgets/text-field';
import { Stack, Positioned } from '../../../flitter-core/src/widgets/stack';
import { Container } from '../../../flitter-core/src/widgets/container';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import { InputArea, detectShellMode, parseShellCommand, MIN_HEIGHT } from '../widgets/input-area';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Stub BuildContext for direct build() calls. */
const stubContext: BuildContext = { widget: null!, mounted: true } as unknown as BuildContext;

/**
 * Build an InputArea and return the state + widget tree.
 * Wires state._widget manually (normally done by framework).
 */
function buildInputArea(props: {
  onSubmit?: (text: string) => void;
  isProcessing?: boolean;
  mode?: string | null;
  controller?: TextEditingController;
  maxExpandLines?: number;
}): { state: any; tree: Widget } {
  const inputArea = new InputArea({
    onSubmit: props.onSubmit ?? (() => {}),
    isProcessing: props.isProcessing ?? false,
    mode: props.mode ?? null,
    controller: props.controller,
    maxExpandLines: props.maxExpandLines,
  });
  const state = inputArea.createState();
  (state as any)._widget = inputArea;
  (state as any)._mounted = true;
  state.initState();
  const tree = state.build(stubContext);
  return { state, tree };
}

/**
 * Find all widgets of a given type in a widget tree (recursive BFS).
 */
function findAll<T extends Widget>(root: Widget, type: new (...args: any[]) => T): T[] {
  const results: T[] = [];
  const queue: Widget[] = [root];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current instanceof type) results.push(current as T);
    if ('children' in current && Array.isArray((current as any).children)) queue.push(...(current as any).children);
    if ('child' in current && (current as any).child) queue.push((current as any).child);
  }
  return results;
}

// ===========================================================================
// Group 1: InputArea Construction
// ===========================================================================

describe('InputArea — Construction', () => {

  test('creates with required props (onSubmit, isProcessing, mode)', () => {
    const onSubmit = (_text: string) => {};
    const inputArea = new InputArea({ onSubmit, isProcessing: false, mode: null });
    expect(inputArea.onSubmit).toBe(onSubmit);
    expect(inputArea.isProcessing).toBe(false);
    expect(inputArea.mode).toBeNull();
  });

  test('creates with optional controller (external controller used)', () => {
    const ctrl = new TextEditingController();
    const inputArea = new InputArea({
      onSubmit: () => {},
      isProcessing: false,
      mode: null,
      controller: ctrl,
    });
    expect(inputArea.externalController).toBe(ctrl);
  });

  test('creates with default controller when none provided (ownsController = true)', () => {
    const { state } = buildInputArea({});
    // ownsController is private — verify via the fact that controller exists and is not null
    expect((state as any).controller).toBeDefined();
    expect((state as any).ownsController).toBe(true);
  });

  test('default maxExpandLines is 10', () => {
    const inputArea = new InputArea({ onSubmit: () => {}, isProcessing: false, mode: null });
    expect(inputArea.maxExpandLines).toBe(10);
  });
});

// ===========================================================================
// Group 2: Shell Mode Detection
// ===========================================================================

describe('InputArea — Shell Mode Detection', () => {

  test('detectShellMode returns null for regular text', () => {
    expect(detectShellMode('hello world')).toBeNull();
  });

  test('detectShellMode returns "shell" for $ prefix', () => {
    expect(detectShellMode('$ ls -la')).toBe('shell');
  });

  test('detectShellMode returns "background" for $$ prefix', () => {
    expect(detectShellMode('$$ npm run dev')).toBe('background');
  });

  test('detectShellMode returns null for empty string', () => {
    expect(detectShellMode('')).toBeNull();
  });

  test('detectShellMode returns "shell" for lone $', () => {
    expect(detectShellMode('$')).toBe('shell');
  });

  test('detectShellMode returns "background" for $$<text> (no space)', () => {
    expect(detectShellMode('$$server')).toBe('background');
  });
});

// ===========================================================================
// Group 2b: parseShellCommand
// ===========================================================================

describe('InputArea — parseShellCommand', () => {

  test('returns null for regular text (no $ prefix)', () => {
    expect(parseShellCommand('hello world')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseShellCommand('')).toBeNull();
  });

  test('parses $ prefix with command', () => {
    const result = parseShellCommand('$ ls -la');
    expect(result).toEqual({ cmd: 'ls -la', visibility: 'shell' });
  });

  test('parses $$ prefix with command', () => {
    const result = parseShellCommand('$$ npm run dev');
    expect(result).toEqual({ cmd: 'npm run dev', visibility: 'hidden' });
  });

  test('lone $ returns empty cmd with visibility shell', () => {
    const result = parseShellCommand('$');
    expect(result).toEqual({ cmd: '', visibility: 'shell' });
  });

  test('lone $$ returns empty cmd with visibility hidden', () => {
    const result = parseShellCommand('$$');
    expect(result).toEqual({ cmd: '', visibility: 'hidden' });
  });

  test('$ prefix without space (no gap) — cmd is the text after $', () => {
    const result = parseShellCommand('$git status');
    expect(result).toEqual({ cmd: 'git status', visibility: 'shell' });
  });

  test('$$ prefix without space (no gap) — cmd is the text after $$', () => {
    const result = parseShellCommand('$$server');
    expect(result).toEqual({ cmd: 'server', visibility: 'hidden' });
  });

  test('$ prefix with leading/trailing whitespace in cmd is trimmed', () => {
    const result = parseShellCommand('$   echo hi   ');
    expect(result).toEqual({ cmd: 'echo hi', visibility: 'shell' });
  });

  test('$$ prefix with leading/trailing whitespace in cmd is trimmed', () => {
    const result = parseShellCommand('$$   npm start   ');
    expect(result).toEqual({ cmd: 'npm start', visibility: 'hidden' });
  });

  test('$$$ input matches $$ branch — cmd starts with $', () => {
    // $$$ starts with $$ so it enters the $$ branch; slice(2) = "$", trim = "$"
    const result = parseShellCommand('$$$');
    expect(result).toEqual({ cmd: '$', visibility: 'hidden' });
  });

  test('$ with only whitespace after prefix returns empty cmd', () => {
    const result = parseShellCommand('$   ');
    expect(result).toEqual({ cmd: '', visibility: 'shell' });
  });

  test('$$ with only whitespace after prefix returns empty cmd', () => {
    const result = parseShellCommand('$$   ');
    expect(result).toEqual({ cmd: '', visibility: 'hidden' });
  });

  test('text starting with space then $ is not shell (no prefix match)', () => {
    expect(parseShellCommand(' $ ls')).toBeNull();
  });
});

// ===========================================================================
// Group 3: Submit Behavior
// ===========================================================================

describe('InputArea — Submit Behavior', () => {

  test('submit fires onSubmit with trimmed text', () => {
    let received: string | null = null;
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({
      onSubmit: (text: string) => { received = text; },
      controller: ctrl,
    });
    ctrl.text = '  hello world  ';
    // Invoke the submit handler directly
    (state as any)._handleSubmit('  hello world  ');
    expect(received).toBe('hello world');
  });

  test('submit clears controller text', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({
      onSubmit: () => {},
      controller: ctrl,
    });
    ctrl.text = 'some text';
    (state as any)._handleSubmit('some text');
    expect(ctrl.text).toBe('');
  });

  test('submit resets dragHeight to null', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({
      onSubmit: () => {},
      controller: ctrl,
    });
    // Manually set dragHeight via drag simulation
    (state as any).dragHeight = 8;
    (state as any)._handleSubmit('submit text');
    expect((state as any).dragHeight).toBeNull();
  });

  test('submit with empty text is no-op (onSubmit not called)', () => {
    let called = false;
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({
      onSubmit: () => { called = true; },
      controller: ctrl,
    });
    (state as any)._handleSubmit('');
    expect(called).toBe(false);
  });

  test('submit with whitespace-only text is no-op', () => {
    let called = false;
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({
      onSubmit: () => { called = true; },
      controller: ctrl,
    });
    (state as any)._handleSubmit('   \n\t  ');
    expect(called).toBe(false);
  });

  test('submit when isProcessing is no-op', () => {
    let called = false;
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({
      onSubmit: () => { called = true; },
      isProcessing: true,
      controller: ctrl,
    });
    (state as any)._handleSubmit('real text');
    expect(called).toBe(false);
  });
});

// ===========================================================================
// Group 4: Height Computation
// ===========================================================================

describe('InputArea — Height Computation', () => {

  test('single line -> height = MIN_HEIGHT (3)', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({ controller: ctrl });
    ctrl.text = 'single line';
    const height = (state as any)._computeHeight();
    expect(height).toBe(MIN_HEIGHT);
  });

  test('multi-line (5 lines) -> height = 5 + 2 = 7', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({ controller: ctrl });
    ctrl.text = 'line1\nline2\nline3\nline4\nline5';
    const height = (state as any)._computeHeight();
    expect(height).toBe(7); // 5 content + 2 border
  });

  test('multi-line exceeding maxExpandLines (15 lines, max 10) -> height = 12', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({ controller: ctrl, maxExpandLines: 10 });
    const lines = Array.from({ length: 15 }, (_, i) => `line${i + 1}`);
    ctrl.text = lines.join('\n');
    const height = (state as any)._computeHeight();
    expect(height).toBe(12); // min(15, 10) + 2 = 12
  });

  test('dragHeight overrides auto-expand', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({ controller: ctrl });
    ctrl.text = 'line1\nline2\nline3';
    (state as any).dragHeight = 20;
    const height = (state as any)._computeHeight();
    expect(height).toBe(20);
  });
});

// ===========================================================================
// Group 5: Widget Tree Structure
// ===========================================================================

describe('InputArea — Widget Tree Structure', () => {

  test('build returns a Stack with fit:passthrough', () => {
    const { tree } = buildInputArea({});
    expect(tree).toBeInstanceOf(Stack);
    expect((tree as Stack).fit).toBe('passthrough');
  });

  test('Stack has Container as first child (bordered input)', () => {
    const { tree } = buildInputArea({});
    const stack = tree as Stack;
    expect(stack.children.length).toBeGreaterThanOrEqual(1);
    expect(stack.children[0]).toBeInstanceOf(Container);
  });

  test('Stack has Positioned children for overlays', () => {
    const { tree } = buildInputArea({});
    const positioned = findAll(tree, Positioned);
    // At minimum: drag resize MouseRegion positioned overlay
    expect(positioned.length).toBeGreaterThanOrEqual(1);
  });

  test('drag resize MouseRegion is present in overlays', () => {
    const { tree } = buildInputArea({});
    const mouseRegions = findAll(tree, MouseRegion);
    expect(mouseRegions.length).toBeGreaterThanOrEqual(1);
    // The drag resize region has cursor:'ns-resize'
    const dragRegion = mouseRegions.find((mr: any) => mr.cursor === 'ns-resize');
    expect(dragRegion).toBeDefined();
  });

  test('mode badge shows when mode is set', () => {
    const { tree } = buildInputArea({ mode: 'agent' });
    const positioned = findAll(tree, Positioned);
    // Should have at least 2 positioned: mode badge + drag resize
    expect(positioned.length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// Group 6: Controller Lifecycle
// ===========================================================================

describe('InputArea — Controller Lifecycle', () => {

  test('external controller is used when provided', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({ controller: ctrl });
    expect((state as any).controller).toBe(ctrl);
    expect((state as any).ownsController).toBe(false);
  });

  test('owned controller is created when no external controller', () => {
    const { state } = buildInputArea({});
    expect((state as any).controller).toBeDefined();
    expect((state as any).ownsController).toBe(true);
  });

  test('dispose removes listener from controller', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({ controller: ctrl });
    // Get listener count before dispose
    const listenersBefore = (ctrl as any)._listeners.size;
    state.dispose();
    const listenersAfter = (ctrl as any)._listeners.size;
    expect(listenersAfter).toBe(listenersBefore - 1);
  });

  test('dispose does not dispose external controller', () => {
    const ctrl = new TextEditingController();
    const { state } = buildInputArea({ controller: ctrl });
    state.dispose();
    // External controller should still work
    ctrl.text = 'still alive';
    expect(ctrl.text).toBe('still alive');
  });
});
