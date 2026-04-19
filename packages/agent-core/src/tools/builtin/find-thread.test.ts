/**
 * Tests for find_thread tool
 * 逆向: chunk-005.js:147050-147104 (iGR)
 */

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { createFindThreadTool } from "./find-thread";
import type { ThreadStoreLike } from "./read-thread";
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

function makeSnapshot(
  id: string,
  title: string | null,
  messages: Array<{ role: string; content: Array<{ type: string; text: string }> }>,
): ThreadSnapshot {
  return {
    id,
    v: 1,
    title,
    messages,
    env: "local",
    agentMode: "normal",
    relationships: [],
  } as unknown as ThreadSnapshot;
}

function makeThreadStore(threads: ThreadSnapshot[]): ThreadStoreLike {
  const map = new Map(threads.map((t) => [t.id, t]));
  return {
    getThreadSnapshot: (id: string) => map.get(id),
    getCachedThreadIds: () => Array.from(map.keys()),
  };
}

describe("createFindThreadTool", () => {
  const threads = [
    makeSnapshot("t1", "Auth Migration", [
      { role: "user", content: [{ type: "text", text: "Migrate auth to OAuth2" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "I'll help with the OAuth2 migration for authentication." }],
      },
    ]),
    makeSnapshot("t2", "Database Optimization", [
      { role: "user", content: [{ type: "text", text: "Optimize the database queries" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "Let me look at the slow queries." }],
      },
    ]),
    makeSnapshot("t3", "Auth Bug Fix", [
      { role: "user", content: [{ type: "text", text: "Fix the auth token refresh bug" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "Found the issue with token refresh." }],
      },
    ]),
  ];

  const store = makeThreadStore(threads);
  const tool = createFindThreadTool(store);

  describe("spec", () => {
    it("has correct name", () => {
      assert.equal(tool.name, "find_thread");
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
      assert.ok(schema.properties.limit);
    });
  });

  describe("execute", () => {
    it("returns error when query is missing", async () => {
      const result = await tool.execute({}, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("query"));
    });

    it("finds threads matching keyword", async () => {
      const result = await tool.execute({ query: "auth" }, makeContext());
      assert.equal(result.status, "done");
      // Should find t1 (Auth Migration) and t3 (Auth Bug Fix)
      assert.ok(result.content?.includes("Auth Migration"));
      assert.ok(result.content?.includes("Auth Bug Fix"));
      assert.ok(!result.content?.includes("Database"));
    });

    it("finds threads matching multiple keywords", async () => {
      const result = await tool.execute(
        { query: "auth OAuth2" },
        makeContext(),
      );
      assert.equal(result.status, "done");
      // t1 matches both keywords, t3 matches one
      assert.ok(result.content?.includes("Auth Migration"));
    });

    it("returns empty when no matches", async () => {
      const result = await tool.execute(
        { query: "nonexistent" },
        makeContext(),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("No threads found"));
    });

    it("respects limit parameter", async () => {
      const result = await tool.execute(
        { query: "auth", limit: 1 },
        makeContext(),
      );
      assert.equal(result.status, "done");
      // Should only return 1 result
      assert.ok(result.content?.includes("Found 1 thread"));
    });

    it("searches case-insensitively", async () => {
      const result = await tool.execute({ query: "DATABASE" }, makeContext());
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("Database Optimization"));
    });

    it("handles empty thread store", async () => {
      const emptyStore = makeThreadStore([]);
      const emptyTool = createFindThreadTool(emptyStore);
      const result = await emptyTool.execute({ query: "anything" }, makeContext());
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes("No threads found"));
    });
  });
});
