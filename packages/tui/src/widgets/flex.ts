/**
 * Flex 弹性布局渲染对象。
 *
 * 实现 Flutter 风格的 Flex 布局引擎，支持水平和垂直两个方向，
 * 包含主轴对齐、交叉轴对齐、弹性分配等核心能力。
 *
 * @module
 */

import type { Size } from "../tree/constraints.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import { ParentData } from "../tree/types.js";

// ════════════════════════════════════════════════════
//  类型别名
// ════════════════════════════════════════════════════

/**
 * 主轴对齐方式。
 *
 * - `"start"`: 从主轴起点开始排列
 * - `"end"`: 靠主轴末尾排列
 * - `"center"`: 在主轴居中排列
 * - `"spaceBetween"`: 首尾贴边，中间等间距
 * - `"spaceAround"`: 每个子节点周围等间距
 * - `"spaceEvenly"`: 均匀分布，包含两端
 */
export type MainAxisAlignment =
  | "start"
  | "end"
  | "center"
  | "spaceBetween"
  | "spaceAround"
  | "spaceEvenly";

/**
 * 交叉轴对齐方式。
 *
 * - `"start"`: 交叉轴起点
 * - `"end"`: 交叉轴末尾
 * - `"center"`: 交叉轴居中
 * - `"stretch"`: 拉伸到交叉轴最大值
 */
export type CrossAxisAlignment = "start" | "end" | "center" | "stretch";

/**
 * 主轴尺寸策略。
 *
 * - `"min"`: 收缩到内容大小
 * - `"max"`: 填满约束允许的最大值
 */
export type MainAxisSize = "min" | "max";

/**
 * 布局轴方向。
 *
 * - `"horizontal"`: 水平方向（主轴为宽度）
 * - `"vertical"`: 垂直方向（主轴为高度）
 */
export type Axis = "horizontal" | "vertical";

/**
 * 弹性适配方式。
 *
 * - `"tight"`: 强制填满分配的空间
 * - `"loose"`: 允许小于分配的空间
 */
export type FlexFit = "tight" | "loose";

// ════════════════════════════════════════════════════
//  FlexParentData
// ════════════════════════════════════════════════════

/**
 * Flex 布局的父节点数据。
 *
 * 存储子节点的弹性因子和适配方式，用于 {@link RenderFlex} 的布局计算。
 */
export class FlexParentData extends ParentData {
  /** 弹性因子，0 表示非弹性子节点。 */
  flex: number = 0;

  /** 弹性适配方式，默认为松适配。 */
  fit: FlexFit = "loose";
}

// ════════════════════════════════════════════════════
//  RenderFlex 构造参数
// ════════════════════════════════════════════════════

/** RenderFlex 构造函数参数。 */
interface RenderFlexArgs {
  /** 布局方向，默认 "horizontal"。 */
  direction?: Axis;
  /** 主轴对齐方式，默认 "start"。 */
  mainAxisAlignment?: MainAxisAlignment;
  /** 交叉轴对齐方式，默认 "start"。 */
  crossAxisAlignment?: CrossAxisAlignment;
  /** 主轴尺寸策略，默认 "max"。 */
  mainAxisSize?: MainAxisSize;
}

// ════════════════════════════════════════════════════
//  RenderFlex
// ════════════════════════════════════════════════════

/**
 * Flex 弹性布局渲染对象。
 *
 * 实现两遍布局算法：
 * 1. 第一遍：布局非弹性子节点，累计已使用的主轴空间
 * 2. 第二遍：将剩余空间按弹性因子分配给弹性子节点
 *
 * 布局完成后根据主轴对齐方式和交叉轴对齐方式设置每个子节点的偏移。
 */
export class RenderFlex extends RenderBox {
  /** 布局方向。 */
  direction: Axis;

  /** 主轴对齐方式。 */
  mainAxisAlignment: MainAxisAlignment;

  /** 交叉轴对齐方式。 */
  crossAxisAlignment: CrossAxisAlignment;

  /** 主轴尺寸策略。 */
  mainAxisSize: MainAxisSize;

  /**
   * 创建 Flex 布局渲染对象。
   *
   * @param args - 可选配置参数
   */
  constructor(args?: RenderFlexArgs) {
    super();
    this.direction = args?.direction ?? "horizontal";
    this.mainAxisAlignment = args?.mainAxisAlignment ?? "start";
    this.crossAxisAlignment = args?.crossAxisAlignment ?? "start";
    this.mainAxisSize = args?.mainAxisSize ?? "max";
  }

  /**
   * 为子节点设置 FlexParentData。
   *
   * 如果子节点的 parentData 不是 FlexParentData 实例，
   * 则替换为新的 FlexParentData。
   *
   * @param child - 子节点
   */
  override setupParentData(child: RenderObject): void {
    if (!(child.parentData instanceof FlexParentData)) {
      child.parentData = new FlexParentData();
    }
  }

