/**
 * Markdown 内联节点构建器测试。
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import { buildInline, generateHyperlinkId } from "./markdown-inline-builder.js";
import type { PhrasingContent } from "mdast";
import { TextStyle } from "../screen/text-style.js";
import { defaultMarkdownTheme } from "./markdown-theme.js";

const theme = defaultMarkdownTheme();
const baseStyle = new TextStyle({});

describe("buildInline", () => {
  it("渲染纯文本", () => {
    const nodes: PhrasingContent[] = [{ type: "text", value: "hello" }];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children).toHaveLength(1);
    expect(span.children![0].text).toBe("hello");
  });

  it("渲染 strong (粗体)", () => {
    const nodes: PhrasingContent[] = [
      { type: "strong", children: [{ type: "text", value: "bold" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].style?.bold).toBe(true);
    // children 里应包含 text
    expect(span.children![0].children![0].text).toBe("bold");
  });

  it("渲染 emphasis (斜体)", () => {
    const nodes: PhrasingContent[] = [
      { type: "emphasis", children: [{ type: "text", value: "em" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].style?.italic).toBe(true);
  });

  it("渲染 delete (删除线)", () => {
    const nodes: PhrasingContent[] = [
      { type: "delete", children: [{ type: "text", value: "del" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].style?.strikethrough).toBe(true);
  });

  it("渲染 inlineCode 使用主题样式", () => {
    const nodes: PhrasingContent[] = [{ type: "inlineCode", value: "x" }];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].text).toBe("x");
    // defaultMarkdownTheme().inlineCode 是 bold yellow
    expect(span.children![0].style?.bold).toBe(true);
  });

  it("渲染 link 带 url 和 underline", () => {
    const nodes: PhrasingContent[] = [
      { type: "link", url: "https://example.com", children: [{ type: "text", value: "click" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    const linkSpan = span.children![0];
    expect(linkSpan.style?.underline).toBe(true);
    expect(linkSpan.url).toBe("https://example.com");
    expect(linkSpan.children![0].text).toBe("click");
  });

  it("渲染 image 为 [Image: alt]", () => {
    const nodes: PhrasingContent[] = [
      { type: "image", url: "img.png", alt: "photo" },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].text).toBe("[Image: photo]");
    expect(span.children![0].style?.italic).toBe(true);
  });

  it("渲染 break 为换行", () => {
    const nodes: PhrasingContent[] = [{ type: "break" }];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children![0].text).toBe("\n");
  });

  it("嵌套格式 (strong > emphasis)", () => {
    const nodes: PhrasingContent[] = [
      {
        type: "strong",
        children: [{ type: "emphasis", children: [{ type: "text", value: "bi" }] }],
      },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    // strong span
    const strongSpan = span.children![0];
    expect(strongSpan.style?.bold).toBe(true);
    // emphasis child inside strong
    const emSpan = strongSpan.children![0];
    expect(emSpan.style?.bold).toBe(true);
    expect(emSpan.style?.italic).toBe(true);
  });

  it("multiple inline nodes", () => {
    const nodes: PhrasingContent[] = [
      { type: "text", value: "hello " },
      { type: "strong", children: [{ type: "text", value: "world" }] },
    ];
    const span = buildInline(nodes, { style: baseStyle, theme });
    expect(span.children).toHaveLength(2);
    expect(span.children![0].text).toBe("hello ");
    expect(span.children![1].style?.bold).toBe(true);
  });
});

describe("generateHyperlinkId", () => {
  it("返回确定性的 md- 前缀 ID", () => {
    const id = generateHyperlinkId("https://example.com", 0);
    expect(id.startsWith("md-")).toBe(true);
    expect(generateHyperlinkId("https://example.com", 0)).toBe(id);
  });

  it("不同 index 产生不同 ID", () => {
    const a = generateHyperlinkId("https://example.com", 0);
    const b = generateHyperlinkId("https://example.com", 1);
    expect(a).not.toBe(b);
  });

  it("不同 URL 产生不同 ID", () => {
    const a = generateHyperlinkId("https://a.com", 0);
    const b = generateHyperlinkId("https://b.com", 0);
    expect(a).not.toBe(b);
  });
});
