/**
 * Align / RenderPositionedBox 布局组件。
 *
 * {@link RenderPositionedBox} 渲染对象将子节点居中对齐，可选按比例因子
 * 缩放自身尺寸。{@link Align} Widget 创建并管理该渲染对象。
 *
 * 逆向: CY (layout_widgets.js:760-802)
 *
 * @module
 */

import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  RenderPositionedBox
// ════════════════════════════════════════════════════

/**
 * 居中定位渲染对象。
 *
 * 将唯一子节点居中放置，可选地按 widthFactor / heightFactor
 * 缩放自身尺寸。当因子未指定时，自身尽可能撑满父约束；
 * 当因子指定或父约束为无限时，自身尺寸按子节点尺寸乘以因子收缩。
 *
 * 逆向: CY extends O9 (layout_widgets.js:760-802)
 */
export class RenderPositionedBox extends RenderBox {
  /** 宽度因子，undefined 表示不缩放（撑满父约束） */
  private _widthFactor: number | undefined;

  /** 高度因子，undefined 表示不缩放（撑满父约束） */
  private _heightFactor: number | undefined;

  /**
   * 创建居中定位渲染对象。
   *
   * 逆向: CY constructor(T, R)
   *
   * @param widthFactor - 可选宽度因子
   * @param heightFactor - 可选高度因子
   */
  constructor(widthFactor?: number, heightFactor?: number) {
    super();
    this._widthFactor = widthFactor;
    this._heightFactor = heightFactor;
  }

  /**
   * 获取宽度因子。
   */
  get widthFactor(): number | undefined {
    return this._widthFactor;
  }

  /**
   * 设置宽度因子。值变化时标记需要重新布局。
   */
  set widthFactor(value: number | undefined) {
    if (this._widthFactor !== value) {
      this._widthFactor = value;
      this.markNeedsLayout();
    }
  }

  /**
   * 获取高度因子。
   */
  get heightFactor(): number | undefined {
    return this._heightFactor;
  }

  /**
   * 设置高度因子。值变化时标记需要重新布局。
   */
  set heightFactor(value: number | undefined) {
    if (this._heightFactor !== value) {
      this._heightFactor = value;
      this.markNeedsLayout();
    }
  }

  // ────────────────────────────────────────────────────
  //  固有尺寸 — 逆向: CY.getMin/MaxIntrinsicWidth/Height
  // ────────────────────────────────────────────────────

  /**
   * 逆向: CY.getMinIntrinsicWidth(T)
   * `(this.children[0]?.getMinIntrinsicWidth(T) ?? 0) * (this.widthFactor ?? 1)`
   */
  override getMinIntrinsicWidth(height: number): number {
    return (
      (this._children[0] instanceof RenderBox
        ? this._children[0].getMinIntrinsicWidth(height)
        : 0) * (this._widthFactor ?? 1)
    );
  }

  /**
   * 逆向: CY.getMaxIntrinsicWidth(T)
   */
  override getMaxIntrinsicWidth(height: number): number {
    return (
      (this._children[0] instanceof RenderBox
        ? this._children[0].getMaxIntrinsicWidth(height)
        : 0) * (this._widthFactor ?? 1)
    );
  }

  /**
   * 逆向: CY.getMinIntrinsicHeight(T)
   */
  override getMinIntrinsicHeight(width: number): number {
    return (
      (this._children[0] instanceof RenderBox
        ? this._children[0].getMinIntrinsicHeight(width)
        : 0) * (this._heightFactor ?? 1)
    );
  }

  /**
   * 逆向: CY.getMaxIntrinsicHeight(T)
   */
  override getMaxIntrinsicHeight(width: number): number {
    return (
      (this._children[0] instanceof RenderBox
        ? this._children[0].getMaxIntrinsicHeight(width)
        : 0) * (this._heightFactor ?? 1)
    );
  }

  // ────────────────────────────────────────────────────
  //  布局 — 逆向: CY.performLayout (layout_widgets.js:779-802)
  // ────────────────────────────────────────────────────

