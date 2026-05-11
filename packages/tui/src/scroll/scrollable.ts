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

import { logger } from "../debug/logger.js";
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
import { ClampingScrollPhysics, type ScrollPhysics } from "./scroll-physics.js";

// ════════════════════════════════════════════════════
//  ScrollViewport — 低层级 RenderObject Widget（原 Scrollable）
// ════════════════════════════════════════════════════

/** ScrollViewport 构造函数参数。 */
interface ScrollViewportArgs {
  key?: Key;
  controller: ScrollController;
  child?: WidgetInterface;
  /**
   * Viewport position: "top" anchors content to the top (default),
   * "bottom" anchors content to the bottom and enables follow mode.
   *
   * 逆向: amp I3 Scrollable accepts position: "top" | "bottom" (chunk-006:4094)
   */
  position?: "top" | "bottom";
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
  readonly position: "top" | "bottom";

  constructor(args: ScrollViewportArgs) {
    super({ key: args.key });
    this.scrollController = args.controller;
    this.child = args.child;
    this.position = args.position ?? "top";
  }

  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new RenderScrollable(this.scrollController, this.position);
  }

  updateRenderObject(renderObject: RenderObject): void {
    const rs = renderObject as RenderScrollable;
    rs.scrollController = this.scrollController;
    rs.position = this.position;
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
  /** 滚动物理特性，默认 ClampingScrollPhysics */
  physics?: ScrollPhysics;
  /** 滚动轴方向，默认 "vertical" */
  axisDirection?: AxisDirection;
  /** 是否启用键盘滚动，默认 true */
  keyboardScrolling?: boolean;
  /** 是否自动聚焦，默认 false */
  autofocus?: boolean;
  /**
   * Viewport position: "top" (default) or "bottom".
   * "bottom" enables follow mode on the controller and anchors
   * short content to the bottom of the viewport.
   *
   * 逆向: amp I3 Scrollable accepts position (chunk-006:4094-4220)
   */
  position?: "top" | "bottom";
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
  readonly physics: ScrollPhysics;
  readonly axisDirection: AxisDirection;
  readonly keyboardScrolling: boolean;
  readonly autofocus: boolean;
  readonly position: "top" | "bottom";
  readonly viewportBuilder: (
    context: BuildContext,
    controller: ScrollController,
  ) => WidgetInterface;

  constructor(args: ScrollableArgs) {
    super({ key: args.key });
    this.controller = args.controller;
    this.physics = args.physics ?? new ClampingScrollPhysics();
    this.axisDirection = args.axisDirection ?? "vertical";
    this.keyboardScrolling = args.keyboardScrolling ?? true;
    this.autofocus = args.autofocus ?? false;
    this.position = args.position ?? "top";
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
const scrollLog = logger.scoped("scroll.state");

export class ScrollableState extends State<Scrollable> {
  private _internalController: ScrollController | null = null;
  private _physics!: ScrollPhysics;
  private _scrollBehavior!: ScrollBehavior;
  private _scrollListener: (() => void) | null = null;
  private _didInitializeFollowMode: boolean = false;

  /** 逆向: amp I1T.controller getter */
  get controller(): ScrollController {
    return this.widget.controller ?? this._internalController!;
  }

  /** 逆向: amp I1T.physics getter */
  get physics(): ScrollPhysics {
    return this._physics;
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

    // 逆向: amp I1T line 15 — this._physics = this.widget.physics || new x1T()
    this._physics = this.widget.physics;

    // 逆向: amp chunk-006:5896-5897 — _configureController()
    // Sets followMode based on position: "bottom" enables follow mode.
    this._initializeControllerFollowMode();

    // 逆向: amp I1T line 15 — new P1T(this)
    // flitter 的 ScrollBehavior 接受 ScrollController 而非 ScrollableState
    this._scrollBehavior = new ScrollBehavior(this.controller, {
      axisDirection: this.widget.axisDirection,
    });

    // 逆向: amp I1T._boundOnScrollChanged → setState
    this._scrollListener = () => {
      scrollLog.debug("scrollListener:setState", { offset: this.controller.offset, max: this.controller.maxScrollExtent });
      if (this.mounted) this.setState();
    };
    this.controller.addListener(this._scrollListener);
  }

  /**
   * 根据 widget.position 初始化 controller 的默认 followMode。
   *
   * 该初始化只在 state 生命周期内执行一次，避免后续 rebuild 期间把运行时
   * followMode 状态重新覆盖回默认值。
   *
   * @returns void
   */
  private _initializeControllerFollowMode(): void {
    if (this._didInitializeFollowMode) {
      return;
    }

    const followMode = this.widget.position === "bottom";
    if (followMode) {
      this.controller.enableFollowMode();
    } else {
      this.controller.disableFollowMode();
    }

    this._didInitializeFollowMode = true;
    scrollLog.debug("initializeFollowMode", {
      position: this.widget.position,
      followMode: this.controller.followMode,
    });
  }

  /**
   * 确保 state 生命周期内始终存在可用的内部 controller。
   *
   * 当 Scrollable 从外部 controller 切回内部 controller 时，复用或延迟创建
   * state 持有的内部实例，避免 controller getter 落到空引用。
   *
   * @returns 当前可用的内部 ScrollController
   */
  private _ensureInternalController(): ScrollController {
    if (!this._internalController) {
      this._internalController = new ScrollController();
      scrollLog.debug("ensureInternalController:create");
    }
    return this._internalController;
  }

  /**
   * 在 widget 更新后同步 controller 绑定关系。
   *
   * 与 amp 中“controller 变化时移除旧监听并绑定新 controller”的模式对齐：
   * - _scrollBehavior.controller 指向新 controller
   * - _scrollListener 从旧 controller 解绑并绑定到新 controller
   *
   * @param oldWidget - 更新前的旧 Scrollable 配置
   * @returns 是否发生了 controller 切换
   */
  private _syncControllerBinding(oldWidget: Scrollable): boolean {
    const oldController = oldWidget.controller ?? this._internalController;
    const nextController = this.widget.controller ?? this._ensureInternalController();
    const controllerChanged = oldController !== nextController;

    if (!controllerChanged) {
      return false;
    }

    if (this._scrollListener && oldController) {
      oldController.removeListener(this._scrollListener);
    }
    if (this._scrollListener) {
      nextController.addListener(this._scrollListener);
    }

    this._scrollBehavior.controller = nextController;

    scrollLog.debug("didUpdateWidget:syncControllerBinding", {
      hadOldController: oldController !== null,
      nextControllerIsExternal: this.widget.controller !== undefined,
    });

    return true;
  }

  /**
   * 在 widget 更新后同步 ScrollBehavior 的 axisDirection。
   *
   * amp 的滚动行为在处理键盘事件时直接读取最新 widget.axisDirection；
   * flitter 通过 ScrollBehavior 缓存该字段，因此需要在 didUpdateWidget
   * 中显式保持同步，确保运行时 vertical/horizontal 切换立即生效。
   *
   * @param oldWidget - 更新前的旧 Scrollable 配置
   * @returns 是否发生了 axisDirection 切换
   */
  private _syncScrollBehaviorAxisDirection(oldWidget: Scrollable): boolean {
    if (oldWidget.axisDirection === this.widget.axisDirection) {
      return false;
    }

    this._scrollBehavior.axisDirection = this.widget.axisDirection;
    scrollLog.debug("didUpdateWidget:syncAxisDirection", {
      fromAxisDirection: oldWidget.axisDirection,
      toAxisDirection: this.widget.axisDirection,
    });
    return true;
  }

  /**
   * 在 widget 更新后同步 position 对应的默认 followMode。
   *
   * 仅当 position 或 controller 真实变化时才同步，避免普通 rebuild 覆盖运行时滚动状态。
   *
   * @param oldWidget - 更新前的旧 Scrollable 配置
   */
  override didUpdateWidget(oldWidget: Scrollable): void {
    super.didUpdateWidget(oldWidget);

    this._syncScrollBehaviorAxisDirection(oldWidget);
    const controllerChanged = this._syncControllerBinding(oldWidget);
    if (!controllerChanged && oldWidget.position === this.widget.position) {
      return;
    }

    const followMode = this.widget.position === "bottom";
    if (followMode) {
      this.controller.enableFollowMode();
    } else {
      this.controller.disableFollowMode();
    }

    scrollLog.debug("didUpdateWidget:syncFollowMode", {
      fromPosition: oldWidget.position,
      toPosition: this.widget.position,
      controllerChanged,
      followMode: this.controller.followMode,
    });
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

  // ── 边界方向翻转抑制状态 ──
  // Ghostty/macOS Magic Mouse 在滚动边界处会产生高频方向翻转噪声（0-2ms 间隔）。
  // 当 offset 在边界附近且检测到快速方向翻转时，丢弃噪声方向事件以防止视觉抖动。
  private _lastScrollDirection: string | null = null;
  private _lastScrollTime = 0;
  /** 边界翻转抑制窗口（毫秒）— 在此时间内的方向翻转被视为噪声 */
  private static readonly BOUNDARY_FLIP_WINDOW_MS = 8;

  /**
   * 逆向: amp I1T.handleMouseScrollEvent — 方向感知鼠标滚动。
   *
   * 与 amp I1T line 54-67 对齐：
   * - vertical 模式: 响应 up/down 滚轮（shift 时忽略）
   * - horizontal 模式: 响应 left/right 滚轮 或 shift+up/down
   *
   * 返回值与 amp 保持一致：只根据 controller.offset 是否发生变化决定是否返回 true。
   * 命中边界且 clamp 后 offset 不变时返回 false；不引入额外的渲染阶段或提交状态判断。
   *
   * 额外增加边界方向翻转抑制：当 offset 在边界附近（≤1）且快速方向翻转时丢弃噪声。
   */
  handleMouseScrollEvent = (event: MouseEvent): boolean => {
    const direction = event.direction as string | undefined;
    if (!direction) return false;

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

    if (!shouldHandle) {
      scrollLog.debug("handleMouseScroll:ignored", {
        direction,
        axisDirection: this.widget.axisDirection,
        shift: hasShift,
      });
      return false;
    }

    // 逆向: amp I1T line 62-64 — getScrollStep() returns 1 for mouse
    const step = 1;
    let delta: number;
    if (direction === "down" || direction === "right") {
      delta = step;
    } else {
      delta = -step;
    }

    // ── 边界方向翻转抑制 ──
    // 当 offset 在边界附近且方向快速翻转时，丢弃反向噪声事件。
    // 这抑制了 macOS Magic Mouse 惯性滚动在边界处的 0-2ms 方向翻转噪声。
    const now = Date.now();
    const offset = this.controller.offset;
    const max = this.controller.maxScrollExtent;
    const atTopBoundary = offset <= 1;
    const atBottomBoundary = offset >= max - 1;
    const directionFlipped = this._lastScrollDirection !== null && direction !== this._lastScrollDirection;
    const withinFlipWindow = now - this._lastScrollTime < ScrollableState.BOUNDARY_FLIP_WINDOW_MS;

    if (directionFlipped && withinFlipWindow) {
      // 在边界附近且快速翻转 — 丢弃"离开边界"方向的噪声
      const isNoiseAwayFromTop = atTopBoundary && delta > 0;
      const isNoiseAwayFromBottom = atBottomBoundary && delta < 0;
      if (isNoiseAwayFromTop || isNoiseAwayFromBottom) {
        scrollLog.debug("handleMouseScroll:boundaryFlipSuppressed", {
          direction,
          delta,
          offset,
          max,
          atTopBoundary,
          atBottomBoundary,
          timeSinceLastMs: now - this._lastScrollTime,
        });
        // 不更新 _lastScrollDirection — 保持原方向锁定
        this._lastScrollTime = now;
        return false;
      }
    }

    this._lastScrollDirection = direction;
    this._lastScrollTime = now;

    // 逆向: amp I1T line 65-66 — 记录滚动前 offset，返回是否实际发生了滚动
    const prevOffset = this.controller.offset;
    scrollLog.debug("handleMouseScroll", {
      direction,
      delta,
      currentOffset: prevOffset,
      max: this.controller.maxScrollExtent,
      axisDirection: this.widget.axisDirection,
      shift: hasShift,
    });
    this.handleScrollDelta(delta);
    const moved = this.controller.offset !== prevOffset;
    scrollLog.debug("handleMouseScroll:result", {
      direction,
      delta,
      previousOffset: prevOffset,
      nextOffset: this.controller.offset,
      moved,
      consumed: moved,
    });
    return moved;
  };

  /**
   * 处理用户滚动增量。
   *
   * 逆向: amp I1T.handleScrollDelta in interactive_widgets.js:74-80
   *
   * 该方法是用户滚动输入的统一入口，所有键盘和鼠标滚动都应通过此方法。
   * 它会：
   * 1. 检查 ScrollPhysics.shouldAcceptUserOffset()
   * 2. 计算新偏移量 = 当前 offset + delta
   * 3. 通过 ScrollPhysics.applyBoundaryConditions() 应用边界条件
   * 4. 调用 ScrollController.updateOffset() 更新偏移量
   *
   * @param delta - 滚动增量（正数向下/向右，负数向上/向左）
   */
  handleScrollDelta(delta: number): void {
    // 逆向: amp I1T line 75 — if (!this._physics.shouldAcceptUserOffset()) return;
    if (!this._physics.shouldAcceptUserOffset()) {
      return;
    }

    // 逆向: amp I1T line 76-79
    const newOffset = this.controller.offset + delta;
    const minExtent = 0;
    const maxExtent = this.controller.maxScrollExtent;
    const clamped = this._physics.clampOffset(newOffset, minExtent, maxExtent);

    // 逆向: amp I1T line 80 — this._controller.updateOffset(t);
    this.controller.updateOffset(clamped);
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
