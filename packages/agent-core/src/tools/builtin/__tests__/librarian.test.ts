/**
 * Tests for librarian subagent tool
 *
 * Tests: tool spec, prompt builder, execution via mock SubAgentManager
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLibrarianPrompt, createLibrarianTool } from "../librarian";

// ─── buildLibrarianPrompt ───────────────────────────────

describe("buildLibrarianPrompt", () => {
  it("should return query only when no context", () => {
    const result = buildLibrarianPrompt({ query: "How does auth work?" });
    assert.equal(result, "How does auth work?");
  });

  it("should prepend context when provided", () => {
    const result = buildLibrarianPrompt({
      query: "Explain the routing system",
      context: "We use Next.js App Router",
    });
    assert.equal(result, "Context: We use Next.js App Router\n\nQuery: Explain the routing system");
  });

  it("should not include Context prefix without context", () => {
    const result = buildLibrarianPrompt({ query: "Show me the README" });
    assert.ok(!result.includes("Context:"));
    assert.ok(!result.includes("Query:"));
  });
});

// ─── createLibrarianTool — spec ─────────────────────────

describe("createLibrarianTool spec", () => {
  const mockSubAgentManager = {
    spawn: async () => ({ status: "completed" as const, response: "" }),
  };
  const tool = createLibrarianTool(mockSubAgentManager as never);

  it("should have correct name", () => {
    assert.equal(tool.name, "librarian");
  });

  it("should be a builtin tool", () => {
    assert.equal(tool.source, "builtin");
  });

  it("should be read-only (librarian does not edit)", () => {
    assert.equal(tool.isReadOnly, true);
  });

  it("should have disableTimeout", () => {
    assert.equal(tool.executionProfile?.disableTimeout, true);
  });

  it("should have empty resourceKeys", () => {
    assert.deepEqual(tool.executionProfile?.resourceKeys, []);
  });

  it("should require query parameter", () => {
    const schema = tool.inputSchema as Record<string, unknown>;
    assert.deepEqual(schema.required, ["query"]);
  });

  it("should have query and context properties", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    assert.ok(props.query);
    assert.ok(props.context);
  });

  it("should NOT have files property (unlike oracle)", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    assert.ok(!props.files, "librarian should not have files property");
  });

  it("should describe GitHub tools in description", () => {
    assert.ok(tool.description.includes("read_github"));
    assert.ok(tool.description.includes("search_github"));
    assert.ok(tool.description.includes("commit_search"));
  });

  it("should mention remote repositories in description", () => {
    assert.ok(tool.description.includes("repositories outside the local workspace"));
  });
});

// ─── createLibrarianTool — execution ────────────────────

describe("createLibrarianTool execution", () => {
  it("should error on missing query", async () => {
    const tool = createLibrarianTool({ spawn: async () => ({}) } as never);
    const result = await tool.execute!({}, { threadId: "t1" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("query"));
  });

  it("should spawn librarian subagent on valid input", async () => {
    let spawnArgs: Record<string, unknown> | undefined;
    const tool = createLibrarianTool({
      spawn: async (args: Record<string, unknown>) => {
        spawnArgs = args;
        return { status: "completed", response: "The auth uses OAuth 2.0 PKCE flow" };
      },
    } as never);

    const result = await tool.execute!(
      { query: "How does auth work in repo X?", context: "We need SSO" },
      { threadId: "thread-abc" } as never,
    );

    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("OAuth 2.0 PKCE"));
    assert.equal(spawnArgs?.type, "librarian");
    assert.ok((spawnArgs?.description as string).includes("Librarian:"));
    assert.ok((spawnArgs?.prompt as string).includes("How does auth work"));
    assert.equal(spawnArgs?.parentThreadId, "thread-abc");
  });

  it("should use query directly when no context", async () => {
    let capturedPrompt = "";
    const tool = createLibrarianTool({
      spawn: async (args: Record<string, unknown>) => {
        capturedPrompt = args.prompt as string;
        return { status: "completed", response: "ok" };
      },
    } as never);

    await tool.execute!({ query: "Read the README" }, { threadId: "t" } as never);
    assert.equal(capturedPrompt, "Read the README");
  });

  it("should format prompt with context when provided", async () => {
    let capturedPrompt = "";
    const tool = createLibrarianTool({
      spawn: async (args: Record<string, unknown>) => {
        capturedPrompt = args.prompt as string;
        return { status: "completed", response: "ok" };
      },
    } as never);

    await tool.execute!({ query: "How does X work?", context: "Building a plugin" }, {
      threadId: "t",
    } as never);
    assert.ok(capturedPrompt.includes("Context: Building a plugin"));
    assert.ok(capturedPrompt.includes("Query: How does X work?"));
  });

  it("should handle timeout status", async () => {
    const tool = createLibrarianTool({
      spawn: async () => ({ status: "timeout", response: "partial analysis" }),
    } as never);

    const result = await tool.execute!({ query: "Analyze" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("timed out"));
    assert.ok(result.content?.includes("partial"));
  });

  it("should handle cancelled status", async () => {
    const tool = createLibrarianTool({
      spawn: async () => ({ status: "cancelled", response: "" }),
    } as never);

    const result = await tool.execute!({ query: "Plan" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("cancelled"));
  });

  it("should handle error status", async () => {
    const tool = createLibrarianTool({
      spawn: async () => ({ status: "error", error: "Model unavailable" }),
    } as never);

    const result = await tool.execute!({ query: "Debug" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Model unavailable"));
  });

  it("should handle spawn exception", async () => {
    const tool = createLibrarianTool({
      spawn: async () => {
        throw new Error("Network failure");
      },
    } as never);

    const result = await tool.execute!({ query: "Help" }, { threadId: "t" } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("Network failure"));
  });

  it("should truncate long query in description", async () => {
    let capturedDesc = "";
    const longQuery = "A".repeat(100);
    const tool = createLibrarianTool({
      spawn: async (args: Record<string, unknown>) => {
        capturedDesc = args.description as string;
        return { status: "completed", response: "ok" };
      },
    } as never);

    await tool.execute!({ query: longQuery }, { threadId: "t" } as never);
    assert.ok(capturedDesc.length < 100);
    assert.ok(capturedDesc.includes("..."));
  });
});
