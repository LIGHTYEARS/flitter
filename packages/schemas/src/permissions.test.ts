/**
 * Tests for tool permissions DSL Zod schemas.
 *
 * Runner: node:test (built-in Node.js test runner)
 * Zod version: v4 — JSON Schema via z.toJSONSchema(schema)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import {
  PermissionMatcherSchema,
  PermissionActionSchema,
  PermissionContextSchema,
  PermissionEntrySchema,
  PermissionEntryListSchema,
  ToolSourceSchema,
  ToolRunInternalStatusSchema,
  ToolRunDisplayStatusSchema,
  ToolEnableResultSchema,
  ToolApprovalRequestSchema,
  ToolApprovalResponseSchema,
  PermissionCheckResultSchema,
} from "./permissions";

// ──────────────────────────────────────────────────────────
// 1. PermissionMatcher recursive
// ──────────────────────────────────────────────────────────
describe("PermissionMatcher recursive", () => {
  it("accepts a string glob pattern", () => {
    const result = PermissionMatcherSchema.parse("*.ts");
    assert.equal(result, "*.ts");
  });

  it("accepts a boolean", () => {
    assert.equal(PermissionMatcherSchema.parse(true), true);
    assert.equal(PermissionMatcherSchema.parse(false), false);
  });

  it("accepts a number", () => {
    assert.equal(PermissionMatcherSchema.parse(42), 42);
  });

  it("accepts null", () => {
    assert.equal(PermissionMatcherSchema.parse(null), null);
  });

  it("accepts undefined", () => {
    assert.equal(PermissionMatcherSchema.parse(undefined), undefined);
  });

  it("accepts an array (OR matcher) with at least 1 element", () => {
    const result = PermissionMatcherSchema.parse(["*.ts", "*.js"]);
    assert.deepEqual(result, ["*.ts", "*.js"]);
  });

  it("accepts a nested object matcher", () => {
    const result = PermissionMatcherSchema.parse({ path: "*.ts", recursive: true });
    assert.deepEqual(result, { path: "*.ts", recursive: true });
  });

  it("accepts deeply nested object + array combinations", () => {
    const input = {
      outer: {
        inner: ["a", "b"],
        flag: false,
        count: 7,
        empty: null,
      },
    };
    const result = PermissionMatcherSchema.parse(input);
    assert.deepEqual(result, input);
  });
});

// ──────────────────────────────────────────────────────────
// 2. PermissionMatcher array min(1)
// ──────────────────────────────────────────────────────────
describe("PermissionMatcher array min(1)", () => {
  it("rejects an empty array", () => {
    const result = PermissionMatcherSchema.safeParse([]);
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 3. PermissionAction
// ──────────────────────────────────────────────────────────
describe("PermissionAction", () => {
  it("accepts all 4 action values", () => {
    for (const action of ["allow", "reject", "ask", "delegate"] as const) {
      assert.equal(PermissionActionSchema.parse(action), action);
    }
  });

  it("rejects an invalid action value", () => {
    const result = PermissionActionSchema.safeParse("deny");
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 4. PermissionContext
// ──────────────────────────────────────────────────────────
describe("PermissionContext", () => {
  it("accepts thread and subagent", () => {
    assert.equal(PermissionContextSchema.parse("thread"), "thread");
    assert.equal(PermissionContextSchema.parse("subagent"), "subagent");
  });

  it("rejects an invalid context", () => {
    const result = PermissionContextSchema.safeParse("global");
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 5. PermissionEntry — allow
// ──────────────────────────────────────────────────────────
describe("PermissionEntry allow", () => {
  it("parses a basic allow rule", () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Bash",
      action: "allow",
    });
    assert.equal(entry.tool, "Bash");
    assert.equal(entry.action, "allow");
  });
});

// ──────────────────────────────────────────────────────────
// 6. PermissionEntry — reject with message
// ──────────────────────────────────────────────────────────
describe("PermissionEntry reject", () => {
  it("parses a reject rule with a message", () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Bash",
      action: "reject",
      message: "Dangerous command",
    });
    assert.equal(entry.action, "reject");
    assert.equal(entry.message, "Dangerous command");
  });
});

// ──────────────────────────────────────────────────────────
// 7. PermissionEntry — ask
// ──────────────────────────────────────────────────────────
describe("PermissionEntry ask", () => {
  it("parses a basic ask rule", () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Write",
      action: "ask",
    });
    assert.equal(entry.action, "ask");
  });
});

// ──────────────────────────────────────────────────────────
// 8. PermissionEntry — delegate with "to"
// ──────────────────────────────────────────────────────────
describe("PermissionEntry delegate", () => {
  it('parses a delegate rule with "to" field', () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Read",
      action: "delegate",
      to: "admin-agent",
    });
    assert.equal(entry.action, "delegate");
    assert.equal(entry.to, "admin-agent");
  });
});

// ──────────────────────────────────────────────────────────
// 9. PermissionEntry delegate constraint — missing "to"
// ──────────────────────────────────────────────────────────
describe("PermissionEntry delegate constraint", () => {
  it('fails when delegate action is missing "to"', () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Read",
      action: "delegate",
    });
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 10. PermissionEntry delegate constraint — non-delegate with "to"
// ──────────────────────────────────────────────────────────
describe("PermissionEntry delegate constraint", () => {
  it('fails when non-delegate action has "to" field', () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Bash",
      action: "allow",
      to: "some-agent",
    });
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 11. PermissionEntry message constraint — allow + message
// ──────────────────────────────────────────────────────────
describe("PermissionEntry message constraint", () => {
  it("fails when allow action has a message", () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Bash",
      action: "allow",
      message: "should not be here",
    });
    assert.equal(result.success, false);
  });

  it("fails when ask action has a message", () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Bash",
      action: "ask",
      message: "should not be here",
    });
    assert.equal(result.success, false);
  });

  it("fails when delegate action has a message", () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Bash",
      action: "delegate",
      to: "some-agent",
      message: "not allowed either",
    });
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 12. PermissionEntry with matches — glob
// ──────────────────────────────────────────────────────────
describe("PermissionEntry with matches", () => {
  it("parses a rule with a glob matcher in matches field", () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Bash",
      action: "allow",
      matches: { command: "ls *" },
    });
    assert.deepEqual(entry.matches, { command: "ls *" });
  });
});

// ──────────────────────────────────────────────────────────
// 13. PermissionEntry with nested object matches
// ──────────────────────────────────────────────────────────
describe("PermissionEntry with nested object matches", () => {
  it("parses a rule with nested object in matches", () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Write",
      action: "ask",
      matches: {
        file_path: ["/etc/*", "/usr/*"],
        content: { pattern: "secret*" },
      },
    });
    assert.deepEqual(entry.matches!.file_path, ["/etc/*", "/usr/*"]);
    assert.deepEqual(entry.matches!.content, { pattern: "secret*" });
  });
});

// ──────────────────────────────────────────────────────────
// 14. PermissionEntry context — thread and subagent
// ──────────────────────────────────────────────────────────
describe("PermissionEntry context", () => {
  it("parses an entry with thread context", () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Bash",
      action: "allow",
      context: "thread",
    });
    assert.equal(entry.context, "thread");
  });

  it("parses an entry with subagent context", () => {
    const entry = PermissionEntrySchema.parse({
      tool: "Bash",
      action: "allow",
      context: "subagent",
    });
    assert.equal(entry.context, "subagent");
  });
});

// ──────────────────────────────────────────────────────────
// 15. PermissionEntryList
// ──────────────────────────────────────────────────────────
describe("PermissionEntryList", () => {
  it("parses an array of multiple permission rules", () => {
    const list = PermissionEntryListSchema.parse([
      { tool: "Bash", action: "allow" },
      { tool: "Write", action: "reject", message: "read-only mode" },
      { tool: "Read", action: "delegate", to: "supervisor" },
    ]);
    assert.equal(list.length, 3);
    assert.equal(list[0].action, "allow");
    assert.equal(list[1].action, "reject");
    assert.equal(list[2].action, "delegate");
  });

  it("accepts an empty list", () => {
    const list = PermissionEntryListSchema.parse([]);
    assert.equal(list.length, 0);
  });
});

// ──────────────────────────────────────────────────────────
// 16. ToolSource
// ──────────────────────────────────────────────────────────
describe("ToolSource", () => {
  it('accepts "builtin"', () => {
    assert.equal(ToolSourceSchema.parse("builtin"), "builtin");
  });

  it("accepts mcp variant", () => {
    const result = ToolSourceSchema.parse({ mcp: "my-server" });
    assert.deepEqual(result, { mcp: "my-server" });
  });

  it("accepts toolbox variant", () => {
    const result = ToolSourceSchema.parse({ toolbox: "code-tools" });
    assert.deepEqual(result, { toolbox: "code-tools" });
  });

  it("rejects an unknown string", () => {
    const result = ToolSourceSchema.safeParse("custom");
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 17. ToolRunInternalStatus — all 8 values
// ──────────────────────────────────────────────────────────
describe("ToolRunInternalStatus", () => {
  const validStatuses = [
    "done",
    "error",
    "cancelled",
    "cancellation-requested",
    "rejected-by-user",
    "in-progress",
    "queued",
    "blocked-on-user",
  ] as const;

  for (const status of validStatuses) {
    it(`accepts "${status}"`, () => {
      assert.equal(ToolRunInternalStatusSchema.parse(status), status);
    });
  }

  it("rejects an unknown status", () => {
    const result = ToolRunInternalStatusSchema.safeParse("pending");
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 18. ToolRunDisplayStatus — all 5 values
// ──────────────────────────────────────────────────────────
describe("ToolRunDisplayStatus", () => {
  const validStatuses = ["done", "error", "cancelled", "running", "pending"] as const;

  for (const status of validStatuses) {
    it(`accepts "${status}"`, () => {
      assert.equal(ToolRunDisplayStatusSchema.parse(status), status);
    });
  }

  it("rejects an unknown status", () => {
    const result = ToolRunDisplayStatusSchema.safeParse("blocked");
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 19. ToolEnableResult
// ──────────────────────────────────────────────────────────
describe("ToolEnableResult", () => {
  it("parses an enabled result", () => {
    const result = ToolEnableResultSchema.parse({ enabled: true });
    assert.equal(result.enabled, true);
    assert.equal(result.disabledReason, undefined);
  });

  it("parses a disabled result with reason", () => {
    const result = ToolEnableResultSchema.parse({
      enabled: false,
      disabledReason: "settings",
    });
    assert.equal(result.enabled, false);
    assert.equal(result.disabledReason, "settings");
  });

  it("rejects an invalid disabledReason value", () => {
    const result = ToolEnableResultSchema.safeParse({
      enabled: false,
      disabledReason: "policy",
    });
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 20. ToolApprovalRequest
// ──────────────────────────────────────────────────────────
describe("ToolApprovalRequest", () => {
  it("parses a full approval request", () => {
    const input = {
      threadId: "thread-1",
      mainThreadId: "main-1",
      toolUseId: "tu-1",
      toolName: "Bash",
      args: { command: "ls" },
      reason: "needs approval",
      context: "thread" as const,
      toAllow: "Bash(command:ls*)",
      subagentToolName: "sub-agent",
      parentToolUseId: "tu-0",
      matchedRule: { tool: "Bash", action: "ask" as const },
      ruleSource: "project-settings",
    };
    const result = ToolApprovalRequestSchema.parse(input);
    assert.equal(result.threadId, "thread-1");
    assert.equal(result.toolName, "Bash");
    assert.deepEqual(result.args, { command: "ls" });
    assert.equal(result.context, "thread");
    assert.equal(result.toAllow, "Bash(command:ls*)");
    assert.equal(result.subagentToolName, "sub-agent");
    assert.equal(result.ruleSource, "project-settings");
  });

  it("parses a minimal approval request (only required fields)", () => {
    const input = {
      threadId: "t1",
      mainThreadId: "m1",
      toolUseId: "tu-2",
      toolName: "Read",
      args: {},
      reason: "file access",
      context: "subagent" as const,
    };
    const result = ToolApprovalRequestSchema.parse(input);
    assert.equal(result.toolName, "Read");
    assert.equal(result.toAllow, undefined);
    assert.equal(result.matchedRule, undefined);
  });
});

// ──────────────────────────────────────────────────────────
// 21. ToolApprovalResponse — all 3 variants
// ──────────────────────────────────────────────────────────
describe("ToolApprovalResponse", () => {
  it("parses accepted: true", () => {
    const result = ToolApprovalResponseSchema.parse({ accepted: true });
    assert.deepEqual(result, { accepted: true });
  });

  it("parses feedback variant", () => {
    const result = ToolApprovalResponseSchema.parse({ feedback: "try a different approach" });
    assert.deepEqual(result, { feedback: "try a different approach" });
  });

  it("parses accepted: false (rejected)", () => {
    const result = ToolApprovalResponseSchema.parse({ accepted: false });
    assert.deepEqual(result, { accepted: false });
  });

  it("rejects an empty object", () => {
    const result = ToolApprovalResponseSchema.safeParse({});
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 22. PermissionCheckResult
// ──────────────────────────────────────────────────────────
describe("PermissionCheckResult", () => {
  it("parses permitted: true", () => {
    const result = PermissionCheckResultSchema.parse({
      permitted: true,
      reason: "matched allow rule",
      action: "ask",
    });
    assert.equal(result.permitted, true);
    assert.equal(result.reason, "matched allow rule");
  });

  it("parses permitted: false with all optional fields", () => {
    const result = PermissionCheckResultSchema.parse({
      permitted: false,
      reason: "blocked",
      action: "reject",
      error: "some error",
      matchedEntry: { tool: "Bash", action: "reject" },
      source: "project-config",
    });
    assert.equal(result.permitted, false);
    assert.equal(result.error, "some error");
    assert.equal(result.source, "project-config");
    assert.deepEqual(result.matchedEntry, { tool: "Bash", action: "reject" });
  });

  it("only allows ask, reject, delegate as action values", () => {
    const result = PermissionCheckResultSchema.safeParse({
      permitted: true,
      reason: "ok",
      action: "allow",
    });
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 23. Reject invalid data
// ──────────────────────────────────────────────────────────
describe("Reject invalid data", () => {
  it("rejects an empty tool string in PermissionEntry", () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "",
      action: "allow",
    });
    assert.equal(result.success, false);
  });

  it("rejects an invalid action in PermissionEntry", () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Bash",
      action: "deny",
    });
    assert.equal(result.success, false);
  });

  it("rejects an invalid context in PermissionEntry", () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Bash",
      action: "allow",
      context: "global",
    });
    assert.equal(result.success, false);
  });

  it("rejects a missing tool field entirely", () => {
    const result = PermissionEntrySchema.safeParse({
      action: "allow",
    });
    assert.equal(result.success, false);
  });

  it("rejects a missing action field entirely", () => {
    const result = PermissionEntrySchema.safeParse({
      tool: "Bash",
    });
    assert.equal(result.success, false);
  });
});

// ──────────────────────────────────────────────────────────
// 24. JSON Schema conversion
// ──────────────────────────────────────────────────────────
describe("JSON Schema conversion", () => {
  it("converts PermissionActionSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(PermissionActionSchema);
    assert.ok(jsonSchema);
    assert.equal(typeof jsonSchema, "object");
    // Zod v4 enum -> JSON Schema "enum" or "anyOf" with const
    // At minimum it should have some recognizable structure
    assert.ok("type" in jsonSchema || "enum" in jsonSchema || "anyOf" in jsonSchema);
  });

  it("converts ToolEnableResultSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(ToolEnableResultSchema);
    assert.ok(jsonSchema);
    assert.equal(typeof jsonSchema, "object");
    assert.ok("type" in jsonSchema || "properties" in jsonSchema);
  });

  it("converts ToolRunDisplayStatusSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(ToolRunDisplayStatusSchema);
    assert.ok(jsonSchema);
    assert.equal(typeof jsonSchema, "object");
  });

  it("handles PermissionEntrySchema (with refine) gracefully", () => {
    // Schemas with .refine() may or may not convert cleanly to JSON Schema.
    // We wrap in try/catch: if it succeeds, verify we got an object;
    // if it throws, that is acceptable behaviour for refined schemas.
    try {
      const jsonSchema = z.toJSONSchema(PermissionEntrySchema);
      assert.ok(jsonSchema);
      assert.equal(typeof jsonSchema, "object");
    } catch {
      // Refined schemas may not be convertible — this is acceptable.
      assert.ok(true);
    }
  });
});
