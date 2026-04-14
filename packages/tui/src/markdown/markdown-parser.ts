/**
 * Markdown 解析器 — micromark tokens → 中间 AST。
 *
 * 使用 micromark + GFM 扩展将 Markdown 文本解析为自定义中间 AST 节点树，
 * 供 {@link MarkdownRenderer} 转换为 TextSpan Widget 树。
 *
 * 解析策略：调用 micromark 生成 HTML，再通过简单的状态机将 HTML 转为自定义 AST。
 * 这比直接操作 micromark events 更可靠，因为 micromark 的 HTML 输出经过完整验证。
 *
 * @example
 * ```ts
 * const parser = new MarkdownParser();
 * const nodes = parser.parse("**Hello** *world*");
 * // [{ type: 'paragraph', children: [
 * //   { type: 'strong', children: [{ type: 'text', value: 'Hello' }] },
 * //   { type: 'text', value: ' ' },
 * //   { type: 'emphasis', children: [{ type: 'text', value: 'world' }] },
 * // ] }]
 * ```
 *
 * @module
 */

import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

/**
 * AST 节点类型枚举。
 *
 * 覆盖标准 Markdown 元素和 GFM 扩展。
 */
export type MarkdownNodeType =
  | "document"
  | "paragraph"
  | "heading"
  | "strong"
  | "emphasis"
  | "delete"
  | "code"
  | "codeSpan"
  | "link"
  | "list"
  | "listItem"
  | "table"
  | "tableRow"
  | "tableCell"
  | "blockquote"
  | "thematicBreak"
  | "lineBreak"
  | "text"
  | "html";

/**
 * Markdown AST 节点。
 *
 * 通用节点结构，通过 type 区分不同元素，
 * 特殊属性仅在对应类型节点上有意义。
 */
export interface MarkdownNode {
  /** 节点类型 */
  type: MarkdownNodeType;
  /** text/code/html 节点的文本值 */
  value?: string;
  /** 子节点列表 */
  children?: MarkdownNode[];
  /** code 节点的语言标记 */
  lang?: string;
  /** heading 级别 (1-6) */
  level?: number;
  /** list 是否有序 */
  ordered?: boolean;
  /** listItem 任务列表勾选状态 (null 表示非任务项) */
  checked?: boolean | null;
  /** link URL */
  url?: string;
  /** link title */
  title?: string;
  /** table 列对齐方式 */
  align?: ("left" | "center" | "right" | null)[];
}

/**
 * Markdown 解析器。
 *
 * 使用 micromark + GFM 扩展解析 Markdown 文本到自定义 AST。
 * 支持增量追加解析（appendText）。
 */
export class MarkdownParser {
  /** 已累积的文本 */
  private _buffer = "";

  /**
   * 解析 Markdown 文本为 AST 节点数组。
   *
   * @param markdown - Markdown 文本
   * @returns AST 节点数组（顶层块级元素）
   */
  parse(markdown: string): MarkdownNode[] {
    this._buffer = markdown;
    return this._parseInternal(markdown);
  }

  /**
   * 增量追加文本并重新解析。
   *
   * 将新文本追加到已有缓冲区并重新解析全文。
   * micromark 不支持真正的增量解析，此方法提供语义上的增量 API。
   *
   * @param text - 追加的文本
   * @returns 完整的 AST 节点数组
   */
  appendText(text: string): MarkdownNode[] {
    this._buffer += text;
    return this._parseInternal(this._buffer);
  }

  /**
   * 内部解析实现。
   *
   * 调用 micromark 生成 HTML，再通过状态机转为自定义 AST。
   */
  private _parseInternal(markdown: string): MarkdownNode[] {
    if (!markdown.trim()) return [];

    const html = micromark(markdown, {
      extensions: [gfm()],
      htmlExtensions: [gfmHtml()],
      allowDangerousHtml: true,
    });

    return this._htmlToAst(html);
  }

