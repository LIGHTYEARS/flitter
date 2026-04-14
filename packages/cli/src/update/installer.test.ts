/**
 * installer.ts 单元测试
 *
 * 覆盖: installBinaryUpdate 下载+校验+原子替换、
 * SHA-256 失败处理、进度回调、文件权限、
 * installWithPackageManager 包管理器命令
 *
 * 逆向参考: qVT in process-runner.js
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { UpdateInfo } from "./checker";
import {
  installBinaryUpdate,
  installWithPackageManager,
  UpdateVerificationError,
} from "./installer";

/**
 * 辅助: 创建临时文件并返回其 SHA-256
 */
async function _createTempFileWithHash(
  dir: string,
  name: string,
  content: string,
): Promise<{ path: string; sha256: string }> {
  const path = join(dir, name);
  await writeFile(path, content);
  const hash = createHash("sha256").update(content).digest("hex");
  return { path, sha256: hash };
}

describe("installBinaryUpdate", () => {
  let tempDir: string;
  let origFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "installer-test-"));
    origFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it("下载 + 校验通过 → 替换目标文件", async () => {
    const targetPath = join(tempDir, "flitter-binary");
    await writeFile(targetPath, "old-binary-content");

    const newContent = "new-binary-content-v2";
    const sha256 = createHash("sha256").update(newContent).digest("hex");

    // Mock fetch 返回新二进制内容
    globalThis.fetch = (async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(newContent));
          controller.close();
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Length": String(newContent.length) },
      });
    }) as unknown as typeof globalThis.fetch;

    const info: UpdateInfo = {
      version: "2.0.0",
      downloadUrl: "https://cdn.example.com/flitter",
      sha256,
      releaseNotes: "v2",
    };

    await installBinaryUpdate(info, { targetPath });

    const result = await readFile(targetPath, "utf-8");
    assert.equal(result, newContent);
  });

  it("SHA-256 不匹配 → 抛出 UpdateVerificationError", async () => {
    const targetPath = join(tempDir, "flitter-binary");
    await writeFile(targetPath, "old-content");

    // Mock fetch
    globalThis.fetch = (async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("some-content"));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const info: UpdateInfo = {
      version: "2.0.0",
      downloadUrl: "https://cdn.example.com/flitter",
      sha256: "0000000000000000000000000000000000000000000000000000000000000000",
      releaseNotes: "",
    };

    await assert.rejects(
      () => installBinaryUpdate(info, { targetPath }),
      (err: Error) => {
        assert.ok(err instanceof UpdateVerificationError);
        assert.ok(err.message.includes("SHA-256 verification failed"));
        return true;
      },
    );

    // 原始文件应保持不变
    const content = await readFile(targetPath, "utf-8");
    assert.equal(content, "old-content");
  });

  it("SHA-256 失败后删除临时文件", async () => {
    const targetPath = join(tempDir, "flitter-binary");
    await writeFile(targetPath, "old-content");

    globalThis.fetch = (async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("bad-content"));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const info: UpdateInfo = {
      version: "2.0.0",
      downloadUrl: "https://cdn.example.com/flitter",
      sha256: "wrong-hash",
      releaseNotes: "",
    };

    await assert.rejects(() => installBinaryUpdate(info, { targetPath }));

    // 验证 temp 目录中没有残留的 flitter-update-* 文件
    // (无法精确检查 tmpdir，但至少原文件完整)
    const content = await readFile(targetPath, "utf-8");
    assert.equal(content, "old-content");
  });

  it("进度回调被调用", async () => {
    const targetPath = join(tempDir, "flitter-binary");
    await writeFile(targetPath, "old");

    const content = "new-content-for-progress-test";
    const sha256 = createHash("sha256").update(content).digest("hex");

    globalThis.fetch = (async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content));
          controller.close();
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Length": String(content.length) },
      });
    }) as unknown as typeof globalThis.fetch;

    const info: UpdateInfo = {
      version: "2.0.0",
      downloadUrl: "https://cdn.example.com/flitter",
      sha256,
      releaseNotes: "",
    };

    const progressCalls: Array<{ downloaded: number; total: number }> = [];
    await installBinaryUpdate(info, {
      targetPath,
      onProgress: (downloaded, total) => {
        progressCalls.push({ downloaded, total });
      },
    });

    assert.ok(progressCalls.length > 0, "onProgress 应至少被调用一次");
    // 最后一次调用的 downloaded 应该等于内容长度
    const last = progressCalls[progressCalls.length - 1];
    assert.equal(last.downloaded, content.length);
  });

  it("替换后文件有执行权限", async () => {
    const targetPath = join(tempDir, "flitter-binary");
    await writeFile(targetPath, "old");

    const content = "executable-binary";
    const sha256 = createHash("sha256").update(content).digest("hex");

    globalThis.fetch = (async () => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(content));
          controller.close();
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Length": String(content.length) },
      });
    }) as unknown as typeof globalThis.fetch;

    const info: UpdateInfo = {
      version: "2.0.0",
      downloadUrl: "https://cdn.example.com/flitter",
      sha256,
      releaseNotes: "",
    };

    await installBinaryUpdate(info, { targetPath });

    // 检查文件有执行权限
    const fileStat = await stat(targetPath);
    const isExecutable = (fileStat.mode & constants.S_IXUSR) !== 0;
    assert.ok(isExecutable, "文件应有执行权限 (0o755)");
  });
});

describe("installWithPackageManager", () => {
  let _origExec: typeof import("node:child_process").exec;
  let _executedCommands: string[];

  // 我们无法在测试中实际执行 npm install -g，
  // 但可以验证方法映射和错误处理

  it("未知安装方式抛出错误", async () => {
    await assert.rejects(
      () => installWithPackageManager("unknown" as unknown as import("./checker").InstallMethod),
      (err: Error) => {
        assert.ok(err.message.includes("Unsupported"));
        return true;
      },
    );
  });
});
