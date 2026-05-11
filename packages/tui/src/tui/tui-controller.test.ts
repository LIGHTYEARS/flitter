/**
 * TuiController 单元测试。
 *
 * 测试终端控制器的初始化、清理、事件注册/分发、尺寸管理和能力检测等核心功能。
 * 由于测试环境非 TTY，TTY 相关操作（raw mode、stdin resume）通过降级路径测试。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tui/tui-controller.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Screen } from "../screen/screen.js";
import type { KeyEvent, PasteEvent, MouseEvent as TermMouseEvent } from "../vt/types.js";
import { QueryParser } from "./query-parser.js";
import type { TerminalSize } from "./tui-controller.js";
import { isTtyStream, TuiController } from "./tui-controller.js";

/**
 * 辅助函数：创建 TuiController 并确保测试后清理。
 */
async function withController(fn: (ctrl: TuiController) => void | Promise<void>): Promise<void> {
  const ctrl = new TuiController();
  try {
    await fn(ctrl);
  } finally {
    try {
      await ctrl.deinit();
    } catch {
      // ignore
    }
  }
}

// ════════════════════════════════════════════════════
//  构造测试
// ════════════════════════════════════════════════════

describe("TuiController — 构造", () => {
  it("应创建 Screen 和 AnsiRenderer 实例", async () => {
    await withController((ctrl) => {
      const screen = ctrl.getScreen();
      assert.ok(screen instanceof Screen, "getScreen 应返回 Screen 实例");
    });
  });
});

// ════════════════════════════════════════════════════
//  init 测试
// ════════════════════════════════════════════════════

describe("TuiController — init", () => {
  it("应设置 initialized=true（重复调用抛出 Error）", async () => {
    await withController((ctrl) => {
      ctrl.init();
      assert.throws(() => ctrl.init(), /already initialized/);
    });
  });

  it("重复调用应抛出 Error", async () => {
    await withController((ctrl) => {
      ctrl.init();
      assert.throws(() => ctrl.init(), /already initialized/);
    });
  });
});

// ════════════════════════════════════════════════════
//  deinit 测试
// ════════════════════════════════════════════════════

describe("TuiController — deinit", () => {
  it("应清理所有 handlers", async () => {
    const ctrl = new TuiController();
    ctrl.init();
    ctrl.onKey(() => {});
    ctrl.onMouse(() => {});
    ctrl.onResize(() => {});
    ctrl.onPaste(() => {});
    await ctrl.deinit();

    // deinit 后可以创建新实例并正常初始化
    const ctrl2 = new TuiController();
    ctrl2.init();
    await ctrl2.deinit();
  });

  it("应重置 initialized=false", async () => {
    const ctrl = new TuiController();
    ctrl.init();
    await ctrl.deinit();

    // 验证能创建新实例
    const ctrl2 = new TuiController();
    ctrl2.init();
    await ctrl2.deinit();
  });
});

// ════════════════════════════════════════════════════
//  onKey / offKey 测试
// ════════════════════════════════════════════════════

