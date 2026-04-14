/**
 * 终端屏幕单元格。
 *
 * 每个 Cell 代表屏幕缓冲区中的一个字符位置，包含：
 * - `char` — 显示字符
 * - `style` — 文本样式
 * - `width` — 显示宽度（1=普通字符, 2=CJK/Emoji 宽字符, 0=续位占位符）
 *
 * 宽字符（如中文、Emoji）占据 2 列，第一列的 Cell 的 width 为 2，
 * 第二列为 width=0 的续位 Cell（char 为空字符串）。
 *
 * @example
 * ```ts
 * // 普通 ASCII 字符
 * const a = new Cell("A", TextStyle.NORMAL);
 *
 * // CJK 宽字符（占 2 列）
 * const wide = new Cell("中", style, 2);
 * const cont = new Cell("", style, 0); // 续位占位符
 * ```
 *
 * @module
 */

import { TextStyle } from "./text-style.js";

/**
 * 终端屏幕缓冲区的最小单元。
 *
 * 不可变设计——所有属性均为只读。
 */
export class Cell {
  /** 显示字符，续位占位符为空字符串 */
  readonly char: string;
  /** 文本样式 */
  readonly style: TextStyle;
  /** 显示宽度：1=普通, 2=宽字符, 0=续位占位符 */
  readonly width: number;

  /**
   * 共享的空白单元格实例。
   *
   * 等价于 `new Cell(" ", TextStyle.NORMAL, 1)`。
   *
   * @example
   * ```ts
   * Cell.EMPTY.char;  // " "
   * Cell.EMPTY.width; // 1
   * Cell.EMPTY.style === TextStyle.NORMAL; // true
   * ```
   */
  static readonly EMPTY: Cell = new Cell(" ", TextStyle.NORMAL, 1);

  /**
   * 创建单元格实例。
   *
   * @param char - 显示字符
   * @param style - 文本样式
   * @param width - 显示宽度，默认为 1
   *
   * @example
   * ```ts
   * const cell = new Cell("A", new TextStyle({ bold: true }));
   * ```
   */
  constructor(char: string, style: TextStyle, width: number = 1) {
    this.char = char;
    this.style = style;
    this.width = width;
  }

  /**
   * 值相等比较。
   *
   * 比较 char、style 和 width 三个字段。
   *
   * @example
   * ```ts
   * const a = new Cell("X", TextStyle.NORMAL, 1);
   * const b = new Cell("X", TextStyle.NORMAL, 1);
   * a.equals(b); // true
   * ```
   */
  equals(other: Cell): boolean {
    return this.char === other.char && this.width === other.width && this.style.equals(other.style);
  }
}
