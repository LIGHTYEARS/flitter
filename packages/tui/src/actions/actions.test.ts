/**
 * Actions 系统单元测试。
 *
 * 测试 Intent/Action/ActionDispatcher/Actions Widget
 * 的创建、查找和调用行为。
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Widget } from "../tree/element.js";
import { Element } from "../tree/element.js";
import type { BuildOwnerLike } from "../tree/types.js";
import { setBuildOwner } from "../tree/types.js";
import { Action } from "./action.js";
import { ActionDispatcher } from "./action-dispatcher.js";
import { Actions, ActionsState } from "./actions.js";
import { Intent } from "./intent.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

class TestIntent extends Intent {}
class OtherIntent extends Intent {}

class TestAction extends Action<TestIntent> {
  invoked = false;
  lastIntent: TestIntent | null = null;
  invoke(intent: TestIntent): "handled" | "ignored" | void {
    this.invoked = true;
    this.lastIntent = intent;
  }
}

class DisabledAction extends Action<TestIntent> {
  override isEnabled(_intent: TestIntent): boolean {
    return false;
  }
  invoke(_intent: TestIntent): void {
    // should never be called
  }
}

/** 最小 Widget/Element for building tree */
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

// ════════════════════════════════════════════════════
//  Intent 测试
// ════════════════════════════════════════════════════

describe("Intent", () => {
  it("subclass identity distinguishes intent types", () => {
    const test = new TestIntent();
    const other = new OtherIntent();
    assert.notEqual(test.constructor, other.constructor);
    assert.equal(test.constructor, TestIntent);
    assert.equal(other.constructor, OtherIntent);
  });
});

// ════════════════════════════════════════════════════
//  Action 测试
// ════════════════════════════════════════════════════

describe("Action", () => {
  it("isEnabled defaults to true", () => {
    const action = new TestAction();
    assert.equal(action.isEnabled(new TestIntent()), true);
  });

  it("consumesKey defaults to true", () => {
    const action = new TestAction();
    assert.equal(action.consumesKey(new TestIntent()), true);
  });

  it("toString includes class name", () => {
    const action = new TestAction();
    assert.equal(action.toString(), "TestAction()");
  });
});

// ════════════════════════════════════════════════════
//  ActionDispatcher 测试
// ════════════════════════════════════════════════════

