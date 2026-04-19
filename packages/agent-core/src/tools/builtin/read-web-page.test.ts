/**
 * Tests for read_web_page tool
 * 逆向: chunk-005.js:149131-149167 (ZVR)
 */

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { ReadWebPageTool } from "./read-web-page";
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

describe("ReadWebPageTool", () => {
  describe("spec", () => {
    it("has correct name", () => {
      assert.equal(ReadWebPageTool.name, "read_web_page");
    });

    it("has correct source", () => {
      assert.equal(ReadWebPageTool.source, "builtin");
    });

    it("is read-only", () => {
      assert.equal(ReadWebPageTool.isReadOnly, true);
    });

    it("requires url in schema", () => {
      const schema = ReadWebPageTool.inputSchema as {
        required: string[];
        properties: Record<string, unknown>;
      };
      assert.deepEqual(schema.required, ["url"]);
      assert.ok(schema.properties.url);
      assert.ok(schema.properties.objective);
      assert.ok(schema.properties.forceRefetch);
    });
  });

  describe("execute", () => {
    it("returns error when url is missing", async () => {
      const result = await ReadWebPageTool.execute({}, makeContext());
      assert.equal(result.status, "error");
      assert.ok((result as { error: string }).error?.includes("url"));
    });

    it("rejects localhost URLs", async () => {
      const result = await ReadWebPageTool.execute(
        { url: "http://localhost:3000" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("local"),
      );
    });

    it("rejects 127.0.0.1 URLs", async () => {
      const result = await ReadWebPageTool.execute(
        { url: "http://127.0.0.1:8080" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("local"),
      );
    });

    it("rejects invalid URLs", async () => {
      const result = await ReadWebPageTool.execute(
        { url: "not-a-url" },
        makeContext(),
      );
      assert.equal(result.status, "error");
      assert.ok(
        (result as { error: string }).error?.includes("Invalid URL"),
      );
    });

    it("fetches and converts HTML to text", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          "<html><body><h1>Hello World</h1><p>Some <b>bold</b> text.</p></body></html>",
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          },
        );

      try {
        const result = await ReadWebPageTool.execute(
          { url: "https://example.com" },
          makeContext(),
        );
        assert.equal(result.status, "done");
        assert.ok(result.content?.includes("Hello World"));
        assert.ok(result.content?.includes("bold"));
        assert.ok(result.content?.includes("text."));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("passes through plain text", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response("Plain text content here", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });

      try {
        const result = await ReadWebPageTool.execute(
          { url: "https://example.com/file.txt" },
          makeContext(),
        );
        assert.equal(result.status, "done");
        assert.ok(result.content?.includes("Plain text content here"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("includes objective in output when provided", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response("Some content", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });

      try {
        const result = await ReadWebPageTool.execute(
          { url: "https://example.com", objective: "Find the API docs" },
          makeContext(),
        );
        assert.equal(result.status, "done");
        assert.ok(result.content?.includes("Find the API docs"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles HTTP errors", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response("Not Found", { status: 404, statusText: "Not Found" });

      try {
        const result = await ReadWebPageTool.execute(
          { url: "https://example.com/missing" },
          makeContext(),
        );
        assert.equal(result.status, "error");
        assert.ok((result as { error: string }).error?.includes("404"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles network errors", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        throw new Error("DNS resolution failed");
      };

      try {
        const result = await ReadWebPageTool.execute(
          { url: "https://nonexistent.example.com" },
          makeContext(),
        );
        assert.equal(result.status, "error");
        assert.ok(
          (result as { error: string }).error?.includes("DNS resolution"),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("truncates very large content", async () => {
      const originalFetch = globalThis.fetch;
      const bigContent = "x".repeat(200_000);
      globalThis.fetch = async () =>
        new Response(bigContent, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });

      try {
        const result = await ReadWebPageTool.execute(
          { url: "https://example.com/big" },
          makeContext(),
        );
        assert.equal(result.status, "done");
        assert.ok(result.content!.includes("truncated"));
        // Content should be capped (header + truncated body < original)
        assert.ok(result.content!.length < 200_000);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("strips script and style tags from HTML", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          '<html><head><style>body { color: red; }</style></head><body><script>alert("xss")</script><p>Safe content</p></body></html>',
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          },
        );

      try {
        const result = await ReadWebPageTool.execute(
          { url: "https://example.com" },
          makeContext(),
        );
        assert.equal(result.status, "done");
        assert.ok(result.content?.includes("Safe content"));
        assert.ok(!result.content?.includes("alert"));
        assert.ok(!result.content?.includes("color: red"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
