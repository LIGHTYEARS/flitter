/**
 * Stack / Positioned 层叠布局组件。
 *
 * {@link Stack} 将子节点层叠放置，支持非定位子节点的对齐方式
 * 以及通过 {@link Positioned} 精确定位子节点的能力。
 *
 * 包含 {@link StackAlignment} 对齐类型、{@link StackParentData} 父数据、
 * {@link RenderStack} 渲染对象、{@link Stack} Widget 和 {@link Positioned} Widget。
 *
 * @module
 */

import { BoxConstraints } from "../tree/constraints.js";
import type { Element } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import { ParentData } from "../tree/types.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";

// ════════════════════════════════════════════════════
//  StackAlignment 类型
// ════════════════════════════════════════════════════

/**
 * Stack 子节点对齐方式。
 *
 * 控制非定位（non-positioned）子节点在 Stack 内的放置位置。
 */
export type StackAlignment =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "centerLeft"
  | "center"
  | "centerRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

// ════════════════════════════════════════════════════
//  StackParentData
// ════════════════════════════════════════════════════

/**
 * Stack 布局的父节点数据。
 *
 * 存储子节点的定位信息（left、top、right、bottom）以及是否为定位子节点。
 */
export class StackParentData extends ParentData {
  /** 距左边缘的距离，undefined 表示未指定。 */
  left: number | undefined = undefined;

  /** 距顶部边缘的距离，undefined 表示未指定。 */
  top: number | undefined = undefined;

  /** 距右边缘的距离，undefined 表示未指定。 */
  right: number | undefined = undefined;

  /** 距底部边缘的距离，undefined 表示未指定。 */
  bottom: number | undefined = undefined;

  /** 是否为定位子节点。 */
  isPositioned: boolean = false;
}

// ════════════════════════════════════════════════════
//  RenderStack 构造参数
// ════════════════════════════════════════════════════

/** RenderStack 构造函数参数。 */
interface RenderStackArgs {
  /** 非定位子节点的对齐方式，默认 "topLeft"。 */
  alignment?: StackAlignment;
}

// ════════════════════════════════════════════════════
//  RenderStack
// ════════════════════════════════════════════════════

/**
 * Stack 层叠布局渲染对象。
 *
 * 实现层叠布局算法：
 * 1. 第一遍：布局非定位子节点，使用放松约束，追踪最大宽高
 * 2. 确定自身尺寸
 * 3. 第二遍：布局定位子节点，根据 left/right/top/bottom 计算约束
 * 4. 根据对齐方式设置非定位子节点的偏移
 * 5. 根据定位参数设置定位子节点的偏移
 */
export class RenderStack extends RenderBox {
  /** 非定位子节点的对齐方式。 */
  alignment: StackAlignment;

  /**
   * 创建 Stack 渲染对象。
   *
   * @param args - 可选配置参数
   */
  constructor(args?: RenderStackArgs) {
    super();
    this.alignment = args?.alignment ?? "topLeft";
  }

  /**
   * 为子节点设置 StackParentData。
   *
   * 如果子节点的 parentData 不是 StackParentData 实例，
   * 则替换为新的 StackParentData。
   *
   * @param child - 子节点
   */
  override setupParentData(child: RenderObject): void {
    if (!(child.parentData instanceof StackParentData)) {
      child.parentData = new StackParentData();
    }
  }

