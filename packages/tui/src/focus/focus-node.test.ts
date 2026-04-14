/**
 * FocusNode 焦点树节点测试。
 *
 * 验证焦点树节点的完整行为: 构造参数、树结构管理、焦点状态、
 * 事件处理、listener 通知和 dispose 清理。
 */
import { describe, test, expect, beforeEach, mock } from "bun:test";
import { FocusNode } from "./focus-node.js";
import type { KeyEvent, PasteEvent } from "../vt/types.js";

describe("FocusNode", () => {
  // 每个测试前重置静态回调
  beforeEach(() => {
    FocusNode.setRequestFocusCallback(null as any);
  });

  // ──────────────────────────────────────────────
  // 构造函数
  // ──────────────────────────────────────────────

  describe("constructor defaults", () => {
    test("canRequestFocus defaults to true", () => {
      const node = new FocusNode();
      expect(node.canRequestFocus).toBe(true);
    });

    test("skipTraversal defaults to false", () => {
      const node = new FocusNode();
      expect(node.skipTraversal).toBe(false);
    });

    test("debugLabel and debugId are correctly set", () => {
      const node = new FocusNode({ debugLabel: "myNode" });
      expect(node.debugLabel).toBe("myNode");
      expect(node.debugId).toMatch(/^focus-\d+$/);
    });

    test("debugLabel defaults to null when not provided", () => {
      const node = new FocusNode();
      expect(node.debugLabel).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // 树结构
  // ──────────────────────────────────────────────

  describe("tree structure", () => {
    test("_attach establishes parent-child relationship", () => {
      const parent = new FocusNode({ debugLabel: "parent" });
      const child = new FocusNode({ debugLabel: "child" });

      child._attach(parent);

      expect(child.parent).toBe(parent);
      expect(parent.children.has(child)).toBe(true);
    });

    test("_attach re-parents node from old parent", () => {
      const oldParent = new FocusNode({ debugLabel: "oldParent" });
      const newParent = new FocusNode({ debugLabel: "newParent" });
      const child = new FocusNode({ debugLabel: "child" });

      child._attach(oldParent);
      child._attach(newParent);

      expect(child.parent).toBe(newParent);
      expect(oldParent.children.has(child)).toBe(false);
      expect(newParent.children.has(child)).toBe(true);
    });

    test("_detach clears parent-child relationship", () => {
      const parent = new FocusNode({ debugLabel: "parent" });
      const child = new FocusNode({ debugLabel: "child" });

      child._attach(parent);
      child._detach();

      expect(child.parent).toBeNull();
      expect(parent.children.has(child)).toBe(false);
    });

    test("_isDescendantOf correctly identifies ancestor relationship", () => {
      const grandparent = new FocusNode({ debugLabel: "gp" });
      const parent = new FocusNode({ debugLabel: "parent" });
      const child = new FocusNode({ debugLabel: "child" });
      const unrelated = new FocusNode({ debugLabel: "unrelated" });

      parent._attach(grandparent);
      child._attach(parent);

      expect(child._isDescendantOf(parent)).toBe(true);
      expect(child._isDescendantOf(grandparent)).toBe(true);
      expect(child._isDescendantOf(unrelated)).toBe(false);
      expect(child._isDescendantOf(null)).toBe(false);
      expect(grandparent._isDescendantOf(child)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // 焦点状态
  // ──────────────────────────────────────────────

  describe("focus state", () => {
    test("_setFocus(true) sets hasPrimaryFocus", () => {
      const node = new FocusNode();
      node._setFocus(true);
      expect(node.hasPrimaryFocus).toBe(true);
    });

    test("_setFocus(false) clears hasPrimaryFocus", () => {
      const node = new FocusNode();
      node._setFocus(true);
      node._setFocus(false);
      expect(node.hasPrimaryFocus).toBe(false);
    });

    test("_setFocus notifies listeners on change", () => {
      const node = new FocusNode();
      const listener = mock(() => {});
      node.addListener(listener);

      node._setFocus(true);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(node);
    });

    test("_setFocus does not notify listeners when value unchanged", () => {
      const node = new FocusNode();
      const listener = mock(() => {});
      node.addListener(listener);

      // Already false by default
      node._setFocus(false);

      expect(listener).not.toHaveBeenCalled();
    });

    test("_setFocus notifies ancestor listeners on focus change", () => {
      const grandparent = new FocusNode({ debugLabel: "gp" });
      const parent = new FocusNode({ debugLabel: "parent" });
      const child = new FocusNode({ debugLabel: "child" });

      parent._attach(grandparent);
      child._attach(parent);

      const gpListener = mock(() => {});
      const parentListener = mock(() => {});
      grandparent.addListener(gpListener);
      parent.addListener(parentListener);

      child._setFocus(true);

      expect(parentListener).toHaveBeenCalledTimes(1);
      expect(gpListener).toHaveBeenCalledTimes(1);
    });

    test("canRequestFocus set to false auto-unfocuses", () => {
      const node = new FocusNode();
      const unfocusCalled = mock(() => true);
      FocusNode.setRequestFocusCallback(unfocusCalled as any);

      node._setFocus(true);
      node.canRequestFocus = false;

      // unfocus() calls the static callback with null
      expect(unfocusCalled).toHaveBeenCalledWith(null);
    });
  });

  // ──────────────────────────────────────────────
  // 事件处理
  // ──────────────────────────────────────────────

  describe("event handling", () => {
    test("_handleKeyEvent calls registered key handler and returns result", () => {
      const handler = mock(() => "handled" as const);
      const node = new FocusNode({ onKey: handler });
      const event: KeyEvent = {
        type: "key",
        key: "a",
        modifiers: { shift: false, alt: false, ctrl: false, meta: false },
      };

      const result = node._handleKeyEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(result).toBe("handled");
    });

    test("_handleKeyEvent returns 'ignored' when no handler matches", () => {
      const node = new FocusNode();
      const event: KeyEvent = {
        type: "key",
        key: "a",
        modifiers: { shift: false, alt: false, ctrl: false, meta: false },
      };

      const result = node._handleKeyEvent(event);
      expect(result).toBe("ignored");
    });

    test("_handlePasteEvent calls onPaste callback", () => {
      const pasteHandler = mock(() => "handled" as const);
      const node = new FocusNode({ onPaste: pasteHandler });
      const event: PasteEvent = { type: "paste", text: "hello" };

      const result = node._handlePasteEvent(event);

      expect(pasteHandler).toHaveBeenCalledWith(event);
      expect(result).toBe("handled");
    });

    test("_handlePasteEvent returns 'ignored' when no handler", () => {
      const node = new FocusNode();
      const event: PasteEvent = { type: "paste", text: "hello" };

      const result = node._handlePasteEvent(event);
      expect(result).toBe("ignored");
    });
  });

  // ──────────────────────────────────────────────
  // requestFocus / unfocus 委托
  // ──────────────────────────────────────────────

  describe("requestFocus delegation", () => {
    test("requestFocus delegates to static _requestFocusCallback", () => {
      const callback = mock(() => true);
      FocusNode.setRequestFocusCallback(callback as any);

      const node = new FocusNode();
      const result = node.requestFocus();

      expect(callback).toHaveBeenCalledWith(node);
      expect(result).toBe(true);
    });

    test("requestFocus returns false when canRequestFocus is false", () => {
      const callback = mock(() => true);
      FocusNode.setRequestFocusCallback(callback as any);

      const node = new FocusNode({ canRequestFocus: false });
      const result = node.requestFocus();

      expect(callback).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test("requestFocus returns false when no callback set", () => {
      const node = new FocusNode();
      const result = node.requestFocus();
      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // dispose
  // ──────────────────────────────────────────────

  describe("dispose", () => {
    test("dispose clears all state and relationships", () => {
      const parent = new FocusNode({ debugLabel: "parent" });
      const child1 = new FocusNode({ debugLabel: "child1" });
      const child2 = new FocusNode({ debugLabel: "child2" });
      const listener = mock(() => {});

      child1._attach(parent);
      child2._attach(parent);
      parent.addListener(listener);

      parent.dispose();

      // Parent detached from its parent (had none, so no effect)
      // Children should be detached
      expect(child1.parent).toBeNull();
      expect(child2.parent).toBeNull();
      expect(parent.children.size).toBe(0);

      // Listeners cleared - should not be called on further changes
      parent._setFocus(true);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // Listener management
  // ──────────────────────────────────────────────

  describe("listener management", () => {
    test("removeListener stops notifications", () => {
      const node = new FocusNode();
      const listener = mock(() => {});

      node.addListener(listener);
      node._setFocus(true);
      expect(listener).toHaveBeenCalledTimes(1);

      node.removeListener(listener);
      node._setFocus(false);
      expect(listener).toHaveBeenCalledTimes(1); // no additional call
    });
  });
});
