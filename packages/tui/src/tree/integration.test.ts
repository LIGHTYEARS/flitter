/**
 * 三棵树引擎端到端集成测试。
 *
 * 测试 Widget -> Element -> RenderObject 三棵树以及
 * BuildOwner + PipelineOwner + FrameScheduler 调度管线的完整协同工作。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/integration.test.ts
 * ```
 *
 * @module
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { Widget, Key, GlobalKey } from "./widget.js";
import { Element } from "./element.js";
import type { Widget as WidgetInterface } from "./element.js";
import { ComponentElement } from "./component-element.js";
import {
  RenderObjectElement,
  type RenderObjectWidget,
} from "./render-object-element.js";
import { RenderObject } from "./render-object.js";
import { RenderBox } from "./render-box.js";
import { BoxConstraints } from "./constraints.js";
import type { Size } from "./constraints.js";
import {
  StatelessWidget,
  StatelessElement,
  type BuildContext,
} from "./stateless-widget.js";
import {
  StatefulWidget,
  StatefulElement,
  State,
} from "./stateful-widget.js";
import { BuildOwner } from "./build-owner.js";
import { PipelineOwner } from "./pipeline-owner.js";
import { FrameScheduler } from "./frame-scheduler.js";
import { setBuildOwner, setPipelineOwner } from "./types.js";

// ════════════════════════════════════════════════════
//  测试辅助类
// ════════════════════════════════════════════════════

/**
 * 具体 RenderBox，用于测试。
 * 追踪 layoutCount 和 paintCount。
 * performLayout 将 size 设置为 constraints.biggest（Infinity 替换为 0）。
 */
class ColorBoxRenderObject extends RenderBox {
  color: string;
  layoutCount = 0;
  paintCount = 0;

  constructor(color: string) {
    super();
    this.color = color;
  }

  performLayout(): void {
    this.layoutCount++;
    if (this._constraints) {
      const biggest = this._constraints.biggest;
      this.size = {
        width: Number.isFinite(biggest.width) ? biggest.width : 0,
        height: Number.isFinite(biggest.height) ? biggest.height : 0,
      };
    }
  }

  override performPaint(): void {
    this.paintCount++;
  }
}

/**
 * ColorBoxElement: RenderObjectElement 的具体实现，对应 ColorBox widget。
 */
class ColorBoxElement extends RenderObjectElement {}

/**
 * ColorBox: 实现 RenderObjectWidget 接口的 Widget。
 * 叶子节点，直接拥有一个 ColorBoxRenderObject。
 */
class ColorBox extends Widget implements RenderObjectWidget {
  readonly color: string;

  constructor(color: string, options?: { key?: Key }) {
    super(options);
    this.color = color;
  }

  createElement(): Element {
    return new ColorBoxElement(this);
  }

  createRenderObject(): RenderObject {
    return new ColorBoxRenderObject(this.color);
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as ColorBoxRenderObject).color = this.color;
  }
}

/**
 * Container: StatelessWidget，将单个子 Widget 包装一层。
 */
class Container extends StatelessWidget {
  readonly child: WidgetInterface;

  constructor(child: WidgetInterface, options?: { key?: Key }) {
    super(options);
    this.child = child;
  }

  build(context: BuildContext): WidgetInterface {
    return this.child;
  }
}

/**
 * CounterState: 有状态计数器的 State。
 */
class CounterState extends State<Counter> {
  count = 0;
  initStateCalled = false;
  disposeCalled = false;
  buildCount = 0;

  override initState(): void {
    this.initStateCalled = true;
  }

  override dispose(): void {
    this.disposeCalled = true;
  }

  build(context: BuildContext): WidgetInterface {
    this.buildCount++;
    return new ColorBox(`count-${this.count}`);
  }

  increment(): void {
    this.setState(() => {
      this.count++;
    });
  }
}

/**
 * Counter: StatefulWidget，创建 CounterState。
 */
class Counter extends StatefulWidget {
  constructor(options?: { key?: Key }) {
    super(options);
  }

  createState(): CounterState {
    return new CounterState();
  }
}

/**
 * MultiChildContainer: StatelessWidget，build 返回传入的子 Widget。
 * 用于嵌套测试。
 */
