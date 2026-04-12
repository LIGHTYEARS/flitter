/**
 * SizedBox 固定尺寸布局组件。
 *
 * 包含 {@link RenderSizedBox} 渲染对象和 {@link SizedBox} Widget。
 * SizedBox 强制子 Widget 在指定维度上采用固定尺寸。
 *
 * @module
 */

import { RenderBox } from "../tree/render-box.js";
import { BoxConstraints } from "../tree/constraints.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import type { RenderObject } from "../tree/render-object.js";
import type { Key } from "../tree/widget.js";

// ════════════════════════════════════════════════════
//  RenderSizedBox
// ════════════════════════════════════════════════════

/**
 * 固定尺寸渲染对象。
 *
 * 在指定维度上强制使用固定值，未指定的维度使用父约束范围。
 * 有子节点时使用子节点实际尺寸，无子节点时使用请求值或 0。
 */
export class RenderSizedBox extends RenderBox {
  /** 请求宽度，undefined 表示不约束 */
  private _requestedWidth: number | undefined;

  /** 请求高度，undefined 表示不约束 */
  private _requestedHeight: number | undefined;

  /**
   * 创建固定尺寸渲染对象。
   *
   * @param width - 可选的固定宽度
   * @param height - 可选的固定高度
   */
  constructor(width?: number, height?: number) {
    super();
    this._requestedWidth = width;
    this._requestedHeight = height;
  }

  /**
   * 获取请求宽度。
   *
   * @returns 请求的宽度，未指定时为 undefined
   */
  get requestedWidth(): number | undefined {
    return this._requestedWidth;
  }

  /**
   * 设置请求宽度。
   *
   * 值变化时标记需要重新布局。
   *
   * @param value - 新的请求宽度
   */
  set requestedWidth(value: number | undefined) {
    if (this._requestedWidth !== value) {
      this._requestedWidth = value;
      this.markNeedsLayout();
    }
  }

  /**
   * 获取请求高度。
   *
   * @returns 请求的高度，未指定时为 undefined
   */
  get requestedHeight(): number | undefined {
    return this._requestedHeight;
  }

  /**
   * 设置请求高度。
   *
   * 值变化时标记需要重新布局。
   *
   * @param value - 新的请求高度
   */
  set requestedHeight(value: number | undefined) {
    if (this._requestedHeight !== value) {
      this._requestedHeight = value;
      this.markNeedsLayout();
    }
  }

  /**
   * 执行布局。
   *
   * 1. 根据请求宽/高构建子约束：指定维度使用紧约束，否则使用父约束范围
   * 2. 有子节点时：用子约束布局子节点，自身尺寸 = 子节点尺寸
   * 3. 无子节点时：自身尺寸 = constrain(width ?? 0, height ?? 0)
   * 4. 子节点偏移 = (0, 0)
   */
  performLayout(): void {
    const constraints = this._constraints!;

    // 构建子约束
    const childConstraints = new BoxConstraints({
      minWidth: this._requestedWidth !== undefined
        ? constraints.constrain(this._requestedWidth, 0).width
        : constraints.minWidth,
      maxWidth: this._requestedWidth !== undefined
        ? constraints.constrain(this._requestedWidth, 0).width
        : constraints.maxWidth,
      minHeight: this._requestedHeight !== undefined
        ? constraints.constrain(0, this._requestedHeight).height
        : constraints.minHeight,
      maxHeight: this._requestedHeight !== undefined
        ? constraints.constrain(0, this._requestedHeight).height
        : constraints.maxHeight,
    });

    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      child.layout(childConstraints);
      this.size = child.size;
      child.offset = { x: 0, y: 0 };
    } else {
      this.size = constraints.constrain(
        this._requestedWidth ?? 0,
        this._requestedHeight ?? 0,
      );
    }
  }
}

// ════════════════════════════════════════════════════
//  SizedBox Widget
// ════════════════════════════════════════════════════

/** SizedBox 构造函数参数。 */
interface SizedBoxArgs {
  /** 可选标识键 */
  key?: Key;
  /** 可选的固定宽度 */
  width?: number;
  /** 可选的固定高度 */
  height?: number;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * SizedBox Widget。
 *
 * 强制子 Widget 在指定维度上采用固定尺寸。
 * 未指定的维度保持父约束不变。
 * 创建 {@link RenderSizedBox} 作为渲染对象。
 */
export class SizedBox extends Widget implements RenderObjectWidget {
  /** 请求宽度 */
  readonly width: number | undefined;

  /** 请求高度 */
  readonly height: number | undefined;

  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 SizedBox Widget。
   *
   * @param args - 配置参数
   */
  constructor(args?: SizedBoxArgs) {
    super({ key: args?.key });
    this.width = args?.width;
    this.height = args?.height;
    this.child = args?.child;
  }

  /**
   * 创建关联的元素。
   *
   * @returns 新的 SingleChildRenderObjectElement 实例
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * @returns 新的 RenderSizedBox 实例
   */
  createRenderObject(): RenderObject {
    return new RenderSizedBox(this.width, this.height);
  }

  /**
   * 用当前 Widget 配置更新已有的渲染对象。
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    const ro = renderObject as RenderSizedBox;
    ro.requestedWidth = this.width;
    ro.requestedHeight = this.height;
  }
}
