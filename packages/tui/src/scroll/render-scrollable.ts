/**
 * 滚动视口渲染对象。
 *
 * {@link RenderScrollable} 是 {@link RenderBox} 的子类，作为可滚动视口的
 * 渲染层核心。在 layout 阶段将无限高度约束传递给子节点，在 paint 阶段
 * 根据 {@link ScrollController.offset} 应用滚动偏移并裁剪到视口范围。
 *
 * 对应逆向工程中的滚动视口渲染实现。
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import type { ScrollController } from "./scroll-controller.js";

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
 * 在绘制时根据 ScrollController 的 offset 偏移子节点的 Y 坐标。
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

  /**
   * 创建可滚动视口渲染对象。
   *
   * @param scrollController - 滚动控制器实例
   */
  constructor(scrollController: ScrollController) {
    super();
    this._scrollController = scrollController;
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
    this._onScrollChange = () => this.markNeedsPaint();
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
    this._scrollController.updateMaxScrollExtent(
      Math.max(0, childHeight - viewportHeight),
    );
  }

  // ════════════════════════════════════════════════════
  //  绘制
  // ════════════════════════════════════════════════════

  /**
   * 绘制可滚动视口。
   *
   * 将子节点绘制到 screen 上，Y 坐标减去滚动偏移量。
   * Screen 的边界检查自然处理视口裁剪。
   *
   * @param screen - 目标屏幕
   * @param offsetX - 全局 X 偏移量
   * @param offsetY - 全局 Y 偏移量
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this._needsPaint = false;

    if (!this.child) return;

    const scrollOffset = Math.floor(this._scrollController.offset);
    this.child.paint(screen, offsetX, offsetY - scrollOffset);
  }
}
