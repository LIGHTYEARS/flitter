/**
 * FrameScheduler + BuildOwner + PipelineOwner 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 BuildOwner 的脏元素调度与重建、
 * PipelineOwner 的布局/绘制管线、FrameScheduler 的帧阶段执行与回调管理，
 * 以及三者协同工作的集成场景。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/frame-scheduler.test.ts
 * ```
 *
 * @module
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { BuildOwner } from "./build-owner.js";
import { PipelineOwner } from "./pipeline-owner.js";
import { FrameScheduler } from "./frame-scheduler.js";
import type { FramePhase } from "./frame-scheduler.js";
import { Element } from "./element.js";
import type { Widget, Key } from "./element.js";
import { RenderBox } from "./render-box.js";
import { BoxConstraints } from "./constraints.js";
import type { Size } from "./constraints.js";
import { setBuildOwner, setPipelineOwner } from "./types.js";
import type { BuildOwnerLike, PipelineOwnerLike } from "./types.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** 最小 Widget 实现，用于测试 */
class TestWidget implements Widget {
  key: Key | undefined;

  constructor(opts?: { key?: Key }) {
    this.key = opts?.key;
  }

  canUpdate(other: Widget): boolean {
    return this.constructor === other.constructor;
  }

  createElement(): Element {
    return new TestElement(this);
  }
}

/** 具体 Element 子类，用于测试。记录 performRebuild 调用次数。 */
class TestElement extends Element {
  rebuildCount = 0;
  /** 可选回调，在 performRebuild 中执行（用于测试级联 dirty） */
  onRebuild: (() => void) | undefined = undefined;

  performRebuild(): void {
    super.performRebuild();
    this.rebuildCount++;
    this.onRebuild?.();
  }
}

/** 可实例化的 RenderBox 测试子类，记录 performLayout 调用次数。 */
class TestRenderBox extends RenderBox {
  layoutCount = 0;

  performLayout(): void {
    this.layoutCount++;
    if (this.constraints) {
      const biggest = this.constraints.biggest;
      this.size = {
        width: biggest.width === Infinity ? 0 : biggest.width,
        height: biggest.height === Infinity ? 0 : biggest.height,
      };
    }
  }
}

/** mock PipelineOwner，满足全局 setPipelineOwner 需求。 */
class MockPipelineOwner implements PipelineOwnerLike {
  layoutRequests: unknown[] = [];
  paintRequests: unknown[] = [];
  removedFromQueues: unknown[] = [];

  requestLayout(node: unknown): void {
    this.layoutRequests.push(node);
  }
  requestPaint(node: unknown): void {
    this.paintRequests.push(node);
  }
  removeFromQueues(node: unknown): void {
    this.removedFromQueues.push(node);
  }
}

// ════════════════════════════════════════════════════
//  BuildOwner 测试
// ════════════════════════════════════════════════════

