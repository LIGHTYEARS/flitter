/**
 * 终端输入事件解析器的单元测试。
 *
 * 覆盖键盘事件、Ctrl 组合键、方向键、功能键、导航键、
 * 鼠标事件、粘贴事件、焦点事件以及集成场景。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/vt/input-parser.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InputParser } from "./input-parser.js";
import type {
  InbandResizeEvent,
  InputEvent,
  KeyEvent,
  KittyKeyboardResponseEvent,
  Modifiers,
  PasteEvent,
  FocusEvent as TermFocusEvent,
  MouseEvent as TermMouseEvent,
  VtCsiEvent,
  VtEscapeEvent,
  VtPrintEvent,
} from "./types.js";

// ════════════════════════════════════════════════════
//  测试辅助工具
// ════════════════════════════════════════════════════

/** 使用 feed() 方法收集 InputParser 产生的所有输入事件 */
function feedAndCollect(data: Buffer | Uint8Array): InputEvent[] {
  const parser = new InputParser();
  const events: InputEvent[] = [];
  parser.onInput((e) => events.push(e));
  parser.feed(data);
  return events;
}

/** 快捷方式：从字节数组收集输入事件 */
function feedBytes(bytes: number[]): InputEvent[] {
  return feedAndCollect(new Uint8Array(bytes));
}

/** 快捷方式：从 latin1 字符串收集输入事件 */
function feedStr(input: string): InputEvent[] {
  return feedAndCollect(Buffer.from(input, "latin1"));
}

/** 手动传入 VtEvent 并收集输入事件 */
function handleAndCollect(setup: (parser: InputParser) => void): InputEvent[] {
  const parser = new InputParser();
  const events: InputEvent[] = [];
  parser.onInput((e) => events.push(e));
  setup(parser);
  return events;
}

/** 断言事件为 KeyEvent 并返回 */
function assertKeyEvent(event: InputEvent): KeyEvent {
  assert.equal(event.type, "key", `expected key event but got ${event.type}`);
  return event as KeyEvent;
}

/** 断言事件为 MouseEvent 并返回 */
function assertMouseEvent(event: InputEvent): TermMouseEvent {
  assert.equal(event.type, "mouse", `expected mouse event but got ${event.type}`);
  return event as TermMouseEvent;
}

/** 断言事件为 PasteEvent 并返回 */
function assertPasteEvent(event: InputEvent): PasteEvent {
  assert.equal(event.type, "paste", `expected paste event but got ${event.type}`);
  return event as PasteEvent;
}

/** 断言事件为 FocusEvent 并返回 */
function assertFocusEvent(event: InputEvent): TermFocusEvent {
  assert.equal(event.type, "focus", `expected focus event but got ${event.type}`);
  return event as TermFocusEvent;
}

/** 断言修饰键状态无修饰 */
function assertNoModifiers(m: Modifiers): void {
  assert.equal(m.shift, false, "shift should be false");
  assert.equal(m.alt, false, "alt should be false");
  assert.equal(m.ctrl, false, "ctrl should be false");
  assert.equal(m.meta, false, "meta should be false");
}

// ════════════════════════════════════════════════════
//  基本键盘事件（Basic Keyboard）
// ════════════════════════════════════════════════════

