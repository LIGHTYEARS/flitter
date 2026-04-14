/**
 * Element 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖构造函数、mount/unmount、树操作、
 * dirty/rebuild、查找等核心行为。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/element.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Key, Widget } from "./element.js";
import { Element } from "./element.js";
import type { BuildOwnerLike } from "./types.js";
import { setBuildOwner } from "./types.js";

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

/** 具体 Element 子类，用于测试 */
class TestElement extends Element {
  rebuildCount = 0;

  performRebuild(): void {
    super.performRebuild();
    this.rebuildCount++;
  }
}

/** 用于 findAncestorElementOfType 测试的特殊 Element 子类 */
class SpecialElement extends Element {
  performRebuild(): void {
    super.performRebuild();
  }
}

/** Mock BuildOwner */
class MockBuildOwner implements BuildOwnerLike {
  scheduledElements: unknown[] = [];

  scheduleBuildFor(element: unknown): void {
    this.scheduledElements.push(element);
  }
}

// ════════════════════════════════════════════════════
//  构造函数测试
// ════════════════════════════════════════════════════

describe("Element — 构造函数", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 1. 保存 widget 引用 ─────────────────────────────
  it("保存 widget 引用", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    assert.equal(element.widget, widget);
  });

  // ── 2. 初始 dirty = true ────────────────────────────
  it("初始 dirty 为 true", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    assert.equal(element.dirty, true);
  });

  // ── 3. 初始 mounted = false ─────────────────────────
  it("初始 mounted 为 false", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    assert.equal(element.mounted, false);
  });
});

// ════════════════════════════════════════════════════
//  mount/unmount 测试
// ════════════════════════════════════════════════════

describe("Element — mount/unmount", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 4. mount 设置 mounted = true ────────────────────
  it("mount 设置 mounted 为 true", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    element.mount();

    assert.equal(element.mounted, true);
  });

  // ── 5. mount 设置 parent 引用 ───────────────────────
  it("mount 设置 parent 引用", () => {
    const parentWidget = new TestWidget();
    const childWidget = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child = new TestElement(childWidget);

    parent.mount();
    child.mount(parent);

    assert.equal(child.parent, parent);
  });

  // ── 6. mount 计算正确 depth (parent.depth + 1) ─────
  it("mount 计算正确 depth 为 parent.depth + 1", () => {
    const parentWidget = new TestWidget();
    const childWidget = new TestWidget();
    const grandchildWidget = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child = new TestElement(childWidget);
    const grandchild = new TestElement(grandchildWidget);

    parent.mount();
    child.mount(parent);
    grandchild.mount(child);

    assert.equal(child.depth, parent.depth + 1);
    assert.equal(grandchild.depth, child.depth + 1);
    assert.equal(grandchild.depth, parent.depth + 2);
  });

  // ── 7. mount 无 parent 时 depth = 0 ────────────────
  it("mount 无 parent 时 depth 为 0", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    element.mount();

    assert.equal(element.depth, 0);
  });

  // ── 8. unmount 设置 mounted = false ─────────────────
  it("unmount 设置 mounted 为 false", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    element.mount();
    assert.equal(element.mounted, true);

    element.unmount();

    assert.equal(element.mounted, false);
  });

  // ── 9. unmount 清除 parent ──────────────────────────
  it("unmount 清除 parent 引用", () => {
    const parentWidget = new TestWidget();
    const childWidget = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child = new TestElement(childWidget);

    parent.mount();
    child.mount(parent);
    assert.equal(child.parent, parent);

    child.unmount();

    assert.equal(child.parent, undefined);
  });

  // ── 10. unmount 递归 unmount children ───────────────
  it("unmount 递归 unmount 所有 children", () => {
    const rootWidget = new TestWidget();
    const childWidget = new TestWidget();
    const grandchildWidget = new TestWidget();
    const root = new TestElement(rootWidget);
    const child = new TestElement(childWidget);
    const grandchild = new TestElement(grandchildWidget);

    root.mount();
    child.mount(root);
    root.addChild(child);
    grandchild.mount(child);
    child.addChild(grandchild);

    assert.equal(root.mounted, true);
    assert.equal(child.mounted, true);
    assert.equal(grandchild.mounted, true);

    root.unmount();

    assert.equal(root.mounted, false);
    assert.equal(child.mounted, false);
    assert.equal(grandchild.mounted, false);
  });
});

