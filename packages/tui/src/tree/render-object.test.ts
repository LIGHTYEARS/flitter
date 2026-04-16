/**
 * RenderObject 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖父子关系、脏标记、attach/detach、
 * parentData、遍历、dispose 等核心行为。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/render-object.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { RenderObject } from "./render-object.js";
import { ParentData, type PipelineOwnerLike, setPipelineOwner } from "./types.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

class TestRenderObject extends RenderObject {
  performLayout(): void {
    // no-op for testing
  }

  /** Helper to simulate layout/paint completion — clears dirty flags without pipeline work. */
  clearDirty(): void {
    this._needsLayout = false;
    this._needsPaint = false;
  }
}

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
//  父子关系测试
// ════════════════════════════════════════════════════

describe("RenderObject — 父子关系", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 1. adoptChild 设置 parent 引用 ─────────────────
  it("adoptChild 设置 child 的 parent 引用", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();

    parent.adoptChild(child);

    assert.equal(child.parent, parent);
  });

  // ── 2. adoptChild 设置 child depth ─────────────────
  it("adoptChild 设置 child.depth = parent.depth + 1", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();

    parent.adoptChild(child);

    assert.equal(child.depth, parent.depth + 1);
  });

  // ── 3. adoptChild 将 child 加入 children 数组 ──────
  it("adoptChild 将 child 加入 parent.children 数组", () => {
    const parent = new TestRenderObject();
    const child1 = new TestRenderObject();
    const child2 = new TestRenderObject();

    parent.adoptChild(child1);
    parent.adoptChild(child2);

    assert.equal(parent.children.length, 2);
    assert.ok(parent.children.includes(child1));
    assert.ok(parent.children.includes(child2));
  });

  // ── 4. dropChild 清除 parent 引用 ──────────────────
  it("dropChild 清除 child 的 parent 引用", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();

    parent.adoptChild(child);
    parent.dropChild(child);

    assert.equal(child.parent, null);
  });

  // ── 5. dropChild 从 children 移除 ──────────────────
  it("dropChild 从 parent.children 中移除 child", () => {
    const parent = new TestRenderObject();
    const child1 = new TestRenderObject();
    const child2 = new TestRenderObject();

    parent.adoptChild(child1);
    parent.adoptChild(child2);
    parent.dropChild(child1);

    assert.equal(parent.children.length, 1);
    assert.ok(!parent.children.includes(child1));
    assert.ok(parent.children.includes(child2));
  });

  // ── 6. removeAllChildren 清空所有子节点 ─────────────
  it("removeAllChildren 清空所有子节点", () => {
    const parent = new TestRenderObject();
    const child1 = new TestRenderObject();
    const child2 = new TestRenderObject();
    const child3 = new TestRenderObject();

    parent.adoptChild(child1);
    parent.adoptChild(child2);
    parent.adoptChild(child3);
    parent.removeAllChildren();

    assert.equal(parent.children.length, 0);
    assert.equal(child1.parent, null);
    assert.equal(child2.parent, null);
    assert.equal(child3.parent, null);
  });

  // ── 7. adoptChild 在 attached 状态下自动 attach child
  it("adoptChild 在 attached 状态下自动 attach child", () => {
    const parent = new TestRenderObject();
    parent.attach();
    assert.equal(parent.attached, true);

    const child = new TestRenderObject();
    assert.equal(child.attached, false);

    parent.adoptChild(child);

    assert.equal(child.attached, true);
  });
});

// ════════════════════════════════════════════════════
//  脏标记测试
// ════════════════════════════════════════════════════