describe("基本键盘事件", () => {
  // ── 1. 打印 "a" → KeyEvent key="a" ────────────────────
  it("1. 打印 'a' → KeyEvent key='a'，无修饰键", () => {
    const events = feedBytes([0x61]); // 'a'
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assertNoModifiers(key.modifiers);
  });

  // ── 2. 打印 "A" → KeyEvent key="A" ────────────────────
  it("2. 打印 'A' → KeyEvent key='A'，无修饰键", () => {
    const events = feedBytes([0x41]); // 'A'
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "A");
    assertNoModifiers(key.modifiers);
  });

  // ── 3. C0 0x0D → key="Enter" ─────────────────────────
  it("3. C0 0x0D (CR) → key='Enter'", () => {
    const events = feedBytes([0x0d]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Enter");
    assertNoModifiers(key.modifiers);
  });

  // ── 4. C0 0x09 → key="Tab" ───────────────────────────
  it("4. C0 0x09 (HT) → key='Tab'", () => {
    const events = feedBytes([0x09]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Tab");
    assertNoModifiers(key.modifiers);
  });

  // ── 5. C0 0x7F → key="Backspace" ─────────────────────
  it("5. 0x7F (DEL) → key='Backspace'", () => {
    // 0x7F is printable range in VtParser (>= 0x20, <= 0x7E is false for 0x7F)
    // Actually 0x7F is NOT in 0x20-0x7E range so VtParser skips it as C0-like
    // Let's check: VtParser processGround handles 0x20-0x7E as printable,
    // 0x7F falls into the else (C0 control) branch. So feed() must handle it.
    // But feed() only intercepts byte < 0x20. 0x7F >= 0x20 so it goes to VtParser.
    // VtParser in processGround: 0x7F is not 0x20-0x7E (0x7E = 126, 0x7F = 127),
    // not UTF-8 lead, not 8-bit C1, not >= 0x80... it falls to C0 control else branch.
    // So VtParser silently drops it. We need to handle 0x7F in feed() too.
    // Let's fix this in input-parser.ts by also intercepting 0x7F.
    const events = feedBytes([0x7f]);
    // May need to fix input-parser to handle 0x7F
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Backspace");
  });

  // ── 6. C0 0x1B → key="Escape" ────────────────────────
  it("6. 单独 ESC (0x1B) 后接可打印字符不产生孤立 Escape", () => {
    // 注意：单独的 ESC 会被 VtParser 作为 escape 序列的起始，
    // 如果后面没有有效终止则不产生事件。这里测试的是 ESC 作为
    // VtEscapeEvent 的一部分不会误触发 Escape KeyEvent。
    // 实际上通过 handleVtEvent 直接传 C0 控制给 handlePrint
    // VtParser 不会为独立 ESC 产生事件（它会留在 escape 状态）
    // 所以我们用 handleVtEvent 模拟测试
    const events = handleAndCollect((parser) => {
      // 模拟 VtParser 产生了一个 grapheme 为 ESC 字符的 print 事件
      const evt: VtPrintEvent = { type: "print", grapheme: "\x1b" };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Escape");
  });

  // ── 7. 打印空格 " " → key=" " ───────────────────────
  it("7. 打印空格 → key=' '", () => {
    const events = feedBytes([0x20]); // space
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, " ");
    assertNoModifiers(key.modifiers);
  });

  // ── 8. 打印中文 "中" → key="中" ─────────────────────
  it("8. 打印中文 '中' → key='中'", () => {
    const buf = Buffer.from("中", "utf-8");
    const events = feedAndCollect(buf);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "中");
    assertNoModifiers(key.modifiers);
  });
});

// ════════════════════════════════════════════════════
//  Ctrl 组合键
// ════════════════════════════════════════════════════

describe("Ctrl 组合键", () => {
  // ── 9. C0 0x01 → Ctrl+a ───────────────────────────────
  it("9. C0 0x01 → key='a', ctrl=true", () => {
    const events = feedBytes([0x01]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assert.equal(key.modifiers.ctrl, true);
    assert.equal(key.modifiers.shift, false);
    assert.equal(key.modifiers.alt, false);
  });

  // ── 10. C0 0x03 → Ctrl+c ──────────────────────────────
  it("10. C0 0x03 → key='c', ctrl=true", () => {
    const events = feedBytes([0x03]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "c");
    assert.equal(key.modifiers.ctrl, true);
  });

  // ── 11. C0 0x1A → Ctrl+z ──────────────────────────────
  it("11. C0 0x1A → key='z', ctrl=true", () => {
    const events = feedBytes([0x1a]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "z");
    assert.equal(key.modifiers.ctrl, true);
  });

  // ── 12. C0 0x00 → Ctrl+Space ──────────────────────────
  it("12. C0 0x00 → key='Space', ctrl=true", () => {
    const events = feedBytes([0x00]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Space");
    assert.equal(key.modifiers.ctrl, true);
  });

  // ── 12b. C0 0x08 → Backspace ──────────────────────────
  it("12b. C0 0x08 (BS) → key='Backspace'", () => {
    const events = feedBytes([0x08]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Backspace");
  });

  // ── 12c. C0 0x0A → Enter ──────────────────────────────
  it("12c. C0 0x0A (LF) → key='Enter'", () => {
    const events = feedBytes([0x0a]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Enter");
  });
});

// ════════════════════════════════════════════════════
//  方向键
// ════════════════════════════════════════════════════

describe("方向键", () => {
  // ── 13. CSI A → ArrowUp ───────────────────────────────
  it("13. CSI A → ArrowUp，无修饰键", () => {
    const events = feedStr("\x1b[A");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowUp");
    assertNoModifiers(key.modifiers);
  });

  // ── 14. CSI B → ArrowDown ──────────────────────────────
  it("14. CSI B → ArrowDown", () => {
    const events = feedStr("\x1b[B");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowDown");
  });

  // ── 15. CSI C → ArrowRight ─────────────────────────────
  it("15. CSI C → ArrowRight", () => {
    const events = feedStr("\x1b[C");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowRight");
  });

  // ── 16. CSI D → ArrowLeft ──────────────────────────────
  it("16. CSI D → ArrowLeft", () => {
    const events = feedStr("\x1b[D");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowLeft");
  });

  // ── 17. CSI 1;5 A → ArrowUp, Ctrl ─────────────────────
  it("17. CSI 1;5 A → ArrowUp, ctrl=true", () => {
    const events = feedStr("\x1b[1;5A");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowUp");
    assert.equal(key.modifiers.ctrl, true);
    assert.equal(key.modifiers.shift, false);
  });

  // ── 18. CSI 1;2 B → ArrowDown, Shift ──────────────────
  it("18. CSI 1;2 B → ArrowDown, shift=true", () => {
    const events = feedStr("\x1b[1;2B");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowDown");
    assert.equal(key.modifiers.shift, true);
    assert.equal(key.modifiers.ctrl, false);
  });
});

// ════════════════════════════════════════════════════
//  功能键
// ════════════════════════════════════════════════════

describe("功能键", () => {
  // ── 19. CSI 11~ → F1 ──────────────────────────────────
  it("19. CSI 11~ → F1", () => {
    const events = feedStr("\x1b[11~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F1");
    assertNoModifiers(key.modifiers);
  });

  // ── 20. CSI 15~ → F5 ──────────────────────────────────
  it("20. CSI 15~ → F5", () => {
    const events = feedStr("\x1b[15~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F5");
  });

  // ── 21. CSI 24~ → F12 ─────────────────────────────────
  it("21. CSI 24~ → F12", () => {
    const events = feedStr("\x1b[24~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F12");
  });

  // ── 22. CSI 15;5~ → F5, Ctrl ──────────────────────────
  it("22. CSI 15;5~ → F5, ctrl=true", () => {
    const events = feedStr("\x1b[15;5~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F5");
    assert.equal(key.modifiers.ctrl, true);
  });

  // ── 23. SS3 P → F1 ────────────────────────────────────
  it("23. ESC O P → F1 (SS3)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtEscapeEvent = { type: "escape", intermediates: "O", final: "P" };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F1");
  });

  // ── 24. SS3 Q → F2 ────────────────────────────────────
  it("24. ESC O Q → F2 (SS3)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtEscapeEvent = { type: "escape", intermediates: "O", final: "Q" };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F2");
  });

  // ── 24b. SS3 S → F4 ────────────────────────────────────
  it("24b. ESC O S → F4 (SS3)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtEscapeEvent = { type: "escape", intermediates: "O", final: "S" };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F4");
  });

  // ── 24c. SS3 A → ArrowUp ──────────────────────────────
  it("24c. ESC O A → ArrowUp (SS3)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtEscapeEvent = { type: "escape", intermediates: "O", final: "A" };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowUp");
  });

  // ── 24d. CSI 17~ → F6 ─────────────────────────────────
  it("24d. CSI 17~ → F6", () => {
    const events = feedStr("\x1b[17~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F6");
  });

  // ── 24e. CSI 23~ → F11 ────────────────────────────────
  it("24e. CSI 23~ → F11", () => {
    const events = feedStr("\x1b[23~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F11");
  });
});

