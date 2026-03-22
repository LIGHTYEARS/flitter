// Syntax highlighting for terminal text rendering
// Amp ref: ae function — file-extension-based syntax highlighting
// Returns TextSpan[] (one per line) with colored tokens based on SyntaxHighlightConfig
// Source: .reference/widgets-catalog.md

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
// Language definitions
// ---------------------------------------------------------------------------

interface LanguageRule {
  readonly pattern: RegExp;
  readonly type: TokenType;
}

// TypeScript / JavaScript
const TS_JS_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Block comments (single-line portion)
  { pattern: /\/\*.*?\*\//, type: 'comment' },
  // Template literals
  { pattern: /`(?:[^`\\]|\\.)*`/, type: 'string' },
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

// Python
const PYTHON_RULES: LanguageRule[] = [
  // Comments
  { pattern: /#.*$/, type: 'comment' },
  // Triple-quoted strings
  { pattern: /"""[\s\S]*?"""/, type: 'string' },
  { pattern: /'''[\s\S]*?'''/, type: 'string' },
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

// Go
const GO_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Block comments
  { pattern: /\/\*.*?\*\//, type: 'comment' },
  // Double-quoted strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Raw strings
  { pattern: /`[^`]*`/, type: 'string' },
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

// Rust
const RUST_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Block comments
  { pattern: /\/\*.*?\*\//, type: 'comment' },
  // Double-quoted strings
  { pattern: /"(?:[^"\\]|\\.)*"/, type: 'string' },
  // Raw strings
  { pattern: /r#*"[^"]*"#*/, type: 'string' },
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

// JSON
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

// YAML
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

// Markdown
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
  // Code fence
  { pattern: /^```.*$/, type: 'comment' },
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

// Shell / Bash
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

// ---------------------------------------------------------------------------
// Extension-to-language mapping
// ---------------------------------------------------------------------------

type LanguageName = 'typescript' | 'python' | 'go' | 'rust' | 'json' | 'yaml' | 'markdown' | 'shell';

const EXTENSION_MAP: Record<string, LanguageName> = {
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
};

const LANGUAGE_RULES: Record<LanguageName, LanguageRule[]> = {
  typescript: TS_JS_RULES,
  python: PYTHON_RULES,
  go: GO_RULES,
  rust: RUST_RULES,
  json: JSON_RULES,
  yaml: YAML_RULES,
  markdown: MARKDOWN_RULES,
  shell: SHELL_RULES,
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
 * Detect the language from a file path based on extension.
 * Returns undefined if the extension is not recognized.
 */
export function detectLanguage(filePath: string): LanguageName | undefined {
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

  const rules = LANGUAGE_RULES[language];

  return lines.map((line) => {
    if (line.length === 0) {
      return new TextSpan({ text: '', style: new TextStyle({ foreground: config.default }) });
    }

    const tokens = tokenizeLine(line, rules);

    if (tokens.length === 1) {
      // Single token — return a simple TextSpan
      const token = tokens[0]!;
      return new TextSpan({
        text: token.text,
        style: new TextStyle({ foreground: colorForTokenType(token.type, config) }),
      });
    }

    // Multiple tokens — return TextSpan with children
    const children = tokens.map(
      (token) =>
        new TextSpan({
          text: token.text,
          style: new TextStyle({ foreground: colorForTokenType(token.type, config) }),
        }),
    );

    return new TextSpan({ children });
  });
}

/**
 * Map a token type to its corresponding color from the config.
 */
function colorForTokenType(type: TokenType, config: SyntaxHighlightConfig): Color {
  return config[type];
}
