/**
 * LayerLink — 锚点定位。
 *
 * LayerLink 将 Overlay 弹出层锚定到目标 Widget 位置。
 * 当 target 位置变化时，通知所有 followers 更新。
 *
 * 还原自逆向工程代码中的 mZT 类 (micromark-parser.js:11454-11485)。
 *
 * @module layer-link
 *
 * @example
 * ```ts
 * const link = new LayerLink();
 * link.setTarget(renderBox);
 * const transform = link.getTargetTransform();
 * // { position: { x: 10, y: 20 }, size: { width: 80, height: 1 } }
 * ```
 */

/**
 * 目标的位置与尺寸变换信息。
 */
export interface TargetTransform {
  /** 目标的全局位置 */
  position: { x: number; y: number };
  /** 目标的尺寸 */
  size: { width: number; height: number };
}

/**
 * 锚点目标接口。
 *
 * 提供全局位置和尺寸信息的对象。
 */
export interface LayerLinkTarget {
  /** 获取全局位置 */
  getGlobalPosition(): { x: number; y: number };
  /** 获取尺寸 */
  getSize(): { width: number; height: number };
}

/**
 * 弹出层锚点链接。
 *
 * 将 Overlay 弹出层锚定到目标 Widget 的位置。
 * target 位置变化时通过 followers 回调通知追随者更新。
 *
 * 还原自逆向代码 mZT 类:
 * - _target: 锚点目标引用
 * - _followers: 追随者回调集合
 * - getTargetTransform(): 获取目标的位置和尺寸
 */
export class LayerLink {
  /** @internal 锚点目标 */
  private _target: LayerLinkTarget | null = null;

  /** @internal 追随者回调集合 */
  private _followers: Set<() => void> = new Set();

  /**
   * 获取当前锚点目标。
   *
   * @returns 当前目标，未设置时返回 null
   */
  get target(): LayerLinkTarget | null {
    return this._target;
  }

  /**
   * 设置锚点目标。
   *
   * 如果目标与当前相同则忽略，否则更新并通知所有 followers。
   *
   * @param target - 新的锚点目标
   */
  setTarget(target: LayerLinkTarget): void {
    if (this._target === target) return;
    this._target = target;
    this._notifyFollowers();
  }

  /**
   * 清除锚点目标。
   *
   * 将 target 设为 null 并通知所有 followers。
   */
  clearTarget(): void {
    if (this._target === null) return;
    this._target = null;
    this._notifyFollowers();
  }

  /**
   * 获取目标的位置和尺寸变换信息。
   *
   * @returns 目标的 {@link TargetTransform}，目标未设置时返回 null
   */
  getTargetTransform(): TargetTransform | null {
    if (!this._target) return null;
    return {
      position: this._target.getGlobalPosition(),
      size: this._target.getSize(),
    };
  }

  /**
   * 注册追随者回调。
   *
   * 当 target 位置变化时调用回调。
   *
   * @param fn - 追随者回调
   */
  addFollower(fn: () => void): void {
    this._followers.add(fn);
  }

  /**
   * 取消追随者回调。
   *
   * @param fn - 要移除的回调
   */
  removeFollower(fn: () => void): void {
    this._followers.delete(fn);
  }

  /**
   * @internal 通知所有 followers。
   *
   * 安全调用每个回调，捕获并记录错误。
   */
  private _notifyFollowers(): void {
    for (const fn of this._followers) {
      try {
        fn();
      } catch (err) {
        console.error("Error in LayerLink follower callback:", err);
      }
    }
  }
}
