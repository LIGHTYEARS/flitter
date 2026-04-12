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

import { RenderBox } from "../tree/render-box.js";
import { Widget } from "../tree/widget.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { RenderObject } from "../tree/render-object.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "./text-span.js";
import { graphemeSegments, charWidth } from "../text/char-width.js";

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

  /**
   * 创建段落渲染对象。
   *
   * @param textSpan - 文本内容树
   */
  constructor(textSpan: TextSpan) {
    super();
    this._textSpan = textSpan;
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

  /**
   * 执行布局计算。
   *
   * 1. 深度优先遍历 TextSpan 树，收集所有字素及其有效样式
   * 2. 按约束 maxWidth 进行自动换行
   * 3. 设置自身尺寸为最宽行宽度 x 行数
   */
  performLayout(): void {
    const constraints = this._constraints!;
    const maxWidth = constraints.maxWidth;

    // 收集所有字素
    const allGlyphs: LayoutGlyph[] = [];
    this._collectGlyphs(this._textSpan, [], allGlyphs);

    // 空文本
    if (allGlyphs.length === 0) {
      this._lines = [];
      this.size = constraints.constrain(0, 0);
      return;
    }

    // 按 maxWidth 换行
    const lines: LayoutGlyph[][] = [];
    let currentLine: LayoutGlyph[] = [];
    let currentLineWidth = 0;

    for (const glyph of allGlyphs) {
      // 如果当前行非空且添加此字素会超出宽度，则换行
      if (currentLine.length > 0 && currentLineWidth + glyph.width > maxWidth) {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }
      currentLine.push(glyph);
      currentLineWidth += glyph.width;
    }

    // 推入最后一行
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    this._lines = lines;

    // 计算最大行宽
    let maxLineWidth = 0;
    for (const line of lines) {
      let lineWidth = 0;
      for (const glyph of line) {
        lineWidth += glyph.width;
      }
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
      }
    }

    this.size = constraints.constrain(maxLineWidth, lines.length);
  }

  /**
   * 绘制文本到屏幕。
   *
   * 逐行逐字素调用 screen.writeChar 写入字符。
   *
   * @param screen - 目标屏幕
   * @param offsetX - 全局 X 偏移
   * @param offsetY - 全局 Y 偏移
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    for (let lineIdx = 0; lineIdx < this._lines.length; lineIdx++) {
      const line = this._lines[lineIdx];
      let x = offsetX;
      const y = offsetY + lineIdx;

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
  private _collectGlyphs(
    span: TextSpan,
    styleStack: TextStyle[],
    out: LayoutGlyph[],
  ): void {
    // 计算有效样式：从根到当前节点逐层合并
    const effectiveStyle = this._resolveStyle(span, styleStack);
    const newStack = [...styleStack, effectiveStyle];

    // 处理当前节点的文本
    if (span.text) {
      const segments = graphemeSegments(span.text);
      for (const seg of segments) {
        const w = charWidth(seg);
        out.push({ grapheme: seg, style: effectiveStyle, width: w });
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
  }

  /**
   * 创建关联的元素。
   *
   * @returns 新的 LeafRenderObjectElement 实例
   */
  createElement(): Element {
    return new LeafRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 创建渲染对象。
   *
   * @returns 新的 RenderParagraph 实例
   */
  createRenderObject(): RenderObject {
    return new RenderParagraph(this.text);
  }

  /**
   * 用当前 Widget 配置更新已有的渲染对象。
   *
   * @param renderObject - 待更新的渲染对象
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderParagraph).textSpan = this.text;
  }
}
