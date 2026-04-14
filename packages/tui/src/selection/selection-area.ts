/**
 * 跨 Widget 文本选区管理器。
 *
 * `SelectionArea` 管理多个 {@link Selectable} 组件的文本选区，
 * 支持鼠标拖选 (`beginDrag` → `updateDrag` → `endDrag`)、
 * 全选 (`selectAll`)、复制 (`copySelection`) 等操作。
 *
 * 选区结束 (endDrag) 时自动将选中文本写入系统剪贴板。
 *
 * @example
 * ```ts
 * const clipboard = new Clipboard();
 * const area = new SelectionArea(clipboard);
 *
 * area.register(mySelectable);
 * area.beginDrag({ selectableId: "s1", offset: 0 });
 * area.updateDrag({ selectableId: "s1", offset: 10 });
 * await area.endDrag();
 * // 选中文本已自动复制到剪贴板
 * ```
 *
 * @module
 */

import { Clipboard } from "./clipboard.js";

/**
 * 选区位置: 标识一个 Selectable 内的偏移。
 */
export interface SelectionPosition {
  /** 所属 Selectable 的 ID */
  selectableId: string;
  /** 在 Selectable 文本中的 grapheme 偏移 */
  offset: number;
}

/**
 * 可被选择的组件接口。
 *
 * 任何希望参与文本选择的 Widget 都需实现此接口。
 */
export interface Selectable {
  /** 唯一标识符 */
  id: string;
  /** 获取此组件的文本内容 */
  getText(): string;
  /** 获取在全局坐标系中的边界 */
  getGlobalBounds(): { top: number; left: number; width: number; height: number };
  /** 高亮指定范围的文本 */
  setHighlightRange(start: number, end: number): void;
  /** 清除高亮 */
  clearHighlight(): void;
}

/**
 * 跨 Widget 文本选区管理器。
 *
 * 管理多个 Selectable 的注册、选区状态和拖选操作。
 * 选区跨越多个 Selectable 时，按文档位置 (top → left) 排序，
 * 依次收集各 Selectable 的选中文本。
 */
export class SelectionArea {
  /** 已注册的 Selectable，按 ID 索引 */
  private _selectables: Map<string, Selectable> = new Map();
  /** 按文档位置排序的缓存 */
  private _orderedCache: Selectable[] = [];
  /** 排序缓存是否过期 */
  private _orderDirty: boolean = true;
  /** 当前选区 */
  private _selection: { anchor: SelectionPosition; extent: SelectionPosition } | null = null;
  /** 是否正在拖选 */
  private _isDraggingState: boolean = false;
  /** 拖选锚点 */
  private _dragAnchor: SelectionPosition | null = null;
  /** 剪贴板实例 */
  private _clipboard: Clipboard;
  /** 复制高亮定时器 */
  private _copyHighlightTimer: ReturnType<typeof setTimeout> | null = null;
  /** 选区变化监听器 */
  private _listeners: Set<() => void> = new Set();

  /**
   * 创建 SelectionArea。
   *
   * @param clipboard - 剪贴板实例，不传则创建默认实例
   */
  constructor(clipboard?: Clipboard) {
    this._clipboard = clipboard ?? new Clipboard();
  }

  /**
   * 注册一个可选择组件。
   *
   * @param selectable - 实现 Selectable 接口的组件
   */
  register(selectable: Selectable): void {
    this._selectables.set(selectable.id, selectable);
    this._orderDirty = true;
  }

  /**
   * 取消注册可选择组件。
   *
   * @param selectableId - 组件的唯一 ID
   */
  unregister(selectableId: string): void {
    this._selectables.delete(selectableId);
    this._orderDirty = true;
  }

  /**
   * 获取已注册的 Selectable 数量。
   */
  getSelectableCount(): number {
    return this._selectables.size;
  }

  /**
   * 设置选区。
   *
   * @param anchor - 选区锚点
   * @param extent - 选区终点
   */
  setSelection(anchor: SelectionPosition, extent: SelectionPosition): void {
    this._selection = { anchor, extent };
    this._propagateSelection();
    this._notifyListeners();
  }

  /**
   * 获取当前选区。
   *
   * @returns 当前选区，或 null 表示无选区
   */
  getSelection(): { anchor: SelectionPosition; extent: SelectionPosition } | null {
    return this._selection;
  }

  /**
   * 清除选区。
   */
  clear(): void {
    this._selection = null;
    for (const s of this._selectables.values()) {
      s.clearHighlight();
    }
    this._notifyListeners();
  }

  /**
   * 选中所有已注册的 Selectable 的全部内容。
   *
   * 按文档位置排序后，锚点为第一个 Selectable 的开头，
   * 终点为最后一个 Selectable 的末尾。
   */
  selectAll(): void {
    if (this._selectables.size === 0) return;

    this._refreshOrderedCache();
    const first = this._orderedCache[0];
    const last = this._orderedCache[this._orderedCache.length - 1];
    if (!first || !last) return;

    this.setSelection(
      { selectableId: first.id, offset: 0 },
      { selectableId: last.id, offset: last.getText().length },
    );
  }

  /**
   * 开始拖选。
   *
   * @param position - 拖选起始位置
   */
  beginDrag(position: SelectionPosition): void {
    this._isDraggingState = true;
    this._dragAnchor = position;
    this.setSelection(position, position);
  }

  /**
   * 更新拖选位置。
   *
   * @param position - 当前鼠标位置
   */
  updateDrag(position: SelectionPosition): void {
    if (!this._isDraggingState || !this._dragAnchor) return;
    this.setSelection(this._dragAnchor, position);
  }

