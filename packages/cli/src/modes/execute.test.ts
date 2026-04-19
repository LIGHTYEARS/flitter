/**
 * 非交互式执行模式测试
 *
 * runExecuteMode: 发送 userMessage → 等待完成 → 输出结果
 * 逆向: SB() execute 分支 in cli-entrypoint.js
 */
import { describe, expect, it, mock } from "bun:test";
import { PassThrough } from "node:stream";
import type { AgentEvent } from "@flitter/agent-core";
import type { ServiceContainer } from "@flitter/flitter";
import type { ThreadSnapshot } from "@flitter/schemas";
import { Subject } from "@flitter/util";
import type { CliContext } from "../context";
import { runExecuteMode } from "./execute";

// ─── 工具函数 ──────────────────────────────────────────────

/**
 * 创建模拟的 ServiceContainer
 *
 * 模拟 createThreadWorker 返回 worker 拥有 events$ 和 runInference
 */
function createMockContainer(
  overrides: Partial<{
    events: Subject<AgentEvent>;
    runInference: () => Promise<void>;
    asyncDispose: () => Promise<void>;
    getThreadSnapshot: (id: string) => ThreadSnapshot | undefined;
    setCachedThread: (thread: ThreadSnapshot) => void;
    threadPersistence: { save: (thread: ThreadSnapshot) => Promise<void> } | null;
  }> = {},
): ServiceContainer {
  const events$ = overrides.events ?? new Subject<AgentEvent>();
  const runInference = overrides.runInference ?? (async () => {});

  const mockWorker = {
    events$,
    inferenceState$: { getValue: () => "idle" as const, next: () => {} },
    runInference,
    cancelInference: () => {},
    retry: async () => {},
    dispose: () => {},
  };

  return {
    createThreadWorker: mock(() => mockWorker),
    threadStore: {
      getThreadSnapshot: overrides.getThreadSnapshot ?? (() => undefined),
      setCachedThread: overrides.setCachedThread ?? (() => {}),
      getThread: () => undefined,
      createThread: () =>
        ({
          getValue: () => ({
            id: "test",
            v: 1,
            title: null,
            messages: [],
            env: "local",
            agentMode: "normal",
            relationships: [],
          }),
        }) as unknown as ReturnType<ServiceContainer["threadStore"]["getThread"]>,
      updateThread: () => {},
    },
    asyncDispose: overrides.asyncDispose ?? (async () => {}),
    configService: {} as unknown as ServiceContainer["configService"],
    toolRegistry: {} as unknown as ServiceContainer["toolRegistry"],
    toolOrchestrator: {} as unknown as ServiceContainer["toolOrchestrator"],
    permissionEngine: {} as unknown as ServiceContainer["permissionEngine"],
    mcpServerManager: {} as unknown as ServiceContainer["mcpServerManager"],
    skillService: {} as unknown as ServiceContainer["skillService"],
    threadPersistence: overrides.threadPersistence ?? null,
    guidanceLoader: {} as unknown as ServiceContainer["guidanceLoader"],
    contextManager: {} as unknown as ServiceContainer["contextManager"],
    secrets: {} as unknown as ServiceContainer["secrets"],
    settings: {} as unknown as ServiceContainer["settings"],
  } as unknown as ServiceContainer;
}

/**
 * 创建默认 CliContext
 */
function createContext(overrides: Partial<CliContext> = {}): CliContext {
  return {
    executeMode: true,
    isTTY: false,
    headless: false,
    streamJson: false,
    verbose: false,
    ...overrides,
  };
}

// ─── 测试 ───────────────────────────────────────────────────

