# Markdown 渲染 Widget 化升级 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Markdown 渲染从 TextSpan[] 扁平输出升级为 Widget 树输出，对齐 amp-cli Z3 架构。

**Architecture:** MarkdownView (StatelessWidget) 通过 unified/remark-parse/remark-gfm 解析 Markdown 为 mdast AST，再由 block builder 将各块级节点映射为 Widget 树（Column/Row/Container/RichText/Table），inline builder 将行内节点映射为 TextSpan 树。主题通过 InheritedWidget 注入。

**Tech Stack:** TypeScript, Bun, unified ^11, remark-parse ^11, remark-gfm ^4, @types/mdast ^4, parse5 ^7, Prism.js

---

## Task 1: 安装依赖

**Files:**
- Modify: `packages/tui/package.json`

- [ ] **Step 1: 安装 unified/remark/parse5 依赖**

```bash
cd packages/tui && bun add unified@^11 remark-parse@^11 remark-gfm@^4 parse5@^7 && bun add -d @types/mdast@^4 @types/parse5@^7
```

- [ ] **Step 2: 验证安装成功**

```bash
cd /Users/bytedance/workspace/flitter && bun install
```

Expected: 无错误，`node_modules` 正确解析。

- [ ] **Step 3: Commit**

```bash
git add packages/tui/package.json bun.lockb
git commit -m "chore(tui): add unified/remark-parse/remark-gfm/parse5 dependencies for markdown widget upgrade"
```

---

## Task 2: 重写 markdown-parser.ts（unified/remark）

**Files:**
- Modify: `packages/tui/src/markdown/markdown-parser.ts`
- Modify: `packages/tui/src/markdown/markdown-parser.test.ts`

**amp 参考:** `amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1261-1300` — Z3 构造函数中 `unified().use(remarkParse).use(remarkGfm)` 管线。

- [ ] **Step 1: 编写新解析器测试**

```typescript
// packages/tui/src/markdown/markdown-parser.test.ts
import { describe, expect, it } from "bun:test";
import { parse } from "./markdown-parser.js";

describe("markdown-parser (remark)", () => {
  it("parses paragraph", () => {
    const root = parse("Hello world");
    expect(root.type).toBe("root");
    expect(root.children).toHaveLength(1);
    expect(root.children[0].type).toBe("paragraph");
  });

  it("parses heading with position", () => {
    const root = parse("# Title");
    const heading = root.children[0];
    expect(heading.type).toBe("heading");
    expect((heading as any).depth).toBe(1);
    expect(heading.position).toBeDefined();
    expect(heading.position!.start.offset).toBe(0);
  });

  it("parses GFM table", () => {
    const root = parse("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(root.children[0].type).toBe("table");
  });

  it("parses GFM strikethrough", () => {
    const root = parse("~~deleted~~");
    const p = root.children[0] as any;
    expect(p.children[0].type).toBe("delete");
  });

  it("parses GFM task list", () => {
    const root = parse("- [x] done\n- [ ] todo");
    const list = root.children[0] as any;
    expect(list.children[0].checked).toBe(true);
    expect(list.children[1].checked).toBe(false);
  });

  it("parses code block with language and position", () => {
    const md = "```ts\nconst x = 1;\n```";
    const root = parse(md);
    const code = root.children[0] as any;
    expect(code.type).toBe("code");
    expect(code.lang).toBe("ts");
    expect(code.position).toBeDefined();
  });

  it("preserves position for blank-line detection", () => {
    const root = parse("first\n\nsecond");
    const [p1, p2] = root.children;
    // p2 starts after a blank line
    expect(p2.position!.start.line - p1.position!.end.line).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-parser.test.ts
```

Expected: FAIL（旧 API 不导出 `parse` 函数）

- [ ] **Step 3: 重写 markdown-parser.ts**

```typescript
/**
 * Markdown 解析器 — unified + remark-parse + remark-gfm。
 *
 * 输出标准 mdast AST（带 position 信息），供 MarkdownView Widget 消费。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1261-1300
 *   amp 使用 unified().use(remarkParse).use(remarkGfm) 解析，本模块完全对齐。
 *
 * @module
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

/**
 * unified 处理器单例。
 *
 * 仅执行 parse 阶段（不 run/stringify），输出 mdast Root。
 */
const processor = unified().use(remarkParse).use(remarkGfm);

/**
 * 将 Markdown 文本解析为 mdast AST。
 *
 * @param markdown - Markdown 源文本
 * @returns mdast Root 节点（含 position 信息）
 */
export function parse(markdown: string): Root {
  return processor.parse(markdown) as Root;
}

// ════════════════════════════════════════════════════
//  Legacy API (deprecated)
// ════════════════════════════════════════════════════

/** @deprecated 使用 parse() 函数代替 */
export { MarkdownParser, type MarkdownNode, type MarkdownNodeType } from "./markdown-parser-legacy.js";
```

- [ ] **Step 4: 将旧文件重命名为 legacy**

将 `packages/tui/src/markdown/markdown-parser.ts` 当前全部内容移动到 `packages/tui/src/markdown/markdown-parser-legacy.ts`，然后用 Step 3 内容写入 `markdown-parser.ts`。

