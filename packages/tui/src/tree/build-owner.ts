/**
 * 构建所有者。
 *
 * {@link BuildOwner} 负责管理脏元素（dirty elements）队列，
 * 按深度排序后依次调用 {@link Element.performRebuild} 完成重建。
 * 支持在重建过程中处理新增的脏元素（最多迭代 10 轮）。
 *
 * @module
 */

import { logger } from "../debug/logger.js";
import type { Element } from "./element.js";
import type { BuildOwnerLike } from "./types.js";

const log = logger.scoped("build");

/**
 * 构建所有者，管理元素树的脏标记调度与重建流程。
 *
 * 实现 {@link BuildOwnerLike} 接口，作为全局构建调度器使用。
 * 通过 {@link scheduleBuildFor} 接收脏元素，通过 {@link buildScopes}
 * 按深度顺序执行重建。
 */
export class BuildOwner implements BuildOwnerLike {
  /** 待重建的脏元素集合 */
  private _dirtyElements: Set<Element> = new Set();

  /** 需要新帧时的回调函数 */
  private _onNeedFrame: (() => void) | undefined = undefined;

  /**
   * 当前是否存在待重建的脏元素。
   *
   * @returns 脏元素集合非空时返回 true
   */
  get hasDirtyElements(): boolean {
    return this._dirtyElements.size > 0;
  }

  /**
   * 设置"需要新帧"回调。
   *
   * 当有新的脏元素被调度时，会调用此回调以请求帧调度器安排新帧。
   *
   * @param callback - 请求新帧的回调函数
   */
  setOnNeedFrame(callback: () => void): void {
    this._onNeedFrame = callback;
  }

  /**
   * 为指定元素安排一次重新构建。
   *
   * 将元素添加到脏元素集合中，并触发"需要新帧"回调。
   *
   * @param element - 需要重建的元素
   */
  scheduleBuildFor(element: unknown): void {
    this._dirtyElements.add(element as Element);
    log.debug("scheduleBuildFor", {
      element: (element as Element).constructor?.name,
      dirty: this._dirtyElements.size,
    });
    this._onNeedFrame?.();
  }

  /**
   * 执行构建作用域。
   *
   * 将当前所有脏元素按深度升序排列（父节点优先），依次调用
   * {@link Element.performRebuild}。如果重建过程中产生了新的
   * 脏元素，则继续迭代处理，最多迭代 10 轮。
   */
  buildScopes(): void {
    log.debug("buildScopes", { dirty: this._dirtyElements.size });
    let iterations = 0;
    const maxIterations = 10;

    while (this._dirtyElements.size > 0 && iterations < maxIterations) {
      const snapshot = [...this._dirtyElements];
      this._dirtyElements.clear();

      // 按深度升序排列（父节点先于子节点重建）
      snapshot.sort((a, b) => a.depth - b.depth);

      for (const element of snapshot) {
        element.performRebuild();
      }
      iterations++;
    }
  }

  /**
   * 释放资源，清空脏元素集合。
   */
  dispose(): void {
    this._dirtyElements.clear();
  }
}
