/**
 * runApp 单元测试。
 *
 * 验证 runApp() 顶层便捷函数的行为:
 * - 调用 WidgetsBinding.instance.runApp(widget)
 * - onRootElementMounted 选项传递给 setRootElementMountedCallback
 * - 无 options 时不调用 setRootElementMountedCallback
 * - runApp 返回 Promise<void> (异步函数签名)
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/binding/run-app.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { runApp } from "./run-app.js";
import type { RunAppOptions } from "./run-app.js";
import { WidgetsBinding } from "./widgets-binding.js";
import { FocusManager } from "../focus/focus-manager.js";
import { MouseManager } from "../gestures/mouse-manager.js";
import { setBuildOwner, setPipelineOwner } from "../tree/types.js";
import type { Widget, Element } from "../tree/element.js";

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
 * 创建最小 mock Widget。
 */
function createMockWidget(): Widget {
  return {
    key: undefined,
    canUpdate(other: Widget): boolean {
      return true;
    },
    createElement(): Element {
      return {
        mount: () => {},
        unmount: () => {},
        markNeedsRebuild: () => {},
        findRenderObject: () => undefined,
      } as unknown as Element;
    },
  } as Widget;
}

describe("runApp", () => {
  beforeEach(() => {
    resetAllSingletons();
  });

  afterEach(() => {
    resetAllSingletons();
  });

  it("调用 WidgetsBinding.instance.runApp(widget)", async () => {
    // 获取 binding 并 mock runApp
    const binding = WidgetsBinding.instance;
    let capturedWidget: Widget | undefined;
    binding.runApp = async (widget: Widget) => {
      capturedWidget = widget;
    };

    const widget = createMockWidget();
    await runApp(widget);

    assert.strictEqual(capturedWidget, widget, "应将 widget 传递给 binding.runApp");
  });

  it("onRootElementMounted 选项传递给 setRootElementMountedCallback", async () => {
    const binding = WidgetsBinding.instance;

    // mock runApp 以避免实际启动
    binding.runApp = async () => {};

    // 记录 setRootElementMountedCallback 是否被调用
    let callbackSet = false;
    let capturedCallback: ((element: Element) => void) | undefined;
    binding.setRootElementMountedCallback = (fn: (element: Element) => void) => {
      callbackSet = true;
      capturedCallback = fn;
    };

    const onMounted = (element: Element) => {};
    await runApp(createMockWidget(), { onRootElementMounted: onMounted });

    assert.ok(callbackSet, "应调用 setRootElementMountedCallback");
    assert.strictEqual(
      capturedCallback,
      onMounted,
      "应传递 onRootElementMounted 回调",
    );
  });

  it("无 options 时不调用 setRootElementMountedCallback", async () => {
    const binding = WidgetsBinding.instance;

    // mock runApp 以避免实际启动
    binding.runApp = async () => {};

    // 记录 setRootElementMountedCallback 是否被调用
    let callbackSet = false;
    binding.setRootElementMountedCallback = () => {
      callbackSet = true;
    };

    await runApp(createMockWidget());

    assert.strictEqual(
      callbackSet,
      false,
      "无 options 时不应调用 setRootElementMountedCallback",
    );
  });

  it("runApp 返回 Promise<void> (异步函数签名)", async () => {
    const binding = WidgetsBinding.instance;
    binding.runApp = async () => {};

    const result = runApp(createMockWidget());

    assert.ok(result instanceof Promise, "runApp 应返回 Promise");
    await result; // 确保 Promise 可以正常 resolve
  });
});
