/**
 * Container — 带装饰和边距的通用容器。
 *
 * 逆向: SR (Widget) + qw (ContainerRenderObject) in layout_widgets.js:33-325
 *
 * 这是一个 SingleChildRenderObjectWidget，拥有专属 ContainerRenderObject，
 * 支持 width/height/padding/margin/decoration/constraints 属性。
 * 与 amp 原版架构完全对齐，**非**组合式 StatelessWidget。
 *
 * @module
 */

import type { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import type { BoxDecoration } from "./box-decoration.js";
import type { EdgeInsets } from "./edge-insets.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  ContainerRenderObject
// ════════════════════════════════════════════════════

/**
 * Container 专属渲染对象。
 *
 * 逆向: qw extends O9 (layout_widgets.js:71-325)
 *
 * 负责：
 * - 根据 margin + padding + border 计算子约束和子偏移
 * - 填充背景色
 * - 使用 Unicode box-drawing 字符绘制边框
 * - 完整的固有尺寸计算
 * - dim 模式支持
 */
export class ContainerRenderObject extends RenderBox {
  /** 逆向: qw._width */
  private _width: number | undefined;
  /** 逆向: qw._height */
  private _height: number | undefined;
  /** 逆向: qw._padding */
  private _padding: EdgeInsets | undefined;
  /** 逆向: qw._margin */
  private _margin: EdgeInsets | undefined;
  /** 逆向: qw._decoration */
  private _decoration: BoxDecoration | undefined;
  /** 逆向: qw._constraints (额外约束，非父约束) */
  private _extraConstraints: BoxConstraints | undefined;
  /** 逆向: qw._forceDim */
  private _forceDim: boolean = false;

  /**
   * 逆向: qw constructor(T, R, a, e, t, r)
   */
  constructor(
    width?: number,
    height?: number,
    padding?: EdgeInsets,
    margin?: EdgeInsets,
    decoration?: BoxDecoration,
    extraConstraints?: BoxConstraints,
  ) {
    super();
    this._width = width;
    this._height = height;
    this._padding = padding;
    this._margin = margin;
    this._decoration = decoration;
    this._extraConstraints = extraConstraints;
  }

  /**
   * 设置 dim 模式（用于非激活状态 UI）。
   *
   * 逆向: qw.setForceDim(T)
   */
  setForceDim(dim: boolean): void {
    if (this._forceDim !== dim) {
      this._forceDim = dim;
      this.markNeedsPaint();
    }
  }

  /**
   * 更新所有属性。
   *
   * 逆向: qw.updateProperties(T, R, a, e, t, r)
   */
  updateProperties(
    width?: number,
    height?: number,
    padding?: EdgeInsets,
    margin?: EdgeInsets,
    decoration?: BoxDecoration,
    extraConstraints?: BoxConstraints,
  ): void {
    this._width = width;
    this._height = height;
    this._padding = padding;
    this._margin = margin;
    this._decoration = decoration;
    this._extraConstraints = extraConstraints;
    this.markNeedsLayout();
    this.markNeedsPaint();
  }

  // ────────────────────────────────────────────────────
  //  布局 — 逆向: qw.performLayout (layout_widgets.js:89-135)
  // ────────────────────────────────────────────────────

  /**
   * 执行布局。
   *
   * 逆向: qw.performLayout — 忠实翻译 amp 的完整布局算法:
   * 1. 计算 margin/padding/border 占位
   * 2. 根据 width/height 和 _extraConstraints 收紧约束
   * 3. 扣除 margin+padding+border 得到子约束
   * 4. 布局子节点，设置偏移
   * 5. 计算自身尺寸（紧约束 vs 内容+边距）
   */
  performLayout(): void {
    const T = this._lastConstraints!;

    // 逆向: lines 93-99 — 计算各部分占位
    const marginH = this._margin?.horizontal ?? 0;
    const marginV = this._margin?.vertical ?? 0;
    const paddingH = this._padding?.horizontal ?? 0;
    const paddingV = this._padding?.vertical ?? 0;
    const border = this._decoration?.border;
    const borderH = (border?.left ? 1 : 0) + (border?.right ? 1 : 0);
    const borderV = (border?.top ? 1 : 0) + (border?.bottom ? 1 : 0);

    this.sendDebugData({
      margin: this._margin,
      padding: this._padding,
      decoration: this._decoration,
      width: this._width,
      height: this._height,
      constraints: this._extraConstraints,
    });

    // 逆向: lines 108-114 — 根据 width/height 收紧约束
    const c: BoxConstraints | undefined =
      this._width !== undefined || this._height !== undefined
        ? (this._extraConstraints?.tighten({
            width: this._width,
            height: this._height,
          }) ??
          BoxConstraints.tightFor({
            width: this._width,
            height: this._height,
          }))
        : this._extraConstraints;

    // 逆向: line 115 — enforce 外部约束
    const s = c ? T.enforce(c) : T;

    // 逆向: lines 116-118 — 计算子约束
    const innerMaxW = s.maxWidth - marginH - paddingH - borderH;
    const innerMaxH = s.maxHeight - marginV - paddingV - borderV;
    const innerConstraints = new BoxConstraints({
      minWidth: Math.max(0, s.minWidth - marginH - paddingH - borderH),
      maxWidth: Math.max(0, innerMaxW),
      minHeight: Math.max(0, s.minHeight - marginV - paddingV - borderV),
      maxHeight: Math.max(0, innerMaxH),
    });

    let contentW: number;
    let contentH: number;

    // 逆向: lines 121-130 — 布局子节点或计算无子节点尺寸
    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      child.layout(innerConstraints);
      contentW = child.size.width;
      contentH = child.size.height;

      // 逆向: lines 125-129 — 子偏移 = margin + border + padding
      const borderLeft = border?.left ? 1 : 0;
      const borderTop = border?.top ? 1 : 0;
      const offsetX = (this._margin?.left ?? 0) + borderLeft + (this._padding?.left ?? 0);
      const offsetY = (this._margin?.top ?? 0) + borderTop + (this._padding?.top ?? 0);
      child.setOffset(offsetX, offsetY);
    } else if (innerConstraints.maxWidth !== Infinity && innerConstraints.maxHeight !== Infinity) {
      // 逆向: line 130 — 无子节点且约束有限时取 max
      contentW = innerConstraints.maxWidth;
      contentH = innerConstraints.maxHeight;
    } else {
      contentW = innerConstraints.minWidth;
      contentH = innerConstraints.minHeight;
    }

    // 逆向: lines 131-133 — 计算自身尺寸
    let ownW: number;
    let ownH: number;

    if (s.minWidth === s.maxWidth && Number.isFinite(s.maxWidth)) {
      ownW = s.maxWidth;
    } else {
      ownW = contentW + paddingH + borderH + marginH;
    }

    if (s.minHeight === s.maxHeight && Number.isFinite(s.maxHeight)) {
      ownH = s.maxHeight;
    } else {
      ownH = contentH + paddingV + borderV + marginV;
    }

    // 逆向: line 134 — constrain 最终尺寸
    const finalSize = s.constrain(ownW, ownH);
    this.setSize(finalSize.width, finalSize.height);
  }

  // ────────────────────────────────────────────────────
  //  固有尺寸 — 逆向: qw.getMinIntrinsicWidth/Height 等
  // ────────────────────────────────────────────────────

  /**
   * 逆向: qw.getMinIntrinsicWidth (layout_widgets.js:136-149)
   */
  override getMinIntrinsicWidth(height: number): number {
    if (this._width !== undefined) return this._width;
    if (this._extraConstraints && this._extraConstraints.minWidth !== 0)
      return this._extraConstraints.minWidth;

    const border = this._decoration?.border;
    const marginH = this._margin?.horizontal ?? 0;
    const paddingH = this._padding?.horizontal ?? 0;
    const borderH = (border?.left ? 1 : 0) + (border?.right ? 1 : 0);

    let childWidth = 0;
    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      const innerH = Math.max(
        0,
        height -
          (this._margin?.vertical ?? 0) -
          (this._padding?.vertical ?? 0) -
          ((border?.top ? 1 : 0) + (border?.bottom ? 1 : 0)),
      );
      childWidth = child.getMinIntrinsicWidth(innerH);
    }
    return childWidth + marginH + paddingH + borderH;
  }

  /**
   * 逆向: qw.getMaxIntrinsicWidth (layout_widgets.js:151-166)
   */
  override getMaxIntrinsicWidth(height: number): number {
    if (this._width !== undefined) return this._width;
    if (this._extraConstraints && this._extraConstraints.maxWidth !== Infinity)
      return this._extraConstraints.maxWidth;

    const border = this._decoration?.border;
    const marginH = this._margin?.horizontal ?? 0;
    const paddingH = this._padding?.horizontal ?? 0;
    const borderH = (border?.left ? 1 : 0) + (border?.right ? 1 : 0);

    let childWidth = 0;
    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      const innerH = Math.max(
        0,
        height -
          (this._margin?.vertical ?? 0) -
          (this._padding?.vertical ?? 0) -
          ((border?.top ? 1 : 0) + (border?.bottom ? 1 : 0)),
      );
      childWidth = child.getMaxIntrinsicWidth(innerH);
    }
    // 逆向: line 164 — 如果 childWidth 是 Infinity，直接返回
    if (childWidth === Infinity) return Infinity;
    return childWidth + marginH + paddingH + borderH;
  }

  /**
   * 逆向: qw.getMinIntrinsicHeight (layout_widgets.js:167-182)
   */
  override getMinIntrinsicHeight(width: number): number {
    if (this._height !== undefined) return this._height;
    if (this._extraConstraints && this._extraConstraints.minHeight !== 0)
      return this._extraConstraints.minHeight;

    const border = this._decoration?.border;
    const marginV = this._margin?.vertical ?? 0;
    const paddingV = this._padding?.vertical ?? 0;
    const borderV = (border?.top ? 1 : 0) + (border?.bottom ? 1 : 0);

    let childHeight = 0;
    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      const innerW = Math.max(
        0,
        width -
          (this._margin?.horizontal ?? 0) -
          (this._padding?.horizontal ?? 0) -
          ((border?.left ? 1 : 0) + (border?.right ? 1 : 0)),
      );
      childHeight = child.getMinIntrinsicHeight(innerW);
    }
    const result = childHeight + marginV + paddingV + borderV;
    // 逆向: line 181 — 如果 _extraConstraints 有 maxHeight，取较小值
    if (this._extraConstraints && this._extraConstraints.maxHeight !== Infinity) {
      return Math.min(result, this._extraConstraints.maxHeight);
    }
    return result;
  }

  /**
   * 逆向: qw.getMaxIntrinsicHeight (layout_widgets.js:184-199)
   */
  override getMaxIntrinsicHeight(width: number): number {
    if (this._height !== undefined) return this._height;
    if (this._extraConstraints && this._extraConstraints.maxHeight !== Infinity)
      return this._extraConstraints.maxHeight;

    const border = this._decoration?.border;
    const marginV = this._margin?.vertical ?? 0;
    const paddingV = this._padding?.vertical ?? 0;
    const borderV = (border?.top ? 1 : 0) + (border?.bottom ? 1 : 0);

    let childHeight = 0;
    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      const innerW = Math.max(
        0,
        width -
          (this._margin?.horizontal ?? 0) -
          (this._padding?.horizontal ?? 0) -
          ((border?.left ? 1 : 0) + (border?.right ? 1 : 0)),
      );
      childHeight = child.getMaxIntrinsicHeight(innerW);
    }
    // 逆向: line 197 — Infinity 直接返回
    if (childHeight === Infinity) return Infinity;
    return childHeight + marginV + paddingV + borderV;
  }

  // ────────────────────────────────────────────────────
  //  绘制 — 逆向: qw.paint + qw._paintBorder
  // ────────────────────────────────────────────────────

  /**
   * 绘制背景 + 边框。
   *
   * 逆向: qw.paint (layout_widgets.js:200-211)
   * 顺序: 1. 填充背景色 → 2. 绘制边框 → 3. super.paint 绘制子节点
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const x = Math.floor(offsetX);
    const y = Math.floor(offsetY);

    // 逆向: lines 203-207 — 填充背景色
    if (this._decoration?.color) {
      screen.fill(x, y, this._size.width, this._size.height, " ", {
        bg: this._decoration.color,
      });
    }

    // 逆向: lines 209 — 绘制边框
    if (this._decoration?.border) {
      this._paintBorder(screen, x, y);
    }
  }

  /**
   * 绘制 Unicode box-drawing 边框。
   *
   * 逆向: qw._paintBorder (layout_widgets.js:212-318)
   *
   * 严格对齐 amp 的字符选择逻辑:
   * - 水平线: ─ (width=1) / ━ (width≥2)
   * - 垂直线: │ (width=1) / ┃ (width≥2)
   * - 圆角 (style="rounded"): ╭╮╰╯
   * - 直角 thin (style="solid", width=1): ┌┐└┘
   * - 直角 thick (style="solid", width≥2): ┏┓┗┛
   */
  private _paintBorder(screen: Screen, x: number, y: number): void {
    const border = this._decoration!.border!;
    const w = this._size.width;
    const h = this._size.height;

    // 逆向: lines 216-222 — 创建样式对象
    const makeStyle = (color: Color): { fg: Color; bg?: Color; dim?: boolean } => {
      const result: { fg: Color; bg?: Color; dim?: boolean } = { fg: color };
      if (this._decoration?.color) result.bg = this._decoration.color;
      if (this._forceDim) result.dim = true;
      return result;
    };

    // 逆向: lines 224-235 — 水平线字符选择
    const hChar = (width: number): string => {
      switch (width) {
        case 1:
          return "\u2500"; // ─
        case 2:
          return "\u2501"; // ━
        case 3:
          return "\u2501"; // ━
        default:
          return "\u2501"; // ━
      }
    };

    // 逆向: lines 236-247 — 垂直线字符选择
    const vChar = (width: number): string => {
      switch (width) {
        case 1:
          return "\u2502"; // │
        case 2:
          return "\u2503"; // ┃
        case 3:
          return "\u2503"; // ┃
        default:
          return "\u2503"; // ┃
      }
    };

    // 逆向: lines 248-270 — 角落字符选择
    const cornerChars = (
      width: number,
      rounded: boolean,
    ): { tl: string; tr: string; bl: string; br: string } => {
      if (width === 1) {
        return rounded
          ? { tl: "\u256D", tr: "\u256E", bl: "\u2570", br: "\u256F" } // ╭╮╰╯
          : { tl: "\u250C", tr: "\u2510", bl: "\u2514", br: "\u2518" }; // ┌┐└┘
      } else {
        return rounded
          ? { tl: "\u256D", tr: "\u256E", bl: "\u2570", br: "\u256F" } // ╭╮╰╯
          : { tl: "\u250F", tr: "\u2513", bl: "\u2517", br: "\u251B" }; // ┏┓┗┛
      }
    };

    // 逆向: lines 271-277 — 上边框
    if (border.top) {
      const style = makeStyle(border.top.color);
      const ch = hChar(border.top.width);
      const startX = border.left ? 1 : 0;
      const endX = border.right ? w - 1 : w;
      for (let i = startX; i < endX; i++) {
        screen.mergeBorderChar(x + i, y, ch, style);
      }
    }

    // 逆向: lines 278-284 — 下边框
    if (border.bottom) {
      const style = makeStyle(border.bottom.color);
      const ch = hChar(border.bottom.width);
      const startX = border.left ? 1 : 0;
      const endX = border.right ? w - 1 : w;
      for (let i = startX; i < endX; i++) {
        screen.mergeBorderChar(x + i, y + h - 1, ch, style);
      }
    }

    // 逆向: lines 285-291 — 左边框
    if (border.left) {
      const style = makeStyle(border.left.color);
      const ch = vChar(border.left.width);
      const startY = border.top ? 1 : 0;
      const endY = border.bottom ? h - 1 : h;
      for (let i = startY; i < endY; i++) {
        screen.mergeBorderChar(x, y + i, ch, style);
      }
    }

    // 逆向: lines 292-298 — 右边框
    if (border.right) {
      const style = makeStyle(border.right.color);
      const ch = vChar(border.right.width);
      const startY = border.top ? 1 : 0;
      const endY = border.bottom ? h - 1 : h;
      for (let i = startY; i < endY; i++) {
        screen.mergeBorderChar(x + w - 1, y + i, ch, style);
      }
    }

    // 逆向: lines 299-317 — 角落
    const isRounded = border.top?.style === "rounded";
    const maxBorderWidth = Math.max(
      border.top?.width ?? 1,
      border.right?.width ?? 1,
      border.bottom?.width ?? 1,
      border.left?.width ?? 1,
    );
    const corners = cornerChars(maxBorderWidth, isRounded);

    if (border.top && border.left) {
      const style = makeStyle(border.top.color);
      screen.mergeBorderChar(x, y, corners.tl, style);
    }
    if (border.top && border.right) {
      const style = makeStyle(border.top.color);
      screen.mergeBorderChar(x + w - 1, y, corners.tr, style);
    }
    if (border.bottom && border.left) {
      const style = makeStyle(border.bottom.color);
      screen.mergeBorderChar(x, y + h - 1, corners.bl, style);
    }
    if (border.bottom && border.right) {
      const style = makeStyle(border.bottom.color);
      screen.mergeBorderChar(x + w - 1, y + h - 1, corners.br, style);
    }
  }

  // ────────────────────────────────────────────────────
  //  命中测试 — 逆向: qw.hitTest
  // ────────────────────────────────────────────────────

  // hitTest 继承自 RenderObject — 逆向: qw.hitTest(T,R,a,e) { return super.hitTest(T,R,a,e); }

  // ────────────────────────────────────────────────────
  //  清理 — 逆向: qw.dispose
  // ────────────────────────────────────────────────────

  /**
   * 逆向: qw.dispose — 清理内部引用
   */
  override dispose(): void {
    this._decoration = undefined;
    this._extraConstraints = undefined;
    this._padding = undefined;
    this._margin = undefined;
    super.dispose();
  }
}

