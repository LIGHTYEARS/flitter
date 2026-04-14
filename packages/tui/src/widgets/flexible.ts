/**
 * Flexible / Expanded Widget。
 *
 * {@link Flexible} 作为 ParentDataWidget，包裹一个子 Widget 并为其设置
 * 弹性因子（flex）和适配方式（fit），在被 Row / Column 的
 * {@link MultiChildRenderObjectElement} 挂载后，自动将这些属性写入
 * 子渲染对象的 {@link FlexParentData}。
 *
 * {@link Expanded} 是 Flexible 的快捷子类，强制 fit 为 "tight"。
 *
 * @module
 */

import type { Element } from "../tree/element.js";
import type { RenderObject } from "../tree/render-object.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import type { FlexFit } from "./flex.js";
import { FlexParentData } from "./flex.js";

// ════════════════════════════════════════════════════
//  Flexible
// ════════════════════════════════════════════════════

/** Flexible 构造函数参数。 */
interface FlexibleArgs {
  /** 可选标识键。 */
  key?: Key;
  /** 被包裹的子 Widget。 */
  child: Widget;
  /** 弹性因子，默认 1。 */
  flex?: number;
  /** 弹性适配方式，默认 "loose"。 */
  fit?: FlexFit;
}

/**
 * 弹性布局包裹 Widget。
 *
 * 作为 ParentDataWidget，不创建自己的渲染对象，
 * 而是将 flex 和 fit 属性应用到子渲染对象的 {@link FlexParentData} 上。
 *
 * 通常作为 Row / Column 的直接子节点使用。
 */
export class Flexible extends Widget {
  /** 被包裹的子 Widget。 */
  readonly child: Widget;

  /** 弹性因子。 */
  readonly flex: number;

  /** 弹性适配方式。 */
  readonly fit: FlexFit;

  /**
   * 创建 Flexible 实例。
   *
   * @param args - 配置参数
   */
  constructor(args: FlexibleArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.flex = args.flex ?? 1;
    this.fit = args.fit ?? "loose";
  }

  /**
   * 将弹性属性应用到子渲染对象的 parentData 上。
   *
   * @param childRenderObject - 子渲染对象
   */
  applyParentData(childRenderObject: RenderObject): void {
    const pd = childRenderObject.parentData;
    if (pd instanceof FlexParentData) {
      pd.flex = this.flex;
      pd.fit = this.fit;
    }
  }

  /**
   * Flexible 不直接创建元素，由 MultiChildRenderObjectElement 处理。
   * 此方法不应被直接调用。
   *
   * @returns 子 Widget 的元素
   */
  createElement(): Element {
    return this.child.createElement();
  }
}

// ════════════════════════════════════════════════════
//  Expanded
// ════════════════════════════════════════════════════

/** Expanded 构造函数参数。 */
interface ExpandedArgs {
  /** 可选标识键。 */
  key?: Key;
  /** 被包裹的子 Widget。 */
  child: Widget;
  /** 弹性因子，默认 1。 */
  flex?: number;
}

/**
 * 扩展布局包裹 Widget。
 *
 * 等价于 fit="tight" 的 Flexible，强制子节点填满分配到的空间。
 */
export class Expanded extends Flexible {
  /**
   * 创建 Expanded 实例。
   *
   * @param args - 配置参数
   */
  constructor(args: ExpandedArgs) {
    super({
      key: args.key,
      child: args.child,
      flex: args.flex ?? 1,
      fit: "tight",
    });
  }
}