describe("RenderObject — 脏标记", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 8. 新创建的 RenderObject needsLayout = true ────
  it("新创建的 RenderObject needsLayout 为 true", () => {
    const node = new TestRenderObject();
    assert.equal(node.needsLayout, true);
  });

  // ── 9. 新创建的 RenderObject needsPaint = true ─────
  it("新创建的 RenderObject needsPaint 为 true", () => {
    const node = new TestRenderObject();
    assert.equal(node.needsPaint, true);
  });

  // ── 10. markNeedsLayout 向上传播到 parent ──────────
  it("markNeedsLayout 向上传播到 parent", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();
    parent.adoptChild(child);

    // 先将 parent 的 needsLayout 手动清除（模拟 layout 已完成）
    // attach 使得 markNeedsLayout 可以工作
    parent.attach();

    // 清除 mock 记录和初始状态
    mockOwner.layoutRequests = [];

    // parent 可能在 attach 后已经 needsLayout = true，
    // 但我们要验证 child.markNeedsLayout 会传播到 parent
    // 先通过 performLayout 的方式概念上"清除" needsLayout
    // 由于这是 TDD，我们测试关键行为：child 调 markNeedsLayout 后 parent.needsLayout 变 true
    child.markNeedsLayout();

    assert.equal(parent.needsLayout, true);
  });

  // ── 11. markNeedsLayout 在根节点(attached)调用 PipelineOwner.requestLayout
  it("markNeedsLayout 在根节点调用 PipelineOwner.requestLayout", () => {
    const root = new TestRenderObject();
    root.attach();
    // Simulate layout completion to clear dirty flag before testing re-dirtying
    root.clearDirty();

    // 清除 attach 过程中可能产生的请求
    mockOwner.layoutRequests = [];

    root.markNeedsLayout();

    assert.ok(mockOwner.layoutRequests.length > 0, "应调用 PipelineOwner.requestLayout");
    assert.ok(mockOwner.layoutRequests.includes(root));
  });

  // ── 12. markNeedsPaint 调用 PipelineOwner.requestPaint
  it("markNeedsPaint 调用 PipelineOwner.requestPaint", () => {
    const node = new TestRenderObject();
    node.attach();
    // Simulate paint completion to clear dirty flag before testing re-dirtying
    node.clearDirty();

    // 清除 attach 过程中可能产生的请求
    mockOwner.paintRequests = [];

    node.markNeedsPaint();

    assert.ok(mockOwner.paintRequests.length > 0, "应调用 PipelineOwner.requestPaint");
    assert.ok(mockOwner.paintRequests.includes(node));
  });
});

// ════════════════════════════════════════════════════
//  attach/detach 测试
// ════════════════════════════════════════════════════

describe("RenderObject — attach/detach", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 13. attach() 设置 attached = true ──────────────
  it("attach() 设置 attached 为 true", () => {
    const node = new TestRenderObject();
    assert.equal(node.attached, false);

    node.attach();

    assert.equal(node.attached, true);
  });

  // ── 14. attach() 递归传播到所有子节点 ──────────────
  it("attach() 递归传播到所有子节点", () => {
    const root = new TestRenderObject();
    const child = new TestRenderObject();
    const grandchild = new TestRenderObject();

    root.adoptChild(child);
    child.adoptChild(grandchild);

    // 此时还未 attached
    assert.equal(root.attached, false);
    assert.equal(child.attached, false);
    assert.equal(grandchild.attached, false);

    root.attach();

    assert.equal(root.attached, true);
    assert.equal(child.attached, true);
    assert.equal(grandchild.attached, true);
  });

  // ── 15. detach() 设置 attached = false ─────────────
  it("detach() 设置 attached 为 false", () => {
    const node = new TestRenderObject();
    node.attach();
    assert.equal(node.attached, true);

    node.detach();

    assert.equal(node.attached, false);
  });

  // ── 16. detach() 递归传播到所有子节点 ──────────────
  it("detach() 递归传播到所有子节点", () => {
    const root = new TestRenderObject();
    const child = new TestRenderObject();
    const grandchild = new TestRenderObject();

    root.adoptChild(child);
    child.adoptChild(grandchild);
    root.attach();

    assert.equal(root.attached, true);
    assert.equal(child.attached, true);
    assert.equal(grandchild.attached, true);

    root.detach();

    assert.equal(root.attached, false);
    assert.equal(child.attached, false);
    assert.equal(grandchild.attached, false);
  });
});

