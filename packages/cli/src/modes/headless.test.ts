/**
 * Headless JSON 流模式测试
 *
 * runHeadlessMode: stdin JSON Lines 输入 + stdout JSON 事件流输出
 * 逆向: SB() stream-json 分支 in cli-entrypoint.js
 */
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { runHeadlessMode } from "./headless";
import type { ServiceContainer } from "@flitter/flitter";
import type { CliContext } from "../context";
import type { AgentEvent } from "@flitter/agent-core";
import { Subject } from "@flitter/util";
import { Readable, Writable, PassThrough } from "node:stream";

// ─── 工具函数 ──────────────────────────────────────────────

/**
 * 创建模拟的 ServiceContainer
 */
function createMockContainer(overrides: Partial<{
  events: Subject<AgentEvent>;
  submitUserMessage: (msg: string) => Promise<void>;
  waitForIdle: () => Promise<void>;
  asyncDispose: () => Promise<void>;
  getThreadSnapshot: (id: string) => any;
}> = {}): ServiceContainer {
  const events$ = overrides.events ?? new Subject<AgentEvent>();
  const submitUserMessage = overrides.submitUserMessage ?? (async () => {});
  const waitForIdle = overrides.waitForIdle ?? (async () => {});

  const mockWorker = {
    events$,
    inferenceState$: { getValue: () => "idle" as const },
    runInference: async () => {},
    cancelInference: () => {},
    retry: async () => {},
    dispose: () => {},
    submitUserMessage,
    waitForIdle,
  };

  return {
    createThreadWorker: mock(() => mockWorker),
    threadStore: {
      getThreadSnapshot: overrides.getThreadSnapshot ?? (() => undefined),
    },
    asyncDispose: overrides.asyncDispose ?? (async () => {}),
    configService: {} as any,
    toolRegistry: {} as any,
    toolOrchestrator: {} as any,
    permissionEngine: {} as any,
    mcpServerManager: {} as any,
    skillService: {} as any,
    threadStore: {} as any,
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
    headless: true,
    streamJson: true,
    verbose: false,
    ...overrides,
  };
}

/**
 * 收集写入 stream 的数据
 */
function collectOutput(stream: Writable): string[] {
  const lines: string[] = [];
  const orig = stream.write;
  stream.write = ((data: string) => {
    lines.push(data);
    return true;
  }) as any;
  return lines;
}

// ─── 测试 ───────────────────────────────────────────────────