describe("BuildOwner", () => {
  let buildOwner: BuildOwner;
  let mockPipeline: MockPipelineOwner;

  beforeEach(() => {
    buildOwner = new BuildOwner();
    mockPipeline = new MockPipelineOwner();
    setBuildOwner(buildOwner);
    setPipelineOwner(mockPipeline);
  });

  afterEach(() => {
    buildOwner.dispose();
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  });

  // ── 1. scheduleBuildFor 添加 dirty element ────────────
  it("scheduleBuildFor 添加 dirty element", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);
    element.mount();

    buildOwner.scheduleBuildFor(element);

    assert.equal(buildOwner.hasDirtyElements, true);
  });

  // ── 2. scheduleBuildFor 请求新帧 ──────────────────────
  it("scheduleBuildFor 请求新帧", () => {
    let frameRequested = false;
    buildOwner.setOnNeedFrame(() => {
      frameRequested = true;
    });

    const widget = new TestWidget();
    const element = new TestElement(widget);
    element.mount();

    buildOwner.scheduleBuildFor(element);

    assert.equal(frameRequested, true);
  });

  // ── 3. buildScopes 按 depth 排序 ─────────────────────
  it("buildScopes 按 depth 排序", () => {
    const rebuildOrder: string[] = [];

    const widget0 = new TestWidget();
    const widget1 = new TestWidget();
    const parent = new TestElement(widget0);
    const child = new TestElement(widget1);

    parent.mount();
    child.mount(parent);
    parent.addChild(child);

    // 清除初始 dirty 状态
    parent.performRebuild();
    child.performRebuild();

    // 设置回调追踪重建顺序
    parent.onRebuild = () => rebuildOrder.push("depth0");
    child.onRebuild = () => rebuildOrder.push("depth1");

    // 逆序添加（先添加深层节点），验证排序
    buildOwner.scheduleBuildFor(child);
    buildOwner.scheduleBuildFor(parent);

    buildOwner.buildScopes();

    assert.equal(rebuildOrder[0], "depth0");
    assert.equal(rebuildOrder[1], "depth1");
  });

  // ── 4. buildScopes 调用 performRebuild ────────────────
  it("buildScopes 调用 performRebuild", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);
    element.mount();

    // 清除初始 dirty
    element.performRebuild();
    assert.equal(element.rebuildCount, 1);

    // 标记 dirty 并调度
    element.markNeedsRebuild();

    buildOwner.buildScopes();

    assert.equal(element.rebuildCount, 2);
  });

  // ── 5. buildScopes 后 dirty set 清空 ─────────────────
  it("buildScopes 后 dirty set 清空", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);
    element.mount();

    buildOwner.scheduleBuildFor(element);
    assert.equal(buildOwner.hasDirtyElements, true);

    buildOwner.buildScopes();

    assert.equal(buildOwner.hasDirtyElements, false);
  });

  // ── 6. buildScopes 处理重建中新增的 dirty elements ────
  it("buildScopes 处理重建中新增的 dirty elements", () => {
    const widget1 = new TestWidget();
    const widget2 = new TestWidget();
    const element1 = new TestElement(widget1);
    const element2 = new TestElement(widget2);

    element1.mount();
    element2.mount();

    // 清除初始 dirty
    element1.performRebuild();
    element2.performRebuild();

    // element1 重建时，调度 element2
    element1.onRebuild = () => {
      element2.markNeedsRebuild();
    };

    // 仅调度 element1
    element1.markNeedsRebuild();

    buildOwner.buildScopes();

    // element2 应该也被重建了
    assert.equal(element2.rebuildCount, 2);
    assert.equal(buildOwner.hasDirtyElements, false);
  });
});

// ════════════════════════════════════════════════════
//  PipelineOwner 测试
// ════════════════════════════════════════════════════

describe("PipelineOwner", () => {
  let pipelineOwner: PipelineOwner;

  beforeEach(() => {
    pipelineOwner = new PipelineOwner();
    setPipelineOwner(pipelineOwner);
  });

  afterEach(() => {
    pipelineOwner.dispose();
    setPipelineOwner(undefined);
  });

  // ── 7. setRootRenderObject 保存根节点 ────────────────
  it("setRootRenderObject 保存根节点", () => {
    const root = new TestRenderBox();

    pipelineOwner.setRootRenderObject(root);

    assert.equal(pipelineOwner.rootRenderObject, root);
  });

  // ── 8. updateRootConstraints 创建 tight 约束 ─────────
  it("updateRootConstraints 创建 tight 约束", () => {
    const root = new TestRenderBox();
    pipelineOwner.setRootRenderObject(root);
    pipelineOwner.updateRootConstraints({ width: 80, height: 24 });

    const result = pipelineOwner.flushLayout();

    assert.equal(result, true);
    assert.equal(root.layoutCount, 1);
  });

  // ── 9. updateRootConstraints 约束不变时不触发多余 layout
  it("updateRootConstraints 约束不变时不触发多余 layout", () => {
    const root = new TestRenderBox();
    pipelineOwner.setRootRenderObject(root);
    pipelineOwner.updateRootConstraints({ width: 80, height: 24 });

    pipelineOwner.flushLayout();
    assert.equal(root.layoutCount, 1);

    // 同样的约束，再次 flushLayout
    pipelineOwner.flushLayout();

    // 第二次不应重新执行 performLayout（约束未变且 needsLayout = false）
    assert.equal(root.layoutCount, 1);
  });

  // ── 10. flushLayout 用根约束布局根节点 ────────────────
  it("flushLayout 用根约束布局根节点", () => {
    const root = new TestRenderBox();
    pipelineOwner.setRootRenderObject(root);
    pipelineOwner.updateRootConstraints({ width: 120, height: 40 });

    pipelineOwner.flushLayout();

    assert.equal(root.layoutCount, 1);
    assert.deepEqual(root.size, { width: 120, height: 40 });
  });

  // ── 11. flushLayout 无根节点返回 false ────────────────
  it("flushLayout 无根节点返回 false", () => {
    const result = pipelineOwner.flushLayout();

    assert.equal(result, false);
  });

  // ── 12. requestPaint 添加到 paint set ────────────────
  it("requestPaint 添加到 paint set", () => {
    const node = new TestRenderBox();

    pipelineOwner.requestPaint(node);

    assert.equal(pipelineOwner.hasNodesNeedingPaint, true);
  });

  // ── 13. flushPaint 清除 needsPaint 标记 ──────────────
  it("flushPaint 清除 needsPaint 标记", () => {
    const node = new TestRenderBox();
    assert.equal(node.needsPaint, true);

    pipelineOwner.requestPaint(node);
    assert.equal(pipelineOwner.hasNodesNeedingPaint, true);

    pipelineOwner.flushPaint();

    assert.equal(pipelineOwner.hasNodesNeedingPaint, false);
    assert.equal(node.needsPaint, false);
  });

  // ── 14. removeFromQueues 从 paint set 移除节点 ────────
  it("removeFromQueues 从 paint set 移除节点", () => {
    const node1 = new TestRenderBox();
    const node2 = new TestRenderBox();

    pipelineOwner.requestPaint(node1);
    pipelineOwner.requestPaint(node2);
    assert.equal(pipelineOwner.hasNodesNeedingPaint, true);

    pipelineOwner.removeFromQueues(node1);
    // node2 仍在集合中
    assert.equal(pipelineOwner.hasNodesNeedingPaint, true);

    pipelineOwner.removeFromQueues(node2);
    assert.equal(pipelineOwner.hasNodesNeedingPaint, false);
  });
});