// ════════════════════════════════════════════════════
//  树操作测试
// ════════════════════════════════════════════════════

describe("Element — 树操作", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 11. addChild 添加到 children ────────────────────
  it("addChild 将子节点添加到 children 数组", () => {
    const parentWidget = new TestWidget();
    const childWidget1 = new TestWidget();
    const childWidget2 = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child1 = new TestElement(childWidget1);
    const child2 = new TestElement(childWidget2);

    parent.addChild(child1);
    parent.addChild(child2);

    assert.equal(parent.children.length, 2);
    assert.ok(parent.children.includes(child1));
    assert.ok(parent.children.includes(child2));
  });

  // ── 12. addChild 设置 child.parent ──────────────────
  it("addChild 设置 child 的 parent 引用", () => {
    const parentWidget = new TestWidget();
    const childWidget = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child = new TestElement(childWidget);

    parent.addChild(child);

    assert.equal(child.parent, parent);
  });

  // ── 13. addChild 设置 child.depth = parent.depth + 1
  it("addChild 设置 child.depth 为 parent.depth + 1", () => {
    const parentWidget = new TestWidget();
    const childWidget = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child = new TestElement(childWidget);

    parent.mount(); // parent.depth = 0
    parent.addChild(child);

    assert.equal(child.depth, parent.depth + 1);
  });

  // ── 14. removeChild 从 children 移除 ────────────────
  it("removeChild 从 children 数组中移除子节点", () => {
    const parentWidget = new TestWidget();
    const childWidget1 = new TestWidget();
    const childWidget2 = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child1 = new TestElement(childWidget1);
    const child2 = new TestElement(childWidget2);

    parent.addChild(child1);
    parent.addChild(child2);
    assert.equal(parent.children.length, 2);

    parent.removeChild(child1);

    assert.equal(parent.children.length, 1);
    assert.ok(!parent.children.includes(child1));
    assert.ok(parent.children.includes(child2));
  });

  // ── 15. removeChild 清除 parent ─────────────────────
  it("removeChild 清除被移除子节点的 parent 引用", () => {
    const parentWidget = new TestWidget();
    const childWidget = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child = new TestElement(childWidget);

    parent.addChild(child);
    assert.equal(child.parent, parent);

    parent.removeChild(child);

    assert.equal(child.parent, undefined);
  });

  // ── 16. removeAllChildren 清空所有子节点 ─────────────
  it("removeAllChildren 清空所有子节点", () => {
    const parentWidget = new TestWidget();
    const parent = new TestElement(parentWidget);
    const child1 = new TestElement(new TestWidget());
    const child2 = new TestElement(new TestWidget());
    const child3 = new TestElement(new TestWidget());

    parent.addChild(child1);
    parent.addChild(child2);
    parent.addChild(child3);
    assert.equal(parent.children.length, 3);

    parent.removeAllChildren();

    assert.equal(parent.children.length, 0);
    assert.equal(child1.parent, undefined);
    assert.equal(child2.parent, undefined);
    assert.equal(child3.parent, undefined);
  });
});

// ════════════════════════════════════════════════════
//  dirty/rebuild 测试
// ════════════════════════════════════════════════════

