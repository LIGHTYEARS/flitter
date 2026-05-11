/**
 * Markdown 解析与渲染模块。
 *
 * 提供 Markdown → mdast AST → Widget 树的完整管线。
 *
 * @module
 */

// 新 API
export { parse } from "./markdown-parser.js";
export { MarkdownView, type MarkdownViewProps } from "./markdown-view.js";
export { buildBlocks, hasBlankLineBetween, type BlockContext } from "./markdown-block-builder.js";
export { buildInline, generateHyperlinkId, type InlineContext } from "./markdown-inline-builder.js";
export { MarkdownThemeWidget, defaultMarkdownTheme, type MarkdownTheme } from "./markdown-theme.js";
export { SyntaxHighlighter, syntaxColorsToTheme, type SyntaxTheme } from "./syntax-highlight.js";
export * from "./prism-languages.js";


