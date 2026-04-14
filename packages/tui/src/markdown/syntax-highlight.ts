/**
 * 简单的语法高亮器 — 基于正则的 token 级高亮。
 *
 * 将代码字符串按 token 类型（关键字、字符串、数字、注释等）分割，
 * 每个 token 对应一个带样式的 {@link TextSpan}。
 *
 * 不做完整语法分析，仅做简单的正则匹配（与原版 Amp CLI 一致）。
 *
 * @example
 * ```ts
 * const theme = SyntaxHighlighter.defaultTheme();
 * const hl = new SyntaxHighlighter(theme);
 * const spans = hl.highlight("const x = 1;", "js");
 * // [TextSpan{text:"const", style:keyword}, TextSpan{text:" "}, ...]
 * ```
 *
 * @module
 */

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "../widgets/text-span.js";

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

/** 常见编程语言关键字集合 */
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
 * 简单语法高亮器。
 *
 * 使用正则表达式进行 token 级代码高亮，不做完整语法分析。
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
   * @param code - 代码文本
   * @param lang - 语言标识（目前用于判断注释风格，不做完整区分）
   * @returns TextSpan 数组，每个 token 对应一个 span
   */
  highlight(code: string, _lang: string): TextSpan[] {
    const tokens = this._tokenize(code);
    return tokens.map(
      (tok) =>
        new TextSpan({
          text: tok.text,
          style: this._theme[tok.type],
        }),
    );
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
   * 将代码按 token 切分。
   *
   * 匹配优先级：注释 > 字符串 > 数字 > 关键字/类型/函数 > 运算符 > 标点 > 其他。
   */
  private _tokenize(code: string): HighlightToken[] {
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
