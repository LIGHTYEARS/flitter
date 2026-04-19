/**
 * Tests for web_search tool
 * 逆向: chunk-005.js:149714-149741 (OXR)
 */

import { describe, it, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import { WebSearchTool } from "./web-search";
import type { ToolContext } from "../types";

function makeContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: { settings: {} as Record<string, unknown>, secrets: {} as never },
    ...overrides,
  };
}

describe("WebSearchTool", () => {
  describe("spec", () => {
    it("has correct name", () => {
      assert.equal(WebSearchTool.name, "web_search");
    });

    it("has correct source", () => {
      assert.equal(WebSearchTool.source, "builtin");
    });

    it("is read-only", () => {
      assert.equal(WebSearchTool.isReadOnly, true);
    });

    it("requires objective in schema", () => {
      const schema = WebSearchTool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      assert.deepEqual(schema.required, ["objective"]);
      assert.ok(schema.properties.objective);
      assert.ok(schema.properties.search_queries);
      assert.ok(schema.properties.max_results);
    });
  });

  describe("execute", () => {
    it("returns error when objective is missing", async () => {
      const result = await WebSearchTool.execute({}, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("objective"));
    });

    it("returns error when no endpoint configured", async () => {
      const result = await WebSearchTool.execute(
        { objective: "test query" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("web_search.endpoint"),
      );
    });

    it("calls configured endpoint and formats results", async () => {
      // Mock fetch
      const originalFetch = globalThis.fetch;
      let capturedUrl: string | undefined;
      let capturedBody: unknown;

      globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            results: [
              {
                title: "Test Result",
                url: "https://example.com",
                snippet: "A test snippet",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };

      try {
        const ctx = makeContext({
          config: {
            settings: {
              "web_search.endpoint": "https://search.example.com/api",
            } as Record<string, unknown>,
            secrets: {} as never,
          },
        });

        const result = await WebSearchTool.execute(
          { objective: "find docs", search_queries: ["react", "hooks"] },
          ctx,
        );

        assert.equal(result.status, "done");
        assert.ok(result.content?.includes("Test Result"));
        assert.ok(result.content?.includes("https://example.com"));
        assert.ok(result.content?.includes("A test snippet"));
        assert.equal(capturedUrl, "https://search.example.com/api");
        assert.ok(
          (capturedBody as { query: string }).query.includes("find docs"),
        );
        assert.ok(
          (capturedBody as { query: string }).query.includes("react"),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles empty results", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      try {
        const ctx = makeContext({
          config: {
            settings: {
              "web_search.endpoint": "https://search.example.com/api",
            } as Record<string, unknown>,
            secrets: {} as never,
          },
        });

        const result = await WebSearchTool.execute(
          { objective: "nonexistent thing" },
          ctx,
        );
        assert.equal(result.status, "done");
        assert.ok(result.content?.includes("No results"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles API error response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response("Internal Server Error", { status: 500 });

      try {
        const ctx = makeContext({
          config: {
            settings: {
              "web_search.endpoint": "https://search.example.com/api",
            } as Record<string, unknown>,
            secrets: {} as never,
          },
        });

        const result = await WebSearchTool.execute(
          { objective: "test" },
          ctx,
        );
        assert.equal(result.status, "error");
        assert.ok((result as { error: string }).error?.includes("500"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles network errors", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new Error("Network failure");
      };

      try {
        const ctx = makeContext({
          config: {
            settings: {
              "web_search.endpoint": "https://search.example.com/api",
            } as Record<string, unknown>,
            secrets: {} as never,
          },
        });

        const result = await WebSearchTool.execute(
          { objective: "test" },
          ctx,
        );
        assert.equal(result.status, "error");
        assert.ok(
          (result as { error: string }).error?.includes("Network failure"),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("respects max_results parameter", async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: unknown;

      globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      try {
        const ctx = makeContext({
          config: {
            settings: {
              "web_search.endpoint": "https://search.example.com/api",
            } as Record<string, unknown>,
            secrets: {} as never,
          },
        });

        await WebSearchTool.execute(
          { objective: "test", max_results: 5 },
          ctx,
        );
        assert.equal((capturedBody as { max_results: number }).max_results, 5);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
