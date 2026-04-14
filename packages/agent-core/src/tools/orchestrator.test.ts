/**
 * ToolOrchestrator 单元测试
 *
 * 覆盖 hasResourceConflict、batchToolsByDependency、ToolOrchestrator
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Config } from "@flitter/schemas";
import { Observable } from "@flitter/util";
import {
  batchToolsByDependency,
  hasResourceConflict,
  type OrchestratorCallbacks,
  ToolOrchestrator,
  type ToolThreadEvent,
  type ToolUseItem,
} from "./orchestrator";
import { ToolRegistry } from "./registry";
import type { ResourceKey, ToolResult, ToolSpec } from "./types";

// ─── 测试辅助函数 ──────────────────────────────────────────

function createTestRegistry(tools: Partial<ToolSpec>[]): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of tools) {
    registry.register({
      name: tool.name ?? "unnamed",
      description: tool.description ?? "test",
      inputSchema: tool.inputSchema ?? { type: "object" },
      execute: tool.execute ?? (async () => ({ status: "done" as const })),
      source: tool.source ?? ("builtin" as const),
      executionProfile: tool.executionProfile,
      isReadOnly: tool.isReadOnly,
      isEnabled: tool.isEnabled,
    });
  }
  return registry;
}

function createMockCallbacks(overrides?: Partial<OrchestratorCallbacks>): OrchestratorCallbacks {
  return {
    getConfig: async () =>
      ({
        settings: {},
        secrets: { getToken: async () => undefined, isSet: () => false },
      }) as Config,
    updateThread: async () => {},
    getToolRunEnvironment: async (_id: string, signal: AbortSignal) => ({
      workingDirectory: "/tmp",
      signal,
      threadId: "test-thread",
      config: {
        settings: {},
        secrets: { getToken: async () => undefined, isSet: () => false },
      } as Config,
    }),
    applyHookResult: async () => ({ abortOp: false }),
    applyPostHookResult: async () => {},
    updateFileChanges: async () => {},
    getDisposed$: () => new Observable<boolean>(() => {}),
    ...overrides,
  };
}

function createDelayedTool(name: string, delayMs: number, result?: ToolResult): Partial<ToolSpec> {
  return {
    name,
    execute: async () => {
      await new Promise((r) => setTimeout(r, delayMs));
      return result ?? { status: "done" as const, content: `${name} done` };
    },
  };
}

function createResourceTool(name: string, keys: ResourceKey[]): Partial<ToolSpec> {
  return {
    name,
    executionProfile: { resourceKeys: keys },
  };
}

function createSerialTool(name: string): Partial<ToolSpec> {
  return {
    name,
    executionProfile: { serial: true },
  };
}

// ─── hasResourceConflict ───────────────────────────────────

describe("hasResourceConflict", () => {
  it("两工具无 executionProfile → 无冲突", () => {
    const registry = createTestRegistry([{ name: "a" }, { name: "b" }]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), false);
  });

  it("工具 A serial=true → 冲突", () => {
    const registry = createTestRegistry([createSerialTool("a"), { name: "b" }]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), true);
  });

  it("工具 B serial=true → 冲突", () => {
    const registry = createTestRegistry([{ name: "a" }, createSerialTool("b")]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), true);
  });

  it("两工具都 serial=true → 冲突", () => {
    const registry = createTestRegistry([createSerialTool("a"), createSerialTool("b")]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), true);
  });

  it("共享资源键, 一方 write → 冲突", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "file.ts", mode: "read" }]),
      createResourceTool("b", [{ key: "file.ts", mode: "write" }]),
    ]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), true);
  });

  it("共享资源键, 双方 write → 冲突", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "file.ts", mode: "write" }]),
      createResourceTool("b", [{ key: "file.ts", mode: "write" }]),
    ]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), true);
  });

  it("共享资源键, 双方 read → 无冲突", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "file.ts", mode: "read" }]),
      createResourceTool("b", [{ key: "file.ts", mode: "read" }]),
    ]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), false);
  });

  it("不同资源键 → 无冲突", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "file1.ts", mode: "write" }]),
      createResourceTool("b", [{ key: "file2.ts", mode: "write" }]),
    ]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), false);
  });

  it("一方有资源键另一方没有 → 无冲突", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "file.ts", mode: "write" }]),
      { name: "b" },
    ]);
    const a: ToolUseItem = { id: "1", name: "a", input: {} };
    const b: ToolUseItem = { id: "2", name: "b", input: {} };
    assert.equal(hasResourceConflict(a, b, registry), false);
  });
});

// ─── batchToolsByDependency ────────────────────────────────

describe("batchToolsByDependency", () => {
  it("无冲突工具 → 1 个批次", () => {
    const registry = createTestRegistry([{ name: "a" }, { name: "b" }, { name: "c" }]);
    const tools: ToolUseItem[] = [
      { id: "1", name: "a", input: {} },
      { id: "2", name: "b", input: {} },
      { id: "3", name: "c", input: {} },
    ];
    const batches = batchToolsByDependency(tools, registry);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].length, 3);
  });

  it("全部 serial → 每个工具一个批次", () => {
    const registry = createTestRegistry([
      createSerialTool("a"),
      createSerialTool("b"),
      createSerialTool("c"),
    ]);
    const tools: ToolUseItem[] = [
      { id: "1", name: "a", input: {} },
      { id: "2", name: "b", input: {} },
      { id: "3", name: "c", input: {} },
    ];
    const batches = batchToolsByDependency(tools, registry);
    assert.equal(batches.length, 3);
    assert.equal(batches[0].length, 1);
    assert.equal(batches[1].length, 1);
    assert.equal(batches[2].length, 1);
  });

  it("read-write 冲突 → 分到不同批次", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "f", mode: "read" }]),
      createResourceTool("b", [{ key: "f", mode: "write" }]),
    ]);
    const tools: ToolUseItem[] = [
      { id: "1", name: "a", input: {} },
      { id: "2", name: "b", input: {} },
    ];
    const batches = batchToolsByDependency(tools, registry);
    assert.equal(batches.length, 2);
  });

  it("read-read 同资源 → 同一批次", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "f", mode: "read" }]),
      createResourceTool("b", [{ key: "f", mode: "read" }]),
    ]);
    const tools: ToolUseItem[] = [
      { id: "1", name: "a", input: {} },
      { id: "2", name: "b", input: {} },
    ];
    const batches = batchToolsByDependency(tools, registry);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].length, 2);
  });

  it("空 toolUses → 空批次数组", () => {
    const registry = createTestRegistry([]);
    const batches = batchToolsByDependency([], registry);
    assert.deepEqual(batches, []);
  });

  it("单个工具 → 1 个批次含 1 个工具", () => {
    const registry = createTestRegistry([{ name: "a" }]);
    const tools: ToolUseItem[] = [{ id: "1", name: "a", input: {} }];
    const batches = batchToolsByDependency(tools, registry);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].length, 1);
  });

  it("混合冲突: A↔B 冲突, A↔C 无冲突 → [A,C] + [B]", () => {
    const registry = createTestRegistry([
      createResourceTool("a", [{ key: "f", mode: "write" }]),
      createResourceTool("b", [{ key: "f", mode: "write" }]),
      createResourceTool("c", [{ key: "g", mode: "write" }]),
    ]);
    const tools: ToolUseItem[] = [
      { id: "1", name: "a", input: {} },
      { id: "2", name: "b", input: {} },
      { id: "3", name: "c", input: {} },
    ];
    const batches = batchToolsByDependency(tools, registry);
    // A goes into batch 0, B conflicts with A → batch 1, C no conflict with B → batch 1
    assert.equal(batches.length, 2);
    assert.equal(batches[0].length, 1);
    assert.equal(batches[0][0].name, "a");
    assert.equal(batches[1].length, 2);
  });
});

// ─── ToolOrchestrator ──────────────────────────────────────

describe("ToolOrchestrator", () => {
  describe("executeToolsWithPlan", () => {
    it("并行执行: 无冲突工具同时开始 (计时验证)", async () => {
      const registry = createTestRegistry([createDelayedTool("a", 50), createDelayedTool("b", 50)]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);

      const start = Date.now();
      await orch.executeToolsWithPlan([
        { id: "1", name: "a", input: {} },
        { id: "2", name: "b", input: {} },
      ]);
      const elapsed = Date.now() - start;

      // 两个 50ms 工具并行, 总时间应 < 120ms
      assert.ok(elapsed < 150, `Expected < 150ms, got ${elapsed}ms`);
    });

    it("串行批次: 有冲突工具顺序执行", async () => {
      const registry = createTestRegistry([
        { ...createDelayedTool("a", 30), ...createSerialTool("a") },
        { ...createDelayedTool("b", 30), ...createSerialTool("b") },
      ]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);

      const start = Date.now();
      await orch.executeToolsWithPlan([
        { id: "1", name: "a", input: {} },
        { id: "2", name: "b", input: {} },
      ]);
      const elapsed = Date.now() - start;

      // 两个 30ms 串行工具, 总时间应 >= 50ms
      assert.ok(elapsed >= 50, `Expected >= 50ms, got ${elapsed}ms`);
    });

    it("空 toolUses 不报错", async () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      await orch.executeToolsWithPlan([]);
    });

    it("单工具正常执行", async () => {
      const events: ToolThreadEvent[] = [];
      const registry = createTestRegistry([
        {
          name: "read",
          execute: async () => ({ status: "done" as const, content: "hello" }),
        },
      ]);
      const callbacks = createMockCallbacks({
        updateThread: async (event) => {
          events.push(event);
        },
      });
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      await orch.executeToolsWithPlan([{ id: "1", name: "read", input: {} }]);

      assert.ok(events.some((e) => e.status === "in-progress"));
      assert.ok(events.some((e) => e.status === "completed"));
    });
  });

  describe("invokeTool (via executeToolsWithPlan)", () => {
    it("成功路径: pre-hook → execute → post-hook → updateThread(completed)", async () => {
      const callOrder: string[] = [];
      const registry = createTestRegistry([
        {
          name: "read",
          execute: async () => {
            callOrder.push("execute");
            return { status: "done" as const, content: "data" };
          },
        },
      ]);
      const callbacks = createMockCallbacks({
        applyHookResult: async () => {
          callOrder.push("pre-hook");
          return { abortOp: false };
        },
        applyPostHookResult: async () => {
          callOrder.push("post-hook");
        },
        updateThread: async (event) => {
          callOrder.push(`update:${event.status}`);
        },
        updateFileChanges: async () => {
          callOrder.push("file-changes");
        },
      });
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      await orch.executeToolsWithPlan([{ id: "1", name: "read", input: {} }]);

      assert.deepEqual(callOrder, [
        "pre-hook",
        "update:in-progress",
        "execute",
        "post-hook",
        "update:completed",
        "file-changes",
      ]);
    });

    it("错误路径: execute 抛出 → updateThread(error) + 错误包装", async () => {
      const events: ToolThreadEvent[] = [];
      const registry = createTestRegistry([
        {
          name: "fail",
          execute: async () => {
            throw new Error("boom");
          },
        },
      ]);
      const callbacks = createMockCallbacks({
        updateThread: async (event) => {
          events.push(event);
        },
      });
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      await orch.executeToolsWithPlan([{ id: "1", name: "fail", input: {} }]);

      const errorEvent = events.find((e) => e.status === "error");
      assert.ok(errorEvent);
      assert.equal(errorEvent!.error, "boom");
      assert.equal(errorEvent!.result?.status, "error");
    });

    it("取消路径: 已取消的工具跳过执行", async () => {
      const events: ToolThreadEvent[] = [];
      const executed: string[] = [];
      const registry = createTestRegistry([
        {
          name: "read",
          execute: async () => {
            executed.push("read");
            return { status: "done" as const };
          },
        },
      ]);
      const callbacks = createMockCallbacks({
        updateThread: async (event) => {
          events.push(event);
        },
      });
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      // Pre-cancel the tool
      orch.cancelledToolUses.add("1");
      await orch.executeToolsWithPlan([{ id: "1", name: "read", input: {} }]);

      assert.equal(executed.length, 0);
      assert.ok(events.some((e) => e.status === "cancelled"));
    });

    it("工具未找到: updateThread(error)", async () => {
      const events: ToolThreadEvent[] = [];
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks({
        updateThread: async (event) => {
          events.push(event);
        },
      });
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      await orch.executeToolsWithPlan([{ id: "1", name: "nonexistent", input: {} }]);

      const errorEvent = events.find((e) => e.status === "error");
      assert.ok(errorEvent);
      assert.ok(errorEvent!.error?.includes("not found"));
    });

    it("pre-hook abortOp → 跳过执行", async () => {
      const executed: string[] = [];
      const events: ToolThreadEvent[] = [];
      const registry = createTestRegistry([
        {
          name: "read",
          execute: async () => {
            executed.push("read");
            return { status: "done" as const };
          },
        },
      ]);
      const callbacks = createMockCallbacks({
        applyHookResult: async () => ({ abortOp: true }),
        updateThread: async (event) => {
          events.push(event);
        },
      });
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      await orch.executeToolsWithPlan([{ id: "1", name: "read", input: {} }]);

      assert.equal(executed.length, 0);
      assert.ok(events.some((e) => e.status === "cancelled"));
    });
  });

  describe("cancelAll", () => {
    it("中止所有运行中工具的 AbortController", async () => {
      const registry = createTestRegistry([
        createDelayedTool("a", 5000),
        createDelayedTool("b", 5000),
      ]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);

      // Start tools but don't await
      const promise = orch.executeToolsWithPlan([
        { id: "1", name: "a", input: {} },
        { id: "2", name: "b", input: {} },
      ]);

      // Wait for tools to register
      await new Promise((r) => setTimeout(r, 20));

      orch.cancelAll();

      assert.ok(orch.cancelledToolUses.has("1"));
      assert.ok(orch.cancelledToolUses.has("2"));

      // Let it settle
      await promise.catch(() => {});
    });

    it("将所有运行中工具 ID 加入 cancelledToolUses", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);

      // Manually set running tools
      orch.runningTools.set("1", { abort: new AbortController() });
      orch.runningTools.set("2", { abort: new AbortController() });

      orch.cancelAll();

      assert.ok(orch.cancelledToolUses.has("1"));
      assert.ok(orch.cancelledToolUses.has("2"));
    });
  });

  describe("cancelTool", () => {
    it("中止指定工具", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);

      const ac = new AbortController();
      orch.runningTools.set("1", { abort: ac });
      orch.cancelTool("1");

      assert.ok(ac.signal.aborted);
      assert.ok(orch.cancelledToolUses.has("1"));
    });

    it("对不存在的 toolUseId 静默处理", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      orch.cancelTool("nonexistent"); // should not throw
    });
  });

  describe("hasRunningTools", () => {
    it("无运行工具返回 false", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      assert.equal(orch.hasRunningTools(), false);
    });

    it("有运行工具返回 true", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      orch.runningTools.set("1", { abort: new AbortController() });
      assert.equal(orch.hasRunningTools(), true);
    });
  });

  describe("dispose", () => {
    it("调用 cancelAll", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);

      const ac = new AbortController();
      orch.runningTools.set("1", { abort: ac });
      orch.dispose();

      assert.ok(ac.signal.aborted);
    });

    it("清理 runningTools 和 cancelledToolUses", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);

      orch.runningTools.set("1", { abort: new AbortController() });
      orch.cancelledToolUses.add("old");
      orch.dispose();

      assert.equal(orch.runningTools.size, 0);
      assert.equal(orch.cancelledToolUses.size, 0);
    });

    it("重复 dispose 不报错", () => {
      const registry = createTestRegistry([]);
      const callbacks = createMockCallbacks();
      const orch = new ToolOrchestrator("t1", registry, callbacks);
      orch.dispose();
      orch.dispose(); // should not throw
    });
  });
});
