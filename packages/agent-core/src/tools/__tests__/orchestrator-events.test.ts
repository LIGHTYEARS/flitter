/**
 * ToolOrchestrator tool:start / tool:complete event emission tests
 *
 * Verifies that `onToolEvent` callback is invoked with the correct
 * AgentEvent payloads at tool lifecycle boundaries.
 *
 * 逆向: FWT — amp emits tool:data with status "in-progress" / "done".
 * Flitter adds explicit tool:start / tool:complete AgentEvents for the
 * TUI layer (see events.ts ToolStartEvent / ToolCompleteEvent).
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

/** Minimal no-op ToolRegistry stub */
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

/** Create OrchestratorCallbacks with an onToolEvent spy */
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

describe("ToolOrchestrator tool lifecycle events", () => {
  it("emits tool:start when a tool begins execution", async () => {
    const events: AgentEvent[] = [];
    const registry = createStubRegistry();
    const callbacks = createCallbacks(events);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = {
      id: "tu_001",
      name: "test_tool",
      input: {},
    };

    await orch.executeToolsWithPlan([toolUse]);

    const startEvents = events.filter((e) => e.type === "tool:start");
    assert.equal(startEvents.length, 1, "should emit exactly one tool:start event");
    assert.deepStrictEqual(startEvents[0], {
      type: "tool:start",
      toolUseId: "tu_001",
      toolName: "test_tool",
    });
  });

  it("emits tool:complete when a tool finishes execution", async () => {
    const events: AgentEvent[] = [];
    const registry = createStubRegistry();
    const callbacks = createCallbacks(events);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = {
      id: "tu_002",
      name: "test_tool",
      input: {},
    };

    await orch.executeToolsWithPlan([toolUse]);

    const completeEvents = events.filter((e) => e.type === "tool:complete");
    assert.equal(completeEvents.length, 1, "should emit exactly one tool:complete event");
    assert.deepStrictEqual(completeEvents[0], {
      type: "tool:complete",
      toolUseId: "tu_002",
    });
  });

  it("emits tool:start before tool:complete", async () => {
    const events: AgentEvent[] = [];
    const registry = createStubRegistry();
    const callbacks = createCallbacks(events);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = {
      id: "tu_003",
      name: "test_tool",
      input: {},
    };

    await orch.executeToolsWithPlan([toolUse]);

    const startIdx = events.findIndex((e) => e.type === "tool:start");
    const completeIdx = events.findIndex((e) => e.type === "tool:complete");

    assert.ok(startIdx >= 0, "tool:start must be present");
    assert.ok(completeIdx >= 0, "tool:complete must be present");
    assert.ok(startIdx < completeIdx, "tool:start must come before tool:complete");
  });

  it("emits tool:complete even when tool execution throws", async () => {
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({
      execute: async () => {
        throw new Error("deliberate failure");
      },
    });
    const callbacks = createCallbacks(events);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = {
      id: "tu_004",
      name: "test_tool",
      input: {},
    };

    await orch.executeToolsWithPlan([toolUse]);

    const completeEvents = events.filter((e) => e.type === "tool:complete");
    assert.equal(completeEvents.length, 1, "tool:complete must fire even on error");
    assert.equal((completeEvents[0] as { toolUseId: string }).toolUseId, "tu_004");
  });

  it("includes correct toolName on tool:start events", async () => {
    const events: AgentEvent[] = [];
    const registry = createStubRegistry({ name: "my_custom_tool" });
    const callbacks = createCallbacks(events);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = {
      id: "tu_005",
      name: "my_custom_tool",
      input: { query: "hello" },
    };

    await orch.executeToolsWithPlan([toolUse]);

    const startEvents = events.filter((e) => e.type === "tool:start");
    assert.equal(startEvents.length, 1);
    assert.equal((startEvents[0] as { toolName: string }).toolName, "my_custom_tool");
  });

  it("emits events for multiple tools in a batch", async () => {
    const events: AgentEvent[] = [];
    const registry = createStubRegistry();
    const callbacks = createCallbacks(events);
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUses: ToolUseItem[] = [
      { id: "tu_a", name: "test_tool", input: {} },
      { id: "tu_b", name: "test_tool", input: {} },
    ];

    await orch.executeToolsWithPlan(toolUses);

    const startEvents = events.filter((e) => e.type === "tool:start");
    const completeEvents = events.filter((e) => e.type === "tool:complete");

    assert.equal(startEvents.length, 2, "should emit tool:start for both tools");
    assert.equal(completeEvents.length, 2, "should emit tool:complete for both tools");

    const startIds = startEvents.map((e) => (e as { toolUseId: string }).toolUseId).sort();
    const completeIds = completeEvents.map((e) => (e as { toolUseId: string }).toolUseId).sort();

    assert.deepStrictEqual(startIds, ["tu_a", "tu_b"]);
    assert.deepStrictEqual(completeIds, ["tu_a", "tu_b"]);
  });

  it("does not emit events when onToolEvent callback is not provided", async () => {
    // This test verifies the optional chaining doesn't throw
    const registry = createStubRegistry();
    const callbacks: OrchestratorCallbacks = {
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
      // intentionally no onToolEvent
    };
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const toolUse: ToolUseItem = {
      id: "tu_006",
      name: "test_tool",
      input: {},
    };

    // Should not throw
    await orch.executeToolsWithPlan([toolUse]);
  });
});
