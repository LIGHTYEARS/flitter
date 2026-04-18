/**
 * ThreadWorker approval flow tests
 *
 * Verifies that _pendingApprovals map + userRespondToApproval correctly
 * bridge the Promise between the orchestrator and user interaction.
 *
 * 逆向: amp's toolService stores resolvers in a Map (`r = new Map()`)
 * keyed by toolUseId. requestApproval() creates a Promise and stores
 * its resolver. resolveApproval() looks up the resolver and settles
 * the Promise.
 *
 * See amp-cli-reversed/chunk-001.js:9716-9739 ($mR functions h, i, c).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LLMProvider } from "@flitter/llm";
import type { Config, ThreadSnapshot } from "@flitter/schemas";
import type { ToolOrchestrator } from "../../tools/orchestrator";
import type { ToolRegistry } from "../../tools/registry";
import { ThreadWorker, type ToolApprovalResponse } from "../thread-worker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMinimalWorker(): ThreadWorker {
  const mockOrchestrator = {
    executeToolsWithPlan: async () => {},
    cancelAll: () => {},
    cancelTool: () => {},
    hasRunningTools: () => false,
    dispose: () => {},
    runningTools: new Map(),
    cancelledToolUses: new Set(),
  } as unknown as ToolOrchestrator;

  const mockProvider = {
    stream: () => (async function* () {})(),
  } as unknown as LLMProvider;

  const mockRegistry = {
    get: () => undefined,
    getAll: () => [],
    getToolDefinitions: () => [],
    has: () => false,
    register: () => {},
  } as unknown as ToolRegistry;

  return new ThreadWorker({
    getThreadSnapshot: () =>
      ({
        id: "test",
        v: 1,
        title: null,
        messages: [],
        env: "local",
        agentMode: "normal",
        relationships: [],
      }) as unknown as ThreadSnapshot,
    updateThreadSnapshot: () => {},
    getMessages: () => [],
    provider: mockProvider,
    toolOrchestrator: mockOrchestrator,
    buildSystemPrompt: async () => [],
    checkAndCompact: async () => null,
    getConfig: () => ({ settings: {} }) as unknown as Config,
    toolRegistry: mockRegistry,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ThreadWorker._pendingApprovals and userRespondToApproval", () => {
  it("resolves pending approval with accepted: true when user approves", async () => {
    const worker = createMinimalWorker();

    // Simulate the orchestrator's requestApproval callback: store a resolver
    const approvalPromise = new Promise<{
      accepted: boolean;
      scope?: string;
      feedback?: string;
    }>((resolve) => {
      worker._pendingApprovals.set("tu_100", resolve);
    });

    // User approves
    await worker.userRespondToApproval("tu_100", { approved: true });

    const result = await approvalPromise;
    assert.equal(result.accepted, true, "should resolve with accepted: true");
    assert.equal(worker._pendingApprovals.size, 0, "should clean up after resolve");
  });

  it("resolves pending approval with accepted: false when user rejects", async () => {
    const worker = createMinimalWorker();

    const approvalPromise = new Promise<{
      accepted: boolean;
      scope?: string;
      feedback?: string;
    }>((resolve) => {
      worker._pendingApprovals.set("tu_101", resolve);
    });

    await worker.userRespondToApproval("tu_101", { approved: false });

    const result = await approvalPromise;
    assert.equal(result.accepted, false, "should resolve with accepted: false");
    assert.equal(worker._pendingApprovals.size, 0, "should clean up after resolve");
  });

  it("does nothing when toolUseId is not in pending approvals", async () => {
    const worker = createMinimalWorker();

    // Should not throw
    await worker.userRespondToApproval("nonexistent_id", { approved: true });

    assert.equal(worker._pendingApprovals.size, 0, "map should remain empty");
  });

  it("handles multiple pending approvals independently", async () => {
    const worker = createMinimalWorker();

    const promise1 = new Promise<{
      accepted: boolean;
      scope?: string;
      feedback?: string;
    }>((resolve) => {
      worker._pendingApprovals.set("tu_200", resolve);
    });
    const promise2 = new Promise<{
      accepted: boolean;
      scope?: string;
      feedback?: string;
    }>((resolve) => {
      worker._pendingApprovals.set("tu_201", resolve);
    });

    assert.equal(worker._pendingApprovals.size, 2, "should have 2 pending approvals");

    // Approve first, reject second
    await worker.userRespondToApproval("tu_200", { approved: true });
    await worker.userRespondToApproval("tu_201", { approved: false });

    const result1 = await promise1;
    const result2 = await promise2;

    assert.equal(result1.accepted, true);
    assert.equal(result2.accepted, false);
    assert.equal(worker._pendingApprovals.size, 0, "all approvals should be cleaned up");
  });

  it("passes scope from ToolApprovalResponse to resolver when approved", async () => {
    const worker = createMinimalWorker();

    const approvalPromise = new Promise<{
      accepted: boolean;
      scope?: string;
      feedback?: string;
    }>((resolve) => {
      worker._pendingApprovals.set("tu_300", resolve);
    });

    await worker.userRespondToApproval("tu_300", {
      approved: true,
      scope: "session",
    } satisfies ToolApprovalResponse);

    const result = await approvalPromise;
    assert.equal(result.accepted, true);
    assert.equal(result.scope, "session");
  });
});
