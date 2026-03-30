# Gap SH01 -- Only 8 Languages Supported in Syntax Highlighting

## Summary

Flitter's syntax highlighting system (`syntaxHighlight` / `ae` function) currently supports
only 8 languages via hand-written regex rule sets. The Amp CLI binary uses the same
extension-based approach (the minified `ae` function), but Amp operates in a coding-assistant
context where users routinely open files in dozens of languages. Flitter needs substantially
broader language coverage to match user expectations for code display in DiffView, Markdown
code blocks, and the Read tool output.

---

## 1. Current State

### 1.1 Syntax Highlighting Implementation

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/syntax-highlight.ts`

The system is structured as:

1. **Token types** (line 15-28): 12 token categories -- `keyword`, `string`, `comment`,
   `number`, `type`, `function`, `operator`, `punctuation`, `variable`, `property`, `tag`,
   `attribute`, plus a `default` fallback.

2. **Language rule sets** (lines 44-284): Each language is a `LanguageRule[]` array of
   `{ pattern: RegExp, type: TokenType }` objects, matched in priority order.

3. **Extension map** (lines 292-312): Maps file extensions to language names.

4. **Tokenizer** (lines 355-393): Iterates through a line, finds the earliest-matching rule,
   emits tokens with their types.

5. **Public API** (lines 414-466): `syntaxHighlight(content, config, filePath) -> TextSpan[]`
   returns one TextSpan per line with colored tokens.

### 1.2 Supported Languages (8 total)

| # | Language Name | Rule Set Constant | Extensions Mapped | Lines |
|---|--------------|-------------------|-------------------|-------|
| 1 | TypeScript/JavaScript | `TS_JS_RULES` | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` | 45-77 |
| 2 | Python | `PYTHON_RULES` | `.py`, `.pyw` | 80-114 |
| 3 | Go | `GO_RULES` | `.go` | 117-150 |
| 4 | Rust | `RUST_RULES` | `.rs` | 153-189 |
| 5 | JSON | `JSON_RULES` | `.json`, `.jsonc` | 192-202 |
| 6 | YAML | `YAML_RULES` | `.yaml`, `.yml` | 205-224 |
| 7 | Markdown | `MARKDOWN_RULES` | `.md`, `.mdx` | 227-252 |
| 8 | Shell/Bash | `SHELL_RULES` | `.sh`, `.bash`, `.zsh` | 255-284 |

### 1.3 Language Type Union

```typescript
// syntax-highlight.ts line 290
type LanguageName = 'typescript' | 'python' | 'go' | 'rust' | 'json' | 'yaml' | 'markdown' | 'shell';
```

### 1.4 Consumers

The syntax highlighting function is consumed by three components:

| Consumer | Package | File | Usage |
|----------|---------|------|-------|
| `DiffView` | flitter-core | `src/widgets/diff-view.ts` | Colorizes addition/context lines using `filePath` prop |
| `Markdown` | flitter-core | `src/widgets/markdown.ts` | Colorizes fenced code blocks using language hint |
| Read tool (indirect) | flitter-amp | via DiffView/Markdown | Code display in tool output |

### 1.5 Theme Configuration

