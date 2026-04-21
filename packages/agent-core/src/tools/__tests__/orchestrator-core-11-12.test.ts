/**
 * Tests for CORE-11 (cancelToolOnly) and CORE-12 (toolMessages Subject/stop-command channel)
 *
 * 逆向: amp-cli-reversed/modules/1234_unknown_FWT.js:135-158 (cancelToolOnly)
 * 逆向: amp-cli-reversed/modules/1234_unknown_FWT.js:8,174-178,347-369 (toolMessages)
 */
import { describe, expect, it, mock } from "bun:test";
import { Subject } from "@flitter/util";
import { type OrchestratorCallbacks, ToolOrchestrator } from "../orchestrator";
import type { ToolRegistry } from "../registry";
import type { ToolContext, ToolMessage, ToolResult, ToolSpec } from "../types";

// ─── Helpers ─────────────────────────────────────────────

function createMockRegistry(tools: Record<string, Partial<ToolSpec>> = {}): ToolRegistry {
  return {
    get(name: string) {
      return tools[name] as ToolSpec | undefined;
    },
    getAll: () => Object.values(tools) as ToolSpec[],
    getToolDefinitions: () => [],
    has: (name: string) => name in tools,
    register: () => {},
  } as unknown as ToolRegistry;
}

function createMockCallbacks(overrides?: Partial<OrchestratorCallbacks>): OrchestratorCallbacks {
  return {
    getConfig: async () => ({ settings: {} as never, secrets: {} as never }),
    updateThread: mock(async () => {}),
    getToolRunEnvironment: mock(async (_id: string, signal: AbortSignal) => ({
      workingDirectory: "/tmp",
      signal,
      threadId: "test-thread",
      config: { settings: {} as never, secrets: {} as never },
    })),
    applyHookResult: mock(async () => ({ abortOp: false })),
    applyPostHookResult: mock(async () => {}),
    updateFileChanges: mock(async () => {}),
    getDisposed$: () => new Subject<boolean>(),
    clearPendingApprovals: mock(() => {}),
    ...overrides,
  };
}

// ─── CORE-12: toolMessages Subject ───────────────────────

