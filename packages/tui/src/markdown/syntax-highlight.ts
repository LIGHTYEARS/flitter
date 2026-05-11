/**
 * 语法高亮器 — 基于 Prism.js 的 token 级高亮。
 *
 * 将代码字符串按 token 类型（关键字、字符串、数字、注释等）分割，
 * 每个 token 对应一个带样式的 {@link TextSpan}。
 *
 * 使用 Prism.js 进行语言感知的词法分析（与原版 Amp CLI 一致）。
 * 当 Prism 无法处理时，回退到简单正则分词。
 *
 * 逆向: modules/2460_unknown_tE0.js — Prism tokenization bridge
 * 逆向: modules/0480_unknown_vm0.js — token type → color mapping
 * 逆向: modules/0479_unknown_$m0.js — language name normalization
 *
 * @example
 * ```ts
 * const theme = SyntaxHighlighter.defaultTheme();
 * const hl = new SyntaxHighlighter(theme);
 * const spans = hl.highlight("const x = 1;", "typescript");
 * // [TextSpan{text:"const", style:keyword}, TextSpan{text:" "}, ...]
 * ```
 *
 * @module
 */

import Prism from "prismjs";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-dart.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-kotlin.js";
import "prismjs/components/prism-markdown.js";
import "prismjs/components/prism-php.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-ruby.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-swift.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-yaml.js";

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { SyntaxHighlightColors } from "../theme/palette.js";
import { TextSpan } from "../widgets/text-span.js";
import { normalizeLangName } from "./prism-languages.js";

/**
 * 语法高亮主题配色。
 *
 * 每个 token 类型对应一个 TextStyle。
 */
export interface SyntaxTheme {
  /** 关键字: const, let, var, if, else, for, while, return, function, class... */
  keyword: TextStyle;
  /** 字符串: "...", '...', `...` */
  string: TextStyle;
  /** 数字字面量 */
  number: TextStyle;
  /** 注释: // ..., /* ... *\/ */
  comment: TextStyle;
  /** 函数名 */
  function: TextStyle;
  /** 变量名 */
  variable: TextStyle;
  /** 类型名 (大写开头) */
  type: TextStyle;
  /** 运算符: =, +, -, *, /, ==, === */
  operator: TextStyle;
  /** 标点: {, }, (, ), [, ], ;, , */
  punctuation: TextStyle;
  /** 默认/其他 */
  plain: TextStyle;
}

/**
 * 语法高亮 token。
 *
 * 内部使用，表示一个匹配到的代码片段及其类型。
 */
interface HighlightToken {
  /** token 文本 */
  text: string;
  /** token 类型 */
  type: keyof SyntaxTheme;
}

/** 常见编程语言关键字集合 (用于正则回退) */
const KEYWORDS = new Set([
  // JS/TS
  "const",
  "let",
  "var",
  "if",
  "else",
  "for",
  "while",
  "do",
  "return",
  "function",
  "class",
  "new",
  "this",
  "super",
  "import",
  "export",
  "from",
  "default",
  "async",
  "await",
  "try",
  "catch",
  "finally",
  "throw",
  "typeof",
  "instanceof",
  "in",
  "of",
  "switch",
  "case",
  "break",
  "continue",
  "void",
  "delete",
  "yield",
  "true",
  "false",
  "null",
  "undefined",
  // Python
  "def",
  "lambda",
  "with",
  "as",
  "pass",
  "raise",
  "except",
  "print",
  "self",
  "None",
  "True",
  "False",
  "and",
  "or",
  "not",
  "elif",
  "is",
  // Rust/Go
  "fn",
  "pub",
  "mod",
  "use",
  "impl",
  "trait",
  "struct",
  "enum",
  "match",
  "mut",
  "ref",
  "type",
  "interface",
  "package",
  "func",
  "go",
  "defer",
  "chan",
  "select",
  "map",
  "range",
]);

/**
 * 语法高亮器。
 *
 * 使用 Prism.js 进行语言感知的词法分析。
 * 当 Prism 无法处理时回退到正则分词。
 *
 * 逆向: modules/2460_unknown_tE0.js — tE0() tokenization entry point
 */
export class SyntaxHighlighter {
  /** 高亮主题 */
  private readonly _theme: SyntaxTheme;

  /**
   * 创建语法高亮器。
   *
   * @param theme - 高亮主题配色
   */
  constructor(theme: SyntaxTheme) {
    this._theme = theme;
  }