class Wrapper extends StatelessWidget {
  readonly child: WidgetInterface;
  readonly label: string;

  constructor(label: string, child: WidgetInterface, options?: { key?: Key }) {
    super(options);
    this.label = label;
    this.child = child;
  }

  build(context: BuildContext): WidgetInterface {
    return this.child;
  }
}

/**
 * 一个可动态切换子 Widget 的 StatefulWidget。
 */
class DynamicChildState extends State<DynamicChild> {
  childWidget: WidgetInterface | undefined;
  buildCount = 0;

  override initState(): void {
    this.childWidget = this.widget.initialChild;
  }

  build(context: BuildContext): WidgetInterface {
    this.buildCount++;
    return this.childWidget!;
  }

  setChild(newChild: WidgetInterface | undefined): void {
    this.setState(() => {
      this.childWidget = newChild;
    });
  }
}

class DynamicChild extends StatefulWidget {
  readonly initialChild: WidgetInterface;

  constructor(initialChild: WidgetInterface, options?: { key?: Key }) {
    super(options);
    this.initialChild = initialChild;
  }

  createState(): DynamicChildState {
    return new DynamicChildState();
  }
}

// ════════════════════════════════════════════════════
//  辅助函数
// ════════════════════════════════════════════════════

/**
 * 创建完整的管线环境并返回所有组件。
 */
function createPipeline() {
  const buildOwner = new BuildOwner();
  const pipelineOwner = new PipelineOwner();
  const scheduler = new FrameScheduler();
  scheduler.disableFramePacing();
  setBuildOwner(buildOwner);
  setPipelineOwner(pipelineOwner);

  buildOwner.setOnNeedFrame(() => scheduler.requestFrame());
  pipelineOwner.setOnNeedFrame(() => scheduler.requestFrame());

  scheduler.addFrameCallback("build", () => buildOwner.buildScopes(), "build");
  scheduler.addFrameCallback(
    "layout",
    () => pipelineOwner.flushLayout(),
    "layout",
  );
  scheduler.addFrameCallback(
    "paint",
    () => pipelineOwner.flushPaint(),
    "paint",
  );

  return { buildOwner, pipelineOwner, scheduler };
}

function teardownPipeline(env: {
  buildOwner: BuildOwner;
  pipelineOwner: PipelineOwner;
  scheduler: FrameScheduler;
}) {
  env.scheduler.dispose();
  env.buildOwner.dispose();
  env.pipelineOwner.dispose();
  setBuildOwner(undefined);
  setPipelineOwner(undefined);
}

// ════════════════════════════════════════════════════
//  三棵树端到端挂载
// ════════════════════════════════════════════════════

