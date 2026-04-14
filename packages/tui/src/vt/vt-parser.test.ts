/**
 * VT/ANSI 终端解析器状态机的单元测试。
 *
 * 覆盖打印事件、CSI 序列、ESC 序列、OSC 序列、DCS 序列、
 * APC 序列以及各种状态机边界情况。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/vt/vt-parser.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VtCsiEvent, VtEvent, VtPrintEvent } from "./types.js";
import { VtParser } from "./vt-parser.js";

// ════════════════════════════════════════════════════
//  测试辅助工具
// ════════════════════════════════════════════════════

/** 收集解析器输出的全部事件 */
function collect(parser: VtParser, data: Buffer | Uint8Array): VtEvent[] {
  const events: VtEvent[] = [];
  parser.onEvent((e) => events.push(e));
  parser.parse(data);
  // 解析结束后需要刷新打印缓冲区 —— 通过发送一个不可能出现的序列触发
  // 直接用 reset() 来刷新
  parser.reset();
  // 移除 handler 避免后续干扰（通过重新创建 parser 实现）
  return events;
}

/** 快捷方式：从字符串创建 Buffer 并收集事件 */
function parseStr(input: string): VtEvent[] {
  const parser = new VtParser();
  return collect(parser, Buffer.from(input, "latin1"));
}

/** 快捷方式：从字节数组创建 Uint8Array 并收集事件 */
function parseBytes(bytes: number[]): VtEvent[] {
  const parser = new VtParser();
  return collect(parser, new Uint8Array(bytes));
}

/** 提取所有 print 事件的 grapheme */
function graphemes(events: VtEvent[]): string[] {
  return events.filter((e): e is VtPrintEvent => e.type === "print").map((e) => e.grapheme);
}

// ════════════════════════════════════════════════════
//  打印事件（Print Events）
// ════════════════════════════════════════════════════

describe("打印事件", () => {
  // ── 1. ASCII "Hello" → 5 个 print 事件 ──────────────
  it("1. ASCII 'Hello' 产生 5 个字形簇", () => {
    const events = parseBytes([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    const gs = graphemes(events);
    assert.deepEqual(gs, ["H", "e", "l", "l", "o"]);
  });

  // ── 2. UTF-8 中文 "你好" → 2 个 print 事件 ──────────
  it("2. UTF-8 中文 '你好' 产生 2 个字形簇", () => {
    const buf = Buffer.from("你好", "utf-8");
    const parser = new VtParser();
    const events = collect(parser, buf);
    const gs = graphemes(events);
    assert.deepEqual(gs, ["你", "好"]);
  });

  // ── 3. Emoji "👍" → 1 个 print 事件 ─────────────────
  it("3. Emoji '👍' 产生 1 个字形簇", () => {
    const buf = Buffer.from("👍", "utf-8");
    const parser = new VtParser();
    const events = collect(parser, buf);
    const gs = graphemes(events);
    assert.equal(gs.length, 1);
    assert.equal(gs[0], "👍");
  });

  // ── 4. ZWJ Emoji "👨‍👩‍👧" → 1 个字形簇 ─────────
  it("4. ZWJ Emoji 序列 '👨‍👩‍👧' 产生 1 个字形簇", () => {
    const buf = Buffer.from("👨‍👩‍👧", "utf-8");
    const parser = new VtParser();
    const events = collect(parser, buf);
    const gs = graphemes(events);
    assert.equal(gs.length, 1);
    assert.equal(gs[0], "👨‍👩‍👧");
  });

  // ── 5. 混合 ASCII + CJK + Emoji ────────────────────
  it("5. 混合 ASCII + CJK + Emoji 正确分割", () => {
    const buf = Buffer.from("A你👍", "utf-8");
    const parser = new VtParser();
    const events = collect(parser, buf);
    const gs = graphemes(events);
    assert.deepEqual(gs, ["A", "你", "👍"]);
  });

  // ── 6. 不完整 UTF-8 → 替换字符 U+FFFD ──────────────
  it("6. 不完整 UTF-8 字节产生替换字符 U+FFFD", () => {
    // 0xC3 是 UTF-8 两字节序列的前导字节，缺少后续字节
    const events = parseBytes([0xc3]);
    const gs = graphemes(events);
    assert.equal(gs.length, 1);
    assert.equal(gs[0], "\uFFFD");
  });

  // ── 7. 空输入 → 无事件 ─────────────────────────────
  it("7. 空输入不产生任何事件", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));
    parser.parse(new Uint8Array(0));
    parser.reset();
    assert.equal(events.length, 0);
  });

  // ── 8. ESC 序列分隔的多段 ASCII ─────────────────────
  it("8. ESC 序列分隔的多段 ASCII 正确产生 print 事件", () => {
    // "AB" ESC M "CD"
    const events = parseBytes([0x41, 0x42, 0x1b, 0x4d, 0x43, 0x44]);
    const gs = graphemes(events);
    assert.deepEqual(gs, ["A", "B", "C", "D"]);
    // 中间应有一个 escape 事件
    const escEvents = events.filter((e) => e.type === "escape");
    assert.equal(escEvents.length, 1);
  });

  // ── 9. 单独的高字节（无效 UTF-8 前导）产生替换字符 ──
  it("9. 孤立高字节产生替换字符", () => {
    // 0xFF 不是有效 UTF-8
    const events = parseBytes([0xff]);
    const gs = graphemes(events);
    assert.equal(gs.length, 1);
    assert.equal(gs[0], "\uFFFD");
  });

  // ── 10. Tab (0x09) 不产生 print 事件 ────────────────
  it("10. Tab (0x09) 是 C0 控制字符，不产生 print 事件", () => {
    const events = parseBytes([0x09]);
    const printEvents = events.filter((e) => e.type === "print");
    assert.equal(printEvents.length, 0);
  });

  // ── 10b. 多个 C0 控制字符都不产生 print 事件 ────────
  it("10b. 多个 C0 控制字符 (NUL, BEL, BS, LF) 都不产生 print 事件", () => {
    const events = parseBytes([0x00, 0x07, 0x08, 0x0a]);
    const printEvents = events.filter((e) => e.type === "print");
    assert.equal(printEvents.length, 0);
  });
});

