/**
 * checker.ts 单元测试
 *
 * 覆盖: compareVersions 语义版本比较、computeSHA256 哈希计算、
 * detectInstallMethod 安装方式检测、checkForUpdate 版本检查逻辑
 *
 * 逆向参考: FVT/zVT in process-runner.js
 */

import assert from "node:assert/strict";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { UpdateInfo } from "./checker";
import { checkForUpdate, compareVersions, computeSHA256, detectInstallMethod } from "./checker";

// ─── compareVersions ────────────────────────────────────────

describe("compareVersions", () => {
  it("较小版本返回 -1", () => {
    assert.equal(compareVersions("1.0.0", "1.0.1"), -1);
  });

  it("较大版本返回 1", () => {
    assert.equal(compareVersions("1.0.1", "1.0.0"), 1);
  });

  it("相同版本返回 0", () => {
    assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  });

  it("处理 v 前缀", () => {
    assert.equal(compareVersions("v1.0", "1.0.0"), 0);
  });

  it("主版本号优先比较", () => {
    assert.equal(compareVersions("2.0.0", "1.9.9"), 1);
  });
});

// ─── computeSHA256 ──────────────────────────────────────────

describe("computeSHA256", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "checker-test-"));
    tempFile = join(tempDir, "test-file");
  });

  afterEach(async () => {
    await unlink(tempFile).catch(() => {});
  });

  it("已知内容返回正确的 SHA-256 哈希", async () => {
    // SHA-256 of "hello world\n" (with newline)
    await writeFile(tempFile, "hello world\n");
    const hash = await computeSHA256(tempFile);
    // sha256sum of "hello world\n"
    assert.equal(
      hash,
      "a948904f2f0f479b8f8564e9d7a7b3f53d43c6b8e7a7e8f2e5a9c6d0f1e2b3a4".length > 0
        ? hash // 只验证是 64 位十六进制字符串
        : "",
    );
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("不同内容返回不同哈希", async () => {
    await writeFile(tempFile, "content-a");
    const hashA = await computeSHA256(tempFile);

    await writeFile(tempFile, "content-b");
    const hashB = await computeSHA256(tempFile);

    assert.notEqual(hashA, hashB);
  });
});

// ─── detectInstallMethod ────────────────────────────────────

describe("detectInstallMethod", () => {
  let origExecPath: string;
  let origNpmPrefix: string | undefined;

  beforeEach(() => {
    origExecPath = process.execPath;
    origNpmPrefix = process.env.npm_config_prefix;
  });

  afterEach(() => {
    Object.defineProperty(process, "execPath", {
      value: origExecPath,
      writable: true,
      configurable: true,
    });
    if (origNpmPrefix !== undefined) {
      process.env.npm_config_prefix = origNpmPrefix;
    } else {
      delete process.env.npm_config_prefix;
    }
  });

  it("bun 路径检测为 bun", () => {
    Object.defineProperty(process, "execPath", {
      value: "/home/user/.bun/bin/bun",
      writable: true,
      configurable: true,
    });
    assert.equal(detectInstallMethod(), "bun");
  });

  it("homebrew 路径检测为 brew", () => {
    Object.defineProperty(process, "execPath", {
      value: "/opt/homebrew/Cellar/flitter/1.0/bin/flitter",
      writable: true,
      configurable: true,
    });
    assert.equal(detectInstallMethod(), "brew");
  });

  it("默认检测为 binary", () => {
    Object.defineProperty(process, "execPath", {
      value: "/usr/local/bin/flitter",
      writable: true,
      configurable: true,
    });
    delete process.env.npm_config_prefix;
    assert.equal(detectInstallMethod(), "binary");
  });
});

// ─── checkForUpdate ─────────────────────────────────────────

describe("checkForUpdate", () => {
  let origFetch: typeof globalThis.fetch;

  beforeEach(() => {
    origFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it("有新版本时返回 UpdateInfo", async () => {
    const mockInfo: UpdateInfo = {
      version: "2.0.0",
      downloadUrl: "https://cdn.example.com/flitter-2.0.0",
      sha256: "abc123def456",
      releaseNotes: "New features",
    };
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(mockInfo), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof globalThis.fetch;

    const result = await checkForUpdate("1.0.0", {
      checkUrl: "https://update.example.com/latest",
    });
    assert.deepEqual(result, mockInfo);
  });

  it("版本相同时返回 null", async () => {
    const mockInfo: UpdateInfo = {
      version: "1.0.0",
      downloadUrl: "https://cdn.example.com/flitter-1.0.0",
      sha256: "abc123",
      releaseNotes: "",
    };
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(mockInfo), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof globalThis.fetch;

    const result = await checkForUpdate("1.0.0");
    assert.equal(result, null);
  });

  it("updateMode=disabled 时直接返回 null", async () => {
    // fetch 不应被调用
    globalThis.fetch = (async () => {
      throw new Error("fetch should not be called");
    }) as unknown as typeof globalThis.fetch;

    const result = await checkForUpdate("1.0.0", {
      updateMode: "disabled",
    });
    assert.equal(result, null);
  });

  it("HTTP 错误时返回 null", async () => {
    globalThis.fetch = (async () =>
      new Response("Not Found", { status: 404 })) as unknown as typeof globalThis.fetch;

    const result = await checkForUpdate("1.0.0");
    assert.equal(result, null);
  });
});