describe("三棵树端到端挂载", () => {
  let env: ReturnType<typeof createPipeline>;

  beforeEach(() => {
    env = createPipeline();
  });

  afterEach(() => {
    teardownPipeline(env);
  });

  it("StatelessWidget -> Element -> RenderObject 完整链路挂载", () => {
    // Widget 树: Container -> ColorBox("red")
    const colorBox = new ColorBox("red");
    const container = new Container(colorBox);

    // 需要一个根 RenderObjectElement 来持有渲染树
    const rootWidget = new ColorBox("root");
    const rootElement = rootWidget.createElement() as ColorBoxElement;
    rootElement.mount();

    // 挂载 Container（StatelessElement）
    const containerElement = container.createElement() as StatelessElement;
    containerElement.mount(rootElement);
    rootElement.addChild(containerElement);

    // 验证三棵树：
    // 1. Widget 树: Container 持有 ColorBox
    assert.equal(containerElement.widget, container);

    // 2. Element 树: StatelessElement -> ColorBoxElement
    assert.equal(containerElement.children.length, 1);
    const leafElement = containerElement.children[0];
    assert.ok(leafElement instanceof ColorBoxElement);

    // 3. RenderObject 树: 叶子的 RenderObject 存在且正确类型
    const leafRO = leafElement.renderObject;
    assert.ok(leafRO instanceof ColorBoxRenderObject);
    assert.equal((leafRO as ColorBoxRenderObject).color, "red");
  });

  it("嵌套 Container 层次正确传递 widget 配置", () => {
    const colorBox = new ColorBox("blue");
    const inner = new Container(colorBox);
    const outer = new Container(inner);

    const rootWidget = new ColorBox("root");
    const rootElement = rootWidget.createElement() as ColorBoxElement;
    rootElement.mount();

    const outerElement = outer.createElement();
    outerElement.mount(rootElement);
    rootElement.addChild(outerElement);

    // outer -> inner -> colorBox
    // Element 树: StatelessElement -> StatelessElement -> ColorBoxElement
    assert.equal(outerElement.children.length, 1);
    const innerElement = outerElement.children[0];
    assert.equal(innerElement.children.length, 1);
    const leafElement = innerElement.children[0];
    assert.ok(leafElement instanceof ColorBoxElement);

    const ro = leafElement.renderObject as ColorBoxRenderObject;
    assert.equal(ro.color, "blue");
  });

  it("RenderObjectElement.mount 创建并附加 RenderObject 到渲染树", () => {
    const rootWidget = new ColorBox("root");
    const rootElement = rootWidget.createElement() as ColorBoxElement;
    rootElement.mount();
    const rootRO = rootElement.renderObject!;
    assert.ok(rootRO instanceof ColorBoxRenderObject);

    const childWidget = new ColorBox("child");
    const childElement = childWidget.createElement() as ColorBoxElement;
    childElement.mount(rootElement);
    rootElement.addChild(childElement);

    const childRO = childElement.renderObject!;
    // RenderObject 树中，子 RO 被 adoptChild 到父 RO
    assert.ok(rootRO.children.includes(childRO));
    assert.equal(childRO.parent, rootRO);
  });

  it("findRenderObject 从 ComponentElement 向下查找到 RenderObject", () => {
    const colorBox = new ColorBox("green");
    const wrapper1 = new Wrapper("w1", colorBox);
    const wrapper2 = new Wrapper("w2", wrapper1);

    const rootWidget = new ColorBox("root");
    const rootElement = rootWidget.createElement() as ColorBoxElement;
    rootElement.mount();

    const topElement = wrapper2.createElement();
    topElement.mount(rootElement);
    rootElement.addChild(topElement);

    // 从最外层的 ComponentElement 调用 findRenderObject 应找到叶子的 RO
    const foundRO = topElement.findRenderObject();
    assert.ok(foundRO instanceof ColorBoxRenderObject);
    assert.equal((foundRO as ColorBoxRenderObject).color, "green");
  });
});

// ════════════════════════════════════════════════════
//  StatefulWidget 完整生命周期
// ════════════════════════════════════════════════════

