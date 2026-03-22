// Tests for FocusScope widget
// Verifies FocusNode lifecycle management, onKey, onPaste, onFocusChange, autofocus

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { FocusScope } from '../focus-scope';
import { FocusNode, FocusManager } from '../../input/focus';
import { createKeyEvent, type KeyEvent, type KeyEventResult } from '../../input/events';
import { StatelessWidget, type BuildContext, Widget } from '../../framework/widget';

// A minimal child widget for testing
class _DummyWidget extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this;
  }
}

describe('FocusScope', () => {
  beforeEach(() => {
    FocusManager.reset();
  });

  afterEach(() => {
    FocusManager.reset();
  });

  test('creates with default property values', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child });

    expect(scope.child).toBe(child);
    expect(scope.autofocus).toBe(false);
    expect(scope.canRequestFocus).toBe(true);
    expect(scope.skipTraversal).toBe(false);
    expect(scope.focusNode).toBeUndefined();
    expect(scope.onKey).toBeUndefined();
    expect(scope.onPaste).toBeUndefined();
    expect(scope.onFocusChange).toBeUndefined();
    expect(scope.debugLabel).toBeUndefined();
  });

  test('accepts custom property values', () => {
    const child = new _DummyWidget();
    const node = new FocusNode();
    const onKey = (_event: KeyEvent): KeyEventResult => 'ignored';
    const onPaste = (_text: string): void => {};
    const onFocusChange = (_hasFocus: boolean): void => {};

    const scope = new FocusScope({
      child,
      focusNode: node,
      autofocus: true,
      canRequestFocus: false,
      skipTraversal: true,
      onKey,
      onPaste,
      onFocusChange,
      debugLabel: 'test-scope',
    });

    expect(scope.focusNode).toBe(node);
    expect(scope.autofocus).toBe(true);
    expect(scope.canRequestFocus).toBe(false);
    expect(scope.skipTraversal).toBe(true);
    expect(scope.onKey).toBe(onKey);
    expect(scope.onPaste).toBe(onPaste);
    expect(scope.onFocusChange).toBe(onFocusChange);
    expect(scope.debugLabel).toBe('test-scope');
  });

  test('createState returns a FocusScopeState', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child });
    const state = scope.createState();
    expect(state).toBeDefined();
  });

  test('is a StatefulWidget', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child });
    expect(scope.createElement).toBeDefined();
  });
});

describe('FocusScopeState', () => {
  beforeEach(() => {
    FocusManager.reset();
  });

  afterEach(() => {
    FocusManager.reset();
  });

  test('creates internal FocusNode when none provided', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child });
    const state = scope.createState() as any;

    // Mount the state
    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    expect(state.effectiveFocusNode).toBeDefined();
    expect(state.effectiveFocusNode).toBeInstanceOf(FocusNode);

    // Cleanup
    state._unmount();
  });

  test('uses provided FocusNode', () => {
    const child = new _DummyWidget();
    const node = new FocusNode({ debugLabel: 'external' });
    const scope = new FocusScope({ child, focusNode: node });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    expect(state.effectiveFocusNode).toBe(node);

    // Cleanup
    state._unmount();
  });

  test('autofocus requests focus on initState', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child, autofocus: true });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    expect(state.effectiveFocusNode.hasPrimaryFocus).toBe(true);

    // Cleanup
    state._unmount();
  });

  test('does not autofocus when autofocus is false', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child, autofocus: false });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    expect(state.effectiveFocusNode.hasPrimaryFocus).toBe(false);

    // Cleanup
    state._unmount();
  });

  test('wires onKey handler to focus node', () => {
    const child = new _DummyWidget();
    const events: KeyEvent[] = [];

    const scope = new FocusScope({
      child,
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        events.push(event);
        return 'handled';
      },
    });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    // Dispatch a key event through FocusManager
    const event = createKeyEvent('a');
    const result = FocusManager.instance.dispatchKeyEvent(event);

    expect(result).toBe('handled');
    expect(events.length).toBe(1);
    expect(events[0].key).toBe('a');

    // Cleanup
    state._unmount();
  });

  test('wires onPaste handler to focus node', () => {
    const child = new _DummyWidget();
    const pastedTexts: string[] = [];

    const scope = new FocusScope({
      child,
      autofocus: true,
      onPaste: (text: string) => {
        pastedTexts.push(text);
      },
    });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    // Dispatch paste through FocusManager
    FocusManager.instance.dispatchPasteEvent('hello clipboard');

    expect(pastedTexts.length).toBe(1);
    expect(pastedTexts[0]).toBe('hello clipboard');

    // Cleanup
    state._unmount();
  });

  test('fires onFocusChange when focus changes', () => {
    const child = new _DummyWidget();
    const focusChanges: boolean[] = [];

    const scope = new FocusScope({
      child,
      onFocusChange: (hasFocus: boolean) => {
        focusChanges.push(hasFocus);
      },
    });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    // Request focus -> should trigger onFocusChange(true)
    state.effectiveFocusNode.requestFocus();
    expect(focusChanges).toContain(true);

    // Unfocus -> should trigger onFocusChange(false)
    state.effectiveFocusNode.unfocus();
    expect(focusChanges).toContain(false);

    // Cleanup
    state._unmount();
  });

  test('sets canRequestFocus on focus node', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child, canRequestFocus: false });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    expect(state.effectiveFocusNode.canRequestFocus).toBe(false);

    // Cleanup
    state._unmount();
  });

  test('sets skipTraversal on focus node', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child, skipTraversal: true });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    expect(state.effectiveFocusNode.skipTraversal).toBe(true);

    // Cleanup
    state._unmount();
  });

  test('build returns the child widget', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    const built = state.build(mockContext);
    expect(built).toBe(child);

    // Cleanup
    state._unmount();
  });

  test('dispose cleans up owned FocusNode', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child, autofocus: true });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    const node = state.effectiveFocusNode;
    expect(node.disposed).toBe(false);

    state._unmount();

    expect(node.disposed).toBe(true);
  });

  test('dispose does not dispose externally provided FocusNode', () => {
    const child = new _DummyWidget();
    const externalNode = new FocusNode({ debugLabel: 'external' });
    const scope = new FocusScope({ child, focusNode: externalNode });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    state._unmount();

    // External node should NOT be disposed by FocusScope
    expect(externalNode.disposed).toBe(false);

    // Clean up external node manually
    externalNode.dispose();
  });

  test('registers node with FocusManager', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child, autofocus: true });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    // The node should be in the focus tree (reachable from root)
    expect(FocusManager.instance.primaryFocus).toBe(state.effectiveFocusNode);

    // Cleanup
    state._unmount();
  });

  test('applies debugLabel to created FocusNode', () => {
    const child = new _DummyWidget();
    const scope = new FocusScope({ child, debugLabel: 'my-scope' });
    const state = scope.createState() as any;

    const mockContext = { widget: scope, mounted: true } as BuildContext;
    state._mount(scope, mockContext);

    expect(state.effectiveFocusNode.debugLabel).toBe('my-scope');

    // Cleanup
    state._unmount();
  });
});
