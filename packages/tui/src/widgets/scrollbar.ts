/**
 * Scrollbar Widget — 带亚字符精度的滚动条组件。
 *
 * 使用 Unicode 块元素 ▁▂▃▄▅▆▇█ 实现 1/8 行精度的平滑拇指渲染，
 * 与 amp 的 F1T.paint 完全对齐。
 *
 * 逆向: W1T (widget) + F1T (render) + q1T (state) + z1T (scroll-info render widget)
 *   in interactive_widgets.js:306-449
 *   state (q1T) in misc_utils.js:844-933
 *
 * @module
 */

import { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import type { ScrollController } from "../scroll/scroll-controller.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import type { MouseEvent } from "./mouse-region.js";
import { MouseRegion } from "./mouse-region.js";

// ════════════════════════════════════════════════════
//  Block elements (逆向: F1T — blocks array, line 396)
// ════════════════════════════════════════════════════

/**
 * Unicode 块元素数组，用于 1/8 精度的亚字符滚动条渲染。
 *
 * 逆向: F1T.paint — let l = ["\u2581", "\u2582", ..., "\u2588"]
 */
const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

// ════════════════════════════════════════════════════
//  LeafRenderObjectElement (local copy)
// ════════════════════════════════════════════════════

/**
 * 叶子渲染对象元素（本地副本，与 RichText 中相同）。
 *
 * 用于没有子 Widget 的 RenderObjectWidget（如 ScrollbarRenderWidget）。
 */
class LeafRenderObjectElement extends RenderObjectElement {
  override mount(parent?: Element): void {
    super.mount(parent);
    this._dirty = false;
  }

  override update(newWidget: WidgetInterface): void {
    super.update(newWidget);
    this._dirty = false;
  }
}

// ════════════════════════════════════════════════════
//  ScrollInfo — 滚动信息接口
// ════════════════════════════════════════════════════

/**
 * 滚动信息接口。
 *
 * 逆向: q1T — widget.getScrollInfo() 返回值
 */
export interface ScrollInfo {
  /** 内容总高度（行数） */
  totalContentHeight: number;
  /** 视口高度（行数） */
  viewportHeight: number;
  /** 当前滚动偏移量 */
  scrollOffset: number;
}

// ════════════════════════════════════════════════════
//  RenderScrollbar — 核心渲染对象
// ════════════════════════════════════════════════════

/**
 * 滚动条渲染结果（供拖拽计算使用）。
 */
export interface RenderScrollbarProps {
  showScrollbar: boolean;
  thumbStartFloat: number;
  thumbEndFloat: number;
  trackLength: number;
}

/**
 * 滚动条渲染对象。
 *
 * 实现 amp F1T 的 paint 和 _calculateScrollbarMetrics 逻辑。
 *
 * 逆向: F1T extends O9 (interactive_widgets.js:367-449)
 *
 * Paint 算法（逆向 F1T.paint, lines 383-426）:
 * - 每行根据 thumbStartFloat/thumbEndFloat 决定渲染块字符或空格
 * - 拇指起始行和结束行使用亚字符精度的块元素
 * - thumb 区域: fg=thumbColor, bg=trackColor (p=false → reverse:false)
 * - track 区域: fg=trackColor, bg=thumbColor (p=true → reversed)
 *   Flitter 中没有 reverse 属性，直接交换 fg/bg 模拟
 */
export class RenderScrollbar extends RenderBox {
  private _widget: ScrollbarRenderWidget;

  constructor(widget: ScrollbarRenderWidget) {
    super();
    this._widget = widget;
  }

  /**
   * 更新关联的 Widget 配置。
   *
   * 逆向: F1T.updateWidget(T)
   */
  updateWidget(widget: ScrollbarRenderWidget): void {
    this._widget = widget;
    this.markNeedsLayout();
  }

  /**
   * 执行布局计算。
   *
   * 逆向: F1T.performLayout — 宽度最多为 thickness，高度为 maxHeight
   */
  performLayout(): void {
    const constraints = this._lastConstraints!;
    const width = Math.min(constraints.maxWidth, this._widget.thickness);
    const height = constraints.maxHeight;
    this.setSize(width, height);
  }

  override getMinIntrinsicWidth(_height: number): number {
    return this._widget.thickness;
  }

  override getMaxIntrinsicWidth(_height: number): number {
    return this._widget.thickness;
  }

  /**
   * 绘制滚动条。
   *
   * 逆向: F1T.paint (lines 383-426) — 使用块字符实现亚字符精度拇指渲染。
   *
   * 逆向细节:
   * - p=false (thumb 区域): T.setChar(R, a+o, n, {fg:thumbColor, bg:trackColor, reverse:false})
   *   → Flitter: new TextStyle({ foreground: thumbColor, background: trackColor })
   * - p=true (track 区域): T.setChar(R, a+o, n, {fg:thumbColor, bg:trackColor, reverse:true})
   *   → 终端 reverse 交换前景/背景 → 前景变 trackColor，背景变 thumbColor
   *   → Flitter: new TextStyle({ foreground: trackColor, background: thumbColor })
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const metrics = this._calculateScrollbarMetrics();
    if (!metrics.showScrollbar) return;

    const { thumbStartFloat: s, thumbSizeFloat: t } = metrics;
    const A = s + t; // thumbEnd

    const thumbColor = this._widget.thumbColor;
    const trackColor = this._widget.trackColor;

    const height = this._size.height;
    for (let o = 0; o < height; o++) {
      let char = "█";
      let isTrack = true; // p in amp source: true=track, false=thumb

      if (o === Math.floor(s)) {
        // 拇指起始行 — 亚字符精度
        const fraction = 1 - (s - o);
        const idx = Math.floor(fraction * 8);
        char = BLOCKS[idx] ?? "█";
        isTrack = false; // 这是拇指区域
      } else if (o === Math.floor(A)) {
        // 拇指结束行 — 亚字符精度
        const fraction = 1 - (A - o);
        const idx = Math.floor(fraction * 8);
        char = BLOCKS[idx] ?? "█";
        // 结束行保持 isTrack=true（amp 逻辑: 结束行 p 不被设为 false）
      } else if (o > s && o < A) {
        // 拇指中间行 — 完整块
        isTrack = false;
      }

      // 逆向: reverse:false (thumb, p=false) → fg=thumbColor, bg=trackColor
      //       reverse:true  (track, p=true)  → 终端 reverse → fg=trackColor, bg=thumbColor
      const style = isTrack
        ? new TextStyle({ foreground: trackColor, background: thumbColor })
        : new TextStyle({ foreground: thumbColor, background: trackColor });

      screen.writeChar(offsetX, offsetY + o, char, style, 1);
    }
  }

  /**
   * 计算滚动条指标。
   *
   * 逆向: F1T._calculateScrollbarMetrics (lines 428-449)
   *
   * @returns thumbStartFloat, thumbSizeFloat, showScrollbar
   */
  private _calculateScrollbarMetrics(): {
    thumbStartFloat: number;
    thumbSizeFloat: number;
    showScrollbar: boolean;
  } {
    const {
      totalContentHeight: T,
      viewportHeight: R,
      scrollOffset: a,
    } = this._widget.getScrollInfo();
    const e = this._size.height;

    if (T <= R || e <= 0) {
      return { thumbStartFloat: 0, thumbSizeFloat: 0, showScrollbar: false };
    }

    const t = Math.max(0, Math.min(1, a / (T - R))); // scrollFraction
    const r = Math.min(1, R / T); // thumbRatio
    const h = Math.max(1, e * r); // thumbSize
    const i = e - h; // availableTrack

    return {
      thumbStartFloat: Math.max(0, i * t),
      thumbSizeFloat: h,
      showScrollbar: true,
    };
  }

  /**
   * 获取当前渲染指标（供拖拽计算使用）。
   */
  getMetrics(): RenderScrollbarProps {
    const m = this._calculateScrollbarMetrics();
    return {
      showScrollbar: m.showScrollbar,
      thumbStartFloat: m.thumbStartFloat,
      thumbEndFloat: m.thumbStartFloat + m.thumbSizeFloat,
      trackLength: this._size.height,
    };
  }
}

// ════════════════════════════════════════════════════
//  ScrollbarRenderWidget — 渲染层 Widget（对应 z1T）
// ════════════════════════════════════════════════════

/** ScrollbarRenderWidget 的 props。 */
interface ScrollbarRenderWidgetProps {
  controller: ScrollController;
  getScrollInfo: () => ScrollInfo;
  thickness: number;
  thumbColor: Color;
  trackColor: Color;
}

/**
 * 低层级滚动条渲染 Widget（叶子节点）。
 *
 * 逆向: z1T extends Jx (interactive_widgets.js:335-365)
 *
 * 直接创建 RenderScrollbar 渲染对象。
 */
export class ScrollbarRenderWidget extends Widget implements RenderObjectWidget {
  readonly props: ScrollbarRenderWidgetProps;

  /** 无子 Widget（叶子节点） */
  readonly child: WidgetInterface | undefined = undefined;

  constructor(props: ScrollbarRenderWidgetProps & { key?: Key }) {
    super({ key: props.key });
    this.props = props;
  }

  // 委托属性（供 RenderScrollbar 访问）
  get controller(): ScrollController {
    return this.props.controller;
  }
  get getScrollInfo(): () => ScrollInfo {
    return this.props.getScrollInfo;
  }
  get thickness(): number {
    return this.props.thickness;
  }
  get thumbColor(): Color {
    return this.props.thumbColor;
  }
  get trackColor(): Color {
    return this.props.trackColor;
  }

  createElement(): Element {
    return new LeafRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new RenderScrollbar(this);
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderScrollbar).updateWidget(this);
  }
}