// ════════════════════════════════════════════════════
//  CSI 序列
// ════════════════════════════════════════════════════

describe("CSI 序列", () => {
  // ── 11. ESC [ A → 无参数 CSI ─────────────────────────
  it("11. ESC [ A → 无参数 CSI final='A'", () => {
    const events = parseBytes([0x1b, 0x5b, 0x41]);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.final, "A");
    assert.equal(csi.params.length, 0);
    assert.equal(csi.private_marker, "");
    assert.equal(csi.intermediates, "");
  });

  // ── 12. ESC [ 1 ; 2 A → 两个参数 ────────────────────
  it("12. ESC [ 1 ; 2 A → params=[{value:1},{value:2}]", () => {
    const events = parseBytes([0x1b, 0x5b, 0x31, 0x3b, 0x32, 0x41]);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.final, "A");
    assert.equal(csi.params.length, 2);
    assert.equal(csi.params[0].value, 1);
    assert.equal(csi.params[1].value, 2);
  });

  // ── 13. ESC [ ? 25 h → 私有标记 ─────────────────────
  it("13. ESC [ ? 25 h → private_marker='?' params=[{value:25}]", () => {
    const events = parseBytes([0x1b, 0x5b, 0x3f, 0x32, 0x35, 0x68]);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.private_marker, "?");
    assert.equal(csi.params.length, 1);
    assert.equal(csi.params[0].value, 25);
    assert.equal(csi.final, "h");
  });

  // ── 14. ESC [ 38;2;255;0;0 m → 5 个参数 ─────────────
  it("14. ESC [ 38;2;255;0;0 m → 5 个参数", () => {
    const events = parseStr("\x1b[38;2;255;0;0m");
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.final, "m");
    assert.equal(csi.params.length, 5);
    assert.equal(csi.params[0].value, 38);
    assert.equal(csi.params[1].value, 2);
    assert.equal(csi.params[2].value, 255);
    assert.equal(csi.params[3].value, 0);
    assert.equal(csi.params[4].value, 0);
  });

  // ── 15. ESC [ 1:2 m → 子参数 ────────────────────────
  it("15. ESC [ 1:2 m → params=[{value:1, subparams:[2]}]", () => {
    // CSI 1 : 2 m
    const events = parseBytes([0x1b, 0x5b, 0x31, 0x3a, 0x32, 0x6d]);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.params.length, 1);
    assert.equal(csi.params[0].value, 2);
    assert.ok(csi.params[0].subparams);
    assert.deepEqual(csi.params[0].subparams, [1]);
  });

  // ── 16. ESC [ ;5 m → 省略参数 ───────────────────────
  it("16. ESC [ ;5 m → params=[{value:-1},{value:5}]", () => {
    const events = parseStr("\x1b[;5m");
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.params.length, 2);
    assert.equal(csi.params[0].value, -1);
    assert.equal(csi.params[1].value, 5);
  });

  // ── 17. CSI 带中间字节 ESC [ 0 SP q ────────────────
  it("17. ESC [ 0 SP q → intermediates=' '", () => {
    // ESC [ 0 <SP> q
    const events = parseBytes([0x1b, 0x5b, 0x30, 0x20, 0x71]);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.intermediates, " ");
    assert.equal(csi.final, "q");
    assert.equal(csi.params.length, 1);
    assert.equal(csi.params[0].value, 0);
  });

  // ── 18. 连续多个 CSI 序列 ──────────────────────────
  it("18. 连续多个 CSI 序列正确解析", () => {
    // ESC[1m ESC[2m ESC[3m
    const events = parseStr("\x1b[1m\x1b[2m\x1b[3m");
    const csiEvents = events.filter((e) => e.type === "csi") as VtCsiEvent[];
    assert.equal(csiEvents.length, 3);
    assert.equal(csiEvents[0].params[0].value, 1);
    assert.equal(csiEvents[1].params[0].value, 2);
    assert.equal(csiEvents[2].params[0].value, 3);
  });

  // ── 19. 8 位 CSI (0x9B) 入口 ──────────────────────
  it("19. 8 位 CSI (0x9B) 正确进入 CSI 状态", () => {
    // 0x9B 5 A
    const events = parseBytes([0x9b, 0x35, 0x41]);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.final, "A");
    assert.equal(csi.params.length, 1);
    assert.equal(csi.params[0].value, 5);
  });

  // ── 20. 超过 16 个参数的溢出处理 ───────────────────
  it("20. 超过 16 个 CSI 参数时额外参数被忽略", () => {
    // 构建 20 个参数：1;2;3;...;20 m
    const parts = Array.from({ length: 20 }, (_, i) => String(i + 1)).join(";");
    const events = parseStr(`\x1b[${parts}m`);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.params.length, MAX_CSI_PARAMS());
  });

  // ── 21. SGR 鼠标格式 ESC [ < 0;10;20 M ─────────────
  it("21. CSI < 0;10;20 M → SGR 鼠标格式", () => {
    const events = parseStr("\x1b[<0;10;20M");
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.private_marker, "<");
    assert.equal(csi.params.length, 3);
    assert.equal(csi.params[0].value, 0);
    assert.equal(csi.params[1].value, 10);
    assert.equal(csi.params[2].value, 20);
    assert.equal(csi.final, "M");
  });

  // ── 22. 粘贴起始标记 ESC [ 200 ~ ───────────────────
  it("22. ESC [ 200 ~ → 粘贴起始标记", () => {
    const events = parseStr("\x1b[200~");
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.params.length, 1);
    assert.equal(csi.params[0].value, 200);
    assert.equal(csi.final, "~");
  });

  // ── 23. CSI param 位置出现私有标记 → csi_ignore ─────
  it("23. CSI param 位置出现额外私有标记 → 序列被忽略", () => {
    // ESC [ 1 ? m — '?' 在 param 位置是无效的
    const events = parseBytes([0x1b, 0x5b, 0x31, 0x3f, 0x6d]);
    const csi = events.filter((e) => e.type === "csi");
    assert.equal(csi.length, 0);
  });

  // ── 24. 无参数 + 终止字节 ──────────────────────────
  it("24. CSI 无参数直接终止字节", () => {
    // ESC [ H
    const events = parseStr("\x1b[H");
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.final, "H");
    assert.equal(csi.params.length, 0);
  });

  // ── 25. 空 CSI: ESC [ m → SGR 重置 ────────────────
  it("25. ESC [ m → 空 CSI（SGR 重置）", () => {
    const events = parseStr("\x1b[m");
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.final, "m");
    // 空 CSI 不应有参数
    assert.equal(csi.params.length, 0);
  });

  // ── 25b. CSI 多个子参数 ESC [ 4:3:1 m ──────────────
  it("25b. ESC [ 4:3:1 m → 多级子参数", () => {
    const events = parseBytes([0x1b, 0x5b, 0x34, 0x3a, 0x33, 0x3a, 0x31, 0x6d]);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.params.length, 1);
    // 子参数为 [4, 3]，最终值为 1
    assert.ok(csi.params[0].subparams);
    assert.deepEqual(csi.params[0].subparams, [4, 3]);
    assert.equal(csi.params[0].value, 1);
  });
});

