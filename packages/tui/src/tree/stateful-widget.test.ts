/**
 * StatefulWidget / StatelessWidget / State 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 StatelessWidget 构建、
 * StatefulWidget 生命周期、State 管理、setState 机制、更新协调等核心行为。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/stateful-widget.test.ts
 * ```
 *
 * @module
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { StatelessWidget, StatelessElement } from "./stateless-widget.js";
import { StatefulWidget, StatefulElement, State } from "./stateful-widget.js";
import { Widget, Key } from "./widget.js";
import { Element } from "./element.js";
import { setBuildOwner } from "./types.js";
import type { BuildOwnerLike } from "./types.js";

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

/** 叶子 Widget，作为 build 方法的返回值 */
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

/** 可配置的 StatelessWidget 子类，build 返回构造时传入的子 Widget */
class TestStatelessWidget extends StatelessWidget {
  readonly childWidget: Widget;
  buildCallCount = 0;
  lastBuildContext: unknown = undefined;

  constructor(childWidget: Widget, options?: { key?: Key }) {
    super(options);
    this.childWidget = childWidget;
  }

  build(context: Element): Widget {
    this.buildCallCount++;
    this.lastBuildContext = context;
    return this.childWidget;
  }
}

/** 跟踪生命周期调用的 State 实现 */
class CounterState extends State<CounterWidget> {
  count = 0;
  initStateCount = 0;
  didUpdateWidgetCount = 0;
  disposeCount = 0;
  lastOldWidget: CounterWidget | undefined = undefined;
  buildCount = 0;

  initState(): void {
    this.initStateCount++;
  }

  didUpdateWidget(oldWidget: CounterWidget): void {
    this.didUpdateWidgetCount++;
    this.lastOldWidget = oldWidget;
  }

  dispose(): void {
    this.disposeCount++;
  }

  build(context: Element): Widget {
    this.buildCount++;
    return new LeafWidget();
  }
}

/** StatefulWidget 子类，创建 CounterState */
class CounterWidget extends StatefulWidget {
  createState(): CounterState {
    return new CounterState();
  }
}

/** 另一种 StatefulWidget，用于 canUpdate 测试 */
class AnotherStatefulWidget extends StatefulWidget {
  createState(): State {
    return new (class extends State {
      build(context: Element): Widget {
        return new LeafWidget();
      }
    })();
  }
}

// ════════════════════════════════════════════════════
//  StatelessWidget 测试
// ════════════════════════════════════════════════════

describe("StatelessWidget 测试", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 1. createElement 返回 StatelessElement ────────
  it("createElement 返回 StatelessElement", () => {
    const leaf = new LeafWidget();
    const widget = new TestStatelessWidget(leaf);
    const element = widget.createElement();

    assert.ok(
      element instanceof StatelessElement,
      "createElement 应返回 StatelessElement 实例"
    );
  });

  // ── 2. mount 后 build 被调用 ──────────────────────
  it("mount 后 build 被调用", () => {
    const leaf = new LeafWidget();
    const widget = new TestStatelessWidget(leaf);
    const element = widget.createElement();

    element.mount();

    assert.ok(
      widget.buildCallCount > 0,
      "mount 后 build 应至少被调用一次"
    );
  });

  // ── 3. rebuild 时 build 再次调用 ──────────────────
  it("rebuild 时 build 再次调用", () => {
    const leaf = new LeafWidget();
    const widget = new TestStatelessWidget(leaf);
    const element = widget.createElement();

    element.mount();
    const countAfterMount = widget.buildCallCount;

    // 清除 dirty 以便 markNeedsRebuild 生效
    element.markNeedsRebuild();
    element.performRebuild();

    assert.ok(
      widget.buildCallCount > countAfterMount,
      "rebuild 后 build 应被再次调用"
    );
  });

  // ── 4. build 接收 BuildContext ────────────────────
  it("build 接收 BuildContext（即 Element 本身）", () => {
    const leaf = new LeafWidget();
    const widget = new TestStatelessWidget(leaf);
    const element = widget.createElement();

    element.mount();

    assert.equal(
      widget.lastBuildContext,
      element,
      "build 的 context 参数应为 Element 本身"
    );
  });
});

