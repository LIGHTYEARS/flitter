/**
 * Markdown 渲染器 — AST → TextSpan Widget 树。
 *
 * 将 {@link MarkdownParser} 输出的 AST 节点树转换为 TextSpan Widget 树，
 * 用于在终端中渲染格式化的 Markdown 内容。
 *
 * 支持：段落、标题、粗体、斜体、删除线、代码块（带语法高亮）、
 * 内联代码、列表、表格、块引用、链接、水平线等。
 *
 * @example
 * ```ts
 * const parser = new MarkdownParser();
 * const renderer = new MarkdownRenderer();
 * const ast = parser.parse("**Hello** *world*");
 * const spans = renderer.render(ast);
 * ```
 *
 * @module
 */

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "../widgets/text-span.js";
import type { MarkdownNode } from "./markdown-parser.js";
import { defaultMarkdownTheme, type MarkdownTheme } from "./markdown-theme.js";
import { SyntaxHighlighter, type SyntaxTheme } from "./syntax-highlight.js";

/**
 * Markdown 渲染配置选项。
 */
export interface MarkdownRendererOptions {
  /** 语法高亮主题（不传则使用默认深色主题） */
  syntaxTheme?: SyntaxTheme;
  /** Markdown 渲染主题（不传则使用默认主题） */
  markdownTheme?: MarkdownTheme;
}

/**
 * Markdown AST → TextSpan 渲染器。
 *
 * 递归遍历 AST 节点，按节点类型应用对应的样式，生成 TextSpan Widget 树。
 */
export class MarkdownRenderer {
  /** 语法高亮器 */
  private readonly _highlighter: SyntaxHighlighter;
  /** Markdown 渲染主题 */
  private readonly _theme: MarkdownTheme;

  /**
   * 创建渲染器实例。
   *
   * @param options - 渲染配置
   */
  constructor(options?: MarkdownRendererOptions) {
    this._theme = options?.markdownTheme ?? defaultMarkdownTheme();
    const syntaxTheme = options?.syntaxTheme ?? this._theme.syntaxTheme;
    this._highlighter = new SyntaxHighlighter(syntaxTheme);
  }

  /**
   * 将 AST 节点数组渲染为 TextSpan 数组。
   *
   * @param nodes - AST 节点数组
   * @returns TextSpan 数组
   */
  render(nodes: MarkdownNode[]): TextSpan[] {
    return this._renderNodes(nodes, undefined);
  }

  /**
   * 流式渲染 — 与 render 相同，但跳过尾部的空段落。
   *
   * 流式生成时最后一个段落可能不完整，此方法避免渲染空的尾部段落。
   *
   * @param nodes - AST 节点数组
   * @returns TextSpan 数组
   */
  renderStreaming(nodes: MarkdownNode[]): TextSpan[] {
    // 过滤掉尾部空段落
    const filtered = [...nodes];
    while (filtered.length > 0) {
      const last = filtered[filtered.length - 1];
      if (last.type === "paragraph" && (!last.children || last.children.length === 0)) {
        filtered.pop();
      } else {
        break;
      }
    }
    return this._renderNodes(filtered, undefined);
  }

  /**
   * 递归渲染节点列表。
   */
  private _renderNodes(
    nodes: MarkdownNode[],
    parentStyle: TextStyle | undefined,
    nested: boolean = false,
  ): TextSpan[] {
    const spans: TextSpan[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeSpans = this._renderNode(node, parentStyle);
      spans.push(...nodeSpans);

      // 块级元素间添加换行：嵌套上下文（如 blockquote）使用单换行，顶层使用双换行
      // 逆向: amp 使用 hasBlankLineBetween(prev, next) 检查源码位置来决定是否插入空行
      // 我们没有位置数据，在嵌套上下文中，parser 已经插入了 text("\n") 节点作为分隔，
      // 所以仅在下一个节点不是纯空白文本节点时才插入分隔符
      if (this._isBlock(node) && i < nodes.length - 1) {
        if (nested) {
          const next = nodes[i + 1];
          // 如果下一个节点是纯空白文本，跳过分隔符（parser 已提供换行）
          if (!(next.type === "text" && next.value && /^\s*$/.test(next.value))) {
            spans.push(new TextSpan({ text: "\n" }));
          }
        } else {
          spans.push(new TextSpan({ text: "\n\n" }));
        }
      }
    }
    return spans;
  }

