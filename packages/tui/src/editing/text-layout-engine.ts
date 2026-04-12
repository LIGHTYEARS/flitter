/**
 * 文本换行布局引擎
 *
 * 基于 Grapheme cluster 分割和 CJK/Emoji 字符宽度计算，
 * 提供文本的自动换行布局和 offset ↔ 行列双向映射能力。
 *
 * 忠实还原自逆向工程代码中的 Kw 类 (widget-property-system.js)。
 *
 * @module text-layout-engine
 *
 * @example
 * ```ts
 * const engine = new TextLayoutEngine();
 * engine.updateText("你好世界");
 * engine.updateWidth(6); // 每行最多 6 列
 * engine.getLineCount(); // 2 → "你好世" + "界"
 * engine.offsetToPosition(3); // { line: 0, col: 3 }
 * ```
 */

import { charWidth, graphemeSegments } from "../text/char-width.js";

/**
 * 布局位置，表示文本中的行列坐标
 *
 * @example
 * ```ts
 * const pos: LayoutPosition = { line: 0, col: 0 };
 * ```
 */
export interface LayoutPosition {
  /** 0-based 行号 (含逻辑行和自动换行行) */
  line: number;
  /** 0-based 列号 (grapheme index in line) */
  col: number;
}

/**
 * 布局行信息（内部使用）
 *
 * 还原自逆向代码 Kw._computeLines 中的行对象结构。
 */
interface LayoutLine {
  /** 行首 grapheme 在全文 graphemes 数组中的偏移 */
  startOffset: number;
  /** 行尾 grapheme 偏移（不含，即下一行首偏移或全文末尾） */
  endOffset: number;
  /** 行显示宽度（列数） */
  width: number;
  /** 是否为硬换行（\n 导致） */
  isHardBreak: boolean;
}

/** Grapheme 分割器（模块级单例，对齐 char-width.ts 的 segmenter 策略） */
const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });

/**
 * 文本换行布局引擎
 *
 * 负责将文本按给定视口宽度进行换行布局，并提供 grapheme offset
 * 与行列位置的双向映射。
 *
 * 设计对齐逆向代码中的 Kw 类 (widget-property-system.js:905-1090)。
 *
 * 关键特性：
 * - Grapheme cluster 分割使用原生 Intl.Segmenter (高性能)
 * - CJK 字符宽度 = 2，通过 charWidth 计算
 * - 换行时 CJK 字符不拆分：剩余宽度不够时整个字符换行
 * - 惰性计算 + 脏标记，避免不必要的重新布局
 *
 * @example
 * ```ts
 * const engine = new TextLayoutEngine();
 * engine.updateText("hello\nworld");
 * engine.updateWidth(80);
 * engine.getLineCount(); // 2
 * engine.getLine(0);     // "hello"
 * engine.offsetToPosition(6); // { line: 1, col: 0 }
 * ```
 */
export class TextLayoutEngine {
  /** 原始文本 */
  private _text: string = "";
  /** 视口宽度（列数） */
  private _width: number = 80;
  /** 布局后的行信息（惰性计算） */
  private _layoutLines: LayoutLine[] | null = null;
  /** 全文 grapheme 列表（惰性计算） */
  private _graphemes: string[] | null = null;

  /**
   * 设置文本内容，标记布局缓存为脏
   *
   * @param text - 新的文本内容
   */
  updateText(text: string): void {
    if (this._text !== text) {
      this._text = text;
      this._invalidateCache();
    }
  }

  /**
   * 设置视口宽度，标记布局缓存为脏
   *
   * @param width - 新的视口宽度（列数）
   */
  updateWidth(width: number): void {
    if (this._width !== width) {
      this._width = width;
      this._invalidateCache();
    }
  }

  /**
   * 获取全文 grapheme 列表（惰性计算）
   *
   * @returns grapheme 字符串数组
   */
  get graphemes(): string[] {
    if (this._graphemes === null) {
      this._graphemes = this._segmentGraphemes(this._text);
    }
    return this._graphemes;
  }

  /**
   * 获取布局行列表（惰性计算）
   *
   * @returns LayoutLine 数组
   */
  private get _lines(): LayoutLine[] {
    if (this._layoutLines === null) {
      this._performLayout();
    }
    return this._layoutLines!;
  }

  /**
   * 获取布局行数
   *
   * @returns 行数（空文本返回 1）
   */
  getLineCount(): number {
    return this._lines.length;
  }

  /**
   * 获取指定行的文本内容
   *
   * @param lineIndex - 0-based 行号
   * @returns 行文本，越界返回空字符串
   */
  getLine(lineIndex: number): string {
    const lines = this._lines;
    if (lineIndex < 0 || lineIndex >= lines.length) return "";
    const line = lines[lineIndex]!;
    return this.graphemes.slice(line.startOffset, line.endOffset).join("");
  }

  /**
   * 获取全文 grapheme 总数
   *
   * @returns grapheme 数量
   */
  getGraphemeCount(): number {
    return this.graphemes.length;
  }

