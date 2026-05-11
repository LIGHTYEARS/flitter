/**
 * Scrollable 单元测试。
 *
 * - ScrollViewport: 低层级 RenderObjectWidget (原 Scrollable)
 * - Scrollable: 高层级 StatefulWidget (amp I1T alignment)
 * - ScrollableState: Focus > MouseRegion > viewportBuilder 组合
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { FocusManager } from "../focus/focus-manager.js";
import type { BuildContext, Widget } from "../tree/element.js";
import { Element } from "../tree/element.js";
import type { BuildOwnerLike } from "../tree/types.js";
import { setBuildOwner } from "../tree/types.js";
import type { KeyEvent } from "../vt/types.js";
import { Focus } from "../widgets/focus.js";
import type { MouseEvent as ScrollMouseEvent } from "../widgets/mouse-region.js";
import { MouseRegion } from "../widgets/mouse-region.js";
import { RenderScrollable } from "./render-scrollable.js";
import { ScrollController } from "./scroll-controller.js";
import { Scrollable, type ScrollableState, ScrollViewport } from "./scrollable.js";

// ════════════════════════════════════════════════════
//  辅助工具
// ════════════════════════════════════════════════════

/** 创建 KeyEvent 快捷方法 */
function key(
  k: string,
  mods?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean },
): KeyEvent {
  return {
    type: "key",
    key: k,
    modifiers: {
      ctrl: mods?.ctrl ?? false,
      shift: mods?.shift ?? false,
      alt: mods?.alt ?? false,
      meta: mods?.meta ?? false,
    },
  };
}

/** 最小 Widget/Element for tree testing */
class LeafWidget implements Widget {
  key = undefined;
  canUpdate(other: Widget): boolean {
    return this.constructor === other.constructor;
  }
  createElement(): Element {
    return new LeafElement(this);
  }
}
class LeafElement extends Element {
  performRebuild(): void {
    super.performRebuild();
  }
}

class MockBuildOwner implements BuildOwnerLike {
  scheduledElements: unknown[] = [];
  scheduleBuildFor(element: unknown): void {
    this.scheduledElements.push(element);
  }
}

/**
 * 创建滚轮事件，走 Scrollable.build() 暴露出的 MouseRegion.onScroll 真实入口。
 */
function wheel(
  direction: "up" | "down" | "left" | "right",
  mods?: { shift?: boolean; ctrl?: boolean; alt?: boolean; meta?: boolean },
): ScrollMouseEvent {
  return {
    type: "scroll",
    direction,
    position: { x: 0, y: 0 },
    localPosition: { x: 0, y: 0 },
    modifiers: {
      shift: mods?.shift ?? false,
      ctrl: mods?.ctrl ?? false,
      alt: mods?.alt ?? false,
      meta: mods?.meta ?? false,
    },
  };
}

/**
 * 挂载 Scrollable 并提取 Focus > MouseRegion 入口，避免直接调用 state 方法。
 */
function mountScrollableEntry(scrollable: Scrollable): {
  element: Element;
  state: ScrollableState;
  focus: Focus;
  mouseRegion: MouseRegion;
} {
  const element = scrollable.createElement();
  element.mount(undefined);

  const state = (element as unknown as { _state: ScrollableState })._state;
  const builtWidget = state.build(element as unknown as BuildContext);
  const focus = builtWidget as Focus;
  const mouseRegion = focus.child as MouseRegion;

  return { element, state, focus, mouseRegion };
}

// ════════════════════════════════════════════════════
//  ScrollViewport (原 Scrollable, RenderObjectWidget)
// ════════════════════════════════════════════════════

