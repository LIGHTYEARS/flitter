/**
 * InheritedWidget / InheritedElement 单元测试。
 *
 * 覆盖 InheritedWidget 创建、InheritedElement 生命周期、
 * addDependent/removeDependent 依赖管理、updateShouldNotify 通知机制、
 * dependOnInheritedWidgetOfExactType 向上查找与依赖注册、
 * unmount 清除依赖关系等核心行为。
 *
 * 运行方式：
 * ```bash
 * bun test packages/tui/src/tree/inherited-widget.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Element } from "./element.js";
import { InheritedElement } from "./inherited-element.js";
import { InheritedWidget } from "./inherited-widget.js";
import type { BuildOwnerLike } from "./types.js";
import { setBuildOwner } from "./types.js";
import { Widget } from "./widget.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** Mock BuildOwner，记录被调度的元素 */
class MockBuildOwner implements BuildOwnerLike {
  scheduledElements: unknown[] = [];

  scheduleBuildFor(element: unknown): void {
    this.scheduledElements.push(element);
  }
}

/** 叶子 Widget，作为 child 使用 */
class LeafWidget extends Widget {
  createElement(): Element {
    return new LeafElement(this);
  }
}

/** 叶子 Element，performRebuild 为空操作 */
class LeafElement extends Element {
  performRebuild(): void {
    this._dirty = false;
  }
}

/** 具体的 InheritedWidget 子类: 颜色主题 */
class TestThemeWidget extends InheritedWidget {
  readonly color: string;

  constructor(opts: { color: string; child: Widget }) {
    super({ child: opts.child });
    this.color = opts.color;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.color !== (oldWidget as TestThemeWidget).color;
  }
}

/** 另一种具体的 InheritedWidget 子类: locale */
class TestLocaleWidget extends InheritedWidget {
  readonly locale: string;

  constructor(opts: { locale: string; child: Widget }) {
    super({ child: opts.child });
    this.locale = opts.locale;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.locale !== (oldWidget as TestLocaleWidget).locale;
  }
}

// ════════════════════════════════════════════════════
//  测试
// ════════════════════════════════════════════════════