// ════════════════════════════════════════════════════
//  Container Widget
// ════════════════════════════════════════════════════

/** Container 构造函数参数。 */
interface ContainerArgs {
  /** 可选标识键 */
  key?: Key;
  /** 可选子 Widget */
  child?: WidgetInterface;
  /** 可选固定宽度 */
  width?: number;
  /** 可选固定高度 */
  height?: number;
  /** 可选内边距 */
  padding?: EdgeInsets;
  /** 可选外边距 */
  margin?: EdgeInsets;
  /** 可选装饰（背景色、边框） */
  decoration?: BoxDecoration;
  /** 可选额外约束 */
  constraints?: BoxConstraints;
}

/**
 * Container Widget。
 *
 * 逆向: SR extends _t (layout_widgets.js:33-70)
 *
 * 这是一个 SingleChildRenderObjectWidget，创建 {@link ContainerRenderObject}
 * 作为渲染对象。支持 width/height/padding/margin/decoration/constraints。
 */
export class Container extends Widget implements RenderObjectWidget {
  /** 固定宽度 */
  readonly width: number | undefined;
  /** 固定高度 */
  readonly height: number | undefined;
  /** 内边距 */
  readonly padding: EdgeInsets | undefined;
  /** 外边距 */
  readonly margin: EdgeInsets | undefined;
  /** 装饰 */
  readonly decoration: BoxDecoration | undefined;
  /** 额外约束 */
  readonly constraints: BoxConstraints | undefined;
  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 Container Widget。
   *
   * 逆向: SR constructor({ key, child, width, height, padding, margin, decoration, constraints })
   *
   * @param args - 配置参数
   */
  constructor(args?: ContainerArgs) {
    super({ key: args?.key });
    this.width = args?.width;
    this.height = args?.height;
    this.padding = args?.padding;
    this.margin = args?.margin;
    this.decoration = args?.decoration;
    this.constraints = args?.constraints;
    this.child = args?.child;
  }

  /**
   * 创建关联的元素。
   *
   * 逆向: SR.createElement() → new h1T(this)
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * 逆向: SR.createRenderObject() → new qw(width, height, padding, margin, decoration, constraints)
   */
  createRenderObject(): RenderObject {
    return new ContainerRenderObject(
      this.width,
      this.height,
      this.padding,
      this.margin,
      this.decoration,
      this.constraints,
    );
  }

  /**
   * 更新渲染对象。
   *
   * 逆向: SR.updateRenderObject(T) → T.updateProperties(...)
   */
  updateRenderObject(renderObject: RenderObject): void {
    if (!(renderObject instanceof ContainerRenderObject)) {
      throw new Error("renderObject must be an instance of ContainerRenderObject");
    }
    renderObject.updateProperties(
      this.width,
      this.height,
      this.padding,
      this.margin,
      this.decoration,
      this.constraints,
    );
  }
}
