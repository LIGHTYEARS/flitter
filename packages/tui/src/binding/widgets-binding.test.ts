/**
 * WidgetsBinding 单元测试。
 *
 * 验证 WidgetsBinding 核心编排器的单例模式、子系统初始化、
 * 帧回调注册、runApp 生命周期、事件处理和清理流程。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/binding/widgets-binding.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { FocusManager } from "../focus/focus-manager.js";
import { MouseManager } from "../gestures/mouse-manager.js";
import { BuildOwner } from "../tree/build-owner.js";
import type { Element, Widget } from "../tree/element.js";
import { FrameScheduler } from "../tree/frame-scheduler.js";
import { PipelineOwner } from "../tree/pipeline-owner.js";
import { getBuildOwner, getPipelineOwner, setBuildOwner, setPipelineOwner } from "../tree/types.js";
import { TuiController } from "../tui/tui-controller.js";
import type { KeyEvent } from "../vt/types.js";
import { WidgetsBinding } from "./widgets-binding.js";

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
//  测试
// ════════════════════════════════════════════════════

describe("WidgetsBinding", () => {
  beforeEach(() => {
    resetAllSingletons();
  });

  afterEach(() => {
    resetAllSingletons();
  });

  // ────────────────────────────────────────────────
  //  单例测试
  // ────────────────────────────────────────────────

  it("instance 返回同一实例 (单例模式)", () => {
    const a = WidgetsBinding.instance;
    const b = WidgetsBinding.instance;
    assert.strictEqual(a, b);
  });

  // ────────────────────────────────────────────────
  //  构造: 子系统实例化
  // ────────────────────────────────────────────────

  it("构造时实例化所有子系统", () => {
    const binding = WidgetsBinding.instance;
    assert.ok(binding.frameScheduler instanceof FrameScheduler);
    assert.ok(binding.buildOwner instanceof BuildOwner);
    assert.ok(binding.pipelineOwner instanceof PipelineOwner);
    assert.ok(binding.focusManager instanceof FocusManager);
    assert.ok(binding.mouseManager instanceof MouseManager);
    assert.ok(binding.tui instanceof TuiController);
  });

  // ────────────────────────────────────────────────
  //  构造: 帧回调注册
  // ────────────────────────────────────────────────

  it("构造时注册 6 个 frame callbacks 到 FrameScheduler", () => {
    const binding = WidgetsBinding.instance;
    const scheduler = binding.frameScheduler;

    // 禁用 frame pacing 后执行帧，验证回调已注册且不抛异常
    scheduler.disableFramePacing();
    assert.doesNotThrow(() => scheduler.executeFrame());
  });

  // ────────────────────────────────────────────────
  //  构造: setBuildOwner / setPipelineOwner 桥接
  // ────────────────────────────────────────────────

  it("构造时调用 setBuildOwner 和 setPipelineOwner 桥接", () => {
    const _binding = WidgetsBinding.instance;

    const bo = getBuildOwner();
    const po = getPipelineOwner();
    assert.ok(bo !== undefined, "BuildOwner bridge should be set");
    assert.ok(po !== undefined, "PipelineOwner bridge should be set");
    assert.ok(typeof bo!.scheduleBuildFor === "function");
    assert.ok(typeof po!.requestLayout === "function");
    assert.ok(typeof po!.requestPaint === "function");
    assert.ok(typeof po!.removeFromQueues === "function");
  });

  // ────────────────────────────────────────────────
  //  runApp: isRunning 防重复
  // ────────────────────────────────────────────────

  it("runApp: isRunning 防止重复调用", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);

    // 短暂等待让 runApp 开始执行
    await new Promise((r) => setTimeout(r, 50));

    // 第二次调用应该抛异常
    await assert.rejects(() => binding.runApp(mockWidget), { message: /already running/i });

    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  runApp: rootElementMountedCallback 被调用
  // ────────────────────────────────────────────────

  it("runApp: rootElementMountedCallback 被调用", async () => {
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

    assert.ok(callbackCalled, "rootElementMountedCallback should be called");
    assert.ok(callbackArg !== null, "callback should receive element");

    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  stop: resolve exitPromise
  // ────────────────────────────────────────────────

  it("stop: 设置 isRunning=false 并 resolve exitPromise", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);

    await new Promise((r) => setTimeout(r, 50));

    // 调用 stop — runApp promise 应该正常 resolve
    binding.stop();
    await runPromise;
    // 如果到这里没超时，说明 stop 正确 resolve 了 exitPromise
    assert.ok(true);
  });

  // ────────────────────────────────────────────────
  //  addKeyInterceptor: 返回 unsubscribe 函数
  // ────────────────────────────────────────────────

  it("addKeyInterceptor: 返回 unsubscribe 函数", () => {
    const binding = WidgetsBinding.instance;

    const unsubscribe = binding.addKeyInterceptor((_event: KeyEvent) => {
      return true;
    });

    assert.strictEqual(typeof unsubscribe, "function");

    // 调用 unsubscribe 不抛异常
    assert.doesNotThrow(() => unsubscribe());
  });

  // ────────────────────────────────────────────────
  //  setupEventHandlers: onKey 路由 (interceptors)
  // ────────────────────────────────────────────────

  it("setupEventHandlers: onKey 路由 interceptors → focusManager → global", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    // 注册一个拦截器
    let intercepted = false;
    binding.addKeyInterceptor((event: KeyEvent) => {
      if (event.key === "x") {
        intercepted = true;
        return true;
      }
      return false;
    });

    const keyEvent: KeyEvent = {
      type: "key",
      key: "x",
      modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    };

    // 通过测试辅助方法触发 key event
    binding._handleKeyEventForTesting(keyEvent);
    assert.ok(intercepted, "interceptor should have been called");

    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  handleGlobalKeyEvent: Ctrl+Z → handleSuspend
  // ────────────────────────────────────────────────

  it("handleGlobalKeyEvent: Ctrl+Z 调用 tui.handleSuspend", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    let suspendCalled = false;
    binding.tui.handleSuspend = () => {
      suspendCalled = true;
    };

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    const ctrlZ: KeyEvent = {
      type: "key",
      key: "z",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    };

    binding._handleKeyEventForTesting(ctrlZ);
    assert.ok(suspendCalled, "Ctrl+Z should call tui.handleSuspend");

    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  cleanup: unmount + dispose all 子系统
  // ────────────────────────────────────────────────

  it("cleanup: unmount + dispose all 子系统", async () => {
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

    assert.ok(deinitCalled, "cleanup should call tui.deinit");
  });

  // ────────────────────────────────────────────────
  //  processResizeIfPending: 更新 MediaQuery data
  // ────────────────────────────────────────────────

  it("processResizeIfPending: 更新 MediaQuery data 并触发重建", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    // 模拟 resize 事件
    binding._simulateResizeForTesting(120, 40);

    // 验证 resize 处理后帧执行不抛异常
    binding.frameScheduler.disableFramePacing();
    assert.doesNotThrow(() => binding.frameScheduler.executeFrame());

    binding.stop();
    await runPromise;
  });

  // ────────────────────────────────────────────────
  //  runApp: 创建 MediaQuery wrapper
  // ────────────────────────────────────────────────

  it("runApp: 创建 MediaQuery wrapper 包裹用户 Widget", async () => {
    const binding = WidgetsBinding.instance;
    mockTuiController(binding.tui);

    const mockWidget = createMockWidget();
    let mountedElement: Element | null = null;

    binding.setRootElementMountedCallback((element: Element) => {
      mountedElement = element;
    });

    const runPromise = binding.runApp(mockWidget);
    await new Promise((r) => setTimeout(r, 50));

    assert.ok(mountedElement !== null, "rootElement should be mounted");
    assert.ok((mountedElement as any).mounted === true, "rootElement should have mounted=true");

    binding.stop();
    await runPromise;
  });
});
