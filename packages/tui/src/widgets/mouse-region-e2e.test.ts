/**
 * 鼠标事件端到端测试。
 *
 * 测试完整管线: StatefulWidget + setState + MouseRegion + MouseManager
 * 验证 click/hover 事件是否正确触发 Widget 重建。
 *
 * 不依赖 TuiController/WidgetsBinding，直接构建最小 Widget 树
 * 并手动驱动 build → layout → mouse event → setState → rebuild 流程。
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { MouseManager } from "../gestures/mouse-manager.js";
import { TextStyle } from "../screen/text-style.js";
import { BuildOwner } from "../tree/build-owner.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
import { PipelineOwner } from "../tree/pipeline-owner.js";
import { RenderBox } from "../tree/render-box.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import { setBuildOwner, setPipelineOwner } from "../tree/types.js";
import type { MouseEvent as TermMouseEvent } from "../vt/types.js";
import { Center } from "./center.js";
import { Container } from "./container.js";
import { GestureDetector } from "./gesture-detector.js";
import { MouseRegion, RenderMouseRegion } from "./mouse-region.js";
import { Text } from "./text.js";

// ════════════════════════════════════════════════════
//  测试用 StatefulWidget
// ════════════════════════════════════════════════════

class CounterWidget extends StatefulWidget {
  createState(): State {
    return new CounterWidgetState();
  }
}

class CounterWidgetState extends State<CounterWidget> {
  tapCount = 0;
  hoverState = false;

  build(_context: BuildContext): WidgetInterface {
    return new MouseRegion({
      onClick: (_e) => {
        this.setState(() => {
          this.tapCount++;
        });
      },
      onEnter: (_e) => {
        this.setState(() => {
          this.hoverState = true;
        });
      },
      onExit: (_e) => {
        this.setState(() => {
          this.hoverState = false;
        });
      },
      child: new Container({
        width: 20,
        height: 5,
      }),
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  辅助函数
// ════════════════════════════════════════════════════

function makeMouseEvent(
  x: number,
  y: number,
  action: "press" | "release" | "move",
  button: "left" | "none" = "left",
): TermMouseEvent {
  return {
    type: "mouse",
    x,
    y,
    button,
    action,
    modifiers: { shift: false, ctrl: false, alt: false, meta: false },
  };
}

describe("鼠标事件端到端: StatefulWidget + setState + MouseRegion", () => {
  let mm: MouseManager;
  let buildOwner: BuildOwner;
  let pipelineOwner: PipelineOwner;

  beforeEach(() => {
    // 清理全局单例
    MouseManager.instance.dispose();
    mm = MouseManager.instance;

    // 设置全局 BuildOwner 和 PipelineOwner
    buildOwner = new BuildOwner();
    pipelineOwner = new PipelineOwner();

    setBuildOwner({
      scheduleBuildFor: (e) => buildOwner.scheduleBuildFor(e),
    });
    setPipelineOwner({
      requestLayout: (r) => pipelineOwner.requestLayout(r),
      requestPaint: (r) => pipelineOwner.requestPaint(r),
      removeFromQueues: (r) => pipelineOwner.removeFromQueues(r),
    });
  });

  afterEach(() => {
    mm.dispose();
    buildOwner.dispose();
    pipelineOwner.dispose();
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  });

  test("click 触发 setState → 状态变更 → 可被 buildScopes 重建", () => {
    // 1. 构建 Widget 树
    const widget = new CounterWidget();
    const element = widget.createElement();
    element.mount();

    // 2. 找到渲染对象并设置到 MouseManager
    const renderObject = element.findRenderObject();
    expect(renderObject).not.toBeNull();

    // 手动设置布局 (模拟约束布局)
    if (renderObject && "setSize" in renderObject && "setOffset" in renderObject) {
      (renderObject as any).setSize(20, 5);
      (renderObject as any).setOffset(0, 0);
      // 确保子节点也有正确的布局
      for (const child of renderObject.children) {
        if ("setSize" in child && "setOffset" in child) {
          (child as any).setSize(20, 5);
          (child as any).setOffset(0, 0);
        }
      }
    }

    mm.setRootRenderObject(renderObject!);

    // 3. 获取 State 引用
    const state = ((element as any)._state || (element as any).state) as CounterWidgetState;
    expect(state).toBeDefined();
    expect(state.tapCount).toBe(0);

    // 4. 发送 press 事件
    mm.handleMouseEvent(makeMouseEvent(5, 2, "press"));

    // 5. setState 应该已同步执行了 tapCount++ 和 markNeedsRebuild
    expect(state.tapCount).toBe(1);

    // 6. 执行 buildScopes 来模拟帧的 build 阶段
    expect(buildOwner.hasDirtyElements).toBe(true);
    buildOwner.buildScopes();

    // 7. 再次点击
    mm.handleMouseEvent(makeMouseEvent(5, 2, "press"));
    expect(state.tapCount).toBe(2);

    buildOwner.buildScopes();

    // 8. 第三次点击
    mm.handleMouseEvent(makeMouseEvent(5, 2, "press"));
    expect(state.tapCount).toBe(3);

    // 清理
    element.unmount();
  });

  test("hover: enter → setState(hoverState=true), exit → setState(hoverState=false)", () => {
    const widget = new CounterWidget();
    const element = widget.createElement();
    element.mount();

    const renderObject = element.findRenderObject();
    expect(renderObject).not.toBeNull();

    if (renderObject && "setSize" in renderObject && "setOffset" in renderObject) {
      (renderObject as any).setSize(20, 5);
      (renderObject as any).setOffset(0, 0);
      for (const child of renderObject.children) {
        if ("setSize" in child && "setOffset" in child) {
          (child as any).setSize(20, 5);
          (child as any).setOffset(0, 0);
        }
      }
    }

    mm.setRootRenderObject(renderObject!);

    const state = ((element as any)._state || (element as any).state) as CounterWidgetState;
    expect(state.hoverState).toBe(false);

    // 鼠标进入区域
    mm.handleMouseEvent(makeMouseEvent(5, 2, "move", "none"));
    expect(state.hoverState).toBe(true);

    buildOwner.buildScopes();

    // 鼠标离开区域
    mm.handleMouseEvent(makeMouseEvent(50, 50, "move", "none"));
    expect(state.hoverState).toBe(false);

    element.unmount();
  });
});

// ════════════════════════════════════════════════════
//  渲染树完整性 — 单子节点不得重复
// ════════════════════════════════════════════════════

class RenderTreeWidget extends StatefulWidget {
  createState(): State {
    return new RenderTreeWidgetState();
  }
}

class RenderTreeWidgetState extends State<RenderTreeWidget> {
  count = 0;

  build(_context: BuildContext): WidgetInterface {
    return new GestureDetector({
      onTap: () => {
        this.setState(() => {
          this.count++;
        });
      },
      child: new Container({
        width: 30,
        height: 3,
        child: new Center({
          child: new Text({
            data: `Count: ${this.count}`,
            style: new TextStyle({}),
          }),
        }),
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }
}

/** 递归计算 RenderObject 树中每个单子节点的子节点数 */
function assertNoduplicateChildren(ro: any, path = ""): void {
  const name = ro.constructor.name;
  const currentPath = path ? `${path} > ${name}` : name;
  const children = ro._children ?? [];

  // 单子节点的 RenderObject 不应有超过 1 个子节点
  if (
    ro instanceof RenderMouseRegion ||
    name === "ContainerRenderObject" ||
    name === "RenderPositionedBox" ||
    name === "RenderPadding"
  ) {
    if (children.length > 1) {
      throw new Error(
        `${currentPath} has ${children.length} children (expected ≤1) — duplicate RenderObject adoption detected`,
      );
    }
  }

  for (const child of children) {
    assertNoduplicateChildren(child, currentPath);
  }
}

