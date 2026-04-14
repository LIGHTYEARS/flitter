/**
 * MarkdownParser 测试。
 *
 * 验证 micromark + GFM 扩展驱动的 Markdown → AST 解析器。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import { MarkdownParser } from "./markdown-parser.js";

describe("MarkdownParser", () => {
  const parser = new MarkdownParser();

  // ── 基础文本 ───────────────────────────────────────

  it("解析纯文本为 paragraph 节点", () => {
    const nodes = parser.parse("plain text");
    expect(nodes.length).toBeGreaterThanOrEqual(1);
    const para = nodes[0];
    expect(para.type).toBe("paragraph");
    expect(para.children).toBeDefined();
    const text = para.children![0];
    expect(text.type).toBe("text");
    expect(text.value).toBe("plain text");
  });

  it("空输入返回空数组", () => {
    const nodes = parser.parse("");
    expect(nodes).toEqual([]);
  });

  // ── 内联格式 ───────────────────────────────────────

  it("解析 **bold** 为 strong 节点", () => {
    const nodes = parser.parse("**bold**");
    const para = nodes[0];
    expect(para.type).toBe("paragraph");
    const strong = para.children![0];
    expect(strong.type).toBe("strong");
    expect(strong.children![0].type).toBe("text");
    expect(strong.children![0].value).toBe("bold");
  });

  it("解析 *italic* 为 emphasis 节点", () => {
    const nodes = parser.parse("*italic*");
    const para = nodes[0];
    const em = para.children![0];
    expect(em.type).toBe("emphasis");
    expect(em.children![0].value).toBe("italic");
  });

  it("解析 ***bold+italic*** 为嵌套 strong/emphasis", () => {
    const nodes = parser.parse("***both***");
    const para = nodes[0];
    // 可能是 strong > emphasis 或 emphasis > strong
    const outer = para.children![0];
    expect(["strong", "emphasis"]).toContain(outer.type);
    const inner = outer.children![0];
    expect(["strong", "emphasis"]).toContain(inner.type);
    expect(inner.children![0].value).toBe("both");
  });

  it("解析 inline code (backtick)", () => {
    const nodes = parser.parse("use `code` here");
    const para = nodes[0];
    expect(para.children!.length).toBeGreaterThanOrEqual(3);
    const codeSpan = para.children!.find((c) => c.type === "codeSpan");
    expect(codeSpan).toBeDefined();
    expect(codeSpan!.value).toBe("code");
  });

  // ── 代码块 ─────────────────────────────────────────

  it("解析带语言标记的代码块", () => {
    const md = "```js\nconst x = 1;\n```";
    const nodes = parser.parse(md);
    const codeBlock = nodes.find((n) => n.type === "code");
    expect(codeBlock).toBeDefined();
    expect(codeBlock!.lang).toBe("js");
    expect(codeBlock!.value).toContain("const x = 1;");
  });

  it("解析无语言标记的代码块", () => {
    const md = "```\nhello\n```";
    const nodes = parser.parse(md);
    const codeBlock = nodes.find((n) => n.type === "code");
    expect(codeBlock).toBeDefined();
    expect(codeBlock!.lang).toBeUndefined();
    expect(codeBlock!.value).toContain("hello");
  });

  // ── 标题 ───────────────────────────────────────────

  it("解析 heading 级别 1-3", () => {
    const nodes1 = parser.parse("# H1");
    expect(nodes1[0].type).toBe("heading");
    expect(nodes1[0].level).toBe(1);

    const nodes2 = parser.parse("## H2");
    expect(nodes2[0].type).toBe("heading");
    expect(nodes2[0].level).toBe(2);

    const nodes3 = parser.parse("### H3");
    expect(nodes3[0].type).toBe("heading");
    expect(nodes3[0].level).toBe(3);
  });

  // ── 列表 ───────────────────────────────────────────

  it("解析无序列表", () => {
    const md = "- item1\n- item2\n- item3";
    const nodes = parser.parse(md);
    const list = nodes.find((n) => n.type === "list");
    expect(list).toBeDefined();
    expect(list!.ordered).toBe(false);
    expect(list!.children!.length).toBe(3);
    expect(list!.children![0].type).toBe("listItem");
  });

  it("解析有序列表", () => {
    const md = "1. first\n2. second";
    const nodes = parser.parse(md);
    const list = nodes.find((n) => n.type === "list");
    expect(list).toBeDefined();
    expect(list!.ordered).toBe(true);
    expect(list!.children!.length).toBe(2);
  });

  // ── GFM 扩展 ──────────────────────────────────────

  it("解析 GFM 表格", () => {
    const md = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    const nodes = parser.parse(md);
    const table = nodes.find((n) => n.type === "table");
    expect(table).toBeDefined();
    expect(table!.children).toBeDefined();
    // 至少两行：表头 + 数据行
    expect(table!.children!.length).toBeGreaterThanOrEqual(2);
    expect(table!.children![0].type).toBe("tableRow");
  });

  it("解析 GFM 删除线 ~~text~~", () => {
    const md = "~~strike~~";
    const nodes = parser.parse(md);
    const para = nodes[0];
    const del = para.children![0];
    expect(del.type).toBe("delete");
    expect(del.children![0].value).toBe("strike");
  });

  it("解析 GFM 任务列表", () => {
    const md = "- [x] done\n- [ ] todo";
    const nodes = parser.parse(md);
    const list = nodes.find((n) => n.type === "list");
    expect(list).toBeDefined();
    const items = list!.children!;
    expect(items[0].checked).toBe(true);
    expect(items[1].checked).toBe(false);
  });

  // ── 链接 ───────────────────────────────────────────

  it("解析链接 [text](url)", () => {
    const md = "[click](https://example.com)";
    const nodes = parser.parse(md);
    const para = nodes[0];
    const link = para.children!.find((c) => c.type === "link");
    expect(link).toBeDefined();
    expect(link!.url).toBe("https://example.com");
  });

  // ── blockquote ────────────────────────────────────

  it("解析 blockquote", () => {
    const md = "> quoted text";
    const nodes = parser.parse(md);
    const bq = nodes.find((n) => n.type === "blockquote");
    expect(bq).toBeDefined();
    expect(bq!.children).toBeDefined();
  });

  // ── thematic break ────────────────────────────────

  it("解析 thematic break (---)", () => {
    const md = "---";
    const nodes = parser.parse(md);
    const tb = nodes.find((n) => n.type === "thematicBreak");
    expect(tb).toBeDefined();
  });

  // ── 增量追加 ──────────────────────────────────────

  it("appendText 追加文本并重新解析", () => {
    const p = new MarkdownParser();
    const nodes1 = p.parse("Hello ");
    expect(nodes1.length).toBeGreaterThanOrEqual(1);

    const nodes2 = p.appendText("**world**");
    // 追加后应包含 strong 节点
    const allText = JSON.stringify(nodes2);
    expect(allText).toContain("strong");
    expect(allText).toContain("world");
  });

  // ── 混合内容 ──────────────────────────────────────

  it("解析混合内容：段落 + 代码块 + 列表", () => {
    const md = "Hello\n\n```ts\ncode\n```\n\n- item";
    const nodes = parser.parse(md);
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    const types = nodes.map((n) => n.type);
    expect(types).toContain("paragraph");
    expect(types).toContain("code");
    expect(types).toContain("list");
  });

  it("HTML 节点类型为 html（用于安全过滤）", () => {
    const md = "<div>hello</div>";
    const nodes = parser.parse(md);
    const html = nodes.find((n) => n.type === "html");
    expect(html).toBeDefined();
  });
});
