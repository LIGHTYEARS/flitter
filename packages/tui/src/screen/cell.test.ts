/**
 * Color / TextStyle / Cell 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖全部公开 API。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/screen/cell.test.ts
 * ```
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Color } from "./color.js";
import { TextStyle } from "./text-style.js";
import { Cell } from "./cell.js";

// ════════════════════════════════════════════════════
//  Color 测试
// ════════════════════════════════════════════════════

describe("Color", () => {
  // ── 1. default() 创建 + kind ─────────────────────
  it("default() 创建默认色，kind 为 default", () => {
    const c = Color.default();
    assert.equal(c.kind, "default");
  });

  // ── 2. 命名色索引正确 ────────────────────────────
  it("命名色具有正确的索引值", () => {
    assert.equal(Color.black().index, 0);
    assert.equal(Color.red().index, 1);
    assert.equal(Color.green().index, 2);
    assert.equal(Color.yellow().index, 3);
    assert.equal(Color.blue().index, 4);
    assert.equal(Color.magenta().index, 5);
    assert.equal(Color.cyan().index, 6);
    assert.equal(Color.white().index, 7);

    // 亮色
    assert.equal(Color.brightBlack().index, 8);
    assert.equal(Color.brightRed().index, 9);
    assert.equal(Color.brightWhite().index, 15);
  });

  // ── 3. indexed() 创建索引色 ──────────────────────
  it("indexed(128) 创建 index 类型颜色", () => {
    const c = Color.indexed(128);
    assert.equal(c.kind, "index");
    assert.equal(c.index, 128);
  });

  // ── 4. rgb() 创建真彩色 ──────────────────────────
  it("rgb(255, 128, 0) 创建 rgb 类型颜色，分量正确", () => {
    const c = Color.rgb(255, 128, 0);
    assert.equal(c.kind, "rgb");
    assert.equal(c.r, 255);
    assert.equal(c.g, 128);
    assert.equal(c.b, 0);
  });

  // ── 5. toAnsi 前景色 ────────────────────────────
  it("toAnsi(true) 前景色参数正确", () => {
    assert.equal(Color.default().toAnsi(true), "39");
    assert.equal(Color.red().toAnsi(true), "31");
    assert.equal(Color.brightRed().toAnsi(true), "91");
    assert.equal(Color.indexed(128).toAnsi(true), "38;5;128");
    assert.equal(Color.rgb(255, 128, 0).toAnsi(true), "38;2;255;128;0");
  });

  // ── 6. toAnsi 背景色 ────────────────────────────
  it("toAnsi(false) 背景色参数正确", () => {
    assert.equal(Color.default().toAnsi(false), "49");
    assert.equal(Color.red().toAnsi(false), "41");
    assert.equal(Color.brightRed().toAnsi(false), "101");
    assert.equal(Color.indexed(128).toAnsi(false), "48;5;128");
    assert.equal(Color.rgb(255, 128, 0).toAnsi(false), "48;2;255;128;0");
  });

  // ── 7. equals 值比较 ────────────────────────────
  it("equals: 相同 rgb 相等，不同 kind 不等，相同 named 相等", () => {
    // 相同 rgb
    assert.ok(Color.rgb(10, 20, 30).equals(Color.rgb(10, 20, 30)));
    // 不同 kind
    assert.ok(!Color.red().equals(Color.rgb(255, 0, 0)));
    // 相同 named
    assert.ok(Color.cyan().equals(Color.cyan()));
    // 不同 named
    assert.ok(!Color.red().equals(Color.blue()));
    // default 互相相等
    assert.ok(Color.default().equals(Color.default()));
    // 不同 rgb
    assert.ok(!Color.rgb(0, 0, 0).equals(Color.rgb(0, 0, 1)));
  });

  // ── 额外：边界校验 ──────────────────────────────
  it("indexed() 越界时抛出 RangeError", () => {
    assert.throws(() => Color.indexed(-1), RangeError);
    assert.throws(() => Color.indexed(256), RangeError);
    assert.throws(() => Color.indexed(1.5), RangeError);
  });

  it("rgb() 分量越界时抛出 RangeError", () => {
    assert.throws(() => Color.rgb(-1, 0, 0), RangeError);
    assert.throws(() => Color.rgb(0, 256, 0), RangeError);
    assert.throws(() => Color.rgb(0, 0, 999), RangeError);
  });
});

// ════════════════════════════════════════════════════
//  TextStyle 测试
// ════════════════════════════════════════════════════

describe("TextStyle", () => {
  // ── 8. NORMAL 默认值 ─────────────────────────────
  it("NORMAL 具有全部默认值", () => {
    const n = TextStyle.NORMAL;
    assert.ok(n.foreground.equals(Color.default()));
    assert.ok(n.background.equals(Color.default()));
    assert.equal(n.bold, false);
    assert.equal(n.italic, false);
    assert.equal(n.underline, false);
    assert.equal(n.strikethrough, false);
    assert.equal(n.dim, false);
  });

  // ── 9. constructor 部分选项 ──────────────────────
  it("constructor 使用部分选项时，未指定字段取默认值", () => {
    const s = new TextStyle({ bold: true, foreground: Color.green() });
    assert.equal(s.bold, true);
    assert.ok(s.foreground.equals(Color.green()));
    // 未指定的字段为默认
    assert.equal(s.italic, false);
    assert.ok(s.background.equals(Color.default()));
  });

  // ── 10. copyWith 不修改原实例 ────────────────────
  it("copyWith 创建新实例，不修改原实例", () => {
    const base = new TextStyle({ bold: true });
    const derived = base.copyWith({ italic: true });

    // 新实例具备两个属性
    assert.equal(derived.bold, true);
    assert.equal(derived.italic, true);

    // 原实例未受影响
    assert.equal(base.italic, false);

    // 确实是不同对象
    assert.notEqual(base, derived);
  });

  // ── 11. merge 非默认字段覆盖 ─────────────────────
  it("merge: other 的非默认字段覆盖 this", () => {
    const base = new TextStyle({
      bold: true,
      foreground: Color.red(),
    });
    const overlay = new TextStyle({
      italic: true,
      foreground: Color.blue(),
    });
    const merged = base.merge(overlay);

    assert.equal(merged.bold, true);       // 来自 base
    assert.equal(merged.italic, true);     // 来自 overlay
    assert.ok(merged.foreground.equals(Color.blue())); // overlay 覆盖
  });

  it("merge: other 为 NORMAL 时保留 this 全部字段", () => {
    const base = new TextStyle({
      bold: true,
      foreground: Color.red(),
      background: Color.rgb(30, 30, 30),
    });
    const merged = base.merge(TextStyle.NORMAL);

    assert.equal(merged.bold, true);
    assert.ok(merged.foreground.equals(Color.red()));
    assert.ok(merged.background.equals(Color.rgb(30, 30, 30)));
  });

  // ── 12. equals ───────────────────────────────────
  it("equals: 相同值为 true，不同值为 false", () => {
    const a = new TextStyle({ bold: true, foreground: Color.red() });
    const b = new TextStyle({ bold: true, foreground: Color.red() });
    const c = new TextStyle({ bold: false, foreground: Color.red() });

    assert.ok(a.equals(b));
    assert.ok(!a.equals(c));
  });

  // ── 13. toSgr: bold + red fg ─────────────────────
  it("toSgr: bold + 红色前景 → '1;31'", () => {
    const s = new TextStyle({ bold: true, foreground: Color.red() });
    assert.equal(s.toSgr(), "1;31");
  });

  // ── 14. toSgr: NORMAL 为空 ───────────────────────
  it("toSgr: NORMAL → 空字符串", () => {
    assert.equal(TextStyle.NORMAL.toSgr(), "");
  });

  // ── toSgr 包含多种属性 ──────────────────────────
  it("toSgr: 多属性组合按正确顺序拼接", () => {
    const s = new TextStyle({
      bold: true,
      dim: true,
      italic: true,
      underline: true,
      strikethrough: true,
      foreground: Color.rgb(255, 0, 0),
      background: Color.indexed(200),
    });
    assert.equal(s.toSgr(), "1;2;3;4;9;38;2;255;0;0;48;5;200");
  });

  // ── 15. diffSgr: 相同 → 空 ──────────────────────
  it("diffSgr: 相同样式 → 空字符串", () => {
    const s = new TextStyle({ bold: true });
    assert.equal(s.diffSgr(s), "");
  });

  // ── 16. diffSgr: 新增 bold ──────────────────────
  it("diffSgr: 新增 bold → '1'", () => {
    const prev = TextStyle.NORMAL;
    const next = new TextStyle({ bold: true });
    assert.equal(next.diffSgr(prev), "1");
  });

  // ── 17. diffSgr: 关闭 bold ─────────────────────
  it("diffSgr: 关闭 bold → '22'", () => {
    const prev = new TextStyle({ bold: true });
    const next = TextStyle.NORMAL;
    assert.equal(next.diffSgr(prev), "22");
  });

  // ── 18. diffSgr: 前景色变化 ─────────────────────
  it("diffSgr: 前景色变化 → 输出新前景 SGR", () => {
    const prev = new TextStyle({ foreground: Color.red() });
    const next = new TextStyle({ foreground: Color.blue() });
    assert.equal(next.diffSgr(prev), "34");
  });

  // ── diffSgr: 多属性关闭触发重置 ─────────────────
  it("diffSgr: 关闭 >= 3 个属性时使用完整重置", () => {
    const prev = new TextStyle({
      bold: true,
      italic: true,
      underline: true,
      strikethrough: true,
    });
    const next = TextStyle.NORMAL;
    const diff = next.diffSgr(prev);
    // 应以 "0" 开头（完整重置）
    assert.ok(diff.startsWith("0"), `期望以 "0" 开头，实际: "${diff}"`);
  });

  // ── diffSgr: 新增斜体保留粗体 ──────────────────
  it("diffSgr: 在 bold 基础上新增 italic → '3'", () => {
    const prev = new TextStyle({ bold: true });
    const next = new TextStyle({ bold: true, italic: true });
    assert.equal(next.diffSgr(prev), "3");
  });
});

// ════════════════════════════════════════════════════
//  Cell 测试
// ════════════════════════════════════════════════════

describe("Cell", () => {
  // ── 19. EMPTY ────────────────────────────────────
  it("EMPTY 是空格 + NORMAL + width 1", () => {
    assert.equal(Cell.EMPTY.char, " ");
    assert.equal(Cell.EMPTY.width, 1);
    assert.ok(Cell.EMPTY.style.equals(TextStyle.NORMAL));
  });

  // ── 20. 普通字符默认 width 1 ────────────────────
  it("普通字符 Cell 的 width 默认为 1", () => {
    const cell = new Cell("A", TextStyle.NORMAL);
    assert.equal(cell.char, "A");
    assert.equal(cell.width, 1);
  });

  // ── 21. 宽字符 width 2 ─────────────────────────
  it("宽字符 Cell 的 width 为 2", () => {
    const style = new TextStyle({ foreground: Color.green() });
    const cell = new Cell("\u4e2d", style, 2);
    assert.equal(cell.char, "\u4e2d");
    assert.equal(cell.width, 2);
    assert.ok(cell.style.equals(style));
  });

  // ── 22. 续位占位符 width 0 ─────────────────────
  it("续位占位符 Cell 的 width 为 0，char 为空", () => {
    const cell = new Cell("", TextStyle.NORMAL, 0);
    assert.equal(cell.char, "");
    assert.equal(cell.width, 0);
  });

  // ── 23. equals ──────────────────────────────────
  it("equals: 相同内容为 true，不同 char/style/width 为 false", () => {
    const s1 = new TextStyle({ bold: true });
    const s2 = TextStyle.NORMAL;

    const a = new Cell("X", s1, 1);
    const b = new Cell("X", s1, 1);
    assert.ok(a.equals(b));

    // 不同 char
    const c = new Cell("Y", s1, 1);
    assert.ok(!a.equals(c));

    // 不同 style
    const d = new Cell("X", s2, 1);
    assert.ok(!a.equals(d));

    // 不同 width
    const e = new Cell("X", s1, 2);
    assert.ok(!a.equals(e));
  });

  // ── 额外：EMPTY 间引用一致性 ────────────────────
  it("EMPTY 是共享的单例引用", () => {
    assert.equal(Cell.EMPTY, Cell.EMPTY);
    assert.ok(Cell.EMPTY.equals(new Cell(" ", TextStyle.NORMAL, 1)));
  });
});
