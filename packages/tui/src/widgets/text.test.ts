/**
 * TextSpan / RenderParagraph / RichText / Text 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖文本组件的核心行为：
 * TextSpan 构造与遍历、RenderParagraph 布局与绘制、RichText 渲染对象管理、
 * Text 便捷 Widget 构建。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/text.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Color } from "../screen/color.js";
import { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderParagraph, RichText } from "./rich-text.js";
import { Text } from "./text.js";
import { TextSpan } from "./text-span.js";

// ════════════════════════════════════════════════════
//  1. TextSpan 测试
// ════════════════════════════════════════════════════

describe("TextSpan", () => {
  // ── 构造函数 ──

  it("构造函数: 纯文本 TextSpan 正确赋值", () => {
    const span = new TextSpan({ text: "hello" });
    assert.equal(span.text, "hello");
    assert.equal(span.style, undefined);
    assert.equal(span.children, undefined);
  });

  it("构造函数: 带样式的 TextSpan", () => {
    const style = new TextStyle({ bold: true });
    const span = new TextSpan({ text: "bold", style });
    assert.equal(span.text, "bold");
    assert.ok(span.style !== undefined);
    assert.equal(span.style!.bold, true);
  });

  it("构造函数: 带子节点的 TextSpan", () => {
    const child1 = new TextSpan({ text: "a" });
    const child2 = new TextSpan({ text: "b" });
    const span = new TextSpan({ children: [child1, child2] });
    assert.equal(span.text, undefined);
    assert.equal(span.children!.length, 2);
    assert.equal(span.children![0].text, "a");
    assert.equal(span.children![1].text, "b");
  });

  // ── toPlainText ──

  it("toPlainText: 单节点返回自身文本", () => {
    const span = new TextSpan({ text: "hello" });
    assert.equal(span.toPlainText(), "hello");
  });

  it("toPlainText: 嵌套子节点递归拼接", () => {
    const span = new TextSpan({
      children: [
        new TextSpan({ text: "Hello" }),
        new TextSpan({ text: " " }),
        new TextSpan({ text: "World" }),
      ],
    });
    assert.equal(span.toPlainText(), "Hello World");
  });

  it("toPlainText: 空文本返回空字符串", () => {
    const span = new TextSpan({});
    assert.equal(span.toPlainText(), "");
  });

  it("toPlainText: 混合自身文本和子节点", () => {
    const span = new TextSpan({
      text: "A",
      children: [
        new TextSpan({ text: "B" }),
        new TextSpan({
          text: "C",
          children: [new TextSpan({ text: "D" })],
        }),
      ],
    });
    assert.equal(span.toPlainText(), "ABCD");
  });

  // ── visitTextSpan ──

  it("visitTextSpan: 遍历所有节点", () => {
    const span = new TextSpan({
      text: "root",
      children: [
        new TextSpan({ text: "child1" }),
        new TextSpan({
          text: "child2",
          children: [new TextSpan({ text: "grandchild" })],
        }),
      ],
    });

    const visited: string[] = [];
    span.visitTextSpan((s) => {
      visited.push(s.text ?? "");
      return true;
    });
    assert.deepEqual(visited, ["root", "child1", "child2", "grandchild"]);
  });

  it("visitTextSpan: visitor 返回 false 停止遍历", () => {
    const span = new TextSpan({
      text: "root",
      children: [new TextSpan({ text: "child1" }), new TextSpan({ text: "child2" })],
    });

    const visited: string[] = [];
    span.visitTextSpan((s) => {
      visited.push(s.text ?? "");
      return s.text !== "child1"; // 遇到 child1 后停止
    });
    assert.deepEqual(visited, ["root", "child1"]);
  });

  // ── equals ──

  it("equals: 相同结构返回 true", () => {
    const style = new TextStyle({ bold: true });
    const a = new TextSpan({
      text: "hello",
      style,
      children: [new TextSpan({ text: "world" })],
    });
    const b = new TextSpan({
      text: "hello",
      style: new TextStyle({ bold: true }),
      children: [new TextSpan({ text: "world" })],
    });
    assert.ok(a.equals(b));
  });

  it("equals: 不同文本返回 false", () => {
    const a = new TextSpan({ text: "hello" });
    const b = new TextSpan({ text: "world" });
    assert.ok(!a.equals(b));
  });

  it("equals: 不同子节点数量返回 false", () => {
    const a = new TextSpan({
      text: "x",
      children: [new TextSpan({ text: "a" })],
    });
    const b = new TextSpan({
      text: "x",
      children: [new TextSpan({ text: "a" }), new TextSpan({ text: "b" })],
    });
    assert.ok(!a.equals(b));
  });
});

// ════════════════════════════════════════════════════
//  2. RenderParagraph 测试
// ════════════════════════════════════════════════════

describe("RenderParagraph", () => {
  it("performLayout: 单行 ASCII 文本宽度计算正确", () => {
    const span = new TextSpan({ text: "Hello" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.loose(80, 24));

    assert.equal(rp.size.width, 5);
    assert.equal(rp.size.height, 1);
  });

  it("performLayout: 超出约束宽度自动换行", () => {
    // "abcdef" 宽度为 6，约束 maxWidth=3 应换行为 2 行
    const span = new TextSpan({ text: "abcdef" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.loose(3, 24));

    assert.equal(rp.size.width, 3);
    assert.equal(rp.size.height, 2);
  });

  it("performLayout: CJK 文本双宽度正确计算", () => {
    // "你好" 两个 CJK 字符，每个宽度 2，总宽度 4
    const span = new TextSpan({ text: "你好" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.loose(80, 24));

    assert.equal(rp.size.width, 4);
    assert.equal(rp.size.height, 1);
  });

  it("performLayout: 空文本尺寸为约束最小值", () => {
    const span = new TextSpan({});
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.loose(80, 24));

    assert.equal(rp.size.width, 0);
    assert.equal(rp.size.height, 0);
  });

  it("performPaint: 字符正确写入 Screen", () => {
    const span = new TextSpan({ text: "Hi" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.loose(80, 24));

    const screen = new Screen(80, 24);
    rp.performPaint(screen, 0, 0);

    const cell0 = screen.getCell(0, 0);
    assert.equal(cell0.char, "H");
    assert.equal(cell0.width, 1);

    const cell1 = screen.getCell(1, 0);
    assert.equal(cell1.char, "i");
    assert.equal(cell1.width, 1);
  });

  it("performPaint: CJK 字符写入宽度为 2", () => {
    const span = new TextSpan({ text: "中" });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.loose(80, 24));

    const screen = new Screen(80, 24);
    rp.performPaint(screen, 0, 0);

    const cell0 = screen.getCell(0, 0);
    assert.equal(cell0.char, "中");
    assert.equal(cell0.width, 2);

    // 续位占位符（宽度为 0）
    const cell1 = screen.getCell(1, 0);
    assert.equal(cell1.width, 0);
  });
});

// ════════════════════════════════════════════════════
//  3. RichText 测试
// ════════════════════════════════════════════════════

describe("RichText", () => {
  it("createRenderObject 返回 RenderParagraph", () => {
    const richText = new RichText({
      text: new TextSpan({ text: "test" }),
    });
    const ro = richText.createRenderObject();
    assert.ok(ro instanceof RenderParagraph);
    assert.equal((ro as RenderParagraph).textSpan.text, "test");
  });

  it("updateRenderObject 更新 textSpan", () => {
    const richText1 = new RichText({
      text: new TextSpan({ text: "old" }),
    });
    const ro = richText1.createRenderObject() as RenderParagraph;
    assert.equal(ro.textSpan.text, "old");

    const richText2 = new RichText({
      text: new TextSpan({ text: "new" }),
    });
    richText2.updateRenderObject(ro);
    assert.equal(ro.textSpan.text, "new");
  });
});

// ════════════════════════════════════════════════════
//  4. Text 测试
// ════════════════════════════════════════════════════

describe("Text", () => {
  it("build 返回 RichText Widget", () => {
    const text = new Text({ data: "hello" });
    // build 需要 BuildContext，使用 null 兼容方式创建简易 mock
    const result = text.build(null as never);
    assert.ok(result instanceof RichText);
  });

  it("build 传递 style 到 TextSpan", () => {
    const style = new TextStyle({ bold: true, foreground: Color.red() });
    const text = new Text({ data: "styled", style });
    const result = text.build(null as never) as unknown as RichText;

    assert.ok(result.text.style !== undefined);
    assert.equal(result.text.style!.bold, true);
    assert.equal(result.text.text, "styled");
  });

  it("纯文本 Text 默认无样式", () => {
    const text = new Text({ data: "plain" });
    const result = text.build(null as never) as unknown as RichText;

    assert.equal(result.text.text, "plain");
    assert.equal(result.text.style, undefined);
  });
});
