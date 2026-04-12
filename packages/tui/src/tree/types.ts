/**
 * 渲染树的基础类型定义。
 *
 * 包含 {@link Position}、{@link ParentData}、{@link PipelineOwnerLike}、
 * {@link BuildOwnerLike} 等核心接口与类，以及模块级的单例桥接函数。
 *
 * @module
 */

// ════════════════════════════════════════════════════
//  基础接口与类
// ════════════════════════════════════════════════════

/**
 * 二维位置接口。
 */
export interface Position {
  /** X 坐标 */
  readonly x: number;
  /** Y 坐标 */
  readonly y: number;
}

/**
 * 父节点数据基类。
 *
 * 子类可覆盖 {@link detach} 以在节点从父节点移除时清理资源。
 */
export class ParentData {
  /** 从父节点分离时的清理回调，默认为空操作。 */
  detach(): void {}
}

/**
 * 渲染管线所有者接口。
 *
 * 由 PipelineOwner 实现，负责调度布局与绘制请求。
 */
export interface PipelineOwnerLike {
  /** 请求对指定节点重新布局。 */
  requestLayout(node: unknown): void;
  /** 请求对指定节点重新绘制。 */
  requestPaint(node: unknown): void;
  /** 将指定节点从待处理队列中移除。 */
  removeFromQueues(node: unknown): void;
}

/**
 * 构建所有者接口。
 *
 * 由 BuildOwner 实现，负责调度元素的重新构建。
 */
export interface BuildOwnerLike {
  /** 为指定元素安排一次重新构建。 */
  scheduleBuildFor(element: unknown): void;
}

// ════════════════════════════════════════════════════
//  模块级单例桥接
// ════════════════════════════════════════════════════

/** @internal 当前管线所有者实例 */
let _pipelineOwner: PipelineOwnerLike | undefined;

/** @internal 当前构建所有者实例 */
let _buildOwner: BuildOwnerLike | undefined;

/**
 * 设置全局管线所有者。
 *
 * @param owner - 管线所有者实例，传入 undefined 以清除
 */
export function setPipelineOwner(owner: PipelineOwnerLike | undefined): void {
  _pipelineOwner = owner;
}

/**
 * 获取当前全局管线所有者。
 *
 * @returns 当前管线所有者，未设置时返回 undefined
 */
export function getPipelineOwner(): PipelineOwnerLike | undefined {
  return _pipelineOwner;
}

/**
 * 设置全局构建所有者。
 *
 * @param owner - 构建所有者实例，传入 undefined 以清除
 */
export function setBuildOwner(owner: BuildOwnerLike | undefined): void {
  _buildOwner = owner;
}

/**
 * 获取当前全局构建所有者。
 *
 * @returns 当前构建所有者，未设置时返回 undefined
 */
export function getBuildOwner(): BuildOwnerLike | undefined {
  return _buildOwner;
}
