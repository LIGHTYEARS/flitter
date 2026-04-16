/**
 * MouseManager 单元测试。
 *
 * 测试 MouseManager 单例鼠标事件管理器：
 * - 单例模式
 * - setRootRenderObject / setTui
 * - handleMouseEvent (无 root 静默返回 + 命中测试)
 * - clearHoverState
 * - reestablishHoverState
 * - dispose
 * - 多层 RenderObject 命中测试
 */

import { beforeEach, describe, expect, test } from "bun:test";
import type { Screen } from "../screen/screen.js";
import { RenderBox } from "../tree/render-box.js";
import type { TuiController } from "../tui/tui-controller.js";
import type { MouseEvent as TermMouseEvent } from "../vt/types.js";
import { MouseManager } from "./mouse-manager.js";

// ════════════════════════════════════════════════════
//  测试用 RenderBox 子类
// ════════════════════════════════════════════════════

class TestRenderBox extends RenderBox {
  performLayout(): void {
    // no-op for testing
  }

  /** 设置测试用尺寸和偏移 */
  setTestBounds(size: { width: number; height: number }, offset: { x: number; y: number }): void {
    this._size = size;
    this._offset = offset;
  }
}

// ════════════════════════════════════════════════════
//  工具函数
// ════════════════════════════════════════════════════

/** 创建测试用 MouseEvent */
function createMouseEvent(
  x: number,
  y: number,
  action: "press" | "release" | "move" = "press",
): TermMouseEvent {
  return {
    type: "mouse",
    x,
    y,
    button: "left" as const,
    action,
    modifiers: { shift: false, ctrl: false, alt: false, meta: false },
  };
}

/** 创建一个假的 TuiController */
function createMockTui(): TuiController {
  return {
    getScreen: () => ({}) as Screen,
    getSize: () => ({ width: 80, height: 24 }),
  } as unknown as TuiController;
}

describe("MouseManager", () => {
  beforeEach(() => {
    // 每个测试前 dispose 确保干净状态
    MouseManager.instance.dispose();
  });

  // ════════════════════════════════════════════════════
  //  单例
  // ════════════════════════════════════════════════════

  test("instance 返回同一实例", () => {
    const a = MouseManager.instance;
    const b = MouseManager.instance;
    expect(a).toBe(b);
  });

  test("dispose 后再次访问 instance 返回新实例", () => {
    const a = MouseManager.instance;
    a.dispose();
    const b = MouseManager.instance;
    expect(b).not.toBe(a);
  });

  // ════════════════════════════════════════════════════
  //  setRootRenderObject
  // ════════════════════════════════════════════════════

  test("setRootRenderObject 设置根渲染对象", () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    // 设置后，handleMouseEvent 不应静默返回，而应执行命中测试
    mm.setRootRenderObject(root);
    const event = createMouseEvent(5, 5);

    // 不抛异常即可
    expect(() => mm.handleMouseEvent(event)).not.toThrow();
  });

  // ════════════════════════════════════════════════════
  //  setTui
  // ════════════════════════════════════════════════════

  test("setTui 设置 TuiController 引用", () => {
    const mm = MouseManager.instance;
    const tui = createMockTui();

    // 不抛异常即可
    expect(() => mm.setTui(tui)).not.toThrow();
  });

  // ════════════════════════════════════════════════════
  //  handleMouseEvent
  // ════════════════════════════════════════════════════

  test("handleMouseEvent 无 root 时静默返回", () => {
    const mm = MouseManager.instance;
    const event = createMouseEvent(10, 5);

    // 不应抛异常
    expect(() => mm.handleMouseEvent(event)).not.toThrow();
  });

  test("handleMouseEvent 调用 HitTestResult.hitTest 进行命中测试", () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    const event = createMouseEvent(5, 5);
    mm.handleMouseEvent(event);

    // 验证 lastHoverTargets 被更新（命中了 root）
    expect(mm.lastHoverTargets.length).toBeGreaterThan(0);
    expect(mm.lastHoverTargets[0]!.target).toBe(root);
  });

  // ════════════════════════════════════════════════════
  //  clearHoverState
  // ════════════════════════════════════════════════════

  test("clearHoverState 清空 lastHoverTargets", () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);

    // 先产生 hover targets
    mm.handleMouseEvent(createMouseEvent(5, 5));
    expect(mm.lastHoverTargets.length).toBeGreaterThan(0);

    // 清空
    mm.clearHoverState();
    expect(mm.lastHoverTargets).toHaveLength(0);
  });

  // ════════════════════════════════════════════════════
  //  dispose
  // ════════════════════════════════════════════════════

  test("dispose 清空所有引用并重置 _instance", () => {
    const mm = MouseManager.instance;
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });
    mm.setRootRenderObject(root);
    mm.setTui(createMockTui());
    mm.handleMouseEvent(createMouseEvent(5, 5));

    mm.dispose();

    // dispose 后 instance 返回新实例
    const mm2 = MouseManager.instance;
    expect(mm2).not.toBe(mm);

    // 新实例无 root，handleMouseEvent 应静默返回
    expect(() => mm2.handleMouseEvent(createMouseEvent(5, 5))).not.toThrow();
    expect(mm2.lastHoverTargets).toHaveLength(0);
  });

  // ════════════════════════════════════════════════════
  //  多层 RenderObject 命中测试
  // ════════════════════════════════════════════════════

  test("多层 RenderObject 命中测试返回正确目标列表", () => {
    const mm = MouseManager.instance;

    // 根节点 80x24 @ (0,0)
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    // 子节点 40x12 @ (10,5)
    const child = new TestRenderBox();
    child.setTestBounds({ width: 40, height: 12 }, { x: 10, y: 5 });
    root.adoptChild(child);

    mm.setRootRenderObject(root);

    // 点击 (15, 8)：root 和 child 都应该命中
    mm.handleMouseEvent(createMouseEvent(15, 8));

    const targets = mm.lastHoverTargets;
    expect(targets.length).toBe(2);

    // 第一个应该是 root (root 先 add 自身再逆序子节点)
    // HitTestResult 中 root 先添加 (add)，然后子节点逆序递归
    const targetObjects = targets.map((t) => t.target);
    expect(targetObjects).toContain(root);
    expect(targetObjects).toContain(child);
  });

  test("多层 RenderObject 命中测试——不在子节点范围内", () => {
    const mm = MouseManager.instance;

    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    const child = new TestRenderBox();
    child.setTestBounds({ width: 10, height: 5 }, { x: 60, y: 15 });
    root.adoptChild(child);

    mm.setRootRenderObject(root);

    // 点击 (5, 5): 在 root 但不在 child
    mm.handleMouseEvent(createMouseEvent(5, 5));

    const targets = mm.lastHoverTargets;
    expect(targets.length).toBe(1);
    expect(targets[0]!.target).toBe(root);
  });
});