describe("Element — dirty/rebuild", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 17. markNeedsRebuild 设置 dirty = true ──────────
  it("markNeedsRebuild 设置 dirty 为 true", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    // 先通过 performRebuild 清除 dirty
    element.performRebuild();
    assert.equal(element.dirty, false);

    element.markNeedsRebuild();

    assert.equal(element.dirty, true);
  });

  // ── 18. markNeedsRebuild 调用 BuildOwner.scheduleBuildFor
  it("markNeedsRebuild 调用 BuildOwner.scheduleBuildFor", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    // 清除初始 dirty 状态
    element.performRebuild();
    assert.equal(element.dirty, false);

    // 清除之前的调度记录
    mockOwner.scheduledElements = [];

    element.markNeedsRebuild();

    assert.ok(mockOwner.scheduledElements.length > 0, "应调用 BuildOwner.scheduleBuildFor");
    assert.ok(mockOwner.scheduledElements.includes(element));
  });

  // ── 19. markNeedsRebuild 已经 dirty 时不重复调用 scheduleBuildFor
  it("markNeedsRebuild 已经 dirty 时不重复调用 scheduleBuildFor", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    // element 初始 dirty = true，清除之前的调度记录
    mockOwner.scheduledElements = [];

    // 第一次 markNeedsRebuild — 由于已经 dirty，不应调用
    element.markNeedsRebuild();

    assert.equal(
      mockOwner.scheduledElements.length,
      0,
      "已经 dirty 时不应重复调用 scheduleBuildFor",
    );
  });

  // ── 20. performRebuild 清除 dirty 标记 ──────────────
  it("performRebuild 清除 dirty 标记", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    assert.equal(element.dirty, true);

    element.performRebuild();

    assert.equal(element.dirty, false);
  });

  // ── 21. update 更新 widget 引用 ─────────────────────
  it("update 更新 widget 引用", () => {
    const widget1 = new TestWidget();
    const widget2 = new TestWidget();
    const element = new TestElement(widget1);

    assert.equal(element.widget, widget1);

    element.update(widget2);

    assert.equal(element.widget, widget2);
  });
});

// ════════════════════════════════════════════════════
//  查找测试
// ════════════════════════════════════════════════════

describe("Element — 查找", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 22. findAncestorElementOfType 找到正确祖先 ──────
  it("findAncestorElementOfType 找到正确类型的祖先", () => {
    const rootWidget = new TestWidget();
    const childWidget = new TestWidget();
    const grandchildWidget = new TestWidget();

    const root = new SpecialElement(rootWidget);
    const child = new TestElement(childWidget);
    const grandchild = new TestElement(grandchildWidget);

    root.mount();
    child.mount(root);
    root.addChild(child);
    grandchild.mount(child);
    child.addChild(grandchild);

    const found = grandchild.findAncestorElementOfType(SpecialElement);

    assert.equal(found, root);
  });

  // ── 23. findAncestorElementOfType 找不到返回 null ───
  it("findAncestorElementOfType 找不到匹配类型时返回 null", () => {
    const rootWidget = new TestWidget();
    const childWidget = new TestWidget();

    const root = new TestElement(rootWidget);
    const child = new TestElement(childWidget);

    root.mount();
    child.mount(root);
    root.addChild(child);

    const found = child.findAncestorElementOfType(SpecialElement);

    assert.equal(found, null);
  });

  // ── 24. findRenderObject 基类返回 undefined ─────────
  it("findRenderObject 基类返回 undefined", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    const renderObject = element.findRenderObject();

    assert.equal(renderObject, undefined);
  });
});

// ════════════════════════════════════════════════════
//  补充测试
// ════════════════════════════════════════════════════

describe("Element — 补充测试", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 25. performRebuild 子类 hook 被调用 ─────────────
  it("performRebuild 子类 hook 计数器递增", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    assert.equal(element.rebuildCount, 0);

    element.performRebuild();

    assert.equal(element.rebuildCount, 1);
  });

  // ── 26. widget setter 更新引用 ──────────────────────
  it("widget setter 可直接更新 widget 引用", () => {
    const widget1 = new TestWidget();
    const widget2 = new TestWidget();
    const element = new TestElement(widget1);

    element.widget = widget2;

    assert.equal(element.widget, widget2);
  });

  // ── 27. children 为只读数组 ─────────────────────────
  it("children 初始为空数组", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    assert.ok(Array.isArray(element.children));
    assert.equal(element.children.length, 0);
  });

  // ── 28. renderObject 基类默认为 undefined ───────────
  it("renderObject 基类默认为 undefined", () => {
    const widget = new TestWidget();
    const element = new TestElement(widget);

    assert.equal(element.renderObject, undefined);
  });

  // ── 29. Widget.canUpdate 相同构造函数返回 true ──────
  it("TestWidget.canUpdate 相同构造函数返回 true", () => {
    const widget1 = new TestWidget();
    const widget2 = new TestWidget();

    assert.equal(widget1.canUpdate(widget2), true);
  });

  // ── 30. Widget.createElement 创建对应 Element ──────
  it("TestWidget.createElement 创建 TestElement 实例", () => {
    const widget = new TestWidget();
    const element = widget.createElement();

    assert.ok(element instanceof TestElement);
    assert.equal(element.widget, widget);
  });
});
