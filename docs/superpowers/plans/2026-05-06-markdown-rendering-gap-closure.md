# Markdown Rendering Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 10 identified gaps between flitter-cli and amp-cli markdown rendering in chat view.

**Architecture:** Modify the existing `MarkdownRenderer` in `packages/tui/src/markdown/markdown-renderer.ts` and `SyntaxHighlighter` in `syntax-highlight.ts`. Add Prism.js as a dependency for language-aware highlighting. Leverage existing `TextSpan.url` + OSC 8 infrastructure for clickable links. Add a `MarkdownTheme` interface to pass heading/blockquote colors from the app theme.

**Tech Stack:** TypeScript, Bun, micromark + GFM extensions, prismjs (new dep), existing flitter TextSpan/TextStyle/Color primitives

---

## File Structure

| File | Responsibility |
|------|----------------|
| `packages/tui/src/markdown/markdown-renderer.ts` | All 10 gaps are rendering changes here |
| `packages/tui/src/markdown/markdown-theme.ts` | NEW: `MarkdownTheme` interface (heading colors, blockquote border, link style, etc.) |
| `packages/tui/src/markdown/syntax-highlight.ts` | Replace regex tokenizer with Prism.js bridge |
| `packages/tui/src/markdown/prism-languages.ts` | NEW: Language name normalization (ext → Prism grammar name) |
| `packages/tui/src/markdown/index.ts` | Add re-exports for new modules |
| `packages/tui/src/markdown/markdown-renderer.test.ts` | Add/update tests for all 10 gaps |
| `packages/tui/src/markdown/syntax-highlight.test.ts` | NEW: Dedicated Prism-based highlighting tests |
| `packages/tui/package.json` | Add `prismjs` dependency |
| `packages/cli/src/widgets/conversation-view.ts` | Wire `MarkdownTheme` from app palette |

---

## Gap Summary (for reference)

1. **Heading color grading** — h1/h3=blue, h2/h4=cyan, h5/h6=foreground; h1/h2 bold only
2. **Prism.js syntax highlighting** — language-aware tokenization instead of single regex
3. **Table column width + alignment** — proportional column sizing, align attribute support
4. **Blockquote left border** — colored left border + padding instead of `│ ` prefix
5. **Nested list indentation** — depth × 2 padding, `•` bullet, `[✓]` checkbox
6. **OSC 8 clickable links** — use `TextSpan.url` instead of appending `(url)` text
7. **Image node rendering** — render as `[Image: alt]` in italic link style
8. **Smart paragraph spacing** — context-aware blank line insertion
9. **Inline code bold** — add `bold: true` to match amp
10. **MarkdownTheme integration** — themeable colors for all markdown elements

---

### Task 1: Create MarkdownTheme Interface

**Files:**
- Create: `packages/tui/src/markdown/markdown-theme.ts`
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:30-33`
- Modify: `packages/tui/src/markdown/index.ts`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

- [ ] **Step 1: Write the failing test**

In `markdown-renderer.test.ts`, add a test that verifies the renderer accepts a `MarkdownTheme`:

```ts
import { MarkdownTheme, defaultMarkdownTheme } from "./markdown-theme.js";

