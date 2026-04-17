/**
 * Config 命令处理器测试
 *
 * 测试 handleConfigGet, handleConfigSet, handleConfigList 的核心流程:
 * - 配置键值的读取和输出格式
 * - 值类型解析 (string, boolean, JSON)
 * - 空配置/缺失键处理
 * - ConfigService 不可用时的错误处理
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ConfigService } from "@flitter/data";
import type { CliContext } from "../../context";
import { handleConfigGet, handleConfigList, handleConfigSet } from "../config";

// ─── Mock ConfigService ──────────────────────────────────

function createMockConfigService(settings: Record<string, unknown> = {}) {
  const updateCalls: Array<{ scope: string; key: string; value: unknown }> = [];
  return {
    service: {
      get() {
        return { settings, secrets: {} };
      },
      updateSettings(scope: string, key: string, value: unknown) {
        updateCalls.push({ scope, key, value });
        (settings as Record<string, unknown>)[key] = value;
      },
    } as unknown as ConfigService,
    updateCalls,
  };
}

// ─── Stdout/Stderr capture ───────────────────────────────

function captureOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origStdoutWrite = process.stdout.write;
  const origStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  return {
    stdout,
    stderr,
    restore() {
      process.stdout.write = origStdoutWrite;
      process.stderr.write = origStderrWrite;
    },
  };
}

// ─── Context fixture ─────────────────────────────────────

const ctx: CliContext = {
  executeMode: false,
  isTTY: true,
  headless: false,
  streamJson: false,
  verbose: false,
};

// ─── handleConfigGet 测试 ────────────────────────────────

describe("handleConfigGet", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should print string value", async () => {
    const { service } = createMockConfigService({ "internal.model": "claude-3" });
    await handleConfigGet({ configService: service }, ctx, "internal.model");
    assert.equal(output.stdout.join(""), "internal.model: claude-3\n");
  });

  it("should print (not set) for missing key", async () => {
    const { service } = createMockConfigService({});
    await handleConfigGet({ configService: service }, ctx, "missing.key");
    assert.equal(output.stdout.join(""), "missing.key: (not set)\n");
  });

  it("should print JSON for object value", async () => {
    const obj = { theme: "dark", size: 12 };
    const { service } = createMockConfigService({ "ui.config": obj });
    await handleConfigGet({ configService: service }, ctx, "ui.config");
    const out = output.stdout.join("");
    assert.ok(out.includes("ui.config:"));
    assert.ok(out.includes('"theme": "dark"'));
  });

  it("should print numeric value as string", async () => {
    const { service } = createMockConfigService({ "terminal.columns": 80 });
    await handleConfigGet({ configService: service }, ctx, "terminal.columns");
    assert.equal(output.stdout.join(""), "terminal.columns: 80\n");
  });

  it("should error when configService is not available", async () => {
    await handleConfigGet({}, ctx, "any.key");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ConfigService not available"));
  });
});

// ─── handleConfigSet 测试 ────────────────────────────────

describe("handleConfigSet", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should set a string value", async () => {
    const { service, updateCalls } = createMockConfigService({});
    await handleConfigSet({ configService: service }, ctx, "internal.model", "claude-3");
    assert.equal(updateCalls.length, 1);
    assert.equal(updateCalls[0].scope, "workspace");
    assert.equal(updateCalls[0].key, "internal.model");
    assert.equal(updateCalls[0].value, "claude-3");
    assert.ok(output.stdout.join("").includes("Set internal.model = claude-3"));
  });

  it("should parse boolean true", async () => {
    const { service, updateCalls } = createMockConfigService({});
    await handleConfigSet({ configService: service }, ctx, "feature.enabled", "true");
    assert.equal(updateCalls[0].value, true);
  });

  it("should parse boolean false", async () => {
    const { service, updateCalls } = createMockConfigService({});
    await handleConfigSet({ configService: service }, ctx, "feature.enabled", "false");
    assert.equal(updateCalls[0].value, false);
  });

  it("should parse JSON object", async () => {
    const { service, updateCalls } = createMockConfigService({});
    await handleConfigSet({ configService: service }, ctx, "ui.config", '{"theme":"dark"}');
    assert.deepEqual(updateCalls[0].value, { theme: "dark" });
    assert.ok(output.stdout.join("").includes('{"theme":"dark"}'));
  });

  it("should parse JSON number", async () => {
    const { service, updateCalls } = createMockConfigService({});
    await handleConfigSet({ configService: service }, ctx, "terminal.columns", "80");
    assert.equal(updateCalls[0].value, 80);
  });

  it("should keep non-JSON string as string", async () => {
    const { service, updateCalls } = createMockConfigService({});
    await handleConfigSet({ configService: service }, ctx, "name", "hello world");
    assert.equal(updateCalls[0].value, "hello world");
  });

  it("should error when configService is not available", async () => {
    await handleConfigSet({}, ctx, "key", "value");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ConfigService not available"));
  });
});

// ─── handleConfigList 测试 ───────────────────────────────

describe("handleConfigList", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should list settings sorted alphabetically", async () => {
    const { service } = createMockConfigService({
      "terminal.theme": "dark",
      "internal.model": "claude-3",
      "agent.timeout": 30,
    });
    await handleConfigList({ configService: service }, ctx);
    const out = output.stdout.join("");
    const lines = out.trim().split("\n");
    assert.equal(lines.length, 3);
    assert.ok(lines[0].startsWith("agent.timeout:"));
    assert.ok(lines[1].startsWith("internal.model:"));
    assert.ok(lines[2].startsWith("terminal.theme:"));
  });

  it("should print 'No settings configured.' for empty settings", async () => {
    const { service } = createMockConfigService({});
    await handleConfigList({ configService: service }, ctx);
    assert.equal(output.stdout.join(""), "No settings configured.\n");
  });

  it("should print object values as JSON", async () => {
    const { service } = createMockConfigService({
      "ui.config": { theme: "dark" },
    });
    await handleConfigList({ configService: service }, ctx);
    const out = output.stdout.join("");
    assert.ok(out.includes('{"theme":"dark"}'));
  });

  it("should error when configService is not available", async () => {
    await handleConfigList({}, ctx);
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ConfigService not available"));
  });
});