// ════════════════════════════════════════════════════
//  ScrollbarProps — 高层级 Widget 参数
// ════════════════════════════════════════════════════

/**
 * Scrollbar 高层级 Widget 的构造参数。
 *
 * 逆向: W1T constructor 参数 (interactive_widgets.js:315-329)
 */
export interface ScrollbarProps {
  /** 可选标识键 */
  key?: Key;
  /** 滚动控制器 */
  controller: ScrollController;
  /** 获取滚动信息的回调（totalContentHeight, viewportHeight, scrollOffset） */
  getScrollInfo: () => ScrollInfo;
  /** 滚动条宽度，默认为 1 */
  thickness?: number;
  /** 拇指颜色（未指定时使用主题前景色） */
  thumbColor?: Color;
  /** 轨道颜色（未指定时使用主题选中色） */
  trackColor?: Color;
  /** 是否显示轨道背景，默认 true */
  showTrack?: boolean;
}

// ════════════════════════════════════════════════════
//  ScrollbarState — 状态类（对应 q1T）
// ════════════════════════════════════════════════════

/**
 * Scrollbar StatefulWidget 的状态。
 *
 * 逆向: q1T extends wR (misc_utils.js:844-933)
 *
 * 处理:
 * - 点击轨道区域 → 翻页（animateTo 或 jumpTo）
 * - 拖拽拇指 → 比例滚动
 * - 悬停检测 → 更新光标样式
 */