// ════════════════════════════════════════════════════
//  State 生命周期测试
// ════════════════════════════════════════════════════

describe("State 生命周期测试", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 5. createState 创建新 State 实例 ──────────────
  it("createState 创建新 State 实例", () => {
    const widget = new CounterWidget();
    const state1 = widget.createState();
    const state2 = widget.createState();

    assert.notEqual(
      state1,
      state2,
      "每次 createState 应返回不同的实例"
    );
    assert.ok(state1 instanceof CounterState);
    assert.ok(state2 instanceof CounterState);
  });

  // ── 6. mount 调用 initState ───────────────────────
  it("mount 调用 initState", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    assert.equal(
      state.initStateCount,
      1,
      "mount 后 initState 应被调用一次"
    );
  });

  // ── 7. initState 中 widget 可访问 ────────────────
  it("initState 中 widget 可访问", () => {
    /** 验证 initState 中 widget 已设置的特殊 State */
    class CheckWidgetState extends State<CounterWidget> {
      widgetInInitState: CounterWidget | undefined = undefined;

      initState(): void {
        this.widgetInInitState = this.widget;
      }

      build(context: Element): Widget {
        return new LeafWidget();
      }
    }

    class CheckWidget extends StatefulWidget {
      createState(): CheckWidgetState {
        return new CheckWidgetState();
      }
    }

    const widget = new CheckWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CheckWidgetState;
    assert.equal(
      state.widgetInInitState,
      widget,
      "initState 中 state.widget 应已设置为当前 Widget"
    );
  });

  // ── 8. initState 中 mounted = true ───────────────
  it("initState 中 mounted 为 true", () => {
    /** 验证 initState 中 mounted 状态的特殊 State */
    class CheckMountedState extends State<CounterWidget> {
      mountedInInitState: boolean | undefined = undefined;

      initState(): void {
        this.mountedInInitState = this.mounted;
      }

      build(context: Element): Widget {
        return new LeafWidget();
      }
    }

    class CheckMountedWidget extends StatefulWidget {
      createState(): CheckMountedState {
        return new CheckMountedState();
      }
    }

    const widget = new CheckMountedWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CheckMountedState;
    assert.equal(
      state.mountedInInitState,
      true,
      "initState 中 state.mounted 应为 true"
    );
  });

  // ── 9. didUpdateWidget 收到旧 widget ─────────────
  it("didUpdateWidget 收到旧 widget", () => {
    const widget1 = new CounterWidget();
    const widget2 = new CounterWidget();
    const element = widget1.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    assert.equal(state.didUpdateWidgetCount, 0);

    element.update(widget2);

    assert.equal(
      state.didUpdateWidgetCount,
      1,
      "update 后 didUpdateWidget 应被调用一次"
    );
    assert.equal(
      state.lastOldWidget,
      widget1,
      "didUpdateWidget 应收到旧 Widget"
    );
  });

  // ── 10. dispose 在 unmount 时调用 ─────────────────
  it("dispose 在 unmount 时调用", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    assert.equal(state.disposeCount, 0);

    element.unmount();

    assert.equal(
      state.disposeCount,
      1,
      "unmount 后 dispose 应被调用一次"
    );
  });
});

// ════════════════════════════════════════════════════
//  dispose 后状态测试
// ════════════════════════════════════════════════════

describe("dispose 后状态测试", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 11. dispose 后 mounted = false ────────────────
  it("dispose 后 mounted 为 false", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    assert.equal(state.mounted, true);

    element.unmount();

    assert.equal(
      state.mounted,
      false,
      "unmount/dispose 后 state.mounted 应为 false"
    );
  });
});

// ════════════════════════════════════════════════════
//  setState 测试
// ════════════════════════════════════════════════════

