/**
 * 滚动视口渲染对象。
 *
 * {@link RenderScrollable} 是 {@link RenderBox} 的子类，作为可滚动视口的
 * 渲染层核心。在 layout 阶段将无限高度约束传递给子节点，并同步当前可见的
 * 滚动偏移快照，让 paint/hitTest 始终共享同一份 render snapshot，同时裁剪到
 * 视口范围。
 *
 * 对应逆向工程中的滚动视口渲染实现。
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

/**
 * 描述渲染节点，便于定位 offset 稳定时是谁仍在推动 relayout。
 *
 * @param node - 需要描述的渲染节点
 * @returns 适合日志输出的节点摘要
 */
function describeRenderNode(node: RenderBox | null): Record<string, unknown> | null {
  if (!node) return null;

  const candidate = node as RenderBox & {
    depth?: number;
    attached?: boolean;
    parent?: { constructor?: { name?: string } } | null;
    _needsLayout?: boolean;
    _needsPaint?: boolean;
  };

  return {
    type: candidate.constructor.name,
    depth: candidate.depth ?? -1,
    attached: candidate.attached ?? false,
    size: candidate.size,
    needsLayout: candidate._needsLayout ?? false,
    needsPaint: candidate._needsPaint ?? false,
    parentType: candidate.parent?.constructor?.name ?? "unknown",
  };
}

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
 * 继承 {@link RenderBox}，管理一个单子节点（通过 adoptChild 添加）。
 * 在布局时将无限高度约束传给子节点，自身尺寸等于父约束的视口大小。
 * 在绘制和命中测试时根据当前 render snapshot 偏移子节点的 Y 坐标。
 *
 * @example
 * ```ts
 * const controller = new ScrollController();
 * const renderScrollable = new RenderScrollable(controller);
 * renderScrollable.adoptChild(childRenderBox);
 * renderScrollable.layout(viewportConstraints);
 * renderScrollable.paint(screen, 0, 0);
 * ```
 */
export class RenderScrollable extends RenderBox {
  /** 关联的滚动控制器 */
  private _scrollController: ScrollController;

