# Analysis 21: DiffView Widget for Unified Diff Rendering

## File Under Analysis

**Primary file:** `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/diff-view.ts`

## Overview

`DiffView` is a `StatelessWidget` (Amp reference: `Bn` class) that accepts a unified diff string and renders it as a color-coded, line-by-line display within the Flitter TUI framework. It serves as the central diff-rendering primitive consumed by higher-level tool cards in the Amp layer. The implementation is entirely self-contained: it includes its own Myers diff algorithm, word-level diff computation, unified diff parser, and theme-aware styling -- all with zero external runtime dependencies.

## Type System

The module defines four exported types that model the parsed diff structure:

- **`DiffLineType`** -- a discriminated string union with five members: `'addition'`, `'deletion'`, `'hunk-header'`, `'context'`, and `'meta'`. Every parsed line is classified into one of these, and this classification drives both styling and line-number logic.
- **`DiffLine`** -- a readonly interface carrying `type`, `content`, and optional `oldLineNumber` / `newLineNumber`. Additions carry only a `newLineNumber`; deletions carry only an `oldLineNumber`; context lines carry both.
- **`DiffHunk`** -- groups a `header` string, an array of `DiffLine` items, and the `oldStart` / `newStart` offsets extracted from the `@@ -N,M +N,M @@` header.
- **`WordDiff`** -- a segment from the word-level diff algorithm with `text` and a `type` of `'same'`, `'added'`, or `'removed'`.

## Constructor and Configuration

The constructor accepts an options object with six fields:

| Property | Default | Purpose |
|---|---|---|
| `diff` | (required) | The unified diff string to parse and render |
| `showLineNumbers` | `true` | Prepends old/new line numbers (padded to 4 digits) to each line |
| `context` | `undefined` | When set, limits display to N context lines around each change |
| `filePath` | `undefined` | Hint for syntax highlighting within diff content |
| `ignoreWhitespace` | `false` | Strips trailing whitespace for comparison purposes in `computeDiff` |
| `wordLevelDiff` | `true` | Enables word-level highlighting for adjacent deletion/addition pairs |

## Diff Parsing (`parseDiff`)

The static `parseDiff` method splits a unified diff string by newline and iterates through each line. It recognizes three structural zones:

1. **Meta lines** -- Lines appearing before any hunk header (`diff --git`, `index`, `--- a/file`, `+++ b/file`). These are collected into a virtual hunk with the sentinel header `'__meta__'`.
2. **Hunk headers** -- Lines matching the regex `^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)$`. When matched, the parser starts a new hunk, extracting `oldStart` and `newStart` as integers and initializing running counters `oldLine` and `newLine`.
3. **Content lines within a hunk** -- Classified by their first character: `+` for additions, `-` for deletions, the special string `\ No newline at end of file` for meta, and anything else (including space-prefixed or empty lines) as context. Line numbers are tracked incrementally: additions increment only `newLine`, deletions increment only `oldLine`, and context lines increment both.

The parser returns an array of `DiffHunk` objects. When the diff string is empty, an empty array is returned.

## Build and Rendering

The `build` method retrieves theme data via `Theme.maybeOf(context)` and optionally `AppTheme.maybeOf(context)` for syntax highlighting. It calls `parseDiff` to obtain hunks, then `_collectDisplayLines` to flatten them into a single line array (inserting hunk header pseudo-lines and applying context filtering when `this.context` is set).

For each line, the widget produces a `Text` widget wrapping a `TextSpan`. The styling is determined by `_styleForLineType`, which maps each `DiffLineType` to theme colors:

| Line Type | Theme Field | Fallback Color |
|---|---|---|
| `addition` | `themeData.diffAdded` | `Color.rgb(80, 200, 120)` -- green |
| `deletion` | `themeData.diffRemoved` | `Color.rgb(240, 80, 80)` -- red |
| `hunk-header` | `themeData.info` | `Color.rgb(97, 175, 239)` -- cyan/blue |
| `meta` | `themeData.textSecondary` | `Color.rgb(150, 150, 150)` -- gray, bold |
| `context` | `themeData.text` | `Color.rgb(220, 220, 220)` -- light gray |

When `showLineNumbers` is true, each non-meta, non-header line is prefixed with two 4-character-wide number columns (old and new), separated by a space.

### Word-Level Diff Rendering

When `wordLevelDiff` is enabled (default), the build loop detects adjacent deletion-then-addition pairs. For each such pair, it strips the leading `-`/`+` prefix, calls `computeWordDiff` to tokenize both lines and run Myers diff at the token level, then builds `TextSpan` children with word-level background highlighting:

- On the **deletion line**, tokens of type `'removed'` get a dark red background (`Color.rgb(60, 0, 0)`).
- On the **addition line**, tokens of type `'added'` get a dark green background (`Color.rgb(0, 60, 0)`).
- Tokens of type `'same'` use the base line style with no special background.
- The opposite type is skipped entirely (e.g., `'added'` tokens do not appear on the deletion line).

This logic is handled by `_buildWordDiffSpans`, which constructs the prefix (line numbers plus the leading `+`/`-` character) as a separate `TextSpan`, then appends one `TextSpan` per word-diff segment.

### Syntax Highlighting Integration

When an `AppTheme` is available and a `filePath` is set, addition and context lines have their content (minus the leading `+`/space character) passed through `syntaxHighlight()`. The resulting highlighted spans are prepended with a prefix span (line numbers plus leading character) styled in the line's base color. This produces syntax-colored diff content that preserves the addition/context color on the prefix while the code body gets language-aware coloring.

### Context Filtering

