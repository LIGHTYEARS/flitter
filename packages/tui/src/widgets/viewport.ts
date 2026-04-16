/**
 * Viewport 滚动视口组件。
 *
 * 逆向: MY (Viewport Widget) + g1T (RenderViewport) + $1T (ViewportWithPosition Widget)
 *       + v1T (RenderViewportWithPosition) in interactive_widgets.js:83-305
 *
 * 以及辅助类 ClipScreen (逆向: zm in text_rendering.js:1019-1097)
 *
 * Viewport 将子节点放入一个可滚动的裁剪区域中。子节点可以比视口更大，
 * 通过 scrollOffset 控制哪一部分可见。ScrollController 提供自动跟随、
 * 偏移钳位等功能。
 *
 * ViewportWithPosition 在 Viewport 基础上增加了 position 属性，
 * 支持 "bottom" 定位模式——当内容不足以填满视口时，内容贴底而非贴顶。
 *
 * @module
 */

import type { Cell } from "../screen/cell.js";
import type { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import type { TextStyle } from "../screen/text-style.js";
import type { ScrollController } from "../scroll/scroll-controller.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  ClipScreen — 逆向: zm (text_rendering.js:1019-1097)
// ════════════════════════════════════════════════════

/**
 * 裁剪区域屏幕包装器。
 *
 * 逆向: zm extends Zx (text_rendering.js:1019-1097)
 *
 * 包装一个 {@link Screen}，将所有绘制操作限制在指定的矩形区域内。
 * 超出裁剪区域的绘制操作被静默丢弃。用于 Viewport 的 paint 阶段，
 * 确保子节点在视口外的内容不会泄漏到其他区域。
 */
export class ClipScreen {
  /** 被包装的原始屏幕 */
  private _screen: Screen;
  /** 裁剪区域左上角 X */
  private _clipX: number;
  /** 裁剪区域左上角 Y */
  private _clipY: number;
  /** 裁剪区域宽度 */
  private _clipWidth: number;
  /** 裁剪区域高度 */
  private _clipHeight: number;

  /**
   * 逆向: zm constructor(T, R, a, e, t) — T=screen, R=clipX, a=clipY, e=width, t=height
   */
  constructor(screen: Screen, clipX: number, clipY: number, clipWidth: number, clipHeight: number) {
    this._screen = screen;
    this._clipX = clipX;
    this._clipY = clipY;
    this._clipWidth = clipWidth;
    this._clipHeight = clipHeight;
  }

  /** 屏幕宽度——委托到原始屏幕 */
  get width(): number {
    return this._screen.width;
  }

  /** 屏幕高度——委托到原始屏幕 */
  get height(): number {
    return this._screen.height;
  }

  /**
   * 逆向: zm.setChar — 仅当坐标在裁剪区域内时才委托写入
   */
  writeChar(x: number, y: number, char: string, style: TextStyle, width: number = 1): void {
    if (
      x >= this._clipX &&
      x < this._clipX + this._clipWidth &&
      y >= this._clipY &&
      y < this._clipY + this._clipHeight
    ) {
      this._screen.writeChar(x, y, char, style, width);
    }
  }

  /**
   * 逆向: zm.setCell — 仅当坐标在裁剪区域内时才委托写入
   */
  setCell(x: number, y: number, cell: Cell): void {
    if (
      x >= this._clipX &&
      x < this._clipX + this._clipWidth &&
      y >= this._clipY &&
      y < this._clipY + this._clipHeight
    ) {
      this._screen.setCell(x, y, cell);
    }
  }

  /**
   * 逆向: zm.getCell — 委托到原始屏幕
   */
  getCell(x: number, y: number): Cell {
    return this._screen.getCell(x, y);
  }

  /**
   * 逆向: zm.mergeBorderChar — 仅当坐标在裁剪区域内时才委托写入
   */
  mergeBorderChar(
    x: number,
    y: number,
    char: string,
    style: { fg?: Color; bg?: Color; dim?: boolean },
  ): void {
    if (
      x >= this._clipX &&
      x < this._clipX + this._clipWidth &&
      y >= this._clipY &&
      y < this._clipY + this._clipHeight
    ) {
      this._screen.mergeBorderChar(x, y, char, style);
    }
  }

  /**
   * 逆向: zm.fill — 将填充区域与裁剪区域取交集后委托写入
   */
  fill(
    x: number,
    y: number,
    w: number,
    h: number,
    char: string,
    style: { fg?: Color; bg?: Color; dim?: boolean },
  ): void {
    const clippedX = Math.max(x, this._clipX);
    const clippedY = Math.max(y, this._clipY);
    const clippedRight = Math.min(x + w, this._clipX + this._clipWidth);
    const clippedBottom = Math.min(y + h, this._clipY + this._clipHeight);

    if (clippedX < clippedRight && clippedY < clippedBottom) {
      this._screen.fill(
        clippedX,
        clippedY,
        clippedRight - clippedX,
        clippedBottom - clippedY,
        char,
        style,
      );
    }
  }

  /**
   * 逆向: zm.clear — 委托到原始屏幕
   */
  clear(): void {
    this._screen.clear();
  }

  /**
   * 逆向: zm.present — 委托到原始屏幕
   */
  present(): void {
    this._screen.present();
  }

  /**
   * 逆向: zm.resize — 委托到原始屏幕
   */
  resize(newWidth: number, newHeight: number): void {
    this._screen.resize(newWidth, newHeight);
  }

  /**
   * 逆向: zm.getClipRegion — 返回当前裁剪区域信息
   */
  getClipRegion(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: this._clipX,
      y: this._clipY,
      width: this._clipWidth,
      height: this._clipHeight,
    };
  }

  /** 获取底层屏幕的 needsFullRefresh 属性 */
  get needsFullRefresh(): boolean {
    return this._screen.needsFullRefresh;
  }

  /** 设置底层屏幕的 needsFullRefresh 属性 */
  set needsFullRefresh(value: boolean) {
    this._screen.needsFullRefresh = value;
  }

  /** 获取底层屏幕的 back buffer */
  get back(): Screen["back"] {
    return this._screen.back;
  }

  /** 获取底层屏幕的 front buffer */
  get front(): Screen["front"] {
    return this._screen.front;
  }
}