class ScrollbarState extends State<Scrollbar> {
  /** 是否正在拖拽 */
  private _isDragging: boolean = false;
  /** 拖拽起始 Y 坐标 */
  private _dragStartY: number = 0;
  /** 拖拽起始滚动偏移量 */
  private _dragStartOffset: number = 0;
  /** 拇指悬停状态 */
  private _isOverThumb: boolean = false;
  /** RenderScrollbar 引用（通过 GlobalKey 或 context 获取） */
  private _renderScrollbarRef: RenderScrollbar | null = null;

  /**
   * 构建 Widget 树。
   *
   * 逆向: q1T.build — MouseRegion > ScrollbarRenderWidget
   */
  override build(_context: BuildContext): WidgetInterface {
    const props = this.widget.props;

    // 默认颜色：灰色主题（与 amp 保持一致）
    const thumbColor = props.thumbColor ?? Color.rgb(150, 150, 150);
    const trackColor = props.trackColor ?? Color.rgb(60, 60, 60);

    const renderWidget = new ScrollbarRenderWidget({
      controller: props.controller,
      getScrollInfo: props.getScrollInfo,
      thickness: props.thickness ?? 1,
      thumbColor,
      trackColor,
    });

    return new MouseRegion({
      onClick: this._handleClick,
      onDrag: this._handleDrag,
      onRelease: this._handleRelease,
      onHover: this._handleHover,
      cursor: this._isOverThumb ? "pointer" : "default",
      child: renderWidget,
    });
  }

  /**
   * 点击事件处理。
   *
   * 逆向: q1T._handleClick (misc_utils.js:897-916)
   * - 左键点击轨道区域 → 向上/向下翻页
   * - 点击拇指区域 → 无操作
   */
  private _handleClick = (event: MouseEvent): void => {
    const props = this.widget.props;
    const { viewportHeight: e } = props.getScrollInfo();

    const renderObj = this._getRenderScrollbar();
    if (!renderObj) return;

    const metrics = renderObj.getMetrics();
    if (!metrics.showScrollbar) return;

    const R = event.y; // 点击的 Y 坐标（相对于滚动条）
    const { thumbStartFloat: l, thumbEndFloat: o } = metrics;

    // 点击在拇指区域内 → 无操作
    if (R >= l && R <= o) return;

    // 点击轨道 → 翻页
    if (R < l) {
      props.controller.jumpTo(Math.max(0, props.controller.offset - e));
    } else {
      props.controller.jumpTo(
        Math.min(props.controller.maxScrollExtent, props.controller.offset + e),
      );
    }
  };

