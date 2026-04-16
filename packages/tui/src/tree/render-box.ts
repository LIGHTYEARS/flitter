/**
 * 盒模型渲染对象。
 *
 * {@link RenderBox} 继承 {@link RenderObject}，添加了盒模型布局（尺寸、偏移、约束）
 * 和命中测试能力。子类必须实现 {@link performLayout} 方法。
 *
 * 逆向: O9 (2026_tail_anonymous.js:157645-157761)
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
 *
 * 逆向: O9 extends vH (2026_tail_anonymous.js:157645-157761)
 */
export abstract class RenderBox extends RenderObject {
  /** 当前尺寸 */
  protected _size: Size = { width: 0, height: 0 };

  /** 相对于父节点的偏移量 */
  protected _offset: Position = { x: 0, y: 0 };

  /**
   * 最近一次 layout() 传入的约束，用于跳过不必要的重新布局。
   *
   * 逆向: O9._lastConstraints
   */
  protected _lastConstraints: BoxConstraints | undefined = undefined;

  /**
   * 兼容属性: 与 _lastConstraints 相同引用。
   * 旧代码可能通过 this._constraints 访问。
   */
  protected get _constraints(): BoxConstraints | undefined {
    return this._lastConstraints;
  }

  // ════════════════════════════════════════════════════
  //  属性访问器
  // ════════════════════════════════════════════════════