// ════════════════════════════════════════════════════
//  RenderViewport — 逆向: g1T (interactive_widgets.js:108-175)
// ════════════════════════════════════════════════════

/**
 * Viewport 渲染对象。
 *
 * 逆向: g1T extends O9 (interactive_widgets.js:108-175)
 *
 * 管理一个可滚动的单子视口：
 * - 布局时给子节点无限约束（在滚动轴方向），保留交叉轴约束
 * - 通过 scrollOffset 控制子节点偏移
 * - 绘制时使用 ClipScreen 裁剪到视口范围
 * - 与 ScrollController 集成，支持 followMode 和自动范围管理
 */
export class RenderViewport extends RenderBox {
  /** 逆向: g1T._axisDirection */
  private _axisDirection: "vertical" | "horizontal";
  /** 逆向: g1T._scrollOffset */
  private _scrollOffset: number;
  /** 逆向: g1T._scrollController */
  private _scrollController: ScrollController | undefined;

  /**
   * 逆向: g1T constructor(T, R, a) — T=axisDirection, R=scrollOffset, a=scrollController
   */
  constructor(
    axisDirection: "vertical" | "horizontal",
    scrollOffset: number,
    scrollController?: ScrollController,
  ) {
    super();
    this._axisDirection = axisDirection;
    this._scrollOffset = scrollOffset;
    this._scrollController = scrollController;
  }

  /**
   * 更新所有属性。如果任何值发生变化则标记需要重新布局。
   *
   * 逆向: g1T.updateProperties(T, R, a)
   */
  updateProperties(
    axisDirection: "vertical" | "horizontal",
    scrollOffset: number,
    scrollController?: ScrollController,
  ): void {
    let changed = false;
    if (this._axisDirection !== axisDirection) {
      this._axisDirection = axisDirection;
      changed = true;
    }
    if (this._scrollOffset !== scrollOffset) {
      this._scrollOffset = scrollOffset;
      changed = true;
    }
    if (this._scrollController !== scrollController) {
      this._scrollController = scrollController;
      changed = true;
    }
    if (changed) {
      this.markNeedsLayout();
    }
  }

