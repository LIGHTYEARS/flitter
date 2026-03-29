# Agent 6 Analysis: Markdown Widget — Parsing and Rendering

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/markdown.ts` (845 lines)

## Overview

The `Markdown` widget is a `StatelessWidget` (Amp ref: `_g` class) that accepts raw markdown text and renders it as a tree of styled `Text` widgets inside a `Column`. The implementation is a self-contained, two-phase pipeline: (1) parse markdown source into a block-level AST, then (2) render each block into framework widgets with inline formatting applied via `TextSpan` trees. The design avoids any external markdown parsing library, keeping the zero-dependency constraint intact.

---

## 1. MarkdownBlock Types

The parser recognizes 11 distinct block types, expressed as a discriminated union `MarkdownBlockType`:

| Type | Source Pattern |
|------|---------------|
| `heading1` through `heading4` | `#` through `####` prefix |
| `bullet` | `- item` or `* item` |
| `numbered-list` | `1. item`, `2. item`, etc. |
| `blockquote` | `> text` (contiguous lines collected) |
| `horizontal-rule` | `---`, `***`, `___` (3+ chars) |
| `table` | GFM pipe tables detected by separator row |
| `code-block` | Fenced with triple backticks |
| `paragraph` | Everything else, with consecutive-line merging |

Each `MarkdownBlock` carries a `content` string plus optional metadata: `language` for code blocks, `listNumber` for numbered lists, and `tableHeaders`/`tableRows` for GFM tables. The interface is declared `readonly` throughout, making every parsed block effectively immutable -- important because blocks are stored in the LRU cache and reused across builds.

---

## 2. LRU Cache (`MarkdownCache`)

A custom `MarkdownCache` class wraps a `Map<string, MarkdownBlock[]>` and a parallel `string[]` array used as an ordering list to track recency. The default capacity is 100 entries, matching what the Amp source uses. On `get()`, the key is promoted to the end of the order array (most recently used). On `set()`, if the cache is at capacity the least recently used key is `shift()`-ed off and deleted. There is also `invalidate(key)` for targeted eviction and `clear()` for full resets.

The cache is instantiated as a module-level singleton `_astCache`. The `Markdown` widget exposes static `invalidateCache()` and `clearCache()` methods so callers can bust the cache when the underlying source changes.

The `build()` method checks the `enableCache` flag (defaulting to `true`) to decide whether to route through `parseMarkdown()` (cached) or `_parseMarkdownNoCache()` (uncached). This is a useful escape hatch when markdown content changes frequently and the cache would thrash.

A notable implementation detail: the LRU's `_order` array uses `indexOf()` for lookups, which is O(n) per access. At the 100-entry limit this is negligible, but it would not scale to larger caches. For this TUI use case the tradeoff is perfectly acceptable.

---

## 3. Block-Level Parsing (`_parseMarkdownNoCache`)

The parser operates as a line-by-line state machine with an index `i` walking through `lines = markdown.split('\n')`. Each iteration attempts to match the current line against block-level patterns in a priority order:

