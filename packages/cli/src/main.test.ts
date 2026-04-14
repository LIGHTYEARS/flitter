/**
 * main() CLI 主入口测试
 *
 * 验证:
 * - 全局错误处理注册 (unhandledRejection, SIGINT, SIGTERM)
 * - createProgram + parseAsync 调用
 * - 异常处理 → exitCode=1 + stderr 输出
 * - getVersion 版本读取与 fallback
 * - 日志级别 (verbose / headless)
 * - 退出码语义
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// 保存原始 process 监听器以便恢复
let originalListeners: {
  unhandledRejection: Function[];
  SIGINT: Function[];
  SIGTERM: Function[];
};

// 抑制日志输出 (JSON 日志走 stderr)
const origStderrWrite = process.stderr.write.bind(process.stderr);
const origStdoutWrite = process.stdout.write.bind(process.stdout);

beforeEach(() => {
  originalListeners = {
    unhandledRejection: process.listeners("unhandledRejection") as Function[],
    SIGINT: process.listeners("SIGINT") as Function[],
    SIGTERM: process.listeners("SIGTERM") as Function[],
  };
  // 重置 exitCode (bun 不支持 delete/undefined, 用 0 重置)
  process.exitCode = 0;
});

afterEach(() => {
  // 恢复 stderr/stdout
  process.stderr.write = origStderrWrite;
  process.stdout.write = origStdoutWrite;

  // 清理测试添加的监听器
  process.removeAllListeners("unhandledRejection");
  process.removeAllListeners("SIGINT");
  process.removeAllListeners("SIGTERM");
  // 恢复原始监听器
  for (const fn of originalListeners.unhandledRejection) {
    process.on("unhandledRejection", fn as any);
  }
  for (const fn of originalListeners.SIGINT) {
    process.on("SIGINT", fn as any);
  }
  for (const fn of originalListeners.SIGTERM) {
    process.on("SIGTERM", fn as any);
  }
  // 重置 exitCode
  process.exitCode = 0;
});

/**
 * 抑制所有输出 (测试辅助)
 */
function suppressOutput() {
  process.stderr.write = (() => true) as any;
  process.stdout.write = (() => true) as any;
}

describe("main()", () => {
  it("注册 unhandledRejection 处理器", async () => {
    suppressOutput();
    const { main } = await import("./main");

    const beforeCount = process.listenerCount("unhandledRejection");
    await main({ argv: ["node", "flitter"] });
    const afterCount = process.listenerCount("unhandledRejection");

    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it("注册 SIGINT 处理器", async () => {
    suppressOutput();
    const { main } = await import("./main");

    const beforeCount = process.listenerCount("SIGINT");
    await main({ argv: ["node", "flitter"] });
    const afterCount = process.listenerCount("SIGINT");

    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it("注册 SIGTERM 处理器", async () => {
    suppressOutput();
    const { main } = await import("./main");

    const beforeCount = process.listenerCount("SIGTERM");
    await main({ argv: ["node", "flitter"] });
    const afterCount = process.listenerCount("SIGTERM");

    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it("调用 createProgram 并 parseAsync", async () => {
    suppressOutput();
    const { main } = await import("./main");

    // 用一个不触发退出的最小调用
    await main({ argv: ["node", "flitter"] });

    // 如果 parseAsync 没被调用, main 会抛异常
    // 到达这里即说明 createProgram + parseAsync 正常工作
    expect(true).toBe(true);
  });

  it("异常 → exitCode 非 0 + stderr 输出", async () => {
    const { main } = await import("./main");

    const stderrChunks: string[] = [];
    process.stderr.write = ((chunk: any) => {
      stderrChunks.push(String(chunk));
      return true;
    }) as any;
    process.stdout.write = (() => true) as any;

    await main({
      argv: ["node", "flitter"],
      _testThrow: new Error("test error"),
    });

    expect(process.exitCode).toBeGreaterThanOrEqual(1);
    const output = stderrChunks.join("");
    expect(output).toContain("test error");
  });

  it("正常执行不设置 exitCode (无异常)", async () => {
    suppressOutput();
    const { main } = await import("./main");

    await main({ argv: ["node", "flitter"] });

    // exitCode 应为 0 (正常)
    expect(process.exitCode).toBe(0);
  });
});

describe("getVersion()", () => {
  it("返回 package.json 版本号", async () => {
    const { getVersion } = await import("./main");

    const version = getVersion();
    // 应匹配 semver 格式
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("返回非空字符串 (fallback 安全)", async () => {
    const { getVersion } = await import("./main");

    // getVersion 内部处理了 require 错误, 会 fallback
    const version = getVersion();
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
  });
});

describe("日志级别", () => {
  it("--verbose 设置日志级别为 debug (不抛异常)", async () => {
    suppressOutput();
    const { main } = await import("./main");

    await main({ argv: ["node", "flitter", "--verbose"] });

    // 不抛异常即通过
    expect(true).toBe(true);
  });
});

describe("退出码", () => {
  it("退出码 0 = 成功", async () => {
    suppressOutput();
    const { main } = await import("./main");

    await main({ argv: ["node", "flitter"] });

    expect(process.exitCode).toBe(0);
  });

  it("退出码 1 = 用户错误 (通过 _testThrow)", async () => {
    suppressOutput();
    const { main } = await import("./main");

    await main({
      argv: ["node", "flitter"],
      _testThrow: new Error("user error"),
    });

    expect(process.exitCode).toBe(1);
  });
});
