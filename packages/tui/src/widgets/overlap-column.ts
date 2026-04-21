/**
 * OverlapColumn Widget -- 垂直方向重叠布局。
 *
 * {@link OverlapColumn} 将子节点沿垂直方向排列，相邻子节点之间重叠指定行数。
 * 用于实现合并边框等视觉效果。
 *
 * 逆向: l1T (chunk-006.js:3066-3088) — widget class
 * 逆向: LY  (chunk-006.js:3090-3176) — render object class
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Element } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";

// ════════════════════════════════════════════════════
//  CrossAxisAlignment 类型
// ════════════════════════════════════════════════════

/**
 * OverlapColumn 交叉轴对齐方式。
 *
 * 逆向: LY._crossAxisAlignment values from l1T constructor
 */
export type OverlapCrossAxisAlignment = "start" | "end" | "center" | "stretch";

// ════════════════════════════════════════════════════
//  RenderOverlapColumn
// ════════════════════════════════════════════════════

/**
 * OverlapColumn 渲染对象。
 *
 * 布局算法：
 * 1. 为每个子节点布局（stretch 时使用紧宽度约束，否则使用松约束）
 * 2. 在相邻子节点之间减去 `overlap` 行数的 Y 偏移
 * 3. 如果交叉轴非 "start"，二次遍历校正 X 偏移
 *
 * 绘制顺序：逆序（最后一个子节点先绘制，第一个子节点最后绘制 = 在重叠区域视觉上"在上方"）
 *
 * 逆向: LY extends O9 (chunk-006.js:3090-3176)
 */
export class RenderOverlapColumn extends RenderBox {
  /** 相邻子节点重叠的行数。 */
  private _overlap: number;

  /** 交叉轴对齐方式。 */
  private _crossAxisAlignment: OverlapCrossAxisAlignment;

  /**
   * 逆向: LY constructor(T, R)
   */
  constructor(overlap: number, crossAxisAlignment: OverlapCrossAxisAlignment) {
    super();
    this._overlap = overlap;
    this._crossAxisAlignment = crossAxisAlignment;
  }

  /**
   * 更新属性并标记需要重新布局。
   *
   * 逆向: LY.updateProperties(T, R)
   */
  updateProperties(overlap: number, crossAxisAlignment: OverlapCrossAxisAlignment): void {
    if (this._overlap === overlap && this._crossAxisAlignment === crossAxisAlignment) return;
    this._overlap = overlap;
    this._crossAxisAlignment = crossAxisAlignment;
    this.markNeedsLayout();
  }

  // ── Intrinsic widths: max across children ─────────────────