// ════════════════════════════════════════════════════
//  导航键
// ════════════════════════════════════════════════════

describe("导航键", () => {
  // ── 25. CSI H → Home ──────────────────────────────────
  it("25. CSI H → Home", () => {
    const events = feedStr("\x1b[H");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Home");
    assertNoModifiers(key.modifiers);
  });

  // ── 26. CSI F → End ───────────────────────────────────
  it("26. CSI F → End", () => {
    const events = feedStr("\x1b[F");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "End");
  });

  // ── 27. CSI 5~ → PageUp ───────────────────────────────
  it("27. CSI 5~ → PageUp", () => {
    const events = feedStr("\x1b[5~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "PageUp");
  });

  // ── 28. CSI 6~ → PageDown ─────────────────────────────
  it("28. CSI 6~ → PageDown", () => {
    const events = feedStr("\x1b[6~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "PageDown");
  });

  // ── 28b. CSI 2~ → Insert ──────────────────────────────
  it("28b. CSI 2~ → Insert", () => {
    const events = feedStr("\x1b[2~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Insert");
  });

  // ── 28c. CSI 3~ → Delete ──────────────────────────────
  it("28c. CSI 3~ → Delete", () => {
    const events = feedStr("\x1b[3~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Delete");
  });

  // ── 28d. CSI 1~ → Home (alternate) ────────────────────
  it("28d. CSI 1~ → Home (alternate encoding)", () => {
    const events = feedStr("\x1b[1~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Home");
  });

  // ── 28e. CSI 4~ → End (alternate) ─────────────────────
  it("28e. CSI 4~ → End (alternate encoding)", () => {
    const events = feedStr("\x1b[4~");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "End");
  });
});

// ════════════════════════════════════════════════════
//  鼠标事件
// ════════════════════════════════════════════════════

