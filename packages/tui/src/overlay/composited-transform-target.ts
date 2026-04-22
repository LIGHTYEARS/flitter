/**
 * CompositedTransformTarget — 锚点定位目标组件。
 *
 * 将自身位置注册到 LayerLink，供 CompositedTransformFollower 追踪。
 *
 * 逆向: bZT / _ZT (chunk-006.js:12940-12996 / 12917-12939)
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
import type { LayerLink, LayerLinkTarget } from "./layer-link.js";

// ════════════════════════════════════════════════════
//  RenderCompositedTransformTarget
// ════════════════════════════════════════════════════

/**
 * CompositedTransformTarget 的渲染对象。
 *
 * 逆向: bZT extends O9 (chunk-006.js:12940-12996)
 *
 * 在 attach/detach 生命周期中向 LayerLink 注册/注销自身。
 * performLayout 后调用 updateGlobalPosition() 通知追随者。
 */
export class RenderCompositedTransformTarget extends RenderBox implements LayerLinkTarget {
  /** @internal 当前 LayerLink */
  private _link: LayerLink;

  /**
   * 当前全局位置缓存，用于判断是否发生了变化。
   *
   * 逆向: bZT._globalPosition (chunk-006.js:12942-12945)
   */
  private _globalPosition: { x: number; y: number } = { x: 0, y: 0 };

  /**
   * 创建 RenderCompositedTransformTarget。
   *
   * 逆向: bZT constructor (chunk-006.js:12946-12949)
   *
   * @param link - 关联的 LayerLink
   */
  constructor(link: LayerLink) {
    super();
    this._link = link;
  }

  // ────────────────────────────────────────────────
  //  link 属性
  // ────────────────────────────────────────────────

  /**
   * 获取关联的 LayerLink。
   *
   * 逆向: bZT.link getter (chunk-006.js:12950-12952)
   */
  get link(): LayerLink {
    return this._link;
  }

  /**
   * 更新关联的 LayerLink。
   *
   * 逆向: bZT.link setter (chunk-006.js:12953-12956)
   * 先将旧 link 的 target 清除，再将新 link 的 target 设置为自身。
   *
   * @param value - 新的 LayerLink
   */
  set link(value: LayerLink) {
    if (this._link === value) return;
    this._link.clearTarget();
    this._link = value;
    this._link.setTarget(this);
  }

  // ────────────────────────────────────────────────
  //  生命周期
  // ────────────────────────────────────────────────

  /**
   * 挂载到渲染树，并将自身注册为 link 的 target。
   *
   * 逆向: bZT.attach (chunk-006.js:12957-12959)
   */
  override attach(): void {
    super.attach();
    this._link.setTarget(this);
  }

  /**
   * 从渲染树卸载，并清除 link 的 target 注册。
   *
   * 逆向: bZT.detach (chunk-006.js:12960-12963)
   */
  override detach(): void {
    this._link.clearTarget();
    super.detach();
  }

  // ────────────────────────────────────────────────
  //  LayerLinkTarget 接口实现
  // ────────────────────────────────────────────────

  /**
   * 获取当前全局位置，沿父链累加 offset。
   *
   * 逆向: bZT.getGlobalPosition (chunk-006.js:12963-12969)
   */
  getGlobalPosition(): { x: number; y: number } {
    let x = this._offset.x;
    let y = this._offset.y;
    let a: RenderObject | null = this._parent;
    while (a && a instanceof RenderBox) {
      x += a.offset.x;
      y += a.offset.y;
      a = a.parent;
    }
    return { x, y };
  }

  /**
   * 获取当前尺寸。
   *
   * 逆向: bZT.getSize (chunk-006.js:12973-12978)
   */
  getSize(): { width: number; height: number } {
    const s = this._size;
    return { width: s.width, height: s.height };
  }

  // ────────────────────────────────────────────────
  //  位置更新
  // ────────────────────────────────────────────────

  /**
   * 重新计算全局位置，若变化则通知所有 followers。
   *
   * 逆向: bZT.updateGlobalPosition (chunk-006.js:12980-12985)
   */
  updateGlobalPosition(): void {
    const prev = { ...this._globalPosition };
    this._globalPosition = this.getGlobalPosition();
    if (prev.x !== this._globalPosition.x || prev.y !== this._globalPosition.y) {
      this._link.notifyFollowers();
    }
  }

  // ────────────────────────────────────────────────
  //  布局
  // ────────────────────────────────────────────────

  /**
   * 执行布局。
   *
   * 逆向: bZT.performLayout (chunk-006.js:12986-12995)
   *
   * 将父约束传递给子节点，尺寸取子节点尺寸，无子节点则为 0x0。
   * 布局完成后调用 updateGlobalPosition()。
   */
  performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) {
      throw new Error("performLayout called without constraints");
    }

    if (this._children.length > 0) {
      const child = this._children[0] as RenderBox;
      child.layout(constraints);
      const s = child.size;
      this.setSize(s.width, s.height);
    } else {
      this.setSize(0, 0);
    }

    this.updateGlobalPosition();
  }
}

// ════════════════════════════════════════════════════
//  CompositedTransformTarget Widget
// ════════════════════════════════════════════════════

/** CompositedTransformTarget 构造函数参数。 */
interface CompositedTransformTargetArgs {
  /** 可选标识键 */
  key?: Key;
  /** 关联的 LayerLink */
  link: LayerLink;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * CompositedTransformTarget Widget。
 *
 * 逆向: _ZT extends _t (chunk-006.js:12917-12939)
 *
 * 将子节点的全局位置通过 LayerLink 暴露给 CompositedTransformFollower。
 */
export class CompositedTransformTarget extends Widget implements RenderObjectWidget {
  /** 关联的 LayerLink */
  readonly link: LayerLink;

  /** 可选子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 CompositedTransformTarget Widget。
   *
   * @param args - 配置参数
   */
  constructor(args: CompositedTransformTargetArgs) {
    super({ key: args.key });
    this.link = args.link;
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
   * 逆向: _ZT.createRenderObject (chunk-006.js:12933-12935)
   *
   * @returns 新的 RenderCompositedTransformTarget 实例
   */
  createRenderObject(): RenderObject {
    return new RenderCompositedTransformTarget(this.link);
  }

  /**
   * 更新渲染对象属性。
   *
   * 逆向: _ZT.updateRenderObject (chunk-006.js:12936-12938)
   *
   * @param renderObject - 要更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderCompositedTransformTarget).link = this.link;
  }
}