  /** 滚动偏移变化回调（用于触发 markNeedsPaint） */
  private _onScrollChange: (() => void) | null = null;

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
   * @param scrollController - 滚动控制器实例
   * @param position - Viewport position ("top" or "bottom")
   */
  constructor(scrollController: ScrollController, position: "top" | "bottom" = "top") {
    super();
    this._scrollController = scrollController;
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
   * 设置新的滚动控制器。
   *
   * 自动从旧控制器移除监听器并将新控制器添加监听器。
   *
   * @param value - 新的 ScrollController
   */
  set scrollController(value: ScrollController) {
    if (this._scrollController === value) return;

    // 从旧控制器移除监听器
    if (this._onScrollChange !== null) {
      this._scrollController.removeListener(this._onScrollChange);
    }

    this._scrollController = value;

    // 向新控制器添加监听器
    if (this._onScrollChange !== null) {
      this._scrollController.addListener(this._onScrollChange);
    }

    this.markNeedsLayout();
  }

  /**
   * Set viewport position.
   *
   * @param value - "top" or "bottom"
   */
  set position(value: "top" | "bottom") {
    if (this._position === value) return;
    this._position = value;
    this.markNeedsLayout();
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
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 挂载到渲染树。
   *
   * 创建滚动偏移变化回调并注册到 ScrollController。
   */
  override attach(): void {
    super.attach();
    this._onScrollChange = () => {
      const nextOffset = this._scrollController.offset;
      if (this._scrollOffset === nextOffset) {
        return;
      }

      log.debug("syncScrollOffset", {
        reason: "listener",
        from: this._scrollOffset,
        to: nextOffset,
        position: this._position,
      });
      this._scrollOffset = nextOffset;
      this.markNeedsPaint();
    };
    this._scrollController.addListener(this._onScrollChange);
  }

  /**
   * 从渲染树卸载。
   *
   * 从 ScrollController 移除监听器。
   */
  override detach(): void {
    if (this._onScrollChange !== null) {
      this._scrollController.removeListener(this._onScrollChange);
      this._onScrollChange = null;
    }
    super.detach();
  }

  // ════════════════════════════════════════════════════
  //  布局
  // ════════════════════════════════════════════════════

  /**
   * 执行布局计算。
   *
   * 1. 将约束的 maxHeight 设为 Infinity（无限高度），传递给子节点
   * 2. 自身尺寸设为父约束的视口大小
   * 3. 更新 ScrollController 的 maxScrollExtent
   *
   * 威胁缓解 T-12.1-04: 如果子节点报告高度超过 MAX_CHILD_HEIGHT，
   * 则钳位到 MAX_CHILD_HEIGHT 并打印警告。
   */
  performLayout(): void {
    const constraints = this._constraints!;
    const childNeedsLayoutBefore = this.child?.needsLayout ?? false;
    const childNeedsPaintBefore = this.child?.needsPaint ?? false;
    const childHeightBeforeLayout = this.child?.size.height ?? 0;

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
    const shouldAutoScroll = this._scrollController.followMode && wasAtBottom && grewSinceLastLayout;

    log.debug("performLayout", {
      childHeight,
      childHeightBeforeLayout,
      childNeedsLayoutBefore,
      childNeedsPaintBefore,
      viewportHeight,
      oldExtent,
      newExtent,
      grewSinceLastLayout,
      offset: this._scrollController.offset,
      followMode: this._scrollController.followMode,
      shouldAutoScroll,
      wasAtBottom,
      position: this._position,
    });

    if (
      childNeedsLayoutBefore &&
      childHeightBeforeLayout === childHeight &&
      oldExtent === newExtent &&
      this._scrollOffset === this._scrollController.offset
    ) {
      log.debug("performLayout:stableRelayout", {
        position: this._position,
        offset: this._scrollController.offset,
        extent: newExtent,
        child: describeRenderNode(this.child),
      });
    }

    if (shouldAutoScroll) {
      log.debug("performLayout:autoScroll", { to: newExtent });
      this._scrollController.jumpTo(newExtent);
    } else if (this._scrollController.offset > newExtent) {
      log.debug("performLayout:clampOffset", { offset: this._scrollController.offset, newExtent });
      this._scrollController.jumpTo(newExtent);
    }

    const nextScrollOffset = this._scrollController.offset;
    if (this._scrollOffset !== nextScrollOffset) {
      log.debug("syncScrollOffset", {
        reason: "layout",
        from: this._scrollOffset,
        to: nextScrollOffset,
        position: this._position,
      });
      this._scrollOffset = nextScrollOffset;
    }

    // 逆向: amp v1T.handleBottomPositioning (chunk-006:4210)
    // When position="bottom" and content is shorter than viewport,
    // compute a negative paint offset to anchor content to the bottom edge.
    const nextBottomAnchorOffset =
      this._position === "bottom" && childHeight <= viewportHeight ? viewportHeight - childHeight : 0;
    if (this._bottomAnchorOffset !== nextBottomAnchorOffset) {
      log.debug("syncBottomAnchorOffset", {
        from: this._bottomAnchorOffset,
        to: nextBottomAnchorOffset,
        position: this._position,
      });
      this._bottomAnchorOffset = nextBottomAnchorOffset;
    }
  }

  // ════════════════════════════════════════════════════
  //  命中测试
  // ════════════════════════════════════════════════════

  /**
   * 命中测试 — 将点击坐标调整到当前 render snapshot 的 scrollOffset 后委托给子节点。
   *
   * paint() shifts child Y by (-scrollOffset + bottomAnchorOffset)。
   * hitTest 必须消费与 paint 相同的 snapshot，保证命中与屏幕内容一致。
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

    const scrollOffset = Math.floor(this._scrollOffset);
    const adjustedY = absY - scrollOffset + this._bottomAnchorOffset;
    this.child.hitTest(result, position, absX, adjustedY);

    return true;
  }

  // ════════════════════════════════════════════════════
  //  绘制
  // ════════════════════════════════════════════════════

  /**
   * 绘制可滚动视口。
   *
   * 将子节点绘制到 screen 上，Y 坐标减去当前 render snapshot 的滚动偏移量。
   * 使用 ClipScreen 裁剪到视口范围，防止内容泄漏到视口外。
   *
   * 逆向: g1T.paint (interactive_widgets.js:153-161)
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

    // 逆向: g1T.paint line 158 — 创建 ClipScreen 裁剪子节点绘制到视口范围内
    const clipScreen = new ClipScreen(
      screen,
      offsetX,
      offsetY,
      this._size.width,
      this._size.height,
    );

    // Apply bottom-anchor offset when content is shorter than viewport
    // 逆向: amp v1T.paint uses _scrollOffset which can be negative for bottom-stick
    this.child.paint(
      clipScreen as unknown as Screen,
      offsetX,
      offsetY - scrollOffset + bottomOffset,
    );
  }
}
