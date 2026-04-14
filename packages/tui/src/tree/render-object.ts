/**
 * 渲染对象抽象基类。
 *
 * {@link RenderObject} 是渲染树的核心节点，负责管理父子关系、脏标记传播、
 * 生命周期（attach/detach）、布局与绘制等行为。
 *
 * 子类必须实现 {@link RenderObject.performLayout | performLayout()} 方法。
 *
 * @module
 */

import type { HitTestResult } from "../gestures/hit-test.js";
import type { Screen } from "../screen/screen.js";
import { getPipelineOwner, type ParentData } from "./types.js";

/**
 * 渲染树节点抽象基类。
 *
 * 维护父子关系树、脏标记（布局/绘制）、挂载状态及深度信息。
 * 通过 {@link adoptChild} / {@link dropChild} 管理子节点，
 * 脏标记通过 {@link markNeedsLayout} / {@link markNeedsPaint} 向上传播。
 */
export abstract class RenderObject {
  /** 父节点引用 */
  protected _parent: RenderObject | null = null;

  /** 子节点列表 */
  protected _children: RenderObject[] = [];

  /** 父节点附加数据 */
  protected _parentData: ParentData | undefined = undefined;

  /** 是否需要重新布局 */
  protected _needsLayout: boolean = true;

  /** 是否需要重新绘制 */
  protected _needsPaint: boolean = true;

  /** 是否已挂载到渲染树 */
  protected _attached: boolean = false;

  /** 在渲染树中的深度 */
  protected _depth: number = 0;

  // ════════════════════════════════════════════════════
  //  只读属性访问器
  // ════════════════════════════════════════════════════

  /** 父节点，未挂载时为 null。 */
  get parent(): RenderObject | null {
    return this._parent;
  }

  /** 子节点只读视图。 */
  get children(): readonly RenderObject[] {
    return this._children;
  }

  /** 父节点附加数据。 */
  get parentData(): ParentData | undefined {
    return this._parentData;
  }

  /** 设置父节点附加数据。 */
  set parentData(value: ParentData | undefined) {
    this._parentData = value;
  }

  /** 是否需要重新布局。 */
  get needsLayout(): boolean {
    return this._needsLayout;
  }

  /** 是否需要重新绘制。 */
  get needsPaint(): boolean {
    return this._needsPaint;
  }

  /** 是否已挂载到渲染树。 */
  get attached(): boolean {
    return this._attached;
  }

  /** 在渲染树中的深度。 */
  get depth(): number {
    return this._depth;
  }

  // ════════════════════════════════════════════════════
  //  子节点管理
  // ════════════════════════════════════════════════════

  /**
   * 为子节点设置父数据，默认为空操作。
   *
   * 子类可覆盖此方法以在 {@link adoptChild} 过程中初始化 parentData。
   *
   * @param child - 待设置的子节点
   */
  setupParentData(_child: RenderObject): void {}

  /**
   * 收养子节点。
   *
   * 设置子节点的父引用、深度，调用 {@link setupParentData}，
   * 将其加入子节点列表。若当前节点已挂载，则自动 attach 子节点。
   * 最后标记当前节点需要重新布局。
   *
   * @param child - 待收养的子节点
   */
  adoptChild(child: RenderObject): void {
    child._parent = this;
    child._depth = this._depth + 1;
    this.setupParentData(child);
    this._children.push(child);
    if (this._attached) {
      child.attach();
    }
    this.markNeedsLayout();
  }

  /**
   * 移除子节点。
   *
   * 分离子节点的 parentData，若当前节点已挂载则自动 detach 子节点，
   * 从子节点列表中移除，清除父引用，并标记需要重新布局。
   *
   * @param child - 待移除的子节点
   */
  dropChild(child: RenderObject): void {
    child._parentData?.detach();
    child._parentData = undefined;
    if (this._attached) {
      child.detach();
    }
    const index = this._children.indexOf(child);
    if (index !== -1) {
      this._children.splice(index, 1);
    }
    child._parent = null;
    this.markNeedsLayout();
  }

  /**
   * 移除所有子节点。
   *
   * 迭代副本逐一调用 {@link dropChild}。
   */
  removeAllChildren(): void {
    const copy = [...this._children];
    for (const child of copy) {
      this.dropChild(child);
    }
  }

  // ════════════════════════════════════════════════════
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 挂载到渲染树。
   *
   * 设置 attached = true，递归挂载所有子节点。
   */
  attach(): void {
    this._attached = true;
    for (const child of this._children) {
      child.attach();
    }
  }

