# Gap SH02: No Multi-Line Syntax Construct Support

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Limitation Analysis

### 1.1 The Tokenizer Architecture Today

The syntax highlighting system lives in `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/syntax-highlight.ts`. It is a regex-based, line-at-a-time tokenizer that processes each line of source code independently.

The core public function `syntaxHighlight()` (lines 414-466) splits content on `\n` and maps each line through `tokenizeLine()`:

```typescript
// syntax-highlight.ts lines 423-444
const lines = content.split('\n');

// ...

return lines.map((line) => {
    if (line.length === 0) {
      return new TextSpan({ text: '', style: new TextStyle({ foreground: config.default }) });
    }

    const tokens = tokenizeLine(line, rules);
    // ...
});
```

The `tokenizeLine()` function (lines 355-393) operates on a **single string** -- it has no concept of prior lines' state, no "continuation" context, and no way to know whether the current line is inside a multi-line construct that began on a previous line:

```typescript
// syntax-highlight.ts lines 355-393
function tokenizeLine(line: string, rules: LanguageRule[]): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < line.length) {
    let bestMatch: { text: string; type: TokenType } | undefined;
    let bestIndex = line.length;

    for (const rule of rules) {
      const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('m') ? 'gm' : 'g');
      re.lastIndex = pos;
      const match = re.exec(line);

      if (match && match.index !== undefined && match.index < bestIndex && match.index >= pos) {
        bestIndex = match.index;
        bestMatch = { text: match[0], type: rule.type };
        if (bestIndex === pos) break;
      }
    }

    if (bestMatch && bestIndex < line.length) {
      if (bestIndex > pos) {
        tokens.push({ type: 'default', text: line.slice(pos, bestIndex) });
      }
      tokens.push({ type: bestMatch.type, text: bestMatch.text });
      pos = bestIndex + bestMatch.text.length;
    } else {
      tokens.push({ type: 'default', text: line.slice(pos) });
      pos = line.length;
    }
  }

  return tokens;
}
```

The function signature `tokenizeLine(line: string, rules: LanguageRule[])` accepts no state parameter and returns no state. Each line is a fresh, isolated tokenization pass.

### 1.2 Language Rules That Attempt Multi-Line Constructs (and Fail)

Several language rule sets contain patterns that nominally address multi-line constructs but only match their single-line portions:

**TypeScript/JavaScript (lines 45-77):**

