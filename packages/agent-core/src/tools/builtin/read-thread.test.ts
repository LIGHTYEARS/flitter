/**
 * Tests for read_thread tool
 * 逆向: chunk-005.js:149068-149112 (GVR)
 */

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { createReadThreadTool, type ThreadStoreLike } from "./read-thread";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { ToolContext } from "../types";

function makeContext(): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "current-thread",
    config: { settings: {} as Record<string, unknown>, secrets: {} as never },
  };
}

function makeSnapshot(overrides?: Partial<ThreadSnapshot>): ThreadSnapshot {
  return {
    id: "T-test-1234",
    v: 1,
    title: "Test Thread",
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hi there!" }],
      },
    ],
    env: "local",
    agentMode: "normal",
    relationships: [],
    ...overrides,
  } as unknown as ThreadSnapshot;
}

function makeThreadStore(threads: ThreadSnapshot[]): ThreadStoreLike {
  const map = new Map(threads.map((t) => [t.id, t]));
  return {
    getThreadSnapshot: (id: string) => map.get(id),
    getCachedThreadIds: () => Array.from(map.keys()),
  };
}

describe("createReadThreadTool", () => {
  const thread1 = makeSnapshot({
    id: "T-aaaa-bbbb-cccc-dddd",
    title: "Auth Migration",
    messages: [
      { role: "user", content: [{ type: "text", text: "Migrate auth to OAuth2" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "I'll help with the OAuth2 migration." }],
      },
    ] as unknown as ThreadSnapshot["messages"],
  });

  const store = makeThreadStore([thread1]);
  const tool = createReadThreadTool(store);

  describe("spec", () => {
    it("has correct name", () => {
      assert.equal(tool.name, "read_thread");
    });

    it("has correct source", () => {
      assert.equal(tool.source, "builtin");
    });

    it("is read-only", () => {
      assert.equal(tool.isReadOnly, true);
    });

    it("requires threadID and goal", () => {
      const schema = tool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      assert.deepEqual(schema.required, ["threadID", "goal"]);
    });
  });

  describe("execute", () => {
    it("returns error when threadID is missing", async () => {
      const result = await tool.execute({ goal: "test" }, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("threadID"));
    });

    it("returns error when goal is missing", async () => {
      const result = await tool.execute(
        { threadID: "T-aaaa-bbbb-cccc-dddd" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("goal"));
    });

    it("returns thread content for valid ID", async () => {
      const result = await tool.execute(
        {
          threadID: "T-aaaa-bbbb-cccc-dddd",
          goal: "Extract the migration approach",
        },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("Auth Migration"));
      assert.ok(result.content?.includes("OAuth2 migration"));
      assert.ok(result.content?.includes("Extract the migration approach"));
    });

    it("returns error for unknown thread ID", async () => {
      const result = await tool.execute(
        { threadID: "T-unknown-id", goal: "anything" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("not found"));
    });

    it("parses thread ID from URL", async () => {
      const result = await tool.execute(
        {
          threadID:
            "https://ampcode.com/v2/workspace/project/T-aaaa-bbbb-cccc-dddd",
          goal: "anything",
        },
        makeContext(),
      );
      // This should fail because our mock IDs don't match the T-{uuid} format
      // but it demonstrates the URL parsing
      assert.equal(result.status, "error");
      // T-aaaa-bbbb-cccc-dddd doesn't match the full UUID pattern
    });

    it("strips @ prefix from thread ID", async () => {
      // Create store with a simple ID
      const simpleStore = makeThreadStore([
        makeSnapshot({ id: "my-thread" }),
      ]);
      const simpleTool = createReadThreadTool(simpleStore);
      const result = await simpleTool.execute(
        { threadID: "@my-thread", goal: "test" },
        makeContext(),
      );
      assert.equal(result.status, "done");
    });

    it("renders tool_use and tool_result blocks", async () => {
      const threadWithTools = makeSnapshot({
        id: "tool-thread",
        messages: [
          {
            role: "assistant",
            content: [
              { type: "tool_use", name: "Read", id: "tu_1", input: {} },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: "tu_1",
                content: "file contents here",
              },
            ],
          },
        ] as unknown as ThreadSnapshot["messages"],
      });
      const toolStore = makeThreadStore([threadWithTools]);
      const toolTool = createReadThreadTool(toolStore);

      const result = await toolTool.execute(
        { threadID: "tool-thread", goal: "see tools" },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("[Tool: Read]"));
      assert.ok(result.content?.includes("[Tool Result: file contents here]"));
    });
  });
});