  /**
   * 渲染单个节点。
   */
  private _renderNode(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    switch (node.type) {
      case "text":
        return [new TextSpan({ text: node.value ?? "", style: parentStyle })];

      case "paragraph":
        return [
          new TextSpan({
            children: this._renderChildren(node, parentStyle),
          }),
        ];

      case "heading":
        return this._renderHeading(node, parentStyle);

      case "strong":
        return this._renderStrong(node, parentStyle);

      case "emphasis":
        return this._renderEmphasis(node, parentStyle);

      case "delete":
        return this._renderDelete(node, parentStyle);

      case "codeSpan":
        return this._renderCodeSpan(node);

      case "code":
        return this._renderCodeBlock(node);

      case "list":
        return this._renderList(node, parentStyle, 0);

      case "listItem":
        return this._renderListItem(node, parentStyle, false, 0, 0);

      case "blockquote":
        return this._renderBlockquote(node, parentStyle);

      case "link":
        return this._renderLink(node);

      case "image":
        return this._renderImage(node);

      case "table":
        return this._renderTable(node);

      case "thematicBreak":
        return [new TextSpan({ text: "───────────────────────────────────" })];

      case "lineBreak":
        return [new TextSpan({ text: "\n" })];

      case "html":
        // 安全措施 (T-06-10): 忽略 HTML 节点，不渲染任何嵌入 HTML
        return [];

      default:
        return node.value
          ? [new TextSpan({ text: node.value })]
          : this._renderChildren(node, parentStyle);
    }
  }

  /**
   * 渲染子节点。
   */
  private _renderChildren(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    if (!node.children) return [];
    const spans: TextSpan[] = [];
    for (const child of node.children) {
      spans.push(...this._renderNode(child, parentStyle));
    }
    return spans;
  }

  /**
   * 渲染标题节点。
   */
  private _renderHeading(node: MarkdownNode, _parentStyle: TextStyle | undefined): TextSpan[] {
    const level = node.level ?? 1;
    const idx = Math.min(level, 6) - 1;
    const color = this._theme.headingColors[idx];
    const bold = level <= this._theme.headingBoldLevels;
    const style = new TextStyle({ bold, foreground: color });
    const prefix = "#".repeat(level) + " ";
    const children = this._renderChildren(node, style);
    return [
      new TextSpan({
        style,
        children: [new TextSpan({ text: prefix }), ...children],
      }),
    ];
  }

  /**
   * 渲染粗体节点。
   */
  private _renderStrong(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    const style = parentStyle
      ? parentStyle.copyWith({ bold: true })
      : new TextStyle({ bold: true });
    return [
      new TextSpan({
        style,
        children: this._renderChildren(node, style),
      }),
    ];
  }

  /**
   * 渲染斜体节点。
   */
  private _renderEmphasis(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    const style = parentStyle
      ? parentStyle.copyWith({ italic: true })
      : new TextStyle({ italic: true });
    return [
      new TextSpan({
        style,
        children: this._renderChildren(node, style),
      }),
    ];
  }

  /**
   * 渲染删除线节点。
   */
  private _renderDelete(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    const style = parentStyle
      ? parentStyle.copyWith({ strikethrough: true })
      : new TextStyle({ strikethrough: true });
    return [
      new TextSpan({
        style,
        children: this._renderChildren(node, style),
      }),
    ];
  }

  /**
   * 渲染内联代码。
   */
  private _renderCodeSpan(node: MarkdownNode): TextSpan[] {
    const style = this._theme.inlineCode.copyWith({
      background: Color.indexed(236),
    });
    return [new TextSpan({ text: node.value ?? "", style })];
  }

