/**
 * 非交互式执行模式测试
 *
 * runExecuteMode: 发送 userMessage → 等待完成 → 输出结果
 * 逆向: SB() execute 分支 in cli-entrypoint.js
 */
import { describe, it, expect, mock } from "bun:test";
import { runExecuteMode } from "./execute";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";
import type { AgentEvent } from "@flitter/agent-core";
import { Subject } from "@flitter/util";
import { PassThrough } from "node:stream";

// ─── 工具函数 ──────────────────────────────────────────────

/**
 * 创建模拟的 ServiceContainer
 *
 * 模拟 createThreadWorker 返回 worker 拥有 events$ 和 runInference
 */
function createMockContainer(overrides: Partial<{
  events: Subject<AgentEvent>;
  runInference: () => Promise<void>;
  asyncDispose: () => Promise<void>;
  getThreadSnapshot: (id: string) => any;
}> = {}): ServiceContainer {
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
      getThread: () => undefined,
      createThread: () => ({ getValue: () => ({
        id: "test", v: 1, title: null, messages: [], env: "local",
        agentMode: "normal", relationships: [],
      }) }) as any,
      updateThread: () => {},
    },
    asyncDispose: overrides.asyncDispose ?? (async () => {}),
    configService: {} as any,
    toolRegistry: {} as any,
    toolOrchestrator: {} as any,
    permissionEngine: {} as any,
    mcpServerManager: {} as any,
    skillService: {} as any,
    threadPersistence: null,
    guidanceLoader: {} as any,
    contextManager: {} as any,
    secrets: {} as any,
    settings: {} as any,
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
      getThreadSnapshot: () => ({
        id: "test",
        messages: [
          {
            role: "assistant",
            content: [{ type: "text", text: "response text" }],
            messageId: 1,
            state: { type: "complete", stopReason: "end_turn" },
          },
        ],
      }),
    });

    const context = createContext({ userMessage: "hello world" });
    const fakeStdout = new PassThrough();
    const stdoutData: string[] = [];
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as any,
      stdout: fakeStdout as any,
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
      stdin: fakeStdin as any,
      stdout: new PassThrough() as any,
      stderr: fakeStderr as any,
      processRef: fakeProcess as any,
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
      getThreadSnapshot: () => ({
        id: "test",
        messages: [
          {
            role: "assistant",
            content: [{ type: "text", text: "ok" }],
            messageId: 1,
            state: { type: "complete", stopReason: "end_turn" },
          },
        ],
      }),
    });

    const context = createContext({ userMessage: undefined });

    const fakeStdin = new PassThrough();
    fakeStdin.write("piped input text");
    fakeStdin.end();

    await runExecuteMode(container, context, {
      stdin: fakeStdin as any,
      stdout: new PassThrough() as any,
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
      stdin: new PassThrough() as any,
      stdout: fakeStdout as any,
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
      getThreadSnapshot: () => ({
        id: "test",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "hi" }],
            messageId: 0,
          },
          {
            role: "assistant",
            content: [{ type: "text", text: "Hello! How can I help?" }],
            messageId: 1,
            state: { type: "complete", stopReason: "end_turn" },
          },
        ],
      }),
    });

    const context = createContext({ streamJson: false, userMessage: "hi" });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as any,
      stdout: fakeStdout as any,
      stderr: process.stderr,
    });

    const output = stdoutData.join("");
    expect(output).toContain("Hello! How can I help?");
  });

  it("assistant 文本提取正确 (多个 text block 拼接)", async () => {
    const stdoutData: string[] = [];

    const container = createMockContainer({
      getThreadSnapshot: () => ({
        id: "test",
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
      }),
    });

    const context = createContext({ streamJson: false, userMessage: "test" });

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => stdoutData.push(chunk.toString()));

    await runExecuteMode(container, context, {
      stdin: new PassThrough() as any,
      stdout: fakeStdout as any,
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
        stdin: new PassThrough() as any,
        stdout: new PassThrough() as any,
        stderr: fakeStderr as any,
      });
    } catch {
      // 可能抛出异常
    }

    expect(disposed).toBe(true);
  });
});