  /**
   * 对代码进行语法高亮。
   *
   * Uses Prism.js for language-aware tokenization. Falls back to regex
   * tokenization if the language grammar is not available.
   *
   * 逆向: modules/2460_unknown_tE0.js — tE0(T, R, a, e, t)
   *   let r = zP.default.languages[R] || zP.default.languages.clike
   *   if (!r) return [new G(T, h)];
   *   try { ... Sv(T, a, `file.${R}`) ... }
   *   catch { return [new G(T, h)]; }
   *
   * @param code - 代码文本
   * @param lang - 语言标识
   * @returns TextSpan 数组，每个 token 对应一个 span
   */
  highlight(code: string, lang: string): TextSpan[] {
    if (!code) {
      return [];
    }

    const normalizedLang = normalizeLangName(lang);

    // "plain" means no language matched — use regex fallback
    if (normalizedLang === "plain") {
      return this._highlightFallback(code);
    }

    // 逆向: tE0 uses `zP.default.languages[R] || zP.default.languages.clike`
    const grammar = Prism.languages[normalizedLang] ?? Prism.languages.clike;

    if (!grammar) {
      return this._highlightFallback(code);
    }

    try {
      const tokens = Prism.tokenize(code, grammar);
      const spans: TextSpan[] = [];
      this._flattenTokens(tokens, spans);
      return spans.length > 0 ? spans : [new TextSpan({ text: code, style: this._theme.plain })];
    } catch {
      return this._highlightFallback(code);
    }
  }

  /**
   * 创建默认高亮主题（深色终端配色）。
   *
   * 配色参考原版 Amp CLI 的 yS.default 主题。
   *
   * @returns 默认 SyntaxTheme
   */
  static defaultTheme(): SyntaxTheme {
    return {
      keyword: new TextStyle({ foreground: Color.blue() }),
      string: new TextStyle({ foreground: Color.green() }),
      number: new TextStyle({ foreground: Color.yellow() }),
      comment: new TextStyle({ foreground: Color.indexed(8), dim: true }),
      function: new TextStyle({ foreground: Color.cyan() }),
      variable: new TextStyle({}),
      type: new TextStyle({ foreground: Color.magenta() }),
      operator: new TextStyle({}),
      punctuation: new TextStyle({}),
      plain: new TextStyle({}),
    };
  }

  /**
   * Recursively flatten Prism.js token tree into TextSpan array.
   *
   * Prism tokens can be nested (e.g., a string token containing escape sequences).
   * This flattens the tree depth-first, applying the outermost token type's style.
   */
  private _flattenTokens(tokens: Array<string | Prism.Token>, spans: TextSpan[]): void {
    for (const token of tokens) {
      if (typeof token === "string") {
        if (token) {
          spans.push(new TextSpan({ text: token, style: this._theme.plain }));
        }
      } else {
        const style = this._mapTokenType(token.type);
        if (typeof token.content === "string") {
          spans.push(new TextSpan({ text: token.content, style }));
        } else if (Array.isArray(token.content)) {
          // For nested tokens, recurse but pass parent style context
          this._flattenTokensWithStyle(token.content as Array<string | Prism.Token>, spans, style);
        } else {
          this._flattenTokensWithStyle([token.content as Prism.Token], spans, style);
        }
      }
    }
  }

  /**
   * Flatten tokens inheriting parent style for plain strings.
   */
  private _flattenTokensWithStyle(
    tokens: Array<string | Prism.Token>,
    spans: TextSpan[],
    parentStyle: TextStyle,
  ): void {
    for (const token of tokens) {
      if (typeof token === "string") {
        if (token) {
          spans.push(new TextSpan({ text: token, style: parentStyle }));
        }
      } else {
        const style = this._mapTokenType(token.type);
        if (typeof token.content === "string") {
          spans.push(new TextSpan({ text: token.content, style }));
        } else if (Array.isArray(token.content)) {
          this._flattenTokensWithStyle(token.content as Array<string | Prism.Token>, spans, style);
        } else {
          this._flattenTokensWithStyle([token.content as Prism.Token], spans, style);
        }
      }
    }
  }

