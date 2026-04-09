// Tests for FocusManager focus history — Gap 29: Focus restoration mechanism
import { describe, test, expect, beforeEach } from 'bun:test';
import { FocusNode, FocusScopeNode, FocusManager } from '../focus';

describe('FocusManager focus history', () => {
  beforeEach(() => FocusManager.reset());

  test('requestFocus pushes previous focus onto history', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    expect(mgr.primaryFocus).toBe(nodeA);
    expect(mgr.previousFocus).toBeNull(); // no previous

    nodeB.requestFocus();
    expect(mgr.primaryFocus).toBe(nodeB);
    expect(mgr.previousFocus).toBe(nodeA);
  });

  test('restoreFocus pops history and re-focuses previous node', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    nodeB.requestFocus();

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus skips disposed nodes', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    const nodeC = new FocusNode({ debugLabel: 'C' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    mgr.registerNode(nodeC, null);

    nodeA.requestFocus();
    nodeB.requestFocus();
    nodeC.requestFocus();

    // Dispose nodeB (simulating overlay removal)
    nodeB.dispose();

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    // nodeB was skipped, nodeA was restored
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus skips detached nodes', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    const nodeC = new FocusNode({ debugLabel: 'C' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    mgr.registerNode(nodeC, null);

    nodeA.requestFocus();
    nodeB.requestFocus();
    nodeC.requestFocus();

    // Detach nodeB without disposing (parent set to null)
    nodeB.detach();

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus skips nodes that can no longer accept focus', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    const nodeC = new FocusNode({ debugLabel: 'C' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    mgr.registerNode(nodeC, null);

    nodeA.requestFocus();
    nodeB.requestFocus();
    nodeC.requestFocus();

    // Disable focus on nodeB
    nodeB.canRequestFocus = false;

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus returns false when history is exhausted', () => {
    const mgr = FocusManager.instance;
    expect(mgr.restoreFocus()).toBe(false);
  });

  test('nested overlay dismissal restores in correct order', () => {
    const mgr = FocusManager.instance;
    const input = new FocusNode({ debugLabel: 'input' });
    const overlay1 = new FocusNode({ debugLabel: 'overlay1' });
    const overlay2 = new FocusNode({ debugLabel: 'overlay2' });
    mgr.registerNode(input, null);
    mgr.registerNode(overlay1, null);
    mgr.registerNode(overlay2, null);

    input.requestFocus();    // history: []
    overlay1.requestFocus(); // history: [input]
    overlay2.requestFocus(); // history: [input, overlay1]

    mgr.restoreFocus();      // -> overlay1 focused
    expect(mgr.primaryFocus).toBe(overlay1);

    mgr.restoreFocus();      // -> input focused
    expect(mgr.primaryFocus).toBe(input);
  });

  test('history is bounded to MAX_FOCUS_HISTORY entries', () => {
    const mgr = FocusManager.instance;
    const nodes: FocusNode[] = [];
    for (let i = 0; i < 12; i++) {
      const node = new FocusNode({ debugLabel: `node-${i}` });
      mgr.registerNode(node, null);
      nodes.push(node);
    }
    // Focus each node in sequence (pushes 11 history entries)
    for (const node of nodes) {
      node.requestFocus();
    }
    // Stack should be bounded, oldest entries evicted
    let restoreCount = 0;
    while (mgr.restoreFocus()) restoreCount++;
    expect(restoreCount).toBeLessThanOrEqual(8);
  });

  test('clearFocusHistory empties the stack', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    nodeA.requestFocus();
    nodeB.requestFocus();

    mgr.clearFocusHistory();
    expect(mgr.previousFocus).toBeNull();
    expect(mgr.restoreFocus()).toBe(false);
  });

  test('self-requestFocus does not push to history', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    mgr.registerNode(nodeA, null);

    nodeA.requestFocus();
    nodeA.requestFocus(); // redundant call

    expect(mgr.previousFocus).toBeNull();
  });

  test('previousFocus peek does not modify the stack', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    nodeB.requestFocus();

    // Peek twice -- should return the same node
    expect(mgr.previousFocus).toBe(nodeA);
    expect(mgr.previousFocus).toBe(nodeA);

    // Stack should still have the entry
    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('double-autofocus overlay produces correct history', () => {
    // Simulates the CommandPalette pattern: outer FocusScope + inner
    // SelectionList FocusScope, both with autofocus.
    const mgr = FocusManager.instance;
    const inputNode = new FocusNode({ debugLabel: 'TextField' });
    const outerOverlay = new FocusNode({ debugLabel: 'CommandPalette.FocusScope' });
    const innerOverlay = new FocusNode({ debugLabel: 'SelectionList.FocusScope' });
    mgr.registerNode(inputNode, null);
    mgr.registerNode(outerOverlay, null);
    mgr.registerNode(innerOverlay, null);

    // Step 1: TextField has focus
    inputNode.requestFocus();

    // Step 2: Outer overlay autofocus fires (microtask 1)
    outerOverlay.requestFocus();
    // History: [inputNode]

    // Step 3: Inner overlay autofocus fires (microtask 2)
    innerOverlay.requestFocus();
    // History: [inputNode, outerOverlay]

    // Overlay closes: both nodes disposed.
    // dispose() on a focused node automatically calls restoreFocus() (Gap 29).
    // innerOverlay.dispose() -> restoreFocus() -> pops outerOverlay -> focuses it
    // outerOverlay.dispose() -> restoreFocus() -> pops inputNode -> focuses it
    innerOverlay.dispose();
    outerOverlay.dispose();

    // Focus should have been automatically restored to inputNode
    // through the chain of dispose() -> restoreFocus() calls.
    expect(mgr.primaryFocus).toBe(inputNode);
  });

  test('reset clears focus history', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    nodeA.requestFocus();
    nodeB.requestFocus();

    FocusManager.reset();

    const newMgr = FocusManager.instance;
    expect(newMgr.previousFocus).toBeNull();
    expect(newMgr.restoreFocus()).toBe(false);
  });
});