describe("runHeadlessMode", () => {
  it("订阅 agentEvents 并输出 JSON Lines", async () => {
    const events$ = new Subject<AgentEvent>();
    const stdoutLines: string[] = [];

    // 模拟 submitUserMessage 时发出事件
    const submitUserMessage = async () => {
      events$.next({ type: "inference:start" });
      events$.next({ type: "turn:complete" });
    };

    const container = createMockContainer({
      events: events$,
      submitUserMessage,
      waitForIdle: async () => {},
    });

    const context = createContext({ userMessage: "hello" });

    // 使用 PassThrough 模拟 stdin, 立即结束
    const fakeStdin = new PassThrough();
    fakeStdin.end();

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => {
      stdoutLines.push(chunk.toString());
    });

    await runHeadlessMode(container, context, {
      stdin: fakeStdin as any,
      stdout: fakeStdout as any,
      stderr: process.stderr,
    });

    // 应该有 inference:start 和 turn:complete 两个事件
    expect(stdoutLines.length).toBeGreaterThanOrEqual(2);
    const parsed = stdoutLines.map((l) => JSON.parse(l.trim()));
    expect(parsed[0].type).toBe("inference:start");
    expect(parsed[1].type).toBe("turn:complete");
  });

  it("有效 JSON stdin 行触发 submitUserMessage", async () => {
    const events$ = new Subject<AgentEvent>();
    const messages: string[] = [];

    const container = createMockContainer({
      events: events$,
      submitUserMessage: async (msg) => {
        messages.push(msg);
      },
    });

    const context = createContext();

    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();

    const promise = runHeadlessMode(container, context, {
      stdin: fakeStdin as any,
      stdout: fakeStdout as any,
      stderr: process.stderr,
    });

    fakeStdin.write(JSON.stringify({ role: "user", content: "test message" }) + "\n");
    fakeStdin.end();

    await promise;

    expect(messages).toContain("test message");
  });

  it("无效 JSON stdin 行写入 stderr 警告但不中断", async () => {
    const events$ = new Subject<AgentEvent>();
    const stderrLines: string[] = [];

    const container = createMockContainer({ events: events$ });
    const context = createContext();

    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();
    const fakeStderr = new PassThrough();
    fakeStderr.on("data", (chunk: Buffer) => {
      stderrLines.push(chunk.toString());
    });

    const promise = runHeadlessMode(container, context, {
      stdin: fakeStdin as any,
      stdout: fakeStdout as any,
      stderr: fakeStderr as any,
    });

    fakeStdin.write("not valid json\n");
    fakeStdin.write(JSON.stringify({ role: "user", content: "valid" }) + "\n");
    fakeStdin.end();

    await promise;

    // stderr 应该有警告
    expect(stderrLines.some((l) => l.includes("Warning"))).toBe(true);
  });

  it("空行跳过", async () => {
    const events$ = new Subject<AgentEvent>();
    const messages: string[] = [];

    const container = createMockContainer({
      events: events$,
      submitUserMessage: async (msg) => {
        messages.push(msg);
      },
    });

    const context = createContext();

    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();

    const promise = runHeadlessMode(container, context, {
      stdin: fakeStdin as any,
      stdout: fakeStdout as any,
      stderr: process.stderr,
    });

    fakeStdin.write("\n");
    fakeStdin.write("  \n");
    fakeStdin.write(JSON.stringify({ role: "user", content: "real" }) + "\n");
    fakeStdin.end();

    await promise;

    // 只有 "real" 被提交
    expect(messages.length).toBe(1);
    expect(messages[0]).toBe("real");
  });

  it("stdout 每行是合法 JSON + \\n 结尾 (JSON Lines 格式)", async () => {
    const events$ = new Subject<AgentEvent>();
    const rawOutput: string[] = [];

    const submitUserMessage = async () => {
      events$.next({ type: "inference:start" });
      events$.next({
        type: "inference:delta",
        delta: { content: [{ type: "text", text: "hi" }] } as any,
      });
      events$.next({ type: "turn:complete" });
    };

    const container = createMockContainer({
      events: events$,
      submitUserMessage,
    });
    const context = createContext({ userMessage: "test" });

    const fakeStdin = new PassThrough();
    fakeStdin.end();

    const fakeStdout = new PassThrough();
    fakeStdout.on("data", (chunk: Buffer) => {
      rawOutput.push(chunk.toString());
    });

    await runHeadlessMode(container, context, {
      stdin: fakeStdin as any,
      stdout: fakeStdout as any,
      stderr: process.stderr,
    });

    // 每个输出以 \n 结尾, 且是合法 JSON
    for (const line of rawOutput) {
      expect(line.endsWith("\n")).toBe(true);
      expect(() => JSON.parse(line.trim())).not.toThrow();
    }
  });

  it("stdin EOF 触发 graceful shutdown", async () => {
    const events$ = new Subject<AgentEvent>();
    let disposed = false;

    const container = createMockContainer({
      events: events$,
      asyncDispose: async () => {
        disposed = true;
      },
    });

    const context = createContext();

    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();

    const promise = runHeadlessMode(container, context, {
      stdin: fakeStdin as any,
      stdout: fakeStdout as any,
      stderr: process.stderr,
    });

    // 立即关闭 stdin
    fakeStdin.end();

    await promise;

    expect(disposed).toBe(true);
  });

  it("初始 userMessage (命令行参数) 先执行", async () => {
    const events$ = new Subject<AgentEvent>();
    const messages: string[] = [];

    const container = createMockContainer({
      events: events$,
      submitUserMessage: async (msg) => {
        messages.push(msg);
      },
    });

    const context = createContext({ userMessage: "initial message" });

    const fakeStdin = new PassThrough();
    const fakeStdout = new PassThrough();

    const promise = runHeadlessMode(container, context, {
      stdin: fakeStdin as any,
      stdout: fakeStdout as any,
      stderr: process.stderr,
    });

    fakeStdin.write(JSON.stringify({ role: "user", content: "follow up" }) + "\n");
    fakeStdin.end();

    await promise;

    // 初始消息在前
    expect(messages[0]).toBe("initial message");
    expect(messages[1]).toBe("follow up");
  });

  it("asyncDispose 在 finally 中调用", async () => {
    const events$ = new Subject<AgentEvent>();
    let disposed = false;

    const submitUserMessage = async () => {
      throw new Error("simulated error");
    };

    const container = createMockContainer({
      events: events$,
      submitUserMessage,
      asyncDispose: async () => {
        disposed = true;
      },
    });

    const context = createContext({ userMessage: "trigger error" });

    const fakeStdin = new PassThrough();
    fakeStdin.end();
    const fakeStdout = new PassThrough();
    const fakeStderr = new PassThrough();

    // 即使出错, dispose 也应该被调用
    try {
      await runHeadlessMode(container, context, {
        stdin: fakeStdin as any,
        stdout: fakeStdout as any,
        stderr: fakeStderr as any,
      });
    } catch {
      // 可能抛出异常
    }

    expect(disposed).toBe(true);
  });
});