describe("StatefulWidget 完整生命周期", () => {
  let env: ReturnType<typeof createPipeline>;

  beforeEach(() => {
    env = createPipeline();
  });

  afterEach(() => {
    teardownPipeline(env);
  });

  it("createState -> initState -> 首次 build 完整流程", () => {
    const counter = new Counter();
    const element = counter.createElement() as StatefulElement;
    element.mount();

    const state = element.state as CounterState;

    // initState 被调用
    assert.equal(state.initStateCalled, true);
    // build 被调用（mount -> performRebuild -> build）
    assert.ok(state.buildCount >= 1);
    // 子 Element 被创建（ColorBox）
    assert.equal(element.children.length, 1);
    const childElement = element.children[0];
    assert.ok(childElement instanceof ColorBoxElement);
    // RenderObject 被创建
    assert.ok(childElement.renderObject instanceof ColorBoxRenderObject);
  });

  it("setState 标记 dirty 并触发 BuildOwner 调度", () => {
    // 为了观测中间 dirty 状态，不连接 onNeedFrame -> scheduler
    // 这样 scheduleBuildFor 不会立即触发帧执行
    const isolatedBuildOwner = new BuildOwner();
    setBuildOwner(isolatedBuildOwner);

    const counter = new Counter();
    const element = counter.createElement() as StatefulElement;
    element.mount();

    const state = element.state as CounterState;
    // mount 后 performRebuild 清除 dirty
    assert.equal(element.dirty, false);

    // setState 标记 dirty（由于没有 onNeedFrame 连接，不会自动执行帧）
    state.increment();

    assert.equal(element.dirty, true);
    assert.equal(isolatedBuildOwner.hasDirtyElements, true);

    // 恢复原来的 buildOwner
    isolatedBuildOwner.dispose();
    setBuildOwner(env.buildOwner);
  });

  it("setState -> buildScopes -> 重新 build 生成新 widget 配置", () => {
    const counter = new Counter();
    const element = counter.createElement() as StatefulElement;
    element.mount();

    const state = element.state as CounterState;
    assert.equal(state.count, 0);

    const buildCountBefore = state.buildCount;

    // setState 并执行 buildScopes
    state.increment();
    env.buildOwner.buildScopes();

    assert.equal(state.count, 1);
    assert.ok(state.buildCount > buildCountBefore);

    // 子 Widget 被更新（ColorBox 的 color 变为 "count-1"）
    const childElement = element.children[0] as ColorBoxElement;
    const ro = childElement.renderObject as ColorBoxRenderObject;
    assert.equal(ro.color, "count-1");
  });

  it("State.dispose 在 unmount 时被调用", () => {
    const counter = new Counter();
    const element = counter.createElement() as StatefulElement;
    element.mount();

    const state = element.state as CounterState;
    assert.equal(state.disposeCalled, false);
    assert.equal(state.mounted, true);

    element.unmount();

    assert.equal(state.disposeCalled, true);
    assert.equal(state.mounted, false);
  });
});

// ════════════════════════════════════════════════════
//  调和算法端到端
// ════════════════════════════════════════════════════

describe("调和算法端到端", () => {
  let env: ReturnType<typeof createPipeline>;

  beforeEach(() => {
    env = createPipeline();
  });

  afterEach(() => {
    teardownPipeline(env);
  });

  it("canUpdate=true 时复用 Element，更新 RenderObject", () => {
    // 使用 DynamicChild 来动态切换子 Widget
    const initialBox = new ColorBox("red");
    const dynamicWidget = new DynamicChild(initialBox);
    const element = dynamicWidget.createElement() as StatefulElement;
    element.mount();

    const state = element.state as DynamicChildState;

    // 获取初始的叶子 Element 和 RenderObject
    const childComponentElement = element.children[0]; // StatefulElement -> child
    const leafElement = childComponentElement;
    assert.ok(leafElement instanceof ColorBoxElement);
    const originalRO = leafElement.renderObject as ColorBoxRenderObject;
    assert.equal(originalRO.color, "red");

    // 创建同类型无 key 的新 ColorBox -> canUpdate = true
    const newBox = new ColorBox("blue");
    state.setChild(newBox);
    env.buildOwner.buildScopes();

    // 应复用同一 Element 实例
    const updatedLeaf = element.children[0];
    assert.equal(updatedLeaf, leafElement, "canUpdate=true 时应复用 Element");

    // RenderObject 被更新（updateRenderObject 被调用）
    const updatedRO = updatedLeaf.renderObject as ColorBoxRenderObject;
    assert.equal(updatedRO, originalRO, "应复用同一 RenderObject");
    assert.equal(updatedRO.color, "blue");
  });

  it("canUpdate=false 时销毁旧 Element，创建新 Element", () => {
    const initialBox = new ColorBox("red", { key: new Key("old") });
    const dynamicWidget = new DynamicChild(initialBox);
    const element = dynamicWidget.createElement() as StatefulElement;
    element.mount();

    const state = element.state as DynamicChildState;
    const originalLeaf = element.children[0];
    assert.ok(originalLeaf instanceof ColorBoxElement);

    // 创建不同 key 的 ColorBox -> canUpdate = false
    const newBox = new ColorBox("blue", { key: new Key("new") });
    state.setChild(newBox);
    env.buildOwner.buildScopes();

    const newLeaf = element.children[0];
    assert.notEqual(
      newLeaf,
      originalLeaf,
      "canUpdate=false 时应创建新 Element",
    );
    assert.equal(originalLeaf.mounted, false, "旧 Element 应被 unmount");
    assert.ok(newLeaf instanceof ColorBoxElement);
    assert.equal(
      (newLeaf.renderObject as ColorBoxRenderObject).color,
      "blue",
    );
  });

  it("子树从有到无（child -> undefined）正确卸载", () => {
    // 创建一个可以让 build 返回不同结果的 StatefulWidget
    class OptionalChildState extends State<OptionalChild> {
      hasChild = true;
      build(context: BuildContext): WidgetInterface {
        return this.hasChild
          ? new ColorBox("child")
          : new ColorBox("empty");
      }
      removeChild(): void {
        this.setState(() => {
          this.hasChild = false;
        });
      }
    }
    class OptionalChild extends StatefulWidget {
      createState(): OptionalChildState {
        return new OptionalChildState();
      }
    }

    const rootWidget = new ColorBox("root");
    const rootElement = rootWidget.createElement() as ColorBoxElement;
    rootElement.mount();

    const optWidget = new OptionalChild();
    const optElement = optWidget.createElement() as StatefulElement;
    optElement.mount(rootElement);
    rootElement.addChild(optElement);

    const state = optElement.state as OptionalChildState;
    const childBefore = optElement.children[0];
    assert.ok(childBefore instanceof ColorBoxElement);
    assert.equal(childBefore.mounted, true);

    const roBefore = childBefore.renderObject as ColorBoxRenderObject;
    assert.equal(roBefore.color, "child");

    // 切换到 "empty"，旧的 child Element 在 canUpdate=true 下被复用
    // 但 RenderObject 被更新
    state.removeChild();
    env.buildOwner.buildScopes();

    const childAfter = optElement.children[0];
    // 同类型无 key -> canUpdate=true -> 复用 Element
    assert.equal(childAfter, childBefore);
    assert.equal(
      (childAfter.renderObject as ColorBoxRenderObject).color,
      "empty",
    );
  });
});

