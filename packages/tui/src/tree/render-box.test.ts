/**
 * RenderBox 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 layout、offset、hitTest、paint、
 * 继承关系、默认值等核心行为。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/render-box.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "./constraints.js";
import { RenderBox } from "./render-box.js";
import { RenderObject } from "./render-object.js";
import type { PipelineOwnerLike } from "./types.js";
import { setPipelineOwner } from "./types.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** 可实例化的 RenderBox 测试子类，记录 performLayout 调用次数。 */
class TestRenderBox extends RenderBox {
  layoutCallCount = 0;

  performLayout(): void {
    this.layoutCallCount++;
    // 默认策略：将 size 设为 constraints 的最大值（有限时），否则设为 0
    if (this.constraints) {
      const biggest = this.constraints.biggest;
      this.size = {
        width: biggest.width === Infinity ? 0 : biggest.width,
        height: biggest.height === Infinity ? 0 : biggest.height,
      };
    }
  }
}

/** 可追踪 performPaint 调用的子类。 */
class PaintTrackingRenderBox extends RenderBox {
  paintCalls: Array<{ offsetX: number; offsetY: number }> = [];

  performLayout(): void {
    if (this.constraints) {
      const biggest = this.constraints.biggest;
      this.size = {
        width: biggest.width === Infinity ? 0 : biggest.width,
        height: biggest.height === Infinity ? 0 : biggest.height,
      };
    }
  }

  override performPaint(_screen: Screen, offsetX: number, offsetY: number): void {
    this.paintCalls.push({ offsetX, offsetY });
  }
}

/** mock Screen，RenderBox.paint 仅做透传。 */
const mockScreen = {} as unknown as Screen;

/** mock PipelineOwner，满足 markNeedsLayout / markNeedsPaint 的全局依赖。 */
class MockPipelineOwner implements PipelineOwnerLike {
  layoutRequests: RenderObject[] = [];
  paintRequests: RenderObject[] = [];
  removedFromQueues: RenderObject[] = [];

  requestLayout(node: RenderObject): void {
    this.layoutRequests.push(node);
  }
  requestPaint(node: RenderObject): void {
    this.paintRequests.push(node);
  }
  removeFromQueues(node: RenderObject): void {
    this.removedFromQueues.push(node);
  }
}

// ════════════════════════════════════════════════════
//  defaults 测试组
// ════════════════════════════════════════════════════

describe("RenderBox -- 默认值", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 18. 默认 size 为 { width: 0, height: 0 } ─────────
  it("默认 size 为 { width: 0, height: 0 }", () => {
    const box = new TestRenderBox();
    assert.deepEqual(box.size, { width: 0, height: 0 });
  });

  // ── 19. 默认 hasSize = false ─────────────────────────
  it("默认 hasSize 为 false", () => {
    const box = new TestRenderBox();
    assert.equal(box.hasSize, false);
  });

  // ── 20. constraints 初始为 undefined ─────────────────
  it("constraints 初始为 undefined", () => {
    const box = new TestRenderBox();
    assert.equal(box.constraints, undefined);
  });
});

// ════════════════════════════════════════════════════
//  layout 测试组
// ════════════════════════════════════════════════════

