/**
 * HitTestResult + HitTestEntry + RenderObject.hitTest 命中测试单元测试。
 *
 * 覆盖:
 * - HitTestResult.add 正确累积条目
 * - HitTestResult.addWithPaintOffset 计算局部坐标
 * - HitTestResult.hits 返回只读视图
 * - HitTestResult.hitTest 静态工厂正确调用 root.hitTest
 * - RenderObject.hitTest: position 在 bounds 内返回 true
 * - RenderObject.hitTest: position 在 bounds 外返回 false
 * - RenderObject.hitTest: 子节点逆序遍历 (最后绘制的先命中)
 * - RenderObject.hitTest: 嵌套层级正确计算偏移
 * - RenderObject.hitTest: 无 size/offset 时递归子节点
 * - 空渲染树: hitTest 返回空 hits
 */
import { describe, expect, it } from "bun:test";
import { HitTestResult, type HitTestEntry } from "./hit-test.js";
import { RenderBox } from "../tree/render-box.js";
import { RenderObject } from "../tree/render-object.js";
import type { BoxConstraints } from "../tree/constraints.js";
import type { Screen } from "../screen/screen.js";

// ════════════════════════════════════════════════════
//  测试用辅助类
// ════════════════════════════════════════════════════

/** 具体的 RenderBox 子类，用于测试 */
class TestRenderBox extends RenderBox {
  constructor(
    width: number,
    height: number,
    offsetX = 0,
    offsetY = 0,
  ) {
    super();
    this._size = { width, height };
    this._offset = { x: offsetX, y: offsetY };
  }

  performLayout(): void {
    // no-op for tests
  }
}

/** 具体的 RenderObject 子类 (无 size/offset)，用于测试无边界节点 */
class TestRenderObject extends RenderObject {
  performLayout(): void {
    // no-op for tests
  }

  paint(_screen: Screen, _offsetX: number, _offsetY: number): void {
    // no-op for tests
  }
}

// ════════════════════════════════════════════════════
//  HitTestResult 基本功能
// ════════════════════════════════════════════════════

describe("HitTestResult", () => {
  describe("add", () => {
    it("正确累积条目", () => {
      const result = new HitTestResult();
      const target1 = new TestRenderBox(10, 10);
      const target2 = new TestRenderBox(20, 20);

      result.add({ target: target1, localPosition: { x: 1, y: 2 } });
      result.add({ target: target2, localPosition: { x: 3, y: 4 } });

      expect(result.hits).toHaveLength(2);
      expect(result.hits[0]!.target).toBe(target1);
      expect(result.hits[0]!.localPosition).toEqual({ x: 1, y: 2 });
      expect(result.hits[1]!.target).toBe(target2);
      expect(result.hits[1]!.localPosition).toEqual({ x: 3, y: 4 });
    });
  });

  describe("addWithPaintOffset", () => {
    it("计算局部坐标 (position - offset)", () => {
      const result = new HitTestResult();
      const target = new TestRenderBox(10, 10);

      result.addWithPaintOffset(
        target,
        { x: 5, y: 3 },   // offset
        { x: 8, y: 7 },   // position
      );

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]!.localPosition).toEqual({ x: 3, y: 4 }); // 8-5, 7-3
    });
  });

  describe("hits", () => {
    it("返回只读视图", () => {
      const result = new HitTestResult();
      const target = new TestRenderBox(10, 10);
      result.add({ target, localPosition: { x: 0, y: 0 } });

      const hits = result.hits;
      expect(hits).toHaveLength(1);
      // hits 是 readonly 数组，类型上不允许 push
      expect(Array.isArray(hits)).toBe(true);
    });
  });

  describe("hitTest 静态工厂", () => {
    it("创建 HitTestResult 并调用 root.hitTest", () => {
      const root = new TestRenderBox(80, 24, 0, 0);
      const result = HitTestResult.hitTest(root, { x: 5, y: 5 });

      expect(result).toBeInstanceOf(HitTestResult);
      // root 被命中 (5,5 在 0,0 到 80,24 范围内)
      expect(result.hits.length).toBeGreaterThanOrEqual(1);
      expect(result.hits[0]!.target).toBe(root);
    });

    it("空渲染树 (position 在 bounds 外) 返回空 hits", () => {
      const root = new TestRenderBox(10, 10, 0, 0);
      const result = HitTestResult.hitTest(root, { x: 100, y: 100 });

      expect(result.hits).toHaveLength(0);
    });
  });
});

