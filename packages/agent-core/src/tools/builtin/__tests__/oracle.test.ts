/**
 * Tests for oracle subagent tool
 *
 * Tests: tool spec, prompt builder, execution via mock SubAgentManager
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOraclePrompt, createOracleTool } from "../oracle";

// ─── buildOraclePrompt ───────────────────────────────────

describe("buildOraclePrompt", () => {
  it("should return task only when no context/files", () => {
    const result = buildOraclePrompt({ task: "Review auth module" });
    assert.equal(result, "Review auth module");
  });

  it("should prepend context when provided", () => {
    const result = buildOraclePrompt({
      task: "Review auth module",
      context: "We use JWT tokens",
    });
    assert.equal(result, "Context: We use JWT tokens\n\nTask: Review auth module");
  });

  it("should append file list when provided", () => {
    const result = buildOraclePrompt({
      task: "Review",
      files: ["src/auth.ts", "src/token.ts"],
    });
    assert.ok(result.includes("Relevant files:"));
    assert.ok(result.includes("src/auth.ts"));
    assert.ok(result.includes("src/token.ts"));
  });

  it("should append parent thread reference", () => {
    const result = buildOraclePrompt({
      task: "Debug issue",
      parentThreadId: "thread-123",
    });
    assert.ok(result.includes("Parent thread: thread-123"));
    assert.ok(result.includes("read_thread"));
  });

  it("should combine all fields", () => {
    const result = buildOraclePrompt({
      task: "Review",
      context: "Background info",
      files: ["file.ts"],
      parentThreadId: "t-1",
    });
    assert.ok(result.includes("Context: Background info"));
    assert.ok(result.includes("Task: Review"));
    assert.ok(result.includes("Relevant files:"));
    assert.ok(result.includes("file.ts"));
    assert.ok(result.includes("Parent thread: t-1"));
  });

  it("should not include files section for empty array", () => {
    const result = buildOraclePrompt({ task: "Test", files: [] });
    assert.ok(!result.includes("Relevant files:"));
  });
});

// ─── createOracleTool — spec ─────────────────────────────

describe("createOracleTool spec", () => {
  const mockSubAgentManager = {
    spawn: async () => ({ status: "completed" as const, response: "" }),
  };
  const tool = createOracleTool(mockSubAgentManager as never);

  it("should have correct name", () => {
    assert.equal(tool.name, "oracle");
  });

  it("should be a builtin tool", () => {
    assert.equal(tool.source, "builtin");
  });

  it("should be read-only (oracle does not edit)", () => {
    assert.equal(tool.isReadOnly, true);
  });

  it("should have disableTimeout", () => {
    assert.equal(tool.executionProfile?.disableTimeout, true);
  });

  it("should have empty resourceKeys", () => {
    assert.deepEqual(tool.executionProfile?.resourceKeys, []);
  });

  it("should require task parameter", () => {
    const schema = tool.inputSchema as Record<string, unknown>;
    assert.deepEqual(schema.required, ["task"]);
  });

  it("should have task, context, and files properties", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    assert.ok(props.task);
    assert.ok(props.context);
    assert.ok(props.files);
  });

  it("should describe oracle tools in description", () => {
    assert.ok(tool.description.includes("Read"));
    assert.ok(tool.description.includes("Grep"));
    assert.ok(tool.description.includes("GPT-5.4"));
  });
});

// ─── createOracleTool — execution ────────────────────────

describe("createOracleTool execution", () => {
  it("should error on missing task", async () => {
    const tool = createOracleTool({ spawn: async () => ({}) } as never);
    const result = await tool.execute!({}, { threadId: "t1" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("task"));
  });

  it("should spawn oracle subagent on valid input", async () => {
    let spawnArgs: Record<string, unknown> | undefined;
    const tool = createOracleTool({
      spawn: async (args: Record<string, unknown>) => {
        spawnArgs = args;
        return { status: "completed", response: "Use JWT with RSA256" };
      },
    } as never);

    const result = await tool.execute!({ task: "Review auth approach", context: "We need SSO" }, {
      threadId: "thread-abc",
    } as never);

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("JWT with RSA256"));
    assert.equal(spawnArgs?.type, "oracle");
    assert.ok((spawnArgs?.description as string).includes("Oracle:"));
    assert.ok((spawnArgs?.prompt as string).includes("Review auth approach"));
    assert.equal(spawnArgs?.parentThreadId, "thread-abc");
  });

  it("should handle timeout status", async () => {
    const tool = createOracleTool({
      spawn: async () => ({ status: "timeout", response: "partial analysis" }),
    } as never);

    const result = await tool.execute!({ task: "Analyze" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("timed out"));
    assert.ok(result.content?.includes("partial"));
  });

  it("should handle cancelled status", async () => {
    const tool = createOracleTool({
      spawn: async () => ({ status: "cancelled", response: "" }),
    } as never);

    const result = await tool.execute!({ task: "Plan" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("cancelled"));
  });

  it("should handle error status", async () => {
    const tool = createOracleTool({
      spawn: async () => ({ status: "error", error: "Model unavailable" }),
    } as never);

    const result = await tool.execute!({ task: "Debug" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Model unavailable"));
  });

  it("should handle spawn exception", async () => {
    const tool = createOracleTool({
      spawn: async () => {
        throw new Error("Network failure");
      },
    } as never);

    const result = await tool.execute!({ task: "Help" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Network failure"));
  });

  it("should include file reading instructions when files provided", async () => {
    let capturedPrompt = "";
    const tool = createOracleTool({
      spawn: async (args: Record<string, unknown>) => {
        capturedPrompt = args.prompt as string;
        return { status: "completed", response: "ok" };
      },
    } as never);

    await tool.execute!({ task: "Review", files: ["src/auth.ts", "src/token.ts"] }, {
      threadId: "t",
    } as never);

    assert.ok(capturedPrompt.includes("examine the following files"));
    assert.ok(capturedPrompt.includes("src/auth.ts"));
    assert.ok(capturedPrompt.includes("src/token.ts"));
  });

  it("should truncate long task in description", async () => {
    let capturedDesc = "";
    const longTask = "A".repeat(100);
    const tool = createOracleTool({
      spawn: async (args: Record<string, unknown>) => {
        capturedDesc = args.description as string;
        return { status: "completed", response: "ok" };
      },
    } as never);

    await tool.execute!({ task: longTask }, { threadId: "t" } as never);
    assert.ok(capturedDesc.length < 100);
    assert.ok(capturedDesc.includes("..."));
  });
});
