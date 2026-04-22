/**
 * CompositedTransformFollower — 锚点追随者组件。
 *
 * 追踪 LayerLink 目标的全局位置，将自身渲染到目标位置（加偏移量）。
 *
 * 逆向: pZT / AZT (chunk-006.js:12841-12916 / 12811-12840)
 *
 * @module
 */

import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "../widgets/padding.js";
import type { LayerLink } from "./layer-link.js";

// ════════════════════════════════════════════════════
//  RenderCompositedTransformFollower
// ════════════════════════════════════════════════════

/**
 * CompositedTransformFollower 的渲染对象。
 *
 * 逆向: pZT extends O9 (chunk-006.js:12841-12916)
 *
 * 在 performLayout 中查询 LayerLink 目标的全局位置，
 * 减去自身父节点全局偏移后，通过 setOffset() 定位自身。
 */
export class RenderCompositedTransformFollower extends RenderBox {
  /** @internal 关联的 LayerLink */
  private _link: LayerLink;

  /** @internal 目标未链接时是否仍然显示 */
  private _showWhenUnlinked: boolean;

  /** @internal 相对于目标的额外偏移量 */
  private _followerOffset: { x: number; y: number };

  /**
   * 缓存的最近一次计算位置，供外部查询。
   *
   * 逆向: pZT._cachedPosition (chunk-006.js:12845)
   */
  _cachedPosition: { x: number; y: number } | null = null;

  /**
   * 创建 RenderCompositedTransformFollower。
   *
   * 逆向: pZT constructor (chunk-006.js:12846-12849)
   *
   * @param link - 关联的 LayerLink
   * @param showWhenUnlinked - 未链接目标时是否显示（默认 true）
   * @param offset - 相对于目标位置的额外偏移（默认 {x:0, y:0}）
   */
  constructor(link: LayerLink, showWhenUnlinked: boolean, offset: { x: number; y: number }) {
    super();
    this._link = link;
    this._showWhenUnlinked = showWhenUnlinked;
    this._followerOffset = { ...offset };
  }

  // ────────────────────────────────────────────────
  //  属性访问器
  // ────────────────────────────────────────────────

  /**
   * 获取关联的 LayerLink。
   *
   * 逆向: pZT.link getter (chunk-006.js:12850-12852)
   */
  get link(): LayerLink {
    return this._link;
  }

  /**
   * 设置关联的 LayerLink。
   *
   * 逆向: pZT.link setter (chunk-006.js:12853-12855)
   * 同时清空缓存位置并标记需要重新布局。
   *
   * @param value - 新的 LayerLink
   */
  set link(value: LayerLink) {
    this._link = value;
    this._cachedPosition = null;
    this.markNeedsLayout();
  }

  /**
   * 获取 showWhenUnlinked 标志。
   *
   * 逆向: pZT.showWhenUnlinked getter (chunk-006.js:12856-12858)
   */
  get showWhenUnlinked(): boolean {
    return this._showWhenUnlinked;
  }

  /**
   * 设置 showWhenUnlinked 标志。
   *
   * 逆向: pZT.showWhenUnlinked setter (chunk-006.js:12859-12861)
   * 值变化时标记需要重新布局。
   *
   * @param value - 新值
   */
  set showWhenUnlinked(value: boolean) {
    if (this._showWhenUnlinked !== value) {
      this._showWhenUnlinked = value;
      this.markNeedsLayout();
    }
  }

  /**
   * 设置追随偏移量。
   *
   * 逆向: pZT.setFollowerOffset (chunk-006.js:12862-12866)
   * 值变化时标记需要重新布局。
   *
   * @param value - 新的偏移量
   */
  setFollowerOffset(value: { x: number; y: number }): void {
    if (this._followerOffset.x !== value.x || this._followerOffset.y !== value.y) {
      this._followerOffset = { ...value };
      this.markNeedsLayout();
    }
  }

  // ────────────────────────────────────────────────
  //  位置计算
  // ────────────────────────────────────────────────

  /**
   * 计算最终渲染位置（目标全局位置 + 偏移量）。
   *
   * 逆向: pZT.calculatePosition (chunk-006.js:12867-12874)
   *
   * @returns 目标存在时返回全局坐标，否则返回 null
   */
  calculatePosition(): { x: number; y: number } | null {
    const transform = this._link.getTargetTransform();
    if (!transform) return null;
    return {
      x: transform.position.x + this._followerOffset.x,
      y: transform.position.y + this._followerOffset.y,
    };
  }

