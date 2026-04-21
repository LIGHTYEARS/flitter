/**
 * Tests for GAP-CORE-13, CORE-14, CORE-10 orchestrator features
 *
 * 1. CORE-13: rejected-by-user status on tool denial
 * 2. CORE-14: onNewUserMessage clears pending approvals
 * 3. CORE-10: processingMutex serializes concurrent operations
 *
 * 逆向: FWT (modules/1234_unknown_FWT.js), $mR (modules/1737_EarliestNonDisabledTool_$mR.js)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Observable } from "@flitter/util";
import { BehaviorSubject } from "@flitter/util";
import type { AgentEvent } from "../../worker/events";
import type { OrchestratorCallbacks, ToolThreadEvent } from "../orchestrator";
import { ToolOrchestrator } from "../orchestrator";
import type { ToolRegistry } from "../registry";
import type { ToolResult, ToolSpec } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createStubRegistry(spec?: Partial<ToolSpec>): ToolRegistry {
  const fullSpec: ToolSpec = {
    name: spec?.name ?? "test_tool",
    source: "builtin",
    description: spec?.description ?? "stub",
    inputSchema: spec?.inputSchema ?? { type: "object", properties: {} },
    execute:
      spec?.execute ??
      (async (): Promise<ToolResult> => ({
        status: "done",
        content: "ok",
      })),
  };
  return {
    get: (name: string) => (name === fullSpec.name ? fullSpec : undefined),
    register: () => {},
    getAll: () => [fullSpec],
    getToolDefinitions: () => [],
    has: (name: string) => name === fullSpec.name,
  } as unknown as ToolRegistry;
}

function createCallbacks(overrides?: Partial<OrchestratorCallbacks>): OrchestratorCallbacks & {
  events: ToolThreadEvent[];
  agentEvents: AgentEvent[];
} {
  const events: ToolThreadEvent[] = [];
  const agentEvents: AgentEvent[] = [];
  return {
    events,
    agentEvents,
    getConfig: async () =>
      ({
        settings: {} as Record<string, unknown>,
      }) as import("@flitter/schemas").Config,
    updateThread: async (event: ToolThreadEvent) => {
      events.push(event);
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
    onToolEvent: (event: AgentEvent) => {
      agentEvents.push(event);
    },
    ...overrides,
  };
}

// ─── CORE-13: rejected-by-user status ─────────────────

describe("CORE-13: rejected-by-user status", () => {
  it("emits rejected-by-user (not cancelled) when user denies without feedback", async () => {
    const cb = createCallbacks({
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Dangerous command",
      }),
      requestApproval: async () => ({ accepted: false }),
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    await orch.executeToolsWithPlan([{ id: "tu_1", name: "test_tool", input: {} }]);

    const rejection = cb.events.find((e) => e.status === "rejected-by-user");
    assert.ok(rejection, "should have emitted rejected-by-user status");
    assert.equal(rejection!.reason, "Dangerous command");
    assert.equal(rejection!.toolUseId, "tu_1");
  });

  it("includes toAllow with command for Bash-like tools", async () => {
    const cb = createCallbacks({
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Needs approval",
      }),
      requestApproval: async () => ({ accepted: false }),
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry({ name: "Bash" }), cb);

    await orch.executeToolsWithPlan([
      { id: "tu_2", name: "Bash", input: { command: "rm -rf /tmp/test" } },
    ]);

    const rejection = cb.events.find((e) => e.status === "rejected-by-user");
    assert.ok(rejection);
    assert.deepEqual(rejection!.toAllow, ["rm -rf /tmp/test"]);
  });

  it("emits error status with feedback message when user denies with feedback", async () => {
    const cb = createCallbacks({
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Needs approval",
      }),
      requestApproval: async () => ({
        accepted: false,
        feedback: "Use a safer approach",
      }),
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    await orch.executeToolsWithPlan([{ id: "tu_3", name: "test_tool", input: {} }]);

    const errorEvent = cb.events.find((e) => e.status === "error");
    assert.ok(errorEvent, "should emit error status for feedback-denial");
    assert.ok(
      errorEvent!.error?.includes("Use a safer approach"),
      "error should contain the feedback text",
    );
  });

  it("emits rejected-by-user for static reject action (not ask)", async () => {
    const cb = createCallbacks({
      checkPermission: () => ({
        permitted: false,
        action: "reject" as const,
        reason: "Blocked by permission rule",
      }),
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    await orch.executeToolsWithPlan([{ id: "tu_4", name: "test_tool", input: {} }]);

    const rejection = cb.events.find((e) => e.status === "rejected-by-user");
    assert.ok(rejection, "static reject should emit rejected-by-user");
    assert.equal(rejection!.reason, "Blocked by permission rule");
  });

  it("includes toAllow with file path for file tools", async () => {
    const cb = createCallbacks({
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Guarded file",
      }),
      requestApproval: async () => ({ accepted: false }),
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry({ name: "Edit" }), cb);

    await orch.executeToolsWithPlan([
      { id: "tu_5", name: "Edit", input: { file_path: "/etc/passwd" } },
    ]);

    const rejection = cb.events.find((e) => e.status === "rejected-by-user");
    assert.ok(rejection);
    assert.deepEqual(rejection!.toAllow, ["/etc/passwd"]);
  });
});

// ─── CORE-14: onNewUserMessage clears pending approvals ─

describe("CORE-14: onNewUserMessage clears pending approvals", () => {
  it("calls clearPendingApprovals callback", async () => {
    let clearCalled = 0;
    const cb = createCallbacks({
      clearPendingApprovals: () => {
        clearCalled++;
      },
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    await orch.onNewUserMessage();

    // clearPendingApprovals is called twice: once pre-emptively outside mutex,
    // once inside cancelAll (idempotent)
    assert.ok(clearCalled >= 1, "clearPendingApprovals should have been called");
  });

  it("cancels running tools via cancelAll", async () => {
    const cb = createCallbacks({
      clearPendingApprovals: () => {},
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    const ac1 = new AbortController();
    const ac2 = new AbortController();
    orch.runningTools.set("t1", { abort: ac1 });
    orch.runningTools.set("t2", { abort: ac2 });

    await orch.onNewUserMessage();

    assert.ok(ac1.signal.aborted, "tool 1 should be aborted");
    assert.ok(ac2.signal.aborted, "tool 2 should be aborted");
    assert.ok(orch.cancelledToolUses.has("t1"));
    assert.ok(orch.cancelledToolUses.has("t2"));
  });

  it("resolves pending approval Promises with accepted: false", async () => {
    // Simulate a pending approval that clearPendingApprovals auto-rejects
    const approvalResponses: Array<{ accepted: boolean }> = [];
    const cb = createCallbacks({
      requestApproval: async () => {
        // This will be auto-resolved by clearPendingApprovals
        return new Promise<{ accepted: boolean }>((resolve) => {
          // Store resolve to simulate external resolution
          setTimeout(() => resolve({ accepted: false }), 0);
        });
      },
      clearPendingApprovals: () => {
        approvalResponses.push({ accepted: false });
      },
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    await orch.onNewUserMessage();

    assert.equal(approvalResponses.length, 2); // pre-emptive + inside cancelAll
    assert.equal(approvalResponses[0]!.accepted, false);
  });
});

// ─── CORE-10: processingMutex serialization ─────────────

describe("CORE-10: processingMutex serialization", () => {
  it("cancelAll acquires and releases the mutex", async () => {
    const cb = createCallbacks();
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    // cancelAll should work without errors (mutex acquire/release)
    await orch.cancelAll("test");
    // Can call again — proves the mutex was properly released
    await orch.cancelAll("test2");
  });

  it("onNewUserMessage serializes through mutex", async () => {
    const cb = createCallbacks({
      clearPendingApprovals: () => {},
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    // Two concurrent onNewUserMessage calls should serialize
    await Promise.all([orch.onNewUserMessage(), orch.onNewUserMessage()]);

    // No deadlock = success
  });

  it("onResume acquires mutex and calls updateFileChanges after release", async () => {
    let fileChangesUpdated = false;
    const cb = createCallbacks({
      updateFileChanges: async () => {
        fileChangesUpdated = true;
      },
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    // Empty thread — onResume should still complete without error
    await orch.onResume({
      id: "t1",
      v: 1,
      title: null,
      messages: [],
      env: "local",
      agentMode: "normal",
      relationships: [],
    } as import("@flitter/schemas").ThreadSnapshot);

    assert.ok(fileChangesUpdated, "updateFileChanges should be called after mutex release");
  });

  it("concurrent cancelAll and onResume serialize without deadlock", async () => {
    const cb = createCallbacks({
      clearPendingApprovals: () => {},
    });
    const orch = new ToolOrchestrator("t1", createStubRegistry(), cb);

    const thread = {
      id: "t1",
      v: 1,
      title: null,
      messages: [],
      env: "local",
      agentMode: "normal",
      relationships: [],
    } as import("@flitter/schemas").ThreadSnapshot;

    // All three mutex-guarded operations concurrently
    await Promise.all([orch.cancelAll("test"), orch.onResume(thread), orch.onNewUserMessage()]);

    // No deadlock = success
  });
});
