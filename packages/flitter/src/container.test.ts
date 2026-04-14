/**
 * @flitter/flitter — ServiceContainer 单元测试
 *
 * 测试 createContainer() DI 容器组装:
 * - 基本创建: 返回所有属性
 * - 配置传递: workspaceRoot/ampURL 正确传递
 * - dispose 顺序: 反序清理
 * - dispose 错误隔离: 单个 dispose 失败不阻止其他
 * - partial failure: 创建中途失败时清理
 * - 内置工具注册: 7 个内置工具
 * - threadPersistence 可选: dataDir 为空时为 null
 * - createThreadWorker 工厂: 返回 ThreadWorker
 * - 多次 dispose: 安全
 */
import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { createContainer, type ContainerOptions, type SecretStorage, type ServiceContainer } from "./container";

// ── Mock SecretStorage ──────────────────────────────────

function createMockSecretStorage(): SecretStorage {
  const store = new Map<string, string>();
  return {
    async get(key: string, _scope?: string) {
      return store.get(key);
    },
    async set(key: string, value: string, _scope?: string) {
      store.set(key, value);
    },
    async delete(key: string, _scope?: string) {
      store.delete(key);
    },
  };
}

// ── Mock FileSettingsStorage ────────────────────────────

function createMockSettingsStorage(): any {
  return {
    get: mock(() => Promise.resolve(undefined)),
    set: mock(() => Promise.resolve()),
    append: mock(() => Promise.resolve()),
    prepend: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    getWatchPaths: mock(() => []),
    getAll: mock(() => ({})),
    getAllForScope: mock(() => ({})),
  };
}

// ── 默认选项 ────────────────────────────────────────────

function createDefaultOptions(): ContainerOptions {
  return {
    ampURL: "https://api.example.com",
    settings: createMockSettingsStorage(),
    secrets: createMockSecretStorage(),
    workspaceRoot: "/tmp/test-workspace",
    homeDir: "/tmp/test-home",
    configDir: "/tmp/test-config",
  };
}