**flitter-core** (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/app-theme.ts`):
- `SyntaxHighlightConfig` interface has 13 token color fields (keyword, string, comment,
  number, type, function, operator, punctuation, variable, property, tag, attribute, default)

**flitter-amp** (`/home/gem/workspace/flitter/packages/flitter-amp/src/themes/amp-theme-data.ts`):
- `AmpSyntaxHighlight` interface has 8 token color fields (keyword, string, number, comment,
  function, variable, type, operator) -- matching the Amp binary's `x1.syntaxHighlight` object

### 1.6 Test Coverage

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/syntax-highlight.test.ts`

Tests cover all 8 languages with basic token detection (keywords, strings, comments),
extension mapping, custom color config, and edge cases (long lines, special chars, multiline).

---

## 2. Amp Comparison

### 2.1 Amp's Syntax Highlighting Architecture

The Amp CLI binary uses the minified `ae` function (referenced in `widgets-catalog.md` line
893) with the same architecture: extension-based detection, regex rule matching, and
`SyntaxHighlightConfig` color mapping. The `ae` function signature is identical to flitter's
`syntaxHighlight(content, config, filePath)`.

### 2.2 Amp's Token Types

From the Amp reference (`app-theme-x1.js` lines 59-68), Amp uses 8 token color categories:

| Token | Color (Dark) |
|-------|-------------|
| keyword | blue |
| string | green |
| number | yellow |
| comment | index(8) / bright black |
| function | cyan |
| variable | default |
| type | magenta |
| operator | default |

Flitter's `SyntaxHighlightConfig` extends this with 5 additional token types: `punctuation`,
`property`, `tag`, `attribute`, and `default`. This is an intentional extension for richer
highlighting of markup languages (HTML/XML) and data formats (JSON/YAML).

### 2.3 Languages Supported in Amp

Based on analysis of the Amp binary's behavior and the reverse-engineered reference materials,
Amp uses the same extension-based approach. The binary's bundled JavaScript contains regex
patterns for the following language families (estimated from string analysis and behavioral
testing):

**Core languages (confirmed in Amp binary):**
- TypeScript / JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`)
- Python (`.py`)
- Go (`.go`)
- Rust (`.rs`)
- JSON (`.json`, `.jsonc`)
- YAML (`.yaml`, `.yml`)
- Markdown (`.md`, `.mdx`)
- Shell / Bash (`.sh`, `.bash`, `.zsh`)

**Additional languages visible in Amp behavior (gap vs flitter):**
- C (`.c`, `.h`)
- C++ (`.cpp`, `.cc`, `.cxx`, `.hpp`, `.hh`)
- Java (`.java`)
- Ruby (`.rb`)
- PHP (`.php`)
- Swift (`.swift`)
- Kotlin (`.kt`, `.kts`)
- Scala (`.scala`)
- HTML (`.html`, `.htm`)
- CSS (`.css`)
- SCSS/SASS (`.scss`, `.sass`)
- SQL (`.sql`)
- Lua (`.lua`)
- Zig (`.zig`)
- Elixir (`.ex`, `.exs`)
- Haskell (`.hs`)
- OCaml (`.ml`, `.mli`)
- TOML (`.toml`)
- XML (`.xml`)
- Dockerfile (`Dockerfile`)
- Makefile (`Makefile`)
- C# (`.cs`)

The Amp binary, being a Bun-compiled JavaScript application, likely uses a similar hand-rolled
regex approach (evidenced by the relatively small binary payload for highlighting and the
absence of tree-sitter or TextMate grammar dependencies). The key difference is scope: Amp
covers ~30 languages while flitter covers 8.

---

## 3. Impact Assessment

### 3.1 User-Facing Impact

When a user opens or diffs a file in an unsupported language, flitter falls back to the
`default` color for all tokens (line 426-435 of `syntax-highlight.ts`). This means:

- **DiffView**: Diff content in `.java`, `.cpp`, `.rb`, etc. files shows as monochrome text
  with no keyword/string/comment coloring, making code review harder.
- **Markdown code blocks**: Fenced code blocks with language hints like ` ```java ` or
  ` ```c ``` ` render without highlighting. The `Markdown._renderCodeBlock()` method
  (line 597-618) constructs a synthetic path `file.${language}` and calls `detectLanguage()`,
  which returns `undefined` for unsupported languages.
- **Read tool output**: File content displayed by the Read tool through DiffView or Markdown
  loses syntax coloring for unsupported languages.

### 3.2 Scope of Missing Languages

Based on the TIOBE index and GitHub language statistics, the most impactful missing languages
are C, C++, Java, HTML/CSS, Ruby, PHP, and SQL -- these represent a large fraction of code
that users interact with in a coding assistant context.

---

## 4. Proposed Expansion Plan

### 4.1 Approach: Hand-Written Regex Rule Sets

**Recommended.** Continue the current architecture of hand-written `LanguageRule[]` arrays.

**Rationale:**
- **Consistency**: All existing languages use this pattern. Adding more follows the same
  structure and review process.
- **Zero dependencies**: The project constraint is "zero transitive runtime dependencies."
  Integrating tree-sitter or a TextMate grammar library would violate this.
- **Performance**: Regex-based tokenization is fast and sufficient for TUI rendering where
  pixel-perfect accuracy is not required (unlike IDE highlighting).
- **Amp fidelity**: The Amp binary uses the same approach -- regex rule sets per language,
  not a grammar engine.
- **Maintainability**: Each language definition is a self-contained array of 10-25 rules,
  easy to add, test, and modify independently.

**Rejected alternative: Grammar library integration**
- tree-sitter: Would require native WASM bindings, adding ~2MB+ of grammar files and a
  non-trivial parser runtime. Violates zero-dependency constraint.
- TextMate grammars (vscode-textmate): Would require oniguruma regex engine and `.tmLanguage`
  grammar files. Heavy and over-engineered for TUI use.
- highlight.js: Would add ~1MB of grammar definitions. Overkill for the limited token type
  palette (13 types) and TUI rendering context.

### 4.2 Implementation Structure

Each new language follows the same pattern:

```typescript
// Example: C language rules
const C_RULES: LanguageRule[] = [
  // Line comments
  { pattern: /\/\/.*$/, type: 'comment' },
  // Block comments
  { pattern: /\/\*.*?\*\//, type: 'comment' },
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
```

Each new language requires:
1. A `*_RULES: LanguageRule[]` constant with 10-25 regex rules
2. Entries in `EXTENSION_MAP` for all file extensions
3. An entry in `LANGUAGE_RULES` mapping the language name to its rules
4. Update `LanguageName` type union
5. Test cases in `syntax-highlight.test.ts`

### 4.3 Changes to Existing Code

The only file that needs modification is:
**`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/syntax-highlight.ts`**

Specifically:
- Add new `*_RULES` constants (after line 284)
- Extend `LanguageName` union type (line 290)
- Add entries to `EXTENSION_MAP` (lines 292-312)
- Add entries to `LANGUAGE_RULES` (lines 314-323)

And the test file:
**`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/syntax-highlight.test.ts`**

No changes needed to `app-theme.ts`, `diff-view.ts`, `markdown.ts`, or any flitter-amp files.
The existing token types (keyword, string, comment, number, type, function, operator,
punctuation, variable, property, tag, attribute) are sufficient to cover all proposed
languages without adding new token categories.

---

## 5. Priority Ordering

Languages are prioritized by frequency of use in coding-assistant workflows (based on TIOBE,
GitHub statistics, and common Amp usage patterns).

### Tier 1: High Priority (add first)

These languages appear frequently in coding projects and are the most impactful gap.

| # | Language | Extensions | Complexity | Notes |
|---|----------|-----------|------------|-------|
| 1 | **C** | `.c`, `.h` | Low | Very similar to existing Go/Rust rules. Preprocessor directives use `attribute` token. |
| 2 | **C++** | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hh`, `.h` | Medium | Extends C rules with templates, namespaces, `class`, `virtual`, `nullptr`. Note `.h` shared with C -- default to C++ since it is a superset. |
| 3 | **Java** | `.java` | Low | Standard C-family syntax. Annotations (`@Override`) map to `attribute`. |
| 4 | **HTML** | `.html`, `.htm` | Medium | Tag-based: `<tag>` maps to `tag`, attributes map to `attribute`, strings to `string`. |
| 5 | **CSS** | `.css` | Medium | Selectors as `tag`, properties as `property`, values as `variable`. |
| 6 | **SQL** | `.sql` | Low | Keywords (SELECT, FROM, WHERE), strings, numbers, comments. |
| 7 | **TOML** | `.toml` | Low | Very similar to YAML rules -- keys, strings, numbers, booleans, comments. |

### Tier 2: Medium Priority

Common but less frequent in diff/code-review contexts.

| # | Language | Extensions | Complexity | Notes |
|---|----------|-----------|------------|-------|
| 8 | **Ruby** | `.rb`, `.rake`, `.gemspec` | Medium | Keywords, string interpolation, symbols (`:name`), `@instance_vars`. |
| 9 | **PHP** | `.php` | Medium | C-family base + `$variables`, `<?php` tags. |
| 10 | **Swift** | `.swift` | Low | C-family with `let`, `var`, `guard`, `@` attributes. |
| 11 | **Kotlin** | `.kt`, `.kts` | Low | Java-like with `val`, `var`, `fun`, `data class`. |
| 12 | **C#** | `.cs` | Low | C-family with `using`, `namespace`, `var`, attributes `[Attr]`. |
| 13 | **Lua** | `.lua` | Low | Simple: `--` comments, `function`, `local`, `end`. |
| 14 | **SCSS** | `.scss` | Low | Extends CSS rules with `$variables`, `@mixin`, nesting. |
| 15 | **XML** | `.xml`, `.svg`, `.xsl` | Low | Same as HTML rules. |
| 16 | **Dockerfile** | `Dockerfile` | Low | `FROM`, `RUN`, `COPY`, etc. keywords + shell content. Requires filename-based detection (no extension). |

### Tier 3: Lower Priority

Specialized languages with smaller user bases.

| # | Language | Extensions | Complexity | Notes |
|---|----------|-----------|------------|-------|
| 17 | **Scala** | `.scala`, `.sc` | Medium | Hybrid OOP/FP keywords. |
| 18 | **Elixir** | `.ex`, `.exs` | Medium | `def`, `defmodule`, pipe operator, atoms. |
| 19 | **Haskell** | `.hs` | Medium | `where`, `let`, `in`, type signatures, `--` comments. |
| 20 | **Zig** | `.zig` | Low | Simple keyword set, `//` comments, no preprocessor. |
| 21 | **OCaml** | `.ml`, `.mli` | Medium | `let`, `in`, `match`, `with`, `(*` block comments. |
| 22 | **Makefile** | `Makefile`, `*.mk` | Medium | Target rules, variables, tab-indented recipes. Requires filename-based detection. |

### 5.1 Filename-Based Detection

Currently, `detectLanguage()` only uses file extensions. Tier 2-3 includes `Dockerfile` and
`Makefile` which require matching on the full filename. This requires a small extension to the
detection logic:

```typescript
const FILENAME_MAP: Record<string, LanguageName> = {
  'Dockerfile': 'dockerfile',
  'Makefile': 'makefile',
  'makefile': 'makefile',
  'GNUmakefile': 'makefile',
};

export function detectLanguage(filePath: string): LanguageName | undefined {
  // Check filename first
  const basename = filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath;
  const byFilename = FILENAME_MAP[basename];
  if (byFilename) return byFilename;

  // Fall back to extension
  const ext = getExtension(filePath);
  return EXTENSION_MAP[ext];
}
```

---

## 6. Testing Strategy

### 6.1 Per-Language Test Pattern

Each new language should have a test block following the existing pattern in
`syntax-highlight.test.ts`. At minimum, each language needs:

```typescript
describe('LanguageName', () => {
  it('highlights keywords', () => { /* ... */ });
  it('highlights strings', () => { /* ... */ });
  it('highlights comments', () => { /* ... */ });
  // Language-specific:
  it('highlights [language-specific feature]', () => { /* ... */ });
});
```

### 6.2 Extension Mapping Tests

```typescript
describe('detectLanguage - new extensions', () => {
  it('maps .c to c', () => { expect(detectLanguage('main.c')).toBe('c'); });
  it('maps .cpp to cpp', () => { expect(detectLanguage('main.cpp')).toBe('cpp'); });
  it('maps .java to java', () => { expect(detectLanguage('App.java')).toBe('java'); });
  it('maps .html to html', () => { expect(detectLanguage('index.html')).toBe('html'); });
  it('maps .css to css', () => { expect(detectLanguage('style.css')).toBe('css'); });
  it('maps .sql to sql', () => { expect(detectLanguage('query.sql')).toBe('sql'); });
  it('maps .toml to toml', () => { expect(detectLanguage('config.toml')).toBe('toml'); });
  // ... etc for all new extensions
});
```

### 6.3 Filename-Based Detection Tests

```typescript
describe('detectLanguage - filename-based', () => {
  it('maps Dockerfile to dockerfile', () => {
    expect(detectLanguage('Dockerfile')).toBe('dockerfile');
    expect(detectLanguage('/path/to/Dockerfile')).toBe('dockerfile');
  });
  it('maps Makefile to makefile', () => {
    expect(detectLanguage('Makefile')).toBe('makefile');
  });
});
```

### 6.4 Integration Tests

Verify that the Markdown widget correctly highlights new languages in fenced code blocks:

```typescript
describe('Markdown code blocks - new languages', () => {
  it('highlights ```java code blocks', () => {
    // Construct Markdown widget with java code block
    // Verify syntaxHighlight is called with synthetic path 'file.java'
    // Verify output contains keyword-colored tokens
  });
  it('highlights ```html code blocks', () => { /* ... */ });
  it('highlights ```css code blocks', () => { /* ... */ });
});
```

### 6.5 Regression Tests

- All existing 8 language test suites must continue to pass unchanged.
- Extension mapping for existing languages must be unaffected.
- Performance: Verify no measurable slowdown from the increased number of language rules.
  The tokenizer only loads rules for the detected language, so additional languages do not
  affect per-line tokenization time.

### 6.6 Edge Cases

- Files with no extension and unrecognized filenames should still return `undefined`.
- Shared extensions (`.h` for C/C++) should consistently resolve to one language.
- Case-insensitive extension matching should continue to work (`.CPP` -> cpp).
- Very long lines (1000+ chars) with new language rules should not cause regex backtracking
  issues. Each rule should be tested for pathological input.

---

## 7. Estimated Effort

| Tier | Languages | Estimated LOC (rules) | Estimated LOC (tests) | Effort |
|------|-----------|----------------------|----------------------|--------|
| Tier 1 | 7 languages | ~350 lines | ~200 lines | 1-2 sessions |
| Tier 2 | 9 languages | ~400 lines | ~250 lines | 1-2 sessions |
| Tier 3 | 6 languages | ~250 lines | ~150 lines | 1 session |
| **Total** | **22 languages** | **~1000 lines** | **~600 lines** | **3-5 sessions** |

After implementation, flitter would support 30 languages (8 existing + 22 new), providing
comprehensive coverage for the vast majority of files encountered in coding-assistant workflows.

---

## 8. Open Questions

1. **Shared `.h` extension**: Should `.h` files be detected as C or C++? Recommendation: C++
   (superset of C keywords), with a note that this may slightly over-highlight C-only files.

2. **File ordering in syntax-highlight.ts**: Should new languages be added alphabetically or
   grouped by family (C-family, scripting, markup, data)? Recommendation: alphabetically by
   language name within the file, for easier navigation.

3. **Token type coverage**: The existing 13 token types are sufficient for all proposed
   languages. However, some languages have unique constructs (Ruby symbols, Elixir atoms,
   Haskell type signatures) that don't map perfectly. Should we add new token types, or reuse
   the closest existing type? Recommendation: reuse existing types (e.g., Ruby symbols ->
   `attribute`, Elixir atoms -> `attribute`) to maintain simplicity and theme compatibility.

4. **Batch vs incremental**: Should all 22 languages be added in one PR, or split into
   Tier 1 / Tier 2 / Tier 3 PRs? Recommendation: split by tier for easier review and
   testing.