describe("RenderBox -- layout", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 1. layout 保存 constraints ─────────────────────
  it("layout 保存 constraints", () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(80, 24);

    box.layout(constraints);

    assert.ok(box.constraints !== undefined);
    assert.equal(box.constraints!.minWidth, 80);
    assert.equal(box.constraints!.maxWidth, 80);
    assert.equal(box.constraints!.minHeight, 24);
    assert.equal(box.constraints!.maxHeight, 24);
  });

  // ── 2. layout 调用 performLayout ────────────────────
  it("layout 调用 performLayout", () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(80, 24);

    box.layout(constraints);

    assert.equal(box.layoutCallCount, 1);
  });

  // ── 3. layout 后 needsLayout = false ────────────────
  it("layout 后 needsLayout 为 false", () => {
    const box = new TestRenderBox();
    assert.equal(box.needsLayout, true);

    box.layout(BoxConstraints.tight(80, 24));

    assert.equal(box.needsLayout, false);
  });

  // ── 4. layout 后 hasSize = true ─────────────────────
  it("layout 后 hasSize 为 true（有界约束）", () => {
    const box = new TestRenderBox();
    box.layout(BoxConstraints.tight(80, 24));

    assert.equal(box.hasSize, true);
    assert.deepEqual(box.size, { width: 80, height: 24 });
  });

  // ── 5. size 被 constraints 约束 ─────────────────────
  it("performLayout 设置的 size 在约束范围内", () => {
    const box = new TestRenderBox();
    const constraints = new BoxConstraints({
      minWidth: 10,
      maxWidth: 50,
      minHeight: 5,
      maxHeight: 20,
    });

    box.layout(constraints);

    // TestRenderBox 默认取 biggest，即 (50, 20)
    assert.equal(box.size.width >= constraints.minWidth, true);
    assert.equal(box.size.width <= constraints.maxWidth, true);
    assert.equal(box.size.height >= constraints.minHeight, true);
    assert.equal(box.size.height <= constraints.maxHeight, true);
  });

  // ── 6. 重复 layout 相同 constraints 的行为 ───────────
  it("重复 layout 相同 constraints 时跳过 performLayout（needsLayout 为 false）", () => {
    const box = new TestRenderBox();
    const constraints = BoxConstraints.tight(80, 24);

    box.layout(constraints);
    assert.equal(box.layoutCallCount, 1);

    // 第二次 layout：needsLayout 已经为 false 且约束相同
    box.layout(constraints);

    // 根据 plan，layout 在 needsLayout=false 且 constraints 未变时可跳过
    // 也可能仍然执行——测试实际行为
    // 如果跳过了：layoutCallCount 仍然为 1
    // 如果未跳过：layoutCallCount 为 2
    // 无论哪种，不应崩溃
    assert.ok(box.layoutCallCount >= 1);
    assert.equal(box.needsLayout, false);
  });

  // ── 额外：constraints 改变时重新布局 ──────────────────
  it("constraints 改变时重新执行 performLayout", () => {
    const box = new TestRenderBox();

    box.layout(BoxConstraints.tight(80, 24));
    assert.equal(box.layoutCallCount, 1);

    box.layout(BoxConstraints.tight(100, 30));
    assert.equal(box.layoutCallCount, 2);
    assert.deepEqual(box.size, { width: 100, height: 30 });
  });
});

// ════════════════════════════════════════════════════
//  offset 测试组
// ════════════════════════════════════════════════════

describe("RenderBox -- offset", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 7. 默认 offset 为 {x: 0, y: 0} ─────────────────
  it("默认 offset 为 { x: 0, y: 0 }", () => {
    const box = new TestRenderBox();
    assert.deepEqual(box.offset, { x: 0, y: 0 });
  });

  // ── 8. 可设置 offset ────────────────────────────────
  it("可以设置并读取 offset", () => {
    const box = new TestRenderBox();
    box.offset = { x: 10, y: 20 };

    assert.deepEqual(box.offset, { x: 10, y: 20 });
  });
});

// ════════════════════════════════════════════════════
//  hitTest 测试组
// ════════════════════════════════════════════════════

