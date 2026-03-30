// Syntax highlighting for terminal text rendering
// Amp ref: ae function — file-extension-based syntax highlighting
// Returns TextSpan[] (one per line) with colored tokens based on SyntaxHighlightConfig
// Source: .reference/widgets-catalog.md
//
// Extension: Multi-line tokenizer state added for improved highlighting.
// Amp's ae function tokenizes each line independently (no multi-line state).
// See .gap/70-multiline-syntax-support.md

import { TextStyle } from '../core/text-style';
import { TextSpan } from '../core/text-span';
import { Color } from '../core/color';
import type { SyntaxHighlightConfig } from './app-theme';

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'type'
  | 'function'
  | 'operator'
  | 'punctuation'
  | 'variable'
  | 'property'
  | 'tag'
  | 'attribute'
  | 'default';

interface Token {
  readonly type: TokenType;
  readonly text: string;
}

// ---------------------------------------------------------------------------
// Language definitions — single-line rules
// ---------------------------------------------------------------------------

interface LanguageRule {
  readonly pattern: RegExp;
  readonly type: TokenType;
}

// ---------------------------------------------------------------------------
// Multi-line state tracking (Gap #70)
// ---------------------------------------------------------------------------

/**
 * Represents the state carried from one line to the next during tokenization.
 * When `activeRegion` is set, the tokenizer knows the current line begins
 * inside a multi-line construct (e.g., block comment, template literal).
 */
interface LineState {
  /** The token type of the currently open multi-line region, or null. */
  readonly activeRegion: TokenType | null;
  /** Index into the language's multiLineRules identifying which rule is active. */
  readonly activeRuleIndex: number;
  /** For shell heredocs: the captured delimiter string (e.g., "EOF"). */
  readonly heredocDelimiter?: string;
}

/** The "no state" sentinel — used for the first line of any file. */
const EMPTY_LINE_STATE: LineState = { activeRegion: null, activeRuleIndex: -1 };

/**
 * A rule describing a multi-line construct.
 *
 * Multi-line rules are checked BEFORE single-line rules. When the `open`
 * pattern matches on a line and the `close` pattern does NOT match on the
 * same line (after the open), the tokenizer enters the multi-line region.
 * Subsequent lines are entirely classified as the rule's `type` until a
 * line containing the `close` pattern is encountered.
 */
interface MultiLineRule {
  /** Pattern that opens the multi-line region (matched at line level). */
  readonly open: RegExp;
  /** Pattern that closes the multi-line region (matched at line level). */
  readonly close: RegExp;
  /** The token type applied to all text within the region. */
  readonly type: TokenType;
  /** Whether this is a heredoc rule (requires special delimiter capture). */
  readonly isHeredoc?: boolean;
}

/**
 * A complete language definition including both single-line and multi-line rules.
 */
interface LanguageDefinition {
  readonly rules: LanguageRule[];
  readonly multiLineRules: MultiLineRule[];
}

/**
 * Result of tokenizing a single line, including state to carry forward.
 */
interface TokenizeLineResult {
  readonly tokens: Token[];
  readonly nextState: LineState;
}

// ---------------------------------------------------------------------------
// TypeScript / JavaScript
// ---------------------------------------------------------------------------

const TS_JS_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Double-quoted strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Single-quoted strings
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Numbers (hex, binary, octal, decimal, float)
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  {
    pattern:
      /\b(?:abstract|as|async|await|break|case|catch|class|const|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|new|of|package|private|protected|public|readonly|return|require|set|static|super|switch|this|throw|try|type|typeof|undefined|var|void|while|with|yield)\b/,
    type: 'keyword',
  },
  // Type identifiers (PascalCase)
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|=>/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers / variables
  { pattern: /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/, type: 'variable' },
];

