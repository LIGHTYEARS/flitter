// Tests for FocusNode, FocusScopeNode, and FocusManager
// Amp ref: input-system.md Section 7, Section 9.2
import { describe, test, expect, beforeEach } from 'bun:test';
import { FocusNode, FocusScopeNode, FocusManager } from '../focus';
import { createKeyEvent } from '../events';
import type { KeyEvent, KeyEventResult } from '../events';

// Reset FocusManager singleton before each test
beforeEach(() => {
  FocusManager.reset();
});

// ===========================================================================
// FocusNode
// ===========================================================================

describe('FocusNode', () => {
  describe('creation', () => {
    test('creates with default options', () => {
      const node = new FocusNode();
      expect(node.canRequestFocus).toBe(true);
      expect(node.skipTraversal).toBe(false);
      expect(node.hasFocus).toBe(false);
      expect(node.hasPrimaryFocus).toBe(false);
      expect(node.onKey).toBeNull();
      expect(node.onPaste).toBeNull();
      expect(node.parent).toBeNull();
      expect(node.children).toEqual([]);
      expect(node.debugLabel).toBeUndefined();
    });

    test('creates with custom options', () => {
      const onKey = (_e: KeyEvent): KeyEventResult => 'handled';
      const onPaste = (_t: string): void => {};
      const node = new FocusNode({
        canRequestFocus: false,
        skipTraversal: true,
        onKey,
        onPaste,
        debugLabel: 'TestNode',
      });
      expect(node.canRequestFocus).toBe(false);
      expect(node.skipTraversal).toBe(true);
      expect(node.onKey).toBe(onKey);
      expect(node.onPaste).toBe(onPaste);
      expect(node.debugLabel).toBe('TestNode');
    });

    test('creates with partial options', () => {
      const node = new FocusNode({ debugLabel: 'Partial' });
      expect(node.canRequestFocus).toBe(true);
      expect(node.skipTraversal).toBe(false);
      expect(node.debugLabel).toBe('Partial');
    });
  });

  describe('tree structure', () => {
    test('attach sets parent-child relationship', () => {
      const parent = new FocusNode({ debugLabel: 'parent' });
      const child = new FocusNode({ debugLabel: 'child' });
      child.attach(parent);
      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
    });

    test('attach multiple children', () => {
      const parent = new FocusNode();
      const child1 = new FocusNode();
      const child2 = new FocusNode();
      const child3 = new FocusNode();
      child1.attach(parent);
      child2.attach(parent);
      child3.attach(parent);
      expect(parent.children.length).toBe(3);
      expect(parent.children[0]).toBe(child1);
      expect(parent.children[1]).toBe(child2);
      expect(parent.children[2]).toBe(child3);
    });

    test('detach removes parent-child relationship', () => {
      const parent = new FocusNode();
      const child = new FocusNode();
      child.attach(parent);
      child.detach();
      expect(child.parent).toBeNull();
      expect(parent.children).not.toContain(child);
    });

    test('attach to new parent detaches from old parent', () => {
      const parent1 = new FocusNode();
      const parent2 = new FocusNode();
      const child = new FocusNode();
      child.attach(parent1);
      expect(parent1.children).toContain(child);
      child.attach(parent2);
      expect(parent1.children).not.toContain(child);
      expect(parent2.children).toContain(child);
      expect(child.parent).toBe(parent2);
    });

    test('attach to same parent is a no-op', () => {
      const parent = new FocusNode();
      const child = new FocusNode();
      child.attach(parent);
      child.attach(parent);
      expect(parent.children.length).toBe(1);
    });

    test('detach from null parent is a no-op', () => {
      const node = new FocusNode();
      node.detach(); // should not throw
      expect(node.parent).toBeNull();
    });

    test('deep tree structure', () => {
      const root = new FocusNode({ debugLabel: 'root' });
      const mid = new FocusNode({ debugLabel: 'mid' });
      const leaf = new FocusNode({ debugLabel: 'leaf' });
      mid.attach(root);
      leaf.attach(mid);
      expect(leaf.parent).toBe(mid);
      expect(mid.parent).toBe(root);
      expect(root.children).toContain(mid);
      expect(mid.children).toContain(leaf);
    });
  });

  describe('requestFocus', () => {
    test('sets hasPrimaryFocus to true', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.requestFocus();
      expect(node.hasPrimaryFocus).toBe(true);
    });

    test('sets hasFocus on ancestor nodes', () => {
      const manager = FocusManager.instance;
      const parent = new FocusNode();
      const child = new FocusNode();
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();
      expect(child.hasPrimaryFocus).toBe(true);
      expect(child.hasFocus).toBe(true);
      expect(parent.hasPrimaryFocus).toBe(false);
      expect(parent.hasFocus).toBe(true);
    });

    test('clears previous primary focus when a new node requests focus', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const node2 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      node1.requestFocus();
      expect(node1.hasPrimaryFocus).toBe(true);
      node2.requestFocus();
      expect(node1.hasPrimaryFocus).toBe(false);
      expect(node2.hasPrimaryFocus).toBe(true);
    });

    test('does nothing if canRequestFocus is false', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode({ canRequestFocus: false });
      manager.registerNode(node, null);
      node.requestFocus();
      expect(node.hasPrimaryFocus).toBe(false);
    });

    test('does nothing if node is disposed', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.dispose();
      node.requestFocus();
      expect(node.hasPrimaryFocus).toBe(false);
    });

    test('requesting focus on already-focused node is a no-op', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      let callCount = 0;
      node.addListener(() => callCount++);
      node.requestFocus();
      expect(callCount).toBe(1);
      // Second call should still notify (focus did not actually change but method fires)
      node.requestFocus();
      // The node was already focused; no clear+set cycle happens for same node
    });
  });

  describe('unfocus', () => {
    test('clears hasPrimaryFocus', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.requestFocus();
      expect(node.hasPrimaryFocus).toBe(true);
      node.unfocus();
      expect(node.hasPrimaryFocus).toBe(false);
    });

    test('clears hasFocus on ancestors', () => {
      const manager = FocusManager.instance;
      const parent = new FocusNode();
      const child = new FocusNode();
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();
      expect(parent.hasFocus).toBe(true);
      child.unfocus();
      expect(parent.hasFocus).toBe(false);
    });

    test('unfocus on node without focus is a no-op', () => {
      const node = new FocusNode();
      node.unfocus(); // should not throw
      expect(node.hasPrimaryFocus).toBe(false);
    });
  });

  describe('canRequestFocus setter', () => {
    test('setting canRequestFocus to false unfocuses the node', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.requestFocus();
      expect(node.hasPrimaryFocus).toBe(true);
      node.canRequestFocus = false;
      expect(node.hasPrimaryFocus).toBe(false);
    });

    test('setting canRequestFocus to same value is a no-op', () => {
      const node = new FocusNode();
      node.canRequestFocus = true; // already true
      expect(node.canRequestFocus).toBe(true);
    });
  });

  describe('key event handling', () => {
    test('handleKeyEvent calls onKey handler', () => {
      const event = createKeyEvent('Enter');
      const node = new FocusNode({
        onKey: (e) => {
          expect(e).toBe(event);
          return 'handled';
        },
      });
      expect(node.handleKeyEvent(event)).toBe('handled');
    });

    test('handleKeyEvent returns ignored when onKey returns ignored', () => {
      const event = createKeyEvent('a');
      const node = new FocusNode({
        onKey: () => 'ignored',
      });
      expect(node.handleKeyEvent(event)).toBe('ignored');
    });

    test('handleKeyEvent with no handlers returns ignored', () => {
      const node = new FocusNode();
      const event = createKeyEvent('a');
      expect(node.handleKeyEvent(event)).toBe('ignored');
    });

    test('addKeyHandler and removeKeyHandler', () => {
      const node = new FocusNode();
      const handler = (_e: KeyEvent): KeyEventResult => 'handled';
      node.addKeyHandler(handler);
      const event = createKeyEvent('x');
      expect(node.handleKeyEvent(event)).toBe('handled');
      node.removeKeyHandler(handler);
      expect(node.handleKeyEvent(event)).toBe('ignored');
    });

    test('multiple key handlers — first handled wins', () => {
      const node = new FocusNode();
      const calls: number[] = [];
      node.addKeyHandler(() => {
        calls.push(1);
        return 'ignored';
      });
      node.addKeyHandler(() => {
        calls.push(2);
        return 'handled';
      });
      node.addKeyHandler(() => {
        calls.push(3);
        return 'ignored';
      });
      const event = createKeyEvent('a');
      expect(node.handleKeyEvent(event)).toBe('handled');
      expect(calls).toEqual([1, 2]);
    });

    test('onKey is checked before registered key handlers', () => {
      const calls: string[] = [];
      const node = new FocusNode({
        onKey: () => {
          calls.push('onKey');
          return 'handled';
        },
      });
      node.addKeyHandler(() => {
        calls.push('handler');
        return 'handled';
      });
      const event = createKeyEvent('a');
      node.handleKeyEvent(event);
      expect(calls).toEqual(['onKey']);
    });

    test('registered handlers are called when onKey returns ignored', () => {
      const calls: string[] = [];
      const node = new FocusNode({
        onKey: () => {
          calls.push('onKey');
          return 'ignored';
        },
      });
      node.addKeyHandler(() => {
        calls.push('handler');
        return 'handled';
      });
      const event = createKeyEvent('a');
      expect(node.handleKeyEvent(event)).toBe('handled');
      expect(calls).toEqual(['onKey', 'handler']);
    });

    test('removeKeyHandler for non-existent handler is a no-op', () => {
      const node = new FocusNode();
      const handler = (_e: KeyEvent): KeyEventResult => 'ignored';
      node.removeKeyHandler(handler); // should not throw
    });
  });

  describe('listeners', () => {
    test('addListener and removeListener', () => {
      const node = new FocusNode();
      const manager = FocusManager.instance;
      manager.registerNode(node, null);
      let callCount = 0;
      const listener = () => callCount++;
      node.addListener(listener);
      node.requestFocus();
      expect(callCount).toBe(1);
      node.removeListener(listener);
      node.unfocus();
      expect(callCount).toBe(1); // no longer called
    });

    test('multiple listeners are all called', () => {
      const node = new FocusNode();
      const manager = FocusManager.instance;
      manager.registerNode(node, null);
      const calls: number[] = [];
      node.addListener(() => calls.push(1));
      node.addListener(() => calls.push(2));
      node.requestFocus();
      expect(calls).toEqual([1, 2]);
    });

    test('ancestor listeners fire when descendant focus changes', () => {
      const manager = FocusManager.instance;
      const parent = new FocusNode();
      const child = new FocusNode();
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      let parentNotified = false;
      parent.addListener(() => {
        parentNotified = true;
      });
      child.requestFocus();
      expect(parentNotified).toBe(true);
    });

    test('removeListener for non-existent listener is a no-op', () => {
      const node = new FocusNode();
      const listener = () => {};
      node.removeListener(listener); // should not throw
    });
  });

  describe('focus traversal', () => {
    test('nextFocus moves to the next node in DFS order', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode({ debugLabel: 'n1' });
      const node2 = new FocusNode({ debugLabel: 'n2' });
      const node3 = new FocusNode({ debugLabel: 'n3' });
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      manager.registerNode(node3, null);
      node1.requestFocus();
      node1.nextFocus();
      expect(node2.hasPrimaryFocus).toBe(true);
    });

    test('nextFocus wraps around to the first node', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const node2 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      node2.requestFocus();
      node2.nextFocus();
      expect(node1.hasPrimaryFocus).toBe(true);
    });

    test('previousFocus moves to the previous node', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const node2 = new FocusNode();
      const node3 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      manager.registerNode(node3, null);
      node2.requestFocus();
      node2.previousFocus();
      expect(node1.hasPrimaryFocus).toBe(true);
    });

    test('previousFocus wraps around to the last node', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const node2 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      node1.requestFocus();
      node1.previousFocus();
      expect(node2.hasPrimaryFocus).toBe(true);
    });

    test('skipTraversal nodes are skipped in traversal', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const skipped = new FocusNode({ skipTraversal: true });
      const node3 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(skipped, null);
      manager.registerNode(node3, null);
      node1.requestFocus();
      node1.nextFocus();
      expect(node3.hasPrimaryFocus).toBe(true);
    });

    test('canRequestFocus=false nodes are excluded from traversal', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const disabled = new FocusNode({ canRequestFocus: false });
      const node3 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(disabled, null);
      manager.registerNode(node3, null);
      node1.requestFocus();
      node1.nextFocus();
      expect(node3.hasPrimaryFocus).toBe(true);
    });

    test('nextFocus returns false when no traversable nodes', () => {
      const node = new FocusNode({ canRequestFocus: false });
      expect(node.nextFocus()).toBe(false);
    });

    test('previousFocus returns false when no traversable nodes', () => {
      const node = new FocusNode({ canRequestFocus: false });
      expect(node.previousFocus()).toBe(false);
    });

    test('nextFocus returns true when focus was moved', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const node2 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      node1.requestFocus();
      expect(node1.nextFocus()).toBe(true);
    });

    test('traversal follows DFS order in nested tree', () => {
      const manager = FocusManager.instance;
      //   root
      //   ├── parent1
      //   │   ├── child1
      //   │   └── child2
      //   └── parent2
      //       └── child3
      const parent1 = new FocusNode({ debugLabel: 'p1' });
      const child1 = new FocusNode({ debugLabel: 'c1' });
      const child2 = new FocusNode({ debugLabel: 'c2' });
      const parent2 = new FocusNode({ debugLabel: 'p2' });
      const child3 = new FocusNode({ debugLabel: 'c3' });
      manager.registerNode(parent1, null);
      manager.registerNode(child1, parent1);
      manager.registerNode(child2, parent1);
      manager.registerNode(parent2, null);
      manager.registerNode(child3, parent2);

      // DFS order: parent1, child1, child2, parent2, child3
      const traversable = manager.getTraversableNodes();
      expect(traversable.map(n => n.debugLabel)).toEqual([
        'p1', 'c1', 'c2', 'p2', 'c3',
      ]);
    });

    test('nextFocus focuses first node when current node is not in traversal list', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const node2 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      // Create an unregistered node and call nextFocus from it
      const orphan = new FocusNode();
      orphan.nextFocus();
      expect(node1.hasPrimaryFocus).toBe(true);
    });
  });

  describe('dispose', () => {
    test('dispose clears focus', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.requestFocus();
      node.dispose();
      expect(node.hasPrimaryFocus).toBe(false);
      expect(node.disposed).toBe(true);
    });

    test('dispose detaches from parent', () => {
      const parent = new FocusNode();
      const child = new FocusNode();
      child.attach(parent);
      child.dispose();
      expect(child.parent).toBeNull();
      expect(parent.children).not.toContain(child);
    });

    test('dispose detaches all children', () => {
      const parent = new FocusNode();
      const child1 = new FocusNode();
      const child2 = new FocusNode();
      child1.attach(parent);
      child2.attach(parent);
      parent.dispose();
      expect(parent.children.length).toBe(0);
      expect(child1.parent).toBeNull();
      expect(child2.parent).toBeNull();
    });

    test('dispose clears handlers and listeners', () => {
      const node = new FocusNode({
        onKey: () => 'handled',
        onPaste: () => {},
      });
      let listenerCalled = false;
      node.addListener(() => {
        listenerCalled = true;
      });
      node.dispose();
      expect(node.onKey).toBeNull();
      expect(node.onPaste).toBeNull();
      // After dispose, handleKeyEvent should return ignored
      expect(node.handleKeyEvent(createKeyEvent('a'))).toBe('ignored');
    });

    test('dispose is idempotent', () => {
      const node = new FocusNode();
      node.dispose();
      node.dispose(); // should not throw
      expect(node.disposed).toBe(true);
    });

    test('detach clears primary focus on detached node', () => {
      const manager = FocusManager.instance;
      const parent = new FocusNode();
      const child = new FocusNode();
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();
      expect(child.hasPrimaryFocus).toBe(true);
      child.detach();
      expect(child.hasPrimaryFocus).toBe(false);
    });
  });
});

