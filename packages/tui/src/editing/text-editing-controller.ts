/**
 * 多行文本编辑控制器
 *
 * 提供文本插入/删除、光标移动（水平/垂直/行首行尾/文档首尾）、
 * preferredColumn 垂直移动记忆、选区操作 (extend/selectWord/selectLine)、
 * Emacs 风格 Kill buffer (deleteWord/Line + yank)、词边界移动、
 * listener 通知等核心编辑能力。
 *
 * 忠实还原自逆向工程代码中的 wc 类 (widget-property-system.js:1095-1240+,
 * tui-widget-library.js:1-326)。
 *
 * @module text-editing-controller
 *
 * @example
 * ```ts
 * const ctrl = new TextEditingController();
 * ctrl.insertText("hello world");
 * ctrl.moveCursorToLineStart();
 * ctrl.cursorPosition; // 0
 * ctrl.addListener(() => console.log("changed"));
 * ctrl.moveCursorRight({ extend: true }); // 选区扩展
 * ctrl.deleteToLineEnd(); // Ctrl+K → killBuffer
 * ctrl.yankText();        // Ctrl+Y → 粘贴 killBuffer
 * ```
 */

import { graphemeSegments } from "../text/char-width.js";
import type { LayoutLine, LayoutPosition } from "./text-layout-engine.js";
import { TextLayoutEngine } from "./text-layout-engine.js";

/**
 * 光标移动选项
 *
 * @example
 * ```ts
 * ctrl.moveCursorRight({ extend: true }); // 扩展选区
 * ctrl.moveCursorLeft();                   // 普通移动，取消选区
 * ```
 */
export interface CursorMoveOptions {
  /** 是否扩展选区（而非移动光标） */
  extend?: boolean;
}

/**
 * 词边界字符集 — 空白字符
 *
 * 还原自逆向代码 lx0 变量 (preamble 中声明的 Set)。
 * 空格、制表符、换行等白空间字符作为词边界。
 */
const WHITESPACE_BOUNDARY = new Set([" ", "\t", "\n", "\r", "\v", "\f"]);

/**
 * 词边界字符集 — 标点和特殊字符
 *
 * 还原自逆向代码 Ax0 变量 (preamble 中声明的 Set)。
 * 常见标点符号和 CJK 字符被视为词边界。
 */
const PUNCTUATION_BOUNDARY = new Set([
  ".",
  ",",
  ";",
  ":",
  "!",
  "?",
  "'",
  '"',
  "`",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "<",
  ">",
  "/",
  "\\",
  "|",
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "-",
  "+",
  "=",
  "~",
  "_",
]);

/**
 * TextEditingController 构造选项
 */
export interface TextEditingControllerOptions {
  /** 初始文本内容 */
  text?: string;
  /** 视口宽度（列数），默认 Infinity (不自动换行) */
  width?: number;
}

/**
 * 多行文本编辑控制器
 *
 * 所有位置计算基于 grapheme index（使用 TextLayoutEngine 的 grapheme 列表）。
 * 支持 CJK/Emoji 文本的正确编辑和光标定位。
 *
 * 对齐逆向代码中的 wc 类。
 *
 * @example
 * ```ts
 * const ctrl = new TextEditingController({ text: "hello" });
 * ctrl.insertText(" world");
 * ctrl.text; // "hello world"
 * ctrl.cursorPosition; // 11
 * ```
 */
export class TextEditingController {
  /** 文本内容 */
  private _text: string = "";
  /** 光标位置 (grapheme index) */
  private _cursorPosition: number = 0;
  /** 垂直移动记忆列 (grapheme index in line) */
  private _preferredColumn: number = 0;
  /** 文本布局引擎 */
  private _layoutEngine: TextLayoutEngine;
  /** 变更监听器 */
  private _listeners: Array<() => void> = [];

  // ── 选区字段 (还原自逆向代码 wc._selectionBase/Extent) ──

  /** 选区起始 (grapheme index)，与 _selectionExtent 相同表示无选区 */
  private _selectionBase: number = 0;
  /** 选区终止 (grapheme index) */
  private _selectionExtent: number = 0;

  // ── Kill buffer 字段 (还原自逆向代码 wc._killBuffer) ──

  /** Kill ring 缓冲区（单级） */
  private _killBuffer: string = "";
  /** 连续 kill 追加标记 */
  private _lastKillWasContiguous: boolean = false;
  /** 是否已销毁 */
  private _disposed: boolean = false;

