/**
 * MarkdownRenderer + SyntaxHighlighter 测试。
 *
 * 验证 AST → TextSpan Widget 树转换和语法高亮。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import type { TextSpan } from "../widgets/text-span.js";
import type { MarkdownNode } from "./markdown-parser.js";
import { MarkdownRenderer } from "./markdown-renderer.js";
import { SyntaxHighlighter } from "./syntax-highlight.js";

describe("SyntaxHighlighter", () => {
  const theme = SyntaxHighlighter.defaultTheme();
  const hl = new SyntaxHighlighter(theme);

  it("高亮关键字", () => {
    const spans = hl.highlight("const x = 1", "js");
    expect(spans.length).toBeGreaterThanOrEqual(1);
    const constSpan = spans.find((s) => s.text === "const");
    expect(constSpan).toBeDefined();
    expect(constSpan!.style!.foreground.kind).toBe("named");
  });

  it("高亮字符串", () => {
    const spans = hl.highlight('"hello"', "js");
    const strSpan = spans.find((s) => s.text?.includes('"hello"'));
    expect(strSpan).toBeDefined();
    expect(strSpan!.style!.foreground.kind).toBe("named");
  });

  it("高亮数字", () => {
    const spans = hl.highlight("42", "js");
    const numSpan = spans.find((s) => s.text === "42");
    expect(numSpan).toBeDefined();
  });

  it("高亮注释", () => {
    const spans = hl.highlight("// comment", "js");
    const commentSpan = spans.find((s) => s.text?.includes("// comment"));
    expect(commentSpan).toBeDefined();
    expect(commentSpan!.style!.dim).toBe(true);
  });

  it("高亮类型名（大写开头）", () => {
    const spans = hl.highlight("String", "ts");
    const typeSpan = spans.find((s) => s.text === "String");
    expect(typeSpan).toBeDefined();
    // type 使用 magenta
    expect(typeSpan!.style!.foreground.kind).toBe("named");
  });

  it("空代码返回空数组", () => {
    const spans = hl.highlight("", "js");
    expect(spans).toEqual([]);
  });

  it("默认主题创建正确", () => {
    const t = SyntaxHighlighter.defaultTheme();
    expect(t.keyword.foreground.kind).toBe("named");
    expect(t.string.foreground.kind).toBe("named");
    expect(t.comment.dim).toBe(true);
  });
});

describe("MarkdownRenderer", () => {
  const renderer = new MarkdownRenderer();

  // ── 辅助函数 ───────────────────────────────────────

  /** 递归提取所有纯文本 */
  function collectText(spans: TextSpan[]): string {
    let result = "";
    for (const span of spans) {
      result += span.toPlainText();
    }
    return result;
  }

  /** 递归查找带指定样式属性的 span */
  function findSpanWith(
    spans: TextSpan[],
    predicate: (s: TextSpan) => boolean,
  ): TextSpan | undefined {
    for (const span of spans) {
      if (predicate(span)) return span;
      if (span.children) {
        const found = findSpanWith(span.children, predicate);
        if (found) return found;
      }
    }
    return undefined;
  }

  // ── 纯文本 ────────────────────────────────────────

  it("渲染纯文本段落", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "text", value: "hello" }],
      },
    ];
    const spans = renderer.render(nodes);
    expect(collectText(spans)).toContain("hello");
  });

  it("空 AST 返回空数组", () => {
    const spans = renderer.render([]);
    expect(spans).toEqual([]);
  });

  // ── 粗体/斜体/删除线 ────────────────────────────────

  it("bold → TextSpan.style.bold=true", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "strong", children: [{ type: "text", value: "bold" }] }],
      },
    ];
    const spans = renderer.render(nodes);
    const boldSpan = findSpanWith(spans, (s) => s.style?.bold === true);
    expect(boldSpan).toBeDefined();
    expect(collectText(spans)).toContain("bold");
  });

  it("italic → TextSpan.style.italic=true", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "emphasis", children: [{ type: "text", value: "italic" }] }],
      },
    ];
    const spans = renderer.render(nodes);
    const italicSpan = findSpanWith(spans, (s) => s.style?.italic === true);
    expect(italicSpan).toBeDefined();
  });

  it("strikethrough → TextSpan.style.strikethrough=true", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "delete", children: [{ type: "text", value: "deleted" }] }],
      },
    ];
    const spans = renderer.render(nodes);
    const strikeSpan = findSpanWith(spans, (s) => s.style?.strikethrough === true);
    expect(strikeSpan).toBeDefined();
  });

  // ── 代码 ──────────────────────────────────────────

  it("inline code → 带背景色的 TextSpan", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "codeSpan", value: "inline" }],
      },
    ];
    const spans = renderer.render(nodes);
    const codeSpan = findSpanWith(
      spans,
      (s) => s.text === "inline" && s.style?.background?.kind !== "default",
    );
    expect(codeSpan).toBeDefined();
  });

  it("code block 带语法高亮", () => {
    const nodes: MarkdownNode[] = [{ type: "code", lang: "js", value: "const x = 1" }];
    const spans = renderer.render(nodes);
    expect(spans.length).toBeGreaterThanOrEqual(1);
    // 包含背景色
    const bgSpan = findSpanWith(spans, (s) => s.style?.background?.kind === "index");
    expect(bgSpan).toBeDefined();
    expect(collectText(spans)).toContain("const");
  });

  it("code block 无语言标记", () => {
    const nodes: MarkdownNode[] = [{ type: "code", value: "plain code" }];
    const spans = renderer.render(nodes);
    expect(collectText(spans)).toContain("plain code");
  });

  // ── heading ───────────────────────────────────────

  it("heading level 1 → bold + prefix #", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 1,
        children: [{ type: "text", value: "Title" }],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("# ");
    expect(text).toContain("Title");
    const boldSpan = findSpanWith(spans, (s) => s.style?.bold === true);
    expect(boldSpan).toBeDefined();
  });

  it("heading level 3 → ### prefix", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 3,
        children: [{ type: "text", value: "Sub" }],
      },
    ];
    const spans = renderer.render(nodes);
    expect(collectText(spans)).toContain("### ");
  });

  // ── 列表 ──────────────────────────────────────────

  it("无序列表 → 带 '  - ' 前缀", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "list",
        ordered: false,
        children: [
          {
            type: "listItem",
            checked: null,
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "item1" }],
              },
            ],
          },
          {
            type: "listItem",
            checked: null,
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "item2" }],
              },
            ],
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("- item1");
    expect(text).toContain("- item2");
  });

  it("有序列表 → 带数字前缀", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "list",
        ordered: true,
        children: [
          {
            type: "listItem",
            checked: null,
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "first" }],
              },
            ],
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("1. first");
  });

  it("任务列表 → [x] / [ ] 前缀", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "list",
        ordered: false,
        children: [
          {
            type: "listItem",
            checked: true,
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "done" }],
              },
            ],
          },
          {
            type: "listItem",
            checked: false,
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", value: "todo" }],
              },
            ],
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("[x] done");
    expect(text).toContain("[ ] todo");
  });

  // ── 表格 ──────────────────────────────────────────

  it("表格 → 带边框的文本格式化", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "table",
        children: [
          {
            type: "tableRow",
            children: [
              {
                type: "tableCell",
                children: [{ type: "text", value: "A" }],
              },
              {
                type: "tableCell",
                children: [{ type: "text", value: "B" }],
              },
            ],
          },
          {
            type: "tableRow",
            children: [
              {
                type: "tableCell",
                children: [{ type: "text", value: "1" }],
              },
              {
                type: "tableCell",
                children: [{ type: "text", value: "2" }],
              },
            ],
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("│");
    expect(text).toContain("A");
    expect(text).toContain("B");
  });

  // ── blockquote ────────────────────────────────────

  it("blockquote → '│ ' 前缀", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "quoted" }],
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("│ ");
    expect(text).toContain("quoted");
  });

  // ── 链接 ──────────────────────────────────────────

  it("link → underline + url", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [
          {
            type: "link",
            url: "https://example.com",
            children: [{ type: "text", value: "click" }],
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const linkSpan = findSpanWith(spans, (s) => s.style?.underline === true);
    expect(linkSpan).toBeDefined();
    const text = collectText(spans);
    expect(text).toContain("click");
    expect(text).toContain("https://example.com");
  });

  // ── thematic break ────────────────────────────────

  it("thematic break → 水平线", () => {
    const nodes: MarkdownNode[] = [{ type: "thematicBreak" }];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("───");
  });

  // ── HTML 安全 ─────────────────────────────────────

  it("html 节点被忽略（安全措施）", () => {
    const nodes: MarkdownNode[] = [{ type: "html", value: "<script>alert(1)</script>" }];
    const spans = renderer.render(nodes);
    expect(spans).toEqual([]);
  });

  // ── 流式渲染 ──────────────────────────────────────

  it("renderStreaming 跳过尾部空段落", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "text", value: "content" }],
      },
      { type: "paragraph", children: [] },
    ];
    const spans = renderer.renderStreaming(nodes);
    const text = collectText(spans);
    expect(text).toContain("content");
    // 最后不应有额外空内容
  });

  it("renderStreaming 保留非空尾部段落", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "text", value: "first" }],
      },
      {
        type: "paragraph",
        children: [{ type: "text", value: "second" }],
      },
    ];
    const spans = renderer.renderStreaming(nodes);
    const text = collectText(spans);
    expect(text).toContain("first");
    expect(text).toContain("second");
  });
});