  /**
   * 渲染代码块（带语法高亮）。
   */
  private _renderCodeBlock(node: MarkdownNode): TextSpan[] {
    const code = node.value ?? "";
    const lang = node.lang ?? "";

    const bgStyle = new TextStyle({ background: Color.indexed(236) });

    if (lang) {
      // 带语法高亮
      const highlighted = this._highlighter.highlight(code, lang);
      // 为每个 span 添加背景色
      const styledSpans = highlighted.map(
        (span) =>
          new TextSpan({
            text: span.text,
            style: span.style ? span.style.copyWith({ background: Color.indexed(236) }) : bgStyle,
          }),
      );
      return [new TextSpan({ style: bgStyle, children: styledSpans })];
    } else {
      // 无语言标记，纯背景色
      return [new TextSpan({ text: code, style: bgStyle })];
    }
  }

  /**
   * 渲染列表。
   */
  private _renderList(
    node: MarkdownNode,
    parentStyle: TextStyle | undefined,
    depth: number = 0,
  ): TextSpan[] {
    const ordered = node.ordered ?? false;
    const spans: TextSpan[] = [];
    const items = node.children ?? [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      spans.push(...this._renderListItem(item, parentStyle, ordered, i, depth));
      if (i < items.length - 1) {
        spans.push(new TextSpan({ text: "\n" }));
      }
    }

    return spans;
  }

  /**
   * 渲染列表项。
   */
  private _renderListItem(
    node: MarkdownNode,
    parentStyle: TextStyle | undefined,
    ordered: boolean,
    index: number,
    depth: number = 0,
  ): TextSpan[] {
    const indent = "  ".repeat(depth);
    let prefix: string;
    if (node.checked === true) {
      prefix = `${indent}[✓] `;
    } else if (node.checked === false) {
      prefix = `${indent}[ ] `;
    } else if (ordered) {
      prefix = `${indent}${index + 1}. `;
    } else {
      prefix = `${indent}• `;
    }

    const resultSpans: TextSpan[] = [new TextSpan({ text: prefix })];

    for (const child of node.children ?? []) {
      if (child.type === "list") {
        resultSpans.push(new TextSpan({ text: "\n" }));
        resultSpans.push(...this._renderList(child, parentStyle, depth + 1));
      } else if (child.type === "paragraph") {
        resultSpans.push(...this._renderChildren(child, parentStyle));
      } else {
        resultSpans.push(...this._renderNode(child, parentStyle));
      }
    }

    return [new TextSpan({ children: resultSpans })];
  }

  /**
   * 渲染块引用。
   *
   * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1402-1420
   * amp 使用 left padding 2, 左边框装饰（colored │），inner padding 1，内容不 dim。
   */
  private _renderBlockquote(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    const borderStyle = new TextStyle({ foreground: this._theme.blockquoteBorder });
    // 逆向: amp blockquote 内部不插入额外空行，使用 nested=true 让段落间使用单换行
    const children = node.children ? this._renderNodes(node.children, parentStyle, true) : [];

    return [
      new TextSpan({
        children: [
          new TextSpan({ text: "  " }),
          new TextSpan({ text: "│", style: borderStyle }),
          new TextSpan({ text: " " }),
          ...children,
        ],
      }),
    ];
  }

  /**
   * 渲染链接。
   */
  private _renderLink(node: MarkdownNode): TextSpan[] {
    const url = node.url ?? "";
    const linkStyle = this._theme.link;
    const children = this._renderChildren(node, linkStyle);
    return [
      new TextSpan({
        style: linkStyle,
        url,
        children,
      }),
    ];
  }

  /**
   * 渲染图片节点。
   *
   * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1619-1625
   * amp 中图片渲染为 `[Image: altText]`，样式为 link.copyWith({ italic: true })。
   */
  private _renderImage(node: MarkdownNode): TextSpan[] {
    const alt = node.alt ?? "image";
    const style = this._theme.link.copyWith({ italic: true });
    return [new TextSpan({ text: `[Image: ${alt}]`, style, url: node.url })];
  }