  /**
   * 结束拖选，自动复制选区文本到剪贴板。
   */
  async endDrag(): Promise<void> {
    this._isDraggingState = false;
    const text = this.copySelection();
    if (text) {
      try {
        await this._clipboard.writeText(text);
      } catch {
        // 剪贴板写入失败不影响选区
      }
      this.startCopyHighlight();
    }
  }

  /**
   * 是否正在拖选。
   */
  isDragging(): boolean {
    return this._isDraggingState;
  }

  /**
   * 收集当前选区的文本。
   *
   * 跨多个 Selectable 时，按文档顺序拼接各段文本。
   *
   * @returns 选中的文本，无选区返回空字符串
   */
  copySelection(): string {
    if (!this._selection) return "";

    const { anchor, extent } = this._selection;

    // 单个 Selectable 内的选区
    if (anchor.selectableId === extent.selectableId) {
      const s = this._selectables.get(anchor.selectableId);
      if (!s) return "";
      const text = s.getText();
      const start = Math.min(anchor.offset, extent.offset);
      const end = Math.max(anchor.offset, extent.offset);
      return text.slice(start, end);
    }

    // 跨多个 Selectable 的选区
    this._refreshOrderedCache();
    const [startPos, endPos] = this._normalizeSelection(anchor, extent);

    const parts: string[] = [];
    let inRange = false;

    for (const s of this._orderedCache) {
      if (s.id === startPos.selectableId) {
        inRange = true;
        const text = s.getText();
        parts.push(text.slice(startPos.offset));
      } else if (s.id === endPos.selectableId) {
        const text = s.getText();
        parts.push(text.slice(0, endPos.offset));
        break;
      } else if (inRange) {
        parts.push(s.getText());
      }
    }

    return parts.join("\n");
  }

  /**
   * 将选区文本复制到剪贴板。
   *
   * @returns 是否成功复制
   */
  async copyToClipboard(): Promise<boolean> {
    const text = this.copySelection();
    if (!text) return false;
    return this._clipboard.writeText(text);
  }

  /**
   * 开始复制高亮反馈 (300ms)。
   */
  startCopyHighlight(): void {
    if (!this._selection) return;
    if (this._copyHighlightTimer) {
      clearTimeout(this._copyHighlightTimer);
    }
    this._copyHighlightTimer = setTimeout(() => {
      this._copyHighlightTimer = null;
    }, 300);
  }

  /**
   * 添加选区变化监听器。
   *
   * @param listener - 回调函数
   * @returns 清理函数
   */
  addListener(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * 比较两个 SelectionPosition 的文档顺序。
   *
   * @returns 负数表示 a 在前，正数表示 b 在前，0 表示相同
   */
  comparePositions(a: SelectionPosition, b: SelectionPosition): number {
    if (a.selectableId === b.selectableId) {
      return a.offset - b.offset;
    }
    this._refreshOrderedCache();
    const idxA = this._orderedCache.findIndex((s) => s.id === a.selectableId);
    const idxB = this._orderedCache.findIndex((s) => s.id === b.selectableId);
    if (idxA === -1 || idxB === -1) return 0;
    return idxA - idxB;
  }

  /**
   * 刷新按文档位置排序的缓存。
   *
   * 按 top 升序，同行按 left 升序。
   *
   * @internal
   */
  private _refreshOrderedCache(): void {
    if (!this._orderDirty) return;
    this._orderedCache = Array.from(this._selectables.values()).sort((a, b) => {
      const boundsA = a.getGlobalBounds();
      const boundsB = b.getGlobalBounds();
      const topDiff = boundsA.top - boundsB.top;
      if (topDiff !== 0) return topDiff;
      return boundsA.left - boundsB.left;
    });
    this._orderDirty = false;
  }

  /**
   * 将选区分发到各 Selectable 的高亮范围。
   *
   * @internal
   */
  private _propagateSelection(): void {
    if (!this._selection) {
      for (const s of this._selectables.values()) {
        s.clearHighlight();
      }
      return;
    }

    const { anchor, extent } = this._selection;

    // 单个 Selectable
    if (anchor.selectableId === extent.selectableId) {
      const start = Math.min(anchor.offset, extent.offset);
      const end = Math.max(anchor.offset, extent.offset);
      for (const s of this._selectables.values()) {
        if (s.id === anchor.selectableId) {
          s.setHighlightRange(start, end);
        } else {
          s.clearHighlight();
        }
      }
      return;
    }

    // 跨多个 Selectable
    this._refreshOrderedCache();
    const [startPos, endPos] = this._normalizeSelection(anchor, extent);
    let inRange = false;

    for (const s of this._orderedCache) {
      if (s.id === startPos.selectableId) {
        inRange = true;
        s.setHighlightRange(startPos.offset, s.getText().length);
      } else if (s.id === endPos.selectableId) {
        s.setHighlightRange(0, endPos.offset);
        inRange = false;
      } else if (inRange) {
        s.setHighlightRange(0, s.getText().length);
      } else {
        s.clearHighlight();
      }
    }
  }

  /**
   * 规范化选区方向，确保 start 在 end 之前。
   *
   * @internal
   */
  private _normalizeSelection(
    anchor: SelectionPosition,
    extent: SelectionPosition,
  ): [SelectionPosition, SelectionPosition] {
    const cmp = this.comparePositions(anchor, extent);
    if (cmp <= 0) {
      return [anchor, extent];
    }
    return [extent, anchor];
  }

  /**
   * 通知所有监听器。
   *
   * @internal
   */
  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // 忽略监听器错误
      }
    }
  }
}