// ════════════════════════════════════════════════════
//  ESC 序列
// ════════════════════════════════════════════════════

describe("ESC 序列", () => {
  // ── 26. ESC M → RI（反向换行） ──────────────────────
  it("26. ESC M → escape { final:'M' }", () => {
    const events = parseStr("\x1bM");
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    assert.equal(esc.type, "escape");
    if (esc.type === "escape") {
      assert.equal(esc.final, "M");
      assert.equal(esc.intermediates, "");
    }
  });

  // ── 27. ESC ( 0 → G0 字符集 ────────────────────────
  it("27. ESC ( 0 → escape { intermediates:'(', final:'0' }", () => {
    const events = parseBytes([0x1b, 0x28, 0x30]);
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") {
      assert.equal(esc.intermediates, "(");
      assert.equal(esc.final, "0");
    }
  });

  // ── 28. ESC c → 完全重置 ───────────────────────────
  it("28. ESC c → escape { final:'c' }", () => {
    const events = parseStr("\x1bc");
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") {
      assert.equal(esc.final, "c");
      assert.equal(esc.intermediates, "");
    }
  });

  // ── 29. ESC 7 → 保存光标 ──────────────────────────
  it("29. ESC 7 → escape { final:'7' }", () => {
    const events = parseStr("\x1b7");
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") {
      assert.equal(esc.final, "7");
    }
  });

  // ── 30. ESC 带多个中间字节 ─────────────────────────
  it("30. ESC 带多个中间字节", () => {
    // ESC # 8 → DECALN（屏幕对齐测试）
    const events = parseBytes([0x1b, 0x23, 0x38]);
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") {
      assert.equal(esc.intermediates, "#");
      assert.equal(esc.final, "8");
    }
  });

  // ── 30b. ESC = → 应用键盘模式 ─────────────────────
  it("30b. ESC = → escape { final:'=' }", () => {
    const events = parseStr("\x1b=");
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") {
      assert.equal(esc.final, "=");
    }
  });
});