describe("渲染树完整性", () => {
  let mm: MouseManager;
  let buildOwner: BuildOwner;
  let pipelineOwner: PipelineOwner;

  beforeEach(() => {
    MouseManager.instance.dispose();
    mm = MouseManager.instance;
    buildOwner = new BuildOwner();
    pipelineOwner = new PipelineOwner();
    setBuildOwner({
      scheduleBuildFor: (e) => buildOwner.scheduleBuildFor(e),
    });
    setPipelineOwner({
      requestLayout: (r) => pipelineOwner.requestLayout(r),
      requestPaint: (r) => pipelineOwner.requestPaint(r),
      removeFromQueues: (r) => pipelineOwner.removeFromQueues(r),
    });
  });

  afterEach(() => {
    mm.dispose();
    buildOwner.dispose();
    pipelineOwner.dispose();
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  });

  test("mount 后单子 RenderObject 不得有重复子节点", () => {
    const widget = new RenderTreeWidget();
    const element = widget.createElement();
    element.mount();

    const ro = element.findRenderObject();
    expect(ro).not.toBeNull();

    // 验证没有重复子节点
    expect(() => assertNoduplicateChildren(ro)).not.toThrow();

    element.unmount();
  });

  test("setState → rebuild 后单子 RenderObject 不得有重复子节点", () => {
    const widget = new RenderTreeWidget();
    const element = widget.createElement();
    element.mount();

    const ro = element.findRenderObject();
    expect(ro).not.toBeNull();

    // 设置布局
    if (ro instanceof RenderBox) {
      ro.setOffset(0, 0);
      ro.setSize(30, 3);
    }
    mm.setRootRenderObject(ro!);

    // 触发 setState
    const state = (element as any)._state as RenderTreeWidgetState;
    mm.handleMouseEvent(makeMouseEvent(5, 1, "press"));
    expect(state.count).toBe(1);

    buildOwner.buildScopes();

    // 验证 rebuild 后仍无重复
    expect(() => assertNoduplicateChildren(ro)).not.toThrow();

    // 再次触发
    mm.handleMouseEvent(makeMouseEvent(5, 1, "press"));
    buildOwner.buildScopes();
    expect(state.count).toBe(2);
    expect(() => assertNoduplicateChildren(ro)).not.toThrow();

    element.unmount();
  });
});
