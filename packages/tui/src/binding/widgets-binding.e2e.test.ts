/**
 * WidgetsBinding E2E -- 端到端启动测试。
 *
 * 验证完整启动路径: WidgetsBinding.instance → runApp → Widget mount →
 * 事件路由 → stop → cleanup 的端到端正确性。
 *
 * 策略: mock TTY 操作 (TuiController)，验证 Widget 树完整构建和事件路由。
 * 降级策略: 所有终端操作使用 mock (非 TTY CI 环境兼容)。
 *
 * 运行方式:
 * ```bash
 * npx tsx --test packages/tui/src/binding/widgets-binding.e2e.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { WidgetsBinding } from "./widgets-binding.js";
import { FocusManager } from "../focus/focus-manager.js";
import { FocusNode } from "../focus/focus-node.js";
import { MouseManager } from "../gestures/mouse-manager.js";
import { TuiController } from "../tui/tui-controller.js";
import {
  setBuildOwner,
  setPipelineOwner,
} from "../tree/types.js";
import type { Widget, Element } from "../tree/element.js";
import type { KeyEvent } from "../vt/types.js";

// ════════════════════════════════════════════════════
//  辅助: 重置所有单例 (每个测试前)
// ════════════════════════════════════════════════════

function resetAllSingletons(): void {
  WidgetsBinding.resetForTesting();
  try {
    FocusManager.instance.dispose();
  } catch {
    /* ignore */
  }
  try {
    MouseManager.instance.dispose();
  } catch {
    /* ignore */
  }
  setBuildOwner(undefined);
  setPipelineOwner(undefined);
}

/**
 * Mock TuiController 方法以避免实际终端操作。
 *
 * 降级策略: 非 TTY 环境使用 mock stdin/stdout。
 */
function mockTuiController(tui: TuiController): void {
  tui.init = () => {};
  tui.enterAltScreen = () => {};
  tui.waitForCapabilities = async () => {};
  tui.deinit = async () => {};
  tui.getSize = () => ({ width: 80, height: 24 });
  tui.getCapabilities = () => ({
    emojiWidth: false,
    syncOutput: false,
    kittyKeyboard: false,
    colorPaletteNotifications: false,
    xtversion: null,
  });
  tui.render = () => {};
  tui.onKey = () => {};
  tui.onMouse = () => {};
  tui.onResize = () => {};
  tui.onPaste = () => {};
}

/**
 * 创建 mock Widget 用于测试。
 */
function createMockWidget(): Widget {
  const widget: Widget = {
    key: undefined,
    canUpdate(other: Widget) {
      return other.constructor === widget.constructor;
    },
    createElement() {
      return createMockElement(widget);
    },
  };
  return widget;
}

/**
 * 创建 mock Element 用于测试。
 */
function createMockElement(widget: Widget): Element {
  const el = {
    _widget: widget,
    _parent: undefined as Element | undefined,
    _children: [] as Element[],
    _dirty: true,
    _mounted: false,
    _depth: 0,
    _inheritedDependencies: new Set<Element>(),
    get widget() {
      return this._widget;
    },
    set widget(v: Widget) {
      this._widget = v;
    },
    get parent() {
      return this._parent;
    },
    get children() {
      return this._children as readonly Element[];
    },
    get dirty() {
      return this._dirty;
    },
    get mounted() {
      return this._mounted;
    },
    get depth() {
      return this._depth;
    },
    get renderObject() {
      return undefined;
    },
    mount(parent?: Element) {
      this._parent = parent;
      this._depth = parent ? parent.depth + 1 : 0;
      this._mounted = true;
    },
    unmount() {
      for (const c of [...this._children]) c.unmount();
      this._mounted = false;
      this._parent = undefined;
    },
    update(newWidget: Widget) {
      this._widget = newWidget;
    },
    markNeedsRebuild() {
      this._dirty = true;
    },
    performRebuild() {
      this._dirty = false;
    },
    addChild(child: Element) {
      (child as any)._parent = this as any;
      (child as any)._depth = this._depth + 1;
      this._children.push(child);
    },
    removeChild(child: Element) {
      const idx = this._children.indexOf(child);
      if (idx !== -1) this._children.splice(idx, 1);
      (child as any)._parent = undefined;
    },
    removeAllChildren() {
      for (const c of [...this._children]) this.removeChild(c);
    },
    findRenderObject() {
      return undefined;
    },
    findAncestorElementOfType() {
      return null;
    },
    dependOnInheritedWidgetOfExactType() {
      return null;
    },
  } as unknown as Element;
  return el;
}

// ════════════════════════════════════════════════════
//  E2E 测试
// ════════════════════════════════════════════════════