// ════════════════════════════════════════════════════
//  RenderObject.hitTest 递归命中测试
// ════════════════════════════════════════════════════

describe("RenderObject.hitTest (递归)", () => {
  it("position 在 bounds 内返回 true", () => {
    const box = new TestRenderBox(10, 10, 5, 5);
    const result = new HitTestResult();

    const hit = box.hitTest(result, { x: 7, y: 7 });

    expect(hit).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]!.target).toBe(box);
    // localPosition = position - absPosition
    // absPosition = offsetX(0) + box.offset.x(5) = 5
    // localPosition.x = 7 - 5 = 2
    expect(result.hits[0]!.localPosition).toEqual({ x: 2, y: 2 });
  });

  it("position 在 bounds 外返回 false", () => {
    const box = new TestRenderBox(10, 10, 5, 5);
    const result = new HitTestResult();

    const hit = box.hitTest(result, { x: 0, y: 0 });

    expect(hit).toBe(false);
    expect(result.hits).toHaveLength(0);
  });

  it("子节点逆序遍历 (最后绘制的先命中)", () => {
    const parent = new TestRenderBox(80, 24, 0, 0);
    const child1 = new TestRenderBox(10, 10, 0, 0);
    const child2 = new TestRenderBox(10, 10, 0, 0);

    parent.adoptChild(child1);
    parent.adoptChild(child2);

    const result = new HitTestResult();
    parent.hitTest(result, { x: 5, y: 5 });

    // parent 先被加入，然后子节点逆序: child2 先于 child1
    expect(result.hits.length).toBe(3);
    expect(result.hits[0]!.target).toBe(parent);
    expect(result.hits[1]!.target).toBe(child2); // 后绘制的先命中
    expect(result.hits[2]!.target).toBe(child1);
  });

  it("嵌套层级正确计算偏移", () => {
    // parent at (0,0), size 80x24
    // child at (10,5), size 20x10
    // grandchild at (2,2), size 5x5
    const parent = new TestRenderBox(80, 24, 0, 0);
    const child = new TestRenderBox(20, 10, 10, 5);
    const grandchild = new TestRenderBox(5, 5, 2, 2);

    parent.adoptChild(child);
    child.adoptChild(grandchild);

    // 点击 (14, 9) — 应命中所有三个
    // parent abs: (0, 0), 14 在 [0, 80), 9 在 [0, 24) -> 命中
    // child abs: (0+10, 0+5) = (10, 5), 14 在 [10, 30), 9 在 [5, 15) -> 命中
    // grandchild abs: (10+2, 5+2) = (12, 7), 14 在 [12, 17), 9 在 [7, 12) -> 命中
    const result = new HitTestResult();
    parent.hitTest(result, { x: 14, y: 9 });

    expect(result.hits).toHaveLength(3);
    expect(result.hits[0]!.target).toBe(parent);
    expect(result.hits[0]!.localPosition).toEqual({ x: 14, y: 9 }); // 14-0, 9-0

    expect(result.hits[1]!.target).toBe(child);
    expect(result.hits[1]!.localPosition).toEqual({ x: 4, y: 4 }); // 14-10, 9-5

    expect(result.hits[2]!.target).toBe(grandchild);
    expect(result.hits[2]!.localPosition).toEqual({ x: 2, y: 2 }); // 14-12, 9-7
  });

  it("无 size/offset 时递归子节点", () => {
    // 使用没有 size/offset 的 RenderObject
    const root = new TestRenderObject();
    const child = new TestRenderBox(10, 10, 0, 0);

    root.adoptChild(child);

    const result = new HitTestResult();
    const hit = root.hitTest(result, { x: 5, y: 5 });

    // root 本身无 size, 不会加入 hits
    // 但会递归子节点，child 命中
    expect(hit).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]!.target).toBe(child);
  });

  it("position 恰好在边界上 (左上角闭)", () => {
    const box = new TestRenderBox(10, 10, 5, 5);
    const result = new HitTestResult();

    // 恰好在左上角 (5, 5)
    const hit = box.hitTest(result, { x: 5, y: 5 });
    expect(hit).toBe(true);
    expect(result.hits[0]!.localPosition).toEqual({ x: 0, y: 0 });
  });

  it("position 恰好在右下角 (开区间，不命中)", () => {
    const box = new TestRenderBox(10, 10, 0, 0);
    const result = new HitTestResult();

    // 恰好在右下角 (10, 10) — 开区间，不命中
    const hit = box.hitTest(result, { x: 10, y: 10 });
    expect(hit).toBe(false);
    expect(result.hits).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════
//  allowHitTestOutsideBounds 测试
// ════════════════════════════════════════════════════

describe("RenderObject.hitTest — allowHitTestOutsideBounds", () => {
  it("默认 allowHitTestOutsideBounds 为 false", () => {
    const box = new TestRenderBox(10, 10, 0, 0);
    expect(box.allowHitTestOutsideBounds).toBe(false);
  });

  it("allowHitTestOutsideBounds=false 时，position 在 bounds 外不命中子节点", () => {
    // parent at (0,0), size 10x10
    // child at (20, 20), size 5x5 (在 parent bounds 外)
    const parent = new TestRenderBox(10, 10, 0, 0);
    const child = new TestRenderBox(5, 5, 20, 20);

    parent.adoptChild(child);
    parent.allowHitTestOutsideBounds = false; // 默认值

    // 点击 (22, 22) — 在 child bounds 内，但在 parent bounds 外
    const result = new HitTestResult();
    const hit = parent.hitTest(result, { x: 22, y: 22 });

    // allowHitTestOutsideBounds=false 时，不应命中
    expect(hit).toBe(false);
    expect(result.hits).toHaveLength(0);
  });

  it("allowHitTestOutsideBounds=true 时，position 在 bounds 外仍命中子节点", () => {
    // parent at (0,0), size 10x10
    // child at (20, 20), size 5x5 (在 parent bounds 外)
    const parent = new TestRenderBox(10, 10, 0, 0);
    const child = new TestRenderBox(5, 5, 20, 20);

    parent.adoptChild(child);
    parent.allowHitTestOutsideBounds = true; // 启用边界外命中

    // 点击 (22, 22) — 在 child bounds 内，但在 parent bounds 外
    const result = new HitTestResult();
    const hit = parent.hitTest(result, { x: 22, y: 22 });

    // allowHitTestOutsideBounds=true 时，应命中 child
    expect(hit).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]!.target).toBe(child);
    // localPosition = position - child.absPosition = (22, 22) - (20, 20) = (2, 2)
    expect(result.hits[0]!.localPosition).toEqual({ x: 2, y: 2 });
  });

  it("allowHitTestOutsideBounds=true 时，parent 本身不被加入 hits", () => {
    // parent at (0,0), size 10x10
    // child at (20, 20), size 5x5 (在 parent bounds 外)
    const parent = new TestRenderBox(10, 10, 0, 0);
    const child = new TestRenderBox(5, 5, 20, 20);

    parent.adoptChild(child);
    parent.allowHitTestOutsideBounds = true;

    // 点击 (22, 22) — 在 child bounds 内，但在 parent bounds 外
    const result = new HitTestResult();
    parent.hitTest(result, { x: 22, y: 22 });

    // parent 本身不在 bounds 内，所以不应被加入 hits
    // 只有 child 被命中
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]!.target).toBe(child);
  });

  it("allowHitTestOutsideBounds=true 时，子节点逆序遍历", () => {
    // parent at (0,0), size 10x10
    // child1 at (20, 20), size 5x5
    // child2 at (20, 20), size 5x5 (与 child1 重叠)
    const parent = new TestRenderBox(10, 10, 0, 0);
    const child1 = new TestRenderBox(5, 5, 20, 20);
    const child2 = new TestRenderBox(5, 5, 20, 20);

    parent.adoptChild(child1);
    parent.adoptChild(child2);
    parent.allowHitTestOutsideBounds = true;

    // 点击 (22, 22) — 在两个 child 的 bounds 内
    const result = new HitTestResult();
    parent.hitTest(result, { x: 22, y: 22 });

    // 子节点逆序遍历: child2 先于 child1
    expect(result.hits).toHaveLength(2);
    expect(result.hits[0]!.target).toBe(child2); // 后绘制的先命中
    expect(result.hits[1]!.target).toBe(child1);
  });

  it("allowHitTestOutsideBounds 可被设置和读取", () => {
    const box = new TestRenderBox(10, 10, 0, 0);

    // 默认 false
    expect(box.allowHitTestOutsideBounds).toBe(false);

    // 设置为 true
    box.allowHitTestOutsideBounds = true;
    expect(box.allowHitTestOutsideBounds).toBe(true);

    // 设置回 false
    box.allowHitTestOutsideBounds = false;
    expect(box.allowHitTestOutsideBounds).toBe(false);
  });
});
