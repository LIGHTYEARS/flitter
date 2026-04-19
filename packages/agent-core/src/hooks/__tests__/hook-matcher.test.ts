/**
 * Admin hook matcher tests
 *
 * Covers: filterValidHooks (compatibilityDate + b7R validation),
 *         matchPreExecuteHook (input.contains matching),
 *         matchPostExecuteHook (tool:post-execute matching)
 *
 * 逆向: LWT (1190), b7R (1189), u7R (1191), y7R (1192)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AdminHookConfig,
  PreExecuteContext,
  PostExecuteContext,
} from "../hook-matcher";
import {
  filterValidHooks,
  matchPreExecuteHook,
  matchPostExecuteHook,
} from "../hook-matcher";

// ─── Helpers ──────────────────────────────────────────────

function makeHook(overrides?: Partial<AdminHookConfig>): AdminHookConfig {
  return {
    id: "hook-1",
    compatibilityDate: "2025-05-13",
    on: {
      event: "tool:pre-execute",
      tool: "Bash",
      "input.contains": "rm -rf",
    },
    action: {
      type: "send-user-message",
      message: "Dangerous command detected",
    },
    ...overrides,
  };
}

function makePreContext(overrides?: Partial<PreExecuteContext>): PreExecuteContext {
  return {
    threadID: "thread-1",
    toolUse: {
      id: "tu-1",
      name: "Bash",
      input: { command: "rm -rf /tmp/test" },
    },
    ...overrides,
  };
}

function makePostContext(overrides?: Partial<PostExecuteContext>): PostExecuteContext {
  return {
    threadID: "thread-1",
    toolUse: {
      id: "tu-1",
      name: "Bash",
      input: { command: "echo hello" },
    },
    ...overrides,
  };
}

// ─── filterValidHooks ─────────────────────────────────────

describe("filterValidHooks", () => {
  it("accepts hooks with correct compatibilityDate", () => {
    const hooks = [makeHook()];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "hook-1");
  });

  it("rejects hooks with wrong compatibilityDate", () => {
    const hooks = [makeHook({ compatibilityDate: "2024-01-01" })];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 0);
  });

  it("rejects hooks with missing compatibilityDate", () => {
    const hooks = [makeHook({ compatibilityDate: "" })];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 0);
  });

  it("returns empty array for null/undefined input", () => {
    assert.deepEqual(filterValidHooks(null), []);
    assert.deepEqual(filterValidHooks(undefined), []);
  });

  it("returns empty array for non-array input", () => {
    assert.deepEqual(filterValidHooks("not-array" as unknown as AdminHookConfig[]), []);
  });

  it("rejects redact-tool-input on pre-execute event (b7R validation)", () => {
    const hooks = [
      makeHook({
        on: { event: "tool:pre-execute", tool: "Bash" },
        action: { type: "redact-tool-input", redactedInput: {} },
      }),
    ];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 0);
  });

  it("rejects send-user-message on post-execute event (b7R validation)", () => {
    const hooks = [
      makeHook({
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "send-user-message", message: "test" },
      }),
    ];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 0);
  });

  it("accepts redact-tool-input on post-execute event", () => {
    const hooks = [
      makeHook({
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input", redactedInput: {} },
      }),
    ];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 1);
  });

  it("accepts send-user-message on pre-execute event", () => {
    const hooks = [makeHook()];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 1);
  });

  it("accepts handoff action on either event", () => {
    const pre = [
      makeHook({
        on: { event: "tool:pre-execute", tool: "Bash" },
        action: { type: "handoff", goal: "test" },
      }),
    ];
    const post = [
      makeHook({
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "handoff", goal: "test" },
      }),
    ];
    assert.equal(filterValidHooks(pre).length, 1);
    assert.equal(filterValidHooks(post).length, 1);
  });

  it("filters mixed valid and invalid hooks", () => {
    const hooks = [
      makeHook({ id: "valid" }),
      makeHook({ id: "bad-date", compatibilityDate: "wrong" }),
      makeHook({
        id: "bad-pairing",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "send-user-message", message: "test" },
      }),
    ];
    const result = filterValidHooks(hooks);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "valid");
  });
});

// ─── matchPreExecuteHook ──────────────────────────────────

describe("matchPreExecuteHook", () => {
  it("matches when tool name and input.contains match", () => {
    const hooks = [makeHook()];
    const ctx = makePreContext();
    const result = matchPreExecuteHook(hooks, ctx);
    assert.equal(result.action?.type, "send-user-message");
    assert.equal(result.hookID, "hook-1");
  });

  it("returns null action when no hooks match", () => {
    const hooks = [makeHook()];
    const ctx = makePreContext({
      toolUse: { id: "tu-1", name: "Read", input: { path: "/tmp" } },
    });
    const result = matchPreExecuteHook(hooks, ctx);
    assert.equal(result.action, null);
  });

  it("returns null action for null hooks", () => {
    const result = matchPreExecuteHook(null, makePreContext());
    assert.equal(result.action, null);
  });

  it("skips hooks with if === false", () => {
    const hooks = [makeHook({ if: false })];
    const result = matchPreExecuteHook(hooks, makePreContext());
    assert.equal(result.action, null);
  });

  it("matches with array tool names", () => {
    const hooks = [
      makeHook({
        on: {
          event: "tool:pre-execute",
          tool: ["Bash", "Write"],
          "input.contains": "rm",
        },
      }),
    ];
    const ctx = makePreContext();
    const result = matchPreExecuteHook(hooks, ctx);
    assert.equal(result.action?.type, "send-user-message");
  });

  it("matches with array input.contains patterns", () => {
    const hooks = [
      makeHook({
        on: {
          event: "tool:pre-execute",
          tool: "Bash",
          "input.contains": ["rm -rf", "sudo"],
        },
      }),
    ];
    const ctx = makePreContext();
    const result = matchPreExecuteHook(hooks, ctx);
    assert.equal(result.action?.type, "send-user-message");
  });

  it("does not match input.contains when pattern not in serialized input", () => {
    const hooks = [
      makeHook({
        on: {
          event: "tool:pre-execute",
          tool: "Bash",
          "input.contains": "dangerous-string-not-present",
        },
      }),
    ];
    const ctx = makePreContext();
    const result = matchPreExecuteHook(hooks, ctx);
    assert.equal(result.action, null);
  });

  it("skips post-execute hooks", () => {
    const hooks = [
      makeHook({
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input" },
      }),
    ];
    const ctx = makePreContext();
    const result = matchPreExecuteHook(hooks, ctx);
    // This hook has wrong compatibilityDate/event pairing, but even if it passed
    // filterValidHooks, the pre-execute matcher wouldn't match post-execute events
    assert.equal(result.action, null);
  });

  it("returns first matching hook when multiple match", () => {
    const hooks = [
      makeHook({ id: "first", action: { type: "send-user-message", message: "first" } }),
      makeHook({ id: "second", action: { type: "send-user-message", message: "second" } }),
    ];
    const ctx = makePreContext();
    const result = matchPreExecuteHook(hooks, ctx);
    assert.equal(result.hookID, "first");
    assert.equal(result.action?.message, "first");
  });
});

// ─── matchPostExecuteHook ─────────────────────────────────

describe("matchPostExecuteHook", () => {
  it("matches redact-tool-input on post-execute", () => {
    const hooks = [
      makeHook({
        id: "redact-hook",
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input", redactedInput: { command: "[REDACTED]" } },
      }),
    ];
    const ctx = makePostContext();
    const result = matchPostExecuteHook(hooks, ctx);
    assert.equal(result.action?.type, "redact-tool-input");
    assert.equal(result.hookID, "redact-hook");
  });

  it("returns null action when no hooks match", () => {
    const hooks = [
      makeHook({
        on: { event: "tool:post-execute", tool: "Read" },
        action: { type: "redact-tool-input" },
      }),
    ];
    const ctx = makePostContext();
    const result = matchPostExecuteHook(hooks, ctx);
    assert.equal(result.action, null);
  });

  it("returns null action for null hooks", () => {
    const result = matchPostExecuteHook(null, makePostContext());
    assert.equal(result.action, null);
  });

  it("skips hooks with if === false", () => {
    const hooks = [
      makeHook({
        id: "disabled",
        if: false,
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "redact-tool-input" },
      }),
    ];
    const result = matchPostExecuteHook(hooks, makePostContext());
    assert.equal(result.action, null);
  });

  it("matches with array tool names", () => {
    const hooks = [
      makeHook({
        on: { event: "tool:post-execute", tool: ["Bash", "Write"] },
        action: { type: "redact-tool-input" },
      }),
    ];
    const ctx = makePostContext();
    const result = matchPostExecuteHook(hooks, ctx);
    assert.equal(result.action?.type, "redact-tool-input");
  });

  it("does not match non-redact-tool-input actions on post-execute", () => {
    // handoff is valid on post-execute per b7R, but y7R only triggers on redact-tool-input
    const hooks = [
      makeHook({
        on: { event: "tool:post-execute", tool: "Bash" },
        action: { type: "handoff", goal: "test" },
      }),
    ];
    const ctx = makePostContext();
    const result = matchPostExecuteHook(hooks, ctx);
    assert.equal(result.action, null);
  });
});