  /**
   * 获取尺寸在主轴方向的分量。
   *
   * @param size - 尺寸
   * @returns 主轴方向的长度
   */
  private _getMainAxisSize(size: Size): number {
    return this.direction === "horizontal" ? size.width : size.height;
  }

  /**
   * 获取尺寸在交叉轴方向的分量。
   *
   * @param size - 尺寸
   * @returns 交叉轴方向的长度
   */
  private _getCrossAxisSize(size: Size): number {
    return this.direction === "horizontal" ? size.height : size.width;
  }

  /**
   * 获取父约束在主轴方向的最大值。
   *
   * @param constraints - 盒约束
   * @returns 主轴方向的最大约束值
   */
  private _getMainAxisConstraint(constraints: BoxConstraints): number {
    return this.direction === "horizontal" ? constraints.maxWidth : constraints.maxHeight;
  }

  /**
   * 获取父约束在交叉轴方向的最大值。
   *
   * @param constraints - 盒约束
   * @returns 交叉轴方向的最大约束值
   */
  private _getCrossAxisConstraint(constraints: BoxConstraints): number {
    return this.direction === "horizontal" ? constraints.maxHeight : constraints.maxWidth;
  }

  /**
   * 执行 Flex 布局算法。
   *
   * 两遍布局：
   * 1. 布局非弹性子节点，累计主轴使用量和交叉轴最大值
   * 2. 按弹性因子分配剩余空间给弹性子节点
   *
   * 然后根据对齐方式设置子节点偏移位置。
   */
  performLayout(): void {
    const constraints = this._constraints!;
    const maxMain = this._getMainAxisConstraint(constraints);
    const maxCross = this._getCrossAxisConstraint(constraints);

    // ── Pass 1: 布局非弹性子节点，统计弹性因子 ────────
    let totalFlex = 0;
    let allocatedMainAxis = 0;
    let crossAxisExtent = 0;

    for (const child of this._children) {
      const pd = child.parentData as FlexParentData;
      const flex = pd.flex;

      if (flex > 0) {
        totalFlex += flex;
        continue;
      }

      // 非弹性子节点
      const childConstraints = this._buildChildConstraints(
        0,
        maxMain,
        maxCross,
        false, // 非 tight
      );
      (child as RenderBox).layout(childConstraints);
      const childSize = (child as RenderBox).size;
      allocatedMainAxis += this._getMainAxisSize(childSize);
      crossAxisExtent = Math.max(crossAxisExtent, this._getCrossAxisSize(childSize));
    }

    // ── 计算剩余空间 ───────────────────────────────
    const freeMainAxis = Math.max(0, maxMain - allocatedMainAxis);
    const spacePerFlex = totalFlex > 0 ? freeMainAxis / totalFlex : 0;

    // ── Pass 2: 布局弹性子节点 ─────────────────────
    // 逆向: amp s1T line 402 — Math.floor for intermediate, remainder for last
    let allocatedFlexSpace = 0;
    const flexChildren: RenderBox[] = [];
    for (const child of this._children) {
      const pd = child.parentData as FlexParentData;
      if (pd.flex > 0) {
        flexChildren.push(child as RenderBox);
      }
    }

    for (let i = 0; i < flexChildren.length; i++) {
      const child = flexChildren[i]!;
      const pd = child.parentData as FlexParentData;
      const flex = pd.flex;

      let childMainAxis: number;
      if (i < flexChildren.length - 1) {
        // Intermediate children: floor to integer
        childMainAxis = Math.floor(spacePerFlex * flex);
      } else {
        // Last child: gets the remainder to avoid drift
        childMainAxis = freeMainAxis - allocatedFlexSpace;
      }
      allocatedFlexSpace += childMainAxis;

      const isTight = pd.fit === "tight";
      const childConstraints = this._buildChildConstraints(
        isTight ? childMainAxis : 0,
        childMainAxis,
        maxCross,
        isTight,
      );
      child.layout(childConstraints);
      const childSize = child.size;
      allocatedMainAxis += this._getMainAxisSize(childSize);
      crossAxisExtent = Math.max(crossAxisExtent, this._getCrossAxisSize(childSize));
    }

    // ── 确定自身尺寸 ──────────────────────────────
    // 如果约束是无界的（Infinity），则无论 mainAxisSize 是什么，只能收缩到内容大小
    const mainAxisFinal =
      this.mainAxisSize === "max" && Number.isFinite(maxMain) ? maxMain : allocatedMainAxis;

    // 交叉轴 clamp 到约束范围
    const crossAxisFinal =
      this.direction === "horizontal"
        ? Math.max(constraints.minHeight, Math.min(crossAxisExtent, constraints.maxHeight))
        : Math.max(constraints.minWidth, Math.min(crossAxisExtent, constraints.maxWidth));

    if (this.direction === "horizontal") {
      this.size = constraints.constrain(mainAxisFinal, crossAxisFinal);
    } else {
      this.size = constraints.constrain(crossAxisFinal, mainAxisFinal);
    }

    // ── 定位子节点 ────────────────────────────────
    const ownMainSize = this._getMainAxisSize(this.size);
    const ownCrossSize = this._getCrossAxisSize(this.size);
    const childCount = this._children.length;
    const remainingSpace = Math.max(0, ownMainSize - allocatedMainAxis);

    let startOffset = 0;
    let gap = 0;

    switch (this.mainAxisAlignment) {
      case "start":
        startOffset = 0;
        gap = 0;
        break;
      case "end":
        startOffset = remainingSpace;
        gap = 0;
        break;
      case "center":
        startOffset = remainingSpace / 2;
        gap = 0;
        break;
      case "spaceBetween":
        startOffset = 0;
        gap = childCount > 1 ? remainingSpace / (childCount - 1) : 0;
        break;
      case "spaceAround":
        gap = childCount > 0 ? remainingSpace / childCount : 0;
        startOffset = gap / 2;
        break;
      case "spaceEvenly":
        gap = childCount > 0 ? remainingSpace / (childCount + 1) : 0;
        startOffset = gap;
        break;
    }

    let mainOffset = startOffset;

    for (const child of this._children) {
      const childBox = child as RenderBox;
      const childCrossSize = this._getCrossAxisSize(childBox.size);

      let crossOffset = 0;
      switch (this.crossAxisAlignment) {
        case "start":
          crossOffset = 0;
          break;
        case "end":
          crossOffset = ownCrossSize - childCrossSize;
          break;
        case "center":
          crossOffset = (ownCrossSize - childCrossSize) / 2;
          break;
        case "stretch":
          crossOffset = 0;
          break;
      }

      if (this.direction === "horizontal") {
        childBox.offset = { x: mainOffset, y: crossOffset };
      } else {
        childBox.offset = { x: crossOffset, y: mainOffset };
      }

      mainOffset += this._getMainAxisSize(childBox.size) + gap;
    }
  }