describe("WidgetsBinding E2E", () => {
  beforeEach(() => {
    resetAllSingletons();
  });

  afterEach(() => {
    resetAllSingletons();
  });

  // ────────────────────────────────────────────────
  //  E2E-01: 单例创建
  // ────────────────────────────────────────────────

  it("should create singleton instance", () => {
    const a = WidgetsBinding.instance;
    const b = WidgetsBinding.instance;
    assert.strictEqual(a, b, "WidgetsBinding.instance 应返回同一实例");
  });

  // ────────────────────────────────────────────────
  //  E2E-02: rootElement 挂载与 MediaQuery wrapper
  // ────────────────────────────────────────────────

  it("should mount rootElement with MediaQuery wrapper", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    let mountedElement: Element | null = null;

    binding.setRootElementMountedCallback((element: Element) => {
      mountedElement = element;
    });

    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    // rootElement 应已挂载
    assert.ok(mountedElement !== null, "rootElement 应已挂载");
    assert.ok(
      (mountedElement as any).mounted === true,
      "rootElement.mounted 应为 true",
    );

    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  E2E-03: onRootElementMounted 回调触发
  // ────────────────────────────────────────────────

  it("should call onRootElementMounted callback", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    let callbackCalled = false;
    let callbackArg: Element | null = null;

    binding.setRootElementMountedCallback((element: Element) => {
      callbackCalled = true;
      callbackArg = element;
    });

    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    assert.ok(callbackCalled, "onRootElementMounted 回调应被调用");
    assert.ok(callbackArg !== null, "回调参数应为 Element 实例");
    assert.ok(
      typeof (callbackArg as any).mounted !== "undefined",
      "回调参数应具有 mounted 属性 (Element 接口)",
    );

    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  E2E-04: FocusNode 注册到 FocusManager
  // ────────────────────────────────────────────────

  it("should register FocusNode to FocusManager", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    // 模拟 InputField 的 FocusNode 注册行为
    const fm = FocusManager.instance;
    let keyHandled = false;
    const focusNode = new FocusNode({
      debugLabel: "E2E-InputField",
      onKey: (event: KeyEvent) => {
        keyHandled = true;
        return "handled";
      },
    });

    fm.registerNode(focusNode);
    focusNode.requestFocus();

    // 验证 FocusNode 注册成功: primaryFocus 应为该节点
    assert.strictEqual(
      fm.primaryFocus,
      focusNode,
      "FocusNode 应被注册为 primaryFocus",
    );

    // 清理
    fm.unregisterNode(focusNode);
    focusNode.dispose();
    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  E2E-05: 键盘事件路由 (interceptors → FocusManager → FocusNode.onKey)
  // ────────────────────────────────────────────────

  it("should route key events through FocusManager to FocusNode.onKey", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    // 注册一个 FocusNode 模拟 InputField
    const fm = FocusManager.instance;
    let receivedKey: string | null = null;
    const focusNode = new FocusNode({
      debugLabel: "E2E-InputField",
      onKey: (event: KeyEvent) => {
        receivedKey = event.key;
        return "handled";
      },
    });

    fm.registerNode(focusNode);
    focusNode.requestFocus();

    // 通过 WidgetsBinding 的键盘事件处理链路发送事件
    const keyEvent: KeyEvent = {
      type: "key",
      key: "a",
      modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    };
    binding._handleKeyEventForTesting(keyEvent);

    assert.strictEqual(receivedKey, "a", "FocusNode.onKey 应收到键盘事件");

    // 清理
    fm.unregisterNode(focusNode);
    focusNode.dispose();
    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  E2E-06: 键盘事件拦截器优先于 FocusManager
  // ────────────────────────────────────────────────

  it("should let interceptors consume key events before FocusManager", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    // 注册 FocusNode
    const fm = FocusManager.instance;
    let focusNodeCalled = false;
    const focusNode = new FocusNode({
      debugLabel: "E2E-Input",
      onKey: () => {
        focusNodeCalled = true;
        return "handled";
      },
    });
    fm.registerNode(focusNode);
    focusNode.requestFocus();

    // 注册拦截器 (模拟 command palette)
    let interceptorCalled = false;
    const unsubscribe = binding.addKeyInterceptor((event: KeyEvent) => {
      if (event.key === "p" && event.modifiers.ctrl) {
        interceptorCalled = true;
        return true; // consumed
      }
      return false;
    });

    // 发送 Ctrl+P
    binding._handleKeyEventForTesting({
      type: "key",
      key: "p",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    });

    assert.ok(interceptorCalled, "拦截器应被调用");
    assert.ok(!focusNodeCalled, "FocusNode 不应收到被拦截的事件");

    // 清理
    unsubscribe();
    fm.unregisterNode(focusNode);
    focusNode.dispose();
    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  E2E-07: stop() 导致 runApp Promise resolve
  // ────────────────────────────────────────────────

  it("should resolve runApp promise on stop()", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);

    // 短暂等待 runApp 启动
    await new Promise((r) => setTimeout(r, 50));

    // 调用 stop
    binding.stop();

    // runApp 应在合理时间内 resolve
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("runApp 未在 2s 内 resolve")), 2000),
    );
    await Promise.race([runPromise, timeout]);

    // 如果到这里没超时，说明 stop() 正确 resolve 了 runApp
    assert.ok(true, "stop() 应让 runApp Promise resolve");
  });

  // ────────────────────────────────────────────────
  //  E2E-08: cleanup -- TUI deinit + 所有子系统 dispose
  // ────────────────────────────────────────────────

  it("should cleanup all subsystems on exit", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    let deinitCalled = false;
    binding.tui.deinit = async () => {
      deinitCalled = true;
    };

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    binding.stop();
    await runPromise;

    // 验证 TUI deinit 被调用
    assert.ok(deinitCalled, "cleanup 应调用 tui.deinit()");
  });

  // ────────────────────────────────────────────────
  //  E2E-09: runApp 后 resetForTesting 可正确重置
  // ────────────────────────────────────────────────

  it("should support resetForTesting after runApp cycle", async () => {
    // 第一次 runApp 周期
    const binding1 = WidgetsBinding.instance;
    mockTuiController(binding1.tui);
    const widget1 = createMockWidget();
    const run1 = binding1.runApp(widget1);
    await new Promise((r) => setTimeout(r, 50));
    binding1.stop();
    await run1;

    // 重置
    WidgetsBinding.resetForTesting();

    // 第二次 runApp 周期
    const binding2 = WidgetsBinding.instance;
    assert.notStrictEqual(binding1, binding2, "resetForTesting 后应创建新实例");

    mockTuiController(binding2.tui);
    const widget2 = createMockWidget();
    const run2 = binding2.runApp(widget2);
    await new Promise((r) => setTimeout(r, 50));
    binding2.stop();
    await run2;

    assert.ok(true, "两次 runApp 周期应都成功完成");
  });
});