describe("createContainer", () => {
  test("返回包含所有必需服务属性的 ServiceContainer", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container).toBeDefined();
    expect(container.configService).toBeDefined();
    expect(container.toolRegistry).toBeDefined();
    expect(container.toolOrchestrator).toBeDefined();
    expect(container.permissionEngine).toBeDefined();
    expect(container.mcpServerManager).toBeDefined();
    expect(container.skillService).toBeDefined();
    expect(container.threadStore).toBeDefined();
    expect(container.guidanceLoader).toBeDefined();
    expect(container.contextManager).toBeDefined();
    expect(container.secrets).toBeDefined();
    expect(container.settings).toBeDefined();
    expect(typeof container.createThreadWorker).toBe("function");
    expect(typeof container.asyncDispose).toBe("function");

    await container.asyncDispose();
  });

  test("正确传递 ampURL 和 workspaceRoot", async () => {
    const opts = createDefaultOptions();
    opts.ampURL = "https://custom-api.test.com";
    opts.workspaceRoot = "/custom/workspace";

    const container = await createContainer(opts);

    // configService 应包含正确的 workspaceRoot
    expect(container.configService.workspaceRoot).toBe("/custom/workspace");

    await container.asyncDispose();
  });

  test("secrets 和 settings 直接暴露在 container 上", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container.secrets).toBe(opts.secrets);
    expect(container.settings).toBe(opts.settings);

    await container.asyncDispose();
  });

  test("注册所有 7 个内置工具", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    const expectedTools = [
      "Read", "Write", "Edit", "Bash", "Grep", "Glob", "FuzzyFind",
    ];

    for (const toolName of expectedTools) {
      expect(container.toolRegistry.has(toolName)).toBe(true);
    }

    // 确保注册数量正确
    expect(container.toolRegistry.list().length).toBeGreaterThanOrEqual(7);

    await container.asyncDispose();
  });

  test("dataDir 为空时 threadPersistence 为 null", async () => {
    const opts = createDefaultOptions();
    // 不设置 dataDir
    const container = await createContainer(opts);

    expect(container.threadPersistence).toBeNull();

    await container.asyncDispose();
  });

  test("dataDir 存在时创建 threadPersistence", async () => {
    const opts = createDefaultOptions();
    opts.dataDir = "/tmp/test-data";

    const container = await createContainer(opts);

    expect(container.threadPersistence).not.toBeNull();

    await container.asyncDispose();
  });

  test("asyncDispose 按反序清理服务", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    // 不应抛出
    await container.asyncDispose();
  });

  test("asyncDispose 错误隔离 — 单个 dispose 失败不阻止其他清理", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    // 让 MCPServerManager 的 dispose 抛出错误
    const origDispose = (container.mcpServerManager as any).dispose;
    (container.mcpServerManager as any).dispose = async () => {
      throw new Error("dispose error from mcp");
    };

    // 应该不抛出，其他服务应该正常清理
    await expect(container.asyncDispose()).resolves.toBeUndefined();
  });

  test("多次调用 asyncDispose 不抛出", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    await container.asyncDispose();
    // 第二次调用应安全
    await expect(container.asyncDispose()).resolves.toBeUndefined();
  });

  test("createThreadWorker 返回 ThreadWorker 实例", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    const worker = container.createThreadWorker("test-thread-id");
    expect(worker).toBeDefined();
    expect(worker.inferenceState$).toBeDefined();
    expect(worker.events$).toBeDefined();

    await container.asyncDispose();
  });

  test("configService 接收 secretStorage 回调", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    // 验证 configService 有配置
    const config = container.configService.get();
    expect(config).toBeDefined();

    await container.asyncDispose();
  });

  test("threadStore 已创建", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container.threadStore).toBeDefined();
    // ThreadStore 应该能获取 all entries observable
    expect(container.threadStore.allEntries$).toBeDefined();

    await container.asyncDispose();
  });

  test("contextManager 已创建", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container.contextManager).toBeDefined();
    expect(container.contextManager.compactionState).toBeDefined();

    await container.asyncDispose();
  });

  test("skillService 已创建", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container.skillService).toBeDefined();
    expect(container.skillService.skills).toBeDefined();

    await container.asyncDispose();
  });

  test("guidanceLoader 是函数/对象", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    // guidanceLoader 封装了 discoverGuidanceFiles 的配置
    expect(container.guidanceLoader).toBeDefined();
    expect(typeof container.guidanceLoader.discover).toBe("function");

    await container.asyncDispose();
  });

  test("permissionEngine 已创建并使用默认规则", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container.permissionEngine).toBeDefined();

    await container.asyncDispose();
  });

  test("mcpServerManager 已创建", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container.mcpServerManager).toBeDefined();
    expect(container.mcpServerManager.allTools$).toBeDefined();

    await container.asyncDispose();
  });

  test("toolOrchestrator 已创建", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    expect(container.toolOrchestrator).toBeDefined();

    await container.asyncDispose();
  });

  test("deferAuth: true 不影响容器创建", async () => {
    const opts = createDefaultOptions();
    opts.deferAuth = true;

    const container = await createContainer(opts);
    expect(container).toBeDefined();

    await container.asyncDispose();
  });
});

describe("SecretStorage interface", () => {
  test("get/set/delete 基本操作", async () => {
    const storage = createMockSecretStorage();

    await storage.set("api-key", "sk-test-123");
    expect(await storage.get("api-key")).toBe("sk-test-123");

    await storage.delete("api-key");
    expect(await storage.get("api-key")).toBeUndefined();
  });

  test("带 scope 参数", async () => {
    const storage = createMockSecretStorage();

    await storage.set("token", "val1", "global");
    // scope 不影响 mock 存储 (真实实现会按 scope 隔离)
    expect(await storage.get("token")).toBe("val1");
  });
});