  /**
   * 获取当前尺寸（返回浅拷贝）。
   *
   * 逆向: O9.size getter
   */
  get size(): Size {
    return { ...this._size };
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
      console.error(
        new Error(`RenderBox.setSize received non-finite dimension: ${value.width}x${value.height}`)
          .stack,
      );
      throw new Error(
        `RenderBox.setSize received non-finite dimension: ${value.width}x${value.height}`,
      );
    }
    this._size = value;
  }

  /**
   * 设置尺寸（方法形式，匹配 amp 的 O9.setSize 签名）。
   *
   * 逆向: O9.setSize(T, R) — 断言 isFinite，直接设置 _size.width/height
   *
   * @param width - 宽度
   * @param height - 高度
   */
  setSize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error(`RenderBox.setSize received non-finite dimension: ${width}x${height}`);
    }
    this._size.width = width;
    this._size.height = height;
  }

  /**
   * 获取相对于父节点的偏移量（返回浅拷贝）。
   *
   * 逆向: O9.offset getter
   */
  get offset(): Position {
    return { ...this._offset };
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
   * 设置偏移量（方法形式，匹配 amp 的 O9.setOffset 签名）。
   *
   * 逆向: O9.setOffset(T, R) — 非有限值默认为 0，结果 Math.round()
   *
   * @param x - X 偏移
   * @param y - Y 偏移
   */
  setOffset(x: number, y: number): void {
    const rx = Number.isFinite(x) ? Math.round(x) : 0;
    const ry = Number.isFinite(y) ? Math.round(y) : 0;
    this._offset.x = rx;
    this._offset.y = ry;
  }

  /**
   * 获取最近一次布局使用的约束。
   *
   * @returns 当前约束，未布局时为 undefined
   */
  get constraints(): BoxConstraints | undefined {
    return this._lastConstraints;
  }

  /**
   * 判断当前节点是否拥有有效尺寸（宽或高大于 0）。
   */
  get hasSize(): boolean {
    return this._size.width > 0 || this._size.height > 0;
  }

  // ════════════════════════════════════════════════════
  //  坐标变换
  // ════════════════════════════════════════════════════

  /**
   * 将局部坐标转换为全局坐标。
   *
   * 逆向: O9.localToGlobal — 沿父链累加 _offset
   */
  localToGlobal(point: Position): Position {
    let { x, y } = point;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: RenderObject | null = this;
    while (current) {
      if (current instanceof RenderBox) {
        x += current._offset.x;
        y += current._offset.y;
      }
      current = current.parent;
      if (current && !("_offset" in current)) break;
    }
    return { x, y };
  }

  /**
   * 将全局坐标转换为局部坐标。
   *
   * 逆向: O9.globalToLocal
   */
  globalToLocal(point: Position): Position {
    const origin = this.localToGlobal({ x: 0, y: 0 });
    return { x: point.x - origin.x, y: point.y - origin.y };
  }

  // ════════════════════════════════════════════════════
  //  固有尺寸（Intrinsic Dimensions）
  // ════════════════════════════════════════════════════

  /**
   * 给定高度约束，返回最小固有宽度。
   *
   * 逆向: O9.getMinIntrinsicWidth — 默认取所有子节点的 max
   */
  getMinIntrinsicWidth(height: number): number {
    if (this._children.length === 0) return 0;
    let result = 0;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        result = Math.max(result, child.getMinIntrinsicWidth(height));
      }
    }
    return result;
  }

  /**
   * 给定高度约束，返回最大固有宽度。
   *
   * 逆向: O9.getMaxIntrinsicWidth — 默认取所有子节点的 max
   */
  getMaxIntrinsicWidth(height: number): number {
    if (this._children.length === 0) return 0;
    let result = 0;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        result = Math.max(result, child.getMaxIntrinsicWidth(height));
      }
    }
    return result;
  }

  /**
   * 给定宽度约束，返回最小固有高度。
   *
   * 逆向: O9.getMinIntrinsicHeight — 默认取所有子节点的 max
   */
  getMinIntrinsicHeight(width: number): number {
    if (this._children.length === 0) return 0;
    let result = 0;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        result = Math.max(result, child.getMinIntrinsicHeight(width));
      }
    }
    return result;
  }

  /**
   * 给定宽度约束，返回最大固有高度。
   *
   * 逆向: O9.getMaxIntrinsicHeight — 默认取所有子节点的 max
   */
  getMaxIntrinsicHeight(width: number): number {
    if (this._children.length === 0) return 0;
    let result = 0;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        result = Math.max(result, child.getMaxIntrinsicHeight(width));
      }
    }
    return result;
  }

  // ════════════════════════════════════════════════════
  //  调试
  // ════════════════════════════════════════════════════

  /**
   * 发送调试数据（空操作，可被调试工具覆盖）。
   *
   * 逆向: O9 中 qw.performLayout 调用的 sendDebugData
   */
  sendDebugData(_data: Record<string, unknown>): void {}

  // ════════════════════════════════════════════════════
  //  布局
  // ════════════════════════════════════════════════════

  /**
   * 执行布局流程。
   *
   * 逆向: O9.layout(T) — 检查约束变化 + _needsLayout，
   * 保存 _lastConstraints，清除 _needsLayout，调用 performLayout()
   *
   * @param constraints - 父节点传入的盒约束
   */
  layout(constraints: BoxConstraints): void {
    const constraintsChanged = !this._lastConstraints || !constraints.equals(this._lastConstraints);

    this._lastConstraints = constraints;

    if (this._needsLayout || constraintsChanged) {
      this._needsLayout = false;
      this.performLayout();
      this.markNeedsPaint();
    } else {
      this._needsLayout = false;
    }
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
   * 逆向: O9.paint — 清脏标记 → performPaint → 遍历子节点（含视口裁剪）
   *
   * ## paint offset 约定差异（Task 8 分析结论: 无需对齐）
   *
   * Flitter 与 amp 的 paint 参数语义不同，但最终绘制位置数学等价:
   *
   * - **Amp (O9.paint)**: `R` = 父节点的绝对位置（parent absolute）。
   *   节点在 paint override 中计算 `R + this.offset` 获得自身绝对位置用于绘制，
   *   然后向 super.paint 传递原始 `R`；super.paint 为每个子节点计算
   *   `R + this.offset`（= 本节点绝对位置）作为子节点的 `R`。
   *
   * - **Flitter (RenderBox.paint)**: `offsetX` = 本节点的绝对位置（self absolute，
   *   由父节点预计算: parentAbs + child.offset）。performPaint 直接在 offsetX/Y
   *   处绘制；遍历子节点时计算 `offsetX + child.offset`（= 子节点的绝对位置）。
   *
   * 对于 root(0,0) -> A(offset 5,3) -> B(offset 2,1):
   *   - Amp: B 收到 R=5（A 的绝对），自行计算 5+2=7 绘制
   *   - Flitter: B 收到 offsetX=7（已由 A 预计算），直接绘制
   *   - 两者最终像素位置一致: (7, 4)
   *
   * Flitter 的约定实际上更正确地处理了 viewport 等复杂节点——amp 的 g1T/v1T
   * viewport paint override 中未添加 this.offset（隐含假设 viewport offset 为 0），
   * 而 Flitter 的 viewport paint 直接使用传入的 offsetX 作为自身绝对位置，
   * 无此隐含假设。
   *
   * @param screen - 目标屏幕
   * @param offsetX - 本节点的全局 X 绝对坐标（由父节点预计算: parentAbsX + this.offset.x）
   * @param offsetY - 本节点的全局 Y 绝对坐标（由父节点预计算: parentAbsY + this.offset.y）
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this._needsPaint = false;
    this.performPaint(screen, offsetX, offsetY);

    const screenWidth = screen.width;
    const screenHeight = screen.height;

    for (const child of this._children) {
      if (child instanceof RenderBox) {
        const cx = offsetX + child._offset.x;
        const cy = offsetY + child._offset.y;
        const cr = cx + child._size.width;
        const cb = cy + child._size.height;

        // 逆向: O9.paint 视口裁剪 — 完全在屏幕外的子节点跳过
        if (cx >= screenWidth || cy >= screenHeight || cr <= 0 || cb <= 0) {
          continue;
        }
        child.paint(screen, cx, cy);
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
   */
  containsPoint(x: number, y: number): boolean {
    const localX = x - this._offset.x;
    const localY = y - this._offset.y;
    return localX >= 0 && localX < this._size.width && localY >= 0 && localY < this._size.height;
  }
}