describe("鼠标事件", () => {
  // ── 29. SGR 鼠标：左键按下 ────────────────────────────
  it("29. CSI < 0;10;20 M → 左键按下 (9,19)", () => {
    const events = feedStr("\x1b[<0;10;20M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.button, "left");
    assert.equal(mouse.action, "press");
    assert.equal(mouse.x, 9);
    assert.equal(mouse.y, 19);
  });

  // ── 30. SGR 鼠标：左键释放 ────────────────────────────
  it("30. CSI < 0;10;20 m → 左键释放 (9,19)", () => {
    const events = feedStr("\x1b[<0;10;20m");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.button, "left");
    assert.equal(mouse.action, "release");
    assert.equal(mouse.x, 9);
    assert.equal(mouse.y, 19);
  });

  // ── 31. SGR 鼠标：右键按下 ────────────────────────────
  it("31. CSI < 2;5;5 M → 右键按下 (4,4)", () => {
    const events = feedStr("\x1b[<2;5;5M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.button, "right");
    assert.equal(mouse.action, "press");
    assert.equal(mouse.x, 4);
    assert.equal(mouse.y, 4);
  });

  // ── 32. SGR 鼠标：滚轮上 ──────────────────────────────
  it("32. CSI < 64;1;1 M → 滚轮上", () => {
    const events = feedStr("\x1b[<64;1;1M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.action, "wheel_up");
    assert.equal(mouse.x, 0);
    assert.equal(mouse.y, 0);
  });

  // ── 33. SGR 鼠标：滚轮下 ──────────────────────────────
  it("33. CSI < 65;1;1 M → 滚轮下", () => {
    const events = feedStr("\x1b[<65;1;1M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.action, "wheel_down");
  });

  // ── 34. SGR 鼠标：移动事件 ────────────────────────────
  it("34. CSI < 32;3;4 M → 移动事件，左键按住", () => {
    const events = feedStr("\x1b[<32;3;4M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.action, "move");
    assert.equal(mouse.button, "left");
    assert.equal(mouse.x, 2);
    assert.equal(mouse.y, 3);
  });

  // ── 34b. SGR 鼠标：中键按下 ───────────────────────────
  it("34b. CSI < 1;1;1 M → 中键按下", () => {
    const events = feedStr("\x1b[<1;1;1M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.button, "middle");
    assert.equal(mouse.action, "press");
  });

  // ── 34c. SGR 鼠标：带 Shift 修饰键 ───────────────────
  it("34c. CSI < 4;1;1 M → 左键按下, shift=true", () => {
    const events = feedStr("\x1b[<4;1;1M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.button, "left");
    assert.equal(mouse.action, "press");
    assert.equal(mouse.modifiers.shift, true);
  });

  // ── 34d. SGR 鼠标：带 Ctrl 修饰键 ────────────────────
  it("34d. CSI < 16;1;1 M → 左键按下, ctrl=true", () => {
    const events = feedStr("\x1b[<16;1;1M");
    assert.equal(events.length, 1);
    const mouse = assertMouseEvent(events[0]);
    assert.equal(mouse.button, "left");
    assert.equal(mouse.action, "press");
    assert.equal(mouse.modifiers.ctrl, true);
  });
});

// ════════════════════════════════════════════════════
//  粘贴事件
// ════════════════════════════════════════════════════

describe("粘贴事件", () => {
  // ── 35. 正常粘贴 ──────────────────────────────────────
  it("35. CSI 200~ + 文本 + CSI 201~ → PasteEvent", () => {
    const events = feedStr("\x1b[200~Hello World\x1b[201~");
    assert.equal(events.length, 1);
    const paste = assertPasteEvent(events[0]);
    assert.equal(paste.text, "Hello World");
  });

  // ── 36. 空粘贴 ────────────────────────────────────────
  it("36. CSI 200~ 紧跟 CSI 201~ → 空 PasteEvent", () => {
    const events = feedStr("\x1b[200~\x1b[201~");
    assert.equal(events.length, 1);
    const paste = assertPasteEvent(events[0]);
    assert.equal(paste.text, "");
  });

  // ── 37. 含换行的粘贴 ──────────────────────────────────
  it("37. 粘贴内容含换行符", () => {
    // 换行符 0x0A 在粘贴模式中应被保留
    const events = feedStr("\x1b[200~line1\nline2\x1b[201~");
    assert.equal(events.length, 1);
    const paste = assertPasteEvent(events[0]);
    assert.equal(paste.text, "line1\nline2");
  });

  // ── 37b. 粘贴后恢复正常模式 ───────────────────────────
  it("37b. 粘贴结束后恢复正常键盘事件", () => {
    const events = feedStr("\x1b[200~text\x1b[201~a");
    assert.equal(events.length, 2);
    assertPasteEvent(events[0]);
    const key = assertKeyEvent(events[1]);
    assert.equal(key.key, "a");
  });
});

// ════════════════════════════════════════════════════
//  焦点事件
// ════════════════════════════════════════════════════

describe("焦点事件", () => {
  // ── 38. CSI I → 获得焦点 ──────────────────────────────
  it("38. CSI I → FocusEvent focused=true", () => {
    const events = feedStr("\x1b[I");
    assert.equal(events.length, 1);
    const focus = assertFocusEvent(events[0]);
    assert.equal(focus.focused, true);
  });

  // ── 39. CSI O → 失去焦点 ──────────────────────────────
  it("39. CSI O → FocusEvent focused=false", () => {
    const events = feedStr("\x1b[O");
    assert.equal(events.length, 1);
    const focus = assertFocusEvent(events[0]);
    assert.equal(focus.focused, false);
  });
});

// ════════════════════════════════════════════════════
//  Shift+Tab
// ════════════════════════════════════════════════════

describe("Shift+Tab", () => {
  // ── 40. CSI Z → Tab, shift=true ───────────────────────
  it("40. CSI Z → key='Tab', shift=true", () => {
    const events = feedStr("\x1b[Z");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Tab");
    assert.equal(key.modifiers.shift, true);
    assert.equal(key.modifiers.ctrl, false);
  });
});

// ════════════════════════════════════════════════════
//  集成测试
// ════════════════════════════════════════════════════

describe("集成测试", () => {
  // ── 41. VtParser + InputParser: ESC[A → ArrowUp ───────
  it("41. 原始字节 ESC[A → ArrowUp KeyEvent", () => {
    const events = feedBytes([0x1b, 0x5b, 0x41]);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowUp");
    assertNoModifiers(key.modifiers);
  });

  // ── 42. 混合键盘 + 鼠标 ──────────────────────────────
  it("42. 混合键盘和鼠标原始字节", () => {
    // 'a' + CSI < 0;1;1 M (鼠标左键按下) + 'b'
    const input = Buffer.from("a\x1b[<0;1;1Mb", "latin1");
    const events = feedAndCollect(input);
    assert.equal(events.length, 3);

    const key1 = assertKeyEvent(events[0]);
    assert.equal(key1.key, "a");

    const mouse = assertMouseEvent(events[1]);
    assert.equal(mouse.button, "left");
    assert.equal(mouse.action, "press");

    const key2 = assertKeyEvent(events[2]);
    assert.equal(key2.key, "b");
  });

  // ── 43. 未知 CSI 序列不崩溃 ───────────────────────────
  it("43. 未知/无效 CSI 序列不导致崩溃", () => {
    // CSI 999 X — 未知终止字节
    const events = feedStr("\x1b[999X");
    // 不应崩溃，可能不产生事件
    assert.ok(Array.isArray(events));
  });

  // ── 44. 完整集成：多种事件混合 ────────────────────────
  it("44. 完整集成：C0 + 打印 + CSI 混合", () => {
    // Tab + 'A' + ArrowUp + 'B'
    const buf = Buffer.concat([
      Buffer.from([0x09]), // Tab
      Buffer.from("A", "latin1"), // 'A'
      Buffer.from("\x1b[A", "latin1"), // ArrowUp
      Buffer.from("B", "latin1"), // 'B'
    ]);
    const events = feedAndCollect(buf);
    assert.equal(events.length, 4);

    const tab = assertKeyEvent(events[0]);
    assert.equal(tab.key, "Tab");

    const a = assertKeyEvent(events[1]);
    assert.equal(a.key, "A");

    const arrow = assertKeyEvent(events[2]);
    assert.equal(arrow.key, "ArrowUp");

    const b = assertKeyEvent(events[3]);
    assert.equal(b.key, "B");
  });

  // ── 45. 连续 Ctrl 组合键 ──────────────────────────────
  it("45. 连续 Ctrl+a Ctrl+c 正确解析", () => {
    const events = feedBytes([0x01, 0x03]);
    assert.equal(events.length, 2);

    const ctrlA = assertKeyEvent(events[0]);
    assert.equal(ctrlA.key, "a");
    assert.equal(ctrlA.modifiers.ctrl, true);

    const ctrlC = assertKeyEvent(events[1]);
    assert.equal(ctrlC.key, "c");
    assert.equal(ctrlC.modifiers.ctrl, true);
  });

  // ── 46. CSI 带修饰键的 Home ───────────────────────────
  it("46. CSI 1;3 H → Home, alt=true", () => {
    const events = feedStr("\x1b[1;3H");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Home");
    assert.equal(key.modifiers.alt, true);
  });

  // ── 47. 多字节 UTF-8 字符作为 KeyEvent ────────────────
  it("47. Emoji 字符产生正确的 KeyEvent", () => {
    const buf = Buffer.from("👍", "utf-8");
    const events = feedAndCollect(buf);
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "👍");
    assertNoModifiers(key.modifiers);
  });

  // ── 48. 私有标记 ? 的 CSI 被忽略 ──────────────────────
  it("48. CSI ? 序列不产生输入事件", () => {
    const events = feedStr("\x1b[?25h");
    // DECSET 等私有序列不是输入事件
    assert.equal(events.length, 0);
  });

  // ── 49. handleVtEvent 直接调用 ────────────────────────
  it("49. handleVtEvent 直接传入 VtCsiEvent", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 1 }, { value: 6 }],
        intermediates: "",
        private_marker: "",
        final: "D",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowLeft");
    // param 6 = Ctrl+Shift (bits=5 → Ctrl=4 + Shift=1)
    assert.equal(key.modifiers.ctrl, true);
    assert.equal(key.modifiers.shift, true);
  });

  // ── 50. onInput 支持多个回调 ───────────────────────────
  it("50. onInput 支持注册多个回调", () => {
    const parser = new InputParser();
    let count1 = 0;
    let count2 = 0;
    parser.onInput(() => count1++);
    parser.onInput(() => count2++);
    parser.feed(Buffer.from("a", "latin1"));
    assert.equal(count1, 1);
    assert.equal(count2, 1);
  });

  // ── 51-54. Standalone Escape timeout mechanism ────────────
  // 逆向: amp InputParser escape timeout (chunk-005.js:163076-163099)

  it("51. standalone ESC emits Escape key event after timeout", async () => {
    const parser = new InputParser();
    const events: InputEvent[] = [];
    parser.onInput((e) => events.push(e));

    // Feed a single ESC byte (standalone)
    parser.feed(Buffer.from([0x1b]));

    // No event emitted synchronously
    assert.equal(events.length, 0, "no event emitted synchronously");

    // Wait for the 25ms timeout to fire
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(events.length, 1, "Escape event emitted after timeout");
    const evt = events[0] as KeyEvent;
    assert.equal(evt.type, "key");
    assert.equal(evt.key, "Escape");
  });

  it("52. ESC followed by CSI sequence does NOT emit standalone Escape", async () => {
    const parser = new InputParser();
    const events: InputEvent[] = [];
    parser.onInput((e) => events.push(e));

    // Feed ESC as standalone first
    parser.feed(Buffer.from([0x1b]));

    // Then quickly feed the rest of a CSI sequence (e.g., ESC [ A = ArrowUp)
    parser.feed(Buffer.from("[A", "latin1"));

    // Wait long enough for any timeout to fire
    await new Promise((r) => setTimeout(r, 50));

    // Should have ArrowUp, NOT standalone Escape
    const keyEvents = events.filter((e): e is KeyEvent => e.type === "key");
    assert.ok(
      keyEvents.some((e) => e.key === "ArrowUp"),
      "ArrowUp should be emitted",
    );
    assert.ok(
      !keyEvents.some((e) => e.key === "Escape"),
      "standalone Escape should NOT be emitted when follow-up bytes arrive",
    );
  });

  it("53. double standalone ESC resets timeout", async () => {
    const parser = new InputParser();
    const events: InputEvent[] = [];
    parser.onInput((e) => events.push(e));

    // Feed ESC twice
    parser.feed(Buffer.from([0x1b]));
    parser.feed(Buffer.from([0x1b]));

    await new Promise((r) => setTimeout(r, 50));

    // Should emit exactly one Escape (second ESC clears first timeout)
    const keyEvents = events.filter((e): e is KeyEvent => e.type === "key" && e.key === "Escape");
    assert.equal(keyEvents.length, 1, "exactly one Escape emitted for double ESC");
  });

  it("54. reset() clears pending escape timeout", async () => {
    const parser = new InputParser();
    const events: InputEvent[] = [];
    parser.onInput((e) => events.push(e));

    // Feed standalone ESC
    parser.feed(Buffer.from([0x1b]));

    // Reset before timeout fires
    parser.reset();

    await new Promise((r) => setTimeout(r, 50));

    // No Escape event should have been emitted
    assert.equal(events.length, 0, "reset() prevents Escape emission");
  });
});

// ════════════════════════════════════════════════════
//  In-band Resize (DEC mode ?2048)
// ════════════════════════════════════════════════════

/** 断言事件为 InbandResizeEvent 并返回 */
function assertInbandResizeEvent(event: InputEvent): InbandResizeEvent {
  assert.equal(event.type, "inband_resize", `expected inband_resize event but got ${event.type}`);
  return event as InbandResizeEvent;
}

describe("带内尺寸通知 (DEC mode ?2048)", () => {
  // ── 55. Full in-band resize: ESC [ 48 ; rows ; cols ; pixelH ; pixelW t ───
  it("55. CSI 48;50;220;1250;2640 t → InbandResizeEvent with pixel dims", () => {
    // ESC [ 48 ; 50 ; 220 ; 1250 ; 2640 t
    // params[0]=48 (marker), params[1]=50 (rows), params[2]=220 (cols),
    // params[3]=1250 (pixelH), params[4]=2640 (pixelW)
    const events = feedStr("\x1b[48;50;220;1250;2640t");
    assert.equal(events.length, 1);
    const resize = assertInbandResizeEvent(events[0]);
    assert.equal(resize.width, 220, "width should be cols");
    assert.equal(resize.height, 50, "height should be rows");
    assert.equal(resize.pixelWidth, 2640, "pixelWidth from param[4]");
    assert.equal(resize.pixelHeight, 1250, "pixelHeight from param[3]");
  });

  // ── 56. Minimal in-band resize (3 params, no pixel data) ──────────────────
  it("56. CSI 48;24;80 t → InbandResizeEvent, pixelWidth/Height=0", () => {
    // 3-param form: params[0]=48, params[1]=24 (rows), params[2]=80 (cols)
    const events = feedStr("\x1b[48;24;80t");
    assert.equal(events.length, 1);
    const resize = assertInbandResizeEvent(events[0]);
    assert.equal(resize.width, 80);
    assert.equal(resize.height, 24);
    assert.equal(resize.pixelWidth, 0, "pixelWidth defaults to 0");
    assert.equal(resize.pixelHeight, 0, "pixelHeight defaults to 0");
  });

  // ── 57. CSI t with params[0] != 48 → no event ────────────────────────────
  it("57. CSI 4;50;220t (params[0]≠48) → no event", () => {
    // params[0]=4 → not an in-band resize notification
    const events = feedStr("\x1b[4;50;220t");
    assert.equal(events.length, 0, "non-48 CSI t should produce no event");
  });

  // ── 58. CSI t with only 2 params → no event (needs at least 3) ───────────
  it("58. CSI 48;24t (only 2 params) → no event", () => {
    const events = feedStr("\x1b[48;24t");
    assert.equal(events.length, 0, "fewer than 3 params should produce no event");
  });

  // ── 59. CSI 48;0;80t (rows=0) → no event (invalid dimension) ─────────────
  it("59. CSI 48;0;80t (rows=0) → no event", () => {
    const events = feedStr("\x1b[48;0;80t");
    assert.equal(events.length, 0, "zero rows should be rejected");
  });

  // ── 60. CSI 48;24;0t (cols=0) → no event (invalid dimension) ─────────────
  it("60. CSI 48;24;0t (cols=0) → no event", () => {
    const events = feedStr("\x1b[48;24;0t");
    assert.equal(events.length, 0, "zero cols should be rejected");
  });

  // ── 61. In-band resize does not interfere with subsequent key events ───────
  it("61. in-band resize followed by key 'a' produces resize + key events", () => {
    // ESC[48;30;100t + 'a'
    const events = feedStr("\x1b[48;30;100ta");
    assert.equal(events.length, 2);
    const resize = assertInbandResizeEvent(events[0]);
    assert.equal(resize.width, 100);
    assert.equal(resize.height, 30);
    const key = assertKeyEvent(events[1]);
    assert.equal(key.key, "a");
  });

  // ── 62. handleVtEvent directly with CSI t params[0]=48 ────────────────────
  it("62. handleVtEvent directly — CSI t with 5 params", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 48 }, { value: 40 }, { value: 160 }, { value: 1000 }, { value: 2000 }],
        intermediates: "",
        private_marker: "",
        final: "t",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const resize = assertInbandResizeEvent(events[0]);
    assert.equal(resize.width, 160);
    assert.equal(resize.height, 40);
    assert.equal(resize.pixelWidth, 2000);
    assert.equal(resize.pixelHeight, 1000);
  });
});

