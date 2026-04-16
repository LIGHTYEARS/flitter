/**
 * 富文本渲染组件。
 *
 * 包含 {@link RenderParagraph} 渲染对象和 {@link RichText} Widget。
 * RenderParagraph 负责将 {@link TextSpan} 树布局为多行文本并绘制到屏幕。
 * RichText 是对应的 Widget 层封装。
 *
 * @example
 * ```ts
 * const richText = new RichText({
 *   text: new TextSpan({
 *     text: "Hello ",
 *     style: new TextStyle({ bold: true }),
 *     children: [new TextSpan({ text: "World" })],
 *   }),
 * });
 * ```
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import { charWidth, graphemeSegments } from "../text/char-width.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import type { TextSpan } from "./text-span.js";

// ════════════════════════════════════════════════════
//  内部类型
// ════════════════════════════════════════════════════

/** 已布局的单个字素信息 */
interface LayoutGlyph {
  /** 字素字符串 */
  grapheme: string;
  /** 应用的文本样式 */
  style: TextStyle;
  /** 显示宽度 */
  width: number;
  /** 来源 TextSpan 引用，用于 hit-testing */
  span: TextSpan;
}

/** 文本对齐方式 */
export type TextAlign = "left" | "center" | "right";

/** 文本溢出处理方式 */
export type TextOverflow = "clip" | "ellipsis" | "visible";

/** RenderParagraph 构造选项 */
interface RenderParagraphOptions {
  textAlign?: TextAlign;
  overflow?: TextOverflow;
  maxLines?: number;
}

// ════════════════════════════════════════════════════
//  LeafRenderObjectElement
// ════════════════════════════════════════════════════

/**
 * 叶子渲染对象元素。
 *
 * 用于没有子 Widget 的 RenderObjectWidget（如 RichText）。
 */
class LeafRenderObjectElement extends RenderObjectElement {
  /**
   * 挂载到元素树。
   *
   * 调用父类 mount 创建渲染对象并插入渲染树。
   *
   * @param parent - 父元素
   */
  override mount(parent?: Element): void {
    super.mount(parent);
    this._dirty = false;
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * @param newWidget - 新的 Widget 实例
   */
  override update(newWidget: WidgetInterface): void {
    super.update(newWidget);
    this._dirty = false;
  }
}

// ════════════════════════════════════════════════════
//  RenderParagraph
// ════════════════════════════════════════════════════

/**
 * 段落渲染对象。
 *
 * 将 {@link TextSpan} 树布局为多行文本，按照约束宽度自动换行，
 * 并在绘制时逐字素写入 {@link Screen}。
 *
 * 是叶子节点，不包含子 RenderObject。
 */
export class RenderParagraph extends RenderBox {
  /** 文本内容 */
  private _textSpan: TextSpan;

  /** 已布局的文本行 */
  private _lines: LayoutGlyph[][] = [];

  /** 文本对齐方式 */
  private _textAlign: TextAlign;

  /** 溢出处理方式 */
  private _overflow: TextOverflow;

  /** 最大显示行数 */
  private _maxLines: number | undefined;

  /**
   * 创建段落渲染对象。
   *
   * @param textSpan - 文本内容树
   * @param options - 可选配置（textAlign、overflow、maxLines）
   */
  constructor(textSpan: TextSpan, options?: RenderParagraphOptions) {
    super();
    this._textSpan = textSpan;
    this._textAlign = options?.textAlign ?? "left";
    this._overflow = options?.overflow ?? "clip";
    this._maxLines = options?.maxLines;
  }

  /**
   * 获取文本内容。
   *
   * @returns 当前 TextSpan
   */
  get textSpan(): TextSpan {
    return this._textSpan;
  }

  /**
   * 设置文本内容。
   *
   * 如果值发生变化则标记需要重新布局。
   *
   * @param value - 新的 TextSpan
   */
  set textSpan(value: TextSpan) {
    if (!this._textSpan.equals(value)) {
      this._textSpan = value;
      this.markNeedsLayout();
    }
  }

  get textAlign(): TextAlign {
    return this._textAlign;
  }
  set textAlign(value: TextAlign) {
    if (this._textAlign !== value) {
      this._textAlign = value;
      this.markNeedsPaint();
    }
  }

  get overflow(): TextOverflow {
    return this._overflow;
  }
  set overflow(value: TextOverflow) {
    if (this._overflow !== value) {
      this._overflow = value;
      if (value === "ellipsis") this.markNeedsLayout();
      else this.markNeedsPaint();
    }
  }

  get maxLines(): number | undefined {
    return this._maxLines;
  }
  set maxLines(value: number | undefined) {
    if (this._maxLines !== value) {
      this._maxLines = value;
      this.markNeedsLayout();
    }
  }