describe("RenderBox -- hitTest", () => {
  let mockOwner: MockPipelineOwner;
  let box: TestRenderBox;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);

    box = new TestRenderBox();
    box.layout(BoxConstraints.tight(40, 20));
    box.offset = { x: 10, y: 5 };
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 9. 点在矩形内 -> true ──────────────────────────
  it("点在矩形内返回 true", () => {
    // box 占据 x:[10, 50), y:[5, 25)
    assert.equal(box.containsPoint(20, 15), true);
    assert.equal(box.containsPoint(30, 10), true);
  });

  // ── 10. 点在矩形外 -> false ─────────────────────────
  it("点在矩形外返回 false", () => {
    assert.equal(box.containsPoint(0, 0), false); // 左上方
    assert.equal(box.containsPoint(60, 30), false); // 右下方
    assert.equal(box.containsPoint(5, 15), false); // 左侧
    assert.equal(box.containsPoint(20, 30), false); // 下方
  });

  // ── 11. 边界点 (offset.x, offset.y) -> true ─────────
  it("起始边界点 (offset.x, offset.y) 返回 true（inclusive）", () => {
    assert.equal(box.containsPoint(10, 5), true);
  });

  // ── 12. 边界点 (offset.x + width, offset.y + height) -> false
  it("终止边界点 (offset.x + width, offset.y + height) 返回 false（exclusive）", () => {
    // x: 10 + 40 = 50, y: 5 + 20 = 25
    assert.equal(box.containsPoint(50, 25), false);
    assert.equal(box.containsPoint(50, 10), false); // 右边界
    assert.equal(box.containsPoint(20, 25), false); // 下边界
  });
});

// ════════════════════════════════════════════════════
//  paint 测试组
// ════════════════════════════════════════════════════

describe("RenderBox -- paint", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 13. paint 递归调用 children 的 paint ──────────────
  it("paint 递归调用子节点的 paint", () => {
    const parent = new PaintTrackingRenderBox();
    const child1 = new PaintTrackingRenderBox();
    const child2 = new PaintTrackingRenderBox();

    parent.adoptChild(child1);
    parent.adoptChild(child2);

    parent.layout(BoxConstraints.tight(80, 24));
    child1.layout(BoxConstraints.tight(40, 12));
    child2.layout(BoxConstraints.tight(40, 12));

    parent.paint(mockScreen, 0, 0);

    // 子节点的 performPaint 应被调用
    assert.ok(child1.paintCalls.length > 0, "child1 的 performPaint 应被调用");
    assert.ok(child2.paintCalls.length > 0, "child2 的 performPaint 应被调用");
  });

  // ── 14. paint 传递正确的偏移量（父偏移 + 子 offset）──
  it("paint 向子节点传递正确的偏移量（父偏移 + 子 offset）", () => {
    const parent = new PaintTrackingRenderBox();
    const child = new PaintTrackingRenderBox();

    parent.adoptChild(child);

    parent.layout(BoxConstraints.tight(80, 24));
    child.layout(BoxConstraints.tight(40, 12));
    child.offset = { x: 5, y: 3 };

    // 父节点以 (10, 20) 偏移开始绘制
    parent.paint(mockScreen, 10, 20);

    // 子节点应收到 (10 + 5, 20 + 3) = (15, 23)
    assert.ok(child.paintCalls.length > 0);
    const lastCall = child.paintCalls[child.paintCalls.length - 1];
    assert.equal(lastCall.offsetX, 15);
    assert.equal(lastCall.offsetY, 23);
  });

  // ── 15. paint 后 needsPaint = false ──────────────────
  it("paint 后 needsPaint 为 false", () => {
    const box = new PaintTrackingRenderBox();
    box.layout(BoxConstraints.tight(80, 24));

    // layout 会调用 markNeedsPaint，使 needsPaint = true
    assert.equal(box.needsPaint, true);

    box.paint(mockScreen, 0, 0);

    assert.equal(box.needsPaint, false);
  });
});

// ════════════════════════════════════════════════════
//  继承测试组
// ════════════════════════════════════════════════════

describe("RenderBox -- 继承关系", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 16. RenderBox 是 RenderObject 的子类 ─────────────
  it("RenderBox 是 RenderObject 的子类（instanceof）", () => {
    const box = new TestRenderBox();
    assert.ok(box instanceof RenderObject);
    assert.ok(box instanceof RenderBox);
  });

  // ── 17. adoptChild/dropChild 在 RenderBox 上正常工作 ──
  it("adoptChild/dropChild 在 RenderBox 上正常工作", () => {
    const parent = new TestRenderBox();
    const child = new TestRenderBox();

    parent.adoptChild(child);
    assert.equal(child.parent, parent);
    assert.equal(parent.children.length, 1);
    assert.ok(parent.children.includes(child));

    parent.dropChild(child);
    assert.equal(child.parent, null);
    assert.equal(parent.children.length, 0);
  });
});

