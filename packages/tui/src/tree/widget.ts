/**
 * Widget / Key / GlobalKey 核心定义。
 *
 * {@link Key} 用于标识 Widget 的键，支持值比较。
 * {@link GlobalKey} 扩展 Key，提供全局元素引用能力。
 * {@link Widget} 是所有 Widget 的抽象基类，定义 canUpdate 协调逻辑
 * 和 createElement 工厂方法。
 *
 * @module
 */

import type { Element } from "./element.js";

// ════════════════════════════════════════════════════
//  Key
// ════════════════════════════════════════════════════

/**
 * Widget 标识键。
 *
 * 通过 {@link value} 进行严格相等（===）比较来判断两个 Key 是否等价。
 */
export class Key {
  /** 键值，可以是字符串或数字。 */
  readonly value: string | number;

  /**
   * 创建 Key 实例。
   *
   * @param value - 键值
   */
  constructor(value: string | number) {
    this.value = value;
  }

  /**
   * 判断两个 Key 是否相等（严格相等比较）。
   *
   * @param other - 待比较的另一个 Key
   * @returns 值相等时返回 true，否则返回 false
   */
  equals(other: Key): boolean {
    return this.value === other.value;
  }
}

// ════════════════════════════════════════════════════
//  GlobalKey
// ════════════════════════════════════════════════════

/**
 * 全局键，继承自 {@link Key}。
 *
 * 除了标识 Widget 外，还提供对关联 {@link Element} 的全局引用能力。
 * 在 StatefulElement 实现后将扩展 {@link currentState} 以返回关联状态。
 */
export class GlobalKey extends Key {
  /** 当前关联的元素引用。 */
  private _element: Element | undefined = undefined;

  /**
   * 注册元素引用。
   *
   * @param element - 关联的元素实例
   */
  _setElement(element: Element): void {
    this._element = element;
  }

  /**
   * 清除元素引用。
   */
  _clearElement(): void {
    this._element = undefined;
  }

  /**
   * 获取当前关联的元素。
   *
   * @returns 关联的元素实例，未注册时返回 undefined
   */
  get currentElement(): Element | undefined {
    return this._element;
  }

  /**
   * 获取当前关联的状态。
   *
   * 如果关联的元素是 StatefulElement，返回其 State 实例；
   * 否则返回 undefined。
   *
   * @returns 当前状态，非 StatefulElement 时为 undefined
   */
  get currentState(): unknown {
    if (this._element && "state" in this._element) {
      return (this._element as any).state;
    }
    return undefined;
  }
}

// ════════════════════════════════════════════════════
//  Widget
// ════════════════════════════════════════════════════

/**
 * Widget 抽象基类。
 *
 * 所有 Widget 必须实现 {@link createElement} 工厂方法。
 * {@link canUpdate} 方法用于协调阶段判断是否可以用新 Widget 更新已有元素。
 */
export abstract class Widget {
  /** 可选标识键，用于协调算法中的同一性判断。 */
  readonly key: Key | undefined;

  /**
   * 创建 Widget 实例。
   *
   * @param options - 可选配置
   * @param options.key - 可选标识键
   */
  constructor(options?: { key?: Key }) {
    this.key = options?.key;
  }

  /**
   * 判断当前 Widget 是否能用另一个 Widget 更新。
   *
   * 协调规则：
   * 1. 类型（构造函数）必须相同，否则返回 false
   * 2. 双方都有 key 时，使用 key.equals 比较
   * 3. 双方都没有 key 时，返回 true
   * 4. 一方有 key 另一方没有时，返回 false
   *
   * @param other - 待比较的另一个 Widget
   * @returns 可以更新时返回 true，否则返回 false
   */
  canUpdate(other: Widget): boolean {
    // 1. 类型（构造函数）必须相同
    if (this.constructor !== other.constructor) return false;

    // 2. 双方都有 key → 使用 equals 比较
    if (this.key !== undefined && other.key !== undefined) {
      return this.key.equals(other.key);
    }

    // 3. 双方都没有 key → true
    if (this.key === undefined && other.key === undefined) return true;

    // 4. 一方有 key 另一方没有 → false
    return false;
  }

  /**
   * 创建与此 Widget 关联的元素。
   *
   * 子类必须实现此方法以返回对应的 {@link Element} 实例。
   *
   * @returns 新创建的元素实例
   */
  abstract createElement(): Element;
}
