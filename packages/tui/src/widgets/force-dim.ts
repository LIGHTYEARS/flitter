/**
 * ForceDim InheritedWidget — 向子树传播 dim 状态。
 *
 * 逆向: CA extends Ve (misc_utils.js:91-114)
 *
 * 当 `forceDim: true` 时，子树中的 Container（以及其他支持 dim 的 Widget）
 * 会在绘制时应用 dim 样式。消费侧通过 `ForceDimWidget.shouldForceDim(ctx)`
 * 查询最近祖先的 forceDim 状态。
 *
 * @module
 */

import type { Element, Key, Widget } from "../tree/element.js";
import { InheritedWidget } from "../tree/inherited-widget.js";

/**
 * ForceDim InheritedWidget。
 *
 * 逆向: CA class — holds `forceDim` boolean, provides `maybeOf`/`shouldForceDim` statics.
 */
export class ForceDimWidget extends InheritedWidget {
  /** 逆向: CA.forceDim */
  readonly forceDim: boolean;

  /**
   * 创建 ForceDimWidget 实例。
   *
   * 逆向: CA constructor({ key, forceDim, child })
   */
  constructor(opts: { forceDim: boolean; child: Widget; key?: Key }) {
    super({ child: opts.child, key: opts.key });
    this.forceDim = opts.forceDim;
  }

  /**
   * 查找最近的 ForceDimWidget 祖先。
   *
   * 逆向: CA.maybeOf(T) — returns the ForceDimWidget or null.
   *
   * @param context - 元素上下文（Element）
   * @returns 最近的 ForceDimWidget 实例，未找到时返回 null
   */
  static maybeOf(context: Element): ForceDimWidget | null {
    const element = context.dependOnInheritedWidgetOfExactType(ForceDimWidget);
    if (element) return element.widget as ForceDimWidget;
    return null;
  }

  /**
   * 查询当前上下文是否应强制 dim。
   *
   * 逆向: CA.shouldForceDim(T) — returns CA.maybeOf(T)?.forceDim ?? false
   *
   * @param context - 元素上下文（Element）
   * @returns 是否应强制 dim
   */
  static shouldForceDim(context: Element): boolean {
    return ForceDimWidget.maybeOf(context)?.forceDim ?? false;
  }

  /**
   * 判断数据是否变化，需要通知依赖方。
   *
   * 逆向: CA.updateShouldNotify(T) — returns this.forceDim !== T.forceDim
   */
  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.forceDim !== (oldWidget as ForceDimWidget).forceDim;
  }
}
