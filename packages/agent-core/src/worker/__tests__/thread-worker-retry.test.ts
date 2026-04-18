/**
 * ThreadWorker retry integration tests.
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:977-1003 (error catch)
 *       1132-1140 (retry), 1124-1165 (countdown)
 */
import { describe, expect, test } from "bun:test";
import type { LLMProvider, StreamDelta, StreamParams, SystemPromptBlock } from "@flitter/llm";
import { ProviderError } from "@flitter/llm";
import type { Config, Message, ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject } from "@flitter/util";
import { type OrchestratorCallbacks, ToolOrchestrator } from "../../tools/orchestrator";
import { ToolRegistry } from "../../tools/registry";
import type { AgentEvent } from "../../worker/events";
import { ThreadWorker, type ThreadWorkerOptions } from "../thread-worker";

function makeSnapshot(msgs: Message[] = []): ThreadSnapshot {
  return {
    id: "test-retry",
    v: 1,
    title: null,
    messages: msgs,
    env: "local",
    agentMode: "normal",
    relationships: [],
  } as unknown as ThreadSnapshot;
}

function makeErrorProvider(error: Error): LLMProvider {
  return {
    name: "anthropic",
    async *stream(_params: StreamParams): AsyncGenerator<StreamDelta> {
      throw error;
    },
  } as unknown as LLMProvider;
}

function makeToolOrchestrator(): ToolOrchestrator {
  const registry = new ToolRegistry();
  const callbacks: OrchestratorCallbacks = {
    getConfig: async () => ({ settings: {}, secrets: { getToken: async () => "test" } }) as Config,
    updateThread: async () => {},
    getToolRunEnvironment: async (_id, signal) => ({
      workingDirectory: "/tmp",
      signal,
      threadId: "test-retry",
      config: { settings: {}, secrets: { getToken: async () => "test" } } as Config,
    }),
    applyHookResult: async () => ({ abortOp: false }),
    applyPostHookResult: async () => {},
    updateFileChanges: async () => {},
    getDisposed$: () => new BehaviorSubject(false),
  };
  return new ToolOrchestrator("test-retry", registry, callbacks);
}

function makeWorkerOpts(overrides: Partial<ThreadWorkerOptions> = {}): ThreadWorkerOptions {
  let snapshot = makeSnapshot([
    { role: "user", content: [{ type: "text", text: "hello" }] } as unknown as Message,
  ]);
  const registry = new ToolRegistry();
  return {
    getThreadSnapshot: () => snapshot,
    updateThreadSnapshot: (s) => {
      snapshot = s;
    },
    getMessages: () => snapshot.messages,
    provider: makeErrorProvider(new ProviderError(429, "anthropic", true, "Rate limited")),
    toolOrchestrator: makeToolOrchestrator(),
    buildSystemPrompt: async () => [] as SystemPromptBlock[],
    checkAndCompact: async () => null,
    getConfig: () => ({ settings: {}, secrets: { getToken: async () => "test" } }) as Config,
    toolRegistry: registry,
    ...overrides,
  };
}

describe("ThreadWorker retry integration", () => {
  test("emits retry:start on 429 error", async () => {
    const opts = makeWorkerOpts();
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeDefined();
    expect(retryStart!.type).toBe("retry:start");
    if (retryStart!.type === "retry:start") {
      expect(retryStart!.delaySeconds).toBe(5);
      expect(retryStart!.attempt).toBe(0);
    }

    worker.dispose();
  });

  test("emits inference:error for context-limit errors (not retry:start)", async () => {
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(
        new ProviderError(400, "anthropic", false, "prompt is too long, context limit reached"),
      ),
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeUndefined();

    const errorEvent = events.find((e) => e.type === "inference:error");
    expect(errorEvent).toBeDefined();

    worker.dispose();
  });

  test("does not emit retry:start for non-retryable errors", async () => {
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(new ProviderError(401, "anthropic", false, "Unauthorized")),
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeUndefined();

    const errorEvent = events.find((e) => e.type === "inference:error");
    expect(errorEvent).toBeDefined();

    worker.dispose();
  });
});

describe("ThreadWorker retry-after from provider", () => {
  test("uses retryAfterMs from ProviderError when available", async () => {
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(
        new ProviderError(429, "anthropic", true, "Rate limited", 15000), // 15s retry-after
      ),
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeDefined();
    if (retryStart?.type === "retry:start") {
      // Should use provider's 15s instead of default 5s
      expect(retryStart.delaySeconds).toBe(15);
    }

    worker.dispose();
  });
});

describe("ThreadWorker context-limit auto-compaction", () => {
  test("triggers compaction when context-limit error is detected", async () => {
    let compactionCalled = false;
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(new ProviderError(400, "anthropic", false, "prompt is too long")),
      checkAndCompact: async (snapshot) => {
        compactionCalled = true;
        // Return compacted snapshot (remove first message)
        return { ...snapshot, messages: snapshot.messages.slice(1) };
      },
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    expect(compactionCalled).toBe(true);
    // Should have compaction events
    const compactionStart = events.find((e) => e.type === "compaction:start");
    expect(compactionStart).toBeDefined();

    worker.dispose();
  });
});