  /**
   * 创建文本编辑控制器
   *
   * @param options - 构造选项
   */
  constructor(options?: TextEditingControllerOptions) {
    const text = options?.text ?? "";
    const width = options?.width ?? Infinity;
    this._text = text;
    this._layoutEngine = new TextLayoutEngine();
    this._layoutEngine.updateText(text);
    this._layoutEngine.updateWidth(width);
    this._cursorPosition = this._layoutEngine.graphemes.length;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._collapseSelection();
  }

  // ════════════════════════════════════════════════════
  //  Getters
  // ════════════════════════════════════════════════════

  /**
   * 获取当前文本
   *
   * @returns 文本内容
   */
  get text(): string {
    return this._text;
  }

  /**
   * 设置文本内容（光标移到末尾）
   *
   * @param value - 新文本
   */
  set text(value: string) {
    if (this._text !== value) {
      this._text = value;
      this._layoutEngine.updateText(value);
      this._cursorPosition = this._layoutEngine.graphemes.length;
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
      this._notifyListeners();
    }
  }

  /**
   * 获取光标位置 (grapheme index)
   *
   * @returns 光标位置
   */
  get cursorPosition(): number {
    return this._cursorPosition;
  }

  /**
   * 设置光标位置
   *
   * @param value - 新光标位置
   */
  set cursorPosition(value: number) {
    this._setCursorPosition(value);
  }

  /**
   * 获取 grapheme 列表
   *
   * @returns grapheme 数组
   */
  get graphemes(): string[] {
    return this._layoutEngine.graphemes;
  }

  /**
   * 获取布局行数
   *
   * @returns 行数
   */
  get lineCount(): number {
    return this._layoutEngine.getLineCount();
  }

  /**
   * 获取光标所在行号
   *
   * @returns 0-based 行号
   */
  get cursorLine(): number {
    return this._layoutEngine.offsetToPosition(this._cursorPosition).line;
  }

  /**
   * 获取光标所在列号 (grapheme column)
   *
   * @returns 0-based 列号
   */
  get cursorColumn(): number {
    return this._layoutEngine.offsetToPosition(this._cursorPosition).col;
  }

  /**
   * 是否存在活跃选区
   *
   * 还原自逆向代码 wc.hasSelection (widget-property-system.js:1140-1142)。
   *
   * @returns 有选区返回 true
   */
  get hasSelection(): boolean {
    return this._selectionBase !== this._selectionExtent;
  }

  /**
   * 获取选区范围 (按 start < end 排序)
   *
   * 还原自逆向代码 wc.selectionRange (widget-property-system.js:1143-1149)。
   *
   * @returns 选区范围，无选区返回 null
   */
  get selectionRange(): { start: number; end: number } | null {
    if (!this.hasSelection) return null;
    return {
      start: Math.min(this._selectionBase, this._selectionExtent),
      end: Math.max(this._selectionBase, this._selectionExtent),
    };
  }

  /**
   * 获取 Kill buffer 内容
   *
   * @returns killBuffer 字符串
   */
  get killBuffer(): string {
    return this._killBuffer;
  }

  // ════════════════════════════════════════════════════
  //  文本操作
  // ════════════════════════════════════════════════════

  /**
   * 在光标处插入文本
   *
   * 还原自逆向代码 wc.insertText (widget-property-system.js:1233-1239)。
   *
   * @param text - 要插入的文本
   */
  insertText(text: string): void {
    this._lastKillWasContiguous = false;
    // 有选区时先删除选区 (还原自逆向代码 wc.insertText:1235)
    if (this.hasSelection) this.deleteSelectedText();
    const strPos = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
    this._text = this._text.slice(0, strPos) + text + this._text.slice(strPos);
    this._layoutEngine.updateText(this._text);
    const insertedGraphemes = graphemeSegments(text);
    this._cursorPosition += insertedGraphemes.length;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._collapseSelection();
    this._notifyListeners();
  }

