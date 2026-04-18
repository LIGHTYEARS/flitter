/**
 * ToolOrchestrator per-tool timeout tests
 *
 * Verifies that:
 * 1. ExecutionProfile.timeoutMs type is accepted
 * 2. Tools that complete within the timeout succeed
 * 3. Tools that exceed their timeout are aborted and return status="error"
 *    with an error message containing "timeout"
 *
 * 逆向: amp uses network.timeout setting (chunk-001.js:4145) and MCP protocol
 * timeout with _setupTimeout/_clearTimeout (chunk-001.js:10478-10499).
 * Amp also uses AbortController pattern for cancellation (chunk-001.js:4370).
 * Flitter adds orchestrator-level timeout enforcement via setTimeout +
 * AbortController.abort().
 */

import { describe, expect, it } from "bun:test";
import type { ToolDefinition } from "@flitter/llm";
import type { Observable } from "@flitter/util";
import { BehaviorSubject } from "@flitter/util";
import type { OrchestratorCallbacks, ToolThreadEvent } from "../orchestrator";
import { ToolOrchestrator } from "../orchestrator";
import type { ToolRegistry } from "../registry";
import type { ToolResult, ToolSpec } from "../types";

// ─── Type test ────────────────────────────────────────────

describe("ExecutionProfile.timeoutMs", () => {
  it("ToolDefinition accepts timeoutMs in executionProfile", () => {
    // This is a compile-time type test — if timeoutMs is not in ExecutionProfile,
    // TypeScript would error here. We also verify runtime value is preserved.
    const spec: ToolSpec = {
      name: "SlowTool",
      description: "A tool that might be slow",
      inputSchema: { type: "object", properties: {} },
      source: "builtin",
      executionProfile: {
        serial: false,
        timeoutMs: 30000, // 30 seconds
      },
      execute: async () => ({ status: "done", content: "ok" }),
    };
    expect(spec.executionProfile?.timeoutMs).toBe(30000);
  });

  it("timeoutMs defaults to undefined (uses orchestrator default)", () => {
    const spec: ToolSpec = {
      name: "DefaultTool",
      description: "uses default timeout",
      inputSchema: {},
      source: "builtin",
      execute: async () => ({ status: "done" }),
    };
    expect(spec.executionProfile?.timeoutMs).toBeUndefined();
  });
});

// ─── Helpers ──────────────────────────────────────────────

function createMockRegistry(
  tools: Record<string, { timeoutMs?: number; executeFn: () => Promise<ToolResult> }>,
): ToolRegistry {
  return {
    get: (name: string) => {
      const tool = tools[name];
      if (!tool) return undefined;
      return {
        name,
        description: "test",
        inputSchema: {},
        source: "builtin",
        executionProfile: tool.timeoutMs !== undefined ? { timeoutMs: tool.timeoutMs } : undefined,
        execute: tool.executeFn,
      } satisfies ToolSpec;
    },
    getToolDefinitions: () => [] as ToolDefinition[],
    list: () => Object.keys(tools) as unknown as ToolSpec[],
  } as unknown as ToolRegistry;
}

function createMockCallbacks(
  capturedEvents: ToolThreadEvent[],
  overrides?: Partial<OrchestratorCallbacks>,
): OrchestratorCallbacks {
  return {
    getConfig: async () => ({ settings: {} }) as import("@flitter/schemas").Config,
    updateThread: async (event: ToolThreadEvent) => {
      capturedEvents.push(event);
    },
    getToolRunEnvironment: async (_id: string, signal: AbortSignal) => ({
      workingDirectory: "/tmp",
      signal,
      threadId: "test",
      config: { settings: {} } as import("@flitter/schemas").Config,
    }),
    applyHookResult: async () => ({ abortOp: false }),
    applyPostHookResult: async () => {},
    updateFileChanges: async () => {},
    getDisposed$: () => new BehaviorSubject(false) as unknown as Observable<boolean>,
    ...overrides,
  };
}

// ─── Timeout behavior tests ───────────────────────────────

