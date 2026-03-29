# Analysis 25: Syntax Highlighting System

## File Locations

- **Primary module**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/syntax-highlight.ts`
- **Tests**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/syntax-highlight.test.ts`
- **Theme config**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/app-theme.ts` (defines `SyntaxHighlightConfig`)
- **Markdown integration**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/markdown.ts`
- **DiffView integration**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/diff-view.ts`
- **Public exports**: `/home/gem/workspace/flitter/packages/flitter-core/src/index.ts`

## Architectural Overview

The syntax highlighting system is a regex-based, line-at-a-time tokenizer that transforms source code strings into arrays of `TextSpan` objects with per-token coloring. It is referenced in comments as deriving from the Amp CLI's `ae` function, which performed file-extension-based syntax highlighting in the original binary.

The system is organized into three layers: language detection, tokenization, and span construction. The two public exports are `detectLanguage` and `syntaxHighlight`. Both are re-exported from the package index for use by consumers.

## Language Detection (`detectLanguage`)

The `detectLanguage` function accepts a file path string and returns a `LanguageName` or `undefined`. It works by extracting the file extension via a helper function `getExtension`, which locates the last dot in the path, handles edge cases like dotfiles with no real extension (e.g., `.gitignore`), and normalizes the result to lowercase.

The extracted extension is looked up in `EXTENSION_MAP`, a static `Record<string, LanguageName>` covering 16 extensions mapped to 8 language names:

| Language Name | Extensions |
|--------------|------------|
| `typescript` | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` |
| `python` | `.py`, `.pyw` |
| `go` | `.go` |
| `rust` | `.rs` |
| `json` | `.json`, `.jsonc` |
| `yaml` | `.yaml`, `.yml` |
| `markdown` | `.md`, `.mdx` |
| `shell` | `.sh`, `.bash`, `.zsh` |

JavaScript and JSX files are mapped to `typescript` rules since the TS/JS rule set covers both languages.

## Token Types and SyntaxHighlightConfig

The system defines 13 token types as a union type `TokenType`:

```
keyword | string | comment | number | type | function | operator | punctuation | variable | property | tag | attribute | default
```

The `SyntaxHighlightConfig` interface (defined in `app-theme.ts`) mirrors this union exactly, with each token type mapped to a `Color` value. This config is part of the broader `AppThemeData` structure, accessed at runtime through `AppTheme.maybeOf(context)` in the widget tree. The `default` color is used for any text that does not match a specific rule and for files whose extension is unrecognized.

## Regex-Based Tokenizer

Each supported language has a corresponding array of `LanguageRule` objects, where each rule is a `{ pattern: RegExp, type: TokenType }` pair. These are defined as module-level constants: `TS_JS_RULES`, `PYTHON_RULES`, `GO_RULES`, `RUST_RULES`, `JSON_RULES`, `YAML_RULES`, `MARKDOWN_RULES`, and `SHELL_RULES`.

The rules are ordered by priority within each language. The tokenizer (`tokenizeLine`) processes a single line by scanning forward from position 0. At each position it tries every rule, creating a fresh `RegExp` with the `g` flag (starting from `lastIndex = pos`) and executing it against the line. The rule that produces the earliest match wins. If that match is at exactly the current position, the tokenizer short-circuits and uses it immediately. Any text between the current position and the match start is emitted as a `default` token. Once the best match is consumed, the position advances past it and the loop repeats until the entire line is covered.

This greedy-leftmost approach ensures that higher-priority patterns (listed earlier in the rules array) win ties when two patterns match at the same index, since the loop breaks on exact-position matches. For example, in TypeScript rules, comments and strings precede keywords, so `"const"` inside a string is not misidentified as a keyword.

### Language Rule Highlights

- **TypeScript/JavaScript**: 77 keywords including `async`, `await`, `readonly`, `interface`; PascalCase identifiers treated as `type`; function calls detected by trailing `(`; template literals, hex/binary/octal numbers.
- **Python**: Prefix-aware strings (`f"..."`, `r"..."`, `b"..."`); triple-quoted strings; decorators detected as `attribute`; built-in types like `int`, `float`, `Exception` explicitly listed.
- **Rust**: Lifetime annotations (`'a`) as `attribute`; macro invocations (`println!`) as `function`; type suffixes on numeric literals (`42u32`).
- **Go**: Channel operator `<-` as operator; rune literals; built-in numeric types (`int8` through `uint64`).
- **JSON**: Property keys (strings followed by `:`) distinguished from string values; booleans and `null` as keywords.
- **YAML**: Keys before colons as `property`; anchors/aliases (`&name`, `*name`) as `attribute`; type tags (`!!str`) as `tag`.
- **Markdown**: Headings as `keyword`; bold as `variable`; italic as `attribute`; inline code as `string`; links/images as `function`.
- **Shell**: Variable references (`$HOME`, `${var}`, `$?`) as `variable`; command substitution `$(...)` as `function`; common built-in commands (`grep`, `sed`, `awk`) as `function`.