  /**
   * 执行层叠布局算法。
   *
   * 两遍布局 + 定位：
   * 1. 放松约束布局非定位子节点，追踪最大宽高
   * 2. 确定 Stack 自身尺寸
   * 3. 根据定位参数为定位子节点构建约束并布局
   * 4. 按对齐方式为非定位子节点设置偏移
   * 5. 按定位参数为定位子节点设置偏移
   */
  performLayout(): void {
    const constraints = this._constraints!;
    const loosened = constraints.loosen();

    let hasNonPositionedChild = false;
    let maxChildWidth = 0;
    let maxChildHeight = 0;

    // ── Pass 1: 布局非定位子节点 ──────────────────────
    for (const child of this._children) {
      const pd = child.parentData as StackParentData;
      if (pd.isPositioned) continue;

      hasNonPositionedChild = true;
      const childBox = child as RenderBox;
      childBox.layout(loosened);
      maxChildWidth = Math.max(maxChildWidth, childBox.size.width);
      maxChildHeight = Math.max(maxChildHeight, childBox.size.height);
    }

    // ── 确定自身尺寸 ──────────────────────────────────
    if (hasNonPositionedChild) {
      this.size = constraints.constrain(maxChildWidth, maxChildHeight);
    } else {
      // 无非定位子节点时，使用约束最大值；如果无界则使用最小值
      const width = constraints.hasBoundedWidth ? constraints.maxWidth : constraints.minWidth;
      const height = constraints.hasBoundedHeight ? constraints.maxHeight : constraints.minHeight;
      this.size = { width, height };
    }

    const stackWidth = this.size.width;
    const stackHeight = this.size.height;

    // ── Pass 2: 布局定位子节点 ──────────────────────────
    for (const child of this._children) {
      const pd = child.parentData as StackParentData;
      if (!pd.isPositioned) continue;

      const childBox = child as RenderBox;

      // 根据 left/right/top/bottom 构建约束
      let minW = 0;
      let maxW = stackWidth;
      let minH = 0;
      let maxH = stackHeight;

      if (pd.left !== undefined && pd.right !== undefined) {
        // 同时指定 left 和 right 时，子节点宽度被固定
        const tightWidth = Math.max(0, stackWidth - pd.left - pd.right);
        minW = tightWidth;
        maxW = tightWidth;
      }

      if (pd.top !== undefined && pd.bottom !== undefined) {
        // 同时指定 top 和 bottom 时，子节点高度被固定
        const tightHeight = Math.max(0, stackHeight - pd.top - pd.bottom);
        minH = tightHeight;
        maxH = tightHeight;
      }

      const childConstraints = new BoxConstraints({
        minWidth: minW,
        maxWidth: maxW,
        minHeight: minH,
        maxHeight: maxH,
      });

      childBox.layout(childConstraints);
    }

    // ── 设置非定位子节点偏移（按对齐方式）──────────────
    for (const child of this._children) {
      const pd = child.parentData as StackParentData;
      if (pd.isPositioned) continue;

      const childBox = child as RenderBox;
      const childWidth = childBox.size.width;
      const childHeight = childBox.size.height;

      let x = 0;
      let y = 0;

      // 水平对齐
      if (
        this.alignment === "topCenter" ||
        this.alignment === "center" ||
        this.alignment === "bottomCenter"
      ) {
        x = (stackWidth - childWidth) / 2;
      } else if (
        this.alignment === "topRight" ||
        this.alignment === "centerRight" ||
        this.alignment === "bottomRight"
      ) {
        x = stackWidth - childWidth;
      }

      // 垂直对齐
      if (
        this.alignment === "centerLeft" ||
        this.alignment === "center" ||
        this.alignment === "centerRight"
      ) {
        y = (stackHeight - childHeight) / 2;
      } else if (
        this.alignment === "bottomLeft" ||
        this.alignment === "bottomCenter" ||
        this.alignment === "bottomRight"
      ) {
        y = stackHeight - childHeight;
      }

      childBox.offset = { x, y };
    }

    // ── 设置定位子节点偏移 ────────────────────────────
    for (const child of this._children) {
      const pd = child.parentData as StackParentData;
      if (!pd.isPositioned) continue;

      const childBox = child as RenderBox;
      const childWidth = childBox.size.width;
      const childHeight = childBox.size.height;

      const x =
        pd.left !== undefined
          ? pd.left
          : pd.right !== undefined
            ? stackWidth - pd.right - childWidth
            : 0;

      const y =
        pd.top !== undefined
          ? pd.top
          : pd.bottom !== undefined
            ? stackHeight - pd.bottom - childHeight
            : 0;

      childBox.offset = { x, y };
    }
  }
}

