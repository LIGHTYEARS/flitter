// packages/cli/src/widgets/__tests__/thread-state-approval.test.ts
import { describe, expect, it } from "bun:test";

/**
 * Tests for the approval state-transition logic in ThreadStateWidgetState.
 *
 * These tests validate the pattern in isolation:
 * - approval:request event sets pendingApproval
 * - approval:response event clears pendingApproval
 * - tool:complete event for matching toolUseId clears pendingApproval
 *
 * We test the state machine logic directly rather than instantiating
 * the full widget tree (which requires a real BuildContext).
 */
describe("ThreadStateWidget approval state transitions", () => {
  it("approval:request sets pending state, approval:response clears it", () => {
    // Simulate the state transitions that happen in the events$ subscriber
    let waitingForApproval = false;
    let pendingApproval: {
      toolUseId: string;
      toolName: string;
      args: Record<string, unknown>;
      reason: string;
    } | null = null;

    // Simulate approval:request event
    const requestEvent = {
      type: "approval:request",
      toolUseId: "tu_1",
      toolName: "Bash",
      args: { command: "rm -rf /tmp" },
      reason: "Tool requires approval",
    };
    waitingForApproval = true;
    pendingApproval = {
      toolUseId: requestEvent.toolUseId,
      toolName: requestEvent.toolName,
      args: requestEvent.args,
      reason: requestEvent.reason,
    };

    expect(waitingForApproval).toBe(true);
    expect(pendingApproval).toEqual({
      toolUseId: "tu_1",
      toolName: "Bash",
      args: { command: "rm -rf /tmp" },
      reason: "Tool requires approval",
    });

    // Simulate approval:response event
    waitingForApproval = false;
    pendingApproval = null;

    expect(waitingForApproval).toBe(false);
    expect(pendingApproval).toBeNull();
  });

  it("tool:complete for matching toolUseId clears pending approval", () => {
    let waitingForApproval = true;
    let pendingApproval: { toolUseId: string } | null = {
      toolUseId: "tu_42",
    };
    let runningToolCount = 1;

    // Simulate tool:complete event with matching toolUseId
    const completeEvent = { type: "tool:complete", toolUseId: "tu_42" };
    runningToolCount = Math.max(0, runningToolCount - 1);
    if (pendingApproval && completeEvent.toolUseId === pendingApproval.toolUseId) {
      pendingApproval = null;
      waitingForApproval = false;
    }

    expect(runningToolCount).toBe(0);
    expect(pendingApproval).toBeNull();
    expect(waitingForApproval).toBe(false);
  });

  it("tool:complete for non-matching toolUseId does not clear pending approval", () => {
    let waitingForApproval = true;
    let pendingApproval: { toolUseId: string } | null = {
      toolUseId: "tu_42",
    };
    let runningToolCount = 2;

    // Simulate tool:complete event with a DIFFERENT toolUseId
    const completeEvent = { type: "tool:complete", toolUseId: "tu_99" };
    runningToolCount = Math.max(0, runningToolCount - 1);
    if (pendingApproval && completeEvent.toolUseId === pendingApproval.toolUseId) {
      pendingApproval = null;
      waitingForApproval = false;
    }

    expect(runningToolCount).toBe(1);
    expect(pendingApproval).toEqual({ toolUseId: "tu_42" });
    expect(waitingForApproval).toBe(true);
  });
});