describe("setState 测试", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 12. setState 执行回调函数 ─────────────────────
  it("setState 执行回调函数", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    assert.equal(state.count, 0);

    state.setState(() => {
      state.count++;
    });

    assert.equal(
      state.count,
      1,
      "setState 回调应被同步执行"
    );
  });

  // ── 13. setState 标记 element dirty ───────────────
  it("setState 标记 element dirty", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();
    // mount 过程中 performRebuild 会清除 dirty
    // 需要确保 dirty 为 false 后再测试
    element.performRebuild();
    assert.equal(element.dirty, false, "performRebuild 后 dirty 应为 false");

    const state = element.state as CounterState;
    state.setState(() => {
      state.count++;
    });

    assert.equal(
      element.dirty,
      true,
      "setState 后 element.dirty 应为 true"
    );
  });

  // ── 14. setState 调用 BuildOwner.scheduleBuildFor ─
  it("setState 调用 BuildOwner.scheduleBuildFor", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();
    element.performRebuild();
    mockOwner.scheduledElements = [];

    const state = element.state as CounterState;
    state.setState(() => {
      state.count++;
    });

    assert.ok(
      mockOwner.scheduledElements.includes(element),
      "setState 应通过 markNeedsRebuild 触发 scheduleBuildFor"
    );
  });

  // ── 15. setState 无回调也标记 dirty ───────────────
  it("setState 无回调也标记 dirty", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();
    element.performRebuild();
    assert.equal(element.dirty, false);

    const state = element.state as CounterState;
    state.setState();

    assert.equal(
      element.dirty,
      true,
      "无回调的 setState 也应标记 dirty"
    );
  });

  // ── 16. dispose 后 setState 抛出错误 ──────────────
  it("dispose 后 setState 抛出错误", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;

    element.unmount();

    assert.throws(
      () => {
        state.setState();
      },
      /setState.*dispose/i,
      "dispose 后调用 setState 应抛出包含相关提示的错误"
    );
  });
});

// ════════════════════════════════════════════════════
//  StatefulElement 更新测试
// ════════════════════════════════════════════════════

describe("StatefulElement 更新测试", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 17. 同类型 Widget update → 调用 didUpdateWidget + rebuild
  it("同类型 Widget update 调用 didUpdateWidget 并触发 rebuild", () => {
    const widget1 = new CounterWidget();
    const widget2 = new CounterWidget();
    const element = widget1.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    const buildCountAfterMount = state.buildCount;

    element.update(widget2);

    assert.equal(
      state.didUpdateWidgetCount,
      1,
      "update 应触发 didUpdateWidget"
    );
    assert.ok(
      state.buildCount > buildCountAfterMount,
      "update 应触发 rebuild"
    );
  });

  // ── 18. State 跨 update 保持 ─────────────────────
  it("State 跨 update 保持同一实例", () => {
    const widget1 = new CounterWidget();
    const widget2 = new CounterWidget();
    const element = widget1.createElement() as StatefulElement;

    element.mount();

    const stateBefore = element.state;

    element.update(widget2);

    const stateAfter = element.state;

    assert.equal(
      stateBefore,
      stateAfter,
      "update 后 State 实例应保持不变"
    );
  });

  // ── 19. 不同类型 Widget → 需要重建 ───────────────
  it("不同类型 Widget canUpdate 返回 false", () => {
    const counterWidget = new CounterWidget();
    const anotherWidget = new AnotherStatefulWidget();

    assert.equal(
      counterWidget.canUpdate(anotherWidget),
      false,
      "不同类型 Widget 的 canUpdate 应返回 false"
    );
  });
});

// ════════════════════════════════════════════════════
//  BuildContext 测试
// ════════════════════════════════════════════════════

describe("BuildContext 测试", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    setBuildOwner(undefined);
  });

  // ── 20. context.widget 返回当前 Widget ───────────
  it("context.widget 返回当前 Widget", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    const context = state.context;

    assert.ok(
      context !== undefined,
      "state.context 不应为 undefined"
    );
    assert.equal(
      context!.widget,
      widget,
      "context.widget 应返回当前关联的 Widget"
    );
  });

  // ── 21. findRenderObject 返回最近的 RenderObject ──
  it("findRenderObject 对 ComponentElement 返回 undefined", () => {
    const widget = new CounterWidget();
    const element = widget.createElement() as StatefulElement;

    element.mount();

    const state = element.state as CounterState;
    const context = state.context;

    assert.ok(context !== undefined, "state.context 不应为 undefined");
    const renderObject = context!.findRenderObject();

    assert.equal(
      renderObject,
      undefined,
      "ComponentElement 没有直接关联的 RenderObject，应返回 undefined"
    );
  });
});