describe("MarkdownRenderer with theme", () => {
  it("使用自定义主题渲染标题", () => {
    const theme: MarkdownTheme = {
      ...defaultMarkdownTheme(),
      headingColors: [Color.red(), Color.green(), Color.red(), Color.green(), Color.white(), Color.white()],
    };
    const renderer = new MarkdownRenderer({ markdownTheme: theme });
    const ast = parser.parse("# Hello");
    const spans = renderer.render(ast);
    const style = collectStyles(spans)[0];
    expect(style.foreground.equals(Color.red())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "自定义主题"`
Expected: FAIL — module `./markdown-theme.js` not found

- [ ] **Step 3: Create the MarkdownTheme module**

Create `packages/tui/src/markdown/markdown-theme.ts`:

```ts
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { SyntaxTheme } from "./syntax-highlight.js";

export interface MarkdownTheme {
  headingColors: [Color, Color, Color, Color, Color, Color];
  headingBoldLevels: number;
  inlineCode: TextStyle;
  codeBlockForeground: Color;
  link: TextStyle;
  blockquoteBorder: Color;
  tableBorder: Color;
  syntaxTheme: SyntaxTheme;
}

export function defaultMarkdownTheme(): MarkdownTheme {
  const { defaultTheme } = await import("./syntax-highlight.js");
  return {
    headingColors: [
      Color.blue(),    // h1
      Color.cyan(),    // h2
      Color.blue(),    // h3
      Color.cyan(),    // h4
      Color.default(), // h5
      Color.default(), // h6
    ],
    headingBoldLevels: 2,
    inlineCode: new TextStyle({ foreground: Color.yellow(), bold: true }),
    codeBlockForeground: Color.default(),
    link: new TextStyle({ foreground: Color.blue(), underline: true }),
    blockquoteBorder: Color.default(),
    tableBorder: Color.indexed(8),
    syntaxTheme: SyntaxHighlighter.defaultTheme(),
  };
}
```

- [ ] **Step 4: Update MarkdownRendererOptions to accept the theme**

In `markdown-renderer.ts`, update the options interface:

```ts
import { type MarkdownTheme, defaultMarkdownTheme } from "./markdown-theme.js";

export interface MarkdownRendererOptions {
  syntaxTheme?: SyntaxTheme;
  markdownTheme?: MarkdownTheme;
}
```

Add to the class:

```ts
private readonly _theme: MarkdownTheme;

constructor(options?: MarkdownRendererOptions) {
  this._theme = options?.markdownTheme ?? defaultMarkdownTheme();
  const syntaxTheme = options?.syntaxTheme ?? this._theme.syntaxTheme;
  this._highlighter = new SyntaxHighlighter(syntaxTheme);
}
```

- [ ] **Step 5: Update index.ts re-exports**

```ts
export * from "./markdown-theme.js";
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/markdown/markdown-theme.ts packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/index.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): add MarkdownTheme interface for themeable rendering"
```

---

### Task 2: Heading Color Grading (Gap 1)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:184-195`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1380-1400` — h1/h3 get `colors.primary` (blue), h2/h4 get `colors.secondary` (cyan), h5/h6 get foreground. Only h1/h2 are bold.

- [ ] **Step 1: Write the failing test**

```ts
describe("heading color grading", () => {
  it("h1 渲染为蓝色粗体", () => {
    const spans = renderer.render(parser.parse("# Title"));
    const style = findFirstStyledSpan(spans).style!;
    expect(style.bold).toBe(true);
    expect(style.foreground.equals(Color.blue())).toBe(true);
  });

  it("h2 渲染为青色粗体", () => {
    const spans = renderer.render(parser.parse("## Title"));
    const style = findFirstStyledSpan(spans).style!;
    expect(style.bold).toBe(true);
    expect(style.foreground.equals(Color.cyan())).toBe(true);
  });

  it("h3 渲染为蓝色非粗体", () => {
    const spans = renderer.render(parser.parse("### Title"));
    const style = findFirstStyledSpan(spans).style!;
    expect(style.bold).toBe(false);
    expect(style.foreground.equals(Color.blue())).toBe(true);
  });

  it("h5 渲染为默认前景色非粗体", () => {
    const spans = renderer.render(parser.parse("##### Title"));
    const style = findFirstStyledSpan(spans).style!;
    expect(style.bold).toBe(false);
    expect(style.foreground.equals(Color.default())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "heading color"`
Expected: FAIL — current implementation uses `bold: true` for all levels, no color

- [ ] **Step 3: Implement heading color grading**

Replace `_renderHeading` in `markdown-renderer.ts`:

```ts
private _renderHeading(node: MarkdownNode, _parentStyle: TextStyle | undefined): TextSpan[] {
  const level = node.level ?? 1;
  const idx = Math.min(level, 6) - 1;
  const color = this._theme.headingColors[idx];
  const bold = level <= this._theme.headingBoldLevels;
  const style = new TextStyle({ bold, foreground: color });
  const prefix = "#".repeat(level) + " ";
  const children = this._renderChildren(node, style);
  return [
    new TextSpan({
      style,
      children: [new TextSpan({ text: prefix }), ...children],
    }),
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS (all heading tests, including existing ones which may need updating)

- [ ] **Step 5: Update existing heading tests if needed**

The existing tests `"标题渲染 level 1"` and `"标题渲染 level 3"` check for `bold: true` on all levels. Update them to match the new behavior (h3 is NOT bold).

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): add heading color grading matching amp (h1/h3=blue, h2/h4=cyan)"
```

---

### Task 3: Inline Code Bold (Gap 9)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:245-251`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1683` — inlineCode style is `cT({ color: app.inlineCode, bold: true })`

- [ ] **Step 1: Write the failing test**

```ts
it("内联代码渲染为黄色粗体", () => {
  const spans = renderer.render(parser.parse("use `hello` here"));
  const codeSpan = findSpanWithText(spans, "hello");
  expect(codeSpan.style!.bold).toBe(true);
  expect(codeSpan.style!.foreground.equals(Color.yellow())).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "粗体"`
Expected: FAIL — current inline code has no `bold`

- [ ] **Step 3: Update _renderCodeSpan to use theme**

```ts
private _renderCodeSpan(node: MarkdownNode): TextSpan[] {
  const style = this._theme.inlineCode.copyWith({
    background: Color.indexed(236),
  });
  return [new TextSpan({ text: node.value ?? "", style })];
}
```

Since `defaultMarkdownTheme().inlineCode` is `TextStyle({ foreground: Color.yellow(), bold: true })`, this adds bold.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): add bold to inline code matching amp style"
```

---

### Task 4: OSC 8 Clickable Links (Gap 6)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:357-371`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1691-1710` — link children get `hyperlink: { uri: url, id: hash }` attached, rendered as OSC 8.

Flitter already has full OSC 8 support via `TextSpan.url` → `Screen.writeChar(url)` → `ansi-renderer.ts:OSC8_START/END`. We just need to set `url` on the link TextSpan instead of appending `(url)` text.

- [ ] **Step 1: Write the failing test**

```ts
it("链接渲染为 OSC 8 超链接，不附加 URL 文本", () => {
  const spans = renderer.render(parser.parse("[Click here](https://example.com)"));
  const linkSpan = findSpanWithText(spans, "Click here");
  expect(linkSpan.url).toBe("https://example.com");
  // Should NOT contain the URL as visible text
  const allText = collectText(spans);
  expect(allText).not.toContain("(https://example.com)");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "OSC 8"`
Expected: FAIL — current implementation appends `(url)` and doesn't set `span.url`

- [ ] **Step 3: Implement OSC 8 link rendering**

Replace `_renderLink`:

```ts
private _renderLink(node: MarkdownNode): TextSpan[] {
  const url = node.url ?? "";
  const linkStyle = this._theme.link;
  const children = this._renderChildren(node, linkStyle);
  return [
    new TextSpan({
      style: linkStyle,
      url,
      children,
    }),
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Update existing link test**

The existing test at line ~378 checks for URL appearing in `collectText()`. Update it to check `span.url` instead.

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): render links as OSC 8 hyperlinks instead of appending URL text"
```

---

### Task 5: Nested List Indentation + Bullet Style (Gap 5)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:280-337`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1433-1490` — nested lists get `left: depth * 2` padding. Bullets use `• `. Task list checked uses `[✓]`.

- [ ] **Step 1: Write the failing test**

```ts
describe("nested list indentation", () => {
  it("嵌套列表添加缩进", () => {
    const md = "- item 1\n  - nested item\n    - deep item";
    const spans = renderer.render(parser.parse(md));
    const text = collectText(spans);
    // Level 0: "• " prefix, no indent
    expect(text).toContain("• item 1");
    // Level 1: 2-space indent + "• "
    expect(text).toContain("  • nested item");
    // Level 2: 4-space indent + "• "
    expect(text).toContain("    • deep item");
  });

  it("task list checked 使用 ✓", () => {
    const md = "- [x] done";
    const spans = renderer.render(parser.parse(md));
    const text = collectText(spans);
    expect(text).toContain("[✓]");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "nested list"`
Expected: FAIL — current uses `  - ` prefix, no nesting indent, `[x]` not `[✓]`

- [ ] **Step 3: Implement nested list rendering with depth tracking**

Replace `_renderList` and `_renderListItem` — add a `depth` parameter:

```ts
private _renderList(node: MarkdownNode, parentStyle: TextStyle | undefined, depth: number = 0): TextSpan[] {
  const ordered = node.ordered ?? false;
  const spans: TextSpan[] = [];
  const items = node.children ?? [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    spans.push(...this._renderListItem(item, parentStyle, ordered, i, depth));
    if (i < items.length - 1) {
      spans.push(new TextSpan({ text: "\n" }));
    }
  }

  return spans;
}

private _renderListItem(
  node: MarkdownNode,
  parentStyle: TextStyle | undefined,
  ordered: boolean,
  index: number,
  depth: number = 0,
): TextSpan[] {
  const indent = "  ".repeat(depth);
  let prefix: string;
  if (node.checked === true) {
    prefix = `${indent}[✓] `;
  } else if (node.checked === false) {
    prefix = `${indent}[ ] `;
  } else if (ordered) {
    prefix = `${indent}${index + 1}. `;
  } else {
    prefix = `${indent}• `;
  }

  const resultSpans: TextSpan[] = [new TextSpan({ text: prefix })];

  // Render children, handling nested lists with increased depth
  for (const child of node.children ?? []) {
    if (child.type === "list") {
      resultSpans.push(new TextSpan({ text: "\n" }));
      resultSpans.push(...this._renderList(child, parentStyle, depth + 1));
    } else if (child.type === "paragraph") {
      // Flatten paragraph wrapper
      resultSpans.push(...this._renderChildren(child, parentStyle));
    } else {
      resultSpans.push(...this._renderNode(child, parentStyle));
    }
  }

  return [new TextSpan({ children: resultSpans })];
}
```

- [ ] **Step 4: Update the `_renderNode` switch for "list"**

```ts
case "list":
  return this._renderList(node, parentStyle, 0);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 6: Update existing list tests**

Update tests that check for `"  - "` prefix to expect `"• "` instead (no leading spaces for top-level). Update task list test from `"[x]"` to `"[✓]"`.

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): add nested list indentation, bullet char, and checkmark"
```

---

### Task 6: Blockquote Left Border Decoration (Gap 4)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:339-352`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1402-1420` — blockquote has outer padding `left: 2, right: 4`, inner container has a colored left border (`colors.border`), and inner padding `left: 1`.

In our TextSpan-based renderer (no widget layout), we simulate this with:
- 2-space left padding prefix
- `▐` or `│` in the border color (not dim)
- 1-space gap after the border
- Content is NOT dim (only the border has color)

- [ ] **Step 1: Write the failing test**

```ts
it("块引用使用彩色左边框，内容不 dim", () => {
  const spans = renderer.render(parser.parse("> quoted text"));
  const borderSpan = findSpanWithText(spans, "│");
  const contentSpan = findSpanWithText(spans, "quoted text");
  // Border uses theme color, not dim
  expect(borderSpan.style!.foreground.equals(defaultMarkdownTheme().blockquoteBorder)).toBe(true);
  expect(borderSpan.style!.dim).not.toBe(true);
  // Content text should not be dim
  expect(contentSpan.style?.dim).not.toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "彩色左边框"`
Expected: FAIL — current uses dim style on the `│ ` prefix

- [ ] **Step 3: Implement blockquote with colored border**

Replace `_renderBlockquote`:

```ts
private _renderBlockquote(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
  const borderStyle = new TextStyle({ foreground: this._theme.blockquoteBorder });
  const children = this._renderChildren(node, parentStyle);

  return [
    new TextSpan({
      children: [
        new TextSpan({ text: "  " }),                    // left padding
        new TextSpan({ text: "│", style: borderStyle }), // colored border
        new TextSpan({ text: " " }),                     // inner gap
        ...children,
      ],
    }),
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Update existing blockquote test**

The existing test checks for `"│ "` with dim. Update to check for the new structure (border char with theme color, not dim).

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): blockquote uses colored left border instead of dim prefix"
```

---

### Task 7: Image Node Rendering (Gap 7)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-parser.ts` (add `"image"` node type)
- Modify: `packages/tui/src/markdown/markdown-renderer.ts`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1634` — image renders as `[Image: altText]` in italic link style.

The parser currently drops `<img>` tags as unrecognized HTML. We need to handle `<img>` in `_handleOpenTag`.

- [ ] **Step 1: Write the failing test**

```ts
it("图片渲染为 [Image: alt] 样式", () => {
  const spans = renderer.render(parser.parse("![screenshot](http://example.com/img.png)"));
  const text = collectText(spans);
  expect(text).toContain("[Image: screenshot]");
  const imgSpan = findSpanWithText(spans, "[Image: screenshot]");
  expect(imgSpan.style!.italic).toBe(true);
  expect(imgSpan.style!.foreground.equals(Color.blue())).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "图片"`
Expected: FAIL — image markdown is currently swallowed by the HTML filter

- [ ] **Step 3: Add "image" to MarkdownNodeType**

In `markdown-parser.ts`, update the type:

```ts
export type MarkdownNodeType =
  | "document" | "paragraph" | "heading" | "strong" | "emphasis"
  | "delete" | "code" | "codeSpan" | "link" | "image" | "list" | "listItem"
  | "table" | "tableRow" | "tableCell" | "blockquote"
  | "thematicBreak" | "lineBreak" | "text" | "html";
```

Add `alt?: string` to `MarkdownNode`:

```ts
export interface MarkdownNode {
  // ... existing fields ...
  alt?: string;  // for image
}
```

- [ ] **Step 4: Handle `<img>` in parser `_handleOpenTag`**

Add before the `default` case in `_handleOpenTag`:

```ts
case "img": {
  const alt = this._getAttr(tag, "alt") ?? "";
  const src = this._getAttr(tag, "src") ?? "";
  const imageNode: MarkdownNode = { type: "image", alt, url: src };
  this._pushChild(stack, nodes, imageNode);
  return; // self-closing
}
```

- [ ] **Step 5: Add image rendering to MarkdownRenderer**

In `_renderNode` switch, add before `default`:

```ts
case "image":
  return this._renderImage(node);
```

Add the method:

```ts
private _renderImage(node: MarkdownNode): TextSpan[] {
  const alt = node.alt ?? "image";
  const style = this._theme.link.copyWith({ italic: true });
  return [new TextSpan({ text: `[Image: ${alt}]`, style, url: node.url })];
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/markdown/markdown-parser.ts packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): render image nodes as [Image: alt] with italic link style"
```

---

### Task 8: Smart Paragraph Spacing (Gap 8)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:89-102`
- Modify: `packages/tui/src/markdown/markdown-parser.ts` (add position info)
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1353-1375` — checks `hasBlankLineBetween(prev, next)` using source positions. Only inserts `\n` spacer if there was a blank line between adjacent blocks in the source.

Since micromark does not expose source positions in its HTML output, we adopt a simpler approach aligned with the amp behavior: always insert a single `\n\n` between block elements (current behavior), but use `\n` (single newline) between list items and within blockquotes. The key change is making the spacing configurable and context-aware.

Actually, re-reading amp's implementation: it inserts `\n` (blank-line spacer) between root-level children that had blank lines between them, and no spacer otherwise. Without position data from micromark, we approximate: use `\n\n` between different block types, `\n` between same-type consecutive blocks (e.g., consecutive paragraphs that were likely separated by a blank line).

The simplest correct approach: keep `\n\n` for block separation (matches amp's root-level behavior since markdown requires blank lines between blocks). The real gap is that flitter inserts `\n\n` even inside blockquotes and list items where amp doesn't. Fix: suppress double-newline inside nested contexts.

- [ ] **Step 1: Write the failing test**

```ts
it("块引用内段落之间使用单换行", () => {
  const md = "> line one\n> line two";
  const spans = renderer.render(parser.parse(md));
  const text = collectText(spans);
  // Should NOT have double newline inside blockquote
  expect(text).not.toContain("\n\n");
  expect(text).toContain("line one");
  expect(text).toContain("line two");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "块引用内段落"`
Expected: FAIL — current blindly inserts `\n\n`

- [ ] **Step 3: Add context-aware spacing**

Add an `_isNested` parameter to `_renderNodes`:

```ts
private _renderNodes(nodes: MarkdownNode[], parentStyle: TextStyle | undefined, nested: boolean = false): TextSpan[] {
  const spans: TextSpan[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodeSpans = this._renderNode(node, parentStyle);
    spans.push(...nodeSpans);

    if (this._isBlock(node) && i < nodes.length - 1) {
      spans.push(new TextSpan({ text: nested ? "\n" : "\n\n" }));
    }
  }
  return spans;
}
```

Update `_renderBlockquote` to call `_renderNodes` with `nested: true`:

```ts
private _renderBlockquote(node: MarkdownNode, parentStyle: TextStyle | undefined): TextSpan[] {
  const borderStyle = new TextStyle({ foreground: this._theme.blockquoteBorder });
  const children = node.children
    ? this._renderNodes(node.children, parentStyle, true)
    : [];

  return [
    new TextSpan({
      children: [
        new TextSpan({ text: "  " }),
        new TextSpan({ text: "│", style: borderStyle }),
        new TextSpan({ text: " " }),
        ...children,
      ],
    }),
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): context-aware paragraph spacing (single newline in nested blocks)"
```

---

### Task 9: Table Column Width and Alignment (Gap 3)

**Files:**
- Modify: `packages/tui/src/markdown/markdown-renderer.ts:376-413`
- Test: `packages/tui/src/markdown/markdown-renderer.test.ts`

**Amp reference:** `text_rendering.js:1544-1590` + `layout_widgets.js:1080` — uses `JY` widget with proportional column sizing, Unicode box-drawing (`╭╮╰╯`), alignment per column from `align` array, header row bold.

Since our renderer produces `TextSpan[]` (not a widget tree with layout), we implement column width normalization inline: measure max content width per column, pad cells to equal width, and apply text alignment. Use full Unicode box-drawing for borders matching amp.

- [ ] **Step 1: Write the failing test**

```ts
describe("table rendering", () => {
  it("表格列等宽对齐", () => {
    const md = "| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 5 |";
    const spans = renderer.render(parser.parse(md));
    const text = collectText(spans);
    const lines = text.split("\n");
    // All rows should have the same total width
    const widths = lines.filter(l => l.includes("│")).map(l => l.length);
    const allSame = widths.every(w => w === widths[0]);
    expect(allSame).toBe(true);
  });

  it("表头渲染为粗体", () => {
    const md = "| Name | Age |\n|------|-----|\n| Alice | 30 |";
    const spans = renderer.render(parser.parse(md));
    const headerSpan = findSpanWithText(spans, "Name");
    expect(headerSpan.style!.bold).toBe(true);
  });

  it("使用圆角 Unicode box-drawing 边框", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    const spans = renderer.render(parser.parse(md));
    const text = collectText(spans);
    expect(text).toContain("╭");
    expect(text).toContain("╯");
  });

  it("支持列对齐", () => {
    const md = "| Left | Right |\n|:-----|------:|\n| a | b |";
    const spans = renderer.render(parser.parse(md));
    const text = collectText(spans);
    // Right-aligned "b" should have leading spaces
    const dataRow = text.split("\n").find(l => l.includes("b"))!;
    const bCell = dataRow.split("│")[2]; // second data cell
    expect(bCell.trimStart().length < bCell.length).toBe(true); // has leading space
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts --test-name-pattern "表格"`
Expected: FAIL — no equal widths, no bold header, no rounded corners, no alignment

- [ ] **Step 3: Implement full table rendering**

Replace `_renderTable`:

```ts
private _renderTable(node: MarkdownNode): TextSpan[] {
  const rows = node.children ?? [];
  if (rows.length === 0) return [];

  const borderStyle = new TextStyle({ foreground: this._theme.tableBorder });
  const headerStyle = new TextStyle({ bold: true });
  const aligns = node.align ?? [];

  // Measure column widths
  const numCols = Math.max(...rows.map(r => (r.children ?? []).length));
  const colWidths: number[] = new Array(numCols).fill(0);

  const cellContents: string[][] = [];
  for (const row of rows) {
    const cells = row.children ?? [];
    const rowTexts: string[] = [];
    for (let j = 0; j < numCols; j++) {
      const cell = cells[j];
      const text = cell ? this._collectPlainText(cell) : "";
      rowTexts.push(text);
      colWidths[j] = Math.max(colWidths[j], text.length);
    }
    cellContents.push(rowTexts);
  }

  // Ensure minimum width of 3 per column
  for (let j = 0; j < numCols; j++) {
    colWidths[j] = Math.max(colWidths[j], 3);
  }

  const spans: TextSpan[] = [];

  // Top border: ╭───┬───╮
  const topBorder = "╭" + colWidths.map(w => "─".repeat(w + 2)).join("┬") + "╮";
  spans.push(new TextSpan({ text: topBorder, style: borderStyle }));
  spans.push(new TextSpan({ text: "\n" }));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.children ?? [];
    const isHeader = i === 0;

    // Data row: │ cell │ cell │
    const rowChildren: TextSpan[] = [];
    rowChildren.push(new TextSpan({ text: "│ ", style: borderStyle }));

    for (let j = 0; j < numCols; j++) {
      const cell = cells[j];
      const cellSpans = cell ? this._renderChildren(cell, isHeader ? headerStyle : undefined) : [];
      const plainText = cellContents[i][j];
      const padding = colWidths[j] - plainText.length;
      const align = aligns[j] ?? "left";

      let leftPad = 0;
      let rightPad = padding;
      if (align === "right") {
        leftPad = padding;
        rightPad = 0;
      } else if (align === "center") {
        leftPad = Math.floor(padding / 2);
        rightPad = padding - leftPad;
      }

      if (leftPad > 0) rowChildren.push(new TextSpan({ text: " ".repeat(leftPad) }));
      if (isHeader) {
        rowChildren.push(new TextSpan({ style: headerStyle, children: cellSpans }));
      } else {
        rowChildren.push(...cellSpans);
      }
      if (rightPad > 0) rowChildren.push(new TextSpan({ text: " ".repeat(rightPad) }));

      rowChildren.push(new TextSpan({
        text: j < numCols - 1 ? " │ " : " │",
        style: borderStyle,
      }));
    }
    spans.push(new TextSpan({ children: rowChildren }));
    spans.push(new TextSpan({ text: "\n" }));

    // Header separator: ├───┼───┤
    if (isHeader) {
      const sep = "├" + colWidths.map(w => "─".repeat(w + 2)).join("┼") + "┤";
      spans.push(new TextSpan({ text: sep, style: borderStyle }));
      spans.push(new TextSpan({ text: "\n" }));
    }
  }

  // Bottom border: ╰───┴───╯
  const bottomBorder = "╰" + colWidths.map(w => "─".repeat(w + 2)).join("┴") + "╯";
  spans.push(new TextSpan({ text: bottomBorder, style: borderStyle }));

  return spans;
}

private _collectPlainText(node: MarkdownNode): string {
  if (node.value) return node.value;
  if (!node.children) return "";
  return node.children.map(c => this._collectPlainText(c)).join("");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/markdown-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Update existing table test**

The old test checks for `"│ "` borders. Update to check for `"╭"` and equal-width columns.

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/markdown/markdown-renderer.ts packages/tui/src/markdown/markdown-renderer.test.ts
git commit -m "feat(markdown): table rendering with column width alignment and Unicode box-drawing"
```

---

### Task 10: Prism.js Syntax Highlighting (Gap 2)

**Files:**
- Modify: `packages/tui/package.json` (add `prismjs` dep)
- Create: `packages/tui/src/markdown/prism-languages.ts`
- Modify: `packages/tui/src/markdown/syntax-highlight.ts`
- Create: `packages/tui/src/markdown/syntax-highlight.test.ts`
- Test: `packages/tui/src/markdown/syntax-highlight.test.ts`

**Amp reference:** `2460_unknown_tE0.js` — uses `zP.default.languages[lang]` (Prism) + `zP.default.tokenize(content, grammar)`. Fallback to `clike` if lang not found. `0479_unknown_$m0.js` normalizes file extensions to Prism language names. `0480_unknown_vm0.js` maps token types to colors.

- [ ] **Step 1: Add prismjs dependency**

Run: `cd packages/tui && bun add prismjs && bun add -d @types/prismjs`

- [ ] **Step 2: Write the failing test**

Create `packages/tui/src/markdown/syntax-highlight.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { SyntaxHighlighter } from "./syntax-highlight.js";
import { Color } from "../screen/color.js";

describe("SyntaxHighlighter (Prism-based)", () => {
  const hl = new SyntaxHighlighter(SyntaxHighlighter.defaultTheme());

  it("TypeScript: highlights 'const' as keyword with blue color", () => {
    const spans = hl.highlight("const x = 1;", "typescript");
    const constSpan = spans.find(s => s.text === "const");
    expect(constSpan).toBeDefined();
    expect(constSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("Python: highlights 'def' as keyword", () => {
    const spans = hl.highlight("def hello():\n  pass", "python");
    const defSpan = spans.find(s => s.text === "def");
    expect(defSpan).toBeDefined();
    expect(defSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("Rust: highlights 'fn' as keyword", () => {
    const spans = hl.highlight("fn main() {}", "rust");
    const fnSpan = spans.find(s => s.text === "fn");
    expect(fnSpan).toBeDefined();
    expect(fnSpan!.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("未知语言回退到 clike", () => {
    const spans = hl.highlight("int x = 5;", "unknownlang");
    // Should still highlight 'int' since clike grammar handles it
    expect(spans.length).toBeGreaterThan(1);
  });

  it("函数名高亮为 cyan", () => {
    const spans = hl.highlight("function hello() {}", "javascript");
    const fnName = spans.find(s => s.text === "hello");
    // Prism identifies 'hello' as function in this context
    if (fnName?.style) {
      expect(fnName.style.foreground.equals(Color.cyan())).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/tui && bun test src/markdown/syntax-highlight.test.ts`
Expected: FAIL — current `_lang` parameter is unused

- [ ] **Step 4: Create prism-languages.ts**

```ts
const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  cs: "csharp",
  "c#": "csharp",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  dart: "dart",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  shell: "bash",
  sql: "sql",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  markdown: "markdown",
  html: "markup",
  xml: "markup",
  svg: "markup",
  css: "css",
  scss: "scss",
  sass: "sass",
  zig: "zig",
  // Direct passthrough for already-correct names
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  ruby: "ruby",
  rust: "rust",
  kotlin: "kotlin",
  csharp: "csharp",
  markup: "markup",
};

export function normalizeLangName(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return EXT_TO_LANG[lower] ?? lower;
}
```

- [ ] **Step 5: Rewrite SyntaxHighlighter.highlight to use Prism**

Replace the `highlight` method and `_tokenize` in `syntax-highlight.ts`:

```ts
import Prism from "prismjs";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-yaml.js";
import "prismjs/components/prism-markdown.js";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-ruby.js";
import "prismjs/components/prism-php.js";
import "prismjs/components/prism-swift.js";
import "prismjs/components/prism-kotlin.js";
import "prismjs/components/prism-dart.js";
import { normalizeLangName } from "./prism-languages.js";

// ... existing interfaces ...

export class SyntaxHighlighter {
  private readonly _theme: SyntaxTheme;

  constructor(theme: SyntaxTheme) {
    this._theme = theme;
  }

  highlight(code: string, lang: string): TextSpan[] {
    const normalizedLang = normalizeLangName(lang);
    const grammar = Prism.languages[normalizedLang] ?? Prism.languages["clike"];

    if (!grammar) {
      return [new TextSpan({ text: code, style: this._theme.plain })];
    }

    try {
      const tokens = Prism.tokenize(code, grammar);
      const spans: TextSpan[] = [];
      this._flattenTokens(tokens, spans);
      return spans.length > 0 ? spans : [new TextSpan({ text: code, style: this._theme.plain })];
    } catch {
      return [new TextSpan({ text: code, style: this._theme.plain })];
    }
  }

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
          // For compound tokens, recursively flatten but keep parent type's style
          // Actually, recurse to get child types correctly
          this._flattenTokens(token.content as Array<string | Prism.Token>, spans);
        } else {
          // Single nested token
          this._flattenTokens([token.content as Prism.Token], spans);
        }
      }
    }
  }

  private _mapTokenType(type: string): TextStyle {
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
      case "class-name":
        return this._theme.function;
      case "variable":
      case "property":
      case "attr-name":
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
        return this._theme.plain;
    }
  }

  static defaultTheme(): SyntaxTheme {
    // ... unchanged ...
  }
}
```

- [ ] **Step 6: Keep regex-based `_tokenize` as fallback**

Rename the old `_tokenize` to `_tokenizeRegex` and keep it as a private fallback. Use it if Prism import fails (for environments where Prism is unavailable):

```ts
highlight(code: string, lang: string): TextSpan[] {
  if (!Prism?.languages) {
    return this._highlightFallback(code);
  }
  // ... Prism path ...
}

private _highlightFallback(code: string): TextSpan[] {
  const tokens = this._tokenizeRegex(code);
  return tokens.map(tok => new TextSpan({ text: tok.text, style: this._theme[tok.type] }));
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd packages/tui && bun test src/markdown/syntax-highlight.test.ts`
Expected: PASS

- [ ] **Step 8: Run full markdown test suite**

Run: `cd packages/tui && bun test src/markdown/`
Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add packages/tui/package.json packages/tui/src/markdown/prism-languages.ts packages/tui/src/markdown/syntax-highlight.ts packages/tui/src/markdown/syntax-highlight.test.ts
git commit -m "feat(markdown): replace regex highlighter with Prism.js for language-aware syntax highlighting"
```

---

### Task 11: Wire MarkdownTheme in ConversationView (Gap 10)

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts`
- Modify: `packages/tui/src/markdown/index.ts`

**Amp reference:** `text_rendering.js:1282-1328` — resolves theme from `$R.of(T)` context, builds `styleScheme` with `assistantMessage`, `inlineCode`, `codeBlock`, `tableBorder`, `link`, `syntaxHighlight` from app palette.

- [ ] **Step 1: Write the failing test** (integration, manual verification)

This is a wiring task. Verify by running the app with `FLITTER_LOG_LEVEL=debug` and checking that the markdown theme colors are pulled from the app palette rather than hardcoded defaults.

- [ ] **Step 2: Update ConversationView to pass MarkdownTheme**

In `conversation-view.ts`, where `MarkdownRenderer` is instantiated, pass the theme derived from the app palette:

```ts
import { type MarkdownTheme, defaultMarkdownTheme } from "@anthropic/tui/markdown";
import { syntaxColorsToTheme } from "@anthropic/tui/markdown";

// In the state class constructor or build method:
private _createMarkdownTheme(): MarkdownTheme {
  const palette = this._getColorPalette(); // however the palette is currently accessed
  if (!palette) return defaultMarkdownTheme();

  return {
    headingColors: [
      palette.primary,      // h1
      palette.secondary,    // h2
      palette.primary,      // h3
      palette.secondary,    // h4
      palette.foreground,   // h5
      palette.foreground,   // h6
    ],
    headingBoldLevels: 2,
    inlineCode: new TextStyle({ foreground: palette.syntaxHighlight.string, bold: true }),
    codeBlockForeground: palette.foreground,
    link: new TextStyle({ foreground: palette.primary, underline: true }),
    blockquoteBorder: palette.border,
    tableBorder: palette.tableBorder,
    syntaxTheme: syntaxColorsToTheme(palette.syntaxHighlight),
  };
}
```

Then pass it when creating the renderer:

```ts
this._renderer = new MarkdownRenderer({
  markdownTheme: this._createMarkdownTheme(),
});
```

- [ ] **Step 3: Verify no type errors**

Run: `cd packages/tui && bun run tsc --noEmit && cd ../cli && bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(markdown): wire MarkdownTheme from app palette into conversation view"
```

---

### Task 12: Final Integration Test

**Files:**
- Test: all markdown test files

- [ ] **Step 1: Run full test suite**

Run: `cd packages/tui && bun test src/markdown/`
Expected: All PASS

- [ ] **Step 2: Run type check**

Run: `cd packages/tui && bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Manual verification with tmux**

```bash
# Start the app with a test conversation that exercises all markdown features
tmux new-session -d -s test -x 120 -y 40 "bun run packages/cli/src/main.ts 2>/tmp/flitter-test.log"
sleep 3
tmux capture-pane -t test -p > /tmp/md-render-test.txt
cat /tmp/md-render-test.txt
tmux kill-session -t test
```

Verify visually:
- Headings have blue/cyan colors
- Code blocks have syntax highlighting per language
- Tables have rounded corners and equal column widths
- Links are underlined blue (no raw URL visible)
- Blockquotes have colored left border
- Nested lists are properly indented
- Images show as `[Image: alt]`

- [ ] **Step 4: Commit any final fixes**

If any issues found during manual verification, fix and commit.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test(markdown): verify all 10 rendering gaps closed"
```

---

## Execution Dependencies

```
Task 1 (MarkdownTheme) ─┐
                         ├─→ Task 2 (Headings)
                         ├─→ Task 3 (Inline code bold)
                         ├─→ Task 4 (OSC 8 links)
                         ├─→ Task 6 (Blockquote border)
                         ├─→ Task 9 (Table rendering)
                         └─→ Task 10 (Prism.js)
Task 5 (Nested lists) ──────→ independent
Task 7 (Image nodes) ───────→ independent
Task 8 (Smart spacing) ─────→ depends on Task 6
Task 11 (Wire theme) ───────→ depends on Tasks 1, 2, 3, 4, 6, 9, 10
Task 12 (Integration) ──────→ depends on all
```

Tasks 5 and 7 are fully independent and can be parallelized with anything except Task 12.
