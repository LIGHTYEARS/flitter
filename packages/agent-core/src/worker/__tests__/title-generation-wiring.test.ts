/**
 * Tests for triggerTitleGeneration wiring in ThreadWorker
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:750-793
 */
import { describe, expect, it, mock } from "bun:test";
import type { LLMProvider, StreamDelta, StreamParams, SystemPromptBlock } from "@flitter/llm";
import type { AssistantContentBlock, Config, Message, ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject, Subject } from "@flitter/util";
import type { TitleGenerationProvider } from "../../title/generate-title";
import type { ToolOrchestrator } from "../../tools/orchestrator";
import type { ToolRegistry } from "../../tools/registry";
import type { ToolDefinition } from "../../tools/types";
import { ThreadWorker, type ThreadWorkerOptions } from "../thread-worker";

// ─── Helpers ─────────────────────────────────────────────

function createMockSnapshot(overrides?: Partial<ThreadSnapshot>): ThreadSnapshot {
  return {
    id: "thread-1",
    v: 1,
    messages: [],
    ...overrides,
  };
}

function createMockProvider(): LLMProvider {
  return {
    name: "mock" as const,
    stream: async function* (_params: StreamParams): AsyncGenerator<StreamDelta> {
      yield {
        content: [{ type: "text", text: "Hello" }],
        state: "complete",
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}

function createMockToolOrchestrator(): ToolOrchestrator {
  return {
    executeToolsWithPlan: mock(() => Promise.resolve()),
    cancelAll: mock(() => {}),
    dispose: mock(() => {}),
    hasRunningTools: mock(() => false),
  } as unknown as ToolOrchestrator;
}

function createMockToolRegistry(): ToolRegistry {
  return {
    getToolDefinitions: mock((): ToolDefinition[] => []),
  } as unknown as ToolRegistry;
}

function createWorkerOptions(
  snapshot: ThreadSnapshot,
  overrides?: Partial<ThreadWorkerOptions>,
): ThreadWorkerOptions {
  let currentSnapshot = snapshot;
  return {
    getThreadSnapshot: () => currentSnapshot,
    updateThreadSnapshot: (s: ThreadSnapshot) => {
      currentSnapshot = s;
    },
    getMessages: () => [] as Message[],
    provider: createMockProvider(),
    toolOrchestrator: createMockToolOrchestrator(),
    buildSystemPrompt: async (): Promise<SystemPromptBlock[]> => [],
    checkAndCompact: async () => null,
    getConfig: (): Config => ({
      settings: { model: "test" } as Config["settings"],
      secrets: { getToken: async () => "test-key" },
    }),
    toolRegistry: createMockToolRegistry(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("ThreadWorker.triggerTitleGeneration", () => {
  it("skips title generation if thread already has a title", async () => {
    const snapshot = createMockSnapshot({
      title: "Existing title",
      messages: [
        {
          role: "user",
          messageId: 1,
          content: [{ type: "text", text: "Hello" }],
        } as Message,
      ],
    });

    let titleProviderCalled = false;
    const titleProvider: TitleGenerationProvider = {
      createMessage: async () => {
        titleProviderCalled = true;
        return {
          content: [{ type: "tool_use", id: "t1", name: "set_title", input: { title: "New" } }],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    };

    const opts = createWorkerOptions(snapshot, { titleProvider });
    const worker = new ThreadWorker(opts);

    // Call runInference — it will stream, but triggerTitleGeneration should bail early
    try {
      await worker.runInference();
    } catch {
      // Ignore errors from the mock stream
    }

    // Title provider should NOT have been called
    expect(titleProviderCalled).toBe(false);

    worker.dispose();
  });

  it("skips title generation if thread is a child thread (has mainThreadID)", async () => {
    const snapshot = createMockSnapshot({
      messages: [
        {
          role: "user",
          messageId: 1,
          content: [{ type: "text", text: "Hello" }],
        } as Message,
      ],
    });
    // Set mainThreadID to indicate child thread
    (snapshot as Record<string, unknown>).mainThreadID = "parent-thread";

    let titleProviderCalled = false;
    const titleProvider: TitleGenerationProvider = {
      createMessage: async () => {
        titleProviderCalled = true;
        return {
          content: [{ type: "tool_use", id: "t1", name: "set_title", input: { title: "New" } }],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    };

    const opts = createWorkerOptions(snapshot, { titleProvider });
    const worker = new ThreadWorker(opts);

    try {
      await worker.runInference();
    } catch {
      // Ignore
    }

    expect(titleProviderCalled).toBe(false);

    worker.dispose();
  });

  it("skips title generation if no user message with text", async () => {
    const snapshot = createMockSnapshot({
      messages: [
        {
          role: "user",
          messageId: 1,
          content: [{ type: "tool_result", toolUseID: "t1", output: "ok" }],
        } as Message,
      ],
    });

    let titleProviderCalled = false;
    const titleProvider: TitleGenerationProvider = {
      createMessage: async () => {
        titleProviderCalled = true;
        return {
          content: [{ type: "tool_use", id: "t1", name: "set_title", input: { title: "New" } }],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    };

    const opts = createWorkerOptions(snapshot, { titleProvider });
    const worker = new ThreadWorker(opts);

    try {
      await worker.runInference();
    } catch {
      // Ignore
    }

    expect(titleProviderCalled).toBe(false);

    worker.dispose();
  });

  it("calls generateThreadTitle for eligible thread and updates title", async () => {
    const snapshot = createMockSnapshot({
      messages: [
        {
          role: "user",
          messageId: 1,
          content: [{ type: "text", text: "Fix the login bug" }],
        } as Message,
      ],
    });

    let titleProviderCalled = false;
    let resolveTitle: (() => void) | null = null;
    const titleReady = new Promise<void>((r) => {
      resolveTitle = r;
    });

    const titleProvider: TitleGenerationProvider = {
      createMessage: async () => {
        titleProviderCalled = true;
        return {
          content: [
            {
              type: "tool_use",
              id: "t1",
              name: "set_title",
              input: { title: "Fix login bug" },
            },
          ],
          usage: { input_tokens: 100, output_tokens: 20 },
        };
      },
    };

    const opts = createWorkerOptions(snapshot, {
      titleProvider,
      updateThreadSnapshot: (s: ThreadSnapshot) => {
        Object.assign(snapshot, s);
        // If title was set, signal
        if (s.title) resolveTitle?.();
      },
    });

    const worker = new ThreadWorker(opts);

    try {
      await worker.runInference();
    } catch {
      // Ignore
    }

    // Wait a small amount of time for the fire-and-forget title generation
    await Promise.race([titleReady, new Promise((r) => setTimeout(r, 500))]);

    expect(titleProviderCalled).toBe(true);
    expect(snapshot.title).toBe("Fix login bug");

    worker.dispose();
  });

  it("aborts title generation on dispose", async () => {
    const snapshot = createMockSnapshot({
      messages: [
        {
          role: "user",
          messageId: 1,
          content: [{ type: "text", text: "Hello" }],
        } as Message,
      ],
    });

    let signalRef: AbortSignal | undefined;
    const titleProvider: TitleGenerationProvider = {
      createMessage: async (_params, opts) => {
        signalRef = opts?.signal;
        // Delay so dispose can abort
        await new Promise((r) => setTimeout(r, 1000));
        return {
          content: [
            {
              type: "tool_use",
              id: "t1",
              name: "set_title",
              input: { title: "Should not apply" },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    };

    const opts = createWorkerOptions(snapshot, { titleProvider });
    const worker = new ThreadWorker(opts);

    // Start inference (will trigger title generation in background)
    const inferencePromise = worker.runInference().catch(() => {});

    // Give it a tick to start
    await new Promise((r) => setTimeout(r, 50));

    // Dispose should abort title generation
    worker.dispose();

    await inferencePromise;

    // The signal should have been aborted
    expect(signalRef?.aborted).toBe(true);
    // Title should NOT have been set
    expect(snapshot.title).toBeUndefined();
  });

  it("skips title generation if no titleProvider is set", async () => {
    const snapshot = createMockSnapshot({
      messages: [
        {
          role: "user",
          messageId: 1,
          content: [{ type: "text", text: "Hello" }],
        } as Message,
      ],
    });

    // No titleProvider
    const opts = createWorkerOptions(snapshot);
    const worker = new ThreadWorker(opts);

    try {
      await worker.runInference();
    } catch {
      // Ignore
    }

    // Should not crash and title should remain undefined
    expect(snapshot.title).toBeUndefined();

    worker.dispose();
  });
});
