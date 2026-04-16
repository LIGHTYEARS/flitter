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
});