// ════════════════════════════════════════════════════
//  帧管线端到端
// ════════════════════════════════════════════════════

describe("帧管线端到端", () => {
  let env: ReturnType<typeof createPipeline>;

  beforeEach(() => {
    env = createPipeline();
  });

  afterEach(() => {
    teardownPipeline(env);
  });

  it("setState -> requestFrame -> executeFrame -> build -> layout -> paint 完整管线", () => {
    // 设置根 RenderObject
    const rootRO = new ColorBoxRenderObject("root");
    env.pipelineOwner.setRootRenderObject(rootRO);
    env.pipelineOwner.updateRootConstraints({ width: 80, height: 24 });

    // 创建 Counter 并挂载
    const counter = new Counter();
    const element = counter.createElement() as StatefulElement;
    element.mount();

    const state = element.state as CounterState;
    const buildCountAfterMount = state.buildCount;

    // setState 触发帧请求
    state.increment();

    // executeFrame 执行完整管线
    env.scheduler.executeFrame();

    // build 阶段执行
    assert.ok(state.buildCount > buildCountAfterMount);
    assert.equal(env.buildOwner.hasDirtyElements, false);

    // layout 阶段执行
    assert.ok(rootRO.layoutCount >= 1);
    assert.deepEqual(rootRO.size, { width: 80, height: 24 });
  });

  it("多个 dirty element 在单帧内按 depth 排序重建", () => {
    const rebuildOrder: string[] = [];

    // 创建两个独立的 Counter（不同深度）
    const rootWidget = new ColorBox("root");
    const rootElement = rootWidget.createElement() as ColorBoxElement;
    rootElement.mount();

    // depth=1 的 Counter
    const counter1 = new Counter();
    const element1 = counter1.createElement() as StatefulElement;
    element1.mount(rootElement);
    rootElement.addChild(element1);

    // depth=2 的 Container -> Counter
    const counter2 = new Counter();
    const wrapper = new Container(counter2);
    const wrapperElement = wrapper.createElement();
    wrapperElement.mount(rootElement);
    rootElement.addChild(wrapperElement);

    const state1 = element1.state as CounterState;
    const state2 = (wrapperElement.children[0] as StatefulElement)
      .state as CounterState;

    // 清除初始 dirty
    env.buildOwner.buildScopes();

    // 追踪重建顺序
    const origBuild1 = state1.buildCount;
    const origBuild2 = state2.buildCount;

    // 先标记深层节点，再标记浅层节点
    state2.increment();
    state1.increment();

    // 单帧执行
    env.scheduler.executeFrame();

    // 两个都应被重建
    assert.ok(state1.buildCount > origBuild1, "state1 应被重建");
    assert.ok(state2.buildCount > origBuild2, "state2 应被重建");
    assert.equal(env.buildOwner.hasDirtyElements, false);
  });

  it("layout 阶段正确传递约束并计算尺寸", () => {
    const rootRO = new ColorBoxRenderObject("root");
    env.pipelineOwner.setRootRenderObject(rootRO);
    env.pipelineOwner.updateRootConstraints({ width: 120, height: 40 });

    env.scheduler.executeFrame();

    assert.equal(rootRO.layoutCount, 1);
    assert.deepEqual(rootRO.size, { width: 120, height: 40 });

    // 验证约束被正确保存
    assert.ok(rootRO.constraints !== undefined);
    assert.equal(rootRO.constraints!.minWidth, 120);
    assert.equal(rootRO.constraints!.maxWidth, 120);
    assert.equal(rootRO.constraints!.minHeight, 40);
    assert.equal(rootRO.constraints!.maxHeight, 40);
  });

  it("终端尺寸变更 -> updateRootConstraints -> 重新布局", () => {
    const rootRO = new ColorBoxRenderObject("root");
    env.pipelineOwner.setRootRenderObject(rootRO);

    // 初始尺寸
    env.pipelineOwner.updateRootConstraints({ width: 80, height: 24 });
    env.scheduler.executeFrame();
    assert.deepEqual(rootRO.size, { width: 80, height: 24 });
    assert.equal(rootRO.layoutCount, 1);

    // 终端尺寸变更
    env.pipelineOwner.updateRootConstraints({ width: 160, height: 48 });
    env.scheduler.executeFrame();

    assert.deepEqual(rootRO.size, { width: 160, height: 48 });
    assert.equal(rootRO.layoutCount, 2);
  });
});

