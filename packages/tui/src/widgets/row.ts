/**
 * Row Widget -- 水平方向 Flex 布局。
 *
 * {@link Row} 将子节点沿水平方向排列，内部通过创建
 * direction="horizontal" 的 {@link RenderFlex} 实现布局。
 *
 * @module
 */

import { Widget } from "../tree/widget.js";
import type { Key } from "../tree/widget.js";
import type { Element } from "../tree/element.js";
import type { RenderObject } from "../tree/render-object.js";
import { RenderFlex } from "./flex.js";
import type {
  MainAxisAlignment,
  CrossAxisAlignment,
  MainAxisSize,
} from "./flex.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";

// ════════════════════════════════════════════════════
//  Row 构造参数
// ════════════════════════════════════════════════════

/** Row 构造函数参数。 */
interface RowArgs {
  /** 可选标识键。 */
  key?: Key;
  /** 主轴对齐方式，默认 "start"。 */
  mainAxisAlignment?: MainAxisAlignment;
  /** 交叉轴对齐方式，默认 "start"。 */
  crossAxisAlignment?: CrossAxisAlignment;
  /** 主轴尺寸策略，默认 "max"。 */
  mainAxisSize?: MainAxisSize;
  /** 子 Widget 列表。 */
  children?: Widget[];
}

// ════════════════════════════════════════════════════
//  Row Widget
// ════════════════════════════════════════════════════

/**
 * 水平方向布局 Widget。
 *
 * 将子节点沿水平主轴排列，支持主轴对齐、交叉轴对齐和弹性布局。
 * 可直接包含普通 Widget 或 Flexible / Expanded。
 */
export class Row extends Widget {
  /** 主轴对齐方式。 */
  readonly mainAxisAlignment: MainAxisAlignment;

  /** 交叉轴对齐方式。 */
  readonly crossAxisAlignment: CrossAxisAlignment;

  /** 主轴尺寸策略。 */
  readonly mainAxisSize: MainAxisSize;

  /** 子 Widget 列表。 */
  readonly children: Widget[];

  /**
   * 创建 Row 实例。
   *
   * @param args - 可选配置参数
   */
  constructor(args?: RowArgs) {
    super({ key: args?.key });
    this.mainAxisAlignment = args?.mainAxisAlignment ?? "start";
    this.crossAxisAlignment = args?.crossAxisAlignment ?? "start";
    this.mainAxisSize = args?.mainAxisSize ?? "max";
    this.children = args?.children ?? [];
  }

  /**
   * 创建水平方向的 RenderFlex 渲染对象。
   *
   * @returns 新创建的 RenderFlex 实例
   */
  createRenderObject(): RenderObject {
    return new RenderFlex({
      direction: "horizontal",
      mainAxisAlignment: this.mainAxisAlignment,
      crossAxisAlignment: this.crossAxisAlignment,
      mainAxisSize: this.mainAxisSize,
    });
  }

  /**
   * 用当前 Widget 的配置更新已有的渲染对象。
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    const flex = renderObject as RenderFlex;
    flex.direction = "horizontal";
    flex.mainAxisAlignment = this.mainAxisAlignment;
    flex.crossAxisAlignment = this.crossAxisAlignment;
    flex.mainAxisSize = this.mainAxisSize;
  }

  /**
   * 创建与此 Widget 关联的元素。
   *
   * @returns 新创建的 MultiChildRenderObjectElement 实例
   */
  createElement(): Element {
    return new MultiChildRenderObjectElement(this);
  }
}