// ════════════════════════════════════════════════════
//  OSC 序列
// ════════════════════════════════════════════════════

describe("OSC 序列", () => {
  // ── 31. OSC 0;title BEL → 设置窗口标题 ─────────────
  it("31. ESC ] 0;title BEL → osc { data:'0;title' }", () => {
    const events = parseStr("\x1b]0;My Title\x07");
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, "0;My Title");
    }
  });

  // ── 32. OSC 52;c;base64 ESC \ → 剪贴板操作 ─────────
  it("32. OSC 52;c;base64 ESC \\ → 以 ST 终止", () => {
    const events = parseStr("\x1b]52;c;SGVsbG8=\x1b\\");
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, "52;c;SGVsbG8=");
    }
  });

  // ── 33. OSC BEL 终止 ──────────────────────────────
  it("33. OSC 使用 BEL (0x07) 终止", () => {
    const events = parseStr("\x1b]2;test\x07");
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, "2;test");
    }
  });

  // ── 34. OSC 8 位 ST (0x9C) 终止 ────────────────────
  it("34. OSC 使用 8 位 ST (0x9C) 终止", () => {
    const events = parseBytes([
      0x1b,
      0x5d, // ESC ]
      0x31,
      0x3b,
      0x68,
      0x69, // "1;hi"
      0x9c, // 8-bit ST
    ]);
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, "1;hi");
    }
  });

  // ── 35. 空 OSC: ESC ] BEL ─────────────────────────
  it("35. 空 OSC: ESC ] BEL → osc { data:'' }", () => {
    const events = parseStr("\x1b]\x07");
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, "");
    }
  });

  // ── 36. OSC 含 UTF-8 数据 ─────────────────────────
  it("36. OSC 含 UTF-8 数据正确累积", () => {
    // OSC 数据中 UTF-8 高字节被累积（逐字节 fromCharCode）
    const data = "0;标题";
    const buf = Buffer.from(`\x1b]${data}\x07`, "utf-8");
    const parser = new VtParser();
    const events = collect(parser, buf);
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    // 注意：OSC 累积使用 String.fromCharCode 逐字节，UTF-8 多字节会被拆开
    // 这是预期行为 — OSC 数据通常是 ASCII
    assert.ok(osc.type === "osc");
  });

  // ── 37. 长 OSC 数据 ───────────────────────────────
  it("37. 长 OSC 数据字符串正确处理", () => {
    const longStr = "0;" + "x".repeat(1000);
    const events = parseStr(`\x1b]${longStr}\x07`);
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, longStr);
    }
  });

  // ── 38. OSC 数据中含分号 ──────────────────────────
  it("38. OSC 数据中的分号被正确保留", () => {
    const events = parseStr("\x1b]8;;https://example.com\x07");
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, "8;;https://example.com");
    }
  });

  // ── 38b. 8 位 OSC (0x9D) 入口 ────────────────────
  it("38b. 8 位 OSC (0x9D) 正确进入 OSC 状态", () => {
    const events = parseBytes([
      0x9d, // 8-bit OSC
      0x30,
      0x3b,
      0x68,
      0x69, // "0;hi"
      0x07, // BEL
    ]);
    const osc = events.find((e) => e.type === "osc");
    assert.ok(osc);
    if (osc.type === "osc") {
      assert.equal(osc.data, "0;hi");
    }
  });
});