  /**
   * 逆向: g1T.axisDirection getter
   */
  get axisDirection(): "vertical" | "horizontal" {
    return this._axisDirection;
  }

  /**
   * 逆向: g1T.scrollOffset getter
   */
  get scrollOffset(): number {
    return this._scrollOffset;
  }

  /**
   * 执行布局。
   *
   * 逆向: g1T.performLayout (interactive_widgets.js:123-141)
   *
   * 1. 断言约束存在
   * 2. 无子节点: 尺寸 = minWidth x minHeight
   * 3. 有子节点且子有 getTotalContentHeight:
   *    - 更新 scrollController.maxScrollExtent
   *    - followMode 时自动跟到底部
   * 4. 给子节点布局（滚动轴无限约束）
   * 5. 处理 bottom 定位
   * 6. 设置子偏移为 (0, -scrollOffset) (vertical)
   * 7. 自身尺寸 = maxWidth x maxHeight (viewport 填满可用空间)
   */
  performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) {
      throw new Error("performLayout called without constraints");
    }

    if (this._children.length === 0) {
      this.setSize(constraints.minWidth, constraints.minHeight);
      return;
    }

    const child = this._children[0] as RenderBox;

    // 逆向: lines 131-137 — ScrollController 集成
    if (this._scrollController && typeof (child as any).getTotalContentHeight === "function") {
      const totalHeight = (child as any).getTotalContentHeight() as number;
      const maxScroll = Math.max(0, totalHeight - constraints.maxHeight);
      const wasAtBottom = this._scrollController.atBottom;

      this._scrollController.updateMaxScrollExtent(maxScroll);

      if (this._scrollController.followMode && wasAtBottom) {
        this._scrollController.jumpTo(maxScroll);
      } else if (this._scrollController.offset > maxScroll) {
        this._scrollController.jumpTo(maxScroll);
      }

      this._scrollOffset = this._scrollController.offset;
    }

    // 逆向: line 138 — 传递 scrollOffset 给子节点 (如果子支持)
    if (typeof (child as any).setScrollOffset === "function") {
      (child as any).setScrollOffset(this._scrollOffset);
    }

    // 逆向: line 139 — 布局子节点 (传入父约束，不修改)
    child.layout(constraints);

    // 逆向: line 139 — 处理 bottom 定位
    this._handleBottomPositioning(constraints, child);

    // 逆向: lines 140-141 — 设置子偏移并确定自身尺寸
    const offsetOnAxis = -this._scrollOffset;
    child.setOffset(0, offsetOnAxis);
    this.setSize(constraints.maxWidth, constraints.maxHeight);
  }

  /**
   * 处理 bottom 定位。
   *
   * 逆向: g1T.handleBottomPositioning(T, R) (interactive_widgets.js:143-152)
   *
   * 当子节点支持 getTotalContentHeight 和 getPosition，
   * 且内容高度 <= 视口高度且 position === "bottom" 时，
   * 将 scrollOffset 设为负值使内容贴底。
   */
  private _handleBottomPositioning(constraints: BoxConstraints, child: RenderBox): void {
    if (
      typeof (child as any).getTotalContentHeight !== "function" ||
      typeof (child as any).getPosition !== "function"
    ) {
      return;
    }

    const viewportHeight = constraints.maxHeight;
    const contentHeight = (child as any).getTotalContentHeight() as number;
    const position = (child as any).getPosition() as string;

    if (contentHeight <= viewportHeight && position === "bottom") {
      const negativeOffset = -(viewportHeight - contentHeight);
      this._scrollOffset = negativeOffset;
    }
  }

  /**
   * 获取最大滚动范围。
   *
   * 逆向: g1T.getMaxScrollExtent (interactive_widgets.js:168-171)
   */
  getMaxScrollExtent(): number {
    if (this._children.length === 0) return 0;
    return (this._children[0] as any)?.totalScrollExtent ?? 0;
  }

  /**
   * 绘制视口及子树（带裁剪）。
   *
   * 逆向: g1T.paint(T, R, a) (interactive_widgets.js:153-161)
   *
   * 遍历子节点，对有 offset 属性的子节点创建 ClipScreen 裁剪上下文，
   * 将子节点绘制限制在视口矩形范围内。
   */
  override paint(screen: Screen, offsetX: number = 0, offsetY: number = 0): void {
    this._needsPaint = false;
    this.performPaint(screen, offsetX, offsetY);

    for (const child of this._children) {
      if ("offset" in child) {
        const renderChild = child as RenderBox;
        const childOffset = renderChild.offset;
        const cx = offsetX + childOffset.x;
        const cy = offsetY + childOffset.y;

        // 逆向: line 158 — 创建 ClipScreen 裁剪上下文
        const clipScreen = new ClipScreen(
          screen,
          offsetX,
          offsetY,
          this._size.width,
          this._size.height,
        );

        // 传入 ClipScreen 作为裁剪后的屏幕
        child.paint(clipScreen as unknown as Screen, cx, cy);
      } else {
        child.paint(screen, offsetX, offsetY);
      }
    }
  }

  /**
   * 逆向: g1T.dispose (interactive_widgets.js:172-174)
   */
  override dispose(): void {
    super.dispose();
  }
}

