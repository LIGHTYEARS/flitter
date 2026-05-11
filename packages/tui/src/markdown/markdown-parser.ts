/**
 * Markdown 解析器 — unified + remark-parse + remark-gfm。
 *
 * 输出标准 mdast AST（带 position 信息），供 MarkdownView Widget 消费。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1261-1300
 *   amp 使用 unified().use(remarkParse).use(remarkGfm) 解析，本模块完全对齐。
 *
 * @module
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

/**
 * unified 处理器单例。
 *
 * 仅执行 parse 阶段（不 run/stringify），输出 mdast Root。
 */
const processor = unified().use(remarkParse).use(remarkGfm);

/**
 * 将 Markdown 文本解析为 mdast AST。
 *
 * @param markdown - Markdown 源文本
 * @returns mdast Root 节点（含 position 信息）
 *
 * @example
 * ```ts
 * const root = parse("# Hello\n\nParagraph");
 * // root.type === "root"
 * // root.children[0].type === "heading"
 * // root.children[0].position !== undefined
 * ```
 */
export function parse(markdown: string): Root {
  return processor.parse(markdown) as Root;
}