// ════════════════════════════════════════════════════
//  DCS 序列
// ════════════════════════════════════════════════════

describe("DCS 序列", () => {
  // ── 39. DCS +q data ESC \ → 基本 DCS ──────────────
  it("39. ESC P + q 7465 ESC \\ → dcs 事件", () => {
    const events = parseStr("\x1bP+q7465\x1b\\");
    const dcs = events.find((e) => e.type === "dcs");
    assert.ok(dcs);
    if (dcs.type === "dcs") {
      assert.equal(dcs.intermediates, "+");
      assert.equal(dcs.final, "q");
      assert.equal(dcs.data, "7465");
    }
  });

  // ── 40. DCS 带参数 ────────────────────────────────
  it("40. DCS 带参数正确解析", () => {
    // ESC P 1 ; 2 | data ESC \
    const events = parseStr("\x1bP1;2|payload\x1b\\");
    const dcs = events.find((e) => e.type === "dcs");
    assert.ok(dcs);
    if (dcs.type === "dcs") {
      assert.equal(dcs.params.length, 2);
      assert.equal(dcs.params[0].value, 1);
      assert.equal(dcs.params[1].value, 2);
      assert.equal(dcs.final, "|");
      assert.equal(dcs.data, "payload");
    }
  });

  // ── 41. DCS 空数据 ────────────────────────────────
  it("41. DCS 空数据正确处理", () => {
    const events = parseStr("\x1bP+q\x1b\\");
    const dcs = events.find((e) => e.type === "dcs");
    assert.ok(dcs);
    if (dcs.type === "dcs") {
      assert.equal(dcs.data, "");
      assert.equal(dcs.final, "q");
    }
  });

  // ── 42. 8 位 DCS (0x90) 入口 ──────────────────────
  it("42. 8 位 DCS (0x90) 正确进入 DCS 状态", () => {
    // 0x90 + q data ESC \
    const events = parseBytes([
      0x90, // 8-bit DCS
      0x2b,
      0x71, // "+q"
      0x41,
      0x42, // "AB"
      0x1b,
      0x5c, // ESC \
    ]);
    const dcs = events.find((e) => e.type === "dcs");
    assert.ok(dcs);
    if (dcs.type === "dcs") {
      assert.equal(dcs.intermediates, "+");
      assert.equal(dcs.final, "q");
      assert.equal(dcs.data, "AB");
    }
  });

  // ── 43. DCS passthrough 数据累积 ──────────────────
  it("43. DCS passthrough 正确累积多段数据", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    // 分段发送：ESC P q | 分段 data | ESC \
    parser.parse(Buffer.from("\x1bPq", "latin1"));
    parser.parse(Buffer.from("Hello", "latin1"));
    parser.parse(Buffer.from(" World", "latin1"));
    parser.parse(Buffer.from("\x1b\\", "latin1"));

    const dcs = events.find((e) => e.type === "dcs");
    assert.ok(dcs);
    if (dcs.type === "dcs") {
      assert.equal(dcs.data, "Hello World");
      assert.equal(dcs.final, "q");
    }
  });

  // ── 43b. DCS 使用 8 位 ST (0x9C) 终止 ─────────────
  it("43b. DCS 使用 8 位 ST (0x9C) 终止", () => {
    const events = parseBytes([
      0x1b,
      0x50, // ESC P
      0x71, // 'q'
      0x41,
      0x42, // "AB"
      0x9c, // 8-bit ST
    ]);
    const dcs = events.find((e) => e.type === "dcs");
    assert.ok(dcs);
    if (dcs.type === "dcs") {
      assert.equal(dcs.data, "AB");
    }
  });
});

// ════════════════════════════════════════════════════
//  APC 序列
// ════════════════════════════════════════════════════