describe("InheritedWidget", () => {
  let buildOwner: MockBuildOwner;

  beforeEach(() => {
    buildOwner = new MockBuildOwner();
    setBuildOwner(buildOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ────────────────────────────────────────
  // 1. InheritedWidget.createElement 返回 InheritedElement 实例
  // ────────────────────────────────────────
  it("createElement 返回 InheritedElement 实例", () => {
    const leaf = new LeafWidget();
    const widget = new TestThemeWidget({ color: "red", child: leaf });
    const element = widget.createElement();
    assert.ok(element instanceof InheritedElement, "应返回 InheritedElement 实例");
  });

  // ────────────────────────────────────────
  // 2. InheritedElement.mount 自动挂载 child
  // ────────────────────────────────────────
  it("mount 自动创建并挂载 child Element", () => {
    const leaf = new LeafWidget();
    const widget = new TestThemeWidget({ color: "blue", child: leaf });
    const element = widget.createElement() as InheritedElement;
    element.mount();

    assert.equal(element.children.length, 1, "应有 1 个子元素");
    assert.ok(element.children[0]!.mounted, "子元素应已挂载");
    assert.ok(element.children[0] instanceof LeafElement, "子元素应为 LeafElement");
  });

  // ────────────────────────────────────────
  // 3. addDependent / removeDependent 维护 dependents 集合
  // ────────────────────────────────────────
  it("addDependent / removeDependent 维护依赖集合", () => {
    const leaf = new LeafWidget();
    const widget = new TestThemeWidget({ color: "green", child: leaf });
    const element = widget.createElement() as InheritedElement;
    element.mount();

    const consumer = new LeafElement(new LeafWidget());
    consumer.mount(element);

    assert.equal(element.dependentCount, 0, "初始无依赖");

    element.addDependent(consumer);
    assert.equal(element.dependentCount, 1, "添加后有 1 个依赖");

    element.removeDependent(consumer);
    assert.equal(element.dependentCount, 0, "移除后无依赖");
  });

  // ────────────────────────────────────────
  // 4. update + updateShouldNotify → true: 通知 dependents markNeedsRebuild
  // ────────────────────────────────────────
  it("update 调用 updateShouldNotify → true 时通知 dependents", () => {
    const leaf = new LeafWidget();
    const widget = new TestThemeWidget({ color: "red", child: leaf });
    const element = widget.createElement() as InheritedElement;
    element.mount();

    // 创建并注册 consumer
    const consumer = new LeafElement(new LeafWidget());
    consumer.mount(element);
    element.addDependent(consumer);
    // 消费者先清除脏标记
    consumer.performRebuild();
    assert.equal(consumer.dirty, false, "consumer 初始不脏");

    // 颜色变了 → updateShouldNotify 返回 true
    const newWidget = new TestThemeWidget({ color: "blue", child: leaf });
    element.update(newWidget);

    assert.equal(consumer.dirty, true, "consumer 应被标记为脏");
  });

  // ────────────────────────────────────────
  // 5. update + updateShouldNotify → false: 不通知
  // ────────────────────────────────────────
  it("update 调用 updateShouldNotify → false 时不通知 dependents", () => {
    const leaf = new LeafWidget();
    const widget = new TestThemeWidget({ color: "red", child: leaf });
    const element = widget.createElement() as InheritedElement;
    element.mount();

    const consumer = new LeafElement(new LeafWidget());
    consumer.mount(element);
    element.addDependent(consumer);
    consumer.performRebuild();
    assert.equal(consumer.dirty, false, "consumer 初始不脏");

    // 相同颜色 → updateShouldNotify 返回 false
    const newWidget = new TestThemeWidget({ color: "red", child: leaf });
    element.update(newWidget);

    assert.equal(consumer.dirty, false, "consumer 不应被标记为脏");
  });

  // ────────────────────────────────────────
  // 6. dependOnInheritedWidgetOfExactType 查找正确的祖先
  // ────────────────────────────────────────
  it("dependOnInheritedWidgetOfExactType 找到正确的祖先", () => {
    const leaf = new LeafWidget();
    const themeWidget = new TestThemeWidget({ color: "red", child: leaf });
    const themeElement = themeWidget.createElement() as InheritedElement;
    themeElement.mount();

    // child 是 themeElement.children[0]
    const childElement = themeElement.children[0]!;
    const found = childElement.dependOnInheritedWidgetOfExactType(TestThemeWidget);

    assert.ok(found !== null, "应找到祖先");
    assert.equal(found, themeElement, "应为 themeElement");
  });

  // ────────────────────────────────────────
  // 7. dependOnInheritedWidgetOfExactType 注册双向依赖
  // ────────────────────────────────────────
  it("dependOnInheritedWidgetOfExactType 注册双向依赖", () => {
    const leaf = new LeafWidget();
    const themeWidget = new TestThemeWidget({ color: "red", child: leaf });
    const themeElement = themeWidget.createElement() as InheritedElement;
    themeElement.mount();

    const childElement = themeElement.children[0]!;
    childElement.dependOnInheritedWidgetOfExactType(TestThemeWidget);

    // InheritedElement 的 dependents 应包含 childElement
    assert.equal(themeElement.dependentCount, 1, "themeElement 应有 1 个 dependent");
  });

  // ────────────────────────────────────────
  // 8. 多层嵌套: 查找最近的匹配祖先
  // ────────────────────────────────────────
  it("多层嵌套时查找最近的匹配祖先", () => {
    const leaf = new LeafWidget();

    // 外层: TestThemeWidget color=red
    const outerTheme = new TestThemeWidget({ color: "red", child: leaf });
    const outerElement = outerTheme.createElement() as InheritedElement;
    outerElement.mount();

    // 在 outerElement.children[0] 下手动构建内层 InheritedElement
    const innerTheme = new TestThemeWidget({ color: "blue", child: leaf });
    const innerElement = innerTheme.createElement() as InheritedElement;
    outerElement.addChild(innerElement);
    innerElement.mount(outerElement);

    // 在 innerElement 下创建消费者
    const consumer = new LeafElement(new LeafWidget());
    innerElement.addChild(consumer);
    consumer.mount(innerElement);

    const found = consumer.dependOnInheritedWidgetOfExactType(TestThemeWidget);

    // 应找到 innerElement（最近的祖先），而不是 outerElement
    assert.equal(found, innerElement, "应找到最近的 InheritedElement");
    assert.equal(innerElement.dependentCount, 1, "innerElement 应有 1 个 dependent");
    assert.equal(outerElement.dependentCount, 0, "outerElement 不应有 dependent");
  });

  // ────────────────────────────────────────
  // 9. unmount 清除所有 _inheritedDependencies
  // ────────────────────────────────────────
  it("unmount 清除所有 _inheritedDependencies", () => {
    const leaf = new LeafWidget();
    const themeWidget = new TestThemeWidget({ color: "red", child: leaf });
    const themeElement = themeWidget.createElement() as InheritedElement;
    themeElement.mount();

    const consumer = new LeafElement(new LeafWidget());
    themeElement.addChild(consumer);
    consumer.mount(themeElement);

    // 注册依赖
    consumer.dependOnInheritedWidgetOfExactType(TestThemeWidget);
    assert.equal(themeElement.dependentCount, 1, "注册后 themeElement 有 1 个 dependent");

    // 卸载 consumer
    consumer.unmount();

    // InheritedElement 的 dependents 应已移除 consumer
    assert.equal(themeElement.dependentCount, 0, "unmount 后 themeElement 无 dependent");
  });

  // ────────────────────────────────────────
  // 10. unmount 从 InheritedElement 的 dependents 中移除自身
  // ────────────────────────────────────────
  it("unmount 从多个 InheritedElement 的 dependents 中移除自身", () => {
    const leaf = new LeafWidget();

    // 构建 Theme + Locale 双层 InheritedWidget
    const themeWidget = new TestThemeWidget({ color: "red", child: leaf });
    const themeElement = themeWidget.createElement() as InheritedElement;
    themeElement.mount();

    const localeWidget = new TestLocaleWidget({ locale: "zh", child: leaf });
    const localeElement = localeWidget.createElement() as InheritedElement;
    themeElement.addChild(localeElement);
    localeElement.mount(themeElement);

    // 在 localeElement 下创建消费者
    const consumer = new LeafElement(new LeafWidget());
    localeElement.addChild(consumer);
    consumer.mount(localeElement);

    // 注册对两个 InheritedWidget 的依赖
    consumer.dependOnInheritedWidgetOfExactType(TestThemeWidget);
    consumer.dependOnInheritedWidgetOfExactType(TestLocaleWidget);

    assert.equal(themeElement.dependentCount, 1, "themeElement 有 1 个 dependent");
    assert.equal(localeElement.dependentCount, 1, "localeElement 有 1 个 dependent");

    // 卸载 consumer
    consumer.unmount();

    assert.equal(themeElement.dependentCount, 0, "themeElement 已无 dependent");
    assert.equal(localeElement.dependentCount, 0, "localeElement 已无 dependent");
  });

  // ────────────────────────────────────────
  // 11. 不存在的 widgetType 返回 null
  // ────────────────────────────────────────
  it("dependOnInheritedWidgetOfExactType 不存在时返回 null", () => {
    const leaf = new LeafWidget();
    const themeWidget = new TestThemeWidget({ color: "red", child: leaf });
    const themeElement = themeWidget.createElement() as InheritedElement;
    themeElement.mount();

    const childElement = themeElement.children[0]!;

    // 搜索 TestLocaleWidget，但树中只有 TestThemeWidget
    const found = childElement.dependOnInheritedWidgetOfExactType(TestLocaleWidget);
    assert.equal(found, null, "应返回 null");
  });

  // ────────────────────────────────────────
  // 12. InheritedElement 子 Widget 更新 (canUpdate)
  // ────────────────────────────────────────
  it("update 时子 Widget canUpdate → 复用并更新子 Element", () => {
    const leaf = new LeafWidget();
    const widget = new TestThemeWidget({ color: "red", child: leaf });
    const element = widget.createElement() as InheritedElement;
    element.mount();

    const originalChild = element.children[0]!;
    assert.ok(originalChild instanceof LeafElement, "初始子元素为 LeafElement");

    // 用新 leaf 更新（同类型无 key → canUpdate 为 true）
    const newLeaf = new LeafWidget();
    const newWidget = new TestThemeWidget({ color: "blue", child: newLeaf });
    element.update(newWidget);

    // 子 Element 应被复用（引用相同）
    assert.equal(element.children[0], originalChild, "子 Element 应被复用");
    // widget 应已更新为 newLeaf
    assert.equal(element.children[0]!.widget, newLeaf, "子 Widget 应已更新");
  });
});
