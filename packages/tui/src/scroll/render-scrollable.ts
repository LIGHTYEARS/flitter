/**
 * 滚动视口渲染对象。
 *
 * {@link RenderScrollable} 是 {@link RenderBox} 的子类，作为可滚动视口的
 * 渲染层核心。
 *
 * 对齐 amp v1T（interactive_widgets.js:203-305）:
 * - offset 通过 Widget 属性流传递（build → updateRenderObject → updateProperties）
 * - offset-only 变化仅调用 updateChildOffset()（setOffset 子节点 Y），
 *   **不** 触发 markNeedsLayout 或 markNeedsPaint
 * - RenderScrollable **不** 直接注册 controller listener（消除双重通知路径）
 * - performLayout 中 clamp/autoScroll 直接写内部 _scrollOffset，
 *   不通过 controller 触发 _notifyListeners
 *
 * @module
 */

import { logger } from "../debug/logger.js";
import type { HitTestResult } from "../gestures/hit-test.js";
import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { ClipScreen } from "../widgets/viewport.js";
import type { ScrollController } from "./scroll-controller.js";

const log = logger.scoped("scroll.render");

// ════════════════════════════════════════════════════
//  常量
// ════════════════════════════════════════════════════

/**
 * 子节点最大允许高度。
 *
 * 超过此值的子高度将被钳位并打印警告。
 * 威胁缓解 T-12.1-04: 防止恶意/异常子节点报告极大高度导致内存问题。
 */
const MAX_CHILD_HEIGHT = 100_000;

// ════════════════════════════════════════════════════
//  RenderScrollable
// ════════════════════════════════════════════════════

/**
 * 可滚动视口渲染对象。
 *
 * 逆向: amp v1T (interactive_widgets.js:203-305)
 *
 * 继承 {@link RenderBox}，管理一个单子节点（通过 adoptChild 添加）。
 * 在布局时将无限高度约束传给子节点，自身尺寸等于父约束的视口大小。
 * 在绘制和命中测试时根据当前 _scrollOffset 偏移子节点的 Y 坐标。
 *
 * **关键设计**: offset 通过 Widget 属性流传递（单一数据源），
 * RenderScrollable 不注册 controller listener，消除了双重通知导致的
 * 跨帧不一致抖动。
 *
 * @example
 * ```ts
 * const controller = new ScrollController();
 * const renderScrollable = new RenderScrollable(controller, 0, "top");
 * renderScrollable.adoptChild(childRenderBox);
 * renderScrollable.layout(viewportConstraints);
 * renderScrollable.paint(screen, 0, 0);
 * ```
 */
export class RenderScrollable extends RenderBox {
  /** 关联的滚动控制器 */
  private _scrollController: ScrollController;

  /** 当前 render object 使用的滚动偏移快照。 */
  private _scrollOffset: number = 0;

  /** 当前 render object 使用的 bottom-anchor 偏移快照。 */
  private _bottomAnchorOffset: number = 0;

  /**
   * Viewport position: "top" (default) or "bottom".
   *
   * 逆向: amp v1T._position (chunk-006:4094)
   * When "bottom", short content (< viewport) is anchored to the bottom edge
   * via a negative paint offset.
   */
  private _position: "top" | "bottom";

  /**
   * 创建可滚动视口渲染对象。
   *
   * 逆向: amp v1T constructor(T, R, a, e)
   *
   * @param scrollController - 滚动控制器实例
   * @param scrollOffset - 初始滚动偏移量
   * @param position - Viewport position ("top" or "bottom")
   */
  constructor(
    scrollController: ScrollController,
    scrollOffset: number = 0,
    position: "top" | "bottom" = "top",
  ) {
    super();
    this._scrollController = scrollController;
    this._scrollOffset = scrollOffset;
    this._position = position;
  }

  /**
   * 获取当前滚动控制器。
   *
   * @returns 关联的 ScrollController
   */
  get scrollController(): ScrollController {
    return this._scrollController;
  }

  /**
   * 获取第一个子节点（单子模式）。
   *
   * @returns 子 RenderBox 或 undefined
   */
  get child(): RenderBox | undefined {
    return this._children[0] as RenderBox | undefined;
  }

  // ════════════════════════════════════════════════════
  //  属性更新 — 对齐 amp v1T.updateProperties
  // ════════════════════════════════════════════════════

