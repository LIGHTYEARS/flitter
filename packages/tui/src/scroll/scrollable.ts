/**
 * Scrollable StatefulWidget — 自动集成 Focus + MouseRegion + 滚动行为。
 *
 * 逆向: amp I1T (ScrollableState) in interactive_widgets.js:0-81
 * 逆向: amp f1T (Scrollable widget) in actions_intents.js:634-657
 *
 * build() 组合: Focus(onKey) > MouseRegion(onScroll) > viewportBuilder(controller)
 * 消费者只需提供 viewportBuilder，键盘和鼠标滚动自动工作。
 *
 * 同时保留旧的 ScrollViewport (原 Scrollable) 作为低层级
 * SingleChildRenderObjectWidget，供 viewportBuilder 内部使用。
 *
 * @module
 */

import type { KeyEventResult } from "../focus/focus-node.js";
import type { BuildContext, Element, Widget as WidgetInterface } from "../tree/element.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import type { KeyEvent } from "../vt/types.js";
import { Focus } from "../widgets/focus.js";
import type { MouseEvent } from "../widgets/mouse-region.js";
import { MouseRegion } from "../widgets/mouse-region.js";
import { SingleChildRenderObjectElement } from "../widgets/padding.js";
import { RenderScrollable } from "./render-scrollable.js";
import type { AxisDirection } from "./scroll-behavior.js";
import { ScrollBehavior } from "./scroll-behavior.js";
import { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  ScrollViewport — 低层级 RenderObject Widget（原 Scrollable）
// ════════════════════════════════════════════════════

/** ScrollViewport 构造函数参数。 */
interface ScrollViewportArgs {
  key?: Key;
  controller: ScrollController;
  child?: WidgetInterface;
}

/**
 * 低层级滚动视口 Widget（原 Scrollable, 现更名为 ScrollViewport）。
 *
 * 将子 Widget 包装在 {@link RenderScrollable} 中，提供垂直滚动能力。
 * 通过 {@link ScrollController} 控制滚动位置。
 *
 * 大多数场景应使用高层级 {@link Scrollable} StatefulWidget，
 * 它自动处理 Focus + MouseRegion + 键盘绑定。
 */
export class ScrollViewport extends Widget implements RenderObjectWidget {
  readonly scrollController: ScrollController;
  readonly child: WidgetInterface | undefined;

  constructor(args: ScrollViewportArgs) {
    super({ key: args.key });
    this.scrollController = args.controller;
    this.child = args.child;
  }

  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new RenderScrollable(this.scrollController);
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderScrollable).scrollController = this.scrollController;
  }
}

// ════════════════════════════════════════════════════
//  Scrollable — 高层级 StatefulWidget
// ════════════════════════════════════════════════════

/** Scrollable 构造函数参数。 */
interface ScrollableArgs {
  key?: Key;
  /** 外部滚动控制器（可选，不提供则自动创建） */
  controller?: ScrollController;
  /** 滚动轴方向，默认 "vertical" */
  axisDirection?: AxisDirection;
  /** 是否启用键盘滚动，默认 true */
  keyboardScrolling?: boolean;
  /** 是否自动聚焦，默认 false */
  autofocus?: boolean;
  /**
   * 视口构建函数。
   *
   * 逆向: amp f1T.viewportBuilder — (context, controller) => Widget
   *
   * 返回的 Widget 将被包裹在 Focus > MouseRegion 中。
   */
  viewportBuilder: (context: BuildContext, controller: ScrollController) => WidgetInterface;
}

/**
 * Scrollable StatefulWidget — 自动集成 Focus + MouseRegion + 滚动行为。
 *
 * 逆向: amp f1T in actions_intents.js:634-657
 *
 * build() 自动组合 Focus > MouseRegion > viewportBuilder(controller)，
 * 消费者不需要手动设置 FocusNode 或 ScrollKeyHandler。
 *
 * @example
 * ```ts
 * new Scrollable({
 *   viewportBuilder: (ctx, ctrl) => new ScrollViewport({
 *     controller: ctrl,
 *     child: new Column({ children: [...] }),
 *   }),
 * });
 * ```
 */
export class Scrollable extends StatefulWidget {
  readonly controller: ScrollController | undefined;
  readonly axisDirection: AxisDirection;
  readonly keyboardScrolling: boolean;
  readonly autofocus: boolean;
  readonly viewportBuilder: (
    context: BuildContext,
    controller: ScrollController,
  ) => WidgetInterface;

  constructor(args: ScrollableArgs) {
    super({ key: args.key });
    this.controller = args.controller;
    this.axisDirection = args.axisDirection ?? "vertical";
    this.keyboardScrolling = args.keyboardScrolling ?? true;
    this.autofocus = args.autofocus ?? false;
    this.viewportBuilder = args.viewportBuilder;
  }

  createState(): State {
    return new ScrollableState();
  }

