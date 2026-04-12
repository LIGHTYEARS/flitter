/**
 * 选区保活边界。
 *
 * `SelectionKeepAliveBoundary` 在 ListView 虚拟化场景中保护选区，
 * 当选区跨越此边界内的 Selectable 时，阻止 ListView 回收这些组件。
 *
 * 工作原理: 监听父 SelectionArea 的选区变化，
 * 检查选区是否触及此边界管理的任何 Selectable，
 * 如果有重叠则标记 `isKeptAlive = true`。
 *
 * @example
 * ```ts
 * const boundary = new SelectionKeepAliveBoundary(selectionArea);
 * boundary.register("s1");
 * boundary.register("s2");
 *
 * // 当选区触及 s1 或 s2 时:
 * console.log(boundary.isKeptAlive); // true
 * ```
 *
 * @module
 */

import { SelectionArea, type SelectionPosition } from "./selection-area.js";

/**
 * 选区保活边界。
 *
 * 当 ListView 等虚拟化列表回收子 Widget 时，
 * 如果某个子 Widget 内的 Selectable 处于当前选区中，
 * 此边界会标记 `isKeptAlive = true` 阻止回收。
 */
export class SelectionKeepAliveBoundary {
  /** 父选区管理器 */
  private _parent: SelectionArea;
  /** 此边界管理的 selectable ID 集合 */
  private _selectables: Set<string> = new Set();
  /** 是否处于保活状态 */
  private _keptAlive: boolean = false;
  /** 选区变化监听器的清理函数 */
  private _listenerCleanup: (() => void) | null = null;
  /** 保活状态变化回调 */
  private _onKeepAliveChange: ((keptAlive: boolean) => void) | null = null;

  /**
   * 创建 SelectionKeepAliveBoundary。
   *
   * @param parent - 父 SelectionArea
   * @param onKeepAliveChange - 可选的保活状态变化回调
   */
  constructor(parent: SelectionArea, onKeepAliveChange?: (keptAlive: boolean) => void) {
    this._parent = parent;
    this._onKeepAliveChange = onKeepAliveChange ?? null;
    // 监听父 SelectionArea 的选区变化
    this._listenerCleanup = parent.addListener(() => {
      this._updateKeepAlive();
    });
  }

  /**
   * 注册此边界管理的 Selectable ID。
   *
   * @param selectableId - Selectable 的唯一 ID
   */
  register(selectableId: string): void {
    this._selectables.add(selectableId);
    this._updateKeepAlive();
  }

  /**
   * 取消注册 Selectable ID。
   *
   * @param selectableId - 要移除的 Selectable ID
   */
  unregister(selectableId: string): void {
    this._selectables.delete(selectableId);
    this._updateKeepAlive();
  }

  /**
   * 当前选区是否触及此边界内的任何 Selectable。
   *
   * 为 true 时，ListView 等虚拟化列表不应回收此边界内的组件。
   */
  get isKeptAlive(): boolean {
    return this._keptAlive;
  }

  /**
   * 销毁边界，移除选区监听。
   */
  dispose(): void {
    this._listenerCleanup?.();
    this._listenerCleanup = null;
    this._selectables.clear();
    this._setKeptAlive(false);
  }

  /**
   * 检查选区变化，更新保活状态。
   *
   * 遍历此边界管理的所有 Selectable ID，
   * 检查是否有任何 Selectable 与当前选区重叠。
   *
   * @internal
   */
  _updateKeepAlive(): void {
    const selection = this._parent.getSelection();
    if (!selection) {
      this._setKeptAlive(false);
      return;
    }

    for (const id of this._selectables) {
      if (this._selectionTouchesSelectable(selection, id)) {
        this._setKeptAlive(true);
        return;
      }
    }

    this._setKeptAlive(false);
  }

  /**
   * 检查选区是否触及指定的 Selectable。
   *
   * 如果选区的 anchor 或 extent 直接引用该 Selectable，则视为触及。
   * 否则，通过 comparePositions 检查 Selectable 范围是否与选区重叠。
   *
   * @internal
   */
  private _selectionTouchesSelectable(
    selection: { anchor: SelectionPosition; extent: SelectionPosition },
    selectableId: string
  ): boolean {
    // 直接引用检查
    if (
      selection.anchor.selectableId === selectableId ||
      selection.extent.selectableId === selectableId
    ) {
      return true;
    }

    // 范围重叠检查: 使用 comparePositions
    if (typeof this._parent.comparePositions === "function") {
      const compare = this._parent.comparePositions.bind(this._parent);
      const [start, end] =
        compare(selection.anchor, selection.extent) <= 0
          ? [selection.anchor, selection.extent]
          : [selection.extent, selection.anchor];

      const selStart: SelectionPosition = { selectableId, offset: 0 };
      // 使用一个较大的 offset 作为结束位置
      const selEnd: SelectionPosition = { selectableId, offset: Number.MAX_SAFE_INTEGER };

      // 如果 start < selEnd 且 end > selStart → 重叠
      return compare(start, selEnd) < 0 && compare(end, selStart) > 0;
    }

    return false;
  }

  /**
   * 设置保活状态，仅在状态变化时触发回调。
   *
   * @internal
   */
  private _setKeptAlive(value: boolean): void {
    if (this._keptAlive === value) return;
    this._keptAlive = value;
    this._onKeepAliveChange?.(value);
  }
}
