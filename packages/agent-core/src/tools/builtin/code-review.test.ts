/**
 * Tests for code_review tool
 * 逆向: chunk-005.js:146498-146567 (OzT)
 */

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { createCodeReviewTool } from "./code-review";
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

describe("createCodeReviewTool", () => {
  describe("spec", () => {
    const tool = createCodeReviewTool(
      makeMockSubAgentManager({
        threadId: "t1",
        response: "review complete",
        status: "completed",
      }),
    );

    it("has correct name", () => {
      assert.equal(tool.name, "code_review");
    });

    it("has correct source", () => {
      assert.equal(tool.source, "builtin");
    });

    it("is read-only", () => {
      assert.equal(tool.isReadOnly, true);
    });

    it("requires diff_description", () => {
      const schema = tool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      assert.deepEqual(schema.required, ["diff_description"]);
      assert.ok(schema.properties.diff_description);
      assert.ok(schema.properties.files);
      assert.ok(schema.properties.instructions);
      assert.ok(schema.properties.thoroughness);
    });

    it("has thoroughness enum", () => {
      const schema = tool.inputSchema as {
        properties: Record<string, { enum?: string[] }>;
      };
      assert.deepEqual(schema.properties.thoroughness.enum, [
        "methodical",
        "quick",
      ]);
    });
  });

  describe("execute", () => {
    it("returns error when diff_description is missing", async () => {
      const tool = createCodeReviewTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "completed",
        }),
      );
      const result = await tool.execute({}, makeContext());
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("diff_description"),
      );
    });

    it("spawns subagent and returns completed review", async () => {
      const tool = createCodeReviewTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response:
            "## Review Summary\n\n1 bug found in auth.ts line 42: missing null check.",
          status: "completed",
        }),
      );
      const result = await tool.execute(
        { diff_description: "git diff HEAD~1" },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("bug found"));
    });

    it("handles timeout", async () => {
      const tool = createCodeReviewTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "partial review...",
          status: "timeout",
        }),
      );
      const result = await tool.execute(
        { diff_description: "git diff" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("timed out"));
    });

    it("handles cancelled", async () => {
      const tool = createCodeReviewTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "cancelled",
        }),
      );
      const result = await tool.execute(
        { diff_description: "git diff" },
        makeContext(),
      );
      assert.equal(result.status, "cancelled");
    });

    it("handles subagent error", async () => {
      const tool = createCodeReviewTool(
        makeMockSubAgentManager({
          threadId: "t1",
          response: "",
          status: "error",
          error: "Review agent failed",
        }),
      );
      const result = await tool.execute(
        { diff_description: "git diff" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("Review agent failed"),
      );
    });

    it("includes files in prompt when provided", async () => {
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

      const tool = createCodeReviewTool(capturingManager);
      await tool.execute(
        {
          diff_description: "changes to auth",
          files: ["src/auth.ts", "src/login.ts"],
        },
        makeContext(),
      );
      assert.ok(capturedPrompt.includes("src/auth.ts"));
      assert.ok(capturedPrompt.includes("src/login.ts"));
    });

    it("includes instructions in prompt when provided", async () => {
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

      const tool = createCodeReviewTool(capturingManager);
      await tool.execute(
        {
          diff_description: "changes to auth",
          instructions: "Focus on security issues",
        },
        makeContext(),
      );
      assert.ok(capturedPrompt.includes("Focus on security issues"));
    });

    it("sets subagent type to code-review", async () => {
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

      const tool = createCodeReviewTool(capturingManager);
      await tool.execute(
        { diff_description: "test" },
        makeContext(),
      );
      assert.equal(capturedType, "code-review");
    });

    it("respects thoroughness parameter", async () => {
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

      const tool = createCodeReviewTool(capturingManager);
      await tool.execute(
        {
          diff_description: "test",
          thoroughness: "quick",
        },
        makeContext(),
      );
      assert.ok(capturedPrompt.includes("quick"));
    });
  });
});
