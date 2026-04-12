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
});
