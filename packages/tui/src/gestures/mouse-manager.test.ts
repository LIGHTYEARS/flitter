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
 * - dispatch: click 事件分发 + opaque 传播阻断
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Screen } from "../screen/screen.js";
import { RenderBox } from "../tree/render-box.js";
import { setPipelineOwner } from "../tree/types.js";
import type { TuiController } from "../tui/tui-controller.js";
import type { MouseEvent as TermMouseEvent } from "../vt/types.js";
import { RenderMouseRegion } from "../widgets/mouse-region.js";
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
  button: "left" | "right" | "middle" | "none" = "left",
): TermMouseEvent {
  return {
    type: "mouse",
    x,
    y,
    button,
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
    // 设置 pipeline owner 以支持 RenderObject 操作
    setPipelineOwner({
      requestLayout: () => {},
      requestPaint: () => {},
      removeFromQueues: () => {},
    });
    // 每个测试前 dispose 确保干净状态
    MouseManager.instance.dispose();
  });

  afterEach(() => {
    setPipelineOwner(undefined);
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

// ════════════════════════════════════════════════════
//  MouseManager dispatch 测试
// ════════════════════════════════════════════════════

describe("MouseManager dispatch", () => {
  let mm: MouseManager;

  beforeEach(() => {
    setPipelineOwner({
      requestLayout: () => {},
      requestPaint: () => {},
      removeFromQueues: () => {},
    });
    MouseManager.instance.dispose();
    mm = MouseManager.instance;
  });

  afterEach(() => {
    mm.dispose();
    setPipelineOwner(undefined);
  });

  test("press 事件分发 click 到 RenderMouseRegion", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    let clickCount = 0;
    const region = new RenderMouseRegion({
      onClick: () => {
        clickCount++;
      },
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(40, 10);

    mm.setRootRenderObject(root);

    // 在 region 区域内点击 (20, 8)
    mm.handleMouseEvent(createMouseEvent(20, 8));

    expect(clickCount).toBe(1);
  });

  test("opaque RenderMouseRegion 阻止事件向下层传播", () => {
    // 构建两个重叠的 RenderMouseRegion 节点
    // outer (0,0 80x24, opaque=true) 包含 inner (10,5 20x5, opaque=true)
    // 命中测试以 ancestor-first 顺序返回 [outer, inner]
    // outer 是第一个命中目标；outer.opaque=true 阻断对 inner 的分发
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    let outerClicks = 0;
    let innerClicks = 0;

    const outer = new RenderMouseRegion({
      onClick: () => {
        outerClicks++;
      },
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(outer);
    outer.setOffset(0, 0);
    outer.setSize(80, 24);

    const inner = new RenderMouseRegion({
      onClick: () => {
        innerClicks++;
      },
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    outer.adoptChild(inner);
    inner.setOffset(10, 5);
    inner.setSize(20, 5);

    mm.setRootRenderObject(root);

    // 点击 inner 区域内 (15, 7)
    // 命中列表: [root, outer, inner]（ancestor-first）
    // _findMouseTargets: [outer, inner]
    // outer 先收到 click；outer.opaque=true 阻断分发，inner 不收到 click
    mm.handleMouseEvent(createMouseEvent(15, 7));

    expect(outerClicks).toBe(1);
    expect(innerClicks).toBe(0);
  });

  test("removeRegion 不抛异常", () => {
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: false,
    });
    // 移除从未添加过 hover 状态的 region，应静默处理
    expect(() => mm.removeRegion(region)).not.toThrow();
  });

  // ════════════════════════════════════════════════════
  //  _handleMove: enter / exit / hover 分发
  // ════════════════════════════════════════════════════

  test("move into a region dispatches enter event", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    let enterCount = 0;
    let enterEventType: string | undefined;
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: (e) => {
        enterCount++;
        enterEventType = e.type;
      },
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 10);

    mm.setRootRenderObject(root);

    // 鼠标移入区域
    mm.handleMouseEvent({
      type: "mouse",
      x: 15,
      y: 8,
      button: "none",
      action: "move",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });

    expect(enterCount).toBe(1);
    expect(enterEventType).toBe("enter");
  });

  test("move out of a region dispatches exit event", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    const events: string[] = [];
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: () => {
        events.push("enter");
      },
      onExit: () => {
        events.push("exit");
      },
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 10);

    mm.setRootRenderObject(root);

    // 先移入区域
    mm.handleMouseEvent({
      type: "mouse",
      x: 15,
      y: 8,
      button: "none",
      action: "move",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });
    expect(events).toEqual(["enter"]);

    // 再移出区域
    mm.handleMouseEvent({
      type: "mouse",
      x: 5,
      y: 2,
      button: "none",
      action: "move",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });
    expect(events).toEqual(["enter", "exit"]);
  });

  // ════════════════════════════════════════════════════
  //  _handleRelease 和 _handleDrag 分发 (Task 4)
  // ════════════════════════════════════════════════════

  test("release dispatches to current targets when no drag active", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    let releaseEventType: string | undefined;
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: (e) => {
        releaseEventType = e.type;
      },
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 10);

    mm.setRootRenderObject(root);

    // Send release without any preceding press (no drag targets)
    mm.handleMouseEvent(createMouseEvent(15, 8, "release"));

    expect(releaseEventType).toBe("release");
  });

  test("drag dispatches to original press targets", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    const dragEvents: Array<{ type: string }> = [];
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: null,
      onDrag: (e) => {
        dragEvents.push({ type: e.type });
      },
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 10);

    mm.setRootRenderObject(root);

    // Press to capture drag targets
    mm.handleMouseEvent(createMouseEvent(15, 8, "press", "left"));

    // Move with button held (drag)
    mm.handleMouseEvent(createMouseEvent(16, 9, "move", "left"));

    expect(dragEvents.length).toBe(1);
    expect(dragEvents[0]!.type).toBe("drag");
  });

  test("release after drag dispatches to drag targets (original press target)", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    const receivedTypes: string[] = [];
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: null,
      onRelease: (e) => {
        receivedTypes.push(e.type);
      },
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 10);

    mm.setRootRenderObject(root);

    // Press to capture drag targets
    mm.handleMouseEvent(createMouseEvent(15, 8, "press", "left"));

    // Release at same position — should dispatch to drag targets
    mm.handleMouseEvent(createMouseEvent(15, 8, "release", "left"));

    expect(receivedTypes).toContain("release");
  });

  // ════════════════════════════════════════════════════
  //  _handleScroll: scroll 事件分发 (Task 5)
  // ════════════════════════════════════════════════════

  test("wheel_up dispatches scroll event with direction up", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    const scrollEvents: Array<{ type: string; direction?: string }> = [];
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: (e) => {
        scrollEvents.push({ type: e.type, direction: e.direction as string });
        return true; // handled — starts session
      },
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(0, 0);
    region.setSize(80, 24);

    mm.setRootRenderObject(root);

    mm.handleMouseEvent({
      type: "mouse",
      x: 5,
      y: 3,
      button: "none",
      action: "wheel_up",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });

    expect(scrollEvents.length).toBe(1);
    expect(scrollEvents[0]!.type).toBe("scroll");
    expect(scrollEvents[0]!.direction).toBe("up");
  });

  test("wheel_down dispatches scroll event with direction down", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    const scrollEvents: Array<{ type: string; direction?: string }> = [];
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: null,
      onExit: null,
      onHover: null,
      onScroll: (e) => {
        scrollEvents.push({ type: e.type, direction: e.direction as string });
        return true; // handled
      },
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(0, 0);
    region.setSize(80, 24);

    mm.setRootRenderObject(root);

    mm.handleMouseEvent({
      type: "mouse",
      x: 5,
      y: 3,
      button: "none",
      action: "wheel_down",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });

    expect(scrollEvents.length).toBe(1);
    expect(scrollEvents[0]!.type).toBe("scroll");
    expect(scrollEvents[0]!.direction).toBe("down");
  });

  test("move within hovered region dispatches hover event (not enter again)", () => {
    const root = new TestRenderBox();
    root.setTestBounds({ width: 80, height: 24 }, { x: 0, y: 0 });

    const events: string[] = [];
    const region = new RenderMouseRegion({
      onClick: null,
      onEnter: () => {
        events.push("enter");
      },
      onExit: null,
      onHover: () => {
        events.push("hover");
      },
      onScroll: null,
      onRelease: null,
      onDrag: null,
      cursor: null,
      opaque: true,
    });
    root.adoptChild(region);
    region.setOffset(10, 5);
    region.setSize(20, 10);

    mm.setRootRenderObject(root);

    // 第一次移入 — 应触发 enter，不触发 hover
    mm.handleMouseEvent({
      type: "mouse",
      x: 15,
      y: 8,
      button: "none",
      action: "move",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });
    expect(events).toEqual(["enter"]);

    // 区域内继续移动 — 应触发 hover，不再触发 enter
    mm.handleMouseEvent({
      type: "mouse",
      x: 16,
      y: 9,
      button: "none",
      action: "move",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });
    expect(events).toEqual(["enter", "hover"]);

    // 再次在区域内移动
    mm.handleMouseEvent({
      type: "mouse",
      x: 17,
      y: 10,
      button: "none",
      action: "move",
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    });
    expect(events).toEqual(["enter", "hover", "hover"]);
  });
});
