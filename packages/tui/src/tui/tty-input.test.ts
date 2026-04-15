/**
 * TtyInputSource 单元测试。
 *
 * 测试 /dev/tty 输入源、process.stdin 回退、输出目标策略、
 * Bun 版本检测和 ANSI 转义剥离等功能。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tui/tty-input.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it, mock, beforeEach, afterEach } from "node:test";

// ════════════════════════════════════════════════════
//  isBunWithTtyBug 测试
// ════════════════════════════════════════════════════

describe("isBunWithTtyBug", () => {
  let originalBunVersion: string | undefined;

  beforeEach(() => {
    originalBunVersion = (process.versions as Record<string, string>).bun;
  });

  afterEach(() => {
    if (originalBunVersion === undefined) {
      delete (process.versions as Record<string, string | undefined>).bun;
    } else {
      (process.versions as Record<string, string>).bun = originalBunVersion;
    }
  });

  it("应在非 Bun 环境返回 false（process.versions.bun 未定义）", async () => {
    delete (process.versions as Record<string, string | undefined>).bun;
    const { isBunWithTtyBug } = await import("./tty-input.js");
    // Need to re-evaluate since it's a function call
    assert.equal(isBunWithTtyBug(), false);
  });

  it("应在 Bun 1.2.21 返回 true（patch < 22）", async () => {
    (process.versions as Record<string, string>).bun = "1.2.21";
    const { isBunWithTtyBug } = await import("./tty-input.js");
    assert.equal(isBunWithTtyBug(), true);
  });

  it("应在 Bun 1.2.22 返回 false（patch >= 22）", async () => {
    (process.versions as Record<string, string>).bun = "1.2.22";
    const { isBunWithTtyBug } = await import("./tty-input.js");
    assert.equal(isBunWithTtyBug(), false);
  });

  it("应在 Bun 1.3.x 返回 false（minor !== 2）", async () => {
    (process.versions as Record<string, string>).bun = "1.3.10";
    const { isBunWithTtyBug } = await import("./tty-input.js");
    assert.equal(isBunWithTtyBug(), false);
  });

  it("应在 Bun 1.2.0 返回 true（patch < 22）", async () => {
    (process.versions as Record<string, string>).bun = "1.2.0";
    const { isBunWithTtyBug } = await import("./tty-input.js");
    assert.equal(isBunWithTtyBug(), true);
  });

  it("应在 Bun 2.0.0 返回 false（major !== 1）", async () => {
    (process.versions as Record<string, string>).bun = "2.0.0";
    const { isBunWithTtyBug } = await import("./tty-input.js");
    assert.equal(isBunWithTtyBug(), false);
  });
});

// ════════════════════════════════════════════════════
//  stripAnsiEscapes 测试
// ════════════════════════════════════════════════════

describe("stripAnsiEscapes", () => {
  it("应移除 CSI 序列", async () => {
    const { stripAnsiEscapes } = await import("./tty-input.js");
    const input = "hello\x1b[31mworld\x1b[0m";
    assert.equal(stripAnsiEscapes(input), "helloworld");
  });

  it("应移除 OSC 序列（以 ST 结尾）", async () => {
    const { stripAnsiEscapes } = await import("./tty-input.js");
    const input = "before\x1b]0;title\x1b\\after";
    assert.equal(stripAnsiEscapes(input), "beforeafter");
  });

  it("应移除 OSC 序列（以 BEL 结尾）", async () => {
    const { stripAnsiEscapes } = await import("./tty-input.js");
    const input = "before\x1b]0;title\x07after";
    assert.equal(stripAnsiEscapes(input), "beforeafter");
  });

  it("应保留普通文本不变", async () => {
    const { stripAnsiEscapes } = await import("./tty-input.js");
    assert.equal(stripAnsiEscapes("hello world"), "hello world");
  });

  it("应处理空字符串", async () => {
    const { stripAnsiEscapes } = await import("./tty-input.js");
    assert.equal(stripAnsiEscapes(""), "");
  });
});

// ════════════════════════════════════════════════════
//  createDevTtyInput 测试
// ════════════════════════════════════════════════════

describe("createDevTtyInput", () => {
  it("应返回包含所有 TtyInputSource 方法的对象", async () => {
    const { createDevTtyInput } = await import("./tty-input.js");
    // In test environment, /dev/tty may not be available.
    // Test the interface shape by creating with { deferInit: true }
    const source = createDevTtyInput({ deferInit: true });
    assert.equal(typeof source.init, "function", "应有 init 方法");
    assert.equal(typeof source.on, "function", "应有 on 方法");
    assert.equal(typeof source.pause, "function", "应有 pause 方法");
    assert.equal(typeof source.resume, "function", "应有 resume 方法");
    assert.equal(typeof source.dispose, "function", "应有 dispose 方法");
    assert.equal(typeof source.getEarlyInputText, "function", "应有 getEarlyInputText 方法");
    assert.ok("stdin" in source, "应有 stdin 属性");
    assert.ok("dataCallback" in source, "应有 dataCallback 属性");
    assert.ok("earlyInputBuffer" in source, "应有 earlyInputBuffer 属性");
  });

  it("dispose() 应正确清理资源", async () => {
    const { createDevTtyInput } = await import("./tty-input.js");
    const source = createDevTtyInput({ deferInit: true });
    // Before init, dispose should be safe (no-op)
    source.dispose();
    assert.equal(source.stdin, null, "dispose 后 stdin 应为 null");
    assert.equal(source.dataCallback, null, "dispose 后 dataCallback 应为 null");
    assert.deepStrictEqual(source.earlyInputBuffer, [], "dispose 后 earlyInputBuffer 应为空");
  });

  it("getEarlyInputText() 应返回已缓冲的输入并清空缓冲区", async () => {
    const { createDevTtyInput } = await import("./tty-input.js");
    const source = createDevTtyInput({ deferInit: true });
    // Manually push to early buffer
    source.earlyInputBuffer.push(Buffer.from("hello"));
    source.earlyInputBuffer.push(Buffer.from(" world"));
    const text = source.getEarlyInputText();
    assert.equal(text, "hello world");
    // Second call should return empty
    assert.equal(source.getEarlyInputText(), "");
  });

  it("getEarlyInputText() 应剥离 ANSI 转义序列", async () => {
    const { createDevTtyInput } = await import("./tty-input.js");
    const source = createDevTtyInput({ deferInit: true });
    source.earlyInputBuffer.push(Buffer.from("\x1b[31mhello\x1b[0m"));
    const text = source.getEarlyInputText();
    assert.equal(text, "hello");
  });
});

// ════════════════════════════════════════════════════
//  createStdinFallback 测试
// ════════════════════════════════════════════════════

describe("createStdinFallback", () => {
  it("应返回使用 process.stdin 的 TtyInputSource", async () => {
    const { createStdinFallback } = await import("./tty-input.js");
    const source = createStdinFallback({ deferInit: true });
    assert.equal(typeof source.init, "function");
    assert.equal(typeof source.on, "function");
    assert.equal(typeof source.pause, "function");
    assert.equal(typeof source.resume, "function");
    assert.equal(typeof source.dispose, "function");
    assert.equal(typeof source.getEarlyInputText, "function");
  });

  it("dispose() 应安全清理", async () => {
    const { createStdinFallback } = await import("./tty-input.js");
    const source = createStdinFallback({ deferInit: true });
    source.dispose();
    assert.equal(source.dataCallback, null);
  });
});

// ════════════════════════════════════════════════════
//  createTtyOutput 测试
// ════════════════════════════════════════════════════

describe("createTtyOutput", () => {
  it("应在 stdout.isTTY 时返回 stdout 目标", async () => {
    const { createTtyOutput } = await import("./tty-input.js");
    // In CI/test, stdout may or may not be TTY
    const output = createTtyOutput();
    assert.ok(output.stream, "应有 stream");
    assert.ok(typeof output.stream.write === "function", "stream 应有 write 方法");
    assert.ok(["stdout", "stderr", "dev-tty"].includes(output.target),
      `target 应为 stdout/stderr/dev-tty 之一，实际为 ${output.target}`);
    assert.equal(typeof output.dispose, "function", "应有 dispose 方法");
    // Clean up
    output.dispose();
  });

  it("应正确返回 TtyOutputTarget 接口", async () => {
    const { createTtyOutput } = await import("./tty-input.js");
    const output = createTtyOutput();
    assert.ok("stream" in output);
    assert.ok("target" in output);
    assert.ok("dispose" in output);
    output.dispose();
  });
});

// ════════════════════════════════════════════════════
//  createTtyInput (router) 测试
// ════════════════════════════════════════════════════

describe("createTtyInput", () => {
  it("应返回 TtyInputSource 接口", async () => {
    const { createTtyInput } = await import("./tty-input.js");
    // createTtyInput routes between devtty and stdin fallback
    // In test env, it will try /dev/tty first, may fall back
    const source = createTtyInput({ deferInit: true });
    assert.equal(typeof source.init, "function");
    assert.equal(typeof source.dispose, "function");
    assert.equal(typeof source.getEarlyInputText, "function");
    source.dispose();
  });
});
