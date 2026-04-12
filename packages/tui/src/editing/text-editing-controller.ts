/**
 * 多行文本编辑控制器
 *
 * 提供文本插入/删除、光标移动（水平/垂直/行首行尾/文档首尾）、
 * preferredColumn 垂直移动记忆、listener 通知等核心编辑能力。
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
 * ```
 */

import { TextLayoutEngine } from "./text-layout-engine.js";
import type { LayoutPosition } from "./text-layout-engine.js";
import { charWidth, graphemeSegments } from "../text/char-width.js";

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
  /** 垂直滚动偏移 */
  private _vScrollOffset: number = 0;
  /** 文本布局引擎 */
  private _layoutEngine: TextLayoutEngine;
  /** 变更监听器 */
  private _listeners: Array<() => void> = [];
  /** 是否已释放 */
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
    const strPos = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
    this._text = this._text.slice(0, strPos) + text + this._text.slice(strPos);
    this._layoutEngine.updateText(this._text);
    const insertedGraphemes = graphemeSegments(text);
    this._cursorPosition += insertedGraphemes.length;
    this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
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
    if (count <= 0) return;
    const newPos = Math.max(0, this._cursorPosition - count);
    if (this._cursorPosition - newPos > 0) {
      const startStr = this._getStringPositionFromGraphemeIndex(newPos);
      const endStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
      this._layoutEngine.updateText(this._text);
      this._cursorPosition = newPos;
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
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
    if (count <= 0) return;
    const gs = this.graphemes;
    const actualCount = Math.min(count, gs.length - this._cursorPosition);
    if (actualCount > 0) {
      const startStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition);
      const endStr = this._getStringPositionFromGraphemeIndex(this._cursorPosition + actualCount);
      this._text = this._text.slice(0, startStr) + this._text.slice(endStr);
      this._layoutEngine.updateText(this._text);
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
      this._notifyListeners();
    }
  }

  // ════════════════════════════════════════════════════
  //  光标移动
  // ════════════════════════════════════════════════════

  /**
   * 光标向左移动
   *
   * @param count - 移动步数，默认 1
   */
  moveCursorLeft(count: number = 1): void {
    this._setCursorPosition(this._getHorizontalPosition(-count));
  }

  /**
   * 光标向右移动
   *
   * @param count - 移动步数，默认 1
   */
  moveCursorRight(count: number = 1): void {
    this._setCursorPosition(this._getHorizontalPosition(count));
  }

  /**
   * 光标向上移动
   *
   * 使用 preferredColumn 保持列位置记忆。
   * 还原自逆向代码 wc.moveCursorUp / moveCursorVertically / _getVerticalPosition。
   *
   * @param count - 移动行数，默认 1
   */
  moveCursorUp(count: number = 1): void {
    this._moveCursorVertically(-Math.abs(count));
  }

  /**
   * 光标向下移动
   *
   * @param count - 移动行数，默认 1
   */
  moveCursorDown(count: number = 1): void {
    this._moveCursorVertically(Math.abs(count));
  }

  /**
   * 光标跳到当前行首
   *
   * 还原自逆向代码 wc._getLineStartPosition (tui-widget-library.js:299-310)。
   */
  moveCursorToLineStart(): void {
    const gs = this.graphemes;
    let lineStart = 0;
    for (let i = this._cursorPosition - 1; i >= 0; i--) {
      if (gs[i] === "\n") {
        lineStart = i + 1;
        break;
      }
    }
    this._setCursorPosition(lineStart);
  }

  /**
   * 光标跳到当前行尾
   *
   * 还原自逆向代码 wc._getLineEndPosition (tui-widget-library.js:311-321)。
   */
  moveCursorToLineEnd(): void {
    const gs = this.graphemes;
    let lineEnd = gs.length;
    for (let i = this._cursorPosition; i < gs.length; i++) {
      if (gs[i] === "\n") {
        lineEnd = i;
        break;
      }
    }
    this._setCursorPosition(lineEnd);
  }

  /**
   * 光标跳到文档首位
   */
  moveCursorToStart(): void {
    this._setCursorPosition(0);
  }

  /**
   * 光标跳到文档末尾
   */
  moveCursorToEnd(): void {
    this._setCursorPosition(this.graphemes.length);
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
   * 设置光标位置，clamp 到 [0, graphemeCount]，更新 preferredColumn
   *
   * 还原自逆向代码 wc._setCursorPosition (widget-property-system.js:1127-1136)。
   * 简化版: 不含选区逻辑。
   *
   * @param position - 新光标位置
   */
  private _setCursorPosition(position: number): void {
    const clamped = Math.max(0, Math.min(position, this._layoutEngine.graphemes.length));
    if (this._cursorPosition !== clamped) {
      this._cursorPosition = clamped;
      this._preferredColumn = this._getLayoutColumnFromOffset(this._cursorPosition);
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
   */
  private _moveCursorVertically(delta: number): void {
    const target = this._getVerticalPosition(delta);
    if (target >= 0) {
      // 垂直移动保持 preferredColumn, 不重置
      const clamped = Math.max(0, Math.min(target, this._layoutEngine.graphemes.length));
      if (this._cursorPosition !== clamped) {
        this._cursorPosition = clamped;
        // 注意: 垂直移动不更新 _preferredColumn
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

    const targetLine = delta < 0
      ? Math.max(0, currentLine + delta)
      : Math.min(lineCount - 1, currentLine + delta);

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
}