describe("CORE-12: toolMessages Subject/stop-command channel", () => {
  it("injects toolMessages Subject into ToolContext during execution", async () => {
    let capturedToolMessages: Subject<ToolMessage> | undefined;

    const tools = {
      test_tool: {
        name: "test_tool",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        execute: mock(
          async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
            capturedToolMessages = ctx.toolMessages;
            return { status: "done", content: "ok" };
          },
        ),
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    await orch.executeToolsWithPlan([{ id: "tu_1", name: "test_tool", input: {} }]);

    expect(capturedToolMessages).toBeDefined();
    expect(capturedToolMessages).toBeInstanceOf(Subject);
  });

  it("tool can subscribe to toolMessages and receive stop-command", async () => {
    const receivedMessages: ToolMessage[] = [];
    let toolResolve: (() => void) | null = null;

    const tools = {
      long_tool: {
        name: "long_tool",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        executionProfile: { disableTimeout: true },
        execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
          // Subscribe to toolMessages
          ctx.toolMessages?.subscribe({
            next: (msg) => receivedMessages.push(msg),
          });
          // Wait for external signal
          await new Promise<void>((r) => {
            toolResolve = r;
          });
          return { status: "done", content: "finished" };
        },
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    // Start execution (non-blocking)
    const execPromise = orch.executeToolsWithPlan([{ id: "tu_2", name: "long_tool", input: {} }]);

    // Give time for tool to start and subscribe
    await new Promise((r) => setTimeout(r, 50));

    // Send stop-command via sendToolMessage
    const sent = orch.sendToolMessage("tu_2", { type: "stop-command" });
    expect(sent).toBe(true);
    expect(receivedMessages).toEqual([{ type: "stop-command" }]);

    // Resolve the tool to let it complete
    toolResolve?.();
    await execPromise;
  });

  it("sendToolMessage returns false for unknown tool ID", () => {
    const registry = createMockRegistry();
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    expect(orch.sendToolMessage("nonexistent", { type: "stop-command" })).toBe(false);
  });

  it("toolMessages Subject is completed and removed on normal tool completion", async () => {
    let capturedSubject: Subject<ToolMessage> | undefined;

    const tools = {
      quick_tool: {
        name: "quick_tool",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
          capturedSubject = ctx.toolMessages;
          return { status: "done", content: "quick" };
        },
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    await orch.executeToolsWithPlan([{ id: "tu_3", name: "quick_tool", input: {} }]);

    // After completion, sendToolMessage should return false (Subject removed)
    expect(orch.sendToolMessage("tu_3", { type: "stop-command" })).toBe(false);

    // The captured subject should have been completed
    let completeCalled = false;
    capturedSubject?.subscribe({
      complete: () => {
        completeCalled = true;
      },
    });
    expect(completeCalled).toBe(true);
  });
});

// ─── CORE-11: cancelToolOnly ─────────────────────────────

describe("CORE-11: cancelToolOnly — cooperative per-tool cancel", () => {
  it("sends stop-command to the tool but does NOT abort AbortController", async () => {
    let capturedSignal: AbortSignal | undefined;
    const receivedMessages: ToolMessage[] = [];
    let toolResolve: (() => void) | null = null;

    const tools = {
      bg_tool: {
        name: "bg_tool",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        executionProfile: { disableTimeout: true },
        execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
          capturedSignal = ctx.signal;
          ctx.toolMessages?.subscribe({
            next: (msg) => receivedMessages.push(msg),
          });
          await new Promise<void>((r) => {
            toolResolve = r;
          });
          return { status: "done", content: "bg" };
        },
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    const execPromise = orch.executeToolsWithPlan([{ id: "tu_co_1", name: "bg_tool", input: {} }]);

    await new Promise((r) => setTimeout(r, 50));

    // cancelToolOnly should send stop-command but NOT abort
    await orch.cancelToolOnly("tu_co_1");

    // AbortController should NOT be aborted
    expect(capturedSignal?.aborted).toBe(false);

    // stop-command should have been received
    expect(receivedMessages).toEqual([{ type: "stop-command" }]);

    // The tool is marked cancelled
    expect(orch.cancelledToolUses.has("tu_co_1")).toBe(true);

    // Clean up
    toolResolve?.();
    await execPromise;
  });

  it("emits cancelled status via updateThread", async () => {
    let toolResolve: (() => void) | null = null;

    const tools = {
      bg_tool: {
        name: "bg_tool",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        executionProfile: { disableTimeout: true },
        execute: async (): Promise<ToolResult> => {
          await new Promise<void>((r) => {
            toolResolve = r;
          });
          return { status: "done", content: "bg" };
        },
      },
    };

    const registry = createMockRegistry(tools);
    const updateThread = mock(async () => {});
    const callbacks = createMockCallbacks({ updateThread });
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    const execPromise = orch.executeToolsWithPlan([{ id: "tu_co_2", name: "bg_tool", input: {} }]);

    await new Promise((r) => setTimeout(r, 50));
    await orch.cancelToolOnly("tu_co_2");

    // Should have called updateThread with status "cancelled"
    const calls = updateThread.mock.calls;
    const cancelEvent = calls.find(
      (c: unknown[]) =>
        (c[0] as Record<string, unknown>).status === "cancelled" &&
        (c[0] as Record<string, unknown>).toolUseId === "tu_co_2",
    );
    expect(cancelEvent).toBeDefined();

    toolResolve?.();
    await execPromise;
  });

  it("cancelToolOnly on nonexistent tool does not throw", async () => {
    const registry = createMockRegistry();
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    // Should not throw
    await orch.cancelToolOnly("nonexistent");
  });
});

// ─── cancelAll sends stop-command to all toolMessages ────

describe("cancelAll sends stop-command to all toolMessages", () => {
  it("sends stop-command and completes all tool message Subjects", async () => {
    const received1: ToolMessage[] = [];
    const received2: ToolMessage[] = [];
    let resolve1: (() => void) | null = null;
    let resolve2: (() => void) | null = null;

    const tools = {
      tool_a: {
        name: "tool_a",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        executionProfile: { disableTimeout: true },
        execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
          ctx.toolMessages?.subscribe({ next: (m) => received1.push(m) });
          await new Promise<void>((r) => {
            resolve1 = r;
          });
          return { status: "done", content: "a" };
        },
      },
      tool_b: {
        name: "tool_b",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        executionProfile: { disableTimeout: true },
        execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
          ctx.toolMessages?.subscribe({ next: (m) => received2.push(m) });
          await new Promise<void>((r) => {
            resolve2 = r;
          });
          return { status: "done", content: "b" };
        },
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    const execPromise = orch.executeToolsWithPlan([
      { id: "tu_a", name: "tool_a", input: {} },
      { id: "tu_b", name: "tool_b", input: {} },
    ]);

    await new Promise((r) => setTimeout(r, 50));

    await orch.cancelAll("test:cancel");

    expect(received1).toEqual([{ type: "stop-command" }]);
    expect(received2).toEqual([{ type: "stop-command" }]);

    // After cancelAll, sendToolMessage should return false (Subjects cleaned up)
    expect(orch.sendToolMessage("tu_a", { type: "stop-command" })).toBe(false);
    expect(orch.sendToolMessage("tu_b", { type: "stop-command" })).toBe(false);

    resolve1?.();
    resolve2?.();
    await execPromise;
  });
});

// ─── dispose sends stop-command to all toolMessages ──────

describe("dispose sends stop-command to all toolMessages", () => {
  it("sends stop-command and clears all toolMessages on dispose", async () => {
    const received: ToolMessage[] = [];
    let toolResolve: (() => void) | null = null;

    const tools = {
      tool_d: {
        name: "tool_d",
        source: "builtin" as const,
        description: "test",
        inputSchema: {},
        executionProfile: { disableTimeout: true },
        execute: async (_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
          ctx.toolMessages?.subscribe({ next: (m) => received.push(m) });
          await new Promise<void>((r) => {
            toolResolve = r;
          });
          return { status: "done", content: "d" };
        },
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    const execPromise = orch.executeToolsWithPlan([{ id: "tu_d", name: "tool_d", input: {} }]);

    await new Promise((r) => setTimeout(r, 50));

    orch.dispose();

    expect(received).toEqual([{ type: "stop-command" }]);

    toolResolve?.();
    await execPromise.catch(() => {}); // May reject due to dispose
  });
});