// ════════════════════════════════════════════════════
//  FrameScheduler 测试
// ════════════════════════════════════════════════════

describe("FrameScheduler", () => {
  let scheduler: FrameScheduler;

  beforeEach(() => {
    scheduler = new FrameScheduler();
    scheduler.disableFramePacing();
  });

  afterEach(() => {
    scheduler.dispose();
  });

  // ── 15. executeFrame 按 build → layout → paint → render 顺序执行
  it("executeFrame 按 build → layout → paint → render 顺序执行", () => {
    const order: string[] = [];

    scheduler.addFrameCallback("build-cb", () => order.push("build"), "build");
    scheduler.addFrameCallback("layout-cb", () => order.push("layout"), "layout");
    scheduler.addFrameCallback("paint-cb", () => order.push("paint"), "paint");
    scheduler.addFrameCallback("render-cb", () => order.push("render"), "render");

    scheduler.executeFrame();

    assert.equal(order.length, 4);
    assert.equal(order[0], "build");
    assert.equal(order[1], "layout");
    assert.equal(order[2], "paint");
    assert.equal(order[3], "render");
  });

  // ── 16. addFrameCallback 注册回调到正确阶段 ───────────
  it("addFrameCallback 注册回调到正确阶段", () => {
    let paintRan = false;

    scheduler.addFrameCallback("paint-only", () => {
      paintRan = true;
    }, "paint");

    scheduler.executeFrame();

    assert.equal(paintRan, true);
  });

  // ── 17. removeFrameCallback 移除回调 ─────────────────
  it("removeFrameCallback 移除回调", () => {
    let callCount = 0;

    scheduler.addFrameCallback("removable", () => {
      callCount++;
    }, "build");

    scheduler.removeFrameCallback("removable");

    scheduler.executeFrame();

    assert.equal(callCount, 0);
  });

  // ── 18. priority 排序: 低数字先执行 ──────────────────
  it("priority 排序: 低数字先执行", () => {
    const order: string[] = [];

    scheduler.addFrameCallback("high", () => order.push("high"), "build", 10);
    scheduler.addFrameCallback("low", () => order.push("low"), "build", 0);
    scheduler.addFrameCallback("mid", () => order.push("mid"), "build", 5);

    scheduler.executeFrame();

    assert.equal(order[0], "low");
    assert.equal(order[1], "mid");
    assert.equal(order[2], "high");
  });

  // ── 19. post-frame 回调在四阶段后执行 ────────────────
  it("post-frame 回调在四阶段后执行", () => {
    const order: string[] = [];

    scheduler.addFrameCallback("render-cb", () => order.push("render"), "render");
    scheduler.addPostFrameCallback(() => order.push("post"));

    scheduler.executeFrame();

    const renderIndex = order.indexOf("render");
    const postIndex = order.indexOf("post");
    assert.ok(renderIndex >= 0, "render 回调应执行");
    assert.ok(postIndex >= 0, "post-frame 回调应执行");
    assert.ok(postIndex > renderIndex, "post-frame 应在 render 之后");
  });

  // ── 20. post-frame 回调是一次性的 ────────────────────
  it("post-frame 回调是一次性的", () => {
    let callCount = 0;

    scheduler.addPostFrameCallback(() => {
      callCount++;
    });

    scheduler.executeFrame();
    assert.equal(callCount, 1);

    scheduler.executeFrame();
    assert.equal(callCount, 1, "post-frame 回调不应在第二帧执行");
  });

  // ── 21. requestFrame 在帧执行中标记 scheduled ────────
  it("requestFrame 在帧执行中标记 scheduled", () => {
    let requestedDuringFrame = false;

    scheduler.addFrameCallback("during-frame", () => {
      scheduler.requestFrame();
      requestedDuringFrame = true;
    }, "build");

    // executeFrame 应正常完成，不会重入执行
    scheduler.executeFrame();

    assert.equal(requestedDuringFrame, true);
    assert.equal(scheduler.isFrameScheduled, true);
  });

  // ── 22. 帧完成后 scheduled 触发新帧 ─────────────────
  it("帧完成后 scheduled 触发新帧", () => {
    let buildRunCount = 0;

    scheduler.addFrameCallback("build-counter", () => {
      buildRunCount++;
      // 第一帧中请求新帧
      if (buildRunCount === 1) {
        scheduler.requestFrame();
      }
    }, "build");

    scheduler.executeFrame();

    // 第一帧的 build 回调请求了新帧，帧完成后应自动触发第二帧
    assert.equal(buildRunCount, 2, "应自动触发第二帧执行");
  });
});

