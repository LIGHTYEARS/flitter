/**
 * AnsiRenderer 测试套件。
 *
 * 覆盖差分渲染、全屏渲染、光标控制、SGR 编码、宽字符处理及端到端集成。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Screen } from "./screen.js";
import { Cell } from "./cell.js";
import { TextStyle } from "./text-style.js";
import { Color } from "./color.js";
import {
  AnsiRenderer,
  ESC,
  CSI,
  CUP,
  CUF,
  CUB,
  CUU,
  CUD,
  HIDE_CURSOR,
  SHOW_CURSOR,
  CLEAR_SCREEN,
  CLEAR_LINE,
  SGR,
  SGR_RESET,
  ALT_SCREEN_ON,
  ALT_SCREEN_OFF,
  MOUSE_ON,
  MOUSE_OFF,
  PASTE_ON,
  PASTE_OFF,
} from "./ansi-renderer.js";

// ── ANSI 常量测试 ────────────────────────────────────

describe("ANSI 常量", () => {
  it("CUP(0,0) 生成 1-based 坐标", () => {
    assert.equal(CUP(0, 0), `${CSI}1;1H`);
  });

  it("CUP(9,19) 生成正确坐标", () => {
    assert.equal(CUP(9, 19), `${CSI}10;20H`);
  });

  it("SGR_RESET 格式正确", () => {
    assert.equal(SGR_RESET, `${CSI}0m`);
  });

  it("HIDE_CURSOR / SHOW_CURSOR 格式正确", () => {
    assert.equal(HIDE_CURSOR, `${CSI}?25l`);
    assert.equal(SHOW_CURSOR, `${CSI}?25h`);
  });

  it("ALT_SCREEN_ON/OFF 格式正确", () => {
    assert.equal(ALT_SCREEN_ON, `${CSI}?1049h`);
    assert.equal(ALT_SCREEN_OFF, `${CSI}?1049l`);
  });

  it("MOUSE_ON/OFF 包含三种模式", () => {
    assert.ok(MOUSE_ON.includes("?1000h"));
    assert.ok(MOUSE_ON.includes("?1003h"));
    assert.ok(MOUSE_ON.includes("?1006h"));
    assert.ok(MOUSE_OFF.includes("?1000l"));
    assert.ok(MOUSE_OFF.includes("?1003l"));
    assert.ok(MOUSE_OFF.includes("?1006l"));
  });

  it("PASTE_ON/OFF 格式正确", () => {
    assert.equal(PASTE_ON, `${CSI}?2004h`);
    assert.equal(PASTE_OFF, `${CSI}?2004l`);
  });

  it("CLEAR_SCREEN / CLEAR_LINE 格式正确", () => {
    assert.equal(CLEAR_SCREEN, `${CSI}2J`);
    assert.equal(CLEAR_LINE, `${CSI}2K`);
  });

  it("CUF/CUB/CUU/CUD 格式正确", () => {
    assert.equal(CUF(5), `${CSI}5C`);
    assert.equal(CUB(3), `${CSI}3D`);
    assert.equal(CUU(2), `${CSI}2A`);
    assert.equal(CUD(4), `${CSI}4B`);
  });

  it("SGR 函数拼接参数", () => {
    assert.equal(SGR(1, 3, 31), `${CSI}1;3;31m`);
    assert.equal(SGR(0), `${CSI}0m`);
  });
});

// ── 差分渲染测试 ──────────────────────────────────────

describe("差分渲染", () => {
  it("空屏幕 (无 dirty) → 仅光标输出", () => {
    const screen = new Screen(10, 5);
    screen.present(); // 清除初始 fullRefresh
    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);
    // 无脏区域，仅输出光标控制
    assert.ok(output.includes(HIDE_CURSOR) || output.includes(SHOW_CURSOR));
    assert.ok(!output.includes(CLEAR_SCREEN));
  });

  it("单个 Cell 变化 → CUP + SGR + char", () => {
    const screen = new Screen(10, 5);
    screen.present(); // 清除 fullRefresh

    const style = new TextStyle({ bold: true });
    screen.writeChar(3, 2, "X", style);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(CUP(2, 3)), "应包含 CUP 定位到 (2,3)");
    assert.ok(output.includes("X"), "应包含字符 X");
    assert.ok(output.includes("1"), "应包含 SGR bold(1)");
  });

  it("同行连续 Cell → CUP 到第一个 + 连续 char 输出", () => {
    const screen = new Screen(10, 5);
    screen.present();

    screen.writeChar(2, 1, "A", TextStyle.NORMAL);
    screen.writeChar(3, 1, "B", TextStyle.NORMAL);
    screen.writeChar(4, 1, "C", TextStyle.NORMAL);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    // 应包含一次 CUP 到 (1,2)，然后连续 ABC
    assert.ok(output.includes(CUP(1, 2)));
    assert.ok(output.includes("ABC"));
  });

  it("同行不连续 Cell → 两次 CUP", () => {
    const screen = new Screen(20, 5);
    screen.present();

    screen.writeChar(2, 1, "A", TextStyle.NORMAL);
    screen.writeChar(10, 1, "B", TextStyle.NORMAL);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(CUP(1, 2)));
    assert.ok(output.includes(CUP(1, 10)));
  });

  it("多行脏 Cell → 多次 CUP", () => {
    const screen = new Screen(10, 5);
    screen.present();

    screen.writeChar(0, 0, "A", TextStyle.NORMAL);
    screen.writeChar(0, 3, "B", TextStyle.NORMAL);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(CUP(0, 0)));
    assert.ok(output.includes(CUP(3, 0)));
  });

  it("样式变化 → diffSgr 输出", () => {
    const screen = new Screen(10, 5);
    screen.present();

    const bold = new TextStyle({ bold: true });
    const italic = new TextStyle({ italic: true });

    screen.writeChar(0, 0, "A", bold);
    screen.writeChar(1, 0, "B", italic);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    // bold SGR (1) 和 italic SGR (3) 都应出现
    assert.ok(output.includes("1"), "应包含 bold SGR");
    assert.ok(output.includes("A"));
    assert.ok(output.includes("B"));
  });

  it("相同样式连续 Cell → 无额外 SGR", () => {
    const screen = new Screen(10, 5);
    screen.present();

    const style = new TextStyle({ bold: true });
    screen.writeChar(0, 0, "A", style);
    screen.writeChar(1, 0, "B", style);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    // 只有一次设置 bold 的 SGR
    assert.ok(output.includes("AB"), "连续字符应合并输出");
  });

  it("粗体 Cell → SGR 1 + char", () => {
    const screen = new Screen(10, 5);
    screen.present();

    screen.writeChar(0, 0, "Z", new TextStyle({ bold: true }));

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(`${CSI}1m`), "应包含 SGR bold");
    assert.ok(output.includes("Z"));
  });

  it("RGB 前景色 → SGR 38;2;r;g;b", () => {
    const screen = new Screen(10, 5);
    screen.present();

    const style = new TextStyle({ foreground: Color.rgb(255, 128, 0) });
    screen.writeChar(0, 0, "R", style);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes("38;2;255;128;0"), "应包含 RGB 前景色 SGR");
  });

  it("256 色背景 → SGR 48;5;n", () => {
    const screen = new Screen(10, 5);
    screen.present();

    const style = new TextStyle({ background: Color.indexed(200) });
    screen.writeChar(0, 0, "I", style);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes("48;5;200"), "应包含 256 色背景 SGR");
  });

  it("宽字符 (width=2) → 输出字符 + 跳过续位", () => {
    const screen = new Screen(10, 5);
    screen.present();

    screen.writeChar(0, 0, "中", TextStyle.NORMAL, 2);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes("中"), "应包含宽字符");
    // 续位 Cell (width=0) 不应单独输出字符
    const chars = output.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, "");
    // 移除所有 ANSI 序列后，"中" 应只出现一次
    const count = (chars.match(/中/g) || []).length;
    assert.equal(count, 1, "宽字符应只输出一次");
  });

  it("needsFullRefresh → 全屏输出", () => {
    const screen = new Screen(5, 3);
    screen.writeChar(0, 0, "A", TextStyle.NORMAL);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(CLEAR_SCREEN), "全屏刷新应包含 CLEAR_SCREEN");
    assert.ok(output.includes("A"));
  });

  it("present 后 render → 无脏区域输出", () => {
    const screen = new Screen(10, 5);
    screen.writeChar(0, 0, "A", TextStyle.NORMAL);
    screen.present();

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    // present 后无脏区域，不应有字符输出
    const chars = output.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, "");
    assert.ok(!chars.includes("A"), "present 后不应输出之前的字符");
  });

  it("clear + render → 全屏刷新", () => {
    const screen = new Screen(10, 5);
    screen.writeChar(0, 0, "A", TextStyle.NORMAL);
    screen.present();

    screen.clear();
    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(CLEAR_SCREEN), "clear 后应触发全屏刷新");
  });

  it("命名色前景 → SGR 31 (红)", () => {
    const screen = new Screen(10, 5);
    screen.present();

    screen.writeChar(0, 0, "R", new TextStyle({ foreground: Color.red() }));
    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes("31"), "应包含红色前景 SGR 31");
  });

  it("多属性样式 → SGR 正确组合", () => {
    const screen = new Screen(10, 5);
    screen.present();

    const style = new TextStyle({
      bold: true,
      italic: true,
      foreground: Color.green(),
    });
    screen.writeChar(0, 0, "M", style);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes("1"), "应包含 bold");
    assert.ok(output.includes("3"), "应包含 italic");
    assert.ok(output.includes("32"), "应包含 green fg");
  });
});

// ── 全屏渲染测试 ──────────────────────────────────────

describe("全屏渲染 (renderFull)", () => {
  it("renderFull 包含 CLEAR_SCREEN", () => {
    const screen = new Screen(5, 3);
    const renderer = new AnsiRenderer();
    const output = renderer.renderFull(screen);

    assert.ok(output.includes(CLEAR_SCREEN));
    assert.ok(output.includes(CUP(0, 0)));
  });

  it("renderFull 跳过 EMPTY Cell", () => {
    const screen = new Screen(5, 3);
    screen.writeChar(2, 1, "X", TextStyle.NORMAL);

    const renderer = new AnsiRenderer();
    const output = renderer.renderFull(screen);

    assert.ok(output.includes("X"));
    // 清除 ANSI 序列后不应有大量空格
    const stripped = output.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, "");
    assert.ok(stripped.includes("X"));
  });

  it("renderFull 连续非空 Cell 合并输出", () => {
    const screen = new Screen(10, 3);
    screen.writeChar(0, 0, "H", TextStyle.NORMAL);
    screen.writeChar(1, 0, "i", TextStyle.NORMAL);

    const renderer = new AnsiRenderer();
    const output = renderer.renderFull(screen);

    assert.ok(output.includes("Hi"), "连续字符应合并");
  });

  it("renderFull 正确处理宽字符", () => {
    const screen = new Screen(10, 3);
    const style = new TextStyle({ bold: true });
    screen.writeChar(0, 0, "你", style, 2);
    screen.writeChar(2, 0, "好", style, 2);

    const renderer = new AnsiRenderer();
    const output = renderer.renderFull(screen);

    assert.ok(output.includes("你"), "应包含 '你'");
    assert.ok(output.includes("好"), "应包含 '好'");
  });

  it("renderFull 空屏幕仅清屏", () => {
    const screen = new Screen(5, 3);
    const renderer = new AnsiRenderer();
    const output = renderer.renderFull(screen);

    assert.ok(output.includes(CLEAR_SCREEN));
    assert.ok(output.includes(HIDE_CURSOR));
  });
});

// ── 光标测试 ─────────────────────────────────────────

describe("光标控制 (renderCursor)", () => {
  it("光标可见 + 有位置 → SHOW_CURSOR + CUP", () => {
    const screen = new Screen(10, 5);
    screen.cursorVisible = true;
    screen.cursorPosition = { x: 5, y: 3 };

    const renderer = new AnsiRenderer();
    const output = renderer.renderCursor(screen);

    assert.ok(output.includes(SHOW_CURSOR));
    assert.ok(output.includes(CUP(3, 5)));
  });

  it("光标不可见 → HIDE_CURSOR", () => {
    const screen = new Screen(10, 5);
    screen.cursorVisible = false;
    screen.cursorPosition = { x: 0, y: 0 };

    const renderer = new AnsiRenderer();
    const output = renderer.renderCursor(screen);

    assert.equal(output, HIDE_CURSOR);
  });

  it("光标位置 null → HIDE_CURSOR", () => {
    const screen = new Screen(10, 5);
    screen.cursorVisible = true;
    screen.cursorPosition = null;

    const renderer = new AnsiRenderer();
    const output = renderer.renderCursor(screen);

    assert.equal(output, HIDE_CURSOR);
  });

  it("光标位置变化反映在输出中", () => {
    const screen = new Screen(10, 5);
    screen.cursorVisible = true;

    screen.cursorPosition = { x: 0, y: 0 };
    const renderer = new AnsiRenderer();
    let output = renderer.renderCursor(screen);
    assert.ok(output.includes(CUP(0, 0)));

    screen.cursorPosition = { x: 7, y: 4 };
    output = renderer.renderCursor(screen);
    assert.ok(output.includes(CUP(4, 7)));
  });

  it("render 方法包含光标输出", () => {
    const screen = new Screen(10, 5);
    screen.present();
    screen.cursorVisible = true;
    screen.cursorPosition = { x: 2, y: 1 };

    screen.writeChar(0, 0, "A", TextStyle.NORMAL);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(SHOW_CURSOR));
    assert.ok(output.includes(CUP(1, 2)));
  });
});

// ── 端到端集成测试 ───────────────────────────────────

describe("端到端集成", () => {
  it("创建 Screen → writeChar → render → present → writeChar → render", () => {
    const screen = new Screen(20, 10);
    const renderer = new AnsiRenderer();

    // 第一帧: 全屏刷新
    screen.writeChar(0, 0, "H", TextStyle.NORMAL);
    screen.writeChar(1, 0, "i", TextStyle.NORMAL);
    const frame1 = renderer.render(screen);
    assert.ok(frame1.includes(CLEAR_SCREEN), "第一帧应全屏刷新");
    assert.ok(frame1.includes("Hi"));

    screen.present();

    // 第二帧: 差分更新
    screen.writeChar(5, 3, "!", new TextStyle({ bold: true }));
    const frame2 = renderer.render(screen);
    assert.ok(!frame2.includes(CLEAR_SCREEN), "第二帧不应全屏刷新");
    assert.ok(frame2.includes("!"), "第二帧应包含新字符");
    assert.ok(!frame2.includes("Hi"), "第二帧不应包含第一帧的字符");
  });

  it("第二次 render 仅输出第二次变化", () => {
    const screen = new Screen(10, 5);
    const renderer = new AnsiRenderer();

    screen.writeChar(0, 0, "A", TextStyle.NORMAL);
    renderer.render(screen); // 消费第一帧
    screen.present();

    screen.writeChar(5, 2, "B", TextStyle.NORMAL);
    const frame2 = renderer.render(screen);

    assert.ok(frame2.includes("B"));
    assert.ok(frame2.includes(CUP(2, 5)));
    // 不应包含之前的 "A"（已 present）
    const stripped = frame2.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, "");
    assert.ok(!stripped.includes("A"), "不应包含已 present 的内容");
  });

  it("resize 后全屏刷新", () => {
    const screen = new Screen(10, 5);
    const renderer = new AnsiRenderer();

    screen.writeChar(0, 0, "X", TextStyle.NORMAL);
    screen.present();

    screen.resize(20, 10);
    screen.writeChar(0, 0, "Y", TextStyle.NORMAL);
    const output = renderer.render(screen);

    assert.ok(output.includes(CLEAR_SCREEN), "resize 后应全屏刷新");
    assert.ok(output.includes("Y"));
  });

  it("多帧连续渲染保持一致性", () => {
    const screen = new Screen(10, 5);
    const renderer = new AnsiRenderer();

    // Frame 1
    screen.writeChar(0, 0, "1", TextStyle.NORMAL);
    renderer.render(screen);
    screen.present();

    // Frame 2
    screen.writeChar(1, 0, "2", TextStyle.NORMAL);
    const f2 = renderer.render(screen);
    screen.present();

    // Frame 3 - 无变化
    const f3 = renderer.render(screen);
    const f3stripped = f3.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, "");
    assert.ok(!f3stripped.includes("1"));
    assert.ok(!f3stripped.includes("2"));

    // Frame 4 - 新变化
    screen.writeChar(2, 0, "3", TextStyle.NORMAL);
    const f4 = renderer.render(screen);
    assert.ok(f4.includes("3"));
    assert.ok(!f4.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, "").includes("2"));
  });

  it("样式从有到无正确重置", () => {
    const screen = new Screen(10, 5);
    const renderer = new AnsiRenderer();

    screen.present();

    // 写入带样式的字符
    screen.writeChar(0, 0, "A", new TextStyle({ bold: true }));
    const output = renderer.render(screen);

    // 输出应包含 SGR_RESET (在末尾)
    assert.ok(output.includes(SGR_RESET), "样式输出后应包含 SGR_RESET");
  });
});

// ── SGR 编码正确性 ───────────────────────────────────

describe("SGR 编码", () => {
  it("亮色前景 → SGR 90-97", () => {
    const screen = new Screen(10, 5);
    screen.present();

    screen.writeChar(0, 0, "B", new TextStyle({ foreground: Color.brightRed() }));
    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes("91"), "应包含亮红色前景 SGR 91");
  });

  it("下划线 + 删除线 → SGR 4;9", () => {
    const screen = new Screen(10, 5);
    screen.present();

    const style = new TextStyle({ underline: true, strikethrough: true });
    screen.writeChar(0, 0, "U", style);

    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes("4"), "应包含 underline SGR");
    assert.ok(output.includes("9"), "应包含 strikethrough SGR");
  });

  it("dim 属性 → SGR 2", () => {
    const screen = new Screen(10, 5);
    screen.present();

    screen.writeChar(0, 0, "D", new TextStyle({ dim: true }));
    const renderer = new AnsiRenderer();
    const output = renderer.render(screen);

    assert.ok(output.includes(`${CSI}2m`), "应包含 dim SGR 2");
  });
});
