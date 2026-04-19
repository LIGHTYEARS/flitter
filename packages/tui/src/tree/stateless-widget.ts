/**
 * 无状态 Widget 与 Element 定义。
 *
 * {@link StatelessWidget} 是无状态 Widget 的抽象基类，
 * 其 {@link StatelessWidget.build | build} 方法接收 {@link BuildContext}
 * 并返回子 Widget。
 *
 * {@link StatelessElement} 是与 StatelessWidget 配套的元素，
 * 在 {@link StatelessElement.build | build} 中委托给关联 Widget 的 build 方法。
 *
 * @module
 */

import { ComponentElement } from "./component-element.js";
import type { Element, Widget as WidgetInterface } from "./element.js";
import type { RenderObject } from "./render-object.js";
import { Widget } from "./widget.js";

// ════════════════════════════════════════════════════
//  BuildContext 接口
// ════════════════════════════════════════════════════

/**
 * 构建上下文接口。
 *
 * 目前 {@link Element} 自身充当 BuildContext，提供对当前 Widget
 * 和渲染对象的访问能力。
 */
export interface BuildContext {
  /** 当前关联的 Widget。 */
  readonly widget: WidgetInterface;
  /** 查找最近的渲染对象。 */
  findRenderObject(): RenderObject | undefined;
  /** 向上查找指定类型的祖先 State。 */
  findAncestorStateOfType<T>(type: new (...args: unknown[]) => T): T | null;
}

// ════════════════════════════════════════════════════
//  StatelessWidget 抽象基类
// ════════════════════════════════════════════════════

/**
 * 无状态 Widget 抽象基类。
 *
 * 子类必须实现 {@link build} 方法，根据给定的 {@link BuildContext}
 * 返回要渲染的子 Widget。
 */
export abstract class StatelessWidget extends Widget {
  /**
   * 构建子 Widget。
   *
   * @param context - 构建上下文，提供对树的访问能力
   * @returns 子 Widget 实例
   */
  abstract build(context: BuildContext): WidgetInterface;

  /**
   * 创建与此 StatelessWidget 关联的元素。
   *
   * @returns 新创建的 {@link StatelessElement} 实例
   */
  createElement(): Element {
    return new StatelessElement(this);
  }
}

// ════════════════════════════════════════════════════
//  StatelessElement
// ════════════════════════════════════════════════════

/**
 * 无状态元素。
 *
 * 在 {@link build} 中委托给关联的 {@link StatelessWidget.build} 方法，
 * 将自身（Element）作为 {@link BuildContext} 传入。
 */
export class StatelessElement extends ComponentElement {
  /**
   * 构建子 Widget。
   *
   * 委托给关联的 StatelessWidget 的 build 方法，
   * 将自身作为 BuildContext 传入。
   *
   * @returns 子 Widget 实例
   */
  build(): WidgetInterface {
    return (this.widget as StatelessWidget).build(this as unknown as BuildContext);
  }
  // NOTE: update() is inherited from ComponentElement, which calls
  // super.update(newWidget) → performRebuild(). No override needed.
  // 逆向: amp R1T.update (chunk-006.js:428) — super.update(T), rebuild()
}