describe('FocusScopeNode._focusedChild cleanup on detach', () => {
  beforeEach(() => FocusManager.reset());

  test('detach clears _focusedChild from nearest ancestor scope', () => {
    const mgr = FocusManager.instance;
    const scope = new FocusScopeNode({ debugLabel: 'scope' });
    const child = new FocusNode({ debugLabel: 'child' });
    mgr.registerNode(scope, null);
    mgr.registerNode(child, scope);

    // Focus the child — this sets scope._focusedChild to child
    child.requestFocus();
    expect(scope.focusedChild).toBe(child);

    // Detach child — should clear scope._focusedChild
    child.detach();
    expect(scope.focusedChild).toBeNull();
  });

  test('detach does not clear _focusedChild for unrelated nodes', () => {
    const mgr = FocusManager.instance;
    const scope = new FocusScopeNode({ debugLabel: 'scope' });
    const childA = new FocusNode({ debugLabel: 'childA' });
    const childB = new FocusNode({ debugLabel: 'childB' });
    mgr.registerNode(scope, null);
    mgr.registerNode(childA, scope);
    mgr.registerNode(childB, scope);

    // Focus childB
    childB.requestFocus();
    expect(scope.focusedChild).toBe(childB);

    // Detach childA — should NOT clear scope._focusedChild since it's childB
    childA.detach();
    expect(scope.focusedChild).toBe(childB);
  });
});

describe('FocusNode auto-restoreFocus on detach/dispose (Gap BUG-2)', () => {
  beforeEach(() => FocusManager.reset());

  /**
   * Verifies that detach() on the currently focused node automatically
   * restores focus to the previous holder via the focus history stack.
   * A gets focus, B gets focus (history: [A]).
   * B.detach() should auto-restore focus to A.
   */
  test('detach() on focused node auto-restores to previous', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    nodeB.requestFocus();

    nodeB.detach();
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  /**
   * Verifies that dispose() on the currently focused node automatically
   * restores focus to the previous holder via the focus history stack.
   * A gets focus, B gets focus (history: [A]).
   * B.dispose() should auto-restore focus to A.
   */
  test('dispose() on focused node auto-restores to previous', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    nodeB.requestFocus();

    nodeB.dispose();
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  /**
   * Verifies that detaching a non-focused node does NOT alter
   * primaryFocus. Only the focused node's detach should trigger
   * focus restoration.
   * A gets focus, B gets focus (history: [A]).
   * A.detach() should NOT change primaryFocus — B stays focused.
   */
  test('detach on non-focused node does NOT trigger restoreFocus', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    nodeB.requestFocus();

    nodeA.detach();
    expect(mgr.primaryFocus).toBe(nodeB);
  });

  /**
   * Simulates CommandPalette teardown: a chain of dispose() calls
   * restores focus through the entire overlay stack.
   * inputNode, outerScope, innerScope all registered and focused in order.
   * innerScope.dispose() -> auto-restore -> outerScope gets focus.
   * outerScope.dispose() -> auto-restore -> inputNode gets focus.
   */
  test('chained dispose restores through overlay stack (simulates CommandPalette teardown)', () => {
    const mgr = FocusManager.instance;
    const inputNode = new FocusNode({ debugLabel: 'inputNode' });
    const outerScope = new FocusNode({ debugLabel: 'outerScope' });
    const innerScope = new FocusNode({ debugLabel: 'innerScope' });
    mgr.registerNode(inputNode, null);
    mgr.registerNode(outerScope, null);
    mgr.registerNode(innerScope, null);

    inputNode.requestFocus();
    outerScope.requestFocus();
    innerScope.requestFocus();

    innerScope.dispose();
    expect(mgr.primaryFocus).toBe(outerScope);

    outerScope.dispose();
    expect(mgr.primaryFocus).toBe(inputNode);
  });

  /**
   * Verifies that detaching the only focused node when the focus
   * history stack is empty leaves primaryFocus as null.
   * Only A is registered and focused. History is empty.
   * A.detach() clears focus with nothing to restore.
   */
  test('detach on focused node with empty history leaves primaryFocus null', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    mgr.registerNode(nodeA, null);

    nodeA.requestFocus();

    nodeA.detach();
    expect(mgr.primaryFocus).toBeNull();
  });
});
