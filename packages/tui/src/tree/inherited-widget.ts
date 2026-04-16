/**
 * InheritedWidget — 上下文数据注入的核心 Widget。
 *
 * {@link InheritedWidget} 是 Flutter 上下文数据向下传递机制的核心。
 * 消费侧通过 `context.dependOnInheritedWidgetOfExactType(MyWidget)` 订阅数据变更，
 * 当数据变化时自动触发依赖方重建。
 *
 * 逆向参考: tui-widget-framework.js 中 Element.dependOnInheritedWidgetOfExactType
 *
 * @example
 * ```ts
 * class MyTheme extends InheritedWidget {
 *   readonly color: string;
 *   constructor(opts: { color: string; child: Widget }) {
 *     super({ child: opts.child });
 *     this.color = opts.color;
 *   }
 *   updateShouldNotify(old: MyTheme): boolean {
 *     return this.color !== old.color;
 *   }
 * }
 * ```
 *
 * @module
 */

import type { Element, Key, Widget } from "./element.js";
import { InheritedElement } from "./inherited-element.js";

/**
 * 上下文数据注入 Widget 抽象基类。
 *
 * 子类必须实现 {@link updateShouldNotify} 方法，
 * 返回数据是否变化以决定是否通知依赖方。
 */
export abstract class InheritedWidget implements Widget {
  /** 可选标识键 */
  readonly key: Key | undefined;

  /** 子 Widget */
  readonly child: Widget;

  /**
   * 创建 InheritedWidget 实例。
   *
   * @param opts - 配置项
   * @param opts.child - 子 Widget
   * @param opts.key - 可选标识键
   */
  constructor(opts: { child: Widget; key?: Key }) {
    this.child = opts.child;
    this.key = opts.key;
  }

  /**
   * 判断当前 Widget 是否能用另一个 Widget 更新。
   *
   * 协调规则: 构造函数相同且 key 相同时可更新。
   *
   * @param other - 待比较的另一个 Widget
   * @returns 可以更新时返回 true
   */
  canUpdate(other: Widget): boolean {
    return other.constructor === this.constructor && other.key === this.key;
  }

  /**
   * 创建与此 InheritedWidget 关联的 InheritedElement。
   *
   * @returns 新创建的 InheritedElement 实例
   */
  createElement(): Element {
    return new InheritedElement(this);
  }

  /**
   * 判断数据是否变化，需要通知依赖方。
   *
   * 子类必须实现此方法，比较新旧 Widget 的数据差异。
   *
   * @param oldWidget - 更新前的旧 Widget
   * @returns 数据变化时返回 true，依赖方将被通知重建
   */
  abstract updateShouldNotify(oldWidget: InheritedWidget): boolean;
}