  /**
   * 计算自身父节点链的全局偏移量（不含自身）。
   *
   * 逆向: pZT.getParentGlobalOffset (chunk-006.js:12875-12884)
   *
   * @returns 父节点链的全局偏移量
   */
  getParentGlobalOffset(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let a: RenderObject | null = this._parent;
    while (a && a instanceof RenderBox) {
      x += a.offset.x;
      y += a.offset.y;
      a = a.parent;
    }
    return { x, y };
  }

  /**
   * 判断是否应显示自身。
   *
   * 逆向: pZT.shouldShow (chunk-006.js:12885-12887)
   *
   * @returns 目标存在或 showWhenUnlinked 为 true 时返回 true
   */
  shouldShow(): boolean {
    return this._link.target !== null || this._showWhenUnlinked;
  }

  // ────────────────────────────────────────────────
  //  布局
  // ────────────────────────────────────────────────

  /**
   * 执行布局。
   *
   * 逆向: pZT.performLayout (chunk-006.js:12888-12906)
   *
   * 1. 不应显示时：setSize(0, 0) 并退出
   * 2. 计算目标位置并缓存到 _cachedPosition
   * 3. 减去父节点全局偏移，通过 setOffset() 定位自身
   * 4. 布局子节点（使用松弛约束），尺寸取子节点尺寸
   */
  performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) {
      throw new Error("performLayout called without constraints");
    }

    if (!this.shouldShow()) {
      this.setSize(0, 0);
      return;
    }

    const pos = this.calculatePosition();
    this._cachedPosition = pos;

    if (pos) {
      const parentOffset = this.getParentGlobalOffset();
      this.setOffset(pos.x - parentOffset.x, pos.y - parentOffset.y);
    }

    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      child.layout(constraints.loosen());
      const s = child.size;
      this.setSize(s.width, s.height);
    } else {
      this.setSize(0, 0);
    }
  }

  /**
   * 获取缓存的当前位置。
   *
   * 逆向: pZT.getCurrentPosition (chunk-006.js:12907-12909)
   *
   * @returns 最近一次 performLayout 计算的位置，或 null
   */
  getCurrentPosition(): { x: number; y: number } | null {
    return this._cachedPosition;
  }
}

// ════════════════════════════════════════════════════
//  CompositedTransformFollower Widget
// ════════════════════════════════════════════════════

/** CompositedTransformFollower 构造函数参数。 */
interface CompositedTransformFollowerArgs {
  /** 可选标识键 */
  key?: Key;
  /** 关联的 LayerLink */
  link: LayerLink;
  /** 目标未链接时是否仍然显示（默认 true） */
  showWhenUnlinked?: boolean;
  /** 相对于目标位置的额外偏移（默认 {x:0, y:0}） */
  offset?: { x: number; y: number };
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * CompositedTransformFollower Widget。
 *
 * 逆向: AZT extends _t (chunk-006.js:12811-12840)
 *
 * 追踪 LayerLink 目标的位置，将子节点渲染到目标坐标处（加偏移量）。
 * showWhenUnlinked 控制无目标时是否渲染（默认 true）。
 */
export class CompositedTransformFollower extends Widget implements RenderObjectWidget {
  /** 关联的 LayerLink */
  readonly link: LayerLink;

  /** 目标未链接时是否仍然显示 */
  readonly showWhenUnlinked: boolean;

  /** 相对于目标位置的额外偏移 */
  readonly offset: { x: number; y: number };

  /** 可选子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 CompositedTransformFollower Widget。
   *
   * @param args - 配置参数
   */
  constructor(args: CompositedTransformFollowerArgs) {
    super({ key: args.key });
    this.link = args.link;
    this.showWhenUnlinked = args.showWhenUnlinked ?? true;
    this.offset = args.offset ?? { x: 0, y: 0 };
    this.child = args.child;
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
   * 逆向: AZT.createRenderObject (chunk-006.js:12834-12836)
   *
   * @returns 新的 RenderCompositedTransformFollower 实例
   */
  createRenderObject(): RenderObject {
    return new RenderCompositedTransformFollower(this.link, this.showWhenUnlinked, this.offset);
  }

  /**
   * 更新渲染对象属性。
   *
   * 逆向: AZT.updateRenderObject (chunk-006.js:12837-12839)
   *
   * @param renderObject - 要更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    const r = renderObject as RenderCompositedTransformFollower;
    r.link = this.link;
    r.showWhenUnlinked = this.showWhenUnlinked;
    r.setFollowerOffset(this.offset);
  }
}
