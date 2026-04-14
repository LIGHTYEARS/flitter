/**
 * ComponentElement + RenderObjectElement + reconciliation 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 ComponentElement 协调算法、
 * RenderObjectElement 渲染对象管理、跨树桥接等核心行为。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/reconciliation.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ComponentElement } from "./component-element.js";
import type { Element, Widget } from "./element.js";
import { RenderBox } from "./render-box.js";
import type { RenderObject } from "./render-object.js";
import type { RenderObjectWidget } from "./render-object-element.js";
import { RenderObjectElement } from "./render-object-element.js";
import type { BuildOwnerLike, PipelineOwnerLike } from "./types.js";
import { setBuildOwner, setPipelineOwner } from "./types.js";
import { Key as KeyImpl, Widget as WidgetBase } from "./widget.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** Mock BuildOwner */
class MockBuildOwner implements BuildOwnerLike {
  scheduledElements: unknown[] = [];

  scheduleBuildFor(element: unknown): void {
    this.scheduledElements.push(element);
  }
}

/** Mock PipelineOwner */
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

/** 最小 RenderBox 实现，performLayout 为空操作 */
class TestRenderBox extends RenderBox {
  performLayout(): void {
    // no-op for testing
  }
}

/** 可实例化的 RenderObjectWidget，实现 createRenderObject / updateRenderObject */
class TestRenderObjectWidget extends WidgetBase implements RenderObjectWidget {
  /** 最近一次 updateRenderObject 调用接收到的 renderObject */
  updatedRenderObject: RenderObject | undefined = undefined;

  /** 用于验证 update 是否被调用的标志 */
  updateCallCount = 0;

  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }

  updateRenderObject(renderObject: RenderObject): void {
    this.updatedRenderObject = renderObject;
    this.updateCallCount++;
  }

  createElement(): Element {
    return new TestRenderObjectElement(this);
  }
}

/** 具体 RenderObjectElement 实现 */
class TestRenderObjectElement extends RenderObjectElement {
  // 委托给 widget 的 createRenderObject / updateRenderObject
}

/** 可配置子 Widget 的 ComponentWidget */
class TestComponentWidget extends WidgetBase {
  childWidget: Widget | undefined;

  constructor(opts?: { key?: KeyImpl; child?: Widget }) {
    super(opts);
    this.childWidget = opts?.child;
  }

  createElement(): Element {
    return new TestComponentElement(this);
  }
}

/** 具体 ComponentElement 实现，build() 返回 widget 配置的 childWidget */
class TestComponentElement extends ComponentElement {
  build(): Widget {
    return (this.widget as TestComponentWidget).childWidget!;
  }
}

// ════════════════════════════════════════════════════
//  ComponentElement 协调测试
// ════════════════════════════════════════════════════

