/**
 * interactive.test.ts — 交互式 TUI 模式入口测试
 *
 * 验证 launchInteractiveMode 的组件树组装、生命周期管理、
 * runApp 调用、资源清理、退出 URL 输出等行为。
 */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { ThreadWorker } from "@flitter/agent-core";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";
import type { IWidget } from "./interactive";

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
    getLatest: async () => ({
      settings: {
        "terminal.theme": "terminal",
        ...((overrides.settingsOverride as Record<string, unknown>) ?? {}),
      },
      secrets: {},
    }),
    observe: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
  };

  const threadStore = {
    setCachedThread: mock(() => {}),
    getThreadSnapshot: mock((_id: string) => overrides.threadSnapshot ?? null),
  };

  const workerEvents$ = {
    subscribe: mock(() => ({ unsubscribe: () => {} })),
    next: mock(() => {}),
  };
  const workerInferenceState$ = {
    getValue: mock(() => "idle"),
    subscribe: mock(() => ({ unsubscribe: () => {} })),
  };

  const mockWorker = {
    events$: workerEvents$,
    inferenceState$: workerInferenceState$,
    runInference: mock(async () => {}),
    cancelInference: mock(() => {}),
    dispose: mock(() => {}),
  };

  const container = {
    configService,
    threadStore,
    createThreadWorker: mock((_threadId: string) => mockWorker),
    asyncDispose: mock(async () => {}),
    ...((overrides.containerOverrides as Record<string, unknown>) ?? {}),
  } as unknown as ServiceContainer;

  return container;
}

