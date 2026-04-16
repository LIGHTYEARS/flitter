/**
 * 可滚动视口 Widget。
 *
 * {@link Scrollable} 是一个 SingleChild RenderObject Widget，配合
 * {@link ScrollController} 和 {@link RenderScrollable} 为子 Widget 提供
 * 垂直滚动能力。当子内容高度超过视口高度时，在 layout 阶段自动计算
 * maxScrollExtent，在 paint 阶段应用 offset 裁剪。
 *
 * 对应逆向工程中的可滚动容器实现。
 *
 * @module
 */

import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "../widgets/padding.js";
import { RenderScrollable } from "./render-scrollable.js";
import type { ScrollController } from "./scroll-controller.js";

// ════════════════════════════════════════════════════
//  Scrollable Widget
// ════════════════════════════════════════════════════

/** Scrollable 构造函数参数。 */
interface ScrollableArgs {
  /** 可选标识键。 */
  key?: Key;
  /** 滚动控制器（必需）。 */
  controller: ScrollController;
  /** 可选子 Widget。 */
  child?: WidgetInterface;
}

/**
 * 可滚动视口 Widget。
 *
 * 将子 Widget 包装在 {@link RenderScrollable} 中，提供垂直滚动能力。
 * 通过 {@link ScrollController} 控制滚动位置。
 *
 * @example
 * ```ts
 * const controller = new ScrollController();
 * const scrollable = new Scrollable({
 *   controller,
 *   child: new Column({ children: [...] }),
 * });
 * ```
 */
export class Scrollable extends Widget implements RenderObjectWidget {
  /** 滚动控制器。 */
  readonly scrollController: ScrollController;

  /** 子 Widget。 */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建可滚动视口 Widget。
   *
   * @param args - 配置参数
   */
  constructor(args: ScrollableArgs) {
    super({ key: args.key });
    this.scrollController = args.controller;
    this.child = args.child;
  }

  /**
   * 创建关联的元素。
   *
   * @returns 新的 SingleChildRenderObjectElement 实例
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * @returns 新的 RenderScrollable 实例
   */
  createRenderObject(): RenderObject {
    return new RenderScrollable(this.scrollController);
  }

  /**
   * 用当前 Widget 配置更新已有的渲染对象。
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderScrollable).scrollController = this.scrollController;
  }

  /**
   * 计算 maxScrollExtent（静态辅助方法，保留向后兼容）。
   *
   * @param childHeight - 子内容总高度
   * @param viewportHeight - 视口高度
   * @returns maxScrollExtent，不小于 0
   */
  static computeMaxScrollExtent(childHeight: number, viewportHeight: number): number {
    return Math.max(0, childHeight - viewportHeight);
  }
}
