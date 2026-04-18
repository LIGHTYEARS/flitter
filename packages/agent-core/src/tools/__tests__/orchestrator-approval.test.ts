/**
 * ToolOrchestrator approval flow tests
 *
 * Verifies that the checkPermission + requestApproval callbacks correctly
 * gate tool execution, matching amp's toolService approval pattern:
 *
 * 逆向: amp's toolService.invokeTool calls PLT() for permission check.
 * If not permitted and action === "ask", it calls requestApproval() which
 * creates a Promise stored in a Map. resolveApproval() settles it.
 * If accepted, tool executes. If rejected, "rejected-by-user" status.
 * If action === "reject", tool is silently denied.
 *
 * See amp-cli-reversed/chunk-001.js:9870-9950 ($mR toolService factory).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Observable } from "@flitter/util";
import { BehaviorSubject } from "@flitter/util";
import type { AgentEvent } from "../../worker/events";
import type { OrchestratorCallbacks, ToolUseItem } from "../orchestrator";
import { ToolOrchestrator } from "../orchestrator";
import type { ToolRegistry } from "../registry";
import type { ToolResult, ToolSpec } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createStubRegistry(spec?: Partial<ToolSpec>): ToolRegistry {
  const fullSpec: ToolSpec = {
    name: spec?.name ?? "test_tool",
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

function createCallbacks(
  events: AgentEvent[],
  overrides?: Partial<OrchestratorCallbacks>,
): OrchestratorCallbacks {
  return {
    getConfig: async () =>
      ({
        settings: {} as Record<string, unknown>,
      }) as import("@flitter/schemas").Config,
    updateThread: async () => {},
    getToolRunEnvironment: async (_id: string, signal: AbortSignal) => ({
      workspaceRoot: "/tmp",
      abortSignal: signal,
      readFile: async () => "",
      writeFile: async () => {},
    }),
    applyHookResult: async () => ({ abortOp: false }),
    applyPostHookResult: async () => {},
    updateFileChanges: async () => {},
    getDisposed$: () => new BehaviorSubject(false) as unknown as Observable<boolean>,
    onToolEvent: (event: AgentEvent) => {
      events.push(event);
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ToolOrchestrator approval flow", () => {
  it("executes tool when checkPermission returns permitted: true", async () => {
    let executed = false;
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        executed = true;
        return { status: "done", content: "ok" } as ToolResult;
      },
    });
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({ permitted: true }),
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_1", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(executed, "tool should have been executed");
    assert.ok(
      events.some((e) => e.type === "tool:complete"),
      "should emit tool:complete",
    );
  });

  it("blocks tool and calls requestApproval when action is 'ask'", async () => {
    let approvalRequested = false;
    let approvalArgs: Record<string, unknown> = {};
    const events: AgentEvent[] = [];
    const registry = createStubRegistry();
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Needs approval",
      }),
      requestApproval: async (request) => {
        approvalRequested = true;
        approvalArgs = request as unknown as Record<string, unknown>;
        return { accepted: true };
      },
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_2", name: "test_tool", input: { cmd: "rm -rf" } };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(approvalRequested, "requestApproval should have been called");
    assert.equal(approvalArgs.toolUseId, "tu_2");
    assert.equal(approvalArgs.toolName, "test_tool");
    assert.equal(approvalArgs.reason, "Needs approval");
  });

  it("executes tool after user accepts approval", async () => {
    let executed = false;
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        executed = true;
        return { status: "done", content: "ok" } as ToolResult;
      },
    });
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Needs approval",
      }),
      requestApproval: async () => ({ accepted: true }),
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_3", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(executed, "tool should execute after approval accepted");
  });

  it("does NOT execute tool when user rejects approval", async () => {
    let executed = false;
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        executed = true;
        return { status: "done", content: "ok" } as ToolResult;
      },
    });
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Needs approval",
      }),
      requestApproval: async () => ({ accepted: false }),
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_4", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(!executed, "tool should NOT execute after approval rejected");
    assert.ok(
      events.some((e) => e.type === "tool:complete"),
      "should still emit tool:complete on rejection",
    );
  });

  it("does NOT execute tool when action is 'reject'", async () => {
    let executed = false;
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        executed = true;
        return { status: "done", content: "ok" } as ToolResult;
      },
    });
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({
        permitted: false,
        action: "reject" as const,
        reason: "Denied by rule",
      }),
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_5", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(!executed, "tool should NOT execute when action is reject");
    assert.ok(
      events.some((e) => e.type === "tool:complete"),
      "should emit tool:complete on rejection",
    );
  });

  it("executes tool normally when checkPermission is not provided", async () => {
    let executed = false;
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        executed = true;
        return { status: "done", content: "ok" } as ToolResult;
      },
    });
    // No checkPermission at all
    const callbacks = createCallbacks(events);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_6", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(executed, "tool should execute without permission check");
  });

  it("falls through to execute when action is 'ask' but no requestApproval callback", async () => {
    let executed = false;
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        executed = true;
        return { status: "done", content: "ok" } as ToolResult;
      },
    });
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        reason: "Needs approval",
      }),
      // No requestApproval callback
    });
    // Must remove requestApproval since createCallbacks doesn't set it
    delete callbacks.requestApproval;
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_7", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    // Without requestApproval, the action "ask" with no handler should
    // fall through (the code checks `if (this.callbacks.requestApproval)`)
    // and permit execution (since we can't ask the user)
    assert.ok(executed, "tool should execute when ask but no requestApproval callback");
  });

  it("passes through when permitted: false but action is undefined (delegate-like)", async () => {
    let executed = false;
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        executed = true;
        return { status: "done", content: "ok" } as ToolResult;
      },
    });
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({
        permitted: false,
        // No action specified — defaults to fall-through
      }),
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_8", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(executed, "tool should execute when action is undefined");
  });

  it("uses default reason when permResult.reason is not provided", async () => {
    let receivedReason = "";
    const events: AgentEvent[] = [];
    const registry = createStubRegistry();
    const callbacks = createCallbacks(events, {
      checkPermission: () => ({
        permitted: false,
        action: "ask" as const,
        // No reason
      }),
      requestApproval: async (request) => {
        receivedReason = request.reason;
        return { accepted: true };
      },
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_9", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.equal(receivedReason, "Requires user approval", "should use default reason");
  });

  it("emits tool:start before permission check", async () => {
    const events: AgentEvent[] = [];
    let startEmittedBeforeApproval = false;
    const registry = createStubRegistry();
    const callbacks = createCallbacks(events, {
      checkPermission: () => {
        // At this point, tool:start should already have been emitted
        startEmittedBeforeApproval = events.some((e) => e.type === "tool:start");
        return { permitted: true };
      },
    });
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = { id: "tu_10", name: "test_tool", input: {} };
    await orch.executeToolsWithPlan([toolUse]);

    assert.ok(startEmittedBeforeApproval, "tool:start should be emitted before permission check");
  });
});