  /**
   * 统一属性更新入口。
   *
   * 逆向: amp v1T.updateProperties(T, R, a, e) (interactive_widgets.js:215-219)
   *
   * 关键对齐:
   * - controller/position 变化 → markNeedsLayout（结构性变化）
   * - offset-only 变化 → updateChildOffset()（轻量路径，不触发 layout/paint 标记）
   *
   * 这是消除渲染抖动的核心: offset 变化不走 markNeedsLayout/markNeedsPaint，
   * 只直接移动子节点 Y 坐标。下一帧 paint 自然读取子节点的 offset 值。
   *
   * @param controller - 新的 ScrollController
   * @param offset - 新的滚动偏移量
   * @param position - 新的 viewport position
   */
  updateProperties(controller: ScrollController, offset: number, position: "top" | "bottom"): void {
    let needsLayout = false;

    if (this._scrollController !== controller) {
      log.debug("updateProperties:controllerChanged");
      this._scrollController = controller;
      needsLayout = true;
    }

    if (this._position !== position) {
      log.debug("updateProperties:positionChanged", { from: this._position, to: position });
      this._position = position;
      needsLayout = true;
    }

    // 逆向: amp v1T line 219 — offset 变化仅调用 updateChildOffset，不 markNeedsLayout
    if (this._scrollOffset !== offset) {
      log.debug("updateProperties:offsetChanged", {
        from: this._scrollOffset,
        to: offset,
        path: "widget-property-flow",
      });
      this._scrollOffset = offset;
      this.updateChildOffset();
    }

    if (needsLayout) {
      this.markNeedsLayout();
    }
  }

  /**
   * 轻量 offset 同步 — 仅移动子节点 Y 坐标。
   *
   * 逆向: amp v1T.updateChildOffset (interactive_widgets.js:221-228)
   *
   * **不** 触发 markNeedsLayout 或 markNeedsPaint。
   * 子节点的 setOffset 只修改 _offset.x/y，paint 阶段自然使用最新值。
   * 这是 amp 避免渲染抖动的核心机制。
   */
  private updateChildOffset(): void {
    if (!this.child) return;

    const y = -Math.floor(this._scrollOffset) + this._bottomAnchorOffset;
    this.child.setOffset(0, y);
    // 对齐 amp: setOffset 后需要标记 paint（因为子节点 Y 位置变了，需要重绘）
    // amp 的 paint 在遍历 children 时直接读取 child.offset，所以 setOffset 后
    // 父节点需要 repaint 才能把新位置体现到 screen 上
    this.markNeedsPaint();
  }

  // ════════════════════════════════════════════════════
  //  布局
  // ════════════════════════════════════════════════════

  /**
   * 执行布局计算。
   *
   * 逆向: amp v1T.performLayout (interactive_widgets.js:229-251)
   *
   * 1. 将约束的 maxHeight 设为 Infinity（无限高度），传递给子节点
   * 2. 自身尺寸设为父约束的视口大小
   * 3. 更新 ScrollController 的 maxScrollExtent
   * 4. 处理 autoScroll/clamp — 直接写内部 _scrollOffset，不通过 controller 触发 notify
   * 5. 调用 updateChildOffset 同步子节点 Y 坐标
   *
   * 威胁缓解 T-12.1-04: 如果子节点报告高度超过 MAX_CHILD_HEIGHT，
   * 则钳位到 MAX_CHILD_HEIGHT 并打印警告。
   */
  performLayout(): void {
    const constraints = this._constraints!;

    if (this.child) {
      // 向子节点传递无限高度约束
      const childConstraints = new BoxConstraints({
        minWidth: constraints.minWidth,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: Infinity,
      });

      this.child.layout(childConstraints);
    }

    // 自身尺寸 = 视口大小
    this._size = {
      width: constraints.maxWidth,
      height: constraints.maxHeight,
    };

    // 计算并更新 maxScrollExtent
    let childHeight = this.child?.size.height ?? 0;

    // 威胁缓解 T-12.1-04: 钳位异常子高度
    if (childHeight > MAX_CHILD_HEIGHT) {
      console.warn(
        `[RenderScrollable] 子节点高度 ${childHeight} 超过上限 ${MAX_CHILD_HEIGHT}，已钳位`,
      );
      childHeight = MAX_CHILD_HEIGHT;
    }

    const viewportHeight = this._size.height;
    this._scrollController.updateViewportDimension(viewportHeight);

    // 逆向: amp v1T.performLayout() (interactive_widgets.js:246-248)
    //   Snapshot atBottom before updating maxScrollExtent, then jumpTo if followMode && wasAtBottom.
    const newExtent = Math.max(0, childHeight - viewportHeight);
    const oldExtent = this._scrollController.maxScrollExtent;
    const wasAtBottom = oldExtent > 0 && this._scrollController.atBottom;
    this._scrollController.updateMaxScrollExtent(newExtent);

    const grewSinceLastLayout = newExtent > oldExtent;
    const shouldAutoScroll =
      this._scrollController.followMode && wasAtBottom && grewSinceLastLayout;

    log.debug("performLayout", {
      childHeight,
      viewportHeight,
      oldExtent,
      newExtent,
      offset: this._scrollOffset,
      controllerOffset: this._scrollController.offset,
      followMode: this._scrollController.followMode,
      shouldAutoScroll,
      wasAtBottom,
      position: this._position,
    });

    // 逆向: amp v1T line 248 — autoScroll 和 clamp
    // 关键对齐: 直接通过 controller.jumpTo 更新（与 amp 一致），
    // 但随后立即同步内部 _scrollOffset，确保同一帧内 paint 使用正确值。
    // ScrollableState._scrollListener 收到 notify 后会 setState 触发下一帧 rebuild，
    // 此时 build 读取 controller.offset 传入新的 Widget offset 属性，与内部值一致。
    if (shouldAutoScroll) {
      log.debug("performLayout:autoScroll", { to: newExtent });
      this._scrollController.jumpTo(newExtent);
      this._scrollOffset = this._scrollController.offset;
    } else if (this._scrollController.offset > newExtent) {
      log.debug("performLayout:clampOffset", { offset: this._scrollController.offset, newExtent });
      this._scrollController.jumpTo(newExtent);
      this._scrollOffset = this._scrollController.offset;
    }

    // 逆向: amp v1T.handleBottomPositioning (chunk-006:4210)
    // When position="bottom" and content is shorter than viewport,
    // compute a negative paint offset to anchor content to the bottom edge.
    const nextBottomAnchorOffset =
      this._position === "bottom" && childHeight <= viewportHeight
        ? viewportHeight - childHeight
        : 0;
    if (this._bottomAnchorOffset !== nextBottomAnchorOffset) {
      log.debug("syncBottomAnchorOffset", {
        from: this._bottomAnchorOffset,
        to: nextBottomAnchorOffset,
        position: this._position,
      });
      this._bottomAnchorOffset = nextBottomAnchorOffset;
    }

    // 逆向: amp v1T line 251 — updateChildOffset() at end of performLayout
    this.updateChildOffset();
  }