  /**
   * 渲染表格。
   *
   * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1544-1590
   * amp 使用 Unicode box-drawing 圆角边框（╭╮╰╯├┤┬┴┼─│），
   * 列宽按最大内容宽度归一化，表头行粗体，支持 node.align 列对齐。
   */
  private _renderTable(node: MarkdownNode): TextSpan[] {
    const rows = node.children ?? [];
    if (rows.length === 0) return [];

    const borderStyle = new TextStyle({ foreground: this._theme.tableBorder });
    const headerStyle = new TextStyle({ bold: true });
    const aligns = node.align ?? [];

    // Measure column widths
    const numCols = Math.max(...rows.map((r) => (r.children ?? []).length));
    const colWidths: number[] = new Array(numCols).fill(0);

    const cellContents: string[][] = [];
    for (const row of rows) {
      const cells = row.children ?? [];
      const rowTexts: string[] = [];
      for (let j = 0; j < numCols; j++) {
        const cell = cells[j];
        const text = cell ? this._collectPlainText(cell) : "";
        rowTexts.push(text);
        colWidths[j] = Math.max(colWidths[j], text.length);
      }
      cellContents.push(rowTexts);
    }

    // Ensure minimum width of 3 per column
    for (let j = 0; j < numCols; j++) {
      colWidths[j] = Math.max(colWidths[j], 3);
    }

    const spans: TextSpan[] = [];

    // Top border: ╭───┬───╮
    const topBorder = "╭" + colWidths.map((w) => "─".repeat(w + 2)).join("┬") + "╮";
    spans.push(new TextSpan({ text: topBorder, style: borderStyle }));
    spans.push(new TextSpan({ text: "\n" }));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.children ?? [];
      const isHeader = i === 0;

      // Data row: │ cell │ cell │
      const rowChildren: TextSpan[] = [];
      rowChildren.push(new TextSpan({ text: "│ ", style: borderStyle }));

      for (let j = 0; j < numCols; j++) {
        const cell = cells[j];
        const cellSpans = cell
          ? this._renderChildren(cell, isHeader ? headerStyle : undefined)
          : [];
        const plainText = cellContents[i][j];
        const padding = colWidths[j] - plainText.length;
        const align = aligns[j] ?? "left";

        let leftPad = 0;
        let rightPad = padding;
        if (align === "right") {
          leftPad = padding;
          rightPad = 0;
        } else if (align === "center") {
          leftPad = Math.floor(padding / 2);
          rightPad = padding - leftPad;
        }

        if (leftPad > 0) rowChildren.push(new TextSpan({ text: " ".repeat(leftPad) }));
        if (isHeader) {
          rowChildren.push(new TextSpan({ style: headerStyle, children: cellSpans }));
        } else {
          rowChildren.push(...cellSpans);
        }
        if (rightPad > 0) rowChildren.push(new TextSpan({ text: " ".repeat(rightPad) }));

        rowChildren.push(
          new TextSpan({
            text: j < numCols - 1 ? " │ " : " │",
            style: borderStyle,
          }),
        );
      }
      spans.push(new TextSpan({ children: rowChildren }));
      spans.push(new TextSpan({ text: "\n" }));

      // Header separator: ├───┼───┤
      if (isHeader) {
        const sep = "├" + colWidths.map((w) => "─".repeat(w + 2)).join("┼") + "┤";
        spans.push(new TextSpan({ text: sep, style: borderStyle }));
        spans.push(new TextSpan({ text: "\n" }));
      }
    }

    // Bottom border: ╰───┴───╯
    const bottomBorder = "╰" + colWidths.map((w) => "─".repeat(w + 2)).join("┴") + "╯";
    spans.push(new TextSpan({ text: bottomBorder, style: borderStyle }));

    return spans;
  }

  /**
   * 递归收集节点的纯文本内容（用于表格列宽测量）。
   */
  private _collectPlainText(node: MarkdownNode): string {
    if (node.value) return node.value;
    if (!node.children) return "";
    return node.children.map((c) => this._collectPlainText(c)).join("");
  }

  /**
   * 判断是否块级元素。
   */
  private _isBlock(node: MarkdownNode): boolean {
    return [
      "paragraph",
      "heading",
      "code",
      "list",
      "table",
      "blockquote",
      "thematicBreak",
    ].includes(node.type);
  }
}