## Producing Colored TextSpan Arrays

The main `syntaxHighlight` function takes three parameters: the source `content` string, a `SyntaxHighlightConfig`, and a `filePath` for language detection. It returns a `TextSpan[]` with one element per line.

The process:
1. If content is empty, return a single empty `TextSpan` with the default color.
2. Call `detectLanguage(filePath)`. If the language is unrecognized, wrap every line in a `TextSpan` with the default color and return.
3. Split content on `\n` and iterate each line.
4. Empty lines get an empty `TextSpan` with default color.
5. Non-empty lines are passed to `tokenizeLine`, producing a `Token[]`.
6. If there is exactly one token, a simple `TextSpan` is returned with `text` and a `TextStyle` whose `foreground` is the color looked up via `colorForTokenType(token.type, config)`.
7. If there are multiple tokens, a parent `TextSpan` is created with `children`, where each child is a `TextSpan` for one token with its corresponding color. The parent has no text of its own.

The `colorForTokenType` function is a trivial lookup: `config[type]`, leveraging the fact that `TokenType` values are keys of `SyntaxHighlightConfig`.

## Integration with Markdown Code Blocks

In `markdown.ts`, the `_renderCodeBlock` method handles fenced code blocks (` ```language `). When both a `BuildContext` and a language hint are available, it:
1. Retrieves `AppThemeData` from the widget tree via `AppTheme.maybeOf(context)`.
2. Constructs a synthetic file path (`file.${language}`) and calls `detectLanguage` on it.
3. If the language is recognized, calls `syntaxHighlight(content, appThemeData.syntaxHighlight, syntheticPath)`.
4. Maps each returned `TextSpan` into a `Text` widget and arranges them in a `Column`.
5. If highlighting is unavailable (no AppTheme, unrecognized language), falls back to a monochrome styled text block.

## Integration with DiffView

In `diff-view.ts`, syntax highlighting is applied to diff content lines of type `addition` and `context` (but not `deletion` or `meta`). The integration:
1. Checks that `appThemeData` and `this.filePath` are both available.
2. Strips the leading diff character (`+` or space) from the line content to get `rawContent`.
3. Calls `syntaxHighlight(rawContent, appThemeData.syntaxHighlight, this.filePath)` using the actual file path, which gives accurate language detection.
4. Prepends a prefix `TextSpan` (containing line numbers and the diff leading character) to the highlighted spans, then wraps everything in a parent `TextSpan` with children.
5. The combined span is rendered as a `Text` widget.

This means diff views get per-token coloring on addition and context lines, while deletions, meta lines, and hunk headers use the diff's own coloring scheme.

## Test Coverage

The test file (`syntax-highlight.test.ts`) contains approximately 50 test cases organized into groups:

- **detectLanguage**: All 16 extension mappings, unknown extensions, full paths, case-insensitive handling.
- **Basic behavior**: One TextSpan per line, text content preservation, empty content handling, empty lines within content.
- **Per-language highlighting**: TypeScript (keywords, strings, comments, numbers, types, functions, template literals), Python (keywords, strings, comments, decorators), Go, Rust (including macros), JSON (properties vs. string values, numbers, booleans/null), YAML (comments, keys, strings), Markdown (headings, inline code, bold), Shell (comments, keywords, strings, variable references).
- **Config color application**: Custom keyword color, custom string color, custom default color for unknown extensions.
- **Edge cases**: Very long lines, special regex characters in source, multiline content splitting, whitespace preservation, mixed-case file extensions.

Tests use a `hasColor` helper that recurses through TextSpan children to verify that specific colors from the config appear in the output, and a `collectText` helper that concatenates plain text across all spans.

## Design Characteristics

The system deliberately avoids an AST-based or grammar-based approach (like TextMate grammars or Tree-sitter). Instead it uses a simple, self-contained regex tokenizer with no external dependencies, consistent with the project's constraint of zero transitive runtime dependencies. The tradeoff is lower accuracy on complex nested constructs (e.g., multi-line block comments, nested template literals) but sufficient fidelity for the terminal UI context where approximate highlighting is acceptable. Each line is tokenized independently, which means multi-line constructs like block comments spanning several lines will only highlight the portions that match single-line patterns.
