/**
 * 跨 Widget 文本选区管理器。
 *
 * `SelectionArea` 管理多个 {@link Selectable} 组件的文本选区，
 * 支持鼠标拖选 (`beginDrag` → `updateDrag` → `endDrag`)、
 * 双击词选 (`selectWordAt`)、三击行选 (`selectLineAt`)、
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
 * 词边界字符集 — 空白符 (匹配 amp `lx0`)。
 *
 * 逆向: modules/1472_tail_anonymous.js line 52
 */
const WHITESPACE_CHARS = new Set([
  " ",
  "\t",
  "\n",
  "\r",
  "\v",
  "\f",
  "\xA0",
  "\u1680",
  "\u2000",
  "\u2001",
  "\u2002",
  "\u2003",
  "\u2004",
  "\u2005",
  "\u2006",
  "\u2007",
  "\u2008",
  "\u2009",
  "\u200A",
  "\u2028",
  "\u2029",
  "\u202F",
  "\u205F",
  "\u3000",
  "\uFEFF",
]);

/**
 * 词边界字符集 — 标点符号 (匹配 amp `Ax0`)。
 *
 * 逆向: modules/1472_tail_anonymous.js line 53
 */
const PUNCTUATION_CHARS = new Set([
  "/",
  "\\",
  ".",
  ",",
  ";",
  ":",
  "!",
  "?",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "<",
  ">",
  "'",
  '"',
  "=",
  "+",
  "-",
  "*",
  "&",
  "|",
  "^",
  "%",
  "$",
  "#",
  "@",
  "~",
  "`",
  "_",
]);

/**
 * 判断一个字符是否为词边界 (匹配 amp `_isWordBoundary`)。
 *
 * 逆向: modules/2152_unknown_wc.js line 172
 */
export function isWordBoundaryChar(char: string): boolean {
  return WHITESPACE_CHARS.has(char) || PUNCTUATION_CHARS.has(char);
}

/**
 * 在文本中计算指定偏移处的词边界 (匹配 amp `_getWordBoundariesAt`)。
 *
 * 逆向: modules/2152_unknown_wc.js lines 173-188
 *
 * @param text - 文本内容 (grapheme 数组或字符串)
 * @param offset - 偏移位置
 * @returns 词的 start/end 偏移
 */
export function getWordBoundariesAt(text: string, offset: number): { start: number; end: number } {
  const len = text.length;
  const pos = Math.max(0, Math.min(offset, len));

  // If at a boundary char, return collapsed (amp behavior: no selection on boundary)
  if (pos < len && isWordBoundaryChar(text[pos]!)) {
    return { start: pos, end: pos };
  }

  let start = pos;
  let end = pos;

  while (start > 0 && !isWordBoundaryChar(text[start - 1]!)) {
    start--;
  }
  while (end < len && !isWordBoundaryChar(text[end]!)) {
    end++;
  }

  return { start, end };
}

/**
 * 在文本中计算指定偏移处的行边界 (匹配 amp `lineBoundary`)。
 *
 * 逆向: modules/1472_tui_components/text_rendering.js lines 944-962
 *
 * @param text - 文本内容
 * @param offset - 偏移位置
 * @returns 行的 start/end 偏移
 */
export function getLineBoundariesAt(text: string, offset: number): { start: number; end: number } {
  const len = text.length;
  const pos = Math.max(0, Math.min(offset, len));

  let start = 0;
  let end = len;

  for (let i = pos - 1; i >= 0; i--) {
    if (text[i] === "\n") {
      start = i + 1;
      break;
    }
  }
  for (let i = pos; i < len; i++) {
    if (text[i] === "\n") {
      end = i;
      break;
    }
  }

  return { start, end };
}

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
 * 词/行边界范围。
 */
export interface TextBoundary {
  start: number;
  end: number;
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
  /**
   * 可选：返回指定偏移处的词边界。
   * 若未实现，SelectionArea 使用内置 `getWordBoundariesAt` 算法。
   *
   * 逆向: modules/1472_tui_components/text_rendering.js line 923
   */
  wordBoundary?(offset: number): TextBoundary;
  /**
   * 可选：返回指定偏移处的行边界。
   * 若未实现，SelectionArea 使用内置 `getLineBoundariesAt` 算法。
   *
   * 逆向: modules/1472_tui_components/text_rendering.js line 944
   */
  lineBoundary?(offset: number): TextBoundary;
}