  /**
   * 向前删除指定数量的 grapheme (Backspace)
   *
   * 还原自逆向代码 wc.deleteText (tui-widget-library.js:67-75)。
   *
   * @param count - 删除数量，默认 1
   */
  deleteText(count: number = 1): void {
    this._lastKillWasContiguous = false;
    if (count <= 0) return;
    const newPos = Math.max(0, this._cursorPosition - count);
    if (this._cursorPosition - newPos > 0) {
      const startStr = this._getStringPositionFromGraphemeIndex(newPos);
      const endStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
      this._layoutEngine.updateText(this._text);
      this._cursorPosition = newPos;
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
      this._collapseSelection();
      this._notifyListeners();
    }
  }

  /**
   * 向后删除指定数量的 grapheme (Delete 键)
   *
   * 还原自逆向代码 wc.deleteForward (tui-widget-library.js:76-85)。
   *
   * @param count - 删除数量，默认 1
   */
  deleteForward(count: number = 1): void {
    this._lastKillWasContiguous = false;
    if (count <= 0) return;
    const gs = this.graphemes;
    const actualCount = Math.min(count, gs.length - this._cursorPosition);
    if (actualCount > 0) {
      const startStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      const endStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition + actualCount);
      this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
      this._layoutEngine.updateText(this._text);
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
      this._collapseSelection();
      this._notifyListeners();
    }
  }

  // ════════════════════════════════════════════════════
  //  光标移动
  // ════════════════════════════════════════════════════

  /**
   * 光标向左移动
   *
   * @param optionsOrCount - 移动选项或步数 (向后兼容)
   */
  moveCursorLeft(optionsOrCount?: number | CursorMoveOptions): void {
    const { count, extend } = this._parseMoveArgs(optionsOrCount, 1);
    this._lastKillWasContiguous = false;
    this._setCursorPosition(this._getHorizontalPosition(-count), extend);
  }

  /**
   * 光标向右移动
   *
   * @param optionsOrCount - 移动选项或步数 (向后兼容)
   */
  moveCursorRight(optionsOrCount?: number | CursorMoveOptions): void {
    const { count, extend } = this._parseMoveArgs(optionsOrCount, 1);
    this._lastKillWasContiguous = false;
    this._setCursorPosition(this._getHorizontalPosition(count), extend);
  }

  /**
   * 光标向上移动
   *
   * 使用 preferredColumn 保持列位置记忆。
   * 还原自逆向代码 wc.moveCursorUp / moveCursorVertically / _getVerticalPosition。
   *
   * @param optionsOrCount - 移动选项或步数
   */
  moveCursorUp(optionsOrCount?: number | CursorMoveOptions): void {
    const { count, extend } = this._parseMoveArgs(optionsOrCount, 1);
    this._lastKillWasContiguous = false;
    this._moveCursorVertically(-Math.abs(count), extend);
  }

  /**
   * 光标向下移动
   *
   * @param optionsOrCount - 移动选项或步数
   */
  moveCursorDown(optionsOrCount?: number | CursorMoveOptions): void {
    const { count, extend } = this._parseMoveArgs(optionsOrCount, 1);
    this._lastKillWasContiguous = false;
    this._moveCursorVertically(Math.abs(count), extend);
  }

  /**
   * 光标跳到当前行首
   *
   * 还原自逆向代码 wc._getLineStartPosition (tui-widget-library.js:299-310)。
   *
   * @param options - 移动选项
   */
  moveCursorToLineStart(options?: CursorMoveOptions): void {
    this._lastKillWasContiguous = false;
    const gs = this.graphemes;
    let lineStart = 0;
    for (let i = this._cursorPosition - 1; i >= 0; i--) {
      if (gs[i] === "\n") {
        lineStart = i + 1;
        break;
      }
    }
    this._setCursorPosition(lineStart, options?.extend ?? false);
  }

  /**
   * 光标跳到当前行尾
   *
   * 还原自逆向代码 wc._getLineEndPosition (tui-widget-library.js:311-321)。
   *
   * @param options - 移动选项
   */
  moveCursorToLineEnd(options?: CursorMoveOptions): void {
    this._lastKillWasContiguous = false;
    const gs = this.graphemes;
    let lineEnd = gs.length;
    for (let i = this._cursorPosition; i < gs.length; i++) {
      if (gs[i] === "\n") {
        lineEnd = i;
        break;
      }
    }
    this._setCursorPosition(lineEnd, options?.extend ?? false);
  }

  /**
   * 光标跳到文档首位
   *
   * @param options - 移动选项
   */
  moveCursorToStart(options?: CursorMoveOptions): void {
    this._lastKillWasContiguous = false;
    this._setCursorPosition(0, options?.extend ?? false);
  }

  /**
   * 光标跳到文档末尾
   *
   * @param options - 移动选项
   */
  moveCursorToEnd(options?: CursorMoveOptions): void {
    this._lastKillWasContiguous = false;
    this._setCursorPosition(this.graphemes.length, options?.extend ?? false);
  }

  // ════════════════════════════════════════════════════
  //  选区操作
  // ════════════════════════════════════════════════════

  /**
   * 删除选区文本
   *
   * 还原自逆向代码 wc.deleteSelectedText (tui-widget-library.js:60-66)。
   */
  deleteSelectedText(): void {
    const range = this.selectionRange;
    if (!range) return;
    const startStr = this._getStringPositionFromGraphemeIndex(range.start);
    const endStr = this._getStringPositionFromGraphemeIndex(range.end);
    this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
    this._layoutEngine.updateText(this._text);
    this._cursorPosition = range.start;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._collapseSelection();
    this._notifyListeners();
  }

  /**
   * 有选区时删除选区，无选区时向前删除指定数量字符
   *
   * 还原自逆向代码 wc.deleteSelectedOrText (tui-widget-library.js:56-59)。
   *
   * @param count - 无选区时删除数量，默认 1
   */
  deleteSelectedOrText(count: number = 1): void {
    if (this.hasSelection) {
      this.deleteSelectedText();
    } else {
      this.deleteText(count);
    }
  }

  /**
   * 选中指定 offset 所在的单词
   *
   * 还原自逆向代码 wc.selectWordAt (tui-widget-library.js:221-232)。
   *
   * @param offset - grapheme 偏移
   */
  selectWordAt(offset: number): void {
    if (this.graphemes.length === 0) return;
    const { start, end } = this._getWordBoundariesAt(offset);
    if (start === end) {
      // offset 在词边界字符上，不选中
      this._cursorPosition = start;
      this._collapseSelection();
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
      this._notifyListeners();
      return;
    }
    this._selectionBase = start;
    this._selectionExtent = end;
    this._cursorPosition = end;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._notifyListeners();
  }

  /**
   * 选中指定 offset 所在的整行
   *
   * 还原自逆向代码 wc.selectLineAt (tui-widget-library.js:247-261)。
   *
   * @param offset - grapheme 偏移
   */
  selectLineAt(offset: number): void {
    const gs = this.graphemes;
    if (gs.length === 0) return;
    const clamped = Math.max(0, Math.min(offset, gs.length));

    // 找行首
    let lineStart = clamped;
    while (lineStart > 0 && gs[lineStart - 1] !== "\n") lineStart--;

    // 找行尾
    let lineEnd = clamped;
    while (lineEnd < gs.length && gs[lineEnd] !== "\n") lineEnd++;

    // 如果行尾有 \n, 包含它
    if (lineEnd < gs.length && gs[lineEnd] === "\n") lineEnd++;

    this._selectionBase = lineStart;
    this._selectionExtent = lineEnd;
    this._cursorPosition = lineEnd;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._notifyListeners();
  }

  /**
   * 设置选区范围
   *
   * 还原自逆向代码 wc.setSelectionRange (tui-widget-library.js:240-246)。
   * start/end clamp 到 [0, graphemeCount]。
   *
   * @param start - 选区起始 (grapheme index)
   * @param end - 选区终止 (grapheme index)
   */
  setSelectionRange(start: number, end: number): void {
    const max = this._layoutEngine.graphemes.length;
    const clampedStart = Math.max(0, Math.min(start, max));
    const clampedEnd = Math.max(0, Math.min(end, max));
    this._selectionBase = clampedStart;
    this._selectionExtent = clampedEnd;
    this._cursorPosition = clampedEnd;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._notifyListeners();
  }

  /**
   * 清除选区
   *
   * 还原自逆向代码 wc.clearSelection (widget-property-system.js:1159-1161)。
   */
  clearSelection(): void {
    this._collapseSelection();
    this._notifyListeners();
  }

  // ════════════════════════════════════════════════════
  //  Kill buffer 操作
  // ════════════════════════════════════════════════════

  /**
   * 删除光标左侧到词边界的文本，存入 killBuffer
   *
   * 还原自逆向代码 wc.deleteWordLeft (widget-property-system.js:1241-1247)。
   */
  deleteWordLeft(): void {
    const target = this._findWordBoundary("left");
    const count = Math.max(0, this._cursorPosition - target);
    if (count > 0) {
      const startStr = this._getStringPositionFromGraphemeIndex(target);
      const endStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      const deleted = this._text.slice(startStr, endStr);
      if (this._lastKillWasContiguous) {
        this._killBuffer = deleted + this._killBuffer;
      } else {
        this._killBuffer = deleted;
      }
      this._lastKillWasContiguous = true;
    }
    this.deleteText(count);
    // deleteText 会重置 _lastKillWasContiguous, 需要恢复
    if (count > 0) this._lastKillWasContiguous = true;
  }

  /**
   * 删除光标右侧到词边界的文本，存入 killBuffer
   *
   * 还原自逆向代码 wc.deleteWordRight (tui-widget-library.js:11-20)。
   */
  deleteWordRight(): void {
    const target = this._findWordBoundary("right");
    const count = Math.max(0, target - this._cursorPosition);
    if (count > 0) {
      const startStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      const endStr = this._getStringPositionFromGraphemeIndex(target);
      const deleted = this._text.slice(startStr, endStr);
      if (this._lastKillWasContiguous) {
        this._killBuffer = this._killBuffer + deleted;
      } else {
        this._killBuffer = deleted;
      }
      this._lastKillWasContiguous = true;
    }
    this.deleteForward(count);
    // deleteForward 会重置 _lastKillWasContiguous, 需要恢复
    if (count > 0) this._lastKillWasContiguous = true;
  }

  /**
   * 删除光标到行尾的文本 (Ctrl+K)，存入 killBuffer
   *
   * 还原自逆向代码 wc.deleteToLineEnd (tui-widget-library.js:132-146)。
   */
  deleteToLineEnd(): void {
    const pos = this._cursorPosition;
    const gs = this.graphemes;
    let lineEnd = gs.length;
    for (let i = pos; i < gs.length; i++) {
      if (gs[i] === "\n") {
        lineEnd = i;
        break;
      }
    }
    if (lineEnd <= pos) return; // 行尾无内容可删

    const startStr = this._getStringPositionFromGraphemeIndex(pos);
    const endStr = this._getStringPositionFromGraphemeIndex(lineEnd);
    const deleted = this._text.slice(startStr, endStr);
    if (this._lastKillWasContiguous) {
      this._killBuffer = this._killBuffer + deleted;
    } else {
      this._killBuffer = deleted;
    }
    this._lastKillWasContiguous = true;

    this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
    this._layoutEngine.updateText(this._text);
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._notifyListeners();
  }

  /**
   * 删除行首到光标的文本 (Ctrl+U)，存入 killBuffer
   *
   * 还原自逆向代码 wc.deleteToLineStart (tui-widget-library.js:147-174)。
   */
  deleteToLineStart(): void {
    const pos = this._cursorPosition;
    if (pos === 0) return;

    const gs = this.graphemes;
    // 找行首
    let lineStart = 0;
    for (let i = pos - 1; i >= 0; i--) {
      if (gs[i] === "\n") {
        lineStart = i + 1;
        break;
      }
    }

    if (lineStart >= pos) return; // 已在行首

    const startStr = this._getStringPositionFromGraphemeIndex(lineStart);
    const endStr = this._getStringPositionFromGraphemeIndex(pos);
    const deleted = this._text.slice(startStr, endStr);
    if (this._lastKillWasContiguous) {
      this._killBuffer = deleted + this._killBuffer;
    } else {
      this._killBuffer = deleted;
    }
    this._lastKillWasContiguous = true;

    this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
    this._layoutEngine.updateText(this._text);
    this._cursorPosition = lineStart;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._collapseSelection();
    this._notifyListeners();
  }

  /**
   * 删除整行 (Ctrl+Shift+K)，存入 killBuffer
   *
   * 还原自逆向代码 wc.deleteCurrentLine (tui-widget-library.js:118-131)。
   */
  deleteCurrentLine(): void {
    if (this._text.length === 0) return;
    this._collapseSelection();

    const gs = this.graphemes;
    const pos = this._layoutEngine.offsetToPosition(this._cursorPosition);
    const currentLine = pos.line;
    const col = pos.col;

    // 找行首
    let lineStart = 0;
    for (let i = this._cursorPosition - 1; i >= 0; i--) {
      if (gs[i] === "\n") {
        lineStart = i + 1;
        break;
      }
    }

    // 找行尾 (含换行符)
    const lineCount = this._layoutEngine.getLineCount();
    const isLastLine = currentLine === lineCount - 1;
    let lineEnd: number;
    if (isLastLine) {
      lineEnd = gs.length;
    } else {
      lineEnd = lineStart;
      while (lineEnd < gs.length && gs[lineEnd] !== "\n") lineEnd++;
      if (lineEnd < gs.length) lineEnd++; // 包含 \n
    }

    // 如果是最后一行且前面有 \n，把前面的 \n 也删掉
    let deleteStart = lineStart;
    if (isLastLine && deleteStart > 0) {
      deleteStart--; // 包含前面的 \n
    }

    const startStr = this._getStringPositionFromGraphemeIndex(deleteStart);
    const endStr = this._getStringPositionFromGraphemeIndex(lineEnd);
    this._killBuffer = this._text.slice(startStr, endStr);
    this._lastKillWasContiguous = true;

    this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
    this._layoutEngine.updateText(this._text);

    // 重新定位光标
    const newLineCount = this._layoutEngine.getLineCount();
    const targetLine = Math.min(isLastLine ? currentLine - 1 : currentLine, newLineCount - 1);
    const safeTargetLine = Math.max(0, targetLine);
    const targetLineText = this._layoutEngine.getLine(safeTargetLine);
    const targetGraphemes = graphemeSegments(targetLineText);
    const targetCol = Math.min(col, targetGraphemes.length);
    this._cursorPosition = this._layoutEngine.positionToOffset({
      line: safeTargetLine,
      col: targetCol,
    });
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
    this._notifyListeners();
  }

  /**
   * 在光标处插入 killBuffer 内容 (Ctrl+Y)
   *
   * 还原自逆向代码 wc.yankText (tui-widget-library.js:21-23)。
   */
  yankText(): void {
    if (this._killBuffer) this.insertText(this._killBuffer);
  }

  // ════════════════════════════════════════════════════
  //  词边界移动
  // ════════════════════════════════════════════════════

  /**
   * 光标跳到词边界位置
   *
   * 还原自逆向代码 wc.moveCursorWordBoundary (tui-widget-library.js:92-94)。
   *
   * @param direction - 移动方向: 'left' 或 'right'
   * @param options - 移动选项
   */
  moveCursorWordBoundary(direction: "left" | "right", options?: CursorMoveOptions): void {
    this._lastKillWasContiguous = false;
    const target = this._findWordBoundary(direction);
    this._setCursorPosition(target, options?.extend ?? false);
  }

  // ════════════════════════════════════════════════════
  //  布局相关
  // ════════════════════════════════════════════════════

  /**
   * 更新视口宽度
   *
   * @param width - 新的视口宽度（列数）
   */
  updateWidth(width: number): void {
    this._layoutEngine.updateWidth(width);
  }

  /**
   * 获取当前光标的行列位置
   *
   * @returns LayoutPosition
   */
  getLayoutPosition(): LayoutPosition {
    return this._layoutEngine.offsetToPosition(this._cursorPosition);
  }

  /**
   * 获取布局行列表（委托给布局引擎）
   *
   * 逆向: wc._layoutEngine._lines 的公有委托，供 RenderTextField 使用
   *
   * @returns LayoutLine 数组（含 startOffset/endOffset/width/isHardBreak）
   */
  getLayoutLines(): LayoutLine[] {
    return this._layoutEngine.getLayoutLines();
  }

  /**
   * 计算 grapheme offset 在行内的显示列位置（用于屏幕绘制定位）。
   *
   * 注意: 此方法返回 display-width 列（CJK=2），而非 grapheme 计数。
   * 与 amp 的 wc._getLayoutColumnFromOffset 语义不同——amp 返回 grapheme 计数，
   * 此方法返回显示宽度，供 RenderTextField 的光标和水平滚动定位使用。
   *
   * @param offset - grapheme 偏移
   * @returns 从行首到 offset 的显示列宽度（CJK 字符宽度=2，ASCII=1）
   */
  getLayoutColumnFromOffset(offset: number): number {
    return this._layoutEngine.getLayoutColumnFromOffset(offset);
  }

  // ════════════════════════════════════════════════════
  //  监听器
  // ════════════════════════════════════════════════════

  /**
   * 添加变更监听器
   *
   * @param fn - 回调函数
   */
  addListener(fn: () => void): void {
    this._listeners.push(fn);
  }

  /**
   * 移除变更监听器
   *
   * @param fn - 回调函数
   */
  removeListener(fn: () => void): void {
    const idx = this._listeners.indexOf(fn);
    if (idx >= 0) {
      this._listeners.splice(idx, 1);
    }
  }

  /**
   * 释放资源，清理所有 listeners
   */
  dispose(): void {
    this._listeners.length = 0;
    this._disposed = true;
  }

  // ════════════════════════════════════════════════════
  //  内部方法
  // ════════════════════════════════════════════════════

  /**
   * 通知所有监听器
   */
  private _notifyListeners(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }

  /**
   * 设置光标位置，clamp 到 [0, graphemeCount]，处理选区扩展
   *
   * 还原自逆向代码 wc._setCursorPosition (widget-property-system.js:1127-1136)。
   *
   * @param position - 新光标位置
   * @param extend - 是否扩展选区
   */
  private _setCursorPosition(position: number, extend: boolean = false): void {
    const clamped = Math.max(0, Math.min(position, this._layoutEngine.graphemes.length));
    if (this._cursorPosition !== clamped) {
      if (extend && !this.hasSelection) {
        this._selectionBase = this._cursorPosition;
      }
      this._cursorPosition = clamped;
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
      if (extend) {
        this._selectionExtent = clamped;
      } else {
        this._collapseSelection();
      }
      this._notifyListeners();
    }
  }

  /**
   * 计算水平移动后的目标位置
   *
   * 还原自逆向代码 wc._getHorizontalPosition (tui-widget-library.js:322-325)。
   *
   * @param delta - 移动量（正=右, 负=左）
   * @returns 目标 grapheme 偏移
   */
  private _getHorizontalPosition(delta: number): number {
    return Math.max(0, Math.min(this.graphemes.length, this._cursorPosition + delta));
  }

  /**
   * 执行垂直移动（上/下）
   *
   * 还原自逆向代码 wc._getVerticalPosition (tui-widget-library.js:283-298)。
   *
   * @param delta - 行偏移量（正=下, 负=上）
   * @param extend - 是否扩展选区
   */
  private _moveCursorVertically(delta: number, extend: boolean = false): void {
    const target = this._getVerticalPosition(delta);
    if (target >= 0) {
      if (extend && !this.hasSelection) {
        this._selectionBase = this._cursorPosition;
      }
      // 垂直移动保持 preferredColumn, 不重置
      const clamped = Math.max(0, Math.min(target, this._layoutEngine.graphemes.length));
      if (this._cursorPosition !== clamped) {
        this._cursorPosition = clamped;
        // 注意: 垂直移动不更新 _preferredColumn
        if (extend) {
          this._selectionExtent = clamped;
        } else {
          this._collapseSelection();
        }
        this._notifyListeners();
      }
    }
  }

  /**
   * 计算垂直移动后的目标 grapheme 偏移
   *
   * 还原自逆向代码 wc._getVerticalPosition (tui-widget-library.js:283-298)。
   * 使用 _preferredColumn 实现跨越短行时的列位置记忆。
   *
   * @param delta - 行偏移量
   * @returns 目标偏移, 或 -1 表示无法移动
   */
  private _getVerticalPosition(delta: number): number {
    const pos = this._layoutEngine.offsetToPosition(this._cursorPosition);
    const currentLine = pos.line;
    const lineCount = this._layoutEngine.getLineCount();

    const targetLine =
      delta < 0 ? Math.max(0, currentLine + delta) : Math.min(lineCount - 1, currentLine + delta);

    if (targetLine === currentLine) return -1;

    // 获取目标行的文本
    const targetLineText = this._layoutEngine.getLine(targetLine);
    const targetGraphemes = graphemeSegments(targetLineText);
    const targetCol = Math.min(this._preferredColumn, targetGraphemes.length);

    return this._layoutEngine.positionToOffset({ line: targetLine, col: targetCol });
  }

  /**
   * 计算 grapheme offset 在其所在行中的布局列宽度
   *
   * 布局列 = 该 grapheme 在行中的 grapheme index
   * (对齐逆向代码 wc._getLayoutColumnFromOffset)
   *
   * @param offset - grapheme 偏移
   * @returns grapheme 列偏移
   */
  private _getLayoutColumnFromOffset(offset: number): number {
    const pos = this._layoutEngine.offsetToPosition(offset);
    return pos.col;
  }

  /**
   * 将 grapheme index 转为字符串字节位置
   *
   * 还原自逆向代码 wc._getStringPositionFromGraphemeIndex
   * (widget-property-system.js:1190-1206)。
   *
   * @param graphemeIndex - grapheme 偏移
   * @returns 字符串字节偏移
   */
  private _getStringPositionFromGraphemeIndex(graphemeIndex: number): number {
    if (graphemeIndex <= 0) return 0;
    const gs = graphemeSegments(this._text);
    if (graphemeIndex < gs.length) {
      let pos = 0;
      for (let i = 0; i < graphemeIndex; i++) {
        pos += gs[i]!.length;
      }
      return pos;
    }
    return this._text.length;
  }

  /**
   * 折叠选区到当前光标位置
   *
   * 还原自逆向代码 wc._collapseSelection (tui-widget-library.js:218-219)。
   */
  private _collapseSelection(): void {
    this._selectionBase = this._cursorPosition;
    this._selectionExtent = this._cursorPosition;
  }

  /**
   * 解析移动方法参数 (向后兼容: 支持数字或选项对象)
   *
   * @param arg - 数字步数或选项对象
   * @param defaultCount - 默认步数
   * @returns { count, extend }
   */
  private _parseMoveArgs(
    arg: number | CursorMoveOptions | undefined,
    defaultCount: number,
  ): { count: number; extend: boolean } {
    if (arg === undefined) {
      return { count: defaultCount, extend: false };
    }
    if (typeof arg === "number") {
      return { count: arg, extend: false };
    }
    return { count: defaultCount, extend: arg.extend ?? false };
  }

  /**
   * 判断字符是否为词边界
   *
   * 还原自逆向代码 wc._isWordBoundary (tui-widget-library.js:24)。
   * 使用 WHITESPACE_BOUNDARY + PUNCTUATION_BOUNDARY 集合，
   * CJK 字符 (U+4E00-U+9FFF, U+3400-U+4DBF) 也视为边界。
   *
   * @param ch - 要检查的 grapheme
   * @returns 是否为词边界
   */
  private _isWordBoundary(ch: string): boolean {
    if (WHITESPACE_BOUNDARY.has(ch) || PUNCTUATION_BOUNDARY.has(ch)) return true;
    // CJK 统一汉字范围
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) return true;
    return false;
  }

  /**
   * 获取 offset 所在单词的边界
   *
   * 还原自逆向代码 wc._getWordBoundariesAt (tui-widget-library.js:25-39)。
   *
   * @param offset - grapheme 偏移
   * @returns { start, end } 词边界
   */
  private _getWordBoundariesAt(offset: number): { start: number; end: number } {
    const gs = this.graphemes;
    const clamped = Math.max(0, Math.min(offset, gs.length));
    // 如果在词边界字符上，返回空范围
    if (clamped < gs.length && this._isWordBoundary(gs[clamped]!)) {
      return { start: clamped, end: clamped };
    }
    // 向左扩展到词边界
    let start = clamped;
    while (start > 0 && !this._isWordBoundary(gs[start - 1]!)) start--;
    // 向右扩展到词边界
    let end = clamped;
    while (end < gs.length && !this._isWordBoundary(gs[end]!)) end++;
    return { start, end };
  }

  /**
   * 查找词边界位置
   *
   * 还原自逆向代码 wc._getWordBoundary (tui-widget-library.js:41-55)。
   *
   * @param direction - 方向: 'left' 或 'right'
   * @returns 目标 grapheme 偏移
   */
  private _findWordBoundary(direction: "left" | "right"): number {
    const pos = this._cursorPosition;
    const gs = this.graphemes;
    let e = pos;
    if (direction === "right") {
      // 跳过边界字符
      while (e < gs.length && this._isWordBoundary(gs[e]!)) e++;
      // 跳过非边界字符
      while (e < gs.length && !this._isWordBoundary(gs[e]!)) e++;
      return Math.min(gs.length, e);
    } else {
      e--;
      // 跳过边界字符
      while (e >= 0 && this._isWordBoundary(gs[e]!)) e--;
      // 跳过非边界字符
      while (e >= 0 && !this._isWordBoundary(gs[e]!)) e--;
      return Math.max(0, e + 1);
    }
  }
}