  /**
   * Map Prism.js token type to theme style.
   *
   * 逆向: modules/0480_unknown_vm0.js — vm0(T, R)
   *   switch (T.split(" ")[0]) { ... }
   *
   * Matches amp's exact mapping from token types to theme colors.
   */
  private _mapTokenType(type: string): TextStyle {
    // 逆向: vm0 splits on space and takes first segment
    const baseType = type.split(" ")[0];
    switch (baseType) {
      case "keyword":
      case "important":
      case "atrule":
        return this._theme.keyword;
      case "string":
      case "char":
      case "regex":
      case "url":
      case "selector":
      case "attr-value":
      case "inserted":
        return this._theme.string;
      case "number":
      case "constant":
      case "boolean":
      case "symbol":
        return this._theme.number;
      case "comment":
      case "prolog":
      case "doctype":
      case "cdata":
        return this._theme.comment;
      case "function":
      case "class":
        return this._theme.function;
      case "variable":
      case "property":
      case "attr-name":
      case "class-name":
        return this._theme.variable;
      case "type":
      case "tag":
        return this._theme.type;
      case "operator":
      case "punctuation":
      case "delimiter":
      case "entity":
      case "builtin":
      case "deleted":
        return this._theme.operator;
      default:
        // 逆向: vm0 default case returns R.operator
        return this._theme.operator;
    }
  }

  /**
   * Fallback: regex-based tokenization for unknown languages.
   *
   * Used when Prism grammar is unavailable.
   */
  private _highlightFallback(code: string): TextSpan[] {
    const tokens = this._tokenizeRegex(code);
    return tokens.map(
      (tok) =>
        new TextSpan({
          text: tok.text,
          style: this._theme[tok.type],
        }),
    );
  }

  /**
   * 将代码按 token 切分（正则回退）。
   *
   * 匹配优先级：注释 > 字符串 > 数字 > 关键字/类型/函数 > 运算符 > 标点 > 其他。
   */
  private _tokenizeRegex(code: string): HighlightToken[] {
    const tokens: HighlightToken[] = [];

    // 综合正则：匹配各类 token
    const regex =
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|(["'`])(?:(?!\2|\\).|\\.)*\2|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[a-zA-Z_]\w*\b)|(=>|[=!<>]=?=?|&&|\|\||[+\-*/%&|^~!?:])|([{}()[\];,.])|(\s+)/g;

    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(code)) !== null) {
      // 跳过的字符（不匹配的间隔）
      if (match.index > lastIndex) {
        tokens.push({
          text: code.slice(lastIndex, match.index),
          type: "plain",
        });
      }
      lastIndex = regex.lastIndex;

      const text = match[0];

      if (match[1]) {
        // 注释
        tokens.push({ text, type: "comment" });
      } else if (match[2]) {
        // 字符串（match[2] 是引号字符）
        tokens.push({ text, type: "string" });
      } else if (match[3]) {
        // 数字
        tokens.push({ text, type: "number" });
      } else if (match[4]) {
        // 标识符：关键字 / 类型 / 函数 / 变量
        if (KEYWORDS.has(text)) {
          tokens.push({ text, type: "keyword" });
        } else if (/^[A-Z]/.test(text)) {
          tokens.push({ text, type: "type" });
        } else {
          tokens.push({ text, type: "variable" });
        }
      } else if (match[5]) {
        // 运算符
        tokens.push({ text, type: "operator" });
      } else if (match[6]) {
        // 标点
        tokens.push({ text, type: "punctuation" });
      } else if (match[7]) {
        // 空白
        tokens.push({ text, type: "plain" });
      }
    }

    // 尾部未匹配
    if (lastIndex < code.length) {
      tokens.push({ text: code.slice(lastIndex), type: "plain" });
    }

    return tokens;
  }
}

/**
 * Convert {@link SyntaxHighlightColors} (Color-valued fields from AppTheme)
 * into a full {@link SyntaxTheme} (TextStyle-valued fields for the highlighter).
 *
 * SyntaxHighlightColors has 8 Color fields; SyntaxTheme has 10 TextStyle fields.
 * The two extra fields (`punctuation`, `plain`) get empty TextStyle defaults,
 * matching {@link SyntaxHighlighter.defaultTheme}.
 *
 * 逆向: chunk-006.js:11773 — R.app.syntaxHighlight passed as color source
 * 逆向: Sv() uses syntaxHighlight colors to create styled text spans
 *
 * @param colors - SyntaxHighlightColors from AppTheme.syntaxHighlight
 * @returns SyntaxTheme suitable for SyntaxHighlighter
 */
export function syntaxColorsToTheme(colors: SyntaxHighlightColors): SyntaxTheme {
  return {
    keyword: new TextStyle({ foreground: colors.keyword }),
    string: new TextStyle({ foreground: colors.string }),
    number: new TextStyle({ foreground: colors.number }),
    comment: new TextStyle({ foreground: colors.comment, dim: true }),
    function: new TextStyle({ foreground: colors.function }),
    variable: new TextStyle({ foreground: colors.variable }),
    type: new TextStyle({ foreground: colors.type }),
    operator: new TextStyle({ foreground: colors.operator }),
    punctuation: new TextStyle({}),
    plain: new TextStyle({}),
  };
}
