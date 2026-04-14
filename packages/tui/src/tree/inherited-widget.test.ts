/**
 * InheritedWidget + InheritedElement 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 InheritedWidget 创建、
 * InheritedElement 生命周期、依赖管理、通知机制和 Element 基类扩展。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/inherited-widget.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Key, Widget } from "./element.js";
import { Element } from "./element.js";
import { InheritedElement } from "./inherited-element.js";
import { InheritedWidget } from "./inherited-widget.js";
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

/** 最小 Element 实现，用于测试 */
class TestElement extends Element {
  rebuildCount = 0;

  override performRebuild(): void {
    super.performRebuild();
    this.rebuildCount++;
  }
}

/** 具体 InheritedWidget 实现用于测试 */
class TestInheritedWidget extends InheritedWidget {
  readonly value: number;

  constructor(opts: { value: number; child: Widget }) {
    super({ child: opts.child });
    this.value = opts.value;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.value !== (oldWidget as TestInheritedWidget).value;
  }
}

/** 第二种 InheritedWidget 用于多类型测试 */
class AnotherInheritedWidget extends InheritedWidget {
  readonly name: string;

  constructor(opts: { name: string; child: Widget }) {
    super({ child: opts.child });
    this.name = opts.name;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.name !== (oldWidget as AnotherInheritedWidget).name;
  }
}

/** 模拟 BuildOwner 用于跟踪调度 */
class MockBuildOwner implements BuildOwnerLike {
  scheduled: Element[] = [];
  scheduleBuildFor(element: Element): void {
    this.scheduled.push(element);
  }
}

let mockBuildOwner: MockBuildOwner;

afterEach(() => {
  setBuildOwner(undefined);
});

// ════════════════════════════════════════════════════
//  InheritedWidget 基本行为
// ════════════════════════════════════════════════════

describe("InheritedWidget", () => {
  it("createElement 返回 InheritedElement 实例", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 42, child });
    const element = widget.createElement();
    assert.ok(element instanceof InheritedElement);
  });

  it("child 属性正确设置", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 10, child });
    assert.strictEqual(widget.child, child);
  });

  it("canUpdate 同类型返回 true", () => {
    const child1 = new TestWidget();
    const child2 = new TestWidget();
    const w1 = new TestInheritedWidget({ value: 1, child: child1 });
    const w2 = new TestInheritedWidget({ value: 2, child: child2 });
    assert.ok(w1.canUpdate(w2));
  });

  it("canUpdate 不同类型返回 false", () => {
    const child1 = new TestWidget();
    const child2 = new TestWidget();
    const w1 = new TestInheritedWidget({ value: 1, child: child1 });
    const w2 = new AnotherInheritedWidget({ name: "x", child: child2 });
    assert.ok(!w1.canUpdate(w2));
  });
});

// ════════════════════════════════════════════════════
//  InheritedElement 生命周期
// ════════════════════════════════════════════════════

describe("InheritedElement", () => {
  it("mount 自动挂载 child", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const element = widget.createElement() as InheritedElement;

    element.mount(undefined);

    assert.strictEqual(element.children.length, 1);
    assert.ok(element.children[0]!.mounted);
  });

  it("mount 后 child 的 parent 是 InheritedElement", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const element = widget.createElement() as InheritedElement;

    element.mount(undefined);

    assert.strictEqual(element.children[0]!.parent, element);
  });
});

// ════════════════════════════════════════════════════
//  依赖管理 (addDependent / removeDependent)
// ════════════════════════════════════════════════════

describe("InheritedElement 依赖管理", () => {
  it("addDependent/removeDependent 维护 dependents 集合", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const dependent = new TestElement(new TestWidget());
    dependent.mount(inherited);

    inherited.addDependent(dependent);
    // 通过 update 触发通知来验证 dependent 被追踪
    mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    const newWidget = new TestInheritedWidget({ value: 2, child: new TestWidget() });
    inherited.update(newWidget);

    assert.ok(mockBuildOwner.scheduled.includes(dependent));
  });

  it("removeDependent 后不再通知", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const dependent = new TestElement(new TestWidget());
    dependent.mount(inherited);

    inherited.addDependent(dependent);
    inherited.removeDependent(dependent);

    mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    const newWidget = new TestInheritedWidget({ value: 2, child: new TestWidget() });
    inherited.update(newWidget);

    assert.ok(!mockBuildOwner.scheduled.includes(dependent));
  });
});

// ════════════════════════════════════════════════════
//  update + updateShouldNotify
// ════════════════════════════════════════════════════

