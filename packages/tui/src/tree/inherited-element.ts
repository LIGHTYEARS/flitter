/**
 * InheritedElement — 维护 dependent 集合，数据变更时通知依赖方。
 *
 * {@link InheritedElement} 是 {@link InheritedWidget} 对应的元素节点。
 * 管理依赖方（dependent）集合，当 {@link InheritedWidget.updateShouldNotify}
 * 返回 true 时，通知所有依赖方调用 markNeedsRebuild 触发重建。
 *
 * 逆向参考: tui-widget-framework.js addDependent/removeDependent
 *
 * @module
 */

import { Element } from "./element.js";
import type { InheritedWidget } from "./inherited-widget.js";

/**
 * InheritedWidget 的元素实现。
 *
 * 维护 _dependents 集合，提供 {@link addDependent} / {@link removeDependent}
 * 方法供 Element.dependOnInheritedWidgetOfExactType 注册/注销依赖。
 * 在 {@link update} 时检查 updateShouldNotify，若 true 则通知所有依赖方。
 */
export class InheritedElement extends Element {
  /** 依赖方集合 */
  private _dependents: Set<Element> = new Set();

  /**
   * 创建 InheritedElement 实例。
   *
   * @param widget - 关联的 InheritedWidget
   */
  constructor(widget: InheritedWidget) {
    super(widget);
  }

  /**
   * 获取关联的 InheritedWidget。
   *
   * @returns 当前关联的 InheritedWidget 实例
   */
  override get widget(): InheritedWidget {
    return super.widget as InheritedWidget;
  }

  /**
   * 添加依赖方元素。
   *
   * 当 Element 调用 dependOnInheritedWidgetOfExactType 时注册。
   *
   * @param dependent - 依赖方元素
   */
  addDependent(dependent: Element): void {
    this._dependents.add(dependent);
  }

  /**
   * 移除依赖方元素。
   *
   * 当依赖方 unmount 时调用，取消依赖关系。
   *
   * @param dependent - 待移除的依赖方元素
   */
  removeDependent(dependent: Element): void {
    this._dependents.delete(dependent);
  }

  /**
   * 挂载到元素树。
   *
   * 调用父类 mount 后，自动创建并挂载子 Widget 对应的元素。
   *
   * @param parent - 父元素，根节点为 undefined
   */
  override mount(parent?: Element): void {
    super.mount(parent);
    const childElement = this.widget.child.createElement();
    this.addChild(childElement);
    childElement.mount(this);
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * 保存旧 Widget，更新为新 Widget 后检查 updateShouldNotify。
   * 若返回 true，通知所有依赖方重建。同时更新子 Widget。
   *
   * @param newWidget - 新的 InheritedWidget 实例
   */
  override update(newWidget: InheritedWidget): void {
    const oldWidget = this.widget;
    super.update(newWidget);
    if (newWidget.updateShouldNotify(oldWidget)) {
      this._notifyDependents();
    }
    // 更新子 Widget
    if (this.children.length > 0) {
      const child = this.children[0]!;
      if (child.widget.canUpdate(newWidget.child)) {
        child.update(newWidget.child);
      }
    }
  }

  /**
   * 执行重新构建。
   *
   * 委托给父类处理。
   */
  override performRebuild(): void {
    super.performRebuild();
  }

  /**
   * 通知所有依赖方需要重建。
   *
   * 遍历 _dependents 集合，逐一调用 markNeedsRebuild。
   */
  private _notifyDependents(): void {
    for (const dependent of this._dependents) {
      dependent.markNeedsRebuild();
    }
  }
}
