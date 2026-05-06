/**
 * Language name normalization for Prism.js syntax highlighting.
 *
 * Maps file extensions and common language aliases to Prism.js grammar names.
 *
 * 逆向: modules/0479_unknown_$m0.js — $m0() language name normalization
 *
 * @module
 */

/**
 * Maps file extensions / common aliases to Prism.js grammar names.
 *
 * Mirrors the lookup table in amp's $m0() function.
 */
const EXT_TO_LANG: Record<string, string> = {
  // JavaScript
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  javascript: "javascript",
  // TypeScript
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  // Python
  py: "python",
  pyw: "python",
  python: "python",
  // Java
  java: "java",
  // C
  c: "c",
  h: "c",
  // C++
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  "c++": "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
  // C#
  cs: "csharp",
  csharp: "csharp",
  // Go
  go: "go",
  golang: "go",
  // Rust
  rs: "rust",
  rust: "rust",
  // Ruby
  rb: "ruby",
  ruby: "ruby",
  // PHP
  php: "php",
  // Swift
  swift: "swift",
  // Kotlin
  kt: "kotlin",
  kts: "kotlin",
  kotlin: "kotlin",
  // Dart
  dart: "dart",
  // Shell
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  shell: "bash",
  // SQL
  sql: "sql",
  // JSON
  json: "json",
  // YAML
  yaml: "yaml",
  yml: "yaml",
  // Markdown
  md: "markdown",
  markdown: "markdown",
  // Zig
  zig: "zig",
  // Pascal
  pas: "pascal",
  pascal: "pascal",
  // Markup (HTML/XML/SVG)
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  markup: "markup",
  // CSS
  css: "css",
};

/**
 * Normalize a language identifier to a Prism.js grammar name.
 *
 * Handles file extensions, common aliases, and case-insensitive matching.
 * Returns "plain" if no mapping is found (matching amp's behavior).
 *
 * 逆向: modules/0479_unknown_$m0.js — returns mapped name or "plain"
 *
 * @param lang - Language string (e.g., "ts", "typescript", "python")
 * @returns Prism.js grammar name (e.g., "typescript", "python")
 */
export function normalizeLangName(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return EXT_TO_LANG[lower] ?? "plain";
}