// ════════════════════════════════════════════════════
//  Viewport Widget — 逆向: MY (interactive_widgets.js:83-106)
// ════════════════════════════════════════════════════

/** Viewport 构造函数参数。 */
interface ViewportArgs {
  /** 可选标识键 */
  key?: Key;
  /** 子 Widget */
  child?: WidgetInterface;
  /** 滚动轴方向，默认 "vertical" */
  axisDirection?: "vertical" | "horizontal";
  /** 初始滚动偏移，默认 0 */
  offset?: number;
  /** 滚动控制器 */
  scrollController?: ScrollController;
}

/**
 * Viewport Widget。
 *
 * 逆向: MY extends _t (interactive_widgets.js:83-106)
 *
 * 创建一个滚动视口，子节点在滚动轴上不受约束。
 * 通过 scrollController 或 offset 控制可见区域。
 */
export class Viewport extends Widget implements RenderObjectWidget {
  /** 滚动轴方向 */
  readonly axisDirection: "vertical" | "horizontal";
  /** 初始滚动偏移 */
  readonly offset: number;
  /** 滚动控制器 */
  readonly scrollController: ScrollController | undefined;
  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 逆向: MY constructor(T, { key, axisDirection, offset, scrollController })
   */
  constructor(args: ViewportArgs = {}) {
    super({ key: args.key });
    this.axisDirection = args.axisDirection ?? "vertical";
    this.offset = args.offset ?? 0;
    this.scrollController = args.scrollController;
    this.child = args.child;
  }

  /**
   * 创建关联的元素。
   *
   * 逆向: MY 继承 _t 的 createElement → SingleChildRenderObjectElement
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * 逆向: MY.createRenderObject() → new g1T(axisDirection, offset, scrollController)
   */
  createRenderObject(): RenderObject {
    return new RenderViewport(this.axisDirection, this.offset, this.scrollController);
  }

  /**
   * 更新渲染对象。
   *
   * 逆向: MY.updateRenderObject(T) → T.updateProperties(axisDirection, offset, scrollController)
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderViewport).updateProperties(
      this.axisDirection,
      this.offset,
      this.scrollController,
    );
  }
}

// ════════════════════════════════════════════════════
//  RenderViewportWithPosition — 逆向: v1T (interactive_widgets.js:203-305)
// ════════════════════════════════════════════════════

/**
 * 带定位的 Viewport 渲染对象。
 *
 * 逆向: v1T extends O9 (interactive_widgets.js:203-305)
 *
 * 相比 {@link RenderViewport}，增加了 position 属性支持 "bottom" 定位。
 * 当 position === "bottom" 且内容不足以填满视口时，内容贴底显示。
 * 此外，子节点在滚动轴方向上获得无限约束（允许内容超出视口），
 * 而自身尺寸根据 position 和子节点实际大小动态确定。
 */
export class RenderViewportWithPosition extends RenderBox {
  /** 逆向: v1T._axisDirection */
  private _axisDirection: "vertical" | "horizontal";
  /** 逆向: v1T._scrollOffset */
  private _scrollOffset: number;
  /** 逆向: v1T._scrollController */
  private _scrollController: ScrollController | undefined;
  /** 逆向: v1T._position */
  private _position: "top" | "bottom";