  /**
   * 保留静态工具方法（向后兼容）。
   */
  static computeMaxScrollExtent(childHeight: number, viewportHeight: number): number {
    return Math.max(0, childHeight - viewportHeight);
  }
}

// ════════════════════════════════════════════════════
//  ScrollableState
// ════════════════════════════════════════════════════

/**
 * Scrollable State — 管理 ScrollController + ScrollBehavior 生命周期。
 *
 * 逆向: amp I1T in interactive_widgets.js:0-81
 *
 * 要点：
 * - initState: 创建内部 controller（如果无外部），创建 ScrollBehavior，注册 scroll listener
 * - handleKeyEvent: 委托给 ScrollBehavior（arrow 函数保持稳定引用）
 * - handleMouseScrollEvent: 垂直/水平方向感知（与 amp I1T line 54-67 对齐）
 * - build: Focus > MouseRegion > viewportBuilder
 * - dispose: 移除 listener，释放内部 controller
 */
export class ScrollableState extends State<Scrollable> {
  private _internalController: ScrollController | null = null;
  private _scrollBehavior!: ScrollBehavior;
  private _scrollListener: (() => void) | null = null;

  /** 逆向: amp I1T.controller getter */
  get controller(): ScrollController {
    return this.widget.controller ?? this._internalController!;
  }

  /**
   * 逆向: amp I1T.initState — 创建 controller, physics, scrollBehavior, 注册 listener。
   */
  override initState(): void {
    super.initState();

    // 逆向: amp I1T line 15 — fallback to new Q3() if no external controller
    if (!this.widget.controller) {
      this._internalController = new ScrollController();
    }

    // 逆向: amp I1T line 15 — new P1T(this)
    this._scrollBehavior = new ScrollBehavior(this.controller, {
      axisDirection: this.widget.axisDirection,
    });

    // 逆向: amp I1T._boundOnScrollChanged → setState
    this._scrollListener = () => {
      if (this.mounted) this.setState();
    };
    this.controller.addListener(this._scrollListener);
  }

  /**
   * 逆向: amp I1T.handleKeyEvent — 委托给 ScrollBehavior。
   *
   * 箭头函数保持稳定引用（用于 Focus.onKey）。
   */
  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    // 逆向: amp I1T line 47 — check keyboardScrolling flag
    if (!this.widget.keyboardScrolling) return "ignored";
    return this._scrollBehavior.handleKeyEvent(event);
  };

  /**
   * 逆向: amp I1T.handleMouseScrollEvent — 方向感知鼠标滚动。
   *
   * 与 amp I1T line 54-67 对齐：
   * - vertical 模式: 响应 up/down 滚轮（shift 时忽略）
   * - horizontal 模式: 响应 left/right 滚轮 或 shift+up/down
   */
  handleMouseScrollEvent = (event: MouseEvent): void => {
    const direction = event.direction as string | undefined;
    if (!direction) return;

    const isHorizontal = this.widget.axisDirection === "horizontal";
    const hasShift = event.modifiers?.shift === true;

    const isLR = direction === "left" || direction === "right";
    const isUD = direction === "up" || direction === "down";

    // 逆向: amp I1T line 57-60 — direction filter
    let shouldHandle = false;
    if (isHorizontal) {
      shouldHandle = isLR || (isUD && hasShift);
    } else {
      shouldHandle = isUD && !hasShift;
    }

    if (!shouldHandle) return;

    // 逆向: amp I1T line 62-64 — getScrollStep() returns 1 for mouse
    const step = 1;
    let delta: number;
    if (direction === "down" || direction === "right") {
      delta = step;
    } else {
      delta = -step;
    }

    this._scrollBehavior.handleScrollDelta(delta);
  };

  /**
   * 逆向: amp I1T.build — Focus > MouseRegion > viewportBuilder
   *
   * I1T line 22-41:
   * ```
   * return new C8({
   *   onKey: this._boundHandleKeyEvent,
   *   autofocus: this.widget.autofocus,
   *   debugLabel: "Scrollable",
   *   child: new G0({
   *     onScroll: this._boundHandleMouseScrollEvent,
   *     opaque: !1,
   *     child: e
   *   })
   * });
   * ```
   */
  build(context: BuildContext): WidgetInterface {
    const viewport = this.widget.viewportBuilder(context, this.controller);

    return new Focus({
      autofocus: this.widget.autofocus,
      onKey: this.handleKeyEvent,
      debugLabel: "Scrollable",
      child: new MouseRegion({
        onScroll: this.handleMouseScrollEvent,
        opaque: false,
        child: viewport,
      }),
    });
  }

  /**
   * 逆向: amp I1T.dispose — 移除 listener, 释放内部 controller。
   */
  override dispose(): void {
    if (this._scrollListener) {
      this.controller.removeListener(this._scrollListener);
      this._scrollListener = null;
    }

    // 逆向: amp I1T line 19 — only dispose if we own it
    if (this._internalController) {
      this._internalController.dispose();
      this._internalController = null;
    }

    super.dispose();
  }
}