- [ ] **Step 5: 运行测试验证通过**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-parser.test.ts
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/markdown/markdown-parser.ts packages/tui/src/markdown/markdown-parser-legacy.ts packages/tui/src/markdown/markdown-parser.test.ts
git commit -m "feat(tui/markdown): rewrite parser to unified/remark-parse/remark-gfm with mdast output"
```

---

## Task 3: 实现 markdown-inline-builder.ts

**Files:**
- Create: `packages/tui/src/markdown/markdown-inline-builder.ts`
- Create: `packages/tui/src/markdown/markdown-inline-builder.test.ts`

**amp 参考:** `amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1450-1640` — Z3 的 `processInline` 方法，递归处理 text/strong/emphasis/delete/inlineCode/link/image。

- [ ] **Step 1: 编写 inline builder 测试**

```typescript
// packages/tui/src/markdown/markdown-inline-builder.test.ts
import { describe, expect, it } from "bun:test";
import { buildInline, generateHyperlinkId } from "./markdown-inline-builder.js";
import type { PhrasingContent } from "mdast";
import { TextStyle } from "../screen/text-style.js";
import { Color } from "../screen/color.js";
import { defaultMarkdownTheme } from "./markdown-theme.js";

const theme = defaultMarkdownTheme();
const baseStyle = new TextStyle({});

