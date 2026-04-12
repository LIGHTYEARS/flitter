/**
 * TextEditingController 单元测试
 *
 * 覆盖多行编辑控制器的核心功能：
 * - 文本插入/删除
 * - 光标移动 (水平/垂直/行首行尾/文档首尾)
 * - preferredColumn 垂直移动记忆
 * - CJK 文本操作
 * - listener 机制
 * - dispose 安全性
 *
 * @module text-editing-controller.test
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { TextEditingController } from "./text-editing-controller.js";

describe("TextEditingController", () => {
  // ─── 初始状态 ─────────────────────────────────────

  it("初始状态: text='', cursorPosition=0", () => {
    const ctrl = new TextEditingController();
    expect(ctrl.text).toBe("");
    expect(ctrl.cursorPosition).toBe(0);
  });

  it("构造时传入 text 参数", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    expect(ctrl.text).toBe("hello");
    // 逆向代码: cursor 初始化到文本末尾
    expect(ctrl.cursorPosition).toBe(5);
  });

  // ─── 文本插入 ─────────────────────────────────────

  it("insertText 在光标处插入文本", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    expect(ctrl.text).toBe("hello");
    expect(ctrl.cursorPosition).toBe(5);
  });

  it("连续 insertText", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    ctrl.insertText(" world");
    expect(ctrl.text).toBe("hello world");
    expect(ctrl.cursorPosition).toBe(11);
  });

  it("insertText 在光标中间位置插入", () => {
    const ctrl = new TextEditingController({ text: "ac" });
    // 光标在末尾，先移到位置1
    ctrl.moveCursorToStart();
    ctrl.moveCursorRight();
    ctrl.insertText("b");
    expect(ctrl.text).toBe("abc");
    expect(ctrl.cursorPosition).toBe(2);
  });

  // ─── 文本删除 ─────────────────────────────────────

  it("deleteText 向前删除 1 个 grapheme (Backspace)", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello world");
    ctrl.deleteText(1);
    expect(ctrl.text).toBe("hello worl");
    expect(ctrl.cursorPosition).toBe(10);
  });

  it("deleteText 在位置0不操作", () => {
    const ctrl = new TextEditingController();
    ctrl.deleteText(1);
    expect(ctrl.text).toBe("");
    expect(ctrl.cursorPosition).toBe(0);
  });

  it("deleteForward 向后删除 (Delete 键)", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    ctrl.moveCursorToStart();
    ctrl.deleteForward(1);
    expect(ctrl.text).toBe("ello");
    expect(ctrl.cursorPosition).toBe(0);
  });

  it("deleteForward 在文本末尾不操作", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    ctrl.deleteForward(1);
    expect(ctrl.text).toBe("hello");
    expect(ctrl.cursorPosition).toBe(5);
  });

  // ─── 光标水平移动 ─────────────────────────────────

  it("moveCursorLeft 向左移动", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    ctrl.moveCursorLeft();
    expect(ctrl.cursorPosition).toBe(4);
  });

  it("moveCursorRight 向右移动", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    ctrl.moveCursorLeft();
    ctrl.moveCursorLeft();
    ctrl.moveCursorRight();
    expect(ctrl.cursorPosition).toBe(4);
  });

  it("moveCursorLeft 在位置0不移动", () => {
    const ctrl = new TextEditingController();
    ctrl.moveCursorLeft();
    expect(ctrl.cursorPosition).toBe(0);
  });

  it("moveCursorRight 在文本末尾不移动", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hi");
    ctrl.moveCursorRight();
    expect(ctrl.cursorPosition).toBe(2);
  });

  // ─── 行首行尾移动 ─────────────────────────────────

  it("moveCursorToLineStart 跳到当前行首", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello\nworld");
    // cursor at end of "world" (position 11)
    ctrl.moveCursorToLineStart();
    expect(ctrl.cursorPosition).toBe(6); // "world" 的首字符
  });

  it("moveCursorToLineEnd 跳到当前行尾", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello\nworld");
    ctrl.moveCursorToStart();
    ctrl.moveCursorToLineEnd();
    expect(ctrl.cursorPosition).toBe(5); // "hello" 之后的 \n 之前
  });

  // ─── 文档首尾 ─────────────────────────────────────

  it("moveCursorToStart 跳到文档首", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello\nworld");
    ctrl.moveCursorToStart();
    expect(ctrl.cursorPosition).toBe(0);
  });

  it("moveCursorToEnd 跳到文档尾", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello\nworld");
    ctrl.moveCursorToStart();
    ctrl.moveCursorToEnd();
    expect(ctrl.cursorPosition).toBe(11);
  });

  // ─── 垂直移动 ─────────────────────────────────────

  it("moveCursorUp 从第2行跳到第1行", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello\nworld");
    // cursor at end of "world" (grapheme 11, line 1 col 5)
    ctrl.moveCursorUp();
    // should jump to line 0, maintaining column position
    expect(ctrl.cursorLine).toBe(0);
  });

  it("moveCursorDown 从第1行跳到第2行", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello\nworld");
    ctrl.moveCursorToStart();
    // cursor at line 0 col 0
    ctrl.moveCursorDown();
    expect(ctrl.cursorLine).toBe(1);
  });

  it("moveCursorUp 在第1行不移动", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    ctrl.moveCursorUp();
    expect(ctrl.cursorPosition).toBe(5); // 未改变
  });

  it("moveCursorDown 在最后一行不移动", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello");
    ctrl.moveCursorDown();
    expect(ctrl.cursorPosition).toBe(5); // 未改变
  });

  // ─── preferredColumn 保持 ─────────────────────────

  it("垂直移动时 preferredColumn 跨越短行后恢复", () => {
    const ctrl = new TextEditingController();
    // 第1行 "abcde" (5列), 第2行 "fg" (2列), 第3行 "hijkl" (5列)
    ctrl.insertText("abcde\nfg\nhijkl");
    // 移到第1行列4 (offset=4, column=4)
    ctrl.moveCursorToStart();
    ctrl.moveCursorRight(); // 1
    ctrl.moveCursorRight(); // 2
    ctrl.moveCursorRight(); // 3
    ctrl.moveCursorRight(); // 4
    expect(ctrl.cursorPosition).toBe(4);

    // 往下到第2行: "fg" 只有2列, 光标到 offset = 8 (line 1, col 2)
    ctrl.moveCursorDown();
    expect(ctrl.cursorLine).toBe(1);

    // 继续往下到第3行: preferredColumn=4, "hijkl" 有5列
    ctrl.moveCursorDown();
    expect(ctrl.cursorLine).toBe(2);
    expect(ctrl.cursorColumn).toBe(4); // 应恢复到列4
  });

  // ─── CJK 文本操作 ─────────────────────────────────

  it("中文文本 insertText 正确 grapheme 位置", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("你好");
    expect(ctrl.text).toBe("你好");
    expect(ctrl.cursorPosition).toBe(2); // 2 graphemes
  });

  it("CJK 文本删除正确", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("你好世界");
    ctrl.deleteText(1);
    expect(ctrl.text).toBe("你好世");
    expect(ctrl.cursorPosition).toBe(3);
  });

  it("CJK 混合文本光标移动", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hi你好");
    ctrl.moveCursorLeft();
    expect(ctrl.cursorPosition).toBe(3); // "hi你" 之后
    ctrl.moveCursorLeft();
    expect(ctrl.cursorPosition).toBe(2); // "hi" 之后
  });

  // ─── listener 机制 ─────────────────────────────────

  it("addListener 在文本变更时通知", () => {
    const ctrl = new TextEditingController();
    let callCount = 0;
    const listener = () => { callCount++; };
    ctrl.addListener(listener);
    ctrl.insertText("a");
    expect(callCount).toBe(1);
    ctrl.insertText("b");
    expect(callCount).toBe(2);
  });

  it("removeListener 移除后不再通知", () => {
    const ctrl = new TextEditingController();
    let callCount = 0;
    const listener = () => { callCount++; };
    ctrl.addListener(listener);
    ctrl.insertText("a");
    expect(callCount).toBe(1);
    ctrl.removeListener(listener);
    ctrl.insertText("b");
    expect(callCount).toBe(1); // 未增加
  });

  // ─── dispose ───────────────────────────────────────

  it("dispose 清理 listeners", () => {
    const ctrl = new TextEditingController();
    let callCount = 0;
    ctrl.addListener(() => { callCount++; });
    ctrl.dispose();
    // dispose 后的操作不应通知 (listeners 已清空)
    // 但 insertText 仍可工作
    ctrl.insertText("a");
    expect(callCount).toBe(0);
  });

  // ─── getLayoutPosition ────────────────────────────

  it("getLayoutPosition 返回当前光标的行列位置", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("hello\nworld");
    const pos = ctrl.getLayoutPosition();
    expect(pos.line).toBe(1);
    expect(pos.col).toBe(5);
  });

  // ─── cursorLine / cursorColumn getter ─────────────

  it("cursorLine 和 cursorColumn 正确返回", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("abc\ndef");
    expect(ctrl.cursorLine).toBe(1);
    expect(ctrl.cursorColumn).toBe(3);
  });

  // ─── lineCount getter ────────────────────────────

  it("lineCount 返回行数", () => {
    const ctrl = new TextEditingController();
    ctrl.insertText("a\nb\nc");
    expect(ctrl.lineCount).toBe(3);
  });

  // ═══════════════════════════════════════════════════════
  //  选区 (Selection) 测试 — Plan 06-04
  // ═══════════════════════════════════════════════════════

  describe("Selection", () => {
    it("初始状态 hasSelection=false, selectionRange=null", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      expect(ctrl.hasSelection).toBe(false);
      expect(ctrl.selectionRange).toBeNull();
    });

    it("moveCursorRight({ extend: true }) 创建选区", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.moveCursorToStart();
      // 从位置 0 向右扩展选区
      ctrl.moveCursorRight({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      expect(ctrl.selectionRange).toEqual({ start: 0, end: 1 });
      expect(ctrl.cursorPosition).toBe(1);
    });

    it("连续 extend 扩展选区", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorRight({ extend: true });
      ctrl.moveCursorRight({ extend: true });
      ctrl.moveCursorRight({ extend: true });
      expect(ctrl.selectionRange).toEqual({ start: 0, end: 3 });
    });

    it("moveCursorRight() 无 extend 取消选区, 光标到 selectionExtent", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorRight({ extend: true });
      ctrl.moveCursorRight({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      // 无 extend 移动 → 取消选区
      ctrl.moveCursorRight();
      expect(ctrl.hasSelection).toBe(false);
      expect(ctrl.selectionRange).toBeNull();
    });

    it("moveCursorLeft({ extend: true }) 向左扩展选区", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      // cursor at 5 (end)
      ctrl.moveCursorLeft({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      expect(ctrl.selectionRange).toEqual({ start: 4, end: 5 });
      expect(ctrl.cursorPosition).toBe(4);
    });

    it("moveCursorToLineEnd({ extend: true }) 扩展选区到行尾", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorToLineEnd({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      expect(ctrl.selectionRange).toEqual({ start: 0, end: 5 });
    });

    it("moveCursorToLineStart({ extend: true }) 扩展选区到行首", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      // cursor at end (5)
      ctrl.moveCursorToLineStart({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      expect(ctrl.selectionRange).toEqual({ start: 0, end: 5 });
    });

    it("moveCursorToStart({ extend: true }) 扩展选区到文档首", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      // cursor at end (11)
      ctrl.moveCursorToStart({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      expect(ctrl.selectionRange).toEqual({ start: 0, end: 11 });
    });

    it("moveCursorToEnd({ extend: true }) 扩展选区到文档尾", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorToEnd({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      expect(ctrl.selectionRange).toEqual({ start: 0, end: 11 });
    });

    it("moveCursorUp({ extend: true }) 垂直扩展选区", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      // cursor at end (11)
      ctrl.moveCursorUp({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
      // base=11, extent= line 0 col 5 = 5
      expect(ctrl.selectionRange).toEqual({ start: 5, end: 11 });
    });

    it("moveCursorDown({ extend: true }) 垂直向下扩展选区", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorDown({ extend: true });
      expect(ctrl.hasSelection).toBe(true);
    });

    it("setSelectionRange 设置选区", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.setSelectionRange(3, 7);
      expect(ctrl.hasSelection).toBe(true);
      expect(ctrl.selectionRange).toEqual({ start: 3, end: 7 });
      expect(ctrl.cursorPosition).toBe(7);
    });

    it("setSelectionRange clamp 到有效范围", () => {
      const ctrl = new TextEditingController({ text: "hi" });
      ctrl.setSelectionRange(-5, 100);
      expect(ctrl.selectionRange).toEqual({ start: 0, end: 2 });
    });

    it("clearSelection 清除选区", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      ctrl.setSelectionRange(1, 3);
      expect(ctrl.hasSelection).toBe(true);
      ctrl.clearSelection();
      expect(ctrl.hasSelection).toBe(false);
    });

    it("deleteSelectedText 删除选区文本", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.setSelectionRange(5, 11); // 选中 " world"
      ctrl.deleteSelectedText();
      expect(ctrl.text).toBe("hello");
      expect(ctrl.cursorPosition).toBe(5);
      expect(ctrl.hasSelection).toBe(false);
    });

    it("deleteSelectedText 无选区时不操作", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      ctrl.deleteSelectedText();
      expect(ctrl.text).toBe("hello");
    });

    it("deleteSelectedOrText 有选区删选区", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.setSelectionRange(0, 5); // "hello"
      ctrl.deleteSelectedOrText();
      expect(ctrl.text).toBe(" world");
    });

    it("deleteSelectedOrText 无选区删光标前 1 字符", () => {
      const ctrl = new TextEditingController({ text: "abc" });
      // cursor at end (3)
      ctrl.deleteSelectedOrText();
      expect(ctrl.text).toBe("ab");
    });

    it("selectWordAt 选中单词", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.selectWordAt(2); // offset 2 → inside "hello"
      expect(ctrl.hasSelection).toBe(true);
      const range = ctrl.selectionRange!;
      expect(range.start).toBe(0);
      expect(range.end).toBe(5);
    });

    it("selectWordAt 在空格处不选中", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.selectWordAt(5); // offset 5 → " " (空格) 是 word boundary
      expect(ctrl.hasSelection).toBe(false);
    });

    it("selectLineAt 选中整行", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      ctrl.selectLineAt(8); // offset 8 → inside "world"
      expect(ctrl.hasSelection).toBe(true);
      const range = ctrl.selectionRange!;
      expect(range.start).toBe(6); // "world" 起始
      expect(range.end).toBe(11); // "world" 末尾
    });

    it("CJK 文本选区操作", () => {
      const ctrl = new TextEditingController({ text: "你好世界" });
      ctrl.setSelectionRange(1, 3); // "好世"
      ctrl.deleteSelectedText();
      expect(ctrl.text).toBe("你界");
      expect(ctrl.cursorPosition).toBe(1);
    });

    it("insertText 有选区时先删选区", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.setSelectionRange(0, 5); // "hello"
      ctrl.insertText("hi");
      expect(ctrl.text).toBe("hi world");
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Kill Buffer 测试 — Plan 06-04
  // ═══════════════════════════════════════════════════════

  describe("Kill Buffer", () => {
    it("初始 killBuffer 为空字符串", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      expect(ctrl.killBuffer).toBe("");
    });

    it("deleteWordLeft 删除左侧词并存入 killBuffer", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      // cursor at end (11)
      ctrl.deleteWordLeft();
      expect(ctrl.text).toBe("hello ");
      expect(ctrl.killBuffer).toBe("world");
    });

    it("deleteWordRight 删除右侧词并存入 killBuffer", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.moveCursorToStart();
      ctrl.deleteWordRight();
      expect(ctrl.text).toBe(" world");
      expect(ctrl.killBuffer).toBe("hello");
    });

    it("deleteToLineEnd (Ctrl+K) 删除到行尾存入 killBuffer", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.moveCursorToStart();
      ctrl.deleteToLineEnd();
      expect(ctrl.text).toBe("");
      expect(ctrl.killBuffer).toBe("hello world");
    });

    it("deleteToLineEnd 多行时只删到当前行尾", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      ctrl.moveCursorToStart();
      ctrl.deleteToLineEnd();
      expect(ctrl.text).toBe("\nworld");
      expect(ctrl.killBuffer).toBe("hello");
    });

    it("deleteToLineEnd 在行尾不操作", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorToLineEnd(); // cursor at 5, before \n
      ctrl.deleteToLineEnd();
      // 行尾没有字符可删 (光标位置 5 处是 \n)
      expect(ctrl.text).toBe("hello\nworld");
    });

    it("deleteToLineStart (Ctrl+U) 删除到行首存入 killBuffer", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      // cursor at end (11)
      ctrl.deleteToLineStart();
      expect(ctrl.text).toBe("");
      expect(ctrl.killBuffer).toBe("hello world");
    });

    it("deleteToLineStart 多行时只删到当前行首", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld" });
      // cursor at end (11)
      ctrl.deleteToLineStart();
      expect(ctrl.text).toBe("hello\n");
      expect(ctrl.killBuffer).toBe("world");
    });

    it("deleteCurrentLine 删除整行存入 killBuffer", () => {
      const ctrl = new TextEditingController({ text: "hello\nworld\nfoo" });
      // cursor at end of "world" → move to line 1
      ctrl.moveCursorToStart();
      ctrl.moveCursorDown(); // line 1
      ctrl.deleteCurrentLine();
      expect(ctrl.killBuffer).toContain("world");
      // 删除后文本不含 "world" 行
      expect(ctrl.text.includes("world")).toBe(false);
    });

    it("yankText 在光标处插入 killBuffer", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.deleteWordLeft(); // kill "world"
      expect(ctrl.killBuffer).toBe("world");
      ctrl.yankText();
      expect(ctrl.text).toBe("hello world");
    });

    it("yankText killBuffer 为空时不操作", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      ctrl.yankText();
      expect(ctrl.text).toBe("hello");
    });

    it("连续 kill 操作追加到 killBuffer (非覆盖)", () => {
      const ctrl = new TextEditingController({ text: "aaa bbb ccc" });
      // cursor at end (11)
      ctrl.deleteWordLeft(); // kill "ccc"
      expect(ctrl.killBuffer).toBe("ccc");
      ctrl.deleteWordLeft(); // kill " bbb" — 连续追加
      // 连续 kill 应该追加
      expect(ctrl.killBuffer).toContain("bbb");
      expect(ctrl.killBuffer).toContain("ccc");
    });

    it("非 kill 操作后的 kill 不追加 (覆盖)", () => {
      const ctrl = new TextEditingController({ text: "aaa bbb ccc" });
      ctrl.deleteWordLeft(); // kill "ccc"
      ctrl.insertText("x"); // 非 kill 操作打断
      ctrl.deleteWordLeft(); // 删 "x" → 新 killBuffer
      expect(ctrl.killBuffer).not.toContain("ccc");
    });
  });

  // ═══════════════════════════════════════════════════════
  //  词边界移动 (Word Boundary) 测试 — Plan 06-04
  // ═══════════════════════════════════════════════════════

  describe("Word Boundary", () => {
    it("moveCursorWordBoundary('right') 跳到右侧词边界", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorWordBoundary("right");
      // 跳过 "hello" → cursor should be at or after "hello"
      expect(ctrl.cursorPosition).toBe(5);
    });

    it("moveCursorWordBoundary('left') 跳到左侧词边界", () => {
      const ctrl = new TextEditingController({ text: "hello world" });
      // cursor at end (11)
      ctrl.moveCursorWordBoundary("left");
      // 跳到 "world" 起始 → 6
      expect(ctrl.cursorPosition).toBe(6);
    });

    it("moveCursorWordBoundary('right') 在文本末尾不越界", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      ctrl.moveCursorWordBoundary("right");
      expect(ctrl.cursorPosition).toBe(5);
    });

    it("moveCursorWordBoundary('left') 在文本首位不越界", () => {
      const ctrl = new TextEditingController({ text: "hello" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorWordBoundary("left");
      expect(ctrl.cursorPosition).toBe(0);
    });

    it("CJK 文本词边界 — 每个 CJK 字符视为独立词", () => {
      const ctrl = new TextEditingController({ text: "你好世界" });
      ctrl.moveCursorToStart();
      ctrl.moveCursorWordBoundary("right");
      // CJK 是 word boundary 字符, 每个字独立
      // 跳到第一个非 boundary 字符之后
      expect(ctrl.cursorPosition).toBeGreaterThan(0);
      expect(ctrl.cursorPosition).toBeLessThanOrEqual(4);
    });
  });
});