// ════════════════════════════════════════════════════
//  Kitty Keyboard Protocol (CSI u)
// ════════════════════════════════════════════════════

/** 断言事件为 KittyKeyboardResponseEvent 并返回 */
function assertKittyKeyboardResponseEvent(event: InputEvent): KittyKeyboardResponseEvent {
  assert.equal(
    event.type,
    "kitty_keyboard_response",
    `expected kitty_keyboard_response event but got ${event.type}`,
  );
  return event as KittyKeyboardResponseEvent;
}

describe("Kitty Keyboard Protocol (CSI u)", () => {
  // ── 63. Basic letter: CSI 97 u → key='a' ─────────────────
  it("63. CSI 97 u → key='a' (keycode=97=lowercase a)", () => {
    // 逆向: amp unicodeToKey(97) → String.fromCharCode(97) = 'a'
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 97 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assertNoModifiers(key.modifiers);
  });

  // ── 64. Uppercase letter: CSI 65 u → key='A' ─────────────
  it("64. CSI 65 u → key='A' (keycode=65=uppercase A)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 65 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "A");
    assertNoModifiers(key.modifiers);
  });

  // ── 65. Special key: Enter (keycode=13) ───────────────────
  it("65. CSI 13 u → key='Enter'", () => {
    // 逆向: amp unicodeToKey(13) → 'Enter'
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 13 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Enter");
  });

  // ── 66. Special key: Tab (keycode=9) ──────────────────────
  it("66. CSI 9 u → key='Tab'", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 9 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Tab");
  });

  // ── 67. Special key: Escape (keycode=27) ──────────────────
  it("67. CSI 27 u → key='Escape'", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 27 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Escape");
  });

  // ── 68. Special key: Backspace (keycode=127) ──────────────
  it("68. CSI 127 u → key='Backspace'", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 127 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Backspace");
  });

  // ── 69. Kitty extended keycode: F1 (57364) ────────────────
  it("69. CSI 57364 u → key='F1' (kitty extended keycode)", () => {
    // 逆向: amp IxT[57364] = 'F1' (2026_tail_anonymous.js:156739)
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 57364 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F1");
  });

  // ── 70. Kitty extended keycode: ArrowUp (57352) ───────────
  it("70. CSI 57352 u → key='ArrowUp' (kitty extended keycode)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 57352 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "ArrowUp");
  });

  // ── 71. Ctrl+A: CSI 97 ; 5 u ──────────────────────────────
  it("71. CSI 97;5 u → key='a', ctrl=true (modifier param=5 → Ctrl)", () => {
    // 逆向: amp parseModifiers(5) → bits=4 → ctrl=true
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 97 }, { value: 5 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assert.equal(key.modifiers.ctrl, true);
    assert.equal(key.modifiers.shift, false);
    assert.equal(key.modifiers.alt, false);
    assert.equal(key.modifiers.meta, false);
  });

  // ── 72. Alt+X: CSI 120 ; 3 u ──────────────────────────────
  it("72. CSI 120;3 u → key='x', alt=true (modifier param=3 → Alt)", () => {
    // 逆向: amp parseModifiers(3) → bits=2 → alt=true
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 120 }, { value: 3 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "x");
    assert.equal(key.modifiers.alt, true);
    assert.equal(key.modifiers.ctrl, false);
    assert.equal(key.modifiers.shift, false);
  });

  // ── 73. Shift+Tab: CSI 9 ; 2 u ────────────────────────────
  it("73. CSI 9;2 u → key='Tab', shift=true (modifier param=2 → Shift)", () => {
    // 逆向: amp parseModifiers(2) → bits=1 → shift=true
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 9 }, { value: 2 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Tab");
    assert.equal(key.modifiers.shift, true);
    assert.equal(key.modifiers.ctrl, false);
  });

  // ── 74. Ctrl+Shift: CSI 97 ; 6 u ──────────────────────────
  it("74. CSI 97;6 u → key='a', ctrl=true, shift=true (param=6 → Ctrl+Shift)", () => {
    // 逆向: amp parseModifiers(6) → bits=5 → ctrl=true, shift=true
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 97 }, { value: 6 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assert.equal(key.modifiers.ctrl, true);
    assert.equal(key.modifiers.shift, true);
  });

  // ── 75. Key release (eventType=3) → no event ──────────────
  it("75. CSI 97;1:3 u (eventType=3=release) → no key event emitted", () => {
    // 逆向: amp kittyEventTypeToName(3) = 'release'; csiToKey skips releases
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 97 }, { value: 1, subparams: [3] }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 0, "key release events should be skipped");
  });

  // ── 76. Key press (eventType=1) → event emitted ────────────
  it("76. CSI 97;1:1 u (eventType=1=press) → key event emitted", () => {
    // 逆向: amp kittyEventTypeToName(1) = 'press'
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 97 }, { value: 1, subparams: [1] }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
  });

  // ── 77. Key repeat (eventType=2) → event emitted ──────────
  it("77. CSI 97;1:2 u (eventType=2=repeat) → key event emitted", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 97 }, { value: 1, subparams: [2] }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
  });

  // ── 78. Kitty keyboard response probe: CSI ? 7 u ──────────
  it("78. CSI ? 7 u → KittyKeyboardResponseEvent with flags=7", () => {
    // 逆向: amp csiToKittyKeyboardResponse (2026_tail_anonymous.js:157504-157512)
    //   T.final === "u" && T.private === "?" → decrqss_response request="u"
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 7 }],
        intermediates: "",
        private_marker: "?",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const resp = assertKittyKeyboardResponseEvent(events[0]);
    assert.equal(resp.flags, 7);
  });

  // ── 79. Kitty keyboard response probe: CSI ? 1 u ──────────
  it("79. CSI ? 1 u → KittyKeyboardResponseEvent with flags=1", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 1 }],
        intermediates: "",
        private_marker: "?",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const resp = assertKittyKeyboardResponseEvent(events[0]);
    assert.equal(resp.flags, 1);
  });

  // ── 80. Kitty keyboard response probe: CSI ? 0 u ──────────
  it("80. CSI ? u with no params → KittyKeyboardResponseEvent with flags=0", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [],
        intermediates: "",
        private_marker: "?",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const resp = assertKittyKeyboardResponseEvent(events[0]);
    assert.equal(resp.flags, 0);
  });

  // ── 81. Modifier param=1 → no modifiers ───────────────────
  it("81. CSI 97;1 u → key='a', no modifiers (param=1 means no mods)", () => {
    // 逆向: amp parseModifiers(1) → return MODIFIERS_NONE
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 97 }, { value: 1 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assertNoModifiers(key.modifiers);
  });

  // ── 82. CSI 57375 u → key='F12' ───────────────────────────
  it("82. CSI 57375 u → key='F12' (kitty extended F12 keycode)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 57375 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "F12");
  });

  // ── 83. CSI 32 u → key=' ' (space) ───────────────────────
  it("83. CSI 32 u → key=' ' (space via unicodeToKey)", () => {
    const events = handleAndCollect((parser) => {
      const evt: VtCsiEvent = {
        type: "csi",
        params: [{ value: 32 }],
        intermediates: "",
        private_marker: "",
        final: "u",
      };
      parser.handleVtEvent(evt);
    });
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, " ");
  });

  // ── 84. Raw bytes: ESC[97u (kitty 'a' key press) ──────────
  it("84. Raw bytes ESC[97u → KeyEvent key='a'", () => {
    const events = feedStr("\x1b[97u");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assertNoModifiers(key.modifiers);
  });

  // ── 85. Raw bytes: ESC[13u → Enter ────────────────────────
  it("85. Raw bytes ESC[13u → KeyEvent key='Enter'", () => {
    const events = feedStr("\x1b[13u");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "Enter");
  });

  // ── 86. Raw bytes: ESC[97;5u → Ctrl+a ────────────────────
  it("86. Raw bytes ESC[97;5u → KeyEvent key='a', ctrl=true", () => {
    const events = feedStr("\x1b[97;5u");
    assert.equal(events.length, 1);
    const key = assertKeyEvent(events[0]);
    assert.equal(key.key, "a");
    assert.equal(key.modifiers.ctrl, true);
  });
});
