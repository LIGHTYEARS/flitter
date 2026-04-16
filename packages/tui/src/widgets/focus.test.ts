/**
 * Focus Widget 单元测试。
 *
 * 测试 Focus/FocusState 的 FocusNode 生命周期管理、
 * auto-parenting、autofocus、key handler 注册/注销。
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { FocusManager } from "../focus/focus-manager.js";
import { FocusNode } from "../focus/focus-node.js";
import type { Widget } from "../tree/element.js";
import { Element } from "../tree/element.js";
import type { BuildOwnerLike } from "../tree/types.js";
import { setBuildOwner } from "../tree/types.js";
import type { KeyEvent } from "../vt/types.js";
import { MODIFIERS_NONE } from "../vt/types.js";
import { Focus, FocusState } from "./focus.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** 最小 Widget/Element — Focus.build() 返回 child，需要一个可 mount 的 leaf */
class LeafWidget implements Widget {
  key = undefined;
  canUpdate(other: Widget): boolean {
    return this.constructor === other.constructor;
  }
  createElement(): Element {
    return new LeafElement(this);
  }
}
class LeafElement extends Element {
  performRebuild(): void {
    super.performRebuild();
  }
}

class MockBuildOwner implements BuildOwnerLike {
  scheduledElements: unknown[] = [];
  scheduleBuildFor(element: unknown): void {
    this.scheduledElements.push(element);
  }
}

/** 创建标准 KeyEvent */
function keyEvent(key: string): KeyEvent {
  return { type: "key", key, modifiers: MODIFIERS_NONE };
}

// ════════════════════════════════════════════════════
//  Focus widget 测试
// ════════════════════════════════════════════════════

describe("Focus widget", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    FocusManager.instance.dispose();
    setBuildOwner(undefined);
  });

  it("creates an internal FocusNode when none provided", () => {
    const child = new LeafWidget();
    const focus = new Focus({ child });
    const element = focus.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: FocusState })._state;
    assert.ok(state instanceof FocusState);
    assert.ok(state.effectiveFocusNode instanceof FocusNode);
  });

  it("uses external focusNode when provided", () => {
    const externalNode = new FocusNode({ debugLabel: "external" });
    const child = new LeafWidget();
    const focus = new Focus({ child, focusNode: externalNode });
    const element = focus.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: FocusState })._state;
    assert.equal(state.effectiveFocusNode, externalNode);
  });

  it("registers addKeyHandler on external node when onKey provided", () => {
    const externalNode = new FocusNode();
    // Register node so key events can reach it
    FocusManager.instance.registerNode(externalNode);

    let keyCalled = false;
    const handler = () => {
      keyCalled = true;
      return "handled" as const;
    };

    const child = new LeafWidget();
    const focus = new Focus({ child, focusNode: externalNode, onKey: handler });
    const element = focus.createElement();
    element.mount(undefined);

    // The handler should be registered on the external node
    const result = externalNode._handleKeyEvent(keyEvent("a"));
    assert.equal(result, "handled");
    assert.equal(keyCalled, true);
  });

  it("sets onKey via constructor for internal node", () => {
    let keyCalled = false;
    const handler = () => {
      keyCalled = true;
      return "handled" as const;
    };

    const child = new LeafWidget();
    const focus = new Focus({ child, onKey: handler });
    const element = focus.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: FocusState })._state;
    const result = state.effectiveFocusNode._handleKeyEvent(keyEvent("b"));
    assert.equal(result, "handled");
    assert.equal(keyCalled, true);
  });

  it("autofocus requests focus after mount", async () => {
    const child = new LeafWidget();
    const focus = new Focus({ child, autofocus: true });
    const element = focus.createElement();
    element.mount(undefined);

    // Autofocus is queued as microtask
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const state = (element as unknown as { _state: FocusState })._state;
    assert.equal(state.effectiveFocusNode.hasPrimaryFocus, true);
  });

  it("dispose removes key handler from external node", () => {
    const externalNode = new FocusNode();
    FocusManager.instance.registerNode(externalNode);

    let callCount = 0;
    const handler = () => {
      callCount++;
      return "ignored" as const;
    };

    const child = new LeafWidget();
    const focus = new Focus({ child, focusNode: externalNode, onKey: handler });
    const element = focus.createElement();
    element.mount(undefined);

    // Handler registered — verify
    externalNode._handleKeyEvent(keyEvent("a"));
    assert.equal(callCount, 1);

    // Dispose (unmount triggers state._unmount → dispose)
    element.unmount();

    // Handler should be removed
    callCount = 0;
    externalNode._handleKeyEvent(keyEvent("b"));
    assert.equal(callCount, 0, "handler should be removed after dispose");
  });

  it("registers node with FocusManager", () => {
    const child = new LeafWidget();
    const focus = new Focus({ child });
    const element = focus.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: FocusState })._state;
    const node = state.effectiveFocusNode;

    // Node should be attached (has parent = rootScope)
    assert.ok(node.parent !== null, "node should have a parent after registration");
  });

  it("unregisters node from FocusManager on dispose", () => {
    const child = new LeafWidget();
    const focus = new Focus({ child });
    const element = focus.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: FocusState })._state;
    const node = state.effectiveFocusNode;
    assert.ok(node.parent !== null);

    element.unmount();

    // Node should be detached (parent = null)
    assert.equal(node.parent, null, "node should be detached after unmount");
  });

  it("auto-parents to nearest ancestor FocusState", () => {
    // Outer Focus
    const innerChild = new LeafWidget();
    const innerFocus = new Focus({ child: innerChild });
    const outerFocus = new Focus({ child: innerFocus });

    const outerElement = outerFocus.createElement();
    outerElement.mount(undefined);

    const outerState = (outerElement as unknown as { _state: FocusState })._state;
    const outerNode = outerState.effectiveFocusNode;

    // The outer mount triggers build() which returns innerFocus widget.
    // But we're testing at the unit level — manually mount inner to simulate tree.
    const innerElement = innerFocus.createElement();
    innerElement.mount(outerElement);
    outerElement.addChild(innerElement);

    const innerState = (innerElement as unknown as { _state: FocusState })._state;
    const innerNode = innerState.effectiveFocusNode;

    // Inner node's parent should be outer node (auto-parenting via findAncestorStateOfType)
    assert.equal(innerNode.parent, outerNode, "inner FocusNode should be parented to outer");
  });

  it("defaults: autofocus=false, canRequestFocus=true, skipTraversal=false", () => {
    const child = new LeafWidget();
    const focus = new Focus({ child });
    assert.equal(focus.autofocus, false);
    assert.equal(focus.canRequestFocus, true);
    assert.equal(focus.skipTraversal, false);
    assert.equal(focus.onKey, null);
    assert.equal(focus.onPaste, null);
    assert.equal(focus.onFocusChange, null);
    assert.equal(focus.debugLabel, null);
  });
});
