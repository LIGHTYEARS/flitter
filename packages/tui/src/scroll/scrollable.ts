/**
 * 可滚动容器 Widget。
 *
 * {@link Scrollable} 是一个 StatefulWidget 子类，配合 {@link ScrollController}
 * 为子 Widget 提供垂直滚动能力。当子内容高度超过视口高度时，
 * 在 layout 阶段自动计算 maxScrollExtent，在 paint 阶段应用 offset 裁剪。
 *
 * 对应逆向工程中的可滚动容器实现。
 *
 * @module
 */

import type { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  Scrollable Props
// ════════════════════════════════════════════════════

/**
 * Scrollable 构造选项。
 */
export interface ScrollableProps {
  /** 外部提供的滚动控制器。未提供时由 State 内部自动创建。 */
  controller?: ScrollController;
}

// ════════════════════════════════════════════════════
//  Scrollable Widget
// ════════════════════════════════════════════════════

/**
 * 可滚动容器 Widget。
 *
 * 提供垂直滚动能力。当子内容超出视口时，自动计算 maxScrollExtent
 * 并通过 controller.offset 裁剪子内容的可见区域。
 *
 * 生命周期：
 * - 如果外部提供 controller，Scrollable 仅使用不拥有
 * - 如果未提供 controller，State 内部自动创建并在 dispose 时释放
 *
 * @example
 * ```ts
 * const controller = new ScrollController();
 * const scrollable = new Scrollable({ controller });
 * // ... 使用 scrollable ...
 * controller.dispose();
 * ```
 */
export class Scrollable {
  /** 外部提供的滚动控制器 */
  private _controller: ScrollController | undefined;

  /**
   * 创建可滚动容器。
   *
   * @param props - 构造选项
   */
  constructor(props: ScrollableProps) {
    this._controller = props.controller;
  }

  /**
   * 获取关联的滚动控制器。
   *
   * 如果外部提供了 controller 则返回它，否则返回 undefined
   * （实际的内部 controller 由 State 在 initState 时创建）。
   *
   * @returns 滚动控制器或 undefined
   */
  get controller(): ScrollController | undefined {
    return this._controller;
  }

  /**
   * 计算 maxScrollExtent。
   *
   * @param childHeight - 子内容总高度
   * @param viewportHeight - 视口高度
   * @returns maxScrollExtent，不小于 0
   */
  static computeMaxScrollExtent(
    childHeight: number,
    viewportHeight: number
  ): number {
    return Math.max(0, childHeight - viewportHeight);
  }
}