// ════════════════════════════════════════════════════
//  Stack Widget
// ════════════════════════════════════════════════════

/** Stack 构造函数参数。 */
interface StackArgs {
  /** 可选标识键。 */
  key?: Key;
  /** 非定位子节点的对齐方式，默认 "topLeft"。 */
  alignment?: StackAlignment;
  /** 子 Widget 列表。 */
  children?: Widget[];
}

/**
 * Stack 层叠布局 Widget。
 *
 * 将子节点层叠放置，支持通过 {@link Positioned} 精确定位子节点，
 * 或通过 {@link alignment} 控制非定位子节点的对齐方式。
 */
export class Stack extends Widget {
  /** 非定位子节点的对齐方式。 */
  readonly alignment: StackAlignment;

  /** 子 Widget 列表。 */
  readonly children: Widget[];

  /**
   * 创建 Stack Widget。
   *
   * @param args - 可选配置参数
   */
  constructor(args?: StackArgs) {
    super({ key: args?.key });
    this.alignment = args?.alignment ?? "topLeft";
    this.children = args?.children ?? [];
  }

  /**
   * 创建层叠布局渲染对象。
   *
   * @returns 新创建的 RenderStack 实例
   */
  createRenderObject(): RenderObject {
    return new RenderStack({ alignment: this.alignment });
  }

  /**
   * 用当前 Widget 的配置更新已有的渲染对象。
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderStack).alignment = this.alignment;
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

// ════════════════════════════════════════════════════
//  Positioned Widget
// ════════════════════════════════════════════════════

/** Positioned 构造函数参数。 */
interface PositionedArgs {
  /** 可选标识键。 */
  key?: Key;
  /** 被包裹的子 Widget。 */
  child: Widget;
  /** 距左边缘的距离。 */
  left?: number;
  /** 距顶部边缘的距离。 */
  top?: number;
  /** 距右边缘的距离。 */
  right?: number;
  /** 距底部边缘的距离。 */
  bottom?: number;
}

/**
 * Positioned Widget -- Stack 子节点的定位包裹器。
 *
 * 作为 ParentDataWidget，不创建自己的渲染对象，
 * 而是将 left、top、right、bottom 属性应用到子渲染对象的
 * {@link StackParentData} 上。
 *
 * 通常作为 {@link Stack} 的直接子节点使用。
 */
export class Positioned extends Widget {
  /** 被包裹的子 Widget。 */
  readonly child: Widget;

  /** 距左边缘的距离。 */
  readonly left: number | undefined;

  /** 距顶部边缘的距离。 */
  readonly top: number | undefined;

  /** 距右边缘的距离。 */
  readonly right: number | undefined;

  /** 距底部边缘的距离。 */
  readonly bottom: number | undefined;

  /**
   * 创建 Positioned Widget。
   *
   * @param args - 配置参数
   */
  constructor(args: PositionedArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.left = args.left;
    this.top = args.top;
    this.right = args.right;
    this.bottom = args.bottom;
  }

  /**
   * 将定位属性应用到子渲染对象的 parentData 上。
   *
   * @param childRenderObject - 子渲染对象
   */
  applyParentData(childRenderObject: RenderObject): void {
    const pd = childRenderObject.parentData;
    if (pd instanceof StackParentData) {
      pd.left = this.left;
      pd.top = this.top;
      pd.right = this.right;
      pd.bottom = this.bottom;
      pd.isPositioned = true;
    }
  }

  /**
   * Positioned 不直接创建元素，由 MultiChildRenderObjectElement 处理。
   * 此方法委托给子 Widget。
   *
   * @returns 子 Widget 的元素
   */
  createElement(): Element {
    return this.child.createElement();
  }
}
