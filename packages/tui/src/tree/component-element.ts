/**
 * 组合型元素基类。
 *
 * {@link ComponentElement} 继承 {@link Element}，通过 {@link build} 方法
 * 将一个 Widget 转换为子 Element，并在 {@link performRebuild} 中实现
 * 协调算法（reconciliation）以决定复用或重建子元素。
 *
 * @module
 */

import type { Widget } from "./element.js";
import { Element } from "./element.js";

// ════════════════════════════════════════════════════
//  ComponentElement 抽象基类
// ════════════════════════════════════════════════════

/**
 * 组合型元素抽象基类。
 *
 * 子类必须实现 {@link build} 方法，返回一个子 Widget。
 * {@link performRebuild} 中会调用 {@link build} 获取新的子 Widget，
 * 并通过 {@link updateChild} 协调算法决定是复用、替换还是移除子元素。
 */
export abstract class ComponentElement extends Element {
  /** 当前子元素引用 */
  protected _child: Element | undefined = undefined;

  /**
   * 构建子 Widget。
   *
   * 子类必须实现此方法，返回当前组件要渲染的子 Widget。
   *
   * @returns 子 Widget 实例
   */
  abstract build(): Widget;

  /**
   * 执行重新构建。
   *
   * 1. 调用父类 performRebuild 清除脏标记
   * 2. 调用 build() 获取新的子 Widget
   * 3. 通过 updateChild 协调算法更新子元素
   */
  override performRebuild(): void {
    super.performRebuild();
    const newWidget = this.build();
    this._child = this.updateChild(this._child, newWidget);
  }

  /**
   * 协调算法：更新子元素。
   *
   * 根据新旧 Widget 的关系决定复用、替换或移除子元素：
   * 1. newWidget 为 undefined 时，卸载并移除旧子元素
   * 2. 旧子元素存在且 canUpdate 返回 true 时，复用并更新
   * 3. 否则卸载旧子元素，为新 Widget 创建并挂载新子元素
   *
   * @param child - 当前子元素，可能为 undefined
   * @param newWidget - 新的子 Widget，可能为 undefined
   * @returns 更新后的子元素，可能为 undefined
   */
  updateChild(child: Element | undefined, newWidget: Widget | undefined): Element | undefined {
    // 1. 新 Widget 为 undefined → 移除旧子元素
    if (newWidget === undefined) {
      if (child !== undefined) {
        child.unmount();
        this.removeChild(child);
      }
      return undefined;
    }

    // 2. 旧子元素存在且可更新 → 复用
    if (child?.widget.canUpdate(newWidget)) {
      child.update(newWidget);
      return child;
    }

    // 3. 不可复用 → 卸载旧子元素，创建新子元素
    if (child !== undefined) {
      child.unmount();
      this.removeChild(child);
    }

    const newElement = newWidget.createElement();
    newElement.mount(this);
    this.addChild(newElement);
    return newElement;
  }

  /**
   * 挂载到元素树。
   *
   * 调用父类 mount 后立即执行首次构建。
   *
   * @param parent - 父元素，根节点为 undefined
   */
  override mount(parent?: Element): void {
    super.mount(parent);
    this.performRebuild();
  }

  /**
   * 从元素树卸载。
   *
   * 先递归卸载并移除子元素，然后调用父类 unmount。
   */
  override unmount(): void {
    if (this._child !== undefined) {
      this._child.unmount();
      this.removeChild(this._child);
      this._child = undefined;
    }
    super.unmount();
  }
}
