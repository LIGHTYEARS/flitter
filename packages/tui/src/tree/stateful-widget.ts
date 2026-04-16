/**
 * 有状态 Widget、State 与 Element 定义。
 *
 * {@link StatefulWidget} 是有状态 Widget 的抽象基类，通过
 * {@link StatefulWidget.createState | createState} 工厂方法创建关联的
 * {@link State} 实例。
 *
 * {@link State} 管理可变状态与生命周期（initState / didUpdateWidget / dispose），
 * 通过 {@link State.setState | setState} 触发重建。
 *
 * {@link StatefulElement} 是与 StatefulWidget 配套的元素，
 * 负责协调 State 的生命周期与 Widget 更新。
 *
 * @module
 */

import { ComponentElement } from "./component-element.js";
import type { Element, Widget as WidgetInterface } from "./element.js";
import type { BuildContext } from "./stateless-widget.js";
import { Widget } from "./widget.js";

// ════════════════════════════════════════════════════
//  State 抽象基类
// ════════════════════════════════════════════════════

/**
 * 有状态 Widget 的状态抽象基类。
 *
 * 管理与 {@link StatefulWidget} 关联的可变状态。子类必须实现
 * {@link build} 方法，可选覆盖 {@link initState}、{@link didUpdateWidget}、
 * {@link dispose} 等生命周期回调。
 *
 * @typeParam T - 关联的 StatefulWidget 类型
 */
export abstract class State<T extends StatefulWidget = StatefulWidget> {
  /** @internal 当前关联的 Widget */
  _widget!: T;

  /** @internal 关联的 StatefulElement */
  _element: StatefulElement | undefined = undefined;

  /** @internal 是否已挂载 */
  _mounted: boolean = false;

  /**
   * 获取当前关联的 Widget。
   *
   * @returns 当前 Widget 实例
   */
  get widget(): T {
    return this._widget;
  }

  /**
   * 获取构建上下文。
   *
   * @returns 关联的 Element 作为 BuildContext
   */
  get context(): BuildContext {
    return this._element! as unknown as BuildContext;
  }

  /**
   * 是否已挂载到元素树。
   *
   * @returns 已挂载时返回 true
   */
  get mounted(): boolean {
    return this._mounted;
  }

  /**
   * 初始化状态。
   *
   * 首次挂载时调用，此时 {@link widget} 和 {@link context} 已可用。
   * 子类可覆盖此方法以执行一次性初始化。
   */
  initState(): void {}

  /**
   * Widget 配置变化时调用。
   *
   * 当父元素用新 Widget 更新当前元素时触发。
   * 子类可覆盖此方法以响应配置变化。
   *
   * @param oldWidget - 更新前的旧 Widget
   */
  didUpdateWidget(_oldWidget: T): void {}

  /**
   * 清理资源。
   *
   * 元素卸载时调用。子类可覆盖此方法以释放资源。
   */
  dispose(): void {}

  /**
   * 请求重建。
   *
   * 如果传入回调 fn，先同步执行 fn()。
   * 然后标记关联的 Element 需要重建。
   *
   * @param fn - 可选的状态修改回调，在标记重建前同步执行
   * @throws 如果已 dispose（mounted = false）则抛出错误
   */
  setState(fn?: () => void): void {
    if (!this._mounted) {
      throw new Error("setState called after dispose");
    }
    if (fn) {
      fn();
    }
    this._element!.markNeedsRebuild();
  }

  /**
   * 构建子 Widget。
   *
   * 子类必须实现此方法，根据当前状态和构建上下文返回要渲染的子 Widget。
   *
   * @param context - 构建上下文
   * @returns 子 Widget 实例
   */
  abstract build(context: BuildContext): WidgetInterface;

  /**
   * @internal 挂载：设置 widget、element、mounted 标记。
   *
   * @param widget - 关联的 Widget
   * @param element - 关联的 StatefulElement
   */
  _mount(widget: T, element: StatefulElement): void {
    this._widget = widget;
    this._element = element;
    this._mounted = true;
  }

  /**
   * @internal 更新：保存旧 widget，设置新 widget，调用 didUpdateWidget。
   *
   * @param newWidget - 新的 Widget 实例
   */
  _update(newWidget: T): void {
    const oldWidget = this._widget;
    this._widget = newWidget;
    this.didUpdateWidget(oldWidget);
  }

  /**
   * @internal 卸载：调用 dispose，设置 mounted 为 false。
   */
  _unmount(): void {
    this.dispose();
    this._mounted = false;
  }
}

// ════════════════════════════════════════════════════
//  StatefulWidget 抽象基类
// ════════════════════════════════════════════════════

/**
 * 有状态 Widget 抽象基类。
 *
 * 子类必须实现 {@link createState} 工厂方法，返回与此 Widget
 * 关联的 {@link State} 实例。
 */
export abstract class StatefulWidget extends Widget {
  /**
   * 创建与此 Widget 关联的状态对象。
   *
   * 每次调用应返回新的 State 实例。
   *
   * @returns 新创建的 State 实例
   */
  abstract createState(): State;

  /**
   * 创建与此 StatefulWidget 关联的元素。
   *
   * @returns 新创建的 {@link StatefulElement} 实例
   */
  createElement(): Element {
    return new StatefulElement(this);
  }
}

// ════════════════════════════════════════════════════
//  StatefulElement
// ════════════════════════════════════════════════════

/**
 * 有状态元素。
 *
 * 负责管理 {@link State} 的完整生命周期：创建、初始化、更新与销毁。
 * 在 {@link mount} 时创建 State 并调用 initState，
 * 在 {@link update} 时通知 State 配置变化，
 * 在 {@link unmount} 时调用 State 的 dispose。
 */
export class StatefulElement extends ComponentElement {
  /** 关联的状态对象 */
  _state!: State;

  /**
   * 获取当前关联的状态对象。
   *
   * @returns State 实例
   */
  get state(): State {
    return this._state;
  }

  /**
   * 挂载到元素树。
   *
   * 创建 State、执行内部挂载、调用 initState，然后调用父类 mount
   * 触发首次构建。
   *
   * @param parent - 父元素，根节点为 undefined
   */
  override mount(parent?: Element): void {
    this._state = (this.widget as StatefulWidget).createState();
    this._state._mount(this.widget as StatefulWidget, this);
    this._state.initState();
    super.mount(parent);
  }

  /**
   * 构建子 Widget。
   *
   * 委托给关联的 State 的 build 方法，将自身作为 BuildContext 传入。
   *
   * @returns 子 Widget 实例
   */
  build(): WidgetInterface {
    return this._state.build(this as unknown as BuildContext);
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * 逆向: amp sXT.update (chunk-005.js:164292)
   * amp: super.update(T), state._update(statefulWidget), rebuild()
   *
   * 先通知 State 配置变化（didUpdateWidget），然后调用父类 update
   * 更新 Widget 引用并触发 performRebuild()。
   *
   * @param newWidget - 新的 Widget 实例
   */
  override update(newWidget: WidgetInterface): void {
    this._state._update(newWidget as StatefulWidget);
    super.update(newWidget);
    // super.update() = ComponentElement.update() which calls performRebuild()
  }

  /**
   * 从元素树卸载。
   *
   * 先卸载 State（调用 dispose），然后调用父类 unmount
   * 清理子元素和挂载状态。
   */
  override unmount(): void {
    this._state._unmount();
    super.unmount();
  }
}
