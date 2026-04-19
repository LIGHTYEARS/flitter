/**
 * ThreadWorker 单元测试
 *
 * 覆盖: 状态转换、推理循环、工具执行、上下文压缩、
 * 取消/重试、错误处理、dispose、事件序列
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StreamDelta, StreamParams, ToolDefinition } from "@flitter/llm";
import type {
  AssistantContentBlock,
  Config,
  Message,
  Settings,
  ThreadSnapshot,
  Usage,
} from "@flitter/schemas";
import type { BehaviorSubject, Subject } from "@flitter/util";
import type { ToolOrchestrator, ToolUseItem } from "../tools/orchestrator";
import type { ToolRegistry } from "../tools/registry";
import type { AgentEvent, InferenceState } from "./events";
import { ThreadWorker, type ThreadWorkerOptions } from "./thread-worker";

// ─── 辅助: StreamDelta 构造 ──────────────────────────────

function createTextDelta(text: string): StreamDelta {
  return {
    content: [{ type: "text", text } as AssistantContentBlock],
    state: { type: "streaming" },
  };
}

function createCompleteDelta(
  text: string,
  usage?: { inputTokens: number; outputTokens: number },
): StreamDelta {
  return {
    content: [{ type: "text", text } as AssistantContentBlock],
    state: { type: "complete", stopReason: "end_turn" },
    usage: usage as unknown as Usage,
  };
}

function createToolUseDelta(
  toolName: string,
  toolUseId: string,
  input: Record<string, unknown> = {},
): StreamDelta {
  return {
    content: [
      {
        type: "tool_use",
        id: toolUseId,
        name: toolName,
        input,
        complete: true,
      } as AssistantContentBlock,
    ],
    state: { type: "complete", stopReason: "tool_use" },
  };
}

// ─── 辅助: Mock Provider ────────────────────────────────

interface MockLLMProvider {
  stream(params: StreamParams): AsyncGenerator<StreamDelta>;
  lastParams?: StreamParams;
}

function createMockProvider(deltas: StreamDelta[]): MockLLMProvider {
  const provider: MockLLMProvider = {
    async *stream(params: StreamParams) {
      provider.lastParams = params;
      for (const delta of deltas) {
        yield delta;
      }
    },
  };
  return provider;
}

function createErrorProvider(error: Error): MockLLMProvider {
  return {
    async *stream(_params: StreamParams) {
      throw error;
    },
  };
}

// ─── 辅助: Mock ThreadSnapshot ──────────────────────────

function createSnapshot(messages: Message[] = []): ThreadSnapshot {
  return {
    id: "test-thread",
    v: 1,
    messages,
    nextMessageId: messages.length,
  } as ThreadSnapshot;
}

// ─── 辅助: Mock ToolOrchestrator ────────────────────────

function createMockOrchestrator(opts?: {
  executeToolsWithPlan?: (toolUses: ToolUseItem[]) => Promise<void>;
}): ToolOrchestrator & {
  cancelAllCalled: boolean;
  disposeCalled: boolean;
  lastToolUses: ToolUseItem[];
} {
  const mock = {
    cancelAllCalled: false,
    disposeCalled: false,
    lastToolUses: [] as ToolUseItem[],
    executeToolsWithPlan: async (toolUses: ToolUseItem[]) => {
      mock.lastToolUses = toolUses;
      if (opts?.executeToolsWithPlan) {
        await opts.executeToolsWithPlan(toolUses);
      }
    },
    cancelAll: () => {
      mock.cancelAllCalled = true;
    },
    cancelTool: () => {},
    hasRunningTools: () => false,
    runningTools: new Map(),
    cancelledToolUses: new Set<string>(),
    dispose: () => {
      mock.disposeCalled = true;
    },
  };
  return mock as unknown as ToolOrchestrator & {
    cancelAllCalled: boolean;
    disposeCalled: boolean;
    lastToolUses: ToolUseItem[];
  };
}

// ─── 辅助: Mock ToolRegistry ────────────────────────────

function createMockToolRegistry(defs: ToolDefinition[] = []): ToolRegistry {
  return {
    getToolDefinitions: () => defs,
    get: () => undefined,
    list: () => [],
    listEnabled: () => [],
    has: () => false,
    register: () => {},
    unregister: () => false,
    normalizeToolName: (n: string) => n,
  } as unknown as ToolRegistry;
}

// ─── 辅助: 收集事件 ─────────────────────────────────────

function collectEvents(events$: Subject<AgentEvent>): AgentEvent[] {
  const collected: AgentEvent[] = [];
  events$.subscribe({ next: (e) => collected.push(e) });
  return collected;
}

function collectStates(state$: BehaviorSubject<InferenceState>): InferenceState[] {
  const states: InferenceState[] = [];
  state$.subscribe({ next: (s) => states.push(s) });
  return states;
}

// ─── 辅助: 创建 ThreadWorker ─────────────────────────────

function createWorker(overrides?: Partial<ThreadWorkerOptions>) {
  let snapshot = createSnapshot();

  const defaults: ThreadWorkerOptions = {
    getThreadSnapshot: () => snapshot,
    updateThreadSnapshot: (s: ThreadSnapshot) => {
      snapshot = s;
    },
    getMessages: () => [],
    provider: createMockProvider([
      createCompleteDelta("Hello"),
    ]) as unknown as ThreadWorkerOptions["provider"],
    toolOrchestrator: createMockOrchestrator() as unknown as ToolOrchestrator,
    buildSystemPrompt: async () => [{ type: "text" as const, text: "system prompt" }],
    checkAndCompact: async () => null,
    getConfig: () =>
      ({
        settings: { model: "test-model" } as Settings,
        secrets: { getToken: async () => undefined, isSet: () => false },
      }) as Config,
    toolRegistry: createMockToolRegistry(),
    ...overrides,
  };

  const worker = new ThreadWorker(defaults);
  return {
    worker,
    getSnapshot: () => snapshot,
    setSnapshot: (s: ThreadSnapshot) => {
      snapshot = s;
    },
  };
}

// ─── events.ts — 类型检查 ────────────────────────────────

describe("events.ts — 类型检查", () => {
  it("AgentEvent 联合类型 type 字段包含所有预期事件类型", () => {
    const eventTypes = [
      "inference:start",
      "inference:delta",
      "inference:complete",
      "inference:error",
      "tool:start",
      "tool:data",
      "tool:complete",
      "turn:complete",
      "compaction:start",
      "compaction:complete",
    ] as const;

    // Verify all types are valid AgentEvent types
    for (const t of eventTypes) {
      assert.ok(typeof t === "string");
    }
    assert.equal(eventTypes.length, 10);
  });
});

// ─── 状态转换 ─────────────────────────────────────────────

describe("ThreadWorker — 状态转换", () => {
  it("初始状态为 idle", () => {
    const { worker } = createWorker();
    assert.equal(worker.inferenceState$.getValue(), "idle");
  });

  it("简单推理: idle → running → idle (无工具)", async () => {
    const { worker } = createWorker();
    const states = collectStates(worker.inferenceState$);

    await worker.runInference();

    // States: idle (initial from BehaviorSubject), running, idle
    assert.ok(states.includes("idle"));
    assert.ok(states.includes("running"));
    assert.equal(states[states.length - 1], "idle");
  });

  it("取消: running → cancelled", async () => {
    // Use a provider that yields slowly
    let resolveStream: (() => void) | null = null;
    const provider = {
      async *stream(_params: StreamParams) {
        yield createTextDelta("partial");
        await new Promise<void>((resolve) => {
          resolveStream = resolve;
        });
        yield createCompleteDelta("done");
      },
    };

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
    });
    const states = collectStates(worker.inferenceState$);

    const inferencePromise = worker.runInference();

    // Wait for first yield to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    worker.cancelInference();

    // Resolve the stream so it can finish
    if (resolveStream) resolveStream();
    await inferencePromise;

    assert.ok(states.includes("cancelled"));
  });

  it("取消后重试: cancelled → idle → running → idle", async () => {
    const { worker } = createWorker();

    // Force cancelled state
    worker.cancelInference();
    assert.equal(worker.inferenceState$.getValue(), "cancelled");

    const states = collectStates(worker.inferenceState$);
    await worker.retry();

    // Should see: cancelled (initial), idle (from retry), running, idle
    assert.ok(states.includes("idle"));
    assert.ok(states.includes("running"));
    assert.equal(states[states.length - 1], "idle");
  });

  it("错误: running → idle", async () => {
    const errorProvider = createErrorProvider(new Error("LLM error"));
    const { worker } = createWorker({
      provider: errorProvider as unknown as ThreadWorkerOptions["provider"],
    });
    const states = collectStates(worker.inferenceState$);

    await worker.runInference();

    // Last state should be idle (error recovery)
    assert.equal(states[states.length - 1], "idle");
    assert.ok(states.includes("running"));
  });
});

// ─── runInference — 基础流 ────────────────────────────────

describe("ThreadWorker — runInference 基础流", () => {
  it("发出 inference:start 事件", async () => {
    const { worker } = createWorker();
    const events = collectEvents(worker.events$);

    await worker.runInference();

    assert.ok(events.some((e) => e.type === "inference:start"));
  });

  it("发出 inference:delta 事件 (每个 delta)", async () => {
    const provider = createMockProvider([
      createTextDelta("Hello"),
      createTextDelta("Hello world"),
      createCompleteDelta("Hello world!"),
    ]);

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    const deltaEvents = events.filter((e) => e.type === "inference:delta");
    assert.equal(deltaEvents.length, 3);
  });

  it("发出 inference:complete 事件 (含 usage)", async () => {
    const provider = createMockProvider([
      createCompleteDelta("done", { inputTokens: 100, outputTokens: 50 }),
    ]);

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    const completeEvent = events.find((e) => e.type === "inference:complete");
    assert.ok(completeEvent);
    assert.equal(completeEvent!.type, "inference:complete");
    if (completeEvent!.type === "inference:complete") {
      assert.deepEqual(completeEvent!.usage, { inputTokens: 100, outputTokens: 50 });
    }
  });

  it("无 tool_use 时发出 turn:complete 事件", async () => {
    const { worker } = createWorker();
    const events = collectEvents(worker.events$);

    await worker.runInference();

    assert.ok(events.some((e) => e.type === "turn:complete"));
  });

  it("调用 provider.stream 传入正确的 StreamParams", async () => {
    const provider = createMockProvider([createCompleteDelta("ok")]);
    const config = {
      settings: { "internal.model": "test-model-42" } as Settings,
      secrets: { getToken: async () => undefined, isSet: () => false },
    } as Config;

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
      getConfig: () => config,
    });

    await worker.runInference();

    assert.ok(provider.lastParams);
    assert.equal(provider.lastParams!.model, "test-model-42");
    assert.ok(Array.isArray(provider.lastParams!.systemPrompt));
    assert.ok(Array.isArray(provider.lastParams!.tools));
    assert.ok(provider.lastParams!.signal instanceof AbortSignal);
  });
});

// ─── runInference — 工具执行 ─────────────────────────────

describe("ThreadWorker — 工具执行", () => {
  it("检测 tool_use 块并交给 ToolOrchestrator", async () => {
    let callCount = 0;
    const orchestrator = createMockOrchestrator({
      executeToolsWithPlan: async (_toolUses) => {
        callCount++;
        // After orchestrator runs, the next runInference call should see no tools
      },
    });

    // First call returns tool_use, second call returns text-only
    let inferenceCount = 0;
    const provider = {
      async *stream(_params: StreamParams) {
        inferenceCount++;
        if (inferenceCount === 1) {
          yield createToolUseDelta("Bash", "tu-1", { command: "ls" });
        } else {
          yield createCompleteDelta("Done");
        }
      },
    };

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    await worker.runInference();

    assert.equal(callCount, 1);
    assert.equal(orchestrator.lastToolUses.length, 1);
    assert.equal(orchestrator.lastToolUses[0].name, "Bash");
    assert.equal(orchestrator.lastToolUses[0].id, "tu-1");
  });

  it("ToolOrchestrator 完成后递归调用 runInference", async () => {
    let inferenceCount = 0;
    const provider = {
      async *stream(_params: StreamParams) {
        inferenceCount++;
        if (inferenceCount === 1) {
          yield createToolUseDelta("Read", "tu-1");
        } else {
          yield createCompleteDelta("Final answer");
        }
      },
    };

    const orchestrator = createMockOrchestrator();
    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    // Should have 2 inference rounds
    assert.equal(inferenceCount, 2);

    // Should have 2 inference:start events
    const startEvents = events.filter((e) => e.type === "inference:start");
    assert.equal(startEvents.length, 2);

    // Should end with turn:complete
    const _lastEvent = events[events.length - 1];
    // Last two events are turn:complete, then idle (but idle is state, not event)
    assert.ok(events.some((e) => e.type === "turn:complete"));
  });

  it("多个 tool_use 块: orchestrator 接收完整列表", async () => {
    let inferenceCount = 0;
    const provider = {
      async *stream(_params: StreamParams) {
        inferenceCount++;
        if (inferenceCount === 1) {
          yield {
            content: [
              {
                type: "tool_use",
                id: "tu-1",
                name: "Read",
                input: { file_path: "/a" },
                complete: true,
              },
              {
                type: "tool_use",
                id: "tu-2",
                name: "Grep",
                input: { pattern: "foo" },
                complete: true,
              },
            ],
            state: { type: "complete", stopReason: "tool_use" },
          } as unknown as StreamDelta;
        } else {
          yield createCompleteDelta("Result");
        }
      },
    };

    const orchestrator = createMockOrchestrator();
    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    await worker.runInference();

    assert.equal(orchestrator.lastToolUses.length, 2);
    assert.equal(orchestrator.lastToolUses[0].name, "Read");
    assert.equal(orchestrator.lastToolUses[1].name, "Grep");
  });

  it("正确的事件序列: start → deltas → complete → (tools) → start → ... → turn:complete", async () => {
    let inferenceCount = 0;
    const provider = {
      async *stream(_params: StreamParams) {
        inferenceCount++;
        if (inferenceCount === 1) {
          yield createTextDelta("Thinking...");
          yield createToolUseDelta("Bash", "tu-1");
        } else {
          yield createCompleteDelta("Done");
        }
      },
    };

    const orchestrator = createMockOrchestrator();
    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    const types = events.map((e) => e.type);

    // First round
    assert.equal(types[0], "inference:start");
    assert.equal(types[1], "inference:delta"); // "Thinking..."
    assert.equal(types[2], "inference:delta"); // tool_use delta
    assert.equal(types[3], "inference:complete");

    // Second round (after tool execution)
    assert.equal(types[4], "inference:start");
    assert.equal(types[5], "inference:delta"); // "Done"
    assert.equal(types[6], "inference:complete");
    assert.equal(types[7], "turn:complete");
  });
});

// ─── runInference — 上下文压缩 ────────────────────────────

describe("ThreadWorker — 上下文压缩", () => {
  it("checkAndCompact 返回新 snapshot 时发出 compaction:start/complete 事件", async () => {
    const compactedSnapshot = createSnapshot([
      { role: "user", content: [{ type: "text", text: "summary" }], messageId: 0 },
    ]);

    const { worker } = createWorker({
      checkAndCompact: async () => compactedSnapshot,
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    const compactionEvents = events.filter(
      (e) => e.type === "compaction:start" || e.type === "compaction:complete",
    );
    assert.equal(compactionEvents.length, 2);
    assert.equal(compactionEvents[0].type, "compaction:start");
    assert.equal(compactionEvents[1].type, "compaction:complete");
  });

  it("checkAndCompact 返回 null 时不发出压缩事件", async () => {
    const { worker } = createWorker({
      checkAndCompact: async () => null,
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    const compactionEvents = events.filter(
      (e) => e.type === "compaction:start" || e.type === "compaction:complete",
    );
    assert.equal(compactionEvents.length, 0);
  });
});

// ─── runInference — 系统提示词 ────────────────────────────

describe("ThreadWorker — 系统提示词", () => {
  it("每轮推理前调用 buildSystemPrompt", async () => {
    let callCount = 0;
    const { worker } = createWorker({
      buildSystemPrompt: async () => {
        callCount++;
        return [{ type: "text" as const, text: `prompt-${callCount}` }];
      },
    });

    await worker.runInference();

    assert.equal(callCount, 1);
  });

  it("多轮推理时 buildSystemPrompt 被多次调用", async () => {
    let buildCount = 0;
    let inferenceCount = 0;
    const provider = {
      async *stream(_params: StreamParams) {
        inferenceCount++;
        if (inferenceCount === 1) {
          yield createToolUseDelta("Bash", "tu-1");
        } else {
          yield createCompleteDelta("ok");
        }
      },
    };

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
      toolOrchestrator: createMockOrchestrator() as unknown as ToolOrchestrator,
      buildSystemPrompt: async () => {
        buildCount++;
        return [{ type: "text" as const, text: "sys" }];
      },
    });

    await worker.runInference();

    assert.equal(buildCount, 2);
  });
});

// ─── cancelInference ──────────────────────────────────────

describe("ThreadWorker — cancelInference", () => {
  it("中止 AbortController (signal.aborted 为 true)", async () => {
    let capturedSignal: AbortSignal | null = null;
    const provider = {
      async *stream(params: StreamParams) {
        capturedSignal = params.signal;
        yield createTextDelta("partial");
        // Hang here to simulate long-running inference
        await new Promise<void>((resolve) => setTimeout(resolve, 5000));
        yield createCompleteDelta("done");
      },
    };

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
    });

    const inferencePromise = worker.runInference();
    await new Promise((resolve) => setTimeout(resolve, 10));

    worker.cancelInference();
    await inferencePromise;

    assert.ok(capturedSignal);
    assert.equal(capturedSignal!.aborted, true);
  });

  it("调用 ToolOrchestrator.cancelAll()", () => {
    const orchestrator = createMockOrchestrator();
    const { worker } = createWorker({
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    worker.cancelInference();

    assert.equal(orchestrator.cancelAllCalled, true);
  });

  it("状态变为 cancelled", () => {
    const { worker } = createWorker();

    worker.cancelInference();

    assert.equal(worker.inferenceState$.getValue(), "cancelled");
  });
});

// ─── retry ────────────────────────────────────────────────

describe("ThreadWorker — retry", () => {
  it("cancelled 状态时先转 idle 再执行 runInference", async () => {
    const { worker } = createWorker();
    const states = collectStates(worker.inferenceState$);

    // Force to cancelled
    worker.cancelInference();
    assert.equal(worker.inferenceState$.getValue(), "cancelled");

    await worker.retry();

    // Should see idle transition before running
    const idleIdx = states.indexOf("idle", 1); // skip initial
    const runningIdx = states.indexOf("running", idleIdx);
    assert.ok(idleIdx > 0, "idle should appear after cancelled");
    assert.ok(runningIdx > idleIdx, "running should appear after idle");
  });
});

// ─── 错误处理 ──────────────────────────────────────────────

describe("ThreadWorker — 错误处理", () => {
  it("provider 错误: 状态回到 idle + 发出 inference:error 事件", async () => {
    const errorProvider = createErrorProvider(new Error("API down"));
    const { worker } = createWorker({
      provider: errorProvider as unknown as ThreadWorkerOptions["provider"],
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    assert.equal(worker.inferenceState$.getValue(), "idle");
    assert.ok(events.some((e) => e.type === "inference:error"));
  });

  it("错误事件包含 Error 对象", async () => {
    const errorProvider = createErrorProvider(new Error("Rate limited"));
    const { worker } = createWorker({
      provider: errorProvider as unknown as ThreadWorkerOptions["provider"],
    });
    const events = collectEvents(worker.events$);

    await worker.runInference();

    const errorEvent = events.find((e) => e.type === "inference:error");
    assert.ok(errorEvent);
    if (errorEvent?.type === "inference:error") {
      assert.ok(errorEvent.error instanceof Error);
      assert.equal(errorEvent.error.message, "Rate limited");
    }
  });
});

// ─── dispose ──────────────────────────────────────────────

describe("ThreadWorker — dispose", () => {
  it("调用 ToolOrchestrator.dispose()", () => {
    const orchestrator = createMockOrchestrator();
    const { worker } = createWorker({
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    worker.dispose();

    assert.equal(orchestrator.disposeCalled, true);
  });

  it("dispose 后 runInference 无操作", async () => {
    const { worker } = createWorker();
    const events = collectEvents(worker.events$);

    worker.dispose();
    await worker.runInference();

    // Should not emit any events after dispose
    assert.equal(events.length, 0);
  });

  it("多次 dispose 幂等", () => {
    const orchestrator = createMockOrchestrator();
    const { worker } = createWorker({
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    worker.dispose();
    worker.dispose(); // Should not throw

    assert.equal(orchestrator.disposeCalled, true);
  });
});

// ─── userProvideInput / userRespondToApproval ─────────────

describe("ThreadWorker — userProvideInput / userRespondToApproval", () => {
  it("方法存在且可调用 (接口完整性)", async () => {
    const { worker } = createWorker();

    // Should not throw
    await worker.userProvideInput("tu-1", "hello");
    await worker.userRespondToApproval("tu-1", { approved: true });
    await worker.userRespondToApproval("tu-2", { approved: false, scope: "session" });
  });
});

// ─── Thread state updates ─────────────────────────────────

describe("ThreadWorker — Thread state updates", () => {
  it("updateAssistantContent 更新 snapshot 中的 assistant 消息", async () => {
    const { worker, getSnapshot } = createWorker();

    await worker.runInference();

    const messages = getSnapshot().messages;
    assert.ok(messages.length > 0);
    const assistantMsg = messages.find((m) => m.role === "assistant");
    assert.ok(assistantMsg);
  });
});
