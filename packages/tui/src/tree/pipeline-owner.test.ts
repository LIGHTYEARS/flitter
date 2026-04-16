/**
 * PipelineOwner 单元测试。
 *
 * 覆盖 hasNodesNeedingLayout getter，验证其行为与 amp JXT.hasNodesNeedingLayout
 * 一致（2119_unknown_JXT.js:42-44）：检查根渲染对象的 needsLayout 标志，
 * 而非独立跟踪集合。
 *
 * 运行方式：
 * ```bash
 * cd packages/tui && bun test src/tree/pipeline-owner.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BoxConstraints } from "./constraints.js";
import { PipelineOwner } from "./pipeline-owner.js";
import { RenderBox } from "./render-box.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/**
 * 可实例化的 RenderBox 测试子类。
 * performLayout 将 size 设为约束最大值。
 */
class TestRenderBox extends RenderBox {
  performLayout(): void {
    const c = this._lastConstraints;
    if (c) {
      this.setSize(
        Number.isFinite(c.maxWidth) ? c.maxWidth : 0,
        Number.isFinite(c.maxHeight) ? c.maxHeight : 0,
      );
    }
  }
}

// ════════════════════════════════════════════════════
//  测试套件
// ════════════════════════════════════════════════════

describe("PipelineOwner — hasNodesNeedingLayout", () => {
  it("hasNodesNeedingLayout is false when no root is set", () => {
    // 逆向: amp JXT.hasNodesNeedingLayout — _rootRenderObject 为 null 时返回 false
    const owner = new PipelineOwner();
    assert.equal(owner.hasNodesNeedingLayout, false);
  });

  it("hasNodesNeedingLayout is true when root has needsLayout=true", () => {
    // 逆向: amp JXT.hasNodesNeedingLayout — root.needsLayout 为 true 时返回 true
    // RenderObject._needsLayout 初始值为 true
    const owner = new PipelineOwner();
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    // root._needsLayout 初始为 true
    assert.equal(root.needsLayout, true);
    assert.equal(owner.hasNodesNeedingLayout, true);
  });

  it("hasNodesNeedingLayout is false after flushLayout clears needsLayout", () => {
    // 逆向: flushLayout 调用 root.layout()，layout() 清除 _needsLayout
    const owner = new PipelineOwner();
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    owner.updateRootConstraints({ width: 80, height: 24 });

    // 注意: updateRootConstraints 调用 root.markNeedsLayout()，但由于节点未挂载
    // (attached=false)，markNeedsLayout() 会提前返回。
    // root._needsLayout 仍为初始值 true，hasNodesNeedingLayout 为 true。
    assert.equal(owner.hasNodesNeedingLayout, true);

    owner.flushLayout();
    // flushLayout 调用 root.layout()，内部清除 _needsLayout
    assert.equal(owner.hasNodesNeedingLayout, false);
  });

  it("flushLayout returns true when root and constraints are set", () => {
    const owner = new PipelineOwner();
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    owner.updateRootConstraints({ width: 80, height: 24 });

    const result = owner.flushLayout();
    assert.equal(result, true);
  });

  it("flushLayout returns false when no root is set", () => {
    const owner = new PipelineOwner();
    const result = owner.flushLayout();
    assert.equal(result, false);
  });

  it("hasNodesNeedingLayout is false after layout() is called directly on root", () => {
    // 验证 needsLayout 标志在 layout() 后被清除
    const owner = new PipelineOwner();
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);

    assert.equal(owner.hasNodesNeedingLayout, true);

    // 直接调用 layout()
    root.layout(BoxConstraints.tight(40, 10));
    assert.equal(root.needsLayout, false);
    assert.equal(owner.hasNodesNeedingLayout, false);
  });

  it("removeFromQueues does not affect hasNodesNeedingLayout (amp behavior)", () => {
    // 逆向: amp JXT.removeFromQueues 只操作 _nodesNeedingPaint，
    // 不影响 needsLayout 标志 (2119_unknown_JXT.js:51-53)
    const owner = new PipelineOwner();
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);

    assert.equal(owner.hasNodesNeedingLayout, true);

    // removeFromQueues 不改变 needsLayout 状态
    owner.removeFromQueues(root);
    assert.equal(owner.hasNodesNeedingLayout, true);
  });
});

describe("PipelineOwner — hasNodesNeedingPaint", () => {
  it("hasNodesNeedingPaint is false initially", () => {
    const owner = new PipelineOwner();
    assert.equal(owner.hasNodesNeedingPaint, false);
  });

  it("hasNodesNeedingPaint is true after requestPaint", () => {
    const owner = new PipelineOwner();
    const node = new TestRenderBox();
    owner.requestPaint(node);
    assert.equal(owner.hasNodesNeedingPaint, true);
  });

  it("removeFromQueues removes from paint queue", () => {
    const owner = new PipelineOwner();
    const node = new TestRenderBox();
    owner.requestPaint(node);
    assert.equal(owner.hasNodesNeedingPaint, true);

    owner.removeFromQueues(node);
    assert.equal(owner.hasNodesNeedingPaint, false);
  });

  it("dispose clears paint queue", () => {
    const owner = new PipelineOwner();
    const node = new TestRenderBox();
    owner.requestPaint(node);
    assert.equal(owner.hasNodesNeedingPaint, true);

    owner.dispose();
    assert.equal(owner.hasNodesNeedingPaint, false);
  });
});
