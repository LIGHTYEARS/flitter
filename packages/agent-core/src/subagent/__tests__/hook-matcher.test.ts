/**
 * Tests for declarative hook matcher
 * 逆向: LWT, u7R, y7R, b7R
 */
import { describe, expect, test } from "bun:test";
import type { DeclarativeHook } from "../hook-matcher";
import { filterValidHooks, matchPostExecuteHook, matchPreExecuteHook } from "../hook-matcher";

// ─── filterValidHooks ──────────────────────────────────────

describe("filterValidHooks", () => {
  test("returns empty array for null/undefined input", () => {
    expect(filterValidHooks(null)).toEqual([]);
    expect(filterValidHooks(undefined)).toEqual([]);
  });

  test("returns empty array for non-array input", () => {
    expect(filterValidHooks("not-an-array")).toEqual([]);
    expect(filterValidHooks({})).toEqual([]);
  });

  test("filters out hooks with wrong compatibilityDate", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-1",
        compatibilityDate: "2024-01-01",
        on: { event: "tool:pre-execute", tool: "Bash" },
        action: { type: "send-user-message", message: "blocked" },
      },
    ];
    expect(filterValidHooks(hooks)).toEqual([]);
  });

  test("keeps hooks with correct compatibilityDate", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-1",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash" },
        action: { type: "send-user-message", message: "blocked" },
      },
    ];
    expect(filterValidHooks(hooks)).toHaveLength(1);
  });

  test("filters out redact-tool-input with pre-execute (b7R validation)", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-invalid",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash" },
        action: { type: "redact-tool-input" },
      },
    ];
    expect(filterValidHooks(hooks)).toEqual([]);
  });

  test("filters out send-user-message with post-execute (b7R validation)", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-invalid",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "send-user-message", message: "bad" },
      },
    ];
    expect(filterValidHooks(hooks)).toEqual([]);
  });

  test("allows redact-tool-input with post-execute", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-valid",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input", redactedInput: {} },
      },
    ];
    expect(filterValidHooks(hooks)).toHaveLength(1);
  });

  test("allows handoff action with either event type", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-handoff-pre",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash" },
        action: { type: "handoff", goal: "some goal" },
      },
      {
        id: "hook-handoff-post",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "handoff", goal: "some goal" },
      },
    ];
    expect(filterValidHooks(hooks)).toHaveLength(2);
  });
});

// ─── matchPreExecuteHook ───────────────────────────────────