  /**
   * 根据方向和对齐方式构建子节点约束。
   *
   * @param minMain - 主轴最小约束
   * @param maxMain - 主轴最大约束
   * @param maxCross - 交叉轴最大约束
   * @param tightMain - 是否使用紧主轴约束
   * @returns 子节点的盒约束
   */
  private _buildChildConstraints(
    minMain: number,
    maxMain: number,
    maxCross: number,
    tightMain: boolean,
  ): BoxConstraints {
    const isStretch = this.crossAxisAlignment === "stretch";

    if (this.direction === "horizontal") {
      return new BoxConstraints({
        minWidth: tightMain ? maxMain : minMain,
        maxWidth: maxMain,
        minHeight: isStretch ? maxCross : 0,
        maxHeight: maxCross,
      });
    } else {
      return new BoxConstraints({
        minWidth: isStretch ? maxCross : 0,
        maxWidth: maxCross,
        minHeight: tightMain ? maxMain : minMain,
        maxHeight: maxMain,
      });
    }
  }

  // ════════════════════════════════════════════════════
  //  内在尺寸 (Intrinsic sizes)
  //  逆向: amp s1T (layout_widgets.js:480-600)
  // ════════════════════════════════════════════════════

  /**
   * 返回最小固有宽度。
   *
   * - 水平 (main axis): 非弹性子节点的 minWidth 求和，弹性子节点按比例贡献
   *   (max(childMinWidth/flex) * totalFlex)。逆向: amp s1T line 480-501。
   * - 垂直 (cross axis): 所有子节点 minWidth 取最大值。
   *
   * @param height - 可用高度约束
   */
  override getMinIntrinsicWidth(height: number): number {
    if (this.direction === "horizontal") {
      // 逆向: amp s1T line 480-501
      // 非弹性子节点求和；弹性子节点按 max(childMin/flex)*totalFlex 贡献
      let nonFlexSum = 0;
      let totalFlex = 0;
      let maxFlexRatio = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          const flex = pd.flex;
          if (flex > 0) {
            totalFlex += flex;
            maxFlexRatio = Math.max(maxFlexRatio, child.getMinIntrinsicWidth(height) / flex);
          } else {
            nonFlexSum += child.getMinIntrinsicWidth(height);
          }
        }
      }
      return nonFlexSum + maxFlexRatio * totalFlex;
    } else {
      // 交叉轴: max of all children
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          max = Math.max(max, child.getMinIntrinsicWidth(height));
        }
      }
      return max;
    }
  }

  /**
   * 返回最大固有宽度。
   *
   * - 水平 (main axis): 非弹性子节点的 maxWidth 求和，弹性子节点按比例贡献。
   *   逆向: amp s1T line 502-523。
   * - 垂直 (cross axis): 所有子节点 maxWidth 取最大值。
   *
   * @param height - 可用高度约束
   */
  override getMaxIntrinsicWidth(height: number): number {
    if (this.direction === "horizontal") {
      // 逆向: amp s1T line 502-523
      let nonFlexSum = 0;
      let totalFlex = 0;
      let maxFlexRatio = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          const flex = pd.flex;
          if (flex > 0) {
            totalFlex += flex;
            maxFlexRatio = Math.max(maxFlexRatio, child.getMaxIntrinsicWidth(height) / flex);
          } else {
            nonFlexSum += child.getMaxIntrinsicWidth(height);
          }
        }
      }
      return nonFlexSum + maxFlexRatio * totalFlex;
    } else {
      // 交叉轴: max of all children
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          max = Math.max(max, child.getMaxIntrinsicWidth(height));
        }
      }
      return max;
    }
  }

  /**
   * 返回最小固有高度。
   *
   * - 水平 (cross axis): 估算每个子节点在其分配宽度下的 minHeight，取最大值。
   *   逆向: amp s1T line 564-585。
   * - 垂直 (main axis): 非弹性子节点的 minHeight 求和，弹性子节点按比例贡献。
   *   逆向: amp s1T line 586-599。
   *
   * @param width - 可用宽度约束
   */
  override getMinIntrinsicHeight(width: number): number {
    if (this.direction === "horizontal") {
      // 逆向: amp s1T line 564-585
      // 估算非弹性子节点总宽度，计算剩余空间分配给弹性子节点
      let totalFlex = 0;
      let nonFlexWidthSum = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          if (pd.flex > 0) {
            totalFlex += pd.flex;
          } else {
            nonFlexWidthSum += child.getMinIntrinsicWidth(0);
          }
        }
      }
      const freeWidth = Math.max(0, width - nonFlexWidthSum);
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          let childWidth = width;
          if (pd.flex > 0 && totalFlex > 0) {
            childWidth = (freeWidth / totalFlex) * pd.flex;
          }
          max = Math.max(max, child.getMinIntrinsicHeight(childWidth));
        }
      }
      return max;
    } else {
      // 逆向: amp s1T line 586-599
      // 主轴: 非弹性求和 + 弹性按比例贡献
      let nonFlexSum = 0;
      let totalFlex = 0;
      let maxFlexRatio = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          const flex = pd.flex;
          if (flex > 0) {
            totalFlex += flex;
            maxFlexRatio = Math.max(maxFlexRatio, child.getMinIntrinsicHeight(width) / flex);
          } else {
            nonFlexSum += child.getMinIntrinsicHeight(width);
          }
        }
      }
      return nonFlexSum + maxFlexRatio * totalFlex;
    }
  }

  /**
   * 返回最大固有高度。
   *
   * - 水平 (cross axis): 估算每个子节点在其分配宽度下的 maxHeight，取最大值。
   *   逆向: amp s1T line 524-562。
   * - 垂直 (main axis): 非弹性子节点的 maxHeight 求和，弹性子节点按比例贡献。
   *   逆向: amp s1T line 548-562。
   *
   * @param width - 可用宽度约束
   */
  override getMaxIntrinsicHeight(width: number): number {
    if (this.direction === "horizontal") {
      // 逆向: amp s1T line 524-548
      // 估算非弹性子节点总宽度，计算剩余空间分配给弹性子节点
      let totalFlex = 0;
      let nonFlexWidthSum = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          if (pd.flex > 0) {
            totalFlex += pd.flex;
          } else {
            nonFlexWidthSum += child.getMaxIntrinsicWidth(0);
          }
        }
      }
      const freeWidth = Math.max(0, width - nonFlexWidthSum);
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          let childWidth = width;
          if (pd.flex > 0 && totalFlex > 0) {
            childWidth = (freeWidth / totalFlex) * pd.flex;
          }
          max = Math.max(max, child.getMaxIntrinsicHeight(childWidth));
        }
      }
      return max;
    } else {
      // 逆向: amp s1T line 548-562
      // 主轴: 非弹性求和 + 弹性按比例贡献
      let nonFlexSum = 0;
      let totalFlex = 0;
      let maxFlexRatio = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          const flex = pd.flex;
          if (flex > 0) {
            totalFlex += flex;
            maxFlexRatio = Math.max(maxFlexRatio, child.getMaxIntrinsicHeight(width) / flex);
          } else {
            nonFlexSum += child.getMaxIntrinsicHeight(width);
          }
        }
      }
      return nonFlexSum + maxFlexRatio * totalFlex;
    }
  }
}