/**
 * 拖选模式。
 */
export type DragMode = "character" | "word" | null;

/**
 * 自动滚动配置。
 */
export interface AutoScrollConfig {
  /** 距边缘多少行时触发自动滚动 (默认 1，对应 amp `autoScrollThreshold`) */
  threshold: number;
  /** 每次滚动步长 (默认 1，对应 amp `autoScrollStep`) */
  step: number;
  /** 自动滚动间隔 ms (默认 30，对应 amp `autoScrollIntervalMs`) */
  intervalMs: number;
  /** 获取滚动边界，返回 {top, bottom} 行号 */
  getScrollBounds(): { top: number; bottom: number } | null;
  /** 向上滚动 step 行 */
  scrollUp(step: number): void;
  /** 向下滚动 step 行 */
  scrollDown(step: number): void;
}

/**
 * 跨 Widget 文本选区管理器。
 *
 * 管理多个 Selectable 的注册、选区状态和拖选操作。
 * 选区跨越多个 Selectable 时，按文档位置 (top → left) 排序，
 * 依次收集各 Selectable 的选中文本。
 *
 * 支持：
 * - 双击词选 (`selectWordAt`) 和三击行选 (`selectLineAt`)
 * - 拖选中的词级别扩展 (`beginWordDrag` → `updateWordDrag`)
 * - 自动滚动 (`setAutoScrollConfig`)
 * - 点击计数跟踪 (`recordClick`)
 *
 * 逆向: modules/1472_tui_components/actions_intents.js class b1T
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

  // ── 双击 / 三击计数 ─────────────────────────────────────────────
  /** 当前点击次数 (1/2/3)，逆向: chunk-006.js `_.clickCount` */
  private _clickCount: number = 0;
  /** 上次点击时间戳 */
  private _lastClickTime: number = 0;
  /** 上次点击位置 */
  private _lastClickPos: { x: number; y: number } = { x: -1, y: -1 };
  /** 双击计时器 (逆向: `_doubleClickTimer`) */
  private _doubleClickTimer: ReturnType<typeof setTimeout> | undefined;
  /** 三击计时器 (逆向: `_tripleClickTimer`) */
  private _tripleClickTimer: ReturnType<typeof setTimeout> | undefined;

  // ── 词级拖选 ─────────────────────────────────────────────────────
  /** 词拖选基础范围 (逆向: `_wordDragBaseRange`) */
  private _wordDragBaseRange: {
    start: SelectionPosition;
    end: SelectionPosition;
  } | null = null;
  /** 词拖选是否已移动 (逆向: `_wordDragMoved`) */
  private _wordDragMoved: boolean = false;
  /** 词拖选鼠标是否按下 (逆向: `_wordDragMouseDown`) */
  private _wordDragMouseDown: boolean = false;
  /** 释放时是否需要自动复制 (逆向: `_pendingWordCopyOnRelease`) */
  private _pendingWordCopyOnRelease: boolean = false;

  // ── 自动滚动 ──────────────────────────────────────────────────────
  /** 自动滚动配置 */
  private _autoScrollConfig: AutoScrollConfig | null = null;
  /** 自动滚动定时器 (逆向: `_autoScrollTimer`) */
  private _autoScrollTimer: ReturnType<typeof setInterval> | undefined;
  /** 自动滚动方向: -1=上, 0=停, 1=下 (逆向: `_autoScrollDirection`) */
  private _autoScrollDirection: number = 0;

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

  // ── 点击计数 ──────────────────────────────────────────────────────

  /**
   * 记录一次鼠标按下，返回当前点击次数 (1/2/3)。
   *
   * 在 500ms 内、相同位置的连续点击会叠加计数 (最大 3)。
   * 超时或位置变化则重置为 1。
   *
   * 逆向: chunk-006.js `_.clickCount` (由终端层提供，此处在 flitter 层模拟)
   *
   * @param x - 全局 X 坐标
   * @param y - 全局 Y 坐标
   * @param timeMs - 当前时间戳 (ms)，默认 Date.now()
   * @returns 1 | 2 | 3
   */
  recordClick(x: number, y: number, timeMs?: number): 1 | 2 | 3 {
    const now = timeMs ?? Date.now();
    const THRESHOLD_MS = 500;

    const samePos = this._lastClickPos.x === x && this._lastClickPos.y === y;
    const withinTime = now - this._lastClickTime <= THRESHOLD_MS;

    if (samePos && withinTime && this._clickCount < 3) {
      this._clickCount = (this._clickCount + 1) as 1 | 2 | 3;
    } else if (samePos && withinTime && this._clickCount === 3) {
      // Already at max — stay at 3 (no quadruple-click)
      // no-op: don't reset
    } else {
      this._clickCount = 1;
    }

    this._lastClickTime = now;
    this._lastClickPos = { x, y };
    return this._clickCount as 1 | 2 | 3;
  }

  /**
   * 获取当前点击计数。
   */
  getClickCount(): number {
    return this._clickCount;
  }

  /**
   * 重置点击计数。
   */
  resetClickCount(): void {
    this._clickCount = 0;
    this._lastClickTime = 0;
    this._lastClickPos = { x: -1, y: -1 };
  }

  // ── 双击词选 ──────────────────────────────────────────────────────

  /**
   * 在指定 Selectable 的偏移处执行词选。
   *
   * 逆向: modules/2152_unknown_wc.js `selectWordAt` lines 372-383
   * 逆向: chunk-006.js line 4779 `this.widget.controller.selectWordAt(m)`
   *
   * @param selectableId - 目标 Selectable ID
   * @param offset - 文本偏移
   */
  selectWordAt(selectableId: string, offset: number): void {
    const s = this._selectables.get(selectableId);
    if (!s) return;

    const boundaries = this._getWordBoundaries(s, offset);

    if (boundaries.start === boundaries.end) {
      // 点击在词边界上：折叠光标 (amp behavior)
      const pos: SelectionPosition = { selectableId, offset: boundaries.start };
      this.setSelection(pos, pos);
      return;
    }

    this.setSelection(
      { selectableId, offset: boundaries.start },
      { selectableId, offset: boundaries.end },
    );
  }

  /**
   * 获取指定 Selectable 的偏移处的词边界，不修改选区。
   *
   * 逆向: modules/2152_unknown_wc.js `getWordBoundariesAt` lines 384-390
   * 逆向: chunk-006.js line 4778 `this.widget.controller.getWordBoundariesAt(m)`
   *
   * @param selectableId - 目标 Selectable ID
   * @param offset - 文本偏移
   * @returns 词边界 {start, end}
   */
  getWordBoundariesAt(selectableId: string, offset: number): TextBoundary {
    const s = this._selectables.get(selectableId);
    if (!s) return { start: offset, end: offset };
    return this._getWordBoundaries(s, offset);
  }

  // ── 三击行选 ──────────────────────────────────────────────────────

  /**
   * 在指定 Selectable 的偏移处执行行选。
   *
   * 逆向: modules/2152_unknown_wc.js `selectLineAt` lines 398-412
   * 逆向: chunk-006.js line 4776 `this.widget.controller.selectLineAt(m)`
   *
   * @param selectableId - 目标 Selectable ID
   * @param offset - 文本偏移
   */
  selectLineAt(selectableId: string, offset: number): void {
    const s = this._selectables.get(selectableId);
    if (!s) return;

    const boundaries = this._getLineBoundaries(s, offset);

    this.setSelection(
      { selectableId, offset: boundaries.start },
      { selectableId, offset: boundaries.end },
    );
  }

  // ── 词级拖选 ──────────────────────────────────────────────────────

  /**
   * 开始词级拖选 (双击后拖动)。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js lines 320-355
   *
   * @param selectableId - 起始 Selectable ID
   * @param offset - 文本偏移
   */
  beginWordDrag(selectableId: string, offset: number): void {
    const s = this._selectables.get(selectableId);
    if (!s) return;

    const boundaries = this._getWordBoundaries(s, offset);
    if (boundaries.start === boundaries.end) {
      // 空词边界：不进入词拖选模式
      this._wordDragBaseRange = null;
      return;
    }

    this._wordDragBaseRange = {
      start: { selectableId, offset: boundaries.start },
      end: { selectableId, offset: boundaries.end },
    };
    this._wordDragMoved = false;
    this._wordDragMouseDown = true;
    this._pendingWordCopyOnRelease = false;

    this.setSelection(
      { selectableId, offset: boundaries.start },
      { selectableId, offset: boundaries.end },
    );

    // Schedule auto-copy after 500ms if mouse not moved (amp pattern)
    if (this._doubleClickTimer) {
      clearTimeout(this._doubleClickTimer);
    }
    this._doubleClickTimer = setTimeout(() => {
      if (!this._wordDragBaseRange) {
        this._doubleClickTimer = undefined;
        return;
      }
      if (this._wordDragMouseDown) {
        this._pendingWordCopyOnRelease = true;
        this._doubleClickTimer = undefined;
        return;
      }
      void this.autoCopySelection();
      this._doubleClickTimer = undefined;
      this._wordDragBaseRange = null;
      this._wordDragMoved = false;
      this._wordDragMouseDown = false;
      this._pendingWordCopyOnRelease = false;
    }, 500);
  }

  /**
   * 更新词级拖选位置。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js `_continueSelectionAtPoint` lines 540-561
   *
   * @param selectableId - 当前 Selectable ID
   * @param offset - 当前文本偏移
   */
  updateWordDrag(selectableId: string, offset: number): void {
    if (!this._wordDragBaseRange) return;

    const s = this._selectables.get(selectableId);
    if (!s) return;

    if (this._doubleClickTimer) {
      clearTimeout(this._doubleClickTimer);
      this._doubleClickTimer = undefined;
    }

    const boundaries = this._getWordBoundaries(s, offset);
    const current = {
      start: { selectableId, offset: boundaries.start },
      end: { selectableId, offset: boundaries.end },
    };

    const base = this._wordDragBaseRange;
    const merged = this._mergeWordRanges(base, current);
    this._wordDragMoved = true;

    this.setSelection(merged.start, merged.end);
  }

  /**
   * 结束词级拖选，自动复制选区。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js `_handleGlobalMouseRelease` lines 493-506
   */
  async endWordDrag(): Promise<void> {
    this._wordDragMouseDown = false;
    this._stopAutoScroll();

    if (this._wordDragMoved || this._pendingWordCopyOnRelease) {
      if (this._doubleClickTimer) {
        clearTimeout(this._doubleClickTimer);
        this._doubleClickTimer = undefined;
      }
      await this.autoCopySelection();
      this._wordDragBaseRange = null;
      this._wordDragMoved = false;
      this._pendingWordCopyOnRelease = false;
      return;
    }

    if (!this._doubleClickTimer) {
      this._wordDragBaseRange = null;
      this._wordDragMoved = false;
      this._pendingWordCopyOnRelease = false;
    }
  }

  /**
   * 是否处于词级拖选模式。
   */
  isWordDragging(): boolean {
    return this._wordDragBaseRange !== null;
  }

  // ── 自动复制 ──────────────────────────────────────────────────────

  /**
   * 自动将当前选区复制到剪贴板并启动高亮。
   *
   * 逆向: `_controller.autoCopySelection()` 调用模式
   */
  async autoCopySelection(): Promise<void> {
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

  // ── 自动滚动 ──────────────────────────────────────────────────────

  /**
   * 设置自动滚动配置。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js class ro props:
   *   scrollController, getScrollBounds, autoScrollThreshold, autoScrollStep, autoScrollIntervalMs
   *
   * @param config - 自动滚动配置，传 null 禁用自动滚动
   */
  setAutoScrollConfig(config: AutoScrollConfig | null): void {
    this._autoScrollConfig = config;
    if (!config) {
      this._stopAutoScroll();
    }
  }

  /**
   * 根据当前鼠标 Y 坐标更新自动滚动状态。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js `_updateAutoScroll` lines 597-621
   *
   * @param mouseY - 当前鼠标全局 Y 坐标
   */
  updateAutoScroll(mouseY: number): void {
    const cfg = this._autoScrollConfig;
    if (!cfg) {
      this._stopAutoScroll();
      return;
    }

    const bounds = cfg.getScrollBounds();
    if (!bounds) {
      this._stopAutoScroll();
      return;
    }

    let direction = 0;
    if (mouseY <= bounds.top + cfg.threshold) {
      direction = -1;
    } else if (mouseY >= bounds.bottom - cfg.threshold) {
      direction = 1;
    }

    // Same direction and already running: no-op
    if (direction === this._autoScrollDirection && (direction === 0 || this._autoScrollTimer)) {
      return;
    }

    this._stopAutoScroll();
    this._autoScrollDirection = direction;
    if (direction === 0) return;

    this._autoScrollTimer = setInterval(() => {
      const c = this._autoScrollConfig;
      if (!c) {
        this._stopAutoScroll();
        return;
      }
      if (this._autoScrollDirection < 0) {
        c.scrollUp(c.step);
      } else {
        c.scrollDown(c.step);
      }
    }, cfg.intervalMs);
  }

  /**
   * 停止自动滚动。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js `_stopAutoScroll` lines 622-625
   */
  stopAutoScroll(): void {
    this._stopAutoScroll();
  }

  /**
   * 销毁并释放所有资源 (计时器、监听器等)。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js `dispose` lines 626-632
   */
  dispose(): void {
    if (this._doubleClickTimer) {
      clearTimeout(this._doubleClickTimer);
      this._doubleClickTimer = undefined;
    }
    if (this._tripleClickTimer) {
      clearTimeout(this._tripleClickTimer);
      this._tripleClickTimer = undefined;
    }
    this._wordDragBaseRange = null;
    this._wordDragMoved = false;
    this._wordDragMouseDown = false;
    this._pendingWordCopyOnRelease = false;
    this._stopAutoScroll();
    if (this._copyHighlightTimer) {
      clearTimeout(this._copyHighlightTimer);
      this._copyHighlightTimer = null;
    }
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

  /**
   * 获取 Selectable 在指定偏移的词边界。
   * 若 Selectable 自身实现了 `wordBoundary`，则委托给它 (amp 模式)；
   * 否则使用内置的 `getWordBoundariesAt` 算法。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js line 321 `T.wordBoundary(r)`
   *
   * @internal
   */
  private _getWordBoundaries(s: Selectable, offset: number): TextBoundary {
    if (typeof s.wordBoundary === "function") {
      return s.wordBoundary(offset);
    }
    return getWordBoundariesAt(s.getText(), offset);
  }

  /**
   * 获取 Selectable 在指定偏移的行边界。
   * 若 Selectable 自身实现了 `lineBoundary`，则委托给它；
   * 否则使用内置的 `getLineBoundariesAt` 算法。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js line 361 `c = T.lineBoundary(r)`
   *
   * @internal
   */
  private _getLineBoundaries(s: Selectable, offset: number): TextBoundary {
    if (typeof s.lineBoundary === "function") {
      return s.lineBoundary(offset);
    }
    return getLineBoundariesAt(s.getText(), offset);
  }

  /**
   * 合并两个词范围为包含两者的最小范围。
   *
   * 逆向: modules/1472_tui_components/actions_intents.js lines 793-803
   *   (`Xk0(this._wordDragBaseRange, s, ...)`)
   *
   * @internal
   */
  private _mergeWordRanges(
    base: { start: SelectionPosition; end: SelectionPosition },
    current: { start: SelectionPosition; end: SelectionPosition },
  ): { start: SelectionPosition; end: SelectionPosition } {
    const cmpCurrentEndBase = this.comparePositions(current.end, base.start);
    const cmpCurrentStartBase = this.comparePositions(current.start, base.end);

    if (cmpCurrentEndBase <= 0) {
      // current is entirely before base → extend left
      return { start: current.start, end: base.end };
    }
    if (cmpCurrentStartBase >= 0) {
      // current is entirely after base → extend right
      return { start: base.start, end: current.end };
    }
    // overlap → keep base range
    return { start: base.start, end: base.end };
  }

  /**
   * 停止自动滚动 (内部实现)。
   *
   * @internal
   */
  private _stopAutoScroll(): void {
    if (this._autoScrollTimer) {
      clearInterval(this._autoScrollTimer);
      this._autoScrollTimer = undefined;
    }
    this._autoScrollDirection = 0;
  }
}