describe("matchPreExecuteHook", () => {
  test("returns {action: null} for null hooks", () => {
    const result = matchPreExecuteHook(null, { toolName: "Bash", toolInput: {} });
    expect(result).toEqual({ action: null });
  });

  test("returns {action: null} when no hooks match tool name", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-1",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Read", "input.contains": ["secret"] },
        action: { type: "send-user-message", message: "blocked" },
      },
    ];
    const result = matchPreExecuteHook(hooks, { toolName: "Bash", toolInput: { command: "ls" } });
    expect(result).toEqual({ action: null });
  });

  test("matches when tool name and input.contains match", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "secret-guard",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash", "input.contains": ["rm -rf"] },
        action: { type: "send-user-message", message: "Dangerous command blocked" },
      },
    ];
    const result = matchPreExecuteHook(hooks, {
      toolName: "Bash",
      toolInput: { command: "rm -rf /" },
    });
    expect(result).toEqual({
      hookID: "secret-guard",
      action: { type: "send-user-message", message: "Dangerous command blocked" },
    });
  });

  test("matches when tool is an array and tool name is in the array", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "multi-tool",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: ["Bash", "Write"], "input.contains": ["secret"] },
        action: { type: "send-user-message", message: "secret detected" },
      },
    ];
    const result = matchPreExecuteHook(hooks, {
      toolName: "Write",
      toolInput: { content: "my secret key" },
    });
    expect(result).toEqual({
      hookID: "multi-tool",
      action: { type: "send-user-message", message: "secret detected" },
    });
  });

  test("matches when input.contains is an array and any pattern matches", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "multi-pattern",
        compatibilityDate: "2025-05-13",
        on: {
          event: "tool:pre-execute",
          tool: "Bash",
          "input.contains": ["password", "secret", "token"],
        },
        action: { type: "send-user-message", message: "sensitive data" },
      },
    ];
    const result = matchPreExecuteHook(hooks, {
      toolName: "Bash",
      toolInput: { command: "echo token123" },
    });
    expect(result).toEqual({
      hookID: "multi-pattern",
      action: { type: "send-user-message", message: "sensitive data" },
    });
  });

  test("skips hooks with if === false", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "disabled-hook",
        compatibilityDate: "2025-05-13",
        if: false,
        on: { event: "tool:pre-execute", tool: "Bash", "input.contains": ["rm"] },
        action: { type: "send-user-message", message: "blocked" },
      },
    ];
    const result = matchPreExecuteHook(hooks, {
      toolName: "Bash",
      toolInput: { command: "rm file" },
    });
    expect(result).toEqual({ action: null });
  });

  test("skips post-execute hooks", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "post-hook",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input", redactedInput: {} },
      },
    ];
    const result = matchPreExecuteHook(hooks, {
      toolName: "Bash",
      toolInput: { command: "ls" },
    });
    expect(result).toEqual({ action: null });
  });

  test("does not match when input does not contain the pattern", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "no-match",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash", "input.contains": ["password"] },
        action: { type: "send-user-message", message: "blocked" },
      },
    ];
    const result = matchPreExecuteHook(hooks, {
      toolName: "Bash",
      toolInput: { command: "echo hello" },
    });
    expect(result).toEqual({ action: null });
  });

  test("returns first matching hook only", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "first",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash", "input.contains": ["rm"] },
        action: { type: "send-user-message", message: "first match" },
      },
      {
        id: "second",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash", "input.contains": ["rm"] },
        action: { type: "send-user-message", message: "second match" },
      },
    ];
    const result = matchPreExecuteHook(hooks, {
      toolName: "Bash",
      toolInput: { command: "rm file" },
    });
    expect(result.hookID).toBe("first");
  });
});

// ─── matchPostExecuteHook ──────────────────────────────────

describe("matchPostExecuteHook", () => {
  test("returns {action: null} for null hooks", () => {
    const result = matchPostExecuteHook(null, { toolName: "Bash" });
    expect(result).toEqual({ action: null });
  });

  test("returns {action: null} when no hooks match", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "hook-1",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: "Read" },
        action: { type: "redact-tool-input", redactedInput: {} },
      },
    ];
    const result = matchPostExecuteHook(hooks, { toolName: "Bash" });
    expect(result).toEqual({ action: null });
  });

  test("matches redact-tool-input hook for matching tool", () => {
    const redactedInput = { command: "[REDACTED]" };
    const hooks: DeclarativeHook[] = [
      {
        id: "redact-bash",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input", redactedInput },
      },
    ];
    const result = matchPostExecuteHook(hooks, { toolName: "Bash" });
    expect(result).toEqual({
      hookID: "redact-bash",
      action: { type: "redact-tool-input", redactedInput },
    });
  });

  test("matches when tool is an array", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "redact-multi",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: ["Bash", "Write"] },
        action: { type: "redact-tool-input", redactedInput: {} },
      },
    ];
    const result = matchPostExecuteHook(hooks, { toolName: "Write" });
    expect(result.hookID).toBe("redact-multi");
  });

  test("skips hooks with if === false", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "disabled",
        compatibilityDate: "2025-05-13",
        if: false,
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input", redactedInput: {} },
      },
    ];
    const result = matchPostExecuteHook(hooks, { toolName: "Bash" });
    expect(result).toEqual({ action: null });
  });

  test("skips pre-execute hooks", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "pre-hook",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:pre-execute", tool: "Bash", "input.contains": ["rm"] },
        action: { type: "send-user-message", message: "blocked" },
      },
    ];
    const result = matchPostExecuteHook(hooks, { toolName: "Bash" });
    expect(result).toEqual({ action: null });
  });

  test("does not match handoff actions (only redact-tool-input)", () => {
    const hooks: DeclarativeHook[] = [
      {
        id: "handoff",
        compatibilityDate: "2025-05-13",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "handoff", goal: "some goal" },
      },
    ];
    const result = matchPostExecuteHook(hooks, { toolName: "Bash" });
    expect(result).toEqual({ action: null });
  });
});
