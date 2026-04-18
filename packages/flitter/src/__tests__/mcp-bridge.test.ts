// packages/flitter/src/__tests__/mcp-bridge.test.ts

import { describe, expect, test } from "bun:test";
import { ToolRegistry } from "@flitter/agent-core";
import type { MCPServerManager, NamespacedMCPTool } from "@flitter/llm";
import type { Config } from "@flitter/schemas";
import { BehaviorSubject } from "@flitter/util";
import { buildMCPToolSpec, mcpToolResultToToolResult, syncMCPToolsToRegistry } from "../mcp-bridge";

describe("mcpToolResultToToolResult", () => {
  test("converts text content to ToolResult", () => {
    const result = mcpToolResultToToolResult({
      content: [{ type: "text", text: "file contents here" }],
    });
    expect(result.status).toBe("done");
    expect(result.content).toBe("file contents here");
  });

  test("concatenates multiple text content blocks", () => {
    const result = mcpToolResultToToolResult({
      content: [
        { type: "text", text: "line 1" },
        { type: "text", text: "line 2" },
      ],
    });
    expect(result.status).toBe("done");
    expect(result.content).toBe("line 1\nline 2");
  });

  test("converts error result", () => {
    const result = mcpToolResultToToolResult({
      content: [{ type: "text", text: "permission denied" }],
      isError: true,
    });
    expect(result.status).toBe("error");
    expect(result.error).toBe("permission denied");
  });

  test("handles image content by noting it", () => {
    const result = mcpToolResultToToolResult({
      content: [{ type: "image", data: "base64...", mimeType: "image/png" }],
    });
    expect(result.status).toBe("done");
    expect(result.content).toContain("[image:");
  });

  test("handles empty content", () => {
    const result = mcpToolResultToToolResult({
      content: [],
    });
    expect(result.status).toBe("done");
    expect(result.content).toBe("");
  });
});

describe("buildMCPToolSpec", () => {
  test("builds a ToolSpec from a NamespacedMCPTool", () => {
    const mockManager = {
      callTool: async () => ({ content: [{ type: "text", text: "result" }] }),
    } as unknown as MCPServerManager;

    const tool: NamespacedMCPTool = {
      name: "mcp__myserver__search",
      originalName: "search",
      serverName: "myserver",
      description: "Search for files",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
    };

    const spec = buildMCPToolSpec(tool, mockManager);

    expect(spec.name).toBe("mcp__myserver__search");
    expect(spec.description).toBe("Search for files");
    expect(spec.inputSchema).toEqual(tool.inputSchema);
    expect(spec.source).toEqual({ mcp: "myserver" });
    expect(spec.isReadOnly).toBe(false);
  });

  test("execute calls mcpServerManager.callTool and converts result", async () => {
    const mockManager = {
      callTool: async (_name: string, args: Record<string, unknown>) => ({
        content: [{ type: "text", text: `searched for ${args.query}` }],
      }),
    } as unknown as MCPServerManager;

    const tool: NamespacedMCPTool = {
      name: "mcp__myserver__search",
      originalName: "search",
      serverName: "myserver",
      description: "Search",
      inputSchema: { type: "object", properties: {} },
    };

    const spec = buildMCPToolSpec(tool, mockManager);
    const result = await spec.execute(
      { query: "hello" },
      {
        workingDirectory: "/tmp",
        signal: AbortSignal.timeout(5000),
        threadId: "t1",
        config: {} as unknown as Config,
      },
    );

    expect(result.status).toBe("done");
    expect(result.content).toBe("searched for hello");
  });
});

describe("syncMCPToolsToRegistry", () => {
  test("registers MCP tools when allTools$ emits", () => {
    const registry = new ToolRegistry();
    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    // Emit two tools
    allTools$.next([
      {
        name: "mcp__server1__read",
        originalName: "read",
        serverName: "server1",
        description: "Read a resource",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "mcp__server1__write",
        originalName: "write",
        serverName: "server1",
        description: "Write a resource",
        inputSchema: { type: "object", properties: {} },
      },
    ]);

    expect(registry.has("mcp__server1__read")).toBe(true);
    expect(registry.has("mcp__server1__write")).toBe(true);
    expect(registry.list()).toHaveLength(2);

    disposable.dispose();
  });

  test("unregisters removed tools on subsequent emissions", () => {
    const registry = new ToolRegistry();
    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    // First emission: two tools
    allTools$.next([
      { name: "mcp__s__a", originalName: "a", serverName: "s", inputSchema: {} },
      { name: "mcp__s__b", originalName: "b", serverName: "s", inputSchema: {} },
    ]);
    expect(registry.list()).toHaveLength(2);

    // Second emission: only tool "a" remains
    allTools$.next([{ name: "mcp__s__a", originalName: "a", serverName: "s", inputSchema: {} }]);
    expect(registry.has("mcp__s__a")).toBe(true);
    expect(registry.has("mcp__s__b")).toBe(false);
    expect(registry.list()).toHaveLength(1);

    disposable.dispose();
  });

  test("does not interfere with builtin tools", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "Read",
      description: "Read files",
      inputSchema: {},
      source: "builtin",
      execute: async () => ({ status: "done" }),
    });

    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    allTools$.next([
      { name: "mcp__s__tool", originalName: "tool", serverName: "s", inputSchema: {} },
    ]);
    expect(registry.list()).toHaveLength(2);
    expect(registry.has("Read")).toBe(true);
    expect(registry.has("mcp__s__tool")).toBe(true);

    // MCP tools removed, builtin survives
    allTools$.next([]);
    expect(registry.list()).toHaveLength(1);
    expect(registry.has("Read")).toBe(true);

    disposable.dispose();
  });

  test("dispose unregisters all MCP tools and unsubscribes", () => {
    const registry = new ToolRegistry();
    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    allTools$.next([
      { name: "mcp__s__tool", originalName: "tool", serverName: "s", inputSchema: {} },
    ]);
    expect(registry.list()).toHaveLength(1);

    disposable.dispose();
    expect(registry.list()).toHaveLength(0);
  });
});