describe("ComponentElement — 协调测试", () => {
  let mockBuildOwner: MockBuildOwner;
  let mockPipelineOwner: MockPipelineOwner;

  beforeEach(() => {
    mockBuildOwner = new MockBuildOwner();
    mockPipelineOwner = new MockPipelineOwner();
    setBuildOwner(mockBuildOwner);
    setPipelineOwner(mockPipelineOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  });

  // ── 1. mount 触发 performRebuild 和 build ────────────
  it("mount 触发 performRebuild 和 build，child element 存在", () => {
    const childWidget = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: childWidget });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    // mount 后应自动调用 performRebuild -> build -> updateChild
    // 子元素应该存在
    assert.ok(element.children.length > 0, "mount 后应有子元素");
  });

  // ── 2. build 返回的子 Widget 创建为子 Element ────────
  it("build 返回的子 Widget 创建为对应 Element", () => {
    const childWidget = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: childWidget });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    const child = element.children[0];
    assert.ok(child !== undefined, "子 Element 应该存在");
    assert.equal(child.widget, childWidget, "子 Element 的 widget 应为 build 返回的 Widget");
  });

  // ── 3. rebuild 时子 Widget canUpdate → 复用 Element ──
  it("rebuild 时子 Widget canUpdate 返回 true 则复用 Element (update)", () => {
    const childWidget1 = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: childWidget1 });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    const originalChild = element.children[0];
    assert.ok(originalChild !== undefined);

    // 创建同类型（canUpdate 为 true）的新子 Widget
    const childWidget2 = new TestRenderObjectWidget();
    (element.widget as TestComponentWidget).childWidget = childWidget2;

    // 触发 rebuild
    element.markNeedsRebuild();
    element.performRebuild();

    const newChild = element.children[0];
    // 应该复用同一 Element 实例
    assert.equal(newChild, originalChild, "canUpdate 时应复用同一 Element 实例");
    // widget 应已更新
    assert.equal(newChild.widget, childWidget2, "复用的 Element 的 widget 应已更新");
  });

  // ── 4. rebuild 时子 Widget 不可更新 → unmount 旧 + mount 新 ──
  it("rebuild 时子 Widget 不可更新则 unmount 旧并 mount 新 Element", () => {
    const childWidget1 = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: childWidget1 });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    const originalChild = element.children[0];
    assert.ok(originalChild !== undefined);

    // 使用不同 key，使 canUpdate 返回 false
    const childWidget2 = new TestRenderObjectWidget({ key: new KeyImpl("different") });
    (element.widget as TestComponentWidget).childWidget = childWidget2;

    element.markNeedsRebuild();
    element.performRebuild();

    const newChild = element.children[0];
    // 应该创建新的 Element 实例
    assert.notEqual(newChild, originalChild, "canUpdate 为 false 时应创建新 Element");
    assert.equal(newChild.widget, childWidget2, "新 Element 应关联新 Widget");
    // 旧 child 应被 unmount
    assert.equal(originalChild.mounted, false, "旧 child 应被 unmount");
  });

  // ── 5. rebuild 时子 Widget 为 undefined → unmount 旧 child ──
  it("rebuild 时子 Widget 为 undefined 则 unmount 旧 child", () => {
    const childWidget = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: childWidget });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    const originalChild = element.children[0];
    assert.ok(originalChild !== undefined);
    assert.equal(originalChild.mounted, true);

    // 将 childWidget 设为 undefined
    (element.widget as TestComponentWidget).childWidget = undefined;

    // build() 返回 undefined 的情况需要特殊处理
    // 重写 build 让它返回 undefined
    const _origBuild = element.build.bind(element);
    (element as unknown as { build: () => undefined }).build = () => undefined;

    element.markNeedsRebuild();
    element.performRebuild();

    // 旧 child 应被 unmount
    assert.equal(originalChild.mounted, false, "旧 child 应被 unmount");
    assert.equal(element.children.length, 0, "children 应为空");
  });

  // ── 6. key 相同 → 复用 Element ──────────────────────
  it("key 相同时复用 Element", () => {
    const sharedKey = new KeyImpl("shared");
    const childWidget1 = new TestRenderObjectWidget({ key: sharedKey });
    const componentWidget = new TestComponentWidget({ child: childWidget1 });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    const originalChild = element.children[0];
    assert.ok(originalChild !== undefined);

    // 创建新 Widget，key 相同
    const childWidget2 = new TestRenderObjectWidget({ key: new KeyImpl("shared") });
    (element.widget as TestComponentWidget).childWidget = childWidget2;

    element.markNeedsRebuild();
    element.performRebuild();

    // 同类型同 key，canUpdate 为 true，应复用
    assert.equal(element.children[0], originalChild, "key 相同时应复用 Element");
  });

  // ── 7. key 不同 → 重建 Element ─────────────────────
  it("key 不同时重建 Element", () => {
    const childWidget1 = new TestRenderObjectWidget({ key: new KeyImpl("key-a") });
    const componentWidget = new TestComponentWidget({ child: childWidget1 });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    const originalChild = element.children[0];
    assert.ok(originalChild !== undefined);

    // 创建新 Widget，key 不同
    const childWidget2 = new TestRenderObjectWidget({ key: new KeyImpl("key-b") });
    (element.widget as TestComponentWidget).childWidget = childWidget2;

    element.markNeedsRebuild();
    element.performRebuild();

    // 同类型不同 key，canUpdate 为 false，应重建
    assert.notEqual(element.children[0], originalChild, "key 不同时应重建 Element");
    assert.equal(originalChild.mounted, false, "旧 Element 应被 unmount");
  });

  // ── 8. unmount 递归 unmount child ──────────────────
  it("unmount 递归 unmount child", () => {
    const childWidget = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: childWidget });
    const element = componentWidget.createElement() as TestComponentElement;

    element.mount();

    const child = element.children[0];
    assert.ok(child !== undefined);
    assert.equal(child.mounted, true, "child 应已 mount");

    element.unmount();

    assert.equal(element.mounted, false, "ComponentElement 应被 unmount");
    assert.equal(child.mounted, false, "child 也应被递归 unmount");
  });
});