describe("ScrollViewport", () => {
  describe("Widget protocol", () => {
    it("should create ScrollViewport with controller", () => {
      const controller = new ScrollController();
      const viewport = new ScrollViewport({ controller });
      expect(viewport).toBeDefined();
      expect(viewport.scrollController).toBe(controller);
      controller.dispose();
    });

    it("should accept optional child Widget", () => {
      const controller = new ScrollController();
      const viewport = new ScrollViewport({ controller, child: undefined });
      expect(viewport.child).toBeUndefined();
      controller.dispose();
    });
  });

  describe("createRenderObject", () => {
    it("should return a RenderScrollable instance", () => {
      const controller = new ScrollController();
      const viewport = new ScrollViewport({ controller });
      const renderObject = viewport.createRenderObject();
      expect(renderObject).toBeInstanceOf(RenderScrollable);
      controller.dispose();
    });

    it("should pass scrollController to RenderScrollable", () => {
      const controller = new ScrollController();
      const viewport = new ScrollViewport({ controller });
      const renderObject = viewport.createRenderObject() as RenderScrollable;
      expect(renderObject.scrollController).toBe(controller);
      controller.dispose();
    });
  });

  describe("updateRenderObject", () => {
    it("should update scrollController on RenderScrollable", () => {
      const controller1 = new ScrollController();
      const controller2 = new ScrollController();

      const viewport1 = new ScrollViewport({ controller: controller1 });
      const renderObject = viewport1.createRenderObject() as RenderScrollable;
      expect(renderObject.scrollController).toBe(controller1);

      const viewport2 = new ScrollViewport({ controller: controller2 });
      viewport2.updateRenderObject(renderObject);
      expect(renderObject.scrollController).toBe(controller2);

      controller1.dispose();
      controller2.dispose();
    });
  });

  describe("createElement", () => {
    it("should return a SingleChildRenderObjectElement", () => {
      const controller = new ScrollController();
      const viewport = new ScrollViewport({ controller });
      const element = viewport.createElement();
      expect(element).toBeDefined();
      controller.dispose();
    });
  });
});

// ════════════════════════════════════════════════════
//  Scrollable StatefulWidget (amp I1T alignment)
// ════════════════════════════════════════════════════

