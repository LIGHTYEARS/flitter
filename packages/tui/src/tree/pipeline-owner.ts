/**
 * 渲染管线所有者。
 *
 * {@link PipelineOwner} 负责管理渲染树的布局与绘制管线，
 * 维护根渲染对象、根约束，以及需要重绘的节点队列。
 * 通过 {@link flushLayout} 和 {@link flushPaint} 分别执行布局与绘制阶段。
 *
 * @module
 */

import type { PipelineOwnerLike } from "./types.js";
import type { RenderObject } from "./render-object.js";
import { RenderBox } from "./render-box.js";
import { BoxConstraints } from "./constraints.js";
import type { Size } from "./constraints.js";

/**
 * 渲染管线所有者，管理渲染树的布局与绘制调度。
 *
 * 实现 {@link PipelineOwnerLike} 接口，作为全局渲染管线调度器使用。
 * 维护根渲染对象及其约束，管理需要重绘的节点集合。
 */
export class PipelineOwner implements PipelineOwnerLike {
  /** 需要重绘的节点集合 */
  private _nodesNeedingPaint: Set<RenderObject> = new Set();

  /** 根渲染对象 */
  private _rootRenderObject: RenderObject | undefined = undefined;

  /** 根约束 */
  private _rootConstraints: BoxConstraints | undefined = undefined;

  /** 需要新帧时的回调函数 */
  private _onNeedFrame: (() => void) | undefined = undefined;

  /**
   * 当前是否存在需要重绘的节点。
   *
   * @returns 重绘队列非空时返回 true
   */
  get hasNodesNeedingPaint(): boolean {
    return this._nodesNeedingPaint.size > 0;
  }

  /**
   * 获取根渲染对象。
   *
   * @returns 当前根渲染对象，未设置时返回 undefined
   */
  get rootRenderObject(): RenderObject | undefined {
    return this._rootRenderObject;
  }

  /**
   * 设置"需要新帧"回调。
   *
   * 当有布局或绘制请求时，会调用此回调以请求帧调度器安排新帧。
   *
   * @param callback - 请求新帧的回调函数
   */
  setOnNeedFrame(callback: () => void): void {
    this._onNeedFrame = callback;
  }

  /**
   * 设置根渲染对象。
   *
   * @param renderObject - 渲染树的根节点
   */
  setRootRenderObject(renderObject: RenderObject): void {
    this._rootRenderObject = renderObject;
  }

  /**
   * 更新根约束。
   *
   * 根据给定尺寸创建紧约束（tight constraints），如果约束发生变化，
   * 则标记根渲染对象需要重新布局。
   *
   * @param size - 新的根尺寸
   */
  updateRootConstraints(size: Size): void {
    const newConstraints = BoxConstraints.tight(size.width, size.height);
    if (
      !this._rootConstraints ||
      !this._rootConstraints.equals(newConstraints)
    ) {
      this._rootConstraints = newConstraints;
      if (this._rootRenderObject) {
        this._rootRenderObject.markNeedsLayout();
      }
    }
  }

  /**
   * 请求对指定节点重新布局。
   *
   * 触发"需要新帧"回调以安排布局。
   *
   * @param node - 需要重新布局的节点
   */
  requestLayout(node: unknown): void {
    this._onNeedFrame?.();
  }

  /**
   * 请求对指定节点重新绘制。
   *
   * 将节点添加到重绘队列，并触发"需要新帧"回调。
   *
   * @param node - 需要重新绘制的节点
   */
  requestPaint(node: unknown): void {
    this._nodesNeedingPaint.add(node as RenderObject);
    this._onNeedFrame?.();
  }

  /**
   * 将指定节点从待处理队列中移除。
   *
   * @param node - 待移除的节点
   */
  removeFromQueues(node: unknown): void {
    this._nodesNeedingPaint.delete(node as RenderObject);
  }

  /**
   * 执行布局阶段。
   *
   * 如果根渲染对象和根约束都已设置，且根对象是 {@link RenderBox}，
   * 则使用根约束对其执行布局。
   *
   * @returns 是否成功执行了布局
   */
  flushLayout(): boolean {
    if (!this._rootRenderObject || !this._rootConstraints) {
      return false;
    }
    if (this._rootRenderObject instanceof RenderBox) {
      (this._rootRenderObject as RenderBox).layout(this._rootConstraints);
      return true;
    }
    return false;
  }

  /**
   * 执行绘制阶段。
   *
   * 遍历所有需要重绘的节点，清除其 _needsPaint 标记，
   * 然后清空重绘队列。
   */
  flushPaint(): void {
    for (const node of this._nodesNeedingPaint) {
      (node as any)._needsPaint = false;
    }
    this._nodesNeedingPaint.clear();
  }

  /**
   * 释放资源，清空重绘队列。
   */
  dispose(): void {
    this._nodesNeedingPaint.clear();
  }
}
