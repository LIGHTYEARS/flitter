/**
 * Markdown 块级节点构建器测试。
 *
 * @module
 */

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
import type { Content } from "mdast";

const theme = defaultMarkdownTheme();
const baseStyle = new TextStyle({});
const ctx = { theme, style: baseStyle, streaming: false };

describe("buildBlocks", () => {
  it("paragraph → RichText", () => {
    const root = parse("Hello world");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(RichText);
  });

  it("heading → RichText, 无 # 前缀", () => {
    const root = parse("## Title");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(RichText);
    // 获取 RichText 的 text span 并验证不含 "#"
    const richText = widgets[0] as RichText;
    const plainText = richText.text.toPlainText();
    expect(plainText).not.toContain("#");
    expect(plainText).toBe("Title");
  });

  it("code 块 → Container", () => {
    const root = parse("```js\nconst x = 1;\n```");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Container);
  });

  it("空代码块被跳过", () => {
    const root = parse("```\n   \n```");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(0);
  });

  it("blockquote → Container", () => {
    const root = parse("> quote text");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Container);
  });

  it("unordered list → Column", () => {
    const root = parse("- item1\n- item2");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Column);
  });

  it("ordered list 保留 start", () => {
    const root = parse("3. first\n4. second");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Column);
    // Column 的 children 是 Row，验证 bullet 文本
    const col = widgets[0] as Column;
    const children = (col as any).children as any[];
    expect(children).toHaveLength(2);
    // 第一个 Row 的第一个 child 是 RichText 带 bullet
    const row = children[0] as Row;
    const bulletWidget = (row as any).children[0] as RichText;
    const bulletText = bulletWidget.text.toPlainText();
    expect(bulletText).toBe("3. ");
  });

  it("table → Table", () => {
    const root = parse("| A | B |\n|---|---|\n| 1 | 2 |");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(Table);
  });

  it("thematicBreak → RichText, text = '---'", () => {
    const root = parse("---");
    const widgets = buildBlocks(root.children as Content[], ctx);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toBeInstanceOf(RichText);
    const richText = widgets[0] as RichText;
    expect(richText.text.toPlainText()).toBe("---");
  });

  it("相邻有空行的块之间有 SizedBox", () => {
    const root = parse("para1\n\npara2");
    const widgets = buildBlocks(root.children as Content[], ctx);
    // 两段之间有空行，应该有 SizedBox
    expect(widgets.length).toBeGreaterThanOrEqual(3);
    const sizedBoxes = widgets.filter((w) => w instanceof SizedBox);
    expect(sizedBoxes.length).toBeGreaterThanOrEqual(1);
  });

  it("无空行的相邻块之间无 SizedBox", () => {
    // 紧邻的列表项不会产生 SizedBox
    const root = parse("- item1\n- item2");
    const widgets = buildBlocks(root.children as Content[], ctx);
    const sizedBoxes = widgets.filter((w) => w instanceof SizedBox);
    expect(sizedBoxes).toHaveLength(0);
  });
});

describe("hasBlankLineBetween", () => {
  it("有空行时返回 true", () => {
    const root = parse("line1\n\nline2");
    const nodes = root.children;
    expect(nodes.length).toBe(2);
    expect(hasBlankLineBetween(nodes[0], nodes[1])).toBe(true);
  });

  it("无空行时返回 false", () => {
    // 在 markdown 中 "# h\npara" 中 heading 和 paragraph 紧邻
    const root = parse("# h\npara");
    const nodes = root.children;
    expect(nodes.length).toBe(2);
    expect(hasBlankLineBetween(nodes[0], nodes[1])).toBe(false);
  });

  it("无 position 时默认返回 true", () => {
    const nodeA = { type: "paragraph", children: [] } as any;
    const nodeB = { type: "paragraph", children: [] } as any;
    expect(hasBlankLineBetween(nodeA, nodeB)).toBe(true);
  });
});