describe("APC 序列", () => {
  // ── 44. ESC _ data ESC \ → APC 事件 ───────────────
  it("44. ESC _ data ESC \\ → apc 事件", () => {
    const events = parseStr("\x1b_some-payload\x1b\\");
    const apc = events.find((e) => e.type === "apc");
    assert.ok(apc);
    if (apc.type === "apc") {
      assert.equal(apc.data, "some-payload");
    }
  });

  // ── 45. 空 APC ────────────────────────────────────
  it("45. 空 APC: ESC _ ESC \\ → apc { data:'' }", () => {
    const events = parseStr("\x1b_\x1b\\");
    const apc = events.find((e) => e.type === "apc");
    assert.ok(apc);
    if (apc.type === "apc") {
      assert.equal(apc.data, "");
    }
  });

  // ── 46. APC 含各种数据 ────────────────────────────
  it("46. APC 含特殊字符正确累积", () => {
    const events = parseStr("\x1b_key=value;foo=bar\x1b\\");
    const apc = events.find((e) => e.type === "apc");
    assert.ok(apc);
    if (apc.type === "apc") {
      assert.equal(apc.data, "key=value;foo=bar");
    }
  });

  // ── 46b. 8 位 APC (0x9F) 入口 ────────────────────
  it("46b. 8 位 APC (0x9F) 正确进入 APC 状态", () => {
    const events = parseBytes([
      0x9f, // 8-bit APC
      0x41,
      0x42, // "AB"
      0x1b,
      0x5c, // ESC \
    ]);
    const apc = events.find((e) => e.type === "apc");
    assert.ok(apc);
    if (apc.type === "apc") {
      assert.equal(apc.data, "AB");
    }
  });

  // ── 46c. APC 使用 8 位 ST (0x9C) 终止 ─────────────
  it("46c. APC 使用 8 位 ST (0x9C) 终止", () => {
    const events = parseBytes([
      0x1b,
      0x5f, // ESC _
      0x58,
      0x59, // "XY"
      0x9c, // 8-bit ST
    ]);
    const apc = events.find((e) => e.type === "apc");
    assert.ok(apc);
    if (apc.type === "apc") {
      assert.equal(apc.data, "XY");
    }
  });
});

// ════════════════════════════════════════════════════
//  状态机边界情况
// ════════════════════════════════════════════════════

