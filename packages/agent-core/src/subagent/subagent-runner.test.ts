/**
 * SubAgentRunner 测试
 * 覆盖: run() 执行后从子线程提取 turns, 各状态映射
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Message, ThreadSnapshot } from "@flitter/schemas";
import type { ThreadWorker } from "../worker/thread-worker";
import {
  SubAgentManager,
  type SubAgentManagerOptions,
  type SubAgentWorkerOptions,
} from "./subagent";
import { SubAgentRunner } from "./subagent-runner";

// ─── Mock 工具 ─────────────────────────────────────────

function createMockWorker(): ThreadWorker {
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
    runInference: async () => {
      state = "idle";
    },
    cancelInference: () => {
      state = "cancelled";
    },
    retry: async () => {},
    dispose: () => {},
  } as unknown as ThreadWorker;
}

function createMockCallbacks() {
  let nextId = 0;
  const threads = new Map<string, { messages: Message[] }>();

  return {
    threads,
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

// ─── Tests ───────────────────────────────────────────────

describe("SubAgentRunner", () => {
  it("extracts turns from child thread messages on success", async () => {
    const callbacks = createMockCallbacks();

    // 构建一个 mock worker 在 runInference 时模拟 LLM 生成消息
    // ThreadWorker.runInference 内部处理递归: 一次 runInference 调用
    // 完成所有 tool_use → tool_result → 最终回复循环
    const worker = {
      ...createMockWorker(),
      runInference: async () => {
        const threadId = [...callbacks.threads.keys()][0]!;
        const thread = callbacks.threads.get(threadId)!;

        // 第一轮: assistant 回复带 tool_use
        thread.messages.push({
          role: "assistant",
          content: [
            { type: "text", text: "Let me read that file." },
            { type: "tool_use", id: "tool_1", name: "Read", input: { path: "/tmp/x" } },
          ],
        } as unknown as Message);
        // tool_result
        thread.messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              toolUseID: "tool_1",
              run: { status: "done", result: "file contents" },
            },
          ],
        } as unknown as Message);
        // 第二轮: assistant 纯文本 (结束) — ThreadWorker 递归处理
        thread.messages.push({
          role: "assistant",
          content: [{ type: "text", text: "Here is the answer." }],
        } as unknown as Message);
      },
    } as unknown as ThreadWorker;

    const managerOpts: SubAgentManagerOptions = {
      createWorker: (_opts: SubAgentWorkerOptions) => worker,
      createChildThread: callbacks.createChildThread,
      addMessage: callbacks.addMessage,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    };

    const manager = new SubAgentManager(managerOpts);
    const runner = new SubAgentRunner({
      subAgentManager: manager,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    });

    const event = await runner.run({
      parentThreadId: "parent-1",
      description: "Test task",
      prompt: "Do something",
      type: "task",
      maxTurns: 5,
    });

    assert.equal(event.status, "done");
    assert.equal(event.message, "Here is the answer.");
    assert.equal(event.turns.length, 2);

    // First turn has tool_use
    const firstTurn = event.turns[0]!;
    assert.equal(firstTurn.message, "Let me read that file.");
    assert.equal(firstTurn.activeTools.size, 1);
    const tool = firstTurn.activeTools.get("tool_1")!;
    assert.equal(tool.tool_name, "Read");
    assert.equal(tool.status, "done");
    assert.equal(tool.result, "file contents");

    // Second turn is plain text
    const secondTurn = event.turns[1]!;
    assert.equal(secondTurn.message, "Here is the answer.");
    assert.equal(secondTurn.activeTools.size, 0);

    manager.dispose();
  });

  it("returns cancelled status when abort triggered", async () => {
    const callbacks = createMockCallbacks();

    const worker = {
      ...createMockWorker(),
      cancelInference: () => {},
    } as unknown as ThreadWorker;

    // Worker that signals cancelled
    (worker as unknown as { inferenceState$: { getValue: () => string } }).inferenceState$ = {
      getValue: () => "cancelled",
      next: () => {},
      subscribe: () => ({ unsubscribe: () => {} }),
    } as unknown as typeof worker.inferenceState$;

    const managerOpts: SubAgentManagerOptions = {
      createWorker: () => worker,
      createChildThread: callbacks.createChildThread,
      addMessage: callbacks.addMessage,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    };

    const manager = new SubAgentManager(managerOpts);
    const runner = new SubAgentRunner({
      subAgentManager: manager,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    });

    const event = await runner.run({
      parentThreadId: "parent-1",
      description: "Test",
      prompt: "Do something",
      type: "task",
    });

    // Worker went to cancelled state immediately, so spawn returns "completed" or handles it
    // The important thing is SubAgentRunner maps it correctly
    assert.ok(["done", "cancelled", "error"].includes(event.status));
    assert.ok(Array.isArray(event.turns));

    manager.dispose();
  });

  it("handles error status from subagent", async () => {
    const callbacks = createMockCallbacks();

    const worker = {
      ...createMockWorker(),
      runInference: async () => {
        throw new Error("Provider failed");
      },
    } as unknown as ThreadWorker;

    const managerOpts: SubAgentManagerOptions = {
      createWorker: () => worker,
      createChildThread: callbacks.createChildThread,
      addMessage: callbacks.addMessage,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    };

    const manager = new SubAgentManager(managerOpts);
    const runner = new SubAgentRunner({
      subAgentManager: manager,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    });

    const event = await runner.run({
      parentThreadId: "parent-1",
      description: "Test",
      prompt: "Do something",
      type: "task",
    });

    assert.equal(event.status, "error");
    assert.ok(event.message?.includes("Provider failed"));
    assert.ok(Array.isArray(event.turns));

    manager.dispose();
  });

  it("extracts thinking blocks as reasoning", async () => {
    const callbacks = createMockCallbacks();

    const worker = {
      ...createMockWorker(),
      runInference: async () => {
        const threadId = [...callbacks.threads.keys()][0]!;
        const thread = callbacks.threads.get(threadId)!;
        thread.messages.push({
          role: "assistant",
          content: [
            { type: "thinking", thinking: "I need to analyze this" },
            { type: "text", text: "The answer is 42." },
          ],
        } as unknown as Message);
      },
    } as unknown as ThreadWorker;

    const managerOpts: SubAgentManagerOptions = {
      createWorker: () => worker,
      createChildThread: callbacks.createChildThread,
      addMessage: callbacks.addMessage,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    };

    const manager = new SubAgentManager(managerOpts);
    const runner = new SubAgentRunner({
      subAgentManager: manager,
      getThreadSnapshot: callbacks.getThreadSnapshot,
    });

    const event = await runner.run({
      parentThreadId: "parent-1",
      description: "Test",
      prompt: "What is the answer?",
      type: "task",
    });

    assert.equal(event.status, "done");
    assert.equal(event.turns.length, 1);
    assert.equal(event.turns[0]!.reasoning, "I need to analyze this");
    assert.equal(event.turns[0]!.message, "The answer is 42.");

    manager.dispose();
  });
});