  /**
   * 逆向: v1T.scrollController getter (interactive_widgets.js:208-210)
   */
  get scrollController(): ScrollController | undefined {
    return this._scrollController;
  }

  /**
   * 逆向: v1T constructor(T, R, a, e) — T=axis, R=offset, a=controller, e=position
   */
  constructor(
    axisDirection: "vertical" | "horizontal",
    scrollOffset: number,
    scrollController?: ScrollController,
    position: "top" | "bottom" = "top",
  ) {
    super();
    this._axisDirection = axisDirection;
    this._scrollOffset = scrollOffset;
    this._scrollController = scrollController;
    this._position = position;
  }

  /**
   * 更新属性。
   *
   * 逆向: v1T.updateProperties(T, R, a, e) (interactive_widgets.js:215-219)
   *
   * axis/controller/position 变化 -> markNeedsLayout
   * offset 变化 -> updateChildOffset (不需要重新布局)
   */
  updateProperties(
    axisDirection: "vertical" | "horizontal",
    scrollOffset: number,
    scrollController?: ScrollController,
    position: "top" | "bottom" = "top",
  ): void {
    if (this._axisDirection !== axisDirection) {
      this._axisDirection = axisDirection;
      this.markNeedsLayout();
    }
    if (this._scrollController !== scrollController) {
      this._scrollController = scrollController;
      this.markNeedsLayout();
    }
    if (this._position !== position) {
      this._position = position;
      this.markNeedsLayout();
    }
    if (this._scrollOffset !== scrollOffset) {
      this._scrollOffset = scrollOffset;
      this._updateChildOffset();
    }
  }

  /**
   * 更新子节点偏移量（不触发重新布局）。
   *
   * 逆向: v1T.updateChildOffset() (interactive_widgets.js:221-228)
   */
  private _updateChildOffset(): void {
    if (this._children.length === 0) return;

    const child = this._children[0] as RenderBox;
    let offsetX = 0;
    let offsetY = 0;

    if (this._axisDirection === "vertical") {
      offsetY = -this._scrollOffset;
    } else {
      offsetX = -this._scrollOffset;
    }

    child.setOffset(offsetX, offsetY);
  }

  /**
   * 执行布局。
   *
   * 逆向: v1T.performLayout() (interactive_widgets.js:229-251)
   *
   * 1. 无子节点: 尺寸 = minWidth x minHeight
   * 2. 子节点在滚动轴获得无限约束
   * 3. 自身尺寸根据 position 和子节点实际大小确定
   * 4. ScrollController 集成: 更新 maxScrollExtent，处理 followMode
   * 5. handleBottomPositioning 处理贴底
   * 6. updateChildOffset 设置子偏移
   */
  performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) {
      throw new Error("performLayout called without constraints");
    }

    if (this._children.length === 0) {
      this.setSize(constraints.minWidth, constraints.minHeight);
      return;
    }

    const child = this._children[0] as RenderBox;

    // 逆向: lines 236-242 — 子节点在滚动轴方向获得无限约束
    if (this._axisDirection === "vertical") {
      const childConstraints = new BoxConstraints({
        minWidth: constraints.minWidth,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: Number.POSITIVE_INFINITY,
      });
      child.layout(childConstraints);
    } else {
      const childConstraints = new BoxConstraints({
        minWidth: 0,
        maxWidth: Number.POSITIVE_INFINITY,
        minHeight: constraints.minHeight,
        maxHeight: constraints.maxHeight,
      });
      child.layout(childConstraints);
    }

    // 逆向: lines 243-244 — 计算自身尺寸
    let ownWidth: number;
    let ownHeight: number;

