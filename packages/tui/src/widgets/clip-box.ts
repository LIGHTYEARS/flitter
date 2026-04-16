/**
 * ClipBox 裁剪盒组件。
 *
 * 逆向: r1T (layout_widgets.js:1-32)
 *
 * 包含 {@link RenderClipBox} 渲染对象和 {@link ClipBox} Widget。
 * ClipBox 将子节点的绘制限制在自身的边界矩形内，超出部分被静默丢弃。
 * 用于滚动容器和溢出处理场景。
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";
import { ClipScreen } from "./viewport.js";

// ════════════════════════════════════════════════════
//  RenderClipBox
// ════════════════════════════════════════════════════

/**
 * 裁剪盒渲染对象。
 *
 * 逆向: r1T extends O9 (layout_widgets.js:1-32)
 *
 * 布局时将父约束直接传递给子节点，自身尺寸取子节点尺寸。
 * 绘制时通过 {@link ClipScreen} 将子节点绘制裁剪到自身边界。
 */
export class RenderClipBox extends RenderBox {
  /**
   * 执行布局。
   *
   * 逆向: r1T.performLayout (layout_widgets.js:10-18)
   *
   * 1. 无子节点: 尺寸 = minWidth x minHeight
   * 2. 有子节点: 将父约束传递给子节点，自身尺寸 = 子节点尺寸
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
    child.layout(constraints);
    this.size = child.size;
    child.offset = { x: 0, y: 0 };
  }

  /**
   * 绘制裁剪盒及子树（带裁剪）。
   *
   * 逆向: r1T.paint(T, R, a) (layout_widgets.js:19-31)
   *
   * 无子节点时委托给父类绘制。
   * 有子节点时创建 {@link ClipScreen} 将绘制裁剪到自身边界，
   * 再通过 ClipScreen 绘制子节点。超出边界的内容被静默丢弃。
   *
   * 注意: Flitter 的 paint 约定中 offsetX/Y 是本节点的绝对坐标，
   * 因此裁剪区域直接使用 offsetX/Y 作为起点。
   */
  override paint(screen: Screen, offsetX: number = 0, offsetY: number = 0): void {
    this._needsPaint = false;

    if (this._children.length === 0) {
      this.performPaint(screen, offsetX, offsetY);
      return;
    }

    // 逆向: r1T.paint — 创建 ClipScreen 裁剪到自身边界
    const clipScreen = new ClipScreen(
      screen,
      offsetX,
      offsetY,
      this._size.width,
      this._size.height,
    );

    const child = this._children[0] as RenderBox;
    const cx = offsetX + child._offset.x;
    const cy = offsetY + child._offset.y;

    child.paint(clipScreen as unknown as Screen, cx, cy);
  }
}

// ════════════════════════════════════════════════════
//  ClipBox Widget
// ════════════════════════════════════════════════════

/** ClipBox 构造函数参数。 */
interface ClipBoxArgs {
  /** 可选标识键 */
  key?: Key;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * ClipBox Widget。
 *
 * 逆向: r1T 对应 Widget 包装 (layout_widgets.js)
 *
 * 将子节点的绘制裁剪到自身边界矩形内。
 * 使用 SingleChildRenderObjectElement 管理单个子节点。
 * 创建 {@link RenderClipBox} 作为渲染对象。
 */
export class ClipBox extends Widget implements RenderObjectWidget {
  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 ClipBox Widget。
   *
   * @param args - 配置参数
   */
  constructor(args?: ClipBoxArgs) {
    super({ key: args?.key });
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
   * @returns 新的 RenderClipBox 实例
   */
  createRenderObject(): RenderObject {
    return new RenderClipBox();
  }

  /**
   * 更新渲染对象。
   *
   * ClipBox 没有可变属性，无需更新。
   */
  updateRenderObject(_renderObject: RenderObject): void {
    // no mutable properties
  }
}