  /**
   * 逆向: LY.getMinIntrinsicWidth — max across all children
   */
  override getMinIntrinsicWidth(height: number): number {
    let result = 0;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        result = Math.max(result, child.getMinIntrinsicWidth(height));
      }
    }
    return result;
  }

  /**
   * 逆向: LY.getMaxIntrinsicWidth — max across all children
   */
  override getMaxIntrinsicWidth(height: number): number {
    let result = 0;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        result = Math.max(result, child.getMaxIntrinsicWidth(height));
      }
    }
    return result;
  }

  // ── Intrinsic heights: delegate to _computeTotalHeight ────

  /**
   * 逆向: LY.getMinIntrinsicHeight
   */
  override getMinIntrinsicHeight(width: number): number {
    return this._computeTotalHeight(width, (child, w) => child.getMinIntrinsicHeight(w));
  }

  /**
   * 逆向: LY.getMaxIntrinsicHeight
   */
  override getMaxIntrinsicHeight(width: number): number {
    return this._computeTotalHeight(width, (child, w) => child.getMaxIntrinsicHeight(w));
  }

  /**
   * Core height formula: sum of child heights minus overlap * (childCount - 1).
   *
   * 逆向: LY._computeTotalHeight(T, R) (chunk-006.js:3115-3123)
   */
  private _computeTotalHeight(
    width: number,
    measure: (child: RenderBox, width: number) => number,
  ): number {
    const children = this._children;
    if (children.length === 0) return 0;

    let total = 0;
    for (const child of children) {
      if (child instanceof RenderBox) {
        total += measure(child, width);
      }
    }
    // Subtract overlap for each adjacent pair
    total -= this._overlap * Math.max(0, children.length - 1);
    return Math.max(0, total);
  }

  // ── Layout ────────────────────────────────────────────────

  /**
   * 执行重叠列布局。
   *
   * 逆向: LY.performLayout() (chunk-006.js:3125-3162)
   */
  performLayout(): void {
    const constraints = this._lastConstraints!;
    const children = this._children;

    if (children.length === 0) {
      this.setSize(constraints.minWidth, constraints.minHeight);
      return;
    }

    let maxChildWidth = constraints.minWidth;
    let currentY = 0;

    // First pass: lay out each child, set offsets
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as RenderBox;

      // 逆向: stretch → tight-width, otherwise loose
      const childConstraints =
        this._crossAxisAlignment === "stretch"
          ? new BoxConstraints({
              minWidth: constraints.maxWidth,
              maxWidth: constraints.maxWidth,
              minHeight: 0,
              maxHeight: Infinity,
            })
          : BoxConstraints.loose(constraints.maxWidth, Infinity);

      child.layout(childConstraints);
      maxChildWidth = Math.max(maxChildWidth, child.size.width);

      const crossX = this._computeCrossPosition(child, maxChildWidth);
      child.setOffset(crossX, currentY);

      currentY += child.size.height;
      // Subtract overlap for all but the last child
      if (i < children.length - 1) {
        currentY -= this._overlap;
      }
    }

    // Second pass: re-set cross positions if alignment changed the total width
    // 逆向: only needed for "end" / "center" — first pass used possibly stale maxChildWidth
    if (this._crossAxisAlignment !== "start" && this._crossAxisAlignment !== "stretch") {
      for (const child of children) {
        const childBox = child as RenderBox;
        const crossX = this._computeCrossPosition(childBox, maxChildWidth);
        childBox.setOffset(crossX, childBox.offset.y);
      }
    }

    const totalHeight = Math.max(0, currentY);
    this.setSize(
      Math.min(maxChildWidth, constraints.maxWidth),
      Math.max(constraints.minHeight, Math.min(totalHeight, constraints.maxHeight)),
    );
  }

  /**
   * Compute cross-axis (X) position for a child.
   *
   * 逆向: LY._computeCrossPosition(T, R) (chunk-006.js:3164-3173)
   */
  private _computeCrossPosition(child: RenderBox, totalWidth: number): number {
    switch (this._crossAxisAlignment) {
      case "start":
      case "stretch":
        return 0;
      case "end":
        return totalWidth - child.size.width;
      case "center":
        return Math.floor((totalWidth - child.size.width) / 2);
    }
  }

  // ── Paint: reverse order for overlap visual stacking ──────

  /**
   * 逆序绘制子节点，使得索引较小的子节点在重叠区域视觉上"在上方"。
   *
   * 逆向: LY.paint(T, R, a) (chunk-006.js:3174-3176)
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this._needsPaint = false;
    this.performPaint(screen, offsetX, offsetY);

    const screenWidth = screen.width;
    const screenHeight = screen.height;
    const children = this._children;

    // 逆向: reverse iteration — last child painted first (background), first child last (foreground)
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child instanceof RenderBox) {
        const childOffset = child.offset;
        const childSize = child.size;
        const cx = offsetX + childOffset.x;
        const cy = offsetY + childOffset.y;
        const cr = cx + childSize.width;
        const cb = cy + childSize.height;

        // Viewport clipping — skip if completely outside screen
        if (cx >= screenWidth || cy >= screenHeight || cr <= 0 || cb <= 0) {
          continue;
        }
        child.paint(screen, cx, cy);
      } else {
        child.paint(screen, offsetX, offsetY);
      }
    }
  }
}

// ════════════════════════════════════════════════════
//  OverlapColumn Widget
// ════════════════════════════════════════════════════

/** OverlapColumn 构造函数参数。 */
interface OverlapColumnArgs {
  /** 可选标识键。 */
  key?: Key;
  /** 相邻子节点重叠的行数，默认 1。必须 >= 0。 */
  overlap?: number;
  /** 交叉轴对齐方式，默认 "stretch"。 */
  crossAxisAlignment?: OverlapCrossAxisAlignment;
  /** 子 Widget 列表。 */
  children?: Widget[];
}

/**
 * OverlapColumn Widget -- 重叠列布局。
 *
 * 将子节点沿垂直方向排列，相邻子节点之间重叠 `overlap` 行。
 * 用于实现合并边框效果（相邻容器的上下边框合并为一行）。
 *
 * 逆向: l1T extends Dn (chunk-006.js:3066-3088)
 */
export class OverlapColumn extends Widget {
  /** 相邻子节点重叠的行数。 */
  readonly overlap: number;

  /** 交叉轴对齐方式。 */
  readonly crossAxisAlignment: OverlapCrossAxisAlignment;

  /** 子 Widget 列表。 */
  readonly children: Widget[];

  /**
   * 逆向: l1T constructor({key, overlap=1, crossAxisAlignment="stretch", children=[]})
   */
  constructor(args?: OverlapColumnArgs) {
    super({ key: args?.key });
    const overlap = args?.overlap ?? 1;
    if (overlap < 0) {
      throw new Error(`OverlapColumn overlap must be non-negative, received: ${overlap}`);
    }
    this.overlap = overlap;
    this.crossAxisAlignment = args?.crossAxisAlignment ?? "stretch";
    this.children = args?.children ?? [];
  }

  /**
   * 创建重叠列布局渲染对象。
   */
  createRenderObject(): RenderObject {
    return new RenderOverlapColumn(this.overlap, this.crossAxisAlignment);
  }

  /**
   * 用当前 Widget 的配置更新已有的渲染对象。
   */
  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof RenderOverlapColumn) {
      renderObject.updateProperties(this.overlap, this.crossAxisAlignment);
    }
  }

  /**
   * 创建与此 Widget 关联的元素。
   */
  createElement(): Element {
    return new MultiChildRenderObjectElement(this);
  }
}