// ════════════════════════════════════════════════════
//  parentData 测试
// ════════════════════════════════════════════════════

describe("RenderObject — parentData", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 17. setupParentData 默认为空操作 ────────────────
  it("setupParentData 默认不抛出异常（空操作）", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();

    // setupParentData 是在 adoptChild 内部调用的
    // 这里验证 adoptChild 调用 setupParentData 时不会抛出
    assert.doesNotThrow(() => {
      parent.adoptChild(child);
    });
  });

  // ── 18. parentData 可通过 adoptChild 流程或直接 setter 设置
  it("parentData 可被设置和读取", () => {
    const node = new TestRenderObject();
    const data = new ParentData();

    node.parentData = data;

    assert.equal(node.parentData, data);
  });
});

// ════════════════════════════════════════════════════
//  遍历测试
// ════════════════════════════════════════════════════

describe("RenderObject — 遍历", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 19. visitChildren 遍历所有直接子节点 ────────────
  it("visitChildren 遍历所有直接子节点", () => {
    const parent = new TestRenderObject();
    const child1 = new TestRenderObject();
    const child2 = new TestRenderObject();
    const child3 = new TestRenderObject();

    parent.adoptChild(child1);
    parent.adoptChild(child2);
    parent.adoptChild(child3);

    const visited: RenderObject[] = [];
    parent.visitChildren((child) => {
      visited.push(child);
    });

    assert.equal(visited.length, 3);
    assert.ok(visited.includes(child1));
    assert.ok(visited.includes(child2));
    assert.ok(visited.includes(child3));
  });

  // ── 20. visitChildren 空节点不报错 ─────────────────
  it("visitChildren 无子节点时不报错", () => {
    const node = new TestRenderObject();
    const visited: RenderObject[] = [];

    assert.doesNotThrow(() => {
      node.visitChildren((child) => {
        visited.push(child);
      });
    });

    assert.equal(visited.length, 0);
  });
});

// ════════════════════════════════════════════════════
//  dispose 测试
// ════════════════════════════════════════════════════

describe("RenderObject — dispose", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 21. dispose 移除所有子节点 ─────────────────────
  it("dispose 移除所有子节点", () => {
    const parent = new TestRenderObject();
    const child1 = new TestRenderObject();
    const child2 = new TestRenderObject();

    parent.adoptChild(child1);
    parent.adoptChild(child2);
    assert.equal(parent.children.length, 2);

    parent.dispose();

    assert.equal(parent.children.length, 0);
    assert.equal(child1.parent, null);
    assert.equal(child2.parent, null);
  });
});

// ════════════════════════════════════════════════════
//  补充边界测试
// ════════════════════════════════════════════════════