  /**
   * 拖拽事件处理。
   *
   * 逆向: q1T._handleDrag (misc_utils.js:874-893)
   * - 第一次 drag 事件时记录起始状态
   * - 后续 drag 事件根据位移比例计算新的滚动偏移
   */
  private _handleDrag = (event: MouseEvent): void => {
    const props = this.widget.props;
    const { totalContentHeight: R, viewportHeight: a } = props.getScrollInfo();

    const renderObj = this._getRenderScrollbar();
    if (!renderObj) return;

    const { trackLength: t } = renderObj.getMetrics();
    if (t === 0 || R <= a) return;

    // 逆向: 使用 _isDragging 标志避免 null/0 歧义问题
    if (!this._isDragging) {
      this._isDragging = true;
      this._dragStartY = event.y;
      this._dragStartOffset = props.getScrollInfo().scrollOffset;
    }

    // 逆向: q1T._handleDrag 计算逻辑
    // thumbSize = max(1, trackLength * viewportHeight / totalContentHeight)
    // availableTrack = trackLength - thumbSize
    // scrollRange = totalContentHeight - viewportHeight
    // pixelsPerScrollUnit = availableTrack / scrollRange
    // newOffset = dragStartOffset + (dy / pixelsPerScrollUnit)
    const h = Math.min(1, a / R); // thumbRatio
    const i = Math.max(1, t * h); // thumbSize
    const c = t - i; // availableTrack

    if (c <= 0) return;

    const s = R - a; // scrollRange
    const A = c / s; // pixelsPerScrollUnit
    const r = event.y - this._dragStartY; // dy (pixel delta)
    const l = r / A; // scroll delta
    const o = Math.round(Math.max(0, Math.min(s, this._dragStartOffset + l)));

    props.controller.jumpTo(o);
  };

  /**
   * 释放事件处理。
   *
   * 逆向: q1T._handleRelease (misc_utils.js:894-896)
   */
  private _handleRelease = (_event: MouseEvent): void => {
    this._isDragging = false;
    this._dragStartY = 0;
    this._dragStartOffset = 0;
  };

  /**
   * 悬停事件处理 — 检测是否在拇指区域上方。
   *
   * 逆向: q1T._handleHover (misc_utils.js:870-873)
   */
  private _handleHover = (event: MouseEvent): void => {
    const prevOverThumb = this._isOverThumb;
    this._isOverThumb = this._isPositionOverThumb(event.y);
    if (prevOverThumb !== this._isOverThumb) {
      this.setState();
    }
  };

  /**
   * 检测给定 Y 坐标是否在拇指区域内。
   *
   * 逆向: q1T._isPositionOverThumb (misc_utils.js:917-932)
   */
  private _isPositionOverThumb(y: number): boolean {
    const renderObj = this._getRenderScrollbar();
    if (!renderObj) return false;

    const metrics = renderObj.getMetrics();
    if (!metrics.showScrollbar) return false;

    const { thumbStartFloat: s, thumbEndFloat: A } = metrics;
    return y >= s && y <= A;
  }

  /**
   * 通过 context 获取 RenderScrollbar 引用。
   *
   * 逆向: q1T 中多次使用 `this.context.findRenderObject()?.size.height`
   * 此处通过缓存 _renderScrollbarRef 优化
   */
  private _getRenderScrollbar(): RenderScrollbar | null {
    // 尝试通过 context 找到渲染对象
    if (this._element) {
      try {
        const ro = (
          this._element as unknown as { findRenderObject?: () => RenderObject | null }
        ).findRenderObject?.();
        if (ro instanceof RenderScrollbar) {
          this._renderScrollbarRef = ro;
          return ro;
        }
        // 查找 RenderMouseRegion 的子节点
        if (ro && "children" in ro) {
          const children = (ro as unknown as { _children?: RenderObject[] })._children;
          if (children) {
            for (const child of children) {
              if (child instanceof RenderScrollbar) {
                this._renderScrollbarRef = child;
                return child;
              }
            }
          }
        }
      } catch {
        // 忽略错误
      }
    }
    return this._renderScrollbarRef;
  }
}

// ════════════════════════════════════════════════════
//  Scrollbar — 高层级 StatefulWidget（对应 W1T）
// ════════════════════════════════════════════════════

/**
 * 滚动条高层级 StatefulWidget。
 *
 * 集成鼠标交互（点击翻页、拖拽拇指、悬停样式），
 * 使用亚字符精度块元素渲染平滑滚动条。
 *
 * 逆向: W1T extends NR (interactive_widgets.js:306-333)
 *
 * @example
 * ```ts
 * new Scrollbar({
 *   controller: scrollController,
 *   getScrollInfo: () => ({
 *     totalContentHeight: 100,
 *     viewportHeight: 20,
 *     scrollOffset: scrollController.offset,
 *   }),
 * })
 * ```
 */
export class Scrollbar extends StatefulWidget {
  readonly props: ScrollbarProps;

  constructor(props: ScrollbarProps) {
    super({ key: props.key });
    this.props = props;
  }

  override createState(): State {
    return new ScrollbarState();
  }
}