  /**
   * 收集字素并按给定宽度换行。
   *
   * 逆向: amp t1T — 供 performLayout 和 intrinsic size 方法共用。
   */
  private _computeLines(maxWidth: number): LayoutGlyph[][] {
    const allGlyphs: LayoutGlyph[] = [];
    this._collectGlyphs(this._textSpan, [], allGlyphs);

    if (allGlyphs.length === 0) return [];

    const lines: LayoutGlyph[][] = [];
    let currentLine: LayoutGlyph[] = [];
    let currentLineWidth = 0;

    for (const glyph of allGlyphs) {
      if (currentLine.length > 0 && currentLineWidth + glyph.width > maxWidth) {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }
      currentLine.push(glyph);
      currentLineWidth += glyph.width;
    }
    if (currentLine.length > 0) lines.push(currentLine);

    return lines;
  }

  // ────────────────────────────────────────────────
  //  Intrinsic sizes (amp t1T alignment)
  // ────────────────────────────────────────────────

  /**
   * 逆向: amp t1T.getMinIntrinsicWidth — 最宽不可断行词的宽度。
   */
  override getMinIntrinsicWidth(_height: number): number {
    const allGlyphs: LayoutGlyph[] = [];
    this._collectGlyphs(this._textSpan, [], allGlyphs);
    if (allGlyphs.length === 0) return 0;

    let maxWordWidth = 0;
    let currentWordWidth = 0;
    for (const glyph of allGlyphs) {
      if (glyph.grapheme === " " || glyph.grapheme === "\t") {
        if (currentWordWidth > maxWordWidth) maxWordWidth = currentWordWidth;
        currentWordWidth = 0;
      } else {
        currentWordWidth += glyph.width;
      }
    }
    if (currentWordWidth > maxWordWidth) maxWordWidth = currentWordWidth;
    return maxWordWidth;
  }

  /**
   * 逆向: amp t1T.getMaxIntrinsicWidth — 所有字素在单行时的总宽度。
   */
  override getMaxIntrinsicWidth(_height: number): number {
    const allGlyphs: LayoutGlyph[] = [];
    this._collectGlyphs(this._textSpan, [], allGlyphs);
    let total = 0;
    for (const glyph of allGlyphs) total += glyph.width;
    return total;
  }

  /**
   * 逆向: amp t1T.getMinIntrinsicHeight — 在给定宽度下的换行行数。
   */
  override getMinIntrinsicHeight(width: number): number {
    const lines = this._computeLines(width);
    const count = lines.length;
    if (this._maxLines !== undefined && count > this._maxLines) return this._maxLines;
    return count;
  }

  /**
   * 逆向: amp t1T.getMaxIntrinsicHeight — 文本不会垂直扩展，等于 min。
   */
  override getMaxIntrinsicHeight(width: number): number {
    return this.getMinIntrinsicHeight(width);
  }

  /**
   * 执行布局计算。
   *
   * 逆向: amp t1T.performLayout
   *
   * 1. 深度优先遍历 TextSpan 树，收集所有字素及其有效样式
   * 2. 按约束 maxWidth 进行自动换行
   * 3. 应用 maxLines 截断和 ellipsis 处理
   * 4. 设置自身尺寸为最宽行宽度 x 行数
   */
  performLayout(): void {
    const constraints = this._constraints!;
    const maxWidth = constraints.maxWidth;

    let lines = this._computeLines(maxWidth);

    // 空文本
    if (lines.length === 0) {
      this._lines = [];
      this.size = constraints.constrain(0, 0);
      return;
    }

    // maxLines 截断
    // 逆向: amp t1T — 超过 maxLines 的行被丢弃
    if (this._maxLines !== undefined && lines.length > this._maxLines) {
      lines = lines.slice(0, this._maxLines);

      // ellipsis 处理: 替换最后一行的尾部字符为 '…'
      if (this._overflow === "ellipsis" && lines.length > 0) {
        const lastLine = [...lines[lines.length - 1]!];
        let lastLineWidth = 0;
        for (const g of lastLine) lastLineWidth += g.width;

        if (lastLineWidth >= maxWidth) {
          // 移除尾部字符直到腾出 1 格空间
          while (lastLine.length > 0 && lastLineWidth > maxWidth - 1) {
            const removed = lastLine.pop()!;
            lastLineWidth -= removed.width;
          }
        }
        // 追加 … 字素
        const ellipsisStyle =
          lastLine.length > 0 ? lastLine[lastLine.length - 1]!.style : TextStyle.NORMAL;
        const ellipsisSpan =
          lastLine.length > 0 ? lastLine[lastLine.length - 1]!.span : this._textSpan;
        lastLine.push({ grapheme: "…", style: ellipsisStyle, width: 1, span: ellipsisSpan });
        lines[lines.length - 1] = lastLine;
      }
    }

    this._lines = lines;

    // 计算最大行宽
    let maxLineWidth = 0;
    for (const line of lines) {
      let lineWidth = 0;
      for (const glyph of line) lineWidth += glyph.width;
      if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
    }

    this.size = constraints.constrain(maxLineWidth, lines.length);
  }

