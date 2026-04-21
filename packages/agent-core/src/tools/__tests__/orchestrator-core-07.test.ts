/**
 * Tests for CORE-07: blocked-on-user persistence to thread state
 *
 * 逆向: amp-cli-reversed/chunk-002.js:20743-20758 — syncPendingApprovalsToThreadState
 * 逆向: amp-cli-reversed/chunk-002.js:20762-20786 — onResume for blocked-on-user
 * 逆向: amp-cli-reversed/chunk-002.js:14409 — IUT session state function
 */
import { describe, expect, it, mock } from "bun:test";
import type { ThreadSnapshot } from "@flitter/schemas";
import { Subject } from "@flitter/util";
import {
  getThreadSessionState,
  type OrchestratorCallbacks,
  ToolOrchestrator,
} from "../orchestrator";
import type { ToolRegistry } from "../registry";
import type { ToolResult, ToolSpec } from "../types";

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

// ─── CORE-07: blocked-on-user persistence ─────────────────

describe("CORE-07: blocked-on-user persistence", () => {
  it("persists blocked-on-user status before showing approval prompt", async () => {
    const threadUpdates: Array<Record<string, unknown>> = [];

    const tools = {
      dangerous: {
        name: "dangerous",
        source: "builtin" as const,
        description: "A dangerous tool",
        inputSchema: {},
        execute: mock(
          async (): Promise<ToolResult> => ({
            status: "done",
            content: "executed",
          }),
        ),
      },
    };

    const registry = createMockRegistry(tools);
    const callbacks = createMockCallbacks({
      updateThread: mock(async (event: Record<string, unknown>) => {
        threadUpdates.push(event);
      }),
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Dangerous tool requires approval",
      }),
      requestApproval: mock(async () => {
        // Check that blocked-on-user was persisted BEFORE this call
        const blockedEvents = threadUpdates.filter((e) => e.status === "blocked-on-user");
        expect(blockedEvents.length).toBeGreaterThan(0);
        return { accepted: true };
      }),
    });

    const orch = new ToolOrchestrator("thread-1", registry, callbacks);

    await orch.executeToolsWithPlan([
      { id: "tu_1", name: "dangerous", input: { cmd: "rm -rf /" } },
    ]);

    // Verify that blocked-on-user was written to thread state
    const blockedEvents = threadUpdates.filter((e) => e.status === "blocked-on-user");
    expect(blockedEvents).toHaveLength(1);
    expect(blockedEvents[0]!.toolUseId).toBe("tu_1");
    expect(blockedEvents[0]!.reason).toBe("Dangerous tool requires approval");
  });
});

// ─── CORE-07: getThreadSessionState ──────────────────────

describe("CORE-07: getThreadSessionState", () => {
  it("returns 'user-tool-approval' when a tool result is blocked-on-user", () => {
    const thread = {
      id: "t1",
      v: 1,
      messages: [
        { role: "assistant", content: [{ type: "tool_use", id: "tu_1", name: "Bash" }] },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tu_1",
              run: { status: "blocked-on-user", reason: "Requires approval" },
            },
          ],
        },
      ],
    } as unknown as ThreadSnapshot;

    expect(getThreadSessionState(thread)).toBe("user-tool-approval");
  });

  it("returns 'tool-running' when inference is running", () => {
    const thread = {
      id: "t1",
      v: 1,
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
    } as unknown as ThreadSnapshot;

    expect(getThreadSessionState(thread, "running")).toBe("tool-running");
  });

  it("returns 'user-message-reply' for idle threads with no blocked tools", () => {
    const thread = {
      id: "t1",
      v: 1,
      messages: [
        { role: "user", content: [{ type: "text", text: "hello" }] },
        { role: "assistant", content: [{ type: "text", text: "hi there" }] },
      ],
    } as unknown as ThreadSnapshot;

    expect(getThreadSessionState(thread)).toBe("user-message-reply");
  });

  it("returns 'user-message-reply' for empty threads", () => {
    const thread = {
      id: "t1",
      v: 1,
      messages: [],
    } as unknown as ThreadSnapshot;

    expect(getThreadSessionState(thread)).toBe("user-message-reply");
  });

  it("returns 'user-tool-approval' even when inference is idle", () => {
    const thread = {
      id: "t1",
      v: 1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tu_2",
              run: { status: "blocked-on-user", reason: "File access" },
            },
          ],
        },
      ],
    } as unknown as ThreadSnapshot;

    // blocked-on-user takes priority over inference state
    expect(getThreadSessionState(thread, "idle")).toBe("user-tool-approval");
  });
});
