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
import { SyntaxHighlighter, type SyntaxTheme } from "./syntax-highlight.js";

/**
 * Markdown 渲染配置选项。
 */
export interface MarkdownRendererOptions {
  /** 语法高亮主题（不传则使用默认深色主题） */
  syntaxTheme?: SyntaxTheme;
}

/**
 * Markdown AST → TextSpan 渲染器。
 *
 * 递归遍历 AST 节点，按节点类型应用对应的样式，生成 TextSpan Widget 树。
 */
export class MarkdownRenderer {
  /** 语法高亮器 */
  private readonly _highlighter: SyntaxHighlighter;

  /**
   * 创建渲染器实例。
   *
   * @param options - 渲染配置
   */
  constructor(options?: MarkdownRendererOptions) {
    const theme = options?.syntaxTheme ?? SyntaxHighlighter.defaultTheme();
    this._highlighter = new SyntaxHighlighter(theme);
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
  private _renderNodes(nodes: MarkdownNode[], parentStyle: TextStyle | undefined): TextSpan[] {
    const spans: TextSpan[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeSpans = this._renderNode(node, parentStyle);
      spans.push(...nodeSpans);

      // 块级元素间添加换行
      if (this._isBlock(node) && i < nodes.length - 1) {
        spans.push(new TextSpan({ text: "\n\n" }));
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
        return this._renderList(node, parentStyle);

      case "listItem":
        return this._renderListItem(node, parentStyle, false, 0);

      case "blockquote":
        return this._renderBlockquote(node, parentStyle);

      case "link":
        return this._renderLink(node);

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
  private _renderHeading(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    const level = node.level ?? 1;
    const prefix = "#".repeat(level) + " ";
    const boldStyle = new TextStyle({ bold: true });
    const children = this._renderChildren(node, boldStyle);
    return [
      new TextSpan({
        style: boldStyle,
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
    const style = new TextStyle({
      foreground: Color.yellow(),
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
  private _renderList(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    const ordered = node.ordered ?? false;
    const spans: TextSpan[] = [];
    const items = node.children ?? [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      spans.push(...this._renderListItem(item, parentStyle, ordered, i));
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
  ): TextSpan[] {
    let prefix: string;
    if (node.checked === true) {
      prefix = "  [x] ";
    } else if (node.checked === false) {
      prefix = "  [ ] ";
    } else if (ordered) {
      prefix = `  ${index + 1}. `;
    } else {
      prefix = "  - ";
    }

    const children = this._renderChildren(node, parentStyle);

    // 如果 children 中包含嵌套 paragraph，展平
    const flatChildren: TextSpan[] = [];
    for (const child of children) {
      if (child.children && !child.text && !child.style) {
        // 透明 paragraph wrapper -> 展平
        flatChildren.push(...(child.children ?? []));
      } else {
        flatChildren.push(child);
      }
    }

    return [
      new TextSpan({
        children: [new TextSpan({ text: prefix }), ...flatChildren],
      }),
    ];
  }

  /**
   * 渲染块引用。
   */
  private _renderBlockquote(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
    const dimStyle = new TextStyle({ dim: true });
    const children = this._renderChildren(node, parentStyle);

    // 添加 "│ " 前缀
    return [
      new TextSpan({
        children: [new TextSpan({ text: "│ ", style: dimStyle }), ...children],
      }),
    ];
  }

  /**
   * 渲染链接。
   */
  private _renderLink(node: MarkdownNode): TextSpan[] {
    const linkStyle = new TextStyle({
      underline: true,
      foreground: Color.blue(),
    });
    const children = this._renderChildren(node, linkStyle);
    const url = node.url ?? "";

    return [
      new TextSpan({
        style: linkStyle,
        children: [...children, new TextSpan({ text: ` (${url})` })],
      }),
    ];
  }

  /**
   * 渲染表格。
   */
  private _renderTable(node: MarkdownNode): TextSpan[] {
    const rows = node.children ?? [];
    if (rows.length === 0) return [];

    const borderStyle = new TextStyle({
      foreground: Color.indexed(8),
    });

    const spans: TextSpan[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.children ?? [];
      const cellTexts: TextSpan[][] = cells.map((cell) => this._renderChildren(cell, undefined));

      // 构建行: │ cell1 │ cell2 │
      const rowChildren: TextSpan[] = [new TextSpan({ text: "│ ", style: borderStyle })];
      for (let j = 0; j < cellTexts.length; j++) {
        rowChildren.push(...cellTexts[j]);
        rowChildren.push(
          new TextSpan({ text: j < cellTexts.length - 1 ? " │ " : " │", style: borderStyle }),
        );
      }
      spans.push(new TextSpan({ children: rowChildren }));

      // 表头后添加分隔线
      if (i === 0) {
        const sep = cells.map(() => "───").join("─┼─");
        spans.push(new TextSpan({ text: "\n├─" + sep + "─┤", style: borderStyle }));
      }

      if (i < rows.length - 1) {
        spans.push(new TextSpan({ text: "\n" }));
      }
    }

    return spans;
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
