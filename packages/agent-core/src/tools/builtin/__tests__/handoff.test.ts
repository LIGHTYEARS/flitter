/**
 * Tests for handoff LLM-callable tool
 *
 * 逆向: amp modules/2026_tail_anonymous.js:111178-111223
 */
import { describe, expect, test } from "bun:test";
import { createHandoffTool } from "../handoff.js";

function makeMockCallbacks(
  result: string | undefined = "new-thread-123",
  shouldThrow = false,
  returnUndefined = false,
) {
  const calls: Array<{ goal: string; options?: { follow?: boolean; mode?: string } }> = [];
  return {
    calls,
    callbacks: {
      executeHandoff: async (goal: string, options?: { follow?: boolean; mode?: string }) => {
        calls.push({ goal, options });
        if (shouldThrow) throw new Error("Handoff executor unavailable");
        return returnUndefined ? undefined : result;
      },
    },
  };
}

describe("handoff tool", () => {
  describe("spec", () => {
    const { callbacks } = makeMockCallbacks();
    const tool = createHandoffTool(callbacks);

    test("has correct name and source", () => {
      expect(tool.name).toBe("handoff");
      expect(tool.source).toBe("builtin");
    });

    test("has required params: goal, follow", () => {
      const schema = tool.inputSchema as { required: string[] };
      expect(schema.required).toEqual(["goal", "follow"]);
    });

    test("has optional mode param", () => {
      const schema = tool.inputSchema as {
        properties: Record<string, unknown>;
      };
      expect(schema.properties.mode).toBeDefined();
    });

    test("has follow default false", () => {
      const schema = tool.inputSchema as {
        properties: { follow: { default: boolean } };
      };
      expect(schema.properties.follow.default).toBe(false);
    });
  });

  describe("execute", () => {
    test("returns error when goal is missing", async () => {
      const { callbacks } = makeMockCallbacks();
      const tool = createHandoffTool(callbacks);
      const result = await tool.execute!({});
      expect(result.status).toBe("error");
      expect(result.content).toContain("Missing required parameter: goal");
    });

    test("calls executeHandoff with goal and options", async () => {
      const { calls, callbacks } = makeMockCallbacks();
      const tool = createHandoffTool(callbacks);
      await tool.execute!({ goal: "Fix the tests", follow: true, mode: "deep" });
      expect(calls).toHaveLength(1);
      expect(calls[0].goal).toBe("Fix the tests");
      expect(calls[0].options?.follow).toBe(true);
      expect(calls[0].options?.mode).toBe("deep");
    });

    test("returns success with newThreadId", async () => {
      const { callbacks } = makeMockCallbacks("thread-abc");
      const tool = createHandoffTool(callbacks);
      const result = await tool.execute!({ goal: "Continue work", follow: false });
      expect(result.status).toBe("done");
      expect(result.data?.success).toBe(true);
      expect(result.data?.newThreadId).toBe("thread-abc");
      expect(result.content).toContain("thread-abc");
    });

    test("returns success without newThreadId when executor returns undefined", async () => {
      const { callbacks } = makeMockCallbacks("ignored", false, true);
      const tool = createHandoffTool(callbacks);
      const result = await tool.execute!({ goal: "Start fresh", follow: true });
      expect(result.status).toBe("done");
      expect(result.content).toContain("Handoff initiated");
    });

    test("returns error when executor throws", async () => {
      const { callbacks } = makeMockCallbacks("ignored", true);
      const tool = createHandoffTool(callbacks);
      const result = await tool.execute!({ goal: "Try this", follow: false });
      expect(result.status).toBe("error");
      expect(result.content).toContain("Handoff failed");
      expect(result.content).toContain("Handoff executor unavailable");
    });

    test("follow defaults to false when not provided", async () => {
      const { calls, callbacks } = makeMockCallbacks();
      const tool = createHandoffTool(callbacks);
      await tool.execute!({ goal: "Do something" });
      expect(calls[0].options?.follow).toBe(false);
    });
  });
});