const TS_JS_MULTILINE_RULES: MultiLineRule[] = [
  // Block comments: /* ... */
  { open: /\/\*/, close: /\*\//, type: 'comment' },
  // Template literals: ` ... `
  { open: /`/, close: /`/, type: 'string' },
];

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

const PYTHON_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Double-quoted strings
  { pattern: /[fFrRbBuU]?"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Single-quoted strings
  { pattern: /[fFrRbBuU]?'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?j?\b/, type: 'number' },
  // Keywords
  {
    pattern:
      /\b(?:False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/,
    type: 'keyword',
  },
  // Built-in types / class names (PascalCase or known builtins)
  { pattern: /\b(?:int|float|str|bool|list|dict|tuple|set|frozenset|bytes|bytearray|complex|type|object|Exception|ValueError|TypeError|KeyError|IndexError|AttributeError|RuntimeError|StopIteration|GeneratorExit|IOError|OSError)\b/, type: 'type' },
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Decorators
  { pattern: /@[a-zA-Z_][a-zA-Z0-9_.]*/, type: 'attribute' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~@]+|->/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const PYTHON_MULTILINE_RULES: MultiLineRule[] = [
  // Triple double-quoted strings: """ ... """
  { open: /"""/, close: /"""/, type: 'string' },
  // Triple single-quoted strings: ''' ... '''
  { open: /'''/, close: /'''/, type: 'string' },
];

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

const GO_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Double-quoted strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Rune literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  {
    pattern:
      /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
    type: 'keyword',
  },
  // Built-in types
  { pattern: /\b(?:bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr)\b/, type: 'type' },
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~:]+|<-/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const GO_MULTILINE_RULES: MultiLineRule[] = [
  // Block comments
  { open: /\/\*/, close: /\*\//, type: 'comment' },
  // Raw strings (backtick)
  { open: /`/, close: /`/, type: 'string' },
];

// ---------------------------------------------------------------------------
// Rust
// ---------------------------------------------------------------------------

const RUST_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Double-quoted strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Char literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64)?\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize)?\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize)?\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64)?\b/, type: 'number' },
  // Keywords
  {
    pattern:
      /\b(?:as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|union|unsafe|use|where|while)\b/,
    type: 'keyword',
  },
  // Lifetime annotations
  { pattern: /'[a-zA-Z_]\w*/, type: 'attribute' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Macros
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*!/, type: 'function' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|->|=>/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const RUST_MULTILINE_RULES: MultiLineRule[] = [
  // Block comments (simplified: no nesting tracking)
  { open: /\/\*/, close: /\*\//, type: 'comment' },
  // Raw strings: r#"..."# (simplified)
  { open: /r#*"/, close: /"#*/, type: 'string' },
];

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

const JSON_RULES: LanguageRule[] = [
  // Strings (keys and values)
  { pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/, type: 'property' },
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Numbers
  { pattern: /-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Booleans and null
  { pattern: /\b(?:true|false|null)\b/, type: 'keyword' },
  // Punctuation
  { pattern: /[{}\[\]:,]/, type: 'punctuation' },
];

// ---------------------------------------------------------------------------
// YAML
// ---------------------------------------------------------------------------

const YAML_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Key (before colon)
  { pattern: /^[\w.-]+(?=\s*:)/, type: 'property' },
  { pattern: /^\s+[\w.-]+(?=\s*:)/, type: 'property' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Numbers
  { pattern: /\b\d+\.?\d*\b/, type: 'number' },
  // Booleans and null
  { pattern: /\b(?:true|false|yes|no|null|~)\b/, type: 'keyword' },
  // Anchors and aliases
  { pattern: /[&*][a-zA-Z_][a-zA-Z0-9_]*/, type: 'attribute' },
  // Tags
  { pattern: /!![a-zA-Z]+/, type: 'tag' },
  // Punctuation
  { pattern: /[{}\[\]:,\-|>]/, type: 'punctuation' },
];

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

const MARKDOWN_RULES: LanguageRule[] = [
  // Headings
  { pattern: /^#{1,6}\s+.*$/, type: 'keyword' },
  // Bold
  { pattern: /\*\*[^*]+\*\*/, type: 'variable' },
  { pattern: /__[^_]+__/, type: 'variable' },
  // Italic
  { pattern: /\*[^*]+\*/, type: 'attribute' },
  { pattern: /_[^_]+_/, type: 'attribute' },
  // Code blocks (inline)
  { pattern: /`[^`]+`/, type: 'string' },
  // Links
  { pattern: /\[[^\]]+\]\([^)]+\)/, type: 'function' },
  // Images
  { pattern: /!\[[^\]]*\]\([^)]+\)/, type: 'function' },
  // Blockquotes
  { pattern: /^>\s+.*$/, type: 'comment' },
  // List items
  { pattern: /^\s*[-*+]\s/, type: 'punctuation' },
  { pattern: /^\s*\d+\.\s/, type: 'punctuation' },
  // Horizontal rules
  { pattern: /^---+$/, type: 'punctuation' },
  { pattern: /^\*\*\*+$/, type: 'punctuation' },
];

const MARKDOWN_MULTILINE_RULES: MultiLineRule[] = [
  // Fenced code blocks: ``` ... ```
  { open: /^```/, close: /^```\s*$/, type: 'string' },
];

// ---------------------------------------------------------------------------
// Shell / Bash
// ---------------------------------------------------------------------------

const SHELL_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Double-quoted strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Single-quoted strings
  { pattern: /'[^']*'/, type: 'string' },
  // Variable references
  { pattern: /\$\{[^}]+\}/, type: 'variable' },
  { pattern: /\$[a-zA-Z_][a-zA-Z0-9_]*/, type: 'variable' },
  { pattern: /\$[0-9#@?!$*-]/, type: 'variable' },
  // Numbers
  { pattern: /\b\d+\b/, type: 'number' },
  // Keywords
  {
    pattern:
      /\b(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|exit|break|continue|export|source|alias|unalias|local|declare|readonly|typeset|shift|trap|eval|exec|set|unset)\b/,
    type: 'keyword',
  },
  // Command substitution
  { pattern: /\$\([^)]*\)/, type: 'function' },
  // Common built-in commands
  { pattern: /\b(?:echo|printf|read|cd|ls|cp|mv|rm|mkdir|rmdir|chmod|chown|grep|sed|awk|find|cat|sort|uniq|wc|head|tail|cut|tr|xargs|tee|test)\b/, type: 'function' },
  // Operators
  { pattern: /[|&;><]+|&&|\|\||>>|<</, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\]]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const SHELL_MULTILINE_RULES: MultiLineRule[] = [
  // Heredocs: <<EOF ... EOF (simplified to common delimiters)
  { open: /<<-?\s*'?(\w+)'?/, close: /^(\w+)$/, type: 'string', isHeredoc: true },
];

// ---------------------------------------------------------------------------
// C (Gap #69 — Tier 1)
// ---------------------------------------------------------------------------

const C_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Preprocessor directives
  { pattern: /^\s*#\s*\w+/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F]+[uUlL]*\b/, type: 'number' },
  { pattern: /\b\d+\.?\d*(?:[eE][+-]?\d+)?[fFlLuU]*\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|typeof|union|unsigned|void|volatile|while|_Bool|_Complex|_Imaginary)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|->/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const C_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// C++ (Gap #69 — Tier 1)
// ---------------------------------------------------------------------------

const CPP_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Preprocessor directives
  { pattern: /^\s*#\s*\w+/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F]+[uUlL]*\b/, type: 'number' },
  { pattern: /\b\d+\.?\d*(?:[eE][+-]?\d+)?[fFlLuU]*\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq|override|final)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|->|::/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const CPP_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Java (Gap #69 — Tier 1)
// ---------------------------------------------------------------------------

const JAVA_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Annotations
  { pattern: /@[a-zA-Z_][a-zA-Z0-9_.]*/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+[lL]?\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+[lL]?\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?[fFdDlL]?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|var|yield|record|sealed|permits|non-sealed)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|->/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const JAVA_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// HTML (Gap #69 — Tier 1)
// ---------------------------------------------------------------------------

const HTML_RULES: LanguageRule[] = [
  // Strings (attribute values)
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Doctype
  { pattern: /<!DOCTYPE[^>]*>/i, type: 'keyword' },
  // Closing tags
  { pattern: /<\/[a-zA-Z][a-zA-Z0-9-]*\s*>/, type: 'tag' },
  // Self-closing and opening tags (tag name only)
  { pattern: /<[a-zA-Z][a-zA-Z0-9-]*/, type: 'tag' },
  { pattern: /\/?>/, type: 'tag' },
  // Attribute names
  { pattern: /\b[a-zA-Z_:][a-zA-Z0-9_:.-]*(?=\s*=)/, type: 'attribute' },
  // Entities
  { pattern: /&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/, type: 'number' },
  // Operators
  { pattern: /=/, type: 'operator' },
];

const HTML_MULTILINE_RULES: MultiLineRule[] = [
  // HTML comments: <!-- ... -->
  { open: /<!--/, close: /-->/, type: 'comment' },
];

// ---------------------------------------------------------------------------
// CSS (Gap #69 — Tier 1)
// ---------------------------------------------------------------------------

const CSS_RULES: LanguageRule[] = [
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Numbers with units
  { pattern: /\b\d+\.?\d*(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|s|ms|deg|rad|turn|fr)\b/, type: 'number' },
  { pattern: /#[0-9a-fA-F]{3,8}\b/, type: 'number' },
  { pattern: /\b\d+\.?\d*\b/, type: 'number' },
  // At-rules
  { pattern: /@[a-zA-Z][a-zA-Z0-9-]*/, type: 'keyword' },
  // Pseudo-classes and pseudo-elements
  { pattern: /:{1,2}[a-zA-Z][a-zA-Z0-9-]*/, type: 'attribute' },
  // Selectors: class
  { pattern: /\.[a-zA-Z_][a-zA-Z0-9_-]*/, type: 'tag' },
  // Selectors: id
  { pattern: /#[a-zA-Z_][a-zA-Z0-9_-]*/, type: 'tag' },
  // Selectors: element
  { pattern: /\b(?:html|body|div|span|p|a|ul|ol|li|h[1-6]|table|tr|td|th|form|input|button|select|textarea|img|section|article|nav|header|footer|main|aside)\b/, type: 'tag' },
  // Property names
  { pattern: /[a-zA-Z-]+(?=\s*:)/, type: 'property' },
  // Important
  { pattern: /!important\b/, type: 'keyword' },
  // Functions
  { pattern: /\b[a-zA-Z-]+(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+~>*=]/, type: 'operator' },
  // Punctuation
  { pattern: /[{}();:,.]/, type: 'punctuation' },
];

const CSS_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// SQL (Gap #69 — Tier 1)
// ---------------------------------------------------------------------------

const SQL_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /--.*$/, type: 'comment' },
  // Strings
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Numbers
  { pattern: /\b\d+\.?\d*\b/, type: 'number' },
  // Keywords (uppercase convention)
  { pattern: /\b(?:SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|DATABASE|SCHEMA|GRANT|REVOKE|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|CHECK|DEFAULT|CONSTRAINT|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|EXISTS|BETWEEN|LIKE|CASE|WHEN|THEN|ELSE|END|BEGIN|COMMIT|ROLLBACK|TRANSACTION|IF|FUNCTION|PROCEDURE|RETURN|RETURNS|DECLARE|CURSOR|FETCH|OPEN|CLOSE|TRIGGER|CASCADE|TRUNCATE|EXPLAIN|ANALYZE|WITH|RECURSIVE|OVER|PARTITION|RANK|ROW_NUMBER|DENSE_RANK|COALESCE|CAST|CONVERT|COUNT|SUM|AVG|MIN|MAX|ASC|DESC)\b/i, type: 'keyword' },
  // Type identifiers
  { pattern: /\b(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|VARCHAR|CHAR|TEXT|BLOB|DATE|TIME|DATETIME|TIMESTAMP|BOOLEAN|BOOL|SERIAL|UUID)\b/i, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^]+|<>|!=|>=|<=/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.*]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const SQL_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// TOML (Gap #69 — Tier 1)
// ---------------------------------------------------------------------------

const TOML_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Section headers
  { pattern: /^\s*\[\[?[^\]]*\]\]?/, type: 'tag' },
  // Keys
  { pattern: /[a-zA-Z_][a-zA-Z0-9_.-]*(?=\s*=)/, type: 'property' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'[^']*'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /[+-]?\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Datetime
  { pattern: /\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?/, type: 'number' },
  // Booleans
  { pattern: /\b(?:true|false)\b/, type: 'keyword' },
  // Operators
  { pattern: /=/, type: 'operator' },
  // Punctuation
  { pattern: /[{}\[\],.]/, type: 'punctuation' },
];

const TOML_MULTILINE_RULES: MultiLineRule[] = [
  // Triple double-quoted strings
  { open: /"""/, close: /"""/, type: 'string' },
  // Triple single-quoted strings
  { open: /'''/, close: /'''/, type: 'string' },
];

// ---------------------------------------------------------------------------
// Ruby (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const RUBY_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Double-quoted strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Single-quoted strings
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Symbols
  { pattern: /:[a-zA-Z_][a-zA-Z0-9_]*/, type: 'attribute' },
  // Instance variables
  { pattern: /@{1,2}[a-zA-Z_][a-zA-Z0-9_]*/, type: 'variable' },
  // Global variables
  { pattern: /\$[a-zA-Z_][a-zA-Z0-9_]*/, type: 'variable' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:BEGIN|END|alias|and|begin|break|case|class|def|defined\?|do|else|elsif|end|ensure|false|for|if|in|module|next|nil|not|or|redo|rescue|retry|return|self|super|then|true|undef|unless|until|when|while|yield|require|require_relative|include|extend|prepend|attr_reader|attr_writer|attr_accessor|private|protected|public|raise|puts|print|p)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*[?!]?(?=\s*[\(])/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~]+|<=>|=>|->|\.\.\.?/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*[?!]?\b/, type: 'variable' },
];

const RUBY_MULTILINE_RULES: MultiLineRule[] = [
  { open: /=begin/, close: /=end/, type: 'comment' },
];

// ---------------------------------------------------------------------------
// PHP (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const PHP_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  { pattern: /#.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // PHP tags
  { pattern: /<\?php\b/, type: 'keyword' },
  { pattern: /\?>/, type: 'keyword' },
  // Variables
  { pattern: /\$[a-zA-Z_][a-zA-Z0-9_]*/, type: 'variable' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: 'number' },
  { pattern: /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|readonly|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield|yield\s+from)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?.]+|=>|->|::/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const PHP_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Swift (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const SWIFT_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Attributes
  { pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:associatedtype|break|case|catch|class|continue|convenience|default|defer|deinit|do|dynamic|else|enum|extension|fallthrough|false|fileprivate|final|for|func|get|guard|if|import|in|indirect|infix|init|inout|internal|is|lazy|let|mutating|nil|nonmutating|open|operator|optional|override|postfix|precedencegroup|prefix|private|protocol|public|repeat|required|rethrows|return|self|Self|set|some|static|struct|subscript|super|switch|throw|throws|true|try|typealias|unowned|var|weak|where|while|willSet|didSet|async|await|actor)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|->/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const SWIFT_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Kotlin (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const KOTLIN_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Annotations
  { pattern: /@[a-zA-Z_][a-zA-Z0-9_.]*/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+[lL]?\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+[lL]?\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?[fFlL]?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:abstract|actual|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|do|else|enum|expect|external|false|final|finally|for|fun|get|if|import|in|infix|init|inline|inner|interface|internal|is|it|lateinit|noinline|null|object|open|operator|out|override|package|private|protected|public|reified|return|sealed|set|super|suspend|tailrec|this|throw|true|try|typealias|typeof|val|var|vararg|when|where|while|yield)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|->|::/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const KOTLIN_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// C# (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const CSHARP_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /\$?"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Attributes
  { pattern: /\[[a-zA-Z_][a-zA-Z0-9_.]*\]/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+[uUlL]*\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+[uUlL]*\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?[fFdDmM]?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|record|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|while|yield|async|await|dynamic|nameof|when|with)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|=>|->/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const CSHARP_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Lua (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const LUA_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /--(?!\[\[).*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: 'number' },
  { pattern: /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/, type: 'keyword' },
  // Built-in globals
  { pattern: /\b(?:print|type|tostring|tonumber|pairs|ipairs|next|select|unpack|require|error|assert|pcall|xpcall|setmetatable|getmetatable|rawget|rawset|rawequal|rawlen|table|string|math|io|os|coroutine|debug)\b/, type: 'function' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%^=<>~#]+|\.\./, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const LUA_MULTILINE_RULES: MultiLineRule[] = [
  // Block comments: --[[ ... ]]
  { open: /--\[\[/, close: /\]\]/, type: 'comment' },
  // Long strings: [[ ... ]]
  { open: /\[\[/, close: /\]\]/, type: 'string' },
];

// ---------------------------------------------------------------------------
// SCSS (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const SCSS_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Variables
  { pattern: /\$[a-zA-Z_][a-zA-Z0-9_-]*/, type: 'variable' },
  // Numbers with units
  { pattern: /\b\d+\.?\d*(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|s|ms|deg|rad|turn|fr)\b/, type: 'number' },
  { pattern: /#[0-9a-fA-F]{3,8}\b/, type: 'number' },
  { pattern: /\b\d+\.?\d*\b/, type: 'number' },
  // At-rules
  { pattern: /@(?:mixin|include|extend|import|use|forward|if|else|each|for|while|function|return|at-root|debug|warn|error)\b/, type: 'keyword' },
  { pattern: /@[a-zA-Z][a-zA-Z0-9-]*/, type: 'keyword' },
  // Pseudo-classes
  { pattern: /:{1,2}[a-zA-Z][a-zA-Z0-9-]*/, type: 'attribute' },
  // Selectors
  { pattern: /\.[a-zA-Z_][a-zA-Z0-9_-]*/, type: 'tag' },
  { pattern: /#[a-zA-Z_][a-zA-Z0-9_-]*/, type: 'tag' },
  { pattern: /&/, type: 'tag' },
  // Property names
  { pattern: /[a-zA-Z-]+(?=\s*:)/, type: 'property' },
  // Functions
  { pattern: /\b[a-zA-Z-]+(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+~>*=]/, type: 'operator' },
  // Punctuation
  { pattern: /[{}();:,.]/, type: 'punctuation' },
];

const SCSS_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// XML (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const XML_RULES: LanguageRule[] = [
  // Strings (attribute values)
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // XML declaration
  { pattern: /<\?xml[^?]*\?>/, type: 'keyword' },
  // CDATA
  { pattern: /<!\[CDATA\[/, type: 'keyword' },
  { pattern: /\]\]>/, type: 'keyword' },
  // Closing tags
  { pattern: /<\/[a-zA-Z][a-zA-Z0-9:.-]*\s*>/, type: 'tag' },
  // Opening tags
  { pattern: /<[a-zA-Z][a-zA-Z0-9:.-]*/, type: 'tag' },
  { pattern: /\/?>/, type: 'tag' },
  // Attribute names
  { pattern: /\b[a-zA-Z_:][a-zA-Z0-9_:.-]*(?=\s*=)/, type: 'attribute' },
  // Entities
  { pattern: /&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/, type: 'number' },
  // Operators
  { pattern: /=/, type: 'operator' },
];

const XML_MULTILINE_RULES: MultiLineRule[] = [
  { open: /<!--/, close: /-->/, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Dockerfile (Gap #69 — Tier 2)
// ---------------------------------------------------------------------------

const DOCKERFILE_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Variables
  { pattern: /\$\{[^}]+\}/, type: 'variable' },
  { pattern: /\$[a-zA-Z_][a-zA-Z0-9_]*/, type: 'variable' },
  // Instructions (keywords)
  { pattern: /^\s*(?:FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/i, type: 'keyword' },
  // AS keyword (FROM ... AS ...)
  { pattern: /\bAS\b/i, type: 'keyword' },
  // Numbers
  { pattern: /\b\d+\b/, type: 'number' },
  // Operators
  { pattern: /[=\\]/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_.-]*\b/, type: 'variable' },
];

// ---------------------------------------------------------------------------
// Scala (Gap #69 — Tier 3)
// ---------------------------------------------------------------------------

const SCALA_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Annotations
  { pattern: /@[a-zA-Z_][a-zA-Z0-9_.]*/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+[lL]?\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?[fFdDlL]?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:abstract|case|catch|class|def|do|else|enum|export|extends|false|final|finally|for|forSome|given|if|implicit|import|lazy|match|new|null|object|override|package|private|protected|return|sealed|super|then|this|throw|trait|true|try|type|using|val|var|while|with|yield)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*[\[(])/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?:]+|=>|<-/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

const SCALA_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\/\*/, close: /\*\//, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Elixir (Gap #69 — Tier 3)
// ---------------------------------------------------------------------------

const ELIXIR_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Char lists
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Atoms
  { pattern: /:[a-zA-Z_][a-zA-Z0-9_]*[?!]?/, type: 'attribute' },
  // Module attributes
  { pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/, type: 'attribute' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:after|alias|and|case|catch|cond|def|defcallback|defdelegate|defexception|defguard|defguardp|defimpl|defmacro|defmacrop|defmodule|defoverridable|defp|defprotocol|defstruct|do|else|end|fn|for|if|import|in|not|or|quote|raise|receive|require|rescue|try|unless|unquote|unquote_splicing|use|when|with)\b/, type: 'keyword' },
  // Booleans
  { pattern: /\b(?:true|false|nil)\b/, type: 'keyword' },
  // Module names
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*[?!]?(?=\s*[\(])/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~]+|\|>|<>|\\\\|->|<-|::/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*[?!]?\b/, type: 'variable' },
];

const ELIXIR_MULTILINE_RULES: MultiLineRule[] = [
  // Heredoc strings (triple double-quote)
  { open: /"""/, close: /"""/, type: 'string' },
];

// ---------------------------------------------------------------------------
// Haskell (Gap #69 — Tier 3)
// ---------------------------------------------------------------------------

const HASKELL_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /--.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7]+\b/, type: 'number' },
  { pattern: /\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:as|case|class|data|default|deriving|do|else|family|forall|foreign|hiding|if|import|in|infix|infixl|infixr|instance|let|module|newtype|of|qualified|then|type|where|_)\b/, type: 'keyword' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_']*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-z_][a-zA-Z0-9_']*(?=\s)/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~@$#?:]+|->|=>|<-|::/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_']*\b/, type: 'variable' },
];

const HASKELL_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\{-/, close: /-\}/, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Zig (Gap #69 — Tier 3)
// ---------------------------------------------------------------------------

const ZIG_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:align|allowzero|and|anyframe|anytype|asm|async|await|break|catch|comptime|const|continue|defer|else|enum|errdefer|error|export|extern|false|fn|for|if|inline|linksection|noalias|nosuspend|null|opaque|or|orelse|packed|pub|resume|return|struct|suspend|switch|test|threadlocal|true|try|undefined|union|unreachable|var|volatile|while)\b/, type: 'keyword' },
  // Built-in types
  { pattern: /\b(?:bool|f16|f32|f64|f80|f128|i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|void|noreturn|type|anyerror|comptime_int|comptime_float)\b/, type: 'type' },
  // Type identifiers
  { pattern: /\b[A-Z][a-zA-Z0-9_]*\b/, type: 'type' },
  // Built-in functions
  { pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/, type: 'function' },
  // Function calls
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~?]+|=>/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

// ---------------------------------------------------------------------------
// OCaml (Gap #69 — Tier 3)
// ---------------------------------------------------------------------------

const OCAML_RULES: LanguageRule[] = [
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Character literals
  { pattern: /'(?:[^'\\]|\\.)'/, type: 'string' },
  // Numbers
  { pattern: /\b0[xX][0-9a-fA-F_]+\b/, type: 'number' },
  { pattern: /\b0[oO][0-7_]+\b/, type: 'number' },
  { pattern: /\b0[bB][01_]+\b/, type: 'number' },
  { pattern: /\b\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?\b/, type: 'number' },
  // Keywords
  { pattern: /\b(?:and|as|assert|asr|begin|class|constraint|do|done|downto|else|end|exception|external|false|for|fun|function|functor|if|in|include|inherit|initializer|land|lazy|let|lor|lsl|lsr|lxor|match|method|mod|module|mutable|new|nonrec|object|of|open|or|private|rec|sig|struct|then|to|true|try|type|val|virtual|when|while|with)\b/, type: 'keyword' },
  // Module/Type names
  { pattern: /\b[A-Z][a-zA-Z0-9_']*\b/, type: 'type' },
  // Function calls
  { pattern: /\b[a-z_][a-zA-Z0-9_']*(?=\s)/, type: 'function' },
  // Operators
  { pattern: /[+\-*/%=<>!&|^~@#]+|->|<-|;;|::|\|>/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,.]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_']*\b/, type: 'variable' },
];

const OCAML_MULTILINE_RULES: MultiLineRule[] = [
  { open: /\(\*/, close: /\*\)/, type: 'comment' },
];

// ---------------------------------------------------------------------------
// Makefile (Gap #69 — Tier 3)
// ---------------------------------------------------------------------------

const MAKEFILE_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  { pattern: /'(?:[^'\\]|\\.)*'/, type: 'string' },
  // Variable references
  { pattern: /\$\([^)]+\)/, type: 'variable' },
  { pattern: /\$\{[^}]+\}/, type: 'variable' },
  { pattern: /\$[a-zA-Z@<^?*%]/, type: 'variable' },
  // Directives
  { pattern: /^\s*-?(?:include|sinclude|override|export|unexport|vpath|define|endef|ifdef|ifndef|ifeq|ifneq|else|endif)\b/, type: 'keyword' },
  // Targets (at start of line before colon)
  { pattern: /^[a-zA-Z_][a-zA-Z0-9_.-]*(?=\s*:)/, type: 'function' },
  // Assignment operators
  { pattern: /[+?:]?=/, type: 'operator' },
  // Punctuation
  { pattern: /[{}()\[\];:,\\]/, type: 'punctuation' },
  // Identifiers
  { pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/, type: 'variable' },
];

// ---------------------------------------------------------------------------
// Extension-to-language mapping
// ---------------------------------------------------------------------------

type LanguageName =
  | 'typescript' | 'python' | 'go' | 'rust' | 'json' | 'yaml' | 'markdown' | 'shell'
  | 'c' | 'cpp' | 'java' | 'html' | 'css' | 'sql' | 'toml'
  | 'ruby' | 'php' | 'swift' | 'kotlin' | 'csharp' | 'lua' | 'scss' | 'xml' | 'dockerfile'
  | 'scala' | 'elixir' | 'haskell' | 'zig' | 'ocaml' | 'makefile';

const EXTENSION_MAP: Record<string, LanguageName> = {
  // Existing
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'typescript',
  '.jsx': 'typescript',
  '.mjs': 'typescript',
  '.cjs': 'typescript',
  '.py': 'python',
  '.pyw': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.json': 'json',
  '.jsonc': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  // Tier 1
  '.c': 'c',
  '.h': 'cpp', // .h defaults to C++ (superset of C)
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hh': 'cpp',
  '.java': 'java',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.sql': 'sql',
  '.toml': 'toml',
  // Tier 2
  '.rb': 'ruby',
  '.rake': 'ruby',
  '.gemspec': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.cs': 'csharp',
  '.lua': 'lua',
  '.scss': 'scss',
  '.sass': 'scss',
  '.xml': 'xml',
  '.svg': 'xml',
  '.xsl': 'xml',
  // Tier 3
  '.scala': 'scala',
  '.sc': 'scala',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.hs': 'haskell',
  '.zig': 'zig',
  '.ml': 'ocaml',
  '.mli': 'ocaml',
  '.mk': 'makefile',
};

// Filename-based detection (no extension)
const FILENAME_MAP: Record<string, LanguageName> = {
  'Dockerfile': 'dockerfile',
  'Makefile': 'makefile',
  'makefile': 'makefile',
  'GNUmakefile': 'makefile',
};

// No multi-line rules for these languages
const NO_MULTILINE_RULES: MultiLineRule[] = [];

// Legacy compat: keep LANGUAGE_RULES for any external callers
const LANGUAGE_RULES: Record<LanguageName, LanguageRule[]> = {
  typescript: TS_JS_RULES,
  python: PYTHON_RULES,
  go: GO_RULES,
  rust: RUST_RULES,
  json: JSON_RULES,
  yaml: YAML_RULES,
  markdown: MARKDOWN_RULES,
  shell: SHELL_RULES,
  c: C_RULES,
  cpp: CPP_RULES,
  java: JAVA_RULES,
  html: HTML_RULES,
  css: CSS_RULES,
  sql: SQL_RULES,
  toml: TOML_RULES,
  ruby: RUBY_RULES,
  php: PHP_RULES,
  swift: SWIFT_RULES,
  kotlin: KOTLIN_RULES,
  csharp: CSHARP_RULES,
  lua: LUA_RULES,
  scss: SCSS_RULES,
  xml: XML_RULES,
  dockerfile: DOCKERFILE_RULES,
  scala: SCALA_RULES,
  elixir: ELIXIR_RULES,
  haskell: HASKELL_RULES,
  zig: ZIG_RULES,
  ocaml: OCAML_RULES,
  makefile: MAKEFILE_RULES,
};

const LANGUAGE_DEFS: Record<LanguageName, LanguageDefinition> = {
  typescript: { rules: TS_JS_RULES, multiLineRules: TS_JS_MULTILINE_RULES },
  python: { rules: PYTHON_RULES, multiLineRules: PYTHON_MULTILINE_RULES },
  go: { rules: GO_RULES, multiLineRules: GO_MULTILINE_RULES },
  rust: { rules: RUST_RULES, multiLineRules: RUST_MULTILINE_RULES },
  json: { rules: JSON_RULES, multiLineRules: NO_MULTILINE_RULES },
  yaml: { rules: YAML_RULES, multiLineRules: NO_MULTILINE_RULES },
  markdown: { rules: MARKDOWN_RULES, multiLineRules: MARKDOWN_MULTILINE_RULES },
  shell: { rules: SHELL_RULES, multiLineRules: SHELL_MULTILINE_RULES },
  c: { rules: C_RULES, multiLineRules: C_MULTILINE_RULES },
  cpp: { rules: CPP_RULES, multiLineRules: CPP_MULTILINE_RULES },
  java: { rules: JAVA_RULES, multiLineRules: JAVA_MULTILINE_RULES },
  html: { rules: HTML_RULES, multiLineRules: HTML_MULTILINE_RULES },
  css: { rules: CSS_RULES, multiLineRules: CSS_MULTILINE_RULES },
  sql: { rules: SQL_RULES, multiLineRules: SQL_MULTILINE_RULES },
  toml: { rules: TOML_RULES, multiLineRules: TOML_MULTILINE_RULES },
  ruby: { rules: RUBY_RULES, multiLineRules: RUBY_MULTILINE_RULES },
  php: { rules: PHP_RULES, multiLineRules: PHP_MULTILINE_RULES },
  swift: { rules: SWIFT_RULES, multiLineRules: SWIFT_MULTILINE_RULES },
  kotlin: { rules: KOTLIN_RULES, multiLineRules: KOTLIN_MULTILINE_RULES },
  csharp: { rules: CSHARP_RULES, multiLineRules: CSHARP_MULTILINE_RULES },
  lua: { rules: LUA_RULES, multiLineRules: LUA_MULTILINE_RULES },
  scss: { rules: SCSS_RULES, multiLineRules: SCSS_MULTILINE_RULES },
  xml: { rules: XML_RULES, multiLineRules: XML_MULTILINE_RULES },
  dockerfile: { rules: DOCKERFILE_RULES, multiLineRules: NO_MULTILINE_RULES },
  scala: { rules: SCALA_RULES, multiLineRules: SCALA_MULTILINE_RULES },
  elixir: { rules: ELIXIR_RULES, multiLineRules: ELIXIR_MULTILINE_RULES },
  haskell: { rules: HASKELL_RULES, multiLineRules: HASKELL_MULTILINE_RULES },
  zig: { rules: ZIG_RULES, multiLineRules: NO_MULTILINE_RULES },
  ocaml: { rules: OCAML_RULES, multiLineRules: OCAML_MULTILINE_RULES },
  makefile: { rules: MAKEFILE_RULES, multiLineRules: NO_MULTILINE_RULES },
};

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

/**
 * Extract the file extension from a file path.
 * Returns the extension including the leading dot, or empty string if none.
 */
function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filePath.length - 1) return '';
  // Handle paths like /foo/bar/.gitignore — no extension
  const afterDot = filePath.slice(lastDot);
  if (afterDot.includes('/') || afterDot.includes('\\')) return '';
  return afterDot.toLowerCase();
}

/**
 * Detect the language from a file path based on extension or filename.
 * Returns undefined if the extension is not recognized.
 */
export function detectLanguage(filePath: string): LanguageName | undefined {
  // Check filename first (for Dockerfile, Makefile, etc.)
  const basename = filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath;
  const byFilename = FILENAME_MAP[basename];
  if (byFilename) return byFilename;

  // Fall back to extension
  const ext = getExtension(filePath);
  return EXTENSION_MAP[ext];
}

/**
 * Tokenize a single line of source code using language-specific rules.
 * Returns an array of tokens covering the entire line content.
 */
function tokenizeLine(line: string, rules: LanguageRule[]): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < line.length) {
    let bestMatch: { text: string; type: TokenType } | undefined;
    let bestIndex = line.length;

    // Try each rule and find the one matching earliest
    for (const rule of rules) {
      // Create a new regex starting from current position
      const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('m') ? 'gm' : 'g');
      re.lastIndex = pos;
      const match = re.exec(line);

      if (match && match.index !== undefined && match.index < bestIndex && match.index >= pos) {
        bestIndex = match.index;
        bestMatch = { text: match[0], type: rule.type };
        // Perfect match at current position — use it immediately
        if (bestIndex === pos) break;
      }
    }

    if (bestMatch && bestIndex < line.length) {
      // If there's plain text before the match, emit it as default
      if (bestIndex > pos) {
        tokens.push({ type: 'default', text: line.slice(pos, bestIndex) });
      }
      tokens.push({ type: bestMatch.type, text: bestMatch.text });
      pos = bestIndex + bestMatch.text.length;
    } else {
      // No more matches; rest of line is default
      tokens.push({ type: 'default', text: line.slice(pos) });
      pos = line.length;
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Stateful multi-line tokenizer (Gap #70)
// ---------------------------------------------------------------------------

/**
 * Tokenize a line with awareness of multi-line constructs.
 *
 * Algorithm:
 * 1. If `state.activeRegion` is set, we are inside a multi-line construct.
 *    Scan for the closing pattern of the active rule.
 *    - If found: emit text up to and including the close as the region's type,
 *      then tokenize the remainder of the line normally.
 *    - If not found: emit the entire line as the region's type.
 *
 * 2. If no active region, scan the line for multi-line rule openers BEFORE
 *    applying single-line rules.
 */
function tokenizeLineStateful(
  line: string,
  def: LanguageDefinition,
  state: LineState,
): TokenizeLineResult {
  // --- CASE 1: Continuation of an active multi-line region ---
  if (state.activeRegion !== null) {
    // Special handling for heredocs
    if (state.heredocDelimiter) {
      if (line.trim() === state.heredocDelimiter) {
        return {
          tokens: [{ type: state.activeRegion, text: line }],
          nextState: EMPTY_LINE_STATE,
        };
      } else {
        return {
          tokens: [{ type: state.activeRegion, text: line }],
          nextState: state,
        };
      }
    }

    const rule = def.multiLineRules[state.activeRuleIndex]!;
    const closeRe = new RegExp(rule.close.source, 'g');
    const closeMatch = closeRe.exec(line);

    if (closeMatch) {
      // Close found — region ends on this line
      const regionEnd = closeMatch.index + closeMatch[0].length;
      const tokens: Token[] = [];

      // Everything up to and including the close delimiter is the region type
      if (regionEnd > 0) {
        tokens.push({ type: state.activeRegion, text: line.slice(0, regionEnd) });
      }

      // Tokenize the remainder of the line
      const remainder = line.slice(regionEnd);
      if (remainder.length > 0) {
        // Recursively handle remainder — it might open another multi-line region
        const subResult = tokenizeLineStateful(remainder, def, EMPTY_LINE_STATE);
        tokens.push(...subResult.tokens);
        return { tokens, nextState: subResult.nextState };
      }

      return { tokens, nextState: EMPTY_LINE_STATE };
    } else {
      // No close found — entire line is inside the region
      return {
        tokens: [{ type: state.activeRegion, text: line }],
        nextState: state,
      };
    }
  }

  // --- CASE 2: No active region — scan for multi-line openers alongside single-line rules ---
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < line.length) {
    let bestMultiLine: {
      index: number;
      openText: string;
      ruleIndex: number;
      closesOnSameLine: boolean;
      closeEnd: number;
      heredocDelimiter?: string;
    } | undefined;
    let bestMultiLineIndex = line.length;

    // Check multi-line openers
    for (let ri = 0; ri < def.multiLineRules.length; ri++) {
      const mlRule = def.multiLineRules[ri]!;
      const openRe = new RegExp(mlRule.open.source, 'g');
      openRe.lastIndex = pos;
      const openMatch = openRe.exec(line);

      if (openMatch && openMatch.index >= pos && openMatch.index < bestMultiLineIndex) {
        // Check if the close also appears on the same line after the open
        const afterOpen = openMatch.index + openMatch[0].length;
        let closesOnSameLine = false;
        let closeEnd = 0;

        if (!mlRule.isHeredoc) {
          const closeRe = new RegExp(mlRule.close.source, 'g');
          closeRe.lastIndex = afterOpen;
          const closeMatch = closeRe.exec(line);
          closesOnSameLine = closeMatch !== null;
          closeEnd = closeMatch ? closeMatch.index + closeMatch[0].length : 0;
        }

        bestMultiLineIndex = openMatch.index;
        bestMultiLine = {
          index: openMatch.index,
          openText: openMatch[0],
          ruleIndex: ri,
          closesOnSameLine,
          closeEnd,
          heredocDelimiter: mlRule.isHeredoc
            ? (openMatch[1] || openMatch[0].replace(/<<-?\s*'?(\w+)'?/, '$1'))
            : undefined,
        };

        if (bestMultiLineIndex === pos) break;
      }
    }

    // Check single-line rules (same logic as original tokenizeLine)
    let bestSingle: { text: string; type: TokenType } | undefined;
    let bestSingleIndex = line.length;

    for (const rule of def.rules) {
      const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('m') ? 'gm' : 'g');
      re.lastIndex = pos;
      const match = re.exec(line);

      if (match && match.index !== undefined && match.index < bestSingleIndex && match.index >= pos) {
        bestSingleIndex = match.index;
        bestSingle = { text: match[0], type: rule.type };
        if (bestSingleIndex === pos) break;
      }
    }

    // Decide: multi-line opener wins if it starts at the same or earlier position
    if (bestMultiLine && bestMultiLineIndex <= bestSingleIndex) {
      // Emit any default text before the opener
      if (bestMultiLineIndex > pos) {
        tokens.push({ type: 'default', text: line.slice(pos, bestMultiLineIndex) });
      }

      const mlRule = def.multiLineRules[bestMultiLine.ruleIndex]!;

      if (bestMultiLine.closesOnSameLine) {
        // Self-contained on this line: emit as a single token
        const regionText = line.slice(bestMultiLineIndex, bestMultiLine.closeEnd);
        tokens.push({ type: mlRule.type, text: regionText });
        pos = bestMultiLine.closeEnd;
      } else {
        // Opens a multi-line region: rest of line is the region type
        tokens.push({ type: mlRule.type, text: line.slice(bestMultiLineIndex) });
        return {
          tokens,
          nextState: {
            activeRegion: mlRule.type,
            activeRuleIndex: bestMultiLine.ruleIndex,
            heredocDelimiter: bestMultiLine.heredocDelimiter,
          },
        };
      }
    } else if (bestSingle && bestSingleIndex < line.length) {
      // Single-line rule wins
      if (bestSingleIndex > pos) {
        tokens.push({ type: 'default', text: line.slice(pos, bestSingleIndex) });
      }
      tokens.push({ type: bestSingle.type, text: bestSingle.text });
      pos = bestSingleIndex + bestSingle.text.length;
    } else {
      // No more matches
      tokens.push({ type: 'default', text: line.slice(pos) });
      pos = line.length;
    }
  }

  return { tokens, nextState: EMPTY_LINE_STATE };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform syntax highlighting on source content, returning one TextSpan per line.
 *
 * Signature: syntaxHighlight(content, config, filePath) -> TextSpan[]
 *
 * Each returned TextSpan represents a single line. If the file extension is
 * not recognized, all lines are returned with the default color.
 *
 * @param content    The source code text to highlight.
 * @param config     SyntaxHighlightConfig providing colors for each token type.
 * @param filePath   File path used to detect the language (extension-based).
 * @returns          Array of TextSpan objects, one per line.
 *
 * Amp ref: ae function
 */
export function syntaxHighlight(
  content: string,
  config: SyntaxHighlightConfig,
  filePath: string,
): TextSpan[] {
  if (content.length === 0) {
    return [new TextSpan({ text: '', style: new TextStyle({ foreground: config.default }) })];
  }

  const language = detectLanguage(filePath);
  const lines = content.split('\n');

  if (!language) {
    // Unknown language — return all lines with default color
    return lines.map(
      (line) =>
        new TextSpan({
          text: line,
          style: new TextStyle({ foreground: config.default }),
        }),
    );
  }

  const def = LANGUAGE_DEFS[language];
  const result: TextSpan[] = [];
  let lineState: LineState = EMPTY_LINE_STATE;

  for (const line of lines) {
    if (line.length === 0) {
      // Empty lines preserve active state (a block comment can span blank lines)
      result.push(new TextSpan({
        text: '',
        style: new TextStyle({
          foreground: lineState.activeRegion
            ? colorForTokenType(lineState.activeRegion, config)
            : config.default,
        }),
      }));
      continue;
    }

    const { tokens, nextState } = tokenizeLineStateful(line, def, lineState);
    lineState = nextState;

    if (tokens.length === 1) {
      const token = tokens[0]!;
      result.push(new TextSpan({
        text: token.text,
        style: new TextStyle({ foreground: colorForTokenType(token.type, config) }),
      }));
    } else {
      const children = tokens.map(
        (token) =>
          new TextSpan({
            text: token.text,
            style: new TextStyle({ foreground: colorForTokenType(token.type, config) }),
          }),
      );
      result.push(new TextSpan({ children }));
    }
  }

  return result;
}

/**
 * Map a token type to its corresponding color from the config.
 */
function colorForTokenType(type: TokenType, config: SyntaxHighlightConfig): Color {
  return config[type];
}
