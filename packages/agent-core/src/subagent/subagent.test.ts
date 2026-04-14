/**
 * SubAgentManager 测试
 * 覆盖: spawn 生命周期, cancel, cancelAll, activeAgents$, dispose, 嵌套限制
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Message, ThreadSnapshot } from "@flitter/schemas";
import type { ThreadWorker } from "../worker/thread-worker";
import {
  SubAgentManager,
  type SubAgentManagerOptions,
  type SubAgentOptions,
  type SubAgentWorkerOptions,
} from "./subagent";

// ─── Mock ThreadWorker ──────────────────────────────────

function createMockWorker(opts?: {
  runInferenceFn?: () => Promise<void>;
  cancelInferenceFn?: () => void;
}): ThreadWorker {
  let state = "idle";
  return {
    inferenceState$: {
      getValue: () => state,
      next: (s: string) => {
        state = s;
      },
      subscribe: () => ({ unsubscribe: () => {} }),
    },
    events$: {
      next: () => {},
      subscribe: () => ({ unsubscribe: () => {} }),
    },
    runInference:
      opts?.runInferenceFn ??
      (async () => {
        state = "idle";
      }),
    cancelInference:
      opts?.cancelInferenceFn ??
      (() => {
        state = "cancelled";
      }),
    retry: async () => {},
    dispose: () => {},
  } as unknown as ThreadWorker;
}

// ─── Mock ThreadStore callbacks ─────────────────────────

function createMockCallbacks() {
  let nextId = 0;
  const threads = new Map<string, { messages: Message[] }>();
  const workerCalls: SubAgentWorkerOptions[] = [];

  return {
    threads,
    workerCalls,
    createChildThread: (_parentId: string) => {
      const id = `child-${nextId++}`;
      threads.set(id, { messages: [] });
      return id;
    },
    addMessage: (threadId: string, msg: Message) => {
      const thread = threads.get(threadId);
      if (thread) thread.messages.push(msg);
    },
    getThreadSnapshot: (threadId: string): ThreadSnapshot | undefined => {
      const thread = threads.get(threadId);
      if (!thread) return undefined;
      return { messages: thread.messages } as unknown as ThreadSnapshot;
    },
  };
}

// ─── 辅助: 创建 SubAgentOptions ─────────────────────────

function createSpawnOpts(overrides?: Partial<SubAgentOptions>): SubAgentOptions {
  return {
    parentThreadId: "parent-1",
    description: "Test task",
    prompt: "Do the thing",
    type: "general-purpose",
    ...overrides,
  };
}

// ─── 辅助: 创建管理器 ──────────────────────────────────

function createManager(opts?: {
  workerFactory?: (wopts: SubAgentWorkerOptions) => ThreadWorker;
  callbacks?: ReturnType<typeof createMockCallbacks>;
}): {
  manager: SubAgentManager;
  callbacks: ReturnType<typeof createMockCallbacks>;
} {
  const callbacks = opts?.callbacks ?? createMockCallbacks();
  const workerFactory =
    opts?.workerFactory ??
    ((wopts: SubAgentWorkerOptions) => {
      callbacks.workerCalls.push(wopts);
      return createMockWorker();
    });

  const managerOpts: SubAgentManagerOptions = {
    createWorker: workerFactory,
    createChildThread: callbacks.createChildThread,
    addMessage: callbacks.addMessage,
    getThreadSnapshot: callbacks.getThreadSnapshot,
  };

  return { manager: new SubAgentManager(managerOpts), callbacks };
}

// ─── Tests ──────────────────────────────────────────────

describe("SubAgentManager", () => {
  describe("spawn", () => {
    it("创建子线程并运行推理, 返回 completed 结果", async () => {
      const { manager, callbacks } = createManager({
        workerFactory: (wopts) => {
          callbacks.workerCalls.push(wopts);
          // Worker that adds an assistant response when runInference is called
          return createMockWorker({
            runInferenceFn: async () => {
              const threadId = wopts.threadId;
              const thread = callbacks.threads.get(threadId);
              if (thread) {
                thread.messages.push({
                  role: "assistant",
                  content: [{ type: "text", text: "Task completed" }],
                } as unknown as Message);
              }
            },
          });
        },
      });

      const result = await manager.spawn(createSpawnOpts());

      assert.equal(result.status, "completed");
      assert.equal(result.response, "Task completed");
      assert.ok(result.threadId.startsWith("child-"));
    });

    it("从最后 assistant 消息提取 response", async () => {
      const { manager, callbacks } = createManager({
        workerFactory: (wopts) => {
          callbacks.workerCalls.push(wopts);
          return createMockWorker({
            runInferenceFn: async () => {
              const thread = callbacks.threads.get(wopts.threadId);
              if (thread) {
                thread.messages.push({
                  role: "assistant",
                  content: [
                    { type: "text", text: "Part 1" },
                    { type: "text", text: " Part 2" },
                  ],
                } as unknown as Message);
              }
            },
          });
        },
      });

      const result = await manager.spawn(createSpawnOpts());
      assert.equal(result.response, "Part 1 Part 2");
    });

    it("通过 createWorker 回调传递 permissionContext: 'subagent'", async () => {
      const { manager, callbacks } = createManager();

      await manager.spawn(createSpawnOpts());

      assert.equal(callbacks.workerCalls.length, 1);
      assert.equal(callbacks.workerCalls[0].permissionContext, "subagent");
      assert.equal(callbacks.workerCalls[0].type, "general-purpose");
    });

    it("传递 parentThreadId 和 model 到 createWorker", async () => {
      const { manager, callbacks } = createManager();

      await manager.spawn(
        createSpawnOpts({
          parentThreadId: "parent-42",
          model: "claude-3",
        }),
      );

      assert.equal(callbacks.workerCalls[0].parentThreadId, "parent-42");
      assert.equal(callbacks.workerCalls[0].model, "claude-3");
    });

    it("添加初始 user 消息 (prompt)", async () => {
      const { manager, callbacks } = createManager();

      await manager.spawn(createSpawnOpts({ prompt: "Find the bug" }));

      // 第一个子线程
      const threadId = callbacks.workerCalls[0].threadId;
      const thread = callbacks.threads.get(threadId);
      assert.ok(thread);
      assert.equal(thread.messages[0].role, "user");
      assert.deepEqual(thread.messages[0].content, [{ type: "text", text: "Find the bug" }]);
    });

    it("超时时取消推理并返回 timeout 状态", async () => {
      const { manager, callbacks } = createManager({
        workerFactory: (wopts) => {
          callbacks.workerCalls.push(wopts);
          return createMockWorker({
            runInferenceFn: async () => {
              // Simulate slow inference that never finishes
              await new Promise((resolve) => setTimeout(resolve, 5000));
            },
          });
        },
      });

      const result = await manager.spawn(
        createSpawnOpts({ timeout: 50 }), // 50ms timeout
      );

      assert.equal(result.status, "timeout");
      assert.equal(result.response, "");
    });

    it("达到 maxTurns 时停止推理", async () => {
      let turnCount = 0;
      const { manager, callbacks } = createManager({
        workerFactory: (wopts) => {
          callbacks.workerCalls.push(wopts);
          let workerState = "idle";
          return {
            inferenceState$: {
              getValue: () => workerState,
              next: (s: string) => {
                workerState = s;
              },
              subscribe: () => ({ unsubscribe: () => {} }),
            },
            events$: {
              next: () => {},
              subscribe: () => ({ unsubscribe: () => {} }),
            },
            runInference: async () => {
              turnCount++;
              // Return "running" to simulate more work needed (tool calls pending)
              // This keeps the loop going until maxTurns is hit
              workerState = "running";
            },
            cancelInference: () => {
              workerState = "cancelled";
            },
            retry: async () => {},
            dispose: () => {},
          } as unknown as ThreadWorker;
        },
      });

      await manager.spawn(createSpawnOpts({ maxTurns: 3 }));

      // Should have run exactly 3 turns then stopped
      assert.equal(turnCount, 3);
    });

    it("worker 错误时返回 error 状态 + error 信息", async () => {
      const { manager, callbacks } = createManager({
        workerFactory: (wopts) => {
          callbacks.workerCalls.push(wopts);
          return createMockWorker({
            runInferenceFn: async () => {
              throw new Error("LLM connection failed");
            },
          });
        },
      });

      const result = await manager.spawn(createSpawnOpts());

      assert.equal(result.status, "error");
      assert.equal(result.error, "LLM connection failed");
    });

    it("disposed 后 spawn 返回 error", async () => {
      const { manager } = createManager();
      manager.dispose();

      const result = await manager.spawn(createSpawnOpts());

      assert.equal(result.status, "error");
      assert.ok(result.error?.includes("disposed"));
    });
  });

  // ─── cancel ──────────────────────────────────────────

  describe("cancel", () => {
    it("取消不存在的 threadId 不报错", () => {
      const { manager } = createManager();
      // 不应该抛出
      manager.cancel("nonexistent-thread");
    });
  });

  // ─── cancelAll ──────────────────────────────────────

  describe("cancelAll", () => {
    it("没有运行中的子代理时不报错", () => {
      const { manager } = createManager();
      manager.cancelAll();
    });
  });

  // ─── activeAgents$ ───────────────────────────────────

  describe("activeAgents$", () => {
    it("初始值为空 Map", () => {
      const { manager } = createManager();
      const agents = manager.activeAgents$.getValue();
      assert.ok(agents instanceof Map);
      assert.equal(agents.size, 0);
    });

    it("spawn 时更新为 running, 完成后更新为 completed", async () => {
      const stateChanges: string[] = [];

      const { manager, callbacks } = createManager({
        workerFactory: (wopts) => {
          callbacks.workerCalls.push(wopts);

          // Capture running state
          const agents = manager.activeAgents$.getValue();
          const info = agents.get(wopts.threadId);
          if (info) {
            stateChanges.push(info.status);
          }

          return createMockWorker({
            runInferenceFn: async () => {
              // Check state during inference
              const agentsDuring = manager.activeAgents$.getValue();
              const infoDuring = agentsDuring.get(wopts.threadId);
              if (infoDuring) {
                stateChanges.push(infoDuring.status);
              }
            },
          });
        },
      });

      const result = await manager.spawn(createSpawnOpts());
      assert.equal(result.status, "completed");

      // The running state should have been set
      assert.ok(stateChanges.includes("running"));

      // After spawn completes, check the final state
      const agents = manager.activeAgents$.getValue();
      const threadId = result.threadId;
      const info = agents.get(threadId);
      assert.ok(info);
      assert.equal(info.status, "completed");
    });

    it("错误后更新为 error", async () => {
      const { manager, callbacks } = createManager({
        workerFactory: (wopts) => {
          callbacks.workerCalls.push(wopts);
          return createMockWorker({
            runInferenceFn: async () => {
              throw new Error("boom");
            },
          });
        },
      });

      const result = await manager.spawn(createSpawnOpts());
      assert.equal(result.status, "error");

      const agents = manager.activeAgents$.getValue();
      const info = agents.get(result.threadId);
      assert.ok(info);
      assert.equal(info.status, "error");
    });
  });

  // ─── dispose ─────────────────────────────────────────

  describe("dispose", () => {
    it("调用后标记 disposed, 后续 spawn 返回 error", async () => {
      const { manager } = createManager();
      manager.dispose();

      const result = await manager.spawn(createSpawnOpts());
      assert.equal(result.status, "error");
    });

    it("重复 dispose 不报错", () => {
      const { manager } = createManager();
      manager.dispose();
      manager.dispose(); // 不抛出
    });
  });

  // ─── 嵌套限制 ────────────────────────────────────────

  describe("嵌套限制", () => {
    it("createWorker 回调不注入 SubAgentManager (子代理无法 spawn)", async () => {
      const { manager, callbacks } = createManager();

      await manager.spawn(createSpawnOpts());

      // 验证 createWorker 回调只收到 SubAgentWorkerOptions
      // 不包含 SubAgentManager 实例 (深度限制通过不注入实现)
      const workerOpts = callbacks.workerCalls[0];
      assert.ok(workerOpts);
      assert.equal(typeof workerOpts.threadId, "string");
      assert.equal(typeof workerOpts.parentThreadId, "string");
      assert.equal(workerOpts.permissionContext, "subagent");
      // SubAgentWorkerOptions 不包含 SubAgentManager
      assert.equal((workerOpts as Record<string, unknown>).subAgentManager, undefined);
    });
  });
});