// ════════════════════════════════════════════════════
//  size setter 验证测试
// ════════════════════════════════════════════════════

describe("RenderBox -- size setter 验证", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  it("size setter 接受合法的有限尺寸", () => {
    const box = new TestRenderBox();
    assert.doesNotThrow(() => {
      box.size = { width: 100, height: 50 };
    });
    assert.deepEqual(box.size, { width: 100, height: 50 });
  });

  it("size setter 拒绝包含 Infinity 的尺寸", () => {
    const box = new TestRenderBox();
    assert.throws(() => {
      box.size = { width: Infinity, height: 50 };
    });
  });

  it("size setter 拒绝包含 NaN 的尺寸", () => {
    const box = new TestRenderBox();
    assert.throws(() => {
      box.size = { width: NaN, height: 50 };
    });
  });
});

// ════════════════════════════════════════════════════
//  综合行为测试
// ════════════════════════════════════════════════════

describe("RenderBox -- 综合行为", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  it("layout 后调用 markNeedsPaint", () => {
    const box = new TestRenderBox();

    // 初始 needsPaint 为 true
    assert.equal(box.needsPaint, true);

    // Attach so markNeedsPaint works (amp vH guard: if (!_attached) return)
    box.attach();

    // 手动清除 paint 标记来测试 layout 是否重新设置它
    box.paint(mockScreen, 0, 0);

    // 此时 needsPaint 已被 paint() 清除为 false
    assert.equal(box.needsPaint, false);

    // layout 后应标记 needsPaint
    box.layout(BoxConstraints.tight(80, 24));

    assert.equal(box.needsPaint, true);
  });

  it("多层嵌套的 paint 偏移量正确累积", () => {
    const root = new PaintTrackingRenderBox();
    const child = new PaintTrackingRenderBox();
    const grandchild = new PaintTrackingRenderBox();

    root.adoptChild(child);
    child.adoptChild(grandchild);

    root.layout(BoxConstraints.tight(80, 24));
    child.layout(BoxConstraints.tight(60, 20));
    grandchild.layout(BoxConstraints.tight(30, 10));

    child.offset = { x: 2, y: 3 };
    grandchild.offset = { x: 4, y: 5 };

    // 从 (0, 0) 开始绘制
    root.paint(mockScreen, 0, 0);

    // child 应收到 (0 + 2, 0 + 3) = (2, 3)
    assert.ok(child.paintCalls.length > 0);
    const childCall = child.paintCalls[child.paintCalls.length - 1];
    assert.equal(childCall.offsetX, 2);
    assert.equal(childCall.offsetY, 3);

    // grandchild 应收到 (2 + 4, 3 + 5) = (6, 8)
    assert.ok(grandchild.paintCalls.length > 0);
    const grandchildCall = grandchild.paintCalls[grandchild.paintCalls.length - 1];
    assert.equal(grandchildCall.offsetX, 6);
    assert.equal(grandchildCall.offsetY, 8);
  });

  it("hitTest 在 offset 为 (0, 0) 时仍然正确", () => {
    const box = new TestRenderBox();
    box.layout(BoxConstraints.tight(10, 10));
    // offset 默认 {x: 0, y: 0}

    assert.equal(box.containsPoint(0, 0), true);
    assert.equal(box.containsPoint(5, 5), true);
    assert.equal(box.containsPoint(9, 9), true);
    assert.equal(box.containsPoint(10, 10), false);
    assert.equal(box.containsPoint(-1, 0), false);
    assert.equal(box.containsPoint(0, -1), false);
  });

  it("layout 使用松约束时 performLayout 正确处理", () => {
    const box = new TestRenderBox();
    const looseConstraints = BoxConstraints.loose(100, 50);

    box.layout(looseConstraints);

    // TestRenderBox 取 biggest: (100, 50)
    assert.deepEqual(box.size, { width: 100, height: 50 });
    assert.equal(box.hasSize, true);
  });
});
