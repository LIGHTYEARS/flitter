/**
 * 屏幕缓冲区。
 *
 * `ScreenBuffer` 是一个二维 {@link Cell} 矩阵，代表终端屏幕的单层缓冲区。
 * 提供单元格的读写、宽字符写入、矩形填充、调整尺寸和跨缓冲区拷贝等操作。
 *
 * @example
 * ```ts
 * const buf = new ScreenBuffer(80, 24);
 * buf.writeChar(0, 0, "A", new TextStyle({ bold: true }));
 * buf.writeChar(5, 0, "中", style, 2); // 宽字符占 2 列
 * buf.fill(0, 1, 80, 1, new Cell("-", TextStyle.NORMAL));
 * ```
 *
 * @module
 */

import { Cell } from "./cell.js";
import { TextStyle } from "./text-style.js";

/**
 * 二维单元格矩阵，终端屏幕的单层缓冲区。
 *
 * 内部使用 `Cell[][]`（height 行 x width 列）存储，初始化为 {@link Cell.EMPTY}。
 */
export class ScreenBuffer {
  /** 缓冲区宽度（列数） */
  readonly width: number;
  /** 缓冲区高度（行数） */
  readonly height: number;

  /** @internal 内部单元格存储，cells[y][x] */
  private cells: Cell[][];

  /**
   * 创建指定尺寸的屏幕缓冲区，所有单元格初始化为 {@link Cell.EMPTY}。
   *
   * @param width - 列数
   * @param height - 行数
   */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = ScreenBuffer.createCells(width, height);
  }

  /**
   * 创建 height x width 的 Cell 二维数组，全部填充 {@link Cell.EMPTY}。
   *
   * @internal
   */
  private static createCells(width: number, height: number): Cell[][] {
    const rows: Cell[][] = [];
    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        row.push(Cell.EMPTY);
      }
      rows.push(row);
    }
    return rows;
  }

  /**
   * 读取指定位置的单元格。
   *
   * x 为列索引，y 为行索引。越界时返回 {@link Cell.EMPTY}。
   *
   * @param x - 列索引
   * @param y - 行索引
   * @returns 对应位置的 Cell，越界时返回 Cell.EMPTY
   */
  getCell(x: number, y: number): Cell {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return Cell.EMPTY;
    }
    return this.cells[y][x];
  }

  /**
   * 设置指定位置的单元格。
   *
   * 越界时静默忽略。
   *
   * @param x - 列索引
   * @param y - 行索引
   * @param cell - 要设置的单元格
   */
  setCell(x: number, y: number, cell: Cell): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.cells[y][x] = cell;
  }

  /**
   * 在指定位置写入字符。
   *
   * 创建 `Cell(char, style, width)` 并设置到缓冲区。
   * 当 width=2 时，同时在 x+1 位置设置续位占位符 `Cell("", style, 0)`。
   *
   * @param x - 列索引
   * @param y - 行索引
   * @param char - 显示字符
   * @param style - 文本样式
   * @param width - 显示宽度，默认为 1
   */
  writeChar(x: number, y: number, char: string, style: TextStyle, width: number = 1): void {
    this.setCell(x, y, new Cell(char, style, width));
    if (width === 2) {
      this.setCell(x + 1, y, new Cell("", style, 0));
    }
  }

  /**
   * 清空缓冲区，将所有单元格重置为 {@link Cell.EMPTY}。
   */
  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x] = Cell.EMPTY;
      }
    }
  }

  /**
   * 用指定单元格填充矩形区域。
   *
   * 自动裁剪到缓冲区边界内，不会越界写入。
   *
   * @param x - 矩形左上角列索引
   * @param y - 矩形左上角行索引
   * @param w - 矩形宽度
   * @param h - 矩形高度
   * @param cell - 填充用的单元格
   */
  fill(x: number, y: number, w: number, h: number, cell: Cell): void {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w);
    const y1 = Math.min(this.height, y + h);

    for (let row = y0; row < y1; row++) {
      for (let col = x0; col < x1; col++) {
        this.cells[row][col] = cell;
      }
    }
  }

  /**
   * 调整缓冲区尺寸。
   *
   * 保留新旧尺寸交集区域的内容，新增区域填充 {@link Cell.EMPTY}。
   *
   * @param newWidth - 新的列数
   * @param newHeight - 新的行数
   */
  resize(newWidth: number, newHeight: number): void {
    const newCells = ScreenBuffer.createCells(newWidth, newHeight);
    const copyW = Math.min(this.width, newWidth);
    const copyH = Math.min(this.height, newHeight);

    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        newCells[y][x] = this.cells[y][x];
      }
    }

    this.cells = newCells;
    // 使用类型断言绕过 readonly，resize 是合法的可变操作
    (this as { width: number }).width = newWidth;
    (this as { height: number }).height = newHeight;
  }

  /**
   * 将本缓冲区的所有单元格拷贝到目标缓冲区。
   *
   * 源与目标必须具有相同的尺寸。
   *
   * @param target - 目标缓冲区
   * @throws Error 当尺寸不匹配时
   */
  copyTo(target: ScreenBuffer): void {
    if (this.width !== target.width || this.height !== target.height) {
      throw new Error(
        `缓冲区尺寸不匹配：源 ${this.width}x${this.height}，目标 ${target.width}x${target.height}`
      );
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        target.cells[y][x] = this.cells[y][x];
      }
    }
  }
}
