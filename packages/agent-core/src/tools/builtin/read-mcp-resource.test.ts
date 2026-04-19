/**
 * ReadMcpResourceTool unit tests
 *
 * Covers: ToolSpec shape, successful read, empty resource, truncation,
 * binary content, server not found, read failure, arg validation.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Config } from "@flitter/schemas";
import type { ToolContext } from "../types";
import {
  createReadMcpResourceTool,
  type MCPConnectionLike,
  type MCPManagerLike,
} from "./read-mcp-resource";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as unknown as Config,
    ...overrides,
  };
}

function createMockManager(connections: Record<string, MCPConnectionLike>): MCPManagerLike {
  return {
    getConnection(name: string) {
      return connections[name];
    },
  };
}

function createMockConnection(
  result: unknown[] | Error,
): MCPConnectionLike {
  return {
    async readResource(_uri: string, _signal?: AbortSignal): Promise<unknown[]> {
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

describe("ReadMcpResourceTool", () => {
  // ─── ToolSpec shape ────────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    const tool = createReadMcpResourceTool(createMockManager({}));
    assert.equal(tool.name, "read_mcp_resource");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, true);
    assert.equal(typeof tool.execute, "function");
    assert.ok(tool.description.includes("MCP"));
  });

  // ─── Successful read ──────────────────────────────────────

  it("reads text resource content", async () => {
    const conn = createMockConnection([
      { text: "Hello " },
      { text: "World" },
    ]);
    const manager = createMockManager({ myserver: conn });
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "myserver", uri: "file:///test.txt" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.equal(result.content, "Hello World");
  });

  it("returns [Empty resource] for empty content", async () => {
    const conn = createMockConnection([]);
    const manager = createMockManager({ myserver: conn });
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "myserver", uri: "file:///empty.txt" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.equal(result.content, "[Empty resource]");
  });

  // ─── Binary content ──────────────────────────────────────

  it("reports binary content with type and length", async () => {
    const conn = createMockConnection([
      { blob: "AAAA", mimeType: "image/png" },
    ]);
    const manager = createMockManager({ myserver: conn });
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "myserver", uri: "file:///image.png" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content!.includes("[Binary content: image/png, 4 characters (base64)]"));
  });

  it("reports unknown type for blob without mimeType", async () => {
    const conn = createMockConnection([
      { blob: "AAAA" },
    ]);
    const manager = createMockManager({ myserver: conn });
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "myserver", uri: "file:///data.bin" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content!.includes("unknown type"));
  });

  // ─── Truncation ──────────────────────────────────────────

  it("truncates content at 262144 chars", async () => {
    const longText = "x".repeat(300_000);
    const conn = createMockConnection([{ text: longText }]);
    const manager = createMockManager({ myserver: conn });
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "myserver", uri: "file:///big.txt" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content!.includes("truncated"));
    // Should start with the truncated content
    assert.ok(result.content!.startsWith("x".repeat(100)));
    // Should not be the full 300k
    assert.ok(result.content!.length < 300_000);
  });

  // ─── Error cases ──────────────────────────────────────────

  it("returns error for unknown server", async () => {
    const manager = createMockManager({});
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "unknown", uri: "file:///test.txt" },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("not found or not connected"));
  });

  it("returns error when readResource throws", async () => {
    const conn = createMockConnection(new Error("Connection refused"));
    const manager = createMockManager({ myserver: conn });
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "myserver", uri: "file:///test.txt" },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("Failed to read resource"));
    assert.ok(result.error!.includes("Connection refused"));
  });

  it("returns error for missing server arg", async () => {
    const manager = createMockManager({});
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { uri: "file:///test.txt" },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("server"));
  });

  it("returns error for missing uri arg", async () => {
    const manager = createMockManager({});
    const tool = createReadMcpResourceTool(manager);

    const result = await tool.execute(
      { server: "myserver" },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("uri"));
  });

  // ─── executionProfile ────────────────────────────────────

  it("executionProfile returns empty resource keys", () => {
    const tool = createReadMcpResourceTool(createMockManager({}));
    const keys = tool.executionProfile!.resourceKeys({});
    assert.deepEqual(keys, []);
  });
});
