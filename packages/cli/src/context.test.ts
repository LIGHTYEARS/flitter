/**
 * context.ts 单元测试
 *
 * 覆盖 resolveCliContext: 模式判定逻辑 (TTY/execute/headless)、
 * streamJson 联动、verbose 传递、userMessage 拼接
 *
 * 逆向参考: S8() in cli-entrypoint.js:913-990
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Command } from "commander";
import { resolveCliContext } from "./context";
import { createProgram } from "./program";

/**
 * 辅助函数: 创建已解析的 program 实例
 *
 * @param args - 用户参数 (不含 node/script 前缀)
 */
function parsedProgram(args: string[] = []): Command {
  const program = createProgram("1.0.0");
  program.parse(args, { from: "user" });
  return program;
}

describe("resolveCliContext", () => {
  // 保存原始 isTTY 值以便恢复
  let origStdoutIsTTY: boolean | undefined;
  let origStderrIsTTY: boolean | undefined;

  beforeEach(() => {
    origStdoutIsTTY = process.stdout.isTTY;
    origStderrIsTTY = process.stderr.isTTY;
  });

  afterEach(() => {
    // 恢复 isTTY
    Object.defineProperty(process.stdout, "isTTY", {
      value: origStdoutIsTTY,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stderr, "isTTY", {
      value: origStderrIsTTY,
      writable: true,
      configurable: true,
    });
  });

  // ─── 模式判定 ─────────────────────────────────────────────

  describe("模式判定", () => {
    it("TTY 环境默认为 interactive 模式 (executeMode=false)", () => {
      // 模拟 TTY
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram([]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.executeMode, false);
      assert.equal(ctx.isTTY, true);
    });

    it("--execute 强制 executeMode=true", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram(["--execute"]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.executeMode, true);
    });

    it("非 TTY 环境自动进入 executeMode", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram([]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.executeMode, true);
      assert.equal(ctx.isTTY, false);
    });

    it("--headless 设置 headless=true 和 streamJson=true", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram(["--headless"]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.headless, true);
      assert.equal(ctx.streamJson, true);
    });

    it("stdout 非 TTY + --stream-json -> executeMode=false (streamJson 阻止 execute)", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram(["--stream-json"]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.executeMode, false, "streamJson should prevent executeMode");
    });

    it("--execute 强制 executeMode=true 不受 TTY 影响", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram(["--execute"]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.executeMode, true);
    });

    it("isTTY=true 仅当 stdout AND stderr 均为 TTY", () => {
      // stdout=TTY, stderr=not TTY -> isTTY=false
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram([]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.isTTY, false, "isTTY should require both stdout+stderr");
      // But executeMode only checks stdout, so should be false
      assert.equal(ctx.executeMode, false, "executeMode only checks stdout");
    });

    it("executeMode 仅检查 stdout (非 stderr)", () => {
      // stdout=TTY, stderr=not TTY -> executeMode=false (only stdout matters)
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram([]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.executeMode, false, "executeMode should only check stdout");
    });
  });

  // ─── streamJson ───────────────────────────────────────────

  describe("streamJson", () => {
    it("--stream-json 设置 streamJson=true", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram(["--stream-json"]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.streamJson, true);
    });

    it("无 --stream-json 且无 --headless 时 streamJson=false", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram([]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.streamJson, false);
    });
  });

  // ─── verbose ──────────────────────────────────────────────

  describe("verbose", () => {
    it("--verbose 设置 verbose=true", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram(["--verbose"]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.verbose, true);
    });

    it("无 --verbose 时 verbose=false", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram([]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.verbose, false);
    });
  });

  // ─── userMessage ──────────────────────────────────────────

  describe("userMessage", () => {
    it("参数拼接为 userMessage", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram(["hello", "world"]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.userMessage, "hello world");
    });

    it("无参数时 userMessage=undefined", () => {
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        value: true,
        writable: true,
        configurable: true,
      });
      const program = parsedProgram([]);
      const ctx = resolveCliContext(program);
      assert.equal(ctx.userMessage, undefined);
    });
  });
});