    if (this._axisDirection === "vertical") {
      ownWidth = constraints.maxWidth;
      ownHeight =
        this._position !== "bottom"
          ? Math.min(child.size.height, constraints.maxHeight)
          : constraints.maxHeight;
    } else {
      ownWidth = constraints.maxWidth;
      ownHeight = Math.min(child.size.height, constraints.maxHeight);
    }

    this.setSize(ownWidth, ownHeight);

    // 逆向: lines 245-249 — ScrollController 集成
    if (this._scrollController) {
      const totalExtent = this.totalScrollExtent;
      const wasAtBottom = this._scrollController.atBottom;

      this._scrollController.updateMaxScrollExtent(totalExtent);

      if (this._scrollController.followMode && wasAtBottom) {
        this._scrollController.jumpTo(totalExtent);
      } else if (this._scrollController.offset > totalExtent) {
        this._scrollController.jumpTo(totalExtent);
      }

      this._scrollOffset = this._scrollController.offset;
    }

    // 逆向: line 251 — 处理 bottom 定位 + 更新子偏移
    this._handleBottomPositioning(constraints, child);
    this._updateChildOffset();
  }

  /**
   * 处理 bottom 定位。
   *
   * 逆向: v1T.handleBottomPositioning(T, R) (interactive_widgets.js:253-261)
   *
   * 当 position !== "bottom" 时直接返回。
   * 否则当内容 <= 视口时，设置负 scrollOffset 使内容贴底。
   */
  private _handleBottomPositioning(constraints: BoxConstraints, child: RenderBox): void {
    if (this._position !== "bottom") return;

    const viewportSize =
      this._axisDirection === "vertical" ? constraints.maxHeight : constraints.maxWidth;

    const contentSize = this._axisDirection === "vertical" ? child.size.height : child.size.width;

    if (contentSize <= viewportSize) {
      const negativeOffset = -(viewportSize - contentSize);
      this._scrollOffset = negativeOffset;
    }
  }

  /**
   * 总滚动范围。
   *
   * 逆向: v1T.totalScrollExtent getter (interactive_widgets.js:262-277)
   *
   * 返回 max(0, childSize - viewportSize)，对 NaN/Infinity 做守卫。
   */
  get totalScrollExtent(): number {
    if (this._children.length === 0) return 0;

    const child = this._children[0] as RenderBox;

    if (
      child.size.width <= 0 ||
      child.size.height <= 0 ||
      this._size.width <= 0 ||
      this._size.height <= 0
    ) {
      return 0;
    }

    if (this._axisDirection === "vertical") {
      const childHeight = child.size.height;
      const viewportHeight = this._size.height;
      if (!Number.isFinite(childHeight) || !Number.isFinite(viewportHeight)) {
        return 0;
      }
      return Math.max(0, childHeight - viewportHeight);
    } else {
      const childWidth = child.size.width;
      const viewportWidth = this._size.width;
      if (!Number.isFinite(childWidth) || !Number.isFinite(viewportWidth)) {
        return 0;
      }
      return Math.max(0, childWidth - viewportWidth);
    }
  }

  // ────────────────────────────────────────────────────
  //  固有尺寸 — 逆向: v1T intrinsic methods (interactive_widgets.js:278-298)
  // ────────────────────────────────────────────────────

  /**
   * 逆向: v1T.getMinIntrinsicWidth(T) (interactive_widgets.js:278-282)
   */
  override getMinIntrinsicWidth(height: number): number {
    if (this._children.length === 0) return 0;
    const child = this._children[0] as RenderBox;
    if (this._axisDirection === "horizontal") return 0;
    return child.getMinIntrinsicWidth(height);
  }

  /**
   * 逆向: v1T.getMaxIntrinsicWidth(T) (interactive_widgets.js:283-288)
   */
  override getMaxIntrinsicWidth(height: number): number {
    if (this._children.length === 0) return 0;
    const child = this._children[0] as RenderBox;
    if (this._axisDirection === "horizontal") {
      return child.getMaxIntrinsicWidth(height);
    }
    return child.getMaxIntrinsicWidth(height);
  }

  /**
   * 逆向: v1T.getMinIntrinsicHeight(T) (interactive_widgets.js:290-293)
   */
  override getMinIntrinsicHeight(width: number): number {
    if (this._axisDirection === "vertical") return 0;
    if (this._children.length === 0) return 0;
    return (this._children[0] as RenderBox).getMinIntrinsicHeight(width);
  }

  /**
   * 逆向: v1T.getMaxIntrinsicHeight(T) (interactive_widgets.js:294-298)
   */
  override getMaxIntrinsicHeight(width: number): number {
    if (this._children.length === 0) return 0;
    return (this._children[0] as RenderBox).getMaxIntrinsicHeight(width);
  }

  /**
   * 绘制视口及子树（带裁剪）。
   *
   * 逆向: v1T.paint(T, R, a) (interactive_widgets.js:299-304)
   *
   * 遍历子节点，为每个有 offset + paint 属性的子节点创建 ClipScreen 裁剪上下文。
   */
  override paint(screen: Screen, offsetX: number = 0, offsetY: number = 0): void {
    this._needsPaint = false;
    this.performPaint(screen, offsetX, offsetY);

    for (const child of this._children) {
      if ("offset" in child && "paint" in child) {
        // 逆向: line 301 — 创建 ClipScreen 裁剪上下文
        const clipScreen = new ClipScreen(
          screen,
          offsetX,
          offsetY,
          this._size.width,
          this._size.height,
        );

        const renderChild = child as RenderBox;
        const childOffset = renderChild.offset;
        const cx = offsetX + childOffset.x;
        const cy = offsetY + childOffset.y;

        child.paint(clipScreen as unknown as Screen, cx, cy);
      }
    }
  }

  /**
   * 逆向: v1T inherits dispose from O9
   */
  override dispose(): void {
    super.dispose();
  }
}