  // ════════════════════════════════════════════════════
  //  命中测试
  // ════════════════════════════════════════════════════

  /**
   * 命中测试 — 委托给子节点，子节点的 _offset.y 已包含滚动偏移。
   *
   * 逆向: amp v1T — updateChildOffset 设置 child.offset.y = -scrollOffset + bottomAnchor
   * 因此 hitTest 只需传递 scrollable 自身的 absY，子节点的 offset 自然消费滚动偏移。
   */
  override hitTest(
    result: HitTestResult,
    position: { x: number; y: number },
    offsetX = 0,
    offsetY = 0,
  ): boolean {
    const absX = offsetX + this._offset.x;
    const absY = offsetY + this._offset.y;

    const inX = position.x >= absX && position.x < absX + this._size.width;
    const inY = position.y >= absY && position.y < absY + this._size.height;
    if (!inX || !inY) return false;

    result.add({
      target: this,
      localPosition: { x: position.x - absX, y: position.y - absY },
    });

    if (!this.child) return true;

    // child._offset.y 已由 updateChildOffset 设置为 (-scrollOffset + bottomAnchorOffset)
    // 传递 absY 即可，子节点 hitTest 会加上自身 _offset.y
    this.child.hitTest(result, position, absX, absY);

    return true;
  }

  // ════════════════════════════════════════════════════
  //  绘制
  // ════════════════════════════════════════════════════

  /**
   * 绘制可滚动视口。
   *
   * 将子节点绘制到 screen 上，Y 坐标减去当前 _scrollOffset。
   * 使用 ClipScreen 裁剪到视口范围，防止内容泄漏到视口外。
   *
   * 逆向: amp v1T.paint (interactive_widgets.js:299-304)
   * amp 使用 zm (ClipScreen) 包装 screen，限制子节点绘制在视口内。
   *
   * @param screen - 目标屏幕
   * @param offsetX - 全局 X 偏移量
   * @param offsetY - 全局 Y 偏移量
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this._needsPaint = false;

    if (!this.child) return;

    const scrollOffset = Math.floor(this._scrollOffset);
    const bottomOffset = this._bottomAnchorOffset;

    log.debug("paint", {
      scrollOffset,
      bottomAnchorOffset: bottomOffset,
      offsetX,
      offsetY,
    });

    // 逆向: amp v1T.paint — 创建 ClipScreen 裁剪子节点绘制到视口范围内
    const clipScreen = new ClipScreen(
      screen,
      offsetX,
      offsetY,
      this._size.width,
      this._size.height,
    );

    // Apply bottom-anchor offset when content is shorter than viewport
    this.child.paint(
      clipScreen as unknown as Screen,
      offsetX,
      offsetY - scrollOffset + bottomOffset,
    );
  }
}