describe("InheritedElement update 通知", () => {
  it("updateShouldNotify 返回 true 时通知 dependents markNeedsRebuild", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const dependent = new TestElement(new TestWidget());
    dependent.mount(inherited);
    inherited.addDependent(dependent);

    mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    // value 变化 → updateShouldNotify 返回 true
    const newWidget = new TestInheritedWidget({ value: 999, child: new TestWidget() });
    inherited.update(newWidget);

    assert.ok(mockBuildOwner.scheduled.includes(dependent));
  });

  it("updateShouldNotify 返回 false 时不通知 dependents", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const dependent = new TestElement(new TestWidget());
    dependent.mount(inherited);
    inherited.addDependent(dependent);

    mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    // value 相同 → updateShouldNotify 返回 false
    const newWidget = new TestInheritedWidget({ value: 1, child: new TestWidget() });
    inherited.update(newWidget);

    assert.ok(!mockBuildOwner.scheduled.includes(dependent));
  });

  it("update 正确更新子 Widget (canUpdate)", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const childElement = inherited.children[0]!;
    const newChild = new TestWidget();
    const newWidget = new TestInheritedWidget({ value: 2, child: newChild });

    inherited.update(newWidget);

    // child element 仍然是同一个（被复用）
    assert.strictEqual(inherited.children[0], childElement);
    // widget 已更新
    assert.strictEqual(inherited.children[0]!.widget, newChild);
  });
});

// ════════════════════════════════════════════════════
//  dependOnInheritedWidgetOfExactType
// ════════════════════════════════════════════════════

describe("Element.dependOnInheritedWidgetOfExactType", () => {
  it("查找正确的祖先 InheritedElement", () => {
    const leafWidget = new TestWidget();
    const widget = new TestInheritedWidget({ value: 42, child: leafWidget });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    const found = leaf.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    assert.strictEqual(found, inherited);
  });

  it("注册双向依赖", () => {
    const leafWidget = new TestWidget();
    const widget = new TestInheritedWidget({ value: 42, child: leafWidget });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    leaf.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    // 验证 inherited 的 dependents 包含 leaf
    mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    const newWidget = new TestInheritedWidget({ value: 99, child: new TestWidget() });
    inherited.update(newWidget);

    assert.ok(mockBuildOwner.scheduled.includes(leaf));
  });

  it("多层嵌套: 查找最近的匹配祖先", () => {
    // 构造: outer(InheritedWidget) → inner(InheritedWidget) → leaf
    const leafWidget = new TestWidget();
    const innerWidget = new TestInheritedWidget({ value: 2, child: leafWidget });
    const outerWidget = new TestInheritedWidget({ value: 1, child: innerWidget });

    const outerElement = outerWidget.createElement() as InheritedElement;
    outerElement.mount(undefined);

    // outer → innerElement → leafElement
    const innerElement = outerElement.children[0]! as InheritedElement;
    const leafElement = innerElement.children[0]!;

    const found = leafElement.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    // 应该找到最近的 inner，而不是 outer
    assert.strictEqual(found, innerElement);
  });

  it("不存在的 widgetType 返回 null", () => {
    const child = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    const found = leaf.dependOnInheritedWidgetOfExactType(AnotherInheritedWidget);

    assert.strictEqual(found, null);
  });

  it("区分不同类型的 InheritedWidget", () => {
    // 构造: TestInherited → AnotherInherited → leaf
    const leafWidget = new TestWidget();
    const innerWidget = new AnotherInheritedWidget({ name: "hello", child: leafWidget });
    const outerWidget = new TestInheritedWidget({ value: 1, child: innerWidget });

    const outerElement = outerWidget.createElement() as InheritedElement;
    outerElement.mount(undefined);

    const innerElement = outerElement.children[0]! as InheritedElement;
    const leafElement = innerElement.children[0]!;

    // 查找 TestInheritedWidget 应找到 outerElement
    const foundTest = leafElement.dependOnInheritedWidgetOfExactType(TestInheritedWidget);
    assert.strictEqual(foundTest, outerElement);

    // 查找 AnotherInheritedWidget 应找到 innerElement
    const foundAnother = leafElement.dependOnInheritedWidgetOfExactType(AnotherInheritedWidget);
    assert.strictEqual(foundAnother, innerElement);
  });
});

// ════════════════════════════════════════════════════
//  unmount 清除依赖
// ════════════════════════════════════════════════════

describe("unmount 清除 InheritedElement 依赖", () => {
  it("unmount 清除所有 _inheritedDependencies", () => {
    const leafWidget = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child: leafWidget });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    leaf.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    // unmount leaf — 应清除依赖
    leaf.unmount();

    // 验证 inherited 的 dependents 不再包含 leaf
    mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    const newWidget = new TestInheritedWidget({ value: 999, child: new TestWidget() });
    inherited.update(newWidget);

    assert.ok(!mockBuildOwner.scheduled.includes(leaf));
  });

  it("unmount 从 InheritedElement 的 dependents 中移除自身", () => {
    const leafWidget = new TestWidget();
    const widget = new TestInheritedWidget({ value: 1, child: leafWidget });
    const inherited = widget.createElement() as InheritedElement;
    inherited.mount(undefined);

    const leaf = inherited.children[0]!;
    leaf.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    leaf.unmount();

    // 再添加新的 dependent 并 update — 确保旧 leaf 不被通知
    const newDependent = new TestElement(new TestWidget());
    newDependent.mount(inherited);
    inherited.addDependent(newDependent);

    mockBuildOwner = new MockBuildOwner();
    setBuildOwner(mockBuildOwner);

    const newWidget = new TestInheritedWidget({ value: 999, child: new TestWidget() });
    inherited.update(newWidget);

    // 只有 newDependent 被通知
    assert.ok(mockBuildOwner.scheduled.includes(newDependent));
    assert.ok(!mockBuildOwner.scheduled.includes(leaf));
  });
});