describe("ActionDispatcher", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  it("finds action from nearest ancestor Actions widget", () => {
    const action = new TestAction();
    const actionsMap = new Map<abstract new (...args: never[]) => Intent, Action>([
      [TestIntent, action],
    ]);

    const child = new LeafWidget();
    const actionsWidget = new Actions({ actions: actionsMap, child });

    // Mount the Actions element
    const actionsElement = actionsWidget.createElement();
    actionsElement.mount(undefined);

    // Create and mount leaf under the Actions element
    const leafElement = child.createElement();
    leafElement.mount(actionsElement);
    actionsElement.addChild(leafElement);

    // Find action from leaf's context
    const dispatcher = new ActionDispatcher();
    const result = dispatcher.findAction(
      new TestIntent(),
      leafElement as unknown as import("../tree/element.js").BuildContext,
    );

    assert.ok(result !== null);
    assert.equal(result!.enabled, true);
  });

  it("returns null when no ancestor has matching action", () => {
    const child = new LeafWidget();
    const element = child.createElement();
    element.mount(undefined);

    const dispatcher = new ActionDispatcher();
    const result = dispatcher.findAction(
      new TestIntent(),
      element as unknown as import("../tree/element.js").BuildContext,
    );
    assert.equal(result, null);
  });

  it("nearest ancestor Actions wins (shadowing)", () => {
    const outerAction = new TestAction();
    const innerAction = new TestAction();

    const leaf = new LeafWidget();
    const innerActions = new Actions({
      actions: new Map<abstract new (...args: never[]) => Intent, Action>([
        [TestIntent, innerAction],
      ]),
      child: leaf,
    });
    const outerActions = new Actions({
      actions: new Map<abstract new (...args: never[]) => Intent, Action>([
        [TestIntent, outerAction],
      ]),
      child: innerActions,
    });

    // Mount outer
    const outerElement = outerActions.createElement();
    outerElement.mount(undefined);

    // Mount inner under outer
    const innerElement = innerActions.createElement();
    innerElement.mount(outerElement);
    outerElement.addChild(innerElement);

    // Mount leaf under inner
    const leafElement = leaf.createElement();
    leafElement.mount(innerElement);
    innerElement.addChild(leafElement);

    // Dispatch from leaf
    const dispatcher = new ActionDispatcher();
    dispatcher.invokeAction(
      new TestIntent(),
      leafElement as unknown as import("../tree/element.js").BuildContext,
    );

    assert.equal(innerAction.invoked, true, "inner action should be invoked");
    assert.equal(outerAction.invoked, false, "outer action should NOT be invoked");
  });

  it("invokeAction returns null when action is disabled", () => {
    const disabledAction = new DisabledAction();
    const actionsMap = new Map<abstract new (...args: never[]) => Intent, Action>([
      [TestIntent, disabledAction],
    ]);

    const child = new LeafWidget();
    const actionsWidget = new Actions({ actions: actionsMap, child });

    const actionsElement = actionsWidget.createElement();
    actionsElement.mount(undefined);

    const leafElement = child.createElement();
    leafElement.mount(actionsElement);
    actionsElement.addChild(leafElement);

    const dispatcher = new ActionDispatcher();
    const result = dispatcher.invokeAction(
      new TestIntent(),
      leafElement as unknown as import("../tree/element.js").BuildContext,
    );

    assert.equal(result, null, "should not invoke disabled action");
  });

  it("disabled action stops ancestor search", () => {
    // Inner has disabled action, outer has enabled action
    const innerDisabled = new DisabledAction();
    const outerEnabled = new TestAction();

    const leaf = new LeafWidget();
    const innerActions = new Actions({
      actions: new Map<abstract new (...args: never[]) => Intent, Action>([
        [TestIntent, innerDisabled],
      ]),
      child: leaf,
    });
    const outerActions = new Actions({
      actions: new Map<abstract new (...args: never[]) => Intent, Action>([
        [TestIntent, outerEnabled],
      ]),
      child: innerActions,
    });

    const outerElement = outerActions.createElement();
    outerElement.mount(undefined);

    const innerElement = innerActions.createElement();
    innerElement.mount(outerElement);
    outerElement.addChild(innerElement);

    const leafElement = leaf.createElement();
    leafElement.mount(innerElement);
    innerElement.addChild(leafElement);

    // findAction should stop at inner (disabled) and NOT reach outer
    const dispatcher = new ActionDispatcher();
    const result = dispatcher.findAction(
      new TestIntent(),
      leafElement as unknown as import("../tree/element.js").BuildContext,
    );

    assert.ok(result !== null);
    assert.equal(result!.enabled, false, "should find disabled action but report enabled=false");
    assert.equal(outerEnabled.invoked, false, "outer action should not be invoked");
  });
});

// ════════════════════════════════════════════════════
//  ActionsState 测试
// ════════════════════════════════════════════════════

describe("ActionsState", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  it("getActionForIntent uses constructor as key", () => {
    const action = new TestAction();
    const actionsMap = new Map<abstract new (...args: never[]) => Intent, Action>([
      [TestIntent, action],
    ]);

    const child = new LeafWidget();
    const actionsWidget = new Actions({ actions: actionsMap, child });

    const element = actionsWidget.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ActionsState })._state;
    assert.ok(state instanceof ActionsState);

    const found = state.getActionForIntent(new TestIntent());
    assert.equal(found, action);

    const notFound = state.getActionForIntent(new OtherIntent());
    assert.equal(notFound, null);
  });
});
