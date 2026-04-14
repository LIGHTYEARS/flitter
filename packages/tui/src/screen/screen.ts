/**
 * 双缓冲屏幕与脏区域追踪。
 *
 * `Screen` 维护前后两个 {@link ScreenBuffer}，所有绘制操作写入后缓冲区（back），
 * 通过脏区域追踪仅刷新实际变化的单元格，调用 {@link Screen.present | present()}
 * 将后缓冲区同步到前缓冲区（front）。
 *
 * @example
 * ```ts
 * const screen = new Screen(80, 24);
 *
 * // 绘制到 back buffer
 * screen.writeChar(0, 0, "H", boldStyle);
 * screen.writeChar(1, 0, "i", normalStyle);
 *
 * // 获取需要刷新的区域
 * const dirty = screen.getDirtyRegions();
 * // → [{ y: 0, cells: [{ x: 0, cell }, { x: 1, cell }] }]
 *
 * // 提交帧：同步 back → front，清除脏标记
 * screen.present();
 * ```
 *
 * @module
 */

import { ScreenBuffer } from "./buffer.js";
import type { Cell } from "./cell.js";
import type { TextStyle } from "./text-style.js";

/**
 * 脏区域描述：一行中发生变化的单元格集合。
 */
export interface DirtyRegion {
  /** 行索引 */
  y: number;
  /** 该行中发生变化的单元格列表，按 x 升序排列 */
  cells: Array<{ x: number; cell: Cell }>;
}

/**
 * 双缓冲屏幕。
 *
 * 前缓冲区（front）代表当前已显示的内容，后缓冲区（back）是绘制目标。
 * 脏区域追踪记录 back 中相对于 front 发生变化的单元格位置。
 */
export class Screen {
  /** 屏幕宽度（列数） */
  width: number;
  /** 屏幕高度（行数） */
  height: number;

  /** 前缓冲区——当前已显示的内容 */
  readonly front: ScreenBuffer;
  /** 后缓冲区——绘制目标 */
  readonly back: ScreenBuffer;

  /** 是否需要全量刷新 */
  needsFullRefresh: boolean;

  /** 光标位置，null 表示未设置 */
  cursorPosition: { x: number; y: number } | null;
  /** 光标是否可见 */
  cursorVisible: boolean;

  /** @internal 包含脏单元格的行索引集合 */
  private dirtyRows: Set<number>;
  /** @internal 每行中脏单元格的列索引集合 */
  private dirtyCells: Map<number, Set<number>>;

  /**
   * 创建双缓冲屏幕。
   *
   * 初始时 {@link needsFullRefresh} 为 true，表示首帧需要全量输出。
   *
   * @param width - 列数
   * @param height - 行数
   */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.front = new ScreenBuffer(width, height);
    this.back = new ScreenBuffer(width, height);
    this.needsFullRefresh = true;
    this.cursorPosition = null;
    this.cursorVisible = true;
    this.dirtyRows = new Set();
    this.dirtyCells = new Map();
  }

  /**
   * 从后缓冲区读取指定位置的单元格。
   *
   * @param x - 列索引
   * @param y - 行索引
   * @returns 对应位置的 Cell
   */
  getCell(x: number, y: number): Cell {
    return this.back.getCell(x, y);
  }

  /**
   * 向后缓冲区写入单元格。
   *
   * 如果新值与当前值相同，则跳过写入且不标记脏区域（避免不必要的刷新）。
   *
   * @param x - 列索引
   * @param y - 行索引
   * @param cell - 要写入的单元格
   */
  setCell(x: number, y: number, cell: Cell): void {
    if (this.back.getCell(x, y).equals(cell)) {
      return;
    }
    this.back.setCell(x, y, cell);
    this.markDirty(x, y);
  }

  /**
   * 在后缓冲区指定位置写入字符。
   *
   * 委托给 {@link ScreenBuffer.writeChar}，同时标记受影响的单元格为脏。
   * 当 width=2 时，主单元格和续位占位符均标记为脏。
   *
   * @param x - 列索引
   * @param y - 行索引
   * @param char - 显示字符
   * @param style - 文本样式
   * @param width - 显示宽度，默认为 1
   */
  writeChar(x: number, y: number, char: string, style: TextStyle, width: number = 1): void {
    this.back.writeChar(x, y, char, style, width);
    this.markDirty(x, y);
    if (width === 2) {
      this.markDirty(x + 1, y);
    }
  }

  /**
   * 清空后缓冲区并标记需要全量刷新。
   */
  clear(): void {
    this.back.clear();
    this.needsFullRefresh = true;
  }

  /**
   * 调整屏幕尺寸。
   *
   * 前后缓冲区同时调整，保留交集区域内容，并标记需要全量刷新。
   *
   * @param newWidth - 新的列数
   * @param newHeight - 新的行数
   */
  resize(newWidth: number, newHeight: number): void {
    this.front.resize(newWidth, newHeight);
    this.back.resize(newWidth, newHeight);
    this.width = newWidth;
    this.height = newHeight;
    this.needsFullRefresh = true;
  }

  /**
   * 获取脏区域列表。
   *
   * - 当 {@link needsFullRefresh} 为 true 时，返回后缓冲区中所有行的全部非 EMPTY 单元格。
   * - 否则，仅返回自上次 {@link present} 以来标记为脏的单元格。
   *
   * 每个 {@link DirtyRegion} 的 cells 按 x 升序排列。
   *
   * @returns 脏区域数组，按行索引升序
   */
  getDirtyRegions(): DirtyRegion[] {
    if (this.needsFullRefresh) {
      return this.getAllRegions();
    }
    return this.getDirtyOnly();
  }

  /**
   * 提交当前帧：将后缓冲区同步到前缓冲区，清除脏追踪状态。
   *
   * 调用后 {@link needsFullRefresh} 设为 false，脏区域清空。
   */
  present(): void {
    this.back.copyTo(this.front);
    this.dirtyRows.clear();
    this.dirtyCells.clear();
    this.needsFullRefresh = false;
  }

  /**
   * 标记指定位置为脏。
   *
   * @internal
   */
  private markDirty(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.dirtyRows.add(y);
    let cols = this.dirtyCells.get(y);
    if (!cols) {
      cols = new Set();
      this.dirtyCells.set(y, cols);
    }
    cols.add(x);
  }

  /**
   * 全量刷新：返回后缓冲区中所有行的全部单元格。
   *
   * @internal
   */
  private getAllRegions(): DirtyRegion[] {
    const regions: DirtyRegion[] = [];
    for (let y = 0; y < this.height; y++) {
      const cells: Array<{ x: number; cell: Cell }> = [];
      for (let x = 0; x < this.width; x++) {
        const cell = this.back.getCell(x, y);
        cells.push({ x, cell });
      }
      if (cells.length > 0) {
        regions.push({ y, cells });
      }
    }
    return regions;
  }

  /**
   * 增量刷新：仅返回标记为脏的单元格。
   *
   * @internal
   */
  private getDirtyOnly(): DirtyRegion[] {
    const regions: DirtyRegion[] = [];
    const sortedRows = Array.from(this.dirtyRows).sort((a, b) => a - b);

    for (const y of sortedRows) {
      const cols = this.dirtyCells.get(y);
      if (!cols || cols.size === 0) continue;

      const sortedCols = Array.from(cols).sort((a, b) => a - b);
      const cells: Array<{ x: number; cell: Cell }> = [];
      for (const x of sortedCols) {
        cells.push({ x, cell: this.back.getCell(x, y) });
      }
      regions.push({ y, cells });
    }
    return regions;
  }
}