  /**
   * 将 grapheme offset 转换为行列位置
   *
   * 还原自逆向代码 Kw.offsetToPosition (widget-property-system.js:943-955)。
   *
   * @param graphemeOffset - 0-based grapheme 偏移
   * @returns 行列位置
   */
  offsetToPosition(graphemeOffset: number): LayoutPosition {
    const gs = this.graphemes;
    let line = 0;
    let col = 0;

    for (let i = 0; i < graphemeOffset && i < gs.length; i++) {
      if (gs[i] === "\n") {
        line++;
        col = 0;
      } else {
        col++;
      }
    }

    return { line, col };
  }

  /**
   * 将行列位置转换为 grapheme offset
   *
   * 还原自逆向代码 Kw.positionToOffset (widget-property-system.js:956-969)。
   *
   * @param position - 行列位置
   * @returns grapheme 偏移
   */
  positionToOffset(position: LayoutPosition): number {
    const gs = this.graphemes;
    let line = 0;
    let col = 0;

    for (let i = 0; i <= gs.length; i++) {
      if (line === position.line && col === position.col) return i;
      if (line > position.line) return i;
      if (i >= gs.length) return i;
      if (gs[i] === "\n") {
        line++;
        col = 0;
      } else {
        col++;
      }
    }

    return gs.length;
  }

  /**
   * 计算给定 grapheme offset 在其所在行中的布局列宽度
   *
   * 布局列 = 从行首到该 offset 的所有 grapheme 显示宽度之和。
   * CJK 字符贡献宽度 2，ASCII 贡献 1。
   *
   * 还原自逆向代码 wc._getLayoutColumnFromOffset (widget-property-system.js:1207-1214)。
   *
   * @param offset - grapheme 偏移
   * @returns 布局列宽度
   */
  getLayoutColumnFromOffset(offset: number): number {
    const lines = this._lines;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (offset >= line.startOffset && offset <= line.endOffset) {
        // 计算从行首到 offset 的显示宽度
        const gs = this.graphemes;
        let width = 0;
        for (let j = line.startOffset; j < offset; j++) {
          const g = gs[j];
          if (g && g !== "\n") {
            width += charWidth(g);
          }
        }
        return width;
      }
    }
    return 0;
  }

  /**
   * 获取指定行的文本（按逻辑行，基于 \n 分割）
   *
   * 还原自逆向代码 Kw.getLineText (widget-property-system.js:970-974)。
   *
   * @param lineIndex - 0-based 逻辑行号
   * @returns 行文本
   */
  getLineText(lineIndex: number): string {
    const textLines = this._text.split("\n");
    return lineIndex >= 0 && lineIndex < textLines.length
      ? textLines[lineIndex] ?? ""
      : "";
  }

  /**
   * 使缓存无效
   */
  private _invalidateCache(): void {
    this._layoutLines = null;
    this._graphemes = null;
  }

  /**
   * 使用 Intl.Segmenter 将文本按 grapheme cluster 分割
   *
   * @param text - 待分割的文本
   * @returns grapheme 数组
   */
  private _segmentGraphemes(text: string): string[] {
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }

  /**
   * 执行文本布局计算
   *
   * 还原自逆向代码 Kw._computeLines (widget-property-system.js:978-1046)。
   *
   * 算法流程:
   * 1. 使用 Intl.Segmenter 分割全文为 grapheme 数组
   * 2. 逐 grapheme 遍历:
   *    - 遇 \n 产生硬换行
   *    - 累计宽度超过 _width 时产生软换行
   *    - CJK 字符不拆分：如果剩余宽度不够则整个字符换到下一行
   * 3. 记录每行的 startOffset / endOffset / width / isHardBreak
   */
  private _performLayout(): void {
    const gs = this.graphemes;
    const maxWidth = this._width;
    this._layoutLines = [];

    if (gs.length === 0) {
      this._layoutLines.push({
        startOffset: 0,
        endOffset: 0,
        width: 0,
        isHardBreak: false,
      });
      return;
    }

    let lineStart = 0;
    let lineWidth = 0;
    let idx = 0;

    while (idx < gs.length) {
      const g = gs[idx];
      if (!g) {
        idx++;
        continue;
      }

      // 硬换行
      if (g === "\n") {
        this._layoutLines.push({
          startOffset: lineStart,
          endOffset: idx,
          width: lineWidth,
          isHardBreak: true,
        });
        lineStart = idx + 1;
        lineWidth = 0;
        idx++;
        continue;
      }

      // 计算当前 grapheme 宽度
      const gw = charWidth(g);

      // 软换行: 当前行宽度不够放下此 grapheme
      if (lineWidth + gw > maxWidth && lineWidth > 0) {
        this._layoutLines.push({
          startOffset: lineStart,
          endOffset: idx,
          width: lineWidth,
          isHardBreak: false,
        });
        lineStart = idx;
        lineWidth = 0;
        continue; // 不递增 idx，让新行重新处理此 grapheme
      }

      lineWidth += gw;
      idx++;
    }

    // 处理最后一行 / 末尾换行符
    const endsWithNewline =
      gs.length > 0 && gs[gs.length - 1] === "\n";

    if (
      lineStart < gs.length ||
      this._layoutLines.length === 0 ||
      endsWithNewline
    ) {
      this._layoutLines.push({
        startOffset: lineStart,
        endOffset: gs.length,
        width: lineWidth,
        isHardBreak: false,
      });
    }
  }
}
