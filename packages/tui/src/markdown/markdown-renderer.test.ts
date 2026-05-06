/**
 * MarkdownRenderer + SyntaxHighlighter 测试。
 *
 * 验证 AST → TextSpan Widget 树转换和语法高亮。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import { Color } from "../screen/color.js";
import type { TextSpan } from "../widgets/text-span.js";
import type { MarkdownNode } from "./markdown-parser.js";
import { MarkdownParser } from "./markdown-parser.js";
import { MarkdownRenderer } from "./markdown-renderer.js";
import { defaultMarkdownTheme } from "./markdown-theme.js";
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
    expect(codeSpan!.style!.bold).toBe(true);
    expect(codeSpan!.style!.foreground.equals(Color.yellow())).toBe(true);
    expect(codeSpan!.style!.background!.equals(Color.indexed(236))).toBe(true);
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

  it("h1 渲染为蓝色粗体", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 1,
        children: [{ type: "text", value: "Title" }],
      },
    ];
    const spans = renderer.render(nodes);
    const headingSpan = spans[0];
    expect(headingSpan.style!.bold).toBe(true);
    expect(headingSpan.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("h2 渲染为青色粗体", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 2,
        children: [{ type: "text", value: "Title" }],
      },
    ];
    const spans = renderer.render(nodes);
    const headingSpan = spans[0];
    expect(headingSpan.style!.bold).toBe(true);
    expect(headingSpan.style!.foreground.equals(Color.cyan())).toBe(true);
  });

  it("h3 渲染为蓝色非粗体", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 3,
        children: [{ type: "text", value: "Title" }],
      },
    ];
    const spans = renderer.render(nodes);
    const headingSpan = spans[0];
    expect(headingSpan.style!.bold).toBe(false);
    expect(headingSpan.style!.foreground.equals(Color.blue())).toBe(true);
  });

  it("h4 渲染为青色非粗体", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 4,
        children: [{ type: "text", value: "Title" }],
      },
    ];
    const spans = renderer.render(nodes);
    const headingSpan = spans[0];
    expect(headingSpan.style!.bold).toBe(false);
    expect(headingSpan.style!.foreground.equals(Color.cyan())).toBe(true);
  });

  it("h5 渲染为默认前景色非粗体", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 5,
        children: [{ type: "text", value: "Title" }],
      },
    ];
    const spans = renderer.render(nodes);
    const headingSpan = spans[0];
    expect(headingSpan.style!.bold).toBe(false);
    expect(headingSpan.style!.foreground.equals(Color.default())).toBe(true);
  });

  // ── 列表 ──────────────────────────────────────────

  it("无序列表 → 带 '• ' 前缀", () => {
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
    expect(text).toContain("• item1");
    expect(text).toContain("• item2");
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

  it("任务列表 → [✓] / [ ] 前缀", () => {
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
    expect(text).toContain("[✓] done");
    expect(text).toContain("[ ] todo");
  });

  it("嵌套列表添加缩进", () => {
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
                children: [{ type: "text", value: "item 1" }],
              },
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
                        children: [{ type: "text", value: "nested item" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("• item 1");
    expect(text).toContain("  • nested item");
  });

  it("task list checked 使用 ✓", () => {
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
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("[✓]");
  });

  // ── 表格 ──────────────────────────────────────────

  /** 递归收集所有叶子 TextSpan（有 text 属性的） */
  function flattenSpans(spans: TextSpan[]): TextSpan[] {
    const result: TextSpan[] = [];
    for (const span of spans) {
      if (span.text !== undefined) {
        result.push(span);
      }
      if (span.children) {
        result.push(...flattenSpans(span.children));
      }
    }
    return result;
  }

  describe("table rendering", () => {
    it("表格使用圆角 Unicode box-drawing 边框", () => {
      const nodes: MarkdownNode[] = [
        {
          type: "table",
          children: [
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "A" }] },
                { type: "tableCell", children: [{ type: "text", value: "B" }] },
              ],
            },
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "1" }] },
                { type: "tableCell", children: [{ type: "text", value: "2" }] },
              ],
            },
          ],
        },
      ];
      const spans = renderer.render(nodes);
      const text = collectText(spans);
      expect(text).toContain("╭");
      expect(text).toContain("╮");
      expect(text).toContain("╰");
      expect(text).toContain("╯");
      expect(text).toContain("│");
      expect(text).toContain("─");
    });

    it("表格列等宽对齐", () => {
      const nodes: MarkdownNode[] = [
        {
          type: "table",
          children: [
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "Name" }] },
                { type: "tableCell", children: [{ type: "text", value: "Age" }] },
              ],
            },
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "Alice" }] },
                { type: "tableCell", children: [{ type: "text", value: "30" }] },
              ],
            },
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "Bob" }] },
                { type: "tableCell", children: [{ type: "text", value: "5" }] },
              ],
            },
          ],
        },
      ];
      const spans = renderer.render(nodes);
      const text = collectText(spans);
      const lines = text.split("\n").filter((l) => l.includes("│"));
      // All data/header rows should have same width
      const widths = lines.map((l) => l.length);
      expect(widths.every((w) => w === widths[0])).toBe(true);
    });

    it("表头渲染为粗体", () => {
      const nodes: MarkdownNode[] = [
        {
          type: "table",
          children: [
            {
              type: "tableRow",
              children: [{ type: "tableCell", children: [{ type: "text", value: "Name" }] }],
            },
            {
              type: "tableRow",
              children: [{ type: "tableCell", children: [{ type: "text", value: "Alice" }] }],
            },
          ],
        },
      ];
      const spans = renderer.render(nodes);
      // Find span with bold style wrapping the header content
      const boldSpan = findSpanWith(spans, (s) => s.style?.bold === true);
      expect(boldSpan).toBeDefined();
    });

    it("表格支持列对齐", () => {
      const nodes: MarkdownNode[] = [
        {
          type: "table",
          align: ["left", "center", "right"],
          children: [
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "L" }] },
                { type: "tableCell", children: [{ type: "text", value: "C" }] },
                { type: "tableCell", children: [{ type: "text", value: "R" }] },
              ],
            },
            {
              type: "tableRow",
              children: [
                { type: "tableCell", children: [{ type: "text", value: "x" }] },
                { type: "tableCell", children: [{ type: "text", value: "y" }] },
                { type: "tableCell", children: [{ type: "text", value: "z" }] },
              ],
            },
          ],
        },
      ];
      const spans = renderer.render(nodes);
      const text = collectText(spans);
      // Table should render without errors and contain the data
      expect(text).toContain("L");
      expect(text).toContain("C");
      expect(text).toContain("R");
      // Should have proper box-drawing
      expect(text).toContain("╭");
      expect(text).toContain("┬");
      expect(text).toContain("╯");
    });

    it("表格列最小宽度为 3", () => {
      const nodes: MarkdownNode[] = [
        {
          type: "table",
          children: [
            {
              type: "tableRow",
              children: [{ type: "tableCell", children: [{ type: "text", value: "X" }] }],
            },
            {
              type: "tableRow",
              children: [{ type: "tableCell", children: [{ type: "text", value: "Y" }] }],
            },
          ],
        },
      ];
      const spans = renderer.render(nodes);
      const text = collectText(spans);
      // Min width 3 means top border should have at least "─────" (3+2=5 dashes)
      expect(text).toContain("─────");
    });
  });

  it("blockquote → 2-space pad + colored │ border + space + content (not dim)", () => {
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
    // Should have "  │ " prefix pattern
    expect(text).toContain("  │");
    expect(text).toContain("quoted");

    // Border character should not be dim
    const allLeaves = flattenSpans(spans);
    const borderSpan = allLeaves.find((s) => s.text === "│");
    expect(borderSpan).toBeDefined();
    expect(borderSpan!.style?.dim).not.toBe(true);

    // Content should not be dim
    const contentSpan = allLeaves.find((s) => s.text?.includes("quoted"));
    expect(contentSpan).toBeDefined();
    expect(contentSpan!.style?.dim).not.toBe(true);
  });

  it("块引用内段落之间使用单换行", () => {
    const parser = new MarkdownParser();
    const md = "> paragraph one\n>\n> paragraph two";
    const ast = parser.parse(md);
    const spans = renderer.render(ast);
    const text = collectText(spans);
    // Inside blockquote, should use single \n not \n\n
    expect(text).toContain("paragraph one");
    expect(text).toContain("paragraph two");
    expect(text).not.toMatch(/paragraph one\n\nparagraph two/);
  });
  // ── 链接 ──────────────────────────────────────────

  it("link → OSC 8 超链接 (underline + url property, no visible URL)", () => {
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
    // Should have underline style
    const linkSpan = findSpanWith(spans, (s) => s.style?.underline === true);
    expect(linkSpan).toBeDefined();
    // The URL should be on the span's url property (OSC 8), not in the text
    const spanWithUrl = findSpanWith(spans, (s) => s.url === "https://example.com");
    expect(spanWithUrl).toBeDefined();
    // Visible text should contain "click" but NOT the URL
    const text = collectText(spans);
    expect(text).toContain("click");
    expect(text).not.toContain("(https://example.com)");
  });

  // ── 图片 ──────────────────────────────────────────

  it("图片渲染为 [Image: alt] 样式", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [
          {
            type: "image",
            alt: "screenshot",
            url: "http://example.com/img.png",
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("[Image: screenshot]");
  });

  it("图片无 alt 时使用默认文本 'image'", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [{ type: "image", url: "http://example.com/img.png" }],
      },
    ];
    const spans = renderer.render(nodes);
    const text = collectText(spans);
    expect(text).toContain("[Image: image]");
  });

  it("图片样式为 italic + link 色 (blue + underline)", () => {
    const nodes: MarkdownNode[] = [
      {
        type: "paragraph",
        children: [
          {
            type: "image",
            alt: "pic",
            url: "http://example.com/pic.png",
          },
        ],
      },
    ];
    const spans = renderer.render(nodes);
    const imgSpan = findSpanWith(
      spans,
      (s) => s.style?.italic === true && s.style?.underline === true,
    );
    expect(imgSpan).toBeDefined();
    expect(imgSpan!.url).toBe("http://example.com/pic.png");
  });

  it("图片通过 parser 从 markdown 解析", () => {
    const parser = new MarkdownParser();
    const ast = parser.parse("![screenshot](http://example.com/img.png)");
    const spans = renderer.render(ast);
    const text = collectText(spans);
    expect(text).toContain("[Image: screenshot]");
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

  // ── MarkdownTheme ────────────────────────────────

  it("接受自定义 MarkdownTheme", () => {
    const theme = defaultMarkdownTheme();
    const customRenderer = new MarkdownRenderer({ markdownTheme: theme });
    const nodes: MarkdownNode[] = [
      {
        type: "heading",
        level: 1,
        children: [{ type: "text", value: "Hello" }],
      },
    ];
    const spans = customRenderer.render(nodes);
    expect(spans.length).toBeGreaterThan(0);
    expect(collectText(spans)).toContain("Hello");
  });

  it("markdownTheme 的 syntaxTheme 作为默认语法主题", () => {
    const theme = defaultMarkdownTheme();
    const customRenderer = new MarkdownRenderer({ markdownTheme: theme });
    const nodes: MarkdownNode[] = [{ type: "code", lang: "js", value: "const x = 1" }];
    const spans = customRenderer.render(nodes);
    expect(spans.length).toBeGreaterThan(0);
    expect(collectText(spans)).toContain("const");
  });

  it("syntaxTheme 选项覆盖 markdownTheme.syntaxTheme", () => {
    const theme = defaultMarkdownTheme();
    const overrideTheme = SyntaxHighlighter.defaultTheme();
    const customRenderer = new MarkdownRenderer({
      markdownTheme: theme,
      syntaxTheme: overrideTheme,
    });
    const nodes: MarkdownNode[] = [{ type: "code", lang: "js", value: "let y = 2" }];
    const spans = customRenderer.render(nodes);
    expect(spans.length).toBeGreaterThan(0);
    expect(collectText(spans)).toContain("let");
  });
});