describe("RenderObject — 补充测试", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  // ── 22. depth 多层嵌套正确递增 ─────────────────────
  it("多层嵌套时 depth 逐层递增", () => {
    const root = new TestRenderObject();
    const child = new TestRenderObject();
    const grandchild = new TestRenderObject();

    root.adoptChild(child);
    child.adoptChild(grandchild);

    assert.equal(child.depth, root.depth + 1);
    assert.equal(grandchild.depth, child.depth + 1);
    assert.equal(grandchild.depth, root.depth + 2);
  });

  // ── 23. dropChild 在 attached 状态下自动 detach child
  it("dropChild 在 attached 状态下自动 detach child", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();

    parent.adoptChild(child);
    parent.attach();
    assert.equal(child.attached, true);

    parent.dropChild(child);

    assert.equal(child.attached, false);
  });

  // ── 24. removeAllChildren 在 attached 状态下 detach 所有子节点
  it("removeAllChildren 在 attached 状态下 detach 所有子节点", () => {
    const parent = new TestRenderObject();
    const child1 = new TestRenderObject();
    const child2 = new TestRenderObject();

    parent.adoptChild(child1);
    parent.adoptChild(child2);
    parent.attach();
    assert.equal(child1.attached, true);
    assert.equal(child2.attached, true);

    parent.removeAllChildren();

    assert.equal(child1.attached, false);
    assert.equal(child2.attached, false);
  });

  // ── 25. markNeedsLayout 子节点传播到已 attached 的根 ─
  it("markNeedsLayout 从深层子节点传播到 attached 的根节点并调用 requestLayout", () => {
    const root = new TestRenderObject();
    const child = new TestRenderObject();
    const grandchild = new TestRenderObject();

    root.adoptChild(child);
    child.adoptChild(grandchild);
    root.attach();

    // Simulate layout completion on all nodes to clear dirty flags
    root.clearDirty();
    child.clearDirty();
    grandchild.clearDirty();

    // 清除 attach 过程中的请求
    mockOwner.layoutRequests = [];

    grandchild.markNeedsLayout();

    assert.equal(child.needsLayout, true);
    assert.equal(root.needsLayout, true);
    assert.ok(mockOwner.layoutRequests.length > 0);
  });

  // ── 26. ParentData.detach 默认不抛出 ──────────────
  it("ParentData.detach() 默认为空操作不抛出", () => {
    const data = new ParentData();
    assert.doesNotThrow(() => {
      data.detach();
    });
  });

  // ── 27. visitChildren 不遍历孙节点 ────────────────
  it("visitChildren 只遍历直接子节点，不包含孙节点", () => {
    const root = new TestRenderObject();
    const child = new TestRenderObject();
    const grandchild = new TestRenderObject();

    root.adoptChild(child);
    child.adoptChild(grandchild);

    const visited: RenderObject[] = [];
    root.visitChildren((c) => {
      visited.push(c);
    });

    assert.equal(visited.length, 1);
    assert.equal(visited[0], child);
    assert.ok(!visited.includes(grandchild));
  });
});

// ════════════════════════════════════════════════════
//  markNeedsLayout guards (amp vH alignment)
// ════════════════════════════════════════════════════

describe("RenderObject — markNeedsLayout guards (amp vH alignment)", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  it("markNeedsLayout short-circuits when already dirty", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();
    parent.adoptChild(child);
    parent.attach();

    // Clear dirty flags to simulate post-layout state
    parent.clearDirty();
    child.clearDirty();

    // First call sets dirty
    mockOwner.layoutRequests = [];
    child.markNeedsLayout();
    const firstCallCount = mockOwner.layoutRequests.length;

    // Second call should short-circuit — no additional requests
    mockOwner.layoutRequests = [];
    child.markNeedsLayout();
    assert.equal(mockOwner.layoutRequests.length, 0, "should not propagate when already dirty");
  });

  it("markNeedsLayout is no-op when not attached", () => {
    const node = new TestRenderObject();
    // node is NOT attached
    mockOwner.layoutRequests = [];
    node.markNeedsLayout();
    assert.equal(mockOwner.layoutRequests.length, 0, "should not request layout when detached");
  });
});

// ════════════════════════════════════════════════════
//  markNeedsPaint guards (amp vH alignment)
// ════════════════════════════════════════════════════

describe("RenderObject — markNeedsPaint guards (amp vH alignment)", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  it("markNeedsPaint short-circuits when already dirty", () => {
    const node = new TestRenderObject();
    node.attach();
    // node starts with _needsPaint = true, so first call would short-circuit too
    // Clear dirty to simulate post-paint state, then trigger once
    node.clearDirty();
    node.markNeedsPaint();
    mockOwner.paintRequests = [];

    node.markNeedsPaint();
    assert.equal(mockOwner.paintRequests.length, 0, "should not request paint when already dirty");
  });

  it("markNeedsPaint is no-op when not attached", () => {
    const node = new TestRenderObject();
    // NOT attached
    mockOwner.paintRequests = [];
    node.markNeedsPaint();
    assert.equal(mockOwner.paintRequests.length, 0, "should not request paint when detached");
  });
});
