/**
 * Tests for hook action applicator
 * 逆向: BI (1194_UseID_BI.js)
 */
import { describe, expect, test } from "bun:test";
import { applyHookAction } from "../hook-applicator";

describe("applyHookAction", () => {
  // ─── No action (null) ──────────────────────────────────

  test("returns {abortOp: false} when action is null", () => {
    const result = applyHookAction({ action: null });
    expect(result).toEqual({ abortOp: false });
  });

  // ─── send-user-message ─────────────────────────────────

  test("send-user-message returns abortOp: true with message", () => {
    const result = applyHookAction({
      hookID: "hook-1",
      action: { type: "send-user-message", message: "Command blocked by policy" },
    });
    expect(result.abortOp).toBe(true);
    expect(result.userMessage).toBe("Command blocked by policy");
    expect(result.hookID).toBe("hook-1");
  });

  test("send-user-message works without hookID", () => {
    const result = applyHookAction({
      action: { type: "send-user-message", message: "blocked" },
    });
    expect(result.abortOp).toBe(true);
    expect(result.userMessage).toBe("blocked");
    expect(result.hookID).toBeUndefined();
  });

  // ─── redact-tool-input ─────────────────────────────────

  test("redact-tool-input returns abortOp: false with redacted input", () => {
    const redactedInput = { command: "[REDACTED]" };
    const result = applyHookAction(
      {
        hookID: "redact-hook",
        action: { type: "redact-tool-input", redactedInput },
      },
      { toolUseID: "tool-123" },
    );
    expect(result.abortOp).toBe(false);
    expect(result.redactedInput).toEqual(redactedInput);
    expect(result.redactedToolUseID).toBe("tool-123");
  });

  test("redact-tool-input without toolUseID returns abortOp: false (warns)", () => {
    const result = applyHookAction({
      hookID: "redact-hook",
      action: { type: "redact-tool-input", redactedInput: {} },
    });
    expect(result.abortOp).toBe(false);
    expect(result.redactedInput).toBeUndefined();
  });

  test("redact-tool-input without context returns abortOp: false (warns)", () => {
    const result = applyHookAction(
      {
        hookID: "redact-hook",
        action: { type: "redact-tool-input", redactedInput: {} },
      },
      {},
    );
    expect(result.abortOp).toBe(false);
    expect(result.redactedInput).toBeUndefined();
  });

  // ─── handoff ───────────────────────────────────────────

  test("handoff returns abortOp: false", () => {
    const result = applyHookAction({
      hookID: "handoff-hook",
      action: { type: "handoff", goal: "Transfer to senior engineer" },
    });
    expect(result.abortOp).toBe(false);
  });

  // ─── Unknown action type ───────────────────────────────

  test("unknown action type returns abortOp: false", () => {
    const result = applyHookAction({
      action: { type: "unknown-type" as never },
    });
    expect(result.abortOp).toBe(false);
  });
});
