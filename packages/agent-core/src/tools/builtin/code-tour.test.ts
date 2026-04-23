/**
 * Tests for code_tour tool
 * 逆向: modules/2026_tail_anonymous.js:140405-140447 (I2R spec)
 */

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import type { SubAgentManager, SubAgentResult } from "../../subagent/subagent";
import type { ToolContext } from "../types";
import { createCodeTourTool } from "./code-tour";

function makeContext(): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: { settings: {} as Record<string, unknown>, secrets: {} as never },
  };
}

function makeMockSubAgentManager(spawnResult: SubAgentResult): SubAgentManager {
  return {
    spawn: async () => spawnResult,
    activeAgents$: { getValue: () => new Map() } as never,
    dispose: () => {},
  } as unknown as SubAgentManager;
}

describe("code_tour tool", () => {
  describe("tool spec has correct name and schema", () => {
    const tool = createCodeTourTool(
      makeMockSubAgentManager({
        threadId: "t1",
        response: "tour complete",
        status: "completed",
      }),
    );

    it("has correct name", () => {
      assert.equal(tool.name, "code_tour");
    });

    it("has correct source", () => {
      assert.equal(tool.source, "builtin");
    });

    it("is read-only", () => {
      assert.equal(tool.isReadOnly, true);
    });

    it("requires baseRevision", () => {
      const schema = tool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      assert.ok(schema.required.includes("baseRevision"));
      assert.ok(schema.properties.baseRevision);
    });

    it("has optional focus parameter", () => {
      const schema = tool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      assert.ok(schema.properties.focus);
      assert.ok(!schema.required.includes("focus"));
    });

    it("has baseRevision pattern", () => {
      const schema = tool.inputSchema as {
        properties: Record<string, { pattern?: string }>;
      };
      assert.equal(schema.properties.baseRevision?.pattern, "^[0-9a-fA-F]{7,40}$");
    });
  });

  describe("disableTimeout is true", () => {
    it("disableTimeout is true", () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "tour",
          status: "completed",
        }),
      );
      assert.equal(tool.executionProfile?.disableTimeout, true);
    });
  });

  describe("execute", () => {
    it("returns error when baseRevision is missing", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "completed",
        }),
      );
      const result = await tool.execute({}, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("baseRevision"));
    });

    it("returns error when baseRevision is not a valid git hash", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "completed",
        }),
      );
      const result = await tool.execute({ baseRevision: "not-a-hash!" }, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("baseRevision"));
    });

    it("accepts 7-char short hash", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "tour output",
          status: "completed",
        }),
      );
      const result = await tool.execute({ baseRevision: "abc1234" }, makeContext());
      assert.equal(result.status, "done");
    });

    it("accepts 40-char full SHA1 hash", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "tour output",
          status: "completed",
        }),
      );
      const result = await tool.execute(
        { baseRevision: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" },
        makeContext(),
      );
      assert.equal(result.status, "done");
    });

    it("spawns subagent and returns completed tour", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "**Overview:** Added new auth module\n- Key change: JWT validation",
          status: "completed",
        }),
      );
      const result = await tool.execute({ baseRevision: "abc1234" }, makeContext());
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("Overview"));
    });

    it("handles timeout", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "partial tour...",
          status: "timeout",
        }),
      );
      const result = await tool.execute({ baseRevision: "abc1234" }, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("timed out"));
    });

    it("handles cancelled", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "cancelled",
        }),
      );
      const result = await tool.execute({ baseRevision: "abc1234" }, makeContext());
      assert.equal(result.status, "cancelled");
    });

    it("handles subagent error", async () => {
      const tool = createCodeTourTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "error",
          error: "Tour agent failed",
        }),
      );
      const result = await tool.execute({ baseRevision: "abc1234" }, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("Tour agent failed"));
    });

    it("sets subagent type to code-tour", async () => {
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

      const tool = createCodeTourTool(capturingManager);
      await tool.execute({ baseRevision: "abc1234" }, makeContext());
      assert.equal(capturedType, "code-tour");
    });

    it("includes focus in prompt when provided", async () => {
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

      const tool = createCodeTourTool(capturingManager);
      await tool.execute({ baseRevision: "abc1234", focus: "API behavior changes" }, makeContext());
      assert.ok(capturedPrompt.includes("API behavior changes"));
    });

    it("includes baseRevision in prompt", async () => {
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

      const tool = createCodeTourTool(capturingManager);
      await tool.execute({ baseRevision: "abc1234" }, makeContext());
      assert.ok(capturedPrompt.includes("abc1234"));
    });
  });
});