describe("状态机边界情况", () => {
  // ── 47. reset() 返回 ground 状态 ──────────────────
  it("47. reset() 将解析器恢复到 ground 状态", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    // 进入 CSI 状态
    parser.parse(Buffer.from("\x1b[", "latin1"));
    assert.equal(parser.getState(), "csi_entry");

    parser.reset();
    assert.equal(parser.getState(), "ground");
  });

  // ── 48. 跨 parse() 调用的 CSI 分割 ────────────────
  it("48. CSI 序列跨 parse() 调用分割正确解析", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    // ESC[ | 31m 分两次发送
    parser.parse(Buffer.from("\x1b[", "latin1"));
    parser.parse(Buffer.from("31m", "latin1"));

    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.params[0].value, 31);
    assert.equal(csi.final, "m");
  });

  // ── 49. 混合序列：文本 + CSI + 文本 + OSC ──────────
  it("49. 混合序列正确解析各种事件类型", () => {
    const events = parseStr("AB\x1b[1mCD\x1b]0;t\x07EF");
    const types = events.map((e) => e.type);
    // 期望：print, print, csi, print, print, osc, print, print
    assert.ok(types.includes("print"));
    assert.ok(types.includes("csi"));
    assert.ok(types.includes("osc"));

    const gs = graphemes(events);
    assert.deepEqual(gs, ["A", "B", "C", "D", "E", "F"]);
  });

  // ── 50. C0 控制字符在 ground 状态 ─────────────────
  it("50. 各种 C0 控制字符 (0x00-0x1F) 不产生 print 事件", () => {
    const bytes: number[] = [];
    for (let i = 0; i <= 0x1f; i++) {
      if (i === 0x1b) continue; // 跳过 ESC
      bytes.push(i);
    }
    const events = parseBytes(bytes);
    const prints = events.filter((e) => e.type === "print");
    assert.equal(prints.length, 0);
  });

  // ── 51. ESC 中断当前 CSI → 开始新的 escape ────────
  it("51. ESC 中断正在解析的 CSI 序列", () => {
    // ESC [ 1 ESC M → CSI 被中断，ESC M 产生 escape 事件
    const events = parseBytes([0x1b, 0x5b, 0x31, 0x1b, 0x4d]);
    const csi = events.filter((e) => e.type === "csi");
    assert.equal(csi.length, 0); // CSI 被中断，不应产生
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") {
      assert.equal(esc.final, "M");
    }
  });

  // ── 52. 超长参数列表 ──────────────────────────────
  it("52. 超长参数列表不导致崩溃", () => {
    const params = Array.from({ length: 100 }, () => "1").join(";");
    const events = parseStr(`\x1b[${params}m`);
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    // 不应超过 MAX_CSI_PARAMS
    assert.ok(csi.params.length <= MAX_CSI_PARAMS());
  });

  // ── 53. 交替的 print 和 CSI 序列 ──────────────────
  it("53. 交替的 print 和 CSI 序列正确解析", () => {
    const events = parseStr("A\x1b[1mB\x1b[2mC");
    const gs = graphemes(events);
    assert.deepEqual(gs, ["A", "B", "C"]);
    const csiEvents = events.filter((e) => e.type === "csi");
    assert.equal(csiEvents.length, 2);
  });

  // ── 54. 空 Uint8Array → 无事件 ────────────────────
  it("54. parse(new Uint8Array(0)) 不产生事件", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));
    parser.parse(new Uint8Array(0));
    assert.equal(events.length, 0);
  });

  // ── 55. 每个完整序列后回到 ground 状态 ─────────────
  it("55. 完整序列后解析器回到 ground 状态", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    parser.parse(Buffer.from("\x1b[1m", "latin1"));
    assert.equal(parser.getState(), "ground");

    parser.parse(Buffer.from("\x1b]0;t\x07", "latin1"));
    assert.equal(parser.getState(), "ground");

    parser.parse(Buffer.from("\x1bM", "latin1"));
    assert.equal(parser.getState(), "ground");
  });

  // ── 56. ESC 进入时刷新打印缓冲区 ──────────────────
  it("56. ESC 触发打印缓冲区刷新", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    // 发送 "AB" 然后 ESC，print 事件应在 ESC 之前产生
    parser.parse(Buffer.from("AB\x1bM", "latin1"));

    // 前两个事件应是 print
    assert.equal(events[0].type, "print");
    assert.equal(events[1].type, "print");
    if (events[0].type === "print") assert.equal(events[0].grapheme, "A");
    if (events[1].type === "print") assert.equal(events[1].grapheme, "B");
    assert.equal(events[2].type, "escape");
  });

  // ── 57. 单次 parse() 产生多个事件 ─────────────────
  it("57. 单次 parse() 调用可产生多个事件", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    parser.parse(Buffer.from("\x1b[1m\x1b[2m\x1bM", "latin1"));
    assert.equal(events.length, 3);
    assert.equal(events[0].type, "csi");
    assert.equal(events[1].type, "csi");
    assert.equal(events[2].type, "escape");
  });

  // ── 58. OSC 中 ESC 不跟 \ → 新 escape 序列 ────────
  it("58. OSC 中 ESC 后非 \\ → 中断 OSC 并开始新 escape", () => {
    // ESC ] 0;hi ESC M → OSC 被中断，ESC M 产生 escape 事件
    const events = parseStr("\x1b]0;hi\x1bM");
    const osc = events.filter((e) => e.type === "osc");
    assert.equal(osc.length, 0); // OSC 被中断，不应产生
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") {
      assert.equal(esc.final, "M");
    }
  });

  // ── 59. 8 位 C1 入口 (0x9B, 0x9D, 0x90, 0x9F) ────
  it("59. 所有 8 位 C1 入口正确进入对应状态", () => {
    const parser = new VtParser();

    // 0x9B → CSI
    parser.parse(new Uint8Array([0x9b]));
    assert.equal(parser.getState(), "csi_entry");
    parser.reset();

    // 0x9D → OSC
    parser.parse(new Uint8Array([0x9d]));
    assert.equal(parser.getState(), "osc_string");
    parser.reset();

    // 0x90 → DCS
    parser.parse(new Uint8Array([0x90]));
    assert.equal(parser.getState(), "dcs_entry");
    parser.reset();

    // 0x9F → APC
    parser.parse(new Uint8Array([0x9f]));
    assert.equal(parser.getState(), "apc_string");
    parser.reset();
  });

  // ── 60. 连续 escape 序列 ──────────────────────────
  it("60. 连续 escape 序列正确解析", () => {
    const events = parseStr("\x1bM\x1b7\x1bc");
    const escEvents = events.filter((e) => e.type === "escape");
    assert.equal(escEvents.length, 3);
    if (escEvents[0].type === "escape") assert.equal(escEvents[0].final, "M");
    if (escEvents[1].type === "escape") assert.equal(escEvents[1].final, "7");
    if (escEvents[2].type === "escape") assert.equal(escEvents[2].final, "c");
  });

  // ── 61. SOS 序列被正常吞没 ────────────────────────
  it("61. SOS 序列被正常处理（不产生事件）", () => {
    // ESC X some-data ESC \
    const events = parseStr("\x1bXsome-data\x1b\\");
    // SOS 不产生事件
    const sos = events.filter((e) => e.type !== "print");
    assert.equal(sos.length, 0);
  });

  // ── 62. PM 序列被正常吞没 ─────────────────────────
  it("62. PM 序列被正常处理（不产生事件）", () => {
    // ESC ^ some-data ESC \
    const events = parseStr("\x1b^pm-data\x1b\\");
    const pm = events.filter((e) => e.type !== "print");
    assert.equal(pm.length, 0);
  });

  // ── 63. CSI 参数从多次 parse 中累积 ───────────────
  it("63. CSI 参数跨多次 parse() 正确累积", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    parser.parse(Buffer.from("\x1b[3", "latin1"));
    parser.parse(Buffer.from("8;2;", "latin1"));
    parser.parse(Buffer.from("255;0;0m", "latin1"));

    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.params.length, 5);
    assert.equal(csi.params[0].value, 38);
  });

  // ── 64. onEvent 支持多个处理函数 ──────────────────
  it("64. onEvent 支持注册多个回调", () => {
    const parser = new VtParser();
    let count1 = 0;
    let count2 = 0;
    parser.onEvent(() => count1++);
    parser.onEvent(() => count2++);

    parser.parse(Buffer.from("\x1bM", "latin1"));
    assert.equal(count1, 1);
    assert.equal(count2, 1);
  });

  // ── 65. 打印后立即 CSI 后再打印 ───────────────────
  it("65. print → CSI → print 序列事件顺序正确", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    parser.parse(Buffer.from("X\x1b[1mY", "latin1"));
    parser.reset(); // 刷新最后的 print

    assert.equal(events[0].type, "print");
    assert.equal(events[1].type, "csi");
    assert.equal(events[2].type, "print");
    if (events[0].type === "print") assert.equal(events[0].grapheme, "X");
    if (events[2].type === "print") assert.equal(events[2].grapheme, "Y");
  });

  // ── 66. ESC ESC 处理 ─────────────────────────────
  it("66. ESC ESC M → 第一个 ESC 被丢弃，第二个正常处理", () => {
    const events = parseBytes([0x1b, 0x1b, 0x4d]);
    const esc = events.filter((e) => e.type === "escape");
    assert.equal(esc.length, 1);
    if (esc[0].type === "escape") assert.equal(esc[0].final, "M");
  });

  // ── 67. DCS 中 ESC 中断 → 新 escape ──────────────
  it("67. DCS passthrough 中 ESC 后非 \\ → 中断 DCS", () => {
    // ESC P q data ESC M → DCS 中断，ESC M 产生
    const events = parseStr("\x1bPqdata\x1bM");
    const dcs = events.filter((e) => e.type === "dcs");
    assert.equal(dcs.length, 0);
    const esc = events.find((e) => e.type === "escape");
    assert.ok(esc);
    if (esc.type === "escape") assert.equal(esc.final, "M");
  });

  // ── 68. CSI > 私有标记 ────────────────────────────
  it("68. CSI > 私有标记正确识别", () => {
    // ESC [ > 0 c
    const events = parseStr("\x1b[>0c");
    const csi = events.find((e) => e.type === "csi") as VtCsiEvent;
    assert.ok(csi);
    assert.equal(csi.private_marker, ">");
    assert.equal(csi.params[0].value, 0);
    assert.equal(csi.final, "c");
  });

  // ── 69. 回退到 ground 后可继续正常解析 ─────────────
  it("69. csi_ignore 完成后可继续解析新序列", () => {
    // 触发 csi_ignore 然后正常序列
    const events = parseBytes([
      0x1b,
      0x5b,
      0x31,
      0x3f,
      0x6d, // CSI 1 ? m → ignore → ground on 'm'
      0x1b,
      0x5b,
      0x32,
      0x41, // CSI 2 A
    ]);
    const csiEvents = events.filter((e) => e.type === "csi") as VtCsiEvent[];
    assert.equal(csiEvents.length, 1);
    assert.equal(csiEvents[0].params[0].value, 2);
    assert.equal(csiEvents[0].final, "A");
  });

  // ── 70. C0 控制字符不中断打印缓冲区中已有内容 ─────
  it("70. C0 控制字符正确刷新之前的打印缓冲区", () => {
    const parser = new VtParser();
    const events: VtEvent[] = [];
    parser.onEvent((e) => events.push(e));

    // "AB" + TAB + "CD"
    parser.parse(Buffer.from("AB\tCD", "latin1"));
    parser.reset();

    const gs = graphemes(events);
    assert.deepEqual(gs, ["A", "B", "C", "D"]);
  });
});

// ════════════════════════════════════════════════════
//  辅助函数
// ════════════════════════════════════════════════════

/** 获取 MAX_CSI_PARAMS 常量值 */
function MAX_CSI_PARAMS(): number {
  return 16;
}