describe("Scrollable StatefulWidget", () => {
  let mockOwner: MockBuildOwner;

  beforeEach(() => {
    mockOwner = new MockBuildOwner();
    setBuildOwner(mockOwner);
  });

  afterEach(() => {
    FocusManager.instance.dispose();
    setBuildOwner(undefined);
  });

  it("creates internal ScrollController when none provided", () => {
    const scrollable = new Scrollable({
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;
    expect(state.controller).toBeInstanceOf(ScrollController);
  });

  it("uses external controller when provided", () => {
    const ext = new ScrollController();
    const scrollable = new Scrollable({
      controller: ext,
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;
    expect(state.controller).toBe(ext);
    ext.dispose();
  });

  it("build returns a widget (Focus > MouseRegion > viewport)", () => {
    const scrollable = new Scrollable({
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;
    const builtWidget = state.build(element as unknown as BuildContext);
    expect(builtWidget).toBeDefined();
  });

  it("handleKeyEvent delegates to ScrollBehavior", () => {
    const controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(100);

    const scrollable = new Scrollable({
      controller,
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;

    // ArrowDown should scroll down by default step (3)
    const result = state.handleKeyEvent(key("ArrowDown"));
    expect(result).toBe("handled");
    expect(controller.offset).toBe(3);

    controller.dispose();
  });

  it("handleKeyEvent returns ignored when keyboardScrolling is false", () => {
    const controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(100);

    const scrollable = new Scrollable({
      controller,
      keyboardScrolling: false,
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;
    const result = state.handleKeyEvent(key("ArrowDown"));
    expect(result).toBe("ignored");
    expect(controller.offset).toBe(0);

    controller.dispose();
  });

  it("defaults: vertical axis, keyboard scrolling on, autofocus off", () => {
    const scrollable = new Scrollable({
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });
    expect(scrollable.axisDirection).toBe("vertical");
    expect(scrollable.keyboardScrolling).toBe(true);
    expect(scrollable.autofocus).toBe(false);
  });

  it("static computeMaxScrollExtent works (backward compat)", () => {
    expect(Scrollable.computeMaxScrollExtent(50, 20)).toBe(30);
    expect(Scrollable.computeMaxScrollExtent(10, 20)).toBe(0);
  });

  it("initializes followMode for bottom-positioned views only once", () => {
    const controller = new ScrollController();
    const scrollable = new Scrollable({
      controller,
      position: "bottom",
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;
    expect(state.controller.followMode).toBe(true);

    state.controller.disableFollowMode();
    state.build(element as unknown as BuildContext);

    expect(state.controller.followMode).toBe(false);

    element.unmount();
    controller.dispose();
  });

  it("syncs followMode when position changes through didUpdateWidget", () => {
    const controller = new ScrollController();
    const element = new Scrollable({
      controller,
      position: "bottom",
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    }).createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;
    expect(state.controller.followMode).toBe(true);

    element.update(
      new Scrollable({
        controller,
        position: "top",
        viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
      }),
    );
    expect(state.controller.followMode).toBe(false);

    element.update(
      new Scrollable({
        controller,
        position: "bottom",
        viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
      }),
    );
    expect(state.controller.followMode).toBe(true);

    element.unmount();
    controller.dispose();
  });

  it("rebinds ScrollBehavior and scroll listener when controller changes through didUpdateWidget", () => {
    const controller1 = new ScrollController();
    controller1.disableFollowMode();
    controller1.updateMaxScrollExtent(100);

    const controller2 = new ScrollController();
    controller2.disableFollowMode();
    controller2.updateMaxScrollExtent(100);

    const element = new Scrollable({
      controller: controller1,
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    }).createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;

    element.update(
      new Scrollable({
        controller: controller2,
        viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
      }),
    );

    expect(state.handleKeyEvent(key("ArrowDown"))).toBe("handled");
    expect(controller1.offset).toBe(0);
    expect(controller2.offset).toBe(3);

    element.performRebuild();
    mockOwner.scheduledElements = [];

    controller2.jumpTo(10);
    expect(mockOwner.scheduledElements).toEqual([element]);

    element.performRebuild();
    mockOwner.scheduledElements = [];

    controller1.jumpTo(10);
    expect(mockOwner.scheduledElements).toHaveLength(0);

    element.unmount();
    controller1.dispose();
    controller2.dispose();
  });

  it("syncs ScrollBehavior axisDirection when switching between vertical and horizontal at runtime", () => {
    const controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(100);

    const element = new Scrollable({
      controller,
      axisDirection: "vertical",
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    }).createElement();
    element.mount(undefined);

    const state = (element as unknown as { _state: ScrollableState })._state;

    expect(state.handleKeyEvent(key("ArrowDown"))).toBe("handled");
    expect(controller.offset).toBe(3);

    element.update(
      new Scrollable({
        controller,
        axisDirection: "horizontal",
        viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
      }),
    );

    expect(state.handleKeyEvent(key("ArrowDown"))).toBe("ignored");
    expect(controller.offset).toBe(3);
    expect(state.handleKeyEvent(key("ArrowRight"))).toBe("handled");
    expect(controller.offset).toBe(6);

    element.update(
      new Scrollable({
        controller,
        axisDirection: "vertical",
        viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
      }),
    );

    expect(state.handleKeyEvent(key("ArrowRight"))).toBe("ignored");
    expect(controller.offset).toBe(6);
    expect(state.handleKeyEvent(key("ArrowDown"))).toBe("handled");
    expect(controller.offset).toBe(9);

    element.unmount();
    controller.dispose();
  });

  it("returns false when MouseRegion.onScroll does not change controller.offset", () => {
    const controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(10);
    controller.jumpTo(0);

    const scrollable = new Scrollable({
      controller,
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });

    const { element, mouseRegion } = mountScrollableEntry(scrollable);

    expect(mouseRegion.onScroll?.(wheel("up"))).toBe(false);
    expect(controller.offset).toBe(0);

    element.unmount();
    controller.dispose();
  });

  it("returns true when MouseRegion.onScroll changes controller.offset", () => {
    const controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(10);
    controller.jumpTo(5);

    const scrollable = new Scrollable({
      controller,
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });

    const { element, mouseRegion } = mountScrollableEntry(scrollable);

    expect(mouseRegion.onScroll?.(wheel("down"))).toBe(true);
    expect(controller.offset).toBe(6);

    element.unmount();
    controller.dispose();
  });

  it("lets mouse wheel take over an in-flight animation through MouseRegion.onScroll", async () => {
    const controller = new ScrollController();
    controller.disableFollowMode();
    controller.updateMaxScrollExtent(200);

    const scrollable = new Scrollable({
      controller,
      viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
    });

    const { element, mouseRegion } = mountScrollableEntry(scrollable);

    controller.animateTo(100, 80);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const animatedOffset = controller.offset;
    expect(animatedOffset).toBeGreaterThan(0);

    expect(mouseRegion.onScroll?.(wheel("down"))).toBe(true);
    const takenOverOffset = controller.offset;
    expect(takenOverOffset).toBe(animatedOffset + 1);

    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(controller.offset).toBe(takenOverOffset);

    element.unmount();
    controller.dispose();
  });
});