1. **Code blocks** (```` ``` ````): When detected, the parser enters a sub-loop collecting lines until a closing fence. The language hint (e.g., `typescript`, `python`) is extracted from text after the opening triple backtick.

2. **Headings** (`#` through `####`): Checked from most-specific (`####`) to least-specific (`#`) to avoid prefix ambiguity. Content is extracted by slicing off the prefix.

3. **Horizontal rules**: A two-regex test: first ensures the line is 3+ of `-`, `*`, or `_`; the second ensures homogeneity (all same character), preventing mixed lines like `-*-` from matching.

4. **GFM Tables**: The parser uses lookahead: if the *next* line matches the separator pattern (`| --- | --- |`), the current line is treated as a header row. The helper `_parseTableRow()` strips leading/trailing pipes and splits on `|`. Data rows are collected until a non-pipe or empty line.

5. **Blockquotes** (`>`): Contiguous `>` lines are aggregated into a single block. The `>` prefix (with optional trailing space) is stripped.

6. **Numbered lists** (`\d+\.\s+`): Captured with a regex; the ordinal is preserved in `listNumber`.

7. **Bullets** (`- ` or `* `): The prefix is stripped via regex replacement.

8. **Empty lines**: Skipped (they serve as block separators).

9. **Paragraphs** (fallback): Consecutive non-empty, non-special lines are merged into a single paragraph. The merging loop checks for every special-line pattern before continuing, ensuring that a heading, code fence, list item, blockquote, horizontal rule, or incipient table will break the paragraph. Merged lines are joined with a single space.

---

## 4. Inline Parsing (`parseInline`)

The `parseInline()` static method processes a string into `InlineSegment[]` using regex-based pattern matching on the remaining unconsumed text. Patterns are tested from the start of the remaining string (`^` anchor) in a specific priority order:

1. **Bold+Italic** (`***text***`): Must be checked before bold or italic individually.
2. **Bold** (`**text**`): Non-greedy inner match.
3. **Italic** (`*text*`): Non-greedy inner match.
4. **Strikethrough** (`~~text~~`): GFM extension.
5. **Inline code** (`` `code` ``): Single backtick, no nesting.
6. **Links** (`[text](url)`): Both text and URL captured.
7. **Plain text**: Consumes up to the next special character (`*`, `` ` ``, `[`, `~`).
8. **Single-character fallback**: If nothing matches, one character is consumed as plain text to avoid infinite loops.

Each segment is tagged with boolean flags (`bold`, `italic`, `code`, `linkText`, `linkUrl`, `strikethrough`, `boldItalic`). The `InlineSegment` interface uses optional booleans rather than a union type, which simplifies the `_segmentToSpan` mapping logic.

A limitation: nesting is not supported (e.g., bold inside italic inside a link). The regex approach inherently cannot handle recursive structures. For the TUI context, this is an appropriate simplification.

---

## 5. Block Rendering (`_renderBlock` Dispatch)

The `_renderBlock` method is a straightforward switch-case dispatcher mapping each `MarkdownBlockType` to its rendering function. The rendering methods receive the theme data and, for code blocks, the `BuildContext` for accessing `AppTheme`.

---

## 6. Heading Rendering (`_renderHeading`)

Headings use prefix characters to visually distinguish levels in the terminal:

| Level | Prefix | Color |
|-------|--------|-------|
| H1 | `"━ "` (heavy horizontal box char) | primary (blue) |
| H2 | `"─ "` (light horizontal box char) | textSecondary (dim) |
| H3 | `"· "` (middle dot) | primary (blue) |
| H4 | `""` (no prefix) | textSecondary (dim) |

All headings use bold styling. The pattern of alternating primary/secondary color between odd/even levels provides visual hierarchy without relying on font size changes (which are unavailable in terminals). Inline formatting is parsed within heading text, allowing constructs like `# Hello **World**`.

---

## 7. Code Block Rendering (`_renderCodeBlock`)

Code block rendering has two paths:

1. **Syntax-highlighted path**: If a `BuildContext` is available and a language hint is present, the method attempts to use the `AppTheme`'s `SyntaxHighlightConfig`. It constructs a synthetic file path (`file.${language}`) for language detection, then delegates to `syntaxHighlight()` which returns an array of `TextSpan` (one per line). Each line becomes a `Text` widget in a `Column`.

2. **Fallback path**: When syntax highlighting is unavailable (no context, no language hint, or unrecognized language), code is rendered as a single `TextSpan` with surface-color background and standard text foreground.

The `syntaxHighlight` module (in `syntax-highlight.ts`) uses `detectLanguage()` to map file extensions to rule sets, then tokenizes with regex-based rules for keywords, strings, comments, numbers, types, functions, operators, and punctuation. This provides basic but effective coloring for TypeScript/JavaScript, Python, Rust, Go, and other common languages.

---

## 8. GFM Table Rendering (`_renderTable`)

Table rendering computes column widths by taking the maximum string length across the header and all data rows for each column. The rendering produces three visual sections:

1. **Header row**: Bold, primary-colored text, cells padded with `padEnd()` to column width, separated by ` | ` (pipe with spaces).
2. **Separator row**: Box-drawing characters -- `━` repeated for column width, joined by `━┼━` at column boundaries. Rendered in border color.
3. **Data rows**: Standard text color, same padding and pipe separators as headers.

All rows are indented with two leading spaces. Each row is an individual `Text` widget, all collected into a `Column`. This approach handles variable-width Unicode text correctly because `padEnd()` operates on character count; however, there is a potential issue with CJK or other double-width characters, where `string.length` would undercount the visual width. The system does have `stringWidth` from `wcwidth` available in `text-span.ts`, but the table renderer does not use it.

---

## 9. Segment-to-Span Style Application (`_segmentToSpan`)

The `_segmentToSpan` method converts an `InlineSegment` into a `TextSpan` by progressively layering style modifications onto a base `TextStyle` using `copyWith()`:

- **Bold+Italic**: `{ bold: true, italic: true }`
- **Bold**: `{ bold: true }`
- **Italic**: `{ italic: true }`
- **Strikethrough**: `{ strikethrough: true }`
- **Inline code**: `{ bold: true, foreground: Color.yellow }` -- the Amp style renders inline code as bold yellow text rather than with a background box, a pragmatic choice for terminal rendering.
- **Links**: `{ foreground: primaryColor, underline: true }` plus the `hyperlink` property with `{ uri: segment.linkUrl }`, enabling OSC 8 terminal hyperlink support in compatible terminal emulators.

Style flags are checked individually and applied cumulatively, which means segments can technically carry multiple flags (though the parser does not produce them due to the non-nesting regex approach).

---

## 10. Additional Block Types

**Bullets** are rendered with a `"  * "` prefix (Unicode bullet character U+2022) in secondary/dim color, followed by inline-parsed content spans.

**Numbered lists** use a `"  N. "` prefix in dim `brightBlack`, with the ordinal number preserved from parsing.

**Blockquotes** render with a `"  | "` (Unicode box drawing U+2502) left border in `info` color (bright blue). Multi-line blockquotes produce one `Text` widget per line, all wrapped in a `Column`. Content is rendered in `brightBlack` (dim), and inline formatting is still applied within quote text.

**Horizontal rules** delegate to the `Divider` widget with the theme's border color.

---

## 11. Widget Construction

The `Markdown` widget's `build()` method collects all rendered block widgets into a `Column` with `crossAxisAlignment: 'stretch'` and `mainAxisSize: 'min'`. Options for `textAlign`, `maxLines`, and `overflow` are propagated to individual `Text` widgets, providing scroll-view and truncation compatibility.

If parsing produces zero blocks (e.g., from an empty string), a single empty `Text` widget is emitted to prevent the `Column` from having zero children.

---

## 12. Architecture Summary

The Markdown widget follows a clean separation of concerns: parsing is stateless and cacheable (exposed as static methods for testability), rendering is theme-aware and context-dependent, and the inline formatting pipeline converts flat text into `TextSpan` trees compatible with the framework's text rendering infrastructure. The LRU cache ensures repeated renders of the same markdown content (common during TUI redraws) avoid redundant parsing. The overall design achieves a practical subset of CommonMark/GFM that covers the formatting patterns most relevant to a chat-oriented TUI application.