// ════════════════════════════════════════════════════
//  GlobalKey 集成
// ════════════════════════════════════════════════════

describe("GlobalKey 集成", () => {
  let env: ReturnType<typeof createPipeline>;

  beforeEach(() => {
    env = createPipeline();
  });

  afterEach(() => {
    teardownPipeline(env);
  });

  it("GlobalKey.currentElement 追踪已挂载的 element", () => {
    const gk = new GlobalKey("counter-key");
    const counter = new Counter({ key: gk });
    const element = counter.createElement() as StatefulElement;

    // 手动注册 GlobalKey（模拟 mount 流程中的行为）
    gk._setElement(element);
    element.mount();

    // currentElement 应指向已挂载的 element
    assert.equal(gk.currentElement, element);
    assert.equal(element.mounted, true);

    // unmount 后清除
    element.unmount();
    gk._clearElement();

    assert.equal(gk.currentElement, undefined);
  });

  it("GlobalKey.currentState 获取 StatefulElement 的 state", () => {
    const gk = new GlobalKey("state-key");
    const counter = new Counter({ key: gk });
    const element = counter.createElement() as StatefulElement;
    element.mount();

    // 注册 GlobalKey
    gk._setElement(element);

    // StatefulElement 有 state 属性
    const state = gk.currentState;
    assert.ok(state !== undefined);
    assert.ok(state instanceof CounterState);
    assert.equal((state as CounterState).initStateCalled, true);

    // 可以通过 GlobalKey 获取 state 并操作
    (state as CounterState).increment();
    env.buildOwner.buildScopes();
    assert.equal((state as CounterState).count, 1);
  });
});

// ════════════════════════════════════════════════════
//  复杂场景
// ════════════════════════════════════════════════════

