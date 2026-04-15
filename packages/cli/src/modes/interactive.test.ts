/**
 * interactive.test.ts -- 交互式 TUI 模式入口测试
 *
 * 验证 launchInteractiveMode 的 Widget 树组装、resolveThread 逻辑、
 * --continue 标志支持等行为。
 *
 * 使用 node:test 以兼容 npx tsx --test 运行。
 * 对 runApp 不做模块级 mock (无 bun:test mock.module)，
 * 仅测试可独立验证的内部函数和导出。
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, mock } from "node:test";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";

// ─── Mock 基础设施 ────────────────────────────────────────

/** 创建 Mock ServiceContainer */
function createMockContainer(overrides: Partial<Record<string, unknown>> = {}): ServiceContainer {
  const configService = {
    get: () => ({
      settings: {
        "terminal.theme": "terminal",
        ...((overrides.settingsOverride as Record<string, unknown>) ?? {}),
      },
      secrets: {},
    }),
  };

  const threadStore = {
    setCachedThread: mock.fn(() => ({})),
    getThreadSnapshot: mock.fn((_id: string) => overrides.threadSnapshot ?? null),
    observeThread: mock.fn((_id: string) => undefined),
  };

  const mockWorker = {
    runInference: mock.fn(async () => {}),
    cancelInference: mock.fn(() => {}),
    dispose: mock.fn(() => {}),
    events$: {
      subscribe: mock.fn(() => ({ unsubscribe: () => {}, closed: false })),
    },
  };

  const container = {
    configService,
    threadStore,
    createThreadWorker: mock.fn((_threadId: string) => mockWorker),
    asyncDispose: mock.fn(async () => {}),
    ...((overrides.containerOverrides as Record<string, unknown>) ?? {}),
  } as unknown as ServiceContainer;

  return container;
}

/** 创建 Mock CliContext */
function createMockContext(
  overrides: Partial<CliContext & { threadId?: string; continueThread?: boolean }> = {},
): CliContext & { threadId?: string; continueThread?: boolean } {
  return {
    executeMode: false,
    isTTY: true,
    headless: false,
    streamJson: false,
    verbose: false,
    ...overrides,
  };
}

// ─── 测试 ─────────────────────────────────────────────────

describe("interactive.ts — resolveThread + 导出验证", () => {
  it("resolveThread 无 threadId 时创建新 thread", async () => {
    const { _testing } = await import("./interactive.js");
    const container = createMockContainer();
    const context = createMockContext();

    const threadId = await _testing.resolveThread(container, context);

    assert.ok(threadId);
    assert.equal(typeof threadId, "string");
    assert.ok(threadId.length > 0);
    assert.equal((container.threadStore.setCachedThread as any).mock.callCount(), 1);
  });

  it("resolveThread 有 threadId 时返回该 threadId", async () => {
    const { _testing } = await import("./interactive.js");
    const container = createMockContainer();
    const context = createMockContext({ threadId: "existing-thread-123" });

    const threadId = await _testing.resolveThread(container, context);

    assert.equal(threadId, "existing-thread-123");
  });

  it("resolveThread --continue 恢复最近 thread", async () => {
    const { _testing } = await import("./interactive.js");
    const container = createMockContainer();
    // 添加 listThreads mock
    (container.threadStore as any).listThreads = () => [
      { id: "recent-thread-1" },
      { id: "older-thread-2" },
    ];
    const context = createMockContext({ continueThread: true });

    const threadId = await _testing.resolveThread(container, context);

    assert.equal(threadId, "recent-thread-1");
  });

  it("resolveThread --continue 无 threads 时创建新 thread", async () => {
    const { _testing } = await import("./interactive.js");
    const container = createMockContainer();
    (container.threadStore as any).listThreads = () => [];
    const context = createMockContext({ continueThread: true });

    const threadId = await _testing.resolveThread(container, context);

    assert.equal(typeof threadId, "string");
    assert.ok(threadId.length > 0);
    assert.equal((container.threadStore.setCachedThread as any).mock.callCount(), 1);
  });

  it("resolveThread --continue 无 listThreads 方法时创建新 thread", async () => {
    const { _testing } = await import("./interactive.js");
    const container = createMockContainer();
    // threadStore 没有 listThreads 方法
    const context = createMockContext({ continueThread: true });

    const threadId = await _testing.resolveThread(container, context);

    assert.equal(typeof threadId, "string");
    assert.ok(threadId.length > 0);
  });

  it("defaultThemeData 使用 terminal 配色", async () => {
    const { defaultThemeData } = await import("./interactive.js");

    assert.ok(defaultThemeData);
    assert.equal(defaultThemeData.name, "terminal");
    assert.equal(typeof defaultThemeData.primary, "string");
    assert.equal(typeof defaultThemeData.error, "string");
    assert.equal(typeof defaultThemeData.text, "string");
  });

  it("确保 stub 代码不再存在 (无旧导出)", async () => {
    const exports = await import("./interactive.js");
    const exportKeys = Object.keys(exports);

    // 旧 stub 导出不应存在
    assert.ok(!exportKeys.includes("ThemeController"));
    assert.ok(!exportKeys.includes("ConfigProvider"));
    assert.ok(!exportKeys.includes("AppWidget"));
    assert.ok(!exportKeys.includes("ThreadStateWidget"));
    assert.ok(!exportKeys.includes("IWidget"));
    assert.ok(!exportKeys.includes("RunAppOptions"));
    assert.ok(!exportKeys.includes("InputField"));
  });

  it("_testing 导出 resolveThread", async () => {
    const { _testing } = await import("./interactive.js");
    assert.ok(_testing);
    assert.equal(typeof _testing.resolveThread, "function");
  });

  it("interactive.ts 导入 ThreadStateWidget (非 InputField)", async () => {
    // 通过检查源文件确认 import 结构
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      new URL("./interactive.ts", import.meta.url).pathname.replace(
        "/modes/interactive.ts",
        "/modes/interactive.ts",
      ),
      "utf-8",
    );

    // 应该导入 ThreadStateWidget
    assert.ok(
      source.includes('import { ThreadStateWidget }'),
      "should import ThreadStateWidget",
    );
    // 不应该直接导入 InputField (由 ThreadStateWidget 内部使用)
    assert.ok(
      !source.includes('import { InputField }'),
      "should NOT directly import InputField (owned by ThreadStateWidget)",
    );
    // 应该包含 worker.runInference() 在 onSubmit 中
    assert.ok(
      source.includes("worker.runInference()"),
      "should call worker.runInference() in onSubmit",
    );
    // 应该包含 continueThread 支持
    assert.ok(
      source.includes("continueThread"),
      "should support continueThread flag",
    );
    // 应该包含 modelName
    assert.ok(
      source.includes("modelName"),
      "should pass modelName to ThreadStateWidget",
    );
    // 不应该有 new InputField 在顶层 (由 ThreadStateWidget 内部创建)
    // 检查 runApp 调用区块不含 InputField
    const runAppBlock = source.slice(
      source.indexOf("await runApp("),
      source.indexOf(");", source.indexOf("await runApp(")) + 2,
    );
    assert.ok(
      !runAppBlock.includes("new InputField("),
      "runApp block should NOT contain new InputField (owned by ThreadStateWidget)",
    );
  });
});
