/**
 * InheritedWidget --- 上下文数据注入的核心 Widget。
 *
 * InheritedWidget 扩展 Widget 接口，新增 child 属性和 updateShouldNotify(oldWidget)
 * 抽象方法。消费侧通过 element.dependOnInheritedWidgetOfExactType(MyWidget) 订阅数据变更。
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

import type { Element, Widget } from "./element.js";
import { InheritedElement } from "./inherited-element.js";
import type { Key } from "./widget.js";

// ════════════════════════════════════════════════════
//  InheritedWidget 抽象基类
// ════════════════════════════════════════════════════

/**
 * InheritedWidget 抽象基类。
 *
 * 继承 Widget 接口，提供数据向下传递机制。子类须实现 {@link updateShouldNotify}
 * 方法，框架在 Widget 更新时通过该方法判断是否需要通知依赖方重建。
 *
 * @see InheritedElement
 */
export abstract class InheritedWidget implements Widget {
  /** 可选标识键 */
  readonly key: Key | undefined;

  /** 子 Widget，InheritedWidget 为单子节点模式 */
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
   * 判断当前 Widget 是否能用 other 更新。
   *
   * 协调规则: 类型相同且 key 相同时可更新。
   *
   * @param other - 待比较的另一个 Widget
   * @returns 可更新时返回 true
   */
  canUpdate(other: Widget): boolean {
    if (this.constructor !== other.constructor) return false;
    if (this.key !== undefined && other.key !== undefined) {
      if ("equals" in this.key && typeof this.key.equals === "function") {
        return this.key.equals(other.key as Key);
      }
      return this.key === other.key;
    }
    if (this.key === undefined && other.key === undefined) return true;
    return false;
  }

  /**
   * 创建与此 InheritedWidget 关联的 {@link InheritedElement}。
   *
   * @returns 新创建的 InheritedElement 实例
   */
  createElement(): Element {
    return new InheritedElement(this);
  }

  /**
   * 判断数据变更时是否需要通知依赖方重建。
   *
   * 子类必须实现此方法。当新旧 Widget 数据不同时返回 true，
   * 框架将对所有 dependents 调用 markNeedsRebuild()。
   *
   * @param oldWidget - 更新前的旧 Widget 实例
   * @returns 需要通知时返回 true
   */
  abstract updateShouldNotify(oldWidget: InheritedWidget): boolean;
}