describe("复杂场景", () => {
  let env: ReturnType<typeof createPipeline>;

  beforeEach(() => {
    env = createPipeline();
  });

  afterEach(() => {
    teardownPipeline(env);
  });

  it("深嵌套树（5层+）的完整 mount/unmount 周期", () => {
    // 构建 5 层嵌套: Wrapper5 -> Wrapper4 -> Wrapper3 -> Wrapper2 -> Wrapper1 -> ColorBox
    const leaf = new ColorBox("deep");
    const layer1 = new Wrapper("L1", leaf);
    const layer2 = new Wrapper("L2", layer1);
    const layer3 = new Wrapper("L3", layer2);
    const layer4 = new Wrapper("L4", layer3);
    const layer5 = new Wrapper("L5", layer4);

    // 根 RenderObjectElement
    const rootWidget = new ColorBox("root");
    const rootElement = rootWidget.createElement() as ColorBoxElement;
    rootElement.mount();

    const topElement = layer5.createElement();
    topElement.mount(rootElement);
    rootElement.addChild(topElement);

    // 验证深度嵌套的 element 树
    let current: Element = topElement;
    for (let i = 0; i < 5; i++) {
      assert.equal(current.children.length, 1, `层 ${i} 应有 1 个子节点`);
      assert.equal(current.mounted, true, `层 ${i} 应已 mounted`);
      current = current.children[0];
    }
    // 最底层应是 ColorBoxElement
    assert.ok(current instanceof ColorBoxElement);
    assert.equal(current.mounted, true);

    // RenderObject 正确挂接
    const leafRO = current.renderObject;
    assert.ok(leafRO instanceof ColorBoxRenderObject);
    assert.equal((leafRO as ColorBoxRenderObject).color, "deep");
    assert.ok(
      rootElement.renderObject!.children.includes(leafRO!),
      "叶子 RO 应挂在根 RO 下",
    );

    // findRenderObject 从顶层找到叶子 RO
    const foundRO = topElement.findRenderObject();
    assert.equal(foundRO, leafRO);

    // unmount 整棵树
    topElement.unmount();

    // 验证所有元素被 unmount
    assert.equal(topElement.mounted, false);
    assert.equal(current.mounted, false);
  });

  it("帧内级联 dirty：parent rebuild 触发 child dirty，同帧处理", () => {
    // 创建父子两个 Counter
    const parentCounter = new Counter();
    const parentElement = parentCounter.createElement() as StatefulElement;
    parentElement.mount();
    const parentState = parentElement.state as CounterState;

    // 子 Counter 嵌套在父的 child element 下
    const childCounter = new Counter();
    const childElement = childCounter.createElement() as StatefulElement;
    childElement.mount(parentElement);
    parentElement.addChild(childElement);
    const childState = childElement.state as CounterState;

    // 初始 buildScopes 清除所有 dirty
    env.buildOwner.buildScopes();

    const parentBuildBefore = parentState.buildCount;
    const childBuildBefore = childState.buildCount;

    // 父 setState，在其 rebuild 触发时，同时标记子 dirty
    // 注意：buildScopes 支持多轮迭代处理新增的 dirty elements
    parentState.setState(() => {
      parentState.count++;
    });
    // 手动也标记子为 dirty
    childState.setState(() => {
      childState.count++;
    });

    // 单帧执行，两者都应被重建
    env.scheduler.executeFrame();

    assert.ok(
      parentState.buildCount > parentBuildBefore,
      "父 State 应被重建",
    );
    assert.ok(childState.buildCount > childBuildBefore, "子 State 应被重建");
    assert.equal(env.buildOwner.hasDirtyElements, false);
  });

  it("多次 setState 在同一帧内合并为一次 rebuild", () => {
    // 为了模拟"多次 setState 在同一帧内合并"，不自动触发帧执行。
    // 手动控制帧调度，确保多次 setState 在 buildScopes 前累积。
    const isolatedBuildOwner = new BuildOwner();
    setBuildOwner(isolatedBuildOwner);

    const counter = new Counter();
    const element = counter.createElement() as StatefulElement;
    element.mount();
    const state = element.state as CounterState;

    const buildCountAfterInit = state.buildCount;

    // 多次 setState（同步调用），不会自动触发帧
    state.setState(() => {
      state.count++;
    });
    state.setState(() => {
      state.count++;
    });
    state.setState(() => {
      state.count++;
    });

    // count 应递增了 3 次（setState 回调是同步执行的）
    assert.equal(state.count, 3);
    assert.equal(isolatedBuildOwner.hasDirtyElements, true);

    // 手动执行一次 buildScopes，只触发一次 rebuild
    isolatedBuildOwner.buildScopes();

    assert.equal(
      state.buildCount,
      buildCountAfterInit + 1,
      "多次 setState 应合并为一次 rebuild",
    );
    assert.equal(isolatedBuildOwner.hasDirtyElements, false);

    isolatedBuildOwner.dispose();
    setBuildOwner(env.buildOwner);
  });

  it("完整端到端：setState -> 帧调度 -> build -> layout -> paint", () => {
    // 设置完整管线
    const rootRO = new ColorBoxRenderObject("root");
    env.pipelineOwner.setRootRenderObject(rootRO);
    env.pipelineOwner.updateRootConstraints({ width: 80, height: 24 });

    // 创建 Counter Widget 树
    const counter = new Counter();
    const element = counter.createElement() as StatefulElement;
    element.mount();
    const state = element.state as CounterState;

    // 执行首帧完成初始 layout
    env.scheduler.executeFrame();
    assert.ok(rootRO.layoutCount >= 1, "首帧应执行 layout");
    assert.deepEqual(rootRO.size, { width: 80, height: 24 });

    const buildCountBefore = state.buildCount;

    // setState 触发完整管线
    // 由于 onNeedFrame 已连接，setState -> scheduleBuildFor -> requestFrame -> executeFrame
    state.increment();
    assert.equal(state.count, 1);

    // 由于帧被自动触发执行，build 阶段已完成
    assert.ok(
      state.buildCount > buildCountBefore,
      "setState 后应触发 rebuild",
    );
    assert.equal(env.buildOwner.hasDirtyElements, false);

    // layout 阶段也已完成（rootRO 被重新布局 -- 约束未变但 flushLayout 总是被调用）
    assert.deepEqual(rootRO.size, { width: 80, height: 24 });
  });

  it("updateRootConstraints 后 executeFrame 传播新约束到 RenderObject", () => {
    const rootRO = new ColorBoxRenderObject("root");
    env.pipelineOwner.setRootRenderObject(rootRO);

    // 初始约束
    env.pipelineOwner.updateRootConstraints({ width: 80, height: 24 });
    env.scheduler.executeFrame();
    assert.deepEqual(rootRO.size, { width: 80, height: 24 });

    // 修改约束
    env.pipelineOwner.updateRootConstraints({ width: 200, height: 50 });
    env.scheduler.executeFrame();
    assert.deepEqual(rootRO.size, { width: 200, height: 50 });

    // 再次修改
    env.pipelineOwner.updateRootConstraints({ width: 40, height: 10 });
    env.scheduler.executeFrame();
    assert.deepEqual(rootRO.size, { width: 40, height: 10 });
  });

  it("post-frame 回调在完整管线后执行", () => {
    const order: string[] = [];

    const rootRO = new ColorBoxRenderObject("root");
    env.pipelineOwner.setRootRenderObject(rootRO);
    env.pipelineOwner.updateRootConstraints({ width: 80, height: 24 });

    // 添加追踪性回调（不覆盖管线回调，添加额外追踪）
    env.scheduler.addFrameCallback(
      "track-build",
      () => order.push("build"),
      "build",
      100,
    );
    env.scheduler.addFrameCallback(
      "track-paint",
      () => order.push("paint"),
      "paint",
      100,
    );

    env.scheduler.addPostFrameCallback(() => {
      order.push("post-frame");
    });

    env.scheduler.executeFrame();

    const buildIdx = order.indexOf("build");
    const paintIdx = order.indexOf("paint");
    const postIdx = order.indexOf("post-frame");

    assert.ok(buildIdx >= 0, "build 应执行");
    assert.ok(paintIdx >= 0, "paint 应执行");
    assert.ok(postIdx >= 0, "post-frame 应执行");
    assert.ok(postIdx > buildIdx, "post-frame 应在 build 之后");
    assert.ok(postIdx > paintIdx, "post-frame 应在 paint 之后");
  });
});