  /**
   * 将 micromark 输出的 HTML 转换为自定义 AST。
   *
   * 使用简单的正则+状态机解析 HTML 标签，映射到 MarkdownNode。
   */
  private _htmlToAst(html: string): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];
    const stack: MarkdownNode[] = [];

    // 按标签切分 HTML
    const tokenRegex = /(<\/?\w[^>]*\/?>)|([^<]+)/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(html)) !== null) {
      const [, tag, text] = match;

      if (text) {
        // 纯文本
        const decoded = this._decodeHtmlEntities(text);
        if (decoded) {
          // 过滤掉标签间的纯空白文本（列表/表格中的换行缩进）
          const parent = stack[stack.length - 1];
          const isStructural =
            parent &&
            (parent.type === "list" || parent.type === "table" || parent.type === "tableRow");
          if (isStructural && !decoded.trim()) {
            continue;
          }
          const textNode: MarkdownNode = { type: "text", value: decoded };
          this._pushChild(stack, nodes, textNode);
        }
      } else if (tag) {
        if (tag.startsWith("</")) {
          // 关闭标签
          this._handleCloseTag(tag, stack, nodes);
        } else {
          // 开放标签
          this._handleOpenTag(tag, stack, nodes);
        }
      }
    }

    return nodes;
  }

  /**
   * 处理 HTML 开放标签，映射为 AST 节点。
   */
  private _handleOpenTag(tag: string, stack: MarkdownNode[], nodes: MarkdownNode[]): void {
    const tagName = this._getTagName(tag);

    switch (tagName) {
      case "p": {
        const node: MarkdownNode = { type: "paragraph", children: [] };
        stack.push(node);
        break;
      }
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = parseInt(tagName[1], 10);
        const node: MarkdownNode = { type: "heading", level, children: [] };
        stack.push(node);
        break;
      }
      case "strong": {
        const node: MarkdownNode = { type: "strong", children: [] };
        stack.push(node);
        break;
      }
      case "em": {
        const node: MarkdownNode = { type: "emphasis", children: [] };
        stack.push(node);
        break;
      }
      case "del": {
        const node: MarkdownNode = { type: "delete", children: [] };
        stack.push(node);
        break;
      }
      case "code": {
        // 如果父节点是 pre，这是代码块 → 已在 pre 中处理
        const parent = stack[stack.length - 1];
        if (parent && parent.type === "code") {
          // code 在 pre 内：提取 lang
          const langMatch = tag.match(/class="language-(\w+)"/);
          if (langMatch) {
            parent.lang = langMatch[1];
          }
          // code 内容将作为 text 添加到 pre/code 节点
        } else {
          // inline code: 收集内容直到 </code>
          const node: MarkdownNode = { type: "codeSpan", value: "" };
          stack.push(node);
        }
        break;
      }
      case "pre": {
        const node: MarkdownNode = { type: "code", value: "" };
        stack.push(node);
        break;
      }
      case "ul": {
        const node: MarkdownNode = {
          type: "list",
          ordered: false,
          children: [],
        };
        stack.push(node);
        break;
      }
      case "ol": {
        const node: MarkdownNode = {
          type: "list",
          ordered: true,
          children: [],
        };
        stack.push(node);
        break;
      }
      case "li": {
        const node: MarkdownNode = {
          type: "listItem",
          children: [],
          checked: null,
        };
        // 检查任务列表 checkbox
        if (tag.includes('type="checkbox"') || tag.includes("type='checkbox'")) {
          // GFM 任务列表: <li><input type="checkbox" ... />
          // disabled checked 或 disabled
        }
        stack.push(node);
        break;
      }
      case "input": {
        // GFM 任务列表 checkbox
        if (tag.includes("checkbox")) {
          const parent = stack[stack.length - 1];
          if (parent && parent.type === "listItem") {
            parent.checked = tag.includes("checked") ? true : false;
          }
        }
        break;
      }
      case "table": {
        const node: MarkdownNode = { type: "table", children: [] };
        stack.push(node);
        break;
      }
      case "thead":
      case "tbody": {
        // 透明容器，不创建节点
        break;
      }
      case "tr": {
        const node: MarkdownNode = { type: "tableRow", children: [] };
        stack.push(node);
        break;
      }
      case "th":
      case "td": {
        const node: MarkdownNode = { type: "tableCell", children: [] };
        stack.push(node);
        break;
      }
      case "blockquote": {
        const node: MarkdownNode = { type: "blockquote", children: [] };
        stack.push(node);
        break;
      }
      case "hr": {
        // 自关闭标签
        const node: MarkdownNode = { type: "thematicBreak" };
        this._pushChild(stack, nodes, node);
        break;
      }
      case "br": {
        const node: MarkdownNode = { type: "lineBreak" };
        this._pushChild(stack, nodes, node);
        break;
      }
      case "a": {
        const href = this._getAttr(tag, "href");
        const title = this._getAttr(tag, "title");
        const node: MarkdownNode = {
          type: "link",
          url: href ?? "",
          title: title ?? undefined,
          children: [],
        };
        stack.push(node);
        break;
      }
      default: {
        // 其他 HTML 标签原样保留为 html 节点
        if (!this._isSelfClosing(tag)) {
          const node: MarkdownNode = { type: "html", value: tag };
          stack.push(node);
        } else {
          const node: MarkdownNode = { type: "html", value: tag };
          this._pushChild(stack, nodes, node);
        }
        break;
      }
    }
  }

  /**
   * 处理 HTML 关闭标签，从栈中弹出节点。
   */
  private _handleCloseTag(tag: string, stack: MarkdownNode[], nodes: MarkdownNode[]): void {
    const tagName = this._getTagName(tag);

    // 透明容器直接忽略
    if (tagName === "thead" || tagName === "tbody") return;

    // 从栈中弹出对应节点
    const node = stack.pop();
    if (!node) return;

    // code 在 pre 内关闭时特殊处理
    if (tagName === "code" && stack.length > 0 && stack[stack.length - 1].type === "code") {
      // code 标签在 pre 内，内容已添加到 pre/code 节点
      // 将 code 的信息合并到 pre 节点
      const preNode = stack[stack.length - 1];
      if (node.type === "codeSpan") {
        // code 在 pre 内, 合并 value
        preNode.value = (preNode.value ?? "") + (node.value ?? "");
      }
      return;
    }

    // codeSpan 关闭时不需要 children
    if (node.type === "codeSpan") {
      delete node.children;
    }

    // code 块（pre）关闭时，清理 value 中的尾部换行
    if (node.type === "code" && node.value) {
      // 移除尾部换行
      node.value = node.value.replace(/\n$/, "");
      delete node.children;
    }

    this._pushChild(stack, nodes, node);
  }

  /**
   * 将节点添加到栈顶的 children 或顶层数组。
   */
  private _pushChild(stack: MarkdownNode[], nodes: MarkdownNode[], node: MarkdownNode): void {
    const parent = stack[stack.length - 1];
    if (parent) {
      // 特殊处理: code 块内的文本 → 追加到 value
      if (parent.type === "code" || parent.type === "codeSpan") {
        parent.value = (parent.value ?? "") + (node.value ?? "");
        return;
      }
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      nodes.push(node);
    }
  }

  /**
   * 从标签中提取标签名。
   */
  private _getTagName(tag: string): string {
    const m = tag.match(/<\/?(\w+)/);
    return m ? m[1].toLowerCase() : "";
  }

  /**
   * 从标签中提取属性值。
   */
  private _getAttr(tag: string, attr: string): string | null {
    const re = new RegExp(`${attr}="([^"]*)"`, "i");
    const m = tag.match(re);
    return m ? m[1] : null;
  }

  /**
   * 判断是否自关闭标签。
   */
  private _isSelfClosing(tag: string): boolean {
    return tag.endsWith("/>") || /^<(hr|br|img|input)\b/i.test(tag);
  }

  /**
   * 解码 HTML 实体。
   */
  private _decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  }
}