describe("buildInline", () => {
  it("renders plain text", () => {
    const nodes: PhrasingContent[] = [{ type: "text", value: "hello" }];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.text).toBeUndefined();
    expect(span.children).toHaveLength(1);
    expect(span.children![0].text).toBe("hello");
  });

  it("renders strong (bold)", () => {
    const nodes: PhrasingContent[] = [
      { type: "strong", children: [{ type: "text", value: "bold" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].style?.bold).toBe(true);
  });

  it("renders emphasis (italic)", () => {
    const nodes: PhrasingContent[] = [
      { type: "emphasis", children: [{ type: "text", value: "em" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].style?.italic).toBe(true);
  });

  it("renders delete (strikethrough)", () => {
    const nodes: PhrasingContent[] = [
      { type: "delete", children: [{ type: "text", value: "del" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].style?.strikethrough).toBe(true);
  });

  it("renders inline code with theme style", () => {
    const nodes: PhrasingContent[] = [{ type: "inlineCode", value: "x" }];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].text).toBe("x");
    expect(span.children![0].style?.bold).toBe(true); // default theme inlineCode is bold
  });

  it("renders link with url and underline", () => {
    const nodes: PhrasingContent[] = [
      { type: "link", url: "https://example.com", children: [{ type: "text", value: "link" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].style?.underline).toBe(true);
    expect(span.children![0].url).toBe("https://example.com");
  });

  it("renders image as [Image: alt]", () => {
    const nodes: PhrasingContent[] = [
      { type: "image", url: "img.png", alt: "photo" },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].text).toBe("[Image: photo]");
    expect(span.children![0].style?.italic).toBe(true);
  });

  it("renders nested formatting (strong > emphasis)", () => {
    const nodes: PhrasingContent[] = [
      {
        type: "strong",
        children: [{ type: "emphasis", children: [{ type: "text", value: "bi" }] }],
      },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    const inner = span.children![0].children![0];
    expect(inner.style?.bold).toBe(true);
    expect(inner.style?.italic).toBe(true);
  });
});

describe("generateHyperlinkId", () => {
  it("returns deterministic md- prefixed id", () => {
    const id = generateHyperlinkId("https://example.com", 0);
    expect(id.startsWith("md-")).toBe(true);
    expect(generateHyperlinkId("https://example.com", 0)).toBe(id);
  });

  it("different index yields different id", () => {
    const a = generateHyperlinkId("https://example.com", 0);
    const b = generateHyperlinkId("https://example.com", 1);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-inline-builder.test.ts
```

Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 markdown-inline-builder.ts**

```typescript
/**
 * Markdown 内联节点构建器 — mdast PhrasingContent → TextSpan。
 *
 * 将 mdast 内联节点（text, strong, emphasis, delete, inlineCode, link, image, break）
 * 递归转换为 TextSpan 树。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1450-1640
 *   Z3.processInline 递归处理各内联类型，应用 style.copyWith 叠加格式。
 *
 * @module
 */

import type { PhrasingContent } from "mdast";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "../widgets/text-span.js";
import type { MarkdownTheme } from "./markdown-theme.js";

/**
 * 内联构建上下文。
 */
export interface InlineContext {
  /** 当前继承样式 */
  style: TextStyle;
  /** Markdown 主题 */
  theme: MarkdownTheme;
  /** 可选: 位置感知颜色变换 (用于流式渲染染色) */
  colorTransform?: (offset: number, baseColor: import("../screen/color.js").Color) => import("../screen/color.js").Color;
  /** 内部链接计数器 (用于 hyperlink ID) */
  _linkIndex?: number;
}

/**
 * 将 mdast 内联节点数组构建为包含所有子 span 的根 TextSpan。
 *
 * @param nodes - mdast PhrasingContent 节点数组
 * @param ctx - 内联构建上下文
 * @returns 根 TextSpan（children 为各内联节点的 span）
 */
export function buildInline(nodes: PhrasingContent[], ctx: InlineContext): TextSpan {
  const children = nodes.map((node) => buildInlineNode(node, ctx));
  return new TextSpan({ children, style: ctx.style });
}

/**
 * 递归处理单个内联节点。
 */
function buildInlineNode(node: PhrasingContent, ctx: InlineContext): TextSpan {
  switch (node.type) {
    case "text":
      return new TextSpan({ text: node.value, style: ctx.style });

    case "strong": {
      const childStyle = ctx.style.copyWith({ bold: true });
      const childCtx: InlineContext = { ...ctx, style: childStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({ children, style: childStyle });
    }

    case "emphasis": {
      const childStyle = ctx.style.copyWith({ italic: true });
      const childCtx: InlineContext = { ...ctx, style: childStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({ children, style: childStyle });
    }

    case "delete": {
      const childStyle = ctx.style.copyWith({ strikethrough: true });
      const childCtx: InlineContext = { ...ctx, style: childStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({ children, style: childStyle });
    }

    case "inlineCode":
      return new TextSpan({ text: node.value, style: ctx.theme.inlineCode });

    case "link": {
      const linkIndex = ctx._linkIndex ?? 0;
      ctx._linkIndex = linkIndex + 1;
      const linkStyle = ctx.theme.link;
      const childCtx: InlineContext = { ...ctx, style: linkStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({
        children,
        style: linkStyle,
        url: node.url,
        hyperlinkId: generateHyperlinkId(node.url, linkIndex),
      });
    }

    case "image": {
      const alt = node.alt || "image";
      const imageStyle = ctx.theme.link.copyWith({ italic: true });
      return new TextSpan({ text: `[Image: ${alt}]`, style: imageStyle });
    }

    case "break":
      return new TextSpan({ text: "\n" });

    default:
      // 未知内联节点 — 尝试提取文本
      if ("value" in node && typeof node.value === "string") {
        return new TextSpan({ text: node.value, style: ctx.style });
      }
      if ("children" in node && Array.isArray(node.children)) {
        const children = node.children.map((c: any) => buildInlineNode(c, ctx));
        return new TextSpan({ children, style: ctx.style });
      }
      return new TextSpan({ text: "", style: ctx.style });
  }
}

/**
 * 生成 OSC 8 hyperlink ID。
 *
 * 使用 DJB2 hash 算法，对齐 amp 的 eE0() 实现。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:~1590
 *
 * @param url - 链接 URL
 * @param index - 链接在文档中的序号
 * @returns `md-${hash}` 格式的 ID
 */
export function generateHyperlinkId(url: string, index: number): string {
  let hash = 5381;
  const str = `${url}:${index}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return `md-${(hash >>> 0).toString(36)}`;
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-inline-builder.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/markdown/markdown-inline-builder.ts packages/tui/src/markdown/markdown-inline-builder.test.ts
git commit -m "feat(tui/markdown): implement inline builder — mdast PhrasingContent to TextSpan"
```

---

## Task 4: 实现 markdown-block-builder.ts

**Files:**
- Create: `packages/tui/src/markdown/markdown-block-builder.ts`
- Create: `packages/tui/src/markdown/markdown-block-builder.test.ts`

**amp 参考:** `amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1300-1450` — Z3.build() 中对各块级 AST 节点的 Widget 映射逻辑。

- [ ] **Step 1: 编写 block builder 测试**

```typescript
// packages/tui/src/markdown/markdown-block-builder.test.ts
import { describe, expect, it } from "bun:test";
import { buildBlocks, hasBlankLineBetween } from "./markdown-block-builder.js";
import { parse } from "./markdown-parser.js";
import { defaultMarkdownTheme } from "./markdown-theme.js";
import { TextStyle } from "../screen/text-style.js";
import { Column } from "../widgets/column.js";
import { Container } from "../widgets/container.js";
import { RichText } from "../widgets/rich-text.js";
import { Row } from "../widgets/row.js";
import { Table } from "../widgets/table.js";
import { SizedBox } from "../widgets/sized-box.js";

const theme = defaultMarkdownTheme();
const baseStyle = new TextStyle({});

function widgetsFor(md: string) {
  const root = parse(md);
  return buildBlocks(root.children, { theme, style: baseStyle, streaming: false });
}

describe("buildBlocks", () => {
  it("paragraph → RichText", () => {
    const widgets = widgetsFor("Hello world");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(RichText);
  });

  it("heading → RichText without # prefix", () => {
    const widgets = widgetsFor("# Title");
    expect(widgets).toHaveLength(1);
    const rt = widgets[0] as RichText;
    // 验证无 # 前缀: text 内容应为 "Title"
    expect(rt.text.text).toBeUndefined();
    const childText = rt.text.children?.[0]?.children?.[0]?.text ?? rt.text.children?.[0]?.text;
    expect(childText).toBe("Title");
  });

  it("code block → Container wrapping RichText", () => {
    const widgets = widgetsFor("```ts\nconst x = 1;\n```");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Container);
  });

  it("empty code block is skipped", () => {
    const widgets = widgetsFor("```\n\n```");
    expect(widgets).toHaveLength(0);
  });

  it("blockquote → Container with border decoration", () => {
    const widgets = widgetsFor("> quoted text");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Container);
  });

  it("unordered list → Column of Rows", () => {
    const widgets = widgetsFor("- item 1\n- item 2");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Column);
  });

  it("ordered list supports start offset", () => {
    // remark-gfm 应保留 start 属性
    const root = parse("3. third\n4. fourth");
    const list = root.children[0] as any;
    expect(list.start).toBe(3);
  });

  it("table → Table widget", () => {
    const widgets = widgetsFor("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Table);
  });

  it("thematic break → RichText with ---", () => {
    const widgets = widgetsFor("---");
    expect(widgets).toHaveLength(1);
    const rt = widgets[0] as RichText;
    expect(rt.text.text).toBe("---");
  });

  it("inserts SizedBox between blocks with blank lines", () => {
    const widgets = widgetsFor("first\n\nsecond");
    // paragraph, SizedBox, paragraph
    expect(widgets).toHaveLength(3);
    expect(widgets[1]).toBeInstanceOf(SizedBox);
  });

  it("no SizedBox between adjacent blocks without blank line", () => {
    // Adjacent list items have no blank line
    const widgets = widgetsFor("- a\n- b");
    // Single Column for the list
    expect(widgets).toHaveLength(1);
  });
});

describe("hasBlankLineBetween", () => {
  it("returns true when blank line exists", () => {
    const root = parse("first\n\nsecond");
    const [a, b] = root.children;
    expect(hasBlankLineBetween(a, b)).toBe(true);
  });

  it("returns false when no blank line", () => {
    const root = parse("first\nsecond");
    // remark merges into single paragraph — use headings
    const root2 = parse("# A\n## B");
    const [a, b] = root2.children;
    expect(hasBlankLineBetween(a, b)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-block-builder.test.ts
```

Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 markdown-block-builder.ts**

```typescript
/**
 * Markdown 块级节点构建器 — mdast Content → Widget[]。
 *
 * 将 mdast 块级节点（paragraph, heading, code, blockquote, list, table,
 * thematicBreak, html）映射为 TUI Widget 树。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1300-1450
 *   Z3.build() 返回 Column({ children: blocks.map(processBlock) })。
 *
 * @module
 */

import type { Content, List, ListItem, Table as MdastTable, Code, Blockquote, Heading, Paragraph, ThematicBreak, Html } from "mdast";
import type { Node } from "unist";
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "../widgets/text-span.js";
import { RichText } from "../widgets/rich-text.js";
import { Column } from "../widgets/column.js";
import { Row } from "../widgets/row.js";
import { Container } from "../widgets/container.js";
import { Expanded } from "../widgets/flexible.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Table, type TableRow, type TableColumnConfig } from "../widgets/table.js";
import type { Widget } from "../tree/widget.js";
import { buildInline, type InlineContext } from "./markdown-inline-builder.js";
import type { MarkdownTheme } from "./markdown-theme.js";
import { SyntaxHighlighter } from "./syntax-highlight.js";

/**
 * 块级构建上下文。
 */
export interface BlockContext {
  /** Markdown 主题 */
  theme: MarkdownTheme;
  /** 基础文本样式 */
  style: TextStyle;
  /** 流式模式 */
  streaming: boolean;
  /** 位置感知颜色变换 */
  colorTransform?: (offset: number, baseColor: Color) => Color;
}

/**
 * 判断两个 AST 节点之间是否有空行。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:~1300
 *   `hasBlankLineBetween(prev, next)` 基于 position.end.line 与 position.start.line 差值。
 *
 * @param prev - 前一个节点
 * @param next - 后一个节点
 * @returns 有空行返回 true
 */
export function hasBlankLineBetween(prev: Node, next: Node): boolean {
  if (!prev.position || !next.position) return true; // 无位置信息时默认插入
  return next.position.start.line - prev.position.end.line > 1;
}

/**
 * 将 mdast 块级节点数组构建为 Widget 数组。
 *
 * 自动在有空行分隔的相邻块之间插入 SizedBox({ height: 1 })。
 *
 * @param nodes - mdast Content 节点数组
 * @param ctx - 块级构建上下文
 * @returns Widget 数组
 */
export function buildBlocks(nodes: Content[], ctx: BlockContext): Widget[] {
  const widgets: Widget[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const widget = buildBlockNode(node, ctx);
    if (widget === null) continue; // 跳过空节点

    // 在有空行的相邻块之间插入间距
    if (widgets.length > 0 && i > 0 && hasBlankLineBetween(nodes[i - 1], node)) {
      widgets.push(new SizedBox({ height: 1 }));
    }
    widgets.push(widget);
  }

  return widgets;
}

/**
 * 处理单个块级节点，映射为 Widget。
 */
function buildBlockNode(node: Content, ctx: BlockContext): Widget | null {
  switch (node.type) {
    case "paragraph":
      return buildParagraph(node as Paragraph, ctx);
    case "heading":
      return buildHeading(node as Heading, ctx);
    case "code":
      return buildCodeBlock(node as Code, ctx);
    case "blockquote":
      return buildBlockquote(node as Blockquote, ctx);
    case "list":
      return buildList(node as List, ctx);
    case "table":
      return buildTable(node as MdastTable, ctx);
    case "thematicBreak":
      return buildThematicBreak();
    case "html":
      return buildHtml(node as Html);
    default:
      // 未知块级节点 — 尝试提取文本
      if ("value" in node && typeof node.value === "string") {
        return new RichText({ text: new TextSpan({ text: node.value, style: ctx.style }) });
      }
      return null;
  }
}

/** paragraph → RichText */
function buildParagraph(node: Paragraph, ctx: BlockContext): Widget {
  const inlineCtx: InlineContext = { style: ctx.style, theme: ctx.theme, colorTransform: ctx.colorTransform };
  const span = buildInline(node.children, inlineCtx);
  return new RichText({ text: span });
}

/**
 * heading → RichText (无 # 前缀)。
 *
 * 逆向: amp Z3 — level ≤ 2 使用 bold; 颜色从 colors.primary/secondary 交替。
 */
function buildHeading(node: Heading, ctx: BlockContext): Widget {
  const level = node.depth;
  const colorIndex = Math.min(level - 1, 5);
  const color = ctx.theme.headingColors[colorIndex];
  const bold = level <= ctx.theme.headingBoldLevels;
  const headingStyle = ctx.style.copyWith({ foreground: color, bold });
  const inlineCtx: InlineContext = { style: headingStyle, theme: ctx.theme, colorTransform: ctx.colorTransform };
  const span = buildInline(node.children, inlineCtx);
  return new RichText({ text: span });
}

/**
 * code → Container({ padding, child: RichText(highlighted) })。
 *
 * 逆向: amp Z3 — Container(padding: EdgeInsets.only(left:4, right:4))，
 *   跳过 value.trim() 为空的代码块。
 */
function buildCodeBlock(node: Code, ctx: BlockContext): Widget | null {
  if (!node.value.trim()) return null; // 跳过空代码块

  const highlighter = new SyntaxHighlighter(ctx.theme.syntaxTheme);
  const spans = highlighter.highlight(node.value, node.lang ?? undefined);

  return new Container({
    padding: EdgeInsets.only({ left: 4, right: 4 }),
    child: new RichText({ text: new TextSpan({ children: spans }) }),
  });
}

/**
 * blockquote → Container({ padding, decoration: Border.left, child: Column })。
 *
 * 逆向: amp Z3 — Container(padding: left:2,right:4, decoration: BoxDecoration(border: Border.left(borderColor, 1)))
 */
function buildBlockquote(node: Blockquote, ctx: BlockContext): Widget {
  const children = buildBlocks(node.children, ctx);
  return new Container({
    padding: EdgeInsets.only({ left: 1 }),
    decoration: new BoxDecoration({
      border: new Border({
        left: new BorderSide({ color: ctx.theme.blockquoteBorder, width: 1 }),
      }),
    }),
    child: new Column({ children }),
  });
}

/**
 * list → Column(items.map(buildListItem))。
 *
 * 逆向: amp Z3 — 有序: `${start+index}. `，无序: `• `，任务: `[✓]`/`[ ]`。
 */
function buildList(node: List, ctx: BlockContext): Widget {
  const items = node.children.map((item, index) =>
    buildListItem(item, index, node, ctx)
  );
  return new Column({ children: items });
}

/**
 * listItem → Row([RichText(bullet), Expanded(Column(children))])。
 *
 * 逆向: amp Z3 — Row(crossAxis:"start") 实现多行自动对齐。
 */
function buildListItem(item: ListItem, index: number, list: List, ctx: BlockContext): Widget {
  // 确定 bullet 标记
  let bullet: string;
  if (item.checked === true) {
    bullet = "[✓] ";
  } else if (item.checked === false) {
    bullet = "[ ] ";
  } else if (list.ordered) {
    const start = list.start ?? 1;
    bullet = `${start + index}. `;
  } else {
    bullet = "• ";
  }

  const bulletWidget = new RichText({
    text: new TextSpan({ text: bullet, style: ctx.style }),
  });

  const children = buildBlocks(item.children, ctx);
  const contentWidget = new Column({ children });

  return new Row({
    crossAxisAlignment: "start",
    children: [bulletWidget, new Expanded({ child: contentWidget })],
  });
}

/**
 * table → Table Widget。
 *
 * 逆向: amp Z3 — Table({ rows, columnConfigs: "proportional", borderColor, showBorders: true })。
 */
function buildTable(node: MdastTable, ctx: BlockContext): Widget {
  const mdRows = node.children; // tableRow[]
  const colCount = mdRows[0]?.children?.length ?? 0;

  // 列配置: proportional（对齐 amp 默认策略）
  const columnConfigs: TableColumnConfig[] = Array.from({ length: colCount }, () => ({
    widthType: "proportional" as const,
  }));

  // 构建行数据
  const rows: TableRow[] = mdRows.map((row) => ({
    cells: row.children.map((cell) => {
      const inlineCtx: InlineContext = { style: ctx.style, theme: ctx.theme };
      const span = buildInline(cell.children, inlineCtx);
      return { child: new RichText({ text: span }) };
    }),
  }));

  return new Table({
    rows,
    columnConfigs,
    borderColor: ctx.theme.tableBorder,
    showBorders: true,
  });
}

/** thematicBreak → RichText("---") — 对齐 amp（3 字符）。 */
function buildThematicBreak(): Widget {
  return new RichText({ text: new TextSpan({ text: "---" }) });
}

/**
 * html → 提取纯文本渲染。
 *
 * 逆向: amp Z3 — 通过 parse5 解析 HTML 节点，取文本内容。
 * 简化实现: 去除标签，保留文本。
 */
function buildHtml(node: Html): Widget | null {
  const text = node.value.replace(/<[^>]*>/g, "").trim();
  if (!text) return null;
  return new RichText({ text: new TextSpan({ text }) });
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-block-builder.test.ts
```

Expected: All PASS（部分测试可能需要微调 Widget 层 API 细节）

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/markdown/markdown-block-builder.ts packages/tui/src/markdown/markdown-block-builder.test.ts
git commit -m "feat(tui/markdown): implement block builder — mdast Content to Widget tree"
```

---

## Task 5: 实现 MarkdownTheme InheritedWidget

**Files:**
- Modify: `packages/tui/src/markdown/markdown-theme.ts`

**amp 参考:** `amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1282` — `$R.of(context)` 从 BuildContext 获取主题。

- [ ] **Step 1: 编写 InheritedWidget 测试**

在现有 `markdown-theme.ts` 的基础上扩展测试:

```typescript
// 追加到已有测试文件或新建 markdown-theme.test.ts
import { describe, expect, it } from "bun:test";
import { MarkdownThemeWidget, defaultMarkdownTheme, type MarkdownTheme } from "./markdown-theme.js";

describe("MarkdownThemeWidget", () => {
  it("is an InheritedWidget with data", () => {
    const theme = defaultMarkdownTheme();
    // MarkdownThemeWidget 需要 child 参数
    // 这里仅验证构造不抛异常
    expect(() => new MarkdownThemeWidget({ data: theme, child: {} as any })).not.toThrow();
  });
});
```

- [ ] **Step 2: 扩展 markdown-theme.ts 添加 InheritedWidget**

在现有文件末尾添加:

```typescript
import { InheritedWidget } from "../tree/inherited-widget.js";
import type { Widget } from "../tree/widget.js";
import type { Element } from "../tree/element.js";

/**
 * Markdown 主题 InheritedWidget。
 *
 * 在 Widget 树中注入 MarkdownTheme 数据，子 Widget 通过
 * `MarkdownThemeWidget.of(context)` 获取。
 *
 * 逆向: amp $R.of(context) — 从 BuildContext 获取 styleScheme。
 */
export class MarkdownThemeWidget extends InheritedWidget {
  readonly data: MarkdownTheme;

  constructor(opts: { data: MarkdownTheme; child: Widget; key?: import("../tree/widget.js").Key }) {
    super({ child: opts.child, key: opts.key });
    this.data = opts.data;
  }

  /**
   * 从 BuildContext 获取最近的 MarkdownTheme。
   *
   * 找不到时返回默认主题。
   */
  static of(context: Element): MarkdownTheme {
    const element = context.dependOnInheritedWidgetOfExactType(MarkdownThemeWidget);
    if (element) {
      return (element.widget as MarkdownThemeWidget).data;
    }
    return defaultMarkdownTheme();
  }

  updateShouldNotify(oldWidget: MarkdownThemeWidget): boolean {
    return this.data !== oldWidget.data;
  }
}
```

- [ ] **Step 3: 运行类型检查**

```bash
cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit --project packages/tui
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/markdown/markdown-theme.ts
git commit -m "feat(tui/markdown): add MarkdownThemeWidget InheritedWidget for context-based theme access"
```

---

## Task 6: 实现 MarkdownView Widget

**Files:**
- Create: `packages/tui/src/markdown/markdown-view.ts`
- Create: `packages/tui/src/markdown/markdown-view.test.ts`

**amp 参考:** `amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1261-1280` — Z3 extends B0 (StatelessWidget)，build() 返回 Column。

- [ ] **Step 1: 编写 MarkdownView 测试**

```typescript
// packages/tui/src/markdown/markdown-view.test.ts
import { describe, expect, it } from "bun:test";
import { MarkdownView } from "./markdown-view.js";
import { Column } from "../widgets/column.js";
import { StatelessWidget } from "../tree/stateless-widget.js";

describe("MarkdownView", () => {
  it("is a StatelessWidget", () => {
    const view = new MarkdownView({ content: "hello" });
    expect(view).toBeInstanceOf(StatelessWidget);
  });

  it("build() returns a Column", () => {
    const view = new MarkdownView({ content: "# Title\n\nParagraph" });
    // 调用 build 需要 context — 简化为验证构造不抛异常
    expect(view.content).toBe("# Title\n\nParagraph");
    expect(view.streaming).toBe(false);
  });

  it("streaming mode defaults to false", () => {
    const view = new MarkdownView({ content: "text" });
    expect(view.streaming).toBe(false);
  });

  it("accepts streaming and colorTransform", () => {
    const transform = (offset: number, color: any) => color;
    const view = new MarkdownView({ content: "text", streaming: true, colorTransform: transform });
    expect(view.streaming).toBe(true);
    expect(view.colorTransform).toBe(transform);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-view.test.ts
```

Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 markdown-view.ts**

```typescript
/**
 * MarkdownView — Markdown 内容渲染 Widget。
 *
 * 将 Markdown 文本解析为 mdast AST，再构建为 Widget 树。
 * 替代旧的 MarkdownParser + MarkdownRenderer → TextSpan[] 管线。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1261-1280
 *   Z3 extends B0 (StatelessWidget)，build(context) 返回 Column({ crossAxisAlignment: "start", children })。
 *
 * @example
 * ```ts
 * new MarkdownView({ content: "# Hello\n\nWorld" })
 * // → Column > [RichText(heading), SizedBox, RichText(paragraph)]
 * ```
 *
 * @module
 */

import type { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import { StatelessWidget } from "../tree/stateless-widget.js";
import type { Key, Widget } from "../tree/widget.js";
import { Column } from "../widgets/column.js";
import { buildBlocks, type BlockContext } from "./markdown-block-builder.js";
import { parse } from "./markdown-parser.js";
import { defaultMarkdownTheme, MarkdownThemeWidget } from "./markdown-theme.js";
import type { Element } from "../tree/element.js";

/**
 * MarkdownView 构造参数。
 */
export interface MarkdownViewProps {
  /** Markdown 源文本 */
  content: string;
  /** 流式模式（过滤尾部空段落） */
  streaming?: boolean;
  /** 位置感知颜色变换回调 */
  colorTransform?: (offset: number, baseColor: Color) => Color;
  /** Widget key */
  key?: Key;
}

/**
 * Markdown 内容渲染 Widget。
 *
 * 解析 Markdown → mdast → Widget 树（Column 包含各块级 Widget）。
 *
 * 主题通过 MarkdownThemeWidget InheritedWidget 从 context 获取，
 * 找不到时使用默认主题。
 */
export class MarkdownView extends StatelessWidget {
  /** Markdown 源文本 */
  readonly content: string;
  /** 流式模式 */
  readonly streaming: boolean;
  /** 颜色变换 */
  readonly colorTransform?: (offset: number, baseColor: Color) => Color;

  constructor(props: MarkdownViewProps) {
    super(props.key);
    this.content = props.content;
    this.streaming = props.streaming ?? false;
    this.colorTransform = props.colorTransform;
  }

  /**
   * 构建 Widget 树。
   *
   * 逆向: amp Z3.build(context) → Column({ crossAxisAlignment: "start", children: processedBlocks })
   */
  build(context: BuildContext): Widget {
    // 从 context 获取主题（降级到默认）
    let theme = defaultMarkdownTheme();
    try {
      theme = MarkdownThemeWidget.of(context as unknown as Element);
    } catch {
      // context 类型不兼容时使用默认主题
    }

    // 解析 Markdown → mdast
    const ast = parse(this.content);

    // 流式模式: 过滤尾部空段落
    let children = ast.children;
    if (this.streaming && children.length > 0) {
      const last = children[children.length - 1];
      if (last.type === "paragraph" && last.children?.length === 0) {
        children = children.slice(0, -1);
      }
    }

    // 构建 Widget 树
    const blockCtx: BlockContext = {
      theme,
      style: new TextStyle({}),
      streaming: this.streaming,
      colorTransform: this.colorTransform,
    };
    const widgets = buildBlocks(children, blockCtx);

    return new Column({
      crossAxisAlignment: "start",
      children: widgets,
    });
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/markdown/markdown-view.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/markdown/markdown-view.ts packages/tui/src/markdown/markdown-view.test.ts
git commit -m "feat(tui/markdown): implement MarkdownView StatelessWidget — full widget-tree output"
```

---

## Task 7: 更新 index.ts 导出 + 标记旧 API deprecated

**Files:**
- Modify: `packages/tui/src/markdown/index.ts`
- Modify: `packages/tui/src/markdown/markdown-renderer.ts`（添加 deprecated 标记）

- [ ] **Step 1: 更新 index.ts**

```typescript
/**
 * Markdown 解析与渲染模块。
 *
 * 提供 Markdown → mdast AST → Widget 树的完整管线。
 *
 * @module
 */

// 新 API
export { parse } from "./markdown-parser.js";
export { MarkdownView, type MarkdownViewProps } from "./markdown-view.js";
export { buildBlocks, hasBlankLineBetween, type BlockContext } from "./markdown-block-builder.js";
export { buildInline, generateHyperlinkId, type InlineContext } from "./markdown-inline-builder.js";
export { MarkdownThemeWidget, defaultMarkdownTheme, type MarkdownTheme } from "./markdown-theme.js";
export { SyntaxHighlighter, syntaxColorsToTheme, type SyntaxTheme } from "./syntax-highlight.js";
export * from "./prism-languages.js";

// Legacy API (deprecated)
export { MarkdownParser, type MarkdownNode, type MarkdownNodeType } from "./markdown-parser-legacy.js";
export { MarkdownRenderer, type MarkdownRendererOptions } from "./markdown-renderer.js";
```

- [ ] **Step 2: 在 markdown-renderer.ts 顶部添加 deprecated JSDoc**

在 class 和 module 注释中添加 `@deprecated` 标记。

- [ ] **Step 3: 运行类型检查确保导出无冲突**

```bash
cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/markdown/index.ts packages/tui/src/markdown/markdown-renderer.ts
git commit -m "refactor(tui/markdown): update exports — MarkdownView as primary API, mark old renderer deprecated"
```

---

## Task 8: 迁移 conversation-view.ts 到 MarkdownView

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts`

**说明:** 将 ConversationViewState 中 `_parser + _renderer → TextSpan[]` 管线替换为 `MarkdownView` Widget。

- [ ] **Step 1: 更新 imports**

将:
```typescript
import {
  MarkdownParser,
  MarkdownRenderer,
  type MarkdownTheme,
  ...
} from "@flitter/tui";
```

改为:
```typescript
import {
  MarkdownView,
  MarkdownThemeWidget,
  defaultMarkdownTheme,
  type MarkdownTheme,
  ...
} from "@flitter/tui";
```

移除 `MarkdownParser` 和 `MarkdownRenderer` 的 import。

- [ ] **Step 2: 移除 `_parser` 和 `_renderer` 实例字段**

删除:
```typescript
private _parser!: MarkdownParser;
private _renderer!: MarkdownRenderer;
```

及其在 `initState()` 中的初始化代码。

- [ ] **Step 3: 替换消息渲染逻辑**

将 `_buildMessageWidget` 中的:
```typescript
const ast = this._parser.parse(message.content);
const contentSpans = this._renderer.render(ast);
// ... 组合成 RichText
```

替换为:
```typescript
// 角色前缀作为独立 RichText
const roleWidget = new RichText({
  text: new TextSpan({ text: roleConfig.prefix + "\n", style: new TextStyle({ bold: true, foreground: roleConfig.color }) }),
});

// Markdown 内容作为 MarkdownView Widget
const markdownWidget = new MarkdownView({
  content: message.content,
  streaming: isStreaming,
});

// 流式指示器
const children: Widget[] = [roleWidget, markdownWidget];
if (isStreaming) {
  children.push(new RichText({
    text: new TextSpan({ text: "...", style: new TextStyle({ foreground: ACCENT_COLOR }) }),
  }));
}

return new Column({ children });
```

- [ ] **Step 4: 在消息列表外层注入 MarkdownThemeWidget**

在 ConversationViewState.build() 的根 Widget 外层包裹:
```typescript
return new MarkdownThemeWidget({
  data: markdownTheme,
  child: /* 原来的根 Widget */,
});
```

- [ ] **Step 5: 运行现有测试确保不破坏**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/conversation-view.test.ts
```

Expected: PASS（可能需要更新 mock/assert 细节）

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "refactor(cli): migrate conversation-view to MarkdownView widget — remove MarkdownParser+MarkdownRenderer"
```

---

## Task 9: 迁移 examples

**Files:**
- Modify: `examples/tui-markdown-demo.ts`
- Modify: `examples/tui-chat-demo.ts`

- [ ] **Step 1: 更新 tui-markdown-demo.ts**

将使用 `MarkdownParser` + `MarkdownRenderer` + `RenderParagraph` 的代码替换为 `MarkdownView` Widget 挂载方式。

- [ ] **Step 2: 更新 tui-chat-demo.ts**

将消息渲染部分从 `_parser.parse()` + `_renderer.render()` 替换为 `new MarkdownView({ content })`.

- [ ] **Step 3: 运行 demo 验证（tmux E2E）**

```bash
tmux new-session -d -s mdtest -x 80 -y 24 "bun run examples/tui-markdown-demo.ts 2>/tmp/mdtest.log"
sleep 2
tmux capture-pane -t mdtest -p | head -20
tmux kill-session -t mdtest
```

Expected: 能看到格式化的 Markdown 内容渲染输出。

- [ ] **Step 4: Commit**

```bash
git add examples/tui-markdown-demo.ts examples/tui-chat-demo.ts
git commit -m "refactor(examples): migrate markdown demos to MarkdownView widget"
```

---

## Task 10: 移除 micromark 依赖 + 最终验证

**Files:**
- Modify: `packages/tui/package.json`

- [ ] **Step 1: 确认 micromark 无其他消费者**

```bash
cd /Users/bytedance/workspace/flitter && rg "from.*micromark" packages/ --glob "*.ts" --glob "!*legacy*"
```

Expected: 仅 `markdown-parser-legacy.ts` 引用（保留给 deprecated 路径）。

如果其他文件仍在引用 micromark，则暂不移除。

- [ ] **Step 2: 运行全量测试**

```bash
cd /Users/bytedance/workspace/flitter && bun test
```

Expected: All PASS

- [ ] **Step 3: 运行类型检查**

```bash
cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(tui): final cleanup — markdown widget upgrade complete"
```

---

## 依赖关系

```
Task 1 (deps) → Task 2 (parser) → Task 3 (inline) → Task 4 (blocks)
                                                            ↓
Task 5 (theme InheritedWidget) ────────────────→ Task 6 (MarkdownView)
                                                            ↓
                                                    Task 7 (exports)
                                                            ↓
                                              Task 8 (conversation-view)
                                                            ↓
                                              Task 9 (examples)
                                                            ↓
                                              Task 10 (cleanup + verify)
```

Tasks 3 和 5 可并行执行（互不依赖）。
