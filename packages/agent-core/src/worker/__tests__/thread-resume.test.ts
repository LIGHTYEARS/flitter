/**
 * Thread Resume & Stream Recovery tests
 *
 * Tests for:
 * 1. resume() — detects and truncates incomplete streaming messages
 * 2. hasIncompleteToolUse() — detects tool_use blocks with empty/missing input
 * 3. Message queue — buffers user messages during tool execution, dequeues on turn complete
 *
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:259-270 (resume)
 *        amp-cli-reversed/modules/1244_ThreadWorker_ov.js:949-970 (incomplete tool_use detection)
 *        amp-cli-reversed/modules/1244_ThreadWorker_ov.js:528-561, 431-437, 661-662 (message queue)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StreamDelta, StreamParams } from "@flitter/llm";
import type {
  AssistantContentBlock,
  Config,
  Message,
  Settings,
  ThreadSnapshot,
} from "@flitter/schemas";
import type { ToolOrchestrator, ToolUseItem } from "../../tools/orchestrator";
import type { ToolRegistry } from "../../tools/registry";
import { hasIncompleteToolUse, ThreadWorker, type ThreadWorkerOptions } from "../thread-worker";

// ─── Helpers ────────────────────────────────────────────────

function createSnapshot(messages: Message[] = []): ThreadSnapshot {
  return {
    id: "test-thread",
    v: 1,
    messages,
    nextMessageId: messages.length,
  } as ThreadSnapshot;
}

function createMockOrchestrator(opts?: {
  hasRunningTools?: () => boolean;
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
    hasRunningTools: opts?.hasRunningTools ?? (() => false),
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

function createMockToolRegistry(): ToolRegistry {
  return {
    getToolDefinitions: () => [],
    get: () => undefined,
    list: () => [],
    listEnabled: () => [],
    has: () => false,
    register: () => {},
    unregister: () => false,
    normalizeToolName: (n: string) => n,
  } as unknown as ToolRegistry;
}

function createCompleteDelta(text: string): StreamDelta {
  return {
    content: [{ type: "text", text } as AssistantContentBlock],
    state: { type: "complete", stopReason: "end_turn" },
  };
}

function createMockProvider(deltas: StreamDelta[]) {
  return {
    async *stream(_params: StreamParams) {
      for (const delta of deltas) {
        yield delta;
      }
    },
  };
}

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

// ─── Task 1: resume() ──────────────────────────────────────

describe("ThreadWorker — resume()", () => {
  it("truncates the last message if it has state.type === 'streaming'", () => {
    const streamingMsg = {
      role: "assistant" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "partial response..." }],
      state: { type: "streaming" as const },
    };
    const userMsg = {
      role: "user" as const,
      messageId: 0,
      content: [{ type: "text" as const, text: "hello" }],
    };

    const { worker, getSnapshot, setSnapshot } = createWorker();
    setSnapshot(createSnapshot([userMsg, streamingMsg] as unknown as Message[]));

    worker.resume();

    // After resume, the streaming message should be truncated
    const messages = getSnapshot().messages;
    assert.equal(messages.length, 1, "streaming assistant message should be removed");
    assert.equal(messages[0].role, "user");
  });

  it("does nothing if last message state is 'complete'", () => {
    const completeMsg = {
      role: "assistant" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "full response" }],
      state: { type: "complete" as const, stopReason: "end_turn" as const },
    };
    const userMsg = {
      role: "user" as const,
      messageId: 0,
      content: [{ type: "text" as const, text: "hello" }],
    };

    const { worker, getSnapshot, setSnapshot } = createWorker();
    setSnapshot(createSnapshot([userMsg, completeMsg] as unknown as Message[]));

    worker.resume();

    const messages = getSnapshot().messages;
    assert.equal(messages.length, 2, "complete assistant message should remain");
  });

  it("does nothing if last message is a user message", () => {
    const userMsg = {
      role: "user" as const,
      messageId: 0,
      content: [{ type: "text" as const, text: "hello" }],
    };

    const { worker, getSnapshot, setSnapshot } = createWorker();
    setSnapshot(createSnapshot([userMsg] as unknown as Message[]));

    worker.resume();

    const messages = getSnapshot().messages;
    assert.equal(messages.length, 1);
    assert.equal(messages[0].role, "user");
  });

  it("is idempotent — second call is a no-op", () => {
    const streamingMsg = {
      role: "assistant" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "partial" }],
      state: { type: "streaming" as const },
    };
    const userMsg = {
      role: "user" as const,
      messageId: 0,
      content: [{ type: "text" as const, text: "hello" }],
    };

    const { worker, getSnapshot, setSnapshot } = createWorker();
    setSnapshot(createSnapshot([userMsg, streamingMsg] as unknown as Message[]));

    worker.resume();
    assert.equal(getSnapshot().messages.length, 1);

    // Add another streaming message to simulate further state changes
    setSnapshot(
      createSnapshot([
        userMsg,
        {
          role: "assistant" as const,
          messageId: 2,
          content: [{ type: "text" as const, text: "another streaming" }],
          state: { type: "streaming" as const },
        },
      ] as unknown as Message[]),
    );

    // Second resume should be no-op
    worker.resume();
    assert.equal(getSnapshot().messages.length, 2, "second resume should not truncate again");
  });

  it("does nothing on empty thread", () => {
    const { worker, getSnapshot } = createWorker();

    worker.resume();

    assert.equal(getSnapshot().messages.length, 0);
  });
});

// ─── Task 2: hasIncompleteToolUse() ─────────────────────────

describe("hasIncompleteToolUse()", () => {
  it("returns true when tool_use has complete=true but empty input", () => {
    const content: AssistantContentBlock[] = [
      {
        type: "tool_use",
        id: "tu-1",
        name: "Bash",
        complete: true,
        input: {},
      } as AssistantContentBlock,
    ];
    assert.equal(hasIncompleteToolUse(content), true);
  });

  it("returns false when tool_use has complete=true and non-empty input", () => {
    const content: AssistantContentBlock[] = [
      {
        type: "tool_use",
        id: "tu-1",
        name: "Bash",
        complete: true,
        input: { command: "ls" },
      } as AssistantContentBlock,
    ];
    assert.equal(hasIncompleteToolUse(content), false);
  });

  it("returns false when tool_use has complete=false (still streaming)", () => {
    const content: AssistantContentBlock[] = [
      {
        type: "tool_use",
        id: "tu-1",
        name: "Bash",
        complete: false,
        input: {},
      } as AssistantContentBlock,
    ];
    assert.equal(hasIncompleteToolUse(content), false);
  });

  it("returns true when input is undefined (treated as empty)", () => {
    const content = [
      {
        type: "tool_use",
        id: "tu-1",
        name: "Bash",
        complete: true,
        // input is undefined
      },
    ] as unknown as AssistantContentBlock[];
    assert.equal(hasIncompleteToolUse(content), true);
  });

  it("returns false for text-only content", () => {
    const content: AssistantContentBlock[] = [
      { type: "text", text: "hello" } as AssistantContentBlock,
    ];
    assert.equal(hasIncompleteToolUse(content), false);
  });

  it("returns false for empty content array", () => {
    assert.equal(hasIncompleteToolUse([]), false);
  });

  it("detects incomplete tool_use among multiple blocks", () => {
    const content: AssistantContentBlock[] = [
      { type: "text", text: "Let me run this" } as AssistantContentBlock,
      {
        type: "tool_use",
        id: "tu-1",
        name: "Read",
        complete: true,
        input: { file_path: "/a" },
      } as AssistantContentBlock,
      {
        type: "tool_use",
        id: "tu-2",
        name: "Bash",
        complete: true,
        input: {},
      } as AssistantContentBlock,
    ];
    assert.equal(hasIncompleteToolUse(content), true);
  });
});

// ─── Task 3: Message queue ──────────────────────────────────

describe("ThreadWorker — message queue", () => {
  it("queuedMessageCount starts at 0", () => {
    const { worker } = createWorker();
    assert.equal(worker.queuedMessageCount, 0);
  });

  it("enqueueMessage processes immediately when idle (no running tools)", async () => {
    const userMsg = {
      role: "user" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "hello" }],
    } as unknown as Message;

    const { worker, getSnapshot } = createWorker();

    // Worker is idle, no running tools — should process immediately
    worker.enqueueMessage(userMsg);

    // Message should be appended to snapshot, not queued
    assert.equal(worker.queuedMessageCount, 0);
    const messages = getSnapshot().messages;
    assert.equal(messages.length, 1);
    assert.equal(messages[0].role, "user");
  });

  it("enqueueMessage buffers when running + tools active", () => {
    const orchestrator = createMockOrchestrator({
      hasRunningTools: () => true,
    });

    const { worker } = createWorker({
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    // Force state to running
    worker.inferenceState$.next("running");

    const userMsg = {
      role: "user" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "follow-up" }],
    } as unknown as Message;

    worker.enqueueMessage(userMsg);

    assert.equal(worker.queuedMessageCount, 1);
  });

  it("enqueueMessage processes immediately when cancelled", () => {
    const { worker, getSnapshot } = createWorker();

    // Force to cancelled
    worker.cancelInference();

    const userMsg = {
      role: "user" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "retry this" }],
    } as unknown as Message;

    worker.enqueueMessage(userMsg);

    // Should process immediately, not queue
    assert.equal(worker.queuedMessageCount, 0);
    const messages = getSnapshot().messages;
    assert.equal(messages.length, 1);
  });

  it("dequeueMessage shifts first message from queue and appends to snapshot", () => {
    const orchestrator = createMockOrchestrator({
      hasRunningTools: () => true,
    });

    const { worker, getSnapshot } = createWorker({
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    // Force state to running
    worker.inferenceState$.next("running");

    const msg1 = {
      role: "user" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "first" }],
    } as unknown as Message;
    const msg2 = {
      role: "user" as const,
      messageId: 2,
      content: [{ type: "text" as const, text: "second" }],
    } as unknown as Message;

    worker.enqueueMessage(msg1);
    worker.enqueueMessage(msg2);
    assert.equal(worker.queuedMessageCount, 2);

    worker.dequeueMessage();
    assert.equal(worker.queuedMessageCount, 1);

    // First message should be in snapshot
    const messages = getSnapshot().messages;
    assert.equal(messages.length, 1);
    assert.equal(
      (messages[0] as unknown as { content: Array<{ text: string }> }).content[0].text,
      "first",
    );
  });

  it("dequeueMessage is a no-op when queue is empty", () => {
    const { worker, getSnapshot } = createWorker();

    worker.dequeueMessage();

    assert.equal(getSnapshot().messages.length, 0);
    assert.equal(worker.queuedMessageCount, 0);
  });

  it("turn:complete triggers dequeue of queued messages", async () => {
    let inferenceCount = 0;
    const provider = {
      async *stream(_params: StreamParams) {
        inferenceCount++;
        if (inferenceCount <= 1) {
          yield createCompleteDelta("Done");
        } else {
          // Second run after dequeue
          yield createCompleteDelta("Response to queued");
        }
      },
    };

    const orchestrator = createMockOrchestrator({
      hasRunningTools: () => inferenceCount === 0, // running tools only before first inference
    });

    const { worker } = createWorker({
      provider: provider as unknown as ThreadWorkerOptions["provider"],
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    // Manually put a queued message in
    const queuedMsg = {
      role: "user" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "queued msg" }],
    } as unknown as Message;

    // Force running + tools to buffer
    worker.inferenceState$.next("running");
    worker.enqueueMessage(queuedMsg);
    assert.equal(worker.queuedMessageCount, 1);

    // Now reset to idle to run inference
    worker.inferenceState$.next("idle");

    // Run inference — on turn:complete, should dequeue
    await worker.runInference();

    // The queued message should have been dequeued
    assert.equal(worker.queuedMessageCount, 0);
  });

  it("multiple queued messages dequeue one at a time on turn:complete", () => {
    const orchestrator = createMockOrchestrator({
      hasRunningTools: () => true,
    });

    const { worker } = createWorker({
      toolOrchestrator: orchestrator as unknown as ToolOrchestrator,
    });

    // Force state to running
    worker.inferenceState$.next("running");

    const msg1 = {
      role: "user" as const,
      messageId: 1,
      content: [{ type: "text" as const, text: "first" }],
    } as unknown as Message;
    const msg2 = {
      role: "user" as const,
      messageId: 2,
      content: [{ type: "text" as const, text: "second" }],
    } as unknown as Message;

    worker.enqueueMessage(msg1);
    worker.enqueueMessage(msg2);
    assert.equal(worker.queuedMessageCount, 2);

    // Dequeue one
    worker.dequeueMessage();
    assert.equal(worker.queuedMessageCount, 1);

    // Dequeue another
    worker.dequeueMessage();
    assert.equal(worker.queuedMessageCount, 0);
  });
});