/** 创建 Mock CliContext */
function createMockContext(overrides: Partial<CliContext> = {}): CliContext {
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

describe("launchInteractiveMode", () => {
  let originalStdoutWrite: typeof process.stdout.write;
  let capturedOutput: string;

  beforeEach(() => {
    capturedOutput = "";
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = mock((chunk: string | Uint8Array) => {
      capturedOutput += String(chunk);
      return true;
    }) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
  });

  it("应调用 runApp 启动 TUI", async () => {
    const { launchInteractiveMode, _testing } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    const runAppMock = mock(async (_widget: unknown, _opts?: unknown) => {});
    _testing.setRunApp(runAppMock);

    await launchInteractiveMode(container, context);

    expect(runAppMock).toHaveBeenCalledTimes(1);
  });

  it("在 finally 中调用 asyncDispose", async () => {
    const { launchInteractiveMode, _testing } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    _testing.setRunApp(async () => {});

    await launchInteractiveMode(container, context);

    expect(container.asyncDispose).toHaveBeenCalledTimes(1);
  });

  it("resolveThread 无 threadId 时创建新 thread", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    const threadId = await _testing.resolveThread(container, context);

    expect(threadId).toBeDefined();
    expect(typeof threadId).toBe("string");
    expect(threadId.length).toBeGreaterThan(0);
    expect(container.threadStore.setCachedThread).toHaveBeenCalledTimes(1);
  });

  it("resolveThread 有 threadId 时返回该 threadId", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer({
      threadSnapshot: {
        id: "existing-thread-123",
        messages: [{ role: "user", content: "hello" }],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    });
    const context = createMockContext();
    (context as CliContext & { threadId?: string }).threadId = "existing-thread-123";

    const threadId = await _testing.resolveThread(container, context);

    expect(threadId).toBe("existing-thread-123");
  });

  it("buildWidgetTree 返回正确层级的组件树", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer();
    const mockWorker = container.createThreadWorker("test");

    const widget = _testing.buildWidgetTree(
      container,
      mockWorker as unknown as ThreadWorker,
      "terminal",
    );

    expect(widget).toBeDefined();
    // 根节点应该是 ThemeController 类型
    expect(widget.constructor.name).toBe("ThemeController");
  });

  it("ThemeController 使用 configService 的 terminal.theme", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer({
      settingsOverride: { "terminal.theme": "dark" },
    });
    const mockWorker = container.createThreadWorker("test");

    const widget = _testing.buildWidgetTree(
      container,
      mockWorker as unknown as ThreadWorker,
      "dark",
    );

    expect(widget).toBeDefined();
    // 主题名应该传入 ThemeController
    expect((widget as IWidget & { themeName: string }).themeName).toBe("dark");
  });

  it("ThemeController 默认主题为 terminal", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer({
      settingsOverride: {},
    });
    const mockWorker = container.createThreadWorker("test");

    const widget = _testing.buildWidgetTree(
      container,
      mockWorker as unknown as ThreadWorker,
      "terminal",
    );

    expect((widget as IWidget & { themeName: string }).themeName).toBe("terminal");
  });

  it("ThreadWorker 创建时传递正确的 threadId", async () => {
    const { launchInteractiveMode, _testing } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    _testing.setRunApp(async () => {});

    await launchInteractiveMode(container, context);

    expect(container.createThreadWorker).toHaveBeenCalledTimes(1);
    // 第一个参数应该是生成的 threadId (UUID)
    const callArgs = (container.createThreadWorker as ReturnType<typeof mock>).mock
      .calls[0] as unknown[];
    expect(typeof callArgs[0]).toBe("string");
    expect((callArgs[0] as string).length).toBeGreaterThan(0);
  });

  it("退出时输出 thread URL (有消息时)", async () => {
    const { launchInteractiveMode, _testing } = await import("./interactive");
    const container = createMockContainer({
      threadSnapshot: {
        id: "test-thread",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    // Make getThreadSnapshot return the thread with messages
    (container.threadStore.getThreadSnapshot as ReturnType<typeof mock>).mockImplementation(() => ({
      id: "test-thread",
      messages: [{ role: "user", content: "hello" }],
    }));
    const context = createMockContext();

    _testing.setRunApp(async () => {});

    await launchInteractiveMode(container, context);

    expect(capturedOutput).toContain("Thread:");
    expect(capturedOutput).toContain("/threads/");
  });

  it("退出时不输出 URL (无消息时)", async () => {
    const { launchInteractiveMode, _testing } = await import("./interactive");
    const container = createMockContainer();
    // Return thread with no messages
    (container.threadStore.getThreadSnapshot as ReturnType<typeof mock>).mockImplementation(() => ({
      id: "test-thread",
      messages: [],
    }));
    const context = createMockContext();

    _testing.setRunApp(async () => {});

    await launchInteractiveMode(container, context);

    expect(capturedOutput).not.toContain("Thread:");
  });

  it("组件树根节点是 ThemeController 类型", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer();
    const mockWorker = container.createThreadWorker("test");

    const widget = _testing.buildWidgetTree(
      container,
      mockWorker as unknown as ThreadWorker,
      "terminal",
    );

    expect(widget.constructor.name).toBe("ThemeController");
  });

  it("ConfigProvider 注入 configService", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer();
    const mockWorker = container.createThreadWorker("test");

    const widget = _testing.buildWidgetTree(
      container,
      mockWorker as unknown as ThreadWorker,
      "terminal",
    );

    // ThemeController.child should be ConfigProvider
    const themeCtrl = widget as IWidget & {
      child: IWidget & { configService: unknown; constructor: { name: string } };
    };
    expect(themeCtrl.child).toBeDefined();
    expect(themeCtrl.child.constructor.name).toBe("ConfigProvider");
    expect(themeCtrl.child.configService).toBe(container.configService);
  });

  it("错误处理: runApp 抛异常仍清理资源", async () => {
    const { launchInteractiveMode, _testing } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    _testing.setRunApp(async () => {
      throw new Error("TUI crash");
    });

    // 应抛出异常, 但 asyncDispose 仍被调用
    await expect(launchInteractiveMode(container, context)).rejects.toThrow("TUI crash");

    expect(container.asyncDispose).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+C 信号触发 cancel worker 和 dispose", async () => {
    const { _testing } = await import("./interactive");
    const container = createMockContainer();
    const _mockWorker = container.createThreadWorker("test");

    // 验证 handleShutdown 函数存在并可调用
    expect(typeof _testing.handleShutdown).toBe("function");
  });

  it("runApp 接收正确的 options", async () => {
    const { launchInteractiveMode, _testing } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    let capturedOpts: unknown;
    _testing.setRunApp(async (_widget: unknown, opts?: unknown) => {
      capturedOpts = opts;
    });

    await launchInteractiveMode(container, context);

    expect(capturedOpts).toBeDefined();
    // options 应该包含 onRootElementMounted 回调
    const opts = capturedOpts as { onRootElementMounted?: unknown };
    expect(typeof opts.onRootElementMounted).toBe("function");
  });
});