```typescript
// Line 48-49: Block comments -- only matches /* ... */ on a SINGLE line
{ pattern: /\/\*.*?\*\//, type: 'comment' },
// Line 51: Template literals -- only matches backtick-to-backtick on a SINGLE line
{ pattern: /`(?:[^`\\]|\\.)*`/, type: 'string' },
```

The block comment pattern `/\/\*.*?\*\//` uses `.*?` which does not cross `\n` boundaries (the dot metacharacter does not match newlines by default), and because `tokenizeLine` operates on a single line, even adding the `s` (dotAll) flag would not help -- the input string itself is only one line.

**Python (lines 80-114):**

```typescript
// Lines 84-85: Triple-quoted strings -- [\s\S]*? CAN match newlines in theory,
// but tokenizeLine only receives one line at a time, so these never span lines.
{ pattern: /"""[\s\S]*?"""/, type: 'string' },
{ pattern: /'''[\s\S]*?'''/, type: 'string' },
```

The `[\s\S]*?` idiom is meant to match across newlines, but since the tokenizer only processes one line at a time, `"""` that starts a docstring on one line never sees the closing `"""` on a subsequent line.

**Go (lines 117-150):**

```typescript
// Line 121: Same single-line-only block comment
{ pattern: /\/\*.*?\*\//, type: 'comment' },
// Line 125: Raw strings -- backtick-to-backtick on one line only
{ pattern: /`[^`]*`/, type: 'string' },
```

**Rust (lines 153-189):**

```typescript
// Line 156: Same single-line-only block comment
{ pattern: /\/\*.*?\*\//, type: 'comment' },
```

### 1.3 The `LanguageRule` Interface Is Stateless

The `LanguageRule` interface (lines 39-42) carries no concept of "open/close" or "start/continuation/end":

```typescript
interface LanguageRule {
  readonly pattern: RegExp;
  readonly type: TokenType;
}
```

It is a flat mapping from a regex pattern to a token type. There is no mechanism to express "this rule opens a multi-line region" or "this rule continues a region opened on a prior line."

### 1.4 Amp Analysis Confirmation

The analysis in `/home/gem/workspace/flitter/amp-src-analysis-25.md` (line 115) explicitly documents this limitation:

> "The system deliberately avoids an AST-based or grammar-based approach... The tradeoff is lower accuracy on complex nested constructs (e.g., multi-line block comments, nested template literals) but sufficient fidelity for the terminal UI context where approximate highlighting is acceptable. Each line is tokenized independently, which means multi-line constructs like block comments spanning several lines will only highlight the portions that match single-line patterns."

---

## 2. Constructs That Break

### 2.1 Block Comments (C-style: JS/TS/Go/Rust)

```typescript
/* This is a block comment
   that spans multiple lines
   and ends here */
const x = 42;
```

**Current behavior:**
- Line 1: `/*` matched by `/\/\*.*?\*\//` fails because there is no `*/` on line 1. The `/*` falls through to operator rules and is colored as operator. "This is a block comment" is colored as default text.
- Line 2: "   that spans multiple lines" -- entire line colored as default text.
- Line 3: "   and ends here */" -- `*/` matched as operator; "and ends here" as default text.
- Line 4: Highlighted correctly (independent line).

**Expected behavior:** All of lines 1-3 should be colored as `comment`.

### 2.2 Python Triple-Quoted Strings / Docstrings

```python
def foo():
    """
    This is a docstring.
    It spans multiple lines.
    """
    return 42
```

**Current behavior:**
- Line 2: `"""` alone on a line -- the pattern `/"""[\s\S]*?"""/` looks for opening and closing `"""` on the same line. With only `"""`, it matches zero characters between them (empty triple-quoted string `""""""` would match, but single `"""` has no closing pair on this line). Result: each `"` matched individually as strings, or the line falls to default.
- Lines 3-4: Colored as default text (keywords like `This`, `It` might falsely match).
- Line 5: Same as line 2.

**Expected behavior:** Lines 2-5 should all be colored as `string`.

### 2.3 JavaScript/TypeScript Template Literals

```typescript
const query = `
  SELECT *
  FROM users
  WHERE id = ${userId}
`;
```

**Current behavior:**
- Line 1: The backtick opens but the pattern `/`(?:[^`\\]|\\.)*`/` requires a closing backtick on the same line. No match; backtick colored as operator or default.
- Lines 2-4: Colored as default text with potential keyword false positives (`FROM`, etc.).
- Line 5: Closing backtick colored as operator or default.

**Expected behavior:** Lines 1-5 should be colored as `string` (with `${userId}` potentially getting special interpolation highlighting).

### 2.4 Go Raw String Literals

```go
var tmpl = `
<html>
  <body>{{.Name}}</body>
</html>
`
```

**Current behavior:** Same as template literals -- the backtick-delimited pattern only works single-line. Inner HTML content gets no string highlighting.

**Expected behavior:** All lines between backticks should be colored as `string`.

### 2.5 Rust Raw Strings

```rust
let s = r#"
    This is a raw string
    that spans multiple lines
"#;
```

**Current behavior:** The pattern `/r#*"[^"]*"#*/` (line 161) requires both the opening `r#"` and closing `"#` on the same line. Multi-line raw strings get no string highlighting on continuation lines.

### 2.6 Shell Heredocs

```bash
cat <<EOF
Hello, world!
This is a heredoc.
EOF
```

**Current behavior:** No heredoc rules exist at all in `SHELL_RULES` (lines 255-284). The `<<EOF` is tokenized as operators (`<<`) and a variable (`EOF`). The content lines are tokenized as regular shell code, potentially causing false keyword matches.

**Expected behavior:** Lines between `<<EOF` and `EOF` should be colored as `string`.

### 2.7 Markdown Fenced Code Blocks

```markdown
Some text.

` ` `python
def hello():
    print("hi")
` ` `

More text.
```

**Current behavior:** The opening and closing fences are matched by `/^```.*$/` (line 239) and colored as `comment`, but lines 4-5 between the fences are tokenized with *markdown rules*, not code-aware rules. They get no code highlighting and may be mis-tokenized (e.g., `def` is not a markdown keyword).

**Expected behavior:** Content between fences should either be highlighted with the specified language's rules, or at minimum treated as a unified `string`/`comment` block rather than being parsed as markdown.

---

## 3. Proposed Stateful Tokenizer Design

### 3.1 Design Goals

1. **Backward compatible** -- Existing single-line highlighting must produce identical results.
2. **Minimal API surface change** -- The public `syntaxHighlight()` signature remains the same.
3. **No external dependencies** -- Consistent with the project's zero-dependency constraint.
4. **Incremental** -- State flows forward line-by-line; no full-document re-parse needed.
5. **Language-extensible** -- Adding new multi-line constructs for a language should require only adding rule entries, not modifying the tokenizer core.

### 3.2 New Types

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/syntax-highlight.ts`

Add the following types after the existing `Token` and `LanguageRule` interfaces:

```typescript
// ---------------------------------------------------------------------------
// Multi-line state tracking
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
}

/** The "no state" sentinel -- used for the first line of any file. */
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
}
```

### 3.3 Multi-Line Rule Definitions Per Language

Add multi-line rule arrays alongside the existing single-line rule arrays:

```typescript
// TypeScript / JavaScript multi-line rules
const TS_JS_MULTILINE_RULES: MultiLineRule[] = [
  // Block comments: /* ... */
  {
    open: /\/\*/,
    close: /\*\//,
    type: 'comment',
  },
  // Template literals: ` ... `
  {
    open: /`/,
    close: /`/,
    type: 'string',
  },
];

// Python multi-line rules
const PYTHON_MULTILINE_RULES: MultiLineRule[] = [
  // Triple double-quoted strings: """ ... """
  {
    open: /"""/,
    close: /"""/,
    type: 'string',
  },
  // Triple single-quoted strings: ''' ... '''
  {
    open: /'''/,
    close: /'''/,
    type: 'string',
  },
];

// Go multi-line rules
const GO_MULTILINE_RULES: MultiLineRule[] = [
  // Block comments
  {
    open: /\/\*/,
    close: /\*\//,
    type: 'comment',
  },
  // Raw strings (backtick)
  {
    open: /`/,
    close: /`/,
    type: 'string',
  },
];

// Rust multi-line rules
const RUST_MULTILINE_RULES: MultiLineRule[] = [
  // Block comments (including nested -- simplified: no nesting tracking)
  {
    open: /\/\*/,
    close: /\*\//,
    type: 'comment',
  },
  // Raw strings: r#"..."# (simplified)
  {
    open: /r#*"/,
    close: /"#*/,
    type: 'string',
  },
];

// Shell multi-line rules
const SHELL_MULTILINE_RULES: MultiLineRule[] = [
  // Heredocs: <<EOF ... EOF (simplified to common delimiters)
  {
    open: /<<-?\s*'?(\w+)'?/,
    close: /^(\w+)$/,  // Delimiter match handled specially -- see Section 3.5
    type: 'string',
  },
];

// Markdown multi-line rules
const MARKDOWN_MULTILINE_RULES: MultiLineRule[] = [
  // Fenced code blocks: ``` ... ```
  {
    open: /^```/,
    close: /^```\s*$/,
    type: 'string',
  },
];

// JSON and YAML have no multi-line constructs that need tracking
const JSON_MULTILINE_RULES: MultiLineRule[] = [];
const YAML_MULTILINE_RULES: MultiLineRule[] = [];
```

### 3.4 Updated Language Registry

Extend `LANGUAGE_RULES` to include multi-line rules:

```typescript
interface LanguageDefinition {
  readonly rules: LanguageRule[];
  readonly multiLineRules: MultiLineRule[];
}

const LANGUAGE_DEFS: Record<LanguageName, LanguageDefinition> = {
  typescript: { rules: TS_JS_RULES, multiLineRules: TS_JS_MULTILINE_RULES },
  python:     { rules: PYTHON_RULES, multiLineRules: PYTHON_MULTILINE_RULES },
  go:         { rules: GO_RULES, multiLineRules: GO_MULTILINE_RULES },
  rust:       { rules: RUST_RULES, multiLineRules: RUST_MULTILINE_RULES },
  json:       { rules: JSON_RULES, multiLineRules: JSON_MULTILINE_RULES },
  yaml:       { rules: YAML_RULES, multiLineRules: YAML_MULTILINE_RULES },
  markdown:   { rules: MARKDOWN_RULES, multiLineRules: MARKDOWN_MULTILINE_RULES },
  shell:      { rules: SHELL_RULES, multiLineRules: SHELL_MULTILINE_RULES },
};
```

### 3.5 Stateful `tokenizeLine` -- The Core Algorithm

Replace the existing `tokenizeLine` function with a stateful version. The old function remains as an internal helper for the single-line-only portion of a line.

```typescript
/**
 * Result of tokenizing a single line, including state to carry forward.
 */
interface TokenizeLineResult {
  readonly tokens: Token[];
  readonly nextState: LineState;
}

/**
 * Tokenize a line with awareness of multi-line constructs.
 *
 * Algorithm:
 * 1. If `state.activeRegion` is set, we are inside a multi-line construct.
 *    Scan for the closing pattern of the active rule.
 *    - If found: emit text up to and including the close as the region's type,
 *      then tokenize the remainder of the line normally (single-line rules).
 *      Return nextState = EMPTY_LINE_STATE.
 *    - If not found: emit the entire line as the region's type.
 *      Return nextState = state (still inside the region).
 *
 * 2. If no active region, scan the line for multi-line rule openers BEFORE
 *    applying single-line rules.
 *    - At each position, check if any multi-line rule's `open` pattern matches.
 *    - If an opener is found, check if the corresponding `close` pattern also
 *      matches later on the same line.
 *      - If close IS found on same line: treat as a single-line match (emit the
 *        entire open-to-close span as the rule's type). Continue scanning.
 *      - If close is NOT found: emit text before the open as single-line-tokenized
 *        tokens, emit the rest of the line (from open to end) as the region's type.
 *        Return nextState with the active region set.
 *    - If no opener matches at the current earliest position, fall back to
 *      single-line tokenization for the earliest-matching single-line rule.
 *
 * This two-layer approach means multi-line rules take priority at each position,
 * but only activate multi-line state when the close is not found on the same line.
 */
function tokenizeLineStateful(
  line: string,
  def: LanguageDefinition,
  state: LineState,
): TokenizeLineResult {
  // --- CASE 1: Continuation of an active multi-line region ---
  if (state.activeRegion !== null) {
    const rule = def.multiLineRules[state.activeRuleIndex]!;
    const closeRe = new RegExp(rule.close.source, 'g');
    const closeMatch = closeRe.exec(line);

    if (closeMatch) {
      // Close found -- region ends on this line
      const regionEnd = closeMatch.index + closeMatch[0].length;
      const tokens: Token[] = [];

      // Everything up to and including the close delimiter is the region type
      if (regionEnd > 0) {
        tokens.push({ type: state.activeRegion, text: line.slice(0, regionEnd) });
      }

      // Tokenize the remainder of the line with single-line rules
      const remainder = line.slice(regionEnd);
      if (remainder.length > 0) {
        // Recursively handle remainder -- it might open another multi-line region
        const subResult = tokenizeLineStateful(remainder, def, EMPTY_LINE_STATE);
        tokens.push(...subResult.tokens);
        return { tokens, nextState: subResult.nextState };
      }

      return { tokens, nextState: EMPTY_LINE_STATE };
    } else {
      // No close found -- entire line is inside the region
      return {
        tokens: [{ type: state.activeRegion, text: line }],
        nextState: state,
      };
    }
  }

  // --- CASE 2: No active region -- scan for multi-line openers alongside single-line rules ---
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < line.length) {
    let bestMultiLine: {
      index: number;
      openText: string;
      ruleIndex: number;
      closesOnSameLine: boolean;
      closeEnd: number;  // only valid if closesOnSameLine
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
        const closeRe = new RegExp(mlRule.close.source, 'g');
        closeRe.lastIndex = afterOpen;
        const closeMatch = closeRe.exec(line);

        bestMultiLineIndex = openMatch.index;
        bestMultiLine = {
          index: openMatch.index,
          openText: openMatch[0],
          ruleIndex: ri,
          closesOnSameLine: closeMatch !== null,
          closeEnd: closeMatch ? closeMatch.index + closeMatch[0].length : 0,
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
```

### 3.6 Updated `syntaxHighlight()` Public API

The public signature remains unchanged. The internal implementation switches from `lines.map()` to a stateful `for` loop:

```typescript
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
```

### 3.7 Removing Redundant Single-Line Multi-Line Patterns

Once multi-line rules handle block comments and template literals, the single-line "fallback" patterns should be removed from the single-line rule arrays to avoid double-matching. Specifically, remove:

| Language | Line(s) | Pattern | Reason |
|----------|---------|---------|--------|
| TypeScript/JS | 49 | `/\/\*.*?\*\//` | Handled by `TS_JS_MULTILINE_RULES[0]` |
| TypeScript/JS | 51 | `` /`(?:[^`\\]|\\.)*`/ `` | Handled by `TS_JS_MULTILINE_RULES[1]` |
| Python | 84-85 | `/"""[\s\S]*?"""/`, `/'''[\s\S]*?'''/` | Handled by `PYTHON_MULTILINE_RULES` |
| Go | 121 | `/\/\*.*?\*\//` | Handled by `GO_MULTILINE_RULES[0]` |
| Go | 125 | `` /`[^`]*`/ `` | Handled by `GO_MULTILINE_RULES[1]` |
| Rust | 156 | `/\/\*.*?\*\//` | Handled by `RUST_MULTILINE_RULES[0]` |
| Rust | 161 | `/r#*"[^"]*"#*/` | Handled by `RUST_MULTILINE_RULES[1]` |

The multi-line rules handle both the single-line case (open and close on the same line) and the multi-line case, so the single-line patterns become redundant.

### 3.8 Heredoc Special Handling

Shell heredocs require capturing the delimiter from the opening pattern and matching it on the closing line. This requires a small extension to `LineState`:

```typescript
interface LineState {
  readonly activeRegion: TokenType | null;
  readonly activeRuleIndex: number;
  /** For heredocs: the captured delimiter string (e.g., "EOF"). */
  readonly heredocDelimiter?: string;
}
```

When `SHELL_MULTILINE_RULES[0]` opens (matching `<<EOF` or `<<-'MARKER'`), the tokenizer captures the delimiter word from the match groups. On continuation lines, instead of using the static `close` regex, it constructs a dynamic regex: `new RegExp('^' + escapeRegExp(delimiter) + '$')`.

```typescript
// Special handling in tokenizeLineStateful, CASE 1 (continuation):
if (state.heredocDelimiter) {
  // Heredoc: close when line exactly matches the delimiter
  if (line.trim() === state.heredocDelimiter) {
    return {
      tokens: [{ type: state.activeRegion!, text: line }],
      nextState: EMPTY_LINE_STATE,
    };
  } else {
    return {
      tokens: [{ type: state.activeRegion!, text: line }],
      nextState: state,
    };
  }
}
```

---

## 4. Migration and Compatibility

### 4.1 Backward Compatibility

This change is **fully backward compatible**:

- The public API signature of `syntaxHighlight(content, config, filePath)` does not change.
- The return type `TextSpan[]` does not change.
- For files with no multi-line constructs, the output is identical -- `EMPTY_LINE_STATE` flows through every line, and the single-line rule matching logic is preserved in the `CASE 2` branch of `tokenizeLineStateful`.
- The `detectLanguage()` export is unchanged.

### 4.2 Amp Fidelity Deviation

This is an acknowledged extension beyond the Amp reference implementation. As noted in `amp-src-analysis-25.md`, Amp's `ae` function uses the same line-at-a-time approach. This enhancement should be annotated:

```typescript
// Extension: Multi-line tokenizer state added for improved highlighting.
// Amp's ae function tokenizes each line independently (no multi-line state).
// See .gap/70-multiline-syntax-support.md
```

### 4.3 Performance Impact

**Per line:** The main additional cost is iterating `multiLineRules` (typically 1-3 entries per language) alongside single-line rules. Since multi-line rules are checked with simple regex `exec` calls, and the arrays are small, the overhead is negligible.

**State propagation:** The `LineState` object is a tiny struct (2-3 fields). Passing it through the line loop adds no measurable overhead.

**Worst case:** A file entirely inside a block comment. Every line hits `CASE 1` (continuation), which does a single regex exec for the close pattern. This is actually *faster* than the current behavior, which wastefully runs all single-line rules against comment-interior lines.

---

## 5. Testing Strategy

### 5.1 Unit Tests -- Multi-Line Block Comments (JS/TS/Go/Rust)

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/syntax-highlight.test.ts`

Add a new `describe('multi-line constructs', ...)` block:

```typescript
describe('multi-line constructs', () => {
  describe('block comments', () => {
    it('highlights a block comment spanning 3 lines', () => {
      const config = defaultConfig();
      const content = '/* start\n  middle\n  end */';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(3);
      // Line 1: "/* start" should be comment-colored
      expect(hasColor([result[0]!], config.comment)).toBe(true);
      // Line 2: "  middle" should be entirely comment-colored
      expect(result[1]!.style?.foreground?.equals(config.comment)).toBe(true);
      // Line 3: "  end */" should be comment-colored
      expect(hasColor([result[2]!], config.comment)).toBe(true);
    });

    it('handles code after a closing block comment on the same line', () => {
      const config = defaultConfig();
      const content = '/* comment */\ncode\n/* another\ncomment */ const x = 1;';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(4);
      // Line 4: "comment */" is comment, " const x = 1;" has keyword coloring
      expect(hasColor([result[3]!], config.comment)).toBe(true);
      expect(hasColor([result[3]!], config.keyword)).toBe(true);
    });

    it('handles a single-line block comment (no change from before)', () => {
      const config = defaultConfig();
      const content = '/* single line comment */ const y = 2;';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(1);
      expect(hasColor(result, config.comment)).toBe(true);
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('handles block comment with blank lines inside', () => {
      const config = defaultConfig();
      const content = '/*\n\n*/';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(3);
      // The blank line (line 2) should retain the comment state
      // (empty line inside an active region)
    });

    it('highlights Go block comments across lines', () => {
      const config = defaultConfig();
      const content = '/* Go comment\n   continues\n*/\nfunc main() {}';
      const result = syntaxHighlight(content, config, 'test.go');

      expect(result.length).toBe(4);
      expect(hasColor([result[0]!], config.comment)).toBe(true);
      expect(hasColor([result[3]!], config.keyword)).toBe(true);
    });

    it('highlights Rust block comments across lines', () => {
      const config = defaultConfig();
      const content = '/* Rust\n   block\n   comment */\nfn main() {}';
      const result = syntaxHighlight(content, config, 'test.rs');

      expect(result.length).toBe(4);
      expect(hasColor([result[0]!], config.comment)).toBe(true);
      expect(hasColor([result[1]!], config.comment)).toBe(true);
      expect(hasColor([result[2]!], config.comment)).toBe(true);
      expect(hasColor([result[3]!], config.keyword)).toBe(true);
    });
  });

  describe('template literals (JS/TS)', () => {
    it('highlights a template literal spanning multiple lines', () => {
      const config = defaultConfig();
      const content = 'const s = `\n  hello\n  world\n`;';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(4);
      // Lines 2-3 should be string-colored
      expect(hasColor([result[1]!], config.string)).toBe(true);
      expect(hasColor([result[2]!], config.string)).toBe(true);
    });

    it('single-line template literal still works', () => {
      const config = defaultConfig();
      const content = 'const s = `hello`;';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(1);
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  describe('Python triple-quoted strings', () => {
    it('highlights a triple-double-quoted docstring', () => {
      const config = defaultConfig();
      const content = 'def foo():\n    """\n    Docstring.\n    """\n    pass';
      const result = syntaxHighlight(content, config, 'test.py');

      expect(result.length).toBe(5);
      // Lines 2-4 should be string-colored
      expect(hasColor([result[1]!], config.string)).toBe(true);
      expect(hasColor([result[2]!], config.string)).toBe(true);
      expect(hasColor([result[3]!], config.string)).toBe(true);
      // Line 5 should have keyword highlighting ("pass")
      expect(hasColor([result[4]!], config.keyword)).toBe(true);
    });

    it('highlights a triple-single-quoted string', () => {
      const config = defaultConfig();
      const content = "x = '''\nmulti\nline\n'''";
      const result = syntaxHighlight(content, config, 'test.py');

      expect(result.length).toBe(4);
      expect(hasColor([result[1]!], config.string)).toBe(true);
      expect(hasColor([result[2]!], config.string)).toBe(true);
    });
  });

  describe('Go raw strings', () => {
    it('highlights a backtick raw string spanning lines', () => {
      const config = defaultConfig();
      const content = 'var s = `\nraw\nstring\n`';
      const result = syntaxHighlight(content, config, 'test.go');

      expect(result.length).toBe(4);
      expect(hasColor([result[1]!], config.string)).toBe(true);
      expect(hasColor([result[2]!], config.string)).toBe(true);
    });
  });

  describe('Markdown fenced code blocks', () => {
    it('highlights content between fences as string', () => {
      const config = defaultConfig();
      const content = 'Text before\n```python\ndef foo():\n    pass\n```\nText after';
      const result = syntaxHighlight(content, config, 'test.md');

      expect(result.length).toBe(6);
      // Lines 2-5 (fence open, code, code, fence close) should be string-colored
      expect(hasColor([result[1]!], config.string)).toBe(true);
      expect(hasColor([result[2]!], config.string)).toBe(true);
      expect(hasColor([result[3]!], config.string)).toBe(true);
      expect(hasColor([result[4]!], config.string)).toBe(true);
    });
  });

  describe('text preservation', () => {
    it('preserves all text content with multi-line constructs', () => {
      const config = defaultConfig();
      const content = 'const a = 1;\n/* comment\n   inside\n*/\nconst b = 2;';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(collectText(result)).toBe(content);
    });

    it('preserves text in Python docstrings', () => {
      const config = defaultConfig();
      const content = 'x = """\nhello\nworld\n"""';
      const result = syntaxHighlight(content, config, 'test.py');

      expect(collectText(result)).toBe(content);
    });
  });

  describe('edge cases', () => {
    it('handles consecutive multi-line constructs', () => {
      const config = defaultConfig();
      const content = '/* first\n*/\n/* second\n*/';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(4);
      // All lines should be comment-colored
      for (const span of result) {
        expect(hasColor([span], config.comment)).toBe(true);
      }
    });

    it('handles multi-line construct on last line with no newline', () => {
      const config = defaultConfig();
      const content = '/* unterminated comment';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(1);
      // The open pattern matches; no close on same line => region opens
      // Since there are no more lines, the last state is "inside comment"
      // but the token for this line should still be comment-colored
      expect(hasColor(result, config.comment)).toBe(true);
    });

    it('does not apply multi-line rules for JSON (no multi-line constructs)', () => {
      const config = defaultConfig();
      const content = '{\n  "key": "value"\n}';
      const result = syntaxHighlight(content, config, 'test.json');

      // Behavior should be identical to current -- no state changes
      expect(result.length).toBe(3);
    });

    it('handles empty file', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('', config, 'test.ts');
      expect(result.length).toBe(1);
    });

    it('handles file with only a block comment', () => {
      const config = defaultConfig();
      const content = '/*\n * License header\n * Copyright 2024\n */';
      const result = syntaxHighlight(content, config, 'test.ts');

      expect(result.length).toBe(4);
      for (const span of result) {
        expect(hasColor([span], config.comment)).toBe(true);
      }
    });
  });
});
```

### 5.2 Regression Tests

All existing tests in the current test file must continue to pass unchanged. The stateful tokenizer with `EMPTY_LINE_STATE` flowing through should produce identical results for all single-line patterns. This is the most critical verification -- add an explicit note:

```typescript
describe('regression: single-line behavior unchanged', () => {
  // All existing tests from the 'TypeScript/JavaScript', 'Python', 'Go',
  // 'Rust', 'JSON', 'YAML', 'Markdown', 'Shell' describe blocks serve
  // as regression tests. If any existing test fails after the multi-line
  // refactor, the implementation has a compatibility bug.
});
```

### 5.3 Property-Based / Stress Tests

```typescript
describe('stress tests', () => {
  it('handles a large file with many block comments', () => {
    const config = defaultConfig();
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push('/* block comment', '   line ' + i, '*/');
      lines.push('const x' + i + ' = ' + i + ';');
    }
    const content = lines.join('\n');
    const result = syntaxHighlight(content, config, 'test.ts');

    // 400 lines (100 * 4)
    expect(result.length).toBe(400);
    // Text must be fully preserved
    expect(collectText(result)).toBe(content);
  });

  it('handles alternating block comments and code rapidly', () => {
    const config = defaultConfig();
    const content = Array.from({ length: 50 }, (_, i) =>
      i % 2 === 0 ? '/* c */' : 'const x = 1;'
    ).join('\n');
    const result = syntaxHighlight(content, config, 'test.ts');
    expect(result.length).toBe(50);
    expect(collectText(result)).toBe(content);
  });
});
```

---

## 6. Implementation Order

1. **Phase A -- Types and Rule Definitions:**
   - Add `LineState`, `EMPTY_LINE_STATE`, `MultiLineRule`, `LanguageDefinition` types.
   - Add `*_MULTILINE_RULES` arrays for each language.
   - Add `LANGUAGE_DEFS` registry.

2. **Phase B -- Stateful Tokenizer:**
   - Implement `tokenizeLineStateful()` with CASE 1 (continuation) and CASE 2 (scanner).
   - Add `TokenizeLineResult` interface.

3. **Phase C -- Update Public API:**
   - Rewrite `syntaxHighlight()` to use `tokenizeLineStateful()` with state propagation.
   - Keep `LANGUAGE_RULES` as a computed accessor for backward compat if needed.

4. **Phase D -- Remove Redundant Single-Line Patterns:**
   - Remove the single-line block comment and multi-line string patterns listed in Section 3.7.

5. **Phase E -- Shell Heredoc Extension:**
   - Add `heredocDelimiter` to `LineState`.
   - Implement special-case heredoc handling in CASE 1.

6. **Phase F -- Tests:**
   - Add all tests from Section 5.
   - Run full regression suite: `bun test`.
   - Verify all existing 50+ syntax highlighting tests pass unchanged.

---

## 7. Open Questions

1. **Nested block comments (Rust):** Rust supports nested block comments (`/* /* inner */ outer */`). The proposed design does not track nesting depth. Should we add a `nestingDepth: number` to `LineState` for Rust, or is approximate highlighting acceptable? The current proposal treats the first `*/` as closing the region, which is incorrect for nested comments but matches the simplicity constraints.

2. **Template literal interpolation:** JavaScript template literals can contain `${expression}` blocks, which themselves can contain backticks (e.g., `` `outer ${`inner`} outer` ``). The proposed design treats the first closing backtick as ending the region. Should we track interpolation depth, or is this an acceptable approximation?

3. **Performance on very large files:** While the per-line overhead is minimal, files with thousands of lines now carry state through every line. Should we add a line-state cache (keyed by line number) to support incremental re-highlighting when only a few lines change? This would be relevant for the editor's scroll-and-edit workflow but may be premature optimization.

4. **Amp fidelity sign-off:** As with Gap F01, this is an extension beyond Amp's behavior. The project maintainers should confirm this deviation is acceptable before implementation proceeds.