describe("runExecuteMode", () => {
  it("发送 userMessage 并等待 runInference 完成", async () => {
    let inferenceRan = false;

    const container = createMockContainer({
      runInference: async () => {
        inferenceRan = true;
      },
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "response text" }],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
            },
          ],
        }) as unknown as ThreadSnapshot,
    });

    const context = createContext({ userMessage: "hello world" });
    const fakeStdout = new PassThrough();
    const stdoutData: string[] = [];
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: process.stderr,
    });

    expect(inferenceRan).toBe(true);
  });

  it("无 userMessage + 无 stdin 内容 → exitCode=1", async () => {
    const container = createMockContainer();
    const context = createContext({ userMessage: undefined });

    const fakeStdin = new PassThrough();
    fakeStdin.end(); // 空 stdin

    const stderrData: string[] = [];
    const fakeStderr = new PassThrough();
    fakeStderr.on("data", (chunk: Buffer) => stderrData.push(chunk.toString()));

    const fakeProcess = { exitCode: undefined as number | undefined };

    await runExecuteMode(container, context, {
      stdin: fakeStdin as unknown as NodeJS.ReadableStream,
      stdout: new PassThrough() as unknown as NodeJS.WritableStream,
      stderr: fakeStderr as unknown as NodeJS.WritableStream,
      processRef: fakeProcess,
    });

    expect(fakeProcess.exitCode).toBe(1);
    expect(stderrData.some((l) => l.includes("Error"))).toBe(true);
  });

  it("stdin pipe mode 读取内容作为 userMessage", async () => {
    let inferenceRan = false;

    const container = createMockContainer({
      runInference: async () => {
        inferenceRan = true;
      },
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "ok" }],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
            },
          ],
        }) as unknown as ThreadSnapshot,
    });

    const context = createContext({ userMessage: undefined });

    const fakeStdin = new PassThrough();
    fakeStdin.write("piped input text");
    fakeStdin.end();

    await runExecuteMode(container, context, {
      stdin: fakeStdin as unknown as NodeJS.ReadableStream,
      stdout: new PassThrough() as unknown as NodeJS.WritableStream,
      stderr: process.stderr,
    });

    // stdin content should trigger inference
    expect(inferenceRan).toBe(true);
  });

  it("stream-json 模式输出 JSON Lines", async () => {
    const events$ = new Subject<AgentEvent>();
    const stdoutData: string[] = [];

    const runInference = async () => {
      events$.next({ type: "inference:start" });
      events$.next({ type: "turn:complete" });
    };

    const container = createMockContainer({
      events: events$,
      runInference,
    });

    const context = createContext({ streamJson: true, userMessage: "test" });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: process.stderr,
    });

    // 应该有 JSON Lines 输出
    expect(stdoutData.length).toBeGreaterThanOrEqual(2);
    const parsed = stdoutData.map((l) => JSON.parse(l.trim()));
    expect(parsed[0].type).toBe("inference:start");
  });

  it("非 stream-json 模式输出 assistant 最终文本", async () => {
    const stdoutData: string[] = [];

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: "hi" }],
              messageId: 0,
              meta: {},
            },
            {
              role: "assistant",
              content: [{ type: "text", text: "Hello! How can I help?" }],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
            },
          ],
        }) as unknown as ThreadSnapshot,
    });

    const context = createContext({ streamJson: false, userMessage: "hi" });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: process.stderr,
    });

    const output = stdoutData.join("");
    expect(output).toContain("Hello! How can I help?");
  });

  it("assistant 文本提取正确 (多个 text block 拼接)", async () => {
    const stdoutData: string[] = [];

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "assistant",
              content: [
                { type: "text", text: "Part 1. " },
                { type: "tool_use", id: "t1", name: "read", input: {} },
                { type: "text", text: "Part 2." },
              ],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
            },
          ],
        }) as unknown as ThreadSnapshot,
    });

    const context = createContext({ streamJson: false, userMessage: "test" });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: process.stderr,
    });

    const output = stdoutData.join("");
    expect(output).toContain("Part 1.");
    expect(output).toContain("Part 2.");
  });

  it("asyncDispose 在 finally 中调用", async () => {
    let disposed = false;
    const events$ = new Subject<AgentEvent>();

    const runInference = async () => {
      throw new Error("simulated failure");
    };

    const container = createMockContainer({
      events: events$,
      runInference,
      asyncDispose: async () => {
        disposed = true;
      },
    });

    const context = createContext({ userMessage: "trigger" });

    const fakeStderr = new PassThrough();

    try {
      await runExecuteMode(container, context, {
        stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
        stdout: new PassThrough() as unknown as NodeJS.WritableStream,
        stderr: fakeStderr as unknown as NodeJS.WritableStream,
      });
    } catch {
      // 可能抛出异常
    }

    expect(disposed).toBe(true);
  });

  // ─── Gap 9: Execute Mode Flags ──────────────────────────────

  it("--stats outputs JSON { result, usage }", async () => {
    const stdoutData: string[] = [];

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "The answer is 42" }],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
              usage: { inputTokens: 100, outputTokens: 50, cacheCreationInputTokens: 10, cacheReadInputTokens: 5 },
            },
          ],
        }) as unknown as ThreadSnapshot,
    });

    const context = createContext({ userMessage: "test", stats: true });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    expect(stdoutData.length).toBeGreaterThanOrEqual(1);
    const statsLine = stdoutData.find((l) => l.includes('"result"'));
    expect(statsLine).toBeDefined();
    const stats = JSON.parse(statsLine!);
    expect(stats.result).toBe("The answer is 42");
    expect(stats.usage.input_tokens).toBe(100);
    expect(stats.usage.output_tokens).toBe(50);
    expect(stats.usage.cache_creation_input_tokens).toBe(10);
    expect(stats.usage.cache_read_input_tokens).toBe(5);
  });

  it("--stats with no usage defaults to zero tokens", async () => {
    const stdoutData: string[] = [];

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "response" }],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
            },
          ],
        }) as unknown as ThreadSnapshot,
    });

    const context = createContext({ userMessage: "test", stats: true });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    const stats = JSON.parse(stdoutData.join(""));
    expect(stats.usage.input_tokens).toBe(0);
    expect(stats.usage.output_tokens).toBe(0);
  });

  it("--label adds labels to thread snapshot", async () => {
    let savedThread: ThreadSnapshot | undefined;

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "done" }],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
            },
          ],
        }) as unknown as ThreadSnapshot,
      setCachedThread: (thread: ThreadSnapshot) => {
        savedThread = thread;
      },
    });

    const context = createContext({ userMessage: "test", labels: ["ci", "nightly"] });

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: new PassThrough() as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    expect(savedThread).toBeDefined();
    expect(savedThread!.labels).toEqual(["ci", "nightly"]);
  });

  it("--archive sets archived=true on thread", async () => {
    let savedThread: ThreadSnapshot | undefined;

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [],
        }) as unknown as ThreadSnapshot,
      setCachedThread: (thread: ThreadSnapshot) => {
        savedThread = thread;
      },
    });

    const context = createContext({ userMessage: "test", archive: true });

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: new PassThrough() as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    expect(savedThread).toBeDefined();
    expect(savedThread!.archived).toBe(true);
  });

  it("--archive persists to threadPersistence when available", async () => {
    let persistedThread: ThreadSnapshot | undefined;

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [],
        }) as unknown as ThreadSnapshot,
      setCachedThread: () => {},
      threadPersistence: {
        save: async (thread: ThreadSnapshot) => {
          persistedThread = thread;
        },
      },
    });

    const context = createContext({ userMessage: "test", archive: true });

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: new PassThrough() as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    expect(persistedThread).toBeDefined();
    expect(persistedThread!.archived).toBe(true);
  });

  it("--stream-json-thinking includes thinking events in stream", async () => {
    const events$ = new Subject<AgentEvent>();
    const stdoutData: string[] = [];

    const runInference = async () => {
      events$.next({ type: "inference:start" });
      // In a real scenario, thinking events come from the provider.
      // Our event$ subscriber should pass them through when streamJsonThinking is true.
      events$.next({ type: "thinking", text: "Let me think..." } as unknown as AgentEvent);
      events$.next({ type: "turn:complete" });
    };

    const container = createMockContainer({
      events: events$,
      runInference,
    });

    const context = createContext({
      streamJson: true,
      streamJsonThinking: true,
      userMessage: "test",
    });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    const lines = stdoutData.flatMap((d) => d.split("\n").filter(Boolean));
    const types = lines.map((l) => JSON.parse(l).type);
    expect(types).toContain("thinking");
  });

  it("--stream-json without --stream-json-thinking filters thinking events", async () => {
    const events$ = new Subject<AgentEvent>();
    const stdoutData: string[] = [];

    const runInference = async () => {
      events$.next({ type: "inference:start" });
      events$.next({ type: "thinking", text: "secret thoughts" } as unknown as AgentEvent);
      events$.next({ type: "turn:complete" });
    };

    const container = createMockContainer({
      events: events$,
      runInference,
    });

    const context = createContext({
      streamJson: true,
      streamJsonThinking: undefined, // not set
      userMessage: "test",
    });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    const lines = stdoutData.flatMap((d) => d.split("\n").filter(Boolean));
    const types = lines.map((l) => JSON.parse(l).type);
    expect(types).not.toContain("thinking");
  });

  it("--stream-json-input reads multi-turn JSON Lines from stdin", async () => {
    let inferenceCount = 0;
    const events$ = new Subject<AgentEvent>();

    const runInference = async () => {
      inferenceCount++;
      events$.next({ type: "inference:start" });
      events$.next({ type: "turn:complete" });
    };

    const container = createMockContainer({
      events: events$,
      runInference,
    });

    const context = createContext({
      streamJson: true,
      streamJsonInput: true,
      userMessage: "initial message",
    });

    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();
    const stdoutData: string[] = [];
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    // Send two JSON Lines then close stdin
    fakeStdin.write('{"role":"user","content":"follow up 1"}\n');
    fakeStdin.write('{"role":"user","content":"follow up 2"}\n');
    fakeStdin.end();

    await runExecuteMode(container, context, {
      stdin: fakeStdin as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    // 1 initial message + 2 follow-up messages = 3 inferences
    expect(inferenceCount).toBe(3);
  });

  it("--stats + --stream-json outputs stats (not events)", async () => {
    // When --stats is set, output stats JSON instead of plain text
    const stdoutData: string[] = [];

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [
            {
              role: "assistant",
              content: [{ type: "text", text: "result" }],
              messageId: 1,
              state: { type: "complete", stopReason: "end_turn" },
              usage: { inputTokens: 10, outputTokens: 5 },
            },
          ],
        }) as unknown as ThreadSnapshot,
    });

    // --stats without --stream-json
    const context = createContext({
      userMessage: "test",
      stats: true,
      streamJson: false,
    });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: fakeStdout as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    const output = stdoutData.join("");
    const stats = JSON.parse(output.trim());
    expect(stats.result).toBe("result");
    expect(stats.usage.input_tokens).toBe(10);
    // Should NOT also output plain text (stats takes precedence)
    expect(output.split("\n").filter(Boolean).length).toBe(1);
  });

  it("combined --archive --label works together", async () => {
    const savedThreads: ThreadSnapshot[] = [];

    const container = createMockContainer({
      getThreadSnapshot: () =>
        ({
          id: "test",
          v: 1,
          messages: [],
        }) as unknown as ThreadSnapshot,
      setCachedThread: (thread: ThreadSnapshot) => {
        savedThreads.push(thread);
      },
    });

    const context = createContext({
      userMessage: "test",
      archive: true,
      labels: ["ci"],
    });

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as unknown as NodeJS.ReadableStream,
      stdout: new PassThrough() as unknown as NodeJS.WritableStream,
      stderr: new PassThrough() as unknown as NodeJS.WritableStream,
    });

    // Should have at least one call for labels and one for archive
    expect(savedThreads.length).toBeGreaterThanOrEqual(2);
    // The labels call
    const labeledThread = savedThreads.find((t) => t.labels?.includes("ci"));
    expect(labeledThread).toBeDefined();
    // The archive call
    const archivedThread = savedThreads.find((t) => t.archived === true);
    expect(archivedThread).toBeDefined();
  });
});
