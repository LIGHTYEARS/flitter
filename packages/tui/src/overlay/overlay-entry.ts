/**
 * OverlayEntry — 延迟构建的弹出层条目。
 *
 * OverlayEntry 通过 builder 函数延迟构建 Widget，
 * 多个 OverlayEntry 按插入顺序堆叠（后插入在上层）。
 *
 * 还原自逆向工程代码中的 lZT 类 (micromark-parser.js:11427-11453)。
 *
 * @module overlay-entry
 *
 * @example
 * ```ts
 * const entry = new OverlayEntry({
 *   builder: (context) => new Text({ text: "弹出内容" }),
 * });
 * overlayState.insert(entry);
 * entry.remove(); // 移除弹出层
 * ```
 */

import type { Widget } from "../tree/widget.js";
import type { OverlayState } from "./overlay.js";

/** OverlayEntry 构造选项。 */
export interface OverlayEntryOptions {
  /** builder 函数，延迟构建弹出层的 Widget 内容 */
  builder: (context: any) => Widget;
  /** 是否在隐藏时保持 Widget 状态，默认 false */
  maintainState?: boolean;
}

/**
 * 弹出层条目。
 *
 * 通过 builder 函数延迟构建 Widget 内容。
 * 绑定到 {@link OverlayState} 后，可通过 {@link remove} 从 Overlay 移除。
 * 调用 {@link markNeedsBuild} 触发重建。
 *
 * 还原自逆向代码 lZT 类:
 * - builder: 构建函数
 * - maintainState: 保持状态标记
 * - _overlayState: 绑定的 Overlay
 * - _needsBuild: 脏标记
 */
export class OverlayEntry {
  /** 构建弹出层 Widget 的工厂函数 */
  readonly builder: (context: any) => Widget;

  /** 是否在隐藏时保持 Widget 状态 */
  readonly maintainState: boolean;

  /** @internal 绑定的 OverlayState */
  _overlayState: OverlayState | null = null;

  /** @internal 是否需要重建 */
  _needsBuild: boolean = true;

  /**
   * 创建 OverlayEntry。
   *
   * @param options - 构造选项
   */
  constructor(options: OverlayEntryOptions) {
    this.builder = options.builder;
    this.maintainState = options.maintainState ?? false;
  }

  /**
   * 是否已挂载到 Overlay。
   *
   * @returns 已绑定到 OverlayState 时返回 true
   */
  get mounted(): boolean {
    return this._overlayState !== undefined && this._overlayState !== null;
  }

  /**
   * 从 Overlay 移除此条目。
   *
   * 如果已绑定到 OverlayState，调用其 remove 方法。
   */
  remove(): void {
    if (this._overlayState) {
      this._overlayState.remove(this);
    }
  }

  /**
   * 标记需要重建。
   *
   * 设置脏标记并通知绑定的 OverlayState 需要重建。
   */
  markNeedsBuild(): void {
    this._needsBuild = true;
    if (this._overlayState) {
      this._overlayState._markNeedsRebuild();
    }
  }

  /**
   * @internal 绑定到 OverlayState。
   *
   * @param overlayState - 目标 OverlayState
   */
  _setOverlayState(overlayState: OverlayState): void {
    this._overlayState = overlayState;
  }

  /**
   * @internal 是否需要重建。
   *
   * @returns 需要重建时返回 true
   */
  _needsRebuild(): boolean {
    return this._needsBuild;
  }

  /**
   * @internal 清除重建标记。
   */
  _clearNeedsRebuild(): void {
    this._needsBuild = false;
  }
}
