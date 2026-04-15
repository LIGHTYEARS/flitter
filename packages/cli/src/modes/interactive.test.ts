/**
 * interactive.test.ts -- 交互式 TUI 模式入口测试
 *
 * 验证 launchInteractiveMode 的真实 Widget 树组装、runApp 调用、
 * 资源清理、退出 URL 输出等行为。
 *
 * 使用 mock.module 替换 @flitter/tui 的 runApp，
 * 验证传入的 Widget 类型和 onRootElementMounted 回调。
 */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";

// ─── Mock 基础设施 ────────────────────────────────────────

/**
 * 捕获的 runApp 调用参数
 */
let runAppCalls: Array<{ widget: unknown; options?: unknown }> = [];

/**
 * runApp mock 行为控制
 */
let runAppBehavior: "resolve" | "reject" = "resolve";
let runAppError: Error | null = null;

/**
 * Mock runApp — 替换 @flitter/tui 的 runApp
 */
mock.module("@flitter/tui", () => ({
  runApp: async (widget: unknown, options?: unknown) => {
    runAppCalls.push({ widget, options });
    // 调用 onRootElementMounted 回调 (模拟真实行为)
    const opts = options as { onRootElementMounted?: (element: unknown) => void } | undefined;
    if (opts?.onRootElementMounted) {
      opts.onRootElementMounted({ _mockRootElement: true });
    }
    if (runAppBehavior === "reject" && runAppError) {
      throw runAppError;
    }
  },
  // Re-export tree types needed by widgets
  StatefulWidget: class StatefulWidget {
    key: undefined;
    canUpdate() { return true; }
    createElement() { return {}; }
    createState() { return {}; }
  },
  State: class State<T> {
    widget!: T;
    _mounted = false;
    _element: unknown = null;
    initState() {}
    dispose() {}
    setState() {}
    build() { return {}; }
  },
  InheritedWidget: class InheritedWidget {
    child: unknown;
    key: undefined;
    constructor(opts: { child: unknown }) { this.child = opts.child; }
    canUpdate() { return true; }
    createElement() { return {}; }
    updateShouldNotify() { return false; }
  },
  TextEditingController: class TextEditingController {
    text = "";
    insertText() {}
    deleteText() {}
    dispose() {}
  },
  FocusNode: class FocusNode {
    constructor(_opts?: unknown) {}
    requestFocus() {}
    dispose() {}
  },
  FocusManager: { instance: { registerNode() {}, unregisterNode() {} } },
  Text: class Text {
    data: string;
    constructor(opts: { data: string }) { this.data = opts.data; }
    key: undefined;
    canUpdate() { return true; }
    createElement() { return {}; }
    build() { return {}; }
  },
}));

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
    setCachedThread: mock(() => ({})),
    getThreadSnapshot: mock((_id: string) => overrides.threadSnapshot ?? null),
  };

  const mockWorker = {
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

describe("interactive.ts — stub 替换后", () => {
  let originalStdoutWrite: typeof process.stdout.write;
  let capturedOutput: string;

  beforeEach(() => {
    runAppCalls = [];
    runAppBehavior = "resolve";
    runAppError = null;
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

  it("launchInteractiveMode 调用 runApp 一次", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    expect(runAppCalls.length).toBe(1);
  });

  it("runApp 接收 AppWidget 实例作为根 Widget", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const { AppWidget } = await import("../widgets/app-widget.js");
    const container = createMockContainer();
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    expect(runAppCalls.length).toBe(1);
    const widget = runAppCalls[0].widget;
    expect(widget).toBeInstanceOf(AppWidget);
  });

  it("AppWidget 包含 ThreadStateWidget 子节点", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const { ThreadStateWidget } = await import("../widgets/thread-state-widget.js");
    const container = createMockContainer();
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    const widget = runAppCalls[0].widget as any;
    expect(widget.config.child).toBeInstanceOf(ThreadStateWidget);
  });

  it("ThreadStateWidget 包含 InputField 子节点", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const { InputField } = await import("../widgets/input-field.js");
    const container = createMockContainer();
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    const widget = runAppCalls[0].widget as any;
    const threadStateWidget = widget.config.child;
    expect(threadStateWidget.config.child).toBeInstanceOf(InputField);
  });

  it("onRootElementMounted 回调存储 rootElement 到 container", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    expect((container as any)._rootElement).toEqual({ _mockRootElement: true });
  });

  it("finally 块调用 container.asyncDispose", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    expect(container.asyncDispose).toHaveBeenCalledTimes(1);
  });

  it("runApp 抛异常仍清理资源 (finally)", async () => {
    runAppBehavior = "reject";
    runAppError = new Error("TUI crash");

    const { launchInteractiveMode } = await import("./interactive");
    const container = createMockContainer();
    const context = createMockContext();

    await expect(launchInteractiveMode(container, context)).rejects.toThrow("TUI crash");

    expect(container.asyncDispose).toHaveBeenCalledTimes(1);
  });

  it("退出时输出 thread URL (有消息时)", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const container = createMockContainer();
    (container.threadStore.getThreadSnapshot as ReturnType<typeof mock>).mockImplementation(() => ({
      id: "test-thread",
      messages: [{ role: "user", content: "hello" }],
    }));
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    expect(capturedOutput).toContain("Thread:");
    expect(capturedOutput).toContain("/threads/");
  });

  it("退出时不输出 URL (无消息时)", async () => {
    const { launchInteractiveMode } = await import("./interactive");
    const container = createMockContainer();
    (container.threadStore.getThreadSnapshot as ReturnType<typeof mock>).mockImplementation(() => ({
      id: "test-thread",
      messages: [],
    }));
    const context = createMockContext();

    await launchInteractiveMode(container, context);

    expect(capturedOutput).not.toContain("Thread:");
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
    const container = createMockContainer();
    const context = createMockContext();
    (context as CliContext & { threadId?: string }).threadId = "existing-thread-123";

    const threadId = await _testing.resolveThread(container, context);

    expect(threadId).toBe("existing-thread-123");
  });

  it("确保 stub 代码不再存在 (无 _runApp 导出)", async () => {
    const exports = await import("./interactive");
    const exportKeys = Object.keys(exports);

    // 旧 stub 导出不应存在
    expect(exportKeys).not.toContain("ThemeController");
    expect(exportKeys).not.toContain("ConfigProvider");
    expect(exportKeys).not.toContain("AppWidget");
    expect(exportKeys).not.toContain("ThreadStateWidget");
    expect(exportKeys).not.toContain("IWidget");
    expect(exportKeys).not.toContain("RunAppOptions");

    // _testing 不应包含 setRunApp / buildWidgetTree / handleShutdown
    expect(exports._testing).toBeDefined();
    expect((exports._testing as any).setRunApp).toBeUndefined();
    expect((exports._testing as any).buildWidgetTree).toBeUndefined();
    expect((exports._testing as any).handleShutdown).toBeUndefined();
  });

  it("defaultThemeData 使用 terminal 配色", async () => {
    const { defaultThemeData } = await import("./interactive");

    expect(defaultThemeData).toBeDefined();
    expect(defaultThemeData.name).toBe("terminal");
    expect(typeof defaultThemeData.primary).toBe("string");
    expect(typeof defaultThemeData.error).toBe("string");
    expect(typeof defaultThemeData.text).toBe("string");
  });
});
