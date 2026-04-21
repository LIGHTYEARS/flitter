/**
 * ForceDimWidget 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 ForceDimWidget 的创建、
 * 静态查询方法、updateShouldNotify 逻辑，以及与 ContainerElement
 * 的集成（mount/rebuild 时自动读取 forceDim 状态）。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/force-dim.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Key, Widget } from "../tree/element.js";
import { Element } from "../tree/element.js";
import { InheritedElement } from "../tree/inherited-element.js";
import type { BuildOwnerLike } from "../tree/types.js";
import { setBuildOwner } from "../tree/types.js";
import { ForceDimWidget } from "./force-dim.js";

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

/** 最小 Element 实现，用于测试 */
class TestElement extends Element {
  rebuildCount = 0;

  override performRebuild(): void {
    super.performRebuild();
    this.rebuildCount++;
  }
}

/** 模拟 BuildOwner 用于跟踪调度 */
class MockBuildOwner implements BuildOwnerLike {
  scheduled: Element[] = [];
  scheduleBuildFor(element: Element): void {
    this.scheduled.push(element);
  }
}

afterEach(() => {
  setBuildOwner(undefined);
});

// ════════════════════════════════════════════════════
//  ForceDimWidget 基本行为
// ════════════════════════════════════════════════════

describe("ForceDimWidget", () => {
  it("createElement 返回 InheritedElement 实例", () => {
    const child = new TestWidget();
    const widget = new ForceDimWidget({ forceDim: true, child });
    const element = widget.createElement();
    assert.ok(element instanceof InheritedElement);
  });

  it("forceDim 属性正确设置 (true)", () => {
    const child = new TestWidget();
    const widget = new ForceDimWidget({ forceDim: true, child });
    assert.strictEqual(widget.forceDim, true);
  });

  it("forceDim 属性正确设置 (false)", () => {
    const child = new TestWidget();
    const widget = new ForceDimWidget({ forceDim: false, child });
    assert.strictEqual(widget.forceDim, false);
  });

  it("child 属性正确设置", () => {
    const child = new TestWidget();
    const widget = new ForceDimWidget({ forceDim: true, child });
    assert.strictEqual(widget.child, child);
  });

  it("canUpdate 同类型返回 true", () => {
    const c1 = new TestWidget();
    const c2 = new TestWidget();
    const w1 = new ForceDimWidget({ forceDim: true, child: c1 });
    const w2 = new ForceDimWidget({ forceDim: false, child: c2 });
    assert.ok(w1.canUpdate(w2));
  });

  it("canUpdate 不同类型返回 false", () => {
    const child = new TestWidget();
    const widget = new ForceDimWidget({ forceDim: true, child });
    const other = new TestWidget();
    assert.ok(!widget.canUpdate(other));
  });
});

// ════════════════════════════════════════════════════
//  updateShouldNotify
// ════════════════════════════════════════════════════

describe("ForceDimWidget.updateShouldNotify", () => {
  it("值不变时返回 false", () => {
    const child = new TestWidget();
    const w1 = new ForceDimWidget({ forceDim: true, child });
    const w2 = new ForceDimWidget({ forceDim: true, child });
    assert.strictEqual(w1.updateShouldNotify(w2), false);
  });

  it("值变化时返回 true (true → false)", () => {
    const child = new TestWidget();
    const w1 = new ForceDimWidget({ forceDim: true, child });
    const w2 = new ForceDimWidget({ forceDim: false, child });
    assert.strictEqual(w1.updateShouldNotify(w2), true);
  });

  it("值变化时返回 true (false → true)", () => {
    const child = new TestWidget();
    const w1 = new ForceDimWidget({ forceDim: false, child });
    const w2 = new ForceDimWidget({ forceDim: true, child });
    assert.strictEqual(w1.updateShouldNotify(w2), true);
  });
});

// ════════════════════════════════════════════════════
//  静态方法: maybeOf / shouldForceDim
// ════════════════════════════════════════════════════

describe("ForceDimWidget.maybeOf", () => {
  it("有 ForceDimWidget 祖先时返回该 widget", () => {
    const leafWidget = new TestWidget();
    const forceDim = new ForceDimWidget({ forceDim: true, child: leafWidget });
    const inherited = forceDim.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    const found = ForceDimWidget.maybeOf(leaf);

    assert.ok(found !== null);
    assert.strictEqual(found!.forceDim, true);
    assert.strictEqual(found, forceDim);
  });

  it("无 ForceDimWidget 祖先时返回 null", () => {
    const leafWidget = new TestWidget();
    const leaf = leafWidget.createElement();
    leaf.mount(undefined);

    const found = ForceDimWidget.maybeOf(leaf);
    assert.strictEqual(found, null);
  });
});

describe("ForceDimWidget.shouldForceDim", () => {
  it("有 forceDim:true 祖先时返回 true", () => {
    const leafWidget = new TestWidget();
    const forceDim = new ForceDimWidget({ forceDim: true, child: leafWidget });
    const inherited = forceDim.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    assert.strictEqual(ForceDimWidget.shouldForceDim(leaf), true);
  });

  it("有 forceDim:false 祖先时返回 false", () => {
    const leafWidget = new TestWidget();
    const forceDim = new ForceDimWidget({ forceDim: false, child: leafWidget });
    const inherited = forceDim.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    assert.strictEqual(ForceDimWidget.shouldForceDim(leaf), false);
  });

  it("无 ForceDimWidget 祖先时返回 false (逆向: ?? !1)", () => {
    const leafWidget = new TestWidget();
    const leaf = leafWidget.createElement();
    leaf.mount(undefined);

    assert.strictEqual(ForceDimWidget.shouldForceDim(leaf), false);
  });
});

// ════════════════════════════════════════════════════
//  依赖通知集成
// ════════════════════════════════════════════════════

describe("ForceDimWidget 依赖通知", () => {
  it("forceDim 变化时通知依赖方", () => {
    const leafWidget = new TestWidget();
    const widget = new ForceDimWidget({ forceDim: false, child: leafWidget });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    leaf.performRebuild(); // 清除 dirty 标记

    // 注册依赖
    leaf.dependOnInheritedWidgetOfExactType(ForceDimWidget);

    // 设置 BuildOwner 以跟踪调度
    const mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    // 用不同 forceDim 值更新
    const newChild = new TestWidget();
    const newWidget = new ForceDimWidget({ forceDim: true, child: newChild });
    inherited.update(newWidget);

    // leaf 应被调度重建
    assert.ok(mockBuildOwner.scheduled.includes(leaf));
  });

  it("forceDim 不变时不通知依赖方", () => {
    const leafWidget = new TestWidget();
    const widget = new ForceDimWidget({ forceDim: true, child: leafWidget });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    leaf.performRebuild(); // 清除 dirty 标记

    // 注册依赖
    leaf.dependOnInheritedWidgetOfExactType(ForceDimWidget);

    // 设置 BuildOwner 以跟踪调度
    const mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    // 用相同 forceDim 值更新
    const newChild = new TestWidget();
    const newWidget = new ForceDimWidget({ forceDim: true, child: newChild });
    inherited.update(newWidget);

    // leaf 不应被调度重建
    assert.ok(!mockBuildOwner.scheduled.includes(leaf));
  });
});
