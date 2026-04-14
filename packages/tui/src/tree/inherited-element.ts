/**
 * InheritedElement --- 维护 dependent 集合，数据变更时通知依赖方。
 *
 * InheritedElement 扩展 Element，维护 _dependents: Set<Element> 和
 * addDependent/removeDependent 方法。当 InheritedWidget 更新且
 * updateShouldNotify 返回 true 时，对所有 dependents 调用 markNeedsRebuild()。
 *
 * 逆向参考: tui-widget-framework.js addDependent/removeDependent
 *
 * @module
 */

import { Element } from "./element.js";
import type { Widget } from "./element.js";
import type { InheritedWidget } from "./inherited-widget.js";

// ════════════════════════════════════════════════════
//  InheritedElement
// ════════════════════════════════════════════════════

/**
 * InheritedElement --- 与 InheritedWidget 配套的元素。
 *
 * 维护 dependent 集合，在数据变更时自动通知所有依赖方重建。
 * 实现单子节点模式: mount 时自动创建并挂载 child Widget 的 Element。
 */
export class InheritedElement extends Element {
  /** 依赖本 InheritedElement 的元素集合 */
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
   * @returns InheritedWidget 实例
   */
  override get widget(): InheritedWidget {
    return super.widget as InheritedWidget;
  }

  /**
   * 添加依赖元素。
   *
   * 当消费方通过 dependOnInheritedWidgetOfExactType 注册依赖时调用。
   *
   * @param dependent - 依赖本 InheritedElement 的元素
   */
  addDependent(dependent: Element): void {
    this._dependents.add(dependent);
  }

  /**
   * 移除依赖元素。
   *
   * 当消费方 unmount 或不再需要依赖时调用。
   *
   * @param dependent - 要移除的依赖元素
   */
  removeDependent(dependent: Element): void {
    this._dependents.delete(dependent);
  }

  /**
   * 获取当前依赖元素数量（仅测试用途）。
   *
   * @returns 依赖元素数量
   */
  get dependentCount(): number {
    return this._dependents.size;
  }

  /**
   * 挂载到元素树。
   *
   * 调用父类 mount 后，自动创建并挂载 child Widget 的 Element（单子节点模式）。
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
   * 1. 保存旧 Widget 引用
   * 2. 调用父类 update 替换 Widget
   * 3. 检查 updateShouldNotify --- 若 true 则通知所有 dependents
   * 4. 更新子 Widget（如果子 Element 存在且 canUpdate 返回 true）
   *
   * @param newWidget - 新的 InheritedWidget 实例
   */
  override update(newWidget: Widget): void {
    const oldWidget = this.widget;
    super.update(newWidget);
    if ((newWidget as InheritedWidget).updateShouldNotify(oldWidget)) {
      this._notifyDependents();
    }
    // 更新子 Widget
    if (this.children.length > 0) {
      const child = this.children[0]!;
      const newChild = (newWidget as InheritedWidget).child;
      if (child.widget.canUpdate(newChild)) {
        child.update(newChild);
      }
    }
  }

  /**
   * 执行重新构建。
   *
   * 委托给父类清除脏标记。
   */
  override performRebuild(): void {
    super.performRebuild();
  }

  /**
   * 通知所有依赖方需要重建。
   *
   * 遍历 _dependents 集合，对每个元素调用 markNeedsRebuild()。
   */
  private _notifyDependents(): void {
    for (const dependent of this._dependents) {
      dependent.markNeedsRebuild();
    }
  }
}