// ===========================================================================
// FocusScopeNode
// ===========================================================================

describe('FocusScopeNode', () => {
  test('is a FocusNode', () => {
    const scope = new FocusScopeNode();
    expect(scope).toBeInstanceOf(FocusNode);
  });

  test('tracks focusedChild within scope', () => {
    const manager = FocusManager.instance;
    const scope = new FocusScopeNode({ debugLabel: 'scope' });
    const child1 = new FocusNode({ debugLabel: 'child1' });
    const child2 = new FocusNode({ debugLabel: 'child2' });
    manager.registerNode(scope, null);
    manager.registerNode(child1, scope);
    manager.registerNode(child2, scope);
    expect(scope.focusedChild).toBeNull();
    child1.requestFocus();
    expect(scope.focusedChild).toBe(child1);
    child2.requestFocus();
    expect(scope.focusedChild).toBe(child2);
  });

  test('autofocus requests focus for the given child', () => {
    const manager = FocusManager.instance;
    const scope = new FocusScopeNode();
    const child = new FocusNode();
    manager.registerNode(scope, null);
    manager.registerNode(child, scope);
    scope.autofocus(child);
    expect(child.hasPrimaryFocus).toBe(true);
    expect(scope.focusedChild).toBe(child);
  });

  test('autofocus does nothing for non-descendant', () => {
    const manager = FocusManager.instance;
    const scope = new FocusScopeNode();
    const outsider = new FocusNode();
    manager.registerNode(scope, null);
    manager.registerNode(outsider, null); // sibling, not descendant
    scope.autofocus(outsider);
    expect(outsider.hasPrimaryFocus).toBe(false);
  });

  test('autofocus works with deep descendants', () => {
    const manager = FocusManager.instance;
    const scope = new FocusScopeNode();
    const mid = new FocusNode();
    const leaf = new FocusNode();
    manager.registerNode(scope, null);
    manager.registerNode(mid, scope);
    manager.registerNode(leaf, mid);
    scope.autofocus(leaf);
    expect(leaf.hasPrimaryFocus).toBe(true);
    expect(scope.focusedChild).toBe(leaf);
  });

  test('focusedChild is initially null', () => {
    const scope = new FocusScopeNode();
    expect(scope.focusedChild).toBeNull();
  });
});