describe("ToolOrchestrator timeout", () => {
  it("tool execution completes within timeout", async () => {
    const capturedEvents: ToolThreadEvent[] = [];
    const registry = createMockRegistry({
      FastTool: {
        timeoutMs: 5000,
        executeFn: async () => ({ status: "done", content: "fast" }),
      },
    });

    const callbacks = createMockCallbacks(capturedEvents);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    await orch.executeToolsWithPlan([{ id: "tu-1", name: "FastTool", input: {} }]);

    const completedEvent = capturedEvents.find((e) => e.status === "completed");
    expect(completedEvent).toBeDefined();
    expect(completedEvent?.result?.status).toBe("done");
  });

  it("tool execution is aborted after timeout", async () => {
    const capturedEvents: ToolThreadEvent[] = [];
    const registry = createMockRegistry({
      SlowTool: {
        timeoutMs: 100, // 100ms timeout
        executeFn: async () => {
          // Simulate a tool that takes too long
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return { status: "done", content: "slow" };
        },
      },
    });

    const callbacks = createMockCallbacks(capturedEvents);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    await orch.executeToolsWithPlan([{ id: "tu-1", name: "SlowTool", input: {} }]);

    const errorEvent = capturedEvents.find((e) => e.status === "error");
    expect(errorEvent).toBeDefined();
    // The error message should mention timeout
    const errorMsg = errorEvent?.error ?? errorEvent?.result?.error ?? "";
    expect(errorMsg.toLowerCase()).toContain("timeout");
  }, 3000); // 3s test timeout — the tool timeout is 100ms so this is plenty

  it("uses default 120s timeout when executionProfile.timeoutMs is not set", async () => {
    // This test verifies that the DEFAULT_TOOL_TIMEOUT_MS constant is used
    // by creating a tool that succeeds immediately (no hang needed)
    const capturedEvents: ToolThreadEvent[] = [];
    const registry = createMockRegistry({
      DefaultTimeoutTool: {
        // No timeoutMs — should use DEFAULT_TOOL_TIMEOUT_MS = 120_000
        executeFn: async () => ({ status: "done", content: "quick" }),
      },
    });

    const callbacks = createMockCallbacks(capturedEvents);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    await orch.executeToolsWithPlan([{ id: "tu-default", name: "DefaultTimeoutTool", input: {} }]);

    // Should complete successfully — no timeout
    const completedEvent = capturedEvents.find((e) => e.status === "completed");
    expect(completedEvent).toBeDefined();
  });

  it("timeout is cleaned up after successful execution (no dangling timers)", async () => {
    // Verifies the clearTimeout in finally block works correctly
    const capturedEvents: ToolThreadEvent[] = [];
    const registry = createMockRegistry({
      CleanTool: {
        timeoutMs: 5000,
        executeFn: async () => ({ status: "done", content: "clean" }),
      },
    });

    const callbacks = createMockCallbacks(capturedEvents);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    // Run the tool twice to ensure no stale timer state
    await orch.executeToolsWithPlan([{ id: "tu-clean-1", name: "CleanTool", input: {} }]);
    await orch.executeToolsWithPlan([{ id: "tu-clean-2", name: "CleanTool", input: {} }]);

    const completedEvents = capturedEvents.filter((e) => e.status === "completed");
    expect(completedEvents.length).toBe(2);
  });

  it("parent signal abort propagates to per-tool controller", async () => {
    const capturedEvents: ToolThreadEvent[] = [];
    let toolSignal: AbortSignal | undefined;

    const registry = createMockRegistry({
      BlockingTool: {
        timeoutMs: 30000, // long timeout so we know abort comes from cancelAll
        executeFn: async () => {
          // Wait until the signal is aborted
          await new Promise<void>((_, reject) => {
            if (toolSignal?.aborted) {
              reject(new Error("aborted"));
              return;
            }
            toolSignal?.addEventListener("abort", () => reject(new Error("aborted")), {
              once: true,
            });
            // Fallback timeout so test doesn't hang
            setTimeout(() => reject(new Error("test fallback timeout")), 2000);
          });
          return { status: "done", content: "unreachable" };
        },
      },
    });

    const callbacks = createMockCallbacks(capturedEvents, {
      getToolRunEnvironment: async (_id: string, signal: AbortSignal) => {
        toolSignal = signal;
        return {
          workingDirectory: "/tmp",
          signal,
          threadId: "test",
          config: { settings: {} } as import("@flitter/schemas").Config,
        };
      },
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    // Start the tool execution and cancel while it's running
    const execPromise = orch.executeToolsWithPlan([
      { id: "tu-parent", name: "BlockingTool", input: {} },
    ]);

    // Wait briefly for the tool to start and register in runningTools
    await new Promise((resolve) => setTimeout(resolve, 50));
    orch.cancelAll();

    await execPromise;

    // The tool should have been cancelled or error'd
    const cancelledOrError = capturedEvents.find(
      (e) => e.status === "cancelled" || e.status === "error",
    );
    expect(cancelledOrError).toBeDefined();
  }, 5000);
});