// ════════════════════════════════════════════════════
//  RenderObjectElement 测试
// ════════════════════════════════════════════════════

describe("RenderObjectElement — 渲染对象管理", () => {
  let mockBuildOwner: MockBuildOwner;
  let mockPipelineOwner: MockPipelineOwner;

  beforeEach(() => {
    mockBuildOwner = new MockBuildOwner();
    mockPipelineOwner = new MockPipelineOwner();
    setBuildOwner(mockBuildOwner);
    setPipelineOwner(mockPipelineOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  });

  // ── 9. mount 创建 renderObject ────────────────────
  it("mount 后 renderObject 不为 undefined", () => {
    const widget = new TestRenderObjectWidget();
    const element = widget.createElement() as TestRenderObjectElement;

    // 使用一个父 RenderObjectElement 来接收 insertRenderObjectChild
    const parentWidget = new TestRenderObjectWidget();
    const parentElement = parentWidget.createElement() as TestRenderObjectElement;
    parentElement.mount();

    element.mount(parentElement);
    parentElement.addChild(element);

    assert.ok(element.renderObject !== undefined, "mount 后 renderObject 应已创建");
  });

  // ── 10. mount 后 renderObject 是正确类型 ──────────
  it("mount 后 renderObject 是 TestRenderBox 实例", () => {
    const widget = new TestRenderObjectWidget();
    const element = widget.createElement() as TestRenderObjectElement;

    const parentWidget = new TestRenderObjectWidget();
    const parentElement = parentWidget.createElement() as TestRenderObjectElement;
    parentElement.mount();

    element.mount(parentElement);
    parentElement.addChild(element);

    assert.ok(
      element.renderObject instanceof TestRenderBox,
      "renderObject 应为 TestRenderBox 实例",
    );
  });

  // ── 11. update 调用 updateRenderObject ────────────
  it("update 调用 widget 的 updateRenderObject", () => {
    const widget1 = new TestRenderObjectWidget();
    const element = widget1.createElement() as TestRenderObjectElement;

    const parentWidget = new TestRenderObjectWidget();
    const parentElement = parentWidget.createElement() as TestRenderObjectElement;
    parentElement.mount();

    element.mount(parentElement);
    parentElement.addChild(element);

    const renderObj = element.renderObject;
    assert.ok(renderObj !== undefined);

    // 用新 widget 更新
    const widget2 = new TestRenderObjectWidget();
    element.update(widget2);

    // widget2 的 updateRenderObject 应被调用
    assert.equal(
      widget2.updatedRenderObject,
      renderObj,
      "updateRenderObject 应接收到当前 renderObject",
    );
    assert.equal(widget2.updateCallCount, 1, "updateRenderObject 应被调用一次");
  });

  // ── 12. unmount 清理 renderObject ─────────────────
  it("unmount 后 renderObject 变为 undefined", () => {
    const widget = new TestRenderObjectWidget();
    const element = widget.createElement() as TestRenderObjectElement;

    const parentWidget = new TestRenderObjectWidget();
    const parentElement = parentWidget.createElement() as TestRenderObjectElement;
    parentElement.mount();

    element.mount(parentElement);
    parentElement.addChild(element);

    assert.ok(element.renderObject !== undefined);

    element.unmount();

    assert.equal(element.renderObject, undefined, "unmount 后 renderObject 应为 undefined");
  });

  // ── 13. insertRenderObjectChild 将 renderObject 挂到父 renderObject ──
  it("insertRenderObjectChild 将 renderObject 挂到父 renderObject", () => {
    const parentWidget = new TestRenderObjectWidget();
    const parentElement = parentWidget.createElement() as TestRenderObjectElement;
    parentElement.mount();

    const childWidget = new TestRenderObjectWidget();
    const childElement = childWidget.createElement() as TestRenderObjectElement;
    childElement.mount(parentElement);
    parentElement.addChild(childElement);

    const parentRO = parentElement.renderObject!;
    const childRO = childElement.renderObject!;

    // 子 renderObject 应被挂到父 renderObject
    assert.ok(parentRO.children.includes(childRO), "父 renderObject 应包含子 renderObject");
  });

  // ── 14. removeRenderObjectChild 从父 renderObject 移除 ──
  it("removeRenderObjectChild 从父 renderObject 移除子 renderObject", () => {
    const parentWidget = new TestRenderObjectWidget();
    const parentElement = parentWidget.createElement() as TestRenderObjectElement;
    parentElement.mount();

    const childWidget = new TestRenderObjectWidget();
    const childElement = childWidget.createElement() as TestRenderObjectElement;
    childElement.mount(parentElement);
    parentElement.addChild(childElement);

    const parentRO = parentElement.renderObject!;
    const childRO = childElement.renderObject!;

    assert.ok(parentRO.children.includes(childRO), "挂载后父应包含子 renderObject");

    // unmount 子元素会调用 removeRenderObjectChild
    childElement.unmount();
    parentElement.removeChild(childElement);

    assert.ok(
      !parentRO.children.includes(childRO),
      "unmount 后父 renderObject 应不再包含子 renderObject",
    );
  });
});

// ════════════════════════════════════════════════════
//  跨树桥接测试
// ════════════════════════════════════════════════════

describe("跨树桥接 — ComponentElement 与 RenderObjectElement", () => {
  let mockBuildOwner: MockBuildOwner;
  let mockPipelineOwner: MockPipelineOwner;

  beforeEach(() => {
    mockBuildOwner = new MockBuildOwner();
    mockPipelineOwner = new MockPipelineOwner();
    setBuildOwner(mockBuildOwner);
    setPipelineOwner(mockPipelineOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  });

  // ── 15. ComponentElement 内嵌 RenderObjectElement ──
  it("ComponentElement 内嵌 RenderObjectElement 时 renderObject 正确挂到祖先", () => {
    // 构建: 根 RenderObjectElement -> ComponentElement -> 叶 RenderObjectElement
    const leafWidget = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: leafWidget });

    // 根 RenderObjectElement 作为渲染树的根
    const rootWidget = new TestRenderObjectWidget();
    const rootElement = rootWidget.createElement() as TestRenderObjectElement;
    rootElement.mount();

    // ComponentElement 挂载到根 RenderObjectElement 下
    const componentElement = componentWidget.createElement() as TestComponentElement;
    componentElement.mount(rootElement);
    rootElement.addChild(componentElement);

    // ComponentElement mount 时自动 build，创建叶 RenderObjectElement
    // 检查叶节点的 renderObject 是否挂到了根的 renderObject 上
    const leafElement = componentElement.children[0] as TestRenderObjectElement;
    assert.ok(leafElement !== undefined, "ComponentElement 应有叶子 Element");
    assert.ok(leafElement.renderObject !== undefined, "叶子应有 renderObject");

    const rootRO = rootElement.renderObject!;
    const leafRO = leafElement.renderObject!;

    // 叶子的 renderObject 应通过 insertRenderObjectChild 挂到根的 renderObject
    assert.ok(rootRO.children.includes(leafRO), "叶 renderObject 应挂到祖先 renderObject 上");
  });

  // ── 16. 多层嵌套: Component → Component → RenderObject ──
  it("多层嵌套 Component -> Component -> RenderObject 时 renderObject 找到正确祖先", () => {
    // 构建: 根 ROElement -> CompElement1 -> CompElement2 -> 叶 ROElement
    const leafWidget = new TestRenderObjectWidget();
    const innerComponentWidget = new TestComponentWidget({ child: leafWidget });
    const outerComponentWidget = new TestComponentWidget({ child: innerComponentWidget });

    // 根 RenderObjectElement
    const rootWidget = new TestRenderObjectWidget();
    const rootElement = rootWidget.createElement() as TestRenderObjectElement;
    rootElement.mount();

    // 外层 ComponentElement
    const outerElement = outerComponentWidget.createElement() as TestComponentElement;
    outerElement.mount(rootElement);
    rootElement.addChild(outerElement);

    // 外层 build 创建内层 ComponentElement
    const innerElement = outerElement.children[0] as TestComponentElement;
    assert.ok(innerElement !== undefined, "外层 Component 应创建内层 Component");

    // 内层 build 创建叶 RenderObjectElement
    const leafElement = innerElement.children[0] as TestRenderObjectElement;
    assert.ok(leafElement !== undefined, "内层 Component 应创建叶 RenderObjectElement");
    assert.ok(leafElement.renderObject !== undefined, "叶子应有 renderObject");

    const rootRO = rootElement.renderObject!;
    const leafRO = leafElement.renderObject!;

    // 叶子的 renderObject 应跳过两层 ComponentElement，挂到根的 renderObject
    assert.ok(
      rootRO.children.includes(leafRO),
      "叶 renderObject 应穿透多层 ComponentElement 挂到最近的祖先 RenderObjectElement",
    );
  });

  // ── 17. Widget 树更新触发 RenderObject 树更新 ────────
  it("Widget 树更新触发 RenderObject 树更新", () => {
    const childWidget1 = new TestRenderObjectWidget();
    const componentWidget = new TestComponentWidget({ child: childWidget1 });

    // 根 RenderObjectElement
    const rootWidget = new TestRenderObjectWidget();
    const rootElement = rootWidget.createElement() as TestRenderObjectElement;
    rootElement.mount();

    const componentElement = componentWidget.createElement() as TestComponentElement;
    componentElement.mount(rootElement);
    rootElement.addChild(componentElement);

    const leafElement = componentElement.children[0] as TestRenderObjectElement;
    const originalLeafRO = leafElement.renderObject!;
    const rootRO = rootElement.renderObject!;

    assert.ok(rootRO.children.includes(originalLeafRO), "初始状态：叶 renderObject 挂到根");

    // 更新子 Widget（同类型无 key，canUpdate 为 true）
    const childWidget2 = new TestRenderObjectWidget();
    (componentElement.widget as TestComponentWidget).childWidget = childWidget2;

    componentElement.markNeedsRebuild();
    componentElement.performRebuild();

    // 复用的场景下，Element 被 update，widget 的 updateRenderObject 被调用
    assert.equal(childWidget2.updateCallCount, 1, "update 时应调用新 widget 的 updateRenderObject");
    assert.equal(
      childWidget2.updatedRenderObject,
      originalLeafRO,
      "updateRenderObject 应接收到原有 renderObject",
    );

    // renderObject 仍挂在根上
    assert.ok(
      rootRO.children.includes(originalLeafRO),
      "update 后 renderObject 仍应挂在根 renderObject 上",
    );
  });

  // ── 18. 不可更新时旧 renderObject 从渲染树移除，新的挂上 ──
  it("不可更新时旧 renderObject 从渲染树移除并挂上新的 renderObject", () => {
    const childWidget1 = new TestRenderObjectWidget({ key: new KeyImpl("old") });
    const componentWidget = new TestComponentWidget({ child: childWidget1 });

    const rootWidget = new TestRenderObjectWidget();
    const rootElement = rootWidget.createElement() as TestRenderObjectElement;
    rootElement.mount();

    const componentElement = componentWidget.createElement() as TestComponentElement;
    componentElement.mount(rootElement);
    rootElement.addChild(componentElement);

    const oldLeafElement = componentElement.children[0] as TestRenderObjectElement;
    const oldLeafRO = oldLeafElement.renderObject!;
    const rootRO = rootElement.renderObject!;

    assert.ok(rootRO.children.includes(oldLeafRO), "初始状态：旧 renderObject 挂在根上");

    // 更新为不兼容的子 Widget（不同 key）
    const childWidget2 = new TestRenderObjectWidget({ key: new KeyImpl("new") });
    (componentElement.widget as TestComponentWidget).childWidget = childWidget2;

    componentElement.markNeedsRebuild();
    componentElement.performRebuild();

    // 旧 renderObject 应被移除
    assert.ok(!rootRO.children.includes(oldLeafRO), "旧 renderObject 应从根 renderObject 中移除");

    // 新 renderObject 应挂上
    const newLeafElement = componentElement.children[0] as TestRenderObjectElement;
    const newLeafRO = newLeafElement.renderObject!;
    assert.ok(rootRO.children.includes(newLeafRO), "新 renderObject 应挂到根 renderObject 上");
    assert.notEqual(newLeafRO, oldLeafRO, "新旧 renderObject 应不是同一实例");
  });
});
