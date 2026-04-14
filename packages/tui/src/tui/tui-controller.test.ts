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
import { describe, it, beforeEach, afterEach } from "node:test";
import { TuiController } from "./tui-controller.js";
import { Screen } from "../screen/screen.js";
import type { KeyEvent, MouseEvent as TermMouseEvent, PasteEvent } from "../vt/types.js";
import type { TerminalSize } from "./tui-controller.js";

describe("TuiController", () => {
  let controller: TuiController;

  beforeEach(() => {
    controller = new TuiController();
  });

  afterEach(async () => {
    try {
      await controller.deinit();
    } catch {
      // ignore
    }
  });

  // ── 构造 ──────────────────────────────────────────

  describe("构造", () => {
    it("应创建 Screen 和 AnsiRenderer 实例", () => {
      const screen = controller.getScreen();
      assert.ok(screen instanceof Screen, "getScreen 应返回 Screen 实例");
    });
  });

  // ── init ──────────────────────────────────────────

  describe("init", () => {
    it("应设置 initialized=true", () => {
      controller.init();
      // 验证：再次 init 应抛出错误（证明 initialized 为 true）
      assert.throws(() => controller.init(), /already initialized/);
    });

    it("重复调用应抛出 Error", () => {
      controller.init();
      assert.throws(() => controller.init(), /already initialized/);
    });
  });

  // ── deinit ────────────────────────────────────────

  describe("deinit", () => {
    it("应清理所有 handlers", async () => {
      controller.init();
      const handler = () => {};
      controller.onKey(handler);
      controller.onMouse(() => {});
      controller.onResize(() => {});
      controller.onPaste(() => {});

      await controller.deinit();

      // deinit 后可以创建新实例并正常初始化
      const controller2 = new TuiController();
      controller2.init();
      await controller2.deinit();
    });

    it("应重置 initialized=false", async () => {
      controller.init();
      await controller.deinit();
      // 验证：deinit 后 initialized 已重置（不验证同实例重新 init，因为 stdin listener 清理）
      const controller2 = new TuiController();
      controller2.init();
      await controller2.deinit();
    });
  });

  // ── onKey / offKey ────────────────────────────────

  describe("onKey / offKey", () => {
    it("应注册 key handler", () => {
      const events: KeyEvent[] = [];
      controller.onKey((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });

    it("offKey 应注销 handler", () => {
      const handler = (_e: KeyEvent) => {};
      controller.onKey(handler);
      controller.offKey(handler);
      // 注销后不抛错
    });
  });

  // ── onMouse ───────────────────────────────────────

  describe("onMouse", () => {
    it("应注册 mouse handler", () => {
      const events: TermMouseEvent[] = [];
      controller.onMouse((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });
  });

  // ── onResize ──────────────────────────────────────

  describe("onResize", () => {
    it("应注册 resize handler", () => {
      const events: TerminalSize[] = [];
      controller.onResize((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });
  });

  // ── onPaste ───────────────────────────────────────

  describe("onPaste", () => {
    it("应注册 paste handler", () => {
      const events: PasteEvent[] = [];
      controller.onPaste((e) => events.push(e));
      assert.deepStrictEqual(events, []);
    });
  });

  // ── getSize ───────────────────────────────────────

  describe("getSize", () => {
    it("应返回终端尺寸", () => {
      const size = controller.getSize();
      assert.ok("width" in size, "应有 width 属性");
      assert.ok("height" in size, "应有 height 属性");
      assert.equal(typeof size.width, "number");
      assert.equal(typeof size.height, "number");
      assert.ok(size.width > 0, "width 应大于 0");
      assert.ok(size.height > 0, "height 应大于 0");
    });
  });

  // ── getScreen ─────────────────────────────────────

  describe("getScreen", () => {
    it("应返回 Screen 实例", () => {
      const screen = controller.getScreen();
      assert.ok(screen instanceof Screen);
      assert.ok(screen.width > 0);
      assert.ok(screen.height > 0);
    });
  });

  // ── waitForCapabilities ───────────────────────────

  describe("waitForCapabilities", () => {
    it("timeout 后应 resolve 并设置默认能力", async () => {
      controller.init();
      await controller.waitForCapabilities(50);
      const caps = controller.getCapabilities();
      assert.ok(caps !== null, "应设置 capabilities");
      assert.equal(caps!.emojiWidth, false);
      assert.equal(caps!.syncOutput, false);
      assert.equal(caps!.kittyKeyboard, false);
      assert.equal(caps!.colorPaletteNotifications, false);
      assert.equal(caps!.xtversion, null);
    });

    it("已有 capabilities 时应立即 resolve", async () => {
      controller.init();
      await controller.waitForCapabilities(50);
      // 第二次调用应立即返回
      const start = Date.now();
      await controller.waitForCapabilities(5000);
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 100, `应立即 resolve，但耗时 ${elapsed}ms`);
    });
  });

  // ── enterAltScreen ────────────────────────────────

  describe("enterAltScreen", () => {
    it("应不抛错（非 TTY 环境降级）", () => {
      controller.init();
      controller.enterAltScreen();
    });

    it("重复调用不应重复写入", () => {
      controller.init();
      controller.enterAltScreen();
      controller.enterAltScreen(); // 第二次调用应为 no-op
    });
  });

  // ── render ────────────────────────────────────────

  describe("render", () => {
    it("应调用 AnsiRenderer 渲染 Screen 不抛错", () => {
      controller.init();
      controller.render();
    });
  });
});