  /**
   * 绘制文本到屏幕。
   *
   * 逆向: amp t1T.performPaint — 按 textAlign 计算行起始偏移。
   *
   * @param screen - 目标屏幕
   * @param offsetX - 全局 X 偏移
   * @param offsetY - 全局 Y 偏移
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const boxWidth = this._size.width;

    for (let lineIdx = 0; lineIdx < this._lines.length; lineIdx++) {
      const line = this._lines[lineIdx]!;
      const y = offsetY + lineIdx;

      // 计算行宽
      let lineWidth = 0;
      for (const glyph of line) lineWidth += glyph.width;

      // 逆向: amp t1T — 按 textAlign 计算行起始偏移
      let alignOffset = 0;
      if (this._textAlign === "center") {
        alignOffset = Math.floor((boxWidth - lineWidth) / 2);
      } else if (this._textAlign === "right") {
        alignOffset = boxWidth - lineWidth;
      }

      let x = offsetX + alignOffset;
      for (const glyph of line) {
        screen.writeChar(x, y, glyph.grapheme, glyph.style, glyph.width);
        x += glyph.width;
      }
    }
  }

  /**
   * 递归收集 TextSpan 树中所有字素及其有效样式。
   *
   * @param span - 当前 TextSpan 节点
   * @param styleStack - 祖先样式栈（从根到父）
   * @param out - 输出的字素数组
   *
   * @internal
   */
  private _collectGlyphs(span: TextSpan, styleStack: TextStyle[], out: LayoutGlyph[]): void {
    // 计算有效样式：从根到当前节点逐层合并
    const effectiveStyle = this._resolveStyle(span, styleStack);
    const newStack = [...styleStack, effectiveStyle];

    // 处理当前节点的文本
    if (span.text) {
      const segments = graphemeSegments(span.text);
      for (const seg of segments) {
        const w = charWidth(seg);
        out.push({ grapheme: seg, style: effectiveStyle, width: w, span });
      }
    }

    // 递归处理子节点
    if (span.children) {
      for (const child of span.children) {
        this._collectGlyphs(child, newStack, out);
      }
    }
  }

  /**
   * 解析节点的有效样式。
   *
   * 如果节点有样式，则与父样式合并；否则使用父样式或默认样式。
   *
   * @param span - 当前节点
   * @param styleStack - 祖先样式栈
   * @returns 有效样式
   *
   * @internal
   */
  private _resolveStyle(span: TextSpan, styleStack: TextStyle[]): TextStyle {
    const parentStyle =
      styleStack.length > 0 ? styleStack[styleStack.length - 1] : TextStyle.NORMAL;
    if (span.style) {
      return parentStyle.merge(span.style);
    }
    return parentStyle;
  }
}

// ════════════════════════════════════════════════════
//  RichText Widget
// ════════════════════════════════════════════════════

/** RichText 构造函数参数。 */
interface RichTextArgs {
  /** 可选标识键 */
  key?: Key;
  /** 文本内容 */
  text: TextSpan;
  /** 文本对齐方式 */
  textAlign?: TextAlign;
  /** 溢出处理方式 */
  overflow?: TextOverflow;
  /** 最大显示行数 */
  maxLines?: number;
}

/**
 * 富文本 Widget。
 *
 * 将 {@link TextSpan} 树渲染为多行段落文本。
 * 创建 {@link RenderParagraph} 作为渲染对象。
 */
export class RichText extends Widget implements RenderObjectWidget {
  /** 文本内容 */
  readonly text: TextSpan;

  /** 文本对齐方式 */
  readonly textAlign: TextAlign;

  /** 溢出处理方式 */
  readonly overflow: TextOverflow;

  /** 最大显示行数 */
  readonly maxLines: number | undefined;

  /** 无子 Widget（叶子节点） */
  readonly child: WidgetInterface | undefined = undefined;

  /**
   * 创建富文本 Widget。
   *
   * @param args - 配置参数
   */
  constructor(args: RichTextArgs) {
    super({ key: args.key });
    this.text = args.text;
    this.textAlign = args.textAlign ?? "left";
    this.overflow = args.overflow ?? "clip";
    this.maxLines = args.maxLines;
  }

  createElement(): Element {
    return new LeafRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new RenderParagraph(this.text, {
      textAlign: this.textAlign,
      overflow: this.overflow,
      maxLines: this.maxLines,
    });
  }

  updateRenderObject(renderObject: RenderObject): void {
    const rp = renderObject as RenderParagraph;
    rp.textSpan = this.text;
    rp.textAlign = this.textAlign;
    rp.overflow = this.overflow;
    rp.maxLines = this.maxLines;
  }
}