// ===========================================================================
// FocusManager
// ===========================================================================

describe('FocusManager', () => {
  describe('singleton', () => {
    test('returns the same instance', () => {
      const a = FocusManager.instance;
      const b = FocusManager.instance;
      expect(a).toBe(b);
    });

    test('reset creates a new instance', () => {
      const a = FocusManager.instance;
      FocusManager.reset();
      const b = FocusManager.instance;
      expect(a).not.toBe(b);
    });

    test('has a root scope', () => {
      const manager = FocusManager.instance;
      expect(manager.rootScope).toBeInstanceOf(FocusScopeNode);
    });
  });

  describe('primaryFocus', () => {
    test('is null when no node has focus', () => {
      const manager = FocusManager.instance;
      expect(manager.primaryFocus).toBeNull();
    });

    test('returns the node with primary focus', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.requestFocus();
      expect(manager.primaryFocus).toBe(node);
    });

    test('updates when focus changes', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const node2 = new FocusNode();
      manager.registerNode(node1, null);
      manager.registerNode(node2, null);
      node1.requestFocus();
      expect(manager.primaryFocus).toBe(node1);
      node2.requestFocus();
      expect(manager.primaryFocus).toBe(node2);
    });

    test('is null after unfocus', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.requestFocus();
      node.unfocus();
      expect(manager.primaryFocus).toBeNull();
    });
  });

  describe('registerNode / unregisterNode', () => {
    test('registerNode adds to root scope when parent is null', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      expect(manager.rootScope.children).toContain(node);
      expect(node.parent).toBe(manager.rootScope);
    });

    test('registerNode adds under specified parent', () => {
      const manager = FocusManager.instance;
      const parent = new FocusNode();
      const child = new FocusNode();
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      expect(parent.children).toContain(child);
    });

    test('unregisterNode detaches the node', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      manager.unregisterNode(node);
      expect(manager.rootScope.children).not.toContain(node);
      expect(node.parent).toBeNull();
    });
  });

  describe('dispatchKeyEvent', () => {
    test('dispatches to primary focus node', () => {
      const manager = FocusManager.instance;
      let received: KeyEvent | null = null;
      const node = new FocusNode({
        onKey: (e) => {
          received = e;
          return 'handled';
        },
      });
      manager.registerNode(node, null);
      node.requestFocus();
      const event = createKeyEvent('Enter');
      const result = manager.dispatchKeyEvent(event);
      expect(result).toBe('handled');
      expect(received).toBe(event);
    });

    test('returns ignored when no node has focus', () => {
      const manager = FocusManager.instance;
      const event = createKeyEvent('a');
      expect(manager.dispatchKeyEvent(event)).toBe('ignored');
    });

    test('bubbles up from child to parent when child ignores', () => {
      const manager = FocusManager.instance;
      const calls: string[] = [];
      const parent = new FocusNode({
        onKey: () => {
          calls.push('parent');
          return 'handled';
        },
      });
      const child = new FocusNode({
        onKey: () => {
          calls.push('child');
          return 'ignored';
        },
      });
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();
      const event = createKeyEvent('x');
      const result = manager.dispatchKeyEvent(event);
      expect(result).toBe('handled');
      expect(calls).toEqual(['child', 'parent']);
    });

    test('stops propagation when child handles', () => {
      const manager = FocusManager.instance;
      const calls: string[] = [];
      const parent = new FocusNode({
        onKey: () => {
          calls.push('parent');
          return 'handled';
        },
      });
      const child = new FocusNode({
        onKey: () => {
          calls.push('child');
          return 'handled';
        },
      });
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();
      manager.dispatchKeyEvent(createKeyEvent('x'));
      expect(calls).toEqual(['child']);
    });

    test('bubbles through multiple ancestors', () => {
      const manager = FocusManager.instance;
      const calls: string[] = [];
      const grandparent = new FocusNode({
        onKey: () => {
          calls.push('grandparent');
          return 'handled';
        },
      });
      const parent = new FocusNode({
        onKey: () => {
          calls.push('parent');
          return 'ignored';
        },
      });
      const child = new FocusNode({
        onKey: () => {
          calls.push('child');
          return 'ignored';
        },
      });
      manager.registerNode(grandparent, null);
      manager.registerNode(parent, grandparent);
      manager.registerNode(child, parent);
      child.requestFocus();
      const result = manager.dispatchKeyEvent(createKeyEvent('z'));
      expect(result).toBe('handled');
      expect(calls).toEqual(['child', 'parent', 'grandparent']);
    });

    test('returns ignored when all nodes in chain ignore', () => {
      const manager = FocusManager.instance;
      const parent = new FocusNode({
        onKey: () => 'ignored',
      });
      const child = new FocusNode({
        onKey: () => 'ignored',
      });
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();
      expect(manager.dispatchKeyEvent(createKeyEvent('a'))).toBe('ignored');
    });

    test('dispatches to registered key handlers during bubbling', () => {
      const manager = FocusManager.instance;
      const parent = new FocusNode();
      const child = new FocusNode();
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();

      let parentHandlerCalled = false;
      parent.addKeyHandler(() => {
        parentHandlerCalled = true;
        return 'handled';
      });

      const result = manager.dispatchKeyEvent(createKeyEvent('a'));
      expect(result).toBe('handled');
      expect(parentHandlerCalled).toBe(true);
    });
  });

  describe('dispatchPasteEvent', () => {
    test('dispatches to focused node with onPaste', () => {
      const manager = FocusManager.instance;
      let received: string | null = null;
      const node = new FocusNode({
        onPaste: (text) => {
          received = text;
        },
      });
      manager.registerNode(node, null);
      node.requestFocus();
      manager.dispatchPasteEvent('hello world');
      expect(received).toBe('hello world');
    });

    test('bubbles up to find node with onPaste handler', () => {
      const manager = FocusManager.instance;
      let received: string | null = null;
      const parent = new FocusNode({
        onPaste: (text) => {
          received = text;
        },
      });
      const child = new FocusNode(); // no onPaste
      manager.registerNode(parent, null);
      manager.registerNode(child, parent);
      child.requestFocus();
      manager.dispatchPasteEvent('pasted text');
      expect(received).toBe('pasted text');
    });

    test('does nothing when no node has onPaste', () => {
      const manager = FocusManager.instance;
      const node = new FocusNode();
      manager.registerNode(node, null);
      node.requestFocus();
      // Should not throw
      manager.dispatchPasteEvent('text');
    });

    test('does nothing when no node has focus', () => {
      const manager = FocusManager.instance;
      // Should not throw
      manager.dispatchPasteEvent('text');
    });
  });

  describe('getTraversableNodes', () => {
    test('returns empty array when no nodes registered', () => {
      const manager = FocusManager.instance;
      expect(manager.getTraversableNodes()).toEqual([]);
    });

    test('excludes nodes with skipTraversal', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode({ debugLabel: 'n1' });
      const skipped = new FocusNode({ skipTraversal: true, debugLabel: 'skip' });
      const node3 = new FocusNode({ debugLabel: 'n3' });
      manager.registerNode(node1, null);
      manager.registerNode(skipped, null);
      manager.registerNode(node3, null);
      const traversable = manager.getTraversableNodes();
      expect(traversable).toContain(node1);
      expect(traversable).not.toContain(skipped);
      expect(traversable).toContain(node3);
    });

    test('excludes nodes with canRequestFocus=false', () => {
      const manager = FocusManager.instance;
      const node1 = new FocusNode();
      const disabled = new FocusNode({ canRequestFocus: false });
      manager.registerNode(node1, null);
      manager.registerNode(disabled, null);
      const traversable = manager.getTraversableNodes();
      expect(traversable).toContain(node1);
      expect(traversable).not.toContain(disabled);
    });

    test('does not include the root scope', () => {
      const manager = FocusManager.instance;
      const traversable = manager.getTraversableNodes();
      expect(traversable).not.toContain(manager.rootScope);
    });
  });
});
