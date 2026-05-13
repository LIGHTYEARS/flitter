/**
 * Tests for MCP tool naming utilities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatToolError,
  namespacedToolName,
  parseNamespacedToolName,
  sanitizeName,
  truncateToolResult,
} from "./tools";

// ─── sanitizeName ─────────────────────────────────────────

describe("sanitizeName", () => {
  it("should pass through simple alphanumeric names", () => {
    assert.equal(sanitizeName("myTool", "fallback"), "myTool");
  });

  it("should replace spaces with underscores", () => {
    assert.equal(sanitizeName("my tool", "x"), "my_tool");
  });

  it("should replace hyphens with underscores", () => {
    assert.equal(sanitizeName("my-tool", "x"), "my_tool");
  });

  it("should replace mixed spaces and hyphens with single underscore", () => {
    assert.equal(sanitizeName("my - tool", "x"), "my_tool");
  });

  it("should replace non-alphanumeric chars with underscores", () => {
    assert.equal(sanitizeName("my@tool!", "x"), "my_tool");
  });

  it("should collapse multiple consecutive underscores", () => {
    assert.equal(sanitizeName("a___b", "x"), "a_b");
  });

  it("should trim leading and trailing underscores", () => {
    assert.equal(sanitizeName("_a_", "x"), "a");
    assert.equal(sanitizeName("__hello__", "x"), "hello");
  });

  it("should use fallback for empty result", () => {
    assert.equal(sanitizeName("@#$", "fallback"), "fallback");
    assert.equal(sanitizeName("", "default"), "default");
  });

  it("should preserve existing underscores in the middle", () => {
    assert.equal(sanitizeName("my_tool_name", "x"), "my_tool_name");
  });

  it("should handle complex mixed input", () => {
    assert.equal(sanitizeName("  My--Server  Name!! ", "x"), "My_Server_Name");
  });
});

// ─── namespacedToolName ───────────────────────────────────

describe("namespacedToolName", () => {
  it("should create mcp__server__tool pattern", () => {
    assert.equal(namespacedToolName("myServer", "myTool"), "mcp__myServer__myTool");
  });

  it("should sanitize server and tool names", () => {
    assert.equal(namespacedToolName("my server", "my-tool"), "mcp__my_server__my_tool");
  });

  it("should truncate to tool name when full name >= 64 chars", () => {
    const longServer = "a".repeat(30);
    const longTool = "b".repeat(30);
    const result = namespacedToolName(longServer, longTool);
    // mcp__aaa...aaa__bbb...bbb = 5 + 30 + 2 + 30 = 67, >= 64
    assert.ok(result.length <= 64);
    assert.ok(result.startsWith("b"));
  });

  it("should handle short names within 64 char limit", () => {
    const result = namespacedToolName("srv", "tool");
    assert.equal(result, "mcp__srv__tool");
    assert.ok(result.length < 64);
  });

  it("should use fallback for empty names", () => {
    assert.equal(namespacedToolName("", ""), "mcp__server__tool");
  });

  it("should handle special characters in both names", () => {
    assert.equal(namespacedToolName("my@server", "my#tool"), "mcp__my_server__my_tool");
  });
});

// ─── parseNamespacedToolName ──────────────────────────────

describe("parseNamespacedToolName", () => {
  it("should parse valid namespaced name", () => {
    const result = parseNamespacedToolName("mcp__server__tool");
    assert.deepEqual(result, { serverName: "server", toolName: "tool" });
  });

  it("should return null for non-namespaced name", () => {
    assert.equal(parseNamespacedToolName("regular_tool"), null);
  });

  it("should return null for partial prefix", () => {
    assert.equal(parseNamespacedToolName("mcp__onlyone"), null);
  });

  it("should handle underscores in server name", () => {
    const result = parseNamespacedToolName("mcp__my_server__my_tool");
    assert.ok(result !== null);
    assert.equal(result.serverName, "my_server");
    assert.equal(result.toolName, "my_tool");
  });

  it("should handle underscores in tool name", () => {
    const result = parseNamespacedToolName("mcp__srv__my_fancy_tool");
    assert.ok(result !== null);
    assert.equal(result.serverName, "srv");
    assert.equal(result.toolName, "my_fancy_tool");
  });

  it("should return null for empty string", () => {
    assert.equal(parseNamespacedToolName(""), null);
  });

  it("should return null for malformed prefix", () => {
    assert.equal(parseNamespacedToolName("mcp_server__tool"), null);
  });
});

// ─── truncateToolResult ───────────────────────────────────

describe("truncateToolResult", () => {
  it("should not truncate short text results", () => {
    const content = [{ type: "text" as const, text: "short result" }];
    const result = truncateToolResult(content);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, "text");
    assert.equal((result[0] as { type: "text"; text: string }).text, "short result");
  });

  it("should truncate text exceeding max bytes", () => {
    const longText = "a".repeat(200);
    const content = [{ type: "text" as const, text: longText }];
    const result = truncateToolResult(content, 100);
    assert.equal(result.length, 1);
    const text = (result[0] as { type: "text"; text: string }).text;
    assert.ok(text.includes("truncated"), "Should contain truncation notice");
    assert.ok(text.includes("Tool result"), "Should contain tool result message");
    // The truncated text starts with the first 100 bytes of "a"s
    assert.ok(text.startsWith("a".repeat(100)));
  });

  it("should pass through image content unchanged", () => {
    const content = [{ type: "image" as const, data: "base64data", mimeType: "image/png" }];
    const result = truncateToolResult(content);
    assert.deepEqual(result, content);
  });

  it("should handle mixed content types", () => {
    const content = [
      { type: "text" as const, text: "short" },
      { type: "image" as const, data: "base64", mimeType: "image/png" },
    ];
    const result = truncateToolResult(content);
    assert.equal(result.length, 2);
  });
});

// ─── formatToolError ──────────────────────────────────────

describe("formatToolError", () => {
  it("should extract text from content entries", () => {
    const content = [{ type: "text" as const, text: "Error: something failed" }];
    assert.equal(formatToolError("myTool", content), "Error: something failed");
  });

  it("should join multiple text entries", () => {
    const content = [
      { type: "text" as const, text: "Error 1" },
      { type: "text" as const, text: "Error 2" },
    ];
    assert.equal(formatToolError("myTool", content), "Error 1\n\nError 2");
  });

  it("should return default message for empty content", () => {
    const result = formatToolError("myTool", []);
    assert.ok(result.includes("myTool"));
    assert.ok(result.includes("without details"));
  });

  it("should skip empty text entries", () => {
    const content = [
      { type: "text" as const, text: "  " },
      { type: "text" as const, text: "actual error" },
    ];
    assert.equal(formatToolError("myTool", content), "actual error");
  });
});
