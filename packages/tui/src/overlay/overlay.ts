/**
 * Overlay StatefulWidget — 管理 OverlayEntry 列表。
 *
 * Overlay 作为弹出层容器，管理多个 {@link OverlayEntry} 的
 * 插入、移除和按序渲染。条目按插入顺序堆叠（后插入在上层）。
 *
 * 还原自逆向工程代码中 Overlay 相关逻辑。
 *
 * @module overlay
 *
 * @example
 * ```ts
 * const state = new OverlayState((fn) => { fn?.(); });
 * const entry = new OverlayEntry({ builder: () => someWidget });
 * state.insert(entry);
 * const widgets = state.buildEntries(); // 获取所有 entry 构建的 Widget 列表
 * state.remove(entry);
 * ```
 */

import type { Widget } from "../tree/widget.js";
import { OverlayEntry } from "./overlay-entry.js";

/** Overlay 插入选项。 */
export interface OverlayInsertOptions {
  /** 在此 entry 下方插入 */
  below?: OverlayEntry;
  /** 在此 entry 上方插入 */
  above?: OverlayEntry;
}

/**
 * Overlay 状态管理器。
 *
 * 管理 {@link OverlayEntry} 列表的增删和构建。
 * 通过 setState 回调触发宿主 Widget 的重建。
 *
 * 支持:
 * - insert(entry): 添加到列表尾部（最上层）
 * - insert(entry, { below }): 在指定 entry 下方插入
 * - insert(entry, { above }): 在指定 entry 上方插入
 * - remove(entry): 移除条目
 * - buildEntries(): 按序构建所有 entry 的 Widget
 */
export class OverlayState {
  /** @internal entry 列表，尾部为最上层 */
  private _entries: OverlayEntry[] = [];

  /** @internal 宿主 setState 回调 */
  private _setState: (fn?: () => void) => void;

  /**
   * 创建 OverlayState。
   *
   * @param setState - 宿主 Widget 的 setState 回调，用于触发重建
   */
  constructor(setState: (fn?: () => void) => void) {
    this._setState = setState;
  }

  /**
   * 获取当前 entry 数量。
   *
   * @returns entry 列表长度
   */
  get entryCount(): number {
    return this._entries.length;
  }

  /**
   * 获取 entries 的只读副本。
   *
   * @returns entry 列表的浅拷贝
   */
  get entries(): readonly OverlayEntry[] {
    return [...this._entries];
  }

  /**
   * 插入 OverlayEntry。
   *
   * 默认插入到列表尾部（最上层）。
   * 可通过 options.below 或 options.above 指定相对位置。
   *
   * @param entry - 要插入的 entry
   * @param options - 插入位置选项
   * @throws 如果 below/above 的 entry 不在列表中
   */
  insert(entry: OverlayEntry, options?: OverlayInsertOptions): void {
    entry._setOverlayState(this);

    if (options?.below) {
      const idx = this._entries.indexOf(options.below);
      if (idx === -1) {
        throw new Error("OverlayState.insert: 'below' entry not found in overlay");
      }
      this._entries.splice(idx, 0, entry);
    } else if (options?.above) {
      const idx = this._entries.indexOf(options.above);
      if (idx === -1) {
        throw new Error("OverlayState.insert: 'above' entry not found in overlay");
      }
      this._entries.splice(idx + 1, 0, entry);
    } else {
      this._entries.push(entry);
    }

    this._setState();
  }

  /**
   * 从 Overlay 移除 entry。
   *
   * 将 entry 从列表移除并解绑 overlayState。
   *
   * @param entry - 要移除的 entry
   */
  remove(entry: OverlayEntry): void {
    const idx = this._entries.indexOf(entry);
    if (idx !== -1) {
      this._entries.splice(idx, 1);
      entry._setOverlayState(null!);
      this._setState();
    }
  }

  /**
   * 构建所有 entry 的 Widget 列表。
   *
   * 按插入顺序（先插入在下层，后插入在上层）调用每个 entry 的 builder。
   * 构建后清除每个 entry 的脏标记。
   *
   * @param context - 传递给 builder 的构建上下文
   * @returns 所有 entry 构建产生的 Widget 数组
   */
  buildEntries(context?: any): Widget[] {
    const widgets: Widget[] = [];
    for (const entry of this._entries) {
      widgets.push(entry.builder(context));
      entry._clearNeedsRebuild();
    }
    return widgets;
  }

  /**
   * @internal 标记需要重建。
   *
   * 由 OverlayEntry.markNeedsBuild 调用，触发宿主 Widget 重建。
   */
  _markNeedsRebuild(): void {
    this._setState();
  }
}