// ════════════════════════════════════════════════════
//  集成测试
// ════════════════════════════════════════════════════

describe("集成测试 — FrameScheduler + BuildOwner + PipelineOwner", () => {
  let buildOwner: BuildOwner;
  let pipelineOwner: PipelineOwner;
  let scheduler: FrameScheduler;

  beforeEach(() => {
    buildOwner = new BuildOwner();
    pipelineOwner = new PipelineOwner();
    scheduler = new FrameScheduler();
    scheduler.disableFramePacing();
    setBuildOwner(buildOwner);
    setPipelineOwner(pipelineOwner);
  });

  afterEach(() => {
    scheduler.dispose();
    buildOwner.dispose();
    pipelineOwner.dispose();
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  });

  // ── 23. dirty element → buildScopes → performRebuild 完整管线
  it("dirty element → buildScopes → performRebuild 完整管线", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);
    element.mount();

    // 清除初始 dirty
    element.performRebuild();
    assert.equal(element.rebuildCount, 1);

    // 将 buildScopes 注册为 build 阶段回调
    scheduler.addFrameCallback("build-phase", () => {
      buildOwner.buildScopes();
    }, "build");

    // 将 buildOwner 的 onNeedFrame 连接到 scheduler.requestFrame
    buildOwner.setOnNeedFrame(() => {
      scheduler.requestFrame();
    });

    // 标记 dirty
    element.markNeedsRebuild();

    // 执行帧
    scheduler.executeFrame();

    // element 应被重建
    assert.equal(element.rebuildCount, 2);
    assert.equal(buildOwner.hasDirtyElements, false);
  });

  // ── 24. setState → scheduleBuildFor → buildScopes 完整链路
  it("setState → scheduleBuildFor → buildScopes 完整链路", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);
    element.mount();

    // 清除初始 dirty
    element.performRebuild();
    assert.equal(element.rebuildCount, 1);
    assert.equal(element.dirty, false);

    // 模拟 setState：调用 markNeedsRebuild（内部会调用 buildOwner.scheduleBuildFor）
    element.markNeedsRebuild();

    assert.equal(element.dirty, true);
    assert.equal(buildOwner.hasDirtyElements, true);

    // 执行 buildScopes
    buildOwner.buildScopes();

    assert.equal(element.rebuildCount, 2);
    assert.equal(element.dirty, false);
    assert.equal(buildOwner.hasDirtyElements, false);
  });

  // ── 25. 完整帧管线：build → layout → paint 三阶段协同
  it("完整帧管线：build → layout → paint 三阶段协同", () => {
    const phaseOrder: string[] = [];

    // 设置根渲染对象
    const root = new TestRenderBox();
    pipelineOwner.setRootRenderObject(root);
    pipelineOwner.updateRootConstraints({ width: 80, height: 24 });

    // 注册各阶段回调
    scheduler.addFrameCallback("build", () => {
      phaseOrder.push("build");
      buildOwner.buildScopes();
    }, "build");

    scheduler.addFrameCallback("layout", () => {
      phaseOrder.push("layout");
      pipelineOwner.flushLayout();
    }, "layout");

    scheduler.addFrameCallback("paint", () => {
      phaseOrder.push("paint");
      pipelineOwner.flushPaint();
    }, "paint");

    scheduler.executeFrame();

    assert.equal(phaseOrder[0], "build");
    assert.equal(phaseOrder[1], "layout");
    assert.equal(phaseOrder[2], "paint");
    assert.equal(root.layoutCount, 1);
    assert.deepEqual(root.size, { width: 80, height: 24 });
  });
});