// ════════════════════════════════════════════════════
//  ViewportWithPosition Widget — 逆向: $1T (interactive_widgets.js:176-202)
// ════════════════════════════════════════════════════

/** ViewportWithPosition 构造函数参数。 */
interface ViewportWithPositionArgs {
  /** 可选标识键 */
  key?: Key;
  /** 子 Widget */
  child?: WidgetInterface;
  /** 滚动轴方向，默认 "vertical" */
  axisDirection?: "vertical" | "horizontal";
  /** 初始滚动偏移，默认 0 */
  offset?: number;
  /** 滚动控制器 */
  scrollController?: ScrollController;
  /** 定位模式，默认 "top" */
  position?: "top" | "bottom";
}

/**
 * ViewportWithPosition Widget。
 *
 * 逆向: $1T extends _t (interactive_widgets.js:176-202)
 *
 * 与 {@link Viewport} 相同，但增加 position 属性。
 * position="bottom" 时，内容不足以填满视口时贴底显示。
 */
export class ViewportWithPosition extends Widget implements RenderObjectWidget {
  /** 滚动轴方向 */
  readonly axisDirection: "vertical" | "horizontal";
  /** 初始滚动偏移 */
  readonly offset: number;
  /** 滚动控制器 */
  readonly scrollController: ScrollController | undefined;
  /** 定位模式 */
  readonly position: "top" | "bottom";
  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 逆向: $1T constructor(T, { key, axisDirection, offset, scrollController, position })
   */
  constructor(args: ViewportWithPositionArgs = {}) {
    super({ key: args.key });
    this.axisDirection = args.axisDirection ?? "vertical";
    this.offset = args.offset ?? 0;
    this.scrollController = args.scrollController;
    this.position = args.position ?? "top";
    this.child = args.child;
  }

  /**
   * 创建关联的元素。
   *
   * 逆向: $1T 继承 _t 的 createElement → SingleChildRenderObjectElement
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * 逆向: $1T.createRenderObject() → new v1T(axisDirection, offset, scrollController, position)
   */
  createRenderObject(): RenderObject {
    return new RenderViewportWithPosition(
      this.axisDirection,
      this.offset,
      this.scrollController,
      this.position,
    );
  }

  /**
   * 更新渲染对象。
   *
   * 逆向: $1T.updateRenderObject(T) → T.updateProperties(axisDirection, offset, scrollController, position)
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderViewportWithPosition).updateProperties(
      this.axisDirection,
      this.offset,
      this.scrollController,
      this.position,
    );
  }
}
