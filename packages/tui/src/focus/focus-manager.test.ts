/**
 * FocusManager 焦点树管理器测试。
 *
 * 验证焦点管理器单例的完整行为: 单例模式、rootScope 构造、
 * 焦点切换、事件冒泡路由、Tab 导航、焦点历史栈回退和 dispose。
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { KeyEvent, PasteEvent } from "../vt/types.js";
import { FocusManager } from "./focus-manager.js";
import { FocusNode } from "./focus-node.js";

describe("FocusManager", () => {
  let fm: FocusManager;

  beforeEach(() => {
    fm = FocusManager.instance;
  });

  afterEach(() => {
    fm.dispose();
  });

  // ──────────────────────────────────────────────
  // 单例
  // ──────────────────────────────────────────────

  describe("singleton", () => {
    test("instance returns same instance", () => {
      const a = FocusManager.instance;
      const b = FocusManager.instance;
      expect(a).toBe(b);
    });
  });

  // ──────────────────────────────────────────────
  // 构造
  // ──────────────────────────────────────────────

  describe("constructor", () => {
    test("rootScope is created with canRequestFocus=false", () => {
      expect(fm.rootScope).toBeDefined();
      expect(fm.rootScope.canRequestFocus).toBe(false);
    });

    test("primaryFocus is initially null", () => {
      expect(fm.primaryFocus).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // requestFocus
  // ──────────────────────────────────────────────

  describe("requestFocus", () => {
    test("switches primaryFocus and returns true", () => {
      const node = new FocusNode({ debugLabel: "a" });
      fm.registerNode(node);
      const result = fm.requestFocus(node);
      expect(result).toBe(true);
      expect(fm.primaryFocus).toBe(node);
      expect(node.hasPrimaryFocus).toBe(true);
    });

    test("old focus node loses focus when new node gains focus", () => {
      const a = new FocusNode({ debugLabel: "a" });
      const b = new FocusNode({ debugLabel: "b" });
      fm.registerNode(a);
      fm.registerNode(b);

      fm.requestFocus(a);
      expect(a.hasPrimaryFocus).toBe(true);

      fm.requestFocus(b);
      expect(a.hasPrimaryFocus).toBe(false);
      expect(b.hasPrimaryFocus).toBe(true);
      expect(fm.primaryFocus).toBe(b);
    });

    test("returns false for node with canRequestFocus=false", () => {
      const node = new FocusNode({ canRequestFocus: false });
      fm.registerNode(node);
      const result = fm.requestFocus(node);
      expect(result).toBe(false);
      expect(fm.primaryFocus).toBeNull();
    });

    test("requestFocus(null) falls back to previous focusable node", () => {
      const a = new FocusNode({ debugLabel: "a" });
      const b = new FocusNode({ debugLabel: "b" });
      fm.registerNode(a);
      fm.registerNode(b);

      fm.requestFocus(a);
      fm.requestFocus(b);

      // Requesting null should pop b from stack and fall back to a
      fm.requestFocus(null);
      expect(fm.primaryFocus).toBe(a);
    });
  });

  // ──────────────────────────────────────────────
  // handleKeyEvent
  // ──────────────────────────────────────────────

  describe("handleKeyEvent", () => {
    test("bubbles from primaryFocus upward, stops at handled", () => {
      const parentHandled: string[] = [];
      const parent = new FocusNode({
        debugLabel: "parent",
        onKey: (e) => {
          parentHandled.push(e.key);
          return "handled";
        },
      });
      const child = new FocusNode({
        debugLabel: "child",
        onKey: () => "ignored",
      });

      fm.registerNode(parent);
      fm.registerNode(child, parent);
      fm.requestFocus(child);

      const event: KeyEvent = {
        type: "key",
        key: "a",
        modifiers: { shift: false, alt: false, ctrl: false, meta: false },
      };

      const result = fm.handleKeyEvent(event);
      expect(result).toBe(true);
      expect(parentHandled).toEqual(["a"]);
    });

    test("returns false when no primaryFocus", () => {
      const event: KeyEvent = {
        type: "key",
        key: "x",
        modifiers: { shift: false, alt: false, ctrl: false, meta: false },
      };
      expect(fm.handleKeyEvent(event)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // handlePasteEvent
  // ──────────────────────────────────────────────

  describe("handlePasteEvent", () => {
    test("bubbles from primaryFocus upward", () => {
      const pastedTexts: string[] = [];
      const parent = new FocusNode({
        debugLabel: "parent",
        onPaste: (e) => {
          pastedTexts.push(e.text);
          return "handled";
        },
      });
      const child = new FocusNode({ debugLabel: "child" });

      fm.registerNode(parent);
      fm.registerNode(child, parent);
      fm.requestFocus(child);

      const event: PasteEvent = { type: "paste", text: "hello" };
      const result = fm.handlePasteEvent(event);
      expect(result).toBe(true);
      expect(pastedTexts).toEqual(["hello"]);
    });
  });

  // ──────────────────────────────────────────────
  // registerNode / unregisterNode
  // ──────────────────────────────────────────────

  describe("registerNode", () => {
    test("attaches node to rootScope by default", () => {
      const node = new FocusNode({ debugLabel: "a" });
      fm.registerNode(node);
      expect(node.parent).toBe(fm.rootScope);
      expect(fm.rootScope.children.has(node)).toBe(true);
    });

    test("attaches node to specified parent", () => {
      const parent = new FocusNode({ debugLabel: "parent" });
      const child = new FocusNode({ debugLabel: "child" });
      fm.registerNode(parent);
      fm.registerNode(child, parent);
      expect(child.parent).toBe(parent);
      expect(parent.children.has(child)).toBe(true);
    });
  });

  describe("unregisterNode", () => {
    test("removes node and falls back focus if it was primaryFocus", () => {
      const a = new FocusNode({ debugLabel: "a" });
      const b = new FocusNode({ debugLabel: "b" });
      fm.registerNode(a);
      fm.registerNode(b);

      fm.requestFocus(a);
      fm.requestFocus(b);

      // b is primary, unregister it -> should fall back to a
      fm.unregisterNode(b);
      expect(fm.primaryFocus).toBe(a);
    });
  });

  // ──────────────────────────────────────────────
  // focusNext / focusPrevious
  // ──────────────────────────────────────────────

  describe("focusNext", () => {
    test("cycles through focusable nodes", () => {
      const a = new FocusNode({ debugLabel: "a" });
      const b = new FocusNode({ debugLabel: "b" });
      const c = new FocusNode({ debugLabel: "c" });
      fm.registerNode(a);
      fm.registerNode(b);
      fm.registerNode(c);

      fm.requestFocus(a);
      expect(fm.primaryFocus).toBe(a);

      fm.focusNext();
      expect(fm.primaryFocus).toBe(b);

      fm.focusNext();
      expect(fm.primaryFocus).toBe(c);

      // Wrap around
      fm.focusNext();
      expect(fm.primaryFocus).toBe(a);
    });
  });

  describe("focusPrevious", () => {
    test("cycles in reverse through focusable nodes", () => {
      const a = new FocusNode({ debugLabel: "a" });
      const b = new FocusNode({ debugLabel: "b" });
      const c = new FocusNode({ debugLabel: "c" });
      fm.registerNode(a);
      fm.registerNode(b);
      fm.registerNode(c);

      fm.requestFocus(a);
      // Wrap around backward from a -> c
      fm.focusPrevious();
      expect(fm.primaryFocus).toBe(c);

      fm.focusPrevious();
      expect(fm.primaryFocus).toBe(b);
    });
  });

  // ──────────────────────────────────────────────
  // dispose
  // ──────────────────────────────────────────────

  describe("dispose", () => {
    test("clears state and resets singleton", () => {
      const node = new FocusNode({ debugLabel: "a" });
      fm.registerNode(node);
      fm.requestFocus(node);
      expect(fm.primaryFocus).toBe(node);

      fm.dispose();

      // After dispose, instance should create a new FocusManager
      const newFm = FocusManager.instance;
      expect(newFm).not.toBe(fm);
      expect(newFm.primaryFocus).toBeNull();

      // Clean up the new instance
      newFm.dispose();
    });
  });
});
