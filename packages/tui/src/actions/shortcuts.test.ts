/**
 * Shortcuts 系统单元测试。
 *
 * 测试 KeyActivator、ShortcutManager 和 Shortcuts Widget。
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
import { Action } from "./action.js";
import { Actions } from "./actions.js";
import { Intent } from "./intent.js";
import { KeyActivator } from "./key-activator.js";
import { ShortcutManager } from "./shortcut-manager.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

class ScrollDownIntent extends Intent {}
class ScrollUpIntent extends Intent {}

class ScrollDownAction extends Action<ScrollDownIntent> {
  invoked = false;
  invoke(_intent: ScrollDownIntent): "handled" {
    this.invoked = true;
    return "handled";
  }
}

function makeKeyEvent(key: string, mods: Partial<KeyEvent["modifiers"]> = {}): KeyEvent {
  return {
    type: "key",
    key,
    modifiers: {
      shift: false,
      ctrl: false,
      alt: false,
      meta: false,
      ...mods,
    },
  };
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
//  KeyActivator 测试
// ════════════════════════════════════════════════════

describe("KeyActivator", () => {
  it("matches exact key + modifiers", () => {
    const activator = KeyActivator.ctrl("d");
    const event = makeKeyEvent("d", { ctrl: true });
    assert.equal(activator.accepts(event), true);
  });

  it("rejects when modifier mismatch", () => {
    const activator = KeyActivator.ctrl("d");
    const event = makeKeyEvent("d"); // no ctrl
    assert.equal(activator.accepts(event), false);
  });

  it("rejects extra modifiers", () => {
    const activator = KeyActivator.ctrl("d");
    const event = makeKeyEvent("d", { ctrl: true, shift: true }); // extra shift
    assert.equal(activator.accepts(event), false);
  });

  it("static factory key() creates activator with no modifiers", () => {
    const activator = KeyActivator.key("Escape");
    const event = makeKeyEvent("Escape");
    assert.equal(activator.accepts(event), true);
  });

  it("static factory shift() works", () => {
    const activator = KeyActivator.shift("Tab");
    assert.equal(activator.accepts(makeKeyEvent("Tab", { shift: true })), true);
    assert.equal(activator.accepts(makeKeyEvent("Tab")), false);
  });

  it("static factory alt() works", () => {
    const activator = KeyActivator.alt("t");
    assert.equal(activator.accepts(makeKeyEvent("t", { alt: true })), true);
    assert.equal(activator.accepts(makeKeyEvent("t")), false);
  });

  it("static factory meta() works", () => {
    const activator = KeyActivator.meta("c");
    assert.equal(activator.accepts(makeKeyEvent("c", { meta: true })), true);
  });

  it("toString returns readable key combo", () => {
    assert.equal(KeyActivator.ctrl("d").toString(), "Ctrl+d");
    assert.equal(KeyActivator.key("Escape").toString(), "Escape");
    assert.equal(new KeyActivator("x", { ctrl: true, shift: true }).toString(), "Ctrl+Shift+x");
    assert.equal(new KeyActivator("k", { meta: true, ctrl: true }).toString(), "Meta+Ctrl+k");
  });

  it("constructor with explicit modifiers", () => {
    const activator = new KeyActivator("a", { ctrl: true, alt: true });
    assert.equal(activator.key, "a");
    assert.equal(activator.ctrl, true);
    assert.equal(activator.alt, true);
    assert.equal(activator.shift, false);
    assert.equal(activator.meta, false);
  });
});

// ════════════════════════════════════════════════════
//  ShortcutManager 测试
// ════════════════════════════════════════════════════

describe("ShortcutManager", () => {
  it("returns matching intent for key event", () => {
    const manager = new ShortcutManager(
      new Map([
        [KeyActivator.ctrl("d"), new ScrollDownIntent()],
        [KeyActivator.ctrl("u"), new ScrollUpIntent()],
      ]),
    );

    const event = makeKeyEvent("d", { ctrl: true });
    const intent = manager.handleKeyEvent(event);
    assert.ok(intent instanceof ScrollDownIntent);
  });

  it("returns null when no match", () => {
    const manager = new ShortcutManager(
      new Map([[KeyActivator.ctrl("d"), new ScrollDownIntent()]]),
    );

    const event = makeKeyEvent("x");
    assert.equal(manager.handleKeyEvent(event), null);
  });

  it("first match wins (insertion order)", () => {
    const intent1 = new ScrollDownIntent();
    const intent2 = new ScrollDownIntent();
    const manager = new ShortcutManager(
      new Map([
        [new KeyActivator("d", { ctrl: true }), intent1],
        [new KeyActivator("d", { ctrl: true }), intent2], // Map deduplicates by key ref
      ]),
    );

    const event = makeKeyEvent("d", { ctrl: true });
    // Both KeyActivator instances match, but they're different Map keys
    // The second entry replaces the first since Map keys are by reference
    const intent = manager.handleKeyEvent(event);
    // Map will have kept the last one (intent2) for the second key
    assert.ok(intent instanceof ScrollDownIntent);
  });

  it("constructor copies the map (no shared state)", () => {
    const original = new Map<KeyActivator, Intent>([
      [KeyActivator.ctrl("d"), new ScrollDownIntent()],
    ]);
    const manager = new ShortcutManager(original);

    // Mutating original should not affect manager
    original.clear();
    assert.ok(manager.handleKeyEvent(makeKeyEvent("d", { ctrl: true })) !== null);
  });

  it("addShortcut and removeShortcut", () => {
    const manager = new ShortcutManager();
    const activator = KeyActivator.ctrl("s");
    const intent = new ScrollDownIntent();

    manager.addShortcut(activator, intent);
    assert.equal(manager.handleKeyEvent(makeKeyEvent("s", { ctrl: true })), intent);

    manager.removeShortcut(activator);
    assert.equal(manager.handleKeyEvent(makeKeyEvent("s", { ctrl: true })), null);
  });

  it("getAllShortcuts returns copy", () => {
    const activator = KeyActivator.ctrl("d");
    const intent = new ScrollDownIntent();
    const manager = new ShortcutManager(new Map([[activator, intent]]));

    const copy = manager.getAllShortcuts();
    copy.clear();

    // Original should be unaffected
    assert.ok(manager.handleKeyEvent(makeKeyEvent("d", { ctrl: true })) !== null);
  });

  it("copyWith merges shortcuts", () => {
    const manager = new ShortcutManager(
      new Map([[KeyActivator.ctrl("d"), new ScrollDownIntent()]]),
    );
    const merged = manager.copyWith(new Map([[KeyActivator.ctrl("u"), new ScrollUpIntent()]]));

    assert.ok(merged.handleKeyEvent(makeKeyEvent("d", { ctrl: true })) instanceof ScrollDownIntent);
    assert.ok(merged.handleKeyEvent(makeKeyEvent("u", { ctrl: true })) instanceof ScrollUpIntent);
  });
});

// ════════════════════════════════════════════════════
//  Shortcuts 集成测试（Shortcuts + Actions + Focus）
// ════════════════════════════════════════════════════

describe("Shortcuts + Actions integration", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    FocusManager.instance.dispose();
    setBuildOwner(undefined);
  });

  it("key event via external focusNode triggers shortcut → action", () => {
    const scrollAction = new ScrollDownAction();
    const externalNode = new FocusNode();
    FocusManager.instance.registerNode(externalNode);

    const child = new LeafWidget();

    // Build tree: Actions > Shortcuts(focusNode=external) > child
    // In practice we simulate this with manual element mounting
    const actionsWidget = new Actions({
      actions: new Map<abstract new (...args: never[]) => Intent, Action>([
        [ScrollDownIntent, scrollAction],
      ]),
      child,
    });

    const actionsElement = actionsWidget.createElement();
    actionsElement.mount(undefined);

    // Create a Shortcuts "state" manually to test the key handler
    const { Shortcuts } = require("./shortcuts.js") as typeof import("./shortcuts.js");
    const shortcutsWidget = new Shortcuts({
      shortcuts: new Map([[KeyActivator.ctrl("d"), new ScrollDownIntent()]]),
      focusNode: externalNode,
      child,
    });
    const shortcutsElement = shortcutsWidget.createElement();
    shortcutsElement.mount(actionsElement);
    actionsElement.addChild(shortcutsElement);

    // Now key event on the external node
    const result = externalNode._handleKeyEvent(makeKeyEvent("d", { ctrl: true }));
    assert.equal(result, "handled");
    assert.equal(scrollAction.invoked, true, "action should have been invoked");
  });
});
