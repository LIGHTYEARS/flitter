/**
 * Tests for finder tool
 * 逆向: chunk-005.js:71164-71172 (qe.finder)
 */

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { createFinderTool } from "./finder";
import type { SubAgentManager, SubAgentResult } from "../../subagent/subagent";
import type { ToolContext } from "../types";

function makeContext(): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: { settings: {} as Record<string, unknown>, secrets: {} as never },
  };
}

function makeMockSubAgentManager(
  spawnResult: SubAgentResult,
): SubAgentManager {
  return {
    spawn: async () => spawnResult,
    activeAgents$: { getValue: () => new Map() } as never,
    dispose: () => {},
  } as unknown as SubAgentManager;
}

describe("createFinderTool", () => {
  describe("spec", () => {
    const tool = createFinderTool(
      makeMockSubAgentManager({
        threadId: "t1",
        response: "found stuff",
        status: "completed",
      }),
    );

    it("has correct name", () => {
      assert.equal(tool.name, "finder");
    });

    it("has correct source", () => {
      assert.equal(tool.source, "builtin");
    });

    it("is read-only", () => {
      assert.equal(tool.isReadOnly, true);
    });

    it("requires query", () => {
      const schema = tool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      assert.deepEqual(schema.required, ["query"]);
      assert.ok(schema.properties.query);
    });
  });

  describe("execute", () => {
    it("returns error when query is missing", async () => {
      const tool = createFinderTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "completed",
        }),
      );
      const result = await tool.execute({}, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("query"));
    });

    it("spawns subagent and returns completed result", async () => {
      const tool = createFinderTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "Found the auth module at src/auth/index.ts",
          status: "completed",
        }),
      );
      const result = await tool.execute(
        { query: "authentication module" },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("auth module"));
    });

    it("handles timeout from subagent", async () => {
      const tool = createFinderTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "partial results...",
          status: "timeout",
        }),
      );
      const result = await tool.execute(
        { query: "some search" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("timed out"));
    });

    it("handles cancelled subagent", async () => {
      const tool = createFinderTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "cancelled",
        }),
      );
      const result = await tool.execute(
        { query: "some search" },
        makeContext(),
      );
      assert.equal(result.status, "cancelled");
    });

    it("handles subagent error", async () => {
      const tool = createFinderTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "error",
          error: "Something went wrong",
        }),
      );
      const result = await tool.execute(
        { query: "some search" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("Something went wrong"),
      );
    });

    it("handles spawn throwing an error", async () => {
      const failManager = {
        spawn: async () => {
          throw new Error("SubAgentManager not ready");
        },
        activeAgents$: { getValue: () => new Map() } as never,
        dispose: () => {},
      } as unknown as SubAgentManager;

      const tool = createFinderTool(failManager);
      const result = await tool.execute(
        { query: "some search" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("not ready"),
      );
    });

    it("passes search-focused prompt to subagent", async () => {
      let capturedPrompt = "";
      const capturingManager = {
        spawn: async (opts: { prompt: string }) => {
          capturedPrompt = opts.prompt;
          return {
            threadId: "t1",
            response: "done",
            status: "completed" as const,
          };
        },
        activeAgents$: { getValue: () => new Map() } as never,
        dispose: () => {},
      } as unknown as SubAgentManager;

      const tool = createFinderTool(capturingManager);
      await tool.execute(
        { query: "database connection pooling" },
        makeContext(),
      );
      assert.ok(capturedPrompt.includes("database connection pooling"));
      assert.ok(capturedPrompt.includes("Grep"));
      assert.ok(capturedPrompt.includes("glob"));
      assert.ok(capturedPrompt.includes("Read"));
    });

    it("sets subagent type to finder", async () => {
      let capturedType = "";
      const capturingManager = {
        spawn: async (opts: { type: string }) => {
          capturedType = opts.type;
          return {
            threadId: "t1",
            response: "done",
            status: "completed" as const,
          };
        },
        activeAgents$: { getValue: () => new Map() } as never,
        dispose: () => {},
      } as unknown as SubAgentManager;

      const tool = createFinderTool(capturingManager);
      await tool.execute({ query: "test" }, makeContext());
      assert.equal(capturedType, "finder");
    });
  });
});