  /**
   * 执行布局。
   *
   * 逆向: CY.performLayout — 忠实翻译 amp 的 5 步流程:
   * 1. 取约束
   * 2. 判断 shrinkWidth / shrinkHeight
   * 3. 无子节点: 尺寸 = shrink ? 0 : Infinity, 再 constrain
   * 4. 有子节点: 用 loosen 约束布局子节点，尺寸 = shrink ? child * factor : Infinity, 再 constrain
   * 5. 子节点居中偏移
   *
   * amp 原始代码中对非有限值使用 `isFinite(t) ? Math.max(min, Math.min(max, t)) : maxWidth`
   * 的模式来避免 constrain 的 Infinity 断言。这里同样处理。
   */
  performLayout(): void {
    const T = this._lastConstraints!;

    // 逆向: line 782-783 — 判断是否收缩
    const shrinkWidth = this._widthFactor !== undefined || T.maxWidth === Number.POSITIVE_INFINITY;
    const shrinkHeight =
      this._heightFactor !== undefined || T.maxHeight === Number.POSITIVE_INFINITY;

    const child = this._children.length > 0 ? (this._children[0] as RenderBox) : undefined;

    if (!child) {
      // 逆向: lines 786-790 — 无子节点
      const desiredW = shrinkWidth ? 0 : Number.POSITIVE_INFINITY;
      const desiredH = shrinkHeight ? 0 : Number.POSITIVE_INFINITY;
      const w = Number.isFinite(desiredW)
        ? Math.max(T.minWidth, Math.min(T.maxWidth, desiredW))
        : T.maxWidth;
      const h = Number.isFinite(desiredH)
        ? Math.max(T.minHeight, Math.min(T.maxHeight, desiredH))
        : T.maxHeight;
      this.setSize(w, h);
      return;
    }

    // 逆向: line 793 — 用宽松约束布局子节点
    child.layout(T.loosen());

    // 逆向: lines 794-797 — 计算自身尺寸
    const desiredW = shrinkWidth
      ? child.size.width * (this._widthFactor ?? 1)
      : Number.POSITIVE_INFINITY;
    const desiredH = shrinkHeight
      ? child.size.height * (this._heightFactor ?? 1)
      : Number.POSITIVE_INFINITY;
    const w = Number.isFinite(desiredW)
      ? Math.max(T.minWidth, Math.min(T.maxWidth, desiredW))
      : T.maxWidth;
    const h = Number.isFinite(desiredH)
      ? Math.max(T.minHeight, Math.min(T.maxHeight, desiredH))
      : T.maxHeight;
    this.setSize(w, h);

    // 逆向: lines 799-801 — 子节点居中偏移
    const cx = (this._size.width - child.size.width) / 2;
    const cy = (this._size.height - child.size.height) / 2;
    child.setOffset(cx, cy);
  }
}

// ════════════════════════════════════════════════════
//  Align Widget
// ════════════════════════════════════════════════════

/** Align 构造函数参数。 */
interface AlignArgs {
  /** 可选标识键 */
  key?: Key;
  /** 可选宽度因子 */
  widthFactor?: number;
  /** 可选高度因子 */
  heightFactor?: number;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * Align Widget。
 *
 * 将子 Widget 居中对齐，可选按比例因子缩放自身尺寸。
 * 创建 {@link RenderPositionedBox} 作为渲染对象。
 *
 * 逆向: CY 对应的 Widget（layout_widgets.js Align 部分）
 */
export class Align extends Widget implements RenderObjectWidget {
  /** 宽度因子 */
  readonly widthFactor: number | undefined;

  /** 高度因子 */
  readonly heightFactor: number | undefined;

  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 Align Widget。
   *
   * @param args - 配置参数
   */
  constructor(args?: AlignArgs) {
    super({ key: args?.key });
    this.widthFactor = args?.widthFactor;
    this.heightFactor = args?.heightFactor;
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
   * @returns 新的 RenderPositionedBox 实例
   */
  createRenderObject(): RenderObject {
    return new RenderPositionedBox(this.widthFactor, this.heightFactor);
  }

  /**
   * 用当前 Widget 配置更新已有的渲染对象。
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    const ro = renderObject as RenderPositionedBox;
    ro.widthFactor = this.widthFactor;
    ro.heightFactor = this.heightFactor;
  }
}
