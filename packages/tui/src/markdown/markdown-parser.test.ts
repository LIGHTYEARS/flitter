/**
 * Markdown 解析器测试 — unified/remark 版本。
 *
 * 验证 mdast AST 结构和 position 信息。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import { parse } from "./markdown-parser.js";

// ══════════════════════════════════════════════════════
//  新 API: parse() 函数
// ══════════════════════════════════════════════════════

describe("parse (remark)", () => {
  it("解析纯文本为 paragraph", () => {
    const root = parse("Hello world");
    expect(root.type).toBe("root");
    expect(root.children).toHaveLength(1);
    expect(root.children[0].type).toBe("paragraph");
  });

  it("空输入返回无子节点的 root", () => {
    const root = parse("");
    expect(root.type).toBe("root");
    expect(root.children).toHaveLength(0);
  });

  it("解析 heading 并保留 position", () => {
    const root = parse("# Title");
    const heading = root.children[0];
    expect(heading.type).toBe("heading");
    expect((heading as any).depth).toBe(1);
    expect(heading.position).toBeDefined();
    expect(heading.position!.start.offset).toBe(0);
  });

  it("解析 heading level 1-6", () => {
    for (let i = 1; i <= 6; i++) {
      const root = parse(`${"#".repeat(i)} H${i}`);
      const h = root.children[0] as any;
      expect(h.type).toBe("heading");
      expect(h.depth).toBe(i);
    }
  });

  it("解析代码块保留语言和 position", () => {
    const md = "```ts\nconst x = 1;\n```";
    const root = parse(md);
    const code = root.children[0] as any;
    expect(code.type).toBe("code");
    expect(code.lang).toBe("ts");
    expect(code.value).toContain("const x = 1;");
    expect(code.position).toBeDefined();
  });

  it("解析无语言代码块", () => {
    const md = "```\nhello\n```";
    const root = parse(md);
    const code = root.children[0] as any;
    expect(code.type).toBe("code");
    expect(code.lang).toBeNull();
    expect(code.value).toContain("hello");
  });

  it("解析 GFM 表格", () => {
    const root = parse("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(root.children[0].type).toBe("table");
  });

  it("解析 GFM 删除线", () => {
    const root = parse("~~deleted~~");
    const p = root.children[0] as any;
    expect(p.children[0].type).toBe("delete");
  });

  it("解析 GFM 任务列表", () => {
    const root = parse("- [x] done\n- [ ] todo");
    const list = root.children[0] as any;
    expect(list.type).toBe("list");
    expect(list.children[0].checked).toBe(true);
    expect(list.children[1].checked).toBe(false);
  });

  it("解析有序列表保留 start", () => {
    const root = parse("3. third\n4. fourth");
    const list = root.children[0] as any;
    expect(list.type).toBe("list");
    expect(list.ordered).toBe(true);
    expect(list.start).toBe(3);
  });

  it("解析无序列表", () => {
    const root = parse("- item1\n- item2");
    const list = root.children[0] as any;
    expect(list.type).toBe("list");
    expect(list.ordered).toBe(false);
  });

  it("解析 inline 格式 (bold/italic/code/link)", () => {
    const root = parse("**bold** *italic* `code` [link](url)");
    const p = root.children[0] as any;
    const types = p.children.map((c: any) => c.type);
    expect(types).toContain("strong");
    expect(types).toContain("emphasis");
    expect(types).toContain("inlineCode");
    expect(types).toContain("link");
  });

  it("解析 blockquote", () => {
    const root = parse("> quoted text");
    const bq = root.children[0] as any;
    expect(bq.type).toBe("blockquote");
    expect(bq.children).toBeDefined();
  });

  it("解析 thematic break", () => {
    const root = parse("---");
    expect(root.children[0].type).toBe("thematicBreak");
  });

  it("保留 position 用于空行检测", () => {
    const root = parse("first\n\nsecond");
    const [p1, p2] = root.children;
    // p2 starts after a blank line
    expect(p2.position!.start.line - p1.position!.end.line).toBeGreaterThan(0);
  });

  it("解析混合内容", () => {
    const md = "Hello\n\n```ts\ncode\n```\n\n- item";
    const root = parse(md);
    expect(root.children.length).toBeGreaterThanOrEqual(3);
    const types = root.children.map((n) => n.type);
    expect(types).toContain("paragraph");
    expect(types).toContain("code");
    expect(types).toContain("list");
  });
});


