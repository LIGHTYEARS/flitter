/**
 * Markdown 渲染主题配置。
 *
 * 定义 Markdown 各元素的颜色和样式配置，允许自定义渲染外观。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1282-1328
 * amp 中通过 styleScheme 对象传递 inlineCode / codeBlock / tableBorder / link / syntaxHighlight 等样式。
 * 本接口将这些配置统一为 MarkdownTheme 类型。
 *
 * @module
 */

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { SyntaxHighlighter, type SyntaxTheme } from "./syntax-highlight.js";

/**
 * Markdown 渲染主题接口。
 *
 * 允许对所有 Markdown 渲染元素进行主题化配置。
 */
export interface MarkdownTheme {
  /** h1-h6 的前景色 */
  headingColors: [Color, Color, Color, Color, Color, Color];
  /** 前 N 级标题使用粗体（1-6） */
  headingBoldLevels: number;
  /** 内联代码样式 */
  inlineCode: TextStyle;
  /** 代码块前景色 */
  codeBlockForeground: Color;
  /** 链接样式 */
  link: TextStyle;
  /** 块引用边框颜色 */
  blockquoteBorder: Color;
  /** 表格边框颜色 */
  tableBorder: Color;
  /** 语法高亮主题 */
  syntaxTheme: SyntaxTheme;
}

/**
 * 创建默认 Markdown 渲染主题。
 *
 * 配色与 amp-cli 默认行为对齐。
 *
 * @returns 默认主题配置
 */
export function defaultMarkdownTheme(): MarkdownTheme {
  return {
    headingColors: [
      Color.blue(), // h1
      Color.cyan(), // h2
      Color.blue(), // h3
      Color.cyan(), // h4
      Color.default(), // h5
      Color.default(), // h6
    ],
    headingBoldLevels: 2,
    inlineCode: new TextStyle({ foreground: Color.yellow(), bold: true }),
    codeBlockForeground: Color.default(),
    link: new TextStyle({ foreground: Color.blue(), underline: true }),
    blockquoteBorder: Color.default(),
    tableBorder: Color.indexed(8),
    syntaxTheme: SyntaxHighlighter.defaultTheme(),
  };
}
