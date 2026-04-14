/**
 * 盒模型渲染对象。
 *
 * {@link RenderBox} 继承 {@link RenderObject}，添加了盒模型布局（尺寸、偏移、约束）
 * 和命中测试能力。子类必须实现 {@link performLayout} 方法。
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import type { BoxConstraints, Size } from "./constraints.js";
import { RenderObject } from "./render-object.js";
import type { Position } from "./types.js";

/**
 * 盒模型渲染对象抽象基类。
 *
 * 在 {@link RenderObject} 基础上增加了尺寸（size）、偏移（offset）、
 * 盒约束（constraints）以及命中测试（hitTest）。
 * 子类需实现 {@link performLayout} 来完成具体的布局计算。
 */
export abstract class RenderBox extends RenderObject {
  /** 当前尺寸 */
  protected _size: Size = { width: 0, height: 0 };

  /** 相对于父节点的偏移量 */
  protected _offset: Position = { x: 0, y: 0 };

  /** 最近一次布局使用的约束 */
  protected _constraints: BoxConstraints | undefined = undefined;

  // ════════════════════════════════════════════════════
  //  属性访问器
  // ════════════════════════════════════════════════════

  /**
   * 获取当前尺寸。
   *
   * @returns 当前盒模型的宽高
   */
  get size(): Size {
    return this._size;
  }

  /**
   * 设置尺寸。
   *
   * 宽高必须为有限数值，不允许 Infinity 或 NaN。
   *
   * @param value - 新的尺寸
   * @throws 当宽或高为 Infinity 或 NaN 时抛出错误
   */
  set size(value: Size) {
    if (!Number.isFinite(value.width) || !Number.isFinite(value.height)) {
      throw new Error(`尺寸必须为有限数值，收到: width=${value.width}, height=${value.height}`);
    }
    this._size = value;
  }

  /**
   * 获取相对于父节点的偏移量。
   *
   * @returns 当前偏移位置
   */
  get offset(): Position {
    return this._offset;
  }

  /**
   * 设置相对于父节点的偏移量。
   *
   * @param value - 新的偏移位置
   */
  set offset(value: Position) {
    this._offset = value;
  }

  /**
   * 获取最近一次布局使用的约束。
   *
   * @returns 当前约束，未布局时为 undefined
   */
  get constraints(): BoxConstraints | undefined {
    return this._constraints;
  }

  /**
   * 判断当前节点是否拥有有效尺寸（宽或高大于 0）。
   *
   * @returns 宽或高大于 0 时返回 true
   */
  get hasSize(): boolean {
    return this._size.width > 0 || this._size.height > 0;
  }

  // ════════════════════════════════════════════════════
  //  布局
  // ════════════════════════════════════════════════════

  /**
   * 执行布局流程。
   *
   * 检查约束是否变化或是否需要重新布局，如果需要则调用
   * {@link performLayout}，并在完成后清除布局脏标记、标记需要重新绘制。
   *
   * @param constraints - 父节点传入的盒约束
   */
  layout(constraints: BoxConstraints): void {
    const constraintsChanged =
      this._constraints === undefined || !this._constraints.equals(constraints);

    this._constraints = constraints;

    if (this._needsLayout || constraintsChanged) {
      this.performLayout();
    }

    this._needsLayout = false;
    this.markNeedsPaint();
  }

  /**
   * 执行具体的布局计算（抽象方法）。
   *
   * 子类必须实现此方法，根据当前约束确定自身尺寸，
   * 并对子节点进行布局。
   */
  abstract performLayout(): void;

  // ════════════════════════════════════════════════════
  //  绘制
  // ════════════════════════════════════════════════════

  /**
   * 自定义绘制钩子。
   *
   * 默认为空操作，子类可覆盖此方法实现具体的绘制逻辑。
   *
   * @param screen - 目标屏幕
   * @param offsetX - 全局 X 偏移量
   * @param offsetY - 全局 Y 偏移量
   */
  performPaint(_screen: Screen, _offsetX: number, _offsetY: number): void {}

  /**
   * 绘制当前节点及其子树。
   *
   * 清除绘制脏标记，调用 {@link performPaint}，然后递归绘制所有子节点。
   * 对于 {@link RenderBox} 子节点，会累加其 offset 到偏移量；
   * 对于非 RenderBox 子节点，直接传递当前偏移量。
   *
   * @param screen - 目标屏幕
   * @param offsetX - 全局 X 偏移量
   * @param offsetY - 全局 Y 偏移量
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this._needsPaint = false;
    this.performPaint(screen, offsetX, offsetY);

    for (const child of this._children) {
      if (child instanceof RenderBox) {
        child.paint(screen, offsetX + child.offset.x, offsetY + child.offset.y);
      } else {
        child.paint(screen, offsetX, offsetY);
      }
    }
  }

  // ════════════════════════════════════════════════════
  //  命中测试
  // ════════════════════════════════════════════════════

  /**
   * 判断给定坐标是否在当前盒模型区域内。
   *
   * 使用左上角闭区间、右下角开区间的判定方式：
   * - [offset.x, offset.x + width) 为有效水平范围
   * - [offset.y, offset.y + height) 为有效垂直范围
   *
   * @param x - 测试点的 X 坐标
   * @param y - 测试点的 Y 坐标
   * @returns 坐标在区域内返回 true，否则返回 false
   */
  hitTest(x: number, y: number): boolean {
    const localX = x - this._offset.x;
    const localY = y - this._offset.y;
    return localX >= 0 && localX < this._size.width && localY >= 0 && localY < this._size.height;
  }
}