When `this.context` is set, `_filterContextLines` marks each line within N positions of a changed line (addition or deletion) as included. It then collects only included lines, inserting a `'  ...'` meta separator wherever there is a gap. This allows large hunks to be displayed compactly, showing only the immediately relevant neighborhood of each change.

## Myers Diff Algorithm (`computeDiff` and `_myersDiff`)

The static `computeDiff` method accepts two text strings and produces a unified diff string from scratch. It splits both texts into line arrays, optionally normalizes trailing whitespace via `trimEnd()`, and delegates to the private `_myersDiff` generic method.

`_myersDiff` implements the classic O(ND) Myers algorithm using a `V` array (`Int32Array`) indexed from `-MAX` to `MAX` via an offset. It stores a copy of the V array at each D-step into `vHistory` for trace-back. After finding the shortest edit script, it traces backwards through `vHistory` to reconstruct the sequence of equal/insert/delete operations.

Edge cases are handled explicitly: when both arrays are empty, an empty result is returned; when one side is empty, all-inserts or all-deletes are produced directly.

The edit script is then grouped into hunks by `_buildHunks`, which expands change regions with configurable context lines (default 3), merges overlapping ranges, and formats each hunk with proper 1-based line numbers in the `@@ -N,M +N,M @@` format.

## Word-Level Tokenization

The private static `_tokenizeWords` splits a line into alternating word and whitespace tokens using the regex `/(\s+|\S+)/g`. This preserves whitespace as discrete tokens so that the word-level diff accurately reflects spacing changes. The tokens are then passed to `_myersDiff` for comparison, producing `WordDiff` segments that `_buildWordDiffSpans` consumes for rendering.

## Integration with Amp Layer Tool Cards

### EditFileTool

Located at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/edit-file-tool.ts`, the `EditFileTool` widget renders `edit_file`, `apply_patch`, and `undo_edit` tool calls. When expanded, it calls `extractDiff()` which looks for unified diff markers (`@@`, `---`, `+++`) in the tool result's `rawOutput` or `content`. If the tool input contains `old_str`/`new_str` instead of a precomputed diff, it synthesizes a minimal unified diff by prefixing old lines with `-` and new lines with `+` around a synthetic `@@ @@` header. The extracted diff string is passed directly to `new DiffView({ diff, showLineNumbers: true })`, wrapped in `Padding` with 2-character left and right insets.

### GenericToolCard

Located at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts`, the `GenericToolCard` is the default renderer for all tool types. Its `extractDiff()` method uses the same heuristic (checking for `@@` plus `---`/`+++` markers) to determine whether tool output should be rendered as a diff. When a diff is detected, it creates `new DiffView({ diff })` wrapped in padding. When no diff is found, the output falls back to a `Markdown` widget instead. The card wraps both the header and body in a `StickyHeader` for scroll behavior.

### DiffCard

Located at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/diff-card.ts`, the `DiffCard` widget provides a bordered, standalone diff display. It wraps a `DiffView` in a `Container` with a rounded border decoration and explicitly overrides theme colors by constructing a `Theme` wrapper that sets `diffAdded` from `theme.app.diffAdded` (falling back to `Color.green`) and `diffRemoved` from `theme.app.diffRemoved` (falling back to `Color.red`). A bold file path header appears above the diff content. This demonstrates how the DiffView's theme-based color system can be externally controlled by wrapping it in a `Theme` InheritedWidget.

## Theme Integration

The `ThemeData` interface (defined in `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/theme.ts`) includes two dedicated diff color fields:

- `diffAdded: Color` -- defaulting to `Color.green` (Amp: `w0.green`)
- `diffRemoved: Color` -- defaulting to `Color.red` (Amp: `w0.red`)

DiffView reads these via `Theme.maybeOf(context)`, making it fully responsive to theme changes propagated through the widget tree. The `_styleForLineType` method always provides hardcoded fallback colors (`rgb(80, 200, 120)` for additions, `rgb(240, 80, 80)` for deletions) when no theme is available, ensuring the diff is readable even outside a themed context.

## Test Coverage

The test file at `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/diff-view.test.ts` provides extensive coverage across seven test groups:

1. **Parsing tests** -- Verifying meta/hunk classification, line type assignment, multi-hunk handling, and edge cases like `\ No newline at end of file`.
2. **Line number tracking** -- Confirming that additions carry only `newLineNumber`, deletions carry only `oldLineNumber`, and context lines carry both.
3. **Widget construction** -- Ensuring defaults (`showLineNumbers: true`, `context: undefined`) and that construction with all options does not error.
4. **Context filtering** -- Testing that `context=0` reduces display to only changed lines.
5. **computeDiff (Myers)** -- Testing single-line changes, empty inputs, completely different content, ordering (deletions before additions), context line preservation, custom filenames, configurable context lines, and whitespace ignoring.
6. **computeWordDiff** -- Testing changed words, identical lines, empty strings, completely different lines, whitespace preservation, and single-word lines.
7. **Word-level diff rendering logic** -- Verifying pair detection for adjacent deletion+addition, non-pairing of non-adjacent changes, multiple consecutive pairs, and correct text reconstruction from word-diff segments.

## Summary

The `DiffView` widget is a comprehensive, self-contained unified diff renderer. It parses standard unified diff format, classifies lines into five visual categories, renders them with theme-driven colors and optional line numbers, supports word-level intra-line highlighting for changed pairs, integrates with syntax highlighting, and provides configurable context filtering. Its static `computeDiff` method can also generate unified diffs from raw text pairs using a built-in Myers O(ND) algorithm. The widget is consumed by three Amp-layer components -- `EditFileTool`, `GenericToolCard`, and `DiffCard` -- each of which extracts diff strings from tool call results and delegates rendering entirely to `DiffView`.