  /**
   * 从渲染树卸载。
   *
   * 设置 attached = false，递归卸载所有子节点。
   */
  detach(): void {
    this._attached = false;
    for (const child of this._children) {
      child.detach();
    }
  }

  // ════════════════════════════════════════════════════
  //  脏标记
  // ════════════════════════════════════════════════════

  /**
   * 标记当前节点需要重新布局。
   *
   * 如果存在父节点，则向上传播；否则若已挂载，
   * 则通知全局管线所有者调度布局。
   */
  markNeedsLayout(): void {
    this._needsLayout = true;
    if (this._parent != null) {
      this._parent.markNeedsLayout();
    } else if (this._attached) {
      getPipelineOwner()?.requestLayout(this);
    }
  }

  /**
   * 标记当前节点需要重新绘制。
   *
   * 通知全局管线所有者调度绘制。
   */
  markNeedsPaint(): void {
    this._needsPaint = true;
    getPipelineOwner()?.requestPaint(this);
  }

  // ════════════════════════════════════════════════════
  //  布局与绘制
  // ════════════════════════════════════════════════════

  /**
   * 执行布局计算（抽象方法）。
   *
   * 子类必须实现此方法以确定自身及子节点的尺寸与位置。
   */
  abstract performLayout(): void;

  /**
   * 绘制当前节点及其子树。
   *
   * 默认实现遍历所有子节点，依次调用子节点的 paint 方法。
   * 子类可覆盖以添加自定义绘制逻辑。
   *
   * @param screen - 目标屏幕
   * @param offsetX - X 偏移量
   * @param offsetY - Y 偏移量
   */
  paint(screen: Screen, offsetX: number, offsetY: number): void {
    for (const child of this._children) {
      child.paint(screen, offsetX, offsetY);
    }
  }

  // ════════════════════════════════════════════════════
  //  命中测试
  // ════════════════════════════════════════════════════

  /**
   * 递归命中测试。
   *
   * 逆向: Dy0 in tui-widget-framework.js:1879-1921
   *
   * 对于拥有 size + offset 的节点（{@link RenderBox}），检查 position 是否
   * 在 size+offset 定义的矩形范围内。命中则将自身加入 result 并逆序递归子节点。
   * 对于无 size/offset 的节点（纯 {@link RenderObject}），直接递归子节点。
   *
   * children 以逆序遍历，确保后绘制（z-order 更高）的节点优先命中。
   *
   * @param result - 命中测试结果累积器
   * @param position - 测试点的全局坐标
   * @param offsetX - 父节点累积的 X 偏移（默认 0）
   * @param offsetY - 父节点累积的 Y 偏移（默认 0）
   * @returns 至少有一个命中返回 true，否则返回 false
   */
  hitTest(
    result: HitTestResult,
    position: { x: number; y: number },
    offsetX = 0,
    offsetY = 0,
  ): boolean {
    // RenderBox 子类拥有 _size 和 _offset，通过 runtime 检查判断
    const self = this as Record<string, unknown>;
    const size = self._size as { width: number; height: number } | undefined;
    const offset = self._offset as { x: number; y: number } | undefined;

    if (size && offset) {
      const absX = offsetX + offset.x;
      const absY = offsetY + offset.y;
      const inX = position.x >= absX && position.x < absX + size.width;
      const inY = position.y >= absY && position.y < absY + size.height;
      if (inX && inY) {
        const localPosition = {
          x: position.x - absX,
          y: position.y - absY,
        };
        result.add({ target: this, localPosition });
        for (let i = this._children.length - 1; i >= 0; i--) {
          this._children[i]!.hitTest(result, position, absX, absY);
        }
        return true;
      }
      return false;
    }

    // 无 size/offset 节点: 递归子节点
    let hit = false;
    for (const child of this._children) {
      if (child.hitTest(result, position, offsetX, offsetY)) hit = true;
    }
    return hit;
  }

  // ════════════════════════════════════════════════════
  //  遍历
  // ════════════════════════════════════════════════════

  /**
   * 遍历所有直接子节点。
   *
   * @param visitor - 访问回调，对每个直接子节点调用一次
   */
  visitChildren(visitor: (child: RenderObject) => void): void {
    for (const child of this._children) {
      visitor(child);
    }
  }

  // ════════════════════════════════════════════════════
  //  清理
  // ════════════════════════════════════════════════════

  /**
   * 释放资源，移除所有子节点。
   */
  dispose(): void {
    this.removeAllChildren();
  }
}