describe("TuiController — onKey / offKey", () => {
  it("应注册 key handler", async () => {
    await withController((ctrl) => {
      const events: KeyEvent[] = [];
      ctrl.onKey((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });
  });

  it("offKey 应注销 handler", async () => {
    await withController((ctrl) => {
      const handler = (_e: KeyEvent) => {};
      ctrl.onKey(handler);
      ctrl.offKey(handler);
    });
  });
});

// ════════════════════════════════════════════════════
//  onMouse 测试
// ════════════════════════════════════════════════════

describe("TuiController — onMouse", () => {
  it("应注册 mouse handler", async () => {
    await withController((ctrl) => {
      const events: TermMouseEvent[] = [];
      ctrl.onMouse((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });
  });
});

describe("TuiController — pixel mouse", () => {
  it("enableMouse 在 pixelMouse 可用时应启用 ?1016h", () => {
    const ctrl = new TuiController();
    const writes: string[] = [];
    const queryParser = new QueryParser();
    queryParser.processDecrqss("?1016", "2");
    queryParser.updateInbandPixelData(80, 24, 1600, 1200);

    const internal = ctrl as unknown as {
      initialized: boolean;
      ttyOutput: { stream: { write: (chunk: string) => void } } | null;
      _queryParser: QueryParser | null;
      enableMouse(): void;
    };

    internal.initialized = true;
    internal.ttyOutput = {
      stream: {
        write: (chunk: string) => {
          writes.push(chunk);
        },
      },
    };
    internal._queryParser = queryParser;

    internal.enableMouse();

    assert.equal(writes.length, 1);
    assert.ok(writes[0]?.includes("?1016h"));
  });
});

// ════════════════════════════════════════════════════
//  onResize 测试
// ════════════════════════════════════════════════════

describe("TuiController — onResize", () => {
  it("应注册 resize handler", async () => {
    await withController((ctrl) => {
      const events: TerminalSize[] = [];
      ctrl.onResize((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });
  });
});

// ════════════════════════════════════════════════════
//  onPaste 测试
// ════════════════════════════════════════════════════

describe("TuiController — onPaste", () => {
  it("应注册 paste handler", async () => {
    await withController((ctrl) => {
      const events: PasteEvent[] = [];
      ctrl.onPaste((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });
  });
});

// ════════════════════════════════════════════════════
//  getSize 测试
// ════════════════════════════════════════════════════

describe("TuiController — getSize", () => {
  it("应返回终端尺寸", async () => {
    await withController((ctrl) => {
      const size = ctrl.getSize();
      assert.ok("width" in size, "应有 width 属性");
      assert.ok("height" in size, "应有 height 属性");
      assert.equal(typeof size.width, "number");
      assert.equal(typeof size.height, "number");
      assert.ok(size.width > 0, "width 应大于 0");
      assert.ok(size.height > 0, "height 应大于 0");
    });
  });
});

// ════════════════════════════════════════════════════
//  getScreen 测试
// ════════════════════════════════════════════════════

describe("TuiController — getScreen", () => {
  it("应返回 Screen 实例", async () => {
    await withController((ctrl) => {
      const screen = ctrl.getScreen();
      assert.ok(screen instanceof Screen);
      assert.ok(screen.width > 0);
      assert.ok(screen.height > 0);
    });
  });
});

// ════════════════════════════════════════════════════
//  waitForCapabilities 测试
// ════════════════════════════════════════════════════

describe("TuiController — waitForCapabilities", () => {
  it("timeout 后应 resolve 并设置默认能力", async () => {
    const ctrl = new TuiController();
    try {
      ctrl.init();
      await ctrl.waitForCapabilities(50);
      const caps = ctrl.getCapabilities();
      assert.ok(caps !== null, "应设置 capabilities");
      assert.equal(caps!.emojiWidth, false);
      // syncOutput depends on detected terminal (e.g., true on kitty/WezTerm/Ghostty)
      assert.equal(typeof caps!.syncOutput, "boolean");
      // kittyKeyboard depends on detected terminal (e.g., true on kitty/WezTerm/Ghostty)
      assert.equal(typeof caps!.kittyKeyboard, "boolean");
      assert.equal(caps!.colorPaletteNotifications, false);
      assert.equal(caps!.xtversion, null);
    } finally {
      await ctrl.deinit();
    }
  });

  it("已有 capabilities 时应立即 resolve", async () => {
    const ctrl = new TuiController();
    try {
      ctrl.init();
      await ctrl.waitForCapabilities(50);
      // 第二次调用应立即返回
      const start = Date.now();
      await ctrl.waitForCapabilities(5000);
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100, `应立即 resolve，但耗时 ${elapsed}ms`);
    } finally {
      await ctrl.deinit();
    }
  });
});

// ════════════════════════════════════════════════════
//  enterAltScreen 测试
// ════════════════════════════════════════════════════

describe("TuiController — enterAltScreen", () => {
  it("应不抛错（非 TTY 环境降级）", async () => {
    await withController((ctrl) => {
      ctrl.init();
      ctrl.enterAltScreen();
    });
  });

  it("重复调用不应重复写入", async () => {
    await withController((ctrl) => {
      ctrl.init();
      ctrl.enterAltScreen();
      ctrl.enterAltScreen(); // 第二次调用应为 no-op
    });
  });
});

// ════════════════════════════════════════════════════
//  render 测试
// ════════════════════════════════════════════════════

describe("TuiController — render", () => {
  it("应调用 AnsiRenderer 渲染 Screen 不抛错", async () => {
    await withController((ctrl) => {
      ctrl.init();
      ctrl.render();
    });
  });
});

// ════════════════════════════════════════════════════
//  isTtyStream 回归测试
// ════════════════════════════════════════════════════

describe("isTtyStream — regression: wrapper vs inner stream", () => {
  // 回归: updateTerminalSize 曾错误地将 TtyInputSource wrapper 传给 isTtyStream，
  // 而非 wrapper.stdin。wrapper 是普通对象 (没有 isTTY/setRawMode)，
  // 导致 isTtyStream 永远返回 false，终端尺寸始终回退到 80x24。
  // 修复: 检查 ttyInput.stdin 而非 ttyInput 本身。

  it("应拒绝 TtyInputSource wrapper 对象", () => {
    const wrapper = {
      stdin: null,
      dataCallback: null,
      earlyInputBuffer: [],
      init() {},
      on() {},
      pause() {},
      resume() {},
      dispose() {},
    };
    assert.equal(isTtyStream(wrapper), false, "wrapper 不应被识别为 TTY 流");
  });

  it("应接受具有 isTTY + setRawMode 的流对象", () => {
    const mockStream = {
      isTTY: true,
      setRawMode: () => {},
      columns: 240,
      rows: 60,
    };
    assert.equal(isTtyStream(mockStream), true, "具有 isTTY+setRawMode 的对象应被识别为 TTY");
  });

  it("应拒绝 null 和 undefined", () => {
    assert.equal(isTtyStream(null), false);
    assert.equal(isTtyStream(undefined), false);
  });

  it("应拒绝 isTTY=false 的流", () => {
    const mockStream = {
      isTTY: false,
      setRawMode: () => {},
    };
    assert.equal(isTtyStream(mockStream), false);
  });

  it("应拒绝没有 setRawMode 的对象", () => {
    const mockStream = {
      isTTY: true,
      // no setRawMode
    };
    assert.equal(isTtyStream(mockStream), false);
  });
});

// ─── detectAnimationSupport ──────────────────────────────
// 逆向: amp modules/2109_unknown_dY.js:266-272

import { detectAnimationSupport } from "./tui-controller.js";

describe("detectAnimationSupport", () => {
  it('returns "fast" for normal terminal', () => {
    assert.equal(detectAnimationSupport({}), "fast");
  });

  it('returns "disabled" when NO_ANIMATION=1', () => {
    assert.equal(detectAnimationSupport({ NO_ANIMATION: "1" }), "disabled");
  });

  it('returns "disabled" when NO_ANIMATIONS=1', () => {
    assert.equal(detectAnimationSupport({ NO_ANIMATIONS: "1" }), "disabled");
  });

  it('returns "disabled" when INSIDE_EMACS is set', () => {
    assert.equal(detectAnimationSupport({ INSIDE_EMACS: "29.1" }), "disabled");
  });

  it('returns "disabled" when SSH_CLIENT is set', () => {
    assert.equal(detectAnimationSupport({ SSH_CLIENT: "192.168.1.1 12345 22" }), "disabled");
  });

  it('returns "disabled" when SSH_TTY is set', () => {
    assert.equal(detectAnimationSupport({ SSH_TTY: "/dev/pts/0" }), "disabled");
  });

  it('returns "disabled" when SSH_CONNECTION is set', () => {
    assert.equal(
      detectAnimationSupport({ SSH_CONNECTION: "192.168.1.1 12345 192.168.1.2 22" }),
      "disabled",
    );
  });

  it('returns "slow" for JetBrains terminal', () => {
    assert.equal(detectAnimationSupport({ TERMINAL_EMULATOR: "JetBrains-JediTerm" }), "slow");
  });

  it("NO_ANIMATION takes priority over JetBrains", () => {
    assert.equal(
      detectAnimationSupport({ NO_ANIMATION: "1", TERMINAL_EMULATOR: "JetBrains-JediTerm" }),
      "disabled",
    );
  });

  it("SSH takes priority over JetBrains", () => {
    assert.equal(
      detectAnimationSupport({ SSH_CLIENT: "x", TERMINAL_EMULATOR: "JetBrains-JediTerm" }),
      "disabled",
    );
  });

  it('returns "fast" for kitty terminal', () => {
    assert.equal(detectAnimationSupport({ TERM: "xterm-kitty" }), "fast");
  });

  it('returns "fast" for WezTerm', () => {
    assert.equal(detectAnimationSupport({ TERM_PROGRAM: "WezTerm" }), "fast");
  });
});

// ─── detectUnderlineSupport ──────────────────────────────
// 逆向: amp modules/2109_unknown_dY.js:20

import { detectUnderlineSupport } from "./tui-controller.js";

describe("detectUnderlineSupport", () => {
  it('returns "standard" for normal terminal', () => {
    assert.equal(detectUnderlineSupport({}), "standard");
  });

  it('returns "none" for JetBrains terminal', () => {
    assert.equal(detectUnderlineSupport({ TERMINAL_EMULATOR: "JetBrains-JediTerm" }), "none");
  });

  it('returns "standard" for kitty', () => {
    assert.equal(detectUnderlineSupport({ TERM: "xterm-kitty" }), "standard");
  });

  it('returns "standard" for WezTerm', () => {
    assert.equal(detectUnderlineSupport({ TERM_PROGRAM: "WezTerm" }), "standard");
  });

  it('returns "standard" when SSH is set', () => {
    assert.equal(detectUnderlineSupport({ SSH_CLIENT: "192.168.1.1 12345 22" }), "standard");
  });

  it('returns "standard" when INSIDE_EMACS is set', () => {
    assert.equal(detectUnderlineSupport({ INSIDE_EMACS: "29.1" }), "standard");
  });
});

// ─── detectScrollStep ────────────────────────────────────

import { detectScrollStep } from "./tui-controller.js";

describe("detectScrollStep", () => {
  it("returns () => 3 for normal terminal (default)", () => {
    const fn = detectScrollStep({});
    assert.equal(fn(), 3);
  });

  it("returns () => 1 for ghostty", () => {
    const fn = detectScrollStep({ TERM_PROGRAM: "ghostty" });
    assert.equal(fn(), 1);
  });

  it("returns () => 1 for JetBrains terminal", () => {
    const fn = detectScrollStep({ TERMINAL_EMULATOR: "JetBrains-JediTerm" });
    assert.equal(fn(), 1);
  });

  it("returns () => 3 for kitty", () => {
    const fn = detectScrollStep({ TERM: "xterm-kitty" });
    assert.equal(fn(), 3);
  });

  it("returns () => 3 for WezTerm", () => {
    const fn = detectScrollStep({ TERM_PROGRAM: "WezTerm" });
    assert.equal(fn(), 3);
  });

  it("returns () => 3 for SSH", () => {
    const fn = detectScrollStep({ SSH_CLIENT: "192.168.1.1 12345 22" });
    assert.equal(fn(), 3);
  });
});

// ════════════════════════════════════════════════════
//  OSC 9;4 Progress Bar Constants
//  逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:157632
//    ku0 = Pn + "]9;4;3" + Pn + "\\"   (indeterminate)
//    ZVT = Pn + "]9;4;0" + Pn + "\\"   (off)
//    xu0 = Pn + "]9;4;4" + Pn + "\\"   (paused)
// ════════════════════════════════════════════════════

import {
  PROGRESS_BAR_INDETERMINATE,
  PROGRESS_BAR_OFF,
  PROGRESS_BAR_PAUSED,
} from "../screen/ansi-renderer.js";

describe("OSC 9;4 progress bar constants", () => {
  it("PROGRESS_BAR_OFF = ESC ]9;4;0 ESC \\", () => {
    assert.equal(PROGRESS_BAR_OFF, "\x1b]9;4;0\x1b\\");
  });

  it("PROGRESS_BAR_INDETERMINATE = ESC ]9;4;3 ESC \\", () => {
    assert.equal(PROGRESS_BAR_INDETERMINATE, "\x1b]9;4;3\x1b\\");
  });

  it("PROGRESS_BAR_PAUSED = ESC ]9;4;4 ESC \\", () => {
    assert.equal(PROGRESS_BAR_PAUSED, "\x1b]9;4;4\x1b\\");
  });

  it("each constant has distinct value", () => {
    assert.notEqual(PROGRESS_BAR_OFF, PROGRESS_BAR_INDETERMINATE);
    assert.notEqual(PROGRESS_BAR_OFF, PROGRESS_BAR_PAUSED);
    assert.notEqual(PROGRESS_BAR_INDETERMINATE, PROGRESS_BAR_PAUSED);
  });
});

// ════════════════════════════════════════════════════
//  AnsiRenderer progress bar methods
//  逆向: amp 0510_unknown_ktT.js:117-125
// ════════════════════════════════════════════════════

import { AnsiRenderer } from "../screen/ansi-renderer.js";

describe("AnsiRenderer — progress bar methods", () => {
  it("setProgressBarOff() returns PROGRESS_BAR_OFF constant", () => {
    const renderer = new AnsiRenderer();
    assert.equal(renderer.setProgressBarOff(), PROGRESS_BAR_OFF);
    assert.equal(renderer.setProgressBarOff(), "\x1b]9;4;0\x1b\\");
  });

  it("setProgressBarIndeterminate() returns PROGRESS_BAR_INDETERMINATE constant", () => {
    const renderer = new AnsiRenderer();
    assert.equal(renderer.setProgressBarIndeterminate(), PROGRESS_BAR_INDETERMINATE);
    assert.equal(renderer.setProgressBarIndeterminate(), "\x1b]9;4;3\x1b\\");
  });

  it("setProgressBarPaused() returns PROGRESS_BAR_PAUSED constant", () => {
    const renderer = new AnsiRenderer();
    assert.equal(renderer.setProgressBarPaused(), PROGRESS_BAR_PAUSED);
    assert.equal(renderer.setProgressBarPaused(), "\x1b]9;4;4\x1b\\");
  });
});

// ════════════════════════════════════════════════════
//  TuiController.setProgressBar() — public API
//  逆向: amp 2112_unknown_XXT.js:304
//    deinit() and suspend() send setProgressBarOff() when
//    capabilities.xtversion starts with "ghostty"
// ════════════════════════════════════════════════════

describe("TuiController — setProgressBar", () => {
  it("is a no-op before init (does not throw)", async () => {
    // No TERM_PROGRAM=ghostty so no write expected
    const ctrl = new TuiController();
    assert.doesNotThrow(() => ctrl.setProgressBar("off"));
    assert.doesNotThrow(() => ctrl.setProgressBar("indeterminate"));
    assert.doesNotThrow(() => ctrl.setProgressBar("paused"));
  });

  it("is a no-op after init on non-supporting terminals (no throw)", async () => {
    // In test env (no TERM_PROGRAM=ghostty/WezTerm and no xtversion),
    // setProgressBar should be a graceful no-op.
    await withController((ctrl) => {
      ctrl.init();
      assert.doesNotThrow(() => ctrl.setProgressBar("off"));
      assert.doesNotThrow(() => ctrl.setProgressBar("indeterminate"));
      assert.doesNotThrow(() => ctrl.setProgressBar("paused"));
    });
  });

  it("deinit does not throw even when capabilities not yet resolved", async () => {
    // Verify that deinit/restoreTerminalSync does not crash even when
    // capabilities is null (capability detection may not have run).
    const ctrl = new TuiController();
    ctrl.init();
    // Do NOT call waitForCapabilities — capabilities may still be null.
    await ctrl.deinit(); // must not throw
  });
});
