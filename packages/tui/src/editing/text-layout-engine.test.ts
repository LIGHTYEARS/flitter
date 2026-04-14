/**
 * TextLayoutEngine 单元测试
 *
 * 覆盖文本换行布局引擎的核心功能：
 * - 空文本处理
 * - 单行/多行文本
 * - 超宽自动换行 (ASCII / CJK)
 * - offset ↔ position 双向映射
 * - Grapheme cluster 正确处理
 *
 * @module text-layout-engine.test
 */

import { describe, expect, it } from "bun:test";
import { TextLayoutEngine } from "./text-layout-engine.js";

describe("TextLayoutEngine", () => {
  // ─── 基础功能 ─────────────────────────────────────

  it("空文本应返回 1 行空字符串", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("");
    engine.updateWidth(80);
    expect(engine.getLineCount()).toBe(1);
    expect(engine.getLine(0)).toBe("");
  });

  it("单行短文本不换行", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("hello");
    engine.updateWidth(80);
    expect(engine.getLineCount()).toBe(1);
    expect(engine.getLine(0)).toBe("hello");
  });

  it("多行文本按换行符分割", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("hello\nworld");
    engine.updateWidth(80);
    expect(engine.getLineCount()).toBe(2);
    expect(engine.getLine(0)).toBe("hello");
    expect(engine.getLine(1)).toBe("world");
  });

  it("三行文本正确分割", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("a\nb\nc");
    engine.updateWidth(80);
    expect(engine.getLineCount()).toBe(3);
    expect(engine.getLine(0)).toBe("a");
    expect(engine.getLine(1)).toBe("b");
    expect(engine.getLine(2)).toBe("c");
  });

  it("末尾换行符产生额外空行", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("hello\n");
    engine.updateWidth(80);
    expect(engine.getLineCount()).toBe(2);
    expect(engine.getLine(0)).toBe("hello");
    expect(engine.getLine(1)).toBe("");
  });

  // ─── 超宽自动换行 ─────────────────────────────────

  it("ASCII 文本超宽自动换行", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("abcdefghij");
    engine.updateWidth(5);
    expect(engine.getLineCount()).toBe(2);
    expect(engine.getLine(0)).toBe("abcde");
    expect(engine.getLine(1)).toBe("fghij");
  });

  it("CJK 文本按宽度换行 (每个 CJK 字符占 2 列)", () => {
    const engine = new TextLayoutEngine();
    // "你好世界" → 每字符宽度 2, 总宽度 8
    // width=6 → 第1行 "你好世" (宽度6), 第2行 "界" (宽度2)
    engine.updateText("你好世界");
    engine.updateWidth(6);
    expect(engine.getLineCount()).toBe(2);
    expect(engine.getLine(0)).toBe("你好世");
    expect(engine.getLine(1)).toBe("界");
  });

  it("CJK 字符不拆分 — 剩余宽度不够时整个字符换行", () => {
    const engine = new TextLayoutEngine();
    // "ab你好" → a(1) b(1) 你(2) 好(2) = 6 列
    // width=4 → 第1行 "ab你" (4列), 第2行 "好" (2列)
    engine.updateText("ab你好");
    engine.updateWidth(4);
    expect(engine.getLineCount()).toBe(2);
    expect(engine.getLine(0)).toBe("ab你");
    expect(engine.getLine(1)).toBe("好");
  });

  it("CJK 字符在宽度刚好为 1 时不能放入，换到下一行", () => {
    const engine = new TextLayoutEngine();
    // "a你" → a(1) 你(2), width=2 → 第1行 "a" (1列), 第2行 "你" (2列)
    engine.updateText("a你");
    engine.updateWidth(2);
    expect(engine.getLineCount()).toBe(2);
    expect(engine.getLine(0)).toBe("a");
    expect(engine.getLine(1)).toBe("你");
  });

  // ─── offsetToPosition / positionToOffset ─────────

  it("offsetToPosition 基本映射", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("hello\nworld");
    engine.updateWidth(80);

    expect(engine.offsetToPosition(0)).toEqual({ line: 0, col: 0 });
    expect(engine.offsetToPosition(4)).toEqual({ line: 0, col: 4 });
    // offset=5 是 '\n', 按逆向实现: 换行符后一个位置
    expect(engine.offsetToPosition(6)).toEqual({ line: 1, col: 0 });
    expect(engine.offsetToPosition(11)).toEqual({ line: 1, col: 5 });
  });

  it("positionToOffset 基本映射", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("hello\nworld");
    engine.updateWidth(80);

    expect(engine.positionToOffset({ line: 0, col: 0 })).toBe(0);
    expect(engine.positionToOffset({ line: 0, col: 4 })).toBe(4);
    expect(engine.positionToOffset({ line: 1, col: 0 })).toBe(6);
    expect(engine.positionToOffset({ line: 1, col: 5 })).toBe(11);
  });

  it("offsetToPosition 和 positionToOffset 往返一致性", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("abc\ndef\nghi");
    engine.updateWidth(80);

    const totalGraphemes = engine.getGraphemeCount();
    for (let i = 0; i <= totalGraphemes; i++) {
      const pos = engine.offsetToPosition(i);
      const backOffset = engine.positionToOffset(pos);
      expect(backOffset).toBe(i);
    }
  });

  // ─── Grapheme cluster ────────────────────────────

  it("组合字符 é (e + \\u0301) 算 1 个 grapheme", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("e\u0301"); // é = e + combining acute accent
    engine.updateWidth(80);
    expect(engine.getGraphemeCount()).toBe(1);
    expect(engine.getLineCount()).toBe(1);
  });

  it("ZWJ 家庭 Emoji 算 1 个 grapheme", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("👨‍👩‍👧");
    engine.updateWidth(80);
    expect(engine.getGraphemeCount()).toBe(1);
    expect(engine.getLineCount()).toBe(1);
  });

  it("多个 Emoji grapheme 正确计数", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("😀🚀");
    engine.updateWidth(80);
    expect(engine.getGraphemeCount()).toBe(2);
  });

  // ─── CJK 文本 grapheme 操作 ───────────────────────

  it("CJK 文本 grapheme 计数正确", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("你好世界");
    engine.updateWidth(80);
    expect(engine.getGraphemeCount()).toBe(4);
  });

  it("CJK 混合 ASCII 文本 grapheme 和布局列正确", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("hi你好");
    engine.updateWidth(80);
    expect(engine.getGraphemeCount()).toBe(4);
    // h(1) + i(1) + 你(2) + 好(2) = 6 columns
    expect(engine.getLayoutColumnFromOffset(0)).toBe(0);
    expect(engine.getLayoutColumnFromOffset(2)).toBe(2); // h+i = 2 cols
    expect(engine.getLayoutColumnFromOffset(3)).toBe(4); // h+i+你 = 4 cols
  });

  // ─── getLine 边界 ─────────────────────────────────

  it("getLine 越界返回空字符串", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("hello");
    engine.updateWidth(80);
    expect(engine.getLine(-1)).toBe("");
    expect(engine.getLine(1)).toBe("");
  });

  // ─── 更新宽度触发重新布局 ────────────────────────

  it("updateWidth 后重新布局", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("abcdef");
    engine.updateWidth(6);
    expect(engine.getLineCount()).toBe(1);

    engine.updateWidth(3);
    expect(engine.getLineCount()).toBe(2);
    expect(engine.getLine(0)).toBe("abc");
    expect(engine.getLine(1)).toBe("def");
  });

  // ─── 布局列 (考虑 CJK 双宽) ────────────────────────

  it("getLayoutColumnFromOffset 计算布局列宽度", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("a你b");
    engine.updateWidth(80);
    // offset 0 → col 0 (布局列 0)
    // offset 1 → 'a' 宽度 1 → 布局列 1
    // offset 2 → 'a'(1) + '你'(2) → 布局列 3
    expect(engine.getLayoutColumnFromOffset(0)).toBe(0);
    expect(engine.getLayoutColumnFromOffset(1)).toBe(1);
    expect(engine.getLayoutColumnFromOffset(2)).toBe(3);
  });

  // ─── 空文本 offsetToPosition ───────────────────────

  it("空文本 offsetToPosition(0) 返回 {line:0, col:0}", () => {
    const engine = new TextLayoutEngine();
    engine.updateText("");
    engine.updateWidth(80);
    expect(engine.offsetToPosition(0)).toEqual({ line: 0, col: 0 });
  });
});
